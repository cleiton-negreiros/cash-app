import type { TransactionType } from '../types'
import { CATEGORIES, DEFAULT_ACCOUNTS } from '../types'

export interface ParsedInput {
  description: string
  value: number | null
  type: TransactionType
  category: string | null
  accountId: string | null
}

const TYPE_KEYWORDS: Record<string, TransactionType> = {
  despesa: 'expense',
  despesas: 'expense',
  gasto: 'expense',
  gastos: 'expense',
  pago: 'expense',
  saida: 'expense',
  receita: 'income',
  receitas: 'income',
  ganho: 'income',
  ganhos: 'income',
  entrada: 'income',
  salario: 'income',
  investimento: 'investment',
  investimentos: 'investment',
  aplicacao: 'investment',
  aplicacoes: 'investment',
}

function normalize(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function findBestMatch(token: string, items: string[]): string | null {
  const nt = normalize(token)
  for (const item of items) {
    if (normalize(item) === nt) return item
  }
  for (const item of items) {
    if (normalize(item).startsWith(nt)) return item
  }
  for (const item of items) {
    if (nt.startsWith(normalize(item))) return item
  }
  for (const item of items) {
    if (normalize(item).includes(nt)) return item
  }
  return null
}

export function parseSmartInput(input: string): ParsedInput {
  const tokens = input.trim().split(/\s+/)

  if (tokens.length === 0) {
    return { description: '', value: null, type: 'expense', category: null, accountId: null }
  }

  let value: number | null = null
  let type: TransactionType = 'expense'
  let category: string | null = null
  let accountId: string | null = null
  const descTokens: string[] = []
  const remaining: string[] = [...tokens]

  for (const raw of remaining) {
    const num = parseFloat(raw.replace(',', '.'))
    if (!isNaN(num) && num > 0 && value === null) {
      value = num
      continue
    }

    const tl = raw.toLowerCase()
    if (TYPE_KEYWORDS[tl]) {
      type = TYPE_KEYWORDS[tl]
      continue
    }

    const allCategories = Object.values(CATEGORIES).flat()
    const matchedCat = findBestMatch(raw, allCategories)
    if (matchedCat) {
      category = matchedCat
      continue
    }

    const accountItems = DEFAULT_ACCOUNTS.map(a => ({ id: a.id, name: a.name }))
    const matchedAcc = findBestMatch(raw, accountItems.map(a => a.name))
    if (matchedAcc) {
      accountId = accountItems.find(a => a.name === matchedAcc)!.id
      continue
    }

    descTokens.push(raw)
  }

  if (!value) {
    for (const t of descTokens) {
      const num = parseFloat(t.replace(',', '.'))
      if (!isNaN(num) && num > 0) {
        value = num
        descTokens.splice(descTokens.indexOf(t), 1)
        break
      }
    }
  }

  if (!category && descTokens.length > 0) {
    const typeCategories = CATEGORIES[type]
    for (const t of descTokens) {
      const matched = findBestMatch(t, typeCategories)
      if (matched) {
        const idx = descTokens.indexOf(t)
        descTokens.splice(idx, 1)
        category = matched
        break
      }
    }
  }

  if (!accountId) {
    const accountItems = DEFAULT_ACCOUNTS.map(a => ({ id: a.id, name: a.name }))
    for (const t of descTokens) {
      const matched = findBestMatch(t, accountItems.map(a => a.name))
      if (matched) {
        accountId = accountItems.find(a => a.name === matched)!.id
        const idx = descTokens.indexOf(t)
        descTokens.splice(idx, 1)
        break
      }
    }
  }

  const desc = descTokens.join(' ').trim()

  return {
    description: desc,
    value,
    type,
    category,
    accountId,
  }
}
