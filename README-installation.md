<!-- 5️⃣ README-installation.md -->
# Ohlun'Joie V3.0

Application web de gestion d’événements pour association, front HTML/CSS/JS vanilla, backend Supabase PostgreSQL, déployée sur Vercel via GitHub.

## Prérequis
- Compte Supabase
- Compte GitHub
- Compte Vercel

## Contenu du dépôt
- supabase-schema-v3-final.sql
- index-v3-final.html
- app-v3-final.js
- style-v3-final.css
- README-installation.md

## Installation Supabase
1. Créez un projet Supabase.
2. Ouvrez l’onglet SQL Editor et exécutez le fichier supabase-schema-v3-final.sql en entier.
3. Vérifiez les tables, RLS et données d’init dans la section Table Editor.
4. Note: Les policies actuelles autorisent l’accès public (anon) pour lecture/insert nécessaires. À restreindre en production.

## Configuration du frontend
- L’app utilise le CDN Supabase v2.
- Les constantes SUPABASE_URL et SUPABASE_KEY sont déjà configurées (URL/KEY fournies).
- Aucune dépendance supplémentaire n’est requise.

## Déploiement Vercel via GitHub
1. Créez un dépôt GitHub et uploadez ces 5 fichiers à la racine.
2. Sur Vercel, “Add New Project” puis sélectionnez votre repo.
3. Paramètres:
   - Framework: Other
   - Output: fichiers statiques
   - Build command: none
   - Output directory: racine
4. Déployez. L’URL fournie doit afficher la page publique.

## Utilisation
- Section publique:
  - Trois vues switchables: Timeline, Liste, Cartes.
  - Affiche uniquement visible=true et archived=false.
  - Formulaire d’inscription avec validations (email, téléphone FR, min 1 case).
  - Analytics automatiques: page_view au chargement, event_click au clic.
- Back-office:
  - Connexion admin démo: email “zinck.maxime@gmail.com”, mot de passe “Zz/max789”.
  - Dashboard: KPIs.
  - Événements: cartes modernes, jauge, inscrits en dropdown, filtres, CRUD, toggle visible, export CSV, restauration.
  - Statistiques: vues, clics, tableau, exports emails et CSV.
  - Bénévoles: liste, recherche, historique, badge “X participations en AAAA”, export CSV.
  - Gestion Admins: tableau permissions, ajouter/modifier/supprimer.
  - Configuration: logo base64 (max 2MB), texte intro, types d’événements JSON.

## Archivage automatique
- Tâche côté navigateur s’exécute quotidiennement à 00:00:00 local pour archiver les événements passés.
- Idempotent, n’affecte pas visible.

## Tests et troubleshooting
- Si les insert échouent avec RLS, assurez-vous d’utiliser returning: 'minimal' côté client lors des insert. 
- Vérifiez que supabase-js v2 est bien chargé par le CDN et que supabase.createClient est accessible globalement.
- Téléphone FR: formats pris en charge 0X XX XX XX XX, +33 X XX XX XX XX, 0033 X XX XX XX XX.

## Sécurité (à durcir en prod)
- Remplacer les policies “to anon” admin par des policies restreintes avec Supabase Auth.
- Stocker un hash bcrypt robuste pour les admins et effectuer une vérification côté serveur (Edge/Serverless) si nécessaire.
- Limiter CORS et activer des quotas/ratelimits côté Vercel.

## Licence
MIT.
