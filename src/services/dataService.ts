import { supabase } from '../lib/supabase'
import type { Transaction, TransactionType, AccountType } from '../types'
import { DEFAULT_ACCOUNTS } from '../types'
import { addPending, getPending } from './syncService'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function getStorageKey(userId: string, key: string) {
  return `${key}_${userId}`
}

// ── local cache helpers ──

function cacheTransactions(userId: string, transactions: Transaction[]) {
  localStorage.setItem(getStorageKey(userId, 'transactions'), JSON.stringify(transactions))
}

function getCachedTransactions(userId: string): Transaction[] {
  const raw = localStorage.getItem(getStorageKey(userId, 'transactions'))
  return raw ? JSON.parse(raw) : []
}

function cacheAccounts(userId: string, accounts: any[]) {
  localStorage.setItem(getStorageKey(userId, 'accounts'), JSON.stringify(accounts))
}

function getCachedAccounts(userId: string): any[] {
  const raw = localStorage.getItem(getStorageKey(userId, 'accounts'))
  return raw ? JSON.parse(raw) : DEFAULT_ACCOUNTS
}

// ── apply pending writes on top of server data ──

function applyPending(userId: string, transactions: Transaction[]): Transaction[] {
  const pending = getPending(userId)
  let result = [...transactions]

  for (const p of pending) {
    if (p.table !== 'transactions') continue
    if (p.op === 'create') {
      const exists = result.some((t) => t.id === p.data.id)
      if (!exists) result.unshift(p.data as Transaction)
    } else if (p.op === 'update') {
      const idx = result.findIndex((t) => t.id === p.data.id)
      if (idx !== -1) result[idx] = { ...result[idx], ...p.data }
    } else if (p.op === 'delete') {
      result = result.filter((t) => t.id !== p.data.id)
    }
  }

  return result
}

// ── Transactions ──

export async function getTransactions(userId: string): Promise<Transaction[]> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (error) throw error
    const server = data.map(mapTransaction)
    cacheTransactions(userId, server)
    return applyPending(userId, server)
  } catch {
    return applyPending(userId, getCachedTransactions(userId))
  }
}

export async function saveTransaction(
  userId: string,
  data: Omit<Transaction, 'id'>
): Promise<Transaction> {
  const localId = generateId()
  const localTx: Transaction = { ...data, id: localId }

  const cached = getCachedTransactions(userId)
  cached.unshift(localTx)
  cacheTransactions(userId, cached)

  try {
    const insertData: Record<string, any> = {
      user_id: userId,
      account_id: data.account,
      date: data.date,
      description: data.description,
      value: data.value,
      type: data.type,
      category: data.category,
    }
    if (data.notes) insertData.notes = data.notes
    if (data.dueDate) insertData.due_date = data.dueDate
    if (data.status) insertData.status = data.status
    if (data.installmentCurrent) insertData.installment_current = data.installmentCurrent
    if (data.installmentTotal) insertData.installment_total = data.installmentTotal
    if (data.purchaseDate) insertData.purchase_date = data.purchaseDate
    if (data.parentTransactionId) insertData.parent_transaction_id = data.parentTransactionId

    const { data: inserted, error } = await supabase
      .from('transactions')
      .upsert(insertData, {
        onConflict: 'user_id,account_id,date,description,value,type',
        ignoreDuplicates: true,
      })
      .select()
      .single()

    if (error) throw error

    if (!inserted) {
      const cached = getCachedTransactions(userId).filter((t) => t.id !== localId)
      cacheTransactions(userId, cached)
      return { ...localTx, id: '__duplicate__' } as Transaction
    }

    const serverTx = mapTransaction(inserted)

    const updated = getCachedTransactions(userId).map((t) =>
      t.id === localId ? serverTx : t
    )
    cacheTransactions(userId, updated)

    return serverTx
  } catch {
    addPending(userId, {
      id: localId,
      op: 'create',
      table: 'transactions',
      data: localTx,
      createdAt: Date.now(),
    })
    return localTx
  }
}

