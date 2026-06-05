import { readFileSync } from 'fs'
import pg from 'pg'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const files = [
  'supabase/migrations/00001_initial_schema.sql',
  'supabase/migrations/00002_budgets.sql',
]

const pool = new pg.Pool({
  connectionString: 'postgres://postgres:0ZnDmyLZgSrZhHiI@db.ykeexatcexgdhoyprixm.supabase.co:5432/postgres?sslmode=require',
})

try {
  for (const file of files) {
    const sql = readFileSync(file, 'utf8')
    await pool.query(sql)
    console.log(`Applied: ${file}`)
  }
  console.log('All migrations applied successfully!')
} catch (err) {
  console.error('Error:', err.message)
} finally {
  await pool.end()
}
