import React, { useState, useEffect } from 'react'
import { useStore } from '../store'
import TodayTab from './dashboard/TodayTab'
import PlanTab from './dashboard/PlanTab'
import AnalysesTab from './dashboard/AnalysesTab'
import AdvisorTab from './dashboard/AdvisorTab'
import WaterTab from './dashboard/WaterTab'
import styles from './DashboardPage.module.css'
import {
  ChevronLeft, ChevronRight, Utensils, Dumbbell,
  FlaskConical, Bot, Droplets, RefreshCw, LogOut, Camera, X
} from 'lucide-react'

const NAV = [
  { id: 'today',    Icon: Utensils,     label: 'Дневник' },
  { id: 'plan',     Icon: Dumbbell,     label: 'План'    },
  { id: 'water',    Icon: Droplets,     label: 'Вода'    },
  { id: 'analyses', Icon: FlaskConical, label: 'Анализы' },
  { id: 'advisor',  Icon: Bot,          label: 'AI'      },
]

const MOTIVS = [
  'Тело меняется не в зале — оно меняется на кухне и в постели. Ты контролируешь всё три.',
  'Каждая запись в дневнике — это решение. Продолжай принимать правильные.',
  'Дискомфорт временный. Результат — навсегда.',
  'Слабые ищут мотивацию. Сильные строят привычку. Ты уже здесь — значит, строишь.',
  'Твоё тело — проект на всю жизнь. Сегодня ты снова вложился в него.',
  'Один пропущенный день — случайность. Два — выбор. Сегодня ты выбрал правильно.',
  'Прогресс не виден в зеркале каждый день. Но данные не врут. Продолжай.',
  'Никто не запомнит, как тебе было тяжело. Все увидят результат.',
  'Питание — 70% результата. Ты уже ведёшь дневник. Это и есть работа.',
  'Лучший день для начала — вчера. Второй лучший — сегодня. Ты уже начал.',
  'Каждый грамм белка, каждый выпитый стакан воды — это инвестиция в себя.',
  'Настоящая дисциплина — это делать правильное, когда не хочется.',
]

function toDateStr(date) {
  return date.toISOString().split('T')[0]
}
function addDays(date, n) {
  const d = new Date(date); d.setDate(d.getDate() + n); return d
}
function formatDateLabel(date) {
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })
}

// Мотивационная карточка
function MotivCard({ aiCall }) {
  const key = 'motiv-' + toDateStr(new Date())
  const [text, setText] = useState(() => {
    const saved = localStorage.getItem(key)
    if (saved) return saved
    const idx = Math.floor(Math.random() * MOTIVS.length)
    return MOTIVS[idx]
  })
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const reply = await aiCall([{ role: 'user', content:
        'Напиши одну короткую (1-2 предложения) мотивационную фразу для человека который реально работает над собой: тренируется, следит за питанием, ведёт дневник. Строго, без банальщины, без восклицательных знаков. Только сам текст без кавычек.'
      }], 100)
      const t = reply.trim()
      setText(t)
      localStorage.setItem(key, t)
    } catch {
      const idx = Math.floor(Math.random() * MOTIVS.length)
      setText(MOTIVS[idx])
    }
    setLoading(false)
  }

  return (
    <div className={styles.motivCard}>
      <div className={styles.motivIcon}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </div>
      <div className={styles.motivText}>{loading ? 'Думаю...' : text}</div>
      <button className={styles.motivRefresh} onClick={refresh} disabled={loading}>
        <RefreshCw size={14} color={loading ? 'rgba(201,168,76,.3)' : '#C9A84C'}
          style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
      </button>
    </div>
  )
}

