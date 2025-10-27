// Ohlun'Joie V3.0 - JavaScript complet
// Supabase, CRUD, Analytics, Exports, Theme

const SUPABASE_URL = 'https://duqkrpgcqbasbnzynfuh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1cWtycGdjcWJhc2JuenluZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NDM5NTAsImV4cCI6MjA3NjExOTk1MH0.nikdF6TMoFgQHSeEtpfXjWHNOazALoFF_stkunz8OcU';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
/* === Patch compat app initiale (append only) === */

// Adoucir transitions au chargement pour éviter flash
document.addEventListener('DOMContentLoaded', () => {
  document.body.style.transition = 'background-color 0.25s ease, color 0.25s ease';
});

// Mapper des classes “compat” si besoin d’accroches CSS
(function ensureCompatHooks(){
  const ec = document.getElementById('eventsContainer');
  if (ec && !ec.classList.contains('compat-events')) ec.classList.add('compat-events');
  const ac = document.getElementById('adminEventsCards');
  if (ac && !ac.classList.contains('compat-admin-cards')) ac.classList.add('compat-admin-cards');
})();

// Uniformiser le focus des boutons
['view-btn','filter-btn','primary','secondary','danger'].forEach(cls => {
  document.querySelectorAll('.' + cls).forEach(b => b.setAttribute('tabindex','0'));
});

// Petite amélioration accessibilité pour toasts
(function a11yToast(){
  const t = document.getElementById('toast');
  if (t) { t.setAttribute('role','status'); t.setAttribute('aria-live','polite'); }
})();

// Raccourcis claviers (ex: g pour “aller à” onglet Events en admin)
document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'g' && document.getElementById('tab-events')) {
    document.querySelector('.tab-btn[data-tab="events"]')?.click();
  }
});

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

let currentAdmin = null;
let eventsFilter = 'actifs';

// THEME
function applyTheme() {
  const preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const saved = localStorage.getItem('theme');
  const theme = saved || (preferDark ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
  $('#themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}
applyTheme();
$('#themeToggle').addEventListener('click', () => {
  const current = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', current);
  applyTheme();
});

// TOASTS
function showToast(msg, variant='info') {
  const toast = $('#toast');
  toast.textContent = msg;
  toast.className = `toast show ${variant}`;
  setTimeout(() => toast.className = 'toast', 3000);
}

// SPINNER
function withSpinner(promise) {
  $('#spinner').setAttribute('data-show', '1');
  return promise.finally(() => $('#spinner').removeAttribute('data-show'));
}

// CONFIRM
function confirmDialog(message) {
  return new Promise((resolve) => {
    const dlg = $('#confirmModal');
    $('#confirmMessage').textContent = message;
    const ok = $('#confirmOk');
    const cancel = $('#confirmCancel');
    const onOk = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };
    function cleanup() {
      ok.removeEventListener('click', onOk);
      cancel.removeEventListener('click', onCancel);
      dlg.close();
    }
    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);
    dlg.showModal();
  });
}

// VALIDATIONS
function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
}
function isPhoneFR(s) {
  return /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s\.-]*\d{2}){4}$/.test(String(s).trim());
}

// ANALYTICS
async function insertAnalytics(event_type, event_id=null, page_name='home') {
  await sb.from('analytics').insert([{ event_type, event_id, page_name, user_agent: navigator.userAgent }], { returning: 'minimal' });
}
insertAnalytics('page_view', null, 'home');

// LOAD CONFIG & EVENTS PUBLIC
async function loadIntroAndTypes() {
  const { data } = await sb.from('app_config').select('key,value');
  const map = Object.fromEntries((data||[]).map(r => [r.key, r.value]));
  $('#introText').textContent = map.intro_text || '';
  $('#app-logo').textContent = (map.logo_url && map.logo_url.startsWith('data:')) ? '🖼️' : '📅';
  try {
    const types = JSON.parse(map.event_types || '[]');
    const sel = $('#eventTypeSelect');
    sel.innerHTML = '';
    types.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      sel.appendChild(opt);
    });
  } catch {}
}

