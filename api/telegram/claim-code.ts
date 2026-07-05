import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code, email } = req.body || {}

  if (!code || !email) {
    return res.status(400).json({ error: 'code and email are required' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing env vars' })
  }

  const sb = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

  try {
    const cleanCode = code.trim().toUpperCase()

    const { data: pending } = await sb
      .from('telegram_pending_codes')
      .select('*')
      .eq('code', cleanCode)
      .single()

    if (!pending) {
      return res.status(400).json({ error: 'Código inválido' })
    }

    if (!pending.linked) {
      return res.status(400).json({ error: 'Código ainda não verificado no Telegram. Envie /link ' + cleanCode + ' no bot primeiro.' })
    }

    if (new Date(pending.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Código expirado' })
    }

    const { data: authUser } = await sb.auth.admin.listUsers()
    const foundUser = authUser?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())

    if (!foundUser) {
      return res.status(400).json({ error: 'Usuário não encontrado. Verifique o email.' })
    }

    const { data: profile } = await sb
      .from('profiles')
      .select('id, telegram_id')
      .eq('id', foundUser.id)
      .single()

    if (!profile) {
      return res.status(400).json({ error: 'Perfil não encontrado.' })
    }

    if (profile.telegram_id) {
      return res.status(400).json({ error: 'Esta conta já está vinculada a um Telegram.' })
    }

    const { error } = await sb
      .from('profiles')
      .update({
        telegram_id: pending.telegram_id,
        telegram_username: pending.telegram_username,
      })
      .eq('id', profile.id)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    await sb.from('telegram_pending_codes').delete().eq('code', cleanCode)

    return res.status(200).json({ ok: true, message: 'Conta vinculada com sucesso!' })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
