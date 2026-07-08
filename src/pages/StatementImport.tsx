import { useState, useRef } from 'react'
import type { Account } from '../types'
import { formatCurrency, formatDate } from '../utils/format'
import { parseStatement, type ParsedTransaction } from '../utils/parseStatement'
import { Upload, Check, Loader2, ArrowDownRight, TrendingUp } from 'lucide-react'

export default function StatementImport({ accounts, onImport }: { accounts: Account[]; onImport: (txs: any[]) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState<ParsedTransaction[] | null>(null)
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id || '')
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setParsed(null)
    setImported(false)

    const content = await file.text()

    try {
      console.log('File content preview:', content.slice(0, 200))
      const result = parseStatement(content, file.name)
      console.log('Parsed:', result.length, 'transactions, first:', result[0])
      setParsed(result)
      setSelectedRows(new Set(result.map((_, i) => i)))
    } catch (e) {
      console.error('Parse error:', e)
      alert('Erro ao processar arquivo. Verifique se o formato é suportado (OFX ou CSV).')
    }

    setLoading(false)
  }

  function toggleRow(index: number) {
    const next = new Set(selectedRows)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setSelectedRows(next)
  }

  function selectAll() {
    if (selectedRows.size === (parsed?.length || 0)) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(parsed?.map((_, i) => i) || []))
    }
  }

  async function handleImport() {
    if (!parsed) return
    setImporting(true)

    const selected = parsed.filter((_, i) => selectedRows.has(i))
    onImport(selected.map((t) => ({
      account: selectedAccount,
      date: t.date,
      description: t.description,
      value: t.value,
      type: t.type,
      category: 'Outros',
    })))

    setImported(true)
    setImporting(false)
    setParsed(null)
  }

  const totalSelected = parsed
    ? parsed.filter((_, i) => selectedRows.has(i)).reduce((s, t) => s + t.value, 0)
    : 0

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
            <Upload className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Importar Extrato</h2>
            <p className="text-xs text-zinc-500">OFX ou CSV de qualquer banco</p>
          </div>
        </div>

        <div className="space-y-3">
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <input
            ref={fileInputRef}
            type="file"
            accept=".ofx,.csv,.txt"
            onChange={handleFileSelected}
            className="hidden"
          />

          {!parsed && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/30 py-6 text-sm text-zinc-400 hover:border-emerald-500/50 hover:text-emerald-400 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Upload className="h-5 w-5" />
                  Clique para selecionar extrato
                </span>
              )}
            </button>
          )}

          {parsed && !imported && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>{parsed.length} transações encontradas</span>
                <button onClick={selectAll} className="text-emerald-400 hover:underline">
                  {selectedRows.size === parsed.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1">
                {parsed.map((tx, i) => (
                  <div
                    key={i}
                    onClick={() => toggleRow(i)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer text-sm transition-all ${
                      selectedRows.has(i)
                        ? 'bg-emerald-500/10 border border-emerald-500/20'
                        : 'bg-zinc-900/50 border border-transparent hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {selectedRows.has(i) ? (
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : (
                        <div className="h-4 w-4 shrink-0" />
                      )}
                      {tx.type === 'expense'
                        ? <ArrowDownRight className="h-3.5 w-3.5 text-red-400 shrink-0" />
                        : <TrendingUp className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      }
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-200 truncate">{tx.description}</p>
                        <p className="text-[10px] text-zinc-500">{formatDate(tx.date)}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold shrink-0 ml-2 ${
                      tx.type === 'expense' ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      {tx.type === 'expense' ? '-' : '+'} {formatCurrency(tx.value)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <span className="text-xs text-zinc-400">
                  {selectedRows.size} selecionadas
                </span>
                <span className="text-sm font-bold text-zinc-200">
                  Total: {formatCurrency(totalSelected)}
                </span>
              </div>

              <button
                onClick={handleImport}
                disabled={selectedRows.size === 0 || importing}
                className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-400 disabled:opacity-50"
              >
                {importing ? 'Importando...' : `Importar ${selectedRows.size} transações`}
              </button>
            </div>
          )}

          {imported && (
            <div className="flex flex-col items-center justify-center py-6 text-emerald-400">
              <Check className="h-8 w-8 mb-2" />
              <p className="text-sm font-semibold">Transações importadas com sucesso!</p>
              <button
                onClick={() => { setParsed(null); setImported(false); }}
                className="mt-3 text-xs text-zinc-500 hover:text-zinc-300"
              >
                Importar outro arquivo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
