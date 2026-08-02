import { useState } from 'react'
import { createPortal } from 'react-dom'

const MEALS = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
}

const inputStyle = {
  padding: '10px 14px',
  background: '#222',
  border: '1px solid #2e2e2e',
  borderRadius: 10,
  color: '#f5f5f5',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  width: '100%',
}

export default function EditFoodModal({ food, onSave, onClose }) {
  const [name, setName] = useState(food.name)
  const [weight, setWeight] = useState(String(food.weight || 100))
  const [meal, setMeal] = useState(food.meal || 'breakfast')

  const originalWeight = food.weight || 100
  const caloriesPer100 = originalWeight ? (food.calories || 0) * 100 / originalWeight : 0
  const proteinPer100 = originalWeight ? (food.protein || 0) * 100 / originalWeight : 0
  const fatPer100 = originalWeight ? (food.fat || 0) * 100 / originalWeight : 0
  const carbsPer100 = originalWeight ? (food.carbs || 0) * 100 / originalWeight : 0
  const newWeight = Number.parseFloat(weight) || 100

  const save = () => {
    onSave({
      ...food,
      name: name.trim() || food.name,
      weight: newWeight,
      meal,
      calories: caloriesPer100 * newWeight / 100,
      protein: proteinPer100 * newWeight / 100,
      fat: fatPer100 * newWeight / 100,
      carbs: carbsPer100 * newWeight / 100,
    })
  }

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 600,
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
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span style={{ fontSize: 17, fontWeight: 700 }}>Редактировать</span>
          <button
            type="button"
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, background: '#222', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 18 }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Название</div>
            <input style={inputStyle} value={name} onChange={(event) => setName(event.target.value)} />
          </div>

          <div>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Вес (г)</div>
            <input style={inputStyle} type="number" value={weight} onChange={(event) => setWeight(event.target.value)} />
          </div>

          <div>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Приём пищи</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(MEALS).map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setMeal(key)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: `1px solid ${meal === key ? '#3d9970' : '#2e2e2e'}`,
                    background: meal === key ? 'rgba(61,153,112,0.1)' : '#222',
                    color: meal === key ? '#3d9970' : '#9ca3af',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: '#222', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Расчёт за {newWeight}г</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#9ca3af' }}>
              <span style={{ color: '#3d9970', fontWeight: 700 }}>{Math.round(caloriesPer100 * newWeight / 100)} ккал</span>
              {' · '}Б{Math.round(proteinPer100 * newWeight / 100)} Ж{Math.round(fatPer100 * newWeight / 100)} У{Math.round(carbsPer100 * newWeight / 100)}
            </div>
          </div>

          <button
            type="button"
            onClick={save}
            style={{
              background: '#3d9970',
              color: '#000',
              border: 'none',
              borderRadius: 12,
              padding: '13px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginTop: 6,
            }}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
