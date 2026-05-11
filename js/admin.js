// =============================================================================
// ADMIN.JS - Admin Back-Office Functionality
// =============================================================================

// Inscriptions sort state
let inscSortField = null;
let inscSortAsc = true;

// Helper to get Supabase access token for API calls
async function getSupabaseAccessToken() {
  try {
    const { data: { session } } = await _supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

// Generate years array (current year -3 to +3)
function getYearOptions() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear - 3; y <= currentYear + 3; y++) {
    years.push(y);
  }
  return years;
}

// -----------------------------------------------------------------------------
// ADMIN UI CORE
// -----------------------------------------------------------------------------

// Toggle visibility between admin and public sections
function setAdminView(showAdmin) {
  const adminSection = $('#admin-section');
  const publicIntro = $('#public-intro');
  const publicSection = $('#public-section');
  const publicTabs = $('#public-tabs');
  const adminToggle = $('#admin-toggle');

  if (adminSection) adminSection.hidden = !showAdmin;
  if (publicIntro) publicIntro.hidden = showAdmin;
  if (publicSection) publicSection.hidden = showAdmin;
  if (publicTabs) publicTabs.style.display = showAdmin ? 'none' : '';
  if (adminToggle) adminToggle.style.display = showAdmin ? 'none' : '';
}

function unmountAdmin() {
  setAdminView(false);
}

function mountAdmin() {
  setAdminView(true);

  // Display connected user name and role
  const nameEl = $('#admin-user-name');
  const roleEl = $('#admin-user-role-label');
  if (nameEl) nameEl.textContent = (adminUser?.prenom || '') + ' ' + (adminUser?.nom || '');
  if (roleEl) roleEl.textContent = roleLabels[adminUser?.role] || adminUser?.role || '';

  // Setup tab buttons based on role
  $$('.admin-tab').forEach(btn => {
    const module = btn.dataset.module;
    if (canViewModule(module)) {
      btn.onclick = () => switchAdminTab(module);
      btn.style.opacity = '';
      btn.disabled = false;
      btn.title = '';
    } else {
      btn.onclick = null;
      btn.style.opacity = '0.5';
      btn.disabled = true;
      btn.title = 'Accès refusé';
    }
  });

  // Logout button
  const logoutBtn = $('#admin-logout');
  if (logoutBtn) logoutBtn.onclick = logout;

  // Reset to dashboard tab
  $$('.admin-tab').forEach(b => b.classList.remove('active'));
  $$('.admin-module').forEach(m => m.classList.remove('active'));

  const dashboardTab = $('.admin-tab[data-module="dashboard"]');
  const dashboardModule = $('#module-dashboard');
  if (dashboardTab) dashboardTab.classList.add('active');
  if (dashboardModule) dashboardModule.classList.add('active');

  loadAdminDashboard();
}

function switchAdminTab(module) {
  $$('.admin-tab').forEach(b => b.classList.remove('active'));
  const activeTab = $(`.admin-tab[data-module="${module}"]`);
  if (activeTab) activeTab.classList.add('active');

  $$('.admin-module').forEach(m => m.classList.remove('active'));
  const activeModule = $('#module-' + module);
  if (activeModule) activeModule.classList.add('active');

  switch (module) {
    case 'dashboard': loadAdminDashboard(); break;
    case 'events': loadAdminEvents(); break;
    case 'inscriptions': loadAdminInscriptions(); break;
    case 'volunteers': loadAdminVolunteers(); break;
    case 'admins': loadAdminUsers(); break;
    case 'association': loadAdminAssociation(); break;
    case 'messages': loadAdminMessages(); break;
  }
}

// -----------------------------------------------------------------------------
// DASHBOARD
// -----------------------------------------------------------------------------

