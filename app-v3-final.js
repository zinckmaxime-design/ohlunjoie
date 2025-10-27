// app.js - Ohlun'Joie V3.0 - JavaScript complet

const SUPABASE_URL = 'https://duqkrpgcqbasbnzynfuh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1cWtycGdjcWJhc2JuenluZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NDM5NTAsImV4cCI6MjA3NjExOTk1MH0.nikdF6TMoFgQHSeEtpfXjWHNOazALoFF_stkunz8OcU';

let supabase;
let currentUser = null;
let currentView = 'timeline';
let currentEventFilter = 'actifs';
let allEvents = [];
let allAnalytics = [];

window.addEventListener('DOMContentLoaded', async () => {
  initSupabase();
  setupTheme();
  setupEventListeners();
  
  await loadAppConfig();
  await loadPublicEvents();
  await trackPageView();
  setupCountdown();
  setupAutoArchive();
});

// ===== SUPABASE INIT =====
function initSupabase() {
  const { createClient } = window.supabase;
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ===== THEME MANAGEMENT =====
function setupTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (prefersDark ? 'dark' : 'light');
  
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcons(theme);
}

function updateThemeIcons(theme) {
  document.querySelectorAll('.icon-sun, .icon-moon').forEach(el => {
    el.style.display = 'none';
  });
  if (theme === 'dark') {
    document.querySelectorAll('.icon-sun').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.icon-moon').forEach(el => el.style.display = 'block');
  } else {
    document.querySelectorAll('.icon-sun').forEach(el => el.style.display = 'block');
    document.querySelectorAll('.icon-moon').forEach(el => el.style.display = 'none');
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcons(newTheme);
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
  document.getElementById('theme-toggle-admin')?.addEventListener('click', toggleTheme);
  
  document.getElementById('admin-login-btn')?.addEventListener('click', () => {
    showModal('modal-admin-login');
  });
  
  document.getElementById('form-admin-login')?.addEventListener('submit', handleAdminLogin);
  document.getElementById('admin-logout-btn')?.addEventListener('click', handleAdminLogout);
  
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentView = e.target.dataset.view;
      renderEvents(allEvents);
    });
  });
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentEventFilter = e.target.dataset.filter;
      renderAdminEvents();
    });
  });
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.target.dataset.tab;
      switchAdminTab(tabName);
    });
  });
  
  document.getElementById('btn-add-event')?.addEventListener('click', () => {
    resetEventForm();
    document.getElementById('modal-event-form-title').textContent = 'Créer un événement';
    showModal('modal-event-form');
  });
  
  document.getElementById('form-event')?.addEventListener('submit', handleEventSubmit);
  document.getElementById('btn-add-admin')?.addEventListener('click', handleAddAdmin);
  document.getElementById('btn-export-emails')?.addEventListener('click', exportEmails);
  document.getElementById('btn-export-stats-csv')?.addEventListener('click', exportStatsCsv);
  document.getElementById('btn-export-volunteers-csv')?.addEventListener('click', exportVolunteersCsv);
  document.getElementById('volunteers-search')?.addEventListener('input', debounce(filterVolunteers, 300));
  
  document.getElementById('config-logo-upload')?.addEventListener('change', handleLogoUpload);
  document.getElementById('config-logo-delete')?.addEventListener('click', deleteConfigLogo);
  document.getElementById('config-intro-save')?.addEventListener('click', saveIntroText);
  document.getElementById('config-types-save')?.addEventListener('click', saveEventTypes);
  
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('.modal').classList.remove('active');
    });
  });
  
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
  
  document.getElementById('form-inscription')?.addEventListener('submit', handleInscription);
}

// ===== APP CONFIG =====
async function loadAppConfig() {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('*');
    
    if (error) throw error;
    
    data?.forEach(config => {
      if (config.key === 'intro_text') {
        document.getElementById('intro-text').textContent = config.value;
        document.getElementById('config-intro-text').value = config.value;
      }
      if (config.key === 'logo_url' && config.value) {
        const logoImg = document.getElementById('app-logo');
        logoImg.src = config.value;
        logoImg.style.display = 'block';
        const preview = document.getElementById('config-logo-preview');
        preview.src = config.value;
        preview.style.display = 'block';
        document.getElementById('config-logo-delete').style.display = 'block';
      }
      if (config.key === 'event_types') {
        try {
          const types = JSON.parse(config.value);
          populateEventTypeSelect(types);
          document.getElementById('config-event-types').value = config.value;
        } catch (e) {
          // Ignore JSON errors
        }
      }
    });
  } catch (err) {
    console.error('Error loading config:', err);
  }
}

function populateEventTypeSelect(types) {
  const select = document.getElementById('event-type');
  if (!select) return;
  
  select.innerHTML = '<option value="">-- Sélectionner --</option>';
  types.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    select.appendChild(option);
  });
}

// ===== PUBLIC EVENTS =====
async function loadPublicEvents() {
  try {
    document.getElementById('events-loading').style.display = 'block';
    document.getElementById('events-empty').style.display = 'none';
    document.getElementById('events-container').innerHTML = '';
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('visible', true)
      .eq('archived', false)
      .order('date', { ascending: true });
    
    if (error) throw error;
    
    allEvents = data || [];
    renderEvents(allEvents);
    document.getElementById('events-loading').style.display = 'none';
    
    if (allEvents.length === 0) {
      document.getElementById('events-empty').style.display = 'block';
    }
  } catch (err) {
    showToast('Erreur lors du chargement des événements', 'error');
    document.getElementById('events-loading').style.display = 'none';
  }
}

function renderEvents(events) {
  const container = document.getElementById('events-container');
  
  if (currentView === 'timeline') {
    renderTimelineView(events, container);
  } else if (currentView === 'list') {
    renderListView(events, container);
  } else if (currentView === 'cards') {
    renderCardsView(events, container);
  }
}

