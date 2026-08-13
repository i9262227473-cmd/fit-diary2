import React, { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Dumbbell } from 'lucide-react'
import WorkoutDetail from '../workouts/WorkoutDetail'
import CircularProgress, { getCalorieColor } from '../common/CircularProgress'
import SwipeToDelete from '../common/SwipeToDelete'
import styles from './CombinedCalendar.module.css'

const MEALS_MAP = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' }

export default function CombinedCalendar({ state, dispatch, aiCall, onClose }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [selectedDate, setSelectedDate] = useState(null)
  const [viewWorkout, setViewWorkout] = useState(null)
  const monthSwipeStart = useRef(null)
  const suppressDayClick = useRef(false)
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
  const handleMonthPointerDown = event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    monthSwipeStart.current = event.clientX
  }
  const handleMonthPointerUp = event => {
    if (monthSwipeStart.current == null) return
    const delta = event.clientX - monthSwipeStart.current
    monthSwipeStart.current = null
    if (Math.abs(delta) < 55) return
    suppressDayClick.current = true
    window.setTimeout(() => { suppressDayClick.current = false }, 0)
    if (delta < 0) nextMonth()
    else prevMonth()
  }
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
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.panel} onClick={event => event.stopPropagation()}>
      {viewWorkout && <WorkoutDetail workout={viewWorkout} onClose={() => setViewWorkout(null)} aiCall={aiCall} onSaveAnalysis={saveWorkoutAnalysis} />}
      <div className={styles.topBar}>
        <button onClick={onClose} className={styles.closeButton}>
          <ChevronLeft size={18} />
        </button>
        <div><span>Календарь</span><small>Свайпните для смены месяца</small></div>
      </div>

      <div className={styles.calendarCard} onPointerDown={handleMonthPointerDown} onPointerUp={handleMonthPointerUp} onPointerCancel={() => { monthSwipeStart.current = null }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: 8, color: 'var(--text-secondary)', background: 'var(--surface3)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{MONTHS[cursor.m]} {cursor.y}</span>
          <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: 8, color: 'var(--text-secondary)', background: 'var(--surface3)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
          {WD.map(w => <div key={w} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{w}</div>)}
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
              <button key={i} onClick={() => { if (!suppressDayClick.current && canOpen) setSelectedDate(isSel ? null : k) }}
                style={{ aspectRatio: '1', borderRadius: 10, border: isToday ? '1px solid var(--accent)' : '1px solid transparent', background: isSel ? 'var(--accent)' : isOver ? 'color-mix(in srgb, var(--red) 14%, transparent)' : hasFood ? 'var(--accent-dim)' : 'transparent', color: isSel ? 'var(--accent-contrast)' : canOpen ? 'var(--text)' : 'var(--text-muted)', cursor: canOpen ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 13, fontWeight: canOpen ? 700 : 400, position: 'relative' }}>
                {d}
                {hasFood && <div style={{ fontSize: 8, fontFamily: 'var(--mono)', color: isSel ? 'var(--accent-contrast)' : isOver ? 'var(--red)' : 'var(--accent)' }}>{Math.round(cal)}</div>}
                {hasWorkout && <div style={{ position: 'absolute', top: 3, right: 3, width: 5, height: 5, borderRadius: '50%', background: isSel ? 'var(--accent-contrast)' : 'var(--teal)' }} />}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent-dim)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Питание</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Тренировка</span>
          </div>
        </div>
      </div>

      {selectedDate && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 4, fontFamily: 'var(--mono)' }}>{selectedDate}</div>

          {selectedFoods.length > 0 && (
            <div style={{ background: 'var(--card-solid)', borderRadius: 18, padding: 18, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                <CircularProgress value={foodTotals.cal} max={goals.calories} size={64} stroke={4} dynamicColor>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: getCalorieColor(foodTotals.cal / goals.calories) }}>{Math.round(foodTotals.cal)}</div>
                </CircularProgress>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[{ l: 'Б', v: foodTotals.p, max: goals.protein, c: 'var(--protein)' }, { l: 'Ж', v: foodTotals.fat, max: goals.fat, c: 'var(--amber)' }, { l: 'У', v: foodTotals.c, max: goals.carbs, c: 'var(--purple)' }].map(m => {
                    const over = m.max > 0 && m.v > m.max
                    return <div key={m.l} style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: over ? 'var(--red)' : m.c }}>{Math.round(m.v)}г</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.l}</div>
                    </div>
                  })}
                </div>
              </div>
              {Object.entries(MEALS_MAP).map(([mealKey, mealName]) => {
                const items = selectedFoods.filter(f => f.meal === mealKey)
                if (!items.length) return null
                return (
                  <div key={mealKey} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{mealName}</div>
                    {items.map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: '1px solid var(--border)' }}>
                        <div style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{item.name}</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>{Math.round(item.calories||0)} ккал</div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}

          {selectedWorkouts.map(w => (
            <SwipeToDelete key={w.id} onDelete={() => removeWorkout(w.id, w.entryDate)} confirmText="Удалить эту тренировку?">
              <button onClick={() => setViewWorkout(w)} style={{ background: 'var(--card-solid)', padding: 16, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'color-mix(in srgb, var(--teal) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Dumbbell size={20} color="var(--teal)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{w.name || 'Тренировка'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{w.duration} мин{w.aiAnalysis ? ' · анализ готов' : ''}</div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </button>
            </SwipeToDelete>
          ))}

          {selectedFoods.length === 0 && selectedWorkouts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>В этот день ничего не записано</div>
          )}
        </div>
      )}
      </div>
    </div>, document.body
  )
}
