-- supabase-schema-v3-final.sql
-- Schéma complet Ohlun'Joie V3.0
-- DROP TABLES
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS inscriptions CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS analytics CASCADE;
DROP TABLE IF EXISTS volunteer_profiles CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS app_config CASCADE;

-- EVENTS
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  titre VARCHAR(120) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  heure TIME NOT NULL,
  lieu VARCHAR(120) NOT NULL,
  type VARCHAR(60) NOT NULL,
  image VARCHAR(16) NOT NULL,
  max_participants INTEGER CHECK (max_participants > 0),
  visible BOOLEAN DEFAULT TRUE,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(120),
  updated_by VARCHAR(120)
);

CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_visible ON events(visible);
CREATE INDEX idx_events_archived ON events(archived);

-- INSCRIPTIONS
CREATE TABLE inscriptions (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  email VARCHAR(120) NOT NULL,
  nom VARCHAR(80) NOT NULL,
  prenom VARCHAR(80) NOT NULL,
  telephone VARCHAR(20) NOT NULL,
  participations JSONB NOT NULL,
  inscription_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, email)
);

-- ADMINS
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  email VARCHAR(120) UNIQUE NOT NULL,
  nom VARCHAR(80) NOT NULL,
  prenom VARCHAR(80) NOT NULL,
  password_hash VARCHAR(128) NOT NULL,
  super_admin BOOLEAN DEFAULT FALSE,
  perm_view_events BOOLEAN DEFAULT TRUE,
  perm_edit_events BOOLEAN DEFAULT FALSE,
  perm_view_stats BOOLEAN DEFAULT TRUE,
  perm_view_logs BOOLEAN DEFAULT FALSE,
  perm_view_volunteers BOOLEAN DEFAULT TRUE,
  perm_manage_admins BOOLEAN DEFAULT FALSE,
  perm_config BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ANALYTICS
CREATE TABLE analytics (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
  action VARCHAR(24) NOT NULL, -- 'page_view' ou 'event_click'
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- VOLUNTEER_PROFILES
CREATE TABLE volunteer_profiles (
  id SERIAL PRIMARY KEY,
  email VARCHAR(120) UNIQUE NOT NULL,
  nom VARCHAR(80) NOT NULL,
  prenom VARCHAR(80) NOT NULL,
  telephone VARCHAR(20),
  participations_count INTEGER DEFAULT 0
);

-- ACTIVITY_LOGS
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  admin_email VARCHAR(120) NOT NULL,
  action VARCHAR(128) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- APP_CONFIG
CREATE TABLE app_config (
  id SERIAL PRIMARY KEY,
  key VARCHAR(40) UNIQUE NOT NULL,
  value TEXT NOT NULL
);

-- TRIGGERS
-- updated_at trigger on events
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_update_updated_at
BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- trigger: update volunteer_profiles after inscription
CREATE OR REPLACE FUNCTION update_volunteer_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM volunteer_profiles WHERE email = NEW.email
  ) THEN
    INSERT INTO volunteer_profiles(email, nom, prenom, telephone, participations_count)
    VALUES(NEW.email, NEW.nom, NEW.prenom, NEW.telephone, 1);
  ELSE
    UPDATE volunteer_profiles
    SET
      nom = NEW.nom,
      prenom = NEW.prenom,
      telephone = NEW.telephone,
      participations_count = participations_count + 1
    WHERE email = NEW.email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_volunteer_profile
AFTER INSERT ON inscriptions
FOR EACH ROW EXECUTE FUNCTION update_volunteer_profile();

-- CONSTRAINTS & VALIDATIONS (côté base)
-- Email validation
ALTER TABLE inscriptions ADD CONSTRAINT valid_email CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$');

-- Téléphone FR validation (+33/06 compatible)
ALTER TABLE inscriptions ADD CONSTRAINT valid_tel
CHECK (
  telephone ~* '^((\\+33 ?|0)[67])[ .-]?([0-9]{2}[ .-]?){4}$'
);

