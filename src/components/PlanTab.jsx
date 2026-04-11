import React, { useState } from 'react'
import { useStore } from '../store'
import styles from './PlanTab.module.css'

export default function PlanTab() {
  const { profile, aiCall } = useStore()
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [savedPlan, setSavedPlan] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fit-training-plan') || 'null') } catch { return null }
  })

  const generatePlan = async () => {
    setLoading(true)
    try {
      const level = { beginner: 'новичок', amateur: 'любитель', advanced: 'продвинутый', professional: 'профессионал' }[profile?.level] || 'любитель'
      const goals = (profile?.goals || []).map(g => ({
        weight_loss: 'похудение', muscle_gain: 'набор массы', maintenance: 'поддержание формы',
        endurance: 'выносливость', strength: 'сила', health: 'здоровье'
      })[g]).filter(Boolean).join(', ')
      const limitations = profile?.hasLimitations ? `Ограничения: ${profile.limitationsText}` : 'Ограничений нет'
      const strict = profile?.level === 'professional'
        ? 'Составь профессиональный план с высокой интенсивностью.'
        : 'Составь безопасный план с учётом ограничений.'

      const prompt = `Ты персональный тренер. ${strict}

Профиль:
- Уровень: ${level}
- Цели: ${goals || 'общее здоровье'}
- ${limitations}
- Вес: ${profile?.weight} кг, рост: ${profile?.height} см

Составь план тренировок на неделю. Для каждого дня укажи:
1. Название тренировки
2. 4-6 упражнений с подходами и повторениями
3. Продолжительность
4. Интенсивность

Ответь структурированно по дням недели (Пн-Вс). Используй эмодзи.`

      const result = await aiCall([{ role: 'user', content: prompt }], 1500)
      setPlan(result)
      localStorage.setItem('fit-training-plan', JSON.stringify(result))
      setSavedPlan(result)
    } catch (e) {
      setPlan('Ошибка генерации плана. Попробуйте снова.')
    } finally {
      setLoading(false)
    }
  }

  const displayPlan = plan || savedPlan

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.title}>🗓 План тренировок</div>
        <div className={styles.subtitle}>
          {profile?.level === 'professional'
            ? '🥇 Профессиональный режим — строгая оценка'
            : '💪 Персональный план от AI-тренера'}
        </div>
      </div>

      <button
        className={styles.generateBtn}
        onClick={generatePlan}
        disabled={loading}
      >
        {loading ? '⏳ Генерирую план...' : displayPlan ? '🔄 Обновить план' : '✨ Создать план с AI'}
      </button>

      {loading && (
        <div className={styles.loadingCard}>
          <div className={styles.spinner} />
          <div>AI составляет ваш персональный план...</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            Это займёт 15-20 секунд
          </div>
        </div>
      )}

      {!loading && displayPlan && (
        <div className={styles.planCard}>
          <div className={styles.planText}>{displayPlan}</div>
        </div>
      )}

      {!loading && !displayPlan && (
        <div className={styles.empty}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏋️</div>
          <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>
            План ещё не создан
          </div>
          <div style={{ fontSize: '13px', color: 'var(--sub)' }}>
            Нажмите кнопку выше — AI составит персональный план на основе вашего профиля
          </div>
        </div>
      )}
    </div>
  )
}
