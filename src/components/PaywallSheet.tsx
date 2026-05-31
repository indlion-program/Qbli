import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BottomSheet } from './BottomSheet'
import { getCheckoutUrl } from '../utils/share'

interface PaywallSheetProps {
  open: boolean
  onClose: () => void
  businessId: string
  weeklyCount: number
  initialCheckoutUrl?: string
}

export function PaywallSheet({ open, onClose, businessId, weeklyCount, initialCheckoutUrl }: PaywallSheetProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  async function handleUpgrade() {
    setLoading(true)
    const url = initialCheckoutUrl ?? await getCheckoutUrl(businessId)
    setLoading(false)
    if (url) {
      window.open(url, '_blank', 'noopener')
      onClose()
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={t('paywall.title')}>
      <div className="flex flex-col gap-4 pb-2">
        {/* Usage bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>{t('paywall.weeklyUsed', { count: weeklyCount })}</span>
            <span className="text-red-500 font-medium">7/7</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-red-400 h-2 rounded-full w-full" />
          </div>
        </div>

        {/* Plan card */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <span className="font-semibold text-gray-900">Qbli Pro</span>
          </div>
          <p className="text-sm text-gray-600">{t('paywall.proDesc')}</p>
        </div>

        {/* CTA */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full bg-primary text-white rounded-xl py-4 text-sm font-semibold disabled:opacity-60"
        >
          {loading ? '...' : t('paywall.upgrade')}
        </button>

        <button onClick={onClose} className="w-full text-gray-400 text-sm py-1">
          {t('paywall.cancel')}
        </button>
      </div>
    </BottomSheet>
  )
}
