-- The service fee stays on a refund of the item price. It is returned only
-- when Stripe's refund covers the item and the service fee.

alter table public.orders
  add column if not exists service_fee_refunded boolean not null default false;