async function loadAdminDashboard() {
  const section = $('#module-dashboard');
  if (!section) return;
  section.innerHTML = '<p>Chargement...</p>';

  const [inscRes, eventsRes, pageViewsRes, emailsRes, lastVisitRes] = await Promise.all([
    _supabase.from('inscriptions').select('id', { count: 'exact', head: true }),
    _supabase.from('events').select('id', { count: 'exact', head: true }).eq('visible', true).eq('archived', false),
    _supabase.from('analytics').select('id', { count: 'exact', head: true }).eq('event_type', 'page_view').eq('page_name', 'public'),
    _supabase.from('inscriptions').select('email'),
    _supabase.from('analytics').select('timestamp').eq('event_type', 'page_view').order('timestamp', { ascending: false }).limit(1)
  ]);

  const { data: allEvents } = await _supabase.from('events').select('id, max_participants, inscriptions(count)').order('date');
  const rates = (allEvents || []).map(e => {
    const count = e.inscriptions?.[0]?.count || 0;
    return count / Math.max(1, e.max_participants);
  });
  const avgRate = rates.length ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100) : 0;

  const uniqueEmails = new Set((emailsRes.data || []).map(x => x.email));

  let lastVisitLabel = 'Aucune';
  const lastVisit = lastVisitRes.data?.[0]?.timestamp;
  if (lastVisit) {
    const diff = Math.floor((Date.now() - new Date(lastVisit).getTime()) / 1000);
    if (diff < 60) lastVisitLabel = 'Il y a quelques secondes';
    else if (diff < 3600) lastVisitLabel = `Il y a ${Math.floor(diff / 60)} min`;
    else if (diff < 86400) lastVisitLabel = `Il y a ${Math.floor(diff / 3600)}h`;
    else lastVisitLabel = `Il y a ${Math.floor(diff / 86400)}j`;
  }

  section.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Inscrits</div>
        <div class="kpi-value">${inscRes.count || 0}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Événements Actifs</div>
        <div class="kpi-value">${eventsRes.count || 0}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Emails Uniques</div>
        <div class="kpi-value">${uniqueEmails.size}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Taux Moyen Inscription</div>
        <div class="kpi-value">${avgRate}%</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Visites Site</div>
        <div class="kpi-value">${pageViewsRes.count || 0}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Dernière Visite</div>
        <div class="kpi-value">${lastVisitLabel}</div>
      </div>
    </div>
    <div class="chart-placeholder">
      📊 Graphiques des visites (intégration future)
    </div>
  `;
}

// -----------------------------------------------------------------------------
// EVENTS
// -----------------------------------------------------------------------------

// Archive past events
async function archivePastEvents() {
  const today = new Date().toISOString().split('T')[0];
  try {
    const { data: past } = await _supabase
      .from('events')
      .select('id, date, archived')
      .lt('date', today)
      .eq('archived', false);

    if (past && past.length) {
      for (const ev of past) {
        await _supabase.from('events').update({ archived: true }).eq('id', ev.id);
      }
    }
  } catch (err) {
    console.warn('Erreur archivage événements:', err);
  }
}

async function loadAdminEvents() {
  const section = $('#module-events');
  if (!section) return;
  section.innerHTML = '<p>Chargement des événements...</p>';

  const currentYear = new Date().getFullYear();
  const years = getYearOptions();

  const storedYear = localStorage.getItem('adminEventsYear');
  let selectedYear;

  if (storedYear) {
    selectedYear = storedYear;
  } else {
    try {
      const { data: nextEv } = await _supabase
        .from('events')
        .select('date')
        .eq('archived', false)
        .order('date', { ascending: true })
        .limit(1);
      selectedYear = nextEv && nextEv.length > 0
        ? String(new Date(nextEv[0].date).getFullYear())
        : String(currentYear);
    } catch (e) {
      selectedYear = String(currentYear);
    }
  }

  const { data: events } = await _supabase
    .from('events')
    .select('*')
    .gte('date', `${selectedYear}-01-01`)
    .lte('date', `${selectedYear}-12-31`)
    .eq('archived', false)
    .order('date', { ascending: false });

  // Fetch inscription counts for all events in one query
  const eventIds = (events || []).map(ev => ev.id);
  const inscriptionCounts = {};
  if (eventIds.length > 0) {
    const { data: countData } = await _supabase
      .from('inscriptions')
      .select('event_id')
      .in('event_id', eventIds);
    for (const insc of (countData || [])) {
      inscriptionCounts[insc.event_id] = (inscriptionCounts[insc.event_id] || 0) + 1;
    }
  }

  let html = '';
  if (canEditModule('events')) {
    html += '<button class="btn btn-primary" onclick="adminCreateEvent()">+ Nouvel événement</button>';
  }
  html += `<label style="margin-left:1em;">Année : <select id="year-events">
      ${years.map(y => `<option value="${y}" ${String(y) === selectedYear ? 'selected' : ''}>${y}</option>`).join('')}
    </select></label>
    <p style="margin:0.5em 0;font-weight:bold;">${events?.length || 0} événement(s) en ${selectedYear}</p>
    <div class="admin-events-table">
      <table>
        <thead>
          <tr><th>Titre</th><th>Date</th><th>Lieu</th><th>Max</th><th>Inscrits</th><th>Visible</th><th>Actions</th></tr>
        </thead>
        <tbody>`;

  const canEdit = canEditModule('events');
  for (const ev of (events || [])) {
    const count = inscriptionCounts[ev.id] || 0;
    html += `<tr>
      <td data-label="Titre">${escapeHtml(ev.titre)}</td>
      <td data-label="Date">${formatDateFr(ev.date)}</td>
      <td data-label="Lieu">${escapeHtml(ev.lieu)}</td>
      <td data-label="Max">${ev.max_participants}</td>
      <td data-label="Inscrits">${count}</td>
      <td data-label="Visible"><input type="checkbox" onclick="adminToggleVisible(${ev.id}, ${ev.visible})" ${ev.visible ? 'checked' : ''} ${canEdit ? '' : 'disabled'}></td>
      <td data-label="Actions">
        ${canEdit ? `<button class="btn-small" onclick="adminEditEvent(${ev.id})">✏️</button>
        <button class="btn-small btn-danger" onclick="adminDeleteEvent(${ev.id})">🗑️</button>` : '-'}
      </td>
    </tr>`;
  }

  html += '</tbody></table></div>';
  section.innerHTML = html;

  const yearSel = document.getElementById('year-events');
  if (yearSel) {
    yearSel.onchange = () => {
      localStorage.setItem('adminEventsYear', yearSel.value);
      loadAdminEvents();
    };
  }
}

function adminCreateEvent() {
  const form = document.getElementById('form-create-event');
  if (form) {
    form.reset();
    const today = new Date().toISOString().split('T')[0];
    const dateField = form.querySelector('[name="date"]');
    if (dateField) dateField.value = today;
  }
  modal.open('#modal-create-event');
}

async function adminEditEvent(id) {
  const { data, error } = await _supabase.from('events').select('*').eq('id', id).single();

  if (error || !data) {
    toast('Erreur chargement événement');
    return;
  }

  $('#edit-event-id').value = data.id;
  $('#edit-event-titre').value = data.titre || '';
  $('#edit-event-date').value = data.date || '';
  $('#edit-event-heure').value = data.heure || '';
  $('#edit-event-lieu').value = data.lieu || '';
  $('#edit-event-max').value = data.max_participants || 0;
  $('#edit-event-description').value = data.description || '';
  modal.open('#modal-edit-event');
}

async function adminDeleteEvent(id) {
  if (!confirm('Supprimer cet événement ?')) return;

  const { error } = await _supabase.from('events').delete().eq('id', id);

  if (error) {
    toast('Erreur suppression événement');
    return;
  }

  toast('Événement supprimé');
  loadAdminEvents();
}

async function adminToggleVisible(id, currentVisible) {
  const newVisible = !currentVisible;

  const { error } = await _supabase.from('events')
    .update({ visible: newVisible })
    .eq('id', id);

  if (error) {
    toast('Erreur mise à jour visibilité');
    return;
  }

  toast(`Visibilité ${newVisible ? 'activée' : 'désactivée'}`);
  loadAdminEvents();
}

// Setup event form handlers
function setupEventForms() {
  const editForm = $('#form-edit-event');
  if (editForm) {
    editForm.onsubmit = async function(e) {
      e.preventDefault();
      const id = $('#edit-event-id').value;
      const titre = $('#edit-event-titre').value.trim();
      const date = $('#edit-event-date').value;
      const heure = $('#edit-event-heure').value;
      const lieu = $('#edit-event-lieu').value.trim();
      const max = Number($('#edit-event-max').value);
      const desc = $('#edit-event-description').value.trim();

      if (!titre || !date || !lieu || max < 1) {
        toast('Veuillez remplir tous les champs obligatoires');
        return;
      }

      const { error } = await _supabase.from('events')
        .update({ titre, date, heure, lieu, max_participants: max, description: desc })
        .eq('id', id);

      if (error) {
        toast('Erreur : ' + (error.message || 'Modification impossible'));
        return;
      }

      toast('Événement modifié');
      modal.closeAll();
      loadAdminEvents();
    };
  }

  const createForm = document.getElementById('form-create-event');
  if (createForm) {
    createForm.onsubmit = async function(e) {
      e.preventDefault();
      const fd = new FormData(e.target);
      const titre = fd.get('titre')?.trim();
      const date = fd.get('date')?.trim();
      const heure = fd.get('heure')?.trim() || null;
      const lieu = fd.get('lieu')?.trim();
      const max_participants = Number(fd.get('max_participants'));
      const description = fd.get('description')?.trim() || '';
      const visible = !!fd.get('visible');
      const type = (fd.get('type')?.trim()) || 'standard';

      if (!titre || !date || !lieu || max_participants < 1) {
        toast('Veuillez remplir tous les champs obligatoires');
        return;
      }

      toast('Création de l\'événement en cours...');
      const { error } = await _supabase.from('events').insert({
        titre, date, heure, lieu, max_participants, description, visible, archived: false, type
      });

      if (error) {
        console.error(error);
        toast('Erreur : ' + (error.message || 'Création impossible'));
        return;
      }
      toast('Événement créé avec succès');
      modal.closeAll();
      e.target.reset();
      loadAdminEvents();
    };
  }
}

// -----------------------------------------------------------------------------
// INSCRIPTIONS
// -----------------------------------------------------------------------------

async function loadAdminInscriptions() {
  const section = $('#module-inscriptions');
  if (!section) return;
  section.innerHTML = '<p>Chargement des inscriptions...</p>';

  const currentYear = new Date().getFullYear();
  const years = getYearOptions();

  const storedYear = localStorage.getItem('adminInscYear');
  const selectedYear = storedYear || String(currentYear);

  const { data: events } = await _supabase.from('events')
    .select('id, titre, date')
    .gte('date', `${selectedYear}-01-01`)
    .lte('date', `${selectedYear}-12-31`)
    .eq('archived', false)
    .order('date', { ascending: false });

  let html = `<label>Année : <select id="year-inscriptions">
      ${years.map(y => `<option value="${y}" ${String(y) === selectedYear ? 'selected' : ''}>${y}</option>`).join('')}
    </select></label>
    <select id="event-filter" onchange="filterInscriptions()" style="margin-left:1em;">
    <option value="">-- Tous les événements --</option>`;

  (events || []).forEach(e => {
    const label = escapeHtml(e.titre) + (e.date ? ` — ${formatDateFr(e.date)}` : '');
    html += `<option value="${e.id}">${label}</option>`;
  });
  html += `</select><div id="inscriptions-list"></div>`;

  section.innerHTML = html;

  const yearInsc = $('#year-inscriptions');
  if (yearInsc) {
    yearInsc.onchange = () => {
      localStorage.setItem('adminInscYear', yearInsc.value);
      loadAdminInscriptions();
    };
  }
  await filterInscriptions();
}

async function filterInscriptions() {
  const eventId = $('#event-filter')?.value;
  const list = $('#inscriptions-list');
  if (!list) return;

  // Get selected year
  const selectedYear = $('#year-inscriptions')?.value || localStorage.getItem('adminInscYear') || String(new Date().getFullYear());

  let selectedEventData = null;
  let query = _supabase.from('inscriptions')
    .select('*, events!inner(id, date, archived)')
    .eq('events.archived', false)
    .gte('events.date', `${selectedYear}-01-01`)
    .lte('events.date', `${selectedYear}-12-31`)
    .order('date_inscription', { ascending: false });

  if (eventId) {
    query = query.eq('event_id', eventId);
    const { data: event } = await _supabase.from('events').select('*').eq('id', eventId).single();
    selectedEventData = event;
  }

  const { data } = await query;
  let inscs = data || [];

  // Apply sorting
  if (inscSortField && inscs.length > 0) {
    inscs.sort((a, b) => {
      let valA, valB;

      if (inscSortField === 'participation') {
        // Sort by number of participation types selected
        valA = (a.preparation_salle ? 1 : 0) + (a.partie_evenement ? 1 : 0) + (a.evenement_entier ? 1 : 0);
        valB = (b.preparation_salle ? 1 : 0) + (b.partie_evenement ? 1 : 0) + (b.evenement_entier ? 1 : 0);
      } else {
        valA = a[inscSortField] || '';
        valB = b[inscSortField] || '';
        // Case-insensitive for strings
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
      }

      if (valA === valB) return 0;
      return inscSortAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }

  let countPrep = 0, countEntier = 0, countPartie = 0;
  inscs.forEach(i => {
    if (i.preparation_salle) countPrep++;
    if (i.evenement_entier) countEntier++;
    if (i.partie_evenement) countPartie++;
  });

  let html = '';
  if (selectedEventData) {
    html += `
      <div class="event-detail-admin">
        <div class="event-detail-title">${selectedEventData.image || '📅'} <strong>${escapeHtml(selectedEventData.titre)}</strong></div>
        <div class="event-detail-meta">
          ${formatDateFr(selectedEventData.date) || ''}
          ${selectedEventData.heure ? '• ' + escapeHtml(selectedEventData.heure) : ''}
          ${selectedEventData.lieu ? '• ' + escapeHtml(selectedEventData.lieu) : ''}
        </div>
        <div class="event-detail-desc">${escapeHtml(selectedEventData.description || '')}</div>
        <div class="event-detail-totals">
          <b>Préparation:</b> ${countPrep} | <b>Soirée entière:</b> ${countEntier} | <b>Partie de la soirée:</b> ${countPartie}
        </div>
      </div>`;
  }

  html += `
    <p style="margin:0.5em 0;font-weight:bold;">${inscs.length} inscription(s) · ${new Set(inscs.map(i => i.email)).size} participant(s)</p>
    <table class="insc-table-admin">
      <thead>
        <tr>
          <th data-sort="heure_arrivee">ARRIVÉE</th>
          <th data-sort="heure_depart">DÉPART</th>
          <th data-sort="prenom">PRÉNOM</th>
          <th data-sort="nom">NOM</th>
          <th data-sort="participation">PARTICIPATIONS</th>
          <th data-sort="commentaire">COMMENTAIRE</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>`;

  const canEditInsc = canEditModule('inscriptions');
  inscs.forEach((i) => {
    const parts = [];
    if (i.preparation_salle) parts.push('Prépa');
    if (i.partie_evenement) parts.push('Partie');
    if (i.evenement_entier) parts.push('Entier');

    html += `<tr>
      <td data-label="Arrivée">${escapeHtml(i.heure_arrivee || '-')}</td>
      <td data-label="Départ">${escapeHtml(i.heure_depart || '-')}</td>
      <td data-label="Prénom">${escapeHtml(i.prenom)}</td>
      <td data-label="Nom">${escapeHtml(i.nom)}</td>
      <td data-label="Participations">${parts.join(', ')}</td>
      <td data-label="Commentaire">${escapeHtml(i.commentaire || '-')}</td>
      <td data-label="Actions">
        ${canEditInsc ? `<button class="btn-small" onclick="adminEditInscription(${i.id})" title="Modifier">✏️</button>
        <button class="btn-small btn-danger" onclick="adminDeleteInscription(${i.id})" title="Supprimer">🗑️</button>` : '-'}
      </td>
    </tr>`;
  });

  html += '</tbody></table>';
  list.innerHTML = html;

  // Attach sorting handlers
  list.querySelectorAll('th[data-sort]').forEach(th => {
    th.style.cursor = 'pointer';
    th.onclick = function() {
      const field = th.getAttribute('data-sort');
      if (inscSortField === field) {
        inscSortAsc = !inscSortAsc;
      } else {
        inscSortField = field;
        inscSortAsc = true;
      }
      filterInscriptions();
    };
  });
}

async function adminDeleteInscription(id) {
  if (!confirm('Confirmer la suppression de cette inscription ?')) return;

  const { error } = await _supabase.from('inscriptions').delete().eq('id', id);

  if (error) {
    toast('Erreur lors de la suppression');
    return;
  }

  toast('Inscription supprimée');
  filterInscriptions();
  loadAdminVolunteers();
}

async function adminEditInscription(id) {
  const { data: insc, error } = await _supabase.from('inscriptions').select('*').eq('id', id).single();

  if (error || !insc) {
    toast('Inscription introuvable');
    return;
  }

  $('#edit-insc-id').value = insc.id;
  $('#edit-insc-prenom').value = insc.prenom || '';
  $('#edit-insc-nom').value = insc.nom || '';
  $('#edit-insc-email').value = insc.email || '';
  $('#edit-insc-telephone').value = insc.telephone || '';
  $('#edit-insc-arrivee').value = insc.heure_arrivee || '';
  $('#edit-insc-depart').value = insc.heure_depart || '';
  $('#edit-insc-commentaire').value = insc.commentaire || '';
  $('#edit-insc-prepa').checked = !!insc.preparation_salle;
  $('#edit-insc-partie').checked = !!insc.partie_evenement;
  $('#edit-insc-entier').checked = !!insc.evenement_entier;
  modal.open('#modal-edit-inscription');
}

function setupEditInscriptionForm() {
  const form = $('#edit-insc-form');
  if (!form) return;

  form.onsubmit = async function(e) {
    e.preventDefault();
    const id = $('#edit-insc-id').value;
    const prenom = $('#edit-insc-prenom').value.trim();
    const nom = $('#edit-insc-nom').value.trim();
    const email = $('#edit-insc-email').value.trim();
    const telephone = $('#edit-insc-telephone').value.trim();
    const heure_arrivee = $('#edit-insc-arrivee').value || null;
    const heure_depart = $('#edit-insc-depart').value || null;
    const commentaire = $('#edit-insc-commentaire').value.trim() || '';
    const preparation_salle = $('#edit-insc-prepa').checked;
    const partie_evenement = $('#edit-insc-partie').checked;
    const evenement_entier = $('#edit-insc-entier').checked;

    // Validate with specific error messages
    const errors = [];
    if (!prenom) errors.push('Prénom requis');
    if (!nom) errors.push('Nom requis');
    if (!email) {
      errors.push('Email requis');
    } else if (!validateEmail(email)) {
      errors.push('Email invalide');
    }
    if (!telephone) {
      errors.push('Téléphone requis');
    } else if (!validatePhone(telephone)) {
      errors.push('Téléphone invalide');
    }
    if (!preparation_salle && !partie_evenement && !evenement_entier) {
      errors.push('Sélectionnez au moins un type de participation');
    }

    if (errors.length > 0) {
      toast(errors[0]);
      return;
    }

    const { error } = await _supabase.from('inscriptions').update({
      prenom, nom, email, telephone, heure_arrivee, heure_depart, commentaire,
      preparation_salle, partie_evenement, evenement_entier
    }).eq('id', id);

    if (error) {
      toast('Erreur lors de la mise à jour');
      return;
    }

    toast('Inscription modifiée');
    modal.closeAll();
    filterInscriptions();
    loadAdminVolunteers();
  };
}

// -----------------------------------------------------------------------------
// VOLUNTEERS
// -----------------------------------------------------------------------------

async function loadAdminVolunteers() {
  const section = $('#module-volunteers');
  if (!section) return;
  section.innerHTML = '<p>Chargement des bénévoles...</p>';

  const years = getYearOptions();
  const currentYear = new Date().getFullYear();
  const storedYear = localStorage.getItem('adminVolunteersYear');
  const selectedYear = storedYear || String(currentYear);

  section.innerHTML = `<label>Filtrer par année:
    <select id="year-volunteers">${years.map(y =>
      `<option value="${y}" ${String(y) === selectedYear ? 'selected' : ''}>${y}</option>`).join('')}</select>
    <input id="search-volunteers" type="text" placeholder="Recherche prénom, nom, email..." style="padding:0.45em 1em;border-radius:8px;border:1.5px solid #ddd;margin-left:1em;width:260px;">
  </label><div id="volunteers-list"></div>`;

  async function renderList() {
    const year = $('#year-volunteers').value;
    const search = $('#search-volunteers').value.trim().toLowerCase();

    // Fetch events for selected year
    const { data: events } = await _supabase.from('events')
      .select('id')
      .gte('date', year + '-01-01')
      .lte('date', year + '-12-31')
      .eq('archived', false);

    const eventIds = (events || []).map(e => e.id);
    const totalEvents = eventIds.length;

    // Fetch inscriptions only for those events using join
    let inscs = [];
    if (eventIds.length > 0) {
      const { data } = await _supabase.from('inscriptions')
        .select('*')
        .in('event_id', eventIds);
      inscs = data || [];
    }

    // Aggregate by email
    const volunteers = {};
    inscs.forEach(i => {
      const key = (i.email || '').toLowerCase();
      if (!key) return;
      if (!volunteers[key]) {
        volunteers[key] = {
          prenom: i.prenom, nom: i.nom, email: i.email,
          prepa: 0, entier: 0, partie: 0, nb_events_present: new Set(), participations: 0
        };
      }
      if (i.preparation_salle) volunteers[key].prepa++;
      if (i.evenement_entier) volunteers[key].entier++;
      if (i.partie_evenement) volunteers[key].partie++;
      volunteers[key].participations++;
      volunteers[key].nb_events_present.add(i.event_id);
    });

    let array = Object.values(volunteers);
    if (search) {
      array = array.filter(v =>
        (v.prenom || '').toLowerCase().includes(search) ||
        (v.nom || '').toLowerCase().includes(search) ||
        (v.email || '').toLowerCase().includes(search)
      );
    }

    array.sort((a, b) => (a.prenom || '').localeCompare(b.prenom || '', 'fr'));

    let html = `<p style="margin:0.5em 0;font-weight:bold;">${array.length} bénévoles · ${totalEvents} événement(s)</p>
      <table class="volunteers-table-admin">
        <thead>
          <tr>
            <th>Prénom</th><th>Nom</th><th>Email</th><th>Prépa</th><th>Entier</th><th>Partie</th><th>Présence (%)</th><th>Participations</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>`;

    const canEditVol = canEditModule('volunteers');
    array.forEach(v => {
      const pct = totalEvents ? Math.round(v.nb_events_present.size / totalEvents * 100) : 0;
      html += `<tr>
        <td>${escapeHtml(v.prenom)}</td><td>${escapeHtml(v.nom)}</td><td>${escapeHtml(v.email)}</td>
        <td>${v.prepa}</td><td>${v.entier}</td><td>${v.partie}</td><td>${pct}</td><td>${v.participations}</td>
        <td>${canEditVol ? `<button class="btn-small btn-danger" onclick="adminDeleteVolunteer(this.dataset.email)" data-email="${escapeHtml(v.email)}">🗑️</button>` : '-'}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    $('#volunteers-list').innerHTML = html;
  }

  $('#year-volunteers').onchange = () => {
    localStorage.setItem('adminVolunteersYear', $('#year-volunteers').value);
    renderList();
  };
  $('#search-volunteers').oninput = renderList;
  renderList();
}

