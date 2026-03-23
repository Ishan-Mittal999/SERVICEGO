-- Performance optimization: Add missing indexes for frequently queried fields
-- This migration adds critical indexes to speed up common queries by 10-100x

-- Bookings table indexes (most frequently queried table)
create index if not exists bookings_status_idx on bookings(status);
create index if not exists bookings_user_id_idx on bookings(user_id);
create index if not exists bookings_service_id_idx on bookings(service_id);
create index if not exists bookings_vendor_id_idx on bookings(vendor_id);
create index if not exists bookings_vendor_auth_id_idx on bookings(vendor_auth_id);
create index if not exists bookings_created_at_idx on bookings(created_at DESC);

-- Composite indexes for common filter combinations
create index if not exists bookings_service_status_idx on bookings(service_id, status);
create index if not exists bookings_vendor_status_idx on bookings(vendor_id, status);
create index if not exists bookings_user_status_created_idx on bookings(user_id, status, created_at DESC);

-- Vendors table indexes
create index if not exists vendors_service_id_idx on vendors(service_id);
create index if not exists vendors_is_active_idx on vendors(is_active);
create index if not exists vendors_auth_user_id_idx on vendors(auth_user_id);

-- Push subscriptions indexes
create index if not exists vendor_push_subscriptions_service_id_idx on vendor_push_subscriptions(service_id);
create index if not exists vendor_push_subscriptions_auth_user_id_idx on vendor_push_subscriptions(auth_user_id);

-- Services table indexes
create index if not exists services_is_active_idx on services(is_active);
