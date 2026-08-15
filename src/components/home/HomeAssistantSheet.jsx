import React, { useState } from 'react'
import { ChevronRight, Send, Sparkles, X } from 'lucide-react'
import styles from './HomeAssistantSheet.module.css'

const QUICK_QUESTIONS = [
  'Оцени моё питание сегодня',
  'Что лучше съесть дальше?',
  'Как улучшить восстановление?',
]

function buildContext({ state, entry, totals, goals, water }) {
  const profile = state.profile || {}
  const foods = (entry.foods || [])
    .map(food => `${food.name}: ${Math.round(food.calories || 0)} ккал, Б ${Math.round(food.protein || 0)} г, Ж ${Math.round(food.fat || 0)} г, У ${Math.round(food.carbs || 0)} г`)
    .join('; ') || 'пока ничего не записано'
  const workouts = (entry.workouts || [])
    .map(workout => `${workout.name || workout.type || 'Тренировка'}${workout.duration ? `, ${workout.duration} мин` : ''}`)
    .join('; ') || 'тренировок сегодня не записано'
  const userGoals = Array.isArray(profile.goals) ? profile.goals.join(', ') : (profile.goals || 'не указаны')
  const limitations = profile.hasLimitations && profile.limitationsText
    ? profile.limitationsText
    : 'не указаны'

  return `Ты AI-помощник приложения Fit Diary. Отвечай по-русски, конкретно, доброжелательно и без критики. Давай практичные рекомендации только по имеющимся данным. Не ставь медицинские диагнозы. При упомянутых ограничениях не предлагай рискованные нагрузки и советуй согласовать существенные изменения с врачом.

Профиль: возраст ${profile.age || 'не указан'}, рост ${profile.height || 'не указан'} см, вес ${profile.weight || 'не указан'} кг, цели: ${userGoals}, ограничения: ${limitations}.
Цели на день: ${goals.calories} ккал, белки ${goals.protein} г, жиры ${goals.fat} г, углеводы ${goals.carbs} г.
Факт за сегодня: ${Math.round(totals.calories)} ккал, белки ${Math.round(totals.protein)} г, жиры ${Math.round(totals.fat)} г, углеводы ${Math.round(totals.carbs)} г.
Еда: ${foods}.
Вода: ${water.consumed} из ${water.goal} стаканов по 250 мл.
Тренировки: ${workouts}.

Отвечай коротко: сначала главный вывод, затем 2–3 конкретных действия. Не используй markdown-заголовки.`
}

export default function HomeAssistantSheet({
  state,
  entry,
  totals,
  goals,
  water,
  insight,
  aiCall,
  onClose,
  onContextAction,
}) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const ask = async (question, showQuestion = true) => {
    const text = (question || input).trim()
    if (!text || loading) return

    const userMessage = { role: 'user', content: text }
    const visibleHistory = showQuestion ? [...messages, userMessage] : messages
    setMessages(visibleHistory)
    setInput('')
    setError('')
    setLoading(true)

    try {
      const apiHistory = [...messages, userMessage].map(message => ({ role: message.role, content: message.content }))
      const reply = await aiCall([
        { role: 'system', content: buildContext({ state, entry, totals, goals, water }) },
        ...apiHistory,
      ], 700)
      setMessages([...visibleHistory, { role: 'assistant', content: reply }])
    } catch {
      setError('Не удалось получить рекомендацию. Проверьте соединение и попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  const getDailyRecommendation = () => ask(
    `Дай одну главную рекомендацию на сегодня. Текущий приоритет приложения: ${insight.body}`,
    false,
  )

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <section className={styles.sheet} onClick={event => event.stopPropagation()} aria-label="AI-помощник">
        <div className={styles.handle} />
        <header className={styles.header}>
          <div className={styles.heading}>
            <span><Sparkles size={17} /></span>
            <div><small>FIT DIARY AI</small><h2>Помощник</h2></div>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Закрыть"><X size={18} /></button>
        </header>

        <div className={styles.contextCard}>
          <small>ГЛАВНОЕ СЕЙЧАС</small>
          <strong>{insight.title}</strong>
          <p>{insight.body}</p>
          {insight.actionLabel && (
            <button onClick={onContextAction}>{insight.actionLabel}<ChevronRight size={16} /></button>
          )}
        </div>

        <div className={styles.conversation}>
          {messages.length === 0 && !loading && (
            <div className={styles.welcome}>
              <strong>Получить персональную рекомендацию</strong>
              <p>Помощник учтёт питание, воду, тренировку и ваши цели на сегодня.</p>
              <button onClick={getDailyRecommendation}><Sparkles size={16} />Проанализировать день</button>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`${styles.message} ${message.role === 'user' ? styles.userMessage : styles.assistantMessage}`}>
              {message.content}
            </div>
          ))}

          {loading && <div className={styles.loading}><i /><i /><i /></div>}
          {error && <div className={styles.error}>{error}<button onClick={getDailyRecommendation}>Повторить</button></div>}
        </div>

        <div className={styles.quickQuestions}>
          {QUICK_QUESTIONS.map(question => <button key={question} onClick={() => ask(question)} disabled={loading}>{question}</button>)}
        </div>

        <div className={styles.inputRow}>
          <textarea
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                ask()
              }
            }}
            placeholder="Задайте вопрос..."
            rows={1}
          />
          <button onClick={() => ask()} disabled={!input.trim() || loading} aria-label="Отправить"><Send size={18} /></button>
        </div>
      </section>
    </div>
  )
}
