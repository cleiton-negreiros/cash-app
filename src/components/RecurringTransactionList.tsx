import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { RecurringTransaction, RecurringFrequency, TransactionType } from '../types'
import { CATEGORIES, DEFAULT_ACCOUNTS, FREQUENCY_LABELS } from '../types'
import { formatCurrency } from '../utils/format'
import * as recurringService from '../services/recurringService'
import { RefreshCw, Plus, X, Pencil, Trash2, Loader2, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react'

function TypeIcon({ type }: { type: TransactionType }) {
  switch (type) {
    case 'income':
      return <ArrowUpRight className="h-4 w-4 text-emerald-400" />
    case 'expense':
      return <ArrowDownRight className="h-4 w-4 text-red-400" />
    case 'investment':
      return <TrendingUp className="h-4 w-4 text-blue-400" />
  }
}

export default function RecurringTransactionList() {
  const { user } = useAuth()
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const userId = user?.id ?? 'local'

  useEffect(() => {
    loadRecurring()
  }, [userId])

  async function loadRecurring() {
    try {
      const data = await recurringService.getRecurringTransactions(userId)
      setRecurring(data)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  async function handleProcess() {
    setProcessing(true)
    try {
      const generated = await recurringService.processRecurringTransactions(userId)
      if (generated.length > 0) {
        alert(`${generated.length} transação(ões) gerada(s): ${generated.join(', ')}`)
      } else {
        alert('Nenhuma transação recorrente pendente.')
      }
      await loadRecurring()
    } catch (err) {
      console.error(err)
    }
    setProcessing(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover esta transação recorrente?')) return
    await recurringService.deleteRecurringTransaction(id, userId)
    setRecurring((prev) => prev.filter((r) => r.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-100">Transações Recorrentes</h2>
        <div className="flex gap-2">
          <button
            onClick={handleProcess}
            disabled={processing}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-400 transition-all hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${processing ? 'animate-spin' : ''}`} />
            Processar
          </button>
          <button
            onClick={() => { setEditId(null); setShowForm(true) }}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-400"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova
          </button>
        </div>
      </div>

      {recurring.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
          <p className="text-sm">Nenhuma transação recorrente</p>
          <p className="mt-1 text-xs">Crie para automatizar contas fixas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recurring.map((r) => (
            <div
              key={r.id}
              className="group flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 transition-all hover:border-zinc-700"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  r.type === 'income' ? 'bg-emerald-500/10' : r.type === 'expense' ? 'bg-red-500/10' : 'bg-blue-500/10'
                }`}>
                  <TypeIcon type={r.type} />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">{r.description}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                    <span>{r.category}</span>
                    <span>•</span>
                    <span>{FREQUENCY_LABELS[r.frequency]}</span>
                    <span>•</span>
                    <span>Dia {r.day}</span>
                    {!r.active && (
                      <>
                        <span>•</span>
                        <span className="text-yellow-500">Inativo</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold ${
                  r.type === 'income' ? 'text-emerald-400' : r.type === 'expense' ? 'text-red-400' : 'text-blue-400'
                }`}>
                  {r.type === 'income' ? '+' : '-'} {formatCurrency(r.value)}
                </span>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => { setEditId(r.id); setShowForm(true) }}
                    className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="rounded-lg p-1.5 text-zinc-600 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <RecurringForm
          userId={userId}
          editId={editId}
          existing={recurring.find((r) => r.id === editId)}
          onClose={() => { setShowForm(false); setEditId(null) }}
          onSaved={loadRecurring}
        />
      )}
    </div>
  )
}

interface RecurringFormProps {
  userId: string
  editId: string | null
  existing?: RecurringTransaction
  onClose: () => void
  onSaved: () => void
}

function RecurringForm({ userId, editId, existing, onClose, onSaved }: RecurringFormProps) {
  const [type, setType] = useState<TransactionType>(existing?.type ?? 'expense')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [value, setValue] = useState(existing?.value?.toString() ?? '')
  const [category, setCategory] = useState(existing?.category ?? CATEGORIES.expense[0])
  const [account, setAccount] = useState(existing?.account ?? DEFAULT_ACCOUNTS[0].id)
  const [frequency, setFrequency] = useState<RecurringFrequency>(existing?.frequency ?? 'monthly')
  const [day, setDay] = useState(existing?.day?.toString() ?? '1')
  const [active, setActive] = useState(existing?.active ?? true)
  const [saving, setSaving] = useState(false)

  const categories = CATEGORIES[type]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description || !value) return
    setSaving(true)

    const data = {
      description,
      value: Number(value),
      type,
      category,
      account,
      frequency,
      day: Number(day),
      nextDate: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`,
      active,
    }

    try {
      if (editId) {
        await recurringService.updateRecurringTransaction(editId, userId, data)
      } else {
        await recurringService.addRecurringTransaction(userId, data)
      }
      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl sm:rounded-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-100">
            {editId ? 'Editar' : 'Nova'} Recorrência
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            {(['expense', 'income', 'investment'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); setCategory(CATEGORIES[t][0]) }}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                  type === t
                    ? t === 'expense' ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/30'
                      : t === 'income' ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
                      : 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30'
                    : 'bg-zinc-800/50 text-zinc-500 hover:bg-zinc-800'
                }`}
              >
                {t === 'expense' ? 'Despesa' : t === 'income' ? 'Receita' : 'Investimento'}
              </button>
            ))}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Aluguel, Assinatura, etc"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Frequência</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
              >
                {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Dia</label>
              <input
                type="number"
                min="1"
                max="31"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Conta</label>
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
              >
                {DEFAULT_ACCOUNTS.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Status</label>
              <select
                value={active ? 'active' : 'inactive'}
                onChange={(e) => setActive(e.target.value === 'active')}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editId ? 'Salvar' : 'Adicionar'}
          </button>
        </form>
      </div>
    </div>
  )
}
