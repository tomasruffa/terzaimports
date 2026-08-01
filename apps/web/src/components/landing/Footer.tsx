import { Globe } from 'lucide-react'
import { TerzaLogo } from '@/components/brand/TerzaLogo'

export default function Footer() {
  return (
    <footer className="bg-terza-navy-light border-t border-terza-gray-dark/30 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-3 gap-8 mb-10">
          <div>
            <div className="mb-4">
              <TerzaLogo
                href="/"
                textClassName="text-white font-bold text-lg tracking-wider"
              />
            </div>
            <p className="text-terza-gray text-sm leading-relaxed">
              Tu marketplace de importaciones. Calidad global, precio justo.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Navegación</h4>
            <ul className="space-y-2">
              {[
                { label: 'Inicio', href: '/#hero' },
                { label: 'Nosotros', href: '/#nosotros' },
                { label: 'Productos', href: '/#productos' },
                { label: 'Servicios', href: '/#servicios' },
                { label: 'Contacto', href: '/#contacto' },
              ].map(item => (
                <li key={item.label}>
                  <a href={item.href}
                    className="text-terza-gray hover:text-terza-blue-bright text-sm transition-colors">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Contacto</h4>
            <ul className="space-y-2 text-terza-gray text-sm">
              <li>+54 9 11 7075-1477</li>
              <li>Buenos Aires, Argentina</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-terza-gray-dark/30 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-terza-gray text-sm">
            © {new Date().getFullYear()} Terza Imports. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-2 text-terza-gray text-xs">
            <Globe size={12} />
            <span>Buenos Aires, Argentina</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
