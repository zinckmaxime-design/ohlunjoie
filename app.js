// Application Ohlun'Joie - Gestion des événements et administration
let eventsData = {
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
          "participation": {
            "preparationSalle": true,
            "partieEvenement": false,
            "evenementEntier": true
          },
          "dateInscription": "2025-10-08"
        },
        {
          "nom": "Martin",
          "prenom": "Paul",
          "email": "paul.martin@email.com",
          "telephone": "06 23 45 67 89",
          "commentaire": "Disponible de 19h à 21h",
          "participation": {
            "preparationSalle": false,
            "partieEvenement": true,
            "evenementEntier": false
          },
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
          "participation": {
            "preparationSalle": false,
            "partieEvenement": false,
            "evenementEntier": true
          },
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

// Configuration de l'application
let appConfig = {
  introText: "Notre association rassemble des bénévoles passionnés qui organisent des événements variés pour créer du lien social et enrichir la vie de notre commune. Ensemble, nous partageons des moments conviviaux et construisons une communauté solidaire.",
  logoUrl: "",
  eventTypes: ["assemblée", "atelier", "sport", "fête", "conférence", "événement"],
  adminCredentials: {
    email: "zinck.maxime@gmail.com",
    password: "Sto/nuqi0"
  }
};

// Variables d'état
let currentView = 'timeline';
let currentEvent = null;
let isAdminLoggedIn = false;
let currentAdminSection = 'events';

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadStoredData();
    renderCurrentView();
    updateCountdown();
    setInterval(updateCountdown, 60000);
});

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Changement de vue
    document.querySelectorAll('[data-view]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.target.dataset.view;
            switchView(view);
        });
    });
    
    // Administration
    document.getElementById('adminBtn').addEventListener('click', () => {
        document.getElementById('loginModal').classList.remove('hidden');
    });
    
    document.getElementById('logoutBtn').addEventListener('click', () => {
        isAdminLoggedIn = false;
        document.getElementById('adminPanel').classList.add('hidden');
        document.getElementById('publicView').classList.remove('hidden');
        showToast('Déconnexion réussie');
    });
    
    // Navigation admin
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            switchAdminSection(section);
        });
    });
    
    // Formulaires
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registrationForm').addEventListener('submit', handleRegistration);
    
    // Configuration
    document.getElementById('logoUpload').addEventListener('change', handleLogoUpload);
    document.getElementById('removeLogo').addEventListener('click', removeLogo);
    document.getElementById('saveIntroText').addEventListener('click', saveIntroText);
    document.getElementById('addEventType').addEventListener('click', addEventType);
    
    // Fermeture des modales
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close')) {
            closeAllModals();
        }
    });
}

// Changement de vue
function switchView(view) {
    // Mise à jour des boutons
    document.querySelectorAll('[data-view]').forEach(btn => {
        if (btn.dataset.view === view) {
            btn.classList.remove('btn--outline');
            btn.classList.add('btn--primary', 'active');
        } else {
            btn.classList.remove('btn--primary', 'active');
            btn.classList.add('btn--outline');
        }
    });
    
    // Mise à jour des conteneurs
    document.querySelectorAll('.events-container').forEach(container => {
        container.classList.remove('active');
    });
    
    currentView = view;
    renderCurrentView();
}

// Rendu de la vue courante
function renderCurrentView() {
    const viewContainer = document.getElementById(`${currentView}View`);
    viewContainer.classList.add('active');
    
    switch (currentView) {
        case 'timeline':
            renderTimelineView();
            break;
        case 'list':
            renderListView();
            break;
        case 'cards':
            renderCardsView();
            break;
    }
}

// Rendu Timeline
function renderTimelineView() {
    const timelineView = document.getElementById('timelineView');
    const events = eventsData.evenements.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    timelineView.innerHTML = '<div class="timeline-rail"></div>';
    
    events.forEach((event, index) => {
        const eventElement = createTimelineEvent(event, index);
        timelineView.appendChild(eventElement);
    });
}

