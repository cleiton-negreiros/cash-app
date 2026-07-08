export interface ParsedTransaction {
  description: string
  value: number
  date: string
  type: 'income' | 'expense'
  category: string
}

const CATEGORY_RULES: [RegExp, string][] = [
  [/ifood|rappi|uber\s*eats|aça[ií]|restaurante|lanche|pizza|self.?service|padaria|mercearia|supermercado|mercado|açougue|hortifrúti|feira/i, 'Alimentação'],
  [/shell|ipiranga|petrobras|posto|combust[ií]vel|gasolina|etanol|diesel/i, 'Transporte'],
  [/uber|99\s*(pop|taxi)|taxi|metrô|recarga\s*cel|pedágio|estacionamento/i, 'Transporte'],
  [/aluguel|condom[ií]nio|iptu|ipva|luz|energia|água|saneamento|gás|net|tv\s*por\s*cabo|internet|telefone/i, 'Moradia'],
  [/farmácia|drogasil|drogaraia|médico|dentista|plano\s*saúde|convênio|hospital|exame/i, 'Saúde'],
  [/faculdade|curso|escola|udemy|coursera|alura|inglês|edu\.cr|mensalidade/i, 'Educação'],
  [/cinema|netflix|spotify|prime\s*video|disney|hbomax|hbo\s*max|paramount|jogos|ingresso|show|teatro|academia|clube/i, 'Lazer'],
  [/shein|shopee|magazine\s*luiza|mercado\s*livre|amazon|americanas|submarino|casas\s*bahia|roupa|calçado|eletro/i, 'Compras'],
  [/pagamento\s*(de\s*)?fatura|cartão|nubank|creditas|will\s*bank|inter/i, 'Cartão'],
  [/salário|pagamento\s*fornecedor|freela|projeto|consultoria|nota\s*fiscal/i, 'Salário'],
  [/rendimento|dividendo|juros\s*sobre|poupança|cdb|lci|lca|tesouro|fii\s*rend|ação/i, 'Investimentos'],
  [/boleto|darft|tarifa|iof|cpmf|ir\s*|imposto|taxa/i, 'Outros'],
]

function detectCategory(description: string): string {
  for (const [pattern, category] of CATEGORY_RULES) {
    if (pattern.test(description)) return category
  }
  return 'Outros'
}

function parseValue(raw: string): number | null {
  let cleaned = raw.replace(/[R$\s]/g, '').trim()
  if (!cleaned) return null

  const negative = cleaned.startsWith('-')
  cleaned = cleaned.replace(/^[-+]/, '')

  const hasDot = cleaned.includes('.')
  const hasComma = cleaned.includes(',')

  let normalized: string
  if (hasDot && hasComma) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (hasComma && !hasDot) {
    normalized = cleaned.replace(',', '.')
  } else if (hasDot) {
    const parts = cleaned.split('.')
    if (parts.length === 2 && parts[1].length <= 2) {
      normalized = cleaned
    } else {
      normalized = cleaned.replace(/\./g, '')
    }
  } else {
    normalized = cleaned
  }

  const value = parseFloat(normalized)
  if (isNaN(value) || value <= 0) return null
  return negative ? -value : value
}

function findColumnIndex(columns: string[], matchers: ((col: string) => boolean)[]): number {
  for (const match of matchers) {
    const idx = columns.findIndex(match)
    if (idx >= 0) return idx
  }
  return -1
}

function hasAny(col: string, keywords: string[]): boolean {
  return keywords.some((kw) => col.includes(kw))
}

function parseDate(dateStr: string): string {
  if (!dateStr) return ''
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/')
    if (parts.length === 3) {
      let year = parts[2]
      if (year.length === 2) year = '20' + year
      return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
    }
  }
  if (dateStr.includes('-') && dateStr.length === 10) {
    return dateStr
  }
  return dateStr
}

function parseOFX(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []
  const lines = content.split('\n')
  let currentDesc = ''
  let currentValue = 0
  let currentDate = ''
  let currentType: 'income' | 'expense' = 'expense'

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('<NAME>')) {
      currentDesc = trimmed.replace('<NAME>', '').replace('</NAME>', '').trim()
    } else if (trimmed.startsWith('<MEMO>')) {
      currentDesc = trimmed.replace('<MEMO>', '').replace('</MEMO>', '').trim()
    } else if (trimmed.startsWith('<TRNTYPE>')) {
      const type = trimmed.replace('<TRNTYPE>', '').replace('</TRNTYPE>', '').trim()
      currentType = ['CREDIT', 'DEP'].includes(type) ? 'income' : 'expense'
    } else if (trimmed.startsWith('<DTPOSTED>')) {
      const raw = trimmed.replace('<DTPOSTED>', '').replace('</DTPOSTED>', '').trim()
      const m = raw.match(/^(\d{4})(\d{2})(\d{2})/)
      if (m) currentDate = `${m[1]}-${m[2]}-${m[3]}`
    } else if (trimmed.startsWith('<TRNAMT>')) {
      currentValue = Math.abs(parseFloat(trimmed.replace('<TRNAMT>', '').replace('</TRNAMT>', '').trim()))
    } else if (trimmed.startsWith('</STMTTRN>')) {
      if (currentValue || currentDate) {
        transactions.push({
          description: currentDesc || 'Sem descrição',
          value: currentValue,
          date: currentDate,
          type: currentType,
          category: currentType === 'income' ? 'Outros' : detectCategory(currentDesc),
        })
      }
      currentDesc = ''
      currentValue = 0
      currentDate = ''
      currentType = 'expense'
    }
  }

  return transactions
}

