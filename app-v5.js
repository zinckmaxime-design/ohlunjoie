// OHLUN'JOIE V5 STABLE - PARTIE 1/2

const SUPABASE_URL = 'https://duqkrpgcqbasbnzynfuh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...'; // Renseigne ta clé Supabase ici
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

// Site config
async function loadSiteConfig() {
  const { data } = await supabase.from('site_config').select('*').limit(1).single();
  if (data) {
    $('#logo-emoji').textContent = data.logo_emoji || '🤝';
    $('#intro-text').textContent = data.intro_text || '';
    document.title = data.association_name + ' — Événements';
  }
}
loadSiteConfig();

// Analytics
async function trackPageView() {
  await supabase.from('page_analytics').insert({
    page_name: 'public',
    user_agent: navigator.userAgent.substring(0, 200)
  }).then(() => {}).catch(() => {});
}
trackPageView();

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
// OHLUN'JOIE V5 STABLE - PARTIE 2/2

// --- Dashboard
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
    <div class="chart-placeholder">📊 Graphiques des visites (intégration future)</div>
  `;
}

// --- Événements
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

// Edite un événement (modale)
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

// --- Inscriptions
async function loadAdminInscriptions() {
  const host = $('#module-inscriptions');
  host.innerHTML = '<p>Chargement des inscriptions...</p>';

  const { data: events } = await supabase.from('events').select('id, titre').order('date', { ascending: false });

  let html = `<select id="event-filter" onchange="filterInscriptions()">
    <option value="">-- Tous les événements --</option>`;

  events.forEach(e => html += `<option value="${e.id}">${e.titre}</option>`);
  html += `</select><div id="inscriptions-list"></div>`;

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
};
// --- Bénévoles
async function loadAdminVolunteers() {
  const host = $('#module-volunteers');
  host.innerHTML = '<p>Chargement des bénévoles...</p>';

  const { data, error } = await supabase.from('volunteers').select('*').order('name');
  if (error) {
    host.innerHTML = '<p>Erreur chargement bénévoles</p>';
    return;
  }

  let html = `<table><thead>
    <tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Présence</th></tr></thead><tbody>`;
  data.forEach(v => {
    html += `<tr>
      <td>${v.name}</td>
      <td>${v.email}</td>
      <td>${v.phone}</td>
      <td>${v.presence_count || 0}</td>
    </tr>`;
  });
  html += `</tbody></table>`;
  host.innerHTML = html;
}

// --- Admins management
async function loadAdminUsers() {
  const host = $('#module-admins');
  host.innerHTML = '<p>Chargement des admins...</p>';

  const { data: admins, error } = await supabase.from('admins').select('id,email,nom,prenom,role');
  if (error) {
    host.innerHTML = '<p>Erreur chargement admins</p>';
    return;
  }

  let html = `<table><thead>
    <tr><th>Email</th><th>Nom</th><th>Prénom</th><th>Rôle</th></tr></thead><tbody>`;
  admins.forEach(a => {
    html += `<tr>
      <td>${a.email}</td>
      <td>${a.nom}</td>
      <td>${a.prenom}</td>
      <td>${a.role}</td>
    </tr>`;
  });
  html += `</tbody></table>`;
  host.innerHTML = html;
}

// --- Association
async function loadAdminAssociation() {
  const host = $('#module-association');
  host.innerHTML = '<p>Chargement de l’association...</p>';

  const { data: assoc, error } = await supabase.from('site_config').select('logo_emoji, intro_text, association_name').single();
  if (error) {
    host.innerHTML = "<p>Erreur chargement association</p>";
    return;
  }

  host.innerHTML = `
    <form id="form-association" class="form-grid">
      <label>Nom de l'association<input name="association_name" value="${assoc.association_name || ''}"></label>
      <label>Logo Emoji<input name="logo_emoji" value="${assoc.logo_emoji || ''}"></label>
      <label class="full-width">Texte d’introduction<textarea name="intro_text" rows="4">${assoc.intro_text || ''}</textarea></label>
      <button type="submit" class="btn btn-primary full-width">Enregistrer</button>
    </form>
  `;

  $('#form-association').onsubmit = async function(e) {
    e.preventDefault();
    const form = e.target;
    const values = {
      association_name: form.association_name.value,
      logo_emoji: form.logo_emoji.value,
      intro_text: form.intro_text.value,
    };
    const { error } = await supabase.from('site_config').update(values).eq('id', assoc.id);
    toast(error ? 'Erreur sauvegarde' : 'Mise à jour réussie');
  };
};

// --- Load public events (basic timeline) - cache clear
async function loadPublic() {
  // Implementation depending on your needs
}

if (isAdmin) {
  mountAdmin();
} else {
  loadPublic();
}

