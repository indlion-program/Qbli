import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TopBar } from '../components/TopBar'
import { ReceiptCard } from '../components/ReceiptCard'
import { BottomSheet } from '../components/BottomSheet'
import { Toast, useToast } from '../components/Toast'
import type { Receipt, Client, AppSettings } from '../types'
import { getReceipts, getClients, getSettings, deleteReceipt } from '../utils/db'
import { formatCurrency, getCurrentMonthRange, getCurrentYearRange } from '../utils/format'
import { openReceiptWindow } from '../utils/pdf'
import { shareByNative, shareByEmail, shareByWhatsApp } from '../utils/share'

export function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { messages, showToast, dismissToast } = useToast()

  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [selected, setSelected] = useState<Receipt | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = useCallback(async () => {
    const [r, c, s] = await Promise.all([getReceipts(), getClients(), getSettings()])
    setReceipts(r)
    setClients(c)
    setSettings(s)
  }, [])

  useEffect(() => { load() }, [load])

  const monthRange = getCurrentMonthRange()
  const yearRange = getCurrentYearRange()

  const monthTotal = receipts
    .filter(r => r.ts >= monthRange.start && r.ts <= monthRange.end)
    .reduce((s, r) => s + r.total, 0)

  const yearTotal = receipts
    .filter(r => r.ts >= yearRange.start && r.ts <= yearRange.end)
    .reduce((s, r) => s + r.total, 0)

  async function handleDelete() {
    if (!selected) return
    await deleteReceipt(selected.id)
    showToast('הקבלה נמחקה', 'success')
    setSelected(null)
    setConfirmDelete(false)
    load()
  }

  function handleOpenReceipt() {
    if (!selected || !settings) return
    openReceiptWindow(selected, settings)
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface pb-20">
      <TopBar title="Qbli" />
      <Toast messages={messages} onDismiss={dismissToast} />

      <div className="px-4 pt-4 flex flex-col gap-4">
        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label={t('home.thisMonth')} value={formatCurrency(monthTotal)} sub="הכנסות" />
          <MetricCard label={t('home.thisYear')} value={formatCurrency(yearTotal)} sub="הכנסות" />
          <MetricCard label={t('home.totalReceipts')} value={String(receipts.length)} sub="קבלות" />
          <MetricCard label={t('home.totalClients')} value={String(clients.length)} sub="לקוחות" />
        </div>

        {/* Recent receipts */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">{t('home.recentReceipts')}</span>
            {receipts.length > 5 && (
              <button onClick={() => navigate('/reports')} className="text-xs text-primary">
                הצג הכל
              </button>
            )}
          </div>

          {receipts.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E5E5E3]/50 p-8 flex flex-col items-center gap-3">
              <span className="text-4xl">🧾</span>
              <p className="text-sm text-gray-400 text-center">{t('home.noReceipts')}</p>
              <button
                onClick={() => navigate('/new-receipt')}
                className="bg-primary text-white rounded-lg px-5 py-2 text-sm font-medium"
              >
                {t('receipt.new')}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {receipts.slice(0, 5).map(r => (
                <ReceiptCard key={r.id} receipt={r} onClick={() => setSelected(r)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Receipt detail bottom sheet */}
      <BottomSheet
        open={!!selected && !confirmDelete}
        onClose={() => setSelected(null)}
        title={selected ? `קבלה #${selected.id}` : ''}
      >
        {selected && (
          <div className="flex flex-col gap-4">
            {/* Receipt HTML preview */}
            <div className="bg-gray-50 rounded-xl p-4 text-sm">
              <div className="flex justify-between mb-3">
                <span className="text-gray-500">לקוח</span>
                <span className="font-medium">{selected.clientName}</span>
              </div>
              <div className="flex justify-between mb-3">
                <span className="text-gray-500">תאריך</span>
                <span>{selected.date}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 mb-3">
                {selected.items.map((item, i) => (
                  <div key={i} className="flex justify-between py-1">
                    <span className="text-gray-700">{item.desc} × {item.qty}</span>
                    <span>₪{(item.qty * item.price).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              {selected.discount > 0 && (
                <div className="flex justify-between text-red-500 mb-1">
                  <span>הנחה</span>
                  <span>-{formatCurrency(selected.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
                <span>סה"כ</span>
                <span>{formatCurrency(selected.total)}</span>
              </div>
              {selected.notes && (
                <p className="mt-3 text-xs text-gray-400 border-t border-gray-100 pt-2">{selected.notes}</p>
              )}
            </div>

            {/* Action buttons */}
            {/* Primary: native share sheet on mobile, mailto on desktop */}
            <button
              onClick={async () => { if (settings) await shareByNative(selected, settings) }}
              className="w-full bg-primary text-white rounded-lg py-3.5 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <span>📤</span> שתף קבלה
            </button>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleOpenReceipt}
                className="border border-gray-200 text-gray-600 rounded-lg py-3 text-xs font-medium"
              >
                🖨️ PDF
              </button>
              <button
                onClick={async () => {
                  if (!settings) return
                  const email = await shareByEmail(selected, settings)
                  if (email) showToast(`📧 ${email} הועתק — בחר אפליקציית מייל`, 'success')
                }}
                className="border border-gray-200 text-gray-600 rounded-lg py-3 text-xs font-medium"
              >
                📧 מייל
              </button>
              <button
                onClick={() => shareByWhatsApp(selected)}
                className="bg-[#25D366] text-white rounded-lg py-3 text-xs font-medium"
              >
                💬 WA
              </button>
            </div>

            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full border border-red-200 text-red-500 rounded-lg py-3 text-sm font-medium"
            >
              {t('receipt.delete')}
            </button>
          </div>
        )}
      </BottomSheet>

      {/* Delete confirmation */}
      <BottomSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="מחק קבלה"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600 text-center">
            האם אתה בטוח שברצונך למחוק את קבלה #{selected?.id}?<br />
            <span className="text-red-500">פעולה זו אינה ניתנת לביטול.</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setConfirmDelete(false)}
              className="border border-gray-200 text-gray-600 rounded-lg py-3 text-sm font-medium"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-500 text-white rounded-lg py-3 text-sm font-medium"
            >
              {t('common.delete')}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E5E3]/50 p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  )
}
