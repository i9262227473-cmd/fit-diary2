import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store'
import { getCachedFoods, clearCachedFoods } from '../data/userFoodCache'
import { LogOut, Bell, ChevronRight, ChevronLeft, Play, Dumbbell, Edit2, AlertTriangle, Sparkles } from 'lucide-react'
import styles from './DashboardPage.module.css'
import { normReps } from './planUtils'
import FoodDayDetail from '../components/food/FoodDayDetail'
import FoodScreen from '../components/food/FoodScreen'
import HomeScreen from '../components/home/HomeScreen'
import ProgressScreen from '../components/progress/ProgressScreen'
import WorkoutDetail from '../components/workouts/WorkoutDetail'
import WorkoutScreen from '../components/workouts/WorkoutScreen'
import CircularProgress, { getCalorieColor } from '../components/common/CircularProgress'
import { NavHome, NavWorkout, NavProgress, NavFood, NavUser } from '../components/layout/NavigationIcons'
import SwipeToDelete from '../components/common/SwipeToDelete'
import VoiceButton from '../components/common/VoiceButton'

// ─── PLAN CONSTANTS ───────────────────────────────────────────────────────────
const PLAN_KEY = 'workout-plan-v4-pro'
const LEVEL_RU = { beginner: 'новичок', amateur: 'любитель', advanced: 'продвинутый', professional: 'профессионал' }
const GOAL_RU = { weight_loss: 'fat_loss', muscle_gain: 'muscle_gain', maintenance: 'maintenance', endurance: 'maintenance', strength: 'strength', health: 'maintenance' }
const DAY_COLORS_PLAN = ['#3d9970', '#38bdf8', '#fbbf24', '#3d9970', '#38bdf8', '#6b7280', '#6b7280']

const EN_TO_RU = {
  'Monday':'Понедельник','Tuesday':'Вторник','Wednesday':'Среда','Thursday':'Четверг',
  'Friday':'Пятница','Saturday':'Суббота','Sunday':'Воскресенье',
  'Rest':'Отдых','Rest Day':'День отдыха','Recovery':'Восстановление',
  'chest':'Грудь','back':'Спина','legs':'Ноги','shoulders':'Плечи',
  'triceps':'Трицепс','biceps':'Бицепс','core':'Кор','abs':'Пресс','cardio':'Кардио',
  'glutes':'Ягодицы','hamstrings':'Бицепс бедра','quadriceps':'Квадрицепс','calves':'Икры','arms':'Руки',
  'full body':'Всё тело','full_body':'Фулбоди','upper_lower':'Верх/Низ','push_pull_legs':'Жим/Тяга/Ноги',
}
function translateStr(str) {
  if (!str || typeof str !== 'string') return str
  const exact = Object.keys(EN_TO_RU).find(k => k.toLowerCase() === str.toLowerCase())
  if (exact) return EN_TO_RU[exact]
  let result = str
  Object.entries(EN_TO_RU).forEach(([en, ru]) => { result = result.replace(new RegExp(`\\b${en}\\b`, 'gi'), ru) })
  return result
}
function translatePlan(parsed) {
  if (!parsed?.plan?.days) return parsed
  return {
    ...parsed,
    plan: {
      ...parsed.plan,
      split: translateStr(parsed.plan.split),
      days: parsed.plan.days.map(day => ({
        ...day,
        name: translateStr(day.name),
        muscles: (day.muscles||[]).map(translateStr),
        exercises: (day.exercises||[]).map(ex => ({
          ...ex,
          name: translateStr(ex.name),
          muscle: translateStr(ex.muscle),
          reps: normReps(ex.reps),
        }))
      }))
    }
  }
}

function validatePlanQuality(plan, minExercisesPerDay) {
  if (!plan?.plan?.days || !Array.isArray(plan.plan.days)) {
    return { ok: false, reason: 'Структура повреждена' }
  }
  const trainingDays = plan.plan.days.filter(d => d.exercises && d.exercises.length > 0)
  if (trainingDays.length === 0) return { ok: false, reason: 'Нет тренировочных дней' }
  for (const day of trainingDays) {
    if (day.exercises.length < minExercisesPerDay) {
      return { ok: false, reason: `В дне "${day.name}" только ${day.exercises.length} упражнений` }
    }
  }
  return { ok: true }
}

// ─── WORKOUT SCREEN ───────────────────────────────────────────────────────────

// ─── REMINDERS (локальные уведомления через Notification API — бесплатно, без сервера) ───────────────────────────
// Работает, пока открыта вкладка/приложение свёрнуто (не полностью закрыто). Требует HTTPS и разрешения пользователя.
const REMINDERS_KEY = 'reminders-settings-v1'
const REMINDERS_LOG_KEY = 'reminders-firedlog-v1'

function getReminderSettings() {
  try {
    const raw = localStorage.getItem(REMINDERS_KEY)
    if (!raw) return { enabled: false, meals: { breakfast: '08:00', lunch: '13:00', dinner: '19:00' }, workout: { enabled: false, time: '18:00' } }
    return JSON.parse(raw)
  } catch { return { enabled: false, meals: { breakfast: '08:00', lunch: '13:00', dinner: '19:00' }, workout: { enabled: false, time: '18:00' } } }
}
function saveReminderSettings(settings) {
  try { localStorage.setItem(REMINDERS_KEY, JSON.stringify(settings)) } catch {}
}

