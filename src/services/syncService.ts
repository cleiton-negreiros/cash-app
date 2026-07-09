import { supabase } from '../lib/supabase'

export interface PendingWrite {
  id: string
  op: 'create' | 'update' | 'delete'
  table: string
  data: any
  createdAt: number
}

const STORAGE_PREFIX = 'cashapp:pending:'

function getKey(userId: string) {
  return STORAGE_PREFIX + userId
}

export function getPending(userId: string): PendingWrite[] {
  try {
    const raw = localStorage.getItem(getKey(userId))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function savePending(userId: string, items: PendingWrite[]) {
  localStorage.setItem(getKey(userId), JSON.stringify(items))
}

export function addPending(userId: string, item: PendingWrite) {
  const pending = getPending(userId)
  pending.push(item)
  savePending(userId, pending)
}

export function removePending(userId: string, id: string) {
  const pending = getPending(userId).filter((p) => p.id !== id)
  savePending(userId, pending)
}

export function hasPending(userId: string): boolean {
  return getPending(userId).length > 0
}

export function updatePendingId(userId: string, oldId: string, newData: any) {
  const pending = getPending(userId)
  const idx = pending.findIndex((p) => p.id === oldId)
  if (idx !== -1) {
    pending[idx] = { ...pending[idx], data: newData }
    savePending(userId, pending)
  }
}

async function flushPendingCreate(userId: string, p: PendingWrite): Promise<boolean> {
  if (p.table === 'transactions') {
    const insertData: Record<string, any> = {
      user_id: userId,
      account_id: p.data.account,
      date: p.data.date,
      description: p.data.description,
      value: p.data.value,
      type: p.data.type,
      category: p.data.category,
    }
    if (p.data.notes) insertData.notes = p.data.notes
    if (p.data.dueDate) insertData.due_date = p.data.dueDate
    if (p.data.status) insertData.status = p.data.status
    if (p.data.installmentCurrent) insertData.installment_current = p.data.installmentCurrent
    if (p.data.installmentTotal) insertData.installment_total = p.data.installmentTotal
    if (p.data.purchaseDate) insertData.purchase_date = p.data.purchaseDate
    if (p.data.parentTransactionId) insertData.parent_transaction_id = p.data.parentTransactionId

    const { data: inserted, error } = await supabase
      .from('transactions')
      .upsert(insertData, {
        onConflict: 'user_id,account_id,date,description,value,type',
        ignoreDuplicates: true,
      })
      .select()
      .single()

    if (error) return false

    const cached = JSON.parse(localStorage.getItem(`transactions_${userId}`) || '[]')
    if (inserted) {
      const updated = cached.map((t: any) => (t.id === p.id ? { ...t, id: inserted.id } : t))
      localStorage.setItem(`transactions_${userId}`, JSON.stringify(updated))
    } else {
      const updated = cached.filter((t: any) => t.id !== p.id)
      localStorage.setItem(`transactions_${userId}`, JSON.stringify(updated))
    }
    return true
  }

  if (p.table === 'budgets') {
    const { error } = await supabase
      .from('budgets')
      .insert({
        user_id: userId,
        category: p.data.category,
        type: p.data.type,
        limit_amount: p.data.limitAmount,
        month: p.data.month,
        year: p.data.year,
      })

    if (error) return false
    return true
  }

  if (p.table === 'recurring_transactions') {
    const { error } = await supabase
      .from('recurring_transactions')
      .insert({
        user_id: userId,
        account_id: p.data.account,
        description: p.data.description,
        value: p.data.value,
        type: p.data.type,
        category: p.data.category,
        frequency: p.data.frequency,
        day: p.data.day,
        next_date: p.data.nextDate,
        active: p.data.active,
      })

    if (error) return false
    return true
  }

  return false
}

async function flushPendingUpdate(userId: string, p: PendingWrite): Promise<boolean> {
  if (p.table === 'transactions') {
    const updateData: Record<string, any> = {}
    if (p.data.account) updateData.account_id = p.data.account
    if (p.data.date) updateData.date = p.data.date
    if (p.data.description !== undefined) updateData.description = p.data.description
    if (p.data.value !== undefined) updateData.value = p.data.value
    if (p.data.type) updateData.type = p.data.type
    if (p.data.category) updateData.category = p.data.category
    if (p.data.notes !== undefined) updateData.notes = p.data.notes
    if (p.data.dueDate !== undefined) updateData.due_date = p.data.dueDate
    if (p.data.status) updateData.status = p.data.status
    if (p.data.installmentCurrent !== undefined) updateData.installment_current = p.data.installmentCurrent
    if (p.data.installmentTotal !== undefined) updateData.installment_total = p.data.installmentTotal
    if (p.data.purchaseDate !== undefined) updateData.purchase_date = p.data.purchaseDate
    if (p.data.parentTransactionId !== undefined) updateData.parent_transaction_id = p.data.parentTransactionId

    const { error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', p.id)
      .eq('user_id', userId)

    return !error
  }

  if (p.table === 'budgets') {
    const { error } = await supabase
      .from('budgets')
      .update({ limit_amount: p.data.limitAmount })
      .eq('id', p.id)
      .eq('user_id', userId)

    return !error
  }

  if (p.table === 'recurring_transactions') {
    const updateData: Record<string, any> = {}
    if (p.data.account) updateData.account_id = p.data.account
    if (p.data.description) updateData.description = p.data.description
    if (p.data.value) updateData.value = p.data.value
    if (p.data.type) updateData.type = p.data.type
    if (p.data.category) updateData.category = p.data.category
    if (p.data.frequency) updateData.frequency = p.data.frequency
    if (p.data.day) updateData.day = p.data.day
    if (p.data.nextDate) updateData.next_date = p.data.nextDate
    if (p.data.active !== undefined) updateData.active = p.data.active

    const { error } = await supabase
      .from('recurring_transactions')
      .update(updateData)
      .eq('id', p.id)
      .eq('user_id', userId)

    return !error
  }

  return false
}

async function flushPendingDelete(userId: string, p: PendingWrite): Promise<boolean> {
  const { error } = await supabase
    .from(p.table)
    .delete()
    .eq('id', p.data.id)
    .eq('user_id', userId)

  return !error
}

export async function syncPendingChanges(userId: string): Promise<{ synced: number; failed: number }> {
  if (userId === 'local') return { synced: 0, failed: 0 }

  const pending = getPending(userId)
  if (pending.length === 0) return { synced: 0, failed: 0 }

  let synced = 0
  let failed = 0

  for (const p of pending) {
    let success = false

    if (p.op === 'create') {
      success = await flushPendingCreate(userId, p)
    } else if (p.op === 'update') {
      success = await flushPendingUpdate(userId, p)
    } else if (p.op === 'delete') {
      success = await flushPendingDelete(userId, p)
    }

    if (success) {
      removePending(userId, p.id)
      synced++
    } else {
      failed++
    }
  }

  return { synced, failed }
}
