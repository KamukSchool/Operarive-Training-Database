(function () {
  'use strict';

  var PROGRAM = {
    label: 'Foundation 01 · 60-minute learning path',
    title: 'Welcome to Kamuk Holdings',
    intro: 'Complete this corporate e-learning path, pass the certification, practise in the guided CRM, then write the 10 nesting cases. Time shown is a guide, not a countdown.'
  };

  var STEPS = [
    { id: 'welcome', label: 'Welcome', icon: 'building-bank', mins: 5 },
    { id: 'service', label: 'Service', icon: 'heart-handshake', mins: 8 },
    { id: 'comms', label: 'Call control', icon: 'phone', mins: 8 },
    { id: 'products', label: 'Products', icon: 'briefcase', mins: 10 },
    { id: 'compliance', label: 'Compliance', icon: 'shield-check', mins: 10 },
    { id: 'resolution', label: 'Resolution', icon: 'clipboard-check', mins: 8 },
    { id: 'quiz', label: 'Certification', icon: 'certificate', mins: 4 },
    { id: 'mock', label: 'Guided CRM', icon: 'device-desktop', mins: 7 },
    { id: 'nesting', label: 'Nesting', icon: 'headset', mins: 0 }
  ];

  var COURSE_MINS = STEPS.reduce(function (sum, step) { return sum + (step.mins || 0); }, 0);
  var REQUIRED_DONE = ['welcome', 'service', 'comms', 'products', 'compliance', 'resolution', 'quiz', 'mock'];
  var CHECK_KEYS = {
    welcome: ['welcome-mcq'],
    service: ['service-scenario', 'service-match'],
    comms: ['comms-seq'],
    products: ['products-match'],
    compliance: ['compliance-tf', 'compliance-multi'],
    resolution: ['resolution-email']
  };

  var CHECK_ANSWERS = {
    'welcome-mcq': 0,
    'service-scenario': 1,
    'service-match': { empathy: 'impact', sympathy: 'emotion', rapport: 'trust' },
    'comms-seq': ['acknowledge', 'investigate', 'act', 'next'],
    'products-match': { payroll: 'operating', hotel: 'obsidian', expansion: 'loan' },
    'compliance-tf': false,
    'compliance-multi': ['last6', 'never-pin'],
    'resolution-email': 0
  };

  var CERT_BANK = [
    { id: 'q1', q: 'What is our role when a client contacts the desk?', options: ['Understand the impact, investigate, act safely and set a clear next step.', 'Apologize until the client calms down.', 'Transfer every difficult request to a supervisor.'], answer: 0, why: 'Service is ownership plus action.' },
    { id: 'q2', q: 'Which response demonstrates empathy rather than sympathy?', options: ['"You have called three times and still cannot pay your suppliers. I understand why this is urgent."', '"I feel so sorry for you; that is terrible."', '"Do not worry, everything will be fine."'], answer: 0, why: 'Empathy names the client’s specific impact.' },
    { id: 'q3', q: 'What is the purpose of rapport?', options: ['Create enough trust for the client to share facts and work with you.', 'Make the client like you before you discuss the problem.', 'Have a long friendly conversation before opening the account.'], answer: 0, why: 'Rapport is professional trust, not small talk.' },
    { id: 'q4', q: 'The client says: "This is the third time I call." What is the strongest opening?', options: ['"You have had to repeat this three times. I will review the previous contacts first so you do not start again."', '"I am very sorry, but I just received your call."', '"Can you explain everything from the beginning?"'], answer: 0, why: 'Use the history already in the CRM.' },
    { id: 'q5', q: 'Which product is designed for daily business money movement?', options: ['Operating Account', 'Obsidian Corporate Card', 'Expansion Financing'], answer: 0, why: 'The Operating Account supports deposits, payroll and transfers.' },
    { id: 'q6', q: 'What should you do before promising a solution?', options: ['Open the client profile and verify the evidence in the CRM.', 'Use your memory of a similar case.', 'Ask the client which solution they prefer and promise that one.'], answer: 0, why: 'The CRM is the source of truth.' },
    { id: 'q7', q: 'A client asks you to read the full card number. What do you do?', options: ['Read the full number because the client owns the card.', 'Refuse. You may confirm last 6 digits only after identity verification.', 'Send the PIN by email if they confirm the address.'], answer: 1, why: 'Never disclose the full PAN or the PIN.' },
    { id: 'q8', q: 'When do you escalate instead of closing the case yourself?', options: ['When the action is outside your authority, high-risk or needs another desk.', 'Whenever the client raises their voice.', 'Only after you have already promised a refund.'], answer: 0, why: 'Escalate with a named owner and a timed next step.' },
    { id: 'q9', q: 'Which internal note is audit-ready?', options: ['"Client angry. Will see."', '"Helped the client."', '"Reviewed statement: duplicate $180 at 14:02 and 14:06. Opened dispute. Callback today 4:30 p.m."'], answer: 2, why: 'Notes need evidence, action and a timed next step.' },
    { id: 'q10', q: 'A client demands an instant refund that policy does not allow. What is correct?', options: ['Explain the policy, the safe option you can take, and the timed next step.', 'Promise the refund to keep the client calm.', 'Close the case without documenting the conversation.'], answer: 0, why: 'Do not over-promise. Offer the safe path you own.' },
    { id: 'q11', q: 'Where do you confirm whether a supplier payment actually left the account?', options: ['The client’s memory of last week.', 'Statements / transaction history in the CRM.', 'A public search of the merchant.'], answer: 1, why: 'Evidence lives in Statements.' },
    { id: 'q12', q: 'What must a client email include?', options: ['A natural opening, the action taken, an owner and a timed next step.', 'A list of vocabulary words from training.', 'The hidden rubric and the case answer key.'], answer: 0, why: 'Emails are professional updates, not word lists.' }
  ];

  var HOME_CASES = [
    { id: 'hc1', title: 'PIN request with a broken identity trail', line: '“Just text me the PIN. The last agent already said my ID was fine.”', facts: 'Client wants the PIN by SMS from a taxi. Mother’s maiden name matches. Date of birth on file is 12 Mar 1984; client said 12 Mar 1985. Previous note says “ID OK” with no data points. Card is Active. Policy: never send, read or email a PIN; last 6 only after full identity on a recorded line.', connectors: ['because', 'however'], family: ['verify', 'verification', 'unverified'], phrasal: 'look into', vocab: ['identity verification', 'PIN', 'last 6', 'recorded line'], disposition: ['awaiting action', 'aa'], resolution: ['never send', 'date of birth', 'recorded line', 'identity'], forbidden: ['text the pin', 'sms the pin', 'email the pin', 'here is your pin'], why: ['policy', 'mismatch', 'because'] },
    { id: 'hc2', title: 'Hotel decline with two possible blocks', line: '“Everyone is watching me at check-in. Fix the card now.”', facts: 'Lisbon hotel decline. Available balance $8,400. No travel notice on file. Assistant filed a travel notice for Paris, not Lisbon. A $500 hotel MCC block remains from a prior dispute. Identity is not fully re-verified on this call. Policy: do not lift every control blindly; confirm which rule fired, then act.', connectors: ['because', 'therefore'], family: ['authorize', 'authorization', 'unauthorized'], phrasal: 'sort out', vocab: ['travel notice', 'decline', 'merchant category', 'available'], disposition: ['pending system', 'psa'], resolution: ['travel notice', 'lisbon', 'hotel', 'verify'], forbidden: ['lift every block', 'remove all restrictions', 'guarantee it will work'], why: ['because', 'two', 'policy'] },
    { id: 'hc3', title: 'Deposit versus balance, not a duplicate', line: '“You charged me twice. File the dispute today.”', facts: 'Two postings of $2,150, one day apart, same merchant. Descriptors: DEPOSIT then BALANCE. Client did not attach the booking confirmation. Policy: a deposit plus remaining balance is not a duplicate. Chargeback needs evidence. Billing inquiry is allowed.', connectors: ['although', 'in addition'], family: ['cancel', 'cancellation', 'cancelled'], phrasal: 'follow up', vocab: ['duplicate charge', 'merchant', 'chargeback', 'evidence'], disposition: ['awaiting action', 'aa'], resolution: ['not a duplicate', 'deposit', 'booking confirmation', 'billing'], forbidden: ['open the chargeback now', 'file fraud', 'instant refund'], why: ['although', 'descriptor', 'policy'] },
    { id: 'hc4', title: 'ATM withdrawals with PIN present', line: '“The card is in my hand. Is my money gone? Refund me now.”', facts: 'Six ATM withdrawals in another city, $3,000 total. Chip-and-PIN was used. Card is physically with the client. Spouse is an authorized user. No police report. Policy: PIN-present ATM is not automatic unauthorized fraud; block and replace; provisional credit needs investigation, not an instant refund.', connectors: ['because', 'however'], family: ['authorize', 'authorization', 'unauthorized'], phrasal: 'look into', vocab: ['provisional credit', 'replacement card', 'investigation', 'PIN'], disposition: ['awaiting action', 'aa'], resolution: ['block', 'replacement card', 'investigation', 'provisional credit'], forbidden: ['instant refund', 'accuse the spouse', 'the money is gone'], why: ['because', 'pin', 'policy'] },
    { id: 'hc5', title: 'Hotel overbooked, merchant first', line: '“The hotel says the bank must solve it. Put the $1,200 back.”', facts: '$1,200 posting. Room not provided (overbooking). Client has a booking confirmation. Chat screenshot from a front-desk account: “we cannot help, call your bank.” Not an official refund-desk letter. Policy: service-not-rendered usually needs merchant contact first (10 business days) unless written refusal exists. Screenshot may be enough if documented.', connectors: ['although', 'therefore'], family: ['resolve', 'resolution', 'unresolved'], phrasal: 'sort out', vocab: ['service not rendered', 'booking confirmation', 'merchant response', 'evidence'], disposition: ['pending system', 'psa'], resolution: ['service not rendered', 'screenshot', 'document', 'merchant'], forbidden: ['pay from bank funds', 'close without evidence', 'instant refund'], why: ['although', 'policy', 'therefore'] },
    { id: 'hc6', title: 'Broken same-day refund promise', line: '“Another bank refunds in 24 hours. Your colleague promised today.”', facts: 'Valid card-not-present fraud $890. Client is Standard, not VIP. Previous agent wrote “you will have it today.” Internal chat says VIP may get same-day goodwill — supervisor authority only. Policy: provisional credit in two business days after a case number; final decision 45–90 days. Do not match an invalid promise yourself.', connectors: ['however', 'in addition'], family: ['comply', 'compliance', 'non-compliant'], phrasal: 'follow up', vocab: ['provisional credit', 'case number', 'business day', 'goodwill'], disposition: ['awaiting action', 'aa'], resolution: ['provisional credit', 'case number', 'supervisor', 'two business days'], forbidden: ['instant refund', 'same-day refund', 'i will refund today'], why: ['however', 'policy', 'standard'] },
    { id: 'hc7', title: 'Late dispute after the network window', line: '“It is still theft. Are you doing nothing because I was in hospital?”', facts: 'Charge 20 May. Statement date 31 May. Client reports 18 August — past the 60-day network window from the statement date. Client says hospital stay, no documents on file. Policy: network dispute is ineligible; hardship exception needs medical evidence and supervisor. Alternative: internal report and monitoring, not a chargeback.', connectors: ['because', 'although'], family: ['eligible', 'eligibility', 'ineligible'], phrasal: 'look into', vocab: ['reporting window', 'statement date', 'internal report', 'chargeback'], disposition: ['awaiting action', 'aa'], resolution: ['ineligible', 'reporting window', 'internal report', 'hospital'], forbidden: ['file the chargeback', 'network will reverse', 'ignore the window'], why: ['because', 'although', 'statement'] },
    { id: 'hc8', title: 'Client wants a guaranteed win', line: '“Promise me I am going to win. Sales said we always win these.”', facts: 'Dispute filed correctly with evidence. Representment pending. Network decision in 12 business days. A sales manager emailed “we always win these.” Policy: never guarantee a network outcome. Explain the process, the deadline, and the follow-up without echoing sales.', connectors: ['however', 'therefore'], family: ['decide', 'decision', 'undecided'], phrasal: 'follow up', vocab: ['network', 'evidence', 'deadline', 'outcome'], disposition: ['pending system', 'psa'], resolution: ['cannot guarantee', 'network', 'deadline', 'follow up'], forbidden: ['you will win', 'i guarantee', 'we always win'], why: ['however', 'policy', 'network'] },
    { id: 'hc9', title: 'Merchant refund already posted', line: '“Keep the claim open anyway, just in case.”', facts: '$620 merchant refund posted yesterday. An open dispute is still live. Keeping both can create a double credit. Policy: withdraw the dispute, confirm the refund, and explain that the claim can be reopened within 10 days if the refund reverses.', connectors: ['because', 'in addition'], family: ['resolve', 'resolution', 'unresolved'], phrasal: 'sort out', vocab: ['refund', 'double credit', 'withdraw', 'reopen'], disposition: ['resolved', 'resolved with client'], resolution: ['withdraw', 'double credit', 'reopen', 'refund'], forbidden: ['keep both open', 'leave the dispute open', 'just in case keep'], why: ['because', 'double', 'policy'] },
    { id: 'hc10', title: 'Flight in 12 hours and a WhatsApp wire', line: '“A physical card in five days is useless. Wire $4,200 to this travel agency now.”', facts: 'Fraud block on the physical card. Flight at 6:00 a.m. Client wants a wire to a WhatsApp “travel agency” to pay the airline. Virtual card can be activated. Airport ATM cash is limited while the replacement is in transit. Policy: do not wire to an unverified third party; activate the virtual card; set a travel notice; explain the cash limitation.', connectors: ['therefore', 'however'], family: ['activate', 'activation', 'inactive'], phrasal: 'sort out', vocab: ['virtual card', 'travel notice', 'cash access', 'wire'], disposition: ['resolved', 'resolved with client'], resolution: ['virtual card', 'travel notice', 'do not wire', 'whatsapp'], forbidden: ['send the wire', 'wire the money', 'pay the whatsapp'], why: ['therefore', 'unverified', 'policy'] }
  ];
  var METHOD_PHRASES = ['even when', 'even though', 'what happens is that', 'in other words', 'which means', 'as well as', 'the thing is that', 'on the other hand', 'according to', 'instead of', 'however', 'despite that', 'not only', 'such as', 'unless', 'by now', 'so far'];

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

  function sameAnswer(expected, actual) {
    if (Array.isArray(expected)) {
      var right = Array.isArray(actual) ? actual : [];
      return expected.length === right.length && expected.every(function (item, i) { return String(item) === String(right[i]); });
    }
    if (expected && typeof expected === 'object') {
      var keys = Object.keys(expected);
      var value = actual && typeof actual === 'object' ? actual : {};
      return keys.length === Object.keys(value).length && keys.every(function (key) { return String(expected[key]) === String(value[key]); });
    }
    return expected === actual;
  }

  function stateKey(product, studentId) {
    return 'simulationOnboarding:' + product + ':' + (String(studentId || '').trim() || 'guest') + ':foundation-v3';
  }

  function readState(product, studentId) {
    var base = { done: [], step: 'welcome', checks: {}, quizAnswers: {}, quizOrder: [], quizAttempts: 0, quizScore: null, mockIndex: 0, homeAnswers: {}, match: {}, seq: {}, multi: {} };
    try {
      var parsed = JSON.parse(localStorage.getItem(stateKey(product, studentId)) || 'null');
      if (!parsed || !Array.isArray(parsed.done)) return base;
      parsed.checks = parsed.checks && typeof parsed.checks === 'object' ? parsed.checks : {};
      parsed.quizAnswers = parsed.quizAnswers && typeof parsed.quizAnswers === 'object' ? parsed.quizAnswers : {};
      parsed.quizOrder = Array.isArray(parsed.quizOrder) ? parsed.quizOrder : [];
      parsed.homeAnswers = parsed.homeAnswers && typeof parsed.homeAnswers === 'object' ? parsed.homeAnswers : {};
      parsed.match = parsed.match && typeof parsed.match === 'object' ? parsed.match : {};
      parsed.seq = parsed.seq && typeof parsed.seq === 'object' ? parsed.seq : {};
      parsed.multi = parsed.multi && typeof parsed.multi === 'object' ? parsed.multi : {};
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
      '.ob-path{display:flex;justify-content:space-between;gap:10px;margin-top:12px;font-size:11px;opacity:.9}.ob-path b{font-size:16px}',
      '.ob-bar{height:7px;background:rgba(255,255,255,.18);border-radius:99px;margin-top:10px;overflow:hidden}.ob-bar i{display:block;height:100%;background:#fff}',
      '.ob-rail{display:flex;gap:6px;margin:12px 0;overflow-x:auto}.ob-step{min-width:78px;flex:1;background:#fff;border:1px solid #dce3ea;border-radius:11px;padding:9px 5px;text-align:center;cursor:pointer}.ob-step.locked{opacity:.45;cursor:not-allowed}.ob-step.on{border-color:' + accent + ';box-shadow:0 4px 14px rgba(15,23,42,.09)}.ob-step i{font-size:17px;color:' + accent + '}.ob-step.done i{color:#15803d}.ob-step span{display:block;margin-top:3px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#475569}.ob-step em{display:block;font-style:normal;font-size:8px;color:#94a3b8}',
      '.ob-panel{background:#fff;border:1px solid #dce3ea;border-radius:14px;padding:20px}.ob-panel h3{margin:0 0 4px;font-size:18px;color:#102033}.ob-lead{margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.6}',
      '.ob-mins{display:inline-block;background:#eef6fc;color:' + accent + ';border-radius:99px;padding:3px 8px;font-size:10px;font-weight:800;margin-bottom:10px}',
      '.ob-b{margin-bottom:16px}.ob-b h4{margin:0 0 6px;font-size:10px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:' + accent + '}.ob-b p,.ob-b li{font-size:13px;line-height:1.65;color:#334155}.ob-b p{margin:0}.ob-b ul{margin:0;padding-left:17px}',
      '.ob-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.ob-card{border:1px solid #e2e8f0;border-radius:11px;padding:12px}.ob-card i{font-size:20px;color:' + accent + '}.ob-card b{display:block;margin:5px 0 3px;font-size:13px;color:#102033}.ob-card p{font-size:12px;line-height:1.55;color:#64748b;margin:0}',
      '.ob-compare{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ob-compare>div{border-radius:10px;padding:12px}.ob-empathy{background:#f0fdf4;color:#166534}.ob-sympathy{background:#fff7ed;color:#9a3412}.ob-compare b{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px}.ob-compare p{margin:0;font-size:12.5px;line-height:1.6}',
      '.ob-check{border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin:12px 0}.ob-check h5{margin:0 0 8px;font-size:13px;color:#102033}.ob-choice,.ob-opt{display:block;width:100%;text-align:left;border:1px solid #d8e0e8;background:#fff;border-radius:9px;padding:9px 11px;margin:6px 0;font:600 12px/1.5 Inter,Arial,sans-serif;color:#334155;cursor:pointer}.ob-choice.right,.ob-opt.right{border-color:#15803d;background:#f0fdf4;color:#14532d}.ob-choice.wrong,.ob-opt.wrong{border-color:#b42318;background:#fef2f2;color:#7f1d1d}.ob-feedback{font-size:12px;line-height:1.5;color:#475569;margin-top:8px}',
      '.ob-match{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ob-chip{border:1px solid #d8e0e8;border-radius:8px;padding:8px;font-size:12px;cursor:pointer;background:#fff}.ob-chip.on{border-color:' + accent + ';background:#eff6ff}.ob-chip.used{opacity:.45}',
      '.ob-seq{display:flex;flex-wrap:wrap;gap:7px}.ob-seq button{border:1px solid #d8e0e8;background:#fff;border-radius:8px;padding:8px 10px;font:700 12px Inter,Arial,sans-serif;cursor:pointer}.ob-seq button.on{background:' + accent + ';color:#fff;border-color:' + accent + '}',
      '.ob-process{display:flex;gap:7px;align-items:stretch;margin:12px 0 18px;overflow-x:auto}.ob-process div{min-width:105px;flex:1;background:#f8fafc;border-radius:10px;padding:10px;text-align:center}.ob-process b{display:block;font-size:11px;color:#102033}.ob-process span{font-size:10px;color:#64748b}',
      '.ob-product{border:1px solid #e2e8f0;border-radius:11px;padding:12px}.ob-product b{display:block;font-size:13px;color:#102033}.ob-product small{display:block;color:' + accent + ';font-weight:800;margin:3px 0}.ob-product p{margin:0;font-size:12px;line-height:1.5;color:#64748b}',
      '.ob-q{border:1px solid #e2e8f0;border-radius:12px;padding:13px 14px;margin-bottom:10px}.ob-q h5{margin:0 0 9px;font-size:13px;color:#102033;line-height:1.5}.ob-why{display:none;font-size:12px;color:#475569;margin-top:7px}.ob-q.right .ob-why,.ob-q.wrong .ob-why{display:block}',
      '.ob-foot{display:flex;gap:10px;align-items:center;margin-top:16px;flex-wrap:wrap}.ob-btn{border:0;border-radius:9px;padding:11px 17px;background:' + accent + ';color:#fff;font:800 13px Inter,Arial,sans-serif;cursor:pointer}.ob-btn:disabled{opacity:.45}.ob-msg{font-size:12px;font-weight:700;color:#64748b}.ob-msg.ok{color:#15803d}.ob-msg.err{color:#b42318}.ob-cert{display:flex;gap:10px;align-items:center;background:#f0fdf4;border-radius:10px;padding:12px;color:#14532d;margin-bottom:13px}.ob-cert i{font-size:24px}.ob-cert b{font-size:13px}.ob-cert span{display:block;font-size:11px}',
      '.ob-home-head{margin-top:18px;padding-top:16px;border-top:1px solid #e2e8f0}.ob-home-head h4{margin:0 0 5px;color:#102033}.ob-home-head p{margin:0;font-size:12px;line-height:1.55;color:#64748b}.ob-home-progress{margin:10px 0;font-size:11px;font-weight:800;color:' + accent + '}.ob-home-case{border:1px solid #e2e8f0;border-radius:11px;margin:9px 0;overflow:hidden}.ob-home-top{padding:11px 12px;background:#f8fafc;cursor:pointer;display:flex;gap:9px;align-items:center}.ob-home-top b{font-size:12px;color:#102033}.ob-home-top span{margin-left:auto;font-size:10px;color:#64748b}.ob-home-body{display:none;padding:12px}.ob-home-case.open .ob-home-body{display:block}.ob-home-line{border-left:3px solid ' + accent + ';padding:8px 10px;background:#f8fafc;font-size:12px;color:#334155;margin:8px 0}.ob-home-rules{font-size:11px;line-height:1.55;color:#475569;margin:8px 0}.ob-home-chips{display:flex;gap:5px;flex-wrap:wrap;margin:7px 0}.ob-home-chip{background:#eef2ff;color:#3730a3;border-radius:20px;padding:3px 7px;font-size:9px;font-weight:800}.ob-home-answer{width:100%;box-sizing:border-box;min-height:150px;border:1px solid #cbd5e1;border-radius:9px;padding:11px;font:12px/1.6 Inter,Arial,sans-serif;resize:vertical}.ob-home-status{font-size:10px;font-weight:700;color:#64748b;margin-top:6px}.ob-home-status.ok{color:#15803d}.ob-no-paste{font-size:10px;color:#b45309;margin-top:5px}',
      '.ob-rules{background:#fff7ed;border:1px solid #fdba74;border-radius:14px;padding:18px 20px;box-shadow:0 10px 28px rgba(154,52,18,.12)}.ob-rules h4{margin:0 0 8px;font-size:16px;color:#9a3412}.ob-rules p{margin:0 0 10px;font-size:13px;line-height:1.6;color:#7c2d12}.ob-rules ul{margin:0 0 14px;padding-left:18px}.ob-rules li{font-size:13px;line-height:1.55;color:#7c2d12;margin:6px 0}.ob-rules-actions{display:flex;gap:8px;flex-wrap:wrap}.ob-btn-ghost{border:1px solid #d8e0e8;background:#fff;color:#334155}',
      '.gm{border:1px solid #cbd5e1;border-radius:13px;overflow:hidden;background:#f8fafc}.gm-guide{display:flex;gap:12px;align-items:flex-start;background:#fff8cc;border-bottom:1px solid #f0cf50;padding:13px 15px}.gm-guide .gm-n{width:28px;height:28px;border-radius:50%;background:#eab308;color:#422006;display:grid;place-items:center;font-weight:900;flex:0 0 auto}.gm-guide b{display:block;font-size:13px;color:#422006}.gm-guide p{margin:3px 0 0;font-size:12px;line-height:1.5;color:#713f12}.gm-shell{display:grid;grid-template-columns:190px 1fr;min-height:410px}.gm-side{background:#1e1b4b;color:#fff;padding:12px}.gm-brand{font-size:11px;font-weight:900;margin-bottom:13px}.gm-label{font-size:9px;text-transform:uppercase;letter-spacing:.08em;opacity:.55;margin:9px 0 5px}.gm-client{padding:9px;border-radius:8px;font-size:11px;cursor:pointer;margin-bottom:5px}.gm-client b{display:block}.gm-client span{font-size:9px;opacity:.7}.gm-main{min-width:0}.gm-top{padding:11px 13px;background:#fff;border-bottom:1px solid #e2e8f0}.gm-top b{font-size:13px;color:#102033}.gm-top span{display:block;font-size:10px;color:#64748b}.gm-tabs{display:flex;gap:2px;padding:7px 8px;background:#fff;border-bottom:1px solid #e2e8f0;overflow-x:auto}.gm-tab{white-space:nowrap;border:0;background:transparent;border-radius:6px;padding:7px 8px;font:700 9px Inter,Arial,sans-serif;color:#64748b;cursor:pointer}.gm-view{padding:13px}.gm-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.gm-metric,.gm-product,.gm-row,.gm-contact{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:9px}.gm-metric small,.gm-product small{display:block;font-size:8px;color:#64748b;text-transform:uppercase}.gm-metric b{font-size:14px;color:#102033}.gm-product{margin-bottom:7px;cursor:pointer}.gm-product b{display:block;font-size:11px;color:#102033}.gm-product span{font-size:9px;color:#64748b}.gm-row,.gm-contact{display:flex;justify-content:space-between;gap:8px;margin-bottom:6px;font-size:10px;color:#334155;cursor:pointer}.gm-red{color:#b42318;font-weight:800}.gm-green{color:#15803d;font-weight:800}.gm-note{width:100%;box-sizing:border-box;min-height:74px;border:1px solid #cbd5e1;border-radius:8px;padding:9px;font:11px Inter,Arial,sans-serif}.gm-save{margin-top:7px;border:0;border-radius:7px;padding:8px 11px;background:#475569;color:#fff;font:800 10px Inter,Arial,sans-serif;cursor:pointer}.gm-target{position:relative;z-index:1;outline:4px solid #facc15!important;background:#fef9c3!important;color:#422006!important;animation:gmPulse 1s infinite alternate}.gm-target:after{content:"CLICK HERE";position:absolute;z-index:3;right:2px;top:-16px;background:#eab308;color:#422006;border-radius:4px;padding:2px 5px;font:900 7px Inter,Arial,sans-serif}.gm-wrong{animation:gmShake .25s}.gm-complete{text-align:center;padding:70px 20px}.gm-complete i{font-size:44px;color:#15803d}',
      '.ob-locked{text-align:center;padding:35px 15px;color:#64748b}.ob-locked i{font-size:34px;color:#cbd5e1}',
      '@keyframes gmPulse{to{outline-color:#eab308;box-shadow:0 0 14px #facc15}}@keyframes gmShake{25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}',
      '@media(max-width:700px){.ob-grid,.ob-compare,.ob-match{grid-template-columns:1fr}.gm-shell{grid-template-columns:120px 1fr}.ob-panel{padding:14px}}'
    ].join('');
  }

  function mount(root, config) {
    if (!root) return;
    config = config || {};
    var product = config.product === 'kamuk' ? 'kamuk' : 'infinity';
    var accent = product === 'kamuk' ? '#2B7EC1' : '#5B21B6';
    var launchUrl = String(config.launchUrl || (product === 'kamuk' ? 'kamuk-holdings-crm.html' : 'infinity-holdings-crm.html'));
    var studentId = String(config.studentId || '').trim();
    var apiBase = String(config.apiBase || (typeof INFINITY_API !== 'undefined' ? INFINITY_API : 'https://alice-by-infinity.onrender.com')).replace(/\/$/, '');
    var crmBase = product === 'kamuk' ? '/kamuk-holdings/crm' : '/infinity-holdings/crm';
    var state = readState(product, studentId);
    var nestingCompletedAt = null;
    var crmEnabled = config.crmEnabled === true;
    var syncTimer = null;
    var syncing = false;
    var matchPick = {};
    var rulesAck = false;
    styles(accent);

    function unlocked(id) {
      if (id === 'nesting' && crmEnabled) return true;
      var index = STEPS.map(function (s) { return s.id; }).indexOf(id);
      return index === 0 || state.done.indexOf(STEPS[index - 1].id) >= 0;
    }

    function checkPassed(id) { return sameAnswer(CHECK_ANSWERS[id], state.checks[id]); }

    function moduleReady(id) {
      var keys = CHECK_KEYS[id];
      if (!keys) {
        if (id === 'quiz') return quizPassed();
        if (id === 'mock') return (state.mockIndex || 0) >= MOCK_TASKS.length - 1 && state.done.indexOf('mock') >= 0;
        return state.done.indexOf(id) >= 0;
      }
      return keys.every(checkPassed);
    }

    function quizPassed() {
      var ids = state.quizOrder.length ? state.quizOrder : CERT_BANK.map(function (q) { return q.id; }).slice(0, 10);
      var asked = ids.length;
      if (asked < 10) return false;
      var correct = ids.filter(function (id) {
        var q = CERT_BANK.find(function (item) { return item.id === id; });
        return q && Number(state.quizAnswers[id]) === q.answer;
      }).length;
      return (correct / asked) >= 0.8;
    }

    function quizScore() {
      var ids = state.quizOrder.length ? state.quizOrder : [];
      if (!ids.length) return 0;
      var correct = ids.filter(function (id) {
        var q = CERT_BANK.find(function (item) { return item.id === id; });
        return q && Number(state.quizAnswers[id]) === q.answer;
      }).length;
      return Math.round((correct / ids.length) * 100);
    }

    function courseReady() {
      return REQUIRED_DONE.every(moduleReady);
    }

    function localNestingReady() {
      if (!courseReady()) return false;
      return HOME_CASES.every(function (item) {
        return homeAnswerStatus(item, (state.homeAnswers && state.homeAnswers[item.id]) || '').ready;
      });
    }

    function deskUnlocked() { return crmEnabled || Boolean(nestingCompletedAt) || localNestingReady(); }

    function authToken() {
      return (typeof getAuthToken === 'function' && getAuthToken())
        || localStorage.getItem('infinity_auth_token')
        || sessionStorage.getItem('infinity_auth_token')
        || '';
    }

    function trainingPayload() {
      return {
        done: state.done.slice(),
        homeAnswers: state.homeAnswers || {},
        checks: state.checks || {},
        quizAnswers: state.quizAnswers || {},
        mockIndex: state.mockIndex || 0,
        quizAttempts: state.quizAttempts || 0
      };
    }

    async function api(path, options) {
      options = options || {};
      var token = authToken();
      var response = await fetch(apiBase + path, {
        method: options.method || 'GET',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
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
        nestingCompletedAt = data.nestingCompletedAt || nestingCompletedAt;
        if (data.crmEnabled) crmEnabled = true;
        if (data.casesRulesAccepted) rulesAck = true;
      } catch (error) { /* offline book still works */ }
    }

    async function pushProgress() {
      if (!studentId || !authToken() || syncing) return;
      syncing = true;
      try {
        var data = await api(crmBase + '/training/progress', { method: 'POST', body: trainingPayload() });
        nestingCompletedAt = data.nestingCompletedAt || nestingCompletedAt;
        if (data.crmEnabled) crmEnabled = true;
        if (data.casesRulesAccepted) rulesAck = true;
        return data;
      } finally { syncing = false; }
    }

    function scheduleSync() {
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(function () { pushProgress().catch(function () {}); }, 500);
    }

    function save() { writeState(product, studentId, state); scheduleSync(); }
    function complete(id) { if (state.done.indexOf(id) < 0) state.done.push(id); save(); }
    function go(id) {
      state.step = id;
      save();
      render();
    }

    function pathMeter() {
      var doneCount = REQUIRED_DONE.filter(moduleReady).length;
      var pct = Math.round((doneCount / REQUIRED_DONE.length) * 100);
      return '<div class="ob-path"><span>60-minute learning path</span><span><b>' + doneCount + '/' + REQUIRED_DONE.length + '</b> modules · ~' + COURSE_MINS + ' min</span></div>'
        + '<div class="ob-bar"><i style="width:' + pct + '%"></i></div>';
    }

    function rail() {
      return '<div class="ob-rail">' + STEPS.map(function (step) {
        var done = moduleReady(step.id) || (step.id === 'nesting' && localNestingReady());
        var open = unlocked(step.id);
        return '<div class="ob-step' + (done ? ' done' : '') + (state.step === step.id ? ' on' : '') + (open ? '' : ' locked') + '" data-step="' + step.id + '">'
          + '<i class="ti ti-' + (done ? 'circle-check' : (open ? step.icon : 'lock')) + '"></i><span>' + step.label + '</span>'
          + (step.mins ? '<em>' + step.mins + ' min</em>' : '<em>untimed</em>') + '</div>';
      }).join('') + '</div>';
    }

    function panelShell(title, mins, lead, body) {
      return '<div class="ob-panel">' + (mins ? '<span class="ob-mins">~' + mins + ' min</span>' : '') + '<h3>' + title + '</h3><p class="ob-lead">' + lead + '</p>' + body + '</div>';
    }

    function continueBtn(next, enabled, label) {
      return '<div class="ob-foot"><button class="ob-btn" data-next="' + next + '"' + (enabled ? '' : ' disabled') + '>' + (label || 'Continue') + '</button></div>';
    }

    function mcqBlock(id, prompt, options, coach) {
      var passed = checkPassed(id);
      var pick = state.checks[id];
      return '<div class="ob-check"><h5>' + prompt + '</h5>'
        + options.map(function (opt, i) {
          var cls = passed && i === CHECK_ANSWERS[id] ? ' right' : (pick === i && i !== CHECK_ANSWERS[id] ? ' wrong' : '');
          return '<button class="ob-choice' + cls + '" data-mcq="' + id + '" data-pick="' + i + '"' + (passed ? ' disabled' : '') + '>' + esc(opt) + '</button>';
        }).join('')
        + '<div class="ob-feedback">' + (passed ? coach : (pick == null ? 'Select an answer to continue.' : 'Not yet. Review the lesson and try again.')) + '</div></div>';
    }

    function matchBlock(id, prompt, left, right) {
      var passed = checkPassed(id);
      var pairs = state.match[id] || {};
      return '<div class="ob-check"><h5>' + prompt + '</h5><div class="ob-match">'
        + '<div>' + left.map(function (item) {
          return '<div class="ob-chip' + (pairs[item.key] ? ' used' : '') + '" data-match="' + id + '" data-side="left" data-key="' + item.key + '">' + esc(item.label) + (pairs[item.key] ? ' → ' + esc((right.find(function (r) { return r.key === pairs[item.key]; }) || {}).label || '') : '') + '</div>';
        }).join('') + '</div>'
        + '<div>' + right.map(function (item) {
          return '<div class="ob-chip" data-match="' + id + '" data-side="right" data-key="' + item.key + '">' + esc(item.label) + '</div>';
        }).join('') + '</div></div>'
        + '<div class="ob-foot"><button class="ob-btn" data-match-submit="' + id + '"' + (passed ? ' disabled' : '') + '>' + (passed ? 'Matched' : 'Check matching') + '</button></div>'
        + '<div class="ob-feedback">' + (passed ? 'Correct pairing.' : 'Match every term, then check.') + '</div></div>';
    }

    function seqBlock(id, prompt, items) {
      var passed = checkPassed(id);
      var order = state.seq[id] || [];
      return '<div class="ob-check"><h5>' + prompt + '</h5><div class="ob-seq">'
        + items.map(function (item) {
          var n = order.indexOf(item.key);
          return '<button data-seq="' + id + '" data-key="' + item.key + '"' + (passed ? ' disabled' : '') + '>' + (n >= 0 ? (n + 1) + '. ' : '') + esc(item.label) + '</button>';
        }).join('') + '</div>'
        + '<div class="ob-feedback">' + (passed ? 'Correct sequence.' : 'Click the steps in the correct order.') + '</div></div>';
    }

    function welcomePanel() {
      return panelShell('Welcome — who we are', 5, 'Before products and policies, understand the company, your role and the promise we make to every client.',
        '<div class="ob-b"><h4>Who we are</h4><p>Kamuk Holdings is a simulated financial services company serving businesses, executives and international clients. You are learning how a professional investigates, communicates, decides and documents in English.</p></div>'
        + '<div class="ob-b"><h4>What we do</h4><div class="ob-grid">'
        + '<div class="ob-card"><i class="ti ti-user-heart"></i><b>Protect the client</b><p>Keep money, access and private information safe.</p></div>'
        + '<div class="ob-card"><i class="ti ti-search"></i><b>Investigate</b><p>Use CRM evidence before explaining or promising.</p></div>'
        + '<div class="ob-card"><i class="ti ti-route"></i><b>Resolve or route</b><p>Take the safe action you own or escalate with a clear owner.</p></div>'
        + '<div class="ob-card"><i class="ti ti-notes"></i><b>Leave a trail</b><p>Document facts, actions and the timed next step.</p></div></div></div>'
        + '<div class="ob-b"><h4>Client promise</h4><p><strong>Clear, calm and accountable.</strong> We do not hide behind policy, guess, over-promise or make the client repeat information already in the CRM.</p></div>'
        + mcqBlock('welcome-mcq', 'Knowledge check: what is the Kamuk Holdings client promise?',
          ['Clear, calm and accountable service with investigation, a safe action and a timed next step.', 'Fast refunds on every complaint.', 'Transfer every difficult client to a supervisor immediately.'],
          'Correct. Ownership plus evidence plus a next step.')
        + continueBtn('service', checkPassed('welcome-mcq')));
    }

    function servicePanel() {
      return panelShell('Service — empathy, rapport and ownership', 8, 'Professional service starts by understanding impact, not by memorizing apologies.',
        '<div class="ob-compare"><div class="ob-empathy"><b>Empathy — use it</b><p>“You have called three times and your suppliers are still unpaid. I understand why this is urgent.”</p></div><div class="ob-sympathy"><b>Sympathy — do not stop here</b><p>“I feel so sorry for you. That is terrible.”</p></div></div>'
        + '<div class="ob-b" style="margin-top:14px"><h4>Rapport and ownership</h4><p>Rapport is professional trust. Ownership uses “I”, a concrete action and an observable next step.</p></div>'
        + mcqBlock('service-scenario', 'Scenario: the client says “This is the third time.” What do you do first?',
          ['Ask them to explain everything from the beginning.', 'Acknowledge the repeated effort and review previous contacts in the CRM.', 'Transfer immediately because they sound angry.'],
          'Correct. Remove effort from the client and use the history already available.')
        + matchBlock('service-match', 'Match each concept to its purpose.',
          [{ key: 'empathy', label: 'Empathy' }, { key: 'sympathy', label: 'Sympathy' }, { key: 'rapport', label: 'Rapport' }],
          [{ key: 'impact', label: 'Names the client’s specific impact' }, { key: 'emotion', label: 'Describes your feelings' }, { key: 'trust', label: 'Creates professional trust to work the case' }])
        + continueBtn('comms', checkPassed('service-scenario') && checkPassed('service-match')));
    }

    function commsPanel() {
      return panelShell('Call control — professional communication', 8, 'A controlled call has a clear sequence. Do not skip investigation to please the client.',
        '<div class="ob-process"><div><b>1. Acknowledge</b><span>Name the impact</span></div><div><b>2. Investigate</b><span>Open and closed questions</span></div><div><b>3. Act</b><span>Safe action you own</span></div><div><b>4. Next step</b><span>Owner + time</span></div></div>'
        + '<div class="ob-b"><h4>Question types</h4><ul><li>Open: “What happened after the decline?”</li><li>Closed: “Is the card in your hand now?”</li></ul></div>'
        + seqBlock('comms-seq', 'Put the call-control sequence in order.',
          [{ key: 'act', label: 'Take or route a safe action' }, { key: 'acknowledge', label: 'Acknowledge impact' }, { key: 'next', label: 'Confirm a timed next step' }, { key: 'investigate', label: 'Investigate with evidence' }])
        + continueBtn('products', checkPassed('comms-seq')));
    }

    function productsPanel() {
      return panelShell('Products and client needs', 10, 'Match the client need to the right product before you promise anything.',
        '<div class="ob-grid">'
        + '<div class="ob-product"><b>Operating Account</b><small>Daily money movement</small><p>Deposits, supplier payments, payroll and transfers.</p></div>'
        + '<div class="ob-product"><b>Obsidian Corporate Card</b><small>Travel and spend</small><p>Hotel, dining and travel. Needs travel notices and limits.</p></div>'
        + '<div class="ob-product"><b>Expansion Financing</b><small>Growth capital</small><p>Loans subject to underwriting. Never promise approval.</p></div>'
        + '<div class="ob-product"><b>Concierge / VIP</b><small>Aviation and ground</small><p>Activate verified itineraries; do not promise unconfirmed seats.</p></div></div>'
        + matchBlock('products-match', 'Match the client need to the product.',
          [{ key: 'payroll', label: 'Pay 45 employees today' }, { key: 'hotel', label: 'Hotel declined the card in Miami' }, { key: 'expansion', label: 'Need $1.2M to open a second warehouse' }],
          [{ key: 'operating', label: 'Operating Account' }, { key: 'obsidian', label: 'Obsidian Corporate Card' }, { key: 'loan', label: 'Expansion Financing' }])
        + continueBtn('compliance', checkPassed('products-match')));
    }

    function compliancePanel() {
      var passedTf = checkPassed('compliance-tf');
      var passedMulti = checkPassed('compliance-multi');
      var selected = state.multi['compliance-multi'] || [];
      return panelShell('CRM evidence, security and compliance', 10, 'The CRM is the source of truth. Card data, identity and AML rules protect the client and the bank.',
        '<div class="ob-b"><h4>Security rules</h4><ul><li>Verify identity before disclosing account or card data.</li><li>You may read last 6 digits only — never the full number or the PIN.</li><li>Do not tip off a client during an AML or SAR review.</li></ul></div>'
        + '<div class="ob-check"><h5>True or false: after the client asks, you may read the full card number.</h5>'
        + '<button class="ob-choice' + (passedTf ? ' right' : '') + '" data-tf="compliance-tf" data-val="true"' + (passedTf ? ' disabled' : '') + '>True</button>'
        + '<button class="ob-choice' + (passedTf ? ' right' : '') + '" data-tf="compliance-tf" data-val="false"' + (passedTf ? ' disabled' : '') + '>False</button>'
        + '<div class="ob-feedback">' + (passedTf ? 'False. Last 6 digits only, and only after verification.' : 'Choose true or false.') + '</div></div>'
        + '<div class="ob-check"><h5>Select every safe control. Then submit.</h5>'
        + [['last6', 'Confirm last 6 digits after verification'], ['full-pan', 'Read the full card number if the client insists'], ['never-pin', 'Never share or regenerate a PIN on an unverified call'], ['sar-hint', 'Tell the client a SAR is being filed']].map(function (item) {
          var on = selected.indexOf(item[0]) >= 0;
          return '<label class="ob-opt"><input type="checkbox" data-multi="compliance-multi" value="' + item[0] + '"' + (on ? ' checked' : '') + (passedMulti ? ' disabled' : '') + '> ' + esc(item[1]) + '</label>';
        }).join('')
        + '<div class="ob-foot"><button class="ob-btn" data-multi-submit="compliance-multi"' + (passedMulti ? ' disabled' : '') + '>Check</button></div>'
        + '<div class="ob-feedback">' + (passedMulti ? 'Correct. Last 6 and never share the PIN on an unverified call.' : 'Select only the safe controls.') + '</div></div>'
        + continueBtn('resolution', passedTf && passedMulti));
    }

    function resolutionPanel() {
      return panelShell('Resolution, escalation, documentation and email', 8, 'Every completed touch needs a client email and a brief internal note. Dispositions such as AA, PSA or queue hand the case to another agent.',
        '<div class="ob-b"><h4>Email standard</h4><p>Natural greeting, one connector, the action taken, a named owner and a timed next step. Paste is disabled.</p></div>'
        + '<div class="ob-b"><h4>Note standard</h4><p>Brief, factual, auditable: evidence, action, next step.</p></div>'
        + mcqBlock('resolution-email', 'Which client email meets the standard?',
          ['Hello, I reviewed the duplicate charge because the timestamps match. I opened the dispute and will call you today before 4:45 p.m.', 'Dear client, refund refund refund dispute merchant timeline authorization.', 'OK I will see what I can do later.'],
          'Correct. Natural opening, connector, action and a timed next step.')
        + continueBtn('quiz', checkPassed('resolution-email')));
    }

    function ensureQuizOrder() {
      if (state.quizOrder && state.quizOrder.length >= 10) return;
      var ids = CERT_BANK.map(function (q) { return q.id; });
      for (var i = ids.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp;
      }
      state.quizOrder = ids.slice(0, 10);
      save();
    }

    function quizPanel() {
      if (!REQUIRED_DONE.slice(0, 6).every(function (id) { return id === 'quiz' || id === 'mock' || moduleReady(id); })) {
        return '<div class="ob-panel"><div class="ob-locked"><i class="ti ti-lock"></i><p>Finish the six learning modules before the certification.</p></div></div>';
      }
      ensureQuizOrder();
      var passed = quizPassed();
      return panelShell('Final certification', 4, 'Answer 10 questions. You need 80% to continue. Failed attempts show coaching, not a full answer key, and you may retry.',
        (passed ? '<div class="ob-cert"><i class="ti ti-rosette-discount-check"></i><div><b>Certified ' + quizScore() + '%</b><span>Guided CRM is unlocked</span></div></div>' : '')
        + state.quizOrder.map(function (id, index) {
          var q = CERT_BANK.find(function (item) { return item.id === id; });
          var pick = state.quizAnswers[id];
          var show = passed || pick != null;
          return '<div class="ob-q' + (show && pick === q.answer ? ' right' : (show && pick != null ? ' wrong' : '')) + '" data-qid="' + id + '"><h5>' + (index + 1) + '. ' + esc(q.q) + '</h5>'
            + q.options.map(function (opt, i) {
              return '<label class="ob-opt' + (show && i === q.answer && passed ? ' right' : '') + '"><input type="radio" name="' + id + '" data-quiz="' + id + '" data-pick="' + i + '"' + (pick === i ? ' checked' : '') + (passed ? ' disabled' : '') + '> ' + esc(opt) + '</label>';
            }).join('')
            + (show ? '<div class="ob-why">' + esc(q.why) + '</div>' : '') + '</div>';
        }).join('')
        + '<div class="ob-foot"><button class="ob-btn" id="ob-submit"' + (passed ? ' disabled' : '') + '>Submit certification</button>'
        + (passed ? '<button class="ob-btn" data-next="mock">Continue to Guided CRM</button>' : '')
        + '<span class="ob-msg" id="ob-score">' + (passed ? quizScore() + '% · passed' : '80% required · attempt ' + ((state.quizAttempts || 0) + 1)) + '</span></div>');
    }

    function cls(target, name) {
      var task = MOCK_TASKS[Math.min(state.mockIndex || 0, MOCK_TASKS.length - 1)];
      return name + (task && task.target === target ? ' gm-target' : '');
    }

    function crmView(panel) {
      if (panel === 'complete') return '<div class="gm-complete"><i class="ti ti-circle-check"></i><h4>Guided CRM complete</h4><p>You located evidence, products and history, then documented the next step.</p></div>';
      if (panel === 'services') return '<div class="' + cls('product-operating', 'gm-product') + '" data-gm="product-operating"><small>Operating Account</small><b>Operating Account · Rivera Logistics</b><span>Payroll and supplier payments</span></div><div class="gm-product"><small>Card</small><b>Obsidian Corporate Card</b><span>Active</span></div>';
      if (panel === 'account') return '<div class="gm-metrics"><div class="gm-metric"><small>Available</small><b>$42,110</b></div><div class="gm-metric"><small>Status</small><b>Restricted</b></div></div>';
      if (panel === 'statements') return '<div class="' + cls('tx-declined', 'gm-row') + '" data-gm="tx-declined"><span>Supplier ACH · $18,400</span><span class="gm-red">Declined</span></div><div class="gm-row"><span>Payroll batch</span><span class="gm-green">Posted</span></div>';
      if (panel === 'transaction') return '<p class="gm-red">Declined: insufficient available balance after restriction.</p>';
      if (panel === 'cards') return '<div class="gm-product"><b>Obsidian Corporate · 4821</b><span class="' + cls('card-status', '') + '" data-gm="card-status">Status: Active</span></div>';
      if (panel === 'card-detail') return '<p>Card is active. Last 6 remain masked until identity is verified on the live desk.</p>';
      if (panel === 'contacts') return '<div class="' + cls('contact-latest', 'gm-contact') + '" data-gm="contact-latest"><span>Today 09:12 · promised callback</span><span>Open</span></div><div class="gm-contact"><span>Yesterday · restriction notice</span><span>Closed</span></div>';
      if (panel === 'contact-detail') return '<p>Previous agent promised a callback before 11:00 a.m. and did not document a next owner.</p>';
      if (panel === 'note') return '<textarea class="' + cls('note-box', 'gm-note') + '" data-gm="note-box" readonly>Restriction on operating account blocked supplier ACH $18,400. Card remains active. Next step: Operations restore before 11:00 a.m. and confirm with client.</textarea><button class="' + cls('save-note', 'gm-save') + '" data-gm="save-note">Save note</button>';
      return '<div class="gm-metrics"><div class="gm-metric"><small>Priority</small><b>P1</b></div><div class="gm-metric"><small>Contacts</small><b>3</b></div><div class="gm-metric"><small>SLA</small><b>25 min</b></div></div>';
    }

    function guidedCrm() {
      var index = Math.min(state.mockIndex || 0, MOCK_TASKS.length - 1);
      var task = MOCK_TASKS[index];
      var activePanel = state.mockPanel || 'overview';
      if (state.done.indexOf('mock') >= 0 && (state.mockIndex || 0) >= MOCK_TASKS.length - 1) activePanel = 'complete';
      return '<div class="gm"><div class="gm-guide"><div class="gm-n">' + (index + 1) + '</div><div><b>' + task.prompt + '</b><p>Hint: ' + task.tip + '</p></div></div>'
        + '<div class="gm-shell"><aside class="gm-side"><div class="gm-brand">KAMUK HOLDINGS · TRAINING MOCK</div><div class="gm-label">Case queue</div>'
        + '<div class="' + cls('client-rivera', 'gm-client') + '" data-gm="client-rivera"><b>Marta Rivera</b><span>Operating account restricted</span></div>'
        + '<div class="gm-client"><b>Daniel Torres</b><span>Card declined abroad</span></div></aside>'
        + '<main class="gm-main"><div class="gm-top"><b>Marta Rivera · Rivera Logistics S.A.</b><span>Corporate · Mid-market</span></div>'
        + '<nav class="gm-tabs"><button class="gm-tab" data-gm="tab-overview">Overview</button><button class="' + cls('tab-statements', 'gm-tab') + '" data-gm="tab-statements">Statements</button><button class="' + cls('tab-services', 'gm-tab') + '" data-gm="tab-services">Services</button><button class="' + cls('tab-cards', 'gm-tab') + '" data-gm="tab-cards">Card transactions</button><button class="' + cls('tab-contacts', 'gm-tab') + '" data-gm="tab-contacts">Previous contacts</button><button class="' + cls('tab-note', 'gm-tab') + '" data-gm="tab-note">Internal note</button></nav>'
        + '<div class="gm-view">' + crmView(activePanel) + '</div></main></div></div>';
    }

    function mockPanel() {
      if (!quizPassed()) return '<div class="ob-panel"><div class="ob-locked"><i class="ti ti-lock"></i><p>Pass the certification at 80% before the guided CRM.</p></div></div>';
      return panelShell('Guided CRM — safe training environment', 7, 'This is not the production CRM. Click the highlighted control. The tour has 12 evidence hot-spots.',
        (state.done.indexOf('mock') >= 0 ? '<div class="ob-cert"><i class="ti ti-rosette-discount-check"></i><div><b>CRM navigation certified</b><span>Safe guided tour completed</span></div></div>' : '')
        + guidedCrm()
        + (state.done.indexOf('mock') >= 0 ? continueBtn('nesting', true, 'Continue to nesting cases') : ''));
    }

    function nestingPanel() {
      if (!courseReady() && !crmEnabled) return '<div class="ob-panel"><div class="ob-locked"><i class="ti ti-lock"></i><p>Nesting unlocks after the 60-minute path, certification and guided CRM.</p></div></div>';
      if (!rulesAck) {
        return panelShell('Nesting — 10 casos del queue', 0, 'Advertencia. Debés aceptar las reglas para participar. Este aviso aparece una vez por asignación semanal.',
          '<div class="ob-rules"><h4>Warning</h4>'
          + '<p>Se te asignaron <strong>10 casos</strong> del queue. Debés trabajarlos <strong>TODOS</strong> y obtener un score combinado igual o mayor a <strong>8/10</strong> para ganar el <strong>bono de producción</strong>. Se puede si lo hacés bien: sin AI, sin traductor, sin ayuda externa y sin copiar.</p>'
          + '<ul>'
          + '<li>Se examinarán: inglés profesional y estructura; linkers, connectors, phrasals, prefixes y suffixes; explicación; documentación; estructura del correo; claridad del mensaje; tiempo en tarea.</li>'
          + '<li>Pausa de más de 30 min = delay. <strong>3 delays el mismo día CR</strong> = penalización por delay.</li>'
          + '<li>Respuestas escuetas o sin sentido = fallo. Traductor o IA = pierden / no elegibles al premio.</li>'
          + '</ul><div class="ob-rules-actions"><button class="ob-btn" id="ob-rules-ack">Aceptar y participar</button><button class="ob-btn ob-btn-ghost" id="ob-rules-cancel">Cancelar</button></div></div>');
      }
      var completed = HOME_CASES.filter(function (item) { return homeAnswerStatus(item, state.homeAnswers[item.id] || '').ready; }).length;
      var ready = deskUnlocked();
      return panelShell('Nesting — 10 written cases, untimed', 0, 'No time limit. Complete all 10 structured responses. Open the Holdings desk to work the cases in the CRM.',
        '<div class="ob-cert"><i class="ti ti-circle-check"></i><div><b>' + (ready ? 'Holdings desk ready' : 'Write all 10 cases') + '</b><span>' + (ready ? 'Open the CRM to document the 10 nesting cases' : completed + '/10 structured responses ready') + '</span></div></div>'
        + '<div class="ob-foot"><button class="ob-btn" id="ob-launch"' + (ready ? '' : ' disabled') + '><i class="ti ti-building-bank"></i> Open the Holdings desk</button><span class="ob-msg">' + (ready ? 'Opens in a new tab with your Training Book session.' : 'Desk stays locked until all 10 cases meet the rubric.') + '</span></div>'
        + (product === 'kamuk' ? '<div class="ob-home-rules"><strong>Premio:</strong> 8/10+ esta semana gana bono de producción. Tres pausas de más de 30 minutos el mismo día CR descuentan. Patrones de IA/traductor no son elegibles al premio.</div>' : '')
        + '<div class="ob-home-head"><h4>Home practice · 10 written cases</h4><p>Write 100–200 words in your own English. Use the glossary in Recursos (método linkers, phrasals, prefixes/suffixes). Name the disposition and explain why.</p></div>'
        + '<div class="ob-home-progress">' + completed + '/10 responses meet the rubric</div>'
        + HOME_CASES.map(function (item, index) {
          var answer = state.homeAnswers[item.id] || '';
          var status = homeAnswerStatus(item, answer);
          return '<div class="ob-home-case" data-home-case="' + item.id + '"><div class="ob-home-top"><b>' + (index + 1) + ' · ' + esc(item.title) + '</b><span>' + (status.ready ? 'Ready ✓' : status.words + ' words') + '</span></div>'
            + '<div class="ob-home-body"><div class="ob-home-rules"><strong>Case facts:</strong> ' + esc(item.facts) + '</div><div class="ob-home-line">' + esc(item.line) + '</div>'
            + '<div class="ob-home-rules"><strong>Required:</strong> acknowledge impact → one open and one closed question → explain why (policy) → safe action/disposition → timed next step. Use método linkers from Recursos.</div>'
            + '<textarea class="ob-home-answer" data-home-answer="' + item.id + '" autocomplete="off" spellcheck="true" placeholder="Type your response here. Pasting and dropping text are disabled.">' + esc(answer) + '</textarea>'
            + '<div class="ob-no-paste"><i class="ti ti-keyboard"></i> Type only: paste and drag/drop are disabled.</div>'
            + '<div class="ob-home-status' + (status.ready ? ' ok' : '') + '">' + esc(status.message) + '</div></div></div>';
        }).join(''));
    }

    function homeAnswerStatus(item, answer) {
      var text = String(answer || '').trim();
      var lower = text.toLowerCase();
      var words = text ? text.split(/\s+/).filter(Boolean).length : 0;
      var sentences = text.split(/[.!?]+/).filter(function (part) { return part.trim(); });
      var connectorCount = item.connectors.filter(function (word) { return lower.indexOf(word.toLowerCase()) >= 0; }).length;
      var methodHits = METHOD_PHRASES.filter(function (word) { return lower.indexOf(word) >= 0; }).length;
      var familyUsed = item.family.some(function (word) { return lower.indexOf(word.toLowerCase()) >= 0; });
      var phrasalUsed = lower.indexOf(item.phrasal.toLowerCase()) >= 0;
      var vocabCount = item.vocab.filter(function (word) { return lower.indexOf(word.toLowerCase()) >= 0; }).length;
      var resolutionHits = (item.resolution || []).filter(function (word) { return lower.indexOf(word.toLowerCase()) >= 0; }).length;
      var forbiddenHit = (item.forbidden || []).some(function (word) { return lower.indexOf(word.toLowerCase()) >= 0; });
      var whyHits = (item.why || []).filter(function (word) { return lower.indexOf(word.toLowerCase()) >= 0; }).length;
      var dispositionHit = (item.disposition || []).some(function (word) { return lower.indexOf(word.toLowerCase()) >= 0; });
      var hasOpen = /\b(what|why|how|could you (explain|describe|walk)|can you (tell|explain|describe))\b/i.test(text);
      var hasClosed = /\b(did you|do you|have you|is this|are you|was the|can you confirm|could you confirm)\b/i.test(text);
      var timed = /\b(today|tomorrow|within|business day|a\.m\.|p\.m\.|\d{1,2}:\d{2})\b/i.test(text);
      var owner = /\b(i will|i am|i own|owner|operations|supervisor|follow up|follow-up|next agent)\b/i.test(text);
      var ready = words >= 100 && words <= 200 && sentences.length >= 4 && connectorCount >= 2 && methodHits >= 1 && familyUsed && phrasalUsed && vocabCount >= 2 && resolutionHits >= 2 && dispositionHit && !forbiddenHit && whyHits >= 2 && hasOpen && hasClosed && timed && owner;
      var missing = [];
      if (words < 100) missing.push('substance (100–200 words)');
      if (words > 200) missing.push('shorten to 200 words');
      if (connectorCount < 2 || methodHits < 1) missing.push('connectors + método linker');
      if (!familyUsed) missing.push('a prefix/suffix family form');
      if (!phrasalUsed) missing.push('the phrasal verb');
      if (vocabCount < 2) missing.push('two case terms');
      if (resolutionHits < 2 || !dispositionHit || forbiddenHit) missing.push('a correct disposition and safe resolution');
      if (whyHits < 2) missing.push('a policy explanation');
      if (!hasOpen || !hasClosed) missing.push('one open and one closed question');
      if (!timed || !owner) missing.push('owner + timed next step');
      return { ready: ready, words: words, message: ready ? 'Rubric complete · ' + words + ' words.' : 'Still needed: ' + missing.join(' · ') };
    }

    function panel() {
      if (state.step === 'welcome') return welcomePanel();
      if (state.step === 'service') return servicePanel();
      if (state.step === 'comms') return commsPanel();
      if (state.step === 'products') return productsPanel();
      if (state.step === 'compliance') return compliancePanel();
      if (state.step === 'resolution') return resolutionPanel();
      if (state.step === 'quiz') return quizPanel();
      if (state.step === 'mock') return mockPanel();
      return nestingPanel();
    }

    function render() {
      root.innerHTML = '<div class="ob"><div class="ob-head"><small>' + PROGRAM.label + '</small><h2>' + PROGRAM.title + '</h2><p>' + PROGRAM.intro + '</p>' + pathMeter() + '</div>' + rail() + panel() + '</div>';
    }

    function markCheck(id, value) {
      var ok = sameAnswer(CHECK_ANSWERS[id], value);
      if (ok) {
        state.checks[id] = value;
        var moduleId = Object.keys(CHECK_KEYS).find(function (key) { return CHECK_KEYS[key].indexOf(id) >= 0; });
        if (moduleId && CHECK_KEYS[moduleId].every(checkPassed)) complete(moduleId);
      } else {
        delete state.checks[id];
        if (state.seq[id]) state.seq[id] = [];
      }
      save();
      render();
    }

    root.addEventListener('click', function (event) {
      var step = event.target.closest('.ob-step');
      if (step) {
        if (!step.classList.contains('locked')) go(step.dataset.step);
        return;
      }
      var next = event.target.closest('[data-next]');
      if (next && !next.disabled) {
        complete(state.step);
        go(next.dataset.next);
        return;
      }
      var mcq = event.target.closest('[data-mcq]');
      if (mcq) {
        markCheck(mcq.dataset.mcq, Number(mcq.dataset.pick));
        return;
      }
      var tf = event.target.closest('[data-tf]');
      if (tf) {
        markCheck(tf.dataset.tf, tf.dataset.val === 'true');
        return;
      }
      var matchEl = event.target.closest('[data-match]');
      if (matchEl && matchEl.dataset.side) {
        var id = matchEl.dataset.match;
        matchPick[id] = matchPick[id] || {};
        if (matchEl.dataset.side === 'left') matchPick[id].left = matchEl.dataset.key;
        if (matchEl.dataset.side === 'right') matchPick[id].right = matchEl.dataset.key;
        if (matchPick[id].left && matchPick[id].right) {
          state.match[id] = state.match[id] || {};
          state.match[id][matchPick[id].left] = matchPick[id].right;
          matchPick[id] = {};
          save();
          render();
        }
        return;
      }
      var matchSubmit = event.target.closest('[data-match-submit]');
      if (matchSubmit) {
        markCheck(matchSubmit.dataset.matchSubmit, state.match[matchSubmit.dataset.matchSubmit] || {});
        return;
      }
      var seqBtn = event.target.closest('[data-seq]');
      if (seqBtn) {
        var sid = seqBtn.dataset.seq;
        state.seq[sid] = state.seq[sid] || [];
        if (state.seq[sid].indexOf(seqBtn.dataset.key) < 0) state.seq[sid].push(seqBtn.dataset.key);
        var expected = CHECK_ANSWERS[sid];
        if (state.seq[sid].length === expected.length) markCheck(sid, state.seq[sid]);
        else { save(); render(); }
        return;
      }
      var multiSubmit = event.target.closest('[data-multi-submit]');
      if (multiSubmit) {
        var mid = multiSubmit.dataset.multiSubmit;
        var picked = Array.prototype.map.call(root.querySelectorAll('[data-multi="' + mid + '"]:checked'), function (el) { return el.value; });
        state.multi[mid] = picked;
        markCheck(mid, picked.slice().sort());
        return;
      }
      if (event.target.closest('#ob-submit')) {
        state.quizAttempts = (state.quizAttempts || 0) + 1;
        state.quizScore = quizScore();
        if (quizPassed()) complete('quiz');
        save();
        render();
        return;
      }
      if (event.target.closest('#ob-rules-ack')) {
        rulesAck = true;
        if (studentId && authToken()) {
          api(crmBase + '/training/progress', { method: 'POST', body: Object.assign(trainingPayload(), { acceptCasesRules: true }) })
            .then(function (data) {
              if (data && data.casesRulesAccepted) rulesAck = true;
              if (data && data.nestingCompletedAt) nestingCompletedAt = data.nestingCompletedAt;
              render();
            })
            .catch(function () { render(); });
        } else render();
        return;
      }
      if (event.target.closest('#ob-rules-cancel')) {
        go(state.done.indexOf('mock') >= 0 ? 'mock' : 'welcome');
        return;
      }
      if (event.target.closest('#ob-launch')) {
        if (!deskUnlocked()) return;
        pushProgress().then(function (data) {
          if (data && data.nestingCompletedAt) nestingCompletedAt = data.nestingCompletedAt;
          if (data && data.crmEnabled) crmEnabled = true;
          if (deskUnlocked()) window.open(launchUrl + (launchUrl.indexOf('?') >= 0 ? '&' : '?') + 'product=' + encodeURIComponent(product), '_blank', 'noopener');
          else render();
        }).catch(function () {
          if (deskUnlocked()) window.open(launchUrl + (launchUrl.indexOf('?') >= 0 ? '&' : '?') + 'product=' + encodeURIComponent(product), '_blank', 'noopener');
        });
        return;
      }
      var homeTop = event.target.closest('.ob-home-top');
      if (homeTop) { homeTop.parentElement.classList.toggle('open'); return; }
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
        }
        save();
        render();
      }
    });

    root.addEventListener('change', function (event) {
      var quiz = event.target.closest('[data-quiz]');
      if (quiz) {
        state.quizAnswers[quiz.dataset.quiz] = Number(quiz.dataset.pick);
        save();
      }
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
    setInterval(function () {
      if (state.step === 'nesting' && rulesAck) scheduleSync();
    }, 45000);
  }

  window.SimulationOnboarding = { mount: mount, quiz: CERT_BANK, mockTasks: MOCK_TASKS };
})();
