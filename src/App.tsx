import { useState } from 'react'
import { useTransactions } from './hooks/useTransactions'
import { useAccounts } from './hooks/useAccounts'
import type { Transaction } from './types'
import { MONTHS } from './types'
import { getCurrentMonthYear } from './utils/format'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import TransactionForm from './components/TransactionForm'
import TransactionList from './components/TransactionList'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showForm, setShowForm] = useState(false)
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)
  const [currentPeriod, setCurrentPeriod] = useState(getCurrentMonthYear())

  const { transactions, addTransaction, deleteTransaction, editTransaction: editTx, getTotals } = useTransactions()

  const [year, month] = currentPeriod.split('-').map(Number)
  const currentMonth = month - 1
  const currentYear = year

  const filteredTransactions = transactions.filter((t) => {
    const d = new Date(t.date + 'T12:00:00')
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })

  const totals = getTotals(currentMonth, currentYear)
  const { accounts } = useAccounts(transactions, currentMonth, currentYear)

  const currentMonthLabel = `${MONTHS[currentMonth]} ${currentYear}`

  function handlePrevMonth() {
    const d = new Date(currentYear, currentMonth - 1, 1)
    setCurrentPeriod(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  function handleNextMonth() {
    const d = new Date(currentYear, currentMonth + 1, 1)
    setCurrentPeriod(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  function handleEdit(transaction: Transaction) {
    setEditTransaction(transaction)
    setShowForm(true)
  }

  function handleFormSubmit(data: Omit<Transaction, 'id'>) {
    if (editTransaction) {
      editTx(editTransaction.id, data)
    } else {
      addTransaction(data)
    }
    setEditTransaction(null)
  }

  function handleCloseForm() {
    setShowForm(false)
    setEditTransaction(null)
  }

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showForm={showForm}
        setShowForm={setShowForm}
      />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 transition-all hover:bg-zinc-700 hover:text-zinc-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-base font-bold text-zinc-100 sm:text-lg">{currentMonthLabel}</h2>
            <button
              onClick={handleNextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 transition-all hover:bg-zinc-700 hover:text-zinc-200"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {activeTab === 'transactions' && filteredTransactions.length > 0 && (
            <span className="text-xs text-zinc-600">
              {filteredTransactions.length} transação{filteredTransactions.length !== 1 ? 'ões' : ''}
            </span>
          )}
        </div>

        {activeTab === 'dashboard' && (
          <Dashboard
            totals={totals}
            accounts={accounts}
            transactions={filteredTransactions}
            currentYear={currentYear}
            currentMonthLabel={currentMonthLabel}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionList
            transactions={filteredTransactions}
            onDelete={deleteTransaction}
            onEdit={handleEdit}
          />
        )}
      </main>

      {showForm && (
        <TransactionForm
          onSubmit={handleFormSubmit}
          onClose={handleCloseForm}
          editData={editTransaction}
        />
      )}
    </div>
  )
}
