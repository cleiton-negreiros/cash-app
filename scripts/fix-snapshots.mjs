import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'aws-1-us-east-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.ykeexatcexgdhoyprixm',
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  // Fix loan_payment for each snapshot using PATRIMÔNIO data
  const payments = {
    '2026-06-01': 297, '2026-05-01': 1403, '2026-04-01': 633,
    '2026-03-01': 732, '2026-02-01': 1670, '2026-01-01': 597,
    '2025-12-01': 1075, '2025-11-01': 646, '2025-10-01': 650.53,
    '2025-09-01': 792, '2025-08-01': 982,
  };

  for (const [refMonth, payment] of Object.entries(payments)) {
    await pool.query('UPDATE public.monthly_snapshots SET loan_payment = $1 WHERE ref_month = $2', [payment, refMonth]);
  }
  console.log('Loan payments fixed');

  // Show summary
  const { rows: snapshots } = await pool.query(
    'SELECT ref_month, total_equity, income_total, expense_total, loan_payment FROM public.monthly_snapshots ORDER BY ref_month DESC LIMIT 5'
  );
  console.log('Last 5 snapshots:');
  snapshots.forEach(s => console.log(`  ${String(s.ref_month).substring(0,7)}: equity=${s.total_equity} in=${s.income_total} out=${s.expense_total} loan=${s.loan_payment}`));

  const { rows: counts } = await pool.query(`
    SELECT 'investments' as t, count(*)::int as c FROM public.investments
    UNION ALL SELECT 'loans', count(*) FROM public.loans
    UNION ALL SELECT 'monthly_snapshots', count(*) FROM public.monthly_snapshots
    UNION ALL SELECT 'transactions', count(*) FROM public.transactions
  `);
  console.log('\nCounts:', counts.map(r => `${r.t}=${r.c}`).join(', '));

  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
