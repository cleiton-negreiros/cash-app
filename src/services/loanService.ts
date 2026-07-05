import { supabase } from '../lib/supabase'
import type { Loan } from '../types'

export async function fetchLoans(userId: string): Promise<Loan[]> {
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .eq('user_id', userId)
    .order('name')
  if (error) throw error
  return (data || []).map(mapLoan)
}

export async function addLoan(
  userId: string,
  data: Omit<Loan, 'id'>
): Promise<Loan | null> {
  const { data: inserted, error } = await supabase
    .from('loans')
    .insert({
      user_id: userId,
      name: data.name,
      total_amount: data.totalAmount,
      remaining_balance: data.remainingBalance,
      interest_rate: data.interestRate,
      monthly_payment: data.monthlyPayment,
      start_date: data.startDate,
      end_date: data.endDate || null,
      notes: data.notes || '',
    })
    .select()
    .single()
  if (error) throw error
  return mapLoan(inserted)
}

export async function updateLoan(
  userId: string,
  id: string,
  data: Partial<Omit<Loan, 'id'>>
): Promise<void> {
  const payload: Record<string, any> = {}
  if (data.name !== undefined) payload.name = data.name
  if (data.totalAmount !== undefined) payload.total_amount = data.totalAmount
  if (data.remainingBalance !== undefined) payload.remaining_balance = data.remainingBalance
  if (data.interestRate !== undefined) payload.interest_rate = data.interestRate
  if (data.monthlyPayment !== undefined) payload.monthly_payment = data.monthlyPayment
  if (data.startDate !== undefined) payload.start_date = data.startDate
  if (data.endDate !== undefined) payload.end_date = data.endDate
  if (data.notes !== undefined) payload.notes = data.notes
  const { error } = await supabase
    .from('loans')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

export async function deleteLoan(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('loans')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

export function computeLoanSummary(loans: Loan[]) {
  return {
    totalDebt: loans.reduce((s, l) => s + l.remainingBalance, 0),
    monthlyPayments: loans.reduce((s, l) => s + l.monthlyPayment, 0),
    totalLoaned: loans.reduce((s, l) => s + l.totalAmount, 0),
  }
}

function mapLoan(row: any): Loan {
  return {
    id: row.id,
    name: row.name,
    totalAmount: Number(row.total_amount),
    remainingBalance: Number(row.remaining_balance),
    interestRate: Number(row.interest_rate),
    monthlyPayment: Number(row.monthly_payment),
    startDate: row.start_date,
    endDate: row.end_date || undefined,
    notes: row.notes || undefined,
  }
}
