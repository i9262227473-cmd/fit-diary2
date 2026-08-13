import React, { useState } from 'react'
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Camera,
  ChevronRight,
  Dumbbell,
  Mic,
  Plus,
  ScanLine,
  Search,
  Sparkles,
} from 'lucide-react'
import styles from './HomeScreen.module.css'

const MEALS = {
  breakfast: { label: 'Завтрак', image: '/assets/meals/breakfast-3d.webp' },
  lunch: { label: 'Обед', image: '/assets/meals/lunch-3d.webp' },
  dinner: { label: 'Ужин', image: '/assets/meals/dinner-3d.webp' },
  snack: { label: 'Перекус', image: '/assets/meals/snack-3d.webp' },
}

const FOOD_SHORTCUTS = [
  { label: 'Голос', Icon: Mic, action: 'ai' },
  { label: 'Фото', Icon: Camera, action: 'photo' },
  { label: 'Сканер', Icon: ScanLine, action: 'code' },
  { label: 'Поиск', Icon: Search, action: 'add' },
]

function arcPoint(angle, radius = 61) {
  const radians = angle * Math.PI / 180
  return { x: 80 + radius * Math.sin(radians), y: 80 - radius * Math.cos(radians) }
}

function describeArc(startAngle, endAngle) {
  const start = arcPoint(startAngle)
  const end = arcPoint(endAngle)
  return `M ${start.x} ${start.y} A 61 61 0 0 1 ${end.x} ${end.y}`
}

const MACRO_ARCS = [
  { start: 245, end: 355 },
  { start: 5, end: 115 },
  { start: 125, end: 235 },
]

export default function HomeScreen({ state, dispatch, goTo, onFoodAction, aiCall, CalendarView }) {
  const [showCalendar, setShowCalendar] = useState(false)
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

  const mealRows = Object.entries(MEALS).map(([key, meta]) => {
    const foods = entry.foods.filter(item => item.meal === key)
    if (!foods.length) return null
    const calories = Math.round(foods.reduce((sum, item) => sum + (item.calories || 0), 0))
    return { key, ...meta, foods, calories }
  }).filter(Boolean)

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button className={styles.headerButton} onClick={() => setShowCalendar(true)} aria-label="Открыть календарь"><CalendarDays size={18} /></button>
        <div className={styles.headerTitle}><strong>Сегодня</strong><span>{dayTitle}</span></div>
        <button className={styles.headerButton} aria-label="Уведомления"><Bell size={18} /></button>
      </header>

      {showCalendar && CalendarView && <CalendarView state={state} dispatch={dispatch} aiCall={aiCall} onClose={() => setShowCalendar(false)} />}

      <section className={styles.balanceCard}>
        <div className={styles.ringColumn}>
          <div className={styles.macroRing}>
            <svg className={styles.macroRingSvg} viewBox="0 0 160 160" aria-hidden="true">
              {macroData.map((macro, index) => (
                <React.Fragment key={macro.label}>
                  <path className={styles.macroTrack} d={describeArc(MACRO_ARCS[index].start, MACRO_ARCS[index].end)} pathLength="100" style={{ '--macro-color': macro.color }} />
                  <path
                    className={styles.macroProgress}
                    d={describeArc(MACRO_ARCS[index].start, MACRO_ARCS[index].end)}
                    pathLength="100"
                    strokeDasharray={`${macro.percent} 100`}
                    style={{ '--macro-color': macro.color, '--macro-intensity': .48 + macro.percent / 190 }}
                  />
                </React.Fragment>
              ))}
            </svg>
            <div className={styles.ringInner}><strong>{eaten}</strong><span>ккал</span></div>
          </div>
          <span className={styles.goal}>Цель: {goals.calories} ккал</span>
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

      <section className={styles.foodComposer}>
        <div className={styles.foodComposerHeading}>
          <h2>Добавить еду</h2>
          <span><Sparkles size={12} /> AI</span>
        </div>
        <button className={styles.foodPrompt} onClick={() => onFoodAction?.('ai')}>
          <span>Что вы съели?</span>
          <i><ArrowRight size={17} /></i>
        </button>
        <div className={styles.foodShortcuts}>
          {FOOD_SHORTCUTS.map(({ label, Icon, action }) => (
            <button key={action} onClick={() => onFoodAction?.(action)}>
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.mealsSection}>
        <div className={styles.sectionHeading}>
          <div><span>Питание</span><h2>Приёмы пищи</h2></div>
          <button onClick={() => onFoodAction?.('add')}><Plus size={17} /> Добавить</button>
        </div>

        {mealRows.length > 0 ? (
          <div className={styles.mealRows}>
            {mealRows.map(meal => (
              <button className={styles.mealRow} key={meal.key} onClick={() => onFoodAction?.('log')}>
                <img src={meal.image} alt="" />
                <span className={styles.mealCopy}>
                  <strong>{meal.label}</strong>
                  <small>{meal.foods.map(food => food.name).join(', ')}</small>
                </span>
                <span className={styles.mealCalories}>{meal.calories}<small>ккал</small></span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        ) : (
          <button className={styles.emptyMeal} onClick={() => onFoodAction?.('ai')}>
            <span><Sparkles size={20} /></span><strong>Добавить первый приём пищи</strong><small>Начать с AI-поиска</small>
          </button>
        )}
      </section>

      <div className={styles.compactGrid}>
        <button className={styles.compactCard} onClick={() => goTo('workout')}>
          <span className={styles.workoutIllustration} aria-hidden="true"><Dumbbell size={29} strokeWidth={2.4} /></span>
          <span><small>Тренировка</small><strong>{currentWorkout?.name || 'Открыть план'}</strong>{workoutExerciseCount > 0 && <em>{workoutExerciseCount} упражнений{currentWorkout?.duration ? ` · ${currentWorkout.duration} мин` : ''}</em>}</span>
          <ChevronRight size={17} />
        </button>
        <section className={styles.compactCard}>
          <span className={styles.waterGlass} aria-hidden="true"><i style={{ height: `${waterPercent}%` }} /><b /></span>
          <span><small>Вода</small><strong>{water.consumed} / {water.goal} стаканов</strong><em>{Math.max(water.goal - water.consumed, 0) > 0 ? `Осталось ${Math.max(water.goal - water.consumed, 0) * 250} мл` : 'Цель выполнена'}</em></span>
          <button className={styles.waterAdd} onClick={() => dispatch({ type: 'SET_WATER', val: Math.min(water.consumed + 1, water.goal) })} aria-label="Добавить стакан"><Plus size={17} /></button>
        </section>
      </div>
    </div>
  )
}