function createTimelineEvent(event, index) {
    const inscriptions = event.inscriptions.length;
    const maxParticipants = event.maxParticipants;
    const participationRate = (inscriptions / maxParticipants) * 100;
    const isEventFull = inscriptions >= maxParticipants;
    
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long' 
    });
    
    // Couleur de la jauge
    let gaugeColor = '#10B981';
    if (participationRate > 60) gaugeColor = '#F59E0B';
    if (participationRate > 85) gaugeColor = '#EF4444';
    
    const eventDiv = document.createElement('div');
    eventDiv.className = 'timeline-event';
    
    eventDiv.innerHTML = `
        <div class="timeline-content">
            <div class="timeline-dot"></div>
            <div class="timeline-date">${formattedDate}</div>
            
            <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--text-gray-900);">
                ${event.image} ${event.titre}
            </h3>
            
            <div style="font-size: 0.875rem; color: var(--text-gray-600); margin-bottom: 1rem;">
                <div style="margin-bottom: 0.25rem;">📅 ${event.heure} • 📍 ${event.lieu}</div>
                <div>${event.description}</div>
            </div>
            
            <div class="participants-gauge">
                <div class="gauge-container">
                    <div class="gauge-bar">
                        <div class="gauge-fill" style="width: ${participationRate}%; background-color: ${gaugeColor};"></div>
                    </div>
                    <span class="gauge-text">${inscriptions}/${maxParticipants}</span>
                </div>
                <div class="gauge-percentage">${Math.round(participationRate)}% complet</div>
            </div>
            
            <div class="participants-dropdown">
                <button class="btn btn--outline dropdown-toggle" onclick="toggleParticipantsList(${event.id}, this)">
                    👥 Voir les inscrits <span>▼</span>
                </button>
                <div class="dropdown-content hidden" id="participants-${event.id}">
                    ${event.inscriptions.length > 0 
                        ? event.inscriptions.map(p => `<div class="participant-item">${p.prenom} ${p.nom}</div>`).join('')
                        : '<div class="participant-item" style="text-align: center; font-style: italic;">Aucune inscription</div>'
                    }
                </div>
            </div>
            
            <div style="margin-top: 1rem;">
                <button class="btn ${isEventFull ? 'btn--secondary' : 'btn--success'}" 
                        ${isEventFull ? 'disabled' : ''}
                        onclick="openRegistrationModal(${event.id})">
                    ${isEventFull ? '❌ Complet' : '✅ S\\'inscrire'}
                </button>
            </div>
        </div>
    `;
    
    return eventDiv;
}

// Rendu Liste
function renderListView() {
    const listBody = document.querySelector('#listView .list-body');
    const events = eventsData.evenements.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    listBody.innerHTML = '';
    
    events.forEach(event => {
        const eventElement = createListEvent(event);
        listBody.appendChild(eventElement);
    });
}

function createListEvent(event) {
    const inscriptions = event.inscriptions.length;
    const maxParticipants = event.maxParticipants;
    const participationRate = (inscriptions / maxParticipants) * 100;
    const isEventFull = inscriptions >= maxParticipants;
    
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit' 
    });
    
    let gaugeColor = '#10B981';
    if (participationRate > 60) gaugeColor = '#F59E0B';
    if (participationRate > 85) gaugeColor = '#EF4444';
    
    const eventDiv = document.createElement('div');
    eventDiv.className = 'list-event';
    
    eventDiv.innerHTML = `
        <div>${formattedDate}<br><small>${event.heure}</small></div>
        <div>
            <strong>${event.titre}</strong><br>
            <button class="btn btn--outline" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; margin-top: 0.25rem;" onclick="toggleParticipantsList(${event.id}, this)">
                👥 Inscrits <span>▼</span>
            </button>
            <div class="dropdown-content hidden" id="participants-${event.id}">
                ${event.inscriptions.length > 0 
                    ? event.inscriptions.map(p => `<div class="participant-item">${p.prenom} ${p.nom}</div>`).join('')
                    : '<div class="participant-item" style="text-align: center; font-style: italic;">Aucune inscription</div>'
                }
            </div>
        </div>
        <div>${event.lieu}</div>
        <div style="text-align: center;">
            <div class="gauge-container" style="margin-bottom: 0.25rem;">
                <div class="gauge-bar" style="width: 60px; height: 6px;">
                    <div class="gauge-fill" style="width: ${participationRate}%; background-color: ${gaugeColor};"></div>
                </div>
            </div>
            <div style="font-size: 0.75rem;">${inscriptions}/${maxParticipants}</div>
        </div>
        <div>
            <button class="btn ${isEventFull ? 'btn--secondary' : 'btn--success'}" 
                    style="font-size: 0.75rem; padding: 0.25rem 0.5rem;"
                    ${isEventFull ? 'disabled' : ''}
                    onclick="openRegistrationModal(${event.id})">
                ${isEventFull ? 'Complet' : 'S\\'inscrire'}
            </button>
        </div>
    `;
    
    return eventDiv;
}

// Rendu Cartes
function renderCardsView() {
    const cardsGrid = document.querySelector('#cardsView .cards-grid');
    const events = eventsData.evenements.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    cardsGrid.innerHTML = '';
    
    events.forEach(event => {
        const cardElement = createCardEvent(event);
        cardsGrid.appendChild(cardElement);
    });
}

