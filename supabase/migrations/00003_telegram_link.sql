-- Add Telegram link fields to profiles
alter table public.profiles
  add column if not exists telegram_id bigint unique,
  add column if not exists telegram_username text,
  add column if not exists telegram_link_code text unique,
  add column if not exists telegram_link_code_expires_at timestamptz;

-- Index for faster lookups
create index if not exists idx_profiles_telegram_id on public.profiles(telegram_id);
create index if not exists idx_profiles_telegram_link_code on public.profiles(telegram_link_code);
