INSERT INTO "bookmaker_scan_profiles" ("id", "bookmaker", "supportStatus", "rules", "examples", "version", "updatedAt")
VALUES
  (
    gen_random_uuid()::text,
    'Bet365',
    'VALIDATING',
    'Reconnaître « Doubles » comme un combiné. « Returned » signifie Gagné. Ne calcule pas une cote totale depuis les jambes : si elle est absente, conserve la cote du ticket comme inconnue pour revue.',
    '[{"ticketType":"Doubles","status":"Returned","result":"Gagné","requiresReview":["totalOddsWhenNotDisplayed"]}]'::jsonb,
    1,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'Betify',
    'VALIDATING',
    'Extraire « Ticket ID » comme ticketRef lorsqu''il est visible. « OPEN » signifie En attente, même si un événement est marqué « Ended ». « Potential Win » n''est jamais un gain encaissé. Ne déduis pas live d''un pictogramme seul.',
    '[{"ticketType":"SINGLE","status":"OPEN","result":"En attente","ticketRefSource":"Ticket ID","potentialWinIsCashOut":false}]'::jsonb,
    1,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'Sportsbet',
    'VALIDATING',
    '« Multi » indique un combiné : conserver chaque jambe visible. « WINNER » et « Won » signifient Gagné. Ne complète jamais une date à partir d''un horodatage partiel ou d''un fuseau affiché.',
    '[{"ticketType":"Multi","status":"WINNER","result":"Gagné","keepsAllVisibleLegs":true}]'::jsonb,
    1,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'Stake',
    'VALIDATING',
    '« Gagné » et le paiement vert confirment Gagné. Convertir une cote décimale affichée avec virgule en nombre. Ne reconstitue jamais un intitulé tronqué par une ellipse.',
    '[{"ticketType":"Simple","status":"Gagné","decimalOddsWithComma":true,"truncatedSelection":"preserveVisibleTextOnly"}]'::jsonb,
    1,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'Unibet',
    'VALIDATING',
    '« SIMPLE » indique un pari simple et « Cote totale » est la cote. Un pictogramme vert seul ne suffit pas à confirmer le résultat : conserver En attente pour revue sans libellé explicite.',
    '[{"ticketType":"SIMPLE","oddsSource":"Cote totale","resultFromIconOnly":"En attente"}]'::jsonb,
    1,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("bookmaker") DO NOTHING;

INSERT INTO "bookmaker_scan_profile_versions" (
  "id", "bookmakerScanProfileId", "version", "supportStatus", "rules", "examples", "createdAt"
)
SELECT
  gen_random_uuid()::text, p."id", p."version", p."supportStatus", p."rules", p."examples", CURRENT_TIMESTAMP
FROM "bookmaker_scan_profiles" p
WHERE p."bookmaker" IN ('Bet365', 'Betify', 'Sportsbet', 'Stake', 'Unibet')
  AND NOT EXISTS (
    SELECT 1 FROM "bookmaker_scan_profile_versions" h
    WHERE h."bookmakerScanProfileId" = p."id" AND h."version" = p."version"
  );
