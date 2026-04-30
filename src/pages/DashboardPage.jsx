import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store'
import { searchFood } from '../data/foodDatabase'
import { LogOut, Camera, Bell, ChevronRight, Plus, Check, X, ChevronLeft, Play, Pause, SkipForward, Flame, Droplets, Dumbbell, TrendingUp, Award } from 'lucide-react'
import styles from './DashboardPage.module.css'

// ─── NAV ICONS ───────────────────────────────────────────────────────────────
function NavHome({ color, size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={color} strokeWidth="2" fill={color === '#4ade80' ? 'rgba(74,222,128,0.15)' : 'none'} /><path d="M9 22v-7h6v7" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>
}
function NavWorkout({ color, size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="1" y="10" width="4" height="4" rx="2" fill={color} opacity="0.7" /><rect x="5" y="8" width="3" height="8" rx="1.5" fill={color} /><line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth="2.5" strokeLinecap="round" /><rect x="16" y="8" width="3" height="8" rx="1.5" fill={color} /><rect x="19" y="10" width="4" height="4" rx="2" fill={color} opacity="0.7" /></svg>
}
function NavProgress({ color, size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><polyline points="3,17 8,12 13,14 20,7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><polyline points="17,7 20,7 20,10" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>
}
function NavFood({ color, size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M3 11h18M3 11a9 9 0 0118 0M3 11v2a9 9 0 0018 0v-2M12 3v2M8 6l1 2M16 6l-1 2" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>
}
function NavUser({ color, size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmtTime(s) {
  const m = Math.floor(s / 60), sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
function fmtTimeLong(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

function compressImage(file, maxSize = 1024, quality = 0.85) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = e => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize }
          else { w = Math.round(w * maxSize / h); h = maxSize }
        }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        res(canvas.toDataURL('image/jpeg', quality).split(',')[1])
      }
      img.onerror = rej; img.src = e.target.result
    }
    r.onerror = rej; r.readAsDataURL(file)
  })
}

// ─── CIRCULAR PROGRESS ───────────────────────────────────────────────────────
function CircularProgress({ value, max, size = 120, stroke = 10, color = '#4ade80', children }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(value / max, 1)
  const dash = pct * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#2a2a2a" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
          strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  )
}

