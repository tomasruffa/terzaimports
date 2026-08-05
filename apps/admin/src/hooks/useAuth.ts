import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/utils/apiFetch'
import { AuthUser, clearAuth, getToken } from '@/utils/authStorage'

const AUTH_CHECK_TIMEOUT_MS = 12000

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      const res = await apiFetch('/api/auth/me')
      if (res.ok) {
        const json = await res.json()
        setUser(json.data ?? null)
      } else {
        clearAuth()
        setUser(null)
      }
    } catch {
      clearAuth()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (!loading) return

    const timer = setTimeout(() => {
      clearAuth()
      setUser(null)
      setLoading(false)
      router.replace('/login?expired=1')
    }, AUTH_CHECK_TIMEOUT_MS)

    return () => clearTimeout(timer)
  }, [loading, router])

  const signOut = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore network errors on logout
    }
    clearAuth()
    setUser(null)
    router.push('/login')
  }

  return { user, loading, signOut }
}
