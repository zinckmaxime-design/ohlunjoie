-- Ohlun'Joie — Simplified Role-Based Schema
-- ================================================
-- Version 4: Simplified to 3 roles (viewer, editor, super_admin)
-- Run on a fresh database or migrate existing
-- ================================================

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE events (
  id bigserial PRIMARY KEY,
  titre text NOT NULL,
  description text NOT NULL,
  date date NOT NULL,
  heure time NOT NULL,
  lieu text NOT NULL,
  type text NOT NULL,
  image text DEFAULT '📅',
  max_participants integer NOT NULL DEFAULT 20,
  visible boolean NOT NULL DEFAULT true,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by text,
  updated_by text
);

CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_visible ON events(visible);
CREATE INDEX idx_events_archived ON events(archived);

CREATE TABLE inscriptions (
  id bigserial PRIMARY KEY,
  event_id bigint REFERENCES events(id) ON DELETE CASCADE,
  prenom text NOT NULL,
  nom text NOT NULL,
  email text NOT NULL,
  telephone text NOT NULL,
  heure_arrivee time,
  heure_depart time,
  commentaire text,
  preparation_salle boolean DEFAULT false,
  partie_evenement boolean DEFAULT false,
  evenement_entier boolean DEFAULT false,
  date_inscription timestamptz DEFAULT now(),
  UNIQUE(event_id, email)
);

CREATE INDEX idx_inscriptions_event ON inscriptions(event_id);
CREATE INDEX idx_inscriptions_email ON inscriptions(email);

-- Admins table with simplified role-based permissions
-- Roles: 'viewer', 'editor', 'super_admin'
CREATE TABLE admins (
  id bigserial PRIMARY KEY,
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  nom text NOT NULL,
  prenom text NOT NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'super_admin')),
  created_at timestamptz DEFAULT now(),
  last_login timestamptz,
  is_active boolean DEFAULT true
);

CREATE INDEX idx_admins_user_id ON admins(user_id);
CREATE INDEX idx_admins_role ON admins(role);

CREATE TABLE analytics (
  id bigserial PRIMARY KEY,
  event_type text NOT NULL,
  event_id bigint REFERENCES events(id) ON DELETE CASCADE,
  page_name text,
  timestamp timestamptz DEFAULT now(),
  user_agent text,
  ip_address inet
);

CREATE INDEX idx_analytics_event ON analytics(event_id);
CREATE INDEX idx_analytics_timestamp ON analytics(timestamp);