function useReminders() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return

    const checkAndFire = () => {
      const settings = getReminderSettings()
      if (!settings.enabled || Notification.permission !== 'granted') return

      const now = new Date()
      const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
      const todayKey = now.toISOString().split('T')[0]

      let log = {}
      try { log = JSON.parse(localStorage.getItem(REMINDERS_LOG_KEY) || '{}') } catch {}
      if (log.date !== todayKey) log = { date: todayKey, fired: [] }

      const fire = (id, title, body) => {
        if (log.fired.includes(id)) return
        try { new Notification(title, { body, icon: '/icon-192.png', tag: id }) } catch {}
        log.fired.push(id)
      }

      const MEAL_LABELS = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин' }
      Object.entries(settings.meals || {}).forEach(([key, time]) => {
        if (time === hhmm) fire(`meal-${key}-${todayKey}`, '🍽️ Пора поесть', `${MEAL_LABELS[key] || 'Приём пищи'} — не забудьте записать в дневник`)
      })
      if (settings.workout?.enabled && settings.workout.time === hhmm) {
        fire(`workout-${todayKey}`, '💪 Пора тренироваться', 'Не забудьте про тренировку по плану сегодня')
      }

      try { localStorage.setItem(REMINDERS_LOG_KEY, JSON.stringify(log)) } catch {}
    }

    checkAndFire()
    const id = setInterval(checkAndFire, 30000)
    const onVis = () => { if (document.visibilityState === 'visible') checkAndFire() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
}

