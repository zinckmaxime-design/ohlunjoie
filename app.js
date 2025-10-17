/* Ohlun'Joie - Application complète optimisée */
var eventsData = {
  "evenements": [
    {
      "id": 1,
      "titre": "Assemblée Générale Annuelle",
      "date": "2025-10-20",
      "heure": "18:30",
      "description": "Assemblée générale annuelle avec présentation du bilan et vote sur les nouveaux projets de l'association.",
      "lieu": "Salle municipale",
      "type": "assemblée",
      "image": "🏛️",
      "maxParticipants": 50,
      "inscriptions": [
        {
          "nom": "Dupont",
          "prenom": "Marie",
          "email": "marie.dupont@email.com",
          "telephone": "06 12 34 56 78",
          "commentaire": "Hâte de découvrir les nouveaux projets",
          "participation": {"preparationSalle": true, "partieEvenement": false, "evenementEntier": true},
          "dateInscription": "2025-10-08"
        },
        {
          "nom": "Martin",
          "prenom": "Paul",
          "email": "paul.martin@email.com",
          "telephone": "06 23 45 67 89",
          "commentaire": "Disponible de 19h à 21h",
          "participation": {"preparationSalle": false, "partieEvenement": true, "evenementEntier": false},
          "dateInscription": "2025-10-09"
        }
      ]
    },
    {
      "id": 2,
      "titre": "Atelier Cuisine d'Automne",
      "date": "2025-11-15",
      "heure": "14:00",
      "description": "Découverte de la cuisine traditionnelle avec un chef local. Atelier pratique et dégustation.",
      "lieu": "Centre culturel",
      "type": "atelier",
      "image": "👨‍🍳",
      "maxParticipants": 15,
      "inscriptions": [
        {
          "nom": "Leblanc",
          "prenom": "Sophie",
          "email": "sophie.leblanc@email.com",
          "telephone": "06 34 56 78 90",
          "commentaire": "J'adore cuisiner !",
          "participation": {"preparationSalle": false, "partieEvenement": false, "evenementEntier": true},
          "dateInscription": "2025-10-07"
        }
      ]
    },
    {
      "id": 3,
      "titre": "Randonnée Hivernale",
      "date": "2025-12-10",
      "heure": "09:00",
      "description": "Randonnée découverte dans la forêt enneigée. Niveau facile, vin chaud offert.",
      "lieu": "Forêt des Vosges",
      "type": "sport",
      "image": "🥾",
      "maxParticipants": 25,
      "inscriptions": []
    }
  ]
};

var appConfig = {
  "introText": "Notre association rassemble des bénévoles passionnés qui organisent des événements variés pour créer du lien social et enrichir la vie de notre commune. Ensemble, nous partageons des moments conviviaux et construisons une communauté solidaire.",
  "logoUrl": "",
  "eventTypes": ["assemblée", "atelier", "sport", "fête", "conférence", "événement"],
  "adminCredentials": {"email": "zinck.maxime@gmail.com", "password": "Sto/nuqi0"}
};

var currentView = "timeline";
var currentEvent = null;
var isAdminLoggedIn = false;
var currentAdminSection = "events";

document.addEventListener('DOMContentLoaded', function() {
  setupEventListeners();
  loadStoredData();
  renderCurrentView();
  updateCountdown();
  setInterval(updateCountdown, 60000);
});

/* === UTILITAIRES === */
function $(id) {
  return document.getElementById(id);
}

function sortedEvents() {
  var events = eventsData.evenements.slice();
  events.sort(function(a, b) {
    return new Date(a.date) - new Date(b.date);
  });
  return events;
}

function getParticipationRate(inscriptions, maxParticipants) {
  return Math.min(100, Math.round((inscriptions / maxParticipants) * 100));
}

function getGaugeColor(rate) {
  if (rate > 85) return "#EF4444";
  if (rate > 60) return "#F59E0B";
  return "#10B981";
}

