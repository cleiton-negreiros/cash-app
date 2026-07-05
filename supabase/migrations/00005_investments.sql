-- Investment holdings portfolio
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

create unique index if not exists investments_id_unique on public.investments (id);
alter table public.investments add constraint investments_id_unique unique using index investments_id_unique;

alter table public.investments enable row level security;

create policy "Users can manage own investments"
  on public.investments for all
  using (auth.uid() = user_id);

-- Investment transactions (buys, sells, dividends, interest)
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

create policy "Users can manage own investment transactions"
  on public.investment_transactions for all
  using (auth.uid() = user_id);

-- Indexes
create index if not exists idx_investments_user
  on public.investments (user_id);

create index if not exists idx_investments_ticker
  on public.investments (user_id, ticker);

create index if not exists idx_investment_transactions_user
  on public.investment_transactions (user_id, date desc);

create index if not exists idx_investment_transactions_ticker
  on public.investment_transactions (user_id, ticker);

-- Updated_at trigger
create trigger set_investments_updated_at
  before update on public.investments
  for each row execute function public.set_updated_at();
