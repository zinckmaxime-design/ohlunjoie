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

// ✅ CHARGE CONFIG SITE - VERSION UNIQUE ET FINALE (SANS EMOJI, AVEC IMAGE)
// ✅ SOLUTION FINALE - AFFICHE L'IMAGE EN CSS BACKGROUND
async function loadSiteConfig() {
  try {
    const { data } = await supabase.from('site_config').select('*').limit(1).single();
    if (!data) return;
    
    // 1️⃣ NOM
    const brandName = document.querySelector('.brand-name');
    if (brandName) {
      brandName.textContent = data.association_name || 'Ohlun\'Joie';
    }
    
    // 2️⃣ EMOJI - masquer si image
    const logoEmoji = document.getElementById('logo-emoji');
    if (logoEmoji) {
      logoEmoji.style.display = data.logo_url ? 'none' : 'inline';
      if (!data.logo_url) {
        logoEmoji.textContent = data.logo_emoji || '🤝';
      }
    }
    
    // 3️⃣ IMAGE - EN CSS BACKGROUND (plus stable)
    if (data.logo_url) {
      let headerLogo = document.getElementById('header-logo-bg');
      if (!headerLogo) {
        headerLogo = document.createElement('div');
        headerLogo.id = 'header-logo-bg';
        headerLogo.style.cssText = `
          width: 90px;
          height: 90px;
          margin: 0 1.5em;
          border-radius: 12px;
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          flex-shrink: 0;
        `;
        
        if (logoEmoji?.parentNode) {
          logoEmoji.parentNode.insertBefore(headerLogo, logoEmoji.nextSibling);
        }
      }
      // ✅ UTILISER LE CSS BACKGROUND AVEC DATA URL
      headerLogo.style.backgroundImage = `url('${data.logo_url}')`;
      console.log('✅ Image affichée en CSS background');
    }
    
    // 4️⃣ INTRO
    const introText = document.getElementById('intro-text');
    if (introText) {
      introText.textContent = data.intro_text || '';
    }
    
    document.title = (data.association_name || 'Ohlun\'Joie') + ' — Événements';
  } catch (err) {
    console.error('Erreur loadSiteConfig:', err);
  }
}

loadSiteConfig();
console.log('✅ loadSiteConfig V2 - CSS BACKGROUND CHARGÉE');


// Appelle la fonction maintenant
loadSiteConfig();
console.log('✅ loadSiteConfig CHARGÉE - Image persiste après Ctrl+F5');

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

