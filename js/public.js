// =============================================================================
// PUBLIC.JS - Public Site Rendering & Forms
// =============================================================================

// Current event for inscription (used to send confirmation email)
let _currentInscriptionEvent = null;

// Fetch visible, non-archived events
async function fetchPublicEvents() {
  const { data, error } = await _supabase
    .from('events')
    .select('*')
    .eq('visible', true)
    .eq('archived', false)
    .order('date', { ascending: true });
  if (error) {
    console.error('fetchPublicEvents error:', error);
    return [];
  }
  return data || [];
}

// Fetch inscriptions for a specific event (kept for backward compatibility)
async function fetchInscriptionsForEvent(eventId) {
  const { data, error } = await _supabase
    .from('inscriptions')
    .select('prenom, nom')
    .eq('event_id', eventId)
    .order('date_inscription', { ascending: false });
  if (error) {
    console.error('fetchInscriptionsForEvent error:', error);
    return [];
  }
  return data || [];
}

// Fetch all inscriptions for multiple events in one query
async function fetchInscriptionsForEvents(eventIds) {
  if (!eventIds.length) return {};

  const { data, error } = await _supabase
    .from('inscriptions')
    .select('event_id, prenom, nom')
    .in('event_id', eventIds)
    .order('date_inscription', { ascending: false });

  if (error) {
    console.error('fetchInscriptionsForEvents error:', error);
    return {};
  }

  // Group by event_id
  const byEvent = {};
  for (const insc of (data || [])) {
    if (!byEvent[insc.event_id]) byEvent[insc.event_id] = [];
    byEvent[insc.event_id].push(insc);
  }
  return byEvent;
}

// Open inscription modal for an event
function openInscription(ev) {
  _currentInscriptionEvent = ev;
  $('#insc-event-title').textContent = `${ev.image || '📅'} ${ev.titre}`;
  $('#insc-event-meta').textContent = `${formatDateFr(ev.date)}${ev.heure ? ' • ' + ev.heure : ''}${ev.lieu ? ' • ' + ev.lieu : ''}`;
  $('#insc-event-id').value = ev.id;
  modal.open('#modal-inscription');
}

// Bind subscribe button to event
function bindSubscribe(btn, ev) {
  if (!btn) return;
  btn.textContent = "S'inscrire";
  btn.classList.add('btn', 'btn-primary');
  btn.onclick = () => openInscription(ev);
}

// Render timeline view
function renderTimeline(events, inscriptionsByEvent) {
  const root = $('#timeline-view');
  if (!root) return;
  root.innerHTML = '';

  events.forEach((ev) => {
    const inscriptions = inscriptionsByEvent[ev.id] || [];
    const count = inscriptions.length;
    const pct = Math.min(100, Math.round((count / Math.max(1, ev.max_participants)) * 100));

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-header">
        <div>
          <div class="card-title">${ev.image || '📅'} ${escapeHtml(ev.titre)}</div>
          <div class="muted">${formatDateFr(ev.date)}${ev.heure ? ' • ' + escapeHtml(ev.heure) : ''}${ev.lieu ? ' • ' + escapeHtml(ev.lieu) : ''}</div>
        </div>
        <div class="card-actions"><button class="subscribe-btn"></button></div>
      </div>
      <p>${escapeHtml(ev.description || '')}</p>
      <div class="progress"><span style="width:${pct}%"></span></div>
      <div class="inscrit-count">${count}/${ev.max_participants} inscrits</div>
      ${inscriptions.length > 0 ? `<div class="inscrit-list"><strong>Inscrits:</strong> ${inscriptions.map(i => escapeHtml(i.prenom) + ' ' + escapeHtml(i.nom)).join(', ')}</div>` : ''}`;
    bindSubscribe(card.querySelector('.subscribe-btn'), ev);
    root.appendChild(card);
  });
}

// Render list view
function renderList(events, inscriptionsByEvent) {
  const root = $('#list-view');
  if (!root) return;
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

  events.forEach((ev) => {
    const inscriptions = inscriptionsByEvent[ev.id] || [];
    const count = inscriptions.length;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDateFr(ev.date)}${ev.heure ? ' ' + escapeHtml(ev.heure) : ''}</td>
      <td>${escapeHtml(ev.titre)}</td>
      <td>${escapeHtml(ev.lieu)}</td>
      <td>${count}/${ev.max_participants || ''}</td>
      <td><button class="subscribe-btn"></button></td>`;
    table.querySelector('tbody').appendChild(tr);
    bindSubscribe(tr.querySelector('.subscribe-btn'), ev);
  });

  tableWrap.appendChild(table);
  root.appendChild(tableWrap);
}

