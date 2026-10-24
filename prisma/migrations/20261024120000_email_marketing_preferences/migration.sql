-- No existing account is subscribed. These tables are only accessed by the server.
CREATE TABLE public.email_marketing_preferences (
  user_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  consented_email TEXT,
  consent_version TEXT NOT NULL,
  chosen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT marketing_email_required CHECK (NOT enabled OR consented_email IS NOT NULL)
);
CREATE TABLE public.email_marketing_choices (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  email TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  statement TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('fr', 'en')),
  source TEXT NOT NULL CHECK (source IN ('account', 'post_login')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX email_marketing_choices_user_created_idx ON public.email_marketing_choices(user_id, created_at);
ALTER TABLE public.email_marketing_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_marketing_choices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_marketing_preferences, public.email_marketing_choices FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.email_marketing_choices_id_seq FROM PUBLIC, anon, authenticated;
