// Сервис-воркер FitDiary.
//
// Задача: кэшировать оболочку приложения (JS/CSS/шрифты/иконки/index.html),
// чтобы приложение открывалось и работало без сети — данные (localStorage +
// Zustand persist) уже сохраняются локально, не хватало только самой
// возможности загрузить страницу офлайн.
//
// ЧТО СЮДА НЕ ПОПАДАЕТ: любые запросы на другой origin (api.sudbase.ru,
// DeepSeek, Mistral) сервис-воркер не трогает вообще — они должны идти
// в сеть напрямую. Офлайн-обработка для них — на уровне приложения
// (см. src/hooks/useOnlineStatus.js и retry-очередь в src/data/cloudSync.js),
// а не через кэш сервис-воркера: подсовывать старый ответ API вместо
// актуальных данных было бы хуже, чем честно показать «нет соединения».
//
// ВАЖНО: версию кэша (CACHE_VERSION) нужно бампать при каждом релизе вместе
// с APP_BUILD в src/appVersion.js — старые кэши с других версий удаляются
// автоматически при активации новой, иначе пользователь мог бы залипнуть
// на старой собранной версии даже после успешного деплоя.
const CACHE_VERSION = 'fitdiary-2026.09.03.04'
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`
const SHELL_URL = '/index.html'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('fitdiary-') && key !== RUNTIME_CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

function isSameOrigin(url) {
  try {
    return new URL(url, self.location.href).origin === self.location.origin
  } catch {
    return false
  }
}

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  if (!isSameOrigin(request.url)) return

  // Открытие/обновление страницы (в т.ч. клиентские роуты react-router типа
  // /dashboard/plan) — всегда сеть в приоритете, при её отсутствии отдаём
  // последний закэшированный index.html под одним и тем же ключом, чтобы SPA
  // могла открыться с любого адреса, а не только с ранее посещённого.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone()
          caches.open(RUNTIME_CACHE).then(cache => cache.put(SHELL_URL, copy))
          return response
        })
        .catch(() => caches.match(SHELL_URL))
    )
    return
  }

  // Статика (собранный JS/CSS, шрифты, иконки, картинки упражнений и т.д.) —
  // stale-while-revalidate: сразу отдаём закэшированную копию, если она есть
  // (быстро и работает офлайн), и параллельно обновляем кэш в фоне.
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone()
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy))
        }
        return response
      }).catch(() => cached)
      return cached || network
    })
  )
})
