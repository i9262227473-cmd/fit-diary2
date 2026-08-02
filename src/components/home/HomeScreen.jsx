import React, { useState } from 'react'
import { Bell, Calendar, Droplets } from 'lucide-react'
import CircularProgress, { getCalorieColor } from '../common/CircularProgress'

export default function HomeScreen({ state, dispatch, goTo, name, aiCall, CalendarView }) {
  const [showCalendar, setShowCalendar] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const entry = state.entries.find(e => e.date === today) || { date: today, foods: [], workouts: [] }
  const goals = { calories: state.profile?.calorieGoal || 2200, protein: state.profile?.proteinGoal || 150, fat: state.profile?.fatGoal || 70, carbs: state.profile?.carbGoal || 250 }
  const totals = entry.foods.reduce((a, f) => ({ calories: a.calories + (f.calories||0), protein: a.protein + (f.protein||0), fat: a.fat + (f.fat||0), carbs: a.carbs + (f.carbs||0) }), { calories: 0, protein: 0, fat: 0, carbs: 0 })
  const eaten = Math.round(totals.calories)
  const remaining = Math.max(0, goals.calories - eaten)
  const water = state.water
  const dayName = new Date().toLocaleDateString('ru-RU', { weekday: 'long' })
  const calColor = getCalorieColor(eaten / goals.calories)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 4 }}>
        <div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>Сегодня · {dayName}</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Привет, {name.split(' ')[0]} 👋</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowCalendar(true)} style={{ width: 40, height: 40, borderRadius: 12, background: '#1a1a1a', border: '1px solid #2e2e2e', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Calendar size={18} color="#9ca3af" />
          </button>
          <button style={{ width: 40, height: 40, borderRadius: 12, background: '#1a1a1a', border: '1px solid #2e2e2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={18} color="#9ca3af" />
          </button>
        </div>
      </div>
      {showCalendar && CalendarView && <CalendarView state={state} dispatch={dispatch} aiCall={aiCall} onClose={() => setShowCalendar(false)} />}

      {entry.workouts?.length > 0 ? (
        <div onClick={() => goTo('workout')} style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #222 100%)', borderRadius: 20, padding: 20, border: '1px solid #2e2e2e', cursor: 'pointer' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Последняя тренировка</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{entry.workouts[entry.workouts.length-1]?.name || 'Тренировка'}</div>
          <div style={{ fontSize: 13, color: '#9ca3af' }}>{entry.workouts[entry.workouts.length-1]?.exercises?.length || 0} упражнений · {entry.workouts[entry.workouts.length-1]?.duration || 0} мин</div>
        </div>
      ) : (
        <div style={{ background: 'linear-gradient(135deg, #1a2a1a 0%, #1a1a1a 100%)', borderRadius: 20, padding: 20, border: '1px solid #2e3a2e' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Сегодня</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#3d9970' }}>Начни тренировку</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>Нет активных тренировок на сегодня</div>
          <button onClick={() => goTo('workout')} style={{ background: '#3d9970', color: '#000', border: 'none', borderRadius: 12, padding: '12px 20px', fontSize: 13, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', cursor: 'pointer' }}>
            Начать тренировку
          </button>
        </div>
      )}

      <div onClick={() => goTo('food')} style={{ background: '#1a1a1a', borderRadius: 20, padding: 20, border: '1px solid #2e2e2e', cursor: 'pointer', transition: 'border-color 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#3d9970'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#2e2e2e'}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Калории</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Цель: {goals.calories} ккал</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <CircularProgress value={eaten} max={goals.calories} size={100} stroke={5} dynamicColor>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: calColor }}>{eaten}</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>ккал</div>
          </CircularProgress>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div><div style={{ fontSize: 11, color: '#6b7280' }}>Съедено</div><div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 600 }}>{eaten}</div></div>
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: '#6b7280' }}>Осталось</div><div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 600, color: '#3d9970' }}>{remaining}</div></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[{ l: 'Белки', v: totals.protein, max: goals.protein, c: '#3d9970' }, { l: 'Жиры', v: totals.fat, max: goals.fat, c: '#fbbf24' }, { l: 'Углев.', v: totals.carbs, max: goals.carbs, c: '#38bdf8' }].map(m => {
                const over = m.max > 0 && m.v > m.max
                const barColor = over ? '#ef4444' : m.c
                return (
                  <div key={m.l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 11, color: over ? '#ef4444' : '#6b7280', width: 40 }}>{m.l}</div>
                    <div style={{ flex: 1, height: 4, background: '#2a2a2a', borderRadius: 99 }}>
                      <div style={{ height: '100%', background: barColor, borderRadius: 99, width: `${Math.min(m.v / m.max * 100, 100)}%`, transition: 'width 0.6s, background 0.3s' }} />
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: barColor, width: 32, textAlign: 'right', fontWeight: over ? 700 : 400 }}>{Math.round(m.v)}г</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: '#1a1a1a', borderRadius: 20, padding: 20, border: '1px solid #2e2e2e' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Droplets size={18} color="#38bdf8" />
            <span style={{ fontSize: 15, fontWeight: 600 }}>Вода</span>
          </div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#38bdf8' }}>{water.consumed}/{water.goal} ст.</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {Array.from({ length: water.goal }).map((_, i) => (
            <button key={i} onClick={() => dispatch({ type: 'SET_WATER', val: i < water.consumed ? i : i + 1 })}
              style={{ width: 36, height: 36, borderRadius: 10, border: `2px solid ${i < water.consumed ? '#38bdf8' : '#2e2e2e'}`, background: i < water.consumed ? 'rgba(56,189,248,0.15)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Droplets size={14} color={i < water.consumed ? '#38bdf8' : '#4b5563'} />
            </button>
          ))}
        </div>
        <div style={{ height: 3, background: '#2a2a2a', borderRadius: 99 }}>
          <div style={{ height: '100%', background: '#38bdf8', borderRadius: 99, width: `${water.consumed / water.goal * 100}%`, transition: 'width 0.4s' }} />
        </div>
      </div>
    </div>
  )
}
