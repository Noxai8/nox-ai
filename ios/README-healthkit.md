# NOX iOS — Apple Santé (HealthKit)

## État
Un projet iOS **XcodeGen** et un pont natif WKWebView → HealthKit sont maintenant dans `ios/`.
**Non compilé / non signé / non installé / non testé sur iPhone.** Safari et la PWA Vercel ne peuvent toujours pas lire Apple Santé.

## Générer et installer depuis un Mac
1. Installer Xcode et [XcodeGen](https://github.com/yonaskolb/XcodeGen) (ex. `brew install xcodegen`).
2. Choisir une URL HTTPS NOX stable, de confiance, où la branche testée est déployée. **Ne pas utiliser une URL tierce**.
3. Dans un terminal : `cd ios && NOX_WEB_URL=https://TON-DOMAINE-NOX xcodegen generate`.
4. Ouvrir `NOX.xcodeproj` avec Xcode, sélectionner l'équipe de signature (Signing & Capabilities), puis un **bundle identifier unique** si nécessaire.
5. Vérifier la capacité **HealthKit** et la description de lecture de santé dans Info.plist.
6. Installer sur un iPhone physique via Xcode. Dans NOX, créer un objectif de pas, puis toucher **Synchroniser Apple Santé** et accorder l'accès en lecture des pas.

La migration `supabase/migrations/20261009_healthkit_steps_source.sql` doit être exécutée sur le projet Supabase de test avant de synchroniser (ne pas appliquer automatiquement à la production).

## Comportement et sécurité
- Le pont n'accepte que `requestSteps`, depuis la frame principale HTTPS du domaine NOX configuré.
- Les autres domaines ne sont pas chargés dans la WebView et n'obtiennent pas de pont HealthKit.
- Le résultat est un total journalier absolu, sans GPS, historique ni échantillons individuels.
- Le site effectue un upsert par habitude/date, sans additionner des imports.
- L'absence de relevé et le refus de lecture ne deviennent **jamais** 0.
- La synchronisation est **manuelle**, pas encore automatique en arrière-plan.
- Attention : l'origine HTTPS NOX est une origine privilégiée ; elle doit être sous votre contrôle exclusif. L'authentification Supabase reste requise côté site.

## Tests obligatoires avant diffusion
- Compilation et signature Xcode ; iPhone physique ; autorisation accordée/refusée ; reconnexion.
- Relever les pas à deux reprises : ne pas additionner les totaux.
- Tester sans objectif de pas, sans donnée disponible, changement de jour et changement de fuseau.
- Vérifier que les liens externes ne peuvent jamais déclencher HealthKit.
- Tester la connexion Supabase dans WKWebView et les cookies/session.
