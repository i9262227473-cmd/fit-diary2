// Кэш AI-распознанных продуктов в localStorage
// Дедупликация по БЖУ (с допуском ±1.5 ккал/г для округлений AI)

const KEY = 'user-food-cache-v1'
const BJU_TOLERANCE = 1.5

// Сравнение БЖУ с допуском — ЭКСПОРТ для использования в searchFood
export function sameMacros(a, b) {
  return Math.abs((a.cal100||0)   - (b.cal100||0))   <= BJU_TOLERANCE &&
         Math.abs((a.prot100||0)  - (b.prot100||0))  <= BJU_TOLERANCE &&
         Math.abs((a.fat100||0)   - (b.fat100||0))   <= BJU_TOLERANCE &&
         Math.abs((a.carbs100||0) - (b.carbs100||0)) <= BJU_TOLERANCE
}

export function getCachedFoods() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') }
  catch { return [] }
}

export function saveCachedFood(food) {
  if (!food?.name || food.cal100 == null) return

  const norm = {
    name: food.name.trim(),
    cal100: Math.round((food.cal100   || 0) * 10) / 10,
    prot100: Math.round((food.prot100 || 0) * 10) / 10,
    fat100: Math.round((food.fat100   || 0) * 10) / 10,
    carbs100: Math.round((food.carbs100|| 0) * 10) / 10,
  }

  const cache = getCachedFoods()
  const existing = cache.find(f => sameMacros(f, norm))
  if (existing) {
    existing.lastUsed = Date.now()
    existing.usedCount = (existing.usedCount || 1) + 1
    if (norm.name.length < existing.name.length) existing.name = norm.name
  } else {
    cache.push({
      ...norm,
      source: 'ai',
      addedAt: Date.now(),
      lastUsed: Date.now(),
      usedCount: 1,
    })
  }

  if (cache.length > 200) {
    cache.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
    cache.length = 200
  }

  try { localStorage.setItem(KEY, JSON.stringify(cache)) }
  catch (e) { console.warn('[userFoodCache] Не удалось сохранить:', e) }
}

export function searchCachedFoods(query) {
  if (!query || query.length < 2) return []
  const q = query.toLowerCase().trim()
  return getCachedFoods()
    .filter(f => f.name.toLowerCase().includes(q))
    .sort((a, b) => (b.usedCount || 0) - (a.usedCount || 0))
    .slice(0, 5)
}

export function clearCachedFoods() {
  localStorage.removeItem(KEY)
}