/* === EVENT LISTENERS === */
function setupEventListeners() {
  // Navigation entre vues
  var viewButtons = document.querySelectorAll('[data-view]');
  for (var i = 0; i < viewButtons.length; i++) {
    viewButtons[i].addEventListener('click', function(e) {
      switchView(e.currentTarget.getAttribute('data-view'));
    });
  }

  // Bouton Administration
  var adminBtn = $('adminBtn');
  if (adminBtn) {
    adminBtn.addEventListener('click', function() {
      var modal = $('loginModal');
      if (modal) {
        modal.classList.remove('hidden');
      }
    });
  }

  // Fermeture modales
  document.addEventListener('click', function(e) {
    if (e.target && e.target.classList) {
      if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.add('hidden');
      }
      if (e.target.classList.contains('modal-close')) {
        closeAllModals();
      }
    }
  });

  // Formulaires
  var loginForm = $('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  var regForm = $('registrationForm');
  if (regForm) {
    regForm.addEventListener('submit', handleRegistration);
  }

  // Configuration admin
  var logoUpload = $('logoUpload');
  if (logoUpload) {
    logoUpload.addEventListener('change', handleLogoUpload);
  }

  var removeLogo = $('removeLogo');
  if (removeLogo) {
    removeLogo.addEventListener('click', removeLogoFunction);
  }

  var saveIntro = $('saveIntroText');
  if (saveIntro) {
    saveIntro.addEventListener('click', saveIntroText);
  }

  var addType = $('addEventType');
  if (addType) {
    addType.addEventListener('click', addEventType);
  }

  // Bouton déconnexion
  var logoutBtn = $('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      isAdminLoggedIn = false;
      $('adminPanel').classList.add('hidden');
      $('publicView').classList.remove('hidden');
      showToast("Déconnexion réussie");
    });
  }
}

/* === NAVIGATION === */
function switchView(view) {
  var buttons = document.querySelectorAll('[data-view]');
  for (var i = 0; i < buttons.length; i++) {
    var isActive = buttons[i].getAttribute('data-view') === view;
    buttons[i].classList.toggle('btn--primary', isActive);
    buttons[i].classList.toggle('active', isActive);
    buttons[i].classList.toggle('btn--outline', !isActive);
  }

  var containers = document.querySelectorAll('.events-container');
  for (var j = 0; j < containers.length; j++) {
    containers[j].classList.remove('active');
  }

  currentView = view;
  renderCurrentView();
}

function renderCurrentView() {
  var container = $(currentView + 'View');
  if (container) {
    container.classList.add('active');
  }

  if (currentView === 'timeline') {
    renderTimeline();
  } else if (currentView === 'list') {
    renderList();
  } else if (currentView === 'cards') {
    renderCards();
  }
}

/* === VUE TIMELINE === */
function renderTimeline() {
  var wrapper = $('timelineView');
  var events = sortedEvents();
  wrapper.innerHTML = '<div class="timeline-rail"></div>';

  for (var i = 0; i < events.length; i++) {
    wrapper.appendChild(createTimelineEvent(events[i]));
  }
}

function createTimelineEvent(event) {
  var inscriptions = event.inscriptions.length;
  var maxParticipants = event.maxParticipants;
  var rate = getParticipationRate(inscriptions, maxParticipants);
  var isEventFull = inscriptions >= maxParticipants;
  var eventDate = new Date(event.date);
  var formattedDate = eventDate.toLocaleDateString('fr-FR', {day: 'numeric', month: 'long'});
  var color = getGaugeColor(rate);

  var element = document.createElement('div');
  element.className = 'timeline-event';

  var participantsList = '';
  if (event.inscriptions.length > 0) {
    for (var i = 0; i < event.inscriptions.length; i++) {
      var participant = event.inscriptions[i];
      participantsList += '<div class="participant-item">' + participant.prenom + ' ' + participant.nom + '</div>';
    }
  } else {
    participantsList = '<div class="participant-item" style="text-align:center;font-style:italic;">Aucune inscription</div>';
  }

  var content = '<div class="timeline-content">';
  content += '<div class="timeline-dot"></div>';
  content += '<div class="timeline-date">' + formattedDate + '</div>';
  content += '<h3 style="font-size:1.25rem;font-weight:600;margin-bottom:0.75rem;color:#111827;">';
  content += event.image + ' ' + event.titre + '</h3>';
  content += '<div style="font-size:0.875rem;color:#4b5563;margin-bottom:1rem;">';
  content += '<div style="margin-bottom:0.25rem;">📅 ' + event.heure + ' • 📍 ' + event.lieu + '</div>';
  content += '<div>' + event.description + '</div>';
  content += '</div>';
  content += '<div class="participants-gauge">';
  content += '<div class="gauge-container">';
  content += '<div class="gauge-bar">';
  content += '<div class="gauge-fill" style="width:' + rate + '%;background-color:' + color + ';"></div>';
  content += '</div>';
  content += '<span class="gauge-text">' + inscriptions + '/' + maxParticipants + '</span>';
  content += '</div>';
  content += '<div class="gauge-percentage">' + rate + '% complet</div>';
  content += '</div>';
  content += '<div class="participants-dropdown">';
  content += '<button class="btn btn--outline dropdown-toggle" onclick="toggleParticipantsList(' + event.id + ', this)">';
  content += '👥 Voir les inscrits <span>▼</span></button>';
  content += '<div class="dropdown-content hidden" id="participants-' + event.id + '">';
  content += participantsList;
  content += '</div>';
  content += '</div>';
  content += '<div style="margin-top:1rem;">';
  if (isEventFull) {
    content += '<button class="btn btn--secondary" disabled>❌ Complet</button>';
  } else {
    content += '<button class="btn btn--success" onclick="openRegistrationModal(' + event.id + ')">✅ S\'inscrire</button>';
  }
  content += '</div>';
  content += '</div>';

  element.innerHTML = content;
  return element;
}

