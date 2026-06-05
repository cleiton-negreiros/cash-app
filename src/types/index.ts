export type TransactionType = 'income' | 'expense' | 'investment'

export interface Transaction {
  id: string
  date: string
  description: string
  value: number
  type: TransactionType
  category: string
  account: string
}

export interface Account {
  id: string
  name: string
  balance: number
  color: string
}

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly'

export interface RecurringTransaction {
  id: string
  description: string
  value: number
  type: TransactionType
  category: string
  account: string
  frequency: RecurringFrequency
  day: number
  nextDate: string
  active: boolean
}

export interface Budget {
  id: string
  category: string
  type: 'expense' | 'investment'
  limitAmount: number
  spent: number
  month: number
  year: number
}

export const CATEGORIES = {
  income: [
    'Salário',
    'Freela',
    'Investimentos',
    'Vendas',
    'Outros',
  ],
  expense: [
    'Alimentação',
    'Transporte',
    'Moradia',
    'Saúde',
    'Educação',
    'Lazer',
    'Assinaturas',
    'Compras',
    'Outros',
  ],
  investment: [
    'Ações',
    'FIIs',
    'Renda Fixa',
    'Cripto',
    'Tesouro Direto',
    'Outros',
  ],
}

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'sicoob', name: 'Sicoob', balance: 0, color: '#3b82f6' },
  { id: 'mercado-pago', name: 'Mercado Pago', balance: 0, color: '#00b5e2' },
  { id: 'rico', name: 'Rico', balance: 0, color: '#7c3aed' },
  { id: 'nubank', name: 'Nubank', balance: 0, color: '#8a05be' },
  { id: 'itau', name: 'Itaú', balance: 0, color: '#ec7000' },
  { id: 'caixa', name: 'Caixa', balance: 0, color: '#268744' },
  { id: 'outro', name: 'Outro', balance: 0, color: '#6b7280' },
]

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril',
  'Maio', 'Junho', 'Julho', 'Agosto',
  'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
  yearly: 'Anual',
}
