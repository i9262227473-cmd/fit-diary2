import React from 'react'

const FIELDS = [
  ['Название', 'name', 'text', 'Борщ домашний'],
  ['Порция (г)', 'grams', 'number', '100'],
  ['Ккал/100 г', 'cal', 'number', '200'],
  ['Белки/100 г', 'p', 'number', '0'],
  ['Жиры/100 г', 'f', 'number', '0'],
  ['Углеводы/100 г', 'c', 'number', '0'],
]

export default function ManualFoodForm({
  manual,
  onChange,
  onAdd,
  inputStyle,
}) {
  const canAdd = Boolean(manual.name && manual.cal)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {FIELDS.map(([label, key, type, placeholder]) => (
        <div key={key}>
          <div
            style={{
              fontSize: 11,
              color: '#6b7280',
              marginBottom: 5,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {label}
          </div>

          <input
            style={inputStyle}
            type={type}
            placeholder={placeholder}
            value={manual[key]}
            onChange={(event) => onChange({
              ...manual,
              [key]: event.target.value,
            })}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={onAdd}
        disabled={!canAdd}
        style={{
          background: '#3d9970',
          color: '#000',
          border: 'none',
          borderRadius: 12,
          padding: 13,
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          opacity: canAdd ? 1 : 0.4,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: 4,
        }}
      >
        Добавить продукт
      </button>
    </div>
  )
}
