import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: "/fit-diary2/",
  plugins: [react()],
  server: {
    proxy: {
      '/ai': 'http://localhost:3000',
      '/ai-vision': 'http://localhost:3000',
    }
  }
})