function renderTimelineView(events, container) {
  container.className = 'events-timeline';
  container.innerHTML = events.map(event => `
    <div class="event-card-timeline" onclick="openEventDetail(${event.id})">
      <div class="event-emoji">${event.image}</div>
      <div class="event-content">
        <h3 class="event-title">${escapeHtml(event.titre)}</h3>
        <div class="event-meta">
          <div class="event-meta-item">📅 ${formatDate(event.date)}</div>
          <div class="event-meta-item">🕐 ${event.heure}</div>
          <div class="event-meta-item">📍 ${escapeHtml(event.lieu)}</div>
        </div>
        <p class="event-description">${escapeHtml(event.description || 'Pas de description')}</p>
        <div class="event-footer">
          <span class="event-participants">👥 Places limitées</span>
          <button class="event-cta">S'inscrire →</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderListView(events, container) {
  container.className = 'events-list';
  container.innerHTML = events.map(event => `
    <div class="event-card-list" onclick="openEventDetail(${event.id})">
      <div class="event-list-left">
        <div class="event-list-emoji">${event.image}</div>
        <div class="event-list-info">
          <h3>${escapeHtml(event.titre)}</h3>
          <div class="event-list-date">${formatDate(event.date)} à ${event.heure} • ${escapeHtml(event.lieu)}</div>
        </div>
      </div>
      <div class="event-list-badge">S'inscrire</div>
    </div>
  `).join('');
}

function renderCardsView(events, container) {
  container.className = 'events-cards';
  container.innerHTML = events.map(event => {
    const description = (event.description || 'Pas de description').substring(0, 100);
    return `
      <div class="event-card-grid" onclick="openEventDetail(${event.id})">
        <div class="event-card-header">
          <div class="event-card-emoji-large">${event.image}</div>
          <h3 class="event-card-title">${escapeHtml(event.titre)}</h3>
        </div>
        <div class="event-card-body">
          <div class="event-card-info">
            <div class="event-card-info-item">📅 ${formatDate(event.date)}</div>
            <div class="event-card-info-item">🕐 ${event.heure}</div>
            <div class="event-card-info-item">📍 ${escapeHtml(event.lieu)}</div>
          </div>
          <p class="event-card-desc">${escapeHtml(description)}</p>
          <button class="event-card-action">S'inscrire</button>
        </div>
      </div>
    `;
  }).join('');
}

// ===== EVENT DETAIL & INSCRIPTION =====
async function openEventDetail(eventId) {
  const event = allEvents.find(e => e.id === eventId);
  if (!event) return;
  
  await trackEventClick(eventId);
  
  const modalInfo = document.getElementById('modal-event-info');
  modalInfo.innerHTML = `
    <div style="margin-bottom: 24px;">
      <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 8px;"><strong>Description:</strong></p>
      <p>${escapeHtml(event.description || 'Pas de description')}</p>
      <div style="margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div>
          <p style="font-size: 0.9rem; color: var(--text-muted);"><strong>Date:</strong> ${formatDate(event.date)}</p>
        </div>
        <div>
          <p style="font-size: 0.9rem; color: var(--text-muted);"><strong>Heure:</strong> ${event.heure}</p>
        </div>
        <div>
          <p style="font-size: 0.9rem; color: var(--text-muted);"><strong>Lieu:</strong> ${escapeHtml(event.lieu)}</p>
        </div>
        <div>
          <p style="font-size: 0.9rem; color: var(--text-muted);"><strong>Type:</strong> ${escapeHtml(event.type)}</p>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('modal-event-title').textContent = event.titre;
  document.getElementById('inscr-prenom').value = '';
  document.getElementById('inscr-nom').value = '';
  document.getElementById('inscr-email').value = '';
  document.getElementById('inscr-telephone').value = '';
  document.querySelectorAll('input[name="participation"]').forEach(cb => cb.checked = false);
  
  document.getElementById('form-inscription').dataset.eventId = eventId;
  
  showModal('modal-event-detail');
}

async function handleInscription(e) {
  e.preventDefault();
  
  const eventId = parseInt(document.getElementById('form-inscription').dataset.eventId);
  const prenom = document.getElementById('inscr-prenom').value.trim();
  const nom = document.getElementById('inscr-nom').value.trim();
  const email = document.getElementById('inscr-email').value.trim();
  const telephone = document.getElementById('inscr-telephone').value.trim();
  
  // Validations
  if (!prenom || !nom || !email || !telephone) {
    showToast('Veuillez remplir tous les champs', 'error');
    return;
  }
  
  if (!isValidEmail(email)) {
    showToast('Email invalide', 'error');
    return;
  }
  
  if (!isValidPhoneFR(telephone)) {
    showToast('Téléphone invalide (format: 06 12 34 56 78)', 'error');
    return;
  }
  
  const checkedParticipations = Array.from(document.querySelectorAll('input[name="participation"]:checked'))
    .map(cb => cb.value);
  
  if (checkedParticipations.length === 0) {
    showToast('Sélectionnez au moins 1 type de participation', 'error');
    return;
  }
  
  const participationObj = {};
  checkedParticipations.forEach(p => {
    participationObj[p] = true;
  });
  
  try {
    const { error } = await supabase
      .from('inscriptions')
      .insert({
        event_id: eventId,
        email: email,
        nom: nom,
        prenom: prenom,
        telephone: telephone,
        participations: participationObj
      });
    
    if (error) {
      if (error.message.includes('unique')) {
        showToast('Vous êtes déjà inscrit à cet événement', 'error');
      } else {
        throw error;
      }
      return;
    }
    
    showToast('✅ Inscription confirmée !', 'success');
    document.getElementById('form-inscription').reset();
    document.getElementById('modal-event-detail').classList.remove('active');
    
  } catch (err) {
    showToast('Erreur lors de l\'inscription', 'error');
  }
}

// ===== ADMIN LOGIN =====
async function handleAdminLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !data) {
      showToast('Email ou mot de passe incorrect', 'error');
      return;
    }
    
    // Simple bcrypt check (en production, utiliser une vraie vérification)
    if (!await verifyPassword(password, data.password_hash)) {
      showToast('Email ou mot de passe incorrect', 'error');
      return;
    }
    
    currentUser = data;
    localStorage.setItem('currentUser', JSON.stringify(data));
    
    switchToAdminView();
    showToast('✅ Connexion réussie', 'success');
    
  } catch (err) {
    showToast('Erreur lors de la connexion', 'error');
  }
}

async function verifyPassword(plainPassword, hash) {
  // Simulation bcrypt (en production, utiliser bcryptjs ou un backend)
  // Pour la démo: hash = "$2b$10$IgjBfRSpPy0hDo0kG5/N3O5YJpUl7HTDCNp2AyZyOrWXNgtGLwUJ."
  // password = "Zz/max789"
  
  // Vérification simplifiée pour la démo
  if (hash === '$2b$10$IgjBfRSpPy0hDo0kG5/N3O5YJpUl7HTDCNp2AyZyOrWXNgtGLwUJ.' &&
      plainPassword === 'Zz/max789') {
    return true;
  }
  return false;
}

function switchToAdminView() {
  document.getElementById('public-view').style.display = 'none';
  document.getElementById('admin-view').style.display = 'block';
  document.getElementById('admin-user-display').textContent = `👤 ${currentUser.prenom} ${currentUser.nom}`;
  document.getElementById('modal-admin-login').classList.remove('active');
  
  loadAdminDashboard();
  loadAdminEvents();
  loadAdminStats();
  loadAdminVolunteers();
  loadAdminAdmins();
  loadAdminLogs();
}

function handleAdminLogout() {
  currentUser = null;
  localStorage.removeItem('currentUser');
  document.getElementById('public-view').style.display = 'block';
  document.getElementById('admin-view').style.display = 'none';
  showToast('Déconnecté avec succès', 'success');
}

