import React, { useEffect, useState } from 'react'
import { useStore } from '../store'
import styles from './DashboardPage.module.css'
import FoodScreen from '../components/food/FoodScreen'
import HomeScreen from '../components/home/HomeScreen'
import ProgressScreen from '../components/progress/ProgressScreen'
import WorkoutScreen from '../components/workouts/WorkoutScreen'
import PlanScreen from '../components/workouts/PlanScreen'
import CombinedCalendar from '../components/calendar/CombinedCalendar'
import ProfileScreen from '../components/profile/ProfileScreen'
import BottomNavigation from '../components/layout/BottomNavigation'
import useReminders from '../hooks/useReminders'
import { applyTheme, getSavedTheme } from '../theme'


// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, profile, signOut, aiCall, entries, saveEntry, saveProfile } = useStore()
  const [tab, setTab] = useState('home')
  const [foodIntent, setFoodIntent] = useState(null)
  const [theme, setTheme] = useState(getSavedTheme)
  const [workoutActive, setWorkoutActive] = useState(false)
  const name = profile?.name || user?.user_metadata?.name || 'Спортсмен'
  useReminders()

  useEffect(() => { applyTheme(theme) }, [theme])
  const openFood = (intent = 'log') => {
    setFoodIntent({ type: intent, id: Date.now() })
    setTab('food')
  }

  const [water, setWater] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('water-state-v2') || '{}')
      const todayKey = new Date().toISOString().split('T')[0]
      const weight = profile?.weight || 80
      const goalMl = Math.min(Math.max(Math.round(weight * 30 / 100) * 100, 1500), 4000)
      const waterGoal = Math.round(goalMl / 250)
      return { goal: saved.goal || waterGoal, consumed: saved.date === todayKey ? (saved.consumed || 0) : 0, date: todayKey }
    } catch { return { goal: 8, consumed: 0, date: new Date().toISOString().split('T')[0] } }
  })

  useEffect(() => { localStorage.setItem('water-state-v2', JSON.stringify(water)) }, [water])

  const state = { entries: entries || [], profile, water }
  const dispatch = (action) => {
    switch (action.type) {
      case 'SAVE_ENTRY': saveEntry(action.entry); break
      case 'SET_WATER':  setWater(w => ({ ...w, consumed: action.val })); break
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {tab === 'home'     && <HomeScreen CalendarView={CombinedCalendar} state={state} dispatch={dispatch} goTo={setTab} onFoodAction={openFood} name={name} aiCall={aiCall} />}
        {tab === 'food'     && <FoodScreen     state={state} dispatch={dispatch} aiCall={aiCall} intent={foodIntent} />}
        {tab === 'analysis' && <ProgressScreen state={state} />}
        {tab === 'workout'  && <WorkoutScreen  state={state} dispatch={dispatch} aiCall={aiCall} PlanScreen={PlanScreen} onActiveChange={setWorkoutActive} />}
        {tab === 'profile'  && <ProfileScreen  profile={profile} saveProfile={saveProfile} signOut={signOut} aiCall={aiCall} theme={theme} onThemeChange={setTheme} />}
      </div>
      {!(tab === 'workout' && workoutActive) && <BottomNavigation activeTab={tab} onTabChange={setTab} />}
    </div>
  )
}
