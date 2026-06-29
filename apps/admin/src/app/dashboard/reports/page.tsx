'use client'
import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { FileDown, TrendingUp, Package } from 'lucide-react'
import { apiFetch } from '@/utils/apiFetch'

interface Product {
  id: string
  name: string
  category: string
  purchase_price: number
  sale_price: number
  stock_quantity: number
}

const COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#1D4ED8']

export default function ReportsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/products?active=true&limit=100')
      .then(r => r.json())
      .then(res => { if (res.data) setProducts(res.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const stockByCategory = useMemo(() => {
    const byCategory = products.reduce((acc, p) => {
      const cat = p.category || 'Sin categoría'
      if (!acc[cat]) acc[cat] = { category: cat, value: 0, units: 0 }
      acc[cat].value += p.stock_quantity * p.sale_price
      acc[cat].units += p.stock_quantity
      return acc
    }, {} as Record<string, { category: string; value: number; units: number }>)
    return Object.values(byCategory).sort((a, b) => b.value - a.value)
  }, [products])

  const marginData = useMemo(() =>
    products
      .filter(p => p.purchase_price > 0)
      .map(p => ({
        name: p.name,
        buy: p.purchase_price,
        sell: p.sale_price,
        margin: Math.round(((p.sale_price - p.purchase_price) / p.purchase_price) * 100),
      }))
      .sort((a, b) => b.margin - a.margin),
    [products]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-terza-gray text-sm">Cargando reportes...</p>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Package size={32} className="text-terza-gray/40 mb-3" />
        <p className="text-terza-gray text-sm">No hay productos para generar reportes</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">Análisis de stock y márgenes</h2>
          <p className="text-terza-gray text-sm">Basado en productos activos del inventario</p>
        </div>
        <button className="btn-secondary flex items-center gap-2 text-sm py-2 px-4">
          <FileDown size={16} />
          Exportar CSV
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-dark">
          <h3 className="text-white font-bold mb-1">Valor en stock por categoría</h3>
          <p className="text-terza-gray text-xs mb-5">Precio de venta × unidades</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stockByCategory} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="category" type="category" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                formatter={(v: number) => [`$${v.toLocaleString()}`, 'Valor']}
              />
              <Bar dataKey="value" fill="#2563EB" radius={[0, 4, 4, 0]} name="Valor" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card-dark">
          <h3 className="text-white font-bold mb-1">Distribución de unidades</h3>
          <p className="text-terza-gray text-xs mb-5">Porcentaje de unidades en stock</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={stockByCategory} dataKey="units" nameKey="category" cx="50%" cy="50%" outerRadius={90}
                paddingAngle={3}>
                {stockByCategory.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                formatter={(v: number, name: string) => [v + ' uds', name]}
              />
              <Legend formatter={v => <span style={{ color: '#9CA3AF', fontSize: 12 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-dark">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={18} className="text-green-400" />
          <h3 className="text-white font-bold">Análisis de márgenes por producto</h3>
        </div>
        <p className="text-terza-gray text-xs mb-6">Precio de compra vs venta y margen porcentual</p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-terza-gray-dark/30">
                {['Producto', 'P. Compra', 'P. Venta', 'Ganancia', 'Margen %'].map(h => (
                  <th key={h} className="text-left text-terza-gray text-xs uppercase tracking-wider px-4 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {marginData.map(p => (
                <tr key={p.name} className="border-b border-terza-gray-dark/20">
                  <td className="px-4 py-3 text-white text-sm">{p.name}</td>
                  <td className="px-4 py-3 text-terza-gray text-sm">${p.buy.toFixed(2)}</td>
                  <td className="px-4 py-3 text-white text-sm">${p.sell.toFixed(2)}</td>
                  <td className="px-4 py-3 text-green-400 text-sm">+${(p.sell - p.buy).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-terza-navy rounded-full h-1.5 max-w-[80px]">
                        <div className="bg-green-500 rounded-full h-1.5" style={{ width: `${Math.min(100, p.margin / 3)}%` }} />
                      </div>
                      <span className="text-green-400 text-sm font-bold">{p.margin}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