/* === VUE LISTE === */
function renderList() {
  var listBody = document.querySelector('#listView .list-body');
  if (!listBody) {
    $('listView').innerHTML = '<div class="list-body"></div>';
    listBody = document.querySelector('#listView .list-body');
  }

  listBody.innerHTML = '';
  var events = sortedEvents();

  for (var i = 0; i < events.length; i++) {
    listBody.appendChild(createListEvent(events[i]));
  }
}

function createListEvent(event) {
  var inscriptions = event.inscriptions.length;
  var maxParticipants = event.maxParticipants;
  var rate = getParticipationRate(inscriptions, maxParticipants);
  var isEventFull = inscriptions >= maxParticipants;
  var eventDate = new Date(event.date);
  var formattedDate = eventDate.toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit'});
  var color = getGaugeColor(rate);

  var element = document.createElement('div');
  element.className = 'list-event';

  var participantsList = '';
  if (event.inscriptions.length > 0) {
    for (var i = 0; i < event.inscriptions.length; i++) {
      var participant = event.inscriptions[i];
      participantsList += '<div class="participant-item">' + participant.prenom + ' ' + participant.nom + '</div>';
    }
  } else {
    participantsList = '<div class="participant-item" style="text-align:center;font-style:italic;">Aucune inscription</div>';
  }

  var content = '<div>' + formattedDate + '<br><small>' + event.heure + '</small></div>';
  content += '<div><strong>' + event.titre + '</strong><br>';
  content += '<button class="btn btn--outline" style="font-size:0.75rem;padding:0.25rem 0.5rem;margin-top:0.25rem;" ';
  content += 'onclick="toggleParticipantsList(' + event.id + ', this)">👥 Inscrits <span>▼</span></button>';
  content += '<div class="dropdown-content hidden" id="participants-' + event.id + '">';
  content += participantsList;
  content += '</div>';
  content += '</div>';
  content += '<div>' + event.lieu + '</div>';
  content += '<div style="text-align:center;">';
  content += '<div class="gauge-container" style="margin-bottom:0.25rem;">';
  content += '<div class="gauge-bar" style="width:60px;height:6px;">';
  content += '<div class="gauge-fill" style="width:' + rate + '%;background-color:' + color + ';"></div>';
  content += '</div>';
  content += '</div>';
  content += '<div style="font-size:0.75rem;">' + inscriptions + '/' + maxParticipants + '</div>';
  content += '</div>';
  content += '<div>';
  if (isEventFull) {
    content += '<button class="btn btn--secondary" style="font-size:0.75rem;padding:0.25rem 0.5rem;" disabled>Complet</button>';
  } else {
    content += '<button class="btn btn--success" style="font-size:0.75rem;padding:0.25rem 0.5rem;" ';
    content += 'onclick="openRegistrationModal(' + event.id + ')">S\'inscrire</button>';
  }
  content += '</div>';

  element.innerHTML = content;
  return element;
}

