# Journal des modifications — Ohlun'Joie

Comparatif entre la version sur `main` (GitHub) et la version locale actuelle (branche `updates`).

---

## Ce qui a changé

### Architecture

| Avant (main) | Après (updates) |
|---|---|
| Fichier unique `app-v5.js` (2268 lignes) | 7 modules JS dans `js/` |
| Aucune fonction côté serveur | 3 fonctions serverless Vercel dans `api/` |
| Aucun en-tête de sécurité | `vercel.json` avec CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy |
| Script Supabase chargé dans `<head>` | Script Supabase déplacé en fin de `<body>`, avant les modules JS |
| Structure admin générée dynamiquement en JS | Structure admin (onglets, modules) déclarée en HTML statique dans `index.html` |

**Nouveaux modules JS :** `config.js`, `utils.js`, `auth.js`, `public.js`, `admin.js`, `data.js`, `app.js`

**Nouveaux endpoints API :**
- `POST /api/admin-users` — inviter ou supprimer des administrateurs (super_admin uniquement)
- `POST /api/send-confirmation` — email de confirmation d'inscription via Resend
- `GET /api/keep-alive` — ping Supabase quotidien via cron Vercel pour éviter la mise en veille du tier gratuit

---

### Sécurité (majeur)

| Avant | Après |
|---|---|
| Mots de passe stockés en clair dans `admins.password_hash` | Supabase Auth (JWT) — aucun mot de passe en base |
| Connexion vérifiée côté client (`admin.password_hash === pass`) | Session côté serveur via `onAuthStateChange` |
| Pas de protection XSS (`innerHTML` avec données brutes) | `escapeHtml()` appliqué sur tout contenu issu des utilisateurs |
| Politiques RLS ouvertes ou minimales | Politiques RLS granulaires basées sur les rôles |
| Aucun en-tête de sécurité | CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy déployés via Vercel |
| Pas de limite de longueur sur les champs de formulaire | `maxlength` ajouté sur tous les champs (`nom`, `email`, `message`, etc.) |

---

### Schéma de base de données

Ancien schéma : `supabase-schema-v3-final.sql`
Nouveau schéma : `supabase-schema-v4-roles.sql`

| Avant | Après |
|---|---|
| Colonne `admins.password_hash` | Supprimée — authentification gérée par Supabase Auth |
| `admins` avec 7 flags booléens de permission | Champ unique `role` : `viewer`, `editor`, `super_admin` |
| Aucun lien entre `admins` et `auth.users` | `admins.user_id` référence `auth.users(id)` |
| `inscriptions` sans champs horaires | Ajout de `heure_arrivee` et `heure_depart` |
| Seule la fonction DB `is_admin()` existait | Ajout de `is_editor()`, `is_super_admin()`, `get_admin_role()` |
| Le public ne pouvait pas lire les inscriptions | Le public peut lire les inscriptions des événements visibles (vérification des doublons) |

---

### Interface admin

| Avant | Après |
|---|---|
| Formulaire d'invitation admin avec matrice de droits par module (cases à cocher) | Formulaire simplifié avec sélection du rôle (`Lecteur`, `Éditeur`, `Super Admin`) + description des permissions |
| Champ mot de passe dans le formulaire admin | Supprimé — le mot de passe est défini par l'utilisateur via email de réinitialisation |
| Champ `modal-card-large` pour la modale admin | Remplacé par `modal-card` standard |
| En-tête de l'espace admin sans info utilisateur | Affichage du nom et du rôle de l'administrateur connecté |

---

### Fonctionnalités ajoutées

- **Mot de passe oublié / réinitialisation** — flux complet via lien email Supabase Auth
- **Invitation d'admins** — les super_admin créent des comptes depuis l'onglet Admins (sans SQL manuel)
- **Email de confirmation d'inscription** — le bénévole reçoit un email HTML formaté à l'inscription
- **Filtre par année** — événements, inscriptions et bénévoles filtrables par année
- **Badge prochain événement** — le header public affiche un compte à rebours jusqu'au prochain événement
- **KPIs Dashboard** — taux de remplissage moyen, visites totales du site, dernière visite
- **Auto-archivage** — les événements passés sont automatiquement archivés à la connexion admin
- **Cron keep-alive** — s'exécute chaque jour à 08:00 UTC pour maintenir actif le tier gratuit Supabase
- **Performance** — les inscriptions sont récupérées en une seule requête groupée plutôt qu'une par événement

---

## Comment déployer

L'application est déployée sur **Vercel** (frontend + API) connecté à **Supabase** (base de données + auth).

### 1. Pousser le code sur GitHub

```bash
git push origin updates:main
```

Vercel déploie automatiquement à chaque push sur `main`. Aucune étape de build nécessaire (JS vanilla).

### 2. Appliquer la migration de base de données

Si le schéma Supabase a changé, exécuter le nouveau schéma dans l'éditeur SQL Supabase :

1. Aller sur [supabase.com](https://supabase.com) → votre projet → **SQL Editor**
2. Exécuter `supabase-schema-v4-roles.sql`

> **Note :** En cas de migration depuis v3 (ancien schéma avec `password_hash`), c'est un changement cassant. Les comptes admin devront être recréés via Supabase Auth plutôt que migrés.

### 3. Configurer les variables d'environnement sur Vercel

Aller dans le projet Vercel → **Settings** → **Environment Variables** et vérifier que ces variables sont définies :

| Variable | Utilisée par |
|---|---|
| `SUPABASE_URL` | `api/admin-users.js`, `api/keep-alive.js` |
| `SUPABASE_SERVICE_ROLE_KEY` | `api/admin-users.js` |
| `SUPABASE_ANON_KEY` | `api/keep-alive.js` (fallback) |
| `RESEND_API_KEY` | `api/send-confirmation.js` |
| `RESEND_FROM` | `api/send-confirmation.js` (optionnel, défaut : "Ohlun'Joie <noreply@ohlunjoie.fr>") |
| `SITE_URL` | `api/admin-users.js` (redirection réinitialisation mot de passe) |
| `ALLOWED_ORIGINS` | `api/admin-users.js` (séparés par virgule, ex. `https://votredomaine.com`) |

### 4. Créer le premier super_admin

Après avoir exécuté le schéma, créer le premier admin manuellement :

1. Aller dans Supabase → **Authentication** → **Users** → **Add user**
2. Copier l'UUID de l'utilisateur
3. Exécuter dans l'éditeur SQL :

```sql
INSERT INTO admins (user_id, email, nom, prenom, role)
VALUES ('COLLER-UUID-ICI', 'votre@email.com', 'Nom', 'Prénom', 'super_admin');
```

Ensuite, tous les futurs admins peuvent être invités directement depuis l'onglet Admins de l'application.