CREATE TABLE volunteer_profiles (
  id bigserial PRIMARY KEY,
  prenom text NOT NULL,
  nom text NOT NULL,
  email text UNIQUE NOT NULL,
  telephone text,
  total_participations int DEFAULT 0,
  first_participation date,
  last_participation date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_volunteer_email ON volunteer_profiles(email);

CREATE TABLE activity_logs (
  id bigserial PRIMARY KEY,
  admin_email text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id bigint,
  details jsonb,
  timestamp timestamptz DEFAULT now()
);

CREATE INDEX idx_activity_timestamp ON activity_logs(timestamp);

CREATE TABLE contact_messages (
  id bigserial PRIMARY KEY,
  nom text NOT NULL,
  prenom text NOT NULL,
  email text NOT NULL,
  telephone text,
  message text NOT NULL,
  date timestamptz DEFAULT now(),
  lu boolean DEFAULT false
);

CREATE INDEX idx_contact_date ON contact_messages(date);

CREATE TABLE app_config (
  id bigserial PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamptz DEFAULT now(),
  updated_by text
);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_volunteers_updated_at
  BEFORE UPDATE ON volunteer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-create/update volunteer profile on inscription
CREATE OR REPLACE FUNCTION update_volunteer_profile()
RETURNS trigger AS $$
DECLARE
  v_profile_id bigint;
  v_event_date date;
BEGIN
  SELECT date INTO v_event_date FROM events WHERE id = new.event_id;
  SELECT id INTO v_profile_id FROM volunteer_profiles WHERE email = new.email;

  IF v_profile_id IS NULL THEN
    INSERT INTO volunteer_profiles (prenom, nom, email, telephone, total_participations, first_participation, last_participation)
    VALUES (new.prenom, new.nom, new.email, new.telephone, 1, v_event_date, v_event_date);
  ELSE
    UPDATE volunteer_profiles
    SET total_participations = total_participations + 1,
        last_participation = greatest(coalesce(last_participation, v_event_date), v_event_date),
        telephone = coalesce(new.telephone, telephone),
        updated_at = now()
    WHERE id = v_profile_id;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_volunteer_on_inscription
  AFTER INSERT ON inscriptions
  FOR EACH ROW EXECUTE FUNCTION update_volunteer_profile();

-- ============================================
-- HELPER FUNCTIONS: Role-based access checks
-- ============================================

-- Check if current user is any active admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid()
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid()
    AND is_active = true
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is editor or super_admin (can write)
CREATE OR REPLACE FUNCTION public.is_editor()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid()
    AND is_active = true
    AND role IN ('editor', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's role (returns NULL if not admin)
CREATE OR REPLACE FUNCTION public.get_admin_role()
RETURNS text AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM admins
  WHERE user_id = auth.uid()
  AND is_active = true;
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- EVENTS
-- Public: read visible non-archived events
CREATE POLICY events_public_read ON events
  FOR SELECT USING (visible = true AND archived = false);

-- Admins (viewer+): read all events
CREATE POLICY events_admin_read ON events
  FOR SELECT USING (public.is_admin());

-- Editors (editor+): write events
CREATE POLICY events_editor_write ON events
  FOR INSERT WITH CHECK (public.is_editor());

CREATE POLICY events_editor_update ON events
  FOR UPDATE USING (public.is_editor());

CREATE POLICY events_editor_delete ON events
  FOR DELETE USING (public.is_editor());

-- INSCRIPTIONS
-- Public: read inscriptions for visible non-archived events (to show participant list and check duplicates)
CREATE POLICY inscriptions_public_read ON inscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = inscriptions.event_id
      AND events.visible = true
      AND events.archived = false
    )
  );

-- Public: insert only (to visible non-archived events)
CREATE POLICY inscriptions_public_insert ON inscriptions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id
      AND events.visible = true
      AND events.archived = false
    )
  );

-- Admins (viewer+): read all inscriptions
CREATE POLICY inscriptions_admin_read ON inscriptions
  FOR SELECT USING (public.is_admin());

-- Editors (editor+): write inscriptions
CREATE POLICY inscriptions_editor_write ON inscriptions
  FOR INSERT WITH CHECK (public.is_editor());

CREATE POLICY inscriptions_editor_update ON inscriptions
  FOR UPDATE USING (public.is_editor());

CREATE POLICY inscriptions_editor_delete ON inscriptions
  FOR DELETE USING (public.is_editor());

-- ADMINS
-- Super admin only: full access to admins table
CREATE POLICY admins_super_read ON admins
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY admins_super_write ON admins
  FOR INSERT WITH CHECK (public.is_super_admin());

CREATE POLICY admins_super_update ON admins
  FOR UPDATE USING (public.is_super_admin());

CREATE POLICY admins_super_delete ON admins
  FOR DELETE USING (public.is_super_admin());

-- Allow admins to read their own record (for auth check)
CREATE POLICY admins_self_read ON admins
  FOR SELECT USING (user_id = auth.uid());

-- ANALYTICS
-- Public: insert only (for tracking)
CREATE POLICY analytics_public_insert ON analytics
  FOR INSERT WITH CHECK (true);

-- Admins (viewer+): read analytics
CREATE POLICY analytics_admin_read ON analytics
  FOR SELECT USING (public.is_admin());

-- Editors (editor+): write analytics
CREATE POLICY analytics_editor_write ON analytics
  FOR INSERT WITH CHECK (public.is_editor());

CREATE POLICY analytics_editor_delete ON analytics
  FOR DELETE USING (public.is_editor());

-- VOLUNTEER_PROFILES
-- Admins (viewer+): read volunteers
CREATE POLICY volunteers_admin_read ON volunteer_profiles
  FOR SELECT USING (public.is_admin());

-- Editors (editor+): write volunteers
CREATE POLICY volunteers_editor_write ON volunteer_profiles
  FOR INSERT WITH CHECK (public.is_editor());

