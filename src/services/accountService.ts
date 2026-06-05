import { supabase } from '../lib/supabase'
import type { Account } from '../types'

export async function fetchAccounts(userId: string) {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return data as Account[]
}

export async function updateAccountBalance(
  accountId: string,
  userId: string,
  initialBalance: number
) {
  const { error } = await supabase
    .from('accounts')
    .update({ initial_balance: initialBalance })
    .eq('id', accountId)
    .eq('user_id', userId)

  if (error) throw error
}
