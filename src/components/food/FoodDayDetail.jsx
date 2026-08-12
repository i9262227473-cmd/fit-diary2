import React from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft } from 'lucide-react'
import CircularProgress, { getCalorieColor } from '../common/CircularProgress'

const MEALS_MAP = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' }

export default function FoodDayDetail({ date, entry, goals, onClose }) {
  const foods = entry?.foods || []
  const totals = foods.reduce((a, f) => ({
    cal: a.cal + (f.calories || 0),
    p: a.p + (f.protein || 0),
    fat: a.fat + (f.fat || 0),
    c: a.c + (f.carbs || 0),
  }), { cal: 0, p: 0, fat: 0, c: 0 })

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: '#0e0e0e', zIndex: 500, overflow: 'auto', padding: '20px 16px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: '#1a1a1a', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={18} color="#9ca3af" />
        </button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Рацион за день</div>
          <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)' }}>{date}</div>
        </div>
      </div>

      <div style={{ background: '#1a1a1a', borderRadius: 20, padding: 20, border: '1px solid #2e2e2e', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <CircularProgress value={totals.cal} max={goals.calories} size={90} stroke={5} dynamicColor>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: getCalorieColor(totals.cal / goals.calories) }}>{Math.round(totals.cal)}</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>ккал</div>
          </CircularProgress>
          <div style={{ flex: 1, display: 'flex', gap: 12 }}>
            {[
              { l: 'Белки', v: totals.p, max: goals.protein, c: 'var(--accent)' },
              { l: 'Жиры', v: totals.fat, max: goals.fat, c: '#fbbf24' },
              { l: 'Углев.', v: totals.c, max: goals.carbs, c: '#38bdf8' },
            ].map(m => {
              const over = m.max > 0 && m.v > m.max
              return (
                <div key={m.l} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: over ? '#ef4444' : m.c }}>{Math.round(m.v)}г</div>
                  <div style={{ fontSize: 10, color: over ? '#ef4444' : '#6b7280', fontWeight: over ? 700 : 400 }}>{m.l}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {foods.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: '#6b7280', fontSize: 13 }}>В этот день ничего не записано</div>
      ) : Object.entries(MEALS_MAP).map(([mealKey, mealName]) => {
        const items = foods.filter(f => f.meal === mealKey)
        if (!items.length) return null
        const mCal = items.reduce((a, f) => a + (f.calories || 0), 0)
        return (
          <div key={mealKey} style={{ background: '#1a1a1a', borderRadius: 16, overflow: 'hidden', border: '1px solid #2e2e2e', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #2a2a2a' }}>
              <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{mealName}</div></div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--accent)', fontWeight: 600 }}>{Math.round(mCal)} ккал</div>
            </div>
            {items.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid #222' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: '#f5f5f5' }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, fontFamily: 'var(--mono)' }}>
                    {item.weight}г · <span style={{ color: 'var(--accent)' }}>Б{Math.round(item.protein || 0)}</span>{' '}
                    <span style={{ color: '#fbbf24' }}>Ж{Math.round(item.fat || 0)}</span>{' '}
                    <span style={{ color: '#38bdf8' }}>У{Math.round(item.carbs || 0)}</span>
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600 }}>{Math.round(item.calories || 0)}</div>
              </div>
            ))}
          </div>
        )
      })}
    </div>,
    document.body,
  )
}
