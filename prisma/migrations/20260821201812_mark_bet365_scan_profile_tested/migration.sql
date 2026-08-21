DO $$
DECLARE
  profile_id text;
BEGIN
  UPDATE "bookmaker_scan_profiles"
  SET
    "supportStatus" = 'TESTED',
    "version" = "version" + 1,
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE "bookmaker" = 'Bet365'
    AND "supportStatus" <> 'TESTED'
  RETURNING "id" INTO profile_id;

  IF FOUND THEN
    INSERT INTO "bookmaker_scan_profile_versions" (
      "id", "bookmakerScanProfileId", "version", "supportStatus", "rules", "examples", "createdAt"
    )
    SELECT
      gen_random_uuid()::text,
      p."id",
      p."version",
      p."supportStatus",
      p."rules",
      p."examples",
      CURRENT_TIMESTAMP
    FROM "bookmaker_scan_profiles" p
    WHERE p."id" = profile_id
    ON CONFLICT ("bookmakerScanProfileId", "version") DO NOTHING;
  END IF;
END $$;
