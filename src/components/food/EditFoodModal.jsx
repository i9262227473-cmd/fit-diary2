import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, X } from 'lucide-react'
import styles from './EditFoodModal.module.css'

const MEALS = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
}

const NUTRIENTS = [
  { key: 'calories', label: 'Калории', unit: 'ккал' },
  { key: 'protein', label: 'Белки', unit: 'г' },
  { key: 'fat', label: 'Жиры', unit: 'г' },
  { key: 'carbs', label: 'Углеводы', unit: 'г' },
]

const roundValue = value => Math.round((Number(value) || 0) * 10) / 10

export default function EditFoodModal({ food, onSave, onClose }) {
  const originalWeight = Number(food.weight) || 100
  const [form, setForm] = useState({
    name: food.name || '',
    weight: String(originalWeight),
    meal: food.meal || 'breakfast',
    calories: String(roundValue(food.calories)),
    protein: String(roundValue(food.protein)),
    fat: String(roundValue(food.fat)),
    carbs: String(roundValue(food.carbs)),
  })
  const [error, setError] = useState('')

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  const changeWeight = value => {
    const nextWeight = Number.parseFloat(value)
    const ratio = Number.isFinite(nextWeight) && originalWeight > 0 ? nextWeight / originalWeight : 0
    setForm(current => ({
      ...current,
      weight: value,
      ...Object.fromEntries(NUTRIENTS.map(item => [item.key, ratio ? String(roundValue((food[item.key] || 0) * ratio)) : ''])),
    }))
    setError('')
  }

  const submit = event => {
    event.preventDefault()
    const weight = Number.parseFloat(form.weight)
    const nutrients = Object.fromEntries(NUTRIENTS.map(item => [item.key, Number.parseFloat(form[item.key])]))
    if (!form.name.trim()) {
      setError('Введите название продукта')
      return
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      setError('Укажите корректный вес')
      return
    }
    if (Object.values(nutrients).some(value => !Number.isFinite(value) || value < 0)) {
      setError('Калории и БЖУ не могут быть пустыми или отрицательными')
      return
    }

    onSave({ ...food, name: form.name.trim(), weight, meal: form.meal, ...nutrients })
  }

  return createPortal(
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <form className={styles.modal} onClick={event => event.stopPropagation()} onSubmit={submit}>
        <div className={styles.header}>
          <div><span>Карточка продукта</span><h2>Редактировать</h2><p>Значения указаны для выбранной порции.</p></div>
          <button type="button" onClick={onClose} aria-label="Закрыть"><X size={19} /></button>
        </div>

        <label className={styles.fullField}><span>Название</span><input value={form.name} onChange={event => { setForm(current => ({ ...current, name: event.target.value })); setError('') }} /></label>

        <div className={styles.portionRow}>
          <label className={styles.weightField}><span>Вес порции</span><div><input type="number" inputMode="decimal" min="1" step="1" value={form.weight} onChange={event => changeWeight(event.target.value)} /><small>г</small></div></label>
          <label className={styles.mealField}><span>Приём пищи</span><select value={form.meal} onChange={event => setForm(current => ({ ...current, meal: event.target.value }))}>{Object.entries(MEALS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
        </div>

        <div className={styles.nutritionHeading}><strong>Калории и БЖУ</strong><span>Можно исправить вручную</span></div>
        <div className={styles.nutrients}>
          {NUTRIENTS.map(item => (
            <label className={styles.nutrient} key={item.key}>
              <span>{item.label}</span>
              <div><input type="number" inputMode="decimal" min="0" step="0.1" value={form[item.key]} onChange={event => { setForm(current => ({ ...current, [item.key]: event.target.value })); setError('') }} /><small>{item.unit}</small></div>
            </label>
          ))}
        </div>

        {error && <p className={styles.error}>{error}</p>}
        <button className={styles.save} type="submit"><Check size={17} />Сохранить продукт</button>
      </form>
    </div>,
    document.body,
  )
}
