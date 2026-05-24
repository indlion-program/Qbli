import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TopBar } from '../components/TopBar'
import { ClientCard } from '../components/ClientCard'
import { BottomSheet } from '../components/BottomSheet'
import { Toast, useToast } from '../components/Toast'
import type { Client, Receipt } from '../types'
import { getClients, saveClient, deleteClient, getReceipts } from '../utils/db'
import { generateId } from '../utils/format'

export function Clients() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { messages, showToast, dismissToast } = useToast()

  const [clients, setClients] = useState<Client[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Client | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' })
  const [editNotes, setEditNotes] = useState('')

  const load = useCallback(async () => {
    const [c, r] = await Promise.all([getClients(), getReceipts()])
    setClients(c)
    setReceipts(r)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q)
  })

  function clientReceipts(clientId: string): Receipt[] {
    return receipts.filter(r => r.clientId === clientId)
  }

  function clientTotal(clientId: string): number {
    return clientReceipts(clientId).reduce((s, r) => s + r.total, 0)
  }

  async function handleAdd() {
    if (!form.name.trim()) {
      showToast('נא להזין שם לקוח', 'error')
      return
    }
    try {
      const client: Client = {
        id: generateId(),
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        notes: form.notes.trim(),
        createdAt: Date.now(),
      }
      await saveClient(client)
      setForm({ name: '', email: '', phone: '', notes: '' })
      setShowAdd(false)
      showToast(t('common.success'))
      load()
    } catch {
      showToast('שגיאה בשמירת לקוח', 'error')
    }
  }

  async function handleSaveNotes() {
    if (!selected) return
    await saveClient({ ...selected, notes: editNotes })
    showToast(t('common.success'))
    setSelected(prev => prev ? { ...prev, notes: editNotes } : prev)
    load()
  }

  async function handleDelete() {
    if (!selected) return
    await deleteClient(selected.id)
    showToast('הלקוח נמחק', 'success')
    setSelected(null)
    setShowConfirmDelete(false)
    load()
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface pb-20">
      <TopBar title={t('nav.clients')} />
      <Toast messages={messages} onDismiss={dismissToast} />

      <div className="px-4 pt-4 flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('client.search')}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-9 text-sm focus:outline-none focus:border-primary"
          />
        </div>

        {/* Client list */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E5E3]/50 p-8 flex flex-col items-center gap-3">
            <span className="text-4xl">👥</span>
            <p className="text-sm text-gray-400 text-center">
              {search ? 'לא נמצאו לקוחות' : 'אין לקוחות עדיין'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(c => (
              <ClientCard
                key={c.id}
                client={c}
                receiptCount={clientReceipts(c.id).length}
                totalPaid={clientTotal(c.id)}
                onClick={() => {
                  setSelected(c)
                  setEditNotes(c.notes)
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-24 left-4 w-14 h-14 bg-primary text-white rounded-full text-2xl shadow-lg flex items-center justify-center"
      >
        +
      </button>

      {/* Add client sheet */}
      <BottomSheet open={showAdd} onClose={() => setShowAdd(false)} title={t('client.add')}>
        <div className="flex flex-col gap-3">
          {[
            { key: 'name', label: t('client.name'), type: 'text', placeholder: 'שם מלא' },
            { key: 'email', label: t('client.email'), type: 'email', placeholder: 'email@example.com' },
            { key: 'phone', label: t('client.phone'), type: 'tel', placeholder: '050-0000000' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-medium text-gray-600 mb-1 block">{f.label}</label>
              <input
                type={f.type}
                value={form[f.key as keyof typeof form]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3 mt-2">
            <button
              onClick={() => setShowAdd(false)}
              className="border border-gray-200 text-gray-600 rounded-lg py-3 text-sm"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleAdd}
              className="bg-primary text-white rounded-lg py-3 text-sm font-medium"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Client detail sheet */}
      <BottomSheet open={!!selected && !showConfirmDelete} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && (
          <div className="flex flex-col gap-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{clientReceipts(selected.id).length}</p>
                <p className="text-xs text-gray-400">{t('client.receipts')}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-gray-900">₪{clientTotal(selected.id).toFixed(0)}</p>
                <p className="text-xs text-gray-400">{t('client.total')}</p>
              </div>
            </div>

            {/* Contact info */}
            <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1.5">
              {selected.email && <p className="text-sm text-gray-600">✉️ {selected.email}</p>}
              {selected.phone && <p className="text-sm text-gray-600">📞 {selected.phone}</p>}
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">{t('client.notes')}</label>
              <textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
              />
              <button
                onClick={handleSaveNotes}
                className="text-primary text-sm font-medium mt-1"
              >
                שמור הערות
              </button>
            </div>

            {/* Recent receipts */}
            {clientReceipts(selected.id).length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">קבלות אחרונות</p>
                <div className="flex flex-col gap-1.5">
                  {clientReceipts(selected.id).slice(0, 5).map(r => (
                    <div key={r.id} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-sm text-gray-700">#{r.id} · {r.date}</span>
                      <span className="text-sm font-medium">₪{r.total.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => { setSelected(null); navigate(`/new-receipt?clientId=${selected.id}`) }}
              className="w-full bg-primary text-white rounded-lg py-3 text-sm font-medium"
            >
              קבלה חדשה ללקוח זה
            </button>

            <button
              onClick={() => setShowConfirmDelete(true)}
              className="w-full border border-red-200 text-red-500 rounded-lg py-3 text-sm font-medium"
            >
              מחק לקוח
            </button>
          </div>
        )}
      </BottomSheet>

      {/* Delete confirmation */}
      <BottomSheet open={showConfirmDelete} onClose={() => setShowConfirmDelete(false)} title="מחק לקוח">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600 text-center">
            האם אתה בטוח שברצונך למחוק את {selected?.name}?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowConfirmDelete(false)}
              className="border border-gray-200 text-gray-600 rounded-lg py-3 text-sm"
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