async function adminDeleteVolunteer(email) {
  if (!email) return;
  if (!confirm('Confirmer la suppression de ce bénévole et de toutes ses inscriptions ?')) return;

  const { error } = await _supabase.from('inscriptions').delete().eq('email', email);

  if (error) {
    toast('Erreur lors de la suppression du bénévole');
    return;
  }

  toast('Bénévole supprimé');
  loadAdminVolunteers();
  loadAdminInscriptions();
}

// -----------------------------------------------------------------------------
// MESSAGES
// -----------------------------------------------------------------------------

async function loadAdminMessages() {
  const section = $('#module-messages');
  if (!section) return;
  section.innerHTML = '<p>Chargement des messages...</p>';

  const { data: messages, error } = await _supabase.from('contact_messages').select('*').order('date', { ascending: false });

  if (error) {
    section.innerHTML = '<p>Erreur de chargement des messages</p>';
    return;
  }

  section.innerHTML = `<div class="message-filter" style="margin-bottom:0.8em;">
    <input type="text" id="search-messages" placeholder="Recherche nom, prénom, email ou message..." style="padding:0.5em 1em;border-radius:8px;border:1.5px solid #ddd;width:260px;">
  </div>
  <div id="messages-list"></div>`;

  const allMessages = messages || [];

  function renderMessages() {
    const search = ($('#search-messages')?.value || '').toLowerCase();
    const filtered = allMessages.filter(m => {
      const fields = [m.nom || '', m.prenom || '', m.email || '', m.message || ''];
      return fields.some(f => f.toLowerCase().includes(search));
    });

    const canEditMsg = canEditModule('messages');
    let html = '<table class="table-admin messages-table-admin"><thead><tr>' +
      '<th>Date</th><th>Nom</th><th>Email</th><th>Message</th><th>Lu</th><th>Actions</th></tr></thead><tbody>';

    filtered.forEach(msg => {
      const date = msg.date ? new Date(msg.date).toLocaleString('fr-FR') : '-';
      html += `<tr>
        <td>${date}</td>
        <td>${escapeHtml((msg.prenom || '') + ' ' + (msg.nom || ''))}</td>
        <td>${escapeHtml(msg.email || '')}</td>
        <td>${escapeHtml(msg.message || '')}</td>
        <td>${msg.lu ? '✅' : '❌'}</td>
        <td>
          ${canEditMsg ? `<button class="btn-small" onclick="adminToggleMessageRead(${msg.id}, ${msg.lu})">${msg.lu ? 'Marquer non lu' : 'Marquer lu'}</button>
          <button class="btn-small btn-danger" onclick="adminDeleteMessage(${msg.id})">🗑️</button>` : '-'}
        </td>
      </tr>`;
    });
    html += '</tbody></table>';
    $('#messages-list').innerHTML = html;
  }

  $('#search-messages').addEventListener('input', renderMessages);
  renderMessages();
}

