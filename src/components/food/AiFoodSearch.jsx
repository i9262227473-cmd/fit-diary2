import React from 'react'
import { LoaderCircle, Sparkles } from 'lucide-react'
import VoiceButton from '../common/VoiceButton'

export default function AiFoodSearch({
  text,
  onTextChange,
  onVoiceResult,
  loading,
  results,
  onRecognize,
  meals,
  selectedMeal,
  onMealChange,
  inputStyle,
  onAddOne,
  onAddAll,
}) {
  const canRecognize = Boolean(text.trim()) && !loading

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        style={{
          background: '#1a1a1a',
          borderRadius: 16,
          padding: 18,
          border: '1px solid #2e2e2e',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 8,
          }}
        >
          <Sparkles size={20} color="var(--accent)" />
          <span style={{ fontSize: 15, fontWeight: 600 }}>
            AI-распознавание еды
          </span>
        </div>

        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
          Опиши, что съел — AI определит калории и БЖУ. Распознанные продукты
          сохраняются, поэтому в следующий раз поиск сможет найти их без AI.
        </p>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <textarea
            style={{
              ...inputStyle,
              flex: 1,
              resize: 'none',
              minHeight: 80,
              lineHeight: 1.5,
            }}
            placeholder="Например: 200 г куриной грудки с гречкой"
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            rows={3}
          />

          <VoiceButton onResult={onVoiceResult} />
        </div>

        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            margin: '10px 0',
          }}
        >
          {Object.entries(meals).map(([key, name]) => (
            <button
              key={key}
              type="button"
              onClick={() => onMealChange(key)}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: `1px solid ${
                  selectedMeal === key ? 'var(--accent)' : 'var(--border)'
                }`,
                background:
                  selectedMeal === key
                    ? 'var(--accent-dim)'
                    : 'transparent',
                color: selectedMeal === key ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {name}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onRecognize}
          disabled={!canRecognize}
          style={{
            background: 'var(--accent)',
            color: '#000',
            border: 'none',
            borderRadius: 12,
            padding: 13,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            width: '100%',
            opacity: canRecognize ? 1 : 0.5,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
          }}
        >
          {loading ? <><LoaderCircle size={16} className="spin" /> Анализирую...</> : <><Sparkles size={16} /> Распознать</>}
        </button>
      </div>

      {results !== null && !loading && (
        <div
          style={{
            background: '#1a1a1a',
            borderRadius: 16,
            padding: 16,
            border: '1px solid #2e2e2e',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {results.length === 0 ? (
            <p
              style={{
                color: '#6b7280',
                fontSize: 14,
                textAlign: 'center',
              }}
            >
              Не удалось распознать
            </p>
          ) : (
            <>
              {results.map((item, index) => (
                <div
                  key={`${item.food.name}-${index}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    background: '#222',
                    borderRadius: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {item.food.name}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: '#6b7280',
                        fontFamily: 'var(--mono)',
                        marginTop: 2,
                      }}
                    >
                      {item.grams} г ·{' '}
                      {Math.round(
                        ((item.food.cal100 || 0) * item.grams) / 100,
                      )}{' '}
                      ккал
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAddOne(item)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      background: 'var(--accent)',
                      border: 'none',
                      color: '#000',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    +
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={onAddAll}
                style={{
                  background: 'var(--accent)',
                  color: '#000',
                  border: 'none',
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                Добавить всё
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
