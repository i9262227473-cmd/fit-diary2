// ─── РАБОЧИЕ ВЕСА И ПРОГРЕССИЯ (двойная прогрессия) ───────────────────────────
// Хранит по каждому упражнению последний рабочий результат и историю,
// определяет готовность к повышению веса.
//
// Ключ хранения: localStorage 'exercise-progress-v1'
// Формат: { [exerciseName]: { weight, reps, sets, history: [{date, weight, sets}], readyToProgress } }

const KEY = 'exercise-progress-v1'

function loadAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') }
  catch { return {} }
}

function saveAll(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)) }
  catch (e) { console.warn('[progress] save error', e) }
}

// Извлечь верхнюю границу из строки повторов "8-12" → 12, "10" → 10
function topReps(repsStr) {
  if (!repsStr) return null
  const parts = String(repsStr).split('-').map(n => parseInt(n))
  if (parts.length === 2) return parts[1]
  return parts[0] || null
}

// Получить сохранённый рабочий вес/повторы упражнения (или null)
export function getExerciseProgress(name) {
  if (!name) return null
  const all = loadAll()
  return all[name.trim()] || null
}

// Посчитать готовность к прогрессии по набору подходов — чистая функция без
// обращения к localStorage, чтобы её можно было вызывать "вживую" прямо во
// время тренировки (сразу после отметки подхода выполненным), а не только
// один раз при сохранении всей тренировки в конце.
// sets = [{ reps, weight, done }], targetReps — например "8-12".
// Возвращает { readyToProgress, workWeight, suggestedWeight }.
export function evaluateProgression(sets, targetReps) {
  const list = (sets || []).filter(s => s)
  const weights = list.map(s => parseFloat(s.weight) || 0)
  const workWeight = weights.length ? Math.max(...weights) : 0

  // Определяем готовность к прогрессии (двойная прогрессия):
  // все рабочие подходы выполнены на верхней границе целевых повторов
  const target = topReps(targetReps || list[0]?.reps)
  let readyToProgress = false
  if (target && workWeight > 0 && list.length >= 2) {
    readyToProgress = list.every(s => {
      const done = s.done !== false
      const r = parseInt(String(s.reps).split('-').pop()) || 0
      return done && r >= target
    })
  }

  // Предлагаемый вес: +2.5кг для малых весов, +5кг / ~3-5% для больших
  let suggestedWeight = null
  if (readyToProgress && workWeight > 0) {
    const step = workWeight < 40 ? 2.5 : workWeight < 100 ? 5 : Math.round(workWeight * 0.03 / 2.5) * 2.5
    suggestedWeight = workWeight + step
  }
  return { readyToProgress, workWeight, suggestedWeight }
}

// Сохранить результат упражнения после тренировки.
// exercise = { name, sets: [{ reps, weight, done }], targetReps? }
// Возвращает { readyToProgress: bool, suggestedWeight: number|null }
export function saveExerciseResult(exercise, date) {
  if (!exercise?.name) return { readyToProgress: false, suggestedWeight: null }
  const all = loadAll()
  const name = exercise.name.trim()
  const sets = (exercise.sets || []).filter(s => s)
  const { readyToProgress, workWeight, suggestedWeight } = evaluateProgression(sets, exercise.targetReps)

  const prev = all[name] || { history: [] }
  all[name] = {
    weight: workWeight,
    reps: sets[0]?.reps || '',
    sets: sets.length,
    readyToProgress,
    suggestedWeight,
    lastDate: date || new Date().toISOString().split('T')[0],
    history: [...(prev.history || []), { date: date || new Date().toISOString().split('T')[0], weight: workWeight, sets: sets.length }].slice(-20),
  }
  saveAll(all)
  return { readyToProgress, suggestedWeight }
}

// Подставить сохранённый вес в упражнение при загрузке.
// Возвращает { weight, suggestedWeight, readyToProgress } или null
export function suggestWeightFor(name) {
  const p = getExerciseProgress(name)
  if (!p) return null
  return {
    weight: p.weight || 0,
    suggestedWeight: p.readyToProgress ? p.suggestedWeight : null,
    readyToProgress: !!p.readyToProgress,
  }
}

// Принять предложение прогрессии "вживую", прямо во время тренировки — то
// есть до того, как эта тренировка вообще была сохранена целиком
// (saveExerciseResult для нового рабочего веса ещё ни разу не прогонялся в
// эту сессию, поэтому acceptProgression ниже, читающий только уже
// сохранённое, тут не годится: суммы для сравнения ещё просто нет).
// newWeight передаётся уже посчитанным (тем же значением, что показали в
// баннере), просто фиксируем его как новый рабочий вес.
export function applyLiveWeightBump(name, newWeight) {
  if (!name || !newWeight) return
  const all = loadAll()
  const key = name.trim()
  const prev = all[key] || { history: [] }
  all[key] = { ...prev, weight: newWeight, readyToProgress: false, suggestedWeight: null }
  saveAll(all)
}

// Принять предложение прогрессии: зафиксировать новый вес как рабочий и снять флаг
export function acceptProgression(name) {
  const all = loadAll()
  const p = all[name?.trim()]
  if (!p || !p.suggestedWeight) return null
  p.weight = p.suggestedWeight
  p.readyToProgress = false
  p.suggestedWeight = null
  saveAll(all)
  return p.weight
}
