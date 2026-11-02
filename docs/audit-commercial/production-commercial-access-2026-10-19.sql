-- Supabase migration: lock_down_commercial_archives_20261019
-- Server Prisma connections retain access. RLS remains enabled.
REVOKE ALL ON TABLE public.billing_contracts, public.billing_invoices,
  public.withdrawal_requests, public.transactional_emails FROM anon, authenticated;
