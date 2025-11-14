// OHLUN'JOIE V5 - APP COMPLÈTE + BACKOFFICE 6 MODULES
// =====================================================

const SUPABASE_URL = 'https://duqkrpgcqbasbnzynfuh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1cWtycGdjcWJhc2JuenluZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NDM5NTAsImV4cCI6MjA3NjExOTk1MH0.nikdF6TMoFgQHSeEtpfXjWHNOazALoFF_stkunz8OcU';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const toast = (msg) => {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
};

let isAdmin = sessionStorage.getItem('isAdmin') === '1';
let adminUser = null;
let adminPermissions = {};

// THEME: Auto 19h-8h + manuel
(function initTheme() {
  function detectTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    const hour = new Date().getHours();
    return (hour >= 19 || hour < 8) ? 'dark' : 'light';
  }
  const theme = detectTheme();
  document.documentElement.dataset.theme = theme;
  $('#theme-toggle').textContent = theme === 'dark' ? '☀️' : '🌙';
  $('#theme-toggle').onclick = () => {
    const newTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = newTheme;
    localStorage.setItem('theme', newTheme);
    $('#theme-toggle').textContent = newTheme === 'dark' ? '☀️' : '🌙';
  };
})();

// MODALES
const modal = {
  open(id) {
    const backdrop = $('#modal-backdrop');
    const m = document.querySelector(id);
    if (!backdrop || !m) return;
    backdrop.hidden = false;
    m.hidden = false;
  },
  closeAll() {
    $('#modal-backdrop').hidden = true;
    $$('.modal').forEach(m => m.hidden = true);
  }
};
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-close]')) modal.closeAll();
  if (e.target.id === 'modal-backdrop') modal.closeAll();
});

// CHARGE CONFIG SITE
async function loadSiteConfig() {
  const { data } = await supabase.from('site_config').select('*').limit(1).single();
  if (data) {
    $('#logo-emoji').textContent = data.logo_emoji || '🤝';
    $('#intro-text').textContent = data.intro_text || '';
    document.title = data.association_name + ' — Événements';
  }
}
loadSiteConfig();

// ENREGISTRE VISITE
async function trackPageView() {
  await supabase.from('page_analytics').insert({
    page_name: 'public',
    user_agent: navigator.userAgent.substring(0, 200)
  }).then(() => {}).catch(() => {});
}
trackPageView();

// ADMIN LOGIN
$('#admin-toggle').onclick = () => modal.open('#modal-admin');

$('#admin-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#admin-email').value.trim();
  const pass = $('#admin-password').value;
  
  const { data: admin } = await supabase.from('admins').select('*').eq('email', email).eq('is_active', true).single();
  
  if (admin && admin.password_hash === pass) {
    sessionStorage.setItem('isAdmin', '1');
    sessionStorage.setItem('adminId', admin.id);
    sessionStorage.setItem('adminEmail', admin.email);
    isAdmin = true;
    adminUser = admin;
    
    const { data: perms } = await supabase.from('admin_roles').select('*').eq('admin_id', admin.id);
    adminPermissions = {};
    perms.forEach(p => {
      adminPermissions[p.module] = { view: p.can_view, edit: p.can_edit, delete: p.can_delete };
    });
    
    await supabase.from('admins').update({ last_login: new Date().toISOString() }).eq('id', admin.id);
    
    modal.closeAll();
    $('#admin-email').value = '';
    $('#admin-password').value = '';
    mountAdmin();
    toast('✅ Connecté');
  } else {
    toast('❌ Identifiants invalides');
  }
});

// ADMIN UI
function unmountAdmin() {
  $('#admin-section').innerHTML = '';
  $('#admin-section').hidden = true;
  $('#public-intro').hidden = false;
  $('#public-section').hidden = false;
  $('#public-tabs').style.display = '';
}

