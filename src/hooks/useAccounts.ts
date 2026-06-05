import { useState, useMemo, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { Account, Transaction } from '../types'
import { DEFAULT_ACCOUNTS } from '../types'
import * as dataService from '../services/dataService'

export function useAccounts(transactions: Transaction[], currentMonth: number, currentYear: number) {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>(DEFAULT_ACCOUNTS)
  const [loading, setLoading] = useState(true)

  const userId = user?.id ?? 'local'

  useEffect(() => {
    dataService.getAccounts(userId).then(({ accounts: data }) => {
      if (data.length > 0) {
        setAccounts(data as Account[])
      }
      setLoading(false)
    })
  }, [userId])

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

  return { accounts: accountsWithBalance, loading, setAccounts }
}
