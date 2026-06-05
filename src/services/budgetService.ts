import { supabase } from '../lib/supabase'
import type { Budget } from '../types'

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

export async function getBudgets(userId: string, month: number, year: number) {
  if (userId === 'local') {
    const local = getLocal(userId)
    return local
      .filter((b) => b.month === month && b.year === year)
      .map((b) => ({ ...b, spent: calculateSpent(userId, month, year, b.type, b.category) }))
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

      for (const budget of budgets) {
        budget.spent = spentByCategory[`${budget.type}-${budget.category}`] || 0
      }
    }

    return budgets
  } catch {
    return getLocal(userId)
      .filter((b) => b.month === month && b.year === year)
      .map((b) => ({ ...b, spent: calculateSpent(userId, month, year, b.type, b.category) }))
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
  } catch {
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
  }
}

export async function deleteBudget(id: string, userId: string) {
  if (userId === 'local') {
    setLocal(userId, getLocal(userId).filter((b) => b.id !== id))
    return
  }

  try {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  } catch {
    setLocal(userId, getLocal(userId).filter((b) => b.id !== id))
  }
}