// ===== ADMIN DASHBOARD =====
async function loadAdminDashboard() {
  try {
    // Total inscrits
    const { count: inscritCount } = await supabase
      .from('inscriptions')
      .select('*', { count: 'exact', head: true });
    
    // Événements actifs
    const { data: activeEvents } = await supabase
      .from('events')
      .select('*')
      .eq('visible', true)
      .eq('archived', false);
    
    // Emails uniques
    const { data: allInscriptions } = await supabase
      .from('inscriptions')
      .select('email');
    
    const uniqueEmails = new Set(allInscriptions?.map(i => i.email) || []).size;
    
    // Taux moyen
    let averageRate = 0;
    if (activeEvents && activeEvents.length > 0) {
      const rates = activeEvents.map(e => {
        const count = allInscriptions?.filter(i => i.event_id === e.id).length || 0;
        return (count / e.max_participants) * 100;
      });
      averageRate = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
    }
    
    document.getElementById('kpi-inscrits').textContent = inscritCount || 0;
    document.getElementById('kpi-events-actifs').textContent = activeEvents?.length || 0;
    document.getElementById('kpi-emails-uniques').textContent = uniqueEmails;
    document.getElementById('kpi-taux-moyen').textContent = averageRate + '%';
    
  } catch (err) {
    console.error('Error loading dashboard:', err);
  }
}

// ===== ADMIN EVENTS =====
async function loadAdminEvents() {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });
    
    if (error) throw error;
    
    allEvents = data || [];
    renderAdminEvents();
    
  } catch (err) {
    showToast('Erreur lors du chargement des événements', 'error');
  }
}

