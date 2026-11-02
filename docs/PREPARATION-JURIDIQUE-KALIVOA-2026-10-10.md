# Préparation juridique de Kalivoa — 10 octobre 2026

## Décisions confirmées par le propriétaire

- ETS BELAUD exploite Kalivoa. L’identité publique a déjà été préparée à partir de la fiche Pappers fournie.
- Les abonnements sont proposés aux consommateurs résidant en France au lancement. Le site bilingue reste accessible ; sa traduction ne définit pas les pays de vente.
- Rétractation dans les 14 jours : remboursement intégral, même après utilisation de scans, sans déduction proportionnelle.
- Démarrage immédiat demandé expressément, sans abandon du droit de rétractation.
- Au 10 octobre, aucun médiateur n’avait été choisi. Choix de SMP le 14 octobre ; convention signée par les deux parties le 15 octobre et fournie par le propriétaire. Une erreur d’adresse est confirmée par celui-ci : demander une convention rectifiée ou un avenant, conserver le siège parisien sur le site. CGV FR/EN et nouvelle archive `2026-10-15.1-draft` préparées ; anciennes versions conservées, paiements toujours fermés. Voir `MEDIATEUR-KALIVOA-2026-10-14.md` pour les frais, la durée et les pièces encore attendues.
- Aucun téléphone à publier selon le choix du propriétaire ; l’obligation reste non résolue. Le régime de TVA est à reconfirmer.

## Travail réalisé en local

Les CGV FR/EN précisent le territoire de lancement, les exigences d’accès, les prix et quotas déjà décidés, la facturation en une fois par période, la résiliation à échéance et la distinction avec la rétractation. La politique de remboursement intégral et un formulaire de rétractation facultatif FR/EN sont ajoutés. Les garanties du service numérique et la médiation sont expliquées ; l’absence d’adhésion est affichée. Les pages gardent leur statut préparatoire.

L’écran d’abonnement recueille trois confirmations non précochées : acceptation des CGV, demande de démarrage immédiat avec maintien des 14 jours et confirmation de résidence en France. Le serveur refuse un Checkout sans ces déclarations booléennes explicites. Leur version et la langue sont enregistrées dans les métadonnées de la session et de l’abonnement Stripe. Une session ouverte dépourvue des déclarations actuelles n’est pas réutilisée. Les requêtes idempotentes restent stables.

Cette préparation n’est pas une preuve complète de conclusion du contrat : `2026-10-10-draft` est une version préparatoire. Avant lancement, publier une version applicable, archiver son contenu exact et envoyer les confirmations contractuelles sur support durable. La déclaration de résidence est un contrôle déclaratif : elle ne bloque pas techniquement toute adresse de facturation étrangère. Le contrôle de territoire à la commande reste à finaliser et à recetter avant vente.

La confidentialité distingue les captures ordinaires des signalements volontaires conservés avec consentement. Elle décrit les données, bases légales, destinataires identifiés, publication volontaire, droits et réclamation auprès de la CNIL. Elle ne promet plus que toutes les captures sont immédiatement supprimées. Les rapports comportent une échéance de 30 jours ; les copies Discord éventuelles sont distinctes de la purge du stockage. Les réglages et contrats de production ainsi que les durées non implémentées restent explicitement à vérifier.

## Informations encore attendues du propriétaire

| Information | Ce qu’il faut fournir | État |
| --- | --- | --- |
| TVA | Confirmation comptable ou SIE : franchise en base ou collecte, numéro utilisable et obligations applicables | À reconfirmer ; Stripe Tax inchangé |
| Médiateur | Après adhésion : nom, adresse postale, site et coordonnées utiles à la saisine ; convention couvrant Kalivoa | Aucun médiateur choisi |
| Téléphone professionnel | Numéro de contact à publier, éventuellement distinct du numéro personnel | Propriétaire ne souhaite actuellement aucun numéro ; obligation non résolue |
| Conservation | Décisions sur comptes inactifs, brouillons, support et mesures de parcours, après proposition de durées adaptées | À arrêter avec le propriétaire et à mettre en œuvre |

Le support `contact.kalivoa@gmail.com`, l’identité sociale, les tarifs, les règles de scans, le remboursement intégral et le marché français sont déjà connus : inutile de les redemander.

## Travaux techniques restant à terminer

