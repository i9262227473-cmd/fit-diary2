import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store'
import { searchFoodSmart } from '../data/searchUtils'
import { saveCachedFood, getCachedFoods, clearCachedFoods } from '../data/userFoodCache'
import { LogOut, Camera, Bell, ChevronRight, Plus, Check, X, ChevronLeft, Play, Pause, Flame, Droplets, Dumbbell, Edit2, Trash2, AlertTriangle, Sparkles, Calendar, ScanLine } from 'lucide-react'
import styles from './DashboardPage.module.css'
import { normReps } from './planUtils'
import { getExerciseProgress, saveExerciseResult, suggestWeightFor, acceptProgression } from './progressTracking'
import { EXERCISE_DB as FULL_EXERCISE_DB, MUSCLE_GROUPS, EFF_LABEL, EFF_ORDER, PLACE_LABEL, findAlternatives, getExercisesFor } from '../data/exerciseDatabase'
import { getTechnique } from '../data/exerciseTechnique'
import { createStableId as uid, formatLongTime as fmtTimeLong, getDefaultRestSeconds as getDefaultRestSec } from '../utils/workoutUi'
import { NavHome, NavWorkout, NavProgress, NavFood, NavUser } from '../components/layout/NavigationIcons'
import SwipeToDelete from '../components/common/SwipeToDelete'
import NumberStepper from '../components/common/NumberStepper'
import VoiceButton from '../components/common/VoiceButton'

const WK_DRAFT_KEY = 'workout-draft-v1'

// ─── WHEEL PICKER (как выбор года — крутишь пальцем вверх/вниз, значения щёлкают по центру) ─────────────────────
function buildWeightValues() {
  // 0–20 кг шагом 0.5, выше 20 — шагом 2.5
  const vals = []
  for (let v = 0; v <= 20; v += 0.5) vals.push(Math.round(v * 10) / 10)
  for (let v = 22.5; v <= 300; v += 2.5) vals.push(Math.round(v * 10) / 10)
  return vals
}

function WheelPicker({ value, onChange, min = 0, max = 100, step = 1, values: valuesProp, width = 80, itemHeight = 40, visibleCount = 5 }) {
  const containerRef = useRef(null)
  const scrollTimeout = useRef(null)
  const isProgrammatic = useRef(false)
  const [centerIdx, setCenterIdx] = useState(null)

  const values = useMemo(() => {
    if (valuesProp) return valuesProp
    const arr = []
    for (let v = min; v <= max + 1e-6; v += step) arr.push(Math.round(v * 100) / 100)
    return arr
  }, [valuesProp, min, max, step])

  const fmt = v => Number.isInteger(v) ? String(v) : String(v.toFixed(1))

  const closestIndex = (v) => {
    let best = 0, bestDiff = Infinity
    values.forEach((vv, i) => { const d = Math.abs(vv - v); if (d < bestDiff) { bestDiff = d; best = i } })
    return best
  }

  useEffect(() => {
    const idx = closestIndex(parseFloat(value) || min)
    setCenterIdx(idx)
    if (containerRef.current) {
      isProgrammatic.current = true
      containerRef.current.scrollTop = idx * itemHeight
      setTimeout(() => { isProgrammatic.current = false }, 60)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleScroll = () => {
    if (isProgrammatic.current) return
    const el = containerRef.current
    if (!el) return
    const rawIdx = el.scrollTop / itemHeight
    const idx = Math.max(0, Math.min(values.length - 1, Math.round(rawIdx)))
    setCenterIdx(idx)
    clearTimeout(scrollTimeout.current)
    scrollTimeout.current = setTimeout(() => {
      el.scrollTo({ top: idx * itemHeight, behavior: 'smooth' })
      onChange(fmt(values[idx]))
    }, 100)
  }

  const padCount = Math.floor(visibleCount / 2)
  const height = itemHeight * visibleCount

  return (
    <div style={{ position: 'relative', width, height }}>
      <style>{`.wheel-scroll-hide::-webkit-scrollbar{display:none}`}</style>
      <div style={{ position: 'absolute', top: itemHeight * padCount, left: 0, right: 0, height: itemHeight, background: 'rgba(61,153,112,0.12)', border: '1px solid rgba(61,153,112,0.4)', borderRadius: 10, pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(#0e0e0e, transparent 30%, transparent 70%, #0e0e0e)', pointerEvents: 'none', zIndex: 2, opacity: 0.9 }} />
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="wheel-scroll-hide"
        style={{ height: '100%', overflowY: 'scroll', scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
      >
        <div style={{ height: itemHeight * padCount }} />
        {values.map((v, i) => (
          <div key={v} style={{
            height: itemHeight, scrollSnapAlign: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--mono)',
            fontSize: i === centerIdx ? 20 : 15,
            fontWeight: i === centerIdx ? 700 : 500,
            color: i === centerIdx ? '#f5f5f5' : '#4b5563',
            transition: 'font-size 0.15s, color 0.15s',
          }}>
            {fmt(v)}
          </div>
        ))}
        <div style={{ height: itemHeight * padCount }} />
      </div>
    </div>
  )
}

// ─── SET PICKER MODAL (боттом-шит с двумя колёсами: повторы + вес) ─────────────────────
function SetPickerModal({ title, reps, weight, onSave, onClose }) {
  const [r, setR] = useState(String(reps || 0))
  const [w, setW] = useState(String(weight || 0))
  const weightValues = useMemo(() => buildWeightValues(), [])
  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 650, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0e0e0e', borderRadius: '20px 20px 0 0', padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))', width: '100%', maxWidth: 500 }}>
        <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#9ca3af', marginBottom: 18 }}>{title}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginBottom: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Повторы</div>
            <WheelPicker value={r} onChange={setR} min={0} max={50} step={1} width={80} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Вес, кг</div>
            <WheelPicker value={w} onChange={setW} values={weightValues} width={92} />
          </div>
        </div>
        <button onClick={() => onSave(r, w)} style={{ background: '#3d9970', color: '#000', border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, width: '100%', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 }}>Готово</button>
      </div>
    </div>, document.body
  )
}

function compressImage(file, maxSize = 1024, quality = 0.85) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = e => {
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
        res(canvas.toDataURL('image/jpeg', quality).split(',')[1])
      }
      img.onerror = rej; img.src = e.target.result
    }
    r.onerror = rej; r.readAsDataURL(file)
  })
}

// ─── BARCODE SCANNER (штрихкод-сканер через нативный BarcodeDetector + Open Food Facts — бесплатно, без ИИ) ───────────────────────────
// Open Food Facts (world.openfoodfacts.org) — открытая бесплатная база данных о продуктах по штрихкодам, API-ключ не нужен.
async function lookupBarcode(code) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_ru,nutriments`)
  if (!res.ok) throw new Error('HTTP_ERROR')
  const data = await res.json()
  if (data.status !== 1 || !data.product) return null
  const p = data.product
  const n = p.nutriments || {}
  const name = p.product_name_ru || p.product_name || `Штрихкод ${code}`
  return {
    name,
    cal100: Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0),
    prot100: Math.round((n.proteins_100g || 0) * 10) / 10,
    fat100: Math.round((n.fat_100g || 0) * 10) / 10,
    carbs100: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
  }
}

function BarcodeScanner({ onDetect, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const detectorRef = useRef(null)
  const rafRef = useRef(null)
  const [error, setError] = useState(null)
  const [manualCode, setManualCode] = useState('')
  const [manualMode, setManualMode] = useState(false)
  const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window

  useEffect(() => {
    let cancelled = false
    if (!supported) { setError('Браузер не поддерживает автосканирование — введите штрихкод вручную'); return }
    const start = async () => {
      try {
        detectorRef.current = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
        // Запрашиваем высокое разрешение и непрерывный автофокус — без этого браузер часто отдаёт размытое изображение с фиксированным фокусом — что катастрофично для чтения штрихкодов вблизи.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            advanced: [{ focusMode: 'continuous' }],
          },
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        // На части устройств focusMode не применяется через constraints при getUserMedia — дожимаем явно через applyConstraints на треке
        try {
          const [track] = stream.getVideoTracks()
          const caps = track.getCapabilities ? track.getCapabilities() : {}
          if (caps.focusMode && caps.focusMode.includes('continuous')) {
            await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] })
          }
        } catch {}
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
        const tick = async () => {
          if (cancelled || !videoRef.current || !detectorRef.current) return
          try {
            const codes = await detectorRef.current.detect(videoRef.current)
            if (codes.length > 0) { onDetect(codes[0].rawValue); return }
          } catch {}
          rafRef.current = requestAnimationFrame(tick)
        }
        tick()
      } catch (e) {
        setError('Не удалось получить доступ к камере — введите штрихкод вручную')
      }
    }
    start()
    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Тап по видео — ручной триггер перефокусировки на тех, где continuous не поддерживается автоматически
  const handleTapFocus = async () => {
    try {
      const [track] = streamRef.current?.getVideoTracks() || []
      if (!track) return
      const caps = track.getCapabilities ? track.getCapabilities() : {}
      if (caps.focusMode && caps.focusMode.includes('single-shot')) {
        await track.applyConstraints({ advanced: [{ focusMode: 'single-shot' }] })
      }
    } catch {}
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 700, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px', background: '#0e0e0e' }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: '#1a1a1a', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={18} color="#9ca3af" />
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#f5f5f5', flex: 1 }}>Сканер штрихкода</span>
        {supported && !error && (
          <button onClick={() => setManualMode(m => !m)} style={{ padding: '7px 12px', borderRadius: 8, background: manualMode ? '#3d9970' : '#1a1a1a', border: '1px solid #2e2e2e', color: manualMode ? '#000' : '#9ca3af', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            {manualMode ? 'Камера' : 'Ввести вручную'}
          </button>
        )}
      </div>
      {supported && !error && !manualMode ? (
        <div onClick={handleTapFocus} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '70%', height: 120, border: '2px solid #3d9970', borderRadius: 12, boxShadow: '0 0 0 2000px rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center', color: '#f5f5f5', fontSize: 13 }}>Наведите штрихкод на рамку · коснитесь экрана, чтобы перефокусировать</div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
          {error && <div style={{ fontSize: 13, color: '#f87171', textAlign: 'center' }}>{error}</div>}
          <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>Введите штрихкод вручную (цифры под штрих-кодом на упаковке)</div>
          <input
            type="text" inputMode="numeric" value={manualCode} onChange={e => setManualCode(e.target.value.replace(/\D/g, ''))}
            placeholder="4607034470155"
            style={{ width: '100%', maxWidth: 280, padding: '13px 16px', background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: 12, color: '#f5f5f5', fontSize: 16, textAlign: 'center', fontFamily: 'var(--mono)', outline: 'none', boxSizing: 'border-box' }}
          />
          <button onClick={() => manualCode.length >= 6 && onDetect(manualCode)} disabled={manualCode.length < 6}
            style={{ background: '#3d9970', color: '#000', border: 'none', borderRadius: 12, padding: '13px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: manualCode.length < 6 ? 0.4 : 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Найти
          </button>
        </div>
      )}
    </div>, document.body
  )
}

// ─── PDF REPORT EXPORT (отчёт в PDF через jsPDF с CDN — бесплатно, без npm-зависимости) ───────────────────────────
let _jsPDFPromise = null
function loadJsPDF() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF)
  if (_jsPDFPromise) return _jsPDFPromise
  _jsPDFPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    script.onload = () => resolve(window.jspdf.jsPDF)
    script.onerror = () => reject(new Error('CDN_LOAD_FAILED'))
    document.head.appendChild(script)
  })
  return _jsPDFPromise
}

// Собирает данные за период (кол-во дней назад от сегодня, включая сегодня)
function buildReportData(entries, days, goals) {
  const today = new Date()
  const dateKeys = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    dateKeys.push(d.toISOString().split('T')[0])
  }
  const byDate = entries.reduce((acc, e) => { acc[e.date] = e; return acc }, {})

  const dayRows = dateKeys.map(dateKey => {
    const e = byDate[dateKey] || { foods: [], workouts: [] }
    const foodTotals = (e.foods || []).reduce((a, f) => ({
      cal: a.cal + (f.calories||0), p: a.p + (f.protein||0), fat: a.fat + (f.fat||0), c: a.c + (f.carbs||0),
    }), { cal: 0, p: 0, fat: 0, c: 0 })
    return {
      date: dateKey,
      cal: Math.round(foodTotals.cal), p: Math.round(foodTotals.p), fat: Math.round(foodTotals.fat), c: Math.round(foodTotals.c),
      foodsCount: (e.foods || []).length,
      workouts: (e.workouts || []).map(w => ({
        name: w.name || 'Тренировка', duration: w.duration || 0, exercisesCount: (w.exercisesDetail || w.exercises || []).length,
      })),
    }
  })

  const daysWithFood = dayRows.filter(d => d.foodsCount > 0)
  const avgCal = daysWithFood.length ? Math.round(daysWithFood.reduce((a, d) => a + d.cal, 0) / daysWithFood.length) : 0
  const avgP = daysWithFood.length ? Math.round(daysWithFood.reduce((a, d) => a + d.p, 0) / daysWithFood.length) : 0
  const avgFat = daysWithFood.length ? Math.round(daysWithFood.reduce((a, d) => a + d.fat, 0) / daysWithFood.length) : 0
  const avgC = daysWithFood.length ? Math.round(daysWithFood.reduce((a, d) => a + d.c, 0) / daysWithFood.length) : 0
  const totalWorkouts = dayRows.reduce((a, d) => a + d.workouts.length, 0)
  const totalWorkoutMin = dayRows.reduce((a, d) => a + d.workouts.reduce((b, w) => b + w.duration, 0), 0)

  return { dayRows, avgCal, avgP, avgFat, avgC, totalWorkouts, totalWorkoutMin, daysTracked: daysWithFood.length, goals }
}

async function generateReportPDF(data, periodLabel, userName) {
  const jsPDF = await loadJsPDF()
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 40
  let y = 50

  doc.setFontSize(18); doc.setFont(undefined, 'bold')
  doc.text('Фитнес Дневник — отчёт', marginX, y)
  y += 22
  doc.setFontSize(11); doc.setFont(undefined, 'normal')
  doc.text(`${userName || 'Пользователь'} · ${periodLabel} · сформирован отчёт: ${new Date().toLocaleDateString('ru-RU')}`, marginX, y)
  y += 30

  doc.setDrawColor(220); doc.line(marginX, y, pageWidth - marginX, y)
  y += 24

  doc.setFontSize(14); doc.setFont(undefined, 'bold')
  doc.text('Питание — средние показатели', marginX, y)
  y += 20
  doc.setFontSize(11); doc.setFont(undefined, 'normal')
  doc.text(`Калории: ${data.avgCal} / цель ${data.goals.calories} ккал`, marginX, y); y += 16
  doc.text(`Белки: ${data.avgP}г  ·  Жиры: ${data.avgFat}г  ·  Углеводы: ${data.avgC}г`, marginX, y); y += 16
  doc.text(`Дней с записями питания: ${data.daysTracked} из ${data.dayRows.length}`, marginX, y); y += 26

  doc.setFontSize(14); doc.setFont(undefined, 'bold')
  doc.text('Тренировки — сводка', marginX, y)
  y += 20
  doc.setFontSize(11); doc.setFont(undefined, 'normal')
  doc.text(`Всего тренировок: ${data.totalWorkouts}  ·  Суммарное время: ${data.totalWorkoutMin} мин`, marginX, y)
  y += 30

  doc.setDrawColor(220); doc.line(marginX, y, pageWidth - marginX, y)
  y += 24

  doc.setFontSize(14); doc.setFont(undefined, 'bold')
  doc.text('Детализация по дням', marginX, y)
  y += 8

  const rowH = 16
  const colX = { date: marginX, cal: marginX + 90, pfc: marginX + 150, workout: marginX + 290 }
  const checkPageBreak = () => {
    if (y > 780) { doc.addPage(); y = 50 }
  }

  y += 16
  doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(120)
  doc.text('Дата', colX.date, y)
  doc.text('Ккал', colX.cal, y)
  doc.text('Б/Ж/У, г', colX.pfc, y)
  doc.text('Тренировки', colX.workout, y)
  y += 10
  doc.setDrawColor(230); doc.line(marginX, y, pageWidth - marginX, y)
  y += 12
  doc.setTextColor(30)

  data.dayRows.forEach(d => {
    checkPageBreak()
    doc.setFontSize(9); doc.setFont(undefined, 'normal')
    const dateFmt = new Date(d.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
    doc.text(dateFmt, colX.date, y)
    doc.text(d.foodsCount > 0 ? String(d.cal) : '—', colX.cal, y)
    doc.text(d.foodsCount > 0 ? `${d.p}/${d.fat}/${d.c}` : '—', colX.pfc, y)
    const wkText = d.workouts.length ? d.workouts.map(w => `${w.name} (${w.duration}мин)`).join(', ') : '—'
    const wkLines = doc.splitTextToSize(wkText, pageWidth - marginX - colX.workout)
    doc.text(wkLines, colX.workout, y)
    y += rowH * Math.max(1, wkLines.length)
  })

  return doc
}

// Цвет кружка калорий в зависимости от заполнения (постепенный градиент)
function getCalorieColor(pct) {
  if (pct < 0.6) return '#3d9970'   // зелёный
  if (pct < 0.85) return '#a3e635'  // зелёно-жёлтый
  if (pct < 0.95) return '#fbbf24'  // жёлтый
  if (pct < 1.05) return '#fb923c'  // оранжевый
  return '#ef4444'                   // красный (превышение)
}

// ─── CIRCULAR PROGRESS (тоньше + динамический цвет) ──────────────────────────
function CircularProgress({ value, max, size = 120, stroke = 5, color, dynamicColor = false, children, onClick }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(value / max, 1.2)
  const dash = Math.min(pct, 1) * circ
  const finalColor = dynamicColor ? getCalorieColor(value / max) : (color || '#3d9970')
  return (
    <div onClick={onClick} style={{ position: 'relative', width: size, height: size, flexShrink: 0, cursor: onClick ? 'pointer' : 'default' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#2a2a2a" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={finalColor} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`} style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.4s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  )
}

