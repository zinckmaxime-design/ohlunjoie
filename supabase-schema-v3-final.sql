-- Ohlun'Joie V3.0 - Schéma complet Supabase PostgreSQL
-- Tables, index, triggers, RLS policies et données d'initialisation

-- Extensions utiles
create extension if not exists pgcrypto;
create extension if not exists moddatetime;

-- Fonctions utilitaires
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function update_volunteer_profile()
returns trigger as $$
declare
  v_exists boolean;
  v_first date;
  v_last date;
  v_total integer;
begin
  select exists(select 1 from volunteer_profiles where email = new.email) into v_exists;
  if v_exists then
    select least(coalesce(first_participation, new.date_inscription::date)),
           greatest(coalesce(last_participation, new.date_inscription::date)),
           coalesce(total_participations,0) + 1
      into v_first, v_last, v_total
      from volunteer_profiles
     where email = new.email
     limit 1;

    update volunteer_profiles
       set prenom = coalesce(new.prenom, prenom),
           nom = coalesce(new.nom, nom),
           telephone = coalesce(new.telephone, telephone),
           total_participations = v_total,
           first_participation = coalesce(first_participation, new.date_inscription::date),
           last_participation = greatest(coalesce(last_participation, new.date_inscription::date), new.date_inscription::date),
           updated_at = now()
     where email = new.email;
  else
    insert into volunteer_profiles (prenom, nom, email, telephone, total_participations, first_participation, last_participation)
    values (new.prenom, new.nom, new.email, new.telephone, 1, new.date_inscription::date, new.date_inscription::date);
  end if;
  return new;
end;
$$ language plpgsql;

-- Tables
drop table if exists events cascade;
create table events (
  id bigserial primary key,
  titre text not null,
  description text not null,
  date date not null,
  heure time not null,
  lieu text not null,
  type text not null,
  image text default '📅',
  max_participants integer not null default 20 check (max_participants > 0),
  visible boolean not null default true,
  archived boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text,
  updated_by text
);
create index idx_events_date on events(date);
create index idx_events_visible on events(visible);
create index idx_events_archived on events(archived);

drop trigger if exists trg_events_set_updated_at on events;
create trigger trg_events_set_updated_at
before update on events
for each row
execute function update_updated_at_column();

drop table if exists inscriptions cascade;
create table inscriptions (
  id bigserial primary key,
  event_id bigint references events(id) on delete cascade,
  prenom text not null,
  nom text not null,
  email text not null,
  telephone text not null,
  commentaire text,
  preparation_salle boolean default false,
  partie_evenement boolean default false,
  evenement_entier boolean default false,
  date_inscription timestamptz default now(),
  unique(event_id, email)
);
create index idx_inscriptions_event_id on inscriptions(event_id);
create index idx_inscriptions_email on inscriptions(email);

drop table if exists admins cascade;
create table admins (
  id bigserial primary key,
  email text unique not null,
  nom text not null,
  prenom text not null,
  password_hash text not null,
  role text default 'admin',
  perm_view_events boolean default true,
  perm_edit_events boolean default false,
  perm_view_stats boolean default false,
  perm_view_logs boolean default false,
  perm_view_volunteers boolean default false,
  perm_manage_admins boolean default false,
  perm_config boolean default false,
  created_at timestamptz default now(),
  last_login timestamptz,
  is_active boolean default true
);

drop table if exists analytics cascade;
create table analytics (
  id bigserial primary key,
  event_type text not null,
  event_id bigint references events(id) on delete cascade,
  page_name text,
  timestamp timestamptz default now(),
  user_agent text,
  ip_address inet
);
create index idx_analytics_event_id on analytics(event_id);
create index idx_analytics_timestamp on analytics(timestamp);

