import { useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type { Account, Transaction } from '../types'
import { DEFAULT_ACCOUNTS } from '../types'

export function useAccounts(transactions: Transaction[], currentMonth: number, currentYear: number) {
  const [accounts, setAccounts] = useLocalStorage<Account[]>('accounts', DEFAULT_ACCOUNTS)

  const accountsWithBalance = useMemo(() => {
    const filtered = transactions.filter((t) => {
      const date = new Date(t.date + 'T12:00:00')
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })

    return accounts.map((account) => {
      const total = filtered
        .filter((t) => t.account === account.id)
        .reduce((acc, t) => {
          if (t.type === 'income') return acc + t.value
          if (t.type === 'expense' || t.type === 'investment') return acc - t.value
          return acc
        }, 0)

      return { ...account, balance: total }
    })
  }, [accounts, transactions, currentMonth, currentYear])

  return { accounts: accountsWithBalance, setAccounts }
}
