# Ohlun'Joie — Guide d'installation et de déploiement

## Contenu du projet

```
/
├── index.html                      # Structure HTML principale (modales incluses)
├── style.css                       # Tous les styles (thème clair)
├── js/
│   ├── config.js                   # Connexion Supabase & client stub hors-ligne
│   ├── utils.js                    # Helpers DOM, toast, modal, validators, escapeHtml
│   ├── auth.js                     # Authentification, vérifications de rôle
│   ├── public.js                   # Rendu public, formulaires, loadSiteConfig
│   ├── admin.js                    # Back-office admin (7 onglets)
│   ├── data.js                     # Seed app_config (rarement nécessaire)
│   └── app.js                      # Point d'entrée principal
├── api/
│   ├── admin-users.js              # Serverless : inviter/supprimer des admins
│   ├── send-confirmation.js        # Serverless : email de confirmation d'inscription
│   └── keep-alive.js               # Serverless : ping Supabase quotidien (cron)
├── supabase-schema-v4-roles.sql    # Schéma actuel (rôles : viewer/editor/super_admin)
├── vercel.json                     # Configuration Vercel (en-têtes de sécurité + cron)
└── package.json                    # Dépendances Node.js (nodemailer pour les emails)
```

---

## Déploiement (4 étapes)

### Étape 1 : Appliquer le schéma Supabase

