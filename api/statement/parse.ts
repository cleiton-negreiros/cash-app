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
    } else if (trimmed.startsWith('</STMTTRN>') && currentDesc) {
      transactions.push({
        description: currentDesc,
        value: currentValue,
        date: currentDate,
        type: currentType,
      })
      currentDesc = ''
      currentValue = 0
      currentDate = ''
      currentType = 'expense'
    }
  }

  return transactions
}

function parseCSV(content: string): { description: string; value: number; date: string; type: string }[] {
  const transactions: { description: string; value: number; date: string; type: string }[] = []
  const lines = content.split('\n').filter((l) => l.trim())

  const header = lines[0].toLowerCase()
  const dateIdx = header.includes('data') ? 0 : -1
  const descIdx = header.includes('descricao') || header.includes('descrição') || header.includes('historico') ? 1 : -1
  const valueIdx = header.includes('valor') ? 2 : -1

  if (dateIdx === -1 || descIdx === -1 || valueIdx === -1) {
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(';').map((c) => c.trim().replace(/^"|"$/g, ''))
      if (cols.length < 3) continue

      const dateStr = cols[0]
      const desc = cols[1]
      const rawValue = cols[2].replace('R$', '').replace(/\./g, '').replace(',', '.').trim()
      const value = Math.abs(parseFloat(rawValue))
      const type = rawValue.startsWith('-') ? 'expense' : 'income'

      let date = dateStr
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/')
        date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
      }

      if (desc && value > 0) {
        transactions.push({ description: desc, value, date, type })
      }
    }
    return transactions
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    if (cols.length <= Math.max(dateIdx, descIdx, valueIdx)) continue

    const dateStr = cols[dateIdx]
    const desc = cols[descIdx]
    const rawValue = cols[valueIdx].replace('R$', '').replace(/\./g, '').replace(',', '.').trim()
    const value = Math.abs(parseFloat(rawValue))
    const type = rawValue.startsWith('-') ? 'expense' : 'income'

    let date = dateStr
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/')
      date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
    }

    if (desc && value > 0) {
      transactions.push({ description: desc, value, date, type })
    }
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
