import React from 'react'

export default function MealSelector({
  meals,
  icons,
  selectedMeal,
  onMealChange,
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 2,
      }}
    >
      {Object.entries(meals).map(([key, name]) => (
        <button
          key={key}
          type="button"
          onClick={() => onMealChange(key)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 10,
            border: `1px solid ${
              selectedMeal === key ? 'var(--accent)' : 'var(--border)'
            }`,
            background:
              selectedMeal === key
                ? 'var(--accent-dim)'
                : 'var(--surface)',
            color: selectedMeal === key ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <span>{icons[key]}</span>
          {name}
        </button>
      ))}
    </div>
  )
}
