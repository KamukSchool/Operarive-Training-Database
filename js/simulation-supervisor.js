(function () {
  'use strict';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function fmtDate(value) {
    if (!value) return '—';
    try { return new Date(value).toLocaleString('es-CR'); } catch (_) { return String(value); }
  }

  function productFor(config) {
    return config && config.product === 'kamuk' ? 'kamuk' : 'infinity';
  }

  function crmPath(product, suffix) {
    return '/' + (product === 'kamuk' ? 'kamuk' : 'infinity') + '-holdings/crm' + suffix;
  }

  async function apiRequest(path, options) {
    options = options || {};
    var response;
    if (typeof infinityFetch === 'function') {
      response = await infinityFetch(path, options);
    } else {
      var apiRoot = String(typeof INFINITY_API !== 'undefined' ? INFINITY_API : 'https://alice-by-infinity.onrender.com').replace(/\/$/, '');
      var token = (typeof getAuthToken === 'function' && getAuthToken())
        || localStorage.getItem('infinity_auth_token')
        || sessionStorage.getItem('infinity_auth_token')
        || '';
      var headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
      if (token) headers.Authorization = 'Bearer ' + token;
      response = await fetch(apiRoot + path, Object.assign({}, options, { headers: headers }));
    }
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(data.error || 'Supervisor feed unavailable');
    return data;
  }

  function rowsToFallback(rows, product, students) {
    rows = Array.isArray(rows) ? rows : [];
    var now = Date.now();
    var studentMap = {};
    (students || []).forEach(function (student) {
      studentMap[student.id] = student;
    });
    var live = rows.filter(function (row) {
      return String(row.id || '').indexOf('KHCRM-LIVE-') === 0 && row.data
        && (!row.data.product || row.data.product === product);
    }).map(function (row) {
      var data = Object.assign({}, row.data);
      var age = now - new Date(data.updatedAt || 0).getTime();
      data.connected = age < 70000;
      data.heartbeatAgeSec = Math.max(0, Math.round(age / 1000));
      return data;
    });
    var workItems = rows.filter(function (row) {
      return String(row.id || '').indexOf('KHCRM-WORK-') === 0 && row.data
        && (!row.data.product || row.data.product === product);
    }).map(function (row) { return Object.assign({ id: row.id }, row.data); });
    var touches = rows.filter(function (row) {
      return String(row.id || '').indexOf('KHCRM-TOUCH-') === 0 && row.data
        && (!row.data.product || row.data.product === product);
    }).map(function (row) { return Object.assign({ id: row.id }, row.data); })
      .sort(function (a, b) { return String(b.completedAt || '').localeCompare(String(a.completedAt || '')); });
    var boardMap = {};
    touches.forEach(function (touch) {
      var id = touch.studentId;
      if (!id) return;
      var student = studentMap[id] || {};
      var row = boardMap[id] || {
        studentId: id,
        name: touch.studentName || (student.info && student.info.name) || student.name || id,
        weeklyPoints: 0, handled: 0, resolved: 0, started: 0, scoreTotal: 0
      };
      row.handled += 1;
      row.started += 1;
      row.resolved += touch.kind === 'resolved' ? 1 : 0;
      row.weeklyPoints += Number(touch.evaluation && touch.evaluation.pointsAwarded) || 0;
      row.scoreTotal += Number(touch.evaluation && touch.evaluation.casePoints) || 0;
      boardMap[id] = row;
    });
    var leaderboard = Object.keys(boardMap).map(function (id) {
      var row = boardMap[id];
      row.averageScore = row.handled ? Math.round(row.scoreTotal / row.handled * 10) / 10 : 0;
      row.resolutionRate = row.started ? Math.round(row.resolved / row.started * 100) : 0;
      delete row.scoreTotal;
      return row;
    }).sort(function (a, b) { return b.weeklyPoints - a.weeklyPoints || b.resolved - a.resolved; })
      .map(function (row, index) { row.rank = index + 1; return row; });
    return {
      generatedAt: new Date().toISOString(),
      summary: {
        connected: live.filter(function (item) { return item.connected; }).length,
        working: live.filter(function (item) { return item.connected && item.activeCaseId; }).length,
        unassigned: workItems.filter(function (item) { return item.status === 'unassigned'; }).length,
        freshPool: workItems.filter(function (item) { return item.status === 'unassigned' && Number(item.touchNumber) === 1; }).length,
        followUpPool: workItems.filter(function (item) { return item.status === 'unassigned' && Number(item.touchNumber) > 1; }).length,
        pendingEvaluations: touches.filter(function (item) { return item.pendingEvaluation || (item.evaluation && item.evaluation.pendingEvaluation); }).length
      },
      live: live,
      leaderboard: leaderboard,
      winner: leaderboard[0] || null,
      resolveRates: leaderboard.map(function (row) {
        return { studentId: row.studentId, name: row.name, started: row.started, resolved: row.resolved, resolutionRate: row.resolutionRate };
      }),
      recentTouches: touches.slice(0, 100),
      fallback: true
    };
  }

  async function loadData(config, product) {
    try {
      return await apiRequest(crmPath(product, '/supervisor') + '?product=' + encodeURIComponent(product), { method: 'GET' });
    } catch (apiError) {
      if (!config.sessionsTable || typeof dbGet !== 'function') throw apiError;
      var sessions = await dbGet(config.sessionsTable);
      var students = typeof config.students === 'function' ? config.students() : [];
      return rowsToFallback(sessions, product, students);
    }
  }

  function injectStyles() {
    if (document.getElementById('sim-supervisor-styles')) return;
    var style = document.createElement('style');
    style.id = 'sim-supervisor-styles';
    style.textContent = [
      '.sim-sup-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:16px}.sim-sup-head h2{font-size:20px;color:var(--navy);margin:0 0 4px}.sim-sup-head p{font-size:12px;color:var(--t3);margin:0}',
      '.sim-sup-metrics{display:grid;grid-template-columns:repeat(6,1fr);gap:9px;margin-bottom:14px}.sim-sup-metric,.sim-sup-card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:13px}.sim-sup-metric span{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.07em;color:var(--t3)}.sim-sup-metric strong{font-size:21px;color:var(--navy)}',
      '.sim-sup-winner{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;padding:15px;border-radius:12px;background:linear-gradient(120deg,var(--navy),#284c70);color:#fff}.sim-sup-winner span{font-size:9px;text-transform:uppercase;opacity:.7}.sim-sup-winner strong{display:block;font-size:18px}.sim-sup-winner b{font-size:25px}',
      '.sim-sup-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-bottom:13px}.sim-sup-card{overflow:auto}.sim-sup-card h3{font-size:13px;margin:0 0 10px;color:var(--navy)}',
      '.sim-sup-table{width:100%;border-collapse:collapse;font-size:10px}.sim-sup-table th{text-align:left;color:var(--t3);font-size:8px;text-transform:uppercase;padding:7px;border-bottom:1px solid var(--border)}.sim-sup-table td{padding:8px 7px;border-bottom:1px solid var(--border);vertical-align:top}',
      '.sim-chip{display:inline-block;border-radius:99px;padding:3px 7px;font-weight:800;font-size:8px}.sim-chip.ok{background:#e8f5ee;color:#2d6a40}.sim-chip.warn{background:#fff7e6;color:#8a5100}.sim-chip.off{background:#f1f5f9;color:#64748b}.sim-errors{color:#a83232;font-weight:700}.sim-coach{display:flex;gap:6px;margin-top:6px}.sim-coach input{min-width:160px;flex:1;border:1px solid var(--border);border-radius:7px;padding:6px;font-size:10px}.sim-coach button{border:0;border-radius:7px;padding:6px 9px;background:var(--navy);color:#fff;font-size:9px;font-weight:700}.sim-empty{padding:16px;text-align:center;color:var(--t3);font-size:11px}',
      '@media(max-width:1050px){.sim-sup-metrics{grid-template-columns:repeat(3,1fr)}}@media(max-width:760px){.sim-sup-grid{grid-template-columns:1fr}.sim-sup-metrics{grid-template-columns:1fr 1fr}}'
    ].join('');
    document.head.appendChild(style);
  }

  function table(headers, body, empty) {
    if (!body) return '<div class="sim-empty">' + esc(empty) + '</div>';
    return '<table class="sim-sup-table"><thead><tr>' + headers.map(function (item) {
      return '<th>' + esc(item) + '</th>';
    }).join('') + '</tr></thead><tbody>' + body + '</tbody></table>';
  }

  function renderLive(live) {
    return table(['Estudiante', 'Propiedad actual', 'Estado', 'Actividad'], (live || []).map(function (item) {
      var employee = item.employee || {};
      return '<tr><td><strong>' + esc(employee.name || item.studentName || item.studentId) + '</strong><br>' + esc(item.studentId || employee.id || '') + '</td>'
        + '<td><strong>' + esc(item.activeCaseId || 'Sin asignar') + '</strong><br>' + esc(item.caseTitle || '') + '</td>'
        + '<td><span class="sim-chip ' + (item.connected ? 'ok' : 'off') + '">' + esc(item.connected ? (item.activeCaseId ? 'Trabajando' : 'Conectado') : 'Offline') + '</span></td>'
        + '<td>' + (Number(item.actionCount) || 0) + ' acciones<br>' + (Number(item.heartbeatAgeSec) || 0) + 's heartbeat</td></tr>';
    }).join(''), 'No hay estudiantes conectados.');
  }

  function renderLeaderboard(rows) {
    return table(['#', 'Estudiante', 'Puntos', 'Promedio', 'Resueltos'], (rows || []).map(function (row) {
      return '<tr><td><strong>' + esc(row.rank || '—') + '</strong></td><td>' + esc(row.name || row.studentId) + '</td>'
        + '<td><strong>' + (Number(row.weeklyPoints) || 0) + '</strong></td><td>' + (Number(row.averageScore) || 0) + '/10</td>'
        + '<td>' + (Number(row.resolved) || 0) + '</td></tr>';
    }).join(''), 'Todavía no hay puntos esta semana.');
  }

  function renderRates(rows) {
    return table(['Estudiante', 'Iniciados', 'Resueltos', 'Resolve rate'], (rows || []).map(function (row) {
      return '<tr><td>' + esc(row.name || row.studentId) + '</td><td>' + (Number(row.started) || 0) + '</td>'
        + '<td>' + (Number(row.resolved) || 0) + '</td><td><strong>' + (Number(row.resolutionRate) || 0) + '%</strong></td></tr>';
    }).join(''), 'Sin casos iniciados.');
  }

  function renderTouches(rows) {
    return table(['Fecha', 'Estudiante / caso', 'Resultado', 'Deducciones', 'Coaching'], (rows || []).map(function (touch) {
      var evaluation = touch.evaluation || {};
      var errors = Array.isArray(evaluation.errors) ? evaluation.errors : [];
      var pending = touch.pendingEvaluation || evaluation.pendingEvaluation;
      return '<tr><td>' + fmtDate(touch.completedAt) + '</td><td><strong>' + esc(touch.studentName || touch.studentId) + '</strong><br>' + esc(touch.caseId || '') + ' · ' + esc(touch.caseTitle || '') + '</td>'
        + '<td>' + esc(touch.disposition || (touch.submission && touch.submission.resolution && touch.submission.resolution.disposition) || '—') + '<br><span class="sim-chip ' + (pending ? 'warn' : 'ok') + '">' + esc(pending ? 'Evaluación pendiente' : (evaluation.casePoints == null ? '—' : evaluation.casePoints + '/10')) + '</span></td>'
        + '<td class="sim-errors">' + (pending ? 'Pendiente' : ('−' + errors.length + ' (' + errors.map(function (item) { return esc(item.label || item.code); }).join(', ') + ')')) + '</td>'
        + '<td><form class="sim-coach" data-student="' + esc(touch.studentId) + '" data-touch="' + esc(touch.id || touch.touchId || '') + '"><input name="note" maxlength="1600" required placeholder="Nota de coaching"><button type="submit">Guardar</button></form></td></tr>';
    }).join(''), 'No hay touches recientes.');
  }

  function renderTraining(rows) {
    return table(['Estudiante', 'Módulos', 'Certificación', 'Casos', 'Nesting'], (rows || []).map(function (row) {
      return '<tr><td><strong>' + esc(row.name || row.studentId) + '</strong><br><span style="color:var(--t3)">' + esc(row.studentId) + '</span></td>'
        + '<td>' + (Number(row.modulesDone) || 0) + '/' + (Number(row.modulesTotal) || 8) + (row.courseComplete ? ' · curso listo' : '') + '</td>'
        + '<td><span class="sim-chip ' + (row.quizPassed ? 'ok' : 'warn') + '">' + (row.quizPassed ? (row.quizScore || 0) + '%' : ((row.quizScore || 0) + '% · ' + (row.quizAttempts || 0) + ' intentos')) + '</span></td>'
        + '<td>' + (Number(row.homeReady) || 0) + '/' + (Number(row.homeTotal) || 10) + '</td>'
        + '<td>' + (row.nestingCompletedAt ? '<span class="sim-chip ok">Listo</span><br>' + fmtDate(row.nestingCompletedAt) : '<span class="sim-chip off">Pendiente</span>') + '</td></tr>';
    }), 'Todavía no hay progreso de e-learning.');
  }

  async function submitCoaching(form, product) {
    var input = form.querySelector('[name="note"]');
    var button = form.querySelector('button');
    var note = input.value.trim();
    if (!note) return;
    button.disabled = true;
    try {
      await apiRequest(crmPath(product, '/supervisor/coaching') + '?product=' + encodeURIComponent(product), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: form.getAttribute('data-student'), touchId: form.getAttribute('data-touch') || undefined, note: note })
      });
      input.value = '';
      if (typeof showToast === 'function') showToast('Nota de coaching guardada.');
    } catch (error) {
      if (typeof showToast === 'function') showToast(error.message, 'err');
      else window.alert(error.message);
    } finally {
      button.disabled = false;
    }
  }

  async function render(root, config) {
    if (!root) return;
    config = config || {};
    injectStyles();
    var product = productFor(config);
    root.innerHTML = '<div class="loading"><i class="ti ti-loader spin"></i><span>Cargando nesting floor…</span></div>';
    try {
      var data = await loadData(config, product);
      var summary = data.summary || {};
      var winner = data.winner;
      root.innerHTML = '<div class="sim-sup-head"><div><h2><i class="ti ti-building-bank"></i> ' + esc(config.label || (product === 'kamuk' ? 'Kamuk' : 'Infinity')) + ' Nesting Floor</h2>'
        + '<p>Propiedad en vivo, calidad AI y coaching del equipo.' + (data.fallback ? ' Vista de respaldo local.' : '') + '</p></div>'
        + '<button class="btn btn-outline btn-sm" id="sim-sup-refresh"><i class="ti ti-refresh"></i> Actualizar</button></div>'
        + '<div class="sim-sup-metrics">'
        + [['Conectados', summary.connected], ['Trabajando', summary.working], ['Sin asignar', summary.unassigned], ['Pool fresco', summary.freshPool], ['Follow-up', summary.followUpPool], ['AI pendientes', summary.pendingEvaluations]].map(function (metric) {
          return '<div class="sim-sup-metric"><span>' + metric[0] + '</span><strong>' + (Number(metric[1]) || 0) + '</strong></div>';
        }).join('') + '</div>'
        + (winner ? '<div class="sim-sup-winner"><div><span>Ganador semanal · bono de producción si 8/10</span><strong>' + esc(winner.name || winner.studentId) + '</strong></div><b>' + (Number(winner.weeklyPoints) || 0) + ' pts</b></div>' : '')
        + '<div class="sim-sup-grid"><section class="sim-sup-card"><h3>Propiedad en vivo</h3>' + renderLive(data.live) + '</section>'
        + '<section class="sim-sup-card"><h3>Leaderboard semanal</h3>' + renderLeaderboard(data.leaderboard) + '</section></div>'
        + '<div class="sim-sup-grid"><section class="sim-sup-card"><h3>Resolve rates</h3>' + renderRates(data.resolveRates) + '</section>'
        + '<section class="sim-sup-card"><h3>Touches recientes y deducciones</h3>' + renderTouches(data.recentTouches) + '</section></div>'
        + '<section class="sim-sup-card"><h3>E-learning 60 min · progreso del curso</h3>' + renderTraining(data.training) + '</section>';
      root.querySelector('#sim-sup-refresh').addEventListener('click', function () { render(root, config); });
      root.querySelectorAll('.sim-coach').forEach(function (form) {
        form.addEventListener('submit', function (event) {
          event.preventDefault();
          submitCoaching(form, product);
        });
      });
    } catch (error) {
      root.innerHTML = '<div class="sim-empty">No se pudo cargar el nesting floor: ' + esc(error.message) + '</div>';
    }
  }

  window.SimulationSupervisor = { render: render };
})();
