import React, { useState } from 'react'
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Droplets,
  Sparkles,
  X,
} from 'lucide-react'
import styles from './HomeScreen.module.css'
import HomeAssistantSheet from './HomeAssistantSheet'

const FOOD_ACTIONS = [
  { label: 'Описать или сказать', caption: 'AI распознает блюдо по тексту или голосу', asset: 'ai', action: 'ai' },
  { label: 'Сфотографировать еду', caption: 'Распознать продукты на тарелке', asset: 'camera-food', action: 'photo' },
  { label: 'Сканировать код', caption: 'QR- или штрихкод на упаковке', asset: 'barcode', action: 'code' },
  { label: 'Найти продукт', caption: 'Обычный поиск по базе продуктов', asset: 'search', action: 'add' },
]

function arcPoint(angle, radius = 72) {
  const radians = angle * Math.PI / 180
  return { x: 80 + radius * Math.sin(radians), y: 80 - radius * Math.cos(radians) }
}

function describeArc(startAngle, endAngle) {
  const start = arcPoint(startAngle)
  const end = arcPoint(endAngle)
  return `M ${start.x} ${start.y} A 72 72 0 0 1 ${end.x} ${end.y}`
}

const MACRO_ARCS = [
  { start: 245, end: 355 },
  { start: 5, end: 115 },
  { start: 125, end: 235 },
]

function getHomeInsight({ entry, totals, goals, water }) {
  const foods = entry.foods || []
  const workouts = entry.workouts || []
  const caloriesRemaining = Math.max(Math.round(goals.calories - totals.calories), 0)
  const proteinRemaining = Math.max(Math.round(goals.protein - totals.protein), 0)
  const waterRemaining = Math.max(water.goal - water.consumed, 0)

  if (foods.length === 0) {
    return {
      title: 'Ваш план на сегодня',
      body: 'Добавьте первый приём пищи. Я рассчитаю КБЖУ и подскажу, что улучшить.',
      action: 'food',
      actionLabel: 'Добавить еду',
    }
  }

  if (totals.calories > goals.calories) {
    return {
      title: 'Дневная цель достигнута',
      body: `Сейчас записано ${Math.round(totals.calories)} ккал. Помощник подскажет, как спокойно завершить день без жёстких ограничений.`,
    }
  }

  if (proteinRemaining > 0 && totals.calories >= goals.calories * .35) {
    return {
      title: `Осталось ${proteinRemaining} г белка`,
      body: `До цели по калориям остаётся ${caloriesRemaining} ккал. Подберём следующий приём пищи с нужным количеством белка.`,
      action: 'food',
      actionLabel: 'Добавить еду',
    }
  }

  if (waterRemaining > 0 && water.consumed < water.goal * .55) {
    return {
      title: 'Стоит добавить воды',
      body: `Выпито ${water.consumed} из ${water.goal} стаканов. До дневной цели остаётся ${waterRemaining * 250} мл.`,
      action: 'water',
      actionLabel: 'Добавить 250 мл',
    }
  }

  if (workouts.length === 0) {
    return {
      title: 'Тренировка ещё впереди',
      body: 'Откройте план на сегодня или спросите помощника, как скорректировать нагрузку и восстановление.',
      action: 'workout',
      actionLabel: 'Открыть план',
    }
  }

  return {
    title: 'День идёт по плану',
    body: `Осталось ${caloriesRemaining} ккал и ${proteinRemaining} г белка. Можно получить итоговую рекомендацию по питанию и восстановлению.`,
  }
}