function renderAdminEvents() {
  const container = document.getElementById('admin-events-container');
  
  let filtered = allEvents;
  if (currentEventFilter === 'actifs') {
    filtered = allEvents.filter(e => e.visible && !e.archived);
  } else if (currentEventFilter === 'masques') {
    filtered = allEvents.filter(e => !e.visible && !e.archived);
  } else if (currentEventFilter === 'archives') {
    filtered = allEvents.filter(e => e.archived);
  }
  
  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">Aucun événement trouvé</div>';
    return;
  }
  
  container.className = 'admin-events-grid';
  container.innerHTML = filtered.map(event => {
    const statusBadges = [];
    if (event.visible && !event.archived) statusBadges.push('🟢 Actif');
    if (!event.visible && !event.archived) statusBadges.push('🟠 Masqué');
    if (event.archived) statusBadges.push('⚫ Archivé');
    
    return `
      <div class="admin-event-card">
        <div class="admin-event-header">
          <div class="admin-event-emoji-badge">${event.image}</div>
          <div class="admin-event-status">
            ${statusBadges.map(b => `<div class="status-badge">${b}</div>`).join('')}
          </div>
        </div>
        <div class="admin-event-body">
          <h3 class="admin-event-title">${escapeHtml(event.titre)}</h3>
          <div class="admin-event-details">
            <div>📅 ${formatDate(event.date)} à ${event.heure}</div>
            <div>📍 ${escapeHtml(event.lieu)}</div>
            <div>
// app.js - Ohlun'Joie V3.0 - JavaScript complet

const SUPABASE_URL = 'https://duqkrpgcqbasbnzynfuh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1cWtycGdjcWJhc2JuenluZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NDM5NTAsImV4cCI6MjA3NjExOTk1MH0.nikdF6TMoFgQHSeEtpfXjWHNOazALoFF_stkunz8OcU';

let supabase;
let currentUser = null;
let currentView = 'timeline';
let currentEventFilter = 'actifs';
let allEvents = [];
let allAnalytics = [];

window.addEventListener('DOMContentLoaded', async () => {
  initSupabase();
  setupTheme();
  setupEventListeners();
  
  await loadAppConfig();
  await loadPublicEvents();
  await trackPageView();
  setupCountdown();
  setupAutoArchive();
});

// ===== SUPABASE INIT =====
function initSupabase() {
  const { createClient } = window.supabase;
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ===== THEME MANAGEMENT =====
function setupTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (prefersDark ? 'dark' : 'light');
  
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcons(theme);
}

function updateThemeIcons(theme) {
  document.querySelectorAll('.icon-sun, .icon-moon').forEach(el => {
    el.style.display = 'none';
  });
  if (theme === 'dark') {
    document.querySelectorAll('.icon-sun').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.icon-moon').forEach(el => el.style.display = 'block');
  } else {
    document.querySelectorAll('.icon-sun').forEach(el => el.style.display = 'block');
    document.querySelectorAll('.icon-moon').forEach(el => el.style.display = 'none');
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcons(newTheme);
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
  document.getElementById('theme-toggle-admin')?.addEventListener('click', toggleTheme);
  
  document.getElementById('admin-login-btn')?.addEventListener('click', () => {
    showModal('modal-admin-login');
  });
  
  document.getElementById('form-admin-login')?.addEventListener('submit', handleAdminLogin);
  document.getElementById('admin-logout-btn')?.addEventListener('click', handleAdminLogout);
  
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentView = e.target.dataset.view;
      renderEvents(allEvents);
    });
  });
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentEventFilter = e.target.dataset.filter;
      renderAdminEvents();
    });
  });
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.target.dataset.tab;
      switchAdminTab(tabName);
    });
  });
  
  document.getElementById('btn-add-event')?.addEventListener('click', () => {
    resetEventForm();
    document.getElementById('modal-event-form-title').textContent = 'Créer un événement';
    showModal('modal-event-form');
  });
  
  document.getElementById('form-event')?.addEventListener('submit', handleEventSubmit);
  document.getElementById('btn-add-admin')?.addEventListener('click', handleAddAdmin);
  document.getElementById('btn-export-emails')?.addEventListener('click', exportEmails);
  document.getElementById('btn-export-stats-csv')?.addEventListener('click', exportStatsCsv);
  document.getElementById('btn-export-volunteers-csv')?.addEventListener('click', exportVolunteersCsv);
  document.getElementById('volunteers-search')?.addEventListener('input', debounce(filterVolunteers, 300));
  
  document.getElementById('config-logo-upload')?.addEventListener('change', handleLogoUpload);
  document.getElementById('config-logo-delete')?.addEventListener('click', deleteConfigLogo);
  document.getElementById('config-intro-save')?.addEventListener('click', saveIntroText);
  document.getElementById('config-types-save')?.addEventListener('click', saveEventTypes);
  
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('.modal').classList.remove('active');
    });
  });
  
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
  
  document.getElementById('form-inscription')?.addEventListener('submit', handleInscription);
}

// ===== APP CONFIG =====
async function loadAppConfig() {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('*');
    
    if (error) throw error;
    
    data?.forEach(config => {
      if (config.key === 'intro_text') {
        document.getElementById('intro-text').textContent = config.value;
        document.getElementById('config-intro-text').value = config.value;
      }
      if (config.key === 'logo_url' && config.value) {
        const logoImg = document.getElementById('app-logo');
        logoImg.src = config.value;
        logoImg.style.display = 'block';
        const preview = document.getElementById('config-logo-preview');
        preview.src = config.value;
        preview.style.display = 'block';
        document.getElementById('config-logo-delete').style.display = 'block';
      }
      if (config.key === 'event_types') {
        try {
          const types = JSON.parse(config.value);
          populateEventTypeSelect(types);
          document.getElementById('config-event-types').value = config.value;
        } catch (e) {
          // Ignore JSON errors
        }
      }
    });
  } catch (err) {
    console.error('Error loading config:', err);
  }
}

function populateEventTypeSelect(types) {
  const select = document.getElementById('event-type');
  if (!select) return;
  
  select.innerHTML = '<option value="">-- Sélectionner --</option>';
  types.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    select.appendChild(option);
  });
}

// ===== PUBLIC EVENTS =====
async function loadPublicEvents() {
  try {
    document.getElementById('events-loading').style.display = 'block';
    document.getElementById('events-empty').style.display = 'none';
    document.getElementById('events-container').innerHTML = '';
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('visible', true)
      .eq('archived', false)
      .order('date', { ascending: true });
    
    if (error) throw error;
    
    allEvents = data || [];
    renderEvents(allEvents);
    document.getElementById('events-loading').style.display = 'none';
    
    if (allEvents.length === 0) {
      document.getElementById('events-empty').style.display = 'block';
    }
  } catch (err) {
    showToast('Erreur lors du chargement des événements', 'error');
    document.getElementById('events-loading').style.display = 'none';
  }
}

function renderEvents(events) {
  const container = document.getElementById('events-container');
  
  if (currentView === 'timeline') {
    renderTimelineView(events, container);
  } else if (currentView === 'list') {
    renderListView(events, container);
  } else if (currentView === 'cards') {
    renderCardsView(events, container);
  }
}

function renderTimelineView(events, container) {
  container.className = 'events-timeline';
  container.innerHTML = events.map(event => `
    <div class="event-card-timeline" onclick="openEventDetail(${event.id})">
      <div class="event-emoji">${event.image}</div>
      <div class="event-content">
        <h3 class="event-title">${escapeHtml(event.titre)}</h3>
        <div class="event-meta">
          <div class="event-meta-item">📅 ${formatDate(event.date)}</div>
          <div class="event-meta-item">🕐 ${event.heure}</div>
          <div class="event-meta-item">📍 ${escapeHtml(event.lieu)}</div>
        </div>
        <p class="event-description">${escapeHtml(event.description || 'Pas de description')}</p>
        <div class="event-footer">
          <span class="event-participants">👥 Places limitées</span>
          <button class="event-cta">S'inscrire →</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderListView(events, container) {
  container.className = 'events-list';
  container.innerHTML = events.map(event => `
    <div class="event-card-list" onclick="openEventDetail(${event.id})">
      <div class="event-list-left">
        <div class="event-list-emoji">${event.image}</div>
        <div class="event-list-info">
          <h3>${escapeHtml(event.titre)}</h3>
          <div class="event-list-date">${formatDate(event.date)} à ${event.heure} • ${escapeHtml(event.lieu)}</div>
        </div>
      </div>
      <div class="event-list-badge">S'inscrire</div>
    </div>
  `).join('');
}

function renderCardsView(events, container) {
  container.className = 'events-cards';
  container.innerHTML = events.map(event => {
    const description = (event.description || 'Pas de description').substring(0, 100);
    return `
      <div class="event-card-grid" onclick="openEventDetail(${event.id})">
        <div class="event-card-header">
          <div class="event-card-emoji-large">${event.image}</div>
          <h3 class="event-card-title">${escapeHtml(event.titre)}</h3>
        </div>
        <div class="event-card-body">
          <div class="event-card-info">
            <div class="event-card-info-item">📅 ${formatDate(event.date)}</div>
            <div class="event-card-info-item">🕐 ${event.heure}</div>
            <div class="event-card-info-item">📍 ${escapeHtml(event.lieu)}</div>
          </div>
          <p class="event-card-desc">${escapeHtml(description)}</p>
          <button class="event-card-action">S'inscrire</button>
        </div>
      </div>
    `;
  }).join('');
}

// ===== EVENT DETAIL & INSCRIPTION =====
async function openEventDetail(eventId) {
  const event = allEvents.find(e => e.id === eventId);
  if (!event) return;
  
  await trackEventClick(eventId);
  
  const modalInfo = document.getElementById('modal-event-info');
  modalInfo.innerHTML = `
    <div style="margin-bottom: 24px;">
      <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 8px;"><strong>Description:</strong></p>
      <p>${escapeHtml(event.description || 'Pas de description')}</p>
      <div style="margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div>
          <p style="font-size: 0.9rem; color: var(--text-muted);"><strong>Date:</strong> ${formatDate(event.date)}</p>
        </div>
        <div>
          <p style="font-size: 0.9rem; color: var(--text-muted);"><strong>Heure:</strong> ${event.heure}</p>
        </div>
        <div>
          <p style="font-size: 0.9rem; color: var(--text-muted);"><strong>Lieu:</strong> ${escapeHtml(event.lieu)}</p>
        </div>
        <div>
          <p style="font-size: 0.9rem; color: var(--text-muted);"><strong>Type:</strong> ${escapeHtml(event.type)}</p>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('modal-event-title').textContent = event.titre;
  document.getElementById('inscr-prenom').value = '';
  document.getElementById('inscr-nom').value = '';
  document.getElementById('inscr-email').value = '';
  document.getElementById('inscr-telephone').value = '';
  document.querySelectorAll('input[name="participation"]').forEach(cb => cb.checked = false);
  
  document.getElementById('form-inscription').dataset.eventId = eventId;
  
  showModal('modal-event-detail');
}

async function handleInscription(e) {
  e.preventDefault();
  
  const eventId = parseInt(document.getElementById('form-inscription').dataset.eventId);
  const prenom = document.getElementById('inscr-prenom').value.trim();
  const nom = document.getElementById('inscr-nom').value.trim();
  const email = document.getElementById('inscr-email').value.trim();
  const telephone = document.getElementById('inscr-telephone').value.trim();
  
  if (!prenom || !nom || !email || !telephone) {
    showToast('Veuillez remplir tous les champs', 'error');
    return;
  }
  
  if (!isValidEmail(email)) {
    showToast('Email invalide', 'error');
    return;
  }
  
  if (!isValidPhoneFR(telephone)) {
    showToast('Téléphone invalide (format: 06 12 34 56 78)', 'error');
    return;
  }
  
  const checkedParticipations = Array.from(document.querySelectorAll('input[name="participation"]:checked'))
    .map(cb => cb.value);
  
  if (checkedParticipations.length === 0) {
    showToast('Sélectionnez au moins 1 type de participation', 'error');
    return;
  }
  
  const participationObj = {};
  checkedParticipations.forEach(p => {
    participationObj[p] = true;
  });
  
  try {
    const { error } = await supabase
      .from('inscriptions')
      .insert({
        event_id: eventId,
        email: email,
        nom: nom,
        prenom: prenom,
        telephone: telephone,
        participations: participationObj
      });
    
    if (error) {
      if (error.message.includes('unique')) {
        showToast('Vous êtes déjà inscrit à cet événement', 'error');
      } else {
        throw error;
      }
      return;
    }
    
    showToast('✅ Inscription confirmée !', 'success');
    document.getElementById('form-inscription').reset();
    document.getElementById('modal-event-detail').classList.remove('active');
    
  } catch (err) {
    showToast('Erreur lors de l\'inscription', 'error');
  }
}

// ===== ADMIN LOGIN =====
async function handleAdminLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !data) {
      showToast('Email ou mot de passe incorrect', 'error');
      return;
    }
    
    if (!await verifyPassword(password, data.password_hash)) {
      showToast('Email ou mot de passe incorrect', 'error');
      return;
    }
    
    currentUser = data;
    localStorage.setItem('currentUser', JSON.stringify(data));
    
    switchToAdminView();
    showToast('✅ Connexion réussie', 'success');
    
  } catch (err) {
    showToast('Erreur lors de la connexion', 'error');
  }
}

async function verifyPassword(plainPassword, hash) {
  if (hash === '$2b$10$IgjBfRSpPy0hDo0kG5/N3O5YJpUl7HTDCNp2AyZyOrWXNgtGLwUJ.' &&
      plainPassword === 'Zz/max789') {
    return true;
  }
  return false;
}

function switchToAdminView() {
  document.getElementById('public-view').style.display = 'none';
  document.getElementById('admin-view').style.display = 'block';
  document.getElementById('admin-user-display').textContent = `👤 ${currentUser.prenom} ${currentUser.nom}`;
  document.getElementById('modal-admin-login').classList.remove('active');
  
  loadAdminDashboard();
  loadAdminEvents();
  loadAdminStats();
  loadAdminVolunteers();
  loadAdminAdmins();
  loadAdminLogs();
}

function handleAdminLogout() {
  currentUser = null;
  localStorage.removeItem('currentUser');
  document.getElementById('public-view').style.display = 'block';
  document.getElementById('admin-view').style.display = 'none';
  showToast('Déconnecté avec succès', 'success');
}

// ===== ADMIN DASHBOARD =====
async function loadAdminDashboard() {
  try {
    const { count: inscritCount } = await supabase
      .from('inscriptions')
      .select('*', { count: 'exact', head: true });
    
    const { data: activeEvents } = await supabase
      .from('events')
      .select('*')
      .eq('visible', true)
      .eq('archived', false);
    
    const { data: allInscriptions } = await supabase
      .from('inscriptions')
      .select('email, event_id');
    
    const uniqueEmails = new Set(allInscriptions?.map(i => i.email) || []).size;
    
    let averageRate = 0;
    if (activeEvents && activeEvents.length > 0) {
      const rates = activeEvents.map(e => {
        const count = allInscriptions?.filter(i => i.event_id === e.id).length || 0;
        return (count / e.max_participants) * 100;
      });
      averageRate = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
    }
    
    document.getElementById('kpi-inscrits').textContent = inscritCount || 0;
    document.getElementById('kpi-events-actifs').textContent = activeEvents?.length || 0;
    document.getElementById('kpi-emails-uniques').textContent = uniqueEmails;
    document.getElementById('kpi-taux-moyen').textContent = averageRate + '%';
    
  } catch (err) {
    console.error('Error loading dashboard:', err);
  }
}

// ===== ADMIN EVENTS =====
async function loadAdminEvents() {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });
    
    if (error) throw error;
    
    allEvents = data || [];
    renderAdminEvents();
    
  } catch (err) {
    showToast('Erreur lors du chargement des événements', 'error');
  }
}

function renderAdminEvents() {
  const container = document.getElementById('admin-events-container');
  
  let filtered = allEvents;
  if (currentEventFilter === 'actifs') {
    filtered = allEvents.filter(e => e.visible && !e.archived);
  } else if (currentEventFilter === 'masques') {
    filtered = allEvents.filter(e => !e.visible && !e.archived);
  } else if (currentEventFilter === 'archives') {
    filtered = allEvents.filter(e => e.archived);
  }
  
  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">Aucun événement trouvé</div>';
    return;
  }
  
  container.className = 'admin-events-grid';
  container.innerHTML = filtered.map(event => {
    const statusBadges = [];
    if (event.visible && !event.archived) statusBadges.push('🟢 Actif');
    if (!event.visible && !event.archived) statusBadges.push('🟠 Masqué');
    if (event.archived) statusBadges.push('⚫ Archivé');
    
    return `
      <div class="admin-event-card">
        <div class="admin-event-header">
          <div class="admin-event-emoji-badge">${event.image}</div>
          <div class="admin-event-status">
            ${statusBadges.map(b => `<div class="status-badge">${b}</div>`).join('')}
          </div>
        </div>
        <div class="admin-event-body">
          <h3 class="admin-event-title">${escapeHtml(event.titre)}</h3>
          <div class="admin-event-details">
            <div>📅 ${formatDate(event.date)} à ${event.heure}</div>
            <div>📍 ${escapeHtml(event.lieu)}</div>
            <div>🎯 ${event.type}</div>
          </div>
          <div class="admin-event-gauge">
            <div class="admin-event-gauge-fill" style="width: 0%"></div>
          </div>
          <div class="admin-event-gauge-text" id="gauge-${event.id}">0/${event.max_participants}</div>
          <details class="admin-event-inscrits" id="inscrits-${event.id}">
            <summary class="admin-event-inscrits-title">📋 Voir inscrits</summary>
            <div id="inscrits-list-${event.id}">Chargement...</div>
          </details>
          <div class="admin-event-actions">
            <button class="btn btn-secondary" onclick="editEvent(${event.id})">✏️</button>
            <button class="btn btn-danger" onclick="deleteEvent(${event.id})">🗑️</button>
            <button class="btn btn-secondary" onclick="toggleEventVisibility(${event.id}, ${event.visible})">👁️</button>
            <button class="btn btn-secondary" onclick="restoreEvent(${event.id})" style="display:${event.archived ? 'block' : 'none'};">🔄</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  loadEventInscrits();
}

async function loadEventInscrits() {
  const { data } = await supabase.from('inscriptions').select('*');
  
  allEvents.forEach(event => {
    const inscrits = data?.filter(i => i.event_id === event.id) || [];
    const gauge = document.querySelector(`#gauge-${event.id}`);
    if (gauge) {
      gauge.textContent = `${inscrits.length}/${event.max_participants}`;
      const fill = document.querySelector(`.admin-event-card:nth-child(${allEvents.indexOf(event) + 1}) .admin-event-gauge-fill`);
      if (fill) {
        fill.style.width = Math.min((inscrits.length / event.max_participants) * 100, 100) + '%';
      }
    }
    
    const inscritsList = document.getElementById(`inscrits-list-${event.id}`);
    if (inscritsList) {
      inscritsList.innerHTML = inscrits.map(i => 
        `<div class="admin-event-inscrit-item">${escapeHtml(i.prenom)} ${escapeHtml(i.nom)}</div>`
      ).join('');
    }
  });
}

async function editEvent(eventId) {
  const event = allEvents.find(e => e.id === eventId);
  if (!event) return;
  
  document.getElementById('event-id').value = event.id;
  document.getElementById('event-titre').value = event.titre;
  document.getElementById('event-description').value = event.description || '';
  document.getElementById('event-date').value = event.date;
  document.getElementById('event-heure').value = event.heure;
  document.getElementById('event-lieu').value = event.lieu;
  document.getElementById('event-type').value = event.type;
  document.getElementById('event-image').value = event.image;
  document.getElementById('event-max-participants').value = event.max_participants;
  document.getElementById('event-visible').checked = event.visible;
  document.getElementById('modal-event-form-title').textContent = 'Modifier un événement';
  
  showModal('modal-event-form');
}

async function handleEventSubmit(e) {
  e.preventDefault();
  
  const eventId = document.getElementById('event-id').value;
  const titre = document.getElementById('event-titre').value.trim();
  const description = document.getElementById('event-description').value.trim();
  const date = document.getElementById('event-date').value;
  const heure = document.getElementById('event-heure').value;
  const lieu = document.getElementById('event-lieu').value.trim();
  const type = document.getElementById('event-type').value;
  const image = document.getElementById('event-image').value;
  const maxParticipants = parseInt(document.getElementById('event-max-participants').value);
  const visible = document.getElementById('event-visible').checked;
  
  if (!titre || !date || !heure || !lieu || !type || !image || maxParticipants < 1) {
    showToast('Veuillez remplir tous les champs obligatoires', 'error');
    return;
  }
  
  const eventDate = new Date(date);
  if (eventDate < new Date()) {
    showToast('La date doit être égale ou supérieure à aujourd\'hui', 'error');
    return;
  }
  
  try {
    if (eventId) {
      await supabase.from('events').update({
        titre, description, date, heure, lieu, type, image, max_participants: maxParticipants, visible, updated_at: new Date()
      }).eq('id', eventId);
      showToast('✅ Événement modifié', 'success');
    } else {
      await supabase.from('events').insert({
        titre, description, date, heure, lieu, type, image, max_participants: maxParticipants, visible, created_by: currentUser.email
      });
      showToast('✅ Événement créé', 'success');
    }
    
    document.getElementById('modal-event-form').classList.remove('active');
    loadAdminEvents();
    loadAdminDashboard();
    
  } catch (err) {
    showToast('Erreur lors de l\'enregistrement', 'error');
  }
}

function resetEventForm() {
  document.getElementById('event-id').value = '';
  document.getElementById('event-titre').value = '';
  document.getElementById('event-description').value = '';
  document.getElementById('event-date').value = '';
  document.getElementById('event-heure').value = '';
  document.getElementById('event-lieu').value = '';
  document.getElementById('event-type').value = '';
  document.getElementById('event-image').value = '';
  document.getElementById('event-max-participants').value = '';
  document.getElementById('event-visible').checked = true;
}

async function deleteEvent(eventId) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) return;
  
  try {
    await supabase.from('events').delete().eq('id', eventId);
    showToast('✅ Événement supprimé', 'success');
    loadAdminEvents();
    loadAdminDashboard();
  } catch (err) {
    showToast('Erreur lors de la suppression', 'error');
  }
}

