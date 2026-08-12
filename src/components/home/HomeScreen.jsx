import React, { useState } from 'react'
import {
  Barcode,
  Bell,
  CalendarDays,
  Camera,
  ChevronRight,
  Droplets,
  Dumbbell,
  Plus,
  QrCode,
} from 'lucide-react'
import styles from './HomeScreen.module.css'

const MEALS = {
  breakfast: { label: 'Завтрак', image: '/assets/meals/breakfast-3d.webp' },
  lunch: { label: 'Обед', image: '/assets/meals/lunch-3d.webp' },
  dinner: { label: 'Ужин', image: '/assets/meals/dinner-3d.webp' },
  snack: { label: 'Перекус', image: '/assets/meals/snack-3d.webp' },
}

const QUICK_ACTIONS = [
  { label: 'Штрих-код', caption: 'Сканировать', Icon: Barcode, action: 'barcode' },
  { label: 'QR-код', caption: 'Сканировать', Icon: QrCode, action: 'qr' },
  { label: 'Фото еды', caption: 'Распознать', Icon: Camera, action: 'photo' },
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

      <section className={styles.quickActions}>
        {QUICK_ACTIONS.map(({ label, caption, Icon, action }) => (
          <button key={label} onClick={() => onFoodAction?.(action)}>
            <span className={styles.actionIcon}><Icon size={22} strokeWidth={2.35} /></span>
            <strong>{label}</strong><small>{caption}</small>
          </button>
        ))}
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
          <button className={styles.emptyMeal} onClick={() => onFoodAction?.('add')}>
            <span><Plus size={20} /></span><strong>Добавить первый приём пищи</strong><small>Вручную, по фото или штрих-коду</small>
          </button>
        )}
      </section>

      <div className={styles.compactGrid}>
        <button className={styles.compactCard} onClick={() => goTo('workout')}>
          <span className={styles.compactIcon}><Dumbbell size={20} /></span>
          <span><small>Тренировка</small><strong>{currentWorkout?.name || 'Открыть план'}</strong></span>
          <ChevronRight size={17} />
        </button>
        <section className={styles.compactCard}>
          <span className={`${styles.compactIcon} ${styles.waterIcon}`}><Droplets size={20} /></span>
          <span><small>Вода</small><strong>{water.consumed} / {water.goal}</strong></span>
          <button className={styles.waterAdd} onClick={() => dispatch({ type: 'SET_WATER', val: Math.min(water.consumed + 1, water.goal) })} aria-label="Добавить стакан"><Plus size={17} /></button>
        </section>
      </div>
    </div>
  )
}