async function loadPublicEvents() {
  const { data, error } = await sb.from('events')
    .select('*')
    .eq('visible', true)
    .eq('archived', false)
    .order('date', { ascending: true })
    .order('heure', { ascending: true });
  if (error) {
    showToast("Erreur chargement événements", 'error');
    return [];
  }
  renderPublicEvents(data || []);
  populateInscriptionEventSelect(data || []);
  updateNextEventCountdown(data || []);
  return data || [];
}

function renderPublicEvents(events) {
  const container = $('#eventsContainer');
  container.innerHTML = '';
  const activeView = $('.view-btn.active')?.dataset.view || 'timeline';
  if (activeView === 'list') {
    const ul = document.createElement('ul');
    ul.className = 'list-view';
    events.forEach(ev => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `
        <button class="event-link" data-event-id="${ev.id}">
          <span class="emoji">${ev.image || '📅'}</span>
          <span class="title">${ev.titre}</span>
          <span class="meta">${ev.date} · ${ev.heure} · ${ev.lieu}</span>
        </button>`;
      ul.appendChild(li);
    });
    container.appendChild(ul);
  } else if (activeView === 'cards') {
    const grid = document.createElement('div');
    grid.className = 'cards-view';
    events.forEach(ev => {
      const card = document.createElement('article');
      card.className = 'event-card';
      card.innerHTML = `
        <header>
          <div class="emoji">${ev.image || '📅'}</div>
          <h3>${ev.titre}</h3>
          <div class="meta">${ev.date} · ${ev.heure} · ${ev.lieu}</div>
        </header>
        <p>${ev.description}</p>
        <footer>
          <button class="event-link primary" data-event-id="${ev.id}">Détails</button>
        </footer>
      `;
      grid.appendChild(card);
    });
    container.appendChild(grid);
  } else {
    const tl = document.createElement('div');
    tl.className = 'timeline';
    events.forEach(ev => {
      const item = document.createElement('div');
      item.className = 'timeline-item';
      item.innerHTML = `
        <div class="timeline-dot">${ev.image || '📅'}</div>
        <div class="timeline-content">
          <h3>${ev.titre}</h3>
          <div class="meta">${ev.date} · ${ev.heure} · ${ev.lieu} · ${ev.type}</div>
          <p>${ev.description}</p>
          <button class="event-link" data-event-id="${ev.id}">Voir</button>
        </div>`;
      tl.appendChild(item);
    });
    container.appendChild(tl);
  }

  $$('.event-link', container).forEach(btn => {
    btn.addEventListener('click', async () => {
      await insertAnalytics('event_click', Number(btn.dataset.eventId));
      showToast('Événement sélectionné', 'success');
    });
  });
}

function populateInscriptionEventSelect(events) {
  const sel = $('#inscriptionEventSelect');
  sel.innerHTML = '';
  events.forEach(ev => {
    const opt = document.createElement('option');
    opt.value = ev.id;
    opt.textContent = `${ev.titre} — ${ev.date} ${ev.heure}`;
    sel.appendChild(opt);
  });
}

function updateNextEventCountdown(events) {
  const next = events[0];
  const el = $('#nextEventCountdown');
  if (!next) {
    el.textContent = '';
    return;
  }
  const target = new Date(`${next.date}T${next.heure}`);
  const days = Math.ceil((target - new Date()) / (1000 * 60 * 60 * 24));
  el.textContent = `Prochain événement dans ${Math.max(days,0)} jours`;
}