// ─── ПОДТВЕРЖДЕНИЕ ПЕРЕНОСА ВЕСОВ ────────────────────────────────────────────
function WeightTransferModal({ onConfirm, onDecline, onClose }) {
  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 700, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 500 }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Перенести веса с прошлого раза?</div>
        <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5, marginBottom: 20 }}>Для части упражнений есть сохранённые рабочие веса. Подставить их в подходы или начать с нуля?</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onDecline} style={{ flex: 1, background: 'transparent', color: '#9ca3af', border: '1px solid #2e2e2e', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Нет</button>
          <button onClick={onConfirm} style={{ flex: 1.3, background: '#3d9970', color: '#000', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Да, перенести</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── EDIT FOOD MODAL ─────────────────────────────────────────────────────────
function EditFoodModal({ food, onSave, onClose }) {
  const [name, setName] = useState(food.name)
  const [weight, setWeight] = useState(String(food.weight || 100))
  const [meal, setMeal] = useState(food.meal || 'breakfast')

  const w = food.weight || 100
  const cal100 = w ? (food.calories||0) * 100 / w : 0
  const prot100 = w ? (food.protein||0) * 100 / w : 0
  const fat100 = w ? (food.fat||0) * 100 / w : 0
  const carbs100 = w ? (food.carbs||0) * 100 / w : 0

  const newW = parseFloat(weight) || 100
  const inp = { padding:'10px 14px', background:'#222', border:'1px solid #2e2e2e', borderRadius:10, color:'#f5f5f5', fontSize:14, outline:'none', boxSizing:'border-box', width:'100%' }
  const MEALS = { breakfast:'Завтрак', lunch:'Обед', dinner:'Ужин', snack:'Перекус' }

  return createPortal(
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:600, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#1a1a1a', borderRadius:'20px 20px 0 0', padding:24, width:'100%', maxWidth:500, maxHeight:'80vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <span style={{ fontSize:17, fontWeight:700 }}>Редактировать</span>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, background:'#222', border:'none', color:'#9ca3af', cursor:'pointer', fontSize:18 }}>×</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <div style={{ fontSize:11, color:'#6b7280', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>Название</div>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize:11, color:'#6b7280', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>Вес (г)</div>
            <input style={inp} type="number" value={weight} onChange={e => setWeight(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize:11, color:'#6b7280', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>Приём пищи</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {Object.entries(MEALS).map(([k,v]) => (
                <button key={k} onClick={() => setMeal(k)} style={{ padding:'8px 12px', borderRadius:8, border:`1px solid ${meal===k?'#3d9970':'#2e2e2e'}`, background:meal===k?'rgba(61,153,112,0.1)':'#222', color:meal===k?'#3d9970':'#9ca3af', cursor:'pointer', fontSize:12 }}>{v}</button>
              ))}
            </div>
          </div>
          <div style={{ background:'#222', borderRadius:10, padding:'12px 14px' }}>
            <div style={{ fontSize:11, color:'#6b7280', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Расчёт за {newW}г</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:13, color:'#9ca3af' }}>
              <span style={{ color:'#3d9970', fontWeight:700 }}>{Math.round(cal100*newW/100)} ккал</span>
              {' · '}
              Б{Math.round(prot100*newW/100)} Ж{Math.round(fat100*newW/100)} У{Math.round(carbs100*newW/100)}
            </div>
          </div>
          <button onClick={() => onSave({
            ...food,
            name: name.trim() || food.name,
            weight: newW,
            meal,
            calories: cal100*newW/100,
            protein: prot100*newW/100,
            fat: fat100*newW/100,
            carbs: carbs100*newW/100,
          })} style={{ background:'#3d9970', color:'#000', border:'none', borderRadius:12, padding:'13px', fontSize:14, fontWeight:700, cursor:'pointer', textTransform:'uppercase', letterSpacing:0.5, marginTop:6 }}>
            Сохранить
          </button>
        </div>
      </div>
    </div>, document.body
  )
}

// ─── HOME SCREEN ─────────────────────────────────────────────────────────────
function HomeScreen({ state, dispatch, goTo, name, aiCall }) {
  const [showCalendar, setShowCalendar] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const entry = state.entries.find(e => e.date === today) || { date: today, foods: [], workouts: [] }
  const goals = { calories: state.profile?.calorieGoal || 2200, protein: state.profile?.proteinGoal || 150, fat: state.profile?.fatGoal || 70, carbs: state.profile?.carbGoal || 250 }
  const totals = entry.foods.reduce((a, f) => ({ calories: a.calories + (f.calories||0), protein: a.protein + (f.protein||0), fat: a.fat + (f.fat||0), carbs: a.carbs + (f.carbs||0) }), { calories: 0, protein: 0, fat: 0, carbs: 0 })
  const eaten = Math.round(totals.calories)
  const remaining = Math.max(0, goals.calories - eaten)
  const water = state.water
  const dayName = new Date().toLocaleDateString('ru-RU', { weekday: 'long' })
  const calColor = getCalorieColor(eaten / goals.calories)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 4 }}>
        <div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>Сегодня · {dayName}</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Привет, {name.split(' ')[0]} 👋</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowCalendar(true)} style={{ width: 40, height: 40, borderRadius: 12, background: '#1a1a1a', border: '1px solid #2e2e2e', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Calendar size={18} color="#9ca3af" />
          </button>
          <button style={{ width: 40, height: 40, borderRadius: 12, background: '#1a1a1a', border: '1px solid #2e2e2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={18} color="#9ca3af" />
          </button>
        </div>
      </div>
      {showCalendar && <CombinedCalendar state={state} dispatch={dispatch} aiCall={aiCall} onClose={() => setShowCalendar(false)} />}

      {/* Тренировка сегодня */}
      {entry.workouts?.length > 0 ? (
        <div onClick={() => goTo('workout')} style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #222 100%)', borderRadius: 20, padding: 20, border: '1px solid #2e2e2e', cursor: 'pointer' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Последняя тренировка</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{entry.workouts[entry.workouts.length-1]?.name || 'Тренировка'}</div>
          <div style={{ fontSize: 13, color: '#9ca3af' }}>{entry.workouts[entry.workouts.length-1]?.exercises?.length || 0} упражнений · {entry.workouts[entry.workouts.length-1]?.duration || 0} мин</div>
        </div>
      ) : (
        <div style={{ background: 'linear-gradient(135deg, #1a2a1a 0%, #1a1a1a 100%)', borderRadius: 20, padding: 20, border: '1px solid #2e3a2e' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Сегодня</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#3d9970' }}>Начни тренировку</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>Нет активных тренировок на сегодня</div>
          <button onClick={() => goTo('workout')} style={{ background: '#3d9970', color: '#000', border: 'none', borderRadius: 12, padding: '12px 20px', fontSize: 13, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', cursor: 'pointer' }}>
            Начать тренировку
          </button>
        </div>
      )}

      {/* Калории — кликабельная карточка ведёт в Питание */}
      <div onClick={() => goTo('food')} style={{ background: '#1a1a1a', borderRadius: 20, padding: 20, border: '1px solid #2e2e2e', cursor: 'pointer', transition: 'border-color 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#3d9970'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#2e2e2e'}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Калории</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Цель: {goals.calories} ккал</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <CircularProgress value={eaten} max={goals.calories} size={100} stroke={5} dynamicColor>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: calColor }}>{eaten}</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>ккал</div>
          </CircularProgress>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div><div style={{ fontSize: 11, color: '#6b7280' }}>Съедено</div><div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 600 }}>{eaten}</div></div>
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: '#6b7280' }}>Осталось</div><div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 600, color: '#3d9970' }}>{remaining}</div></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[{ l: 'Белки', v: totals.protein, max: goals.protein, c: '#3d9970' }, { l: 'Жиры', v: totals.fat, max: goals.fat, c: '#fbbf24' }, { l: 'Углев.', v: totals.carbs, max: goals.carbs, c: '#38bdf8' }].map(m => {
                const over = m.max > 0 && m.v > m.max
                const barColor = over ? '#ef4444' : m.c
                return (
                  <div key={m.l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 11, color: over ? '#ef4444' : '#6b7280', width: 40 }}>{m.l}</div>
                    <div style={{ flex: 1, height: 4, background: '#2a2a2a', borderRadius: 99 }}>
                      <div style={{ height: '100%', background: barColor, borderRadius: 99, width: `${Math.min(m.v / m.max * 100, 100)}%`, transition: 'width 0.6s, background 0.3s' }} />
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: barColor, width: 32, textAlign: 'right', fontWeight: over ? 700 : 400 }}>{Math.round(m.v)}г</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Вода */}
      <div style={{ background: '#1a1a1a', borderRadius: 20, padding: 20, border: '1px solid #2e2e2e' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Droplets size={18} color="#38bdf8" />
            <span style={{ fontSize: 15, fontWeight: 600 }}>Вода</span>
          </div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#38bdf8' }}>{water.consumed}/{water.goal} ст.</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {Array.from({ length: water.goal }).map((_, i) => (
            <button key={i} onClick={() => dispatch({ type: 'SET_WATER', val: i < water.consumed ? i : i + 1 })}
              style={{ width: 36, height: 36, borderRadius: 10, border: `2px solid ${i < water.consumed ? '#38bdf8' : '#2e2e2e'}`, background: i < water.consumed ? 'rgba(56,189,248,0.15)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Droplets size={14} color={i < water.consumed ? '#38bdf8' : '#4b5563'} />
            </button>
          ))}
        </div>
        <div style={{ height: 3, background: '#2a2a2a', borderRadius: 99 }}>
          <div style={{ height: '100%', background: '#38bdf8', borderRadius: 99, width: `${water.consumed / water.goal * 100}%`, transition: 'width 0.4s' }} />
        </div>
      </div>
    </div>
  )
}

// ─── FOOD SCREEN ─────────────────────────────────────────────────────────────
const MEALS_MAP = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' }
const MEAL_ICONS = { breakfast: '•', lunch: '•', dinner: '•', snack: '•' }
const MEAL_TIMES = { breakfast: '08:00', lunch: '13:00', dinner: '19:00', snack: '16:00' }

// Автовыбор приёма пищи по времени суток (можно всегда переключить вручную)
function getMealByTime() {
  const h = new Date().getHours()
  if (h >= 5 && h < 11) return 'breakfast'
  if (h >= 11 && h < 16) return 'lunch'
  if (h >= 16 && h < 22) return 'dinner'
  return 'snack'
}

// ─── FOOD DAY DETAIL (просмотр рациона за выбранный день) ─────────────────────
function FoodDayDetail({ date, entry, goals, onClose }) {
  const foods = entry?.foods || []
  const totals = foods.reduce((a, f) => ({ cal: a.cal + (f.calories||0), p: a.p + (f.protein||0), fat: a.fat + (f.fat||0), c: a.c + (f.carbs||0) }), { cal: 0, p: 0, fat: 0, c: 0 })
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: '#0e0e0e', zIndex: 500, overflow: 'auto', padding: '20px 16px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: '#1a1a1a', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={18} color="#9ca3af" />
        </button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Рацион за день</div>
          <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)' }}>{date}</div>
        </div>
      </div>
      <div style={{ background: '#1a1a1a', borderRadius: 20, padding: 20, border: '1px solid #2e2e2e', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <CircularProgress value={totals.cal} max={goals.calories} size={90} stroke={5} dynamicColor>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: getCalorieColor(totals.cal / goals.calories) }}>{Math.round(totals.cal)}</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>ккал</div>
          </CircularProgress>
          <div style={{ flex: 1, display: 'flex', gap: 12 }}>
            {[{ l: 'Белки', v: totals.p, max: goals.protein, c: '#3d9970' }, { l: 'Жиры', v: totals.fat, max: goals.fat, c: '#fbbf24' }, { l: 'Углев.', v: totals.c, max: goals.carbs, c: '#38bdf8' }].map(m => {
              const over = m.max > 0 && m.v > m.max
              return (
                <div key={m.l} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: over ? '#ef4444' : m.c }}>{Math.round(m.v)}г</div>
                  <div style={{ fontSize: 10, color: over ? '#ef4444' : '#6b7280', fontWeight: over ? 700 : 400 }}>{m.l}{over ? ' ⚠' : ''}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {foods.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: '#6b7280', fontSize: 13 }}>В этот день ничего не записано</div>
      ) : Object.entries(MEALS_MAP).map(([mealKey, mealName]) => {
        const items = foods.filter(f => f.meal === mealKey)
        if (!items.length) return null
        const mCal = items.reduce((a, f) => a + (f.calories||0), 0)
        return (
          <div key={mealKey} style={{ background: '#1a1a1a', borderRadius: 16, overflow: 'hidden', border: '1px solid #2e2e2e', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #2a2a2a' }}>
              <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{mealName}</div></div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: '#3d9970', fontWeight: 600 }}>{Math.round(mCal)} ккал</div>
            </div>
            {items.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid #222' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: '#f5f5f5' }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, fontFamily: 'var(--mono)' }}>{item.weight}г · <span style={{ color: '#3d9970' }}>Б{Math.round(item.protein||0)}</span> <span style={{ color: '#fbbf24' }}>Ж{Math.round(item.fat||0)}</span> <span style={{ color: '#38bdf8' }}>У{Math.round(item.carbs||0)}</span></div>
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600 }}>{Math.round(item.calories||0)}</div>
              </div>
            ))}
          </div>
        )
      })}
    </div>, document.body
  )
}

