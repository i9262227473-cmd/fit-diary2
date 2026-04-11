import React, { useState } from 'react'
import { useStore } from '../../store'
import { Bot, Trash2, Send } from 'lucide-react'
import styles from './AdvisorTab.module.css'

const STORAGE_KEY = 'advisor-history-v1'
const loadHistory = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] } }
const saveHistory = (h) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(h)) } catch {} }

export default function AdvisorTab() {
  const { profile, aiCall, entries } = useStore()
  const [messages, setMessages] = useState(loadHistory)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const todayEntry = entries.find(e => e.date === today)

  const buildContext = () => {
    const p = profile || {}
    const goals = Array.isArray(p.goals) ? p.goals.join(', ') : ''
    const limitations = p.hasLimitations ? `Ограничения: ${p.limitationsText}` : 'Ограничений нет'
    const todayFoods = todayEntry?.foods?.map(f => `${f.name} (${Math.round(f.calories)} ккал)`).join(', ') || 'ничего не ел'
    const level = { beginner: 'новичок', amateur: 'любитель', advanced: 'продвинутый', professional: 'профессионал' }[p.level] || p.level

    return `Ты персональный AI советник по фитнесу и питанию. Отвечай конкретно, профессионально, на русском языке.
Информация о пользователе: уровень ${level}, цели: ${goals}, ${limitations}.
Возраст: ${p.age} лет, вес: ${p.weight} кг, рост: ${p.height} см, ИМТ: ${p.bmi}.
Норма калорий: ${p.calorieGoal} ккал, белок: ${p.proteinGoal}г.
Сегодня съел: ${todayFoods}.`
  }

  const sendMessage = async (text) => {
    const msg = text || input
    if (!msg.trim() || loading) return
    const userMsg = { role: 'user', content: msg, time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }
    const newHistory = [...messages, userMsg]
    setMessages(newHistory)
    saveHistory(newHistory)
    setInput('')
    setLoading(true)

    try {
      const apiMessages = [
        { role: 'system', content: buildContext() },
        ...newHistory.map(m => ({ role: m.role, content: m.content }))
      ]
      const reply = await aiCall(apiMessages, 800)
      const assistantMsg = { role: 'assistant', content: reply, time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }
      const updated = [...newHistory, assistantMsg]
      setMessages(updated)
      saveHistory(updated)
    } catch {
      const errMsg = { role: 'assistant', content: '⚠️ Не удалось получить ответ. Попробуйте ещё раз.', time: '' }
      const updated = [...newHistory, errMsg]
      setMessages(updated)
      saveHistory(updated)
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = () => {
    if (confirm('Очистить историю переписки?')) {
      setMessages([])
      saveHistory([])
    }
  }

  const QUICK = [
    'Что мне съесть после тренировки?',
    'Составь план питания на день',
    'Как ускорить восстановление мышц?',
    'Оцени мой сегодняшний рацион',
  ]

  return (
    <div className={styles.page}>
      {/* Шапка */}
      <div className={styles.header}>
        <div>
          <div className={styles.title}>AI Советник</div>
          <div className={styles.subtitle}>Задайте вопрос по питанию или тренировкам</div>
        </div>
        {messages.length > 0 && (
          <button className={styles.clearBtn} onClick={clearHistory}>
            <Trash2 size={14} /> Очистить
          </button>
        )}
      </div>

      {/* Поле ввода СВЕРХУ */}
      <div className={styles.inputRow}>
        <textarea
          className={styles.input}
          placeholder="Спросите что-нибудь..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          rows={2}
        />
        <button className={styles.sendBtn} onClick={() => sendMessage()} disabled={loading || !input.trim()}>
          {loading ? <div className={styles.spinIcon} /> : <Send size={18} />}
        </button>
      </div>

      {/* Быстрые вопросы */}
      {messages.length === 0 && (
        <div className={styles.quickQuestions}>
          {QUICK.map(q => (
            <button key={q} className={styles.quickBtn} onClick={() => sendMessage(q)}>{q}</button>
          ))}
        </div>
      )}

      {/* История */}
      <div className={styles.messages}>
        {messages.map((msg, i) => (
          <div key={i} className={`${styles.message} ${msg.role === 'user' ? styles.userMsg : styles.assistantMsg}`}>
            <div className={styles.msgContent}>{msg.content}</div>
            {msg.time && <div className={styles.msgTime}>{msg.time}</div>}
          </div>
        ))}
        {loading && (
          <div className={`${styles.message} ${styles.assistantMsg}`}>
            <div className={styles.typing}><span /><span /><span /></div>
          </div>
        )}
      </div>
    </div>
  )
}
