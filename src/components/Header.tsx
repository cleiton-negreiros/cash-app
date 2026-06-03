import { Wallet, Plus, X } from 'lucide-react'

interface HeaderProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  showForm: boolean
  setShowForm: (v: boolean) => void
}

export default function Header({ activeTab, setActiveTab, showForm, setShowForm }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
            <Wallet className="h-5 w-5 text-emerald-400" />
          </div>
          <h1 className="text-lg font-bold text-zinc-100">CashApp</h1>
        </div>

        <nav className="hidden items-center gap-1 sm:flex">
          {['dashboard', 'transactions'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              {tab === 'dashboard' ? 'Dashboard' : 'Transações'}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 active:scale-95"
          >
            {showForm ? (
              <X className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{showForm ? 'Fechar' : 'Nova'}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
