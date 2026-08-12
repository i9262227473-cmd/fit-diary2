import React from 'react'
import { NavFood, NavHome, NavProgress, NavUser, NavWorkout } from './NavigationIcons'

// Новый порядок: Главная → Питание → Тренировки → Прогресс → Профиль
const TABS = [
  { id:'home',     label:'Главная',    Icon:NavHome },
  { id:'food',     label:'Питание',    Icon:NavFood },
  { id:'workout',  label:'Тренировки', Icon:NavWorkout },
  { id:'analysis', label:'Прогресс',   Icon:NavProgress },
  { id:'profile',  label:'Профиль',    Icon:NavUser },
]

export default function BottomNavigation({ activeTab, onTabChange }) {
  return (
    <div style={{ display:'flex', borderTop:'1px solid #1e1e1e', background:'#111', paddingBottom:'env(safe-area-inset-bottom, 0px)', flexShrink:0 }}>
      {TABS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id
        return (
          <button key={id} onClick={() => onTabChange(id)}
            style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'10px 4px 8px', background:'transparent', border:'none', cursor:'pointer', position:'relative' }}>
            <Icon color={isActive ? '#3d9970' : '#4b5563'} size={22} />
            <span style={{ fontSize:9, color:isActive?'#3d9970':'#4b5563', fontWeight:isActive?700:400, letterSpacing:0.3 }}>{label}</span>
            {isActive && <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:20, height:2, background:'#3d9970', borderRadius:'0 0 2px 2px' }} />}
          </button>
        )
      })}
    </div>
  )
}
