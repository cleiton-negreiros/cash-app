import { supabase } from '../lib/supabase'

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ? `Bearer ${session.access_token}` : ''
}

export async function generateTelegramLinkCode() {
  const authHeader = await getAuthHeader()
  if (!authHeader) throw new Error('Não autenticado')

  const res = await fetch('/api/telegram/generate-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authHeader}`,
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to generate code')
  }

  return res.json() as Promise<{ code: string; expiresAt: string }>
}

export async function unlinkTelegram() {
  const authHeader = await getAuthHeader()
  if (!authHeader) throw new Error('Não autenticado')

  const res = await fetch('/api/telegram/unlink', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authHeader}`,
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to unlink')
  }

  return res.json()
}
