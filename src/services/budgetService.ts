import { supabase } from '../lib/supabase'
import type { Budget } from '../types'
import { addPending, removePending, getPending } from './syncService'

interface BudgetRow {
  id: string
  user_id: string
  category: string
  type: string
  limit_amount: number
  month: number
  year: number
}

function mapRow(row: BudgetRow): Budget {
  return {
    id: row.id,
    category: row.category,
    type: row.type as 'expense' | 'investment',
    limitAmount: Number(row.limit_amount),
    spent: 0,
    month: row.month,
    year: row.year,
  }
}

function getKey(userId: string) {
  return `budgets_${userId}`
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function getLocal(userId: string): Budget[] {
  try {
    const raw = localStorage.getItem(getKey(userId))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setLocal(userId: string, data: Budget[]) {
  localStorage.setItem(getKey(userId), JSON.stringify(data))
}

function calculateSpent(userId: string, month: number, year: number, type: string, category: string): number {
  try {
    const raw = localStorage.getItem(`transactions_${userId}`)
    const transactions: any[] = raw ? JSON.parse(raw) : []
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endMonth = month === 12 ? 1 : month + 1
    const endYear = month === 12 ? year + 1 : year
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`

    return transactions
      .filter((t) => t.type === type && t.category === category && t.date >= startDate && t.date < endDate)
      .reduce((acc, t) => acc + Number(t.value), 0)
  } catch {
    return 0
  }
}

function applyPending(userId: string, budgets: Budget[]): Budget[] {
  const pending = getPending(userId)
  let result = [...budgets]

  for (const p of pending) {
    if (p.table !== 'budgets') continue
    if (p.op === 'create') {
      const exists = result.some((b) => b.id === p.data.id)
      if (!exists) result.push(p.data as Budget)
    } else if (p.op === 'update') {
      const idx = result.findIndex((b) => b.id === p.data.id)
      if (idx !== -1) result[idx] = { ...result[idx], ...p.data }
    } else if (p.op === 'delete') {
      result = result.filter((b) => b.id !== p.data.id)
    }
  }

  return result
}

function applySpent(userId: string, budgets: Budget[], month: number, year: number): Budget[] {
  return budgets.map((b) => ({ ...b, spent: calculateSpent(userId, month, year, b.type, b.category) }))
}

export async function getBudgets(userId: string, month: number, year: number) {
  if (userId === 'local') {
    const local = getLocal(userId)
    return applySpent(userId, local, month, year)
  }

  try {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year)

    if (error) throw error

    const budgets = (data as BudgetRow[]).map(mapRow)
    setLocal(userId, budgets)

    const pendingMerged = applyPending(userId, budgets)
    const withSpent = applySpent(userId, pendingMerged, month, year)

    const { data: transactions } = await supabase
      .from('transactions')
      .select('category, value, type')
      .eq('user_id', userId)
      .gte('date', `${year}-${String(month).padStart(2, '0')}-01`)
      .lt('date', `${year + (month === 12 ? 1 : 0)}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-01`)
      .in('type', ['expense', 'investment'])

    if (transactions) {
      const spentByCategory: Record<string, number> = {}
      for (const t of transactions) {
        const key = `${t.type}-${t.category}`
        spentByCategory[key] = (spentByCategory[key] || 0) + Number(t.value)
      }

      const localTransactions = JSON.parse(localStorage.getItem(`transactions_${userId}`) || '[]') as any[]
      for (const lt of localTransactions) {
        const inRange = lt.date >= `${year}-${String(month).padStart(2, '0')}-01` &&
          lt.date < `${year + (month === 12 ? 1 : 0)}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-01`
        if (inRange && (lt.type === 'expense' || lt.type === 'investment')) {
          const key = `${lt.type}-${lt.category}`
          spentByCategory[key] = (spentByCategory[key] || 0) + Number(lt.value)
        }
      }

      for (const budget of withSpent) {
        budget.spent = spentByCategory[`${budget.type}-${budget.category}`] || 0
      }
    }

    return withSpent
  } catch {
    return applySpent(userId, applyPending(userId, getLocal(userId)), month, year)
  }
}

export async function setBudget(
  userId: string,
  data: {
    category: string
    type: 'expense' | 'investment'
    limitAmount: number
    month: number
    year: number
  }
) {
  if (userId === 'local') {
    const local = getLocal(userId)
    const idx = local.findIndex((b) => b.category === data.category && b.month === data.month && b.year === data.year)

    if (idx !== -1) {
      local[idx] = { ...local[idx], limitAmount: data.limitAmount }
    } else {
      local.push({
        id: generateId(),
        category: data.category,
        type: data.type,
        limitAmount: data.limitAmount,
        spent: 0,
        month: data.month,
        year: data.year,
      })
    }

    setLocal(userId, local)
    return
  }

  const local = getLocal(userId)
  const existingIdx = local.findIndex((b) => b.category === data.category && b.month === data.month && b.year === data.year)
  const localId = existingIdx !== -1 ? local[existingIdx].id : generateId()

  const updatedBudget: Budget = {
    id: localId,
    category: data.category,
    type: data.type,
    limitAmount: data.limitAmount,
    spent: 0,
    month: data.month,
    year: data.year,
  }

  if (existingIdx !== -1) {
    local[existingIdx] = { ...local[existingIdx], limitAmount: data.limitAmount }
  } else {
    local.push(updatedBudget)
  }
  setLocal(userId, local)

  try {
    const { data: existing } = await supabase
      .from('budgets')
      .select('id')
      .eq('user_id', userId)
      .eq('category', data.category)
      .eq('month', data.month)
      .eq('year', data.year)
      .single()

    if (existing) {
      const { error } = await supabase
        .from('budgets')
        .update({ limit_amount: data.limitAmount })
        .eq('id', existing.id)
        .eq('user_id', userId)

      if (error) throw error

      const cached = getLocal(userId)
      const ci = cached.findIndex((b) => b.id === localId)
      if (ci !== -1) {
        cached[ci] = { ...cached[ci], id: existing.id }
        setLocal(userId, cached)
      }
    } else {
      const { error } = await supabase
        .from('budgets')
        .insert({
          user_id: userId,
          category: data.category,
          type: data.type,
          limit_amount: data.limitAmount,
          month: data.month,
          year: data.year,
        })

      if (error) throw error
    }

    removePending(userId, localId)
  } catch {
    addPending(userId, {
      id: localId,
      op: existingIdx !== -1 ? 'update' : 'create',
      table: 'budgets',
      data: updatedBudget,
      createdAt: Date.now(),
    })
  }
}

export async function deleteBudget(id: string, userId: string) {
  if (userId === 'local') {
    setLocal(userId, getLocal(userId).filter((b) => b.id !== id))
    return
  }

  setLocal(userId, getLocal(userId).filter((b) => b.id !== id))

  try {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    removePending(userId, id)
  } catch {
    addPending(userId, {
      id,
      op: 'delete',
      table: 'budgets',
      data: { id },
      createdAt: Date.now(),
    })
  }
}