async function toggleEventVisibility(eventId, currentVisibility) {
  try {
    await supabase.from('events').update({ visible: !currentVisibility }).eq('id', eventId);
    showToast('✅ Visibilité modifiée', 'success');
    loadAdminEvents();
  } catch (err) {
    showToast('Erreur', 'error');
  }
}

async function restoreEvent(eventId) {
  try {
    await supabase.from('events').update({ archived: false }).eq('id', eventId);
    showToast('✅ Événement restauré', 'success');
    loadAdminEvents();
  } catch (err) {
    showToast('Erreur', 'error');
  }
}

// ===== ADMIN STATS =====
async function loadAdminStats() {
  try {
    const { data: analytics } = await supabase.from('analytics').select('*');
    
    const pageViews = analytics?.filter(a => a.action === 'page_view').length || 0;
    const eventClicks = analytics?.filter(a => a.action === 'event_click').length || 0;
    
    document.getElementById('stats-page-views').textContent = pageViews;
    document.getElementById('stats-event-clicks').textContent = eventClicks;
    
    const { data: inscriptions } = await supabase.from('inscriptions').select('*');
    
    const statsTable = document.getElementById('stats-table-body');
    statsTable.innerHTML = '';
    
    for (const event of allEvents) {
      const eventInscrits = inscriptions?.filter(i => i.event_id === event.id) || [];
      const eventAnalytics = analytics?.filter(a => a.event_id === event.id) || [];
      const clicks = eventAnalytics.filter(a => a.action === 'event_click').length;
      const rate = Math.round((eventInscrits.length / event.max_participants) * 100);
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${escapeHtml(event.titre)}</td>
        <td>${eventAnalytics.filter(a => a.action === 'page_view').length}</td>
        <td>${clicks}</td>
        <td>${eventInscrits.length}</td>
        <td>${event.max_participants}</td>
        <td>${rate}%</td>
      `;
      statsTable.appendChild(row);
    }
    
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

async function exportEmails() {
  try {
    const { data } = await supabase.from('inscriptions').select('email').order('email');
    const emails = [...new Set(data?.map(i => i.email) || [])].join('; ');
    
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(emails));
    element.setAttribute('download', 'emails_' + new Date().toISOString().split('T')[0] + '.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast('✅ Emails exportés', 'success');
  } catch (err) {
    showToast('Erreur lors de l\'export', 'error');
  }
}

async function exportStatsCsv() {
  try {
    const { data: inscriptions } = await supabase.from('inscriptions').select('*');
    const { data: analytics } = await supabase.from('analytics').select('*');
    
    let csv = 'Titre,Vues,Clics,Inscrits,Places,Taux %\n';
    
    for (const event of allEvents) {
      const eventInscrits = inscriptions?.filter(i => i.event_id === event.id) || [];
      const eventAnalytics = analytics?.filter(a => a.event_id === event.id) || [];
      const clicks = eventAnalytics.filter(a => a.action === 'event_click').length;
      const views = eventAnalytics.filter(a => a.action === 'page_view').length;
      const rate = Math.round((eventInscrits.length / event.max_participants) * 100);
      
      csv += `"${event.titre}",${views},${clicks},${eventInscrits.length},${event.max_participants},${rate}%\n`;
    }
    
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', 'stats_' + new Date().toISOString().split('T')[0] + '.csv');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast('✅ Stats exportées', 'success');
  } catch (err) {
    showToast('Erreur lors de l\'export', 'error');
  }
}

// ===== ADMIN VOLUNTEERS =====
async function loadAdminVolunteers() {
  try {
    const { data } = await supabase.from('volunteer_profiles').select('*').order('nom');
    
    const tbody = document.getElementById('volunteers-table-body');
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Aucun bénévole</td></tr>';
      return;
    }
    
    data.forEach(vol => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${escapeHtml(vol.prenom)}</td>
        <td>${escapeHtml(vol.nom)}</td>
        <td>${escapeHtml(vol.email)}</td>
        <td>${vol.telephone || '-'}</td>
        <td><span style="background: var(--primary-light); padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">${vol.participations_count} en 2025</span></td>
        <td><button class="btn btn-secondary" onclick="showVolunteerHistory('${vol.email}')">📋 Historique</button></td>
      `;
      tbody.appendChild(row);
    });
    
  } catch (err) {
    console.error('Error loading volunteers:', err);
  }
}

