import React from 'react'
import { useStore } from '../store'
import styles from './PlaceholderTab.module.css'

const ROLE_LABELS = { athlete: 'Спортсмен', trainer: 'Тренер', both: 'Тренер и спортсмен' }
const LEVEL_LABELS = { beginner: 'Новичок', amateur: 'Любитель', advanced: 'Продвинутый', professional: 'Профессионал' }

export default function ProfileTab() {
  const { user, profile, signOut, resetProfile } = useStore()
  const name = user?.user_metadata?.name || 'Спортсмен'

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>👤 Профиль</div>

      <div className={styles.card}>
        <div className={styles.avatar}>💪</div>
        <div className={styles.name}>{name}</div>
        <div className={styles.email}>{user?.email}</div>
      </div>

      <div className={styles.infoCard}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Роль</span>
          <span className={styles.infoValue}>{ROLE_LABELS[profile?.role] || '—'}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Уровень</span>
          <span className={styles.infoValue}>{LEVEL_LABELS[profile?.level] || '—'}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Возраст</span>
          <span className={styles.infoValue}>{profile?.age || '—'} лет</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Вес / Рост</span>
          <span className={styles.infoValue}>{profile?.weight}кг / {profile?.height}см</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>ИМТ</span>
          <span className={styles.infoValue}>{profile?.bmi || '—'}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Норма калорий</span>
          <span className={styles.infoValue}>{profile?.calorieGoal} ккал/день</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Белок / Жиры / Углеводы</span>
          <span className={styles.infoValue}>{profile?.proteinGoal}г / {profile?.fatGoal}г / {profile?.carbGoal}г</span>
        </div>
        {profile?.hasLimitations && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Ограничения</span>
            <span className={styles.infoValue}>{profile?.limitationsText}</span>
          </div>
        )}
      </div>

      <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button className="btn-secondary" onClick={resetProfile}>
          ✏️ Пересдать опрос
        </button>
        <button
          className="btn-secondary"
          style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
          onClick={signOut}
        >
          🚪 Выйти из аккаунта
        </button>
      </div>
    </div>
  )
}
