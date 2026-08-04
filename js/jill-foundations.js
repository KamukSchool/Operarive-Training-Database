/**
 * Jill Foundations v2 — bundle progress, methodology UI, session evaluation.
 */
(function (global) {
  'use strict';

  var _bundles = [];
  var _sequence = [];
  var _loaded = null;
  var BUNDLE_ID_ALIASES = { 'F1-lego': 'F1-msi' };

  function resolveBundleId(id) {
    if (!id) return id;
    return BUNDLE_ID_ALIASES[id] || id;
  }

  function migrateProgressBundleIds(s) {
    if (!s || !s.jillProgress) return;
    if (s.jillProgress.activeBundle) s.jillProgress.activeBundle = resolveBundleId(s.jillProgress.activeBundle);
    s.jillProgress.completedBundles = (s.jillProgress.completedBundles || []).map(resolveBundleId);
  }

  var CTYPE_RE = /\[\[CTYPE:(text|exercise|example|whiteboard)\]\]/gi;
  var CTYPE_LINE = /^\s*JILL_META:\s*\{[^}]*"contentType"\s*:\s*"(text|exercise|example|whiteboard)"/im;

  function loadBundles() {
    if (_loaded) return _loaded;
    _loaded = fetch('config/jill-bundles.json?v=20260707b')
      .then(function (r) { return r.ok ? r.json() : { bundles: [], sequence: [] }; })
      .then(function (data) {
        _bundles = data.bundles || [];
        _sequence = data.sequence || _bundles.map(function (b) { return b.id; });
        return data;
      })
      .catch(function () {
        _bundles = [];
        _sequence = [];
        return { bundles: [], sequence: [] };
      });
    return _loaded;
  }

  function sortedBundles() {
    return _bundles.slice().sort(function (a, b) {
      return (a.order != null ? a.order : 999) - (b.order != null ? b.order : 999);
    });
  }

  function bundleById(id) {
    return _bundles.find(function (b) { return b.id === resolveBundleId(id); }) || null;
  }

  function ensureProgress(s) {
    if (!s) return { activeBundle: null, completedBundles: [], sessionLog: [] };
    if (!s.jillProgress) s.jillProgress = { activeBundle: null, completedBundles: [], sessionLog: [] };
    migrateProgressBundleIds(s);
    if (!s.jillProgress.completedBundles) s.jillProgress.completedBundles = [];
    if (!s.jillProgress.sessionLog) s.jillProgress.sessionLog = [];
    return s.jillProgress;
  }

  function getActiveBundle(s) {
    ensureProgress(s);
    if (s.jillProgress.activeBundle) return bundleById(s.jillProgress.activeBundle);
    var done = s.jillProgress.completedBundles || [];
    var seq = _sequence.length ? _sequence : sortedBundles().map(function (b) { return b.id; });
    for (var i = 0; i < seq.length; i++) {
      if (done.indexOf(seq[i]) < 0) return bundleById(seq[i]);
    }
    return sortedBundles()[0] || null;
  }

  function autoAssignBundle(s) {
    var b = getActiveBundle(s);
    if (!b || !s) return null;
    ensureProgress(s);
    if (!s.jillProgress.activeBundle) s.jillProgress.activeBundle = b.id;
    return b;
  }

  function getContext(s) {
    ensureProgress(s);
    var bundle = getActiveBundle(s);
    var ctx = {
      jillBundle: bundle,
      weakKpis: (s && s.quizWeakKpis) || [],
      nemesisState: (s && s.nemesisState) || { domain: [], reinforcement: [] },
      track: s && s.track,
      reinforcement: (s && s.nemesisState && s.nemesisState.reinforcement) || []
    };
    if (typeof JillMatrix !== 'undefined' && bundle) {
      var mc = JillMatrix.getApiContext(s, bundle);
      if (mc) ctx.matrixContext = mc;
    }
    if (typeof JillVocab !== 'undefined') {
      ctx.vocabContext = JillVocab.getApiContext(s);
    }
    if (typeof JillCalibration !== 'undefined') {
      ctx.calibrationContext = JillCalibration.getApiContext(s);
      if (ctx.calibrationContext.route && ctx.calibrationContext.route.weakKpis && ctx.calibrationContext.route.weakKpis.length) {
        ctx.weakKpis = ctx.calibrationContext.route.weakKpis.slice();
      }
    }
    return ctx;
  }

  function parseReply(raw) {
    var text = String(raw || '').trim();
    var contentType = 'text';
    var m;
    var lastType = null;
    CTYPE_RE.lastIndex = 0;
    while ((m = CTYPE_RE.exec(text)) !== null) {
      lastType = m[1].toLowerCase();
    }
    if (lastType) {
      contentType = lastType;
      text = text.replace(CTYPE_RE, '').trim();
    } else {
      var ml = text.match(CTYPE_LINE);
      if (ml) {
        contentType = ml[1].toLowerCase();
        text = text.replace(CTYPE_LINE, '').replace(/\n?\s*JILL_META:\s*\{[\s\S]*$/i, '').trim();
      }
    }
    if (typeof TutorReply !== 'undefined') text = TutorReply.extract(text);
    text = text.replace(/▋/g, '').replace(/\[\[CTYPE:[^\]]*\]\]/gi, '').trim();
    // Keep [[BOARD…]] in reply for the portal stage; only upgrade type when tag present
    if (/\[\[\s*BOARD/i.test(text)) contentType = 'whiteboard';
    if (!contentType || contentType === 'text') contentType = guessContentType(text);
    return { reply: text, contentType: contentType };
  }

  function guessContentType(text) {
    var t = String(text || '').toLowerCase();
    if (/\b(ejercicio|practic[aá]|complet[aá]|escrib[ií]|dec[ií] en ingl[eé]s|arm[aá] el chunk|tu turno)\b/.test(t)) return 'exercise';
    if (/\b(por ejemplo|ejemplo:|modelo:|as[ií]:|for example)\b/.test(t)) return 'example';
    if (/\|/.test(text) || /\b(infinity|mec[aá]nica estructural|regla \d|piezas?|estructura|whiteboard|pizarr[oó]n)\b/i.test(text)) return 'whiteboard';
    return 'text';
  }

  function bundleProgressPct(s) {
    ensureProgress(s);
    var total = _sequence.length || _bundles.length || 1;
    var done = (s.jillProgress.completedBundles || []).length;
    return Math.min(100, Math.round((done / total) * 100));
  }

  function renderBundleBar(s, bundle) {
    bundle = bundle || getActiveBundle(s);
    if (!bundle) {
      return '<div style="font-size:11px;color:rgba(255,255,255,0.65);margin-bottom:10px;">Foundations · Método Nexus</div>';
    }
    var pct = bundleProgressPct(s);
    var phase = bundle.phase ? '<span style="opacity:0.85;">' + bundle.phase + ' · </span>' : '';
    return '<div style="background:rgba(0,0,0,0.18);border:1px solid rgba(61,220,151,0.35);border-radius:12px;padding:10px 12px;margin-bottom:12px;">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">'
      + '<div style="font-size:11px;font-weight:800;color:#bbf7d0;letter-spacing:0.06em;">BUNDLE ACTIVO</div>'
      + '<div style="font-size:10px;color:#86EFAC;font-weight:700;">' + pct + '% ruta</div>'
      + '</div>'
      + '<div style="font-size:13px;font-weight:800;color:white;margin-top:4px;">' + phase + esc(bundle.title) + '</div>'
      + '<div style="margin-top:8px;height:4px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden;">'
      + '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#3DDC97,#86EFAC);"></div>'
      + '</div>'
      + '</div>';
  }

  var CANON_BY_COLUMN = {
    present: { id: 'verbos-presente', path: 'assets/canon/verbos-presente.svg', title: 'Módulo 2 — 16 verbos presente' },
    past: { id: 'verbos-pasado', path: 'assets/canon/verbos-pasado.svg', title: 'Módulo 3 — Pasado simple 16 verbos' },
    progressive: { id: 'presente-continuo', path: 'assets/canon/presente-continuo.svg', title: 'Presente continuo · TO BE + ING' },
    perfect: { id: 'verbos-perfecto', path: 'assets/canon/verbos-perfecto.svg', title: 'Módulo 4 — Perfecto HAVE/HAS/HAD + BEEN+ING' },
    combined: { id: 'have-been-ing', path: 'assets/canon/have-been-ing.svg', title: 'Have + Been + Verbo ING' },
    future: { id: 'will-would', path: 'assets/canon/will-would.svg', title: 'Clase 010 · WILL = RÉ' },
    future_perfect: { id: 'will-would', path: 'assets/canon/will-would.svg', title: 'Clase 010 · WILL + HAVE + PP' },
    modal: { id: 'moneda', path: 'assets/canon/moneda.svg', title: 'Metodo moneda (inversion)' },
    modales: { id: 'modales', path: 'assets/canon/modales.svg', title: 'Pronombre + Modal + Verbo' },
    modal_have_been: { id: 'modal-have-been-ing', path: 'assets/canon/modal-have-been-ing.svg', title: 'Pronombre + Modal + Have Been + Verbo ING' },
    modal_have_pp: { id: 'modal-have-pp', path: 'assets/canon/modal-have-pp.svg', title: 'Modal + Have + Participio' },
    there: { id: 'there-existencial', path: 'assets/canon/there-existencial.svg', title: 'There is / There are / To Have / Exist' },
    if_was_were: { id: 'if-was-were', path: 'assets/canon/if-was-were.svg', title: 'If I was / If I were / If I were to' },
    irregular_verbs: { id: 'verbos-irregulares', path: 'assets/canon/verbos-irregulares.svg', title: 'Verbos irregulares (Presente / PS / Participio)' },
    prepositions: { id: 'preposiciones', path: 'assets/canon/preposiciones.svg', title: 'Clase 011 · IN ON AT tres círculos' },
    prepositions_time: { id: 'preposiciones-tiempo', path: 'assets/canon/preposiciones-tiempo.svg', title: 'Clase 011 · Prep. de tiempo' },
    gerundio: { id: 'gerundio', path: 'assets/canon/gerundio.svg', title: 'Clase 009 · Gerundio TO vs ING' },
    gerund_prep: { id: 'gerundio-prep', path: 'assets/canon/gerundio-prep.svg', title: 'Clase 009 · Preposición + ING' },
    negations: { id: 'negaciones', path: 'assets/canon/negaciones.svg', title: 'Negaciones - AUX + NOT' },
    comparatives: { id: 'comparativos', path: 'assets/canon/comparativos.svg', title: 'Comparativos' },
    articles: { id: 'articulos', path: 'assets/canon/articulos.svg', title: 'Articulos a/an/the' },
    have_had: { id: 'have-had', path: 'assets/canon/have-had.svg', title: 'Have / Has / Had + PP' },
    pronouns: { id: 'pronombres', path: 'assets/canon/pronombres.svg', title: 'Pronombres' },
    overview: { id: 'tiempos', path: 'assets/canon/tiempos.svg', title: 'Tiempos overview' }
  };

  function canonFallback(col) {
    if (typeof JillCanonRouter !== 'undefined' && JillCanonRouter.byColumn) {
      var fromMap = JillCanonRouter.byColumn()[col];
      if (fromMap) return fromMap;
    }
    return CANON_BY_COLUMN[col] || null;
  }

  function detectCanonColumn(text, bundle) {
    var t = String(text || '');
    if (!t.trim()) {
      if (bundle && bundle.canonColumn && canonFallback(bundle.canonColumn)) return bundle.canonColumn;
      return null;
    }
    // Jill DJ — catálogo completo (pedido + sticky + shell visual)
    if (typeof JillCanonRouter !== 'undefined') {
      var id = JillCanonRouter.resolveAskId
        ? JillCanonRouter.resolveAskId(t, '')
        : (JillCanonRouter.pickTrackId ? JillCanonRouter.pickTrackId(t) : null);
      if (id) return id;
    }
    if (bundle && bundle.canonColumn && canonFallback(bundle.canonColumn)) return bundle.canonColumn;
    return null;
  }

  function renderCanonForMessage(text, bundle, userTopic) {
    if (typeof JillVisualStage !== 'undefined' && JillVisualStage.isActive()) return '';
    if (typeof JillCanonVisual === 'undefined') return '';
    // SOLO el pedido del estudiante — nunca el reply de Jill
    var source = userTopic || '';
    if (!String(source).trim()) return '';
    var col = detectCanonColumn(source, bundle);
    if (!col) return '';
    return JillCanonVisual.render(col, canonFallback(col));
  }

  function formatWhiteboardLines(text, bundle, userTopic) {
    // El SVG fullscreen es la lección — no el cajón de pipes del bundle
    if (typeof JillVisualStage !== 'undefined') {
      var col = null;
      if (typeof JillCanonRouter !== 'undefined' && JillCanonRouter.resolveAskId) {
        col = JillCanonRouter.resolveAskId(String(userTopic || ''), '');
      }
      if (!col) col = detectCanonColumn(String(userTopic || text || ''), bundle);
      if (col) return '';
    }
    var lines = String(text || '').split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean);
    if (lines.length < 2 && bundle && bundle.whiteboard && bundle.whiteboard.length) {
      lines = bundle.whiteboard.slice(0, 4);
    }
    var body = lines.map(function (line) {
      return '<div style="font-family:ui-monospace,monospace;font-size:13px;padding:6px 0;border-bottom:1px solid #e2e8f0;">' + esc(line) + '</div>';
    }).join('');
    var canon = renderCanonForMessage(text, bundle, userTopic);
    return body + canon;
  }

  function formatBody(text, contentType, bundle, userTopic) {
    var clean = String(text || '');
    if (typeof global.AiBoardDirective !== 'undefined' && global.AiBoardDirective.strip) {
      clean = global.AiBoardDirective.strip(clean);
    } else {
      clean = clean
        .replace(/\[\[\s*BOARD\s*:[^\]]*\]\]/gi, '')
        .replace(/\[\[\s*BOARD_DESIGN\s*:[^\]]*\]\]/gi, '')
        .trim();
    }
    var body = esc(clean).replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    if (contentType === 'whiteboard') {
      body = formatWhiteboardLines(clean, bundle, userTopic) || body;
    }
    return body;
  }

  function formatMessageHtml(m, bundle, opts) {
    if (!m || !m.content) return '';
    var isJill = m.role === 'assistant';
    var userTopic = (opts && opts.userTopic) || '';
    if (!isJill) {
      return '<div style="display:flex;flex-direction:column;align-items:flex-end;">'
        + '<div style="max-width:88%;background:rgba(61,220,151,0.18);border:1px solid rgba(61,220,151,0.35);color:#ecfdf5;border-radius:12px 4px 12px 12px;padding:10px 14px;font-size:14px;line-height:1.7;">'
        + esc(m.content) + '</div></div>';
    }
    var ct = m.contentType || 'text';
    var bubbleStyle = 'background:rgba(255,255,255,0.96);border:1px solid rgba(61,220,151,0.25);color:#111827;';
    if (ct === 'whiteboard') bubbleStyle = 'background:#f8fafc;border:1px solid #cbd5e1;color:#0f172a;';
    return '<div style="display:flex;flex-direction:column;align-items:flex-start;">'
      + '<div style="max-width:92%;' + bubbleStyle + 'border-radius:14px;padding:12px 14px;font-size:14px;line-height:1.7;">'
      + formatBody(m.content, ct, bundle, userTopic)
      + '</div></div>';
  }

  function renderEvaluationSummary(ev, bundle) {
    if (!ev) return '';
    var score = ev.overall_score != null ? ev.overall_score : '—';
    var col = score >= 75 ? '#86EFAC' : (score >= 55 ? '#FCD34D' : '#FCA5A5');
  return '<div style="background:rgba(0,0,0,0.22);border:1px solid rgba(61,220,151,0.4);border-radius:14px;padding:14px;margin-top:12px;">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
      + '<div style="font-size:12px;font-weight:800;color:#bbf7d0;">RESUMEN DE SESIÓN</div>'
      + '<div style="font-size:22px;font-weight:900;color:' + col + ';">' + score + '<span style="font-size:11px;opacity:0.6;">/100</span></div>'
      + '</div>'
      + (bundle ? '<div style="font-size:11px;color:rgba(255,255,255,0.7);margin-bottom:8px;">Bundle: <strong>' + esc(bundle.title) + '</strong></div>' : '')
      + (ev.best_moment ? '<div style="font-size:12px;margin-bottom:6px;"><span style="color:#86EFAC;font-weight:700;">✓ </span>' + esc(ev.best_moment) + '</div>' : '')
      + (ev.main_improvement ? '<div style="font-size:12px;margin-bottom:8px;"><span style="color:#FCD34D;font-weight:700;">→ </span>' + esc(ev.main_improvement) + '</div>' : '')
      + (ev.jill_message ? '<div style="font-size:13px;line-height:1.6;padding:10px;background:rgba(255,255,255,0.08);border-radius:10px;color:#ecfdf5;">' + esc(ev.jill_message).replace(/\n/g, '<br>') + '</div>' : '')
      + (ev.bundle_ready && !ev.bundle_blocked ? '<div style="margin-top:10px;font-size:11px;color:#86EFAC;font-weight:700;">Listo para avanzar al siguiente bundle — pedile a tu trainer que confirme.</div>' : '')
      + (ev.bundle_blocked ? '<div style="margin-top:10px;font-size:11px;color:#FCD34D;font-weight:700;line-height:1.5;">⏳ Avance bloqueado: ' + esc(ev.bundle_block_reason || 'completá el gate F0') + '</div>' : '')
      + (ev.graduation_request ? '<div style="margin-top:12px;padding:12px;background:rgba(245,166,35,0.12);border:1px solid rgba(245,166,35,0.35);border-radius:10px;">'
        + '<div style="font-size:12px;font-weight:800;color:#FCD34D;margin-bottom:6px;">🎓 Jill solicita graduación a Alice</div>'
        + (ev.graduation_reason ? '<div style="font-size:11px;color:rgba(255,255,255,0.8);margin-bottom:10px;line-height:1.5;">' + esc(ev.graduation_reason) + '</div>' : '')
        + '<button type="button" onclick="jillConfirmGraduation()" style="background:linear-gradient(135deg,#0a5c3c,#0e7a50);border:none;color:white;font-weight:800;font-size:13px;padding:10px 20px;border-radius:10px;cursor:pointer;">Confirmar graduación</button>'
        + '<div style="font-size:10px;color:rgba(255,255,255,0.5);margin-top:8px;">Solo si sentís que podés conversar como Jill evaluó.</div></div>' : '')
      + '</div>';
  }

  function canAdvanceBundle(s, bundleId) {
    bundleId = bundleId || (s && s.jillProgress && s.jillProgress.activeBundle);
    if (typeof JillF0Gate !== 'undefined') {
      return JillF0Gate.canAdvanceFromBundle(s, bundleId);
    }
    return { ok: true, reason: null, checklist: null };
  }

  function tryAdvanceBundle(s, bundleId) {
    ensureProgress(s);
    bundleId = bundleId || s.jillProgress.activeBundle;
    if (!bundleId) return { ok: false, reason: 'Sin bundle activo' };
    var gate = canAdvanceBundle(s, bundleId);
    if (!gate.ok) return gate;
    if (s.jillProgress.completedBundles.indexOf(bundleId) < 0) {
      s.jillProgress.completedBundles.push(bundleId);
    }
    var meta = bundleById(bundleId);
    var next = meta && meta.nextBundle;
    s.jillProgress.activeBundle = next || null;
    return { ok: true, nextBundle: next, completed: bundleId };
  }

  function recordSession(s, ev, bundle) {
    if (!s || !s.id) return;
    ensureProgress(s);
    s.jillProgress.sessionLog.push({
      date: new Date().toISOString(),
      bundleId: bundle && bundle.id,
      score: ev && ev.overall_score,
      turns: ev && ev.student_turns
    });
    if (s.jillProgress.sessionLog.length > 40) s.jillProgress.sessionLog = s.jillProgress.sessionLog.slice(-40);
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  global.JillFoundations = {
    loadBundles: loadBundles,
    getActiveBundle: getActiveBundle,
    autoAssignBundle: autoAssignBundle,
    getContext: getContext,
    parseReply: parseReply,
    renderBundleBar: renderBundleBar,
    formatMessageHtml: formatMessageHtml,
    renderEvaluationSummary: renderEvaluationSummary,
    recordSession: recordSession,
    ensureProgress: ensureProgress,
    bundleById: bundleById,
    canAdvanceBundle: canAdvanceBundle,
    tryAdvanceBundle: tryAdvanceBundle,
    detectCanonColumn: detectCanonColumn,
    CANON_BY_COLUMN: CANON_BY_COLUMN
  };
})(typeof window !== 'undefined' ? window : this);
