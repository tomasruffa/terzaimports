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
    <main className="min-h-screen overflow-x-hidden bg-gray-50">
      <Navbar />

      <article className="pt-20 pb-12 sm:pb-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/#productos"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-terza-blue sm:mb-8"
          >
            <ArrowLeft size={18} />
            Volver al catálogo
          </Link>

          <div className="grid min-w-0 grid-cols-1 gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-16 lg:items-start">
            <div className="min-w-0 w-full">
              <ProductGallery images={images} productName={product.name} />
            </div>

            <div className="flex min-w-0 w-full flex-col lg:sticky lg:top-24">
              <span
                className={`mb-3 inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold sm:mb-4 ${
                  inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {inStock ? 'En stock' : 'Sin stock'}
              </span>

              <h1 className="break-words text-2xl font-black tracking-tight text-gray-900 sm:text-3xl md:text-4xl lg:text-5xl">
                {product.name}
              </h1>

              <div className="mt-4 border-b border-gray-200 pb-4 sm:mt-6 sm:pb-6">
                {product.sale_price > 0 ? (
                  <p className="text-3xl font-black text-gray-900 sm:text-4xl">
                    ${product.sale_price.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                  </p>
                ) : (
                  <p className="text-lg font-semibold text-terza-blue sm:text-xl">
                    Precio a consultar
                  </p>
                )}
              </div>

              <p className="mt-4 text-sm leading-relaxed text-gray-600 sm:mt-6 sm:text-base md:text-lg">
                {product.description}
              </p>

              {product.highlights && product.highlights.length > 0 && (
                <ul className="mt-4 space-y-2 sm:mt-6">
                  {product.highlights.map(item => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm text-gray-700 sm:text-base"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-terza-blue" />
                      <span className="min-w-0 break-words">{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {product.youtubeId && (
                <div className="mt-6 w-full max-w-full overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-sm sm:mt-8">
                  <div className="relative aspect-video w-full">
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

              <div className="mt-8 flex w-full flex-col gap-3 sm:mt-10 sm:flex-row">
                <a
                  href={whatsAppHref(product.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg transition-colors hover:bg-green-500 sm:w-auto sm:px-8 sm:py-4"
                >
                  <MessageCircle size={20} />
                  Consultar por WhatsApp
                </a>
                <Link
                  href="/#contacto"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3.5 text-base font-semibold text-gray-800 transition-colors hover:bg-gray-50 sm:w-auto sm:px-8 sm:py-4"
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
