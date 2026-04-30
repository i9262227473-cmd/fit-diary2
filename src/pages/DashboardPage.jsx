import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store'
import { searchFood } from '../data/foodDatabase'
import { LogOut, Camera } from 'lucide-react'
import styles from './DashboardPage.module.css'

// ─── Bottom Nav Icons ────────────────────────────────────────────────────────
function NavHome({ color, size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={color} strokeWidth="1.8" fill="none" /><path d="M9 22v-7h6v7" stroke={color} strokeWidth="1.8" strokeLinecap="round" /></svg>
}
function NavFood({ color, size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M8 3v5c0 2.21 1.79 4 4 4s4-1.79 4-4V3" stroke={color} strokeWidth="1.8" strokeLinecap="round" /><line x1="12" y1="12" x2="12" y2="21" stroke={color} strokeWidth="1.8" strokeLinecap="round" /><line x1="8" y1="21" x2="16" y2="21" stroke={color} strokeWidth="1.8" strokeLinecap="round" /><line x1="6" y1="3" x2="6" y2="8" stroke={color} strokeWidth="1.8" strokeLinecap="round" /></svg>
}
function NavChart({ color, size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="3" y="13" width="4" height="8" rx="1" fill={color} opacity="0.5" /><rect x="10" y="9" width="4" height="12" rx="1" fill={color} opacity="0.75" /><rect x="17" y="4" width="4" height="17" rx="1" fill={color} /></svg>
}
function NavDumbbell({ color, size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="1" y="10" width="4" height="4" rx="2" fill={color} opacity="0.6" /><rect x="5" y="8" width="3" height="8" rx="1.5" fill={color} /><line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" /><rect x="16" y="8" width="3" height="8" rx="1.5" fill={color} /><rect x="19" y="10" width="4" height="4" rx="2" fill={color} opacity="0.6" /></svg>
}
function NavUser({ color, size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.8" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth="1.8" strokeLinecap="round" /></svg>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtTime(s) {
  const m = Math.floor(s / 60), sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
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

// Стаканчик SVG
function GlassIcon({ filled, size = 30 }) {
  const c = filled ? 'var(--teal)' : 'var(--border)'
  const fill = filled ? 'oklch(0.60 0.15 185 / 0.3)' : 'transparent'
  return (
    <svg width={size} height={size} viewBox="0 0 24 28" fill="none">
      <path d="M4 2h16l-2 20a2 2 0 01-2 2H8a2 2 0 01-2-2L4 2z" stroke={c} strokeWidth="1.6" fill={fill} />
      <line x1="5" y1="8" x2="19" y2="8" stroke={c} strokeWidth="1" opacity="0.4" />
    </svg>
  )
}

// ─── Swipeable row для удаления ───────────────────────────────────────────────
function SwipeRow({ children, onDelete }) {
  const ACTION_W = 76
  const [offset, setOffset] = useState(0)
  const startX = useRef(null)
  const isDragging = useRef(false)

  const onTouchStart = e => { startX.current = e.touches[0].clientX; isDragging.current = true }
  const onTouchMove = e => {
    if (!isDragging.current) return
    const dx = e.touches[0].clientX - startX.current
    if (dx < 0) setOffset(Math.max(dx, -ACTION_W))
    else if (offset < 0) setOffset(Math.min(0, offset + dx))
  }
  const onTouchEnd = () => {
    isDragging.current = false
    setOffset(o => Math.abs(o) > ACTION_W / 2 ? -ACTION_W : 0)
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: ACTION_W, background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 0, borderRadius: '0 0 0 0' }}>
        <button onClick={() => { onDelete(); setOffset(0) }}
          style={{ width: '100%', height: '100%', background: 'none', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none"><polyline points="3,6 5,6 21,6" stroke="#fff" strokeWidth="2" strokeLinecap="round" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" /><path d="M10 11v6M14 11v6" stroke="#fff" strokeWidth="2" strokeLinecap="round" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="#fff" strokeWidth="2" /></svg>
          Удалить
        </button>
      </div>
      <div style={{ transform: `translateX(${offset}px)`, transition: isDragging.current ? 'none' : 'transform 0.22s ease', position: 'relative', zIndex: 1 }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        {children}
      </div>
    </div>
  )
}

// ─── Day Analysis Sheet ───────────────────────────────────────────────────────
function DayAnalysisSheet({ totals, goals, workouts, onClose, aiCall }) {
  const [text, setText] = useState(null)
  const [loading, setLoading] = useState(true)

  const run = async () => {
    setLoading(true); setText(null)
    try {
      const foodSummary = `Калории: ${Math.round(totals.calories)} из ${goals.calories}, Белки: ${Math.round(totals.protein)}г, Жиры: ${Math.round(totals.fat)}г, Углеводы: ${Math.round(totals.carbs)}г`
      const workSummary = workouts.length > 0 ? workouts.map(w => `${w.type}: ${w.duration} мин`).join(', ') : 'тренировок нет'
      const reply = await aiCall([{
        role: 'user', content: `Дай краткий анализ дня одним абзацем без эмодзи, без маркеров, без звёздочек, без переносов строк. Питание: ${foodSummary}. Тренировки: ${workSummary}. 3-4 предложения.`
      }], 350)
      const clean = reply.replace(/[*#•→✦✓►▸◆●]/g, '').replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').replace(/[\u{1F000}-\u{1FFFF}]/gu, '').replace(/[\u{2600}-\u{27BF}]/gu, '').trim()
      setText(clean)
    } catch { setText('Не удалось получить анализ. Попробуйте ещё раз.') }
    setLoading(false)
  }

  useEffect(() => { run() }, [])

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.65)' }}>
      <div style={{ background: 'var(--surface)', borderRadius: '24px 24px 0 0', maxHeight: '70%', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.35s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18, color: 'var(--accent)' }}>✦</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Анализ дня</span>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface2)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '20px 20px 36px' }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '36px 0' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--accent-dim)', borderTop: '3px solid var(--accent)', animation: 'spin 1s linear infinite' }} />
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Анализирую день...</div>
            </div>
          )}
          {text && (
            <>
              <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, margin: 0 }}>{text}</p>
              <button onClick={run} style={{ marginTop: 20, padding: '10px 20px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font)' }}>↻ Обновить</button>
            </>
          )}
        </div>
      </div>
    </div>, document.body
  )
}

// ─── PROFILE SCREEN ───────────────────────────────────────────────────────────
const LEVEL_LABELS = { beginner: 'Новичок 🌱', amateur: 'Любитель 💪', advanced: 'Продвинутый 🔥', professional: 'Профессионал 🥇' }
const ROLE_LABELS  = { athlete: 'Спортсмен 🏋️', trainer: 'Тренер 👨‍🏫', both: 'Тренер и спортсмен 🏆' }
const GOAL_LABELS  = { weight_loss: 'Похудение ⚖️', muscle_gain: 'Набор массы 💪', maintenance: 'Поддержание 🎯', endurance: 'Выносливость 🏃', strength: 'Сила 🏋️', health: 'Здоровье ❤️' }
const ACTIVITY_LABELS = { sedentary: 'Сидячий', light: 'Лёгкая', moderate: 'Умеренная', active: 'Высокая', very_active: 'Очень высокая' }

