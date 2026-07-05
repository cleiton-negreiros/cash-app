import { useState, useCallback } from 'react'
import { useAuth } from './contexts/AuthContext'
import { useTransactions } from './hooks/useTransactions'
import { useAccounts } from './hooks/useAccounts'
import { getBudgets } from './services/budgetService'
import type { Transaction } from './types'
import { MONTHS } from './types'
import { getCurrentMonthYear } from './utils/format'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import TransactionForm from './components/TransactionForm'
import TransactionList from './components/TransactionList'
import RecurringTransactionList from './components/RecurringTransactionList'
import BudgetManager from './components/BudgetManager'
import Toast from './components/Toast'
import type { ToastType } from './components/Toast'
import { ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react'
import ProfilePage from './pages/ProfilePage'
import InvoiceView from './pages/InvoiceView'
import StatementImport from './pages/StatementImport'
import InvestmentPortfolio from './pages/InvestmentPortfolio'
import PosicaoAtual from './pages/PosicaoAtual'
import BalancoMensal from './pages/BalancoMensal'

function AppContent() {
  const { user } = useAuth()
  const [activeTab, setActiveTabState] = useState(() => localStorage.getItem('cashapp:defaultTab') || localStorage.getItem('cashapp:tab') || 'dashboard')

  function setActiveTab(tab: string) {
    localStorage.setItem('cashapp:tab', tab)
    setActiveTabState(tab)
  }

  const [showForm, setShowForm] = useState(false)
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)
  const [currentPeriod, setCurrentPeriod] = useState(getCurrentMonthYear())
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const { transactions, loading, addTransaction, deleteTransaction, editTransaction: editTx, getTotals } = useTransactions()

  const [year, month] = currentPeriod.split('-').map(Number)
  const currentMonth = month - 1
  const currentYear = year

  const filteredTransactions = transactions.filter((t) => {
    const d = new Date(t.date + 'T12:00:00')
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })

  const totals = getTotals(currentMonth, currentYear)
  const { accounts, loading: accountsLoading, invoiceTotals } = useAccounts(transactions)

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
      setToast({ message: 'Transação atualizada com sucesso!', type: 'success' })
    } else {
      await addTransaction(data)
      setToast({ message: 'Transação adicionada com sucesso!', type: 'success' })
      if (user && (data.type === 'expense' || data.type === 'investment')) {
        try {
          const now = new Date()
          const budgets = await getBudgets(user.id, now.getMonth() + 1, now.getFullYear())
          const budget = budgets.find((b) => b.category === data.category && b.type === data.type)
          if (budget) {
            const pct = (budget.spent / budget.limitAmount) * 100
            if (pct >= 100) {
              setToast({ message: `⚠️ Orçamento de "${data.category}" excedido (${pct.toFixed(0)}%)`, type: 'warning' })
            } else if (pct >= 80) {
              setToast({ message: `⚠️ "${data.category}" está em ${pct.toFixed(0)}% do limite`, type: 'warning' })
            }
          }
        } catch {}
      }
    }
    setEditTransaction(null)
  }

  const handleCloseToast = useCallback(() => setToast(null), [])

  const [touchStart, setTouchStart] = useState(0)

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0].clientX)
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const diff = e.changedTouches[0].clientX - touchStart
    if (Math.abs(diff) > 60) {
      if (diff < 0) handleNextMonth()
      else handlePrevMonth()
    }
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
        {toast && <Toast message={toast.message} type={toast.type} onClose={handleCloseToast} />}
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
        {(activeTab === 'dashboard' || activeTab === 'transactions') && (
          <div
            className="mb-6 flex items-center justify-between"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
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
            invoiceTotals={invoiceTotals}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionList
            transactions={filteredTransactions}
            onDelete={deleteTransaction}
            onEdit={handleEdit}
          />
        )}

        {activeTab === 'invoice' && (
          <InvoiceView
            transactions={transactions}
            accounts={accounts}
            onPayInvoice={async (data) => {
              await addTransaction(data)
              setToast({ message: 'Fatura registrada como despesa!', type: 'success' })
            }}
          />
        )}

        {activeTab === 'investments' && (
          <InvestmentPortfolio />
        )}

        {activeTab === 'position' && (
          <PosicaoAtual />
        )}

        {activeTab === 'balance' && (
          <BalancoMensal />
        )}

        {activeTab === 'import' && (
          <StatementImport
            accounts={accounts}
            onImport={async (txs) => {
              for (const tx of txs) {
                await addTransaction(tx)
              }
              setToast({ message: `${txs.length} transações importadas!`, type: 'success' })
            }}
          />
        )}

        {activeTab === 'recurring' && <RecurringTransactionList />}

        {activeTab === 'budgets' && <BudgetManager />}
      </main>

      <button
        onClick={() => {
          setEditTransaction(null)
          setShowForm(true)
        }}
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/30 transition-all hover:bg-emerald-400 hover:scale-110 active:scale-95 sm:hidden"
        aria-label="Nova transação"
      >
        <Plus className="h-6 w-6" />
      </button>

      {showForm && (
        <TransactionForm
          onSubmit={handleFormSubmit}
          onClose={handleCloseForm}
          editData={editTransaction}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={handleCloseToast} />}
    </div>
  )
}

export default function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    )
  }

  return <AppContent />
}
