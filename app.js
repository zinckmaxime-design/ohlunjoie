// ===== Ohlun'Joie — JS stable (sans backticks) =====
var eventsData = {"evenements":[{"id":1,"titre":"Assemblée Générale Annuelle","date":"2025-10-20","heure":"18:30","description":"Assemblée générale annuelle avec présentation du bilan et vote sur les nouveaux projets de l'association.","lieu":"Salle municipale","type":"assemblée","image":"🏛️","maxParticipants":50,"inscriptions":[{"nom":"Dupont","prenom":"Marie","email":"marie.dupont@email.com","telephone":"06 12 34 56 78","commentaire":"Hâte de découvrir les nouveaux projets","participation":{"preparationSalle":true,"partieEvenement":false,"evenementEntier":true},"dateInscription":"2025-10-08"}]},{"id":2,"titre":"Atelier Cuisine d'Automne","date":"2025-11-15","heure":"14:00","description":"Découverte de la cuisine traditionnelle avec un chef local. Atelier pratique et dégustation.","lieu":"Centre culturel","type":"atelier","image":"👨‍🍳","maxParticipants":15,"inscriptions":[]} ]};

var appConfig = {"introText":"Notre association rassemble des bénévoles passionnés qui organisent des événements variés pour créer du lien social et enrichir la vie de notre commune. Ensemble, nous partageons des moments conviviaux et construisons une communauté solidaire.","logoUrl":"","eventTypes":["assemblée","atelier","sport","fête","conférence","événement"],"adminCredentials":{"email":"zinck.maxime@gmail.com","password":"Sto/nuqi0"}};

var currentView="timeline";var currentEvent=null;var isAdminLoggedIn=false;

document.addEventListener("DOMContentLoaded",function(){wireBasics();renderCurrentView();updateCountdown();setInterval(updateCountdown,60000);});

function byId(id){return document.getElementById(id);}

function wireBasics(){
var viewBtns=document.querySelectorAll("[data-view]");
for(var i=0;i<viewBtns.length;i++){
viewBtns[i].addEventListener("click",function(e){switchView(e.currentTarget.getAttribute("data-view"));});
}
var adminBtn=byId("adminBtn"); if(adminBtn){adminBtn.addEventListener("click",function(){var m=byId("loginModal"); if(m){m.classList.remove("hidden");}});}
document.addEventListener("click",function(e){if(e.target.classList.contains("modal-overlay")||e.target.classList.contains("modal-close")){closeAllModals();}});
var loginForm=byId("loginForm"); if(loginForm){loginForm.addEventListener("submit",handleLogin);}
var regForm=byId("registrationForm"); if(regForm){regForm.addEventListener("submit",handleRegistration);}
var logoutBtn=byId("logoutBtn"); if(logoutBtn){logoutBtn.addEventListener("click",function(){isAdminLoggedIn=false;byId("adminPanel").classList.add("hidden");byId("publicView").classList.remove("hidden");toast("Déconnexion réussie");});}
var intro=byId("introText"); if(intro){intro.textContent=appConfig.introText;}
updateLogoDisplay();
var logoUpload=byId("logoUpload"); if(logoUpload){logoUpload.addEventListener("change",handleLogoUpload);}
var removeLogoBtn=byId("removeLogo"); if(removeLogoBtn){removeLogoBtn.addEventListener("click",removeLogo);}
var saveIntroBtn=byId("saveIntroText"); if(saveIntroBtn){saveIntroBtn.addEventListener("click",saveIntroText);}
var addTypeBtn=byId("addEventType"); if(addTypeBtn){addTypeBtn.addEventListener("click",addEventType);}
}

function switchView(view){
var btns=document.querySelectorAll("[data-view]");
for(var i=0;i<btns.length;i++){
var active=btns[i].getAttribute("data-view")===view;
btns[i].classList.toggle("btn--primary",active);
btns[i].classList.toggle("active",active);
btns[i].classList.toggle("btn--outline",!active);
}
var containers=document.querySelectorAll(".events-container");
for(var j=0;j<containers.length;j++){containers[j].classList.remove("active");}
currentView=view;
renderCurrentView();
}

function renderCurrentView(){
var container=byId(currentView+"View"); if(container){container.classList.add("active");}
if(currentView==="timeline"){renderTimeline();}
else if(currentView==="list"){renderList();}
else if(currentView==="cards"){renderCards();}
}

function sortedEvents(){var a=eventsData.evenements.slice();a.sort(function(x,y){return new Date(x.date)-new Date(y.date);});return a;}

