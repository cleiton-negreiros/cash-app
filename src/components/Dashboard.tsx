import { TrendingUp, TrendingDown, PiggyBank, Wallet, CreditCard } from 'lucide-react'
import type { Account, Transaction } from '../types'
import { formatCurrency } from '../utils/format'
import AccountCard from './AccountCard'
import CategoryPieChart from './CategoryPieChart'
import MonthlyBarChart from './MonthlyBarChart'
import BudgetPanel from './BudgetPanel'

interface DashboardProps {
  totals: {
    income: number
    expense: number
    investment: number
    balance: number
  }
  accounts: Account[]
  transactions: Transaction[]
  currentYear: number
  currentMonthLabel: string
  currentMonth: number
  invoiceTotals?: Record<string, number>
}

export default function Dashboard({
  totals,
  accounts,
  transactions,
  currentYear,
  currentMonthLabel,
  currentMonth,
  invoiceTotals,
}: DashboardProps) {
  const totalInvoice = Object.values(invoiceTotals ?? {}).reduce((a, b) => a + b, 0)
  const totalCreditLimit = accounts
    .filter((a) => a.accountType === 'credit_card')
    .reduce((s, a) => s + (a.creditLimit ?? 0), 0)
  const totalAvailable = totalCreditLimit - totalInvoice

  const stats = [
    {
      label: 'Saldo Total',
      value: totals.balance,
      icon: Wallet,
      color: totals.balance >= 0 ? 'text-emerald-400' : 'text-red-400',
      bg: totals.balance >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
    },
    {
      label: 'Receitas',
      value: totals.income,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Despesas',
      value: totals.expense,
      icon: TrendingDown,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
    {
      label: 'Investido',
      value: totals.investment,
      icon: PiggyBank,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
  ]

  if (totalCreditLimit > 0) {
    stats.push({
      label: 'Fatura Cartão',
      value: totalInvoice,
      icon: CreditCard,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    })
  }

  return (
    <div className="space-y-6">
      <div className="mb-1">
        <h2 className="text-xl font-bold text-zinc-100">{currentMonthLabel}</h2>
        <p className="text-sm text-zinc-500">Resumo financeiro do período</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:border-zinc-700"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">{s.label}</span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
            </div>
            <p className={`mt-3 text-xl font-bold ${s.color}`}>
              {formatCurrency(s.value)}
            </p>
          </div>
        ))}
      </div>

      {totalCreditLimit > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-zinc-400">Limite total de crédito</span>
            <span className="text-zinc-300 font-semibold">{formatCurrency(totalCreditLimit)}</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-red-500 transition-all"
              style={{ width: `${totalCreditLimit > 0 ? (totalInvoice / totalCreditLimit) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1.5">
            <span className="text-red-400">Usado: {formatCurrency(totalInvoice)}</span>
            <span className="text-emerald-400">Disponível: {formatCurrency(totalAvailable)}</span>
          </div>
        </div>
      )}

      <BudgetPanel month={currentMonth} year={currentYear} />

      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-300">Contas</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              invoiceTotal={invoiceTotals?.[account.id]}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-300">Despesas por Categoria</h3>
          <CategoryPieChart transactions={transactions} type="expense" />
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-300">Receitas vs Despesas</h3>
          <CategoryPieChart transactions={transactions} type="income" />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
        <h3 className="mb-4 text-sm font-semibold text-zinc-300">Comparativo Mensal</h3>
        <MonthlyBarChart transactions={transactions} year={currentYear} />
      </div>
    </div>
  )
}
