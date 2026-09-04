-- security_scan_lockdown granted saves columns by name. Listing clips store
-- hours, vendors, and score in detail; authenticated must read and write it.

grant select (detail) on public.saves to authenticated;
grant insert (detail) on public.saves to authenticated;