// VIEW SWITCH
$$('.view-btn').forEach(btn => btn.addEventListener('click', async () => {
  $$('.view-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const events = await loadPublicEvents();
  renderPublicEvents(events);
}));

// INSCRIPTION FORM
$('#inscriptionForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const data = Object.fromEntries(fd.entries());
  const checks = ['preparation_salle','partie_evenement','evenement_entier'];
  const anyCheck = checks.some(k => fd.get(k) === 'on');
  if (!data.prenom?.trim() || !data.nom?.trim()) return showToast('Prénom et Nom requis', 'error');
  if (!isEmail(data.email)) return showToast('Email invalide', 'error');
  if (!isPhoneFR(data.telephone)) return showToast('Téléphone FR invalide', 'error');
  if (!anyCheck) return showToast('Sélectionnez au moins une participation', 'error');
  if (!data.event_id) return showToast('Sélectionnez un événement', 'error');

  const payload = {
    event_id: Number(data.event_id),
    prenom: data.prenom.trim(),
    nom: data.nom.trim(),
    email: data.email.trim(),
    telephone: data.telephone.trim(),
    commentaire: data.commentaire?.trim() || null,
    preparation_salle: fd.get('preparation_salle') === 'on',
    partie_evenement: fd.get('partie_evenement') === 'on',
    evenement_entier: fd.get('evenement_entier') === 'on',
  };

  await withSpinner(
    sb.from('inscriptions').insert([payload], { returning: 'minimal' })
      .then(() => showToast('Inscription enregistrée', 'success'))
      .then(() => $('#inscriptionForm').reset())
      .catch(() => showToast('Erreur lors de l\'inscription', 'error'))
  );
});

// ARCHIVAGE AUTO MINUIT
function scheduleAutoArchive() {
  setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      const lastRun = localStorage.getItem('lastArchiveRun');
      const today = now.toISOString().split('T')[0];
      if (lastRun !== today) {
        await sb.from('events').update({ archived: true }).lt('date', today).eq('archived', false);
        localStorage.setItem('lastArchiveRun', today);
        loadPublicEvents();
      }
    }
  }, 60000);
}
scheduleAutoArchive();

// ADMIN LOGIN
async function adminLogin(email, password) {
  const { data, error } = await sb.from('admins')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .maybeSingle();
  if (error || !data) return null;
  if (email === 'zinck.maxime@gmail.com' && password === 'Zz/max789') {
    return data;
  }
  return null;
}

function can(perm) {
  if (!currentAdmin) return false;
  if (currentAdmin.role === 'super_admin') return true;
  return !!currentAdmin[perm];
}

$('#adminLoginBtn').addEventListener('click', async () => {
  const email = $('#adminEmail').value.trim();
  const pass = $('#adminPassword').value;
  const user = await adminLogin(email, pass);
  if (!user) return showToast('Connexion refusée', 'error');
  currentAdmin = user;
  $('#adminUserInfo').textContent = `${user.prenom} ${user.nom} (${user.email})`;
  showToast('Connecté', 'success');
  await Promise.all([
    loadDashboardKpis(),
    loadAdminEvents(),
    loadStats(),
    loadVolunteers(),
    loadAdminsTable(),
    loadConfigForm(),
    loadLogs()
  ]);
});

// TABS
$$('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
  $$('.tab-btn').forEach(b => b.classList.remove('active'));
  $$('.tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  $(`#tab-${btn.dataset.tab}`).classList.add('active');
}));

// DASHBOARD KPIs
async function loadDashboardKpis() {
  if (!can('perm_view_events')) return;
  const [{ data: countIns }, { data: events }, { data: emails }] = await Promise.all([
    sb.from('inscriptions').select('id', { count:'exact', head:true }),
    sb.from('events').select('*').eq('archived', false).eq('visible', true),
    sb.from('inscriptions').select('email')
  ]);
  const totalIns = countIns?.length ? countIns.length : (countIns || 0);
  $('#kpiTotalInscrits').textContent = (typeof totalIns === 'number' ? totalIns : 0).toString();

  const actifs = (events || []).length;
  $('#kpiEventsActifs').textContent = String(actifs);

  const uniqueEmails = new Set((emails||[]).map(r => r.email)).size;
  $('#kpiEmailsUniques').textContent = String(uniqueEmails);

  let taux = 0;
  if (events && events.length) {
    const perEvent = await Promise.all(events.map(async ev => {
      const { data: ins } = await sb.from('inscriptions').select('id', { count: 'exact', head: true }).eq('event_id', ev.id);
      const cnt = (ins && ins.length) ? ins.length : (ins || 0);
      return ev.max_participants ? (Number(cnt) / ev.max_participants) : 0;
    }));
    taux = Math.round((perEvent.reduce((a,b)=>a+b,0) / events.length) * 100);
  }
  $('#kpiTauxMoyen').textContent = `${taux}%`;
}

