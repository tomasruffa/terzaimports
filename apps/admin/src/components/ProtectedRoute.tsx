'use client'
import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex h-screen bg-terza-navy items-center justify-center">
        <div className="text-center">
          <div className="inline-block">
            <div className="w-12 h-12 bg-blue-gradient rounded-full flex items-center justify-center mb-4">
              <div className="w-10 h-10 bg-terza-navy rounded-full border-2 border-transparent border-t-terza-blue animate-spin" />
            </div>
          </div>
          <p className="text-terza-gray text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
