import React, { useEffect } from 'react'
import { CalendarDays, ChefHat, ChevronLeft, Coffee, Cookie, Moon, Plus, Search, Sparkles, Sun, Utensils } from 'lucide-react'
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

export default function FoodScreen({ state, dispatch, aiCall, intent }) {
  const food = useFood({ state, dispatch, aiCall })
  const {
    tab, setTab, logMode, setLogMode, meal, setMeal, query, setQuery, results, setResults,
    selectedFood, setSelectedFood, grams, setGrams, manualMode, setManualMode,
    manual, setManual, aiText, setAiText, aiResults, aiLoading, scanLoading,
    showBarcodeScanner, setShowBarcodeScanner, toast, editingFood, setEditingFood,
    entry, totals, selectedDate, setSelectedDate, handleSearch, addFoodItem, addManual, removeFood, updateFood,
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
  const macroCalories = totals.p * 4 + totals.fat * 9 + totals.c * 4
  const proteinShare = macroCalories > 0 ? totals.p * 4 / macroCalories : .34
  const fatShare = macroCalories > 0 ? totals.fat * 9 / macroCalories : .33
  const proteinEnd = percentage * proteinShare
  const fatEnd = proteinEnd + percentage * fatShare
  const ringStyle = {
    background: `conic-gradient(from -90deg, var(--protein) 0 ${proteinEnd}%, var(--amber) ${proteinEnd}% ${fatEnd}%, var(--purple) ${fatEnd}% ${percentage}%, var(--surface3) ${percentage}% 100%)`,
  }
  const dayTitle = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  const today = new Date().toISOString().split('T')[0]
  const touchStartX = React.useRef(null)
  const changeDay = delta => setSelectedDate(current => shiftIsoDate(current, delta))
  const handleDaySwipeEnd = event => {
    if (touchStartX.current == null) return
    const delta = event.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 55) return
    changeDay(delta < 0 ? 1 : -1)
  }
  const macros = [
    { label: 'Белки', value: totals.p, max: goals.protein, color: 'var(--protein)' },
    { label: 'Жиры', value: totals.fat, max: goals.fat, color: 'var(--amber)' },
    { label: 'Углеводы', value: totals.c, max: goals.carbs, color: 'var(--teal)' },
  ]

  useEffect(() => {
    if (!intent) return
    if (intent.type === 'barcode' || intent.type === 'qr') {
      setTab('add')
      setShowBarcodeScanner(true)
      return
    }
    if (intent.type === 'photo' || intent.type === 'add') setTab('add')
    if (intent.type === 'log') setTab('log')
  }, [intent?.id])

  return (
    <div className={styles.screen}>
      {toast && <div className={styles.toast}>{toast}</div>}
      {editingFood && <EditFoodModal food={editingFood} onSave={updateFood} onClose={() => setEditingFood(null)} />}
      {showBarcodeScanner && <BarcodeScanner onDetect={handleBarcodeDetect} onClose={() => setShowBarcodeScanner(false)} />}

      <header className={styles.header}>
        <button className={styles.headerButton} onClick={() => { setTab('log'); setLogMode('calendar') }} aria-label="Открыть календарь"><CalendarDays size={19} /></button>
        <button className={styles.headerTitle} onClick={() => { setTab('log'); setLogMode('list') }}><h1>Питание</h1><p>{selectedDate === today ? 'Сегодня, ' : ''}{dayTitle}</p></button>
        <button className={styles.addButton} onClick={() => setTab('add')} aria-label="Добавить продукт"><Plus size={21} /></button>
      </header>

      <div className={styles.daySwitcher}>
        <button onClick={() => changeDay(-1)} aria-label="Предыдущий день"><ChevronLeft size={18} /></button>
        <button className={styles.dayLabel} onClick={() => { setSelectedDate(today); setTab('log') }}><strong>{selectedDate === today ? 'Сегодня' : dayTitle}</strong><span>Свайпните, чтобы сменить день</span></button>
        <button onClick={() => changeDay(1)} aria-label="Следующий день"><ChevronLeft size={18} /></button>
      </div>

      <div className={styles.daySwipe} onTouchStart={event => { touchStartX.current = event.touches[0].clientX }} onTouchEnd={handleDaySwipeEnd}>
      <section className={styles.summaryCard}>
        <div className={styles.summaryTop}>
          <div><span className={styles.eyebrow}>Баланс дня</span><h2>Энергия и БЖУ</h2></div>
          <span className={styles.percent}>{percentage}%</span>
        </div>
        <div className={styles.energyRow}>
          <div className={styles.ringColumn}>
            <div className={styles.macroRing} style={ringStyle}>
              <div className={styles.ringInner}>
                <strong>{Math.round(totals.cal)}</strong>
                <span>ккал</span>
              </div>
            </div>
            <span className={styles.ringGoal}>из {goals.calories} ккал</span>
          </div>
          <div className={styles.energyNumbers}>
            <div><span>Съедено</span><strong>{Math.round(totals.cal)}</strong><small>ккал</small></div>
            <div><span>Осталось</span><strong className={styles.remaining}>{remaining}</strong><small>ккал</small></div>
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

      {tab === 'log' && (
        <section className={styles.logSection}>
          <div className={styles.logHeader}>
            <div><span className={styles.eyebrow}>{selectedDate === today ? 'Сегодня' : dayTitle}</span><h2>Приёмы пищи</h2></div>
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
                  <span><Utensils size={25} /></span><h3>Записей пока нет</h3>
                  <p>Добавьте первый приём пищи — калории и БЖУ рассчитаются автоматически.</p>
                  <button onClick={() => setTab('ai')}><Sparkles size={16} /> AI-поиск</button>
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
              {entry.foods.length > 0 && <button className={styles.addMeal} onClick={() => setTab('ai')}><Sparkles size={17} /> Добавить через AI</button>}
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