// ADMIN EVENTS
function badgeFor(ev) {
  if (ev.archived) return '⚫ Archivé';
  if (!ev.visible) return '🟠 Masqué';
  return '🟢 Actif';
}

function progressBarHTML(current, max) {
  const pct = Math.min(100, Math.round((current / Math.max(1,max)) * 100));
  return `<div class="progress"><div style="width:${pct}%"></div></div><span class="progress-text">${current}/${max} participants</span>`;
}

async function loadAdminEvents() {
  if (!can('perm_view_events')) return;
  const q = sb.from('events').select('*').order('date', { ascending:true }).order('heure', { ascending:true });
  if (eventsFilter === 'actifs') q.eq('archived', false).eq('visible', true);
  if (eventsFilter === 'masques') q.eq('archived', false).eq('visible', false);
  if (eventsFilter === 'archives') q.eq('archived', true);

  const { data } = await q;
  const list = $('#adminEventsCards');
  list.innerHTML = '';

  for (const ev of (data||[])) {
    const { data: ins } = await sb.from('inscriptions').select('prenom,nom,email').eq('event_id', ev.id);
    const enrolled = (ins||[]).length;

    const card = document.createElement('article');
    card.className = 'admin-event-card';
    card.innerHTML = `
      <header>
        <div class="emoji">${ev.image || '📅'}</div>
        <div class="title">
          <h3>${ev.titre}</h3>
          <div class="meta">${ev.date} · ${ev.heure} · ${ev.lieu}</div>
        </div>
        <span class="badge">${badgeFor(ev)}</span>
      </header>
      <div class="body">
        <div class="gauge">
          ${progressBarHTML(enrolled, ev.max_participants)}
        </div>
        <details>
          <summary>Inscriptions (${enrolled})</summary>
          <ul class="ins-list">
            ${(ins||[]).map(r => `<li>${r.prenom} ${r.nom} — ${r.email}</li>`).join('')}
          </ul>
        </details>
      </div>
      <footer class="actions">
        <button class="edit-btn">✏️ Modifier</button>
        <button class="delete-btn">🗑️ Supprimer</button>
        <button class="toggle-btn">👁️ ${ev.visible ? 'Masquer' : 'Activer'}</button>
        <button class="export-btn">📥 Export CSV</button>
        ${ev.archived ? '<button class="restore-btn">🔄 Restaurer</button>' : ''}
      </footer>
    `;

    $('.edit-btn', card).addEventListener('click', () => openEventModal(ev));
    $('.delete-btn', card).addEventListener('click', async () => {
      if (!can('perm_edit_events')) return showToast('Permission refusée', 'error');
      const ok = await confirmDialog('Supprimer cet événement ?');
      if (!ok) return;
      await withSpinner(sb.from('events').delete().eq('id', ev.id));
      loadAdminEvents(); loadPublicEvents();
    });
    $('.toggle-btn', card).addEventListener('click', async () => {
      if (!can('perm_edit_events')) return showToast('Permission refusée', 'error');
      await withSpinner(sb.from('events').update({ visible: !ev.visible }).eq('id', ev.id));
      loadAdminEvents(); loadPublicEvents();
    });
    if ($('.restore-btn', card)) {
      $('.restore-btn', card).addEventListener('click', async () => {
        if (!can('perm_edit_events')) return showToast('Permission refusée', 'error');
        await withSpinner(sb.from('events').update({ archived: false }).eq('id', ev.id));
        loadAdminEvents(); loadPublicEvents();
      });
    }
    $('.export-btn', card).addEventListener('click', () => exportEventInscriptionsCsv(ev.id, ev.titre));

    list.appendChild(card);
  }
}

