import React from 'react'
import AiFoodSearch from './AiFoodSearch'
import FoodSearchPanel from './FoodSearchPanel'
import ManualFoodForm from './ManualFoodForm'
import MealSelector from './MealSelector'
import RecipeBuilder from './RecipeBuilder'

export default function FoodModule({
  tab,
  meal,
  meals,
  mealIcons,
  onMealChange,
  manualMode,
  onManualModeChange,
  inputStyle,
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
  manual,
  onManualChange,
  onAddManual,
  aiText,
  onAiTextChange,
  onVoiceResult,
  aiLoading,
  aiResults,
  onRecognize,
  onAddAiItem,
  onAddAllAiItems,
  onSaveRecipe,
  aiCall,
}) {
  if (tab === 'add') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <MealSelector
          meals={meals}
          icons={mealIcons}
          selectedMeal={meal}
          onMealChange={onMealChange}
        />
        <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: 12, padding: 3, gap: 3, border: '1px solid #2e2e2e' }}>
          {[['search', 'Поиск'], ['manual', 'Вручную']].map(([key, label]) => (
            <button key={key} onClick={() => onManualModeChange(key === 'manual')} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, background: (key === 'manual' ? manualMode : !manualMode) ? '#2a2a2a' : 'transparent', color: (key === 'manual' ? manualMode : !manualMode) ? '#f5f5f5' : '#6b7280' }}>{label}</button>
          ))}
        </div>
        {!manualMode && (
          <FoodSearchPanel
            inp={inputStyle}
            query={query}
            onQueryChange={onQueryChange}
            scanLoading={scanLoading}
            onOpenBarcodeScanner={onOpenBarcodeScanner}
            onPhotoSelected={onPhotoSelected}
            results={results}
            selectedFood={selectedFood}
            onSelectFood={onSelectFood}
            onChangeSelectedFood={onChangeSelectedFood}
            grams={grams}
            onChangeGrams={onChangeGrams}
            onClearSelection={onClearSelection}
            onAddFood={onAddFood}
          />
        )}
        {manualMode && (
          <ManualFoodForm
            manual={manual}
            onChange={onManualChange}
            onAdd={onAddManual}
            inputStyle={inputStyle}
          />
        )}
      </div>
    )
  }

  if (tab === 'ai') {
    return (
      <AiFoodSearch
        text={aiText}
        onTextChange={onAiTextChange}
        onVoiceResult={onVoiceResult}
        loading={aiLoading}
        results={aiResults}
        onRecognize={onRecognize}
        meals={meals}
        selectedMeal={meal}
        onMealChange={onMealChange}
        inputStyle={inputStyle}
        onAddOne={onAddAiItem}
        onAddAll={onAddAllAiItems}
      />
    )
  }

  if (tab === 'builder') {
    return <RecipeBuilder onSave={onSaveRecipe} aiCall={aiCall} />
  }

  return null
}
