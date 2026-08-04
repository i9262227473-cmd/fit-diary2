import React from 'react'
import { Plus } from 'lucide-react'
import CircularProgress, { getCalorieColor } from '../common/CircularProgress'
import SwipeToDelete from '../common/SwipeToDelete'
import useFood from '../../hooks/useFood'
import BarcodeScanner from './BarcodeScanner'
import EditFoodModal from './EditFoodModal'
import FoodCalendar from './FoodCalendar'
import FoodModule from './FoodModule'

const MEALS_MAP = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' }
const MEAL_ICONS = { breakfast: '•', lunch: '•', dinner: '•', snack: '•' }
const MEAL_TIMES = { breakfast: '08:00', lunch: '13:00', dinner: '19:00', snack: '16:00' }

export default function FoodScreen({ state, dispatch, aiCall }) {
  const food = useFood({ state, dispatch, aiCall })
  const {
    tab, setTab, logMode, setLogMode, meal, setMeal, query, setQuery, results, setResults,
    selectedFood, setSelectedFood, grams, setGrams, manualMode, setManualMode,
    manual, setManual, aiText, setAiText, aiResults, aiLoading, scanLoading,
    showBarcodeScanner, setShowBarcodeScanner, toast, editingFood, setEditingFood,
    entry, totals, handleSearch, addFoodItem, addManual, removeFood, updateFood,
    handleScan, handleBarcodeDetect, runAI, addAllAiItems, saveRecipe, appendAiText,
  } = food

  const inp = { width: '100%', padding: '13px 16px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 12, color: '#f5f5f5', fontSize: 15, outline: 'none', boxSizing: 'border-box' }
  const goals = { calories: state.profile?.calorieGoal || 2200, protein: state.profile?.proteinGoal || 150, fat: state.profile?.fatGoal || 70, carbs: state.profile?.carbGoal || 250 }

  return (
    <div>
      {toast && <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: '#3d9970', color: '#000', padding: '10px 22px', borderRadius: 50, fontSize: 13, fontWeight: 700, zIndex: 999, whiteSpace: 'nowrap' }}>{toast}</div>}
      {editingFood && <EditFoodModal food={editingFood} onSave={updateFood} onClose={() => setEditingFood(null)} />}
      {showBarcodeScanner && <BarcodeScanner onDetect={handleBarcodeDetect} onClose={() => setShowBarcodeScanner(false)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>Питание</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Сегодня</div>
        </div>
      </div>

      <div style={{ background: '#1a1a1a', borderRadius: 20, padding: 20, border: '1px solid #2e2e2e', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <CircularProgress value={totals.cal} max={goals.calories} size={90} stroke={5} dynamicColor>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: getCalorieColor(totals.cal / goals.calories) }}>{Math.round(totals.cal)}</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>ккал</div>
          </CircularProgress>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div><div style={{ fontSize: 11, color: '#6b7280' }}>Съедено</div><div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700 }}>{Math.round(totals.cal)}</div></div>
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: '#6b7280' }}>Осталось</div><div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: '#3d9970' }}>{Math.max(0, goals.calories - Math.round(totals.cal))}</div></div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[{ l: 'Белки', v: totals.p, max: goals.protein, c: '#3d9970' }, { l: 'Жиры', v: totals.fat, max: goals.fat, c: '#fbbf24' }, { l: 'Углев.', v: totals.c, max: goals.carbs, c: '#38bdf8' }].map(m => {
                const over = m.max > 0 && m.v > m.max
                return (
                  <div key={m.l} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: over ? '#ef4444' : m.c }}>{Math.round(m.v)}г</div>
                    <div style={{ fontSize: 10, color: over ? '#ef4444' : '#6b7280', fontWeight: over ? 700 : 400 }}>{m.l}{over ? ' ⚠' : ''}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: 12, padding: 4, gap: 4, marginBottom: 16, border: '1px solid #2e2e2e' }}>
        {[['log', 'Дневник'], ['ai', '✦ Поиск блюда'], ['add', 'Добавить'], ['builder', 'Конструктор']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: tab === key ? '#3d9970' : 'transparent', color: tab === key ? '#000' : '#6b7280' }}>{label}</button>
        ))}
      </div>

      {tab === 'log' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: 12, padding: 4, gap: 4, border: '1px solid #2e2e2e' }}>
            {[['list', 'Список'], ['calendar', 'Календарь']].map(([key, label]) => (
              <button key={key} onClick={() => setLogMode(key)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: logMode === key ? '#3d9970' : 'transparent', color: logMode === key ? '#000' : '#6b7280' }}>{label}</button>
            ))}
          </div>
          {logMode === 'calendar' && <FoodCalendar entries={state.entries} goals={goals} />}
          {logMode === 'list' && (
            <>
              {entry.foods.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}></div>
                  <div>Ничего не добавлено</div>
                </div>
              )}
              {Object.entries(MEALS_MAP).map(([mealKey, mealName]) => {
                const items = entry.foods.filter(item => item.meal === mealKey)
                if (!items.length) return null
                const mealCalories = items.reduce((total, item) => total + (item.calories || 0), 0)
                return (
                  <div key={mealKey} style={{ background: '#1a1a1a', borderRadius: 16, overflow: 'hidden', border: '1px solid #2e2e2e' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #2a2a2a' }}>
                      <span style={{ fontSize: 18 }}>{MEAL_ICONS[mealKey]}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{mealName}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>{MEAL_TIMES[mealKey]}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: '#3d9970', fontWeight: 600 }}>{Math.round(mealCalories)} ккал</div>
                    </div>
                    {items.map(item => (
                      <SwipeToDelete key={item.id} onDelete={() => removeFood(item.id)}>
                        <div onClick={() => setEditingFood(item)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#1a1a1a', borderBottom: '1px solid #222', cursor: 'pointer' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, color: '#f5f5f5' }}>{item.name}</div>
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, fontFamily: 'var(--mono)' }}>{item.weight}г · <span style={{ color: '#3d9970' }}>Б{Math.round(item.protein || 0)}</span> <span style={{ color: '#fbbf24' }}>Ж{Math.round(item.fat || 0)}</span> <span style={{ color: '#38bdf8' }}>У{Math.round(item.carbs || 0)}</span></div>
                          </div>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600 }}>{Math.round(item.calories || 0)}</div>
                        </div>
                      </SwipeToDelete>
                    ))}
                  </div>
                )
              })}
              <button onClick={() => setTab('add')} style={{ background: '#1a1a1a', border: '2px dashed #2e2e2e', borderRadius: 16, padding: '16px', color: '#3d9970', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Plus size={18} /> Добавить приём пищи
              </button>
            </>
          )}
        </div>
      )}

      <FoodModule
        tab={tab}
        meal={meal}
        meals={MEALS_MAP}
        mealIcons={MEAL_ICONS}
        onMealChange={setMeal}
        manualMode={manualMode}
        onManualModeChange={setManualMode}
        inputStyle={inp}
        query={query}
        onQueryChange={handleSearch}
        scanLoading={scanLoading}
        onOpenBarcodeScanner={() => setShowBarcodeScanner(true)}
        onPhotoSelected={handleScan}
        results={results}
        selectedFood={selectedFood}
        onSelectFood={selected => { setSelectedFood(selected); setResults([]) }}
        onChangeSelectedFood={setSelectedFood}
        grams={grams}
        onChangeGrams={setGrams}
        onClearSelection={() => { setSelectedFood(null); setQuery('') }}
        onAddFood={addFoodItem}
        manual={manual}
        onManualChange={setManual}
        onAddManual={addManual}
        aiText={aiText}
        onAiTextChange={setAiText}
        onVoiceResult={appendAiText}
        aiLoading={aiLoading}
        aiResults={aiResults}
        onRecognize={runAI}
        onAddAiItem={item => addFoodItem(item.food, item.grams)}
        onAddAllAiItems={addAllAiItems}
        onSaveRecipe={saveRecipe}
        aiCall={aiCall}
      />
    </div>
  )
}
