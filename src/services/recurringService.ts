import { supabase } from '../lib/supabase'
import type { RecurringTransaction, RecurringFrequency, TransactionType } from '../types'
import { saveTransaction } from './dataService'
import { addPending, getPending } from './syncService'

interface RecurringRow {
  id: string
  user_id: string
  account_id: string
  description: string
  value: number
  type: string
  category: string
  frequency: string
  day: number
  next_date: string
  active: boolean
}

function mapRow(row: RecurringRow): RecurringTransaction {
  return {
    id: row.id,
    description: row.description,
    value: Number(row.value),
    type: row.type as TransactionType,
    category: row.category,
    account: row.account_id,
    frequency: row.frequency as RecurringFrequency,
    day: row.day,
    nextDate: row.next_date,
    active: row.active,
  }
}

function getKey(userId: string) {
  return `recurring_${userId}`
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function getLocal(userId: string): RecurringTransaction[] {
  try {
    const raw = localStorage.getItem(getKey(userId))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setLocal(userId: string, data: RecurringTransaction[]) {
  localStorage.setItem(getKey(userId), JSON.stringify(data))
}

function applyPending(userId: string, items: RecurringTransaction[]): RecurringTransaction[] {
  const pending = getPending(userId)
  let result = [...items]

  for (const p of pending) {
    if (p.table !== 'recurring_transactions') continue
    if (p.op === 'create') {
      const exists = result.some((r) => r.id === p.data.id)
      if (!exists) result.unshift(p.data as RecurringTransaction)
    } else if (p.op === 'update') {
      const idx = result.findIndex((r) => r.id === p.data.id)
      if (idx !== -1) result[idx] = { ...result[idx], ...p.data }
    } else if (p.op === 'delete') {
      result = result.filter((r) => r.id !== p.data.id)
    }
  }

  return result
}

export async function getRecurringTransactions(userId: string) {
  if (userId === 'local') {
    return getLocal(userId)
  }

  try {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('next_date', { ascending: true })

    if (error) throw error

    const items = (data as RecurringRow[]).map(mapRow)
    setLocal(userId, items)
    return applyPending(userId, items)
  } catch {
    return applyPending(userId, getLocal(userId))
  }
}

export async function addRecurringTransaction(
  userId: string,
  data: Omit<RecurringTransaction, 'id'>
) {
  const localId = generateId()
  const localItem: RecurringTransaction = { ...data, id: localId }

  if (userId === 'local') {
    const local = getLocal(userId)
    setLocal(userId, [localItem, ...local])
    return localItem
  }

  const local = getLocal(userId)
  setLocal(userId, [localItem, ...local])

  try {
    const { data: inserted, error } = await supabase
      .from('recurring_transactions')
      .insert({
        user_id: userId,
        account_id: data.account,
        description: data.description,
        value: data.value,
        type: data.type,
        category: data.category,
        frequency: data.frequency,
        day: data.day,
        next_date: data.nextDate,
        active: data.active,
      })
      .select()
      .single()

    if (error) throw error

    const serverItem = mapRow(inserted as RecurringRow)
    const cached = getLocal(userId).map((r) => (r.id === localId ? serverItem : r))
    setLocal(userId, cached)

    return serverItem
  } catch {
    addPending(userId, {
      id: localId,
      op: 'create',
      table: 'recurring_transactions',
      data: localItem,
      createdAt: Date.now(),
    })
    return localItem
  }
}

export async function updateRecurringTransaction(
  id: string,
  userId: string,
  data: Partial<Omit<RecurringTransaction, 'id'>>
) {
  if (userId === 'local') {
    const local = getLocal(userId)
    const idx = local.findIndex((r) => r.id === id)
    if (idx !== -1) {
      local[idx] = { ...local[idx], ...data }
      setLocal(userId, local)
    }
    return
  }

  const local = getLocal(userId)
  const idx = local.findIndex((r) => r.id === id)
  if (idx !== -1) {
    local[idx] = { ...local[idx], ...data }
    setLocal(userId, local)
  }

  try {
    const updateData: Record<string, any> = {}
    if (data.account) updateData.account_id = data.account
    if (data.description) updateData.description = data.description
    if (data.value) updateData.value = data.value
    if (data.type) updateData.type = data.type
    if (data.category) updateData.category = data.category
    if (data.frequency) updateData.frequency = data.frequency
    if (data.day) updateData.day = data.day
    if (data.nextDate) updateData.next_date = data.nextDate
    if (data.active !== undefined) updateData.active = data.active

    const { error } = await supabase
      .from('recurring_transactions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  } catch {
    addPending(userId, {
      id,
      op: 'update',
      table: 'recurring_transactions',
      data: { id, ...data },
      createdAt: Date.now(),
    })
  }
}

export async function deleteRecurringTransaction(id: string, userId: string) {
  if (userId === 'local') {
    setLocal(userId, getLocal(userId).filter((r) => r.id !== id))
    return
  }

  setLocal(userId, getLocal(userId).filter((r) => r.id !== id))

  try {
    const { error } = await supabase
      .from('recurring_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  } catch {
    addPending(userId, {
      id,
      op: 'delete',
      table: 'recurring_transactions',
      data: { id },
      createdAt: Date.now(),
    })
  }
}

function getNextDate(frequency: RecurringFrequency, day: number, fromDate: Date): Date {
  const next = new Date(fromDate)

  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'biweekly':
      next.setDate(next.getDate() + 14)
      break
    case 'monthly': {
      const month = next.getMonth() + 1
      next.setMonth(month > 11 ? 0 : month)
      if (next.getFullYear() !== fromDate.getFullYear() && month > 11) {
        next.setFullYear(fromDate.getFullYear() + 1)
      }
      const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
      next.setDate(Math.min(day, maxDay))
      break
    }
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1)
      break
  }

  return next
}

export async function processRecurringTransactions(userId: string) {
  if (userId === 'local') {
    return processLocal(userId)
  }

  try {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .lte('next_date', new Date().toISOString().split('T')[0])

    if (error) throw error
    return processRows(userId, data as RecurringRow[] || [])
  } catch {
    return processLocal(userId)
  }
}

function processLocal(userId: string): string[] {
  const local = getLocal(userId)
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const generated: string[] = []

  const filtered = local.filter((r) => r.active && r.nextDate <= todayStr)

  for (const recurring of filtered) {
    const nextDate = new Date(recurring.nextDate + 'T12:00:00')
    const existingTransactions = JSON.parse(localStorage.getItem(`transactions_${userId}`) || '[]') as any[]

    while (nextDate <= today) {
      const dateStr = nextDate.toISOString().split('T')[0]

      existingTransactions.unshift({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        date: dateStr,
        description: `[Recorrente] ${recurring.description}`,
        value: recurring.value,
        type: recurring.type,
        category: recurring.category,
        account: recurring.account,
      })

      const newNext = getNextDate(recurring.frequency, recurring.day, nextDate)
      nextDate.setTime(newNext.getTime())

      if (nextDate > today) {
        const idx = local.findIndex((r) => r.id === recurring.id)
        if (idx !== -1) {
          local[idx] = { ...local[idx], nextDate: nextDate.toISOString().split('T')[0] }
        }
      }
    }

    generated.push(recurring.description)
    localStorage.setItem(`transactions_${userId}`, JSON.stringify(existingTransactions))
  }

  setLocal(userId, local)
  return generated
}

async function processRows(userId: string, rows: RecurringRow[]): Promise<string[]> {
  const generated: string[] = []

  for (const recurring of rows) {
    const nextDate = new Date(recurring.next_date + 'T12:00:00')
    const today = new Date()

    while (nextDate <= today) {
      const dateStr = nextDate.toISOString().split('T')[0]

      await saveTransaction(userId, {
        date: dateStr,
        description: `[Recorrente] ${recurring.description}`,
        value: Number(recurring.value),
        type: recurring.type as TransactionType,
        category: recurring.category,
        account: recurring.account_id,
      })

      const newNextDate = getNextDate(
        recurring.frequency as RecurringFrequency,
        recurring.day,
        nextDate
      )

      nextDate.setTime(newNextDate.getTime())

      if (nextDate > today) {
        const nextStr = nextDate.toISOString().split('T')[0]
        await supabase
          .from('recurring_transactions')
          .update({ next_date: nextStr })
          .eq('id', recurring.id)
          .eq('user_id', userId)
      }
    }

    generated.push(recurring.description)
  }

  return generated
}
