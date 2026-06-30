import { useState, useMemo } from 'react'
import type { Transaction, Account } from '../types'
import { MONTHS } from '../types'
import { formatCurrency, formatDate } from '../utils/format'
import { CreditCard, ChevronLeft, ChevronRight, ArrowDownRight } from 'lucide-react'

interface InvoiceViewProps {
  transactions: Transaction[]
  accounts: Account[]
}

function getInvoicePeriod(account: Account, referenceDate: Date) {
  if (!account.closingDay) return null
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()
  const day = referenceDate.getDate()
  const closingDay = account.closingDay

  let startMonth: number, startYear: number, endMonth: number, endYear: number

  if (day >= closingDay) {
    startMonth = month; startYear = year
    endMonth = month + 1; endYear = year
  } else {
    startMonth = month - 1; startYear = month === 0 ? year - 1 : year
    endMonth = month; endYear = year
  }

  if (endMonth > 11) { endMonth = 0; endYear++ }
  if (startMonth < 0) { startMonth = 11; startYear-- }

  return {
    start: `${startYear}-${String(startMonth + 1).padStart(2, '0')}-${String(closingDay).padStart(2, '0')}`,
    end: `${endYear}-${String(endMonth + 1).padStart(2, '0')}-${String(closingDay).padStart(2, '0')}`,
    dueDate: account.dueDay
      ? `${endYear}-${String(endMonth + 1).padStart(2, '0')}-${String(account.dueDay).padStart(2, '0')}`
      : null,
    label: `${MONTHS[endMonth]} ${endYear}`,
  }
}

export default function InvoiceView({ transactions, accounts }: InvoiceViewProps) {
  const [selectedAccount, setSelectedAccount] = useState(
    accounts.find((a) => a.accountType === 'credit_card')?.id || ''
  )
  const [referenceDate, setReferenceDate] = useState(new Date())

  const creditCards = accounts.filter((a) => a.accountType === 'credit_card')

  const account = accounts.find((a) => a.id === selectedAccount)
  const period = account ? getInvoicePeriod(account, referenceDate) : null

  const invoiceTransactions = useMemo(() => {
    if (!period || !selectedAccount) return []
    return transactions
      .filter((t) => t.account === selectedAccount && t.date >= period.start && t.date <= period.end && t.type === 'expense')
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [transactions, selectedAccount, period])

  const total = invoiceTransactions.reduce((s, t) => s + t.value, 0)

  function handlePrev() {
    const d = new Date(referenceDate)
    d.setMonth(d.getMonth() - 1)
    setReferenceDate(d)
  }

  function handleNext() {
    const d = new Date(referenceDate)
    d.setMonth(d.getMonth() + 1)
    setReferenceDate(d)
  }

  if (creditCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
        <CreditCard className="h-12 w-12 mb-3 text-zinc-700" />
        <p className="text-sm">Nenhum cartão de crédito cadastrado</p>
        <p className="mt-1 text-xs">Adicione um cartão nas configurações de conta</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <select
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none"
        >
          {creditCards.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrev}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center">
            <h2 className="text-base font-bold text-zinc-100">{period?.label}</h2>
            {period?.dueDate && (
              <p className="text-xs text-zinc-500">
                Vencimento: {formatDate(period.dueDate)}
              </p>
            )}
          </div>
          <button
            onClick={handleNext}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 mb-4">
          <div>
            <p className="text-xs text-zinc-500">Total da Fatura</p>
            <p className="text-2xl font-bold text-red-400">{formatCurrency(total)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500">Limite: {formatCurrency(account?.creditLimit ?? 0)}</p>
            <p className="text-xs text-emerald-400">
              Disponível: {formatCurrency((account?.creditLimit ?? 0) - total)}
            </p>
          </div>
        </div>

        {invoiceTransactions.length === 0 ? (
          <div className="text-center py-8 text-zinc-600">
            <p className="text-sm">Nenhuma transação nesta fatura</p>
          </div>
        ) : (
          <div className="space-y-2">
            {invoiceTransactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-xl bg-zinc-900/30 px-4 py-2.5"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <ArrowDownRight className="h-4 w-4 text-red-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-200 truncate">{t.description}</p>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span>{formatDate(t.date)}</span>
                      <span>•</span>
                      <span>{t.category}</span>
                      {t.installmentTotal && t.installmentTotal > 1 && (
                        <>
                          <span>•</span>
                          <span className="text-zinc-400">{t.installmentCurrent}/{t.installmentTotal}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-sm font-bold text-red-400 shrink-0 ml-3">
                  {formatCurrency(t.value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