function mountAdmin() {
  const host = $('#admin-section');
  host.hidden = false;
  $('#public-intro').hidden = true;
  $('#public-section').hidden = true;
  $('#public-tabs').style.display = 'none';
  
  host.innerHTML = `
    <div class="admin-header">
      <h2>Tableau de Bord Administration</h2>
      <button id="admin-logout" class="btn btn-danger">Déconnexion</button>
    </div>
    <div class="admin-tabs">
      <button class="admin-tab active" data-module="dashboard">📊 Dashboard</button>
      <button class="admin-tab" data-module="events">📅 Événements</button>
      <button class="admin-tab" data-module="inscriptions">📝 Inscriptions</button>
      <button class="admin-tab" data-module="volunteers">👥 Bénévoles</button>
      <button class="admin-tab" data-module="admins">👨‍💼 Admins</button>
      <button class="admin-tab" data-module="association">⚙️ Association</button>
    </div>
    <div class="admin-content">
      <div class="admin-module active" id="module-dashboard"></div>
      <div class="admin-module" id="module-events"></div>
      <div class="admin-module" id="module-inscriptions"></div>
      <div class="admin-module" id="module-volunteers"></div>
      <div class="admin-module" id="module-admins"></div>
      <div class="admin-module" id="module-association"></div>
    </div>
  `;
  
  $$('.admin-tab').forEach(btn => {
    if (adminPermissions[btn.dataset.module]?.view) {
      btn.onclick = () => switchAdminTab(btn.dataset.module);
    } else {
      btn.style.opacity = '0.5';
      btn.disabled = true;
      btn.title = 'Accès refusé';
    }
  });
  
  $('#admin-logout').onclick = () => {
    sessionStorage.removeItem('isAdmin');
    isAdmin = false;
    unmountAdmin();
    loadPublic();
  };
  
  loadAdminDashboard();
}

function switchAdminTab(module) {
  $$('.admin-tab').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  $$('.admin-module').forEach(m => m.classList.remove('active'));
  $('#module-' + module).classList.add('active');
  
  if (module === 'dashboard') loadAdminDashboard();
  else if (module === 'events') loadAdminEvents();
  else if (module === 'inscriptions') loadAdminInscriptions();
  else if (module === 'volunteers') loadAdminVolunteers();
  else if (module === 'admins') loadAdminUsers();
  else if (module === 'association') loadAdminAssociation();
}

