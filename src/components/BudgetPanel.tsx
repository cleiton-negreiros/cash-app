import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { Budget } from '../types'
import { formatCurrency } from '../utils/format'
import * as budgetService from '../services/budgetService'
import { Loader2, Target } from 'lucide-react'

interface BudgetPanelProps {
  month: number
  year: number
}

export default function BudgetPanel({ month, year }: BudgetPanelProps) {
  const { user } = useAuth()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    budgetService.getBudgets(user.id, month + 1, year)
      .then((data) => {
        setBudgets(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user, month, year])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    )
  }

  if (budgets.length === 0) return null

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-300">
        <Target className="h-4 w-4" />
        Orçamentos
      </h3>
      <div className="space-y-3">
        {budgets.map((budget) => {
          const pct = budget.limitAmount > 0 ? Math.min((budget.spent / budget.limitAmount) * 100, 100) : 0
          const isOver = budget.spent > budget.limitAmount
          const isNear = pct >= 80 && !isOver

          return (
            <div key={budget.id} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-200">{budget.category}</span>
                <span className={`text-xs font-bold ${isOver ? 'text-red-400' : isNear ? 'text-yellow-400' : 'text-zinc-400'}`}>
                  {formatCurrency(budget.spent)} / {formatCurrency(budget.limitAmount)}
                </span>
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
    </div>
  )
}
