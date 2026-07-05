import { supabase } from '../lib/supabase'
import { INVESTMENT_TYPE_LABELS } from '../types'
import type { Investment, InvestmentTransaction, InvestmentType } from '../types'

export interface PositionGroup {
  type: InvestmentType
  label: string
  balance: number
  totalInvested: number
  totalRedeemed: number
  totalYield: number
  items: Investment[]
}

export interface PositionSummary {
  groups: PositionGroup[]
  totalBalance: number
  totalInvested: number
  totalRedeemed: number
  totalYield: number
  grandTotal: number
}

export async function fetchInvestments(userId: string): Promise<Investment[]> {
  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', userId)
    .order('type')
    .order('ticker')

  if (error) throw error
  return (data || []).map(mapInvestment)
}

export async function upsertInvestment(
  userId: string,
  data: Omit<Investment, 'id'>
): Promise<Investment | null> {
  const { data: existing } = await supabase
    .from('investments')
    .select('id')
    .eq('user_id', userId)
    .eq('ticker', data.ticker)
    .maybeSingle()

  const payload: Record<string, any> = {
    user_id: userId,
    ticker: data.ticker,
    name: data.name,
    type: data.type,
    quantity: data.quantity,
    average_price: data.averagePrice,
    current_price: data.currentPrice,
    account_id: data.accountId,
    total_invested: data.totalInvested,
    total_redeemed: data.totalRedeemed,
    total_yield: data.totalYield,
  }

  if (existing) {
    const { error } = await supabase
      .from('investments')
      .update(payload)
      .eq('id', existing.id)
      .eq('user_id', userId)
    if (error) throw error
    return { ...data, id: existing.id }
  }

  const { data: inserted, error } = await supabase
    .from('investments')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return mapInvestment(inserted)
}

export async function deleteInvestment(id: string, userId: string) {
  const { error } = await supabase
    .from('investments')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

export async function fetchInvestmentTransactions(
  userId: string,
  ticker?: string
): Promise<InvestmentTransaction[]> {
  let query = supabase
    .from('investment_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (ticker) query = query.eq('ticker', ticker)

  const { data, error } = await query
  if (error) throw error
  return (data || []).map(mapInvestmentTx)
}

export async function addInvestmentTransaction(
  userId: string,
  data: Omit<InvestmentTransaction, 'id'>
): Promise<InvestmentTransaction | null> {
  const { data: inserted, error } = await supabase
    .from('investment_transactions')
    .insert({
      user_id: userId,
      investment_id: data.investmentId || null,
      ticker: data.ticker,
      type: data.type,
      quantity: data.quantity,
      price: data.price,
      total: data.total,
      date: data.date,
      notes: data.notes || '',
    })
    .select()
    .single()

  if (error) throw error
  return mapInvestmentTx(inserted)
}

export function computePositionSummary(investments: Investment[]): PositionSummary {
  const typeOrder: InvestmentType[] = [
    'selic', 'cdb', 'pre_fixed', 'cdb_sl', 'ipca', 'lci',
    'fixed_income', 'treasury', 'stock', 'fii', 'variable',
    'crypto', 'dolar', 'pension', 'reserves', 'fgts', 'other',
  ]

  const groupsMap = new Map<InvestmentType, PositionGroup>()
  for (const inv of investments) {
    let g = groupsMap.get(inv.type)
    if (!g) {
      g = {
        type: inv.type,
        label: '',
        balance: 0,
        totalInvested: 0,
        totalRedeemed: 0,
        totalYield: 0,
        items: [],
      }
      groupsMap.set(inv.type, g)
    }
    g.items.push(inv)
    g.balance += inv.quantity * inv.currentPrice
    g.totalInvested += inv.totalInvested
    g.totalRedeemed += inv.totalRedeemed
    g.totalYield += inv.totalYield
  }

  const groups: PositionGroup[] = []
  for (const t of typeOrder) {
    const g = groupsMap.get(t)
    if (g) {
      g.label = INVESTMENT_TYPE_LABELS[t]
      groups.push(g)
      groupsMap.delete(t)
    }
  }
  for (const [, g] of groupsMap) {
    g.label = INVESTMENT_TYPE_LABELS[g.type] || g.type
    groups.push(g)
  }

  const totalBalance = groups.reduce((s, g) => s + g.balance, 0)
  const totalInvested = groups.reduce((s, g) => s + g.totalInvested, 0)
  const totalRedeemed = groups.reduce((s, g) => s + g.totalRedeemed, 0)
  const totalYield = groups.reduce((s, g) => s + g.totalYield, 0)
  const grandTotal = totalBalance + totalRedeemed + totalYield

  return { groups, totalBalance, totalInvested, totalRedeemed, totalYield, grandTotal }
}

function mapInvestment(row: any): Investment {
  return {
    id: row.id,
    ticker: row.ticker,
    name: row.name || '',
    type: row.type as InvestmentType,
    quantity: Number(row.quantity),
    averagePrice: Number(row.average_price),
    currentPrice: Number(row.current_price),
    accountId: row.account_id,
    totalInvested: Number(row.total_invested || 0),
    totalRedeemed: Number(row.total_redeemed || 0),
    totalYield: Number(row.total_yield || 0),
  }
}

function mapInvestmentTx(row: any): InvestmentTransaction {
  return {
    id: row.id,
    investmentId: row.investment_id || undefined,
    ticker: row.ticker,
    type: row.type,
    quantity: Number(row.quantity),
    price: Number(row.price),
    total: Number(row.total),
    date: row.date,
    notes: row.notes || undefined,
  }
}