// DASHBOARD
async function loadAdminDashboard() {
  const host = $('#module-dashboard');
  host.innerHTML = '<p>Chargement...</p>';
  
  const [inscRes, eventsRes, pageViewsRes, emailsRes] = await Promise.all([
    supabase.from('inscriptions').select('id', { count: 'exact', head: true }),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('visible', true).eq('archived', false),
    supabase.from('page_analytics').select('id', { count: 'exact', head: true }),
    supabase.from('inscriptions').select('email')
  ]);
  
  const { data: allEvents } = await supabase.from('events').select('id, max_participants, inscriptions(count)').order('date');
  const rates = (allEvents || []).map(e => {
    const count = e.inscriptions?.[0]?.count || 0;
    return count / Math.max(1, e.max_participants);
  });
  const avgRate = rates.length ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100) : 0;
  
  const uniqueEmails = new Set((emailsRes.data || []).map(x => x.email));
  
  host.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Inscrits</div>
        <div class="kpi-value">${inscRes.count || 0}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Événements Actifs</div>
        <div class="kpi-value">${eventsRes.count || 0}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Emails Uniques</div>
        <div class="kpi-value">${uniqueEmails.size}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Taux Moyen Inscription</div>
        <div class="kpi-value">${avgRate}%</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Visites Site</div>
        <div class="kpi-value">${pageViewsRes.count || 0}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Dernière Visite</div>
        <div class="kpi-value">Il y a 2h</div>
      </div>
    </div>
    <div class="chart-placeholder">
      📊 Graphiques des visites (intégration future)
    </div>
  `;
}

// ÉVÉNEMENTS
async function loadAdminEvents() {
  const host = $('#module-events');
  host.innerHTML = '<p>Chargement des événements...</p>';
  
  const { data: events } = await supabase.from('events').select('*').order('date', { ascending: false });
  
  let html = `<button class="btn btn-primary" onclick="adminCreateEvent()">+ Nouvel événement</button>
    <div class="admin-events-table">
      <table>
        <thead>
          <tr><th>Titre</th><th>Date</th><th>Lieu</th><th>Max</th><th>Inscrits</th><th>Visible</th><th>Actions</th></tr>
        </thead>
        <tbody>`;
  
  for (const ev of events) {
    const { count } = await supabase.from('inscriptions').select('id', { count: 'exact', head: true }).eq('event_id', ev.id);
    html += `<tr>
      <td>${ev.titre}</td>
      <td>${ev.date}</td>
      <td>${ev.lieu}</td>
      <td>${ev.max_participants}</td>
      <td>${count || 0}</td>
      <td>${ev.visible ? '✅' : '❌'}</td>
      <td>
        <button class="btn-small" onclick="adminEditEvent(${ev.id})">✏️ Edit</button>
        <button class="btn-small btn-danger" onclick="adminDeleteEvent(${ev.id})">🗑️ Del</button>
      </td>
    </tr>`;
  }
  
  html += `</tbody></table></div>`;
  host.innerHTML = html;
}

// INSCRIPTIONS
async function loadAdminInscriptions() {
  const host = $('#module-inscriptions');
  host.innerHTML = '<p>Chargement des inscriptions...</p>';
  
  const { data: events } = await supabase.from('events').select('id, titre').order('date', { ascending: false });
  
  let html = `<select id="event-filter" onchange="filterInscriptions()">
    <option value="">-- Tous les événements --</option>`;
  
  events.forEach(e => html += `<option value="${e.id}">${e.titre}</option>`);
  html += `</select>
    <div id="inscriptions-list"></div>`;
  
  host.innerHTML = html;
  await filterInscriptions();
}

async function filterInscriptions() {
  const eventId = $('#event-filter')?.value;
  const list = $('#inscriptions-list');
  
  let query = supabase.from('inscriptions').select('*');
  if (eventId) query = query.eq('event_id', eventId);
  
  const { data: inscs } = await query.order('date_inscription', { ascending: false });
  
  let html = '<table><thead><tr><th>Prénom</th><th>Nom</th><th>Email</th><th>Tél</th><th>Participations</th><th>Commentaire</th></tr></thead><tbody>';
  inscs.forEach(i => {
    const parts = [];
    if (i.preparation_salle) parts.push('Prépa');
    if (i.partie_evenement) parts.push('Partie');
    if (i.evenement_entier) parts.push('Entier');
    html += `<tr>
      <td>${i.prenom}</td>
      <td>${i.nom}</td>
      <td>${i.email}</td>
      <td>${i.telephone}</td>
      <td>${parts.join(', ')}</td>
      <td>${i.commentaire || '-'}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  list.innerHTML = html;
}

// BÉNÉVOLES
async function loadAdminVolunteers() {
  const host = $('#module-volunteers');
  host.innerHTML = '<p>Chargement des bénévoles...</p>';
  
  let yearFilter = new Date().getFullYear();
  
  const { data: inscs } = await supabase.from('inscriptions').select('prenom, nom, email');
  const uniqueVolunteers = {};
  inscs.forEach(i => {
    const key = i.email;
    if (!uniqueVolunteers[key]) uniqueVolunteers[key] = { prenom: i.prenom, nom: i.nom, email: i.email, count: 0 };
    uniqueVolunteers[key].count++;
  });
  
  let html = `<label>Filtrer par année: 
    <select onchange="loadAdminVolunteers()">
      <option value="2025">2025</option>
      <option value="2024">2024</option>
      <option value="2023">2023</option>
    </select>
  </label>
  <table>
    <thead><tr><th>Prénom</th><th>Nom</th><th>Email</th><th>Participations</th><th>Taux Présence</th></tr></thead>
    <tbody>`;
  
  Object.values(uniqueVolunteers).forEach(v => {
    html += `<tr>
      <td>${v.prenom}</td>
      <td>${v.nom}</td>
      <td>${v.email}</td>
      <td>${v.count}</td>
      <td>
        <div class="progress-bar"><span style="width:${Math.min(100, v.count * 20)}%"></span></div>
      </td>
    </tr>`;
  });
  
  html += '</tbody></table>';
  host.innerHTML = html;
}

