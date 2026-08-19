/* ==========================================================================
   Portal Fraga Bike Shop: shared app logic (auth, data, shell, utils)
   Pure client-side (no backend): state lives in localStorage so the demo
   behaves like a real product across page loads.
   ========================================================================== */

(function (global) {
  'use strict';

  /* ── Supabase client ──────────────────────────────────────────────── */
  /* Phase 1 of the Supabase migration: real authentication only. The rest
     of the app (documentos, comunicados, aniversariantes, onboarding) still
     reads/writes localStorage — that migrates in a later phase. */
  const SUPABASE_URL = 'https://hfmlhhercgztgzfllaia.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_o7_7zH28RPdfTSkuRT9isA_bOEuNn1Z';
  const sb = global.supabase ? global.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

  /* ── tiny DOM helpers ─────────────────────────────────────────────── */
  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const el = (tag, attrs, ...kids) => {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) n.setAttribute(k, v);
    });
    kids.flat().forEach((k) => {
      if (k === null || k === undefined) return;
      n.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
    });
    return n;
  };

  /* ── icons (feather-style, inline) ───────────────────────────────── */
  const ICON_PATHS = {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    gift: '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    'bar-chart': '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    'chevron-down': '<polyline points="6 9 12 15 18 9"/>',
    'chevron-left': '<polyline points="15 18 9 12 15 6"/>',
    'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    'alert-triangle': '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    mail: '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22 6 12 13 2 6"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    'arrow-right': '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="1"/><line x1="9" y1="8" x2="9" y2="8"/><line x1="15" y1="8" x2="15" y2="8"/><line x1="9" y1="13" x2="9" y2="13"/><line x1="15" y1="13" x2="15" y2="13"/><line x1="9" y1="18" x2="15" y2="18"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    'upload-cloud': '<path d="M16 16l-4-4-4 4"/><path d="M12 12v9"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/><polyline points="16 16 12 12 8 16"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/><path d="M15 5l4 4"/>',
    maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/>',
    minimize: '<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>',
    'plus-circle': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
    'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>',
  };
  function icon(name, cls) {
    const body = ICON_PATHS[name] || '';
    return `<svg class="icon${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
  }

  /* ── mock data ────────────────────────────────────────────────────── */
  const ANNOUNCEMENTS = [
    { id: 'a1', tag: 'urgente', title: 'Atualização do procedimento de atendimento', author: 'RH', date: '2026-08-17', body: 'A partir de hoje, todo atendimento presencial deve seguir o novo roteiro de boas-vindas descrito no POP de Atendimento ao Cliente (v2.1). Times de loja devem revisar o documento ainda esta semana.' },
    { id: 'a2', tag: 'importante', title: 'Novo horário de funcionamento da loja', author: 'Comercial', date: '2026-08-16', body: 'A partir da próxima segunda-feira, a loja física passa a funcionar das 9h às 19h, de segunda a sábado. Ajustem as escalas com seus times.' },
    { id: 'a3', tag: 'geral', title: 'Resultados do trimestre e agradecimento à equipe', author: 'Direção', date: '2026-08-12', body: 'Fechamos o trimestre com crescimento de 18% nas vendas e recorde de satisfação dos clientes. Obrigado a todos pelo empenho: o resultado é de cada um de vocês.' },
    { id: 'a4', tag: 'importante', title: 'Nova política de trocas e devoluções', author: 'E-commerce', date: '2026-08-10', body: 'O prazo de troca para produtos comprados online passa de 7 para 30 dias corridos. A política atualizada já está disponível na Central de Documentos.' },
    { id: 'a5', tag: 'geral', title: 'Campanha interna: Setembro Amarelo na Fraga', author: 'RH', date: '2026-08-05', body: 'Em setembro teremos rodas de conversa e conteúdos sobre saúde mental toda quarta-feira. Fiquem de olho nos comunicados para a agenda completa.' },
  ];



  const ONBOARDING_TOPICS = [
    { label: 'Nossa história', tone: 'orange', icon: 'building' },
    { label: 'Missão & visão', tone: 'blue', icon: 'zap' },
    { label: 'Nossos valores', tone: 'green', icon: 'users' },
    { label: 'Código de conduta', tone: 'orange', icon: 'file' },
  ];

  const SECTORS = ['Comercial', 'E-commerce', 'Administrativo', 'RH', 'Oficina', 'Loja Fraga Geral'];

  const NAV_ITEMS = [
    { key: 'dashboard', label: 'Início', href: 'dashboard.html', icon: 'home' },
    { key: 'documentos', label: 'Documentos', href: 'documentos.html', icon: 'file' },
    { key: 'comunicados', label: 'Comunicados', href: 'comunicados.html', icon: 'bell' },
    { key: 'aniversariantes', label: 'Aniversariantes', href: 'aniversariantes.html', icon: 'gift' },
    { key: 'onboarding', label: 'Onboarding', href: 'onboarding.html', icon: 'check-circle' },
    { key: 'gestao', label: 'Gestão', href: 'gestao.html', icon: 'bar-chart', adminOnly: true },
  ];

  /* ── session / auth ──────────────────────────────────────────────── */
  const SESSION_KEY = 'fraga_session';
  const DEMO_USER = {
    name: 'Teste',
    email: 'teste@fragabikeshop.com.br',
    role: 'Analista de E-commerce',
    sector: 'E-commerce',
    since: '2023-02-03',
    accessLevel: 'colaborador',
  };

  const ADMIN_USER = {
    name: 'Administrador',
    email: 'admin@fragabikeshop.com.br',
    role: 'Administrador do Portal',
    sector: 'Administrativo',
    since: '2022-01-10',
    accessLevel: 'admin',
  };

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
  }
  function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...user, loginAt: new Date().toISOString() }));
  }
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    if (sb) sb.auth.signOut();
  }

  function requireAuth() {
    const s = getSession();
    if (!s) {
      const next = encodeURIComponent(location.pathname.split('/').pop());
      location.href = 'login.html?next=' + next;
      return null;
    }
    return s;
  }

  function redirectIfAuthed(target) {
    if (getSession()) location.href = target || 'dashboard.html';
  }

  function requireAdmin() {
    const s = getSession();
    if (!s) { location.href = 'admin-login.html'; return null; }
    if (s.accessLevel !== 'admin') { location.href = 'dashboard.html'; return null; }
    return s;
  }

  /* ── small persisted state (read receipts, onboarding progress) ─── */
  function readList(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; }
  }
  function writeList(key, arr) { localStorage.setItem(key, JSON.stringify(arr)); }

  /* First read seeds localStorage from the mock defaults above; every read
     after that (including admin adds/deletes) comes straight from storage,
     so the admin panel's changes are what every page renders. */
  function readOrSeed(key, seedArr) {
    const raw = localStorage.getItem(key);
    if (raw !== null) { try { return JSON.parse(raw); } catch (e) { /* fall through to reseed */ } }
    writeList(key, seedArr);
    return seedArr.slice();
  }


  function genId(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  const state = {
    /* Documents: live in Supabase now (shared across the whole company). */
    async getDocs() {
      const { data, error } = await sb.from('documents').select('*').order('updated_at', { ascending: false });
      if (error) { console.error(error); return []; }
      return data.map((d) => ({
        id: d.id, title: d.title, category: d.category, sector: d.sector, version: d.version,
        tone: d.tone, restricted: d.restricted, owner: d.owner,
        fileData: d.file_url, fileName: d.file_name,
        updatedAt: (d.updated_at || d.created_at).slice(0, 10),
      }));
    },
    // RLS on the documents table already limits restricted docs to the
    // matching sector (or admins), so this is just an alias for getDocs().
    async docsVisibleTo() { return this.getDocs(); },
    async addDoc(doc) {
      const { data: { user } } = await sb.auth.getUser();
      const { data, error } = await sb.from('documents').insert({
        title: doc.title, category: doc.category, sector: doc.sector, version: doc.version,
        tone: doc.tone, restricted: !!doc.restricted, owner: doc.owner,
        file_url: doc.fileData || null, file_name: doc.fileName || null,
        created_by: user ? user.id : null,
      }).select().single();
      if (error) throw error;
      return data.id;
    },
    async deleteDoc(id) {
      const { error } = await sb.from('documents').delete().eq('id', id);
      if (error) throw error;
    },
    async updateDoc(id, patch) {
      const row = { updated_at: new Date().toISOString() };
      if (patch.title !== undefined) row.title = patch.title;
      if (patch.category !== undefined) row.category = patch.category;
      if (patch.sector !== undefined) row.sector = patch.sector;
      if (patch.version !== undefined) row.version = patch.version;
      if (patch.tone !== undefined) row.tone = patch.tone;
      if (patch.restricted !== undefined) row.restricted = !!patch.restricted;
      if (patch.fileData !== undefined) row.file_url = patch.fileData;
      if (patch.fileName !== undefined) row.file_name = patch.fileName;
      const { error } = await sb.from('documents').update(row).eq('id', id);
      if (error) throw error;
    },
    async isDocRead(id) {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return false;
      const { data } = await sb.from('document_reads').select('document_id').eq('user_id', user.id).eq('document_id', id).maybeSingle();
      return !!data;
    },
    async markDocRead(id) {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      await sb.from('document_reads').upsert({ user_id: user.id, document_id: id });
    },
    async getReadDocIds() {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return [];
      const { data } = await sb.from('document_reads').select('document_id').eq('user_id', user.id);
      return (data || []).map((r) => r.document_id);
    },

    /* Announcements: live in Supabase now (shared across the whole company),
       not localStorage. All of these are async. */
    async getAnnouncements() {
      const { data, error } = await sb.from('announcements').select('*').order('created_at', { ascending: false });
      if (error) { console.error(error); return []; }
      return data.map((a) => ({ id: a.id, tag: a.tag, title: a.title, author: a.author, date: a.created_at.slice(0, 10), body: a.body }));
    },
    async addAnnouncement({ tag, title, author, body }) {
      const { data: { user } } = await sb.auth.getUser();
      const { error } = await sb.from('announcements').insert({ tag, title, author, body, created_by: user ? user.id : null });
      if (error) throw error;
    },
    async deleteAnnouncement(id) {
      const { error } = await sb.from('announcements').delete().eq('id', id);
      if (error) throw error;
    },
    async getReadAnnouncementIds() {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return [];
      const { data } = await sb.from('announcement_reads').select('announcement_id').eq('user_id', user.id);
      return (data || []).map((r) => r.announcement_id);
    },
    async markAnnouncementRead(id) {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      await sb.from('announcement_reads').upsert({ user_id: user.id, announcement_id: id });
    },
    async getLikeCounts() {
      const { data } = await sb.from('announcement_likes').select('announcement_id');
      const counts = {};
      (data || []).forEach((r) => { counts[r.announcement_id] = (counts[r.announcement_id] || 0) + 1; });
      return counts;
    },
    async getMyLikedIds() {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return [];
      const { data } = await sb.from('announcement_likes').select('announcement_id').eq('user_id', user.id);
      return (data || []).map((r) => r.announcement_id);
    },
    async toggleLike(announcementId, currentlyLiked) {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      if (currentlyLiked) {
        await sb.from('announcement_likes').delete().eq('user_id', user.id).eq('announcement_id', announcementId);
      } else {
        await sb.from('announcement_likes').insert({ user_id: user.id, announcement_id: announcementId });
      }
    },

    /* Employees (aniversariantes/equipe): live in Supabase now, shared
       across the whole company. */
    async getEmployees() {
      const { data, error } = await sb.from('employees').select('*').order('name');
      if (error) { console.error(error); return []; }
      return data.map((e) => ({ id: e.id, name: e.name, role: e.role, sector: e.sector, day: e.day, month: e.month, year: e.birth_year || null }));
    },
    async addEmployee(emp) {
      const { error } = await sb.from('employees').insert({
        name: emp.name, role: emp.role, sector: emp.sector, day: emp.day, month: emp.month, birth_year: emp.year || null,
      });
      if (error) throw error;
    },
    async deleteEmployee(id) {
      const { error } = await sb.from('employees').delete().eq('id', id);
      if (error) throw error;
    },

    /* Onboarding: live in Supabase now (shared across the whole company).
       Step definitions (label + sector) are admin-managed; each person's
       completion (done/not) is a separate per-user record. */
    async getOnboardingDefs() {
      const { data, error } = await sb.from('onboarding_steps').select('*').order('created_at', { ascending: true });
      if (error) { console.error(error); return []; }
      return data.map((s) => ({ id: s.id, label: s.label, sector: s.sector }));
    },
    async addOnboardingStep(step) {
      const { error } = await sb.from('onboarding_steps').insert({ label: step.label, sector: step.sector || 'Todos' });
      if (error) throw error;
    },
    async deleteOnboardingStep(id) {
      const { error } = await sb.from('onboarding_steps').delete().eq('id', id);
      if (error) throw error;
    },
    async onboardingStepsFor(session) {
      const defs = await this.getOnboardingDefs();
      return defs.filter((s) => s.sector === 'Todos' || s.sector === session.sector);
    },
    async onboardingSteps(session) {
      const defs = await this.onboardingStepsFor(session);
      const { data: { user } } = await sb.auth.getUser();
      let doneIds = [];
      if (user) {
        const { data } = await sb.from('onboarding_progress').select('step_id').eq('user_id', user.id);
        doneIds = (data || []).map((r) => r.step_id);
      }
      return defs.map((d) => ({ id: d.id, done: doneIds.includes(d.id) }));
    },
    async toggleOnboardingStep(id, session) {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const steps = await this.onboardingSteps(session);
      const current = steps.find((s) => s.id === id);
      if (current && current.done) {
        await sb.from('onboarding_progress').delete().eq('user_id', user.id).eq('step_id', id);
      } else {
        await sb.from('onboarding_progress').upsert({ user_id: user.id, step_id: id, done: true });
      }
    },
    async onboardingProgress(session) {
      const steps = await this.onboardingSteps(session);
      if (!steps.length) return 0;
      const done = steps.filter((s) => s.done).length;
      return Math.round((done / steps.length) * 100);
    },
  };

  /* ── formatting ───────────────────────────────────────────────────── */
  function formatDate(iso, opts) {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', opts || { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function relativeDay(iso) {
    const today = new Date('2026-08-17T00:00:00');
    const d = new Date(iso + 'T00:00:00');
    const diff = Math.round((today - d) / 86400000);
    if (diff === 0) return 'Publicado hoje';
    if (diff === 1) return 'Publicado ontem';
    if (diff > 1 && diff < 7) return `Publicado há ${diff} dias`;
    return 'Publicado em ' + formatDate(iso);
  }
  function initials(name) {
    return (name || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }
  /** Real photo when there is one (LinkedIn-style), initials otherwise. */
  function avatarHtml(person, cls) {
    const classAttr = 'avatar' + (cls ? ' ' + cls : '');
    if (person && person.avatarUrl) {
      return `<img class="${classAttr}" src="${person.avatarUrl}" alt="${(person.name || '').replace(/"/g, '')}" />`;
    }
    return `<div class="${classAttr}">${initials(person && person.name)}</div>`;
  }
  function qs(name) { return new URLSearchParams(location.search).get(name); }

  /* ── toast ────────────────────────────────────────────────────────── */
  function toast(message) {
    let wrap = $('#toastWrap');
    if (!wrap) { wrap = el('div', { class: 'toast-wrap', id: 'toastWrap' }); document.body.appendChild(wrap); }
    const t = el('div', { class: 'toast', html: `${icon('check')}<span>${message}</span>` });
    wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 250);
    }, 3200);
  }

  function confirmDialog(opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      const overlay = el('div', { class: 'confirm-overlay' });
      const actions = el('div', { class: 'confirm-actions' });
      const card = el('div', { class: 'confirm-card' },
        el('div', { class: 'confirm-icon' + (opts.danger ? ' is-danger' : ''), html: icon(opts.danger ? 'trash' : 'alert-triangle') }),
        el('h3', { class: 'confirm-title' }, opts.title || 'Tem certeza?'),
        el('p', { class: 'confirm-message' }, opts.message || ''),
        actions
      );
      const cancelBtn = el('button', { type: 'button', class: 'btn btn-ghost' }, opts.cancelText || 'Cancelar');
      const confirmBtn = el('button', { type: 'button', class: 'btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') }, opts.confirmText || 'Confirmar');
      actions.appendChild(cancelBtn);
      actions.appendChild(confirmBtn);
      overlay.appendChild(card);
      document.body.appendChild(overlay);
      document.body.classList.add('confirm-lock');
      requestAnimationFrame(() => overlay.classList.add('show'));

      function close(result) {
        document.removeEventListener('keydown', onKey);
        overlay.classList.remove('show');
        document.body.classList.remove('confirm-lock');
        setTimeout(() => overlay.remove(), 200);
        resolve(result);
      }
      function onKey(e) { if (e.key === 'Escape') close(false); }
      cancelBtn.addEventListener('click', () => close(false));
      confirmBtn.addEventListener('click', () => close(true));
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
      document.addEventListener('keydown', onKey);
      confirmBtn.focus();
    });
  }

  /* ── app shell (sidebar + topbar) ────────────────────────────────── */
  function mountShell(activeKey) {
    const session = getSession() || DEMO_USER;
    const sidebar = $('#sidebar');
    const topbar = $('#topbar');
    if (!sidebar || !topbar) return;

    const isAdmin = session.accessLevel === 'admin';

    sidebar.innerHTML = `
      <button class="sidebar-close" type="button" aria-label="Fechar menu" data-nav-close>${icon('x')}</button>
      <div class="sidebar-brand">
        <div class="logo-badge"><img src="assets/fraga-logo-mark.png?v=2" alt="Fraga Bike Shop" /></div>
      </div>
      <nav class="sidebar-nav" aria-label="Navegação principal">
        <span class="sidebar-section">Menu</span>
        ${NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => `
          <a class="sidebar-link" href="${item.href}" ${item.key === activeKey ? 'aria-current="page"' : ''}>
            ${icon(item.icon)}<span>${item.label}</span>
            ${item.key === 'comunicados' ? '<span class="count" data-unread-badge hidden></span>' : ''}
          </a>
        `).join('')}
        ${isAdmin ? `
          <span class="sidebar-section">Administração</span>
          <a class="sidebar-link" href="admin.html" ${activeKey === 'admin' ? 'aria-current="page"' : ''}>${icon('shield')}<span>Painel Admin</span></a>
        ` : ''}
        <span class="sidebar-section">Conta</span>
        <a class="sidebar-link" href="perfil.html" ${activeKey === 'perfil' ? 'aria-current="page"' : ''}>${icon('user')}<span>Meu Perfil</span></a>
      </nav>
      <div class="sidebar-foot">
        <div class="sidebar-user">
          ${avatarHtml(session)}
          <div>
            <div class="sidebar-user-name">${session.name}</div>
            <div class="sidebar-user-role">${session.role}</div>
          </div>
        </div>
        <button class="sidebar-logout" type="button" data-logout>${icon('log-out')}<span>Sair</span></button>
      </div>
    `;

    topbar.innerHTML = `
      <button class="icon-btn menu-toggle" type="button" aria-label="Abrir menu" data-nav-open>${icon('menu')}</button>
      <label class="search-input">
        ${icon('search')}
        <input type="search" placeholder="Buscar documentos, comunicados..." aria-label="Buscar no portal" data-topbar-search />
      </label>
      <div class="topbar-spacer"></div>
      <div class="topbar-actions">
        <a class="icon-btn" href="comunicados.html" aria-label="Comunicados" data-notif-bell>${icon('bell')}</a>
        <a href="perfil.html" aria-label="Meu perfil" style="display:flex;align-items:center;gap:10px;">
          ${avatarHtml(session)}
        </a>
      </div>
    `;

    // Unread comunicados badge — fetched async so the shell itself never
    // blocks on a network round trip.
    if (sb) {
      state.getAnnouncements().then(async (items) => {
        const readIds = await state.getReadAnnouncementIds();
        const unread = items.filter((a) => !readIds.includes(a.id)).length;
        if (!unread) return;
        const badge = $('[data-unread-badge]');
        if (badge) { badge.textContent = String(unread); badge.hidden = false; }
        const bell = $('[data-notif-bell]');
        if (bell) bell.classList.add('notif-dot');
      }).catch(() => {});
    }

    // Mobile nav toggle
    $$('[data-nav-open]').forEach((b) => b.addEventListener('click', () => document.body.classList.add('nav-open')));
    $$('[data-nav-close]').forEach((b) => b.addEventListener('click', () => document.body.classList.remove('nav-open')));
    const scrim = $('#scrim');
    if (scrim) scrim.addEventListener('click', () => document.body.classList.remove('nav-open'));

    // Logout
    $$('[data-logout]').forEach((b) => b.addEventListener('click', () => {
      clearSession();
      location.href = 'index.html';
    }));

    // Topbar quick search -> jumps to Documentos with the query
    const search = $('[data-topbar-search]');
    if (search) {
      search.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && search.value.trim()) {
          location.href = 'documentos.html?q=' + encodeURIComponent(search.value.trim());
        }
      });
    }

    return session;
  }

  function init(activeKey) {
    const session = requireAuth();
    if (!session) return null;
    return mountShell(activeKey) || session;
  }

  /* ── export ───────────────────────────────────────────────────────── */
  global.Fraga = {
    $, $$, el, icon,
    ANNOUNCEMENTS, ONBOARDING_TOPICS, NAV_ITEMS, SECTORS,
    DEMO_USER, ADMIN_USER, supabase: sb,
    getSession, setSession, clearSession, requireAuth, requireAdmin, redirectIfAuthed,
    state, formatDate, relativeDay, initials, avatarHtml, qs, toast, confirmDialog, mountShell, init, genId,
  };
})(window);
