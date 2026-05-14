create extension if not exists pgcrypto;

create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  name text not null,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, symbol)
);

create table if not exists public.analysis_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  name text,
  signal text not null,
  score numeric not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'active',
  analysis_daily_limit integer not null default 3,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  event_type text not null,
  count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, usage_date, event_type)
);

create table if not exists public.market_cache (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.watchlist enable row level security;
alter table public.analysis_reports enable row level security;
alter table public.usage_events enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_counters enable row level security;
alter table public.market_cache enable row level security;

grant usage on schema public to anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on public.watchlist to authenticated;
grant select, insert on public.analysis_reports to authenticated;
grant select, insert on public.usage_events to authenticated;
grant select, insert, update on public.subscriptions to authenticated;
grant select, insert, update on public.usage_counters to authenticated;
grant select on public.market_cache to authenticated;
grant all on public.watchlist to service_role;
grant all on public.analysis_reports to service_role;
grant all on public.usage_events to service_role;
grant all on public.subscriptions to service_role;
grant all on public.usage_counters to service_role;
grant all on public.market_cache to service_role;

drop policy if exists "watchlist owner select" on public.watchlist;
create policy "watchlist owner select"
  on public.watchlist for select
  using (auth.uid() = user_id);

drop policy if exists "watchlist owner insert" on public.watchlist;
create policy "watchlist owner insert"
  on public.watchlist for insert
  with check (auth.uid() = user_id);

drop policy if exists "watchlist owner update" on public.watchlist;
create policy "watchlist owner update"
  on public.watchlist for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "watchlist owner delete" on public.watchlist;
create policy "watchlist owner delete"
  on public.watchlist for delete
  using (auth.uid() = user_id);

drop policy if exists "reports owner select" on public.analysis_reports;
create policy "reports owner select"
  on public.analysis_reports for select
  using (auth.uid() = user_id);

drop policy if exists "reports owner insert" on public.analysis_reports;
create policy "reports owner insert"
  on public.analysis_reports for insert
  with check (auth.uid() = user_id);

drop policy if exists "usage owner select" on public.usage_events;
create policy "usage owner select"
  on public.usage_events for select
  using (auth.uid() = user_id);

drop policy if exists "usage owner insert" on public.usage_events;
create policy "usage owner insert"
  on public.usage_events for insert
  with check (auth.uid() = user_id);

drop policy if exists "subscriptions owner select" on public.subscriptions;
create policy "subscriptions owner select"
  on public.subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "subscriptions owner insert" on public.subscriptions;
create policy "subscriptions owner insert"
  on public.subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "subscriptions owner update" on public.subscriptions;
create policy "subscriptions owner update"
  on public.subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "usage counters owner select" on public.usage_counters;
create policy "usage counters owner select"
  on public.usage_counters for select
  using (auth.uid() = user_id);

drop policy if exists "usage counters owner insert" on public.usage_counters;
create policy "usage counters owner insert"
  on public.usage_counters for insert
  with check (auth.uid() = user_id);

drop policy if exists "usage counters owner update" on public.usage_counters;
create policy "usage counters owner update"
  on public.usage_counters for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "market cache authenticated select" on public.market_cache;
create policy "market cache authenticated select"
  on public.market_cache for select
  using (auth.role() = 'authenticated');

create index if not exists watchlist_user_created_idx on public.watchlist(user_id, created_at desc);
create index if not exists reports_user_created_idx on public.analysis_reports(user_id, created_at desc);
create index if not exists usage_user_created_idx on public.usage_events(user_id, created_at desc);
create index if not exists subscriptions_user_idx on public.subscriptions(user_id);
create index if not exists usage_counters_user_date_idx on public.usage_counters(user_id, usage_date desc);
create index if not exists market_cache_expires_idx on public.market_cache(expires_at);
