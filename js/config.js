// =============================================================================
// CONFIG.JS - Supabase Configuration & Initialization
// =============================================================================

// Supabase connection settings
const SUPABASE_URL = 'https://vwbondhbvkqokqzcvapc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3Ym9uZGhidmtxb2txemN2YXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjEzNTIsImV4cCI6MjA5NDA5NzM1Mn0.D_p2nX_xLtYu-qICblrcPwPIID7AuDZQr7j-QnhiT2c';

// Demo mode flag - set to true for local testing without auth
const demoMode = false;

// Initialize Supabase client
let _supabase;

if (!demoMode && window.supabase && typeof window.supabase.createClient === 'function') {
  _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.warn('Supabase library not found, using stub client.');

  // In-memory stub client for offline/local development
  const memory = {
    events: [
      { id: 1, titre: 'Conférence citoyenne', date: '2026-03-15', heure: '18:30', lieu: 'Mairie', max_participants: 80, description: 'Échanges citoyens sur la vie locale.', visible: true, archived: false, type: 'conférence' },
      { id: 2, titre: 'Tournoi de badminton', date: '2026-03-22', heure: '14:00', lieu: 'Gymnase municipal', max_participants: 24, description: '', visible: true, archived: false, type: 'sport' },
      { id: 3, titre: 'Atelier cuisine conviviale', date: '2026-04-05', heure: '19:00', lieu: 'Salle des fêtes', max_participants: 20, description: '', visible: true, archived: false, type: 'atelier' }
    ],
    inscriptions: [],
    contact_messages: [],
    admins: [
      {
        id: 1,
        user_id: 'demo-user-id',
        prenom: 'Maxime',
        nom: 'Zinck',
        email: 'zinck.maxime@gmail.com',
        role: 'super_admin',
        is_active: true,
        last_login: new Date().toISOString(),
        perm_view_events: true,
        perm_edit_events: true,
        perm_view_stats: true,
        perm_view_logs: true,
        perm_view_volunteers: true,
        perm_manage_admins: true,
        perm_config: true
      }
    ],
    app_config: [
      { id: 1, key: 'association_name', value: "Ohlun'Joie" },
      { id: 2, key: 'intro_text', value: 'Notre association rassemble des bénévoles passionnés...' },
      { id: 3, key: 'logo_url', value: '' },
      { id: 4, key: 'logo_emoji', value: '🤝' },
      { id: 5, key: 'event_types', value: '["assemblée","atelier","sport","fête","conférence","événement"]' }
    ],
    analytics: [],
    volunteer_profiles: [],
    activity_logs: []
  };

  const idCounters = {
    events: memory.events.length + 1,
    inscriptions: 1,
    contact_messages: 1,
    admins: memory.admins.length + 1
  };

  _supabase = {
    auth: {
      _session: { user: { id: 'demo-user-id' } },
      _listeners: [],
      signInWithPassword: async function() {
        this._session = { user: { id: 'demo-user-id' } };
        this._listeners.forEach(cb => cb('SIGNED_IN', this._session));
        return { data: { user: { id: 'demo-user-id' } }, error: null };
      },
      signOut: async function() {
        this._session = null;
        this._listeners.forEach(cb => cb('SIGNED_OUT', null));
        return { error: null };
      },
      getSession: async function() {
        return { data: { session: this._session } };
      },
      onAuthStateChange: function(callback) {
        this._listeners.push(callback);
        // Fire initial session event
        setTimeout(() => callback('INITIAL_SESSION', this._session), 0);
        return { data: { subscription: { unsubscribe: () => {
          this._listeners = this._listeners.filter(cb => cb !== callback);
        } } } };
      },
      resetPasswordForEmail: async () => ({ error: null }),
      updateUser: async () => ({ error: null })
    },
    from(table) {
      const query = { table, filters: [], limitCount: null, orderField: null, orderAsc: true, singleMode: false, operation: null, payload: null };

      function applyFilters(rows) {
        return query.filters.reduce((res, [field, value, op]) => {
          if (op === 'lt') return res.filter(row => row[field] < value);
          if (op === 'gte') return res.filter(row => row[field] >= value);
          if (op === 'lte') return res.filter(row => row[field] <= value);
          if (op === 'in') return res.filter(row => value.includes(row[field]));
          return res.filter(row => row[field] == value);
        }, rows);
      }

      function execute() {
        // Handle mutations
        if (query.operation === 'insert') {
          if (!memory[table]) memory[table] = [];
          const id = idCounters[table] || 1;
          idCounters[table] = id + 1;
          const newRecord = { id, ...query.payload };
          memory[table].push(newRecord);
          return { data: newRecord, error: null };
        }

        if (query.operation === 'update') {
          if (!memory[table]) return { error: null };
          let rows = applyFilters(memory[table]);
          rows.forEach(row => Object.assign(row, query.payload));
          return { error: null };
        }

        if (query.operation === 'delete') {
          if (!memory[table]) return { error: null };
          memory[table] = memory[table].filter(row => {
            return !query.filters.every(([f, v, op]) => {
              if (op === 'in') return v.includes(row[f]);
              return row[f] == v;
            });
          });
          return { error: null };
        }

        if (query.operation === 'upsert') {
          if (!memory[table]) memory[table] = [];
          const records = Array.isArray(query.payload) ? query.payload : [query.payload];
          for (const rec of records) {
            const idx = rec.id ? memory[table].findIndex(r => r.id === rec.id) : -1;
            if (idx >= 0) {
              memory[table][idx] = { ...memory[table][idx], ...rec };
            } else {
              const id = idCounters[table] || 1;
              idCounters[table] = id + 1;
              memory[table].push({ ...rec, id });
            }
          }
          return { data: records, error: null };
        }

        // Default: select
        let rows = memory[table] ? [...memory[table]] : [];
        rows = applyFilters(rows);
        if (query.orderField) {
          rows.sort((a, b) => {
            if (a[query.orderField] < b[query.orderField]) return query.orderAsc ? -1 : 1;
            if (a[query.orderField] > b[query.orderField]) return query.orderAsc ? 1 : -1;
            return 0;
          });
        }
        if (query.limitCount != null) rows = rows.slice(0, query.limitCount);
        const data = query.singleMode ? (rows[0] || null) : rows;
        return { data, error: null, count: rows.length };
      }

      const stub = {
        select() { return this; },
        insert(record) { query.operation = 'insert'; query.payload = record; return this; },
        update(values) { query.operation = 'update'; query.payload = values; return this; },
        delete() { query.operation = 'delete'; return this; },
        upsert(values) { query.operation = 'upsert'; query.payload = values; return this; },
        eq(field, value) { query.filters.push([field, value]); return this; },
        in(field, values) { query.filters.push([field, values, 'in']); return this; },
        lt(field, value) { query.filters.push([field, value, 'lt']); return this; },
        gte(field, value) { query.filters.push([field, value, 'gte']); return this; },
        lte(field, value) { query.filters.push([field, value, 'lte']); return this; },
        order(field, opts = {}) { query.orderField = field; query.orderAsc = opts.ascending !== false; return this; },
        limit(n) { query.limitCount = n; return this; },
        single() { query.singleMode = true; return this; },

        // Make stub thenable so await works
        then(resolve, reject) {
          try {
            resolve(execute());
          } catch (e) {
            reject(e);
          }
        }
      };
      return stub;
    }
  };
}
