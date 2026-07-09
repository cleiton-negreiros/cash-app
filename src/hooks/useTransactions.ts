import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { Transaction } from '../types'
import { getMonth, getYear } from '../utils/format'
import * as dataService from '../services/dataService'

export function useTransactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const userId = user?.id ?? 'local'

  useEffect(() => {
    dataService.getTransactions(userId).then((data) => {
      setTransactions(data)
      setLoading(false)
    })
  }, [userId])

  const addTransaction = useCallback(async (data: Omit<Transaction, 'id'>) => {
    const saved = await dataService.saveTransaction(userId, data)
    if (saved.id !== '__duplicate__') {
      setTransactions((prev) => [saved, ...prev])
    }
    return saved
  }, [userId])

  const deleteTransaction = useCallback(async (id: string) => {
    await dataService.removeTransaction(userId, id)
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }, [userId])

  const editTransaction = useCallback(async (id: string, data: Omit<Transaction, 'id'>) => {
    await dataService.updateTransactionData(userId, id, data)
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...data, id } : t))
    )
  }, [userId])

  const getTransactionsByMonth = useCallback((month: number, year: number) => {
    return transactions.filter((t) => getMonth(t.date) === month && getYear(t.date) === year)
  }, [transactions])

  const getTotals = useCallback((month: number, year: number) => {
    const filtered = transactions.filter(
      (t) => getMonth(t.date) === month && getYear(t.date) === year
    )
    return {
      income: filtered.filter((t) => t.type === 'income').reduce((a, b) => a + b.value, 0),
      expense: filtered.filter((t) => t.type === 'expense').reduce((a, b) => a + b.value, 0),
      investment: filtered.filter((t) => t.type === 'investment').reduce((a, b) => a + b.value, 0),
      balance: filtered.reduce((acc, t) => {
        if (t.type === 'income') return acc + t.value
        if (t.type === 'expense' || t.type === 'investment') return acc - t.value
        return acc
      }, 0),
    }
  }, [transactions])

  return {
    transactions,
    loading,
    addTransaction,
    deleteTransaction,
    editTransaction,
    getTransactionsByMonth,
    getTotals,
  }
}