// Render cards view
function renderCards(events, inscriptionsByEvent) {
  const root = $('#cards-view');
  if (!root) return;
  root.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'cards-grid';

  events.forEach((ev) => {
    const inscriptions = inscriptionsByEvent[ev.id] || [];
    const count = inscriptions.length;
    const pct = Math.min(100, Math.round((count / Math.max(1, ev.max_participants)) * 100));

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-header">
        <div>
          <div class="card-title">${ev.image || '📅'} ${escapeHtml(ev.titre)}</div>
          <div class="muted">${formatDateFr(ev.date)}${ev.heure ? ' • ' + escapeHtml(ev.heure) : ''}${ev.lieu ? ' • ' + escapeHtml(ev.lieu) : ''}</div>
        </div>
        <div class="card-actions"><button class="subscribe-btn"></button></div>
      </div>
      <p>${escapeHtml(ev.description || '')}</p>
      <div class="progress"><span style="width:${pct}%"></span></div>
      <div class="inscrit-count">${count}/${ev.max_participants} inscrits</div>`;
    bindSubscribe(card.querySelector('.subscribe-btn'), ev);
    grid.appendChild(card);
  });

  root.appendChild(grid);
}

// Update next event badge
function updateNextEvent(events) {
  const badge = $('#next-event-badge');
  if (!badge) return;

  if (!events.length) {
    badge.textContent = '';
    return;
  }

  const today = new Date();
  const upcoming = events.find(ev => {
    const d = new Date(ev.date + 'T00:00');
    return d >= new Date(today.toDateString());
  });

  if (!upcoming) {
    badge.textContent = 'Aucun événement à venir';
    return;
  }

  const eventDate = new Date(upcoming.date + 'T' + (upcoming.heure || '00:00'));
  const diffDaysRaw = (eventDate - today) / 86400000;
  const diffDays = Math.max(0, Math.ceil(diffDaysRaw));

  if (diffDays === 0) {
    badge.textContent = "Prochain événement : aujourd'hui";
  } else {
    badge.textContent = `Prochain événement dans ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  }
}

// Load and render all public views
async function loadPublic() {
  const events = await fetchPublicEvents();
  const eventIds = events.map(ev => ev.id);
  const inscriptionsByEvent = await fetchInscriptionsForEvents(eventIds);

  renderTimeline(events, inscriptionsByEvent);
  renderList(events, inscriptionsByEvent);
  renderCards(events, inscriptionsByEvent);
  updateNextEvent(events);
}

// Switch between timeline/list/cards views
function setActiveView(which) {
  $$('.view').forEach(v => v.classList.remove('active'));
  const targetView = $('#' + which + '-view');
  if (targetView) targetView.classList.add('active');

  $$('.view-switch .tab').forEach(b => b.classList.remove('active'));
  const targetTab = $('#view-' + which);
  if (targetTab) targetTab.classList.add('active');
}

// Initialize view switch buttons
function initViewSwitch() {
  const timelineBtn = document.getElementById('view-timeline');
  const listBtn = document.getElementById('view-list');
  const cardsBtn = document.getElementById('view-cards');

  if (timelineBtn) timelineBtn.addEventListener('click', () => setActiveView('timeline'));
  if (listBtn) listBtn.addEventListener('click', () => setActiveView('list'));
  if (cardsBtn) cardsBtn.addEventListener('click', () => setActiveView('cards'));
}

// Initialize global UI listeners
function initListeners() {
  // Modal close buttons
  $$('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => modal.closeAll());
  });

  // Contact button
  const contactBtn = document.getElementById('contact-button');
  if (contactBtn) {
    contactBtn.onclick = () => modal.open('#modal-contact');
  }
}

