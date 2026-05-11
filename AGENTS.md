# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Cursor, Copilot, Codex, etc.) when working with code in this repository.

## Security Status

**Status: Secure**

- Supabase Auth (JWT-based), server-side session management
- Role-based RLS policies (`viewer` / `editor` / `super_admin`)
- `escapeHtml()` used consistently across all user-facing `innerHTML`
- Security headers deployed via `vercel.json` (CSP, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy)

---

## Project Overview

**Ohlun'Joie** is a French volunteer event management web application for an association. It features a public-facing event calendar with registration capabilities and a comprehensive admin back-office for managing events, registrations, volunteers, and site configuration.

The application is deployed on Vercel and uses Supabase as its backend (PostgreSQL + RLS policies + Auth).

**Tech Stack:**
- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend:** Supabase (PostgreSQL database with Row Level Security + Auth)
- **Deployment:** Vercel (connected to GitHub repository `zinckmaxime-design/ohlunjoie`)
- **Dependencies:** Loaded via CDN (`@supabase/supabase-js@2`)

## File Structure

```
/
├── index.html                      # Main HTML structure with modals
├── style.css                       # All styles (light theme only)
├── js/
│   ├── config.js                   # Supabase connection & stub client for offline dev
│   ├── utils.js                    # DOM helpers, toast, modal, validators, escapeHtml
│   ├── auth.js                     # Authentication, role checks (canViewModule/canEditModule)
│   ├── public.js                   # Public site rendering, forms, loadSiteConfig
│   ├── admin.js                    # Admin back-office modules (7 tabs)
│   ├── data.js                     # initSiteConfig() seed helper (rarely needed)
│   └── app.js                      # Main entry point & initialization
├── api/
│   ├── admin-users.js              # Serverless: invite/delete admin users (super_admin only)
│   ├── send-confirmation.js        # Serverless: send registration confirmation email (nodemailer)
│   └── keep-alive.js               # Serverless: daily Supabase ping (Vercel cron)
├── supabase-schema-v4-roles.sql    # Current schema: role-based (viewer/editor/super_admin)
└── README-installation.md          # Detailed deployment guide
```

### JavaScript Modules

| File | Purpose |
|------|---------|
| `js/config.js` | Supabase URL/key, client initialization, in-memory stub for offline dev |
| `js/utils.js` | `$()`, `$$()` selectors, `toast()`, `modal`, `formatDateFr()`, `escapeHtml()`, validators |
| `js/auth.js` | `initAuthListener()`, `setupLoginForm()`, `logout()`, `canViewModule()`, `canEditModule()`, password reset forms |
| `js/public.js` | `loadPublic()`, `renderTimeline/List/Cards()`, `loadSiteConfig()`, form handlers, `trackPageView()` |
| `js/admin.js` | All admin modules: dashboard, events, inscriptions, volunteers, messages, admins, association |
| `js/data.js` | `initSiteConfig()` for seeding default app_config (rarely needed, schema seeds this) |
| `js/app.js` | DOMContentLoaded handler, theme init, calls all initialization functions |

**Global variables:**
- `_supabase` - Supabase client instance (defined in config.js)
- `isAdmin` - Boolean, true if authenticated admin (defined in auth.js)
- `adminUser` - Current admin record from `admins` table (defined in auth.js)
- `checkingAdmin` - Boolean guard to prevent concurrent auth checks (defined in auth.js)
- `demoMode` - Boolean flag for local testing without auth (defined in config.js)

## Database Architecture

The application uses 8 Supabase tables:

1. **events** - Event records with visibility and archival flags
   - Key fields: `titre`, `description`, `date`, `heure`, `lieu`, `max_participants`, `visible`, `archived`
   - `visible=true` + `archived=false` are shown on public pages

2. **inscriptions** - Event registrations with participation types
   - Links to events via `event_id` (cascade delete)
   - Unique constraint: `(event_id, email)`
   - Time fields: `heure_arrivee`, `heure_depart`
   - Participation booleans: `preparation_salle`, `partie_evenement`, `evenement_entier`
   - Triggers automatic update of `volunteer_profiles`

3. **admins** - Administrator accounts linked to Supabase Auth
   - `user_id` UUID references `auth.users(id)` (cascade delete)
   - `role` field: `'viewer'` | `'editor'` | `'super_admin'` (CHECK constraint enforced)
   - `is_active` flag for soft-disable
   - No individual permission flags — access is derived entirely from `role`

4. **volunteer_profiles** - Aggregated volunteer statistics
   - Auto-updated via trigger when inscriptions are created
   - Tracks: `total_participations`, `first_participation`, `last_participation`

5. **analytics** - Page views and event click tracking

6. **activity_logs** - Admin action audit trail

7. **contact_messages** - Public contact form submissions
   - Fields: `nom`, `prenom`, `email`, `telephone`, `message`, `date`, `lu`

