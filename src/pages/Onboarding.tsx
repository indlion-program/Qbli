import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AppSettings, Product } from '../types'
import { saveSettings, saveProduct } from '../utils/db'

interface OnboardingProps {
  onComplete: () => void
}

const initialSettings: AppSettings = {
  bizName: '',
  ownerName: '',
  phone: '',
  email: '',
  address: '',
  nextReceiptNum: Math.floor(Math.random() * 1000) + 1000,
  lang: 'he',
}

interface DraftProduct {
  name: string
  price: string
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const [settings, setSettings] = useState<AppSettings>(initialSettings)
  const [products, setProducts] = useState<DraftProduct[]>([{ name: '', price: '' }])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: '' }))
  }

  function addProduct() {
    setProducts(prev => [...prev, { name: '', price: '' }])
  }

  function updateProduct(i: number, field: keyof DraftProduct, value: string) {
    setProducts(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  function removeProduct(i: number) {
    setProducts(prev => prev.filter((_, idx) => idx !== i))
  }

  function validateStep0(): boolean {
    const errs: Record<string, string> = {}
    if (!settings.bizName.trim()) errs.bizName = t('onboarding.bizNameRequired')
    if (!settings.ownerName.trim()) errs.ownerName = t('onboarding.ownerNameRequired')
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateStep1(): boolean {
    const valid = products.some(p => p.name.trim())
    if (!valid) setErrors({ products: t('onboarding.productRequired') })
    return valid
  }

  function goNext() {
    if (step === 0 && !validateStep0()) return
    if (step === 1 && !validateStep1()) return
    setStep(s => s + 1)
  }

  async function finish() {
    setSaving(true)
    try {
      await saveSettings(settings)
      const validProducts = products.filter(p => p.name.trim())
      for (const p of validProducts) {
        const product: Product = {
          id: crypto.randomUUID(),
          name: p.name.trim(),
          price: parseFloat(p.price) || 0,
        }
        await saveProduct(product)
      }
      onComplete()
    } catch {
      setSaving(false)
    }
  }

  const steps = [
    t('onboarding.step1'),
    t('onboarding.step2'),
    t('onboarding.step3'),
    t('onboarding.step4'),
  ]

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Progress */}
      <div className="bg-white border-b border-gray-100 px-5 pt-10 pb-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">Q</span>
          </div>
          <span className="text-xl font-bold text-gray-900">Qbli</span>
        </div>
        <div className="flex gap-2 mb-3">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full flex-1 transition-colors ${i <= step ? 'bg-primary' : 'bg-gray-200'}`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400">שלב {step + 1} מתוך {steps.length} — {steps[step]}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        {/* Step 0 — Business details */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-bold text-gray-900">פרטי העסק שלך</h1>
            <Field label={t('settings.bizName') + ' *'} error={errors.bizName}>
              <input
                type="text"
                value={settings.bizName}
                onChange={e => updateSetting('bizName', e.target.value)}
                className={inputCls(!!errors.bizName)}
                placeholder="למשל: נגריית כהן"
              />
            </Field>
            <Field label={t('settings.ownerName') + ' *'} error={errors.ownerName}>
              <input
                type="text"
                value={settings.ownerName}
                onChange={e => updateSetting('ownerName', e.target.value)}
                className={inputCls(!!errors.ownerName)}
                placeholder="שם מלא"
              />
            </Field>
            <Field label={t('settings.phone')}>
              <input
                type="tel"
                value={settings.phone}
                onChange={e => updateSetting('phone', e.target.value)}
                className={inputCls(false)}
                placeholder="050-0000000"
              />
            </Field>
            <Field label={t('settings.email')}>
              <input
                type="email"
                value={settings.email}
                onChange={e => updateSetting('email', e.target.value)}
                className={inputCls(false)}
                placeholder="email@example.com"
              />
            </Field>
          </div>
        )}

        {/* Step 1 — Products */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-bold text-gray-900">מוצרים ושירותים</h1>
            <p className="text-sm text-gray-500">הוסף את המוצרים או השירותים שאתה מציע. תוכל לשנות זאת מאוחר יותר.</p>

            {errors.products && (
              <p className="text-sm text-red-500">{errors.products}</p>
            )}

            <div className="flex flex-col gap-3">
              {products.map((p, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={p.name}
                    onChange={e => updateProduct(i, 'name', e.target.value)}
                    placeholder="שם מוצר / שירות"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                  />
                  <input
                    type="number"
                    value={p.price}
                    onChange={e => updateProduct(i, 'price', e.target.value)}
                    placeholder="₪"
                    className="w-20 border border-gray-200 rounded-lg px-2 py-2.5 text-sm text-center focus:outline-none focus:border-primary"
                  />
                  {products.length > 1 && (
                    <button onClick={() => removeProduct(i)} className="text-red-400 text-xl px-1">×</button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addProduct}
              className="flex items-center gap-2 text-primary text-sm font-medium py-2"
            >
              <span className="text-lg">+</span>
              {t('onboarding.addProduct')}
            </button>
          </div>
        )}

        {/* Step 2 — Receipt numbering */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-bold text-gray-900">מספור קבלות</h1>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-sm text-blue-700">{t('onboarding.receiptNumNote')}</p>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-sm text-amber-700">⚠️ {t('onboarding.receiptNumWarn')}</p>
            </div>

            <Field label="מספר קבלה ראשונה">
              <input
                type="number"
                value={settings.nextReceiptNum}
                onChange={e => updateSetting('nextReceiptNum', parseInt(e.target.value) || 1000)}
                className={inputCls(false)}
                min={100}
              />
            </Field>
          </div>
        )}

        {/* Step 3 — Summary */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center py-4 gap-3">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                <span className="text-3xl">✓</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">הכל מוכן!</h1>
            </div>

            <div className="bg-white rounded-xl border border-[#E5E5E3]/50 p-4 flex flex-col gap-2">
              <SummaryRow label="שם העסק" value={settings.bizName} />
              <SummaryRow label="בעלים" value={settings.ownerName} />
              {settings.phone && <SummaryRow label="טלפון" value={settings.phone} />}
              {settings.email && <SummaryRow label="מייל" value={settings.email} />}
              <SummaryRow label="מספר קבלה ראשונה" value={String(settings.nextReceiptNum)} />
              <SummaryRow
                label="מוצרים"
                value={products.filter(p => p.name).map(p => p.name).join(', ')}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer buttons */}
      <div className="bg-white border-t border-gray-100 px-5 py-4 pb-safe">
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-3 font-medium text-sm"
            >
              {t('common.cancel')}
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={goNext}
              className="flex-1 bg-primary text-white rounded-lg py-3 font-medium text-sm"
            >
              המשך
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={saving}
              className="flex-1 bg-primary text-white rounded-lg py-3 font-medium text-sm disabled:opacity-60"
            >
              {saving ? t('common.loading') : t('onboarding.start')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-left max-w-[60%] truncate">{value}</span>
    </div>
  )
}

function inputCls(hasError: boolean): string {
  return `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors ${
    hasError ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-primary'
  }`
}
