/**
 * Jill — Rapid drill
 * Preguntas priorizadas por KPIs/temas que el estudiante falla (rapid drill + quizzes + refuerzo Jill).
 */
(function (global) {
  'use strict';

  var BRAND = 'Rapid drill';
  var MODE_LABEL = 'Rapid drill';

  var PULSE_OPTS = [
    { bg: '#5B21B6', shape: '⬡' },
    { bg: '#0a5c3c', shape: '⬢' },
    { bg: '#D97706', shape: '✦' },
    { bg: '#7C3AED', shape: '◇' }
  ];

  var KABOOM = PULSE_OPTS;

  var TIMER_SEC = 60;
  var QUESTIONS_PER_ROUND = 5;
  var WIN_SCORE_PCT = 70;
  var GOLD_SCORE_PCT = 100;
  var SILVER_SCORE_PCT = 80;

  function ensureRapidDrillStats(student) {
    if (!student) return { winStreak: 0, bestWinStreak: 0, totalWins: 0, trophies: 0 };
    if (!student.jillRapidDrill) {
      student.jillRapidDrill = { winStreak: 0, bestWinStreak: 0, totalWins: 0, trophies: 0 };
    }
    return student.jillRapidDrill;
  }

  function pressureRatio(state) {
    var total = state.timerSec || TIMER_SEC;
    var timeP = 1 - (state.timeLeft / total);
    var qP = state.idx / Math.max(1, state.quiz.length);
    return Math.min(0.98, Math.max(0.05, timeP * 0.72 + qP * 0.28));
  }

  function injectRapidDrillStyles() {
    if (document.getElementById('jill-rapid-drill-styles')) return;
    var st = document.createElement('style');
    st.id = 'jill-rapid-drill-styles';
    st.textContent = ''
      + '@keyframes jillKaboomIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}'
      + '@keyframes jillFlameFlicker{0%,100%{transform:scale(1) rotate(-4deg);filter:brightness(1)}50%{transform:scale(1.14) rotate(4deg);filter:brightness(1.2)}}'
      + '@keyframes jillPressureShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-2px)}75%{transform:translateX(2px)}}'
      + '@keyframes jillTrophyPop{0%{transform:scale(0.2) rotate(-20deg);opacity:0}60%{transform:scale(1.15) rotate(6deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}'
      + '@keyframes jillStreakPulse{0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,0.5)}50%{box-shadow:0 0 18px 6px rgba(251,191,36,0.35)}}'
      + '@keyframes jillConfettiFall{0%{transform:translateY(-12px) rotate(0);opacity:1}100%{transform:translateY(90px) rotate(280deg);opacity:0}}'
      + '.jill-pressure-track{position:relative;height:58px;margin:0 0 12px;border-radius:12px;background:linear-gradient(90deg,#1e1b4b 0%,#312e81 55%,#4c1d95 100%);border:1px solid rgba(251,191,36,0.35);overflow:hidden}'
      + '.jill-pressure-track.critical{animation:jillPressureShake .35s ease-in-out infinite;border-color:rgba(252,165,165,0.75)}'
      + '.jill-polvorin{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:46px;height:46px;border-radius:10px;background:linear-gradient(145deg,#78350f,#92400e);border:2px solid #fcd34d;box-shadow:inset 0 -4px 0 rgba(0,0,0,0.25),0 0 14px rgba(251,191,36,0.25);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;color:#fef3c7;letter-spacing:.04em;text-align:center;line-height:1.05}'
      + '.jill-flame-wrap{position:absolute;top:50%;transform:translateY(-50%);transition:left .85s linear;z-index:2}'
      + '.jill-flame{font-size:30px;line-height:1;animation:jillFlameFlicker .55s ease-in-out infinite;filter:drop-shadow(0 0 8px rgba(251,146,60,0.9))}'
      + '.jill-pressure-label{position:absolute;left:10px;top:6px;font-size:9px;font-weight:800;letter-spacing:.1em;color:rgba(254,243,199,0.85);text-transform:uppercase}'
      + '.jill-pressure-danger{position:absolute;left:10px;bottom:6px;font-size:10px;font-weight:800;color:#fca5a5}'
      + '.jill-trophy-burst{font-size:52px;animation:jillTrophyPop .55s cubic-bezier(.2,1.1,.3,1) both}'
      + '.jill-streak-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:rgba(251,191,36,0.18);border:1px solid rgba(251,191,36,0.55);color:#fde68a;font-size:12px;font-weight:800;animation:jillStreakPulse 1.2s ease-in-out infinite}'
      + '.jill-confetti span{position:absolute;top:0;width:8px;height:14px;border-radius:2px;animation:jillConfettiFall 1.1s ease-in forwards}'
      + '.jill-rapid-tier-bronze .jill-tier-badge{background:linear-gradient(135deg,#92400e,#b45309);color:#fef3c7}'
      + '.jill-rapid-tier-silver .jill-tier-badge{background:linear-gradient(135deg,#64748b,#94a3b8);color:#f8fafc}'
      + '.jill-rapid-tier-gold .jill-pressure-track,.jill-rapid-tier-legend .jill-pressure-track{border-color:rgba(251,191,36,0.75);box-shadow:0 0 20px rgba(251,191,36,0.25)}'
      + '.jill-rapid-tier-gold .jill-tier-badge,.jill-rapid-tier-legend .jill-tier-badge{background:linear-gradient(135deg,#b45309,#fbbf24,#f59e0b);color:#1c1917;box-shadow:0 0 18px rgba(251,191,36,0.45)}'
      + '.jill-rapid-tier-legend #jill-kaboom-inner{border:1px solid rgba(251,191,36,0.35);border-radius:16px;padding:4px}'
      + '.jill-tier-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;font-size:10px;font-weight:900;letter-spacing:.08em;margin-bottom:8px}'
      + '#jill-kaboom-inner{padding-bottom:calc(24px + env(safe-area-inset-bottom,0px))}'
      + '#jill-kaboom-next{display:block;width:100%;max-width:360px;margin:0 auto;box-shadow:0 8px 24px rgba(91,33,182,.45)}'
      + '.jill-rapid-fit-root{flex:1 1 auto;min-height:0;width:100%;max-width:820px;margin:0 auto;display:flex;flex-direction:column;height:100%;}'
      + '.jill-rapid-shell-fit{position:relative;flex:1 1 auto;min-height:0;height:100%;display:flex;flex-direction:column;background:rgba(88,28,135,.28);border:1px solid rgba(167,139,250,.4);border-radius:14px;padding:8px 10px;overflow:hidden;box-sizing:border-box;}'
      + '.jill-rapid-fit-hud{display:flex;align-items:center;justify-content:center;gap:8px;flex:0 0 auto;font-size:11px;font-weight:800;color:#e9d5ff;margin-bottom:4px;flex-wrap:wrap;}'
      + '.jill-rapid-fit-hud .jill-tier-badge{margin:0;padding:3px 8px;font-size:9px;}'
      + '#inf-arcade-fs-body.is-rapid-fit #jill-kaboom-stage{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;}'
      + '#inf-arcade-fs-body.is-rapid-fit #jill-kaboom-inner{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;overflow:hidden;padding-bottom:0!important;}'
      + '#inf-arcade-fs-body.is-rapid-fit .jill-pressure-track{height:34px;margin:0 0 6px;flex:0 0 auto;}'
      + '#inf-arcade-fs-body.is-rapid-fit .jill-polvorin{width:36px;height:36px;font-size:8px;}'
      + '#inf-arcade-fs-body.is-rapid-fit .jill-flame{font-size:22px;}'
      + '#inf-arcade-fs-body.is-rapid-fit .jill-pressure-label{top:4px;font-size:8px;}'
      + '#inf-arcade-fs-body.is-rapid-fit .jill-pressure-danger{bottom:3px;font-size:9px;}'
      + '#inf-arcade-fs-body.is-rapid-fit #jill-kaboom-timer{margin-bottom:8px!important;flex:0 0 auto;}'
      + '#inf-arcade-fs-body.is-rapid-fit .jill-qbox{min-height:0!important;padding:10px 12px!important;font-size:15px!important;margin-bottom:8px!important;flex:0 1 auto;}'
      + '#inf-arcade-fs-body.is-rapid-fit #jill-kaboom-opts{display:grid!important;grid-template-columns:1fr 1fr!important;grid-template-rows:1fr 1fr;gap:8px!important;flex:1 1 auto;min-height:120px;position:relative;z-index:8;}'
      + '#inf-arcade-fs-body.is-rapid-fit .jill-kaboom-opt{min-height:0!important;height:auto;padding:10px 12px!important;font-size:13px!important;}'
      + '#inf-arcade-fs-body.is-rapid-fit #jill-kaboom-exit-row{display:none;}'
      + '@media(max-width:640px){'
      + '#jill-kaboom-opts{grid-template-columns:1fr!important;gap:8px!important;}'
      + '#inf-arcade-fs-body.is-rapid-fit #jill-kaboom-opts{grid-template-columns:1fr 1fr!important;}'
      + '.jill-kaboom-opt{min-height:52px!important;padding:12px 14px!important;font-size:13px!important;}'
      + '#inf-arcade-fs-body.is-rapid-fit .jill-kaboom-opt{min-height:0!important;padding:10px 12px!important;}'
      + '.jill-pressure-track{height:48px;margin-bottom:8px;}'
      + '#inf-arcade-fs-body.is-rapid-fit .jill-pressure-track{height:34px;margin-bottom:6px;}'
      + '}'
      + '.jill-rapid-shell-fit,.jill-rapid-shell{position:relative;}'
      + '#inf-arcade-fs-body.is-rapid-fit #jill-kaboom-opts,.jill-rapid-shell-fit #jill-kaboom-opts{position:relative;z-index:5;}'
      + '#inf-arcade-fs-body.is-rapid-fit .jill-kaboom-opt{position:relative;z-index:5;}'
      + '#jill-rapid-fx{pointer-events:none;flex:1 1 auto;min-height:140px;width:100%;display:flex;align-items:flex-end;justify-content:center;gap:18px;overflow:hidden;margin-top:4px;}'
      + '#inf-arcade-fs-body.is-rapid-fit #jill-rapid-fx{min-height:0;}'
      + '@keyframes jillRapidFxIn{from{opacity:0}to{opacity:1}}'
      + '.jill-rapid-fx-actor{flex:0 0 auto;height:100%;width:auto;aspect-ratio:1/1;max-height:min(180px,100%);max-width:min(180px,46%);min-height:0;background-size:contain;background-repeat:no-repeat;background-position:center bottom;image-rendering:pixelated;image-rendering:crisp-edges;filter:drop-shadow(0 6px 10px rgba(0,0,0,.5));animation:jillRapidFxIn .35s ease-out both;}'
      + '.jill-rapid-fx-actor.is-knight{max-height:min(188px,100%);max-width:min(188px,52%);filter:drop-shadow(0 0 14px rgba(251,191,36,.55)) drop-shadow(0 6px 10px rgba(0,0,0,.45));}'
      + '@media(max-width:640px){#jill-rapid-fx{min-height:88px;gap:8px}#inf-arcade-fs-body.is-rapid-fit #jill-rapid-fx{min-height:0}.jill-rapid-fx-actor,.jill-rapid-fx-actor.is-knight{max-height:min(148px,100%)}}'
      + '@media(prefers-reduced-motion:reduce){.jill-rapid-fx-actor{animation:none!important}}';
    document.head.appendChild(st);
  }

  var RAPID_FX_BASE = 'games/tense-raiders/assets/chars/';
  var RAPID_FX_IDLE = { goblin: 10, skeleton: 10, knight: 10 };
  var RAPID_FX_ATTACK = { knight: 8 };
  var _rapidFxPreloaded = false;
  var _rapidFxTimers = [];

  function prefersRapidFxOff() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }

  function trackRapidFxTimer(id) {
    _rapidFxTimers.push(id);
    return id;
  }

  function clearRapidFx() {
    _rapidFxTimers.forEach(function (id) {
      clearInterval(id);
      clearTimeout(id);
    });
    _rapidFxTimers = [];
    var stage = document.getElementById('jill-rapid-fx');
    if (stage) {
      stage.innerHTML = '';
      stage.removeAttribute('data-fx');
    }
  }

  function rapidFxUrl(who, folder, i) {
    return RAPID_FX_BASE + who + '/' + folder + '/' + i + '.png?v=rd2';
  }

  function preloadRapidFx() {
    if (_rapidFxPreloaded) return;
    _rapidFxPreloaded = true;
    ['goblin', 'skeleton', 'knight'].forEach(function (who) {
      var n = RAPID_FX_IDLE[who] || 10;
      var i;
      for (i = 0; i < n; i++) {
        var im = new Image();
        im.src = RAPID_FX_BASE + who + '/idle/' + i + '.png?v=rd2';
      }
    });
    var a;
    for (a = 0; a < (RAPID_FX_ATTACK.knight || 8); a++) {
      var at = new Image();
      at.src = RAPID_FX_BASE + 'knight/attack/' + a + '.png?v=rd2';
    }
  }

  function paintRapidActor(el, who, folder, fi) {
    el.style.backgroundImage = 'url("' + rapidFxUrl(who, folder, fi) + '")';
  }

  function spawnRapidActor(who, startFolder) {
    var el = document.createElement('div');
    el.className = 'jill-rapid-fx-actor' + (who === 'knight' ? ' is-knight' : '');
    var reduced = prefersRapidFxOff();
    var idleN = RAPID_FX_IDLE[who] || 10;
    paintRapidActor(el, who, 'idle', 0);
    if (reduced) return el;

    function loopIdle() {
      var fi = 0;
      paintRapidActor(el, who, 'idle', 0);
      trackRapidFxTimer(setInterval(function () {
        fi = (fi + 1) % idleN;
        paintRapidActor(el, who, 'idle', fi);
      }, 140));
    }

    if (startFolder === 'attack' && who === 'knight') {
      var atkN = RAPID_FX_ATTACK.knight || 8;
      var ai = 0;
      paintRapidActor(el, who, 'attack', 0);
      var iv = trackRapidFxTimer(setInterval(function () {
        ai += 1;
        if (ai >= atkN) {
          clearInterval(iv);
          loopIdle();
          return;
        }
        paintRapidActor(el, who, 'attack', ai);
      }, 90));
    } else {
      loopIdle();
    }
    return el;
  }

  function playRapidDrillFx(kind) {
    preloadRapidFx();
    clearRapidFx();
    var stage = document.getElementById('jill-rapid-fx');
    if (!stage) return;
    stage.setAttribute('data-fx', kind);
    if (kind === 'hit') {
      stage.appendChild(spawnRapidActor('knight', prefersRapidFxOff() ? 'idle' : 'attack'));
      return;
    }
    var n = 1 + Math.floor(Math.random() * 2);
    var i;
    for (i = 0; i < n; i++) {
      stage.appendChild(spawnRapidActor(Math.random() < 0.7 ? 'goblin' : 'skeleton', 'idle'));
    }
  }

  function renderPressureScene(state) {
    var ratio = pressureRatio(state);
    var leftPct = Math.round(8 + ratio * 62);
    var critical = state.timeLeft <= 5;
      var danger = critical ? 'El piso se te viene encima.' : (ratio > 0.55 ? 'Movete. El reloj no espera.' : 'Presión subiendo.');
    return '<div id="jill-pressure-track" class="jill-pressure-track' + (critical ? ' critical' : '') + '">'
      + '<div class="jill-pressure-label">Presión psicológica</div>'
      + '<div class="jill-pressure-danger" id="jill-pressure-danger">' + esc(danger) + '</div>'
      + '<div id="jill-pressure-flame" class="jill-flame-wrap" style="left:' + leftPct + '%;"><div class="jill-flame">🔥</div></div>'
      + '<div class="jill-polvorin" title="Polvorín">PÓLVORA</div>'
      + '</div>';
  }

  function updatePressureDom(state) {
    var track = document.getElementById('jill-pressure-track');
    var flame = document.getElementById('jill-pressure-flame');
    var danger = document.getElementById('jill-pressure-danger');
    if (!flame) return;
    var ratio = pressureRatio(state);
    flame.style.left = Math.round(8 + ratio * 62) + '%';
    if (track) track.classList.toggle('critical', state.timeLeft <= 5);
    if (danger) {
      danger.textContent = state.timeLeft <= 5
        ? 'El piso se te viene encima.'
        : (ratio > 0.55 ? 'Movete. El reloj no espera.' : 'Presión subiendo.');
    }
  }

  function renderMiniTrophy(streak) {
    var tier = streak >= 5 ? '🏆' : (streak >= 3 ? '🥇' : '⭐');
    var label = streak >= 5 ? 'RACHA LEGENDARIA' : (streak >= 3 ? 'RACHA EN FUEGO' : 'BIEN');
    return '<div class="jill-trophy-burst" style="margin-bottom:6px;">' + tier + '</div>'
      + '<div class="jill-streak-pill">🔥 Racha ' + streak + ' · ' + label + '</div>';
  }

  function renderConfettiBurst() {
    var colors = ['#fbbf24', '#f472b6', '#34d399', '#60a5fa', '#c4b5fd', '#fb923c'];
    var html = '<div class="jill-confetti" style="position:relative;height:70px;margin:0 auto 8px;max-width:280px;overflow:hidden;">';
    for (var i = 0; i < 14; i++) {
      var left = 8 + Math.floor(Math.random() * 84);
      var delay = (Math.random() * 0.35).toFixed(2);
      var col = colors[i % colors.length];
      html += '<span style="left:' + left + '%;background:' + col + ';animation-delay:' + delay + 's;"></span>';
    }
    return html + '</div>';
  }

  function trophyForScore(score, perfect) {
    if (perfect || score >= GOLD_SCORE_PCT) return { icon: '🏆', title: 'TROFEO DE ORO', sub: 'Rapid drill perfecto' };
    if (score >= SILVER_SCORE_PCT) return { icon: '🥇', title: 'TROFEO DE PLATA', sub: 'Excelente bajo presión' };
    if (score >= WIN_SCORE_PCT) return { icon: '🥈', title: 'TROFEO DE BRONCE', sub: 'Ganaste la ronda' };
    return { icon: '💀', title: 'El piso te comió', sub: 'Volvé. Nadie espera.' };
  }

  function applyWinStreak(student, score, perfect) {
    var rd = ensureRapidDrillStats(student);
    var won = score >= WIN_SCORE_PCT;
    if (won) {
      rd.winStreak = (rd.winStreak || 0) + 1;
      rd.totalWins = (rd.totalWins || 0) + 1;
      rd.trophies = (rd.trophies || 0) + (perfect || score >= GOLD_SCORE_PCT ? 3 : (score >= SILVER_SCORE_PCT ? 2 : 1));
      if (rd.winStreak > (rd.bestWinStreak || 0)) rd.bestWinStreak = rd.winStreak;
    } else {
      rd.winStreak = 0;
    }
    rd.lastScore = score;
    rd.lastDate = new Date().toISOString();
    rd.tier = rapidDrillTier(student);
    return { won: won, rd: rd };
  }

  var COIN_QUESTIONS = [
    { kpi: 'k3', topic: 'coin', q: 'Completá la pregunta: ___ you ready?', options: ['Are', 'Is', 'Do', 'Does'], answer: 0, explain: 'Pregunta con to be: Are + you.' },
    { kpi: 'k3', topic: 'coin', q: 'Completá la respuesta: Yes, I ___ ready.', options: ['am', 'is', 'are', 'be'], answer: 0, explain: 'Respuesta afirmativa: I am ready.' },
    { kpi: 'k3', topic: 'coin', q: 'Completá la pregunta en pasado: ___ she work yesterday?', options: ['Did', 'Does', 'Do', 'Was'], answer: 0, explain: 'Pasado en pregunta: Did + sujeto + verbo base.' },
    { kpi: 'k3', topic: 'coin', q: 'Completá la respuesta: She ___ yesterday.', options: ['worked', 'work', 'working', 'works'], answer: 0, explain: 'Afirmación en pasado: verbo en -ed.' },
    { kpi: 'k14', topic: 'coin', q: '¿Cuál es pregunta correcta?', options: ['They are coming.', 'Are they coming?', 'Coming they are.', 'They coming are?'], answer: 1, explain: 'Auxiliar al inicio: Are they…?' }
  ];

  var PREP_QUESTIONS = [
    { kpi: 'k4', topic: 'prep', q: 'I live ___ San José (ciudad)', options: ['in', 'on', 'at', 'by'], answer: 0, explain: 'in + ciudad/país.' },
    { kpi: 'k4', topic: 'prep', q: 'The book is ___ the table', options: ['in', 'on', 'at', 'by'], answer: 1, explain: 'on + superficie.' },
    { kpi: 'k4', topic: 'prep', q: 'We meet ___ 5 pm', options: ['in', 'on', 'at', 'by'], answer: 2, explain: 'at + hora.' },
    { kpi: 'k4', topic: 'prep', q: 'I go ___ car', options: ['in', 'on', 'at', 'by'], answer: 3, explain: 'by + transporte.' }
  ];

  var ARTICLE_QUESTIONS = [
    { kpi: 'k4', topic: 'article', q: 'I need ___ hour (sonido vocal)', options: ['a', 'an', 'the', '—'], answer: 1, explain: 'an antes de sonido vocal.' },
    { kpi: 'k4', topic: 'article', q: '___ sun is bright (único)', options: ['A', 'An', 'The', '—'], answer: 2, explain: 'the + único conocido.' },
    { kpi: 'k4', topic: 'article', q: 'She is ___ engineer', options: ['a', 'an', 'the', '—'], answer: 1, explain: 'an + engineer.' }
  ];

  var CONSTRUCTION_QUESTIONS = [
    { kpi: 'k3', category: 'structure', topic: 'structure', q: 'Arma la oracion: [yesterday / home / went / she]', options: ['She went home yesterday.', 'Yesterday she home went.', 'She yesterday went home.', 'Went she home yesterday.'], answer: 0, explain: 'Sujeto + verbo + complemento.' },
    { kpi: 'k3', category: 'reverse', topic: 'reverse', q: 'Afirmacion: She worked yesterday. -> Pregunta:', options: ['Did she work yesterday?', 'She did work yesterday?', 'Does she worked yesterday?', 'Worked she yesterday?'], answer: 0, explain: 'Did + sujeto + verbo base.' },
    { kpi: 'k2', category: 'tense_var', topic: 'tense_var', q: 'Misma idea en CONTINUO: "She writes emails."', options: ['She is writing emails now.', 'She writing emails now.', 'She writes emails now is.', 'She does writing emails.'], answer: 0, explain: 'be + -ing para ahora.' },
    { kpi: 'k8', category: 'transition', topic: 'transition', q: 'Une con CAUSA: "I stayed home ___ it was raining."', options: ['because', 'however', 'despite', 'although'], answer: 0, explain: 'because = causa.' },
    { kpi: 'k3', category: 'structure', topic: 'structure', q: 'Arma la pregunta: [live / where / you / do]', options: ['Where do you live?', 'Where you live?', 'Do where you live?', 'Where live you do?'], answer: 0, explain: 'WH + auxiliar + sujeto + verbo base.' },
    { kpi: 'k3', category: 'reverse', topic: 'reverse', q: 'ES -> EN: Ella no trabaja los lunes.', options: ["She doesn't work on Mondays.", "She don't work on Mondays.", "She isn't work on Mondays.", "She not works on Mondays."], answer: 0, explain: "She + doesn't + verbo base." },
    { kpi: 'k2', category: 'tense_var', topic: 'tense_var', q: 'Cual marca HABITO (presente simple)?', options: ['He takes the bus every morning.', 'He is taking the bus right now.', 'He took the bus yesterday.', 'He has taken the bus already.'], answer: 0, explain: 'every morning = presente simple.' },
    { kpi: 'k8', category: 'transition', topic: 'transition', q: 'Une con CONTRASTE: "I wanted to go, ___ I was tired."', options: ['but', 'so', 'because', 'and'], answer: 0, explain: 'but = contraste.' },
    { kpi: 'k3', category: 'structure', topic: 'structure', q: 'Mejor oracion completa (idea + razon):', options: ['I like my job because I learn every day.', 'I like job.', 'Because I like.', 'Job good because learn.'], answer: 0, explain: 'idea + because + desarrollo.' },
    { kpi: 'k3', category: 'reverse', topic: 'reverse', q: 'Afirmacion: He goes to the gym. -> Pregunta:', options: ['Does he go to the gym?', 'Does he goes to the gym?', 'Do he go to the gym?', 'Goes he to the gym?'], answer: 0, explain: 'Does + he + verbo base.' },
    { kpi: 'k2', category: 'tense_var', topic: 'tense_var', q: 'Pasado vs perfecto: "Ayer termine el informe."', options: ['I finished the report yesterday.', 'I have finished the report yesterday.', 'I finish the report yesterday.', 'I was finish the report yesterday.'], answer: 0, explain: 'yesterday = pasado simple.' },
    { kpi: 'k8', category: 'transition', topic: 'transition', q: 'Secuencia: "First we reviewed the brief. ___, we called the client."', options: ['Then', 'Because', 'Despite', 'Although'], answer: 0, explain: 'Then = siguiente paso.' },
    { kpi: 'k3', category: 'structure', topic: 'structure', q: 'Orden correcto con dos objetos:', options: ['I gave her the book.', 'I gave the book her.', 'I her gave the book.', 'Gave I her the book.'], answer: 0, explain: 'give + persona + cosa.' },
    { kpi: 'k8', category: 'transition', topic: 'transition', q: 'Contraste formal: "The plan failed; ___, we learned a lot."', options: ['however', 'because', 'so', 'and'], answer: 0, explain: 'however = contraste.' }
  ];

  var THERE_QUESTIONS = [
    { kpi: 'k3', topic: 'there', q: 'Hay un gato en la mesa →', options: ['There is a cat on the table', 'It has a cat on the table', 'There are a cat on the table', 'Have a cat on the table'], answer: 0, explain: 'Hay = there + be. Singular → there is.' },
    { kpi: 'k3', topic: 'there', q: 'Hay problemas →', options: ['There are problems', 'There is problems', 'It is problems', 'Have problems'], answer: 0, explain: 'Plural → there are.' },
    { kpi: 'k3', topic: 'there', q: '¿Hay una reunión mañana? →', options: ['Is there a meeting tomorrow?', 'There is a meeting tomorrow?', 'Are there a meeting tomorrow?', 'Does there a meeting tomorrow?'], answer: 0, explain: 'Pregunta moneda: be al frente → Is there…?' },
    { kpi: 'k3', topic: 'there', q: '¿Hay preguntas? →', options: ['Are there any questions?', 'Is there any questions?', 'There are questions?', 'Do there questions?'], answer: 0, explain: 'Questions = plural → Are there…?' },
    { kpi: 'k2', topic: 'there', q: 'Había mucha gente →', options: ['There were many people', 'There was many people', 'There had many people', 'It was many people'], answer: 0, explain: 'Pasado plural → there were.' },
    { kpi: 'k2', topic: 'there', q: 'Habrá tiempo →', options: ['There will be time', 'There will time', 'Will there time', 'There is will time'], answer: 0, explain: 'Futuro: there will be + C.' },
    { kpi: 'k3', topic: 'there', q: 'Habría un problema →', options: ['There would be a problem', 'There would a problem', 'Would there a problem', 'There will be a problem'], answer: 0, explain: 'Condicional: there would be.' },
    { kpi: 'k3', topic: 'there', q: 'Ha habido retrasos →', options: ['There have been delays', 'There has been delays', 'There have delay', 'There is been delays'], answer: 0, explain: 'Perfecto plural → there have been.' },
    { kpi: 'k3', topic: 'there', q: 'Existe un libro (no identificación) →', options: ['There is a book', 'It is a book', 'There are a book', 'Is a book'], answer: 0, explain: 'Existencia → there is. It is = identificación.' },
    { kpi: 'k3', topic: 'there', q: 'Afirmación: There is a meeting. → Pregunta (moneda):', options: ['Is there a meeting?', 'There is a meeting?', 'Does there a meeting?', 'Is there are a meeting?'], answer: 0, explain: 'Inversión: Is + there + C.' },
    { kpi: 'k3', topic: 'coin', q: 'Afirmación: She worked yesterday. → Pregunta (moneda):', options: ['Did she work yesterday?', 'She did work yesterday?', 'Does she worked yesterday?', 'Worked she yesterday?'], answer: 0, explain: 'Pasado pregunta: Did al frente + verbo base.' },
    { kpi: 'k3', topic: 'coin', q: 'Afirmación: They are working. → Pregunta (moneda):', options: ['Are they working?', 'They are working?', 'Do they working?', 'Are working they?'], answer: 0, explain: 'PC pregunta: Are al frente.' }
  ];

  var FOUNDATIONS_DRILL = CONSTRUCTION_QUESTIONS.concat(COIN_QUESTIONS).concat(PREP_QUESTIONS).concat(ARTICLE_QUESTIONS).concat(THERE_QUESTIONS);

  /** Challenge drill — Alice / Companion ONLY (STAR, linkers, CS). Never serve this on Jill. */
  var ADVANCED_DRILL = [
    { kpi: 'k10', category: 'linker', q: 'Completá: I wanted to apply, ___ I lacked experience.', options: ['however', 'therefore', 'first', 'plus'], answer: 0, explain: 'Contraste → however.' },
    { kpi: 'k8', category: 'linker', q: 'We missed the deadline, ___ the client was understanding.', options: ['however', 'so', 'because', 'although'], answer: 0, explain: 'Resultado inesperado → however.' },
    { kpi: 'k10', category: 'linker', q: '___ the rain, we still held the outdoor event.', options: ['Despite', 'Therefore', 'So far', 'On top'], answer: 0, explain: 'Despite + contraste.' },
    { kpi: 'k9', category: 'expansion', q: 'Mejor expansión a "Yes":', options: ['Yes, I do because it fits my goals.', 'Yes.', 'Yes, job.', 'Yes, because.'], answer: 0, explain: 'Idea + razón completa.' },
    { kpi: 'k20', category: 'star', q: 'En STAR, la "T" significa:', options: ['Task you had to complete', 'Time you spent', 'Team you led only', 'Title of project'], answer: 0, explain: 'Situation, Task, Action, Result.' },
    { kpi: 'k20', category: 'star', q: 'Which sentence is the ACTION in STAR?', options: ['I coordinated three teams and delivered ahead of schedule.', 'The company was struggling.', 'My role was important.', 'In conclusion, I learned a lot.'], answer: 0, explain: 'Action = verbos concretos.' },
    { kpi: 'k13', category: 'recovery', q: 'Under pressure you forget a word — best move:', options: ['"Let me rephrase that…" and continue', 'Stop talking', 'Switch to Spanish only', 'Repeat the same word louder'], answer: 0, explain: 'Recovery phrase + seguir.' },
    { kpi: 'k21', category: 'closure', q: 'Professional email close:', options: ['I look forward to your reply.', 'Ok bye', 'See u', 'Thanks and thats it'], answer: 0, explain: 'Cierre profesional.' },
    { kpi: 'k10', category: 'linker', q: 'On top of that, we ___ reduced costs.', options: ['also', 'however', 'although', 'despite'], answer: 0, explain: 'On top of that = además.' },
    { kpi: 'k8', category: 'linker', q: 'We improved quality; ___, customer complaints dropped.', options: ['therefore', 'however', 'although', 'despite'], answer: 0, explain: 'Causa → resultado: therefore.' },
    { kpi: 'k18', category: 'clarity', q: 'Before answering a complex question, you should:', options: ['Confirm you understood in one sentence', 'Guess immediately', 'Change the topic', 'Ask them to repeat in Spanish'], answer: 0, explain: 'Multi-step clarity.' },
    { kpi: 'k10', category: 'linker', q: 'Even though it was late, ___', options: ['we finished the report', 'we late the report', 'report finish we', 'finishing report'], answer: 0, explain: 'Even though + clause completa.' },
    { kpi: 'k9', category: 'expansion', q: 'Expand: "I like my job."', options: ['I like my job because I learn every day and work with a great team.', 'I like job.', 'Job good.', 'Like job because.'], answer: 0, explain: 'Idea + desarrollo.' },
    { kpi: 'PS', category: 'pressure', q: 'In a heated call, best first response:', options: ['I understand this is frustrating — let me check that now.', 'Calm down.', 'Not my problem.', 'Wait.'], answer: 0, explain: 'Pressure stability.' },
    { kpi: 'k10', category: 'linker', q: 'In other words, ___ means we need more time.', options: ['this', 'however', 'despite', 'although'], answer: 0, explain: 'In other words + reformulación.' },
    { kpi: 'k8', category: 'linker', q: 'So far, we ___ completed phase one.', options: ['have', 'has', 'had', 'having'], answer: 0, explain: 'So far + present perfect.' },
    { kpi: 'k20', category: 'star', q: 'Weak STAR answer:', options: ['We had a problem and it was hard.', 'I identified the bottleneck, reallocated two analysts, and cut delays by 40%.', 'I used Excel and email.', 'The team was busy.'], answer: 0, explain: 'Vago vs Action concreta.' },
    { kpi: 'R', category: 'risk', q: 'Take a risk with vocabulary — better option:', options: ['Use a new phrase you practiced, even if imperfect', 'Only use words you memorized', 'Stay silent', 'Switch languages'], answer: 0, explain: 'Risk taking.' },
    { kpi: 'k10', category: 'linker', q: 'Besides cost, ___ factor matters for clients.', options: ['another key', 'however key', 'despite key', 'although key'], answer: 0, explain: 'Besides + another idea.' },
    { kpi: 'k8', category: 'linker', q: 'The plan failed; ___, we learned what to fix.', options: ['nevertheless', 'so far', 'on top of', 'first of all'], answer: 0, explain: 'Nevertheless = aun así.' },
    { kpi: 'k10', category: 'linker', q: 'I enjoy the role. ___, the commute is exhausting.', options: ['However', 'Therefore', 'So far', 'Besides'], answer: 0, explain: 'Contraste entre ideas.' },
    { kpi: 'k9', category: 'expansion', q: 'Best follow-up to "What do you do?"', options: ['I manage client accounts and coordinate weekly reports with two teams.', 'I work.', 'Job.', 'I do things.'], answer: 0, explain: 'Expansión operacional.' },
    { kpi: 'k8', category: 'linker', q: 'She prepared well; ___, she passed the interview.', options: ['as a result', 'however', 'although', 'despite'], answer: 0, explain: 'Causa → resultado.' },
    { kpi: 'k13', category: 'recovery', q: 'You lose your train of thought mid-answer:', options: ['"What I mean is…" and restate the point', 'Stop the interview', 'Laugh it off only', 'Ask to restart from zero'], answer: 0, explain: 'Recovery sin congelarse.' },
    { kpi: 'k10', category: 'linker', q: 'Not only did we save time, ___ we improved quality.', options: ['but we also', 'however we', 'despite we', 'although we'], answer: 0, explain: 'Not only… but also.' }
  ];

  var CHALLENGE_QUESTIONS_PER_ROUND = 8;
  var CHALLENGE_TIMER_SEC = 45;

  var CORE = [
    { kpi: 'k10', q: 'Completá la oración: I think ___ because…', options: ['that', 'the', 'to', 'on'], answer: 0, explain: 'Opinión + because: I think that… because…' },
    { kpi: 'k8', q: '¿Cuál conector muestra contraste?', options: ['on top of that', 'however', 'first of all', 'as well as'], answer: 1, explain: '"However" marca oposición entre ideas.' },
    { kpi: 'k9', q: 'Te preguntan "Do you like your job?" — completá mejor: Yes, ___', options: ['I do because…', 'yes', 'job', 'like'], answer: 0, explain: 'Expandí: Yes, I do because…' },
    { kpi: 'k13', q: 'Si te trabás al hablar, lo mejor es…', options: ['Callar', '"Let me rephrase" y seguir', 'Colgar', 'Hablar más fuerte'], answer: 1, explain: 'Reparar y continuar — recovery sin presión.' },
    { kpi: 'k2', q: 'Completá: Yesterday I ___ to the office.', options: ['went', 'go', 'going', 'goes'], answer: 0, explain: 'Pasado simple: I went.' }
  ];

  var BY_BUNDLE = {
    'F0-matrix': CONSTRUCTION_QUESTIONS.slice(0, 4).concat(COIN_QUESTIONS.slice(0, 2)).concat(PREP_QUESTIONS.slice(0, 1)),
    'F1-msi': [
      { kpi: 'k3', q: 'Después de have en perfecto: I have ___ busy all week.', options: ['been', 'be', 'being', 'was'], answer: 0, explain: 'Have + participio: I have been.' },
      { kpi: 'k3', q: 'Después de been: I have been ___ on this project.', options: ['working', 'work', 'worked', 'works'], answer: 0, explain: 'Been + -ing: I have been working.' },
      { kpi: 'k2', q: 'Completá el pasado: They ___ the meeting early.', options: ['finished', 'finish', 'finishing', 'finishes'], answer: 0, explain: 'Pasado simple: finished.' }
    ],
    'B2-verbs': [
      { kpi: 'k1', q: 'Tres formas clave de un verbo son…', options: ['Presente · pasado · participio', 'Solo presente', 'Solo infinitivo', 'Artículo · sustantivo · verbo'], answer: 0, explain: 'Present · Past · Participle — piezas operativas.' },
      { kpi: 'k2', q: 'I ___ yesterday. (trabajar)', options: ['work', 'worked', 'working', 'have work'], answer: 1, explain: 'Pasado simple: worked.' },
      { kpi: 'k4', q: 'I have ___ there. (estar)', options: ['be', 'been', 'being', 'was'], answer: 1, explain: 'Have + participio: have been.' }
    ],
    'F2-pronouns': [
      { kpi: 'k4', q: '"This is ___ book" — posesivo de I', options: ['me', 'my', 'mine', 'myself'], answer: 1, explain: 'Antes del sustantivo: my book.' },
      { kpi: 'k4', q: 'Reflexivo de "she" es…', options: ['hers', 'herself', 'sheself', 'her'], answer: 1, explain: 'She did it herself.' },
      { kpi: 'k4', q: 'Demostrativo cerca: ___', options: ['that', 'this', 'those', 'them'], answer: 1, explain: 'This = cerca; That = lejos.' }
    ],
    'B1-chunking': [
      { kpi: 'k9', q: 'Un chunk útil para opiniones…', options: ['I think because…', 'Word by word', 'Only yes', 'Translate all'], answer: 0, explain: 'Opinión + because + ejemplo.' },
      { kpi: 'k8', q: '"On top of that" sirve para…', options: ['Contrastar', 'Agregar idea', 'Cerrar', 'Disculparse'], answer: 1, explain: 'Agrega información relacionada.' },
      { kpi: 'k10', q: 'Chunking evita…', options: ['Hablar fluido', 'Traducir cada palabra', 'Usar conectores', 'Practicar'], answer: 1, explain: 'Bloques listos > traducción mental.' }
    ],
    'B4-transitions': [
      { kpi: 'k8', q: 'Linker de causa…', options: ['however', 'because', 'although', 'meanwhile'], answer: 1, explain: 'Because explica el porqué.' },
      { kpi: 'k8', q: 'Para ordenar pasos usás…', options: ['First… Then… Finally', 'However…', 'Although…', 'Anyway…'], answer: 0, explain: 'Secuencia clara en narrativas.' },
      { kpi: 'k8', q: '"Therefore" indica…', options: ['Contraste', 'Conclusión', 'Ejemplo', 'Saludo'], answer: 1, explain: 'Therefore = por eso / conclusión.' }
    ],
    'F6-oral-production': [
      { kpi: 'k5', q: 'Para describir, empezá con…', options: ['Silencio', 'Una imagen o detalle concreto', 'Solo "I don\'t know"', 'Traducir todo'], answer: 1, explain: 'Describe con detalles visibles.' },
      { kpi: 'k11', q: 'Opinión completa = …', options: ['I think', 'I think because… for example…', 'Yes', 'Maybe'], answer: 1, explain: 'Opinión + razón + ejemplo.' },
      { kpi: 'k6', q: 'En narración, el orden típico es…', options: ['Finally first', 'First → Then → Finally', 'Random', 'Solo pasado'], answer: 1, explain: 'Primero, después, al final.' }
    ],
    'F4-components': [
      { kpi: 'k4', topic: 'there', q: 'Hay tres libros en la mesa →', options: ['There are three books on the table', 'There is three books on the table', 'It has three books', 'Have three books on the table'], answer: 0, explain: 'Hay plural → there are.' },
      { kpi: 'k4', topic: 'there', q: '¿Habrá tiempo para preguntas? →', options: ['Will there be time for questions?', 'Will there time for questions?', 'Is there will be time?', 'There will be time for questions?'], answer: 0, explain: 'Will there be = futuro existencial.' },
      { kpi: 'k4', topic: 'prep', q: 'I live ___ San José (ciudad)', options: ['in', 'on', 'at', 'by'], answer: 0, explain: 'in + ciudad/país.' }
    ],
    'B6-recovery': [
      { kpi: 'k13', q: 'Frase de reparación útil…', options: ['Let me rephrase that', 'I quit', 'No English', 'Louder please'], answer: 0, explain: 'Reformulá y seguí.' },
      { kpi: 'k12', q: 'Después de un error, Jill quiere que…', options: ['Pares', 'Cierres la idea igual', 'Cambies de idioma', 'Te disculpes 10 veces'], answer: 1, explain: '…and that is basically it — cerrá la idea.' },
      { kpi: 'k2', q: 'Recovery bajo presión significa…', options: ['No arriesgar', 'Seguir con frase de reparo', 'Evitar hablar', 'Solo escribir'], answer: 1, explain: 'Equivocarse no tiene costo emocional.' }
    ]
  };

  var BUNDLE_ID_ALIASES = { 'F1-lego': 'F1-msi' };
  function resolveBundleId(id) {
    return id ? (BUNDLE_ID_ALIASES[id] || id) : id;
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function bundleIdFromStudent(student, activeBundle) {
    if (activeBundle && activeBundle.id) return resolveBundleId(activeBundle.id);
    if (student && student.jillProgress && student.jillProgress.activeBundle) return resolveBundleId(student.jillProgress.activeBundle);
    return null;
  }

  function rapidDrillTier(student) {
    var rd = ensureRapidDrillStats(student);
    var peak = Math.max(rd.winStreak || 0, rd.bestWinStreak || 0);
    if (peak >= 10) return 'legend';
    if (peak >= 5) return 'gold';
    if (peak >= 3) return 'silver';
    if (peak >= 1) return 'bronze';
    return 'none';
  }

  function tierBadgeHtml(tier) {
    if (tier === 'legend') return '<div class="jill-tier-badge">👑 LEYENDA · interfaz dorada</div>';
    if (tier === 'gold') return '<div class="jill-tier-badge">🏆 ORO · racha en fuego</div>';
    if (tier === 'silver') return '<div class="jill-tier-badge">🥈 PLATA · subiendo nivel</div>';
    if (tier === 'bronze') return '<div class="jill-tier-badge">🥉 BRONCE · primera victoria</div>';
    return '';
  }

  function ensureDrillProfile(student) {
    if (!student) return null;
    if (!student.jillDrillProfile) {
      student.jillDrillProfile = { weakCategories: {}, mastery: {}, lastFailures: [] };
    }
    return student.jillDrillProfile;
  }

  function updateDrillProfile(student, kpiResults) {
    var prof = ensureDrillProfile(student);
    if (!prof) return;
    (kpiResults || []).forEach(function (r) {
      if (!r.category) return;
      if (!prof.mastery[r.category]) prof.mastery[r.category] = { ok: 0, fail: 0 };
      if (r.correct) prof.mastery[r.category].ok++;
      else {
        prof.mastery[r.category].fail++;
        prof.weakCategories[r.category] = (prof.weakCategories[r.category] || 0) + 1;
        prof.lastFailures.unshift({
          category: r.category,
          kpi: r.kpi,
          at: new Date().toISOString()
        });
      }
    });
    prof.lastFailures = (prof.lastFailures || []).slice(0, 24);
  }

  function collectWeakCategories(student) {
    var prof = ensureDrillProfile(student);
    if (!prof) return [];
    var scored = [];
    Object.keys(prof.mastery || {}).forEach(function (cat) {
      var m = prof.mastery[cat];
      var total = (m.ok || 0) + (m.fail || 0);
      if (total < 1) return;
      var failRate = (m.fail || 0) / total;
      if (failRate >= 0.4 || (prof.weakCategories[cat] || 0) >= 2) {
        scored.push({ cat: cat, weight: failRate + (prof.weakCategories[cat] || 0) * 0.15 });
      }
    });
    Object.keys(prof.weakCategories || {}).forEach(function (cat) {
      if (scored.some(function (s) { return s.cat === cat; })) return;
      scored.push({ cat: cat, weight: prof.weakCategories[cat] });
    });
    scored.sort(function (a, b) { return b.weight - a.weight; });
    return scored.map(function (s) { return s.cat; }).slice(0, 6);
  }

  function drillBankQuestions() {
    if (typeof JillDrillBank !== 'undefined' && JillDrillBank.BANK) {
      return JillDrillBank.BANK.slice();
    }
    return CONSTRUCTION_QUESTIONS.concat(COIN_QUESTIONS).concat(PREP_QUESTIONS).concat(ARTICLE_QUESTIONS);
  }

  function categoryLabel(cat) {
    if (typeof JillStructureDrill !== 'undefined' && JillStructureDrill.LABELS && JillStructureDrill.LABELS[cat]) {
      return JillStructureDrill.LABELS[cat];
    }
    if (typeof JillDrillBank !== 'undefined' && JillDrillBank.categoryLabel) {
      return JillDrillBank.categoryLabel(cat);
    }
    var labels = {
      structure: 'Estructura', reverse: 'Derecho / reves', tense_var: 'Tiempos (variacion)', transition: 'Transiciones',
      word_order: 'Orden de palabras', tense: 'Tiempos verbales', negation: 'Negaciones',
      affirmation: 'Afirmaciones', preposition: 'Preposiciones', number: 'Números',
      possessive: 'Posesivos', demonstrative: 'Demostrativos', personal_pronoun: 'Personales',
      reflexive: 'Reflexivos', comparative: 'Comparativos', superlative: 'Superlativos',
      synonym: 'Sinónimos', antonym: 'Antónimos', phrase: 'Frases', expression: 'Expresiones',
      compound: 'Compuestas', coin: 'Pregunta / respuesta'
    };
    return labels[cat] || cat;
  }

  function drillApiBase(opts) {
    opts = opts || {};
    if (opts.demoMode) {
      return (typeof DEMO_BACKEND !== 'undefined' ? DEMO_BACKEND : 'https://alice-by-infinity.onrender.com');
    }
    return '';
  }

  function mergeBrainProfile(student, profile) {
    if (!student || !profile) return;
    if (profile.jillRapidDrill) student.jillRapidDrill = profile.jillRapidDrill;
    if (profile.jillDrillProfile) student.jillDrillProfile = profile.jillDrillProfile;
    if (profile.reinforcement || profile.domain) {
      student.nemesisState = student.nemesisState || {};
      if (profile.reinforcement) student.nemesisState.reinforcement = profile.reinforcement;
      if (profile.domain) student.nemesisState.domain = profile.domain;
    }
    if (profile.weakCategories) {
      student.jillDrillProfile = student.jillDrillProfile || { weakCategories: {}, mastery: {}, lastFailures: [] };
      profile.weakCategories.forEach(function (c) {
        student.jillDrillProfile.weakCategories[c] = student.jillDrillProfile.weakCategories[c] || 1;
      });
    }
  }

  function completeDrillLocal(student, payload, opts) {
    opts = opts || {};
    var perfect = payload.correct === payload.total && payload.total > 0;
    var previewWin = payload.score >= WIN_SCORE_PCT;
    payload.wonRound = previewWin;
    payload.winStreak = previewWin ? ((student.jillRapidDrill && student.jillRapidDrill.winStreak) || 0) + 1 : 0;
    var rec = recordQuiz(student, payload);
    var winMeta = applyWinStreak(student, payload.score, perfect);
    if (payload.score >= 80) {
      if (!student.jillPulse) student.jillPulse = {};
      student.jillPulse.lastScore = payload.score;
      student.jillPulse.lastDate = new Date().toISOString();
      student.jillPulse.passed = true;
      if (student.jillMatrix) student.jillMatrix.pulseQuizPassed = true;
    }
    if (!opts.demoMode && student.id && typeof dbSet === 'function') {
      dbSet('kamuk_students', student.id, student).catch(function () {});
    }
    return {
      xp: rec.xp || 0,
      unlocked: rec.unlocked || [],
      won: winMeta.won,
      jillRapidDrill: student.jillRapidDrill,
      nemesisState: student.nemesisState,
      jillDrillProfile: student.jillDrillProfile,
      quizWeakKpis: student.quizWeakKpis,
      jillGrowth: student.jillGrowth,
      jillPulse: student.jillPulse,
      source: 'local'
    };
  }

  function fetchBrainQuestions(student, activeBundle, count, opts) {
    opts = opts || {};
    var bid = bundleIdFromStudent(student, activeBundle);
    var tier = opts.drillTier || 'foundations';
    if (opts.drillOwner === 'jill') tier = 'foundations';
    var qs = '?count=' + encodeURIComponent(count)
      + '&bundleId=' + encodeURIComponent(bid || '')
      + '&tier=' + encodeURIComponent(tier)
      + '&owner=' + encodeURIComponent(opts.drillOwner || 'jill');
    var localPack = function () {
      return { questions: pickQuestions(student, activeBundle, count, tier, opts), source: 'local' };
    };
    if (opts.demoMode) {
      return fetch(drillApiBase(opts) + '/demo/jill/drill/questions' + qs)
        .then(function (r) { if (!r.ok) throw new Error('brain'); return r.json(); })
        .catch(function () { return localPack(); });
    }
    if (typeof infinityFetch !== 'function') {
      return Promise.resolve(localPack());
    }
    var brain = infinityFetch('/jill/drill/questions' + qs, { headers: typeof authHeaders === 'function' ? authHeaders() : {} })
      .then(function (r) { if (!r.ok) throw new Error('brain'); return r.json(); });
    var timeout = new Promise(function (_, reject) {
      setTimeout(function () { reject(new Error('brain timeout')); }, 6000);
    });
    return Promise.race([brain, timeout]).catch(function () { return localPack(); });
  }

  function submitBrainComplete(student, payload, opts) {
    opts = opts || {};
    if (opts.demoMode) {
      return fetch(drillApiBase(opts) + '/demo/jill/drill/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: payload })
      }).then(function (r) { if (!r.ok) throw new Error('brain'); return r.json(); });
    }
    if (typeof infinityFetch === 'function') {
      return infinityFetch('/jill/drill/complete', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, typeof authHeaders === 'function' ? authHeaders() : {}),
        body: JSON.stringify({ result: payload })
      }).then(function (r) { if (!r.ok) throw new Error('brain'); return r.json(); });
    }
    return Promise.reject(new Error('brain unavailable'));
  }

  function questionsForCategory(cat) {
    if (typeof JillDrillBank !== 'undefined' && JillDrillBank.byCategory) {
      return JillDrillBank.byCategory(cat);
    }
    return [];
  }

  function allTaggedQuestions() {
    var out = CORE.slice();
    drillBankQuestions().forEach(function (q) { out.push(q); });
    FOUNDATIONS_DRILL.forEach(function (q) { out.push(q); });
    Object.keys(BY_BUNDLE).forEach(function (bid) {
      (BY_BUNDLE[bid] || []).forEach(function (q) {
        out.push(Object.assign({ bundleId: bid }, q));
      });
    });
    return out;
  }

  function questionFromQuizBank(kpi) {
    var bank = typeof QUIZ_BANK !== 'undefined' ? QUIZ_BANK : null;
    if (!bank || !bank[kpi]) return null;
    var b = bank[kpi];
    return {
      kpi: kpi,
      q: b.q,
      options: b.options.slice(),
      answer: b.answer,
      explain: b.explain || 'Refuerzo Rapid drill — practicá este tema con Jill.'
    };
  }

  function collectNemesisKpis(student) {
    var ordered = [];
    function add(k) {
      if (!k || ordered.indexOf(k) >= 0) return;
      ordered.push(k);
    }

    var ns = (student && student.nemesisState) || {};
    (ns.reinforcement || []).forEach(add);

    if (typeof NexusPortal !== 'undefined' && NexusPortal.collectFailedKpis) {
      NexusPortal.collectFailedKpis(student).forEach(add);
    } else {
      (student.quizWeakKpis || []).forEach(add);
      (student.quizzes || []).slice(-8).forEach(function (q) {
        (q.kpiResults || []).forEach(function (r) { if (!r.correct) add(r.kpi); });
      });
      (student.nemesisQuizzes || []).slice(-5).forEach(function (q) {
        (q.kpiResults || []).forEach(function (r) { if (!r.correct) add(r.kpi); });
      });
    }

    (student.jillProNemesis || []).slice(-5).forEach(function (q) {
      (q.kpiResults || []).forEach(function (r) { if (!r.correct) add(r.kpi); });
    });

    var lastKt = (student.kpiTracker || []).slice(-1)[0];
    if (lastKt && lastKt.weakest) lastKt.weakest.forEach(function (w) { add(w.id || w); });

    return ordered;
  }

  function kpiLabel(kpi) {
    if (typeof KPI_NAMES !== 'undefined' && KPI_NAMES[kpi]) return KPI_NAMES[kpi];
    return kpi;
  }

  /** Rapid drill = estructura real. Sin siglas ni celdas PR/PS basicas. */
  function isRapidDrillQuestion(item) {
    if (!item || !item.q) return false;
    var q = String(item.q);
    var ql = q.toLowerCase();
    if (/\bsigla\b|\bfórmula\b|\bmsi®?\b|mecánica estructural|método moneda\b/i.test(ql)) return false;
    if (/\bp\s*\+\s*v|\bp\s*\+\s*m|\bto be\s*\+|\bhave\s*\+\s*pp\b/i.test(q)) return false;
    if (/\b(PR|PS|PC|PRP|PPC|MOD)\b/.test(q) && /\b=\b|sigla|fórmula/i.test(ql)) return false;
    if (/Complet[ae]\s*\(\s*(PR|PS|PC|PRP|PPC|MOD)\b/i.test(q)) return false;
    var opts = item.options || [];
    for (var i = 0; i < opts.length; i++) {
      if (/P\s*\+\s*[VMC]|To Be\s*\+|Have\s*\+\s*PP|M\s*\+\s*V/i.test(String(opts[i]))) return false;
    }
    return true;
  }

  function renderNemesisTopics(student) {
    var kpis = collectNemesisKpis(student).slice(0, 6);
    var weakCats = collectWeakCategories(student).slice(0, 5);
    var rd = ensureRapidDrillStats(student);
    var tier = rapidDrillTier(student);
    var streakBar = (rd.winStreak || rd.bestWinStreak)
      ? '<div style="font-size:10px;color:#e9d5ff;text-align:center;margin-bottom:8px;font-weight:700;">🏆 Racha victorias: ' + (rd.winStreak || 0) + (rd.bestWinStreak ? ' · récord ' + rd.bestWinStreak : '') + ' · trofeos ' + (rd.trophies || 0) + '</div>'
      : '';
    var tierBar = tier !== 'none' ? tierBadgeHtml(tier) : '';
    if (!kpis.length && !weakCats.length) {
      return streakBar + tierBar + '<div style="font-size:11px;color:rgba(255,255,255,0.55);text-align:center;margin-bottom:8px;">Rapid drill: estructura, oraciones ida/vuelta, tiempos y transiciones</div>';
    }
    var catHtml = weakCats.length
      ? '<div style="margin-bottom:8px;"><div style="font-size:10px;font-weight:800;letter-spacing:0.08em;color:#fcd34d;margin-bottom:6px;">🎯 ÁREAS A REFORZAR</div>'
        + '<div style="display:flex;flex-wrap:wrap;gap:5px;justify-content:center;">'
        + weakCats.map(function (c) {
          return '<span style="font-size:10px;font-weight:700;background:rgba(239,68,68,0.15);border:1px solid rgba(248,113,113,0.45);color:#fecaca;padding:4px 10px;border-radius:16px;">' + esc(categoryLabel(c)) + '</span>';
        }).join('')
        + '</div></div>'
      : '';
    return streakBar + tierBar + catHtml + '<div style="margin-bottom:10px;">'
      + '<div style="font-size:10px;font-weight:800;letter-spacing:0.08em;color:#fcd34d;margin-bottom:6px;">⚡ TUS TEMAS RAPID DRILL</div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:5px;justify-content:center;">'
      + kpis.map(function (k) {
        return '<span style="font-size:10px;font-weight:700;background:rgba(245,166,35,0.18);border:1px solid rgba(245,166,35,0.45);color:#fde68a;padding:4px 10px;border-radius:16px;">' + esc(kpiLabel(k)) + '</span>';
      }).join('')
      + '</div></div>';
  }

  function pickMatrixQuestions(student, count) {
    if (typeof JillStructureDrill !== 'undefined' && JillStructureDrill.pickQuestions) {
      return JillStructureDrill.pickQuestions(count || QUESTIONS_PER_ROUND);
    }
    if (typeof JillMatrixQuiz === 'undefined') return [];
    return JillMatrixQuiz.pickQuestions(student, count || QUESTIONS_PER_ROUND);
  }

  function pickStructureQuestions(count) {
    if (typeof JillStructureDrill === 'undefined' || !JillStructureDrill.pickQuestions) return [];
    return JillStructureDrill.pickQuestions(count || QUESTIONS_PER_ROUND);
  }

  function pickAdvancedQuestions(student, count) {
    count = count || CHALLENGE_QUESTIONS_PER_ROUND;
    var nemesisKpis = collectNemesisKpis(student);
    var pool = [];
    var seenQ = {};
    function pushQ(item) {
      if (!item || !item.q || seenQ[item.q]) return;
      seenQ[item.q] = true;
      pool.push(item);
    }
    nemesisKpis.forEach(function (kpi) {
      ADVANCED_DRILL.forEach(function (q) { if (q.kpi === kpi) pushQ(q); });
    });
    collectWeakCategories(student).forEach(function (cat) {
      shuffle(ADVANCED_DRILL.filter(function (q) { return q.category === cat; })).slice(0, 2).forEach(pushQ);
    });
    shuffle(ADVANCED_DRILL).forEach(pushQ);
    return shuffle(pool).slice(0, count);
  }

  function pickNemesisQuestions(student, activeBundle, count) {
    count = count || QUESTIONS_PER_ROUND;
    var nemesisKpis = collectNemesisKpis(student);
    var bid = bundleIdFromStudent(student, activeBundle);
    if (bid === 'F0-matrix' || !bid) {
      var structureQs = pickStructureQuestions(count);
      if (structureQs.length >= Math.min(3, count)) return structureQs.slice(0, count);
    }
    var pool = [];
    var seenQ = {};

    function pushQ(item) {
      if (!item || !item.q || seenQ[item.q]) return;
      if (!isRapidDrillQuestion(item)) return;
      seenQ[item.q] = true;
      pool.push(item);
    }

    pickStructureQuestions(Math.min(6, count)).forEach(pushQ);

    var weakCats = collectWeakCategories(student);
    weakCats.forEach(function (cat) {
      shuffle(questionsForCategory(cat)).slice(0, 2).forEach(pushQ);
    });

    nemesisKpis.forEach(function (kpi) {
      var fromBank = questionFromQuizBank(kpi);
      if (fromBank) pushQ(fromBank);
      allTaggedQuestions().forEach(function (q) {
        if (q.kpi === kpi) pushQ(q);
      });
    });

    if (bid) {
      var bqs = BY_BUNDLE[bid] || BY_BUNDLE[resolveBundleId(bid)];
      if (bqs) bqs.forEach(function (q) {
        if (!nemesisKpis.length || nemesisKpis.indexOf(q.kpi) >= 0) pushQ(Object.assign({ bundleId: bid }, q));
      });
    }

    shuffle(drillBankQuestions()).slice(0, 4).forEach(function (q) { pushQ(q); });

    if (pool.length < count) {
      shuffle(allTaggedQuestions()).forEach(pushQ);
    }
    if (pool.length < count && typeof QUIZ_BANK !== 'undefined') {
      shuffle(Object.keys(QUIZ_BANK)).forEach(function (k) {
        if (pool.length >= count) return;
        pushQ(questionFromQuizBank(k));
      });
    }

    pool = shuffle(pool);
    return pool.slice(0, count);
  }

  function pickQuestions(student, activeBundle, count, tier, opts) {
    opts = opts || {};
    // Jill owner can never pull Alice/Nexora Challenge bank
    if (opts.drillOwner === 'jill' || opts.forceFoundations) tier = 'foundations';
    if (tier === 'advanced') return pickAdvancedQuestions(student, count);
    return pickNemesisQuestions(student, activeBundle, count);
  }

  function pickCoinQuestions(count) {
    count = count || 3;
    return shuffle(COIN_QUESTIONS).slice(0, count);
  }

  function updateNemesisState(student, kpiResults, score) {
    if (!student) return;
    if (!student.nemesisState) student.nemesisState = { domain: [], reinforcement: [] };
    if (!student.jillProNemesis) student.jillProNemesis = [];

    var byKpi = {};
    kpiResults.forEach(function (r) {
      if (!byKpi[r.kpi]) byKpi[r.kpi] = { ok: 0, fail: 0 };
      r.correct ? byKpi[r.kpi].ok++ : byKpi[r.kpi].fail++;
    });

    var domain = [];
    var reinforcement = [];
    Object.keys(byKpi).forEach(function (k) {
      var b = byKpi[k];
      var pct = b.ok / (b.ok + b.fail);
      if (pct >= 0.75) domain.push(k);
      else if (pct < 0.5) reinforcement.push(k);
    });

    student.nemesisState.domain = domain;
    student.nemesisState.reinforcement = reinforcement;
    student.nemesisState.lastJillProScore = score;
    student.nemesisState.lastJillProDate = new Date().toISOString();
    student.quizWeakKpis = reinforcement.concat(
      Object.keys(byKpi).filter(function (k) { return reinforcement.indexOf(k) < 0 && domain.indexOf(k) < 0; })
    );
  }

  function recordQuiz(student, result) {
    if (!student) return { xp: 0 };
    var xp = 0;
    var unlocked = [];

    if (typeof JillProgress !== 'undefined') {
      var g = JillProgress.ensureGrowth(student);
      xp = 8 + (result.correct || 0) * 6;
      if (result.correct === result.total && result.total > 0) xp += 22;
      if ((result.streak || 0) >= 3) xp += 10;
      if (result.nemesisMode) xp += 5;
      if (result.wonRound) xp += 15 + (result.winStreak || 0) * 4;
      g.xp = (g.xp || 0) + xp;
      student.jillGrowth = g;
      unlocked = JillProgress.checkBadges(student, {
        quizPerfect: result.correct === result.total && result.total > 0
      }) || [];
    }

    if (!student.jillProNemesis) student.jillProNemesis = [];
    var wrongKpis = (result.kpiResults || []).filter(function (r) { return !r.correct; }).map(function (r) { return r.kpi; });

    student.jillProNemesis.push({
      date: new Date().toISOString(),
      type: 'nemesis-kahoot',
      correct: result.correct,
      total: result.total,
      score: result.score,
      bundleId: result.bundleId || '',
      kpiResults: result.kpiResults || [],
      wrongKpis: wrongKpis,
      nemesisKpis: result.nemesisKpis || []
    });
    if (student.jillProNemesis.length > 25) student.jillProNemesis = student.jillProNemesis.slice(-25);

    if (!student.jillQuizzes) student.jillQuizzes = [];
    student.jillQuizzes.push({
      date: new Date().toISOString(),
      correct: result.correct,
      total: result.total,
      score: result.score,
      bundleId: result.bundleId || '',
      mode: 'jill-pro-nemesis',
      wrongKpis: wrongKpis
    });
    if (student.jillQuizzes.length > 30) student.jillQuizzes = student.jillQuizzes.slice(-30);

    updateNemesisState(student, result.kpiResults || [], result.score);
    updateDrillProfile(student, result.kpiResults || []);

    return { xp: xp, unlocked: unlocked };
  }

  function mount(rootEl, student, activeBundle, onDone, opts) {
    if (!rootEl) return;
    opts = opts || {};
    injectRapidDrillStyles();
    var rdStats = ensureRapidDrillStats(student);
    var tier = opts.drillTier || 'foundations';
    if (opts.drillOwner === 'jill') tier = 'foundations';
    var isAdvanced = tier === 'advanced';
    var isMini = !!opts.mini;
    var moduleId = opts.moduleId || null;
    var tierClass = rapidDrillTier(student);
    if (rootEl.parentElement && !isMini) {
      rootEl.parentElement.classList.add('jill-rapid-tier-' + tierClass);
      if (isAdvanced) rootEl.parentElement.classList.add('jill-rapid-tier-challenge');
    }

    if (!isMini && !opts.skipContinue && typeof InfinityArcadeRun !== 'undefined' && InfinityArcadeRun.hasRun('rapid')) {
      var savedRun = InfinityArcadeRun.loadRun('rapid');
      if (savedRun && savedRun.quiz && savedRun.idx < savedRun.quiz.length) {
        var Run = InfinityArcadeRun;
        rootEl.innerHTML = '<div class="jill-rapid-shell-fit" style="justify-content:center;text-align:center;gap:10px;padding:18px;">'
          + '<div style="font-size:13px;font-weight:900;color:#fde68a;letter-spacing:.08em;">TURNO ABIERTO</div>'
          + '<div style="font-size:22px;font-weight:900;color:#e9d5ff;">' + (savedRun.idx + 1) + '/' + savedRun.quiz.length + ' · racha ' + (savedRun.streak || 0) + '</div>'
          + '<div style="font-size:12px;color:#c4b5fd;margin-bottom:8px;">' + esc(Run.rivalLine('rapid')) + '</div>'
          + '<button type="button" id="jill-rapid-continue" style="background:linear-gradient(135deg,#5b21b6,#7c3aed);border:none;color:#fff;font-weight:900;font-size:16px;padding:14px 22px;border-radius:12px;cursor:pointer;width:100%;max-width:320px;">CONTINUAR</button>'
          + '<button type="button" id="jill-rapid-fresh" style="background:transparent;border:1px solid rgba(255,255,255,.3);color:#e2e8f0;font-weight:800;font-size:13px;padding:10px 18px;border-radius:10px;cursor:pointer;width:100%;max-width:320px;">NUEVO RETO</button>'
          + '</div>';
        var cont = document.getElementById('jill-rapid-continue');
        var fresh = document.getElementById('jill-rapid-fresh');
        if (cont) cont.onclick = function () {
          var resumeOpts = {};
          Object.keys(opts).forEach(function (k) { resumeOpts[k] = opts[k]; });
          resumeOpts.resume = savedRun;
          startDrillRound(rootEl, student, activeBundle, onDone, resumeOpts, savedRun.quiz, collectNemesisKpis(student), MODE_LABEL, savedRun.quiz.length, MODE_LABEL);
        };
        if (fresh) fresh.onclick = function () {
          InfinityArcadeRun.clearRun('rapid');
          opts.skipContinue = true;
          mount(rootEl, student, activeBundle, onDone, opts);
        };
        return;
      }
    }

    var nemesisKpis = isMini ? [] : collectNemesisKpis(student);
    var qCount = opts.questionCount
      || (isMini ? 5 : (isAdvanced ? CHALLENGE_QUESTIONS_PER_ROUND : QUESTIONS_PER_ROUND));
    var modeLabel = isMini
      ? ('Mini Kaboom' + (moduleId ? ' · ' + moduleId : ''))
      : (isAdvanced ? 'Challenge drill (Alice)' : MODE_LABEL);
    var brandLine = isMini
      ? 'Mini Kaboom — gate del módulo (llama → polvorín)'
      : (BRAND + ' · ' + modeLabel + (isAdvanced ? ' — linkers, STAR, presión (Alice)' : ' — oraciones, tiempos, estructura, preposiciones'));
    var mountOpts = opts;
    mountOpts.drillTier = tier;
    if (isAdvanced && !isMini) mountOpts.timerSec = CHALLENGE_TIMER_SEC;
    if (isMini && !mountOpts.timerSec) mountOpts.timerSec = 30;

    // Module bank: skip brain fetch — local catalog is source of truth
    if (isMini && moduleId && typeof JillFoundationsModules !== 'undefined') {
      var ensure = JillFoundationsModules.load ? JillFoundationsModules.load() : Promise.resolve();
      Promise.resolve(ensure).then(function () {
        var mod = JillFoundationsModules.byId(moduleId);
        if (mod && mod.mini) {
          qCount = opts.questionCount || mod.mini.questions || qCount;
          if (!opts.timerSec) mountOpts.timerSec = mod.mini.timerSec || 30;
          mountOpts.passPct = mod.mini.passPct || 80;
        }
        var qs = JillFoundationsModules.buildKaboomQuestions(moduleId, qCount);
        if (!qs.length) {
          rootEl.innerHTML = '<div style="text-align:center;padding:16px;color:#fecaca;font-size:13px;">Sin banco Kaboom para ' + String(moduleId) + '.</div>';
          return;
        }
        startDrillRound(rootEl, student, activeBundle, onDone, mountOpts, qs, nemesisKpis, brandLine, qCount, modeLabel);
      });
      return;
    }

    rootEl.innerHTML = '<div style="text-align:center;padding:24px;color:#e9d5ff;font-size:13px;">'
      + '<div style="font-size:28px;margin-bottom:8px;">' + (isAdvanced ? '⚔️' : '🧠') + '</div>'
      + 'Cargando preguntas del cerebro…</div>';

    fetchBrainQuestions(student, activeBundle, qCount, mountOpts).then(function (data) {
      if (data && data.profile) mergeBrainProfile(student, data.profile);
      var qs = (data && data.questions && data.questions.length) ? data.questions : pickQuestions(student, activeBundle, qCount, tier, mountOpts);
      startDrillRound(rootEl, student, activeBundle, onDone, mountOpts, qs, nemesisKpis, brandLine, qCount, modeLabel);
    }).catch(function () {
      var qs = pickQuestions(student, activeBundle, qCount, tier, mountOpts);
      if (!qs.length) {
        rootEl.innerHTML = '<div style="text-align:center;padding:20px;color:#fecaca;font-size:13px;">'
          + 'No se pudo conectar al cerebro Jill. Verificá sesión o redeploy del backend.</div>';
        return;
      }
      startDrillRound(rootEl, student, activeBundle, onDone, mountOpts, qs, nemesisKpis, brandLine, qCount, modeLabel);
    });
  }

  function startDrillRound(rootEl, student, activeBundle, onDone, opts, quiz, nemesisKpis, brandLine, qCount, modeLabel) {
    if (!quiz.length) {
      rootEl.innerHTML = '<div style="text-align:center;padding:1rem;color:#fde68a;">Sin preguntas — practicá con Jill y volvé.</div>';
      return;
    }

    opts = opts || {};
    var isMini = !!opts.mini;
    var moduleId = opts.moduleId || null;
    var passPct = typeof opts.passPct === 'number' ? opts.passPct : WIN_SCORE_PCT;
    var rdStats = ensureRapidDrillStats(student);
    var roundTimer = opts.timerSec || TIMER_SEC;
    modeLabel = modeLabel || MODE_LABEL;

    var resume = opts.resume || null;
    var state = {
      idx: resume ? resume.idx || 0 : 0,
      correct: resume ? resume.correct || 0 : 0,
      streak: resume ? resume.streak || 0 : 0,
      bestStreak: resume ? resume.bestStreak || 0 : 0,
      answered: false,
      timer: null,
      timeLeft: resume && resume.timeLeft ? resume.timeLeft : roundTimer,
      timerSec: resume && resume.timerSec ? resume.timerSec : roundTimer,
      quiz: quiz,
      bundleId: bundleIdFromStudent(student, activeBundle),
      nemesisKpis: nemesisKpis,
      kpiResults: resume && resume.kpiResults ? resume.kpiResults : []
    };

    function persistRapid() {
      if (isMini || typeof InfinityArcadeRun === 'undefined') return;
      InfinityArcadeRun.saveRun('rapid', {
        idx: state.idx,
        correct: state.correct,
        streak: state.streak,
        bestStreak: state.bestStreak,
        timeLeft: state.timeLeft,
        timerSec: state.timerSec,
        quiz: state.quiz,
        kpiResults: state.kpiResults
      });
    }

    function clearTimer() {
      if (state.timer) { clearInterval(state.timer); state.timer = null; }
    }

    function renderGrid() {
      var q = state.quiz[state.idx];
      var totalSec = state.timerSec || TIMER_SEC;
      var pct = Math.round((state.timeLeft / totalSec) * 100);
      var timerColor = state.timeLeft <= 5 ? '#fca5a5' : '#c4b5fd';
      var tag = q.kpi
        ? '<span style="font-size:9px;background:rgba(245,166,35,0.25);color:#fde68a;padding:2px 8px;border-radius:10px;margin-bottom:8px;display:inline-block;">'
          + (isMini ? ('Mini · ' + esc(moduleId || 'gate')) : ('Drill · ' + esc(kpiLabel(q.kpi))))
          + '</span>'
        : '';
      return '<div id="jill-kaboom-inner" style="animation:jillKaboomIn .35s ease;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:12px;font-weight:800;color:#e9d5ff;">'
        + '<span>⚡ ' + modeLabel + ' · ' + (state.idx + 1) + '/' + state.quiz.length + '</span>'
        + '<span title="Racha de aciertos">🔥 ' + state.streak + '</span>'
        + '<span>✓ ' + state.correct + '</span>'
        + (isMini ? '' : '<span title="Racha de victorias">🏆 ' + (rdStats.winStreak || 0) + '</span>')
        + '</div>'
        + renderPressureScene(state)
        + '<div id="jill-kaboom-timer" style="height:6px;background:rgba(0,0,0,0.3);border-radius:6px;margin-bottom:14px;overflow:hidden;">'
        + '<div id="jill-kaboom-timer-fill" style="height:100%;width:' + pct + '%;background:' + timerColor + ';transition:width .9s linear;border-radius:6px;"></div></div>'
        + '<div style="text-align:center;">' + tag + '</div>'
        + '<div class="jill-qbox" style="background:rgba(255,255,255,0.96);color:#1e1b4b;border-radius:16px;padding:16px 18px;font-size:16px;font-weight:800;line-height:1.45;margin-bottom:14px;text-align:center;min-height:72px;display:flex;align-items:center;justify-content:center;">'
        + esc(q.q)
        + '</div>'
        + '<div id="jill-kaboom-opts" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
        + q.options.map(function (opt, i) {
          return '<button type="button" class="jill-kaboom-opt" data-idx="' + i + '" style="'
            + 'background:' + KABOOM[i].bg + ';color:white;border:none;border-radius:14px;padding:16px 12px;'
            + 'font-size:14px;font-weight:800;cursor:pointer;min-height:72px;display:flex;align-items:center;gap:10px;'
            + 'box-shadow:0 4px 0 rgba(0,0,0,0.22);transition:transform .12s;">'
            + '<span style="font-size:20px;opacity:0.9;">' + KABOOM[i].shape + '</span>'
            + '<span style="text-align:left;line-height:1.3;">' + esc(opt) + '</span>'
            + '</button>';
        }).join('')
        + '</div>'
        + (opts.fitScreen ? '' : ('<div id="jill-kaboom-exit-row" style="margin-top:12px;text-align:center;">'
        + '<button type="button" onclick="' + (isMini ? 'jillCloseMiniKaboom()' : 'portalCloseRapidDrill()') + '" style="background:transparent;border:1px solid rgba(255,255,255,0.25);color:rgba(255,255,255,0.7);font-size:11px;padding:6px 14px;border-radius:8px;cursor:pointer;">Salir</button>'
        + '</div>'))
        + '</div>';
    }

    function renderFeedback(wasCorrect, mode) {
      var q = state.quiz[state.idx];
      var nextLabel = state.idx + 1 < state.quiz.length ? 'Seguir →' : (isMini ? 'Ver resultado' : 'Ver trofeos');
      var head = mode === 'timeout'
        ? '<div style="font-size:40px;margin-bottom:8px;">⏱️</div><div style="font-size:12px;color:#fca5a5;font-weight:800;margin-bottom:8px;">Tiempo — seguí practicando este tema</div>'
        : (wasCorrect
          ? renderMiniTrophy(state.streak)
          : '<div style="font-size:28px;margin-bottom:8px;">💥</div><div style="font-size:12px;color:#fca5a5;font-weight:800;margin-bottom:8px;">' + (typeof InfinityArcadeRun !== 'undefined' ? InfinityArcadeRun.mock() : 'Te comió la duda.') + '</div>');
      var title = mode === 'timeout'
        ? ((typeof InfinityArcadeRun !== 'undefined' ? InfinityArcadeRun.timeout() : 'Se te fue el turno.') + ' · ' + esc(q.options[q.answer]))
        : (wasCorrect
          ? (typeof InfinityArcadeRun !== 'undefined' ? InfinityArcadeRun.hit() : 'Limpio.')
          : ((typeof InfinityArcadeRun !== 'undefined' ? InfinityArcadeRun.mock() : 'Eso no entra.') + ' · ' + esc(q.options[q.answer])));
      var titleColor = wasCorrect && mode !== 'timeout' ? '#86EFAC' : '#FCD34D';
      return '<div id="jill-kaboom-inner" style="animation:jillKaboomIn .35s ease;' + (opts.fitScreen ? '' : 'padding-bottom:calc(28px + env(safe-area-inset-bottom,0px));') + '">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-size:12px;font-weight:800;color:#e9d5ff;">'
        + '<span>⚡ ' + modeLabel + ' · ' + (state.idx + 1) + '/' + state.quiz.length + '</span>'
        + '<span>🔥 ' + state.streak + '</span>'
        + '<span>✓ ' + state.correct + '</span>'
        + '</div>'
        + '<div class="jill-qbox" style="background:rgba(255,255,255,0.96);color:#1e1b4b;border-radius:16px;padding:14px 16px;font-size:15px;font-weight:800;line-height:1.45;margin-bottom:14px;text-align:center;">'
        + esc(q.q)
        + '</div>'
        + '<div style="text-align:center;margin-bottom:12px;">'
        + '<div style="display:inline-flex;align-items:center;gap:8px;background:rgba(134,239,172,0.18);border:1px solid rgba(134,239,172,0.55);color:#bbf7d0;font-weight:800;font-size:14px;padding:10px 14px;border-radius:12px;max-width:100%;">'
        + '<span>✓</span><span style="text-align:left;line-height:1.35;">' + esc(q.options[q.answer]) + '</span>'
        + '</div></div>'
        + '<div class="jill-rapid-feedback-copy" style="text-align:center;padding:4px 0 8px;flex:0 0 auto;">'
        + head
        + '<div style="font-size:18px;font-weight:900;color:' + titleColor + ';margin-bottom:8px;">' + title + '</div>'
        + (q.explain ? '<div style="font-size:13px;color:rgba(255,255,255,0.85);line-height:1.6;margin-bottom:16px;">' + esc(q.explain) + '</div>' : '')
        + '<button type="button" id="jill-kaboom-next" style="background:linear-gradient(135deg,#5b21b6,#7c3aed);border:none;color:white;font-weight:800;font-size:16px;padding:14px 28px;border-radius:12px;cursor:pointer;width:100%;max-width:360px;">'
        + nextLabel
        + '</button>'
        + (opts.fitScreen ? '' : ('<div style="margin-top:12px;">'
        + '<button type="button" onclick="' + (isMini ? 'jillCloseMiniKaboom()' : 'portalCloseRapidDrill()') + '" style="background:transparent;border:1px solid rgba(255,255,255,0.25);color:rgba(255,255,255,0.7);font-size:11px;padding:6px 14px;border-radius:8px;cursor:pointer;">Salir</button>'
        + '</div>'))
        + '</div>'
        + '<div id="jill-rapid-fx" aria-hidden="true"></div>'
        + '</div>';
    }

    function bindNextButton() {
      var nextBtn = document.getElementById('jill-kaboom-next');
      if (!nextBtn) return;
      nextBtn.addEventListener('click', function () {
        clearRapidFx();
        state.idx++;
        state.answered = false;
        if (state.idx >= state.quiz.length) renderResults();
        else showQuestion();
      });
      if (!opts.fitScreen) {
        try {
          nextBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        } catch (e) { /* ignore */ }
      }
    }

    function showAnswerFeedback(wasCorrect, picked, mode) {
      clearTimer();
      var q = state.quiz[state.idx];
      state.kpiResults.push({ kpi: q.kpi || 'k10', correct: !!wasCorrect, category: q.category || 'tense' });
      if (wasCorrect) {
        state.correct++;
        state.streak++;
        state.bestStreak = Math.max(state.bestStreak, state.streak);
        if (typeof CelebrationSfx !== 'undefined') {
          CelebrationSfx.correct();
          if (state.streak >= 3) CelebrationSfx.streak(state.streak);
        }
      } else {
        state.streak = 0;
        if (typeof CelebrationSfx !== 'undefined') CelebrationSfx.fail();
      }
      // Full replace: no option grid + sticky overlay fighting for space
      rootEl.innerHTML = renderFeedback(wasCorrect, mode || (wasCorrect ? 'ok' : 'miss'));
      playRapidDrillFx(wasCorrect && mode !== 'timeout' ? 'hit' : 'miss');
      persistRapid();
      bindNextButton();
      if (!opts.fitScreen) {
        try {
          var top = rootEl.querySelector('#jill-kaboom-inner');
          if (top) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e) { /* ignore */ }
      }
    }

    function renderResults() {
      clearRapidFx();
      clearTimer();
      if (!isMini && typeof InfinityArcadeRun !== 'undefined') InfinityArcadeRun.clearRun('rapid');
      var total = state.quiz.length;
      var score = Math.round((state.correct / total) * 100);
      var perfect = state.correct === total && total > 0;
      var passed = score >= passPct;

      if (isMini) {
        var result = {
          mini: true,
          moduleId: moduleId,
          correct: state.correct,
          total: total,
          score: score,
          passed: passed,
          passPct: passPct
        };
        if (typeof opts.onResult === 'function') {
          try { opts.onResult(result); } catch (e) { /* ignore */ }
        }
        rootEl.innerHTML = '<div style="text-align:center;padding:18px;color:#e9d5ff;">'
          + '<div style="font-size:42px;margin-bottom:8px;">' + (passed ? '✅' : '💥') + '</div>'
          + '<div style="font-size:18px;font-weight:900;color:' + (passed ? '#86EFAC' : '#FCD34D') + ';margin-bottom:8px;">'
          + (passed ? ('Módulo ' + esc(moduleId || '') + ' — ¡pasaste!') : ('Módulo ' + esc(moduleId || '') + ' — a reforzar'))
          + '</div>'
          + '<div style="font-size:14px;margin-bottom:14px;">' + state.correct + '/' + total + ' · ' + score + '% (meta ' + passPct + '%)</div>'
          + '<button type="button" onclick="jillCloseMiniKaboom(true)" style="background:linear-gradient(135deg,#5b21b6,#7c3aed);border:none;color:white;font-weight:800;font-size:14px;padding:12px 22px;border-radius:12px;cursor:pointer;">Volver a Jill</button>'
          + '</div>';
        if (typeof onDone === 'function') onDone(result);
        return;
      }

      var previewWin = score >= WIN_SCORE_PCT;
      var payload = {
        correct: state.correct,
        total: total,
        score: score,
        streak: state.bestStreak,
        bundleId: state.bundleId,
        kpiResults: state.kpiResults,
        nemesisKpis: state.nemesisKpis,
        wonRound: previewWin,
        winStreak: previewWin ? ((student.jillRapidDrill && student.jillRapidDrill.winStreak) || 0) + 1 : 0
      };

      rootEl.innerHTML = '<div style="text-align:center;padding:20px;color:#e9d5ff;">🧠 Guardando en el cerebro…</div>';

      submitBrainComplete(student, payload, opts).then(function (brain) {
        paintBrainResults(brain, score, perfect);
      }).catch(function () {
        paintBrainResults(completeDrillLocal(student, payload, opts), score, perfect);
      });
    }

    function paintBrainResults(brain, score, perfect) {
        var rec = { xp: brain.xp || 0, unlocked: brain.unlocked || [] };
        if (brain.jillRapidDrill) student.jillRapidDrill = brain.jillRapidDrill;
        if (brain.nemesisState) student.nemesisState = brain.nemesisState;
        if (brain.jillDrillProfile) student.jillDrillProfile = brain.jillDrillProfile;
        if (brain.quizWeakKpis) student.quizWeakKpis = brain.quizWeakKpis;
        if (brain.jillGrowth) student.jillGrowth = brain.jillGrowth;
        if (brain.jillPulse) student.jillPulse = brain.jillPulse;
        if (brain.infinityVictory) student.infinityVictory = brain.infinityVictory;
        if (typeof InfinityVictory !== 'undefined') InfinityVictory.invalidateCache();
        if (typeof JillProgress !== 'undefined' && !opts.demoMode && !rec.unlocked.length) {
          rec.unlocked = JillProgress.checkBadges(student, { quizPerfect: perfect }) || [];
        }
        var winMeta = {
          won: !!brain.won,
          rd: student.jillRapidDrill || ensureRapidDrillStats(student)
        };
        var trophy = trophyForScore(score, perfect);
        paintResultsUI(winMeta, rec, trophy, score, perfect);
    }

    function paintResultsUI(winMeta, rec, trophy, score, perfect) {
      if (typeof CelebrationSfx !== 'undefined') {
        if (winMeta.won) CelebrationSfx.victory();
        else if (rec.xp) CelebrationSfx.xp();
        if (rec.unlocked && rec.unlocked.length) CelebrationSfx.onBadgesUnlocked(rec.unlocked);
      }
      if (typeof showToast === 'function' && rec.xp) {
        showToast('+' + rec.xp + ' XP · ' + BRAND);
      }
      if (winMeta.won && typeof showToast === 'function') {
        setTimeout(function () {
          showToast('🏆 ' + trophy.title + ' · racha ' + winMeta.rd.winStreak);
        }, winMeta.won ? 450 : 0);
      }
      if (rec.unlocked && rec.unlocked.length && typeof JillProgress !== 'undefined' && typeof showToast === 'function') {
        var badgeMsg = JillProgress.renderNewBadgeToast(rec.unlocked);
        if (badgeMsg) setTimeout(function () { showToast(badgeMsg); }, 700);
      }

      if (!isMini && typeof InfinityArcadeRun !== 'undefined') {
        InfinityArcadeRun.recordFinish('rapid', score, winMeta.won);
      }
      var reinforce = (student.nemesisState && student.nemesisState.reinforcement) || [];
      var domain = (student.nemesisState && student.nemesisState.domain) || [];
      var streakLine = winMeta.won
        ? '<div class="jill-streak-pill" style="margin:10px auto 12px;">🏆 Victoria · racha ' + winMeta.rd.winStreak + (winMeta.rd.bestWinStreak > winMeta.rd.winStreak ? ' · récord ' + winMeta.rd.bestWinStreak : '') + '</div>'
        : '<div style="font-size:11px;color:#fca5a5;margin:8px 0;">Racha a cero. El piso no espera.</div>';

      rootEl.innerHTML = (winMeta.won ? renderConfettiBurst() : '')
        + '<div style="text-align:center;padding:12px 8px;">'
        + '<div class="jill-trophy-burst">' + trophy.icon + '</div>'
        + '<div style="font-size:13px;font-weight:900;color:#fcd34d;letter-spacing:.08em;margin-bottom:4px;">' + esc(trophy.title) + '</div>'
        + '<div style="font-size:11px;color:rgba(255,255,255,0.75);margin-bottom:8px;">' + esc(trophy.sub) + '</div>'
        + '<div style="font-size:11px;font-weight:800;color:#c4b5fd;letter-spacing:0.12em;margin-bottom:4px;">' + BRAND + '</div>'
        + '<div style="font-size:26px;font-weight:900;color:#e9d5ff;">' + state.correct + '/' + state.quiz.length + '</div>'
        + '<div style="font-size:14px;color:#ddd6fe;margin-bottom:6px;">' + score + '% · racha aciertos ' + state.bestStreak + '</div>'
        + streakLine
        + '<div style="font-size:11px;color:rgba(255,255,255,0.65);margin-bottom:10px;">Trofeos acumulados: ' + (winMeta.rd.trophies || 0) + ' · victorias: ' + (winMeta.rd.totalWins || 0) + '</div>'
        + (domain.length ? '<div style="font-size:11px;color:#86EFAC;margin-bottom:4px;">Dominio: ' + domain.map(kpiLabel).join(', ') + '</div>' : '')
        + (reinforce.length ? '<div style="font-size:11px;color:#fcd34d;margin-bottom:10px;">Sigue en refuerzo: ' + reinforce.map(kpiLabel).join(', ') + '</div>' : '')
        + '<div style="font-size:12px;color:rgba(255,255,255,0.75);margin-bottom:16px;">+' + (rec.xp || 0) + ' XP · perfil guardado en el cerebro (cascada a tutores)</div>'
        + '<button type="button" onclick="portalCloseRapidDrill(true)" style="background:linear-gradient(135deg,#5b21b6,#7c3aed);border:none;color:white;font-weight:800;font-size:15px;padding:12px 28px;border-radius:12px;cursor:pointer;margin-right:8px;">Listo</button>'
        + '<button type="button" onclick="portalOpenRapidDrill()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(167,139,250,0.5);color:#e9d5ff;font-weight:700;font-size:13px;padding:12px 20px;border-radius:12px;cursor:pointer;">Otra ronda Rapid drill</button>'
        + '</div>';
      if (typeof onDone === 'function') onDone({ correct: state.correct, total: state.quiz.length, score: score, xp: rec.xp });
    }

    function afterAnswer(wasCorrect, picked) {
      showAnswerFeedback(wasCorrect, picked);
    }

    function bindOptions() {
      rootEl.querySelectorAll('.jill-kaboom-opt').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (state.answered) return;
          state.answered = true;
          clearTimer();
          var picked = parseInt(btn.getAttribute('data-idx'), 10);
          var q = state.quiz[state.idx];
          afterAnswer(picked === q.answer, picked);
        });
      });
    }

    var armFullTimer = !resume;
    function startTimer() {
      clearTimer();
      var totalSec = state.timerSec || TIMER_SEC;
      if (armFullTimer) state.timeLeft = totalSec;
      armFullTimer = true;
      state.timer = setInterval(function () {
        state.timeLeft--;
        var fill = document.getElementById('jill-kaboom-timer-fill');
        if (fill) {
          var pct = Math.max(0, Math.round((state.timeLeft / totalSec) * 100));
          fill.style.width = pct + '%';
          fill.style.background = state.timeLeft <= 5 ? '#fca5a5' : '#c4b5fd';
        }
        updatePressureDom(state);
        if (state.timeLeft <= 0 && !state.answered) {
          state.answered = true;
          showAnswerFeedback(false, null, 'timeout');
        }
      }, 1000);
    }

    function showQuestion() {
      clearRapidFx();
      rootEl.innerHTML = renderGrid();
      bindOptions();
      startTimer();
      persistRapid();
    }

    var fit = !!opts.fitScreen;
    var hud = '';
    if (fit) {
      var tierNow = rapidDrillTier(student);
      hud = '<div class="jill-rapid-fit-hud">'
        + (tierNow !== 'none' ? tierBadgeHtml(tierNow) : '')
        + '<span>🏆 ' + (rdStats.winStreak || 0) + ' · rec ' + (rdStats.bestWinStreak || 0) + ' · 🏅 ' + (rdStats.trophies || 0) + '</span>'
        + '</div>';
    }
    rootEl.innerHTML = fit
      ? ('<div class="jill-rapid-shell jill-rapid-shell-fit">' + hud + '<div id="jill-kaboom-stage"></div></div>')
      : ('<div class="jill-rapid-shell" style="background:rgba(88,28,135,0.35);border:1px solid rgba(167,139,250,0.45);border-radius:16px;padding:14px;">'
        + '<div style="text-align:center;font-size:12px;color:#e9d5ff;font-weight:700;margin-bottom:6px;">' + esc(brandLine) + '</div>'
        + '<div style="text-align:center;font-size:10px;color:#fcd34d;margin-bottom:10px;font-weight:700;">' + (typeof InfinityArcadeRun !== 'undefined' ? InfinityArcadeRun.challenge() : 'No es examen. Es el piso.') + '</div>'
        + '<div id="jill-kaboom-stage"></div></div>');
    var stage = document.getElementById('jill-kaboom-stage');
    preloadRapidFx();
    rootEl = stage;
    showQuestion();
  }

  global.JillQuiz = {
    BRAND: BRAND,
    MODE_LABEL: MODE_LABEL,
    pickQuestions: pickQuestions,
    pickAdvancedQuestions: pickAdvancedQuestions,
    pickNemesisQuestions: pickNemesisQuestions,
    pickCoinQuestions: pickCoinQuestions,
    collectNemesisKpis: collectNemesisKpis,
    renderNemesisTopics: renderNemesisTopics,
    mount: mount,
    recordQuiz: recordQuiz,
    QUESTIONS_PER_ROUND: QUESTIONS_PER_ROUND,
    FOUNDATIONS_DRILL: FOUNDATIONS_DRILL,
    mountMiniModule: function (rootEl, student, moduleId, onResult) {
      return mount(rootEl, student, null, null, {
        mini: true,
        moduleId: moduleId,
        onResult: onResult || null
      });
    }
  };
})(typeof window !== 'undefined' ? window : this);
