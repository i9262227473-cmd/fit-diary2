import React from 'react'
import { NavFood, NavHome, NavProgress, NavUser, NavWorkout } from './NavigationIcons'
import styles from './BottomNavigation.module.css'

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
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label="Основная навигация">
      {TABS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id
        return (
          <button key={id} onClick={() => onTabChange(id)}
            className={`${styles.item} ${isActive ? styles.active : ''}`}
            aria-current={isActive ? 'page' : undefined}>
            <span className={styles.iconWrap}>
              <Icon size={34} />
            </span>
            <span className={styles.label}>{label}</span>
          </button>
        )
      })}
      </nav>
    </div>
  )
}
