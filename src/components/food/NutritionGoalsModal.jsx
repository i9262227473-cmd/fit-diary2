import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, X } from 'lucide-react'
import styles from './NutritionGoalsModal.module.css'

const FIELDS = [
  { key: 'calorieGoal', label: 'Калории', unit: 'ккал', min: 800, max: 10000 },
  { key: 'proteinGoal', label: 'Белки', unit: 'г', min: 0, max: 1000 },
  { key: 'fatGoal', label: 'Жиры', unit: 'г', min: 0, max: 1000 },
  { key: 'carbGoal', label: 'Углеводы', unit: 'г', min: 0, max: 2000 },
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
            <label className={styles.field} key={field.key}>
              <span>{field.label}</span>
              <div><input type="number" inputMode="numeric" min={field.min} max={field.max} value={form[field.key]} onChange={event => { setForm(current => ({ ...current, [field.key]: event.target.value })); setError('') }} /><small>{field.unit}</small></div>
            </label>
          ))}
        </div>

        {error && <p className={styles.error}>{error}</p>}
        <button className={styles.save} type="submit" disabled={saving}><Check size={17} />{saving ? 'Сохраняем…' : 'Сохранить цели'}</button>
      </form>
    </div>,
    document.body,
  )
}