async function adminToggleMessageRead(id, currentLu) {
  const newLu = !currentLu;

  const { error } = await _supabase.from('contact_messages').update({ lu: newLu }).eq('id', id);

  if (error) {
    toast('Erreur mise à jour message');
    return;
  }

  toast(`Message ${newLu ? 'marqué comme lu' : 'marqué comme non lu'}`);
  loadAdminMessages();
}

async function adminDeleteMessage(id) {
  if (!confirm('Supprimer ce message ?')) return;

  const { error } = await _supabase.from('contact_messages').delete().eq('id', id);

  if (error) {
    toast('Erreur suppression message');
    return;
  }

  toast('Message supprimé');
  loadAdminMessages();
}

// -----------------------------------------------------------------------------
// ADMIN USERS
// -----------------------------------------------------------------------------

// Role labels for display
const roleLabels = {
  viewer: 'Lecteur',
  editor: 'Éditeur',
  super_admin: 'Super Admin'
};

async function loadAdminUsers() {
  // Only super_admin can access the admins tab
  if (adminUser?.role !== 'super_admin') {
    $('#module-admins').innerHTML = '<p>Accès refusé</p>';
    return;
  }

  const section = $('#module-admins');
  if (!section) return;
  section.innerHTML = '<p>Chargement des administrateurs...</p>';

  const { data: admins } = await _supabase.from('admins').select('*').order('created_at');

  let html = '<button class="btn btn-primary" onclick="adminCreateUser()">+ Nouvel Admin</button>';

  html += `<table><thead><tr>
    <th>Nom</th><th>Email</th><th>Rôle</th><th>Actif</th><th>Dernière Visite</th><th>Actions</th>
  </tr></thead><tbody>`;

  (admins || []).forEach(a => {
    const roleLabel = roleLabels[a.role] || a.role;
    html += `<tr>
      <td>${escapeHtml(a.prenom)} ${escapeHtml(a.nom)}</td>
      <td>${escapeHtml(a.email)}</td>
      <td>${roleLabel}</td>
      <td>${a.is_active ? '✅' : '❌'}</td>
      <td>${a.last_login ? new Date(a.last_login).toLocaleDateString('fr-FR') : '-'}</td>
      <td>
        <button class="btn-small" onclick="adminEditUser('${a.id}')">✏️</button>
        <button class="btn-small btn-danger" onclick="adminDeleteUser('${a.id}')">🗑️</button>
      </td>
    </tr>`;
  });

  html += '</tbody></table>';
  section.innerHTML = html;
}

