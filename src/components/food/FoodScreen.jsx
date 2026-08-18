import React, { useEffect, useState } from 'react'
import { ChefHat, Coffee, Cookie, Moon, Search, Sparkles, Sun } from 'lucide-react'
import SwipeActions from '../common/SwipeActions'
import useFood from '../../hooks/useFood'
import BarcodeScanner from './BarcodeScanner'
import EditFoodModal from './EditFoodModal'
import FoodCalendar from './FoodCalendar'
import FoodModule from './FoodModule'
import MissingBarcodeProduct from './MissingBarcodeProduct'
import NutritionGoalsModal from './NutritionGoalsModal'
import { FoodAiIcon, FoodBowlIcon, FoodCalendarIcon, FoodChevronIcon, FoodPencilIcon, FoodPlusIcon } from './FoodUiIcons'
import styles from './FoodScreen.module.css'

const MEALS_MAP = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' }
const MEAL_ICONS = {
  breakfast: <Coffee size={17} />,
  lunch: <Sun size={17} />,
  dinner: <Moon size={17} />,
  snack: <Cookie size={17} />,
}
const MEAL_TIMES = { breakfast: '08:00', lunch: '13:00', dinner: '19:00', snack: '16:00' }
const MEAL_VISUALS = {
  breakfast: '/assets/meals/breakfast-3d.webp',
  lunch: '/assets/meals/lunch-3d.webp',
  dinner: '/assets/meals/dinner-3d.webp',
  snack: '/assets/meals/snack-3d.webp',
}
const SECTION_TABS = [
  ['ai', 'AI-поиск', Sparkles],
  ['add', 'Поиск и код', Search],
  ['builder', 'Рецепты', ChefHat],
]

