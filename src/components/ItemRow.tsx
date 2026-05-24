import type { ReceiptItem } from '../types'

interface ItemRowProps {
  item: ReceiptItem
  index: number
  suggestions?: string[]
  onChange: (index: number, field: keyof ReceiptItem, value: string | number) => void
  onDelete: (index: number) => void
}

export function ItemRow({ item, index, suggestions = [], onChange, onDelete }: ItemRowProps) {
  return (
    <div className="flex gap-2 items-center">
      <div className="relative flex-1">
        <input
          type="text"
          value={item.desc}
          onChange={e => onChange(index, 'desc', e.target.value)}
          placeholder="תיאור"
          list={`suggestions-${index}`}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
        />
        {suggestions.length > 0 && (
          <datalist id={`suggestions-${index}`}>
            {suggestions.map(s => (
              <option key={s} value={s} />
            ))}
          </datalist>
        )}
      </div>
      <input
        type="number"
        value={item.qty}
        min={1}
        onChange={e => onChange(index, 'qty', parseFloat(e.target.value) || 1)}
        placeholder="כמות"
        className="w-14 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center bg-white focus:outline-none focus:border-primary"
      />
      <input
        type="number"
        value={item.price}
        min={0}
        step={0.01}
        onChange={e => onChange(index, 'price', parseFloat(e.target.value) || 0)}
        placeholder="מחיר"
        className="w-20 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center bg-white focus:outline-none focus:border-primary"
      />
      <button
        onClick={() => onDelete(index)}
        className="text-red-400 text-xl leading-none px-1 shrink-0"
        aria-label="מחק שורה"
      >
        ×
      </button>
    </div>
  )
}