function findCsvHeader(lines: string[]): { headerRow: string; rowStart: number; delim: string } | null {
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i].replace(/^\uFEFF/, '')
    for (const delim of [',', ';']) {
      const cols = line.toLowerCase().split(delim).map((c) => c.trim().replace(/^"|"$/g, ''))
      if (cols.length < 3) continue
      const hasDate = findColumnIndex(cols, [(c) => hasAny(c, ['data'])]) >= 0
      const hasDesc = findColumnIndex(cols, [
        (c) => hasAny(c, ['titulo', 'título']),
        (c) => hasAny(c, ['descricao', 'descrição', 'descri']),
        (c) => hasAny(c, ['historico', 'nome']),
      ]) >= 0
      const hasValue = findColumnIndex(cols, [
        (c) => hasAny(c, ['entrada']),
        (c) => hasAny(c, ['saída', 'saida']),
        (c) => hasAny(c, ['r$', 'brl']) && hasAny(c, ['valor']),
        (c) => hasAny(c, ['valor', 'amount', 'montante']),
      ]) >= 0
      if (hasDate && hasDesc && hasValue) {
        return { headerRow: line, rowStart: i + 1, delim }
      }
    }
  }
  return null
}

function parseCSV(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []
  const lines = content.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return transactions

  const found = findCsvHeader(lines)
  if (!found) return transactions

  const header = found.headerRow
  const rowStart = found.rowStart
  const delim = found.delim

  const headerCols = header.toLowerCase().split(delim).map((c) => c.trim().replace(/^"|"$/g, ''))

  const dateIdx = findColumnIndex(headerCols, [(c) => hasAny(c, ['data'])])
  const descIdx = findColumnIndex(headerCols, [
    (c) => hasAny(c, ['titulo', 'título']),
    (c) => hasAny(c, ['descricao', 'descrição', 'descri']),
    (c) => hasAny(c, ['historico', 'nome']),
  ])
  const valueIdx = findColumnIndex(headerCols, [
    (c) => hasAny(c, ['r$', 'brl']) && hasAny(c, ['valor']),
    (c) => hasAny(c, ['valor', 'amount', 'montante']),
  ])
  const incomeIdx = findColumnIndex(headerCols, [(c) => hasAny(c, ['entrada'])])
  const expenseIdx = findColumnIndex(headerCols, [(c) => hasAny(c, ['saída', 'saida'])])

  const hasSplitColumns = incomeIdx >= 0 && expenseIdx >= 0

  for (let i = rowStart; i < lines.length; i++) {
    const row = lines[i].split(delim).map((c) => c.trim().replace(/^"|"$/g, ''))

    let dateStr: string
    let desc: string

    if (dateIdx >= 0 && descIdx >= 0) {
      dateStr = row[dateIdx]
      desc = row[descIdx]
    } else {
      continue
    }
    if (!desc) continue

    let parsedValue: number | null
    let type: 'income' | 'expense'

    if (hasSplitColumns) {
      const income = parseValue(row[incomeIdx] || '0')
      const expense = parseValue(row[expenseIdx] || '0')
      if ((income || 0) > 0) {
        parsedValue = income
        type = 'income'
      } else if ((expense || 0) > 0) {
        parsedValue = expense
        type = 'expense'
      } else {
        continue
      }
    } else if (valueIdx >= 0) {
      const rawValue = row[valueIdx]
      parsedValue = parseValue(rawValue)
      if (!parsedValue) continue
      const isCreditPayment = desc.toLowerCase().includes('pagamento') || desc.toLowerCase().includes('estorno')
      type = parsedValue < 0 || isCreditPayment ? 'income' : 'expense'
    } else {
      continue
    }

    const date = parseDate(dateStr)

    transactions.push({
      description: desc,
      value: Math.abs(parsedValue ?? 0),
      date,
      type,
      category: detectCategory(desc),
    })
  }

  return transactions
}

export function parseStatement(content: string, filename: string): ParsedTransaction[] {
  const isOFX = filename?.toLowerCase().endsWith('.ofx') || content.includes('<OFX>')
  return isOFX ? parseOFX(content) : parseCSV(content)
}
