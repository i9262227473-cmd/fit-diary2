import React, { useState } from 'react'
import { useStore } from '../../store'
import { Dumbbell, ChevronLeft, ChevronRight, Clock, Plus, X, Flame, Check } from 'lucide-react'
import styles from './PlanTab.module.css'
import Paywall from '../../components/Paywall'

const DAYS_RU = [
  { key: 'mon', label: 'Понедельник', short: 'Пн' },
  { key: 'tue', label: 'Вторник',     short: 'Вт' },
  { key: 'wed', label: 'Среда',       short: 'Ср' },
  { key: 'thu', label: 'Четверг',     short: 'Чт' },
  { key: 'fri', label: 'Пятница',     short: 'Пт' },
  { key: 'sat', label: 'Суббота',     short: 'Сб' },
  { key: 'sun', label: 'Воскресенье', short: 'Вс' },
]

const TYPE_COLOR = { strength: 'var(--gold)', cardio: '#4facfe', rest: 'var(--text3)' }

const STYLES = [
  { id: 'split',    label: 'Сплит',           desc: 'Разные мышечные группы по дням' },
  { id: 'fullbody', label: 'Full Body',        desc: 'Всё тело за одну тренировку' },
  { id: 'superset', label: 'Суперсеты',        desc: 'Пары упражнений без отдыха' },
  { id: 'mixed',    label: 'Комбинирование',   desc: 'Сплит + Full Body + Суперсеты' },
]

