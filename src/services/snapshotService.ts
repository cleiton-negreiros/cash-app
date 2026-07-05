import { supabase } from '../lib/supabase'
import type { MonthlySnapshot } from '../types'

export async function fetchSnapshots(
  userId: string
): Promise<MonthlySnapshot[]> {
  const { data, error } = await supabase
    .from('monthly_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('ref_month', { ascending: false })

  if (error) throw error
  return (data || []).map(mapSnapshot)
}

export async function upsertSnapshot(
  userId: string,
  data: Omit<MonthlySnapshot, 'id'>
): Promise<void> {
  const { error } = await supabase
    .from('monthly_snapshots')
    .upsert({
      user_id: userId,
      ref_month: `${data.refYear}-${String(data.refMonth).padStart(2, '0')}-01`,
      accounts_balance: data.accountsBalance,
      investments_balance: data.investmentsBalance,
      loans_balance: data.loansBalance,
      total_equity: data.totalEquity,
      income_total: data.incomeTotal,
      expense_total: data.expenseTotal,
      loan_payment: data.loanPayment,
      invested_total: data.investedTotal,
      redeemed_total: data.redeemedTotal,
      investment_yield: data.investmentYield,
      cc_yield: data.ccYield,
    }, { onConflict: 'user_id, ref_month' })
    .eq('user_id', userId)

  if (error) throw error
}

export async function deleteSnapshot(
  userId: string,
  refMonth: string,
  refYear: number
): Promise<void> {
  const refDate = `${refYear}-${String(refMonth).padStart(2, '0')}-01`
  const { error } = await supabase
    .from('monthly_snapshots')
    .delete()
    .eq('user_id', userId)
    .eq('ref_month', refDate)
  if (error) throw error
}

function mapSnapshot(row: any): MonthlySnapshot {
  const refMonth = new Date(row.ref_month + 'T12:00:00')
  return {
    id: row.id,
    refMonth: refMonth.getMonth() + 1,
    refYear: refMonth.getFullYear(),
    accountsBalance: Number(row.accounts_balance),
    investmentsBalance: Number(row.investments_balance),
    loansBalance: Number(row.loans_balance),
    totalEquity: Number(row.total_equity),
    incomeTotal: Number(row.income_total),
    expenseTotal: Number(row.expense_total),
    loanPayment: Number(row.loan_payment),
    investedTotal: Number(row.invested_total),
    redeemedTotal: Number(row.redeemed_total),
    investmentYield: Number(row.investment_yield),
    ccYield: Number(row.cc_yield),
  }
}