function ProfileScreen({ profile, saveProfile }) {
  const [section, setSection] = useState('info') // 'info' | 'body' | 'kbju'
  const [form, setForm] = useState({
    age: profile?.age || '',
    weight: profile?.weight || '',
    height: profile?.height || '',
    gender: profile?.gender || 'male',
    activity: profile?.activity || 'moderate',
    level: profile?.level || 'amateur',
    role: profile?.role || 'athlete',
    goals: profile?.goals || [],
    calorieGoal: profile?.calorieGoal || '',
    proteinGoal: profile?.proteinGoal || '',
    fatGoal: profile?.fatGoal || '',
    carbGoal: profile?.carbGoal || '',
  })
  const [saved, setSaved] = useState(false)

  const toggleGoal = g => setForm(f => ({
    ...f, goals: f.goals.includes(g) ? f.goals.filter(x => x !== g) : [...f.goals, g]
  }))

  const handleSave = async () => {
    const w = +form.weight, h = +form.height, a = +form.age
    let calorieGoal = +form.calorieGoal
    if (w && h && a) {
      const bmr = form.gender === 'male' ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161
      const factors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }
      calorieGoal = Math.round(bmr * (factors[form.activity] || 1.55))
    }
    const proteinGoal = +form.proteinGoal || Math.round(w * 1.8)
    const fatGoal = +form.fatGoal || Math.round(calorieGoal * 0.25 / 9)
    const carbGoal = +form.carbGoal || Math.round((calorieGoal - proteinGoal * 4 - fatGoal * 9) / 4)
    const bmi = w && h ? (w / ((h / 100) ** 2)).toFixed(1) : profile?.bmi
    await saveProfile({ ...profile, ...form, calorieGoal, proteinGoal, fatGoal, carbGoal, bmi })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const inp = { width: '100%', padding: '11px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font)' }
  const chipActive = { padding: '8px 14px', borderRadius: 10, border: '2px solid var(--accent)', background: 'var(--accent-dim)', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)' }
  const chip = { padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font)' }

  const tabs = [['info', 'Данные'], ['body', 'Тело'], ['kbju', 'КБЖУ']]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Мой профиль</div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 14, padding: 4, gap: 4 }}>
        {tabs.map(([k, v]) => (
          <button key={k} onClick={() => setSection(k)}
            style={{ flex: 1, padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: section === k ? 'var(--accent)' : 'transparent', color: section === k ? '#000' : 'var(--text-muted)', fontFamily: 'var(--font)', transition: 'all 0.15s' }}>
            {v}
          </button>
        ))}
      </div>

      {/* Данные из онбординга */}
      {section === 'info' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Роль</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <button key={k} onClick={() => setForm(f => ({ ...f, role: k }))} style={form.role === k ? chipActive : chip}>{v}</button>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Уровень подготовки</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(LEVEL_LABELS).map(([k, v]) => (
                <button key={k} onClick={() => setForm(f => ({ ...f, level: k }))} style={form.level === k ? chipActive : chip}>{v}</button>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Цели</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(GOAL_LABELS).map(([k, v]) => (
                <button key={k} onClick={() => toggleGoal(k)} style={form.goals.includes(k) ? chipActive : chip}>{v}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Тело */}
      {section === 'body' && (
        <div style={{ background: 'var(--surface)', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[['Возраст', 'age'], ['Вес (кг)', 'weight'], ['Рост (см)', 'height']].map(([label, key]) => (
              <div key={key}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>{label}</div>
                <input style={inp} type="number" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Пол</div>
              <select style={inp} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
              </select>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Активность</div>
            <select style={inp} value={form.activity} onChange={e => setForm(f => ({ ...f, activity: e.target.value }))}>
              {Object.entries(ACTIVITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {profile?.bmi && (
            <div style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>ИМТ</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 600, color: 'var(--accent)' }}>{profile.bmi}</span>
            </div>
          )}
        </div>
      )}

      {/* КБЖУ */}
      {section === 'kbju' && (
        <div style={{ background: 'var(--surface)', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[['Калории', 'calorieGoal', 'var(--text)'], ['Белки (г)', 'proteinGoal', 'var(--accent)'], ['Жиры (г)', 'fatGoal', 'var(--teal)'], ['Углев. (г)', 'carbGoal', 'var(--amber)']].map(([label, key, color]) => (
              <div key={key}>
                <div style={{ fontSize: 11, color, marginBottom: 5 }}>{label}</div>
                <input style={{ ...inp, borderColor: color !== 'var(--text)' ? color + '44' : 'var(--border)' }} type="number" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>Сохрани параметры тела на вкладке «Тело» — КБЖУ пересчитается автоматически</div>
        </div>
      )}

      <button onClick={handleSave} style={{ padding: '14px', background: saved ? 'var(--teal)' : 'var(--accent)', color: '#000', border: 'none', borderRadius: 14, cursor: 'pointer', fontSize: 15, fontWeight: 700, fontFamily: 'var(--font)', transition: 'background 0.3s' }}>
        {saved ? '✓ Сохранено!' : 'Сохранить'}
      </button>
    </div>
  )
}

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────
function HomeScreen({ state, dispatch, goTo, aiCall, name }) {
  const [showAnalysis, setShowAnalysis] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const entry = state.entries.find(e => e.date === today) || { date: today, foods: [], workouts: [] }
  const goals = { calories: state.profile?.calorieGoal || 2000, protein: state.profile?.proteinGoal || 140, fat: state.profile?.fatGoal || 70, carbs: state.profile?.carbGoal || 200 }
  const totals = entry.foods.reduce((a, f) => ({ calories: a.calories + (f.calories || 0), protein: a.protein + (f.protein || 0), fat: a.fat + (f.fat || 0), carbs: a.carbs + (f.carbs || 0) }), { calories: 0, protein: 0, fat: 0, carbs: 0 })
  const calPct = Math.min(totals.calories / goals.calories, 1)
  const r = 72, circ = 2 * Math.PI * r
  const remain = Math.max(0, goals.calories - totals.calories)
  const water = state.water
  const dayLabel = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 8 }}>
      {showAnalysis && <DayAnalysisSheet totals={totals} goals={goals} workouts={entry.workouts || []} onClose={() => setShowAnalysis(false)} aiCall={aiCall} />}

      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Привет, {name.split(' ')[0]} 👋</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2, textTransform: 'capitalize' }}>{dayLabel}</div>
      </div>

      {/* Calorie ring */}
      <div style={{ background: 'var(--surface)', borderRadius: 22, padding: '24px 20px', display: 'flex', gap: 20, alignItems: 'center' }}>
        <svg width={170} height={170} viewBox="0 0 170 170">
          <defs><radialGradient id="g1" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" /><stop offset="100%" stopColor="transparent" /></radialGradient></defs>
          <circle cx={85} cy={85} r={78} fill="url(#g1)" />
          <circle cx={85} cy={85} r={r} fill="none" stroke="var(--surface2)" strokeWidth={12} />
          <circle cx={85} cy={85} r={r} fill="none" stroke="var(--accent)" strokeWidth={12}
            strokeDasharray={`${calPct * circ} ${circ - calPct * circ}`} strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '85px 85px', transition: 'stroke-dasharray 0.8s ease' }} />
          <text x={85} y={78} textAnchor="middle" style={{ fill: 'var(--text)', fontSize: 26, fontWeight: 700, fontFamily: 'var(--mono)' }}>{Math.round(totals.calories)}</text>
          <text x={85} y={96} textAnchor="middle" style={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font)' }}>ккал</text>
        </svg>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Осталось</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 600, color: 'var(--accent)' }}>{remain}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>из {goals.calories} ккал</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[{ l: 'Б', v: totals.protein, max: goals.protein, c: 'var(--accent)' }, { l: 'Ж', v: totals.fat, max: goals.fat, c: 'var(--teal)' }, { l: 'У', v: totals.carbs, max: goals.carbs, c: 'var(--amber)' }].map(m => (
              <div key={m.l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 12 }}>{m.l}</span>
                <div style={{ flex: 1, height: 4, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: m.c, borderRadius: 99, width: `${Math.min(m.v / m.max * 100, 100)}%`, transition: 'width 0.6s' }} />
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: m.c, minWidth: 32, textAlign: 'right' }}>{m.v.toFixed(0)}г</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Water */}
      <div style={{ background: 'var(--surface)', borderRadius: 22, padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Вода</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--teal)' }}>{water.consumed}/{water.goal} ст.</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Array.from({ length: water.goal }).map((_, i) => (
            <button key={i} onClick={() => dispatch({ type: 'SET_WATER', val: i < water.consumed ? i : i + 1 })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: i < water.consumed ? 1 : 0.35, transition: 'opacity 0.2s, transform 0.1s', transform: i < water.consumed ? 'scale(1.05)' : 'scale(1)' }}>
              <GlassIcon filled={i < water.consumed} />
            </button>
          ))}
        </div>
        <div style={{ marginTop: 10, height: 4, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--teal)', borderRadius: 99, width: `${water.consumed / water.goal * 100}%`, transition: 'width 0.4s' }} />
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>{water.consumed * 250} мл из {water.goal * 250} мл</div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button onClick={() => goTo('food')}
          style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 16, padding: '16px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          Питание
        </button>
        <button onClick={() => setShowAnalysis(true)}
          style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ color: 'var(--accent)' }}>✦</span> Анализ дня
        </button>
      </div>

      {entry.foods.length > 0 && (
        <div style={{ background: 'var(--surface)', borderRadius: 22, padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Сегодня съедено</span>
            <button onClick={() => goTo('food')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, cursor: 'pointer' }}>Все →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entry.foods.slice(-4).reverse().map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>{f.name}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--accent)' }}>{Math.round(f.calories)} ккал</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── FOOD SCREEN ──────────────────────────────────────────────────────────────
const MEALS_MAP = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' }
const MEAL_COLORS = { breakfast: 'var(--amber)', lunch: 'var(--accent)', dinner: 'var(--teal)', snack: 'var(--red)' }

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
  const totals = entry.foods.reduce((a, f) => ({ cal: a.cal + (f.calories || 0), p: a.p + (f.protein || 0), fat: a.fat + (f.fat || 0), c: a.c + (f.carbs || 0) }), { cal: 0, p: 0, fat: 0, c: 0 })

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2200) }

  const handleSearch = q => {
    setQuery(q); setSelectedFood(null)
    if (q.length > 1) setResults(searchFood(q).slice(0, 8))
    else setResults([])
  }

  const addFoodItem = (food, g, mealKey) => {
    const w = parseFloat(g) || 100
    dispatch({
      type: 'SAVE_ENTRY', entry: {
        ...entry, foods: [...entry.foods, {
          id: Date.now(), name: food.name, weight: w, meal: mealKey || meal,
          calories: (food.cal100 || 0) * w / 100,
          protein:  (food.prot100 || 0) * w / 100,
          fat:      (food.fat100 || 0) * w / 100,
          carbs:    (food.carbs100 || 0) * w / 100,
          time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
        }]
      }
    })
    showToast(food.name + ' добавлено')
    setSelectedFood(null); setQuery(''); setResults([]); setGrams('100')
    setTab('log')
  }

  const addManual = () => {
    if (!manual.name || !manual.cal) return
    const g = parseFloat(manual.grams) || 100
    dispatch({
      type: 'SAVE_ENTRY', entry: {
        ...entry, foods: [...entry.foods, {
          id: Date.now(), name: manual.name, weight: g, meal,
          calories: parseFloat(manual.cal) * g / 100,
          protein:  parseFloat(manual.p  || 0) * g / 100,
          fat:      parseFloat(manual.f  || 0) * g / 100,
          carbs:    parseFloat(manual.c  || 0) * g / 100,
          time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
        }]
      }
    })
    showToast(manual.name + ' добавлено')
    setManual({ name: '', cal: '', p: '', f: '', c: '', grams: '100' })
    setTab('log')
  }

  const removeFood = id => dispatch({ type: 'SAVE_ENTRY', entry: { ...entry, foods: entry.foods.filter(f => f.id !== id) } })

  const handleScan = async file => {
    setScanLoading(true)
    try {
      const b64 = await compressImage(file)
      const res = await fetch('https://fit-ai-tracker-production.up.railway.app/ai-vision', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ b64 })
      })
      const d = await res.json()
      if (d.name) {
        setSelectedFood({ name: d.name, cal100: d.calories || 0, prot100: d.protein || 0, fat100: d.fat || 0, carbs100: d.carbs || 0 })
        setQuery(d.name)
      }
    } catch { alert('Не удалось прочитать этикетку') } finally { setScanLoading(false) }
  }

  // ✅ Улучшенный промт — строгое требование числовых БЖУ
  const runAI = async () => {
    if (!aiText.trim()) return
    setAiLoading(true); setAiResults(null)
    try {
      const prompt = `Ты диетолог. Пользователь описал еду. Верни ТОЛЬКО JSON-массив (без пояснений, без markdown).
ВАЖНО: все поля ОБЯЗАТЕЛЬНЫ и должны быть числами, не null, не строками.
Формат: [{"name":"Название продукта","cal100":число,"prot100":число,"fat100":число,"carbs100":число,"grams":число}]
Примеры реальных значений: куриная грудка — cal100:165, prot100:31, fat100:3.6, carbs100:0; гречка — cal100:343, prot100:13, fat100:3.4, carbs100:68; хлеб белый — cal100:265, prot100:8, fat100:3, carbs100:49
Если не знаешь точных цифр — дай приблизительные, но не оставляй 0 у основных продуктов.
Описание еды: "${aiText}"`
      const reply = await aiCall([{ role: 'user', content: prompt }], 700)
      const match = reply.replace(/```json|```/g, '').trim().match(/\[[\s\S]*\]/)
      if (match) {
        const items = JSON.parse(match[0])
        setAiResults(items.map(item => ({
          food: {
            name: item.name,
            cal100:   parseFloat(item.cal100)   || 0,
            prot100:  parseFloat(item.prot100)  || 0,
            fat100:   parseFloat(item.fat100)   || 0,
            carbs100: parseFloat(item.carbs100) || 0,
          },
          grams: parseFloat(item.grams) || 100
        })))
      } else setAiResults([])
    } catch { setAiResults([]) }
    setAiLoading(false)
  }

  const inp = { width: '100%', padding: '12px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font)' }
  const bigBtn = { padding: '14px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 14, cursor: 'pointer', fontSize: 15, fontWeight: 700, width: '100%', fontFamily: 'var(--font)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {toast && <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: '#000', padding: '10px 22px', borderRadius: 50, fontSize: 13, fontWeight: 600, zIndex: 999, whiteSpace: 'nowrap' }}>{toast}</div>}

      {/* Итого */}
      <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 18, marginBottom: 14, overflow: 'hidden' }}>
        {[{ l: 'Ккал', v: Math.round(totals.cal), c: 'var(--text)' }, { l: 'Белки', v: totals.p.toFixed(0) + 'г', c: 'var(--accent)' }, { l: 'Жиры', v: totals.fat.toFixed(0) + 'г', c: 'var(--teal)' }, { l: 'Углев', v: totals.c.toFixed(0) + 'г', c: 'var(--amber)' }].map((m, i, arr) => (
          <div key={m.l} style={{ flex: 1, padding: '12px 8px', textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 600, color: m.c }}>{m.v}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{m.l}</div>
          </div>
        ))}
      </div>

      {/* Вкладки */}
      <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 16, padding: 4, gap: 4, marginBottom: 14 }}>
        {[['log', 'Дневник'], ['add', 'Добавить'], ['ai', '✦ AI']].map(([k, v]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ flex: 1, padding: '9px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.15s', background: tab === k ? 'var(--accent)' : 'transparent', color: tab === k ? '#000' : 'var(--text-muted)', fontFamily: 'var(--font)' }}>
            {v}
          </button>
        ))}
      </div>

      {/* Дневник */}
      {tab === 'log' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {entry.foods.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
              Ничего не добавлено.<br />Нажми «Добавить» или «AI».
            </div>
          )}
          {Object.entries(MEALS_MAP).map(([mealKey, mealName]) => {
            const items = entry.foods.filter(f => f.meal === mealKey)
            if (!items.length) return null
            const mCal = items.reduce((a, f) => a + (f.calories || 0), 0)
            return (
              <div key={mealKey} style={{ background: 'var(--surface)', borderRadius: 18, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: MEAL_COLORS[mealKey] }} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{mealName}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)' }}>{Math.round(mCal)} ккал</span>
                </div>
                {items.map(item => (
                  <SwipeRow key={item.id} onDelete={() => removeFood(item.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, color: 'var(--text)' }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--mono)' }}>
                          {item.weight}г · <span style={{ color: 'var(--accent)' }}>Б{Math.round(item.protein)}</span> <span style={{ color: 'var(--teal)' }}>Ж{Math.round(item.fat)}</span> <span style={{ color: 'var(--amber)' }}>У{Math.round(item.carbs)}</span>
                        </div>
                      </div>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{Math.round(item.calories)}</span>
                    </div>
                  </SwipeRow>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Добавить */}
      {tab === 'add' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(MEALS_MAP).map(([k, v]) => (
              <button key={k} onClick={() => setMeal(k)}
                style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: meal === k ? MEAL_COLORS[k] : 'var(--surface)', color: meal === k ? '#000' : 'var(--text-muted)', fontFamily: 'var(--font)' }}>
                {v}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 12, padding: 3, gap: 3 }}>
            {[['search', 'Поиск'], ['manual', 'Вручную']].map(([k, v]) => (
              <button key={k} onClick={() => setManualMode(k === 'manual')}
                style={{ flex: 1, padding: '8px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, background: (k === 'manual' ? manualMode : !manualMode) ? 'var(--surface2)' : 'transparent', color: (k === 'manual' ? manualMode : !manualMode) ? 'var(--text)' : 'var(--text-muted)', fontFamily: 'var(--font)' }}>
                {v}
              </button>
            ))}
          </div>

          {!manualMode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...inp, flex: 1 }} placeholder="Найти продукт..." value={query} onChange={e => handleSearch(e.target.value)} autoFocus />
                <label style={{ width: 46, height: 46, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  {scanLoading ? '⏳' : <Camera size={18} color="var(--text-muted)" />}
                  <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleScan(e.target.files[0])} />
                </label>
              </div>
              {results.length > 0 && !selectedFood && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {results.map((food, i) => (
                    <button key={i} onClick={() => { setSelectedFood(food); setResults([]) }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ fontSize: 14, color: 'var(--text)' }}>{food.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                        {food.cal100} ккал · <span style={{ color: 'var(--accent)' }}>Б{food.prot100}</span> <span style={{ color: 'var(--teal)' }}>Ж{food.fat100}</span> <span style={{ color: 'var(--amber)' }}>У{food.carbs100}</span> /100г
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {selectedFood && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent)' }}>{selectedFood.name}</div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--accent)' }}>Б{selectedFood.prot100}</span> <span style={{ color: 'var(--teal)' }}>Ж{selectedFood.fat100}</span> <span style={{ color: 'var(--amber)' }}>У{selectedFood.carbs100}</span> /100г
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Порция:</label>
                    <input style={{ ...inp, width: 80, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 16 }} type="number" value={grams} onChange={e => setGrams(e.target.value)} />
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>г</span>
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)' }}>
                    {Math.round((selectedFood.cal100 || 0) * (parseFloat(grams) || 100) / 100)} ккал · Б{Math.round((selectedFood.prot100 || 0) * (parseFloat(grams) || 100) / 100)}г Ж{Math.round((selectedFood.fat100 || 0) * (parseFloat(grams) || 100) / 100)}г У{Math.round((selectedFood.carbs100 || 0) * (parseFloat(grams) || 100) / 100)}г
                  </div>
                  <button style={bigBtn} onClick={() => addFoodItem(selectedFood, grams)}>Готово</button>
                </div>
              )}
            </div>
          )}

          {manualMode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[['Название', 'name', 'text', 'Борщ домашний'], ['Порция (г)', 'grams', 'number', '100'], ['Ккал / 100г', 'cal', 'number', '200'], ['Белки / 100г', 'p', 'number', '0'], ['Жиры / 100г', 'f', 'number', '0'], ['Углеводы / 100г', 'c', 'number', '0']].map(([label, key, type, ph]) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>{label}</label>
                  <input style={inp} type={type} placeholder={ph} value={manual[key]} onChange={e => setManual({ ...manual, [key]: e.target.value })} />
                </div>
              ))}
              <button style={{ ...bigBtn, opacity: !manual.name || !manual.cal ? 0.5 : 1 }} onClick={addManual} disabled={!manual.name || !manual.cal}>Готово</button>
            </div>
          )}
        </div>
      )}

      {/* AI */}
      {tab === 'ai' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20, color: 'var(--accent)' }}>✦</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>AI-распознавание еды</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>Опиши что съел — AI определит КБЖУ автоматически</p>
            <textarea style={{ ...inp, resize: 'none', minHeight: 80, lineHeight: 1.5 }}
              placeholder="«съел 200г куриной грудки с гречкой и стакан кефира»"
              value={aiText} onChange={e => setAiText(e.target.value)} rows={3} />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(MEALS_MAP).map(([k, v]) => (
                <button key={k} onClick={() => setMeal(k)}
                  style={{ flex: 1, padding: '8px 4px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: meal === k ? MEAL_COLORS[k] : 'var(--surface2)', color: meal === k ? '#000' : 'var(--text-muted)', fontFamily: 'var(--font)' }}>
                  {v}
                </button>
              ))}
            </div>
            <button style={{ ...bigBtn, opacity: !aiText.trim() || aiLoading ? 0.5 : 1 }} onClick={runAI} disabled={!aiText.trim() || aiLoading}>
              {aiLoading ? '⏳ Анализирую...' : '✦ Распознать'}
            </button>
          </div>

          {aiResults !== null && !aiLoading && (
            <div style={{ background: 'var(--surface)', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {aiResults.length === 0
                ? <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '12px 0' }}>Не удалось распознать. Опиши подробнее.</p>
                : <>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Найдено {aiResults.length} позиций:</div>
                  {aiResults.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface2)', borderRadius: 14 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{item.food.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                          {item.grams}г · {Math.round((item.food.cal100 || 0) * item.grams / 100)} ккал · <span style={{ color: 'var(--accent)' }}>Б{Math.round((item.food.prot100 || 0) * item.grams / 100)}г</span> <span style={{ color: 'var(--teal)' }}>Ж{Math.round((item.food.fat100 || 0) * item.grams / 100)}г</span> <span style={{ color: 'var(--amber)' }}>У{Math.round((item.food.carbs100 || 0) * item.grams / 100)}г</span>
                        </div>
                      </div>
                      <button onClick={() => addFoodItem(item.food, item.grams)}
                        style={{ padding: '8px 14px', borderRadius: 10, background: 'var(--accent)', border: 'none', color: '#000', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)' }}>
                        Добавить
                      </button>
                    </div>
                  ))}
                  <button style={bigBtn} onClick={() => { aiResults.forEach(item => addFoodItem(item.food, item.grams)); setAiText(''); setAiResults(null); setTab('log') }}>
                    Добавить всё
                  </button>
                </>
              }
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ANALYSIS SCREEN ──────────────────────────────────────────────────────────
function AnalysisScreen({ state, aiCall }) {
  const [aiText, setAiText] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const todayEntry = state.entries.find(e => e.date === today) || { foods: [] }
  const todayTotals = todayEntry.foods.reduce((a, f) => ({ cal: a.cal + (f.calories || 0), p: a.p + (f.protein || 0), fat: a.fat + (f.fat || 0), c: a.c + (f.carbs || 0) }), { cal: 0, p: 0, fat: 0, c: 0 })
  const goals = { calories: state.profile?.calorieGoal || 2000 }

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
  const weekData = weekDays.map((day, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const e = state.entries.find(en => en.date === d.toISOString().split('T')[0]) || { foods: [] }
    return { day, cal: e.foods.reduce((a, f) => a + (f.calories || 0), 0), isToday: false }
  })
  weekData.push({ day: 'Сг', cal: todayTotals.cal, isToday: true })

  const display = todayTotals
  const calPct = Math.min(display.cal / goals.calories, 1)
  const tm = display.p + display.fat + display.c
  const pPct = tm > 0 ? Math.round(display.p / tm * 100) : 33
  const fPct = tm > 0 ? Math.round(display.fat / tm * 100) : 33
  const cPct = tm > 0 ? 100 - pPct - fPct : 34
  const r = 60, circ = 2 * Math.PI * r
  const maxCal = Math.max(...weekData.map(d => d.cal), goals.calories, 1)

  const runAI = async () => {
    setAiLoading(true); setAiText(null)
    try {
      const reply = await aiCall([{ role: 'user', content: `Оцени питание одним абзацем без маркеров, без эмодзи, без звёздочек: ${Math.round(display.cal)} ккал из ${goals.calories}, Б:${display.p.toFixed(0)}г, Ж:${display.fat.toFixed(0)}г, У:${display.c.toFixed(0)}г. 3 предложения с советами.` }], 300)
      const clean = reply.replace(/[*#•→✦✓►▸◆●]/g, '').replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').replace(/[\u{1F000}-\u{1FFFF}]/gu, '').replace(/[\u{2600}-\u{27BF}]/gu, '').trim()
      setAiText(clean)
    } catch { setAiText('Не удалось получить анализ.') }
    setAiLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Анализ питания</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 12 }}>
        <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <svg width={140} height={140} viewBox="0 0 140 140">
            <circle cx={70} cy={70} r={r} fill="none" stroke="var(--surface2)" strokeWidth={10} />
            <circle cx={70} cy={70} r={r} fill="none" stroke="var(--accent)" strokeWidth={10}
              strokeDasharray={`${calPct * circ} ${circ * (1 - calPct)}`} strokeLinecap="round"
              style={{ transform: 'rotate(-90deg)', transformOrigin: '70px 70px', transition: 'stroke-dasharray 0.6s ease' }} />
            <text x={70} y={64} textAnchor="middle" style={{ fill: 'var(--text)', fontSize: 20, fontWeight: 700, fontFamily: 'var(--mono)' }}>{Math.round(display.cal)}</text>
            <text x={70} y={80} textAnchor="middle" style={{ fill: 'var(--text-muted)', fontSize: 11 }}>ккал</text>
            <text x={70} y={96} textAnchor="middle" style={{ fill: 'var(--accent)', fontSize: 11, fontFamily: 'var(--mono)' }}>{Math.round(calPct * 100)}%</text>
          </svg>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>из {goals.calories}</div>
        </div>
        <div style={{ background: 'var(--surface)', borderRadius: 20, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
          {[{ l: 'Белки', v: display.p, pct: pPct, c: 'var(--accent)' }, { l: 'Жиры', v: display.fat, pct: fPct, c: 'var(--teal)' }, { l: 'Углев.', v: display.c, pct: cPct, c: 'var(--amber)' }].map(m => (
            <div key={m.l} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.c, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{m.l}</div>
                <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: m.c, borderRadius: 99, width: `${m.pct}%`, transition: 'width 0.6s' }} />
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 48 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: m.c, fontWeight: 500 }}>{m.v.toFixed(0)}г</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.pct}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: 'var(--surface)', borderRadius: 20, padding: '16px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Неделя</span>
          <span style={{ fontSize: 12, padding: '3px 10px', background: 'oklch(0.72 0.15 75 / 0.12)', border: '1px solid oklch(0.72 0.15 75 / 0.3)', borderRadius: 50, color: 'oklch(0.72 0.15 75)' }}>Цель {goals.calories}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 120 }}>
          {weekData.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ width: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end', flex: 1 }}>
                <div style={{ position: 'absolute', bottom: `${(goals.calories / maxCal) * 100}%`, left: '-2px', right: '-2px', height: 1, borderTop: '1px dashed oklch(0.72 0.15 75 / 0.5)' }} />
                <div style={{ width: '100%', borderRadius: '5px 5px 0 0', height: `${(d.cal / maxCal) * 100}%`, minHeight: 4, background: d.isToday ? 'var(--accent)' : 'oklch(0.62 0.18 145 / 0.4)', transition: 'height 0.6s' }} />
              </div>
              <div style={{ fontSize: 11, color: d.isToday ? 'var(--accent)' : 'var(--text-muted)', fontWeight: d.isToday ? 600 : 400 }}>{d.day}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, color: 'var(--accent)' }}>✦</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>AI-анализ</span>
          </div>
          <button onClick={runAI} disabled={aiLoading}
            style={{ padding: '8px 16px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)' }}>
            {aiLoading ? '...' : 'Анализ'}
          </button>
        </div>
        {!aiText && !aiLoading && <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>Нажми «Анализ» — AI оценит рацион.</p>}
        {aiLoading && <div style={{ height: 2, background: 'var(--accent-dim)', borderRadius: 99, overflow: 'hidden' }}><div style={{ height: '100%', background: 'linear-gradient(90deg,transparent,var(--accent),transparent)', animation: 'scan 1.5s ease-in-out infinite' }} /></div>}
        {aiText && <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, margin: 0 }}>{aiText}</p>}
      </div>
      <AnalysesHistory aiCall={aiCall} />
    </div>
  )
}