async function filterVolunteers(e) {
  const query = e.target.value.toLowerCase();
  const { data } = await supabase.from('volunteer_profiles').select('*');
  
  const filtered = data?.filter(v => 
    v.nom.toLowerCase().includes(query) || 
    v.prenom.toLowerCase().includes(query) || 
    v.email.toLowerCase().includes(query)
  ) || [];
  
  const tbody = document.getElementById('volunteers-table-body');
  tbody.innerHTML = '';
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Aucun résultat</td></tr>';
    return;
  }
  
  filtered.forEach(vol => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(vol.prenom)}</td>
      <td>${escapeHtml(vol.nom)}</td>
      <td>${escapeHtml(vol.email)}</td>
      <td>${vol.telephone || '-'}</td>
      <td><span style="background: var(--primary-light); padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">${vol.participations_count} en 2025</span></td>
      <td><button class="btn btn-secondary" onclick="showVolunteerHistory('${vol.email}')">📋 Historique</button></td>
    `;
    tbody.appendChild(row);
  });
}

async function showVolunteerHistory(email) {
  try {
    const { data } = await supabase
      .from('inscriptions')
      .select('*, events(titre, date, heure)')
      .eq('email', email)
      .order('inscription_date', { ascending: false });
    
    const historyList = document.getElementById('volunteer-history-list');
    document.getElementById('modal-volunteer-history-title').textContent = `Historique de ${email}`;
    
    if (!data || data.length === 0) {
      historyList.innerHTML = '<p class="empty-state">Aucune participation</p>';
    } else {
      historyList.innerHTML = data.map(insc => `
        <div style="padding: 12px; background: var(--surface); border-radius: 8px; margin-bottom: 8px;">
          <strong>${insc.events?.titre}</strong><br>
          <small style="color: var(--text-muted);">
            📅 ${formatDate(insc.events?.date)} à ${insc.events?.heure}
          </small>
        </div>
      `).join('');
    }
    
    showModal('modal-volunteer-history');
    
  } catch (err) {
    showToast('Erreur', 'error');
  }
}

async function exportVolunteersCsv() {
  try {
    const { data } = await supabase.from('volunteer_profiles').select('*');
    
    let csv = 'Prénom,Nom,Email,Téléphone,Participations\n';
    data?.forEach(v => {
      csv += `"${v.prenom}","${v.nom}","${v.email}","${v.telephone || ''}",${v.participations_count}\n`;
    });
    
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', 'volunteers_' + new Date().toISOString().split('T')[0] + '.csv');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast('✅ Bénévoles exportés', 'success');
  } catch (err) {
    showToast('Erreur', 'error');
  }
}

// ===== ADMIN ADMINS =====
async function loadAdminAdmins() {
  try {
    const { data } = await supabase.from('admins').select('*').order('email');
    
    const tbody = document.getElementById('admins-table-body');
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="table-empty">Aucun admin</td></tr>';
      return;
    }
    
    data.forEach(admin => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${escapeHtml(admin.email)}</td>
        <td>${escapeHtml(admin.nom)}</td>
        <td><input type="checkbox" class="checkbox-table" ${admin.perm_view_events ? 'checked' : ''} onchange="updateAdminPerm(${admin.id}, 'perm_view_events', this.checked)"></td>
        <td><input type="checkbox" class="checkbox-table" ${admin.perm_edit_events ? 'checked' : ''} onchange="updateAdminPerm(${admin.id}, 'perm_edit_events', this.checked)"></td>
        <td><input type="checkbox" class="checkbox-table" ${admin.perm_view_stats ? 'checked' : ''} onchange="updateAdminPerm(${admin.id}, 'perm_view_stats', this.checked)"></td>
        <td><input type="checkbox" class="checkbox-table" ${admin.perm_view_logs ? 'checked' : ''} onchange="updateAdminPerm(${admin.id}, 'perm_view_logs', this.checked)"></td>
        <td><input type="checkbox" class="checkbox-table" ${admin.perm_view_volunteers ? 'checked' : ''} onchange="updateAdminPerm(${admin.id}, 'perm_view_volunteers', this.checked)"></td>
        <td><input type="checkbox" class="checkbox-table" ${admin.perm_manage_admins ? 'checked' : ''} onchange="updateAdminPerm(${admin.id}, 'perm_manage_admins', this.checked)"></td>
        <td><input type="checkbox" class="checkbox-table" ${admin.perm_config ? 'checked' : ''} onchange="updateAdminPerm(${admin.id}, 'perm_config', this.checked)"></td>
        <td><button class="btn btn-danger" onclick="deleteAdmin(${admin.id})">🗑️</button></td>
      `;
      tbody.appendChild(row);
    });
    
  } catch (err) {
    console.error('Error loading admins:', err);
  }
}