function pct(insc,max){return Math.min(100,Math.round((insc/max)*100));}
function gaugeColor(p){return p>85?"#EF4444":(p>60?"#F59E0B":"#10B981");}

function renderTimeline(){
var wrap=byId("timelineView"); var evs=sortedEvents(); wrap.innerHTML='<div class="timeline-rail"></div>';
for(var i=0;i<evs.length;i++){wrap.appendChild(timelineEvent(evs[i]));}
}

function timelineEvent(ev){
var p=pct(ev.inscriptions.length,ev.maxParticipants); var full=ev.inscriptions.length>=ev.maxParticipants;
var d=new Date(ev.date).toLocaleDateString("fr-FR",{day:"numeric",month:"long"});
var c=gaugeColor(p);
var el=document.createElement("div"); el.className="timeline-event";
var inscritsHtml=ev.inscriptions.length?ev.inscriptions.map(function(pr){return '<div class="participant-item">'+pr.prenom+' '+pr.nom+'</div>';}).join(""):'<div class="participant-item" style="text-align:center;font-style:italic;">Aucune inscription</div>';
el.innerHTML='' +
'<div class="timeline-content">' +
'<div class="timeline-dot"></div>' +
'<div class="timeline-date">'+d+'</div>' +
'<h3 style="font-size:1.25rem;font-weight:600;margin-bottom:0.75rem;color:#111827;">'+ev.image+' '+ev.titre+'</h3>' +
'<div style="font-size:0.875rem;color:#4b5563;margin-bottom:1rem;">' +
'<div style="margin-bottom:0.25rem;">📅 '+ev.heure+' - 📍 '+ev.lieu+'</div>' +
'<div>'+ev.description+'</div>' +
'</div>' +
'<div class="participants-gauge">' +
'<div class="gauge-container">' +
'<div class="gauge-bar"><div class="gauge-fill" style="width:'+p+'%;background-color:'+c+';"></div></div>' +
'<span class="gauge-text">'+ev.inscriptions.length+'/'+ev.maxParticipants+'</span>' +
'</div>' +
'<div class="gauge-percentage">'+p+'% complet</div>' +
'</div>' +
'<div class="participants-dropdown">' +
'<button class="btn btn--outline dropdown-toggle" onclick="toggleParticipantsList('+ev.id+', this)">👥 Voir les inscrits <span>▼</span></button>' +
'<div class="dropdown-content hidden" id="participants-'+ev.id+'">'+inscritsHtml+'</div>' +
'</div>' +
'<div style="margin-top:1rem;">' +
'<button class="btn '+(full?'btn--secondary':'btn--success')+'" '+(full?'disabled':'')+' onclick="openRegistrationModal('+ev.id+')">'+(full?'❌ Complet':'✅ S\'inscrire')+'</button>' +
'</div>' +
'</div>';
return el;
}

function renderList(){
var body=document.querySelector("#listView .list-body"); body.innerHTML=""; var evs=sortedEvents();
for(var i=0;i<evs.length;i++){body.appendChild(listEvent(evs[i]));}
}

