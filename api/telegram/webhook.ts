import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const TELEGRAM_API = 'https://api.telegram.org/bot'

let supabase: any = null
function getSupabase() {
  if (supabase) return supabase
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing env vars')
  supabase = createClient(url, key, { auth: { persistSession: false } })
  return supabase
}

async function sendTelegram(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  try {
    await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    })
  } catch (e) {}
}

const CATEGORIES: any = {
  expense: ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação', 'Lazer', 'Assinaturas', 'Compras', 'Outros'],
  income: ['Salário', 'Freela', 'Investimentos', 'Vendas', 'Outros'],
  investment: ['Ações', 'FIIs', 'Renda Fixa', 'Cripto', 'Tesouro Direto', 'Outros'],
}

const CATEGORIES_LIST = [
  'Salário', 'Freela', 'Investimentos', 'Vendas',
  'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação',
  'Lazer', 'Assinaturas', 'Compras',
  'Ações', 'FIIs', 'Renda Fixa', 'Cripto', 'Tesouro Direto',
]

const ACCOUNTS = [
  { id: '39115704-05c0-4b65-94a0-3df546846e21', name: 'Outro' },
  { id: '021ce465-98e7-45cf-8b31-14f86bc89843', name: 'Itaú' },
  { id: 'd5bae6db-3e20-41cb-a443-387e3a502073', name: 'Mercado Pago' },
  { id: 'ca0a3cae-618a-4593-a007-8d119ed46b95', name: 'Nubank' },
  { id: '18ecb47c-5f54-40b3-a522-9ee415f66987', name: 'Rico' },
  { id: 'd291285e-2491-4aaf-b7ec-f547731fdbbc', name: 'Caixa' },
]

const TYPE_WORDS: Record<string, string> = {
  despesa: 'expense', despesas: 'expense', gasto: 'expense', gastos: 'expense',
  pago: 'expense', saida: 'expense',
  receita: 'income', receitas: 'income', ganho: 'income', ganhos: 'income',
  entrada: 'income', salario: 'income',
  investimento: 'investment', investimentos: 'investment', aplicacao: 'investment',
}

function findMatch(token: string, items: string[]): string | null {
  const t = token.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  for (const item of items) {
    const i = item.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    if (i === t) return item
  }
  for (const item of items) {
    const i = item.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    if (i.startsWith(t) || t.startsWith(i)) return item
  }
  for (const item of items) {
    const i = item.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    if (i.includes(t) || t.includes(i)) return item
  }
  return null
}

