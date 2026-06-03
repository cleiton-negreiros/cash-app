import type { Account } from '../types'
import { formatCurrency } from '../utils/format'

interface AccountCardProps {
  account: Account
}

export default function AccountCard({ account }: AccountCardProps) {
  const isPositive = account.balance >= 0

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900">
      <div className="flex items-center gap-3">
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: account.color }}
        />
        <span className="text-sm font-medium text-zinc-300">{account.name}</span>
      </div>
      <p className={`mt-3 text-lg font-bold ${isPositive ? 'text-zinc-100' : 'text-red-400'}`}>
        {formatCurrency(account.balance)}
      </p>
    </div>
  )
}
