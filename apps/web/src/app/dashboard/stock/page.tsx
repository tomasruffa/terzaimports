'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, ArrowDownToLine, ArrowUpFromLine, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import StockMovementModal from '@/components/dashboard/StockMovementModal'

interface Movement {
  id: string
  type: 'in' | 'out' | 'adjustment'
  quantity: number
  reason: string | null
  reference: string | null
  created_at: string
  product?: { id: string; name: string; sku: string }
}

import { apiFetch } from '@/utils/apiFetch'

const DEMO_MOVEMENTS: Movement[] = [
  { id: '1', type: 'in', quantity: 50, reason: 'Importación #2024-001', reference: 'IMP-001', created_at: new Date().toISOString(), product: { id: '1', name: 'Cable USB-C Premium 2m', sku: 'CAB-USBC-2M' } },
  { id: '2', type: 'out', quantity: 20, reason: 'Venta mayorista', reference: 'VTA-123', created_at: new Date(Date.now() - 86400000).toISOString(), product: { id: '2', name: 'Auriculares Bluetooth TWS', sku: 'AUR-BT-TWS01' } },
  { id: '3', type: 'in', quantity: 100, reason: 'Reposición de stock', reference: 'IMP-002', created_at: new Date(Date.now() - 172800000).toISOString(), product: { id: '3', name: 'Cargador Rápido 65W GaN', sku: 'CAR-GAN-65W' } },
  { id: '4', type: 'adjustment', quantity: 45, reason: 'Conteo de inventario', reference: 'INV-2024', created_at: new Date(Date.now() - 259200000).toISOString(), product: { id: '2', name: 'Auriculares Bluetooth TWS', sku: 'AUR-BT-TWS01' } },
]

const typeConfig = {
  in: { label: 'Entrada', icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
  out: { label: 'Salida', icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10' },
  adjustment: { label: 'Ajuste', icon: RefreshCw, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
}

export default function StockPage() {
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)

  const fetchMovements = useCallback(async () => {
    try {
      const typeQ = filter !== 'all' ? `&type=${filter}` : ''
      const res = await apiFetch(`/api/stock/movements?limit=50${typeQ}`)
      const json = await res.json()
      if (json.data) setMovements(json.data)
      else { setMovements(DEMO_MOVEMENTS); setIsDemo(true) }
    } catch {
      setMovements(DEMO_MOVEMENTS)
      setIsDemo(true)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchMovements() }, [fetchMovements])

  const filters = [
    { key: 'all', label: 'Todos' },
    { key: 'in', label: 'Entradas' },
    { key: 'out', label: 'Salidas' },
    { key: 'adjustment', label: 'Ajustes' },
  ]

  return (
    <div className="space-y-6">
      {isDemo && (
        <div className="bg-terza-blue/10 border border-terza-blue/30 rounded-xl px-4 py-3 text-terza-blue-bright text-sm">
          Mostrando datos de demo. Conectá la API para ver datos reales.
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                ${filter === f.key ? 'bg-terza-blue text-white' : 'bg-terza-navy-light text-terza-gray hover:text-white border border-terza-gray-dark/40'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2 text-sm py-2.5">
          <Plus size={16} />
          Registrar movimiento
        </button>
      </div>

      <div className="card-dark p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-terza-gray-dark/30">
                {['Tipo', 'Producto', 'Cantidad', 'Motivo', 'Referencia', 'Fecha'].map(h => (
                  <th key={h} className="text-left text-terza-gray text-xs font-semibold uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-terza-gray">Cargando...</td></tr>
              ) : movements.map(m => {
                const tc = typeConfig[m.type]
                return (
                  <tr key={m.id} className="border-b border-terza-gray-dark/20 hover:bg-terza-navy-medium/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${tc.color} ${tc.bg}`}>
                        <tc.icon size={12} />
                        {tc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white text-sm font-medium">{m.product?.name ?? '—'}</p>
                        <p className="text-terza-gray text-xs font-mono">{m.product?.sku}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold text-sm ${m.type === 'in' ? 'text-green-400' : m.type === 'out' ? 'text-red-400' : 'text-yellow-400'}`}>
                        {m.type === 'in' ? '+' : m.type === 'out' ? '-' : '='}{m.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-terza-gray text-sm">{m.reason ?? '—'}</td>
                    <td className="px-4 py-3">
                      {m.reference && (
                        <span className="bg-terza-navy text-terza-gray text-xs font-mono px-2 py-0.5 rounded">{m.reference}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-terza-gray text-xs">
                      {new Date(m.created_at).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <StockMovementModal
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); fetchMovements() }}
        />
      )}
    </div>
  )
}
