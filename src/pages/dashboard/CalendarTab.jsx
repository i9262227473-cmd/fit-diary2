import React, { useState } from 'react'
import { useStore } from '../../store'
import styles from './CalendarTab.module.css'

export default function CalendarTab() {
  const { entries, weights, addWeight } = useStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [weightInput, setWeightInput] = useState('')
  const [selectedDay, setSelectedDay] = useState(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = (firstDay.getDay() + 6) % 7 // Пн = 0

  const days = []
  for (let i = 0; i < startDow; i++) days.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d)

  const formatDate = (d) => {
    const dd = String(d).padStart(2, '0')
    const mm = String(month + 1).padStart(2, '0')
    return `${year}-${mm}-${dd}`
  }

  const getEntry = (d) => entries.find(e => e.date === formatDate(d))
  const getWeight = (d) => weights.find(w => w.date === formatDate(d))

  const todayStr = new Date().toISOString().split('T')[0]

  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь',
    'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

  const selectedEntry = selectedDay ? getEntry(selectedDay) : null
  const selectedWeight = selectedDay ? getWeight(selectedDay) : null

  const handleAddWeight = () => {
    if (!weightInput || !selectedDay) return
    addWeight(formatDate(selectedDay), +weightInput)
    setWeightInput('')
  }

  return (
    <div>
      {/* Навигация по месяцам */}
      <div className={styles.monthNav}>
        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>‹</button>
        <span>{monthNames[month]} {year}</span>
        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>›</button>
      </div>

      {/* Дни недели */}
      <div className={styles.weekDays}>
        {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
          <div key={d} className={styles.weekDay}>{d}</div>
        ))}
      </div>

      {/* Календарь */}
      <div className={styles.calendar}>
        {days.map((d, i) => {
          if (!d) return <div key={i} />
          const dateStr = formatDate(d)
          const entry = getEntry(d)
          const hasFood = entry && entry.foods.length > 0
          const isToday = dateStr === todayStr
          const isSelected = selectedDay === d

          return (
            <button
              key={i}
              className={`${styles.day} ${isToday ? styles.today : ''} ${isSelected ? styles.selected : ''} ${hasFood ? styles.hasData : ''}`}
              onClick={() => setSelectedDay(isSelected ? null : d)}
            >
              <span className={styles.dayNum}>{d}</span>
              {hasFood && <span className={styles.dot} />}
            </button>
          )
        })}
      </div>

      {/* Детали выбранного дня */}
      {selectedDay && (
        <div className={styles.dayDetail}>
          <div className={styles.dayDetailTitle}>
            {selectedDay} {monthNames[month]}
          </div>

          {/* Вес */}
          <div className={styles.weightRow}>
            <span className={styles.weightLabel}>⚖️ Вес:</span>
            {selectedWeight ? (
              <span className={styles.weightValue}>{selectedWeight.kg} кг</span>
            ) : (
              <div className={styles.weightInput}>
                <input
                  className={styles.weightField}
                  type="number"
                  placeholder="кг"
                  value={weightInput}
                  onChange={e => setWeightInput(e.target.value)}
                />
                <button className={styles.weightBtn} onClick={handleAddWeight}>✓</button>
              </div>
            )}
          </div>

          {/* Еда */}
          {selectedEntry && selectedEntry.foods.length > 0 ? (
            <div className={styles.foodSummary}>
              <div className={styles.foodSummaryTitle}>Питание:</div>
              <div className={styles.macros}>
                <span>🔥 {Math.round(selectedEntry.foods.reduce((s, f) => s + f.calories, 0))} ккал</span>
                <span>🥩 {Math.round(selectedEntry.foods.reduce((s, f) => s + f.protein, 0))}г</span>
                <span>🧈 {Math.round(selectedEntry.foods.reduce((s, f) => s + f.fat, 0))}г</span>
                <span>🍞 {Math.round(selectedEntry.foods.reduce((s, f) => s + f.carbs, 0))}г</span>
              </div>
              {selectedEntry.foods.map((f, i) => (
                <div key={i} className={styles.foodItem}>
                  <span>{f.meal}: {f.name}</span>
                  <span>{Math.round(f.calories)} ккал</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noData}>Данных о питании нет</div>
          )}
        </div>
      )}
    </div>
  )
}
