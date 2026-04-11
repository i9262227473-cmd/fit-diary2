import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore, SB_URL, SB_KEY } from './store'

import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  const { user, profile, session, isLoggingIn } = useStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      // Если есть сессия но нет профиля — загружаем из Supabase
      if (user && session && !profile) {
        try {
          const res = await fetch(
            `${SB_URL}/rest/v1/user_profiles?user_id=eq.${user.id}&select=*`,
            { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${session.access_token}` } }
          )
          const data = await res.json()
          if (data && data.length > 0) {
            const p = data[0]
            useStore.setState({ profile: {
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
        height: '100vh', flexDirection: 'column', gap: '16px', background: '#f0f4f8'
      }}>
        <div style={{ fontSize: '48px' }}>💪</div>
        <div style={{
          width: '36px', height: '36px',
          border: '3px solid #dde3ea', borderTopColor: '#2563eb',
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
  )
}
