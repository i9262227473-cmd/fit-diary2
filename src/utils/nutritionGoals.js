// Единая формула расчёта целей по КБЖУ (калории/белки/жиры/углеводы).
//
// 19.08.2026: обнаружился баг — формула считала только поддерживающую норму
// (TDEE) и не учитывала выбранную цель (`goals`: похудение/набор массы/...).
// Из-за этого смена цели с «набор массы» на «похудение» никак не влияла на
// рекомендуемую калорийность — цифра оставалась той же. Плюс формула была
// продублирована в двух местах (OnboardingPage.jsx и ProfileScreen.jsx),
// что и позволило ей разъехаться/остаться неисправленной сразу в обоих —
// теперь она в одном месте.
//
// Похудение — дефицit ~20% от TDEE (умеренный, устойчивый темп потери веса).
// Набор массы — профицit ~12% (чтобы не набирать в основном жир).
// Если выбраны обе цели сразу или ни одной из этих двух — используется TDEE
// как есть (поддержание).
export function calculateNutritionGoals({ weight, height, age, gender, activity, level, goals }) {
  const w = +weight, h = +height, a = +age
  if (!w || !h || !a) return null

  const bmr = gender === 'male'
    ? 10 * w + 6.25 * h - 5 * a + 5
    : 10 * w + 6.25 * h - 5 * a - 161
  const activityFactors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }
  const tdee = bmr * (activityFactors[activity] || 1.55)

  const goalList = Array.isArray(goals) ? goals : []
  const wantsLoss = goalList.includes('weight_loss')
  const wantsGain = goalList.includes('muscle_gain')
  let calorieGoal
  if (wantsLoss && !wantsGain) calorieGoal = Math.round(tdee * 0.8)
  else if (wantsGain && !wantsLoss) calorieGoal = Math.round(tdee * 1.12)
  else calorieGoal = Math.round(tdee)

  const proteinGoal = Math.round(w * (level === 'professional' ? 2.2 : 1.8))
  const fatGoal = Math.round(calorieGoal * 0.25 / 9)
  const carbGoal = Math.round((calorieGoal - proteinGoal * 4 - fatGoal * 9) / 4)
  const bmi = +(w / ((h / 100) ** 2)).toFixed(1)

  return { calorieGoal, proteinGoal, fatGoal, carbGoal, bmi }
}
