// Ohlun'Joie V3 — App production
const SUPABASE_URL = 'https://duqkrpgcqbasbnzynfuh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1cWtycGdjcWJhc2JuenluZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NDM5NTAsImV4cCI6MjA3NjExOTk1MH0.nikdF6TMoFgQHSeEtpfXjWHNOazALoFF_stkunz8OcU';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// UI helpers
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const toast = (m)=>{ const el=$("#toast"); el.textContent=m; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2500); };

// Theme
(function initTheme(){
  const saved = localStorage.getItem('theme');
  const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark':'light';
  const theme = saved || prefers;
  document.documentElement.dataset.theme = theme;
  $('#theme-toggle').textContent = theme==='dark'?'☀️':'🌙';
  $('#theme-toggle').onclick = () => {
    const t = (document.documentElement.dataset.theme==='dark')?'light':'dark';
    document.documentElement.dataset.theme = t;
    localStorage.setItem('theme', t);
    $('#theme-toggle').textContent = t==='dark'?'☀️':'🌙';
  };
})();

// Track analytics
async function track(type,{event_id=null,page_name=null}={}){
  await supabase.from('analytics').insert({event_type:type,event_id,page_name,timestamp:new Date().toISOString(),user_agent:navigator.userAgent});
}
track('page_view',{page_name:'public'});

// Load config
async function loadConfig(){
  const { data, error } = await supabase.from('app_config').select('*');
  if(!error && data){
    const intro = data.find(x=>x.key==='intro_text'); if(intro) $('#intro-text').textContent = intro.value;
    const logo = data.find(x=>x.key==='logo_url'); if(logo && logo.value) $('.logo-emoji').textContent='';
  }
}
loadConfig();

// Public events (visible & not archived)
async function fetchPublicEvents(){
  const { data, error } = await supabase.from('events')
    .select('*, inscriptions(count)')
    .eq('visible', true).eq('archived', false)
    .order('date', { ascending: true });
  return data || [];
}

// Renderers
function renderTimeline(events){
  const root = $('#timeline-view'); root.innerHTML='';
  const line = document.createElement('div');
  events.forEach(ev=>{
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `
      <div class="card-header">
        <div>
          <div class="card-title">${ev.image||'📅'} ${ev.titre}</div>
          <div class="muted">${ev.date} • ${ev.heure} • ${ev.lieu} • ${ev.type}</div>
        </div>
        <div><button class="btn see">Voir</button></div>
      </div>
      <p>${ev.description}</p>`;
    card.querySelector('.see').onclick=()=>{ openInscription(ev); track('event_click',{event_id:ev.id}); };
    root.appendChild(card);
  });
}

function renderList(events){
  const root = $('#list-view'); root.innerHTML='';
  const table = document.createElement('table'); table.className='table';
  table.innerHTML = `<thead><tr><th>Date</th><th>Titre</th><th>Lieu</th><th>Participants</th><th></th></tr></thead><tbody></tbody>`;
  events.forEach(ev=>{
    const tr = document.createElement('tr');
    const count = ev.inscriptions?.[0]?.count || 0;
    tr.innerHTML = `<td>${ev.date} ${ev.heure}</td><td>${ev.titre}</td><td>${ev.lieu}</td><td>${count}/${ev.max_participants}</td><td><button class="btn see">Voir</button></td>`;
    tr.querySelector('.see').onclick=()=>{ openInscription(ev); track('event_click',{event_id:ev.id}); };
    table.querySelector('tbody').appendChild(tr);
  });
  root.appendChild(table);
}

function renderCards(events){
  const root = $('#cards-view'); root.innerHTML='';
  const grid = document.createElement('div'); grid.className='cards-grid';
  events.forEach(ev=>{
    const count = ev.inscriptions?.[0]?.count || 0;
    const pct = Math.min(100, Math.round((count/Math.max(1,ev.max_participants))*100));
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `
      <div class="card-header">
        <div>
          <div class="card-title">${ev.image||'📅'} ${ev.titre}</div>
          <div class="muted">${ev.date} • ${ev.heure} • ${ev.lieu} • ${ev.type}</div>
        </div>
        <div class="card-actions"><button class="btn see">Voir</button></div>
      </div>
      <p>${ev.description}</p>
      <div class="progress" aria-label="Remplissage"><span style="width:${pct}%"></span></div>
      <small>${count}/${ev.max_participants} participants</small>`;
    card.querySelector('.see').onclick=()=>{ openInscription(ev); track('event_click',{event_id:ev.id}); };
    grid.appendChild(card);
  });
  root.appendChild(grid);
}

// Switch views
function bindViews(events){
  $('#view-timeline').onclick=()=>{ setActive('timeline'); };
  $('#view-list').onclick=()=>{ setActive('list'); };
  $('#view-cards').onclick=()=>{ setActive('cards'); };
  function setActive(which){
    $$('.view').forEach(v=>v.classList.remove('active'));
    $('#'+which+'-view').classList.add('active');
    $$('#public-section .tab').forEach(b=>b.classList.remove('active'));
    $('#view-'+which).classList.add('active');
  }
}