export default function PlanTab() {
  const { profile, aiCall, saveProfile, setPaywallOpen } = useStore()
  const [plan, setPlan] = useState(() => {
    try { return JSON.parse(localStorage.getItem('workout-plan-v1') || 'null') } catch { return null }
  })
  const [loading, setLoading] = useState(false)
  const [openDay, setOpenDay] = useState(null)
  const [editingDay, setEditingDay] = useState(null)
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [showStylePicker, setShowStylePicker] = useState(false)
  const [trainStyle, setTrainStyle] = useState(() => localStorage.getItem('train-style') || 'split')
  const [paywallReason, setPaywallReason] = useState(null)

  const generatePlan = async (style) => {
    const s = style || trainStyle
    localStorage.setItem('train-style', s)
    setTrainStyle(s)
    setShowStylePicker(false)
    setLoading(true)

    try {
      const p = profile || {}
      const levelMap = { beginner: 'начинающий', amateur: 'средний', advanced: 'продвинутый', professional: 'профессиональный спортсмен' }
      const level = levelMap[p.level] || 'средний'
      const goalsMap = { weight_loss: 'похудение', muscle_gain: 'набор мышечной массы', maintenance: 'поддержание формы', endurance: 'выносливость', strength: 'сила', health: 'улучшение здоровья' }
      const goals = Array.isArray(p.goals) ? p.goals.map(g => goalsMap[g] || g).join(', ') : 'поддержание'
      const limitations = p.hasLimitations ? p.limitationsText : 'нет'
      const gender = p.gender === 'male' ? 'мужчина' : 'женщина'
      const styleMap = { split: 'сплит (разные мышечные группы по дням)', fullbody: 'Full Body (всё тело за одну тренировку)', superset: 'суперсеты (пары упражнений без отдыха)', mixed: 'комбинирование сплит+Full Body+суперсеты' }
      const styleLabel = styleMap[s] || 'сплит'
      const exCountMap = {
        beginner:     '6-7 упражнений за тренировку, 3-4 тренировки/неделю, 45-60 мин, рекомендуется Full Body',
        amateur:      '6-9 упражнений (3-4 большие + 2-3 малые группы), 4-5 тренировок/неделю, 60-75 мин',
        advanced:     '8-12 упражнений (4-5 большие + 3-4 малые + суперсеты), 5-6 тренировок/неделю, 60-90 мин',
        professional: '10-14 упражнений, 5-6 тренировок/неделю, 75-90 мин, прогрессия и периодизация',
      }
      const exCount = exCountMap[p.level] || exCountMap.amateur

      const prompt = `Составь недельный план тренировок для ${gender}, ${p.age} лет, вес ${p.weight} кг, рост ${p.height} см, уровень: ${level}, цель: ${goals}. Учитывай хронические заболевания/травмы: ${limitations}. Стиль тренировок: ${styleLabel}. Требования по количеству упражнений: ${exCount}.

Включи: разминку/заминку с точным временем (мин), упражнения с подходами, повторениями, отдыхом в секундах, краткой техникой выполнения, прогрессию нагрузки, чередование силовых и кардио, альтернативные упражнения при ограничениях. Поле weight оставь пустым — пользователь заполнит сам.

Верни ТОЛЬКО JSON без markdown:
{
  "mon": {
    "name": "Название тренировки",
    "type": "strength",
    "duration": 70,
    "warmup": "5 мин: ...",
    "exercises": [
      { "name": "...", "sets": 4, "reps": "8-10", "rest": "90", "weight": "", "technique": "краткая техника", "notes": "прогрессия или суперсет" }
    ],
    "cooldown": "10 мин: ...",
    "notes": "Почему план подходит для цели"
  },
  "tue": { ... },
  "wed": { ... },
  "thu": { ... },
  "fri": { ... },
  "sat": { ... },
  "sun": { "name": "Отдых", "type": "rest", "duration": 0, "warmup": "", "exercises": [], "cooldown": "", "notes": "Активное восстановление" }
}`

      const reply = await aiCall([{ role: 'user', content: prompt }], 4000)
      const clean = reply.replace(/```json|```/g, '').trim()
      const jsonMatch = clean.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON')
      const parsed = JSON.parse(jsonMatch[0])
      setPlan(parsed)
      localStorage.setItem('workout-plan-v1', JSON.stringify(parsed))
    } catch (e) {
      if (e.code === 'PAYWALL' || e.code === 'PAYWALL_LIMIT') {
        setPaywallReason(e.code)
        setPaywallOpen(true)
      } else {
        console.error(e)
        alert('Не удалось создать план. Попробуйте ещё раз.')
      }
    } finally {
      setLoading(false)
    }
  }

  const updateExercise = (day, idx, field, value) => {
    const updated = { ...plan, [day]: { ...plan[day], exercises: plan[day].exercises.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex) } }
    setPlan(updated)
    localStorage.setItem('workout-plan-v1', JSON.stringify(updated))
  }

  const removeExercise = (day, idx) => {
    const updated = { ...plan, [day]: { ...plan[day], exercises: plan[day].exercises.filter((_, i) => i !== idx) } }
    setPlan(updated)
    localStorage.setItem('workout-plan-v1', JSON.stringify(updated))
  }

  const addExercise = (day) => {
    const updated = { ...plan, [day]: { ...plan[day], exercises: [...(plan[day].exercises || []), { name: 'Новое упражнение', sets: 3, reps: '10-12', rest: '60', weight: '', technique: '', notes: '' }] } }
    setPlan(updated)
    localStorage.setItem('workout-plan-v1', JSON.stringify(updated))
  }

  // ── Открытый день — полный экран ──
  if (openDay && plan?.[openDay]) {
    const d = plan[openDay]
    const dayInfo = DAYS_RU.find(x => x.key === openDay)
    const isEditing = editingDay === openDay
    const isRest = d.type === 'rest'

    return (
      <div className={styles.fullScreen}>
        <div className={styles.dayScreenHeader}>
          <button className={styles.backBtn} onClick={() => { setOpenDay(null); setEditingDay(null) }}>
            <ChevronLeft size={20} />
          </button>
          <div style={{ flex: 1 }}>
            <div className={styles.dayScreenName}>{dayInfo?.label}</div>
            <div className={styles.dayScreenTitle}>{d.name}</div>
          </div>
          {!isRest && (
            <button className={styles.editDayBtn} onClick={() => setEditingDay(isEditing ? null : openDay)}>
              {isEditing ? <Check size={16} /> : '✏️'}
            </button>
          )}
        </div>

        <div className={styles.dayScreenContent}>
          {!isRest && d.duration > 0 && (
            <div className={styles.durationRow}>
              <Clock size={14} color="var(--text3)" />
              <span>{d.duration} мин</span>
            </div>
          )}

          {d.warmup && <div className={styles.warmup}><Flame size={13} color="var(--orange)" /> {d.warmup}</div>}

          {!isRest && d.exercises?.length > 0 && (
            <div className={styles.exerciseList}>
              {d.exercises.map((ex, i) => (
                <div key={i} className={styles.exercise}>
                  <div className={styles.exHeader}>
                    <div className={styles.exNum}>{i + 1}</div>
                    {isEditing ? (
                      <input className={styles.exNameInput} value={ex.name}
                        onChange={e => updateExercise(openDay, i, 'name', e.target.value)} />
                    ) : (
                      <div className={styles.exName}>{ex.name}</div>
                    )}
                    {isEditing && (
                      <button className={styles.removeExBtn} onClick={() => removeExercise(openDay, i)}>
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <div className={styles.exDetails}>
                    {isEditing ? (
                      <div className={styles.exEditRow}>
                        <div className={styles.exEditField}><span>Подходы</span>
                          <input type="number" value={ex.sets} onChange={e => updateExercise(openDay, i, 'sets', +e.target.value)} /></div>
                        <div className={styles.exEditField}><span>Повторения</span>
                          <input value={ex.reps} onChange={e => updateExercise(openDay, i, 'reps', e.target.value)} /></div>
                        <div className={styles.exEditField}><span>Отдых (сек)</span>
                          <input value={ex.rest} onChange={e => updateExercise(openDay, i, 'rest', e.target.value)} /></div>
                        <div className={styles.exEditField}><span>Вес (кг)</span>
                          <input value={ex.weight} placeholder="введите вес" onChange={e => updateExercise(openDay, i, 'weight', e.target.value)} /></div>
                      </div>
                    ) : (
                      <>
                        <div className={styles.exChips}>
                          <span className={styles.chip}>{ex.sets} подх.</span>
                          <span className={styles.chip}>{ex.reps} повт.</span>
                          <span className={styles.chip}>{ex.rest} сек</span>
                          {ex.weight
                            ? <span className={`${styles.chip} ${styles.weightChip}`}>{ex.weight} кг</span>
                            : <button className={`${styles.chip} ${styles.weightEmpty}`}
                                onClick={() => setEditingDay(openDay)}>+ вес</button>}
                        </div>
                        {ex.technique && <div className={styles.exTechnique}>📌 {ex.technique}</div>}
                        {ex.notes && <div className={styles.exNotes}>{ex.notes}</div>}
                      </>
                    )}
                  </div>
                </div>
              ))}
              {isEditing && (
                <button className={styles.addExBtn} onClick={() => addExercise(openDay)}>
                  <Plus size={14} /> Добавить упражнение
                </button>
              )}
            </div>
          )}

          {d.cooldown && <div className={styles.cooldown}>{d.cooldown}</div>}
          {d.notes && <div className={styles.dayNotes}>{d.notes}</div>}
          {isRest && <div className={styles.restMsg}>Отдых и восстановление</div>}
        </div>
      </div>
    )
  }

  if (showProfileEdit) return <ProfileEdit onClose={() => setShowProfileEdit(false)} />

  // ── Выбор стиля тренировок ──
  if (showStylePicker) {
    return (
      <div>
        <div className={styles.editHeader}>
          <button className={styles.backBtn} onClick={() => setShowStylePicker(false)}>
            <ChevronLeft size={16} /> Назад
          </button>
          <div className={styles.editTitle}>Стиль тренировок</div>
        </div>
        <div className={styles.styleList}>
          {STYLES.map(s => (
            <button key={s.id} className={`${styles.styleRow} ${trainStyle === s.id ? styles.styleActive : ''}`}
              onClick={() => generatePlan(s.id)}>
              <div>
                <div className={styles.styleLabel}>{s.label}</div>
                <div className={styles.styleDesc}>{s.desc}</div>
              </div>
              {trainStyle === s.id && <Check size={18} color="var(--gold)" />}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Главный экран ──
  return (
    <div>
      <div className={styles.header}>
        <div className={styles.headerTitle}>Мой план</div>
        <button className={styles.editProfileBtn} onClick={() => setShowProfileEdit(true)}>Профиль</button>
      </div>

      {profile && (
        <div className={styles.profileCard}>
          <div className={styles.profileRow}>
            <span>{profile.level}</span>
            <span>ИМТ {profile.bmi}</span>
            {profile.hasLimitations && <span style={{ color: 'var(--orange)' }}>Ограничения</span>}
          </div>
          <div className={styles.profileNorms}>
            <div>{profile.calorieGoal} ккал</div>
            <div>Б:{profile.proteinGoal}г</div>
            <div>Ж:{profile.fatGoal}г</div>
            <div>У:{profile.carbGoal}г</div>
          </div>
        </div>
      )}

      {/* Стиль тренировок */}
      <button className={styles.stylePicker} onClick={() => setShowStylePicker(true)}>
        <div>
          <div className={styles.stylePickerLabel}>Стиль тренировок</div>
          <div className={styles.stylePickerValue}>{STYLES.find(s => s.id === trainStyle)?.label || 'Сплит'}</div>
        </div>
        <ChevronRight size={16} color="var(--text3)" />
      </button>

      <button className={styles.generateBtn} onClick={() => generatePlan()} disabled={loading}>
        <Dumbbell size={16} color="#000" strokeWidth={2.5} />
        {loading ? 'Создаю план...' : plan ? 'Перестроить план' : 'Создать план AI'}
      </button>

      {plan && (
        <div className={styles.dayList}>
          {DAYS_RU.map(({ key, label, short }) => {
            const d = plan[key]
            if (!d) return null
            const isRest = d.type === 'rest'
            const color = TYPE_COLOR[d.type] || 'var(--text3)'
            return (
              <button key={key} className={styles.dayRow} onClick={() => setOpenDay(key)}>
                <div className={styles.dayRowLeft}>
                  <div className={styles.dayShort} style={{ color }}>{short}</div>
                  <div>
                    <div className={styles.dayRowName}>{label}</div>
                    <div className={styles.dayRowTitle}>{d.name}</div>
                  </div>
                </div>
                <div className={styles.dayRowRight}>
                  {!isRest && d.duration > 0 && <span className={styles.dayRowDuration}>{d.duration} мин</span>}
                  {!isRest && d.exercises?.length > 0 && <span className={styles.dayRowExCount}>{d.exercises.length} упр.</span>}
                  <ChevronRight size={16} color="var(--text3)" />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {!plan && !loading && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}><Dumbbell size={52} color="var(--text3)" strokeWidth={1} /></div>
          <div>Выберите стиль и нажмите кнопку<br />AI составит персональный план</div>
        </div>
      )}

      {paywallReason && <Paywall reason={paywallReason} onClose={() => setPaywallReason(null)} />}
    </div>
  )
}

function ProfileEdit({ onClose }) {
  const { profile, saveProfile } = useStore()
  const [data, setData] = useState({
    age: profile?.age || '',
    weight: profile?.weight || '',
    height: profile?.height || '',
    activity: profile?.activity || 'moderate',
    goals: profile?.goals || [],
    hasLimitations: profile?.hasLimitations || false,
    limitationsText: profile?.limitationsText || '',
  })
  const GOALS = [
    { value: 'weight_loss', label: 'Похудение' },
    { value: 'muscle_gain', label: 'Набор массы' },
    { value: 'maintenance', label: 'Поддержание' },
    { value: 'endurance', label: 'Выносливость' },
    { value: 'strength', label: 'Сила' },
    { value: 'health', label: 'Здоровье' },
  ]
  const ACTIVITIES = [
    { value: 'sedentary', label: 'Сидячий образ жизни' },
    { value: 'light', label: 'Лёгкая (1-3 тр/нед)' },
    { value: 'moderate', label: 'Умеренная (3-5 тр/нед)' },
    { value: 'active', label: 'Высокая (6-7 тр/нед)' },
    { value: 'very_active', label: 'Очень высокая' },
  ]
  const toggleGoal = (g) => setData(d => ({ ...d, goals: d.goals.includes(g) ? d.goals.filter(x => x !== g) : [...d.goals, g] }))
  const handleSave = async () => {
    const w = +data.weight, h = +data.height, a = +data.age
    const gender = profile?.gender || 'male'
    const bmr = gender === 'male' ? 10*w + 6.25*h - 5*a + 5 : 10*w + 6.25*h - 5*a - 161
    const factors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }
    const tdee = Math.round(bmr * (factors[data.activity] || 1.55))
    const proteinGoal = Math.round(w * (profile?.level === 'professional' ? 2.2 : 1.8))
    const fatGoal = Math.round(tdee * 0.25 / 9)
    const carbGoal = Math.round((tdee - proteinGoal * 4 - fatGoal * 9) / 4)
    const bmi = (w / ((h / 100) ** 2)).toFixed(1)
    await saveProfile({ ...profile, ...data, calorieGoal: tdee, proteinGoal, fatGoal, carbGoal, bmi })
    onClose()
  }
  return (
    <div>
      <div className={styles.editHeader}>
        <button className={styles.backBtn} onClick={onClose}><ChevronLeft size={16} /> Назад</button>
        <div className={styles.editTitle}>Изменить профиль</div>
      </div>
      <div className="field"><div className="field-label">Возраст</div>
        <input className="field-input" type="number" value={data.age} onChange={e => setData(d => ({ ...d, age: e.target.value }))} /></div>
      <div className={styles.rowTwo}>
        <div className="field"><div className="field-label">Вес (кг)</div>
          <input className="field-input" type="number" value={data.weight} onChange={e => setData(d => ({ ...d, weight: e.target.value }))} /></div>
        <div className="field"><div className="field-label">Рост (см)</div>
          <input className="field-input" type="number" value={data.height} onChange={e => setData(d => ({ ...d, height: e.target.value }))} /></div>
      </div>
      <div className="field"><div className="field-label">Активность</div>
        <select className="field-input" value={data.activity} onChange={e => setData(d => ({ ...d, activity: e.target.value }))}>
          {ACTIVITIES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </div>
      <div className="field"><div className="field-label">Цели</div>
        <div className={styles.goalsGrid}>{GOALS.map(g => (
          <button key={g.value} className={`${styles.goalBtn} ${data.goals.includes(g.value) ? styles.goalActive : ''}`}
            onClick={() => toggleGoal(g.value)}>{g.label}</button>
        ))}</div>
      </div>
      <div className="field"><div className="field-label">Ограничения</div>
        <div className={styles.limitRow}>
          <button className={`${styles.limitBtn} ${!data.hasLimitations ? styles.limitActive : ''}`}
            onClick={() => setData(d => ({ ...d, hasLimitations: false }))}>Нет</button>
          <button className={`${styles.limitBtn} ${data.hasLimitations ? styles.limitActive : ''}`}
            onClick={() => setData(d => ({ ...d, hasLimitations: true }))}>Есть</button>
        </div>
        {data.hasLimitations && <textarea className={styles.limitText} rows={3} placeholder="Опишите ограничения..."
          value={data.limitationsText} onChange={e => setData(d => ({ ...d, limitationsText: e.target.value }))} />}
      </div>
      <button className="btn-primary" onClick={handleSave}>Сохранить</button>
    </div>
  )
}
