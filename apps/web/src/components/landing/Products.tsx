import { MessageCircle, ArrowRight, Expand } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { LANDING_PRODUCTS, type LandingProduct } from '@/data/landingProducts'
import { whatsAppHref } from '@/lib/contact'
import { isAnimatedAsset } from '@/lib/media'

function ProductCard({ product }: { product: LandingProduct }) {
  const primaryImage =
    (product.images && product.images.length > 0 ? product.images[0] : null) ??
    product.image_url

  const inStock = product.stock_quantity > 0

  return (
    <div className="group bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
      <Link
        href={`/productos/${product.id}`}
        className="relative aspect-[4/3] bg-gray-100 overflow-hidden block"
      >
        {isAnimatedAsset(primaryImage) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primaryImage}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <Image
            src={primaryImage}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, 25vw"
          />
        )}
        <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <Expand size={14} />
          Ver en grande
        </span>

        <div className="absolute top-3 right-3">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              inStock ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {inStock ? 'En stock' : 'Sin stock'}
          </span>
        </div>

        {product.images && product.images.length > 1 && (
          <div className="absolute bottom-2 left-2 flex gap-1">
            {product.images.slice(1, 4).map((img, i) => (
              <div
                key={i}
                className="w-9 h-9 rounded-lg overflow-hidden border-2 border-white shadow bg-gray-100"
              >
                <Image src={img} alt="" width={36} height={36} className="object-cover w-full h-full" />
              </div>
            ))}
          </div>
        )}
      </Link>

      <div className="p-5 flex flex-col flex-1">
        <Link href={`/productos/${product.id}`}>
          <h3 className="text-gray-900 font-bold text-lg mb-2 leading-tight hover:text-terza-blue transition-colors">
            {product.name}
          </h3>
        </Link>
        <p className="text-gray-500 text-sm leading-relaxed mb-4 flex-1 line-clamp-3">
          {product.description}
        </p>

        <div className="mt-auto space-y-3 border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-600">
            <span className="text-gray-400">Precio · </span>
            {product.sale_price > 0 ? (
              <span className="font-bold text-gray-900">
                ${product.sale_price.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
              </span>
            ) : (
              <span className="font-semibold text-terza-blue">Consultá por WhatsApp</span>
            )}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/productos/${product.id}`}
              className="flex min-h-[42px] items-center justify-center rounded-xl border border-gray-200 bg-white px-2 text-center text-sm font-semibold text-gray-800 transition-colors hover:border-terza-blue hover:text-terza-blue"
            >
              Ver producto
            </Link>
            <a
              href={whatsAppHref(product.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-green-600 px-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-500"
            >
              <MessageCircle size={16} className="shrink-0" />
              <span>Consultar</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Products() {
  const products = LANDING_PRODUCTS

  return (
    <section id="productos" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-terza-blue text-sm font-semibold tracking-widest uppercase">Marketplace</span>
          <h2 className="section-title-light mt-3">Nuestros productos</h2>
          <p className="section-subtitle-light">
            Lentes Meta, Oakley y audio DJI importados. Consultá precio y disponibilidad por WhatsApp al instante.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 max-w-7xl mx-auto">
          {products.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

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
