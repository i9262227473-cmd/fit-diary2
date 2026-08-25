import React from 'react'
import { Check, ChevronLeft, ChevronRight, ClipboardList, Dumbbell, Edit2, Library, Play, Plus } from 'lucide-react'
import { EFF_LABEL, EXERCISE_DB as FULL_EXERCISE_DB, findAlternatives, findExerciseByName } from '../../data/exerciseDatabase'
import { getExerciseMedia } from '../../data/exerciseMedia'
import useWorkout, { getAiPlanProgress, nextDayIndexWithExercises } from '../../hooks/useWorkout'
import useDragReorder from '../../hooks/useDragReorder'
import { formatLongTime as fmtTimeLong, getDefaultRestSeconds as getDefaultRestSec } from '../../utils/workoutUi'
import SwipeToDelete from '../common/SwipeToDelete'
import SwipeActions from '../common/SwipeActions'
import RestTimer from './RestTimer'
import SetPickerModal from './SetPickerModal'
import TechniqueModal from './TechniqueModal'
import WeightTransferModal from './WeightTransferModal'
import WorkoutCalendar from './WorkoutCalendar'
import WorkoutComplete from './WorkoutComplete'
import WorkoutDetail from './WorkoutDetail'
import WorkoutLibrary from './WorkoutLibrary'
import WorkoutPlansScreen from './WorkoutPlansScreen'
import ExerciseDragHandle from './ExerciseDragHandle'
import {
  WorkoutBrainIcon,
  WorkoutCalendarIcon,
  WorkoutChevronIcon,
  WorkoutDumbbellIcon,
  WorkoutListIcon,
  WorkoutPlayIcon,
  WorkoutRepeatIcon,
} from './WorkoutUiIcons'
import styles from './WorkoutScreen.module.css'

// Предыдущий день с упражнениями перед fromIndex (по кругу, зеркало
// nextDayIndexWithExercises из useWorkout.js) — нужен для свайпа «назад»
// по карточке «Следующая тренировка».
function prevDayIndexWithExercises(days, fromIndex) {
  if (!Array.isArray(days) || !days.length) return 0
  for (let step = 1; step <= days.length; step += 1) {
    const idx = ((fromIndex - step) % days.length + days.length) % days.length
    if (days[idx]?.exercises?.length) return idx
  }
  return fromIndex
}

function formatWorkoutDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return value || ''
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(Number(year) === new Date().getFullYear() ? {} : { year: 'numeric' }),
  }).format(date)
}

