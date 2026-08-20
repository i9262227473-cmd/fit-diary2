import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Dumbbell } from 'lucide-react'
import { useStore, API_URL } from './store'
import { fetchJSON } from './data/cloudSync'
import { reconcileWorkoutData, reconcileExerciseProgress } from './data/workoutSync'
import useOnlineStatus from './hooks/useOnlineStatus'

import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  const { user, profile, session, isLoggingIn } = useStore()
  const [loading, setLoading] = useState(true)
  const online = useOnlineStatus()

  // Синхронизация плана тренировок/шаблонов/прогрессии при каждом запуске
  // приложения у уже залогиненного пользователя (не только при входе).
  // reconcileWorkoutData/reconcileExerciseProgress сами решают: обычная
  // подтяжка свежего с сервера или бережное объединение (без потери
  // локальных данных) при самой первой сверке на этом устройстве — см.
  // подробные комментарии в data/workoutSync.js.
  useEffect(() => {
    if (!user || !session) return
    const run = async () => {
      const token = await useStore.getState().getValidToken()
      if (!token) return
      await reconcileWorkoutData(token)
      await reconcileExerciseProgress(token)
      // Дневник питания/тренировок по дням раньше подтягивался с сервера
      // только при логине — уже залогиненный пользователь (сессия просто
      // восстановилась из localStorage при запуске) не получал записи,
      // сделанные на других устройствах, пока не перелогинится. Подтягиваем
      // и объединяем по датам при каждом запуске (см. mergeRemoteEntries).
      const remoteEntries = await fetchJSON(token, '/entries')
      if (Array.isArray(remoteEntries)) {
        useStore.getState().mergeRemoteEntries(
          remoteEntries.map(row => ({ date: row.date, foods: row.foods || [], workouts: row.workouts || [] }))
        )
      }
    }
    run().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, session])

  useEffect(() => {
    const init = async () => {
      // Если есть сессия но нет профиля — загружаем с нашего бэкенда
      if (user && session && !profile) {
        try {
          const res = await fetch(`${API_URL}/profile`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            }
          })
          const p = await res.json()
          if (p) {
            useStore.setState({ profile: {
              name: p.name,
              role: p.role,
              level: p.level,
              goals: p.goals,
              hasLimitations: p.has_limitations,
              limitationsText: p.limitations_text,
              age: p.age,
              weight: p.weight,
              height: p.height,
              gender: p.gender,
              activity: p.activity,
              calorieGoal: p.calorie_goal,
              proteinGoal: p.protein_goal,
              fatGoal: p.fat_goal,
              carbGoal: p.carb_goal,
              bmi: p.bmi,
              completedAt: p.completed_at,
            }})
          }
        } catch (e) {
          console.warn('Profile init error:', e)
        }
      }
      setLoading(false)
    }
    init()
  }, []) // Только при монтировании

  if (loading || isLoggingIn) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', flexDirection: 'column', gap: '16px', background: 'var(--bg)', color: 'var(--text)'
      }}>
        <div style={{ display:'grid', placeItems:'center', width:54, height:54, borderRadius:18, background:'var(--accent-dim)', color:'var(--accent)' }}><Dumbbell size={26} /></div>
        <div style={{
          width: '36px', height: '36px',
          border: '3px solid var(--surface3)', borderTopColor: 'var(--accent)',
          borderRadius: '50%', animation: 'spin 1s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const getRedirect = () => {
    if (!user) return '/auth'
    if (!profile) return '/onboarding'
    return '/dashboard'
  }

  return (
    <>
      {!online && (
        <div style={{
          position: 'fixed', zIndex: 2000, top: 0, left: 0, right: 0,
          padding: '8px 14px', paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))',
          textAlign: 'center', fontSize: 12.5, fontWeight: 650,
          color: 'var(--text)', background: 'var(--surface3)',
          borderBottom: '1px solid var(--border)',
        }}>
          Нет соединения с интернетом — данные сохраняются локально, ИИ-функции временно недоступны
        </div>
      )}
      <Routes>
        <Route path="/auth" element={
          user ? <Navigate to={getRedirect()} /> : <AuthPage />
        } />
        <Route path="/onboarding" element={
          !user ? <Navigate to="/auth" /> :
          profile ? <Navigate to="/dashboard" /> :
          <OnboardingPage />
        } />
        <Route path="/dashboard/*" element={
          !user ? <Navigate to="/auth" /> :
          !profile ? <Navigate to="/onboarding" /> :
          <DashboardPage />
        } />
        <Route path="*" element={<Navigate to={getRedirect()} />} />
      </Routes>
    </>
  )
}
