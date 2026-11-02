-- These tables are read and written only by server-side Prisma.
-- Preserve RLS as a second boundary and remove unnecessary Data API grants.
ALTER TABLE public.bankroll_reference_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_conversion_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staking_profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.bankroll_reference_periods,
  public.personal_conversion_profiles, public.scan_drafts, public.staking_profiles FROM PUBLIC;

-- Defaults apply to the migration owner (postgres in production), not to
-- Supabase-managed owners or existing Auth/Storage objects.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC;
-- Functions inherit EXECUTE from PUBLIC globally; a schema-only revoke cannot
-- remove that implicit grant. New callable functions require an explicit grant.
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

DO $$
DECLARE api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    -- Non-Supabase development databases may not have these roles.
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.bankroll_reference_periods, public.personal_conversion_profiles, public.scan_drafts, public.staking_profiles FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM %I', api_role);
    END IF;
  END LOOP;
END
$$;
