'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Plus, Search, Package, RefreshCw, Boxes, AlertTriangle, XCircle } from 'lucide-react'
import ProductModal from '@/components/dashboard/ProductModal'
import ProductCard from '@/components/dashboard/ProductCard'
import { MeliPublicationGroup } from '@/components/dashboard/MeliPublications'
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
  unit: string
  supplier: string | null
  origin_country: string | null
  image_url: string | null
  images: string[]
  meli_listings_count?: number
  meli_publication_groups?: MeliPublicationGroup[]
}

type StockFilter = 'all' | 'low' | 'out'

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [consolidating, setConsolidating] = useState(false)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/products?active=true&search=${encodeURIComponent(search)}`)
      const json = await res.json()
      if (json.data) setProducts(json.data)
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const t = setTimeout(() => fetchProducts(), search ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetchProducts, search])

  const stats = useMemo(() => {
    const low = products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock).length
    const out = products.filter((p) => p.stock_quantity === 0).length
    const listings = products.reduce((n, p) => n + (p.meli_listings_count ?? 0), 0)
    const retail = products.reduce((n, p) => n + p.sale_price * p.stock_quantity, 0)
    return { total: products.length, low, out, listings, retail }
  }, [products])

  const filtered = useMemo(() => {
    if (stockFilter === 'low') {
      return products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock)
    }
    if (stockFilter === 'out') {
      return products.filter((p) => p.stock_quantity === 0)
    }
    return products
  }, [products, stockFilter])

  const handleConsolidate = async () => {
    setConsolidating(true)
    try {
      const res = await apiFetch('/api/products/consolidate', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al consolidar')
      await fetchProducts()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo consolidar')
    } finally {
      setConsolidating(false)
    }
  }

  const filterButtons: { id: StockFilter; label: string; count?: number }[] = [
    { id: 'all', label: 'Todos', count: stats.total },
    { id: 'low', label: 'Stock bajo', count: stats.low },
    { id: 'out', label: 'Sin stock', count: stats.out },
  ]

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-dark !p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-terza-blue/10 flex items-center justify-center">
            <Boxes size={20} className="text-terza-blue-bright" />
          </div>
          <div>
            <p className="text-terza-gray text-xs">Productos</p>
            <p className="text-white text-xl font-bold">{stats.total}</p>
          </div>
        </div>
        <div className="card-dark !p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
            <AlertTriangle size={20} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-terza-gray text-xs">Stock bajo</p>
            <p className="text-white text-xl font-bold">{stats.low}</p>
          </div>
        </div>
        <div className="card-dark !p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <XCircle size={20} className="text-red-400" />
          </div>
          <div>
            <p className="text-terza-gray text-xs">Sin stock</p>
            <p className="text-white text-xl font-bold">{stats.out}</p>
          </div>
        </div>
        <div className="card-dark !p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Package size={20} className="text-green-400" />
          </div>
          <div>
            <p className="text-terza-gray text-xs">Valor en stock</p>
            <p className="text-white text-lg font-bold truncate">{formatMoney(stats.retail)}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-terza-gray" />
            <input
              type="text"
              placeholder="Buscar por nombre o SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-terza-navy-light border border-terza-gray-dark/50 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-terza-gray/50 focus:outline-none focus:border-terza-blue text-sm"
            />
          </div>
          <div className="flex gap-2">
            {filterButtons.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStockFilter(f.id)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  stockFilter === f.id
                    ? 'bg-terza-blue/15 border-terza-blue/40 text-white'
                    : 'border-terza-gray-dark/40 text-terza-gray hover:text-white hover:border-terza-gray-dark'
                }`}
              >
                {f.label}
                {f.count != null && (
                  <span className="ml-1.5 text-terza-gray/70">({f.count})</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleConsolidate}
            disabled={consolidating}
            className="btn-secondary text-sm py-2.5 px-4 flex items-center gap-2"
          >
            <RefreshCw size={15} className={consolidating ? 'animate-spin' : ''} />
            {consolidating ? 'Sync ML...' : 'Sync ML'}
          </button>
          <button
            onClick={() => { setEditProduct(null); setModalOpen(true) }}
            className="btn-primary flex items-center gap-2 text-sm py-2.5 px-4"
          >
            <Plus size={16} />
            Nuevo
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card-dark !p-4 h-36 animate-pulse bg-terza-navy-medium/30" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-dark text-center py-16">
          <Package size={40} className="text-terza-gray/30 mx-auto mb-4" />
          <p className="text-white font-medium">No hay productos</p>
          <p className="text-terza-gray text-sm mt-1">
            {search || stockFilter !== 'all' ? 'Probá otro filtro o búsqueda' : 'Creá tu primer producto'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              expanded={expandedId === p.id}
              onToggleMeli={() => setExpandedId((prev) => (prev === p.id ? null : p.id))}
              onEdit={() => { setEditProduct(p); setModalOpen(true) }}
            />
          ))}
        </div>
      )}

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
