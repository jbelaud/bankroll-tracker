DO $$
DECLARE
  profile_id text;
  profile_version integer;
  freebet_rule text := 'Sur Betclic, le petit pictogramme « F » rouge/orange affiché directement à côté du montant de mise est un signal explicite de freebet : alors freebet=true et la mise visible reste dans stake. En l''absence de ce pictogramme lisible ou du mot « Freebet », laisse freebet=false.';
BEGIN
  UPDATE "bookmaker_scan_profiles"
  SET
    "rules" = CASE
      WHEN COALESCE("rules", '') ILIKE '%pictogramme « F » rouge/orange%' THEN "rules"
      WHEN COALESCE("rules", '') = '' THEN freebet_rule
      ELSE "rules" || E'\n' || freebet_rule
    END,
    "examples" = CASE
      WHEN COALESCE("examples", '[]'::jsonb) @> '[{"freebetSignal":"F rouge/orange à côté de la mise"}]'::jsonb THEN "examples"
      ELSE COALESCE("examples", '[]'::jsonb) || '[{"ticketType":"Simple ou Combiné","freebetSignal":"F rouge/orange à côté de la mise","freebet":true,"stakeSource":"Mise visible","accounting":"mise réelle engagée = 0 ; gain éventuel = stake × (odds - 1)"}]'::jsonb
    END,
    "version" = "version" + 1,
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE "bookmaker" = 'Betclic'
  RETURNING "id", "version" INTO profile_id, profile_version;

  IF NOT FOUND THEN
    INSERT INTO "bookmaker_scan_profiles" (
      "id", "bookmaker", "supportStatus", "rules", "examples", "version", "updatedAt"
    ) VALUES (
      gen_random_uuid()::text,
      'Betclic',
      'VALIDATING',
      freebet_rule,
      '[{"ticketType":"Simple ou Combiné","freebetSignal":"F rouge/orange à côté de la mise","freebet":true}]'::jsonb,
      1,
      CURRENT_TIMESTAMP
    )
    RETURNING "id", "version" INTO profile_id, profile_version;
  END IF;

  INSERT INTO "bookmaker_scan_profile_versions" (
    "id", "bookmakerScanProfileId", "version", "supportStatus", "rules", "examples", "createdAt"
  )
  SELECT gen_random_uuid()::text, "id", "version", "supportStatus", "rules", "examples", CURRENT_TIMESTAMP
  FROM "bookmaker_scan_profiles"
  WHERE "id" = profile_id
  ON CONFLICT ("bookmakerScanProfileId", "version") DO NOTHING;
END $$;
