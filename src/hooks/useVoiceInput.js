import { useEffect, useRef, useState } from 'react'

/**
 * Голосовой ввод через браузерный Web Speech API.
 * Поддерживается в Chrome/Android и современных версиях Safari при работе по HTTPS.
 */
export function useVoiceInput(onResult) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)
  const onResultRef = useRef(onResult)

  onResultRef.current = onResult

  const supported = typeof window !== 'undefined'
    && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)

  const stop = () => {
    if (!recognitionRef.current) return

    try {
      recognitionRef.current.stop()
    } catch {
      // Распознавание уже могло завершиться самостоятельно.
    }
  }

  const start = () => {
    if (!supported || listening) return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.lang = 'ru-RU'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognition.onresult = event => {
      const text = Array.from(event.results)
        .map(result => result[0].transcript)
        .join(' ')
        .trim()

      if (text) onResultRef.current?.(text)
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch {
      setListening(false)
    }
  }

  useEffect(() => () => stop(), [])

  return { supported, listening, start, stop }
}
