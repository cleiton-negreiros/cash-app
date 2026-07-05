import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const sql = readFileSync('supabase/migrations/00008_telegram_pending_codes.sql', 'utf8')
const envRaw = readFileSync('.env', 'utf8')
const getEnv = (k) => { const m = envRaw.match(new RegExp(k + '=(.+?)(\\r?\\n|$)')); return m ? m[1].replace(/^"(.*)"$/, '$1') : '' }
const supabaseUrl = 'https://ykeexatcexgdhoyprixm.supabase.co'
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
const pgUrl = getEnv('POSTGRES_URL_NON_POOLING')

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

// Try direct SQL via the management API
async function main() {
  // Create the table via raw SQL execution using the pg client directly
  const { default: pg } = await import('pg')
  const pool = new pg.Pool({
    connectionString: pgUrl,
    ssl: { rejectUnauthorized: false }
  })
  try {
    await pool.query(sql)
    console.log('Table created successfully')
  } catch (err) {
    console.error('Error:', err.message)
  }
  await pool.end()
}
main()
