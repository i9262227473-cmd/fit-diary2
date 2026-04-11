import React, { useState, useEffect } from 'react'
import { useStore } from '../../store'
import styles from './WaterTab.module.css'

const PER_GLASS = 200 // мл за один стакан

// Сохраняем воду по дате
function getTodayKey() {
  return 'water-' + new Date().toISOString().split('T')[0]
}

export default function WaterTab() {
  const { profile } = useStore()

  // Норма воды по весу (30мл на кг, минимум 1500, максимум 4000)
  const weight = profile?.weight || 80
  const goalMl = Math.min(Math.max(Math.round(weight * 30 / 100) * 100, 1500), 4000)
  const totalGlasses = Math.round(goalMl / PER_GLASS)

  const [drunk, setDrunk] = useState(() => {
    const saved = localStorage.getItem(getTodayKey())
    return saved ? +saved : 0
  })

  useEffect(() => {
    localStorage.setItem(getTodayKey(), String(drunk))
  }, [drunk])

  const addGlass = () => { if (drunk < totalGlasses) setDrunk(d => d + 1) }
  const undo = () => { if (drunk > 0) setDrunk(d => d - 1) }
  const toggleGlass = (i) => {
    if (i < drunk) setDrunk(i)       // клик на выпитый — убираем до него
    else setDrunk(i + 1)             // клик на пустой — заполняем до него
  }

  const drunkMl = drunk * PER_GLASS
  const pct = Math.min(Math.round((drunkMl / goalMl) * 100), 100)
  const remaining = Math.max(goalMl - drunkMl, 0)

  // Цвет прогресса
  const progressColor = pct >= 100
    ? '#10d9a4'
    : pct >= 60
    ? '#4facfe'
    : '#7aa0cc'

  // Сколько колонок в сетке
  const cols = totalGlasses <= 8 ? 4 : totalGlasses <= 12 ? 4 : 5

  return (
    <div className={styles.page}>

      {/* ── Счётчик ── */}
      <div className={styles.counterCard}>
        <div className={styles.counterLeft}>
          <div className={styles.counterMl}>
            <span className={styles.counterNum}>{drunkMl.toLocaleString('ru')}</span>
            <span className={styles.counterUnit}>мл</span>
          </div>
          <div className={styles.counterGoal}>норма {goalMl.toLocaleString('ru')} мл</div>
          <div className={styles.pctBadge} style={{ background: pct >= 100 ? 'rgba(16,217,164,.12)' : 'rgba(79,172,254,.12)', borderColor: pct >= 100 ? 'rgba(16,217,164,.25)' : 'rgba(79,172,254,.25)', color: pct >= 100 ? '#10d9a4' : '#4facfe' }}>
            {pct}%
          </div>
        </div>
        <div className={styles.counterRight}>
          {pct < 100 && (
            <div className={styles.remaining}>
              <div className={styles.remainingNum}>{remaining.toLocaleString('ru')}</div>
              <div className={styles.remainingLabel}>мл осталось</div>
            </div>
          )}
          {pct >= 100 && (
            <div className={styles.done}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10d9a4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <div className={styles.doneLabel}>Норма</div>
              <div className={styles.doneLabel}>выполнена</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Полоска прогресса ── */}
      <div className={styles.progressBar}>
        <div className={styles.progressFill}
          style={{ width: pct + '%', background: `linear-gradient(90deg, #7aa0cc, ${progressColor})`, transition: 'width .5s ease' }} />
      </div>

      {/* ── Стаканчики ── */}
      <div className={styles.glassesGrid} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: totalGlasses }, (_, i) => {
          const filled = i < drunk
          return (
            <button key={i} className={styles.glassBtn} onClick={() => toggleGlass(i)}>
              <svg viewBox="0 0 44 56" fill="none" className={styles.glassSvg}>
                <defs>
                  <linearGradient id={`wg${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4facfe" stopOpacity="0.9"/>
                    <stop offset="100%" stopColor="#00c6ff" stopOpacity="0.7"/>
                  </linearGradient>
                  <clipPath id={`cp${i}`}>
                    <path d="M8 6 L12 50 Q12 52 14 52 L30 52 Q32 52 32 50 L36 6 Z"/>
                  </clipPath>
                </defs>
                {/* Стакан */}
                <path d="M8 6 L12 50 Q12 52 14 52 L30 52 Q32 52 32 50 L36 6 Z"
                  fill={filled ? 'rgba(79,172,254,0.1)' : 'rgba(255,255,255,0.03)'}
                  stroke={filled ? 'rgba(79,172,254,0.6)' : 'rgba(255,255,255,0.12)'}
                  strokeWidth="1.5" strokeLinejoin="round"/>
                {/* Вода */}
                {filled && (
                  <>
                    <rect x="8" y="26" width="28" height="28"
                      fill={`url(#wg${i})`} clipPath={`url(#cp${i})`}/>
                    <path d="M10 28 Q17 24 22 28 Q27 32 34 28"
                      stroke="rgba(255,255,255,0.35)" strokeWidth="1"
                      fill="none" strokeLinecap="round"/>
                  </>
                )}
                {/* Ободок */}
                <rect x="6" y="3" width="32" height="5" rx="2.5"
                  fill={filled ? 'rgba(79,172,254,0.4)' : 'rgba(255,255,255,0.07)'}/>
              </svg>
              <div className={styles.glassLabel} style={{ color: filled ? '#4facfe' : 'rgba(255,255,255,.2)' }}>
                {filled ? '200' : '—'}
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Кнопки ── */}
      <button className={styles.addBtn} onClick={addGlass} disabled={drunk >= totalGlasses}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        + 200 мл воды
      </button>

      <button className={styles.undoBtn} onClick={undo} disabled={drunk === 0}>
        Отменить последний стакан
      </button>

      {/* ── Подсказка ── */}
      <div className={styles.hint}>
        Норма рассчитана по весу {weight} кг · {PER_GLASS} мл = 1 стакан
      </div>
    </div>
  )
}
