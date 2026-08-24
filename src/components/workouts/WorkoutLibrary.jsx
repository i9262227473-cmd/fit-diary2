import { useState } from 'react'
import { ChevronLeft, Clock, Dumbbell, Home, Play, Repeat, ShieldAlert, Sparkles, Target } from 'lucide-react'
import { getProgramFit, PROGRAM_CATEGORIES, WORKOUT_PROGRAMS } from '../../data/workoutPrograms'

const PLACE_LABEL = { gym: 'Зал', home: 'Дома', both: 'Зал или дома' }
const LEVEL_COLOR = { 'Новичок': '#6fcaa0', 'Средний': '#f59e0b', 'Продвинутый': '#ef4444' }

// Библиотека готовых программ тренировок — открывается как справочник:
// можно посмотреть методику и состав любой программы, а кнопка «Начать»
// подставляет её упражнения в конструктор через тот же механизм, что и
// сохранённые шаблоны тренировок (см. startFromTemplate в useWorkout.js).
export default function WorkoutLibrary({ onBack, onStart, profile }) {
  const [activeCategory, setActiveCategory] = useState('recommended')
  const [selectedProgram, setSelectedProgram] = useState(null)

  const visiblePrograms = WORKOUT_PROGRAMS
    .filter(p => activeCategory === 'recommended' ? getProgramFit(p, profile).recommended : activeCategory === 'all' || p.category === activeCategory)
    .sort((a, b) => Number(getProgramFit(b, profile).recommended) - Number(getProgramFit(a, profile).recommended))

  if (selectedProgram) {
    const p = selectedProgram
    const muscles = [...new Set(p.exercises.map(e => e.muscle).filter(Boolean))]
    const fit = getProgramFit(p, profile)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 90 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setSelectedProgram(null)} style={{ width: 36, height: 36, borderRadius: 10, background: '#1a1a1a', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={18} color="#9ca3af" />
          </button>
          <span style={{ fontSize: 18, fontWeight: 700 }}>{p.name}</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#1a1a1a', border: `1px solid ${LEVEL_COLOR[p.level] || '#2e2e2e'}`, color: LEVEL_COLOR[p.level] || '#9ca3af' }}>
            <Target size={13} /> {p.level}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#1a1a1a', border: '1px solid #2e2e2e', color: '#9ca3af' }}>
            <Home size={13} /> {PLACE_LABEL[p.place] || p.place}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#1a1a1a', border: '1px solid #2e2e2e', color: '#9ca3af' }}>
            <Clock size={13} /> {p.duration}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#1a1a1a', border: '1px solid #2e2e2e', color: '#9ca3af' }}>
            <Repeat size={13} /> {p.schedule}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', background: fit.recommended ? 'rgba(111,202,160,.10)' : 'rgba(245,158,11,.10)', border: `1px solid ${fit.recommended ? 'rgba(111,202,160,.35)' : 'rgba(245,158,11,.35)'}`, borderRadius: 13, padding: '11px 12px', color: fit.recommended ? '#a7e5bf' : '#f6c46b', fontSize: 12, lineHeight: 1.45 }}>
          {fit.recommended ? <Sparkles size={16} style={{ flexShrink: 0, marginTop: 1 }} /> : <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} />}
          <span>{fit.reason}</span>
        </div>

        <div style={{ background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: 16, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>Цель</div>
          <div style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.5, marginBottom: 14 }}>{p.goal}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>Как это работает</div>
          <div style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.6 }}>{p.methodology}</div>
        </div>

        <div style={{ background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Упражнения</span>
            <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)' }}>{p.exercises.length} шт.{muscles.length ? ' · ' + muscles.join(', ') : ''}</span>
          </div>
          {p.exercises.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: i < p.exercises.length - 1 ? '1px solid #232323' : 'none' }}>
              <span style={{ padding: '2px 8px', borderRadius: 50, fontSize: 10, color: '#000', background: 'var(--accent)', flexShrink: 0, fontWeight: 700 }}>{e.muscle}</span>
              <span style={{ fontSize: 13, color: '#f5f5f5', flex: 1, minWidth: 0 }}>{e.name}</span>
              <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)', flexShrink: 0 }}>{e.sets.length}×{e.targetReps}</span>
            </div>
          ))}
        </div>

        <button onClick={() => onStart(p)} style={{ position: 'sticky', bottom: 14, background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 14, padding: '15px', fontSize: 14, fontWeight: 700, width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: 0.5, boxShadow: '0 8px 20px rgba(0,0,0,0.35)' }}>
          <Play size={16} /> Начать
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 10, background: '#1a1a1a', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={18} color="#9ca3af" />
        </button>
        <span style={{ fontSize: 18, fontWeight: 700 }}>Программы</span>
      </div>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        <button onClick={() => setActiveCategory('recommended')} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 11, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: activeCategory === 'recommended' ? 'var(--accent)' : '#1a1a1a', color: activeCategory === 'recommended' ? '#000' : '#9ca3af', border: `1px solid ${activeCategory === 'recommended' ? 'var(--accent)' : '#2e2e2e'}` }}>
          Подходит мне
        </button>
        <button onClick={() => setActiveCategory('all')} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 11, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: activeCategory === 'all' ? 'var(--accent)' : '#1a1a1a', color: activeCategory === 'all' ? '#000' : '#9ca3af', border: `1px solid ${activeCategory === 'all' ? 'var(--accent)' : '#2e2e2e'}` }}>
          Все
        </button>
        {PROGRAM_CATEGORIES.map(c => (
          <button key={c.key} onClick={() => setActiveCategory(c.key)} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 11, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', background: activeCategory === c.key ? 'var(--accent)' : '#1a1a1a', color: activeCategory === c.key ? '#000' : '#9ca3af', border: `1px solid ${activeCategory === c.key ? 'var(--accent)' : '#2e2e2e'}` }}>
            {c.label}
          </button>
        ))}
      </div>

      {visiblePrograms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: '#6b7280' }}>
          <Dumbbell size={40} color="#2e2e2e" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: '#9ca3af' }}>{activeCategory === 'recommended' ? 'Заполните уровень и цель в профиле' : 'В этой категории пока пусто'}</div>
        </div>
      ) : visiblePrograms.map(p => (
        <button key={p.id} onClick={() => setSelectedProgram(p)} style={{ textAlign: 'left', background: '#1a1a1a', border: `1px solid ${getProgramFit(p, profile).recommended ? 'rgba(111,202,160,.45)' : '#2e2e2e'}`, borderRadius: 16, padding: '14px 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#f5f5f5' }}>{p.name}</span>
            <span style={{ padding: '3px 9px', borderRadius: 7, fontSize: 10, fontWeight: 700, flexShrink: 0, background: '#161616', border: `1px solid ${LEVEL_COLOR[p.level] || '#2e2e2e'}`, color: LEVEL_COLOR[p.level] || '#9ca3af' }}>{p.level}</span>
          </div>
          <span style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.4 }}>{p.description}</span>
          <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'var(--mono)' }}>{PLACE_LABEL[p.place] || p.place} · {p.duration} · {p.exercises.length} упр.</span>
          {getProgramFit(p, profile).recommended && <span style={{ fontSize: 11, fontWeight: 700, color: '#8ed9aa' }}>Подходит вашему профилю</span>}
        </button>
      ))}
    </div>
  )
}
