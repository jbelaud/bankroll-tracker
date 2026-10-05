DO $$
DECLARE
  profile_id text;
BEGIN
  UPDATE "bookmaker_scan_profiles"
  SET
    "rules" = replace(
      "rules",
      'Pour « REMPLAÇANT+ », conserver seulement la sélection de remplacement effectivement visible et ne pas réintroduire la sélection barrée.',
      'Pour « REMPLAÇANT+ », le nom barré est la sélection d''origine et le nom mis en avant est le remplaçant effectif. Ne supprime jamais la sélection d''origine : construis une description stable sous la forme « sélection d''origine → remplaçant (REMPLAÇANT+) — marché — rencontre ». Sur le ticket initial, avant qu''un remplaçant soit appliqué, utilise « sélection d''origine — marché — rencontre ». Le marché, la rencontre, la cote et la mise doivent être transcrits sans changement afin que le scan du résultat puisse être rapproché du ticket initial.'
    ) || E'\nPour les cartes réglées, le statut terminal affiché en haut à droite est prioritaire sur le pied : « Perdu » reste Perdu même si le pied indique « Gagné 0,00 € » ; « GAGNÉ » reste Gagné. Le montant vert avant « Simple » et le montant sous « Mise » représentent la même mise, jamais la cote. La cote est le nombre placé à droite de la sélection. Sur ces cartes sans référence, conserve toujours dans la description la sélection, le marché et les deux participants visibles, et place le score final uniquement dans eventResult.',
    "examples" = COALESCE("examples", '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'ticketType', 'Simple REMPLAÇANT+',
      'originalSelection', 'Jaime Peralta',
      'effectiveReplacement', 'Jhonathan Agudelo',
      'descriptionPattern', 'Jaime Peralta → Jhonathan Agudelo (REMPLAÇANT+) — Marque deux buts ou plus — Cucuta Deportivo - Deportivo Pereira',
      'statusSignal', 'Perdu en haut à droite',
      'footerSignal', 'Gagné 0,00 €',
      'result', 'Perdu'
    )),
    "version" = "version" + 1,
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE "bookmaker" = 'Bet365'
  RETURNING "id" INTO profile_id;

  IF FOUND THEN
    INSERT INTO "bookmaker_scan_profile_versions" (
      "id", "bookmakerScanProfileId", "version", "supportStatus", "rules", "examples", "createdAt"
    )
    SELECT
      gen_random_uuid()::text,
      profile."id",
      profile."version",
      profile."supportStatus",
      profile."rules",
      profile."examples",
      CURRENT_TIMESTAMP
    FROM "bookmaker_scan_profiles" AS profile
    WHERE profile."id" = profile_id
    ON CONFLICT ("bookmakerScanProfileId", "version") DO NOTHING;
  END IF;
END $$;
