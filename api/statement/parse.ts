import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

function parseOFX(content: string): { description: string; value: number; date: string; type: string }[] {
  const transactions: { description: string; value: number; date: string; type: string }[] = []
  const lines = content.split('\n')
  let currentDesc = ''
  let currentValue = 0
  let currentDate = ''
  let currentType = 'expense'

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

function hasAll(col: string, keywords: string[]): boolean {
  return keywords.every((kw) => col.includes(kw))
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

function parseCSV(content: string): { description: string; value: number; date: string; type: string }[] {
  const transactions: { description: string; value: number; date: string; type: string }[] = []
  const lines = content.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return transactions

  const header = lines[0]
  const semicolons = (header.match(/;/g) || []).length
  const commas = (header.match(/,/g) || []).length
  const delim = semicolons >= commas ? ';' : ','

  const headerCols = header.toLowerCase().split(delim).map((c) => c.trim().replace(/^"|"$/g, ''))

  const dateIdx = findColumnIndex(headerCols, [
    (c) => hasAny(c, ['data']),
  ])
  const descIdx = findColumnIndex(headerCols, [
    (c) => hasAny(c, ['descricao', 'descrição', 'descri']),
    (c) => hasAny(c, ['historico', 'nome']),
  ])
  const valueIdx = findColumnIndex(headerCols, [
    (c) => hasAny(c, ['r$', 'brl']) && hasAny(c, ['valor']),
    (c) => hasAny(c, ['valor', 'amount', 'montante']),
  ])
  const typeIdx = findColumnIndex(headerCols, ['tipo', 'natureza'])

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(delim).map((c) => c.trim().replace(/^"|"$/g, ''))

    let dateStr: string
    let desc: string
    let rawValue: string

    if (dateIdx >= 0 && descIdx >= 0 && valueIdx >= 0) {
      dateStr = row[dateIdx]
      desc = row[descIdx]
      rawValue = row[valueIdx]
    } else {
      continue
    }

    const parsedValue = parseValue(rawValue)
    if (!parsedValue || !desc) continue

    const isCreditPayment = desc.toLowerCase().includes('pagamento') || desc.toLowerCase().includes('estorno')
    const type = parsedValue < 0 || isCreditPayment ? 'income' : 'expense'

    const date = parseDate(dateStr)

    transactions.push({
      description: desc,
      value: Math.abs(parsedValue),
      date,
      type,
    })
  }

  return transactions
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing access token' })
  }

  const accessToken = authHeader.replace('Bearer ', '')
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Missing Supabase env vars' })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return res.status(401).json({ error: 'Invalid access token' })
  }

  const { content, filename, accountId } = req.body
  if (!content || !accountId) {
    return res.status(400).json({ error: 'Missing content or accountId' })
  }

  const isOFX = filename?.toLowerCase().endsWith('.ofx') || content.includes('<OFX>')
  const parsed = isOFX ? parseOFX(content) : parseCSV(content)

  return res.status(200).json({
    filename,
    total: parsed.length,
    transactions: parsed,
  })
}