1. Aller sur [supabase.com](https://supabase.com) et ouvrir votre projet
2. Aller dans **SQL Editor** → **New query**
3. Copier le contenu de `supabase-schema-v4-roles.sql` et cliquer **Run**
4. Vérifier dans **Table Editor** que les 8 tables sont présentes :
   - `events`
   - `inscriptions`
   - `admins`
   - `volunteer_profiles`
   - `analytics`
   - `activity_logs`
   - `contact_messages`
   - `app_config`

> **Migration depuis v3 :** c'est un changement cassant. La colonne `password_hash` est supprimée. Les comptes admin doivent être recréés via Supabase Auth (voir Étape 4).

### Étape 2 : Configurer les variables d'environnement sur Vercel

Aller dans le projet Vercel → **Settings** → **Environment Variables** :

| Variable | Utilisée par | Description |
|---|---|---|
| `SUPABASE_URL` | `api/admin-users.js`, `api/keep-alive.js` | URL du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `api/admin-users.js` | Clé service role (accès admin complet) |
| `SUPABASE_ANON_KEY` | `api/keep-alive.js` | Clé publique anon (fallback) |
| `GMAIL_USER` | `api/send-confirmation.js` | Adresse Gmail d'envoi |
| `GMAIL_APP_PASSWORD` | `api/send-confirmation.js` | Mot de passe d'application Gmail |
| `GMAIL_FROM_NAME` | `api/send-confirmation.js` | Nom d'expéditeur (défaut : "Ohlun'Joie") |
| `SITE_URL` | `api/admin-users.js` | URL du site (ex. `https://ohlunjoie.vercel.app`) |
| `ALLOWED_ORIGINS` | `api/admin-users.js` | Origines autorisées séparées par virgule |

### Étape 3 : Pousser le code sur GitHub

```bash
git add .
git commit -m "Deploy v4"
git push origin main
```

Vercel détecte automatiquement le push et redéploie. Aucune étape de build requise (JS vanilla).

### Étape 4 : Créer le premier super_admin

1. Aller dans Supabase → **Authentication** → **Users** → **Add user**
2. Saisir l'email et un mot de passe temporaire
3. Copier l'UUID affiché pour cet utilisateur
4. Dans **SQL Editor**, exécuter :

```sql
INSERT INTO admins (user_id, email, nom, prenom, role)
VALUES ('COLLER-UUID-ICI', 'votre@email.com', 'Nom', 'Prénom', 'super_admin');
```

Une fois connecté, tous les futurs admins peuvent être invités directement depuis l'onglet **Admins** de l'application (aucun SQL nécessaire).

---

## Configuration locale (développement)

### Avec Supabase CLI (Docker requis)

```bash
# Démarrer Supabase en local
npx supabase start

# Services disponibles :
# Studio :  http://127.0.0.1:54323
# API :     http://127.0.0.1:54321
# Mailpit : http://127.0.0.1:54324
```

Mettre à jour `js/config.js` avec l'URL et la clé locale :

```javascript
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGc...'; // Clé anon locale affichée par supabase start
```

Puis exécuter `supabase-schema-v4-roles.sql` dans le SQL Editor de Studio.

### Mode démo (sans Supabase, sans réseau)

Le mode démo permet de travailler entièrement hors-ligne, sans projet Supabase ni variables d'environnement. Il utilise un client en mémoire à la place de Supabase.

**Activer le mode démo :**

Dans `js/config.js`, passer le flag à `true` :

```javascript
const demoMode = true;
```

**Ce que ça fait :**
- Ignore la librairie Supabase CDN même si elle est chargée
- Connecte automatiquement un compte `super_admin` au chargement de la page (aucun login requis)
- Pré-charge 3 événements exemples et une configuration d'association par défaut
- Toutes les opérations CRUD (créer, modifier, supprimer) fonctionnent en mémoire
- Les données ne sont pas persistantes : elles sont réinitialisées à chaque rechargement de page

**Lancer localement :**

Il est possible d'ouvrir `index.html` directement dans le navigateur (double-clic ou `Fichier > Ouvrir`) sans aucun serveur. Ou via un serveur HTTP local :

```bash
python3 -m http.server 8000
# Ouvrir http://localhost:8000
```

> **Important :** Remettre `demoMode = false` avant de pousser sur `main`. En mode démo, personne ne peut se connecter avec un vrai compte — l'application ignore complètement Supabase Auth.

**Mode stub automatique (sans flag) :** Si `demoMode` est `false` mais que le CDN Supabase ne charge pas (coupure réseau, etc.), le client stub s'active aussi automatiquement. La console affiche alors : `Supabase library not found, using stub client.` Dans ce cas, la connexion auto en super_admin ne se déclenche pas — la page publique s'affiche normalement.

---

## Fonctionnalités

### Section publique

- **3 vues switchables** : Timeline, Liste, Cartes
- Affichage uniquement des événements `visible=true` et `archived=false`
- Badge "Prochain événement dans X jours" dans le header
- Formulaire d'inscription avec validation email et téléphone FR
- Email de confirmation envoyé au bénévole à l'inscription
- Formulaire de contact
- Suivi analytique automatique (page_view par session)

### Back-office admin (7 onglets)

| Onglet | Rôle minimum | Contenu |
|---|---|---|
| Dashboard | viewer | 6 KPIs : inscrits, événements actifs, emails uniques, taux moyen, visites, dernière visite |
| Événements | viewer | CRUD événements, filtre par année, auto-archivage des événements passés |
| Inscriptions | viewer | Liste complète avec recherche, tri, filtre et export CSV |
| Bénévoles | viewer | Profils agrégés, historique de participations, export CSV |
| Messages | viewer | Boîte de réception des messages de contact (marquer lu / supprimer) |
| Admins | super_admin | Inviter et gérer les comptes admin |
| Association | super_admin | Éditeur de configuration du site (nom, logo, intro, types d'événements) |

### Rôles

| Rôle | Accès |
|---|---|
| `viewer` | Consultation de tous les onglets sauf Admins et Association |
| `editor` | Modification de tous les onglets sauf Admins et Association |
| `super_admin` | Accès complet à tous les onglets |

---

## Authentification

L'application utilise **Supabase Auth** (JWT). Aucun mot de passe n'est stocké en base.

**Flux de connexion :**
1. L'admin saisit son email et mot de passe dans la modale de connexion
2. `signInWithPassword()` déclenche `onAuthStateChange`
3. Le profil admin est chargé depuis la table `admins` (vérifie `user_id` et `is_active`)
4. Si aucun profil n'est trouvé, la session est immédiatement révoquée

**Mot de passe oublié :**
1. Cliquer "Mot de passe oublié" sur la modale de connexion
2. Saisir l'adresse email → un lien de réinitialisation est envoyé
3. Le lien ouvre la modale de réinitialisation dans l'application

**Inviter un admin (depuis l'app) :**
1. Se connecter en tant que super_admin
2. Aller dans l'onglet **Admins** → **Inviter un admin**
3. Renseigner prénom, nom, email et rôle
4. L'API `/api/admin-users` crée le compte et envoie un email de réinitialisation de mot de passe

---

## Sécurité

- Authentification via Supabase Auth (JWT) — aucun mot de passe en base
- Politiques RLS granulaires par rôle sur toutes les tables
- `escapeHtml()` appliqué sur tout contenu utilisateur injecté via `innerHTML`
- `maxlength` sur tous les champs de formulaire
- En-têtes de sécurité HTTP via `vercel.json` : CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy
- Fonctions de rôle DB : `is_admin()`, `is_editor()`, `is_super_admin()`, `get_admin_role()`

---

## Dépannage

**"Supabase library not found"**
- Vérifier la connexion réseau
- Vérifier que le script CDN est chargé avant les modules JS dans `index.html`
- Le client stub s'active automatiquement pour les tests locaux

**La connexion admin échoue**
- Vérifier que l'utilisateur existe dans Supabase → Authentication → Users
- Vérifier qu'un enregistrement `admins` existe avec `user_id` correspondant et `is_active = true`
- Consulter la console navigateur pour les erreurs d'authentification

**Les événements ne s'affichent pas sur la page publique**
- S'assurer que les événements ont `visible=true` et `archived=false`
- Vérifier que la date est au format ISO valide (`YYYY-MM-DD`)

**Erreur "permission denied" (RLS)**
- Vérifier que les fonctions `is_admin()`, `is_editor()`, `is_super_admin()` existent en base
- Vérifier que le rôle de l'admin est bien `viewer`, `editor` ou `super_admin`

**L'email de confirmation ne part pas**
- Vérifier que `GMAIL_USER` et `GMAIL_APP_PASSWORD` sont définis dans les variables Vercel
- Utiliser un mot de passe d'application Gmail (pas le mot de passe du compte Google)
- Activer la validation en 2 étapes sur le compte Gmail pour pouvoir créer un mot de passe d'application

---

## Checklist de déploiement

- [ ] Schéma SQL v4 exécuté dans Supabase (8 tables créées)
- [ ] Variables d'environnement configurées dans Vercel
- [ ] Code pushé sur `main` et déploiement Vercel validé
- [ ] Premier super_admin créé (via SQL)
- [ ] Connexion admin testée
- [ ] Page publique affiche les événements (toutes les 3 vues)
- [ ] Formulaire d'inscription fonctionnel (email de confirmation reçu)
- [ ] Formulaire de contact fonctionnel
- [ ] Invitation d'un admin depuis l'onglet Admins testée
- [ ] Exports CSV fonctionnels
- [ ] Cron keep-alive visible dans les logs Vercel

---

## Support

- **Dépôt GitHub** : [github.com/zinckmaxime-design/ohlunjoie](https://github.com/zinckmaxime-design/ohlunjoie)
- **Email** : zinck.maxime@gmail.com
