import { MessageCircle, ArrowRight, ShoppingBag } from 'lucide-react'
import { apiFetch } from '@/utils/apiFetch'
import Image from 'next/image'

const WA_NUMBER = '5491170751477'

interface Product {
  id: string
  name: string
  description: string | null
  sale_price: number
  images: string[] | null
  image_url: string | null
  stock_quantity: number
}

async function getProducts(): Promise<Product[]> {
  try {
    const res = await apiFetch('/api/products?active=true&limit=100')
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

function waLink(productName: string) {
  const text = encodeURIComponent(
    `Hola! Me interesa el producto *${productName}* de terzaimports.com.ar. ¿Podrían darme precio y disponibilidad?`
  )
  return `https://wa.me/${WA_NUMBER}?text=${text}`
}

function ProductCard({ product }: { product: Product }) {
  const primaryImage =
    (product.images && product.images.length > 0 ? product.images[0] : null) ??
    product.image_url

  const inStock = product.stock_quantity > 0

  return (
    <div className="group bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {primaryImage ? (
          <Image
            src={primaryImage}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <ShoppingBag size={48} className="text-gray-300" />
            <span className="text-gray-400 text-xs">Imagen próximamente</span>
          </div>
        )}

        {/* Stock badge */}
        <div className="absolute top-3 right-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            inStock ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {inStock ? 'En stock' : 'Sin stock'}
          </span>
        </div>

        {/* Extra image thumbnails */}
        {product.images && product.images.length > 1 && (
          <div className="absolute bottom-2 left-2 flex gap-1">
            {product.images.slice(1, 4).map((img, i) => (
              <div key={i} className="w-9 h-9 rounded-lg overflow-hidden border-2 border-white shadow bg-gray-100">
                <Image src={img} alt="" width={36} height={36} className="object-cover w-full h-full" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-gray-900 font-bold text-lg mb-2 leading-tight">{product.name}</h3>
        {product.description && (
          <p className="text-gray-500 text-sm leading-relaxed mb-4 flex-1 line-clamp-3">
            {product.description}
          </p>
        )}

        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Precio</p>
            {product.sale_price > 0 ? (
              <p className="text-gray-900 font-black text-xl">
                ${product.sale_price.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
              </p>
            ) : (
              <p className="text-terza-blue font-semibold text-sm">Consultá precio</p>
            )}
          </div>
          <a
            href={waLink(product.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap shadow-sm"
          >
            <MessageCircle size={15} />
            Consultar
          </a>
        </div>
      </div>
    </div>
  )
}

export default async function Products() {
  const products = await getProducts()

  return (
    <section id="productos" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-terza-blue text-sm font-semibold tracking-widest uppercase">Marketplace</span>
          <h2 className="section-title-light mt-3">Nuestros productos</h2>
          <p className="section-subtitle-light">
            Productos importados directamente de los mejores fabricantes.
            Consultá precio y disponibilidad por WhatsApp al instante.
          </p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">Próximamente nuevos productos.</p>
          </div>
        ) : (
          <div className={`grid gap-8 ${
            products.length === 1 ? 'max-w-md mx-auto' :
            products.length === 2 ? 'sm:grid-cols-2 max-w-3xl mx-auto' :
            'sm:grid-cols-2 lg:grid-cols-3'
          }`}>
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}

        <div className="text-center mt-14">
          <p className="text-gray-500 mb-5">¿Buscás algo que no ves acá?</p>
          <a href="#contacto" className="btn-primary inline-flex items-center gap-2">
            Solicitar cotización
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </section>
  )
}
