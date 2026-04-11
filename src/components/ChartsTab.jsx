import React, { useState } from 'react'
import { useStore } from '../store'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts'
import styles from './ChartsTab.module.css'

export default function ChartsTab() {
  const { weights, entries, profile } = useStore()
  const [activeChart, setActiveChart] = useState('weight')

  // Данные для графика веса (последние 30 дней)
  const weightData = weights
    .slice(0, 30)
    .reverse()
    .map(w => ({
      date: new Date(w.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      вес: w.kg
    }))

  // Данные для графика калорий (последние 14 дней)
  const calData = entries
    .slice(0, 14)
    .reverse()
    .map(e => ({
      date: new Date(e.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      калории: e.totalCalories || 0,
      норма: profile?.calorieGoal || 2000
    }))

  // Данные для графика КБЖУ
  const macroData = entries
    .slice(0, 7)
    .reverse()
    .map(e => ({
      date: new Date(e.date).toLocaleDateString('ru-RU', { day: 'numeric' }),
      Белок: e.totalProtein || 0,
      Жиры: e.totalFat || 0,
      Углеводы: e.totalCarbs || 0,
    }))

  const charts = [
    { id: 'weight', label: '⚖️ Вес' },
    { id: 'calories', label: '🔥 Калории' },
    { id: 'macros', label: '🥗 КБЖУ' },
  ]

  // Статистика веса
  const avgWeight = weights.length > 0
    ? (weights.slice(0, 7).reduce((s, w) => s + w.kg, 0) / Math.min(weights.length, 7)).toFixed(1)
    : null
  const weightDiff = weights.length >= 2
    ? (weights[0].kg - weights[weights.length - 1].kg).toFixed(1)
    : null

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>📊 Графики и статистика</div>

      {/* Переключатель */}
      <div className={styles.tabs}>
        {charts.map(c => (
          <button
            key={c.id}
            className={`${styles.tab} ${activeChart === c.id ? styles.tabActive : ''}`}
            onClick={() => setActiveChart(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* График веса */}
      {activeChart === 'weight' && (
        <div className={styles.chartSection}>
          {/* Статы */}
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Текущий вес</div>
              <div className={styles.statValue}>{weights[0]?.kg || '—'} кг</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Ср. за неделю</div>
              <div className={styles.statValue}>{avgWeight || '—'} кг</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Изменение</div>
              <div className={styles.statValue} style={{
                color: weightDiff > 0 ? '#dc2626' : weightDiff < 0 ? '#16a34a' : 'inherit'
              }}>
                {weightDiff ? `${weightDiff > 0 ? '+' : ''}${weightDiff} кг` : '—'}
              </div>
            </div>
          </div>

          {weightData.length > 0 ? (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={weightData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="вес"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#2563eb' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={styles.empty}>
              <div>⚖️</div>
              <div>Нет данных о весе</div>
              <div className={styles.emptyHint}>Добавьте вес на вкладке "Сегодня"</div>
            </div>
          )}
        </div>
      )}

      {/* График калорий */}
      {activeChart === 'calories' && (
        <div className={styles.chartSection}>
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Цель</div>
              <div className={styles.statValue}>{profile?.calorieGoal || '—'}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Ср. за неделю</div>
              <div className={styles.statValue}>
                {entries.length > 0
                  ? Math.round(entries.slice(0, 7).reduce((s, e) => s + (e.totalCalories || 0), 0) / Math.min(entries.length, 7))
                  : '—'}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Дней записей</div>
              <div className={styles.statValue}>{entries.filter(e => e.totalCalories > 0).length}</div>
            </div>
          </div>

          {calData.length > 0 ? (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={calData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <ReferenceLine y={profile?.calorieGoal} stroke="#dc2626" strokeDasharray="4 4" />
                  <Bar dataKey="калории" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={styles.empty}>
              <div>🔥</div>
              <div>Нет данных о калориях</div>
              <div className={styles.emptyHint}>Добавьте питание на вкладке "Сегодня"</div>
            </div>
          )}
        </div>
      )}

      {/* График КБЖУ */}
      {activeChart === 'macros' && (
        <div className={styles.chartSection}>
          <div className={styles.legend}>
            <span style={{ color: '#16a34a' }}>● Белок</span>
            <span style={{ color: '#ea580c' }}>● Жиры</span>
            <span style={{ color: '#d97706' }}>● Углеводы</span>
          </div>

          {macroData.length > 0 ? (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={macroData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="Белок" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Жиры" fill="#ea580c" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Углеводы" fill="#d97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={styles.empty}>
              <div>🥗</div>
              <div>Нет данных о КБЖУ</div>
              <div className={styles.emptyHint}>Добавьте питание на вкладке "Сегодня"</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
