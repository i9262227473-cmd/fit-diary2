import { useEffect } from 'react'

// ─── REMINDERS (локальные уведомления через Notification API — бесплатно, без сервера) ───────────────────────────
// Работает, пока открыта вкладка/приложение свёрнуто (не полностью закрыто). Требует HTTPS и разрешения пользователя.
const REMINDERS_KEY = 'reminders-settings-v1'
const REMINDERS_LOG_KEY = 'reminders-firedlog-v1'

export function getReminderSettings() {
  try {
    const raw = localStorage.getItem(REMINDERS_KEY)
    if (!raw) return { enabled: false, meals: { breakfast: '08:00', lunch: '13:00', dinner: '19:00' }, workout: { enabled: false, time: '18:00' } }
    return JSON.parse(raw)
  } catch { return { enabled: false, meals: { breakfast: '08:00', lunch: '13:00', dinner: '19:00' }, workout: { enabled: false, time: '18:00' } } }
}
export function saveReminderSettings(settings) {
  try { localStorage.setItem(REMINDERS_KEY, JSON.stringify(settings)) } catch {}
}

export default function useReminders() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return

    const checkAndFire = () => {
      const settings = getReminderSettings()
      if (!settings.enabled || Notification.permission !== 'granted') return

      const now = new Date()
      const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
      const todayKey = now.toISOString().split('T')[0]

      let log = {}
      try { log = JSON.parse(localStorage.getItem(REMINDERS_LOG_KEY) || '{}') } catch {}
      if (log.date !== todayKey) log = { date: todayKey, fired: [] }

      const fire = (id, title, body) => {
        if (log.fired.includes(id)) return
        try { new Notification(title, { body, icon: '/icon-192.png', tag: id }) } catch {}
        log.fired.push(id)
      }

      const MEAL_LABELS = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин' }
      Object.entries(settings.meals || {}).forEach(([key, time]) => {
        if (time === hhmm) fire(`meal-${key}-${todayKey}`, '🍽️ Пора поесть', `${MEAL_LABELS[key] || 'Приём пищи'} — не забудьте записать в дневник`)
      })
      if (settings.workout?.enabled && settings.workout.time === hhmm) {
        fire(`workout-${todayKey}`, '💪 Пора тренироваться', 'Не забудьте про тренировку по плану сегодня')
      }

      try { localStorage.setItem(REMINDERS_LOG_KEY, JSON.stringify(log)) } catch {}
    }

    checkAndFire()
    const id = setInterval(checkAndFire, 30000)
    const onVis = () => { if (document.visibilityState === 'visible') checkAndFire() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
}

