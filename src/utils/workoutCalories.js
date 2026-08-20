// Оценка расхода через MET: ккал/мин = MET × 3.5 × вес(кг) / 200.
// Для силовой намеренно используем умеренные MET, чтобы не завышать расход.
const STRENGTH_MET = {
  'Легко': 3.0,
  'Норм': 3.5,
  'Тяжело': 4.0,
  'Очень': 4.5,
}

export function estimateWorkoutCalories({ weightKg, durationMin, feeling, type = 'strength' }) {
  const weight = Number(weightKg)
  const duration = Number(durationMin)
  if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(duration) || duration <= 0) return 0

  // Пока все тренировки из конструктора — силовые. Поле type оставлено для
  // последующего добавления кардио без изменения формата сохранённых данных.
  const met = type === 'strength' ? (STRENGTH_MET[feeling] || STRENGTH_MET['Норм']) : STRENGTH_MET['Норм']
  return Math.round((met * 3.5 * weight / 200) * duration / 10) * 10
}

export function getWorkoutCalories(workout) {
  const saved = Number(workout?.caloriesBurned)
  return Number.isFinite(saved) && saved > 0 ? saved : 0
}
