// Синк плана тренировок, шаблонов и прогрессии весов с сервером.
//
// Раньше это жило только в localStorage (workout-plan-v4-pro,
// workout-templates-v1, exercise-progress-v1) и терялось при смене
// устройства/очистке браузера. На бэкенде для плана+шаблонов уже был
// готовый эндпоинт PATCH /profile/workouts (сохраняет в user_profiles.
// saved_workouts) — просто фронтенд его не вызывал. Для прогрессии по
// упражнениям завели отдельную таблицу exercise_progress + GET/PUT /progress.
//
// 19.08.2026: обнаружилось, что «восстановить, если пусто» (старая версия
// этого файла) работает только один раз — на новом устройстве или после
// очистки браузера. Если у устройства уже ЕСТЬ локальный план (а он есть
// почти у всех, кто уже пользовался приложением до этого обновления),
// обновления с других устройств никогда не подтягивались, потому что
// «если пусто» не трогает непустой localStorage. Переделано на настоящую
// двустороннюю синхронизацию:
//   - для обычных обновлений — сравниваем updated_at с сервера с тем,
//     что применяли в прошлый раз на этом устройстве, и если сервер
//     новее — подтягиваем;
//   - для самого первого запуска этой логики на устройстве (когда ещё
//     нет отметки, что мы вообще когда-то сверялись) — не перезаписываем
//     локальные данные молча. Шаблоны и «свои планы» объединяем со
//     сервером (это просто списки, ничего не теряется). Единственный
//     активный ИИ-план — это один слот, и если на устройстве был свой,
//     отличный от серверного, — не выбрасываем его, а кладём в
//     deviceBackups внутри того же JSON на сервере (в интерфейсе не
//     показывается, но не теряется и восстановима вручную при необходимости).
import { syncWithRetry, fetchJSON } from './cloudSync'

const PLAN_KEY = 'workout-plan-v4-pro'
const TEMPLATES_KEY = 'workout-templates-v1'
const CUSTOM_PLANS_KEY = 'workout-custom-plans-v1'
const PROGRESS_KEY = 'exercise-progress-v1'
// Отметка «когда в последний раз применяли данные с сервера на этом
// устройстве» — по ней отличаем «уже сверялись, просто подтягиваем свежее»
// от «первый раз, аккуратно объединяем, чтобы ничего не потерять».
const SYNC_META_KEY = 'workout-sync-meta-v1'

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function readMeta() {
  return readJSON(SYNC_META_KEY, {})
}
function writeMeta(meta) {
  try { localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta)) } catch {}
}

// Объединить два списка (шаблоны/свои планы) по id — ничего не теряем ни
// с одной стороны, при совпадении id побеждает серверная версия (сервер
// уже впитал самые свежие изменения с других устройств).
function mergeById(serverList, localList) {
  const map = new Map()
  ;(Array.isArray(localList) ? localList : []).forEach(item => { if (item && item.id) map.set(item.id, item) })
  ;(Array.isArray(serverList) ? serverList : []).forEach(item => { if (item && item.id) map.set(item.id, item) })
  return Array.from(map.values())
}

// Отправить текущий план + шаблоны + свои планы на сервер. Вызывать после
// любого изменения плана/шаблонов/своих планов (генерация плана,
// сохранение/удаление шаблона или своего плана).
export async function syncWorkoutData(token) {
  if (!token) return
  const plan = readJSON(PLAN_KEY, null)
  const templates = readJSON(TEMPLATES_KEY, [])
  const customPlans = readJSON(CUSTOM_PLANS_KEY, [])
  await syncWithRetry(token, 'PATCH', '/profile/workouts', { saved_workouts: { plan, templates, customPlans } })
}

// Отправить текущую прогрессию по упражнениям на сервер. Вызывать после
// сохранения результата тренировки и после принятия прогрессии веса.
export async function syncExerciseProgress(token) {
  if (!token) return
  const data = readJSON(PROGRESS_KEY, {})
  await syncWithRetry(token, 'PUT', '/progress', { data })
}

