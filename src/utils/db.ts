import { openDB, type IDBPDatabase } from 'idb'
import type { Receipt, Client, Product, AppSettings } from '../types'

const DB_NAME = 'qbli-db'
const DB_VERSION = 1

type QbliDB = {
  receipts: Receipt
  clients: Client
  products: Product
  settings: { key: string; value: unknown }
}

let _db: IDBPDatabase<QbliDB> | null = null

async function getDB(): Promise<IDBPDatabase<QbliDB>> {
  if (_db) return _db
  _db = await openDB<QbliDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('receipts')) {
        db.createObjectStore('receipts', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('clients')) {
        db.createObjectStore('clients', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
    },
  })
  return _db
}

const DEFAULT_SETTINGS: AppSettings = {
  bizName: '',
  ownerName: '',
  phone: '',
  email: '',
  address: '',
  nextReceiptNum: Math.floor(Math.random() * 1000) + 1000,
  lang: 'he',
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB()
  const tx = db.transaction('settings', 'readonly')
  const store = tx.objectStore('settings')
  const keys: (keyof AppSettings)[] = ['bizName', 'ownerName', 'phone', 'email', 'address', 'nextReceiptNum', 'lang']
  const result: Partial<AppSettings> = {}
  let hasAny = false
  for (const key of keys) {
    const row = await store.get(key)
    if (row !== undefined) {
      hasAny = true
      ;(result as Record<string, unknown>)[key] = row.value
    }
  }
  if (!hasAny) return DEFAULT_SETTINGS
  return { ...DEFAULT_SETTINGS, ...result } as AppSettings
}

export async function saveSettings(s: AppSettings): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('settings', 'readwrite')
  const store = tx.objectStore('settings')
  for (const [key, value] of Object.entries(s)) {
    await store.put({ key, value })
  }
  await tx.done
}

export async function getReceipts(): Promise<Receipt[]> {
  const db = await getDB()
  const all = await db.getAll('receipts')
  return all.sort((a, b) => b.ts - a.ts)
}

export async function saveReceipt(r: Receipt): Promise<void> {
  const db = await getDB()
  await db.put('receipts', r)
}

export async function deleteReceipt(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('receipts', id)
}

export async function getClients(): Promise<Client[]> {
  const db = await getDB()
  return db.getAll('clients')
}

export async function saveClient(c: Client): Promise<void> {
  const db = await getDB()
  await db.put('clients', c)
}

export async function deleteClient(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('clients', id)
}

export async function getProducts(): Promise<Product[]> {
  const db = await getDB()
  return db.getAll('products')
}

export async function saveProduct(p: Product): Promise<void> {
  const db = await getDB()
  await db.put('products', p)
}

export async function deleteProduct(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('products', id)
}
