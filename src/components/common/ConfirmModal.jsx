import React from 'react'
import { useStore } from '../../store'

/**
 * Замена системному window.confirm() внутри TWA-обёртки.
 * Нативный window.confirm() рисует Android-диалог с текстом
 * "Подтвердите действие на app.sudbase.ru" — прямой признак того, что
 * приложение открывает сайт в браузере, а не работает нативно (риск
 * отклонения при модерации RuStore, та же категория, что диалог
 * Chrome "Сохранить пароль?"). Эта модалка — часть UI приложения,
 * никакого домена не показывает.
 *
 * Монтируется один раз в App.jsx. Состояние — в сторе (confirmState),
 * вызывается через useStore(s => s.askConfirm)('Текст вопроса').
 */
export default function ConfirmModal() {
  const confirmState = useStore(s => s.confirmState)
  const resolveConfirm = useStore(s => s.resolveConfirm)

  if (!confirmState) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => resolveConfirm(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '20px 20px 16px',
          maxWidth: 320,
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{
          color: 'var(--text)',
          fontSize: 15.5,
          fontWeight: 600,
          lineHeight: 1.4,
          marginBottom: 20,
        }}>
          {confirmState.message}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => resolveConfirm(false)}
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 14.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {confirmState.cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => resolveConfirm(true)}
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              border: 'none',
              background: '#ef4444',
              color: '#fff',
              fontSize: 14.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {confirmState.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