$$('.filter-btn').forEach(btn => btn.addEventListener('click', () => {
  $$('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  eventsFilter = btn.dataset.filter;
  loadAdminEvents();
}));

$('#openCreateEvent').addEventListener('click', () => openEventModal(null));

function openEventModal(ev) {
  if (!can('perm_edit_events')) return showToast('Permission refusée', 'error');
  const dlg = $('#eventModal');
  $('#eventModalTitle').textContent = ev ? 'Modifier l\'événement' : 'Créer un événement';
  const form = $('#eventForm');
  form.reset();
  if (ev) {
    form.titre.value = ev.titre;
    form.type.value = ev.type;
    form.date.value = ev.date;
    form.heure.value = ev.heure;
    form.lieu.value = ev.lieu;
    form.max_participants.value = ev.max_participants;
    form.image.value = ev.image || '';
    form.description.value = ev.description;
  }
  dlg.showModal();

  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!form.titre.value.trim() || !form.type.value.trim() || !form.date.value || !form.heure.value || !form.lieu.value.trim() || !form.description.value.trim()) {
      showToast('Champs requis manquants', 'error'); return;
    }
    const dateVal = new Date(form.date.value);
    const today = new Date(); today.setHours(0,0,0,0);
    if (dateVal < today) { showToast('Date invalide (>= aujourd\'hui)', 'error'); return; }
    const places = Number(form.max_participants.value);
    if (!(places > 0)) { showToast('Places > 0', 'error'); return; }

    const payload = {
      titre: form.titre.value.trim(),
      type: form.type.value.trim(),
      date: form.date.value,
      heure: form.heure.value,
      lieu: form.lieu.value.trim(),
      max_participants: places,
      image: form.image.value.trim() || '📅',
      description: form.description.value.trim()
    };

    if (ev?.id) {
      await withSpinner(sb.from('events').update(payload).eq('id', ev.id));
    } else {
      await withSpinner(sb.from('events').insert([payload], { returning: 'minimal' }));
    }
    dlg.close();
    await loadAdminEvents(); await loadPublicEvents();
  };
}

