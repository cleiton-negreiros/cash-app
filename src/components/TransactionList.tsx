import { Pencil, Trash2, ArrowUpRight, ArrowDownRight, TrendingUp, Clock } from 'lucide-react'
import type { Transaction } from '../types'
import { formatCurrency, formatDate } from '../utils/format'

interface TransactionListProps {
  transactions: Transaction[]
  onDelete: (id: string) => void
  onEdit: (t: Transaction) => void
}

function TypeIcon({ type }: { type: Transaction['type'] }) {
  switch (type) {
    case 'income':
      return <ArrowUpRight className="h-4 w-4 text-emerald-400" />
    case 'expense':
      return <ArrowDownRight className="h-4 w-4 text-red-400" />
    case 'investment':
      return <TrendingUp className="h-4 w-4 text-blue-400" />
  }
}

function StatusBadge({ status }: { status?: string }) {
  if (!status || status === 'confirmed') return null
  const styles: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400',
    paid: 'bg-emerald-500/10 text-emerald-400',
    overdue: 'bg-red-500/10 text-red-400',
  }
  const labels: Record<string, string> = {
    pending: 'Pendente',
    paid: 'Pago',
    overdue: 'Atrasado',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[status] || ''}`}>
      {labels[status] || status}
    </span>
  )
}

function InstallmentBadge({ current, total }: { current?: number; total?: number }) {
  if (!total || total <= 1) return null
  return (
    <span className="text-[10px] text-zinc-500">
      {current}/{total}
    </span>
  )
}

export default function TransactionList({ transactions, onDelete, onEdit }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
        <p className="text-sm">Nenhuma transação encontrada</p>
        <p className="mt-1 text-xs">Adicione sua primeira transação</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {transactions.map((t) => {
        const isOverdue = t.dueDate && t.status === 'pending' && new Date(t.dueDate) < new Date()
        const isPending = t.status === 'pending' || !!t.dueDate

        return (
          <div
            key={t.id}
            className={`group flex items-center justify-between rounded-2xl border px-4 py-3 transition-all hover:border-zinc-700 hover:bg-zinc-900/60 ${
              isOverdue
                ? 'border-red-800/30 bg-red-900/10'
                : isPending
                  ? 'border-yellow-800/20 bg-yellow-900/5'
                  : 'border-zinc-800 bg-zinc-900/30'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  t.type === 'income'
                    ? 'bg-emerald-500/10'
                    : t.type === 'expense'
                      ? 'bg-red-500/10'
                      : 'bg-blue-500/10'
                }`}
              >
                <TypeIcon type={t.type} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-zinc-200 truncate">{t.description}</p>
                  <StatusBadge status={isOverdue ? 'overdue' : t.status} />
                  <InstallmentBadge current={t.installmentCurrent} total={t.installmentTotal} />
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
                  <span>{formatDate(t.date)}</span>
                  <span>•</span>
                  <span>{t.category}</span>
                  <span>•</span>
                  <span>{t.account}</span>
                  {t.dueDate && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Vence {formatDate(t.dueDate)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span
                className={`text-sm font-bold ${
                  t.type === 'income'
                    ? 'text-emerald-400'
                    : t.type === 'expense'
                      ? 'text-red-400'
                      : 'text-blue-400'
                }`}
              >
                {t.type === 'income' ? '+' : '-'} {formatCurrency(t.value)}
              </span>
              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => onEdit(t)}
                  className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(t.id)}
                  className="rounded-lg p-1.5 text-zinc-600 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
