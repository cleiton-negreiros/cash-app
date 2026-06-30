function parseValue(raw) {
  let cleaned = String(raw).replace(/[R$\s]/g, '').trim()
  if (!cleaned) return null

  const negative = cleaned.startsWith('-')
  cleaned = cleaned.replace(/^[-+]/, '')

  const hasDot = cleaned.includes('.')
  const hasComma = cleaned.includes(',')

  let normalized
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

function findColumnIndex(columns, matchers) {
  for (const match of matchers) {
    const idx = columns.findIndex(match)
    if (idx >= 0) return idx
  }
  return -1
}

function hasAll(col, keywords) {
  return keywords.every(kw => col.includes(kw))
}

function hasAny(col, keywords) {
  return keywords.some(kw => col.includes(kw))
}

function parseDate(dateStr) {
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

const csvContent = [
  "Data de Compra;Nome no Cartão;Final do Cartão;Categoria;Descrição;Parcela;Valor (em US$);Cotação (em R$);Valor (em R$)",
  "09/09/2025;CLEITON S NEGREIROS;3260;Relacionados a Automotivo;GP SERV AUTOMOTIVOS;9/12;0;0;241.66",
  "11/12/2025;CLEITON S NEGREIROS;3260;T&E;LOCALIZA RENT A CAR -V;6/10;0;0;500.00",
  "19/04/2026;CLEITON S NEGREIROS;3260;Assistência médica e odontológica;DROGASIL2008;2/2;0;0;89.17",
  "15/05/2026;CLEITON S NEGREIROS;3260;-;Inclusao de Pagamento;Única;0;0;-6574.13",
  "03/06/2026;CLEITON S NEGREIROS;3260;-;Anuidade Diferenciada;9/12;0;0;98.00",
  "03/06/2026;CLEITON S NEGREIROS;3260;-;Estorno Tarifa;Única;0;0;-98.00",
  "31/01/2026;CLEITON S NEGREIROS;4622;Educacional;PG *ELTON LUIZ DA SILV;5/10;0;0;299.99",
  "20/05/2026;CLEITON S NEGREIROS;4622;Seguro;HDI SEGUROS SA;Única;0;0;245.10",
  "12/02/2026;INGRID PFEIFER;7223;Vestuário / Roupas;PG *MAR ABERTO COMERCI;4/4;0;0;46.73",
  "03/03/2026;INGRID PFEIFER;7223;Vestuário / Roupas;BESNI LOJA 40;4/5;0;0;47.99",
].join('\n')

const lines = csvContent.split('\n').filter(l => l.trim())
console.log('Lines:', lines.length)

const header = lines[0]
const semicolons = (header.match(/;/g) || []).length
const commas = (header.match(/,/g) || []).length
const delim = semicolons >= commas ? ';' : ','
console.log('delim:', JSON.stringify(delim), 'semicolons:', semicolons, 'commas:', commas)

const headerCols = header.toLowerCase().split(delim).map(c => c.trim().replace(/^"|"$/g, ''))
console.log('headerCols:', headerCols)

const dateIdx = findColumnIndex(headerCols, [(c) => hasAny(c, ['data'])])
const descIdx = findColumnIndex(headerCols, [
  (c) => hasAny(c, ['descricao', 'descrição', 'descri']),
  (c) => hasAny(c, ['historico', 'nome']),
])
const valueIdx = findColumnIndex(headerCols, [
  (c) => hasAny(c, ['r$', 'brl']) && hasAny(c, ['valor']),
  (c) => hasAny(c, ['valor', 'amount', 'montante']),
])
console.log('dateIdx:', dateIdx, 'descIdx:', descIdx, 'valueIdx:', valueIdx)

const transactions = []
for (let i = 1; i < lines.length; i++) {
  const row = lines[i].split(delim).map(c => c.trim().replace(/^"|"$/g, ''))
  console.log(`Row ${i}:`, row)

  const dateStr = row[dateIdx]
  const desc = row[descIdx]
  const rawValue = row[valueIdx]

  const parsedValue = parseValue(rawValue)
  console.log(`  dateStr: ${dateStr}, desc: ${desc}, rawValue: ${rawValue} -> parsedValue: ${parsedValue}`)

  if (!parsedValue || !desc) {
    console.log('  SKIP: no value or no desc')
    continue
  }

  const isCreditPayment = desc.toLowerCase().includes('pagamento') || desc.toLowerCase().includes('estorno')
  const type = parsedValue < 0 || isCreditPayment ? 'income' : 'expense'
  const date = parseDate(dateStr)

  transactions.push({ description: desc, value: Math.abs(parsedValue), date, type })
  console.log(`  ADD: [${type}] ${date} | ${desc} | R$ ${Math.abs(parsedValue).toFixed(2)}`)
}

console.log(`\nTotal: ${transactions.length} transactions`)
