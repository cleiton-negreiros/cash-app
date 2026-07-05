-- Investment holdings portfolio (IF NOT EXISTS)
create table if not exists public.investments (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  name text not null default '',
  type text not null check (type in ('stock', 'fii', 'fixed_income', 'crypto', 'treasury', 'other')),
  quantity decimal(18,6) not null default 0,
  average_price decimal(12,2) not null default 0,
  current_price decimal(12,2) not null default 0,
  account_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, user_id),
  unique (user_id, ticker)
);

alter table public.investments enable row level security;

do $$ begin
  create policy "Users can manage own investments"
    on public.investments for all
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- Investment transactions table
create table if not exists public.investment_transactions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  investment_id uuid references public.investments(id) on delete set null,
  ticker text not null,
  type text not null check (type in ('buy', 'sell', 'dividend', 'interest', 'income')),
  quantity decimal(18,6) not null default 0,
  price decimal(12,2) not null default 0,
  total decimal(12,2) not null default 0,
  date date not null,
  notes text default '',
  created_at timestamptz not null default now(),
  primary key (id, user_id)
);

alter table public.investment_transactions enable row level security;

do $$ begin
  create policy "Users can manage own investment transactions"
    on public.investment_transactions for all
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

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

do $$ begin
  create policy "Users can manage own loans"
    on public.loans for all
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

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

do $$ begin
  create policy "Users can manage own snapshots"
    on public.monthly_snapshots for all
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

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

-- Indexes
create index if not exists idx_investments_user on public.investments (user_id);
create index if not exists idx_investments_ticker on public.investments (user_id, ticker);
create index if not exists idx_investment_transactions_user on public.investment_transactions (user_id, date desc);
create index if not exists idx_investment_transactions_ticker on public.investment_transactions (user_id, ticker);
create index if not exists idx_loans_user on public.loans (user_id);
create index if not exists idx_monthly_snapshots_user on public.monthly_snapshots (user_id, ref_month desc);

-- Triggers
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

create trigger if not exists set_investments_updated_at
  before update on public.investments
  for each row execute function public.set_updated_at();

create trigger if not exists set_loans_updated_at
  before update on public.loans
  for each row execute function public.set_updated_at();
