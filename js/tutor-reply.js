/**
 * Tutor reply parsing — strip JSON wrappers, never leak {"reply":...} to UI/TTS.
 */
(function (global) {
  'use strict';

  var JSON_LEAK = /^\s*\{\s*"reply"\s*:\s*"([\s\S]*?)"\s*,?\s*"contentType"[\s\S]*?\}\s*$/;
  var JSON_PREFIX = /^\s*\{\s*"reply"\s*:\s*"?/;

  function extractTutorReply(raw) {
    if (!raw) return '';
    var text = String(raw).trim();
    if (!text) return '';
    try {
      var clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      if (clean.charAt(0) === '{') {
        var parsed = JSON.parse(clean);
        if (parsed && parsed.reply) return String(parsed.reply).trim();
      }
    } catch (e) { /* partial JSON during stream */ }
    var m = text.match(/\{[\s\S]*?"reply"\s*:\s*"((?:\\.|[^"\\])*)"/);
    if (m) {
      try { return JSON.parse('"' + m[1] + '"'); } catch (e2) { return m[1].replace(/\\n/g, '\n'); }
    }
    return text
      .replace(/```[\s\S]*?```/g, '')
      .replace(JSON_PREFIX, '')
      .replace(/"?\s*,?\s*"contentType"\s*:\s*"[^"]*"\s*\}?\s*$/i, '')
      .replace(/"?\s*\}\s*$/,'')
      .replace(/\\n/g, '\n')
      .trim();
  }

  function streamPlainText(raw) {
    var t = extractTutorReply(raw);
    if (t && t.indexOf('{') !== 0) {
      return String(t)
        .replace(/\[\[\s*BOARD_DESIGN\s*:[^\]]*\]\]/gi, '')
        .replace(/\[\[\s*BOARD\s*:[^\]]*\]\]/gi, '')
        .replace(/\[\[CTYPE:[^\]]*\]\]/gi, '')
        .trim();
    }
    return String(raw || '')
      .replace(JSON_PREFIX, '')
      .replace(/\\n/g, '\n')
      .replace(/"\s*,\s*"contentType"[\s\S]*$/,'')
      .replace(/\[\[\s*BOARD_DESIGN\s*:[^\]]*\]\]/gi, '')
      .replace(/\[\[\s*BOARD\s*:[^\]]*\]\]/gi, '')
      .replace(/\[\[CTYPE:[^\]]*\]\]/gi, '')
      .trim();
  }

  function looksLikeJsonLeak(text) {
    var t = String(text || '').trim();
    return t.indexOf('{"reply"') === 0 || t.indexOf('{\"reply\"') === 0 || JSON_PREFIX.test(t);
  }

  /** One opening turn — strips duplicate sections, markdown headers, and ALICE tip line. */
  function parseAliceOpening(raw) {
    var text = extractTutorReply(raw);
    if (!text) return { main: '', tip: '' };
    text = String(text).replace(/\r/g, '').trim();
    text = text.split(/\n-{3,}\s*\n/)[0].trim();
    var h1parts = text.split(/\n(?=#+\s)/);
    if (h1parts.length > 1) text = h1parts[0].trim();
    text = text.replace(/^#+\s*/gm, '').replace(/\*\*/g, '').trim();
    var idx = text.search(/\n?\s*ALICE:\s*/i);
    if (idx < 0) return { main: text.trim(), tip: '' };
    return {
      main: text.slice(0, idx).trim(),
      tip: text.slice(idx).replace(/^\s*ALICE:\s*/i, '').replace(/^\*+|\*+$/g, '').trim()
    };
  }

  function companionOpeningText(raw) {
    var p = parseAliceOpening(raw);
    if (!p.main && p.tip) return 'ALICE: ' + p.tip;
    if (p.tip) return p.main + '\n\nALICE: ' + p.tip;
    return p.main;
  }

  global.TutorReply = {
    extract: extractTutorReply,
    streamPlain: streamPlainText,
    looksLikeJson: looksLikeJsonLeak,
    parseOpening: parseAliceOpening,
    companionOpeningText: companionOpeningText
  };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
