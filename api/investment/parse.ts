import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

interface ParsedTrade {
  ticker: string
  name: string
  type: 'buy' | 'sell' | 'dividend' | 'interest' | 'income'
  quantity: number
  price: number
  total: number
  date: string
}

interface SecurityInfo {
  ticker: string
  name: string
  type: string
}

function parseOFX(content: string): ParsedTrade[] {
  const trades: ParsedTrade[] = []
  const lines = content.split('\n')

  const securities: Map<string, SecurityInfo> = new Map()
  let inSecList = false
  let currentSec: Partial<SecurityInfo> = {}

  let currentTicker = ''
  let currentName = ''
  let currentType: ParsedTrade['type'] = 'buy'
  let currentQuantity = 0
  let currentPrice = 0
  let currentTotal = 0
  let currentDate = ''
  let inTransaction = false

  function pushTrade() {
    if (currentTicker && (currentQuantity > 0 || currentType !== 'buy')) {
      const sec = securities.get(currentTicker)
      trades.push({
        ticker: currentTicker,
        name: currentName || sec?.name || currentTicker,
        type: currentType,
        quantity: currentQuantity,
        price: currentPrice,
        total: currentTotal || currentPrice * currentQuantity,
        date: currentDate,
      })
    }
    currentTicker = ''
    currentName = ''
    currentType = 'buy'
    currentQuantity = 0
    currentPrice = 0
    currentTotal = 0
    currentDate = ''
    inTransaction = false
  }

  for (const line of lines) {
    const t = line.trim()
    if (!t) continue

    if (t.startsWith('<SECLIST>')) { inSecList = true; continue }
    if (t.startsWith('</SECLIST>')) { inSecList = false; continue }

    if (inSecList) {
      if (t.startsWith('<MFINFO>') || t.startsWith('<STOCKINFO>') || t.startsWith('<OPTINFO>') || t.startsWith('<OTHERINFO>') || t.startsWith('<DEBTINFO>')) {
        currentSec = {}
        continue
      }
      if (t.startsWith('</MFINFO>') || t.startsWith('</STOCKINFO>') || t.startsWith('</OPTINFO>') || t.startsWith('</OTHERINFO>') || t.startsWith('</DEBTINFO>')) {
        if (currentSec.ticker) {
          securities.set(currentSec.ticker, currentSec as SecurityInfo)
        }
        currentSec = {}
        continue
      }
      if (t.startsWith('<SECNAME>')) {
        currentSec.name = t.replace('<SECNAME>', '').replace('</SECNAME>', '').trim()
        continue
      }
      if (t.startsWith('<TICKER>')) {
        currentSec.ticker = t.replace('<TICKER>', '').replace('</TICKER>', '').trim()
        continue
      }
      if (t.startsWith('<UNIQUEID>') && !currentSec.ticker) {
        const val = t.replace('<UNIQUEID>', '').replace('</UNIQUEID>', '').trim()
        if (!val.startsWith('XP')) currentSec.ticker = val
        continue
      }
      continue
    }

    if (t.startsWith('<BUYSTOCK>') || t.startsWith('<BUYMF>') || t.startsWith('<BUYDEBT>') || t.startsWith('<BUYOTHER>')) {
      pushTrade()
      inTransaction = true
      currentType = 'buy'
      continue
    }
    if (t.startsWith('<SELLSTOCK>') || t.startsWith('<SELLMF>') || t.startsWith('<SELLDEBT>') || t.startsWith('<SELLOTHER>')) {
      pushTrade()
      inTransaction = true
      currentType = 'sell'
      continue
    }
    if (t.startsWith('<REINVEST>') || t.startsWith('<INCOME>')) {
      pushTrade()
      inTransaction = true
      currentType = t.startsWith('<REINVEST>') ? 'buy' : 'dividend'
      continue
    }

    if (inTransaction) {
      if (t.startsWith('<UNIQUEID>')) {
        const val = t.replace('<UNIQUEID>', '').replace('</UNIQUEID>', '').trim()
        if (!val.startsWith('XP')) currentTicker = val
        continue
      }
      if (t.startsWith('<TICKER>')) {
        currentTicker = t.replace('<TICKER>', '').replace('</TICKER>', '').trim()
        continue
      }
      if (t.startsWith('<SUBACCTSEC>') || t.startsWith('<SUBACCTFUND>')) {
        continue
      }
      if (t.startsWith('<UNITS>')) {
        currentQuantity = Math.abs(parseFloat(t.replace('<UNITS>', '').replace('</UNITS>', '').trim()))
        continue
      }
      if (t.startsWith('<UNITPRICE>')) {
        currentPrice = Math.abs(parseFloat(t.replace('<UNITPRICE>', '').replace('</UNITPRICE>', '').trim()))
        continue
      }
      if (t.startsWith('<TOTAL>')) {
        currentTotal = Math.abs(parseFloat(t.replace('<TOTAL>', '').replace('</TOTAL>', '').trim()))
        continue
      }
      if (t.startsWith('<DTPURCHASE>') || t.startsWith('<DTTRADE>') || t.startsWith('<DTINCOME>')) {
        const raw = t.replace(/<\/?[^>]+>/g, '').trim()
        if (raw) {
          const m = raw.match(/^(\d{4})(\d{2})(\d{2})/)
          if (m) currentDate = `${m[1]}-${m[2]}-${m[3]}`
        }
        continue
      }
      if (t.startsWith('<MEMO>')) {
        currentName = t.replace('<MEMO>', '').replace('</MEMO>', '').trim()
        continue
      }
      if (t.startsWith('<INCOMETYPE>')) {
        const incomeType = t.replace('<INCOMETYPE>', '').replace('</INCOMETYPE>', '').trim()
        if (incomeType === 'LONGTERM' || incomeType === 'SHORTTERM') currentType = 'interest'
        continue
      }
      if (t.startsWith('</BUYSTOCK>') || t.startsWith('</SELLSTOCK>') ||
          t.startsWith('</BUYMF>') || t.startsWith('</SELLMF>') ||
          t.startsWith('</BUYDEBT>') || t.startsWith('</SELLDEBT>') ||
          t.startsWith('</BUYOTHER>') || t.startsWith('</SELLOTHER>') ||
          t.startsWith('</REINVEST>') || t.startsWith('</INCOME>')) {
        pushTrade()
      }
    }
  }

  pushTrade()
  return trades
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

  const { content, filename } = req.body
  if (!content) {
    return res.status(400).json({ error: 'Missing content' })
  }

  const trades = parseOFX(content)

  return res.status(200).json({
    filename,
    total: trades.length,
    trades,
  })
}