// ─── COMBINED CALENDAR (единый календарь: тренировки + питание, открывается с главного экрана) ──────────────────────────────────────────────────────────────────
function CombinedCalendar({ state, dispatch, aiCall, onClose }) {
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
                style={{ aspectRatio: '1', borderRadius: 10, border: isToday ? '1px solid #3d9970' : '1px solid transparent', background: isSel ? '#3d9970' : isOver ? 'rgba(239,68,68,0.14)' : hasFood ? 'rgba(61,153,112,0.14)' : 'transparent', color: isSel ? '#000' : canOpen ? '#f5f5f5' : '#6b7280', cursor: canOpen ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 13, fontWeight: canOpen ? 700 : 400, position: 'relative' }}>
                {d}
                {hasFood && <div style={{ fontSize: 8, fontFamily: 'var(--mono)', color: isSel ? '#000' : isOver ? '#ef4444' : '#3d9970' }}>{Math.round(cal)}</div>}
                {hasWorkout && <div style={{ position: 'absolute', top: 3, right: 3, width: 5, height: 5, borderRadius: '50%', background: isSel ? '#000' : '#38bdf8' }} />}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a2a2a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(61,153,112,0.5)' }} />
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
                  {[{ l: 'Б', v: foodTotals.p, max: goals.protein, c: '#3d9970' }, { l: 'Ж', v: foodTotals.fat, max: goals.fat, c: '#fbbf24' }, { l: 'У', v: foodTotals.c, max: goals.carbs, c: '#38bdf8' }].map(m => {
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

// ─── PLAN SCREEN ─────────────────────────────────────────────────────────────
function PlanScreen({ onBack, aiCall, profile, onStartWorkout }) {
  const [plan, setPlan] = useState(() => {
    try {
      const raw = localStorage.getItem(PLAN_KEY)
      if (!raw) return null
      const p = JSON.parse(raw)
      if (!p?.plan?.days || !Array.isArray(p.plan.days)) { localStorage.removeItem(PLAN_KEY); return null }
      p.plan.days.forEach(day => { (day.exercises || []).forEach(ex => { ex.reps = normReps(ex.reps) }) })
      return p
    } catch { localStorage.removeItem(PLAN_KEY); return null }
  })
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('Составляю план...')
  const [error, setError] = useState(null)
  const [expandedDay, setExpandedDay] = useState(null)

  const levelKey = profile?.level || 'amateur'
  const levelLabel = LEVEL_RU[levelKey] || 'любитель'
  const goalKey = GOAL_RU[profile?.goals?.[0]] || 'maintenance'

  // Объединяем ограничения текстом + AI-анализ
  const limitations = profile?.limitationsText || ''
  const aiAnalysis = profile?.aiAnalysis || ''
  const hasLimitations = !!(limitations || aiAnalysis)

  const requestPlan = async (lvlKey, goalKey, p, repsRange, daysPerWeek, duration, expYears, placeLabel) => {
    const TIMEOUT_MS = 60000

    const limitationsBlock = hasLimitations
      ? `
ОГРАНИЧЕНИЯ И ТРАВМЫ ПОЛЬЗОВАТЕЛЯ (КРИТИЧНО учитывать):
${limitations ? `- Описание: ${limitations}` : ''}
${aiAnalysis ? `- Рекомендации врача/AI: ${aiAnalysis}` : ''}
Исключи из плана упражнения нагружающие травмированную область. Заменяй на безопасные альтернативы.`
      : '- Ограничения/травмы: нет'

    const prompt = `Ты — профессиональный фитнес-тренер с 10-летним опытом. Составь персональный недельный план тренировок строго по правилам.

ВХОДНЫЕ ДАННЫЕ:
- Уровень: ${lvlKey} (опыт ${expYears} лет)
- Цель: ${goalKey}
- Возраст: ${profile?.age || 25}, пол: ${profile?.gender || 'male'}
- Вес: ${profile?.weight || 80} кг, рост: ${profile?.height || 175} см
${limitationsBlock}
- Оборудование/место: ${placeLabel}
- Частота: ${daysPerWeek} тренировок в неделю
- Длительность: ${duration} минут

ПАРАМЕТРЫ (соблюдай ТОЧНО):
- Сплит: ${p.split}
- Упражнений за тренировку: МИНИМУМ ${p.exMin}, максимум ${p.exMax}
- Подходов: ${p.sets}
- Повторений (под цель ${goalKey}): ${repsRange}
- Отдых: ${p.restSec} сек

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА (нарушение = брак):
1. В КАЖДОМ тренировочном дне МИНИМУМ ${p.exMin} упражнений. КРИТИЧНО.
2. Не более 20 подходов на одну мышечную группу за неделю.
3. На каждую группу: 1-2 базовых (compound) + 1-2 изолирующих (isolation).
4. Сплит (ОБЯЗАТЕЛЬНО соблюдать именно указанный, НЕ менять):
   - full body: каждая тренировка прорабатывает ВСЁ ТЕЛО. КРИТИЧНО для новичка: новичку НУЖНА ЧАСТОТА, а не объём на одну мышцу. Каждая группа должна нагружаться 2-3 раза в неделю для быстрой нейромышечной адаптации и оттачивания техники базовых движений. НЕ разбивай на сплит по группам.
   - upper/lower: чередовать ВЕРХ и НИЗ
   - push/pull/legs: жим → тяга → ноги
5. Между тренировочными днями вставлять дни отдыха (exercises: []).
${hasLimitations ? '6. ОБЯЗАТЕЛЬНО исключить опасные упражнения для указанных травм. Например при коксартрозе/болях в ТБС — БЕЗ приседаний со штангой, становой, выпадов с весом, жима ногами. Заменить на безопасные: разгибания/сгибания ног в тренажёре, упражнения сидя, плавание-кардио.' : ''}
7. ВСЕ названия — на русском (Понедельник..Воскресенье; Грудь, Спина, Ноги, Плечи, Трицепс, Бицепс, Кор, Кардио).
8. Названия упражнений — реальные русские: "Жим штанги лёжа", "Тяга верхнего блока" и т.д.

СТРУКТУРА: compound первыми, потом isolation. На большие группы (грудь/спина/ноги) 4-5 упр., на малые (бицепс/трицепс) 2-3.

ВЕРНИ ТОЛЬКО валидный JSON:
{"plan":{"split":"Фулбоди","days":[{"day_index":0,"name":"Понедельник","muscles":["Грудь","Трицепс"],"exercises":[{"name":"Жим штанги лёжа","muscle":"Грудь","type":"compound","sets":3,"reps":{"min":8,"max":12},"rest_sec":90},{"name":"Жим гантелей на наклонной","muscle":"Грудь","type":"compound","sets":3,"reps":{"min":10,"max":12},"rest_sec":90},{"name":"Разводка гантелей лёжа","muscle":"Грудь","type":"isolation","sets":3,"reps":{"min":12,"max":15},"rest_sec":60},{"name":"Жим узким хватом","muscle":"Трицепс","type":"compound","sets":3,"reps":{"min":8,"max":12},"rest_sec":90},{"name":"Разгибания на блоке","muscle":"Трицепс","type":"isolation","sets":3,"reps":{"min":12,"max":15},"rest_sec":60}]},{"day_index":1,"name":"Вторник","muscles":[],"exercises":[]}]},"progression":{"increment_percent":{"min":2.5,"max":5}}}

НАПОМИНАНИЕ: каждый тренировочный день — МИНИМУМ ${p.exMin} упражнений.`

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS))
    const reply = await Promise.race([aiCall([{ role: 'user', content: prompt }], 3500), timeoutPromise])
    const clean = reply.replace(/```json|```/g, '').trim()
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('NO_JSON')
    let parsed
    try { parsed = JSON.parse(match[0]) } catch { throw new Error('BAD_JSON') }
    if (!parsed.plan?.days || !Array.isArray(parsed.plan.days)) throw new Error('BAD_STRUCTURE')
    return parsed
  }

  const generatePlan = async () => {
    setLoading(true); setError(null); setLoadingMsg('Составляю план...')
    try {
      const lvlKey = levelKey === 'professional' ? 'expert' : levelKey
      const levelParams = {
        beginner: { split:'full body', exMin:4, exMax:6, sets:'2-3', restSec:'60-90', reps:{ fat_loss:'10-15', muscle_gain:'8-12', strength:'6-10', maintenance:'10-12' } },
        amateur:  { split:'upper/lower', exMin:5, exMax:8, sets:'3-4', restSec:'60-120', reps:{ fat_loss:'10-15', muscle_gain:'6-12', strength:'4-8', maintenance:'8-12' } },
        advanced: { split:'push/pull/legs', exMin:6, exMax:10, sets:'3-5', restSec:'90-180', reps:{ fat_loss:'10-15', muscle_gain:'6-12', strength:'4-6', maintenance:'8-12' } },
        expert:   { split:'кастомный', exMin:7, exMax:12, sets:'4-6', restSec:'120-240', reps:{ fat_loss:'10-15', muscle_gain:'6-12', strength:'3-6', maintenance:'8-12' } },
      }
      const p = levelParams[lvlKey] || levelParams.amateur
      const repsRange = p.reps[goalKey] || '8-12'
      const daysPerWeek = lvlKey === 'beginner' ? 3 : lvlKey === 'amateur' ? 4 : 5
      const duration = lvlKey === 'beginner' ? 45 : 60
      const expYears = lvlKey === 'beginner' ? 0 : lvlKey === 'amateur' ? 1 : lvlKey === 'advanced' ? 3 : 5
      const wp = (() => { try { return localStorage.getItem('workout-place-v1') || 'gym' } catch { return 'gym' } })()
      const placeLabel = wp === 'home' ? 'дом (только своё тело, гантели, резинки, турник; БЕЗ зальных тренажёров и штанги)' : wp === 'both' ? 'зал и дом (можно любое оборудование)' : 'тренажёрный зал (полный доступ к штанге, тренажёрам, блокам)'

      let parsed = null
      let lastReason = null

      for (let attempt = 1; attempt <= 2; attempt++) {
        if (attempt === 2) setLoadingMsg('План получился слабым, переделываю...')
        try {
          parsed = await requestPlan(lvlKey, goalKey, p, repsRange, daysPerWeek, duration, expYears, placeLabel)
          const validation = validatePlanQuality(parsed, p.exMin)
          if (validation.ok) break
          lastReason = validation.reason
          parsed = null
        } catch (e) {
          if (e.message === 'TIMEOUT') throw e
          lastReason = e.message
        }
      }

      if (!parsed) {
        setError(`AI не смог составить корректный план (${lastReason || 'попробуй ещё раз'}).`)
        setLoading(false); return
      }

      const translated = translatePlan(parsed)
      setPlan(translated)
      localStorage.setItem(PLAN_KEY, JSON.stringify(translated))
      setExpandedDay(0)
    } catch (e) {
      if (e.message === 'TIMEOUT') setError('AI слишком долго отвечает (>60с). Попробуй ещё раз.')
      else if (e.message === 'NO_JSON' || e.message === 'BAD_JSON') setError('AI вернул некорректный ответ. Попробуй ещё раз.')
      else setError('Ошибка соединения. Попробуй снова.')
    } finally { setLoading(false) }
  }

  const typeLabel = t => t === 'compound' ? 'Базовое' : 'Изоляция'
  const typeColor = t => t === 'compound' ? '#3d9970' : '#38bdf8'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 10, background: '#1a1a1a', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={18} color="#9ca3af" />
        </button>
        <span style={{ fontSize: 18, fontWeight: 700 }}>AI-план тренировок</span>
      </div>

      <div style={{ background: '#1a1a1a', borderRadius: 14, padding: '12px 16px', display: 'flex', border: '1px solid #2e2e2e' }}>
        {[{ label:'Уровень', value:levelLabel, c:'#3d9970' }, { label:'Цель', value:goalKey, c:'#38bdf8' }, { label:'Ограничения', value:hasLimitations?'Есть':'Нет', c:hasLimitations?'#fbbf24':'#6b7280' }].map((item, i) => (
          <div key={i} style={{ flex: 1, padding:'4px 8px', borderRight: i<2?'1px solid #2e2e2e':'none' }}>
            <div style={{ fontSize: 10, color:'#6b7280', marginBottom:3, textTransform:'uppercase' }}>{item.label}</div>
            <div style={{ fontSize:12, color:item.c, fontWeight:600, textTransform:'capitalize' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {!plan && !loading && (
        <div style={{ background:'#1a1a1a', borderRadius:20, padding:28, display:'flex', flexDirection:'column', alignItems:'center', gap:16, textAlign:'center', border:'1px solid #2e2e2e' }}>
          <div style={{ fontSize:48 }}>✦</div>
          <div style={{ fontSize:16, fontWeight:700 }}>AI составит план под тебя</div>
          <div style={{ fontSize:13, color:'#6b7280', lineHeight:1.6 }}>Учитывает уровень, цель, сплит{hasLimitations ? ' и ваши ограничения/травмы' : ''}</div>
          {error && <div style={{ fontSize:13, color:'#f87171', background:'rgba(248,113,113,0.1)', padding:'10px 16px', borderRadius:10, width:'100%' }}>{error}</div>}
          <button onClick={generatePlan} style={{ background:'#3d9970', color:'#000', border:'none', borderRadius:14, padding:'14px 28px', fontSize:15, fontWeight:700, cursor:'pointer', textTransform:'uppercase', letterSpacing:0.5 }}>Создать план</button>
        </div>
      )}

      {loading && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, padding:'48px 0' }}>
          <div style={{ width:48, height:48, borderRadius:'50%', border:'3px solid rgba(61,153,112,0.2)', borderTop:'3px solid #3d9970', animation:'spin 1s linear infinite' }} />
          <div style={{ fontSize:14, fontWeight:600 }}>{loadingMsg}</div>
          <div style={{ fontSize:12, color:'#6b7280' }}>20–40 секунд</div>
        </div>
      )}

      {plan && plan.plan && Array.isArray(plan.plan.days) && (
        <>
          <div style={{ background:'#1a1a1a', borderRadius:14, padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid #2e2e2e' }}>
            <span style={{ fontSize:13, color:'#6b7280' }}>Сплит</span>
            <span style={{ fontSize:13, fontWeight:700, color:'#3d9970' }}>{plan.plan.split || '—'}</span>
          </div>
          {plan.plan.days.map((day, i) => {
            const isRest = !day.exercises || day.exercises.length === 0
            const isOpen = expandedDay === i
            return (
              <div key={i} style={{ background:'#1a1a1a', borderRadius:18, overflow:'hidden', border:`1px solid ${isOpen?'rgba(61,153,112,0.3)':'#2e2e2e'}` }}>
                <div onClick={() => setExpandedDay(isOpen ? null : i)} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', cursor:'pointer' }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:isRest?'#4b5563':DAY_COLORS_PLAN[i%7], flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600 }}>{day.name}</div>
                    {!isRest && day.muscles?.length>0 && <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>{day.muscles.join(' + ')}</div>}
                    {isRest && <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>Отдых</div>}
                  </div>
                  {!isRest && (
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:11, color:'#6b7280', fontFamily:'var(--mono)' }}>{day.exercises.length} упр.</span>
                      <span style={{ color:'#6b7280', fontSize:14 }}>{isOpen?'▲':'▼'}</span>
                    </div>
                  )}
                </div>
                {isOpen && !isRest && (
                  <div style={{ borderTop:'1px solid #2a2a2a' }}>
                    {day.exercises.map((ex, j) => {
                      const reps = normReps(ex.reps)
                      return (
                        <div key={j} style={{ padding:'12px 16px', borderBottom: j<day.exercises.length-1?'1px solid #1e1e1e':'none', display:'flex', gap:12, alignItems:'flex-start' }}>
                          <div style={{ flex:1 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                              <span style={{ padding:'2px 8px', background:`${typeColor(ex.type)}22`, color:typeColor(ex.type), borderRadius:6, fontSize:10, fontWeight:700 }}>{typeLabel(ex.type)}</span>
                              <span style={{ fontSize:14, fontWeight:500 }}>{ex.name}</span>
                            </div>
                            <div style={{ display:'flex', gap:12, fontFamily:'var(--mono)', fontSize:12 }}>
                              <span style={{ color:'#3d9970' }}>{ex.sets} × {reps.min}–{reps.max}</span>
                              <span style={{ color:'#6b7280' }}>отдых {ex.rest_sec}с</span>
                            </div>
                          </div>
                          <span style={{ fontSize:11, padding:'3px 8px', background:'#222', borderRadius:6, color:'#9ca3af', flexShrink:0 }}>{ex.muscle}</span>
                        </div>
                      )
                    })}
                    {/* Кнопки: Редактировать (→ конструктор) и Начать тренировку (→ активная) */}
                    <div style={{ padding: '12px 16px', borderTop: '1px solid #2a2a2a', background: '#161616', display: 'flex', gap: 8 }}>
                      <button onClick={() => onStartWorkout && onStartWorkout(day, i, 'builder')}
                        style={{ flex: 1, background: 'transparent', color: '#3d9970', border: '1px solid #3d9970', borderRadius: 12, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        <Edit2 size={14} /> Изменить
                      </button>
                      <button onClick={() => onStartWorkout && onStartWorkout(day, i, 'active')}
                        style={{ flex: 1.4, background: '#3d9970', color: '#000', border: 'none', borderRadius: 12, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        <Play size={14} /> Начать
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {plan.progression?.increment_percent && (
            <div style={{ background:'#1a1a1a', borderRadius:18, padding:16, border:'1px solid #2e2e2e' }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Прогрессия</div>
              <div style={{ fontSize:12, color:'#9ca3af' }}>
                Выполнил все подходы → +{plan.progression.increment_percent.min ?? 2.5}–{plan.progression.increment_percent.max ?? 5}% к весу
              </div>
            </div>
          )}
          <button onClick={() => { setPlan(null); localStorage.removeItem(PLAN_KEY); setError(null); setExpandedDay(null) }}
            style={{ padding:'12px', background:'transparent', border:'1px solid #2e2e2e', borderRadius:14, color:'#6b7280', cursor:'pointer', fontSize:13 }}>
            ↻ Пересоздать план
          </button>
        </>
      )}
    </div>
  )
}

// ─── PROFILE SCREEN ───────────────────────────────────────────────────────────
const LEVEL_LABELS = { beginner:'Новичок', amateur:'Любитель', advanced:'Продвинутый', professional:'Профессионал' }
const GOAL_LABELS  = { weight_loss:'Похудение', muscle_gain:'Набор массы', maintenance:'Поддержание', endurance:'Выносливость', strength:'Сила', health:'Здоровье' }
const ACTIVITY_LABELS = { sedentary:'Сидячий', light:'Лёгкая', moderate:'Умеренная', active:'Высокая', very_active:'Очень высокая' }

function ProfileScreen({ profile, saveProfile, signOut, aiCall }) {
  const [section, setSection] = useState('plan')
  const [form, setForm] = useState({
    age:profile?.age||'', weight:profile?.weight||'', height:profile?.height||'',
    gender:profile?.gender||'male', activity:profile?.activity||'moderate',
    level:profile?.level||'amateur', goals:profile?.goals||[],
    calorieGoal:profile?.calorieGoal||'', proteinGoal:profile?.proteinGoal||'',
    fatGoal:profile?.fatGoal||'', carbGoal:profile?.carbGoal||'',
    limitationsText: profile?.limitationsText || '',
    aiAnalysis: profile?.aiAnalysis || '',
    workoutPlace: (() => { try { return localStorage.getItem('workout-place-v1') || 'gym' } catch { return 'gym' } })(),
  })
  const [saved, setSaved] = useState(false)
  const [cacheCount, setCacheCount] = useState(() => getCachedFoods().length)
  const [cacheCleared, setCacheCleared] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState(null)
  const [reminders, setReminders] = useState(() => getReminderSettings())
  const notifPermission = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'

  const updateReminders = (patch) => {
    setReminders(r => {
      const next = { ...r, ...patch }
      saveReminderSettings(next)
      return next
    })
  }
  const updateMealTime = (key, time) => {
    setReminders(r => {
      const next = { ...r, meals: { ...r.meals, [key]: time } }
      saveReminderSettings(next)
      return next
    })
  }
  const enableReminders = async () => {
    if (notifPermission === 'unsupported') return
    if (notifPermission !== 'granted') {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return
    }
    updateReminders({ enabled: true })
  }

  const toggleGoal = g => setForm(f => ({ ...f, goals: f.goals.includes(g) ? f.goals.filter(x => x!==g) : [...f.goals, g] }))

  const handleClearCache = () => {
    if (confirm('Удалить все сохранённые AI-продукты? Это нельзя отменить.')) {
      clearCachedFoods()
      setCacheCount(0)
      setCacheCleared(true)
      setTimeout(() => setCacheCleared(false), 2000)
    }
  }

  const runAIAnalysis = async () => {
    if (!form.limitationsText.trim()) {
      setAnalyzeError('Сначала опишите ограничения')
      return
    }
    setAnalyzing(true)
    setAnalyzeError(null)
    try {
      const prompt = `Ты — спортивный врач и реабилитолог. Пользователь описал свои ограничения здоровья:

"${form.limitationsText}"

Дай краткий анализ (3-5 предложений) на русском:
1. Какие виды нагрузок ОПАСНЫ при этом состоянии (что исключить)
2. Какие упражнения БЕЗОПАСНЫ и рекомендуются
3. Общие рекомендации по тренировкам

Ответь простым текстом без markdown, без заголовков, в одном абзаце. Конкретно и по делу.`

      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 30000))
      const reply = await Promise.race([
        aiCall([{ role: 'user', content: prompt }], 800),
        timeoutPromise
      ])

      const cleaned = reply.replace(/```/g, '').trim()
      setForm(f => ({ ...f, aiAnalysis: cleaned }))
    } catch (e) {
      setAnalyzeError(e.message === 'TIMEOUT' ? 'AI долго отвечает, попробуй ещё раз' : 'Ошибка анализа, попробуй ещё раз')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = async () => {
    const w = +form.weight, h = +form.height, a = +form.age
    let calorieGoal = +form.calorieGoal
    if (!calorieGoal && w && h && a) {
      const bmr = form.gender==='male' ? 10*w+6.25*h-5*a+5 : 10*w+6.25*h-5*a-161
      const factors = { sedentary:1.2, light:1.375, moderate:1.55, active:1.725, very_active:1.9 }
      calorieGoal = Math.round(bmr * (factors[form.activity]||1.55))
    }
    const proteinGoal = +form.proteinGoal || Math.round(w*1.8)
    const fatGoal = +form.fatGoal || Math.round(calorieGoal*0.25/9)
    const carbGoal = +form.carbGoal || Math.round((calorieGoal-proteinGoal*4-fatGoal*9)/4)
    const bmi = w&&h ? (w/((h/100)**2)).toFixed(1) : profile?.bmi
    await saveProfile({ ...profile, ...form, calorieGoal, proteinGoal, fatGoal, carbGoal, bmi })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const inp = { width:'100%', padding:'12px 16px', background:'#222', border:'1px solid #2e2e2e', borderRadius:12, color:'#f5f5f5', fontSize:15, outline:'none', boxSizing:'border-box' }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:11, color:'#6b7280', textTransform:'uppercase', letterSpacing:1, marginBottom:2 }}>Аккаунт</div>
          <div style={{ fontSize:20, fontWeight:700 }}>План и профиль</div>
        </div>
        <button onClick={signOut} style={{ width:36, height:36, borderRadius:10, background:'#1a1a1a', border:'1px solid #2e2e2e', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <LogOut size={16} color="#9ca3af" />
        </button>
      </div>
      <div style={{ display:'flex', background:'#1a1a1a', borderRadius:12, padding:4, gap:4, border:'1px solid #2e2e2e' }}>
        {[['plan','План'],['profile','Профиль'],['health','Здоровье'],['settings','Настройки']].map(([k,v]) => (
          <button key={k} onClick={() => setSection(k)} style={{ flex:1, padding:'9px 4px', borderRadius:9, border:'none', cursor:'pointer', fontSize:12, fontWeight:500, background:section===k?'#3d9970':'transparent', color:section===k?'#000':'#6b7280' }}>{v}</button>
        ))}
      </div>

      {section === 'plan' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:16, border:'1px solid #2e2e2e' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Цели тренировок</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {Object.entries(GOAL_LABELS).map(([k,v]) => (
                <button key={k} onClick={() => toggleGoal(k)} style={{ padding:'8px 14px', borderRadius:10, border:`1px solid ${form.goals.includes(k)?'#3d9970':'#2e2e2e'}`, background:form.goals.includes(k)?'rgba(61,153,112,0.1)':'#222', color:form.goals.includes(k)?'#3d9970':'#9ca3af', cursor:'pointer', fontSize:13, fontWeight:500 }}>{v}</button>
              ))}
            </div>
          </div>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:16, border:'1px solid #2e2e2e' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Уровень подготовки</div>
            <div style={{ display:'flex', gap:8 }}>
              {Object.entries(LEVEL_LABELS).map(([k,v]) => (
                <button key={k} onClick={() => setForm(f => ({...f, level:k}))} style={{ flex:1, padding:'10px 6px', borderRadius:10, border:`1px solid ${form.level===k?'#3d9970':'#2e2e2e'}`, background:form.level===k?'rgba(61,153,112,0.1)':'#222', color:form.level===k?'#3d9970':'#9ca3af', cursor:'pointer', fontSize:11, fontWeight:form.level===k?700:400 }}>{v}</button>
              ))}
            </div>
          </div>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:16, border:'1px solid #2e2e2e' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Где тренируешься</div>
            <div style={{ fontSize:12, color:'#6b7280', marginBottom:12 }}>От этого зависит, какие упражнения предлагаются</div>
            <div style={{ display:'flex', gap:8 }}>
              {[['gym','Зал'],['home','Дом'],['both','Везде']].map(([k,v]) => (
                <button key={k} onClick={() => { setForm(f => ({...f, workoutPlace:k})); try { localStorage.setItem('workout-place-v1', k) } catch {} }} style={{ flex:1, padding:'12px 6px', borderRadius:10, border:`1px solid ${form.workoutPlace===k?'#3d9970':'#2e2e2e'}`, background:form.workoutPlace===k?'rgba(61,153,112,0.1)':'#222', color:form.workoutPlace===k?'#3d9970':'#9ca3af', cursor:'pointer', fontSize:13, fontWeight:form.workoutPlace===k?700:400 }}>{v}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {section === 'profile' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[['Рост (см)','height','number','180'],['Вес (кг)','weight','number','90'],['Возраст','age','number','28']].map(([label,key,type,ph]) => (
            <div key={key} style={{ background:'#1a1a1a', borderRadius:14, padding:'14px 16px', border:'1px solid #2e2e2e', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:14, color:'#9ca3af' }}>{label}</span>
              <input style={{ background:'transparent', border:'none', color:'#f5f5f5', fontSize:14, fontWeight:600, textAlign:'right', width:120, outline:'none' }} type={type} placeholder={ph} value={form[key]||''} onChange={e => setForm(f => ({...f,[key]:e.target.value}))} />
            </div>
          ))}
          <div style={{ background:'#1a1a1a', borderRadius:14, padding:'14px 16px', border:'1px solid #2e2e2e', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:14, color:'#9ca3af' }}>Пол</span>
            <select style={{ background:'transparent', border:'none', color:'#f5f5f5', fontSize:14, fontWeight:600, outline:'none' }} value={form.gender} onChange={e => setForm(f => ({...f,gender:e.target.value}))}>
              <option value="male" style={{ background:'#222' }}>Мужской</option>
              <option value="female" style={{ background:'#222' }}>Женский</option>
            </select>
          </div>
          <div style={{ background:'#1a1a1a', borderRadius:14, padding:'14px 16px', border:'1px solid #2e2e2e' }}>
            <div style={{ fontSize:13, color:'#9ca3af', marginBottom:8 }}>Активность</div>
            <select style={{ ...inp, background:'#222', borderRadius:8 }} value={form.activity} onChange={e => setForm(f => ({...f,activity:e.target.value}))}>
              {Object.entries(ACTIVITY_LABELS).map(([v,l]) => <option key={v} value={v} style={{ background:'#222' }}>{l}</option>)}
            </select>
          </div>
          {profile?.bmi && (
            <div style={{ background:'rgba(61,153,112,0.05)', borderRadius:14, padding:'14px 16px', border:'1px solid rgba(61,153,112,0.2)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:14, color:'#9ca3af' }}>ИМТ</span>
              <span style={{ fontSize:14, fontWeight:700, color:'#3d9970' }}>{profile.bmi}</span>
            </div>
          )}
        </div>
      )}

      {section === 'health' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:16, border:'1px solid #2e2e2e' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <AlertTriangle size={16} color="#fbbf24" />
              <div style={{ fontSize:14, fontWeight:600 }}>Ограничения и травмы</div>
            </div>
            <div style={{ fontSize:12, color:'#6b7280', marginBottom:10, lineHeight:1.5 }}>
              Опиши состояния, травмы и ограничения. AI учтёт их при составлении плана тренировок.
            </div>
            <textarea
              style={{ ...inp, resize:'none', minHeight:90, lineHeight:1.5, fontSize:14 }}
              placeholder="Например: коксартроз правого ТБС 2 степени, грыжа L4-L5, проблемы с коленями"
              value={form.limitationsText}
              onChange={e => setForm(f => ({ ...f, limitationsText: e.target.value }))}
              rows={4}
            />
            <button
              onClick={runAIAnalysis}
              disabled={analyzing || !form.limitationsText.trim()}
              style={{
                marginTop:10, width:'100%', background:'#3d9970', color:'#000', border:'none',
                borderRadius:12, padding:'12px', fontSize:13, fontWeight:700, cursor:'pointer',
                opacity: analyzing || !form.limitationsText.trim() ? 0.5 : 1,
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                textTransform:'uppercase', letterSpacing:0.5
              }}>
              <Sparkles size={14} />
              {analyzing ? 'Анализирую...' : 'Получить AI-анализ'}
            </button>
            {analyzeError && (
              <div style={{ marginTop:8, fontSize:12, color:'#f87171', background:'rgba(248,113,113,0.1)', padding:'8px 12px', borderRadius:8 }}>
                {analyzeError}
              </div>
            )}
          </div>

          {form.aiAnalysis && (
            <div style={{ background:'rgba(61,153,112,0.05)', borderRadius:16, padding:16, border:'1px solid rgba(61,153,112,0.25)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <Sparkles size={16} color="#3d9970" />
                <div style={{ fontSize:13, fontWeight:600, color:'#3d9970' }}>AI-анализ</div>
              </div>
              <div style={{ fontSize:13, color:'#d1d5db', lineHeight:1.6, whiteSpace:'pre-wrap' }}>
                {form.aiAnalysis}
              </div>
              <div style={{ marginTop:10, fontSize:11, color:'#6b7280', fontStyle:'italic' }}>
                Эти данные будут учтены при генерации AI-плана тренировок
              </div>
            </div>
          )}
        </div>
      )}

      {section === 'settings' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:16, border:'1px solid #2e2e2e' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: reminders.enabled ? 14 : 4 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Bell size={16} color="#3d9970" />
                <div style={{ fontSize:14, fontWeight:600 }}>Уведомления</div>
              </div>
              <button
                onClick={() => reminders.enabled ? updateReminders({ enabled: false }) : enableReminders()}
                style={{ width: 46, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', position: 'relative', background: reminders.enabled ? '#3d9970' : '#2e2e2e', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 3, left: reminders.enabled ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </button>
            </div>
            {notifPermission === 'unsupported' && (
              <div style={{ fontSize:12, color:'#6b7280' }}>Браузер не поддерживает уведомления</div>
            )}
            {notifPermission === 'denied' && (
              <div style={{ fontSize:12, color:'#f87171' }}>Уведомления заблокированы в настройках браузера — разрешите их вручную для этого сайта</div>
            )}
            {reminders.enabled && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ fontSize:11, color:'#6b7280', textTransform:'uppercase', letterSpacing:0.5 }}>Время приёмов пищи</div>
                {[['breakfast','Завтрак'],['lunch','Обед'],['dinner','Ужин']].map(([key, label]) => (
                  <div key={key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:13, color:'#d1d5db' }}>{label}</span>
                    <input type="time" value={reminders.meals?.[key] || '08:00'} onChange={e => updateMealTime(key, e.target.value)}
                      style={{ background:'#222', border:'1px solid #2e2e2e', borderRadius:8, color:'#f5f5f5', fontSize:13, padding:'6px 10px', fontFamily:'var(--mono)' }} />
                  </div>
                ))}
                <div style={{ height:1, background:'#2a2a2a', margin:'4px 0' }} />
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:13, color:'#d1d5db' }}>Напоминать про тренировку</span>
                  <button
                    onClick={() => updateReminders({ workout: { ...reminders.workout, enabled: !reminders.workout?.enabled } })}
                    style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', position: 'relative', background: reminders.workout?.enabled ? '#3d9970' : '#2e2e2e' }}>
                    <div style={{ position: 'absolute', top: 2, left: reminders.workout?.enabled ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </button>
                </div>
                {reminders.workout?.enabled && (
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:13, color:'#d1d5db' }}>Время тренировки</span>
                    <input type="time" value={reminders.workout?.time || '18:00'} onChange={e => updateReminders({ workout: { ...reminders.workout, time: e.target.value } })}
                      style={{ background:'#222', border:'1px solid #2e2e2e', borderRadius:8, color:'#f5f5f5', fontSize:13, padding:'6px 10px', fontFamily:'var(--mono)' }} />
                  </div>
                )}
                <div style={{ fontSize:11, color:'#6b7280', marginTop:4 }}>Уведомления работают, пока открыта вкладка или приложение свёрнуто</div>
              </div>
            )}
          </div>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:16, border:'1px solid #2e2e2e' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Цели КБЖУ</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[['Калории','calorieGoal','#f5f5f5'],['Белки (г)','proteinGoal','#3d9970'],['Жиры (г)','fatGoal','#fbbf24'],['Углев. (г)','carbGoal','#38bdf8']].map(([label,key,color]) => (
                <div key={key}>
                  <div style={{ fontSize:11, color, marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>{label}</div>
                  <input style={{ ...inp, borderColor:color==='#f5f5f5'?'#2e2e2e':color+'44' }} type="number" value={form[key]} onChange={e => setForm(f => ({...f,[key]:e.target.value}))} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:16, border:'1px solid #2e2e2e' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:600 }}>Кэш AI-продуктов</div>
                <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>Сохранённых: {cacheCount}</div>
              </div>
              <button onClick={handleClearCache} disabled={cacheCount === 0}
                style={{ padding:'8px 14px', borderRadius:10, background: cacheCleared ? '#329063' : 'rgba(239,68,68,0.1)', border:`1px solid ${cacheCleared ? '#329063' : 'rgba(239,68,68,0.3)'}`, color: cacheCleared ? '#000' : '#ef4444', cursor:'pointer', fontSize:12, fontWeight:600, opacity: cacheCount === 0 ? 0.4 : 1 }}>
                {cacheCleared ? '✓ Очищено' : 'Очистить'}
              </button>
            </div>
          </div>
        </div>
      )}

      <button onClick={handleSave} style={{ background: saved ? '#329063' : '#3d9970', color:'#000', border:'none', borderRadius:14, padding:'15px', fontSize:15, fontWeight:700, cursor:'pointer', textTransform:'uppercase', letterSpacing:0.5 }}>
        {saved ? '✓ Сохранено!' : 'Сохранить'}
      </button>
    </div>
  )
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, profile, signOut, aiCall, entries, saveEntry, saveProfile } = useStore()
  const [tab, setTab] = useState('home')
  const name = profile?.name || user?.user_metadata?.name || 'Спортсмен'
  useReminders()

  const [water, setWater] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('water-state-v2') || '{}')
      const todayKey = new Date().toISOString().split('T')[0]
      const weight = profile?.weight || 80
      const goalMl = Math.min(Math.max(Math.round(weight * 30 / 100) * 100, 1500), 4000)
      const waterGoal = Math.round(goalMl / 250)
      return { goal: saved.goal || waterGoal, consumed: saved.date === todayKey ? (saved.consumed || 0) : 0, date: todayKey }
    } catch { return { goal: 8, consumed: 0, date: new Date().toISOString().split('T')[0] } }
  })

  useEffect(() => { localStorage.setItem('water-state-v2', JSON.stringify(water)) }, [water])

  const state = { entries: entries || [], profile, water }
  const dispatch = (action) => {
    switch (action.type) {
      case 'SAVE_ENTRY': saveEntry(action.entry); break
      case 'SET_WATER':  setWater(w => ({ ...w, consumed: action.val })); break
    }
  }

  // Новый порядок: Главная → Питание → Тренировки → Прогресс → Профиль
  const tabs = [
    { id:'home',     label:'Главная',    Icon:NavHome },
    { id:'food',     label:'Питание',    Icon:NavFood },
    { id:'workout',  label:'Тренировки', Icon:NavWorkout },
    { id:'analysis', label:'Прогресс',   Icon:NavProgress },
    { id:'profile',  label:'Профиль',    Icon:NavUser },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {tab === 'home'     && <HomeScreen CalendarView={CombinedCalendar} state={state} dispatch={dispatch} goTo={setTab} name={name} aiCall={aiCall} />}
        {tab === 'food'     && <FoodScreen     state={state} dispatch={dispatch} aiCall={aiCall} />}
        {tab === 'analysis' && <ProgressScreen state={state} />}
        {tab === 'workout'  && <WorkoutScreen  state={state} dispatch={dispatch} aiCall={aiCall} PlanScreen={PlanScreen} />}
        {tab === 'profile'  && <ProfileScreen  profile={profile} saveProfile={saveProfile} signOut={signOut} aiCall={aiCall} />}
      </div>
      <div style={{ display:'flex', borderTop:'1px solid #1e1e1e', background:'#111', paddingBottom:'env(safe-area-inset-bottom, 0px)', flexShrink:0 }}>
        {tabs.map(({ id, label, Icon }) => {
          const isActive = tab === id
          return (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'10px 4px 8px', background:'transparent', border:'none', cursor:'pointer', position:'relative' }}>
              <Icon color={isActive ? '#3d9970' : '#4b5563'} size={22} />
              <span style={{ fontSize:9, color:isActive?'#3d9970':'#4b5563', fontWeight:isActive?700:400, letterSpacing:0.3 }}>{label}</span>
              {isActive && <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:20, height:2, background:'#3d9970', borderRadius:'0 0 2px 2px' }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
