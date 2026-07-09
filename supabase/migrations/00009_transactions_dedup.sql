-- Unique index to prevent duplicate transactions
-- Matches on: same user, account, date, description, value, and type
create unique index if not exists idx_transactions_dedup
  on public.transactions (user_id, account_id, date, description, value, type);
