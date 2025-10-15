/* Ohlun'Joie — version stable sans erreurs de template strings */
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
"participation": { "preparationSalle": true, "partieEvenement": false, "evenementEntier": true },
"dateInscription": "2025-10-08"
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
"inscriptions": []
}
]
};

let appConfig = {
introText: "Notre association rassemble des bénévoles passionnés qui organisent des événements variés pour créer du lien social et enrichir la vie de notre commune. Ensemble, nous partageons des moments conviviaux et construisons une communauté solidaire.",
logoUrl: "",
eventTypes: ["assemblée", "atelier", "sport", "fête", "conférence", "événement"],
adminCredentials: { email: "zinck.maxime@gmail.com", password: "Sto/nuqi0" }
};

let currentView = "timeline";
let currentEvent = null;
let isAdminLoggedIn = false;

document.addEventListener("DOMContentLoaded", () => {
wireBasics();
renderCurrentView();
updateCountdown();
setInterval(updateCountdown, 60000);
});

function wireBasics() {
// Switch view
document.querySelectorAll("[data-view]").forEach(btn => {
btn.addEventListener("click", e => switchView(e.currentTarget.dataset.view));
});

// Open admin modal
const adminBtn = document.getElementById("adminBtn");
if (adminBtn) {
adminBtn.addEventListener("click", () => {
const m = document.getElementById("loginModal");
if (m) m.classList.remove("hidden");
});
}

// Close modals
document.addEventListener("click", (e) => {
if (e.target.classList.contains("modal-overlay") || e.target.classList.contains("modal-close")) {
closeAllModals();
}
});

// Forms
const loginForm = document.getElementById("loginForm");
if (loginForm) loginForm.addEventListener("submit", handleLogin);

const regForm = document.getElementById("registrationForm");
if (regForm) regForm.addEventListener("submit", handleRegistration);

// Admin actions
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
logoutBtn.addEventListener("click", () => {
isAdminLoggedIn = false;
document.getElementById("adminPanel").classList.add("hidden");
document.getElementById("publicView").classList.remove("hidden");
toast("Déconnexion réussie");
});
}

// Config
byId("logoUpload")?.addEventListener("change", handleLogoUpload);
byId("removeLogo")?.addEventListener("click", removeLogo);
byId("saveIntroText")?.addEventListener("click", saveIntroText);
byId("addEventType")?.addEventListener("click", addEventType);

// Apply intro text and logo on load
const intro = byId("introText");
if (intro) intro.textContent = appConfig.introText;
updateLogoDisplay();
}

function byId(id) { return document.getElementById(id); }

function switchView(view) {
document.querySelectorAll("[data-view]").forEach(btn => {
const active = btn.dataset.view === view;
btn.classList.toggle("btn--primary", active);
btn.classList.toggle("active", active);
btn.classList.toggle("btn--outline", !active);
});

document.querySelectorAll(".events-container").forEach(c => c.classList.remove("active"));
currentView = view;
renderCurrentView();
}

function renderCurrentView() {
const container = byId(${currentView}View);
container?.classList.add("active");
if (currentView === "timeline") renderTimeline();
if (currentView === "list") renderList();
if (currentView === "cards") renderCards();
}

function renderTimeline() {
const wrap = byId("timelineView");
const events = sortedEvents();
wrap.innerHTML = '<div class="timeline-rail"></div>';
events.forEach((ev, i) => wrap.appendChild(timelineEvent(ev)));
}

