import type { Metadata } from 'next'
import { Suspense } from 'react'
import FirebaseAnalytics from '@/components/analytics/FirebaseAnalytics'
import './globals.css'

export const metadata: Metadata = {
  title: 'Terza Imports | Importaciones de calidad',
  description: 'Importadora y distribuidora de productos tecnológicos y accesorios. Calidad garantizada, precios competitivos.',
  keywords: 'importadora, tecnología, accesorios, wholesale, distribuidora, Argentina',
  icons: {
    icon: [
      { url: '/icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo/terza-icon-square.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'Terza Imports',
    description: 'Importadora y distribuidora de productos de calidad',
    type: 'website',
    images: [{ url: '/logo/terza-icon.png' }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="overflow-x-hidden">
        <Suspense fallback={null}>
          <FirebaseAnalytics />
        </Suspense>
        {children}
      </body>
    </html>
  )
}
