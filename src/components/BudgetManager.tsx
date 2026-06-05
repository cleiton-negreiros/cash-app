import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { Budget } from '../types'
import { CATEGORIES, MONTHS } from '../types'
import { formatCurrency } from '../utils/format'
import * as budgetService from '../services/budgetService'
import { Loader2, Plus, X, Trash2, Target, PiggyBank, ShoppingCart } from 'lucide-react'

export default function BudgetManager() {
  const { user } = useAuth()
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth())
  const [year, setYear] = useState(today.getFullYear())
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState<'expense' | 'investment'>('expense')
  const [category, setCategory] = useState(CATEGORIES.expense[0])
  const [limitAmount, setLimitAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const userId = user?.id ?? 'local'
  const dbMonth = month + 1

  useEffect(() => {
    loadBudgets()
  }, [userId, dbMonth, year])

  async function loadBudgets() {
    setLoading(true)
    const data = await budgetService.getBudgets(userId, dbMonth, year)
    setBudgets(data)
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!limitAmount) return
    setSaving(true)

    await budgetService.setBudget(userId, {
      category,
      type,
      limitAmount: Number(limitAmount),
      month: dbMonth,
      year,
    })

    setLimitAmount('')
    setSaving(false)
    setShowForm(false)
    await loadBudgets()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este orçamento?')) return
    await budgetService.deleteBudget(id, userId)
    await loadBudgets()
  }

  function handleTypeChange(newType: 'expense' | 'investment') {
    setType(newType)
    setCategory(CATEGORIES[newType][0])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-zinc-100">Orçamentos</h2>
          <select
            value={`${year}-${month}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map(Number)
              setYear(y)
              setMonth(m)
            }}
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-2.5 py-1.5 text-xs text-zinc-300 outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const m = (today.getMonth() + i) % 12
              const y = today.getFullYear() + Math.floor((today.getMonth() + i) / 12)
              return (
                <option key={`${y}-${m}`} value={`${y}-${m}`}>
                  {MONTHS[m]} {y}
                </option>
              )
            })}
          </select>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-400"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
        </div>
      ) : budgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
          <Target className="mb-2 h-8 w-8" />
          <p className="text-sm">Nenhum orçamento definido</p>
          <p className="mt-1 text-xs">Defina limites por categoria para controlar seus gastos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {budgets.map((budget) => {
            const pct = budget.limitAmount > 0 ? Math.min((budget.spent / budget.limitAmount) * 100, 100) : 0
            const isOver = budget.spent > budget.limitAmount
            const isNear = pct >= 80 && !isOver

            return (
              <div key={budget.id} className="group rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 transition-all hover:border-zinc-700">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {budget.type === 'expense' ? (
                      <ShoppingCart className="h-4 w-4 text-red-400" />
                    ) : (
                      <PiggyBank className="h-4 w-4 text-blue-400" />
                    )}
                    <span className="text-sm font-medium text-zinc-200">{budget.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${isOver ? 'text-red-400' : isNear ? 'text-yellow-400' : 'text-zinc-400'}`}>
                      {formatCurrency(budget.spent)} / {formatCurrency(budget.limitAmount)}
                    </span>
                    <button
                      onClick={() => handleDelete(budget.id)}
                      className="rounded-lg p-1 text-zinc-600 opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isOver ? 'bg-red-500' : isNear ? 'bg-yellow-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className={`mt-1 text-right text-[11px] ${isOver ? 'text-red-500' : 'text-zinc-600'}`}>
                  {pct.toFixed(0)}% utilizado
                </p>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl sm:rounded-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-100">Novo Orçamento</h2>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div className="flex gap-2">
                {(['expense', 'investment'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                      type === t
                        ? t === 'expense'
                          ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/30'
                          : 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30'
                        : 'bg-zinc-800/50 text-zinc-500 hover:bg-zinc-800'
                    }`}
                  >
                    {t === 'expense' ? 'Despesa' : 'Investimento'}
                  </button>
                ))}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                >
                  {CATEGORIES[type].map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Limite {MONTHS[month]} {year} (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Definir Orçamento
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