function timelineEvent(ev) {
const rate = Math.min(100, (ev.inscriptions.length / ev.maxParticipants) * 100);
const full = ev.inscriptions.length >= ev.maxParticipants;
const d = new Date(ev.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
const color = rate > 85 ? "#EF4444" : rate > 60 ? "#F59E0B" : "#10B981";
const el = document.createElement("div");
el.className = "timeline-event";
el.innerHTML = <div class="timeline-content"> <div class="timeline-dot"></div> <div class="timeline-date">${d}</div> <h3 style="font-size:1.25rem;font-weight:600;margin-bottom:0.75rem;color:#111827;">${ev.image} ${ev.titre}</h3> <div style="font-size:0.875rem;color:#4b5563;margin-bottom:1rem;"> <div style="margin-bottom:0.25rem;">📅 ${ev.heure} - 📍 ${ev.lieu}</div> <div>${ev.description}</div> </div> <div class="participants-gauge"> <div class="gauge-container"> <div class="gauge-bar"> <div class="gauge-fill" style="width:${Math.round(rate)}%;background-color:${color};"></div> </div> <span class="gauge-text">${ev.inscriptions.length}/${ev.maxParticipants}</span> </div> <div class="gauge-percentage">${Math.round(rate)}% complet</div> </div> <div class="participants-dropdown"> <button class="btn btn--outline dropdown-toggle" onclick="toggleParticipantsList(${ev.id}, this)">👥 Voir les inscrits <span>▼</span></button> <div class="dropdown-content hidden" id="participants-${ev.id}"> ${ev.inscriptions.length ? ev.inscriptions.map(p =><div class="participant-item">${p.prenom} ${p.nom}</div>).join("") : <div class="participant-item" style="text-align:center;font-style:italic;">Aucune inscription</div>} </div> </div> <div style="margin-top:1rem;"> <button class="btn ${full ? "btn--secondary" : "btn--success"}" ${full ? "disabled" : ""} onclick="openRegistrationModal(${ev.id})">${full ? "❌ Complet" : "✅ S'inscrire"}</button> </div> </div> ;
return el;
}

function renderList() {
const body = document.querySelector("#listView .list-body");
body.innerHTML = "";
sortedEvents().forEach(ev => body.appendChild(listEvent(ev)));
}

function listEvent(ev) {
const rate = Math.min(100, (ev.inscriptions.length / ev.maxParticipants) * 100);
const full = ev.inscriptions.length >= ev.maxParticipants;
const d = new Date(ev.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
const color = rate > 85 ? "#EF4444" : rate > 60 ? "#F59E0B" : "#10B981";
const el = document.createElement("div");
el.className = "list-event";
el.innerHTML = <div>${d}<br><small>${ev.heure}</small></div> <div> <strong>${ev.titre}</strong><br> <button class="btn btn--outline" style="font-size:0.75rem;padding:0.25rem 0.5rem;margin-top:0.25rem;" onclick="toggleParticipantsList(${ev.id}, this)">👥 Inscrits <span>▼</span></button> <div class="dropdown-content hidden" id="participants-${ev.id}"> ${ev.inscriptions.length ? ev.inscriptions.map(p =><div class="participant-item">${p.prenom} ${p.nom}</div>).join("") : <div class="participant-item" style="text-align:center;font-style:italic;">Aucune inscription</div>} </div> </div> <div>${ev.lieu}</div> <div style="text-align:center;"> <div class="gauge-container" style="margin-bottom:0.25rem;"> <div class="gauge-bar" style="width:60px;height:6px;"> <div class="gauge-fill" style="width:${Math.round(rate)}%;background-color:${color};"></div> </div> </div> <div style="font-size:0.75rem;">${ev.inscriptions.length}/${ev.maxParticipants}</div> </div> <div> <button class="btn ${full ? "btn--secondary" : "btn--success"}" style="font-size:0.75rem;padding:0.25rem 0.5rem;" ${full ? "disabled" : ""} onclick="openRegistrationModal(${ev.id})">${full ? "Complet" : "S'inscrire"}</button> </div> ;
return el;
}

function renderCards() {
const grid = document.querySelector("#cardsView .cards-grid");
grid.innerHTML = "";
sortedEvents().forEach(ev => grid.appendChild(cardEvent(ev)));
}

function cardEvent(ev) {
const rate = Math.min(100, (ev.inscriptions.length / ev.maxParticipants) * 100);
const full = ev.inscriptions.length >= ev.maxParticipants;
const d = new Date(ev.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const color = rate > 85 ? "#EF4444" : rate > 60 ? "#F59E0B" : "#10B981";
const el = document.createElement("div");
el.className = "event-card";
el.innerHTML = <div class="card-header"> <span class="card-icon">${ev.image}</span> <div class="card-date">${d}</div> <div>${ev.heure}</div> </div> <div class="card-body"> <h3 class="card-title">${ev.titre}</h3> <div class="card-location">📍 ${ev.lieu}</div> <p class="card-description">${ev.description}</p> <div class="participants-gauge"> <div class="gauge-container"> <div class="gauge-bar"> <div class="gauge-fill" style="width:${Math.round(rate)}%;background-color:${color};"></div> </div> <span class="gauge-text">${ev.inscriptions.length}/${ev.maxParticipants}</span> </div> <div class="gauge-percentage">${Math.round(rate)}% complet</div> </div> <div class="participants-dropdown"> <button class="btn btn--outline dropdown-toggle" onclick="toggleParticipantsList(${ev.id}, this)">👥 Voir les inscrits <span>▼</span></button> <div class="dropdown-content hidden" id="participants-${ev.id}"> ${ev.inscriptions.length ? ev.inscriptions.map(p =><div class="participant-item">${p.prenom} ${p.nom}</div>).join("") : <div class="participant-item" style="text-align:center;font-style:italic;">Aucune inscription</div>} </div> </div> <button class="btn ${full ? "btn--secondary" : "btn--success"}" style="width:100%;margin-top:0.75rem;" ${full ? "disabled" : ""} onclick="openRegistrationModal(${ev.id})">${full ? "❌ Complet" : "✅ S'inscrire"}</button> </div> ;
return el;
}

function toggleParticipantsList(id, button) {
const dd = byId(participants-${id});
const arrow = button.querySelector("span:last-child");
document.querySelectorAll(".dropdown-content").forEach(d => { if (d !== dd) d.classList.add("hidden"); });
document.querySelectorAll(".dropdown-toggle span:last-child").forEach(s => { if (s !== arrow) s.textContent = "▼"; });
const open = dd.classList.contains("hidden");
dd.classList.toggle("hidden", !open);
arrow.textContent = open ? "▲" : "▼";
}

function handleLogin(e) {
e.preventDefault();
const email = byId("adminEmail").value;
const password = byId("adminPassword").value;
if (email === appConfig.adminCredentials.email && password === appConfig.adminCredentials.password) {
isAdminLoggedIn = true;
closeAllModals();
byId("publicView").classList.add("hidden");
byId("adminPanel").classList.remove("hidden");
toast("Connexion réussie !");
} else {
byId("loginError").classList.remove("hidden");
}
}

function openRegistrationModal(id) {
currentEvent = eventsData.evenements.find(e => e.id === id) || null;
if (!currentEvent) return;
byId("registrationModal").classList.remove("hidden");
byId("participationError").classList.add("hidden");
}

function handleRegistration(e) {
e.preventDefault();
if (!currentEvent) return;
const prep = byId("preparationSalle").checked;
const part = byId("partieEvenement").checked;
const full = byId("evenementEntier").checked;
if (!prep && !part && !full) {
byId("participationError").classList.remove("hidden");
return;
}
const reg = {
nom: byId("regLastName").value,
prenom: byId("regFirstName").value,
email: byId("regEmail").value,
telephone: byId("regPhone").value,
commentaire: byId("regComment").value,
participation: { preparationSalle: prep, partieEvenement: part, evenementEntier: full },
dateInscription: new Date().toISOString().split("T")
};
currentEvent.inscriptions.push(reg);
closeAllModals();
toast("Inscription confirmée !");
renderCurrentView();
byId("registrationForm").reset();
}

function updateLogoDisplay() {
const el = byId("associationLogo");
if (!el) return;
el.innerHTML = appConfig.logoUrl ? <img src="${appConfig.logoUrl}" alt="Logo association" style="max-height:200px;width:auto;"> : "🤝";
}

function handleLogoUpload(e) {
const file = e.target.files?.;
if (!file) return;
if (file.size > 2 * 1024 * 1024) return alert("Le fichier est trop volumineux (max 2MB)");
const ok = /^(image\/(png|jpeg|jpg|svg\+xml))$/.test(file.type);
if (!ok) return alert("Format non supporté (PNG, JPG, JPEG, SVG uniquement)");
const r = new FileReader();
r.onload = ev => { appConfig.logoUrl = ev.target.result; updateLogoDisplay(); toast("Logo mis à jour"); };
r.readAsDataURL(file);
}

function removeLogo() {
appConfig.logoUrl = "";
updateLogoDisplay();
toast("Logo supprimé");
}

function saveIntroText() {
const t = byId("introTextArea").value.trim();
if (!t) return;
appConfig.introText = t;
byId("introText").textContent = t;
toast("Texte mis à jour");
}

function addEventType() {
const input = byId("newEventType");
const val = (input.value || "").trim();
if (!val) return;
if (!appConfig.eventTypes.includes(val)) {
appConfig.eventTypes.push(val);
input.value = "";
renderEventTypes();
toast("Type d'événement ajouté");
}
}

function renderEventTypes() {
const c = byId("eventTypesList");
if (!c) return;
c.innerHTML = "";
appConfig.eventTypes.forEach(type => {
const row = document.createElement("div");
row.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:0.5rem;background:#fff;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:0.5rem;";
const safe = type.replace(/'/g, "\'");
row.innerHTML = <span>${type}</span><button class="btn btn--outline" style="font-size:0.75rem;padding:0.25rem 0.5rem;" onclick="removeEventType('${safe}')">🗑️ Supprimer</button>;
c.appendChild(row);
});
}

function removeEventType(type) {
if (!confirm(Supprimer le type "${type}" ?)) return;
appConfig.eventTypes = appConfig.eventTypes.filter(t => t !== type);
renderEventTypes();
toast("Type d'événement supprimé");
}

function updateCountdown() {
const now = new Date();
const next = sortedEvents().find(e => new Date(e.date) > now);
const el = byId("countdownTimer");
if (!el) return;
if (!next) return el.textContent = "Aucun événement";
const d = Math.ceil((new Date(next.date) - now) / (1000 * 60 * 60 * 24));
el.textContent = d === 0 ? "Aujourd'hui !" : d === 1 ? "Demain" : ${d} jours;
}

function sortedEvents() {
return [...eventsData.evenements].sort((a, b) => new Date(a.date) - new Date(b.date));
}

function closeAllModals() {
document.querySelectorAll(".modal-overlay").forEach(m => m.classList.add("hidden"));
const err = byId("loginError"); if (err) err.classList.add("hidden");
const pwd = byId("adminPassword"); if (pwd) pwd.value = "";
currentEvent = null;
}

function toast(msg) {
const tm = byId("toastMessage"); if (tm) tm.textContent = msg;
const t = byId("successToast");
t.classList.remove("hidden"); t.classList.add("show");
setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.classList.add("hidden"), 250); }, 2500);
}

// Expose
window.toggleParticipantsList = toggleParticipantsList;
window.openRegistrationModal = openRegistrationModal;
window.removeEventType = removeEventType;
