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
import useReminders from '../hooks/useReminders'
import { NavHome, NavWorkout, NavProgress, NavFood, NavUser } from '../components/layout/NavigationIcons'


// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, profile, signOut, aiCall, entries, saveEntry, saveProfile } = useStore()
  const [tab, setTab] = useState('home')
  const name = profile?.name || user?.user_metadata?.name || 'Спортсмен'
  useReminders()

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

  // Новый порядок: Главная → Питание → Тренировки → Прогресс → Профиль
  const tabs = [
    { id:'home',     label:'Главная',    Icon:NavHome },
    { id:'food',     label:'Питание',    Icon:NavFood },
    { id:'workout',  label:'Тренировки', Icon:NavWorkout },
    { id:'analysis', label:'Прогресс',   Icon:NavProgress },
    { id:'profile',  label:'Профиль',    Icon:NavUser },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {tab === 'home'     && <HomeScreen CalendarView={CombinedCalendar} state={state} dispatch={dispatch} goTo={setTab} name={name} aiCall={aiCall} />}
        {tab === 'food'     && <FoodScreen     state={state} dispatch={dispatch} aiCall={aiCall} />}
        {tab === 'analysis' && <ProgressScreen state={state} />}
        {tab === 'workout'  && <WorkoutScreen  state={state} dispatch={dispatch} aiCall={aiCall} PlanScreen={PlanScreen} />}
        {tab === 'profile'  && <ProfileScreen  profile={profile} saveProfile={saveProfile} signOut={signOut} aiCall={aiCall} />}
      </div>
      <div style={{ display:'flex', borderTop:'1px solid #1e1e1e', background:'#111', paddingBottom:'env(safe-area-inset-bottom, 0px)', flexShrink:0 }}>
        {tabs.map(({ id, label, Icon }) => {
          const isActive = tab === id
          return (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'10px 4px 8px', background:'transparent', border:'none', cursor:'pointer', position:'relative' }}>
              <Icon color={isActive ? '#3d9970' : '#4b5563'} size={22} />
              <span style={{ fontSize:9, color:isActive?'#3d9970':'#4b5563', fontWeight:isActive?700:400, letterSpacing:0.3 }}>{label}</span>
              {isActive && <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:20, height:2, background:'#3d9970', borderRadius:'0 0 2px 2px' }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

