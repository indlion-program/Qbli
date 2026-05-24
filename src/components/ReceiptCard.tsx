import type { Receipt } from '../types'
import { formatCurrency } from '../utils/format'

interface ReceiptCardProps {
  receipt: Receipt
  onClick?: () => void
}

export function ReceiptCard({ receipt, onClick }: ReceiptCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-[#E5E5E3]/50 p-4 flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-gray-400">#{receipt.id}</span>
        <span className="text-sm font-medium text-gray-800">{receipt.clientName || '—'}</span>
        <span className="text-xs text-gray-400">{receipt.date}</span>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span className="font-semibold text-gray-900">{formatCurrency(receipt.total)}</span>
        {receipt.discount > 0 && (
          <span className="text-xs text-red-400">הנחה {formatCurrency(receipt.discount)}</span>
        )}
      </div>
    </div>
  )
}
