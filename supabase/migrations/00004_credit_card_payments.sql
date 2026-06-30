-- Add credit card fields to accounts
alter table public.accounts
  add column if not exists account_type text not null default 'checking'
    check (account_type in ('checking', 'savings', 'credit_card')),
  add column if not exists credit_limit decimal(12,2) default 0,
  add column if not exists closing_day integer check (closing_day >= 1 and closing_day <= 31),
  add column if not exists due_day integer check (due_day >= 1 and due_day <= 31);

-- Add installment and payment fields to transactions
alter table public.transactions
  add column if not exists installment_current integer
    check (installment_current >= 1),
  add column if not exists installment_total integer
    check (installment_total >= 1),
  add column if not exists purchase_date date,
  add column if not exists due_date date,
  add column if not exists status text not null default 'confirmed'
    check (status in ('confirmed', 'pending', 'paid', 'overdue', 'cancelled')),
  add column if not exists parent_transaction_id uuid
    references public.transactions(id) on delete set null;

-- Statement import log table
create table if not exists public.statement_imports (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  filename text not null,
  total_rows integer not null default 0,
  imported_rows integer not null default 0,
  skipped_rows integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (id, user_id)
);

alter table public.statement_imports enable row level security;

create policy "Users can manage own imports"
  on public.statement_imports for all
  using (auth.uid() = user_id);

-- Indexes
create index if not exists idx_transactions_due_date
  on public.transactions (user_id, due_date);

create index if not exists idx_transactions_status
  on public.transactions (user_id, status);

create index if not exists idx_transactions_parent
  on public.transactions (parent_transaction_id);
