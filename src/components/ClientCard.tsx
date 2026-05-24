import type { Client } from '../types'

interface ClientCardProps {
  client: Client
  receiptCount?: number
  totalPaid?: number
  onClick?: () => void
}

export function ClientCard({ client, receiptCount = 0, totalPaid = 0, onClick }: ClientCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-[#E5E5E3]/50 p-4 cursor-pointer active:bg-gray-50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="font-medium text-gray-900 truncate">{client.name}</span>
          {client.email && <span className="text-xs text-gray-400 truncate">{client.email}</span>}
          {client.phone && <span className="text-xs text-gray-400">{client.phone}</span>}
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0 mr-3">
          <span className="text-sm font-semibold text-gray-900">₪{totalPaid.toFixed(0)}</span>
          <span className="text-xs text-gray-400">{receiptCount} קבלות</span>
        </div>
      </div>
    </div>
  )
}