// ADMINS
async function loadAdminUsers() {
  if (!adminPermissions.admins?.view) {
    $('#module-admins').innerHTML = '<p>❌ Accès refusé</p>';
    return;
  }
  
  const host = $('#module-admins');
  host.innerHTML = '<p>Chargement des administrateurs...</p>';
  
  const { data: admins } = await supabase.from('admins').select('*').order('created_at');
  
  let html = `<button class="btn btn-primary" onclick="adminCreateUser()">+ Nouvel Admin</button>
    <table>
      <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Actif</th><th>Dernière Visite</th><th>Actions</th></tr></thead>
      <tbody>`;
  
  admins.forEach(a => {
    html += `<tr>
      <td>${a.prenom} ${a.nom}</td>
      <td>${a.email}</td>
      <td>${a.role}</td>
      <td>${a.is_active ? '✅' : '❌'}</td>
      <td>${a.last_login ? new Date(a.last_login).toLocaleDateString('fr-FR') : '-'}</td>
      <td>
        <button class="btn-small" onclick="adminEditUser(${a.id})">✏️</button>
        <button class="btn-small btn-danger" onclick="adminDeleteUser(${a.id})">🗑️</button>
      </td>
    </tr>`;
  });
  
  html += '</tbody></table>';
  host.innerHTML = html;
}

// ASSOCIATION
async function loadAdminAssociation() {
  const host = $('#module-association');
  
  const { data: config } = await supabase.from('site_config').select('*').limit(1).single();
  
  host.innerHTML = `
    <div class="config-form">
      <h3>Paramètres de l'association</h3>
      <label>
        <span>Logo (Emoji)</span>
        <input id="logo-input" value="${config?.logo_emoji || '🤝'}" maxlength="2">
      </label>
      <label>
        <span>Nom de l'association</span>
        <input id="name-input" value="${config?.association_name || 'Ohlun\'Joie'}">
      </label>
      <label>
        <span>Texte d'introduction (site public)</span>
        <textarea id="intro-input" rows="4">${config?.intro_text || ''}</textarea>
      </label>
      <label>
        <span>Description pour les bénévoles</span>
        <textarea id="desc-input" rows="4">${config?.association_description || ''}</textarea>
      </label>
      <button class="btn btn-primary" onclick="saveAssociationConfig()">💾 Enregistrer</button>
    </div>
  `;
}

async function saveAssociationConfig() {
  const logo = $('#logo-input')?.value || '🤝';
  const name = $('#name-input')?.value;
  const intro = $('#intro-input')?.value;
  const desc = $('#desc-input')?.value;
  
  const { data: config } = await supabase.from('site_config').select('id').limit(1).single();
  
  if (config) {
    await supabase.from('site_config').update({ logo_emoji: logo, association_name: name, intro_text: intro, association_description: desc }).eq('id', config.id);
  } else {
    await supabase.from('site_config').insert({ logo_emoji: logo, association_name: name, intro_text: intro, association_description: desc });
  }
  
  loadSiteConfig();
  toast('✅ Configuration enregistrée');
}

// STUBS (à compléter)
function adminCreateEvent() { toast('Créer événement - À développer'); }
function adminDeleteEvent(id) { toast('Supprimer événement ' + id); }
function adminCreateUser() { toast('Créer admin - À développer'); }
function adminEditUser(id) { toast('Éditer admin ' + id); }
function adminDeleteUser(id) { toast('Supprimer admin ' + id); }

if (isAdmin) {
  adminUser = { id: sessionStorage.getItem('adminId'), email: sessionStorage.getItem('adminEmail') };
  mountAdmin();
} else {
  unmountAdmin();
}

// PUBLIC (ÉLÉMENTS EXISTANTS)
async function fetchPublicEvents() {
  const { data } = await supabase.from('events').select('*').eq('visible', true).eq('archived', false).order('date', { ascending: true });
  return data || [];
}

async function fetchInscriptionsForEvent(eventId) {
  const { data } = await supabase.from('inscriptions').select('prenom, nom').eq('event_id', eventId).order('date_inscription', { ascending: false });
  return data || [];
}

