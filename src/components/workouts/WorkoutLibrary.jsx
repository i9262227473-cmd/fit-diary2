import { useState } from 'react'
import { ChevronLeft, Clock, Dumbbell, Home, Play, Repeat, ShieldAlert, Sparkles, Target } from 'lucide-react'
import { CURATED_PROGRAM_CATEGORIES, CURATED_WORKOUT_PROGRAMS, getCuratedProgramFit } from '../../data/workoutPrograms'

const PLACE_LABEL = { gym: 'Зал', home: 'Дома', both: 'Зал или дома' }
const LEVEL_COLOR = { 'Новичок': '#6fcaa0', 'Средний': '#f59e0b', 'Продвинутый': '#ef4444' }

// Библиотека готовых программ тренировок — открывается как справочник:
// можно посмотреть методику и состав любой программы, а кнопка «Начать»
// подставляет её упражнения в конструктор через тот же механизм, что и
// сохранённые шаблоны тренировок (см. startFromTemplate в useWorkout.js).
export default function WorkoutLibrary({ onBack, onStart, profile }) {
  const [activeCategory, setActiveCategory] = useState('recommended')
  const [selectedProgram, setSelectedProgram] = useState(null)

  const visiblePrograms = CURATED_WORKOUT_PROGRAMS
    .filter(p => activeCategory === 'recommended' ? getCuratedProgramFit(p, profile).recommended : activeCategory === 'all' || p.category === activeCategory)
    .sort((a, b) => Number(getCuratedProgramFit(b, profile).recommended) - Number(getCuratedProgramFit(a, profile).recommended))

  if (selectedProgram) {
    const p = selectedProgram
    const days = p.days || []
    const allExercises = days.flatMap(d => d.exercises || [])
    const muscles = [...new Set(allExercises.map(e => e.muscle).filter(Boolean))]
    const fit = getCuratedProgramFit(p, profile)
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
            <span style={{ fontSize: 13, fontWeight: 700 }}>Тренировочные дни</span>
            <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)' }}>{days.length} {days.length === 1 ? 'день' : 'дня'}{muscles.length ? ' · ' + muscles.join(', ') : ''}</span>
          </div>
          {days.map((d, dayIndex) => (
            <div key={d.name} style={{ padding: '13px 14px', borderBottom: dayIndex < days.length - 1 ? '1px solid #232323' : 'none' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#f5f5f5', fontWeight: 700, flex: 1 }}>{dayIndex + 1}. {d.name}</span>
                <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'var(--mono)' }}>{d.exercises.length} упр.</span>
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.45, marginBottom: 10 }}>{d.exercises.map(e => e.name).join(' · ')}</div>
              <button onClick={() => onStart(p, d, dayIndex)} style={{ width: '100%', border: '1px solid var(--accent)', color: 'var(--accent)', background: 'transparent', borderRadius: 10, padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Начать этот день</button>
            </div>
          ))}
        </div>
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
        {CURATED_PROGRAM_CATEGORIES.map(c => (
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
        <button key={p.id} onClick={() => setSelectedProgram(p)} style={{ textAlign: 'left', background: '#1a1a1a', border: `1px solid ${getCuratedProgramFit(p, profile).recommended ? 'rgba(111,202,160,.45)' : '#2e2e2e'}`, borderRadius: 16, padding: '14px 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#f5f5f5' }}>{p.name}</span>
            <span style={{ padding: '3px 9px', borderRadius: 7, fontSize: 10, fontWeight: 700, flexShrink: 0, background: '#161616', border: `1px solid ${LEVEL_COLOR[p.level] || '#2e2e2e'}`, color: LEVEL_COLOR[p.level] || '#9ca3af' }}>{p.level}</span>
          </div>
          <span style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.4 }}>{p.description}</span>
          <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'var(--mono)' }}>{PLACE_LABEL[p.place] || p.place} · {p.duration} · {p.days.length} {p.days.length === 1 ? 'день' : 'дня'}</span>
          {getCuratedProgramFit(p, profile).recommended && <span style={{ fontSize: 11, fontWeight: 700, color: '#8ed9aa' }}>Подходит вашему профилю</span>}
        </button>
      ))}
    </div>
  )
}
