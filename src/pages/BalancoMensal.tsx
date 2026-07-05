import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTransactions } from '../hooks/useTransactions'
import { useAccounts } from '../hooks/useAccounts'
import { fetchInvestments, fetchInvestmentTransactions } from '../services/investmentService'
import { fetchLoans } from '../services/loanService'
import { fetchSnapshots, upsertSnapshot, deleteSnapshot } from '../services/snapshotService'
import type { MonthlySnapshot } from '../types'
import { MONTHS } from '../types'
import { formatCurrency } from '../utils/format'
import { getCurrentMonthYear } from '../utils/format'
import {
  BarChart3,
  TrendingDown,
  Wallet,
  PiggyBank,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Save,
  Trash2,
  type LucideIcon,
} from 'lucide-react'

export default function BalancoMensal() {
  const { user } = useAuth()
  const { transactions } = useTransactions()
  const { accounts } = useAccounts(transactions)
  const [snapshots, setSnapshots] = useState<MonthlySnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPeriod, setCurrentPeriod] = useState(getCurrentMonthYear())
  const [year, month] = currentPeriod.split('-').map(Number)
  const currentMonth = month - 1

  useEffect(() => { if (user) loadAll() }, [user])

  async function loadAll() {
    if (!user) return
    setLoading(true)
    try {
      const snaps = await fetchSnapshots(user.id)
      setSnapshots(snaps)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  function handlePrev() {
    const d = new Date(year, currentMonth - 1, 1)
    setCurrentPeriod(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  function handleNext() {
    const d = new Date(year, currentMonth + 1, 1)
    setCurrentPeriod(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const existingSnapshot = snapshots.find(
    (s) => s.refMonth === currentMonth + 1 && s.refYear === year
  )
  const prevSnapshot = snapshots.find((s) => {
    const d = new Date(year, currentMonth - 1, 1)
    return s.refMonth === d.getMonth() + 1 && s.refYear === d.getFullYear()
  })

  const monthTransactions = transactions.filter((t) => {
    const d = new Date(t.date + 'T12:00:00')
    return d.getMonth() === currentMonth && d.getFullYear() === year
  })

  const income = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.value, 0)

  const expense = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.value, 0)

  const accountsBalance = accounts.reduce((s, a) => s + a.balance, 0)

  const [computed, setComputed] = useState({
    investmentsBalance: 0,
    loansBalance: 0,
    loanPayment: 0,
    investedTotal: 0,
    redeemedTotal: 0,
    investmentYield: 0,
    ccYield: 0,
  })

  useEffect(() => {
    async function compute() {
      if (!user) return
      try {
        const invs = await fetchInvestments(user.id)
        const invTxs = await fetchInvestmentTransactions(user.id)
        const loansData = await fetchLoans(user.id)

        const invBalance = invs.reduce((s, i) => s + i.quantity * i.currentPrice, 0)
        const loanBalance = loansData.reduce((s, l) => s + l.remainingBalance, 0)
        const monthlyPayment = loansData.reduce((s, l) => s + l.monthlyPayment, 0)

        const monthTxs = invTxs.filter((t) => {
          const d = new Date(t.date + 'T12:00:00')
          return d.getMonth() === currentMonth && d.getFullYear() === year
        })

        const investedTotal = monthTxs
          .filter((t) => t.type === 'buy')
          .reduce((s, t) => s + t.total, 0)

        const redeemedTotal = monthTxs
          .filter((t) => t.type === 'sell')
          .reduce((s, t) => s + t.total, 0)

        const investmentYield = monthTxs
          .filter((t) => t.type === 'dividend' || t.type === 'income' || t.type === 'interest')
          .reduce((s, t) => s + t.total, 0)

        setComputed({
          investmentsBalance: invBalance,
          loansBalance: loanBalance,
          loanPayment: monthlyPayment,
          investedTotal,
          redeemedTotal,
          investmentYield,
          ccYield: 0,
        })
      } catch { /* intentionally empty */ }
    }
    compute()
  }, [user, currentMonth, year, transactions])

  const netEquity = accountsBalance + computed.investmentsBalance - computed.loansBalance

  const cashFlow = income - expense
  const netInvested = computed.investedTotal - computed.redeemedTotal

  const prova = prevSnapshot
    ? (existingSnapshot?.totalEquity || netEquity) - prevSnapshot.totalEquity
      - (income - expense - computed.loanPayment - netInvested + computed.investmentYield + computed.ccYield)
    : 0

  async function handleSave() {
    if (!user) return
    await upsertSnapshot(user.id, {
      refMonth: currentMonth + 1,
      refYear: year,
      accountsBalance,
      investmentsBalance: computed.investmentsBalance,
      loansBalance: computed.loansBalance,
      totalEquity: netEquity,
      incomeTotal: income,
      expenseTotal: expense,
      loanPayment: computed.loanPayment,
      investedTotal: computed.investedTotal,
      redeemedTotal: computed.redeemedTotal,
      investmentYield: computed.investmentYield,
      ccYield: computed.ccYield,
    })
    loadAll()
  }

  async function handleDelete() {
    if (!user || !existingSnapshot) return
    await deleteSnapshot(user.id, String(currentMonth + 1).padStart(2, '0'), year)
    loadAll()
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-emerald-400" /></div>
  }

  const currentLabel = `${MONTHS[currentMonth]} ${year}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={handlePrev} className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:bg-zinc-700">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-bold text-zinc-100">{currentLabel}</h2>
          <button onClick={handleNext} className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:bg-zinc-700">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {existingSnapshot ? (
            <button onClick={handleDelete} className="flex items-center gap-1.5 rounded-xl bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20">
              <Trash2 className="h-3.5 w-3.5" />Excluir
            </button>
          ) : (
            <button onClick={handleSave} className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400">
              <Save className="h-3.5 w-3.5" />Salvar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card icon={Wallet} label="Contas" value={accountsBalance} color="text-emerald-400" bg="bg-emerald-500/10" />
        <Card icon={PiggyBank} label="Investimentos" value={computed.investmentsBalance} color="text-blue-400" bg="bg-blue-500/10" />
        <Card icon={TrendingDown} label="Dívidas" value={computed.loansBalance} color="text-red-400" bg="bg-red-500/10" />
        <Card icon={BarChart3} label="Patrimônio Líquido" value={netEquity} color={netEquity >= 0 ? 'text-emerald-400' : 'text-red-400'} bg={netEquity >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'} />
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">Balanço do Período</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Line label="Receitas" value={income} color="text-emerald-400" />
          <Line label="Despesas (sem investimentos)" value={expense} color="text-red-400" />
          <Line label="Aporte líquido (inv. - resgate)" value={-netInvested} color={netInvested >= 0 ? 'text-red-400' : 'text-emerald-400'} />
          <Line label="Amortização Empréstimo" value={computed.loanPayment} color="text-red-400" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
          <Line label="Rendimento Investimentos" value={computed.investmentYield} color={computed.investmentYield >= 0 ? 'text-emerald-400' : 'text-red-400'} />
          <Line label="Rendimento C. Remunerada" value={computed.ccYield} color={computed.ccYield >= 0 ? 'text-emerald-400' : 'text-red-400'} />
          <Line label="Investido (via corretora)" value={computed.investedTotal} color="text-blue-400" />
          <Line label="Resgatado (via corretora)" value={computed.redeemedTotal} color={computed.redeemedTotal >= 0 ? 'text-emerald-400' : 'text-zinc-400'} />
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-800">
          <Line label="Fluxo de Caixa (rec - desp)" value={cashFlow} bold color={cashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        </div>
      </div>

      {prevSnapshot && (
        <div className={`rounded-2xl border p-5 ${Math.abs(prova) < 0.01 ? 'border-emerald-900/40 bg-emerald-950/30' : 'border-red-900/40 bg-red-950/30'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {Math.abs(prova) < 0.01 ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <XCircle className="h-5 w-5 text-red-400" />}
              <span className="text-sm font-bold text-zinc-200">PROVA</span>
            </div>
            <span className={`font-mono text-lg font-bold ${Math.abs(prova) < 0.01 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(prova)}
            </span>
          </div>
          <p className="text-[10px] text-zinc-500">
            ∆PL − (Receitas − Despesas − Empréstimo − AporteLíquido + Rendimentos) = 0
          </p>
        </div>
      )}

      {snapshots.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Histórico Mensal</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-600 border-b border-zinc-800">
                  <th className="text-left py-2 pr-3">Mês</th>
                  <th className="text-right py-2 px-2">Contas</th>
                  <th className="text-right py-2 px-2">Inv.</th>
                  <th className="text-right py-2 px-2">Dív.</th>
                  <th className="text-right py-2 px-3">PL</th>
                  <th className="text-right py-2 px-2">Rec.</th>
                  <th className="text-right py-2 px-2">Desp.</th>
                  <th className="text-right py-2 px-2">Inv./Resg.</th>
                  <th className="text-right py-2 px-2">Rend.</th>
                  <th className="text-right py-2 pl-3">Prova</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s) => {
                  const label = `${MONTHS[s.refMonth - 1]}/${s.refYear}`
                  const p = s.incomeTotal - s.expenseTotal - s.loanPayment - (s.investedTotal - s.redeemedTotal) + s.investmentYield + s.ccYield
                  return (
                    <tr key={s.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                      <td className="py-2 pr-3 text-zinc-200 font-medium">{label}</td>
                      <td className="text-right py-2 px-2 text-zinc-400">{formatCurrency(s.accountsBalance)}</td>
                      <td className="text-right py-2 px-2 text-blue-400">{formatCurrency(s.investmentsBalance)}</td>
                      <td className="text-right py-2 px-2 text-red-400">{formatCurrency(s.loansBalance)}</td>
                      <td className="text-right py-2 px-3 text-zinc-200 font-semibold">{formatCurrency(s.totalEquity)}</td>
                      <td className="text-right py-2 px-2 text-emerald-400">{formatCurrency(s.incomeTotal)}</td>
                      <td className="text-right py-2 px-2 text-red-400">{formatCurrency(s.expenseTotal)}</td>
                      <td className="text-right py-2 px-2 text-zinc-400">{formatCurrency(s.investedTotal - s.redeemedTotal)}</td>
                      <td className="text-right py-2 px-2 text-emerald-400">{formatCurrency(s.investmentYield + s.ccYield)}</td>
                      <td className={`text-right py-2 pl-3 font-mono ${Math.abs(p) < 0.01 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(p)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Card({ label, value, icon: Icon, color, bg }: {
  label: string; value: number; icon: LucideIcon; color: string; bg: string
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${bg}`}><Icon className={`h-4 w-4 ${color}`} /></div>
      </div>
      <p className={`mt-3 text-xl font-bold ${color}`}>{formatCurrency(value)}</p>
    </div>
  )
}

function Line({ label, value, color, bold }: { label: string; value: number; color: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-sm ${bold ? 'font-bold' : 'font-medium'} ${color}`}>{formatCurrency(value)}</span>
    </div>
  )
}
