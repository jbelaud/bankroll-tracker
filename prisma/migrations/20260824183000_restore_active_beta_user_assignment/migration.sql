-- La migration referral a conservé le code de parrainage dans le trigger,
-- mais a involontairement supprimé l'attribution automatique du plan bêta.
-- Pendant la phase ACTIVE, tout nouveau compte (e-mail ou OAuth) doit garder
-- les limites bêta, indépendamment du parcours d'authentification utilisé.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, plan, "referralCode")
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
    END,
    UPPER(REPLACE(new.id::text, '-', ''))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Régularise uniquement les comptes créés depuis l'ouverture de la
-- phase bêta active. Les abonnements payants ne sont jamais modifiés.
UPDATE public.users AS u
SET plan = 'BETA_TESTER'::"Plan"
FROM public.beta_program AS program
WHERE program.id = 'global'
  AND program.phase = 'ACTIVE'
  AND u.plan = 'FREE'::"Plan"
  AND u."createdAt" >= program."updatedAt";
