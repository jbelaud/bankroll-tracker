DO $$
DECLARE
  profile_id text;
  profile_version integer;
  profile_rules text := $rules$
Appliquer ces règles uniquement si plusieurs indices visuels concordent : en-tête noir « SIMPLE » ou « COMBINÉ (N) », libellés « Cote totale », « Mise », « Gains » ou « Remboursement », référence « Pari n°Z… » et pied « Le JJ-MM-AAAA à HHhMM ». Sans au moins trois indices concordants, ne pas détecter Unibet.
Chaque carte complète est un ticket. Dédupliquer les cartes identiques par ticketRef lorsqu'il est visible. Utiliser la date du pied du ticket, jamais la date/heure de l'événement affichée en tête.
« SIMPLE » indique un pari simple. « COMBINÉ (N) » indique un unique pari Combiné : conserver toutes les sélections visibles dans une seule description et utiliser « Cote totale », sans recalculer la cote depuis les jambes.
Sur ce format précis, pouce vert avec gains affichés confirme Gagné ; pouce rouge avec gains à 0,00 € confirme Perdu ; pictogramme gris barré avec colonne « Remboursement » confirme Remboursé. Le seul montant « Gains 0,00 € » ne suffit jamais à conclure Perdu. Ne renseigne eventResult que si le résultat réel de l'événement est lisible.
« Cotes Boostées » est une exception : uniquement lorsque ce libellé explicite et deux cotes visibles sous la forme « cote d'origine -> cote boostée » sont présents, renseigner boosted=true, originalOdds avec la cote de gauche et odds avec la cote de droite. Une promotion sans ces deux cotes reste boosted=false.
$rules$;
  profile_examples jsonb := $examples$[
  {
    "ticketType": "SIMPLE",
    "dateSource": "footer",
    "ticketRefPattern": "Pari n°Z##########",
    "oddsSource": "Cote totale",
    "statusSignal": "green_thumb + Gains",
    "result": "Gagné",
    "eventResult": null
  },
  {
    "ticketType": "COMBINÉ",
    "legs": 3,
    "oddsSource": "Cote totale",
    "statusSignal": "red_thumb + Gains 0,00 €",
    "result": "Perdu",
    "keepLegsInSingleDescription": true
  },
  {
    "ticketType": "SIMPLE",
    "oddsSource": "Cote totale",
    "statusSignal": "grey_cancelled_icon + Remboursement",
    "result": "Remboursé"
  },
  {
    "ticketType": "SIMPLE",
    "promotion": "Cotes Boostées",
    "oddsPairVisible": true,
    "boosted": true,
    "originalOddsSource": "left side of A -> B",
    "oddsSource": "right side of A -> B"
  }
]$examples$::jsonb;
BEGIN
  UPDATE "bookmaker_scan_profiles"
  SET
    "supportStatus" = 'VALIDATING',
    "rules" = profile_rules,
    "examples" = profile_examples,
    "version" = "version" + 1,
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE "bookmaker" = 'Unibet'
  RETURNING "id", "version" INTO profile_id, profile_version;

  IF NOT FOUND THEN
    INSERT INTO "bookmaker_scan_profiles" (
      "id", "bookmaker", "supportStatus", "rules", "examples", "version", "updatedAt"
    )
    VALUES (
      gen_random_uuid()::text,
      'Unibet',
      'VALIDATING',
      profile_rules,
      profile_examples,
      1,
      CURRENT_TIMESTAMP
    )
    RETURNING "id", "version" INTO profile_id, profile_version;
  END IF;

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
END $$;
