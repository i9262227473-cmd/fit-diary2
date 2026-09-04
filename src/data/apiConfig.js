// Адрес собственного бэкенда (Timeweb, HTTPS через nginx).
// Вынесено в отдельный модуль, чтобы его могли использовать и store/index.js,
// и data/cloudSync.js без циклического импорта друг друга.
export const API_URL = import.meta.env.VITE_API_URL || 'https://api.sudbase.ru'
