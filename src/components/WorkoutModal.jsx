import React, { useState } from 'react'
import { useStore } from '../store'
import styles from './WorkoutModal.module.css'

const WORKOUT_TYPES = [
  'Грудь + Трицепс', 'Спина + Бицепс', 'Плечи + Пресс',
  'Ноги (адаптированные)', 'Руки + Пресс', 'Эллипс / Кардио',
  'Велотренажёр', 'Плавание', 'Йога / Растяжка', 'Своя тренировка'
]

const EXERCISES = {
  'Грудь + Трицепс': ['Жим гантелей лёжа', 'Жим в тренажёре', 'Разводка гантелей', 'Кроссовер', 'Французский жим', 'Разгибание на блоке'],
  'Спина + Бицепс': ['Тяга верхнего блока', 'Тяга горизонтального блока', 'Тяга гантели', 'Пуловер', 'Подъём гантелей на бицепс', 'Молотки'],
  'Плечи + Пресс': ['Жим гантелей сидя', 'Махи в стороны', 'Тяга к подбородку', 'Скручивания', 'Планка', 'Подъём ног'],
  'Ноги (адаптированные)': ['Разгибание ног', 'Сгибание ног', 'Отведение ноги', 'Подъём на икры', 'Жим ногами'],
  'Руки + Пресс': ['Подъём штанги на бицепс', 'Молотки', 'Разгибание на блоке', 'Жим узким хватом', 'Скручивания', 'Боковая планка'],
}

export default function WorkoutModal({ onAdd, onClose, prefill }) {
  const { profile } = useStore()
  const [type, setType] = useState(prefill?.type || WORKOUT_TYPES[0])
  const [duration, setDuration] = useState(prefill?.duration || '60')
  const [pulse, setPulse] = useState(prefill?.pulse || '')
  const [notes, setNotes] = useState(prefill?.notes || '')
  const [selectedExs, setSelectedExs] = useState(prefill?.exercises || [])
  const [customEx, setCustomEx] = useState('')

  const exList = EXERCISES[type] || []
  const isCardio = type.includes('Эллипс') || type.includes('Велотренажёр') || type.includes('Плавание')

  const toggleEx = (ex) => {
    setSelectedExs(prev => prev.includes(ex) ? prev.filter(e => e !== ex) : [...prev, ex])
  }

  const addCustomEx = () => {
    if (customEx.trim()) {
      setSelectedExs(prev => [...prev, customEx.trim()])
      setCustomEx('')
    }
  }

  const handleAdd = () => {
    onAdd({ type, duration: +duration, pulse: pulse ? +pulse : null, notes, exercises: selectedExs })
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.title}>🏋️ Добавить тренировку</div>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        <div className="field">
          <div className="field-label">Тип тренировки</div>
          <select className="field-input" value={type} onChange={e => { setType(e.target.value); setSelectedExs([]) }}>
            {WORKOUT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div className={styles.row}>
          <div className="field" style={{ flex: 1 }}>
            <div className="field-label">Длительность (мин)</div>
            <input className="field-input" type="number" value={duration} onChange={e => setDuration(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <div className="field-label">Пульс (уд/мин)</div>
            <input className="field-input" type="number" placeholder="необязательно" value={pulse} onChange={e => setPulse(e.target.value)} />
          </div>
        </div>

        {!isCardio && exList.length > 0 && (
          <div className="field">
            <div className="field-label">Упражнения</div>
            <div className={styles.exList}>
              {exList.map(ex => (
                <button
                  key={ex}
                  className={`${styles.exBtn} ${selectedExs.includes(ex) ? styles.exActive : ''}`}
                  onClick={() => toggleEx(ex)}
                >
                  {ex}
                </button>
              ))}
            </div>
            <div className={styles.customExRow}>
              <input
                className="field-input"
                placeholder="Добавить своё упражнение..."
                value={customEx}
                onChange={e => setCustomEx(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomEx()}
                style={{ fontSize: '13px', padding: '8px 12px' }}
              />
              <button className={styles.addExBtn} onClick={addCustomEx}>+</button>
            </div>
            {selectedExs.filter(ex => !exList.includes(ex)).map(ex => (
              <div key={ex} className={styles.customExTag}>
                {ex} <button onClick={() => setSelectedExs(prev => prev.filter(e => e !== ex))}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div className="field">
          <div className="field-label">Заметки</div>
          <input className="field-input" placeholder="Как прошла тренировка?" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <button className="btn-primary" onClick={handleAdd}>✓ Сохранить тренировку</button>
      </div>
    </div>
  )
}
