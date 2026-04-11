import React from 'react'
import { useStore } from '../store'

export default function HistoryTab() {
  const { entries } = useStore()
  const last30 = entries.slice(0, 30)

  if (last30.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📅</div>
        <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>История пуста</div>
        <div style={{ fontSize: '13px', color: 'var(--sub)' }}>Начните записывать питание и тренировки</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--header)', marginBottom: '16px' }}>📅 История</div>
      {last30.map((entry, i) => {
        const cal = Math.round(entry.foods.reduce((s, f) => s + (f.calories || 0), 0))
        const prot = Math.round(entry.foods.reduce((s, f) => s + (f.protein || 0), 0))
        const date = new Date(entry.date + 'T12:00:00')
        return (
          <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', marginBottom: '10px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>
              {date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })}
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              {[{ v: cal, l: 'ккал' }, { v: prot, l: 'г белка' }, { v: entry.foods.length, l: 'приёмов' }, { v: entry.workouts?.length || 0, l: 'трен.' }].map(({ v, l }) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent)' }}>{v}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
