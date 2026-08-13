import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export async function lookupBarcode(code) {
  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_ru,nutriments`,
  )

  if (!response.ok) throw new Error('HTTP_ERROR')

  const data = await response.json()
  if (data.status !== 1 || !data.product) return null

  const product = data.product
  const nutrients = product.nutriments || {}

  return {
    name: product.product_name_ru || product.product_name || `Штрихкод ${code}`,
    cal100: Math.round(nutrients['energy-kcal_100g'] || nutrients['energy-kcal'] || 0),
    prot100: Math.round((nutrients.proteins_100g || 0) * 10) / 10,
    fat100: Math.round((nutrients.fat_100g || 0) * 10) / 10,
    carbs100: Math.round((nutrients.carbohydrates_100g || 0) * 10) / 10,
  }
}

export default function BarcodeScanner({ onDetect, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const detectorRef = useRef(null)
  const animationFrameRef = useRef(null)
  const [error, setError] = useState(null)
  const [manualCode, setManualCode] = useState('')
  const [manualMode, setManualMode] = useState(false)

  const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window

  useEffect(() => {
    let cancelled = false

    if (!supported) {
      setError('Браузер не поддерживает автосканирование — введите штрихкод вручную')
      return undefined
    }

    const start = async () => {
      try {
        detectorRef.current = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'data_matrix'],
        })

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            advanced: [{ focusMode: 'continuous' }],
          },
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream

        try {
          const [track] = stream.getVideoTracks()
          const capabilities = track.getCapabilities ? track.getCapabilities() : {}
          if (capabilities.focusMode?.includes('continuous')) {
            await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] })
          }
        } catch {}

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        const tick = async () => {
          if (cancelled || !videoRef.current || !detectorRef.current) return

          try {
            const codes = await detectorRef.current.detect(videoRef.current)
            if (codes.length > 0) {
              onDetect(codes[0].rawValue)
              return
            }
          } catch {}

          animationFrameRef.current = requestAnimationFrame(tick)
        }

        tick()
      } catch {
        setError('Не удалось получить доступ к камере — введите штрихкод вручную')
      }
    }

    start()

    return () => {
      cancelled = true
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleTapFocus = async () => {
    try {
      const [track] = streamRef.current?.getVideoTracks() || []
      if (!track) return

      const capabilities = track.getCapabilities ? track.getCapabilities() : {}
      if (capabilities.focusMode?.includes('single-shot')) {
        await track.applyConstraints({ advanced: [{ focusMode: 'single-shot' }] })
      }
    } catch {}
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 700, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 16, background: '#0e0e0e' }}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть сканер"
          style={{ width: 36, height: 36, borderRadius: 10, background: '#1a1a1a', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={18} color="#9ca3af" />
        </button>

        <span style={{ fontSize: 16, fontWeight: 700, color: '#f5f5f5', flex: 1 }}>Сканер кода</span>

        {supported && !error && (
          <button
            type="button"
            onClick={() => setManualMode((current) => !current)}
            style={{ padding: '7px 12px', borderRadius: 8, background: manualMode ? 'var(--accent)' : 'var(--surface)', border: '1px solid var(--border)', color: manualMode ? 'var(--accent-contrast)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
          >
            {manualMode ? 'Камера' : 'Ввести вручную'}
          </button>
        )}
      </div>

      {supported && !error && !manualMode ? (
        <div onClick={handleTapFocus} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '70%', height: 120, border: '2px solid var(--accent)', borderRadius: 12, boxShadow: '0 0 0 2000px rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center', color: '#f5f5f5', fontSize: 13 }}>
            Наведите QR- или штрихкод на рамку · коснитесь экрана для фокуса
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
          {error && <div style={{ fontSize: 13, color: '#f87171', textAlign: 'center' }}>{error}</div>}
          <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>
            Введите штрихкод вручную (цифры под штрих-кодом на упаковке)
          </div>
          <input
            type="text"
            inputMode="numeric"
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value.replace(/\D/g, ''))}
            placeholder="4607034470155"
            style={{ width: '100%', maxWidth: 280, padding: '13px 16px', background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: 12, color: '#f5f5f5', fontSize: 16, textAlign: 'center', fontFamily: 'var(--mono)', outline: 'none', boxSizing: 'border-box' }}
          />
          <button
            type="button"
            onClick={() => manualCode.length >= 6 && onDetect(manualCode)}
            disabled={manualCode.length < 6}
            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 12, padding: '13px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: manualCode.length < 6 ? 0.4 : 1, textTransform: 'uppercase', letterSpacing: 0.5 }}
          >
            Найти
          </button>
        </div>
      )}
    </div>,
    document.body,
  )
}
