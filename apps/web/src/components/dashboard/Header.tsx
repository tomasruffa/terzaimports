'use client'
import { usePathname } from 'next/navigation'
import { Bell, LogOut, Menu } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/products': 'Productos',
  '/dashboard/stock': 'Movimientos de Stock',
  '/dashboard/reports': 'Reportes',
}

export default function DashboardHeader() {
  const pathname = usePathname()
  const title = titles[pathname] ?? 'Dashboard'
  const { user, signOut } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  const getInitials = (email?: string) => {
    if (!email) return 'A'
    return email.split('@')[0].slice(0, 2).toUpperCase()
  }

  return (
    <header className="bg-terza-navy-light border-b border-terza-gray-dark/30 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-white font-bold text-xl">{title}</h1>
        <p className="text-terza-gray text-xs">Terza Imports — Panel de administración</p>
      </div>
      <div className="flex items-center gap-3 relative">
        <button className="relative p-2 text-terza-gray hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-terza-blue rounded-full" />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 bg-terza-blue/20 rounded-full flex items-center justify-center text-terza-blue-bright font-bold text-sm hover:bg-terza-blue/30 transition-colors"
            title={user?.email || 'Usuario'}
          >
            {getInitials(user?.email)}
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-terza-navy-light border border-terza-gray-dark/30 rounded-lg shadow-lg shadow-black/50 z-50">
              <div className="px-4 py-3 border-b border-terza-gray-dark/30">
                <p className="text-white text-sm font-medium">{user?.email}</p>
                <p className="text-terza-gray text-xs">Admin</p>
              </div>
              <button
                onClick={() => {
                  setShowMenu(false)
                  signOut()
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-red-400 hover:bg-red-500/10 transition-colors text-sm"
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
