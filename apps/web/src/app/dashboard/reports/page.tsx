'use client'
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { FileDown, TrendingUp } from 'lucide-react'

const stockByCategory = [
  { category: 'Cables', value: 1948, units: 150 },
  { category: 'Audio', value: 2699, units: 45 },
  { category: 'Cargadores', value: 2799, units: 80 },
  { category: 'Accesorios', value: 3398, units: 200 },
  { category: 'Bolsos', value: 1499, units: 60 },
]

const marginData = [
  { name: 'Cable USB-C 2m', buy: 3.5, sell: 12.99, margin: 271 },
  { name: 'Auriculares TWS', buy: 18, sell: 59.99, margin: 233 },
  { name: 'Cargador 65W', buy: 12, sell: 34.99, margin: 192 },
  { name: 'Soporte Auto', buy: 4.5, sell: 16.99, margin: 278 },
  { name: 'Funda NB 15"', buy: 8, sell: 24.99, margin: 212 },
]

const COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#1D4ED8']

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">Análisis de stock y márgenes</h2>
          <p className="text-terza-gray text-sm">Datos de demo — conectá la API para reportes reales</p>
        </div>
        <button className="btn-secondary flex items-center gap-2 text-sm py-2 px-4">
          <FileDown size={16} />
          Exportar CSV
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Valor por categoría */}
        <div className="card-dark">
          <h3 className="text-white font-bold mb-1">Valor en stock por categoría</h3>
          <p className="text-terza-gray text-xs mb-5">En dólares</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stockByCategory} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="category" type="category" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                formatter={(v: number) => [`$${v.toLocaleString()}`, 'Valor']}
              />
              <Bar dataKey="value" fill="#2563EB" radius={[0, 4, 4, 0]} name="Valor USD" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribución por categoría (pie) */}
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

      {/* Márgenes */}
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
