import React from 'react'
import { useStore } from '../../store'
import { History } from 'lucide-react'
import styles from './HistoryTab.module.css'

export default function HistoryTab() {
  const { entries, weights } = useStore()

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))

  if (sorted.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}><History size={52} color="var(--text3)" strokeWidth={1} /></div>
        <div>История пуста</div>
        <div className={styles.emptyHint}>Добавляйте еду на вкладке «Дневник»</div>
      </div>
    )
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })
  }

  return (
    <div>
      <div className={styles.title}>История питания</div>
      {sorted.map(entry => {
        const totalCal = Math.round(entry.foods.reduce((s, f) => s + f.calories, 0))
        const totalProt = Math.round(entry.foods.reduce((s, f) => s + f.protein, 0))
        const totalFat = Math.round(entry.foods.reduce((s, f) => s + f.fat, 0))
        const totalCarbs = Math.round(entry.foods.reduce((s, f) => s + f.carbs, 0))
        const weight = weights.find(w => w.date === entry.date)

        return (
          <div key={entry.date} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.date}>{formatDate(entry.date)}</span>
              {weight && <span className={styles.weight}>⚖️ {weight.kg} кг</span>}
            </div>
            <div className={styles.macros}>
              <div className={styles.macro}>
                <span className={styles.macroVal}>{totalCal}</span>
                <span className={styles.macroLabel}>ккал</span>
              </div>
              <div className={styles.macro}>
                <span className={styles.macroVal} style={{ color: 'var(--green)' }}>{totalProt}г</span>
                <span className={styles.macroLabel}>белок</span>
              </div>
              <div className={styles.macro}>
                <span className={styles.macroVal} style={{ color: 'var(--orange)' }}>{totalFat}г</span>
                <span className={styles.macroLabel}>жиры</span>
              </div>
              <div className={styles.macro}>
                <span className={styles.macroVal} style={{ color: 'var(--purple)' }}>{totalCarbs}г</span>
                <span className={styles.macroLabel}>углеводы</span>
              </div>
            </div>
            <div className={styles.foods}>
              {entry.foods.slice(0, 3).map((f, i) => (
                <span key={i} className={styles.foodTag}>{f.name}</span>
              ))}
              {entry.foods.length > 3 && (
                <span className={styles.foodTag}>+{entry.foods.length - 3}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
