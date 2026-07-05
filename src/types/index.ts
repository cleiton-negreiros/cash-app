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
  linkedAccountId?: string
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

export type InvestmentType =
  | 'stock' | 'fii' | 'fixed_income' | 'crypto' | 'treasury'
  | 'selic' | 'cdb' | 'pre_fixed' | 'cdb_sl' | 'ipca' | 'lci'
  | 'dolar' | 'pension' | 'fgts' | 'reserves' | 'variable' | 'other'

export type InvestmentTxType = 'buy' | 'sell' | 'dividend' | 'interest' | 'income'

export interface Investment {
  id: string
  ticker: string
  name: string
  type: InvestmentType
  quantity: number
  averagePrice: number
  currentPrice: number
  accountId: string
  totalInvested: number
  totalRedeemed: number
  totalYield: number
}

export interface InvestmentTransaction {
  id: string
  investmentId?: string
  ticker: string
  type: InvestmentTxType
  quantity: number
  price: number
  total: number
  date: string
  notes?: string
}

export interface Loan {
  id: string
  name: string
  totalAmount: number
  remainingBalance: number
  interestRate: number
  monthlyPayment: number
  startDate: string
  endDate?: string
  notes?: string
}

export interface MonthlySnapshot {
  id: string
  refMonth: number
  refYear: number
  accountsBalance: number
  investmentsBalance: number
  loansBalance: number
  totalEquity: number
  incomeTotal: number
  expenseTotal: number
  loanPayment: number
  investedTotal: number
  redeemedTotal: number
  investmentYield: number
  ccYield: number
}

export const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  stock: 'Variável',
  fii: 'FIIs',
  fixed_income: 'Renda Fixa',
  crypto: 'Criptos',
  treasury: 'Tesouro Direto',
  selic: 'SELICs',
  cdb: 'CDBs',
  pre_fixed: 'Prefixados',
  cdb_sl: 'CDB s/l',
  ipca: 'IPCAs+',
  lci: 'LCIs',
  dolar: 'Dólar',
  pension: 'Previdência',
  fgts: 'FGTS',
  reserves: 'Reservas',
  variable: 'Variável',
  other: 'Outros',
}

export const INVESTMENT_TX_LABELS: Record<InvestmentTxType, string> = {
  buy: 'Compra',
  sell: 'Venda',
  dividend: 'Dividendo',
  interest: 'Juros',
  income: 'Rendimento',
}

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
  yearly: 'Anual',
}
