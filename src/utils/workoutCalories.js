// Оценка расхода через MET: ккал/мин = MET × 3.5 × вес(кг) / 200.
// Для силовой намеренно используем умеренные MET, чтобы не завышать расход.
const STRENGTH_MET = {
  'Легко': 3.0,
  'Норм': 3.5,
  'Тяжело': 4.0,
  'Очень': 4.5,
}

function resolveMet(feeling, type) {
  return type === 'strength' ? (STRENGTH_MET[feeling] || STRENGTH_MET['Норм']) : STRENGTH_MET['Норм']
}

export function estimateWorkoutCalories({ weightKg, durationMin, feeling, type = 'strength' }) {
  const weight = Number(weightKg)
  const duration = Number(durationMin)
  if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(duration) || duration <= 0) return 0

  // Пока все тренировки из конструктора — силовые. Поле type оставлено для
  // последующего добавления кардио без изменения формата сохранённых данных.
  const met = resolveMet(feeling, type)
  return Math.round((met * 3.5 * weight / 200) * duration / 10) * 10
}

// Активные (дополнительные) калории сверх базового обмена — именно их стоит
// прибавлять к дневному калорийному бюджету. 1 MET = состояние покоя, и этот
// расход уже заложен в дневную цель по калориям, поэтому здесь он вычитается,
// чтобы не считать один и тот же расход дважды (полный расход из
// estimateWorkoutCalories по-прежнему используется для статистики «Калорий
// сж.» на экране «Прогресс»).
export function estimateActiveWorkoutCalories({ weightKg, durationMin, feeling, type = 'strength' }) {
  const weight = Number(weightKg)
  const duration = Number(durationMin)
  if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(duration) || duration <= 0) return 0

  const met = resolveMet(feeling, type)
  return Math.round(((met - 1) * 3.5 * weight / 200) * duration / 10) * 10
}

export function getWorkoutCalories(workout) {
  const saved = Number(workout?.caloriesBurned)
  return Number.isFinite(saved) && saved > 0 ? saved : 0
}

// Активные калории тренировки для дневного баланса на главном экране. Для
// новых записей берём сохранённое значение; для тренировок, сохранённых до
// этой фичи (есть только caloriesCalculation/caloriesBurned без
// activeCaloriesBurned), считаем на лету по сохранённым метаданным расчёта.
export function getActiveWorkoutCalories(workout) {
  const saved = Number(workout?.activeCaloriesBurned)
  if (Number.isFinite(saved) && saved > 0) return saved

  const calc = workout?.calorieCalculation
  const met = Number(calc?.met)
  const weight = Number(calc?.weightKg)
  const duration = Number(workout?.duration)
  if (Number.isFinite(met) && Number.isFinite(weight) && weight > 0 && Number.isFinite(duration) && duration > 0) {
    return Math.round(((met - 1) * 3.5 * weight / 200) * duration / 10) * 10
  }
  return 0
}
