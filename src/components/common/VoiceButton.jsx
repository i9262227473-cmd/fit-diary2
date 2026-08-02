import { Mic } from 'lucide-react'
import { useVoiceInput } from '../../hooks/useVoiceInput'

export default function VoiceButton({ onResult, size = 46, compact = false }) {
  const { supported, listening, start, stop } = useVoiceInput(onResult)

  if (!supported) return null

  const dimension = compact ? 38 : size

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      title={listening ? 'Слушаю...' : 'Наговорить'}
      aria-label={listening ? 'Остановить голосовой ввод' : 'Начать голосовой ввод'}
      style={{
        width: dimension,
        height: dimension,
        flexShrink: 0,
        borderRadius: 12,
        background: listening ? '#ef4444' : '#222',
        border: `1px solid ${listening ? '#ef4444' : '#2e2e2e'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        position: 'relative',
        animation: listening ? 'micPulse 1.2s ease-in-out infinite' : 'none',
      }}
    >
      <style>{`
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.45); }
          50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
        }
      `}</style>
      <Mic size={compact ? 16 : 18} color={listening ? '#fff' : '#9ca3af'} />
    </button>
  )
}
