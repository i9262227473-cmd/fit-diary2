// AUTO-PATCH: Исправляет битый кэш планов при загрузке приложения
// Вызывается из main.jsx ДО рендера React

const PLAN_KEYS = [
  'workout-plan-v4-pro', 'workout-plan-v3-ru',
  'workout-plan-v4', 'workout-plan-v3', 'workout-plan-v2', 'workout-plan-v1',
]

export function patchLocalStorage() {
  PLAN_KEYS.forEach(key => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return
      const p = JSON.parse(raw)
      
      // Структура невалидна — удаляем
      if (!p?.plan?.days || !Array.isArray(p.plan.days)) {
        localStorage.removeItem(key)
        return
      }
      
      // Нормализуем reps если они в старом формате (строка или объект без min/max)
      let modified = false
      p.plan.days.forEach(day => {
        if (!day.exercises) return
        day.exercises.forEach(ex => {
          if (!ex.reps) {
            ex.reps = { min: 8, max: 12 }
            modified = true
          } else if (typeof ex.reps === 'string') {
            // "8-12" → {min:8, max:12}
            const parts = ex.reps.split('-')
            ex.reps = { min: parseInt(parts[0]) || 8, max: parseInt(parts[1]) || 12 }
            modified = true
          } else if (typeof ex.reps === 'object' && (!('min' in ex.reps) || !('max' in ex.reps))) {
            ex.reps = { min: ex.reps.min || 8, max: ex.reps.max || 12 }
            modified = true
          }
        })
      })
      
      if (modified) {
        console.info(`[patch] Нормализован кэш: ${key}`)
        localStorage.setItem(key, JSON.stringify(p))
      }
    } catch (e) {
      console.warn(`[patch] Сброс битого кэша ${key}:`, e.message)
      localStorage.removeItem(key)
    }
  })
}
