(function () {
  'use strict';
  const PRODUCT = new URLSearchParams(location.search).get('product') === 'kamuk' ? 'kamuk' : 'infinity';
  const state = { auth: null, data: { live: [], resolutions: [], summary: {}, teamScores: {} }, timer: null };
  const $ = id => document.getElementById(id);
  const initials = name => String(name || '?').split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  const duration = seconds => `${String(Math.floor((seconds || 0) / 60)).padStart(2, '0')}:${String((seconds || 0) % 60).padStart(2, '0')}`;

  async function api(path) {
    const response = await infinityFetch(path, { method: 'GET' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Supervisor feed unavailable');
    return data;
  }

  async function boot() {
    bind();
    try {
      state.auth = await api('/auth/verify');
      if (!['trainer', 'superadmin', 'master'].includes(state.auth.role)) throw new Error('Trainer or administrator authority required.');
      $('supervisorName').textContent = state.auth.name || 'Supervisor';
      $('gate').classList.add('hidden'); $('app').classList.remove('hidden');
      await refresh();
      state.timer = setInterval(refresh, 5000);
    } catch (error) {
      $('gateStatus').textContent = error.message;
    }
  }

  function bind() {
    document.querySelector('.tabs').addEventListener('click', event => {
      const button = event.target.closest('[data-view]');
      if (!button) return;
      document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('active', x === button));
      document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
      $(`${button.dataset.view}View`).classList.add('active');
      if (button.dataset.view === 'quality') requestAnimationFrame(renderQuality);
    });
    $('floorGrid').addEventListener('click', event => {
      const button = event.target.closest('[data-student]');
      if (!button) return;
      const live = state.data.live.find(item => item.studentId === button.dataset.student);
      const latest = state.data.resolutions.find(item => item.studentId === button.dataset.student);
      if (live?.activeCaseId) openLiveOrResolution(live, latest);
      else if (latest) openDetail(latest);
    });
    $('resolutionRows').addEventListener('click', event => {
      const button = event.target.closest('[data-resolution]');
      if (!button) return;
      const record = state.data.resolutions.find(item => item.id === button.dataset.resolution);
      if (record) openDetailAuthoritative(record);
    });
    $('closeDetail').addEventListener('click', () => $('detailBackdrop').classList.remove('open'));
    $('detailBackdrop').addEventListener('click', event => { if (event.target === $('detailBackdrop')) $('detailBackdrop').classList.remove('open'); });
    $('exportLedger').addEventListener('click', exportLedger);
    window.addEventListener('resize', () => { if ($('qualityView').classList.contains('active')) renderQuality(); });
  }

  async function refresh() {
    try {
      $('syncStatus').textContent = 'Synchronizing…';
      state.data = await api(`/infinity-holdings/crm/supervisor?product=${encodeURIComponent(PRODUCT)}`);
      render();
      $('syncStatus').textContent = 'Secure live feed';
      $('lastSync').textContent = new Date(state.data.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (error) {
      $('syncStatus').textContent = error.message;
    }
  }

  function render() {
    const { summary = {}, teamScores = {} } = state.data;
    $('connectedMetric').textContent = summary.connected || 0;
    $('workingMetric').textContent = summary.working || 0;
    if ($('onCallMetric')) $('onCallMetric').textContent = summary.onCall || 0;
    $('resolvedMetric').textContent = summary.resolved || 0;
    $('qaMetric').textContent = summary.qaAverage == null ? '—' : summary.qaAverage;
    $('apexScore').textContent = teamScores.Apex || 0;
    $('vanguardScore').textContent = teamScores.Vanguard || 0;
    renderFloor(); renderResolutions();
    if ($('qualityView').classList.contains('active')) renderQuality();
  }

  function renderFloor() {
    const live = state.data.live || [];
    if (!live.length) {
      $('floorGrid').innerHTML = '<article class="desk-card"><p class="eyebrow">Waiting for cohort</p><strong>No Kamuk desks have checked in yet.</strong></article>';
      return;
    }
    $('floorGrid').replaceChildren(...live.map(item => {
      const employee = item.employee || { id: item.studentId, name: item.studentId };
      const card = document.createElement('article');
      card.className = `desk-card ${item.activeCaseId && item.connected ? 'is-working' : ''} ${!item.connected ? 'is-offline' : ''}`;
      const head = document.createElement('div'); head.className = 'desk-head';
      const avatar = document.createElement('div'); avatar.className = 'desk-avatar'; avatar.textContent = initials(employee.name);
      const title = document.createElement('div'); title.className = 'desk-title';
      const name = document.createElement('strong'); name.textContent = employee.name;
      const meta = document.createElement('span'); meta.textContent = `${employee.id} · TEAM ${item.team || '—'}`;
      title.append(name, meta);
      const presence = document.createElement('span'); presence.className = `presence ${item.connected ? '' : 'off'}`; presence.textContent = item.connected ? (item.activeCaseId ? 'WORKING' : 'ONLINE') : 'OFFLINE';
      head.append(avatar, title, presence);
      const box = document.createElement('div'); box.className = 'case-box';
      const label = document.createElement('small'); label.textContent = item.activeCaseId ? `${item.priority || 'CASE'} · ${item.activeCaseId}` : 'CURRENT STATUS';
      const caseTitle = document.createElement('strong'); caseTitle.textContent = item.activeCaseId ? item.caseTitle : (item.status === 'resolved' ? `Resolved ${item.resolvedCaseId || ''}` : 'Available for assignment');
      const detail = document.createElement('span');
      detail.textContent = item.activeCaseId
        ? `${duration(item.elapsedSec)} elapsed · ${item.actionCount || 0} actions${item.onCall ? ` · ON CALL ${duration(item.callDurationSec)}` : ''}`
        : `${item.heartbeatAgeSec || 0}s since last heartbeat`;
      box.append(label, caseTitle, detail);
      if (item.onCall) {
        const call = document.createElement('div');
        call.className = 'call-chip';
        call.textContent = `CALL · mood ${item.call?.mood || '—'} · ${item.call?.status || 'connected'}`;
        box.append(call);
      }
      const stats = document.createElement('div'); stats.className = 'desk-stats';
      [['Resolved', item.metrics?.resolved || 0], ['Resolution rate', `${item.metrics?.resolutionRate || 0}%`], ['QA avg', item.metrics?.qaAverage == null ? '—' : item.metrics.qaAverage]].forEach(([a, b]) => {
        const col = document.createElement('div'); const span = document.createElement('span'); span.textContent = a; const strong = document.createElement('strong'); strong.textContent = b; col.append(span, strong); stats.append(col);
      });
      card.append(head, box, stats);
      const latest = state.data.resolutions.find(record => record.studentId === item.studentId);
      if (latest) { card.dataset.student = item.studentId; card.style.cursor = 'pointer'; card.title = 'Open latest Alice QA verdict'; }
      return card;
    }));
  }

  function renderResolutions() {
    $('resolutionRows').replaceChildren(...(state.data.resolutions || []).map(record => {
      const tr = document.createElement('tr');
      const cells = [
        new Date(record.resolvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        record.studentName || record.studentId,
        record.team,
        record.caseTitle,
        record.submission?.resolution?.disposition || '—',
        duration(record.durationSec),
        record.evaluation?.qaScore ?? '—'
      ];
      cells.forEach((value, index) => {
        const td = document.createElement('td');
        if (index === 1) { const strong = document.createElement('strong'); strong.textContent = value; const span = document.createElement('span'); span.textContent = record.studentId; td.append(strong, span); }
        else if (index === 3) { const strong = document.createElement('strong'); strong.textContent = value; const span = document.createElement('span'); span.textContent = `${record.caseId} · ${record.caseType}`; td.append(strong, span); }
        else if (index === 6) { const badge = document.createElement('span'); badge.className = `qa-badge ${(Number(value) || 0) < 70 ? 'low' : ''}`; badge.textContent = value; td.append(badge); }
        else td.textContent = value;
        tr.append(td);
      });
      const action = document.createElement('td'); const button = document.createElement('button'); button.className = 'view-detail'; button.dataset.resolution = record.id; button.innerHTML = '<i class="ti ti-arrow-up-right"></i> Review'; action.append(button); tr.append(action);
      return tr;
    }));
  }

  function renderQuality() {
    const records = state.data.resolutions || [];
    drawQaChart(records);
    const dimensionKeys = ['English', 'Judgment', 'Compliance', 'Documentation'];
    $('dimensionBars').replaceChildren(...dimensionKeys.map(key => {
      const values = records.map(record => Number(record.evaluation?.dimensions?.[key])).filter(Number.isFinite);
      const average = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
      const row = document.createElement('div'); row.className = 'dimension-row';
      const top = document.createElement('div'); const label = document.createElement('span'); label.textContent = key; const value = document.createElement('strong'); value.textContent = average || '—'; top.append(label, value);
      const bar = document.createElement('div'); bar.className = 'bar'; const fill = document.createElement('span'); fill.style.width = `${average}%`; bar.append(fill); row.append(top, bar); return row;
    }));
    const coaching = records.filter(record => (Number(record.evaluation?.qaScore) || 0) < 70).slice(0, 8);
    $('coachingList').replaceChildren(...(coaching.length ? coaching.map(record => {
      const node = document.createElement('div'); node.className = 'coach-item'; const name = document.createElement('strong'); name.textContent = `${record.studentName} · QA ${record.evaluation.qaScore}`; const note = document.createElement('span'); note.textContent = record.evaluation.improvements?.[0] || record.evaluation.summary; node.append(name, note); return node;
    }) : [Object.assign(document.createElement('div'), { className: 'coach-item', textContent: 'No resolution is currently below the QA threshold.' })]));
  }

  function drawQaChart(records) {
    const canvas = $('qaChart'), rect = canvas.getBoundingClientRect(), ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = rect.width * ratio; canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d'); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const buckets = [{ label: '<70', min: 0, max: 69, color: '#c34b50' }, { label: '70–84', min: 70, max: 84, color: '#b9771d' }, { label: '85+', min: 85, max: 100, color: '#238b66' }];
    const counts = buckets.map(bucket => records.filter(record => { const score = Number(record.evaluation?.qaScore) || 0; return score >= bucket.min && score <= bucket.max; }).length);
    const max = Math.max(...counts, 1), pad = 40, slot = (rect.width - pad * 2) / 3;
    ctx.strokeStyle = '#dde5eb'; ctx.beginPath(); ctx.moveTo(pad, rect.height - 30); ctx.lineTo(rect.width - pad, rect.height - 30); ctx.stroke();
    counts.forEach((count, index) => {
      const height = count / max * (rect.height - 80), x = pad + index * slot + slot * .2, y = rect.height - 30 - height;
      ctx.fillStyle = buckets[index].color; ctx.fillRect(x, y, slot * .6, height);
      ctx.textAlign = 'center'; ctx.fillStyle = '#102033'; ctx.font = '600 12px "IBM Plex Mono"'; ctx.fillText(String(count), x + slot * .3, y - 8);
      ctx.fillStyle = '#8996a5'; ctx.font = '9px "DM Sans"'; ctx.fillText(buckets[index].label, x + slot * .3, rect.height - 12);
    });
  }

  async function openDetailAuthoritative(record) {
    try {
      if (record?.id) {
        const detail = await api(`/infinity-holdings/crm/supervisor/resolution/${encodeURIComponent(record.id)}?product=${encodeURIComponent(PRODUCT)}`);
        openDetail(detail.record || record);
        return;
      }
    } catch (_) { /* fall through to cached record */ }
    openDetail(record);
  }

  function openLiveOrResolution(live, latest) {
    const events = Array.isArray(live.events) ? live.events : [];
    const notes = events.filter(event => event.type === 'note').map(event => event.payload || event);
    const openRecord = {
      id: `KHCRM-LIVE-${live.studentId}`,
      caseId: live.activeCaseId,
      caseTitle: live.caseTitle,
      studentId: live.studentId,
      studentName: live.employee?.name || live.studentName,
      team: live.team,
      durationSec: live.elapsedSec,
      call: live.call || null,
      evaluation: latest?.evaluation || { verdict: live.onCall ? 'Live desk — call in progress' : 'Live desk — case in progress', strengths: [], improvements: [] },
      submission: {
        resolution: latest?.submission?.resolution || {
          disposition: live.status || 'in progress',
          summary: live.onCall ? 'Student is currently on a simulated client call.' : 'Student is actively working this case.',
          nextStep: 'Supervisor monitors floor evidence until resolution.'
        },
        actions: live.actions || events.filter(event => event.type === 'action').map(event => event.payload || event),
        notes,
        events,
        call: live.call || null
      }
    };
    openDetailAuthoritative(openRecord);
  }

  function openDetail(record) {
    $('detailCase').textContent = `${record.caseId} · ${record.caseTitle}`;
    $('detailStudent').textContent = `${record.studentName} · ${record.studentId}`;
    $('detailQa').textContent = record.evaluation?.qaScore ?? '—';
    $('detailDisposition').textContent = record.submission?.resolution?.disposition || '—';
    $('detailDuration').textContent = duration(record.durationSec);
    $('detailTeam').textContent = record.team || '—';
    $('detailVerdict').textContent = record.evaluation?.verdict || '—';
    $('detailSummary').textContent = record.submission?.resolution?.summary || '—';
    $('detailNext').textContent = record.submission?.resolution?.nextStep || '—';
    fillList('detailStrengths', record.evaluation?.strengths || []);
    fillList('detailImprove', record.evaluation?.improvements || []);
    $('detailActions').replaceChildren(...(record.submission?.actions || []).map(action => {
      const chip = document.createElement('span');
      chip.textContent = action.label || action.key;
      return chip;
    }));

    const call = record.submission?.call || record.call || null;
    const callEvents = (record.submission?.events || []).filter(event => String(event.type || '').startsWith('call'));
    const transcript = call?.transcript
      || callEvents.find(event => event.transcript?.length)?.transcript
      || callEvents.find(event => event.payload?.transcript?.length)?.payload?.transcript
      || [];
    const moodTrail = call?.moodTrajectory || callEvents.map(event => event.payload?.mood || event.mood).filter(Boolean);
    if ($('detailCallStatus')) $('detailCallStatus').textContent = call?.status || (transcript.length ? 'logged' : 'No call');
    if ($('detailCallDuration')) $('detailCallDuration').textContent = call?.durationSec != null ? duration(call.durationSec) : '—';
    if ($('detailCallMood')) $('detailCallMood').textContent = call?.mood || moodTrail[moodTrail.length - 1] || '—';
    if ($('detailCallTurns')) $('detailCallTurns').textContent = transcript.length || 0;
    if ($('detailCallSummary')) {
      const moodNote = moodTrail.length ? ` Mood path: ${moodTrail.join(' → ')}.` : '';
      $('detailCallSummary').textContent = (call?.summary || (transcript.length ? 'Transcript available for supervisor review.' : 'No simulated call was logged on this resolution.')) + moodNote;
    }
    if ($('detailCallTranscript')) {
      $('detailCallTranscript').replaceChildren(...(transcript.length ? transcript.map(turn => {
        const node = document.createElement('div');
        node.className = 'call-turn-row';
        const who = document.createElement('strong');
        who.textContent = turn.role === 'agent' || turn.role === 'client' ? 'Client' : 'Executive';
        const text = document.createElement('span');
        text.textContent = turn.text || '';
        node.append(who, text);
        return node;
      }) : []));
    }

    const notes = record.submission?.notes || [];
    const emails = (record.submission?.events || []).filter(event => event.type === 'email' || event.type === 'email-client');
    if ($('detailComms')) {
      const items = [
        ...notes.map(note => `NOTE · ${note.channel || note.payload?.channel || 'Internal'} · ${note.text || note.payload?.text || ''}`),
        ...emails.map(email => {
          const payload = email.payload || email;
          return `EMAIL · ${payload.subject || 'Client email'} · ${String(payload.body || '').slice(0, 160)}`;
        })
      ].filter(text => !text.endsWith(' · '));
      $('detailComms').replaceChildren(...(items.length ? items.map(text => {
        const node = document.createElement('div');
        node.className = 'comm-item';
        node.textContent = text;
        return node;
      }) : [Object.assign(document.createElement('div'), { className: 'comm-item', textContent: 'No notes or emails were attached to this resolution.' })]));
    }

    $('detailBackdrop').classList.add('open');
  }

  function fillList(id, values) {
    $(id).replaceChildren(...values.map(value => { const li = document.createElement('li'); li.textContent = value; return li; }));
  }

  function exportLedger() {
    const rows = [['Resolved At', 'Student ID', 'Student', 'Team', 'Case ID', 'Case', 'Disposition', 'Duration Sec', 'QA'], ...(state.data.resolutions || []).map(record => [
      record.resolvedAt, record.studentId, record.studentName, record.team, record.caseId, record.caseTitle,
      record.submission?.resolution?.disposition, record.durationSec, record.evaluation?.qaScore
    ])];
    const csv = rows.map(row => row.map(value => `"${String(value == null ? '' : value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' }), link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = `kamuk-holdings-resolution-ledger-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
  }

  boot();
})();