function listEvent(ev){
var p=pct(ev.inscriptions.length,ev.maxParticipants); var full=ev.inscriptions.length>=ev.maxParticipants;
var d=new Date(ev.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"}); var c=gaugeColor(p);
var inscritsHtml=ev.inscriptions.length?ev.inscriptions.map(function(pr){return '<div class="participant-item">'+pr.prenom+' '+pr.nom+'</div>';}).join(""):'<div class="participant-item" style="text-align:center;font-style:italic;">Aucune inscription</div>';
var el=document.createElement("div"); el.className="list-event";
el.innerHTML='' +
'<div>'+d+'
<small>'+ev.heure+'</small></div>' +
'<div><strong>'+ev.titre+'</strong>
' +
'<button class="btn btn--outline" style="font-size:0.75rem;padding:0.25rem 0.5rem;margin-top:0.25rem;" onclick="toggleParticipantsList('+ev.id+', this)">👥 Inscrits <span>▼</span></button>' +
'<div class="dropdown-content hidden" id="participants-'+ev.id+'">'+inscritsHtml+'</div>' +
'</div>' +
'<div>'+ev.lieu+'</div>' +
'<div style="text-align:center;">' +
'<div class="gauge-container" style="margin-bottom:0.25rem;">' +
'<div class="gauge-bar" style="width:60px;height:6px;"><div class="gauge-fill" style="width:'+p+'%;background-color:'+c+';"></div></div>' +
'</div>' +
'<div style="font-size:0.75rem;">'+ev.inscriptions.length+'/'+ev.maxParticipants+'</div>' +
'</div>' +
'<div><button class="btn '+(full?'btn--secondary':'btn--success')+'" style="font-size:0.75rem;padding:0.25rem 0.5rem;" '+(full?'disabled':'')+' onclick="openRegistrationModal('+ev.id+')">'+(full?'Complet':'S\'inscrire')+'</button></div>';
return el;
}

function renderCards(){
var grid=document.querySelector("#cardsView .cards-grid"); grid.innerHTML=""; var evs=sortedEvents();
for(var i=0;i<evs.length;i++){grid.appendChild(cardEvent(evs[i]));}
}

function cardEvent(ev){
var p=pct(ev.inscriptions.length,ev.maxParticipants); var full=ev.inscriptions.length>=ev.maxParticipants;
var d=new Date(ev.date).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"}); var c=gaugeColor(p);
var inscritsHtml=ev.inscriptions.length?ev.inscriptions.map(function(pr){return '<div class="participant-item">'+pr.prenom+' '+pr.nom+'</div>';}).join(""):'<div class="participant-item" style="text-align:center;font-style:italic;">Aucune inscription</div>';
var el=document.createElement("div"); el.className="event-card";
el.innerHTML='' +
'<div class="card-header"><span class="card-icon">'+ev.image+'</span><div class="card-date">'+d+'</div><div>'+ev.heure+'</div></div>' +
'<div class="card-body">' +
'<h3 class="card-title">'+ev.titre+'</h3>' +
'<div class="card-location">📍 '+ev.lieu+'</div>' +
'<p class="card-description">'+ev.description+'</p>' +
'<div class="participants-gauge">' +
'<div class="gauge-container"><div class="gauge-bar"><div class="gauge-fill" style="width:'+p+'%;background-color:'+c+';"></div></div><span class="gauge-text">'+ev.inscriptions.length+'/'+ev.maxParticipants+'</span></div>' +
'<div class="gauge-percentage">'+p+'% complet</div>' +
'</div>' +
'<div class="participants-dropdown"><button class="btn btn--outline dropdown-toggle" onclick="toggleParticipantsList('+ev.id+', this)">👥 Voir les inscrits <span>▼</span></button><div class="dropdown-content hidden" id="participants-'+ev.id+'">'+inscritsHtml+'</div></div>' +
'<button class="btn '+(full?'btn--secondary':'btn--success')+'" style="width:100%;margin-top:0.75rem;" '+(full?'disabled':'')+' onclick="openRegistrationModal('+ev.id+')">'+(full?'❌ Complet':'✅ S\'inscrire')+'</button>' +
'</div>';
return el;
}

function toggleParticipantsList(id,button){
var dd=byId("participants-"+id); var arrow=button.querySelector("span:last-child");
var all=document.querySelectorAll(".dropdown-content"); for(var i=0;i<all.length;i++){if(all[i]!==dd) all[i].classList.add("hidden");}
var arrows=document.querySelectorAll(".dropdown-toggle span:last-child"); for(var j=0;j<arrows.length;j++){if(arrows[j]!==arrow) arrows[j].textContent="▼";}
var open=dd.classList.contains("hidden"); dd.classList.toggle("hidden",!open); arrow.textContent=open?"▲":"▼";
}

function handleLogin(e){
e.preventDefault();
var email=byId("adminEmail").value; var password=byId("adminPassword").value;
if(email===appConfig.adminCredentials.email && password===appConfig.adminCredentials.password){
isAdminLoggedIn=true; closeAllModals(); byId("publicView").classList.add("hidden"); byId("adminPanel").classList.remove("hidden"); toast("Connexion réussie !");
} else { byId("loginError").classList.remove("hidden"); }
}

function openRegistrationModal(id){
for(var i=0;i<eventsData.evenements.length;i++){ if(eventsData.evenements[i].id===id){ currentEvent=eventsData.evenements[i]; break; } }
if(!currentEvent) return;
byId("registrationModal").classList.remove("hidden");
byId("participationError").classList.add("hidden");
}

function handleRegistration(e){
e.preventDefault(); if(!currentEvent) return;
var prep=byId("preparationSalle").checked; var part=byId("partieEvenement").checked; var full=byId("evenementEntier").checked;
if(!prep && !part && !full){ byId("participationError").classList.remove("hidden"); return; }
var reg={"nom":byId("regLastName").value,"prenom":byId("regFirstName").value,"email":byId("regEmail").value,"telephone":byId("regPhone").value,"commentaire":byId("regComment").value,"participation":{"preparationSalle":prep,"partieEvenement":part,"evenementEntier":full},"dateInscription":new Date().toISOString().split("T")};
currentEvent.inscriptions.push(reg); closeAllModals(); toast("Inscription confirmée !"); renderCurrentView(); byId("registrationForm").reset();
}

function updateCountdown(){
var now=new Date(); var evs=sortedEvents(); var next=null;
for(var i=0;i<evs.length;i++){ if(new Date(evs[i].date)>now){ next=evs[i]; break; } }
var el=byId("countdownTimer"); if(!el) return;
if(!next){ el.textContent="Aucun événement"; return; }
var d=Math.ceil((new Date(next.date)-now)/(10006060*24));
el.textContent=d===0?"Aujourd'hui !":(d===1?"Demain":(d+" jours"));
}

function closeAllModals(){
var mods=document.querySelectorAll(".modal-overlay"); for(var i=0;i<mods.length;i++){mods[i].classList.add("hidden");}
var err=byId("loginError"); if(err) err.classList.add("hidden");
var pwd=byId("adminPassword"); if(pwd) pwd.value="";
currentEvent=null;
}

function updateLogoDisplay(){
var el=byId("associationLogo"); if(!el) return;
if(appConfig.logoUrl){ el.innerHTML='<img src="'+appConfig.logoUrl+'" alt="Logo association" style="max-height:200px;width:auto;">'; }
else { el.textContent="🤝"; }
}

function handleLogoUpload(e){
var f=e.target.files && e.target.files; if(!f) return;
if(f.size>210241024){ alert("Le fichier est trop volumineux (max 2MB)"); return; }
if(!/^image\/(png|jpeg|jpg|svg\+xml)$/.test(f.type)){ alert("Format non supporté (PNG, JPG, JPEG, SVG uniquement)"); return; }
var r=new FileReader(); r.onload=function(ev){ appConfig.logoUrl=ev.target.result; updateLogoDisplay(); toast("Logo mis à jour"); }; r.readAsDataURL(f);
}

function removeLogo(){ appConfig.logoUrl=""; updateLogoDisplay(); toast("Logo supprimé"); }

function saveIntroText(){
var t=byId("introTextArea").value.trim(); if(!t) return;
appConfig.introText=t; byId("introText").textContent=t; toast("Texte mis à jour");
}

function addEventType(){
var input=byId("newEventType"); var v=(input.value||"").trim(); if(!v) return;
for(var i=0;i<appConfig.eventTypes.length;i++){ if(appConfig.eventTypes[i]===v) return; }
appConfig.eventTypes.push(v); input.value=""; renderEventTypes(); toast("Type d'événement ajouté");
}

function renderEventTypes(){
var c=byId("eventTypesList"); if(!c) return; c.innerHTML="";
for(var i=0;i<appConfig.eventTypes.length;i++){
var type=appConfig.eventTypes[i]; var row=document.createElement("div");
row.style.cssText="display:flex;justify-content:space-between;align-items:center;padding:0.5rem;background:#fff;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:0.5rem;";
var safe=type.replace(/'/g,"\'");
row.innerHTML='<span>'+type+'</span><button class="btn btn--outline" style="font-size:0.75rem;padding:0.25rem 0.5rem;" onclick="removeEventType(\''+safe+'\')">🗑️ Supprimer</button>';
c.appendChild(row);
}
}

function removeEventType(type){
if(!confirm('Supprimer le type "'+type+'" ?')) return;
var arr=[]; for(var i=0;i<appConfig.eventTypes.length;i++){ if(appConfig.eventTypes[i]!==type) arr.push(appConfig.eventTypes[i]); }
appConfig.eventTypes=arr; renderEventTypes(); toast("Type d'événement supprimé");
}

function toast(m){
var tm=byId("toastMessage"); if(tm) tm.textContent=m;
var t=byId("successToast"); if(!t) return;
t.classList.remove("hidden"); t.classList.add("show");
setTimeout(function(){ t.classList.remove("show"); setTimeout(function(){ t.classList.add("hidden"); },250); },2500);
}

// Expose
window.toggleParticipantsList=toggleParticipantsList;
window.openRegistrationModal=openRegistrationModal;
window.removeEventType=removeEventType;
