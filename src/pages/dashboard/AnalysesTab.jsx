import React, { useState } from 'react'
import { useStore, API_URL } from '../../store'
import { FlaskConical, ScanLine, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import styles from './AnalysesTab.module.css'

const STORAGE_KEY = 'analyses-v1'
const loadAnalyses = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] } }

export default function AnalysesTab() {
  const { profile, aiCall } = useStore()
  const [analyses, setAnalyses] = useState(loadAnalyses)
  const [scanning, setScanning] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  const handlePhoto = async (file) => {
    setScanning(true)
    try {
      const b64 = await compressImage(file, 1600, 0.9)
      setScanning(false)
      setAnalyzing(true)

      const p = profile || {}
      const limitations = p.hasLimitations ? `Хронические заболевания пациента: ${p.limitationsText}.` : ''
      const gender = p.gender === 'male' ? 'мужчина' : 'женщина'
      const level = { beginner: 'новичок', amateur: 'любитель', advanced: 'продвинутый', professional: 'профессиональный спортсмен' }[p.level] || 'спортсмен'

      const res = await fetch(`${API_URL}/ai-vision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ b64, type: 'document' })
      })
      const visionData = await res.json()
      const extractedText = visionData.text || 'Не удалось извлечь текст'

      const analysis = await aiCall([{
        role: 'user',
        content: `Проанализируй лабораторные данные пациента.

Пациент: ${gender}, ${p.age} лет, вес ${p.weight} кг, рост ${p.height} см, ИМТ ${p.bmi}. Уровень активности: ${level}. ${limitations}

Данные из документа:
${extractedText}

Раздели показатели на панели (Кровь, Биохимия, Гормоны, Витамины, Липиды). Для каждого показателя укажи:
- Норма или отклонение (возможные причины если есть)
Для каждой панели дай краткий вывод и рекомендации (питание, образ жизни, контроль). Отметь критические показатели.

Формат для каждого показателя:
[Название] | [0437начение] [ед.] | Референс: [норма] | [НОРМА / ПОВЫШЕН / СНИЖЕН]

Заверши анализ выводом: "Внимание: я не являюсь врачом. Данные носят информационный характер и не заменяют очную консультацию специалиста."`
      }], 1500)

      const newAnalysis = {
        id: Date.now(),
        date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
        extractedText: extractedText.slice(0, 200),
        analysis,
      }

      const updated = [newAnalysis, ...analyses]
      setAnalyses(updated)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      setExpandedId(newAnalysis.id)
    } catch (e) {
      console.error(e)
      alert('Не удалось проанализировать документ. Попробуйте ещё раз.')
    } finally {
      setScanning(false)
      setAnalyzing(false)
    }
  }

  const deleteAnalysis = (id) => {
    if (!confirm('Удалить этот анализ?')) return
    const updated = analyses.filter(a => a.id !== id)
    setAnalyses(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    if (expandedId === id) setExpandedId(null)
  }

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <FlaskConical size={18} color="var(--gold)" strokeWidth={2} />
          <span className={styles.title}>Анализы</span>
        </div>
        <div className={styles.subtitle}>Сфотографируйте результаты — AI расшифрует как врач</div>
      </div>

      {/* Scan area */}
      <label className={styles.scanArea}>
        <div className={styles.scanIconWrap}>
          {scanning || analyzing
            ? <FlaskConical size={44} color="var(--gold)" strokeWidth={1.5} />
            : <ScanLine size={44} color="var(--gold)" strokeWidth={1.5} />
          }
        </div>
        <div className={styles.scanText}>
          {scanning ? 'Обрабатываю фото...' : analyzing ? 'Анализирую как врач...' : 'Сфотографировать документ'}
        </div>
        {analyzing && <div className={styles.scanHint}>Это может занять 20–30 секунд</div>}
        {!scanning && !analyzing && <div className={styles.scanHint}>Анализы крови, ЭКГ, биохимия, гормоны, справки</div>}
        <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
          onChange={e => e.target.files[0] && handlePhoto(e.target.files[0])}
          disabled={scanning || analyzing} />
      </label>

      {/* History */}
      {analyses.length > 0 && (
        <div>
          <div className={styles.historyTitle}>История анализов ({analyses.length})</div>
          {analyses.map(a => (
            <div key={a.id} className={styles.card}>
              <div className={styles.cardHeader} onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}>
                <div>
                  <div className={styles.cardDate}>{a.date}</div>
                  <div className={styles.cardPreview}>{a.extractedText}</div>
                </div>
                <div className={styles.cardActions}>
                  <span className={styles.toggle}>
                    {expandedId === a.id
                      ? <ChevronUp size={16} color="var(--text3)" />
                      : <ChevronDown size={16} color="var(--text3)" />}
                  </span>
                  <button className={styles.deleteBtn}
                    onClick={e => { e.stopPropagation(); deleteAnalysis(a.id) }}>
                    <Trash2 size={16} color="var(--red)" />
                  </button>
                </div>
              </div>
              {expandedId === a.id && (
                <div className={styles.cardBody}>
                  <div className={styles.analysisText}>{a.analysis}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {analyses.length === 0 && !scanning && !analyzing && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <FlaskConical size={56} color="var(--text3)" strokeWidth={1} />
          </div>
          <div>История анализов пуста</div>
          <div className={styles.emptyHint}>Сфотографируйте результаты — AI проведёт профессиональную расшифровку</div>
        </div>
      )}
    </div>
  )
}

function compressImage(file, maxSize = 1600, quality = 0.9) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize }
          else { w = Math.round(w * maxSize / h); h = maxSize }
        }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1])
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
