-- Improve vendor filtering performance for shops/subservices flows.
-- Safe for multiple runs and mixed column types.

create extension if not exists pg_trgm;

create index if not exists vendors_active_approval_idx on vendors(is_active, approval_status);
create index if not exists vendors_active_service_id_idx on vendors(is_active, service_id);

-- selected_service_names may be text[], jsonb, or text in different environments.
do $$
declare
  selected_service_udt text;
begin
  select udt_name
  into selected_service_udt
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'vendors'
    and column_name = 'selected_service_names';

  if selected_service_udt is null then
    return;
  end if;

  if selected_service_udt = '_text' then
    execute 'create index if not exists vendors_selected_service_names_gin_idx on vendors using gin (selected_service_names)';
  elsif selected_service_udt = 'jsonb' then
    execute 'create index if not exists vendors_selected_service_names_jsonb_gin_idx on vendors using gin (selected_service_names)';
  else
    execute 'create index if not exists vendors_selected_service_names_trgm_idx on vendors using gin (lower(coalesce(selected_service_names::text, '''')) gin_trgm_ops)';
  end if;
end $$;

-- service_ids may be text[], jsonb, or text in different environments.
do $$
declare
  service_ids_udt text;
begin
  select udt_name
  into service_ids_udt
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'vendors'
    and column_name = 'service_ids';

  if service_ids_udt is null then
    return;
  end if;

  if service_ids_udt = '_text' then
    execute 'create index if not exists vendors_service_ids_gin_idx on vendors using gin (service_ids)';
  elsif service_ids_udt = 'jsonb' then
    execute 'create index if not exists vendors_service_ids_jsonb_gin_idx on vendors using gin (service_ids)';
  else
    execute 'create index if not exists vendors_service_ids_trgm_idx on vendors using gin (lower(coalesce(service_ids::text, '''')) gin_trgm_ops)';
  end if;
end $$;