async function loadPublic(){
  const evs = await fetchPublicEvents();
  renderTimeline(evs); renderList(evs); renderCards(evs);
  bindViews(evs);
  fillInscriptionSelect(evs);
  updateNextCountdown(evs);
}
loadPublic();

// Next event countdown
function updateNextCountdown(events){
  if(!events.length){ $('#next-event-countdown').textContent = '—'; return; }
  const d0 = new Date(events[0].date+'T'+(events[0].heure||'00:00'));
  const days = Math.max(0, Math.ceil((d0 - new Date())/86400000));
  $('#next-event-countdown').textContent = days+' jours';
}

// Inscription
function fillInscriptionSelect(events){
  const s = $('#inscription-event'); s.innerHTML='';
  events.forEach(ev=>{
    const o = document.createElement('option'); o.value = ev.id; o.textContent = `${ev.titre} — ${ev.date} ${ev.heure||''}`;
    s.appendChild(o);
  });
}

$('#inscription-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(e.target);
  const prenom = fd.get('prenom')?.trim(); const nom = fd.get('nom')?.trim();
  const email = fd.get('email')?.trim(); const telephone = fd.get('telephone')?.trim();
  const commentaire = fd.get('commentaire')?.trim();
  const preparation_salle = !!fd.get('preparation_salle');
  const partie_evenement = !!fd.get('partie_evenement');
  const evenement_entier = !!fd.get('evenement_entier');
  const event_id = Number(fd.get('event_id'));

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const telOk = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.\-]*\d{2}){4}$/.test(telephone.replace(/_/g,''));
  const minOne = preparation_salle || partie_evenement || evenement_entier;
  if(!prenom||!nom||!emailOk||!telOk||!minOne){ toast('Vérifie les champs requis (email/téléphone/participations).'); return; }

  const { error } = await supabase.from('inscriptions').insert({
    event_id, prenom, nom, email, telephone, commentaire,
    preparation_salle, partie_evenement, evenement_entier
  });
  if(error){ toast('Erreur inscription.'); return; }
  toast('Inscription enregistrée !');
  loadPublic();
});

// Admin minimal auth (démo)
let isAdmin = false;
$('#admin-toggle').onclick = ()=>{ $('#admin-section').scrollIntoView({behavior:'smooth'}); };
$('#admin-login').onclick = async ()=>{
  const email = $('#admin-email').value.trim();
  const pass = $('#admin-password').value;
  if(email==='zinck.maxime@gmail.com' && pass==='Zz/max789'){ isAdmin=true; toast('Connecté.'); track('page_view',{page_name:'admin'}); loadAdmin(); }
  else toast('Identifiants invalides.');
};

// Admin: events
async function fetchAllEventsAdmin(){
  const { data } = await supabase.from('events')
    .select('*, inscriptions(count)')
    .order('date',{ascending:true});
  return data||[];
}

function badgeFor(ev){
  if(ev.archived) return '<span class="badge arch">⚫ Archivé</span>';
  if(ev.visible) return '<span class="badge ok">🟢 Actif</span>';
  return '<span class="badge warn">🟠 Masqué</span>';
}

function renderAdminEvents(list, filter='actifs'){
  const root = $('#admin-events-cards'); root.innerHTML='';
  let data = list.slice();
  if(filter==='actifs') data = data.filter(e=>e.visible && !e.archived);
  if(filter==='masques') data = data.filter(e=>!e.visible && !e.archived);
  if(filter==='archives') data = data.filter(e=>e.archived);
  data.forEach(ev=>{
    const count = ev.inscriptions?.[0]?.count||0;
    const pct = Math.min(100, Math.round((count/Math.max(1,ev.max_participants))*100));
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `
      <div class="card-header">
        <div>
          <div class="card-title">${ev.image||'📅'} ${ev.titre}</div>
          <div class="muted">${ev.date} • ${ev.heure} • ${ev.lieu} • ${ev.type}</div>
          <div class="badges">${badgeFor(ev)}</div>
        </div>
        <div class="card-actions">
          <button class="btn toggle">${ev.visible?'Masquer':'Rendre visible'}</button>
          <button class="btn" data-act="csv">📥 CSV</button>
          ${ev.archived?'<button class="btn" data-act="restore">🔄 Restaurer</button>':''}
        </div>
      </div>
      <p>${ev.description}</p>
      <div class="progress"><span style="width:${pct}%"></span></div>
      <details class="inscrits"><summary>Voir les inscrits</summary><div class="list"></div></details>`;
    card.querySelector('.toggle').onclick = async ()=>{
      await supabase.from('events').update({visible: !ev.visible}).eq('id', ev.id);
      loadAdmin();
    };
    card.querySelector('[data-act="csv"]')?.addEventListener('click', ()=>exportInscriptionsCSV(ev.id, ev.titre));
    card.querySelector('[data-act="restore"]')?.addEventListener('click', async ()=>{
      await supabase.from('events').update({archived:false}).eq('id', ev.id);
      loadAdmin();
    });
    // load inscrits
    card.querySelector('.inscrits').addEventListener('toggle', async (e)=>{
      if(e.target.open){
        const { data } = await supabase.from('inscriptions')
          .select('*').eq('event_id', ev.id).order('date_inscription',{ascending:false});
        const host = card.querySelector('.list'); host.innerHTML='';
        (data||[]).forEach(i=>{
          const row = document.createElement('div');
          row.textContent = `${i.prenom} ${i.nom} — ${i.email} — ${i.telephone} — [${i.preparation_salle?'Prépa ':''}${i.partie_evenement?'Partie ':''}${i.evenement_entier?'Entier':''}]`;
          host.appendChild(row);
        });
      }
    });
    root.appendChild(card);
  });
}