function AnalysesHistory({ aiCall }) {
  const STORAGE_KEY = 'analyses-v1'
  const [analyses, setAnalyses] = useState(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] } })
  const [scanning, setScanning] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  const handlePhoto = async (file) => {
    setScanning(true)
    try {
      const b64 = await compressImage(file, 1600, 0.9)
      const res = await fetch('https://fit-ai-tracker-production.up.railway.app/ai-vision', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ b64, type: 'document' }) })
      const visionData = await res.json()
      const analysis = await aiCall([{ role: 'user', content: `Расшифруй лабораторные анализы:\n${visionData.text || 'не удалось извлечь текст'}\n\nДай краткую расшифровку по каждому показателю.` }], 1000)
      const item = { id: Date.now(), date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }), preview: (visionData.text || '').slice(0, 100), analysis }
      const updated = [item, ...analyses]
      setAnalyses(updated); localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      setExpandedId(item.id)
    } catch { alert('Ошибка обработки') } finally { setScanning(false) }
  }

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Анализы документов</div>
      <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px', background: 'var(--surface2)', border: '1px dashed var(--border)', borderRadius: 16, cursor: 'pointer' }}>
        <span style={{ fontSize: 28 }}>🔬</span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>{scanning ? 'Анализирую...' : 'Сфотографировать анализы — AI расшифрует'}</span>
        <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => e.target.files[0] && handlePhoto(e.target.files[0])} disabled={scanning} />
      </label>
      {analyses.map(a => (
        <div key={a.id} style={{ background: 'var(--surface2)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.date}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{a.preview}</div>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>{expandedId === a.id ? '▲' : '▼'}</span>
            <button onClick={e => { e.stopPropagation(); const u = analyses.filter(x => x.id !== a.id); setAnalyses(u); localStorage.setItem(STORAGE_KEY, JSON.stringify(u)) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 16 }}>×</button>
          </div>
          {expandedId === a.id && <div style={{ padding: '0 14px 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{a.analysis}</div>}
        </div>
      ))}
    </div>
  )
}

// ─── WORKOUT SCREEN ───────────────────────────────────────────────────────────
const EXERCISE_DB = [
  { id: 1,  name: 'Жим штанги лёжа',           muscle: 'Грудь' },
  { id: 2,  name: 'Жим гантелей лёжа',          muscle: 'Грудь' },
  { id: 3,  name: 'Жим в тренажёре (грудь)',    muscle: 'Грудь' },
  { id: 4,  name: 'Жим штанги на наклонной',    muscle: 'Грудь' },
  { id: 5,  name: 'Разводка гантелей лёжа',     muscle: 'Грудь' },
  { id: 6,  name: 'Кроссовер в блоке',          muscle: 'Грудь' },
  { id: 7,  name: 'Отжимания от пола',          muscle: 'Грудь' },
  { id: 8,  name: 'Отжимания на брусьях',       muscle: 'Грудь' },
  { id: 9,  name: 'Тяга верхнего блока',        muscle: 'Спина' },
  { id: 10, name: 'Тяга горизонтального блока', muscle: 'Спина' },
  { id: 11, name: 'Тяга штанги в наклоне',      muscle: 'Спина' },
  { id: 12, name: 'Тяга гантели одной рукой',   muscle: 'Спина' },
  { id: 13, name: 'Подтягивания',               muscle: 'Спина' },
  { id: 14, name: 'Тяга Т-грифа',               muscle: 'Спина' },
  { id: 15, name: 'Пуловер с гантелью',         muscle: 'Спина' },
  { id: 16, name: 'Гиперэкстензия',             muscle: 'Спина' },
  { id: 17, name: 'Приседания со штангой',      muscle: 'Ноги' },
  { id: 18, name: 'Жим ногами в тренажёре',     muscle: 'Ноги' },
  { id: 19, name: 'Разгибание ног в тренажёре', muscle: 'Ноги' },
  { id: 20, name: 'Сгибание ног в тренажёре',   muscle: 'Ноги' },
  { id: 21, name: 'Выпады с гантелями',         muscle: 'Ноги' },
  { id: 22, name: 'Румынская тяга',             muscle: 'Ноги' },
  { id: 23, name: 'Подъём на икры стоя',        muscle: 'Ноги' },
  { id: 24, name: 'Отведение ноги в блоке',     muscle: 'Ноги' },
  { id: 25, name: 'Жим гантелей сидя',          muscle: 'Плечи' },
  { id: 26, name: 'Жим штанги сидя',            muscle: 'Плечи' },
  { id: 27, name: 'Махи гантелями в стороны',   muscle: 'Плечи' },
  { id: 28, name: 'Тяга к подбородку',          muscle: 'Плечи' },
  { id: 29, name: 'Махи в наклоне (задние)',     muscle: 'Плечи' },
  { id: 30, name: 'Жим в тренажёре (плечи)',    muscle: 'Плечи' },
  { id: 31, name: 'Разгибания на блоке',        muscle: 'Трицепс' },
  { id: 32, name: 'Французский жим лёжа',       muscle: 'Трицепс' },
  { id: 33, name: 'Жим узким хватом',           muscle: 'Трицепс' },
  { id: 34, name: 'Разгибания с гантелью',      muscle: 'Трицепс' },
  { id: 35, name: 'Отжимания на брусьях узко',  muscle: 'Трицепс' },
  { id: 36, name: 'Подъём штанги на бицепс',    muscle: 'Бицепс' },
  { id: 37, name: 'Подъём гантелей на бицепс',  muscle: 'Бицепс' },
  { id: 38, name: 'Молотки с гантелями',        muscle: 'Бицепс' },
  { id: 39, name: 'Подъём на бицепс в блоке',   muscle: 'Бицепс' },
  { id: 40, name: 'Концентрированный подъём',   muscle: 'Бицепс' },
  { id: 41, name: 'Планка',                     muscle: 'Кор' },
  { id: 42, name: 'Скручивания',                muscle: 'Кор' },
  { id: 43, name: 'Подъём ног лёжа',            muscle: 'Кор' },
  { id: 44, name: 'Боковая планка',             muscle: 'Кор' },
  { id: 45, name: 'Велосипед',                  muscle: 'Кор' },
  { id: 46, name: 'Бег',                        muscle: 'Кардио' },
  { id: 47, name: 'Эллипс',                     muscle: 'Кардио' },
  { id: 48, name: 'Велотренажёр',               muscle: 'Кардио' },
  { id: 49, name: 'Прыжки со скакалкой',        muscle: 'Кардио' },
  { id: 50, name: 'Гребной тренажёр',           muscle: 'Кардио' },
]
const M_COLORS = { Грудь: '#2d5c3d', Ноги: '#1e4a5a', Спина: '#3a3a6e', Плечи: '#5a4a1e', Трицепс: '#5a1e4a', Бицепс: '#5a2e1e', Кор: '#1e5a5a', Кардио: '#5a1e1e' }

// ─── PLAN SCREEN ─────────────────────────────────────────────────────────────
const PLAN_KEY = 'workout-plan-v1'
const LEVEL_RU = { beginner: 'новичок', amateur: 'любитель', advanced: 'продвинутый', professional: 'профессионал' }
const GOAL_RU = { weight_loss: 'похудение', muscle_gain: 'набор массы', maintenance: 'поддержание', endurance: 'выносливость', strength: 'сила', health: 'здоровье' }

function PlanScreen({ onBack, aiCall, profile }) {
  const [plan, setPlan] = useState(() => { try { return JSON.parse(localStorage.getItem(PLAN_KEY) || 'null') } catch { return null } })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const level = LEVEL_RU[profile?.level] || 'любитель'
  const goals = Array.isArray(profile?.goals) && profile.goals.length > 0
    ? profile.goals.map(g => GOAL_RU[g] || g).join(', ')
    : 'поддержание формы'
  const limitations = profile?.hasLimitations && profile.limitationsText ? profile.limitationsText : 'нет'
  const weight = profile?.weight || 80

  // ✅ Упрощённый промт — меньше токенов, быстрее ответ
  const generatePlan = async () => {
    setLoading(true); setError(null)
    try {
      const prompt = `Составь недельный план тренировок для спортсмена.
Данные: уровень=${level}, вес=${weight}кг, цели=${goals}, ограничения=${limitations}.
Верни ТОЛЬКО JSON без markdown, строго 7 дней:
[{"day":"Пн","focus":"Грудь+Трицепс","exercises":["Жим штанги лёжа 4x10","Разводка гантелей 3x12","Французский жим 3x12"],"duration":60},{"day":"Вт","focus":"Отдых","exercises":[],"duration":0}]`

      const reply = await aiCall([{ role: 'user', content: prompt }], 1500)
      const match = reply.replace(/```json|```/g, '').trim().match(/\[[\s\S]*\]/)
      if (match) {
        const p = JSON.parse(match[0])
        setPlan(p); localStorage.setItem(PLAN_KEY, JSON.stringify(p))
      } else {
        setError('AI вернул некорректный ответ. Попробуй ещё раз.')
      }
    } catch (e) {
      setError('Не удалось получить план. Проверь интернет и попробуй снова.')
    }
    setLoading(false)
  }

  const DAY_COLORS = ['var(--accent)', 'var(--teal)', 'var(--amber)', 'var(--accent)', 'var(--teal)', 'var(--text-muted)', 'var(--text-muted)']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ padding: '8px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font)' }}>← Назад</button>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>План тренировок</span>
      </div>

      {/* Инфо о профиле */}
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '12px 16px', display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Уровень</div>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, textTransform: 'capitalize' }}>{level}</div>
        </div>
        <div style={{ flex: 2 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Цели</div>
          <div style={{ fontSize: 13, color: 'var(--text)', textTransform: 'capitalize' }}>{goals}</div>
        </div>
      </div>

      {!plan && !loading && (
        <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
          <span style={{ fontSize: 48 }}>✦</span>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>AI составит план под тебя</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>Учитывает уровень подготовки, цели и ограничения здоровья</div>
          {error && <div style={{ fontSize: 13, color: 'var(--red)', background: 'oklch(0.62 0.200 15 / 0.1)', padding: '10px 16px', borderRadius: 10, width: '100%' }}>{error}</div>}
          <button onClick={generatePlan} style={{ padding: '14px 28px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 14, cursor: 'pointer', fontSize: 15, fontWeight: 700, fontFamily: 'var(--font)' }}>Создать план</button>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '48px 0' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--accent-dim)', borderTop: '3px solid var(--accent)', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>AI составляет план...</div>
        </div>
      )}

      {plan && plan.map((day, i) => (
        <div key={i} style={{ background: 'var(--surface)', borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: day.exercises.length > 0 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: DAY_COLORS[i], flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{day.day}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{day.focus}{day.duration > 0 ? ` · ${day.duration} мин` : ''}</div>
            </div>
          </div>
          {day.exercises.length > 0 && (
            <div style={{ padding: '10px 16px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {day.exercises.map((ex, j) => (
                <div key={j} style={{ fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent-dim)', flexShrink: 0 }} />
                  {ex}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {plan && (
        <button onClick={() => { setPlan(null); localStorage.removeItem(PLAN_KEY); setError(null) }}
          style={{ padding: '12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 14, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font)' }}>
          ↻ Пересоздать план
        </button>
      )}
    </div>
  )
}

function WorkoutScreen({ state, dispatch, aiCall }) {
  const [view, setView] = useState('list')
  const [wk, setWk] = useState({ name: '', exercises: [] })
  const [exSearch, setExSearch] = useState('')
  const [timer, setTimer] = useState(0)
  const [running, setRunning] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (running) timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    else clearInterval(timerRef.current)
    return () => clearInterval(timerRef.current)
  }, [running])

  const today = new Date().toISOString().split('T')[0]
  const entry = state.entries.find(e => e.date === today) || { date: today, foods: [], workouts: [] }

  const removeWorkout = (wId) => {
    dispatch({ type: 'SAVE_ENTRY', entry: { ...entry, workouts: (entry.workouts || []).filter(w => w.id !== wId) } })
  }

  const filteredEx = EXERCISE_DB.filter(e =>
    e.name.toLowerCase().includes(exSearch.toLowerCase()) ||
    e.muscle.toLowerCase().includes(exSearch.toLowerCase())
  )
  const addEx = ex => setWk(w => ({ ...w, exercises: [...w.exercises, { exerciseId: ex.id, name: ex.name, muscle: ex.muscle, sets: [{ reps: '10', weight: '0', done: false }] }] }))
  const updateSet = (eI, sI, field, val) => setWk(w => { const exs = [...w.exercises]; exs[eI] = { ...exs[eI], sets: exs[eI].sets.map((s, i) => i === sI ? { ...s, [field]: val } : s) }; return { ...w, exercises: exs } })
  const addSet = eI => setWk(w => { const exs = [...w.exercises]; const prev = exs[eI].sets[exs[eI].sets.length - 1]; exs[eI] = { ...exs[eI], sets: [...exs[eI].sets, { ...prev, done: false }] }; return { ...w, exercises: exs } })
  const removeEx = eI => setWk(w => ({ ...w, exercises: w.exercises.filter((_, i) => i !== eI) }))
  const toggleSet = (eI, sI) => setWk(w => { const exs = [...w.exercises]; exs[eI] = { ...exs[eI], sets: exs[eI].sets.map((s, i) => i === sI ? { ...s, done: !s.done } : s) }; return { ...w, exercises: exs } })

  const completeWorkout = () => {
    setRunning(false)
    const calBurned = Math.round(timer / 60 * 7.5)
    dispatch({ type: 'SAVE_ENTRY', entry: { ...entry, workouts: [...(entry.workouts || []), { id: Date.now(), name: wk.name || 'Тренировка', type: wk.name || 'Тренировка', exercises: wk.exercises.map(e => e.name), duration: Math.round(timer / 60), caloriesBurned: calBurned, date: new Date().toLocaleDateString('ru', { day: 'numeric', month: 'short' }) }] } })
    setWk({ name: '', exercises: [] }); setTimer(0); setView('list')
  }

  const inp = { width: '100%', padding: '12px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font)' }
  const bigBtn = { padding: '14px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 14, cursor: 'pointer', fontSize: 15, fontWeight: 700, width: '100%', fontFamily: 'var(--font)' }
  const allWorkouts = state.entries.flatMap(e => (e.workouts || []).map(w => ({ ...w, entryDate: e.date }))).sort((a, b) => b.entryDate.localeCompare(a.entryDate))

  if (view === 'plan') return <PlanScreen onBack={() => setView('list')} aiCall={aiCall} profile={state.profile} />

  if (view === 'list') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Тренировки</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button onClick={() => setView('builder')} style={{ padding: '14px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 14, cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start', fontFamily: 'var(--font)' }}>
          <span style={{ fontSize: 22 }}>💪</span><span>Новая<br />тренировка</span>
        </button>
        <button onClick={() => setView('plan')} style={{ padding: '14px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 14, cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start', fontFamily: 'var(--font)' }}>
          <span style={{ fontSize: 22, color: 'var(--accent)' }}>✦</span><span>Мой план<br />тренировок</span>
        </button>
      </div>
      {allWorkouts.length === 0
        ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>Тренировок пока нет.<br />Создай первую!</div>
        : allWorkouts.map(w => (
          <SwipeRow key={w.id} onDelete={() => removeWorkout(w.id)}>
            <div style={{ background: 'var(--surface)', borderRadius: 18, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{w.name || w.type}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)', marginTop: 4 }}>{w.duration} мин · {w.date || w.entryDate}</div>
                {w.exercises?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                    {(Array.isArray(w.exercises) ? w.exercises : []).slice(0, 3).map((e, i) => (
                      <span key={i} style={{ padding: '2px 9px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 50, fontSize: 11, color: 'var(--text-muted)' }}>{typeof e === 'string' ? e : e.name}</span>
                    ))}
                  </div>
                )}
              </div>
              {w.caloriesBurned && (
                <div style={{ textAlign: 'center', minWidth: 56 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--teal)' }}>{w.caloriesBurned}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>ккал</div>
                </div>
              )}
            </div>
          </SwipeRow>
        ))
      }
    </div>
  )

  if (view === 'builder') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => setView('list')} style={{ padding: '8px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font)' }}>← Назад</button>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Конструктор</span>
      </div>
      <input style={{ width: '100%', padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, color: 'var(--text)', fontSize: 16, fontWeight: 600, outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font)' }}
        placeholder="Название тренировки" value={wk.name} onChange={e => setWk(w => ({ ...w, name: e.target.value }))} />
      <div style={{ background: 'var(--surface)', borderRadius: 18, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Добавить упражнение</div>
        <input style={inp} placeholder="Поиск упражнений..." value={exSearch} onChange={e => setExSearch(e.target.value)} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
          {filteredEx.map(ex => (
            <button key={ex.id} onClick={() => addEx(ex)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)' }}>
              <span style={{ padding: '2px 8px', borderRadius: 50, fontSize: 11, color: 'var(--text-muted)', background: M_COLORS[ex.muscle] || 'var(--surface)', flexShrink: 0 }}>{ex.muscle}</span>
              <span style={{ fontSize: 14, color: 'var(--text)', flex: 1 }}>{ex.name}</span>
              <span style={{ color: 'var(--accent)', fontSize: 16, fontWeight: 600 }}>Добавить</span>
            </button>
          ))}
        </div>
      </div>
      {wk.exercises.map((ex, eI) => (
        <div key={eI} style={{ background: 'var(--surface)', borderRadius: 18, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ padding: '3px 10px', borderRadius: 50, fontSize: 11, background: M_COLORS[ex.muscle] || 'var(--surface2)', color: 'var(--text-muted)' }}>{ex.muscle}</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', flex: 1 }}>{ex.name}</span>
            <button onClick={() => removeEx(eI)} style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface2)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr', gap: 6 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>№</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>Повторы</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>Вес (кг)</div>
            {ex.sets.map((set, sI) => (
              <React.Fragment key={sI}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{sI + 1}</div>
                <input style={{ padding: '8px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 14, fontFamily: 'var(--mono)', outline: 'none', textAlign: 'center' }} value={set.reps} onChange={e => updateSet(eI, sI, 'reps', e.target.value)} placeholder="10" />
                <input style={{ padding: '8px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 14, fontFamily: 'var(--mono)', outline: 'none', textAlign: 'center' }} value={set.weight} onChange={e => updateSet(eI, sI, 'weight', e.target.value)} placeholder="0" />
              </React.Fragment>
            ))}
          </div>
          <button onClick={() => addSet(eI)} style={{ padding: '8px', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 10, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font)' }}>Добавить подход</button>
        </div>
      ))}
      {wk.exercises.length > 0 && (
        <button style={bigBtn} onClick={() => { setTimer(0); setRunning(true); setView('active') }}>Начать тренировку</button>
      )}
    </div>
  )

  if (view === 'active') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 22, padding: '20px', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 48, fontWeight: 500, color: 'var(--accent)', letterSpacing: '0.02em' }}>{fmtTime(timer)}</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{wk.name || 'Тренировка'}</div>
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button onClick={() => setRunning(r => !r)} style={{ flex: 1, padding: '12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 14, color: 'var(--text)', cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font)' }}>
            {running ? '⏸ Пауза' : '▶ Продолжить'}
          </button>
          <button onClick={completeWorkout} style={{ flex: 1, padding: '12px', background: 'var(--accent)', border: 'none', borderRadius: 14, color: '#000', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font)' }}>
            Завершить ✓
          </button>
        </div>
      </div>
      {wk.exercises.map((ex, eI) => (
        <div key={eI} style={{ background: 'var(--surface)', borderRadius: 18, padding: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>{ex.name}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ex.sets.map((set, sI) => (
              <button key={sI} onClick={() => toggleSet(eI, sI)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: set.done ? 'oklch(0.28 0.09 145)' : 'var(--surface2)', border: `2px solid ${set.done ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 14, cursor: 'pointer', transition: 'all 0.15s', minWidth: 100, fontFamily: 'var(--font)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 16 }}>{sI + 1}</span>
                <span style={{ fontSize: 14, color: 'var(--text)', flex: 1 }}>{set.reps}×{set.weight > 0 ? set.weight + 'кг' : '—'}</span>
                {set.done && <span style={{ color: 'var(--accent)', fontSize: 14 }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
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
    { id: 'home',     label: 'Главная', Icon: NavHome },
    { id: 'food',     label: 'Питание', Icon: NavFood },
    { id: 'analysis', label: 'Анализ',  Icon: NavChart },
    { id: 'workout',  label: 'Тренинг', Icon: NavDumbbell },
    { id: 'profile',  label: 'Профиль', Icon: NavUser },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button onClick={() => setTab('profile')} style={{ width: 42, height: 42, borderRadius: 14, background: tab === 'profile' ? 'var(--accent)' : 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: tab === 'profile' ? '#000' : 'var(--accent)', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            {name.charAt(0).toUpperCase()}
          </button>
          <div>
            <div className={styles.headerGreet}>Добро пожаловать</div>
            <div className={styles.headerName}>{name}</div>
          </div>
        </div>
        <button className={styles.signOutBtn} onClick={signOut}>
          <LogOut size={16} color="var(--text-muted)" />
        </button>
      </div>

      <div className={styles.content}>
        {tab === 'home'     && <HomeScreen     state={state} dispatch={dispatch} goTo={setTab} aiCall={aiCall} name={name} />}
        {tab === 'food'     && <FoodScreen     state={state} dispatch={dispatch} aiCall={aiCall} />}
        {tab === 'analysis' && <AnalysisScreen state={state} aiCall={aiCall} />}
        {tab === 'workout'  && <WorkoutScreen  state={state} dispatch={dispatch} aiCall={aiCall} />}
        {tab === 'profile'  && <ProfileScreen  profile={profile} saveProfile={saveProfile} />}
      </div>

      <div className={styles.bottomNav}>
        {tabs.map(({ id, label, Icon }) => {
          const isActive = tab === id
          return (
            <button key={id} onClick={() => setTab(id)} className={styles.navBtn}>
              <Icon color={isActive ? 'var(--accent)' : 'var(--text-muted)'} size={22} />
              <span style={{ fontSize: 10, color: isActive ? 'var(--accent)' : 'var(--text-muted)', fontWeight: isActive ? 600 : 400, marginTop: 3 }}>{label}</span>
              {isActive && <div className={styles.navDot} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
