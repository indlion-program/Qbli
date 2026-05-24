import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { TopBar } from '../components/TopBar'
import { Toast, useToast } from '../components/Toast'
import type { AppSettings, Product, Receipt, Client } from '../types'
import { getSettings, saveSettings, getProducts, saveProduct, deleteProduct, getReceipts, getClients } from '../utils/db'
import { exportBackup, importBackup } from '../utils/export'

export function Settings() {
  const { t, i18n } = useTranslation()
  const { messages, showToast, dismissToast } = useToast()

  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [newProduct, setNewProduct] = useState({ name: '', price: '' })
  const importRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const [s, p, r, c] = await Promise.all([getSettings(), getProducts(), getReceipts(), getClients()])
    setSettings(s)
    setProducts(p)
    setReceipts(r)
    setClients(c)
  }, [])

  useEffect(() => { load() }, [load])

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings(prev => prev ? { ...prev, [key]: value } : prev)
  }

  async function handleSave() {
    if (!settings) return
    await saveSettings(settings)
    i18n.changeLanguage(settings.lang)
    showToast(t('common.success'))
  }

  async function handleAddProduct() {
    if (!newProduct.name.trim()) return
    const product: Product = {
      id: crypto.randomUUID(),
      name: newProduct.name.trim(),
      price: parseFloat(newProduct.price) || 0,
    }
    await saveProduct(product)
    setNewProduct({ name: '', price: '' })
    showToast(t('common.success'))
    load()
  }

  async function handleDeleteProduct(id: string) {
    await deleteProduct(id)
    load()
  }

  async function handleExportBackup() {
    if (!settings) return
    exportBackup({ receipts, clients, products, settings })
  }

  async function handleImportBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await importBackup(file)
    } catch {
      showToast('שגיאה בייבוא הגיבוי', 'error')
    }
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface pb-20">
      <TopBar title={t('nav.settings')} />
      <Toast messages={messages} onDismiss={dismissToast} />

      <div className="px-4 pt-4 flex flex-col gap-4">
        {/* Business details */}
        <Card title="פרטי העסק">
          <div className="flex flex-col gap-3">
            <Field label={t('settings.bizName')}>
              <input
                type="text"
                value={settings.bizName}
                onChange={e => update('bizName', e.target.value)}
                className={inp}
              />
            </Field>
            <Field label={t('settings.ownerName')}>
              <input
                type="text"
                value={settings.ownerName}
                onChange={e => update('ownerName', e.target.value)}
                className={inp}
              />
            </Field>
            <Field label={t('settings.phone')}>
              <input
                type="tel"
                value={settings.phone}
                onChange={e => update('phone', e.target.value)}
                className={inp}
              />
            </Field>
            <Field label={t('settings.email')}>
              <input
                type="email"
                value={settings.email}
                onChange={e => update('email', e.target.value)}
                className={inp}
              />
            </Field>
            <Field label={t('settings.address')}>
              <input
                type="text"
                value={settings.address}
                onChange={e => update('address', e.target.value)}
                className={inp}
              />
            </Field>
          </div>
        </Card>

        {/* Receipt numbering */}
        <Card title={t('settings.nextReceiptNum')}>
          <Field label="מספר קבלה הבא">
            <input
              type="number"
              value={settings.nextReceiptNum}
              onChange={e => update('nextReceiptNum', parseInt(e.target.value) || 1)}
              className={inp}
              min={1}
            />
          </Field>
        </Card>

        {/* Products */}
        <Card title={t('settings.products')}>
          <div className="flex flex-col gap-2 mb-3">
            {products.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="flex-1 text-sm text-gray-800">{p.name}</span>
                <span className="text-sm text-gray-500 w-16 text-left">₪{p.price}</span>
                <button
                  onClick={() => handleDeleteProduct(p.id)}
                  className="text-red-400 text-sm px-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newProduct.name}
              onChange={e => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
              placeholder="שם מוצר"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
            <input
              type="number"
              value={newProduct.price}
              onChange={e => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
              placeholder="₪"
              className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-primary"
            />
            <button
              onClick={handleAddProduct}
              className="bg-primary text-white rounded-lg px-3 py-2 text-sm font-medium"
            >
              +
            </button>
          </div>
        </Card>

        {/* Language */}
        <Card title={t('settings.language')}>
          <div className="flex gap-2">
            {(['he', 'en'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => update('lang', lang)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  settings.lang === lang
                    ? 'bg-primary text-white border-primary'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                {lang === 'he' ? 'עברית' : 'English'}
              </button>
            ))}
          </div>
        </Card>

        {/* Backup */}
        <Card title="גיבוי ושחזור">
          <div className="flex flex-col gap-2">
            <button
              onClick={handleExportBackup}
              className="w-full border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium"
            >
              {t('settings.backup')}
            </button>
            <button
              onClick={() => importRef.current?.click()}
              className="w-full border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium"
            >
              {t('settings.restore')}
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </div>
        </Card>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-full bg-primary text-white rounded-lg py-3.5 font-semibold text-base mb-4"
        >
          {t('settings.save')}
        </button>
      </div>
    </div>
  )
}

const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white'

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E5E3]/50 p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  )
}
