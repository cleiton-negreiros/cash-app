import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { Investment, InvestmentType, Account } from '../types'
import { INVESTMENT_TYPE_LABELS } from '../types'
import { fetchInvestments, computePositionSummary, deleteInvestment, upsertInvestment } from '../services/investmentService'
import { fetchAccounts } from '../services/accountService'
import { formatCurrency } from '../utils/format'
import { parseInvestmentOFX } from '../utils/parseInvestmentOFX'
import { TrendingUp, TrendingDown, PiggyBank, BarChart3, Upload, Loader2, Plus, Trash2, X, Check, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function InvestmentPortfolio() {
  const { user } = useAuth()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState<Investment | null>(null)
  const [importParsed, setImportParsed] = useState<any[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (user) { loadInvestments(); loadAccounts() } }, [user])

  async function loadInvestments() {
    if (!user) return
    setLoading(true)
    try {
      const data = await fetchInvestments(user.id)
      setInvestments(data)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  async function loadAccounts() {
    if (!user) return
    try {
      const data = await fetchAccounts(user.id)
      setAccounts(data)
    } catch { /* ignore */ }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) return
    const form = new FormData(e.currentTarget)
    const qty = parseFloat(form.get('quantity') as string) || 0
    const avgPrice = parseFloat(form.get('averagePrice') as string) || 0
    const curPrice = parseFloat(form.get('currentPrice') as string) || 0
    const totalInvested = parseFloat(form.get('totalInvested') as string) || (qty * avgPrice)
    const totalRedeemed = parseFloat(form.get('totalRedeemed') as string) || 0
    const marketValue = qty * curPrice
    const totalYield = parseFloat(form.get('totalYield') as string) || (marketValue + totalRedeemed - totalInvested)

    await upsertInvestment(user.id, {
      ticker: (form.get('ticker') as string).toUpperCase(),
      name: form.get('name') as string || (form.get('ticker') as string).toUpperCase(),
      type: form.get('type') as InvestmentType,
      quantity: qty,
      averagePrice: avgPrice,
      currentPrice: curPrice,
      accountId: form.get('accountId') as string || 'rico',
      totalInvested,
      totalRedeemed,
      totalYield,
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
      const trades = parseInvestmentOFX(content)
      setImportParsed(trades)
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

      {showForm && <AddAssetForm accounts={accounts} editData={editData} onSubmit={handleSubmit} />}

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

function AddAssetForm({ accounts, editData, onSubmit }: {
  accounts: Account[]
  editData: Investment | null
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}) {
  const [type, setType] = useState(editData?.type || 'treasury')
  const [qty, setQty] = useState(editData?.quantity || 0)
  const [avgPrice, setAvgPrice] = useState(editData?.averagePrice || 0)
  const [curPrice, setCurPrice] = useState(editData?.currentPrice || 0)
  const [invested, setInvested] = useState(editData?.totalInvested || 0)
  const [autoCalcInvested, setAutoCalcInvested] = useState(true)
  const accountOptions = accounts.filter((a) => a.accountType !== 'credit_card')

  const marketValue = qty * curPrice
  const autoInvested = qty * avgPrice

  function handleQtyChange(v: number) {
    setQty(v)
    if (autoCalcInvested) setInvested(v * avgPrice)
  }
  function handleAvgPriceChange(v: number) {
    setAvgPrice(v)
    if (autoCalcInvested) setInvested(qty * v)
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-5">
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
        <Plus className="h-4 w-4 text-emerald-400" />
        <span className="text-sm font-semibold text-zinc-200">{editData ? 'Editar' : 'Novo'} Ativo</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-500">Ticker *</label>
          <input name="ticker" placeholder="Ex: NTN-B" defaultValue={editData?.ticker || ''} required
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-500">Nome</label>
          <input name="name" placeholder="Opcional" defaultValue={editData?.name || ''}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-500">Tipo *</label>
          <select name="type" value={type} onChange={(e) => setType(e.target.value as InvestmentType)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50">
            {Object.entries(INVESTMENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-500">Quantidade *</label>
          <input type="number" step="0.000001" placeholder="Ex: 10" value={qty} required
            onChange={(e) => handleQtyChange(parseFloat(e.target.value) || 0)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-500">Preço Médio (R$)</label>
          <input type="number" step="0.01" placeholder="Ex: 50,00" value={avgPrice}
            onChange={(e) => handleAvgPriceChange(parseFloat(e.target.value) || 0)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-500">Preço Atual (R$) *</label>
          <input type="number" step="0.01" placeholder="Ex: 52,00" value={curPrice} required
            onChange={(e) => setCurPrice(parseFloat(e.target.value) || 0)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500">Total Investido (R$)</label>
            <button type="button" onClick={() => { setAutoCalcInvested(!autoCalcInvested); if (autoCalcInvested) setInvested(0); else setInvested(autoInvested) }}
              className={`text-[10px] px-2 py-0.5 rounded-full border ${autoCalcInvested ? 'border-emerald-700 text-emerald-400' : 'border-zinc-700 text-zinc-500'} transition-all`}>
              {autoCalcInvested ? 'Auto' : 'Manual'}
            </button>
          </div>
          <input name="totalInvested" type="number" step="0.01" placeholder="Auto = qtd × preço médio"
            value={invested} readOnly={autoCalcInvested}
            onChange={(e) => { setAutoCalcInvested(false); setInvested(parseFloat(e.target.value) || 0) }}
            className={`w-full rounded-xl border bg-zinc-900/50 px-4 py-2.5 text-sm outline-none ${autoCalcInvested ? 'border-zinc-700 text-zinc-500' : 'border-zinc-800 text-zinc-100 focus:border-emerald-500/50'}`} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-500">Total Resgatado (R$)</label>
          <input name="totalRedeemed" type="number" step="0.01" placeholder="Se houver" defaultValue={editData?.totalRedeemed || 0}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-500">Rendimento Acum. (R$)</label>
          <input name="totalYield" type="number" step="0.01" placeholder="Auto se vazio"
            defaultValue={editData?.totalYield || 0}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50" />
          <p className="text-[10px] text-zinc-600">Se vazio, calculado: valor mercado + resgate - investido</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-500">Conta *</label>
          <select name="accountId" defaultValue={editData?.accountId || (accountOptions[0]?.id || 'rico')}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50">
            {accountOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            {accountOptions.length === 0 && <option value="rico">Rico</option>}
          </select>
        </div>
        <div className="space-y-1.5 flex items-end">
          <div className="w-full rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-2.5">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Valor Mercado</span>
              <span className="text-emerald-400 font-semibold">{formatCurrency(marketValue)}</span>
            </div>
          </div>
        </div>
      </div>

      <button type="submit"
        className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-400 transition-all active:scale-[0.98]">
        {editData ? 'Atualizar' : 'Adicionar'}
      </button>
    </form>
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
