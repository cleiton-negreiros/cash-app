import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'aws-1-us-east-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.ykeexatcexgdhoyprixm',
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const { rows } = await pool.query(`
    select table_name, column_name, data_type, is_nullable
    from information_schema.columns
    where table_schema = 'public'
    order by table_name, ordinal_position
  `);
  const byTable = {};
  for (const r of rows) {
    if (!byTable[r.table_name]) byTable[r.table_name] = [];
    byTable[r.table_name].push(`${r.column_name} ${r.data_type} ${r.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
  }
  for (const [t, cols] of Object.entries(byTable)) {
    console.log(`\n${t}:`);
    cols.forEach(c => console.log(`  ${c}`));
  }
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
