# Ohlun'Joie V3.0 - Guide d'Installation Complet

## 📦 Contenu du Projet

- ✅ `supabase-schema-v3-final.sql` - Schéma BDD complet
- ✅ `index-v3-final.html` - Interface HTML complète
- ✅ `app-v3-final.js` - Logique JavaScript complète
- ✅ `style-v3-final.css` - Styles CSS complets
- ✅ `README-installation.md` - Ce fichier

---

## 🚀 Installation Rapide (3 étapes)

### **Étape 1 : Configurer Supabase**

1. Allez sur [supabase.com](https://supabase.com) et connectez-vous
2. Créez un nouveau projet ou ouvrez `ohlunjoie-db`
3. Ouvrez **SQL Editor** → **New query**
4. Copiez tout le contenu de `supabase-schema-v3-final.sql`
5. Collez dans l'éditeur et cliquez **Run** (ou Ctrl+Entrée)
6. Vérifiez dans **Table Editor** que vous avez 7 tables :
   - `events`
   - `inscriptions`
   - `admins`
   - `analytics`
   - `volunteer_profiles`
   - `activity_logs`
   - `app_config`

### **Étape 2 : Déployer sur GitHub**

1. Allez sur votre dépôt `github.com/zinckmaxime-design/ohlunjoie`
2. Uploadez/Remplacez ces 4 fichiers à la racine :
   - `index-v3-final.html` → **renommer en** `index.html`
   - `app-v3-final.js` → garder le nom ou renommer en `app.js`
   - `style-v3-final.css` → garder le nom ou renommer en `style.css`
   - `README-installation.md`
3. Commit les changements sur la branche `main`

### **Étape 3 : Vérifier Vercel**

1. Vercel détecte automatiquement le push GitHub
2. Un nouveau déploiement démarre (environ 30 secondes)
3. Ouvrez votre URL Vercel : `ohlunjoie.vercel.app`
4. Testez la page publique (événements visibles)

---

## 🧪 Tests de Validation

### **Test 1 : Page Publique**
- ✅ Les 3 événements exemples s'affichent
- ✅ Le compte à rebours fonctionne
- ✅ Les 3 vues (Timeline / Liste / Cartes) fonctionnent
- ✅ Le formulaire d'inscription valide email/téléphone FR

### **Test 2 : Inscription**
1. Remplissez le formulaire :
   - Prénom : `Test`
   - Nom : `Dupont`
   - Email : `test@example.com`
   - Téléphone : `0612345678`
   - Cochez au moins 1 case participation
   - Sélectionnez un événement
2. Cliquez **S'inscrire**
3. Toast vert **"Inscription enregistrée"** apparaît

### **Test 3 : Connexion Admin**
1. Scrollez jusqu'à **Administration**
2. Email : `zinck.maxime@gmail.com`
3. Mot de passe : `Zz/max789`
4. Cliquez **Connexion**
5. Message **"Connecté"** + nom affiché

### **Test 4 : Dashboard Admin**
- ✅ 4 KPI s'affichent avec chiffres corrects
- ✅ Onglets Dashboard / Événements / Stats / Bénévoles / Admins / Config / Logs

### **Test 5 : Gestion Événements**
- ✅ Cartes modernes avec emoji, jauge, inscrits
- ✅ Badges : 🟢 Actif, 🟠 Masqué, ⚫ Archivé
- ✅ Boutons : ✏️ Modifier, 🗑️ Supprimer, 👁️ Toggle, 📥 Export CSV, 🔄 Restaurer
- ✅ Filtres fonctionnels

### **Test 6 : Thème Sombre**
- ✅ Bouton 🌙/☀️ en haut à droite
- ✅ Bascule entre clair/sombre
- ✅ Mémorisation dans localStorage

---

## ⚙️ Configuration Supabase

### **URL et Clé Anon (déjà configurées)**
```javascript
URL: https://duqkrpgcqbasbnzynfuh.supabase.co
KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **RLS Policies**
Les policies actuelles autorisent l'accès public (anon) pour :
- ✅ Lecture des événements visibles
- ✅ Insertion des inscriptions
- ✅ Lecture de la config
- ✅ Insertion des analytics

⚠️ **En production**, restreindre les policies admin avec Supabase Auth.

---

## 🎨 Fonctionnalités Complètes

### **Section Publique**
- 3 vues switchables (Timeline, Liste, Cartes)
- Affichage uniquement `visible=true` et `archived=false`
- Compte à rebours "Prochain événement dans X jours"
- Formulaire inscription avec validations
- Notice RGPD
- Analytics automatiques (page_view, event_click)

### **Back-Office Admin**
**Dashboard**
- 4 KPI : Total Inscrits, Événements Actifs, Emails Uniques, Taux Moyen

**Événements**
- Cartes modernes avec emoji, titre, date, heure, lieu
- Jauge remplissage visuelle
- Liste inscrits dépliable
- Badges statut : 🟢 Actif, 🟠 Masqué, ⚫ Archivé
- Actions : Modifier, Supprimer, Toggle visible, Export CSV, Restaurer
- Filtres : Actifs (défaut), Masqués, Archivés, Tous

**Statistiques**
- KPI détaillés : Vues de pages, Clics événements
- Tableau : Titre | Vues | Clics | Inscrits | Places | Taux
- Export emails mailing (TXT) : `email1; email2; email3...`
- Export stats (CSV)

**Bénévoles**
- Tableau : Prénom | Nom | Email | Téléphone | Participations 2025
- Badge "X participations en 2025"
- Barre recherche nom/prénom/email
- Bouton "Historique" : liste événements
- Export CSV

**Gestion Admins**
- Tableau avec 7 permissions éditables
- Permissions : view_events, edit_events, view_stats, view_logs, view_volunteers, manage_admins, config
- Ajouter / Modifier / Supprimer admins
- Logs connexion

**Configuration**
- Upload logo (Base64, max 2MB) avec prévisualisation
- Édition texte intro
- Gestion types événements (JSON array)

**Logs**
- Historique activités admin (100 dernières)

---

## 🔧 Archivage Automatique Minuit

- Tâche JavaScript côté navigateur
- Exécution quotidienne à 00:00:00 heure locale
- Logique : `UPDATE events SET archived=true WHERE date < today AND archived=false`
- Idempotent (ne ré-archive pas)
- N'affecte pas la colonne `visible`

---

## 🎭 Mode Sombre

- Détection système par défaut : `prefers-color-scheme: dark`
- Toggle manuel : bouton 🌙/☀️
- Mémorisation : `localStorage.getItem('theme')`
- Priorité : localStorage > système
- Palettes AA (contraste minimum WCAG)
- Appliqué à : cartes, tableaux, modales, toasts, formulaires

---

## 📱 Responsive Design

- **Mobile (<640px)** : 1 colonne, menu hamburger
- **Tablette (640-1024px)** : 2 colonnes
- **Desktop (>1024px)** : 3-4 colonnes
- Touch-friendly : boutons min 44x44px

---

## 🔒 Sécurité (à durcir en production)

⚠️ **Actuel (Développement)**
- Policies RLS ouvertes au public (anon)
- Authentification admin simple (email/password en dur)

✅ **Production (Recommandé)**
1. Activer Supabase Auth avec providers (Google, GitHub, etc.)
2. Restreindre policies RLS avec `auth.uid()`
3. Implémenter bcrypt côté serveur pour password_hash
4. Ajouter CORS restrictions côté Supabase
5. Activer rate limiting côté Vercel

---

## 🐛 Troubleshooting

### **Erreur : "Failed to load events"**
➡️ Vérifiez que le SQL a été exécuté (Table Editor doit montrer 7 tables)

### **Erreur : "createClient is not defined"**
➡️ Vérifiez que `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>` est **avant** `<script src="app-v3-final.js"></script>`

### **Erreur : "Invalid API key"**
➡️ Vérifiez dans `app-v3-final.js` que l'URL et la KEY Supabase sont corrects

### **Erreur : "Téléphone FR invalide"**
➡️ Formats acceptés : `0612345678`, `06 12 34 56 78`, `06.12.34.56.78`, `+33 6 12 34 56 78`

### **CSS ne charge pas**
➡️ Vérifiez que `style-v3-final.css` est bien à la racine et référencé correctement dans `index.html`

### **Événements archivés apparaissent**
➡️ La vue publique filtre avec `.eq('visible', true).eq('archived', false)`. Vérifiez la console pour erreurs.

---

## 📞 Support

- **Dépôt GitHub** : [github.com/zinckmaxime-design/ohlunjoie](https://github.com/zinckmaxime-design/ohlunjoie)
- **LinkedIn** : [linkedin.com/in/zinck-maxime-88302b207](https://www.linkedin.com/in/zinck-maxime-88302b207)
- **Email** : zinck.maxime@gmail.com

---

## 📄 Licence

MIT - Développé avec ❤️ par Zinck Maxime

---

## 🎯 Checklist Finale

- [ ] SQL exécuté dans Supabase (7 tables créées)
- [ ] 4 fichiers uploadés sur GitHub
- [ ] Vercel a redéployé automatiquement
- [ ] Page publique charge les événements
- [ ] Inscription fonctionne avec validation
- [ ] Connexion admin fonctionne
- [ ] Dashboard affiche les KPI
- [ ] Cartes événements s'affichent en admin
- [ ] Toggle visible fonctionne
- [ ] Exports CSV fonctionnent
- [ ] Thème sombre fonctionne
- [ ] Mode responsive fonctionne

**Si tous les éléments sont cochés, votre application est prête en production !** 🎉

---

**Prochaines étapes recommandées :**
1. Créer d'autres événements via l'interface admin
2. Tester l'archivage automatique (attendre minuit ou modifier l'heure dans le code)
3. Inviter des bénévoles à s'inscrire
4. Configurer le logo et le texte d'intro
5. Ajouter des types d'événements personnalisés

**Bon déploiement !** 🚀
