export const THEME_STORAGE_KEY = 'fit-diary-theme-v1'

export const THEMES = [
  { id: 'apple-dark', name: 'Apple Dark', description: 'Чёрный, графит и спокойный синий', swatches: ['#000000', '#1c1c1e', '#0a84ff'] },
  { id: 'apple-light', name: 'Apple Light', description: 'Белый, светло-серый и чистый синий', swatches: ['#f5f5f7', '#ffffff', '#0071e3'] },
  { id: 'sport', name: 'Fit Diary Original', description: 'Тёмно-синий интерфейс с универсальным синим акцентом', swatches: ['#07101a', '#172330', '#2f80ed'] },
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
