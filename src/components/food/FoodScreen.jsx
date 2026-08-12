import React from 'react'
import { BookOpen, CalendarDays, ChefHat, Coffee, Cookie, Moon, Plus, Sparkles, Sun, Utensils } from 'lucide-react'
import CircularProgress, { getCalorieColor } from '../common/CircularProgress'
import SwipeToDelete from '../common/SwipeToDelete'
import useFood from '../../hooks/useFood'
import BarcodeScanner from './BarcodeScanner'
import EditFoodModal from './EditFoodModal'
import FoodCalendar from './FoodCalendar'
import FoodModule from './FoodModule'
import styles from './FoodScreen.module.css'

const MEALS_MAP = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' }
const MEAL_ICONS = {
  breakfast: <Coffee size={17} />,
  lunch: <Sun size={17} />,
  dinner: <Moon size={17} />,
  snack: <Cookie size={17} />,
}
const MEAL_TIMES = { breakfast: '08:00', lunch: '13:00', dinner: '19:00', snack: '16:00' }
const SECTION_TABS = [
  ['log', 'Дневник', BookOpen],
  ['ai', 'AI-поиск', Sparkles],
  ['add', 'Добавить', Plus],
  ['builder', 'Рецепты', ChefHat],
]

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

  const inputStyle = {
    width: '100%', padding: '13px 16px', background: 'var(--surface2)',
    border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)',
    fontSize: 15, outline: 'none', boxSizing: 'border-box',
  }
  const goals = {
    calories: state.profile?.calorieGoal || 2200,
    protein: state.profile?.proteinGoal || 150,
    fat: state.profile?.fatGoal || 70,
    carbs: state.profile?.carbGoal || 250,
  }
  const remaining = Math.max(0, goals.calories - Math.round(totals.cal))
  const percentage = goals.calories > 0 ? Math.min(Math.round(totals.cal / goals.calories * 100), 100) : 0
  const macros = [
    { label: 'Белки', value: totals.p, max: goals.protein, color: 'var(--protein)' },
    { label: 'Жиры', value: totals.fat, max: goals.fat, color: 'var(--amber)' },
    { label: 'Углеводы', value: totals.c, max: goals.carbs, color: 'var(--teal)' },
  ]

  return (
    <div className={styles.screen}>
      {toast && <div className={styles.toast}>{toast}</div>}
      {editingFood && <EditFoodModal food={editingFood} onSave={updateFood} onClose={() => setEditingFood(null)} />}
      {showBarcodeScanner && <BarcodeScanner onDetect={handleBarcodeDetect} onClose={() => setShowBarcodeScanner(false)} />}

      <header className={styles.header}>
        <div><span className={styles.eyebrow}>Питание</span><h1>Дневник питания</h1><p>Сегодня</p></div>
        <button className={styles.addButton} onClick={() => setTab('add')} aria-label="Добавить продукт"><Plus size={21} /></button>
      </header>

      <section className={styles.summaryCard}>
        <div className={styles.summaryTop}>
          <div><span className={styles.eyebrow}>Дневной баланс</span><h2>Калории и БЖУ</h2></div>
          <span className={styles.percent}>{percentage}%</span>
        </div>
        <div className={styles.energyRow}>
          <CircularProgress value={totals.cal} max={goals.calories} size={106} stroke={7} dynamicColor>
            <strong className={styles.calorieValue} style={{ color: getCalorieColor(totals.cal / goals.calories) }}>{Math.round(totals.cal)}</strong>
            <span className={styles.calorieUnit}>ккал</span>
          </CircularProgress>
          <div className={styles.energyNumbers}>
            <div><span>Цель</span><strong>{goals.calories}</strong></div>
            <div><span>Осталось</span><strong className={styles.remaining}>{remaining}</strong></div>
          </div>
        </div>
        <div className={styles.macroGrid}>
          {macros.map(macro => {
            const color = macro.max > 0 && macro.value > macro.max ? 'var(--red)' : macro.color
            const width = macro.max > 0 ? Math.min(macro.value / macro.max * 100, 100) : 0
            return (
              <div className={styles.macro} key={macro.label}>
                <div className={styles.macroMeta}><span>{macro.label}</span><strong style={{ color }}>{Math.round(macro.value)} <small>/ {macro.max} г</small></strong></div>
                <div className={styles.macroTrack}><span style={{ width: `${width}%`, background: color }} /></div>
              </div>
            )
          })}
        </div>
      </section>

      <nav className={styles.sectionTabs} aria-label="Разделы питания">
        {SECTION_TABS.map(([key, label, Icon]) => (
          <button key={key} className={tab === key ? styles.sectionTabActive : ''} onClick={() => setTab(key)}><Icon size={16} /><span>{label}</span></button>
        ))}
      </nav>

      {tab === 'log' && (
        <section className={styles.logSection}>
          <div className={styles.logHeader}>
            <div><span className={styles.eyebrow}>Сегодня</span><h2>Приёмы пищи</h2></div>
            <div className={styles.viewToggle}>
              <button className={logMode === 'list' ? styles.viewActive : ''} onClick={() => setLogMode('list')} aria-label="Список"><Utensils size={16} /></button>
              <button className={logMode === 'calendar' ? styles.viewActive : ''} onClick={() => setLogMode('calendar')} aria-label="Календарь"><CalendarDays size={16} /></button>
            </div>
          </div>
          {logMode === 'calendar' && <FoodCalendar entries={state.entries} goals={goals} />}
          {logMode === 'list' && (
            <div className={styles.mealList}>
              {entry.foods.length === 0 && (
                <div className={styles.emptyState}>
                  <span><Utensils size={25} /></span><h3>Дневник пока пуст</h3>
                  <p>Добавьте первый приём пищи — калории и БЖУ рассчитаются автоматически.</p>
                  <button onClick={() => setTab('add')}><Plus size={16} /> Добавить продукт</button>
                </div>
              )}
              {Object.entries(MEALS_MAP).map(([mealKey, mealName]) => {
                const items = entry.foods.filter(item => item.meal === mealKey)
                if (!items.length) return null
                const mealCalories = items.reduce((total, item) => total + (item.calories || 0), 0)
                return (
                  <article className={styles.mealCard} key={mealKey}>
                    <div className={styles.mealHeader}>
                      <span className={styles.mealIcon}>{MEAL_ICONS[mealKey]}</span>
                      <div className={styles.mealTitle}><h3>{mealName}</h3><span>{MEAL_TIMES[mealKey]} · {items.length} поз.</span></div>
                      <strong>{Math.round(mealCalories)} <small>ккал</small></strong>
                    </div>
                    <div className={styles.foodItems}>
                      {items.map(item => (
                        <SwipeToDelete key={item.id} onDelete={() => removeFood(item.id)}>
                          <div className={styles.foodItem} onClick={() => setEditingFood(item)}>
                            <div><h4>{item.name}</h4><p>{item.weight} г · <span className={styles.protein}>Б {Math.round(item.protein || 0)}</span> <span className={styles.fat}>Ж {Math.round(item.fat || 0)}</span> <span className={styles.carbs}>У {Math.round(item.carbs || 0)}</span></p></div>
                            <strong>{Math.round(item.calories || 0)}</strong>
                          </div>
                        </SwipeToDelete>
                      ))}
                    </div>
                  </article>
                )
              })}
              {entry.foods.length > 0 && <button className={styles.addMeal} onClick={() => setTab('add')}><Plus size={17} /> Добавить приём пищи</button>}
            </div>
          )}
        </section>
      )}

      <FoodModule
        tab={tab} meal={meal} meals={MEALS_MAP} mealIcons={MEAL_ICONS} onMealChange={setMeal}
        manualMode={manualMode} onManualModeChange={setManualMode} inputStyle={inputStyle}
        query={query} onQueryChange={handleSearch} scanLoading={scanLoading}
        onOpenBarcodeScanner={() => setShowBarcodeScanner(true)} onPhotoSelected={handleScan}
        results={results} selectedFood={selectedFood}
        onSelectFood={selected => { setSelectedFood(selected); setResults([]) }}
        onChangeSelectedFood={setSelectedFood} grams={grams} onChangeGrams={setGrams}
        onClearSelection={() => { setSelectedFood(null); setQuery('') }} onAddFood={addFoodItem}
        manual={manual} onManualChange={setManual} onAddManual={addManual}
        aiText={aiText} onAiTextChange={setAiText} onVoiceResult={appendAiText}
        aiLoading={aiLoading} aiResults={aiResults} onRecognize={runAI}
        onAddAiItem={item => addFoodItem(item.food, item.grams)} onAddAllAiItems={addAllAiItems}
        onSaveRecipe={saveRecipe} aiCall={aiCall}
      />
    </div>
  )
}
