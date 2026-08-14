/**
 * Nexora scenario bank — strict pool per type+industry. Zero cross-industry fallback.
 */
var NEXORA_SCENARIO_BANK = (function () {
  'use strict';

  var EMPTY = { pools: {}, POOL_SIZE: 100 };

  // The 3.8MB bank data is fetched on demand, so it may land after this module
  // is evaluated. Resolve it per call instead of capturing it once.
  function bank() {
    return typeof NEXORA_SCENARIO_BANK_DATA !== 'undefined' ? NEXORA_SCENARIO_BANK_DATA : EMPTY;
  }

  function isLoaded() {
    return typeof NEXORA_SCENARIO_BANK_DATA !== 'undefined';
  }

  function poolKey(nxConfig) {
    return NEXORA_INDUSTRY.scenarioPoolKey(nxConfig);
  }

  function resolveIndustryLabel(nxConfig) {
    return NEXORA_INDUSTRY.industryLabel(nxConfig);
  }

  function resolveCrmIndustry(nxConfig) {
    return NEXORA_INDUSTRY.crmIndustry(nxConfig);
  }

  function getPool(nxConfig) {
    if (!nxConfig) return [];
    var key = poolKey(nxConfig);
    var pool = bank().pools[key];
    return pool && pool.length ? pool : [];
  }

  function getFromPool(nxConfig, index) {
    var pool = getPool(nxConfig);
    if (!pool.length) return null;
    return Object.assign({}, pool[index % pool.length]);
  }

  return {
    get POOL_SIZE() { return bank().POOL_SIZE || 100; },
    isLoaded: isLoaded,
    poolKey: poolKey,
    getPool: getPool,
    getFromPool: getFromPool,
    resolveIndustryLabel: resolveIndustryLabel,
    resolveCrmIndustry: resolveCrmIndustry
  };
})();
