import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { useTransactions } from './hooks/useTransactions'
import { useAccounts } from './hooks/useAccounts'
import type { Transaction } from './types'
import { MONTHS } from './types'
import { getCurrentMonthYear } from './utils/format'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import TransactionForm from './components/TransactionForm'
import TransactionList from './components/TransactionList'
import RecurringTransactionList from './components/RecurringTransactionList'
import BudgetManager from './components/BudgetManager'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true)

  return isLogin
    ? <LoginPage onToggleMode={() => setIsLogin(false)} />
    : <RegisterPage onToggleMode={() => setIsLogin(true)} />
}

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showForm, setShowForm] = useState(false)
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)
  const [currentPeriod, setCurrentPeriod] = useState(getCurrentMonthYear())

  const { transactions, loading, addTransaction, deleteTransaction, editTransaction: editTx, getTotals } = useTransactions()

  const [year, month] = currentPeriod.split('-').map(Number)
  const currentMonth = month - 1
  const currentYear = year

  const filteredTransactions = transactions.filter((t) => {
    const d = new Date(t.date + 'T12:00:00')
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })

  const totals = getTotals(currentMonth, currentYear)
  const { accounts, loading: accountsLoading } = useAccounts(transactions, currentMonth, currentYear)

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

  async function handleFormSubmit(data: Omit<Transaction, 'id'>) {
    if (editTransaction) {
      await editTx(editTransaction.id, data)
    } else {
      await addTransaction(data)
    }
    setEditTransaction(null)
  }

  function handleCloseForm() {
    setShowForm(false)
    setEditTransaction(null)
  }

  if (loading || accountsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    )
  }

  if (activeTab === 'profile') {
    return (
      <div className="min-h-screen bg-zinc-950">
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          showForm={showForm}
          setShowForm={setShowForm}
        />
        <ProfilePage />
      </div>
    )
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
        {activeTab !== 'recurring' && activeTab !== 'budgets' && (
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
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            totals={totals}
            accounts={accounts}
            transactions={filteredTransactions}
            currentYear={currentYear}
            currentMonthLabel={currentMonthLabel}
            currentMonth={currentMonth}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionList
            transactions={filteredTransactions}
            onDelete={deleteTransaction}
            onEdit={handleEdit}
          />
        )}

        {activeTab === 'recurring' && <RecurringTransactionList />}

        {activeTab === 'budgets' && <BudgetManager />}
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

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    )
  }

  if (!user) {
    return <AuthScreen />
  }

  return <AppContent />
}
