// Синк плана тренировок, шаблонов и прогрессии весов с сервером.
//
// Раньше это жило только в localStorage (workout-plan-v4-pro,
// workout-templates-v1, exercise-progress-v1) и терялось при смене
// устройства/очистке браузера. На бэкенде для плана+шаблонов уже был
// готовый эндпоинт PATCH /profile/workouts (сохраняет в user_profiles.
// saved_workouts) — просто фронтенд его не вызывал. Для прогрессии по
// упражнениям завели отдельную таблицу exercise_progress + GET/PUT /progress.
import { syncWithRetry, fetchJSON } from './cloudSync'

const PLAN_KEY = 'workout-plan-v4-pro'
const TEMPLATES_KEY = 'workout-templates-v1'
const PROGRESS_KEY = 'exercise-progress-v1'

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

// Отправить текущий план + шаблоны на сервер. Вызывать после любого
// изменения плана/шаблонов (генерация плана, сохранение/удаление шаблона).
export async function syncWorkoutData(token) {
  if (!token) return
  const plan = readJSON(PLAN_KEY, null)
  const templates = readJSON(TEMPLATES_KEY, [])
  await syncWithRetry(token, 'PATCH', '/profile/workouts', { saved_workouts: { plan, templates } })
}

// Отправить текущую прогрессию по упражнениям на сервер. Вызывать после
// сохранения результата тренировки и после принятия прогрессии веса.
export async function syncExerciseProgress(token) {
  if (!token) return
  const data = readJSON(PROGRESS_KEY, {})
  await syncWithRetry(token, 'PUT', '/progress', { data })
}

// При входе — если локально плана/шаблонов ещё нет (новое устройство,
// очищенный браузер), а на сервере что-то сохранено — восстановить.
// Не перетирает то, что уже есть локально.
export function restoreWorkoutDataIfEmpty(savedWorkouts) {
  if (!savedWorkouts) return
  if (!localStorage.getItem(PLAN_KEY) && savedWorkouts.plan) {
    try { localStorage.setItem(PLAN_KEY, JSON.stringify(savedWorkouts.plan)) } catch {}
  }
  if (!localStorage.getItem(TEMPLATES_KEY) && Array.isArray(savedWorkouts.templates) && savedWorkouts.templates.length) {
    try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(savedWorkouts.templates)) } catch {}
  }
}

// Аналогично для прогрессии по упражнениям — подтягиваем с сервера, если
// локально пусто.
export async function restoreExerciseProgressIfEmpty(token) {
  if (localStorage.getItem(PROGRESS_KEY) || !token) return
  const data = await fetchJSON(token, '/progress')
  if (data && Object.keys(data).length) {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(data)) } catch {}
  }
}