// Load site configuration (logo, name, intro text)
async function loadSiteConfig() {
  try {
    // Fetch all config key-value pairs
    const { data: rows, error } = await _supabase.from('app_config').select('key, value');

    if (error) {
      console.error('loadSiteConfig query error:', error);
      return;
    }

    if (!rows || rows.length === 0) {
      console.log("loadSiteConfig: no config data found");
      return;
    }

    // Convert to object keyed by 'key'
    const config = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }

    // Association name
    const brandName = document.querySelector('.brand-name');
    if (brandName) {
      brandName.textContent = config.association_name || "Ohlun'Joie";
    }

    // Logo emoji - hide if image exists
    const logoEmoji = document.getElementById('logo-emoji');
    if (logoEmoji) {
      logoEmoji.style.display = config.logo_url ? 'none' : 'inline';
      if (!config.logo_url) {
        logoEmoji.textContent = config.logo_emoji || '🤝';
      }
    }

    // Logo image
    if (config.logo_url) {
      let headerLogo = document.getElementById('header-logo-bg');
      if (!headerLogo) {
        headerLogo = document.createElement('div');
        headerLogo.id = 'header-logo-bg';
        headerLogo.style.cssText = `
          width: 110px;
          height: 110px;
          margin: 0 1.5em;
          border-radius: 12px;
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          flex-shrink: 0;
        `;
        if (logoEmoji?.parentNode) {
          logoEmoji.parentNode.insertBefore(headerLogo, logoEmoji.nextSibling);
        }
      }
      headerLogo.style.backgroundImage = `url('${config.logo_url}')`;
    }

    // Intro text
    const introText = document.getElementById('intro-text');
    if (introText) {
      introText.textContent = config.intro_text || '';
    }

    document.title = (config.association_name || "Ohlun'Joie") + ' — Événements';
  } catch (err) {
    console.error('Erreur loadSiteConfig:', err);
  }
}

// Setup inscription form
function setupInscriptionForm() {
  const form = document.getElementById('insc-form');
  if (!form) return;

  form.onsubmit = async function(e) {
    e.preventDefault();
    e.stopImmediatePropagation();

    const submitBtn = form.querySelector('button[type="submit"]');

    // Prevent double submission
    if (submitBtn && submitBtn.disabled) return;

    const fd = new FormData(form);
    const prenom = fd.get('prenom')?.trim();
    const nom = fd.get('nom')?.trim();
    const email = fd.get('email')?.trim();
    const telephone = fd.get('telephone')?.trim();
    const heure_arrivee = fd.get('heure_arrivee')?.trim() || null;
    const heure_depart = fd.get('heure_depart')?.trim() || null;
    const commentaire = fd.get('commentaire')?.trim() || '';
    const preparation_salle = !!fd.get('preparation_salle');
    const partie_evenement = !!fd.get('partie_evenement');
    const evenement_entier = !!fd.get('evenement_entier');
    const event_id = Number(fd.get('event_id'));

    // Validate fields with specific error messages
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
      errors.push('Téléphone invalide (format: 06 12 34 56 78)');
    }
    const minOne = preparation_salle || partie_evenement || evenement_entier;
    if (!minOne) errors.push('Sélectionnez au moins un type de participation');

    if (errors.length > 0) {
      toast(errors[0]);
      return;
    }

    // Disable button during submission
    if (submitBtn) submitBtn.disabled = true;

    toast('Envoi de votre inscription en cours...');

    // Check for duplicate inscription
    try {
      const { data: existingDup } = await _supabase
        .from('inscriptions')
        .select('*')
        .eq('event_id', event_id)
        .eq('email', email);

      if (existingDup && existingDup.length > 0) {
        toast('Vous êtes déjà inscrit à cet événement');
        if (submitBtn) submitBtn.disabled = false;
        return;
      }
    } catch (ex) {
      console.warn('duplicate check failed', ex);
    }

    const { error } = await _supabase.from('inscriptions').insert({
      event_id,
      prenom,
      nom,
      email,
      telephone,
      heure_arrivee,
      heure_depart,
      commentaire,
      preparation_salle,
      partie_evenement,
      evenement_entier
    });

    if (error) {
      console.error(error);
      toast("Erreur lors de l'inscription");
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    // Fire-and-forget confirmation email
    sendConfirmationEmail(
      { prenom, nom, email, telephone, heure_arrivee, heure_depart, commentaire, preparation_salle, partie_evenement, evenement_entier },
      _currentInscriptionEvent
    );

    toast('Inscription enregistrée !');
    modal.closeAll();
    form.reset();

    // Re-enable button after cooldown
    setTimeout(() => { if (submitBtn) submitBtn.disabled = false; }, 5000);

    // Refresh views (force bypass throttle since data changed)
    if (isAdmin) {
      loadAdminInscriptions();
      loadAdminVolunteers();
    }
    if (typeof loadPublic.force === 'function') {
      loadPublic.force();
    } else {
      loadPublic();
    }
  };
}

