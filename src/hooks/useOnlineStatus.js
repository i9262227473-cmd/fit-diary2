import { useEffect, useState } from 'react'

// Простой хук статуса сети: стартует с navigator.onLine, дальше слушает
// window online/offline. Это не гарантия, что сервер реально отвечает
// (браузер может ошибаться, например в некоторых Wi-Fi без интернета) —
// но достаточно, чтобы не показывать ИИ-функции как «зависшие» без связи,
// а сразу дать понятное сообщение вместо вечного спиннера.
export default function useOnlineStatus() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return online
}
