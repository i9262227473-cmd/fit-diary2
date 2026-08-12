import React, { useState } from 'react'
import { Bell, CalendarDays, ChevronRight, Dumbbell, Droplets, Plus, Utensils } from 'lucide-react'
import CircularProgress, { getCalorieColor } from '../common/CircularProgress'
import styles from './HomeScreen.module.css'

export default function HomeScreen({ state, dispatch, goTo, name, aiCall, CalendarView }) {
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
  const remaining = Math.max(0, goals.calories - eaten)
  const water = state.water
  const currentWorkout = entry.workouts?.[entry.workouts.length - 1]
  const dayName = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
  const calColor = getCalorieColor(eaten / goals.calories)
  const caloriePercent = goals.calories > 0 ? Math.min(Math.round(eaten / goals.calories * 100), 100) : 0
  const firstName = name?.trim().split(' ')[0] || 'спортсмен'

  const macros = [
    { label: 'Белки', value: totals.protein, max: goals.protein, color: 'var(--accent)' },
    { label: 'Жиры', value: totals.fat, max: goals.fat, color: 'var(--amber)' },
    { label: 'Углеводы', value: totals.carbs, max: goals.carbs, color: 'var(--teal)' },
  ]

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <div className={styles.date}>{dayName}</div>
          <h1 className={styles.title}>В ритме, {firstName}</h1>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.iconButton} onClick={() => setShowCalendar(true)} aria-label="Открыть календарь">
            <CalendarDays size={19} />
          </button>
          <button className={styles.iconButton} aria-label="Уведомления">
            <Bell size={19} />
          </button>
        </div>
      </header>

      {showCalendar && CalendarView && (
        <CalendarView state={state} dispatch={dispatch} aiCall={aiCall} onClose={() => setShowCalendar(false)} />
      )}

      <section className={styles.workoutCard} onClick={() => goTo('workout')}>
        <div className={styles.workoutGlow} />
        <div className={styles.cardTopline}>
          <span className={styles.sectionLabel}>{currentWorkout ? 'Последняя тренировка' : 'Тренировка дня'}</span>
          <span className={styles.status}><span className={styles.statusDot} />Сегодня</span>
        </div>
        <div className={styles.workoutBody}>
          <div className={styles.workoutIcon}><Dumbbell size={25} /></div>
          <div className={styles.workoutCopy}>
            <h2>{currentWorkout?.name || 'Готов к тренировке?'}</h2>
            <p>
              {currentWorkout
                ? `${currentWorkout.exercises?.length || 0} упражнений · ${currentWorkout.duration || 0} мин`
                : 'Открой план или начни свою тренировку'}
            </p>
          </div>
          <div className={styles.workoutArrow}><ChevronRight size={20} /></div>
        </div>
        <div className={styles.workoutFooter}>
          <span>{currentWorkout ? 'Открыть тренировку' : 'Начать тренировку'}</span>
          <ChevronRight size={16} />
        </div>
      </section>

      <div className={styles.quickGrid}>
        <button className={styles.quickAction} onClick={() => goTo('food')}>
          <span className={`${styles.quickIcon} ${styles.foodIcon}`}><Utensils size={19} /></span>
          <span><strong>Добавить еду</strong><small>Записать приём пищи</small></span>
          <Plus size={17} className={styles.quickPlus} />
        </button>
        <button className={styles.quickAction} onClick={() => goTo('workout')}>
          <span className={`${styles.quickIcon} ${styles.trainingIcon}`}><Dumbbell size={19} /></span>
          <span><strong>Тренировка</strong><small>План и история</small></span>
          <ChevronRight size={17} className={styles.quickPlus} />
        </button>
      </div>

      <section className={styles.nutritionCard} onClick={() => goTo('food')}>
        <div className={styles.cardHeading}>
          <div>
            <span className={styles.sectionLabel}>Питание сегодня</span>
            <h2>Энергия и баланс</h2>
          </div>
          <div className={styles.percentBadge}>{caloriePercent}%</div>
        </div>

        <div className={styles.nutritionMain}>
          <CircularProgress value={eaten} max={goals.calories} size={112} stroke={7} dynamicColor>
            <div className={styles.calorieValue} style={{ color: calColor }}>{eaten}</div>
            <div className={styles.calorieUnit}>ккал</div>
          </CircularProgress>
          <div className={styles.energyStats}>
            <div><span>Цель</span><strong>{goals.calories}</strong></div>
            <div><span>Осталось</span><strong className={styles.remaining}>{remaining}</strong></div>
          </div>
        </div>

        <div className={styles.macros}>
          {macros.map(macro => {
            const percent = macro.max > 0 ? Math.min(macro.value / macro.max * 100, 100) : 0
            const color = macro.max > 0 && macro.value > macro.max ? '#f87171' : macro.color

            return (
              <div className={styles.macro} key={macro.label}>
                <div className={styles.macroMeta}>
                  <span>{macro.label}</span>
                  <strong style={{ color }}>{Math.round(macro.value)} <small>/ {macro.max} г</small></strong>
                </div>
                <div className={styles.track}>
                  <div className={styles.fill} style={{ width: `${percent}%`, background: color }} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className={styles.waterCard}>
        <div className={styles.waterHeader}>
          <div className={styles.waterTitle}>
            <span className={styles.waterIcon}><Droplets size={20} /></span>
            <div><span className={styles.sectionLabel}>Гидратация</span><h2>Вода</h2></div>
          </div>
          <div className={styles.waterValue}><strong>{water.consumed}</strong><span>/ {water.goal} стаканов</span></div>
        </div>
        <div className={styles.waterSteps}>
          {Array.from({ length: water.goal }).map((_, index) => (
            <button
              key={index}
              onClick={() => dispatch({ type: 'SET_WATER', val: index < water.consumed ? index : index + 1 })}
              className={`${styles.waterStep} ${index < water.consumed ? styles.waterStepActive : ''}`}
              aria-label={`${index + 1} стакан`}
            >
              <span />
            </button>
          ))}
        </div>
        <div className={styles.waterTrack}>
          <div style={{ width: `${water.goal > 0 ? Math.min(water.consumed / water.goal * 100, 100) : 0}%` }} />
        </div>
      </section>
    </div>
  )
}
