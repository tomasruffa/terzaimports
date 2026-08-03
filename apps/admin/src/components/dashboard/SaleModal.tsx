'use client'

import { useEffect, useState } from 'react'
import { X, Save, Plus, Trash2 } from 'lucide-react'
import { apiFetch } from '@/utils/apiFetch'

interface Product {
  id: string
  name: string
  sale_price: number
  stock_quantity: number
}

interface LineItem {
  product_id: string
  description: string
  quantity: number
  unit_price: number
}

interface Props {
  onClose: () => void
  onSaved: () => void
}

const channels = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'presencial', label: 'Presencial' },
]

export default function SaleModal({ onClose, onSaved }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState({
    channel: 'whatsapp',
    customer_name: '',
    customer_contact: '',
    notes: '',
  })
  const [items, setItems] = useState<LineItem[]>([
    { product_id: '', description: '', quantity: 1, unit_price: 0 },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch('/api/products?limit=100&active=true')
      .then((r) => r.json())
      .then((j) => { if (j.data) setProducts(j.data) })
      .catch(() => {})
  }, [])

  const updateItem = (index: number, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const onProductSelect = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId)
    updateItem(index, {
      product_id: productId,
      description: product?.name ?? '',
      unit_price: product?.sale_price ?? 0,
    })
  }

  const addLine = () => {
    setItems((prev) => [...prev, { product_id: '', description: '', quantity: 1, unit_price: 0 }])
  }

  const removeLine = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const total = items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      ...form,
      items: items.map((i) => ({
        product_id: i.product_id || undefined,
        description: i.description,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
      })),
    }

    try {
      const res = await apiFetch('/api/sales', { method: 'POST', body: JSON.stringify(payload) })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error || 'No se pudo registrar la venta')
        return
      }
      onSaved()
    } catch {
      setError('Error de conexión con la API')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-terza-navy-light border border-terza-gray-dark/40 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-terza-gray-dark/30 sticky top-0 bg-terza-navy-light z-10">
          <h2 className="text-white font-bold text-lg">Registrar venta</h2>
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
              <label className="text-terza-gray text-sm mb-1.5 block">Canal *</label>
              <select
                value={form.channel}
                onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
                className="input-field"
                required
              >
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-terza-gray text-sm mb-1.5 block">Cliente</label>
              <input
                value={form.customer_name}
                onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                className="input-field"
                placeholder="Nombre"
              />
            </div>
            <div>
              <label className="text-terza-gray text-sm mb-1.5 block">Contacto</label>
              <input
                value={form.customer_contact}
                onChange={(e) => setForm((f) => ({ ...f, customer_contact: e.target.value }))}
                className="input-field"
                placeholder="Teléfono o usuario"
              />
            </div>
            <div>
              <label className="text-terza-gray text-sm mb-1.5 block">Notas</label>
              <input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="input-field"
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-terza-gray text-sm">Productos *</label>
              <button type="button" onClick={addLine} className="text-terza-blue-bright text-sm flex items-center gap-1">
                <Plus size={14} /> Agregar línea
              </button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="grid sm:grid-cols-12 gap-2 items-end border border-terza-gray-dark/20 rounded-lg p-3">
                <div className="sm:col-span-5">
                  <select
                    value={item.product_id}
                    onChange={(e) => onProductSelect(index, e.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="">Producto del stock...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} (stock: {p.stock_quantity})</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                    className="input-field text-sm"
                    placeholder="Cant."
                  />
                </div>
                <div className="sm:col-span-3">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, { unit_price: Number(e.target.value) })}
                    className="input-field text-sm"
                    placeholder="Precio"
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <button type="button" onClick={() => removeLine(index)} className="text-red-400 p-2" disabled={items.length === 1}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-terza-gray-dark/30">
            <p className="text-terza-gray text-sm">Total</p>
            <p className="text-white text-xl font-bold">${total.toLocaleString('es-AR')}</p>
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
            <Save size={16} />
            {saving ? 'Guardando...' : 'Registrar venta y descontar stock'}
          </button>
        </form>
      </div>
    </div>
  )
}