// Обычная подтяжка «если на сервере новее» — используется, когда с этого
// устройства уже когда-то сверялись (см. SYNC_META_KEY).
function pullWorkoutDataIfNewer(rawProfile) {
  if (!rawProfile) return
  const serverTs = rawProfile.updated_at
  if (!serverTs) return
  const meta = readMeta()
  if (meta.plan && new Date(meta.plan) >= new Date(serverTs)) return
  const sw = rawProfile.saved_workouts
  if (!sw) return
  try {
    if (sw.plan !== undefined) localStorage.setItem(PLAN_KEY, JSON.stringify(sw.plan))
    if (Array.isArray(sw.templates)) localStorage.setItem(TEMPLATES_KEY, JSON.stringify(sw.templates))
    if (Array.isArray(sw.customPlans)) localStorage.setItem(CUSTOM_PLANS_KEY, JSON.stringify(sw.customPlans))
  } catch {}
  meta.plan = serverTs
  writeMeta(meta)
}

function pullExerciseProgressIfNewer(res) {
  if (!res || !res.updated_at) return
  const meta = readMeta()
  if (meta.progress && new Date(meta.progress) >= new Date(res.updated_at)) return
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(res.data || {})) } catch {}
  meta.progress = res.updated_at
  writeMeta(meta)
}

// Главная точка входа для плана/шаблонов/своих планов — вызывать при
// логине и при запуске приложения. Сама решает: обычная подтяжка свежего
// или бережное объединение первого раза.
export async function reconcileWorkoutData(token) {
  if (!token) return
  try {
    const rawProfile = await fetchJSON(token, '/profile')
    const meta = readMeta()

    if (meta.plan) {
      pullWorkoutDataIfNewer(rawProfile)
      return
    }

    // Первая сверка с этого устройства после появления полноценного синка.
    const server = rawProfile?.saved_workouts || {}
    const localPlan = readJSON(PLAN_KEY, null)
    const localTemplates = readJSON(TEMPLATES_KEY, [])
    const localCustomPlans = readJSON(CUSTOM_PLANS_KEY, [])

    const mergedTemplates = mergeById(server.templates, localTemplates)
    const mergedCustomPlans = mergeById(server.customPlans, localCustomPlans)

    // Активный ИИ-план — один слот. Если тут был свой, отличный от
    // серверного, — не теряем его молча, а прячем в deviceBackups.
    const backups = Array.isArray(server.deviceBackups) ? server.deviceBackups.slice(-9) : []
    const localPlanStr = localPlan ? JSON.stringify(localPlan) : null
    const serverPlanStr = server.plan ? JSON.stringify(server.plan) : null
    if (localPlanStr && localPlanStr !== serverPlanStr) {
      backups.push({ savedAt: new Date().toISOString(), plan: localPlan })
    }
    const finalPlan = server.plan !== undefined && server.plan !== null ? server.plan : localPlan

    try {
      localStorage.setItem(PLAN_KEY, JSON.stringify(finalPlan))
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(mergedTemplates))
      localStorage.setItem(CUSTOM_PLANS_KEY, JSON.stringify(mergedCustomPlans))
    } catch {}

    await syncWithRetry(token, 'PATCH', '/profile/workouts', {
      saved_workouts: { plan: finalPlan, templates: mergedTemplates, customPlans: mergedCustomPlans, deviceBackups: backups }
    })

    meta.plan = new Date().toISOString()
    writeMeta(meta)
  } catch (e) {
    console.warn('[workoutSync] reconcileWorkoutData error:', e?.message)
  }
}

// Главная точка входа для прогрессии по упражнениям — аналогично, но
// прогрессия это просто объект по ключам-упражнениям, поэтому первую
// сверку можно сделать честным слиянием без риска что-то потерять.
export async function reconcileExerciseProgress(token) {
  if (!token) return
  try {
    const res = await fetchJSON(token, '/progress')
    const meta = readMeta()

    if (meta.progress) {
      pullExerciseProgressIfNewer(res)
      return
    }

    const serverData = res?.data || {}
    const localData = readJSON(PROGRESS_KEY, {})
    // При конфликте по одному и тому же упражнению побеждает сервер (там
    // уже могли быть более свежие данные с другого устройства), но
    // упражнения, которых нет на сервере, не теряются.
    const merged = { ...localData, ...serverData }

    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(merged)) } catch {}
    await syncWithRetry(token, 'PUT', '/progress', { data: merged })

    meta.progress = res?.updated_at || new Date().toISOString()
    writeMeta(meta)
  } catch (e) {
    console.warn('[workoutSync] reconcileExerciseProgress error:', e?.message)
  }
}