8. **app_config** - Site configuration (key-value store)
   - Keys: `association_name`, `intro_text`, `logo_url`, `logo_emoji`, `event_types`

**Database Functions:**
- `is_admin()` - Returns true if current `auth.uid()` has any active admin record
- `is_editor()` - Returns true if role is `editor` or `super_admin`
- `is_super_admin()` - Returns true if role is `super_admin`
- `get_admin_role()` - Returns current user's role string (or NULL)
- `update_volunteer_profile()` - Trigger to auto-create/update volunteer profiles on inscription

**RLS Policies (role-based, from `supabase-schema-v4-roles.sql`):**
- Public: read visible events, read inscriptions for visible events, insert inscriptions/analytics/contact_messages, read app_config
- Viewer+: read all events, inscriptions, volunteers, messages, analytics
- Editor+: write events, inscriptions, volunteers, messages, analytics
- Super admin only: read/write admins table, activity_logs, app_config writes

## Authentication

The app uses **Supabase Auth** for authentication:

1. Super admin invites a new user via the Admins tab (calls `/api/admin-users`)
2. New user receives a password reset email and sets their own password
3. Login via `signInWithPassword()` triggers `onAuthStateChange`
4. Auth listener fetches admin profile and sets `adminUser` (role determines access)
5. Logout via `signOut()` clears session

**Auth flow (js/auth.js):**
```javascript
_supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'INITIAL_SESSION' && !session) {
    loadPublic(); trackPageView(); // No session → show public site
  }
  if (event === 'PASSWORD_RECOVERY') {
    modal.open('#modal-reset-password'); return;
  }
  if (event === 'SIGNED_OUT') {
    isAdmin = false; adminUser = null; unmountAdmin(); loadPublic(); return;
  }
  if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
    const { data: admin } = await _supabase
      .from('admins').select('*')
      .eq('user_id', session.user.id).eq('is_active', true).single();
    if (!admin) { await _supabase.auth.signOut(); return; }
    isAdmin = true; adminUser = admin;
    mountAdmin();
  }
});
```

**Role-based access (js/auth.js):**
- `canViewModule(module)` — super_admin sees all; viewer/editor blocked from `admins` and `association`
- `canEditModule(module)` — super_admin can edit all; editor can edit all except `admins`/`association`; viewer cannot edit anything

**Password flows:**
- Forgot password: `setupForgotPasswordForm()` → `resetPasswordForEmail()` → user receives email link
- Reset password: `setupResetPasswordForm()` → modal opened on `PASSWORD_RECOVERY` auth event → `updateUser()`

**Demo mode:** Set `demoMode = true` in `js/config.js` for local testing without auth.

## Application Architecture

### Public Section (Unauthenticated Users)

**Three switchable views:**
- **Timeline View** - Chronological event display with vertical timeline
- **List View** - Compact table format
- **Cards View** - Grid of event cards

**Key functions (js/public.js):**
- `loadPublic()` - Fetches and renders all public views
- `fetchPublicEvents()` - Queries events where `visible=true AND archived=false`
- `fetchInscriptionsForEvents(eventIds)` - Batch-fetches inscriptions for all events in one query
- `loadSiteConfig()` - Loads app_config key-value pairs (called from app.js on init)
- `setupInscriptionForm()` - Registration form handler; fires `sendConfirmationEmail()` on success
- `setupContactForm()` - Contact form handler
- `trackPageView()` - Inserts one analytics row per browser session

### Admin Back-Office (Authenticated Users)

**7 admin modules** (tab-based navigation, visibility gated by role):

1. **Dashboard** - 6 KPI cards: total inscrits, événements actifs, emails uniques, taux moyen inscription, visites site, dernière visite
2. **Événements** (Events) - Event CRUD with year filter; `archivePastEvents()` runs on login
3. **Inscriptions** (Registrations) - Master registration list with search/sort/filter
4. **Bénévoles** (Volunteers) - Aggregate volunteer profiles
5. **Messages** - Contact message inbox (mark read / delete)
6. **Admins** - User management (super_admin only); creates users via `/api/admin-users`
7. **Association** - Site configuration editor (super_admin only)

**Key functions (js/admin.js):**
- `mountAdmin()` / `unmountAdmin()` - Show/hide admin UI; tabs disabled by role
- `loadAdminDashboard()`, `loadAdminEvents()`, `loadAdminInscriptions()`, `loadAdminVolunteers()`, `loadAdminMessages()`, `loadAdminUsers()`, `loadAdminAssociation()` - Module loaders
- `adminCreateEvent()`, `adminEditEvent()`, `adminDeleteEvent()`, `adminToggleVisible()` - Event CRUD
- `archivePastEvents()` - Auto-archives events with past dates (called on login)
- `getSupabaseAccessToken()` - Retrieves JWT for authenticated API calls

### Offline/Stub Mode

