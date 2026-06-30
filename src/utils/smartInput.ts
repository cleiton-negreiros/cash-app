import type { TransactionType } from '../types'
import { CATEGORIES, DEFAULT_ACCOUNTS } from '../types'

export interface ParsedInput {
  description: string
  value: number | null
  type: TransactionType
  category: string | null
  accountId: string | null
  date: string | null
}

const TYPE_KEYWORDS: Record<string, TransactionType> = {
  despesa: 'expense', despesas: 'expense', gasto: 'expense', gastos: 'expense',
  pago: 'expense', saida: 'expense', despesinha: 'expense',
  receita: 'income', receitas: 'income', ganho: 'income', ganhos: 'income',
  entrada: 'income', salario: 'income', salário: 'income',
  investimento: 'investment', investimentos: 'investment', aplicacao: 'investment', aplicação: 'investment',
  invest: 'investment', aporte: 'investment',
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
  for (const item of items) {
    const normalizedItem = normalize(item)
    for (const char of nt) {
      if (!normalizedItem.includes(char)) {
        return null
      }
    }
    return item
  }
  return null
}

function tryParseDate(token: string): string | null {
  const patterns = [
    /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/,
    /^(\d{1,2})-(\d{1,2})(?:-(\d{2,4}))?$/,
    /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/,
  ]
  for (const pattern of patterns) {
    const m = token.match(pattern)
    if (m) {
      let day = parseInt(m[1]), month = parseInt(m[2]), year = m[3] ? parseInt(m[3]) : new Date().getFullYear()
      if (year < 100) year += 2000
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
    }
  }
  if (/^hoje$/i.test(token)) return new Date().toISOString().split('T')[0]
  if (/^ontem$/i.test(token)) {
    const d = new Date(); d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  }
  if (/^amanha$/i.test(token) || /^amanh[aã]$/i.test(token)) {
    const d = new Date(); d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }
  return null
}

export function parseSmartInput(input: string): ParsedInput {
  const tokens = input.trim().split(/\s+/)

  if (tokens.length === 0) {
    return { description: '', value: null, type: 'expense', category: null, accountId: null, date: null }
  }

  let value: number | null = null
  let type: TransactionType = 'expense'
  let category: string | null = null
  let accountId: string | null = null
  let date: string | null = null
  const descTokens: string[] = []
  const remaining: string[] = [...tokens]

  for (const raw of remaining) {
    const num = parseFloat(raw.replace(',', '.'))
    if (!isNaN(num) && num > 0 && value === null && !raw.includes('/') && !raw.includes('-')) {
      value = num
      continue
    }

    const tl = raw.toLowerCase()
    if (TYPE_KEYWORDS[tl]) {
      type = TYPE_KEYWORDS[tl]
      continue
    }

    const parsedDate = tryParseDate(raw)
    if (parsedDate && date === null) {
      date = parsedDate
      continue
    }

    if (!category) {
      const allCategories = Object.values(CATEGORIES).flat()
      const matchedCat = findBestMatch(raw, allCategories)
      if (matchedCat) {
        category = matchedCat
        continue
      }
    }

    if (!accountId) {
      const accountItems = DEFAULT_ACCOUNTS.map(a => ({ id: a.id, name: a.name }))
      const matchedAcc = findBestMatch(raw, accountItems.map(a => a.name))
      if (matchedAcc) {
        accountId = accountItems.find(a => a.name === matchedAcc)!.id
        continue
      }
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

  if (!category) {
    const typeCategories = CATEGORIES[type]
    for (const t of descTokens) {
      const matched = findBestMatch(t, typeCategories)
      if (matched) {
        descTokens.splice(descTokens.indexOf(t), 1)
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
        descTokens.splice(descTokens.indexOf(t), 1)
        break
      }
    }
  }

  return {
    description: descTokens.join(' ').trim(),
    value,
    type,
    category,
    accountId,
    date: date || new Date().toISOString().split('T')[0],
  }
}
