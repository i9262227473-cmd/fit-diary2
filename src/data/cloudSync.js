// Общий механизм фоновой синхронизации с сервером.
//
// Раньше запросы вида "сохранить профиль/дневник" были fire-and-forget —
// если запрос не проходил (нет сети, сервер недоступен, телефон заснул
// в середине запроса), изменение оставалось только в localStorage и никто
// об этом не узнавал. Теперь неудачный запрос откладывается в локальную
// очередь и повторяется при восстановлении связи или при следующем
// старте приложения — так делают все нормальные offline-first приложения.
import { API_URL } from './apiConfig'

const QUEUE_KEY = 'sync-queue-v1'

function loadQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function saveQueue(queue) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)) }
  catch (e) { console.warn('[sync] не удалось сохранить очередь синка:', e) }
}

async function send(token, method, path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res
}

// GET-запрос с токеном; при ошибке возвращает null, ничего не бросает.
export async function fetchJSON(token, path) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    console.warn('[sync] fetchJSON error:', path, e.message)
    return null
  }
}

// Отправить запрос (POST/PUT/PATCH) с токеном. Если не получилось —
// откладывает в очередь на повтор и НЕ бросает исключение наружу
// (вызывающий код не должен думать про офлайн-логику).
export async function syncWithRetry(token, method, path, body) {
  if (!token) return
  try {
    await send(token, method, path, body)
  } catch (e) {
    const queue = loadQueue()
    queue.push({ method, path, body, ts: Date.now() })
    // не даём очереди расти бесконечно — храним последние 50 отложенных операций
    saveQueue(queue.slice(-50))
    console.warn('[sync] отложено в очередь (нет сети/сервер недоступен):', method, path, e.message)
  }
}

// Повторить все отложенные операции. getToken — функция (может быть async),
// возвращающая актуальный токен доступа.
export async function flushSyncQueue(getToken) {
  const queue = loadQueue()
  if (!queue.length) return
  let token
  try { token = await getToken() } catch { return }
  if (!token) return
  const remaining = []
  for (const item of queue) {
    try {
      await send(token, item.method, item.path, item.body)
    } catch {
      remaining.push(item)
    }
  }
  saveQueue(remaining)
  if (remaining.length < queue.length) {
    console.info(`[sync] отправлено отложенных операций: ${queue.length - remaining.length}, осталось: ${remaining.length}`)
  }
}
