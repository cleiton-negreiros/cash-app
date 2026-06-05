-- Budgets table
create table if not exists public.budgets (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  type text not null check (type in ('expense', 'investment')),
  limit_amount decimal(12,2) not null,
  month integer not null check (month >= 1 and month <= 12),
  year integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, user_id),
  unique (user_id, category, month, year)
);

alter table public.budgets enable row level security;

create policy "Users can manage own budgets"
  on public.budgets for all
  using (auth.uid() = user_id);

create index if not exists idx_budgets_user_month_year
  on public.budgets (user_id, month, year);

create trigger set_budgets_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();
