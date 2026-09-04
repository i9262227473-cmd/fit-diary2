import React from 'react'
import { Camera, ChevronRight, LoaderCircle, ScanLine, Sparkles } from 'lucide-react'
import { saveCachedFood } from '../../data/userFoodCache'

export default function FoodSearchPanel({
  inp,
  query,
  onQueryChange,
  scanLoading,
  onOpenBarcodeScanner,
  onPhotoSelected,
  results,
  selectedFood,
  onSelectFood,
  onChangeSelectedFood,
  grams,
  onChangeGrams,
  onClearSelection,
  onAddFood,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          style={{ ...inp, flex: 1 }}
          placeholder="Найти продукт..."
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          autoFocus
        />
        <button
          type="button"
          onClick={onOpenBarcodeScanner}
          style={{ width: 46, height: 46, background: '#222', border: '1px solid #2e2e2e', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          title="Сканировать QR- или штрихкод"
        >
          <ScanLine size={18} color="#9ca3af" />
        </button>
        <label style={{ width: 46, height: 46, background: '#222', border: '1px solid #2e2e2e', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          {scanLoading ? <LoaderCircle size={18} className="spin" color="var(--text-secondary)" /> : <Camera size={18} color="var(--text-secondary)" />}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={e => e.target.files[0] && onPhotoSelected(e.target.files[0])}
          />
        </label>
      </div>

      {results.length > 0 && !selectedFood && (
        <div style={{ background: '#1a1a1a', borderRadius: 12, overflow: 'hidden', border: '1px solid #2e2e2e' }}>
          {results.map((food, i) => (
            <button
              key={`${food.name}-${i}`}
              onClick={() => onSelectFood(food)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: i < results.length - 1 ? '1px solid #222' : 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
            >
              <div>
                <div style={{ fontSize: 14, color: '#f5f5f5', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {food.name}
                  {food.isUserCache && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, padding: '2px 6px', background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 4, fontWeight: 600 }}><Sparkles size={9} /> AI</span>}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)' }}>
                  {food.portionGrams
                    ? `${Math.round((food.cal100 || 0) * food.portionGrams / 100)} ккал / порция (${food.portionGrams} г)`
                    : `${food.cal100} ккал/100г`}
                </div>
              </div>
              <ChevronRight size={16} color="#4b5563" />
            </button>
          ))}
        </div>
      )}

      {selectedFood && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Проверьте и поправьте при необходимости</span>
            <button onClick={onClearSelection} style={{ width: 26, height: 26, borderRadius: 7, background: '#222', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>×</button>
          </div>
          <input
            style={{ ...inp, fontWeight: 600, color: 'var(--accent)' }}
            value={selectedFood.name}
            onChange={e => onChangeSelectedFood({ ...selectedFood, name: e.target.value })}
            placeholder="Название продукта"
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['Ккал/100г', 'cal100'],
              ['Белки/100г', 'prot100'],
              ['Жиры/100г', 'fat100'],
              ['Углев/100г', 'carbs100'],
            ].map(([label, key]) => (
              <div key={key}>
                <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
                <input
                  style={{ ...inp, padding: '9px 12px', fontFamily: 'var(--mono)' }}
                  type="number"
                  inputMode="decimal"
                  value={selectedFood[key]}
                  onChange={e => onChangeSelectedFood({ ...selectedFood, [key]: e.target.value })}
                />
              </div>
            ))}
            <div>
              <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Порция, г</div>
              <input
                style={{ ...inp, padding: '9px 12px', fontFamily: 'var(--mono)' }}
                type="number"
                inputMode="decimal"
                value={grams}
                onChange={e => onChangeGrams(e.target.value)}
              />
            </div>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#9ca3af' }}>
            Итого за порцию: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{Math.round((parseFloat(selectedFood.cal100) || 0) * (parseFloat(grams) || 100) / 100)} ккал</span>
          </div>
          <button
            onClick={() => {
              const normalized = {
                name: selectedFood.name.trim() || 'Продукт',
                cal100: parseFloat(selectedFood.cal100) || 0,
                prot100: parseFloat(selectedFood.prot100) || 0,
                fat100: parseFloat(selectedFood.fat100) || 0,
                carbs100: parseFloat(selectedFood.carbs100) || 0,
              }
              saveCachedFood(normalized)
              onAddFood(normalized, grams)
            }}
            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 }}
          >
            Добавить
          </button>
        </div>
      )}
    </div>
  )
}
