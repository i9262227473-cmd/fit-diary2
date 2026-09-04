import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import './workoutActiveRedesign.css'
import { patchLocalStorage } from './pages/planPatch'
import { applyTheme, getSavedTheme } from './theme'

// Сброс битого кэша перед рендером
patchLocalStorage()
applyTheme(getSavedTheme())

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)

// Сервис-воркер: кэширует оболочку приложения, чтобы оно открывалось офлайн
// (см. public/sw.js). hadController фиксирует, был ли ДО этой загрузки
// активный воркер — если да, и он сменился на новый (значит вышел свежий
// деплой), один раз тихо перезагружаем страницу, чтобы пользователь сразу
// увидел новую версию, а не старый JS, оставшийся в памяти вкладки. При
// самой первой установке воркера (hadController === false) controllerchange
// тоже может сработать, но перезагрузка в этом случае не нужна.
if ('serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller)
  let refreshing = false

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || refreshing) return
    refreshing = true
    window.location.reload()
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