/* === VUE CARTES === */
function renderCards() {
  var grid = document.querySelector('#cardsView .cards-grid');
  if (!grid) {
    $('cardsView').innerHTML = '<div class="cards-grid"></div>';
    grid = document.querySelector('#cardsView .cards-grid');
  }

  grid.innerHTML = '';
  var events = sortedEvents();

  for (var i = 0; i < events.length; i++) {
    grid.appendChild(createCardEvent(events[i]));
  }
}

function createCardEvent(event) {
  var inscriptions = event.inscriptions.length;
  var maxParticipants = event.maxParticipants;
  var rate = getParticipationRate(inscriptions, maxParticipants);
  var isEventFull = inscriptions >= maxParticipants;
  var eventDate = new Date(event.date);
  var formattedDate = eventDate.toLocaleDateString('fr-FR', {
    weekday: 'long', 
    day: 'numeric', 
    month: 'long'
  });
  var color = getGaugeColor(rate);

  var element = document.createElement('div');
  element.className = 'event-card';

  var participantsList = '';
  if (event.inscriptions.length > 0) {
    for (var i = 0; i < event.inscriptions.length; i++) {
      var participant = event.inscriptions[i];
      participantsList += '<div class="participant-item">' + participant.prenom + ' ' + participant.nom + '</div>';
    }
  } else {
    participantsList = '<div class="participant-item" style="text-align:center;font-style:italic;">Aucune inscription</div>';
  }

  var content = '<div class="card-header">';
  content += '<span class="card-icon">' + event.image + '</span>';
  content += '<div class="card-date">' + formattedDate + '</div>';
  content += '<div>' + event.heure + '</div>';
  content += '</div>';
  content += '<div class="card-body">';
  content += '<h3 class="card-title">' + event.titre + '</h3>';
  content += '<div class="card-location">📍 ' + event.lieu + '</div>';
  content += '<p class="card-description">' + event.description + '</p>';
  content += '<div class="participants-gauge">';
  content += '<div class="gauge-container">';
  content += '<div class="gauge-bar">';
  content += '<div class="gauge-fill" style="width:' + rate + '%;background-color:' + color + ';"></div>';
  content += '</div>';
  content += '<span class="gauge-text">' + inscriptions + '/' + maxParticipants + '</span>';
  content += '</div>';
  content += '<div class="gauge-percentage">' + rate + '% complet</div>';
  content += '</div>';
  content += '<div class="participants-dropdown">';
  content += '<button class="btn btn--outline dropdown-toggle" onclick="toggleParticipantsList(' + event.id + ', this)">';
  content += '👥 Voir les inscrits <span>▼</span></button>';
  content += '<div class="dropdown-content hidden" id="participants-' + event.id + '">';
  content += participantsList;
  content += '</div>';
  content += '</div>';
  if (isEventFull) {
    content += '<button class="btn btn--secondary" style="width:100%;margin-top:0.75rem;" disabled>';
    content += '❌ Complet</button>';
  } else {
    content += '<button class="btn btn--success" style="width:100%;margin-top:0.75rem;" ';
    content += 'onclick="openRegistrationModal(' + event.id + ')">✅ S\'inscrire</button>';
  }
  content += '</div>';

  element.innerHTML = content;
  return element;
}

/* === INTERACTIONS === */
function toggleParticipantsList(eventId, button) {
  var dropdown = $('participants-' + eventId);
  var arrow = button.querySelector('span:last-child');

  // Fermer tous les autres dropdowns
  var allDropdowns = document.querySelectorAll('.dropdown-content');
  for (var i = 0; i < allDropdowns.length; i++) {
    if (allDropdowns[i] !== dropdown) {
      allDropdowns[i].classList.add('hidden');
    }
  }

  var allArrows = document.querySelectorAll('.dropdown-toggle span:last-child');
  for (var j = 0; j < allArrows.length; j++) {
    if (allArrows[j] !== arrow) {
      allArrows[j].textContent = '▼';
    }
  }

  var isOpen = dropdown.classList.contains('hidden');
  dropdown.classList.toggle('hidden', !isOpen);
  arrow.textContent = isOpen ? '▲' : '▼';
}