function openInscription(ev) {
  $('#insc-event-title').textContent = `${ev.image || '📅'} ${ev.titre}`;
  $('#insc-event-meta').textContent = `${ev.date} • ${ev.heure || ''} • ${ev.lieu}`;
  $('#insc-event-id').value = ev.id;
  modal.open('#modal-inscription');
}

function bindSubscribe(btn, ev) {
  if (!btn) return;
  btn.textContent = 'S\'inscrire';
  btn.classList.add('btn', 'btn-primary');
  btn.onclick = () => openInscription(ev);
}

function renderTimeline(events) {
  const root = $('#timeline-view');
  root.innerHTML = '';
  events.forEach(async (ev) => {
    const inscriptions = await fetchInscriptionsForEvent(ev.id);
    const count = inscriptions.length;
    const pct = Math.min(100, Math.round((count / Math.max(1, ev.max_participants)) * 100));
    
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-header">
        <div>
          <div class="card-title">${ev.image || '📅'} ${ev.titre}</div>
          <div class="muted">${ev.date} • ${ev.heure || ''} • ${ev.lieu}</div>
        </div>
        <div class="card-actions"><button class="subscribe-btn"></button></div>
      </div>
      <p>${ev.description || ''}</p>
      <div class="progress"><span style="width:${pct}%"></span></div>
      <div class="inscrit-count">${count}/${ev.max_participants} inscrits</div>
      ${inscriptions.length > 0 ? `<div class="inscrit-list"><strong>Inscrits:</strong> ${inscriptions.map(i => i.prenom + ' ' + i.nom).join(', ')}</div>` : ''}`;
    bindSubscribe(card.querySelector('.subscribe-btn'), ev);
    root.appendChild(card);
  });
}

function renderList(events) {
  const root = $('#list-view');
  root.innerHTML = '';
  const tableWrap = document.createElement('div');
  tableWrap.className = 'table-wrap';
  const table = document.createElement('table');
  table.className = 'table';
  table.innerHTML = `
    <thead>
      <tr><th>Date</th><th>Titre</th><th>Lieu</th><th>Places</th><th></th></tr>
    </thead>
    <tbody></tbody>`;
  events.forEach(async (ev) => {
    const inscriptions = await fetchInscriptionsForEvent(ev.id);
    const count = inscriptions.length;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${ev.date} ${ev.heure || ''}</td>
      <td>${ev.titre}</td>
      <td>${ev.lieu}</td>
      <td>${count}/${ev.max_participants || ''}</td>
      <td><button class="subscribe-btn"></button></td>`;
    table.querySelector('tbody').appendChild(tr);
    bindSubscribe(tr.querySelector('.subscribe-btn'), ev);
  });
  tableWrap.appendChild(table);
  root.appendChild(tableWrap);
}

