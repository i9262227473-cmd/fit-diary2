// Утилита для безопасного получения reps из данных AI-плана
// Исправляет: TypeError: Cannot read properties of undefined (reading 'min')
export function normReps(reps) {
  if (!reps) return { min: 8, max: 12 }
  if (typeof reps === 'object' && 'min' in reps && 'max' in reps) return reps
  const parts = String(reps).split('-')
  return { min: parseInt(parts[0]) || 8, max: parseInt(parts[1]) || 12 }
}

// Нормализует весь план из localStorage — исправляет битый кэш
export function normalizePlan(raw) {
  try {
    if (!raw) return null
    const p = JSON.parse(raw)
    if (!p?.plan?.days || !Array.isArray(p.plan.days)) return null
    p.plan.days.forEach(day => {
      (day.exercises || []).forEach(ex => {
        ex.reps = normReps(ex.reps)
      })
    })
    return p
  } catch { return null }
}

// Очищает все старые версии планов из localStorage
export function clearOldPlans() {
  const OLD_KEYS = ['workout-plan-v1','workout-plan-v2','workout-plan-v3','workout-plan-v3-ru','workout-plan-v4']
  OLD_KEYS.forEach(k => localStorage.removeItem(k))
}
