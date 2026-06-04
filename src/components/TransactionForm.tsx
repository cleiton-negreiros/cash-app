import { useState } from 'react'
import { CATEGORIES, DEFAULT_ACCOUNTS } from '../types'
import type { Transaction, TransactionType } from '../types'
import { X, Zap, ArrowRight } from 'lucide-react'
import { parseSmartInput } from '../utils/smartInput'

interface TransactionFormProps {
  onSubmit: (data: Omit<Transaction, 'id'>) => void
  onClose: () => void
  editData?: Transaction | null
}

export default function TransactionForm({ onSubmit, onClose, editData }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>(editData?.type ?? 'expense')
  const [description, setDescription] = useState(editData?.description ?? '')
  const [value, setValue] = useState(editData?.value?.toString() ?? '')
  const [category, setCategory] = useState(editData?.category ?? CATEGORIES.expense[0])
  const [account, setAccount] = useState(editData?.account ?? DEFAULT_ACCOUNTS[0].id)
  const [date, setDate] = useState(editData?.date ?? new Date().toISOString().slice(0, 10))

  const categories = CATEGORIES[type]

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description || !value) return

    onSubmit({
      date,
      description,
      value: Number(value),
      type,
      category,
      account,
    })

    if (!editData) {
      setDescription('')
      setValue('')
      setCategory(categories[0])
    }
    onClose()
  }

  function handleTypeChange(newType: TransactionType) {
    setType(newType)
    setCategory(CATEGORIES[newType][0])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl sm:rounded-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-100">
            {editData ? 'Editar' : 'Nova'} Transação
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <SmartInputSection
            onFill={(fields) => {
              if (fields.description !== undefined) setDescription(fields.description)
              if (fields.value !== undefined) setValue(fields.value.toString())
              if (fields.type !== undefined) handleTypeChange(fields.type)
              if (fields.category !== undefined) setCategory(fields.category)
              if (fields.account !== undefined) setAccount(fields.account)
              if (fields.date !== undefined) setDate(fields.date)
            }}
          />
          <div className="flex gap-2">
            {(['expense', 'income', 'investment'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                  type === t
                    ? t === 'expense'
                      ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/30'
                      : t === 'income'
                        ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
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
              placeholder="Ex: Salário, Aluguel, etc"
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
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Conta</label>
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
              >
                {DEFAULT_ACCOUNTS.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 active:scale-[0.98]"
          >
            {editData ? 'Salvar' : 'Adicionar'}
          </button>
        </form>
      </div>
    </div>
  )
}

interface SmartInputSectionProps {
  onFill: (fields: {
    description?: string
    value?: number
    type?: TransactionType
    category?: string
    account?: string
    date?: string
  }) => void
}

function SmartInputSection({ onFill }: SmartInputSectionProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  function handleParse() {
    const result = parseSmartInput(text)
    onFill({
      description: result.description || undefined,
      value: result.value ?? undefined,
      type: result.type,
      category: result.category ?? undefined,
      account: result.accountId ?? undefined,
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleParse()
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
      >
        <Zap className={`h-3.5 w-3.5 transition-colors ${open ? 'text-emerald-400' : ''}`} />
        Digitação rápida
        <span className="ml-auto text-zinc-600">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="space-y-2 border-t border-zinc-800 px-4 pb-3 pt-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Ex: mercado 50 despesa alimentação nubank'
              className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
            />
            <button
              type="button"
              onClick={handleParse}
              disabled={!text.trim()}
              className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-zinc-600 leading-relaxed">
            Digite <span className="text-zinc-500">descrição valor</span> e opcionalmente{' '}
            <span className="text-zinc-500">tipo</span>,{' '}
            <span className="text-zinc-500">categoria</span> e{' '}
            <span className="text-zinc-500">conta</span>. Ex: <em className="text-zinc-400">aluguel 1200 despesa moradia</em>
          </p>
        </div>
      )}
    </div>
  )
}
