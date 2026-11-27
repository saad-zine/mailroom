import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Landing from './landing/Landing.tsx'

// The marketing page lives at /, the product at /app. Keeping the split at
// the entry point means the app never has to reason about public routes.
const path = window.location.pathname.replace(/\/+$/, '')
const isApp = path === '/app' || path.startsWith('/app/')

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isApp ? <App /> : <Landing />}</StrictMode>,
)
