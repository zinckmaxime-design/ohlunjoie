-- -----------------------------------------------------------------------------
-- Ohlun'Joie V3.0
-- Schéma Supabase complet pour la gestion d'événements associatifs.
--
-- Ce script installe un ensemble de tables, index, contraintes, fonctions,
-- triggers et politiques de sécurité (Row Level Security) adaptés à Supabase.
-- Il inclut également des données d'exemple pour démarrer l'application.
--
-- IMPORTANT : exécutez ce script dans une base PostgreSQL vide sur Supabase.
-- Toutes les tables sont supprimées si elles existent déjà afin de garantir
-- une installation propre.

-- Active l'extension pgcrypto pour gen_random_uuid() et crypt() (bcrypt).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Nettoyage : suppression des tables existantes
-- L'ordre est important pour respecter les dépendances (FK et triggers)
DROP TABLE IF EXISTS inscriptions CASCADE;
DROP TABLE IF EXISTS analytics CASCADE;
DROP TABLE IF EXISTS volunteer_profiles CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS app_config CASCADE;

-- -----------------------------------------------------------------------------
-- Table : events
-- Stocke tous les événements (past et futurs). Les colonnes date et heure
-- sont séparées afin de faciliter les filtres. La colonne visible détermine
-- si l'événement est affiché au public et archived indique s'il est archivé.
CREATE TABLE events (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titre             TEXT NOT NULL,
    description       TEXT,
    date              DATE NOT NULL,
    heure             TIME NOT NULL,
    lieu              TEXT NOT NULL,
    type              TEXT NOT NULL,
    image             TEXT NOT NULL, -- emoji représentant l'événement
    max_participants  INTEGER NOT NULL CHECK (max_participants > 0),
    visible           BOOLEAN NOT NULL DEFAULT TRUE,
    archived          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by        UUID,
    updated_by        UUID
);

-- Index pour accélérer les filtres sur date, visible et archived
CREATE INDEX idx_events_date ON events (date);
CREATE INDEX idx_events_visible ON events (visible);
CREATE INDEX idx_events_archived ON events (archived);

-- -----------------------------------------------------------------------------
-- Table : admins
-- Gère les comptes administrateurs et leurs permissions. Chaque admin peut
-- activer ou désactiver les différentes permissions. Le mot de passe est
-- stocké sous forme de hash bcrypt via la fonction pgcrypto. Le rôle
-- super_admin n'est pas stocké dans une colonne dédiée mais les super
-- administrateurs disposent de toutes les permissions actives.
CREATE TABLE admins (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                   TEXT NOT NULL UNIQUE,
    nom                     TEXT NOT NULL,
    hashed_password         TEXT NOT NULL,
    perm_view_events        BOOLEAN NOT NULL DEFAULT FALSE,
    perm_edit_events        BOOLEAN NOT NULL DEFAULT FALSE,
    perm_view_stats         BOOLEAN NOT NULL DEFAULT FALSE,
    perm_view_logs          BOOLEAN NOT NULL DEFAULT FALSE,
    perm_view_volunteers    BOOLEAN NOT NULL DEFAULT FALSE,
    perm_manage_admins      BOOLEAN NOT NULL DEFAULT FALSE,
    perm_config             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Table : inscriptions
-- Conserve les inscriptions des utilisateurs aux événements. Une contrainte
-- UNIQUE empêche qu'un même email soit inscrit plusieurs fois au même
-- événement. Les trois colonnes de participation indiquent dans quelle
-- partie de l'événement le bénévole souhaite participer.
CREATE TABLE inscriptions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    email               TEXT NOT NULL,
    phone               TEXT NOT NULL,
    preparation_salle   BOOLEAN NOT NULL DEFAULT FALSE,
    partie_evenement    BOOLEAN NOT NULL DEFAULT FALSE,
    evenement_entier    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_inscription UNIQUE (event_id, email)
);

