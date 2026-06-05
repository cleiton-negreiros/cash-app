import { readFileSync } from 'fs'
import pg from 'pg'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const sql = readFileSync('supabase/migrations/00003_telegram_link.sql', 'utf8')

const pool = new pg.Pool({
  connectionString: 'postgres://postgres:0ZnDmyLZgSrZhHiI@db.ykeexatcexgdhoyprixm.supabase.co:5432/postgres?sslmode=require',
})

try {
  await pool.query(sql)
  console.log('Telegram migration applied successfully!')
} catch (err) {
  console.error('Error:', err.message)
} finally {
  await pool.end()
}
