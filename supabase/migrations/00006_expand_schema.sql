-- Expand InvestmentType to match spreadsheet categories
alter table public.investments drop constraint if exists investments_type_check;
alter table public.investments add constraint investments_type_check
  check (type in (
    'stock', 'fii', 'fixed_income', 'crypto', 'treasury', 'other',
    'selic', 'cdb', 'pre_fixed', 'cdb_sl', 'ipca', 'lci',
    'dolar', 'pension', 'fgts', 'reserves', 'variable'
  ));

alter table public.investments
  add column if not exists total_invested decimal(12,2) not null default 0,
  add column if not exists total_redeemed decimal(12,2) not null default 0,
  add column if not exists total_yield decimal(12,2) not null default 0;

-- Loans table
create table if not exists public.loans (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  total_amount decimal(12,2) not null default 0,
  remaining_balance decimal(12,2) not null default 0,
  interest_rate decimal(6,2) not null default 0,
  monthly_payment decimal(12,2) not null default 0,
  start_date date not null,
  end_date date,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, user_id)
);

alter table public.loans enable row level security;

create policy "Users can manage own loans"
  on public.loans for all
  using (auth.uid() = user_id);

-- Monthly snapshots for balance sheet history
create table if not exists public.monthly_snapshots (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ref_month date not null,
  accounts_balance decimal(12,2) not null default 0,
  investments_balance decimal(12,2) not null default 0,
  loans_balance decimal(12,2) not null default 0,
  total_equity decimal(12,2) not null default 0,
  income_total decimal(12,2) not null default 0,
  expense_total decimal(12,2) not null default 0,
  loan_payment decimal(12,2) not null default 0,
  invested_total decimal(12,2) not null default 0,
  redeemed_total decimal(12,2) not null default 0,
  investment_yield decimal(12,2) not null default 0,
  cc_yield decimal(12,2) not null default 0,
  created_at timestamptz not null default now(),
  primary key (id, user_id),
  unique (user_id, ref_month)
);

alter table public.monthly_snapshots enable row level security;

create policy "Users can manage own snapshots"
  on public.monthly_snapshots for all
  using (auth.uid() = user_id);

-- Indexes
create index if not exists idx_loans_user on public.loans (user_id);
create index if not exists idx_monthly_snapshots_user on public.monthly_snapshots (user_id, ref_month desc);

-- Trigger for loans updated_at
create trigger set_loans_updated_at
  before update on public.loans
  for each row execute function public.set_updated_at();

-- Link credit cards to checking accounts
alter table public.accounts
  add column if not exists linked_account_id uuid references public.accounts(id);

-- Allow investment transactions to reference a source cash transaction
alter table public.investment_transactions
  add column if not exists source_transaction_id uuid;

-- Add income subtype to transactions
alter table public.transactions
  add column if not exists income_subtype text
    check (income_subtype in ('salary', 'freela', 'investment', 'sales', 'cc_interest', 'other'));
