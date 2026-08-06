'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'
import {
  FileDown, TrendingUp, Package, DollarSign, ShoppingCart,
  AlertTriangle, XCircle, Wallet, ArrowUpRight,
  Store, Eye,
} from 'lucide-react'
import { apiFetch } from '@/utils/apiFetch'

interface Product {
  id: string
  name: string
  sku: string
  category: string
  purchase_price: number
  sale_price: number
  stock_quantity: number
  min_stock: number
  image_url?: string | null
}

interface SalesDashboard {
  stock: {
    total_products: number
    total_units: number
    stock_cost_value: number
    stock_retail_value: number
    low_stock: number
    out_of_stock: number
  }
  totals: {
    total_revenue: number
    revenue_last_30d: number
    sales_last_30d: number
    total_sales: number
  }
  by_channel: Array<{
    channel: string
    sales_count: number
    revenue: number
    sales_last_30d: number
    revenue_last_30d: number
  }>
}

interface StockDashboard {
  total_products: number
  total_stock_value: number
  low_stock_products: number
  out_of_stock_products: number
  top_products: Array<{
    id: string
    name: string
    stock_quantity: number
    sale_price: number
    total_value: number
  }>
  monthly_movements: Array<{ month: string; entries: number; exits: number }>
}

interface ExpenseSummary {
  categories: Record<string, number>
  total: number
  count: number
}

interface MeliMetrics {
  items?: { active: number; paused: number; visits_last_30d: number }
  orders?: { gross_sales: number; paid: number }
}

const COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#34D399', '#FBBF24', '#F87171']
const CHANNEL_LABELS: Record<string, string> = {
  mercadolibre: 'Mercado Libre',
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  presencial: 'Presencial',
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
}

