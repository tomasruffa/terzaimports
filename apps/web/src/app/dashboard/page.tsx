'use client'
import { useEffect, useState } from 'react'
import { Package, DollarSign, AlertTriangle, XCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

interface Metrics {
  total_products: number
  total_stock_value: number
  low_stock_products: number
  out_of_stock_products: number
  top_products: Array<{ id: string; name: string; stock_quantity: number; sale_price: number; total_value: number }>
  monthly_movements: Array<{ month: string; entries: number; exits: number }>
}

import { apiFetch } from '@/utils/apiFetch'

const EMPTY_METRICS: Metrics = {
  total_products: 0,
  total_stock_value: 0,
  low_stock_products: 0,
  out_of_stock_products: 0,
  top_products: [],
  monthly_movements: [],
}

const statCards = (m: Metrics) => [
  {
    label: 'Total Productos',
    value: m.total_products,
    icon: Package,
    color: 'text-terza-blue-bright',
    bg: 'bg-terza-blue/10',
    change: '+3 este mes'
  },
  {
    label: 'Valor en Stock',
    value: `$${m.total_stock_value.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`,
    icon: DollarSign,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    change: '+12% vs mes anterior'
  },
  {
    label: 'Stock Bajo',
    value: m.low_stock_products,
    icon: AlertTriangle,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    change: 'Requieren atención'
  },
  {
    label: 'Sin Stock',
    value: m.out_of_stock_products,
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    change: 'Productos agotados'
  },
]

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/stock/dashboard')
      .then(r => r.json())
      .then(res => {
        if (res.data) setMetrics(res.data)
      })
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

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards(metrics).map(card => (
          <div key={card.label} className="card-dark flex items-start gap-4">
            <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <card.icon size={22} className={card.color} />
            </div>
            <div>
              <p className="text-terza-gray text-sm">{card.label}</p>
              <p className="text-white text-2xl font-bold mt-0.5">{card.value}</p>
              <p className="text-terza-gray/60 text-xs mt-1">{card.change}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className="lg:col-span-2 card-dark">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-bold">Movimientos de Stock</h3>
              <p className="text-terza-gray text-xs">Entradas y salidas por mes</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-terza-gray">
                <span className="w-2 h-2 rounded-full bg-terza-blue inline-block" />Entradas
              </span>
              <span className="flex items-center gap-1.5 text-terza-gray">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Salidas
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={metrics.monthly_movements} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                cursor={{ fill: 'rgba(37,99,235,0.05)' }}
              />
              <Bar dataKey="entries" fill="#2563EB" radius={[4, 4, 0, 0]} name="Entradas" />
              <Bar dataKey="exits" fill="#60A5FA" radius={[4, 4, 0, 0]} name="Salidas" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top products */}
        <div className="card-dark">
          <h3 className="text-white font-bold mb-1">Top Productos</h3>
          <p className="text-terza-gray text-xs mb-5">Por valor en stock</p>
          <div className="space-y-4">
            {metrics.top_products.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-terza-gray text-xs w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 bg-terza-navy rounded-full h-1.5">
                      <div
                        className="bg-terza-blue rounded-full h-1.5 transition-all"
                        style={{ width: `${Math.min(100, (p.total_value / (metrics.top_products[0]?.total_value || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <span className="text-terza-blue-bright text-xs font-medium whitespace-nowrap">
                  ${p.total_value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