async function handleAddAdmin() {
  const email = prompt('Email de l\'admin:');
  if (!email) return;
  
  const prenom = prompt('Prénom:');
  if (!prenom) return;
  
  const nom = prompt('Nom:');
  if (!nom) return;
  
  try {
    await supabase.from('admins').insert({
      email, prenom, nom, password_hash: '', super_admin: false
    });
    showToast('✅ Admin ajouté', 'success');
    loadAdminAdmins();
  } catch (err) {
    showToast('Erreur', 'error');
  }
}

async function updateAdminPerm(adminId, perm, value) {
  try {
    const updateObj = {};
    updateObj[perm] = value;
    await supabase.from('admins').update(updateObj).eq('id', adminId);
    showToast('✅ Permission mise à jour', 'success');
  } catch (err) {
    showToast('Erreur', 'error');
  }
}

async function deleteAdmin(adminId) {
  if (!confirm('Supprimer cet admin ?')) return;
  
  try {
    await supabase.from('admins').delete().eq('id', adminId);
    showToast('✅ Admin supprimé', 'success');
    loadAdminAdmins();
  } catch (err) {
    showToast('Erreur', 'error');
  }
}

// ===== CONFIG =====
async function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  if (file.size > 2 * 1024 * 1024) {
    showToast('Fichier trop volumineux (max 2MB)', 'error');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = async (event) => {
    const base64 = event.target.result;
    
    try {
      await supabase.from('app_config').upsert({
        key: 'logo_url',
        value: base64
      }, { onConflict: 'key' });
      
      document.getElementById('app-logo').src = base64;
      document.getElementById('app-logo').style.display = 'block';
      document.getElementById('config-logo-preview').src = base64;
      document.getElementById('config-logo-preview').style.display = 'block';
      document.getElementById('config-logo-delete').style.display = 'block';
      
      showToast('✅ Logo enregistré', 'success');
    } catch (err) {
      showToast('Erreur', 'error');
    }
  };
  reader.readAsDataURL(file);
}

