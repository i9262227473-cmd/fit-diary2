import React, { useState } from 'react'
import { Pill, Plus, X, Check } from 'lucide-react'
import styles from './SuppsTab.module.css'

const STORAGE_KEY = 'my-supps-v1'

const SUPP_DB = [
  ['Омега-3', 'Жирные кислоты', '2000-3000 мг/день'],
  ['Витамин D3', 'Витамины', '2000-5000 МЕ/день'],
  ['Магний', 'Минералы', '400 мг/день'],
  ['Цинк', 'Минералы', '25-50 мг/день'],
  ['Креатин', 'Спортивные', '5 г/день'],
  ['Протеин', 'Спортивные', '1-2 порции/день'],
  ['BCAA', 'Спортивные', '5-10 г до/после'],
  ['Витамин C', 'Витамины', '500-1000 мг/день'],
  ['Витамин B12', 'Витамины', '1000 мкг/день'],
  ['Коэнзим Q10', 'Антиоксиданты', '100-200 мг/день'],
  ['Коллаген', 'Суставы', '10-15 г/день'],
  ['Глюкозамин', 'Суставы', '1500 мг/день'],
  ['Мелатонин', 'Сон', '1-3 мг перед сном'],
  ['Ашваганда', 'Адаптогены', '300-600 мг/день'],
  ['ZMA', 'Минералы', '1 порция перед сном'],
]

const load = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] } }
const save = (d) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export default function SuppsTab() {
  const [supps, setSupps] = useState(load)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', dose: '', time: 'Утром с едой', notes: '' })
  const [query, setQuery] = useState('')

  const TIMES = ['Утром натощак', 'Утром с едой', 'Днём с едой', 'Вечером с едой', 'Перед сном', 'До тренировки', 'После тренировки']

  const addSupp = () => {
    const updated = [...supps, { ...form, id: Date.now(), taken: false }]
    setSupps(updated); save(updated)
    setForm({ name: '', dose: '', time: 'Утром с едой', notes: '' })
    setShowAdd(false); setQuery('')
  }

  const toggleTaken = (id) => {
    const updated = supps.map(s => s.id === id ? { ...s, taken: !s.taken } : s)
    setSupps(updated); save(updated)
  }

  const remove = (id) => {
    const updated = supps.filter(s => s.id !== id)
    setSupps(updated); save(updated)
  }

  const suggestions = query.length > 1
    ? SUPP_DB.filter(([n]) => n.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
    : []

  const takenCount = supps.filter(s => s.taken).length

  return (
    <div>
      <div className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <Pill size={18} color="var(--gold)" strokeWidth={2} />
            <span className={styles.title}>Мои добавки</span>
          </div>
          {supps.length > 0 && (
            <div className={styles.progress}>
              Принято сегодня: <span>{takenCount}/{supps.length}</span>
            </div>
          )}
        </div>
        <button className={styles.addBtn} onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? <X size={16} color="#000" /> : <Plus size={16} color="#000" />}
        </button>
      </div>

      {showAdd && (
        <div className={styles.addForm}>
          <div className="field">
            <div className="field-label">Название</div>
            <input className="field-input" placeholder="Введите название..."
              value={query || form.name}
              onChange={e => { setQuery(e.target.value); setForm(f => ({ ...f, name: e.target.value })) }} />
            {suggestions.length > 0 && (
              <div className={styles.suggestions}>
                {suggestions.map(([name, cat, dose]) => (
                  <button key={name} className={styles.suggestion}
                    onClick={() => { setForm(f => ({ ...f, name, dose })); setQuery('') }}>
                    <span>{name}</span>
                    <span className={styles.suggDose}>{dose}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="field">
            <div className="field-label">Доза</div>
            <input className="field-input" placeholder="напр. 5 г" value={form.dose}
              onChange={e => setForm(f => ({ ...f, dose: e.target.value }))} />
          </div>
          <div className="field">
            <div className="field-label">Время приёма</div>
            <select className="field-input" value={form.time}
              onChange={e => setForm(f => ({ ...f, time: e.target.value }))}>
              {TIMES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={addSupp} disabled={!form.name}>
            Добавить
          </button>
        </div>
      )}

      {supps.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}><Pill size={48} color="var(--text3)" strokeWidth={1} /></div>
          <div>Добавки не добавлены</div>
          <div className={styles.emptyHint}>Нажмите «+» чтобы начать</div>
        </div>
      ) : (
        <div className={styles.list}>
          {supps.map(s => (
            <div key={s.id} className={`${styles.item} ${s.taken ? styles.taken : ''}`}>
              <button className={`${styles.check} ${s.taken ? styles.checkDone : ''}`}
                onClick={() => toggleTaken(s.id)}>
                {s.taken && <Check size={14} color="#000" strokeWidth={3} />}
              </button>
              <div className={styles.info}>
                <div className={styles.name}>{s.name}</div>
                <div className={styles.meta}>{s.dose} · {s.time}</div>
              </div>
              <button className={styles.removeBtn} onClick={() => remove(s.id)}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
