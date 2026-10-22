# Socle commun et amélioration assistée des scans

## Fonctionnement

Tous les bookmakers, y compris ceux sans profil, utilisent le même socle de lecture. La référence complète du pari est conservée dans `ticketRef` pour la détection des doublons. Les règles de présentation (cartes, bandeaux horizontaux, pied et en-tête) n'exigent pas de connaître la marque. Les exceptions des profils bookmaker restent réservées aux profils TESTED et aux indices visuels qui les justifient.

Les anciennes protections métier restent en place : le résultat du ticket prime sur celui d'une sélection, une offre de cashout ne constitue pas un encaissement, une date de match ne devient pas une date de prise du pari. La simplification conserve les cas de régression connus ; aucune accélération n'est garantie sans mesure sur captures réelles.

## Utilisateur

Le partage est facultatif et décoché par défaut. Pendant la revue, l'utilisateur peut choisir « Tout est correct, j’ai vérifié », ou signaler une erreur. La capture, l'extraction et la version corrigée restent dans le stockage privé des signalements, pendant 30 jours. Une confirmation utilisateur n'approuve jamais automatiquement un exemple.

Les confirmations sont enregistrées avec le type existant OTHER et un libellé réservé explicite, pour conserver la compatibilité du schéma. Elles ne déclenchent pas la notification Discord des erreurs.

## Administration

1. Dans **Qualité des scans**, ouvrir la capture et choisir **Corriger et valider l’exemple**. Les champs sont modifiables dans un formulaire, y compris le numéro du pari et les sélections. Une correction reçue en privé peut être reportée sur un signalement existant, partagé avec consentement. On ne récupère pas rétroactivement une capture non partagée.
2. Choisir **Préparer une proposition IA**. Au plus trois exemples corrigés et approuvés servent à proposer un complément commun. Le socle reste obligatoire. La préparation ne modifie pas les règles actives.
3. Relire les consignes et les modifier au besoin. Toute modification annule leurs comparaisons précédentes.
4. Sélectionner entre deux et six captures approuvées, dont au moins une indépendante des exemples de génération ; inclure des captures déjà correctes et plusieurs présentations. **Comparer l’actuel et la proposition** relance les deux analyses sur chaque image réelle. Les écarts sont comptés par champ, avec rapprochement par référence et contrôle des sélections. Il s'agit d'une comparaison OCR, pas d'une simulation d'import ou de certification.
5. **Valider et activer cette version** n'est autorisé que si le total d'erreurs diminue et qu'aucun nouveau champ erroné n'apparaît. Le serveur revérifie les exemples, leur expiration, le modèle configuré et les règles évaluées. Un essai interrompu ne conserve pas son ancien résultat positif.
6. **Revenir au socle commun** désactive le complément. Le bouton **Rétablir le complément précédent** restaure le dernier complément validé différent de l’actuel, sans nouvel appel IA. Les versions restent dans l’historique administrateur. Une nouvelle proposition peut être préparée pendant qu'un complément déjà validé reste actif.

Les appels de préparation et de comparaison occasionnent des frais IA au compte fournisseur. Ils ne consomment pas de crédits utilisateur, ne créent pas de paris et ne déclenchent pas de récompenses.

## Stockage et versions

Aucune migration n'est nécessaire : le complément est un profil interne réservé `__kalivoa_common_scan__` dans le stockage existant des profils versionnés. Il n'apparaît pas comme un bookmaker dans l'éditeur, et les actions ordinaires de modification des profils ne peuvent pas l'activer.

`rules` contient le complément actif ; `examples` contient uniquement la proposition, les identifiants sources, les empreintes et les résultats de comparaison. Les captures et les extractions ne sont pas copiées dans l'historique des profils. Leur suppression ou expiration invalide une activation qui dépend encore d'elles. Les consignes générées doivent être relues pour exclure toute donnée personnelle d'un exemple.

La révision du complément actif est incluse dans la version du scan. Le serveur ne réutilise pas une analyse issue d'une autre révision. Une revue déjà ouverte reste consultable ; les reçus d'extension marqués avec une révision commune sont revérifiés côté serveur.

## Validation avant mise en production

Les tests automatisés utilisent des fournisseurs simulés, sans envoi de capture ni appel IA payant. Pour la recette réelle, utiliser des captures partagées avec consentement et contrôler la qualité, la durée et le coût des deux versions. Un petit échantillon sans régression ne garantit pas la justesse sur tous les tickets futurs. Ce mécanisme améliore les consignes ; il ne réentraîne pas les poids du modèle.
