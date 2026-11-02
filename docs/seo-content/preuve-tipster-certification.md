# Preuve à réunir pour les pages tipster et certification

**Statut au 08/10/2026 :** Jeremy a fourni une [bankroll publique réelle](https://kalivoa.com/fr/p/Gi4RdWxXhbHFOIJL?view=all), consultée le 08/10. Elle affiche « En observation » et non un niveau certifié. L'accord du propriétaire pour une citation dans l'Académie et la reprise d'une capture reste à confirmer ; les contenus restent en préparation.

## Ce que Kalivoa montre réellement

- La page publique d'une bankroll est accessible depuis **Bankrolls → ouvrir la bankroll → « Bankroll publique et certification » → « Voir la page publique »**, lorsque la publication est déjà active. Son URL suit la forme `/fr/p/<slug>` ; un profil tipster public utilise `/fr/t/<handle>`.
- L'activation de la publication démarre le suivi de certification. Un pari ancien n'est pas certifié rétroactivement du seul fait qu'il figure dans l'historique.
- Pour le niveau de preuve « Certifié » d'un pari clôturé, le code exige un ticket scanné après l'activation **avant l'événement**, puis une preuve du résultat par un **second scan**. Un résultat saisi manuellement donne un niveau de preuve inférieur.
- Le score global pondère les niveaux de preuve par les mises en unités. Dans le code déployé le 07/10 (règles 1.2), le niveau de la bankroll reste **« En observation » avant 10 paris clôturés éligibles depuis l'activation**, même si un score existe. La règle des 20 unités figure encore dans l'ancien code local non déployé et ne doit plus être citée.
- La certification mesure le **niveau de preuve des paris publiés**. Elle ne garantit ni l'impossibilité de tricher, ni le montant réellement détenu sur un compte bookmaker, ni la réussite future d'un tipster.

Sources produit : `src/lib/certification.ts`, `src/components/bankrolls/certification-panel.tsx`, `src/components/bankrolls/certification-explainer.tsx` et `src/app/[locale]/p/[slug]/page.tsx`.

## Ce que Jeremy peut fournir

**Pour la bankroll EGS Betting déjà publique, si son propriétaire accepte la publication de cet exemple :**

1. l'URL publique reçue est `/fr/p/Gi4RdWxXhbHFOIJL` ;
2. une capture de la zone « Certification Kalivoa » montrant le score et le niveau actuel, y compris « En observation » si c'est le cas ;
3. si disponible, une capture d'au moins un pari affiché « Certifié » et de son journal de preuve, sans référence de ticket ni donnée personnelle ;
4. l'accord écrit du propriétaire pour citer ou anonymiser cet exemple dans un contenu public.

Une consultation connectée affiche aussi une **conversion personnelle des unités du visiteur**. Elle ne doit pas figurer dans la capture de l'article. Ne pas publier une bankroll privée et ne pas placer ou fabriquer de paris pour produire une preuve marketing.

## Formulation éditoriale proposée

> Kalivoa affiche pour chaque pari publié un niveau de preuve lié aux captures fournies et au moment où elles ont été enregistrées. Un ticket scanné avant l'événement, puis un résultat confirmé par un second scan, reçoit le niveau le plus fort. Le score de la bankroll résume ces preuves ; il ne certifie pas l'argent détenu chez un bookmaker ni les performances futures du tipster.

Cette formulation décrit le mécanisme produit. Elle ne doit être accompagnée d'un exemple chiffré ou d'une capture publique qu'après réception et validation d'une preuve réelle.
