# Wave 1 bêta — Kalivoa

## Cohorte et attribution

Réutiliser le lien partagé existant depuis l'administration. Ne pas créer de
système de parrainage ou d'invitation parallèle.

- campagne : `beta_wave_1`
- sources autorisées au lancement : `community_private`, `discord_kalivoa`, `direct_contact`
- lien à distribuer : ajouter les UTM au lien créé par l'administration, sans
  modifier le paramètre `invite`.

Exemple de format :

`https://kalivoa.com/fr/signup?invite=<jeton>&utm_source=community_private&utm_medium=beta_invite&utm_campaign=beta_wave_1`

Les événements `signup_started` et `signup_completed` conservent ces valeurs
dans `growth_events`. Les compteurs de l'invitation restent la référence pour
le nombre d'inscriptions issues du lien.

## Déroulé recommandé

1. Créer un lien limité à **5 inscriptions** et l'envoyer à cinq personnes de
   confiance, une seule source à la fois.
2. Attendre 48 heures, vérifier dans l'administration : inscriptions,
   bankrolls créées, ouverture Scan, résultats prêts, imports, scans vides,
   erreurs techniques et feedbacks Discord.
3. Si aucun P0 BLOCKER n'est constaté, créer un nouveau lien limité à **20
   inscriptions**. La création révoque volontairement le premier lien ; ne pas
   le réutiliser.
4. Examiner chaque jour les erreurs runtime, les retours Discord et les
   bookmakers majoritaires. Mettre Unibet/Betclic/Winamax à jour dans
   l'administration seulement à partir d'exemples et de corrections réels.

## Message prêt à envoyer

> Je te propose de tester Kalivoa, un tracker de bankroll pensé pour éviter la
> saisie manuelle : tu sélectionnes tes captures de tickets, Kalivoa Scan
> prépare les paris, puis tu vérifies avant import.
>
> Pendant ce test, peux-tu faire un premier Scan avec 1 à 3 captures réelles,
> corriger si nécessaire, puis me dire : ton bookmaker, ce qui t'a semblé
> évident ou pas, et toute erreur rencontrée ? Si aucun pari n'est détecté,
> utilise l'option volontaire de partage pour nous aider à améliorer le Scan.
>
> Lien bêta : <LIEN_WAVE_1>

Ne pas demander de long questionnaire, de données de connexion bookmaker, ni
de captures non masquées si le testeur ne souhaite pas les partager.

## Signal d'arrêt

Suspendre immédiatement l'envoi du lien s'il apparaît un blocage sur :

- inscription ;
- création ou sélection de bankroll ;
- Scan ;
- vérification/import ;
- fuite de données ou problème de sécurité.

Les problèmes gênants sans blocage sont consignés comme P0 MAJOR ou P1 selon
leur impact sur le premier Scan.
