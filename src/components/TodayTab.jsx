import React, { useState } from 'react'
import { useStore } from '../store'
import styles from './TodayTab.module.css'

const today = () => new Date().toISOString().split('T')[0]

export default function TodayTab() {
  const { profile, getEntry, saveEntry, addWeight, weights } = useStore()
  const entry = getEntry(today())
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [weightInput, setWeightInput] = useState('')

  const todayWeight = weights.find(w => w.date === today())

  const cal = entry.totalCalories || 0
  const prot = entry.totalProtein || 0
  const fat = entry.totalFat || 0
  const carbs = entry.totalCarbs || 0

  const calGoal = profile?.calorieGoal || 2000
  const protGoal = profile?.proteinGoal || 140
  const fatGoal = profile?.fatGoal || 70
  const carbGoal = profile?.carbGoal || 200

  const pct = (val, goal) => Math.min(Math.round(val / goal * 100), 100)

  const macros = [
    { label: 'КАЛОРИИ', value: cal, goal: calGoal, unit: 'ккал', color: '#2563eb' },
    { label: 'БЕЛОК', value: prot, goal: protGoal, unit: 'г', color: '#16a34a' },
    { label: 'ЖИРЫ', value: fat, goal: fatGoal, unit: 'г', color: '#ea580c' },
    { label: 'УГЛЕВОДЫ', value: carbs, goal: carbGoal, unit: 'г', color: '#d97706' },
  ]

  return (
    <div className={styles.wrap}>
      {/* Дата */}
      <div className={styles.dateBar}>
        <span className={styles.dateLabel}>
          {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })}
        </span>
      </div>

      {/* Вес */}
      <div className={styles.weightRow} onClick={() => setShowWeightModal(true)}>
        <span className={styles.weightLabel}>⚖️ Вес:</span>
        <span className={styles.weightValue}>
          {todayWeight ? `${todayWeight.kg} кг` : '— нажми'}
        </span>
      </div>

      {/* КБЖУ карточки */}
      <div className={styles.macroGrid}>
        {macros.map(m => (
          <div key={m.label} className={styles.macroCard}>
            <div className={styles.macroLabel}>{m.label}</div>
            <div className={styles.macroValue} style={{ color: m.color }}>{m.value}</div>
            <div className={styles.macroGoal}>из {m.goal} {m.unit}</div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${pct(m.value, m.goal)}%`, background: m.color }}
              />
            </div>
            <div className={styles.macroPct} style={{ color: m.color }}>
              {pct(m.value, m.goal)}%
            </div>
          </div>
        ))}
      </div>

      {/* Питание */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>🍽️ Питание</span>
          <button className={styles.addBtn}>+ Добавить</button>
        </div>
        {(!entry.foods || entry.foods.length === 0) ? (
          <div className={styles.empty}>Приёмов пищи пока нет</div>
        ) : (
          entry.foods.map((f, i) => (
            <div key={i} className={styles.foodItem}>
              <div className={styles.foodName}>{f.name}</div>
              <div className={styles.foodMeta}>{f.calories} ккал · Б{f.protein}г · Ж{f.fat}г · У{f.carbs}г</div>
            </div>
          ))
        )}
      </div>

      {/* Тренировки */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>🏋️ Тренировки</span>
          <button className={styles.addBtn}>+ Добавить</button>
        </div>
        {(!entry.workouts || entry.workouts.length === 0) ? (
          <div className={styles.empty}>Тренировок пока нет</div>
        ) : (
          entry.workouts.map((w, i) => (
            <div key={i} className={styles.foodItem}>
              <div className={styles.foodName}>{w.name}</div>
              <div className={styles.foodMeta}>{w.duration} мин · {w.pulse} уд/мин</div>
            </div>
          ))
        )}
      </div>

      {/* Модал веса */}
      {showWeightModal && (
        <div className={styles.modalOverlay} onClick={() => setShowWeightModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>Введите вес</div>
            <input
              className="field-input"
              type="number"
              placeholder="кг"
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
              autoFocus
            />
            <button
              className="btn-primary"
              style={{ marginTop: '12px' }}
              onClick={() => {
                if (weightInput) {
                  addWeight(today(), +weightInput)
                  setShowWeightModal(false)
                  setWeightInput('')
                }
              }}
            >Сохранить</button>
          </div>
        </div>
      )}
    </div>
  )
}
