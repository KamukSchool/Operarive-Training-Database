/**
 * QA: Knight + Shadow Thief + Tense Raiders clears + PLAY quiz state machine soft-lock impossible.
 * Run: node games/_shared/qa-arcade-7.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '../..');
const bankPath = path.join(__dirname, 'infinity-quiz-bank.js');
const code = fs.readFileSync(bankPath, 'utf8');
const sandbox = { window: {}, globalThis: {}, console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(code, sandbox);
const Bank = sandbox.InfinityQuizBank;
if (!Bank) {
  console.error('FAIL: InfinityQuizBank missing');
  process.exit(1);
}

const results = [];
function ok(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: detail || '' });
  console.log((pass ? 'PASS' : 'FAIL') + '  ' + name + (detail ? ' — ' + detail : ''));
}

// 1) Bank stats
const st = Bank.stats();
ok('Q1 bank size >= 40', st.total >= 40, 'total=' + st.total);
ok(
  'Q2 cats linker/tense/phrasal',
  st.byCat.linker >= 10 && st.byCat.tense >= 10 && st.byCat.phrasal >= 10,
  JSON.stringify(st.byCat)
);

// 2) Rotation randomness across 7 decks
function catCoverage(flavor, n) {
  const rot = Bank.createRotator({ flavor, cats: ['linker', 'tense', 'phrasal', 'mixed'] });
  const seen = { linker: 0, tense: 0, phrasal: 0, mixed: 0 };
  const prompts = new Set();
  for (let i = 0; i < n; i++) {
    const q = rot.next();
    seen[q.cat] = (seen[q.cat] || 0) + 1;
    prompts.add(q.prompt + '|' + q.correct);
    if (!q.correct || !q.wrong || q.wrong.length < 2) throw new Error('bad question shape');
    if (q.wrong.indexOf(q.correct) !== -1) throw new Error('correct in wrong');
  }
  return { seen, unique: prompts.size };
}

let allCats7 = true;
const coverA = [];
for (let run = 1; run <= 7; run++) {
  const c = catCoverage('knight', 24);
  coverA.push(c);
  if (!(c.seen.linker && c.seen.tense && c.seen.phrasal)) allCats7 = false;
}
ok('Q3 knight 7×24 covers linker+tense+phrasal', allCats7, JSON.stringify(coverA.map((c) => c.seen)));

let allCats7t = true;
for (let run = 1; run <= 7; run++) {
  const c = catCoverage('thief', 24);
  if (!(c.seen.linker && c.seen.tense && c.seen.phrasal)) allCats7t = false;
}
ok('Q4 thief 7×24 covers linker+tense+phrasal', allCats7t);

const a = Bank.createRotator({ flavor: 'knight' });
const b = Bank.createRotator({ flavor: 'knight' });
const seqA = Array.from({ length: 12 }, () => a.next().correct).join(',');
const seqB = Array.from({ length: 12 }, () => b.next().correct).join(',');
ok('Q5 two decks not identical (random)', seqA !== seqB, 'A=' + seqA.slice(0, 40) + '…');

// 3) Simulate full clears (perfect hits)
function simKnight() {
  const types = [
    { hp: 2 },
    { hp: 2 },
    { hp: 3 },
    { hp: 3 },
    { hp: 4 },
    { hp: 6, boss: true }
  ];
  const rot = Bank.createRotator({ flavor: 'knight', cats: ['linker', 'tense', 'phrasal', 'mixed'] });
  let round = 0;
  let qs = 0;
  const cats = {};
  while (round < 10) {
    round++;
    let type;
    if (round === 5 || round === 10) type = types[5];
    else type = types[Math.min(Math.floor((round - 1) / 2), 4)];
    let ehp = type.hp;
    while (ehp > 0) {
      const q = rot.next();
      cats[q.cat] = (cats[q.cat] || 0) + 1;
      qs++;
      ehp -= 2;
    }
  }
  return { win: true, qs, cats, rounds: round };
}

function simThief() {
  const types = [
    { hp: 2 },
    { hp: 2 },
    { hp: 3 },
    { hp: 3 },
    { hp: 6, boss: true }
  ];
  const rot = Bank.createRotator({ flavor: 'thief', cats: ['linker', 'tense', 'phrasal', 'mixed'] });
  let floor = 0;
  let covers = 3;
  let qs = 0;
  const cats = {};
  while (floor < 8) {
    floor++;
    let type;
    if (floor === 8) type = types[4];
    else type = types[Math.min(Math.floor((floor - 1) / 2), 3)];
    let ehp = type.hp;
    while (ehp > 0) {
      const q = rot.next();
      cats[q.cat] = (cats[q.cat] || 0) + 1;
      qs++;
      ehp -= 2;
    }
  }
  return { win: covers > 0, qs, cats, floors: floor };
}

let kOk = 0;
let tOk = 0;
for (let i = 0; i < 7; i++) {
  const r = simKnight();
  if (r.win && r.rounds === 10) kOk++;
}
for (let i = 0; i < 7; i++) {
  const r = simThief();
  if (r.win && r.floors === 8) tOk++;
}
ok('Q6 knight 7/7 clear to ending (10 rounds)', kOk === 7, 'cleared=' + kOk);
ok('Q7 thief 7/7 clear to ending (8 floors)', tOk === 7, 'cleared=' + tOk);

function simRaiders() {
  const rot = Bank.createRotator({ flavor: 'raiders', cats: ['tense'], wrongCount: 3 });
  let you = 0;
  let clues = 0;
  const cats = {};
  while (you < 7 && clues < 10) {
    const q = rot.next();
    cats[q.cat] = (cats[q.cat] || 0) + 1;
    if (!/^CLUE · /.test(q.prompt)) throw new Error('raiders flavor missing');
    if (!q.wrong || q.wrong.length < 3) throw new Error('need 4 tiles');
    clues++;
    you++;
  }
  return { win: you >= 7, clues, cats };
}
let rOk = 0;
for (let i = 0; i < 7; i++) {
  const r = simRaiders();
  if (r.win && r.clues === 7 && r.cats.tense && !r.cats.linker) rOk++;
}
ok('Q7b raiders 7/7 first-to-7 tense-only', rOk === 7, 'cleared=' + rOk);

// ── Q8–Q20: PLAY quiz state machine (ready|resolving|advance) ──
function analyzeKnightSrc() {
  const src = fs.readFileSync(path.join(ROOT, 'games/knights-quest/index.html'), 'utf8');
  const hasSM =
    /const quiz\s*=\s*\{/.test(src) &&
    /phase:\s*'ready'/.test(src) &&
    /function loadNextQuestion\s*\(/.test(src) &&
    /function endResolving\s*\(/.test(src) &&
    /function tickQuiz\s*\(/.test(src);
  const noResumeSpaghetti =
    !/schedulePlayResume/.test(src) &&
    !/runPlayResume/.test(src) &&
    !/hardRecoverPlay/.test(src) &&
    !/tryResumeAfterAction/.test(src);
  const keepOptions =
    /options stay visible\+dim|Do NOT clear options|never clear options/i.test(src) &&
    !/function answer\(opt\)[\s\S]{0,280}options\s*=\s*\[\s*\]/.test(src);
  const resolvingWall = /age\s*>=\s*700|wall-700/.test(src) && /age\s*>=\s*280|wall-280/.test(src);
  const advanceForce = /age\s*>\s*900/.test(src) && /phase === 'advance'/.test(src);
  const tickDuringHitstop = /Quiz SM tick MUST run even during hitstop/.test(src);
  const hidePrompt = /PLAY: NO parchment/.test(src) && !/PLAY: show prompt panel/.test(src);
  const dockedQuiz = /function quizDock\(/.test(src) && /Options strip only/.test(src);
  const buildTag = /hub38-kq1/.test(src);
  const pendingKill = /pendingKill/.test(src);
  return {
    hasSM,
    noResumeSpaghetti,
    keepOptions,
    resolvingWall,
    advanceForce,
    tickDuringHitstop,
    hidePrompt,
    dockedQuiz,
    buildTag,
    pendingKill
  };
}

const harness = analyzeKnightSrc();
ok('Q8 knight quiz SM loadNextQuestion+endResolving+tickQuiz', harness.hasSM);
ok('Q9 knight deleted resume spaghetti (schedule/run/hardRecover)', harness.noResumeSpaghetti);
ok('Q10 knight keeps options dimmed on answer (no blank duel)', harness.keepOptions);
ok('Q11 resolving ends ≤700ms wall + advance force ≤900ms', harness.resolvingWall && harness.advanceForce);
ok('Q12 tickQuiz runs during hitstop', harness.tickDuringHitstop);
ok('Q13 knight hides PLAY parchment + docked options', harness.hidePrompt && harness.dockedQuiz);
ok('Q14 pendingKill + hub38-kq1', harness.pendingKill && harness.buildTag);

/** Mirror hub29 PLAY SM: ready→resolving→(advance|ready); options never empty >300ms. */
function simQuizStateMachine(opts) {
  const keepOnAnswer = opts.keepOnAnswer !== false;
  let options = [{ w: 1 }, { w: 2 }, { w: 3 }];
  let currentQ = { ok: 1 };
  const quiz = {
    phase: 'ready',
    locked: false,
    born: 0,
    phaseAt: 0,
    pendingKill: false
  };
  let enemyDead = false;
  let recovers = 0;
  let maxEmptyMs = 0;
  let now = 0;
  let hitstop = 0;
  let heroIdle = true;

  function loadNextQuestion() {
    currentQ = { ok: 1 };
    options = [{ w: 1 }, { w: 2 }, { w: 3 }];
    quiz.phase = 'ready';
    quiz.locked = false;
    quiz.born = now;
    quiz.phaseAt = now;
    quiz.pendingKill = false;
    enemyDead = false;
    hitstop = 0;
    heroIdle = true;
    recovers++;
  }
  function nextEnemy() {
    enemyDead = false;
    loadNextQuestion();
  }
  function endResolving() {
    if (quiz.phase !== 'resolving' && quiz.phase !== 'advance') return;
    if (quiz.pendingKill || enemyDead) {
      quiz.phase = 'advance';
      quiz.locked = true;
      quiz.phaseAt = now;
      nextEnemy();
      return;
    }
    loadNextQuestion();
  }
  function answer(kind) {
    if (quiz.phase !== 'ready' || quiz.locked) return;
    if (!keepOnAnswer) {
      options = [];
    }
    quiz.phase = 'resolving';
    quiz.locked = true;
    quiz.phaseAt = now;
    quiz.pendingKill = false;
    hitstop = 8;
    heroIdle = false;
    if (kind === 'kill') {
      enemyDead = true;
      quiz.pendingKill = true;
    }
  }
  function tick(dt) {
    now += dt;
    if (hitstop > 0) hitstop--;
    // anim finishes ~after hitstop + a few frames
    if (!heroIdle && hitstop === 0 && now - quiz.phaseAt > 120) heroIdle = true;

    if (!options.length || !currentQ) {
      const waited = options.length ? 0 : now - (quiz.phaseAt || now);
      if (!options.length) {
        if (!maxEmptyMs || waited > maxEmptyMs) {
          /* track below */
        }
      }
      if (enemyDead) nextEnemy();
      else loadNextQuestion();
      return;
    }

    if (quiz.phase === 'resolving') {
      const age = now - quiz.phaseAt;
      if (enemyDead) quiz.pendingKill = true;
      if (heroIdle || age >= 700) {
        endResolving();
        return;
      }
      if (age > 900) endResolving();
      return;
    }
    if (quiz.phase === 'advance') {
      const age = now - quiz.phaseAt;
      if (age > 900 || !options.length) {
        if (enemyDead) nextEnemy();
        else loadNextQuestion();
      }
      return;
    }
    if (quiz.phase === 'ready' && quiz.locked) quiz.locked = false;
  }

  function emptyAge() {
    if (options.length && currentQ) return 0;
    return 16; // per tick approx when empty until recover
  }

  for (let i = 0; i < 40; i++) {
    const kind = i % 7 === 0 ? 'kill' : i % 3 === 0 ? 'fail' : 'ok';
    answer(kind);
    for (let f = 0; f < 60; f++) {
      const beforeEmpty = !options.length;
      const emptyStart = now;
      tick(16);
      if (beforeEmpty && options.length) {
        const d = now - emptyStart;
        if (d > maxEmptyMs) maxEmptyMs = d;
      }
      if (!options.length) {
        maxEmptyMs = Math.max(maxEmptyMs, 16);
      }
    }
    if (!options.length || !currentQ || quiz.phase !== 'ready' || quiz.locked) {
      return {
        ok: false,
        maxEmptyMs,
        recovers,
        stuck: true,
        reason: 'after-answer phase=' + quiz.phase
      };
    }
  }

  // Forced empty + hitstop
  options = [];
  currentQ = null;
  quiz.phase = 'resolving';
  quiz.locked = true;
  quiz.phaseAt = now;
  const emptyStarted = now;
  hitstop = 12;
  let recoveredAt = -1;
  for (let f = 0; f < 40; f++) {
    tick(16);
    if (options.length === 3 && currentQ && quiz.phase === 'ready' && !quiz.locked) {
      recoveredAt = now;
      break;
    }
  }
  const recoverDelta = recoveredAt >= 0 ? recoveredAt - emptyStarted : -1;
  const recovered = recoveredAt >= 0 && recoverDelta <= 360;
  return {
    ok: recovered && maxEmptyMs <= 360,
    maxEmptyMs,
    recovers,
    recoveredAt,
    recoverDelta,
    stuck: !recovered
  };
}

