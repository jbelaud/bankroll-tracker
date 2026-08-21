-- Pendant la bêta, chaque nouveau compte (email/password ou OAuth) reçoit
-- directement les limites bêta. Après la fin, les inscriptions reviennent au
-- plan FREE sans dépendre d'un lien d'invitation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, plan)
  VALUES (
    new.id,
    new.email,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.beta_program
        WHERE id = 'global' AND phase = 'ACTIVE'
      ) THEN 'BETA_TESTER'::"Plan"
      ELSE 'FREE'::"Plan"
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