document.getElementById('form-admin-user').onsubmit = async function(e) {
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

// ✅ ASSOCIATION - VERSION FINALE CORRIGÉE
async function initSiteConfig() {
  const { data: configs } = await supabase.from('site_config').select('id').limit(1);
  if (!configs || configs.length === 0) {
    await supabase.from('site_config').insert([{
      association_name: 'Ohlun\'Joie',
      intro_text: 'Notre association rassemble des bénévoles passionnés...',
      association_description: 'Association locale de bénévolat',
      logo_url: null
    }]);
    console.log('✅ Config initiale créée');
  }
}
initSiteConfig();

async function loadAdminAssociation() {
  const host = $('#module-association');
  
  const { data: config } = await supabase.from('site_config').select('*').limit(1).single();
  
  const logoDisplay = config?.logo_url ? `<img src="${config.logo_url}" alt="Logo" style="max-width:150px;height:auto;border-radius:8px;margin-bottom:1em;">` : '';
  
  host.innerHTML = `
    <div class="config-panel">
      <div class="config-section">
        <h3>📋 Configuration de l'association</h3>
        
        <div class="config-group">
          <label class="config-label">
            <span class="label-title">🖼️ Logo de l'association</span>
            <span class="label-desc">Upload une image (PNG, JPG, max 2MB)</span>
            <input type="file" id="logo-upload" accept="image/png,image/jpeg" style="margin-top:0.5em;padding:0.5em;border:1px solid #ddd;border-radius:6px;width:100%;cursor:pointer;">
            <div id="logo-preview" style="margin-top:1em;"></div>
          </label>
        </div>

        <div class="config-group">
          <label class="config-label">
            <span class="label-title">📛 Nom de l'association</span>
            <span class="label-desc">Ex: Ohlun'Joie, La Main Tendue, etc.</span>
            <input id="name-input" type="text" value="${config?.association_name || 'Ohlun\'Joie'}" style="width:100%;padding:0.7em;border:1.5px solid #ddd;border-radius:6px;font-size:1em;margin-top:0.5em;">
          </label>
        </div>

        <div class="config-group">
          <label class="config-label">
            <span class="label-title">📝 Texte d'introduction (Site Public)</span>
            <span class="label-desc">Affiché sur la page publique des événements</span>
            <textarea id="intro-input" rows="3" style="width:100%;padding:0.7em;border:1.5px solid #ddd;border-radius:6px;font-size:1em;margin-top:0.5em;font-family:inherit;">${config?.intro_text || ''}</textarea>
          </label>
        </div>

        <div class="config-group">
          <label class="config-label">
            <span class="label-title">👥 Description pour les bénévoles</span>
            <span class="label-desc">Texte encourageant pour les volontaires</span>
            <textarea id="desc-input" rows="3" style="width:100%;padding:0.7em;border:1.5px solid #ddd;border-radius:6px;font-size:1em;margin-top:0.5em;font-family:inherit;">${config?.association_description || ''}</textarea>
          </label>
        </div>

        <div class="config-actions">
          <button class="btn btn-primary btn-large" onclick="saveAssociationConfig()">💾 Enregistrer les modifications</button>
          <button class="btn btn-secondary" onclick="resetAssociationForm()">↺ Réinitialiser</button>
        </div>
      </div>

      <div class="config-section info-section">
        <h3>ℹ️ Aperçu Public</h3>
        <div class="preview-box">
          <div id="preview-logo" style="text-align:center;margin-bottom:1em;min-height:100px;display:flex;align-items:center;justify-content:center;">
            ${logoDisplay ? logoDisplay : '<span style="font-size:3em;">🤝</span>'}
          </div>
          <div id="preview-name" style="font-size:1.3em;font-weight:bold;text-align:center;margin-bottom:0.5em;">${config?.association_name || 'Ohlun\'Joie'}</div>
          <div id="preview-intro" style="font-size:0.95em;color:#555;text-align:center;line-height:1.5;">${config?.intro_text || 'Votre texte d\'introduction...'}</div>
        </div>
      </div>
    </div>
  `;

  // GESTION UPLOAD IMAGE
  const logoUpload = $('#logo-upload');
  if (logoUpload) {
    logoUpload.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      
      if (file.size > 2 * 1024 * 1024) {
        toast('❌ Image trop grande (max 2MB)');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        
        // Afficher l'aperçu
        const previewDiv = document.getElementById('logo-preview');
        previewDiv.innerHTML = `
          <div style="border:2px dashed #0d7377;border-radius:8px;padding:1em;text-align:center;">
            <img src="${base64}" alt="Preview" style="max-width:100%;max-height:150px;border-radius:6px;">
            <p style="margin-top:0.5em;color:#666;font-size:0.9em;">✅ Image sélectionnée</p>
          </div>
        `;
        
        // Mettre à jour aussi l'aperçu public
        const previewLogo = document.getElementById('preview-logo');
        if (previewLogo) {
          previewLogo.innerHTML = `<img src="${base64}" alt="Logo Preview" style="max-width:150px;height:auto;border-radius:8px;">`;
        }
        
        // Stocker en base64 dans un attribut data
        logoUpload.dataset.imageBase64 = base64;
        toast('✅ Image uploadée (aperçu mis à jour)');
      };
      reader.readAsDataURL(file);
    });
  }
}

// ✅ SAUVEGARDER LA CONFIGURATION - VERSION FINALE AVEC AUTO-RELOAD
async function saveAssociationConfig() {
  console.log('🔄 Sauvegarde en cours...');
  
  const nameInput = document.getElementById('name-input');
  const introInput = document.getElementById('intro-input');
  const descInput = document.getElementById('desc-input');
  const logoUpload = document.getElementById('logo-upload');
  
  if (!nameInput || !introInput || !descInput) {
    toast('⚠️ Formulaire non trouvé');
    return;
  }
  
  const name = nameInput.value?.trim();
  const intro = introInput.value?.trim();
  const desc = descInput.value?.trim();
  const logoBase64 = logoUpload?.dataset.imageBase64 || null;
  
  if (!name) {
    toast('⚠️ Le nom est requis');
    return;
  }
  
  const { data: configs } = await supabase.from('site_config').select('id').limit(1);
  const config = configs && configs.length > 0 ? configs[0] : null;
  
  const updateData = { 
    association_name: name, 
    intro_text: intro, 
    association_description: desc
  };
  
  if (logoBase64) {
    updateData.logo_url = logoBase64;
  }
  
  try {
    if (config) {
      const { error } = await supabase.from('site_config').update(updateData).eq('id', config.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('site_config').insert([updateData]);
      if (error) throw error;
    }
    
    toast('✅ Configuration enregistrée !');
    
    // ✅ MET À JOUR LE HEADER IMMÉDIATEMENT (pas de reload)
    await loadSiteConfig();
    
    // ✅ RECHARGE LE FORMULAIRE ADMIN (pour voir l'image)
    setTimeout(() => {
      loadAdminAssociation();
    }, 500);
    
  } catch (err) {
    console.error('❌ Erreur:', err);
    toast('❌ Erreur: ' + err.message);
  }
}

console.log('✅ saveAssociationConfig CORRIGÉE - SANS RELOAD');

// EVENT STUBS
function adminCreateEvent() {
  document.getElementById('form-create-event').reset();
  const today = new Date().toISOString().split('T')[0];
  document.querySelector('#form-create-event [name="date"]').value = today;
  modal.open('#modal-create-event');
}

function adminEditEvent(id) {
  supabase.from('events').select('*').eq('id', id).single().then(({ data }) => {
    if (!data) return toast('Erreur chargement événement');
    document.getElementById('modal-edit-event').hidden = false;
    document.getElementById('edit-event-id').value = data.id;
    document.getElementById('edit-event-titre').value = data.titre || '';
    document.getElementById('edit-event-date').value = data.date || '';
    document.getElementById('edit-event-heure').value = data.heure || '';
    document.getElementById('edit-event-lieu').value = data.lieu || '';
    document.getElementById('edit-event-max').value = data.max_participants || 0;
    document.getElementById('edit-event-description').value = data.description || '';
  });
}

function adminDeleteEvent(id) {
  if (!confirm("Supprimer cet événement ?")) return;
  supabase.from('events').delete().eq('id', id).then(() => {
    toast('✅ Événement supprimé');
    loadAdminEvents();
  });
}

// EVENT FORM HANDLERS
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
  toast('✅ Événement modifié');
  document.getElementById('modal-edit-event').hidden = true;
  loadAdminEvents();
};