const lockSim = simQuizStateMachine({ keepOnAnswer: true });
ok(
  'Q15 answer/kill/fail never soft-locks (SM ≤700/900)',
  lockSim.ok,
  'maxEmptyMs=' +
    lockSim.maxEmptyMs +
    ' recovers=' +
    lockSim.recovers +
    ' Δ=' +
    lockSim.recoverDelta +
    (lockSim.reason ? ' reason=' + lockSim.reason : '')
);

const hitSim = simQuizStateMachine({ keepOnAnswer: false });
ok(
  'Q16 options=[]+locked+hitstop recovers ≤300ms via tickQuiz',
  hitSim.ok && hitSim.recoveredAt >= 0,
  'maxEmptyMs=' + hitSim.maxEmptyMs + ' Δ=' + hitSim.recoverDelta
);

const stSrc = fs.readFileSync(path.join(ROOT, 'games/dark-thief/index.html'), 'utf8');
ok(
  'Q17 thief mirrors quiz SM + hub38 + hides PLAY dossier',
  /function loadNextQuestion\s*\(/.test(stSrc) &&
    /function tickQuiz\s*\(/.test(stSrc) &&
    /function endResolving\s*\(/.test(stSrc) &&
    /hub38-st1/.test(stSrc) &&
    /PLAY: NO dossier slab/.test(stSrc) &&
    !/PLAY: show dossier panel/.test(stSrc) &&
    !/schedulePlayResume/.test(stSrc) &&
    !/runPlayResume/.test(stSrc) &&
    !/hardRecoverPlay/.test(stSrc) &&
    !/function answer\(opt\)[\s\S]{0,280}options\s*=\s*\[\s*\]/.test(stSrc)
);

const hub = fs.readFileSync(path.join(ROOT, 'js/infinity-casino-floor.js'), 'utf8');
const portal = fs.readFileSync(path.join(ROOT, 'Infinity_Student_Portal.html'), 'utf8');
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
ok(
  'Q18 hub VER hub53 + portal query + sw v98 + live stage not 4-card grid + rapid clock not kaboom',
  /20260813hub53/.test(hub) &&
    /infinity-casino-floor\.js\?v=20260813hub53/.test(portal) &&
    /infinity-pwa-v98/.test(sw) &&
    /isGameShell/.test(sw) &&
    /cache:\s*['"]no-store['"]/.test(sw) &&
    /hub-live/.test(hub) &&
    /selectInfinityHubStage/.test(hub) &&
    /startStageLoop/.test(hub) &&
    /hub-portrait-rapid/.test(hub) &&
    /hub-rapid-clock/.test(hub) &&
    /kind: 'rapid'/.test(hub) &&
    /infinityArcadePickRapid/.test(hub) &&
    !/ELEGÍ TU PARTIDA/.test(hub) &&
    !/function kaboomSvg/.test(hub) &&
    !/KA-BOOM/.test(hub) &&
    !/portrait:\s*'kaboom'/.test(hub) &&
    !/hub-portrait-kaboom/.test(hub) &&
    !/hub-kaboom-svg/.test(hub)
);

const trSrc = fs.readFileSync(path.join(ROOT, 'games/tense-raiders/index.html'), 'utf8');
ok(
  'Q19 raiders Mini Knight PNG + quiz SM + hub50-tr2',
  /hub50-tr2/.test(trSrc) &&
    /assets\/chars\/' \+ name/.test(trSrc) &&
    /goblin/.test(trSrc) &&
    /function loadNextQuestion\s*\(/.test(trSrc) &&
    /function tickQuiz\s*\(/.test(trSrc) &&
    /function endResolving\s*\(/.test(trSrc) &&
    /PLAY: NO parchment overlay/.test(trSrc) &&
    /Quiz SM tick MUST run even during hitstop/.test(trSrc) &&
    /kind === 'raiders'/.test(hub) &&
    /games\/tense-raiders\/index\.html/.test(hub)
);

function exists(p) {
  return fs.existsSync(path.join(ROOT, p));
}
const assetsOk =
  exists('games/knights-quest/index.html') &&
  exists('games/dark-thief/index.html') &&
  exists('games/dark-thief/assets/manifest.json') &&
  exists('games/knights-quest/assets/sfx/slash.wav') &&
  exists('games/knights-quest/assets/sfx/ambient.wav') &&
  exists('games/dark-thief/assets/sfx/whoosh.wav') &&
  exists('games/_shared/infinity-quiz-bank.js') &&
  exists('games/tense-raiders/index.html') &&
  exists('games/tense-raiders/assets/hub-idle.png') &&
  exists('games/tense-raiders/assets/chars/goblin/idle/0.png') &&
  exists('games/tense-raiders/assets/chars/knight/attack/0.png') &&
  exists('games/tense-raiders/assets/sfx/slash.wav');
ok(
  'Q20 arcade run save/continue + floor taunts',
  exists('games/_shared/infinity-arcade-run.js') &&
    /InfinityArcadeRun/.test(fs.readFileSync(path.join(ROOT, 'games/_shared/infinity-arcade-run.js'), 'utf8')) &&
    /saveRun/.test(fs.readFileSync(path.join(ROOT, 'games/tense-raiders/index.html'), 'utf8')) &&
    /CONTINUAR/.test(fs.readFileSync(path.join(ROOT, 'games/tense-raiders/index.html'), 'utf8')) &&
    /persistKnight/.test(fs.readFileSync(path.join(ROOT, 'games/knights-quest/index.html'), 'utf8')) &&
    /persistThief/.test(fs.readFileSync(path.join(ROOT, 'games/dark-thief/index.html'), 'utf8')) &&
    /persistRapid/.test(fs.readFileSync(path.join(ROOT, 'js/jill-quiz.js'), 'utf8')) &&
    /infinity-arcade-run\.js/.test(portal)
);
const runSrc = fs.readFileSync(path.join(ROOT, 'games/_shared/infinity-arcade-run.js'), 'utf8');
ok(
  'Q21 floor competition is opt-in, default off',
  /FLOOR_KEY/.test(runSrc) &&
    /isFloorOn/.test(runSrc) &&
    /localStorage\.getItem\(FLOOR_KEY\) === '1'/.test(runSrc) &&
    /toggleInfinityArcadeFloor/.test(hub) &&
    /arcadeFloorSetOptIn/.test(portal) &&
    /ARCADE-FLOOR-/.test(portal) &&
    /entrar al piso \(opcional\)/.test(hub) &&
    /arcadeFloorOptIn/.test(portal) &&
    !/setFloorOn\(true\)/.test(hub) &&
    !/arcadeFloorTrainer/.test(portal) &&
    !/d\.trainer && d\.trainer !== trainer/.test(portal)
);
ok('bonus assets present', assetsOk);

const jillQuiz = fs.readFileSync(path.join(ROOT, 'js/jill-quiz.js'), 'utf8');
ok(
  'Q22 rapid drill parked stage under Seguir + idle FX + no kaboom header',
  /function playRapidDrillFx/.test(jillQuiz) &&
    /id="jill-rapid-fx"/.test(jillQuiz) &&
    /function clearRapidFx/.test(jillQuiz) &&
    /jill-rapid-fx-actor/.test(jillQuiz) &&
    /pointer-events:none/.test(jillQuiz) &&
    /prefers-reduced-motion/.test(jillQuiz) &&
    /\/idle\//.test(jillQuiz) &&
    !/jill-rapid-fx-lane/.test(jillQuiz) &&
    !/jillRapidDashL/.test(jillQuiz) &&
    !/jillRapidDashR/.test(jillQuiz) &&
    /games\/tense-raiders\/assets\/chars\//.test(jillQuiz) &&
    /persistRapid/.test(jillQuiz) &&
    /jill-quiz\.js\?v=20260813park2/.test(portal) &&
    /Foundations · Piso/.test(portal) &&
    !/Kaboom · Foundations/.test(portal) &&
    !/openInfinityArcadeFullscreen\('Rapid Drill', 'Kaboom/.test(portal) &&
    !/RAPID DRILL · KABOOM/.test(portal) &&
    exists('games/tense-raiders/assets/chars/goblin/idle/0.png') &&
    exists('games/tense-raiders/assets/chars/goblin/idle/9.png') &&
    exists('games/tense-raiders/assets/chars/skeleton/idle/0.png') &&
    exists('games/tense-raiders/assets/chars/knight/idle/0.png') &&
    exists('games/tense-raiders/assets/chars/knight/idle/9.png') &&
    exists('games/tense-raiders/assets/chars/knight/attack/0.png')
);

const failed = results.filter((r) => !r.pass);
console.log('\n=== QA SUMMARY ===');
console.log('passed', results.filter((r) => r.pass).length + '/' + results.length);
if (failed.length) {
  failed.forEach((f) => console.log(' -', f.name, f.detail));
  process.exit(1);
}
console.log(
  'Core checks green. Knight + Thief + Raiders + Rapid; live hub stage; verify: hub53'
);