// ─── FOOD CALENDAR (календарь питания) ──────────────────────────────────────────────────────────────
function FoodCalendar({ entries, goals }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [selectedDate, setSelectedDate] = useState(null)
  const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
  const WD = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
  const todayKey = new Date().toISOString().split('T')[0]
  const entriesByDate = useMemo(() => entries.reduce((acc, e) => { acc[e.date] = e; return acc }, {}), [entries])
  const firstDay = new Date(cursor.y, cursor.m, 1)
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  const prevMonth = () => setCursor(c => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 })
  const nextMonth = () => setCursor(c => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 })
  const pad = n => String(n).padStart(2, '0')
  const keyFor = d => `${cursor.y}-${pad(cursor.m + 1)}-${pad(d)}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {selectedDate && (
        <FoodDayDetail date={selectedDate} entry={entriesByDate[selectedDate]} goals={goals} onClose={() => setSelectedDate(null)} />
      )}
      <div style={{ background: '#1a1a1a', borderRadius: 18, padding: 16, border: '1px solid #2e2e2e' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: 8, background: '#222', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={16} color="#9ca3af" /></button>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{MONTHS[cursor.m]} {cursor.y}</span>
          <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: 8, background: '#222', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={16} color="#9ca3af" style={{ transform: 'rotate(180deg)' }} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
          {WD.map(w => <div key={w} style={{ textAlign: 'center', fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{w}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />
            const k = keyFor(d)
            const dayEntry = entriesByDate[k]
            const cal = (dayEntry?.foods || []).reduce((a, f) => a + (f.calories||0), 0)
            const has = cal > 0
            const isToday = k === todayKey
            const isOver = goals.calories > 0 && cal > goals.calories
            return (
              <button key={i} onClick={() => has && setSelectedDate(k)}
                style={{ aspectRatio: '1', borderRadius: 10, border: isToday ? '1px solid #3d9970' : '1px solid transparent', background: isOver ? 'rgba(239,68,68,0.14)' : has ? 'rgba(61,153,112,0.14)' : 'transparent', color: has ? '#f5f5f5' : '#6b7280', cursor: has ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 13, fontWeight: has ? 700 : 400 }}>
                {d}
                {has && <div style={{ fontSize: 8, fontFamily: 'var(--mono)', color: isOver ? '#ef4444' : '#3d9970' }}>{Math.round(cal)}</div>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── RECIPE BUILDER (конструктор блюд из ингредиентов) ────────────────────
function RecipeBuilder({ onSave, aiCall }) {
  const [recipeName, setRecipeName] = useState('')
  const [ingredients, setIngredients] = useState([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [aiLookupLoading, setAiLookupLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2000) }

  const handleSearch = q => {
    setQuery(q)
    if (q.length > 1) setResults(searchFoodSmart(q).slice(0, 8))
    else setResults([])
  }

  const addIngredient = (food) => {
    setIngredients(list => [...list, {
      id: Date.now() + Math.random(),
      name: food.name,
      cal100: food.cal100 || 0,
      prot100: food.prot100 || 0,
      fat100: food.fat100 || 0,
      carbs100: food.carbs100 || 0,
      grams: '100',
    }])
    setQuery(''); setResults([])
  }

  const lookupUnknown = async () => {
    if (!query.trim() || aiLookupLoading) return
    setAiLookupLoading(true)
    try {
      const prompt = `Ты нутрициолог. По названию продукта верни точные КБЖУ на 100г, используя стандартные табличные данные (как в справочниках USDA / базах пищевой ценности). Продукт: "${query}". Верни ТОЛЬКО JSON без markdown, без пояснений: {"name":"название","cal100":число,"prot100":число,"fat100":число,"carbs100":число}`
      const reply = await aiCall([{ role: 'user', content: prompt }], 300)
      const match = reply.replace(/```json|```/g, '').trim().match(/\{[\s\S]*?\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        const food = { name: parsed.name || query, cal100: parseFloat(parsed.cal100)||0, prot100: parseFloat(parsed.prot100)||0, fat100: parseFloat(parsed.fat100)||0, carbs100: parseFloat(parsed.carbs100)||0 }
        saveCachedFood(food)
        addIngredient(food)
        showToast(food.name + ' найден и добавлен')
      } else {
        showToast('Не удалось распознать продукт')
      }
    } catch {
      showToast('Ошибка при поиске продукта')
    }
    setAiLookupLoading(false)
  }

  const updateGrams = (id, grams) => {
    setIngredients(list => list.map(ing => ing.id === id ? { ...ing, grams } : ing))
  }

  const removeIngredient = (id) => {
    setIngredients(list => list.filter(ing => ing.id !== id))
  }

  // Расчёт итогового КБЖУ на 100г готового блюда
  const totals = ingredients.reduce((acc, ing) => {
    const g = parseFloat(ing.grams) || 0
    return {
      weight: acc.weight + g,
      cal: acc.cal + (ing.cal100 || 0) * g / 100,
      prot: acc.prot + (ing.prot100 || 0) * g / 100,
      fat: acc.fat + (ing.fat100 || 0) * g / 100,
      carbs: acc.carbs + (ing.carbs100 || 0) * g / 100,
    }
  }, { weight: 0, cal: 0, prot: 0, fat: 0, carbs: 0 })

  const result100 = totals.weight > 0 ? {
    cal100: totals.cal * 100 / totals.weight,
    prot100: totals.prot * 100 / totals.weight,
    fat100: totals.fat * 100 / totals.weight,
    carbs100: totals.carbs * 100 / totals.weight,
  } : null

  const canSave = recipeName.trim() && ingredients.length > 0 && totals.weight > 0

  const handleSaveRecipe = () => {
    if (!canSave || !result100) return
    onSave({
      name: recipeName.trim(),
      cal100: Math.round(result100.cal100 * 10) / 10,
      prot100: Math.round(result100.prot100 * 10) / 10,
      fat100: Math.round(result100.fat100 * 10) / 10,
      carbs100: Math.round(result100.carbs100 * 10) / 10,
    })
    setRecipeName(''); setIngredients([]); setQuery(''); setResults([])
  }

  const inp = { width: '100%', padding: '13px 16px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 12, color: '#f5f5f5', fontSize: 15, outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {toast && <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: '#3d9970', color: '#000', padding: '10px 22px', borderRadius: 50, fontSize: 13, fontWeight: 700, zIndex: 999, whiteSpace: 'nowrap' }}>{toast}</div>}

      <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 18, border: '1px solid #2e2e2e' }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Конструктор блюд</div>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Добавь ингредиенты с весом — рассчитаем КБЖУ готового блюда на 100г и сохраним для повторного использования</p>
        <input style={inp} placeholder="Название блюда (например «Мамина овсянка»)" value={recipeName} onChange={e => setRecipeName(e.target.value)} />
      </div>

      <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 18, border: '1px solid #2e2e2e' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Добавить ингредиент</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...inp, flex: 1 }} placeholder="Название продукта..." value={query} onChange={e => handleSearch(e.target.value)} />
          <VoiceButton onResult={text => handleSearch(text)} compact />
        </div>
        {results.length > 0 && (
          <div style={{ background: '#222', borderRadius: 12, overflow: 'hidden', border: '1px solid #2e2e2e', marginTop: 8 }}>
            {results.map((food, i) => (
              <button key={i} onClick={() => addIngredient(food)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', background: 'transparent', border: 'none', borderBottom: i < results.length-1 ? '1px solid #2a2a2a' : 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                <div>
                  <div style={{ fontSize: 14, color: '#f5f5f5' }}>{food.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)' }}>{food.cal100} ккал/100г</div>
                </div>
                <Plus size={16} color="#3d9970" />
              </button>
            ))}
          </div>
        )}
        {query.length > 1 && results.length === 0 && (
          <button onClick={lookupUnknown} disabled={aiLookupLoading} style={{ marginTop: 8, width: '100%', background: 'transparent', border: '1px dashed #3d9970', borderRadius: 10, padding: '11px', color: '#3d9970', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: aiLookupLoading ? 0.6 : 1 }}>
            {aiLookupLoading ? '⏳ Ищу...' : `✦ Не нашли «${query}»? Спросить ИИ`}
          </button>
        )}
      </div>

      {ingredients.length > 0 && (
        <div style={{ background: '#1a1a1a', borderRadius: 16, overflow: 'hidden', border: '1px solid #2e2e2e' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2a2a', fontSize: 13, fontWeight: 600, color: '#9ca3af' }}>Ингредиенты ({ingredients.length})</div>
          {ingredients.map(ing => (
            <SwipeToDelete key={ing.id} onDelete={() => removeIngredient(ing.id)} radius={0}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#1a1a1a', borderBottom: '1px solid #222' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: '#f5f5f5' }}>{ing.name}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'var(--mono)' }}>{ing.cal100} ккал/100г</div>
                </div>
                <input
                  type="number"
                  value={ing.grams}
                  onChange={e => updateGrams(ing.id, e.target.value)}
                  style={{ width: 64, padding: '8px 6px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 8, color: '#f5f5f5', fontSize: 13, fontFamily: 'var(--mono)', textAlign: 'center', outline: 'none' }}
                />
                <span style={{ fontSize: 12, color: '#6b7280', width: 12 }}>г</span>
              </div>
            </SwipeToDelete>
          ))}
        </div>
      )}

      {result100 && (
        <div style={{ background: 'rgba(61,153,112,0.07)', border: '1px solid rgba(61,153,112,0.3)', borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#3d9970', marginBottom: 10 }}>Итого на 100г готового блюда</div>
          <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--mono)', fontSize: 14 }}>
            <div><span style={{ color: '#3d9970', fontWeight: 700 }}>{Math.round(result100.cal100)}</span> <span style={{ color: '#6b7280', fontSize: 11 }}>ккал</span></div>
            <div><span style={{ color: '#f5f5f5' }}>Б{Math.round(result100.prot100)}</span></div>
            <div><span style={{ color: '#fbbf24' }}>Ж{Math.round(result100.fat100)}</span></div>
            <div><span style={{ color: '#38bdf8' }}>У{Math.round(result100.carbs100)}</span></div>
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>Общий вес блюда: {Math.round(totals.weight)}г</div>
        </div>
      )}

      <button onClick={handleSaveRecipe} disabled={!canSave} style={{ background: '#3d9970', color: '#000', border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: canSave ? 1 : 0.4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Сохранить рецепт
      </button>
    </div>
  )
}

function FoodScreen({ state, dispatch, aiCall }) {
  const [tab, setTab] = useState('log')
  const [logMode, setLogMode] = useState('list') // 'list' | 'calendar'
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
  const entry = state.entries.find(e => e.date === today) || { date: today, foods: [], workouts: [] }
  const totals = entry.foods.reduce((a, f) => ({ cal: a.cal + (f.calories||0), p: a.p + (f.protein||0), fat: a.fat + (f.fat||0), c: a.c + (f.carbs||0) }), { cal: 0, p: 0, fat: 0, c: 0 })

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2000) }

  const handleSearch = q => {
    setQuery(q); setSelectedFood(null)
    if (q.length > 1) setResults(searchFoodSmart(q).slice(0, 8))
    else setResults([])
  }

  const addFoodItem = (food, g, mealKey) => {
    const w = parseFloat(g) || 100
    dispatch({ type: 'SAVE_ENTRY', entry: { ...entry, foods: [...entry.foods, { id: Date.now(), name: food.name, weight: w, meal: mealKey || meal, calories: (food.cal100||0)*w/100, protein: (food.prot100||0)*w/100, fat: (food.fat100||0)*w/100, carbs: (food.carbs100||0)*w/100, time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) }] } })
    showToast(food.name + ' добавлено')
    setSelectedFood(null); setQuery(''); setResults([]); setGrams('100'); setTab('log')
  }

  const addManual = () => {
    if (!manual.name || !manual.cal) return
    const g = parseFloat(manual.grams) || 100
    saveCachedFood({ name: manual.name, cal100: parseFloat(manual.cal)||0, prot100: parseFloat(manual.p)||0, fat100: parseFloat(manual.f)||0, carbs100: parseFloat(manual.c)||0 })
    dispatch({ type: 'SAVE_ENTRY', entry: { ...entry, foods: [...entry.foods, { id: Date.now(), name: manual.name, weight: g, meal, calories: parseFloat(manual.cal)*g/100, protein: parseFloat(manual.p||0)*g/100, fat: parseFloat(manual.f||0)*g/100, carbs: parseFloat(manual.c||0)*g/100, time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) }] } })
    showToast(manual.name + ' добавлено')
    setManual({ name: '', cal: '', p: '', f: '', c: '', grams: '100' }); setTab('log')
  }

  const removeFood = id => dispatch({ type: 'SAVE_ENTRY', entry: { ...entry, foods: entry.foods.filter(f => f.id !== id) } })

  const updateFood = (updatedFood) => {
    dispatch({ type: 'SAVE_ENTRY', entry: { ...entry, foods: entry.foods.map(f => f.id === updatedFood.id ? updatedFood : f) } })
    showToast('Изменения сохранены')
    setEditingFood(null)
  }

  const handleScan = async file => {
    setScanLoading(true)
    try {
      const b64 = await compressImage(file)
      const res = await fetch('https://api.sudbase.ru/ai-vision', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ b64 }) })
      if (!res.ok) {
        console.error('ai-vision HTTP error:', res.status)
        alert(`Сервер вернул ошибку (${res.status}). Попробуйте ещё раз или добавьте вручную.`)
        return
      }
      const d = await res.json()
      if (d.name) {
        const food = { name: d.name, cal100: d.calories||0, prot100: d.protein||0, fat100: d.fat||0, carbs100: d.carbs||0 }
        saveCachedFood(food)
        setSelectedFood(food); setQuery(d.name)
      } else {
        console.warn('ai-vision: пустой ответ или нет поля name:', d)
        alert(d.error || 'Не удалось распознать продукт на фото. Попробуйте сделать фото чётче или добавьте вручную.')
      }
    } catch (e) {
      console.error('ai-vision fetch error:', e)
      alert('Не удалось отправить фото. Проверьте соединение и попробуйте снова.')
    } finally { setScanLoading(false) }
  }

  const handleBarcodeDetect = async (code) => {
    setShowBarcodeScanner(false)
    setScanLoading(true)
    try {
      const food = await lookupBarcode(code)
      if (food && food.cal100 > 0) {
        saveCachedFood(food)
        setSelectedFood(food); setQuery(food.name)
      } else {
        alert('Продукт по этому штрихкоду не найден в базе. Попробуйте фото или добавьте вручную.')
      }
    } catch (e) {
      console.error('barcode lookup error:', e)
      alert('Не удалось проверить штрихкод. Проверьте соединение и попробуйте снова.')
    } finally { setScanLoading(false) }
  }

  const runAI = async () => {
    if (!aiText.trim()) return
    setAiLoading(true); setAiResults(null)
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
        const parsed = JSON.parse(match[0]).map(item => ({ food: { name: item.name, cal100: parseFloat(item.cal100)||0, prot100: parseFloat(item.prot100)||0, fat100: parseFloat(item.fat100)||0, carbs100: parseFloat(item.carbs100)||0 }, grams: parseFloat(item.grams)||100 }))
        parsed.forEach(item => saveCachedFood(item.food))
        setAiResults(parsed)
      } else setAiResults([])
    } catch { setAiResults([]) }
    setAiLoading(false)
  }

  const inp = { width: '100%', padding: '13px 16px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 12, color: '#f5f5f5', fontSize: 15, outline: 'none', boxSizing: 'border-box' }
  const goals = { calories: state.profile?.calorieGoal || 2200, protein: state.profile?.proteinGoal || 150, fat: state.profile?.fatGoal || 70, carbs: state.profile?.carbGoal || 250 }

  return (
    <div>
      {toast && <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: '#3d9970', color: '#000', padding: '10px 22px', borderRadius: 50, fontSize: 13, fontWeight: 700, zIndex: 999, whiteSpace: 'nowrap' }}>{toast}</div>}
      {editingFood && <EditFoodModal food={editingFood} onSave={updateFood} onClose={() => setEditingFood(null)} />}
      {showBarcodeScanner && <BarcodeScanner onDetect={handleBarcodeDetect} onClose={() => setShowBarcodeScanner(false)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>Питание</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Сегодня</div>
        </div>
      </div>

      <div style={{ background: '#1a1a1a', borderRadius: 20, padding: 20, border: '1px solid #2e2e2e', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <CircularProgress value={totals.cal} max={goals.calories} size={90} stroke={5} dynamicColor>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: getCalorieColor(totals.cal / goals.calories) }}>{Math.round(totals.cal)}</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>ккал</div>
          </CircularProgress>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div><div style={{ fontSize: 11, color: '#6b7280' }}>Съедено</div><div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700 }}>{Math.round(totals.cal)}</div></div>
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: '#6b7280' }}>Осталось</div><div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: '#3d9970' }}>{Math.max(0, goals.calories - Math.round(totals.cal))}</div></div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[{ l: 'Белки', v: totals.p, max: goals.protein, c: '#3d9970' }, { l: 'Жиры', v: totals.fat, max: goals.fat, c: '#fbbf24' }, { l: 'Углев.', v: totals.c, max: goals.carbs, c: '#38bdf8' }].map(m => {
                const over = m.max > 0 && m.v > m.max
                return (
                  <div key={m.l} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: over ? '#ef4444' : m.c }}>{Math.round(m.v)}г</div>
                    <div style={{ fontSize: 10, color: over ? '#ef4444' : '#6b7280', fontWeight: over ? 700 : 400 }}>{m.l}{over ? ' ⚠' : ''}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: 12, padding: 4, gap: 4, marginBottom: 16, border: '1px solid #2e2e2e' }}>
        {[['log', 'Дневник'], ['ai', '✦ Поиск блюда'], ['add', 'Добавить'], ['builder', 'Конструктор']].map(([k, v]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: tab === k ? '#3d9970' : 'transparent', color: tab === k ? '#000' : '#6b7280' }}>{v}</button>
        ))}
      </div>

      {tab === 'log' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: 12, padding: 4, gap: 4, border: '1px solid #2e2e2e' }}>
            {[['list', 'Список'], ['calendar', 'Календарь']].map(([k, v]) => (
              <button key={k} onClick={() => setLogMode(k)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: logMode === k ? '#3d9970' : 'transparent', color: logMode === k ? '#000' : '#6b7280' }}>{v}</button>
            ))}
          </div>
          {logMode === 'calendar' && <FoodCalendar entries={state.entries} goals={goals} />}
          {logMode === 'list' && (
          <>
          {entry.foods.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}></div>
              <div>Ничего не добавлено</div>
            </div>
          )}
          {Object.entries(MEALS_MAP).map(([mealKey, mealName]) => {
            const items = entry.foods.filter(f => f.meal === mealKey)
            if (!items.length) return null
            const mCal = items.reduce((a, f) => a + (f.calories||0), 0)
            return (
              <div key={mealKey} style={{ background: '#1a1a1a', borderRadius: 16, overflow: 'hidden', border: '1px solid #2e2e2e' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #2a2a2a' }}>
                  <span style={{ fontSize: 18 }}>{MEAL_ICONS[mealKey]}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{mealName}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{MEAL_TIMES[mealKey]}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: '#3d9970', fontWeight: 600 }}>{Math.round(mCal)} ккал</div>
                </div>
                {items.map(item => (
                  <SwipeToDelete key={item.id} onDelete={() => removeFood(item.id)}>
                    <div onClick={() => setEditingFood(item)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#1a1a1a', borderBottom: '1px solid #222', cursor: 'pointer' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, color: '#f5f5f5' }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, fontFamily: 'var(--mono)' }}>{item.weight}г · <span style={{ color: '#3d9970' }}>Б{Math.round(item.protein||0)}</span> <span style={{ color: '#fbbf24' }}>Ж{Math.round(item.fat||0)}</span> <span style={{ color: '#38bdf8' }}>У{Math.round(item.carbs||0)}</span></div>
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600 }}>{Math.round(item.calories||0)}</div>
                    </div>
                  </SwipeToDelete>
                ))}
              </div>
            )
          })}
          <button onClick={() => setTab('add')} style={{ background: '#1a1a1a', border: '2px dashed #2e2e2e', borderRadius: 16, padding: '16px', color: '#3d9970', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Plus size={18} /> Добавить приём пищи
          </button>
          </>
          )}
        </div>
      )}

      {tab === 'add' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
            {Object.entries(MEALS_MAP).map(([k, v]) => (
              <button key={k} onClick={() => setMeal(k)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: `1px solid ${meal === k ? '#3d9970' : '#2e2e2e'}`, background: meal === k ? 'rgba(61,153,112,0.1)' : '#1a1a1a', color: meal === k ? '#3d9970' : '#9ca3af', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 500 }}>
                <span>{MEAL_ICONS[k]}</span>{v}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: 12, padding: 3, gap: 3, border: '1px solid #2e2e2e' }}>
            {[['search', 'Поиск'], ['manual', 'Вручную']].map(([k, v]) => (
              <button key={k} onClick={() => setManualMode(k === 'manual')} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, background: (k === 'manual' ? manualMode : !manualMode) ? '#2a2a2a' : 'transparent', color: (k === 'manual' ? manualMode : !manualMode) ? '#f5f5f5' : '#6b7280' }}>{v}</button>
            ))}
          </div>
          {!manualMode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...inp, flex: 1 }} placeholder="Найти продукт..." value={query} onChange={e => handleSearch(e.target.value)} autoFocus />
                <button type="button" onClick={() => setShowBarcodeScanner(true)} style={{ width: 46, height: 46, background: '#222', border: '1px solid #2e2e2e', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }} title="Сканировать штрихкод">
                  <ScanLine size={18} color="#9ca3af" />
                </button>
                <label style={{ width: 46, height: 46, background: '#222', border: '1px solid #2e2e2e', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  {scanLoading ? '⏳' : <Camera size={18} color="#9ca3af" />}
                  <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleScan(e.target.files[0])} />
                </label>
              </div>
              {results.length > 0 && !selectedFood && (
                <div style={{ background: '#1a1a1a', borderRadius: 12, overflow: 'hidden', border: '1px solid #2e2e2e' }}>
                  {results.map((food, i) => (
                    <button key={i} onClick={() => { setSelectedFood(food); setResults([]) }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: i < results.length-1 ? '1px solid #222' : 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                      <div>
                        <div style={{ fontSize: 14, color: '#f5f5f5', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {food.name}
                          {food.isUserCache && <span style={{ fontSize: 9, padding: '2px 6px', background: 'rgba(61,153,112,0.15)', color: '#3d9970', borderRadius: 4, fontWeight: 600 }}>✦ AI</span>}
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)' }}>{food.cal100} ккал/100г</div>
                      </div>
                      <ChevronRight size={16} color="#4b5563" />
                    </button>
                  ))}
                </div>
              )}
              {selectedFood && (
                <div style={{ background: '#1a1a1a', border: '1px solid #3d9970', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Проверьте и поправьте при необходимости</span>
                    <button onClick={() => { setSelectedFood(null); setQuery('') }} style={{ width: 26, height: 26, borderRadius: 7, background: '#222', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>×</button>
                  </div>
                  <input
                    style={{ ...inp, fontWeight: 600, color: '#3d9970' }}
                    value={selectedFood.name}
                    onChange={e => setSelectedFood(f => ({ ...f, name: e.target.value }))}
                    placeholder="Название продукта"
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Ккал/100г</div>
                      <input style={{ ...inp, padding: '9px 12px', fontFamily: 'var(--mono)' }} type="number" inputMode="decimal" value={selectedFood.cal100}
                        onChange={e => setSelectedFood(f => ({ ...f, cal100: e.target.value }))} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Порция, г</div>
                      <input style={{ ...inp, padding: '9px 12px', fontFamily: 'var(--mono)' }} type="number" inputMode="decimal" value={grams}
                        onChange={e => setGrams(e.target.value)} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Белки/100г</div>
                      <input style={{ ...inp, padding: '9px 12px', fontFamily: 'var(--mono)' }} type="number" inputMode="decimal" value={selectedFood.prot100}
                        onChange={e => setSelectedFood(f => ({ ...f, prot100: e.target.value }))} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Жиры/100г</div>
                      <input style={{ ...inp, padding: '9px 12px', fontFamily: 'var(--mono)' }} type="number" inputMode="decimal" value={selectedFood.fat100}
                        onChange={e => setSelectedFood(f => ({ ...f, fat100: e.target.value }))} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Углев/100г</div>
                      <input style={{ ...inp, padding: '9px 12px', fontFamily: 'var(--mono)' }} type="number" inputMode="decimal" value={selectedFood.carbs100}
                        onChange={e => setSelectedFood(f => ({ ...f, carbs100: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#9ca3af' }}>
                    Итого за порцию: <span style={{ color: '#3d9970', fontWeight: 700 }}>{Math.round((parseFloat(selectedFood.cal100)||0)*(parseFloat(grams)||100)/100)} ккал</span>
                  </div>
                  <button onClick={() => {
                    const normalized = {
                      name: selectedFood.name.trim() || 'Продукт',
                      cal100: parseFloat(selectedFood.cal100) || 0,
                      prot100: parseFloat(selectedFood.prot100) || 0,
                      fat100: parseFloat(selectedFood.fat100) || 0,
                      carbs100: parseFloat(selectedFood.carbs100) || 0,
                    }
                    saveCachedFood(normalized)
                    addFoodItem(normalized, grams)
                  }} style={{ background: '#3d9970', color: '#000', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 }}>Добавить</button>
                </div>
              )}
            </div>
          )}
          {manualMode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['Название', 'name', 'text', 'Борщ домашний'], ['Порция (г)', 'grams', 'number', '100'], ['Ккал/100г', 'cal', 'number', '200'], ['Белки/100г', 'p', 'number', '0'], ['Жиры/100г', 'f', 'number', '0'], ['Углев/100г', 'c', 'number', '0']].map(([label, key, type, ph]) => (
                <div key={key}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                  <input style={inp} type={type} placeholder={ph} value={manual[key]} onChange={e => setManual({ ...manual, [key]: e.target.value })} />
                </div>
              ))}
              <button onClick={addManual} disabled={!manual.name || !manual.cal} style={{ background: '#3d9970', color: '#000', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: !manual.name || !manual.cal ? 0.4 : 1, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>Добавить продукт</button>
            </div>
          )}
        </div>
      )}

      {tab === 'ai' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 18, border: '1px solid #2e2e2e' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 20, color: '#3d9970' }}>✦</span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>AI-распознавание еды</span>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Опиши что съел — AI определит КБЖУ. Распознанные продукты сохраняются — в следующий раз поиск найдёт их без AI</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <textarea style={{ ...inp, flex: 1, resize: 'none', minHeight: 80, lineHeight: 1.5 }} placeholder="«200г куриной грудки с гречкой»" value={aiText} onChange={e => setAiText(e.target.value)} rows={3} />
              <VoiceButton onResult={text => setAiText(t => (t ? t + ' ' : '') + text)} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '10px 0' }}>
              {Object.entries(MEALS_MAP).map(([k, v]) => (
                <button key={k} onClick={() => setMeal(k)} style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${meal === k ? '#3d9970' : '#2e2e2e'}`, background: meal === k ? 'rgba(61,153,112,0.1)' : 'transparent', color: meal === k ? '#3d9970' : '#6b7280', fontSize: 12, cursor: 'pointer' }}>{v}</button>
              ))}
            </div>
            <button onClick={runAI} disabled={!aiText.trim() || aiLoading} style={{ background: '#3d9970', color: '#000', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%', opacity: !aiText.trim() || aiLoading ? 0.5 : 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {aiLoading ? '⏳ Анализирую...' : '✦ Распознать'}
            </button>
          </div>
          {aiResults !== null && !aiLoading && (
            <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 16, border: '1px solid #2e2e2e', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {aiResults.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: 14, textAlign: 'center' }}>Не удалось распознать</p>
              ) : (
                <>
                  {aiResults.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: '#222', borderRadius: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{item.food.name}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)', marginTop: 2 }}>{item.grams}г · {Math.round((item.food.cal100||0)*item.grams/100)} ккал</div>
                      </div>
                      <button onClick={() => addFoodItem(item.food, item.grams)} style={{ padding: '8px 14px', borderRadius: 8, background: '#3d9970', border: 'none', color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+</button>
                    </div>
                  ))}
                  <button style={{ background: '#3d9970', color: '#000', border: 'none', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}
                    onClick={() => { const today2 = new Date().toISOString().split('T')[0]; const e2 = state.entries.find(e => e.date === today2) || { date: today2, foods: [], workouts: [] }; const newFoods = aiResults.map(item => { const w = parseFloat(item.grams) || 100; return { id: Date.now() + Math.random(), name: item.food.name, weight: w, meal, calories: (item.food.cal100||0)*w/100, protein: (item.food.prot100||0)*w/100, fat: (item.food.fat100||0)*w/100, carbs: (item.food.carbs100||0)*w/100, time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) }; }); dispatch({ type: 'SAVE_ENTRY', entry: { ...e2, foods: [...e2.foods, ...newFoods] } }); showToast(newFoods.length + ' продуктов добавлено'); setAiText(''); setAiResults(null); setTab('log'); }}>
                    Добавить всё
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'builder' && (
        <RecipeBuilder onSave={(recipe) => {
          saveCachedFood({ name: recipe.name, cal100: recipe.cal100, prot100: recipe.prot100, fat100: recipe.fat100, carbs100: recipe.carbs100 })
          showToast(recipe.name + ' сохранён в базу продуктов')
        }} aiCall={aiCall} />
      )}
    </div>
  )
}

