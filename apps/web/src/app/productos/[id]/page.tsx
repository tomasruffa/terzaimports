import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import ProductGallery from '@/components/product/ProductGallery'
import {
  LANDING_PRODUCTS,
  getProductById,
  productGalleryImages,
} from '@/data/landingProducts'
import { whatsAppHref } from '@/lib/contact'

type Props = { params: Promise<{ id: string }> }

export function generateStaticParams() {
  return LANDING_PRODUCTS.map(p => ({ id: p.id }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const product = getProductById(id)
  if (!product) return { title: 'Producto no encontrado | Terza Imports' }
  return {
    title: `${product.name} | Terza Imports`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [{ url: product.image_url }],
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params
  const product = getProductById(id)
  if (!product) notFound()

  const images = productGalleryImages(product)
  const inStock = product.stock_quantity > 0

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />

      <article className="pt-20 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/#productos"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-terza-blue"
          >
            <ArrowLeft size={18} />
            Volver al catálogo
          </Link>

          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 lg:items-start">
            <ProductGallery images={images} productName={product.name} />

            <div className="flex flex-col lg:sticky lg:top-24">
              <span
                className={`mb-4 inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                  inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {inStock ? 'En stock' : 'Sin stock'}
              </span>

              <h1 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
                {product.name}
              </h1>

              <div className="mt-6 border-b border-gray-200 pb-6">
                {product.sale_price > 0 ? (
                  <p className="text-4xl font-black text-gray-900">
                    ${product.sale_price.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                  </p>
                ) : (
                  <p className="text-xl font-semibold text-terza-blue">Precio a consultar</p>
                )}
              </div>

              <p className="mt-6 text-base leading-relaxed text-gray-600 sm:text-lg">
                {product.description}
              </p>

              {product.highlights && product.highlights.length > 0 && (
                <ul className="mt-6 space-y-2">
                  {product.highlights.map(item => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm text-gray-700 sm:text-base"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-terza-blue" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}

              {product.youtubeId && (
                <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-sm">
                  <div className="relative aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${product.youtubeId}?rel=0`}
                      title={`Video de ${product.name}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 h-full w-full"
                    />
                  </div>
                </div>
              )}

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <a
                  href={whatsAppHref(product.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition-colors hover:bg-green-500"
                >
                  <MessageCircle size={20} />
                  Consultar por WhatsApp
                </a>
                <Link
                  href="/#contacto"
                  className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-8 py-4 text-base font-semibold text-gray-800 transition-colors hover:bg-gray-50"
                >
                  Contacto
                </Link>
              </div>
            </div>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  )
}
