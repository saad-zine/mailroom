import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Local dev: the frontend calls the API relatively (same origin),
  // so proxy /api to the backend on :8000. On Vercel the rewrite in
  // vercel.json does this instead — no proxy needed there.
  server: {
    allowedHosts: ['sb-6nbgb55racpr.vercel.run', 'sb-5sid66dmse1q.vercel.run'],
    proxy: {
      '/api': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
})
