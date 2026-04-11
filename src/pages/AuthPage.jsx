import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import styles from './AuthPage.module.css'

import { Dumbbell } from 'lucide-react'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // login | register
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn, signUp } = useStore()
  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (!email || !password) return setError('Заполните все поля')
    if (mode === 'register' && !name) return setError('Введите имя')

    setLoading(true)
    setError('')

    try {
      if (mode === 'login') {
        await signIn(email, password)
        navigate('/dashboard')
      } else {
        await signUp(email, password, name)
        // После регистрации — войдём
        await signIn(email, password)
        navigate('/onboarding')
      }
    } catch (e) {
      setError(e.message || 'Ошибка. Попробуйте снова.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* Шапка */}
      <div className={styles.header}>
        <div className={styles.logo}>
          <Dumbbell size={38} color="#000" strokeWidth={2.5} />
        </div>
        <h1 className={styles.title}>Фитнес Дневник</h1>
        <p className={styles.subtitle}>AI-помощник для спортсменов и тренеров</p>
      </div>

      {/* Форма */}
      <div className={styles.form}>
        {/* Переключатель */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === 'login' ? styles.active : ''}`}
            onClick={() => { setMode('login'); setError('') }}
          >Войти</button>
          <button
            className={`${styles.tab} ${mode === 'register' ? styles.active : ''}`}
            onClick={() => { setMode('register'); setError('') }}
          >Регистрация</button>
        </div>

        {mode === 'register' && (
          <div className="field fade-in">
            <div className="field-label">Ваше имя</div>
            <input
              className="field-input"
              type="text"
              placeholder="Как вас зовут?"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
        )}

        <div className="field">
          <div className="field-label">Email</div>
          <input
            className="field-input"
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <div className="field-label">Пароль</div>
          <input
            className="field-input"
            type="password"
            placeholder="Минимум 6 символов"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? '⏳ Загрузка...' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
        </button>

        {mode === 'login' && (
          <p className={styles.hint}>
            Нет аккаунта?{' '}
            <span onClick={() => setMode('register')}>Зарегистрируйтесь</span>
          </p>
        )}
      </div>
    </div>
  )
}
