(function () {
  'use strict';

  var PROGRAM = {
    label: 'Foundation 01 · New hire orientation',
    title: 'Welcome to Kamuk Holdings',
    intro: 'First learn who we are and how we serve. Then learn our products, certify your understanding, and practise inside a safe guided CRM before nesting.'
  };

  var STEPS = [
    { id: 'welcome', label: 'Welcome', icon: 'building-bank' },
    { id: 'service', label: 'Service', icon: 'heart-handshake' },
    { id: 'practice', label: 'Practice', icon: 'puzzle' },
    { id: 'products', label: 'Products', icon: 'briefcase' },
    { id: 'quiz', label: 'Certification', icon: 'certificate' },
    { id: 'mock', label: 'Guided CRM', icon: 'device-desktop' },
    { id: 'nesting', label: 'Nesting', icon: 'headset' }
  ];

  var QUIZ = {
    pass: 5,
    questions: [
      {
        q: 'What is our role when a client contacts the desk?',
        options: ['Understand the impact, investigate, act safely and set a clear next step.', 'Apologize until the client calms down.', 'Transfer every difficult request to a supervisor.'],
        answer: 0,
        why: 'Service is ownership plus action. An apology without investigation or a next step does not solve anything.'
      },
      {
        q: 'Which response demonstrates empathy rather than sympathy?',
        options: ['"You have called three times and still cannot pay your suppliers. I understand why this is urgent."', '"I feel so sorry for you; that is terrible."', '"Do not worry, everything will be fine."'],
        answer: 0,
        why: 'Empathy names the client’s specific impact. Sympathy expresses your feelings and can sound distant or patronizing.'
      },
      {
        q: 'What is the purpose of rapport?',
        options: ['Create enough trust for the client to share facts and work with you.', 'Make the client like you before you discuss the problem.', 'Have a long friendly conversation before opening the account.'],
        answer: 0,
        why: 'Rapport is professional trust, not friendship or small talk.'
      },
      {
        q: 'The client says: "This is the third time I call." What is the strongest opening?',
        options: ['"You have had to repeat this three times. I will review the previous contacts first so you do not start again."', '"I am very sorry, but I just received your call."', '"Can you explain everything from the beginning?"'],
        answer: 0,
        why: 'Use the history already available and remove effort from the client.'
      },
      {
        q: 'Which product is designed for daily business money movement?',
        options: ['Operating Account', 'Obsidian Corporate Card', 'Expansion Financing'],
        answer: 0,
        why: 'The Operating Account supports deposits, supplier payments, payroll and transfers.'
      },
      {
        q: 'What should you do before promising a solution?',
        options: ['Open the client profile and verify the evidence in the CRM.', 'Use your memory of a similar case.', 'Ask the client which solution they prefer and promise that one.'],
        answer: 0,
        why: 'The CRM is the source of truth. Promise only what the evidence and your authority support.'
      }
    ]
  };

  var HOME_CASES = [
    { id: 'hc1', title: 'Duplicate restaurant charge', line: '“I paid once, but you charged me twice. Remove it today.”', facts: '$180 twice · four minutes apart · same merchant', connectors: ['because', 'however'], family: ['authorize', 'authorization', 'unauthorized'], phrasal: 'look into', vocab: ['duplicate charge', 'merchant', 'dispute', 'timeline'] },
    { id: 'hc2', title: 'Card declined at hotel check-in', line: '“Everyone is watching me. Fix my card now.”', facts: 'Miami hotel · no travel notice · geographic fraud rule', connectors: ['because', 'therefore'], family: ['verify', 'verification', 'unverified'], phrasal: 'sort out', vocab: ['decline', 'travel notice', 'limit', 'available'] },
    { id: 'hc3', title: 'Subscription charged after cancellation', line: '“I cancelled four months ago. Block this company.”', facts: '$49 monthly · four charges · cancellation email available', connectors: ['although', 'in addition'], family: ['cancel', 'cancellation', 'cancelled'], phrasal: 'follow up', vocab: ['recurring payment', 'merchant block', 'evidence', 'chargeback'] },
    { id: 'hc4', title: 'Six unauthorized ATM withdrawals', line: '“The card is in my hand. Is my money gone?”', facts: 'Six withdrawals · $3,000 total · another city', connectors: ['because', 'however'], family: ['authorize', 'authorization', 'unauthorized'], phrasal: 'look into', vocab: ['provisional credit', 'block', 'replacement card', 'investigation'] },
    { id: 'hc5', title: 'Hotel service not provided', line: '“The hotel says the bank must solve it.”', facts: '$1,200 · no room provided · merchant refuses refund', connectors: ['although', 'therefore'], family: ['resolve', 'resolution', 'unresolved'], phrasal: 'sort out', vocab: ['service not rendered', 'booking confirmation', 'evidence', 'merchant response'] },
    { id: 'hc6', title: 'Client demands an instant refund', line: '“Another bank refunds in 24 hours. Are you worse?”', facts: 'Valid fraud claim · provisional credit takes two business days', connectors: ['however', 'in addition'], family: ['comply', 'compliance', 'non-compliant'], phrasal: 'follow up', vocab: ['provisional credit', 'confirmation', 'case number', 'business day'] },
    { id: 'hc7', title: 'Dispute reported after 90 days', line: '“It is still theft. Are you doing nothing?”', facts: 'Unauthorized charge · 90 days old · reporting limit is 60 days', connectors: ['because', 'although'], family: ['eligible', 'eligibility', 'ineligible'], phrasal: 'look into', vocab: ['reporting window', 'statement date', 'alternative', 'internal report'] },
    { id: 'hc8', title: 'Client demands a guarantee', line: '“Promise me I am going to win the dispute.”', facts: 'Claim filed correctly · evidence attached · network decides', connectors: ['however', 'therefore'], family: ['decide', 'decision', 'undecided'], phrasal: 'follow up', vocab: ['outcome', 'network', 'evidence', 'deadline'] },
    { id: 'hc9', title: 'Merchant already issued a refund', line: '“Keep the claim open anyway, just in case.”', facts: '$620 refund posted · open dispute could create double credit', connectors: ['because', 'in addition'], family: ['resolve', 'resolution', 'unresolved'], phrasal: 'sort out', vocab: ['refund', 'double credit', 'withdraw', 'reopen'] },
    { id: 'hc10', title: 'Flight leaves in 12 hours', line: '“A physical card in five days is useless.”', facts: 'Fraud block · flight at 6 a.m. · virtual card available', connectors: ['therefore', 'however'], family: ['activate', 'activation', 'inactive'], phrasal: 'sort out', vocab: ['virtual card', 'travel notice', 'cash access', 'limitation'] }
  ];

  var MOCK_TASKS = [
    { target: 'client-rivera', prompt: 'A client named Marta Rivera is calling. Click her name in the case queue.', tip: 'Look at the left side of the mock desk.', panel: 'overview' },
    { target: 'tab-services', prompt: 'Where can you see all products owned by this client? Click the correct CRM tab.', tip: 'Products are grouped under Services.', panel: 'services' },
    { target: 'product-operating', prompt: 'Which product handles supplier payments and payroll? Click that product.', tip: 'Look for the Operating Account.', panel: 'account' },
    { target: 'tab-statements', prompt: 'The client asks why a supplier was not paid. Where do you look for the transaction?', tip: 'Open the transaction history.', panel: 'statements' },
    { target: 'tx-declined', prompt: 'Locate the failed supplier payment and click it.', tip: 'The status is shown in red.', panel: 'transaction' },
    { target: 'tab-cards', prompt: 'Now find the client’s corporate card and check whether it can be used.', tip: 'Open Card transactions.', panel: 'cards' },
    { target: 'card-status', prompt: 'Click the card status to confirm whether the card is active.', tip: 'The status appears beside the card name.', panel: 'card-detail' },
    { target: 'tab-contacts', prompt: 'The client says this is her third call. Where do you verify that history?', tip: 'Open Previous contacts.', panel: 'contacts' },
    { target: 'contact-latest', prompt: 'Open the most recent contact and identify what was promised.', tip: 'The latest contact is at the top.', panel: 'contact-detail' },
    { target: 'tab-note', prompt: 'You have enough evidence. Open Internal note to document what you found.', tip: 'Internal notes are visible to the bank, not the client.', panel: 'note' },
    { target: 'note-box', prompt: 'Click the note field and review the professional summary.', tip: 'A useful note contains evidence, action and the next step.', panel: 'note' },
    { target: 'save-note', prompt: 'Save the internal note to finish the guided tour.', tip: 'This saves only inside this training mock.', panel: 'complete' }
  ];

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function stateKey(product, studentId) {
    var sid = String(studentId || '').trim();
    return 'simulationOnboarding:' + product + ':' + (sid || 'guest') + ':foundation-v2';
  }

  function readState(product, studentId) {
    var base = { done: [], step: 'welcome', game: {}, mockIndex: 0, homeAnswers: {} };
    try {
      var parsed = JSON.parse(localStorage.getItem(stateKey(product, studentId)) || 'null');
      if (!parsed || !Array.isArray(parsed.done)) return base;
      parsed.homeAnswers = parsed.homeAnswers && typeof parsed.homeAnswers === 'object' ? parsed.homeAnswers : {};
      return parsed;
    } catch (error) {
      return base;
    }
  }

  function writeState(product, studentId, state) {
    try { localStorage.setItem(stateKey(product, studentId), JSON.stringify(state)); } catch (error) { /* local preview still works */ }
  }

  function styles(accent) {
    var style = document.getElementById('simulation-onboarding-styles') || document.createElement('style');
    style.id = 'simulation-onboarding-styles';
    style.textContent = css(accent);
    if (!style.parentNode) document.head.appendChild(style);
  }

  function css(accent) {
    return [
      '.ob{max-width:920px;margin:0 auto 18px;font-family:Inter,Arial,sans-serif;}',
      '.ob-head{background:linear-gradient(135deg,' + accent + ',#0f172a);border-radius:16px;padding:20px 22px;color:#fff;box-shadow:0 10px 32px rgba(15,23,42,.16);}',
      '.ob-head small{font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;opacity:.75}.ob-head h2{margin:5px 0 6px;font-size:22px}.ob-head p{margin:0;font-size:13px;line-height:1.6;opacity:.9}',
      '.ob-rail{display:flex;gap:6px;margin:12px 0;overflow-x:auto}.ob-step{min-width:84px;flex:1;background:#fff;border:1px solid #dce3ea;border-radius:11px;padding:10px 6px;text-align:center;cursor:pointer}.ob-step.locked{opacity:.45;cursor:not-allowed}.ob-step.on{border-color:' + accent + ';box-shadow:0 4px 14px rgba(15,23,42,.09)}.ob-step i{font-size:18px;color:' + accent + '}.ob-step.done i{color:#15803d}.ob-step span{display:block;margin-top:3px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#475569}',
      '.ob-panel{background:#fff;border:1px solid #dce3ea;border-radius:14px;padding:20px}.ob-panel h3{margin:0 0 4px;font-size:18px;color:#102033}.ob-lead{margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.6}',
      '.ob-video{display:flex;gap:13px;align-items:center;background:#0f172a;border-radius:12px;padding:14px 16px;color:#fff;margin-bottom:16px}.ob-video i{font-size:30px}.ob-video b{display:block;font-size:13px}.ob-video span{font-size:11px;opacity:.7}',
      '.ob-b{margin-bottom:16px}.ob-b h4{margin:0 0 6px;font-size:10px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:' + accent + '}.ob-b p,.ob-b li{font-size:13px;line-height:1.65;color:#334155}.ob-b p{margin:0}.ob-b ul{margin:0;padding-left:17px}',
      '.ob-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.ob-card{border:1px solid #e2e8f0;border-radius:11px;padding:12px}.ob-card i{font-size:20px;color:' + accent + '}.ob-card b{display:block;margin:5px 0 3px;font-size:13px;color:#102033}.ob-card p{font-size:12px;line-height:1.55;color:#64748b;margin:0}',
      '.ob-compare{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ob-compare>div{border-radius:10px;padding:12px}.ob-empathy{background:#f0fdf4;color:#166534}.ob-sympathy{background:#fff7ed;color:#9a3412}.ob-compare b{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px}.ob-compare p{margin:0;font-size:12.5px;line-height:1.6}',
      '.ob-game{border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:11px}.ob-game h5{margin:0 0 5px;font-size:13px;color:#102033}.ob-game>p{margin:0 0 10px;font-size:12px;color:#64748b}.ob-choice{display:block;width:100%;text-align:left;border:1px solid #d8e0e8;background:#fff;border-radius:9px;padding:9px 11px;margin:6px 0;font:600 12px/1.5 Inter,Arial,sans-serif;color:#334155;cursor:pointer}.ob-choice:hover{border-color:' + accent + '}.ob-choice.right{border-color:#15803d;background:#f0fdf4;color:#14532d}.ob-choice.wrong{border-color:#b42318;background:#fef2f2;color:#7f1d1d}.ob-feedback{font-size:12px;line-height:1.5;color:#475569;margin-top:8px;min-height:18px}',
      '.ob-process{display:flex;gap:7px;align-items:stretch;margin:12px 0 18px;overflow-x:auto}.ob-process div{min-width:105px;flex:1;background:#f8fafc;border-radius:10px;padding:10px;text-align:center}.ob-process b{display:block;font-size:11px;color:#102033}.ob-process span{font-size:10px;color:#64748b}.ob-arrow{align-self:center;color:#94a3b8}',
      '.ob-product{border:1px solid #e2e8f0;border-radius:11px;padding:12px}.ob-product b{display:block;font-size:13px;color:#102033}.ob-product small{display:block;color:' + accent + ';font-weight:800;margin:3px 0}.ob-product p{margin:0;font-size:12px;line-height:1.5;color:#64748b}',
      '.ob-q{border:1px solid #e2e8f0;border-radius:12px;padding:13px 14px;margin-bottom:10px}.ob-q h5{margin:0 0 9px;font-size:13px;color:#102033;line-height:1.5}.ob-opt{display:flex;gap:9px;border:1px solid #d8e0e8;border-radius:9px;padding:9px 11px;margin-bottom:6px;cursor:pointer;font-size:12px;line-height:1.5;color:#334155}.ob-opt input{margin-top:2px}.ob-q.right .picked{border-color:#15803d;background:#f0fdf4}.ob-q.wrong .picked{border-color:#b42318;background:#fef2f2}.ob-q.wrong .key{border-color:#15803d;background:#f0fdf4}.ob-why{display:none;font-size:12px;color:#475569;margin-top:7px}.ob-q.right .ob-why,.ob-q.wrong .ob-why{display:block}',
      '.ob-foot{display:flex;gap:10px;align-items:center;margin-top:16px;flex-wrap:wrap}.ob-btn{border:0;border-radius:9px;padding:11px 17px;background:' + accent + ';color:#fff;font:800 13px Inter,Arial,sans-serif;cursor:pointer}.ob-btn:disabled{opacity:.45}.ob-msg{font-size:12px;font-weight:700;color:#64748b}.ob-msg.ok{color:#15803d}.ob-msg.err{color:#b42318}.ob-cert{display:flex;gap:10px;align-items:center;background:#f0fdf4;border-radius:10px;padding:12px;color:#14532d;margin-bottom:13px}.ob-cert i{font-size:24px}.ob-cert b{font-size:13px}.ob-cert span{display:block;font-size:11px}',
      '.ob-home-head{margin-top:18px;padding-top:16px;border-top:1px solid #e2e8f0}.ob-home-head h4{margin:0 0 5px;color:#102033}.ob-home-head p{margin:0;font-size:12px;line-height:1.55;color:#64748b}.ob-home-progress{margin:10px 0;font-size:11px;font-weight:800;color:' + accent + '}.ob-home-case{border:1px solid #e2e8f0;border-radius:11px;margin:9px 0;overflow:hidden}.ob-home-top{padding:11px 12px;background:#f8fafc;cursor:pointer;display:flex;gap:9px;align-items:center}.ob-home-top b{font-size:12px;color:#102033}.ob-home-top span{margin-left:auto;font-size:10px;color:#64748b}.ob-home-body{display:none;padding:12px}.ob-home-case.open .ob-home-body{display:block}.ob-home-line{border-left:3px solid ' + accent + ';padding:8px 10px;background:#f8fafc;font-size:12px;color:#334155;margin:8px 0}.ob-home-rules{font-size:11px;line-height:1.55;color:#475569;margin:8px 0}.ob-home-chips{display:flex;gap:5px;flex-wrap:wrap;margin:7px 0}.ob-home-chip{background:#eef2ff;color:#3730a3;border-radius:20px;padding:3px 7px;font-size:9px;font-weight:800}.ob-home-answer{width:100%;box-sizing:border-box;min-height:150px;border:1px solid #cbd5e1;border-radius:9px;padding:11px;font:12px/1.6 Inter,Arial,sans-serif;resize:vertical}.ob-home-answer:focus{outline:2px solid rgba(43,126,193,.18);border-color:' + accent + '}.ob-home-status{font-size:10px;font-weight:700;color:#64748b;margin-top:6px}.ob-home-status.ok{color:#15803d}.ob-no-paste{font-size:10px;color:#b45309;margin-top:5px}',
      '.gm{border:1px solid #cbd5e1;border-radius:13px;overflow:hidden;background:#f8fafc}.gm-guide{display:flex;gap:12px;align-items:flex-start;background:#fff8cc;border-bottom:1px solid #f0cf50;padding:13px 15px}.gm-guide .gm-n{width:28px;height:28px;border-radius:50%;background:#eab308;color:#422006;display:grid;place-items:center;font-weight:900;flex:0 0 auto}.gm-guide b{display:block;font-size:13px;color:#422006}.gm-guide p{margin:3px 0 0;font-size:12px;line-height:1.5;color:#713f12}.gm-shell{display:grid;grid-template-columns:190px 1fr;min-height:410px}.gm-side{background:#1e1b4b;color:#fff;padding:12px}.gm-brand{font-size:11px;font-weight:900;margin-bottom:13px}.gm-label{font-size:9px;text-transform:uppercase;letter-spacing:.08em;opacity:.55;margin:9px 0 5px}.gm-client{padding:9px;border-radius:8px;font-size:11px;cursor:pointer;margin-bottom:5px}.gm-client b{display:block}.gm-client span{font-size:9px;opacity:.7}.gm-main{min-width:0}.gm-top{padding:11px 13px;background:#fff;border-bottom:1px solid #e2e8f0}.gm-top b{font-size:13px;color:#102033}.gm-top span{display:block;font-size:10px;color:#64748b}.gm-tabs{display:flex;gap:2px;padding:7px 8px;background:#fff;border-bottom:1px solid #e2e8f0;overflow-x:auto}.gm-tab{white-space:nowrap;border:0;background:transparent;border-radius:6px;padding:7px 8px;font:700 9px Inter,Arial,sans-serif;color:#64748b;cursor:pointer}.gm-view{padding:13px}.gm-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.gm-metric,.gm-product,.gm-row,.gm-contact{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:9px}.gm-metric small,.gm-product small{display:block;font-size:8px;color:#64748b;text-transform:uppercase}.gm-metric b{font-size:14px;color:#102033}.gm-product{margin-bottom:7px;cursor:pointer}.gm-product b{display:block;font-size:11px;color:#102033}.gm-product span{font-size:9px;color:#64748b}.gm-row,.gm-contact{display:flex;justify-content:space-between;gap:8px;margin-bottom:6px;font-size:10px;color:#334155;cursor:pointer}.gm-red{color:#b42318;font-weight:800}.gm-green{color:#15803d;font-weight:800}.gm-note{width:100%;box-sizing:border-box;min-height:74px;border:1px solid #cbd5e1;border-radius:8px;padding:9px;font:11px Inter,Arial,sans-serif}.gm-save{margin-top:7px;border:0;border-radius:7px;padding:8px 11px;background:#475569;color:#fff;font:800 10px Inter,Arial,sans-serif;cursor:pointer}.gm-target{position:relative;z-index:1;outline:4px solid #facc15!important;background:#fef9c3!important;color:#422006!important;animation:gmPulse 1s infinite alternate}.gm-target:after{content:\"CLICK HERE\";position:absolute;z-index:3;right:2px;top:-16px;background:#eab308;color:#422006;border-radius:4px;padding:2px 5px;font:900 7px Inter,Arial,sans-serif}.gm-wrong{animation:gmShake .25s}.gm-complete{text-align:center;padding:70px 20px}.gm-complete i{font-size:44px;color:#15803d}.gm-complete h4{margin:8px 0 3px;color:#14532d}.gm-complete p{font-size:12px;color:#64748b}',
      '.ob-locked{text-align:center;padding:35px 15px;color:#64748b}.ob-locked i{font-size:34px;color:#cbd5e1}.ob-locked p{font-size:13px;line-height:1.6}',
      '@keyframes gmPulse{to{outline-color:#eab308;box-shadow:0 0 14px #facc15}}@keyframes gmShake{25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}',
      '@media(max-width:700px){.ob-grid,.ob-compare{grid-template-columns:1fr}.gm-shell{grid-template-columns:120px 1fr}.gm-side{padding:8px}.gm-tabs{max-width:calc(100vw - 190px)}.gm-metrics{grid-template-columns:1fr}.ob-panel{padding:14px}}'
    ].join('');
  }

  function mount(root, config) {
    if (!root) return;
    config = config || {};
    var product = config.product === 'kamuk' ? 'kamuk' : 'infinity';
    var accent = product === 'kamuk' ? '#2B7EC1' : '#5B21B6';
    var accessRoot = config.accessRoot || null;
    var launchUrl = String(config.launchUrl || (product === 'kamuk' ? 'kamuk-holdings-crm.html' : 'infinity-holdings-crm.html'));
    var studentId = String(config.studentId || '').trim();
    var apiBase = String(config.apiBase || (typeof INFINITY_API !== 'undefined' ? INFINITY_API : 'https://alice-by-infinity.onrender.com')).replace(/\/$/, '');
    var crmBase = product === 'kamuk' ? '/kamuk-holdings/crm' : '/infinity-holdings/crm';
    var state = readState(product, studentId);
    var quizPicks = {};
    var nestingCompletedAt = null;
    var syncTimer = null;
    var syncing = false;
    styles(accent);

    function unlocked(id) {
      var index = STEPS.map(function (s) { return s.id; }).indexOf(id);
      return index === 0 || state.done.indexOf(STEPS[index - 1].id) >= 0;
    }

    function authToken() {
      return (typeof getAuthToken === 'function' && getAuthToken())
        || localStorage.getItem('infinity_auth_token')
        || sessionStorage.getItem('infinity_auth_token')
        || '';
    }

    function trainingPayload() {
      return { done: state.done.slice(), homeAnswers: state.homeAnswers || {} };
    }

    function localNestingReady() {
      var required = ['welcome', 'service', 'practice', 'products', 'quiz', 'mock'];
      if (required.some(function (step) { return state.done.indexOf(step) < 0; })) return false;
      return HOME_CASES.every(function (item) {
        return homeAnswerStatus(item, (state.homeAnswers && state.homeAnswers[item.id]) || '').ready;
      });
    }

    function deskUnlocked() {
      return Boolean(nestingCompletedAt) || localNestingReady();
    }

    async function api(path, options) {
      options = options || {};
      var token = authToken();
      var response = await fetch(apiBase + path, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {})
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(data.error || ('HTTP ' + response.status));
      return data;
    }

    async function pullProgress() {
      if (!studentId || !authToken()) return;
      try {
        var data = await api(crmBase + '/training/progress');
        if (Array.isArray(data.done) && data.done.length) {
          data.done.forEach(function (step) {
            if (state.done.indexOf(step) < 0) state.done.push(step);
          });
        }
        if (data.homeStatus && state.homeAnswers) {
          /* keep local typed answers; server validates on push */
        }
        nestingCompletedAt = data.nestingCompletedAt || nestingCompletedAt;
        writeState(product, studentId, state);
      } catch (error) { /* offline training book still works locally */ }
    }

    async function pushProgress() {
      if (!studentId || !authToken() || syncing) return;
      syncing = true;
      try {
        var data = await api(crmBase + '/training/progress', { method: 'POST', body: trainingPayload() });
        nestingCompletedAt = data.nestingCompletedAt || nestingCompletedAt;
        return data;
      } finally {
        syncing = false;
      }
    }

    function scheduleSync() {
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(function () { pushProgress().catch(function () {}); }, 500);
    }

    function save() {
      writeState(product, studentId, state);
      scheduleSync();
    }
    function complete(id) { if (state.done.indexOf(id) < 0) state.done.push(id); save(); }
    function go(id) { state.step = id; save(); render(); }

    function rail() {
      return '<div class="ob-rail">' + STEPS.map(function (step) {
        var done = state.done.indexOf(step.id) >= 0;
        var open = unlocked(step.id);
        return '<div class="ob-step' + (done ? ' done' : '') + (state.step === step.id ? ' on' : '') + (open ? '' : ' locked') + '" data-step="' + step.id + '">'
          + '<i class="ti ti-' + (done ? 'circle-check' : (open ? step.icon : 'lock')) + '"></i><span>' + step.label + '</span></div>';
      }).join('') + '</div>';
    }

    function panelShell(title, lead, body) {
      return '<div class="ob-panel"><h3>' + title + '</h3><p class="ob-lead">' + lead + '</p>' + body + '</div>';
    }

    function welcomePanel() {
      return panelShell('Welcome — who we are', 'Before products and policies, understand the company, your role and the promise we make to every client.',
        '<div class="ob-video"><i class="ti ti-player-play"></i><div><b>Welcome to Kamuk Holdings</b><span>3:00 · culture, purpose and the client promise</span></div></div>'
        + '<div class="ob-b"><h4>Who we are</h4><p>Kamuk Holdings is a simulated financial services company serving businesses, executives and international clients. In this program, you are not pretending to know banking: you are learning how a professional investigates, communicates, decides and documents in English.</p></div>'
        + '<div class="ob-b"><h4>What we do</h4><div class="ob-grid">'
        + '<div class="ob-card"><i class="ti ti-user-heart"></i><b>Protect the client</b><p>Keep money, access and private information safe.</p></div>'
        + '<div class="ob-card"><i class="ti ti-search"></i><b>Investigate</b><p>Use the CRM evidence before explaining or promising.</p></div>'
        + '<div class="ob-card"><i class="ti ti-route"></i><b>Resolve or route</b><p>Take the safe action you own or escalate with a clear owner.</p></div>'
        + '<div class="ob-card"><i class="ti ti-notes"></i><b>Leave a trail</b><p>Document facts, actions and the timed next step.</p></div></div></div>'
        + '<div class="ob-b"><h4>Our client promise</h4><p><strong>Clear, calm and accountable.</strong> We do not hide behind policy, guess, over-promise or make the client repeat information already in the CRM.</p></div>'
        + '<div class="ob-foot"><button class="ob-btn" data-next="service">Continue to service basics</button></div>');
    }

    function servicePanel() {
      return panelShell('Service basics — empathy, sympathy and rapport', 'Professional service starts by understanding impact, not by memorizing apologies.',
        '<div class="ob-b"><h4>Empathy versus sympathy</h4><div class="ob-compare">'
        + '<div class="ob-empathy"><b>Empathy — use it</b><p>“You have called three times and your suppliers are still unpaid. I understand why this is urgent.”<br><br>It names the client’s specific reality and creates a bridge to action.</p></div>'
        + '<div class="ob-sympathy"><b>Sympathy — do not stop here</b><p>“I feel so sorry for you. That is terrible.”<br><br>It describes your emotion, but it does not prove that you understood or that you will act.</p></div></div></div>'
        + '<div class="ob-b"><h4>Build rapport</h4><p>Rapport is professional trust, not friendship. Build it by using the client’s name naturally, showing you read the history, matching the urgency without copying the anger, asking useful questions, and doing exactly what you promised.</p></div>'
        + '<div class="ob-b"><h4>The first 30 seconds</h4><div class="ob-process">'
        + '<div><b>1 · Recognize</b><span>Name the impact</span></div><i class="ti ti-chevron-right ob-arrow"></i>'
        + '<div><b>2 · Own</b><span>Say what you will do now</span></div><i class="ti ti-chevron-right ob-arrow"></i>'
        + '<div><b>3 · Discover</b><span>One open + one closed question</span></div><i class="ti ti-chevron-right ob-arrow"></i>'
        + '<div><b>4 · Confirm</b><span>Repeat the agreed next step</span></div></div></div>'
        + '<div class="ob-b"><h4>Useful English</h4><ul><li>“I can see why that created pressure for your business.”</li><li>“Let me review the previous contact first so you do not have to repeat everything.”</li><li>“What happened after the first payment failed?”</li><li>“Just to confirm, was the amount 18,000 dollars?”</li></ul></div>'
        + '<div class="ob-foot"><button class="ob-btn" data-next="practice">Practise the skill</button></div>');
    }

    function practicePanel() {
      var games = [
        { id: 'g1', title: 'Empathy or sympathy?', prompt: 'The client says: “My payroll is blocked and 45 employees are waiting.”', choices: ['“I am so sorry, that sounds awful.”', '“Forty-five employees may miss payroll today. I understand why you need a concrete answer now.”'], answer: 1, why: 'The second response names the real impact and prepares the conversation for action.' },
        { id: 'g2', title: 'Build rapport', prompt: 'The CRM shows two previous calls. Choose your opening.', choices: ['“Please explain the entire problem from the beginning.”', '“Ms. Rivera, I reviewed your two previous calls before answering, so we can continue from the last commitment.”'], answer: 1, why: 'Rapport grows when you remove effort and demonstrate preparation.' },
        { id: 'g3', title: 'Own the next step', prompt: 'The client asks: “What are you actually going to do?”', choices: ['“The department will review it as soon as possible.”', '“I will verify the two declined payments now, then call Compliance while you remain on the line.”'], answer: 1, why: 'Use “I”, name the action and make the next step observable.' }
      ];
      return panelShell('Practice lab', 'Three short games. Learn from the explanation; this is practice, not the certification.',
        games.map(function (game) {
          return '<div class="ob-game" data-game="' + game.id + '"><h5>' + game.title + '</h5><p>' + game.prompt + '</p>'
            + game.choices.map(function (choice, i) { return '<button class="ob-choice" data-game-pick="' + i + '">' + choice + '</button>'; }).join('')
            + '<div class="ob-feedback">' + (state.game[game.id] != null ? game.why : '') + '</div></div>';
        }).join('')
        + '<div class="ob-foot"><button class="ob-btn" data-next="products"' + (Object.keys(state.game).length === 3 ? '' : ' disabled') + '>Continue to operations and products</button></div>');
    }

    function productsPanel() {
      var products = [
        ['Operating Account', 'Daily banking', 'Deposits, supplier payments, payroll and transfers.'],
        ['Obsidian Corporate Card', 'Business spending', 'Purchases, travel, limits and card controls.'],
        ['Wire Transfers', 'Domestic and international', 'High-value payments, beneficiaries and compliance review.'],
        ['Business Financing', 'Growth and working capital', 'Credit facilities, expansion and equipment.'],
        ['VIP & Concierge', 'Premium service', 'Travel coordination, priority support and executive requests.']
      ];
      return panelShell('How we operate and what we offer', 'Now connect the service method to the products the client actually sees.',
        '<div class="ob-b"><h4>How every request moves</h4><div class="ob-process">'
        + '<div><b>Receive</b><span>Case enters the queue</span></div><i class="ti ti-chevron-right ob-arrow"></i>'
        + '<div><b>Verify</b><span>Open the client 360</span></div><i class="ti ti-chevron-right ob-arrow"></i>'
        + '<div><b>Act</b><span>Resolve or escalate</span></div><i class="ti ti-chevron-right ob-arrow"></i>'
        + '<div><b>Document</b><span>Note + next step</span></div></div></div>'
        + '<div class="ob-b"><h4>Product map</h4><div class="ob-grid">'
        + products.map(function (p) { return '<div class="ob-product"><b>' + p[0] + '</b><small>' + p[1] + '</small><p>' + p[2] + '</p></div>'; }).join('')
        + '</div></div>'
        + '<div class="ob-b"><h4>Important</h4><p>You do not need every rule yet. First recognize the product, explain its purpose in simple English, and know where its information lives in the CRM. Detailed product training comes later, one topic at a time.</p></div>'
        + '<div class="ob-foot"><button class="ob-btn" data-next="quiz">Take the foundation certification</button></div>');
    }

    function quizPanel() {
      var certified = state.done.indexOf('quiz') >= 0;
      return panelShell('Quick certification — foundation', 'Six questions. Score at least 5/6 to unlock the guided CRM.',
        (certified ? '<div class="ob-cert"><i class="ti ti-rosette-discount-check"></i><div><b>Foundation certified</b><span>Culture, service and product basics</span></div></div>' : '')
        + QUIZ.questions.map(function (q, i) {
          return '<div class="ob-q" data-q="' + i + '"><h5>' + (i + 1) + '. ' + q.q + '</h5>'
            + q.options.map(function (option, oi) { return '<label class="ob-opt' + (oi === q.answer ? ' key' : '') + '" data-pick="' + oi + '"><input type="radio" name="fq' + i + '"><span>' + option + '</span></label>'; }).join('')
            + '<div class="ob-why"><strong>Why:</strong> ' + q.why + '</div></div>';
        }).join('')
        + '<div class="ob-foot"><button class="ob-btn" id="ob-submit">Submit answers</button>'
        + (certified ? '<button class="ob-btn" data-next="mock">Enter the guided CRM</button>' : '')
        + '<span class="ob-msg" id="ob-score"></span></div>');
    }

    function crmView(panel) {
      if (panel === 'complete') return '<div class="gm-complete"><i class="ti ti-rosette-discount-check"></i><h4>CRM navigation certified</h4><p>You completed the guided tour without entering the production desk.</p></div>';
      if (panel === 'services') return '<div class="gm-product" data-gm="product-operating"><small>Daily banking</small><b>Operating Account · *4821</b><span>Active · Balance $148,300</span></div><div class="gm-product"><small>Business spending</small><b>Obsidian Corporate Card · *9204</b><span>Active · No preset limit</span></div><div class="gm-product"><small>Payments</small><b>Wire Transfer Service</b><span>Active · International enabled</span></div>';
      if (panel === 'account') return '<div class="gm-metrics"><div class="gm-metric"><small>Balance</small><b>$148,300</b></div><div class="gm-metric"><small>Available</small><b>$0</b></div><div class="gm-metric"><small>Status</small><b class="gm-red">Restricted</b></div></div><div class="ob-b" style="margin-top:12px"><h4>What this product does</h4><p>Receives deposits and controls supplier payments, payroll, standing orders and transfers.</p></div>';
      if (panel === 'statements') return '<div class="gm-row" data-gm="tx-declined"><span>Supplier · ConstruCR<br><small>Aug 14</small></span><b class="gm-red">DECLINED</b></div><div class="gm-row"><span>Wire · Banco Nacional<br><small>Aug 12</small></span><b>−$22,400</b></div><div class="gm-row"><span>Payroll · August cycle<br><small>Aug 10</small></span><b>−$18,000</b></div>';
      if (panel === 'transaction') return '<div class="gm-product"><small>Transaction detail</small><b>Supplier · ConstruCR</b><span>Aug 14 · $12,800 · Declined</span></div><div class="ob-b" style="margin-top:12px"><h4>System reason</h4><p>Operating account restriction. The payment never left the account.</p></div>';
      if (panel === 'cards') return '<div class="gm-product" data-gm="card-status"><small>Visa Infinite</small><b>Obsidian Corporate · *9204</b><span class="gm-green">ACTIVE</span></div>';
      if (panel === 'card-detail') return '<div class="gm-metrics"><div class="gm-metric"><small>Status</small><b class="gm-green">Active</b></div><div class="gm-metric"><small>Travel notice</small><b>None</b></div><div class="gm-metric"><small>Last use</small><b>Aug 12</b></div></div><div class="ob-b" style="margin-top:12px"><h4>Important distinction</h4><p>The account is restricted, but the corporate card is active. Never assume one product status applies to every product.</p></div>';
      if (panel === 'contacts') return '<div class="gm-contact" data-gm="contact-latest"><span>Today · 09:10<br><small>Phone · Corporate Desk</small></span><b>Open</b></div><div class="gm-contact"><span>Yesterday · 16:42<br><small>Email · Operations</small></span><b>Sent</b></div>';
      if (panel === 'contact-detail') return '<div class="gm-product"><small>Latest contact · Today 09:10</small><b>Client called about declined supplier payments</b><span>Agent promised an Operations callback before 11:00. No callback recorded.</span></div>';
      if (panel === 'note') return '<textarea class="gm-note" data-gm="note-box">Reviewed previous contacts: callback promised before 11:00 was not completed. Operating Account restricted; corporate card remains active.</textarea><button class="gm-save" data-gm="save-note">Save internal note</button>';
      return '<div class="gm-metrics"><div class="gm-metric"><small>Balance</small><b>$148,300</b></div><div class="gm-metric"><small>Credit limit</small><b>$500,000</b></div><div class="gm-metric"><small>Relationship</small><b>A+</b></div></div><div class="ob-b" style="margin-top:12px"><h4>Active flag</h4><p>Operating Account restricted · two supplier payments declined.</p></div>';
    }

    function guidedCrm() {
      var index = Math.min(state.mockIndex || 0, MOCK_TASKS.length - 1);
      var task = MOCK_TASKS[index];
      var activePanel = index === 0 ? 'overview' : (state.mockPanel || 'overview');
      var target = task.target;
      function cls(id, base) { return base + (target === id ? ' gm-target' : ''); }
      return '<div class="gm"><div class="gm-guide"><div class="gm-n">' + (index + 1) + '</div><div><b>' + task.prompt + '</b><p>Hint: ' + task.tip + '</p></div></div>'
        + '<div class="gm-shell"><aside class="gm-side"><div class="gm-brand">KAMUK HOLDINGS · TRAINING MOCK</div><div class="gm-label">Case queue</div>'
        + '<div class="' + cls('client-rivera', 'gm-client') + '" data-gm="client-rivera"><b>Marta Rivera</b><span>Operating account restricted</span></div>'
        + '<div class="gm-client"><b>Daniel Torres</b><span>Card declined abroad</span></div><div class="gm-client"><b>Elena Chen</b><span>VIP travel request</span></div></aside>'
        + '<main class="gm-main"><div class="gm-top"><b>Marta Rivera · Rivera Logistics S.A.</b><span>Corporate · Mid-market · Client for 6 years</span></div>'
        + '<nav class="gm-tabs"><button class="gm-tab" data-gm="tab-overview">Overview</button><button class="' + cls('tab-statements', 'gm-tab') + '" data-gm="tab-statements">Statements</button><button class="' + cls('tab-services', 'gm-tab') + '" data-gm="tab-services">Services</button><button class="' + cls('tab-cards', 'gm-tab') + '" data-gm="tab-cards">Card transactions</button><button class="' + cls('tab-contacts', 'gm-tab') + '" data-gm="tab-contacts">Previous contacts</button><button class="' + cls('tab-note', 'gm-tab') + '" data-gm="tab-note">Internal note</button></nav>'
        + '<div class="gm-view">' + crmView(activePanel) + '</div></main></div></div>';
    }

    function mockPanel() {
      return panelShell('Guided CRM — safe training environment', 'This is not the production CRM. The system asks one question, highlights the correct control in yellow and opens the relevant display after you click it.',
        (state.done.indexOf('mock') >= 0 ? '<div class="ob-cert"><i class="ti ti-rosette-discount-check"></i><div><b>CRM navigation certified</b><span>Safe guided tour completed</span></div></div>' : '')
        + guidedCrm());
    }

    function nestingPanel() {
      if (!unlocked('nesting')) return '<div class="ob-panel"><div class="ob-locked"><i class="ti ti-lock"></i><p>Nesting unlocks only after the foundation certification and the guided CRM tour.</p></div></div>';
      var completed = HOME_CASES.filter(function (item) {
        return homeAnswerStatus(item, state.homeAnswers[item.id] || '').ready;
      }).length;
      var ready = deskUnlocked();
      return panelShell('Nesting — take live cases', 'Complete all 10 home cases after certification. Your Training Book session opens the desk automatically — no PIN.',
        '<div class="ob-cert"><i class="ti ti-circle-check"></i><div><b>' + (ready ? 'Nesting unlocked' : 'Finish the 10 home cases') + '</b><span>' + (ready ? 'Portal session certified for the weekly case floor' : completed + '/10 structured responses ready') + '</span></div></div>'
        + '<div class="ob-foot"><button class="ob-btn" id="ob-launch"' + (ready ? '' : ' disabled') + '><i class="ti ti-building-bank"></i> Open the Holdings desk</button><span class="ob-msg">' + (ready ? 'Opens in a new tab with your Training Book session.' : 'Desk stays locked until certification, guided CRM and all 10 home cases are complete.') + '</span></div>'
        + '<div class="ob-home-head"><h4>Home practice · 10 written cases</h4><p>Write your own 80–180 word response. Use the facts naturally: do not write a vocabulary list. There are no model answers on the student screen.</p></div>'
        + '<div class="ob-home-progress">' + completed + '/10 responses meet the language structure</div>'
        + HOME_CASES.map(function (item, index) {
          var answer = state.homeAnswers[item.id] || '';
          var status = homeAnswerStatus(item, answer);
          return '<div class="ob-home-case" data-home-case="' + item.id + '"><div class="ob-home-top"><b>' + (index + 1) + ' · ' + esc(item.title) + '</b><span>' + (status.ready ? 'Ready ✓' : status.words + ' words') + '</span></div>'
            + '<div class="ob-home-body"><div class="ob-home-rules"><strong>Case facts:</strong> ' + esc(item.facts) + '</div><div class="ob-home-line">' + esc(item.line) + '</div>'
            + '<div class="ob-home-rules"><strong>Required:</strong> acknowledge impact → ask one open and one closed question → explain the evidence → take/route an action → give a timed next step.</div>'
            + '<div class="ob-home-chips">'
            + item.connectors.map(function (word) { return '<span class="ob-home-chip">connector: ' + esc(word) + '</span>'; }).join('')
            + '<span class="ob-home-chip">prefix/suffix family: ' + esc(item.family.join(' / ')) + '</span>'
            + '<span class="ob-home-chip">phrasal: ' + esc(item.phrasal) + '</span>'
            + item.vocab.map(function (word) { return '<span class="ob-home-chip">' + esc(word) + '</span>'; }).join('')
            + '</div><textarea class="ob-home-answer" data-home-answer="' + item.id + '" autocomplete="off" spellcheck="true" placeholder="Type your response here. Pasting and dropping text are disabled.">' + esc(answer) + '</textarea>'
            + '<div class="ob-no-paste"><i class="ti ti-keyboard"></i> Type only: paste and drag/drop are disabled.</div>'
            + '<div class="ob-home-status' + (status.ready ? ' ok' : '') + '">' + esc(status.message) + '</div></div></div>';
        }).join(''));
    }

    function homeAnswerStatus(item, answer) {
      var text = String(answer || '').trim();
      var lower = text.toLowerCase();
      var words = text ? text.split(/\s+/).filter(Boolean).length : 0;
      var connectorCount = item.connectors.filter(function (word) { return lower.indexOf(word.toLowerCase()) >= 0; }).length;
      var familyUsed = item.family.some(function (word) { return lower.indexOf(word.toLowerCase()) >= 0; });
      var phrasalUsed = lower.indexOf(item.phrasal.toLowerCase()) >= 0;
      var vocabCount = item.vocab.filter(function (word) { return lower.indexOf(word.toLowerCase()) >= 0; }).length;
      var ready = words >= 80 && words <= 180 && connectorCount >= 2 && familyUsed && phrasalUsed && vocabCount >= 2;
      var missing = [];
      if (words < 80) missing.push((80 - words) + ' more words');
      if (words > 180) missing.push('shorten to 180 words');
      if (connectorCount < 2) missing.push('both connectors');
      if (!familyUsed) missing.push('one word-family form');
      if (!phrasalUsed) missing.push('the phrasal verb');
      if (vocabCount < 2) missing.push('two case terms');
      return { ready: ready, words: words, message: ready ? 'Structure complete · ' + words + ' words · now read it aloud and make it sound natural.' : 'Still needed: ' + missing.join(' · ') };
    }

    function panel() {
      if (state.step === 'welcome') return welcomePanel();
      if (state.step === 'service') return servicePanel();
      if (state.step === 'practice') return practicePanel();
      if (state.step === 'products') return productsPanel();
      if (state.step === 'quiz') return quizPanel();
      if (state.step === 'mock') return mockPanel();
      return nestingPanel();
    }

    function render() {
      root.innerHTML = '<div class="ob"><div class="ob-head"><small>' + PROGRAM.label + '</small><h2>' + PROGRAM.title + '</h2><p>' + PROGRAM.intro + '</p></div>' + rail() + panel() + '</div>';
      if (accessRoot) accessRoot.style.display = 'none';
      if (state.step === 'mock') {
        var task = MOCK_TASKS[Math.min(state.mockIndex || 0, MOCK_TASKS.length - 1)];
        var target = root.querySelector('[data-gm="' + task.target + '"]');
        if (target) target.classList.add('gm-target');
      }
    }

    function gradeQuiz() {
      var correct = 0;
      QUIZ.questions.forEach(function (q, i) {
        var card = root.querySelector('[data-q="' + i + '"]');
        var pick = quizPicks[i];
        card.classList.remove('right', 'wrong');
        card.querySelectorAll('.ob-opt').forEach(function (o) { o.classList.remove('picked'); });
        if (pick == null) return;
        card.querySelector('[data-pick="' + pick + '"]').classList.add('picked');
        card.classList.add(pick === q.answer ? 'right' : 'wrong');
        if (pick === q.answer) correct++;
      });
      var msg = root.querySelector('#ob-score');
      if (correct >= QUIZ.pass) {
        complete('quiz');
        msg.className = 'ob-msg ok';
        msg.textContent = correct + '/6 — foundation certified. The guided CRM is unlocked.';
        setTimeout(function () { render(); }, 700);
      } else {
        msg.className = 'ob-msg err';
        msg.textContent = correct + '/6 — review the explanations and try again.';
      }
    }

    root.addEventListener('click', function (event) {
      var step = event.target.closest('.ob-step');
      if (step) {
        if (!step.classList.contains('locked')) go(step.dataset.step);
        return;
      }
      var next = event.target.closest('[data-next]');
      if (next) { complete(state.step); go(next.dataset.next); return; }
      var choice = event.target.closest('[data-game-pick]');
      if (choice) {
        var game = choice.closest('.ob-game');
        var id = game.dataset.game;
        var answers = { g1: 1, g2: 1, g3: 1 };
        game.querySelectorAll('.ob-choice').forEach(function (b) { b.classList.remove('right', 'wrong'); });
        choice.classList.add(Number(choice.dataset.gamePick) === answers[id] ? 'right' : 'wrong');
        state.game[id] = Number(choice.dataset.gamePick);
        save();
        var feedback = game.querySelector('.ob-feedback');
        var why = {
          g1: 'Empathy names the real impact and leads to action.',
          g2: 'Rapport grows when you remove effort and demonstrate preparation.',
          g3: 'Ownership uses “I”, a concrete action and an observable next step.'
        };
        feedback.textContent = why[id];
        var continueBtn = root.querySelector('[data-next="products"]');
        if (continueBtn && Object.keys(state.game).length === 3) continueBtn.disabled = false;
        return;
      }
      if (event.target.closest('#ob-submit')) { gradeQuiz(); return; }
      if (event.target.closest('#ob-launch')) {
        if (!deskUnlocked()) return;
        pushProgress().then(function (data) {
          if (data && data.nestingCompletedAt) nestingCompletedAt = data.nestingCompletedAt;
          if (!deskUnlocked()) {
            render();
            return;
          }
          window.open(launchUrl + (launchUrl.indexOf('?') >= 0 ? '&' : '?') + 'product=' + encodeURIComponent(product), '_blank', 'noopener');
        }).catch(function () {
          if (localNestingReady()) {
            window.open(launchUrl + (launchUrl.indexOf('?') >= 0 ? '&' : '?') + 'product=' + encodeURIComponent(product), '_blank', 'noopener');
          }
        });
        return;
      }
      var homeTop = event.target.closest('.ob-home-top');
      if (homeTop) {
        homeTop.parentElement.classList.toggle('open');
        return;
      }
      var crmControl = event.target.closest('[data-gm]');
      if (crmControl && state.step === 'mock') {
        var index = state.mockIndex || 0;
        var task = MOCK_TASKS[index];
        if (crmControl.dataset.gm !== task.target) {
          crmControl.classList.add('gm-wrong');
          setTimeout(function () { crmControl.classList.remove('gm-wrong'); }, 300);
          return;
        }
        state.mockPanel = task.panel;
        state.mockIndex = index + 1;
        if (state.mockIndex >= MOCK_TASKS.length) {
          state.mockIndex = MOCK_TASKS.length - 1;
          complete('mock');
          state.mockPanel = 'complete';
          save();
          render();
          setTimeout(function () { complete('mock'); go('nesting'); }, 1200);
        } else {
          save();
          render();
        }
      }
    });

    root.addEventListener('change', function (event) {
      var option = event.target.closest('.ob-opt');
      if (option) quizPicks[Number(option.closest('.ob-q').dataset.q)] = Number(option.dataset.pick);
    });

    root.addEventListener('input', function (event) {
      var field = event.target.closest('.ob-home-answer');
      if (!field) return;
      state.homeAnswers[field.dataset.homeAnswer] = field.value;
      save();
      var item = HOME_CASES.find(function (entry) { return entry.id === field.dataset.homeAnswer; });
      var status = homeAnswerStatus(item, field.value);
      var statusEl = field.parentElement.querySelector('.ob-home-status');
      statusEl.className = 'ob-home-status' + (status.ready ? ' ok' : '');
      statusEl.textContent = status.message;
      field.closest('.ob-home-case').querySelector('.ob-home-top span').textContent = status.ready ? 'Ready ✓' : status.words + ' words';
      var completed = HOME_CASES.filter(function (entry) {
        return homeAnswerStatus(entry, state.homeAnswers[entry.id] || '').ready;
      }).length;
      var progress = root.querySelector('.ob-home-progress');
      if (progress) progress.textContent = completed + '/10 responses meet the language structure';
      var launch = root.querySelector('#ob-launch');
      if (launch) launch.disabled = !deskUnlocked();
    });

    function blockImportedText(event) {
      var field = event.target.closest('.ob-home-answer');
      if (!field) return;
      event.preventDefault();
      var statusEl = field.parentElement.querySelector('.ob-home-status');
      statusEl.className = 'ob-home-status';
      statusEl.textContent = 'Paste is disabled. Build the answer by typing it in your own words.';
    }
    root.addEventListener('paste', blockImportedText);
    root.addEventListener('drop', blockImportedText);
    root.addEventListener('beforeinput', function (event) {
      if (event.inputType === 'insertFromPaste' || event.inputType === 'insertFromDrop') blockImportedText(event);
    });

    render();
    pullProgress().finally(function () {
      if (localNestingReady()) scheduleSync();
      render();
    });
  }

  window.SimulationOnboarding = { mount: mount, quiz: QUIZ, mockTasks: MOCK_TASKS };
})();
