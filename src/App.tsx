import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Onboarding } from './pages/Onboarding'
import { Home } from './pages/Home'
import { NewReceipt } from './pages/NewReceipt'
import { Clients } from './pages/Clients'
import { Reports } from './pages/Reports'
import { Settings } from './pages/Settings'
import { getSettings } from './utils/db'

type AppState = 'loading' | 'onboarding' | 'ready'

export default function App() {
  const [state, setState] = useState<AppState>('loading')

  async function checkOnboarding() {
    const s = await getSettings()
    if (s.bizName.trim()) {
      setState('ready')
    } else {
      setState('onboarding')
    }
  }

  useEffect(() => {
    checkOnboarding()
  }, [])

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-bold">Q</span>
          </div>
          <p className="text-gray-400 text-sm">טוען...</p>
        </div>
      </div>
    )
  }

  if (state === 'onboarding') {
    return <Onboarding onComplete={() => setState('ready')} />
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new-receipt" element={<NewReceipt />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Navbar />
    </div>
  )
}
