import React, { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Dumbbell } from 'lucide-react'
import WorkoutDetail from '../workouts/WorkoutDetail'
import CircularProgress, { getCalorieColor } from '../common/CircularProgress'
import SwipeToDelete from '../common/SwipeToDelete'

const MEALS_MAP = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' }

export default function CombinedCalendar({ state, dispatch, aiCall, onClose }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [selectedDate, setSelectedDate] = useState(null)
  const [viewWorkout, setViewWorkout] = useState(null)
  const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
  const WD = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
  const todayKey = new Date().toISOString().split('T')[0]
  const goals = { calories: state.profile?.calorieGoal || 2200, protein: state.profile?.proteinGoal || 150, fat: state.profile?.fatGoal || 70, carbs: state.profile?.carbGoal || 250 }
  const entriesByDate = useMemo(() => state.entries.reduce((acc, e) => { acc[e.date] = e; return acc }, {}), [state.entries])

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

  const removeWorkout = (wId, entryDate) => {
    const targetEntry = state.entries.find(e => e.date === entryDate)
    if (!targetEntry) return
    dispatch({ type: 'SAVE_ENTRY', entry: { ...targetEntry, workouts: (targetEntry.workouts||[]).filter(w => w.id !== wId) } })
  }
  const saveWorkoutAnalysis = (workout, text) => {
    const targetEntry = state.entries.find(e => e.date === workout.entryDate)
    if (!targetEntry) return
    dispatch({ type: 'SAVE_ENTRY', entry: { ...targetEntry, workouts: (targetEntry.workouts||[]).map(w => w.id === workout.id ? { ...w, aiAnalysis: text } : w) } })
    if (viewWorkout && viewWorkout.id === workout.id) setViewWorkout({ ...viewWorkout, aiAnalysis: text })
  }

  const selectedEntry = selectedDate ? entriesByDate[selectedDate] : null
  const selectedFoods = selectedEntry?.foods || []
  const selectedWorkouts = (selectedEntry?.workouts || []).map(w => ({ ...w, entryDate: selectedDate }))
  const foodTotals = selectedFoods.reduce((a, f) => ({ cal: a.cal + (f.calories||0), p: a.p + (f.protein||0), fat: a.fat + (f.fat||0), c: a.c + (f.carbs||0) }), { cal: 0, p: 0, fat: 0, c: 0 })

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: '#0e0e0e', zIndex: 500, overflow: 'auto', padding: '20px 16px 40px' }}>
      {viewWorkout && <WorkoutDetail workout={viewWorkout} onClose={() => setViewWorkout(null)} aiCall={aiCall} onSaveAnalysis={saveWorkoutAnalysis} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: '#1a1a1a', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={18} color="#9ca3af" />
        </button>
        <span style={{ fontSize: 18, fontWeight: 700 }}>Календарь</span>
      </div>

      <div style={{ background: '#1a1a1a', borderRadius: 18, padding: 16, border: '1px solid #2e2e2e', marginBottom: 16 }}>
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
            const dayEntry = entriesByDate[k]
            const cal = (dayEntry?.foods || []).reduce((a, f) => a + (f.calories||0), 0)
            const hasFood = cal > 0
            const hasWorkout = (dayEntry?.workouts || []).length > 0
            const isToday = k === todayKey
            const isSel = k === selectedDate
            const isOver = goals.calories > 0 && cal > goals.calories
            const canOpen = hasFood || hasWorkout
            return (
              <button key={i} onClick={() => canOpen && setSelectedDate(isSel ? null : k)}
                style={{ aspectRatio: '1', borderRadius: 10, border: isToday ? '1px solid var(--accent)' : '1px solid transparent', background: isSel ? 'var(--accent)' : isOver ? 'rgba(239,68,68,0.14)' : hasFood ? 'var(--accent-dim)' : 'transparent', color: isSel ? '#000' : canOpen ? '#f5f5f5' : '#6b7280', cursor: canOpen ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 13, fontWeight: canOpen ? 700 : 400, position: 'relative' }}>
                {d}
                {hasFood && <div style={{ fontSize: 8, fontFamily: 'var(--mono)', color: isSel ? '#000' : isOver ? '#ef4444' : 'var(--accent)' }}>{Math.round(cal)}</div>}
                {hasWorkout && <div style={{ position: 'absolute', top: 3, right: 3, width: 5, height: 5, borderRadius: '50%', background: isSel ? '#000' : '#38bdf8' }} />}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a2a2a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent-dim)' }} />
            <span style={{ fontSize: 11, color: '#6b7280' }}>Питание</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8' }} />
            <span style={{ fontSize: 11, color: '#6b7280' }}>Тренировка</span>
          </div>
        </div>
      </div>

      {selectedDate && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, color: '#6b7280', paddingLeft: 4, fontFamily: 'var(--mono)' }}>{selectedDate}</div>

          {selectedFoods.length > 0 && (
            <div style={{ background: '#1a1a1a', borderRadius: 18, padding: 18, border: '1px solid #2e2e2e' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                <CircularProgress value={foodTotals.cal} max={goals.calories} size={64} stroke={4} dynamicColor>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: getCalorieColor(foodTotals.cal / goals.calories) }}>{Math.round(foodTotals.cal)}</div>
                </CircularProgress>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[{ l: 'Б', v: foodTotals.p, max: goals.protein, c: 'var(--accent)' }, { l: 'Ж', v: foodTotals.fat, max: goals.fat, c: '#fbbf24' }, { l: 'У', v: foodTotals.c, max: goals.carbs, c: '#38bdf8' }].map(m => {
                    const over = m.max > 0 && m.v > m.max
                    return <div key={m.l} style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: over ? '#ef4444' : m.c }}>{Math.round(m.v)}г</div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>{m.l}</div>
                    </div>
                  })}
                </div>
              </div>
              {Object.entries(MEALS_MAP).map(([mealKey, mealName]) => {
                const items = selectedFoods.filter(f => f.meal === mealKey)
                if (!items.length) return null
                return (
                  <div key={mealKey} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 6 }}>{mealName}</div>
                    {items.map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: '1px solid #222' }}>
                        <div style={{ flex: 1, fontSize: 13, color: '#d1d5db' }}>{item.name}</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#6b7280' }}>{Math.round(item.calories||0)} ккал</div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}

          {selectedWorkouts.map(w => (
            <SwipeToDelete key={w.id} onDelete={() => removeWorkout(w.id, w.entryDate)} confirmText="Удалить эту тренировку?">
              <button onClick={() => setViewWorkout(w)} style={{ background: '#1a1a1a', padding: 16, border: '1px solid #2e2e2e', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Dumbbell size={20} color="#38bdf8" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{w.name || 'Тренировка'}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)' }}>{w.duration} мин{w.aiAnalysis ? ' · ✓ анализ' : ''}</div>
                </div>
                <ChevronRight size={16} color="#4b5563" />
              </button>
            </SwipeToDelete>
          ))}

          {selectedFoods.length === 0 && selectedWorkouts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#6b7280', fontSize: 13 }}>В этот день ничего не записано</div>
          )}
        </div>
      )}
    </div>, document.body
  )
}
