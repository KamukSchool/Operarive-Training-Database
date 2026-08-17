(function () {
  'use strict';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char];
    });
  }

  function fmtDate(value) {
    if (!value) return '—';
    try { return new Date(value).toLocaleString('es-CR'); } catch (_) { return value; }
  }

  function accessFor(student) {
    return student && student.simulationAccess ? student.simulationAccess : {};
  }

  function statusFor(student) {
    var access = accessFor(student);
    if (access.pinHash && access.pinSalt && !access.resetRequired) return ['Activo', 'ok'];
    if (access.resetRequired) return ['Reset pendiente', 'warn'];
    return ['Sin configurar', 'off'];
  }

  function injectStyles() {
    if (document.getElementById('sim-supervisor-styles')) return;
    var style = document.createElement('style');
    style.id = 'sim-supervisor-styles';
    style.textContent = [
      '.sim-sup-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:18px;}',
      '.sim-sup-head h2{font-size:20px;color:var(--navy);margin:0 0 4px}.sim-sup-head p{font-size:12px;color:var(--t3);margin:0}',
      '.sim-sup-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}',
      '.sim-sup-metric{background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px}.sim-sup-metric span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--t3)}.sim-sup-metric strong{font-size:22px;color:var(--navy)}',
      '.sim-sup-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:14px}.sim-sup-card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:15px;overflow:auto}',
      '.sim-sup-card h3{font-size:13px;margin:0 0 12px;color:var(--navy)}',
      '.sim-sup-table{width:100%;border-collapse:collapse;font-size:11px}.sim-sup-table th{text-align:left;color:var(--t3);font-size:9px;text-transform:uppercase;padding:7px;border-bottom:1px solid var(--border)}.sim-sup-table td{padding:8px 7px;border-bottom:1px solid var(--border);vertical-align:middle}',
      '.sim-chip{display:inline-block;border-radius:99px;padding:3px 7px;font-weight:800;font-size:9px}.sim-chip.ok{background:#e8f5ee;color:#2d6a40}.sim-chip.warn{background:#fff7e6;color:#8a5100}.sim-chip.off{background:#f1f5f9;color:#64748b}.sim-chip.live{background:#fee2e2;color:#991b1b}',
      '.sim-reset{border:1px solid var(--border);background:#fff;border-radius:7px;padding:5px 8px;font-size:10px;font-weight:700;cursor:pointer;color:var(--navy)}.sim-reset:hover{border-color:var(--navy)}',
      '.sim-empty{padding:20px;text-align:center;color:var(--t3);font-size:12px}',
      '@media(max-width:900px){.sim-sup-metrics{grid-template-columns:1fr 1fr}.sim-sup-grid{grid-template-columns:1fr}}'
    ].join('');
    document.head.appendChild(style);
  }

  function studentRows(students) {
    return students.map(function (student) {
      var access = accessFor(student);
      var status = statusFor(student);
      var name = student.info && student.info.name ? student.info.name : (student.name || student.id || '—');
      return '<tr>'
        + '<td><strong>' + esc(name) + '</strong><br><span style="color:var(--t3)">' + esc(student.id || student.code || '') + '</span></td>'
        + '<td>' + esc(access.username || student.portalUser || '—') + '</td>'
        + '<td><span class="sim-chip ' + status[1] + '">' + status[0] + '</span></td>'
        + '<td>' + fmtDate(access.updatedAt) + '</td>'
        + '<td><button class="sim-reset" data-sim-reset="' + esc(student.id || '') + '"><i class="ti ti-key"></i> Reset PIN</button></td>'
        + '</tr>';
    }).join('');
  }

  function liveRows(records) {
    var rows = records.filter(function (row) {
      return String(row.id || '').indexOf('KHCRM-LIVE-') === 0 && row.data;
    }).map(function (row) { return row.data; });
    if (!rows.length) return '<div class="sim-empty">No hay estudiantes activos en Simulation.</div>';
    return '<table class="sim-sup-table"><thead><tr><th>Estudiante</th><th>Caso</th><th>Estado</th><th>Acciones</th><th>Actualizado</th></tr></thead><tbody>'
      + rows.map(function (record) {
        var live = record.status === 'on-call' || record.call && record.call.status === 'connected';
        return '<tr><td><strong>' + esc(record.employee && record.employee.name || record.studentId) + '</strong></td>'
          + '<td>' + esc(record.activeCaseId || '—') + '<br><span style="color:var(--t3)">' + esc(record.caseTitle || '') + '</span></td>'
          + '<td><span class="sim-chip ' + (live ? 'live' : 'ok') + '">' + esc(live ? 'En llamada' : record.status || 'online') + '</span></td>'
          + '<td>' + (Number(record.actionCount) || 0) + '</td><td>' + fmtDate(record.updatedAt) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  async function resetPin(studentId, config, root) {
    var student = config.students().find(function (item) { return item.id === studentId; });
    if (!student) throw new Error('Estudiante no encontrado.');
    var current = accessFor(student);
    student.simulationAccess = {
      username: current.username || student.portalUser || '',
      version: 'reset-' + Date.now() + '-' + Math.random().toString(16).slice(2),
      resetRequired: true,
      updatedAt: new Date().toISOString()
    };
    student._portalCredOverwrite = true;
    var ok = await dbSet(config.studentsTable, student.id, student);
    if (!ok) throw new Error('No se pudo guardar el reset.');
    if (typeof showToast === 'function') showToast('PIN de Simulation reseteado. El estudiante puede elegir uno nuevo.');
    await render(root, config);
  }

  async function render(root, config) {
    if (!root) return;
    injectStyles();
    var students = config.students().filter(function (student) { return student && !student.isLead; });
    root.innerHTML = '<div class="loading"><i class="ti ti-loader spin"></i><span>Cargando Simulation Supervisor…</span></div>';
    var sessions = [];
    try { sessions = await dbGet(config.sessionsTable); } catch (_) { sessions = []; }
    var configured = students.filter(function (student) { return statusFor(student)[1] === 'ok'; }).length;
    var pending = students.filter(function (student) { return statusFor(student)[1] === 'warn'; }).length;
    var live = sessions.filter(function (row) {
      return String(row.id || '').indexOf('KHCRM-LIVE-') === 0
        && row.data
        && (row.data.status === 'working' || row.data.status === 'on-call');
    }).length;
    var resolutions = sessions.filter(function (row) { return String(row.id || '').indexOf('KHCRM-CASE-') === 0; }).length;

    root.innerHTML = '<div class="sim-sup-head"><div><h2><i class="ti ti-building-bank"></i> Infinity Simulation Supervisor</h2>'
      + '<p>Accesos, actividad en vivo y resets de PIN para ' + esc(config.label) + '.</p></div>'
      + '<button class="btn btn-outline btn-sm" id="sim-sup-refresh"><i class="ti ti-refresh"></i> Actualizar</button></div>'
      + '<div class="sim-sup-metrics">'
      + '<div class="sim-sup-metric"><span>Accesos activos</span><strong>' + configured + '</strong></div>'
      + '<div class="sim-sup-metric"><span>Reset pendiente</span><strong>' + pending + '</strong></div>'
      + '<div class="sim-sup-metric"><span>Trabajando ahora</span><strong>' + live + '</strong></div>'
      + '<div class="sim-sup-metric"><span>Casos resueltos</span><strong>' + resolutions + '</strong></div>'
      + '</div><div class="sim-sup-grid">'
      + '<section class="sim-sup-card"><h3>Acceso de estudiantes</h3><table class="sim-sup-table"><thead><tr><th>Estudiante</th><th>Usuario</th><th>Estado</th><th>Actualizado</th><th></th></tr></thead><tbody>'
      + studentRows(students) + '</tbody></table></section>'
      + '<section class="sim-sup-card"><h3>Floor en vivo</h3>' + liveRows(sessions) + '</section></div>';

    root.querySelector('#sim-sup-refresh').addEventListener('click', function () { render(root, config); });
    root.querySelectorAll('[data-sim-reset]').forEach(function (button) {
      button.addEventListener('click', async function () {
        var studentId = button.getAttribute('data-sim-reset');
        if (!window.confirm('¿Resetear el PIN de Simulation de este estudiante?')) return;
        button.disabled = true;
        try { await resetPin(studentId, config, root); }
        catch (error) {
          if (typeof showToast === 'function') showToast(error.message, 'err');
          button.disabled = false;
        }
      });
    });
  }

  window.SimulationSupervisor = { render: render };
})();