CREATE POLICY volunteers_editor_update ON volunteer_profiles
  FOR UPDATE USING (public.is_editor());

CREATE POLICY volunteers_editor_delete ON volunteer_profiles
  FOR DELETE USING (public.is_editor());

-- ACTIVITY_LOGS
-- Super admin only: full access to logs
CREATE POLICY logs_super_read ON activity_logs
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY logs_super_write ON activity_logs
  FOR INSERT WITH CHECK (public.is_super_admin());

-- CONTACT_MESSAGES
-- Public: insert only (to send contact messages)
CREATE POLICY contact_public_insert ON contact_messages
  FOR INSERT WITH CHECK (true);

-- Admins (viewer+): read messages
CREATE POLICY contact_admin_read ON contact_messages
  FOR SELECT USING (public.is_admin());

-- Editors (editor+): write messages (mark as read, delete)
CREATE POLICY contact_editor_update ON contact_messages
  FOR UPDATE USING (public.is_editor());

CREATE POLICY contact_editor_delete ON contact_messages
  FOR DELETE USING (public.is_editor());

-- APP_CONFIG
-- Public: read only
CREATE POLICY config_public_read ON app_config
  FOR SELECT USING (true);

-- Super admin only: write config
CREATE POLICY config_super_write ON app_config
  FOR INSERT WITH CHECK (public.is_super_admin());

CREATE POLICY config_super_update ON app_config
  FOR UPDATE USING (public.is_super_admin());

CREATE POLICY config_super_delete ON app_config
  FOR DELETE USING (public.is_super_admin());

-- ============================================
-- INITIAL DATA
-- ============================================

INSERT INTO app_config (key, value) VALUES
  ('association_name', 'Ohlun''Joie'),
  ('intro_text', 'Notre association rassemble des bénévoles passionnés qui organisent des événements variés pour créer du lien social et enrichir la vie de notre commune.'),
  ('logo_url', ''),
  ('logo_emoji', ''),
  ('event_types', '["assemblée","atelier","sport","fête","conférence","événement"]');

-- Sample events for testing
INSERT INTO events (titre, description, date, heure, lieu, type, image, max_participants) VALUES
  ('Atelier cuisine conviviale', 'Soirée cuisine participative.', '2025-11-11', '19:00', 'Salle des fêtes', 'atelier', '', 20),
  ('Tournoi de badminton', 'Rencontre sportive amicale.', '2025-11-26', '14:00', 'Gymnase municipal', 'sport', '', 24),
  ('Conférence citoyenne', 'Échanges citoyens sur la vie locale.', '2025-12-05', '18:30', 'Mairie', 'conférence', '', 80);

insert into inscriptions(event_id,prenom,nom,email,telephone,commentaire,preparation_salle,evenement_entier)
values
(1,'Marie','Dupont','marie.dupont@email.com','06 12 34 56 78','',true,true),
(1,'Paul','Martin','paul.martin@email.com','06 23 45 67 89','',false,false)
on conflict do nothing;

-- ============================================
-- ROLE PERMISSIONS SUMMARY
-- ============================================
/*
+------------------+--------+--------+-------------+
| Resource         | Viewer | Editor | Super Admin |
+------------------+--------+--------+-------------+
| Events           | Read   | R/W    | R/W         |
| Inscriptions     | Read   | R/W    | R/W         |
| Volunteers       | Read   | R/W    | R/W         |
| Messages         | Read   | R/W    | R/W         |
| Analytics        | Read   | R/W    | R/W         |
| Dashboard        | Read   | Read   | Read        |
| Admins           | -      | -      | R/W         |
| Association/Config| -     | -      | R/W         |
| Activity Logs    | -      | -      | R/W         |
+------------------+--------+--------+-------------+
*/

-- ============================================
-- ADMIN SETUP INSTRUCTIONS
-- ============================================
/*
After running this schema:

1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add user" > "Create new user"
3. Enter email and password for your admin
4. Copy the user's UUID from the table

5. Insert super_admin record (replace UUID):

INSERT INTO admins (user_id, email, nom, prenom, role)
VALUES (
  'PASTE-UUID-HERE',
  'admin@example.com',
  'LastName',
  'FirstName',
  'super_admin'
);

*/
