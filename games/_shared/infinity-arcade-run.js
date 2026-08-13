/**
 * Infinity arcade — adult floor tone + save/continue + rival meta.
 * No kínder. The English is the control; this is pressure, not a worksheet.
 */
(function (global) {
  'use strict';

  var PREFIX = 'inf-run-';
  var META_KEY = 'inf-arcade-meta';
  var FLOOR_KEY = 'inf-arcade-floor-on';
  var MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  var floorOn = false;
  var floorBoard = [];
  var floorMe = '';

  var MOCK = [
    'Eso no entra en un ticket.',
    'El cliente ya colgó.',
    'Filler. Otra vez.',
    'Te escuché dudar.',
    'Así no se cierra el caso.',
    'Muletilla. Fuera.',
    'Eso es ruido, no inglés.',
    'El piso no espera.'
  ];
  var HIT = ['Limpio.', 'Eso sí entra.', 'Sin filler.', 'Seguí.', 'Ahí está.', 'Corto y cerrado.'];
  var CHALLENGE = [
    'A ver si aguantás el turno.',
    'No es examen. Es el piso.',
    'First blood. Sin muletilla.',
    'El rival ya anotó. Movete.',
    'Presión. Ahora.'
  ];
  var TIMEOUT = [
    'Se te fue el turno.',
    'El reloj no perdona.',
    'Dudaste. Perdiste.'
  ];
  var WIN = ['Cerraste el turno.', 'El rival se calló.', 'Piso limpio.'];
  var LOSE = ['El piso te comió.', 'Volvé. Nadie espera.', 'Te ganó la duda.'];

  function pick(arr) {
    if (!arr || !arr.length) return '';
    return arr[(Math.random() * arr.length) | 0];
  }

  function safeParse(raw) {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function loadMeta() {
    var m = safeParse(typeof localStorage !== 'undefined' && localStorage.getItem(META_KEY));
    if (!m || typeof m !== 'object') m = {};
    ['knight', 'thief', 'raiders', 'rapid'].forEach(function (g) {
      if (!m[g]) m[g] = { best: 0, streak: 0, lastScore: 0, wins: 0 };
    });
    return m;
  }

  function saveMeta(game, patch) {
    var m = loadMeta();
    if (!m[game]) m[game] = { best: 0, streak: 0, lastScore: 0, wins: 0 };
    Object.keys(patch || {}).forEach(function (k) {
      m[game][k] = patch[k];
    });
    try {
      localStorage.setItem(META_KEY, JSON.stringify(m));
    } catch (e) {}
    return m[game];
  }

  function isFloorOn() {
    if (typeof localStorage === 'undefined') return !!floorOn;
    try {
      floorOn = localStorage.getItem(FLOOR_KEY) === '1';
    } catch (e) {}
    return !!floorOn;
  }

  function setFloorOn(on) {
    floorOn = !!on;
    try {
      localStorage.setItem(FLOOR_KEY, floorOn ? '1' : '0');
    } catch (e) {}
    pingParent({ type: 'inf-arcade-floor-opt', on: floorOn });
    return floorOn;
  }

  function setFloorBoard(rows, meId) {
    floorBoard = Array.isArray(rows) ? rows : [];
    if (meId) floorMe = String(meId);
  }

  function firstName(raw) {
    var n = String(raw || '').trim().split(/\s+/)[0];
    return n || 'Alguien';
  }

  function scoreOf(row, game) {
    if (!row || !row.games || !row.games[game]) return 0;
    return Number(row.games[game].best || 0) || 0;
  }

  function ranked(game) {
    return floorBoard
      .slice()
      .map(function (r) {
        return { id: String(r.id || ''), name: firstName(r.name), score: scoreOf(r, game) };
      })
      .filter(function (r) {
        return r.score > 0;
      })
      .sort(function (a, b) {
        return b.score - a.score;
      });
  }

  function floorRival(game) {
    if (!isFloorOn()) return '';
    var list = ranked(game);
    if (!list.length) return 'Piso abierto. Nadie anotó todavía.';
    var me = String(floorMe || '');
    var mine = 0;
    var myRank = -1;
    for (var i = 0; i < list.length; i++) {
      if (me && list[i].id === me) {
        mine = list[i].score;
        myRank = i + 1;
      }
    }
    var ahead = null;
    for (var j = list.length - 1; j >= 0; j--) {
      if (list[j].score > mine && (!me || list[j].id !== me)) ahead = list[j];
    }
    if (ahead) {
      var gap = ahead.score - mine;
      return ahead.name + ' te lleva ' + gap + (myRank > 0 ? ' · vas #' + myRank : '');
    }
    if (myRank === 1) return 'Vas primero. Que te alcancen.';
    return list[0].name + ' manda el piso · ' + list[0].score;
  }

  function pingParent(payload) {
    try {
      if (typeof window === 'undefined' || window.parent === window) return;
      window.parent.postMessage(payload, '*');
    } catch (e) {}
  }

  function recordFinish(game, score, won) {
    var cur = loadMeta()[game] || {};
    var best = Math.max(cur.best || 0, score || 0);
    var streak = won ? (cur.streak || 0) + 1 : 0;
    var saved = saveMeta(game, {
      best: best,
      lastScore: score || 0,
      streak: streak,
      wins: (cur.wins || 0) + (won ? 1 : 0)
    });
    if (isFloorOn()) {
      var payload = {
        type: 'inf-arcade-finish',
        game: game,
        score: score || 0,
        best: best,
        won: !!won,
        streak: streak
      };
      pingParent(payload);
      if (typeof global.onInfinityArcadeFinish === 'function') {
        try {
          global.onInfinityArcadeFinish(payload);
        } catch (e) {}
      }
    }
    return saved;
  }

  function saveRun(game, payload) {
    try {
      localStorage.setItem(
        PREFIX + game,
        JSON.stringify({ v: 1, t: Date.now(), game: game, data: payload || {} })
      );
    } catch (e) {}
  }

  function loadRun(game) {
    var o = safeParse(typeof localStorage !== 'undefined' && localStorage.getItem(PREFIX + game));
    if (!o || !o.data) return null;
    if (o.t && Date.now() - o.t > MAX_AGE_MS) {
      clearRun(game);
      return null;
    }
    return o.data;
  }

  function clearRun(game) {
    try {
      localStorage.removeItem(PREFIX + game);
    } catch (e) {}
  }

  function hasRun(game) {
    return !!loadRun(game);
  }

  function rivalLine(game) {
    var floor = floorRival(game);
    if (floor) return floor;
    var g = loadMeta()[game] || {};
    if (g.lastScore) return 'A VENCER · ' + g.lastScore + (g.streak ? ' · racha ' + g.streak : '');
    if (g.best) return 'RÉCORD · ' + g.best;
    return pick(CHALLENGE);
  }

  global.InfinityArcadeRun = {
    pick: pick,
    mock: function () {
      return pick(MOCK);
    },
    hit: function () {
      return pick(HIT);
    },
    challenge: function () {
      return pick(CHALLENGE);
    },
    timeout: function () {
      return pick(TIMEOUT);
    },
    win: function () {
      return pick(WIN);
    },
    lose: function () {
      return pick(LOSE);
    },
    saveRun: saveRun,
    loadRun: loadRun,
    clearRun: clearRun,
    hasRun: hasRun,
    loadMeta: loadMeta,
    saveMeta: saveMeta,
    recordFinish: recordFinish,
    rivalLine: rivalLine,
    isFloorOn: isFloorOn,
    setFloorOn: setFloorOn,
    setFloorBoard: setFloorBoard,
    floorRival: floorRival,
    ranked: ranked
  };

  if (typeof window !== 'undefined') {
    isFloorOn();
    window.addEventListener('message', function (ev) {
      var d = ev && ev.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'inf-arcade-floor') {
        if (typeof d.on === 'boolean') {
          floorOn = d.on;
          try {
            localStorage.setItem(FLOOR_KEY, floorOn ? '1' : '0');
          } catch (e) {}
        }
        if (d.board) setFloorBoard(d.board, d.me);
      }
    });
    pingParent({ type: 'inf-arcade-hello' });
  }
})(typeof window !== 'undefined' ? window : globalThis);
