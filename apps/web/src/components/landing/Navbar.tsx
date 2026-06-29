'use client'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

const links = [
  { label: 'Inicio', href: '#hero' },
  { label: 'Nosotros', href: '#nosotros' },
  { label: 'Productos', href: '#productos' },
  { label: 'Servicios', href: '#servicios' },
  { label: 'Contacto', href: '#contacto' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-terza-navy/95 backdrop-blur-md border-b border-terza-gray-dark/30 shadow-lg' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="#hero" className="flex items-center gap-3 group">
            <div className="w-8 h-8 bg-blue-gradient rounded-full flex items-center justify-center text-white font-black text-sm">T</div>
            <span className="text-white font-bold text-xl tracking-wider">
              TERZA <span className="text-terza-blue-bright font-light text-sm tracking-widest">IMPORTS</span>
            </span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {links.map(l => (
              <a key={l.href} href={l.href}
                className="text-terza-gray hover:text-terza-blue-bright text-sm font-medium transition-colors duration-200">
                {l.label}
              </a>
            ))}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden text-white p-2" onClick={() => setOpen(!open)}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-terza-navy-light border-t border-terza-gray-dark/30">
          <div className="px-4 py-4 flex flex-col gap-4">
            {links.map(l => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}
                className="text-terza-gray hover:text-terza-blue-bright font-medium transition-colors">
                {l.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
