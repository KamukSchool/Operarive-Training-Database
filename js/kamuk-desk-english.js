/**
 * Kamuk Holdings desk English — Formato E + AMR.
 * Keep lists and regexes aligned with backend/kamuk-holdings-floor.js.
 */
(function (root) {
  'use strict';

  var PROFESSIONAL_CONNECTORS = [
    'because', 'however', 'therefore', 'although', 'in addition', 'as a result',
    'even though', 'on the other hand', 'in order to', 'consequently', 'nevertheless'
  ];

  var METHOD_PHRASES = [
    'even when', 'even though', 'what happens is that', 'when was that', 'when thinking',
    'in which', 'on which', 'which is used', 'despite that', 'in other words', 'which means',
    'not only', 'as well as', 'the thing is that', 'you know what i mean', 'it is said that',
    'it should be done', 'somehow', 'i realized', 'find a way', 'figure out', 'instead of',
    'about to', 'on the other hand', 'according to', 'such as', 'by now', 'for the moment',
    'so far', 'unless', 'without the', 'however'
  ];

  var EMPATHY_RE = /\b(understand|hear|sorry|apologize)\b|thank you for (writing|calling|waiting)/i;
  var EXEC_RE = /\b(i have|i blocked|i opened|i verified|i reviewed|i filed|i set|i activated|i escalated|i looked into|i sorted out)\b/i;
  var WILL_RE = /\b(i will|i am going to)\b/i;
  var CLOSE_RE = /\b(best regards|kind regards)\b/i;
  var OPEN_RE = /^(dear|hello|hi)\s+[a-z]/i;
  var MIRROR_RE = /\b(you said|you mentioned|so you|just to make sure|what happened was)\b/i;
  var TIMED_RE = /\b(today|tomorrow|within|business day|a\.m\.|p\.m\.|\d{1,2}:\d{2})\b/i;

  function wordCount(text) {
    var trimmed = String(text || '').trim();
    return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  }

  function listHits(lower, list) {
    return (list || []).filter(function (word) {
      return lower.indexOf(String(word).toLowerCase()) >= 0;
    });
  }

  function hasTimedNext(text) {
    return TIMED_RE.test(String(text || ''));
  }

  function gradeFormatoE(emailBody) {
    var text = String(emailBody || '').trim();
    var lower = text.toLowerCase();
    var words = wordCount(text);
    var connectors = listHits(lower, PROFESSIONAL_CONNECTORS);
    var method = listHits(lower, METHOD_PHRASES);
    var parts = {
      encabezado: OPEN_RE.test(text),
      empatia: EMPATHY_RE.test(text),
      explicacion: connectors.length >= 2 && method.length >= 1,
      ejecucion: EXEC_RE.test(text),
      encierro: hasTimedNext(text) && WILL_RE.test(text) && CLOSE_RE.test(text)
    };
    var missing = [];
    if (!parts.encabezado) missing.push('E1 Encabezado: Dear/Hello/Hi + nombre del cliente');
    if (!parts.empatia) missing.push('E2 Empatía: understand / hear / sorry / apologize / thank you for writing|calling|waiting');
    if (connectors.length < 2) missing.push('E3 Explicación: al menos 2 conectores (because, however, therefore…)');
    if (method.length < 1) missing.push('E3 Explicación: al menos 1 método linker (in other words, even though…)');
    if (!parts.ejecucion) missing.push('E4 Ejecución: qué YA hiciste (I have / I blocked / I reviewed / I escalated…)');
    if (!hasTimedNext(text) || !WILL_RE.test(text)) missing.push('E5 Encierro: I will / I am going to + hora (today / 4:30 p.m. / business days)');
    if (!CLOSE_RE.test(text)) missing.push('E5 Encierro: cierre Best regards / Kind regards');
    if (words < 55) missing.push('Mínimo 55 palabras (van ' + words + ')');
    return { ok: missing.length === 0, missing: missing, connectors: connectors, method: method, words: words, parts: parts };
  }

  function gradeAmrNote(noteText) {
    var text = String(noteText || '').trim();
    var parts = {
      acknowledge: EMPATHY_RE.test(text),
      mirror: MIRROR_RE.test(text),
      respond: WILL_RE.test(text) && hasTimedNext(text)
    };
    var missing = [];
    if (!parts.acknowledge) missing.push('AMR Acknowledge: understand / hear / sorry / apologize / thank you for calling|waiting');
    if (!parts.mirror) missing.push('AMR Mirror: you said / you mentioned / so you / just to make sure / what happened was');
    if (!parts.respond) missing.push('AMR Respond: I will + next step con hora');
    return { ok: missing.length === 0, missing: missing, parts: parts };
  }

  function gradePracticeTouch(input) {
    var source = input && typeof input === 'object' ? input : {};
    var emailGrade = gradeFormatoE(source.email);
    var missing = emailGrade.missing.slice();
    var amr = null;
    var note = source.note;
    if (note != null && String(note).trim()) {
      amr = gradeAmrNote(note);
      missing = missing.concat(amr.missing);
    }
    return {
      ok: emailGrade.ok && (!amr || amr.ok),
      missing: missing,
      email: emailGrade,
      amr: amr,
      connectors: emailGrade.connectors,
      method: emailGrade.method,
      words: emailGrade.words,
      parts: emailGrade.parts
    };
  }

  function missingMessage(missing) {
    return (missing || []).join(' · ');
  }

  var api = {
    PROFESSIONAL_CONNECTORS: PROFESSIONAL_CONNECTORS,
    METHOD_PHRASES: METHOD_PHRASES,
    gradeFormatoE: gradeFormatoE,
    gradeAmrNote: gradeAmrNote,
    gradePracticeTouch: gradePracticeTouch,
    missingMessage: missingMessage,
    wordCount: wordCount,
    hasTimedNext: hasTimedNext
  };

  root.KamukDeskEnglish = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
