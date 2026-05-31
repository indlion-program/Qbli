import type { Receipt, AppSettings } from '../types'
import { generateReceiptPDFBlob } from './pdf'
import i18n from '../i18n'

export type EmailResult =
  | { ok: true; remaining: number }
  | { ok: false; quota: true; checkoutUrl: string }
  | { ok: false; quota: false }

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function sendEmailDirect(receipt: Receipt, settings: AppSettings): Promise<EmailResult> {
  const workerUrl = import.meta.env.VITE_WORKER_URL as string | undefined
  if (!workerUrl) {
    await shareByEmail(receipt, settings)
    return { ok: true, remaining: 7 }
  }

  let pdfBase64: string
  try {
    const blob = await generateReceiptPDFBlob(receipt, settings)
    pdfBase64 = await blobToBase64(blob)
  } catch {
    return { ok: false, quota: false }
  }

  const isHe = i18n.language !== 'en'
  const subject = isHe
    ? `קבלה מספר ${receipt.id} — ${settings.bizName}`
    : `Receipt #${receipt.id} — ${settings.bizName}`

  let res: Response
  try {
    res = await fetch(`${workerUrl}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: settings.businessId,
        to: receipt.clientEmail,
        subject,
        bodyText: buildEmailBody(receipt, settings),
        pdfBase64,
        pdfFilename: `receipt-${receipt.id}.pdf`,
      }),
    })
  } catch {
    return { ok: false, quota: false }
  }

  if (res.status === 402) {
    const data = await res.json() as { checkoutUrl: string }
    return { ok: false, quota: true, checkoutUrl: data.checkoutUrl }
  }
  if (!res.ok) return { ok: false, quota: false }

  const data = await res.json() as { weeklyRemaining: number }
  return { ok: true, remaining: data.weeklyRemaining }
}

export async function getQuotaStatus(businessId: string): Promise<{ isPro: boolean; weeklyCount: number; weeklyRemaining: number } | null> {
  const workerUrl = import.meta.env.VITE_WORKER_URL as string | undefined
  if (!workerUrl) return null
  try {
    const res = await fetch(`${workerUrl}/status?businessId=${encodeURIComponent(businessId)}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function getCheckoutUrl(businessId: string): Promise<string | null> {
  const workerUrl = import.meta.env.VITE_WORKER_URL as string | undefined
  if (!workerUrl) return null
  try {
    const res = await fetch(`${workerUrl}/checkout?businessId=${encodeURIComponent(businessId)}`)
    if (!res.ok) return null
    const data = await res.json() as { checkoutUrl: string }
    return data.checkoutUrl
  } catch {
    return null
  }
}

function t(key: string): string {
  return i18n.t(key) as string
}

export function buildReceiptText(receipt: Receipt, settings: AppSettings): string {
  return (
    `${t('share.receiptNumber')} ${receipt.id} — ${settings.bizName}\n` +
    `${t('share.date')}: ${receipt.date}\n\n` +
    receipt.items
      .map(i => `• ${i.desc} × ${i.qty}   ₪${(i.qty * i.price).toFixed(2)}`)
      .join('\n') +
    (receipt.discount > 0 ? `\n• ${t('share.discount')}: -₪${receipt.discount.toFixed(2)}` : '') +
    `\n\n${t('share.totalDue')}: ₪${receipt.total.toFixed(2)}\n` +
    `${settings.ownerName} · ${settings.bizName}` +
    (settings.phone ? ` · ${settings.phone}` : '')
  )
}

function buildEmailBody(receipt: Receipt, settings: AppSettings): string {
  const itemLines = receipt.items
    .map(i => `  • ${i.desc}   ${i.qty} × ₪${i.price.toFixed(2)} = ₪${(i.qty * i.price).toFixed(2)}`)
    .join('\n')

  const discountLine = receipt.discount > 0
    ? `  • ${t('share.discount')}: -₪${receipt.discount.toFixed(2)}\n`
    : ''

  const contactLines = [
    settings.ownerName,
    settings.bizName,
    settings.phone,
    settings.email,
    settings.address,
  ].filter(Boolean).join(' | ')

  return (
    `${t('share.greeting')} ${receipt.clientName},\n\n` +
    `${t('share.attachedReceipt')}\n\n` +
    `--------------------\n` +
    `${t('share.receiptNumber')} ${receipt.id}\n` +
    `${t('share.date')}: ${receipt.date}\n` +
    `--------------------\n\n` +
    `${itemLines}\n` +
    `${discountLine}\n` +
    `${t('share.totalDue')}: ₪${receipt.total.toFixed(2)}\n\n` +
    `--------------------\n` +
    `${contactLines}\n\n` +
    `${t('share.thanks')}`
  )
}

export function buildMailtoLink(receipt: Receipt, settings: AppSettings): string {
  const isHe = i18n.language !== 'en'
  const subject = encodeURIComponent(
    isHe
      ? `קבלה מספר ${receipt.id} — ${settings.bizName}`
      : `Receipt #${receipt.id} — ${settings.bizName}`
  )
  const body = encodeURIComponent(buildEmailBody(receipt, settings))
  return `mailto:${receipt.clientEmail}?subject=${subject}&body=${body}`
}

export async function shareByEmail(receipt: Receipt, settings: AppSettings): Promise<void> {
  try {
    const blob = await generateReceiptPDFBlob(receipt, settings)
    const file = new File([blob], `receipt-${receipt.id}.pdf`, { type: 'application/pdf' })
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `${t('share.receiptNumber')} ${receipt.id} — ${settings.bizName}`,
        text: buildEmailBody(receipt, settings),
      })
      return
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return
  }

  // Fallback: pre-filled mailto (desktop / no share API)
  const a = document.createElement('a')
  a.href = buildMailtoLink(receipt, settings)
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export async function shareByNative(receipt: Receipt, settings: AppSettings): Promise<void> {
  try {
    const blob = await generateReceiptPDFBlob(receipt, settings)
    const file = new File([blob], `receipt-${receipt.id}.pdf`, { type: 'application/pdf' })
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `${t('share.receiptNumber')} ${receipt.id} — ${settings.bizName}`,
        text: buildReceiptText(receipt, settings),
      })
      return
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return
  }
  shareByEmail(receipt, settings)
}

export function shareByWhatsApp(receipt: Receipt): void {
  const text = encodeURIComponent(
    `${t('share.greeting')} ${receipt.clientName} 👋\n` +
    `${t('share.receiptNumber')} ${receipt.id}\n` +
    `${t('share.date')}: ${receipt.date}\n\n` +
    receipt.items
      .map(i => `• ${i.desc} × ${i.qty} — ₪${(i.qty * i.price).toFixed(2)}`)
      .join('\n') +
    (receipt.discount > 0 ? `\n• ${t('share.discount')}: -₪${receipt.discount.toFixed(2)}` : '') +
    `\n\n*${t('share.totalDue')}: ₪${receipt.total.toFixed(2)}*`
  )

  let phone = ''
  if (receipt.clientPhone) {
    phone = receipt.clientPhone.replace(/\D/g, '')
    if (phone.startsWith('0')) phone = '972' + phone.slice(1)
  }

  window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
}
