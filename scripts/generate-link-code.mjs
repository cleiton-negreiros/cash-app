import pg from 'pg'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const email = process.argv[2]
if (!email) {
  console.error('Uso: node scripts/generate-link-code.mjs SEU_EMAIL')
  process.exit(1)
}

const pool = new pg.Pool({
  connectionString: 'postgres://postgres.ykeexatcexgdhoyprixm:0ZnDmyLZgSrZhHiI@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require',
})

try {
  const { rows: profiles } = await pool.query(
    'SELECT id FROM public.profiles WHERE email = $1',
    [email]
  )

  if (profiles.length === 0) {
    console.error(`Nenhum perfil encontrado para: ${email}`)
    process.exit(1)
  }

  const userId = profiles[0].id
  const code = Math.random().toString(36).slice(2, 8).toUpperCase()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  await pool.query(
    'UPDATE public.profiles SET telegram_link_code = $1, telegram_link_code_expires_at = $2 WHERE id = $3',
    [code, expiresAt, userId]
  )

  console.log(`\n✅ Código gerado para ${email}`)
  console.log(`📋 Código: ${code}`)
  console.log(`⏰ Expira em: ${new Date(expiresAt).toLocaleTimeString('pt-BR')}`)
  console.log(`\nEnvie no Telegram: /link ${code}\n`)
} catch (err) {
  console.error('Erro:', err.message)
} finally {
  await pool.end()
}
