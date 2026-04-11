import React, { useState } from 'react'
import { useStore } from '../store'
import styles from './WeekCalendar.module.css'

const DN = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

export default function WeekCalendar({ selectedDate, onSelect }) {
  const { entries } = useStore()
  const [weekOffset, setWeekOffset] = useState(0)

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Получаем даты недели
  const getWeekDates = (offset) => {
    const now = new Date()
    const dow = now.getDay() === 0 ? 6 : now.getDay() - 1 // Пн = 0
    const mon = new Date(now)
    mon.setDate(now.getDate() - dow + offset * 7)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon)
      d.setDate(mon.getDate() + i)
      return d.toISOString().split('T')[0]
    })
  }

  const weekDates = getWeekDates(weekOffset)

  const monthName = new Date(weekDates[0] + 'T12:00:00')
    .toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    .replace(/^./, c => c.toUpperCase())

  return (
    <div className={styles.wrap}>
      <div className={styles.monthRow}>
        <span className={styles.monthName}>{monthName}</span>
        <div className={styles.navBtns}>
          <button onClick={() => setWeekOffset(w => w - 1)}>‹</button>
          <button onClick={() => setWeekOffset(w => w + 1)}>›</button>
        </div>
      </div>

      <div className={styles.days}>
        {weekDates.map((dateStr, i) => {
          const dayNum = new Date(dateStr + 'T12:00:00').getDate()
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate
          const hasData = entries.some(e => e.date === dateStr && e.foods.length > 0)
          const hasWorkout = entries.some(e => e.date === dateStr && e.workouts?.length > 0)

          return (
            <div
              key={dateStr}
              className={styles.dayItem}
              onClick={() => onSelect(dateStr)}
            >
              <div className={styles.dayName}>{DN[i]}</div>
              <div className={`
                ${styles.dayCircle}
                ${isToday ? styles.isToday : ''}
                ${isSelected ? styles.isActive : ''}
                ${hasData ? styles.hasData : ''}
              `}>
                {hasData || hasWorkout ? '✓' : dayNum}
                {hasWorkout && <span className={styles.workoutDot} />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
