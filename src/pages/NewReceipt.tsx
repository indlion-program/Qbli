import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TopBar } from '../components/TopBar'
import { ItemRow } from '../components/ItemRow'
import { BottomSheet } from '../components/BottomSheet'
import { Toast, useToast } from '../components/Toast'
import type { Receipt, ReceiptItem, Client, Product, AppSettings } from '../types'
import { getClients, getProducts, getSettings, saveSettings, saveReceipt, saveClient } from '../utils/db'
import { formatCurrency, formatDate, padReceiptId } from '../utils/format'
import { shareByNative, shareByEmail, shareByWhatsApp } from '../utils/share'
import { openReceiptWindow } from '../utils/pdf'

export function NewReceipt() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { messages, showToast, dismissToast } = useToast()

  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)

  const [selectedClientId, setSelectedClientId] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [saveAsClient, setSaveAsClient] = useState(false)

  const [items, setItems] = useState<ReceiptItem[]>([{ desc: '', qty: 1, price: 0 }])
  const [discount, setDiscount] = useState(0)
  const [notes, setNotes] = useState('')

  const [createdReceipt, setCreatedReceipt] = useState<Receipt | null>(null)

  // Extract primitive string once — stable across renders (won't trigger infinite loop)
  const clientIdParam = searchParams.get('clientId')

  const load = useCallback(async () => {
    const [c, p, s] = await Promise.all([getClients(), getProducts(), getSettings()])
    setClients(c)
    setProducts(p)
    setSettings(s)
    if (p.length > 0) {
      setItems([{ desc: p[0].name, qty: 1, price: p[0].price }])
    }
    if (clientIdParam) {
      const preClient = c.find(cl => cl.id === clientIdParam)
      if (preClient) {
        setSelectedClientId(clientIdParam)
        setClientName(preClient.name)
        setClientEmail(preClient.email)
        setClientPhone(preClient.phone)
      }
    }
  }, [clientIdParam])

  useEffect(() => { load() }, [load])

  function selectClient(id: string) {
    setSelectedClientId(id)
    const c = clients.find(c => c.id === id)
    if (c) {
      setClientName(c.name)
      setClientEmail(c.email)
      setClientPhone(c.phone)
    }
  }

  function clearClient() {
    setSelectedClientId('')
    setClientName('')
    setClientEmail('')
    setClientPhone('')
  }

  function updateItem(index: number, field: keyof ReceiptItem, value: string | number) {
    setItems(prev => {
      const updated = [...prev]
      if (field === 'qty' || field === 'price') {
        updated[index] = { ...updated[index], [field]: Number(value) }
      } else {
        updated[index] = { ...updated[index], [field]: String(value) }
        if (field === 'desc') {
          const product = products.find(p => p.name === value)
          if (product) {
            updated[index] = { ...updated[index], desc: product.name, price: product.price }
          }
        }
      }
      return updated
    })
  }

  function addItem() {
    setItems(prev => [...prev, { desc: '', qty: 1, price: 0 }])
  }

  function deleteItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0)
  const total = Math.max(0, subtotal - discount)

  async function createReceipt() {
    if (!settings) return
    if (!clientName.trim()) {
      showToast('נא להזין שם לקוח', 'error')
      return
    }
    if (items.every(i => !i.desc.trim())) {
      showToast('נא להוסיף לפחות פריט אחד', 'error')
      return
    }

    const now = Date.now()
    const receiptId = padReceiptId(settings.nextReceiptNum)

    let clientId = selectedClientId
    if (!clientId && saveAsClient && clientName.trim()) {
      const newClient: Client = {
        id: crypto.randomUUID(),
        name: clientName.trim(),
        email: clientEmail.trim(),
        phone: clientPhone.trim(),
        notes: '',
        createdAt: now,
      }
      await saveClient(newClient)
      clientId = newClient.id
    }

    const receipt: Receipt = {
      id: receiptId,
      clientId,
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      clientPhone: clientPhone.trim(),
      items: items.filter(i => i.desc.trim()),
      subtotal,
      discount,
      total,
      notes: notes.trim(),
      date: formatDate(now),
      ts: now,
    }

    await saveReceipt(receipt)
    await saveSettings({ ...settings, nextReceiptNum: settings.nextReceiptNum + 1 })
    setCreatedReceipt(receipt)
    setSettings(prev => prev ? { ...prev, nextReceiptNum: prev.nextReceiptNum + 1 } : prev)
  }

  const productNames = products.map(p => p.name)

  return (
    <div className="flex flex-col min-h-screen bg-surface pb-20">
      <TopBar title={t('receipt.new')} showBack />
      <Toast messages={messages} onDismiss={dismissToast} />

      <div className="px-4 pt-4 flex flex-col gap-5">
        {/* Client section */}
        <Section title={t('receipt.client')}>
          {clients.length > 0 && (
            <div className="mb-3">
              <select
                value={selectedClientId}
                onChange={e => {
                  if (e.target.value === '') clearClient()
                  else selectClient(e.target.value)
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-primary text-gray-700"
              >
                <option value="">{t('client.select')}</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder={t('client.name')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
            />
            <input
              type="email"
              value={clientEmail}
              onChange={e => setClientEmail(e.target.value)}
              placeholder={t('client.email')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
            />
            <input
              type="tel"
              value={clientPhone}
              onChange={e => setClientPhone(e.target.value)}
              placeholder={t('client.phone')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
            />
            {!selectedClientId && clientName && (
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={saveAsClient}
                  onChange={e => setSaveAsClient(e.target.checked)}
                  className="accent-primary"
                />
                שמור כלקוח חדש
              </label>
            )}
          </div>
        </Section>

        {/* Items section */}
        <Section title={t('receipt.items')}>
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[1fr_56px_80px_32px] gap-2 text-xs text-gray-400 px-1">
              <span>תיאור</span>
              <span className="text-center">כמות</span>
              <span className="text-center">מחיר</span>
              <span />
            </div>
            {items.map((item, i) => (
              <ItemRow
                key={i}
                item={item}
                index={i}
                suggestions={productNames}
                onChange={updateItem}
                onDelete={deleteItem}
              />
            ))}
          </div>
          <button
            onClick={addItem}
            className="flex items-center gap-1.5 text-primary text-sm font-medium mt-2 py-1"
          >
            <span className="text-lg leading-none">+</span> הוסף פריט
          </button>
        </Section>

        {/* Discount */}
        <Section title={t('receipt.discount')}>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">₪</span>
            <input
              type="number"
              value={discount || ''}
              min={0}
              step={0.01}
              onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </Section>

        {/* Notes */}
        <Section title={t('receipt.notes')}>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="הערות לקבלה..."
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary resize-none"
          />
        </Section>

        {/* Totals */}
        <div className="bg-white rounded-xl border border-[#E5E5E3]/50 p-4">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>סכום ביניים</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-red-500 mb-2">
              <span>הנחה</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2">
            <span>{t('receipt.total')}</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <button
          onClick={createReceipt}
          className="w-full bg-primary text-white rounded-lg py-3.5 font-semibold text-base mb-4"
        >
          {t('receipt.create')}
        </button>
      </div>

      {/* Success sheet */}
      <BottomSheet
        open={!!createdReceipt}
        onClose={() => { setCreatedReceipt(null); navigate('/') }}
        title={`קבלה #${createdReceipt?.id} נוצרה!`}
      >
        {createdReceipt && settings && (
          <div className="flex flex-col gap-3">
            <div className="bg-green-50 rounded-xl p-4 flex flex-col items-center gap-2">
              <span className="text-3xl">✅</span>
              <p className="text-sm text-green-700 font-medium">הקבלה נשמרה בהצלחה</p>
              <p className="text-xs text-green-600">סה"כ: {formatCurrency(createdReceipt.total)}</p>
            </div>

            {/* Primary: OS native share sheet on mobile, mailto on desktop */}
            <button
              onClick={async () => await shareByNative(createdReceipt, settings)}
              className="w-full bg-primary text-white rounded-lg py-3.5 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <span>📤</span> שתף קבלה
            </button>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => openReceiptWindow(createdReceipt, settings)}
                className="border border-gray-200 text-gray-600 rounded-lg py-3 text-xs font-medium"
              >
                🖨️ PDF
              </button>
              <button
                onClick={() => shareByEmail(createdReceipt, settings)}
                className="border border-gray-200 text-gray-600 rounded-lg py-3 text-xs font-medium"
              >
                📧 מייל
              </button>
              <button
                onClick={() => shareByWhatsApp(createdReceipt)}
                className="bg-[#25D366] text-white rounded-lg py-3 text-xs font-medium"
              >
                💬 WA
              </button>
            </div>

            <button
              onClick={() => { setCreatedReceipt(null); navigate('/') }}
              className="w-full text-gray-500 text-sm py-2"
            >
              חזור לדף הבית
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E5E3]/50 p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">{title}</h2>
      {children}
    </div>
  )
}
