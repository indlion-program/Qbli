import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: number
  text: string
  type: ToastType
  duration: number
}

interface ToastProps {
  messages: ToastMessage[]
  onDismiss: (id: number) => void
}

export function Toast({ messages, onDismiss }: ToastProps) {
  return (
    <div className="fixed top-16 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4">
      {messages.map(msg => (
        <ToastItem key={msg.id} msg={msg} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({ msg, onDismiss }: { msg: ToastMessage; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDismiss(msg.id), 300)
    }, msg.duration)
    return () => clearTimeout(timer)
  }, [msg.id, msg.duration, onDismiss])

  const bg =
    msg.type === 'success' ? 'bg-primary' :
    msg.type === 'error'   ? 'bg-red-500'  :
    'bg-gray-800'

  return (
    <div
      className={`pointer-events-auto px-5 py-3 rounded-xl text-white text-sm font-medium shadow-lg transition-all duration-300 max-w-xs w-full text-center ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      } ${bg}`}
      style={{ whiteSpace: 'pre-line' }}
    >
      {msg.text}
    </div>
  )
}

let _toastId = 0

export function useToast() {
  const [messages, setMessages] = useState<ToastMessage[]>([])

  function showToast(text: string, type: ToastType = 'success', duration = 2500) {
    const id = ++_toastId
    setMessages(prev => [...prev, { id, text, type, duration }])
  }

  function dismissToast(id: number) {
    setMessages(prev => prev.filter(m => m.id !== id))
  }

  return { messages, showToast, dismissToast }
}
