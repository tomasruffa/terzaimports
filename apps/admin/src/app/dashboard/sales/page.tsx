'use client'

import { useEffect, useState } from 'react'
import { FileText, Plus, Printer, ShoppingCart } from 'lucide-react'
import { apiFetch } from '@/utils/apiFetch'
import SaleModal from '@/components/dashboard/SaleModal'

interface SaleItem {
  description: string
  quantity: number
  unit_price: number
}

interface SaleDocuments {
  meli_order_id: number | null
  shipping_status: string | null
  has_invoice: boolean
  has_billing: boolean
  has_label: boolean
  can_fetch_label: boolean
  can_fetch_invoice: boolean
  can_fetch_billing: boolean
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
  documents?: SaleDocuments
}

const channelMeta: Record<string, { label: string; className: string }> = {
  mercadolibre: { label: 'Mercado Libre', className: 'bg-yellow-500/15 text-yellow-400' },
  whatsapp: { label: 'WhatsApp', className: 'bg-green-500/15 text-green-400' },
  facebook: { label: 'Facebook', className: 'bg-blue-500/15 text-blue-400' },
  presencial: { label: 'Presencial', className: 'bg-purple-500/15 text-purple-400' },
}

const shippingLabels: Record<string, string> = {
  pending: 'Pendiente',
  ready_to_ship: 'Listo para enviar',
  handling: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
  not_delivered: 'No entregado',
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value)
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

async function openSalePdf(saleId: string, type: 'label' | 'invoice' | 'billing') {
  const res = await apiFetch(`/api/sales/${saleId}/${type}`)
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    alert(json.error || 'No se pudo obtener el documento')
    return
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
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
  const [syncingId, setSyncingId] = useState<string | null>(null)

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

  const syncDocuments = async (saleId: string) => {
    setSyncingId(saleId)
    try {
      await apiFetch(`/api/sales/${saleId}/sync-documents`, { method: 'POST' })
      await load()
    } catch {
      alert('No se pudieron sincronizar los documentos')
    } finally {
      setSyncingId(null)
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
                {['Fecha', 'Canal', 'Cliente', 'Ítems', 'Total', 'Envío', 'Documentos', 'Estado'].map((h) => (
                  <th key={h} className="text-left text-terza-gray text-xs uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => {
                const docs = sale.documents
                const shippingLabel = docs?.shipping_status
                  ? shippingLabels[docs.shipping_status] ?? docs.shipping_status
                  : '—'

                return (
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
                    <td className="px-4 py-3 text-terza-gray text-sm">{shippingLabel}</td>
                    <td className="px-4 py-3">
                      {sale.channel === 'mercadolibre' && docs ? (
                        <div className="flex flex-wrap gap-2">
                          {(docs.has_invoice || docs.can_fetch_invoice) && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!docs.has_invoice) syncDocuments(sale.id).then(() => openSalePdf(sale.id, 'invoice'))
                                else openSalePdf(sale.id, 'invoice')
                              }}
                              disabled={syncingId === sale.id}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-terza-navy-medium text-terza-gray hover:text-white transition-colors"
                            >
                              <FileText size={12} />
                              Factura venta
                            </button>
                          )}
                          {(docs.has_billing || docs.can_fetch_billing) && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!docs.has_billing) syncDocuments(sale.id).then(() => openSalePdf(sale.id, 'billing'))
                                else openSalePdf(sale.id, 'billing')
                              }}
                              disabled={syncingId === sale.id}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-terza-navy-medium text-terza-gray hover:text-white transition-colors"
                            >
                              <FileText size={12} />
                              Factura ML
                            </button>
                          )}
                          {docs.can_fetch_label && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!docs.has_label) syncDocuments(sale.id).then(() => openSalePdf(sale.id, 'label'))
                                else openSalePdf(sale.id, 'label')
                              }}
                              disabled={syncingId === sale.id}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-terza-blue/20 text-terza-blue-bright hover:bg-terza-blue/30 transition-colors"
                            >
                              <Printer size={12} />
                              Etiqueta
                            </button>
                          )}
                          {!docs.has_invoice && !docs.has_billing && !docs.can_fetch_label && (
                            <button
                              type="button"
                              onClick={() => syncDocuments(sale.id)}
                              disabled={syncingId === sale.id}
                              className="text-xs text-terza-gray hover:text-white"
                            >
                              {syncingId === sale.id ? 'Sincronizando…' : 'Buscar docs'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-terza-gray text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-terza-gray text-sm">{sale.status}</td>
                  </tr>
                )
              })}
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
