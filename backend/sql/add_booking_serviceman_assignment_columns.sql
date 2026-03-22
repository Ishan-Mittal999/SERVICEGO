-- Adds serviceman assignment fields on bookings for vendor dispatch workflow.
-- Run this in Supabase SQL editor.

alter table public.bookings
  add column if not exists assigned_serviceman_id text,
  add column if not exists assigned_serviceman_name text,
  add column if not exists assigned_serviceman_phone text;

create index if not exists bookings_assigned_serviceman_id_idx
  on public.bookings (assigned_serviceman_id);
