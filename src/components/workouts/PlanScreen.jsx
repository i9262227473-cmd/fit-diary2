import React, { useState } from 'react'
import { ChevronLeft, Edit2, Play } from 'lucide-react'
import { normReps } from '../../pages/planUtils'

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

// ─── PLAN SCREEN ─────────────────────────────────────────────────────────────
export default function PlanScreen({ onBack, aiCall, profile, onStartWorkout }) {
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