export async function updateTransactionData(
  userId: string,
  id: string,
  data: Partial<Omit<Transaction, 'id'>>
): Promise<void> {
  const cached = getCachedTransactions(userId)
  const idx = cached.findIndex((t) => t.id === id)
  if (idx !== -1) {
    cached[idx] = { ...cached[idx], ...data }
    cacheTransactions(userId, cached)
  }

  try {
    const updateData: Record<string, any> = {}
    if (data.account) updateData.account_id = data.account
    if (data.date) updateData.date = data.date
    if (data.description !== undefined) updateData.description = data.description
    if (data.value !== undefined) updateData.value = data.value
    if (data.type) updateData.type = data.type
    if (data.category) updateData.category = data.category
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.dueDate !== undefined) updateData.due_date = data.dueDate
    if (data.status) updateData.status = data.status
    if (data.installmentCurrent !== undefined) updateData.installment_current = data.installmentCurrent
    if (data.installmentTotal !== undefined) updateData.installment_total = data.installmentTotal
    if (data.purchaseDate !== undefined) updateData.purchase_date = data.purchaseDate
    if (data.parentTransactionId !== undefined) updateData.parent_transaction_id = data.parentTransactionId

    const { error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  } catch {
    addPending(userId, {
      id,
      op: 'update',
      table: 'transactions',
      data: { id, ...data },
      createdAt: Date.now(),
    })
  }
}

export async function removeTransaction(
  userId: string,
  id: string
): Promise<void> {
  const cached = getCachedTransactions(userId).filter((t) => t.id !== id)
  cacheTransactions(userId, cached)

  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  } catch {
    addPending(userId, {
      id,
      op: 'delete',
      table: 'transactions',
      data: { id },
      createdAt: Date.now(),
    })
  }
}

// ── Accounts ──

export async function getAccounts(userId: string) {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error

    const userAccounts = data.length > 0
      ? data.map((a: any) => ({
          id: a.id,
          name: a.name,
          balance: Number(a.initial_balance),
          color: a.color,
          accountType: (a.account_type || 'checking') as AccountType,
          creditLimit: a.credit_limit ? Number(a.credit_limit) : undefined,
          closingDay: a.closing_day,
          dueDay: a.due_day,
        }))
      : DEFAULT_ACCOUNTS

    cacheAccounts(userId, userAccounts)
    return { accounts: userAccounts }
  } catch {
    return { accounts: getCachedAccounts(userId) }
  }
}

export async function saveAccount(
  userId: string,
  data: {
    name: string
    color: string
    accountType: AccountType
    creditLimit?: number
    closingDay?: number
    dueDay?: number
  }
) {
  try {
    const insertData: Record<string, any> = {
      user_id: userId,
      name: data.name,
      color: data.color,
      account_type: data.accountType,
    }
    if (data.creditLimit !== undefined) insertData.credit_limit = data.creditLimit
    if (data.closingDay !== undefined) insertData.closing_day = data.closingDay
    if (data.dueDay !== undefined) insertData.due_day = data.dueDay

    const { data: inserted, error } = await supabase
      .from('accounts')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return inserted
  } catch {
    return null
  }
}

export async function updateAccount(
  userId: string,
  id: string,
  data: {
    name?: string
    color?: string
    accountType?: AccountType
    creditLimit?: number
    closingDay?: number
    dueDay?: number
  }
) {
  try {
    const updateData: Record<string, any> = {}
    if (data.name) updateData.name = data.name
    if (data.color) updateData.color = data.color
    if (data.accountType) updateData.account_type = data.accountType
    if (data.creditLimit !== undefined) updateData.credit_limit = data.creditLimit
    if (data.closingDay !== undefined) updateData.closing_day = data.closingDay
    if (data.dueDay !== undefined) updateData.due_day = data.dueDay

    const { error } = await supabase
      .from('accounts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  } catch {
    // silent fail for accounts
  }
}

// ── Helpers ──

function mapTransaction(row: any): Transaction {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    value: Number(row.value),
    type: row.type as TransactionType,
    category: row.category,
    account: row.account_id,
    notes: row.notes || undefined,
    dueDate: row.due_date || undefined,
    status: row.status || undefined,
    installmentCurrent: row.installment_current || undefined,
    installmentTotal: row.installment_total || undefined,
    purchaseDate: row.purchase_date || undefined,
    parentTransactionId: row.parent_transaction_id || undefined,
  }
}

export { getCachedTransactions, cacheTransactions }