async function exportInscriptionsCSV(eventId, title){
  const { data } = await supabase.from('inscriptions').select('*').eq('event_id', eventId);
  const headers = ['Prenom','Nom','Email','Telephone','Commentaire','PreparationSalle','PartieEvenement','EvenementEntier','DateInscription'];
  const rows = (data||[]).map(i=>[
    i.prenom,i.nom,i.email,i.telephone,(i.commentaire||'').replace(/[\r\n]+/g,' '),
    i.preparation_salle,i.partie_evenement,i.evenement_entier,i.date_inscription
  ]);
  const csv = [headers.join(','), ...rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(','))].join('\n');
  const blob = new Blob(["\ufeff"+csv],{type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`inscriptions_${title}.csv`; a.click();
}

async function loadAdmin(){
  if(!isAdmin) return;
  // KPIs
  const [{data:cnt1},{data:cnt2},{data:distinct}] = await Promise.all([
    supabase.from('inscriptions').select('id', { count:'exact', head:true }),
    supabase.from('events').select('id', { count:'exact', head:true }).eq('visible',true).eq('archived',false),
    supabase.from('inscriptions').select('email')
  ]);
  $('#kpi-total').textContent = (cnt1?.length??0);
  $('#kpi-actifs').textContent = (cnt2?.length??0);
  const emails = new Set((distinct||[]).map(x=>x.email)); $('#kpi-emails').textContent = emails.size;
  // taux moyen
  const { data:evs } = await supabase.from('events').select('id,max_participants, inscriptions(count)').order('date');
  const taux = (evs||[]).map(e=> (e.inscriptions?.[0]?.count||0)/Math.max(1,e.max_participants));
  $('#kpi-taux').textContent = (taux.length? Math.round((taux.reduce((a,b)=>a+b,0)/taux.length)*100):0) + '%';

  // Events tab
  const all = await fetchAllEventsAdmin();
  renderAdminEvents(all, $('.chip.active').dataset.filter);

  // Stats table
  renderStatsTable(all);

  // Filters
  $$('#tab-events .chip').forEach(c=>{
    c.onclick=()=>{ $$('#tab-events .chip').forEach(x=>x.classList.remove('active')); c.classList.add('active'); renderAdminEvents(all, c.dataset.filter); };
  });
}

function renderStatsTable(all){
  const wrap = $('#stats-table'); wrap.innerHTML='';
  const table = document.createElement('table'); table.className='table';
  table.innerHTML = `<thead><tr><th>Titre</th><th>Date</th><th>Inscrits</th><th>Places</th><th>Taux %</th><th>Vues</th><th>Clics</th></tr></thead><tbody></tbody>`;
  (all||[]).forEach(e=>{
    const count = e.inscriptions?.[0]?.count||0;
    const taux = Math.round((count/Math.max(1,e.max_participants))*100);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${e.titre}</td><td>${e.date}</td><td>${count}</td><td>${e.max_participants}</td><td>${taux}%</td><td>—</td><td>—</td>`;
    table.querySelector('tbody').appendChild(tr);
  });
  wrap.appendChild(table);
}

function scheduleAutoArchive(){
  setInterval(async ()=>{
    const now = new Date();
    if(now.getHours()===0 && now.getMinutes()===0){
      const today = now.toISOString().split('T')[0];
      const last = localStorage.getItem('lastArchiveRun');
      if(last!==today){
        await supabase.from('events').update({archived:true}).lt('date', today).eq('archived', false);
        localStorage.setItem('lastArchiveRun', today);
        loadPublic(); if(isAdmin) loadAdmin();
      }
    }
  }, 60000);
}
scheduleAutoArchive();

// Tabs in admin
$$('#admin-section .tabs .tab').forEach(btn=>{
  btn.onclick = ()=>{
    $$('#admin-section .tabs .tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    $$('#admin-section .tab-panel').forEach(p=>p.classList.remove('active'));
    $('#tab-'+btn.dataset.tab).classList.add('active');
  };
});