function adminCreateUser() {
  if (adminUser?.role !== 'super_admin') {
    toast('Accès refusé');
    return;
  }
  const form = document.getElementById('form-admin-user');
  if (form) form.reset();
  document.getElementById('admin-user-id').value = '';
  document.getElementById('admin-user-mod-title').textContent = 'Nouvel Admin';
  updateRoleDescription('');
  modal.open('#modal-admin-user');
}

async function adminEditUser(id) {
  if (adminUser?.role !== 'super_admin') {
    toast('Accès refusé');
    return;
  }

  if (adminUser?.id == id) {
    toast('Vous ne pouvez pas modifier votre propre compte');
    return;
  }

  const { data: admin } = await _supabase.from('admins').select('*').eq('id', id).single();
  if (!admin) return toast('Admin introuvable');

  openEditAdmin(admin);
}

async function adminDeleteUser(id) {
  if (adminUser?.role !== 'super_admin') {
    toast('Accès refusé');
    return;
  }
  if (adminUser?.id == id) {
    toast('Vous ne pouvez pas supprimer votre propre compte');
    return;
  }
  if (!confirm('Confirmer la suppression de cet administrateur ?')) return;

  try {
    const token = await getSupabaseAccessToken();
    if (!token) {
      toast('Session expirée, veuillez vous reconnecter');
      return;
    }

    const response = await fetch('/api/admin-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'delete',
        data: { id }
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Erreur lors de la suppression');
    }

    toast(result.message || 'Admin supprimé');
    loadAdminUsers();
  } catch (error) {
    console.error('Delete admin error:', error);
    toast('Erreur : ' + error.message);
  }
}

