# NOX — Apple Santé (préparation iOS)

Statut : **adaptateur préparé, PAS connecté à la Preview Vercel**.

## Prérequis natifs
1. Créer une cible iOS signée (Xcode / WKWebView ou Capacitor).
2. Activer **Signing & Capabilities → HealthKit**.
3. Ajouter `NSHealthShareUsageDescription` : « NOX lit tes pas quotidiens pour afficher ton activité. »
4. Inclure `NOXHealthKitSteps.swift` dans la cible et demander explicitement l'autorisation de lecture de `stepCount` au clic de l'utilisateur.
5. Implémenter un `WKScriptMessageHandler` nommé `noxHealth`, **uniquement pour l'origine NOX de confiance**. Ne jamais accepter de requêtes HealthKit de pages tierces.
6. Sur `requestSteps`, après autorisation, lire `todaySteps()`, puis transmettre uniquement `{date, count, source:"healthkit"}` à la couche web (date locale iPhone).
7. Valider avec `validateNativeSteps`, associer au compte connecté, et effectuer un **upsert** de la valeur absolue du jour (pas une addition) dans le relevé de pas. Ne jamais remplacer un relevé mesuré par une saisie manuelle sans confirmation.
8. Tester sur **iPhone physique** : autorisation accordée/refusée, changement de jour, absence de relevé, double import, reconnexion et révocation.

## Confidentialité
Lecture seule des pas. Ne pas transmettre d'échantillons HealthKit, identifiants de capteurs ou historique sans besoin explicite. Une absence de données n'est pas zéro. Une autorisation de lecture refusée ne peut pas toujours être distinguée d'une absence de données.

La simple installation du site sur l'écran d'accueil iOS ne donne **aucun** accès HealthKit.
