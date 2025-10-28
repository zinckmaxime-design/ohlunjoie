/*
 * Ohlun'Joie V3.0
 * Fichier JavaScript principal. Ce script initialise Supabase, charge
 * dynamiquement les données depuis la base, gère l'interface publique et le
 * back‑office (administration), applique les validations et traite les
 * interactions utilisateur. Il est écrit en JavaScript vanilla et ne
 * dépend d'aucun framework.
 */

(() => {
  // Configuration Supabase
  // Supabase configuration
  // NOTE: These values must be on a single line for the script to parse correctly.
  const SUPABASE_URL = 'https://duqkrpgcqbasbnzynfuh.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1cWtycGdjcWJhc2JuenluZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NDM5NTAsImV4cCI6MjA3NjExOTk1MH0.nikdF6TMoFgQHSeEtpfXjWHNOazALoFF_stkunz8OcU';
  const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Sélecteurs globaux
  const body = document.body;
  const themeToggleBtn = document.getElementById('theme-toggle');
  const adminToggleBtn = document.getElementById('admin-toggle');
  const adminSection = document.getElementById('admin-section');
  const publicSection = document.getElementById('public-section');
  const introTextEl = document.getElementById('intro-text');
  const eventsContainer = document.getElementById('events-container');
  const countdownEl = document.getElementById('next-event-countdown');
  const viewButtons = document.querySelectorAll('.view-btn');
  const rgpdNotice = document.getElementById('rgpd-notice');
  const toastContainer = document.getElementById('toast-container');

  // Admin selectors
  const adminLogin = document.getElementById('admin-login');
  const adminLoginForm = document.getElementById('admin-login-form');
  const adminLoginError = document.getElementById('admin-login-error');
  const adminDashboard = document.getElementById('admin-dashboard');
  const tabButtons = document.querySelectorAll('.admin-tabs .tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  // Dashboard KPIs
  const kpiTotalInscrits = document.getElementById('kpi-total-inscrits');
  const kpiEventsActifs = document.getElementById('kpi-events-actifs');
  const kpiEmailsUniques = document.getElementById('kpi-emails-uniques');
  const kpiTauxMoyen = document.getElementById('kpi-taux-moyen');
  // Events admin
  const adminEventsContainer = document.getElementById('admin-events-container');
  const eventsFilterSelect = document.getElementById('events-filter-select');
  const createEventBtn = document.getElementById('create-event-btn');
  const eventModal = document.getElementById('event-modal');
  const eventForm = document.getElementById('event-form');
  const eventModalCancel = document.getElementById('event-modal-cancel');
  // Stats
  const kpiPagesVues = document.getElementById('kpi-pages-vues');
  const kpiClicsEvents = document.getElementById('kpi-clics-events');
  const statsTableBody = document.querySelector('#stats-table tbody');
  const exportEmailsBtn = document.getElementById('export-emails-btn');
  const exportStatsBtn = document.getElementById('export-stats-btn');
  // Volunteers
  const volunteerSearchInput = document.getElementById('volunteer-search');
  const volunteersTableBody = document.querySelector('#volunteers-table tbody');
  const exportVolunteersBtn = document.getElementById('export-volunteers-btn');
  const volunteerHistoryModal = document.getElementById('volunteer-history-modal');
  const volunteerHistoryTableBody = document.querySelector('#volunteer-history-table tbody');
  const volunteerHistoryClose = document.getElementById('volunteer-history-close');
  // Admins management
  const adminsTableBody = document.querySelector('#admins-table tbody');
  const addAdminBtn = document.getElementById('add-admin-btn');
  const addAdminModal = document.getElementById('add-admin-modal');
  const addAdminForm = document.getElementById('add-admin-form');
  const addAdminCancel = document.getElementById('add-admin-cancel');
  // Config
  const configForm = document.getElementById('config-form');
  const logoInput = document.getElementById('logo-input');
  const logoPreview = document.getElementById('logo-preview');
  const removeLogoBtn = document.getElementById('remove-logo-btn');
  const introTextarea = document.getElementById('intro-textarea');
  const eventTypesTextarea = document.getElementById('event-types-textarea');
  // Logs
  const logsTableBody = document.querySelector('#logs-table tbody');

  // State
  let currentView = 'timeline';
  let publicEvents = [];
  let eventTypes = [];
  let currentAdmin = null; // { id, email, nom, perms }
  let adminEvents = [];

  /**
   * Utilitaires généraux
   */
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 4500);
  }

  // Fonction pour convertir un objet en CSV
  function toCSV(rows) {
    if (!rows || rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(',')];
    rows.forEach(row => {
      const values = headers.map(h => {
        const val = row[h];
        // Échappe les virgules et guillemets
        if (val === null || val === undefined) return '';
        const s = String(val).replace(/"/g, '""');
        return s.includes(',') ? `"${s}"` : s;
      });
      lines.push(values.join(','));
    });
    return lines.join('\n');
  }

  // Fonction pour forcer le téléchargement d'un fichier texte
  function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Charge la bibliothèque bcryptjs dynamiquement pour valider les mots de passe
  async function loadBcrypt() {
    if (window.bcrypt) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/bcryptjs/2.4.3/bcrypt.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Gère le thème clair/sombre
   */
  function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      body.classList.add('dark-theme');
      themeToggleBtn.textContent = '☀️';
    } else {
      body.classList.remove('dark-theme');
      themeToggleBtn.textContent = '🌙';
    }
  }

  function toggleTheme() {
    if (body.classList.contains('dark-theme')) {
      body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
      themeToggleBtn.textContent = '🌙';
    } else {
      body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
      themeToggleBtn.textContent = '☀️';
    }
  }

  /**
   * Chargement de la configuration depuis la table app_config
   */
  async function loadAppConfig() {
    const { data, error } = await supabase.from('app_config').select('*');
    if (error) {
      console.error('Erreur chargement config', error);
      return;
    }
    data.forEach(item => {
      if (item.key === 'intro_text') {
        introTextEl.textContent = item.value;
        introTextarea.value = item.value;
      } else if (item.key === 'logo_url') {
        if (item.value) {
          logoPreview.innerHTML = `<img src="${item.value}" alt="Logo" style="max-height:60px;">`;
        }
      } else if (item.key === 'event_types') {
        try {
          eventTypes = JSON.parse(item.value);
        } catch (e) {
          eventTypes = [];
        }
        eventTypesTextarea.value = item.value;
        // Remplir select de la modale événement
        const eventTypeSelect = document.getElementById('event-type');
        eventTypeSelect.innerHTML = '';
        eventTypes.forEach(type => {
          const opt = document.createElement('option');
          opt.value = type;
          opt.textContent = type;
          eventTypeSelect.appendChild(opt);
        });
      }
    });
  }

  /**
   * Récupère les événements publics et met à jour l'affichage
   */
  async function loadPublicEvents() {
    // Récupère les événements publics et calcule le nombre d'inscrits pour afficher la jauge
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('visible', true)
      .eq('archived', false)
      .order('date', { ascending: true });
    if (error) {
      console.error(error);
      showToast("Erreur lors du chargement des événements", 'danger');
      return;
    }
    // Si aucune donnée, nettoie et quitte
    if (!data) {
      publicEvents = [];
      renderPublicEvents();
      updateNextEventCountdown();
      return;
    }
    // Pour chaque événement, calcule le nombre d'inscrits et le taux de remplissage
    const enriched = await Promise.all(
      data.map(async (ev) => {
        // Récupère le nombre d'inscrits pour cet événement
        const { count } = await supabase
          .from('inscriptions')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', ev.id);
        const inscrits = count || 0;
        const rate = ev.max_participants > 0 ? Math.round((inscrits / ev.max_participants) * 100) : 0;
        return { ...ev, inscritsCount: inscrits, rate };
      })
    );
    publicEvents = enriched;
    renderPublicEvents();
    updateNextEventCountdown();
  }

  /**
   * Met à jour le compte à rebours pour le prochain événement
   */
  function updateNextEventCountdown() {
    if (!publicEvents || publicEvents.length === 0) {
      countdownEl.textContent = "Aucun événement à venir";
      return;
    }
    // prochain événement : le premier car trié par date
    const next = publicEvents[0];
    const eventDateTime = new Date(`${next.date}T${next.heure}`);
    function updateCountdown() {
      const now = new Date();
      const diff = eventDateTime - now;
      if (diff <= 0) {
        countdownEl.textContent = "L'événement est en cours";
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      countdownEl.textContent = `Prochain événement dans ${days} j ${hours} h ${minutes} min`;
    }
    updateCountdown();
    // mettre à jour toutes les minutes
    setInterval(updateCountdown, 60000);
  }

  /**
   * Rendu des événements publics selon le type de vue
   */
  function renderPublicEvents() {
    // Ajuste la classe du conteneur pour les différentes vues
    eventsContainer.classList.remove('timeline-view', 'list-view', 'cards-view');
    eventsContainer.classList.add(`${currentView}-view`);
    // Vider le conteneur
    eventsContainer.innerHTML = '';
    publicEvents.forEach(event => {
      const el = createPublicEventElement(event);
      eventsContainer.appendChild(el);
    });
  }

  /**
   * Crée un élément DOM représentant un événement public
   */
  function createPublicEventElement(event) {
    // Création du conteneur selon la vue
    const wrapper = document.createElement('div');
    wrapper.classList.add('public-event');
    wrapper.classList.add(`${currentView}-event`);
    // Date : jour et mois séparés
    const dateObj = new Date(event.date);
    const day = dateObj.toLocaleDateString('fr-FR', { day: '2-digit' });
    const month = dateObj.toLocaleDateString('fr-FR', { month: 'short' });
    const dateEl = document.createElement('div');
    dateEl.className = 'event-date';
    dateEl.innerHTML = `<span class="day">${day}</span><span class="month">${month}</span>`;
    wrapper.appendChild(dateEl);
    // Contenu principal
    const content = document.createElement('div');
    content.className = 'event-content';
    // Titre avec emoji
    const titleEl = document.createElement('h3');
    titleEl.className = 'event-title';
    titleEl.innerHTML = `${event.image} <span>${event.titre}</span>`;
    content.appendChild(titleEl);
    // Meta (lieu et heure)
    const meta = document.createElement('div');
    meta.className = 'event-meta';
    meta.innerHTML = `<span class="time">${event.heure}</span><span class="location">${event.lieu}</span>`;
    content.appendChild(meta);
    // Description (facultative)
    if (event.description) {
      const desc = document.createElement('p');
      desc.className = 'event-description';
      desc.textContent = event.description;
      content.appendChild(desc);
    }
    // Barre de progression participants
    const progressWrapper = document.createElement('div');
    progressWrapper.className = 'progress-wrapper';
    progressWrapper.innerHTML = `
      <div class="progress-bar"><div class="progress" style="width:${event.rate}%"></div></div>
      <span class="progress-label">${event.inscritsCount}/${event.max_participants} – ${event.rate}%</span>
    `;
    content.appendChild(progressWrapper);
    // Bloc d'inscription (details/summary)
    const signupDetails = document.createElement('details');
    signupDetails.className = 'signup-details';
    const summary = document.createElement('summary');
    summary.textContent = "S'inscrire";
    signupDetails.appendChild(summary);
    const form = document.createElement('form');
    form.className = 'signup-form';
    form.innerHTML = `
      <div class="form-group">
        <label for="email-${event.id}">Email</label>
        <input id="email-${event.id}" type="email" name="email" required />
      </div>
      <div class="form-group">
        <label for="phone-${event.id}">Téléphone</label>
        <input id="phone-${event.id}" type="tel" name="phone" required />
      </div>
      <div class="form-group form-checkboxes">
        <span>Participation :</span>
        <label><input type="checkbox" name="preparation_salle" value="true"> Préparation de la salle</label>
        <label><input type="checkbox" name="partie_evenement" value="true"> Partie de l'événement</label>
        <label><input type="checkbox" name="evenement_entier" value="true"> Événement entier</label>
      </div>
      <button type="submit" class="btn primary small">Valider</button>
    `;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleSignup(event.id, form);
    });
    signupDetails.appendChild(form);
    content.appendChild(signupDetails);
    wrapper.appendChild(content);
    // Analytics : clic sur l'entête titre
    titleEl.addEventListener('click', () => {
      recordAnalytics(event.id, 'event_click');
    });
    return wrapper;
  }

  /**
   * Formate une date ISO (YYYY-MM-DD) en format local (jour mois année)
   */
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  /**
   * Gère l'inscription à un événement avec validations
   */
  async function handleSignup(eventId, form) {
    const email = form.elements['email'].value.trim();
    const phone = form.elements['phone'].value.trim();
    const prep = form.elements['preparation_salle'].checked;
    const partie = form.elements['partie_evenement'].checked;
    const entier = form.elements['evenement_entier'].checked;
    // Validations
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    const phoneRegex = /^((\+33|0)[1-9](\s?\d{2}){4})$/;
    if (!emailRegex.test(email)) {
      showToast('Email invalide', 'danger');
      return;
    }
    if (!phoneRegex.test(phone.replace(/\./g, '').replace(/ /g, ''))) {
      showToast('Téléphone invalide', 'danger');
      return;
    }
    if (!prep && !partie && !entier) {
      showToast('Veuillez sélectionner au moins une participation', 'danger');
      return;
    }
    // Vérifie unicité (event_id, email)
    const { data: existing, error } = await supabase
      .from('inscriptions')
      .select('id')
      .eq('event_id', eventId)
      .eq('email', email);
    if (error) {
      showToast('Erreur lors de la vérification', 'danger');
      return;
    }
    if (existing && existing.length > 0) {
      showToast('Vous êtes déjà inscrit à cet événement', 'danger');
      return;
    }
    // Insère l'inscription
    const { error: insertError } = await supabase.from('inscriptions').insert([
      {
        event_id: eventId,
        email: email,
        phone: phone,
        preparation_salle: prep,
        partie_evenement: partie,
        evenement_entier: entier
      }
    ]);
    if (insertError) {
      showToast('Erreur lors de l’inscription', 'danger');
    } else {
      showToast('Inscription réussie !', 'success');
      form.reset();
      // recharge les stats/données pour refléter l'augmentation du nombre de participants
      if (currentAdmin) reloadAdminEvents();
    }
  }

  /**
   * Enregistre une action analytique
   */
  async function recordAnalytics(eventId, action) {
    try {
      await supabase.from('analytics').insert([
        { event_id: eventId, action: action }
      ]);
    } catch (e) {
      console.error('Analytics error', e);
    }
  }

  /**
   * Gestion du tableau de bord admin : charge KPIs
   */
  async function loadDashboardKPIs() {
    // Total inscrits
    const { count: inscritCount } = await supabase.from('inscriptions').select('id', { count: 'exact', head: true });
    kpiTotalInscrits.textContent = inscritCount || 0;
    // Événements actifs
    const { count: activeEvents } = await supabase.from('events').select('id', { count: 'exact', head: true }).eq('visible', true).eq('archived', false);
    kpiEventsActifs.textContent = activeEvents || 0;
    // Emails uniques
    const { data: emailsData } = await supabase.from('inscriptions').select('email');
    const uniqueEmails = new Set(emailsData ? emailsData.map(e => e.email) : []);
    kpiEmailsUniques.textContent = uniqueEmails.size;
    // Taux moyen : moyenne des taux de remplissage
    const { data: allEvents } = await supabase.from('events').select('id, max_participants').eq('archived', false);
    let totalRate = 0;
    let countEvents = 0;
    for (const ev of allEvents || []) {
      const { count } = await supabase.from('inscriptions').select('id', { count: 'exact', head: true }).eq('event_id', ev.id);
      if (ev.max_participants > 0) {
        totalRate += ((count || 0) / ev.max_participants);
        countEvents++;
      }
    }
    kpiTauxMoyen.textContent = countEvents > 0 ? `${Math.round((totalRate / countEvents) * 100)}%` : '0%';
  }

  /**
   * Charge et affiche la liste des événements pour l'administration
   */
  async function reloadAdminEvents() {
    // Récupération des événements avec tous les statuts
    const { data, error } = await supabase.from('events').select('*').order('date', { ascending: true });
    if (error) {
      showToast('Erreur chargement événements admin', 'danger');
      return;
    }
    adminEvents = data || [];
    renderAdminEvents();
  }

  /**
   * Affiche les cartes événements dans la section admin
   */
  async function renderAdminEvents() {
    adminEventsContainer.innerHTML = '';
    const filter = eventsFilterSelect.value;
    const filtered = adminEvents.filter(ev => {
      if (filter === 'actifs') return ev.visible && !ev.archived;
      if (filter === 'masques') return !ev.visible;
      if (filter === 'archives') return ev.archived;
      return true;
    });
    for (const event of filtered) {
      const card = await createAdminEventCard(event);
      adminEventsContainer.appendChild(card);
    }
  }

  /**
   * Crée une carte d'événement pour l'admin avec jauge, participants et actions
   */
  async function createAdminEventCard(event) {
    const card = document.createElement('div');
    card.className = 'admin-event-card';
    // En‑tête avec statut
    const header = document.createElement('div');
    header.className = 'admin-event-header';
    header.innerHTML = `<span>${event.image}</span> <strong>${event.titre}</strong>`;
    card.appendChild(header);
    // Date et lieu
    const meta = document.createElement('div');
    meta.className = 'admin-event-meta';
    meta.textContent = `${formatDate(event.date)} à ${event.heure} — ${event.lieu}`;
    card.appendChild(meta);
    // Statut badges
    const badge = document.createElement('span');
    badge.className = 'badge-status';
    if (event.archived) {
      badge.classList.add('badge-archive');
      badge.textContent = '⚫ Archivé';
    } else if (!event.visible) {
      badge.classList.add('badge-masque');
      badge.textContent = '🟠 Masqué';
    } else {
      badge.classList.add('badge-actif');
      badge.textContent = '🟢 Actif';
    }
    card.appendChild(badge);
    // Jauge de remplissage
    const gaugeContainer = document.createElement('div');
    gaugeContainer.className = 'admin-event-gauge';
    const gaugeFill = document.createElement('div');
    gaugeFill.className = 'fill';
    gaugeContainer.appendChild(gaugeFill);
    card.appendChild(gaugeContainer);
    // Récupère le nombre d'inscrits pour la jauge et la liste
    const { data: inscritsData } = await supabase.from('inscriptions').select('*').eq('event_id', event.id);
    const countInscrits = inscritsData ? inscritsData.length : 0;
    const taux = event.max_participants > 0 ? Math.min((countInscrits / event.max_participants) * 100, 100) : 0;
    gaugeFill.style.width = `${taux}%`;
    gaugeFill.style.backgroundColor = taux < 50 ? 'var(--success)' : (taux < 80 ? '#ffc107' : 'var(--danger)');
    const gaugeLabel = document.createElement('span');
    gaugeLabel.textContent = `${countInscrits}/${event.max_participants} participants`;
    card.appendChild(gaugeLabel);
    // Liste des inscrits dépliable
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = `Voir les inscrits (${countInscrits})`;
    details.appendChild(summary);
    const list = document.createElement('ul');
    list.className = 'inscrits-list';
    (inscritsData || []).forEach(item => {
      const li = document.createElement('li');
      li.textContent = `${item.email} – ${item.phone}`;
      list.appendChild(li);
    });
    details.appendChild(list);
    card.appendChild(details);
    // Actions (modifier, supprimer, toggle, export, restaurer)
    const actions = document.createElement('div');
    actions.className = 'event-actions';
    // Modifier
    const editBtn = document.createElement('button');
    editBtn.className = 'btn secondary small';
    editBtn.textContent = '✏️ Modifier';
    editBtn.addEventListener('click', () => openEventModal(event));
    actions.appendChild(editBtn);
    // Supprimer
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn danger small';
    deleteBtn.textContent = '🗑️ Supprimer';
    deleteBtn.addEventListener('click', () => {
      if (confirm('Supprimer cet événement ?')) {
        deleteEvent(event.id);
      }
    });
    actions.appendChild(deleteBtn);
    // Toggle visible
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn secondary small';
    toggleBtn.textContent = event.visible ? '👁️ Masquer' : '👁️ Afficher';
    toggleBtn.addEventListener('click', () => toggleVisible(event));
    actions.appendChild(toggleBtn);
    // Export CSV
    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn secondary small';
    exportBtn.textContent = '📥 Export';
    exportBtn.addEventListener('click', () => exportEventCSV(event.id, event.titre));
    actions.appendChild(exportBtn);
    // Restaurer (si archivé)
    if (event.archived) {
      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'btn secondary small';
      restoreBtn.textContent = '🔄 Restaurer';
      restoreBtn.addEventListener('click', () => restoreEvent(event));
      actions.appendChild(restoreBtn);
    }
    card.appendChild(actions);
    return card;
  }

  /**
   * Ouvre la modale d'événement pour création ou modification
   */
  function openEventModal(event = null) {
    // Pré-remplit le formulaire si modification
    const emojiInput = document.getElementById('event-emoji');
    const titleInput = document.getElementById('event-title');
    const descInput = document.getElementById('event-description');
    const dateInput = document.getElementById('event-date');
    const timeInput = document.getElementById('event-time');
    const locationInput = document.getElementById('event-location');
    const typeSelect = document.getElementById('event-type');
    const maxInput = document.getElementById('event-max-participants');
    const visibleCheckbox = document.getElementById('event-visible');
    eventModal.classList.remove('hidden');
    document.getElementById('modal-title').textContent = event ? 'Modifier l\'événement' : 'Nouvel événement';
    eventForm.dataset.eventId = event ? event.id : '';
    emojiInput.value = event ? event.image : '';
    titleInput.value = event ? event.titre : '';
    descInput.value = event ? event.description || '' : '';
    dateInput.value = event ? event.date : '';
    timeInput.value = event ? event.heure : '';
    locationInput.value = event ? event.lieu : '';
    typeSelect.value = event ? event.type : (eventTypes[0] || '');
    maxInput.value = event ? event.max_participants : '';
    visibleCheckbox.checked = event ? event.visible : true;
  }

  /**
   * Ferme la modale d'événement
   */
  function closeEventModal() {
    eventModal.classList.add('hidden');
    eventForm.reset();
    delete eventForm.dataset.eventId;
  }

  // Gestion soumission formulaire événement
  eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = eventForm.dataset.eventId;
    const emoji = document.getElementById('event-emoji').value.trim() || '🎉';
    const titre = document.getElementById('event-title').value.trim();
    const description = document.getElementById('event-description').value.trim();
    const date = document.getElementById('event-date').value;
    const heure = document.getElementById('event-time').value;
    const lieu = document.getElementById('event-location').value.trim();
    const type = document.getElementById('event-type').value;
    const maxParticipants = parseInt(document.getElementById('event-max-participants').value, 10);
    const visible = document.getElementById('event-visible').checked;
    // validations
    if (!titre || !date || !heure || !lieu || !maxParticipants || maxParticipants <= 0) {
      showToast('Veuillez renseigner tous les champs obligatoires', 'danger');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      showToast('La date doit être postérieure à aujourd\'hui', 'danger');
      return;
    }
    const payload = {
      image: emoji,
      titre,
      description,
      date,
      heure,
      lieu,
      type,
      max_participants: maxParticipants,
      visible,
      archived: false
    };
    let result;
    if (id) {
      result = await supabase.from('events').update(payload).eq('id', id);
    } else {
      result = await supabase.from('events').insert([payload]);
    }
    if (result.error) {
      showToast('Erreur lors de l\'enregistrement de l\'événement', 'danger');
    } else {
      showToast('Événement enregistré', 'success');
      closeEventModal();
      await loadPublicEvents();
      await reloadAdminEvents();
      await loadDashboardKPIs();
    }
  });
  eventModalCancel.addEventListener('click', () => closeEventModal());

  async function deleteEvent(id) {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) {
      showToast('Erreur suppression événement', 'danger');
    } else {
      showToast('Événement supprimé', 'success');
      await loadPublicEvents();
      await reloadAdminEvents();
      await loadDashboardKPIs();
    }
  }
  async function toggleVisible(event) {
    const { error } = await supabase.from('events').update({ visible: !event.visible }).eq('id', event.id);
    if (error) {
      showToast('Erreur lors du changement de visibilité', 'danger');
    } else {
      showToast('Visibilité modifiée', 'success');
      await loadPublicEvents();
      await reloadAdminEvents();
    }
  }
  async function restoreEvent(event) {
    const { error } = await supabase.from('events').update({ archived: false, visible: true }).eq('id', event.id);
    if (error) {
      showToast('Erreur restauration', 'danger');
    } else {
      showToast('Événement restauré', 'success');
      await loadPublicEvents();
      await reloadAdminEvents();
    }
  }
  async function exportEventCSV(eventId, titre) {
    const { data, error } = await supabase.from('inscriptions').select('email,phone,preparation_salle,partie_evenement,evenement_entier').eq('event_id', eventId);
    if (error) {
      showToast('Erreur export CSV', 'danger');
      return;
    }
    const csv = toCSV(data);
    downloadFile(`${titre}_inscriptions.csv`, csv);
  }

  /**
   * Statistiques : charge les KPI et la table détaillée
   */
  async function loadStats() {
    // KPI
    const { count: pageViews } = await supabase.from('analytics').select('id', { count: 'exact', head: true }).eq('action', 'page_view');
    const { count: eventClicks } = await supabase.from('analytics').select('id', { count: 'exact', head: true }).eq('action', 'event_click');
    kpiPagesVues.textContent = pageViews || 0;
    kpiClicsEvents.textContent = eventClicks || 0;
    // Table détaillée
    statsTableBody.innerHTML = '';
    for (const ev of adminEvents) {
      const { count: inscritsCount } = await supabase.from('inscriptions').select('id', { count: 'exact', head: true }).eq('event_id', ev.id);
      const { data: eventAnalytics } = await supabase.from('analytics').select('action').eq('event_id', ev.id);
      const vues = (eventAnalytics || []).filter(a => a.action === 'page_view').length;
      const clics = (eventAnalytics || []).filter(a => a.action === 'event_click').length;
      const rate = ev.max_participants > 0 ? Math.round(((inscritsCount || 0) / ev.max_participants) * 100) : 0;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${ev.titre}</td><td>${vues}</td><td>${clics}</td><td>${inscritsCount || 0}</td><td>${ev.max_participants}</td><td>${rate}%</td>`;
      statsTableBody.appendChild(tr);
    }
  }
  exportEmailsBtn.addEventListener('click', async () => {
    const { data, error } = await supabase.from('inscriptions').select('email');
    if (error) {
      showToast('Erreur export emails', 'danger');
      return;
    }
    const unique = Array.from(new Set(data.map(i => i.email)));
    downloadFile('emails.txt', unique.join('; '));
  });
  exportStatsBtn.addEventListener('click', async () => {
    const rows = [];
    for (const ev of adminEvents) {
      const { count: inscritsCount } = await supabase.from('inscriptions').select('id', { count: 'exact', head: true }).eq('event_id', ev.id);
      const { data: eventAnalytics } = await supabase.from('analytics').select('action').eq('event_id', ev.id);
      const vues = (eventAnalytics || []).filter(a => a.action === 'page_view').length;
      const clics = (eventAnalytics || []).filter(a => a.action === 'event_click').length;
      const rate = ev.max_participants > 0 ? Math.round(((inscritsCount || 0) / ev.max_participants) * 100) : 0;
      rows.push({ titre: ev.titre, vues, clics, inscrits: inscritsCount || 0, places: ev.max_participants, taux: `${rate}%` });
    }
    const csv = toCSV(rows);
    downloadFile('stats.csv', csv);
  });

  /**
   * Charge et affiche les bénévoles
   */
  async function loadVolunteers() {
    const { data, error } = await supabase.from('volunteer_profiles').select('*').order('participations_count', { ascending: false });
    if (error) {
      showToast('Erreur chargement bénévoles', 'danger');
      return;
    }
    let volunteers = data || [];
    // Fonction de rendu filtrée
    function renderVolunteers() {
      const query = volunteerSearchInput.value.toLowerCase();
      const filtered = volunteers.filter(v => {
        return (
          (v.first_name || '').toLowerCase().includes(query) ||
          (v.last_name || '').toLowerCase().includes(query) ||
          (v.email || '').toLowerCase().includes(query)
        );
      });
      volunteersTableBody.innerHTML = '';
      filtered.forEach(v => {
        const tr = document.createElement('tr');
        const badge = `<span class="badge-status badge-actif">${v.participations_count} participations</span>`;
        tr.innerHTML = `<td>${v.first_name || ''}</td><td>${v.last_name || ''}</td><td>${v.email}</td><td>${v.phone || ''}</td><td>${badge}</td><td><button class="btn secondary small">Historique</button></td>`;
        const histBtn = tr.querySelector('button');
        histBtn.addEventListener('click', () => openVolunteerHistory(v.email));
        volunteersTableBody.appendChild(tr);
      });
    }
    volunteerSearchInput.addEventListener('input', debounce(renderVolunteers, 300));
    renderVolunteers();
  }
  exportVolunteersBtn.addEventListener('click', async () => {
    const { data, error } = await supabase.from('volunteer_profiles').select('first_name,last_name,email,phone,participations_count');
    if (error) {
      showToast('Erreur export bénévoles', 'danger');
      return;
    }
    const csv = toCSV(data);
    downloadFile('benevoles.csv', csv);
  });
  async function openVolunteerHistory(email) {
    // Récupère les inscriptions pour ce bénévole avec jointure sur events
    const { data, error } = await supabase
      .from('inscriptions')
      .select('event_id, events:titre, events:date')
      .eq('email', email);
    if (error) {
      showToast('Erreur chargement historique', 'danger');
      return;
    }
    volunteerHistoryTableBody.innerHTML = '';
    (data || []).forEach(item => {
      const tr = document.createElement('tr');
      const ev = item.events;
      tr.innerHTML = `<td>${ev.titre}</td><td>${formatDate(ev.date)}</td>`;
      volunteerHistoryTableBody.appendChild(tr);
    });
    volunteerHistoryModal.classList.remove('hidden');
  }
  volunteerHistoryClose.addEventListener('click', () => {
    volunteerHistoryModal.classList.add('hidden');
  });

  /**
   * Charge et affiche la liste des administrateurs
   */
  async function loadAdmins() {
    const { data, error } = await supabase.from('admins').select('*').order('email');
    if (error) {
      showToast('Erreur chargement admins', 'danger');
      return;
    }
    adminsTableBody.innerHTML = '';
    (data || []).forEach(admin => {
      const tr = document.createElement('tr');
      const perms = ['perm_view_events', 'perm_edit_events', 'perm_view_stats', 'perm_view_logs', 'perm_view_volunteers', 'perm_manage_admins', 'perm_config'];
      tr.innerHTML = `<td>${admin.email}</td><td>${admin.nom}</td>`;
      perms.forEach(p => {
        const td = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!admin[p];
        input.disabled = admin.email === currentAdmin?.email; // ne pas désactiver modifications sur soi-même? (optionnel)
        input.addEventListener('change', () => {
          admin[p] = input.checked;
        });
        td.appendChild(input);
        tr.appendChild(td);
      });
      // Actions
      const actionsTd = document.createElement('td');
      // Enregistrer
      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn secondary small';
      saveBtn.textContent = 'Enregistrer';
      saveBtn.addEventListener('click', async () => {
        const update = {};
        perms.forEach(p => { update[p] = admin[p]; });
        const { error } = await supabase.from('admins').update(update).eq('id', admin.id);
        if (error) {
          showToast('Erreur mise à jour admin', 'danger');
        } else {
          showToast('Admin mis à jour', 'success');
        }
      });
      actionsTd.appendChild(saveBtn);
      // Supprimer
      if (admin.email !== currentAdmin?.email) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn danger small';
        deleteBtn.textContent = 'Supprimer';
        deleteBtn.addEventListener('click', async () => {
          if (confirm('Supprimer cet administrateur ?')) {
            const { error } = await supabase.from('admins').delete().eq('id', admin.id);
            if (error) {
              showToast('Erreur suppression admin', 'danger');
            } else {
              showToast('Admin supprimé', 'success');
              loadAdmins();
            }
          }
        });
        actionsTd.appendChild(deleteBtn);
      }
      tr.appendChild(actionsTd);
      adminsTableBody.appendChild(tr);
    });
  }
  // Ajout d'un admin
  addAdminBtn.addEventListener('click', () => {
    addAdminModal.classList.remove('hidden');
  });
  addAdminCancel.addEventListener('click', () => {
    addAdminModal.classList.add('hidden');
    addAdminForm.reset();
  });
  addAdminForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('new-admin-email').value.trim();
    const firstName = document.getElementById('new-admin-first-name').value.trim();
    const lastName = document.getElementById('new-admin-last-name').value.trim();
    if (!email || !firstName || !lastName) {
      showToast('Tous les champs sont requis', 'danger');
      return;
    }
    // Générez un mot de passe temporaire et son hash
    await loadBcrypt();
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashed = await bcrypt.hash(tempPassword, 10);
    const { error } = await supabase.from('admins').insert([
      {
        email: email,
        nom: `${firstName} ${lastName}`,
        hashed_password: hashed,
        perm_view_events: false,
        perm_edit_events: false,
        perm_view_stats: false,
        perm_view_logs: false,
        perm_view_volunteers: false,
        perm_manage_admins: false,
        perm_config: false
      }
    ]);
    if (error) {
      showToast('Erreur ajout admin', 'danger');
    } else {
      showToast('Administrateur ajouté. Mot de passe provisoire: ' + tempPassword, 'success');
      addAdminModal.classList.add('hidden');
      addAdminForm.reset();
      loadAdmins();
    }
  });

  /**
   * Gestion de la configuration (app_config)
   */
  configForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updates = [];
    // Logo (si modifié)
    const logoFile = logoInput.files[0];
    if (logoFile) {
      // Vérifie taille <= 2 Mo
      if (logoFile.size > 2 * 1024 * 1024) {
        showToast('Logo trop volumineux (>2 Mo)', 'danger');
        return;
      }
      const base64 = await fileToBase64(logoFile);
      updates.push({ key: 'logo_url', value: base64 });
    }
    // Intro
    updates.push({ key: 'intro_text', value: introTextarea.value });
    // Types événement
    updates.push({ key: 'event_types', value: eventTypesTextarea.value });
    // Exécute les updates (upsert)
    for (const item of updates) {
      const { error } = await supabase.from('app_config').upsert(item, { onConflict: 'key' });
      if (error) {
        showToast('Erreur enregistrement configuration', 'danger');
        return;
      }
    }
    showToast('Configuration enregistrée', 'success');
    await loadAppConfig();
  });
  // Suppression du logo
  removeLogoBtn.addEventListener('click', async () => {
    const { error } = await supabase.from('app_config').upsert({ key: 'logo_url', value: '' }, { onConflict: 'key' });
    if (error) {
      showToast('Erreur suppression logo', 'danger');
    } else {
      logoPreview.innerHTML = '';
      logoInput.value = '';
      showToast('Logo supprimé', 'success');
    }
  });
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Charge et affiche les logs
   */
  async function loadLogs() {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      showToast('Erreur chargement logs', 'danger');
      return;
    }
    logsTableBody.innerHTML = '';
    (data || []).forEach(log => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${log.admin_email}</td><td>${log.action}</td><td>${log.entity_type}</td><td>${log.entity_id || ''}</td><td>${new Date(log.created_at).toLocaleString('fr-FR')}</td>`;
      logsTableBody.appendChild(tr);
    });
  }

  /**
   * Gestion du login administrateur
   */
  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = adminLoginForm.elements['email'].value.trim();
    const password = adminLoginForm.elements['password'].value;
    if (!email || !password) {
      adminLoginError.textContent = 'Veuillez remplir tous les champs.';
      return;
    }
    // Charge bcrypt si nécessaire
    try {
      await loadBcrypt();
    } catch (err) {
      adminLoginError.textContent = 'Erreur chargement bcrypt.';
      return;
    }
    // Récupère l'admin correspondant
    const { data, error } = await supabase.from('admins').select('*').eq('email', email).single();
    if (error || !data) {
      adminLoginError.textContent = 'Identifiants invalides.';
      return;
    }
    const match = await bcrypt.compare(password, data.hashed_password);
    if (!match) {
      adminLoginError.textContent = 'Identifiants invalides.';
      return;
    }
    adminLoginError.textContent = '';
    currentAdmin = data;
    localStorage.setItem('adminEmail', email);
    // Initialise l'interface admin
    adminLogin.classList.add('hidden');
    adminDashboard.classList.remove('hidden');
    // Charge toutes les données nécessaires
    await loadDashboardKPIs();
    await reloadAdminEvents();
    await loadStats();
    await loadVolunteers();
    await loadAdmins();
    await loadLogs();
  });

  // Déconnexion / masquage admin
  adminToggleBtn.addEventListener('click', () => {
    if (adminSection.classList.contains('hidden')) {
      adminSection.classList.remove('hidden');
      publicSection.classList.add('hidden');
    } else {
      adminSection.classList.add('hidden');
      publicSection.classList.remove('hidden');
    }
  });

  // Changement d'onglet dans le back‑office
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tabName = btn.dataset.tab;
      tabContents.forEach(c => {
        if (c.id === `tab-${tabName}`) {
          c.classList.remove('hidden');
        } else {
          c.classList.add('hidden');
        }
      });
      // Rafraîchit les sections si nécessaire
      if (tabName === 'dashboard') loadDashboardKPIs();
      if (tabName === 'events') reloadAdminEvents();
      if (tabName === 'stats') loadStats();
      if (tabName === 'volunteers') loadVolunteers();
      if (tabName === 'admins') loadAdmins();
      if (tabName === 'config') loadAppConfig();
      if (tabName === 'logs') loadLogs();
    });
  });
  // Filtre des événements admin
  eventsFilterSelect.addEventListener('change', renderAdminEvents);
  // Bouton créer événement
  createEventBtn.addEventListener('click', () => openEventModal());
  // Changement de vue publique
  viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      viewButtons.forEach(b => b.setAttribute('aria-selected', 'false'));
      btn.setAttribute('aria-selected', 'true');
      currentView = btn.dataset.view;
      renderPublicEvents();
    });
  });
  // Thème
  themeToggleBtn.addEventListener('click', toggleTheme);
  // RGPD notice clickable pour détails (optionnel)
  rgpdNotice.addEventListener('click', () => {
    alert('Vos données sont utilisées uniquement pour organiser les événements. Elles ne seront ni revendues ni partagées.');
  });
  // Déconnexion modales on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      eventModal.classList.add('hidden');
      addAdminModal.classList.add('hidden');
      volunteerHistoryModal.classList.add('hidden');
    }
  });

  /**
   * Débounce pour limiter la fréquence d'appel d'une fonction
   */
  function debounce(fn, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }

  /**
   * Archivage automatique des événements passés. Exécuté toutes les minutes.
   */
  setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      const lastRun = localStorage.getItem('lastArchiveRun');
      const today = now.toISOString().split('T')[0];
      if (lastRun !== today) {
        // archive les événements dont la date est strictement inférieure à aujourd'hui
        const { error } = await supabase.from('events').update({ archived: true }).lt('date', today).eq('archived', false);
        if (!error) {
          localStorage.setItem('lastArchiveRun', today);
          showToast('Archivage automatique effectué', 'info');
          await loadPublicEvents();
          await reloadAdminEvents();
        }
      }
    }
  }, 60 * 1000);

  // Initialisation
  document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    await loadAppConfig();
    await loadPublicEvents();
    recordAnalytics(null, 'page_view');
    // Vérifie si un admin est déjà connecté (via localStorage)
    const storedEmail = localStorage.getItem('adminEmail');
    if (storedEmail) {
      const { data, error } = await supabase.from('admins').select('*').eq('email', storedEmail).single();
      if (!error && data) {
        currentAdmin = data;
        adminLogin.classList.add('hidden');
        adminDashboard.classList.remove('hidden');
        await loadDashboardKPIs();
        await reloadAdminEvents();
        await loadStats();
        await loadVolunteers();
        await loadAdmins();
        await loadLogs();
      }
    }
  });
})();