drop table if exists volunteer_profiles cascade;
create table volunteer_profiles (
  id bigserial primary key,
  prenom text not null,
  nom text not null,
  email text unique not null,
  telephone text,
  total_participations integer default 0,
  first_participation date,
  last_participation date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_volunteers_email on volunteer_profiles(email);

drop trigger if exists trg_volunteers_set_updated_at on volunteer_profiles;
create trigger trg_volunteers_set_updated_at
before update on volunteer_profiles
for each row
execute function update_updated_at_column();

drop trigger if exists trg_inscriptions_update_volunteer on inscriptions;
create trigger trg_inscriptions_update_volunteer
after insert on inscriptions
for each row
execute function update_volunteer_profile();

drop table if exists activity_logs cascade;
create table activity_logs (
  id bigserial primary key,
  admin_email text not null,
  action text not null,
  entity_type text not null,
  entity_id bigint,
  details jsonb,
  timestamp timestamptz default now()
);
create index idx_activity_logs_timestamp on activity_logs(timestamp);

drop table if exists app_config cascade;
create table app_config (
  id bigserial primary key,
  key text unique not null,
  value text,
  updated_at timestamptz default now(),
  updated_by text
);

-- RLS
alter table events enable row level security;
alter table inscriptions enable row level security;
alter table admins enable row level security;
alter table analytics enable row level security;
alter table volunteer_profiles enable row level security;
alter table activity_logs enable row level security;
alter table app_config enable row level security;

drop policy if exists public_select_events on events;
create policy public_select_events on events for select to anon using (true);

drop policy if exists public_insert_inscriptions on inscriptions;
create policy public_insert_inscriptions on inscriptions for insert to anon with check (true);

drop policy if exists public_select_inscriptions on inscriptions;
create policy public_select_inscriptions on inscriptions for select to anon using (true);

drop policy if exists public_insert_analytics on analytics;
create policy public_insert_analytics on analytics for insert to anon with check (true);

drop policy if exists public_select_app_config on app_config;
create policy public_select_app_config on app_config for select to anon using (true);

drop policy if exists admin_all_events on events;
create policy admin_all_events on events for all to anon using (true) with check (true);

drop policy if exists admin_all_inscriptions on inscriptions;
create policy admin_all_inscriptions on inscriptions for all to anon using (true) with check (true);

drop policy if exists admin_all_admins on admins;
create policy admin_all_admins on admins for all to anon using (true) with check (true);

drop policy if exists admin_all_analytics on analytics;
create policy admin_all_analytics on analytics for all to anon using (true) with check (true);

drop policy if exists admin_all_volunteers on volunteer_profiles;
create policy admin_all_volunteers on volunteer_profiles for all to anon using (true) with check (true);

drop policy if exists admin_all_activity_logs on activity_logs;
create policy admin_all_activity_logs on activity_logs for all to anon using (true) with check (true);

drop policy if exists admin_all_app_config on app_config;
create policy admin_all_app_config on app_config for all to anon using (true) with check (true);

-- Données d'initialisation
insert into app_config (key, value, updated_by) values
('intro_text', 'Notre association rassemble des bénévoles passionnés qui organisent des événements variés pour créer du lien social et enrichir la vie de notre commune.', 'seed')
on conflict (key) do update set value = excluded.value;

insert into app_config (key, value, updated_by) values
('logo_url', '', 'seed')
on conflict (key) do update set value = excluded.value;

insert into app_config (key, value, updated_by) values
('event_types', '["assemblée","atelier","sport","fête","conférence","événement"]', 'seed')
on conflict (key) do update set value = excluded.value;

insert into admins (email, nom, prenom, password_hash, role,
  perm_view_events, perm_edit_events, perm_view_stats, perm_view_logs, perm_view_volunteers, perm_manage_admins, perm_config)
values
('zinck.maxime@gmail.com','Zinck','Maxime', crypt('Zz/max789', gen_salt('bf')), 'super_admin',
 true, true, true, true, true, true, true)
on conflict (email) do nothing;

insert into events (titre, description, date, heure, lieu, type, image, max_participants, visible, archived, created_by)
values
('Atelier cuisine conviviale','Soirée cuisine participative.', (now() + interval '15 days')::date, '19:00', 'Salle des fêtes', 'atelier', '🍲', 20, true, false, 'seed'),
('Tournoi de badminton','Rencontre sportive amicale.', (now() + interval '30 days')::date, '14:00', 'Gymnase municipal', 'sport', '🏸', 24, true, false, 'seed'),
('Conférence citoyenne','Débat et échanges avec intervenant local.', (now() + interval '45 days')::date, '18:30', 'Mairie - Salle du conseil', 'conférence', '🎤', 50, true, false, 'seed');

insert into inscriptions (event_id, prenom, nom, email, telephone, commentaire, preparation_salle, partie_evenement, evenement_entier)
values
((select id from events where titre='Atelier cuisine conviviale' limit 1), 'Alice', 'Martin', 'alice@example.org', '0611223344', 'Sans gluten', true, false, true),
((select id from events where titre='Atelier cuisine conviviale' limit 1), 'Bruno', 'Dupont', 'bruno@example.org', '0622334455', null, false, true, false),
((select id from events where titre='Tournoi de badminton' limit 1), 'Chloé', 'Bernard', 'chloe@example.org', '0633445566', 'Débutante', false, true, false);

insert into analytics (event_type, event_id, page_name, user_agent)
values
('page_view', null, 'home', 'seed-agent'),
('event_click', (select id from events where titre='Atelier cuisine conviviale' limit 1), 'home', 'seed-agent');

comment on table events is 'Événements publics et administrables';
comment on table inscriptions is 'Inscriptions aux événements';
comment on table admins is 'Comptes administrateurs avec permissions';
comment on table analytics is 'Événements analytics: page_view, event_click';
comment on table volunteer_profiles is 'Profils bénévoles agrégés via trigger';
comment on table activity_logs is 'Journaux d''activité admin';
comment on table app_config is 'Configuration application (logo, intro, types)';
