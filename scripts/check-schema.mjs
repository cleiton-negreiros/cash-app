import pg from 'pg'
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const c = new pg.Client({
  connectionString: 'postgres://postgres:0ZnDmyLZgSrZhHiI@db.ykeexatcexgdhoyprixm.supabase.co:5432/postgres?sslmode=require',
})
await c.connect()
const r = await c.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'transactions'
  ORDER BY ordinal_position
`)
console.log('TRANSACTIONS:')
for (const row of r.rows) console.log(`  ${row.column_name}: ${row.data_type}`)

const r2 = await c.query(`SELECT id, name FROM accounts ORDER BY name`)
console.log('\nACCOUNTS:')
for (const row of r2.rows) console.log(`  ${row.id} (${row.name})`)

await c.end()
