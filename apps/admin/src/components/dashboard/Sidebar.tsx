'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ArrowLeftRight, BarChart3, CreditCard, Globe, ChevronRight } from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/products', icon: Package, label: 'Productos' },
  { href: '/dashboard/stock', icon: ArrowLeftRight, label: 'Movimientos' },
  { href: '/dashboard/expenses', icon: CreditCard, label: 'Gastos' },
  { href: '/dashboard/reports', icon: BarChart3, label: 'Reportes' },
]

export default function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-terza-navy-light border-r border-terza-gray-dark/30 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-terza-gray-dark/30">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-gradient rounded-full flex items-center justify-center text-white font-black text-sm">T</div>
          <div>
            <div className="text-white font-bold text-sm tracking-wider">TERZA</div>
            <div className="text-terza-blue-bright text-xs tracking-widest">IMPORTS</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-terza-gray/60 text-xs font-medium uppercase tracking-widest px-3 mb-3">Gestión</p>
        {navItems.map(item => {
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
                ${active
                  ? 'bg-terza-blue text-white shadow-lg shadow-blue-900/30'
                  : 'text-terza-gray hover:text-white hover:bg-terza-navy-medium'
                }`}>
              <item.icon size={18} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight size={14} />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-terza-gray-dark/30">
        <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-terza-gray hover:text-white hover:bg-terza-navy-medium transition-all text-sm">
          <Globe size={18} />
          <span>Ver sitio web</span>
        </Link>
      </div>
    </aside>
  )
}
