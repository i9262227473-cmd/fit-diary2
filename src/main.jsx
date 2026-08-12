import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
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
