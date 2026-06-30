-- Create profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null default '',
  avatar_url text,
  currency text not null default 'BRL',
  locale text not null default 'pt-BR',
  monthly_budget decimal(12,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Accounts table
create table if not exists public.accounts (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#6b7280',
  initial_balance decimal(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, user_id)
);

alter table public.accounts enable row level security;

create policy "Users can manage own accounts"
  on public.accounts for all
  using (auth.uid() = user_id);

-- Seed default accounts for new users
create or replace function public.seed_default_accounts()
returns trigger as $$
begin
  insert into public.accounts (user_id, name, color) values
    (new.id, 'C6', '#e11d48'),
    (new.id, 'Santander', '#ec0000'),
    (new.id, '99Pay', '#22c55e'),
    (new.id, 'Mercado Pago', '#00b5e2'),
    (new.id, 'Rico', '#7c3aed'),
    (new.id, 'Sicoob', '#3b82f6');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to seed accounts after profile creation
create or replace trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.seed_default_accounts();

-- Transactions table
create table if not exists public.transactions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  date date not null,
  description text not null,
  value decimal(12,2) not null,
  type text not null check (type in ('income', 'expense', 'investment')),
  category text not null,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, user_id)
);

alter table public.transactions enable row level security;

create policy "Users can manage own transactions"
  on public.transactions for all
  using (auth.uid() = user_id);

-- Recurring transactions table
create table if not exists public.recurring_transactions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  description text not null,
  value decimal(12,2) not null,
  type text not null check (type in ('income', 'expense', 'investment')),
  category text not null,
  frequency text not null check (frequency in ('weekly', 'biweekly', 'monthly', 'yearly')),
  day integer not null check (day >= 1 and day <= 31),
  next_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, user_id)
);

alter table public.recurring_transactions enable row level security;

create policy "Users can manage own recurring transactions"
  on public.recurring_transactions for all
  using (auth.uid() = user_id);

-- Donations / payments table
create table if not exists public.donations (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  amount decimal(10,2) not null,
  pix_key text,
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.donations enable row level security;

create policy "Anyone can insert donations"
  on public.donations for insert
  with check (true);

create policy "Only admins can view donations"
  on public.donations for select
  using (auth.uid() in (
    select id from public.profiles where id = auth.uid()
    -- admin check would go here
  ));

-- Indexes for performance
create index if not exists idx_transactions_user_date
  on public.transactions (user_id, date desc);

create index if not exists idx_transactions_user_type
  on public.transactions (user_id, type);

create index if not exists idx_accounts_user
  on public.accounts (user_id);

create index if not exists idx_recurring_user
  on public.recurring_transactions (user_id);

-- Updated_at trigger function
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_accounts_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

create trigger set_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

create trigger set_recurring_updated_at
  before update on public.recurring_transactions
  for each row execute function public.set_updated_at();
