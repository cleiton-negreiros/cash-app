-- Table for Telegram-generated link codes (no auth required)
create table if not exists public.telegram_pending_codes (
  code text primary key,
  telegram_id bigint not null,
  telegram_username text,
  linked boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes')
);

create index if not exists idx_telegram_pending_codes_telegram_id
  on public.telegram_pending_codes(telegram_id);
