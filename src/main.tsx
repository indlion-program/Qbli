import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import './i18n'
import './index.css'
import App from './App.tsx'

Sentry.init({
  dsn: 'https://04bd0151f5fb4a77d2b173355b94873c@o4511460828184576.ingest.de.sentry.io/4511460834541648',
  environment: import.meta.env.MODE,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.2,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
