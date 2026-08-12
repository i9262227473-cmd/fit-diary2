import React, { useMemo, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import FoodDayDetail from './FoodDayDetail'

export default function FoodCalendar({ entries, goals }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const [selectedDate, setSelectedDate] = useState(null)

  const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
  const WD = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
  const todayKey = new Date().toISOString().split('T')[0]
  const entriesByDate = useMemo(() => entries.reduce((acc, e) => {
    acc[e.date] = e
    return acc
  }, {}), [entries])

  const firstDay = new Date(cursor.y, cursor.m, 1)
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const prevMonth = () => setCursor(c => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 })
  const nextMonth = () => setCursor(c => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 })
  const pad = n => String(n).padStart(2, '0')
  const keyFor = d => `${cursor.y}-${pad(cursor.m + 1)}-${pad(d)}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {selectedDate && (
        <FoodDayDetail
          date={selectedDate}
          entry={entriesByDate[selectedDate]}
          goals={goals}
          onClose={() => setSelectedDate(null)}
        />
      )}

      <div style={{ background: '#1a1a1a', borderRadius: 18, padding: 16, border: '1px solid #2e2e2e' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: 8, background: '#222', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={16} color="#9ca3af" />
          </button>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{MONTHS[cursor.m]} {cursor.y}</span>
          <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: 8, background: '#222', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={16} color="#9ca3af" style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
          {WD.map(w => <div key={w} style={{ textAlign: 'center', fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{w}</div>)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />
            const k = keyFor(d)
            const dayEntry = entriesByDate[k]
            const cal = (dayEntry?.foods || []).reduce((a, f) => a + (f.calories || 0), 0)
            const has = cal > 0
            const isToday = k === todayKey
            const isOver = goals.calories > 0 && cal > goals.calories

            return (
              <button
                key={i}
                onClick={() => has && setSelectedDate(k)}
                style={{ aspectRatio: '1', borderRadius: 10, border: isToday ? '1px solid var(--accent)' : '1px solid transparent', background: isOver ? 'rgba(239,68,68,0.14)' : has ? 'var(--accent-dim)' : 'transparent', color: has ? 'var(--text)' : 'var(--text-muted)', cursor: has ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 13, fontWeight: has ? 700 : 400 }}
              >
                {d}
                {has && <div style={{ fontSize: 8, fontFamily: 'var(--mono)', color: isOver ? 'var(--red)' : 'var(--accent)' }}>{Math.round(cal)}</div>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
