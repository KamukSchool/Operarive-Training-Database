/**
 * Kamuk Companion Hub — same arcade add-on as Infinity (Knight/Thief/Raiders/Rapid).
 * Behavior twin; Kamuk blue chrome. Ranking is wired in the portal to kamuk_sessions only.
 */
(function (global) {
  'use strict';

  var MANTRA = 'LINK · IDEA · LINK';
  var VER = '20260813kamuk1';
  var stageIdx = 0;
  var stageTimer = null;
  var stagePauseUntil = 0;

  /** Knight + Dark Thief + Tense Raiders + Rapid Drill */
  var GAMES = [
    {
      id: 'knight',
      kind: 'knight',
      title: "KNIGHT'S QUEST",
      sub: 'Linkers bajo fuego. El filler te mata.',
      badge: 'hot',
      badgeLabel: 'RETO',
      xp: '+60 XP',
      diff: 3,
      art: 'knight',
      featured: true,
      portrait: 'knight',
      char: {
        name: 'Teutonic Knight',
        role: 'Linker crusader',
        mood: 'En batalla',
        line: '"El filler te corta. Encadená o caés."',
        color: '#E8C547'
      }
    },
    {
      id: 'thief',
      kind: 'thief',
      title: 'SHADOW THIEF',
      sub: 'Sin muletilla. Si te ven, perdés cover.',
      badge: 'new',
      badgeLabel: 'PISO',
      xp: '+60 XP',
      diff: 3,
      art: 'thief',
      portrait: 'thief',
      char: {
        name: 'Dark Thief',
        role: 'Linker shadow',
        mood: 'Al acecho',
        line: '"Si dudás, te ven. Corto y limpio."',
        color: '#94A3B8'
      }
    },
    {
      id: 'raiders',
      kind: 'raiders',
      title: 'TENSE RAIDERS',
      sub: 'Tenses. First to 7. El goblin se burla.',
      badge: 'hot',
      badgeLabel: 'DUELO',
      xp: '+60 XP',
      diff: 3,
      art: 'raiders',
      portrait: 'raiders',
      char: {
        name: 'Goblin Raider',
        role: 'Tense duelist',
        mood: 'Burlón',
        line: '"Fallá el tiempo y me río en tu cara."',
        color: '#86EFAC'
      }
    },
    {
      id: 'rapid',
      kind: 'rapid',
      title: 'RAPID DRILL',
      sub: 'Gym del piso. 60s. No es juego.',
      badge: 'hot',
      badgeLabel: 'GYM',
      xp: '+30 XP',
      diff: 2,
      art: 'rapid',
      portrait: 'rapid',
      char: {
        name: 'Drill',
        role: 'Piso · 60s',
        mood: 'En el reloj',
        line: '"El reloj no perdona. Movete."',
        color: '#F59E0B'
      }
    }
  ];

  var HUB_SPRITES = {
    knight: {
      sheet: 'games/knights-quest/assets/hub-idle.png',
      fallback: 'games/knights-quest/assets/hub-knight.png',
      frames: 12,
      fps: 10
    },
    thief: {
      sheet: 'games/dark-thief/assets/hub-idle.png',
      fallback: 'games/dark-thief/assets/hub-thief.png',
      frames: 12,
      fps: 10
    },
    raiders: {
      sheet: 'games/tense-raiders/assets/hub-idle.png',
      fallback: 'games/tense-raiders/assets/hub-goblin.png',
      frames: 12,
      fps: 10
    }
  };

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function findGame(id) {
    for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) return GAMES[i];
    return null;
  }

  function rapidClockHtml(g) {
    return (
      '<div class="hub-rapid-clock" role="img" aria-label="' +
      esc((g && g.char && g.char.name) || 'Drill') +
      '">' +
      '<div class="hub-rapid-bezel">' +
      '<div class="hub-rapid-ticks"></div>' +
      '<div class="hub-rapid-radar"></div>' +
      '<div class="hub-rapid-led"></div>' +
      '<div class="hub-rapid-face">' +
      '<div class="hub-rapid-digits">' +
      '<span>60</span><span>45</span><span>30</span><span>15</span><span>08</span><span>03</span>' +
      '</div>' +
      '<div class="hub-rapid-unit">SEC</div>' +
      '<div class="hub-rapid-hand"></div>' +
      '<div class="hub-rapid-cap"></div>' +
      '</div></div></div>'
    );
  }

  function portraitHtml(g, wrapClass) {
    var cls = wrapClass || 'hub-css-char';
    var kind = (g && (g.portrait || g.kind || g.id)) || '';
    if (kind === 'knight' || kind === 'thief' || kind === 'raiders') {
      var sp = HUB_SPRITES[kind];
      return (
        '<div class="' +
        cls +
        ' hub-portrait-' +
        kind +
        '">' +
        '<div class="hub-sprite hub-sprite-' +
        kind +
        '" style="--hub-frames:' +
        sp.frames +
        ';--hub-fps:' +
        sp.fps +
        ';--hub-sheet:url(\'' +
        sp.sheet +
        '?v=' +
        VER +
        '\')" role="img" aria-label="' +
        esc((g.char && g.char.name) || kind) +
        '"></div>' +
        '</div>'
      );
    }
    if (kind === 'rapid') {
      return '<div class="' + cls + ' hub-portrait-rapid">' + rapidClockHtml(g) + '</div>';
    }
    var key = (g && g.charKey) || 'lex';
    var inner =
      typeof infinityCharHtml === 'function'
        ? infinityCharHtml(key)
        : '<div class="hub-char-fallback" style="--char-c:' +
          esc((g.char && g.char.color) || '#F5A623') +
          '"></div>';
    return '<div class="' + cls + '">' + inner + '</div>';
  }

  function hudPills() {
    var meta =
      typeof arcadeGetMeta === 'function' ? arcadeGetMeta(global.CURRENT_STUDENT || {}) : null;
    if (!meta) {
      return (
        '<div class="pill pill-xp">XP —</div>' +
        '<div class="pill pill-streak">DAY —</div>' +
        '<div class="pill pill-day">COINS —</div>'
      );
    }
    return (
      '<div class="pill pill-xp">XP ' +
      esc(meta.lifetimeXp || 0) +
      '</div>' +
      '<div class="pill pill-streak">DAY ' +
      esc(meta.dayStreak || 0) +
      '</div>' +
      '<div class="pill pill-day">COINS ' +
      esc(meta.coins || 0) +
      '</div>'
    );
  }

  function ensureStyles() {
    var existing = document.getElementById('infinity-practice-hub-styles');
    if (existing && existing.getAttribute('data-ver') === VER) return;
    if (existing) existing.remove();
    if (!document.getElementById('infinity-hub-fonts')) {
      var link = document.createElement('link');
      link.id = 'infinity-hub-fonts';
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@500;600;700;800&display=swap';
      document.head.appendChild(link);
    }
    var st = document.createElement('style');
    st.id = 'infinity-practice-hub-styles';
    st.setAttribute('data-ver', VER);
    st.textContent =
      ':root{--inf-navy:#2B7EC1;--inf-deep:#1A5A8F;--inf-gold:#F7941D;--inf-gold2:#FFD700;--inf-ink:#0B1A28;--inf-surface:#0F2A40;--inf-text:#F4F8FC;--inf-mute:#A8D4F5;}' +
      '@keyframes hubFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}' +
      '@keyframes hubPulse{0%,100%{box-shadow:0 0 0 0 rgba(245,166,35,.2)}50%{box-shadow:0 0 0 8px rgba(245,166,35,0)}}' +
      '@keyframes hubCardIn{0%{opacity:0;transform:translateY(18px) scale(.96)}100%{opacity:1;transform:none}}' +
      '@keyframes hubShine{0%{transform:translateX(-130%) skewX(-12deg)}100%{transform:translateX(230%) skewX(-12deg)}}' +
      '@keyframes hubTitleIn{0%{opacity:0;transform:scale(.85) translateY(20px)}100%{opacity:1;transform:none}}' +
      '@keyframes hubCharBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}' +
      '@keyframes hubAura{0%,100%{filter:drop-shadow(0 0 12px var(--char-c))}50%{filter:drop-shadow(0 0 28px var(--char-c))}}' +
      '@keyframes hubSpritePlay{from{background-position:0% 0}to{background-position:100% 0}}' +
      '@keyframes hubRapidSweep{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}' +
      '@keyframes hubRapidPulse{0%,100%{box-shadow:0 0 8px rgba(245,166,35,.28),inset 0 0 14px rgba(245,166,35,.1)}50%{box-shadow:0 0 22px 3px rgba(239,68,68,.42),inset 0 0 22px rgba(245,166,35,.22)}}' +
      '@keyframes hubRapidDigit{0%,16%{opacity:1}16.7%,100%{opacity:0}}' +
      '@keyframes hubRapidLed{0%,100%{opacity:1}50%{opacity:.18}}' +
      '@keyframes hubRapidFlicker{0%,90%,100%{opacity:1}93%{opacity:.4}96%{opacity:1}}' +
      '.inf-hub{position:fixed;inset:0;z-index:2398;display:none;flex-direction:column;background:var(--inf-ink);color:var(--inf-text);font-family:Outfit,system-ui,sans-serif;overflow:hidden}' +
      '.inf-hub.is-open{display:flex}' +
      '.inf-hub-bg{position:absolute;inset:0;background:radial-gradient(ellipse at 15% 0%,rgba(43,126,193,.45),transparent 50%),radial-gradient(ellipse at 85% 10%,rgba(247,148,29,.2),transparent 45%),linear-gradient(180deg,#0F3A5C 0%,#0B1A28 55%,#071018 100%)}' +
      '.inf-hub-bg:before{content:"";position:absolute;inset:0;opacity:.4;background-image:radial-gradient(1.5px 1.5px at 10% 20%,#fff,transparent),radial-gradient(1px 1px at 30% 8%,#F5A623,transparent),radial-gradient(1px 1px at 70% 15%,#C084FC,transparent),radial-gradient(1.5px 1.5px at 88% 28%,#fff,transparent);animation:hubFloat 8s ease-in-out infinite}' +
      '.inf-hub-top{position:relative;z-index:2;display:flex;align-items:center;gap:12px;padding:max(10px,env(safe-area-inset-top)) 16px 10px;border-bottom:1px solid rgba(245,166,35,.22);background:rgba(11,6,24,.88);backdrop-filter:blur(12px)}' +
      '.inf-hub-logo{font-family:"Bebas Neue",sans-serif;font-size:clamp(22px,5vw,30px);letter-spacing:.06em;color:#fff}' +
      '.inf-hub-logo span{color:var(--inf-gold)}' +
      '.inf-hub-pills{display:flex;flex-wrap:wrap;gap:6px;margin-left:auto}' +
      '.inf-hub .pill{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:999px;font-size:11px;font-weight:800}' +
      '.pill-xp{background:rgba(91,33,182,.35);border:1px solid rgba(192,132,252,.45);color:#E9D5FF}' +
      '.pill-streak{background:rgba(245,166,35,.15);border:1px solid rgba(245,166,35,.4);color:#FBBF24}' +
      '.pill-day{background:rgba(34,197,94,.12);border:1px solid rgba(74,222,128,.35);color:#86EFAC}' +
      '.inf-hub-close{border:2px solid var(--inf-gold);background:#1a0a3a;color:var(--inf-gold);border-radius:10px;padding:7px 12px;font-weight:800;font-size:12px;cursor:pointer}' +
      '.inf-hub-scroll{position:relative;z-index:2;flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;padding:16px 16px max(20px,env(safe-area-inset-bottom))}' +
      '.inf-hub-mantra{text-align:center;font-size:11px;font-weight:800;letter-spacing:.14em;color:var(--inf-gold);margin:0 0 12px;opacity:.95}' +
      '.hub-featured{position:relative;border-radius:18px;overflow:hidden;margin-bottom:18px;height:min(200px,32vh);cursor:pointer;border:2px solid rgba(245,166,35,.45);box-shadow:0 12px 36px rgba(59,14,140,.45),0 0 0 1px rgba(255,255,255,.06);background:linear-gradient(125deg,#3B0E8C 0%,#5B21B6 40%,#7C3AED 70%,#B45309 100%)}' +
      '.hub-featured.art-knight{background:linear-gradient(125deg,#1a0508 0%,#7f1d1d 35%,#ea580c 70%,#fbbf24 100%);border-color:rgba(251,191,36,.55)}' +
      '.hub-featured.art-thief{background:linear-gradient(125deg,#020617 0%,#1e293b 40%,#334155 70%,#64748b 100%);border-color:rgba(148,163,184,.5)}' +
      '.hub-featured.art-rapid{background:linear-gradient(125deg,#1c0a08 0%,#7c2d12 42%,#b45309 78%,#f59e0b 100%);border-color:rgba(245,166,35,.5)}' +
      '.hub-featured:active{transform:scale(.99)}' +
      '.hub-featured-shine{position:absolute;inset:0;overflow:hidden;pointer-events:none;opacity:0;transition:opacity .25s}' +
      '.hub-featured-shine:after{content:"";position:absolute;top:0;left:0;width:40%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent)}' +
      '.hub-featured-char{position:absolute;right:4%;top:8%;bottom:12%;width:auto;max-width:38%;height:auto;display:flex;align-items:flex-end;justify-content:center;transform:none;filter:drop-shadow(0 8px 18px rgba(0,0,0,.45));pointer-events:none;z-index:1}' +
      '.hub-featured-char .inf-char,.hub-featured-char .inf-plane{transform:scale(1.55)}' +
      '.hub-char-fallback{width:56px;height:56px;border-radius:16px;background:linear-gradient(145deg,var(--char-c,#F5A623),#5B21B6);border:2px solid rgba(255,255,255,.35);box-shadow:0 8px 20px rgba(0,0,0,.35)}' +
      '.hub-card-art .hub-css-char{position:absolute;top:14%;left:50%;transform:translateX(-50%) scale(1.05);--char-c:#F5A623}' +
      '.hub-title-char-css{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%) scale(1.7)}' +
      '.hub-featured-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(11,6,24,.92) 0%,rgba(11,6,24,.2) 55%,transparent 100%)}' +
      '.hub-featured-content{position:absolute;left:0;right:0;bottom:0;padding:18px 20px;z-index:2}' +
      '.hub-featured-badge{display:inline-block;background:var(--inf-gold);color:#1a1200;font-size:9px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-radius:4px;margin-bottom:8px}' +
      '.hub-featured-title{font-family:"Bebas Neue",sans-serif;font-size:clamp(32px,8vw,46px);letter-spacing:.04em;line-height:1;color:#fff;text-shadow:0 2px 16px rgba(0,0,0,.5)}' +
      '.hub-featured-sub{font-size:13px;color:rgba(255,255,255,.75);margin-top:4px;font-weight:600}' +
      '.hub-featured-char-name{font-size:12px;font-weight:800;color:var(--inf-gold);margin-top:6px}' +
      '.hub-grid-title{font-family:"Bebas Neue",sans-serif;font-size:18px;letter-spacing:.08em;color:var(--inf-mute);margin:4px 0 12px}' +
      '.hub-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:12px;max-width:960px;margin:0 auto}' +
      '.hub-card{border-radius:16px;overflow:hidden;cursor:pointer;aspect-ratio:3/4;position:relative;border:2px solid rgba(255,255,255,.08);animation:hubCardIn .45s cubic-bezier(.2,.8,.2,1) both;box-shadow:0 8px 24px rgba(0,0,0,.35);transition:transform .15s,border-color .15s}' +
      '.hub-card:nth-child(1){animation-delay:.03s}.hub-card:nth-child(2){animation-delay:.06s}.hub-card:nth-child(3){animation-delay:.09s}.hub-card:nth-child(4){animation-delay:.12s}' +
      '.hub-card:active{transform:translateY(2px) scale(.98)}' +
      '.hub-card-art{position:absolute;inset:0}' +
      '.hub-portrait-knight,.hub-portrait-thief,.hub-portrait-raiders,.hub-portrait-rapid{position:absolute;inset:8% 6% 28%;display:flex;align-items:flex-end;justify-content:center;pointer-events:none;z-index:1}' +
      '.hub-sprite{height:100%;width:auto;max-width:100%;aspect-ratio:157/221;background-image:var(--hub-sheet);background-repeat:no-repeat;background-size:calc(var(--hub-frames) * 100%) 100%;background-position:0% 0;animation:hubSpritePlay calc(var(--hub-frames) / var(--hub-fps) * 1s) steps(var(--hub-frames)) infinite;filter:drop-shadow(0 8px 14px rgba(0,0,0,.5));image-rendering:auto}' +
      '.hub-sprite-thief{aspect-ratio:79/220}' +
      '.hub-sprite-raiders{aspect-ratio:168/140}' +
      '.hub-rapid-clock{position:relative;height:88%;width:auto;aspect-ratio:1;max-width:100%;container-type:size;filter:drop-shadow(0 8px 16px rgba(0,0,0,.5));animation:hubCharBob 2.2s ease-in-out infinite}' +
      '.hub-rapid-bezel{position:relative;width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 32% 28%,#3f3f46,#18181b 52%,#09090b);border:3px solid #F5A623;box-sizing:border-box;animation:hubRapidPulse 1.8s ease-in-out infinite;overflow:hidden}' +
      '.hub-rapid-ticks{position:absolute;inset:5%;border-radius:50%;pointer-events:none;background:repeating-conic-gradient(from 0deg,#F5A623 0 1.4deg,transparent 1.4deg 30deg);-webkit-mask:radial-gradient(farthest-side,transparent 76%,#000 77%);mask:radial-gradient(farthest-side,transparent 76%,#000 77%);z-index:1}' +
      '.hub-rapid-radar{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg,transparent 0 300deg,rgba(239,68,68,.42) 360deg);animation:hubRapidSweep 4s linear infinite}' +
      '.hub-rapid-led{position:absolute;left:50%;top:6%;width:7%;height:7%;min-width:5px;min-height:5px;transform:translateX(-50%);border-radius:50%;background:#ef4444;box-shadow:0 0 8px #ef4444;animation:hubRapidLed 1s steps(2) infinite;z-index:3}' +
      '.hub-rapid-face{position:absolute;inset:14%;border-radius:50%;background:radial-gradient(circle at 50% 38%,#2a1208,#0a0604 70%);box-shadow:inset 0 0 0 2px rgba(245,166,35,.35),inset 0 0 18px rgba(0,0,0,.65);overflow:hidden}' +
      '.hub-rapid-digits{position:absolute;inset:22% 10% 34%;font-family:"Bebas Neue",sans-serif;font-size:36px;line-height:1;color:#F5A623;text-shadow:0 0 12px rgba(245,166,35,.55);animation:hubRapidFlicker 3.2s steps(1) infinite}' +
      '.hub-rapid-digits span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;animation:hubRapidDigit 12s infinite}' +
      '.hub-rapid-digits span:nth-child(1){animation-delay:0s}.hub-rapid-digits span:nth-child(2){animation-delay:2s}.hub-rapid-digits span:nth-child(3){animation-delay:4s}.hub-rapid-digits span:nth-child(4){animation-delay:6s}.hub-rapid-digits span:nth-child(5){animation-delay:8s}.hub-rapid-digits span:nth-child(6){animation-delay:10s}' +
      '.hub-rapid-unit{position:absolute;left:0;right:0;bottom:22%;text-align:center;font-size:9px;font-weight:800;letter-spacing:.18em;color:rgba(251,191,36,.75)}' +
      '.hub-rapid-hand{position:absolute;left:50%;bottom:50%;width:3px;height:36%;margin-left:-1.5px;background:linear-gradient(#EF4444,#F5A623);border-radius:2px 2px 0 0;transform-origin:50% 100%;animation:hubRapidSweep 4s linear infinite;box-shadow:0 0 8px rgba(239,68,68,.55)}' +
      '.hub-rapid-cap{position:absolute;left:50%;top:50%;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;background:#F5A623;box-shadow:0 0 8px #F5A623}' +
      '.hub-featured-char.hub-portrait-knight,.hub-featured-char.hub-portrait-thief,.hub-featured-char.hub-portrait-raiders,.hub-featured-char.hub-portrait-rapid{position:absolute;inset:auto 3% 10% auto;top:6%;bottom:10%;width:auto;max-width:36%;height:auto;transform:none}' +
      '.hub-featured-char .hub-sprite{height:100%;width:auto;max-height:100%;max-width:100%;aspect-ratio:157/221}' +
      '.hub-featured-char .hub-sprite-thief{aspect-ratio:79/220}' +
      '.hub-featured-char .hub-sprite-raiders{aspect-ratio:168/140}' +
      '.hub-featured-char .hub-rapid-clock{height:100%;width:auto;max-width:100%}' +
      '.hub-title-char-css.hub-portrait-knight,.hub-title-char-css.hub-portrait-thief,.hub-title-char-css.hub-portrait-raiders,.hub-title-char-css.hub-portrait-rapid{position:absolute;left:50%;top:46%;width:auto;height:70%;max-width:70%;transform:translate(-50%,-50%);display:flex;align-items:flex-end;justify-content:center}' +
      '.hub-title-char-css .hub-sprite{height:100%;width:auto;max-height:200px;aspect-ratio:157/221}' +
      '.hub-title-char-css .hub-sprite-thief{aspect-ratio:79/220}' +
      '.hub-title-char-css .hub-sprite-raiders{aspect-ratio:168/140;max-height:220px}' +
      '.hub-title-char-css .hub-rapid-clock{height:100%;max-height:168px}' +
      '@media (hover:hover){' +
      '.hub-featured:hover .hub-featured-shine{opacity:.45}' +
      '.hub-featured:hover .hub-featured-shine:after{animation:hubShine 1.4s ease-in-out 1}' +
      '.hub-featured:hover .hub-sprite,.hub-card:hover .hub-sprite,.inf-hub-title.is-open .hub-title-char-css:hover .hub-sprite{animation:hubSpritePlay 1.2s steps(12) infinite}' +
      '.hub-title-cta:hover{animation:hubPulse 1.4s ease-in-out infinite}' +
      '}' +
      '@supports (font-size:1cqmin){.hub-rapid-digits{font-size:42cqmin}.hub-rapid-unit{font-size:8cqmin}.hub-rapid-hand{width:max(2px,3cqmin)}.hub-rapid-cap{width:8cqmin;height:8cqmin;margin:calc(-4cqmin) 0 0 calc(-4cqmin)}}' +
      '.art-thief{background:linear-gradient(165deg,#020617 0%,#1e293b 45%,#475569 100%)}' +
      '.art-raiders{background:linear-gradient(165deg,#052e16 0%,#14532d 40%,#3f6212 70%,#86efac 100%)}' +
      '.hub-featured.art-raiders{background:linear-gradient(125deg,#052e16 0%,#14532d 40%,#3f6212 70%,#bbf7d0 100%);border-color:rgba(134,239,172,.5)}' +
      '.hub-card-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(11,6,24,.95) 0%,rgba(11,6,24,.35) 50%,transparent 100%)}' +
      '.hub-card-body{position:absolute;bottom:0;left:0;right:0;padding:12px 10px;z-index:2}' +
      '.hub-card-title{font-family:"Bebas Neue",sans-serif;font-size:22px;letter-spacing:.04em;line-height:1;margin-bottom:3px}' +
      '.hub-card-sub{font-size:11px;color:rgba(255,255,255,.6);margin-bottom:8px;line-height:1.35;font-weight:600}' +
      '.hub-card-footer{display:flex;align-items:center;justify-content:space-between}' +
      '.hub-card-diff{display:flex;gap:3px}' +
      '.diff-pip{width:14px;height:3px;border-radius:2px;background:rgba(255,255,255,.15);display:block}' +
      '.diff-pip.g{background:#22C55E}.diff-pip.a{background:#F5A623}.diff-pip.r{background:#EF4444}' +
      '.hub-card-xp{font-size:10px;font-weight:800;color:rgba(255,255,255,.85)}' +
      '.hub-card-badge{position:absolute;top:8px;left:8px;z-index:3;font-size:8px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;padding:3px 7px;border-radius:4px}' +
      '.b-new{background:var(--inf-navy);color:#fff;border:1px solid rgba(245,166,35,.5)}' +
      '.b-hot{background:#EF4444;color:#fff}' +
      '.b-today{background:var(--inf-gold);color:#1a1200}' +
      '.art-boss{background:linear-gradient(170deg,#2a0a18,#5B21B6 55%,#9f1239)}' +
      '.art-star{background:linear-gradient(180deg,#1a0a3a,#3B0E8C,#B45309)}' +
      '.art-listen{background:linear-gradient(160deg,#0c1a3a,#1e3a5f,#0891b2)}' +
      '.art-tone{background:linear-gradient(160deg,#0a2418,#14532d,#3B0E8C)}' +
      '.art-nemesis{background:linear-gradient(180deg,#1a0508,#3B0E8C,#7f1d1d)}' +
      '.art-snake{background:linear-gradient(165deg,#1a0a2e 0%,#7c2d12 40%,#b45309 70%,#f59e0b)}' +
      '.art-drop{background:linear-gradient(165deg,#0f172a,#1e3a8a 45%,#5B21B6,#b45309)}' +
      '.art-phrasal{background:linear-gradient(160deg,#0b1430,#1e3a8a,#5B21B6)}' +
      '.art-daily{background:linear-gradient(160deg,#2a1800,#5B21B6,#B45309)}' +
      '.art-frenzy{background:linear-gradient(160deg,#2a0a00,#7c2d12,#5B21B6)}' +
      '.art-challenge{background:linear-gradient(160deg,#2a1808,#5B21B6,#F5A623)}' +
      '.art-verb{background:linear-gradient(160deg,#042f2e,#0f766e,#5B21B6)}' +
      '.art-structure{background:linear-gradient(160deg,#1e1b4b,#5B21B6,#7C3AED)}' +
      '.art-linker{background:linear-gradient(160deg,#1e103a,#5B21B6,#6d28d9)}' +
      '.art-prep{background:linear-gradient(160deg,#2a1508,#9a3412,#5B21B6)}' +
      '.art-rapid{background:linear-gradient(165deg,#1c0a08 0%,#7c2d12 40%,#b45309 78%,#f59e0b 100%)}' +
      '.art-knight{background:linear-gradient(165deg,#1a0508 0%,#7f1d1d 40%,#ea580c 70%,#fbbf24 100%)}' +
      /* Title / character splash */
      '.inf-hub-title{position:fixed;inset:0;z-index:2406;display:none;align-items:stretch;justify-content:center;padding:0;box-sizing:border-box}' +
      '.inf-hub-title.is-open{display:flex}' +
      '.inf-hub-title-bg{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 20%,color-mix(in srgb,var(--t-c,#F5A623) 35%,#3B0E8C),#0B0618 70%)}' +
      '.inf-hub-title-panel{position:relative;z-index:1;width:min(440px,100%);margin:auto;padding:max(16px,env(safe-area-inset-top)) 18px max(20px,env(safe-area-inset-bottom));text-align:center;animation:hubTitleIn .5s cubic-bezier(.2,.85,.2,1)}' +
      '.hub-char-stage{position:relative;margin:0 auto 14px;width:min(280px,80vw);height:200px;border-radius:24px;border:3px solid var(--inf-gold);background:linear-gradient(165deg,rgba(91,33,182,.55),rgba(11,6,24,.9));box-shadow:0 0 40px rgba(245,166,35,.25),0 16px 40px rgba(0,0,0,.45);overflow:hidden}' +
      '.hub-char-stage:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 30%,rgba(255,255,255,.12),transparent 55%)}' +
      '.hub-char-face{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);font-size:88px;filter:drop-shadow(0 10px 20px rgba(0,0,0,.4));--char-c:var(--t-c,#F5A623)}' +
      '.hub-char-plate{position:absolute;left:12px;right:12px;bottom:10px;background:rgba(11,6,24,.88);border:1px solid rgba(245,166,35,.35);border-radius:12px;padding:8px 10px;text-align:left}' +
      '.hub-char-plate .nm{font-family:"Bebas Neue",sans-serif;font-size:20px;letter-spacing:.04em;color:var(--inf-gold);line-height:1}' +
      '.hub-char-plate .rl{font-size:11px;font-weight:700;color:rgba(255,255,255,.7)}' +
      '.hub-title-h{font-family:"Bebas Neue",sans-serif;font-size:clamp(36px,10vw,52px);letter-spacing:.04em;line-height:1;margin:0 0 6px;color:#fff;text-shadow:0 0 24px rgba(245,166,35,.35)}' +
      '.hub-title-mood{font-size:13px;font-weight:800;color:var(--t-c,#F5A623);margin-bottom:8px}' +
      '.hub-title-line{font-size:14px;font-weight:600;line-height:1.45;color:rgba(255,255,255,.85);font-style:italic;background:rgba(91,33,182,.35);border-left:3px solid var(--inf-gold);padding:10px 12px;border-radius:0 12px 12px 0;text-align:left;margin:0 0 12px}' +
      '.hub-title-lil{font-size:11px;font-weight:800;letter-spacing:.12em;color:#C4B5FD;margin-bottom:16px}' +
      '.hub-title-cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-width:200px;padding:14px 22px;border:none;border-radius:14px;background:linear-gradient(135deg,#FFD700,#F5A623);color:#1a1200;font-family:"Bebas Neue",sans-serif;font-size:22px;letter-spacing:.06em;cursor:pointer;box-shadow:0 8px 28px rgba(245,166,35,.4);animation:none}' +
      '.hub-title-back{display:block;margin:14px auto 0;background:transparent;border:none;color:var(--inf-mute);font-weight:700;font-size:13px;cursor:pointer;text-decoration:underline}' +
      '.hub-floor{margin:0 0 16px;padding:12px 14px;border-radius:14px;border:1px solid rgba(245,166,35,.22);background:rgba(20,11,40,.72)}' +
      '.hub-floor.is-on{border-color:rgba(245,166,35,.5);background:rgba(91,33,182,.28)}' +
      '.hub-floor-btn{display:block;width:100%;border:2px solid rgba(245,166,35,.4);background:#1a0a3a;color:var(--inf-gold);border-radius:10px;padding:10px 12px;font-weight:800;font-size:12px;letter-spacing:.08em;cursor:pointer;text-transform:uppercase}' +
      '.hub-floor.is-on .hub-floor-btn{background:linear-gradient(135deg,#5B21B6,#3B0E8C);color:#FFD700;border-color:var(--inf-gold)}' +
      '.hub-floor-hint{margin-top:8px;font-size:11px;font-weight:600;line-height:1.4;color:var(--inf-mute)}' +
      '.hub-floor-board{margin-top:10px;display:flex;flex-direction:column;gap:6px}' +
      '.hub-floor-row{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;color:#F8F5FF}' +
      '.hub-floor-row span{color:var(--inf-gold);min-width:22px}' +
      '.hub-floor-row b{flex:1;font-weight:800}' +
      '.hub-floor-row em{font-style:normal;color:#C4B5FD}' +
      '.hub-floor-row.is-me{color:#FFD700}' +
      '@keyframes hubStagePulse{0%,100%{filter:saturate(1)}50%{filter:saturate(1.15)}}' +
      '.hub-live{position:relative;border-radius:20px;overflow:hidden;height:min(52vh,440px);min-height:280px;border:2px solid rgba(245,166,35,.4);box-shadow:0 16px 40px rgba(0,0,0,.45);animation:hubCardIn .45s cubic-bezier(.2,.8,.2,1) both}' +
      '.hub-live.art-knight{background:linear-gradient(125deg,#1a0508 0%,#7f1d1d 35%,#ea580c 70%,#fbbf24 100%)}' +
      '.hub-live.art-thief{background:linear-gradient(125deg,#020617 0%,#1e293b 40%,#334155 70%,#64748b 100%)}' +
      '.hub-live.art-raiders{background:linear-gradient(125deg,#052e16 0%,#14532d 40%,#3f6212 70%,#bbf7d0 100%)}' +
      '.hub-live.art-rapid{background:linear-gradient(125deg,#1c0a08 0%,#7c2d12 40%,#b45309 75%,#f59e0b 100%)}' +
      '.hub-live-shine{position:absolute;inset:0;overflow:hidden;pointer-events:none;opacity:.35}' +
      '.hub-live-shine:after{content:"";position:absolute;top:0;left:0;width:40%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent);animation:hubShine 3.2s ease-in-out infinite}' +
      '.hub-live-char{position:absolute;right:1%;top:4%;bottom:6%;max-width:48%;display:flex;align-items:flex-end;justify-content:center;z-index:1;filter:drop-shadow(0 12px 22px rgba(0,0,0,.55));animation:hubCharBob 2.6s ease-in-out infinite;pointer-events:none}' +
      '.hub-live-char.hub-portrait-knight,.hub-live-char.hub-portrait-thief,.hub-live-char.hub-portrait-raiders,.hub-live-char.hub-portrait-rapid{left:auto;width:auto}' +
      '.hub-live-char .hub-sprite{height:100%;width:auto;max-height:100%}' +
      '.hub-live-char .hub-rapid-clock{height:78%;width:auto;max-width:100%;animation:none}' +
      '.hub-live-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(11,6,24,.92) 0%,rgba(11,6,24,.28) 48%,transparent 100%);pointer-events:none}' +
      '.hub-live-copy{position:absolute;left:0;right:36%;bottom:0;padding:16px 16px 18px;z-index:2}' +
      '.hub-live-badge{display:inline-block;background:var(--inf-gold);color:#1a1200;font-size:9px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-radius:4px;margin-bottom:8px}' +
      '.hub-live-title{font-family:"Bebas Neue",sans-serif;font-size:clamp(28px,8vw,46px);letter-spacing:.04em;line-height:.95;color:#fff;text-shadow:0 2px 16px rgba(0,0,0,.55)}' +
      '.hub-live-sub{font-size:13px;color:rgba(255,255,255,.78);margin-top:6px;font-weight:600}' +
      '.hub-live-line{font-size:12px;font-weight:700;color:var(--inf-gold);margin-top:8px;font-style:italic}' +
      '.hub-live-cta{display:inline-flex;margin-top:12px;border:none;border-radius:12px;padding:11px 20px;background:linear-gradient(135deg,#FFD700,#F5A623);color:#1a1200;font-family:"Bebas Neue",sans-serif;font-size:20px;letter-spacing:.06em;cursor:pointer;box-shadow:0 8px 24px rgba(245,166,35,.35)}' +
      '.hub-docks{display:flex;gap:8px;margin-top:12px}' +
      '.hub-dock{flex:1;min-width:0;height:92px;border-radius:14px;border:2px solid rgba(255,255,255,.1);background:rgba(20,11,40,.85);position:relative;overflow:hidden;cursor:pointer;padding:0;color:#fff}' +
      '.hub-dock.is-on{border-color:var(--inf-gold);box-shadow:0 0 0 1px rgba(245,166,35,.35),0 8px 20px rgba(245,166,35,.2);animation:hubPulse 1.6s ease-in-out infinite}' +
      '.hub-dock-char{position:absolute;inset:4px 4px 22px;display:flex;align-items:flex-end;justify-content:center;pointer-events:none}' +
      '.hub-dock-char .hub-sprite{height:100%;width:auto}' +
      '.hub-dock-char .hub-rapid-clock{height:100%;width:auto;max-width:72px}' +
      '.hub-dock-char .hub-rapid-unit{display:none}' +
      '.hub-dock-char .hub-rapid-digits{inset:16% 8% 16%;font-size:22px}' +
      '.hub-dock span{position:absolute;left:4px;right:4px;bottom:5px;font-size:9px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:rgba(255,255,255,.85)}' +
      '.hub-dock.is-on span{color:var(--inf-gold)}' +
      '@media (max-width:420px){.hub-live{height:min(48vh,360px);min-height:240px}.hub-live-copy{right:30%}.hub-dock{height:80px}}' +
      'body.inf-hub-lock{overflow:hidden;touch-action:none}';
    document.head.appendChild(st);
  }

  function stageGame() {
    return GAMES[stageIdx % GAMES.length] || GAMES[0];
  }

  function dockHtml(g, on) {
    var label = (g.char && g.char.name ? g.char.name.split(' ')[0] : g.title) || g.id;
    return (
      '<button type="button" class="hub-dock' +
      (on ? ' is-on' : '') +
      '" onclick="selectInfinityHubStage(\'' +
      g.id +
      '\')">' +
      portraitHtml(g, 'hub-dock-char') +
      '<span>' +
      esc(label) +
      '</span></button>'
    );
  }

  function liveStageHtml() {
    var g = stageGame();
    var c = g.char || {};
    var docks = '';
    GAMES.forEach(function (x) {
      docks += dockHtml(x, x.id === g.id);
    });
    return (
      '<div class="hub-live art-' +
      (g.art || '') +
      '" id="hub-live-stage">' +
      '<div class="hub-live-shine"></div>' +
      portraitHtml(g, 'hub-live-char') +
      '<div class="hub-live-overlay"></div>' +
      '<div class="hub-live-copy">' +
      '<div class="hub-live-badge">' +
      esc(g.badgeLabel || 'RETO') +
      ' · EN VIVO</div>' +
      '<div class="hub-live-title">' +
      esc(g.title) +
      '</div>' +
      '<div class="hub-live-sub">' +
      esc(g.sub) +
      '</div>' +
      '<div class="hub-live-line">' +
      esc(c.line || '') +
      '</div>' +
      '<button type="button" class="hub-live-cta" onclick="openInfinityCasinoTitle(\'' +
      g.id +
      '\')">JUGAR</button>' +
      '</div></div>' +
      '<div class="hub-docks" id="hub-docks">' +
      docks +
      '</div>'
    );
  }

  function paintLiveStage() {
    var wrap = document.getElementById('hub-live-wrap');
    if (!wrap) return;
    wrap.innerHTML = liveStageHtml();
  }

  function selectHubStage(id) {
    var cur = stageGame();
    if (cur && cur.id === id) {
      openTitle(id);
      return;
    }
    for (var i = 0; i < GAMES.length; i++) {
      if (GAMES[i].id === id) {
        stageIdx = i;
        break;
      }
    }
    stagePauseUntil = Date.now() + 12000;
    paintLiveStage();
  }

  function nextHubStage() {
    if (!global._infCasinoOpen) return;
    if (Date.now() < stagePauseUntil) return;
    var title = document.getElementById('inf-casino-title');
    if (title && title.classList.contains('is-open')) return;
    stageIdx = (stageIdx + 1) % GAMES.length;
    paintLiveStage();
  }

  function startStageLoop() {
    if (stageTimer) return;
    stageTimer = setInterval(nextHubStage, 4200);
  }

  function stopStageLoop() {
    if (!stageTimer) return;
    clearInterval(stageTimer);
    stageTimer = null;
  }

  function renderHub() {
    var scroll = document.getElementById('inf-hub-scroll');
    if (!scroll) return;
    scroll.innerHTML =
      '<div class="inf-hub-mantra">' +
      MANTRA +
      ' · PARA EL PUEBLO</div>' +
      floorStripHtml() +
      '<div id="hub-live-wrap">' +
      liveStageHtml() +
      '</div>';
    startStageLoop();
  }

  function floorScore(row) {
    var games = (row && row.games) || {};
    var total = 0;
    ['knight', 'thief', 'raiders', 'rapid'].forEach(function (g) {
      total += Number((games[g] && games[g].best) || 0) || 0;
    });
    return total;
  }

  function floorStripHtml() {
    var on = typeof arcadeFloorIsOn === 'function' && arcadeFloorIsOn();
    var html =
      '<div class="hub-floor' +
      (on ? ' is-on' : '') +
      '">' +
      '<button type="button" class="hub-floor-btn" onclick="toggleInfinityArcadeFloor()">' +
      (on ? 'PISO ON · salí cuando quieras' : 'SOLO · entrar al piso (opcional)') +
      '</button>';
    if (!on) {
      return (
        html +
        '<div class="hub-floor-hint">Nadie te ve. Si prendés el piso, el batch ve tu nombre de pila — y vos ves quién manda.</div></div>'
      );
    }
    var cache = global._arcadeFloorCache || { rows: [], me: '' };
    var rows = (cache.rows || [])
      .map(function (r) {
        return { id: r.id, name: r.name || 'Alguien', score: floorScore(r) };
      })
      .filter(function (r) {
        return r.score > 0;
      })
      .sort(function (a, b) {
        return b.score - a.score;
      })
      .slice(0, 5);
    if (!rows.length) {
      return html + '<div class="hub-floor-hint">Estás adentro. Todavía nadie anotó.</div></div>';
    }
    html += '<div class="hub-floor-board">';
    rows.forEach(function (r, i) {
      var me = cache.me && String(r.id) === String(cache.me);
      html +=
        '<div class="hub-floor-row' +
        (me ? ' is-me' : '') +
        '"><span>#' +
        (i + 1) +
        '</span><b>' +
        esc(r.name) +
        '</b><em>' +
        r.score +
        '</em></div>';
    });
    html += '</div></div>';
    return html;
  }

  function toggleFloor() {
    var on = !(typeof arcadeFloorIsOn === 'function' && arcadeFloorIsOn());
    var done = function () {
      var pills = document.getElementById('inf-hub-pills');
      if (pills) pills.innerHTML = hudPills();
      renderHub();
    };
    if (typeof arcadeFloorSetOptIn === 'function') {
      Promise.resolve(arcadeFloorSetOptIn(on)).then(done).catch(done);
    } else {
      done();
    }
  }

  function ensureShell() {
    ensureStyles();
    var el = document.getElementById('inf-casino-floor');
    if (!el) {
      el = document.createElement('div');
      el.id = 'inf-casino-floor';
      el.className = 'inf-hub';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.innerHTML =
        '<div class="inf-hub-bg" aria-hidden="true"></div>' +
        '<div class="inf-hub-top">' +
        '<div class="inf-hub-logo">KAMUK <span>HUB</span></div>' +
        '<div class="inf-hub-pills" id="inf-hub-pills"></div>' +
        '<button type="button" class="inf-hub-close" onclick="closeInfinityCasinoFloor()">Cerrar</button>' +
        '</div>' +
        '<div class="inf-hub-scroll" id="inf-hub-scroll"></div>';
      document.body.appendChild(el);
    } else {
      el.className = 'inf-hub' + (el.classList.contains('is-open') ? ' is-open' : '');
    }

    if (!document.getElementById('inf-casino-title')) {
      var title = document.createElement('div');
      title.id = 'inf-casino-title';
      title.className = 'inf-hub-title';
      title.innerHTML =
        '<div class="inf-hub-title-bg" id="inf-casino-title-bg"></div>' +
        '<div class="inf-hub-title-panel" id="inf-casino-title-panel"></div>';
      document.body.appendChild(title);
    } else {
      document.getElementById('inf-casino-title').className = 'inf-hub-title';
    }
    return el;
  }

  function openFloor() {
    if (typeof studentGamesOn === 'function' && !studentGamesOn(global.CURRENT_STUDENT)) {
      if (typeof showToast === 'function')
        showToast('Activá Jill, Modo Libre, Alice o Companion con tu trainer.', 'err');
      return;
    }
    if (typeof closeInfinityArcadeMonitor === 'function') closeInfinityArcadeMonitor(true);
    var oldLobby = document.getElementById('inf-arcade-lobby');
    if (oldLobby) oldLobby.classList.remove('is-open');
    document.body.classList.remove('inf-arcade-lobby-lock');
    global._infArcadeLobbyOpen = false;

    ensureShell();
    if (typeof infinityCharHtml === 'function') infinityCharHtml('plane');
    var pills = document.getElementById('inf-hub-pills');
    if (pills) pills.innerHTML = hudPills();
    renderHub();
    if (typeof arcadeFloorIsOn === 'function' && arcadeFloorIsOn() && typeof arcadeFloorLoad === 'function') {
      Promise.resolve(arcadeFloorLoad()).then(function () {
        renderHub();
      });
    }
    var el = document.getElementById('inf-casino-floor');
    if (el) {
      el.className = 'inf-hub is-open';
    }
    document.body.classList.add('inf-hub-lock');
    global._infCasinoOpen = true;
  }

  function closeFloor() {
    closeTitle();
    var el = document.getElementById('inf-casino-floor');
    if (el) el.classList.remove('is-open');
    document.body.classList.remove('inf-hub-lock');
    document.body.classList.remove('inf-casino-lock');
    global._infCasinoOpen = false;
    global._infArcadeLobbyOpen = false;
    stopStageLoop();
  }

  function openTitle(gameId) {
    var g = findGame(gameId);
    if (!g) return;
    ensureShell();
    var wrap = document.getElementById('inf-casino-title');
    var bg = document.getElementById('inf-casino-title-bg');
    var panel = document.getElementById('inf-casino-title-panel');
    if (!wrap || !panel) return;
    var c = g.char || {
      name: g.title,
      role: 'Coach',
      mood: '',
      line: MANTRA,
      color: '#F5A623'
    };
    if (bg) bg.style.setProperty('--t-c', c.color);
    panel.style.setProperty('--t-c', c.color);
    panel.className = 'inf-hub-title-panel';
    panel.innerHTML =
      '<div class="hub-char-stage">' +
      portraitHtml(g, 'hub-title-char-css') +
      '<div class="hub-char-plate"><div class="nm">' +
      esc(c.name) +
      '</div><div class="rl">' +
      esc(c.role) +
      '</div></div>' +
      '</div>' +
      '<h1 class="hub-title-h">' +
      esc(g.title) +
      '</h1>' +
      '<div class="hub-title-mood">' +
      esc(c.mood) +
      '</div>' +
      '<div class="hub-title-line">' +
      esc(c.line) +
      '</div>' +
      '<div class="hub-title-lil">' +
      MANTRA +
      '</div>' +
      '<button type="button" class="hub-title-cta" onclick="launchInfinityCasinoGame(\'' +
      g.id +
      '\')">JUGAR</button>' +
      '<button type="button" class="hub-title-back" onclick="closeInfinityCasinoTitle()">← Volver al hub</button>';
    wrap.className = 'inf-hub-title is-open';
    global._infCasinoTitleGame = g.id;
  }

  function closeTitle() {
    var wrap = document.getElementById('inf-casino-title');
    if (wrap) wrap.classList.remove('is-open');
    global._infCasinoTitleGame = null;
  }

  function launchGame(gameId) {
    var g = findGame(gameId) || findGame(global._infCasinoTitleGame);
    if (!g) return;
    closeTitle();
    if (g.kind === 'rapid') {
      if (typeof infinityArcadePickRapid === 'function') infinityArcadePickRapid();
      else if (typeof portalOpenRapidDrill === 'function') portalOpenRapidDrill('foundations');
      return;
    }
    if (g.kind === 'knight') {
      if (typeof openInfinityArcadeFullscreen === 'function') {
        openInfinityArcadeFullscreen("Knight's Quest", 'Pantalla completa · Teutonic');
      }
      var fsShell = document.getElementById('inf-arcade-fs');
      if (fsShell) fsShell.classList.add('is-knight-mode');
      var body = document.getElementById('inf-arcade-fs-body');
      if (body) {
        body.classList.add('is-knight-fit');
        body.innerHTML =
          '<iframe src="games/knights-quest/index.html?v=' +
          VER +
          '&t=' +
          Date.now() +
          '" title="Knight\'s Quest" class="inf-knight-frame" allow="autoplay; fullscreen" allowfullscreen></iframe>';
      }
      if (typeof infinityArcadeRequestBrowserFullscreen === 'function') {
        infinityArcadeRequestBrowserFullscreen(fsShell);
      }
      setTimeout(function () {
        if (typeof arcadeFloorPushToFrames === 'function') arcadeFloorPushToFrames();
      }, 400);
      return;
    }
    if (g.kind === 'thief') {
      if (typeof openInfinityArcadeFullscreen === 'function') {
        openInfinityArcadeFullscreen('Shadow Thief', 'Pantalla completa · Nyx');
      }
      var fsShellT = document.getElementById('inf-arcade-fs');
      if (fsShellT) fsShellT.classList.add('is-knight-mode');
      var bodyT = document.getElementById('inf-arcade-fs-body');
      if (bodyT) {
        bodyT.classList.add('is-knight-fit');
        bodyT.innerHTML =
          '<iframe src="games/dark-thief/index.html?v=' +
          VER +
          '" title="Shadow Thief" class="inf-knight-frame" allow="autoplay; fullscreen" allowfullscreen></iframe>';
      }
      if (typeof infinityArcadeRequestBrowserFullscreen === 'function') {
        infinityArcadeRequestBrowserFullscreen(fsShellT);
      }
      setTimeout(function () {
        if (typeof arcadeFloorPushToFrames === 'function') arcadeFloorPushToFrames();
      }, 400);
      return;
    }
    if (g.kind === 'raiders') {
      if (typeof openInfinityArcadeFullscreen === 'function') {
        openInfinityArcadeFullscreen('Tense Raiders', 'Pantalla completa · Goblin');
      }
      var fsShellR = document.getElementById('inf-arcade-fs');
      if (fsShellR) fsShellR.classList.add('is-knight-mode');
      var bodyR = document.getElementById('inf-arcade-fs-body');
      if (bodyR) {
        bodyR.classList.add('is-knight-fit');
        bodyR.innerHTML =
          '<iframe src="games/tense-raiders/index.html?v=' +
          VER +
          '&t=' +
          Date.now() +
          '" title="Tense Raiders" class="inf-knight-frame" allow="autoplay; fullscreen" allowfullscreen></iframe>';
      }
      if (typeof infinityArcadeRequestBrowserFullscreen === 'function') {
        infinityArcadeRequestBrowserFullscreen(fsShellR);
      }
      setTimeout(function () {
        if (typeof arcadeFloorPushToFrames === 'function') arcadeFloorPushToFrames();
      }, 400);
      return;
    }
    var fsBodyClear = document.getElementById('inf-arcade-fs-body');
    if (fsBodyClear) fsBodyClear.classList.remove('is-knight-fit');
    var mode = g.mode || g.id;
    if (typeof infinityArcadeStartMode === 'function') {
      infinityArcadeStartMode(mode);
      return;
    }
    if (typeof startArcadeMode === 'function') {
      if (typeof openInfinityArcadeFullscreen === 'function') {
        openInfinityArcadeFullscreen(g.title, MANTRA);
      }
      startArcadeMode(mode, 'inf-arcade-fs-body');
    }
  }

  global.openInfinityCasinoFloor = openFloor;
  global.closeInfinityCasinoFloor = closeFloor;
  global.openInfinityCasinoTitle = openTitle;
  global.closeInfinityCasinoTitle = closeTitle;
  global.launchInfinityCasinoGame = launchGame;
  global.toggleInfinityArcadeFloor = toggleFloor;
  global.selectInfinityHubStage = selectHubStage;
  global.INFINITY_CASINO_GAMES = GAMES;

  global.openInfinityArcadeLobby = function () {
    openFloor();
  };
  global.closeInfinityArcadeLobby = function () {
    closeFloor();
  };

  window.addEventListener('message', function (ev) {
    var data = ev && ev.data;
    if (!data || data.type !== 'knight-request-fullscreen') return;
    if (typeof infinityArcadeRequestBrowserFullscreen === 'function') {
      infinityArcadeRequestBrowserFullscreen(document.getElementById('inf-arcade-fs'));
    }
  });
  function notifyKnightFs() {
    var frame = document.querySelector('.inf-knight-frame');
    if (!frame || !frame.contentWindow) return;
    try {
      frame.contentWindow.postMessage({ type: 'knight-fs-changed' }, '*');
    } catch (e) {}
  }
  document.addEventListener('fullscreenchange', notifyKnightFs);
  document.addEventListener('webkitfullscreenchange', notifyKnightFs);

  console.log('[Kamuk Hub]', VER, GAMES.length, 'games characters ready');
})(typeof window !== 'undefined' ? window : globalThis);
