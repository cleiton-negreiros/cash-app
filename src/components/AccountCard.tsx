import type { Account } from '../types'
import { formatCurrency } from '../utils/format'

interface AccountCardProps {
  account: Account
  invoiceTotal?: number
}

export default function AccountCard({ account, invoiceTotal }: AccountCardProps) {
  const isCreditCard = account.accountType === 'credit_card'
  const available = isCreditCard && account.creditLimit
    ? account.creditLimit - (invoiceTotal ?? 0)
    : 0

  return (
    <div
      className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:border-zinc-700"
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: account.color + '20' }}
        >
          <div
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: account.color }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-200 truncate">{account.name}</p>
          <p className="text-[11px] text-zinc-500">
            {isCreditCard ? 'Cartão de Crédito' : account.accountType === 'savings' ? 'Poupança' : 'Conta Corrente'}
          </p>
        </div>
      </div>

      {isCreditCard ? (
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Fatura</span>
            <span className="font-semibold text-red-400">{formatCurrency(invoiceTotal ?? 0)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Limite</span>
            <span className="font-semibold text-zinc-300">{formatCurrency(account.creditLimit ?? 0)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Disponível</span>
            <span className={`font-semibold ${available > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(available)}
            </span>
          </div>
          {account.closingDay && account.dueDay && (
            <div className="flex justify-between text-[11px]">
              <span className="text-zinc-600">Fecha dia {account.closingDay}</span>
              <span className="text-zinc-600">Vence dia {account.dueDay}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3">
          <p className={`text-lg font-bold ${account.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(account.balance)}
          </p>
        </div>
      )}
    </div>
  )
}
