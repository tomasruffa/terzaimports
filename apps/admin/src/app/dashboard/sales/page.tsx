'use client'

import { useEffect, useState } from 'react'
import { Plus, ShoppingCart } from 'lucide-react'
import { apiFetch } from '@/utils/apiFetch'
import SaleModal from '@/components/dashboard/SaleModal'

interface SaleItem {
  description: string
  quantity: number
  unit_price: number
}

interface Sale {
  id: string
  channel: string
  customer_name: string | null
  customer_contact: string | null
  status: string
  total_amount: number
  currency_id: string
  sale_date: string
  notes: string | null
  items: SaleItem[]
}

const channelMeta: Record<string, { label: string; className: string }> = {
  mercadolibre: { label: 'Mercado Libre', className: 'bg-yellow-500/15 text-yellow-400' },
  whatsapp: { label: 'WhatsApp', className: 'bg-green-500/15 text-green-400' },
  facebook: { label: 'Facebook', className: 'bg-blue-500/15 text-blue-400' },
  presencial: { label: 'Presencial', className: 'bg-purple-500/15 text-purple-400' },
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value)
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [dashboard, setDashboard] = useState<{
    totals: { total_revenue: number; sales_last_30d: number; revenue_last_30d: number }
    by_channel: Array<{ channel: string; sales_count: number; revenue: number }>
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [filter, setFilter] = useState<string>('')

  const load = async () => {
    setLoading(true)
    try {
      const [salesRes, dashRes] = await Promise.all([
        apiFetch(`/api/sales?limit=50${filter ? `&channel=${filter}` : ''}`),
        apiFetch('/api/sales/dashboard'),
      ])
      const salesJson = await salesRes.json()
      const dashJson = await dashRes.json()
      if (salesJson.data) setSales(salesJson.data)
      if (dashJson.data) setDashboard(dashJson.data)
    } catch {
      setSales([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <ShoppingCart size={20} className="text-terza-blue-bright" />
            Ventas consolidadas
          </h2>
          <p className="text-terza-gray text-sm">Mercado Libre, WhatsApp, Facebook y ventas presenciales en un solo lugar</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2 text-sm py-2 px-4">
          <Plus size={16} />
          Registrar venta
        </button>
      </div>

      {dashboard && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="card-dark">
            <p className="text-terza-gray text-sm">Facturación total</p>
            <p className="text-white text-2xl font-bold mt-1">{formatMoney(Number(dashboard.totals.total_revenue))}</p>
          </div>
          <div className="card-dark">
            <p className="text-terza-gray text-sm">Últimos 30 días</p>
            <p className="text-white text-2xl font-bold mt-1">{formatMoney(Number(dashboard.totals.revenue_last_30d))}</p>
            <p className="text-terza-gray/60 text-xs mt-1">{dashboard.totals.sales_last_30d} ventas</p>
          </div>
          {dashboard.by_channel.slice(0, 2).map((ch) => (
            <div key={ch.channel} className="card-dark">
              <p className="text-terza-gray text-sm">{channelMeta[ch.channel]?.label ?? ch.channel}</p>
              <p className="text-white text-2xl font-bold mt-1">{formatMoney(Number(ch.revenue))}</p>
              <p className="text-terza-gray/60 text-xs mt-1">{ch.sales_count} ventas</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {[{ id: '', label: 'Todos' }, ...Object.entries(channelMeta).map(([id, m]) => ({ id, label: m.label }))].map((ch) => (
          <button
            key={ch.id || 'all'}
            onClick={() => setFilter(ch.id)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filter === ch.id ? 'bg-terza-blue text-white' : 'bg-terza-navy-medium text-terza-gray hover:text-white'
            }`}
          >
            {ch.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-terza-gray text-sm">Cargando ventas...</p>
      ) : (
        <div className="card-dark overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-terza-gray-dark/30">
                {['Fecha', 'Canal', 'Cliente', 'Ítems', 'Total', 'Estado'].map((h) => (
                  <th key={h} className="text-left text-terza-gray text-xs uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-b border-terza-gray-dark/20 hover:bg-terza-navy-medium/30">
                  <td className="px-4 py-3 text-terza-gray text-sm">{formatDate(sale.sale_date)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${channelMeta[sale.channel]?.className ?? ''}`}>
                      {channelMeta[sale.channel]?.label ?? sale.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white text-sm">{sale.customer_name || sale.customer_contact || '—'}</td>
                  <td className="px-4 py-3 text-terza-gray text-sm max-w-xs truncate">
                    {(sale.items || []).map((i) => i.description).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-green-400 text-sm font-medium">{formatMoney(Number(sale.total_amount))}</td>
                  <td className="px-4 py-3 text-terza-gray text-sm">{sale.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sales.length === 0 && (
            <p className="text-terza-gray text-sm p-6 text-center">No hay ventas registradas todavía</p>
          )}
        </div>
      )}

      {modalOpen && (
        <SaleModal
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load() }}
        />
      )}
    </div>
  )
}
