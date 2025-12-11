// OHLUN'JOIE V5 - APP COMPLÈTE + BACKOFFICE 6 MODULES - VERSION FINALE CORRIGÉE
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

// ✅ FORCE MODE CLAIR UNIQUEMENT
(function initTheme() {
  document.documentElement.setAttribute('data-theme', 'light');
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

// ✅ CHARGE CONFIG SITE
async function loadSiteConfig() {
  const { data } = await supabase.from('site_config').select('*').limit(1).single();
  if (data) {
    const logoEmoji = document.getElementById('logo-emoji');
    if (logoEmoji) {
      if (data.logo_url) {
        logoEmoji.style.display = 'none';
      } else {
        logoEmoji.style.display = 'inline';
        logoEmoji.textContent = data.logo_emoji || '🤝';
      }
    }
    
    const brandName = document.querySelector('.brand-name');
    if (brandName) {
      brandName.textContent = data.association_name || 'Ohlun\'Joie';
    }
    
    if (data.logo_url) {
      let headerImg = document.getElementById('header-logo-image');
      if (!headerImg) {
        headerImg = document.createElement('img');
        headerImg.id = 'header-logo-image';
        headerImg.style.cssText = 'max-width:90px;max-height:90px;margin:0 1.5em;border-radius:12px;object-fit:contain;vertical-align:middle;';
        
        const logoEmoji = document.getElementById('logo-emoji');
        if (logoEmoji && logoEmoji.parentNode) {
          logoEmoji.parentNode.insertBefore(headerImg, logoEmoji.nextSibling);
        }
      }
      headerImg.src = data.logo_url;
      headerImg.alt = 'Logo';
    }
    
    const introText = document.getElementById('intro-text');
    if (introText) {
      introText.textContent = data.intro_text || '';
    }
    
    document.title = (data.association_name || 'Ohlun\'Joie') + ' — Événements';
  }
}

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
  let selectedEventData = null;

  if (eventId) {
    const { data: event } = await supabase.from('events').select('*').eq('id', eventId).single();
    selectedEventData = event;
  }

  let query = supabase.from('inscriptions').select('*');
  if (eventId) query = query.eq('event_id', eventId);
  const { data: inscs } = await query.order('date_inscription', { ascending: false });

  let countPrep = 0, countEntier = 0, countPartie = 0;
  inscs.forEach(i => {
    if (i.preparation_salle) countPrep++;
    if (i.evenement_entier) countEntier++;
    if (i.partie_evenement) countPartie++;
  });

  let html = '';
  if (selectedEventData) {
    html += `
      <div class="event-detail-admin">
        <div class="event-detail-title">${selectedEventData.image || '📅'} <strong>${selectedEventData.titre}</strong></div>
        <div class="event-detail-meta">
          ${selectedEventData.date || ''} 
          ${selectedEventData.heure ? '• ' + selectedEventData.heure : ''} 
          ${selectedEventData.lieu ? '• ' + selectedEventData.lieu : ''}
        </div>
        <div class="event-detail-desc">${selectedEventData.description || ''}</div>
        <div class="event-detail-totals">
          <b>Préparation&nbsp;:</b> ${countPrep} &nbsp;|&nbsp; 
          <b>Soirée entière&nbsp;:</b> ${countEntier} &nbsp;|&nbsp; 
          <b>Partie de la soirée&nbsp;:</b> ${countPartie}
        </div>
      </div>
    `;
  }

  html += `
    <table class="insc-table-admin">
      <thead>
        <tr>
          <th data-sort="heure_arrivee">ARRIVÉE</th>
          <th data-sort="heure_depart">DÉPART</th>
          <th data-sort="prenom">PRÉNOM</th>
          <th data-sort="nom">NOM</th>
          <th data-sort="participation">PARTICIPATIONS</th>
          <th data-sort="commentaire">COMMENTAIRE</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
  `;
  inscs.forEach((i, idx) => {
    const parts = [];
    if (i.preparation_salle) parts.push('Prépa');
    if (i.partie_evenement) parts.push('Partie');
    if (i.evenement_entier) parts.push('Entier');
    const autres = [];
    if (i.email) autres.push('Email&nbsp;:&nbsp;' + i.email);
    if (i.telephone) autres.push('Tél&nbsp;:&nbsp;' + i.telephone);
    
    html += `<tr>
      <td>${i.heure_arrivee || '-'}</td>
      <td>${i.heure_depart || '-'}</td>
      <td>${i.prenom}</td>
      <td>${i.nom}</td>
      <td>${parts.join(', ')}</td>
      <td>${i.commentaire || '-'}</td>
      <td><button class="btn-see-details" data-idx="${idx}">Voir +</button></td>
    </tr>
    <tr class="insc-details-row" style="display:none;">
      <td colspan="7">
        <div class="details-panel">
          <strong>Heure arrivée :</strong> ${i.heure_arrivee || '-'}<br>
          <strong>Heure départ :</strong> ${i.heure_depart || '-'}<br>
          <strong>Prénom :</strong> ${i.prenom}<br>
          <strong>Nom :</strong> ${i.nom}<br>
          <strong>Participations :</strong> ${parts.join(', ') || '-'}<br>
          ${autres.length > 0 ? '<hr><b>Autres infos :</b><br>' + autres.join('<br>') : ''}
          ${i.commentaire ? '<br><b>Commentaire :</b> ' + i.commentaire : ''}
        </div>
      </td>
    </tr>
    `;
  });

  html += '</tbody></table>';
  list.innerHTML = html;

  document.querySelectorAll('.btn-see-details').forEach(btn => {
    btn.onclick = function() {
      const detailsRow = btn.closest('tr').nextElementSibling;
      detailsRow.style.display = detailsRow.style.display === 'table-row' ? 'none' : 'table-row';
      btn.textContent = detailsRow.style.display === 'table-row' ? 'Fermer' : 'Voir +';
    };
  });
}

// BÉNÉVOLES
async function loadAdminVolunteers() {
  const host = $('#module-volunteers');
  host.innerHTML = `<p>Chargement des bénévoles...</p>`;

  const thisYear = new Date().getFullYear();
  const years = [thisYear, thisYear + 1];
  let selectHtml = `<label>Filtrer par année: 
    <select id="year-volunteers" style="margin-right:1em;">${years.map(y =>
      `<option value="${y}">${y}</option>`).join('')}</select>
    <input id="search-volunteers" type="text" placeholder="Recherche prénom, nom, email..." style="padding:0.45em 1em;border-radius:8px;border:1.5px solid #ddd; margin-left:1em;width:260px;">
  </label>`;

  host.innerHTML = selectHtml + `<div id="volunteers-list"></div>`;

  async function renderList() {
    const year = $('#year-volunteers').value;
    const search = $('#search-volunteers').value.trim().toLowerCase();
    const { data: events } = await supabase.from('events').select('id, date').gte('date', year + '-01-01').lte('date', year + '-12-31');
    const { data: inscs } = await supabase.from('inscriptions').select('*');
    const allEventIds = new Set(events.map(e => e.id));

    const volunteers = {};
    inscs.forEach(i => {
      if (!allEventIds.has(i.event_id)) return;
      const key = (i.email || '').toLowerCase();
      if (!key) return;
      if (!volunteers[key]) {
        volunteers[key] = {
          prenom: i.prenom,
          nom: i.nom,
          email: i.email,
          prepa: 0,
          entier: 0,
          partie: 0,
          nb_events_present: new Set(),
          participations: 0
        };
      }
      if (i.preparation_salle) volunteers[key].prepa++;
      if (i.evenement_entier) volunteers[key].entier++;
      if (i.partie_evenement) volunteers[key].partie++;
      volunteers[key].participations++;
      volunteers[key].nb_events_present.add(i.event_id);
    });

    let array = Object.values(volunteers);
    if (search) {
      array = array.filter(v =>
        (v.prenom || '').toLowerCase().includes(search) ||
        (v.nom || '').toLowerCase().includes(search) ||
        (v.email || '').toLowerCase().includes(search)
      );
    }

    const totalEvents = allEventIds.size;
    array.sort((a, b) => (a.prenom || '').localeCompare(b.prenom || '', 'fr'));

    let html = `
      <table class="volunteers-table-admin">
        <thead>
          <tr>
            <th data-sort="prenom">Prénom</th>
            <th data-sort="nom">Nom</th>
            <th data-sort="email">Email</th>
            <th data-sort="prepa">Prépa</th>
            <th data-sort="entier">Entier</th>
            <th data-sort="partie">Partie</th>
            <th data-sort="presence">Présence (%)</th>
            <th data-sort="participations">Nb participations</th>
          </tr>
        </thead>
        <tbody>
    `;
    array.forEach(v => {
      const pct = totalEvents ? Math.round(v.nb_events_present.size / totalEvents * 100) : 0;
      html += `<tr>
        <td>${v.prenom}</td>
        <td>${v.nom}</td>
        <td>${v.email}</td>
        <td>${v.prepa}</td>
        <td>${v.entier}</td>
        <td>${v.partie}</td>
        <td>${pct}</td>
        <td>${v.participations}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    $('#volunteers-list').innerHTML = html;

    document.querySelectorAll('.volunteers-table-admin th[data-sort]').forEach((th, colIdx) => {
      th.style.cursor = 'pointer';
      th.onclick = function() {
        let rows = Array.from(th.closest('table').querySelectorAll('tbody tr'));
        const asc = !th.classList.toggle('sorted-asc');
        th.classList.remove('sorted-desc');
        if (!asc) th.classList.add('sorted-desc');
        rows.sort((a, b) => {
          const tdA = a.children[colIdx].textContent.trim().toLowerCase();
          const tdB = b.children[colIdx].textContent.trim().toLowerCase();
          if (colIdx >= 3) {
            return asc ? (+tdA) - (+tdB) : (+tdB) - (+tdA);
          }
          return asc ? tdA.localeCompare(tdB, 'fr') : tdB.localeCompare(tdA, 'fr');
        });
        const tbody = th.closest('table').querySelector('tbody');
        tbody.innerHTML = '';
        rows.forEach(tr => tbody.appendChild(tr));
      };
    });
  }

  host.querySelector('#year-volunteers').onchange = renderList;
  host.querySelector('#search-volunteers').oninput = renderList;
  renderList();
}

// ADMINS
async function openEditAdmin(adminData, droits) {
  document.getElementById('admin-user-id').value = adminData?.id || '';
  document.getElementById('admin-user-prenom').value = adminData?.prenom || '';
  document.getElementById('admin-user-nom').value = adminData?.nom || '';
  document.getElementById('admin-user-email').value = adminData?.email || '';
  document.getElementById('admin-user-role').value = adminData?.role || '';
  document.getElementById('admin-user-pass').value = '';

  document.querySelectorAll('.roles-matrix input[type=checkbox]').forEach(cb => cb.checked = false);

  if (droits?.length) {
    droits.forEach(d => {
      const viewBox = document.querySelector(`.mod-view[data-module="${d.module}"]`);
      const editBox = document.querySelector(`.mod-edit[data-module="${d.module}"]`);
      if (viewBox) viewBox.checked = !!d.view;
      if (editBox) editBox.checked = !!d.edit;
    });
  }

  document.getElementById('admin-user-mod-title').textContent = adminData?.id ? 'Modifier Admin' : 'Nouvel Admin';
  modal.open('#modal-admin-user');
}

async function adminEditUser(id) {
  const { data: admin } = await supabase.from('admins').select('*').eq('id', id).single();
  if (!admin) return toast('❌ Admin introuvable');
  
  const { data: droits } = await supabase.from('admin_roles').select('*').eq('admin_id', id);
  openEditAdmin(admin, droits.map(d => ({
    module: d.module,
    view: d.can_view,
    edit: d.can_edit
  })));
}

async function adminDeleteUser(id) {
  if (!confirm("⚠️ Confirmer la suppression de cet administrateur ?")) return;
  
  await supabase.from('admins').delete().eq('id', id);
  await supabase.from('admin_roles').delete().eq('admin_id', id);
  toast('✅ Admin supprimé');
  loadAdminUsers();
}

// ✅ FORM-ADMIN-USER - VERSION CORRIGÉE
const adminFormElement = document.getElementById('form-admin-user');
if (adminFormElement) {
  adminFormElement.onsubmit = async function(e) {
    e.preventDefault();
    
    const id = document.getElementById('admin-user-id').value.trim();
    const prenom = document.getElementById('admin-user-prenom').value.trim();
    const nom = document.getElementById('admin-user-nom').value.trim();
    const email = document.getElementById('admin-user-email').value.trim();
    const role = document.getElementById('admin-user-role').value;
    const password = document.getElementById('admin-user-pass').value;

    const droits = Array.from(document.querySelectorAll('.roles-matrix tbody tr')).map(tr => ({
      module: tr.querySelector('td').innerText.trim().toLowerCase(),
      can_view: tr.querySelector('.mod-view').checked,
      can_edit: tr.querySelector('.mod-edit').checked
    }));

    let adminData = { prenom, nom, email, role };
    if (password) adminData.password_hash = password;

    try {
      if (!id) {
        const { data: created, error } = await supabase.from('admins').insert(adminData).select().single();
        if (error) throw error;
        
        await supabase.from('admin_roles').upsert(
          droits.map(d => ({
            admin_id: created.id,
            module: d.module,
            can_view: d.can_view,
            can_edit: d.can_edit,
            can_delete: false
          }))
        );
        toast('✅ Admin créé avec succès');
      } else {
        const { error: updateError } = await supabase.from('admins').update(adminData).eq('id', id);
        if (updateError) throw updateError;
        
        await supabase.from('admin_roles').upsert(
          droits.map(d => ({
            admin_id: id,
            module: d.module,
            can_view: d.can_view,
            can_edit: d.can_edit,
            can_delete: false
          }))
        );
        toast('✅ Admin modifié avec succès');
      }
      
      modal.closeAll();
      loadAdminUsers();
    } catch (error) {
      console.error(error);
      toast('❌ Erreur : ' + error.message);
    }
  };
}

async function loadAdminUsers() {
  if (!adminPermissions.admins?.view) {
    $('#module-admins').innerHTML = '<p>❌ Accès refusé</p>';
    return;
  }
  
  const host = $('#module-admins');
  host.innerHTML = '<p>Chargement des administrateurs...</p>';
  
  const { data: admins } = await supabase.from('admins').select('*').order('created_at');
  
  let html = `<button class="btn btn-primary" onclick="adminCreateUser()">➕ Nouvel Admin</button>
    <table>
      <thead>
        <tr>
          <th>Nom</th>
          <th>Email</th>
          <th>Rôle</th>
          <th>Actif</th>
          <th>Dernière Visite</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>`;
  
  admins.forEach(a => {
    html += `<tr>
      <td>${a.prenom} ${a.nom}</td>
      <td>${a.email}</td>
      <td>${a.role}</td>
      <td>${a.is_active ? '✅' : '❌'}</td>
      <td>${a.last_login ? new Date(a.last_login).toLocaleDateString('fr-FR') : '-'}</td>
      <td>
        <button class="btn-small" onclick="adminEditUser('${a.id}')">✏️</button>
        <button class="btn-small btn-danger" onclick="adminDeleteUser('${a.id}')">🗑️</button>
      </td>
    </tr>`;
  });
  
  html += '</tbody></table>';
  host.innerHTML = html;
}

function adminCreateUser() {
  document.getElementById('form-admin-user').reset();
  document.getElementById('admin-user-id').value = '';
  document.querySelectorAll('.roles-matrix input[type=checkbox]').forEach(cb => cb.checked = false);
  document.getElementById('admin-user-mod-title').textContent = 'Nouvel Admin';
  modal.open('#modal-admin-user');
}

// ✅ ASSOCIATION
async function initSiteConfig() {
  const { data: configs } = await supabase.from('site_config').select('id').limit(1);
  if (!configs || configs.length === 0) {
    await supabase.from('site_config').insert([{
      association_name: 'Ohlun\'Joie',
      intro_text: 'Notre association rassemble des bénévoles passionnés...',
      association_description: 'Association locale de bénévolat',
      logo_url: null
    }]);
  }
}
initSiteConfig();

async function loadAdminAssociation() {
  const host = $('#module-association');
  const { data: config } = await supabase.from('site_config').select('*').limit(1).single();
  const logoDisplay = config?.logo_url ? `<img src="${config.logo_url}" alt="Logo" style="max-width:150px;height:auto;">` : '';
  
  host.innerHTML = `
    <div class="config-panel">
      <div class="config-section">
        <h3>Configuration de l'association</h3>
        <div class="config-group">
          <label>Nom: <input id="name-input" type="text" value="${config?.association_name || 'Ohlun\'Joie'}"></label>
        </div>
        <div class="config-group">
          <label>Intro: <textarea id="intro-input">${config?.intro_text || ''}</textarea></label>
        </div>
        <div class="config-actions">
          <button class="btn btn-primary" onclick="saveAssociationConfig()">Enregistrer</button>
        </div>
      </div>
    </div>
  `;
}

async function saveAssociationConfig() {
  const nameInput = document.getElementById('name-input');
  const introInput = document.getElementById('intro-input');
  
  const name = nameInput.value?.trim();
  const intro = introInput.value?.trim();
  
  const { data: configs } = await supabase.from('site_config').select('id').limit(1);
  const config = configs && configs.length > 0 ? configs[0] : null;
  
  const updateData = { association_name: name, intro_text: intro };
  
  try {
    if (config) {
      await supabase.from('site_config').update(updateData).eq('id', config.id);
    } else {
      await supabase.from('site_config').insert([updateData]);
    }
    
    toast('✅ Configuration enregistrée !');
    await loadSiteConfig();
  } catch (err) {
    toast('❌ Erreur: ' + err.message);
  }
}

// EVENTS
function adminCreateEvent() {
  document.getElementById('form-create-event').reset();
  modal.open('#modal-create-event');
}

function adminEditEvent(id) {
  supabase.from('events').select('*').eq('id', id).single().then(({ data }) => {
    if (!data) return toast('Erreur');
    document.getElementById('edit-event-id').value = data.id;
    document.getElementById('edit-event-titre').value = data.titre || '';
    document.getElementById('edit-event-date').value = data.date || '';
    document.getElementById('edit-event-lieu').value = data.lieu || '';
    modal.open('#modal-edit-event');
  });
}

function adminDeleteEvent(id) {
  if (!confirm("Supprimer ?")) return;
  supabase.from('events').delete().eq('id', id).then(() => {
    toast('✅ Supprimé');
    loadAdminEvents();
  });
}

// ✅ FORM-EDIT-EVENT - VERSION CORRIGÉE
const editFormElement = document.getElementById('form-edit-event');
if (editFormElement) {
  editFormElement.onsubmit = async function(e) {
    e.preventDefault();
    const id = document.getElementById('edit-event-id').value;
    const titre = document.getElementById('edit-event-titre').value;
    const date = document.getElementById('edit-event-date').value;
    const lieu = document.getElementById('edit-event-lieu').value;
    await supabase.from('events').update({ titre, date, lieu }).eq('id', id);
    toast('✅ Modifié');
    modal.closeAll();
    loadAdminEvents();
  };
}

// ✅ FORM-CREATE-EVENT - VERSION CORRIGÉE
const createFormElement = document.getElementById('form-create-event');
if (createFormElement) {
  createFormElement.onsubmit = async function(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const titre = fd.get('titre');
    const date = fd.get('date');
    const lieu = fd.get('lieu');
    const max_participants = Number(fd.get('max_participants'));
    
    if (!titre || !date || !lieu) {
      toast('⚠️ Remplissez tous les champs');
      return;
    }
    
    const { error } = await supabase.from('events').insert({
      titre, date, lieu, max_participants, visible: true, archived: false
    });
    
    if (error) {
      toast('❌ Erreur');
      return;
    }
    
    toast('✅ Créé');
    modal.closeAll();
    e.target.reset();
    loadAdminEvents();
  };
}

// PUBLIC
async function fetchPublicEvents() {
  const { data } = await supabase.from('events').select('*').eq('visible', true).eq('archived', false).order('date', { ascending: true });
  return data || [];
}

function openInscription(ev) {
  $('#insc-event-id').value = ev.id;
  modal.open('#modal-inscription');
}

// ✅ TIMELINE + CARTES FIXES
function renderTimeline(events) {
  const root = $('#timeline-view');
  if (!root) return;
  root.innerHTML = '';
  events.forEach(ev => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${ev.titre}</h3>
      <p><strong>📅 ${ev.date || 'TBD'}</strong></p>
      <p>📍 ${ev.lieu || ''}</p>
      <p>${ev.description || ''}</p>
      <button class="btn btn-primary subscribe-btn">S'inscrire</button>
    `;
    card.querySelector('.subscribe-btn').onclick = () => openInscription(ev);
    root.appendChild(card);
  });
}

function renderList(events) {
  const root = $('#list-view');
  if (!root) return;
  root.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'table-events';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Titre</th>
        <th>Date</th>
        <th>Lieu</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  
  events.forEach(ev => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${ev.titre}</td>
      <td>${ev.date || 'TBD'}</td>
      <td>${ev.lieu || ''}</td>
      <td><button class="btn btn-primary btn-sm subscribe-btn">S'inscrire</button></td>
    `;
    tr.querySelector('.subscribe-btn').onclick = () => openInscription(ev);
    table.querySelector('tbody').appendChild(tr);
  });
  
  root.appendChild(table);
}

async function loadPublic() {
  const events = await fetchPublicEvents();
  renderTimeline(events);
  renderList(events);
}

loadPublic();
loadSiteConfig();

$('#insc-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const { error } = await supabase.from('inscriptions').insert({
    event_id: Number(fd.get('event_id')),
    prenom: fd.get('prenom'),
    nom: fd.get('nom'),
    email: fd.get('email'),
    telephone: fd.get('telephone')
  });
  
  if (error) {
    toast('❌ Erreur');
    return;
  }
  
  toast('✅ Inscrit!');
  modal.closeAll();
  e.target.reset();
  loadPublic();
});

if (isAdmin) {
  mountAdmin();
} else {
  unmountAdmin();
}