The app includes a fallback in-memory Supabase client when CDN fails (js/config.js):
- Enables local development without network
- Pre-populated with 3 sample events and 1 admin user
- All CRUD operations work in-memory (non-persistent)

**Detection:** Console shows `Supabase library not found, using stub client.`

### Serverless API (api/)

Three Vercel serverless functions:

| Endpoint | Auth required | Purpose |
|---|---|---|
| `POST /api/admin-users` | super_admin JWT | Invite new admin (creates auth user + admin record + sends reset email) or delete admin |
| `POST /api/send-confirmation` | None | Send registration confirmation email via Gmail/nodemailer |
| `GET /api/keep-alive` | None | Daily Supabase ping via Vercel cron to prevent free-tier sleep |

**Environment variables needed:**
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — for `admin-users` and `keep-alive`
- `SUPABASE_ANON_KEY` — fallback for `keep-alive`
- `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `GMAIL_FROM_NAME` — for `send-confirmation`
- `SITE_URL`, `ALLOWED_ORIGINS` — for password reset redirect in `admin-users`

## Development Workflow

### Local Development with Supabase CLI

```bash
# Start local Supabase (requires Docker)
npx supabase start

# Access local services:
# Studio:  http://127.0.0.1:54323
# API:     http://127.0.0.1:54321
# Mailpit: http://127.0.0.1:54324

# Apply schema
# Open Studio SQL Editor and run supabase-schema-v4-roles.sql
```

**Local config (js/config.js):**
```javascript
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGc...'; // Local anon key from supabase start
```

### Local Testing Without Supabase
```bash
# Simple HTTP server
python3 -m http.server 8000
# Visit http://localhost:8000
# Stub client activates automatically
```

### Deploying Changes
```bash
git add .
git commit -m "Description of changes"
git push origin main
# Vercel auto-deploys on push to main
```

### Creating a New Admin User

**Preferred method (via app):** Log in as super_admin → Admins tab → "Inviter un admin". This calls `/api/admin-users`, creates the auth user with a temp password, and sends a password reset email automatically.

**Manual method (SQL, for first super_admin):**
1. Create auth user in Supabase Dashboard > Authentication > Users
2. Copy the user's UUID
3. Insert admin record:
```sql
INSERT INTO admins (user_id, email, nom, prenom, role)
VALUES (
  'PASTE-UUID-HERE',
  'email@example.com',
  'LastName',
  'FirstName',
  'super_admin'  -- or 'editor' or 'viewer'
);
```

## Key Patterns and Conventions

### Supabase Client Variable
Always use `_supabase` (with underscore) as the client variable name.

### DOM Manipulation
- Shorthand selectors: `$()` for `querySelector`, `$$()` for `querySelectorAll`
- Event delegation on modals: `data-close` attribute triggers `modal.closeAll()`

### Supabase Query Pattern
```javascript
const { data, error } = await _supabase
  .from('table_name')
  .select('*')
  .eq('field', value)
  .order('field', { ascending: true });

if (error) {
  console.error(error);
  toast('Error message');
  return;
}
```

### App Config (Key-Value)
```javascript
// Reading config
const { data: rows } = await _supabase.from('app_config').select('key, value');
const config = {};
for (const row of rows) {
  config[row.key] = row.value;
}
// Use config.association_name, config.intro_text, etc.

// Writing config
await _supabase.from('app_config')
  .update({ value: newValue })
  .eq('key', 'association_name');
```

### French Localization
- All user-facing text is in French
- Date format: `DD/MM/YYYY` (use `formatDateFr()`)
- Phone format: French mobile (`06 12 34 56 78` or `+33 6 12 34 56 78`)

## Troubleshooting

**"Supabase library not found"**
- Check network connectivity
- Verify CDN script is loaded before module scripts in index.html
- Stub client will activate for local testing

**Admin login fails**
- Verify user exists in Supabase Auth (Dashboard > Authentication > Users)
- Verify matching admin record exists with `user_id` and `is_active = true`
- Check browser console for auth errors

**Events not displaying on public page**
- Ensure events have `visible=true` and `archived=false`
- Check date format is valid ISO (YYYY-MM-DD)

**RLS permission denied errors**
- Verify `is_admin()`, `is_editor()`, `is_super_admin()` functions exist in database
- Check that admin record has correct `user_id` matching auth user and correct `role` value

## Testing Checklist

Before committing changes:
- [ ] Test public event display (all 3 views)
- [ ] Test registration form with French phone number
- [ ] Test admin login via Supabase Auth
- [ ] Test event CRUD operations (editor+ role)
- [ ] Test viewer role: can view but edit buttons hidden
- [ ] Test super_admin only tabs: Admins, Association
- [ ] Test forgot/reset password flow
- [ ] Test CSV exports
- [ ] Verify no console errors
- [ ] Test on local Supabase instance
