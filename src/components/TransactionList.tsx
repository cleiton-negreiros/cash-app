import { Pencil, Trash2, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react'
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
      {transactions.map((t) => (
        <div
          key={t.id}
          className="group flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 transition-all hover:border-zinc-700 hover:bg-zinc-900/60"
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                t.type === 'income'
                  ? 'bg-emerald-500/10'
                  : t.type === 'expense'
                    ? 'bg-red-500/10'
                    : 'bg-blue-500/10'
              }`}
            >
              <TypeIcon type={t.type} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">{t.description}</p>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                <span>{formatDate(t.date)}</span>
                <span>•</span>
                <span>{t.category}</span>
                <span>•</span>
                <span>{t.account}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
      ))}
    </div>
  )
}
