import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type { Transaction } from '../types'
import { getMonth, getYear } from '../utils/format'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function useTransactions() {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', [])

  const addTransaction = useCallback((data: Omit<Transaction, 'id'>) => {
    const transaction: Transaction = { ...data, id: generateId() }
    setTransactions((prev) => [transaction, ...prev])
  }, [setTransactions])

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }, [setTransactions])

  const editTransaction = useCallback((id: string, data: Omit<Transaction, 'id'>) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...data, id } : t))
    )
  }, [setTransactions])

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
    setTransactions,
    addTransaction,
    deleteTransaction,
    editTransaction,
    getTransactionsByMonth,
    getTotals,
  }
}
