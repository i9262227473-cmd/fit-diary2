import { useEffect, useRef, useState } from 'react'
import { normReps } from '../pages/planUtils'
import { saveExerciseResult, suggestWeightFor, acceptProgression } from '../pages/progressTracking'
import { EXERCISE_DB, MUSCLE_GROUPS, EFF_ORDER, findExerciseByName } from '../data/exerciseDatabase'
import { createStableId as uid, getDefaultRestSeconds as getDefaultRestSec } from '../utils/workoutUi'
import { useStore } from '../store'
import { syncWorkoutData, syncExerciseProgress } from '../data/workoutSync'
import { estimateWorkoutCalories, estimateActiveWorkoutCalories } from '../utils/workoutCalories'

// Отправить план/шаблоны или прогрессию на сервер в фоне (не блокируя UI).
// Раньше это жило только в localStorage и терялось при смене устройства.
const syncPlanInBackground = () => {
  useStore.getState().getValidToken().then(syncWorkoutData).catch(() => {})
}
const syncProgressInBackground = () => {
  useStore.getState().getValidToken().then(syncExerciseProgress).catch(() => {})
}

const WK_DRAFT_KEY = 'workout-draft-v1'
const PLAN_KEY = 'workout-plan-v4-pro'
const TEMPLATES_KEY = 'workout-templates-v1'
const LAST_USED_SOURCE_KEY = 'workout-last-used-source-v1'
const CUSTOM_PLANS_KEY = 'workout-custom-plans-v1'
const AI_PLAN_PROGRESS_KEY = 'workout-plan-progress-v1'

// Метка «откуда реально запустили последнюю тренировку» — читается на
// главном экране «Тренировки» для карточки «Следующая тренировка», чтобы
// она предлагала последний использованный источник (свой шаблон/AI-план/
// повтор из истории), а не всегда AI-план, даже если у пользователя есть
// собственные шаблоны.
function markLastUsedSource(kind, id) {
  try { localStorage.setItem(LAST_USED_SOURCE_KEY, JSON.stringify({ kind, id: id ?? null, ts: Date.now() })) } catch {}
}

function getCustomPlans() {
  try {
    const raw = localStorage.getItem(CUSTOM_PLANS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}
function saveCustomPlansList(list) {
  try { localStorage.setItem(CUSTOM_PLANS_KEY, JSON.stringify(list)) } catch (e) { console.warn('saveCustomPlans error', e) }
}

// Указатель «на каком дне остановились» — свой для AI-плана (в localStorage)
// и для каждого «Своего плана» (в самом объекте плана, поле progressIndex).
// Продвигается только по факту завершённой и сохранённой тренировки, а не по
// дню недели — чтобы пропущенный день не сбивал план, он просто ждёт дальше.
export function getAiPlanProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(AI_PLAN_PROGRESS_KEY) || 'null')
    return typeof raw?.dayIndex === 'number' ? raw.dayIndex : 0
  } catch { return 0 }
}
function setAiPlanProgressIndex(dayIndex) {
  try { localStorage.setItem(AI_PLAN_PROGRESS_KEY, JSON.stringify({ dayIndex })) } catch {}
}
// Следующий день с упражнениями после completedIndex (по кругу, начиная со
// следующего). Если во всех днях пусто — вернёт completedIndex без изменений.
export function nextDayIndexWithExercises(days, completedIndex) {
  if (!Array.isArray(days) || !days.length) return 0
  for (let step = 1; step <= days.length; step += 1) {
    const idx = (completedIndex + step) % days.length
    if (days[idx]?.exercises?.length) return idx
  }
  return completedIndex
}
function advanceAiPlanProgress(completedDayIdx) {
  try {
    const savedPlan = JSON.parse(localStorage.getItem(PLAN_KEY) || 'null')
    const days = savedPlan?.plan?.days
    if (!Array.isArray(days) || !days.length) return
    setAiPlanProgressIndex(nextDayIndexWithExercises(days, completedDayIdx))
  } catch {}
}

