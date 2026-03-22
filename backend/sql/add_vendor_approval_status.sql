-- Adds admin approval workflow fields for vendor onboarding.
-- Run this in Supabase SQL editor.

alter table public.vendors
  add column if not exists approval_status text not null default 'approved'
  check (approval_status in ('pending', 'approved', 'declined'));

create index if not exists vendors_approval_status_idx
  on public.vendors (approval_status);

-- Backfill: if any existing rows have null (older snapshots), mark as approved.
update public.vendors
set approval_status = 'approved'
where approval_status is null;