-- POLICIES RLS
-- EVENTS: SELECT visible/archived
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_select_events
  ON events FOR SELECT
  USING (visible IS TRUE AND archived IS FALSE);

-- INSCRIPTIONS: INSERT public
ALTER TABLE inscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_insert_inscriptions
  ON inscriptions FOR INSERT
  USING (true);

-- ANALYTICS: INSERT/SELECT public
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_insert_analytics ON analytics FOR INSERT USING (true);
CREATE POLICY public_select_analytics ON analytics FOR SELECT USING (true);

-- APP_CONFIG: SELECT public
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_select_app_config ON app_config FOR SELECT USING (true);

-- ADMINS: Select All for anon (pour admin demo, à restreindre prod)
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_select_all ON admins FOR SELECT USING (true);

-- ADMIN POLICIES FULL ACCESS
CREATE POLICY admin_full_events ON events FOR ALL TO anon USING (true);
CREATE POLICY admin_full_insc ON inscriptions FOR ALL TO anon USING (true);
CREATE POLICY admin_full_analytics ON analytics FOR ALL TO anon USING (true);
CREATE POLICY admin_full_config ON app_config FOR ALL TO anon USING (true);
CREATE POLICY admin_full_volunteers ON volunteer_profiles FOR ALL TO anon USING (true);
CREATE POLICY admin_full_logs ON activity_logs FOR ALL TO anon USING (true);

-- INITIAL DATA (événements, inscriptions, admin, config)
-- Events (3 exemples)
INSERT INTO events (titre, description, date, heure, lieu, type, image, max_participants, visible, archived, created_by)
VALUES
  ('Soirée d''ouverture', 'Première soirée Ohlun’Joie, festive et conviviale.', CURRENT_DATE + INTERVAL '7 days', '18:30', 'Salle Polyvalente', 'soirée', '🎉', 20, TRUE, FALSE, 'zinck.maxime@gmail.com'),
  ('Atelier Cuisine Solidaire', 'Rejoignez-nous pour cuisiner pour la communauté.', CURRENT_DATE + INTERVAL '14 days', '10:00', 'Maison des Associations', 'atelier', '🍲', 15, TRUE, FALSE, 'zinck.maxime@gmail.com'),
  ('Marche en Forêt', 'Sortie randonnée, tous niveaux.', CURRENT_DATE + INTERVAL '21 days', '09:00', 'Parking Forêt', 'sortie', '🌳', 30, TRUE, FALSE, 'zinck.maxime@gmail.com');

-- Inscriptions (3 exemples)
INSERT INTO inscriptions (event_id, email, nom, prenom, telephone, participations)
VALUES
  (1, 'dupont.laura@email.fr', 'Dupont', 'Laura', '06 12 23 34 45', '{"evenement_entier": true}'),
  (2, 'martin.jean@email.fr', 'Martin', 'Jean', '0612432635', '{"preparation_salle": true}'),
  (3, 'nom@example.com', 'Durand', 'Clara', '+33 6 98 76 54 32', '{"partie_evenement": true}');

-- Admin (démo, hashé bcrypt)
INSERT INTO admins (email, nom, prenom, password_hash, super_admin, perm_view_events, perm_edit_events, perm_view_stats, perm_view_logs, perm_view_volunteers, perm_manage_admins, perm_config)
VALUES (
  'zinck.maxime@gmail.com',
  'Zinck',
  'Maxime',
  '$2b$10$IgjBfRSpPy0hDo0kG5/N3O5YJpUl7HTDCNp2AyZyOrWXNgtGLwUJ.', -- hashé pour 'Zz/max789'
  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
);

-- App config (intro, logo_url, event_types)
INSERT INTO app_config (key, value) VALUES
  ('intro_text', 'Bienvenue sur la plateforme événementielle Ohlun’Joie ! Participez, organisez, partagez.'),
  ('logo_url', ''),
  ('event_types', '["soirée", "atelier", "sortie", "conférence", "repas"]');
