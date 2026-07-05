/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { parseSmartInput } from '../lib/smartInput.js'

const TELEGRAM_API = 'https://api.telegram.org/bot'

let supabase: any = null
function getSupabase(): any {
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
  } catch {
    /* ignore */
  }
}

async function getUserAccounts(userId: string): Promise<{ id: string; name: string }[]> {
  const sb = getSupabase()
  const { data: accounts } = await sb
    .from('accounts')
    .select('id, name')
    .eq('user_id', userId)
  return (accounts || []).map((a: Record<string, unknown>) => ({ id: String(a.id), name: String(a.name) }))
}

function formatTransactionPreview(parsed: ReturnType<typeof parseSmartInput>, accountName: string) {
  const typeLabel = parsed.type === 'income' ? '💰 Receita' : parsed.type === 'expense' ? '💸 Despesa' : '📈 Investimento'
  const sign = parsed.type === 'income' ? '+' : '-'
  return (
    `*Confirma a transação?* (responda com "sim" ou "s" para confirmar)\n\n` +
    `${typeLabel}\n` +
    `📝 ${parsed.description || '(sem descrição)'}\n` +
    `💵 ${sign} R$ ${Number(parsed.value).toFixed(2).replace('.', ',')}\n` +
    `🏷 ${parsed.category || 'Outros'}\n` +
    `🏦 ${accountName}\n` +
    `📅 ${parsed.date ? new Date(parsed.date + 'T12:00:00').toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}`
  )
}

