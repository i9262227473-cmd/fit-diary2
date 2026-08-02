import React, { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import WheelPicker, { buildWeightValues } from '../common/WheelPicker'

export default function SetPickerModal({ title, reps, weight, onSave, onClose }) {
  const [repsValue, setRepsValue] = useState(String(reps || 0))
  const [weightValue, setWeightValue] = useState(String(weight || 0))
  const weightValues = useMemo(() => buildWeightValues(), [])

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 650,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          background: '#0e0e0e',
          borderRadius: '20px 20px 0 0',
          padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
          width: '100%',
          maxWidth: 500,
        }}
      >
        <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#9ca3af', marginBottom: 18 }}>
          {title}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginBottom: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Повторы
            </div>
            <WheelPicker value={repsValue} onChange={setRepsValue} min={0} max={50} step={1} width={80} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Вес, кг
            </div>
            <WheelPicker value={weightValue} onChange={setWeightValue} values={weightValues} width={92} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSave(repsValue, weightValue)}
          style={{
            background: '#3d9970',
            color: '#000',
            border: 'none',
            borderRadius: 12,
            padding: 14,
            fontSize: 14,
            fontWeight: 700,
            width: '100%',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          Готово
        </button>
      </div>
    </div>,
    document.body,
  )
}
