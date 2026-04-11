import React, { useState, useEffect } from 'react'
import { useStore } from '../store'
import styles from './AIAnalysisModal.module.css'

export default function AIAnalysisModal({ entry, totals, goals, onClose }) {
  const { profile, aiCall } = useStore()
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => { analyze() }, [])

  const analyze = async () => {
    setLoading(true)
    setError(null)
    try {
      const level = { beginner: 'новичок', amateur: 'любитель', advanced: 'продвинутый', professional: 'профессионал' }[profile?.level] || ''
      const limitations = profile?.hasLimitations ? profile.limitationsText : 'нет'
      const foodList = entry.foods.map(f => `${f.name} (${f.weight}г, ${Math.round(f.calories)} ккал)`).join(', ') || 'ничего'
      const workoutList = (entry.workouts || []).map(w => `${w.type} ${w.duration} мин`).join(', ') || 'нет'

      const prompt = `Ты персональный фитнес-тренер и диетолог. Проведи краткий анализ дня.

Профиль: ${level}, ограничения: ${limitations}, цели: ${Array.isArray(profile?.goals) ? profile.goals.join(', ') : ''}

Питание за день: ${foodList}
Итого: ${Math.round(totals.calories)} ккал, белок ${Math.round(totals.protein)}г, жиры ${Math.round(totals.fat)}г, углеводы ${Math.round(totals.carbs)}г
Норма: ${goals.calories} ккал, белок ${goals.protein}г

Тренировки: ${workoutList}

Дай анализ в формате JSON (без markdown):
{
  "nutrition": "оценка питания 1-2 предложения",
  "workout": "оценка тренировки 1-2 предложения",
  "recommendations": ["совет 1", "совет 2", "совет 3"],
  "achievement": "похвала или мотивация",
  "score": число от 1 до 10
}`

      const text = await aiCall([{ role: 'user', content: prompt }], 800)
      const clean = text.replace(/```json|```/g, '').trim()
      const json = JSON.parse(clean)
      setResult(json)
    } catch (e) {
      setError('Не удалось получить анализ. Попробуйте позже.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.title}>🤖 AI Анализ дня</div>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        {loading && (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <div>Анализируем ваш день...</div>
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <div>😔</div>
            <div>{error}</div>
            <button className="btn-primary" onClick={analyze} style={{ marginTop: '12px' }}>
              Попробовать снова
            </button>
          </div>
        )}

        {result && !loading && (
          <div className={styles.result}>
            {/* Оценка */}
            <div className={styles.score}>
              <div className={styles.scoreNum}>{result.score}</div>
              <div className={styles.scoreLabel}>из 10</div>
            </div>

            {/* Похвала */}
            {result.achievement && (
              <div className={styles.achievement}>🌟 {result.achievement}</div>
            )}

            {/* Питание */}
            <div className={styles.block}>
              <div className={styles.blockTitle}>📊 Питание</div>
              <div className={styles.blockText}>{result.nutrition}</div>
            </div>

            {/* Тренировка */}
            {result.workout && (
              <div className={styles.block}>
                <div className={styles.blockTitle}>💪 Тренировка</div>
                <div className={styles.blockText}>{result.workout}</div>
              </div>
            )}

            {/* Рекомендации */}
            {result.recommendations?.length > 0 && (
              <div className={styles.block}>
                <div className={styles.blockTitle}>⚡ Рекомендации</div>
                {result.recommendations.map((r, i) => (
                  <div key={i} className={styles.rec}>• {r}</div>
                ))}
              </div>
            )}
          </div>
        )}

        <button className="btn-secondary" onClick={onClose} style={{ marginTop: '12px' }}>
          Закрыть
        </button>
      </div>
    </div>
  )
}