// Setup contact form
function setupContactForm() {
  const form = $('#contact-form');
  if (!form) return;

  form.onsubmit = async function(e) {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');

    // Prevent double submission
    if (submitBtn && submitBtn.disabled) return;

    const fd = new FormData(form);
    const nom = fd.get('nom')?.trim();
    const prenom = fd.get('prenom')?.trim();
    const email = fd.get('email')?.trim();
    const telephone = fd.get('telephone')?.trim();
    const message = fd.get('message')?.trim();

    // Validate with specific error messages
    const errors = [];
    if (!nom) errors.push('Nom requis');
    if (!prenom) errors.push('Prénom requis');
    if (!email) {
      errors.push('Email requis');
    } else if (!validateEmail(email)) {
      errors.push('Email invalide');
    }
    if (!telephone) {
      errors.push('Téléphone requis');
    } else if (!validatePhone(telephone)) {
      errors.push('Téléphone invalide (format: 06 12 34 56 78)');
    }
    if (!message) errors.push('Message requis');

    if (errors.length > 0) {
      toast(errors[0]);
      return;
    }

    // Disable button during submission
    if (submitBtn) submitBtn.disabled = true;

    const { error } = await _supabase.from('contact_messages').insert({
      nom,
      prenom,
      email,
      telephone,
      message,
      date: new Date().toISOString(),
      lu: false
    });

    if (error) {
      toast("Erreur lors de l'envoi du message");
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    toast('Message envoyé !');
    form.reset();
    modal.closeAll();

    // Re-enable button after cooldown
    setTimeout(() => { if (submitBtn) submitBtn.disabled = false; }, 5000);

    if (isAdmin) {
      loadAdminMessages();
    }
  };
}

// Send confirmation email (fire-and-forget, never blocks registration)
function sendConfirmationEmail(volunteer, event) {
  if (!event) return;
  try {
    fetch('/api/send-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volunteer, event })
    }).catch(err => console.warn('Confirmation email failed:', err));
  } catch (err) {
    console.warn('Confirmation email failed:', err);
  }
}

// ENREGISTRE VISITE (une seule fois par session navigateur)
async function trackPageView() {
  if (sessionStorage.getItem('page_view_tracked')) return;
  try {
    await _supabase.from('analytics').insert({
      event_type: 'page_view',
      page_name: 'public',
      user_agent: navigator.userAgent.substring(0, 200)
    });
    sessionStorage.setItem('page_view_tracked', '1');
  } catch (e) {
    // Silent fail - analytics should never break the app
  }
}