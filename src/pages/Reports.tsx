import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { TopBar } from '../components/TopBar'
import { ReceiptCard } from '../components/ReceiptCard'
import type { Receipt, Client, Product, AppSettings } from '../types'
import { getReceipts, getClients, getProducts, getSettings } from '../utils/db'
import { formatCurrency, getMonthName } from '../utils/format'
import { exportCSV, exportBackup } from '../utils/export'

type Tab = 'monthly' | 'yearly' | 'all'

export function Reports() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('monthly')
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())

  const load = useCallback(async () => {
    const [r, c, p, s] = await Promise.all([getReceipts(), getClients(), getProducts(), getSettings()])
    setReceipts(r)
    setClients(c)
    setProducts(p)
    setSettings(s)
  }, [])

  useEffect(() => { load() }, [load])

  function filteredReceipts(): Receipt[] {
    if (tab === 'monthly') {
      const start = new Date(year, month, 1).getTime()
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime()
      return receipts.filter(r => r.ts >= start && r.ts <= end)
    }
    if (tab === 'yearly') {
      const start = new Date(year, 0, 1).getTime()
      const end = new Date(year, 11, 31, 23, 59, 59, 999).getTime()
      return receipts.filter(r => r.ts >= start && r.ts <= end)
    }
    return receipts
  }

  const filtered = filteredReceipts()
  const totalIncome = filtered.reduce((s, r) => s + r.total, 0)
  const avg = filtered.length > 0 ? totalIncome / filtered.length : 0

  function getChartData(): { label: string; value: number }[] {
    if (tab === 'monthly') {
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      return Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1
        const start = new Date(year, month, day).getTime()
        const end = new Date(year, month, day, 23, 59, 59, 999).getTime()
        const value = filtered.filter(r => r.ts >= start && r.ts <= end).reduce((s, r) => s + r.total, 0)
        return { label: String(day), value }
      })
    }
    return Array.from({ length: 12 }, (_, i) => {
      const start = new Date(year, i, 1).getTime()
      const end = new Date(year, i + 1, 0, 23, 59, 59, 999).getTime()
      const value = filtered.filter(r => r.ts >= start && r.ts <= end).reduce((s, r) => s + r.total, 0)
      return { label: getMonthName(i).slice(0, 3), value }
    })
  }

  const chartData = tab !== 'all' ? getChartData() : []
  const maxVal = Math.max(...chartData.map(d => d.value), 1)

  const years = Array.from(new Set(receipts.map(r => new Date(r.ts).getFullYear()))).sort((a, b) => b - a)
  if (!years.includes(now.getFullYear())) years.unshift(now.getFullYear())

  function handleExportCSV() {
    exportCSV(filtered)
  }

  function handleExportBackup() {
    if (!settings) return
    exportBackup({ receipts, clients, products, settings })
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface pb-20">
      <TopBar title={t('nav.reports')} />

      <div className="px-4 pt-4 flex flex-col gap-4">
        {/* Tab switcher */}
        <div className="bg-white rounded-xl border border-[#E5E5E3]/50 p-1 flex">
          {(['monthly', 'yearly', 'all'] as Tab[]).map(tabVal => (
            <button
              key={tabVal}
              onClick={() => setTab(tabVal)}
              className={`flex-1 py-2 text-sm rounded-lg font-medium transition-colors ${
                tab === tabVal ? 'bg-primary text-white' : 'text-gray-500'
              }`}
            >
              {tabVal === 'monthly' ? t('reports.monthly') : tabVal === 'yearly' ? t('reports.yearly') : t('reports.all')}
            </button>
          ))}
        </div>

        {/* Period selectors */}
        {tab === 'monthly' && (
          <div className="flex gap-2">
            <select
              value={month}
              onChange={e => setMonth(parseInt(e.target.value))}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>{getMonthName(i)}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={e => setYear(parseInt(e.target.value))}
              className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}

        {tab === 'yearly' && (
          <select
            value={year}
            onChange={e => setYear(parseInt(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}

        {/* Metric cards */}
        <div className="grid grid-cols-3 gap-2">
          <MiniMetric label={t('reports.income')} value={formatCurrency(totalIncome)} />
          <MiniMetric label={t('reports.count')} value={String(filtered.length)} />
          <MiniMetric label={t('reports.avg')} value={formatCurrency(avg)} />
        </div>

        {/* Bar chart */}
        {tab !== 'all' && chartData.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E5E5E3]/50 p-4">
            <h3 className="text-xs font-semibold text-gray-600 mb-3">הכנסות</h3>
            <div className="flex items-end gap-0.5 h-24 overflow-x-auto">
              {chartData.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5 flex-1 min-w-[6px]">
                  <div
                    className="w-full bg-primary rounded-sm transition-all"
                    style={{ height: `${Math.max(2, (d.value / maxVal) * 80)}px` }}
                    title={`${d.label}: ${formatCurrency(d.value)}`}
                  />
                  {chartData.length <= 12 && (
                    <span className="text-[8px] text-gray-400 leading-none">{d.label}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Receipt list */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">קבלות ({filtered.length})</h3>
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E5E5E3]/50 p-6 text-center text-sm text-gray-400">
              אין קבלות בתקופה זו
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map(r => <ReceiptCard key={r.id} receipt={r} />)}
            </div>
          )}
        </div>

        {/* Export buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleExportCSV}
            className="border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium"
          >
            {t('reports.exportCSV')}
          </button>
          <button
            onClick={handleExportBackup}
            className="border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium"
          >
            {t('reports.exportBackup')}
          </button>
        </div>
      </div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E5E3]/50 p-3">
      <p className="text-[10px] text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-gray-900 truncate">{value}</p>
    </div>
  )
}
