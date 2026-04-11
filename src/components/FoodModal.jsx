import React, { useState, useEffect } from 'react'
import styles from './FoodModal.module.css'

const BUILTIN_DB = [
  ["Куриная грудка варёная", 137, 25, 3, 0],
  ["Куриная грудка", 165, 31, 4, 0],
  ["Яйцо варёное", 155, 13, 11, 1],
  ["Яичный белок", 52, 11, 0, 1],
  ["Омлет", 185, 12, 14, 2],
  ["Творог 0%", 71, 18, 0, 3],
  ["Творог 5%", 121, 17, 5, 3],
  ["Творог 9%", 159, 17, 9, 3],
  ["Кефир 1%", 40, 3, 1, 4],
  ["Молоко 2.5%", 52, 3, 3, 5],
  ["Гречка варёная", 110, 4, 1, 20],
  ["Рис варёный", 130, 3, 0, 28],
  ["Овсянка варёная", 88, 3, 2, 15],
  ["Макароны варёные", 138, 5, 1, 27],
  ["Картофель варёный", 82, 2, 0, 17],
  ["Говядина", 250, 26, 17, 0],
  ["Свинина", 355, 17, 31, 0],
  ["Лосось", 206, 20, 13, 0],
  ["Тунец консервы", 96, 22, 1, 0],
  ["Горбуша", 142, 21, 7, 0],
  ["Яблоко", 52, 0, 0, 14],
  ["Банан", 89, 1, 0, 23],
  ["Брокколи", 34, 3, 0, 7],
  ["Помидор", 18, 1, 0, 4],
  ["Огурец", 15, 1, 0, 3],
  ["Хлеб белый", 265, 8, 3, 49],
  ["Хлеб чёрный", 207, 7, 1, 40],
  ["Греческий салат", 95, 2, 7, 7],
  ["Борщ", 50, 3, 2, 6],
  ["Протеин сывороточный", 380, 75, 4, 8],
  ["Грецкий орех", 654, 15, 65, 7],
  ["Миндаль", 579, 21, 50, 22],
  ["Масло сливочное", 748, 1, 82, 1],
  ["Масло растительное", 884, 0, 100, 0],
  ["Сахар", 387, 0, 0, 100],
  ["Мёд", 304, 0, 0, 82],
  ["Кофе чёрный", 2, 0, 0, 0],
  ["Чай без сахара", 1, 0, 0, 0],
]

export default function FoodModal({ meal, onAdd, onClose, prefill }) {
  const [query, setQuery] = useState(prefill?.name || '')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(prefill ? { name: prefill.name, cal100: prefill.calories, prot100: prefill.protein, fat100: prefill.fat, carbs100: prefill.carbs } : null)
  const [weight, setWeight] = useState('100')
  const [manual, setManual] = useState(false)
  const [manualData, setManualData] = useState({
    name: '', calories: '', protein: '', fat: '', carbs: ''
  })

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    const q = query.toLowerCase()
    setResults(
      BUILTIN_DB
        .filter(([n]) => n.toLowerCase().includes(q))
        .slice(0, 8)
        .map(([name, cal, prot, fat, carbs]) => ({ name, cal100: cal, prot100: prot, fat100: fat, carbs100: carbs }))
    )
  }, [query])

  const calcFood = (item, w) => ({
    name: item.name,
    weight: +w,
    calories: item.cal100 * +w / 100,
    protein: item.prot100 * +w / 100,
    fat: item.fat100 * +w / 100,
    carbs: item.carbs100 * +w / 100,
  })

  const handleAdd = () => {
    if (manual) {
      onAdd({
        name: manualData.name || 'Продукт',
        weight: +weight,
        calories: +manualData.calories * +weight / 100,
        protein: +manualData.protein * +weight / 100,
        fat: +manualData.fat * +weight / 100,
        carbs: +manualData.carbs * +weight / 100,
      })
    } else if (selected) {
      onAdd(calcFood(selected, weight))
    }
  }

  const preview = selected && !manual ? calcFood(selected, weight) : null

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.title}>🍽 Добавить еду — {meal}</div>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        {/* Переключатель */}
        <div className={styles.modeTabs}>
          <button
            className={`${styles.modeTab} ${!manual ? styles.modeActive : ''}`}
            onClick={() => setManual(false)}
          >Поиск</button>
          <button
            className={`${styles.modeTab} ${manual ? styles.modeActive : ''}`}
            onClick={() => setManual(true)}
          >Вручную</button>
        </div>

        {!manual ? (
          <>
            <input
              className={styles.search}
              placeholder="Введите название продукта..."
              value={query}
              onChange={e => { setQuery(e.target.value); setSelected(null) }}
              autoFocus
            />

            {results.length > 0 && !selected && (
              <div className={styles.results}>
                {results.map((item, i) => (
                  <button
                    key={i}
                    className={styles.resultItem}
                    onClick={() => { setSelected(item); setQuery(item.name) }}
                  >
                    <span className={styles.resultName}>{item.name}</span>
                    <span className={styles.resultCal}>{item.cal100} ккал/100г</span>
                  </button>
                ))}
              </div>
            )}

            {selected && (
              <div className={styles.weightRow}>
                <div className="field-label">Вес порции (г)</div>
                <input
                  className="field-input"
                  type="number"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  min="1"
                />
              </div>
            )}

            {preview && (
              <div className={styles.preview}>
                <div className={styles.previewTitle}>{preview.name} — {weight}г</div>
                <div className={styles.previewMacros}>
                  <span>🔥 {Math.round(preview.calories)} ккал</span>
                  <span>🥩 {Math.round(preview.protein)}г</span>
                  <span>🧈 {Math.round(preview.fat)}г</span>
                  <span>🍞 {Math.round(preview.carbs)}г</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className={styles.manualForm}>
            <div className="field">
              <div className="field-label">Название</div>
              <input className="field-input" placeholder="Название продукта"
                value={manualData.name} onChange={e => setManualData(d => ({ ...d, name: e.target.value }))} />
            </div>
            <div className="field">
              <div className="field-label">Вес порции (г)</div>
              <input className="field-input" type="number" value={weight}
                onChange={e => setWeight(e.target.value)} />
            </div>
            <div className={styles.macroInputs}>
              {[
                { key: 'calories', label: 'Ккал/100г' },
                { key: 'protein', label: 'Белок/100г' },
                { key: 'fat', label: 'Жиры/100г' },
                { key: 'carbs', label: 'Углеводы/100г' },
              ].map(({ key, label }) => (
                <div key={key} className="field">
                  <div className="field-label">{label}</div>
                  <input className="field-input" type="number"
                    value={manualData[key]}
                    onChange={e => setManualData(d => ({ ...d, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          className="btn-primary"
          style={{ marginTop: '12px' }}
          onClick={handleAdd}
          disabled={manual ? !manualData.name : !selected}
        >
          ✓ Добавить
        </button>
      </div>
    </div>
  )
}
