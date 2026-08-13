import { useState } from 'react'
import { searchFoodSmart } from '../data/searchUtils'
import { saveCachedFood } from '../data/userFoodCache'
import { lookupBarcode } from '../components/food/BarcodeScanner'

function compressImage(file, maxSize = 1024, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = event => {
      const image = new Image()

      image.onload = () => {
        const canvas = document.createElement('canvas')
        let width = image.width
        let height = image.height

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width)
            width = maxSize
          } else {
            width = Math.round((width * maxSize) / height)
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(image, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1])
      }

      image.onerror = reject
      image.src = event.target.result
    }

    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getMealByTime() {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 11) return 'breakfast'
  if (hour >= 11 && hour < 16) return 'lunch'
  if (hour >= 16 && hour < 22) return 'dinner'
  return 'snack'
}

export default function useFood({ state, dispatch, aiCall }) {
  const [tab, setTab] = useState('log')
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [logMode, setLogMode] = useState('list')
  const [meal, setMeal] = useState(getMealByTime)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedFood, setSelectedFood] = useState(null)
  const [grams, setGrams] = useState('100')
  const [manualMode, setManualMode] = useState(false)
  const [manual, setManual] = useState({ name: '', cal: '', p: '', f: '', c: '', grams: '100' })
  const [aiText, setAiText] = useState('')
  const [aiResults, setAiResults] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [toast, setToast] = useState(null)
  const [editingFood, setEditingFood] = useState(null)

  const today = new Date().toISOString().split('T')[0]
  const entry = state.entries.find(item => item.date === selectedDate) || { date: selectedDate, foods: [], workouts: [] }
  const totals = entry.foods.reduce(
    (total, food) => ({
      cal: total.cal + (food.calories || 0),
      p: total.p + (food.protein || 0),
      fat: total.fat + (food.fat || 0),
      c: total.c + (food.carbs || 0),
    }),
    { cal: 0, p: 0, fat: 0, c: 0 },
  )

  const showToast = message => {
    setToast(message)
    setTimeout(() => setToast(null), 2000)
  }

  const handleSearch = value => {
    setQuery(value)
    setSelectedFood(null)
    setResults(value.length > 1 ? searchFoodSmart(value).slice(0, 8) : [])
  }

  const addFoodItem = (food, amount, mealKey) => {
    const weight = parseFloat(amount) || 100

    dispatch({
      type: 'SAVE_ENTRY',
      entry: {
        ...entry,
        foods: [
          ...entry.foods,
          {
            id: Date.now(),
            name: food.name,
            weight,
            meal: mealKey || meal,
            calories: ((food.cal100 || 0) * weight) / 100,
            protein: ((food.prot100 || 0) * weight) / 100,
            fat: ((food.fat100 || 0) * weight) / 100,
            carbs: ((food.carbs100 || 0) * weight) / 100,
            time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
          },
        ],
      },
    })

    showToast(food.name + ' добавлено')
    setSelectedFood(null)
    setQuery('')
    setResults([])
    setGrams('100')
    setTab('log')
  }

  const addManual = () => {
    if (!manual.name || !manual.cal) return

    const weight = parseFloat(manual.grams) || 100
    saveCachedFood({
      name: manual.name,
      cal100: parseFloat(manual.cal) || 0,
      prot100: parseFloat(manual.p) || 0,
      fat100: parseFloat(manual.f) || 0,
      carbs100: parseFloat(manual.c) || 0,
    })

    dispatch({
      type: 'SAVE_ENTRY',
      entry: {
        ...entry,
        foods: [
          ...entry.foods,
          {
            id: Date.now(),
            name: manual.name,
            weight,
            meal,
            calories: (parseFloat(manual.cal) * weight) / 100,
            protein: ((parseFloat(manual.p) || 0) * weight) / 100,
            fat: ((parseFloat(manual.f) || 0) * weight) / 100,
            carbs: ((parseFloat(manual.c) || 0) * weight) / 100,
            time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
          },
        ],
      },
    })

    showToast(manual.name + ' добавлено')
    setManual({ name: '', cal: '', p: '', f: '', c: '', grams: '100' })
    setTab('log')
  }

  const removeFood = id => {
    dispatch({
      type: 'SAVE_ENTRY',
      entry: { ...entry, foods: entry.foods.filter(food => food.id !== id) },
    })
  }

  const updateFood = updatedFood => {
    dispatch({
      type: 'SAVE_ENTRY',
      entry: {
        ...entry,
        foods: entry.foods.map(food => (food.id === updatedFood.id ? updatedFood : food)),
      },
    })
    showToast('Изменения сохранены')
    setEditingFood(null)
  }

  const handleScan = async file => {
    setScanLoading(true)

    try {
      const b64 = await compressImage(file)
      const response = await fetch('https://api.sudbase.ru/ai-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ b64 }),
      })

      if (!response.ok) {
        console.error('ai-vision HTTP error:', response.status)
        alert(`Сервер вернул ошибку (${response.status}). Попробуйте ещё раз или добавьте вручную.`)
        return
      }

      const data = await response.json()

      if (data.name) {
        const food = {
          name: data.name,
          cal100: data.calories || 0,
          prot100: data.protein || 0,
          fat100: data.fat || 0,
          carbs100: data.carbs || 0,
        }
        saveCachedFood(food)
        setSelectedFood(food)
        setQuery(data.name)
      } else {
        console.warn('ai-vision: пустой ответ или нет поля name:', data)
        alert(data.error || 'Не удалось распознать продукт на фото. Попробуйте сделать фото чётче или добавьте вручную.')
      }
    } catch (error) {
      console.error('ai-vision fetch error:', error)
      alert('Не удалось отправить фото. Проверьте соединение и попробуйте снова.')
    } finally {
      setScanLoading(false)
    }
  }

  const handleBarcodeDetect = async code => {
    setShowBarcodeScanner(false)
    setScanLoading(true)

    try {
      const normalizedCode = String(code).match(/(?:01|gtin=)?(\d{8,14})/i)?.[1] || String(code).replace(/\D/g, '')
      if (normalizedCode.length < 6) {
        alert('Код распознан, но в нём нет номера продукта. Попробуйте другой код или добавьте продукт вручную.')
        return
      }
      const food = await lookupBarcode(normalizedCode)

      if (food && food.cal100 > 0) {
        saveCachedFood(food)
        setSelectedFood(food)
        setQuery(food.name)
      } else {
        alert('Продукт по этому штрихкоду не найден в базе. Попробуйте фото или добавьте вручную.')
      }
    } catch (error) {
      console.error('barcode lookup error:', error)
      alert('Не удалось проверить штрихкод. Проверьте соединение и попробуйте снова.')
    } finally {
      setScanLoading(false)
    }
  }

  const runAI = async () => {
    if (!aiText.trim()) return

    setAiLoading(true)
    setAiResults(null)

    try {
      const prompt = `Ты нутрициолог. Твоя задача — по описанию еды вернуть точные значения КБЖУ, используя стандартные табличные данные о составе продуктов (как в справочниках USDA / базах пищевой ценности).

ПРАВИЛА РАСЧЁТА:
- cal100, prot100, fat100, carbs100 — это значения на 100 грамм продукта (НЕ на порцию). Бери реальные табличные значения, не округляй грубо и не выдумывай.
- grams — вес именно этой порции в граммах. Если в тексте указан вес/объём ("200 мл", "2 яйца", "тарелка") — оцени реальный вес порции. Если не указан — поставь типичную порцию продукта.
- Вода, чай без сахара, чёрный кофе без сахара, специи — это 0 ккал, 0 белков, 0 жиров, 0 углеводов. Ставь именно нули, не выдумывай калорийность.
- Для готовых/варёных блюд бери значения именно в готовом виде (варёная гречка ≠ сухая гречка).
- Каждый отдельный продукт из описания — отдельный элемент массива.

Верни ТОЛЬКО JSON-массив без markdown, без пояснений. Все поля — числа.
Формат: [{"name":"Название продукта","cal100":число,"prot100":число,"fat100":число,"carbs100":число,"grams":число}]

Описание еды: "${aiText}"`
      const reply = await aiCall([{ role: 'user', content: prompt }], 700)
      const match = reply.replace(/```json|```/g, '').trim().match(/\[[\s\S]*\]/)

      if (match) {
        const parsed = JSON.parse(match[0]).map(item => ({
          food: {
            name: item.name,
            cal100: parseFloat(item.cal100) || 0,
            prot100: parseFloat(item.prot100) || 0,
            fat100: parseFloat(item.fat100) || 0,
            carbs100: parseFloat(item.carbs100) || 0,
          },
          grams: parseFloat(item.grams) || 100,
        }))

        parsed.forEach(item => saveCachedFood(item.food))
        setAiResults(parsed)
      } else {
        setAiResults([])
      }
    } catch {
      setAiResults([])
    }

    setAiLoading(false)
  }

  const addAllAiItems = () => {
    const currentEntry = state.entries.find(item => item.date === selectedDate) || {
      date: selectedDate,
      foods: [],
      workouts: [],
    }
    const newFoods = aiResults.map(item => {
      const weight = parseFloat(item.grams) || 100

      return {
        id: Date.now() + Math.random(),
        name: item.food.name,
        weight,
        meal,
        calories: ((item.food.cal100 || 0) * weight) / 100,
        protein: ((item.food.prot100 || 0) * weight) / 100,
        fat: ((item.food.fat100 || 0) * weight) / 100,
        carbs: ((item.food.carbs100 || 0) * weight) / 100,
        time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
      }
    })

    dispatch({
      type: 'SAVE_ENTRY',
      entry: { ...currentEntry, foods: [...currentEntry.foods, ...newFoods] },
    })

    showToast(newFoods.length + ' продуктов добавлено')
    setAiText('')
    setAiResults(null)
    setTab('log')
  }

  const saveRecipe = recipe => {
    saveCachedFood({
      name: recipe.name,
      cal100: recipe.cal100,
      prot100: recipe.prot100,
      fat100: recipe.fat100,
      carbs100: recipe.carbs100,
    })
    showToast(recipe.name + ' сохранён в базу продуктов')
  }

  const appendAiText = text => {
    setAiText(current => (current ? current + ' ' : '') + text)
  }

  return {
    tab,
    setTab,
    logMode,
    setLogMode,
    meal,
    setMeal,
    query,
    setQuery,
    results,
    setResults,
    selectedFood,
    setSelectedFood,
    grams,
    setGrams,
    manualMode,
    setManualMode,
    manual,
    setManual,
    aiText,
    setAiText,
    aiResults,
    aiLoading,
    scanLoading,
    showBarcodeScanner,
    setShowBarcodeScanner,
    toast,
    editingFood,
    setEditingFood,
    entry,
    totals,
    selectedDate,
    setSelectedDate,
    handleSearch,
    addFoodItem,
    addManual,
    removeFood,
    updateFood,
    handleScan,
    handleBarcodeDetect,
    runAI,
    addAllAiItems,
    saveRecipe,
    appendAiText,
  }
}
