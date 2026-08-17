(function () {
  'use strict';

  var mounted = new WeakMap();

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char];
    });
  }

  function api(path, options) {
    if (typeof infinityFetch !== 'function') {
      return Promise.reject(new Error('La conexión segura no está disponible.'));
    }
    return infinityFetch(path, options || {}).then(async function (response) {
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(data.error || 'No se pudo completar la solicitud.');
      return data;
    });
  }

  function styles() {
    if (document.getElementById('simulation-access-styles')) return;
    var style = document.createElement('style');
    style.id = 'simulation-access-styles';
    style.textContent = [
      '.sim-access{max-width:760px;margin:0 auto;}',
      '.sim-access-card{background:#fff;border:1px solid var(--border,#dce3ea);border-radius:16px;padding:22px;box-shadow:0 8px 28px rgba(15,23,42,.07);}',
      '.sim-access-head{display:flex;gap:14px;align-items:flex-start;margin-bottom:18px;}',
      '.sim-access-icon{width:46px;height:46px;border-radius:13px;display:grid;place-items:center;background:#ede9fe;color:#5b21b6;font-size:23px;flex:0 0 auto;}',
      '.sim-access h2{margin:0 0 5px;font-size:20px;color:#102033;}',
      '.sim-access p{margin:0;color:#64748b;line-height:1.55;font-size:13px;}',
      '.sim-access-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px;}',
      '.sim-field{display:grid;gap:5px;}',
      '.sim-field.full{grid-column:1/-1;}',
      '.sim-field label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#64748b;}',
      '.sim-field input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:9px;padding:11px 12px;font:600 14px Inter,Arial,sans-serif;color:#0f172a;}',
      '.sim-field input:focus{outline:2px solid rgba(91,33,182,.2);border-color:#7c3aed;}',
      '.sim-pin{letter-spacing:.28em;font-family:monospace!important;}',
      '.sim-actions{display:flex;gap:9px;align-items:center;margin-top:16px;flex-wrap:wrap;}',
      '.sim-primary{border:0;border-radius:9px;padding:11px 16px;background:#5b21b6;color:#fff;font-weight:800;cursor:pointer;}',
      '.sim-primary:disabled{opacity:.55;cursor:wait;}',
      '.sim-msg{font-size:12px;min-height:18px;color:#64748b;}',
      '.sim-msg.err{color:#b42318;}',
      '.sim-notice{margin-top:16px;padding:11px 13px;border-radius:10px;background:#f8fafc;border-left:4px solid #7c3aed;font-size:12px;color:#475569;}',
      '@media(max-width:620px){.sim-access-grid{grid-template-columns:1fr}.sim-field.full{grid-column:auto}}'
    ].join('');
    document.head.appendChild(style);
  }

  function renderLoading(root) {
    root.innerHTML = '<div class="sim-access"><div class="sim-access-card"><p>Cargando acceso seguro a Simulation…</p></div></div>';
  }

  function renderSetup(root, config, data) {
    var username = data.suggestedUsername || data.access?.username || '';
    root.innerHTML = '<div class="sim-access"><div class="sim-access-card">'
      + '<div class="sim-access-head"><div class="sim-access-icon"><i class="ti ti-device-gamepad-2"></i></div><div>'
      + '<h2>Activá tu acceso a Simulation</h2>'
      + '<p>Este recurso pertenece a Infinity. Elegí una contraseña personal de exactamente 6 números.</p></div></div>'
      + '<div class="sim-access-grid">'
      + '<div class="sim-field full"><label>Usuario de simulación</label><input id="sim-setup-user" value="' + esc(username) + '" autocomplete="username" spellcheck="false"></div>'
      + '<div class="sim-field"><label>Contraseña · 6 números</label><input class="sim-pin" id="sim-setup-pin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div>'
      + '<div class="sim-field"><label>Confirmar contraseña</label><input class="sim-pin" id="sim-setup-confirm" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div>'
      + '</div><div class="sim-actions"><button class="sim-primary" id="sim-setup-submit">Crear acceso</button><span class="sim-msg" id="sim-setup-msg"></span></div>'
      + '<div class="sim-notice">Si olvidás la contraseña, solicitá un reset al trainer. El trainer nunca necesita conocer tu contraseña actual.</div>'
      + '</div></div>';

    root.querySelector('#sim-setup-submit').addEventListener('click', async function () {
      var button = this;
      var msg = root.querySelector('#sim-setup-msg');
      var user = root.querySelector('#sim-setup-user').value.trim().toLowerCase();
      var pin = root.querySelector('#sim-setup-pin').value;
      var confirm = root.querySelector('#sim-setup-confirm').value;
      msg.className = 'sim-msg';
      if (!/^[a-z][a-z0-9._-]{2,31}$/.test(user)) {
        msg.className = 'sim-msg err'; msg.textContent = 'Revisá el formato del usuario.'; return;
      }
      if (!/^\d{6}$/.test(pin)) {
        msg.className = 'sim-msg err'; msg.textContent = 'La contraseña debe tener exactamente 6 números.'; return;
      }
      if (pin !== confirm) {
        msg.className = 'sim-msg err'; msg.textContent = 'Las contraseñas no coinciden.'; return;
      }
      button.disabled = true;
      try {
        await api('/simulation/access/setup', { method: 'POST', body: { username: user, pin: pin } });
        await mount(root, config, true);
      } catch (error) {
        msg.className = 'sim-msg err'; msg.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
  }

  function renderLogin(root, config, data) {
    var username = data.access?.username || data.suggestedUsername || '';
    root.innerHTML = '<div class="sim-access"><div class="sim-access-card">'
      + '<div class="sim-access-head"><div class="sim-access-icon"><i class="ti ti-building-bank"></i></div><div>'
      + '<h2>Infinity Simulation</h2>'
      + '<p>Tu acceso está activo como <strong>' + esc(username) + '</strong>. El recurso abre en Infinity y te pedirá tu contraseña de 6 números.</p></div></div>'
      + '<div class="sim-actions"><button class="sim-primary" id="sim-login-submit">Abrir Infinity Simulation</button></div>'
      + '<div class="sim-notice">¿Olvidaste el PIN? Pedile al trainer un reset desde el Engine.</div>'
      + '</div></div>';

    root.querySelector('#sim-login-submit').addEventListener('click', function () {
      var target = config.launchUrl + (config.launchUrl.indexOf('?') >= 0 ? '&' : '?')
        + 'product=' + encodeURIComponent(config.product)
        + '&user=' + encodeURIComponent(username);
      window.open(target, '_blank', 'noopener');
    });
  }

  async function mount(root, config, force) {
    if (!root) return;
    config = Object.assign({ product: 'infinity', launchUrl: 'infinity-holdings-crm.html' }, config || {});
    if (!force && mounted.get(root) === config.product) return;
    mounted.set(root, config.product);
    styles();
    renderLoading(root);
    try {
      var data = await api('/simulation/access', { method: 'GET' });
      if (data.access?.configured) renderLogin(root, config, data);
      else renderSetup(root, config, data);
    } catch (error) {
      root.innerHTML = '<div class="sim-access"><div class="sim-access-card"><div class="sim-msg err">' + esc(error.message) + '</div></div></div>';
    }
  }

  window.SimulationAccess = { mount: mount };
})();
