import { clearAuth, getToken } from '@/utils/authStorage'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const REQUEST_TIMEOUT_MS = 15000

function handleUnauthorized() {
  if (typeof window === 'undefined') return
  clearAuth()
  const onLogin = window.location.pathname.startsWith('/login')
  if (!onLogin) {
    window.location.href = '/login?expired=1'
  }
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })

    if (res.status === 401 && !path.startsWith('/api/auth/login')) {
      handleUnauthorized()
    }

    return res
  } finally {
    clearTimeout(timeout)
  }
}
