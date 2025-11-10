// Supabase init
// Supabase init - VÉRIFIE CES 3 LIGNES
const SUPABASE_URL = 'https://duqkrpgcqbasbnzynfuh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1cWtycGdjcWJhc2JuenluZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NDM5NTAsImV4cCI6MjA3NjExOTk1MH0.nikdF6TMoFgQHSeEtpfXjWHNOazALoFF_stkunz8OcU';



// Log pour debug
console.log('Supabase URL:', SUPABASE_URL);
console.log('Clé présente:', !!SUPABASE_ANON_KEY);

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Teste la connexion
supabase.from('events').select('*').then(res => {
  console.log('Événements chargés:', res.data?.length, 'lignes');
}).catch(err => {
  console.error('Erreur Supabase:', err);
});


// Helpers
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const toast = (msg) => {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
};

// Theme
(function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
  $('#theme-toggle').textContent = theme === 'dark' ? '☀️' : '🌙';
  $('#theme-toggle').onclick = () => {
    const newTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = newTheme;
    localStorage.setItem('theme', newTheme);
    $('#theme-toggle').textContent = newTheme === 'dark' ? '☀️' : '🌙';
  };
})();

// Modal system
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

// Admin
const ADMIN_EMAIL = 'zinck.maxime@gmail.com';
const ADMIN_PASS = 'Zz/max789';
let isAdmin = sessionStorage.getItem('isAdmin') === '1';

$('#admin-toggle').onclick = () => modal.open('#modal-admin');

$('#admin-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = $('#admin-email').value.trim();
  const pass = $('#admin-password').value;
  if (email === ADMIN_EMAIL && pass === ADMIN_PASS) {
    sessionStorage.setItem('isAdmin', '1');
    isAdmin = true;
    modal.closeAll();
    mountAdmin();
    toast('✅ Connecté en tant qu'admin');
  } else {
    toast('❌ Identifiants incorrects');
  }
});

function unmountAdmin() {
  const host = $('#admin-section');
  host.innerHTML = '';
  host.hidden = true;
  host.setAttribute('aria-hidden', 'true');
}

function mountAdmin() {
  const host = $('#admin-section');
  host.hidden = false;
  host.removeAttribute('aria-hidden');
  host.innerHTML = `
    <h2>Administration</h2>
    <div class="tabs">
      <button data-tab="dash" class="tab active">Dashboard</button>
      <button data-tab="events" class="tab">Événements</button>
      <button data-tab="stats" class="tab">Statistiques</button>
      <span style="margin-left:auto"></span>
      <button id="admin-logout" class="btn btn-primary">Déconnexion</button>
    </div>
    <div class="tab-panels">
      <div id="tab-dash" class="tab-panel active">
        <div class="kpi-grid">
          <div class="kpi"><div class="kpi-label">Total Inscrits</div><div id="kpi-total" class="kpi-value">0</div></div>
          <div class="kpi"><div class="kpi-label">Événements Actifs</div><div id="kpi-actifs" class="kpi-value">0</div></div>
          <div class="kpi"><div class="kpi-label">Emails Uniques</div><div id="kpi-emails" class="kpi-value">0</div></div>
          <div class="kpi"><div class="kpi-label">Taux Moyen</div><div id="kpi-taux" class="kpi-value">0%</div></div>
        </div>
      </div>
      <div id="tab-events" class="tab-panel">
        <div id="admin-events-cards" class="cards-grid"></div>
      </div>
      <div id="tab-stats" class="tab-panel">
        <div id="stats-content">Statistiques en cours de développement...</div>
      </div>
    </div>`;
  
  $$('#admin-section .tabs .tab').forEach(btn => {
    btn.onclick = () => {
      $$('#admin-section .tabs .tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      $$('#admin-section .tab-panel').forEach(p => p.classList.remove('active'));
      $('#tab-' + btn.dataset.tab).classList.add('active');
    };
  });
  
  $('#admin-logout').onclick = () => {
    sessionStorage.removeItem('isAdmin');
    isAdmin = false;
    unmountAdmin();
    toast('Déconnecté');
  };
  
  loadAdminData();
}

async function loadAdminData() {
  const [inscRes, eventsRes, emailsRes] = await Promise.all([
    supabase.from('inscriptions').select('id', { count: 'exact', head: true }),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('visible', true).eq('archived', false),
    supabase.from('inscriptions').select('email')
  ]);
  
  $('#kpi-total').textContent = inscRes.count || 0;
  $('#kpi-actifs').textContent = eventsRes.count || 0;
  const uniqueEmails = new Set((emailsRes.data || []).map(x => x.email));
  $('#kpi-emails').textContent = uniqueEmails.size;
  
  const { data: allEvents } = await supabase.from('events')
    .select('id, max_participants, inscriptions(count)')
    .order('date');
  const rates = (allEvents || []).map(e => {
    const count = e.inscriptions?.[0]?.count || 0;
    return count / Math.max(1, e.max_participants);
  });
  const avgRate = rates.length ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100) : 0;
  $('#kpi-taux').textContent = avgRate + '%';
}

if (isAdmin) mountAdmin();
else unmountAdmin();

// Public events
async function fetchPublicEvents() {
  const { data } = await supabase.from('events')
    .select('*')
    .eq('visible', true)
    .eq('archived', false)
    .order('date', { ascending: true });
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
  btn.textContent = 'S'inscrire';
  btn.classList.add('btn', 'btn-primary');
  btn.onclick = () => openInscription(ev);
}

function renderTimeline(events) {
  const root = $('#timeline-view');
  root.innerHTML = '';
  events.forEach(ev => {
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
      <p>${ev.description || ''}</p>`;
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
  events.forEach(ev => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${ev.date} ${ev.heure || ''}</td>
      <td>${ev.titre}</td>
      <td>${ev.lieu}</td>
      <td>${ev.max_participants || ''}</td>
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
  events.forEach(ev => {
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
      <p>${ev.description || ''}</p>`;
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

// Inscription form
$('#insc-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const prenom = fd.get('prenom')?.trim();
  const nom = fd.get('nom')?.trim();
  const email = fd.get('email')?.trim();
  const telephone = fd.get('telephone')?.trim();
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
    commentaire,
    preparation_salle,
    partie_evenement,
    evenement_entier
  });
  
  if (error) {
    console.error(error);
    toast('❌ Erreur lors de l'inscription');
    return;
  }
  
  toast('✅ Inscription enregistrée !');
  modal.closeAll();
  e.target.reset();
  loadPublic();
});

// Archivage automatique minuit
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
        console.log('Archivage automatique effectué');
      }
    }
  }, 60000);
}
scheduleAutoArchive();
