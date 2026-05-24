import type { Receipt, AppSettings } from '../types'

export function buildReceiptText(receipt: Receipt, settings: AppSettings): string {
  return (
    `קבלה מספר ${receipt.id} מ-${settings.bizName}\n` +
    `תאריך: ${receipt.date}\n\n` +
    receipt.items
      .map(i => `• ${i.desc} × ${i.qty}   ₪${(i.qty * i.price).toFixed(2)}`)
      .join('\n') +
    (receipt.discount > 0 ? `\n• הנחה: -₪${receipt.discount.toFixed(2)}` : '') +
    `\n\nסה"כ לתשלום: ₪${receipt.total.toFixed(2)}\n` +
    `${settings.ownerName} · ${settings.bizName}` +
    (settings.phone ? ` · ${settings.phone}` : '')
  )
}

export function buildMailtoLink(receipt: Receipt, settings: AppSettings): string {
  const subject = encodeURIComponent(`קבלה מספר ${receipt.id} - ${settings.bizName}`)
  const body = encodeURIComponent(
    `שלום ${receipt.clientName},\n\n` + buildReceiptText(receipt, settings)
  )
  return `mailto:${receipt.clientEmail}?subject=${subject}&body=${body}`
}

/**
 * Must be called directly from a click handler (user gesture required).
 * Opens the OS mail app with receipt details pre-filled.
 */
export function shareByEmail(receipt: Receipt, settings: AppSettings): void {
  window.location.href = buildMailtoLink(receipt, settings)
}

/**
 * Must be called directly from a click handler.
 * On Android/iOS opens the native OS share sheet (Gmail, WhatsApp, SMS, etc.)
 * Falls back to mailto on desktop.
 */
export async function shareByNative(receipt: Receipt, settings: AppSettings): Promise<void> {
  const text = buildReceiptText(receipt, settings)
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: `קבלה מספר ${receipt.id} — ${settings.bizName}`,
        text,
      })
    } catch (err) {
      // User cancelled (AbortError) — do nothing
      if (err instanceof Error && err.name !== 'AbortError') {
        // Real error — fall back to mailto
        shareByEmail(receipt, settings)
      }
    }
  } else {
    // Desktop: no Web Share API
    shareByEmail(receipt, settings)
  }
}

/**
 * Must be called directly from a click handler.
 */
export function shareByWhatsApp(receipt: Receipt): void {
  const text = encodeURIComponent(
    `שלום ${receipt.clientName} 👋\n` +
    `קבלה מספר ${receipt.id}\n` +
    `תאריך: ${receipt.date}\n\n` +
    receipt.items
      .map(i => `• ${i.desc} × ${i.qty} — ₪${(i.qty * i.price).toFixed(2)}`)
      .join('\n') +
    (receipt.discount > 0 ? `\n• הנחה: -₪${receipt.discount.toFixed(2)}` : '') +
    `\n\n*סה"כ לתשלום: ₪${receipt.total.toFixed(2)}*`
  )

  let phone = ''
  if (receipt.clientPhone) {
    phone = receipt.clientPhone.replace(/\D/g, '')
    if (phone.startsWith('0')) phone = '972' + phone.slice(1)
  }

  window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
}
