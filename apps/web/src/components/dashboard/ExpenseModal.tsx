'use client'
import { useState } from 'react'
import { X, Save } from 'lucide-react'

interface Expense {
  id?: string
  category: string
  description: string
  amount: number
  payment_method: string | null
  expense_date: string
  notes: string | null
}

const EMPTY: Expense = {
  category: 'Servicios',
  description: '',
  amount: 0,
  payment_method: 'Transferencia',
  expense_date: new Date().toISOString().split('T')[0],
  notes: ''
}

import { apiFetch } from '@/utils/apiFetch'

interface Props {
  expense: Expense | null
  onClose: () => void
  onSaved: () => void
}

export default function ExpenseModal({ expense, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Expense>(expense ?? EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof Expense, v: string | number | null) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const method = expense?.id ? 'PUT' : 'POST'
      const path = expense?.id ? `/api/expenses/${expense.id}` : `/api/expenses`
      const res = await apiFetch(path, { method, body: JSON.stringify(form) })
      const json = await res.json()
      if (json.error) setError(json.error)
      else onSaved()
    } catch {
      setError('Error de conexión con la API')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-terza-navy-light border border-terza-gray-dark/40 rounded-2xl w-full max-w-xl">
        <div className="flex items-center justify-between p-6 border-b border-terza-gray-dark/30">
          <h2 className="text-white font-bold text-lg">{expense?.id ? 'Editar gasto' : 'Nuevo gasto'}</h2>
          <button onClick={onClose} className="text-terza-gray hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-terza-gray text-sm mb-1.5 block">Categoría *</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} required className="input-field">
                <option value="Comisiones">Comisiones</option>
                <option value="Servicios">Servicios</option>
                <option value="Oficina">Oficina</option>
                <option value="Transporte">Transporte</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
            <div>
              <label className="text-terza-gray text-sm mb-1.5 block">Monto (USD) *</label>
              <input type="number" step="0.01" min="0" value={form.amount} onChange={e => set('amount', parseFloat(e.target.value))} required className="input-field" />
            </div>
          </div>

          <div>
            <label className="text-terza-gray text-sm mb-1.5 block">Descripción *</label>
            <input value={form.description} onChange={e => set('description', e.target.value)} required className="input-field" placeholder="Ej: Comisión Mercado Pago" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-terza-gray text-sm mb-1.5 block">Fecha *</label>
              <input type="date" value={form.expense_date} onChange={e => set('expense_date', e.target.value)} required className="input-field" />
            </div>
            <div>
              <label className="text-terza-gray text-sm mb-1.5 block">Método de pago</label>
              <select value={form.payment_method || ''} onChange={e => set('payment_method', e.target.value || null)} className="input-field">
                <option value="">—</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Débito">Débito</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-terza-gray text-sm mb-1.5 block">Notas</label>
            <textarea rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} className="input-field resize-none" placeholder="Referencia, detalles, etc..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {saving ? 'Guardando...' : 'Guardar gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
