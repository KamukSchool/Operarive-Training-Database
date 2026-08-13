/**
 * Infinity arcade shared quiz bank — linkers, verb tenses, phrasals (+ fillers as distractors).
 * Exposed as window.InfinityQuizBank for Knight / Shadow Thief.
 */
(function (global) {
  'use strict';

  var FILLERS = ['idk', 'like', 'um...', 'you know', 'and stuff', 'kinda', 'whatever', 'lol', 'bruh', 'hmm'];

  function pickWrong(correct, extra) {
    var pool = FILLERS.concat(extra || []).filter(function (w) {
      return w !== correct;
    });
    for (var i = pool.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var t = pool[i];
      pool[i] = pool[j];
      pool[j] = t;
    }
    return pool.slice(0, 3);
  }

  function Q(cat, prompt, correct, distractors) {
    return {
      cat: cat,
      prompt: prompt,
      correct: correct,
      wrong: pickWrong(correct, distractors || [])
    };
  }

  var BANK = [
    // ── LINKERS ──
    Q('linker', 'El cliente llama molesto. ___ , quiero ayudarte.', 'however', ['therefore', 'then']),
    Q('linker', 'Entiendo la situación. ___ , tomaré acción.', 'therefore', ['however', 'besides']),
    Q('linker', 'Es difícil. ___ , podemos resolverlo.', 'besides', ['therefore', 'still']),
    Q('linker', 'Llamé al supervisor. ___ , documenté todo.', 'on top of that', ['instead', 'unless']),
    Q('linker', 'Es costoso ___ es muy efectivo.', 'even though', ['because', 'so']),
    Q('linker', 'El sistema falló. ___ , escaloné de inmediato.', 'as a result', ['although', 'meanwhile']),
    Q('linker', 'El reporte está listo. ___ , lo envié.', 'furthermore', ['instead', 'unless']),
    Q('linker', 'Primero escuché. ___ , confirmé el ticket.', 'then', ['although', 'unless']),
    Q('linker', 'No fue fácil. ___ , cerramos el caso.', 'nevertheless', ['because', 'so']),
    Q('linker', 'Revisé los logs. ___ , encontré la causa.', 'eventually', ['instead', 'unless']),
    Q('linker', 'El cliente insiste. ___ , mantengo la calma.', 'still', ['because', 'so']),
    Q('linker', 'Ya validé el pago. ___ , actualicé el CRM.', 'afterward', ['unless', 'although']),
    Q('linker', 'No tengo el dato. ___ , te confirmo en 5 minutos.', 'meanwhile', ['instead', 'so']),
    Q('linker', 'Podemos reembolsar ___ preferís crédito.', 'or', ['because', 'although']),
    Q('linker', 'Seguí el script ___ el cliente se salió del tema.', 'unless', ['because', 'so']),
    Q('linker', 'Actué rápido ___ evitar un churn.', 'in order to', ['because of', 'even though']),
    Q('linker', 'Hubo demora ___ un corte de red.', 'due to', ['in order to', 'even though']),
    Q('linker', 'Te ofrezco dos opciones. ___ , ambas resuelven el caso.', 'in either case', ['instead', 'unless']),

    // ── VERB TENSES ──
    Q('tense', 'Ayer el cliente ___ (call) tres veces.', 'called', ['calls', 'calling', 'call']),
    Q('tense', 'Ahora mismo ___ (review) el ticket.', 'am reviewing', ['reviewed', 'review', 'will review']),
    Q('tense', 'Para mañana ya ___ (send) el reporte.', 'will have sent', ['sent', 'send', 'am sending']),
    Q('tense', 'Mientras hablábamos, el sistema ___ (crash).', 'crashed', ['crashes', 'will crash', 'crash']),
    Q('tense', 'Si el pago falla, ___ (escalate) de inmediato.', 'will escalate', ['escalated', 'escalate', 'am escalating']),
    Q('tense', 'Ella ___ (work) aquí desde 2022.', 'has worked', ['worked', 'works', 'will work']),
    Q('tense', 'Cuando llegué, el lead ya ___ (leave).', 'had left', ['left', 'leaves', 'has left']),
    Q('tense', 'En este momento ___ (wait) la confirmación.', 'am waiting', ['waited', 'wait', 'will wait']),
    Q('tense', 'Si hubiera sabido, ___ (call) antes.', 'would have called', ['will call', 'called', 'call']),
    Q('tense', 'Cada lunes el equipo ___ (run) QA.', 'runs', ['ran', 'running', 'run']),
    Q('tense', 'Mañana a las 9 ___ (meet) al cliente.', 'are meeting', ['met', 'meet', 'have met']),
    Q('tense', 'No ___ (receive) el correo todavía.', 'have not received', ['did not received', 'not receive', 'was not receive']),
    Q('tense', 'Mientras yo tipaba, ella ___ (listen).', 'was listening', ['listens', 'listened', 'listen']),
    Q('tense', 'Para cuando cierres, yo ya ___ (update) el CRM.', 'will have updated', ['updated', 'update', 'am updating']),
    Q('tense', 'Si el cliente ___ (be) VIP, priorizamos.', 'is', ['was', 'been', 'will be']),
    Q('tense', 'Ayer a las 3 el bot ___ (send) el SMS.', 'sent', ['sends', 'sending', 'send']),

    // ── PHRASAL VERBS ──
    Q('phrasal', 'Necesito ___ (investigar) el error en los logs.', 'look into', ['look up to', 'give up', 'put off']),
    Q('phrasal', 'Voy a ___ (devolver la llamada) en 10 minutos.', 'call back', ['call off', 'hang up', 'put through']),
    Q('phrasal', 'Por favor ___ (esperar en línea) un momento.', 'hold on', ['hang on to', 'give in', 'turn down']),
    Q('phrasal', 'Tuve que ___ (colgar) porque se cortó.', 'hang up', ['hang out', 'call back', 'pick up']),
    Q('phrasal', '¿Puedo ___ (transferirte) con billing?', 'put you through', ['put off', 'turn down', 'give up']),
    Q('phrasal', 'Vamos a ___ (resolver) este caso hoy.', 'sort out', ['sort of', 'give out', 'take off']),
    Q('phrasal', 'El cliente quiere ___ el plan.', 'call off', ['call back', 'fill in', 'look after']),
    Q('phrasal', '___ el número de caso, por favor.', 'write down', ['write up', 'take off', 'put out']),
    Q('phrasal', 'Déjame ___ tu cuenta un segundo.', 'check on', ['check in', 'give up', 'turn up']),
    Q('phrasal', 'Voy a ___ con el siguiente paso.', 'follow up', ['give in', 'put down', 'take off']),
    Q('phrasal', 'Necesitamos ___ este formulario.', 'fill out', ['fill up', 'take out', 'put on']),
    Q('phrasal', 'El sistema se ___ otra vez.', 'went down', ['went up', 'took off', 'came across']),
    Q('phrasal', 'Voy a ___ con el supervisor.', 'find out', ['find in', 'look after', 'give away']),
    Q('phrasal', 'Por favor ___ el archivo al portal.', 'send over', ['send off', 'take over', 'put away']),
    Q('phrasal', 'No puedo ___ esta solicitud.', 'turn down', ['turn up', 'give back', 'look into']),
    Q('phrasal', 'Vamos a ___ donde lo dejamos.', 'pick up', ['pick on', 'give up', 'put off']),

    // ── MIXED / SOFT SKILL ENGLISH ──
    Q('mixed', 'Could you ___ that for me, please?', 'repeat', ['reply', 'replay', 'replace']),
    Q('mixed', 'I completely ___ your concern.', 'understand', ['understood', 'understanding', 'under stand']),
    Q('mixed', 'Let me ___ that I got this right.', 'confirm', ['conform', 'confine', 'confess']),
    Q('mixed', 'I apologize ___ the inconvenience.', 'for', ['of', 'about', 'to']),
    Q('mixed', 'Would you like me to ___ an email summary?', 'send', ['sent', 'sending', 'sends'])
  ];

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  /** Frame prompts for a game flavor without changing answer. */
  function flavorPrompt(q, flavor) {
    if (flavor === 'thief') {
      var prefix =
        q.cat === 'linker'
          ? 'ROBÁ EL LINKER: '
          : q.cat === 'tense'
            ? 'FORJÁ EL TIEMPO: '
            : q.cat === 'phrasal'
              ? 'EXTRAÉ EL PHRASAL: '
              : 'DOSSIER: ';
      return prefix + '"' + q.prompt + '"';
    }
    if (flavor === 'knight') {
      var tag =
        q.cat === 'linker'
          ? '[LINKER] '
          : q.cat === 'tense'
            ? '[TENSE] '
            : q.cat === 'phrasal'
              ? '[PHRASAL] '
              : '[CHAIN] ';
      return tag + q.prompt;
    }
    if (flavor === 'raiders') {
      return 'CLUE · ' + q.prompt;
    }
    return q.prompt;
  }

  /**
   * Rotating deck: reshuffles when empty, avoids same category 3x in a row when possible.
   */
  function createRotator(opts) {
    opts = opts || {};
    var flavor = opts.flavor || 'plain';
    var cats = opts.cats || null;
    var wrongCount = opts.wrongCount || 2;
    var source = BANK.filter(function (q) {
      return !cats || cats.indexOf(q.cat) !== -1;
    });
    if (!source.length) source = BANK.slice();
    var bag = [];
    var lastCat = '';
    var streakCat = 0;

    function refill() {
      bag = shuffle(source);
    }

    function next() {
      if (!bag.length) refill();
      var idx = 0;
      if (streakCat >= 2 && bag.length > 1) {
        for (var i = 0; i < bag.length; i++) {
          if (bag[i].cat !== lastCat) {
            idx = i;
            break;
          }
        }
      }
      var raw = bag.splice(idx, 1)[0];
      if (raw.cat === lastCat) streakCat++;
      else {
        lastCat = raw.cat;
        streakCat = 1;
      }
      var wrong = shuffle(raw.wrong.slice()).slice(0, wrongCount);
      return {
        cat: raw.cat,
        prompt: flavorPrompt(raw, flavor),
        correct: raw.correct,
        wrong: wrong
      };
    }

    function reset() {
      bag = [];
      lastCat = '';
      streakCat = 0;
      refill();
    }

    reset();
    return { next: next, reset: reset, size: source.length, cats: cats };
  }

  function stats() {
    var map = {};
    BANK.forEach(function (q) {
      map[q.cat] = (map[q.cat] || 0) + 1;
    });
    return { total: BANK.length, byCat: map };
  }

  global.InfinityQuizBank = {
    BANK: BANK,
    createRotator: createRotator,
    shuffle: shuffle,
    stats: stats,
    FILLERS: FILLERS
  };
})(typeof window !== 'undefined' ? window : globalThis);
