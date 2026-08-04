import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, Dumbbell } from 'lucide-react'
import SwipeToDelete from '../common/SwipeToDelete'

// ─── WORKOUT CALENDAR (календарь тренировок) ───────────────────────────────────
export default function WorkoutCalendar({ workoutsByDate, onPickWorkout, onDeleteWorkout }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
  const WD = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
  const todayKey = new Date().toISOString().split('T')[0]

  const firstDay = new Date(cursor.y, cursor.m, 1)
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7 // понедельник = 0
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const prevMonth = () => setCursor(c => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 })
  const nextMonth = () => setCursor(c => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 })

  const [selected, setSelected] = useState(null)
  const pad = n => String(n).padStart(2, '0')
  const keyFor = d => `${cursor.y}-${pad(cursor.m + 1)}-${pad(d)}`
  const selectedWorkouts = selected ? (workoutsByDate[selected] || []) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: '#1a1a1a', borderRadius: 18, padding: 16, border: '1px solid #2e2e2e' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: 8, background: '#222', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={16} color="#9ca3af" /></button>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{MONTHS[cursor.m]} {cursor.y}</span>
          <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: 8, background: '#222', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={16} color="#9ca3af" style={{ transform: 'rotate(180deg)' }} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
          {WD.map(w => <div key={w} style={{ textAlign: 'center', fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{w}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />
            const k = keyFor(d)
            const has = (workoutsByDate[k] || []).length > 0
            const isToday = k === todayKey
            const isSel = k === selected
            return (
              <button key={i} onClick={() => has && setSelected(isSel ? null : k)}
                style={{ aspectRatio: '1', borderRadius: 10, border: isToday ? '1px solid #3d9970' : '1px solid transparent', background: isSel ? '#3d9970' : has ? 'rgba(61,153,112,0.14)' : 'transparent', color: isSel ? '#000' : has ? '#f5f5f5' : '#6b7280', cursor: has ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 13, fontWeight: has ? 700 : 400, position: 'relative' }}>
                {d}
                {has && <div style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? '#000' : '#3d9970' }} />}
              </button>
            )
          })}
        </div>
      </div>
      {selected && selectedWorkouts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#6b7280', paddingLeft: 4 }}>{selected}</div>
          {selectedWorkouts.map(w => (
            <SwipeToDelete key={w.id} onDelete={() => onDeleteWorkout && onDeleteWorkout(w.id, w.entryDate)} confirmText="Удалить эту тренировку?">
              <button onClick={() => onPickWorkout(w)} style={{ background: '#1a1a1a', padding: 16, border: '1px solid #2e2e2e', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(61,153,112,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Dumbbell size={20} color="#3d9970" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{w.name || 'Тренировка'}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)' }}>{w.duration} мин{w.aiAnalysis ? ' · ✓ анализ' : ''}</div>
                </div>
                <ChevronRight size={16} color="#4b5563" />
              </button>
            </SwipeToDelete>
          ))}
        </div>
      )}
    </div>
  )
}
