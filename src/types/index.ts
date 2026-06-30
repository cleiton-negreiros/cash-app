export type TransactionType = 'income' | 'expense' | 'investment'

export type AccountType = 'checking' | 'savings' | 'credit_card'

export type TransactionStatus = 'confirmed' | 'pending' | 'paid' | 'overdue' | 'cancelled'

export interface Transaction {
  id: string
  date: string
  description: string
  value: number
  type: TransactionType
  category: string
  account: string
  notes?: string
  dueDate?: string
  status?: TransactionStatus
  installmentCurrent?: number
  installmentTotal?: number
  purchaseDate?: string
  parentTransactionId?: string
}

export interface Account {
  id: string
  name: string
  balance: number
  color: string
  accountType?: AccountType
  creditLimit?: number
  closingDay?: number
  dueDay?: number
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
    'Cartão',
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
  { id: 'c6', name: 'C6', balance: 0, color: '#e11d48', accountType: 'checking' },
  { id: 'santander', name: 'Santander', balance: 0, color: '#ec0000', accountType: 'checking' },
  { id: '99pay', name: '99Pay', balance: 0, color: '#22c55e', accountType: 'checking' },
  { id: 'mercado-pago', name: 'Mercado Pago', balance: 0, color: '#00b5e2', accountType: 'checking' },
  { id: 'rico', name: 'Rico', balance: 0, color: '#7c3aed', accountType: 'checking' },
  { id: 'sicoob', name: 'Sicoob', balance: 0, color: '#3b82f6', accountType: 'checking' },
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