function openEditAdmin(adminData) {
  document.getElementById('admin-user-id').value = adminData?.id || '';
  document.getElementById('admin-user-prenom').value = adminData?.prenom || '';
  document.getElementById('admin-user-nom').value = adminData?.nom || '';
  document.getElementById('admin-user-email').value = adminData?.email || '';
  document.getElementById('admin-user-role').value = adminData?.role || '';

  document.getElementById('admin-user-mod-title').textContent = adminData?.id ? 'Modifier Admin' : 'Nouvel Admin';

  updateRoleDescription(adminData?.role || '');
  modal.open('#modal-admin-user');
}

// Role descriptions for the admin form
const roleDescriptions = {
  viewer: `<strong>Lecteur</strong> - Accès en lecture seule
    <ul style="margin:0.5em 0 0 1.2em;padding:0;">
      <li>Consulter le dashboard, événements, inscriptions, bénévoles, messages</li>
      <li>Aucune modification possible</li>
    </ul>`,
  editor: `<strong>Éditeur</strong> - Accès en lecture et écriture
    <ul style="margin:0.5em 0 0 1.2em;padding:0;">
      <li>Tout ce que le Lecteur peut faire</li>
      <li>Créer, modifier, supprimer : événements, inscriptions, bénévoles</li>
      <li>Gérer les messages (marquer lu, supprimer)</li>
    </ul>`,
  super_admin: `<strong>Super Admin</strong> - Accès complet
    <ul style="margin:0.5em 0 0 1.2em;padding:0;">
      <li>Tout ce que l'Éditeur peut faire</li>
      <li>Gérer les administrateurs (créer, modifier, supprimer)</li>
      <li>Modifier la configuration de l'association</li>
    </ul>`
};

