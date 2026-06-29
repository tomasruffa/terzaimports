'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase'
import { AlertCircle, Loader } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!supabase) {
      setError('Error de configuración')
      setLoading(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message || 'Error al iniciar sesión')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-terza-navy to-terza-navy-light flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-gradient rounded-lg flex items-center justify-center text-white font-black text-lg">T</div>
            <div>
              <div className="text-white font-bold text-base tracking-wider">TERZA</div>
              <div className="text-terza-blue-bright text-xs tracking-widest">IMPORTS</div>
            </div>
          </div>
          <h1 className="text-white text-2xl font-bold">Panel de Control</h1>
          <p className="text-terza-gray text-sm mt-2">Ingresá con tu cuenta para acceder</p>
        </div>

        {/* Form Card */}
        <div className="bg-terza-navy-light border border-terza-gray-dark/30 rounded-xl p-8 shadow-lg shadow-black/50">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                <AlertCircle size={16} className="flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-terza-gray text-sm font-medium mb-2">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@ejemplo.com"
                className="w-full px-4 py-2.5 bg-terza-navy border border-terza-gray-dark/30 rounded-lg text-white placeholder-terza-gray focus:outline-none focus:border-terza-blue transition-colors"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-terza-gray text-sm font-medium mb-2">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-terza-navy border border-terza-gray-dark/30 rounded-lg text-white placeholder-terza-gray focus:outline-none focus:border-terza-blue transition-colors"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-2.5 bg-terza-blue text-white font-semibold rounded-lg hover:bg-terza-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader size={16} className="animate-spin" />}
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-terza-gray-dark/30">
            <p className="text-terza-gray text-sm text-center">
              ¿No tenés cuenta?{' '}
              <Link href="#" className="text-terza-blue-bright hover:text-terza-blue transition-colors font-medium">
                Contactá a administración
              </Link>
            </p>
          </div>
        </div>

        {/* Demo Info */}
        <div className="mt-6 bg-terza-blue/10 border border-terza-blue/30 rounded-lg px-4 py-3 text-terza-blue-bright text-xs">
          <p className="font-medium mb-1">Demo: Credenciales de prueba</p>
          <p className="text-terza-gray text-xs">Usa las credenciales de tu cuenta Supabase para acceder</p>
        </div>
      </div>
    </div>
  )
}