// ─── SWIPE ROW ────────────────────────────────────────────────────────────────
function SwipeRow({ children, onDelete }) {
  const [offset, setOffset] = useState(0)
  const startX = useRef(null)
  const dragging = useRef(false)
  const ACTION_W = 80
  const onTouchStart = e => { startX.current = e.touches[0].clientX; dragging.current = true }
  const onTouchMove = e => {
    if (!dragging.current) return
    const dx = e.touches[0].clientX - startX.current
    if (dx < 0) setOffset(Math.max(dx, -ACTION_W))
    else if (offset < 0) setOffset(Math.min(0, offset + dx))
  }
  const onTouchEnd = () => { dragging.current = false; setOffset(o => Math.abs(o) > ACTION_W / 2 ? -ACTION_W : 0) }
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: ACTION_W, background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 0 }}>
        <button onClick={() => { onDelete(); setOffset(0) }} style={{ width: '100%', height: '100%', background: 'none', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none"><polyline points="3,6 5,6 21,6" stroke="#fff" strokeWidth="2" strokeLinecap="round" /><path d="M19 6l-1 14H6L5 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
          Удалить
        </button>
      </div>
      <div style={{ transform: `translateX(${offset}px)`, transition: dragging.current ? 'none' : 'transform 0.22s ease', position: 'relative', zIndex: 1 }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        {children}
      </div>
    </div>
  )
}

// ─── HOME SCREEN ─────────────────────────────────────────────────────────────
function HomeScreen({ state, dispatch, goTo, aiCall, name }) {
  const today = new Date().toISOString().split('T')[0]
  const entry = state.entries.find(e => e.date === today) || { date: today, foods: [], workouts: [] }
  const goals = { calories: state.profile?.calorieGoal || 2200, protein: state.profile?.proteinGoal || 150, fat: state.profile?.fatGoal || 70, carbs: state.profile?.carbGoal || 250 }
  const totals = entry.foods.reduce((a, f) => ({ calories: a.calories + (f.calories||0), protein: a.protein + (f.protein||0), fat: a.fat + (f.fat||0), carbs: a.carbs + (f.carbs||0) }), { calories: 0, protein: 0, fat: 0, carbs: 0 })
  const eaten = Math.round(totals.calories)
  const remaining = Math.max(0, goals.calories - eaten)
  const water = state.water
  const dayName = new Date().toLocaleDateString('ru-RU', { weekday: 'long' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 4 }}>
        <div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>Сегодня · {dayName}</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Привет, {name.split(' ')[0]} 👋</div>
        </div>
        <button style={{ width: 40, height: 40, borderRadius: 12, background: '#1a1a1a', border: '1px solid #2e2e2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={18} color="#9ca3af" />
        </button>
      </div>

      {entry.workouts?.length > 0 ? (
        <div style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #222 100%)', borderRadius: 20, padding: 20, border: '1px solid #2e2e2e', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, background: 'radial-gradient(circle, rgba(74,222,128,0.08) 0%, transparent 70%)' }} />
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Последняя тренировка</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{entry.workouts[entry.workouts.length-1]?.name || 'Тренировка'}</div>
          <div style={{ fontSize: 13, color: '#9ca3af' }}>{entry.workouts[entry.workouts.length-1]?.exercises?.length || 0} упражнений · {entry.workouts[entry.workouts.length-1]?.duration || 0} мин</div>
        </div>
      ) : (
        <div style={{ background: 'linear-gradient(135deg, #1a2a1a 0%, #1a1a1a 100%)', borderRadius: 20, padding: 20, border: '1px solid #2e3a2e' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Сегодня</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#4ade80' }}>Начни тренировку</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>Нет активных тренировок на сегодня</div>
          <button onClick={() => goTo('workout')} style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: 12, padding: '12px 20px', fontSize: 13, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', cursor: 'pointer' }}>
            Начать тренировку
          </button>
        </div>
      )}

      <div style={{ background: '#1a1a1a', borderRadius: 20, padding: 20, border: '1px solid #2e2e2e' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Калории</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Цель: {goals.calories} ккал</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <CircularProgress value={eaten} max={goals.calories} size={100} stroke={8} color="#4ade80">
            <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: '#4ade80' }}>{eaten}</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>ккал</div>
          </CircularProgress>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div style={{ fontSize: 11, color: '#6b7280' }}>Съедено</div><div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 600 }}>{eaten}</div></div>
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: '#6b7280' }}>Осталось</div><div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 600, color: '#4ade80' }}>{remaining}</div></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[{ l: 'Белки', v: totals.protein, max: goals.protein, c: '#4ade80' }, { l: 'Жиры', v: totals.fat, max: goals.fat, c: '#fbbf24' }, { l: 'Углев.', v: totals.carbs, max: goals.carbs, c: '#38bdf8' }].map(m => (
                <div key={m.l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 11, color: '#6b7280', width: 40 }}>{m.l}</div>
                  <div style={{ flex: 1, height: 4, background: '#2a2a2a', borderRadius: 99 }}>
                    <div style={{ height: '100%', background: m.c, borderRadius: 99, width: `${Math.min(m.v / m.max * 100, 100)}%`, transition: 'width 0.6s' }} />
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: m.c, width: 32, textAlign: 'right' }}>{Math.round(m.v)}г</div>
                </div>
              ))}
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
              style={{ width: 36, height: 36, borderRadius: 10, border: `2px solid ${i < water.consumed ? '#38bdf8' : '#2e2e2e'}`, background: i < water.consumed ? 'rgba(56,189,248,0.15)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
              <Droplets size={14} color={i < water.consumed ? '#38bdf8' : '#4b5563'} />
            </button>
          ))}
        </div>
        <div style={{ height: 3, background: '#2a2a2a', borderRadius: 99 }}>
          <div style={{ height: '100%', background: '#38bdf8', borderRadius: 99, width: `${water.consumed / water.goal * 100}%`, transition: 'width 0.4s' }} />
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: '#6b7280' }}>{water.consumed * 250} мл из {water.goal * 250} мл</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <button onClick={() => goTo('food')} style={{ background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Flame size={18} color="#4ade80" />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Питание</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Добавить приём</div>
        </button>
        <button onClick={() => goTo('workout')} style={{ background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Dumbbell size={18} color="#4ade80" />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Тренировка</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Новая сессия</div>
        </button>
      </div>

      {entry.foods.length > 0 && (
        <div style={{ background: '#1a1a1a', borderRadius: 20, padding: 20, border: '1px solid #2e2e2e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Последние приёмы</div>
            <button onClick={() => goTo('food')} style={{ fontSize: 13, color: '#4ade80', background: 'none', border: 'none', cursor: 'pointer' }}>Все →</button>
          </div>
          {entry.foods.slice(-3).reverse().map(f => (
            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #2a2a2a' }}>
              <div>
                <div style={{ fontSize: 14 }}>{f.name}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{f.weight || 0}г · Б{Math.round(f.protein||0)} Ж{Math.round(f.fat||0)} У{Math.round(f.carbs||0)}</div>
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: '#4ade80' }}>{Math.round(f.calories||0)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── FOOD SCREEN ─────────────────────────────────────────────────────────────
const MEALS_MAP = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' }
const MEAL_ICONS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' }
const MEAL_TIMES = { breakfast: '08:00', lunch: '13:00', dinner: '19:00', snack: '16:00' }

function FoodScreen({ state, dispatch, aiCall }) {
  const [tab, setTab] = useState('log')
  const [meal, setMeal] = useState('breakfast')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedFood, setSelectedFood] = useState(null)
  const [grams, setGrams] = useState('100')
  const [manualMode, setManualMode] = useState(false)
  const [manual, setManual] = useState({ name: '', cal: '', p: '', f: '', c: '', grams: '100' })
  const [aiText, setAiText] = useState('')
  const [aiResults, setAiResults] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const today = new Date().toISOString().split('T')[0]
  const entry = state.entries.find(e => e.date === today) || { date: today, foods: [], workouts: [] }
  const totals = entry.foods.reduce((a, f) => ({ cal: a.cal + (f.calories||0), p: a.p + (f.protein||0), fat: a.fat + (f.fat||0), c: a.c + (f.carbs||0) }), { cal: 0, p: 0, fat: 0, c: 0 })

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2000) }

  const handleSearch = q => {
    setQuery(q); setSelectedFood(null)
    if (q.length > 1) setResults(searchFood(q).slice(0, 8))
    else setResults([])
  }

  const addFoodItem = (food, g, mealKey) => {
    const w = parseFloat(g) || 100
    dispatch({ type: 'SAVE_ENTRY', entry: { ...entry, foods: [...entry.foods, { id: Date.now(), name: food.name, weight: w, meal: mealKey || meal, calories: (food.cal100||0)*w/100, protein: (food.prot100||0)*w/100, fat: (food.fat100||0)*w/100, carbs: (food.carbs100||0)*w/100, time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) }] } })
    showToast(food.name + ' добавлено')
    setSelectedFood(null); setQuery(''); setResults([]); setGrams('100'); setTab('log')
  }

  const addManual = () => {
    if (!manual.name || !manual.cal) return
    const g = parseFloat(manual.grams) || 100
    dispatch({ type: 'SAVE_ENTRY', entry: { ...entry, foods: [...entry.foods, { id: Date.now(), name: manual.name, weight: g, meal, calories: parseFloat(manual.cal)*g/100, protein: parseFloat(manual.p||0)*g/100, fat: parseFloat(manual.f||0)*g/100, carbs: parseFloat(manual.c||0)*g/100, time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) }] } })
    showToast(manual.name + ' добавлено')
    setManual({ name: '', cal: '', p: '', f: '', c: '', grams: '100' }); setTab('log')
  }

  const removeFood = id => dispatch({ type: 'SAVE_ENTRY', entry: { ...entry, foods: entry.foods.filter(f => f.id !== id) } })

  const handleScan = async file => {
    setScanLoading(true)
    try {
      const b64 = await compressImage(file)
      const res = await fetch('https://fit-ai-tracker-production.up.railway.app/ai-vision', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ b64 }) })
      const d = await res.json()
      if (d.name) { setSelectedFood({ name: d.name, cal100: d.calories||0, prot100: d.protein||0, fat100: d.fat||0, carbs100: d.carbs||0 }); setQuery(d.name) }
    } catch { alert('Не удалось прочитать') } finally { setScanLoading(false) }
  }

  const runAI = async () => {
    if (!aiText.trim()) return
    setAiLoading(true); setAiResults(null)
    try {
      const prompt = `Ты диетолог. Верни ТОЛЬКО JSON-массив без markdown. ВАЖНО: все поля числа. Формат: [{"name":"Название","cal100":число,"prot100":число,"fat100":число,"carbs100":число,"grams":число}]. Еда: "${aiText}"`
      const reply = await aiCall([{ role: 'user', content: prompt }], 700)
      const match = reply.replace(/```json|```/g, '').trim().match(/\[[\s\S]*\]/)
      if (match) setAiResults(JSON.parse(match[0]).map(item => ({ food: { name: item.name, cal100: parseFloat(item.cal100)||0, prot100: parseFloat(item.prot100)||0, fat100: parseFloat(item.fat100)||0, carbs100: parseFloat(item.carbs100)||0 }, grams: parseFloat(item.grams)||100 })))
      else setAiResults([])
    } catch { setAiResults([]) }
    setAiLoading(false)
  }

  const inp = { width: '100%', padding: '13px 16px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 12, color: '#f5f5f5', fontSize: 15, outline: 'none', boxSizing: 'border-box' }
  const goals = { calories: state.profile?.calorieGoal || 2200 }

  return (
    <div>
      {toast && <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: '#4ade80', color: '#000', padding: '10px 22px', borderRadius: 50, fontSize: 13, fontWeight: 700, zIndex: 999, whiteSpace: 'nowrap' }}>{toast}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>Питание</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Сегодня</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={{ fontSize: 20, background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>‹</button>
          <button style={{ fontSize: 20, background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>›</button>
        </div>
      </div>

      <div style={{ background: '#1a1a1a', borderRadius: 20, padding: 20, border: '1px solid #2e2e2e', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <CircularProgress value={totals.cal} max={goals.calories} size={90} stroke={7} color="#4ade80">
            <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: '#4ade80' }}>{Math.round(totals.cal)}</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>ккал</div>
          </CircularProgress>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div><div style={{ fontSize: 11, color: '#6b7280' }}>Съедено</div><div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700 }}>{Math.round(totals.cal)}</div></div>
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: '#6b7280' }}>Осталось</div><div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: '#4ade80' }}>{Math.max(0, goals.calories - Math.round(totals.cal))}</div></div>
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>Цель: {goals.calories} ккал</div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[{ l: 'Белки', v: totals.p, c: '#4ade80' }, { l: 'Жиры', v: totals.fat, c: '#fbbf24' }, { l: 'Углев.', v: totals.c, c: '#38bdf8' }].map(m => (
                <div key={m.l} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: m.c }}>{Math.round(m.v)}г</div>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>{m.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: 12, padding: 4, gap: 4, marginBottom: 16, border: '1px solid #2e2e2e' }}>
        {[['log', 'Дневник'], ['add', 'Добавить'], ['ai', '✦ AI']].map(([k, v]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: tab === k ? '#4ade80' : 'transparent', color: tab === k ? '#000' : '#6b7280', transition: 'all 0.15s' }}>{v}</button>
        ))}
      </div>

      {tab === 'log' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {entry.foods.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🍽️</div>
              <div>Ничего не добавлено</div>
            </div>
          )}
          {Object.entries(MEALS_MAP).map(([mealKey, mealName]) => {
            const items = entry.foods.filter(f => f.meal === mealKey)
            if (!items.length) return null
            const mCal = items.reduce((a, f) => a + (f.calories||0), 0)
            return (
              <div key={mealKey} style={{ background: '#1a1a1a', borderRadius: 16, overflow: 'hidden', border: '1px solid #2e2e2e' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #2a2a2a' }}>
                  <span style={{ fontSize: 18 }}>{MEAL_ICONS[mealKey]}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{mealName}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{MEAL_TIMES[mealKey]}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: '#4ade80', fontWeight: 600 }}>{Math.round(mCal)} ккал</div>
                  <ChevronRight size={16} color="#4b5563" />
                </div>
                {items.map(item => (
                  <SwipeRow key={item.id} onDelete={() => removeFood(item.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#1a1a1a', borderBottom: '1px solid #222' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14 }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, fontFamily: 'var(--mono)' }}>{item.weight}г · <span style={{ color: '#4ade80' }}>Б{Math.round(item.protein||0)}</span> <span style={{ color: '#fbbf24' }}>Ж{Math.round(item.fat||0)}</span> <span style={{ color: '#38bdf8' }}>У{Math.round(item.carbs||0)}</span></div>
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600 }}>{Math.round(item.calories||0)}</div>
                    </div>
                  </SwipeRow>
                ))}
              </div>
            )
          })}
          <button onClick={() => setTab('add')} style={{ background: '#1a1a1a', border: '2px dashed #2e2e2e', borderRadius: 16, padding: '16px', color: '#4ade80', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Plus size={18} /> Добавить приём пищи
          </button>
        </div>
      )}

      {tab === 'add' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
            {Object.entries(MEALS_MAP).map(([k, v]) => (
              <button key={k} onClick={() => setMeal(k)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: `1px solid ${meal === k ? '#4ade80' : '#2e2e2e'}`, background: meal === k ? 'rgba(74,222,128,0.1)' : '#1a1a1a', color: meal === k ? '#4ade80' : '#9ca3af', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 500 }}>
                <span>{MEAL_ICONS[k]}</span>{v}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: 12, padding: 3, gap: 3, border: '1px solid #2e2e2e' }}>
            {[['search', 'Поиск'], ['manual', 'Вручную']].map(([k, v]) => (
              <button key={k} onClick={() => setManualMode(k === 'manual')} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, background: (k === 'manual' ? manualMode : !manualMode) ? '#2a2a2a' : 'transparent', color: (k === 'manual' ? manualMode : !manualMode) ? '#f5f5f5' : '#6b7280' }}>{v}</button>
            ))}
          </div>
          {!manualMode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...inp, flex: 1 }} placeholder="Найти продукт..." value={query} onChange={e => handleSearch(e.target.value)} autoFocus />
                <label style={{ width: 46, height: 46, background: '#222', border: '1px solid #2e2e2e', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  {scanLoading ? '⏳' : <Camera size={18} color="#9ca3af" />}
                  <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleScan(e.target.files[0])} />
                </label>
              </div>
              {results.length > 0 && !selectedFood && (
                <div style={{ background: '#1a1a1a', borderRadius: 12, overflow: 'hidden', border: '1px solid #2e2e2e' }}>
                  {results.map((food, i) => (
                    <button key={i} onClick={() => { setSelectedFood(food); setResults([]) }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: i < results.length-1 ? '1px solid #222' : 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                      <div>
                        <div style={{ fontSize: 14, color: '#f5f5f5' }}>{food.name}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)' }}>{food.cal100} ккал/100г</div>
                      </div>
                      <ChevronRight size={16} color="#4b5563" />
                    </button>
                  ))}
                </div>
              )}
              {selectedFood && (
                <div style={{ background: '#1a1a1a', border: '1px solid #4ade80', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#4ade80' }}>{selectedFood.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)' }}>Б{selectedFood.prot100} Ж{selectedFood.fat100} У{selectedFood.carbs100} /100г</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>Порция:</span>
                    <input style={{ ...inp, width: 80, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 16 }} type="number" value={grams} onChange={e => setGrams(e.target.value)} />
                    <span style={{ color: '#6b7280', fontSize: 13 }}>г</span>
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#9ca3af' }}>
                    {Math.round((selectedFood.cal100||0)*(parseFloat(grams)||100)/100)} ккал · Б{Math.round((selectedFood.prot100||0)*(parseFloat(grams)||100)/100)}г
                  </div>
                  <button onClick={() => addFoodItem(selectedFood, grams)} style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 }}>Добавить</button>
                </div>
              )}
            </div>
          )}
          {manualMode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['Название', 'name', 'text', 'Борщ домашний'], ['Порция (г)', 'grams', 'number', '100'], ['Ккал/100г', 'cal', 'number', '200'], ['Белки/100г', 'p', 'number', '0'], ['Жиры/100г', 'f', 'number', '0'], ['Углев/100г', 'c', 'number', '0']].map(([label, key, type, ph]) => (
                <div key={key}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                  <input style={inp} type={type} placeholder={ph} value={manual[key]} onChange={e => setManual({ ...manual, [key]: e.target.value })} />
                </div>
              ))}
              <button onClick={addManual} disabled={!manual.name || !manual.cal} style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: !manual.name || !manual.cal ? 0.4 : 1, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>Добавить продукт</button>
            </div>
          )}
        </div>
      )}

      {tab === 'ai' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 18, border: '1px solid #2e2e2e' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 20, color: '#4ade80' }}>✦</span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>AI-распознавание еды</span>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Опиши что съел — AI определит КБЖУ</p>
            <textarea style={{ ...inp, resize: 'none', minHeight: 80, lineHeight: 1.5 }} placeholder="«200г куриной грудки с гречкой»" value={aiText} onChange={e => setAiText(e.target.value)} rows={3} />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '10px 0' }}>
              {Object.entries(MEALS_MAP).map(([k, v]) => (
                <button key={k} onClick={() => setMeal(k)} style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${meal === k ? '#4ade80' : '#2e2e2e'}`, background: meal === k ? 'rgba(74,222,128,0.1)' : 'transparent', color: meal === k ? '#4ade80' : '#6b7280', fontSize: 12, cursor: 'pointer' }}>{v}</button>
              ))}
            </div>
            <button onClick={runAI} disabled={!aiText.trim() || aiLoading} style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%', opacity: !aiText.trim() || aiLoading ? 0.5 : 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {aiLoading ? '⏳ Анализирую...' : '✦ Распознать'}
            </button>
          </div>
          {aiResults !== null && !aiLoading && (
            <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 16, border: '1px solid #2e2e2e', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {aiResults.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: 14, textAlign: 'center' }}>Не удалось распознать</p>
              ) : (
                <>
                  {aiResults.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: '#222', borderRadius: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{item.food.name}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)', marginTop: 2 }}>{item.grams}г · {Math.round((item.food.cal100||0)*item.grams/100)} ккал</div>
                      </div>
                      <button onClick={() => addFoodItem(item.food, item.grams)} style={{ padding: '8px 14px', borderRadius: 8, background: '#4ade80', border: 'none', color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+</button>
                    </div>
                  ))}
                  <button style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}
                    onClick={() => { aiResults.forEach(item => addFoodItem(item.food, item.grams)); setAiText(''); setAiResults(null); setTab('log') }}>
                    Добавить всё
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── PROGRESS SCREEN ─────────────────────────────────────────────────────────
function ProgressScreen({ state }) {
  const [period, setPeriod] = useState('Месяц')
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
  const weekData = weekDays.map((day, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const e = state.entries.find(en => en.date === d.toISOString().split('T')[0]) || { foods: [] }
    return { day, cal: e.foods.reduce((a, f) => a + (f.calories||0), 0) }
  })
  weekData.push({ day: 'Сг', cal: (state.entries.find(e => e.date === new Date().toISOString().split('T')[0])?.foods || []).reduce((a, f) => a + (f.calories||0), 0), isToday: true })
  const maxCal = Math.max(...weekData.map(d => d.cal), 2200, 1)
  const totalWorkouts = state.entries.reduce((a, e) => a + (e.workouts?.length || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Статистика</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Прогресс</div>
      </div>
      <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: 12, padding: 4, gap: 4, border: '1px solid #2e2e2e' }}>
        {['Неделя', 'Месяц', '3 месяца', 'Год'].map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: period === p ? '#4ade80' : 'transparent', color: period === p ? '#000' : '#6b7280' }}>{p}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { icon: '🏋️', label: 'Тренировок', value: totalWorkouts },
          { icon: '🔥', label: 'Калорий сж.', value: state.entries.reduce((a, e) => a + (e.workouts||[]).reduce((b, w) => b + (w.caloriesBurned||0), 0), 0) },
          { icon: '📅', label: 'Дней подряд', value: 0 },
        ].map(s => (
          <div key={s.label} style={{ background: '#1a1a1a', borderRadius: 16, padding: 16, border: '1px solid #2e2e2e', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: '#4ade80', marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#1a1a1a', borderRadius: 20, padding: 20, border: '1px solid #2e2e2e' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Калории за неделю</div>
          <div style={{ fontSize: 11, padding: '4px 10px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 50, color: '#4ade80' }}>Цель 2200</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 120 }}>
          {weekData.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ width: '100%', position: 'relative', flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ position: 'absolute', bottom: `${(2200/maxCal)*100}%`, left: '-2px', right: '-2px', height: 1, borderTop: '1px dashed rgba(74,222,128,0.3)' }} />
                <div style={{ width: '100%', borderRadius: '6px 6px 0 0', height: `${Math.max((d.cal/maxCal)*100, 2)}%`, background: d.isToday ? '#4ade80' : 'rgba(74,222,128,0.25)', transition: 'height 0.6s' }} />
              </div>
              <div style={{ fontSize: 11, color: d.isToday ? '#4ade80' : '#6b7280', fontWeight: d.isToday ? 700 : 400 }}>{d.day}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: '#1a1a1a', borderRadius: 20, padding: 20, border: '1px solid #2e2e2e' }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>История тренировок</div>
        {state.entries.flatMap(e => (e.workouts||[]).map(w => ({ ...w, entryDate: e.date }))).sort((a,b) => b.entryDate.localeCompare(a.entryDate)).slice(0, 5).map((w, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #222' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{w.name || w.type}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{w.entryDate} · {w.duration} мин</div>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: '#4ade80' }}>{w.caloriesBurned} ккал</div>
          </div>
        ))}
        {state.entries.flatMap(e => e.workouts||[]).length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#6b7280', fontSize: 14 }}>Тренировок пока нет</div>
        )}
      </div>
      <div style={{ background: '#1a1a1a', borderRadius: 20, padding: 20, border: '1px solid #2e2e2e' }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Тренды</div>
        {[{ l: 'Силовые показатели', v: '+12%', c: '#4ade80' }, { l: 'Объём тренировок', v: '+8%', c: '#4ade80' }, { l: 'Среднее КБЖУ', v: '±5%', c: '#fbbf24' }].map(t => (
          <div key={t.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #222' }}>
            <div style={{ fontSize: 14 }}>{t.l}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 700, color: t.c }}>{t.v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── REST TIMER ───────────────────────────────────────────────────────────────
function RestTimer({ duration = 90, onClose, exerciseName, setInfo }) {
  const [remaining, setRemaining] = useState(duration)
  const [running, setRunning] = useState(true)
  const ref = useRef(null)
  useEffect(() => {
    if (running && remaining > 0) {
      ref.current = setInterval(() => setRemaining(r => r - 1), 1000)
    } else { clearInterval(ref.current) }
    return () => clearInterval(ref.current)
  }, [running, remaining])
  const pct = remaining / duration
  const r = 80, circ = 2 * Math.PI * r
  const dash = pct * circ
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: '#0e0e0e', zIndex: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#9ca3af' }}>Таймер отдыха</div>
      <div style={{ position: 'relative', width: 200, height: 200 }}>
        <svg width={200} height={200} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={100} cy={100} r={r} fill="none" stroke="#2a2a2a" strokeWidth={8} />
          <circle cx={100} cy={100} r={r} fill="none" stroke="#4ade80" strokeWidth={8} strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`} style={{ transition: 'stroke-dasharray 0.5s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 48, fontWeight: 700, color: remaining > 0 ? '#f5f5f5' : '#4ade80' }}>
            {String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>из {String(Math.floor(duration/60)).padStart(2,'0')}:{String(duration%60).padStart(2,'0')}</div>
        </div>
      </div>
      {exerciseName && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{exerciseName}</div>
          {setInfo && <div style={{ fontSize: 13, color: '#6b7280' }}>{setInfo}</div>}
        </div>
      )}
      <button onClick={onClose} style={{ background: '#222', color: '#f5f5f5', border: '1px solid #2e2e2e', borderRadius: 14, padding: '14px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer', letterSpacing: 0.5, textTransform: 'uppercase' }}>
        Пропустить отдых
      </button>
    </div>, document.body
  )
}

// ─── WORKOUT COMPLETE ─────────────────────────────────────────────────────────
function WorkoutComplete({ workout, duration, onSave }) {
  const [feeling, setFeeling] = useState(null)
  const [hadPain, setHadPain] = useState(null)
  const [comment, setComment] = useState('')
  const totalSets = workout.exercises.reduce((a, e) => a + e.sets.length, 0)
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: '#0e0e0e', zIndex: 500, overflow: 'auto', padding: '24px 20px 40px' }}>
      <div style={{ textAlign: 'center', padding: '30px 0 20px' }}>
        <div style={{ position: 'relative', height: 60, marginBottom: 10 }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} style={{ position: 'absolute', left: `${5 + Math.random()*90}%`, top: `${Math.random()*60}px`, width: 6, height: 6, borderRadius: '50%', background: ['#4ade80','#fbbf24','#38bdf8','#f87171','#a78bfa'][i%5], animation: `confetti ${0.8 + Math.random()}s ease ${i*0.05}s both` }} />
          ))}
        </div>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 30px rgba(74,222,128,0.4)' }}>
          <Check size={32} color="#000" />
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Тренировка завершена!</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
        {[{ l: 'Время', v: fmtTimeLong(duration) }, { l: 'Упражнений', v: workout.exercises.length }, { l: 'Подходов', v: totalSets }].map(s => (
          <div key={s.l} style={{ background: '#1a1a1a', borderRadius: 16, padding: 14, border: '1px solid #2e2e2e', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: '#4ade80', marginBottom: 4 }}>{s.v}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#1a1a1a', borderRadius: 20, padding: 20, border: '1px solid #2e2e2e', marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Как прошла тренировка?</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {[['😊', 'Легко'], ['😐', 'Нормально'], ['😤', 'Тяжело'], ['🥵', 'Очень тяжело']].map(([emoji, label]) => (
            <button key={label} onClick={() => setFeeling(label)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px', borderRadius: 12, border: `1px solid ${feeling === label ? '#4ade80' : '#2e2e2e'}`, background: feeling === label ? 'rgba(74,222,128,0.1)' : '#222', cursor: 'pointer' }}>
              <span style={{ fontSize: 24 }}>{emoji}</span>
              <span style={{ fontSize: 10, color: feeling === label ? '#4ade80' : '#6b7280', whiteSpace: 'nowrap' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{ background: '#1a1a1a', borderRadius: 20, padding: 20, border: '1px solid #2e2e2e', marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Была боль?</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {['Да', 'Нет'].map(v => (
            <button key={v} onClick={() => setHadPain(v === 'Да')}
              style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1px solid ${hadPain === (v==='Да') ? '#4ade80' : '#2e2e2e'}`, background: hadPain === (v==='Да') ? 'rgba(74,222,128,0.1)' : '#222', color: hadPain === (v==='Да') ? '#4ade80' : '#9ca3af', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{v}</button>
          ))}
        </div>
      </div>
      <div style={{ background: '#1a1a1a', borderRadius: 20, padding: 20, border: '1px solid #2e2e2e', marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Комментарий (необязательно)</div>
        <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Как всё прошло?" rows={3}
          style={{ width: '100%', background: '#222', border: '1px solid #2e2e2e', borderRadius: 10, padding: '12px', color: '#f5f5f5', fontSize: 14, resize: 'none', outline: 'none' }} />
      </div>
      <button onClick={() => onSave({ feeling, hadPain, comment })}
        style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: 14, padding: '16px', fontSize: 15, fontWeight: 700, width: '100%', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>
        Сохранить
      </button>
    </div>, document.body
  )
}

// ─── EXERCISE DB ─────────────────────────────────────────────────────────────
const EXERCISE_DB = [
  { id:1,  name:'Жим штанги лёжа',           muscle:'Грудь',    type:'compound' },
  { id:2,  name:'Жим гантелей лёжа',          muscle:'Грудь',    type:'compound' },
  { id:3,  name:'Жим штанги на наклонной',    muscle:'Грудь',    type:'compound' },
  { id:4,  name:'Разводка гантелей лёжа',     muscle:'Грудь',    type:'isolation' },
  { id:5,  name:'Кроссовер в блоке',          muscle:'Грудь',    type:'isolation' },
  { id:6,  name:'Отжимания от пола',          muscle:'Грудь',    type:'compound' },
  { id:7,  name:'Отжимания на брусьях',       muscle:'Грудь',    type:'compound' },
  { id:8,  name:'Тяга верхнего блока',        muscle:'Спина',    type:'compound' },
  { id:9,  name:'Тяга горизонтального блока', muscle:'Спина',    type:'compound' },
  { id:10, name:'Тяга штанги в наклоне',      muscle:'Спина',    type:'compound' },
  { id:11, name:'Тяга гантели одной рукой',   muscle:'Спина',    type:'compound' },
  { id:12, name:'Подтягивания',               muscle:'Спина',    type:'compound' },
  { id:13, name:'Гиперэкстензия',             muscle:'Спина',    type:'isolation' },
  { id:14, name:'Приседания со штангой',      muscle:'Ноги',     type:'compound' },
  { id:15, name:'Жим ногами в тренажёре',     muscle:'Ноги',     type:'compound' },
  { id:16, name:'Разгибание ног',             muscle:'Ноги',     type:'isolation' },
  { id:17, name:'Сгибание ног',               muscle:'Ноги',     type:'isolation' },
  { id:18, name:'Выпады с гантелями',         muscle:'Ноги',     type:'compound' },
  { id:19, name:'Румынская тяга',             muscle:'Ноги',     type:'compound' },
  { id:20, name:'Подъём на икры стоя',        muscle:'Ноги',     type:'isolation' },
  { id:21, name:'Жим гантелей сидя',          muscle:'Плечи',    type:'compound' },
  { id:22, name:'Жим штанги сидя',            muscle:'Плечи',    type:'compound' },
  { id:23, name:'Махи гантелями в стороны',   muscle:'Плечи',    type:'isolation' },
  { id:24, name:'Тяга к подбородку',          muscle:'Плечи',    type:'compound' },
  { id:25, name:'Разгибания на блоке',        muscle:'Трицепс',  type:'isolation' },
  { id:26, name:'Французский жим лёжа',       muscle:'Трицепс',  type:'isolation' },
  { id:27, name:'Жим узким хватом',           muscle:'Трицепс',  type:'compound' },
  { id:28, name:'Подъём штанги на бицепс',    muscle:'Бицепс',   type:'isolation' },
  { id:29, name:'Подъём гантелей на бицепс',  muscle:'Бицепс',   type:'isolation' },
  { id:30, name:'Молотки с гантелями',        muscle:'Бицепс',   type:'isolation' },
  { id:31, name:'Планка',                     muscle:'Кор',      type:'isolation' },
  { id:32, name:'Скручивания',                muscle:'Кор',      type:'isolation' },
  { id:33, name:'Подъём ног лёжа',            muscle:'Кор',      type:'isolation' },
  { id:34, name:'Бег',                        muscle:'Кардио',   type:'cardio' },
  { id:35, name:'Прыжки со скакалкой',        muscle:'Кардио',   type:'cardio' },
]

// ─── PLAN CONSTANTS ───────────────────────────────────────────────────────────
const PLAN_KEY = 'workout-plan-v4-pro'
const LEVEL_RU = { beginner: 'новичок', amateur: 'любитель', advanced: 'продвинутый', professional: 'профессионал' }
const GOAL_RU  = { weight_loss: 'fat_loss', muscle_gain: 'muscle_gain', maintenance: 'maintenance', endurance: 'maintenance', strength: 'strength', health: 'maintenance' }
const DAY_COLORS_PLAN = ['#4ade80', '#38bdf8', '#fbbf24', '#4ade80', '#38bdf8', '#6b7280', '#6b7280']

// ─── EN→RU перевод ────────────────────────────────────────────────────────────
const EN_TO_RU = {
  'Monday':'Понедельник','Tuesday':'Вторник','Wednesday':'Среда','Thursday':'Четверг',
  'Friday':'Пятница','Saturday':'Суббота','Sunday':'Воскресенье',
  'Rest':'Отдых','Rest Day':'День отдыха','Recovery':'Восстановление',
  'chest':'Грудь','back':'Спина','legs':'Ноги','shoulders':'Плечи',
  'triceps':'Трицепс','biceps':'Бицепс','core':'Кор','abs':'Пресс',
  'cardio':'Кардио','glutes':'Ягодицы','hamstrings':'Бицепс бедра',
  'quadriceps':'Квадрицепс','calves':'Икры','arms':'Руки',
  'full body':'Всё тело','full_body':'Фулбоди',
  'upper_lower':'Верх/Низ','push_pull_legs':'Жим/Тяга/Ноги',
  'push/pull/legs':'Жим/Тяга/Ноги','upper/lower':'Верх/Низ',
  'Bench Press':'Жим штанги лёжа','Pull Ups':'Подтягивания',
  'Overhead Press':'Жим штанги сидя','Squats':'Приседания со штангой',
  'Leg Press':'Жим ногами','Deadlift':'Становая тяга',
  'Bicep Curls':'Подъём на бицепс','Tricep Extensions':'Разгибания на блоке',
  'Lateral Raise':'Махи гантелями в стороны','Calf Raise':'Подъём на икры',
  'Lunges':'Выпады с гантелями','Romanian Deadlift':'Румынская тяга',
  'Plank':'Планка','Crunches':'Скручивания','Dips':'Отжимания на брусьях',
  'Hamstring Curl':'Сгибание ног','Leg Extension':'Разгибание ног',
  'Dumbbell Row':'Тяга гантели одной рукой','Barbell Row':'Тяга штанги в наклоне',
  'Lat Pulldown':'Тяга верхнего блока','Cable Row':'Тяга горизонтального блока',
  'Incline Bench Press':'Жим штанги на наклонной',
  'Dumbbell Flyes':'Разводка гантелей лёжа',
  'Cable Crossover':'Кроссовер в блоке',
  'Skull Crusher':'Французский жим лёжа',
  'Close Grip Bench Press':'Жим узким хватом',
  'Hammer Curl':'Молотки с гантелями',
  'Hyperextension':'Гиперэкстензия',
  'Leg Raise':'Подъём ног лёжа',
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
        }))
      }))
    }
  }
}

// ─── WORKOUT SCREEN ───────────────────────────────────────────────────────────
function WorkoutScreen({ state, dispatch, aiCall }) {
  const [view, setView] = useState('list')
  const [wk, setWk] = useState({ name: '', exercises: [] })
  const [exSearch, setExSearch] = useState('')
  const [timer, setTimer] = useState(0)
  const [running, setRunning] = useState(false)
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [restInfo, setRestInfo] = useState({ exercise: '', setInfo: '', duration: 90 })
  const [showComplete, setShowComplete] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (running) timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    else clearInterval(timerRef.current)
    return () => clearInterval(timerRef.current)
  }, [running])

  const today = new Date().toISOString().split('T')[0]
  const entry = state.entries.find(e => e.date === today) || { date: today, foods: [], workouts: [] }
  const allWorkouts = state.entries.flatMap(e => (e.workouts||[]).map(w => ({ ...w, entryDate: e.date }))).sort((a,b) => b.entryDate.localeCompare(a.entryDate))
  const filteredEx = EXERCISE_DB.filter(e => e.name.toLowerCase().includes(exSearch.toLowerCase()) || e.muscle.toLowerCase().includes(exSearch.toLowerCase()))

  const addEx = ex => setWk(w => ({ ...w, exercises: [...w.exercises, { exerciseId: ex.id, name: ex.name, muscle: ex.muscle, type: ex.type, sets: [{ reps: '10', weight: '0', done: false }] }] }))
  const updateSet = (eI, sI, field, val) => setWk(w => { const exs = [...w.exercises]; exs[eI] = { ...exs[eI], sets: exs[eI].sets.map((s,i) => i===sI ? {...s,[field]:val} : s) }; return {...w, exercises: exs} })
  const addSet = eI => setWk(w => { const exs = [...w.exercises]; const prev = exs[eI].sets[exs[eI].sets.length-1]; exs[eI] = { ...exs[eI], sets: [...exs[eI].sets, {...prev, done:false}] }; return {...w, exercises: exs} })
  const removeEx = eI => setWk(w => ({ ...w, exercises: w.exercises.filter((_,i) => i!==eI) }))
  const toggleSet = (eI, sI) => {
    const ex = wk.exercises[eI]
    const set = ex.sets[sI]
    if (!set.done) { setRestInfo({ exercise: ex.name, setInfo: `${sI+1} подход из ${ex.sets.length}`, duration: 90 }); setShowRestTimer(true) }
    setWk(w => { const exs = [...w.exercises]; exs[eI] = { ...exs[eI], sets: exs[eI].sets.map((s,i) => i===sI ? {...s,done:!s.done} : s) }; return {...w, exercises: exs} })
  }
  const completeWorkout = () => { setRunning(false); setShowComplete(true) }
  const saveWorkout = (feedback) => {
    const calBurned = Math.round(timer / 60 * 7.5)
    dispatch({ type: 'SAVE_ENTRY', entry: { ...entry, workouts: [...(entry.workouts||[]), { id: Date.now(), name: wk.name || 'Тренировка', type: wk.name || 'Тренировка', exercises: wk.exercises.map(e => e.name), duration: Math.round(timer/60), caloriesBurned: calBurned, date: new Date().toLocaleDateString('ru', {day:'numeric', month:'short'}), ...feedback }] } })
    setWk({ name: '', exercises: [] }); setTimer(0); setShowComplete(false); setView('list')
  }
  const removeWorkout = wId => dispatch({ type: 'SAVE_ENTRY', entry: { ...entry, workouts: (entry.workouts||[]).filter(w => w.id !== wId) } })

  const M_COLORS = { Грудь:'#22c55e', Спина:'#3b82f6', Ноги:'#f59e0b', Плечи:'#8b5cf6', Трицепс:'#ec4899', Бицепс:'#f97316', Кор:'#06b6d4', Кардио:'#ef4444' }

  // LIST
  if (view === 'list') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {showRestTimer && <RestTimer duration={restInfo.duration} exerciseName={restInfo.exercise} setInfo={restInfo.setInfo} onClose={() => setShowRestTimer(false)} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Тренировки</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>История</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button onClick={() => setView('builder')} style={{ background: '#4ade80', border: 'none', borderRadius: 16, padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer', textAlign: 'left' }}>
          <Plus size={22} color="#000" />
          <div style={{ fontSize: 14, fontWeight: 700, color: '#000' }}>Новая тренировка</div>
        </button>
        <button onClick={() => setView('plan')} style={{ background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: 16, padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ fontSize: 20, color: '#4ade80' }}>✦</span>
          <div style={{ fontSize: 14, fontWeight: 600 }}>AI-план</div>
        </button>
      </div>
      {allWorkouts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>💪</div>
          <div>Тренировок пока нет</div>
        </div>
      ) : allWorkouts.map(w => (
        <SwipeRow key={w.id} onDelete={() => removeWorkout(w.id)}>
          <div style={{ background: '#1a1a1a', borderRadius: 18, padding: 18, border: '1px solid #2e2e2e', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(74,222,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 22 }}>💪</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{w.name || w.type}</div>
              <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)' }}>{w.duration} мин · {w.date || w.entryDate}</div>
              {w.exercises?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {(Array.isArray(w.exercises) ? w.exercises : []).slice(0, 3).map((e, i) => (
                    <span key={i} style={{ padding: '2px 8px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 50, fontSize: 11, color: '#9ca3af' }}>{typeof e === 'string' ? e : e.name}</span>
                  ))}
                </div>
              )}
            </div>
            {w.caloriesBurned > 0 && (
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: '#4ade80' }}>{w.caloriesBurned}</div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>ккал</div>
              </div>
            )}
          </div>
        </SwipeRow>
      ))}
    </div>
  )

  // BUILDER
  if (view === 'builder') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {showRestTimer && <RestTimer duration={restInfo.duration} exerciseName={restInfo.exercise} setInfo={restInfo.setInfo} onClose={() => setShowRestTimer(false)} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => setView('list')} style={{ width: 36, height: 36, borderRadius: 10, background: '#1a1a1a', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={18} color="#9ca3af" />
        </button>
        <span style={{ fontSize: 18, fontWeight: 700 }}>Конструктор</span>
      </div>
      <input style={{ width: '100%', padding: '13px 16px', background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: 14, color: '#f5f5f5', fontSize: 15, fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}
        placeholder="Название тренировки" value={wk.name} onChange={e => setWk(w => ({...w, name: e.target.value}))} />
      <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 14, border: '1px solid #2e2e2e' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>База упражнений</div>
        <input style={{ width: '100%', padding: '11px 14px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 10, color: '#f5f5f5', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} placeholder="Поиск..." value={exSearch} onChange={e => setExSearch(e.target.value)} />
        <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filteredEx.map(ex => (
            <button key={ex.id} onClick={() => addEx(ex)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#222', border: '1px solid #2a2a2a', borderRadius: 10, cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ padding: '2px 8px', borderRadius: 50, fontSize: 11, color: '#000', background: M_COLORS[ex.muscle] || '#4ade80', flexShrink: 0, fontWeight: 600 }}>{ex.muscle}</span>
              <span style={{ fontSize: 13, color: '#f5f5f5', flex: 1 }}>{ex.name}</span>
              <Plus size={16} color="#4ade80" />
            </button>
          ))}
        </div>
      </div>
      {wk.exercises.map((ex, eI) => (
        <div key={eI} style={{ background: '#1a1a1a', borderRadius: 16, padding: 16, border: '1px solid #2e2e2e' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ padding: '3px 10px', borderRadius: 50, fontSize: 11, color: '#000', background: M_COLORS[ex.muscle] || '#4ade80', fontWeight: 600 }}>{ex.muscle}</span>
            <span style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{ex.name}</span>
            <button onClick={() => removeEx(eI)} style={{ width: 28, height: 28, borderRadius: 8, background: '#222', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 1fr', gap: 6, marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: '#6b7280', textAlign: 'center' }}>№</div>
            <div style={{ fontSize: 11, color: '#6b7280', textAlign: 'center' }}>Повторы</div>
            <div style={{ fontSize: 11, color: '#6b7280', textAlign: 'center' }}>Вес (кг)</div>
            {ex.sets.map((set, sI) => (
              <React.Fragment key={sI}>
                <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{sI+1}</div>
                <input style={{ padding: '8px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 8, color: '#f5f5f5', fontSize: 14, fontFamily: 'var(--mono)', outline: 'none', textAlign: 'center' }} value={set.reps} onChange={e => updateSet(eI, sI, 'reps', e.target.value)} placeholder="10" />
                <input style={{ padding: '8px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 8, color: '#f5f5f5', fontSize: 14, fontFamily: 'var(--mono)', outline: 'none', textAlign: 'center' }} value={set.weight} onChange={e => updateSet(eI, sI, 'weight', e.target.value)} placeholder="0" />
              </React.Fragment>
            ))}
          </div>
          <button onClick={() => addSet(eI)} style={{ padding: '8px', background: 'transparent', border: '1px dashed #2e2e2e', borderRadius: 8, color: '#6b7280', cursor: 'pointer', fontSize: 13, width: '100%' }}>+ Добавить подход</button>
        </div>
      ))}
      {wk.exercises.length > 0 && (
        <button onClick={() => { setTimer(0); setRunning(true); setView('active') }} style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: 14, padding: '15px', fontSize: 14, fontWeight: 700, width: '100%', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Начать тренировку
        </button>
      )}
    </div>
  )

  // ACTIVE
  if (view === 'active') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {showRestTimer && <RestTimer duration={restInfo.duration} exerciseName={restInfo.exercise} setInfo={restInfo.setInfo} onClose={() => setShowRestTimer(false)} />}
      {showComplete && <WorkoutComplete workout={wk} duration={timer} onSave={saveWorkout} />}
      <div style={{ background: '#1a1a1a', borderRadius: 20, padding: '20px 24px', border: '1px solid #2e2e2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 40, fontWeight: 700, color: '#4ade80', letterSpacing: '0.02em' }}>{fmtTimeLong(timer)}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Общее время</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{wk.name || 'Тренировка'}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{wk.exercises.length} упражнений</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setRunning(r => !r)} style={{ padding: '8px 14px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 10, color: '#f5f5f5', cursor: 'pointer', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
              {running ? <Pause size={14} /> : <Play size={14} />} {running ? 'Пауза' : 'Старт'}
            </button>
            <button onClick={completeWorkout} style={{ padding: '8px 14px', background: '#4ade80', border: 'none', borderRadius: 10, color: '#000', cursor: 'pointer', fontSize: 13, fontWeight: 700, textTransform: 'uppercase' }}>
              Завершить
            </button>
          </div>
        </div>
      </div>
      {wk.exercises.map((ex, eI) => (
        <div key={eI} style={{ background: '#1a1a1a', borderRadius: 18, overflow: 'hidden', border: '1px solid #2e2e2e' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #2a2a2a' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: '#4ade80', minWidth: 28 }}>{eI+1}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{ex.name}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{ex.sets.length} подходов</div>
            </div>
            <span style={{ padding: '3px 10px', borderRadius: 50, fontSize: 11, color: '#000', background: M_COLORS[ex.muscle] || '#4ade80', fontWeight: 600 }}>{ex.muscle}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid #222' }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Вес:</span>
            <button onClick={() => { const w = parseFloat(ex.sets[0]?.weight||0); ex.sets.forEach((_, sI) => updateSet(eI, sI, 'weight', Math.max(0, w-2.5).toString())); }} style={{ width: 28, height: 28, borderRadius: 8, background: '#222', border: '1px solid #2e2e2e', color: '#f5f5f5', cursor: 'pointer', fontSize: 16 }}>−</button>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, minWidth: 60, textAlign: 'center' }}>{ex.sets[0]?.weight || 0} кг</span>
            <button onClick={() => { const w = parseFloat(ex.sets[0]?.weight||0); ex.sets.forEach((_, sI) => updateSet(eI, sI, 'weight', (w+2.5).toString())); }} style={{ width: 28, height: 28, borderRadius: 8, background: '#222', border: '1px solid #2e2e2e', color: '#f5f5f5', cursor: 'pointer', fontSize: 16 }}>+</button>
            <button onClick={() => { const w = parseFloat(ex.sets[0]?.weight||0); ex.sets.forEach((_, sI) => updateSet(eI, sI, 'weight', (w+2.5).toString())); }} style={{ padding: '4px 10px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 8, color: '#4ade80', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+2.5</button>
            <button onClick={() => { const w = parseFloat(ex.sets[0]?.weight||0); ex.sets.forEach((_, sI) => updateSet(eI, sI, 'weight', (w+5).toString())); }} style={{ padding: '4px 10px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 8, color: '#4ade80', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+5</button>
          </div>
          <div style={{ padding: '8px 0' }}>
            {ex.sets.map((set, sI) => (
              <div key={sI} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: sI < ex.sets.length-1 ? '1px solid #1e1e1e' : 'none', background: set.done ? 'rgba(74,222,128,0.04)' : 'transparent' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#6b7280', minWidth: 60 }}>{sI+1} подход</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 600, flex: 1 }}>{set.reps} пов.</span>
                <button onClick={() => toggleSet(eI, sI)}
                  style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${set.done ? '#4ade80' : '#2e2e2e'}`, background: set.done ? '#4ade80' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                  {set.done && <Check size={16} color="#000" />}
                </button>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Отдых: 90 сек</span>
            <button onClick={() => { setRestInfo({ exercise: ex.name, setInfo: `${ex.sets.filter(s=>s.done).length} из ${ex.sets.length} подходов`, duration: 90 }); setShowRestTimer(true) }}
              style={{ padding: '8px 14px', background: '#222', border: '1px solid #4ade80', borderRadius: 10, color: '#4ade80', fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.3 }}>
              Начать таймер
            </button>
          </div>
        </div>
      ))}
    </div>
  )

  if (view === 'plan') return <PlanScreen onBack={() => setView('list')} aiCall={aiCall} profile={state.profile} />
}

// ─── PLAN SCREEN ─────────────────────────────────────────────────────────────
function PlanScreen({ onBack, aiCall, profile }) {
  const [plan, setPlan] = useState(() => { try { return JSON.parse(localStorage.getItem(PLAN_KEY) || 'null') } catch { return null } })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expandedDay, setExpandedDay] = useState(null)

  const levelKey = profile?.level || 'amateur'
  const levelLabel = LEVEL_RU[levelKey] || 'любитель'
  const goalKey = GOAL_RU[profile?.goals?.[0]] || 'maintenance'
  const injuries = profile?.hasLimitations && profile.limitationsText ? [profile.limitationsText] : []

  const generatePlan = async () => {
    setLoading(true); setError(null)
    try {
      // ─── Параметры по уровню ──────────────────────────────────────────────
      const lvlKey = levelKey === 'professional' ? 'expert' : levelKey
      const levelParams = {
        beginner: { split:'full body',      exMax:6,  sets:'2-3', restSec:'60-90',   reps:{ fat_loss:'10-15', muscle_gain:'8-12', strength:'6-10', maintenance:'10-12' } },
        amateur:  { split:'upper/lower',    exMax:8,  sets:'3-4', restSec:'60-120',  reps:{ fat_loss:'10-15', muscle_gain:'6-12', strength:'4-8',  maintenance:'8-12'  } },
        advanced: { split:'push/pull/legs', exMax:10, sets:'3-5', restSec:'90-180',  reps:{ fat_loss:'10-15', muscle_gain:'6-12', strength:'4-6',  maintenance:'8-12'  } },
        expert:   { split:'кастомный',      exMax:12, sets:'4-6', restSec:'120-240', reps:{ fat_loss:'10-15', muscle_gain:'6-12', strength:'3-6',  maintenance:'8-12'  } },
      }
      const p = levelParams[lvlKey] || levelParams.amateur
      const repsRange = p.reps[goalKey] || '8-12'
      const daysPerWeek = lvlKey === 'beginner' ? 3 : lvlKey === 'amateur' ? 4 : 5
      const duration = lvlKey === 'beginner' ? 45 : 60
      const expYears = lvlKey === 'beginner' ? 0 : lvlKey === 'amateur' ? 1 : lvlKey === 'advanced' ? 3 : 5

      // ─── Промт профессионального тренера ──────────────────────────────────
      const prompt = `Ты — профессиональный фитнес-тренер и алгоритм генерации персональных тренировочных программ.
НЕ используй шаблонные программы. Всегда генерируй план через правила и параметры.

ВХОДНЫЕ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ:
- Уровень подготовки: ${lvlKey}
- Цель: ${goalKey}
- Возраст: ${profile?.age || 25}
- Пол: ${profile?.gender || 'male'}
- Вес: ${profile?.weight || 80} кг
- Рост: ${profile?.height || 175} см
- Ограничения/травмы: ${injuries.length > 0 ? injuries.join(', ') : 'нет'}
- Доступ к оборудованию: gym
- Частота тренировок: ${daysPerWeek} в неделю
- Длительность тренировки: ${duration} минут
- Опыт тренировок: ${expYears} лет
- Субъективная нагрузка: средне

ПАРАМЕТРЫ ПО УРОВНЮ (строго соблюдай):
- Тип сплита: ${p.split}
- Упражнений за тренировку: НЕ БОЛЕЕ ${p.exMax}
- Подходов на упражнение: ${p.sets}
- Повторений (цель ${goalKey}): ${repsRange}
- Отдых между подходами: ${p.restSec} сек

ПРАВИЛА ГЕНЕРАЦИИ (строго соблюдай):
1. МИНИМУМ 4 упражнения в тренировочный день, НЕ БОЛЕЕ ${p.exMax}
2. НЕ БОЛЕЕ 20 подходов на мышечную группу в неделю
3. На каждую мышечную группу: 1-2 базовых (compound) + 1-2 изолирующих (isolation)
4. Обязательные дни отдыха
5. Исключить упражнения при ограничениях/травмах
6. ВСЕ текстовые поля — ТОЛЬКО на русском языке
7. Названия дней: Понедельник, Вторник, Среда, Четверг, Пятница, Суббота, Воскресенье
8. Мышечные группы: Грудь, Спина, Ноги, Плечи, Трицепс, Бицепс, Кор, Кардио

ВЕРНИ ТОЛЬКО валидный JSON без markdown и комментариев:
{"plan":{"split":"Фулбоди","days":[{"day_index":0,"name":"Понедельник","muscles":["Грудь","Спина"],"exercises":[{"id":"1","name":"Жим штанги лёжа","muscle":"Грудь","type":"compound","sets":3,"reps":{"min":8,"max":12},"rest_sec":90}]}]},"progression":{"type":"linear","rules":{"success":"increase_weight","failure":"reduce_or_repeat"},"increment_percent":{"min":2.5,"max":5},"rpe":{"low":"<7 increase","optimal":"7-9 keep","high":">9 decrease"}},"adaptation":{"too_easy":"increase_volume_or_weight","too_hard":"reduce_volume_or_weight","skipping":"reduce_frequency","pain":"replace_exercise"}}`

      const reply = await aiCall([{ role: 'user', content: prompt }], 2500)
      const clean = reply.replace(/```json|```/g, '').trim()
      const match = clean.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        if (parsed.plan?.days) {
          const translated = translatePlan(parsed)
          setPlan(translated)
          localStorage.setItem(PLAN_KEY, JSON.stringify(translated))
          setExpandedDay(0)
        } else {
          setError('AI вернул некорректную структуру. Попробуй ещё раз.')
        }
      } else {
        setError('AI вернул некорректный ответ. Попробуй ещё раз.')
      }
    } catch (e) {
      setError('Ошибка соединения. Проверь интернет и попробуй снова.')
    }
    setLoading(false)
  }

  const typeLabel = t => t === 'compound' ? 'Базовое' : 'Изоляция'
  const typeColor = t => t === 'compound' ? '#4ade80' : '#38bdf8'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 10, background: '#1a1a1a', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={18} color="#9ca3af" />
        </button>
        <span style={{ fontSize: 18, fontWeight: 700 }}>AI-план тренировок</span>
      </div>

      <div style={{ background: '#1a1a1a', borderRadius: 14, padding: '12px 16px', display: 'flex', gap: 0, border: '1px solid #2e2e2e' }}>
        {[{ label:'Уровень', value:levelLabel, c:'#4ade80' }, { label:'Цель', value:goalKey, c:'#38bdf8' }, { label:'Ограничения', value:injuries.length>0?'Есть':'Нет', c:injuries.length>0?'#fbbf24':'#6b7280' }].map((item, i) => (
          <div key={i} style={{ flex: 1, padding:'4px 8px', borderRight: i<2?'1px solid #2e2e2e':'none' }}>
            <div style={{ fontSize: 10, color:'#6b7280', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.05em' }}>{item.label}</div>
            <div style={{ fontSize:12, color:item.c, fontWeight:600, textTransform:'capitalize' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {!plan && !loading && (
        <div style={{ background:'#1a1a1a', borderRadius:20, padding:28, display:'flex', flexDirection:'column', alignItems:'center', gap:16, textAlign:'center', border:'1px solid #2e2e2e' }}>
          <div style={{ fontSize:48 }}>✦</div>
          <div style={{ fontSize:16, fontWeight:700 }}>AI составит план под тебя</div>
          <div style={{ fontSize:13, color:'#6b7280', lineHeight:1.6 }}>Профессиональный тренер анализирует уровень, цель, сплит и ограничения — и строит персональную программу</div>
          {error && <div style={{ fontSize:13, color:'#f87171', background:'rgba(248,113,113,0.1)', padding:'10px 16px', borderRadius:10, width:'100%' }}>{error}</div>}
          <button onClick={generatePlan} style={{ background:'#4ade80', color:'#000', border:'none', borderRadius:14, padding:'14px 28px', fontSize:15, fontWeight:700, cursor:'pointer', textTransform:'uppercase', letterSpacing:0.5 }}>Создать план</button>
        </div>
      )}

      {loading && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, padding:'48px 0' }}>
          <div style={{ width:48, height:48, borderRadius:'50%', border:'3px solid rgba(74,222,128,0.2)', borderTop:'3px solid #4ade80', animation:'spin 1s linear infinite' }} />
          <div style={{ fontSize:14, fontWeight:600 }}>Составляю план...</div>
          <div style={{ fontSize:12, color:'#6b7280' }}>15–20 секунд</div>
        </div>
      )}

      {plan && (
        <>
          <div style={{ background:'#1a1a1a', borderRadius:14, padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid #2e2e2e' }}>
            <span style={{ fontSize:13, color:'#6b7280' }}>Сплит</span>
            <span style={{ fontSize:13, fontWeight:700, color:'#4ade80' }}>{plan.plan.split}</span>
          </div>

          {plan.plan.days.map((day, i) => {
            const isRest = !day.exercises || day.exercises.length === 0
            const isOpen = expandedDay === i
            return (
              <div key={i} style={{ background:'#1a1a1a', borderRadius:18, overflow:'hidden', border:`1px solid ${isOpen?'rgba(74,222,128,0.3)':'#2e2e2e'}` }}>
                <div onClick={() => setExpandedDay(isOpen ? null : i)} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', cursor:'pointer', borderBottom: isOpen&&!isRest?'1px solid #2a2a2a':'none' }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:isRest?'#4b5563':DAY_COLORS_PLAN[i%7], flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600 }}>{day.name}</div>
                    {!isRest && day.muscles?.length>0 && <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>{day.muscles.join(' + ')}</div>}
                    {isRest && <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>Отдых и восстановление</div>}
                  </div>
                  {!isRest && (
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:11, color:'#6b7280', fontFamily:'var(--mono)' }}>{day.exercises.length} упр.</span>
                      <span style={{ color:'#6b7280', fontSize:14 }}>{isOpen?'▲':'▼'}</span>
                    </div>
                  )}
                </div>
                {isOpen && !isRest && (
                  <div>
                    {day.exercises.map((ex, j) => (
                      <div key={j} style={{ padding:'12px 16px', borderBottom: j<day.exercises.length-1?'1px solid #1e1e1e':'none', display:'flex', gap:12, alignItems:'flex-start' }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                            <span style={{ padding:'2px 8px', background:`${typeColor(ex.type)}22`, color:typeColor(ex.type), borderRadius:6, fontSize:10, fontWeight:700 }}>{typeLabel(ex.type)}</span>
                            <span style={{ fontSize:14, fontWeight:500 }}>{ex.name}</span>
                          </div>
                          <div style={{ display:'flex', gap:12, fontFamily:'var(--mono)', fontSize:12 }}>
                            <span style={{ color:'#4ade80' }}>{ex.sets} × {ex.reps.min}–{ex.reps.max}</span>
                            <span style={{ color:'#6b7280' }}>отдых {ex.rest_sec}с</span>
                          </div>
                        </div>
                        <span style={{ fontSize:11, padding:'3px 8px', background:'#222', borderRadius:6, color:'#9ca3af', flexShrink:0, marginTop:2 }}>{ex.muscle}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {plan.progression && (
            <div style={{ background:'#1a1a1a', borderRadius:18, padding:16, border:'1px solid #2e2e2e' }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Прогрессия нагрузки</div>
              {[{ l:'Выполнил все подходы', v:`+${plan.progression.increment_percent.min}–${plan.progression.increment_percent.max}% к весу`, c:'#4ade80' }, { l:'RPE < 7 (легко)', v:'Увеличить нагрузку', c:'#4ade80' }, { l:'RPE 7–9 (норма)', v:'Оставить как есть', c:'#fbbf24' }, { l:'RPE > 9 (тяжело)', v:'Снизить нагрузку', c:'#f87171' }].map((row, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'#222', borderRadius:10, marginBottom:6 }}>
                  <span style={{ fontSize:12, color:'#9ca3af' }}>{row.l}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:row.c, fontFamily:'var(--mono)' }}>{row.v}</span>
                </div>
              ))}
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

function ProfileScreen({ profile, saveProfile, signOut }) {
  const [section, setSection] = useState('plan')
  const [form, setForm] = useState({ age:profile?.age||'', weight:profile?.weight||'', height:profile?.height||'', gender:profile?.gender||'male', activity:profile?.activity||'moderate', level:profile?.level||'amateur', goals:profile?.goals||[], calorieGoal:profile?.calorieGoal||'', proteinGoal:profile?.proteinGoal||'', fatGoal:profile?.fatGoal||'', carbGoal:profile?.carbGoal||'' })
  const [saved, setSaved] = useState(false)

  const toggleGoal = g => setForm(f => ({ ...f, goals: f.goals.includes(g) ? f.goals.filter(x => x!==g) : [...f.goals, g] }))

  const handleSave = async () => {
    const w = +form.weight, h = +form.height, a = +form.age
    let calorieGoal = +form.calorieGoal
    if (w && h && a) {
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
        {[['plan','Мой план'],['profile','Профиль'],['settings','Настройки']].map(([k,v]) => (
          <button key={k} onClick={() => setSection(k)} style={{ flex:1, padding:'9px', borderRadius:9, border:'none', cursor:'pointer', fontSize:13, fontWeight:500, background:section===k?'#4ade80':'transparent', color:section===k?'#000':'#6b7280', transition:'all 0.15s' }}>{v}</button>
        ))}
      </div>

      {section === 'plan' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:20, border:'1px solid #2e2e2e' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontSize:15, fontWeight:700 }}>Твой план</div>
              <span style={{ fontSize:13, color:'#4ade80', cursor:'pointer' }}>Изменить</span>
            </div>
            <div style={{ background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.2)', borderRadius:14, padding:16, marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#4ade80', marginBottom:4 }}>{GOAL_LABELS[form.goals[0]] || 'Цель не выбрана'}</div>
              <div style={{ fontSize:13, color:'#6b7280' }}>Уровень: {LEVEL_LABELS[form.level] || 'Любитель'}</div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((d, i) => (
                <div key={d} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                  <div style={{ width:32, height:32, borderRadius:10, background:i<5?'rgba(74,222,128,0.15)':'rgba(74,222,128,0.04)', border:`1px solid ${i<5?'rgba(74,222,128,0.4)':'#2e2e2e'}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {i<5 ? <Check size={14} color="#4ade80" /> : <span style={{ fontSize:10, color:'#4b5563' }}>—</span>}
                  </div>
                  <span style={{ fontSize:10, color:'#6b7280' }}>{d}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:16, border:'1px solid #2e2e2e' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Цели тренировок</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {Object.entries(GOAL_LABELS).map(([k,v]) => (
                <button key={k} onClick={() => toggleGoal(k)} style={{ padding:'8px 14px', borderRadius:10, border:`1px solid ${form.goals.includes(k)?'#4ade80':'#2e2e2e'}`, background:form.goals.includes(k)?'rgba(74,222,128,0.1)':'#222', color:form.goals.includes(k)?'#4ade80':'#9ca3af', cursor:'pointer', fontSize:13, fontWeight:500 }}>{v}</button>
              ))}
            </div>
          </div>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:16, border:'1px solid #2e2e2e' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Уровень подготовки</div>
            <div style={{ display:'flex', gap:8 }}>
              {Object.entries(LEVEL_LABELS).map(([k,v]) => (
                <button key={k} onClick={() => setForm(f => ({...f, level:k}))} style={{ flex:1, padding:'10px 6px', borderRadius:10, border:`1px solid ${form.level===k?'#4ade80':'#2e2e2e'}`, background:form.level===k?'rgba(74,222,128,0.1)':'#222', color:form.level===k?'#4ade80':'#9ca3af', cursor:'pointer', fontSize:11, fontWeight:form.level===k?700:400 }}>{v}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {section === 'profile' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[['Имя','name','text','Алексей'],['Рост (см)','height','number','180'],['Вес (кг)','weight','number','90'],['Возраст','age','number','28']].map(([label,key,type,ph]) => (
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
            <div style={{ background:'rgba(74,222,128,0.05)', borderRadius:14, padding:'14px 16px', border:'1px solid rgba(74,222,128,0.2)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:14, color:'#9ca3af' }}>ИМТ</span>
              <span style={{ fontSize:14, fontWeight:700, color:'#4ade80' }}>{profile.bmi}</span>
            </div>
          )}
        </div>
      )}

      {section === 'settings' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:16, border:'1px solid #2e2e2e' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Цели КБЖУ</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[['Калории','calorieGoal','#f5f5f5'],['Белки (г)','proteinGoal','#4ade80'],['Жиры (г)','fatGoal','#fbbf24'],['Углев. (г)','carbGoal','#38bdf8']].map(([label,key,color]) => (
                <div key={key}>
                  <div style={{ fontSize:11, color, marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>{label}</div>
                  <input style={{ ...inp, borderColor:color==='#f5f5f5'?'#2e2e2e':color+'44' }} type="number" value={form[key]} onChange={e => setForm(f => ({...f,[key]:e.target.value}))} />
                </div>
              ))}
            </div>
          </div>
          {[{l:'Уведомления', v:'Включены'},{l:'Единицы измерения', v:'Кг, см'}].map(s => (
            <div key={s.l} style={{ background:'#1a1a1a', borderRadius:14, padding:'15px 16px', border:'1px solid #2e2e2e', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:14 }}>{s.l}</span>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:13, color:'#6b7280' }}>{s.v}</span>
                <ChevronRight size={16} color="#4b5563" />
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={handleSave} style={{ background: saved ? '#22c55e' : '#4ade80', color:'#000', border:'none', borderRadius:14, padding:'15px', fontSize:15, fontWeight:700, cursor:'pointer', textTransform:'uppercase', letterSpacing:0.5, transition:'background 0.3s' }}>
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

  const tabs = [
    { id:'home',     label:'Главная',    Icon:NavHome },
    { id:'workout',  label:'Тренировки', Icon:NavWorkout },
    { id:'analysis', label:'Прогресс',   Icon:NavProgress },
    { id:'food',     label:'Питание',    Icon:NavFood },
    { id:'profile',  label:'Профиль',    Icon:NavUser },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {tab === 'home'     && <HomeScreen     state={state} dispatch={dispatch} goTo={setTab} aiCall={aiCall} name={name} />}
        {tab === 'food'     && <FoodScreen     state={state} dispatch={dispatch} aiCall={aiCall} />}
        {tab === 'analysis' && <ProgressScreen state={state} />}
        {tab === 'workout'  && <WorkoutScreen  state={state} dispatch={dispatch} aiCall={aiCall} />}
        {tab === 'profile'  && <ProfileScreen  profile={profile} saveProfile={saveProfile} signOut={signOut} />}
      </div>

      <div style={{ display:'flex', borderTop:'1px solid #1e1e1e', background:'#111', paddingBottom:'env(safe-area-inset-bottom, 0px)', flexShrink:0 }}>
        {tabs.map(({ id, label, Icon }) => {
          const isActive = tab === id
          return (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'10px 4px 8px', background:'transparent', border:'none', cursor:'pointer', position:'relative' }}>
              <Icon color={isActive ? '#4ade80' : '#4b5563'} size={22} />
              <span style={{ fontSize:9, color:isActive?'#4ade80':'#4b5563', fontWeight:isActive?700:400, letterSpacing:0.3 }}>{label}</span>
              {isActive && <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:20, height:2, background:'#4ade80', borderRadius:'0 0 2px 2px' }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
