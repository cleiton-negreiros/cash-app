import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { PIX_KEY, PIX_NAME } from '../lib/constants'
import { generateTelegramLinkCode, unlinkTelegram } from '../services/telegramService'
import { User, Copy, Check, Heart, Wallet, Send, Loader2, ExternalLink, Unlink, Construction, LayoutDashboard } from 'lucide-react'

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'cashapp_bot'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const [name, setName] = useState(user?.user_metadata?.name ?? 'Visitante')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showDonate, setShowDonate] = useState(false)
  const [defaultTab, setDefaultTab] = useState(() => localStorage.getItem('cashapp:defaultTab') || 'dashboard')
  const [telegramId, setTelegramId] = useState<number | null>(null)
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null)
  const [linkCode, setLinkCode] = useState<string | null>(null)
  const [linkExpiresAt, setLinkExpiresAt] = useState<string | null>(null)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [unlinking, setUnlinking] = useState(false)

  useEffect(() => {
    if (user?.user_metadata?.name) {
      setName(user.user_metadata.name)
    }
    loadTelegramStatus()
  }, [user])

  async function loadTelegramStatus() {
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('telegram_id, telegram_username, telegram_link_code, telegram_link_code_expires_at')
      .eq('id', user.id)
      .single()

    if (data) {
      setTelegramId(data.telegram_id)
      setTelegramUsername(data.telegram_username)
      setLinkCode(data.telegram_link_code)
      setLinkExpiresAt(data.telegram_link_code_expires_at)
    }
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    await supabase.auth.updateUser({ data: { name } })
    await supabase.from('profiles').upsert({ id: user.id, name })
    setSaving(false)
  }

  async function handleGenerateCode() {
    if (!user) return
    setGeneratingCode(true)
    try {
      const { code, expiresAt } = await generateTelegramLinkCode()
      setLinkCode(code)
      setLinkExpiresAt(expiresAt)
    } catch (err) {
      console.error(err)
      alert('Erro ao gerar código. Verifique se o backend está configurado.')
    }
    setGeneratingCode(false)
  }

  async function handleUnlink() {
    if (!user) return
    if (!confirm('Desvincular o Telegram?')) return
    setUnlinking(true)
    try {
      await unlinkTelegram()
      setTelegramId(null)
      setTelegramUsername(null)
      setLinkCode(null)
    } catch (err) {
      console.error(err)
    }
    setUnlinking(false)
  }

  function handleCopyPix() {
    navigator.clipboard.writeText(PIX_KEY)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleCopyCode() {
    if (!linkCode) return
    navigator.clipboard.writeText(linkCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isLinked = !!telegramId
  const hasActiveCode = !!linkCode && linkExpiresAt && new Date(linkExpiresAt) > new Date()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt=""
              className="h-20 w-20 rounded-full"
            />
          ) : (
            <User className="h-8 w-8 text-emerald-400" />
          )}
        </div>
        <h1 className="text-center text-xl font-bold text-zinc-100">Meu Perfil</h1>
        <p className="text-center text-sm text-zinc-500">{user?.email ?? 'Modo local'}</p>
      </div>

      <div className="space-y-4">
        {user && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-400 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
              <LayoutDashboard className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">Tela Inicial</p>
              <p className="text-xs text-zinc-500">Qual aba abrir ao entrar</p>
            </div>
          </div>
          <select
            value={defaultTab}
            onChange={(e) => {
              setDefaultTab(e.target.value)
              localStorage.setItem('cashapp:defaultTab', e.target.value)
            }}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 outline-none"
          >
            <option value="dashboard">Dashboard</option>
            <option value="transactions">Transações</option>
            <option value="investments">Investimentos</option>
            <option value="position">Posição</option>
            <option value="balance">Balanço</option>
            <option value="invoice">Faturas</option>
          </select>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <Send className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-200">Telegram Bot</p>
                <p className="text-xs text-zinc-500">
                  {isLinked
                    ? `Vinculado como @${telegramUsername || telegramId}`
                    : 'Adicione transações pelo Telegram'}
                </p>
              </div>
            </div>
            {isLinked && (
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
                ATIVO
              </span>
            )}
          </div>

          {!user ? (
            <p className="mt-2 text-xs text-zinc-500">
              Faça login para vincular o Telegram.
            </p>
          ) : isLinked ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-zinc-400">
                Envie transações pelo Telegram e elas aparecem aqui automaticamente.
              </p>
              <button
                onClick={handleUnlink}
                disabled={unlinking}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-800/50 bg-red-500/5 py-2 text-xs font-medium text-red-400 transition-all hover:bg-red-500/10 disabled:opacity-50"
              >
                {unlinking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                Desvincular Telegram
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-zinc-400">
                1. Abra o bot no Telegram
                <br />
                2. Gere um código abaixo
                <br />
                3. Envie <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-emerald-400">/link CÓDIGO</code> para o bot
              </p>

              <a
                href={`https://t.me/${BOT_USERNAME}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 py-2 text-xs font-medium text-zinc-300 transition-all hover:bg-zinc-800"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir @{BOT_USERNAME}
              </a>

              {hasActiveCode ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg bg-zinc-950 px-3 py-2.5">
                    <code className="flex-1 text-base font-bold tracking-widest text-emerald-400">
                      {linkCode}
                    </code>
                    <button
                      onClick={handleCopyCode}
                      className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-600">
                    Código válido por 15 minutos. Expira às {new Date(linkExpiresAt!).toLocaleTimeString('pt-BR')}.
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleGenerateCode}
                  disabled={generatingCode}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-400 disabled:opacity-50"
                >
                  {generatingCode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {generatingCode ? 'Gerando...' : 'Gerar código de vinculação'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <button
            onClick={() => setShowDonate(!showDonate)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 py-3 text-sm font-medium text-zinc-300 transition-all hover:bg-zinc-800"
          >
            <Heart className="h-4 w-4 text-red-400" />
            Apoiar o projeto
          </button>

          {showDonate && (
            <div className="mt-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                  <Wallet className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">Pix</p>
                  <p className="text-xs text-zinc-500">{PIX_NAME}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-zinc-950 px-3 py-2.5">
                <code className="flex-1 text-sm text-zinc-300">{PIX_KEY}</code>
                <button
                  onClick={handleCopyPix}
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-3 text-xs text-zinc-600">
                Contribua com qualquer valor para ajudar a manter o CashApp gratuito!
              </p>
            </div>
          )}
        </div>

        {user && (
          <button
            onClick={signOut}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-800/50 bg-red-500/5 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10"
          >
            Sair da conta
          </button>
        )}
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 rounded-xl border border-yellow-800/50 bg-yellow-500/5 px-4 py-3">
        <Construction className="h-4 w-4 text-yellow-400" />
        <p className="text-xs font-semibold text-yellow-400">
          Versão de Teste - App em Construção
        </p>
      </div>
    </div>
  )
}