// Разобрать вставленный пользователем текст (план от тренера, скопированный
// откуда-то текст и т.п.) в дни с упражнениями через ИИ. Возвращает массив
// дней в том же формате хранения, что и у шаблонов ({name, exercises:[...]}),
// либо бросает исключение, если ИИ не смог вернуть валидный результат.
export async function parseTextToDays(text, aiCall) {
  if (!aiCall || !text?.trim()) throw new Error('empty')
  const prompt = `Ты помогаешь разобрать текст тренировочного плана (может быть скопирован из любого источника — от тренера, из интернета, произвольные заметки) в строгий JSON.

Текст:
"""
${text.trim()}
"""

Верни ТОЛЬКО JSON без markdown и пояснений, вот в такой форме:
{"days":[{"name":"Название дня (например: День 1 — Спина и бицепс)","exercises":[{"name":"Название упражнения на русском","sets":3,"reps":"8-12","restSec":90}]}]}

Правила:
- Если в тексте несколько тренировочных дней — верни несколько объектов в "days".
- Если день один — верни один объект.
- "sets" — целое число подходов. "reps" — строка (например "8-12" или "10").
- "restSec" — отдых в секундах между подходами, если не указано — поставь разумное значение (60-120) по типу упражнения.
- Название упражнения переведи на русский и пиши в общепринятой форме.
- Не выдумывай упражнения, которых нет в тексте.`
  const reply = await aiCall([{ role: 'user', content: prompt }], 1200)
  const cleaned = (reply || '').replace(/```json/gi, '').replace(/```/g, '').trim()
  const jsonStart = cleaned.indexOf('{')
  const jsonEnd = cleaned.lastIndexOf('}')
  if (jsonStart === -1 || jsonEnd === -1) throw new Error('no-json')
  const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1))
  const rawDays = Array.isArray(parsed?.days) ? parsed.days : []
  const normalizedDays = rawDays.map(day => ({
    name: day.name || 'День',
    exercises: (Array.isArray(day.exercises) ? day.exercises : []).map(ex => {
      const dbEx = findExerciseByName(ex.name) || EXERCISE_DB.find(item => item.name.toLowerCase() === String(ex.name || '').toLowerCase())
      const reps = ex.reps ? String(ex.reps) : '8-12'
      const setsCount = Math.max(1, parseInt(ex.sets) || 3)
      const muscle = dbEx?.muscle || ex.muscle || 'Кор'
      return {
        exerciseId: dbEx?.id,
        name: dbEx?.name || ex.name || 'Упражнение',
        muscle,
        type: dbEx?.type || ex.type || 'compound',
        targetReps: reps,
        restSec: parseInt(ex.restSec) || getDefaultRestSec(muscle),
        sets: Array.from({ length: setsCount }, () => ({ reps, weight: '0' })),
      }
    }).filter(ex => ex.name),
  })).filter(day => day.exercises.length)
  if (!normalizedDays.length) throw new Error('empty-result')
  return normalizedDays
}

function getTemplates() {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}

function saveTemplatesList(list) {
  try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list)) } catch (e) { console.warn('saveTemplates error', e) }
}

function useBackgroundTimer(running, resetKey) {
  const [elapsed, setElapsed] = useState(0)
  const anchor = useRef({ startedAt: null, base: 0 })

  useEffect(() => {
    anchor.current = { startedAt: null, base: 0 }
    setElapsed(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  useEffect(() => {
    if (!running) {
      if (anchor.current.startedAt) {
        anchor.current.base += Math.floor((Date.now() - anchor.current.startedAt) / 1000)
        anchor.current.startedAt = null
      }
      return
    }
    anchor.current.startedAt = Date.now()
    const tick = () => {
      setElapsed(anchor.current.base + Math.floor((Date.now() - anchor.current.startedAt) / 1000))
    }
    tick()
    const id = setInterval(tick, 1000)
    const onVis = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', tick)
    }
  }, [running])

  const setManual = (sec) => {
    anchor.current = { startedAt: running ? Date.now() : null, base: sec }
    setElapsed(sec)
  }

  return [elapsed, setManual]
}

function useWakeLock(active) {
  const lockRef = useRef(null)
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return
    let released = false
    const request = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (released) { lock.release().catch(() => {}); return }
        lockRef.current = lock
      } catch {}
    }
    request()
    const onVis = () => { if (document.visibilityState === 'visible' && !lockRef.current) request() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVis)
      if (lockRef.current) { lockRef.current.release().catch(() => {}); lockRef.current = null }
    }
  }, [active])
}