const shiftIsoDate = (iso, days) => {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

export default function FoodScreen({ state, dispatch, aiCall, intent, onSaveGoals }) {
  const [showGoals, setShowGoals] = useState(false)
  const food = useFood({ state, dispatch, aiCall })
  const {
    tab, setTab, logMode, setLogMode, meal, setMeal, query, setQuery, results, setResults,
    selectedFood, setSelectedFood, grams, setGrams, manualMode, setManualMode,
    manual, setManual, aiText, setAiText, aiResults, aiLoading, scanLoading,
    showBarcodeScanner, setShowBarcodeScanner, missingBarcode, setMissingBarcode,
    toast, editingFood, setEditingFood,
    entry, totals, selectedDate, setSelectedDate, handleSearch, addFoodItem, addManual, removeFood, updateFood,
    handleScan, handleBarcodeDetect, completeMissingBarcode, runAI, addAllAiItems, saveRecipe, appendAiText,
  } = food

  const inputStyle = {
    width: '100%', padding: '13px 16px', background: 'var(--surface2)',
    border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)',
    fontSize: 16, outline: 'none', boxSizing: 'border-box',
  }
  const goals = {
    calories: state.profile?.calorieGoal || 2200,
    protein: state.profile?.proteinGoal || 150,
    fat: state.profile?.fatGoal || 70,
    carbs: state.profile?.carbGoal || 250,
  }
  const remaining = Math.max(0, goals.calories - Math.round(totals.cal))
  const percentage = goals.calories > 0 ? Math.min(Math.round(totals.cal / goals.calories * 100), 100) : 0
  const dayTitle = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  const today = new Date().toISOString().split('T')[0]
  const swipeStartX = React.useRef(null)
  const changeDay = delta => setSelectedDate(current => shiftIsoDate(current, delta))
  const handleDaySwipeStart = event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (event.target.closest(`button, input, textarea, select, [role="button"], .${styles.foodItem}`)) return
    swipeStartX.current = event.clientX
  }
  const handleDaySwipeEnd = event => {
    if (swipeStartX.current == null) return
    const delta = event.clientX - swipeStartX.current
    swipeStartX.current = null
    if (Math.abs(delta) < 55) return
    changeDay(delta < 0 ? 1 : -1)
  }
  const macros = [
    { label: 'Белки', value: totals.p, max: goals.protein, color: 'var(--protein)' },
    { label: 'Жиры', value: totals.fat, max: goals.fat, color: 'var(--amber)' },
    { label: 'Углеводы', value: totals.c, max: goals.carbs, color: 'var(--purple)' },
  ]

  const saveGoals = async nextGoals => {
    await onSaveGoals?.({ ...state.profile, ...nextGoals })
    setShowGoals(false)
  }

  useEffect(() => {
    if (!intent) return
    if (intent.type === 'barcode' || intent.type === 'qr' || intent.type === 'code') {
      setTab('add')
      setShowBarcodeScanner(true)
      return
    }
    if (intent.type === 'ai') setTab('ai')
    if (intent.type === 'photo' || intent.type === 'add') setTab('add')
    if (intent.type === 'log') setTab('log')
  }, [intent?.id])

  return (
    <div className={styles.screen}>
      {toast && <div className={styles.toast}>{toast}</div>}
      {editingFood && <EditFoodModal food={editingFood} onSave={updateFood} onClose={() => setEditingFood(null)} />}
      {showGoals && <NutritionGoalsModal goals={goals} onSave={saveGoals} onClose={() => setShowGoals(false)} />}
      {showBarcodeScanner && <BarcodeScanner onDetect={handleBarcodeDetect} onClose={() => setShowBarcodeScanner(false)} />}
      {missingBarcode && <MissingBarcodeProduct product={missingBarcode} onComplete={completeMissingBarcode} onClose={() => setMissingBarcode(null)} />}

      <header className={styles.header}>
        <button className={styles.headerButton} onClick={() => changeDay(-1)} aria-label="Предыдущий день"><FoodChevronIcon direction="left" size={22} /></button>
        <button className={styles.headerTitle} onClick={() => { setTab('log'); setLogMode('calendar') }}><h1>Питание</h1><p>{selectedDate === today ? 'Сегодня, ' : ''}{dayTitle}</p></button>
        <button className={styles.headerButton} onClick={() => changeDay(1)} aria-label="Следующий день"><FoodChevronIcon direction="right" size={22} /></button>
      </header>

      <div className={styles.daySwipe} onPointerDown={handleDaySwipeStart} onPointerUp={handleDaySwipeEnd} onPointerCancel={() => { swipeStartX.current = null }}>
      <section className={styles.summaryCard}>
        <div className={styles.summaryTop}>
          <div><span className={styles.eyebrow}>Баланс дня</span><h2>Питание</h2></div>
          <button className={styles.editGoals} onClick={() => setShowGoals(true)}><FoodPencilIcon size={20} /><span>Изменить цели</span></button>
        </div>
        <div className={styles.energyCompact}>
          <div className={styles.energyConsumed}>
            <span>Съедено</span>
            <strong>{Math.round(totals.cal)} <small>/ {goals.calories} ккал</small></strong>
          </div>
          <div className={styles.energyRemaining}>
            <span>Осталось</span>
            <strong className={totals.cal > goals.calories ? styles.overGoal : ''}>{totals.cal > goals.calories ? Math.round(totals.cal - goals.calories) : remaining}</strong>
            <small>{totals.cal > goals.calories ? 'сверх цели' : 'ккал'}</small>
          </div>
        </div>
        <div className={styles.calorieTrack} aria-label={`Выполнено ${percentage}% цели по калориям`}><span style={{ width: `${percentage}%` }} /></div>
        <div className={styles.macroGrid}>
          {macros.map(macro => {
            const color = macro.max > 0 && macro.value > macro.max ? 'var(--red)' : macro.color
            return (
              <div className={styles.macro} key={macro.label}>
                <span className={styles.macroLabel}><i style={{ background: color }} />{macro.label}</span>
                <strong style={{ color }}>{Math.round(macro.value)} <small>/ {macro.max} г</small></strong>
              </div>
            )
          })}
        </div>
      </section>

      {tab === 'log' && (
        <section className={styles.logSection}>
          <div className={styles.logHeader}>
            <div><span className={styles.eyebrow}>{selectedDate === today ? 'Сегодня' : dayTitle}</span><h2>Приёмы пищи</h2></div>
            <div className={styles.logActions}>
              <button className={styles.addFood} onClick={() => setTab('ai')}><FoodPlusIcon size={20} /><span>Добавить</span></button>
              <div className={styles.viewToggle}>
                <button className={logMode === 'list' ? styles.viewActive : ''} onClick={() => setLogMode('list')} aria-label="Список"><FoodBowlIcon size={22} active={logMode === 'list'} /></button>
                <button className={logMode === 'calendar' ? styles.viewActive : ''} onClick={() => setLogMode('calendar')} aria-label="Календарь"><FoodCalendarIcon size={21} active={logMode === 'calendar'} /></button>
              </div>
            </div>
          </div>
          {logMode === 'calendar' && <FoodCalendar entries={state.entries} goals={goals} />}
          {logMode === 'list' && (
            <div className={styles.mealList}>
              {entry.foods.length === 0 && (
                <div className={styles.emptyState}>
                  <span><FoodBowlIcon size={34} /></span><h3>Записей пока нет</h3>
                  <p>Добавьте первый приём пищи — калории и БЖУ рассчитаются автоматически.</p>
                  <button onClick={() => setTab('ai')}><FoodAiIcon size={21} /> AI-поиск</button>
                </div>
              )}
              {Object.entries(MEALS_MAP).map(([mealKey, mealName]) => {
                const items = entry.foods.filter(item => item.meal === mealKey)
                if (!items.length) return null
                const mealCalories = items.reduce((total, item) => total + (item.calories || 0), 0)
                return (
                  <article className={styles.mealCard} key={mealKey}>
                    <div className={styles.mealHeader}>
                      <img className={styles.mealVisual} src={MEAL_VISUALS[mealKey]} alt="" />
                      <div className={styles.mealTitle}><h3>{mealName}</h3><span>{MEAL_TIMES[mealKey]} · {items.length} поз.</span></div>
                      <strong>{Math.round(mealCalories)} <small>ккал</small></strong>
                    </div>
                    <div className={styles.foodItems}>
                      {items.map(item => (
                        <SwipeActions key={item.id} onEdit={() => setEditingFood(item)} onDelete={() => removeFood(item.id)} confirmText="Удалить этот продукт?">
                          <div className={styles.foodItem} onClick={() => setEditingFood(item)}>
                            <div><h4>{item.name}</h4><p>{item.weight} г · <span className={styles.protein}>Б {Math.round(item.protein || 0)}</span> <span className={styles.fat}>Ж {Math.round(item.fat || 0)}</span> <span className={styles.carbs}>У {Math.round(item.carbs || 0)}</span></p></div>
                            <strong>{Math.round(item.calories || 0)}</strong>
                          </div>
                        </SwipeActions>
                      ))}
                    </div>
                  </article>
                )
              })}
              {entry.foods.length > 0 && <button className={styles.addMeal} onClick={() => setTab('ai')}><FoodAiIcon size={20} /> Добавить через AI</button>}
            </div>
          )}
        </section>
      )}
      </div>

      <nav className={styles.sectionTabs} aria-label="Разделы питания">
        {SECTION_TABS.map(([key, label, Icon]) => (
          <button key={key} className={tab === key ? styles.sectionTabActive : ''} onClick={() => setTab(key)}><Icon size={16} /><span>{label}</span></button>
        ))}
      </nav>

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
