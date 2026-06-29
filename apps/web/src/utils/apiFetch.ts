import { getSupabaseClient } from '@/lib/supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const supabase = getSupabaseClient()
  let token: string | undefined

  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession()
    token = session?.access_token
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}
