DO $$
DECLARE
  profile_id text;
  profile_version integer;
  profile_rules text := $rules$
Appliquer ces règles uniquement si au moins trois indices visuels concordent : carte sombre, en-tête vert menthe « X,XX € Simple », « Double », « Triple » ou « Pari personnalisé », boutons « Réutiliser les sélections » et/ou « Share », libellés « Super Boost », « Suivre », « Bet Crédits », « Perdu », « Gagné » ou « Cash out effectué ». Sans ces indices, ne pas détecter Bet365.
« Simple » indique un pari simple. « Double », « Doubles » et « Triple » indiquent un unique pari Combiné : conserver les sélections visibles dans une seule description, sans calculer une cote globale à partir des jambes. « Pari personnalisé » est un Mymatch seulement lorsque toutes les sélections portent sur le même événement ; s'il y a plusieurs événements, c'est un Combiné et toutes les sélections visibles doivent être conservées.
Lire les cotes avec un point décimal et les montants en euros avec une virgule décimale. Ne renseigner ni date complète ni ticketRef lorsqu'ils ne sont pas visibles. Une date sans année reste null ; ne pas dédupliquer automatiquement deux tickets sans ticketRef visible.
Un statut terminal explicite au niveau du ticket est prioritaire : « Perdu » donne Perdu même si le pied affiche « Gagné 0,00 € » ; « Gagné » donne Gagné. « Cash out effectué » donne Cashé avec le montant final affiché, même si une sélection individuelle est « Annulé ». À l'inverse, un ticket « Suivre » ou une simple offre/bouton « Cash out » reste En attente et cashOutAmount=null. Un « Annulé » ne donne Remboursé que si le ticket entier est annulé et sans statut final contraire.
« Super Boost » est une cote boostée uniquement si une paire explicite cote d'origine barrée -> cote augmentée est visible : alors boosted=true, originalOdds=ancienne cote et odds=nouvelle cote. Toute promotion sans cette paire reste boosted=false. « Bet Crédits » explicitement visible signifie freebet=true tout en conservant la mise visible ; « Gain net » ou « Gains potentiels » ne constitue pas un résultat final.
Pour « REMPLAÇANT+ », conserver seulement la sélection de remplacement effectivement visible et ne pas réintroduire la sélection barrée. Ne pas extraire un ticket coupé si son statut ou ses champs principaux ne sont pas lisibles. Conserver la règle existante : le libellé terminal explicite « Returned » signifie Gagné.
$rules$;
  profile_examples jsonb := $examples$[
  {
    "ticketType": "Pari personnalisé",
    "boosted": true,
    "originalOddsSource": "cote barrée avant la flèche",
    "oddsSource": "cote après la flèche",
    "statusSignal": "Cash out effectué",
    "result": "Cashé",
    "cashOutAmountSource": "montant final affiché"
  },
  {
    "ticketType": "Simple",
    "freebetSignal": "Bet Crédits",
    "freebet": true,
    "stakeSource": "Mise",
    "netGainSource": "Gain net",
    "result": "En attente"
  },
  {
    "ticketType": "Triple",
    "statusSignal": "Perdu au niveau du ticket",
    "result": "Perdu",
    "odds": null,
    "keepVisibleLegsInSingleDescription": true
  },
  {
    "ticketType": "Simple",
    "statusSignal": "Suivre avec une offre Cash out",
    "result": "En attente",
    "cashOutAmount": null
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
  WHERE "bookmaker" = 'Bet365'
  RETURNING "id", "version" INTO profile_id, profile_version;

  IF NOT FOUND THEN
    INSERT INTO "bookmaker_scan_profiles" (
      "id", "bookmaker", "supportStatus", "rules", "examples", "version", "updatedAt"
    )
    VALUES (
      gen_random_uuid()::text,
      'Bet365',
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
