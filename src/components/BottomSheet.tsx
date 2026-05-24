import type { ReactNode } from 'react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
}

export function BottomSheet({ open, onClose, children, title }: BottomSheetProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-9 h-1 bg-gray-300 rounded-full" />
        </div>
        {title && (
          <div className="px-5 pb-2 border-b border-gray-100 shrink-0">
            <h2 className="text-base font-semibold text-gray-900 text-center">{title}</h2>
          </div>
        )}
        <div className="overflow-y-auto flex-1 px-5 py-4 pb-safe">
          {children}
        </div>
      </div>
    </div>
  )
}
