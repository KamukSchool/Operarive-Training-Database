/**
 * Single source of truth: Engine industry → scenario pool + CRM.
 * NO cross-mapping (education≠banking, tourism≠telecom, etc.)
 */
var NEXORA_INDUSTRY = (function () {
  'use strict';

  var ENGINE = {
    corporate:   { pool: 'corporate',   crm: 'Corporate',   label: 'Corporate/Business' },
    tech:        { pool: 'technology',  crm: 'Technology',  label: 'Technology' },
    technology:  { pool: 'technology',  crm: 'Technology',  label: 'Technology' },
    healthcare:  { pool: 'healthcare',  crm: 'Healthcare',  label: 'Healthcare' },
    health:      { pool: 'healthcare',  crm: 'Healthcare',  label: 'Healthcare' },
    medical:     { pool: 'healthcare',  crm: 'Healthcare',  label: 'Healthcare' },
    education:   { pool: 'education',   crm: 'Education',   label: 'Education' },
    finance:     { pool: 'finance',     crm: 'Finance',     label: 'Finance/Banking' },
    banking:     { pool: 'finance',     crm: 'Finance',     label: 'Finance/Banking' },
    hospitality: { pool: 'tourism',     crm: 'Tourism',     label: 'Hospitality/Tourism' },
    tourism:     { pool: 'tourism',     crm: 'Tourism',     label: 'Hospitality/Tourism' },
    retail:      { pool: 'retail',      crm: 'Retail',      label: 'Retail/Sales' },
    telecom:     { pool: 'telecom',     crm: 'Telecom',     label: 'Telecom' },
    bpo:         { pool: 'corporate',   crm: 'Corporate',   label: 'BPO/Corporate' }
  };

  function engineKey(nxConfig) {
    if (!nxConfig) return 'corporate';
    var raw = nxConfig.industry || nxConfig.industryLabel || 'corporate';
    return String(raw).toLowerCase().replace(/[^a-z]/g, '') || 'corporate';
  }

  function resolve(nxConfig) {
    var key = engineKey(nxConfig);
    return ENGINE[key] || ENGINE.corporate;
  }

  function crmIndustry(nxConfig) {
    return resolve(nxConfig).crm;
  }

  function industryLabel(nxConfig) {
    if (nxConfig && nxConfig.industryLabel) return nxConfig.industryLabel;
    return resolve(nxConfig).label;
  }

  function poolSuffix(nxConfig) {
    return resolve(nxConfig).pool;
  }

  function scenarioPoolKey(nxConfig) {
    if (!nxConfig || !nxConfig.type) return 'customer_service:corporate';
    var type = nxConfig.type;
    var suffix = poolSuffix(nxConfig);
    if (type === 'team_meeting') return 'team_meeting:all';
    if (type === 'negotiation') return 'negotiation:all';
    if (type === 'stakeholder') return 'stakeholder:all';
    if (type === 'presentation') return 'presentation:all';
    if (type === 'mock_interview') return 'mock_interview:' + suffix;
    if (type === 'customer_service' || type === 'problem_solving') {
      return 'customer_service:' + suffix;
    }
    return type + ':' + suffix;
  }

  /** Opciones del selector en Infinity Nexus Engine — debe coincidir con pools del banco. */
  var ENGINE_SELECTOR_OPTIONS = [
    { value: 'corporate',   label: 'Corporate / Business' },
    { value: 'tech',        label: 'Technology' },
    { value: 'healthcare',  label: 'Healthcare / Medical' },
    { value: 'education',   label: 'Education' },
    { value: 'finance',     label: 'Finance / Banking' },
    { value: 'hospitality', label: 'Hospitality / Tourism' },
    { value: 'retail',      label: 'Retail / Sales' },
    { value: 'telecom',     label: 'Telecom / Cable & Internet' }
  ];

  function industryAffectsScenarioPool(type) {
    return type === 'customer_service' || type === 'problem_solving' || type === 'mock_interview';
  }

  function labelForEngineValue(value) {
    var key = String(value || '').toLowerCase().replace(/[^a-z]/g, '');
    for (var i = 0; i < ENGINE_SELECTOR_OPTIONS.length; i++) {
      if (ENGINE_SELECTOR_OPTIONS[i].value === key) return ENGINE_SELECTOR_OPTIONS[i].label;
    }
    return ENGINE[key] ? ENGINE[key].label : (value || 'Corporate');
  }

  function populateEngineIndustrySelect(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = ENGINE_SELECTOR_OPTIONS.map(function (o) {
      return '<option value="' + o.value + '">' + o.label + '</option>';
    }).join('');
  }

  function describeSelection(type, industry) {
    var cfg = { type: type || 'customer_service', industry: industry || 'corporate' };
    var pool = scenarioPoolKey(cfg);
    var crm = crmIndustry(cfg);
    if (type === 'mock_interview') {
      return 'STAR Mock Interview · Pool: ' + pool + ' · 100 preguntas conductuales · Contexto: ' + crm;
    }
    if (type === 'team_meeting') {
      return 'Team Meeting / Presentation · Pool: ' + pool + ' · 100 escenarios de reunión';
    }
    if (type === 'presentation') {
      return 'Executive Presentation · Pool: ' + pool + ' · 100 presentaciones a liderazgo';
    }
    if (type === 'stakeholder') {
      return 'Stakeholder Alignment · Pool: ' + pool + ' · 100 escenarios multi-stakeholder';
    }
    if (type === 'negotiation') {
      return 'Negotiation · Pool: ' + pool + ' · 100 escenarios de negociación';
    }
    if (!industryAffectsScenarioPool(cfg.type)) {
      return 'Pool: ' + pool + ' (mismo para todas las industrias) · CRM según industria: ' + crm;
    }
    return 'Pool: ' + pool + ' · 100 escenarios · CRM: ' + crm;
  }

  return {
    ENGINE: ENGINE,
    ENGINE_SELECTOR_OPTIONS: ENGINE_SELECTOR_OPTIONS,
    engineKey: engineKey,
    resolve: resolve,
    crmIndustry: crmIndustry,
    industryLabel: industryLabel,
    poolSuffix: poolSuffix,
    scenarioPoolKey: scenarioPoolKey,
    industryAffectsScenarioPool: industryAffectsScenarioPool,
    labelForEngineValue: labelForEngineValue,
    populateEngineIndustrySelect: populateEngineIndustrySelect,
    describeSelection: describeSelection
  };
})();
