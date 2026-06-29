const TOKEN_KEY = 'terza-access-token'
const AUTH_COOKIE = 'terza-auth'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7

export interface AuthUser {
  id: string
  email?: string
}

export function setAuth(accessToken: string) {
  sessionStorage.setItem(TOKEN_KEY, accessToken)
  document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
}

export function clearAuth() {
  sessionStorage.removeItem(TOKEN_KEY)
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(TOKEN_KEY)
}

export function hasAuthCookie(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some(c => c.trim().startsWith(`${AUTH_COOKIE}=1`))
}
