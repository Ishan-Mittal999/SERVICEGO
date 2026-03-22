-- Adds vendor profile columns required by onboarding/dashboard persistence.
-- Safe to run multiple times.

alter table if exists public.vendors
  add column if not exists owner_name text,
  add column if not exists business_address text,
  add column if not exists city text,
  add column if not exists pincode text,
  add column if not exists gst_number text,
  add column if not exists about_shop text,
  add column if not exists open_time text,
  add column if not exists close_time text,
  add column if not exists service_radius_km numeric,
  add column if not exists service_ids text[] default '{}'::text[],
  add column if not exists selected_service_names text[] default '{}'::text[],
  add column if not exists sub_services text[] default '{}'::text[],
  add column if not exists sub_service_prices jsonb default '{}'::jsonb,
  add column if not exists service_base_price numeric default 0,
  add column if not exists shop_image_urls text[] default '{}'::text[],
  add column if not exists servicemen_count integer not null default 0,
  add column if not exists servicemen_details jsonb not null default '[]'::jsonb;

-- Optional compatibility aliases for older/singular field naming in client payloads.
alter table if exists public.vendors
  add column if not exists serviceman_count integer,
  add column if not exists serviceman_details jsonb;