export default function useWorkout({ state, dispatch, aiCall }) {
  const [view, setView] = useState('list')
  const [wk, setWk] = useState({ name: '', exercises: [] })
  const [exSearch, setExSearch] = useState('')
  const [timerResetKey, setTimerResetKey] = useState(0)
  const [running, setRunning] = useState(false)
  const [timer, setTimer] = useBackgroundTimer(running, timerResetKey)
  const resetTimer = () => { setTimerResetKey(k => k + 1); setTimer(0) }
  useWakeLock(view === 'active')

  // Незавершённый черновик из конструктора (упражнения добавлены, но тренировка
  // не начата и не сохранена). Раньше при заходе на вкладку сразу молча
  // перекидывало в конструктор — теперь просто показываем баннер на главном
  // экране, а конструктор открывается только по явному выбору пользователя.
  const [pendingDraft, setPendingDraft] = useState(null)

  const draftRestoredRef = useRef(false)
  useEffect(() => {
    if (draftRestoredRef.current) return
    draftRestoredRef.current = true
    try {
      const raw = localStorage.getItem(WK_DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw)
      if (!draft?.wk?.exercises?.length) return
      if (Date.now() - (draft.savedAt || 0) > 24 * 60 * 60 * 1000) { localStorage.removeItem(WK_DRAFT_KEY); return }
      if (draft.view === 'active') {
        // Тренировка реально идёт (таймер запущен) — сюда возвращаем сразу,
        // это ожидаемо: пользователь мог просто переключиться на другую вкладку.
        setWk(draft.wk)
        setTimer(draft.elapsedSec || 0)
        setRunning(true)
        setView('active')
      } else {
        // Тренировка не начата — просто предлагаем продолжить баннером,
        // не отбирая у пользователя главный экран вкладки.
        setPendingDraft(draft)
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const clearDraft = () => { try { localStorage.removeItem(WK_DRAFT_KEY) } catch {} }
  const resumeDraft = () => {
    if (!pendingDraft) return
    setWk(pendingDraft.wk)
    setPlanDayIdx(null)
    setCustomPlanCtx(null)
    setView('builder')
    setPendingDraft(null)
  }
  const discardDraft = () => {
    clearDraft()
    setPendingDraft(null)
  }
  // Редактирование уже завершённой тренировки из истории (свайп → «Изменить»).
  // Пока идёт редактирование, черновик в WK_DRAFT_KEY не пишем — иначе после
  // выхода без сохранения баннер «незавершённая тренировка» предложил бы
  // продолжить чужую отредактированную копию как новую тренировку.
  const [editingWorkout, setEditingWorkout] = useState(null)
  // id шаблона, который сейчас редактируется через «Изменить» в «Мои
  // тренировки» — null, если конструктор открыт не для редактирования шаблона.
  const [editingTemplateId, setEditingTemplateId] = useState(null)

  useEffect(() => {
    if (editingWorkout || editingTemplateId) return
    if (view !== 'builder' && view !== 'active') return
    if (!wk.exercises.length) { clearDraft(); return }
    try { localStorage.setItem(WK_DRAFT_KEY, JSON.stringify({ wk, view, elapsedSec: timer, savedAt: Date.now() })) } catch {}
  }, [wk, view, timer, editingWorkout, editingTemplateId])

  const [showRestTimer, setShowRestTimer] = useState(false)
  const [restInfo, setRestInfo] = useState({ exercise: '', setInfo: '', duration: 90 })
  const [showComplete, setShowComplete] = useState(false)
  const [swapFor, setSwapFor] = useState(null)
  const [planDayIdx, setPlanDayIdx] = useState(null)
  const [planSaved, setPlanSaved] = useState(false)
  const [viewWorkout, setViewWorkout] = useState(null)
  const [techFor, setTechFor] = useState(null)
  const [histMode, setHistMode] = useState('list')
  const [templates, setTemplates] = useState(() => getTemplates())
  const [tplSaved, setTplSaved] = useState(false)
  const [pickerFor, setPickerFor] = useState(null)
  const [pendingLoad, setPendingLoad] = useState(null)
  const [customPlans, setCustomPlans] = useState(() => getCustomPlans())
  // {planId, dayIdx} — какой день какого «Своего плана» сейчас активен, чтобы
  // при завершении тренировки продвинуть указатель именно у этого плана.
  const [customPlanCtx, setCustomPlanCtx] = useState(null)

  const today = new Date().toISOString().split('T')[0]
  const entry = state.entries.find(e => e.date === today) || { date: today, foods: [], workouts: [] }
  const allWorkouts = state.entries.flatMap(e => (e.workouts || []).map(w => ({ ...w, entryDate: e.date }))).sort((a, b) => b.entryDate.localeCompare(a.entryDate))
  const workoutsByDate = allWorkouts.reduce((acc, w) => { (acc[w.entryDate] = acc[w.entryDate] || []).push(w); return acc }, {})
  const workoutPlace = (() => { try { return localStorage.getItem('workout-place-v1') || 'gym' } catch { return 'gym' } })()
  const filteredEx = EXERCISE_DB
    .filter(e => workoutPlace === 'both' || e.place === 'both' || e.place === workoutPlace)
    .filter(e => e.name.toLowerCase().includes(exSearch.toLowerCase()) || e.muscle.toLowerCase().includes(exSearch.toLowerCase()))
    .sort((a, b) => {
      if (a.muscle !== b.muscle) return MUSCLE_GROUPS.indexOf(a.muscle) - MUSCLE_GROUPS.indexOf(b.muscle)
      return EFF_ORDER[a.eff] - EFF_ORDER[b.eff]
    })

  const addEx = ex => setWk(w => {
    const saved = suggestWeightFor(ex.name)
    const startWeight = saved?.weight ? String(saved.weight) : '0'
    return { ...w, exercises: [...w.exercises, { uid: uid(), exerciseId: ex.id, name: ex.name, muscle: ex.muscle, type: ex.type, targetReps: '8-12', restSec: getDefaultRestSec(ex.muscle), suggestedWeight: saved?.suggestedWeight || null, sets: [{ id: uid(), reps: '8-12', weight: startWeight, done: false }] }] }
  })
  // Переключатель для библиотеки упражнений в конструкторе: если упражнение
  // уже добавлено — убрать его (первое вхождение по exerciseId), иначе — добавить.
  const toggleEx = ex => setWk(w => {
    const idx = w.exercises.findIndex(e => e.exerciseId === ex.id)
    if (idx >= 0) return { ...w, exercises: w.exercises.filter((_, i) => i !== idx) }
    const saved = suggestWeightFor(ex.name)
    const startWeight = saved?.weight ? String(saved.weight) : '0'
    return { ...w, exercises: [...w.exercises, { uid: uid(), exerciseId: ex.id, name: ex.name, muscle: ex.muscle, type: ex.type, targetReps: '8-12', restSec: getDefaultRestSec(ex.muscle), suggestedWeight: saved?.suggestedWeight || null, sets: [{ id: uid(), reps: '8-12', weight: startWeight, done: false }] }] }
  })
  const updateRest = (eI, delta) => setWk(w => {
    const exs = [...w.exercises]
    const cur = exs[eI].restSec || getDefaultRestSec(exs[eI].muscle)
    const next = Math.max(15, Math.min(300, cur + delta))
    exs[eI] = { ...exs[eI], restSec: next }
    return { ...w, exercises: exs }
  })
  const updateSet = (eI, sI, field, val) => setWk(w => { const exs = [...w.exercises]; exs[eI] = { ...exs[eI], sets: exs[eI].sets.map((s, i) => i === sI ? { ...s, [field]: val } : s) }; return { ...w, exercises: exs } })
  const removeSet = (eI, sI) => setWk(w => {
    const exs = [...w.exercises]
    if (exs[eI].sets.length <= 1) return w
    exs[eI] = { ...exs[eI], sets: exs[eI].sets.filter((_, i) => i !== sI) }
    return { ...w, exercises: exs }
  })
  const moveExercise = (eI, dir) => setWk(w => {
    const exs = [...w.exercises]
    const j = eI + dir
    if (j < 0 || j >= exs.length) return w
    ;[exs[eI], exs[j]] = [exs[j], exs[eI]]
    return { ...w, exercises: exs }
  })
  // Полный новый порядок упражнений по их uid — используется при
  // перетаскивании (useDragReorder), в отличие от moveExercise (сдвиг на 1).
  const reorderExercises = (newOrderUids) => setWk(w => {
    const byUid = new Map(w.exercises.map(e => [e.uid, e]))
    const reordered = newOrderUids.map(id => byUid.get(id)).filter(Boolean)
    if (reordered.length !== w.exercises.length) return w
    return { ...w, exercises: reordered }
  })
  const updateComment = (eI, val) => setWk(w => { const exs = [...w.exercises]; exs[eI] = { ...exs[eI], comment: val }; return { ...w, exercises: exs } })
  const addSet = eI => setWk(w => { const exs = [...w.exercises]; const prev = exs[eI].sets[exs[eI].sets.length - 1]; exs[eI] = { ...exs[eI], sets: [...exs[eI].sets, { ...prev, id: uid(), done: false }] }; return { ...w, exercises: exs } })
  const removeEx = eI => setWk(w => ({ ...w, exercises: w.exercises.filter((_, i) => i !== eI) }))
  const replaceEx = (eI, newExercise) => setWk(w => { const exs = [...w.exercises]; exs[eI] = { ...exs[eI], exerciseId: newExercise.id, name: newExercise.name, muscle: newExercise.muscle, type: newExercise.type }; return { ...w, exercises: exs } })
  const applyProgression = (eI) => setWk(w => {
    const exs = [...w.exercises]
    const ex = exs[eI]
    if (!ex.suggestedWeight) return w
    const nw = acceptProgression(ex.name) || ex.suggestedWeight
    syncProgressInBackground()
    exs[eI] = { ...ex, suggestedWeight: null, sets: ex.sets.map(s => ({ ...s, weight: String(nw) })) }
    return { ...w, exercises: exs }
  })

  const saveToPlan = () => {
    if (planDayIdx === null) return
    try {
      const raw = localStorage.getItem(PLAN_KEY)
      if (!raw) return
      const plan = JSON.parse(raw)
      if (!plan?.plan?.days?.[planDayIdx]) return
      const oldDay = plan.plan.days[planDayIdx]
      plan.plan.days[planDayIdx] = {
        ...oldDay,
        exercises: wk.exercises.map((e, i) => {
          const old = oldDay.exercises?.[i] || {}
          const repsStr = e.sets?.[0]?.reps || '8-12'
          const [mn, mx] = String(repsStr).split('-').map(n => parseInt(n) || 10)
          return { ...old, name: e.name, muscle: e.muscle, type: e.type, sets: e.sets?.length || old.sets || 3, reps: { min: mn, max: mx || mn } }
        })
      }
      localStorage.setItem(PLAN_KEY, JSON.stringify(plan))
      setPlanSaved(true)
      setTimeout(() => setPlanSaved(false), 2000)
      syncPlanInBackground()
    } catch (e) { console.warn('saveToPlan error', e) }
  }

  const saveAsTemplate = () => {
    if (!wk.exercises.length) return
    const name = (wk.name || '').trim() || 'Моя тренировка'
    const tpl = {
      id: Date.now(), name, createdAt: new Date().toISOString().split('T')[0],
      exercises: wk.exercises.map(e => ({ exerciseId: e.exerciseId, name: e.name, muscle: e.muscle, type: e.type, targetReps: e.targetReps || e.sets?.[0]?.reps || '8-12', restSec: e.restSec || getDefaultRestSec(e.muscle), sets: e.sets.map(s => ({ reps: s.reps, weight: s.weight })) }))
    }
    const list = getTemplates()
    const idx = list.findIndex(t => t.name.toLowerCase() === name.toLowerCase())
    let next
    if (idx >= 0) { next = [...list]; next[idx] = { ...tpl, id: list[idx].id } } else next = [tpl, ...list]
    saveTemplatesList(next)
    setTemplates(next)
    setTplSaved(true)
    setTimeout(() => setTplSaved(false), 2000)
    syncPlanInBackground()
  }
  // Редактирование существующего шаблона — привязка к его id, а не к имени
  // (раньше «Изменить» полагался на совпадение названия при сохранении, и
  // если имя менялось при редактировании, вместо обновления создавался
  // дубликат шаблона).
  const startEditTemplate = (tpl) => {
    if (!tpl) return
    startFromTemplate(tpl, 'builder')
    setEditingTemplateId(tpl.id)
  }
  const cancelEditTemplate = () => {
    setEditingTemplateId(null)
    setWk({ name: '', exercises: [] })
    setView('templates')
  }
  const saveEditedTemplate = () => {
    if (!editingTemplateId || !wk.exercises.length) return
    const list = getTemplates()
    const idx = list.findIndex(t => t.id === editingTemplateId)
    if (idx === -1) { setEditingTemplateId(null); return }
    const name = (wk.name || '').trim() || 'Моя тренировка'
    const next = [...list]
    next[idx] = {
      ...list[idx],
      name,
      exercises: wk.exercises.map(e => ({ exerciseId: e.exerciseId, name: e.name, muscle: e.muscle, type: e.type, targetReps: e.targetReps || e.sets?.[0]?.reps || '8-12', restSec: e.restSec || getDefaultRestSec(e.muscle), sets: e.sets.map(s => ({ reps: s.reps, weight: s.weight })) })),
    }
    saveTemplatesList(next)
    setTemplates(next)
    setEditingTemplateId(null)
    setWk({ name: '', exercises: [] })
    setView('templates')
    syncPlanInBackground()
  }
  const deleteTemplate = (id) => {
    const next = getTemplates().filter(t => t.id !== id)
    saveTemplatesList(next)
    setTemplates(next)
    syncPlanInBackground()
  }

  // «Свои планы» — многодневные планы, собранные пользователем (вставкой
  // текста, распознаваемой ИИ, и/или добавлением уже сохранённых тренировок).
  // Хранятся отдельно от AI-плана и от одиночных шаблонов.
  const saveCustomPlan = (plan) => {
    if (!plan?.days?.length) return
    const list = getCustomPlans()
    const withDefaults = { id: plan.id || uid(), name: (plan.name || '').trim() || 'Мой план', days: plan.days, progressIndex: 0 }
    const idx = list.findIndex(p => p.id === withDefaults.id)
    // При редактировании состав/порядок дней мог измениться, поэтому указатель
    // «на каком дне остановились» сбрасываем на начало, а не пытаемся угадать,
    // куда он теперь соответствует.
    const next = idx === -1
      ? [withDefaults, ...list]
      : list.map((p, i) => i === idx ? { ...p, name: withDefaults.name, days: withDefaults.days, progressIndex: 0 } : p)
    saveCustomPlansList(next)
    setCustomPlans(next)
    syncPlanInBackground()
  }
  const deleteCustomPlan = (id) => {
    const next = getCustomPlans().filter(p => p.id !== id)
    saveCustomPlansList(next)
    setCustomPlans(next)
    syncPlanInBackground()
  }
  const applyCustomPlanDayLoad = (plan, dayIdx, mode, transferWeights) => {
    const day = plan?.days?.[dayIdx]
    if (!day) return
    setWk({ name: day.name || plan.name, exercises: buildExercisesFromTemplate({ exercises: day.exercises || [] }, transferWeights) })
    setPlanDayIdx(null); resetTimer()
    if (mode === 'builder') { setRunning(false); setView('builder') } else { setRunning(true); setView('active') }
    if (mode !== 'builder') { markLastUsedSource('customPlan', plan.id); setCustomPlanCtx({ planId: plan.id, dayIdx }) }
    else setCustomPlanCtx(null)
  }
  const startFromCustomPlanDay = (plan, dayIdx, mode = 'active') => {
    const day = plan?.days?.[dayIdx]
    if (!day) return
    // Раньше тут ошибочно проверяли "есть ли вес по этому упражнению в
    // истории" (suggestWeightFor) — это отдельный, не связанный кэш, из-за
    // чего свои же веса, сохранённые прямо в плане (при составлении из
    // своих тренировок), терялись, если этот кэш ещё пуст. Правильная
    // проверка — есть ли вес в самом плане.
    const hasOwnWeights = (day.exercises || []).some(ex => (ex.sets || []).some(s => Number(s.weight) > 0))
    if (hasOwnWeights) { setPendingLoad({ type: 'customPlanDay', plan, dayIdx, mode }); return }
    applyCustomPlanDayLoad(plan, dayIdx, mode, false)
  }
  const advanceCustomPlanProgress = (planId, completedDayIdx) => {
    setCustomPlans(prev => {
      const idx = prev.findIndex(p => p.id === planId)
      if (idx === -1) return prev
      const days = prev[idx].days || []
      const nextIdx = nextDayIndexWithExercises(days, completedDayIdx)
      const updated = [...prev]
      updated[idx] = { ...updated[idx], progressIndex: nextIdx }
      saveCustomPlansList(updated)
      return updated
    })
  }
  // Сбросить привязку конструктора к любому плану — используется, когда
  // пользователь начинает совершенно новую тренировку с нуля, чтобы старая
  // метка плана не продвинула чужой план по завершению.
  const clearPlanContext = () => { setPlanDayIdx(null); setCustomPlanCtx(null) }

  const buildExercisesFromTemplate = (tpl, transferWeights) => (tpl.exercises || []).map(ex => {
    const saved = suggestWeightFor(ex.name)
    return { uid: uid(), exerciseId: ex.exerciseId || Date.now() + Math.random(), name: ex.name, muscle: ex.muscle || 'Кор', type: ex.type || 'compound', targetReps: ex.targetReps || ex.sets?.[0]?.reps || '8-12', restSec: ex.restSec || getDefaultRestSec(ex.muscle || 'Кор'), suggestedWeight: saved?.suggestedWeight || null, sets: (ex.sets || [{ reps: '8-12', weight: '0' }]).map(s => ({ id: uid(), reps: s.reps, weight: transferWeights ? s.weight : '0', done: false })) }
  })
  const applyTemplateLoad = (tpl, mode, transferWeights, sourceKind = 'template', sourceId = tpl.id) => {
    setWk({ name: tpl.name, exercises: buildExercisesFromTemplate(tpl, transferWeights) })
    setPlanDayIdx(null); setCustomPlanCtx(null); resetTimer()
    if (mode === 'builder') { setRunning(false); setView('builder') } else { setRunning(true); setView('active') }
    // Только реальный старт тренировки (не открытие в конструкторе для правки
    // и не разовый запуск программы из библиотеки) обновляет метку последнего
    // источника для карточки «Следующая тренировка».
    if (mode !== 'builder' && sourceKind !== 'library') markLastUsedSource(sourceKind, sourceId)
  }
  const startFromTemplate = (tpl, mode = 'active', sourceKind = 'template', sourceId = tpl.id) => {
    if ((tpl.exercises || []).some(ex => suggestWeightFor(ex.name)?.weight)) { setPendingLoad({ type: 'template', tpl, mode, sourceKind, sourceId }); return }
    applyTemplateLoad(tpl, mode, false, sourceKind, sourceId)
  }
  const repeatWorkout = (workout, mode = 'active') => {
    if (!workout) return
    const details = workout.exercisesDetail?.length
      ? workout.exercisesDetail
      : (workout.exercises || []).map(name => ({ name }))
    const tpl = {
      id: `repeat-${workout.id || Date.now()}`,
      name: workout.name || workout.type || 'Тренировка',
      exercises: details.map(ex => {
        const dbEx = EXERCISE_DB.find(item => item.name.toLowerCase() === String(ex.name || '').toLowerCase())
        const sets = ex.sets?.length
          ? ex.sets.map(set => ({ reps: set.reps || '8-12', weight: set.weight || '0' }))
          : [{ reps: '8-12', weight: '0' }]
        return {
          exerciseId: dbEx?.id,
          name: ex.name,
          muscle: ex.muscle || dbEx?.muscle || 'Кор',
          type: ex.type || dbEx?.type || 'compound',
          targetReps: sets[0]?.reps || '8-12',
          restSec: ex.restSec || getDefaultRestSec(ex.muscle || dbEx?.muscle || 'Кор'),
          sets,
        }
      }).filter(ex => ex.name),
    }
    if (!tpl.exercises.length) return
    startFromTemplate(tpl, mode, 'history', workout.id)
  }
  const toggleSet = (eI, sI) => {
    const ex = wk.exercises[eI]
    const set = ex.sets[sI]
    if (!set.done) { setRestInfo({ exercise: ex.name, setInfo: `${sI + 1} подход из ${ex.sets.length}`, duration: ex.restSec || getDefaultRestSec(ex.muscle) }); setShowRestTimer(true) }
    setWk(w => { const exs = [...w.exercises]; exs[eI] = { ...exs[eI], sets: exs[eI].sets.map((s, i) => i === sI ? { ...s, done: !s.done } : s) }; return { ...w, exercises: exs } })
  }
  const completeWorkout = () => { setRunning(false); setShowComplete(true) }
  const saveWorkout = (feedback) => {
    const { durationOverrideMin, ...restFeedback } = feedback || {}
    const finalMin = durationOverrideMin || Math.round(timer / 60)
    const userWeight = state.profile?.weight || 80
    const calBurned = estimateWorkoutCalories({
      weightKg: userWeight,
      durationMin: finalMin,
      feeling: restFeedback.feeling,
      type: 'strength',
    })
    const activeCalBurned = estimateActiveWorkoutCalories({
      weightKg: userWeight,
      durationMin: finalMin,
      feeling: restFeedback.feeling,
      type: 'strength',
    })
    const today2 = new Date().toISOString().split('T')[0]
    wk.exercises.forEach(ex => saveExerciseResult({ name: ex.name, sets: ex.sets, targetReps: ex.targetReps || ex.sets?.[0]?.reps }, today2))
    syncProgressInBackground()
    dispatch({ type: 'SAVE_ENTRY', entry: { ...entry, workouts: [...(entry.workouts || []), { id: Date.now(), name: wk.name || 'Тренировка', type: 'strength', exercises: wk.exercises.map(e => e.name), exercisesDetail: wk.exercises.map(e => ({ name: e.name, muscle: e.muscle, comment: e.comment || '', sets: e.sets.map(s => ({ reps: s.reps, weight: s.weight, done: s.done })) })), duration: finalMin, caloriesBurned: calBurned, activeCaloriesBurned: activeCalBurned, calorieCalculation: { method: 'met', met: restFeedback.feeling === 'Легко' ? 3 : restFeedback.feeling === 'Тяжело' ? 4 : restFeedback.feeling === 'Очень' ? 4.5 : 3.5, weightKg: Number(userWeight), calculatedAt: new Date().toISOString() }, ...restFeedback }] } })
    // Продвигаем указатель «на каком дне остановились» у плана, из которого
    // реально была запущена и завершена эта тренировка — по порядку дней, а
    // не по дню недели, чтобы пропущенный день не сбивал план.
    if (planDayIdx !== null && planDayIdx !== undefined) advanceAiPlanProgress(planDayIdx)
    if (customPlanCtx) advanceCustomPlanProgress(customPlanCtx.planId, customPlanCtx.dayIdx)
    clearDraft(); setWk({ name: '', exercises: [] }); resetTimer(); setShowComplete(false); setView('list')
    setPlanDayIdx(null); setCustomPlanCtx(null)
  }
  const removeWorkout = (wId, entryDate) => {
    const targetEntry = state.entries.find(e => e.date === (entryDate || today))
    if (!targetEntry) return
    dispatch({ type: 'SAVE_ENTRY', entry: { ...targetEntry, workouts: (targetEntry.workouts || []).filter(w => w.id !== wId) } })
  }
  // Редактирование уже завершённой тренировки из истории (свайп → «Изменить»).
  // Открывает её в конструкторе как обычные упражнения/подходы; в отличие от
  // повтора тренировки (repeatWorkout) — не начинает новую тренировку с нуля,
  // а по сохранению перезаписывает именно эту запись в истории.
  const startEditWorkout = (workout) => {
    if (!workout) return
    const details = workout.exercisesDetail?.length
      ? workout.exercisesDetail
      : (workout.exercises || []).map(name => ({ name }))
    const exercises = details.map(ex => {
      const dbEx = findExerciseByName(ex.name)
      return {
        uid: uid(),
        exerciseId: dbEx?.id,
        name: ex.name,
        muscle: ex.muscle || dbEx?.muscle || 'Кор',
        type: ex.type || dbEx?.type || 'compound',
        comment: ex.comment || '',
        targetReps: ex.sets?.[0]?.reps || '8-12',
        restSec: getDefaultRestSec(ex.muscle || dbEx?.muscle || 'Кор'),
        suggestedWeight: null,
        sets: (ex.sets?.length ? ex.sets : [{ reps: '8-12', weight: '0', done: true }]).map(s => ({ id: uid(), reps: s.reps, weight: s.weight, done: s.done !== undefined ? s.done : true })),
      }
    }).filter(ex => ex.name)
    if (!exercises.length) return
    clearDraft()
    setWk({ name: workout.name || 'Тренировка', exercises })
    setPlanDayIdx(null)
    setCustomPlanCtx(null)
    setEditingWorkout({ entryDate: workout.entryDate, original: workout })
    setRunning(false)
    setView('builder')
  }
  const cancelEditWorkout = () => {
    setEditingWorkout(null)
    setWk({ name: '', exercises: [] })
    setView('list')
  }
  const saveEditedWorkout = () => {
    if (!editingWorkout) return
    const targetEntry = state.entries.find(e => e.date === editingWorkout.entryDate)
    if (!targetEntry) return
    const updatedWorkout = {
      ...editingWorkout.original,
      name: wk.name || 'Тренировка',
      exercises: wk.exercises.map(e => e.name),
      exercisesDetail: wk.exercises.map(e => ({ name: e.name, muscle: e.muscle, comment: e.comment || '', sets: e.sets.map(s => ({ reps: s.reps, weight: s.weight, done: s.done })) })),
    }
    dispatch({ type: 'SAVE_ENTRY', entry: { ...targetEntry, workouts: (targetEntry.workouts || []).map(w => w.id === editingWorkout.original.id ? updatedWorkout : w) } })
    if (viewWorkout && viewWorkout.id === editingWorkout.original.id) setViewWorkout(updatedWorkout)
    setEditingWorkout(null)
    setWk({ name: '', exercises: [] })
    setView('list')
  }
  const saveWorkoutAnalysis = (workout, text) => {
    const targetEntry = state.entries.find(e => e.date === workout.entryDate)
    if (!targetEntry) return
    dispatch({ type: 'SAVE_ENTRY', entry: { ...targetEntry, workouts: (targetEntry.workouts || []).map(w => w.id === workout.id ? { ...w, aiAnalysis: text } : w) } })
    if (viewWorkout && viewWorkout.id === workout.id) setViewWorkout({ ...viewWorkout, aiAnalysis: text })
  }

  const buildExercisesFromPlanDay = (day, transferWeights) => (day.exercises || []).map(ex => {
    const reps = normReps(ex.reps)
    const repsValue = `${reps.min}-${reps.max}`
    const setsCount = parseInt(ex.sets) || 3
    const dbEx = EXERCISE_DB.find(e => e.name.toLowerCase() === (ex.name || '').toLowerCase())
    const saved = suggestWeightFor(ex.name)
    const muscleForRest = ex.muscle || dbEx?.muscle || 'Кор'
    return { uid: uid(), exerciseId: dbEx?.id || Date.now() + Math.random(), name: ex.name, muscle: muscleForRest, type: ex.type || dbEx?.type || 'compound', targetReps: repsValue, restSec: parseInt(ex.rest_sec) || getDefaultRestSec(muscleForRest), suggestedWeight: saved?.suggestedWeight || null, sets: Array.from({ length: setsCount }, () => ({ id: uid(), reps: repsValue, weight: transferWeights && saved?.weight ? String(saved.weight) : '0', done: false })) }
  })
  const applyPlanLoad = (day, dayIdx, mode, transferWeights) => {
    setWk({ name: day.name + ' (AI)', exercises: buildExercisesFromPlanDay(day, transferWeights) })
    setPlanDayIdx(dayIdx); setCustomPlanCtx(null); resetTimer()
    if (mode === 'builder') { setRunning(false); setView('builder') } else { setRunning(true); setView('active') }
    if (mode !== 'builder') markLastUsedSource('plan', null)
  }
  const startFromPlan = (day, dayIdx = null, mode = 'active') => {
    if ((day.exercises || []).some(ex => suggestWeightFor(ex.name)?.weight)) { setPendingLoad({ type: 'plan', day, dayIdx, mode }); return }
    applyPlanLoad(day, dayIdx, mode, false)
  }
  const resolveWeightTransfer = (transfer) => {
    if (!pendingLoad) return
    if (pendingLoad.type === 'template') applyTemplateLoad(pendingLoad.tpl, pendingLoad.mode, transfer, pendingLoad.sourceKind, pendingLoad.sourceId)
    else if (pendingLoad.type === 'customPlanDay') applyCustomPlanDayLoad(pendingLoad.plan, pendingLoad.dayIdx, pendingLoad.mode, transfer)
    else applyPlanLoad(pendingLoad.day, pendingLoad.dayIdx, pendingLoad.mode, transfer)
    setPendingLoad(null)
  }

  return {
    view, setView, wk, setWk, exSearch, setExSearch, running, setRunning, timer, resetTimer,
    pendingDraft, resumeDraft, discardDraft,
    showRestTimer, setShowRestTimer, restInfo, showComplete, swapFor, setSwapFor,
    planDayIdx, setPlanDayIdx, planSaved, viewWorkout, setViewWorkout, techFor, setTechFor,
    histMode, setHistMode, templates, tplSaved, pickerFor, setPickerFor, pendingLoad, setPendingLoad,
    allWorkouts, workoutsByDate, workoutPlace, filteredEx, addEx, toggleEx, updateRest, updateSet, removeSet,
    moveExercise, reorderExercises, updateComment, addSet, removeEx, replaceEx, applyProgression, saveToPlan,
    saveAsTemplate, deleteTemplate, startFromTemplate, repeatWorkout, toggleSet, completeWorkout, saveWorkout,
    removeWorkout, saveWorkoutAnalysis, startFromPlan, resolveWeightTransfer,
    editingWorkout, startEditWorkout, cancelEditWorkout, saveEditedWorkout,
    editingTemplateId, startEditTemplate, cancelEditTemplate, saveEditedTemplate,
    customPlans, saveCustomPlan, deleteCustomPlan, startFromCustomPlanDay, clearPlanContext,
  }
}
