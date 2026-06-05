import { supabase } from '../lib/supabase'
import type { Transaction, TransactionType } from '../types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function getStorageKey(userId: string, key: string) {
  return `${key}_${userId}`
}

// Transactions
export async function getTransactions(userId: string): Promise<Transaction[]> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (error) throw error
    return data.map(mapTransaction)
  } catch {
    return getLocalTransactions(userId)
  }
}

export async function saveTransaction(
  userId: string,
  data: Omit<Transaction, 'id'>
): Promise<Transaction> {
  try {
    const { data: inserted, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        account_id: data.account,
        date: data.date,
        description: data.description,
        value: data.value,
        type: data.type,
        category: data.category,
      })
      .select()
      .single()

    if (error) throw error
    return mapTransaction(inserted)
  } catch {
    return saveLocalTransaction(userId, data)
  }
}

export async function updateTransactionData(
  userId: string,
  id: string,
  data: Partial<Omit<Transaction, 'id'>>
): Promise<void> {
  try {
    const updateData: Record<string, any> = {}
    if (data.account) updateData.account_id = data.account
    if (data.date) updateData.date = data.date
    if (data.description) updateData.description = data.description
    if (data.value) updateData.value = data.value
    if (data.type) updateData.type = data.type
    if (data.category) updateData.category = data.category

    const { error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  } catch {
    updateLocalTransaction(userId, id, data)
  }
}

export async function removeTransaction(
  userId: string,
  id: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  } catch {
    deleteLocalTransaction(userId, id)
  }
}

// Accounts
export async function getAccounts(userId: string) {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error
    return {
      accounts: data.map((a: any) => ({
        id: a.id,
        name: a.name,
        balance: Number(a.initial_balance),
        color: a.color,
      })),
    }
  } catch {
    return getLocalAccounts(userId)
  }
}

// Map Supabase row to Transaction type
function mapTransaction(row: any): Transaction {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    value: Number(row.value),
    type: row.type as TransactionType,
    category: row.category,
    account: row.account_id,
  }
}

// === LocalStorage fallbacks ===

function getLocalTransactions(userId: string): Transaction[] {
  const raw = localStorage.getItem(getStorageKey(userId, 'transactions'))
  return raw ? JSON.parse(raw) : []
}

function saveLocalTransaction(userId: string, data: Omit<Transaction, 'id'>): Transaction {
  const transactions = getLocalTransactions(userId)
  const transaction: Transaction = { ...data, id: generateId() }
  transactions.unshift(transaction)
  localStorage.setItem(getStorageKey(userId, 'transactions'), JSON.stringify(transactions))
  return transaction
}

function updateLocalTransaction(userId: string, id: string, data: Partial<Omit<Transaction, 'id'>>) {
  const transactions = getLocalTransactions(userId)
  const idx = transactions.findIndex((t) => t.id === id)
  if (idx !== -1) {
    transactions[idx] = { ...transactions[idx], ...data }
    localStorage.setItem(getStorageKey(userId, 'transactions'), JSON.stringify(transactions))
  }
}

function deleteLocalTransaction(userId: string, id: string) {
  const transactions = getLocalTransactions(userId)
  localStorage.setItem(
    getStorageKey(userId, 'transactions'),
    JSON.stringify(transactions.filter((t) => t.id !== id))
  )
}

function getLocalAccounts(userId: string) {
  const raw = localStorage.getItem(getStorageKey(userId, 'accounts'))
  const accounts = raw ? JSON.parse(raw) : []
  return { accounts }
}
