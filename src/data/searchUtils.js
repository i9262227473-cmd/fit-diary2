// Объединённый поиск с правильной дедупликацией по БЖУ через sameMacros
// Использовать вместо searchFood из foodDatabase.js
import { FOOD_DB } from './foodDatabase'
import { getCachedFoods, searchCachedFoods, sameMacros } from './userFoodCache'

const DESCRIPTION_STOP_WORDS = new Set([
  'г', 'гр', 'кг', 'мл', 'л', 'шт', 'штук', 'порция', 'порцию',
  'с', 'и', 'на', 'из', 'для', 'съел', 'съела', 'ел', 'ела', 'поел',
  'поела', 'добавь', 'добавить', 'запиши', 'записать',
])

function normalizeFoodText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .trim()
}

function foodTokens(value) {
  return [...new Set(normalizeFoodText(value)
    .split(' ')
    .filter(token => token && !/^\d+(?:[.,]\d+)?$/.test(token))
    .filter(token => !DESCRIPTION_STOP_WORDS.has(token))
    .map(token => token.length >= 5 ? token.slice(0, 4) : token)
    .filter(token => token.length >= 2))]
}

function foodDbItems() {
  return FOOD_DB.map(([name, cal, prot, fat, carbs, portionGrams]) => ({
    name,
    cal100: cal,
    prot100: prot,
    fat100: fat,
    carbs100: carbs,
    ...(portionGrams ? { portionGrams } : {}),
  }))
}

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
    .map(([name, cal, prot, fat, carbs, portionGrams]) => ({
      name, cal100: cal, prot100: prot, fat100: fat, carbs100: carbs,
      ...(portionGrams ? { portionGrams } : {}),
    }))

  // 3. Дедупликация через sameMacros (с допуском ±1.5)
  // Если в кэше есть продукт с такими же БЖУ — не показываем дубликат из базы
  const dbFiltered = fromDb.filter(dbItem =>
    !cached.some(cachedItem => sameMacros(cachedItem, dbItem))
  )

  return [...cached, ...dbFiltered].slice(0, 10)
}

export function extractFoodWeight(value, fallback = 100) {
  const text = String(value || '').toLocaleLowerCase('ru-RU').replace(',', '.')
  const match = text.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(кг|г|гр|мл|л)(?:\s|$)/i)
  if (!match) return fallback

  const amount = Number(match[1])
  if (!Number.isFinite(amount) || amount <= 0) return fallback
  if (match[2] === 'кг' || match[2] === 'л') return Math.round(amount * 1000)
  return Math.round(amount)
}

export function pickConfidentFoodMatch(description, candidates) {
  const text = String(description || '').trim()
  if (!text || /[,;+]|\s+(?:и|с)\s+/i.test(text)) return null

  const queryTokens = foodTokens(text)
  if (queryTokens.length === 0) return null

  const scored = (candidates || [])
    .map(food => {
      const candidateTokens = foodTokens(food.name)
      const matched = candidateTokens.filter(token => queryTokens.includes(token)).length
      const missingFromQuery = candidateTokens.length - matched
      const queryCoverage = matched / queryTokens.length
      const candidateCoverage = candidateTokens.length ? matched / candidateTokens.length : 0
      const exact = normalizeFoodText(text)
        .replace(/\b\d+(?:[.,]\d+)?\s*(?:кг|г|гр|мл|л|шт|штук)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim() === normalizeFoodText(food.name)

      return {
        food,
        score: (exact ? 10 : 0) + queryCoverage + candidateCoverage,
        confident: exact || (queryCoverage === 1 && candidateCoverage >= 0.66 && missingFromQuery <= 1),
      }
    })
    .filter(item => item.confident)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) return null
  if (scored.length > 1 && scored[0].score === scored[1].score) return null
  return scored[0].food
}

export function findConfidentLocalFood(description) {
  const cached = getCachedFoods().map(food => ({ ...food, isUserCache: true }))
  return pickConfidentFoodMatch(description, [...cached, ...foodDbItems()])
}
