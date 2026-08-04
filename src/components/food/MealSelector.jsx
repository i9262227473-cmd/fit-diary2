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
              selectedMeal === key ? '#3d9970' : '#2e2e2e'
            }`,
            background:
              selectedMeal === key
                ? 'rgba(61,153,112,0.1)'
                : '#1a1a1a',
            color: selectedMeal === key ? '#3d9970' : '#9ca3af',
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
