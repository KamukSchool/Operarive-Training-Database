(function () {
  'use strict';

  const API = typeof INFINITY_API !== 'undefined' ? INFINITY_API : 'https://alice-by-infinity.onrender.com';
  const PACK_URL = 'data/kamuk-holdings-crm-pack-v1.json';
  const CHART_COLORS = ['#155694', '#33610e', '#a06216', '#4a3f9c', '#932727', '#2d7d8f'];

  const state = {
    auth: null, employee: null, pack: null, cases: [], pool: [], filter: 'All', queue: [],
    selected: null, active: null, profile: null, acceptedAt: null, caseTimer: null,
    sessionSec: 0, actions: [], notes: [], risk: {}, metrics: { started: 0, resolved: 0, qaAverage: null, points: 0 },
    leaderboard: null, weekKey: null,
    pendingSyncs: [],
    pendingDanger: null, pendingEvidence: null, pendingDisposition: null, editTarget: null, preview: false,
    identityVerified: false, verificationSource: null, revealedCards: {}, cardEvents: [], sitePath: '/', siteHistory: [],
    simulation: new URLSearchParams(location.search).get('simulation') === '1',
    product: (function () {
      const requested = new URLSearchParams(location.search).get('product');
      if (requested === 'infinity') return 'infinity';
      return 'kamuk';
    })()
  };

  const $ = (id) => document.getElementById(id);
  const money = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(Math.round(Number(n) || 0)).toLocaleString('en-US');
  const signed = (n) => (n >= 0 ? '+' : '-') + '$' + Math.abs(Math.round(Number(n) || 0)).toLocaleString('en-US');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const clock = (sec) => `${pad(Math.floor(sec / 60))}:${pad(Math.floor(sec % 60))}`;

  function crmPath(suffix) {
    const base = state.product === 'kamuk' ? '/kamuk-holdings/crm' : '/infinity-holdings/crm';
    return base + suffix;
  }

  async function api(path, options = {}) {
    // Always use the Training Book / portal session. No simulation PIN codes.
    let response;
    if (typeof infinityFetch === 'function') {
      response = await infinityFetch(path, options);
    } else {
      const token = (typeof getAuthToken === 'function' && getAuthToken())
        || localStorage.getItem('infinity_auth_token')
        || sessionStorage.getItem('infinity_auth_token')
        || '';
      response = await fetch(API + path, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
          ...(token ? { Authorization: 'Bearer ' + token } : {})
        },
        body: options.body && typeof options.body === 'object' ? JSON.stringify(options.body) : options.body
      });
    }
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { error: text || 'Invalid server response' }; }
    if (!response.ok) {
      const error = new Error(data.error || `Request failed (${response.status})`);
      error.code = data.code || '';
      error.status = response.status;
      throw error;
    }
    return data;
  }

  /* ─────────────── CLIENT 360 GENERATOR ─────────────── */

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function txType(tx) {
    if (!tx) return 'Pending';
    if (tx.status !== 'Cleared') return tx.status || 'Pending';
    return Number(tx.amount) >= 0 ? 'Credit' : 'Debit';
  }

  function buildProfile(kase) {
    const c = kase.client;
    const transactions = clone(c.transactions || []);
    let running = Number(c.balance) || 0;
    const statements = transactions.map((tx) => {
      const statement = { ...tx, type: txType(tx), balance: running };
      running -= Number(tx.amount) || 0;
      return statement;
    });
    const cardTx = clone(c.cardTransactions || []);
    const cards = clone(c.cards || []);
    const outflow = (c.spending || []).reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    const netFlow = transactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    const utilization = Math.max(0, Math.min(100, Math.round(((Number(c.creditLimit) - Number(c.available || 0)) / Math.max(1, Number(c.creditLimit) || 1)) * 100)));
    const spending = clone(c.spending || []);
    const credit = clone(c.credit || {});
    return {
      utilization, netFlow, outflow, statements, transactions, cardTx, spending,
      cards, services: clone(c.services || []), billing: clone(c.invoices || []), fees: clone(c.fees || []),
      emails: clone(c.emails || []), contacts: clone(c.contacts || []), log: clone(c.accountLog || []),
      recos: clone(c.recommendations || []), flow: clone(c.cashflow || []), info: clone(c.information || {}),
      credit, personality: clone(c.personality || {}), score: credit.score || c.creditScore,
      band: credit.band || '', factors: clone(credit.factors || []), aml: clone(credit.aml || []),
      incidents: clone(credit.incidents || []), onTime: c.onTimeRate || 0,
      digits: String(c.id).replace(/\D/g, '').slice(-6) || '000000'
    };
  }

  function moodFor(kase) {
    if (kase.priority === 'P1') return 'distressed';
    if (/aml|fraud|complian/i.test(kase.type)) return 'guarded';
    return 'frustrated';
  }
  /* ─────────────── QUEUE + CASE BRIEF ─────────────── */

  function queueKey(kase) {
    return String(kase?.workItemId || kase?.id || '');
  }

  function mergePoolItem(item) {
    const caseId = item?.caseId || item?.id;
    const detail = state.pack?.cases?.find((entry) => entry.id === caseId) || {};
    return {
      ...detail,
      ...item,
      id: caseId,
      caseId,
      workItemId: item?.workItemId || (item?.caseId ? item.id : null),
      touchNumber: Number(item?.touchNumber) || 1,
      history: Array.isArray(item?.history) ? item.history : []
    };
  }

  async function loadPool() {
    if (state.preview) {
      state.pool = state.cases.slice();
    } else {
      const data = await api(crmPath('/pool'));
      state.weekKey = data.weekKey || state.weekKey;
      const followUps = Array.isArray(data.followUps) ? data.followUps : [];
      const fresh = Array.isArray(data.fresh) ? data.fresh : [];
      const ordered = followUps.concat(fresh);
      state.pool = ordered.map(mergePoolItem);
    }
    buildQueue(state.filter, { selectFirst: true });
    if (!state.queue.length && !state.active) {
      state.selected = null;
      $('view1').style.display = 'flex';
      $('view2').style.display = 'none';
      $('v1-title').textContent = 'No unassigned cases available';
      $('v1-desc').textContent = 'Refresh the pool when another case becomes available.';
      $('v1-transcript').innerHTML = '';
    }
  }

  async function loadLeaderboard() {
    if (state.preview) return;
    const data = await api(crmPath('/leaderboard'));
    state.leaderboard = data.me || null;
    state.weekKey = data.weekKey || state.weekKey;
    updateMetrics();
  }

  function buildQueue(filter) {
    if (state.guide) {
      state.filter = 'All';
      state.queue = (state.pool || []).slice();
      renderQueue();
      return;
    }
    const options = arguments[1] || {};
    if (state.active) {
      renderQueue();
      return toast(`Finish or disposition ${state.active.id} before returning to the queue.`, true);
    }
    state.filter = filter;
    document.querySelectorAll('.filter-btn').forEach((b) => b.classList.toggle('on', b.dataset.filter === filter));
    const source = state.preview ? state.cases : state.pool;
    const pool = filter === 'All' ? source : source.filter((c) => c.sector === filter);
    state.queue = (state.preview && !pool.length && filter !== 'All' ? source : pool).slice();
    if (state.preview) state.queue.sort(() => Math.random() - 0.5);
    else state.queue.sort((a, b) => (Number(b.touchNumber) > 1) - (Number(a.touchNumber) > 1));
    renderQueue();
    if (state.queue[0] && (options.selectFirst || !state.queue.some((item) => queueKey(item) === state.selected))) {
      selectCase(queueKey(state.queue[0]));
    }
  }

  function renderQueue() {
    const dotClass = { P1: 'dot-r', P2: 'dot-y', P3: 'dot-g' };
    const visibleCases = state.active ? [state.active] : state.queue;
    $('queue-title').textContent = state.active ? 'Active case · locked' : 'Case queue';
    $('shuffle-btn').style.display = state.active ? 'none' : '';
    $('queue-filters').style.display = state.active ? 'none' : '';
    document.querySelector('.queue').classList.toggle('case-locked', !!state.active);
    $('queue-list').innerHTML = visibleCases.map((c) => {
      const wait = `${pad(Math.floor(Math.random() * 40 + 2))}:${pad(Math.floor(Math.random() * 59))}`;
      const followUp = Number(c.touchNumber) > 1 ? `<span class="follow-up-chip">Follow-up T${esc(c.touchNumber)}</span>` : '';
      return `<div class="qi${queueKey(state.active) === queueKey(c) || state.selected === queueKey(c) ? ' active' : ''}${state.active ? ' locked' : ''}" data-case="${esc(queueKey(c))}">
        <div class="qi-top"><span class="qi-name"><span class="dot ${dotClass[c.priority] || 'dot-g'}"></span>${esc(c.client.name.split(' ').slice(-1)[0])}</span><span class="qi-time${c.priority === 'P1' ? ' hot' : ''}">${wait}</span></div>
        <div class="qi-desc">${esc(c.title.length > 34 ? c.title.slice(0, 34) + '…' : c.title)} ${followUp}</div>
        ${state.active ? '<div class="qi-lock"><i class="ti ti-lock"></i> Work in progress</div>' : ''}
      </div>`;
    }).join('');
  }

  function selectCase(id) {
    if (state.active) {
      if (id !== queueKey(state.active)) toast(`Case ${state.active.id} is locked. Apply an action and disposition it before opening another case.`, true);
      return;
    }
    const c = state.queue.find((x) => queueKey(x) === id) || state.cases.find((x) => x.id === id);
    if (!c) return;
    state.selected = queueKey(c);
    document.querySelectorAll('.qi').forEach((q) => q.classList.toggle('active', q.dataset.case === id));
    const typeCls = /aml|fraud|complian/i.test(c.type) ? 'bdg-aml' : /vip/i.test(c.sector) ? 'bdg-vip' : 'bdg-c';
    $('v1-type').textContent = c.type; $('v1-type').className = 'bdg ' + typeCls;
    $('v1-pri').textContent = c.priority; $('v1-pri').className = 'bdg ' + (c.priority === 'P1' ? 'bdg-p1' : c.priority === 'P2' ? 'bdg-p2' : 'bdg-ok');
    $('v1-sector').textContent = c.sector;
    $('v1-title').textContent = c.title;
    $('v1-quote').textContent = `"${c.clientStatement}"`;
    $('v1-sla').textContent = `${c.slaMinutes} min`;
    $('v1-mood').textContent = moodFor(c).replace(/^./, (m) => m.toUpperCase());
    $('v1-client').textContent = `${c.client.name} · ${c.client.company}`;
    $('v1-focus').textContent = c.focus;
    $('v1-desc').textContent = c.brief;
    const history = (c.history || []).flatMap((touch) => {
      const heading = `<div class="turn prior"><div class="turn-role ex">T${esc(touch.touchNumber || '?')}</div><div class="turn-text"><strong>${esc(touch.disposition || 'Prior interaction')}</strong>${touch.completedAt ? ` · ${esc(new Date(touch.completedAt).toLocaleString('en-US'))}` : ''}${touch.studentName ? ` · ${esc(touch.studentName)}` : ''}</div></div>`;
      const notes = (touch.notes || []).map((note) => `<div class="turn prior"><div class="turn-role ex">Note</div><div class="turn-text">${esc(note.text || note.detail || '')}</div></div>`);
      const emails = (touch.emails || []).map((email) => `<div class="turn prior"><div class="turn-role ex">Email</div><div class="turn-text">${esc(email.subject || '')}${email.body ? ` — ${esc(email.body)}` : ''}</div></div>`);
      const actions = (touch.actions || []).map((action) => `<div class="turn prior"><div class="turn-role ex">Action</div><div class="turn-text">${esc(action.label || action.key || '')}${action.detail ? ` — ${esc(action.detail)}` : ''}</div></div>`);
      return [heading, ...notes, ...emails, ...actions];
    }).join('');
    $('v1-transcript').innerHTML = `${history ? `<div class="prior-trail"><div class="tr-lbl">PRIOR INTERACTION TRAIL</div>${history}</div>` : ''}
      <div class="turn"><div class="turn-role cl">Client</div><div class="turn-text">${esc(c.clientStatement)}</div></div>
      <div class="turn"><div class="turn-role ex">Desk</div><div class="turn-text">Case routed to the Corporate Banking Desk. Priority ${esc(c.priority)} · SLA ${esc(c.slaMinutes)} minutes.</div></div>`;
    $('view1').style.display = 'flex';
    $('view2').style.display = 'none';
    deskGuideMark('select');
  }

  /* ─────────────── ACCEPT + RENDER 360 ─────────────── */

  function applyServerEvents(events) {
    const list = Array.isArray(events) ? events : [];
    list.forEach((event) => {
      const type = String(event.type || '');
      const payload = event.payload || event;
      if (type === 'note' || (type === 'action' && payload?.key === 'note')) {
        const note = {
          id: payload.id || `EVT-${event.at || Date.now()}`,
          channel: payload.channel || 'Internal note',
          text: payload.text || payload.detail || '',
          at: payload.at || event.at || new Date().toISOString(),
          status: payload.status || 'Completed'
        };
        if (note.text && !state.notes.some((n) => n.text === note.text && n.at === note.at)) {
          state.notes.push(note);
          state.profile.contacts.unshift({
            id: note.id, channel: note.channel, when: new Date(note.at).toLocaleString('en-US'),
            agent: `${state.employee.name} · ${state.employee.id}`, body: note.text, status: note.status
          });
        }
      }
      if ((type === 'email' || type === 'email-client') && (payload.body || payload.subject)) {
        const email = {
          id: payload.id || `EVT-EMAIL-${event.at || Date.now()}`,
          direction: 'outbound',
          from: payload.from || `${state.employee.id.toLowerCase()}@kamukholdings.com`,
          to: payload.to || state.active.client.email,
          date: payload.date || new Date(payload.at || event.at || Date.now()).toLocaleString('en-US'),
          subject: payload.subject || 'Client email',
          body: payload.body || payload.detail || '',
          preview: String(payload.body || payload.detail || '').slice(0, 160)
        };
        if (!state.profile.emails.some((e) => e.subject === email.subject && e.body === email.body)) {
          state.profile.emails.unshift(email);
        }
      }
      if (type === 'action' || (payload?.key && type !== 'note' && type !== 'email' && type !== 'email-client' && !type.startsWith('call'))) {
        const action = {
          key: payload.key || type,
          label: payload.label || payload.key || type,
          detail: payload.detail || '',
          at: payload.at || event.at || new Date().toISOString()
        };
        if (action.key && !state.actions.some((a) => a.key === action.key && a.detail === action.detail)) {
          state.actions.push(action);
        }
      }
    });
  }

  function enterActiveCase(c, options = {}) {
    state.active = c;
    state.selected = queueKey(c);
    state.profile = buildProfile(c);
    state.actions = [];
    state.notes = [];
    state.pendingSyncs = [];
    state.identityVerified = false;
    state.verificationSource = null;
    state.revealedCards = {};
    state.cardEvents = [];
    state.sitePath = '/';
    state.siteHistory = [];
    try {
      const local = JSON.parse(localStorage.getItem(`kamuk-crm-notes-${c.id}`) || '[]');
      if (Array.isArray(local)) state.notes = local;
    } catch (_) { state.notes = []; }
    state.notes.forEach((note) => state.profile.contacts.unshift({
      id: note.id, channel: note.channel, when: new Date(note.at).toLocaleString('en-US'),
      agent: `${state.employee.name} · ${state.employee.id}`, body: note.text, status: note.status || 'Completed'
    }));
    autoVerifyByChannel();
    if (options.events) applyServerEvents(options.events);
    state.risk = options.risk || {};
    state.acceptedAt = options.acceptedAt ? new Date(options.acceptedAt) : new Date();
    $('view1').style.display = 'none';
    $('view2').style.display = 'flex';
    renderQueue();
    renderClient360();
    updateMetrics();
    if (state.caseTimer) clearInterval(state.caseTimer);
    state.caseTimer = setInterval(tickCase, 1000);
    tickCase();
  }

  async function acceptCase() {
    if (state.guide && currentGuideStep() && currentGuideStep().action !== 'accept') {
      return toast('Seguí el módulo guiado: ' + currentGuideStep().title, true);
    }
    let c = state.queue.find((x) => queueKey(x) === state.selected)
      || state.cases.find((x) => x.id === state.selected);
    if (!c) return;
    $('accept-btn').disabled = true;
    try {
      if (!state.preview && !state.guide) {
        const response = c.workItemId
          ? await api(crmPath('/case/claim'), { method: 'POST', body: { workItemId: c.workItemId } })
          : await api(crmPath('/case/start'), { method: 'POST', body: { caseId: c.id } });
        state.metrics = response.metrics || state.metrics;
        c = mergePoolItem({ ...c, ...(response.assignment || {}), acceptedAt: response.acceptedAt });
      }
      enterActiveCase(c, { acceptedAt: c.acceptedAt });
      addLog('ti-user-check', 'pro', `Case accepted — ${c.id}`, `${state.employee.name} · ${state.employee.id}`);
      toast(state.guide ? 'Práctica aceptada. Este caso no entra al queue semanal.' : 'Case accepted. Your supervisor can now see this assignment.');
      deskGuideMark('accept');
    } catch (error) {
      toast(error.message, true);
    } finally {
      $('accept-btn').disabled = false;
    }
  }

  async function resumeActiveCase() {
    if (state.preview) return;
    const data = await api(crmPath('/case/state'));
    if (data.metrics) state.metrics = data.metrics;
    if (!data.active?.caseId) return;
    const c = mergePoolItem({
      ...(state.cases.find((x) => x.id === data.active.caseId) || {}),
      caseId: data.active.caseId,
      workItemId: data.active.workItemId,
      touchNumber: data.active.touchNumber
    });
    if (!c) return;
    state.selected = c.id;
    enterActiveCase(c, { events: data.events || [], acceptedAt: data.active.acceptedAt });
    addLog('ti-history', 'accent', `Case resumed — ${c.id}`, 'Server-backed work-in-progress restored');
    toast('Active case resumed from the Kamuk desk record.');
  }

  function tickCase() {
    if (!state.acceptedAt) return;
    const sec = Math.floor((Date.now() - state.acceptedAt.getTime()) / 1000);
    const el = $('v2-elapsed');
    if (el) el.textContent = clock(sec);
  }

  function renderClient360() {
    const c = state.active, cl = c.client, p = state.profile;
    const used = Math.max(0, Number(cl.creditLimit || 0) - Number(cl.available || 0));
    $('v2-av').textContent = cl.initials;
    $('v2-name').textContent = cl.name;
    $('v2-sub').innerHTML = `${esc(cl.id)} · ${esc(cl.segment)} · ${esc(cl.relationshipYears)} yrs · Accepted by ${esc(state.employee.name)} · ${esc(state.employee.id)} · <span id="v2-elapsed">00:00</span> elapsed`;
    $('v2-status').textContent = cl.status; $('v2-status').className = 'bdg ' + (/freeze|flag|hold/i.test(cl.status) ? 'bdg-c' : 'bdg-ok');
    $('v2-vip').style.display = /vip|private|platinum/i.test(cl.segment) ? 'inline-block' : 'none';
    document.querySelectorAll('[data-soft]').forEach((b) => b.classList.remove('done'));

    // overview
    $('ov-metrics').innerHTML = [
      met('Balance', money(cl.balance), `${cl.segment}`, 'neu'),
      met('Credit limit', money(cl.creditLimit), 'Corporate facility', 'neu'),
      met('Available', money(cl.available), `${100 - p.utilization}% free`, cl.available > 0 ? 'up' : 'dn'),
      met('Net movement', signed(p.netFlow), p.netFlow >= 0 ? 'Positive cycle' : 'Negative cycle', p.netFlow >= 0 ? 'up' : 'dn')
    ].join('');
    $('ov-recent').innerHTML = cl.transactions.slice(0, 5).map((t, i) => `<tr class="clickable-row" data-tx="stmt:${i}"><td>${esc(t.description)}</td><td>${esc(t.date)}</td><td class="${t.status === 'Declined' ? 'dn' : t.amount >= 0 ? 'up' : 'dn'}">${t.status === 'Declined' ? 'DECLINED' : signed(t.amount)}</td></tr>`).join('');
    $('ov-flags').innerHTML = `<div style="background:var(--danger-bg);border:1px solid var(--danger-border);border-radius:var(--radius);padding:8px;margin-bottom:8px;">
        <div style="font-size:12.5px;font-weight:600;color:var(--danger);"><i class="ti ti-alert-triangle"></i> ${esc(c.type)} — ${esc(c.id)}</div>
        <div style="font-size:11.5px;color:var(--danger);margin-top:3px;line-height:1.5;">${esc(c.brief)}</div>
      </div>
      <div style="background:var(--warning-bg);border:1px solid var(--warning-border);border-radius:var(--radius);padding:8px;">
        <div style="font-size:12.5px;font-weight:600;color:var(--warning);"><i class="ti ti-clock"></i> SLA ${esc(c.slaMinutes)} minutes · ${esc(c.priority)}</div>
      </div>`;
    $('ov-relationship').innerHTML = rows([
      ['Client since', `${cl.relationshipYears} years`], ['Segment', cl.segment],
      ['Payment history', `${p.onTime}% on-time`], ['Relationship grade', cl.relationshipGrade], ['Risk tier', cl.riskTier]
    ]);

    // statements
    renderStatements();

    // services
    const groups = ['Cards', 'Loans', 'Accounts & services', 'Insurance & other'];
    $('svc-list').innerHTML = groups.map((group) => {
      const items = p.services.filter((s) => s.group === group);
      if (!items.length) return '';
      return `<div class="sec">${group}</div>` + items.map((s, i) => `<div class="svc-item">
        <div class="svc-ico"><i class="ti ${s.icon || (/card/i.test(group) ? 'ti-credit-card' : /loan/i.test(group) ? 'ti-building-bank' : 'ti-wallet')}"></i></div>
        <div><div class="svc-name">${esc(s.name)}</div><div class="svc-det">${esc(s.detail)}</div></div>
        <span class="bdg ${/suspend|freeze/i.test(s.status) ? 'bdg-c' : 'bdg-ok'}" style="margin-left:auto;margin-right:6px;">${esc(s.status)}</span>
        <button class="act" data-service-view="${i}" data-service-group="${esc(group)}">View</button></div>`).join('');
    }).join('');

    // information
    $('info-left').innerHTML = `<div class="sec">Personal</div>${editRows(p.info.personal, 'p')}<div class="sec">Contact</div>${editRows(p.info.contact, 'c')}`;
    $('info-right').innerHTML = `<div class="sec">Address</div>${editRows(p.info.address, 'a')}<div class="sec">Business</div>${editRows(p.info.business, 'b')}`;

    // risk
    $('cr-score').textContent = p.score;
    $('cr-band').textContent = p.band;
    $('cr-band').className = p.score >= 700 ? 'up' : p.score >= 600 ? 'wn' : 'dn';
    $('cr-desc').textContent = p.credit.description || `Tier ${cl.riskTier} · grade ${cl.relationshipGrade}. Composite exposure ${cl.risk.overall}/100.`;
    $('cr-range').innerHTML = [
      ['Poor', '300–499', 'danger'], ['Fair', '500–599', 'warning'], ['Good', '600–699', 'warning'], ['Very good', '700–799', 'success'], ['Excellent', '800–900', 'success']
    ].map(([label, range, tone], i) => {
      const active = (p.score < 500 && i === 0) || (p.score >= 500 && p.score < 600 && i === 1) || (p.score >= 600 && p.score < 700 && i === 2) || (p.score >= 700 && p.score < 800 && i === 3) || (p.score >= 800 && i === 4);
      return `<div class="sr" style="background:var(--${tone}-bg);color:var(--${tone});${active ? 'font-weight:700;outline:1.5px solid var(--' + tone + ');' : ''}">${label}${active ? ' ←' : ''}<br>${range}</div>`;
    }).join('');
    $('cr-factors').innerHTML = p.factors.map((f) => `<div class="factor"><div class="f-lbl">${esc(f.label)}</div>
      <div class="f-bar"><div class="f-fill" style="width:${Math.min(100, f.pct)}%;background:${f.good ? '#568418' : '#a06216'};"></div></div>
      <div class="f-val ${f.good ? 'up' : 'wn'}">${esc(f.text)}</div></div>`).join('');
    $('cr-oblig').innerHTML = rows([['Facility drawn', money(used)], ['Card exposure', money(Math.round(p.outflow * 0.24))], ['Total obligations', money(used + Math.round(p.outflow * 0.24))]]);
    $('cr-capacity').innerHTML = rows([['Total available', money(cl.creditLimit)], ['Currently used', money(used)], ['Free capacity', money(Math.max(0, cl.creditLimit - used))]]);
    $('cr-aml').innerHTML = p.aml.map((item) => `<div class="field-r"><span class="field-lbl">${esc(item.label)}</span><span class="field-val ${item.good ? 'up' : 'dn'}">${esc(item.value)}</span></div>`).join('');
    $('cr-incidents').innerHTML = p.incidents.map((i) => `<tr><td>${esc(i.date)}</td><td>${esc(i.type)}</td><td><span class="tag ${i.status === 'Open' ? 'tp' : 'tc'}">${esc(i.status)}</span></td></tr>`).join('');

    // billing
    renderInvoices();

    // spending
    const spendingView = p.spending.map((item) => {
      const previous = Number(item.prev == null ? item.previous == null ? item.value : item.previous : item.prev) || 0;
      return {
        ...item, prev: previous,
        pct: item.pct == null ? Math.round((Number(item.value) || 0) / Math.max(1, p.outflow) * 100) : Number(item.pct),
        change: item.change == null ? Math.round(((Number(item.value) || 0) - previous) / Math.max(1, previous) * 100) : Number(item.change)
      };
    });
    $('spend-metrics').innerHTML = [
      met('Total outflow', money(p.outflow), 'Current cycle', 'neu'),
      met('Largest category', spendingView[0]?.label || '—', spendingView[0] ? `${money(spendingView[0].value)} · ${spendingView[0].pct}%` : 'No spending', 'neu'),
      met('Net cash flow', signed(p.netFlow), p.netFlow >= 0 ? 'Positive' : 'Negative', p.netFlow >= 0 ? 'up' : 'dn'),
      met('Available', money(cl.available), `${100 - p.utilization}% free`, cl.available > 0 ? 'up' : 'dn')
    ].join('');
    $('spend-rows').innerHTML = spendingView.map((s) => `<tr class="clickable-row" data-spending="${esc(s.label)}"><td>${esc(s.label)}</td><td>${money(s.value)}</td><td>${money(s.prev)}</td><td class="${s.change > 0 ? 'dn' : s.change < 0 ? 'up' : 'neu'}">${s.change > 0 ? '+' : ''}${s.change}%</td><td>${s.pct}%</td></tr>`).join('');
    $('flow-rows').innerHTML = p.flow.map((f, i) => `<tr${i === p.flow.length - 1 ? ' style="font-weight:600;"' : ''}><td>${esc(f.month)}</td><td class="up">${money(f.inflow)}</td><td class="dn">${money(f.outflow)}</td><td class="${f.net >= 0 ? 'up' : 'dn'}">${signed(f.net)}</td><td>${money(f.balance)}</td></tr>`).join('');

    // cards
    $('card-h1').textContent = p.cards[0] ? `*${p.cards[0].last4}` : 'Card 1';
    $('card-h2').textContent = p.cards[1] ? `*${p.cards[1].last4}` : 'Other';
    $('card-metrics').innerHTML = p.cards.slice(0, 2).map((card) => met(`${card.name} *${card.last4}`, card.limit || 'Corporate', `${card.network || ''} · ${card.status}`, 'neu')).join('');
    const firstCard = p.cards[0]?.last4;
    const cardCats = [...new Set(p.cardTx.map((tx) => tx.category).filter(Boolean))].map((category) => {
      const categoryRows = p.cardTx.filter((tx) => tx.category === category);
      const a = categoryRows.filter((tx) => !firstCard || String(tx.card || '').includes(firstCard)).reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0);
      const total = categoryRows.reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0);
      return { category, a, b: total - a, total };
    });
    $('card-cats').innerHTML = cardCats.map((c2) => `<tr><td>${esc(c2.category)}</td><td class="dn">${c2.a ? money(c2.a) : '—'}</td><td class="dn">${c2.b ? money(c2.b) : '—'}</td><td style="font-weight:600;">${money(c2.total)}</td></tr>`).join('');
    $('card-rows').innerHTML = p.cardTx.map((t, i) => `<tr class="clickable-row" data-tx="card:${i}"><td>${esc(t.date)}</td><td>${esc(t.merchant)}</td><td>${esc(t.card)}</td><td class="${t.amount >= 0 ? 'up' : 'dn'}">${signed(t.amount)}</td><td><span class="tag ${t.status === 'Cleared' ? 'tc' : t.status === 'Declined' ? 'td' : 'tp'}">${esc(t.status)}</span></td></tr>`).join('');

    // fees
    const charged = p.fees.reduce((s, f) => s + f.amount, 0);
    $('fee-metrics').innerHTML = [
      met('Fees this period', money(charged), `${p.fees.length} items`, 'dn'),
      met('Bank liable', money(p.fees.filter((f) => f.status === 'Bank liable').reduce((s, f) => s + f.amount, 0)), 'Not client cost', 'up'),
      met('Waived', String(p.fees.filter((f) => f.status === 'Waived').length), 'Goodwill gesture', 'up'),
      met('Open disputes', String(p.cardTx.filter((t) => t.status === 'Disputed').length), 'Card services', 'wn')
    ].join('');
    $('fee-items').innerHTML = p.fees.map((f, i) => `<div class="pen-item clickable-row" data-tx="fee:${i}"><div class="pen-l"><div class="pen-type">${esc(f.type)}</div><div class="pen-det">${esc(f.detail)}</div></div>
      <div class="pen-r"><div class="pen-amt ${f.amount ? '' : 'neu'}">${f.amount ? '-' + money(f.amount) : '$0 client'}</div><span class="tag ${f.status === 'Charged' ? 'td' : f.status === 'Waived' ? 'tc' : 'tf'}">${esc(f.status)}</span></div></div>`).join('');
    $('fee-summary').innerHTML = p.flow.slice(-4).map((f) => {
      const ch = Math.round(25 + Math.abs(f.net) * 0.0008);
      return `<tr><td>${esc(f.month)}</td><td>${money(ch)}</td><td>—</td><td class="dn">-${money(ch)}</td></tr>`;
    }).join('');

    // cards & PIN
    renderWallet();

    // company website
    renderSite();

    // emails
    $('compose-to').textContent = cl.email;
    renderEmails();

    // log + contacts + recos
    renderLog();
    renderContacts();
    $('reco-engine').textContent = `Score ${p.score} · tier ${cl.riskTier} · grade ${cl.relationshipGrade} · composite exposure ${cl.risk.overall}/100`;
    $('reco-list').innerHTML = p.recos.map((r) => {
      const tone = r.level === 'growth' ? 'g' : r.level === 'watch' ? 'w' : 'b';
      return `<div class="reco-item ${tone}"><div class="ri-ico"><i class="ti ${r.level === 'growth' ? 'ti-star' : 'ti-alert-triangle'}"></i></div><div><div class="ri-title">${esc(r.title)}</div><div class="ri-desc">${esc(r.detail)}</div></div></div>`;
    }).join('');

    showTab('ov');
    drawCharts();
  }

  function met(label, value, sub, tone) {
    return `<div class="met"><div class="met-lbl">${esc(label)}</div><div class="met-val">${esc(value)}</div><div class="met-sub ${tone || 'neu'}">${esc(sub)}</div></div>`;
  }
  function rows(list) {
    return list.map(([label, value]) => `<div class="field-r"><span class="field-lbl">${esc(label)}</span><span class="field-val">${esc(value)}</span></div>`).join('');
  }
  function editRows(list, prefix) {
    return (list || []).map((item, i) => `<div class="field-r"><span class="field-lbl">${esc(item.label)}</span><span class="field-val${/phone/i.test(item.label) ? ' phone-link' : ''}" id="fi-${prefix}${i}"${/phone/i.test(item.label) ? ' data-phone-call="1"' : ''}>${esc(item.value)}</span>${item.editable ? `<span class="field-edit" data-edit="fi-${prefix}${i}">Edit</span>` : ''}</div>`).join('');
  }
  function logRow(l) {
    return `<div class="log-item clickable-row" data-log="${esc(l.id || '')}"><div class="log-ico" style="background:var(--${l.tone}-bg);"><i class="ti ${l.icon}" style="color:var(--${l.tone});font-size:12px;"></i></div>
      <div><div class="log-who">${esc(l.who)}</div><div class="log-det">${esc(l.detail)}</div></div><div class="log-time">${esc(l.time)}</div></div>`;
  }

  function renderStatements() {
    const period = $('stmt-period').value.split(' ')[0].slice(0, 3);
    const type = $('stmt-type').value;
    const list = state.profile.statements.filter((s) => {
      const periodMatch = !period || String(s.date || '').startsWith(period);
      const typeMatch = type === 'All types' || (type === 'Credits' && s.type === 'Credit') || (type === 'Debits' && s.type === 'Debit') || (type === 'Pending' && !['Credit', 'Debit'].includes(s.type));
      return periodMatch && typeMatch;
    });
    $('stmt-rows').innerHTML = list.map((s) => {
      const index = state.profile.statements.indexOf(s);
      return `<tr class="clickable-row" data-tx="stmt:${index}"><td>${esc(s.date)}</td><td>${esc(s.description)}</td><td><span class="tag ${s.type === 'Credit' ? 'tc' : s.type === 'Debit' ? 'td' : 'tp'}">${esc(s.type)}</span></td><td class="${s.amount >= 0 ? 'up' : 'dn'}">${signed(s.amount)}</td><td>${money(s.balance)}</td></tr>`;
    }).join('');
  }

  function renderInvoices() {
    const p = state.profile;
    $('bill-rows').innerHTML = p.billing.map((b, i) => `<tr class="clickable-row" data-tx="bill:${i}"><td>${esc(b.id)}</td><td>${esc(b.description)}</td><td>${esc(b.due)}</td><td>${money(b.amount)}</td><td><span class="tag ${b.status === 'Paid' ? 'tc' : 'tp'}">${esc(b.status)}</span></td></tr>`).join('');
    const billed = p.billing.reduce((sum, b) => sum + Number(b.amount || 0), 0);
    $('bill-metrics').innerHTML = [
      met('Billed this cycle', money(billed), `${p.billing.length} invoices`, 'neu'),
      met('Outstanding', money(p.billing.filter((b) => b.status !== 'Paid').reduce((sum, b) => sum + Number(b.amount || 0), 0)), 'Pending collection', 'wn'),
      met('On-time rate', `${p.onTime}%`, 'Rolling 12 months', 'up')
    ].join('');
  }

  function renderContacts() {
    const filter = $('contact-filter').value;
    const list = state.profile.contacts.filter((contact) => filter === 'All contacts' ||
      (filter === 'Calls' && /call/i.test(contact.channel)) ||
      (filter === 'Emails' && /email/i.test(contact.channel)) ||
      (filter === 'In-person' && /in-person/i.test(contact.channel)));
    $('contacts-list').innerHTML = list.map((contact) => `<div class="contact-item ${contact.status === 'Open' ? 'open' : ''}">
      <div class="contact-head"><div class="contact-title"><i class="ti ${/call/i.test(contact.channel) ? 'ti-phone' : /email/i.test(contact.channel) ? 'ti-mail' : 'ti-calendar'}"></i> ${esc(contact.channel)}</div><div class="contact-when">${esc(contact.when)}</div></div>
      <div class="contact-agent">${esc(contact.agent)}</div><div class="contact-body">${esc(contact.body)}</div>
      <div class="contact-status">Status: <span class="${contact.status === 'Completed' ? 'up' : 'wn'}">${esc(contact.status)}</span></div></div>`).join('');
  }

  function renderLog() {
    $('log-list').innerHTML = state.profile.log.map(logRow).join('');
  }

  function renderEmails() {
    const filter = $('email-filter').value;
    const list = state.profile.emails.filter((email) => filter === 'All' ||
      (filter === 'Sent' && email.direction === 'outbound') ||
      (filter === 'Received' && email.direction === 'inbound'));
    $('email-list').innerHTML = list.map((e, i) => `<div class="email-item">
      <div class="email-top"><div class="email-from"><i class="ti ti-arrow-${e.direction === 'inbound' ? 'left' : 'right'}"></i> ${esc(e.from)}</div><div class="email-date">${esc(e.date)}</div></div>
      <div class="email-subj"${e.urgent ? ' style="color:var(--danger);font-weight:700;"' : ''}>${esc(e.subject)}</div>
      <div class="email-preview">${esc(e.preview)}</div>
      <div class="email-actions"><button class="act" data-email-view="${esc(e.id)}">View thread</button><button class="act accent" data-reply="${esc(e.id)}">Reply</button></div></div>`).join('');
  }

  function openEmailThread(id) {
    const email = state.profile.emails.find((item) => String(item.id) === String(id));
    if (!email) return;
    $('email-modal-title').textContent = email.subject;
    $('email-modal-body').innerHTML = `<div class="email-thread"><div class="email-thread-meta"><strong>${esc(email.from)}</strong><span>${esc(email.date)}</span></div><div class="email-thread-to">To: ${esc(email.to || state.active.client.email)}</div><div class="email-thread-body">${esc(email.body || email.preview)}</div></div>`;
    open('email-modal');
  }

  function startCompose(replyId) {
    const email = replyId ? state.profile.emails.find((item) => String(item.id) === String(replyId)) : null;
    $('compose-lbl').textContent = email ? 'Reply' : 'New email';
    $('compose-subject').value = email ? (/^Re:/i.test(email.subject) ? email.subject : `Re: ${email.subject}`) : `Case update — ${state.active.id}`;
    $('compose-txt').value = '';
    $('compose-txt').placeholder = 'Write your email in professional English. Acknowledge, state the action taken and confirm the next step.';
    if ($('compose-coach')) {
      $('compose-coach').style.color = 'var(--text2)';
      $('compose-coach').textContent = 'Type your own email. Include a natural opening, one connector, one precise case term, the action taken and a timed next step. Paste and drag/drop are disabled.';
    }
    $('compose-box').classList.add('open');
    $('compose-txt').focus();
    deskGuideMark('compose');
  }

  /* ─────────────── CHARTS ─────────────── */

  function drawCharts() {
    if (!state.profile) return;
    try {
      donut($('spend-donut'), state.profile.spending);
      bars($('spend-flow'), state.profile.flow);
    } catch (_) { /* charts are decorative; the tables carry the same data */ }
  }

  function setupCanvas(canvas) {
    if (!canvas || typeof canvas.getContext !== 'function') return null;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = rect.width || canvas.parentElement.clientWidth || 320;
    const height = canvas.height || 180;
    canvas.width = width * ratio; canvas.height = height * ratio;
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return { ctx, width, height };
  }

  function donut(canvas, data) {
    const surface = setupCanvas(canvas);
    if (!surface) return;
    const { ctx, width, height } = surface;
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    const radius = Math.min(width, height) * 0.32, cx = width / 2, cy = height / 2;
    let angle = -Math.PI / 2;
    data.forEach((item, i) => {
      const arc = (item.value / total) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(cx, cy, radius, angle, angle + arc);
      ctx.strokeStyle = CHART_COLORS[i % CHART_COLORS.length]; ctx.lineWidth = radius * 0.42; ctx.stroke();
      angle += arc;
    });
    ctx.fillStyle = '#15150f'; ctx.font = '600 16px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(money(total), cx, cy + 2);
    ctx.fillStyle = '#6f6e67'; ctx.font = '600 9px Inter, sans-serif';
    ctx.fillText('TOTAL OUTFLOW', cx, cy + 16);
    $('spend-legend').innerHTML = data.map((d, i) => `<span style="display:inline-flex;align-items:center;gap:4px;"><i style="width:8px;height:8px;border-radius:2px;background:${CHART_COLORS[i % CHART_COLORS.length]};display:inline-block;"></i>${esc(d.label)} · ${money(d.value)}</span>`).join('');
  }

  function bars(canvas, flow) {
    const surface = setupCanvas(canvas);
    if (!surface) return;
    const { ctx, width, height } = surface;
    const padL = 46, padB = 18, zero = (height - padB) / 2 + 6;
    const max = Math.max(...flow.map((f) => Math.abs(f.net)), 1);
    ctx.strokeStyle = '#d9d6cd'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, zero); ctx.lineTo(width - 8, zero); ctx.stroke();
    const slot = (width - padL - 12) / flow.length;
    ctx.textAlign = 'center';
    flow.forEach((f, i) => {
      const h = (Math.abs(f.net) / max) * ((height - padB) / 2 - 12);
      const x = padL + i * slot + slot * 0.2;
      ctx.fillStyle = f.net >= 0 ? '#33610e' : '#932727';
      ctx.fillRect(x, f.net >= 0 ? zero - h : zero, slot * 0.6, h);
      ctx.fillStyle = '#6f6e67'; ctx.font = '9px Inter, sans-serif';
      ctx.fillText(f.month.slice(0, 3), x + slot * 0.3, height - 4);
    });
    ctx.textAlign = 'right'; ctx.fillStyle = '#6f6e67'; ctx.font = '9px Inter, sans-serif';
    ctx.fillText(money(max), padL - 6, 14);
    ctx.fillText('-' + money(max), padL - 6, height - padB - 2);
  }

  /* ─────────────── DETAIL MODALS ─────────────── */

  function openDetail(ref) {
    const [kind, idxRaw] = ref.split(':');
    const idx = Number(idxRaw);
    const p = state.profile;
    let d = null;
    if (kind === 'stmt' || kind === 'card') {
      const tx = kind === 'stmt' ? p.statements[idx] : p.cardTx[idx];
      if (!tx) return;
      d = {
        title: tx.merchant || tx.description, status: tx.status, ref: tx.reference || tx.id,
        date: tx.datetime || tx.date, merchant: tx.merchant || tx.description, category: tx.category || tx.type,
        account: [tx.account, tx.card].filter(Boolean).join(' · '), rows: (tx.taxLines || []).map((line) => [line.label, money(line.amount)]),
        total: tx.totalLabel || signed(tx.amount), tone: tx.status === 'Cleared' ? (tx.amount >= 0 ? 'success' : 'danger') : 'warning',
        note: tx.note || 'No additional notes.', flags: tx.flags || [], city: tx.city, country: tx.country,
        lat: tx.lat, lng: tx.lng, channel: tx.channel, terminal: tx.terminal, authorization: tx.authorization,
        descriptor: tx.descriptor, mcc: tx.merchantCategory, merchantPhone: tx.merchantPhone,
        merchantSite: tx.merchantSite, merchantAddress: tx.merchantAddress,
        disputeWindow: tx.disputeWindow, originalRef: tx.originalRef
      };
    } else if (kind === 'bill') {
      const b = p.billing[idx]; if (!b) return;
      d = {
        title: b.description, status: b.status, ref: b.id, date: `Due ${b.due}`,
        merchant: 'Kamuk Holdings', category: 'Corporate billing', account: state.active.client.id,
        rows: (b.taxLines || []).map((line) => [line.label, money(line.amount)]),
        total: `${money(b.amount)} ${b.status.toLowerCase()}`, tone: b.status === 'Paid' ? 'success' : 'warning',
        note: b.note || 'Corporate invoice.'
      };
    } else if (kind === 'fee') {
      const fee = p.fees[idx]; if (!fee) return;
      d = {
        title: fee.type, status: fee.status, ref: fee.id, date: fee.detail,
        merchant: 'Kamuk Holdings', category: 'Fee or penalty', account: state.active.client.id,
        rows: [['Fee amount', money(fee.amount)], ['Liability', fee.liability || 'Not specified']],
        total: money(fee.amount), tone: fee.amount ? 'danger' : 'success', note: fee.detail
      };
    }
    if (!d) return;
    $('modal-title').textContent = d.title;
    $('modal-body').innerHTML = `
      <div style="background:var(--${d.tone}-bg);border-radius:var(--radius);padding:8px 10px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12.5px;font-weight:700;color:var(--${d.tone});">${esc(d.status)}</span>
        <span style="font-size:11.5px;color:var(--text3);">${esc(d.ref)}</span></div>
      <div class="modal-section"><div class="modal-section-title">Transaction info</div>
        <div class="modal-row"><span class="modal-row-lbl">Date</span><span class="modal-row-val">${esc(d.date)}</span></div>
        <div class="modal-row"><span class="modal-row-lbl">Counterparty</span><span class="modal-row-val">${esc(d.merchant)}</span></div>
        <div class="modal-row"><span class="modal-row-lbl">Category</span><span class="modal-row-val">${esc(d.category)}</span></div>
        <div class="modal-row"><span class="modal-row-lbl">Account / card</span><span class="modal-row-val">${esc(d.account)}</span></div>
        ${d.channel ? `<div class="modal-row"><span class="modal-row-lbl">Channel / terminal</span><span class="modal-row-val">${esc([d.channel, d.terminal].filter(Boolean).join(' · '))}</span></div>` : ''}
        ${d.authorization ? `<div class="modal-row"><span class="modal-row-lbl">Authorization</span><span class="modal-row-val">${esc(d.authorization)}</span></div>` : ''}</div>
      ${d.descriptor || d.merchantPhone || d.merchantSite ? `<div class="modal-section"><div class="modal-section-title">Merchant</div>
        <div class="modal-row"><span class="modal-row-lbl">Trading name</span><span class="modal-row-val">${esc(d.merchant)}</span></div>
        ${d.descriptor ? `<div class="modal-row"><span class="modal-row-lbl">Statement descriptor</span><span class="modal-row-val">${esc(d.descriptor)}</span></div>` : ''}
        ${d.mcc ? `<div class="modal-row"><span class="modal-row-lbl">Merchant category (MCC)</span><span class="modal-row-val">${esc(d.mcc)}</span></div>` : ''}
        ${d.merchantAddress ? `<div class="modal-row"><span class="modal-row-lbl">Location</span><span class="modal-row-val">${esc(d.merchantAddress)}</span></div>` : ''}
        ${d.merchantPhone ? `<div class="modal-row"><span class="modal-row-lbl">Merchant phone</span><span class="modal-row-val">${esc(d.merchantPhone)}</span></div>` : ''}
        ${d.merchantSite ? `<div class="modal-row"><span class="modal-row-lbl">Merchant website</span><span class="modal-row-val">${esc(d.merchantSite)}</span></div>` : ''}
        ${d.disputeWindow ? `<div class="modal-row"><span class="modal-row-lbl">Dispute window</span><span class="modal-row-val">${esc(d.disputeWindow)}</span></div>` : ''}
        ${d.originalRef ? `<div class="modal-row"><span class="modal-row-lbl">Refund of</span><span class="modal-row-val">${esc(d.originalRef)}</span></div>` : ''}</div>` : ''}
      <div class="modal-section"><div class="modal-section-title">Cost breakdown</div>
        ${d.rows.map((r) => `<div class="modal-row"><span class="modal-row-lbl">${esc(r[0])}</span><span class="modal-row-val">${esc(r[1])}</span></div>`).join('')}
        <div class="modal-total"><span>Total</span><span style="color:var(--${d.tone});">${esc(d.total)}</span></div></div>
      ${d.city || d.country ? `<div class="modal-section"><div class="modal-section-title">Fictional transaction location</div><div class="geo-panel"><i class="ti ti-map-pin"></i><strong>${esc([d.city, d.country].filter(Boolean).join(', '))}</strong><span>${esc(`${d.lat}, ${d.lng}`)}</span></div></div>` : ''}
      <div class="modal-section"><div class="modal-section-title">Notes &amp; flags</div>
        <div style="font-size:11.5px;color:var(--text2);line-height:1.6;background:var(--surface1);border-radius:var(--radius);padding:8px 10px;">${esc(d.note)}</div></div>
      ${d.flags && d.flags.length ? `<div class="detail-flags">${d.flags.map(esc).join(' · ')}</div>` : ''}`;
    open('tx-modal');
  }

  function openCategory(category) {
    const matches = [...state.profile.transactions, ...state.profile.cardTx].filter((tx) =>
      String(tx.category || '').toLowerCase().includes(String(category).toLowerCase()) ||
      String(tx.description || '').toLowerCase().includes(String(category).toLowerCase()));
    $('modal-title').textContent = `${category} transactions`;
    $('modal-body').innerHTML = matches.length ? `<table class="tbl"><thead><tr><th>Date</th><th>Merchant</th><th>Amount</th><th>Status</th></tr></thead><tbody>${matches.map((tx) => `<tr><td>${esc(tx.date)}</td><td>${esc(tx.merchant || tx.description)}</td><td class="${tx.amount >= 0 ? 'up' : 'dn'}">${signed(tx.amount)}</td><td>${esc(tx.status)}</td></tr>`).join('')}</tbody></table>` : '<p class="empty-state">No matching transactions in this case pack.</p>';
    open('tx-modal');
  }

  function openLog(id) {
    const item = state.profile.log.find((entry) => String(entry.id) === String(id));
    if (!item) return;
    $('modal-title').textContent = item.who;
    $('modal-body').innerHTML = `<div class="modal-section"><div class="modal-row"><span class="modal-row-lbl">When</span><span class="modal-row-val">${esc(item.time)}</span></div></div><div class="email-thread-body">${esc(item.detail)}</div>`;
    open('tx-modal');
  }

  function openService(group, index) {
    const item = state.profile.services.filter((service) => service.group === group)[Number(index)];
    if (!item) return;
    $('modal-title').textContent = item.name;
    $('modal-body').innerHTML = `<div class="modal-row"><span class="modal-row-lbl">Group</span><span class="modal-row-val">${esc(item.group)}</span></div><div class="modal-row"><span class="modal-row-lbl">Status</span><span class="modal-row-val">${esc(item.status)}</span></div><div class="email-thread-body">${esc(item.detail)}</div>`;
    open('tx-modal');
  }

  /* ─────────────── ACTIONS ─────────────── */

  const SOFT = {
    acknowledge: ['Acknowledge & own', 'Write the exact sentence you would use to acknowledge the impact and take ownership.', 'Empathy + ownership + action. Never a generic apology.'],
    'ask-open': ['Open question', 'Write the exact open question you would ask the client.', 'Start with What, How, Tell me or Describe.'],
    'ask-closed': ['Closed question', 'Write the exact fact-confirming question you would ask.', 'Confirm one specific fact or decision.'],
    escalate: ['Escalate case', 'State the accountable desk, why you are escalating and the committed timeline.', 'Name the desk, the owner and a realistic ETA.'],
    'file-sar': ['Suspicious Activity Report', 'Document the observed pattern and why it requires review.', 'Objective facts only. Never state the client is guilty and never tip off the client.'],
    'verify-id': ['Identity verification', 'Write the two verification questions you asked and the answers the client confirmed.', 'Two data points on file. Never ask for the PIN, the full card number or a code sent to the client.']
  };

  function openEvidence(key) {
    const conf = SOFT[key]; if (!conf) return;
    state.pendingEvidence = key;
    $('ev-title').textContent = conf[0];
    $('ev-help').textContent = conf[1];
    $('ev-tip').textContent = conf[2];
    $('ev-text').value = '';
    open('ev-modal');
    setTimeout(() => $('ev-text').focus(), 50);
  }

  function confirmEvidence() {
    const key = state.pendingEvidence;
    const text = $('ev-text').value.trim();
    if (text.length < 15) return toast('Write the exact professional wording (15 characters minimum).', true);
    recordAction(key, SOFT[key][0], text);
    document.querySelector(`[data-soft="${key}"]`)?.classList.add('done');
    if (key === 'verify-id') {
      state.identityVerified = true;
      state.verificationSource = 'Verified on this contact — two questions confirmed against the record.';
      pushCardEvent('ti-id-badge-2', 'success', 'Client identity verified', text);
      renderWallet();
      deskGuideMark('verify');
    }
    close('ev-modal');
  }

  function triggerDanger(payload) {
    const [key, title, msg] = payload.split('|');
    state.pendingDanger = key;
    $('cf-title').textContent = title;
    $('cf-msg').textContent = msg;
    $('confirm').classList.add('show');
  }

  function confirmDanger() {
    const key = state.pendingDanger;
    $('confirm').classList.remove('show');
    if (!key) return;
    const labels = {
      freeze: ['Account frozen', 'Frozen', 'bdg-c'], suspend: ['Services suspended', 'Suspended', 'bdg-c'],
      fraud: ['Flagged for fraud — Compliance notified', 'Flagged', 'bdg-aml'], close: ['Account closure initiated', 'Closed', 'bdg-c']
    };
    const [label, badge, cls] = labels[key] || ['Action completed', 'Active', 'bdg-ok'];
    $('v2-status').textContent = badge; $('v2-status').className = 'bdg ' + cls;
    recordAction(key, label);
    state.pendingDanger = null;
  }

  function recordAction(key, label, detail) {
    const event = { key, label, detail: detail || '', at: new Date().toISOString() };
    state.actions.push(event);
    addLog('ti-check', 'accent', label, detail || `Recorded by ${state.employee.name} · ${state.employee.id}`);
    updateActionCount();
    toast(`${label} recorded.`);
    if (!state.preview && !state.guide && state.active) {
      trackSync(api(crmPath('/case/event'), { method: 'POST', body: { caseId: state.active.id, type: key === 'email-client' ? 'email-client' : 'action', payload: event } })
        .catch(() => toast('Action stored locally; the desk will retry the sync.', true)));
    }
  }

  function trackSync(promise) {
    state.pendingSyncs.push(promise);
    promise.finally(() => {
      const index = state.pendingSyncs.indexOf(promise);
      if (index >= 0) state.pendingSyncs.splice(index, 1);
    });
    return promise;
  }

  function addLog(icon, tone, who, detail) {
    const now = new Date();
    const entry = { id: `LOCAL-${Date.now()}`, icon, tone, who, detail, time: `Today ${pad(now.getHours())}:${pad(now.getMinutes())}` };
    if (state.profile) {
      state.profile.log.unshift(entry);
      renderLog();
    }
  }

  function updateActionCount() { $('action-count').textContent = `(${state.actions.length})`; }

  function saveRisk() {
    const type = $('risk-type').value, probability = $('risk-prob').value, impact = $('risk-impact').value, amlStage = $('risk-aml').value;
    if (!type || !probability || !impact) return toast('Select risk type, probability and impact.', true);
    state.risk = { type, probability, impact, amlStage };
    recordAction(`${type.toLowerCase()}-risk`, `Risk classified — ${type}`, `${probability} probability · ${impact} impact${amlStage ? ` · ${amlStage}` : ''}`);
  }

  function runCredit() {
    showTab('risk');
    $('cr-content').style.display = 'none';
    $('cr-loading').style.display = 'block';
    setTimeout(() => {
      $('cr-loading').style.display = 'none';
      $('cr-content').style.display = 'block';
      recordAction('credit-report', 'Verified credit report pulled', `Score ${state.profile.score} · tier ${state.active.client.riskTier}`);
    }, 1400);
  }

  function sendEmail() {
    const text = $('compose-txt').value.trim();
    const subject = $('compose-subject').value.trim();
    const lower = text.toLowerCase();
    const connectors = ['because', 'therefore', 'however', 'although', 'in addition', 'as a result', 'while'];
    const naturalOpenings = ['dear ', 'hello ', 'hi '];
    const timedStep = /\b(today|tomorrow|within|by\s+\d|by\s+(monday|tuesday|wednesday|thursday|friday)|business day|a\.m\.|p\.m\.)\b/i;
    if (!subject) return toast('Add an email subject.', true);
    if (text.split(/\s+/).filter(Boolean).length < 45) return toast('Write at least 45 words in your own professional English.', true);
    if (!naturalOpenings.some((opening) => lower.startsWith(opening))) return toast('Start with a natural greeting: Dear, Hello or Hi + client name.', true);
    if (!connectors.some((connector) => lower.includes(connector))) return toast('Use at least one connector naturally: because, however, therefore, although or in addition.', true);
    if (!timedStep.test(text)) return toast('Include a timed next step: today, tomorrow, within X days or by a specific time.', true);
    const now = new Date();
    state.profile.emails.unshift({
      id: `LOCAL-${Date.now()}`, direction: 'outbound', from: `${state.employee.id.toLowerCase()}@kamukholdings.com`,
      to: state.active.client.email, date: `Today ${pad(now.getHours())}:${pad(now.getMinutes())}`,
      subject, body: text, preview: text.slice(0, 160)
    });
    renderEmails();
    $('compose-box').classList.remove('open');
    $('compose-txt').value = ''; $('compose-subject').value = '';
    recordAction('email-client', 'Email sent to client', text);
    deskGuideMark('email');
  }

  function addNote(channel, status, text) {
    const now = new Date();
    const note = { id: `LOCAL-${Date.now()}`, channel, text, at: now.toISOString(), status };
    state.notes.push(note);
    state.profile.contacts.unshift({ id: note.id, channel, when: `Today ${pad(now.getHours())}:${pad(now.getMinutes())}`, agent: `${state.employee.name} · ${state.employee.id}`, body: text, status });
    localStorage.setItem(`kamuk-crm-notes-${state.active.id}`, JSON.stringify(state.notes));
    renderContacts();
    if (!state.preview && !state.guide) {
      trackSync(api(crmPath('/case/event'), { method: 'POST', body: { caseId: state.active.id, type: 'note', payload: note } }).catch(() => {}));
    }
    return note;
  }

  function saveNote() {
    const text = $('note-txt').value.trim();
    if (text.length < 15) return toast('Document at least 15 characters of factual evidence.', true);
    addNote($('note-type').value, $('note-status').value, text);
    $('note-form').style.display = 'none'; $('note-txt').value = '';
    if (!state.actions.some((a) => a.key === 'note')) recordAction('note', 'Professional documentation added', text);
    else { addLog('ti-note', 'accent', 'Contact note added', text); toast('Note saved to the client record.'); }
    deskGuideMark('note');
  }

  function generateInvoice() {
    const invoice = {
      id: `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
      description: 'Desk-generated service invoice', due: 'Aug 30', amount: 0, status: 'Draft',
      taxLines: [{ label: 'Draft amount', amount: 0 }], note: 'Generated by the assigned executive.'
    };
    state.profile.billing.unshift(invoice);
    renderInvoices();
    recordAction('invoice', 'Invoice generated', invoice.id);
  }

  function sendReminder() {
    const invoice = state.profile.billing.find((item) => item.status !== 'Paid');
    if (!invoice) return toast('There are no outstanding invoices.', true);
    invoice.reminderSent = new Date().toISOString();
    invoice.status = invoice.status === 'Draft' ? 'Draft · reminder sent' : 'Reminder sent';
    renderInvoices();
    recordAction('reminder', 'Payment reminder sent', invoice.id);
  }

  function exportStatements() {
    const rows = [['Date', 'Description', 'Type', 'Amount', 'Currency', 'Status', 'Balance'], ...state.profile.statements.map((s) => [s.date, s.description, s.type, s.amount, s.currency || 'USD', s.status, s.balance])];
    const csv = rows.map((row) => row.map((value) => `"${String(value == null ? '' : value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = `${state.active.id}-statements.csv`; link.click();
    URL.revokeObjectURL(url);
    toast('Statement CSV exported.');
  }

  /* ─────────────── CARDS, PIN AND COMPANY WEBSITE ─────────────── */

  function cardBrand(card) {
    const network = String(card.network || card.name || '');
    if (/visa/i.test(network)) return 'Visa';
    if (/master/i.test(network)) return 'Mastercard';
    if (/amex|american express/i.test(network)) return 'American Express';
    if (/discover/i.test(network)) return 'Discover';
    return network.split(' ')[0] || 'Corporate';
  }

  function cardSeed(card, index) {
    let seed = index + 7;
    `${card.holder || ''}${card.name || ''}${card.last4 || ''}`.split('').forEach((ch) => { seed = (seed * 31 + ch.charCodeAt(0)) % 997; });
    return seed;
  }

  function cardTail(card, index) {
    const last4 = String(card.last4 || '0000').slice(-4);
    return `${pad(10 + (cardSeed(card, index) % 90))}${last4}`;
  }

  function cardExpiry(card, index) {
    const seed = cardSeed(card, index);
    return `${pad(1 + (seed % 12))}/${28 + (seed % 3)}`;
  }

  function cardTone(card) {
    const name = `${card.name || ''} ${card.network || ''}`;
    if (/obsidian|black|infinite/i.test(name)) return 'obsidian';
    if (/platinum|world|signature/i.test(name)) return 'platinum';
    return 'corporate';
  }

  function brandMark(brand) {
    if (brand === 'Visa') return '<span class="wf-visa">VISA</span>';
    if (brand === 'Mastercard') return '<span class="wf-mc"><i></i><i></i></span>';
    if (brand === 'American Express') return '<span class="wf-amex">AMERICAN EXPRESS</span>';
    return `<span class="wf-generic">${esc(brand)}</span>`;
  }

  function pushCardEvent(icon, tone, who, detail) {
    const now = new Date();
    state.cardEvents.unshift({ id: `CARD-${Date.now()}`, icon, tone, who, detail, time: `Today ${pad(now.getHours())}:${pad(now.getMinutes())}` });
  }

  function autoVerifyByChannel() {
    if (state.guide) return;
    const clientEmail = String(state.active?.client?.email || '').toLowerCase();
    const inbound = (state.profile?.emails || []).find((email) => email.direction === 'inbound' && String(email.from || '').toLowerCase() === clientEmail);
    if (!clientEmail || !inbound) return;
    state.identityVerified = true;
    state.verificationSource = `Authenticated channel — the client wrote from ${inbound.from}, the address on file.`;
    pushCardEvent('ti-mail-check', 'success', 'Identity authenticated by channel', `${state.verificationSource} A live call on this case still requires the two verification questions.`);
  }

  function renderWallet() {
    const cards = state.profile?.cards || [];
    $('wallet-state').textContent = state.identityVerified ? 'Identity verified' : 'Not verified';
    $('wallet-state').className = 'bdg ' + (state.identityVerified ? 'bdg-ok' : 'bdg-c');
    $('wallet-verify').innerHTML = state.identityVerified
      ? '<i class="ti ti-id-badge-2"></i> Re-verify for a phone call'
      : '<i class="ti ti-id-badge-2"></i> Verify client identity';
    $('wallet-hint').textContent = state.identityVerified
      ? (state.verificationSource || 'Verified on this contact. You may read the last 6 digits only — never the full number.')
      : 'Card data stays masked until the client passes verification. You may read the last 6 digits only — never the full number.';
    $('wallet-verify').classList.toggle('done', state.identityVerified);
    $('wallet-list').innerHTML = cards.length
      ? `<div class="wallet-grid">${cards.map((card, i) => {
        const tail = cardTail(card, i);
        const revealed = !!state.revealedCards[i];
        const brand = cardBrand(card);
        return `<div class="wallet-card">
          <div class="wallet-face ${cardTone(card)}">
            <div class="wf-top"><span class="wf-bank">Kamuk Holdings</span><span class="wf-tier">${esc(card.name || 'Corporate card')}</span></div>
            <div class="wf-chip-row"><span class="wf-chip"></span><i class="ti ti-wifi wf-nfc"></i></div>
            <div class="wf-number">${revealed ? `•••• •••• ••${esc(tail.slice(0, 2))} ${esc(tail.slice(2))}` : '•••• •••• •••• ••••'}</div>
            <div class="wf-bottom">
              <div class="wf-field"><span class="wf-lbl">Valid thru</span><span class="wf-val">${revealed ? esc(cardExpiry(card, i)) : '••/••'}</span></div>
              <div class="wf-field wf-holder"><span class="wf-lbl">Card holder</span><span class="wf-val">${esc(card.holder || state.active.client.name)}</span></div>
              <div class="wf-brand">${brandMark(brand)}</div>
            </div>
          </div>
          <div class="wallet-meta">
            <span><strong>${esc(card.name || 'Corporate card')}</strong> · <span class="bdg ${/active/i.test(card.status || 'Active') ? 'bdg-ok' : 'bdg-c'}">${esc(card.status || 'Active')}</span></span>
            <span>Brand ${esc(brand)} · Network ${esc(card.network || brand)} · Limit ${esc(card.limit || 'Corporate')}</span>
            <span>${revealed ? `Last 6 digits you may read: <strong>${esc(tail)}</strong>` : (state.identityVerified ? 'Masked. Reveal the last 6 digits only if the client needs to identify the card.' : 'Masked. Verify the client before any disclosure.')}</span>
          </div>
          <div class="wallet-acts">
            <button class="act accent${revealed ? ' done' : ''}" data-card-reveal="${i}"><i class="ti ti-eye"></i> ${revealed ? 'Last 6 revealed' : 'Reveal last 6'}</button>
            <button class="act warn" data-card-pin="${i}"><i class="ti ti-lock-cog"></i> Regenerate PIN</button>
          </div>
        </div>`;
      }).join('')}</div>`
      : '<p class="empty-state">This client has no cards on file.</p>';
    $('wallet-log').innerHTML = state.cardEvents.length
      ? state.cardEvents.map(logRow).join('')
      : '<p class="empty-state">No card security action recorded on this case yet.</p>';
  }

  function revealCard(index) {
    if (!state.active) return;
    if (!state.identityVerified) return toast('Verify the client identity before you expose any card data.', true);
    const card = state.profile.cards[index];
    if (!card) return;
    const tail = cardTail(card, index);
    if (state.revealedCards[index]) return toast(`Last 6 digits already on screen: ${tail}.`);
    state.revealedCards[index] = true;
    pushCardEvent('ti-eye', 'accent', `Last 6 digits disclosed — ${cardBrand(card)}`, `${card.name} · ${tail} · read back to the verified client`);
    recordAction('card-reveal', 'Card last 6 digits disclosed', `${cardBrand(card)} ${card.name} · ${tail}`);
    renderWallet();
  }

  function regeneratePin(index) {
    if (!state.active) return;
    if (!state.identityVerified) return toast('Verify the client identity before you regenerate a PIN.', true);
    const card = state.profile.cards[index];
    if (!card) return;
    const reference = `PIN-${Date.now().toString().slice(-6)}`;
    pushCardEvent('ti-lock-cog', 'warning', `PIN regeneration issued — ${card.name}`, `Reference ${reference} · the client sets the new PIN online or at any ATM`);
    recordAction('pin-reset', 'Client PIN regenerated', `${card.name} ending ${cardTail(card, index)} · reference ${reference}`);
    $('pin-body').innerHTML = `<div class="modal-section"><div class="modal-section-title">Regeneration reference</div>
        <div class="modal-row"><span class="modal-row-lbl">Reference</span><span class="modal-row-val">${esc(reference)}</span></div>
        <div class="modal-row"><span class="modal-row-lbl">Card</span><span class="modal-row-val">${esc(card.name)} · ${esc(cardBrand(card))}</span></div>
        <div class="modal-row"><span class="modal-row-lbl">Valid for</span><span class="modal-row-val">24 hours</span></div></div>
      <div class="modal-section"><div class="modal-section-title">What the client does now</div>
        <ol class="site-steps"><li>Signs in at kamukholdings.com and opens Cards → Reset PIN.</li><li>Enters this reference and the last 6 digits of the card.</li><li>Chooses a new 4-digit PIN and confirms it.</li></ol></div>
      <div class="modal-section"><div class="modal-section-title">Say it like this</div>
        <p style="font-size:12px;color:var(--text2);line-height:1.6;">"I have generated your PIN reset reference. I will never ask you for your PIN — you set it yourself. Let me walk you through the page while we are on the line."</p></div>`;
    open('pin-modal');
    renderWallet();
  }

  const SITE_ORIGIN = 'https://www.kamukholdings.com';

  const SITE = [
    {
      path: '/', label: 'Home', title: 'Corporate banking that answers on the first call',
      lead: 'Accounts, cards, financing and treasury support for growing companies across the region.',
      blocks: [
        ['Business accounts', 'Operating, payroll and reserve accounts with same-day local transfers.'],
        ['Corporate cards', 'Obsidian and Business cards with per-employee limits and live controls.'],
        ['Financing', 'Working capital facilities and equipment leasing reviewed in 5 business days.']
      ],
      script: 'Say: "Everything I am about to do with you is also available on our site — let me show you exactly where, so you can do it yourself next time."'
    },
    {
      path: '/products', label: 'Products', title: 'Products and services',
      lead: 'What we sell, in plain language. Use this page to describe a product before you quote timelines.',
      blocks: [
        ['Business Operating Account', 'Day-to-day account. Local transfers same day, international 1 to 3 business days.'],
        ['Working Capital Facility', 'Revolving credit line for cash-flow gaps. Decision in 5 business days.'],
        ['Obsidian Corporate Card', 'No preset spending limit, travel protection, 24/7 fraud monitoring.'],
        ['Payroll Services', 'Bulk salary payments with an approval workflow and audit trail.']
      ],
      script: 'Say: "In short, that product covers X, it costs Y and it takes Z. Would you like me to send you the page so you have it in writing?"'
    },
    {
      path: '/cards', label: 'Cards', title: 'Manage your cards online',
      lead: 'Clients can freeze a card, request a replacement, set travel notices and reset a PIN without calling.',
      steps: ['Sign in and open the Cards section.', 'Select the card by its last 6 digits.', 'Choose Freeze, Replace, Travel notice or Reset PIN.', 'Confirm with the code sent to the registered phone.'],
      script: 'Say: "You will see your cards listed by the last six digits — that is the card ending in the number I just confirmed with you."'
    },
    {
      path: '/cards/reset-pin', label: 'Reset PIN', title: 'Reset your card PIN',
      lead: 'The bank never sees or sets your PIN. We issue a reference and you choose the new PIN yourself.',
      steps: ['Open Cards → Reset PIN.', 'Enter the reference the executive gave you.', 'Enter the last 6 digits of your card.', 'Choose a new 4-digit PIN and confirm it.', 'Use the new PIN at any ATM within 24 hours to activate it.'],
      script: 'Say: "I will stay on the line while you do it. Tell me what you see on your screen after you enter the reference."'
    },
    {
      path: '/support/dispute', label: 'Dispute a charge', title: 'Dispute a card transaction',
      lead: 'Online disputes open the same case the desk opens, with an automatic reference number.',
      steps: ['Open Support → Dispute a charge.', 'Select the transaction from the last 60 days.', 'Choose the reason: not recognised, duplicate, wrong amount or service not received.', 'Attach any receipt or contract, then submit.', 'Keep the reference — the review runs in up to 10 business days.'],
      script: 'Say: "You can raise it here yourself, but I am opening it for you right now so the clock starts today. I will give you the reference before we hang up."'
    },
    {
      path: '/security', label: 'Security centre', title: 'Security and fraud',
      lead: 'What we will and will never ask you, plus what to do the moment something looks wrong.',
      blocks: [
        ['We never ask for', 'Your full card number, your PIN, your password or a code sent to your phone.'],
        ['If you suspect fraud', 'Freeze the card from the app, then call the number printed on the back of the card.'],
        ['Verification', 'We confirm your identity with two data points on file before discussing any account detail.']
      ],
      script: 'Say: "For your protection I will only confirm the last six digits, and I will never ask you for your PIN or a code."'
    },
    {
      path: '/contact', label: 'Contact & hours', title: 'Talk to the corporate desk',
      lead: 'Corporate desk: Monday to Friday, 7:00 to 19:00. Fraud line: 24/7.',
      blocks: [
        ['Corporate desk', 'corporate@kamukholdings.com · +1 (800) 555-0142'],
        ['Fraud and card blocking', '24/7 on +1 (800) 555-0199'],
        ['Branch appointments', 'Book a 30-minute slot online, confirmation by email.']
      ],
      script: 'Say: "If we get disconnected, call the corporate desk directly and quote the case reference — you will not start from zero."'
    }
  ];

  function sitePage(path) { return SITE.find((page) => page.path === path) || SITE[0]; }

  function renderSite() {
    const page = sitePage(state.sitePath);
    $('site-url').textContent = `${SITE_ORIGIN}${page.path}`;
    $('site-nav').innerHTML = SITE.map((item) => `<button data-site="${esc(item.path)}" class="${item.path === page.path ? 'on' : ''}">${esc(item.label)}</button>`).join('');
    const body = page.steps
      ? `<ol class="site-steps">${page.steps.map((step) => `<li>${esc(step)}</li>`).join('')}</ol>`
      : `<div class="site-blocks">${(page.blocks || []).map(([title, text]) => `<div class="site-block"><h4>${esc(title)}</h4><p>${esc(text)}</p></div>`).join('')}</div>`;
    $('site-page').innerHTML = `<div class="site-hero">${esc(page.title)}</div><div class="site-lead">${esc(page.lead)}</div>${body}<div class="site-cta">Sign in to online banking</div>`;
    $('site-script').textContent = page.script;
  }

  function openSitePath(path, options = {}) {
    if (options.track !== false && state.sitePath !== path) state.siteHistory.push(state.sitePath);
    state.sitePath = path;
    renderSite();
  }

  function siteBack() {
    const previous = state.siteHistory.pop();
    openSitePath(previous || '/', { track: false });
  }

  function guideClientHere() {
    if (!state.active) return toast('Accept a case before co-browsing with the client.', true);
    const page = sitePage(state.sitePath);
    recordAction('site-guide', 'Client guided on the website', `${page.title} · ${SITE_ORIGIN}${page.path}`);
  }

  function sendSitePage() {
    if (!state.active) return toast('Accept a case before sending website information.', true);
    const page = sitePage(state.sitePath);
    showTab('emails');
    startCompose();
    $('compose-subject').value = `Kamuk Holdings — ${page.label}`;
    $('compose-txt').value = '';
    $('compose-txt').placeholder = `Type the email yourself. Include this page: ${SITE_ORIGIN}${page.path}`;
    toast('Website page selected. Write the email in your own words.');
  }

  function blockImportedEmailText(event) {
    if (!event.target.closest('#compose-subject, #compose-txt')) return;
    event.preventDefault();
    const coach = $('compose-coach');
    if (coach) {
      coach.style.color = 'var(--danger)';
      coach.textContent = 'Paste is disabled. Type the email in your own words so the language practice can be evaluated.';
    }
    toast('Paste is disabled in client emails.', true);
  }

  /* ─────────────── CASE DISPOSITIONS ─────────────── */

  const DISPOSITIONS = {
    unresolved: {
      title: 'Close without resolution',
      label: 'Closed — unresolved (justified)',
      help: 'Use this when nothing further can be done today: the client declined the available option, the request is outside policy, or the client will not provide what is required.',
      tip: 'State what you offered, what the client decided and what is not possible. No blame, no promises.',
      next: 'Case closed with the client informed. No further desk action pending.'
    },
    queue: {
      title: 'Return the case to the queue',
      label: 'Returned to the queue',
      help: 'Use this when the case is not yours to work: wrong desk, wrong language, or you have a conflict of interest.',
      tip: 'Say who should take it and what the next executive should read first.',
      mode: 'queue',
      next: 'Returned to the shared queue for reassignment to the correct executive.'
    },
    aa: {
      title: 'Flag AA — awaiting client action',
      label: 'Flagged AA — awaiting client action',
      help: 'Use this when the case is blocked on the client: missing document, missing signature, pending confirmation.',
      tip: 'Name the exact item you requested, the channel and the date you agreed to review it.',
      next: 'Case parked as AA. Review the client submission on the agreed date.'
    },
    psa: {
      title: 'Flag PSA — pending system action',
      label: 'Flagged PSA — pending system action',
      help: 'Use this when the case is blocked on a system or another desk: batch release, compliance review, settlement window.',
      tip: 'Name the owning system or desk, the ticket reference and the expected release time.',
      next: 'Case parked as PSA. Re-check once the owning system releases the action.'
    },
    duplicate: {
      title: 'Close as duplicate',
      label: 'Closed — duplicate case',
      help: 'Use this when the same client issue is already open under another case. The original case keeps the ownership and the timeline.',
      tip: 'Give the original case ID and confirm the client was told which reference to quote.',
      ref: true,
      next: 'Closed as duplicate. The client was given the surviving case reference.'
    }
  };

  function openDisposition(key) {
    const conf = DISPOSITIONS[key];
    if (!conf) return;
    if (!state.active) return toast('Accept a case before applying a disposition.', true);
    state.pendingDisposition = key;
    $('disp-title').textContent = conf.title;
    $('disp-help').textContent = conf.help;
    $('disp-tip').textContent = conf.tip;
    $('disp-note').value = '';
    $('disp-ref').value = '';
    $('disp-ref-wrap').style.display = conf.ref ? 'block' : 'none';
    open('disp-modal');
    setTimeout(() => $('disp-note').focus(), 50);
  }

  async function confirmDisposition() {
    const key = state.pendingDisposition;
    const conf = DISPOSITIONS[key];
    if (!conf) return;
    const text = $('disp-note').value.trim();
    const reference = $('disp-ref').value.trim();
    if (text.length < 25) return toast('Justify the disposition with at least 25 characters of factual documentation.', true);
    if (conf.ref && !reference) return toast('Enter the case ID this one duplicates.', true);
    const detail = conf.ref ? `Duplicate of ${reference}. ${text}` : text;
    addNote('Internal note', conf.mode === 'queue' ? 'Open' : 'Completed', `${conf.label} — ${detail}`);
    recordAction(`disposition-${key}`, conf.label, detail);
    close('disp-modal');
    state.pendingDisposition = null;
    await submitResolution({ disposition: conf.ref ? `${conf.label} (${reference})` : conf.label, summary: detail, nextStep: conf.next });
  }

  /* ─────────────── RESOLUTION + ALICE ─────────────── */

  async function submitResolution(override) {
    const disposition = override ? override.disposition : $('res-disp').value;
    const summary = override ? String(override.summary || '').trim() : $('res-summary').value.trim();
    const nextStep = override ? String(override.nextStep || '').trim() : $('res-next').value.trim();
    if (!override && (!disposition || summary.length < 35 || nextStep.length < 12)) return toast('Complete the disposition, a professional summary and a timed next step.', true);
    $('res-submit').disabled = true;
    const durationSec = state.acceptedAt ? Math.floor((Date.now() - state.acceptedAt.getTime()) / 1000) : 0;
    const payload = { caseId: state.active.id, actions: state.actions, notes: state.notes, risk: state.risk, resolution: { disposition, summary, nextStep }, durationSec };
    try {
      let evaluation, metrics = state.metrics;
      const finishingGuide = Boolean(state.guide);
      if (state.preview || finishingGuide) {
        evaluation = localEvaluation(payload);
      } else {
        if (state.pendingSyncs.length) await Promise.all(state.pendingSyncs.slice());
        const response = await api(crmPath('/case/resolve'), { method: 'POST', body: payload });
        evaluation = response.evaluation; metrics = response.metrics || metrics;
      }
      state.metrics = metrics;
      close('res-modal');
      const completedCase = state.active;
      showVerdict(evaluation, durationSec, completedCase);
      updateMetrics();
      if (state.caseTimer) clearInterval(state.caseTimer);
      state.caseTimer = null;
      state.active = null;
      state.acceptedAt = null;
      state.actions = [];
      state.notes = [];
      state.selected = null;
      if (finishingGuide) {
        deskGuideMark('close-submit');
        await completePracticeCase();
      } else if (state.preview) buildQueue(state.filter, { selectFirst: true });
      else {
        await Promise.all([loadPool(), loadLeaderboard().catch(() => {})]);
      }
    } catch (error) {
      toast(error.message, true);
    } finally {
      $('res-submit').disabled = false;
    }
  }

  const ACKNOWLEDGE_RE = /\b(i(?:'m| am)? ?sorry|i apolog|apologize|i understand (?:how|why|that|the)|i take (?:full )?(?:ownership|responsibility)|i(?:'ll| will) (?:own|personally)|my responsibility|we take responsibility|i realize|i can see (?:how|why)|that (?:must be|is|'s) (?:frustrating|difficult|unacceptable))\b/i;
  const OPEN_QUESTION_RE = /^(what|how|why|when|where|which|who|tell me|describe|walk me through|explain)\b/i;
  const CLOSED_QUESTION_RE = /^(is|are|am|was|were|do|does|did|can|could|will|would|shall|should|have|has|had|may|might|must)\b/i;

  function conversationalKeys(payload) {
    const parts = [];
    (payload.notes || []).forEach((note) => { if (note && note.text) parts.push(note.text); });
    (state.profile?.emails || []).forEach((email) => { if (email.direction === 'outbound') parts.push(`${email.subject || ''} ${email.body || ''}`); });
    (payload.call?.transcript || []).forEach((turn) => { if (turn.role === 'user' && turn.text) parts.push(turn.text); });
    const text = parts.join('\n');
    const derived = [];
    if (!text.trim()) return derived;
    if (ACKNOWLEDGE_RE.test(text)) derived.push('acknowledge');
    (text.match(/[^.!?\n]*\?/g) || []).forEach((raw) => {
      const question = raw.trim().replace(/^[^A-Za-z]+/, '');
      if (OPEN_QUESTION_RE.test(question)) derived.push('ask-open');
      else if (CLOSED_QUESTION_RE.test(question)) derived.push('ask-closed');
    });
    return derived;
  }

  function localEvaluation(payload) {
    const keys = payload.actions.map((a) => a.key).concat(conversationalKeys(payload));
    const has = (k) => keys.includes(k);
    let score = 40;
    if (has('acknowledge')) score += 12;
    if (has('ask-open')) score += 10;
    if (has('ask-closed')) score += 6;
    if (has('escalate')) score += 8;
    if (has('note')) score += 8;
    if (payload.risk && payload.risk.type) score += 8;
    if (payload.resolution.summary.length > 160) score += 8;
    score = Math.max(0, Math.min(100, score));
    return {
      verdict: score >= 85 ? 'Excellent' : score >= 70 ? 'Meets standard' : score >= 55 ? 'Needs coaching' : 'Below standard',
      score,
      casePoints: Math.round(score / 10),
      strengths: [
        has('acknowledge') ? 'You opened with ownership instead of a generic apology.' : 'You moved quickly into the case data.',
        payload.resolution.nextStep.length > 20 ? 'Your next step is concrete and time-bound.' : 'Your disposition is clearly stated.'
      ],
      improvements: [
        has('ask-open') ? 'Push one more diagnostic question before committing to a timeline.' : 'Ask at least one open question to diagnose before acting.',
        payload.risk && payload.risk.type ? 'Tie the risk classification back to the client impact in writing.' : 'Record a risk classification before closing.'
      ],
      dimensions: {
        empathy: has('acknowledge') ? 82 : 52, discovery: has('ask-open') ? 80 : 48,
        ownership: has('escalate') || has('note') ? 78 : 55, compliance: payload.risk && payload.risk.type ? 80 : 50,
        documentation: Math.min(95, 45 + Math.round(payload.resolution.summary.length / 6))
      },
      points: Math.round(score / 10),
      pointsAwarded: score >= 70 ? Math.round(score / 10) : 0,
      preview: true
    };
  }

  function showVerdict(evaluation, durationSec, completedCase) {
    const dims = evaluation.dimensions || {};
    const points = Number(evaluation.casePoints != null ? evaluation.casePoints : evaluation.points) || 0;
    const pending = Boolean(evaluation.pendingEvaluation);
    const awarded = Number(evaluation.pointsAwarded) || 0;
    const errors = Array.isArray(evaluation.errors) ? evaluation.errors : [];
    const tone = pending ? 'warning' : points >= 8 ? 'success' : 'danger';
    $('verdict-body').innerHTML = `
      <div class="verdict-score"><strong style="color:var(--${tone});">${pending ? '—' : points}</strong>
        <div><div style="font-size:13.5px;font-weight:700;">${esc(evaluation.verdict)}</div>
        <div style="font-size:11.5px;color:var(--text3);">${esc(completedCase?.id || '')} · ${clock(durationSec)} handling time · Alice score out of 10${evaluation.preview ? ' · preview scoring' : ''}</div></div></div>
      <div class="modal-section" style="margin-top:12px;"><div class="modal-section-title">Errors &amp; evidence</div>
        ${errors.length ? `<ul class="verdict-list">${errors.map((error) => `<li><strong>${esc(error.label || error.code || 'Error')}</strong>${error.evidence ? ` — ${esc(error.evidence)}` : ''}</li>`).join('')}</ul>` : '<p class="empty-state">No errors recorded.</p>'}</div>
      <div class="modal-section" style="margin-top:12px;"><div class="modal-section-title">Dimensions</div>
        ${Object.keys(dims).map((k) => `<div class="dim-row"><span>${esc(k.replace(/^./, (m) => m.toUpperCase()))}</span><div class="dim-bar"><i style="width:${Math.max(0, Math.min(100, dims[k]))}%"></i></div><b>${dims[k]}</b></div>`).join('')}</div>
      <div class="modal-section"><div class="modal-section-title">Strengths</div><ul class="verdict-list">${(evaluation.strengths || []).map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>
      <div class="modal-section"><div class="modal-section-title">Improvements</div><ul class="verdict-list">${(evaluation.improvements || []).map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>
      <div style="background:var(--accent-bg);border:1px solid var(--accent-border);border-radius:var(--radius);padding:8px 10px;font-size:11.5px;color:var(--accent);font-weight:600;">
        ${pending ? 'Competition points pending Alice evaluation.' : awarded > 0 ? `+${awarded} competition points awarded (score ≥8 · meta de bono de producción).` : `No competition points awarded (score ${points}/10; bono de producción requiere ≥8).`} · Team ${esc(state.employee.team)}</div>`;
    open('verdict-modal');
  }

  function updateMetrics() {
    const m = state.metrics || {};
    const me = state.leaderboard || {};
    const team = state.employee.team === 'Vanguard' ? 'sc-v' : 'sc-a';
    $(team === 'sc-v' ? 'sc-v' : 'sc-a').textContent = me.weeklyPoints != null ? me.weeklyPoints : (m.weeklyPoints != null ? m.weeklyPoints : (m.points || 0));
    if ($('metric-weekly')) $('metric-weekly').textContent = me.weeklyPoints != null ? me.weeklyPoints : (m.weeklyPoints || 0);
    if ($('metric-rate')) $('metric-rate').textContent = `${me.resolutionRate != null ? me.resolutionRate : (m.resolutionRate || 0)}%`;
    if ($('metric-rank')) $('metric-rank').textContent = me.rank ? `#${me.rank}` : '—';
  }

  /* ─────────────── UI PLUMBING ─────────────── */

  function showTab(id) {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === id));
    document.querySelectorAll('.pane').forEach((p) => p.classList.toggle('on', p.id === 'pane-' + id));
    if (id === 'spend') requestAnimationFrame(drawCharts);
    deskGuideMark('tab-' + id);
  }

  function toast(msg, bad) {
    const el = $('toast');
    $('toast-msg').textContent = msg;
    el.classList.toggle('bad', !!bad);
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 3600);
  }

  function open(id) { $(id).classList.add('open'); }
  function close(id) { $(id).classList.remove('open'); }

  function bind() {
    $('queue-filters').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter]');
      if (btn) buildQueue(btn.dataset.filter);
    });
    $('shuffle-btn').addEventListener('click', async () => {
      if (state.guide) {
        loadPracticeQueue();
        return;
      }
      if (state.preview) return buildQueue(state.filter);
      $('shuffle-btn').disabled = true;
      try {
        await loadPool();
        toast('Case pool refreshed.');
      } catch (error) {
        toast(error.message, true);
      } finally {
        $('shuffle-btn').disabled = false;
      }
    });
    $('queue-list').addEventListener('click', (e) => {
      const item = e.target.closest('[data-case]');
      if (item) selectCase(item.dataset.case);
    });
    $('accept-btn').addEventListener('click', acceptCase);
    $('tabs').addEventListener('click', (e) => {
      const tab = e.target.closest('[data-tab]');
      if (tab) showTab(tab.dataset.tab);
    });
    document.querySelector('.v2-actions').addEventListener('click', (e) => {
      const soft = e.target.closest('[data-soft]');
      if (soft) return openEvidence(soft.dataset.soft);
      const danger = e.target.closest('[data-danger]');
      if (danger) return triggerDanger(danger.dataset.danger);
    });
    $('btn-credit').addEventListener('click', runCredit);
    $('btn-email').addEventListener('click', () => {
      if (state.guide) {
        const step = currentGuideStep();
        if (!step || (step.action !== 'compose' && step.action !== 'tab-emails')) {
          return toast('Seguí el módulo guiado: ' + (step ? step.title : 'el recuadro rojo'), true);
        }
      }
      showTab('emails');
      startCompose();
    });
    $('btn-call').addEventListener('click', () => {
      if (!state.active) return toast('Accept a case before calling the client.', true);
      if (state.identityVerified && /^Authenticated channel/.test(state.verificationSource || '')) {
        state.identityVerified = false;
        state.verificationSource = null;
        pushCardEvent('ti-phone', 'warning', 'Voice contact opened', 'Email authentication does not carry over to a call. Ask the two verification questions before disclosing card data.');
        renderWallet();
        toast('Voice contact: verify the client again before disclosing card data.');
      }
      if ($('call-client-name')) $('call-client-name').textContent = state.active.client.name;
      if ($('call-mood')) $('call-mood').textContent = state.profile?.personality?.baselineMood || state.active.mood || 'Ready';
      if ($('call-console')) open('call-console');
      window.KamukHoldingsCall?.start({
        caseId: state.active.id,
        caseTitle: state.active.title,
        client: state.active.client,
        personality: state.profile?.personality || state.active.client.personality || {},
        mood: state.profile?.personality?.baselineMood || state.active.mood || 'neutral',
        employee: state.employee,
        preview: state.preview,
        api,
        toast,
        recordLocal: (key, label, detail) => {
          if (typeof recordAction === 'function') recordAction(key, label, detail);
        }
      });
    });
    $('btn-site').addEventListener('click', () => showTab('site'));
    $('btn-resolve').addEventListener('click', () => {
      if (!state.active) return;
      if (state.guide && currentGuideStep() && currentGuideStep().action !== 'resolve') {
        return toast('Seguí el módulo guiado: ' + currentGuideStep().title, true);
      }
      if (!state.actions.length && !state.notes.length) return toast('Document at least one note or action before you close the case.', true);
      deskGuideMark('resolve');
      open('res-modal');
      renderDeskGuide();
    });
    $('cf-yes').addEventListener('click', confirmDanger);
    $('cf-no').addEventListener('click', () => { $('confirm').classList.remove('show'); state.pendingDanger = null; });
    $('ev-confirm').addEventListener('click', confirmEvidence);
    $('res-submit').addEventListener('click', () => submitResolution());
    $('disp-row').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-disp]');
      if (!btn) return;
      if (state.guide) {
        const step = currentGuideStep();
        if (step && step.action === 'look-disp') {
          return toast('Miralo subrayado en rojo y tocá Continuar. Flags AA/PSA van después del correo y la nota.', true);
        }
        if (step && step.action !== 'resolve' && step.action !== 'close-submit') {
          return toast('Seguí el módulo guiado: ' + step.title, true);
        }
      }
      openDisposition(btn.dataset.disp);
    });
    $('disp-confirm').addEventListener('click', confirmDisposition);
    $('wallet-verify').addEventListener('click', () => {
      if (!state.active) return toast('Accept a case before verifying the client.', true);
      openEvidence('verify-id');
    });
    $('wallet-list').addEventListener('click', (e) => {
      const reveal = e.target.closest('[data-card-reveal]');
      if (reveal) return revealCard(Number(reveal.dataset.cardReveal));
      const pin = e.target.closest('[data-card-pin]');
      if (pin) return regeneratePin(Number(pin.dataset.cardPin));
    });
    $('site-nav').addEventListener('click', (e) => {
      const link = e.target.closest('[data-site]');
      if (link) openSitePath(link.dataset.site);
    });
    $('site-back').addEventListener('click', siteBack);
    $('site-guide').addEventListener('click', guideClientHere);
    $('site-send').addEventListener('click', sendSitePage);
    $('risk-save').addEventListener('click', saveRisk);
    $('email-compose').addEventListener('click', () => startCompose());
    $('note-add').addEventListener('click', () => {
      $('note-form').style.display = 'block';
      $('note-txt').focus();
      deskGuideMark('note-open');
    });
    $('compose-send').addEventListener('click', sendEmail);
    $('compose-cancel').addEventListener('click', () => $('compose-box').classList.remove('open'));
    $('compose-box').addEventListener('paste', blockImportedEmailText);
    $('compose-box').addEventListener('drop', blockImportedEmailText);
    $('compose-box').addEventListener('beforeinput', (event) => {
      if (event.inputType === 'insertFromPaste' || event.inputType === 'insertFromDrop') blockImportedEmailText(event);
    });
    $('note-save').addEventListener('click', saveNote);
    $('note-cancel').addEventListener('click', () => { $('note-form').style.display = 'none'; $('note-txt').value = ''; });
    $('stmt-period').addEventListener('change', renderStatements);
    $('stmt-type').addEventListener('change', renderStatements);
    $('email-filter').addEventListener('change', renderEmails);
    $('contact-filter').addEventListener('change', renderContacts);
    $('stmt-export').addEventListener('click', exportStatements);
    $('bill-invoice').addEventListener('click', generateInvoice);
    $('bill-remind').addEventListener('click', sendReminder);
    $('bill-export').addEventListener('click', () => toast('Billing report exported.'));
    $('verdict-next').addEventListener('click', () => close('verdict-modal'));
    document.addEventListener('click', (e) => {
      const closer = e.target.closest('[data-close]');
      if (closer) return close(closer.dataset.close);
      const row = e.target.closest('[data-tx]');
      if (row) return openDetail(row.dataset.tx);
      const spending = e.target.closest('[data-spending]');
      if (spending) return openCategory(spending.dataset.spending);
      const emailView = e.target.closest('[data-email-view]');
      if (emailView) return openEmailThread(emailView.dataset.emailView);
      const log = e.target.closest('[data-log]');
      if (log) return openLog(log.dataset.log);
      const serviceView = e.target.closest('[data-service-view]');
      if (serviceView) return openService(serviceView.dataset.serviceGroup, serviceView.dataset.serviceView);
      const phone = e.target.closest('[data-phone-call]');
      if (phone) return $('btn-call').click();
      const edit = e.target.closest('[data-edit]');
      if (edit) return startEdit(edit.dataset.edit);
      const reply = e.target.closest('[data-reply]');
      if (reply) { showTab('emails'); startCompose(reply.dataset.reply); return; }
    });
    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
    });
    $('edit-save').addEventListener('click', () => {
      const value = $('edit-inp').value.trim();
      if (!value || !state.editTarget) return;
      $(state.editTarget).textContent = value;
      $('edit-area').style.display = 'none';
      recordAction('record-update', 'Client record updated', value);
      state.editTarget = null;
    });
    $('edit-cancel').addEventListener('click', () => { $('edit-area').style.display = 'none'; state.editTarget = null; });
    if ($('desk-guide-next')) {
      $('desk-guide-next').addEventListener('click', () => {
        const step = currentGuideStep();
        if (step && step.next) deskGuideMark(step.action);
      });
    }
    if ($('practice-replay')) {
      $('practice-replay').addEventListener('click', () => startDeskGuide(state.deskGuideDone || [], { replay: true }));
    }
    window.addEventListener('resize', () => { if (state.profile) drawCharts(); });
  }

  function startEdit(id) {
    state.editTarget = id;
    $('edit-lbl').textContent = 'Editing: ' + $(id).textContent;
    $('edit-inp').value = $(id).textContent;
    $('edit-area').style.display = 'block';
    $('edit-inp').focus();
  }

  async function heartbeat() {
    if (state.preview || state.guide) return;
    try {
      const presence = await api(crmPath('/presence'), {
        method: 'POST',
        body: {
          status: state.active ? 'working' : 'online', caseId: state.active ? state.active.id : null,
          acceptedAt: state.acceptedAt ? state.acceptedAt.toISOString() : null, actionCount: state.actions.length
        }
      });
      if (presence.metrics) {
        state.metrics = presence.metrics;
        updateMetrics();
      }
    } catch (_) { /* the desk keeps working offline */ }
  }

  /* ─────────────── 10 GUIDED PRACTICE CASES (real desk, off weekly floor) ─────────────── */

  const EMAIL_MODEL = 'Cómo escribir el correo: 1) Hello + nombre. 2) Impacto del cliente. 3) Un connector (because / however / therefore). 4) Qué YA hiciste. 5) Next step con hora. Ejemplo: “Hello Marta, I reviewed the freeze because two supplier payments declined. I escalated to Operations and I will call you today before 4:30 p.m.” Mínimo 45 palabras. Sin pegar.';

  function openPracticeSteps() {
    return [
      { action: 'select', title: 'Dónde click: Case queue', body: 'El recuadro rojo es el queue real. Tocá el caso PRACTICE. No es Nexora ni un mock.', target: '.qi', kind: 'click' },
      { action: 'look', title: 'Qué debés ver', body: 'Subrayado en rojo: título, quote del cliente, CASE BRIEF y nombre. Leé el impacto antes de Accept.', look: ['#v1-title', '#v1-quote', '#v1-desc', '#v1-client'], next: true, kind: 'look' },
      { action: 'accept', title: 'Dónde click: Accept case', body: 'Assigna el caso a tu ID. Esta práctica NO consume el queue semanal ni el bono de 8/10.', target: '#accept-btn', kind: 'click' }
    ];
  }

  function closePracticeSteps(dispositionHint) {
    return [
      { action: 'tab-emails', title: 'Tab que debés usar: Emails', body: 'El tab rojo es Emails. Ahí sale el correo al cliente — evidencia de cierre.', target: '[data-tab="emails"]', kind: 'click' },
      { action: 'compose', title: 'Dónde click: Compose', body: 'Abrí el compositor real. El modelo en rojo es la estructura, no un texto para copiar.', target: '#email-compose', kind: 'click', model: EMAIL_MODEL },
      { action: 'email', title: 'Escribí y enviá el correo', body: 'Greeting + impacto + connector + acción + next step con hora. El botón Send queda en rojo cuando el texto cumple la rúbrica.', target: '#compose-send', kind: 'click', model: EMAIL_MODEL },
      { action: 'tab-contacts', title: 'Tab: Previous contacts', body: 'Notas internas. El banco las ve; el cliente no. Documentá evidencia y dueño.', target: '[data-tab="contacts"]', kind: 'click' },
      { action: 'note-open', title: 'Dónde click: Add note', body: 'Tocá Add note (rojo). Hechos + acción + next step. Mínimo 15 caracteres.', target: '#note-add', kind: 'click' },
      { action: 'note', title: 'Guardá la nota', body: 'Save note cierra la evidencia interna. Sin nota no hay cierre correcto.', target: '#note-save', kind: 'click' },
      { action: 'resolve', title: 'Cómo cerrar el caso', body: dispositionHint || 'Resolve case (rojo). Email + note son la evidencia. AA o PSA si falta trabajo; Resolved si ya cerraste.', target: '#btn-resolve', kind: 'click' },
      { action: 'close-submit', title: 'Disposition + Submit', body: 'Subrayado en rojo: disposition, summary y next step. Submit to Alice QA cierra el caso con evidencia.', look: ['#res-disp', '#res-summary', '#res-next'], target: '#res-submit', kind: 'click' }
    ];
  }

  const PRACTICE_CASES = [
    { id: 'gp1', packId: 'KH-1042', title: 'PRACTICE 1 · Frozen operating account — learn the queue', extra: [
      { action: 'look-360', title: 'Qué debés ver: Overview', body: 'Métricas y flags del cliente. Este es el tab Overview (ya abierto). Miralo y tocá Continuar.', look: ['#ov-metrics', '#ov-flags'], next: true, kind: 'look' }
    ] },
    { id: 'gp2', packId: 'KH-1051', title: 'PRACTICE 2 · Payroll wire held — Statements', extra: [
      { action: 'tab-stmt', title: 'Tab: Statements', body: 'Acá se confirma si el pago salió. Click el tab rojo Statements y buscá el wire / ACH.', target: '[data-tab="stmt"]', kind: 'click' }
    ] },
    { id: 'gp3', packId: 'KH-1064', title: 'PRACTICE 3 · Hotel card decline — Cards & PIN', extra: [
      { action: 'tab-wallet', title: 'Tab: Cards & PIN', body: 'Click el tab rojo. Nunca leas el PAN completo ni el PIN. Last 6 only after identity.', target: '[data-tab="wallet"]', kind: 'click' },
      { action: 'verify', title: 'Dónde click: Verify identity', body: 'Dos datos del record. Nunca pidas PIN, número completo ni código SMS.', target: '#wallet-verify', kind: 'click' }
    ] },
    { id: 'gp4', packId: 'KH-1064', title: 'PRACTICE 4 · Identity before any disclosure', extra: [
      { action: 'tab-wallet', title: 'Tab: Cards & PIN', body: 'Identity primero. El tab rojo es Cards & PIN.', target: '[data-tab="wallet"]', kind: 'click' },
      { action: 'verify', title: 'Verify client identity', body: 'Click Verify (rojo). Sin esto el wallet permanece masked.', target: '#wallet-verify', kind: 'click' },
      { action: 'look-wallet', title: 'Qué debés ver: wallet', body: 'Last 6 digits only. Subrayado en rojo. Continuar cuando lo hayas visto.', look: ['#wallet-list', '#wallet-hint'], next: true, kind: 'look' }
    ] },
    { id: 'gp5', packId: 'KH-1042', title: 'PRACTICE 5 · Third-time caller — Previous contacts', extra: [
      { action: 'tab-contacts', title: 'Tab: Previous contacts', body: 'El cliente dice “this is the third time”. Click Previous contacts (rojo) y leé el historial antes de preguntar todo de nuevo.', target: '[data-tab="contacts"]', kind: 'click' }
    ] },
    { id: 'gp6', packId: 'KH-1102', title: 'PRACTICE 6 · Products on file — Services', extra: [
      { action: 'tab-svc', title: 'Tab: Services', body: 'Productos del cliente (operating account, card, loan). Click Services (rojo).', target: '[data-tab="svc"]', kind: 'click' }
    ] },
    { id: 'gp7', packId: 'KH-1064', title: 'PRACTICE 7 · Card transactions trail', extra: [
      { action: 'tab-cards', title: 'Tab: Card transactions', body: 'Merchant, monto y status. Click Card transactions (rojo) y localizá el decline.', target: '[data-tab="cards"]', kind: 'click' }
    ] },
    { id: 'gp8', packId: 'KH-1201', title: 'PRACTICE 8 · Supplier ACH failed — find evidence', extra: [
      { action: 'tab-stmt', title: 'Tab: Statements', body: 'Evidencia del ACH. Click Statements (rojo) antes de prometer un refund.', target: '[data-tab="stmt"]', kind: 'click' }
    ] },
    { id: 'gp9', packId: 'KH-1120', title: 'PRACTICE 9 · Client email update — write it right', extra: [
      { action: 'compose', title: 'Dónde click: Email (barra de acciones)', body: 'El botón Email de la barra (rojo) abre el compositor real. Usá el modelo de abajo.', target: '#btn-email', kind: 'click', model: EMAIL_MODEL }
    ] },
    { id: 'gp10', packId: 'KH-1202', title: 'PRACTICE 10 · Close with AA / PSA / Resolved', extra: [
      { action: 'tab-contacts', title: 'Tab: Previous contacts + disposition', body: 'Click Previous contacts. Abajo están AA (awaiting action) y PSA (pending system). Eso es estacionar el caso con dueño.', target: '[data-tab="contacts"]', kind: 'click' },
      { action: 'look-disp', title: 'Qué debés ver: dispositions', body: 'Subrayado en rojo: Flag AA, Flag PSA, Close unresolved. No cierres Resolved si todavía falta trabajo.', look: ['#disp-row'], next: true, kind: 'look' }
    ] }
  ].map((item) => {
    const extra = item.id === 'gp9'
      ? item.extra.concat(closePracticeSteps('Resolve (rojo). En este caso el foco es el correo: greeting, acción, next step con hora.').filter((step) => step.action !== 'tab-emails' && step.action !== 'compose'))
      : item.extra.concat(closePracticeSteps(item.id === 'gp10'
        ? 'Resolve case (rojo). AA o PSA si falta trabajo del banco; Resolved solo si ya cumpliste con el cliente. Email + note obligatorios.'
        : null));
    return Object.assign({}, item, { steps: openPracticeSteps().concat(extra) });
  });

  function currentGuideCase() {
    return state.guide ? PRACTICE_CASES[state.guide.caseIndex] || null : null;
  }

  function currentGuideStep() {
    const item = currentGuideCase();
    if (!item) return null;
    return item.steps[state.guide.step] || null;
  }

  function practiceCaseFrom(spec) {
    const source = (state.cases || []).find((item) => item.id === spec.packId) || (state.cases || [])[0];
    const c = clone(source);
    c.title = spec.title;
    c.id = 'KH-PRAC-' + spec.id.toUpperCase();
    c.caseId = c.id;
    c.workItemId = 'PRACTICE-' + spec.id;
    c.touchNumber = 1;
    c.history = [];
    c._practice = true;
    c._practiceId = spec.id;
    return c;
  }

  function loadPracticeQueue() {
    const spec = currentGuideCase();
    if (!spec) return;
    const c = practiceCaseFrom(spec);
    state.pool = [c];
    state.queue = [c];
    state.filter = 'All';
    state.active = null;
    state.selected = null;
    renderQueue();
    $('view1').style.display = 'flex';
    $('view2').style.display = 'none';
    $('v1-title').textContent = spec.title;
    $('v1-desc').textContent = 'Caso de práctica en el desk real. No entra al queue semanal ni al bono. Completá los clicks rojos.';
    $('v1-transcript').innerHTML = '';
  }

  function startDeskGuide(doneIds, options) {
    const done = Array.isArray(doneIds) ? doneIds.slice() : [];
    const replay = options && options.replay;
    const next = replay ? 0 : Math.max(0, PRACTICE_CASES.findIndex((item) => done.indexOf(item.id) < 0));
    if (!replay && (next < 0 || done.length >= PRACTICE_CASES.length)) return false;
    state.guide = { step: 0, caseIndex: next < 0 ? 0 : next, done: done, replay: !!replay };
    loadPracticeQueue();
    renderDeskGuide();
    return true;
  }

  function renderDeskGuide() {
    const box = $('desk-guide');
    if (!box) return;
    document.querySelectorAll('.desk-guide-spot').forEach((el) => el.classList.remove('desk-guide-spot'));
    document.querySelectorAll('.desk-guide-look').forEach((el) => el.classList.remove('desk-guide-look'));
    if (!state.guide) {
      box.classList.add('hidden');
      const replay = $('practice-replay');
      if (replay) replay.style.display = '';
      return;
    }
    const replayBtn = $('practice-replay');
    if (replayBtn) replayBtn.style.display = 'none';
    box.classList.remove('hidden');
    const spec = currentGuideCase();
    const steps = spec ? spec.steps : [];
    const step = currentGuideStep() || steps[steps.length - 1];
    const kicker = $('desk-guide-kicker');
    if (kicker) kicker.textContent = 'Práctica ' + (state.guide.caseIndex + 1) + '/10 · desk real · no es el queue semanal';
    $('desk-guide-title').textContent = (spec ? spec.title.replace(/^PRACTICE \d+ · /, '') + ' — ' : '') + step.title;
    $('desk-guide-body').textContent = step.body;
    const model = $('desk-guide-model');
    if (model) {
      if (step.model) { model.classList.remove('hidden'); model.textContent = step.model; }
      else model.classList.add('hidden');
    }
    $('desk-guide-steps').innerHTML = PRACTICE_CASES.map((item, i) =>
      '<span class="' + (i < state.guide.caseIndex || (state.guide.done || []).indexOf(item.id) >= 0 ? 'done' : (i === state.guide.caseIndex ? 'on' : '')) + '">' + (i + 1) + '</span>'
    ).join('');
    $('desk-guide-next').style.display = step.next ? '' : 'none';
    (step.look || (step.target ? [step.target] : [])).forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        el.classList.add(step.kind === 'look' ? 'desk-guide-look' : 'desk-guide-spot');
      });
    });
    const focusSel = step.target || (step.look && step.look[0]);
    if (focusSel) {
      const el = document.querySelector(focusSel);
      if (el) try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_) { /* older tablets */ }
    }
  }

  function deskGuideMark(action) {
    if (!state.guide) return;
    const step = currentGuideStep();
    if (!step || step.action !== action) return;
    state.guide.step += 1;
    renderDeskGuide();
  }

  async function completePracticeCase() {
    const spec = currentGuideCase();
    if (!spec || !state.guide) return completeDeskGuide();
    const replay = Boolean(state.guide.replay);
    const done = Array.isArray(state.guide.done) ? state.guide.done.slice() : [];
    if (done.indexOf(spec.id) < 0) done.push(spec.id);
    if (!replay) {
      try {
        const data = await api(crmPath('/training/progress'), { method: 'POST', body: { practiceCaseId: spec.id } });
        if (Array.isArray(data.deskGuideDone)) {
          data.deskGuideDone.forEach((id) => { if (done.indexOf(id) < 0) done.push(id); });
        }
      } catch (_) { /* keep local progress this session */ }
    }
    const from = state.guide.caseIndex;
    const next = PRACTICE_CASES.findIndex((item, i) => i > from && (replay || done.indexOf(item.id) < 0));
    if (next < 0) return completeDeskGuide();
    state.guide.done = done;
    state.guide.caseIndex = next;
    state.guide.step = 0;
    loadPracticeQueue();
    renderDeskGuide();
    toast('Práctica ' + (from + 1) + '/10 lista. Siguiente caso en el queue.');
  }

  async function completeDeskGuide() {
    state.guide = null;
    renderDeskGuide();
    toast('10 prácticas completas. El queue semanal ya está abierto.');
    try {
      if (!state.preview) await api(crmPath('/training/progress'), { method: 'POST', body: { acceptDeskGuide: true } });
    } catch (_) { /* session unlock still works */ }
    await loadPool();
  }

  /* ─────────────── BOOT ─────────────── */

  async function boot() {
    bind();
    setInterval(() => { state.sessionSec++; $('sess').textContent = clock(state.sessionSec); }, 1000);
    try {
      if (state.product === 'kamuk') document.documentElement.classList.add('kamuk-desk');
      const host = location.hostname;
      state.preview = new URLSearchParams(location.search).get('preview') === '1'
        || host === 'localhost' || host === '127.0.0.1' || location.protocol === 'file:';
      let deskGuideCompleted = false;
      if (state.preview) {
        state.auth = { role: 'student', studentId: state.product === 'kamuk' ? 'KAM-PREVIEW' : 'IS-PREVIEW', name: 'Preview Executive' };
        state.employee = { id: state.auth.studentId, name: 'Preview Executive', team: 'Apex' };
      } else {
        state.auth = await api('/auth/verify', { method: 'GET' });
        const studentId = String(state.auth.studentId || '');
        const productMatches = state.product === 'kamuk' ? studentId.startsWith('KAM-') : !studentId.startsWith('KAM-');
        if (state.auth.role !== 'student' || !productMatches) {
          throw new Error('Open this desk from your Training Book while logged in.');
        }
        const presence = await api(crmPath('/presence'), { method: 'POST', body: { status: 'online' } });
        state.employee = presence.employee;
        state.metrics = presence.metrics || state.metrics;
        deskGuideCompleted = Boolean(presence.deskGuideCompleted);
        state.deskGuideDone = Array.isArray(presence.deskGuideDone) ? presence.deskGuideDone : [];
      }
      const response = await fetch(PACK_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error('The corporate case pack could not be loaded.');
      state.pack = await response.json();
      state.cases = state.pack.cases || [];
      if (!state.cases.length) throw new Error('The corporate case pack is empty.');

      const sectors = ['All', ...new Set(state.cases.map((c) => c.sector))];
      $('queue-filters').innerHTML = sectors.map((s, i) => `<button class="filter-btn${i === 0 ? ' on' : ''}" data-filter="${esc(s)}">${esc(s.replace(' Banking', '').replace(' Services', ''))}</button>`).join('');

      $('topbar-sub').textContent = `Corporate Banking Desk · ${state.employee.name} · ${state.employee.id} · Team ${state.employee.team}`;
      $('st-display').textContent = state.employee.name;
      $('st-id').textContent = state.employee.id;
      $('st-team').textContent = state.employee.team;
      updateMetrics();
      $('gate').classList.add('hidden');
      $('app').classList.remove('hidden');
      if (state.preview) {
        startDeskGuide([]);
      } else {
        await resumeActiveCase();
        if (!state.active && !deskGuideCompleted) startDeskGuide(state.deskGuideDone || []);
        else if (!state.active) {
          await loadPool();
          await loadLeaderboard().catch(() => {});
        }
        setInterval(heartbeat, 20000);
      }
    } catch (error) {
      $('gate-msg').textContent = error.code === 'NESTING_REQUIRED'
        ? 'Finish the Nesting section in your Training Book before entering the Case Floor.'
        : error.message;
      document.querySelector('.gate .spin').style.display = 'none';
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
