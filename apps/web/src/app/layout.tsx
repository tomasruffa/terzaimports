import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Terza Imports | Importaciones de calidad',
  description: 'Importadora y distribuidora de productos tecnológicos y accesorios. Calidad garantizada, precios competitivos.',
  keywords: 'importadora, tecnología, accesorios, wholesale, distribuidora, Argentina',
  openGraph: {
    title: 'Terza Imports',
    description: 'Importadora y distribuidora de productos de calidad',
    type: 'website',
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
