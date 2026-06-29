import { type NextRequest, NextResponse } from 'next/server'

const AUTH_COOKIE = 'terza-auth'

export async function updateSession(request: NextRequest) {
  const hasAuth = request.cookies.get(AUTH_COOKIE)?.value === '1'

  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard')
  const isLoginRoute = request.nextUrl.pathname === '/login'

  if (!hasAuth && isDashboardRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (hasAuth && isLoginRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
