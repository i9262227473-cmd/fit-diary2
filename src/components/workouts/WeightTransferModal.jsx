import { createPortal } from 'react-dom'

export default function WeightTransferModal({ onConfirm, onDecline, onClose }) {
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 700,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          background: '#1a1a1a',
          borderRadius: '20px 20px 0 0',
          padding: 24,
          width: '100%',
          maxWidth: 500,
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
          Перенести веса с прошлого раза?
        </div>
        <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5, marginBottom: 20 }}>
          Для части упражнений есть сохранённые рабочие веса. Подставить их в подходы или начать с нуля?
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onDecline}
            style={{
              flex: 1,
              background: 'transparent',
              color: '#9ca3af',
              border: '1px solid #2e2e2e',
              borderRadius: 12,
              padding: '13px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Нет
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1.3,
              background: '#3d9970',
              color: '#000',
              border: 'none',
              borderRadius: 12,
              padding: '13px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Да, перенести
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
