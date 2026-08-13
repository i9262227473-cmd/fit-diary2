import React, { useState } from 'react'
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Camera,
  ChevronRight,
  Plus,
  ScanLine,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { getExerciseMedia } from '../../data/exerciseMedia'
import styles from './HomeScreen.module.css'

const MEALS = {
  breakfast: { label: 'Завтрак', image: '/assets/meals/breakfast-3d.webp' },
  lunch: { label: 'Обед', image: '/assets/meals/lunch-3d.webp' },
  dinner: { label: 'Ужин', image: '/assets/meals/dinner-3d.webp' },
  snack: { label: 'Перекус', image: '/assets/meals/snack-3d.webp' },
}

const FOOD_ACTIONS = [
  { label: 'Описать или сказать', caption: 'AI рассчитает блюдо по тексту или голосу', Icon: Sparkles, action: 'ai' },
  { label: 'Сфотографировать еду', caption: 'Распознать продукты на тарелке', Icon: Camera, action: 'photo' },
  { label: 'Сканировать код', caption: 'QR- или штрихкод на упаковке', Icon: ScanLine, action: 'code' },
  { label: 'Обычный поиск', caption: 'Найти продукт в базе', Icon: Search, action: 'add' },
]

function getWorkoutImage(workout) {
  const exerciseName = workout?.exercisesDetail?.[0]?.name || workout?.exercises?.[0]?.name || workout?.exercises?.[0]
  const media = getExerciseMedia(exerciseName)
  if (media) return media.start
  const name = String(workout?.name || workout?.type || '').toLowerCase()
  if (name.includes('спин')) return '/assets/muscles/back.webp'
  if (name.includes('ног')) return '/assets/muscles/legs.webp'
  if (name.includes('плеч')) return '/assets/muscles/shoulders.webp'
  if (name.includes('бицеп')) return '/assets/muscles/biceps.webp'
  if (name.includes('трицеп')) return '/assets/muscles/triceps.webp'
  if (name.includes('пресс') || name.includes('кор')) return '/assets/muscles/core.webp'
  if (name.includes('кардио')) return '/assets/muscles/cardio.webp'
  return '/assets/muscles/chest.webp'
}

export default function HomeScreen({ state, dispatch, goTo, onFoodAction, aiCall, CalendarView }) {
  const [showCalendar, setShowCalendar] = useState(false)
  const [showFoodActions, setShowFoodActions] = useState(false)
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
  const caloriePercent = goals.calories > 0 ? Math.min(eaten / goals.calories * 100, 100) : 0
  const macroCalories = totals.protein * 4 + totals.fat * 9 + totals.carbs * 4
  const proteinShare = macroCalories > 0 ? totals.protein * 4 / macroCalories : .34
  const fatShare = macroCalories > 0 ? totals.fat * 9 / macroCalories : .33
  const proteinEnd = caloriePercent * proteinShare
  const fatEnd = proteinEnd + caloriePercent * fatShare
  const ringStyle = {
    background: `conic-gradient(from -90deg, var(--protein) 0 ${proteinEnd}%, var(--amber) ${proteinEnd}% ${fatEnd}%, var(--purple) ${fatEnd}% ${caloriePercent}%, var(--surface3) ${caloriePercent}% 100%)`,
  }
  const dayTitle = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  const currentWorkout = entry.workouts?.[entry.workouts.length - 1]
  const water = state.water
  const waterPercent = water.goal > 0 ? Math.min(water.consumed / water.goal * 100, 100) : 0
  const workoutExerciseCount = currentWorkout?.exercisesDetail?.length || currentWorkout?.exercises?.length || 0
  const workoutImage = getWorkoutImage(currentWorkout)

  const chooseFoodAction = action => {
    setShowFoodActions(false)
    onFoodAction?.(action)
  }

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
      {showFoodActions && (
        <div className={styles.foodActionsBackdrop} onClick={() => setShowFoodActions(false)}>
          <div className={styles.foodActionsSheet} onClick={event => event.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <div className={styles.foodActionsHeading}>
              <div><span>AI-питание</span><h2>Как добавить еду?</h2></div>
              <button onClick={() => setShowFoodActions(false)} aria-label="Закрыть"><X size={18} /></button>
            </div>
            <div className={styles.foodActionList}>
              {FOOD_ACTIONS.map(({ label, caption, Icon, action }) => (
                <button key={action} onClick={() => chooseFoodAction(action)}>
                  <span><Icon size={20} /></span>
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
          <div className={styles.macroRing} style={ringStyle}>
            <div className={styles.ringInner}><strong>{eaten}</strong><span>ккал</span></div>
          </div>
          <span className={styles.goal}>Цель: {goals.calories} ккал</span>
        </div>
        <div className={styles.macroList}>
          {[
            ['Белки', totals.protein, goals.protein, 'var(--protein)'],
            ['Жиры', totals.fat, goals.fat, 'var(--amber)'],
            ['Углеводы', totals.carbs, goals.carbs, 'var(--purple)'],
          ].map(([label, value, max, color]) => (
            <div className={styles.macroRow} key={label}>
              <span style={{ color }}>{label}</span>
              <strong>{Math.round(value)} <small>/ {max} г</small></strong>
            </div>
          ))}
        </div>
      </section>

      <button className={styles.aiHero} onClick={() => setShowFoodActions(true)}>
        <img src="/assets/home/ai-food-hero.webp" alt="Полезное блюдо с курицей и овощами" />
        <span className={styles.aiHeroShade} />
        <span className={styles.aiHeroCopy}>
          <small><Sparkles size={12} /> AI-питание</small>
          <strong>Добавить еду с AI</strong>
          <em>Фото, голос, текст или код</em>
          <b>Добавить за несколько секунд <ArrowRight size={14} /></b>
        </span>
      </button>

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
          <img className={styles.workoutVisual} src={workoutImage} alt="" />
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