document.getElementById('form-create-event').onsubmit = async function(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  
  const titre = fd.get('titre')?.trim();
  const date = fd.get('date')?.trim();
  const heure = fd.get('heure')?.trim() || null;
  const lieu = fd.get('lieu')?.trim();
  const max_participants = Number(fd.get('max_participants'));
  const description = fd.get('description')?.trim() || '';
  const visible = !!fd.get('visible');
  
  if (!titre || !date || !lieu || max_participants < 1) {
    toast('⚠️ Veuillez remplir tous les champs obligatoires');
    return;
  }
  
  const { error } = await supabase.from('events').insert({
    titre,
    date,
    heure,
    lieu,
    max_participants,
    description,
    visible,
    archived: false
  });
  
  if (error) {
    console.error(error);
    toast('❌ Erreur lors de la création');
    return;
  }
  
  toast('✅ Événement créé avec succès');
  modal.closeAll();
  e.target.reset();
  loadAdminEvents();
};

// PUBLIC SECTION
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

// ✅ RÉACTIVE LES ONGLETS LISTE ET CARTES
function setActiveView(which) {
  console.log('🔄 Changement vers:', which);
  
  $$('.view').forEach(v => v.classList.remove('active'));
  const targetView = $('#' + which + '-view');
  if (targetView) targetView.classList.add('active');
  
  $$('.view-switch .tab').forEach(b => b.classList.remove('active'));
  const targetTab = $('#view-' + which);
  if (targetTab) targetTab.classList.add('active');
}

// Assigne les clics sur les onglets
document.getElementById('view-timeline').onclick = () => setActiveView('timeline');
document.getElementById('view-list').onclick = () => setActiveView('list');
document.getElementById('view-cards').onclick = () => setActiveView('cards');

console.log('✅ Onglets Liste et Cartes RÉACTIVÉS');

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
loadSiteConfig();

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

// INIT
if (isAdmin) {
  adminUser = { id: sessionStorage.getItem('adminId'), email: sessionStorage.getItem('adminEmail') };
  mountAdmin();
} else {
  unmountAdmin();
}
// ✅ RÉACTIVE COMPLÈTEMENT LES ONGLETS
function setupViewSwitchers() {
  const timelineBtn = document.getElementById('view-timeline');
  const listBtn = document.getElementById('view-list');
  const cardsBtn = document.getElementById('view-cards');
  
  console.log('🔍 Timeline:', timelineBtn);
  console.log('🔍 List:', listBtn);
  console.log('🔍 Cards:', cardsBtn);
  
  if (timelineBtn) timelineBtn.onclick = () => {
    $$('.view').forEach(v => v.classList.remove('active'));
    $$('.view-switch .tab').forEach(b => b.classList.remove('active'));
    $('#timeline-view')?.classList.add('active');
    timelineBtn.classList.add('active');
    console.log('✅ Timeline activée');
  };
  
  if (listBtn) listBtn.onclick = () => {
    $$('.view').forEach(v => v.classList.remove('active'));
    $$('.view-switch .tab').forEach(b => b.classList.remove('active'));
    $('#list-view')?.classList.add('active');
    listBtn.classList.add('active');
    console.log('✅ List activée');
  };
  
  if (cardsBtn) cardsBtn.onclick = () => {
    $$('.view').forEach(v => v.classList.remove('active'));
    $$('.view-switch .tab').forEach(b => b.classList.remove('active'));
    $('#cards-view')?.classList.add('active');
    cardsBtn.classList.add('active');
    console.log('✅ Cards activée');
  };
}

setupViewSwitchers();
console.log('✅ ONGLETS RÉACTIVÉS');