1. Mettre en place la déclaration et la confirmation de rétractation en ligne, avec enregistrement durable et accusé de réception indiquant le contenu et la date/heure. Le formulaire téléchargeable **ne remplace pas** la fonctionnalité exigée depuis le 19 juin 2026. Relier la demande au traitement de la souscription et au remboursement, avec suivi des échecs et répétitions.
2. Raccorder et tester les emails de confirmation du contrat, de rétractation et de résiliation. Une facture Stripe seule ne contient pas nécessairement l’ensemble des informations contractuelles. Aucun email réel n’a été envoyé pendant cette préparation.
3. Vérifier l’email annuel de non-reconduction en production : destinataire, fenêtre légale, date limite dans un encadré et lien de résiliation. L’activation du réglage dans le bac à sable ne prouve pas sa délivrabilité en production.
4. Adapter l’encadré réglementaire de garantie légale au modèle de l’annexe D211-4 et à chacune des deux périodes proposées avant publication définitive. Les paragraphes de garantie ajoutés sont une présentation préparatoire, pas une validation de cet encadré.
5. Vérifier les contrats et régions des prestataires actifs : base de production, Supabase, Vercel, Stripe, fournisseur IA, messagerie et éventuel Discord. Fixer les garanties de transfert et la suppression des copies externes. Compléter le téléphone de l’hébergeur depuis une source contractuelle vérifiée.
6. Corriger le consentement au suivi de parcours et au stockage local non indispensable, puis définir et implémenter ses durées. L’acceptation des CGV ne remplace pas ce consentement. Le traitement existant n’est pas présenté comme automatiquement exempté.
7. Mettre en œuvre et vérifier les durées de conservation, l’effacement sur demande, les archives comptables et contractuelles, les sauvegardes et leur rotation. Les données comptables obligatoires ne doivent pas dépendre d’une suppression de profil utilisateur.
8. Recetter les contrôles du pays de vente, puis appliquer les migrations déjà préparées et publier les seuls changements approuvés. La bêta de production reste ouverte ; aucune bascule live n’a été faite.

## Sources vérifiées

- [Service Public — mentions légales d’une société](https://entreprendre.service-public.gouv.fr/vosdroits/F37351).
- [Service Public — médiation de la consommation](https://entreprendre.service-public.gouv.fr/vosdroits/F33338).
- [Service Public — droit de rétractation](https://www.service-public.gouv.fr/particuliers/vosdroits/F10485).
- [Légifrance — fonctionnalité de rétractation, D221-5](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053303365/2026-09-08).
- [Légifrance — garanties des services numériques](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006069565/LEGISCTA000044132865/).
- [Légifrance — encadré de garantie, D211-4](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045981112).
- [CNIL — mentions d’information](https://www.cnil.fr/fr/passer-laction/rgpd-exemples-de-mentions-dinformation) et [durées de conservation](https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees).

## Vérification

22 tests ciblés de paiement réussis, dont refus des déclarations absentes ou falsifiées, expiration d’anciens Checkout et maintien des requêtes idempotentes. Lint ciblé réussi ; contrôle TypeScript complet réussi hors du bac à sable Windows, qui empêchait la lecture de certaines dépendances liées et le renommage des fichiers temporaires de test.

Affichage des CGV et de la confidentialité vérifié dans le navigateur local. Offre annuelle sélectionnée : trois confirmations décochées et bouton de souscription désactivé. Aucune case d’acceptation ni aucun paiement soumis pendant ce contrôle. La phase et le profil de la base de recette isolée ont été restaurés après l’aperçu ; aucune donnée de production modifiée.

Les formulaires sont servis sous `/downloads/`, déjà exclu des redirections de langue. Le premier emplacement `/legal/` provoquait une redirection vers une page introuvable et a été corrigé. Les réponses HTTP FR/EN et le contenu sont contrôlés directement comme ressources publiques de l’application ; le téléchargement automatique dans le navigateur intégré n’a pas été validé, sa navigation vers un fichier étant bloquée par le client.

Captures : `audit-commercial/kalivoa-retractation-2026-10-10.png` et `audit-commercial/kalivoa-confirmations-abonnement-2026-10-10.png`. Aucune publication de production, adhésion à un médiateur ou modification fiscale Stripe n’a été effectuée.