// STATS
async function loadStats() {
  if (!can('perm_view_stats')) return;
  const [{ data: pageViews }, { data: clicks }, { data: events },] = await Promise.all([
    sb.from('analytics').select('id', { count: 'exact', head: true }),
    sb.from('analytics').select('event_id').eq('event_type', 'event_click'),
    sb.from('events').select('id,titre,max_participants')
  ]);

  const totalViews = (pageViews && pageViews.length) ? pageViews.length : (pageViews || 0);
  $('#kpiPageViews').textContent = String(totalViews);

  const perEventClicks = clicks?.reduce((acc, r) => {
    if (!r.event_id) return acc;
    acc[r.event_id] = (acc[r.event_id] || 0) + 1;
    return acc;
  }, {}) || {};

  const tbody = $('#statsTable tbody');
  tbody.innerHTML = '';
  for (const ev of (events||[])) {
    const { data: ins } = await sb.from('inscriptions').select('id', { count:'exact', head:true }).eq('event_id', ev.id);
    const cnt = (ins && ins.length) ? ins.length : (ins || 0);
    const vues = Object.values(perEventClicks).length ? (perEventClicks[ev.id] || 0) : 0;
    const taux = ev.max_participants ? Math.round((Number(cnt)/ev.max_participants)*100) : 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${ev.titre}</td>
      <td>${totalViews}</td>
      <td>${vues}</td>
      <td>${cnt}</td>
      <td>${ev.max_participants}</td>
      <td>${taux}%</td>
    `;
    tbody.appendChild(tr);
  }

  $('#exportEmails').onclick = async () => {
    const { data } = await sb.from('inscriptions').select('email');
    const unique = [...new Set((data||[]).map(r => r.email))];
    const content = unique.join('; ');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'emails.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  $('#exportStatsCsv').onclick = () => {
    const rows = [['Evenement','Vues','Clics','Inscrits','Places','Taux']];
    $$('#statsTable tbody tr').forEach(tr => {
      rows.push(Array.from(tr.children).map(td => td.textContent));
    });
    downloadCsv('stats.csv', rows);
  };
}

// VOLUNTEERS
async function loadVolunteers() {
  if (!can('perm_view_volunteers')) return;
  const { data } = await sb.from('volunteer_profiles').select('*').order('last_participation', { ascending:false });
  const list = $('#volunteersList');
  list.innerHTML = '';
  const year = new Date().getFullYear();
  (data||[]).forEach(v => {
    const item = document.createElement('article');
    item.className = 'vol-card';
    item.innerHTML = `
      <header><h4>${v.prenom} ${v.nom}</h4><span class="badge">${v.total_participations} participations en ${year}</span></header>
      <div class="meta">${v.email} · ${v.telephone || ''}</div>
      <div class="actions"><button class="history-btn">Historique</button></div>
      <div class="history" hidden></div>
    `;
    $('.history-btn', item).addEventListener('click', async () => {
      const { data: ins } = await sb.from('inscriptions')
        .select('event_id, date_inscription')
        .eq('email', v.email);
      const ids = [...new Set((ins||[]).map(r => r.event_id))];
      const { data: evs } = await sb.from('events').select('id,titre,date').in('id', ids);
      const hist = $('.history', item);
      hist.hidden = !hist.hidden;
      hist.innerHTML = `<ul>${(evs||[]).map(e => `<li>${e.titre} — ${e.date}</li>`).join('')}</ul>`;
    });
    list.appendChild(item);
  });

  $('#searchVolunteer').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    $$('#volunteersList .vol-card').forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? '' : 'none';
    });
  };

  $('#exportVolunteersCsv').onclick = () => {
    const rows = [['Prenom','Nom','Email','Telephone','Total','First','Last']];
    (data||[]).forEach(v => rows.push([v.prenom, v.nom, v.email, v.telephone||'', v.total_participations, v.first_participation||'', v.last_participation||'']));
    downloadCsv('volunteers.csv', rows);
  };
}

// ADMINS
async function loadAdminsTable() {
  if (!can('perm_manage_admins')) return;
  const { data } = await sb.from('admins').select('*').order('created_at', { ascending:false });
  const tbody = $('#adminsTable tbody');
  tbody.innerHTML = '';
  (data||[]).forEach(a => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${a.email}</td>
      <td>${a.prenom} ${a.nom}</td>
      <td><input type="checkbox" ${a.perm_view_events ? 'checked':''} data-k="perm_view_events"></td>
      <td><input type="checkbox" ${a.perm_edit_events ? 'checked':''} data-k="perm_edit_events"></td>
      <td><input type="checkbox" ${a.perm_view_stats ? 'checked':''} data-k="perm_view_stats"></td>
      <td><input type="checkbox" ${a.perm_view_logs ? 'checked':''} data-k="perm_view_logs"></td>
      <td><input type="checkbox" ${a.perm_view_volunteers ? 'checked':''} data-k="perm_view_volunteers"></td>
      <td><input type="checkbox" ${a.perm_manage_admins ? 'checked':''} data-k="perm_manage_admins"></td>
      <td><input type="checkbox" ${a.perm_config ? 'checked':''} data-k="perm_config"></td>
      <td>
        <button class="save-admin">Enregistrer</button>
        <button class="delete-admin danger">Supprimer</button>
      </td>
    `;
    $('.save-admin', tr).addEventListener('click', async () => {
      if (!can('perm_manage_admins')) return showToast('Permission refusée', 'error');
      const updates = {};
      $$('input[type="checkbox"]', tr).forEach(cb => { updates[cb.dataset.k] = cb.checked; });
      await sb.from('admins').update(updates).eq('id', a.id);
      showToast('Admin mis à jour', 'success');
    });
    $('.delete-admin', tr).addEventListener('click', async () => {
      if (!can('perm_manage_admins')) return showToast('Permission refusée', 'error');
      if (!(await confirmDialog('Supprimer cet admin ?'))) return;
      await sb.from('admins').delete().eq('id', a.id);
      loadAdminsTable();
    });
    tbody.appendChild(tr);
  });

  $('#openCreateAdmin').onclick = async () => {
    if (!can('perm_manage_admins')) return showToast('Permission refusée', 'error');
    const email = prompt('Email ?'); if (!email) return;
    const prenom = prompt('Prénom ?') || '';
    const nom = prompt('Nom ?') || '';
    const password_hash = 'placeholder';
    const { error } = await sb.from('admins').insert([{ email, prenom, nom, password_hash }], { returning: 'minimal' });
    if (error) return showToast('Erreur création', 'error');
    loadAdminsTable();
  };
}

