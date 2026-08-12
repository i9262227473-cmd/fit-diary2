export const THEME_STORAGE_KEY = 'fit-diary-theme-v1'

export const THEMES = [
  { id: 'apple-dark', name: 'Apple Dark', description: 'Чёрный, графит и спокойный синий', swatches: ['#000000', '#1c1c1e', '#0a84ff'] },
  { id: 'apple-light', name: 'Apple Light', description: 'Белый, светло-серый и чистый синий', swatches: ['#f5f5f7', '#ffffff', '#0071e3'] },
  { id: 'sport', name: 'Sport', description: 'Тёмный фон и спортивный изумрудный', swatches: ['#080b0a', '#18201d', '#2bc477'] },
  { id: 'warm', name: 'Warm', description: 'Светлый фон и тёплый оранжевый', swatches: ['#f5f1ea', '#fffaf3', '#d96c2f'] },
]

export function getSavedTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    return THEMES.some(theme => theme.id === saved) ? saved : 'apple-dark'
  } catch {
    return 'apple-dark'
  }
}

export function applyTheme(theme) {
  const nextTheme = THEMES.some(item => item.id === theme) ? theme : 'apple-dark'
  document.documentElement.dataset.theme = nextTheme
  document.documentElement.style.colorScheme = nextTheme.includes('light') || nextTheme === 'warm' ? 'light' : 'dark'
  try { localStorage.setItem(THEME_STORAGE_KEY, nextTheme) } catch {}
  return nextTheme
}
