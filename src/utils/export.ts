import type { Receipt, Client, Product, AppSettings } from '../types'
import { saveReceipt, saveClient, saveProduct, saveSettings } from './db'

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportCSV(receipts: Receipt[]): void {
  const BOM = '﻿'
  const headers = 'מספר,תאריך,לקוח,מייל,טלפון,פריטים,סכום ביניים,הנחה,לתשלום'
  const rows = receipts.map(r => {
    const items = r.items.map(i => `${i.desc}x${i.qty}`).join('; ')
    return [r.id, r.date, r.clientName, r.clientEmail, r.clientPhone, items, r.subtotal, r.discount, r.total]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  })
  const csv = BOM + [headers, ...rows].join('\n')
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'qbli-receipts.csv')
}

interface BackupState {
  receipts: Receipt[]
  clients: Client[]
  products: Product[]
  settings: AppSettings
}

export function exportBackup(state: BackupState): void {
  const today = new Date().toISOString().slice(0, 10)
  const json = JSON.stringify(state, null, 2)
  downloadBlob(new Blob([json], { type: 'application/json' }), `qbli-backup-${today}.json`)
}

export async function importBackup(file: File): Promise<void> {
  const text = await file.text()
  const data = JSON.parse(text) as BackupState

  if (!Array.isArray(data.receipts) || !Array.isArray(data.clients)) {
    throw new Error('קובץ גיבוי לא תקין')
  }

  for (const r of data.receipts) {
    await saveReceipt(r)
  }
  for (const c of data.clients) {
    await saveClient(c)
  }
  if (Array.isArray(data.products)) {
    for (const p of data.products) {
      await saveProduct(p)
    }
  }
  if (data.settings) {
    await saveSettings(data.settings)
  }

  window.location.reload()
}
