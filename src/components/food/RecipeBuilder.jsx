import React, { useState } from 'react'
import { LoaderCircle, Plus, Sparkles } from 'lucide-react'
import { searchFoodSmart } from '../../data/searchUtils'
import { saveCachedFood } from '../../data/userFoodCache'
import VoiceButton from '../common/VoiceButton'
import SwipeToDelete from '../common/SwipeToDelete'

export default function RecipeBuilder({ onSave, aiCall }) {
  const [recipeName, setRecipeName] = useState('')
  const [ingredients, setIngredients] = useState([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [aiLookupLoading, setAiLookupLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2000) }

  const handleSearch = q => {
    setQuery(q)
    if (q.length > 1) setResults(searchFoodSmart(q).slice(0, 8))
    else setResults([])
  }

  const addIngredient = (food) => {
    setIngredients(list => [...list, {
      id: Date.now() + Math.random(),
      name: food.name,
      cal100: food.cal100 || 0,
      prot100: food.prot100 || 0,
      fat100: food.fat100 || 0,
      carbs100: food.carbs100 || 0,
      grams: '100',
    }])
    setQuery(''); setResults([])
  }

  const lookupUnknown = async () => {
    if (!query.trim() || aiLookupLoading) return
    setAiLookupLoading(true)
    try {
      const prompt = `Ты нутрициолог. По названию продукта верни точные КБЖУ на 100г, используя стандартные табличные данные (как в справочниках USDA / базах пищевой ценности). Продукт: "${query}". Верни ТОЛЬКО JSON без markdown, без пояснений: {"name":"название","cal100":число,"prot100":число,"fat100":число,"carbs100":число}`
      const reply = await aiCall([{ role: 'user', content: prompt }], 300)
      const match = reply.replace(/```json|```/g, '').trim().match(/\{[\s\S]*?\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        const food = { name: parsed.name || query, cal100: parseFloat(parsed.cal100)||0, prot100: parseFloat(parsed.prot100)||0, fat100: parseFloat(parsed.fat100)||0, carbs100: parseFloat(parsed.carbs100)||0 }
        saveCachedFood(food)
        addIngredient(food)
        showToast(food.name + ' найден и добавлен')
      } else {
        showToast('Не удалось распознать продукт')
      }
    } catch {
      showToast('Ошибка при поиске продукта')
    }
    setAiLookupLoading(false)
  }

  const updateGrams = (id, grams) => {
    setIngredients(list => list.map(ing => ing.id === id ? { ...ing, grams } : ing))
  }

  const removeIngredient = (id) => {
    setIngredients(list => list.filter(ing => ing.id !== id))
  }

  const totals = ingredients.reduce((acc, ing) => {
    const g = parseFloat(ing.grams) || 0
    return {
      weight: acc.weight + g,
      cal: acc.cal + (ing.cal100 || 0) * g / 100,
      prot: acc.prot + (ing.prot100 || 0) * g / 100,
      fat: acc.fat + (ing.fat100 || 0) * g / 100,
      carbs: acc.carbs + (ing.carbs100 || 0) * g / 100,
    }
  }, { weight: 0, cal: 0, prot: 0, fat: 0, carbs: 0 })

  const result100 = totals.weight > 0 ? {
    cal100: totals.cal * 100 / totals.weight,
    prot100: totals.prot * 100 / totals.weight,
    fat100: totals.fat * 100 / totals.weight,
    carbs100: totals.carbs * 100 / totals.weight,
  } : null

  const canSave = recipeName.trim() && ingredients.length > 0 && totals.weight > 0

  const handleSaveRecipe = () => {
    if (!canSave || !result100) return
    onSave({
      name: recipeName.trim(),
      cal100: Math.round(result100.cal100 * 10) / 10,
      prot100: Math.round(result100.prot100 * 10) / 10,
      fat100: Math.round(result100.fat100 * 10) / 10,
      carbs100: Math.round(result100.carbs100 * 10) / 10,
    })
    setRecipeName(''); setIngredients([]); setQuery(''); setResults([])
  }

  const inp = { width: '100%', padding: '13px 16px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 12, color: '#f5f5f5', fontSize: 15, outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {toast && <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: '#07140d', padding: '10px 22px', borderRadius: 50, fontSize: 13, fontWeight: 700, zIndex: 999, whiteSpace: 'nowrap' }}>{toast}</div>}

      <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 18, border: '1px solid #2e2e2e' }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Конструктор блюд</div>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Добавь ингредиенты с весом — рассчитаем КБЖУ готового блюда на 100г и сохраним для повторного использования</p>
        <input style={inp} placeholder="Название блюда (например «Мамина овсянка»)" value={recipeName} onChange={e => setRecipeName(e.target.value)} />
      </div>

      <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 18, border: '1px solid #2e2e2e' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Добавить ингредиент</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...inp, flex: 1 }} placeholder="Название продукта..." value={query} onChange={e => handleSearch(e.target.value)} />
          <VoiceButton onResult={text => handleSearch(text)} compact />
        </div>
        {results.length > 0 && (
          <div style={{ background: '#222', borderRadius: 12, overflow: 'hidden', border: '1px solid #2e2e2e', marginTop: 8 }}>
            {results.map((food, i) => (
              <button key={i} onClick={() => addIngredient(food)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', background: 'transparent', border: 'none', borderBottom: i < results.length-1 ? '1px solid #2a2a2a' : 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                <div>
                  <div style={{ fontSize: 14, color: '#f5f5f5' }}>{food.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)' }}>{food.cal100} ккал/100г</div>
                </div>
                <Plus size={16} color="var(--accent)" />
              </button>
            ))}
          </div>
        )}
        {query.length > 1 && results.length === 0 && (
          <button onClick={lookupUnknown} disabled={aiLookupLoading} style={{ marginTop: 8, width: '100%', background: 'transparent', border: '1px dashed var(--accent)', borderRadius: 10, padding: '11px', color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: aiLookupLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            {aiLookupLoading ? <><LoaderCircle size={15} className="spin" /> Ищу...</> : <><Sparkles size={15} /> Не нашли «{query}»? Спросить ИИ</>}
          </button>
        )}
      </div>

      {ingredients.length > 0 && (
        <div style={{ background: '#1a1a1a', borderRadius: 16, overflow: 'hidden', border: '1px solid #2e2e2e' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2a2a', fontSize: 13, fontWeight: 600, color: '#9ca3af' }}>Ингредиенты ({ingredients.length})</div>
          {ingredients.map(ing => (
            <SwipeToDelete key={ing.id} onDelete={() => removeIngredient(ing.id)} radius={0}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#1a1a1a', borderBottom: '1px solid #222' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: '#f5f5f5' }}>{ing.name}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'var(--mono)' }}>{ing.cal100} ккал/100г</div>
                </div>
                <input type="number" value={ing.grams} onChange={e => updateGrams(ing.id, e.target.value)} style={{ width: 64, padding: '8px 6px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 8, color: '#f5f5f5', fontSize: 13, fontFamily: 'var(--mono)', textAlign: 'center', outline: 'none' }} />
                <span style={{ fontSize: 12, color: '#6b7280', width: 12 }}>г</span>
              </div>
            </SwipeToDelete>
          ))}
        </div>
      )}

      {result100 && (
        <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(43,196,119,0.28)', borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 10 }}>Итого на 100г готового блюда</div>
          <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--mono)', fontSize: 14 }}>
            <div><span style={{ color: 'var(--accent)', fontWeight: 700 }}>{Math.round(result100.cal100)}</span> <span style={{ color: '#6b7280', fontSize: 11 }}>ккал</span></div>
            <div><span style={{ color: '#f5f5f5' }}>Б{Math.round(result100.prot100)}</span></div>
            <div><span style={{ color: '#fbbf24' }}>Ж{Math.round(result100.fat100)}</span></div>
            <div><span style={{ color: '#38bdf8' }}>У{Math.round(result100.carbs100)}</span></div>
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>Общий вес блюда: {Math.round(totals.weight)}г</div>
        </div>
      )}

      <button onClick={handleSaveRecipe} disabled={!canSave} style={{ background: 'var(--accent)', color: '#07140d', border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: canSave ? 1 : 0.4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Сохранить рецепт
      </button>
    </div>
  )
}
