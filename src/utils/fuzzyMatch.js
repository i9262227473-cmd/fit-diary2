// ─── НЕЧЁТКОЕ СОПОСТАВЛЕНИЕ НАЗВАНИЙ УПРАЖНЕНИЙ ────────────────────────────
// Общая утилита: находит среди списка кандидатов строку, ближе всего
// совпадающую с запросом по значимым корням слов. Нужна там, где название
// упражнения приходит не из справочника напрямую (например, сгенерировано
// AI-планом свободным текстом: «Жим гантелей лёжа на скамье с наклоном»
// вместо канонического «Жим гантелей на наклонной») и точное совпадение
// не срабатывает.
//
// Используется и для поиска техники выполнения (exerciseTechnique.js),
// и для поиска альтернатив при замене упражнения (exerciseDatabase.js) —
// раньше у каждого была своя копия этой логики, теперь она общая.

const STOPWORDS = new Set(['в', 'на', 'с', 'из', 'за', 'к', 'и', 'рук', 'руки', 'руками', 'для'])

function clean(s) {
  return String(s).replace(/\(.*?\)/g, '').trim()
}

function rootsOf(s) {
  return clean(s)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .filter(w => !STOPWORDS.has(w))
    .map(w => w.slice(0, Math.max(4, w.length - 2))) // грубый корень слова (без окончания)
}

// Возвращает строку-кандидата, лучше всего совпавшую с query, либо null,
// если лучшее совпадение ниже порога threshold (доля совпавших корней, 0..1).
export function fuzzyMatchName(query, candidates, threshold = 0.6) {
  if (!query) return null
  const queryRoots = rootsOf(query)
  if (queryRoots.length === 0) return null

  let bestMatch = null
  let bestScore = 0
  for (const candidate of candidates) {
    const candRoots = rootsOf(candidate)
    if (candRoots.length === 0) continue
    const overlap = queryRoots.filter(r => candRoots.some(cr => cr.startsWith(r) || r.startsWith(cr))).length
    const score = overlap / Math.max(queryRoots.length, candRoots.length)
    if (score > bestScore) { bestScore = score; bestMatch = candidate }
  }
  // Порог 0.6 — большинство слов должны совпасть, чтобы не подставить неверное упражнение
  return bestScore >= threshold ? bestMatch : null
}
