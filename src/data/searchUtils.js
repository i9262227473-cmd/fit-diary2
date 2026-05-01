// Объединённый поиск с правильной дедупликацией по БЖУ через sameMacros
// Использовать вместо searchFood из foodDatabase.js
import { FOOD_DB } from './foodDatabase'
import { searchCachedFoods, sameMacros } from './userFoodCache'

export function searchFoodSmart(query) {
  if (!query || query.length < 2) return []
  const lq = query.toLowerCase().trim()

  // 1. Кэш AI-продуктов
  const cached = searchCachedFoods(query)
    .map(f => ({ ...f, isUserCache: true }))

  // 2. Статическая база
  const fromDb = FOOD_DB
    .filter(([name]) => name.toLowerCase().includes(lq))
    .slice(0, 15)
    .map(([name, cal, prot, fat, carbs]) => ({
      name, cal100: cal, prot100: prot, fat100: fat, carbs100: carbs
    }))

  // 3. Дедупликация через sameMacros (с допуском ±1.5)
  // Если в кэше есть продукт с такими же БЖУ — не показываем дубликат из базы
  const dbFiltered = fromDb.filter(dbItem =>
    !cached.some(cachedItem => sameMacros(cachedItem, dbItem))
  )

  return [...cached, ...dbFiltered].slice(0, 10)
}
