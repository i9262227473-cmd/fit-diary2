import React, { useState } from 'react'
import { useStore } from '../store'
import styles from './AdvisorTab.module.css'

export default function AdvisorTab() {
  const { profile, entries, weights, aiCall } = useStore()
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Привет! Я ваш AI-советник по фитнесу. Задайте любой вопрос о тренировках, питании или восстановлении.` }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(m => [...m, { role: 'user', text: userMsg }])
    setLoading(true)

    try {
      const systemPrompt = `Ты профессиональный фитнес-тренер и диетолог. 
Данные пользователя:
- Роль: ${profile?.role}
- Уровень: ${profile?.level}
- Цели: ${(profile?.goals || []).join(', ')}
- Ограничения: ${profile?.hasLimitations ? profile.limitationsText : 'нет'}
- Норма калорий: ${profile?.calorieGoal} ккал/день
- Норма белка: ${profile?.proteinGoal}г/день
- ИМТ: ${profile?.bmi}
${profile?.level === 'professional' ? 'Пользователь профессиональный спортсмен — давай строгие, детальные рекомендации.' : ''}
Отвечай на русском языке, кратко и по делу.`

      const answer = await aiCall([
        { role: 'system', content: systemPrompt },
        ...messages.filter(m => m.role !== 'assistant' || messages.indexOf(m) > 0).map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.text
        })),
        { role: 'user', content: userMsg }
      ], 800)

      setMessages(m => [...m, { role: 'assistant', text: answer }])
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', text: '❌ Ошибка. Попробуйте снова.' }])
    } finally {
      setLoading(false)
    }
  }

  const quickQuestions = [
    'Что съесть после тренировки?',
    'Как улучшить восстановление?',
    'Составь план на неделю',
    'Анализ моего питания',
  ]

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>🤖 AI Советник</div>

      {/* Быстрые вопросы */}
      <div className={styles.quick}>
        {quickQuestions.map(q => (
          <button key={q} className={styles.quickBtn} onClick={() => {
            setInput(q)
          }}>
            {q}
          </button>
        ))}
      </div>

      {/* Сообщения */}
      <div className={styles.messages}>
        {messages.map((m, i) => (
          <div key={i} className={`${styles.msg} ${m.role === 'user' ? styles.msgUser : styles.msgAI}`}>
            {m.role === 'assistant' && <span className={styles.msgIcon}>🤖</span>}
            <div className={styles.msgText}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div className={`${styles.msg} ${styles.msgAI}`}>
            <span className={styles.msgIcon}>🤖</span>
            <div className={styles.typing}>
              <span /><span /><span />
            </div>
          </div>
        )}
      </div>

      {/* Ввод */}
      <div className={styles.inputRow}>
        <input
          className={styles.input}
          placeholder="Задайте вопрос..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button className={styles.sendBtn} onClick={send} disabled={loading}>
          {loading ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  )
}