function updateRoleDescription(role) {
  const desc = document.getElementById('role-description');
  if (!desc) return;

  if (role && roleDescriptions[role]) {
    desc.innerHTML = roleDescriptions[role];
  } else {
    desc.innerHTML = '<p style="margin:0;color:#666;">Sélectionnez un rôle pour voir ses permissions.</p>';
  }
}

function setupAdminUserForm() {
  const form = document.getElementById('form-admin-user');
  if (!form) return;

  // Update role description when role changes
  const roleSelect = document.getElementById('admin-user-role');
  if (roleSelect) {
    roleSelect.addEventListener('change', (e) => {
      updateRoleDescription(e.target.value);
    });
  }

  form.onsubmit = async function(e) {
    e.preventDefault();
    e.stopImmediatePropagation();

    const id = document.getElementById('admin-user-id').value.trim();
    const prenom = document.getElementById('admin-user-prenom').value.trim();
    const nom = document.getElementById('admin-user-nom').value.trim();
    const email = document.getElementById('admin-user-email').value.trim();
    const role = document.getElementById('admin-user-role').value;

    if (!role || !['viewer', 'editor', 'super_admin'].includes(role)) {
      toast('Veuillez sélectionner un rôle valide');
      return;
    }

    try {
      if (!id) {
        // Create new admin via backend API (uses invite flow)
        const token = await getSupabaseAccessToken();
        if (!token) {
          toast('Session expirée, veuillez vous reconnecter');
          return;
        }

        const response = await fetch('/api/admin-users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'invite',
            data: { email, prenom, nom, role }
          })
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Erreur lors de la création');
        }

        toast(result.message || 'Admin créé - un email d\'invitation a été envoyé');
      } else {
        const { error: updateError } = await _supabase
          .from('admins')
          .update({ prenom, nom, email, role })
          .eq('id', id);

        if (updateError) throw updateError;
        toast('Admin modifié avec succès');
      }

      modal.closeAll();
      loadAdminUsers();
    } catch (error) {
      console.error(error);
      toast('Erreur : ' + error.message);
    }
  };
}

// -----------------------------------------------------------------------------
// ASSOCIATION CONFIG
// -----------------------------------------------------------------------------

