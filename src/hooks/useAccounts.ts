import { useState, useMemo, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { Account, Transaction } from '../types'
import { DEFAULT_ACCOUNTS } from '../types'
import * as dataService from '../services/dataService'
import { getInvoicePeriod } from '../utils/invoice'

export function useAccounts(transactions: Transaction[]) {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>(DEFAULT_ACCOUNTS)
  const [loading, setLoading] = useState(true)

  const userId = user?.id ?? 'local'

  useEffect(() => {
    dataService.getAccounts(userId).then(({ accounts: data }) => {
      if (data.length > 0) setAccounts(data as Account[])
      setLoading(false)
    })
  }, [userId])

  const { accountsWithBalance, invoiceTotals } = useMemo(() => {
    const invoiceTotals: Record<string, number> = {}
    const ccInvoices: Record<string, { total: number; linkedTo: string }> = {}

    const result = accounts.map((account) => {
      if (account.accountType === 'credit_card') {
        const period = getInvoicePeriod(account.closingDay, account.dueDay, new Date())
        let total = 0
        if (period) {
          total = transactions
            .filter((t) =>
              t.account === account.id &&
              t.type === 'expense' &&
              t.date >= period.start &&
              t.date < period.end
            )
            .reduce((acc, t) => acc + t.value, 0)
        }
        invoiceTotals[account.id] = total
        if (account.linkedAccountId) {
          ccInvoices[account.id] = { total, linkedTo: account.linkedAccountId }
        }
        return { ...account, balance: total }
      }

      const rawBalance = transactions
        .filter((t) => t.account === account.id)
        .reduce((acc, t) => {
          if (t.type === 'income') return acc + t.value
          if (t.type === 'expense' || t.type === 'investment') return acc - t.value
          return acc
        }, Number(account.balance || 0))

      return { ...account, balance: rawBalance }
    })

    const finalAccounts = result.map((account) => {
      if (account.accountType === 'credit_card') return account
      const linkedInvoiceTotal = Object.values(ccInvoices)
        .filter((inv) => inv.linkedTo === account.id)
        .reduce((s, inv) => s + inv.total, 0)
      return { ...account, balance: account.balance - linkedInvoiceTotal }
    })

    return { accountsWithBalance: finalAccounts, invoiceTotals }
  }, [accounts, transactions])

  return { accounts: accountsWithBalance, loading, setAccounts, invoiceTotals }
}