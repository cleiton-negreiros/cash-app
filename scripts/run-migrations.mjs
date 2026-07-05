import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'aws-1-us-east-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.ykeexatcexgdhoyprixm',
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function addUnique(table, column) {
  try {
    await pool.query(`ALTER TABLE public.${table} ADD CONSTRAINT ${table}_${column}_unique UNIQUE (${column})`);
    console.log(`  Constraint added: ${table}(${column})`);
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log(`  Constraint exists: ${table}(${column})`);
    } else {
      throw e;
    }
  }
}

async function applyMigration(file) {
  const sql = readFileSync(join(process.cwd(), 'supabase', 'migrations', file), 'utf-8');
  console.log('Running', file, '...');
  await pool.query('BEGIN');
  try {
    await pool.query(sql);
    await pool.query('INSERT INTO public._migrations (name) VALUES ($1)', [file]);
    await pool.query('COMMIT');
    console.log('  OK');
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }
}

async function main() {
  await pool.query('SELECT 1');
  console.log('Connected');

  await pool.query(`
    create table if not exists public._migrations (
      id serial primary key,
      name text not null unique,
      applied_at timestamptz not null default now()
    )
  `);

  const { rows: applied } = await pool.query('SELECT name FROM public._migrations ORDER BY name');
  const appliedSet = new Set(applied.map(r => r.name));

  // Mark existing migrations
  for (const name of ['00001_initial_schema.sql', '00002_budgets.sql', '00003_telegram_link.sql', '00004_credit_card_payments.sql']) {
    if (!appliedSet.has(name)) {
      await pool.query('INSERT INTO public._migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [name]);
      console.log('Marked:', name);
    }
  }

  // Fix existing tables' composite PKs
  await addUnique('transactions', 'id');
  await addUnique('accounts', 'id');

  // Apply 00005 (creates investments, investment_transactions)
  if (!appliedSet.has('00005_investments.sql')) {
    await applyMigration('00005_investments.sql');
  } else {
    console.log('Skip 00005, already applied');
  }

  // Now fix investments(id) unique
  await addUnique('investments', 'id');

  // Apply 00006 (expand schema, loans, snapshots)
  if (!appliedSet.has('00006_expand_schema.sql')) {
    await applyMigration('00006_expand_schema.sql');
  } else {
    console.log('Skip 00006, already applied');
  }

  // Apply 00007 (final combined migration with IF NOT EXISTS for remaining items)
  if (!appliedSet.has('00007_apply_pending.sql')) {
    await applyMigration('00007_apply_pending.sql');
  } else {
    console.log('Skip 00007, already applied');
  }

  console.log('All done!');
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