export default function WorkoutScreen({ state, dispatch, aiCall, PlanScreen, onActiveChange }) {
  const {
    view, setView, wk, setWk, exSearch, setExSearch, running, setRunning, timer, resetTimer,
    showRestTimer, setShowRestTimer, restInfo, showComplete, swapFor, setSwapFor,
    planDayIdx, planSaved, viewWorkout, setViewWorkout, techFor, setTechFor,
    histMode, setHistMode, templates, tplSaved, pickerFor, setPickerFor, pendingLoad, setPendingLoad,
    allWorkouts, workoutsByDate, workoutPlace, filteredEx, addEx, toggleEx, updateRest, updateSet, removeSet,
    updateComment, addSet, removeEx, replaceEx, applyProgression, saveToPlan,
    saveAsTemplate, deleteTemplate, startFromTemplate, repeatWorkout, toggleSet, completeWorkout, saveWorkout,
    removeWorkout, saveWorkoutAnalysis, startFromPlan, resolveWeightTransfer,
    pendingDraft, resumeDraft, discardDraft,
    reorderExercises, editingWorkout, startEditWorkout, cancelEditWorkout, saveEditedWorkout,
    editingTemplateId, startEditTemplate, cancelEditTemplate, saveEditedTemplate,
    customPlans, saveCustomPlan, deleteCustomPlan, startFromCustomPlanDay, clearPlanContext,
  } = useWorkout({ state, dispatch, aiCall })

  const M_COLORS = { Грудь:'var(--accent)', Спина:'#3b82f6', Ноги:'#f59e0b', Плечи:'#8b5cf6', Трицепс:'#ec4899', Бицепс:'#f97316', Кор:'#06b6d4', Кардио:'#ef4444' }
  const MUSCLE_MEDIA = { Грудь:'chest', Спина:'back', Ноги:'legs', Плечи:'shoulders', Трицепс:'triceps', Бицепс:'biceps', Кор:'core', Кардио:'cardio' }

  // Живое перетаскивание упражнений (builder/active) с раздвиганием соседей —
  // общий инстанс на оба вида, т.к. рендерится только один из них.
  const dragReorder = useDragReorder({ items: wk.exercises, getId: ex => ex.uid, onReorder: reorderExercises })

  const featured = (() => {
    // Порядок дня внутри плана — по указателю «на каком дне остановились»
    // (продвигается по завершению тренировки), а не по дню недели: если
    // пропустить день, план не сбивается и просто ждёт дальше.
    const aiPlanCandidate = (() => {
      try {
        const savedPlan = JSON.parse(localStorage.getItem('workout-plan-v4-pro') || 'null')
        const days = savedPlan?.plan?.days
        if (!Array.isArray(days) || !days.length) return null
        let idx = getAiPlanProgress()
        if (!days[idx]?.exercises?.length) idx = nextDayIndexWithExercises(days, idx - 1)
        if (!days[idx]?.exercises?.length) return null
        return { kind: 'plan', source: days[idx], index: idx, days }
      } catch { return null }
    })()
    const templateCandidate = templates[0] ? { kind: 'template', source: templates[0] } : null
    const historyCandidate = allWorkouts[0] ? { kind: 'history', source: allWorkouts[0] } : null
    const customPlanCandidateFor = (plan) => {
      if (!plan?.days?.length) return null
      let idx = plan.progressIndex || 0
      if (!plan.days[idx]?.exercises?.length) idx = nextDayIndexWithExercises(plan.days, idx - 1)
      if (!plan.days[idx]?.exercises?.length) return null
      return { kind: 'customPlan', source: plan.days[idx], planId: plan.id, planName: plan.name, index: idx, days: plan.days }
    }

    // Предпочитаем источник, который пользователь реально запускал последним
    // (метка пишется в useWorkout при старте тренировки), а не жёсткий
    // приоритет план → шаблон → история — иначе «Следующая тренировка»
    // игнорирует собственные шаблоны/планы пользователя, пока жив AI-план.
    let lastUsed = null
    try { lastUsed = JSON.parse(localStorage.getItem('workout-last-used-source-v1') || 'null') } catch {}
    if (lastUsed?.kind === 'template' && lastUsed.id) {
      const match = templates.find(t => t.id === lastUsed.id)
      if (match) return { kind: 'template', source: match }
    }
    if (lastUsed?.kind === 'history' && lastUsed.id) {
      const match = allWorkouts.find(w => w.id === lastUsed.id)
      if (match) return { kind: 'history', source: match }
    }
    if (lastUsed?.kind === 'plan' && aiPlanCandidate) return aiPlanCandidate
    if (lastUsed?.kind === 'customPlan' && lastUsed.id) {
      const plan = customPlans.find(p => p.id === lastUsed.id)
      const cand = customPlanCandidateFor(plan)
      if (cand) return cand
    }

    return aiPlanCandidate || templateCandidate || historyCandidate
  })()

  // Свайп по карточке «Следующая тренировка»: доступен только для источников
  // с несколькими днями (AI-план / свой план) — превью-индекс живёт локально
  // и не трогает реальный прогресс плана, пока пользователь не нажмёт «Начать».
  const planDays = (featured?.kind === 'plan' || featured?.kind === 'customPlan') ? featured.days : null
  const canSwipePlan = Array.isArray(planDays) && planDays.filter(d => d?.exercises?.length).length > 1

  const [previewIndex, setPreviewIndex] = React.useState(featured?.index ?? null)
  React.useEffect(() => {
    setPreviewIndex(featured?.index ?? null)
  }, [featured?.kind, featured?.index, featured?.planId])

  const activeIndex = canSwipePlan && previewIndex != null ? previewIndex : featured?.index
  const displayedDaySource = canSwipePlan && planDays[activeIndex]?.exercises?.length
    ? planDays[activeIndex]
    : featured?.source

  const swipeToDay = (direction) => {
    if (!canSwipePlan) return
    const from = activeIndex ?? featured.index
    const nextIdx = direction === 'next'
      ? nextDayIndexWithExercises(planDays, from)
      : prevDayIndexWithExercises(planDays, from)
    setPreviewIndex(nextIdx)
  }

  // Визуальный свайп карточки «Следующая тренировка»: во время касания контент
  // едет пальцем один в один (dragX без transition), а по отпусканию либо
  // доезжает и уступает место следующему дню (уезжает целиком за край карточки,
  // новый контент подставляется с обратной стороны и въезжает — «карусель»),
  // либо пружинит обратно, если свайп был недостаточным.
  const cardRef = React.useRef(null)
  const touchStartRef = React.useRef(null)
  const cardWidthRef = React.useRef(320)
  const swipeLockRef = React.useRef(false)
  const [dragX, setDragX] = React.useState(0)
  const [dragTransition, setDragTransition] = React.useState(false)

  const slideStyle = canSwipePlan
    ? { transform: `translateX(${dragX}px)`, transition: dragTransition ? 'transform .26s cubic-bezier(.22,.8,.24,1)' : 'none' }
    : undefined

  const performSwipeAnimation = (direction) => {
    if (!canSwipePlan || swipeLockRef.current) return
    const width = cardRef.current?.offsetWidth || cardWidthRef.current
    swipeLockRef.current = true
    setDragTransition(true)
    setDragX(direction === 'next' ? -width : width)
    window.setTimeout(() => {
      swipeToDay(direction)
      setDragTransition(false)
      setDragX(direction === 'next' ? width : -width)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDragTransition(true)
          setDragX(0)
          window.setTimeout(() => { swipeLockRef.current = false }, 280)
        })
      })
    }, 220)
  }

  const onFeaturedTouchStart = (event) => {
    if (!canSwipePlan || swipeLockRef.current) return
    const t = event.touches?.[0]
    if (!t) return
    touchStartRef.current = { x: t.clientX, y: t.clientY }
    cardWidthRef.current = cardRef.current?.offsetWidth || cardWidthRef.current
    setDragTransition(false)
  }
  const onFeaturedTouchMove = (event) => {
    if (!canSwipePlan || !touchStartRef.current || swipeLockRef.current) return
    const t = event.touches?.[0]
    if (!t) return
    const dx = t.clientX - touchStartRef.current.x
    const width = cardWidthRef.current || 320
    setDragX(Math.max(-width, Math.min(width, dx)))
  }
  const onFeaturedTouchEnd = (event) => {
    if (!canSwipePlan || !touchStartRef.current || swipeLockRef.current) {
      touchStartRef.current = null
      return
    }
    const t = event.changedTouches?.[0]
    const startX = touchStartRef.current.x
    const startY = touchStartRef.current.y
    touchStartRef.current = null
    if (!t) { setDragTransition(true); setDragX(0); return }
    const dx = t.clientX - startX
    const dy = t.clientY - startY
    const width = cardWidthRef.current || 320
    const shouldSwitch = Math.abs(dx) > Math.max(56, width * 0.22) && Math.abs(dx) > Math.abs(dy) * 1.3
    if (!shouldSwitch) {
      setDragTransition(true)
      setDragX(0)
      return
    }
    performSwipeAnimation(dx < 0 ? 'next' : 'prev')
  }
  const onFeaturedTouchCancel = () => {
    touchStartRef.current = null
    if (!swipeLockRef.current) { setDragTransition(true); setDragX(0) }
  }

  // Свайп-карусель активной тренировки: экран открывается на первом
  // упражнении, свайп переключает на соседнее — тот же приём, что и выше
  // для карточки «Следующая тренировка» (контент уезжает целиком, данные
  // меняются, новая карточка въезжает с обратной стороны). Свайп «дальше»
  // с последнего упражнения завершает тренировку (сводка как по кнопке
  // «Завершить»). Полный список с перетаскиванием остаётся доступен через
  // переключатель — там же, где раньше жил единственный вид.
  const [activeExIndex, setActiveExIndex] = React.useState(0)
  const [activeViewMode, setActiveViewMode] = React.useState('swipe')
  const prevViewRef = React.useRef(view)
  React.useEffect(() => {
    if (view === 'active' && prevViewRef.current !== 'active') {
      setActiveExIndex(0)
      setActiveViewMode('swipe')
    }
    prevViewRef.current = view
  }, [view])
  React.useEffect(() => {
    setActiveExIndex(i => Math.min(i, Math.max(wk.exercises.length - 1, 0)))
  }, [wk.exercises.length])

  const exCardRef = React.useRef(null)
  const exTouchStartRef = React.useRef(null)
  const exCardWidthRef = React.useRef(320)
  const exSwipeLockRef = React.useRef(false)
  const [exDragX, setExDragX] = React.useState(0)
  const [exDragTransition, setExDragTransition] = React.useState(false)
  const exSlideStyle = { transform: `translateX(${exDragX}px)`, transition: exDragTransition ? 'transform .26s cubic-bezier(.22,.8,.24,1)' : 'none' }

  const goToExercise = (direction) => {
    if (exSwipeLockRef.current) return
    const total = wk.exercises.length
    if (direction === 'next' && activeExIndex >= total - 1) { completeWorkout(); return }
    if (direction === 'prev' && activeExIndex <= 0) { setExDragTransition(true); setExDragX(0); return }
    const width = exCardRef.current?.offsetWidth || exCardWidthRef.current
    exSwipeLockRef.current = true
    setExDragTransition(true)
    setExDragX(direction === 'next' ? -width : width)
    window.setTimeout(() => {
      setActiveExIndex(i => direction === 'next' ? Math.min(i + 1, total - 1) : Math.max(i - 1, 0))
      setExDragTransition(false)
      setExDragX(direction === 'next' ? width : -width)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setExDragTransition(true)
          setExDragX(0)
          window.setTimeout(() => { exSwipeLockRef.current = false }, 280)
        })
      })
    }, 220)
  }

  const onExTouchStart = (event) => {
    if (exSwipeLockRef.current) return
    const t = event.touches?.[0]
    if (!t) return
    exTouchStartRef.current = { x: t.clientX, y: t.clientY }
    exCardWidthRef.current = exCardRef.current?.offsetWidth || exCardWidthRef.current
    setExDragTransition(false)
  }
  const onExTouchMove = (event) => {
    if (!exTouchStartRef.current || exSwipeLockRef.current) return
    const t = event.touches?.[0]
    if (!t) return
    const dx = t.clientX - exTouchStartRef.current.x
    const width = exCardWidthRef.current || 320
    setExDragX(Math.max(-width, Math.min(width, dx)))
  }
  const onExTouchEnd = (event) => {
    if (!exTouchStartRef.current || exSwipeLockRef.current) { exTouchStartRef.current = null; return }
    const t = event.changedTouches?.[0]
    const startX = exTouchStartRef.current.x
    const startY = exTouchStartRef.current.y
    exTouchStartRef.current = null
    if (!t) { setExDragTransition(true); setExDragX(0); return }
    const dx = t.clientX - startX
    const dy = t.clientY - startY
    const width = exCardWidthRef.current || 320
    const shouldSwitch = Math.abs(dx) > Math.max(56, width * 0.22) && Math.abs(dx) > Math.abs(dy) * 1.3
    if (!shouldSwitch) { setExDragTransition(true); setExDragX(0); return }
    goToExercise(dx < 0 ? 'next' : 'prev')
  }
  const onExTouchCancel = () => {
    exTouchStartRef.current = null
    if (!exSwipeLockRef.current) { setExDragTransition(true); setExDragX(0) }
  }

  const renderActiveExerciseCard = (ex, eI, { draggable = false } = {}) => {
    const media = getExerciseMedia(ex.name)
    return (
      <div key={ex.uid || eI} ref={draggable ? dragReorder.setItemRef(ex.uid) : undefined} style={draggable ? dragReorder.getItemStyle(ex.uid) : undefined} className={styles.activeExerciseCard}>
        <div className={styles.activeExerciseHeader}>
          {draggable && <ExerciseDragHandle dragHandleProps={dragReorder.getHandleProps(ex.uid)} className={styles.activeDragHandle} />}
          <span className={styles.activeExerciseNumber}>{eI+1}</span>
          <div className={styles.activeExerciseTitle}>
            <button onClick={() => setTechFor({ name: ex.name, muscle: ex.muscle })}>{ex.name}</button>
            <span style={{ background: M_COLORS[ex.muscle] || 'var(--accent)' }}>{ex.muscle}</span>
          </div>
          <button className={styles.activeSwapButton} onClick={() => setSwapFor(swapFor === eI ? null : eI)}>Заменить</button>
        </div>
        {media && <button className={styles.activeExerciseImage} onClick={() => setTechFor({ name: ex.name, muscle: ex.muscle })}><img src={media.start} alt="" /></button>}
        {swapFor === eI && (
          <div className={styles.activeSwapPanel}>
            <div className={styles.activeSwapHeading}>
              <span>Заменить на:</span>
              <button onClick={() => setSwapFor(null)}>×</button>
            </div>
            {(() => {
              const dbEx = FULL_EXERCISE_DB.find(e => e.id === ex.exerciseId) || findExerciseByName(ex.name)
              const alts = dbEx ? findAlternatives(dbEx, workoutPlace) : []
              if (alts.length === 0) return <div className={styles.activeNoAlternatives}>Нет подходящих альтернатив для вашего места тренировок</div>
              return <div className={styles.activeAlternatives}>
                {alts.map(alt => (
                  <button key={alt.id} onClick={() => { replaceEx(eI, alt); setSwapFor(null) }}>
                    <span>{alt.name}</span>
                    <small>{alt.equipment}</small>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, fontWeight: 600, ...(alt.eff==='best' ? {background:'var(--accent-dim)', color:'#6fcaa0'} : alt.eff==='good' ? {background:'#2a2a2a', color:'#d1d5db'} : {background:'#262626', color:'#6b7280'}) }}>{EFF_LABEL[alt.eff]}</span>
                  </button>
                ))}
              </div>
            })()}
          </div>
        )}
        <div className={styles.activeSets}>
          <div className={styles.activeSetLabels}>
            <span>Подход</span><span>Повторы</span><span>Вес, кг</span><i />
          </div>
          <div className={styles.activeSetList}>
            {ex.sets.map((set, sI) => (
              <SwipeToDelete key={set.id || sI} onDelete={() => removeSet(eI, sI)} disabled={ex.sets.length <= 1} radius={8}>
                <div className={`${styles.activeSetRow} ${set.done ? styles.activeSetDone : ''}`}>
                  <span>№{sI+1}</span>
                  <button onClick={() => setPickerFor({ eI, sI })}>{set.reps || ex.targetReps || '—'}</button>
                  <button onClick={() => setPickerFor({ eI, sI })}>{set.weight || '0'}</button>
                  <button className={styles.activeSetCheck} onClick={() => toggleSet(eI, sI)} aria-label="Отметить подход выполненным">
                    {set.done && <Check size={16} />}
                  </button>
                </div>
              </SwipeToDelete>
            ))}
          </div>
          <button className={styles.activeAddSet} onClick={() => addSet(eI)}><Plus size={19} /> Добавить подход</button>
          <div className={styles.activeComment}>
            <label htmlFor={`exercise-comment-${ex.uid || eI}`}><Edit2 size={16} /> Комментарий к упражнению</label>
            <input
              id={`exercise-comment-${ex.uid || eI}`}
              type="text"
              value={ex.comment || ''}
              onChange={e => updateComment(eI, e.target.value)}
              placeholder="Например: легко, боль в плече, увеличить вес"
            />
          </div>
        </div>
      </div>
    )
  }

  const featuredExercises = displayedDaySource?.exercisesDetail?.length
    ? displayedDaySource.exercisesDetail
    : (displayedDaySource?.exercises || [])
  const featuredFirstExercise = typeof featuredExercises[0] === 'string' ? featuredExercises[0] : featuredExercises[0]?.name
  const featuredMedia = getExerciseMedia(featuredFirstExercise)
  const featuredName = (featured?.kind === 'plan' || featured?.kind === 'customPlan') && displayedDaySource?.muscles?.length
    ? displayedDaySource.muscles.join(' + ')
    : displayedDaySource?.name || displayedDaySource?.type || 'Тренировка'
  const featuredMeta = `${featuredExercises.length} упражнений${displayedDaySource?.duration ? ` · ${displayedDaySource.duration} мин` : ' · ~60 мин'}`
  const featuredDay = featured?.kind === 'plan' ? 'AI-план'
    : featured?.kind === 'customPlan' ? (featured.planName || 'Свой план')
    : featured?.kind === 'template' ? 'Ваш шаблон'
    : featured?.kind === 'history' ? 'Повтор последней'
    : 'Готова к запуску'

  const startFeatured = () => {
    if (!featured) {
      clearPlanContext()
      setWk({ name: '', exercises: [] })
      setView('builder')
    } else if (featured.kind === 'plan') startFromPlan(displayedDaySource, activeIndex ?? featured.index, 'active')
    else if (featured.kind === 'customPlan') {
      const plan = customPlans.find(p => p.id === featured.planId)
      if (plan) startFromCustomPlanDay(plan, activeIndex ?? featured.index, 'active')
    }
    else if (featured.kind === 'template') startFromTemplate(featured.source, 'active')
    else repeatWorkout(featured.source, 'active')
  }

  React.useEffect(() => {
    onActiveChange?.(view === 'active')
    return () => onActiveChange?.(false)
  }, [view, onActiveChange])

  if (view === 'list') {
    return (
      <div className={styles.historyScreen}>
        {showRestTimer && <RestTimer duration={restInfo.duration} exerciseName={restInfo.exercise} setInfo={restInfo.setInfo} onClose={() => setShowRestTimer(false)} />}
        {pendingLoad && <WeightTransferModal onConfirm={() => resolveWeightTransfer(true)} onDecline={() => resolveWeightTransfer(false)} onClose={() => setPendingLoad(null)} />}
        {viewWorkout && <WorkoutDetail workout={viewWorkout} onClose={() => setViewWorkout(null)} aiCall={aiCall} onSaveAnalysis={saveWorkoutAnalysis} />}
        <div className={styles.historyHeading}>
          <h1>Тренировки</h1>
        </div>
        {pendingDraft && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'12px 14px', margin:'0 0 14px', borderRadius:14, background:'var(--surface2)', border:'1px solid var(--border)' }}>
            <div style={{ minWidth:0 }}>
              <strong style={{ display:'block', fontSize:14, color:'var(--text)' }}>Есть незавершённая тренировка</strong>
              <small style={{ color:'var(--text-muted)', fontSize:12 }}>{pendingDraft.wk?.exercises?.length || 0} упражнений в черновике</small>
            </div>
            <div style={{ display:'flex', gap:8, flexShrink:0 }}>
              <button onClick={discardDraft} style={{ padding:'8px 12px', borderRadius:10, background:'var(--surface3)', color:'var(--text-muted)', fontSize:13, fontWeight:600 }}>Удалить</button>
              <button onClick={resumeDraft} style={{ padding:'8px 12px', borderRadius:10, background:'var(--accent)', color:'#000', fontSize:13, fontWeight:700 }}>Продолжить</button>
            </div>
          </div>
        )}
        <div className={styles.historyActions}>
          <button className={styles.primaryAction} onClick={() => setView('templates')}>
            <span><img src="/assets/ui-icons-v3/workout-plan.png" alt="" /></span>
            <strong>Мои тренировки</strong>
            <small>Шаблоны и программы</small>
          </button>
          <button onClick={() => setView('plan')}>
            <span><img src="/assets/ui-icons-v3/ai.png" alt="" /></span>
            <strong>AI-план</strong>
            <small>Персональная программа</small>
          </button>
          <button onClick={() => setView('library')}>
            <span><img src="/assets/ui-icons-v3/workout.png" alt="" /></span>
            <strong>Программы</strong>
            <small>Готовые программы</small>
          </button>
          <button className={styles.newWorkout} onClick={() => setView('plans')}>
            <span><img src="/assets/ui-icons-v3/calendar.png" alt="" /></span>
            <strong>Мои планы</strong>
            <small>Свои программы</small>
          </button>
        </div>
        <section
          ref={cardRef}
          className={`${styles.featuredWorkout} ${!featured ? styles.featuredEmpty : ''}`}
          onTouchStart={onFeaturedTouchStart}
          onTouchMove={onFeaturedTouchMove}
          onTouchEnd={onFeaturedTouchEnd}
          onTouchCancel={onFeaturedTouchCancel}
        >
          <div className={styles.featuredCopy} style={slideStyle}>
            <span>
              {featured ? 'Следующая тренировка' : 'Начните с программы'}
              {canSwipePlan && (
                <span className={styles.featuredNavHint}>
                  <button type="button" onClick={() => performSwipeAnimation('prev')} aria-label="Предыдущий день плана"><ChevronLeft size={15} /></button>
                  <button type="button" onClick={() => performSwipeAnimation('next')} aria-label="Следующий день плана"><ChevronRight size={15} /></button>
                </span>
              )}
            </span>
            <h2>{featured ? featuredName : 'Создайте тренировку'}</h2>
            <div className={styles.featuredFacts}>
              <small><WorkoutCalendarIcon size={19} active />{featured ? featuredDay : 'Когда удобно'}</small>
              <small><WorkoutDumbbellIcon size={19} />{featured ? featuredMeta : 'Добавьте упражнения'}</small>
            </div>
            <button className={styles.featuredStart} onClick={startFeatured}>
              <WorkoutPlayIcon size={24} light />
              {featured ? 'Начать' : 'Создать'}
            </button>
          </div>
          <div className={styles.featuredVisual} aria-hidden="true" style={slideStyle}>
            {featuredMedia
              ? <img src={featuredMedia.start} alt="" />
              : <WorkoutDumbbellIcon size={72} />}
          </div>
        </section>
        <div className={styles.historySectionHeader}>
          <h2>История</h2>
          <div className={styles.historyToggle}>
            {[['list', 'Список'], ['calendar', 'Календарь']].map(([k, v]) => (
              <button key={k} className={histMode === k ? styles.toggleActive : ''} onClick={() => setHistMode(k)}>
                {k === 'list'
                  ? <WorkoutListIcon size={21} active={histMode === k} />
                  : <WorkoutCalendarIcon size={21} active={histMode === k} />}
                <span>{v}</span>
              </button>
            ))}
          </div>
        </div>
        {histMode === 'calendar' && <WorkoutCalendar workoutsByDate={workoutsByDate} onPickWorkout={setViewWorkout} onDeleteWorkout={removeWorkout} />}
        {histMode === 'list' && (allWorkouts.length === 0 ? (
          <div className={styles.emptyHistory}>
            <span><WorkoutDumbbellIcon size={34} /></span>
            <strong>Тренировок пока нет</strong>
            <small>Создайте первую тренировку или выберите AI-план</small>
          </div>
        ) : <div className={styles.workoutHistory}>{allWorkouts.map(w => {
          const firstExercise = w.exercisesDetail?.[0]?.name || w.exercises?.[0]
          const media = getExerciseMedia(firstExercise)
          return (
            <SwipeActions key={w.id} radius={19} onEdit={() => startEditWorkout(w)} onDelete={() => removeWorkout(w.id, w.entryDate)} confirmText="Удалить эту тренировку?">
              <div className={styles.historyCard}>
                <button className={styles.historyMain} onClick={() => setViewWorkout(w)}>
                  {media ? <img src={media.start} alt="" /> : <span className={styles.historyFallback}><WorkoutDumbbellIcon size={30} /></span>}
                  <span className={styles.historyCopy}>
                    <strong>{w.name || w.type || 'Тренировка'}</strong>
                    <small>{w.exercises?.length || w.exercisesDetail?.length || 0} упражнений · {w.duration || 0} мин</small>
                    <small>{formatWorkoutDate(w.entryDate)}</small>
                  </span>
                  <span className={styles.historyChevron}><WorkoutChevronIcon size={19} /></span>
                </button>
                <button className={styles.repeatWorkout} onClick={() => repeatWorkout(w, 'active')} aria-label={`Повторить тренировку ${w.name || w.type || ''}`}>
                  <WorkoutRepeatIcon size={23} />
                  <small>Повторить</small>
                </button>
              </div>
            </SwipeActions>
          )
        })}</div>)}
      </div>
    )
  }

  if (view === 'builder') {
    return (
      <div className={`${styles.builder} app-view-enter`}>
        {showRestTimer && <RestTimer duration={restInfo.duration} exerciseName={restInfo.exercise} setInfo={restInfo.setInfo} onClose={() => setShowRestTimer(false)} />}
        {techFor && <TechniqueModal name={techFor.name} muscle={techFor.muscle} onClose={() => setTechFor(null)} />}
        {pickerFor && wk.exercises[pickerFor.eI] && (
          <SetPickerModal
            title={`${wk.exercises[pickerFor.eI].name} · подход ${pickerFor.sI+1}`}
            reps={wk.exercises[pickerFor.eI].sets[pickerFor.sI]?.reps}
            weight={wk.exercises[pickerFor.eI].sets[pickerFor.sI]?.weight}
            onClose={() => setPickerFor(null)}
            onSave={(r, w) => { updateSet(pickerFor.eI, pickerFor.sI, 'reps', r); updateSet(pickerFor.eI, pickerFor.sI, 'weight', w); setPickerFor(null) }}
          />
        )}
        <div className={styles.builderHeading}>
          <button onClick={() => editingWorkout ? cancelEditWorkout() : editingTemplateId ? cancelEditTemplate() : setView('list')} className={styles.backButton}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: 18, fontWeight: 700 }}>{editingWorkout ? 'Изменение тренировки' : editingTemplateId ? 'Изменение шаблона' : 'Конструктор'}</span>
        </div>
        <input className={styles.builderName}
          placeholder="Название тренировки" value={wk.name} onChange={e => setWk(w => ({...w, name: e.target.value}))} />
        <div className={styles.exerciseLibrary}>
          <div className={styles.libraryTitle}>Группы мышц</div>
          <div className={styles.muscleGrid}>
            {Object.entries(MUSCLE_MEDIA).map(([label, file]) => <button key={label} onClick={() => setExSearch(label)}><img src={`/assets/muscles/${file}.webp`} alt="" /><span>{label}</span></button>)}
          </div>
          <input className={styles.librarySearch} placeholder="Поиск упражнения или мышцы..." value={exSearch} onChange={e => setExSearch(e.target.value)} />
          <div className={styles.libraryList}>
            {filteredEx.map(ex => {
              const alreadyAdded = wk.exercises.some(e => e.exerciseId === ex.id)
              return (
              <button key={ex.id} onClick={() => toggleEx(ex)} className={`${styles.libraryItem} ${alreadyAdded ? styles.libraryItemAdded : ''}`}>
                <span style={{ padding: '2px 8px', borderRadius: 50, fontSize: 11, color: '#000', background: M_COLORS[ex.muscle] || 'var(--accent)', flexShrink: 0, fontWeight: 600 }}>{ex.muscle}</span>
                <span className={styles.libraryItemName}>{ex.name}</span>
                <span className={styles.efficiency}>{EFF_LABEL[ex.eff]}</span>
                {alreadyAdded ? <Check size={16} color="var(--accent)" /> : <Plus size={16} color="var(--accent)" />}
              </button>
              )
            })}
          </div>
        </div>
        {wk.exercises.map((ex, eI) => (
          <div key={ex.uid || eI} ref={dragReorder.setItemRef(ex.uid)} style={dragReorder.getItemStyle(ex.uid)} className={styles.builderExercise}>
            <div className={styles.builderExerciseHeader}>
              <ExerciseDragHandle dragHandleProps={dragReorder.getHandleProps(ex.uid)} className={styles.dragHandle} />
              <span style={{ padding: '3px 10px', borderRadius: 50, fontSize: 11, color: '#000', background: M_COLORS[ex.muscle] || 'var(--accent)', fontWeight: 600 }}>{ex.muscle}</span>
              <button onClick={() => setTechFor({ name: ex.name, muscle: ex.muscle })} className={styles.builderExerciseTitle}>
                {ex.name}
              </button>
              <button onClick={() => setTechFor({ name: ex.name, muscle: ex.muscle })} className={styles.techniqueButton}>Техника</button>
              <button onClick={() => removeEx(eI)} className={styles.removeExercise}>×</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Отдых:</span>
              <button onClick={() => updateRest(eI, -15)} style={{ width: 26, height: 26, borderRadius: 7, background: '#222', border: '1px solid #2e2e2e', color: '#9ca3af', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>−</button>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: 'var(--accent)', minWidth: 44, textAlign: 'center' }}>{fmtTimeLong(ex.restSec || getDefaultRestSec(ex.muscle))}</span>
              <button onClick={() => updateRest(eI, 15)} style={{ width: 26, height: 26, borderRadius: 7, background: '#222', border: '1px solid #2e2e2e', color: '#9ca3af', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>+</button>
              <button onClick={() => setSwapFor(swapFor === eI ? null : eI)} className={styles.builderSwapButton}>Заменить</button>
            </div>
            {swapFor === eI && (
              <div style={{ background: '#161616', border: '1px solid #2e2e2e', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af' }}>Заменить на:</span>
                  <button onClick={() => setSwapFor(null)} style={{ width: 24, height: 24, borderRadius: 6, background: '#222', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14 }}>×</button>
                </div>
                {(() => {
                  const dbEx = FULL_EXERCISE_DB.find(e => e.id === ex.exerciseId) || findExerciseByName(ex.name)
                  const alts = dbEx ? findAlternatives(dbEx, workoutPlace) : []
                  if (alts.length === 0) return <div style={{ fontSize: 12, color: '#6b7280', padding: '6px 0' }}>Нет подходящих альтернатив для вашего места тренировок</div>
                  return <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {alts.map(alt => (
                      <button key={alt.id} onClick={() => { replaceEx(eI, alt); setSwapFor(null) }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', background: '#222', border: '1px solid #2a2a2a', borderRadius: 9, cursor: 'pointer', textAlign: 'left' }}>
                        <span style={{ fontSize: 13, color: '#f5f5f5', flex: 1 }}>{alt.name}</span>
                        <span style={{ fontSize: 10, color: '#6b7280' }}>{alt.equipment}</span>
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, fontWeight: 600, ...(alt.eff==='best' ? {background:'var(--accent-dim)', color:'#6fcaa0'} : alt.eff==='good' ? {background:'#2a2a2a', color:'#d1d5db'} : {background:'#262626', color:'#6b7280'}) }}>{EFF_LABEL[alt.eff]}</span>
                      </button>
                    ))}
                  </div>
                })()}
              </div>
            )}
            {ex.suggestedWeight && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--accent-dim)', border: '1px solid var(--accent-dim)', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: '#6fcaa0', flex: 1 }}>Вы закрыли все повторы — пора поднять вес до <b>{ex.suggestedWeight} кг</b></span>
                <button onClick={() => applyProgression(eI)} style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--accent)', border: 'none', color: '#000', cursor: 'pointer', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>Поднять</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginBottom: 6, padding: '0 2px' }}>
              <div style={{ width: 28, fontSize: 11, color: '#6b7280', textAlign: 'center' }}>№</div>
              <div style={{ flex: 1, fontSize: 11, color: '#6b7280', textAlign: 'center' }}>Повторы</div>
              <div style={{ flex: 1, fontSize: 11, color: '#6b7280', textAlign: 'center' }}>Вес (кг)</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
              {ex.sets.map((set, sI) => (
                <SwipeToDelete key={set.id || sI} onDelete={() => removeSet(eI, sI)} disabled={ex.sets.length <= 1} radius={8}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'var(--card-solid)' }}>
                    <div style={{ width: 28, fontSize: 13, color: '#6b7280', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{sI+1}</div>
                    <button onClick={() => setPickerFor({ eI, sI })} className={styles.builderSetValue}>{set.reps || '10'}</button>
                    <button onClick={() => setPickerFor({ eI, sI })} className={styles.builderSetValue}>{set.weight || '0'}</button>
                  </div>
                </SwipeToDelete>
              ))}
            </div>
            <button onClick={() => addSet(eI)} style={{ padding: '8px', background: 'transparent', border: '1px dashed #2e2e2e', borderRadius: 8, color: '#6b7280', cursor: 'pointer', fontSize: 13, width: '100%', marginBottom: 10 }}>+ Добавить подход</button>
            <input
              type="text"
              value={ex.comment || ''}
              onChange={e => updateComment(eI, e.target.value)}
              placeholder="Комментарий к упражнению (необязательно)"
              className={styles.builderComment}
            />
          </div>
        ))}
        {editingWorkout ? (
          wk.exercises.length > 0 && (
            <button onClick={saveEditedWorkout} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 14, padding: '15px', fontSize: 14, fontWeight: 700, width: '100%', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Сохранить изменения
            </button>
          )
        ) : (
          <>
            {wk.exercises.length > 0 && (
              <button onClick={() => { resetTimer(); setRunning(true); setView('active') }} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 14, padding: '15px', fontSize: 14, fontWeight: 700, width: '100%', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Начать тренировку
              </button>
            )}
            {wk.exercises.length > 0 && (
              editingTemplateId ? (
                <button onClick={saveEditedTemplate} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 14, padding: '13px', fontSize: 13, fontWeight: 700, width: '100%', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Сохранить изменения
                </button>
              ) : (
                <button onClick={saveAsTemplate} style={{ background: tplSaved ? 'var(--accent)' : 'transparent', color: tplSaved ? '#000' : 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 14, padding: '13px', fontSize: 13, fontWeight: 700, width: '100%', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {tplSaved ? '✓ Сохранено в мои тренировки' : 'Сохранить как шаблон'}
                </button>
              )
            )}
            {wk.exercises.length > 0 && planDayIdx !== null && (
              <button onClick={saveToPlan} style={{ background: planSaved ? 'var(--accent)' : 'transparent', color: planSaved ? '#000' : 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 14, padding: '13px', fontSize: 13, fontWeight: 700, width: '100%', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {planSaved ? '✓ Сохранено в план' : 'Сохранить в план'}
              </button>
            )}
          </>
        )}
      </div>
    )
  }

  if (view === 'active') {
    return (
      <div className={styles.activeWorkout}>
        {showRestTimer && <RestTimer duration={restInfo.duration} exerciseName={restInfo.exercise} setInfo={restInfo.setInfo} onClose={() => setShowRestTimer(false)} />}
        {techFor && <TechniqueModal name={techFor.name} muscle={techFor.muscle} onClose={() => setTechFor(null)} />}
        {pickerFor && wk.exercises[pickerFor.eI] && (
          <SetPickerModal
            title={`${wk.exercises[pickerFor.eI].name} · подход ${pickerFor.sI+1}`}
            reps={wk.exercises[pickerFor.eI].sets[pickerFor.sI]?.reps}
            weight={wk.exercises[pickerFor.eI].sets[pickerFor.sI]?.weight}
            onClose={() => setPickerFor(null)}
            onSave={(r, w) => { updateSet(pickerFor.eI, pickerFor.sI, 'reps', r); updateSet(pickerFor.eI, pickerFor.sI, 'weight', w); setPickerFor(null) }}
          />
        )}
        {showComplete && <WorkoutComplete workout={wk} duration={timer} onSave={saveWorkout} aiCall={aiCall} />}
        <div className={styles.activeSummary}>
          <div>
            <div className={styles.activeTime}>{fmtTimeLong(timer)}</div>
            <div className={styles.activeTimeLabel}>Общее время</div>
          </div>
          <div className={styles.activeWorkoutName}>{wk.name || 'Тренировка'}</div>
        </div>
        {activeViewMode === 'list' ? (
          <>
            <div className={styles.activeExerciseNav}>
              <span className={styles.activeExerciseProgress}>Список упражнений</span>
              <div className={styles.activeExerciseNavButtons}>
                <button className={styles.activeModeToggle} onClick={() => setActiveViewMode('swipe')}>
                  <WorkoutListIcon size={16} active />
                  <span>Карточки</span>
                </button>
              </div>
            </div>
            {wk.exercises.map((ex, eI) => renderActiveExerciseCard(ex, eI, { draggable: true }))}
          </>
        ) : (
          <>
            <div className={styles.activeExerciseNav}>
              <span className={styles.activeExerciseProgress}>{wk.exercises.length ? Math.min(activeExIndex + 1, wk.exercises.length) : 0} / {wk.exercises.length}</span>
              <div className={styles.activeExerciseNavButtons}>
                {activeExIndex > 0 && <button onClick={() => goToExercise('prev')} aria-label="Предыдущее упражнение"><ChevronLeft size={18} /></button>}
                <button className={styles.activeModeToggle} onClick={() => setActiveViewMode('list')}>
                  <WorkoutListIcon size={16} />
                  <span>Список</span>
                </button>
                {activeExIndex < wk.exercises.length - 1 && <button onClick={() => goToExercise('next')} aria-label="Следующее упражнение"><ChevronRight size={18} /></button>}
              </div>
            </div>
            <div
              ref={exCardRef}
              className={styles.activeExerciseSwipeArea}
              onTouchStart={onExTouchStart}
              onTouchMove={onExTouchMove}
              onTouchEnd={onExTouchEnd}
              onTouchCancel={onExTouchCancel}
            >
              <div style={exSlideStyle}>
                {wk.exercises[activeExIndex] && renderActiveExerciseCard(wk.exercises[activeExIndex], activeExIndex)}
              </div>
            </div>
          </>
        )}
        <div className={styles.activeActions}>
          <button className={styles.activePause} onClick={() => setRunning(r => !r)}>
            {running ? 'Пауза' : 'Старт'}
          </button>
          <button className={styles.activeFinish} onClick={completeWorkout}>Завершить</button>
        </div>
      </div>
    )
  }

  if (view === 'templates') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {pendingLoad && <WeightTransferModal onConfirm={() => resolveWeightTransfer(true)} onDecline={() => resolveWeightTransfer(false)} onClose={() => setPendingLoad(null)} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setView('list')} style={{ width: 36, height: 36, borderRadius: 10, background: '#1a1a1a', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={18} color="#9ca3af" />
          </button>
          <span style={{ fontSize: 18, fontWeight: 700 }}>Мои тренировки</span>
        </div>

        <button onClick={() => { clearPlanContext(); setWk({ name: '', exercises: [] }); setView('builder') }} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 14, padding: '14px', fontSize: 14, fontWeight: 700, width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          <Plus size={18} /> Собрать новую
        </button>

        {templates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: '#6b7280' }}>
            <Dumbbell size={40} color="#2e2e2e" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: '#9ca3af' }}>Пока нет сохранённых тренировок</div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>Собери тренировку в конструкторе и нажми «Сохранить как шаблон» — она появится здесь для быстрого запуска</div>
          </div>
        ) : templates.map(tpl => {
          const muscles = [...new Set((tpl.exercises || []).map(e => e.muscle).filter(Boolean))]
          return (
            <div key={tpl.id} style={{ background: '#1a1a1a', borderRadius: 18, overflow: 'hidden', border: '1px solid #2e2e2e' }}>
              <SwipeToDelete onDelete={() => deleteTemplate(tpl.id)} confirmText="Удалить эту тренировку?" radius={0}>
                <div style={{ padding: '14px 16px', background: '#1a1a1a' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{tpl.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)' }}>{(tpl.exercises || []).length} упр.{muscles.length ? ' · ' + muscles.join(', ') : ''}</div>
                </div>
              </SwipeToDelete>
              <div style={{ padding: '12px 16px', borderTop: '1px solid #2a2a2a', background: '#161616', display: 'flex', gap: 8 }}>
                <button onClick={() => startEditTemplate(tpl)} style={{ flex: 1, background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 12, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <Edit2 size={14} /> Изменить
                </button>
                <button onClick={() => startFromTemplate(tpl, 'active')} style={{ flex: 1.4, background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 12, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <Play size={14} /> Начать
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (view === 'plan') {
    return (
      <>
        {pendingLoad && <WeightTransferModal onConfirm={() => resolveWeightTransfer(true)} onDecline={() => resolveWeightTransfer(false)} onClose={() => setPendingLoad(null)} />}
        <PlanScreen onBack={() => setView('list')} aiCall={aiCall} profile={state.profile} onStartWorkout={startFromPlan} />
      </>
    )
  }

  if (view === 'library') {
    return (
      <>
        {pendingLoad && <WeightTransferModal onConfirm={() => resolveWeightTransfer(true)} onDecline={() => resolveWeightTransfer(false)} onClose={() => setPendingLoad(null)} />}
        <WorkoutLibrary
          onBack={() => setView('list')}
          profile={state.profile}
          onStart={(program, day, dayIndex) => startFromTemplate({
            id: `${program.id}-${dayIndex}`,
            name: `${program.name} · ${day.name}`,
            exercises: day.exercises,
          }, 'active', 'library')}
        />
      </>
    )
  }

  if (view === 'plans') {
    return (
      <>
        {pendingLoad && <WeightTransferModal onConfirm={() => resolveWeightTransfer(true)} onDecline={() => resolveWeightTransfer(false)} onClose={() => setPendingLoad(null)} />}
        <WorkoutPlansScreen
          plans={customPlans}
          templates={templates}
          aiCall={aiCall}
          onBack={() => setView('list')}
          onSavePlan={saveCustomPlan}
          onDeletePlan={deleteCustomPlan}
          onStartDay={(plan, dayIdx, mode) => startFromCustomPlanDay(plan, dayIdx, mode)}
        />
      </>
    )
  }

  return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <button onClick={() => setView('list')} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
        ← К списку тренировок
      </button>
    </div>
  )
}
