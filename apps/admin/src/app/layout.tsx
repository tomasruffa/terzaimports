import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Terza Imports | Panel de administración',
  description: 'Panel de control interno de Terza Imports',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
