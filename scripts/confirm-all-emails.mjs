import pg from 'pg'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const pool = new pg.Pool({
  connectionString: 'postgres://postgres:0ZnDmyLZgSrZhHiI@db.ykeexatcexgdhoyprixm.supabase.co:5432/postgres?sslmode=require',
})

try {
  const result = await pool.query('UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL RETURNING email')
  console.log(`Confirmed ${result.rowCount} users`)
  for (const row of result.rows) {
    console.log(`  - ${row.email}`)
  }
} catch (err) {
  console.error('Error:', err.message)
} finally {
  await pool.end()
}