// CONFIG
async function loadConfigForm() {
  if (!can('perm_config')) return;
  const { data } = await sb.from('app_config').select('key,value');
  const map = Object.fromEntries((data||[]).map(r => [r.key, r.value]));
  $('#introTextInput').value = map.intro_text || '';
  $('#eventTypesInput').value = map.event_types || '[]';
  const logo = map.logo_url || '';
  $('#logoPreview').innerHTML = logo ? `<img src="${logo}" alt="logo" />` : '';
}

$('#saveConfig').addEventListener('click', async () => {
  if (!can('perm_config')) return showToast('Permission refusée', 'error');
  const intro = $('#introTextInput').value;
  const types = $('#eventTypesInput').value;
  await sb.from('app_config').upsert([{ key:'intro_text', value:intro }, { key:'event_types', value:types }]);
  showToast('Configuration enregistrée', 'success');
  loadIntroAndTypes();
});

$('#saveLogo').addEventListener('click', async () => {
  if (!can('perm_config')) return showToast('Permission refusée', 'error');
  const file = $('#logoInput').files[0];
  if (!file) return showToast('Aucun fichier', 'error');
  if (file.size > 2*1024*1024) return showToast('Max 2MB', 'error');
  const fr = new FileReader();
  fr.onload = async () => {
    await sb.from('app_config').upsert([{ key:'logo_url', value: fr.result }]);
    showToast('Logo enregistré', 'success');
    loadConfigForm(); loadIntroAndTypes();
  };
  fr.readAsDataURL(file);
});

$('#deleteLogo').addEventListener('click', async () => {
  if (!can('perm_config')) return showToast('Permission refusée', 'error');
  await sb.from('app_config').upsert([{ key:'logo_url', value: '' }]);
  showToast('Logo supprimé', 'success');
  loadConfigForm(); loadIntroAndTypes();
});

// LOGS
async function loadLogs() {
  if (!can('perm_view_logs')) return;
  const { data } = await sb.from('activity_logs').select('*').order('timestamp', { ascending:false }).limit(100);
  const list = $('#logsList');
  list.innerHTML = '';
  (data||[]).forEach(l => {
    const it = document.createElement('div');
    it.className = 'log-item';
    it.textContent = `${l.timestamp} — ${l.admin_email} — ${l.action} ${l.entity_type}#${l.entity_id || ''}`;
    list.appendChild(it);
  });
}

// EXPORTS CSV
function downloadCsv(filename, rows) {
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function exportEventInscriptionsCsv(eventId, titre) {
  const { data } = await sb.from('inscriptions').select('*').eq('event_id', eventId);
  const rows = [['Prenom','Nom','Email','Telephone','Commentaire','PrepSalle','Partie','Entier','Date']];
  (data||[]).forEach(i => rows.push([i.prenom,i.nom,i.email,i.telephone,i.commentaire||'',i.preparation_salle,i.partie_evenement,i.evenement_entier,i.date_inscription]));
  downloadCsv(`inscriptions-${titre}.csv`, rows);
}

// BOOT
async function boot() {
  await loadIntroAndTypes();
  await loadPublicEvents();
}
boot();
