import { supabase } from '../lib/supabase'
import type { Transaction } from '../types'

export async function fetchTransactions(userId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (error) throw error
  return data
}

export async function addTransaction(
  userId: string,
  data: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>
) {
  const { data: inserted, error } = await supabase
    .from('transactions')
    .insert({ ...data, user_id: userId })
    .select()
    .single()

  if (error) throw error
  return inserted
}

export async function updateTransaction(
  id: string,
  userId: string,
  data: Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
) {
  const { error } = await supabase
    .from('transactions')
    .update(data)
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw error
}

export async function deleteTransaction(id: string, userId: string) {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw error
}
