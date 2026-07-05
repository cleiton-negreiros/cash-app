import { readFileSync } from 'fs';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'aws-1-us-east-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.ykeexatcexgdhoyprixm',
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

function parseCSV(text) {
  const lines = [];
  let current = [];
  let field = '';
  let inQuotes = false;
  for (const ch of text) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { current.push(field.trim()); field = ''; continue; }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (field.trim() || current.length) current.push(field.trim());
      if (current.some(f => f)) lines.push(current);
      current = []; field = '';
      if (ch === '\r') continue;
      continue;
    }
    field += ch;
  }
  if (field.trim() || current.length) { current.push(field.trim()); lines.push(current); }
  return lines;
}

function parseBRL(v) {
  if (!v || v === '' || v === '-') return 0;
  let s = String(v).replace(/\./g, '').replace(',', '.').replace(/[^0-9.\-]/g, '');
  if (s === '-' || s === '') return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function monthStrToDate(m) {
  const map = { jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06', jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12' };
  const parts = m.toLowerCase().replace('.', '').split('/');
  const year = parts[1]?.length === 4 ? parts[1] : (m.includes('/25') ? '2025' : '2026');
  return `${year}-${map[parts[0].substring(0, 3)] || '01'}-01`;
}

const INVEST_TYPE_MAP = {
  'MercPago': 'reserves',
  'SELICs': 'selic',
  'CDBs': 'cdb',
  'Prefixados': 'pre_fixed',
  'CDB s/l': 'cdb_sl',
  'IPCAs+': 'ipca',
  'Criptos': 'crypto',
  'Dólar': 'dolar',
  'Variável': 'variable',
  'LCIs': 'lci',
  'MetLife': 'pension',
  'Sicoob': 'reserves',
  'FGTS': 'fgts',
  'RESERVAS': 'reserves',
};

async function main() {
  const userId = (await pool.query('SELECT id FROM auth.users LIMIT 1')).rows[0].id;
  console.log('User ID:', userId);

  // Ensure accounts exist
  const { rows: existingAccs } = await pool.query('SELECT id, name FROM public.accounts WHERE user_id = $1', [userId]);
  const accByName = {};
  for (const a of existingAccs) accByName[a.name.toLowerCase()] = a.id;

  const needed = { 'c6': 'C6', '99pay': '99Pay', 'rico': 'Rico', 'mercado pago': 'Mercado Pago', 'sicoob': 'Sicoob', 'outro': 'Outro' };
  for (const [key, name] of Object.entries(needed)) {
    if (!accByName[key]) {
      const r = await pool.query('INSERT INTO public.accounts (user_id, name, color) VALUES ($1, $2, $3) RETURNING id', [userId, name, key === 'c6' ? '#e11d48' : key === '99pay' ? '#22c55e' : '#6b7280']);
      accByName[key] = r.rows[0].id;
      console.log('Created account:', name);
    }
  }

  // Clear existing data for clean reseed
  await pool.query('DELETE FROM public.investment_transactions WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM public.investments WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM public.monthly_snapshots WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM public.loans WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM public.transactions WHERE user_id = $1', [userId]);

  // ============ 1. INVESTMENTS ============
  console.log('\n=== INVESTMENTS ===');
  const investText = readFileSync('1 - INVESTIMENTOS - Nova planilha - GERAL_invest.csv', 'utf-8');
  const investRows = parseCSV(investText);

  for (const row of investRows) {
    const name = row[0]?.trim();
    if (!name || name.startsWith('TOTAL') || name === 'POSIÇÃO ATUAL' || name === 'Sld final') continue;
    const type = INVEST_TYPE_MAP[name];
    if (!type) { console.log('  SKIP:', name); continue; }

    const finalBalance = parseBRL(row[1]);
    const yieldVal = parseBRL(row[2]);
    const invested = parseBRL(row[3]);
    const redeemed = Math.abs(parseBRL(row[4]));
    const ticker = name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const accountId = name === 'MercPago' ? accByName['mercado pago'] : name === 'Sicoob' ? accByName['sicoob'] : accByName['rico'];

    await pool.query(`
      INSERT INTO public.investments (user_id, ticker, name, type, quantity, average_price, current_price, account_id, total_invested, total_redeemed, total_yield)
      VALUES ($1, $2, $3, $4, 1, $5, $5, $6, $7, $8, $9)
    `, [userId, ticker, name, type, finalBalance, accountId, invested, redeemed, yieldVal]);
    console.log(`  ${name}: R$ ${finalBalance}`);
  }

  // ============ 2. LOAN ============
  console.log('\n=== LOAN ===');
  await pool.query(`
    INSERT INTO public.loans (user_id, name, total_amount, remaining_balance, interest_rate, monthly_payment, start_date, notes)
    VALUES ($1, $2, $3, $4, 0, $5, $6, $7)
  `, [userId, 'Economato Shalom', 10923.33, 10923.33, 1171.32, '2025-01-01', 'Empréstimo SH - Economato Shalom']);
  console.log('  Created: Economato Shalom');

  // ============ 3. MONTHLY SNAPSHOTS (from PATRIMÔNIO) ============
  console.log('\n=== MONTHLY SNAPSHOTS ===');
  const patrimText = readFileSync('1 - INVESTIMENTOS - Nova planilha - PATRIMÔNIO.csv', 'utf-8');
  const patrimRows = parseCSV(patrimText);

  // Column layout: 0=month, 1=CONTAS, 2=INVESTIMENTOS, 3=TOTAL, 4=BALANÇO GERAL, 5=(empty),
  // 6=RECEITAS, 7=DESPESAS, 8=BALANÇO, 9=EMPRÉSTIMO SH, 10=Total Resgates,
  // 11=Total Investido, 12=Rendi/o dos invests, 13=Rendi/o c. remuneradas, 14=Total Rendi/os

  for (const row of patrimRows) {
    const month = row[0]?.trim();
    if (!month || !month.includes('/') || month === 'SOMA >>>' || month === 'MÉDIA MENSAL >>>') continue;

    const refMonth = monthStrToDate(month);
    const accountsBalance = parseBRL(row[1]);
    const investmentsBalance = parseBRL(row[2]);
    const totalEquity = parseBRL(row[4]);
    const incomeTotal = parseBRL(row[6]);
    const expenseTotal = Math.abs(parseBRL(row[7]));
    const loanBalance = Math.abs(parseBRL(row[9]));
    const redeemedTotal = Math.abs(parseBRL(row[10]));
    const investedTotal = parseBRL(row[11]);
    const investmentYield = parseBRL(row[12]);
    const ccYield = parseBRL(row[13]);

    await pool.query(`
      INSERT INTO public.monthly_snapshots (user_id, ref_month, accounts_balance, investments_balance, loans_balance, total_equity, income_total, expense_total, loan_payment, invested_total, redeemed_total, investment_yield, cc_yield)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [userId, refMonth, accountsBalance, investmentsBalance, loanBalance, totalEquity, incomeTotal, expenseTotal, loanBalance, investedTotal, redeemedTotal, investmentYield, ccYield]);
    console.log(`  ${month}: equity=${totalEquity} income=${incomeTotal} expenses=${expenseTotal}`);
  }

  // ============ 4. JULY SNAPSHOT (current month starting position) ============
  console.log('\n=== JULY STARTING POSITION ===');
  // Use June ending balance as July starting position
  // accounts_balance = last known from CSV
  await pool.query(`
    INSERT INTO public.monthly_snapshots (user_id, ref_month, accounts_balance, investments_balance, loans_balance, total_equity, income_total, expense_total, loan_payment, invested_total, redeemed_total, investment_yield, cc_yield)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  `, [userId, '2026-07-01', 75.00, 89661.43, 10923.33, -29619.54, 11714.26, 7915.63, 1171.32, 2342.85, 0, 4.56, 0]);
  console.log('  July starting snapshot created');

  // ============ 5. JULY TRANSACTIONS ============
  console.log('\n=== JULY TRANSACTIONS ===');
  const julText = readFileSync('07.26 Julho - JULHO 26.csv', 'utf-8');
  const julRows = parseCSV(julText);
  const txRows = julRows.filter(r => /^\d{1,2}-[a-z]{3}\./i.test(r[0]?.trim()));

  const monthMap = { jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06', jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12' };
  const catMap = {
    'Salário': 'Salário', 'Rendimentos': 'Rendimentos', 'CB': 'Cartão',
    'Investimento': 'Investimentos', 'Empréstimo': 'Outros',
    'Carro': 'Transporte', 'Mercado': 'Alimentação', 'Saúde': 'Saúde',
    'Vestuário': 'Compras', 'Combustível': 'Transporte', 'Estudos': 'Educação',
    'Diversos': 'Outros', 'Shalom': 'Outros', 'Alimentação': 'Alimentação',
    'Telefone': 'Moradia', 'Lazer': 'Lazer', 'Presente': 'Compras',
    'Doações': 'Outros', 'Moradia': 'Moradia', 'Casa': 'Moradia',
    'Fluxo de caixa': 'Outros', 'Outros': 'Outros', 'Resgate': 'Outros',
  };

  let txCount = 0;
  for (const r of txRows) {
    const rawDate = r[0].trim();
    const desc = r[1]?.trim() || '';
    const category = r[3]?.trim() || 'Outros';
    const value = parseBRL(r[4]);
    if (!desc || value === 0) continue;

    const parts = rawDate.toLowerCase().replace('.', '').split('-');
    const date = `2026-${monthMap[parts[1]] || '07'}-${parts[0].padStart(2, '0')}`;
    const type = value >= 0 ? 'income' : 'expense';
    const mappedCat = catMap[category] || 'Outros';

    // Skip internal transfers
    const skip = ['Fluxo de caixa', 'Empréstimo'];
    if (skip.includes(category)) continue;

    const accountId = accByName['c6'];
    try {
      await pool.query(`
        INSERT INTO public.transactions (user_id, account_id, date, description, value, type, category, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed')
      `, [userId, accountId, date, desc, Math.abs(value), type, mappedCat]);
      txCount++;
    } catch (e) { /* skip dupes */ }
  }
  console.log(`  Imported ${txCount} July transactions`);

  console.log('\n=== DONE ===');
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