function parseInput(input: string) {
  const tokens = input.trim().split(/\s+/)
  let value: number | null = null
  let type = 'expense'
  let category: string | null = null
  let accountId: string | null = null
  const desc: string[] = []

  for (const raw of tokens) {
    const num = parseFloat(raw.replace(',', '.'))
    if (!isNaN(num) && num > 0 && value === null) {
      value = num
      continue
    }
    if (TYPE_WORDS[raw.toLowerCase()]) {
      type = TYPE_WORDS[raw.toLowerCase()]
      continue
    }
    const cat = findMatch(raw, CATEGORIES_LIST)
    if (cat) { category = cat; continue }
    const acc = findMatch(raw, ACCOUNTS.map(a => a.name))
    if (acc) {
      const found = ACCOUNTS.find(a => a.name === acc)
      if (found) accountId = found.id
      continue
    }
    desc.push(raw)
  }

  return { value, type, category, accountId, description: desc.join(' ') }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const chatId = req.body?.message?.chat?.id
    const telegramId = req.body?.message?.from?.id
    const username = req.body?.message?.from?.username
    const text = req.body?.message?.text || ''

    if (!chatId) return res.status(200).json({ ok: true })

    if (text === '/start' || text.startsWith('/start')) {
      await sendTelegram(chatId,
        `👋 *Olá! Eu sou o bot do CashApp*\n\n` +
        `Para vincular sua conta:\n` +
        `1. Acesse o CashApp no navegador\n` +
        `2. Vá em *Perfil* → *Telegram*\n` +
        `3. Gere um código e envie: \`/link CODIGO\`\n\n` +
        `Ou digite /help para mais informações.`
      )
    } else if (text === '/help' || text.startsWith('/help')) {
      await sendTelegram(chatId,
        `🤖 *CashApp Bot*\n\n` +
        `*Comandos:*\n` +
        `/start - Boas-vindas\n` +
        `/link CODIGO - Vincular conta\n` +
        `/transacoes - Ver últimas\n` +
        `/resumo - Resumo do mês\n` +
        `/saldo - Saldo por conta\n\n` +
        `*Exemplos de transações:*\n` +
        `• \`mercado 50 despesa alimentacao nubank\`\n` +
        `• \`salario 5000 receita nubank\`\n` +
        `• \`tesouro 200 investimento renda fixa\``
      )
    } else if (text.startsWith('/link')) {
      const code = text.split(' ')[1]
      if (!code) {
        await sendTelegram(chatId, '❌ Use: `/link SEU_CODIGO`')
      } else {
        try {
          const sb = getSupabase()
          const cleanCode = code.trim().toUpperCase()

          const { data: profile } = await sb
            .from('profiles')
            .select('id, telegram_link_code_expires_at, telegram_id')
            .eq('telegram_link_code', cleanCode)
            .single()

          if (!profile) {
            await sendTelegram(chatId, '❌ Código inválido ou expirado.')
          } else if (profile.telegram_id && profile.telegram_id !== telegramId) {
            await sendTelegram(chatId, '❌ Esta conta já está vinculada a outro Telegram.')
          } else if (new Date(profile.telegram_link_code_expires_at) < new Date()) {
            await sendTelegram(chatId, '❌ Código expirado. Gere um novo no app.')
          } else {
            const { error } = await sb
              .from('profiles')
              .update({
                telegram_id: telegramId,
                telegram_username: username || null,
                telegram_link_code: null,
                telegram_link_code_expires_at: null,
              })
              .eq('id', profile.id)

            if (error) {
              await sendTelegram(chatId, '❌ Erro ao vincular. Tente novamente.')
            } else {
              await sendTelegram(chatId, '✅ *Conta vinculada com sucesso!*\n\nAgora é só mandar suas transações.')
            }
          }
        } catch (err: any) {
          await sendTelegram(chatId, '❌ Erro ao processar vinculação.')
        }
      }
    } else if (text === '/transacoes' || text.startsWith('/transacoes')) {
      try {
        const sb = getSupabase()
        const { data: profile } = await sb
          .from('profiles')
          .select('id')
          .eq('telegram_id', telegramId)
          .single()

        if (!profile) {
          await sendTelegram(chatId, '❌ Conta não vinculada. Use /start')
        } else {
          const { data: transactions } = await sb
            .from('transactions')
            .select('*')
            .eq('user_id', profile.id)
            .order('date', { ascending: false })
            .limit(10)

          if (!transactions || transactions.length === 0) {
            await sendTelegram(chatId, '📭 Nenhuma transação encontrada.')
          } else {
            const lines = transactions.map((t: any) => {
              const sign = t.type === 'income' ? '+' : '-'
              const emoji = t.type === 'income' ? '💰' : t.type === 'expense' ? '💸' : '📈'
              return `${emoji} ${sign}R$${Number(t.value).toFixed(2)} - ${t.description}`
            })
            await sendTelegram(chatId, `📋 *Últimas transações:*\n\n${lines.join('\n')}`)
          }
        }
      } catch (err: any) {
        await sendTelegram(chatId, '❌ Erro ao buscar transações.')
      }
    } else if (text === '/resumo' || text.startsWith('/resumo')) {
      try {
        const sb = getSupabase()
        const { data: profile } = await sb
          .from('profiles')
          .select('id')
          .eq('telegram_id', telegramId)
          .single()

        if (!profile) {
          await sendTelegram(chatId, '❌ Conta não vinculada. Use /start')
        } else {
          const now = new Date()
          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
          const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

          const { data: txs } = await sb
            .from('transactions')
            .select('type, value, category')
            .eq('user_id', profile.id)
            .gte('date', firstDay)
            .lte('date', lastDay)

          if (!txs || txs.length === 0) {
            await sendTelegram(chatId, '📭 Nenhuma transação no mês.')
          } else {
            const fmt = (n: number) => n.toFixed(2).replace('.', ',')
            const receitas = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.value), 0)
            const despesas = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.value), 0)
            const investimentos = txs.filter(t => t.type === 'investment').reduce((s, t) => s + Number(t.value), 0)
            const saldo = receitas - despesas - investimentos
            const mesNome = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

            const catMap: Record<string, number> = {}
            for (const t of txs.filter(t => t.type === 'expense')) {
              catMap[t.category] = (catMap[t.category] || 0) + Number(t.value)
            }
            const topCats = Object.entries(catMap)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([cat, val]) => `  • ${cat}: R$ ${fmt(val)}`)
              .join('\n')

            const emoji = saldo >= 0 ? '📈' : '📉'
            await sendTelegram(chatId,
              `📊 *Resumo de ${mesNome}*\n\n` +
              `💰 Receitas: R$ ${fmt(receitas)}\n` +
              `💸 Despesas: R$ ${fmt(despesas)}\n` +
              `📈 Investimentos: R$ ${fmt(investimentos)}\n` +
              `${emoji} Saldo: R$ ${fmt(saldo)}\n\n` +
              `*Top categorias:*\n${topCats || '  (nenhuma)'}`
            )
          }
        }
      } catch (err: any) {
        await sendTelegram(chatId, '❌ Erro ao buscar resumo.')
      }
    } else if (text === '/saldo' || text.startsWith('/saldo')) {
      try {
        const sb = getSupabase()
        const { data: profile } = await sb
          .from('profiles')
          .select('id')
          .eq('telegram_id', telegramId)
          .single()

        if (!profile) {
          await sendTelegram(chatId, '❌ Conta não vinculada. Use /start')
        } else {
          const { data: txs } = await sb
            .from('transactions')
            .select('account_id, type, value, account:accounts(name)')
            .eq('user_id', profile.id)

          if (!txs || txs.length === 0) {
            await sendTelegram(chatId, '📭 Nenhuma transação encontrada.')
          } else {
            const balance: Record<string, { name: string; saldo: number }> = {}
            for (const t of txs) {
              const accId = t.account_id
              const accName = (t.account as any)?.name || 'Outro'
              if (!balance[accId]) balance[accId] = { name: accName, saldo: 0 }
              if (t.type === 'income') balance[accId].saldo += Number(t.value)
              else if (t.type === 'expense' || t.type === 'investment') balance[accId].saldo -= Number(t.value)
            }

            const lines = Object.values(balance)
              .sort((a, b) => b.saldo - a.saldo)
              .map(a => {
                const emoji = a.saldo >= 0 ? '✅' : '⚠️'
                const sign = a.saldo >= 0 ? '' : '-'
                return `${emoji} ${a.name}: ${sign}R$ ${Math.abs(a.saldo).toFixed(2).replace('.', ',')}`
              })
              .join('\n')

            const total = Object.values(balance).reduce((s, a) => s + a.saldo, 0)
            const totalEmoji = total >= 0 ? '📈' : '📉'
            await sendTelegram(chatId,
              `💰 *Saldo por conta*\n\n${lines}\n\n${totalEmoji} *Total: ${total >= 0 ? '' : '-'}R$ ${Math.abs(total).toFixed(2).replace('.', ',')}*`
            )
          }
        }
      } catch (err: any) {
        await sendTelegram(chatId, '❌ Erro ao buscar saldo.')
      }
    } else if (text.startsWith('/')) {
      await sendTelegram(chatId, '❓ Comando não reconhecido. Digite /help.')
    } else {
      try {
        const sb = getSupabase()
        const { data: profile } = await sb
          .from('profiles')
          .select('id')
          .eq('telegram_id', telegramId)
          .single()

        if (!profile) {
          await sendTelegram(chatId, '❌ Conta não vinculada. Use /start para vincular.')
        } else {
          const parsed = parseInput(text)

          if (!parsed.value) {
            await sendTelegram(chatId, '❌ Não identifiquei um valor.\n\nExemplo: `mercado 50 despesa alimentacao nubank`')
          } else {
            const account = ACCOUNTS.find(a => a.id === parsed.accountId) || ACCOUNTS[0]
            const accountId = account.id
            const accountName = account.name
            const category = parsed.category || CATEGORIES[parsed.type][CATEGORIES[parsed.type].length - 1]
            const description = parsed.description || text

            const { error } = await sb.from('transactions').insert({
              user_id: profile.id,
              account_id: accountId,
              date: new Date().toISOString().split('T')[0],
              description,
              value: parsed.value,
              type: parsed.type,
              category,
            })

            if (error) {
              await sendTelegram(chatId, `❌ Erro ao salvar: ${error.message}`)
            } else {
              const emoji = parsed.type === 'income' ? '💰' : parsed.type === 'expense' ? '💸' : '📈'
              const label = parsed.type === 'income' ? 'Receita' : parsed.type === 'expense' ? 'Despesa' : 'Investimento'
              const sign = parsed.type === 'income' ? '+' : '-'

              await sendTelegram(chatId,
                `✅ *Transação salva!*\n\n` +
                `${emoji} ${label}\n` +
                `📝 ${description}\n` +
                `💵 ${sign} R$ ${Number(parsed.value).toFixed(2).replace('.', ',')}\n` +
                `🏷 ${category}\n` +
                `🏦 ${accountName}`
              )
            }
          }
        }
      } catch (err: any) {
        await sendTelegram(chatId, '❌ Erro ao processar transação.')
      }
    }

    return res.status(200).json({ ok: true })
  } catch (err: any) {
    return res.status(200).json({ ok: true, error: err.message })
  }
}
