# Kalivoa — finitions avant ouverture commerciale

## Informations du propriétaire

Le propriétaire confirme le 19 octobre : IBAN Stripe vérifié, erreur d'adresse de la convention de médiation corrigée, téléphone public autorisé. Il réfléchit encore à la fin de la bêta. L'attestation SMP est déjà reçue. Aucun autre justificatif n'est redemandé ; aucune donnée bancaire n'a été changée par l'agent.

## Prestataires vérifiés

- Google AI Studio : compte Kalivoa, seul projet visible `Kalivoa Production`, niveau Payant 1 et facturation active. La journalisation facultative du projet est `Disabled`. La production Vercel configure une clé Google et donne priorité à Gemini ; Anthropic est une option de reconfiguration, sans bascule automatique sur erreur Gemini. Aucune clé n'a été révélée ou remplacée pendant l'audit.
- [Conditions Gemini du 23 mars 2026](https://ai.google.dev/gemini-api/terms?hl=en), [accord de traitement référencé](https://business.safety.google/processorterms/) et [surveillance des abus](https://ai.google.dev/gemini-api/docs/usage-policies) consultés. Ne pas annoncer de rétention nulle. Aucun opt-in de journalisation ou de partage de jeux de données n'a été activé.
- Supabase : [DPA du 1er août 2026](https://supabase.com/legal/customer-resources/data-processing-addendum), intégré aux conditions ; production en Irlande. [Resend DPA](https://resend.com/legal/dpa) intégré à l'acceptation des conditions et [Stripe DPA](https://stripe.com/fr/legal/dpa) référencés dans la confidentialité. Aucun nouvel accord n'a été signé par l'agent.
- Téléphone de Vercel vérifié dans sa [page officielle DMCA](https://vercel.com/legal/dmca-policy) : +1 559 288 7060. Présenté comme contact juridique publié, sans le faire passer pour une assistance générale Kalivoa.

## Point fournisseur restant à décider

L'API Vercel confirme le forfait `hobby` actif pour l'équipe `ets-belaud`. Le [forfait Hobby](https://vercel.com/docs/plans/hobby) est réservé aux usages personnels non commerciaux ; le [DPA Vercel](https://vercel.com/legal/dpa) consulté vise Pro et Enterprise. Le forfait actuel ne doit donc pas être considéré comme validé pour le lancement commercial. [Pro est affiché à 20 USD par mois](https://vercel.com/pricing), hors taxes et usages supplémentaires. Aucun essai ni abonnement payant n'a été déclenché. Cette décision appartient au propriétaire.

AI Studio affiche également une demande d'informations fiscales françaises sur le profil de paiement Google. Le service est actuellement payant et approvisionné ; cette demande n'a pas été remplie ni soumise par l'agent. Les données fiscales ETS BELAUD connues peuvent servir au propriétaire pour la compléter.

## Corrections réalisées

- Les nouvelles notifications Discord ne contiennent plus les captures, commentaires ni noms saisis ; uniquement une référence de rapport et son type. L'administration conserve la notification et consulte le contenu dans Kalivoa, avec authentification. Les anciennes copies Discord éventuelles nécessitent un retrait distinct ; aucune suppression d'un message tiers n'a été effectuée.
- Le nettoyage des brouillons, mesures de parcours et demandes closes fonctionne même lorsque les ventes restent désactivées. Les alertes d'inactivité et suppressions de comptes restent derrière leurs protections antérieures.
- La suppression manuelle d'un signalement vérifie maintenant la réussite du retrait du fichier avant de supprimer sa ligne ; un échec de stockage ne doit pas faire disparaître la référence au fichier restant.
- Mentions légales complétées ; confidentialité réécrite sur les faits vérifiés et archivée sous `2026-10-19.1` ; nouvelle archive CGV `2026-10-19.2-draft`, anciennes archives conservées. Le statut préparatoire reste explicite jusqu'à régularisation de l'hébergement et décision d'ouverture.

## Sauvegarde

Le propriétaire choisit son Google Drive connecté. [Dossier privé](https://drive.google.com/drive/folders/1rS6DobPq5i_s5mJyohLkfWgXg8KcPb8G), deux archives chiffrées et un manifeste sans clé déposés et relus ; empreintes identiques. La restauration locale vérifie 40 tables applicatives (12 528 lignes) et les utilisateurs/identités Auth (92 lignes). Le stockage est vide au contrôle et son périmètre est inclus pour les prochains jeux. Les sessions actives sont volontairement exclues.

Automatisation `sauvegarde-quotidienne-kalivoa`, active tous les jours à 10 h, heure de Paris, notifications limitées aux échecs. L'ordinateur et l'application doivent être disponibles. Les copies ont 30 jours de conservation courante, puis corbeille Drive récupérable. Les plafonds et la procédure sont détaillés dans [le guide de sauvegarde](SAUVEGARDES-KALIVOA.md).

Le propriétaire doit conserver la clé maîtresse dans un support sécurisé distinct de cet ordinateur et du dossier d'archives. Elle n'a pas été envoyée dans Drive. Ce geste est nécessaire à une reprise après perte de l'ordinateur.

## Validation

- 23 tests ciblés passent dans quatre suites : verrou commercial, archives et notifications, confidentialité des notifications Discord, nettoyage pendant bêta sans envoi commercial ni suppression de compte.
- ESLint ciblé réussi sur les sept sources et tests concernés.
- Compilation Vercel et TypeScript réussies sur la version isolée. Les autres changements du dossier principal n'ont pas été déployés.
- Aucun paiement réel ni email client créé par ces travaux.

Huit contrôles HTTP réussis avant promotion, puis huit sur https://kalivoa.com. Déploiement publié : `dpl_E22fk2eksSAD7reL5Hqv5NeGsRXu`, https://bankroll-tracker-rn5ge4h6g-ets-belaud.vercel.app. Retour applicatif disponible : `dpl_EQrqVmFTCdB1JAcUpKrHtUYKUtka`. Les relevés sont dans `docs/audit-commercial/final-*-2026-10-19.json` et la capture `final-legal-public-2026-10-19.png`.

Après publication : 46 profils et 5 044 paris, aucun contrat ni facture ajouté. Quatre anciens brouillons sont éligibles au prochain nettoyage quotidien ; aucune suppression manuelle de données de production n'a été effectuée pendant la vérification. Les verrous légaux/commerciaux et la suppression automatique de comptes restent désactivés.

## Mise à jour du 20 octobre 2026

Le propriétaire confirme avoir complété les informations fiscales Google. Ce point est clos sur sa déclaration ; aucun formulaire fiscal n’a été soumis par l’agent. La certification est désormais présentée sur l’accueil, dans la navigation et dans le footer, avec une page dédiée FR/EN. Voir `CERTIFICATION-MARKETING-2026-10-20.md`.