async function loadAdminAssociation() {
  const section = $('#module-association');
  if (!section) return;

  // Only super_admin can access the association config
  if (adminUser?.role !== 'super_admin') {
    section.innerHTML = '<p>Accès refusé</p>';
    return;
  }

  // Fetch all config key-value pairs
  const { data: rows, error } = await _supabase.from('app_config').select('key, value');

  if (error) {
    section.innerHTML = '<p>Erreur de chargement de la configuration</p>';
    return;
  }

  const config = {};
  for (const row of (rows || [])) {
    config[row.key] = row.value;
  }

  const logoDisplay = config.logo_url
    ? `<img src="${escapeHtml(config.logo_url)}" alt="Logo" style="max-width:150px;height:auto;border-radius:8px;margin-bottom:1em;">`
    : '';

  section.innerHTML = `
    <div class="config-panel">
      <div class="config-section">
        <h3>Configuration de l'association</h3>

        <div class="config-group">
          <label class="config-label">
            <span class="label-title">Logo de l'association</span>
            <span class="label-desc">Upload une image (PNG, JPG, max 2MB)</span>
            <input type="file" id="logo-upload" accept="image/png,image/jpeg" style="margin-top:0.5em;padding:0.5em;border:1px solid #ddd;border-radius:6px;width:100%;">
            <div id="logo-preview" style="margin-top:1em;"></div>
          </label>
        </div>

        <div class="config-group">
          <label class="config-label">
            <span class="label-title">Nom de l'association*</span>
            <input id="name-input" type="text" value="${escapeHtml(config.association_name || "Ohlun'Joie")}" required style="width:100%;padding:0.7em;border:1.5px solid #ddd;border-radius:6px;margin-top:0.5em;">
          </label>
        </div>

        <div class="config-group">
          <label class="config-label">
            <span class="label-title">Texte d'introduction</span>
            <textarea id="intro-input" rows="3" style="width:100%;padding:0.7em;border:1.5px solid #ddd;border-radius:6px;margin-top:0.5em;">${escapeHtml(config.intro_text || '')}</textarea>
          </label>
        </div>

        <div class="config-group">
          <label class="config-label">
            <span class="label-title">Description pour les bénévoles</span>
            <textarea id="desc-input" rows="3" style="width:100%;padding:0.7em;border:1.5px solid #ddd;border-radius:6px;margin-top:0.5em;">${escapeHtml(config.association_description || '')}</textarea>
          </label>
        </div>

        <div class="config-actions">
          <button class="btn btn-primary btn-large" onclick="saveAssociationConfig()">Enregistrer les modifications</button>
        </div>
      </div>

      <div class="config-section info-section">
        <h3>Aperçu Public</h3>
        <div class="preview-box">
          <div id="preview-logo" style="text-align:center;margin-bottom:1em;min-height:100px;display:flex;align-items:center;justify-content:center;">
            ${logoDisplay ? logoDisplay : '<span style="font-size:3em;">🤝</span>'}
          </div>
          <div id="preview-name" style="font-size:1.3em;font-weight:bold;text-align:center;margin-bottom:0.5em;">${escapeHtml(config.association_name || "Ohlun'Joie")}</div>
          <div id="preview-intro" style="font-size:0.95em;color:#555;text-align:center;">${escapeHtml(config.intro_text || '')}</div>
        </div>
      </div>
    </div>
  `;

  const logoUpload = $('#logo-upload');
  if (logoUpload) {
    logoUpload.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        toast('Image trop grande (max 2MB)');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        const previewDiv = $('#logo-preview');
        if (previewDiv) {
          previewDiv.innerHTML = `<div style="border:2px dashed #0d7377;border-radius:8px;padding:1em;text-align:center;">
            <img src="${base64}" alt="Preview" style="max-width:100%;max-height:150px;border-radius:6px;">
            <p style="margin-top:0.5em;color:#666;font-size:0.9em;">Image sélectionnée</p>
          </div>`;
        }

        const previewLogo = $('#preview-logo');
        if (previewLogo) {
          previewLogo.innerHTML = `<img src="${base64}" alt="Logo Preview" style="max-width:150px;height:auto;border-radius:8px;">`;
        }

        logoUpload.dataset.imageBase64 = base64;
        toast('Image prête');
      };
      reader.readAsDataURL(file);
    });
  }

  // Live preview for name and intro text
  const nameInput = $('#name-input');
  const introInput = $('#intro-input');

  if (nameInput) {
    nameInput.addEventListener('input', () => {
      const previewName = $('#preview-name');
      if (previewName) {
        previewName.textContent = nameInput.value || "Ohlun'Joie";
      }
    });
  }

  if (introInput) {
    introInput.addEventListener('input', () => {
      const previewIntro = $('#preview-intro');
      if (previewIntro) {
        previewIntro.textContent = introInput.value || '';
      }
    });
  }
}

async function saveAssociationConfig() {
  const nameInput = $('#name-input');
  const introInput = $('#intro-input');
  const descInput = $('#desc-input');
  const logoUpload = $('#logo-upload');

  if (!nameInput || !introInput || !descInput) {
    toast('Formulaire non trouvé');
    return;
  }

  const name = nameInput.value?.trim();
  const intro = introInput.value?.trim();
  const desc = descInput.value?.trim();
  const logoBase64 = logoUpload?.dataset.imageBase64 || null;

  if (!name) {
    toast('Le nom est requis');
    return;
  }

  // Build key-value pairs to upsert
  const updates = [
    { key: 'association_name', value: name },
    { key: 'intro_text', value: intro },
    { key: 'association_description', value: desc }
  ];
  if (logoBase64) {
    updates.push({ key: 'logo_url', value: logoBase64 });
  }

  // Upsert all config values in one query
  const { error } = await _supabase.from('app_config').upsert(updates, { onConflict: 'key' });

  if (error) {
    toast('Erreur: ' + error.message);
    return;
  }

  toast('Configuration enregistrée !');
  await loadSiteConfig();
  loadAdminAssociation();
}