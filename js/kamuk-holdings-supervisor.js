(function () {
  'use strict';

  const PRODUCT = new URLSearchParams(location.search).get('product') === 'kamuk' ? 'kamuk' : 'infinity';
  const API = typeof INFINITY_API !== 'undefined' ? INFINITY_API : 'https://alice-by-infinity.onrender.com';
  const state = { auth: null, data: { live: [], leaderboard: [], resolveRates: [], recentTouches: [], summary: {} }, selected: null, timer: null };
  const $ = id => document.getElementById(id);
  const initials = name => String(name || '?').split(/\s+/).slice(0, 2).map(value => value[0]).join('').toUpperCase();
  const duration = seconds => `${String(Math.floor((seconds || 0) / 60)).padStart(2, '0')}:${String((seconds || 0) % 60).padStart(2, '0')}`;
  const crmPath = suffix => `/${PRODUCT === 'kamuk' ? 'kamuk' : 'infinity'}-holdings/crm${suffix}`;

  async function api(path, options = {}) {
    let response;
    if (typeof infinityFetch === 'function') {
      response = await infinityFetch(path, options);
    } else {
      const token = (typeof getAuthToken === 'function' && getAuthToken())
        || localStorage.getItem('infinity_auth_token')
        || sessionStorage.getItem('infinity_auth_token')
        || '';
      response = await fetch(API.replace(/\/$/, '') + path, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Supervisor feed unavailable');
    return data;
  }

  async function boot() {
    prepareUi();
    bind();
    try {
      state.auth = await api('/auth/verify', { method: 'GET' });
      if (!['trainer', 'superadmin', 'master'].includes(state.auth.role)) throw new Error('Trainer or administrator authority required.');
      $('supervisorName').textContent = state.auth.name || 'Supervisor';
      $('gate').classList.add('hidden');
      $('app').classList.remove('hidden');
      await refresh();
      state.timer = setInterval(refresh, 5000);
    } catch (error) {
      $('gateStatus').textContent = error.message;
    }
  }

  function prepareUi() {
    const metrics = document.querySelector('.metrics');
    metrics.innerHTML = [
      ['ti-wifi', 'Connected', 'connectedMetric', 'active desks'],
      ['ti-briefcase', 'Working', 'workingMetric', 'owned now'],
      ['ti-inbox', 'Unassigned', 'unassignedMetric', 'open pool'],
      ['ti-sparkles', 'Fresh pool', 'freshPoolMetric', 'first touches'],
      ['ti-repeat', 'Follow-up pool', 'followUpPoolMetric', 'returning cases'],
      ['ti-brain', 'Pending AI', 'pendingMetric', 'awaiting evaluation']
    ].map(([icon, label, id, note]) =>
      `<article><i class="ti ${icon}"></i><div><span>${label}</span><strong id="${id}">0</strong><small>${note}</small></div></article>`
    ).join('');

    const board = document.querySelector('.team-board');
    board.innerHTML = '<div><span>WEEKLY WINNER</span><strong id="winnerName">—</strong><small id="winnerPoints">0 POINTS</small></div>';

    const resolutionTitle = document.querySelector('#resolutionsView .section-head h2');
    if (resolutionTitle) resolutionTitle.textContent = 'Recent touch ledger';
    const resolutionEyebrow = document.querySelector('#resolutionsView .section-head .eyebrow');
    if (resolutionEyebrow) resolutionEyebrow.textContent = 'AI-scored evidence trail';
    const headings = document.querySelectorAll('#resolutionsView th');
    ['Time', 'Executive', 'Touch', 'Case', 'Disposition', 'Duration', 'Score', ''].forEach((value, index) => {
      if (headings[index]) headings[index].textContent = value;
    });

    const qualityGrid = $('qualityView').querySelector('.quality-grid');
    qualityGrid.innerHTML = [
      '<article class="panel"><p class="eyebrow">Weekly competition</p><h2>Leaderboard</h2><div id="leaderboardList"></div></article>',
      '<article class="panel"><p class="eyebrow">Case outcomes</p><h2>Resolve rates</h2><div id="resolveRateList"></div></article>',
      '<article class="panel coaching"><p class="eyebrow">Supervisor attention</p><h2>Pending evaluations</h2><div id="coachingList"></div></article>'
    ].join('');

    const detail = document.querySelector('.detail');
    const coaching = document.createElement('section');
    coaching.className = 'coaching-note';
    coaching.innerHTML = '<h3>Add coaching note</h3><form id="coachingForm"><textarea id="coachingNote" maxlength="1600" required placeholder="Private coaching note for this executive"></textarea><button class="button" type="submit"><i class="ti ti-message-plus"></i> Save note</button><span id="coachingStatus"></span></form>';
    detail.append(coaching);

    const style = document.createElement('style');
    style.textContent = [
      '.metrics{grid-template-columns:repeat(6,1fr)}.team-board>div{min-width:190px}.team-board #winnerName{font-size:15px}',
      '.ranking-row,.rate-row{display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid var(--line);font-size:10px}.ranking-row b,.rate-row b{font-family:var(--mono);color:var(--blue)}',
      '.error-list{margin:0;padding-left:18px;color:var(--red);font-size:9px;line-height:1.6}.coaching-note textarea{width:100%;min-height:76px;resize:vertical;padding:10px;border:1px solid var(--line);border-radius:9px;font:10px var(--font)}.coaching-note form{display:grid;gap:8px}.coaching-note .button{justify-self:start}.coaching-note span{font-size:9px;color:var(--muted)}',
      '@media(max-width:1100px){.metrics{grid-template-columns:repeat(3,1fr)}}@media(max-width:650px){.metrics{grid-template-columns:1fr 1fr}}'
    ].join('');
    document.head.append(style);
  }

  function bind() {
    document.querySelector('.tabs').addEventListener('click', event => {
      const button = event.target.closest('[data-view]');
      if (!button) return;
      document.querySelectorAll('.tabs button').forEach(item => item.classList.toggle('active', item === button));
      document.querySelectorAll('.view').forEach(item => item.classList.remove('active'));
      $(`${button.dataset.view}View`).classList.add('active');
    });
    $('floorGrid').addEventListener('click', event => {
      const card = event.target.closest('[data-student]');
      if (!card) return;
      const live = (state.data.live || []).find(item => item.studentId === card.dataset.student);
      const touch = (state.data.recentTouches || []).find(item => item.studentId === card.dataset.student);
      if (live && live.activeCaseId) openLive(live, touch);
      else if (touch) openDetailAuthoritative(touch);
    });
    $('resolutionRows').addEventListener('click', event => {
      const button = event.target.closest('[data-touch]');
      if (!button) return;
      const touch = (state.data.recentTouches || []).find(item => (item.id || item.touchId) === button.dataset.touch);
      if (touch) openDetailAuthoritative(touch);
    });
    $('closeDetail').addEventListener('click', () => $('detailBackdrop').classList.remove('open'));
    $('detailBackdrop').addEventListener('click', event => {
      if (event.target === $('detailBackdrop')) $('detailBackdrop').classList.remove('open');
    });
    $('exportLedger').addEventListener('click', exportLedger);
    $('coachingForm').addEventListener('submit', submitCoaching);
  }

  async function refresh() {
    try {
      $('syncStatus').textContent = 'Synchronizing…';
      state.data = await api(`${crmPath('/supervisor')}?product=${encodeURIComponent(PRODUCT)}`, { method: 'GET' });
      render();
      $('syncStatus').textContent = 'Secure live feed';
      $('lastSync').textContent = new Date(state.data.generatedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (error) {
      $('syncStatus').textContent = error.message;
    }
  }

  function render() {
    const summary = state.data.summary || {};
    $('connectedMetric').textContent = summary.connected || 0;
    $('workingMetric').textContent = summary.working || 0;
    $('unassignedMetric').textContent = summary.unassigned || 0;
    $('freshPoolMetric').textContent = summary.freshPool || 0;
    $('followUpPoolMetric').textContent = summary.followUpPool || 0;
    $('pendingMetric').textContent = summary.pendingEvaluations || 0;
    const winner = state.data.winner;
    $('winnerName').textContent = winner ? winner.name || winner.studentId : 'No winner yet';
    $('winnerPoints').textContent = winner
      ? `${Number(winner.weeklyPoints) || 0} POINTS · bono de producción requiere 8/10`
      : 'Sin ganador de bono de producción (requiere 8/10)';
    renderFloor();
    renderTouches();
    renderLeaderboard();
    renderResolveRates();
    renderPending();
  }

  function renderFloor() {
    const live = state.data.live || [];
    if (!live.length) {
      $('floorGrid').innerHTML = '<article class="desk-card"><p class="eyebrow">Waiting for cohort</p><strong>No desks have checked in yet.</strong></article>';
      return;
    }
    $('floorGrid').replaceChildren(...live.map(item => {
      const employee = item.employee || { id: item.studentId, name: item.studentName || item.studentId };
      const card = document.createElement('article');
      card.className = `desk-card ${item.activeCaseId && item.connected ? 'is-working' : ''} ${!item.connected ? 'is-offline' : ''}`;
      card.dataset.student = item.studentId;
      card.style.cursor = 'pointer';
      const head = document.createElement('div');
      head.className = 'desk-head';
      head.innerHTML = `<div class="desk-avatar">${initials(employee.name)}</div><div class="desk-title"><strong></strong><span></span></div><span class="presence ${item.connected ? '' : 'off'}"></span>`;
      head.querySelector('.desk-title strong').textContent = employee.name;
      head.querySelector('.desk-title span').textContent = `${employee.id || item.studentId} · TEAM ${item.team || '—'}`;
      head.querySelector('.presence').textContent = item.connected ? (item.activeCaseId ? 'WORKING' : 'ONLINE') : 'OFFLINE';
      const box = document.createElement('div');
      box.className = 'case-box';
      const label = document.createElement('small');
      label.textContent = item.activeCaseId ? `${item.priority || 'CASE'} · ${item.activeCaseId}` : 'CURRENT OWNERSHIP';
      const title = document.createElement('strong');
      title.textContent = item.activeCaseId ? item.caseTitle : 'Available for assignment';
      const detail = document.createElement('span');
      detail.textContent = item.activeCaseId ? `${duration(item.elapsedSec)} elapsed · ${item.actionCount || 0} actions` : `${item.heartbeatAgeSec || 0}s since heartbeat`;
      box.append(label, title, detail);
      const stats = document.createElement('div');
      stats.className = 'desk-stats';
      [['Resolved', item.metrics?.resolved || 0], ['Resolve rate', `${item.metrics?.resolutionRate || 0}%`], ['Weekly points', item.metrics?.weeklyPoints || item.metrics?.points || 0]].forEach(([labelText, value]) => {
        const node = document.createElement('div');
        const span = document.createElement('span');
        const strong = document.createElement('strong');
        span.textContent = labelText;
        strong.textContent = value;
        node.append(span, strong);
        stats.append(node);
      });
      card.append(head, box, stats);
      return card;
    }));
  }

  function renderTouches() {
    $('resolutionRows').replaceChildren(...(state.data.recentTouches || []).map(record => {
      const evaluation = record.evaluation || {};
      const pending = record.pendingEvaluation || evaluation.pendingEvaluation;
      const row = document.createElement('tr');
      const values = [
        new Date(record.completedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        record.studentName || record.studentId,
        `#${record.touchNumber || 1}`,
        record.caseTitle || record.caseId,
        record.disposition || record.submission?.resolution?.disposition || '—',
        duration(record.durationSec),
        pending ? 'Pending' : `${evaluation.casePoints ?? '—'}/10`
      ];
      values.forEach((value, index) => {
        const cell = document.createElement('td');
        if (index === 1 || index === 3) {
          const strong = document.createElement('strong');
          const span = document.createElement('span');
          strong.textContent = value;
          span.textContent = index === 1 ? record.studentId : record.caseId;
          cell.append(strong, span);
        } else if (index === 6) {
          const badge = document.createElement('span');
          badge.className = `qa-badge ${pending || (Number(evaluation.casePoints) || 0) < 7 ? 'low' : ''}`;
          badge.textContent = value;
          cell.append(badge);
        } else cell.textContent = value;
        row.append(cell);
      });
      const action = document.createElement('td');
      const button = document.createElement('button');
      button.className = 'view-detail';
      button.dataset.touch = record.id || record.touchId;
      button.innerHTML = '<i class="ti ti-arrow-up-right"></i> Review';
      action.append(button);
      row.append(action);
      return row;
    }));
  }

  function renderLeaderboard() {
    const rows = state.data.leaderboard || [];
    $('leaderboardList').replaceChildren(...(rows.length ? rows.map(row => {
      const node = document.createElement('div');
      node.className = 'ranking-row';
      node.innerHTML = `<b>#${row.rank || '—'}</b><span></span><strong>${Number(row.weeklyPoints) || 0} pts</strong>`;
      node.querySelector('span').textContent = row.name || row.studentId;
      return node;
    }) : [emptyNode('No scores recorded this week.')]));
  }

  function renderResolveRates() {
    const rows = state.data.resolveRates || [];
    $('resolveRateList').replaceChildren(...(rows.length ? rows.map(row => {
      const node = document.createElement('div');
      node.className = 'rate-row';
      node.innerHTML = `<b>${Number(row.resolutionRate) || 0}%</b><span></span><strong>${Number(row.resolved) || 0}/${Number(row.started) || 0}</strong>`;
      node.querySelector('span').textContent = row.name || row.studentId;
      return node;
    }) : [emptyNode('No resolve-rate data yet.')]));
  }

  function renderPending() {
    const rows = (state.data.recentTouches || []).filter(row => row.pendingEvaluation || row.evaluation?.pendingEvaluation);
    $('coachingList').replaceChildren(...(rows.length ? rows.map(row => {
      const node = document.createElement('div');
      node.className = 'coach-item';
      const name = document.createElement('strong');
      const note = document.createElement('span');
      name.textContent = row.studentName || row.studentId;
      note.textContent = `${row.caseId} · Touch ${row.touchNumber || 1} is waiting for AI evaluation`;
      node.append(name, note);
      return node;
    }) : [emptyNode('No AI evaluations are pending.')]));
  }

  function emptyNode(text) {
    return Object.assign(document.createElement('div'), { className: 'coach-item', textContent: text });
  }

  async function openDetailAuthoritative(record) {
    try {
      if (record?.id) {
        const data = await api(`${crmPath(`/supervisor/resolution/${encodeURIComponent(record.id)}`)}?product=${encodeURIComponent(PRODUCT)}`, { method: 'GET' });
        openDetail(data.record || record);
        return;
      }
    } catch (_) { /* cached touch remains authoritative enough for display */ }
    openDetail(record);
  }

  function openLive(live, latest) {
    const events = Array.isArray(live.events) ? live.events : [];
    openDetail({
      id: latest?.id || `KHCRM-LIVE-${live.studentId}`,
      studentId: live.studentId,
      studentName: live.employee?.name || live.studentName || live.studentId,
      team: live.team,
      caseId: live.activeCaseId,
      caseTitle: live.caseTitle,
      durationSec: live.elapsedSec,
      evaluation: latest?.evaluation || { pendingEvaluation: true, verdict: 'Live touch in progress', errors: [] },
      submission: {
        resolution: latest?.submission?.resolution || { disposition: live.status || 'In progress', summary: 'Executive currently owns this case.', nextStep: 'Continue supervisor observation.' },
        actions: live.actions || events.filter(event => event.type === 'action').map(event => event.payload || event),
        notes: events.filter(event => event.type === 'note').map(event => event.payload || event),
        events
      }
    });
  }

  function openDetail(record) {
    state.selected = record;
    const evaluation = record.evaluation || {};
    const submission = record.submission || {};
    const resolution = submission.resolution || {};
    $('detailCase').textContent = `${record.caseId || 'Touch'} · ${record.caseTitle || ''}`;
    $('detailStudent').textContent = `${record.studentName || record.studentId} · ${record.studentId}`;
    $('detailQa').textContent = evaluation.pendingEvaluation ? '…' : evaluation.casePoints ?? '—';
    $('detailDisposition').textContent = record.disposition || resolution.disposition || '—';
    $('detailDuration').textContent = duration(record.durationSec);
    $('detailTeam').textContent = record.team || '—';
    $('detailVerdict').textContent = evaluation.verdict || (evaluation.pendingEvaluation ? 'Pending AI evaluation' : '—');
    $('detailSummary').textContent = resolution.summary || evaluation.summary || '—';
    $('detailNext').textContent = resolution.nextStep || '—';
    fillList('detailStrengths', evaluation.strengths || []);
    const errors = Array.isArray(evaluation.errors) ? evaluation.errors : [];
    fillList('detailImprove', [...(evaluation.improvements || []), ...errors.map(item => `−1 ${item.label || item.code}: ${item.evidence || ''}`)]);
    $('detailActions').replaceChildren(...(submission.actions || []).map(action => {
      const chip = document.createElement('span');
      chip.textContent = action.label || action.key || action.detail;
      chip.title = action.detail || '';
      return chip;
    }));

    const call = submission.call || record.call || null;
    const events = submission.events || [];
    const callEvents = events.filter(event => String(event.type || '').startsWith('call'));
    const transcript = call?.transcript || callEvents.find(event => event.transcript?.length)?.transcript || callEvents.find(event => event.payload?.transcript?.length)?.payload?.transcript || [];
    $('detailCallStatus').textContent = call?.status || (transcript.length ? 'logged' : 'No call');
    $('detailCallDuration').textContent = call?.durationSec != null ? duration(call.durationSec) : '—';
    $('detailCallMood').textContent = call?.mood || '—';
    $('detailCallTurns').textContent = transcript.length;
    $('detailCallSummary').textContent = call?.summary || (transcript.length ? 'Transcript available for review.' : 'No call was logged for this touch.');
    $('detailCallTranscript').replaceChildren(...transcript.map(turn => {
      const node = document.createElement('div');
      node.className = 'call-turn-row';
      const who = document.createElement('strong');
      const text = document.createElement('span');
      who.textContent = turn.role === 'agent' || turn.role === 'client' ? 'Client' : 'Executive';
      text.textContent = turn.text || '';
      node.append(who, text);
      return node;
    }));

    const notes = submission.notes || [];
    const emails = events.filter(event => event.type === 'email' || event.type === 'email-client');
    const communications = [
      ...notes.map(note => {
        const value = note.payload || note;
        return `NOTE · ${value.channel || 'Internal'} · ${value.text || value.note || ''}`;
      }),
      ...emails.map(email => {
        const value = email.payload || email;
        return `EMAIL · ${value.subject || 'Client email'} · ${value.body || ''}`;
      })
    ];
    $('detailComms').replaceChildren(...(communications.length ? communications.map(text => {
      const node = document.createElement('div');
      node.className = 'comm-item';
      node.textContent = text;
      return node;
    }) : [Object.assign(document.createElement('div'), { className: 'comm-item', textContent: 'No notes or emails were recorded.' })]));
    $('coachingNote').value = '';
    $('coachingStatus').textContent = '';
    $('detailBackdrop').classList.add('open');
  }

  function fillList(id, values) {
    $(id).replaceChildren(...values.map(value => {
      const item = document.createElement('li');
      item.textContent = value;
      return item;
    }));
  }

  async function submitCoaching(event) {
    event.preventDefault();
    if (!state.selected?.studentId) return;
    const note = $('coachingNote').value.trim();
    if (!note) return;
    const button = event.currentTarget.querySelector('button');
    button.disabled = true;
    $('coachingStatus').textContent = 'Saving…';
    try {
      await api(`${crmPath('/supervisor/coaching')}?product=${encodeURIComponent(PRODUCT)}`, {
        method: 'POST',
        body: JSON.stringify({
          studentId: state.selected.studentId,
          touchId: String(state.selected.id || '').startsWith('KHCRM-TOUCH-') ? state.selected.id : undefined,
          note
        })
      });
      $('coachingNote').value = '';
      $('coachingStatus').textContent = 'Coaching note saved. AI points were not changed.';
    } catch (error) {
      $('coachingStatus').textContent = error.message;
    } finally {
      button.disabled = false;
    }
  }

  function exportLedger() {
    const rows = [['Completed At', 'Student ID', 'Student', 'Case ID', 'Touch', 'Disposition', 'Duration Sec', 'Case Points', 'Deductions'], ...(state.data.recentTouches || []).map(record => [
      record.completedAt, record.studentId, record.studentName, record.caseId, record.touchNumber,
      record.disposition || record.submission?.resolution?.disposition, record.durationSec,
      record.evaluation?.pendingEvaluation ? 'Pending' : record.evaluation?.casePoints,
      (record.evaluation?.errors || []).length
    ])];
    const csv = rows.map(row => row.map(value => `"${String(value == null ? '' : value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${PRODUCT}-holdings-touch-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  boot();
})();
