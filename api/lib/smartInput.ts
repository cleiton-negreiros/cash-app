const TYPE_KEYWORDS: Record<string, string> = {
  despesa: 'expense', despesas: 'expense', gasto: 'expense', gastos: 'expense',
  pago: 'expense', saida: 'expense', despesinha: 'expense',
  receita: 'income', receitas: 'income', ganho: 'income', ganhos: 'income',
  entrada: 'income', salario: 'income', salário: 'income',
  investimento: 'investment', investimentos: 'investment', aplicacao: 'investment', aplicação: 'investment',
  invest: 'investment', aporte: 'investment',
}

const ACCOUNT_KEYWORDS: Record<string, string> = {
  c6: 'C6',
  santander: 'Santander',
  '99pay': '99Pay', '99': '99Pay',
  'mercado pago': 'Mercado Pago', mercadopago: 'Mercado Pago', mercado: 'Mercado Pago', pago: 'Mercado Pago',
  rico: 'Rico',
  sicoob: 'Sicoob',
}

export const CATEGORIES_LIST = [
  'Salário', 'Freela', 'Investimentos', 'Vendas', 'Outros',
  'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação',
  'Lazer', 'Assinaturas', 'Compras',
  'Ações', 'FIIs', 'Renda Fixa', 'Cripto', 'Tesouro Direto',
]

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
    const normalizedToken = nt
    let matches = true
    for (const char of normalizedToken) {
      if (!normalizedItem.includes(char)) {
        matches = false
        break
      }
    }
    if (matches) return item
  }
  return null
}

function tryParseDate(token: string): string | null {
  const patterns = [
    /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/,
    /^(\d{1,2})-(\d{1,2})(?:-(\d{2,4}))?$/,
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/,
  ]
  for (const pattern of patterns) {
    const m = token.match(pattern)
    if (m) {
      const day = parseInt(m[1])
      const month = parseInt(m[2])
      let year = m[3] ? parseInt(m[3]) : new Date().getFullYear()
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

export interface ParsedInput {
  description: string
  value: number | null
  type: string
  category: string | null
  accountId: string | null
  date: string | null
}

export function parseSmartInput(input: string): ParsedInput {
  const tokens = input.trim().split(/\s+/)

  if (tokens.length === 0) {
    return { description: '', value: null, type: 'expense', category: null, accountId: null, date: null }
  }

  let value: number | null = null
  let type: string = 'expense'
  let category: string | null = null
  let accountId: string | null = null
  let date: string | null = null
  const descTokens: string[] = []

  const remaining: string[] = [...tokens]

  for (let i = 0; i < remaining.length; i++) {
    const raw = remaining[i]
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

    const matchedCat = findBestMatch(raw, CATEGORIES_LIST)
    if (matchedCat) {
      category = matchedCat
      continue
    }

    const bigram = i < remaining.length - 1 ? (raw + ' ' + remaining[i + 1]).toLowerCase() : ''
    if (bigram && ACCOUNT_KEYWORDS[bigram]) {
      accountId = ACCOUNT_KEYWORDS[bigram]
      i++
      continue
    }

    if (ACCOUNT_KEYWORDS[tl]) {
      accountId = ACCOUNT_KEYWORDS[tl]
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

  if (!category) {
    for (const t of descTokens) {
      const matched = findBestMatch(t, CATEGORIES_LIST)
      if (matched) {
        category = matched
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