function daysAgoISO(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function exportCsv(filename: string, rows: Record<string, string | number>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const body = rows.map((row) =>
    headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
  )
  const csv = [headers.join(','), ...body].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const tooltipStyle = {
  background: '#111827',
  border: '1px solid #374151',
  borderRadius: '8px',
  color: '#fff',
}

export default function ReportsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<SalesDashboard | null>(null)
  const [stockDash, setStockDash] = useState<StockDashboard | null>(null)
  const [expenses, setExpenses] = useState<ExpenseSummary | null>(null)
  const [meli, setMeli] = useState<MeliMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const start30 = daysAgoISO(30)
    try {
      const [prodRes, salesRes, stockRes, expRes, meliRes] = await Promise.all([
        apiFetch('/api/products?active=true&limit=100'),
        apiFetch('/api/sales/dashboard'),
        apiFetch('/api/stock/dashboard'),
        apiFetch(`/api/expenses/summary?start_date=${start30}`),
        apiFetch('/api/mercadolibre/metrics'),
      ])
      const prodJson = await prodRes.json()
      const salesJson = await salesRes.json()
      const stockJson = await stockRes.json()
      const expJson = await expRes.json()
      const meliJson = await meliRes.json()

      if (prodJson.data) setProducts(prodJson.data)
      if (salesJson.data) setSales(salesJson.data)
      if (stockJson.data) setStockDash(stockJson.data)
      if (expJson.data) setExpenses(expJson.data)
      if (meliJson.data) setMeli(meliJson.data)
    } catch {
      /* partial data ok */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const marginData = useMemo(() =>
    products
      .filter((p) => p.purchase_price > 0)
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        buy: p.purchase_price,
        sell: p.sale_price,
        stock: p.stock_quantity,
        profitUnit: p.sale_price - p.purchase_price,
        margin: Math.round(((p.sale_price - p.purchase_price) / p.purchase_price) * 100),
        potential: (p.sale_price - p.purchase_price) * p.stock_quantity,
      }))
      .sort((a, b) => b.margin - a.margin),
    [products]
  )

  const channelChart = useMemo(() =>
    (sales?.by_channel ?? []).map((ch) => ({
      channel: CHANNEL_LABELS[ch.channel] ?? ch.channel,
      revenue: Number(ch.revenue),
      revenue30: Number(ch.revenue_last_30d),
      sales30: ch.sales_last_30d,
    })),
    [sales]
  )

  const expenseChart = useMemo(() =>
    Object.entries(expenses?.categories ?? {}).map(([cat, amount]) => ({
      category: cat,
      value: Number(amount),
    })).sort((a, b) => b.value - a.value),
    [expenses]
  )

  const lowStockProducts = useMemo(() =>
    products
      .filter((p) => p.stock_quantity <= p.min_stock)
      .sort((a, b) => a.stock_quantity - b.stock_quantity),
    [products]
  )

  const grossMarginStock = sales
    ? Number(sales.stock.stock_retail_value) - Number(sales.stock.stock_cost_value)
    : 0

  const netEstimate30 =
    Number(sales?.totals.revenue_last_30d ?? 0) - Number(expenses?.total ?? 0)

  const handleExportInventory = () => {
    exportCsv(
      'inventario-terza.csv',
      products.map((p) => ({
        sku: p.sku,
        nombre: p.name,
        categoria: p.category,
        stock: p.stock_quantity,
        precio_compra: p.purchase_price,
        precio_venta: p.sale_price,
        valor_retail: p.stock_quantity * p.sale_price,
        valor_costo: p.stock_quantity * p.purchase_price,
      }))
    )
  }

  const handleExportMargins = () => {
    exportCsv(
      'margenes-terza.csv',
      marginData.map((p) => ({
        sku: p.sku,
        producto: p.name,
        compra: p.buy,
        venta: p.sell,
        margen_pct: p.margin,
        ganancia_unidad: p.profitUnit,
        stock: p.stock,
        ganancia_potencial: p.potential,
      }))
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-terza-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-terza-gray text-sm">Generando reportes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-white font-bold text-lg">Reportes del negocio</h2>
          <p className="text-terza-gray text-sm">
            Ventas, inventario, gastos y Mercado Libre — últimos 30 días donde aplica
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportInventory} className="btn-secondary text-sm py-2 px-3 flex items-center gap-2">
            <FileDown size={15} />
            Inventario CSV
          </button>
          <button onClick={handleExportMargins} className="btn-secondary text-sm py-2 px-3 flex items-center gap-2">
            <FileDown size={15} />
            Márgenes CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-dark !p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <DollarSign size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-terza-gray text-xs">Facturación total</p>
              <p className="text-white text-lg font-bold">{formatMoney(Number(sales?.totals.total_revenue ?? 0))}</p>
              <p className="text-terza-gray/60 text-[11px]">{formatMoney(Number(sales?.totals.revenue_last_30d ?? 0))} · 30d</p>
            </div>
          </div>
        </div>
        <div className="card-dark !p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-terza-blue/10 flex items-center justify-center">
              <Package size={20} className="text-terza-blue-bright" />
            </div>
            <div>
              <p className="text-terza-gray text-xs">Valor en stock</p>
              <p className="text-white text-lg font-bold">{formatMoney(Number(sales?.stock.stock_retail_value ?? 0))}</p>
              <p className="text-terza-gray/60 text-[11px]">{sales?.stock.total_units ?? 0} unidades</p>
            </div>
          </div>
        </div>
        <div className="card-dark !p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-terza-gray text-xs">Margen en stock</p>
              <p className="text-white text-lg font-bold">{formatMoney(grossMarginStock)}</p>
              <p className="text-terza-gray/60 text-[11px]">retail − costo</p>
            </div>
          </div>
        </div>
        <div className="card-dark !p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Wallet size={20} className="text-orange-400" />
            </div>
            <div>
              <p className="text-terza-gray text-xs">Gastos (30d)</p>
              <p className="text-white text-lg font-bold">{formatMoney(Number(expenses?.total ?? 0))}</p>
              <p className="text-terza-gray/60 text-[11px]">
                Neto est. {formatMoney(netEstimate30)}
              </p>
            </div>
          </div>
        </div>
        <div className="card-dark !p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <ShoppingCart size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-terza-gray text-xs">Ventas (30d)</p>
              <p className="text-white text-lg font-bold">{sales?.totals.sales_last_30d ?? 0}</p>
              <p className="text-terza-gray/60 text-[11px]">{sales?.totals.total_sales ?? 0} históricas</p>
            </div>
          </div>
        </div>
        <div className="card-dark !p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <AlertTriangle size={20} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-terza-gray text-xs">Stock bajo</p>
              <p className="text-white text-lg font-bold">{sales?.stock.low_stock ?? 0}</p>
              <p className="text-terza-gray/60 text-[11px]">{sales?.stock.out_of_stock ?? 0} sin stock</p>
            </div>
          </div>
        </div>
        <div className="card-dark !p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <Store size={20} className="text-sky-400" />
            </div>
            <div>
              <p className="text-terza-gray text-xs">ML activas</p>
              <p className="text-white text-lg font-bold">{meli?.items?.active ?? '—'}</p>
              <p className="text-terza-gray/60 text-[11px]">{meli?.items?.paused ?? 0} pausadas</p>
            </div>
          </div>
        </div>
        <div className="card-dark !p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Eye size={20} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-terza-gray text-xs">Visitas ML (30d)</p>
              <p className="text-white text-lg font-bold">
                {(meli?.items?.visits_last_30d ?? 0).toLocaleString('es-AR')}
              </p>
              <p className="text-terza-gray/60 text-[11px]">
                {formatMoney(Number(meli?.orders?.gross_sales ?? 0))} ML
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-dark">
          <h3 className="text-white font-bold mb-1">Ventas por canal</h3>
          <p className="text-terza-gray text-xs mb-4">Facturación acumulada y últimos 30 días</p>
          {channelChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={channelChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="channel" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatMoney(v)} />
                <Bar dataKey="revenue" fill="#2563EB" radius={[4, 4, 0, 0]} name="Total" />
                <Bar dataKey="revenue30" fill="#60A5FA" radius={[4, 4, 0, 0]} name="30 días" />
                <Legend formatter={(v) => <span style={{ color: '#9CA3AF', fontSize: 12 }}>{v}</span>} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-terza-gray text-sm py-12 text-center">Sin ventas registradas</p>
          )}
        </div>

        <div className="card-dark">
          <h3 className="text-white font-bold mb-1">Gastos por categoría</h3>
          <p className="text-terza-gray text-xs mb-4">Últimos 30 días · {expenses?.count ?? 0} registros</p>
          {expenseChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={expenseChart} dataKey="value" nameKey="category" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {expenseChart.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatMoney(v)} />
                <Legend formatter={(v) => <span style={{ color: '#9CA3AF', fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-terza-gray text-sm py-12 text-center">Sin gastos en el período</p>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-dark">
          <h3 className="text-white font-bold mb-1">Movimientos de stock</h3>
          <p className="text-terza-gray text-xs mb-4">Entradas y salidas por mes</p>
          {(stockDash?.monthly_movements?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={stockDash!.monthly_movements}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="entries" stroke="#34D399" strokeWidth={2} name="Entradas" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="exits" stroke="#F87171" strokeWidth={2} name="Salidas" dot={{ r: 3 }} />
                <Legend formatter={(v) => <span style={{ color: '#9CA3AF', fontSize: 12 }}>{v}</span>} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-terza-gray text-sm py-12 text-center">Sin movimientos recientes</p>
          )}
        </div>

        <div className="card-dark">
          <h3 className="text-white font-bold mb-1">Top productos por valor</h3>
          <p className="text-terza-gray text-xs mb-4">Precio venta × stock actual</p>
          {(stockDash?.top_products?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stockDash!.top_products} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={100}
                  tickFormatter={(v) => (v.length > 18 ? `${v.slice(0, 18)}…` : v)}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatMoney(v)} />
                <Bar dataKey="total_value" fill="#3B82F6" radius={[0, 4, 4, 0]} name="Valor" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-terza-gray text-sm py-12 text-center">Sin datos</p>
          )}
        </div>
      </div>

      {/* Alerts + margins */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card-dark lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-yellow-400" />
            <h3 className="text-white font-bold">Alertas de stock</h3>
          </div>
          <div className="space-y-2">
            {lowStockProducts.slice(0, 8).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-terza-navy/50 text-sm">
                <div className="min-w-0">
                  <p className="text-white truncate">{p.name}</p>
                  <p className="text-terza-gray/60 text-xs font-mono">{p.sku}</p>
                </div>
                <div className="text-right shrink-0">
                  {p.stock_quantity === 0 ? (
                    <span className="text-red-400 text-xs flex items-center gap-1">
                      <XCircle size={12} /> 0
                    </span>
                  ) : (
                    <span className="text-yellow-400 text-xs flex items-center gap-1">
                      <AlertTriangle size={12} /> {p.stock_quantity}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {lowStockProducts.length === 0 && (
              <p className="text-terza-gray text-sm text-center py-6">Todo el stock está OK</p>
            )}
          </div>
        </div>

        <div className="card-dark lg:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={18} className="text-green-400" />
            <h3 className="text-white font-bold">Márgenes por producto</h3>
          </div>
          <p className="text-terza-gray text-xs mb-4">Ganancia potencial = margen × stock actual</p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-terza-gray-dark/30">
                  {['Producto', 'P. compra', 'P. venta', 'Margen', 'Stock', 'Ganancia pot.'].map((h) => (
                    <th key={h} className="text-left text-terza-gray text-[10px] uppercase tracking-wider px-3 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {marginData.map((p) => (
                  <tr key={p.id} className="border-b border-terza-gray-dark/15 hover:bg-terza-navy-medium/30">
                    <td className="px-3 py-2.5">
                      <p className="text-white text-sm truncate max-w-[180px]">{p.name}</p>
                      <p className="text-terza-gray/50 text-[10px] font-mono">{p.sku}</p>
                    </td>
                    <td className="px-3 py-2.5 text-terza-gray text-sm">{formatMoney(p.buy)}</td>
                    <td className="px-3 py-2.5 text-white text-sm">{formatMoney(p.sell)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-sm font-semibold ${p.margin >= 30 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {p.margin}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-white text-sm">{p.stock}</td>
                    <td className="px-3 py-2.5 text-green-400 text-sm font-medium">
                      {formatMoney(p.potential)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {marginData.length === 0 && (
              <p className="text-terza-gray text-sm text-center py-8">Sin datos de márgenes (falta precio de compra)</p>
            )}
          </div>
        </div>
      </div>

      {/* Channel detail table */}
      {channelChart.length > 0 && (
        <div className="card-dark">
          <h3 className="text-white font-bold mb-4">Detalle por canal de venta</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {channelChart.map((ch) => (
              <div key={ch.channel} className="rounded-xl border border-terza-gray-dark/30 bg-terza-navy/40 p-4">
                <p className="text-white font-medium text-sm">{ch.channel}</p>
                <p className="text-green-400 font-bold text-lg mt-1">{formatMoney(ch.revenue)}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-terza-gray">
                  <span className="flex items-center gap-1">
                    <ArrowUpRight size={12} className="text-green-400" />
                    {formatMoney(ch.revenue30)} · 30d
                  </span>
                  <span>{ch.sales30} ventas</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