// ─── PROGRESS SCREEN ─────────────────────────────────────────────────────────
function ProgressScreen({ state }) {
  const [reportPeriod, setReportPeriod] = useState(7)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState(null)
  const goals = { calories: state.profile?.calorieGoal || 2200, protein: state.profile?.proteinGoal || 150, fat: state.profile?.fatGoal || 70, carbs: state.profile?.carbGoal || 250 }
  const handleExportPDF = async () => {
    setReportLoading(true); setReportError(null)
    try {
      const data = buildReportData(state.entries, reportPeriod, goals)
      const periodLabel = reportPeriod === 7 ? 'последняя неделя' : 'последний месяц'
      const userName = state.profile?.name || 'Пользователь'
      const doc = await generateReportPDF(data, periodLabel, userName)
      const fileName = `fitdiary-report-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
    } catch (e) {
      console.error('PDF export error:', e)
      setReportError('Не удалось сформировать PDF. Проверьте соединение с интернетом и попробуйте ещё раз.')
    } finally {
      setReportLoading(false)
    }
  }
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
  const weekData = weekDays.map((day, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const e = state.entries.find(en => en.date === d.toISOString().split('T')[0]) || { foods: [] }
    return { day, cal: e.foods.reduce((a, f) => a + (f.calories||0), 0) }
  })
  weekData.push({ day: 'Сг', cal: (state.entries.find(e => e.date === new Date().toISOString().split('T')[0])?.foods || []).reduce((a, f) => a + (f.calories||0), 0), isToday: true })
  const maxCal = Math.max(...weekData.map(d => d.cal), 2200, 1)
  const totalWorkouts = state.entries.reduce((a, e) => a + (e.workouts?.length || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Статистика</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Прогресс</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { icon: '', label: 'Тренировок', value: totalWorkouts },
          { icon: '', label: 'Калорий сж.', value: state.entries.reduce((a, e) => a + (e.workouts||[]).reduce((b, w) => b + (w.caloriesBurned||0), 0), 0) },
          { icon: '', label: 'Дней подряд', value: 0 },
        ].map(s => (
          <div key={s.label} style={{ background: '#1a1a1a', borderRadius: 16, padding: 16, border: '1px solid #2e2e2e', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: '#3d9970', marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#1a1a1a', borderRadius: 20, padding: 20, border: '1px solid #2e2e2e' }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Калории за неделю</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 120 }}>
          {weekData.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ width: '100%', borderRadius: '6px 6px 0 0', height: `${Math.max((d.cal/maxCal)*100, 2)}%`, background: d.isToday ? '#3d9970' : 'rgba(61,153,112,0.25)' }} />
              </div>
              <div style={{ fontSize: 11, color: d.isToday ? '#3d9970' : '#6b7280', fontWeight: d.isToday ? 700 : 400 }}>{d.day}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Экспорт отчёта в PDF */}
      <div style={{ background: '#1a1a1a', borderRadius: 20, padding: 20, border: '1px solid #2e2e2e' }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Экспорт отчёта</div>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>Скачай PDF-отчёт по питанию и тренировкам за выбранный период</p>
        <div style={{ display: 'flex', background: '#222', borderRadius: 12, padding: 4, gap: 4, marginBottom: 14, border: '1px solid #2e2e2e' }}>
          {[[7, 'Неделя'], [30, 'Месяц']].map(([days, label]) => (
            <button key={days} onClick={() => setReportPeriod(days)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: reportPeriod === days ? '#3d9970' : 'transparent', color: reportPeriod === days ? '#000' : '#6b7280' }}>{label}</button>
          ))}
        </div>
        {reportError && <div style={{ fontSize: 13, color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '10px 14px', borderRadius: 10, marginBottom: 12 }}>{reportError}</div>}
        <button onClick={handleExportPDF} disabled={reportLoading} style={{ background: '#3d9970', color: '#000', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, width: '100%', cursor: 'pointer', opacity: reportLoading ? 0.6 : 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {reportLoading ? '✳ Формирую...' : '⤓ Скачать PDF'}
        </button>
      </div>
    </div>
  )
}

// ─── REST TIMER ──────────────────────────────────────────────────────────────
function RestTimer({ duration = 90, onClose, exerciseName, setInfo }) {
  const endTsRef = useRef(Date.now() + duration * 1000)
  const [remaining, setRemaining] = useState(duration)
  const [minimized, setMinimized] = useState(false)
  const onCloseRef = useRef(onClose)
  const closedRef = useRef(false)
  const soundedRef = useRef(false)
  const touchStartY = useRef(null)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const beep = (freq, delay) => setTimeout(() => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain()
        osc.type = 'sine'; osc.frequency.value = freq
        gain.gain.setValueAtTime(0.001, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.connect(gain); gain.connect(ctx.destination)
        osc.start(); osc.stop(ctx.currentTime + 0.45)
      }, delay)
      beep(880, 0)
      beep(1046, 180)
    } catch {}
    try { navigator.vibrate && navigator.vibrate([200, 100, 200]) } catch {}
  }

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.ceil((endTsRef.current - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0 && !closedRef.current) {
        closedRef.current = true
        if (!soundedRef.current) { soundedRef.current = true; playBeep() }
        onCloseRef.current && onCloseRef.current()
      }
    }
    tick()
    const id = setInterval(tick, 250)
    const onVis = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', tick)
    }
  }, [])

  const onTouchStart = e => { touchStartY.current = e.touches[0].clientY }
  const onTouchMove = e => {
    if (touchStartY.current == null || minimized) return
    const dy = e.touches[0].clientY - touchStartY.current
    if (dy < -60) { setMinimized(true); touchStartY.current = null }
  }
  const onTouchEnd = () => { touchStartY.current = null }

  const pct = remaining / duration
  const r = 80, circ = 2 * Math.PI * r
  const dash = pct * circ

  if (minimized) {
    const rMini = 15, circMini = 2 * Math.PI * rMini
    return createPortal(
      <div onClick={() => setMinimized(false)} style={{ position: 'fixed', top: 'calc(10px + env(safe-area-inset-top, 0px))', left: 12, right: 12, zIndex: 500, background: '#1a1a1a', border: '1px solid rgba(61,153,112,0.4)', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
        <div style={{ width: 36, height: 36, flexShrink: 0 }}>
          <svg width={36} height={36} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={18} cy={18} r={rMini} fill="none" stroke="#2a2a2a" strokeWidth={3} />
            <circle cx={18} cy={18} r={rMini} fill="none" stroke="#3d9970" strokeWidth={3} strokeLinecap="round" strokeDasharray={`${pct*circMini} ${circMini}`} />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700 }}>{String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')}</div>
          {exerciseName && <div style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exerciseName}</div>}
        </div>
        <button onClick={(e) => { e.stopPropagation(); closedRef.current = true; onClose() }} style={{ padding: '6px 10px', borderRadius: 8, background: '#222', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>Пропустить</button>
      </div>, document.body
    )
  }

  return createPortal(
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ position: 'fixed', inset: 0, background: '#0e0e0e', zIndex: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <div style={{ position: 'absolute', top: 'calc(14px + env(safe-area-inset-top,0px))', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#333' }} />
        <div style={{ fontSize: 11, color: '#4b5563' }}>Смахните вверх, чтобы свернуть</div>
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#9ca3af' }}>Таймер отдыха</div>
      <div style={{ position: 'relative', width: 200, height: 200 }}>
        <svg width={200} height={200} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={100} cy={100} r={r} fill="none" stroke="#2a2a2a" strokeWidth={5} />
          <circle cx={100} cy={100} r={r} fill="none" stroke="#3d9970" strokeWidth={5} strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`} style={{ transition: 'stroke-dasharray 0.5s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 48, fontWeight: 700, color: remaining > 0 ? '#f5f5f5' : '#3d9970' }}>
            {String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')}
          </div>
        </div>
      </div>
      {exerciseName && <div style={{ textAlign: 'center' }}><div style={{ fontSize: 16, fontWeight: 600 }}>{exerciseName}</div>{setInfo && <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{setInfo}</div>}</div>}
      <button onClick={() => { closedRef.current = true; onClose() }} style={{ background: '#222', color: '#f5f5f5', border: '1px solid #2e2e2e', borderRadius: 14, padding: '14px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Пропустить</button>
    </div>, document.body
  )
}

// ─── WORKOUT COMPLETE ─────────────────────────────────────────────────────────
function WorkoutComplete({ workout, duration, onSave, aiCall }) {
  const [feeling, setFeeling] = useState(null)
  const [comment, setComment] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiText, setAiText] = useState(null)
  const [editMin, setEditMin] = useState(String(Math.max(1, Math.round(duration/60))))
  const totalSets = workout.exercises.reduce((a, e) => a + e.sets.length, 0)
  const totalVolume = workout.exercises.reduce((a, e) => a + e.sets.reduce((s, st) => s + (parseFloat(st.weight)||0) * (parseInt(String(st.reps).split('-').pop())||0), 0), 0)

  const runAnalysis = async () => {
    if (aiLoading || !aiCall) return
    setAiLoading(true)
    try {
      const exLines = workout.exercises.map(e => {
        const sets = e.sets.map((s, i) => `подход ${i+1}: ${s.reps} пов × ${s.weight||0}кг`).join('; ')
        const commentPart = e.comment ? ` | комментарий пользователя: «${e.comment}»` : ''
        return `${e.name} (${e.muscle}): ${sets}${commentPart}`
      }).join('\n')
      const prompt = `Ты — опытный тренер по силовым. Разбери эту ОДНУ завершённую тренировку конкретно и по делу.

ВАЖНО: это ОДНА тренировка из недельного сплит-плана (название: "${workout.name || 'Тренировка'}"). Остальные мышечные группы (например спина и ноги, если их здесь нет) тренируются в ДРУГИЕ дни недели. НЕ ругай за отсутствие других групп — это нормально для сплита. Оценивай ТОЛЬКО те мышцы, что были сегодня.

Длительность: ${Math.round(duration/60)} мин
Общий тоннаж: ${Math.round(totalVolume)} кг
Упражнения и подходы (факт), включая комментарии пользователя, если есть:
${exLines}

Дай анализ на русском (без markdown, простым текстом, 3-5 предложений): 1) оценка проработки именно сегодняшних мышц; 2) по каким упражнениям пора повышать вес (если все повторы закрыты на верхней границе); 3) если пользователь оставил комментарии (например про боль, усталость, лёгкость выполнения) — обязательно учти их в оценке и дай совет с поправкой на это; 4) один совет на следующую такую же тренировку. Конкретно, без воды.`
      const reply = await aiCall([{ role: 'user', content: prompt }], 600)
      const clean = (reply || '').replace(/```/g, '').trim()
      setAiText(clean)
    } catch { setAiText('Не удалось получить анализ, попробуйте позже.') }
    finally { setAiLoading(false) }
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: '#0e0e0e', zIndex: 500, overflow: 'auto', padding: '24px 20px 40px' }}>
      <div style={{ textAlign: 'center', padding: '30px 0 20px' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#3d9970', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Check size={32} color="#000" />
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Тренировка завершена!</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
        {[{ l: 'Упр.', v: workout.exercises.length }, { l: 'Подходы', v: totalSets }, { l: 'Тоннаж', v: Math.round(totalVolume)+'кг' }].map(s => (
          <div key={s.l} style={{ background: '#1a1a1a', borderRadius: 14, padding: 12, border: '1px solid #2e2e2e', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 700, color: '#3d9970', marginBottom: 4 }}>{s.v}</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#1a1a1a', borderRadius: 14, padding: '12px 16px', border: '1px solid #2e2e2e', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Длительность</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>можно поправить вручную, если тренировка уже прошла</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <NumberStepper value={editMin} onChange={setEditMin} step={1} min={1} max={600} placeholder="30" />
          <span style={{ fontSize: 13, color: '#6b7280' }}>мин</span>
        </div>
      </div>

      <button onClick={runAnalysis} disabled={aiLoading} style={{ background: '#1a1a1a', border: '1px solid #3d9970', borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 700, width: '100%', cursor: 'pointer', color: '#3d9970', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5, opacity: aiLoading ? 0.6 : 1 }}>
        <Sparkles size={15} />{aiLoading ? 'Анализирую...' : 'AI-анализ тренировки'}
      </button>
      {aiText && (
        <div style={{ background: 'rgba(61,153,112,0.05)', border: '1px solid rgba(61,153,112,0.25)', borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{aiText}</div>
        </div>
      )}

      <div style={{ background: '#1a1a1a', borderRadius: 20, padding: 20, marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Как прошла тренировка?</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {[['😊', 'Легко'], ['😐', 'Норм'], ['😤', 'Тяжело'], ['🥵', 'Очень']].map(([emoji, label]) => (
            <button key={label} onClick={() => setFeeling(label)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px', borderRadius: 12, border: `1px solid ${feeling === label ? '#3d9970' : '#2e2e2e'}`, background: feeling === label ? 'rgba(61,153,112,0.1)' : '#222', cursor: 'pointer' }}>
              <span style={{ fontSize: 24 }}>{emoji}</span>
              <span style={{ fontSize: 10, color: feeling === label ? '#3d9970' : '#6b7280' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
      <button onClick={() => onSave({ feeling, comment, aiAnalysis: aiText || null, durationOverrideMin: Math.max(1, parseInt(editMin) || Math.round(duration/60)) })} style={{ background: '#3d9970', color: '#000', border: 'none', borderRadius: 14, padding: '16px', fontSize: 15, fontWeight: 700, width: '100%', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>Сохранить</button>
    </div>, document.body
  )
}

// ─── WORKOUT DETAIL (просмотр сохранённой тренировки) ────────────────────────
function WorkoutDetail({ workout, onClose, aiCall, onSaveAnalysis }) {
  const [aiLoading, setAiLoading] = useState(false)
  const [aiText, setAiText] = useState(workout.aiAnalysis || null)
  const [savedMark, setSavedMark] = useState(false)
  const details = workout.exercisesDetail || []
  const totalSets = details.reduce((a, e) => a + (e.sets?.length || 0), 0)
  const totalVolume = details.reduce((a, e) => a + (e.sets || []).reduce((s, st) => s + (parseFloat(st.weight)||0) * (parseInt(String(st.reps).split('-').pop())||0), 0), 0)
  const M_COLORS = { Грудь:'#329063', Спина:'#3b82f6', Ноги:'#f59e0b', Плечи:'#8b5cf6', Трицепс:'#ec4899', Бицепс:'#f97316', Кор:'#06b6d4', Кардио:'#ef4444' }

  const runAnalysis = async () => {
    if (aiLoading || !aiCall) return
    setAiLoading(true)
    try {
      const exLines = details.map(e => {
        const sets = (e.sets || []).map((s, i) => `подход ${i+1}: ${s.reps} пов × ${s.weight||0}кг`).join('; ')
        const commentPart = e.comment ? ` | комментарий пользователя: «${e.comment}»` : ''
        return `${e.name} (${e.muscle}): ${sets}${commentPart}`
      }).join('\n')
      const prompt = `Ты — поддерживающий и опытный тренер по силовым. Разбери эту ОДНУ завершённую тренировку доброжелательно и конструктивно.

ВАЖНО: это ОДНА тренировка из недельного сплит-плана (название: "${workout.name || 'Тренировка'}"). Остальные мышечные группы тренируются в ДРУГИЕ дни. НЕ ругай за отсутствие других групп и НЕ критикуй структуру плана — она задана заранее. Твоя задача — поддержать и подсказать прогрессию.

Длительность: ${workout.duration || 0} мин
Общий тоннаж: ${Math.round(totalVolume)} кг
Упражнения и подходы (факт):
${exLines}

Дай анализ на русском (без markdown, простым текстом, 3-4 предложения): 1) что сделано хорошо (отметь старание); 2) по каким упражнениям пора немного поднять вес (если повторы на верхней границе); 3) один мотивирующий совет на следующий раз. Тон — позитивный и поддерживающий, без критики.`
      const reply = await aiCall([{ role: 'user', content: prompt }], 600)
      const cleaned = (reply || '').replace(/```/g, '').trim()
      setAiText(cleaned)
      // Сохраняем анализ в саму запись тренировки, чтобы не генерировать заново при следующем открытии
      if (onSaveAnalysis) {
        onSaveAnalysis(workout, cleaned)
        setSavedMark(true)
        setTimeout(() => setSavedMark(false), 2000)
      }
    } catch { setAiText('Не удалось получить анализ, попробуйте позже.') }
    finally { setAiLoading(false) }
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: '#0e0e0e', zIndex: 500, overflow: 'auto', padding: '20px 16px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: '#1a1a1a', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={18} color="#9ca3af" />
        </button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{workout.name || 'Тренировка'}</div>
          <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)' }}>{workout.entryDate}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 18 }}>
        {[{ l: 'Время', v: (workout.duration||0)+'м' }, { l: 'Упр.', v: details.length }, { l: 'Подходы', v: totalSets }, { l: 'Тоннаж', v: Math.round(totalVolume)+'кг' }].map(s => (
          <div key={s.l} style={{ background: '#1a1a1a', borderRadius: 14, padding: 12, border: '1px solid #2e2e2e', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 700, color: '#3d9970', marginBottom: 4 }}>{s.v}</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>{s.l}</div>
          </div>
        ))}
      </div>

      <button onClick={runAnalysis} disabled={aiLoading} style={{ background: '#1a1a1a', border: '1px solid #3d9970', borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 700, width: '100%', cursor: 'pointer', color: '#3d9970', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5, opacity: aiLoading ? 0.6 : 1 }}>
        <Sparkles size={15} />{aiLoading ? 'Анализирую...' : savedMark ? '✓ Сохранено' : (aiText ? 'Обновить AI-анализ' : 'AI-анализ тренировки')}
      </button>
      {aiText && (
        <div style={{ background: 'rgba(61,153,112,0.05)', border: '1px solid rgba(61,153,112,0.25)', borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{aiText}</div>
        </div>
      )}

      {details.length > 0 ? details.map((ex, eI) => (
        <div key={eI} style={{ background: '#1a1a1a', borderRadius: 16, overflow: 'hidden', border: '1px solid #2e2e2e', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: '#3d9970', minWidth: 24 }}>{eI+1}</span>
            <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{ex.name}</span>
            <span style={{ padding: '3px 10px', borderRadius: 50, fontSize: 11, color: '#000', background: M_COLORS[ex.muscle] || '#3d9970', fontWeight: 600 }}>{ex.muscle}</span>
          </div>
          <div style={{ padding: '0 16px 10px' }}>
            {(ex.sets || []).map((set, sI) => (
              <div key={sI} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderTop: '1px solid #222' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#6b7280', minWidth: 44 }}>№{sI+1}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, flex: 1 }}>{set.reps} пов</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: '#3d9970' }}>{set.weight || 0} кг</span>
                {set.done && <Check size={14} color="#3d9970" />}
              </div>
            ))}
            {ex.comment && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: '#161616', borderRadius: 8, fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                «{ex.comment}»
              </div>
            )}
          </div>
        </div>
      )) : (
        <div style={{ textAlign: 'center', padding: '30px 0', color: '#6b7280', fontSize: 13 }}>
          Детали этой тренировки не сохранены (старая запись).
        </div>
      )}
    </div>, document.body
  )
}

// ─── EXERCISE DB ─────────────────────────────────────────────────────────────
const EXERCISE_DB = [
  { id:1, name:'Жим штанги лёжа', muscle:'Грудь', type:'compound' },
  { id:2, name:'Жим гантелей лёжа', muscle:'Грудь', type:'compound' },
  { id:3, name:'Жим штанги на наклонной', muscle:'Грудь', type:'compound' },
  { id:4, name:'Разводка гантелей лёжа', muscle:'Грудь', type:'isolation' },
  { id:5, name:'Кроссовер в блоке', muscle:'Грудь', type:'isolation' },
  { id:6, name:'Отжимания от пола', muscle:'Грудь', type:'compound' },
  { id:7, name:'Отжимания на брусьях', muscle:'Грудь', type:'compound' },
  { id:8, name:'Тяга верхнего блока', muscle:'Спина', type:'compound' },
  { id:9, name:'Тяга горизонтального блока', muscle:'Спина', type:'compound' },
  { id:10, name:'Тяга штанги в наклоне', muscle:'Спина', type:'compound' },
  { id:11, name:'Тяга гантели одной рукой', muscle:'Спина', type:'compound' },
  { id:12, name:'Подтягивания', muscle:'Спина', type:'compound' },
  { id:13, name:'Гиперэкстензия', muscle:'Спина', type:'isolation' },
  { id:14, name:'Приседания со штангой', muscle:'Ноги', type:'compound' },
  { id:15, name:'Жим ногами в тренажёре', muscle:'Ноги', type:'compound' },
  { id:16, name:'Разгибание ног', muscle:'Ноги', type:'isolation' },
  { id:17, name:'Сгибание ног', muscle:'Ноги', type:'isolation' },
  { id:18, name:'Выпады с гантелями', muscle:'Ноги', type:'compound' },
  { id:19, name:'Румынская тяга', muscle:'Ноги', type:'compound' },
  { id:20, name:'Подъём на икры стоя', muscle:'Ноги', type:'isolation' },
  { id:21, name:'Жим гантелей сидя', muscle:'Плечи', type:'compound' },
  { id:22, name:'Жим штанги сидя', muscle:'Плечи', type:'compound' },
  { id:23, name:'Махи гантелями в стороны', muscle:'Плечи', type:'isolation' },
  { id:24, name:'Тяга к подбородку', muscle:'Плечи', type:'compound' },
  { id:25, name:'Разгибания на блоке', muscle:'Трицепс', type:'isolation' },
  { id:26, name:'Французский жим лёжа', muscle:'Трицепс', type:'isolation' },
  { id:27, name:'Жим узким хватом', muscle:'Трицепс', type:'compound' },
  { id:28, name:'Подъём штанги на бицепс', muscle:'Бицепс', type:'isolation' },
  { id:29, name:'Подъём гантелей на бицепс', muscle:'Бицепс', type:'isolation' },
  { id:30, name:'Молотки с гантелями', muscle:'Бицепс', type:'isolation' },
  { id:31, name:'Планка', muscle:'Кор', type:'isolation' },
  { id:32, name:'Скручивания', muscle:'Кор', type:'isolation' },
  { id:33, name:'Подъём ног лёжа', muscle:'Кор', type:'isolation' },
]

// ─── PLAN CONSTANTS ───────────────────────────────────────────────────────────
const PLAN_KEY = 'workout-plan-v4-pro'
const TEMPLATES_KEY = 'workout-templates-v1'

// Чтение/запись пользовательских шаблонов тренировок
function getTemplates() {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}
function saveTemplatesList(list) {
  try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list)) } catch (e) { console.warn('saveTemplates error', e) }
}
const LEVEL_RU = { beginner: 'новичок', amateur: 'любитель', advanced: 'продвинутый', professional: 'профессионал' }
const GOAL_RU = { weight_loss: 'fat_loss', muscle_gain: 'muscle_gain', maintenance: 'maintenance', endurance: 'maintenance', strength: 'strength', health: 'maintenance' }
const DAY_COLORS_PLAN = ['#3d9970', '#38bdf8', '#fbbf24', '#3d9970', '#38bdf8', '#6b7280', '#6b7280']

const EN_TO_RU = {
  'Monday':'Понедельник','Tuesday':'Вторник','Wednesday':'Среда','Thursday':'Четверг',
  'Friday':'Пятница','Saturday':'Суббота','Sunday':'Воскресенье',
  'Rest':'Отдых','Rest Day':'День отдыха','Recovery':'Восстановление',
  'chest':'Грудь','back':'Спина','legs':'Ноги','shoulders':'Плечи',
  'triceps':'Трицепс','biceps':'Бицепс','core':'Кор','abs':'Пресс','cardio':'Кардио',
  'glutes':'Ягодицы','hamstrings':'Бицепс бедра','quadriceps':'Квадрицепс','calves':'Икры','arms':'Руки',
  'full body':'Всё тело','full_body':'Фулбоди','upper_lower':'Верх/Низ','push_pull_legs':'Жим/Тяга/Ноги',
}
function translateStr(str) {
  if (!str || typeof str !== 'string') return str
  const exact = Object.keys(EN_TO_RU).find(k => k.toLowerCase() === str.toLowerCase())
  if (exact) return EN_TO_RU[exact]
  let result = str
  Object.entries(EN_TO_RU).forEach(([en, ru]) => { result = result.replace(new RegExp(`\\b${en}\\b`, 'gi'), ru) })
  return result
}
function translatePlan(parsed) {
  if (!parsed?.plan?.days) return parsed
  return {
    ...parsed,
    plan: {
      ...parsed.plan,
      split: translateStr(parsed.plan.split),
      days: parsed.plan.days.map(day => ({
        ...day,
        name: translateStr(day.name),
        muscles: (day.muscles||[]).map(translateStr),
        exercises: (day.exercises||[]).map(ex => ({
          ...ex,
          name: translateStr(ex.name),
          muscle: translateStr(ex.muscle),
          reps: normReps(ex.reps),
        }))
      }))
    }
  }
}

function validatePlanQuality(plan, minExercisesPerDay) {
  if (!plan?.plan?.days || !Array.isArray(plan.plan.days)) {
    return { ok: false, reason: 'Структура повреждена' }
  }
  const trainingDays = plan.plan.days.filter(d => d.exercises && d.exercises.length > 0)
  if (trainingDays.length === 0) return { ok: false, reason: 'Нет тренировочных дней' }
  for (const day of trainingDays) {
    if (day.exercises.length < minExercisesPerDay) {
      return { ok: false, reason: `В дне "${day.name}" только ${day.exercises.length} упражнений` }
    }
  }
  return { ok: true }
}