export default function HomeScreen({ state, dispatch, goTo, onFoodAction, aiCall, CalendarView }) {
  const [showCalendar, setShowCalendar] = useState(false)
  const [showFoodActions, setShowFoodActions] = useState(false)
  const [showAssistant, setShowAssistant] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const entry = state.entries.find(item => item.date === today) || { date: today, foods: [], workouts: [] }
  const goals = {
    calories: state.profile?.calorieGoal || 2200,
    protein: state.profile?.proteinGoal || 150,
    fat: state.profile?.fatGoal || 70,
    carbs: state.profile?.carbGoal || 250,
  }
  const totals = entry.foods.reduce((sum, food) => ({
    calories: sum.calories + (food.calories || 0),
    protein: sum.protein + (food.protein || 0),
    fat: sum.fat + (food.fat || 0),
    carbs: sum.carbs + (food.carbs || 0),
  }), { calories: 0, protein: 0, fat: 0, carbs: 0 })
  const eaten = Math.round(totals.calories)
  const macroData = [
    { label: 'Белки', value: totals.protein, max: goals.protein, color: 'var(--protein)' },
    { label: 'Жиры', value: totals.fat, max: goals.fat, color: 'var(--amber)' },
    { label: 'Углеводы', value: totals.carbs, max: goals.carbs, color: 'var(--purple)' },
  ].map(item => ({
    ...item,
    percent: item.max > 0 ? Math.min(item.value / item.max * 100, 100) : 0,
  }))
  const dayTitle = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  const currentWorkout = entry.workouts?.[entry.workouts.length - 1]
  const water = state.water
  const waterPercent = water.goal > 0 ? Math.min(water.consumed / water.goal * 100, 100) : 0
  const workoutExerciseCount = currentWorkout?.exercisesDetail?.length || currentWorkout?.exercises?.length || 0
  const insight = getHomeInsight({ entry, totals, goals, water })

  const chooseFoodAction = action => {
    setShowFoodActions(false)
    onFoodAction?.(action)
  }

  const runInsightAction = () => {
    if (insight.action === 'food') {
      setShowAssistant(false)
      onFoodAction?.('ai')
    } else if (insight.action === 'workout') {
      setShowAssistant(false)
      goTo('workout')
    } else if (insight.action === 'water') {
      dispatch({ type: 'SET_WATER', val: Math.min(water.consumed + 1, water.goal) })
    }
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button className={styles.headerButton} onClick={() => setShowCalendar(true)} aria-label="Открыть календарь"><CalendarDays size={18} /></button>
        <div className={styles.headerTitle}><strong>Сегодня</strong><span>{dayTitle}</span></div>
        <button className={styles.headerButton} aria-label="Уведомления"><Bell size={18} /></button>
      </header>

      {showCalendar && CalendarView && <CalendarView state={state} dispatch={dispatch} aiCall={aiCall} onClose={() => setShowCalendar(false)} />}
      {showAssistant && (
        <HomeAssistantSheet
          state={state}
          entry={entry}
          totals={totals}
          goals={goals}
          water={water}
          insight={insight}
          aiCall={aiCall}
          onClose={() => setShowAssistant(false)}
          onContextAction={runInsightAction}
        />
      )}
      {showFoodActions && (
        <div className={styles.foodActionsBackdrop} onClick={() => setShowFoodActions(false)}>
          <div className={styles.foodActionsSheet} onClick={event => event.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <div className={styles.foodActionsHeading}>
              <div><span>AI-питание</span><h2>Как добавить еду?</h2><p>Выберите способ распознавания</p></div>
              <button onClick={() => setShowFoodActions(false)} aria-label="Закрыть"><X size={18} /></button>
            </div>
            <div className={styles.foodActionList}>
              {FOOD_ACTIONS.map(({ label, caption, asset, action }) => (
                <button key={action} onClick={() => chooseFoodAction(action)}>
                  <span className={styles.foodActionIcon}><img src={`/assets/ui-icons-v3/${asset}.png`} alt="" /></span>
                  <div><strong>{label}</strong><small>{caption}</small></div>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <section className={styles.balanceCard}>
        <div className={styles.ringColumn}>
          <div className={styles.macroRing}>
            <svg className={styles.macroRingSvg} viewBox="0 0 160 160" aria-hidden="true">
              {macroData.map((macro, index) => (
                <React.Fragment key={macro.label}>
                  <path className={styles.macroTrackShadow} d={describeArc(MACRO_ARCS[index].start, MACRO_ARCS[index].end)} />
                  <path className={styles.macroTrack} d={describeArc(MACRO_ARCS[index].start, MACRO_ARCS[index].end)} pathLength="100" style={{ '--macro-color': macro.color }} />
                  <path
                    className={styles.macroProgressShadow}
                    d={describeArc(MACRO_ARCS[index].start, MACRO_ARCS[index].end)}
                    pathLength="100"
                    strokeDasharray={`${macro.percent} 100`}
                    style={{ '--macro-color': macro.color }}
                  />
                  <path
                    className={styles.macroProgress}
                    d={describeArc(MACRO_ARCS[index].start, MACRO_ARCS[index].end)}
                    pathLength="100"
                    strokeDasharray={`${macro.percent} 100`}
                    style={{ '--macro-color': macro.color, '--macro-intensity': .48 + macro.percent / 190 }}
                  />
                  <path
                    className={styles.macroShine}
                    d={describeArc(MACRO_ARCS[index].start, MACRO_ARCS[index].end)}
                    pathLength="100"
                    strokeDasharray={`${macro.percent} 100`}
                  />
                </React.Fragment>
              ))}
            </svg>
            <div className={styles.ringInner}>
              <strong>{eaten}</strong>
              <span>ккал</span>
              <small>Цель {goals.calories}</small>
            </div>
          </div>
        </div>
        <div className={styles.macroList}>
          {macroData.map(macro => (
            <div className={styles.macroRow} key={macro.label}>
              <span><i style={{ background: macro.color }} />{macro.label}</span>
              <strong>{Math.round(macro.value)} <small>/ {macro.max} г</small></strong>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.featuredGrid}>
        <button className={`${styles.featureCard} ${styles.foodFeature}`} onClick={() => setShowFoodActions(true)}>
          <span className={styles.featureHeader}>
            <small>Питание</small>
            <ChevronRight size={18} />
          </span>
          <span className={styles.foodIllustration} aria-hidden="true">
            <span className={styles.foodBowl}>
              <i className={styles.foodLeaf} />
              <i className={styles.foodGrain} />
              <i className={styles.foodBerry} />
              <b />
            </span>
          </span>
          <span className={styles.featureCopy}>
            <strong>Добавить еду</strong>
            <em>Выбрать способ</em>
          </span>
        </button>

        <button className={`${styles.featureCard} ${styles.workoutFeature}`} onClick={() => goTo('workout')}>
          <span className={styles.featureHeader}>
            <small>Тренировка</small>
            <ChevronRight size={18} />
          </span>
          <span className={styles.workoutIllustration} aria-hidden="true">
            <span className={styles.dumbbell3d}>
              <span className={styles.dumbbellBar} />
              <span className={`${styles.dumbbellPlate} ${styles.plateOuterLeft}`} />
              <span className={`${styles.dumbbellPlate} ${styles.plateInnerLeft}`} />
              <span className={`${styles.dumbbellPlate} ${styles.plateInnerRight}`} />
              <span className={`${styles.dumbbellPlate} ${styles.plateOuterRight}`} />
            </span>
          </span>
          <span className={styles.featureCopy}>
            <strong>{currentWorkout?.name || 'Открыть план'}</strong>
            <em>{workoutExerciseCount > 0 ? `${workoutExerciseCount} упражнений${currentWorkout?.duration ? ` · ${currentWorkout.duration} мин` : ''}` : 'План на сегодня'}</em>
          </span>
        </button>
      </div>

      {/* Раньше добавить воду можно было только точным тапом по маленькой
          кнопке «250 мл» — теперь тап по всей карточке тоже добавляет
          стакан, кнопка осталась просто как визуальная подсказка (клик по
          ней всплывает и срабатывает тот же обработчик на карточке). */}
      <section
        className={styles.waterCard}
        role="button"
        tabIndex={0}
        onClick={() => dispatch({ type: 'SET_WATER', val: Math.min(water.consumed + 1, water.goal) })}
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); dispatch({ type: 'SET_WATER', val: Math.min(water.consumed + 1, water.goal) }) } }}
        aria-label="Добавить 250 миллилитров воды"
      >
        <span className={styles.waterGlass} aria-hidden="true"><i style={{ height: `${waterPercent}%` }} /><b /></span>
        <span className={styles.waterCopy}>
          <small>Вода</small>
          <strong>{water.consumed} / {water.goal} стаканов</strong>
          <em>{Math.max(water.goal - water.consumed, 0) > 0 ? `Осталось ${Math.max(water.goal - water.consumed, 0) * 250} мл` : 'Цель выполнена'}</em>
        </span>
        <span className={styles.waterDose} aria-hidden="true">
          <Droplets size={16} />
          <span>250 мл</span>
        </span>
      </section>

      {/* Аналогично — раньше помощник открывался только по нажатию на
          кнопку «Открыть помощника», теперь тап по всей карточке тоже
          открывает его. */}
      <section
        className={styles.assistantCard}
        role="button"
        tabIndex={0}
        onClick={() => setShowAssistant(true)}
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setShowAssistant(true) } }}
        aria-label="Открыть AI-помощника"
      >
        <div className={styles.assistantContent}>
          <div className={styles.assistantEyebrow}><Sparkles size={14} />AI-ПОМОЩНИК</div>
          <h2>{insight.title}</h2>
          <p>{insight.body}</p>
          <span className={styles.assistantOpenHint}>Открыть помощника</span>
        </div>
        <div className={styles.assistantOrb} aria-hidden="true"><i /><b /></div>
      </section>
    </div>
  )
}
