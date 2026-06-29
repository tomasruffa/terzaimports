'use client'
import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'

interface Product { id: string; name: string; sku: string; stock_quantity: number }

interface Props {
  onClose: () => void
  onSaved: () => void
}

import { apiFetch } from '@/utils/apiFetch'

export default function StockMovementModal({ onClose, onSaved }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState({ product_id: '', type: 'in', quantity: 1, reason: '', reference: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch('/api/products?limit=100&active=true')
      .then(r => r.json())
      .then(j => { if (j.data) setProducts(j.data) })
      .catch(() => {})
  }, [])

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await apiFetch('/api/stock/movements', { method: 'POST', body: JSON.stringify(form) })
      const json = await res.json()
      if (json.error) setError(json.error)
      else onSaved()
    } catch {
      setError('Error de conexión con la API')
    } finally {
      setSaving(false)
    }
  }

  const selectedProduct = products.find(p => p.id === form.product_id)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-terza-navy-light border border-terza-gray-dark/40 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-terza-gray-dark/30">
          <h2 className="text-white font-bold text-lg">Registrar movimiento</h2>
          <button onClick={onClose} className="text-terza-gray hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>
          )}

          <div>
            <label className="text-terza-gray text-sm mb-1.5 block">Producto *</label>
            <select value={form.product_id} onChange={e => set('product_id', e.target.value)} required
              className="input-field">
              <option value="">Seleccionar producto...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock_quantity})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-terza-gray text-sm mb-1.5 block">Tipo de movimiento *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'in', label: 'Entrada', color: 'green' },
                { key: 'out', label: 'Salida', color: 'red' },
                { key: 'adjustment', label: 'Ajuste', color: 'yellow' },
              ].map(t => (
                <button key={t.key} type="button" onClick={() => set('type', t.key)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-all
                    ${form.type === t.key
                      ? t.color === 'green' ? 'bg-green-500/20 border-green-500/50 text-green-400'
                        : t.color === 'red' ? 'bg-red-500/20 border-red-500/50 text-red-400'
                        : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                      : 'bg-terza-navy border-terza-gray-dark/40 text-terza-gray hover:text-white'
                    }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-terza-gray text-sm mb-1.5 block">
              {form.type === 'adjustment' ? 'Stock final' : 'Cantidad'} *
            </label>
            <input type="number" min="1" value={form.quantity}
              onChange={e => set('quantity', parseInt(e.target.value))} required className="input-field" />
            {selectedProduct && form.type === 'out' && form.quantity > selectedProduct.stock_quantity && (
              <p className="text-red-400 text-xs mt-1">Stock insuficiente (disponible: {selectedProduct.stock_quantity})</p>
            )}
          </div>

          <div>
            <label className="text-terza-gray text-sm mb-1.5 block">Motivo</label>
            <input value={form.reason} onChange={e => set('reason', e.target.value)} className="input-field" placeholder="Importación, venta, ajuste..." />
          </div>

          <div>
            <label className="text-terza-gray text-sm mb-1.5 block">Referencia</label>
            <input value={form.reference} onChange={e => set('reference', e.target.value)} className="input-field" placeholder="IMP-001, VTA-123..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
              {saving ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