-- -----------------------------------------------------------------------------
-- Table : analytics
-- Stocke les données analytiques : page_view lors du chargement de la page et
-- event_click lorsque l'utilisateur clique sur un événement. La colonne
-- created_at permet d’analyser l’évolution dans le temps.
CREATE TABLE analytics (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID REFERENCES events(id),
    action      TEXT NOT NULL,  -- 'page_view' ou 'event_click'
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Table : volunteer_profiles
-- Profil des bénévoles généré automatiquement via un trigger après insertion
-- d'une inscription. La colonne participations_count indique le nombre
-- d'événements auxquels la personne a participé pendant l'année en cours.
CREATE TABLE volunteer_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name          TEXT,
    last_name           TEXT,
    email               TEXT NOT NULL UNIQUE,
    phone               TEXT,
    participations_count INTEGER NOT NULL DEFAULT 1,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Table : activity_logs
-- Journalise les actions réalisées par les administrateurs. Chaque entrée
-- contient l’email de l’admin, l’action effectuée, le type d’entité
-- (events, admins, inscriptions, etc.), l’identifiant concerné et la date.
CREATE TABLE activity_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_email  TEXT NOT NULL,
    action       TEXT NOT NULL,
    entity_type  TEXT NOT NULL,
    entity_id    UUID,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Table : app_config
-- Stocke la configuration de l’application sous forme clé/valeur. Certaines
-- valeurs sont en JSON (event_types) et d’autres en texte simple. La clé est
-- l’identifiant unique de chaque configuration.
CREATE TABLE app_config (
    key      TEXT PRIMARY KEY,
    value    TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Fonctions et triggers

-- Fonction : update_updated_at_column
-- Met à jour la colonne updated_at avec la date et l’heure actuelles à chaque
-- mise à jour. Cette fonction est attachée en trigger BEFORE UPDATE sur
-- plusieurs tables.
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ajout du trigger BEFORE UPDATE pour maintenir updated_at
CREATE TRIGGER tr_events_set_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_admins_set_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_inscriptions_set_updated_at
  BEFORE UPDATE ON inscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_volunteers_set_updated_at
  BEFORE UPDATE ON volunteer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_app_config_set_updated_at
  BEFORE UPDATE ON app_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction : update_volunteer_profile
-- Lorsqu’une inscription est créée, cette fonction met à jour ou crée un
-- profil bénévole correspondant. Si le bénévole existe déjà (match sur
-- l’adresse email), son nombre de participations augmente ; sinon un nouveau
-- profil est créé avec les informations disponibles (prénom/nom vides par
-- défaut).
CREATE OR REPLACE FUNCTION update_volunteer_profile() RETURNS TRIGGER AS $$
BEGIN
  -- Si un profil existe déjà pour cet email, incrémente le compteur de participations
  IF EXISTS (SELECT 1 FROM volunteer_profiles WHERE email = NEW.email) THEN
    UPDATE volunteer_profiles
    SET participations_count = participations_count + 1,
        updated_at = NOW()
    WHERE email = NEW.email;
  ELSE
    -- Crée un nouveau profil bénévole ; on sépare le prénom et le nom à partir de l’email si possible
    INSERT INTO volunteer_profiles (id, first_name, last_name, email, phone, participations_count)
    VALUES (
        gen_random_uuid(),
        split_part(NEW.email, '@', 1),
        '',
        NEW.email,
        NEW.phone,
        1
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger après insertion sur inscriptions pour mettre à jour volunteer_profiles
CREATE TRIGGER tr_inscriptions_after_insert_volunteer
  AFTER INSERT ON inscriptions
  FOR EACH ROW EXECUTE FUNCTION update_volunteer_profile();

-- -----------------------------------------------------------------------------
-- Activation du Row Level Security (RLS) et définition des politiques

-- Table events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
-- Politique : les visiteurs (rôle anon) peuvent lire toutes les lignes
CREATE POLICY allow_public_select_on_events ON events
  FOR SELECT TO anon
  USING (TRUE);
-- Politique : les utilisateurs authentifiés peuvent effectuer toutes les opérations
CREATE POLICY allow_authenticated_all_events ON events
  FOR ALL TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);
-- Politique : le rôle service_role (clé secrète) a tous les droits
CREATE POLICY allow_service_role_all_events ON events
  FOR ALL TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Table admins
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
-- Politique : seuls les utilisateurs authentifiés (administrateurs) peuvent lire/écrire sur la table
CREATE POLICY allow_authenticated_all_admins ON admins
  FOR ALL TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);
CREATE POLICY allow_service_role_all_admins ON admins
  FOR ALL TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Table inscriptions
ALTER TABLE inscriptions ENABLE ROW LEVEL SECURITY;
-- Politique : tout visiteur peut insérer une inscription
CREATE POLICY allow_public_insert_on_inscriptions ON inscriptions
  FOR INSERT TO anon
  WITH CHECK (TRUE);
-- Politique : aucun visiteur ne peut lire ou modifier les inscriptions
CREATE POLICY deny_public_select_update_delete_on_inscriptions ON inscriptions
  FOR SELECT TO anon
  USING (FALSE);
-- Politique : les administrateurs (authentifiés) peuvent lire/écrire toutes les inscriptions
CREATE POLICY allow_authenticated_all_inscriptions ON inscriptions
  FOR ALL TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);
CREATE POLICY allow_service_role_all_inscriptions ON inscriptions
  FOR ALL TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Table analytics
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
-- Politique : tout visiteur peut insérer des données analytiques
CREATE POLICY allow_public_insert_on_analytics ON analytics
  FOR INSERT TO anon
  WITH CHECK (TRUE);
-- Politique : les visiteurs ne peuvent pas lire ou modifier les données analytiques
CREATE POLICY deny_public_select_update_delete_on_analytics ON analytics
  FOR SELECT TO anon
  USING (FALSE);
-- Politique : les administrateurs peuvent lire/écrire
CREATE POLICY allow_authenticated_all_analytics ON analytics
  FOR ALL TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);
