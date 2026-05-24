export interface ReceiptItem {
  desc: string
  qty: number
  price: number
}

export interface Receipt {
  id: string
  clientId: string
  clientName: string
  clientEmail: string
  clientPhone: string
  items: ReceiptItem[]
  subtotal: number
  discount: number
  total: number
  notes: string
  date: string
  ts: number
}

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  notes: string
  createdAt: number
}

export interface Product {
  id: string
  name: string
  price: number
}

export interface AppSettings {
  bizName: string
  ownerName: string
  phone: string
  email: string
  address: string
  nextReceiptNum: number
  lang: 'he' | 'en'
}
