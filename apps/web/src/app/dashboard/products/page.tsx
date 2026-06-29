'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Edit, Power, Package, AlertCircle } from 'lucide-react'
import ProductModal from '@/components/dashboard/ProductModal'

interface Product {
  id: string
  name: string
  sku: string
  category: string
  purchase_price: number
  sale_price: number
  stock_quantity: number
  min_stock: number
  unit: string
  supplier: string | null
  origin_country: string | null
  image_url: string | null
  images: string[]
  active: boolean
}

import { apiFetch } from '@/utils/apiFetch'

const DEMO_PRODUCTS: Product[] = [
  { id: '1', name: 'Cable USB-C Premium 2m', sku: 'CAB-USBC-2M', category: 'Cables', purchase_price: 3.50, sale_price: 12.99, stock_quantity: 150, min_stock: 20, unit: 'unidad', supplier: 'TechSupply Co.', origin_country: 'China', active: true },
  { id: '2', name: 'Auriculares Bluetooth TWS', sku: 'AUR-BT-TWS01', category: 'Audio', purchase_price: 18.00, sale_price: 59.99, stock_quantity: 45, min_stock: 10, unit: 'unidad', supplier: 'AudioMax Ltd.', origin_country: 'China', active: true },
  { id: '3', name: 'Cargador Rápido 65W GaN', sku: 'CAR-GAN-65W', category: 'Cargadores', purchase_price: 12.00, sale_price: 34.99, stock_quantity: 80, min_stock: 15, unit: 'unidad', supplier: 'PowerTech', origin_country: 'China', active: true },
  { id: '4', name: 'Soporte Celular Auto Magnético', sku: 'SOP-AUTO-MAG', category: 'Accesorios', purchase_price: 4.50, sale_price: 16.99, stock_quantity: 200, min_stock: 30, unit: 'unidad', supplier: 'MountPro', origin_country: 'China', active: true },
  { id: '5', name: 'Funda Notebook 15"', sku: 'FUN-NB-15', category: 'Bolsos', purchase_price: 8.00, sale_price: 24.99, stock_quantity: 60, min_stock: 10, unit: 'unidad', supplier: 'BagWorld', origin_country: 'Vietnam', active: true },
]

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isDemo, setIsDemo] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)

  const fetchProducts = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/products?search=${search}`)
      const json = await res.json()
      if (json.data) setProducts(json.data)
      else { setProducts(DEMO_PRODUCTS); setIsDemo(true) }
    } catch {
      setProducts(DEMO_PRODUCTS)
      setIsDemo(true)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const handleEdit = (p: Product) => { setEditProduct(p); setModalOpen(true) }
  const handleNew = () => { setEditProduct(null); setModalOpen(true) }

  const stockStatus = (p: Product) => {
    if (p.stock_quantity === 0) return { label: 'Sin stock', color: 'text-red-400 bg-red-500/10' }
    if (p.stock_quantity <= p.min_stock) return { label: 'Stock bajo', color: 'text-yellow-400 bg-yellow-500/10' }
    return { label: 'OK', color: 'text-green-400 bg-green-500/10' }
  }

  return (
    <div className="space-y-6">
      {isDemo && (
        <div className="bg-terza-blue/10 border border-terza-blue/30 rounded-xl px-4 py-3 text-terza-blue-bright text-sm">
          Mostrando datos de demo. Conectá la API para ver datos reales.
        </div>
      )}

      {/* Header + actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-terza-gray" />
          <input
            type="text"
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-terza-navy-light border border-terza-gray-dark/50 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-terza-gray/50 focus:outline-none focus:border-terza-blue text-sm"
          />
        </div>
        <button onClick={handleNew} className="btn-primary flex items-center gap-2 text-sm py-2.5 whitespace-nowrap">
          <Plus size={16} />
          Nuevo producto
        </button>
      </div>

      {/* Table */}
      <div className="card-dark overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-terza-gray-dark/30">
                {['Producto', 'SKU', 'Categoría', 'Precio compra', 'Precio venta', 'Stock', 'Estado'].map(h => (
                  <th key={h} className="text-left text-terza-gray text-xs font-semibold uppercase tracking-wider px-4 py-3">
                    {h}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-terza-gray">Cargando...</td></tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <Package size={32} className="text-terza-gray/40 mx-auto mb-3" />
                    <p className="text-terza-gray text-sm">No hay productos</p>
                  </td>
                </tr>
              ) : products.map(p => {
                const status = stockStatus(p)
                const margin = p.purchase_price > 0 ? ((p.sale_price - p.purchase_price) / p.purchase_price * 100).toFixed(0) : '—'
                return (
                  <tr key={p.id} className="border-b border-terza-gray-dark/20 hover:bg-terza-navy-medium/50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white text-sm font-medium">{p.name}</p>
                        <p className="text-terza-gray text-xs">{p.supplier} · {p.origin_country}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-terza-gray text-xs font-mono">{p.sku}</td>
                    <td className="px-4 py-3">
                      <span className="bg-terza-blue/10 text-terza-blue-bright text-xs px-2 py-0.5 rounded-full">{p.category}</span>
                    </td>
                    <td className="px-4 py-3 text-white text-sm">${p.purchase_price.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-white text-sm">${p.sale_price.toFixed(2)}</span>
                        <span className="text-green-400 text-xs ml-1">+{margin}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {p.stock_quantity <= p.min_stock && p.stock_quantity > 0 && (
                          <AlertCircle size={12} className="text-yellow-400" />
                        )}
                        <span className="text-white text-sm">{p.stock_quantity}</span>
                        <span className="text-terza-gray text-xs">{p.unit}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleEdit(p)}
                        className="text-terza-gray hover:text-terza-blue-bright transition-colors p-1">
                        <Edit size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <ProductModal
          product={editProduct}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); fetchProducts() }}
        />
      )}
    </div>
  )
}
