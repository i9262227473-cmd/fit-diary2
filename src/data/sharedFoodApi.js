import { API_URL, useStore } from '../store'

function normalizeSharedFood(food) {
  if (!food?.name) return null

  return {
    id: food.id,
    barcode: food.barcode,
    name: food.name,
    cal100: Number(food.cal100) || 0,
    prot100: Number(food.prot100) || 0,
    fat100: Number(food.fat100) || 0,
    carbs100: Number(food.carbs100) || 0,
    source: food.source || 'shared',
    isShared: true,
  }
}

async function getAuthorizationHeaders(withJson = false) {
  const token = await useStore.getState().getValidToken()
  if (!token) return null

  return {
    ...(withJson ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${token}`,
  }
}

export async function searchSharedFoods(value, limit = 8) {
  const query = String(value || '').trim()
  if (query.length < 2) return []

  try {
    const headers = await getAuthorizationHeaders()
    if (!headers) return []

    const params = new URLSearchParams({ q: query, limit: String(limit) })
    const response = await fetch(`${API_URL}/foods/search?${params}`, { headers })
    if (!response.ok) return []

    const data = await response.json()
    return Array.isArray(data) ? data.map(normalizeSharedFood).filter(Boolean) : []
  } catch (error) {
    console.warn('Shared food search error:', error)
    return []
  }
}

export async function findSharedFoodByBarcode(code) {
  try {
    const headers = await getAuthorizationHeaders()
    if (!headers) return null

    const response = await fetch(`${API_URL}/foods/barcode/${encodeURIComponent(code)}`, { headers })
    if (response.status === 404) return null
    if (!response.ok) return null

    return normalizeSharedFood(await response.json())
  } catch (error) {
    console.warn('Shared barcode lookup error:', error)
    return null
  }
}

export async function resolveBarcodeProduct(code) {
  try {
    const headers = await getAuthorizationHeaders()
    if (!headers) return { status: 'unauthorized' }

    const response = await fetch(`${API_URL}/foods/resolve-barcode/${encodeURIComponent(code)}`, { headers })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return { status: data.status || 'temporary_error', error: data.error || 'Не удалось проверить штрихкод' }
    }

    return {
      ...data,
      food: data.food ? normalizeSharedFood(data.food) : null,
    }
  } catch (error) {
    console.warn('Barcode resolver error:', error)
    return { status: 'temporary_error', error: 'Нет соединения с сервером' }
  }
}

export async function recognizeBarcodeProduct(frontB64, nutritionB64) {
  const headers = await getAuthorizationHeaders(true)
  if (!headers) throw new Error('Для распознавания необходимо войти в приложение')

  const response = await fetch(`${API_URL}/ai-vision/barcode-product`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ frontB64, nutritionB64 }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Не удалось распознать фотографии')
  return data
}

export async function saveVerifiedBarcodeFood(barcode, food) {
  try {
    const headers = await getAuthorizationHeaders(true)
    if (!headers) throw new Error('Для сохранения необходимо войти в приложение')

    const response = await fetch(`${API_URL}/foods/upsert`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        barcode,
        name: food.name,
        cal100: Number(food.cal100) || 0,
        prot100: Number(food.prot100) || 0,
        fat100: Number(food.fat100) || 0,
        carbs100: Number(food.carbs100) || 0,
        source: 'user_verified',
      }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Не удалось сохранить продукт')
    return normalizeSharedFood(data)
  } catch (error) {
    console.warn('Verified food save error:', error)
    throw error
  }
}
