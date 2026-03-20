create table if not exists public.vendor_push_subscriptions (
  auth_user_id uuid primary key,
  service_id text not null,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vendor_push_subscriptions_service_id
  on public.vendor_push_subscriptions (service_id);
