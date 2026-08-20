import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera, Flashlight, Focus, Keyboard, X, ZoomIn } from 'lucide-react'
import styles from './BarcodeScanner.module.css'

const BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'data_matrix']

function stopStream(stream) {
  stream?.getTracks().forEach(track => track.stop())
}

export default function BarcodeScanner({ onDetect, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const detectorRef = useRef(null)
  const zxingRef = useRef(null)
  const animationFrameRef = useRef(null)
  const detectedRef = useRef(false)
  const stableCodeRef = useRef({ code: '', count: 0, at: 0 })
  const lastScanRef = useRef(0)
  const scanNumberRef = useRef(0)
  const onDetectRef = useRef(onDetect)
  onDetectRef.current = onDetect

  const [error, setError] = useState(null)
  const [manualCode, setManualCode] = useState('')
  const [manualMode, setManualMode] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [zoom, setZoom] = useState(null)
  const [focusPulse, setFocusPulse] = useState(false)
  const [status, setStatus] = useState('Открываем камеру')
  const [cameraAttempt, setCameraAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    if (manualMode) {
      stopStream(streamRef.current)
      streamRef.current = null
      return undefined
    }

    const start = async () => {
      setError(null)
      setStatus('Открываем камеру')
      detectedRef.current = false
      stableCodeRef.current = { code: '', count: 0, at: 0 }

      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('CAMERA_UNSUPPORTED')

        if (!zxingRef.current) {
          const { BrowserMultiFormatReader } = await import('@zxing/browser')
          zxingRef.current = new BrowserMultiFormatReader()
        }

        if ('BarcodeDetector' in window) {
          const supported = await window.BarcodeDetector.getSupportedFormats?.().catch(() => BARCODE_FORMATS)
          const formats = BARCODE_FORMATS.filter(format => !supported || supported.includes(format))
          detectorRef.current = formats.length ? new window.BarcodeDetector({ formats }) : null
        }

        // Важно: не выбираем физическую camera2 по индексу.
        // На Android это часто открывало ультраширокую/нефокусирующуюся линзу.
        // Просим браузер открыть именно системную основную заднюю камеру.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        })

        if (cancelled) {
          stopStream(stream)
          return
        }

        stopStream(streamRef.current)
        streamRef.current = stream
        const [track] = stream.getVideoTracks()
        const capabilities = track?.getCapabilities?.() || {}

        // Автофокус включаем сразу после открытия камеры.
        if (capabilities.focusMode?.includes('continuous')) {
          await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {})
        }

        setTorchSupported(Boolean(capabilities.torch))
        setTorchOn(false)

        if (capabilities.zoom) {
          const settings = track.getSettings?.() || {}
          const value = Math.min(capabilities.zoom.max, Math.max(capabilities.zoom.min, settings.zoom || capabilities.zoom.min))
          setZoom({ min: capabilities.zoom.min, max: capabilities.zoom.max, step: capabilities.zoom.step || 0.1, value })
        } else {
          setZoom(null)
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        setStatus('Наведите код на рамку')

        const confirmCode = code => {
          const now = Date.now()
          const previous = stableCodeRef.current
          const isSame = previous.code === code && now - previous.at < 1400
          const count = isSame ? previous.count + 1 : 1
          stableCodeRef.current = { code, count, at: now }
          setStatus(count === 1 ? 'Проверяем код' : 'Код распознан')

          if (count >= 2 && !detectedRef.current) {
            detectedRef.current = true
            navigator.vibrate?.(70)
            onDetectRef.current(code)
          }
        }

        const tick = async time => {
          if (cancelled || detectedRef.current || !videoRef.current || !canvasRef.current) return

          if (time - lastScanRef.current >= 120 && videoRef.current.readyState >= 2) {
            lastScanRef.current = time
            scanNumberRef.current += 1
            const video = videoRef.current
            const canvas = canvasRef.current
            const sourceWidth = video.videoWidth
            const sourceHeight = video.videoHeight

            // Более узкая центральная область даёт больше реальных пикселей штрихкоду.
            const cropWidth = Math.round(sourceWidth * 0.78)
            const cropHeight = Math.round(Math.min(sourceHeight * 0.44, cropWidth * 0.48))
            const sourceX = Math.round((sourceWidth - cropWidth) / 2)
            const sourceY = Math.round((sourceHeight - cropHeight) / 2)
            canvas.width = Math.min(cropWidth, 1400)
            canvas.height = Math.round(canvas.width * cropHeight / cropWidth)
            const context = canvas.getContext('2d', { willReadFrequently: true })
            context.drawImage(video, sourceX, sourceY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height)

            let code = ''
            try {
              const detected = detectorRef.current ? await detectorRef.current.detect(canvas) : []
              code = detected[0]?.rawValue || ''
            } catch {}

            if (!code && scanNumberRef.current % 3 === 0) {
              try {
                code = zxingRef.current?.decodeFromCanvas(canvas)?.getText?.() || ''
              } catch {}
            }

            if (code) confirmCode(code)
          }

          animationFrameRef.current = requestAnimationFrame(tick)
        }

        animationFrameRef.current = requestAnimationFrame(tick)
      } catch (cameraError) {
        console.error('camera start error:', cameraError)
        setError('Не удалось настроить камеру. Введите код вручную или попробуйте ещё раз.')
        setStatus('Камера недоступна')
      }
    }

    start()

    return () => {
      cancelled = true
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      stopStream(streamRef.current)
      streamRef.current = null
    }
  }, [manualMode, cameraAttempt])

  const handleTapFocus = async () => {
    const [track] = streamRef.current?.getVideoTracks() || []
    if (!track) return
    const capabilities = track.getCapabilities?.() || {}
    setFocusPulse(true)
    setStatus('Наводим резкость')

    try {
      if (capabilities.focusMode?.includes('single-shot')) {
        await track.applyConstraints({ advanced: [{ focusMode: 'single-shot' }] })
        if (capabilities.focusMode.includes('continuous')) {
          setTimeout(() => track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {}), 900)
        }
      } else if (capabilities.focusMode?.includes('continuous')) {
        await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] })
      }
    } catch {}

    setTimeout(() => {
      setFocusPulse(false)
      setStatus('Наведите код на рамку')
    }, 800)
  }

  const toggleTorch = async () => {
    const [track] = streamRef.current?.getVideoTracks() || []
    if (!track) return
    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] })
      setTorchOn(next)
    } catch {
      setTorchSupported(false)
    }
  }

  const changeZoom = async value => {
    const next = Number(value)
    setZoom(current => current ? { ...current, value: next } : current)
    const [track] = streamRef.current?.getVideoTracks() || []
    if (!track) return
    await track.applyConstraints({ advanced: [{ zoom: next }] }).catch(() => {})
  }

  const submitManualCode = () => {
    if (/^\d{8,14}$/.test(manualCode)) onDetectRef.current(manualCode)
  }

  return createPortal(
    <div className={styles.scanner}>
      <header className={styles.header}>
        <button type="button" onClick={onClose} aria-label="Закрыть сканер"><X size={19} /></button>
        <div><strong>Сканер продукта</strong><span>{status}</span></div>
        <button type="button" onClick={() => setManualMode(current => !current)} aria-label="Ввести код вручную">
          {manualMode ? <Camera size={18} /> : <Keyboard size={18} />}
        </button>
      </header>

      {!manualMode && !error ? (
        <main className={styles.camera} onClick={handleTapFocus}>
          <video ref={videoRef} playsInline muted />
          <canvas ref={canvasRef} className={styles.captureCanvas} />
          <div className={styles.shade} />
          <div className={`${styles.frame} ${focusPulse ? styles.focusing : ''}`}>
            <i /><i /><i /><i />
            {focusPulse && <Focus size={25} />}
          </div>

          <div className={styles.cameraControls} onClick={event => event.stopPropagation()}>
            <div className={styles.controlRow}>
              {torchSupported && (
                <button type="button" className={torchOn ? styles.activeControl : ''} onClick={toggleTorch}>
                  <Flashlight size={17} /><span>Свет</span>
                </button>
              )}
              <button type="button" onClick={handleTapFocus}><Focus size={17} /><span>Фокус</span></button>
            </div>

            {zoom && zoom.max > zoom.min && (
              <label className={styles.zoomControl}>
                <ZoomIn size={16} />
                <input type="range" min={zoom.min} max={zoom.max} step={zoom.step} value={zoom.value} onChange={event => changeZoom(event.target.value)} />
                <span>{zoom.value.toFixed(1)}×</span>
              </label>
            )}
          </div>
        </main>
      ) : (
        <main className={styles.manual}>
          {error && <p className={styles.error}>{error}</p>}
          <Keyboard size={30} />
          <h2>Введите штрихкод</h2>
          <p>Цифры находятся под полосами на упаковке.</p>
          <input
            type="text"
            inputMode="numeric"
            value={manualCode}
            onChange={event => setManualCode(event.target.value.replace(/\D/g, '').slice(0, 14))}
            placeholder="4607034470155"
            autoFocus
          />
          <button type="button" onClick={submitManualCode} disabled={!/^\d{8,14}$/.test(manualCode)}>Найти продукт</button>
          {error && <button type="button" className={styles.secondary} onClick={() => { setError(null); setManualMode(false); setCameraAttempt(current => current + 1) }}>Попробовать камеру снова</button>}
        </main>
      )}
    </div>,
    document.body,
  )
}
