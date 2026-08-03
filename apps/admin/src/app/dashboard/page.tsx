'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Package, DollarSign, AlertTriangle, XCircle, ShoppingCart,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { apiFetch } from '@/utils/apiFetch'

interface ConsolidatedDashboard {
  stock: {
    total_products: number
    total_units: number
    stock_retail_value: number
    low_stock: number
    out_of_stock: number
  }
  totals: {
    total_revenue: number
    revenue_last_30d: number
    sales_last_30d: number
  }
  by_channel: Array<{ channel: string; sales_count: number; revenue: number; revenue_last_30d: number }>
  recent_sales: Array<{ id: string; channel: string; customer_name: string | null; total_amount: number; sale_date: string }>
}

const channelLabels: Record<string, string> = {
  mercadolibre: 'Mercado Libre',
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  presencial: 'Presencial',
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value)
}

export default function DashboardPage() {
  const [data, setData] = useState<ConsolidatedDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/sales/dashboard')
      .then((r) => r.json())
      .then((res) => { if (res.data) setData(res.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-terza-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-terza-gray text-sm">Cargando métricas...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return <p className="text-terza-gray text-sm">No se pudieron cargar las métricas consolidadas.</p>
  }

  const chartData = data.by_channel.map((ch) => ({
    channel: channelLabels[ch.channel] ?? ch.channel,
    revenue: Number(ch.revenue),
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-white font-bold text-lg">Resumen del negocio</h2>
          <p className="text-terza-gray text-sm">Stock único y ventas de todos los canales</p>
        </div>
        <Link href="/dashboard/sales" className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2">
          <ShoppingCart size={16} />
          Ver ventas
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card-dark flex items-start gap-4">
          <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
            <DollarSign size={22} className="text-green-400" />
          </div>
          <div>
            <p className="text-terza-gray text-sm">Facturación total</p>
            <p className="text-white text-2xl font-bold">{formatMoney(Number(data.totals.total_revenue))}</p>
            <p className="text-terza-gray/60 text-xs mt-1">{formatMoney(Number(data.totals.revenue_last_30d))} últimos 30 días</p>
          </div>
        </div>
        <div className="card-dark flex items-start gap-4">
          <div className="w-12 h-12 bg-terza-blue/10 rounded-xl flex items-center justify-center">
            <Package size={22} className="text-terza-blue-bright" />
          </div>
          <div>
            <p className="text-terza-gray text-sm">Stock disponible</p>
            <p className="text-white text-2xl font-bold">{data.stock.total_units} uds</p>
            <p className="text-terza-gray/60 text-xs mt-1">{data.stock.total_products} productos activos</p>
          </div>
        </div>
        <div className="card-dark flex items-start gap-4">
          <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center">
            <AlertTriangle size={22} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-terza-gray text-sm">Stock bajo</p>
            <p className="text-white text-2xl font-bold">{data.stock.low_stock}</p>
            <p className="text-terza-gray/60 text-xs mt-1">Valor retail {formatMoney(Number(data.stock.stock_retail_value))}</p>
          </div>
        </div>
        <div className="card-dark flex items-start gap-4">
          <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
            <XCircle size={22} className="text-red-400" />
          </div>
          <div>
            <p className="text-terza-gray text-sm">Sin stock</p>
            <p className="text-white text-2xl font-bold">{data.stock.out_of_stock}</p>
            <p className="text-terza-gray/60 text-xs mt-1">{data.totals.sales_last_30d} ventas en 30 días</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-dark">
          <h3 className="text-white font-bold mb-1">Ventas por canal</h3>
          <p className="text-terza-gray text-xs mb-5">Facturación acumulada</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="channel" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                formatter={(v: number) => [formatMoney(v), 'Facturación']}
              />
              <Bar dataKey="revenue" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card-dark">
          <h3 className="text-white font-bold mb-4">Últimas ventas</h3>
          <div className="space-y-3">
            {data.recent_sales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="text-white truncate">{channelLabels[sale.channel] ?? sale.channel}</p>
                  <p className="text-terza-gray text-xs truncate">{sale.customer_name || 'Cliente'}</p>
                </div>
                <span className="text-green-400 font-medium whitespace-nowrap">
                  {formatMoney(Number(sale.total_amount))}
                </span>
              </div>
            ))}
            {data.recent_sales.length === 0 && (
              <p className="text-terza-gray text-sm">Sin ventas registradas</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