// Аватарка с загрузкой фото
function AvatarPicker({ name }) {
  const [photo, setPhoto] = useState(() => localStorage.getItem('user-avatar') || null)
  const [showMenu, setShowMenu] = useState(false)
  const fileRef = React.useRef()

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      // Обрезаем в квадрат через canvas
      const img = new Image()
      img.onload = () => {
        const size = Math.min(img.width, img.height)
        const canvas = document.createElement('canvas')
        canvas.width = 120; canvas.height = 120
        const ctx = canvas.getContext('2d')
        ctx.beginPath()
        ctx.arc(60, 60, 60, 0, Math.PI * 2)
        ctx.clip()
        const sx = (img.width - size) / 2
        const sy = (img.height - size) / 2
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 120, 120)
        const data = canvas.toDataURL('image/jpeg', 0.85)
        setPhoto(data)
        localStorage.setItem('user-avatar', data)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
    setShowMenu(false)
  }

  const removePhoto = () => {
    setPhoto(null)
    localStorage.removeItem('user-avatar')
    setShowMenu(false)
  }

  return (
    <div className={styles.avatarWrap}>
      <div className={styles.avatar} onClick={() => setShowMenu(v => !v)}>
        {photo
          ? <img src={photo} alt="avatar" className={styles.avatarImg} />
          : <span>{name.charAt(0).toUpperCase()}</span>
        }
        <div className={styles.avatarEditBadge}>
          <Camera size={10} color="#000" />
        </div>
      </div>
      {showMenu && (
        <div className={styles.avatarMenu}>
          <button onClick={() => fileRef.current.click()}>
            <Camera size={14} /> Загрузить фото
          </button>
          {photo && <button onClick={removePhoto} style={{ color: 'var(--red)' }}>
            <X size={14} /> Удалить фото
          </button>}
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            style={{ display: 'none' }} onChange={handleFile} />
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { user, profile, signOut, aiCall } = useStore()
  const [activeTab, setActiveTab] = useState('today')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const name = profile?.name || user?.user_metadata?.name || 'Спортсмен'
  const dateStr = toDateStr(selectedDate)
  const isToday = dateStr === toDateStr(new Date())

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <AvatarPicker name={name} />
          <div>
            <div className={styles.headerGreet}>Добро пожаловать</div>
            <div className={styles.headerName}>{name}</div>
          </div>
        </div>
        <button className={styles.signOutBtn} onClick={signOut}>
          <LogOut size={16} color="var(--text3)" />
        </button>
      </div>

      {/* ── Мотивационная фраза — только на вкладке Дневник ── */}
      {activeTab === 'today' && (
        <MotivCard aiCall={aiCall} />
      )}

      {/* ── Date navigator — только на вкладке Дневник ── */}
      {activeTab === 'today' && (
        <div className={styles.dateNav}>
          <button className={styles.dateNavBtn} onClick={() => setSelectedDate(d => addDays(d, -1))}>
            <ChevronLeft size={20} color="var(--text2)" />
          </button>
          <div className={styles.dateNavCenter}>
            <div className={styles.dateLabel}>{formatDateLabel(selectedDate)}</div>
            {!isToday && (
              <button className={styles.todayBtn} onClick={() => setSelectedDate(new Date())}>
                к сегодня
              </button>
            )}
          </div>
          <button className={styles.dateNavBtn} onClick={() => setSelectedDate(d => addDays(d, 1))}>
            <ChevronRight size={20} color="var(--text2)" />
          </button>
        </div>
      )}

      {/* ── Content ── */}
      <div className={styles.content}>
        {activeTab === 'today'    && <TodayTab selectedDate={dateStr} />}
        {activeTab === 'plan'     && <PlanTab />}
        {activeTab === 'water'    && <WaterTab />}
        {activeTab === 'analyses' && <AnalysesTab />}
        {activeTab === 'advisor'  && <AdvisorTab />}
      </div>

      {/* ── Bottom Navigation ── */}
      <div className={styles.bottomNav}>
        {NAV.map(({ id, Icon, label }) => (
          <button key={id}
            className={`${styles.navBtn} ${activeTab === id ? styles.navBtnActive : ''}`}
            onClick={() => setActiveTab(id)}>
            <div className={styles.navIcon}>
              <Icon size={20} strokeWidth={activeTab === id ? 2 : 1.5}
                color={activeTab === id
                  ? id === 'water' ? '#4facfe' : 'var(--gold)'
                  : 'var(--text3)'} />
              {activeTab === id && (
                <div className={styles.navDot}
                  style={{ background: id === 'water' ? '#4facfe' : 'var(--gold)' }} />
              )}
            </div>
            <span className={styles.navLabel}
              style={{ color: activeTab === id
                ? id === 'water' ? '#4facfe' : 'var(--gold)'
                : 'var(--text3)' }}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