function renderCards(events) {
  const root = $('#cards-view');
  root.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'cards-grid';
  events.forEach(async (ev) => {
    const inscriptions = await fetchInscriptionsForEvent(ev.id);
    const count = inscriptions.length;
    const pct = Math.min(100, Math.round((count / Math.max(1, ev.max_participants)) * 100));
    
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-header">
        <div>
          <div class="card-title">${ev.image || '📅'} ${ev.titre}</div>
          <div class="muted">${ev.date} • ${ev.heure || ''} • ${ev.lieu}</div>
        </div>
        <div class="card-actions"><button class="subscribe-btn"></button></div>
      </div>
      <p>${ev.description || ''}</p>
      <div class="progress"><span style="width:${pct}%"></span></div>
      <div class="inscrit-count">${count}/${ev.max_participants} inscrits</div>`;
    bindSubscribe(card.querySelector('.subscribe-btn'), ev);
    grid.appendChild(card);
  });
  root.appendChild(grid);
}

function setActiveView(which) {
  $$('.view').forEach(v => v.classList.remove('active'));
  $('#' + which + '-view').classList.add('active');
  $$('.view-switch .tab').forEach(b => b.classList.remove('active'));
  $('#view-' + which).classList.add('active');
}

$('#view-timeline').onclick = () => setActiveView('timeline');
$('#view-list').onclick = () => setActiveView('list');
$('#view-cards').onclick = () => setActiveView('cards');

async function loadPublic() {
  const events = await fetchPublicEvents();
  renderTimeline(events);
  renderList(events);
  renderCards(events);
  updateNextEvent(events);
}

function updateNextEvent(events) {
  const badge = $('#next-event-badge');
  if (!events.length) {
    badge.textContent = '';
    return;
  }
  const firstEvent = events[0];
  const eventDate = new Date(firstEvent.date + 'T' + (firstEvent.heure || '00:00'));
  const today = new Date();
  const diffDays = Math.max(0, Math.ceil((eventDate - today) / 86400000));
  badge.textContent = `Prochain événement dans ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
}

loadPublic();

$('#insc-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const prenom = fd.get('prenom')?.trim();
  const nom = fd.get('nom')?.trim();
  const email = fd.get('email')?.trim();
  const telephone = fd.get('telephone')?.trim();
  const heure_arrivee = fd.get('heure_arrivee')?.trim() || null;
  const heure_depart = fd.get('heure_depart')?.trim() || null;
  const commentaire = fd.get('commentaire')?.trim() || '';
  const preparation_salle = !!fd.get('preparation_salle');
  const partie_evenement = !!fd.get('partie_evenement');
  const evenement_entier = !!fd.get('evenement_entier');
  const event_id = Number(fd.get('event_id'));
  
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const telOk = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.\-]*\d{2}){4}$/.test(telephone);
  const minOne = preparation_salle || partie_evenement || evenement_entier;
  
  if (!prenom || !nom || !emailOk || !telOk || !minOne) {
    toast('⚠️ Vérifie les champs requis');
    return;
  }
  
  const { error } = await supabase.from('inscriptions').insert({
    event_id,
    prenom,
    nom,
    email,
    telephone,
    heure_arrivee,
    heure_depart,
    commentaire,
    preparation_salle,
    partie_evenement,
    evenement_entier
  });
  
  if (error) {
    console.error(error);
    toast('❌ Erreur lors de l\'inscription');
    return;
  }
  
  toast('✅ Inscription enregistrée !');
  modal.closeAll();
  e.target.reset();
  loadPublic();
});

function scheduleAutoArchive() {
  setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      const today = now.toISOString().split('T')[0];
      const lastRun = localStorage.getItem('lastArchiveRun');
      if (lastRun !== today) {
        await supabase.from('events')
          .update({ archived: true })
          .lt('date', today)
          .eq('archived', false);
        localStorage.setItem('lastArchiveRun', today);
      }
    }
  }, 60000);
}
scheduleAutoArchive();

// EDITION ÉVÉNEMENT - MODALE
function openEventEditModal(ev) {
  document.getElementById('modal-edit-event').hidden = false;
  document.getElementById('edit-event-id').value = ev.id;
  document.getElementById('edit-event-titre').value = ev.titre || '';
  document.getElementById('edit-event-date').value = ev.date || '';
  document.getElementById('edit-event-heure').value = ev.heure || '';
  document.getElementById('edit-event-lieu').value = ev.lieu || '';
  document.getElementById('edit-event-max').value = ev.max_participants || 0;
  document.getElementById('edit-event-description').value = ev.description || '';
}

function adminEditEvent(id) {
  supabase.from('events').select('*').eq('id', id).single().then(({ data }) => {
    if (!data) return toast('Erreur chargement événement');
    openEventEditModal(data);
  });
}

document.getElementById('form-edit-event').onsubmit = async function(e) {
  e.preventDefault();
  const id = document.getElementById('edit-event-id').value;
  const titre = document.getElementById('edit-event-titre').value;
  const date = document.getElementById('edit-event-date').value;
  const heure = document.getElementById('edit-event-heure').value;
  const lieu = document.getElementById('edit-event-lieu').value;
  const max = Number(document.getElementById('edit-event-max').value);
  const desc = document.getElementById('edit-event-description').value;
  await supabase.from('events').update({ titre, date, heure, lieu, max_participants: max, description: desc }).eq('id', id);
  toast('Événement modifié !');
  document.getElementById('modal-edit-event').hidden = true;
  loadAdminEvents();
};
