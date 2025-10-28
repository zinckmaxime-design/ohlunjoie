/*
 * Ohlun'Joie V3.0 – Script principal
 *
 * Ce fichier initialise la connexion Supabase, charge les événements publics,
 * gère les formulaires d'inscription, applique la logique de thème clair/sombre
 * et fournit un back‑office complet pour les administrateurs.
 * Le code est entièrement écrit en JavaScript vanilla.
 */

(() => {
  // ---------------------------------------------------------------------------
  // Configuration Supabase
  const SUPABASE_URL = 'https://duqkrpgcqbasbnzynfuh.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1cWtycGdjcWJhc2JuenluZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NDM5NTAsImV4cCI6MjA3NjExOTk1MH0.nikdF6TMoFgQHSeEtpfXjWHNOazALoFF_stkunz8OcU';
  const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ---------------------------------------------------------------------------
  // Sélecteurs DOM généraux
  const body = document.body;
  const themeToggleBtn = document.getElementById('theme-toggle');
  const adminToggleBtn = document.getElementById('admin-toggle');
  const publicSection = document.getElementById('public-section');
  const adminSection = document.getElementById('admin-section');
  const introTextEl = document.getElementById('intro-text');
  const eventsContainer = document.getElementById('events-container');
  const countdownValue = document.getElementById('countdown-value');
  const viewButtons = document.querySelectorAll('.view-btn');
  const rgpdNotice = document.getElementById('rgpd-notice');
  const toastContainer = document.getElementById('toast-container');
  // Signup modal elements
  const signupModal = document.getElementById('signup-modal');
  const signupForm = document.getElementById('signup-form');
  const signupCancelBtn = document.getElementById('signup-cancel');
  const signupEventIdInput = document.getElementById('signup-event-id');
  const signupFirstNameInput = document.getElementById('signup-first-name');
  const signupLastNameInput = document.getElementById('signup-last-name');
  const signupEmailInput = document.getElementById('signup-email');
  const signupPhoneInput = document.getElementById('signup-phone');
  const signupPrepCheckbox = document.getElementById('signup-preparation');
  const signupPartieCheckbox = document.getElementById('signup-partie');
  const signupEntierCheckbox = document.getElementById('signup-entier');
  const signupCommentInput = document.getElementById('signup-comment');
  const signupError = document.getElementById('signup-error');

  // Admin DOM elements
  const adminLoginEl = document.getElementById('admin-login');
  const adminLoginForm = document.getElementById('admin-login-form');
  const adminLoginError = document.getElementById('admin-login-error');
  const adminDashboard = document.getElementById('admin-dashboard');
  const adminTabButtons = document.querySelectorAll('.admin-tabs .tab-btn');
  const adminTabContents = document.querySelectorAll('.tab-content');
  // KPIs
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
  // Stats admin
  const kpiPagesVues = document.getElementById('kpi-pages-vues');
  const kpiClicsEvents = document.getElementById('kpi-clics-events');
  const statsTableBody = document.querySelector('#stats-table tbody');
  const exportEmailsBtn = document.getElementById('export-emails-btn');
  const exportStatsBtn = document.getElementById('export-stats-btn');
  // Volunteers admin
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

  // State variables
  let currentView = 'timeline';
  let publicEvents = [];
  let eventTypes = [];
  let currentAdmin = null;
  let adminEvents = [];

  // ---------------------------------------------------------------------------
  // Utilitaires généraux

  /**
   * Affiche une notification toast temporaire.
   * @param {string} message Le message à afficher
   * @param {string} type Type de message : 'info', 'success' ou 'danger'
   */
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'success') toast.classList.add('success');
    if (type === 'danger') toast.classList.add('danger');
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 4000);
  }

  /**
   * Convertit un tableau d'objets en CSV.
   * @param {Array<Object>} rows
   */
  function toCSV(rows) {
    if (!rows || rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(',')];
    rows.forEach(row => {
      const values = headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') ? `"${str}"` : str;
      });
      lines.push(values.join(','));
    });
    return lines.join('\n');
  }

  /**
   * Télécharge un fichier texte depuis le navigateur.
   * @param {string} filename
   * @param {string} content
   */
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

  /**
   * Charge dynamiquement la bibliothèque bcryptjs pour la validation de mots de passe.
   */
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

  // ---------------------------------------------------------------------------
  // Thème clair / sombre

  /** Initialise le thème en fonction des préférences utilisateur ou du système */
  function initTheme() {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
      body.classList.add('dark-theme');
      themeToggleBtn.textContent = '☀️';
    } else {
      body.classList.remove('dark-theme');
      themeToggleBtn.textContent = '🌙';
    }
  }

  /**
   * Bascule entre le thème clair et sombre
   */
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

  // ---------------------------------------------------------------------------
  // Chargement configuration depuis app_config

  async function loadAppConfig() {
    const { data, error } = await supabase.from('app_config').select('*');
    if (error) {
      console.error('Erreur chargement configuration', error);
      return;
    }
    data.forEach(item => {
      if (item.key === 'intro_text') {
        introTextEl.textContent = item.value;
        if (introTextarea) introTextarea.value = item.value;
      } else if (item.key === 'logo_url' && logoPreview) {
        if (item.value) {
          logoPreview.innerHTML = `<img src="${item.value}" alt="Logo">`;
        }
      } else if (item.key === 'event_types') {
        try {
          eventTypes = JSON.parse(item.value);
        } catch (e) {
          eventTypes = [];
        }
        if (eventTypesTextarea) eventTypesTextarea.value = item.value;
      }
    });
    // Remplir le select des types d'événements dans la modale admin
    const eventTypeSelect = document.getElementById('event-type');
    if (eventTypeSelect) {
      eventTypeSelect.innerHTML = '';
      eventTypes.forEach(type => {
        const opt = document.createElement('option');
        opt.value = type;
        opt.textContent = type;
        eventTypeSelect.appendChild(opt);
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Chargement des événements publics

  async function loadPublicEvents() {
    // Récupère les événements visibles et non archivés
    const { data: eventsData, error } = await supabase
      .from('events')
      .select('*')
      .eq('visible', true)
      .eq('archived', false)
      .order('date', { ascending: true })
      .order('heure', { ascending: true });
    if (error) {
      console.error('Erreur chargement événements', error);
      return;
    }
    publicEvents = [];
    for (const ev of eventsData) {
      // Nombre d'inscriptions
      const { count } = await supabase
        .from('inscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', ev.id);
      const inscritsCount = count || 0;
      const rate = ev.max_participants > 0 ? Math.min(100, Math.round((inscritsCount / ev.max_participants) * 100)) : 0;
      // Liste des emails inscrits
      const { data: inscritsData } = await supabase
        .from('inscriptions')
        .select('email')
        .eq('event_id', ev.id);
      const emails = (inscritsData || []).map(i => i.email);
      // Récupère les noms/prénoms depuis volunteer_profiles
      let participantsList = [];
      if (emails.length > 0) {
        const { data: namesData } = await supabase
          .from('volunteer_profiles')
          .select('first_name, last_name, email')
          .in('email', emails);
        participantsList = (namesData || []).map(p => ({ first_name: p.first_name || '', last_name: p.last_name || '' }));
      }
      const availablePlaces = ev.max_participants - inscritsCount;
      publicEvents.push({ ...ev, inscritsCount, rate, participantsList, availablePlaces });
    }
    renderPublicEvents();
    updateCountdown();
  }

  /**
   * Rend les événements publics en fonction de la vue sélectionnée.
   */
  function renderPublicEvents() {
    // Met à jour la classe du conteneur pour la vue
    eventsContainer.classList.remove('timeline-view', 'list-view', 'cards-view');
    eventsContainer.classList.add(`${currentView}-view`);
    // Vide le conteneur
    eventsContainer.innerHTML = '';
    if (!publicEvents || publicEvents.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.textContent = 'Aucun événement n’est planifié pour le moment.';
      emptyMsg.style.textAlign = 'center';
      eventsContainer.appendChild(emptyMsg);
      return;
    }
    publicEvents.forEach(event => {
      const card = createPublicEventElement(event);
      eventsContainer.appendChild(card);
    });
  }

  /**
   * Crée un élément DOM représentant un événement public.
   * @param {Object} event
   */
  function createPublicEventElement(event) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('public-event');
    // ENTÊTE
    const header = document.createElement('div');
    header.className = 'card-header';
    // Date badge
    const dateObj = new Date(event.date);
    const day = dateObj.toLocaleDateString('fr-FR', { day: '2-digit' });
    const month = dateObj.toLocaleDateString('fr-FR', { month: 'short' });
    const dateBadge = document.createElement('div');
    dateBadge.className = 'date-badge';
    dateBadge.innerHTML = `<span class="day">${day}</span><span class="month">${month}</span>`;
    header.appendChild(dateBadge);
    // En-tête principal
    const headerMain = document.createElement('div');
    headerMain.className = 'header-main';
    const titleEl = document.createElement('h3');
    titleEl.className = 'title';
    titleEl.innerHTML = `${event.image} ${event.titre}`;
    headerMain.appendChild(titleEl);
    // Chips
    const chips = document.createElement('div');
    chips.className = 'meta-chips';
    // Heure chip
    const timeChip = document.createElement('span');
    timeChip.className = 'chip';
    timeChip.innerHTML = `<span class="icon">⏰</span>${event.heure.slice(0,5)}`;
    chips.appendChild(timeChip);
    // Lieu chip
    const locChip = document.createElement('span');
    locChip.className = 'chip';
    locChip.innerHTML = `<span class="icon">📍</span>${event.lieu}`;
    chips.appendChild(locChip);
    // Type chip (utilise l'emoji comme icône)
    const typeChip = document.createElement('span');
    typeChip.className = 'chip';
    typeChip.innerHTML = `<span class="icon">${event.image}</span>${event.type}`;
    chips.appendChild(typeChip);
    headerMain.appendChild(chips);
    header.appendChild(headerMain);
    wrapper.appendChild(header);
    // BODY
    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'card-body';
    if (event.description) {
      const desc = document.createElement('p');
      desc.className = 'event-description';
      desc.textContent = event.description;
      bodyDiv.appendChild(desc);
    }
    wrapper.appendChild(bodyDiv);
    // FOOTER
    const footer = document.createElement('div');
    footer.className = 'card-footer';
    // Progress bar
    const progressWrapper = document.createElement('div');
    progressWrapper.className = 'progress-wrapper';
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    const progress = document.createElement('div');
    progress.className = 'progress';
    progress.style.width = `${event.rate}%`;
    progressBar.appendChild(progress);
    const label = document.createElement('span');
    label.className = 'progress-label';
    label.textContent = `${event.inscritsCount}/${event.max_participants} – ${event.rate}%`;
    progressWrapper.appendChild(progressBar);
    progressWrapper.appendChild(label);
    footer.appendChild(progressWrapper);
    // Liste des participants
    const detailsEl = document.createElement('details');
    const summaryEl = document.createElement('summary');
    summaryEl.textContent = `Voir les inscrits (${event.inscritsCount})`;
    detailsEl.appendChild(summaryEl);
    if (event.participantsList && event.participantsList.length > 0) {
      const ul = document.createElement('ul');
      ul.className = 'participant-list';
      event.participantsList.forEach(p => {
        const li = document.createElement('li');
        const fullName = `${p.first_name} ${p.last_name}`.trim();
        li.textContent = fullName || p.email;
        ul.appendChild(li);
      });
      detailsEl.appendChild(ul);
    }
    footer.appendChild(detailsEl);
    // Zone d'inscription
    const signupArea = document.createElement('div');
    signupArea.className = 'signup-area';
    const signupBtn = document.createElement('button');
    signupBtn.className = 'btn primary';
    signupBtn.textContent = "S'inscrire";
    signupBtn.addEventListener('click', () => openSignupModal(event));
    const available = document.createElement('span');
    available.className = 'available-places';
    available.textContent = `${event.availablePlaces} place${event.availablePlaces > 1 ? 's' : ''} disponibles`;
    signupArea.appendChild(signupBtn);
    signupArea.appendChild(available);
    footer.appendChild(signupArea);
    wrapper.appendChild(footer);
    // Analytics : clic sur le titre déclenche event_click
    titleEl.addEventListener('click', () => {
      recordAnalytics(event.id, 'event_click');
    });
    return wrapper;
  }

  /**
   * Met à jour le décompte jusqu'au prochain événement.
   */
  function updateCountdown() {
    if (!publicEvents || publicEvents.length === 0) {
      countdownValue.textContent = '0 jours';
      return;
    }
    // Premier événement à venir (liste déjà triée)
    const nextEvent = publicEvents[0];
    const now = new Date();
    const eventDate = new Date(nextEvent.date);
    // Calcule la différence en jours (arrondi supérieur)
    const diffTime = eventDate.getTime() - now.getTime();
    const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    countdownValue.textContent = `${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  }

  // ---------------------------------------------------------------------------
  // Formulaire d'inscription (visiteurs)

  /** Affiche la modale d'inscription pour un événement donné */
  function openSignupModal(event) {
    signupEventIdInput.value = event.id;
    signupError.textContent = '';
    signupForm.reset();
    // Pré-selectionne participation entière par défaut
    signupPrepCheckbox.checked = false;
    signupPartieCheckbox.checked = false;
    signupEntierCheckbox.checked = true;
    signupModal.classList.remove('hidden');
  }

  /** Ferme la modale d'inscription */
  function closeSignupModal() {
    signupModal.classList.add('hidden');
  }

  /** Gère la soumission du formulaire d'inscription */
  async function handleSignupSubmit(e) {
    e.preventDefault();
    const eventId = signupEventIdInput.value;
    const firstName = signupFirstNameInput.value.trim();
    const lastName = signupLastNameInput.value.trim();
    const email = signupEmailInput.value.trim();
    let phone = signupPhoneInput.value.trim();
    const prep = signupPrepCheckbox.checked;
    const partie = signupPartieCheckbox.checked;
    const entier = signupEntierCheckbox.checked;
    const comment = signupCommentInput.value.trim();
    // Validation basique
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    const phoneClean = phone.replace(/\s+/g, '');
    const phoneRegex = /^(\+33|0)[1-9](\d{2}){4}$/;
    if (!firstName || !lastName) {
      signupError.textContent = 'Veuillez saisir votre prénom et votre nom.';
      return;
    }
    if (!emailRegex.test(email)) {
      signupError.textContent = 'Email invalide.';
      return;
    }
    if (!phoneRegex.test(phoneClean)) {
      signupError.textContent = 'Téléphone invalide.';
      return;
    }
    if (!prep && !partie && !entier) {
      signupError.textContent = 'Choisissez au moins un type de participation.';
      return;
    }
    // Vérifie unicité inscription (event_id + email)
    const { data: existing, error: existingError } = await supabase
      .from('inscriptions')
      .select('id')
      .eq('event_id', eventId)
      .eq('email', email);
    if (existingError) {
      signupError.textContent = 'Erreur lors de la vérification. Veuillez réessayer.';
      return;
    }
    if (existing && existing.length > 0) {
      signupError.textContent = 'Vous êtes déjà inscrit à cet événement.';
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
      signupError.textContent = 'Erreur lors de l\'inscription.';
      return;
    }
    // Met à jour/insère le profil bénévole avec le prénom/nom et téléphone
    await supabase.from('volunteer_profiles').upsert([
      { email: email, first_name: firstName, last_name: lastName, phone: phone }
    ], { onConflict: 'email' });
    // Ajoute un log analytique sur l'inscription (optionnel)
    recordAnalytics(eventId, 'signup');
    // Réussite
    showToast('Inscription confirmée !', 'success');
    closeSignupModal();
    // Recharge les événements pour mettre à jour la jauge
    await loadPublicEvents();
    if (currentAdmin) await reloadAdminEvents();
  }

  // ---------------------------------------------------------------------------
  // Analytics

  async function recordAnalytics(eventId, action) {
    try {
      await supabase.from('analytics').insert([{ event_id: eventId, action: action }]);
    } catch (err) {
      console.error('Erreur analytics', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Administration

  /**
   * Initialise l'interface admin après authentification
   */
  function showAdminDashboard() {
    adminLoginEl.classList.add('hidden');
    adminDashboard.classList.remove('hidden');
    adminSection.classList.remove('hidden');
    publicSection.classList.add('hidden');
    loadDashboardKPIs();
    reloadAdminEvents();
    loadStats();
    loadVolunteers();
    loadAdmins();
    loadAppConfig();
    loadLogs();
  }

  /**
   * Authentifie un administrateur en vérifiant le mot de passe avec bcrypt
   */
  async function handleAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;
    adminLoginError.textContent = '';
    if (!email || !password) {
      adminLoginError.textContent = 'Veuillez saisir vos identifiants.';
      return;
    }
    // Charge bcrypt si nécessaire
    await loadBcrypt();
    // Récupère l'admin via l'adresse email
    const { data: adminsData, error } = await supabase.from('admins').select('*').eq('email', email);
    if (error || !adminsData || adminsData.length === 0) {
      adminLoginError.textContent = 'Utilisateur introuvable ou erreur.';
      return;
    }
    const admin = adminsData[0];
    // Vérifie le mot de passe
    const match = await bcrypt.compare(password, admin.hashed_password);
    if (!match) {
      adminLoginError.textContent = 'Mot de passe incorrect.';
      return;
    }
    // Enregistre l'utilisateur et affiche le dashboard
    currentAdmin = admin;
    showAdminDashboard();
  }

  /**
   * Charge les indicateurs du tableau de bord admin
   */
  async function loadDashboardKPIs() {
    // Total inscrits
    const { count: inscritsCount } = await supabase.from('inscriptions').select('id', { count: 'exact', head: true });
    kpiTotalInscrits.textContent = inscritsCount || 0;
    // Événements actifs (visibles + non archivés)
    const { count: eventsActifs } = await supabase.from('events').select('id', { count: 'exact', head: true }).eq('visible', true).eq('archived', false);
    kpiEventsActifs.textContent = eventsActifs || 0;
    // Emails uniques
    const { data: emailsData } = await supabase.from('inscriptions').select('email');
    const uniqueEmails = new Set((emailsData || []).map(item => item.email));
    kpiEmailsUniques.textContent = uniqueEmails.size;
    // Taux moyen de remplissage
    const { data: eventsData } = await supabase.from('events').select('id, max_participants').eq('archived', false);
    let sumRates = 0;
    let countRates = 0;
    for (const ev of eventsData || []) {
      const { count } = await supabase.from('inscriptions').select('id', { count: 'exact', head: true }).eq('event_id', ev.id);
      if (ev.max_participants > 0) {
        sumRates += (count || 0) / ev.max_participants;
        countRates++;
      }
    }
    const avgRate = countRates > 0 ? Math.round((sumRates / countRates) * 100) : 0;
    kpiTauxMoyen.textContent = `${avgRate}%`;
  }

  /**
   * Recharge la liste des événements pour l'administration
   */
  async function reloadAdminEvents() {
    const filter = eventsFilterSelect.value;
    let query = supabase.from('events').select('*').order('date', { ascending: true }).order('heure', { ascending: true });
    if (filter === 'active') {
      query = query.eq('visible', true).eq('archived', false);
    } else if (filter === 'hidden') {
      query = query.eq('visible', false).eq('archived', false);
    } else if (filter === 'archived') {
      query = query.eq('archived', true);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Erreur chargement événements admin', error);
      return;
    }
    adminEvents = data || [];
    renderAdminEvents();
  }

  /**
   * Rend les cartes d'événements dans le back‑office
   */
  function renderAdminEvents() {
    adminEventsContainer.innerHTML = '';
    adminEvents.forEach(ev => {
      const card = document.createElement('div');
      card.className = 'public-event';
      // date
      const dateObj = new Date(ev.date);
      const day = dateObj.toLocaleDateString('fr-FR', { day: '2-digit' });
      const month = dateObj.toLocaleDateString('fr-FR', { month: 'short' });
      const dateEl = document.createElement('div');
      dateEl.className = 'event-date';
      dateEl.innerHTML = `<span class="day">${day}</span><span class="month">${month}</span>`;
      // contenu
      const content = document.createElement('div');
      content.className = 'event-content';
      const title = document.createElement('h3');
      title.className = 'event-title';
      title.innerHTML = `${ev.image} <span>${ev.titre}</span>`;
      content.appendChild(title);
      const meta = document.createElement('div');
      meta.className = 'event-meta';
      meta.innerHTML = `<span class="time">${ev.heure.slice(0,5)}</span><span class="location">${ev.lieu}</span>`;
      content.appendChild(meta);
      // participants et jauge
      const progressWrapper = document.createElement('div');
      progressWrapper.className = 'progress-wrapper';
      const progressBar = document.createElement('div');
      progressBar.className = 'progress-bar';
      const progress = document.createElement('div');
      progress.className = 'progress';
      progressBar.appendChild(progress);
      const label = document.createElement('span');
      label.className = 'progress-label';
      progressWrapper.appendChild(progressBar);
      progressWrapper.appendChild(label);
      content.appendChild(progressWrapper);
      // boutons actions admin
      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '8px';
      // modifier
      const editBtn = document.createElement('button');
      editBtn.className = 'btn secondary';
      editBtn.textContent = '✏️';
      editBtn.addEventListener('click', () => openEventModal(ev));
      actions.appendChild(editBtn);
      // supprimer
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn secondary';
      deleteBtn.textContent = '🗑️';
      deleteBtn.addEventListener('click', () => deleteEvent(ev));
      actions.appendChild(deleteBtn);
      // toggle visible
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'btn secondary';
      toggleBtn.textContent = ev.visible ? '👁️' : '🚫';
      toggleBtn.addEventListener('click', () => toggleEventVisibility(ev));
      actions.appendChild(toggleBtn);
      // archive/restore
      const archiveBtn = document.createElement('button');
      archiveBtn.className = 'btn secondary';
      archiveBtn.textContent = ev.archived ? '🔄' : '📥';
      archiveBtn.addEventListener('click', () => archiveEvent(ev));
      actions.appendChild(archiveBtn);
      content.appendChild(actions);
      card.appendChild(dateEl);
      card.appendChild(content);
      adminEventsContainer.appendChild(card);
      // Charge les statistiques d'inscriptions pour chaque event
      updateAdminEventStats(ev, progress, label);
    });
  }

  /** Met à jour la jauge et le label d'un événement pour l'administration */
  async function updateAdminEventStats(ev, progressEl, labelEl) {
    const { count } = await supabase.from('inscriptions').select('id', { count: 'exact', head: true }).eq('event_id', ev.id);
    const inscrits = count || 0;
    const rate = ev.max_participants > 0 ? Math.min(100, Math.round((inscrits / ev.max_participants) * 100)) : 0;
    progressEl.style.width = `${rate}%`;
    labelEl.textContent = `${inscrits}/${ev.max_participants} – ${rate}%`;
  }

  /** Ouvre la modale de création ou édition d'événement */
  function openEventModal(ev = null) {
    eventModal.classList.remove('hidden');
    document.getElementById('event-modal-title').textContent = ev ? 'Modifier événement' : 'Nouvel événement';
    // Remplir les champs
    document.getElementById('event-id').value = ev ? ev.id : '';
    document.getElementById('event-emoji').value = ev ? ev.image : '';
    document.getElementById('event-title').value = ev ? ev.titre : '';
    document.getElementById('event-date').value = ev ? ev.date : '';
    document.getElementById('event-time').value = ev ? ev.heure : '';
    document.getElementById('event-location').value = ev ? ev.lieu : '';
    document.getElementById('event-type').value = ev ? ev.type : (eventTypes[0] || '');
    document.getElementById('event-description').value = ev ? ev.description || '' : '';
    document.getElementById('event-max').value = ev ? ev.max_participants : 1;
    document.getElementById('event-visible').checked = ev ? ev.visible : true;
    document.getElementById('event-archived').checked = ev ? ev.archived : false;
  }

  /** Ferme la modale d'événement */
  function closeEventModal() {
    eventModal.classList.add('hidden');
    eventForm.reset();
  }

  /** Sauvegarde (crée ou met à jour) un événement via Supabase */
  async function handleEventFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('event-id').value;
    const emoji = document.getElementById('event-emoji').value.trim() || '📅';
    const titre = document.getElementById('event-title').value.trim();
    const date = document.getElementById('event-date').value;
    const heure = document.getElementById('event-time').value;
    const lieu = document.getElementById('event-location').value.trim();
    const type = document.getElementById('event-type').value;
    const description = document.getElementById('event-description').value.trim();
    const max = parseInt(document.getElementById('event-max').value, 10);
    const visible = document.getElementById('event-visible').checked;
    const archived = document.getElementById('event-archived').checked;
    // Validations
    if (!titre || !date || !heure || !lieu || !type || !max || max < 1) {
      showToast('Veuillez remplir tous les champs obligatoires.', 'danger');
      return;
    }
    // Vérifie date >= aujourd'hui
    const nowDate = new Date().toISOString().split('T')[0];
    if (date < nowDate) {
      showToast('La date doit être ultérieure ou égale à aujourd’hui.', 'danger');
      return;
    }
    const eventData = {
      titre: titre,
      description: description,
      date: date,
      heure: heure,
      lieu: lieu,
      type: type,
      image: emoji,
      max_participants: max,
      visible: visible,
      archived: archived
    };
    let response;
    if (id) {
      response = await supabase.from('events').update(eventData).eq('id', id);
    } else {
      response = await supabase.from('events').insert([eventData]);
    }
    if (response.error) {
      showToast('Erreur lors de la sauvegarde de l’événement', 'danger');
    } else {
      showToast('Événement enregistré.', 'success');
      closeEventModal();
      await reloadAdminEvents();
      await loadPublicEvents();
    }
  }

  /** Supprime un événement après confirmation */
  async function deleteEvent(ev) {
    if (!confirm('Supprimer cet événement ?')) return;
    const { error } = await supabase.from('events').delete().eq('id', ev.id);
    if (error) {
      showToast('Erreur lors de la suppression', 'danger');
    } else {
      showToast('Événement supprimé.', 'success');
      reloadAdminEvents();
      loadPublicEvents();
    }
  }

  /** Bascule la visibilité d'un événement */
  async function toggleEventVisibility(ev) {
    const { error } = await supabase.from('events').update({ visible: !ev.visible }).eq('id', ev.id);
    if (error) {
      showToast('Erreur lors du changement de visibilité', 'danger');
    } else {
      reloadAdminEvents();
      loadPublicEvents();
    }
  }

  /** Archive ou restaure un événement */
  async function archiveEvent(ev) {
    const newArchived = !ev.archived;
    const { error } = await supabase.from('events').update({ archived: newArchived }).eq('id', ev.id);
    if (error) {
      showToast('Erreur lors de l’archivage', 'danger');
    } else {
      reloadAdminEvents();
      loadPublicEvents();
    }
  }

  /**
   * Charge les statistiques pour l’onglet Statistiques
   */
  async function loadStats() {
    // KPIs stats
    const { count: viewsCount } = await supabase.from('analytics').select('id', { count: 'exact', head: true }).eq('action', 'page_view');
    const { count: clicksCount } = await supabase.from('analytics').select('id', { count: 'exact', head: true }).eq('action', 'event_click');
    kpiPagesVues.textContent = viewsCount || 0;
    kpiClicsEvents.textContent = clicksCount || 0;
    // Tableau détaillé par événement
    const { data: eventsData } = await supabase.from('events').select('*');
    statsTableBody.innerHTML = '';
    for (const ev of eventsData || []) {
      const { count: views } = await supabase.from('analytics').select('id', { count: 'exact', head: true }).eq('event_id', ev.id).eq('action', 'page_view');
      const { count: clicks } = await supabase.from('analytics').select('id', { count: 'exact', head: true }).eq('event_id', ev.id).eq('action', 'event_click');
      const { count: inscrits } = await supabase.from('inscriptions').select('id', { count: 'exact', head: true }).eq('event_id', ev.id);
      const rate = ev.max_participants > 0 ? Math.min(100, Math.round((inscrits || 0) / ev.max_participants * 100)) : 0;
      const row = document.createElement('tr');
      row.innerHTML = `<td>${ev.titre}</td><td>${views || 0}</td><td>${clicks || 0}</td><td>${inscrits || 0}</td><td>${ev.max_participants}</td><td>${rate}%</td>`;
      statsTableBody.appendChild(row);
    }
  }

  /** Exporte toutes les adresses email des inscrits (fichier TXT) */
  async function exportEmails() {
    const { data } = await supabase.from('inscriptions').select('email');
    const uniqueEmails = Array.from(new Set((data || []).map(item => item.email)));
    downloadFile('emails.txt', uniqueEmails.join('; '));
  }

  /** Exporte les statistiques (CSV) */
  async function exportStats() {
    const rows = [];
    const { data: eventsData } = await supabase.from('events').select('*');
    for (const ev of eventsData || []) {
      const { count: views } = await supabase.from('analytics').select('id', { count: 'exact', head: true }).eq('event_id', ev.id).eq('action', 'page_view');
      const { count: clicks } = await supabase.from('analytics').select('id', { count: 'exact', head: true }).eq('event_id', ev.id).eq('action', 'event_click');
      const { count: inscrits } = await supabase.from('inscriptions').select('id', { count: 'exact', head: true }).eq('event_id', ev.id);
      const rate = ev.max_participants > 0 ? Math.min(100, Math.round((inscrits || 0) / ev.max_participants * 100)) : 0;
      rows.push({ titre: ev.titre, vues: views || 0, clics: clicks || 0, inscrits: inscrits || 0, places: ev.max_participants, taux: `${rate}%` });
    }
    const csv = toCSV(rows);
    downloadFile('stats.csv', csv);
  }

  // ---------------------------------------------------------------------------
  // Bénévoles

  /** Charge la liste des bénévoles */
  async function loadVolunteers() {
    const { data, error } = await supabase.from('volunteer_profiles').select('*').order('first_name', { ascending: true });
    if (error) {
      console.error('Erreur chargement bénévoles', error);
      return;
    }
    const volunteers = data || [];
    volunteersTableBody.innerHTML = '';
    volunteers.forEach(vol => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${vol.first_name || ''}</td><td>${vol.last_name || ''}</td><td>${vol.email}</td><td>${vol.phone || ''}</td><td>${vol.participations_count}</td><td><button class="btn secondary" data-email="${vol.email}">Historique</button></td>`;
      volunteersTableBody.appendChild(row);
    });
  }

  /** Affiche l'historique des participations d'un bénévole */
  async function showVolunteerHistory(email) {
    const { data, error } = await supabase
      .from('inscriptions')
      .select('event_id, created_at')
      .eq('email', email);
    if (error) {
      console.error('Erreur chargement historique bénévole', error);
      return;
    }
    const rows = data || [];
    volunteerHistoryTableBody.innerHTML = '';
    for (const rowData of rows) {
      const { data: eventData } = await supabase.from('events').select('titre, date').eq('id', rowData.event_id).single();
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${eventData.titre}</td><td>${rowData.created_at.slice(0, 10)}</td>`;
      volunteerHistoryTableBody.appendChild(tr);
    }
    volunteerHistoryModal.classList.remove('hidden');
  }

  // ---------------------------------------------------------------------------
  // Gestion des admins

  /** Charge tous les administrateurs */
  async function loadAdmins() {
    const { data, error } = await supabase.from('admins').select('*');
    if (error) {
      console.error('Erreur chargement admins', error);
      return;
    }
    adminsTableBody.innerHTML = '';
    (data || []).forEach(admin => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${admin.email}</td>
        <td>${admin.nom}</td>
        <td><input type="checkbox" data-id="${admin.id}" data-field="perm_view_events" ${admin.perm_view_events ? 'checked' : ''}></td>
        <td><input type="checkbox" data-id="${admin.id}" data-field="perm_edit_events" ${admin.perm_edit_events ? 'checked' : ''}></td>
        <td><input type="checkbox" data-id="${admin.id}" data-field="perm_view_stats" ${admin.perm_view_stats ? 'checked' : ''}></td>
        <td><input type="checkbox" data-id="${admin.id}" data-field="perm_view_logs" ${admin.perm_view_logs ? 'checked' : ''}></td>
        <td><input type="checkbox" data-id="${admin.id}" data-field="perm_view_volunteers" ${admin.perm_view_volunteers ? 'checked' : ''}></td>
        <td><input type="checkbox" data-id="${admin.id}" data-field="perm_manage_admins" ${admin.perm_manage_admins ? 'checked' : ''}></td>
        <td><input type="checkbox" data-id="${admin.id}" data-field="perm_config" ${admin.perm_config ? 'checked' : ''}></td>
        <td><button class="btn secondary" data-id="${admin.id}" data-action="delete">🗑️</button></td>
      `;
      adminsTableBody.appendChild(tr);
    });
  }

  /** Ajoute un nouvel administrateur */
  async function handleAddAdmin(e) {
    e.preventDefault();
    const email = document.getElementById('new-admin-email').value.trim();
    const prenom = document.getElementById('new-admin-prenom').value.trim();
    const nom = document.getElementById('new-admin-nom').value.trim();
    const perms = {
      perm_view_events: document.getElementById('perm-view-events').checked,
      perm_edit_events: document.getElementById('perm-edit-events').checked,
      perm_view_stats: document.getElementById('perm-view-stats').checked,
      perm_view_logs: document.getElementById('perm-view-logs').checked,
      perm_view_volunteers: document.getElementById('perm-view-volunteers').checked,
      perm_manage_admins: document.getElementById('perm-manage-admins').checked,
      perm_config: document.getElementById('perm-config').checked
    };
    if (!email || !prenom || !nom) {
      showToast('Veuillez remplir tous les champs de l’administrateur.', 'danger');
      return;
    }
    // Génère un mot de passe temporaire random pour le nouvel admin
    const tempPassword = Math.random().toString(36).slice(-10);
    const { error } = await supabase.from('admins').insert([
      {
        email: email,
        nom: prenom + ' ' + nom,
        hashed_password: bcrypt.hashSync(tempPassword, 8),
        ...perms
      }
    ]);
    if (error) {
      showToast('Erreur lors de l’ajout de l’admin', 'danger');
    } else {
      showToast('Administrateur ajouté. Un mot de passe temporaire a été généré.', 'success');
      addAdminModal.classList.add('hidden');
      addAdminForm.reset();
      loadAdmins();
    }
  }

  /** Met à jour les permissions d'un administrateur lorsqu'un checkbox est modifié */
  async function handleAdminPermChange(e) {
    if (e.target.tagName !== 'INPUT') return;
    const id = e.target.getAttribute('data-id');
    const field = e.target.getAttribute('data-field');
    const value = e.target.checked;
    const { error } = await supabase.from('admins').update({ [field]: value }).eq('id', id);
    if (error) {
      showToast('Erreur lors de la mise à jour des permissions', 'danger');
    }
  }

  /** Supprime un administrateur */
  async function handleAdminDelete(id) {
    if (!confirm('Supprimer cet administrateur ?')) return;
    const { error } = await supabase.from('admins').delete().eq('id', id);
    if (error) {
      showToast('Erreur lors de la suppression de l’admin', 'danger');
    } else {
      loadAdmins();
      showToast('Administrateur supprimé.', 'success');
    }
  }

  // ---------------------------------------------------------------------------
  // Configuration

  /** Enregistre les nouvelles valeurs de configuration */
  async function handleConfigSubmit(e) {
    e.preventDefault();
    // Logo
    let logoUrl = '';
    if (logoInput.files && logoInput.files[0]) {
      const file = logoInput.files[0];
      if (file.size > 2 * 1024 * 1024) {
        showToast('Logo trop volumineux (max 2 Mo).', 'danger');
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        logoUrl = reader.result;
        await saveConfig(logoUrl);
      };
      reader.readAsDataURL(file);
    } else {
      await saveConfig();
    }
  }

  /** Sauvegarde les valeurs dans app_config */
  async function saveConfig(logoDataUrl) {
    // intro text
    const introVal = introTextarea.value;
    const eventTypesVal = eventTypesTextarea.value;
    const updates = [];
    updates.push({ key: 'intro_text', value: introVal });
    if (logoDataUrl !== undefined) {
      updates.push({ key: 'logo_url', value: logoDataUrl || '' });
    }
    updates.push({ key: 'event_types', value: eventTypesVal });
    for (const item of updates) {
      const { error } = await supabase.from('app_config').upsert([item]);
      if (error) {
        showToast('Erreur lors de l’enregistrement de la configuration', 'danger');
        return;
      }
    }
    showToast('Configuration sauvegardée.', 'success');
    loadAppConfig();
  }

  /** Supprime le logo */
  async function removeLogo() {
    const { error } = await supabase.from('app_config').update({ value: '' }).eq('key', 'logo_url');
    if (!error) {
      logoPreview.innerHTML = '';
      logoInput.value = '';
    }
  }

  // ---------------------------------------------------------------------------
  // Logs

  /** Charge les derniers logs */
  async function loadLogs() {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      console.error('Erreur chargement logs', error);
      return;
    }
    logsTableBody.innerHTML = '';
    (data || []).forEach(log => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${log.created_at.slice(0, 19).replace('T', ' ')}</td><td>${log.admin_email}</td><td>${log.action}</td><td>${log.entity_type}</td><td>${log.entity_id || ''}</td>`;
      logsTableBody.appendChild(tr);
    });
  }

  // ---------------------------------------------------------------------------
  // Archivage automatique à minuit

  function scheduleAutoArchive() {
    setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        const lastRun = localStorage.getItem('lastArchiveRun');
        const todayStr = now.toISOString().split('T')[0];
        if (lastRun !== todayStr) {
          // Archive tous les événements passés
          await supabase.from('events').update({ archived: true }).lt('date', todayStr).eq('archived', false);
          localStorage.setItem('lastArchiveRun', todayStr);
          await loadPublicEvents();
          if (currentAdmin) await reloadAdminEvents();
        }
      }
    }, 60 * 1000);
  }

  // ---------------------------------------------------------------------------
  // Gestion des onglets admin

  function initAdminTabs() {
    adminTabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        adminTabButtons.forEach(b => b.classList.remove('active'));
        adminTabContents.forEach(tc => tc.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.getAttribute('data-tab')).classList.add('active');
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Écouteurs et initialisation

  function addEventListeners() {
    // Theme toggle
    themeToggleBtn.addEventListener('click', toggleTheme);
    // Admin toggle
    adminToggleBtn.addEventListener('click', () => {
      if (adminSection.classList.contains('hidden')) {
        // Si pas de session admin en cours, montrer login
        adminSection.classList.remove('hidden');
        publicSection.classList.add('hidden');
        adminLoginEl.classList.remove('hidden');
        adminDashboard.classList.add('hidden');
      } else {
        // Retour à la partie publique
        adminSection.classList.add('hidden');
        publicSection.classList.remove('hidden');
      }
    });
    // View buttons
    viewButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        viewButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentView = btn.getAttribute('data-view');
        renderPublicEvents();
      });
    });
    // Signup modal actions
    signupCancelBtn.addEventListener('click', closeSignupModal);
    signupModal.querySelector('.modal-overlay').addEventListener('click', closeSignupModal);
    signupForm.addEventListener('submit', handleSignupSubmit);
    // Admin login
    adminLoginForm.addEventListener('submit', handleAdminLogin);
    // Admin events filter
    eventsFilterSelect.addEventListener('change', reloadAdminEvents);
    // Create event
    createEventBtn.addEventListener('click', () => openEventModal(null));
    // Event modal cancel
    eventModalCancel.addEventListener('click', closeEventModal);
    eventModal.querySelector('.modal-overlay').addEventListener('click', closeEventModal);
    eventForm.addEventListener('submit', handleEventFormSubmit);
    // Stats export
    exportEmailsBtn.addEventListener('click', exportEmails);
    exportStatsBtn.addEventListener('click', exportStats);
    // Volunteers search and actions
    volunteerSearchInput.addEventListener('input', () => {
      const filter = volunteerSearchInput.value.toLowerCase();
      const rows = volunteersTableBody.querySelectorAll('tr');
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(filter) ? '' : 'none';
      });
    });
    volunteersTableBody.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (btn) {
        const email = btn.getAttribute('data-email');
        showVolunteerHistory(email);
      }
    });
    volunteerHistoryClose.addEventListener('click', () => {
      volunteerHistoryModal.classList.add('hidden');
    });
    volunteerHistoryModal.querySelector('.modal-overlay').addEventListener('click', () => {
      volunteerHistoryModal.classList.add('hidden');
    });
    // Admins tab actions
    addAdminBtn.addEventListener('click', () => {
      addAdminModal.classList.remove('hidden');
    });
    addAdminCancel.addEventListener('click', () => {
      addAdminModal.classList.add('hidden');
      addAdminForm.reset();
    });
    addAdminModal.querySelector('.modal-overlay').addEventListener('click', () => {
      addAdminModal.classList.add('hidden');
      addAdminForm.reset();
    });
    addAdminForm.addEventListener('submit', handleAddAdmin);
    adminsTableBody.addEventListener('change', handleAdminPermChange);
    adminsTableBody.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (btn && btn.getAttribute('data-action') === 'delete') {
        const id = btn.getAttribute('data-id');
        handleAdminDelete(id);
      }
    });
    // Config form
    configForm.addEventListener('submit', handleConfigSubmit);
    removeLogoBtn.addEventListener('click', removeLogo);
  }

  // ---------------------------------------------------------------------------
  // Initialisation de l'application

  async function init() {
    initTheme();
    addEventListeners();
    initAdminTabs();
    await loadAppConfig();
    await loadPublicEvents();
    scheduleAutoArchive();
    // Analytics page view
    recordAnalytics(null, 'page_view');
  }

  // Démarrer lorsque le DOM est prêt
  document.addEventListener('DOMContentLoaded', init);
})();
