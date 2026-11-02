-- These models are accessed through server-side Prisma and its ownership checks.
-- They must not expose corrections or follow relationships through the Data API.
ALTER TABLE public.bet_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bankroll_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipster_follows ENABLE ROW LEVEL SECURITY;
-- Neon previews may not define Supabase's API roles.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.bet_corrections, public.bankroll_follows, public.tipster_follows FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.bet_corrections, public.bankroll_follows, public.tipster_follows FROM authenticated;
  END IF;
END
$$;
