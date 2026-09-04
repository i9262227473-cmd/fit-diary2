import React from 'react'

function formatNumber(value) {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

/** Reusable numeric input with decrement/increment controls. */
export default function NumberStepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  placeholder,
  compact = false,
}) {
  const numericValue = Number.parseFloat(value) || 0
  const buttonSize = compact ? 24 : 30
  const fontSize = compact ? 13 : 15

  const decrement = () => onChange(formatNumber(Math.max(min, numericValue - step)))
  const increment = () => onChange(formatNumber(Math.min(max, numericValue + step)))

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 2 : 4,
        background: '#222',
        border: '1px solid #2e2e2e',
        borderRadius: 8,
        padding: compact ? 2 : 3,
      }}
    >
      <button
        type="button"
        onClick={decrement}
        aria-label="Уменьшить значение"
        style={{
          width: buttonSize,
          height: buttonSize,
          borderRadius: 6,
          background: '#2a2a2a',
          border: 'none',
          color: '#9ca3af',
          cursor: 'pointer',
          fontSize,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        −
      </button>

      <input
        inputMode={step % 1 === 0 ? 'numeric' : 'decimal'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          minWidth: 0,
          width: '100%',
          background: 'transparent',
          border: 'none',
          color: '#f5f5f5',
          fontSize,
          fontWeight: 600,
          fontFamily: 'var(--mono)',
          outline: 'none',
          textAlign: 'center',
          padding: 0,
        }}
      />

      <button
        type="button"
        onClick={increment}
        aria-label="Увеличить значение"
        style={{
          width: buttonSize,
          height: buttonSize,
          borderRadius: 6,
          background: '#2a2a2a',
          border: 'none',
          color: '#9ca3af',
          cursor: 'pointer',
          fontSize,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        +
      </button>
    </div>
  )
}