const pendingConfirmations = new Map<number, {
  userId: string
  parsed: ReturnType<typeof parseSmartInput>
  accountId: string
  accountName: string
  category: string
  description: string
}>()

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
        `/gerar - Gerar código de link (sem login)\n` +
        `/link CODIGO - Vincular conta\n` +
        `/transacoes - Ver últimas\n` +
        `/resumo - Resumo do mês\n` +
        `/saldo - Saldo por conta\n` +
        `/cancelar - Cancelar transação pendente\n\n` +
        `*Exemplos de transações:*\n` +
         `• \`mercado 50 despesa alimentacao c6\`\n` +
         `• \`salario 5000 receita santander\`\n` +
         `• \`tesouro 200 investimento renda fixa\`\n` +
         `• \`ifood 35 15/06 c6\` (com data)`
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
            const { data: pending } = await sb
              .from('telegram_pending_codes')
              .select('*')
              .eq('code', cleanCode)
              .single()

            if (!pending) {
              await sendTelegram(chatId, '❌ Código inválido ou expirado.')
            } else if (new Date(pending.expires_at) < new Date()) {
              await sendTelegram(chatId, '❌ Código expirado. Gere um novo com /gerar.')
            } else if (pending.telegram_id !== telegramId) {
              await sendTelegram(chatId, '❌ Este código não foi gerado para este Telegram.')
            } else {
              await sb.from('telegram_pending_codes').update({ linked: true }).eq('code', cleanCode)
              await sendTelegram(chatId,
                `✅ *Código verificado!*\n\n` +
                `Agora acesse o link abaixo para concluir a vinculação:\n\n` +
                `https://cashapp-gamma-woad.vercel.app/telegram-link\n\n` +
                `Insira o código \`${cleanCode}\` e seu email do CashApp.`
              )
            }
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
        } catch {
          await sendTelegram(chatId, '❌ Erro ao processar vinculação.')
        }
      }
    } else if (text === '/gerar' || text.startsWith('/gerar')) {
      try {
        const sb = getSupabase()
        const code = Math.random().toString(36).slice(2, 8).toUpperCase()
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

        await sb.from('telegram_pending_codes').insert({
          code,
          telegram_id: telegramId,
          telegram_username: username || null,
          expires_at: expiresAt,
        })

        await sendTelegram(chatId,
          `✅ *Código gerado!*\n\n` +
          `Seu código: \`${code}\`\n` +
          `Válido por 15 minutos.\n\n` +
          `Envie /link ${code} para verificar, depois acesse o app em *Perfil → Telegram* para concluir.`
        )
      } catch {
        await sendTelegram(chatId, '❌ Erro ao gerar código. Tente novamente.')
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
            const lines = transactions.map((t: Record<string, unknown>) => {
              const sign = t.type === 'income' ? '+' : '-'
              const emoji = t.type === 'income' ? '💰' : t.type === 'expense' ? '💸' : '📈'
              return `${emoji} ${sign}R$${Number(t.value).toFixed(2)} - ${String(t.description)}`
            })
            await sendTelegram(chatId, `📋 *Últimas transações:*\n\n${lines.join('\n')}`)
          }
        }
      } catch {
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
            const receitas = txs.filter((t: Record<string, unknown>) => t.type === 'income').reduce((s: number, t: Record<string, unknown>) => s + Number(t.value), 0)
            const despesas = txs.filter((t: Record<string, unknown>) => t.type === 'expense').reduce((s: number, t: Record<string, unknown>) => s + Number(t.value), 0)
            const investimentos = txs.filter((t: Record<string, unknown>) => t.type === 'investment').reduce((s: number, t: Record<string, unknown>) => s + Number(t.value), 0)
            const saldo = receitas - despesas - investimentos
            const mesNome = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

            const catMap: Record<string, number> = {}
            for (const t of txs.filter((t: Record<string, unknown>) => t.type === 'expense')) {
              catMap[String(t.category)] = (catMap[String(t.category)] || 0) + Number(t.value)
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
      } catch {
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
      } catch {
        await sendTelegram(chatId, '❌ Erro ao buscar saldo.')
      }
    } else if (text === '/cancelar' || text.startsWith('/cancelar')) {
      if (pendingConfirmations.has(chatId)) {
        pendingConfirmations.delete(chatId)
        await sendTelegram(chatId, '❌ Transação cancelada.')
      } else {
        await sendTelegram(chatId, 'Nenhuma transação pendente.')
      }
    } else if (text.startsWith('/')) {
      await sendTelegram(chatId, '❓ Comando não reconhecido. Digite /help.')
    } else if (text.match(/^(sim|s|confirmar|ok|yes)$/i)) {
      const pending = pendingConfirmations.get(chatId)
      if (!pending) {
        await sendTelegram(chatId, 'Nenhuma transação pendente. Envie uma descrição para começar.')
      } else {
        pendingConfirmations.delete(chatId)
        try {
          const sb = getSupabase()
          const { error } = await sb.from('transactions').insert({
            user_id: pending.userId,
            account_id: pending.accountId,
            date: pending.parsed.date || new Date().toISOString().split('T')[0],
            description: pending.description,
            value: pending.parsed.value,
            type: pending.parsed.type,
            category: pending.category,
          })

          if (error) {
            await sendTelegram(chatId, `❌ Erro ao salvar: ${error.message}`)
          } else {
            const emoji = pending.parsed.type === 'income' ? '💰' : pending.parsed.type === 'expense' ? '💸' : '📈'
            const label = pending.parsed.type === 'income' ? 'Receita' : pending.parsed.type === 'expense' ? 'Despesa' : 'Investimento'
            const sign = pending.parsed.type === 'income' ? '+' : '-'

            let msg =
              `✅ *Transação salva!*\n\n` +
              `${emoji} ${label}\n` +
              `📝 ${pending.description}\n` +
              `💵 ${sign} R$ ${Number(pending.parsed.value).toFixed(2).replace('.', ',')}\n` +
              `🏷 ${pending.category}\n` +
              `🏦 ${pending.accountName}`

            msg += await formatBudgetWarning(sb, pending.userId, pending.category, pending.parsed.type)

            await sendTelegram(chatId, msg)
          }
        } catch {
          await sendTelegram(chatId, '❌ Erro ao processar transação.')
        }
      }
    } else if (text.match(/^(nao|não|n|cancelar|cancel)$/i)) {
      if (pendingConfirmations.has(chatId)) {
        pendingConfirmations.delete(chatId)
        await sendTelegram(chatId, '❌ Transação cancelada.')
      } else {
        await sendTelegram(chatId, 'Nenhuma transação pendente.')
      }
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
          const parsed = parseSmartInput(text)

          if (!parsed.value) {
            await sendTelegram(chatId, '❌ Não identifiquei um valor.\n\nExemplo: `mercado 50 despesa alimentacao c6`\nCom data: `ifood 35 15/06 santander`')
          } else {
            const userAccounts = await getUserAccounts(profile.id)
            if (userAccounts.length === 0) {
              await sendTelegram(chatId, '❌ Nenhuma conta encontrada. Crie uma conta no app primeiro.')
              return res.status(200).json({ ok: true })
            }

            const fallbackAccount = userAccounts[0]
            let matchedAccount = fallbackAccount

            if (parsed.accountId) {
              const normalizedSearch = parsed.accountId.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
              const found = userAccounts.find((a: any) =>
                a.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === normalizedSearch
              )
              if (found) matchedAccount = found
            }

            const category = parsed.category || 'Outros'
            const description = parsed.description || text.replace(/\s+\S+\s+\S+/g, '').trim()

            pendingConfirmations.set(chatId, {
              userId: profile.id,
              parsed,
              accountId: matchedAccount.id,
              accountName: matchedAccount.name,
              category,
              description,
            })

            await sendTelegram(chatId, formatTransactionPreview(parsed, matchedAccount.name))
          }
        }
      } catch {
        await sendTelegram(chatId, '❌ Erro ao processar transação.')
      }
    }

    return res.status(200).json({ ok: true })
  } catch (err: any) {
    return res.status(200).json({ ok: true, error: err.message })
  }
}

async function formatBudgetWarning(sb: any, userId: string, category: string, type: string): Promise<string> {
  try {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const { data: budgets } = await sb
      .from('budgets')
      .select('limit_amount')
      .eq('user_id', userId)
      .eq('category', category)
      .eq('type', type)
      .eq('month', month)
      .eq('year', year)
      .single()

    if (!budgets) return ''

    const firstDay = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const lastDay = new Date(year, month, 0).toISOString().split('T')[0]

    const { data: spentData } = await sb
      .from('transactions')
      .select('value')
      .eq('user_id', userId)
      .eq('category', category)
      .gte('date', firstDay)
      .lte('date', lastDay)

    const spent = (spentData || []).reduce((s: number, t: any) => s + Number(t.value), 0)
    const limit = budgets.limit_amount
    const pct = (spent / limit) * 100

    if (pct >= 100) {
      return `\n\n⚠️ *Orçamento excedido!* "${category}" já atingiu ${pct.toFixed(0)}% do limite (${spent.toFixed(2).replace('.', ',')}/${limit.toFixed(2).replace('.', ',')})`
    } else if (pct >= 80) {
      return `\n\n⚠️ *Atenção:* "${category}" está em ${pct.toFixed(0)}% do limite (${spent.toFixed(2).replace('.', ',')}/${limit.toFixed(2).replace('.', ',')})`
    }
    return ''
  } catch {
    return ''
  }
}