// ─── TECHNIQUE MODAL (окно с техникой упражнения) ─────────────────────﻿
function TechniqueModal({ name, muscle, onClose }) {
  const tech = getTechnique(name)
  const M_COLORS = { Грудь:'#329063', Спина:'#3b82f6', Ноги:'#f59e0b', Плечи:'#8b5cf6', Трицепс:'#ec4899', Бицепс:'#f97316', Кор:'#06b6d4', Кардио:'#ef4444' }
  return createPortal(
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:600, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#0e0e0e', borderRadius:'20px 20px 0 0', padding:'20px 16px calc(20px + env(safe-area-inset-bottom, 0px))', width:'100%', maxWidth:500, maxHeight:'85vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:18 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:18, fontWeight:700, color:'#f5f5f5' }}>{name}</div>
            {muscle && <span style={{ display:'inline-block', marginTop:6, padding:'2px 10px', borderRadius:50, fontSize:11, color:'#000', background:M_COLORS[muscle]||'#3d9970', fontWeight:600 }}>{muscle}</span>}
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, background:'#1a1a1a', border:'1px solid #2e2e2e', color:'#9ca3af', cursor:'pointer', fontSize:18, flexShrink:0 }}>×</button>
        </div>

        {tech ? (
          <>
            <div style={{ background:'#1a1a1a', border:'1px solid #2e2e2e', borderRadius:16, padding:16, marginBottom:12 }}>
              <div style={{ fontSize:11, color:'#6b7280', textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>Как выполнять</div>
              <ol style={{ margin:0, paddingLeft:20, color:'#d1d5db', fontSize:14, lineHeight:1.75 }}>
                {tech.steps.map((s, i) => <li key={i} style={{ marginBottom:4 }}>{s}</li>)}
              </ol>
            </div>

            {tech.mistakes?.length > 0 && (
              <div style={{ background:'#1a1a1a', border:'1px solid #2e2e2e', borderRadius:16, padding:16, marginBottom:12 }}>
                <div style={{ fontSize:11, color:'#6b7280', textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>Частые ошибки</div>
                <ul style={{ margin:0, paddingLeft:20, color:'#d1d5db', fontSize:14, lineHeight:1.75 }}>
                  {tech.mistakes.map((m, i) => <li key={i} style={{ marginBottom:4 }}>{m}</li>)}
                </ul>
              </div>
            )}

            {tech.safety && (
              <div style={{ display:'flex', gap:10, alignItems:'flex-start', background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.25)', borderRadius:14, padding:'14px 16px' }}>
                <AlertTriangle size={18} color="#fbbf24" style={{ flexShrink:0, marginTop:1 }} />
                <div style={{ fontSize:13, lineHeight:1.6, color:'#fbd97a' }}>{tech.safety}</div>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'30px 0', color:'#6b7280', fontSize:14 }}>
            Описание техники для этого упражнения пока готовится.
          </div>
        )}
      </div>
    </div>, document.body
  )
}

// ─── WORKOUT CALENDAR (календарь тренировок) ───────────────────────────────────
function WorkoutCalendar({ workoutsByDate, onPickWorkout, onDeleteWorkout }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
  const WD = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
  const todayKey = new Date().toISOString().split('T')[0]

  const firstDay = new Date(cursor.y, cursor.m, 1)
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7 // понедельник = 0
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const prevMonth = () => setCursor(c => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 })
  const nextMonth = () => setCursor(c => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 })

  const [selected, setSelected] = useState(null)
  const pad = n => String(n).padStart(2, '0')
  const keyFor = d => `${cursor.y}-${pad(cursor.m + 1)}-${pad(d)}`
  const selectedWorkouts = selected ? (workoutsByDate[selected] || []) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: '#1a1a1a', borderRadius: 18, padding: 16, border: '1px solid #2e2e2e' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: 8, background: '#222', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={16} color="#9ca3af" /></button>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{MONTHS[cursor.m]} {cursor.y}</span>
          <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: 8, background: '#222', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={16} color="#9ca3af" style={{ transform: 'rotate(180deg)' }} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
          {WD.map(w => <div key={w} style={{ textAlign: 'center', fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{w}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />
            const k = keyFor(d)
            const has = (workoutsByDate[k] || []).length > 0
            const isToday = k === todayKey
            const isSel = k === selected
            return (
              <button key={i} onClick={() => has && setSelected(isSel ? null : k)}
                style={{ aspectRatio: '1', borderRadius: 10, border: isToday ? '1px solid #3d9970' : '1px solid transparent', background: isSel ? '#3d9970' : has ? 'rgba(61,153,112,0.14)' : 'transparent', color: isSel ? '#000' : has ? '#f5f5f5' : '#6b7280', cursor: has ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 13, fontWeight: has ? 700 : 400, position: 'relative' }}>
                {d}
                {has && <div style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? '#000' : '#3d9970' }} />}
              </button>
            )
          })}
        </div>
      </div>
      {selected && selectedWorkouts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#6b7280', paddingLeft: 4 }}>{selected}</div>
          {selectedWorkouts.map(w => (
            <SwipeToDelete key={w.id} onDelete={() => onDeleteWorkout && onDeleteWorkout(w.id, w.entryDate)} confirmText="Удалить эту тренировку?">
              <button onClick={() => onPickWorkout(w)} style={{ background: '#1a1a1a', padding: 16, border: '1px solid #2e2e2e', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(61,153,112,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Dumbbell size={20} color="#3d9970" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{w.name || 'Тренировка'}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)' }}>{w.duration} мин{w.aiAnalysis ? ' · ✓ анализ' : ''}</div>
                </div>
                <ChevronRight size={16} color="#4b5563" />
              </button>
            </SwipeToDelete>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── WORKOUT SCREEN ───────────────────────────────────────────────────────────
// Фоновый хук: таймер на основе реальных меток времени (переживает сворачивание вкладки/экрана)
function useBackgroundTimer(running, resetKey) {
  const [elapsed, setElapsed] = useState(0)
  const anchor = useRef({ startedAt: null, base: 0 })

  useEffect(() => {
    anchor.current = { startedAt: null, base: 0 }
    setElapsed(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  useEffect(() => {
    if (!running) {
      if (anchor.current.startedAt) {
        anchor.current.base += Math.floor((Date.now() - anchor.current.startedAt) / 1000)
        anchor.current.startedAt = null
      }
      return
    }
    anchor.current.startedAt = Date.now()
    const tick = () => {
      setElapsed(anchor.current.base + Math.floor((Date.now() - anchor.current.startedAt) / 1000))
    }
    tick()
    const id = setInterval(tick, 1000)
    const onVis = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', tick)
    }
  }, [running])

  const setManual = (sec) => {
    anchor.current = { startedAt: running ? Date.now() : null, base: sec }
    setElapsed(sec)
  }

  return [elapsed, setManual]
}

// Фоновый хук: держит экран включённым, пока active===true (например, пока открыт экран активной тренировки)
function useWakeLock(active) {
  const lockRef = useRef(null)
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return
    let released = false
    const request = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (released) { lock.release().catch(() => {}); return }
        lockRef.current = lock
      } catch {}
    }
    request()
    const onVis = () => { if (document.visibilityState === 'visible' && !lockRef.current) request() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVis)
      if (lockRef.current) { lockRef.current.release().catch(() => {}); lockRef.current = null }
    }
  }, [active])
}

// ─── REMINDERS (локальные уведомления через Notification API — бесплатно, без сервера) ───────────────────────────
// Работает, пока открыта вкладка/приложение свёрнуто (не полностью закрыто). Требует HTTPS и разрешения пользователя.
const REMINDERS_KEY = 'reminders-settings-v1'
const REMINDERS_LOG_KEY = 'reminders-firedlog-v1'

function getReminderSettings() {
  try {
    const raw = localStorage.getItem(REMINDERS_KEY)
    if (!raw) return { enabled: false, meals: { breakfast: '08:00', lunch: '13:00', dinner: '19:00' }, workout: { enabled: false, time: '18:00' } }
    return JSON.parse(raw)
  } catch { return { enabled: false, meals: { breakfast: '08:00', lunch: '13:00', dinner: '19:00' }, workout: { enabled: false, time: '18:00' } } }
}
function saveReminderSettings(settings) {
  try { localStorage.setItem(REMINDERS_KEY, JSON.stringify(settings)) } catch {}
}

function useReminders() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return

    const checkAndFire = () => {
      const settings = getReminderSettings()
      if (!settings.enabled || Notification.permission !== 'granted') return

      const now = new Date()
      const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
      const todayKey = now.toISOString().split('T')[0]

      let log = {}
      try { log = JSON.parse(localStorage.getItem(REMINDERS_LOG_KEY) || '{}') } catch {}
      if (log.date !== todayKey) log = { date: todayKey, fired: [] }

      const fire = (id, title, body) => {
        if (log.fired.includes(id)) return
        try { new Notification(title, { body, icon: '/icon-192.png', tag: id }) } catch {}
        log.fired.push(id)
      }

      const MEAL_LABELS = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин' }
      Object.entries(settings.meals || {}).forEach(([key, time]) => {
        if (time === hhmm) fire(`meal-${key}-${todayKey}`, '🍽️ Пора поесть', `${MEAL_LABELS[key] || 'Приём пищи'} — не забудьте записать в дневник`)
      })
      if (settings.workout?.enabled && settings.workout.time === hhmm) {
        fire(`workout-${todayKey}`, '💪 Пора тренироваться', 'Не забудьте про тренировку по плану сегодня')
      }

      try { localStorage.setItem(REMINDERS_LOG_KEY, JSON.stringify(log)) } catch {}
    }

    checkAndFire()
    const id = setInterval(checkAndFire, 30000)
    const onVis = () => { if (document.visibilityState === 'visible') checkAndFire() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
}

// ─── COMBINED CALENDAR (единый календарь: тренировки + питание, открывается с главного экрана) ──────────────────────────────────────────────────────────────────
function CombinedCalendar({ state, dispatch, aiCall, onClose }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [selectedDate, setSelectedDate] = useState(null)
  const [viewWorkout, setViewWorkout] = useState(null)
  const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
  const WD = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
  const todayKey = new Date().toISOString().split('T')[0]
  const goals = { calories: state.profile?.calorieGoal || 2200, protein: state.profile?.proteinGoal || 150, fat: state.profile?.fatGoal || 70, carbs: state.profile?.carbGoal || 250 }
  const entriesByDate = useMemo(() => state.entries.reduce((acc, e) => { acc[e.date] = e; return acc }, {}), [state.entries])

  const firstDay = new Date(cursor.y, cursor.m, 1)
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  const prevMonth = () => setCursor(c => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 })
  const nextMonth = () => setCursor(c => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 })
  const pad = n => String(n).padStart(2, '0')
  const keyFor = d => `${cursor.y}-${pad(cursor.m + 1)}-${pad(d)}`

  const removeWorkout = (wId, entryDate) => {
    const targetEntry = state.entries.find(e => e.date === entryDate)
    if (!targetEntry) return
    dispatch({ type: 'SAVE_ENTRY', entry: { ...targetEntry, workouts: (targetEntry.workouts||[]).filter(w => w.id !== wId) } })
  }
  const saveWorkoutAnalysis = (workout, text) => {
    const targetEntry = state.entries.find(e => e.date === workout.entryDate)
    if (!targetEntry) return
    dispatch({ type: 'SAVE_ENTRY', entry: { ...targetEntry, workouts: (targetEntry.workouts||[]).map(w => w.id === workout.id ? { ...w, aiAnalysis: text } : w) } })
    if (viewWorkout && viewWorkout.id === workout.id) setViewWorkout({ ...viewWorkout, aiAnalysis: text })
  }

  const selectedEntry = selectedDate ? entriesByDate[selectedDate] : null
  const selectedFoods = selectedEntry?.foods || []
  const selectedWorkouts = (selectedEntry?.workouts || []).map(w => ({ ...w, entryDate: selectedDate }))
  const foodTotals = selectedFoods.reduce((a, f) => ({ cal: a.cal + (f.calories||0), p: a.p + (f.protein||0), fat: a.fat + (f.fat||0), c: a.c + (f.carbs||0) }), { cal: 0, p: 0, fat: 0, c: 0 })

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: '#0e0e0e', zIndex: 500, overflow: 'auto', padding: '20px 16px 40px' }}>
      {viewWorkout && <WorkoutDetail workout={viewWorkout} onClose={() => setViewWorkout(null)} aiCall={aiCall} onSaveAnalysis={saveWorkoutAnalysis} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: '#1a1a1a', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={18} color="#9ca3af" />
        </button>
        <span style={{ fontSize: 18, fontWeight: 700 }}>Календарь</span>
      </div>

      <div style={{ background: '#1a1a1a', borderRadius: 18, padding: 16, border: '1px solid #2e2e2e', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: 8, background: '#222', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={16} color="#9ca3af" /></button>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{MONTHS[cursor.m]} {cursor.y}</span>
          <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: 8, background: '#222', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={16} color="#9ca3af" style={{ transform: 'rotate(180deg)' }} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
          {WD.map(w => <div key={w} style={{ textAlign: 'center', fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{w}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />
            const k = keyFor(d)
            const dayEntry = entriesByDate[k]
            const cal = (dayEntry?.foods || []).reduce((a, f) => a + (f.calories||0), 0)
            const hasFood = cal > 0
            const hasWorkout = (dayEntry?.workouts || []).length > 0
            const isToday = k === todayKey
            const isSel = k === selectedDate
            const isOver = goals.calories > 0 && cal > goals.calories
            const canOpen = hasFood || hasWorkout
            return (
              <button key={i} onClick={() => canOpen && setSelectedDate(isSel ? null : k)}
                style={{ aspectRatio: '1', borderRadius: 10, border: isToday ? '1px solid #3d9970' : '1px solid transparent', background: isSel ? '#3d9970' : isOver ? 'rgba(239,68,68,0.14)' : hasFood ? 'rgba(61,153,112,0.14)' : 'transparent', color: isSel ? '#000' : canOpen ? '#f5f5f5' : '#6b7280', cursor: canOpen ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 13, fontWeight: canOpen ? 700 : 400, position: 'relative' }}>
                {d}
                {hasFood && <div style={{ fontSize: 8, fontFamily: 'var(--mono)', color: isSel ? '#000' : isOver ? '#ef4444' : '#3d9970' }}>{Math.round(cal)}</div>}
                {hasWorkout && <div style={{ position: 'absolute', top: 3, right: 3, width: 5, height: 5, borderRadius: '50%', background: isSel ? '#000' : '#38bdf8' }} />}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a2a2a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(61,153,112,0.5)' }} />
            <span style={{ fontSize: 11, color: '#6b7280' }}>Питание</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8' }} />
            <span style={{ fontSize: 11, color: '#6b7280' }}>Тренировка</span>
          </div>
        </div>
      </div>

      {selectedDate && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, color: '#6b7280', paddingLeft: 4, fontFamily: 'var(--mono)' }}>{selectedDate}</div>

          {selectedFoods.length > 0 && (
            <div style={{ background: '#1a1a1a', borderRadius: 18, padding: 18, border: '1px solid #2e2e2e' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                <CircularProgress value={foodTotals.cal} max={goals.calories} size={64} stroke={4} dynamicColor>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: getCalorieColor(foodTotals.cal / goals.calories) }}>{Math.round(foodTotals.cal)}</div>
                </CircularProgress>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[{ l: 'Б', v: foodTotals.p, max: goals.protein, c: '#3d9970' }, { l: 'Ж', v: foodTotals.fat, max: goals.fat, c: '#fbbf24' }, { l: 'У', v: foodTotals.c, max: goals.carbs, c: '#38bdf8' }].map(m => {
                    const over = m.max > 0 && m.v > m.max
                    return <div key={m.l} style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: over ? '#ef4444' : m.c }}>{Math.round(m.v)}г</div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>{m.l}</div>
                    </div>
                  })}
                </div>
              </div>
              {Object.entries(MEALS_MAP).map(([mealKey, mealName]) => {
                const items = selectedFoods.filter(f => f.meal === mealKey)
                if (!items.length) return null
                return (
                  <div key={mealKey} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 6 }}>{mealName}</div>
                    {items.map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: '1px solid #222' }}>
                        <div style={{ flex: 1, fontSize: 13, color: '#d1d5db' }}>{item.name}</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#6b7280' }}>{Math.round(item.calories||0)} ккал</div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}

          {selectedWorkouts.map(w => (
            <SwipeToDelete key={w.id} onDelete={() => removeWorkout(w.id, w.entryDate)} confirmText="Удалить эту тренировку?">
              <button onClick={() => setViewWorkout(w)} style={{ background: '#1a1a1a', padding: 16, border: '1px solid #2e2e2e', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Dumbbell size={20} color="#38bdf8" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{w.name || 'Тренировка'}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)' }}>{w.duration} мин{w.aiAnalysis ? ' · ✓ анализ' : ''}</div>
                </div>
                <ChevronRight size={16} color="#4b5563" />
              </button>
            </SwipeToDelete>
          ))}

          {selectedFoods.length === 0 && selectedWorkouts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#6b7280', fontSize: 13 }}>В этот день ничего не записано</div>
          )}
        </div>
      )}
    </div>, document.body
  )
}

function WorkoutScreen({ state, dispatch, aiCall }) {
  const [view, setView] = useState('list')
  const [wk, setWk] = useState({ name: '', exercises: [] })
  const [exSearch, setExSearch] = useState('')
  const [timerResetKey, setTimerResetKey] = useState(0)
  const [running, setRunning] = useState(false)
  const [timer, setTimer] = useBackgroundTimer(running, timerResetKey)
  const resetTimer = () => { setTimerResetKey(k => k + 1); setTimer(0) }
  useWakeLock(view === 'active')

  // ─── Автосохранение черновика тренировки: переживает обновление страницы/сворачивание ────────────
  const draftRestoredRef = useRef(false)
  useEffect(() => {
    if (draftRestoredRef.current) return
    draftRestoredRef.current = true
    try {
      const raw = localStorage.getItem(WK_DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw)
      if (!draft?.wk?.exercises?.length) return
      if (Date.now() - (draft.savedAt || 0) > 24 * 60 * 60 * 1000) { localStorage.removeItem(WK_DRAFT_KEY); return }
      setWk(draft.wk)
      if (draft.view === 'active') {
        setTimer(draft.elapsedSec || 0)
        setRunning(true)
        setView('active')
      } else {
        setView('builder')
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (view !== 'builder' && view !== 'active') return
    if (!wk.exercises.length) { clearDraft(); return }
    try { localStorage.setItem(WK_DRAFT_KEY, JSON.stringify({ wk, view, elapsedSec: timer, savedAt: Date.now() })) } catch {}
  }, [wk, view, timer])

  const clearDraft = () => { try { localStorage.removeItem(WK_DRAFT_KEY) } catch {} }
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [restInfo, setRestInfo] = useState({ exercise: '', setInfo: '', duration: 90 })
  const [showComplete, setShowComplete] = useState(false)
  const [swapFor, setSwapFor] = useState(null)
  const [planDayIdx, setPlanDayIdx] = useState(null)
  const [planSaved, setPlanSaved] = useState(false)
  const [viewWorkout, setViewWorkout] = useState(null)
  const [techFor, setTechFor] = useState(null) // {name, muscle} — показ техники
  const [histMode, setHistMode] = useState('list') // 'list' | 'calendar'
  const [templates, setTemplates] = useState(() => getTemplates())
  const [tplSaved, setTplSaved] = useState(false)
  const [pickerFor, setPickerFor] = useState(null) // { eI, sI } — какой подход сейчас редактируется в колёсах
  const [pendingLoad, setPendingLoad] = useState(null) // { type: 'template'|'plan', tpl?, day?, dayIdx?, mode } — ждём ответа "перенести веса?"
  const timerRef = useRef(null)

  const today = new Date().toISOString().split('T')[0]
  const entry = state.entries.find(e => e.date === today) || { date: today, foods: [], workouts: [] }
  const allWorkouts = state.entries.flatMap(e => (e.workouts||[]).map(w => ({ ...w, entryDate: e.date }))).sort((a,b) => b.entryDate.localeCompare(a.entryDate))
  const workoutsByDate = allWorkouts.reduce((acc, w) => { (acc[w.entryDate] = acc[w.entryDate] || []).push(w); return acc }, {})
  const workoutPlace = (() => { try { return localStorage.getItem('workout-place-v1') || 'gym' } catch { return 'gym' } })()
  const filteredEx = FULL_EXERCISE_DB
    .filter(e => workoutPlace === 'both' || e.place === 'both' || e.place === workoutPlace)
    .filter(e => e.name.toLowerCase().includes(exSearch.toLowerCase()) || e.muscle.toLowerCase().includes(exSearch.toLowerCase()))
    .sort((a, b) => {
      if (a.muscle !== b.muscle) return MUSCLE_GROUPS.indexOf(a.muscle) - MUSCLE_GROUPS.indexOf(b.muscle)
      return EFF_ORDER[a.eff] - EFF_ORDER[b.eff]
    })

  const addEx = ex => setWk(w => {
    const saved = suggestWeightFor(ex.name)
    const startWeight = saved?.weight ? String(saved.weight) : '0'
    return { ...w, exercises: [...w.exercises, { uid: uid(), exerciseId: ex.id, name: ex.name, muscle: ex.muscle, type: ex.type, targetReps: '8-12', restSec: getDefaultRestSec(ex.muscle), suggestedWeight: saved?.suggestedWeight || null, sets: [{ id: uid(), reps: '8-12', weight: startWeight, done: false }] }] }
  })
  const updateRest = (eI, delta) => setWk(w => {
    const exs = [...w.exercises]
    const cur = exs[eI].restSec || getDefaultRestSec(exs[eI].muscle)
    const next = Math.max(15, Math.min(300, cur + delta))
    exs[eI] = { ...exs[eI], restSec: next }
    return { ...w, exercises: exs }
  })
  const updateSet = (eI, sI, field, val) => setWk(w => { const exs = [...w.exercises]; exs[eI] = { ...exs[eI], sets: exs[eI].sets.map((s,i) => i===sI ? {...s,[field]:val} : s) }; return {...w, exercises: exs} })
  const removeSet = (eI, sI) => setWk(w => {
    const exs = [...w.exercises]
    if (exs[eI].sets.length <= 1) return w // не даём удалить последний подход
    exs[eI] = { ...exs[eI], sets: exs[eI].sets.filter((_, i) => i !== sI) }
    return { ...w, exercises: exs }
  })
  const moveExercise = (eI, dir) => setWk(w => {
    const exs = [...w.exercises]
    const j = eI + dir
    if (j < 0 || j >= exs.length) return w
    ;[exs[eI], exs[j]] = [exs[j], exs[eI]]
    return { ...w, exercises: exs }
  })
  const updateComment = (eI, val) => setWk(w => { const exs = [...w.exercises]; exs[eI] = { ...exs[eI], comment: val }; return { ...w, exercises: exs } })
  const addSet = eI => setWk(w => { const exs = [...w.exercises]; const prev = exs[eI].sets[exs[eI].sets.length-1]; exs[eI] = { ...exs[eI], sets: [...exs[eI].sets, {...prev, id: uid(), done:false}] }; return {...w, exercises: exs} })
  const removeEx = eI => setWk(w => ({ ...w, exercises: w.exercises.filter((_,i) => i!==eI) }))
  const replaceEx = (eI, newExercise) => setWk(w => {
    const exs = [...w.exercises]
    exs[eI] = { ...exs[eI], exerciseId: newExercise.id, name: newExercise.name, muscle: newExercise.muscle, type: newExercise.type }
    return { ...w, exercises: exs }
  })
  // Принять предложение поднять вес: проставить новый вес во все подходы
  const applyProgression = (eI) => setWk(w => {
    const exs = [...w.exercises]
    const ex = exs[eI]
    if (!ex.suggestedWeight) return w
    const nw = acceptProgression(ex.name) || ex.suggestedWeight
    exs[eI] = { ...ex, suggestedWeight: null, sets: ex.sets.map(s => ({ ...s, weight: String(nw) })) }
    return { ...w, exercises: exs }
  })
  // Сохранить текущие упражнения буджета обратно в AI-план (в тот же день)
  const saveToPlan = () => {
    if (planDayIdx === null) return
    try {
      const raw = localStorage.getItem(PLAN_KEY)
      if (!raw) return
      const plan = JSON.parse(raw)
      if (!plan?.plan?.days?.[planDayIdx]) return
      // Пересобираем упражнения дня из текущего буджета, сохраняя sets/reps
      const oldDay = plan.plan.days[planDayIdx]
      plan.plan.days[planDayIdx] = {
        ...oldDay,
        exercises: wk.exercises.map((e, i) => {
          const old = oldDay.exercises?.[i] || {}
          const repsStr = e.sets?.[0]?.reps || '8-12'
          const [mn, mx] = String(repsStr).split('-').map(n => parseInt(n) || 10)
          return {
            ...old,
            name: e.name,
            muscle: e.muscle,
            type: e.type,
            sets: e.sets?.length || old.sets || 3,
            reps: { min: mn, max: mx || mn },
          }
        })
      }
      localStorage.setItem(PLAN_KEY, JSON.stringify(plan))
      setPlanSaved(true)
      setTimeout(() => setPlanSaved(false), 2000)
    } catch (e) { console.warn('saveToPlan error', e) }
  }
  // ── ШАБЛОНЫ СВОИХ ТРЕНИРОВОК ──
  // Сохранить текущий конструктор как шаблон (структура без отметок done)
  const saveAsTemplate = () => {
    if (!wk.exercises.length) return
    const name = (wk.name || '').trim() || 'Моя тренировка'
    const tpl = {
      id: Date.now(),
      name,
      createdAt: new Date().toISOString().split('T')[0],
      exercises: wk.exercises.map(e => ({
        exerciseId: e.exerciseId,
        name: e.name,
        muscle: e.muscle,
        type: e.type,
        targetReps: e.targetReps || e.sets?.[0]?.reps || '8-12',
        restSec: e.restSec || getDefaultRestSec(e.muscle),
        sets: e.sets.map(s => ({ reps: s.reps, weight: s.weight })),
      })),
    }
    const list = getTemplates()
    // если шаблон с таким именем есть — обновляем его, иначе добавляем
    const idx = list.findIndex(t => t.name.toLowerCase() === name.toLowerCase())
    let next
    if (idx >= 0) { next = [...list]; next[idx] = { ...tpl, id: list[idx].id } }
    else next = [tpl, ...list]
    saveTemplatesList(next)
    setTemplates(next)
    setTplSaved(true)
    setTimeout(() => setTplSaved(false), 2000)
  }
  const deleteTemplate = (id) => {
    const next = getTemplates().filter(t => t.id !== id)
    saveTemplatesList(next)
    setTemplates(next)
  }
  // Строит список упражнений из шаблона. transferWeights=true — подставляет вес из прошлого раза, false — вес '0'
  const buildExercisesFromTemplate = (tpl, transferWeights) => {
    return (tpl.exercises || []).map(ex => {
      const saved = suggestWeightFor(ex.name)
      return {
        uid: uid(),
        exerciseId: ex.exerciseId || Date.now() + Math.random(),
        name: ex.name,
        muscle: ex.muscle || 'Кор',
        type: ex.type || 'compound',
        targetReps: ex.targetReps || ex.sets?.[0]?.reps || '8-12',
        restSec: ex.restSec || getDefaultRestSec(ex.muscle || 'Кор'),
        suggestedWeight: saved?.suggestedWeight || null,
        sets: (ex.sets || [{ reps: '8-12', weight: '0' }]).map(s => ({ id: uid(), reps: s.reps, weight: transferWeights ? s.weight : '0', done: false })),
      }
    })
  }
  const applyTemplateLoad = (tpl, mode, transferWeights) => {
    const exercises = buildExercisesFromTemplate(tpl, transferWeights)
    setWk({ name: tpl.name, exercises })
    setPlanDayIdx(null)
    resetTimer()
    if (mode === 'builder') { setRunning(false); setView('builder') }
    else { setRunning(true); setView('active') }
  }
  // Загрузить шаблон. mode: 'active' — сразу тренировка; 'builder' — редактирование
  const startFromTemplate = (tpl, mode = 'active') => {
    const hasSavedWeights = (tpl.exercises || []).some(ex => suggestWeightFor(ex.name)?.weight)
    if (hasSavedWeights) { setPendingLoad({ type: 'template', tpl, mode }); return }
    applyTemplateLoad(tpl, mode, false)
  }

  const toggleSet = (eI, sI) => {
    const ex = wk.exercises[eI]
    const set = ex.sets[sI]
    if (!set.done) { setRestInfo({ exercise: ex.name, setInfo: `${sI+1} подход из ${ex.sets.length}`, duration: ex.restSec || getDefaultRestSec(ex.muscle) }); setShowRestTimer(true) }
    setWk(w => { const exs = [...w.exercises]; exs[eI] = { ...exs[eI], sets: exs[eI].sets.map((s,i) => i===sI ? {...s,done:!s.done} : s) }; return {...w, exercises: exs} })
  }
  const completeWorkout = () => { setRunning(false); setShowComplete(true) }
  const saveWorkout = (feedback) => {
    const { durationOverrideMin, ...restFeedback } = feedback || {}
    const finalMin = durationOverrideMin || Math.round(timer / 60)
    const calBurned = Math.round(finalMin * 7.5)
    const today2 = new Date().toISOString().split('T')[0]
    // Сохраняем рабочие веса и определяем прогрессию по каждому упражнению
    wk.exercises.forEach(ex => saveExerciseResult({ name: ex.name, sets: ex.sets, targetReps: ex.targetReps || ex.sets?.[0]?.reps }, today2))
    dispatch({ type: 'SAVE_ENTRY', entry: { ...entry, workouts: [...(entry.workouts||[]), { id: Date.now(), name: wk.name || 'Тренировка', exercises: wk.exercises.map(e => e.name), exercisesDetail: wk.exercises.map(e => ({ name: e.name, muscle: e.muscle, comment: e.comment || '', sets: e.sets.map(s => ({ reps: s.reps, weight: s.weight, done: s.done })) })), duration: finalMin, caloriesBurned: calBurned, ...restFeedback }] } })
    clearDraft()
    setWk({ name: '', exercises: [] }); resetTimer(); setShowComplete(false); setView('list')
  }
  const removeWorkout = (wId, entryDate) => {
    const targetDate = entryDate || today
    const targetEntry = state.entries.find(e => e.date === targetDate)
    if (!targetEntry) return
    dispatch({ type: 'SAVE_ENTRY', entry: { ...targetEntry, workouts: (targetEntry.workouts||[]).filter(w => w.id !== wId) } })
  }

  // Сохранить AI-анализ в запись тренировки (кэш — считается один раз, потом берётся готовый)
  const saveWorkoutAnalysis = (workout, text) => {
    const dateKey = workout.entryDate
    const targetEntry = state.entries.find(e => e.date === dateKey)
    if (!targetEntry) return
    const updated = { ...targetEntry, workouts: (targetEntry.workouts || []).map(w => w.id === workout.id ? { ...w, aiAnalysis: text } : w) }
    dispatch({ type: 'SAVE_ENTRY', entry: updated })
    // обновляем открытую карточку, чтобы при повторном открытии анализ уже был в объекте
    if (viewWorkout && viewWorkout.id === workout.id) setViewWorkout({ ...viewWorkout, aiAnalysis: text })
  }

  // Строит список упражнений из дня AI-плана. transferWeights=true — подставляет вес из прошлого раза, false — вес '0'
  const buildExercisesFromPlanDay = (day, transferWeights) => {
    return (day.exercises || []).map(ex => {
      const reps = normReps(ex.reps)
      const repsValue = `${reps.min}-${reps.max}`
      const setsCount = parseInt(ex.sets) || 3
      // Ищем в EXERCISE_DB совпадение по имени для muscle/type
      const dbEx = FULL_EXERCISE_DB.find(e => e.name.toLowerCase() === (ex.name || '').toLowerCase())
      const saved = suggestWeightFor(ex.name)
      const startWeight = (transferWeights && saved?.weight) ? String(saved.weight) : '0'
      const muscleForRest = ex.muscle || dbEx?.muscle || 'Кор'
      const restFromPlan = parseInt(ex.rest_sec) || null
      return {
        uid: uid(),
        exerciseId: dbEx?.id || Date.now() + Math.random(),
        name: ex.name,
        muscle: muscleForRest,
        type: ex.type || dbEx?.type || 'compound',
        targetReps: repsValue,
        restSec: restFromPlan || getDefaultRestSec(muscleForRest),
        suggestedWeight: saved?.suggestedWeight || null,
        sets: Array.from({ length: setsCount }, () => ({ id: uid(), reps: repsValue, weight: startWeight, done: false }))
      }
    })
  }
  const applyPlanLoad = (day, dayIdx, mode, transferWeights) => {
    const exercises = buildExercisesFromPlanDay(day, transferWeights)
    setWk({ name: day.name + ' (AI)', exercises })
    setPlanDayIdx(dayIdx)
    resetTimer()
    if (mode === 'builder') {
      // Конструктор: можно заменить упражнения, поправить подходы, потом «Начать»
      setRunning(false)
      setView('builder')
    } else {
      setRunning(true)
      setView('active')
    }
  }
  // Загружает день из AI-плана. mode: 'active' — сразу тренировка; 'builder' — конструктор для правки
  const startFromPlan = (day, dayIdx = null, mode = 'active') => {
    const hasSavedWeights = (day.exercises || []).some(ex => suggestWeightFor(ex.name)?.weight)
    if (hasSavedWeights) { setPendingLoad({ type: 'plan', day, dayIdx, mode }); return }
    applyPlanLoad(day, dayIdx, mode, false)
  }
  // Ответ пользователя на модалку "Перенести веса с прошлого раза?"
  const resolveWeightTransfer = (transfer) => {
    if (!pendingLoad) return
    if (pendingLoad.type === 'template') applyTemplateLoad(pendingLoad.tpl, pendingLoad.mode, transfer)
    else applyPlanLoad(pendingLoad.day, pendingLoad.dayIdx, pendingLoad.mode, transfer)
    setPendingLoad(null)
  }

  const M_COLORS = { Грудь:'#329063', Спина:'#3b82f6', Ноги:'#f59e0b', Плечи:'#8b5cf6', Трицепс:'#ec4899', Бицепс:'#f97316', Кор:'#06b6d4', Кардио:'#ef4444' }

  if (view === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {showRestTimer && <RestTimer duration={restInfo.duration} exerciseName={restInfo.exercise} setInfo={restInfo.setInfo} onClose={() => setShowRestTimer(false)} />}
        {viewWorkout && <WorkoutDetail workout={viewWorkout} onClose={() => setViewWorkout(null)} aiCall={aiCall} onSaveAnalysis={saveWorkoutAnalysis} />}
        <div>
          <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Тренировки</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>История</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <button onClick={() => setView('templates')} style={{ background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: 16, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer', textAlign: 'left' }}>
            <Dumbbell size={20} color="#3d9970" />
            <div style={{ fontSize: 13, fontWeight: 600 }}>Мои тренировки</div>
          </button>
          <button onClick={() => setView('plan')} style={{ background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: 16, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ fontSize: 20, color: '#3d9970' }}>✦</span>
            <div style={{ fontSize: 13, fontWeight: 600 }}>AI-план</div>
          </button>
          <button onClick={() => { setPlanDayIdx(null); setWk({ name: '', exercises: [] }); setView('builder') }} style={{ background: '#3d9970', border: 'none', borderRadius: 16, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer', textAlign: 'left' }}>
            <Plus size={20} color="#000" />
            <div style={{ fontSize: 13, fontWeight: 700, color: '#000' }}>Новая</div>
          </button>
        </div>
        <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: 12, padding: 4, gap: 4, border: '1px solid #2e2e2e' }}>
          {[['list', 'Список'], ['calendar', 'Календарь']].map(([k, v]) => (
            <button key={k} onClick={() => setHistMode(k)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: histMode === k ? '#3d9970' : 'transparent', color: histMode === k ? '#000' : '#6b7280' }}>{v}</button>
          ))}
        </div>
        {histMode === 'calendar' && <WorkoutCalendar workoutsByDate={workoutsByDate} onPickWorkout={setViewWorkout} onDeleteWorkout={removeWorkout} />}
        {histMode === 'list' && (allWorkouts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}></div>
            <div>Тренировок пока нет</div>
          </div>
        ) : allWorkouts.map(w => (
          <SwipeToDelete key={w.id} onDelete={() => removeWorkout(w.id, w.entryDate)} confirmText="Удалить эту тренировку?">
            <div onClick={() => setViewWorkout(w)} style={{ background: '#1a1a1a', padding: 18, border: '1px solid #2e2e2e', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(61,153,112,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 22 }}></span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{w.name || w.type}</div>
                <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)' }}>{w.duration} мин · {w.entryDate}</div>
              </div>
            </div>
          </SwipeToDelete>
        )))}
      </div>
    )
  }

  if (view === 'builder') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {showRestTimer && <RestTimer duration={restInfo.duration} exerciseName={restInfo.exercise} setInfo={restInfo.setInfo} onClose={() => setShowRestTimer(false)} />}
        {techFor && <TechniqueModal name={techFor.name} muscle={techFor.muscle} onClose={() => setTechFor(null)} />}
        {pickerFor && wk.exercises[pickerFor.eI] && (
          <SetPickerModal
            title={`${wk.exercises[pickerFor.eI].name} · подход ${pickerFor.sI+1}`}
            reps={wk.exercises[pickerFor.eI].sets[pickerFor.sI]?.reps}
            weight={wk.exercises[pickerFor.eI].sets[pickerFor.sI]?.weight}
            onClose={() => setPickerFor(null)}
            onSave={(r, w) => { updateSet(pickerFor.eI, pickerFor.sI, 'reps', r); updateSet(pickerFor.eI, pickerFor.sI, 'weight', w); setPickerFor(null) }}
          />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setView('list')} style={{ width: 36, height: 36, borderRadius: 10, background: '#1a1a1a', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={18} color="#9ca3af" />
          </button>
          <span style={{ fontSize: 18, fontWeight: 700 }}>Конструктор</span>
        </div>
        <input style={{ width: '100%', padding: '13px 16px', background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: 14, color: '#f5f5f5', fontSize: 15, fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}
          placeholder="Название тренировки" value={wk.name} onChange={e => setWk(w => ({...w, name: e.target.value}))} />
        <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 14, border: '1px solid #2e2e2e' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>База упражнений</div>
          <input style={{ width: '100%', padding: '11px 14px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 10, color: '#f5f5f5', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} placeholder="Поиск..." value={exSearch} onChange={e => setExSearch(e.target.value)} />
          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filteredEx.map(ex => {
              const alreadyAdded = wk.exercises.some(e => e.exerciseId === ex.id)
              return (
              <button key={ex.id} onClick={() => addEx(ex)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: alreadyAdded ? 'rgba(61,153,112,0.12)' : '#222', border: alreadyAdded ? '1px solid #3d9970' : '1px solid #2a2a2a', borderRadius: 10, cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ padding: '2px 8px', borderRadius: 50, fontSize: 11, color: '#000', background: M_COLORS[ex.muscle] || '#3d9970', flexShrink: 0, fontWeight: 600 }}>{ex.muscle}</span>
                <span style={{ fontSize: 13, color: alreadyAdded ? '#6fcaa0' : '#f5f5f5', flex: 1, fontWeight: alreadyAdded ? 600 : 400 }}>{ex.name}</span>
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, flexShrink: 0, fontWeight: 600, ...(ex.eff==='best' ? {background:'rgba(61,153,112,0.18)', color:'#6fcaa0'} : ex.eff==='good' ? {background:'#2a2a2a', color:'#d1d5db'} : {background:'#262626', color:'#6b7280'}) }}>{EFF_LABEL[ex.eff]}</span>
                {alreadyAdded ? <Check size={16} color="#3d9970" /> : <Plus size={16} color="#3d9970" />}
              </button>
              )
            })}
          </div>
        </div>
        {wk.exercises.map((ex, eI) => (
          <div key={ex.uid || eI} style={{ background: '#1a1a1a', borderRadius: 16, padding: 16, border: '1px solid #2e2e2e' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                <button onClick={() => moveExercise(eI, -1)} disabled={eI === 0} style={{ width: 22, height: 18, borderRadius: 5, background: '#222', border: 'none', color: eI === 0 ? '#3a3a3a' : '#9ca3af', cursor: eI === 0 ? 'default' : 'pointer', fontSize: 11, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▲</button>
                <button onClick={() => moveExercise(eI, 1)} disabled={eI === wk.exercises.length - 1} style={{ width: 22, height: 18, borderRadius: 5, background: '#222', border: 'none', color: eI === wk.exercises.length - 1 ? '#3a3a3a' : '#9ca3af', cursor: eI === wk.exercises.length - 1 ? 'default' : 'pointer', fontSize: 11, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▼</button>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 50, fontSize: 11, color: '#000', background: M_COLORS[ex.muscle] || '#3d9970', fontWeight: 600 }}>{ex.muscle}</span>
              <button onClick={() => setTechFor({ name: ex.name, muscle: ex.muscle })} style={{ fontSize: 15, fontWeight: 600, flex: 1, background: 'transparent', border: 'none', color: '#f5f5f5', textAlign: 'left', cursor: 'pointer', padding: 0 }}>
                {ex.name}
              </button>
              <button onClick={() => setSwapFor(eI)} style={{ padding: '5px 10px', borderRadius: 8, background: '#222', border: '1px solid #2e2e2e', color: '#9ca3af', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Заменить</button>
              <button onClick={() => removeEx(eI)} style={{ width: 28, height: 28, borderRadius: 8, background: '#222', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Отдых между подходами:</span>
              <button onClick={() => updateRest(eI, -15)} style={{ width: 26, height: 26, borderRadius: 7, background: '#222', border: '1px solid #2e2e2e', color: '#9ca3af', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>−</button>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: '#3d9970', minWidth: 44, textAlign: 'center' }}>{fmtTimeLong(ex.restSec || getDefaultRestSec(ex.muscle))}</span>
              <button onClick={() => updateRest(eI, 15)} style={{ width: 26, height: 26, borderRadius: 7, background: '#222', border: '1px solid #2e2e2e', color: '#9ca3af', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>+</button>
            </div>
            {swapFor === eI && (
              <div style={{ background: '#161616', border: '1px solid #2e2e2e', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af' }}>Заменить на:</span>
                  <button onClick={() => setSwapFor(null)} style={{ width: 24, height: 24, borderRadius: 6, background: '#222', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14 }}>×</button>
                </div>
                {(() => {
                  const dbEx = FULL_EXERCISE_DB.find(e => e.id === ex.exerciseId) || FULL_EXERCISE_DB.find(e => e.name.toLowerCase() === (ex.name||'').toLowerCase())
                  const alts = dbEx ? findAlternatives(dbEx, workoutPlace) : []
                  if (alts.length === 0) return <div style={{ fontSize: 12, color: '#6b7280', padding: '6px 0' }}>Нет подходящих альтернатив для вашего места тренировок</div>
                  return <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {alts.map(alt => (
                      <button key={alt.id} onClick={() => { replaceEx(eI, alt); setSwapFor(null) }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', background: '#222', border: '1px solid #2a2a2a', borderRadius: 9, cursor: 'pointer', textAlign: 'left' }}>
                        <span style={{ fontSize: 13, color: '#f5f5f5', flex: 1 }}>{alt.name}</span>
                        <span style={{ fontSize: 10, color: '#6b7280' }}>{alt.equipment}</span>
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, fontWeight: 600, ...(alt.eff==='best' ? {background:'rgba(61,153,112,0.18)', color:'#6fcaa0'} : alt.eff==='good' ? {background:'#2a2a2a', color:'#d1d5db'} : {background:'#262626', color:'#6b7280'}) }}>{EFF_LABEL[alt.eff]}</span>
                      </button>
                    ))}
                  </div>
                })()}
              </div>
            )}
            {ex.suggestedWeight && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(61,153,112,0.1)', border: '1px solid rgba(61,153,112,0.3)', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: '#6fcaa0', flex: 1 }}>Вы закрыли все повторы — пора поднять вес до <b>{ex.suggestedWeight} кг</b></span>
                <button onClick={() => applyProgression(eI)} style={{ padding: '6px 12px', borderRadius: 8, background: '#3d9970', border: 'none', color: '#000', cursor: 'pointer', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>Поднять</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginBottom: 6, padding: '0 2px' }}>
              <div style={{ width: 28, fontSize: 11, color: '#6b7280', textAlign: 'center' }}>№</div>
              <div style={{ flex: 1, fontSize: 11, color: '#6b7280', textAlign: 'center' }}>Повторы</div>
              <div style={{ flex: 1, fontSize: 11, color: '#6b7280', textAlign: 'center' }}>Вес (кг)</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
              {ex.sets.map((set, sI) => (
                <SwipeToDelete key={set.id || sI} onDelete={() => removeSet(eI, sI)} disabled={ex.sets.length <= 1} radius={8}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: '#1a1a1a' }}>
                    <div style={{ width: 28, fontSize: 13, color: '#6b7280', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{sI+1}</div>
                    <button onClick={() => setPickerFor({ eI, sI })} style={{ flex: 1, padding: '9px 4px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 8, color: '#f5f5f5', fontSize: 14, fontFamily: 'var(--mono)', fontWeight: 700, outline: 'none', textAlign: 'center', cursor: 'pointer' }}>{set.reps || '10'}</button>
                    <button onClick={() => setPickerFor({ eI, sI })} style={{ flex: 1, padding: '9px 4px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 8, color: '#f5f5f5', fontSize: 14, fontFamily: 'var(--mono)', fontWeight: 700, outline: 'none', textAlign: 'center', cursor: 'pointer' }}>{set.weight || '0'}</button>
                  </div>
                </SwipeToDelete>
              ))}
            </div>
            <button onClick={() => addSet(eI)} style={{ padding: '8px', background: 'transparent', border: '1px dashed #2e2e2e', borderRadius: 8, color: '#6b7280', cursor: 'pointer', fontSize: 13, width: '100%', marginBottom: 10 }}>+ Добавить подход</button>
            <input
              type="text"
              value={ex.comment || ''}
              onChange={e => updateComment(eI, e.target.value)}
              placeholder="Комментарий к упражнению (необязательно)"
              style={{ width: '100%', padding: '9px 12px', background: '#161616', border: '1px solid #2a2a2a', borderRadius: 10, color: '#d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        ))}
        {wk.exercises.length > 0 && (
          <button onClick={() => { resetTimer(); setRunning(true); setView('active') }} style={{ background: '#3d9970', color: '#000', border: 'none', borderRadius: 14, padding: '15px', fontSize: 14, fontWeight: 700, width: '100%', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Начать тренировку
          </button>
        )}
        {wk.exercises.length > 0 && (
          <button onClick={saveAsTemplate} style={{ background: tplSaved ? '#329063' : 'transparent', color: tplSaved ? '#000' : '#3d9970', border: '1px solid #3d9970', borderRadius: 14, padding: '13px', fontSize: 13, fontWeight: 700, width: '100%', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {tplSaved ? '✓ Сохранено в мои тренировки' : 'Сохранить как шаблон'}
          </button>
        )}
        {wk.exercises.length > 0 && planDayIdx !== null && (
          <button onClick={saveToPlan} style={{ background: planSaved ? '#329063' : 'transparent', color: planSaved ? '#000' : '#3d9970', border: '1px solid #3d9970', borderRadius: 14, padding: '13px', fontSize: 13, fontWeight: 700, width: '100%', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {planSaved ? '✓ Сохранено в план' : 'Сохранить в план'}
          </button>
        )}
      </div>
    )
  }

  if (view === 'active') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 90 }}>
        {showRestTimer && <RestTimer duration={restInfo.duration} exerciseName={restInfo.exercise} setInfo={restInfo.setInfo} onClose={() => setShowRestTimer(false)} />}
        {techFor && <TechniqueModal name={techFor.name} muscle={techFor.muscle} onClose={() => setTechFor(null)} />}
        {pickerFor && wk.exercises[pickerFor.eI] && (
          <SetPickerModal
            title={`${wk.exercises[pickerFor.eI].name} · подход ${pickerFor.sI+1}`}
            reps={wk.exercises[pickerFor.eI].sets[pickerFor.sI]?.reps}
            weight={wk.exercises[pickerFor.eI].sets[pickerFor.sI]?.weight}
            onClose={() => setPickerFor(null)}
            onSave={(r, w) => { updateSet(pickerFor.eI, pickerFor.sI, 'reps', r); updateSet(pickerFor.eI, pickerFor.sI, 'weight', w); setPickerFor(null) }}
          />
        )}
        {showComplete && <WorkoutComplete workout={wk} duration={timer} onSave={saveWorkout} aiCall={aiCall} />}
        <div style={{ background: '#1a1a1a', borderRadius: 20, padding: '20px 24px', border: '1px solid #2e2e2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 40, fontWeight: 700, color: '#3d9970' }}>{fmtTimeLong(timer)}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Общее время</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{wk.name || 'Тренировка'}</div>
        </div>
        {wk.exercises.map((ex, eI) => (
          <div key={ex.uid || eI} style={{ background: '#1a1a1a', borderRadius: 18, overflow: 'hidden', border: '1px solid #2e2e2e' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                <button onClick={() => moveExercise(eI, -1)} disabled={eI === 0} style={{ width: 20, height: 16, borderRadius: 5, background: '#222', border: 'none', color: eI === 0 ? '#3a3a3a' : '#9ca3af', cursor: eI === 0 ? 'default' : 'pointer', fontSize: 10, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▲</button>
                <button onClick={() => moveExercise(eI, 1)} disabled={eI === wk.exercises.length - 1} style={{ width: 20, height: 16, borderRadius: 5, background: '#222', border: 'none', color: eI === wk.exercises.length - 1 ? '#3a3a3a' : '#9ca3af', cursor: eI === wk.exercises.length - 1 ? 'default' : 'pointer', fontSize: 10, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▼</button>
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: '#3d9970', minWidth: 28 }}>{eI+1}</span>
              <div style={{ flex: 1 }}>
                <button onClick={() => setTechFor({ name: ex.name, muscle: ex.muscle })} style={{ fontSize: 15, fontWeight: 600, background: 'transparent', border: 'none', color: '#f5f5f5', textAlign: 'left', cursor: 'pointer', padding: 0 }}>{ex.name}</button>
              </div>
              <button onClick={() => setSwapFor(swapFor === eI ? null : eI)} style={{ padding: '5px 9px', borderRadius: 8, background: '#222', border: '1px solid #2e2e2e', color: '#9ca3af', cursor: 'pointer', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>Заменить</button>
              <span style={{ padding: '3px 10px', borderRadius: 50, fontSize: 11, color: '#000', background: M_COLORS[ex.muscle] || '#3d9970', fontWeight: 600 }}>{ex.muscle}</span>
            </div>
            {swapFor === eI && (
              <div style={{ margin: '0 16px 14px', background: '#161616', border: '1px solid #2e2e2e', borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af' }}>Заменить на:</span>
                  <button onClick={() => setSwapFor(null)} style={{ width: 24, height: 24, borderRadius: 6, background: '#222', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14 }}>×</button>
                </div>
                {(() => {
                  const dbEx = FULL_EXERCISE_DB.find(e => e.id === ex.exerciseId) || FULL_EXERCISE_DB.find(e => e.name.toLowerCase() === (ex.name||'').toLowerCase())
                  const alts = dbEx ? findAlternatives(dbEx, workoutPlace) : []
                  if (alts.length === 0) return <div style={{ fontSize: 12, color: '#6b7280', padding: '6px 0' }}>Нет подходящих альтернатив для вашего места тренировок</div>
                  return <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {alts.map(alt => (
                      <button key={alt.id} onClick={() => { replaceEx(eI, alt); setSwapFor(null) }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', background: '#222', border: '1px solid #2a2a2a', borderRadius: 9, cursor: 'pointer', textAlign: 'left' }}>
                        <span style={{ fontSize: 13, color: '#f5f5f5', flex: 1 }}>{alt.name}</span>
                        <span style={{ fontSize: 10, color: '#6b7280' }}>{alt.equipment}</span>
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, fontWeight: 600, ...(alt.eff==='best' ? {background:'rgba(61,153,112,0.18)', color:'#6fcaa0'} : alt.eff==='good' ? {background:'#2a2a2a', color:'#d1d5db'} : {background:'#262626', color:'#6b7280'}) }}>{EFF_LABEL[alt.eff]}</span>
                      </button>
                    ))}
                  </div>
                })()}
              </div>
            )}
            <div style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', gap: 8, padding: '4px 16px 8px', alignItems: 'center' }}>
                <span style={{ width: 44, fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>Подход</span>
                <span style={{ flex: 1, fontSize: 10, color: '#6b7280', textAlign: 'center' }}>Повторы (факт)</span>
                <span style={{ flex: 1, fontSize: 10, color: '#6b7280', textAlign: 'center' }}>Вес, кг</span>
                <span style={{ width: 40 }}></span>
              </div>
              <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {ex.sets.map((set, sI) => (
                  <SwipeToDelete key={set.id || sI} onDelete={() => removeSet(eI, sI)} disabled={ex.sets.length <= 1} radius={8}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0', background: set.done ? 'rgba(61,153,112,0.06)' : '#1a1a1a' }}>
                      <span style={{ width: 44, fontFamily: 'var(--mono)', fontSize: 13, color: '#6b7280' }}>№{sI+1}</span>
                      <button onClick={() => setPickerFor({ eI, sI })} style={{ flex: 1, padding: '9px 4px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 8, color: '#f5f5f5', fontSize: 15, fontWeight: 700, fontFamily: 'var(--mono)', outline: 'none', textAlign: 'center', boxSizing: 'border-box', cursor: 'pointer' }}>{set.reps || ex.targetReps || '—'}</button>
                      <button onClick={() => setPickerFor({ eI, sI })} style={{ flex: 1, padding: '9px 4px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 8, color: '#f5f5f5', fontSize: 15, fontWeight: 700, fontFamily: 'var(--mono)', outline: 'none', textAlign: 'center', boxSizing: 'border-box', cursor: 'pointer' }}>{set.weight || '0'}</button>
                      <button onClick={() => toggleSet(eI, sI)} style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${set.done ? '#3d9970' : '#2e2e2e'}`, background: set.done ? '#3d9970' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {set.done && <Check size={16} color="#000" />}
                      </button>
                    </div>
                  </SwipeToDelete>
                ))}
              </div>
              <button onClick={() => addSet(eI)} style={{ margin: '4px 16px 8px', padding: '9px', background: 'transparent', border: '1px dashed #2e2e2e', borderRadius: 8, color: '#6b7280', cursor: 'pointer', fontSize: 13, width: 'calc(100% - 32px)' }}>+ Добавить подход</button>
              <div style={{ margin: '0 16px 12px' }}>
                <input
                  type="text"
                  value={ex.comment || ''}
                  onChange={e => updateComment(eI, e.target.value)}
                  placeholder="Комментарий к упражнению (необязательно)"
                  style={{ width: '100%', padding: '9px 12px', background: '#161616', border: '1px solid #2a2a2a', borderRadius: 10, color: '#d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>
        ))}
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))', background: '#111', borderTop: '1px solid #1e1e1e', display: 'flex', gap: 10, zIndex: 400 }}>
          <button onClick={() => setRunning(r => !r)} style={{ flex: 1, padding: '14px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 12, color: '#f5f5f5', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            {running ? 'Пауза' : 'Старт'}
          </button>
          <button onClick={completeWorkout} style={{ flex: 2, padding: '14px', background: '#3d9970', border: 'none', borderRadius: 12, color: '#000', cursor: 'pointer', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Завершить</button>
        </div>
      </div>
    )
  }

  if (view === 'templates') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {pendingLoad && <WeightTransferModal onConfirm={() => resolveWeightTransfer(true)} onDecline={() => resolveWeightTransfer(false)} onClose={() => setPendingLoad(null)} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setView('list')} style={{ width: 36, height: 36, borderRadius: 10, background: '#1a1a1a', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={18} color="#9ca3af" />
          </button>
          <span style={{ fontSize: 18, fontWeight: 700 }}>Мои тренировки</span>
        </div>

        <button onClick={() => { setPlanDayIdx(null); setWk({ name: '', exercises: [] }); setView('builder') }} style={{ background: '#3d9970', color: '#000', border: 'none', borderRadius: 14, padding: '14px', fontSize: 14, fontWeight: 700, width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          <Plus size={18} /> Собрать новую
        </button>

        {templates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: '#6b7280' }}>
            <Dumbbell size={40} color="#2e2e2e" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: '#9ca3af' }}>Пока нет сохранённых тренировок</div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>Собери тренировку в конструкторе и нажми «Сохранить как шаблон» — она появится здесь для быстрого запуска</div>
          </div>
        ) : templates.map(tpl => {
          const muscles = [...new Set((tpl.exercises || []).map(e => e.muscle).filter(Boolean))]
          return (
            <div key={tpl.id} style={{ background: '#1a1a1a', borderRadius: 18, overflow: 'hidden', border: '1px solid #2e2e2e' }}>
              <SwipeToDelete onDelete={() => deleteTemplate(tpl.id)} confirmText="Удалить эту тренировку?" radius={0}>
                <div style={{ padding: '14px 16px', background: '#1a1a1a' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{tpl.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)' }}>{(tpl.exercises || []).length} упр.{muscles.length ? ' · ' + muscles.join(', ') : ''}</div>
                </div>
              </SwipeToDelete>
              <div style={{ padding: '12px 16px', borderTop: '1px solid #2a2a2a', background: '#161616', display: 'flex', gap: 8 }}>
                <button onClick={() => startFromTemplate(tpl, 'builder')} style={{ flex: 1, background: 'transparent', color: '#3d9970', border: '1px solid #3d9970', borderRadius: 12, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <Edit2 size={14} /> Изменить
                </button>
                <button onClick={() => startFromTemplate(tpl, 'active')} style={{ flex: 1.4, background: '#3d9970', color: '#000', border: 'none', borderRadius: 12, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <Play size={14} /> Начать
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (view === 'plan') {
    return (
      <>
        {pendingLoad && <WeightTransferModal onConfirm={() => resolveWeightTransfer(true)} onDecline={() => resolveWeightTransfer(false)} onClose={() => setPendingLoad(null)} />}
        <PlanScreen onBack={() => setView('list')} aiCall={aiCall} profile={state.profile} onStartWorkout={startFromPlan} />
      </>
    )
  }

  return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <button onClick={() => setView('list')} style={{ background: '#3d9970', color: '#000', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
        ← К списку тренировок
      </button>
    </div>
  )
}

// ─── PLAN SCREEN ─────────────────────────────────────────────────────────────
function PlanScreen({ onBack, aiCall, profile, onStartWorkout }) {
  const [plan, setPlan] = useState(() => {
    try {
      const raw = localStorage.getItem(PLAN_KEY)
      if (!raw) return null
      const p = JSON.parse(raw)
      if (!p?.plan?.days || !Array.isArray(p.plan.days)) { localStorage.removeItem(PLAN_KEY); return null }
      p.plan.days.forEach(day => { (day.exercises || []).forEach(ex => { ex.reps = normReps(ex.reps) }) })
      return p
    } catch { localStorage.removeItem(PLAN_KEY); return null }
  })
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('Составляю план...')
  const [error, setError] = useState(null)
  const [expandedDay, setExpandedDay] = useState(null)

  const levelKey = profile?.level || 'amateur'
  const levelLabel = LEVEL_RU[levelKey] || 'любитель'
  const goalKey = GOAL_RU[profile?.goals?.[0]] || 'maintenance'

  // Объединяем ограничения текстом + AI-анализ
  const limitations = profile?.limitationsText || ''
  const aiAnalysis = profile?.aiAnalysis || ''
  const hasLimitations = !!(limitations || aiAnalysis)

  const requestPlan = async (lvlKey, goalKey, p, repsRange, daysPerWeek, duration, expYears, placeLabel) => {
    const TIMEOUT_MS = 60000

    const limitationsBlock = hasLimitations
      ? `
ОГРАНИЧЕНИЯ И ТРАВМЫ ПОЛЬЗОВАТЕЛЯ (КРИТИЧНО учитывать):
${limitations ? `- Описание: ${limitations}` : ''}
${aiAnalysis ? `- Рекомендации врача/AI: ${aiAnalysis}` : ''}
Исключи из плана упражнения нагружающие травмированную область. Заменяй на безопасные альтернативы.`
      : '- Ограничения/травмы: нет'

    const prompt = `Ты — профессиональный фитнес-тренер с 10-летним опытом. Составь персональный недельный план тренировок строго по правилам.

ВХОДНЫЕ ДАННЫЕ:
- Уровень: ${lvlKey} (опыт ${expYears} лет)
- Цель: ${goalKey}
- Возраст: ${profile?.age || 25}, пол: ${profile?.gender || 'male'}
- Вес: ${profile?.weight || 80} кг, рост: ${profile?.height || 175} см
${limitationsBlock}
- Оборудование/место: ${placeLabel}
- Частота: ${daysPerWeek} тренировок в неделю
- Длительность: ${duration} минут

ПАРАМЕТРЫ (соблюдай ТОЧНО):
- Сплит: ${p.split}
- Упражнений за тренировку: МИНИМУМ ${p.exMin}, максимум ${p.exMax}
- Подходов: ${p.sets}
- Повторений (под цель ${goalKey}): ${repsRange}
- Отдых: ${p.restSec} сек

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА (нарушение = брак):
1. В КАЖДОМ тренировочном дне МИНИМУМ ${p.exMin} упражнений. КРИТИЧНО.
2. Не более 20 подходов на одну мышечную группу за неделю.
3. На каждую группу: 1-2 базовых (compound) + 1-2 изолирующих (isolation).
4. Сплит (ОБЯЗАТЕЛЬНО соблюдать именно указанный, НЕ менять):
   - full body: каждая тренировка прорабатывает ВСЁ ТЕЛО. КРИТИЧНО для новичка: новичку НУЖНА ЧАСТОТА, а не объём на одну мышцу. Каждая группа должна нагружаться 2-3 раза в неделю для быстрой нейромышечной адаптации и оттачивания техники базовых движений. НЕ разбивай на сплит по группам.
   - upper/lower: чередовать ВЕРХ и НИЗ
   - push/pull/legs: жим → тяга → ноги
5. Между тренировочными днями вставлять дни отдыха (exercises: []).
${hasLimitations ? '6. ОБЯЗАТЕЛЬНО исключить опасные упражнения для указанных травм. Например при коксартрозе/болях в ТБС — БЕЗ приседаний со штангой, становой, выпадов с весом, жима ногами. Заменить на безопасные: разгибания/сгибания ног в тренажёре, упражнения сидя, плавание-кардио.' : ''}
7. ВСЕ названия — на русском (Понедельник..Воскресенье; Грудь, Спина, Ноги, Плечи, Трицепс, Бицепс, Кор, Кардио).
8. Названия упражнений — реальные русские: "Жим штанги лёжа", "Тяга верхнего блока" и т.д.

СТРУКТУРА: compound первыми, потом isolation. На большие группы (грудь/спина/ноги) 4-5 упр., на малые (бицепс/трицепс) 2-3.

ВЕРНИ ТОЛЬКО валидный JSON:
{"plan":{"split":"Фулбоди","days":[{"day_index":0,"name":"Понедельник","muscles":["Грудь","Трицепс"],"exercises":[{"name":"Жим штанги лёжа","muscle":"Грудь","type":"compound","sets":3,"reps":{"min":8,"max":12},"rest_sec":90},{"name":"Жим гантелей на наклонной","muscle":"Грудь","type":"compound","sets":3,"reps":{"min":10,"max":12},"rest_sec":90},{"name":"Разводка гантелей лёжа","muscle":"Грудь","type":"isolation","sets":3,"reps":{"min":12,"max":15},"rest_sec":60},{"name":"Жим узким хватом","muscle":"Трицепс","type":"compound","sets":3,"reps":{"min":8,"max":12},"rest_sec":90},{"name":"Разгибания на блоке","muscle":"Трицепс","type":"isolation","sets":3,"reps":{"min":12,"max":15},"rest_sec":60}]},{"day_index":1,"name":"Вторник","muscles":[],"exercises":[]}]},"progression":{"increment_percent":{"min":2.5,"max":5}}}

НАПОМИНАНИЕ: каждый тренировочный день — МИНИМУМ ${p.exMin} упражнений.`

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS))
    const reply = await Promise.race([aiCall([{ role: 'user', content: prompt }], 3500), timeoutPromise])
    const clean = reply.replace(/```json|```/g, '').trim()
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('NO_JSON')
    let parsed
    try { parsed = JSON.parse(match[0]) } catch { throw new Error('BAD_JSON') }
    if (!parsed.plan?.days || !Array.isArray(parsed.plan.days)) throw new Error('BAD_STRUCTURE')
    return parsed
  }

  const generatePlan = async () => {
    setLoading(true); setError(null); setLoadingMsg('Составляю план...')
    try {
      const lvlKey = levelKey === 'professional' ? 'expert' : levelKey
      const levelParams = {
        beginner: { split:'full body', exMin:4, exMax:6, sets:'2-3', restSec:'60-90', reps:{ fat_loss:'10-15', muscle_gain:'8-12', strength:'6-10', maintenance:'10-12' } },
        amateur:  { split:'upper/lower', exMin:5, exMax:8, sets:'3-4', restSec:'60-120', reps:{ fat_loss:'10-15', muscle_gain:'6-12', strength:'4-8', maintenance:'8-12' } },
        advanced: { split:'push/pull/legs', exMin:6, exMax:10, sets:'3-5', restSec:'90-180', reps:{ fat_loss:'10-15', muscle_gain:'6-12', strength:'4-6', maintenance:'8-12' } },
        expert:   { split:'кастомный', exMin:7, exMax:12, sets:'4-6', restSec:'120-240', reps:{ fat_loss:'10-15', muscle_gain:'6-12', strength:'3-6', maintenance:'8-12' } },
      }
      const p = levelParams[lvlKey] || levelParams.amateur
      const repsRange = p.reps[goalKey] || '8-12'
      const daysPerWeek = lvlKey === 'beginner' ? 3 : lvlKey === 'amateur' ? 4 : 5
      const duration = lvlKey === 'beginner' ? 45 : 60
      const expYears = lvlKey === 'beginner' ? 0 : lvlKey === 'amateur' ? 1 : lvlKey === 'advanced' ? 3 : 5
      const wp = (() => { try { return localStorage.getItem('workout-place-v1') || 'gym' } catch { return 'gym' } })()
      const placeLabel = wp === 'home' ? 'дом (только своё тело, гантели, резинки, турник; БЕЗ зальных тренажёров и штанги)' : wp === 'both' ? 'зал и дом (можно любое оборудование)' : 'тренажёрный зал (полный доступ к штанге, тренажёрам, блокам)'

      let parsed = null
      let lastReason = null

      for (let attempt = 1; attempt <= 2; attempt++) {
        if (attempt === 2) setLoadingMsg('План получился слабым, переделываю...')
        try {
          parsed = await requestPlan(lvlKey, goalKey, p, repsRange, daysPerWeek, duration, expYears, placeLabel)
          const validation = validatePlanQuality(parsed, p.exMin)
          if (validation.ok) break
          lastReason = validation.reason
          parsed = null
        } catch (e) {
          if (e.message === 'TIMEOUT') throw e
          lastReason = e.message
        }
      }

      if (!parsed) {
        setError(`AI не смог составить корректный план (${lastReason || 'попробуй ещё раз'}).`)
        setLoading(false); return
      }

      const translated = translatePlan(parsed)
      setPlan(translated)
      localStorage.setItem(PLAN_KEY, JSON.stringify(translated))
      setExpandedDay(0)
    } catch (e) {
      if (e.message === 'TIMEOUT') setError('AI слишком долго отвечает (>60с). Попробуй ещё раз.')
      else if (e.message === 'NO_JSON' || e.message === 'BAD_JSON') setError('AI вернул некорректный ответ. Попробуй ещё раз.')
      else setError('Ошибка соединения. Попробуй снова.')
    } finally { setLoading(false) }
  }

  const typeLabel = t => t === 'compound' ? 'Базовое' : 'Изоляция'
  const typeColor = t => t === 'compound' ? '#3d9970' : '#38bdf8'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 10, background: '#1a1a1a', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={18} color="#9ca3af" />
        </button>
        <span style={{ fontSize: 18, fontWeight: 700 }}>AI-план тренировок</span>
      </div>

      <div style={{ background: '#1a1a1a', borderRadius: 14, padding: '12px 16px', display: 'flex', border: '1px solid #2e2e2e' }}>
        {[{ label:'Уровень', value:levelLabel, c:'#3d9970' }, { label:'Цель', value:goalKey, c:'#38bdf8' }, { label:'Ограничения', value:hasLimitations?'Есть':'Нет', c:hasLimitations?'#fbbf24':'#6b7280' }].map((item, i) => (
          <div key={i} style={{ flex: 1, padding:'4px 8px', borderRight: i<2?'1px solid #2e2e2e':'none' }}>
            <div style={{ fontSize: 10, color:'#6b7280', marginBottom:3, textTransform:'uppercase' }}>{item.label}</div>
            <div style={{ fontSize:12, color:item.c, fontWeight:600, textTransform:'capitalize' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {!plan && !loading && (
        <div style={{ background:'#1a1a1a', borderRadius:20, padding:28, display:'flex', flexDirection:'column', alignItems:'center', gap:16, textAlign:'center', border:'1px solid #2e2e2e' }}>
          <div style={{ fontSize:48 }}>✦</div>
          <div style={{ fontSize:16, fontWeight:700 }}>AI составит план под тебя</div>
          <div style={{ fontSize:13, color:'#6b7280', lineHeight:1.6 }}>Учитывает уровень, цель, сплит{hasLimitations ? ' и ваши ограничения/травмы' : ''}</div>
          {error && <div style={{ fontSize:13, color:'#f87171', background:'rgba(248,113,113,0.1)', padding:'10px 16px', borderRadius:10, width:'100%' }}>{error}</div>}
          <button onClick={generatePlan} style={{ background:'#3d9970', color:'#000', border:'none', borderRadius:14, padding:'14px 28px', fontSize:15, fontWeight:700, cursor:'pointer', textTransform:'uppercase', letterSpacing:0.5 }}>Создать план</button>
        </div>
      )}

      {loading && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, padding:'48px 0' }}>
          <div style={{ width:48, height:48, borderRadius:'50%', border:'3px solid rgba(61,153,112,0.2)', borderTop:'3px solid #3d9970', animation:'spin 1s linear infinite' }} />
          <div style={{ fontSize:14, fontWeight:600 }}>{loadingMsg}</div>
          <div style={{ fontSize:12, color:'#6b7280' }}>20–40 секунд</div>
        </div>
      )}

      {plan && plan.plan && Array.isArray(plan.plan.days) && (
        <>
          <div style={{ background:'#1a1a1a', borderRadius:14, padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid #2e2e2e' }}>
            <span style={{ fontSize:13, color:'#6b7280' }}>Сплит</span>
            <span style={{ fontSize:13, fontWeight:700, color:'#3d9970' }}>{plan.plan.split || '—'}</span>
          </div>
          {plan.plan.days.map((day, i) => {
            const isRest = !day.exercises || day.exercises.length === 0
            const isOpen = expandedDay === i
            return (
              <div key={i} style={{ background:'#1a1a1a', borderRadius:18, overflow:'hidden', border:`1px solid ${isOpen?'rgba(61,153,112,0.3)':'#2e2e2e'}` }}>
                <div onClick={() => setExpandedDay(isOpen ? null : i)} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', cursor:'pointer' }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:isRest?'#4b5563':DAY_COLORS_PLAN[i%7], flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600 }}>{day.name}</div>
                    {!isRest && day.muscles?.length>0 && <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>{day.muscles.join(' + ')}</div>}
                    {isRest && <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>Отдых</div>}
                  </div>
                  {!isRest && (
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:11, color:'#6b7280', fontFamily:'var(--mono)' }}>{day.exercises.length} упр.</span>
                      <span style={{ color:'#6b7280', fontSize:14 }}>{isOpen?'▲':'▼'}</span>
                    </div>
                  )}
                </div>
                {isOpen && !isRest && (
                  <div style={{ borderTop:'1px solid #2a2a2a' }}>
                    {day.exercises.map((ex, j) => {
                      const reps = normReps(ex.reps)
                      return (
                        <div key={j} style={{ padding:'12px 16px', borderBottom: j<day.exercises.length-1?'1px solid #1e1e1e':'none', display:'flex', gap:12, alignItems:'flex-start' }}>
                          <div style={{ flex:1 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                              <span style={{ padding:'2px 8px', background:`${typeColor(ex.type)}22`, color:typeColor(ex.type), borderRadius:6, fontSize:10, fontWeight:700 }}>{typeLabel(ex.type)}</span>
                              <span style={{ fontSize:14, fontWeight:500 }}>{ex.name}</span>
                            </div>
                            <div style={{ display:'flex', gap:12, fontFamily:'var(--mono)', fontSize:12 }}>
                              <span style={{ color:'#3d9970' }}>{ex.sets} × {reps.min}–{reps.max}</span>
                              <span style={{ color:'#6b7280' }}>отдых {ex.rest_sec}с</span>
                            </div>
                          </div>
                          <span style={{ fontSize:11, padding:'3px 8px', background:'#222', borderRadius:6, color:'#9ca3af', flexShrink:0 }}>{ex.muscle}</span>
                        </div>
                      )
                    })}
                    {/* Кнопки: Редактировать (→ конструктор) и Начать тренировку (→ активная) */}
                    <div style={{ padding: '12px 16px', borderTop: '1px solid #2a2a2a', background: '#161616', display: 'flex', gap: 8 }}>
                      <button onClick={() => onStartWorkout && onStartWorkout(day, i, 'builder')}
                        style={{ flex: 1, background: 'transparent', color: '#3d9970', border: '1px solid #3d9970', borderRadius: 12, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        <Edit2 size={14} /> Изменить
                      </button>
                      <button onClick={() => onStartWorkout && onStartWorkout(day, i, 'active')}
                        style={{ flex: 1.4, background: '#3d9970', color: '#000', border: 'none', borderRadius: 12, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        <Play size={14} /> Начать
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {plan.progression?.increment_percent && (
            <div style={{ background:'#1a1a1a', borderRadius:18, padding:16, border:'1px solid #2e2e2e' }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Прогрессия</div>
              <div style={{ fontSize:12, color:'#9ca3af' }}>
                Выполнил все подходы → +{plan.progression.increment_percent.min ?? 2.5}–{plan.progression.increment_percent.max ?? 5}% к весу
              </div>
            </div>
          )}
          <button onClick={() => { setPlan(null); localStorage.removeItem(PLAN_KEY); setError(null); setExpandedDay(null) }}
            style={{ padding:'12px', background:'transparent', border:'1px solid #2e2e2e', borderRadius:14, color:'#6b7280', cursor:'pointer', fontSize:13 }}>
            ↻ Пересоздать план
          </button>
        </>
      )}
    </div>
  )
}

// ─── PROFILE SCREEN ───────────────────────────────────────────────────────────
const LEVEL_LABELS = { beginner:'Новичок', amateur:'Любитель', advanced:'Продвинутый', professional:'Профессионал' }
const GOAL_LABELS  = { weight_loss:'Похудение', muscle_gain:'Набор массы', maintenance:'Поддержание', endurance:'Выносливость', strength:'Сила', health:'Здоровье' }
const ACTIVITY_LABELS = { sedentary:'Сидячий', light:'Лёгкая', moderate:'Умеренная', active:'Высокая', very_active:'Очень высокая' }

function ProfileScreen({ profile, saveProfile, signOut, aiCall }) {
  const [section, setSection] = useState('plan')
  const [form, setForm] = useState({
    age:profile?.age||'', weight:profile?.weight||'', height:profile?.height||'',
    gender:profile?.gender||'male', activity:profile?.activity||'moderate',
    level:profile?.level||'amateur', goals:profile?.goals||[],
    calorieGoal:profile?.calorieGoal||'', proteinGoal:profile?.proteinGoal||'',
    fatGoal:profile?.fatGoal||'', carbGoal:profile?.carbGoal||'',
    limitationsText: profile?.limitationsText || '',
    aiAnalysis: profile?.aiAnalysis || '',
    workoutPlace: (() => { try { return localStorage.getItem('workout-place-v1') || 'gym' } catch { return 'gym' } })(),
  })
  const [saved, setSaved] = useState(false)
  const [cacheCount, setCacheCount] = useState(() => getCachedFoods().length)
  const [cacheCleared, setCacheCleared] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState(null)
  const [reminders, setReminders] = useState(() => getReminderSettings())
  const notifPermission = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'

  const updateReminders = (patch) => {
    setReminders(r => {
      const next = { ...r, ...patch }
      saveReminderSettings(next)
      return next
    })
  }
  const updateMealTime = (key, time) => {
    setReminders(r => {
      const next = { ...r, meals: { ...r.meals, [key]: time } }
      saveReminderSettings(next)
      return next
    })
  }
  const enableReminders = async () => {
    if (notifPermission === 'unsupported') return
    if (notifPermission !== 'granted') {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return
    }
    updateReminders({ enabled: true })
  }

  const toggleGoal = g => setForm(f => ({ ...f, goals: f.goals.includes(g) ? f.goals.filter(x => x!==g) : [...f.goals, g] }))

  const handleClearCache = () => {
    if (confirm('Удалить все сохранённые AI-продукты? Это нельзя отменить.')) {
      clearCachedFoods()
      setCacheCount(0)
      setCacheCleared(true)
      setTimeout(() => setCacheCleared(false), 2000)
    }
  }

  const runAIAnalysis = async () => {
    if (!form.limitationsText.trim()) {
      setAnalyzeError('Сначала опишите ограничения')
      return
    }
    setAnalyzing(true)
    setAnalyzeError(null)
    try {
      const prompt = `Ты — спортивный врач и реабилитолог. Пользователь описал свои ограничения здоровья:

"${form.limitationsText}"

Дай краткий анализ (3-5 предложений) на русском:
1. Какие виды нагрузок ОПАСНЫ при этом состоянии (что исключить)
2. Какие упражнения БЕЗОПАСНЫ и рекомендуются
3. Общие рекомендации по тренировкам

Ответь простым текстом без markdown, без заголовков, в одном абзаце. Конкретно и по делу.`

      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 30000))
      const reply = await Promise.race([
        aiCall([{ role: 'user', content: prompt }], 800),
        timeoutPromise
      ])

      const cleaned = reply.replace(/```/g, '').trim()
      setForm(f => ({ ...f, aiAnalysis: cleaned }))
    } catch (e) {
      setAnalyzeError(e.message === 'TIMEOUT' ? 'AI долго отвечает, попробуй ещё раз' : 'Ошибка анализа, попробуй ещё раз')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = async () => {
    const w = +form.weight, h = +form.height, a = +form.age
    let calorieGoal = +form.calorieGoal
    if (!calorieGoal && w && h && a) {
      const bmr = form.gender==='male' ? 10*w+6.25*h-5*a+5 : 10*w+6.25*h-5*a-161
      const factors = { sedentary:1.2, light:1.375, moderate:1.55, active:1.725, very_active:1.9 }
      calorieGoal = Math.round(bmr * (factors[form.activity]||1.55))
    }
    const proteinGoal = +form.proteinGoal || Math.round(w*1.8)
    const fatGoal = +form.fatGoal || Math.round(calorieGoal*0.25/9)
    const carbGoal = +form.carbGoal || Math.round((calorieGoal-proteinGoal*4-fatGoal*9)/4)
    const bmi = w&&h ? (w/((h/100)**2)).toFixed(1) : profile?.bmi
    await saveProfile({ ...profile, ...form, calorieGoal, proteinGoal, fatGoal, carbGoal, bmi })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const inp = { width:'100%', padding:'12px 16px', background:'#222', border:'1px solid #2e2e2e', borderRadius:12, color:'#f5f5f5', fontSize:15, outline:'none', boxSizing:'border-box' }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:11, color:'#6b7280', textTransform:'uppercase', letterSpacing:1, marginBottom:2 }}>Аккаунт</div>
          <div style={{ fontSize:20, fontWeight:700 }}>План и профиль</div>
        </div>
        <button onClick={signOut} style={{ width:36, height:36, borderRadius:10, background:'#1a1a1a', border:'1px solid #2e2e2e', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <LogOut size={16} color="#9ca3af" />
        </button>
      </div>
      <div style={{ display:'flex', background:'#1a1a1a', borderRadius:12, padding:4, gap:4, border:'1px solid #2e2e2e' }}>
        {[['plan','План'],['profile','Профиль'],['health','Здоровье'],['settings','Настройки']].map(([k,v]) => (
          <button key={k} onClick={() => setSection(k)} style={{ flex:1, padding:'9px 4px', borderRadius:9, border:'none', cursor:'pointer', fontSize:12, fontWeight:500, background:section===k?'#3d9970':'transparent', color:section===k?'#000':'#6b7280' }}>{v}</button>
        ))}
      </div>

      {section === 'plan' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:16, border:'1px solid #2e2e2e' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Цели тренировок</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {Object.entries(GOAL_LABELS).map(([k,v]) => (
                <button key={k} onClick={() => toggleGoal(k)} style={{ padding:'8px 14px', borderRadius:10, border:`1px solid ${form.goals.includes(k)?'#3d9970':'#2e2e2e'}`, background:form.goals.includes(k)?'rgba(61,153,112,0.1)':'#222', color:form.goals.includes(k)?'#3d9970':'#9ca3af', cursor:'pointer', fontSize:13, fontWeight:500 }}>{v}</button>
              ))}
            </div>
          </div>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:16, border:'1px solid #2e2e2e' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Уровень подготовки</div>
            <div style={{ display:'flex', gap:8 }}>
              {Object.entries(LEVEL_LABELS).map(([k,v]) => (
                <button key={k} onClick={() => setForm(f => ({...f, level:k}))} style={{ flex:1, padding:'10px 6px', borderRadius:10, border:`1px solid ${form.level===k?'#3d9970':'#2e2e2e'}`, background:form.level===k?'rgba(61,153,112,0.1)':'#222', color:form.level===k?'#3d9970':'#9ca3af', cursor:'pointer', fontSize:11, fontWeight:form.level===k?700:400 }}>{v}</button>
              ))}
            </div>
          </div>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:16, border:'1px solid #2e2e2e' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Где тренируешься</div>
            <div style={{ fontSize:12, color:'#6b7280', marginBottom:12 }}>От этого зависит, какие упражнения предлагаются</div>
            <div style={{ display:'flex', gap:8 }}>
              {[['gym','Зал'],['home','Дом'],['both','Везде']].map(([k,v]) => (
                <button key={k} onClick={() => { setForm(f => ({...f, workoutPlace:k})); try { localStorage.setItem('workout-place-v1', k) } catch {} }} style={{ flex:1, padding:'12px 6px', borderRadius:10, border:`1px solid ${form.workoutPlace===k?'#3d9970':'#2e2e2e'}`, background:form.workoutPlace===k?'rgba(61,153,112,0.1)':'#222', color:form.workoutPlace===k?'#3d9970':'#9ca3af', cursor:'pointer', fontSize:13, fontWeight:form.workoutPlace===k?700:400 }}>{v}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {section === 'profile' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[['Рост (см)','height','number','180'],['Вес (кг)','weight','number','90'],['Возраст','age','number','28']].map(([label,key,type,ph]) => (
            <div key={key} style={{ background:'#1a1a1a', borderRadius:14, padding:'14px 16px', border:'1px solid #2e2e2e', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:14, color:'#9ca3af' }}>{label}</span>
              <input style={{ background:'transparent', border:'none', color:'#f5f5f5', fontSize:14, fontWeight:600, textAlign:'right', width:120, outline:'none' }} type={type} placeholder={ph} value={form[key]||''} onChange={e => setForm(f => ({...f,[key]:e.target.value}))} />
            </div>
          ))}
          <div style={{ background:'#1a1a1a', borderRadius:14, padding:'14px 16px', border:'1px solid #2e2e2e', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:14, color:'#9ca3af' }}>Пол</span>
            <select style={{ background:'transparent', border:'none', color:'#f5f5f5', fontSize:14, fontWeight:600, outline:'none' }} value={form.gender} onChange={e => setForm(f => ({...f,gender:e.target.value}))}>
              <option value="male" style={{ background:'#222' }}>Мужской</option>
              <option value="female" style={{ background:'#222' }}>Женский</option>
            </select>
          </div>
          <div style={{ background:'#1a1a1a', borderRadius:14, padding:'14px 16px', border:'1px solid #2e2e2e' }}>
            <div style={{ fontSize:13, color:'#9ca3af', marginBottom:8 }}>Активность</div>
            <select style={{ ...inp, background:'#222', borderRadius:8 }} value={form.activity} onChange={e => setForm(f => ({...f,activity:e.target.value}))}>
              {Object.entries(ACTIVITY_LABELS).map(([v,l]) => <option key={v} value={v} style={{ background:'#222' }}>{l}</option>)}
            </select>
          </div>
          {profile?.bmi && (
            <div style={{ background:'rgba(61,153,112,0.05)', borderRadius:14, padding:'14px 16px', border:'1px solid rgba(61,153,112,0.2)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:14, color:'#9ca3af' }}>ИМТ</span>
              <span style={{ fontSize:14, fontWeight:700, color:'#3d9970' }}>{profile.bmi}</span>
            </div>
          )}
        </div>
      )}

      {section === 'health' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:16, border:'1px solid #2e2e2e' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <AlertTriangle size={16} color="#fbbf24" />
              <div style={{ fontSize:14, fontWeight:600 }}>Ограничения и травмы</div>
            </div>
            <div style={{ fontSize:12, color:'#6b7280', marginBottom:10, lineHeight:1.5 }}>
              Опиши состояния, травмы и ограничения. AI учтёт их при составлении плана тренировок.
            </div>
            <textarea
              style={{ ...inp, resize:'none', minHeight:90, lineHeight:1.5, fontSize:14 }}
              placeholder="Например: коксартроз правого ТБС 2 степени, грыжа L4-L5, проблемы с коленями"
              value={form.limitationsText}
              onChange={e => setForm(f => ({ ...f, limitationsText: e.target.value }))}
              rows={4}
            />
            <button
              onClick={runAIAnalysis}
              disabled={analyzing || !form.limitationsText.trim()}
              style={{
                marginTop:10, width:'100%', background:'#3d9970', color:'#000', border:'none',
                borderRadius:12, padding:'12px', fontSize:13, fontWeight:700, cursor:'pointer',
                opacity: analyzing || !form.limitationsText.trim() ? 0.5 : 1,
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                textTransform:'uppercase', letterSpacing:0.5
              }}>
              <Sparkles size={14} />
              {analyzing ? 'Анализирую...' : 'Получить AI-анализ'}
            </button>
            {analyzeError && (
              <div style={{ marginTop:8, fontSize:12, color:'#f87171', background:'rgba(248,113,113,0.1)', padding:'8px 12px', borderRadius:8 }}>
                {analyzeError}
              </div>
            )}
          </div>

          {form.aiAnalysis && (
            <div style={{ background:'rgba(61,153,112,0.05)', borderRadius:16, padding:16, border:'1px solid rgba(61,153,112,0.25)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <Sparkles size={16} color="#3d9970" />
                <div style={{ fontSize:13, fontWeight:600, color:'#3d9970' }}>AI-анализ</div>
              </div>
              <div style={{ fontSize:13, color:'#d1d5db', lineHeight:1.6, whiteSpace:'pre-wrap' }}>
                {form.aiAnalysis}
              </div>
              <div style={{ marginTop:10, fontSize:11, color:'#6b7280', fontStyle:'italic' }}>
                Эти данные будут учтены при генерации AI-плана тренировок
              </div>
            </div>
          )}
        </div>
      )}

      {section === 'settings' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:16, border:'1px solid #2e2e2e' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: reminders.enabled ? 14 : 4 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Bell size={16} color="#3d9970" />
                <div style={{ fontSize:14, fontWeight:600 }}>Уведомления</div>
              </div>
              <button
                onClick={() => reminders.enabled ? updateReminders({ enabled: false }) : enableReminders()}
                style={{ width: 46, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', position: 'relative', background: reminders.enabled ? '#3d9970' : '#2e2e2e', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 3, left: reminders.enabled ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </button>
            </div>
            {notifPermission === 'unsupported' && (
              <div style={{ fontSize:12, color:'#6b7280' }}>Браузер не поддерживает уведомления</div>
            )}
            {notifPermission === 'denied' && (
              <div style={{ fontSize:12, color:'#f87171' }}>Уведомления заблокированы в настройках браузера — разрешите их вручную для этого сайта</div>
            )}
            {reminders.enabled && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ fontSize:11, color:'#6b7280', textTransform:'uppercase', letterSpacing:0.5 }}>Время приёмов пищи</div>
                {[['breakfast','Завтрак'],['lunch','Обед'],['dinner','Ужин']].map(([key, label]) => (
                  <div key={key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:13, color:'#d1d5db' }}>{label}</span>
                    <input type="time" value={reminders.meals?.[key] || '08:00'} onChange={e => updateMealTime(key, e.target.value)}
                      style={{ background:'#222', border:'1px solid #2e2e2e', borderRadius:8, color:'#f5f5f5', fontSize:13, padding:'6px 10px', fontFamily:'var(--mono)' }} />
                  </div>
                ))}
                <div style={{ height:1, background:'#2a2a2a', margin:'4px 0' }} />
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:13, color:'#d1d5db' }}>Напоминать про тренировку</span>
                  <button
                    onClick={() => updateReminders({ workout: { ...reminders.workout, enabled: !reminders.workout?.enabled } })}
                    style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', position: 'relative', background: reminders.workout?.enabled ? '#3d9970' : '#2e2e2e' }}>
                    <div style={{ position: 'absolute', top: 2, left: reminders.workout?.enabled ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </button>
                </div>
                {reminders.workout?.enabled && (
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:13, color:'#d1d5db' }}>Время тренировки</span>
                    <input type="time" value={reminders.workout?.time || '18:00'} onChange={e => updateReminders({ workout: { ...reminders.workout, time: e.target.value } })}
                      style={{ background:'#222', border:'1px solid #2e2e2e', borderRadius:8, color:'#f5f5f5', fontSize:13, padding:'6px 10px', fontFamily:'var(--mono)' }} />
                  </div>
                )}
                <div style={{ fontSize:11, color:'#6b7280', marginTop:4 }}>Уведомления работают, пока открыта вкладка или приложение свёрнуто</div>
              </div>
            )}
          </div>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:16, border:'1px solid #2e2e2e' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Цели КБЖУ</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[['Калории','calorieGoal','#f5f5f5'],['Белки (г)','proteinGoal','#3d9970'],['Жиры (г)','fatGoal','#fbbf24'],['Углев. (г)','carbGoal','#38bdf8']].map(([label,key,color]) => (
                <div key={key}>
                  <div style={{ fontSize:11, color, marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>{label}</div>
                  <input style={{ ...inp, borderColor:color==='#f5f5f5'?'#2e2e2e':color+'44' }} type="number" value={form[key]} onChange={e => setForm(f => ({...f,[key]:e.target.value}))} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:16, border:'1px solid #2e2e2e' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:600 }}>Кэш AI-продуктов</div>
                <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>Сохранённых: {cacheCount}</div>
              </div>
              <button onClick={handleClearCache} disabled={cacheCount === 0}
                style={{ padding:'8px 14px', borderRadius:10, background: cacheCleared ? '#329063' : 'rgba(239,68,68,0.1)', border:`1px solid ${cacheCleared ? '#329063' : 'rgba(239,68,68,0.3)'}`, color: cacheCleared ? '#000' : '#ef4444', cursor:'pointer', fontSize:12, fontWeight:600, opacity: cacheCount === 0 ? 0.4 : 1 }}>
                {cacheCleared ? '✓ Очищено' : 'Очистить'}
              </button>
            </div>
          </div>
        </div>
      )}

      <button onClick={handleSave} style={{ background: saved ? '#329063' : '#3d9970', color:'#000', border:'none', borderRadius:14, padding:'15px', fontSize:15, fontWeight:700, cursor:'pointer', textTransform:'uppercase', letterSpacing:0.5 }}>
        {saved ? '✓ Сохранено!' : 'Сохранить'}
      </button>
    </div>
  )
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, profile, signOut, aiCall, entries, saveEntry, saveProfile } = useStore()
  const [tab, setTab] = useState('home')
  const name = profile?.name || user?.user_metadata?.name || 'Спортсмен'
  useReminders()

  const [water, setWater] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('water-state-v2') || '{}')
      const todayKey = new Date().toISOString().split('T')[0]
      const weight = profile?.weight || 80
      const goalMl = Math.min(Math.max(Math.round(weight * 30 / 100) * 100, 1500), 4000)
      const waterGoal = Math.round(goalMl / 250)
      return { goal: saved.goal || waterGoal, consumed: saved.date === todayKey ? (saved.consumed || 0) : 0, date: todayKey }
    } catch { return { goal: 8, consumed: 0, date: new Date().toISOString().split('T')[0] } }
  })

  useEffect(() => { localStorage.setItem('water-state-v2', JSON.stringify(water)) }, [water])

  const state = { entries: entries || [], profile, water }
  const dispatch = (action) => {
    switch (action.type) {
      case 'SAVE_ENTRY': saveEntry(action.entry); break
      case 'SET_WATER':  setWater(w => ({ ...w, consumed: action.val })); break
    }
  }

  // Новый порядок: Главная → Питание → Тренировки → Прогресс → Профиль
  const tabs = [
    { id:'home',     label:'Главная',    Icon:NavHome },
    { id:'food',     label:'Питание',    Icon:NavFood },
    { id:'workout',  label:'Тренировки', Icon:NavWorkout },
    { id:'analysis', label:'Прогресс',   Icon:NavProgress },
    { id:'profile',  label:'Профиль',    Icon:NavUser },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {tab === 'home'     && <HomeScreen     state={state} dispatch={dispatch} goTo={setTab} name={name} aiCall={aiCall} />}
        {tab === 'food'     && <FoodScreen     state={state} dispatch={dispatch} aiCall={aiCall} />}
        {tab === 'analysis' && <ProgressScreen state={state} />}
        {tab === 'workout'  && <WorkoutScreen  state={state} dispatch={dispatch} aiCall={aiCall} />}
        {tab === 'profile'  && <ProfileScreen  profile={profile} saveProfile={saveProfile} signOut={signOut} aiCall={aiCall} />}
      </div>
      <div style={{ display:'flex', borderTop:'1px solid #1e1e1e', background:'#111', paddingBottom:'env(safe-area-inset-bottom, 0px)', flexShrink:0 }}>
        {tabs.map(({ id, label, Icon }) => {
          const isActive = tab === id
          return (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'10px 4px 8px', background:'transparent', border:'none', cursor:'pointer', position:'relative' }}>
              <Icon color={isActive ? '#3d9970' : '#4b5563'} size={22} />
              <span style={{ fontSize:9, color:isActive?'#3d9970':'#4b5563', fontWeight:isActive?700:400, letterSpacing:0.3 }}>{label}</span>
              {isActive && <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:20, height:2, background:'#3d9970', borderRadius:'0 0 2px 2px' }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