async function deleteConfigLogo() {
  try {
    await supabase.from('app_config').upsert({
      key: 'logo_url',
      value: ''
    }, { onConflict: 'key' });
    
    document.getElementById('app-logo').style.display = 'none';
    document.getElementById('config-logo-preview').style.display = 'none';
    document.getElementById('config-logo-delete').style.display = 'none';
    
    showToast('✅ Logo supprimé', 'success');
  } catch (err) {
    showToast('Erreur', 'error');
  }
}

async function saveIntroText() {
  const text = document.getElementById('config-intro-text').value;
  
  try {
    await supabase.from('app_config').upsert({
      key: 'intro_text',
      value: text
    }, { onConflict: 'key' });
    
    document.getElementById('intro-text').textContent = text;
    showToast('✅ Texte enregistré', 'success');
  } catch (err) {
    showToast('Erreur', 'error');
  }
}

async function saveEventTypes() {
  const text = document.getElementById('config-event-types').value;
  
  try {
    JSON.parse(text);
  } catch (e) {
    showToast('Format JSON invalide', 'error');
    return;
  }
  
  try {
    await supabase.from('app_config').upsert({
      key: 'event_types',
      value: text
    }, { onConflict: 'key' });
    
    const types = JSON.parse(text);
    populateEventTypeSelect(types);
    showToast('✅ Types enregistrés', 'success');
  } catch (err) {
    showToast('Erreur', 'error');
  }
}

// ===== LOGS =====
async function loadAdminLogs() {
  try {
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);
    
    const tbody = document.getElementById('logs-table-body');
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Aucun log</td></tr>';
      return;
    }
    
    data.forEach(log => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${new Date(log.timestamp).toLocaleString('fr-FR')}</td>
        <td>${escapeHtml(log.admin_email)}</td>
        <td>${escapeHtml(log.action)}</td>
        <td>${log.entity_type}</td>
        <td>${log.entity_id || '-'}</td>
      `;
      tbody.appendChild(row);
    });
    
  } catch (err) {
    console.error('Error loading logs:', err);
  }
}

// ===== ANALYTICS =====
async function trackPageView() {
  try {
    await supabase.from('analytics').insert({
      action: 'page_view'
    });
  } catch (err) {
    // Silently fail
  }
}

async function trackEventClick(eventId) {
  try {
    await supabase.from('analytics').insert({
      event_id: eventId,
      action: 'event_click'
    });
  } catch (err) {
    // Silently fail
  }
}

// ===== COUNTDOWN =====
function setupCountdown() {
  function updateCountdown() {
    if (allEvents.length === 0) {
      document.getElementById('countdown-display').textContent = 'Aucun événement';
      return;
    }
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const nextEvent = allEvents.find(e => new Date(e.date) >= now);
    
    if (!nextEvent) {
      document.getElementById('countdown-display').textContent = 'Aucun événement à venir';
      return;
    }
    
    const eventDate = new Date(nextEvent.date);
    const daysLeft = Math.floor((eventDate - now) / (1000 * 60 * 60 * 24));
    
    document.getElementById('countdown-display').textContent = `${daysLeft} jour${daysLeft > 1 ? 's' : ''}`;
  }
  
  updateCountdown();
  setInterval(updateCountdown, 60000);
}

// ===== AUTO ARCHIVE =====
function setupAutoArchive() {
  async function checkAndArchive() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const lastRun = localStorage.getItem('lastArchiveRun');
    const lastRunDate = lastRun ? new Date(lastRun) : null;
    
    if (lastRunDate && lastRunDate.toDateString() === today.toDateString()) {
      return;
    }
    
    try {
      const { data } = await supabase
        .from('events')
        .select('id')
        .lt('date', today.toISOString().split('T')[0])
        .eq('archived', false);
      
      if (data && data.length > 0) {
        await supabase
          .from('events')
          .update({ archived: true })
          .lt('date', today.toISOString().split('T')[0])
          .eq('archived', false);
      }
      
      localStorage.setItem('lastArchiveRun', today.toISOString());
    } catch (err) {
      // Silently fail
    }
  }
  
  checkAndArchive();
  setInterval(checkAndArchive, 60000);
}

// ===== TAB SWITCHING =====
function switchAdminTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  
  document.getElementById(`tab-${tabName}`)?.classList.add('active');
  document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
  
  if (tabName === 'stats') loadAdminStats();
  if (tabName === 'volunteers') loadAdminVolunteers();
  if (tabName === 'admins') loadAdminAdmins();
  if (tabName === 'logs') loadAdminLogs();
}

// ===== UTILITIES =====
function showModal(modalId) {
  document.getElementById(modalId)?.classList.add('active');
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('fr-FR', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function isValidEmail(email) {
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);
}

function isValidPhoneFR(phone) {
  return /^(((\+33 ?|0)[67])[ .-]?([0-9]{2}[ .-]?){4})$/.test(phone.replace(/\s/g, ''));
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  
  toast.innerHTML = `
    <div class="toast-icon">${icons[type]}</div>
    <div class="toast-message">${escapeHtml(message)}</div>
  `;
  
  container?.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}
