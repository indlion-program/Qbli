import { useNavigate } from 'react-router-dom'

interface TopBarProps {
  title: string
  showBack?: boolean
  right?: React.ReactNode
}

export function TopBar({ title, showBack, right }: TopBarProps) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between">
      <div className="w-10">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="text-2xl text-gray-500 leading-none"
            aria-label="חזור"
          >
            ›
          </button>
        )}
      </div>
      <span className="font-semibold text-gray-900 text-base">{title}</span>
      <div className="w-10 flex justify-end">{right}</div>
    </header>
  )
}
