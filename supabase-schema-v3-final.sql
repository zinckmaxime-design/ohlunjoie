-- Ohlun'Joie V3 — Schéma complet (events visible/archived, inscriptions, admins, analytics, volunteer_profiles, activity_logs, app_config)
-- Tables
create table if not exists events (
  id bigserial primary key,
  titre text not null,
  description text not null,
  date date not null,
  heure time not null,
  lieu text not null,
  type text not null,
  image text default '📅',
  max_participants integer not null default 20,
  visible boolean not null default true,
  archived boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text,
  updated_by text
);

create index if not exists idx_events_date on events(date);
create index if not exists idx_events_visible on events(visible);
create index if not exists idx_events_archived on events(archived);

create table if not exists inscriptions (
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
create index if not exists idx_inscriptions_event on inscriptions(event_id);
create index if not exists idx_inscriptions_email on inscriptions(email);

create table if not exists admins (
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

create table if not exists analytics (
  id bigserial primary key,
  event_type text not null, -- 'page_view' | 'event_click'
  event_id bigint references events(id) on delete cascade,
  page_name text,
  timestamp timestamptz default now(),
  user_agent text,
  ip_address inet
);
create index if not exists idx_analytics_event on analytics(event_id);
create index if not exists idx_analytics_timestamp on analytics(timestamp);

create table if not exists volunteer_profiles (
  id bigserial primary key,
  prenom text not null,
  nom text not null,
  email text unique not null,
  telephone text,
  total_participations int default 0,
  first_participation date,
  last_participation date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_volunteer_email on volunteer_profiles(email);

create table if not exists activity_logs (
  id bigserial primary key,
  admin_email text not null,
  action text not null,
  entity_type text not null,
  entity_id bigint,
  details jsonb,
  timestamp timestamptz default now()
);
create index if not exists idx_activity_timestamp on activity_logs(timestamp);

create table if not exists app_config (
  id bigserial primary key,
  key text unique not null,
  value text,
  updated_at timestamptz default now(),
  updated_by text
);

-- Triggers
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

drop trigger if exists update_events_updated_at on events;
create trigger update_events_updated_at before update on events
for each row execute function update_updated_at_column();

drop trigger if exists update_volunteers_updated_at on volunteer_profiles;
create trigger update_volunteers_updated_at before update on volunteer_profiles
for each row execute function update_updated_at_column();

create or replace function update_volunteer_profile()
returns trigger as $$
declare v_profile_id bigint; v_event_date date;
begin
  select date into v_event_date from events where id = new.event_id;
  select id into v_profile_id from volunteer_profiles where email = new.email;
  if v_profile_id is null then
    insert into volunteer_profiles (prenom, nom, email, telephone, total_participations, first_participation, last_participation)
    values (new.prenom, new.nom, new.email, new.telephone, 1, v_event_date, v_event_date);
  else
    update volunteer_profiles
    set total_participations = total_participations + 1,
        last_participation = greatest(coalesce(last_participation, v_event_date), v_event_date),
        telephone = coalesce(new.telephone, telephone),
        updated_at = now()
    where id = v_profile_id;
  end if;
  return new;
end; $$ language plpgsql;

drop trigger if exists update_volunteer_on_inscription on inscriptions;
create trigger update_volunteer_on_inscription
after insert on inscriptions
for each row execute function update_volunteer_profile();

-- RLS
alter table events enable row level security;
alter table inscriptions enable row level security;
alter table admins enable row level security;
alter table analytics enable row level security;
alter table volunteer_profiles enable row level security;
alter table activity_logs enable row level security;
alter table app_config enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename='events' and policyname='events_select') then
    create policy events_select on events for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename='inscriptions' and policyname='inscriptions_select') then
    create policy inscriptions_select on inscriptions for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename='inscriptions' and policyname='inscriptions_insert') then
    create policy inscriptions_insert on inscriptions for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename='analytics' and policyname='analytics_insert') then
    create policy analytics_insert on analytics for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename='app_config' and policyname='app_config_select') then
    create policy app_config_select on app_config for select using (true);
  end if;
  -- Démo: policies permissives pour admin côté client; à renforcer avec auth en prod
  if not exists (select 1 from pg_policies where tablename='events' and policyname='events_all') then
    create policy events_all on events for all using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='inscriptions' and policyname='inscriptions_all') then
    create policy inscriptions_all on inscriptions for all using (true);
  end if;
end $$;

-- Données d'init
insert into app_config(key,value) values
  ('intro_text','Notre association rassemble des bénévoles passionnés qui organisent des événements variés pour créer du lien social et enrichir la vie de notre commune.'),
  ('logo_url',''),
  ('event_types','["assemblée","atelier","sport","fête","conférence","événement"]')
on conflict (key) do nothing;

insert into admins(email,nom,prenom,password_hash,role,
  perm_view_events,perm_edit_events,perm_view_stats,perm_view_logs,perm_view_volunteers,perm_manage_admins,perm_config)
values ('zinck.maxime@gmail.com','Zinck','Maxime','Zz/max789','super_admin',true,true,true,true,true,true,true)
on conflict (email) do nothing;

insert into events (titre,description,date,heure,lieu,type,image,max_participants)
values
('Atelier cuisine conviviale','Soirée cuisine participative.','2025-11-11','19:00','Salle des fêtes','atelier','🍝',20),
('Tournoi de badminton','Rencontre sportive amicale.','2025-11-26','14:00','Gymnase municipal','sport','🏸',24),
('Conférence citoyenne','Échanges citoyens sur la vie locale.','2025-12-05','18:30','Mairie','conférence','🎤',80)
on conflict do nothing;

insert into inscriptions(event_id,prenom,nom,email,telephone,commentaire,preparation_salle,evenement_entier)
values
(1,'Marie','Dupont','marie.dupont@email.com','06 12 34 56 78','',true,true),
(1,'Paul','Martin','paul.martin@email.com','06 23 45 67 89','',false,false)
on conflict do nothing;
