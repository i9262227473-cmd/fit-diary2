import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, X } from 'lucide-react'
import WheelPicker from '../common/WheelPicker'
import styles from './NutritionGoalsModal.module.css'

// wheelMax/step — отдельно от min/max: min/max используются для валидации
// при сохранении (оставлены с запасом на редкие случаи), а wheelMax/step —
// только для того, чтобы крутилка не рендерила тысячи пунктов (это било бы
// по производительности на телефоне).
const FIELDS = [
  { key: 'calorieGoal', label: 'Калории', unit: 'ккал', min: 800, max: 10000, wheelMax: 6000, step: 10 },
  { key: 'proteinGoal', label: 'Белки', unit: 'г', min: 0, max: 1000, wheelMax: 400, step: 1 },
  { key: 'fatGoal', label: 'Жиры', unit: 'г', min: 0, max: 1000, wheelMax: 300, step: 1 },
  { key: 'carbGoal', label: 'Углеводы', unit: 'г', min: 0, max: 2000, wheelMax: 800, step: 5 },
]

export default function NutritionGoalsModal({ goals, onSave, onClose }) {
  const [form, setForm] = useState({
    calorieGoal: String(goals.calories),
    proteinGoal: String(goals.protein),
    fatGoal: String(goals.fat),
    carbGoal: String(goals.carbs),
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  const submit = async event => {
    event.preventDefault()
    const values = Object.fromEntries(FIELDS.map(field => [field.key, Number.parseInt(form[field.key], 10)]))
    const invalid = FIELDS.find(field => !Number.isFinite(values[field.key]) || values[field.key] < field.min || values[field.key] > field.max)
    if (invalid) {
      setError(`Проверьте значение «${invalid.label}»`)
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave(values)
    } catch {
      setError('Не удалось сохранить. Попробуйте ещё раз.')
      setSaving(false)
    }
  }

  return createPortal(
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <form className={styles.modal} onClick={event => event.stopPropagation()} onSubmit={submit}>
        <div className={styles.header}>
          <div><span>Дневной план</span><h2>Цели питания</h2><p>Изменения применятся на главной и в дневнике.</p></div>
          <button type="button" onClick={onClose} aria-label="Закрыть"><X size={19} /></button>
        </div>

        <div className={styles.fields}>
          {FIELDS.map(field => (
            <div className={styles.field} key={field.key}>
              <span>{field.label}</span>
              <div className={styles.wheelRow}>
                <WheelPicker
                  value={form[field.key]}
                  onChange={val => { setForm(current => ({ ...current, [field.key]: val })); setError('') }}
                  min={field.min}
                  max={field.wheelMax}
                  step={field.step}
                  width="100%"
                  itemHeight={34}
                  visibleCount={3}
                />
                <small>{field.unit}</small>
              </div>
            </div>
          ))}
        </div>

        {error && <p className={styles.error}>{error}</p>}
        <button className={styles.save} type="submit" disabled={saving}><Check size={17} />{saving ? 'Сохраняем…' : 'Сохранить цели'}</button>
      </form>
    </div>,
    document.body,
  )
}