function createCardEvent(event) {
    const inscriptions = event.inscriptions.length;
    const maxParticipants = event.maxParticipants;
    const participationRate = (inscriptions / maxParticipants) * 100;
    const isEventFull = inscriptions >= maxParticipants;
    
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString('fr-FR', { 
        weekday: 'long',
        day: 'numeric', 
        month: 'long'
    });
    
    let gaugeColor = '#10B981';
    if (participationRate > 60) gaugeColor = '#F59E0B';
    if (participationRate > 85) gaugeColor = '#EF4444';
    
    const cardDiv = document.createElement('div');
    cardDiv.className = 'event-card';
    
    cardDiv.innerHTML = `
        <div class="card-header">
            <span class="card-icon">${event.image}</span>
            <div class="card-date">${formattedDate}</div>
            <div>${event.heure}</div>
        </div>
        
        <div class="card-body">
            <h3 class="card-title">${event.titre}</h3>
            <div class="card-location">📍 ${event.lieu}</div>
            <p class="card-description">${event.description}</p>
            
            <div class="participants-gauge">
                <div class="gauge-container">
                    <div class="gauge-bar">
                        <div class="gauge-fill" style="width: ${participationRate}%; background-color: ${gaugeColor};"></div>
                    </div>
                    <span class="gauge-text">${inscriptions}/${maxParticipants}</span>
                </div>
                <div class="gauge-percentage">${Math.round(participationRate)}% complet</div>
            </div>
            
            <div class="participants-dropdown">
                <button class="btn btn--outline dropdown-toggle" onclick="toggleParticipantsList(${event.id}, this)">
                    👥 Voir les inscrits <span>▼</span>
                </button>
                <div class="dropdown-content hidden" id="participants-${event.id}">
                    ${event.inscriptions.length > 0 
                        ? event.inscriptions.map(p => `<div class="participant-item">${p.prenom} ${p.nom}</div>`).join('')
                        : '<div class="participant-item" style="text-align: center; font-style: italic;">Aucune inscription</div>'
                    }
                </div>
            </div>
            
            <button class="btn ${isEventFull ? 'btn--secondary' : 'btn--success'}" 
                    style="width: 100%; margin-top: 0.75rem;" 
                    ${isEventFull ? 'disabled' : ''}
                    onclick="openRegistrationModal(${event.id})">
                ${isEventFull ? '❌ Complet' : '✅ S\\'inscrire'}
            </button>
        </div>
    `;
    
    return cardDiv;
}

// Toggle liste participants
function toggleParticipantsList(eventId, button) {
    const dropdown = document.getElementById(`participants-${eventId}`);
    const arrow = button.querySelector('span:last-child');
    
    // Fermer tous les autres dropdowns
    document.querySelectorAll('.dropdown-content').forEach(d => {
        if (d.id !== `participants-${eventId}`) {
            d.classList.add('hidden');
        }
    });
    
    document.querySelectorAll('.dropdown-toggle span:last-child').forEach(s => {
        if (s !== arrow) s.textContent = '▼';
    });
    
    // Toggle le dropdown courant
    if (dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
        arrow.textContent = '▲';
    } else {
        dropdown.classList.add('hidden');
        arrow.textContent = '▼';
    }
}

// Connexion admin
function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    const errorElement = document.getElementById('loginError');
    
    if (email === appConfig.adminCredentials.email && password === appConfig.adminCredentials.password) {
        isAdminLoggedIn = true;
        closeAllModals();
        document.getElementById('publicView').classList.add('hidden');
        document.getElementById('adminPanel').classList.remove('hidden');
        loadConfigData();
        showToast('Connexion réussie !');
    } else {
        errorElement.classList.remove('hidden');
        document.getElementById('adminPassword').focus();
    }
}

// Modal inscription
function openRegistrationModal(eventId) {
    const event = eventsData.evenements.find(e => e.id === eventId);
    if (!event) return;
    
    currentEvent = event;
    document.getElementById('registrationModal').classList.remove('hidden');
    document.getElementById('participationError').classList.add('hidden');
}

// Traitement inscription
function handleRegistration(e) {
    e.preventDefault();
    
    if (!currentEvent) return;
    
    // Validation des cases à cocher
    const preparationSalle = document.getElementById('preparationSalle').checked;
    const partieEvenement = document.getElementById('partieEvenement').checked;
    const evenementEntier = document.getElementById('evenementEntier').checked;
    
    const errorElement = document.getElementById('participationError');
    
    if (!preparationSalle && !partieEvenement && !evenementEntier) {
        errorElement.classList.remove('hidden');
        return;
    }
    
    errorElement.classList.add('hidden');
    
    const registration = {
        nom: document.getElementById('regLastName').value,
        prenom: document.getElementById('regFirstName').value,
        email: document.getElementById('regEmail').value,
        telephone: document.getElementById('regPhone').value,
        commentaire: document.getElementById('regComment').value,
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
    document.getElementById('registrationForm').reset();
}

// Navigation admin
function switchAdminSection(section) {
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === section);
    });
    
    document.querySelectorAll('.admin-section').forEach(sectionEl => {
        sectionEl.classList.toggle('active', sectionEl.id === `${section}Section`);
    });
    
    currentAdminSection = section;
    
    if (section === 'config') {
        loadConfigData();
    }
}

