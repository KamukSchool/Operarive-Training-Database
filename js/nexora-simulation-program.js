/**
 * Nexora simulation program contract — Engine programs, Lab executes exactly.
 * Shared by Infinity Engine, Kamuk Engine, Portal handoff, and nexora.html.
 */
var NEXORA_SIM_PROGRAM = (function () {
  'use strict';

  var TYPE_LABELS = {
    mock_interview: 'STAR Mock Interview',
    customer_service: 'Customer Service',
    team_meeting: 'Team Meeting',
    problem_solving: 'Problem Solving',
    presentation: 'Executive Presentation',
    negotiation: 'Negotiation',
    stakeholder: 'Stakeholder Discussion'
  };

  var LAB_TYPE_MAP = {
    customer_service: 'customer_service',
    mock_interview: 'star_interview',
    team_meeting: 'meeting',
    problem_solving: 'customer_service',
    presentation: 'corporate',
    negotiation: 'negotiation',
    stakeholder: 'stakeholder',
    star_interview: 'star_interview'
  };

  var ROLE_QUESTION_BANKS = {
    'Customer Support Specialist': [
      'Tell me about a time you handled a difficult or upset customer.',
      'Describe a situation where you had to solve a problem with incomplete information.',
      'Tell me about a time you took ownership of an issue beyond the basic handoff.',
      'Give me an example of how you managed competing priorities or a heavy queue.',
      'Describe a time you had to say no to a customer request while protecting the relationship.',
      'Tell me about a measurable improvement you delivered in support quality or handle time.'
    ],
    'Sales Representative': [
      'Tell me about a time you turned a hesitant prospect into a closed deal.',
      'Describe how you handled an objection about price or competitors.',
      'Give an example of building trust with a skeptical client.',
      'Tell me about a time you missed a target and what you changed.',
      'Describe a negotiation where both sides walked away satisfied.',
      'Tell me about a time you used data or discovery questions to uncover real need.'
    ],
    'Administrative Coordinator': [
      'Tell me about a time you coordinated across multiple stakeholders under a deadline.',
      'Describe how you handled conflicting instructions from two managers.',
      'Give an example of improving a process that reduced errors or delays.',
      'Tell me about a time you protected confidential information under pressure.',
      'Describe a situation where you had to escalate without creating drama.',
      'Tell me about a measurable operational improvement you owned.'
    ],
    'Junior Software / IT Support': [
      'Tell me about a time you diagnosed a technical issue with limited information.',
      'Describe how you explained a technical problem to a non-technical stakeholder.',
      'Give an example of owning a bug or outage from detection to resolution.',
      'Tell me about a time you disagreed with a technical approach and how you handled it.',
      'Describe learning a new tool or stack quickly to deliver under pressure.',
      'Tell me about a measurable reliability or support improvement you contributed to.'
    ]
  };

  function uid(prefix) {
    return (prefix || 'sim') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj || {}));
  }

  function labType(engineType) {
    return LAB_TYPE_MAP[engineType] || engineType || 'customer_service';
  }

  function defaultParticipants(type, industryLabel) {
    var company = industryLabel || 'Regional Employer';
    if (type === 'mock_interview') {
      return [
        { name: 'James Okafor', role: 'Senior Talent Acquisition Partner', speaks: true },
        { name: 'Priya Shah', role: 'Hiring Manager', speaks: true },
        { name: 'Marcus Chen', role: 'Team Lead', speaks: true }
      ];
    }
    if (type === 'team_meeting') {
      return [
        { name: 'Alex Rivera', role: 'Team Lead', speaks: true },
        { name: 'Sam Torres', role: 'Operations', speaks: true },
        { name: 'Jordan Lee', role: 'Analyst', speaks: true }
      ];
    }
    if (type === 'presentation' || type === 'stakeholder') {
      return [
        { name: 'Elena Vargas', role: 'Director', speaks: true },
        { name: 'Chris Nolan', role: 'Finance Partner', speaks: true },
        { name: 'Dana Brooks', role: 'Stakeholder', speaks: true }
      ];
    }
    if (type === 'negotiation') {
      return [{ name: 'Robin Hale', role: 'Counterparty', speaks: true }];
    }
    // CS / problem solving — one client
    return [{ name: 'Client', role: 'Customer', speaks: true, company: company }];
  }

  function defaultTargetRole(type, industry) {
    if (type !== 'mock_interview') return '';
    var key = String(industry || '').toLowerCase();
    if (/tech/.test(key)) return 'Junior Software / IT Support';
    if (/retail|telecom|sales/.test(key)) return 'Sales Representative';
    if (/corporate|finance|education/.test(key)) return 'Administrative Coordinator';
    return 'Customer Support Specialist';
  }

  function defaultQuestionPlan(type, targetRole) {
    if (type !== 'mock_interview') return [];
    var bank = ROLE_QUESTION_BANKS[targetRole] || ROLE_QUESTION_BANKS['Customer Support Specialist'];
    return bank.slice();
  }

  function defaultObjectives(type) {
    if (type === 'mock_interview') {
      return [
        'Answer with complete STAR evidence (Situation, Task, Action, Result)',
        'Show individual ownership and measurable impact',
        'Use professional register appropriate to the target role'
      ];
    }
    if (type === 'customer_service' || type === 'problem_solving') {
      return [
        'Identify the customer issue accurately',
        'Use CRM actions that match policy',
        'Close with a clear disposition and next steps'
      ];
    }
    if (type === 'negotiation') {
      return ['State a clear position', 'Trade concessions for value', 'Reach or document a credible close'];
    }
    if (type === 'presentation' || type === 'stakeholder') {
      return ['Explain ROI clearly', 'Handle pushback with evidence', 'Secure approve / revise / reject decision'];
    }
    return ['Contribute clearly', 'Listen and respond to other participants', 'Move the agenda forward'];
  }

  function defaultPassCriteria(type) {
    if (type === 'mock_interview') {
      return {
        minOverall: 70,
        requireStarComplete: true,
        outcomePass: 'HIRE',
        outcomeFail: 'NO_HIRE',
        alsoPass: ['MAYBE']
      };
    }
    return {
      minOverall: 70,
      minClientSatisfaction: 7,
      outcomePass: 'RESOLVED',
      outcomeFail: 'FAILED'
    };
  }

  function defaultArcBeats(type) {
    if (type === 'customer_service' || type === 'problem_solving') {
      return ['State concern', 'Challenge weak handling', 'Release key facts', 'Accept credible close'];
    }
    if (type === 'mock_interview') {
      return ['Intro', 'Core STAR questions with rotation', 'Follow-ups for missing evidence', 'Candidate questions', 'Close'];
    }
    return ['Open', 'Work the agenda', 'Pressure-test', 'Decide / close'];
  }

  function defaultTitle(type, targetRole, industryLabel) {
    if (type === 'mock_interview') {
      return (targetRole || 'Open Role') + ' — Professional STAR Interview';
    }
    return (TYPE_LABELS[type] || type) + (industryLabel ? ' — ' + industryLabel : '');
  }

  function defaultDesc(type, targetRole) {
    if (type === 'mock_interview') {
      return 'Structured behavioral interview for ' + (targetRole || 'the open role') + ' with a rotating recruiter panel.';
    }
    if (type === 'customer_service' || type === 'problem_solving') {
      return 'Live customer case. Resolve the issue using CRM discipline and clear communication.';
    }
    return TYPE_LABELS[type] || 'Professional simulation';
  }

  /** Build a full editable program from Engine form fields (+ optional overrides). */
  function buildProgram(input) {
    var type = input.type || 'customer_service';
    var industry = input.industry || 'corporate';
    var industryLabel = input.industryLabel || industry;
    var difficulty = parseInt(input.difficulty, 10) || 3;
    var targetRole = input.targetRole || defaultTargetRole(type, industry);
    var participants = Array.isArray(input.participants) && input.participants.length
      ? input.participants
      : defaultParticipants(type, industryLabel);
    // Clamp panel size 2–4 for multi-person types; CS stays 1
    if (type === 'mock_interview' || type === 'team_meeting' || type === 'presentation' || type === 'stakeholder') {
      if (participants.length < 2) participants = defaultParticipants(type, industryLabel);
      if (participants.length > 4) participants = participants.slice(0, 4);
    }
    var questionPlan = Array.isArray(input.questionPlan) && input.questionPlan.length
      ? input.questionPlan
      : defaultQuestionPlan(type, targetRole);
    var objectives = Array.isArray(input.objectives) && input.objectives.length
      ? input.objectives
      : defaultObjectives(type);
    var passCriteria = input.passCriteria || defaultPassCriteria(type);
    var passScore = input.passScore != null ? Number(input.passScore) : (passCriteria.minOverall || 70);
    passCriteria.minOverall = passScore;

    var simulationId = input.simulationId || uid('nx');
    var program = {
      simulationId: simulationId,
      type: type,
      typeLabel: TYPE_LABELS[type] || type,
      industry: industry,
      industryLabel: industryLabel,
      difficulty: difficulty,
      poolKey: null,
      targetRole: targetRole,
      title: input.title || defaultTitle(type, targetRole, industryLabel),
      desc: input.desc || defaultDesc(type, targetRole),
      participants: participants,
      objectives: objectives,
      questionPlan: questionPlan,
      arcBeats: Array.isArray(input.arcBeats) && input.arcBeats.length ? input.arcBeats : defaultArcBeats(type),
      passCriteria: passCriteria,
      passScore: passScore,
      pinned: true,
      setAt: input.setAt || new Date().toISOString(),
      setBy: input.setBy || '',
      company: input.company || industryLabel || 'Regional Employer',
      mood: input.mood || (type === 'customer_service' || type === 'problem_solving' ? 'frustrated' : undefined),
      objective: input.objective || (objectives[0] || ''),
      obstacle: input.obstacle || '',
      measurableClose: input.measurableClose || '',
      issueType: input.issueType || '',
      justification: input.justification || ''
    };
    if (typeof NEXORA_INDUSTRY !== 'undefined' && NEXORA_INDUSTRY.scenarioPoolKey) {
      program.poolKey = NEXORA_INDUSTRY.scenarioPoolKey(program);
    }
    return program;
  }

  /** Convert a stored program into the exact Lab scenario object (no bank rotation). */
  function programToScenario(program) {
    if (!program || !program.type) return null;
    var type = labType(program.type);
    var participants = (program.participants || []).slice();
    var lead = participants[0] || { name: 'Interviewer', role: 'Recruiter' };
    var sc = {
      id: program.simulationId || uid('pinned'),
      simulationId: program.simulationId,
      pinned: true,
      poolKey: program.poolKey || null,
      type: type,
      engineType: program.type,
      title: program.title,
      desc: program.desc,
      diff: program.difficulty || 3,
      industry: program.industryLabel || program.industry,
      crmIndustry: program.industryLabel || program.industry,
      company: program.company || program.industryLabel || 'Regional Employer',
      candidateRole: program.targetRole || '',
      interviewer: lead.name,
      role: lead.role,
      panelists: participants.map(function (p) { return p.name + (p.role ? ' — ' + p.role : ''); }),
      participants: participants,
      starFocus: (program.questionPlan || []).slice(),
      questionCount: (program.questionPlan || []).length || 6,
      objectives: program.objectives || [],
      passCriteria: program.passCriteria || defaultPassCriteria(program.type),
      passScore: program.passScore || 70,
      arcBeats: program.arcBeats || [],
      mood: program.mood,
      objective: program.objective,
      obstacle: program.obstacle,
      measurableClose: program.measurableClose,
      issueType: program.issueType,
      sessionLabel: (program.typeLabel || '') + (program.industryLabel ? ' — ' + program.industryLabel : ''),
      counterpart: lead.name
    };
    return sc;
  }

  function isPinnedProgram(cfg) {
    return !!(cfg && (cfg.pinned || cfg.simulationId) && cfg.type);
  }

  function parseParticipantsText(text) {
    // One per line: Name — Role
    return String(text || '')
      .split(/\n+/)
      .map(function (line) { return line.trim(); })
      .filter(Boolean)
      .map(function (line) {
        var parts = line.split(/\s+[—\-|]\s+/);
        return { name: (parts[0] || 'Participant').trim(), role: (parts[1] || 'Panelist').trim(), speaks: true };
      });
  }

  function participantsToText(list) {
    return (list || []).map(function (p) {
      return (p.name || 'Participant') + ' — ' + (p.role || 'Panelist');
    }).join('\n');
  }

  function questionsToText(list) {
    return (list || []).join('\n');
  }

  function parseQuestionsText(text) {
    return String(text || '')
      .split(/\n+/)
      .map(function (l) { return l.replace(/^\d+[\).\s]+/, '').trim(); })
      .filter(Boolean);
  }

  function fillEngineFormFromProgram(program, ids) {
    // ids: map of element ids — optional helper for Engine UIs
    if (!program || !ids) return;
    var set = function (id, val) {
      var el = document.getElementById(id);
      if (el) el.value = val == null ? '' : val;
    };
    set(ids.type, program.type);
    set(ids.industry, program.industry);
    set(ids.difficulty, String(program.difficulty || 3));
    set(ids.targetRole, program.targetRole || '');
    set(ids.title, program.title || '');
    set(ids.desc, program.desc || '');
    set(ids.participants, participantsToText(program.participants));
    set(ids.questions, questionsToText(program.questionPlan));
    set(ids.objectives, (program.objectives || []).join('\n'));
    set(ids.passScore, String(program.passScore || 70));
    set(ids.justify, program.justification || '');
  }

  function readEngineForm(ids, meta) {
    var get = function (id) {
      var el = document.getElementById(id);
      return el ? el.value : '';
    };
    var type = get(ids.type) || 'customer_service';
    var industry = get(ids.industry) || 'corporate';
    var industryLabel = (typeof NEXORA_INDUSTRY !== 'undefined' && NEXORA_INDUSTRY.labelForEngineValue)
      ? NEXORA_INDUSTRY.labelForEngineValue(industry)
      : industry;
    return buildProgram({
      simulationId: (meta && meta.simulationId) || undefined,
      type: type,
      industry: industry,
      industryLabel: industryLabel,
      difficulty: parseInt(get(ids.difficulty), 10) || 3,
      targetRole: get(ids.targetRole),
      title: get(ids.title),
      desc: get(ids.desc),
      participants: parseParticipantsText(get(ids.participants)),
      questionPlan: parseQuestionsText(get(ids.questions)),
      objectives: String(get(ids.objectives) || '').split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean),
      passScore: parseInt(get(ids.passScore), 10) || 70,
      justification: get(ids.justify),
      setBy: (meta && meta.setBy) || '',
      company: get(ids.company) || industryLabel
    });
  }

  function applyTemplateToForm(type, industry, ids) {
    var industryLabel = (typeof NEXORA_INDUSTRY !== 'undefined' && NEXORA_INDUSTRY.labelForEngineValue)
      ? NEXORA_INDUSTRY.labelForEngineValue(industry)
      : industry;
    var program = buildProgram({ type: type, industry: industry, industryLabel: industryLabel });
    fillEngineFormFromProgram(program, ids);
    return program;
  }

  return {
    TYPE_LABELS: TYPE_LABELS,
    LAB_TYPE_MAP: LAB_TYPE_MAP,
    ROLE_QUESTION_BANKS: ROLE_QUESTION_BANKS,
    buildProgram: buildProgram,
    programToScenario: programToScenario,
    isPinnedProgram: isPinnedProgram,
    labType: labType,
    parseParticipantsText: parseParticipantsText,
    participantsToText: participantsToText,
    questionsToText: questionsToText,
    parseQuestionsText: parseQuestionsText,
    fillEngineFormFromProgram: fillEngineFormFromProgram,
    readEngineForm: readEngineForm,
    applyTemplateToForm: applyTemplateToForm,
    defaultParticipants: defaultParticipants,
    defaultTargetRole: defaultTargetRole,
    defaultQuestionPlan: defaultQuestionPlan,
    clone: clone
  };
})();
