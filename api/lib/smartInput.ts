const TYPE_KEYWORDS: Record<string, string> = {
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

const CATEGORIES_LIST = [
  'Salário', 'Freela', 'Investimentos', 'Vendas', 'Outros',
  'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação',
  'Lazer', 'Assinaturas', 'Compras',
  'Ações', 'FIIs', 'Renda Fixa', 'Cripto', 'Tesouro Direto',
]

const ACCOUNTS = [
  { id: 'sicoob', name: 'Sicoob' },
  { id: 'mercado-pago', name: 'Mercado Pago' },
  { id: 'rico', name: 'Rico' },
  { id: 'nubank', name: 'Nubank' },
  { id: 'itau', name: 'Itaú' },
  { id: 'caixa', name: 'Caixa' },
  { id: 'outro', name: 'Outro' },
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
  return null
}

export function parseSmartInput(input: string) {
  const tokens = input.trim().split(/\s+/)

  if (tokens.length === 0) {
    return { description: '', value: null, type: 'expense', category: null, accountId: null }
  }

  let value: number | null = null
  let type: string = 'expense'
  let category: string | null = null
  let accountId: string | null = null
  const descTokens: string[] = []

  for (const raw of tokens) {
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

    const matchedCat = findBestMatch(raw, CATEGORIES_LIST)
    if (matchedCat) {
      category = matchedCat
      continue
    }

    const matchedAcc = findBestMatch(raw, ACCOUNTS.map(a => a.name))
    if (matchedAcc) {
      const acc = ACCOUNTS.find(a => a.name === matchedAcc)
      if (acc) accountId = acc.id
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

  return {
    description: descTokens.join(' ').trim(),
    value,
    type,
    category,
    accountId,
  }
}
