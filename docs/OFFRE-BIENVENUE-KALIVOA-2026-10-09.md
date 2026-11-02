# Offre de bienvenue Kalivoa

Page préparée : **/fr/offre-bienvenue**, également disponible en anglais.

Aperçu local : http://localhost:3013/fr/offre-bienvenue. Après publication, le lien à partager sera https://kalivoa.com/fr/offre-bienvenue.

- Bêta-testeurs : éligibilité liée au compte et conservée après la clôture de la bêta.
- Nouveaux membres : les **15 premières inscriptions hors bêta après sa clôture**, hors comptes administratifs. Les bêta-testeurs ne prennent pas ces places.
- Date limite d’activation : **31 décembre 2026 à 23 h 59, heure de Paris**.
- Mensuel : **2,99 € TTC/mois pendant 12 mois**, puis **4,99 € TTC/mois**.
- Annuel : **24,99 € TTC la première année**, puis **49,99 € TTC/an**.
- Une seule réduction par compte, appliquée automatiquement au paiement ; le lien ne donne pas une remise à quelqu’un qui n’est pas éligible.
- Une réduction activée avant la date limite garde toute sa durée promotionnelle, y compris en 2027.
- 200 scans par période de 30 jours et 300 scans permanents à la première activation payante. Les crédits permanents conservés après résiliation nécessitent un abonnement payant actif.

La page informe pendant la bêta gratuite ; les achats restent fermés jusqu’à sa clôture administrative. Il n’est pas nécessaire d’arrêter la bêta pour publier cette page informative.

La création des places est vérifiée sous transactions PostgreSQL, notamment avec 20 inscriptions simultanées. Le passage du compte au Checkout annuel confirme 24,99 € aujourd’hui puis 49,99 €/an. Le paiement n’a pas été soumis et la session fictive est fermée.

La page est prête dans les sources locales. Avant de partager le lien de production : appliquer la migration `20261009190000_welcome_offer_enrollment`, puis publier le site. La bêta de production n’a pas été clôturée pendant cette préparation.
