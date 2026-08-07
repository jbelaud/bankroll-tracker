-- Business data is accessed exclusively by Prisma from the server over a
-- direct Postgres connection. Do not expose it through Supabase's Data API.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bankrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.users, public.bankrolls, public.bets, public.insights, public.scan_usages, public._prisma_migrations
  FROM anon, authenticated;

-- This SECURITY DEFINER trigger function is solely used when Supabase Auth
-- creates a profile row. It must not be callable as a public RPC endpoint.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
