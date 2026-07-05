import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchInvestments, computePositionSummary, type PositionGroup } from '../services/investmentService'
import { formatCurrency } from '../utils/format'
import {
  TrendingUp,
  PiggyBank,
  Wallet,
  BarChart3,
  Loader2,
  Landmark,
  ArrowDownRight,
} from 'lucide-react'

export default function PosicaoAtual() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<ReturnType<typeof computePositionSummary> | null>(null)

  async function load() {
    if (!user) return
    setLoading(true)
    try {
      const data = await fetchInvestments(user.id)
      setSummary(computePositionSummary(data))
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (user) load()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    )
  }

  if (!summary || summary.groups.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-12 text-center">
        <PiggyBank className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
        <p className="text-sm text-zinc-500">Nenhum investimento cadastrado</p>
      </div>
    )
  }

  const grandTotal = summary.groups.reduce((s, g) => s + g.balance, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100">Posição Atual</h2>
        <p className="text-sm text-zinc-500">Resumo consolidado por tipo de ativo</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card icon={Wallet} label="Saldo Final" value={grandTotal} color="text-emerald-400" bg="bg-emerald-500/10" />
        <Card icon={TrendingUp} label="Total Investido" value={summary.totalInvested} color="text-blue-400" bg="bg-blue-500/10" />
        <Card icon={ArrowDownRight} label="Total Resgatado" value={summary.totalRedeemed} color="text-red-400" bg="bg-red-500/10" />
        <Card icon={BarChart3} label="Rendimento Total" value={summary.totalYield} color={summary.totalYield >= 0 ? 'text-emerald-400' : 'text-red-400'} bg={summary.totalYield >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'} />
      </div>

      <div className="space-y-2">
        {summary.groups.map((group) => (
          <GroupCard key={group.type} group={group} />
        ))}
      </div>

      <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/30 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Landmark className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-bold text-emerald-300">Total Geral</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
          <div>
            <span className="text-zinc-500 text-xs block">Saldo Final</span>
            <span className="text-emerald-400 font-bold">{formatCurrency(grandTotal)}</span>
          </div>
          <div>
            <span className="text-zinc-500 text-xs block">Investido</span>
            <span className="text-blue-400">{formatCurrency(summary.totalInvested)}</span>
          </div>
          <div>
            <span className="text-zinc-500 text-xs block">Resgate</span>
            <span className="text-red-400">{formatCurrency(summary.totalRedeemed)}</span>
          </div>
          <div>
            <span className="text-zinc-500 text-xs block">Rendimento</span>
            <span className={summary.totalYield >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {formatCurrency(summary.totalYield)}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 text-xs block">S/Liquidez</span>
            <span className="text-zinc-200">{formatCurrency(grandTotal + summary.totalRedeemed)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Card({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string
  value: number
  icon: any
  color: string
  bg: string
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${bg}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </div>
      <p className={`mt-3 text-xl font-bold ${color}`}>{formatCurrency(value)}</p>
    </div>
  )
}

function GroupCard({ group }: { group: PositionGroup }) {
  const balance = group.items.reduce((s, i) => s + i.quantity * i.currentPrice, 0)
  const netYield = group.totalYield

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 transition-all hover:border-zinc-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-zinc-200">{group.label}</span>
          <span className="text-[10px] text-zinc-600">{group.items.length} ativo(s)</span>
        </div>
        <span className="text-sm font-bold text-emerald-400">{formatCurrency(balance)}</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-2">
        <div>
          <span className="text-[10px] text-zinc-600 block">Investido</span>
          <span className="text-xs text-zinc-300">{formatCurrency(group.totalInvested)}</span>
        </div>
        <div>
          <span className="text-[10px] text-zinc-600 block">Resgate</span>
          <span className="text-xs text-red-400">{formatCurrency(group.totalRedeemed)}</span>
        </div>
        <div>
          <span className="text-[10px] text-zinc-600 block">Rendimento</span>
          <span className={`text-xs ${netYield >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(netYield)}
          </span>
        </div>
      </div>

      <div className="hidden sm:grid grid-cols-5 gap-2 px-2 py-1 text-[10px] text-zinc-600 font-medium">
        <span>Ativo</span>
        <span className="text-right">Qtde</span>
        <span className="text-right">Pç. Médio</span>
        <span className="text-right">Pç. Atual</span>
        <span className="text-right">Saldo</span>
      </div>

      {group.items.map((inv) => {
        const val = inv.quantity * inv.currentPrice
        return (
          <div key={inv.id} className="grid grid-cols-5 gap-2 px-2 py-1.5 border-t border-zinc-800/50 text-xs">
            <span className="text-zinc-200 font-medium">{inv.ticker}</span>
            <span className="text-right text-zinc-400">{inv.quantity}</span>
            <span className="text-right text-zinc-400">{formatCurrency(inv.averagePrice)}</span>
            <span className="text-right text-zinc-400">{formatCurrency(inv.currentPrice)}</span>
            <span className="text-right text-emerald-400 font-medium">{formatCurrency(val)}</span>
          </div>
        )
      })}
    </div>
  )
}