/* === CONNEXION ADMIN === */
function handleLogin(e) {
  e.preventDefault();
  var email = $('adminEmail').value;
  var password = $('adminPassword').value;
  var errorElement = $('loginError');

  if (email === appConfig.adminCredentials.email && password === appConfig.adminCredentials.password) {
    isAdminLoggedIn = true;
    closeAllModals();
    $('publicView').classList.add('hidden');
    $('adminPanel').classList.remove('hidden');
    loadConfigData();
    showToast('Connexion réussie !');
  } else {
    errorElement.classList.remove('hidden');
    $('adminPassword').focus();
  }
}

/* === INSCRIPTION === */
function openRegistrationModal(eventId) {
  currentEvent = null;
  for (var i = 0; i < eventsData.evenements.length; i++) {
    if (eventsData.evenements[i].id === eventId) {
      currentEvent = eventsData.evenements[i];
      break;
    }
  }

  if (!currentEvent) return;

  $('registrationModal').classList.remove('hidden');
  $('participationError').classList.add('hidden');
}

function handleRegistration(e) {
  e.preventDefault();
  if (!currentEvent) return;

  var preparationSalle = $('preparationSalle').checked;
  var partieEvenement = $('partieEvenement').checked;
  var evenementEntier = $('evenementEntier').checked;
  var errorElement = $('participationError');

  if (!preparationSalle && !partieEvenement && !evenementEntier) {
    errorElement.classList.remove('hidden');
    return;
  }

  errorElement.classList.add('hidden');

  var registration = {
    nom: $('regLastName').value,
    prenom: $('regFirstName').value,
    email: $('regEmail').value,
    telephone: $('regPhone').value,
    commentaire: $('regComment').value,
    participation: {
      preparationSalle: preparationSalle,
      partieEvenement: partieEvenement,
      evenementEntier: evenementEntier
    },
    dateInscription: new Date().toISOString().split('T')[0]
  };

  currentEvent.inscriptions.push(registration);
  saveStoredData();
  closeAllModals();
  showToast('Inscription confirmée !');
  renderCurrentView();
  $('registrationForm').reset();
}

/* === ADMINISTRATION === */
function switchAdminSection(section) {
  var buttons = document.querySelectorAll('.admin-nav-btn');
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].classList.toggle('active', buttons[i].dataset.section === section);
  }

  var sections = document.querySelectorAll('.admin-section');
  for (var j = 0; j < sections.length; j++) {
    sections[j].classList.toggle('active', sections[j].id === section + 'Section');
  }

  currentAdminSection = section;
  if (section === 'config') {
    loadConfigData();
  }
}

function loadConfigData() {
  var introTextArea = $('introTextArea');
  if (introTextArea) {
    introTextArea.value = appConfig.introText;
  }
  renderEventTypes();
  updateLogoDisplay();
}

/* === GESTION LOGO === */
function handleLogoUpload(e) {
  var file = e.target.files && e.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    alert('Le fichier est trop volumineux (max 2MB)');
    return;
  }

  if (!/^image\/(png|jpeg|jpg|svg\+xml)$/.test(file.type)) {
    alert('Format non supporté (PNG, JPG, JPEG, SVG uniquement)');
    return;
  }

  var reader = new FileReader();
  reader.onload = function(ev) {
    appConfig.logoUrl = ev.target.result;
    updateLogoDisplay();
    saveStoredData();
    showToast('Logo mis à jour');
  };
  reader.readAsDataURL(file);
}

function removeLogoFunction() {
  appConfig.logoUrl = '';
  updateLogoDisplay();
  saveStoredData();
  $('logoUpload').value = '';
  showToast('Logo supprimé');
}

function updateLogoDisplay() {
  var logoElement = $('associationLogo');
  if (!logoElement) return;

  if (appConfig.logoUrl) {
    logoElement.innerHTML = '<img src="' + appConfig.logoUrl + '" alt="Logo association" style="max-height:200px;width:auto;">';
  } else {
    logoElement.textContent = '🤝';
  }
}

/* === GESTION TEXTE === */
function saveIntroText() {
  var textArea = $('introTextArea');
  if (!textArea) return;

  var newText = textArea.value;
  if (newText && newText.trim()) {
    appConfig.introText = newText;
    var introElement = $('introText');
    if (introElement) {
      introElement.textContent = newText;
    }
    saveStoredData();
    showToast('Texte mis à jour');
  }
}

