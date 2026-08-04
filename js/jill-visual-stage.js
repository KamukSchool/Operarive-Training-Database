/**
 * Escenario visual Infinity — ejercicios reales + botones de fórmula.
 * Sin glow/flash de palabras.
 */
(function (global) {
  'use strict';

  var active = false;
  var currentColumn = null;
  var pulseTimer = null;
  var activeTutor = 'jill';

  function shell() {
    if (activeTutor === 'alice') return document.getElementById('alice-lesson-shell');
    return document.getElementById('jill-lesson-shell');
  }

  function stageEl() {
    if (activeTutor === 'alice') return document.getElementById('alice-visual-stage');
    return document.getElementById('jill-visual-stage');
  }

  function mediaEl() {
    if (activeTutor === 'alice') return document.getElementById('alice-stage-media');
    return document.getElementById('jill-stage-media');
  }

  function captionEl() {
    if (activeTutor === 'alice') return document.getElementById('alice-stage-caption');
    return document.getElementById('jill-stage-caption');
  }

  function detectColumn(text, bundle) {
    if (typeof JillFoundations !== 'undefined' && JillFoundations.detectCanonColumn) {
      return JillFoundations.detectCanonColumn(text, bundle);
    }
    return null;
  }

  function resolveColumn(replyText, bundle, userTopic, tutor) {
    var user = String(userTopic || '').trim();
    var preferNexus = tutor === 'alice';

    // Alice: SOLO pedido del estudiante. NUNCA abrir por tips de Alice (however/linker en el reply).
    if (preferNexus) {
      if (!user) return null;
      if (typeof global.JillLessonClip !== 'undefined' && global.JillLessonClip.resolveNexusId) {
        var nxUser = global.JillLessonClip.resolveNexusId(user);
        if (nxUser) return nxUser;
      }
      return null;
    }

    // Solo pedido EXPLÍCITO del estudiante. pickTrack suelto inventaba columnas desde práctica en inglés.
    if (typeof JillCanonRouter !== 'undefined' && JillCanonRouter.isExplicitTopicAsk
        && JillCanonRouter.isExplicitTopicAsk(user)
        && JillCanonRouter.resolveAskId) {
      var userId = JillCanonRouter.resolveAskId(user, '');
      if (userId) return userId;
    }

    // Jill: sin pedido explícito → null (no abrir tablero ajeno)
    return null;
  }

  function isExplainTurn(contentType, text, userTopic, tutor) {
    if (contentType === 'whiteboard' || contentType === 'example') return true;
    var user = String(userTopic || '');
    var reply = String(text || '');
    if (/qu[eé] gusto|de nuevo|podemos charlar|qu[eé] quer[eé]s (hoy|hacer|charlar)|bienvenid|welcome back|what (do you )?want to (talk|chat)/i.test(reply)
      && !/\b(explic|ens[eé][nñ]|explain|teach|linker|star|nexus|negaci|gerundio|f[oó]rmula|will|would|should|however)\b/i.test(user)) {
      return false;
    }
    // Alice (Tutor + Libre): tablero Nexus solo — nunca Foundations.
    if (tutor === 'alice') {
      return /\b(explic|ens[eé][nñ]|explain|teach|show me|mostr[aá]|tablero|board|linker|conectores?|star(\s*method)?|nexus(\s*method)?|idea\s*\+?\s*linker|how (do|does|to) (i )?(use|say)|qu[eé] es|c[oó]mo (se )?usa|no entiendo|don'?t understand|duda|ejercicio|practice|your turn|build me a sentence|however|furthermore|as a result)\b/i.test(user + ' ' + reply);
    }
    if (typeof global.JillLessonClip !== 'undefined' && global.JillLessonClip.resolveNexusId) {
      if (global.JillLessonClip.resolveNexusId(user)) return true;
    }
    if (user && typeof JillCanonRouter !== 'undefined'
        && JillCanonRouter.isExplicitTopicAsk && JillCanonRouter.isExplicitTopicAsk(user)) {
      if (JillCanonRouter.resolveAskId && JillCanonRouter.resolveAskId(user, '')) return true;
      if (JillCanonRouter.wantsVisual && JillCanonRouter.wantsVisual(user)) return true;
    }
    return /\b(explic|ens[eé][nñ]|no entiendo|duda|c[oó]mo se|c[oó]mo funciona|qu[eé] es|f[oó]rmula|ranura|auxiliar|negaci|gerundio|estructura|mec[aá]nica|patr[oó]n|modelo|ejemplo|te qued[oó]|arm[aá]|whiteboard|pizarr|imagen|tablero|to be|will|would|should|could|can|there is|there are|preposici|tiempo verbal|modal|moneda|art[ií]culo|comparativ|pronombre|pregunta|pasado simple|pasado perfecto|presente perfecto|pasada perfecto|perfecto|irregular|was|were|going to|have|has|had|jaf|jas|jad|presente|futuro|overview|mapa)\b/i.test(user);
  }

  function domainOk(col, tutor) {
    var id = String(col || '');
    if (!id) return false;
    if (/^toeic_/i.test(id)) return false; // Claire stage only
    if (tutor === 'alice') return /^nexus_/i.test(id);
    // Jill Foundations: never Nexus / TOEIC
    if (/^nexus_/i.test(id)) return false;
    return true;
  }

  function shouldShow(contentType, text, bundle, userTopic, forcedColumn, tutor) {
    if (forcedColumn && !domainOk(forcedColumn, tutor)) return false;
    // Alice: forced nexus lock always wins (Tutor + Libre).
    if (tutor === 'alice') {
      if (forcedColumn && /^nexus_/i.test(String(forcedColumn))) return true;
      if (!isExplainTurn(contentType, text, userTopic, tutor)) return false;
      var resolved = resolveColumn(text, bundle, userTopic, tutor);
      return !!(resolved && domainOk(resolved, tutor));
    }
    // Jill: forced lock column always wins — never re-pick from reply.
    if (forcedColumn && domainOk(forcedColumn, tutor)) return true;
    if (resolveColumn(text, bundle, userTopic, tutor)) return true;
    return false;
  }

  function requestFullscreen() {
    var sh = shell();
    if (!sh) return;
    var already = document.fullscreenElement === sh || document.webkitFullscreenElement === sh;
    if (already) return;
    var req = sh.requestFullscreen || sh.webkitRequestFullscreen;
    if (!req) return;
    req.call(sh).catch(function () {});
  }

  function clearCaption() {
    var cap = captionEl();
    if (cap) {
      cap.textContent = '';
      cap.innerHTML = '';
      cap.hidden = true;
    }
  }

  function stopPulse() {
    if (pulseTimer) {
      clearInterval(pulseTimer);
      pulseTimer = null;
    }
  }

  function slotLabels(columnId) {
    if (typeof JillLessonClip !== 'undefined' && JillLessonClip.getClip) {
      var clip = JillLessonClip.getClip(columnId);
      if (clip && clip.slots && clip.slots.length) {
        return clip.slots.map(function (s) {
          return { label: s.label || ('Ranura ' + s.id), hint: s.hint || '', id: s.id };
        });
      }
    }
    var n = zoneCount(columnId);
    var out = [];
    for (var i = 0; i < n; i++) out.push({ label: 'Ranura ' + (i + 1), hint: '', id: i + 1 });
    return out;
  }

  function zoneCount(columnId) {
    if (typeof JillLessonClip !== 'undefined' && JillLessonClip.getClip) {
      var clip = JillLessonClip.getClip(columnId);
      if (clip && clip.slots && clip.slots.length) return clip.slots.length;
    }
    if (typeof JillCanonDrill !== 'undefined' && JillCanonDrill.zoneCount) {
      return JillCanonDrill.zoneCount(columnId);
    }
    if (columnId === 'negations' || columnId === 'there' || columnId === 'future' || columnId === 'past' || columnId === 'present') return 3;
    if (columnId === 'overview' || columnId === 'combined' || columnId === 'prepositions' || columnId === 'modal_have_been') return 4;
    return 3;
  }

  function escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  /** Botones de ranura con etiqueta — nunca vacíos. */
  function interactOverlayHtml(columnId, opts) {
    opts = opts || {};
    var labels = slotLabels(columnId);
    var clipBound = !!opts.clipBound;
    var html = '<div class="jill-svg-interact' + (clipBound ? ' is-clip-bound' : '') + '" data-track="' + escHtml(columnId || '') + '">';
    for (var i = 0; i < labels.length; i++) {
      var lab = labels[i];
      html += '<button type="button" class="jill-svg-hotspot" data-step="' + i + '" data-slot="' + (lab.id || (i + 1)) + '"'
        + ' aria-label="' + escHtml(lab.label) + '">'
        + '<span class="jill-hotspot-label">' + escHtml(lab.label) + '</span>'
        + (lab.hint ? '<span class="jill-hotspot-hint">' + escHtml(lab.hint) + '</span>' : '')
        + '</button>';
    }
    html += '</div>';
    html += '<div class="jill-drill-ring" aria-hidden="true"><svg viewBox="0 0 36 36">'
      + '<path class="jill-drill-ring-bg" d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 1 1 0-31"/>'
      + '<path class="jill-drill-ring-fg" stroke-dasharray="0,100" d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 1 1 0-31"/>'
      + '</svg></div>';
    return html;
  }

  function paintTarget(spots, target) {
    for (var i = 0; i < spots.length; i++) {
      spots[i].classList.remove('is-lit', 'is-ok', 'is-miss', 'is-active');
      if (i === target) {
        spots[i].classList.add('is-lit');
        if (spots[i].classList.contains('jill-clip-slot')) spots[i].classList.add('is-active');
      }
    }
  }

  function setRing(pct) {
    var media = mediaEl();
    if (!media) return;
    var fg = media.querySelector('.jill-drill-ring-fg');
    if (!fg) return;
    var v = Math.max(0, Math.min(100, pct || 0));
    fg.setAttribute('stroke-dasharray', v + ',100');
    var ring = media.querySelector('.jill-drill-ring');
    if (ring) {
      ring.classList.toggle('is-hot', v >= 70);
      ring.classList.toggle('is-warm', v >= 40 && v < 70);
    }
  }

  function flashSpot(spot, ok) {
    if (!spot) return;
    spot.classList.remove('is-ok', 'is-miss');
    spot.classList.add(ok ? 'is-ok' : 'is-miss');
    setTimeout(function () {
      spot.classList.remove('is-ok', 'is-miss');
    }, 520);
  }

  function drillSpots(root) {
    if (!root) return [];
    var clipSlots = root.querySelectorAll('.jill-clip-slot');
    if (clipSlots && clipSlots.length) return clipSlots;
    var layer = root.querySelector('.jill-svg-interact');
    if (!layer || layer.classList.contains('is-clip-bound')) {
      return root.querySelectorAll('.jill-svg-hotspot');
    }
    return layer.querySelectorAll('.jill-svg-hotspot');
  }

  function wireInteract(root, columnId) {
    if (!root) return;
    var spots = drillSpots(root);
    if (!spots.length) {
      var layer = root.querySelector('.jill-svg-interact');
      if (layer) spots = layer.querySelectorAll('.jill-svg-hotspot');
    }
    var challenge = { target: 0 };
    if (typeof JillCanonDrill !== 'undefined') {
      challenge = JillCanonDrill.start(columnId) || challenge;
    }
    paintTarget(spots, challenge.target || 0);
    setRing(0);

    for (var s = 0; s < spots.length; s++) {
      (function (btn, idx) {
        btn.addEventListener('click', function (ev) {
          ev.preventDefault();
          var result = { ok: false, challenge: { target: 0 }, scorePct: 0 };
          if (typeof JillCanonDrill !== 'undefined') {
            result = JillCanonDrill.registerTap(idx);
          } else {
            result.ok = idx === challenge.target;
            if (result.ok) challenge.target = (challenge.target + 1) % spots.length;
            result.challenge = challenge;
          }
          flashSpot(btn, !!result.ok);
          var next = (result.challenge && result.challenge.target != null) ? result.challenge.target : 0;
          setTimeout(function () {
            paintTarget(drillSpots(root), next);
          }, 280);
          var snap = (typeof JillCanonDrill !== 'undefined' && JillCanonDrill.snapshot)
            ? JillCanonDrill.snapshot()
            : { combined: result.scorePct || 0 };
          setRing(snap.combined || result.scorePct || 0);
          if (typeof global.jillOnCanonTap === 'function') {
            try { global.jillOnCanonTap(result); } catch (e) { /* ignore */ }
          }
        });
      })(spots[s], s);
    }

    stopPulse();
    // No flashing highlight loop — buttons stay static until tap
  }

  function show(text, contentType, bundle, opts) {
    opts = opts || {};
    var tutor = opts.tutor === 'alice' ? 'alice' : 'jill';
    activeTutor = tutor;
    var userTopic = opts.userTopic || '';
    var design = opts.design || null;
    // Forced column (lock or AI BOARD tag)
    var col = opts.column || null;
    if (!col && !design) col = resolveColumn(text, bundle, userTopic, tutor);
    // Hard-lock domain: Jill≠Nexus/TOEIC, Alice≠Foundations/TOEIC
    if (col && !domainOk(col, tutor)) {
      col = null;
    }

    var sh = shell();
    var stage = stageEl();
    var media = mediaEl();
    if (!sh || !stage || !media) return false;

    clearCaption();

    function activate(html, capLine) {
      if (typeof global.JillLessonClip !== 'undefined') {
        try { global.JillLessonClip.unmount(); } catch (e0) { /* ignore */ }
      }
      media.innerHTML = html || '';
      sh.classList.add('jill-stage-active');
      stage.hidden = false;
      active = true;
      currentColumn = col || (design ? 'ai_design' : null);
      var host = media.querySelector('.jill-teach-sheet') || media.querySelector('.jill-lesson-clip-host');
      if (host && typeof global.JillLessonClip !== 'undefined' && col) {
        var clipId = host.getAttribute('data-clip') || col;
        global.JillLessonClip.mount(host, clipId, { mode: 'teach' });
      }
      var cap = captionEl();
      if (cap) {
        cap.hidden = false;
        cap.textContent = capLine || (tutor === 'alice'
          ? ('Alice · ' + String(col || 'tablero'))
          : ('Jill · lección: ' + String(col || 'tablero')));
      }
    }

    // ── AI-designed board (only when no canon track column) ──
    if (!col && design && design.title && typeof global.AiBoardDirective !== 'undefined') {
      var dHtml = global.AiBoardDirective.designHtml(design);
      if (dHtml) {
        activate(
          '<div class="jill-canon-stage-frame" style="position:relative;width:100%;height:100%;min-height:240px;border-radius:16px;overflow:auto;border:2px solid rgba(43,126,193,0.28);background:linear-gradient(180deg,#FBFDFF,#F0F6FA);padding:12px;box-sizing:border-box;">'
          + dHtml + '</div>',
          (tutor === 'alice' ? 'Alice' : 'Jill') + ' · tablero diseñado: ' + design.title
        );
        return true;
      }
    }

    // Jill: without a column (AI or lock), no improvisation
    if (tutor === 'jill' && !col) {
      return false;
    }
    if (tutor === 'alice' && !col) {
      return false;
    }
    // AI-selected track always mounts; else legacy shouldShow
    var openOk = !!opts.aiSelected
      || shouldShow(contentType, text, bundle, userTopic, col, tutor)
      || contentType === 'whiteboard'
      || contentType === 'example';
    if (!openOk) return false;

    // Prefer canon SVG + exercise sheet (JillCanonVisual)
    if (typeof JillCanonVisual !== 'undefined') {
      var fallback = null;
      if (typeof JillCanonRouter !== 'undefined' && JillCanonRouter.byColumn) {
        fallback = JillCanonRouter.byColumn()[col] || null;
      }
      if (!fallback && typeof JillFoundations !== 'undefined' && JillFoundations.CANON_BY_COLUMN) {
        fallback = JillFoundations.CANON_BY_COLUMN[col];
      }
      JillCanonVisual.loadConfig().then(function () {
        var html = JillCanonVisual.renderStage(col, fallback);
        if (!html && typeof global.JillLessonClip !== 'undefined' && global.JillLessonClip.supports(col)) {
          html = '<div class="jill-canon-stage-frame" style="position:relative;width:100%;height:100%;min-height:240px;border-radius:16px;overflow:auto;border:2px solid rgba(167,139,250,0.35);background:#f3ebff;">'
            + '<div class="jill-lesson-clip-host" data-clip="' + col + '" data-mode="teach"></div></div>';
        }
        if (html) activate(html);
        else if (!isActive()) hide();
      });
      return true;
    }

    if (typeof global.JillLessonClip !== 'undefined' && global.JillLessonClip.supports(col)) {
      activate(
        '<div class="jill-canon-stage-frame" style="position:relative;width:100%;height:100%;min-height:240px;border-radius:16px;overflow:auto;border:2px solid rgba(167,139,250,0.35);background:#f3ebff;">'
        + '<div class="jill-lesson-clip-host" data-clip="' + col + '" data-mode="teach"></div></div>'
      );
      return true;
    }

    return false;
  }

  function updateCaption(text) {
    var cap = captionEl();
    if (!cap) return;
    var t = String(text || '').replace(/\[\[CTYPE:[^\]]*\]\]/gi, '').trim();
    if (typeof global.AiBoardDirective !== 'undefined' && global.AiBoardDirective.strip) {
      t = global.AiBoardDirective.strip(t);
    }
    if (!t) {
      clearCaption();
      return;
    }
    // Short line under the board — sync hint with what is being taught
    if (t.length > 140) t = t.slice(0, 137) + '…';
    cap.hidden = false;
    cap.textContent = t;
  }

  /** Score spoken line against active track; update ring. */
  function scoreOral(text) {
    if (!active || typeof JillCanonDrill === 'undefined') return null;
    var trackId = currentColumn;
    if (!trackId || trackId === 'ai_design' || /^nexus_/i.test(trackId) || /^toeic_/i.test(trackId)) {
      return null;
    }
    var result = JillCanonDrill.scoreUtterance(text, trackId);
    var snap = JillCanonDrill.snapshot();
    setRing(snap.combined || result.score || 0);
    var media = mediaEl();
    if (media) {
      media.classList.remove('jill-oral-ok', 'jill-oral-miss');
      media.classList.add(result.ok ? 'jill-oral-ok' : 'jill-oral-miss');
      setTimeout(function () {
        media.classList.remove('jill-oral-ok', 'jill-oral-miss');
      }, 700);
    }
    return result;
  }

  function hide() {
    stopPulse();
    if (typeof global.JillLessonClip !== 'undefined') {
      try { global.JillLessonClip.unmount(); } catch (e1) { /* ignore */ }
    }
    var tutors = ['jill', 'alice'];
    for (var i = 0; i < tutors.length; i++) {
      activeTutor = tutors[i];
      var sh = shell();
      var stage = stageEl();
      if (sh) sh.classList.remove('jill-stage-active');
      if (stage) stage.hidden = true;
      if (mediaEl()) mediaEl().innerHTML = '';
    }
    clearCaption();
    active = false;
    currentColumn = null;
    activeTutor = 'jill';
  }

  function resetSession() {
    hide();
  }

  function isActive() {
    return active;
  }

  function getTrackId() {
    return currentColumn;
  }

  function getTutor() {
    return activeTutor;
  }

  global.JillVisualStage = {
    show: show,
    hide: hide,
    updateCaption: updateCaption,
    scoreOral: scoreOral,
    shouldShow: function (ct, text, bundle) { return shouldShow(ct, text, bundle, '', null, 'jill'); },
    isActive: isActive,
    getTrackId: getTrackId,
    getTutor: getTutor,
    resetSession: resetSession,
    requestFullscreen: requestFullscreen,
    resolveColumn: function (reply, bundle, userTopic, tutor) {
      return resolveColumn(reply, bundle, userTopic, tutor || 'jill');
    }
  };
  global.InfinityLessonStage = global.JillVisualStage;
})(typeof window !== 'undefined' ? window : globalThis);