// Configuration - Logo
function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validation
    if (file.size > 2 * 1024 * 1024) {
        alert('Le fichier est trop volumineux (max 2MB)');
        return;
    }
    
    if (!file.type.match(/^image\/(png|jpeg|jpg|svg\+xml)$/)) {
        alert('Format non supporté (PNG, JPG, JPEG, SVG uniquement)');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const logoUrl = e.target.result;
        appConfig.logoUrl = logoUrl;
        updateLogoDisplay();
        saveStoredData();
        showToast('Logo mis à jour');
    };
    reader.readAsDataURL(file);
}

function removeLogo() {
    appConfig.logoUrl = "";
    updateLogoDisplay();
    saveStoredData();
    document.getElementById('logoUpload').value = "";
    showToast('Logo supprimé');
}

function updateLogoDisplay() {
    const logoElement = document.getElementById('associationLogo');
    if (appConfig.logoUrl) {
        logoElement.innerHTML = `<img src="${appConfig.logoUrl}" alt="Logo association" style="max-height: 200px; width: auto;">`;
    } else {
        logoElement.innerHTML = '🤝';
    }
}

// Configuration - Texte intro
function saveIntroText() {
    const newText = document.getElementById('introTextArea').value;
    if (newText.trim()) {
        appConfig.introText = newText;
        document.getElementById('introText').textContent = newText;
        saveStoredData();
        showToast('Texte mis à jour');
    }
}

function loadConfigData() {
    document.getElementById('introTextArea').value = appConfig.introText;
    renderEventTypes();
}

// Configuration - Types d'événements
function renderEventTypes() {
    const container = document.getElementById('eventTypesList');
    container.innerHTML = '';
    
    appConfig.eventTypes.forEach(type => {
        const typeDiv = document.createElement('div');
        typeDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: white; border: 1px solid #e5e7eb; border-radius: 0.375rem; margin-bottom: 0.5rem;';
        typeDiv.innerHTML = `
            <span>${type}</span>
            <button class="btn btn--outline" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;" onclick="removeEventType('${type}')">
                🗑️ Supprimer
            </button>
        `;
        container.appendChild(typeDiv);
    });
}

function addEventType() {
    const input = document.getElementById('newEventType');
    const newType = input.value.trim();
    
    if (newType && !appConfig.eventTypes.includes(newType)) {
        appConfig.eventTypes.push(newType);
        input.value = '';
        renderEventTypes();
        saveStoredData();
        showToast('Type d\'événement ajouté');
    }
}

function removeEventType(type) {
    if (confirm(`Supprimer le type "${type}" ?`)) {
        appConfig.eventTypes = appConfig.eventTypes.filter(t => t !== type);
        renderEventTypes();
        saveStoredData();
        showToast('Type d\'événement supprimé');
    }
}

// Utilitaires
function updateCountdown() {
    const now = new Date();
    const nextEvent = eventsData.evenements
        .filter(event => new Date(event.date) > now)
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
    
    if (nextEvent) {
        const eventDate = new Date(nextEvent.date);
        const diffTime = eventDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let countdownText;
        if (diffDays === 0) {
            countdownText = "Aujourd'hui !";
        } else if (diffDays === 1) {
            countdownText = "Demain";
        } else {
            countdownText = `${diffDays} jours`;
        }
        
        document.getElementById('countdownTimer').textContent = countdownText;
    } else {
        document.getElementById('countdownTimer').textContent = "Aucun événement";
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.add('hidden');
    });
    document.getElementById('loginError').classList.add('hidden');
    document.getElementById('adminPassword').value = '';
    currentEvent = null;
}

function showToast(message) {
    document.getElementById('toastMessage').textContent = message;
    const toast = document.getElementById('successToast');
    toast.classList.remove('hidden');
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 250);
    }, 3000);
}

function saveStoredData() {
    localStorage.setItem('ohlunjoie_events', JSON.stringify(eventsData));
    localStorage.setItem('ohlunjoie_config', JSON.stringify(appConfig));
}

function loadStoredData() {
    const savedEvents = localStorage.getItem('ohlunjoie_events');
    const savedConfig = localStorage.getItem('ohlunjoie_config');
    
    if (savedEvents) {
        eventsData = JSON.parse(savedEvents);
    }
    
    if (savedConfig) {
        appConfig = JSON.parse(savedConfig);
    }
    
    // Appliquer la config au chargement
    document.getElementById('introText').textContent = appConfig.introText;
    updateLogoDisplay();
}

// Exposer les fonctions globales nécessaires
window.toggleParticipantsList = toggleParticipantsList;
window.openRegistrationModal = openRegistrationModal;
window.removeEventType = removeEventType;
