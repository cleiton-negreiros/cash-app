import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { Investment, InvestmentType } from '../types'
import { INVESTMENT_TYPE_LABELS } from '../types'
import { fetchInvestments, computePositionSummary, deleteInvestment, upsertInvestment } from '../services/investmentService'
import { formatCurrency } from '../utils/format'
import { supabase } from '../lib/supabase'
import { TrendingUp, TrendingDown, PiggyBank, BarChart3, Upload, Loader2, Plus, Trash2, X, Check, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function InvestmentPortfolio() {
  const { user } = useAuth()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState<Investment | null>(null)
  const [importParsed, setImportParsed] = useState<any[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (user) loadInvestments() }, [user])

  async function loadInvestments() {
    if (!user) return
    setLoading(true)
    try {
      const data = await fetchInvestments(user.id)
      setInvestments(data)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) return
    const form = new FormData(e.currentTarget)
    const totalInvested = parseFloat(form.get('totalInvested') as string) || 0
    const qty = parseFloat(form.get('quantity') as string) || 0
    const avgPrice = parseFloat(form.get('averagePrice') as string) || 0
    const curPrice = parseFloat(form.get('currentPrice') as string) || 0
    await upsertInvestment(user.id, {
      ticker: (form.get('ticker') as string).toUpperCase(),
      name: form.get('name') as string,
      type: form.get('type') as InvestmentType,
      quantity: qty,
      averagePrice: avgPrice,
      currentPrice: curPrice,
      accountId: 'rico',
      totalInvested,
      totalRedeemed: parseFloat(form.get('totalRedeemed') as string) || 0,
      totalYield: parseFloat(form.get('totalYield') as string) || ((qty * curPrice) + (parseFloat(form.get('totalRedeemed') as string) || 0) - totalInvested),
    })
    setShowForm(false)
    setEditData(null)
    loadInvestments()
  }

  async function handleDelete(id: string) {
    if (!user) return
    await deleteInvestment(id, user.id)
    loadInvestments()
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setImporting(true)
    setImportParsed(null)
    setImported(false)
    const content = await file.text()
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token || ''
      const res = await fetch('/api/investment/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content, filename: file.name }),
      })
      if (!res.ok) throw new Error('Falha')
      const data = await res.json()
      setImportParsed(data.trades || [])
    } catch { alert('Erro ao processar OFX.') }
    setImporting(false)
  }

  async function confirmImport() {
    if (!importParsed || !user) return
    setImporting(true)
    for (const trade of importParsed) {
      const existing = investments.find((i) => i.ticker === trade.ticker)
      if (existing) {
        const newQty = trade.type === 'buy' ? existing.quantity + trade.quantity : existing.quantity - trade.quantity
        const newAvgPrice = trade.type === 'buy'
          ? ((existing.averagePrice * existing.quantity) + (trade.price * trade.quantity)) / newQty
          : existing.averagePrice
        await upsertInvestment(user.id, {
          ...existing,
          quantity: newQty,
          averagePrice: Math.round(newAvgPrice * 100) / 100,
          currentPrice: trade.price,
          totalInvested: existing.totalInvested + (trade.type === 'buy' ? trade.total : 0),
          totalRedeemed: existing.totalRedeemed + (trade.type === 'sell' ? trade.total : 0),
          totalYield: existing.totalYield + (trade.type === 'dividend' || trade.type === 'income' ? trade.total : 0),
        })
      } else {
        const isBuy = trade.type === 'buy'
        await upsertInvestment(user.id, {
          ticker: trade.ticker,
          name: trade.name || trade.ticker,
          type: guessType(trade.ticker),
          quantity: isBuy ? trade.quantity : 0,
          averagePrice: trade.price,
          currentPrice: trade.price,
          accountId: 'rico',
          totalInvested: isBuy ? trade.total : 0,
          totalRedeemed: !isBuy ? trade.total : 0,
          totalYield: (trade.type === 'dividend' || trade.type === 'income') ? trade.total : 0,
        })
      }
    }
    setImported(true)
    setImporting(false)
    loadInvestments()
    setTimeout(() => { setImportParsed(null); setImported(false) }, 2000)
  }

  function guessType(ticker: string): InvestmentType {
    const u = ticker.toUpperCase()
    if (u.endsWith('11') || u.endsWith('12') || u.endsWith('13') || u.endsWith('14')) return 'fii'
    if (['BTC', 'ETH', 'SOL', 'ADA', 'DOGE'].includes(u)) return 'crypto'
    return 'variable'
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-emerald-400" /></div>
  }

  const summary = computePositionSummary(investments)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Carteira de Investimentos</h2>
          <p className="text-sm text-zinc-500">Acompanhe seu patrimônio</p>
        </div>
        <button
          onClick={() => { setEditData(null); setShowForm(!showForm) }}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 active:scale-95"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Fechar' : 'Ativo'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <input name="ticker" placeholder="Ticker" defaultValue={editData?.ticker || ''} required className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50" />
            <input name="name" placeholder="Nome" defaultValue={editData?.name || ''} className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50" />
            <select name="type" defaultValue={editData?.type || 'stock'} className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50">
              {Object.entries(INVESTMENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input name="quantity" type="number" step="0.000001" placeholder="Quantidade" defaultValue={editData?.quantity || 0} required className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50" />
            <input name="averagePrice" type="number" step="0.01" placeholder="Preço Médio" defaultValue={editData?.averagePrice || 0} className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50" />
            <input name="currentPrice" type="number" step="0.01" placeholder="Preço Atual" defaultValue={editData?.currentPrice || 0} className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50" />
            <input name="totalInvested" type="number" step="0.01" placeholder="Total Investido" defaultValue={(editData?.totalInvested || 0)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50" />
            <input name="totalRedeemed" type="number" step="0.01" placeholder="Total Resgatado" defaultValue={(editData?.totalRedeemed || 0)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50" />
            <input name="totalYield" type="number" step="0.01" placeholder="Rendimento Acum." defaultValue={(editData?.totalYield || 0)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50" />
          </div>
          <button type="submit" className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-400">
            {editData ? 'Atualizar' : 'Adicionar'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Total Investido" value={summary.totalInvested} icon={PiggyBank} color="text-blue-400" bg="bg-blue-500/10" />
        <SummaryCard label="Valor Atual" value={summary.totalBalance} icon={BarChart3} color="text-emerald-400" bg="bg-emerald-500/10" />
        <SummaryCard label="Ganho/Perda" value={summary.totalBalance - summary.totalInvested} icon={summary.totalBalance >= summary.totalInvested ? TrendingUp : TrendingDown} color={summary.totalBalance >= summary.totalInvested ? 'text-emerald-400' : 'text-red-400'} bg={summary.totalBalance >= summary.totalInvested ? 'bg-emerald-500/10' : 'bg-red-500/10'} />
        <SummaryCard label="Rentabilidade" value={summary.totalInvested > 0 ? ((summary.totalBalance - summary.totalInvested) / summary.totalInvested) * 100 : 0} icon={summary.totalBalance >= summary.totalInvested ? ArrowUpRight : ArrowDownRight} color={summary.totalBalance >= summary.totalInvested ? 'text-emerald-400' : 'text-red-400'} bg={summary.totalBalance >= summary.totalInvested ? 'bg-emerald-500/10' : 'bg-red-500/10'} isPercent />
      </div>

      {investments.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-12 text-center">
          <PiggyBank className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
          <p className="text-sm text-zinc-500 mb-4">Nenhum ativo na carteira ainda</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => { setEditData(null); setShowForm(true) }} className="rounded-xl bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700">Adicionar manualmente</button>
            <button onClick={() => fileInputRef.current?.click()} className="rounded-xl bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700">Importar OFX Rico</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-300">Ativos</h3>
          {investments.map((inv) => {
            const val = inv.quantity * inv.currentPrice
            const gain = val - inv.totalInvested
            return (
              <div key={inv.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:border-zinc-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-200">{inv.ticker}</span>
                    <span className="text-[10px] text-zinc-500">{INVESTMENT_TYPE_LABELS[inv.type]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(val)}</span>
                    <button onClick={() => handleDelete(inv.id)} className="text-zinc-600 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                  <span className="text-zinc-500">Investido: <span className="text-zinc-300">{formatCurrency(inv.totalInvested)}</span></span>
                  <span className="text-zinc-500">Resgate: <span className="text-red-400">{formatCurrency(inv.totalRedeemed)}</span></span>
                  <span className="text-zinc-500">Rend.: <span className={inv.totalYield >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatCurrency(inv.totalYield)}</span></span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10"><Upload className="h-5 w-5 text-violet-400" /></div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">Importar Extrato Rico</h3>
            <p className="text-xs text-zinc-500">OFX da corretora</p>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept=".ofx,.txt" onChange={handleFileSelected} className="hidden" />
        {!importParsed && !imported && (
          <button onClick={() => fileInputRef.current?.click()} disabled={importing} className="w-full rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/30 py-4 text-sm text-zinc-400 hover:border-emerald-500/50 hover:text-emerald-400 transition-all disabled:opacity-50">
            {importing ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Processando...</span> : <span className="flex items-center justify-center gap-2"><FileText className="h-5 w-5" />Selecionar extrato OFX</span>}
          </button>
        )}
        {importParsed && !imported && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-400">{importParsed.length} operações encontradas</p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {importParsed.map((t: any, i: number) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-zinc-900/50 px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-200">{t.ticker}</span>
                    <span className="text-[10px] text-zinc-500">{t.type === 'buy' ? 'Compra' : t.type === 'sell' ? 'Venda' : 'Dividendo'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400">{t.quantity}x {formatCurrency(t.price)}</span>
                    <span className="text-xs font-semibold text-zinc-200">{formatCurrency(t.total)}</span>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={confirmImport} disabled={importing} className="w-full rounded-xl bg-violet-500 py-2.5 text-sm font-bold text-white hover:bg-violet-400 disabled:opacity-50">
              {importing ? 'Importando...' : `Importar ${importParsed.length} operações`}
            </button>
          </div>
        )}
        {imported && (
          <div className="flex flex-col items-center justify-center py-6 text-emerald-400">
            <Check className="h-8 w-8 mb-2" />
            <p className="text-sm font-semibold">Importado!</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, icon: Icon, color, bg, isPercent }: {
  label: string; value: number; icon: any; color: string; bg: string; isPercent?: boolean
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${bg}`}><Icon className={`h-4 w-4 ${color}`} /></div>
      </div>
      <p className={`mt-3 text-xl font-bold ${color}`}>{isPercent ? `${value >= 0 ? '+' : ''}${value.toFixed(2)}%` : formatCurrency(value)}</p>
    </div>
  )
}
