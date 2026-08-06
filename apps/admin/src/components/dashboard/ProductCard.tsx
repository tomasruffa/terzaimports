'use client'

import { Edit, Package, AlertTriangle, TrendingUp } from 'lucide-react'
import {
  MeliPublicationGroup,
  MeliPublicationsExpandable,
  MeliPublicationsDetail,
} from './MeliPublications'

export interface ProductCardData {
  id: string
  name: string
  sku: string
  purchase_price: number
  sale_price: number
  stock_quantity: number
  min_stock: number
  unit: string
  image_url: string | null
  meli_listings_count?: number
  meli_publication_groups?: MeliPublicationGroup[]
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
}

function stockMeta(p: ProductCardData) {
  if (p.stock_quantity === 0) {
    return { label: 'Sin stock', dot: 'bg-red-400', badge: 'bg-red-500/15 text-red-400 border-red-500/20' }
  }
  if (p.stock_quantity <= p.min_stock) {
    return { label: 'Stock bajo', dot: 'bg-yellow-400', badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' }
  }
  return { label: 'Disponible', dot: 'bg-green-400', badge: 'bg-green-500/15 text-green-400 border-green-500/20' }
}

export default function ProductCard({
  product,
  expanded,
  onToggleMeli,
  onEdit,
}: {
  product: ProductCardData
  expanded: boolean
  onToggleMeli: () => void
  onEdit: () => void
}) {
  const stock = stockMeta(product)
  const groups = product.meli_publication_groups ?? []
  const canExpandMeli = groups.some((g) => g.is_variant_group) || groups.length > 1
  const margin =
    product.purchase_price > 0
      ? Math.round(((product.sale_price - product.purchase_price) / product.purchase_price) * 100)
      : null

  return (
    <article
      className="group relative bg-terza-navy-light border border-terza-gray-dark/30 rounded-2xl overflow-hidden hover:border-terza-blue/40 hover:shadow-lg hover:shadow-blue-900/10 transition-all duration-200"
    >
      <div className="flex gap-4 p-4">
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-xl overflow-hidden bg-terza-navy border border-terza-gray-dark/30">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-terza-gray/40">
              <Package size={32} />
            </div>
          )}
          <div className={`absolute top-2 left-2 w-2 h-2 rounded-full ${stock.dot} ring-2 ring-terza-navy-light`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2 pr-2">
                {product.name}
              </h3>
              <p className="text-terza-gray/80 text-xs font-mono mt-1 truncate">{product.sku}</p>
            </div>
            <button
              type="button"
              onClick={onEdit}
              className="shrink-0 p-2 rounded-lg text-terza-gray hover:text-white hover:bg-terza-navy-medium opacity-0 group-hover:opacity-100 transition-all"
              title="Editar producto"
            >
              <Edit size={16} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${stock.badge}`}>
              {stock.label}
            </span>
            <span className="text-terza-gray text-xs">
              {product.stock_quantity} {product.unit}
            </span>
            {product.stock_quantity <= product.min_stock && product.stock_quantity > 0 && (
              <AlertTriangle size={12} className="text-yellow-400" />
            )}
          </div>

          <div className="flex items-end justify-between gap-3 mt-3">
            <div>
              <p className="text-white font-bold text-lg leading-none">
                {formatMoney(product.sale_price)}
              </p>
              {margin != null && (
                <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                  <TrendingUp size={12} />
                  +{margin}% margen
                </p>
              )}
            </div>
            {groups.length > 0 && (
              <MeliPublicationsExpandable
                groups={groups}
                listingsCount={product.meli_listings_count}
                expanded={expanded}
                onToggle={() => canExpandMeli && onToggleMeli()}
              />
            )}
          </div>
        </div>
      </div>

      {expanded && canExpandMeli && (
        <div className="border-t border-terza-gray-dark/20 bg-terza-navy/40 px-4 pb-4">
          <MeliPublicationsDetail groups={groups} />
        </div>
      )}
    </article>
  )
}
