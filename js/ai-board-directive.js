/**
 * AI board directives — the model may CHOICE & DESIGN the lesson board.
 * Tags are stripped before TTS/caption. Never free HTML from the model.
 *
 * [[BOARD:present]]
 * [[BOARD:progressive|focus=formula]]
 * [[BOARD_DESIGN:Título|Fórmula: S+V|Ej: I go|✗ I goes]]
 */
(function (global) {
  'use strict';

  var FOUNDATIONS = {
    present: 1,
    past: 1,
    progressive: 1,
    perfect: 1,
    combined: 1,
    future: 1,
    future_perfect: 1,
    modal: 1,
    modales: 1,
    modal_have_been: 1,
    modal_have_pp: 1,
    there: 1,
    if_was_were: 1,
    irregular_verbs: 1,
    prepositions: 1,
    prepositions_time: 1,
    gerundio: 1,
    gerund_prep: 1,
    negations: 1,
    comparatives: 1,
    articles: 1,
    have_had: 1,
    pronouns: 1,
    overview: 1
  };

  var NEXUS = {
    nexus_idea_chain: 1,
    nexus_linkers: 1,
    nexus_star: 1,
    nexus_recovery: 1
  };

  var ALIAS = {
    presente: 'present',
    present: 'present',
    present_simple: 'present',
    present_tense: 'present',
    pr: 'present',
    pasado: 'past',
    pasado_simple: 'past',
    past: 'past',
    past_simple: 'past',
    ps: 'past',
    continuo: 'progressive',
    progresivo: 'progressive',
    progressive: 'progressive',
    presente_continuo: 'progressive',
    present_continuous: 'progressive',
    present_progressive: 'progressive',
    'presente continuo': 'progressive',
    pc: 'progressive',
    perfecto: 'perfect',
    perfect: 'perfect',
    present_perfect: 'perfect',
    presente_perfecto: 'perfect',
    prp: 'perfect',
    future: 'future',
    futuro: 'future',
    futuro_simple: 'future',
    will: 'future',
    'future perfect': 'future_perfect',
    future_perfect: 'future_perfect',
    futuro_perfecto: 'future_perfect',
    gerundio: 'gerundio',
    gerund: 'gerundio',
    'to vs ing': 'gerundio',
    prep: 'prepositions',
    preposiciones: 'prepositions',
    prepositions: 'prepositions',
    modales: 'modales',
    // coin-method modal (separate from will/would class track "modales")
    modal: 'modal',
    moneda: 'modal',
    irregular: 'irregular_verbs',
    irregulares: 'irregular_verbs',
    negaciones: 'negations',
    negation: 'negations',
    comparativos: 'comparatives',
    articulos: 'articles',
    overview: 'overview',
    tiempos: 'overview',
    linkers: 'nexus_linkers',
    linker: 'nexus_linkers',
    conectores: 'nexus_linkers',
    star: 'nexus_star',
    recovery: 'nexus_recovery',
    idea: 'nexus_idea_chain',
    nexus: 'nexus_idea_chain',
    chunking: 'nexus_idea_chain',
    idea_chain: 'nexus_idea_chain'
  };

  function softCollapse(text) {
    // Preserve paragraph breaks for TTS cadence; only flatten repeated spaces
    return String(text || '')
      .replace(/[ \t\f\v]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeId(raw) {
    var spaced = String(raw || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!spaced) return null;
    if (ALIAS[spaced]) return ALIAS[spaced];
    var id = spaced.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!id) return null;
    if (FOUNDATIONS[id] || NEXUS[id]) return id;
    if (ALIAS[id]) return ALIAS[id];
    // loose: "will have" etc. already handled; try hyphen → underscore
    var hyp = id.replace(/-/g, '_');
    if (FOUNDATIONS[hyp] || NEXUS[hyp]) return hyp;
    if (ALIAS[hyp]) return ALIAS[hyp];
    return null;
  }

  function isValidForTutor(id, tutor) {
    if (!id) return false;
    if (tutor === 'alice') return !!NEXUS[id];
    if (tutor === 'jill') return !!FOUNDATIONS[id];
    return !!(FOUNDATIONS[id] || NEXUS[id]);
  }

  function parseOpts(optStr) {
    var out = {};
    String(optStr || '')
      .split('|')
      .forEach(function (part) {
        var p = String(part || '').trim();
        if (!p) return;
        var eq = p.indexOf('=');
        if (eq > 0) {
          out[p.slice(0, eq).trim().toLowerCase()] = p.slice(eq + 1).trim();
        }
      });
    return out;
  }

  /**
   * @returns {{ trackId: string|null, focus: string|null, design: object|null, clean: string, hadDirective: boolean }}
   */
  function parse(raw, tutor) {
    var text = String(raw || '');
    var trackId = null;
    var focus = null;
    var design = null;
    var had = false;

    text = text.replace(/\[\[\s*BOARD\s*:\s*([a-zA-Z0-9_ \-]+)(?:\|([^\]]+))?\]\]/gi, function (_, idPart, opts) {
      had = true;
      var id = normalizeId(idPart);
      if (id && isValidForTutor(id, tutor || 'any')) {
        trackId = id;
        var o = parseOpts(opts);
        if (o.focus) focus = o.focus;
      }
      return '';
    });

    text = text.replace(/\[\[\s*BOARD_DESIGN\s*:\s*([^\]]+)\]\]/gi, function (_, body) {
      had = true;
      var parts = String(body || '')
        .split('|')
        .map(function (s) { return s.trim(); })
        .filter(Boolean)
        .slice(0, 8);
      if (parts.length) {
        design = {
          title: parts[0].slice(0, 80),
          lines: parts.slice(1).map(function (l) { return l.slice(0, 160); })
        };
      }
      return '';
    });

    // Prefer canon track when both BOARD + BOARD_DESIGN appear (SVG first; design is fallback)
    if (trackId && design) {
      // keep design only as caption fallback metadata; consumers prefer trackId
    }

    return {
      trackId: trackId,
      focus: focus,
      design: design,
      clean: softCollapse(text),
      hadDirective: had,
      preferTrack: !!(trackId)
    };
  }

  function strip(raw) {
    // Design before bare BOARD so BOARD_DESIGN is fully removed
    return softCollapse(
      String(raw || '')
        .replace(/\[\[\s*BOARD_DESIGN\s*:[^\]]*\]\]/gi, '')
        .replace(/\[\[\s*BOARD\s*:[^\]]*\]\]/gi, '')
    );
  }

  function designHtml(design) {
    if (!design || !design.title) return '';
    var lines = (design.lines || []).map(function (line) {
      var bad = /✗|✘|wrong|incorrect|evitar|error típico|no digas|never say|mal:/i.test(line)
        || /^\s*(✗|✘|x\b|no:)/i.test(line);
      var good = /✓|✔|correct|bien:|bueno:|target|good example/i.test(line)
        || /^\s*(✓|✔|ok:)/i.test(line);
      var cls = bad ? ' is-bad' : (good ? ' is-good' : '');
      return '<div class="ai-board-line' + cls + '">' + esc(line) + '</div>';
    }).join('');
    return (
      '<div class="ai-board-design" role="img" aria-label="' + esc(design.title) + '">' +
      '<div class="ai-board-title">' + esc(design.title) + '</div>' +
      (lines || '<div class="ai-board-line">Tablero diseñado por la IA</div>') +
      '</div>'
    );
  }

  function listTracks(tutor) {
    if (tutor === 'alice') return Object.keys(NEXUS);
    if (tutor === 'jill') return Object.keys(FOUNDATIONS);
    return Object.keys(FOUNDATIONS).concat(Object.keys(NEXUS));
  }

  /** Compact instruction block for system prompts (no API changes). */
  function systemHint(tutor) {
    var tracks = listTracks(tutor).join(', ');
    return (
      '\nTABLERO VISUAL (portal lo dibuja — NO leas las etiquetas en voz):\n' +
      'Cuando ENSEÑES estructura, ELEGÍ el tablero y poné en líneas nuevas al final:\n' +
      '[[CTYPE:whiteboard]]\n' +
      '[[BOARD:track_id]]  — tracks válidos: ' + tracks + '\n' +
      'Si ninguno encaja, DISEÑÁ el pizarrón:\n' +
      '[[BOARD_DESIGN:Título corto|Fórmula clara|Ejemplo bueno|Error típico ✗|Tu turno]]\n' +
      'Elegí el tablero que coincida con LA explicación de ESTE turno (puede cambiar cuando cambie el tema).\n'
    );
  }

  global.AiBoardDirective = {
    parse: parse,
    strip: strip,
    designHtml: designHtml,
    normalizeId: normalizeId,
    isValidForTutor: isValidForTutor,
    systemHint: systemHint,
    listTracks: listTracks,
    VERSION: '20260804ai2'
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));

if (typeof module !== 'undefined' && module.exports) {
  module.exports = (typeof globalThis !== 'undefined' && globalThis.AiBoardDirective)
    ? globalThis.AiBoardDirective
    : null;
}