/* === GESTION TYPES EVENEMENTS === */
function renderEventTypes() {
  var container = $('eventTypesList');
  if (!container) return;

  container.innerHTML = '';

  for (var i = 0; i < appConfig.eventTypes.length; i++) {
    var type = appConfig.eventTypes[i];
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:0.5rem;background:#fff;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:0.5rem;';

    var safeType = type.replace(/'/g, "\'");
    row.innerHTML = '<span>' + type + '</span>' +
      '<button class="btn btn--outline" style="font-size:0.75rem;padding:0.25rem 0.5rem;" ' +
      'onclick="removeEventType(\'+ safeType + '\')">🗑️ Supprimer</button>';

    container.appendChild(row);
  }
}

function addEventType() {
  var input = $('newEventType');
  if (!input) return;

  var value = (input.value || '').trim();
  if (!value) return;

  if (appConfig.eventTypes.indexOf(value) === -1) {
    appConfig.eventTypes.push(value);
    input.value = '';
    renderEventTypes();
    saveStoredData();
    showToast('Type d\'événement ajouté');
  }
}

function removeEventType(type) {
  if (!confirm('Supprimer le type "' + type + '" ?')) return;

  appConfig.eventTypes = appConfig.eventTypes.filter(function(t) {
    return t !== type;
  });

  renderEventTypes();
  saveStoredData();
  showToast('Type d\'événement supprimé');
}

/* === COMPTE À REBOURS === */
function updateCountdown() {
  var now = new Date();
  var nextEvent = null;
  var events = sortedEvents();

  for (var i = 0; i < events.length; i++) {
    if (new Date(events[i].date) > now) {
      nextEvent = events[i];
      break;
    }
  }

  var countdownElement = $('countdownTimer');
  if (!countdownElement) return;

  if (!nextEvent) {
    countdownElement.textContent = 'Aucun événement';
    return;
  }

  var diffDays = Math.ceil((new Date(nextEvent.date) - now) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    countdownElement.textContent = "Aujourd'hui !";
  } else if (diffDays === 1) {
    countdownElement.textContent = 'Demain';
  } else {
    countdownElement.textContent = diffDays + ' jours';
  }
}

/* === UTILITAIRES === */
function closeAllModals() {
  var modals = document.querySelectorAll('.modal-overlay');
  for (var i = 0; i < modals.length; i++) {
    modals[i].classList.add('hidden');
  }

  var loginError = $('loginError');
  if (loginError) {
    loginError.classList.add('hidden');
  }

  var passwordField = $('adminPassword');
  if (passwordField) {
    passwordField.value = '';
  }

  currentEvent = null;
}

function showToast(message) {
  var toastMessage = $('toastMessage');
  if (toastMessage) {
    toastMessage.textContent = message;
  }

  var toast = $('successToast');
  if (!toast) return;

  toast.classList.remove('hidden');
  toast.classList.add('show');

  setTimeout(function() {
    toast.classList.remove('show');
    setTimeout(function() {
      toast.classList.add('hidden');
    }, 250);
  }, 3000);
}

/* === STOCKAGE === */
function saveStoredData() {
  try {
    localStorage.setItem('ohlunjoie_events', JSON.stringify(eventsData));
    localStorage.setItem('ohlunjoie_config', JSON.stringify(appConfig));
  } catch (e) {
    console.error('Erreur sauvegarde:', e);
  }
}

function loadStoredData() {
  try {
    var storedEvents = localStorage.getItem('ohlunjoie_events');
    var storedConfig = localStorage.getItem('ohlunjoie_config');

    if (storedEvents) {
      eventsData = JSON.parse(storedEvents);
    }

    if (storedConfig) {
      appConfig = JSON.parse(storedConfig);
    }
  } catch (e) {
    console.error('Erreur chargement:', e);
  }

  var introElement = $('introText');
  if (introElement) {
    introElement.textContent = appConfig.introText;
  }

  updateLogoDisplay();
}

/* === FONCTIONS GLOBALES === */
window.toggleParticipantsList = toggleParticipantsList;
window.openRegistrationModal = openRegistrationModal;
window.removeEventType = removeEventType;
window.switchAdminSection = switchAdminSection;