CREATE POLICY allow_service_role_all_analytics ON analytics
  FOR ALL TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Table volunteer_profiles
ALTER TABLE volunteer_profiles ENABLE ROW LEVEL SECURITY;
-- Politique : uniquement les administrateurs peuvent accéder aux profils bénévoles
CREATE POLICY allow_authenticated_all_volunteers ON volunteer_profiles
  FOR ALL TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);
CREATE POLICY allow_service_role_all_volunteers ON volunteer_profiles
  FOR ALL TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Table activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
-- Politique : seuls les administrateurs peuvent lire les logs
CREATE POLICY allow_authenticated_all_logs ON activity_logs
  FOR ALL TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);
CREATE POLICY allow_service_role_all_logs ON activity_logs
  FOR ALL TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Table app_config
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
-- Politique : les visiteurs peuvent lire la configuration (intro_text, logo_url, event_types)
CREATE POLICY allow_public_select_on_app_config ON app_config
  FOR SELECT TO anon
  USING (TRUE);
-- Politique : les administrateurs peuvent lire/écrire la configuration
CREATE POLICY allow_authenticated_all_app_config ON app_config
  FOR ALL TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);
CREATE POLICY allow_service_role_all_app_config ON app_config
  FOR ALL TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- -----------------------------------------------------------------------------
-- Insertion de données d’exemple

-- Quelques événements exemples
INSERT INTO events (id, titre, description, date, heure, lieu, type, image, max_participants, visible, archived, created_at, updated_at)
VALUES
  -- Concert de Printemps
  (gen_random_uuid(),
   'Concert de Printemps',
   'Un concert festif pour célébrer l''arrivée du printemps avec plusieurs groupes locaux.',
   DATE '2025-05-15',
   TIME '19:00',
   'Salle des Fêtes',
   'concert',
   '🎵',
   50,
   TRUE,
   FALSE,
   NOW(),
   NOW()),
  -- Fête de la Musique
  (gen_random_uuid(),
   'Fête de la Musique',
   'Édition annuelle de la fête de la musique avec des artistes amateurs et professionnels.',
   DATE '2025-06-21',
   TIME '18:00',
   'Parc Central',
   'fête',
   '🎤',
   100,
   TRUE,
   FALSE,
   NOW(),
   NOW()),
  -- Marché de Noël
  (gen_random_uuid(),
   'Marché de Noël',
   'Venez découvrir nos artisans locaux et profiter de l''ambiance de Noël.',
   DATE '2025-12-10',
   TIME '10:00',
   'Place du Village',
   'marché',
   '🎄',
   80,
   TRUE,
   FALSE,
   NOW(),
   NOW());

-- Inscriptions d’exemple
-- Chaque email ne peut être inscrit qu’une seule fois par événement (contrainte unique)
INSERT INTO inscriptions (id, event_id, email, phone, preparation_salle, partie_evenement, evenement_entier, created_at, updated_at)
VALUES
  (gen_random_uuid(), (SELECT id FROM events LIMIT 1 OFFSET 0), 'alice@example.com', '+33 6 12 34 56 78', TRUE, FALSE, FALSE, NOW(), NOW()),
  (gen_random_uuid(), (SELECT id FROM events LIMIT 1 OFFSET 1), 'bob@example.com', '06 12 34 56 78', FALSE, TRUE, FALSE, NOW(), NOW()),
  (gen_random_uuid(), (SELECT id FROM events LIMIT 1 OFFSET 2), 'charlie@example.com', '0612345678', FALSE, FALSE, TRUE, NOW(), NOW());

-- Administrateur initial (Maxime Zinck)
-- Le mot de passe est hashé dynamiquement avec pgcrypto/crypt() pour éviter de
-- stocker la valeur claire. En cas de restauration manuelle sur une autre
-- instance, exécutez cette commande pour générer un hash bcrypt.
INSERT INTO admins (
    id, email, nom, hashed_password,
    perm_view_events, perm_edit_events, perm_view_stats,
    perm_view_logs, perm_view_volunteers, perm_manage_admins, perm_config,
    created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'zinck.maxime@gmail.com',
    'Maxime Zinck',
    crypt('Zz/max789', gen_salt('bf')),
    TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE,
    NOW(), NOW()
);

-- Configuration d’exemple
INSERT INTO app_config (key, value, created_at, updated_at) VALUES
  ('intro_text', 'Bienvenue sur Ohlun''Joie ! Cette plateforme vous permet de découvrir les prochains événements et de vous inscrire facilement.', NOW(), NOW()),
  ('logo_url', 'data:image/svg+xml;base64,', NOW(), NOW()),
  ('event_types', '["concert", "fête", "marché"]', NOW(), NOW());

-- Les triggers AFTER INSERT sur inscriptions ont déjà créé les profils bénévoles
-- correspondants grâce à l’INSERT ci‑dessus.

-- Fin du script
