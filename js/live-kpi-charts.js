/**
 * Live KPI charts — Chart.js animated + interactive (portals + Engine).
 * $0 stack: no external analytics, pure Chart.js.
 */
(function (global) {
  'use strict';

  var pool = {};
  var theme = {
    name: 'infinity',
    accent: '#5B21B6',
    accentSoft: 'rgba(91,33,182,0.18)',
    line: ['#5B21B6', '#0F6E56', '#D97706', '#A32D2D', '#7C3AED']
  };
  var onSelectCbs = [];

  var THEMES = {
    infinity: {
      name: 'infinity',
      accent: '#5B21B6',
      accentSoft: 'rgba(91,33,182,0.18)',
      line: ['#5B21B6', '#0F6E56', '#D97706', '#A32D2D', '#7C3AED']
    },
    kamuk: {
      name: 'kamuk',
      accent: '#2B7EC1',
      accentSoft: 'rgba(43,126,193,0.22)',
      line: ['#2B7EC1', '#0F6E56', '#D97706', '#C2410C', '#1D4ED8']
    },
    gospanol: {
      name: 'gospanol',
      accent: '#2F5D75',
      accentSoft: 'rgba(47,93,117,0.22)',
      line: ['#2F5D75', '#0F6E56', '#C27803', '#A32D2D', '#1B3A4B']
    }
  };

  function setTheme(nameOrObj) {
    if (typeof nameOrObj === 'string' && THEMES[nameOrObj]) {
      theme = THEMES[nameOrObj];
    } else if (nameOrObj && typeof nameOrObj === 'object') {
      theme = Object.assign({}, theme, nameOrObj);
    }
    return theme;
  }

  function onSelect(fn) {
    if (typeof fn === 'function') onSelectCbs.push(fn);
    return function off() {
      onSelectCbs = onSelectCbs.filter(function (f) { return f !== fn; });
    };
  }

  function fireSelect(payload) {
    onSelectCbs.forEach(function (fn) {
      try { fn(payload); } catch (e) { /* ignore */ }
    });
  }

  function animOpts(extra) {
    return Object.assign({
      duration: 900,
      easing: 'easeOutQuart'
    }, extra || {});
  }

  function destroy(key) {
    if (pool[key]) {
      pool[key].destroy();
      delete pool[key];
    }
  }

  function destroyPrefix(prefix) {
    Object.keys(pool).forEach(function (k) {
      if (k.indexOf(prefix) === 0) destroy(k);
    });
  }

  function getCanvas(id) {
    var el = document.getElementById(id);
    return el && el.getContext ? el : null;
  }

  function macroKeys() {
    if (global.KPI_NAMES) return Object.keys(global.KPI_NAMES);
    return ['IG', 'ST', 'RA', 'PS', 'R'];
  }

  function macroLabels() {
    var names = global.KPI_NAMES || {};
    return macroKeys().map(function (k) {
      var n = names[k] || k;
      return k + ' ' + String(n).split(' ')[0];
    });
  }

  function barScaleOpts(tickCfg) {
    return {
      offset: true,
      ticks: Object.assign({ autoSkip: false, maxRotation: 0, padding: 2 }, tickCfg || {}),
      grid: tickCfg && tickCfg.grid !== undefined ? tickCfg.grid : { display: false }
    };
  }

  function areaBarChartOptions(yScale, xScale) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: animOpts(),
      interaction: { mode: 'nearest', intersect: true },
      onHover: function (evt, els) {
        if (evt.native && evt.native.target) {
          evt.native.target.style.cursor = els && els.length ? 'pointer' : 'default';
        }
      },
      layout: { padding: { left: 4, right: 4, top: 6, bottom: 2 } },
      datasets: {
        bar: {
          categoryPercentage: 0.58,
          barPercentage: 0.68,
          maxBarThickness: 14
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (ctx) { return ctx.parsed.y + '%'; }
          }
        }
      },
      scales: {
        y: yScale,
        x: xScale
      }
    };
  }

  function interactiveClick(chart, elements, chartKey, valueKind) {
    if (!elements || !elements.length) return;
    var el = elements[0];
    var ds = chart.data.datasets[el.datasetIndex];
    var label = chart.data.labels[el.index];
    var val = ds.data[el.index];
    fireSelect({
      chartKey: chartKey,
      label: label,
      value: val,
      dataset: ds.label,
      kind: valueKind || 'value',
      index: el.index
    });
  }

  function upsert(key, canvasId, config, forceNew) {
    var ctx = getCanvas(canvasId);
    if (!ctx || !global.Chart) return null;
    if (!config.options) config.options = {};
    if (!config.options.animation) config.options.animation = animOpts();
    if (config.options.interaction == null) {
      config.options.interaction = { mode: 'index', intersect: false };
    }

    var prevOnClick = config.options.onClick;
    config.options.onClick = function (evt, elements, chart) {
      interactiveClick(chart, elements, key, config._valueKind || 'value');
      if (typeof prevOnClick === 'function') prevOnClick(evt, elements, chart);
    };
    config.options.onHover = config.options.onHover || function (evt, els) {
      if (evt.native && evt.native.target) {
        evt.native.target.style.cursor = els && els.length ? 'pointer' : 'default';
      }
    };

    var existing = pool[key];
    var isBar = key.indexOf('-bar') !== -1;
    if (existing && (forceNew || isBar)) {
      destroy(key);
      existing = null;
    } else if (existing) {
      var newLabels = config.data.labels || [];
      var oldLabels = existing.data.labels || [];
      if (newLabels.length !== oldLabels.length) {
        destroy(key);
        existing = null;
      } else {
        existing.data.labels = newLabels;
        existing.data.datasets = config.data.datasets;
        if (config.options.scales) existing.options.scales = config.options.scales;
        existing.update('default');
        return existing;
      }
    }
    pool[key] = new Chart(ctx, config);
    requestAnimationFrame(function () {
      if (pool[key]) pool[key].resize();
    });
    return pool[key];
  }

  function updateMacro(key, radarId, barId, values, maxScale) {
    maxScale = maxScale || 5;
    var keys = macroKeys();
    var data = keys.map(function (k) { return Number(values[k]) || 0; });
    var labels = macroLabels();
    var step = maxScale <= 5 ? 1 : 2;
    var accent = theme.accent;
    var soft = theme.accentSoft;

    upsert(key + '-radar', radarId, {
      _valueKind: 'macro',
      type: 'radar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Macro KPI',
          data: data,
          borderColor: accent,
          backgroundColor: soft,
          pointBackgroundColor: accent,
          pointRadius: 5,
          pointHoverRadius: 8,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: animOpts({ duration: 1100 }),
        scales: { r: { min: 0, max: maxScale, ticks: { stepSize: step } } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) { return ctx.parsed.r + '/' + maxScale; }
            }
          }
        }
      }
    });

    var barColors = data.map(function (v) {
      var pct = maxScale ? v / maxScale : 0;
      if (pct >= 0.8) return '#0F6E56';
      if (pct >= 0.6) return '#D97706';
      return '#A32D2D';
    });

    upsert(key + '-bar', barId, {
      _valueKind: 'macro',
      type: 'bar',
      data: {
        labels: keys,
        datasets: [{
          label: 'KPI',
          data: data,
          backgroundColor: barColors,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: animOpts({ delay: function (ctx) { return ctx.dataIndex * 60; } }),
        datasets: {
          bar: { categoryPercentage: 0.72, barPercentage: 0.8, maxBarThickness: 22 }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) { return ctx.parsed.y + '/' + maxScale; }
            }
          }
        },
        scales: {
          y: { min: 0, max: maxScale, ticks: { stepSize: step } },
          x: barScaleOpts({ font: { size: 11, weight: '700' } })
        }
      }
    });
  }

  function areaBarColors(data) {
    return data.map(function (p) {
      if (p >= 80) return '#3DDC97';
      if (p >= 60) return '#F5A623';
      return '#FF5C5C';
    });
  }

  function updateAreas(key, radarId, barId, areaAverages, dark) {
    if (!areaAverages || !areaAverages.length) return;
    if (dark) return updateAreasDark(key, radarId, barId, areaAverages);
    var labels = areaAverages.map(function (a) { return a.id; });
    var data = areaAverages.map(function (a) { return a.pct; });

    upsert(key + '-area-radar', radarId, {
      _valueKind: 'area',
      type: 'radar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Área %',
          data: data,
          borderColor: '#0F6E56',
          backgroundColor: 'rgba(15,110,86,0.15)',
          pointBackgroundColor: '#0F6E56',
          pointRadius: 5,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: animOpts(),
        scales: { r: { min: 0, max: 100, ticks: { stepSize: 25 } } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) { return ctx.parsed.r + '%'; }
            }
          }
        }
      }
    });

    upsert(key + '-area-bar', barId, {
      _valueKind: 'area',
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{ label: 'Área', data: data, backgroundColor: areaBarColors(data), borderRadius: 6 }]
      },
      options: areaBarChartOptions(
        { min: 0, max: 100, ticks: { stepSize: 25 } },
        barScaleOpts({ font: { size: 10, weight: '700' } })
      )
    });
  }

  function updateAreasDark(key, radarId, barId, areaAverages) {
    if (!areaAverages || !areaAverages.length) return;
    var labels = areaAverages.map(function (a) { return a.id; });
    var data = areaAverages.map(function (a) { return a.pct; });
    var barColors = areaBarColors(data);
    var tick = 'rgba(255,255,255,0.35)';
    var grid = 'rgba(255,255,255,0.08)';

    upsert(key + '-area-radar', radarId, {
      _valueKind: 'area',
      type: 'radar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Área %',
          data: data,
          borderColor: '#F5A623',
          backgroundColor: 'rgba(245,166,35,0.35)',
          pointBackgroundColor: '#F5A623',
          pointRadius: 5,
          pointHoverRadius: 8,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: animOpts({ duration: 1100 }),
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: { stepSize: 25, color: tick, backdropColor: 'transparent' },
            grid: { color: grid },
            angleLines: { color: grid },
            pointLabels: { color: 'rgba(255,255,255,0.65)', font: { size: 11, weight: '700' } }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) { return ctx.parsed.r + '%'; }
            }
          }
        }
      }
    });

    upsert(key + '-area-bar', barId, {
      _valueKind: 'area',
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{ label: 'Área', data: data, backgroundColor: barColors, borderRadius: 4 }]
      },
      options: areaBarChartOptions(
        {
          min: 0,
          max: 100,
          ticks: { stepSize: 25, color: tick },
          grid: { color: grid }
        },
        barScaleOpts({
          color: 'rgba(255,255,255,0.65)',
          font: { size: 9, weight: '700' }
        })
      )
    });
  }

  function mountWhenReady(canvasIds, fn, tries) {
    tries = tries || 0;
    if (typeof global.Chart === 'undefined') {
      if (tries < 12) setTimeout(function () { mountWhenReady(canvasIds, fn, tries + 1); }, 150);
      return;
    }
    var missing = (canvasIds || []).some(function (id) { return !document.getElementById(id); });
    if (missing && tries < 12) {
      setTimeout(function () { mountWhenReady(canvasIds, fn, tries + 1); }, 150);
      return;
    }
    fn();
    setTimeout(function () {
      Object.keys(pool).forEach(function (k) {
        if (pool[k] && pool[k].resize) pool[k].resize();
      });
    }, 120);
  }

  function readMacroSliders(prefix) {
    var out = {};
    macroKeys().forEach(function (k) {
      var el = document.getElementById(prefix + k);
      out[k] = el ? parseInt(el.value, 10) || 0 : 0;
    });
    return out;
  }

  function computeKTAreaAverages() {
    if (!global.KPI_TRACKER_AREAS) return [];
    return global.KPI_TRACKER_AREAS.map(function (area) {
      var sum = 0;
      var max = 0;
      area.kpis.forEach(function (k) {
        var na = document.getElementById('kt-' + k.id + '-na');
        if (na && na.checked) return;
        var el = document.getElementById('kt-' + k.id);
        if (el) {
          sum += parseInt(el.value, 10) || 0;
          max += k.max;
        }
      });
      return { id: area.id, name: area.name, pct: max ? Math.round(sum / max * 100) : 0 };
    });
  }

  function liveChartCard(title, radarId, barId, hint) {
    return '<div class="card"><div class="card-title"><i class="ti ti-chart-radar"></i>' + title + '</div>'
      + (hint ? '<div class="ib ib-navy" style="margin-bottom:8px;">' + hint + '</div>' : '')
      + '<div class="grid2" style="gap:12px;"><div class="chart-wrap chart-interactive"><canvas id="' + radarId + '"></canvas></div>'
      + '<div class="chart-wrap chart-interactive"><canvas id="' + barId + '"></canvas></div></div></div>';
  }

  function updateLine(key, canvasId, labels, datasets, yMax) {
    yMax = yMax || 5;
    var step = yMax <= 5 ? 1 : (yMax <= 25 ? 5 : 10);
    var colored = (datasets || []).map(function (ds, i) {
      var c = ds.borderColor || theme.line[i % theme.line.length];
      return Object.assign({
        borderColor: c,
        backgroundColor: 'transparent',
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 7,
        borderWidth: 2,
        fill: false
      }, ds);
    });
    upsert(key, canvasId, {
      _valueKind: 'timeline',
      type: 'line',
      data: { labels: labels, datasets: colored },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: animOpts({ duration: 1200 }),
        interaction: { mode: 'index', intersect: false },
        scales: { y: { min: 0, max: yMax, ticks: { stepSize: step } } },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 10, usePointStyle: true, padding: 12 },
            onClick: function (e, legendItem, legend) {
              global.Chart.defaults.plugins.legend.onClick.call(this, e, legendItem, legend);
              fireSelect({
                chartKey: key,
                kind: 'legend',
                label: legendItem.text
              });
            }
          },
          tooltip: { mode: 'index', intersect: false }
        }
      }
    });
  }

  /** Merge calibrations + kpis.history + aliceSessions into chart-ready series. */
  function collectPortalTimeline(student, fmtDateFn) {
    var fmt = typeof fmtDateFn === 'function'
      ? fmtDateFn
      : function (d) {
        try {
          var dt = new Date(d);
          if (isNaN(dt.getTime())) return String(d || '—').slice(0, 10);
          return (dt.getMonth() + 1) + '/' + dt.getDate();
        } catch (e) { return '—'; }
      };
    var keys = macroKeys();
    var points = [];

    (student && student.calibrations || []).forEach(function (c) {
      if (!c) return;
      var phase1 = c.kpis || {};
      points.push({
        at: c.date || c.at,
        label: fmt(c.date || c.at),
        source: 'cal',
        phase1: phase1,
        score: c.score != null ? c.score : null
      });
    });

    var hist = (student && student.kpis && student.kpis.history) || [];
    hist.forEach(function (h) {
      if (!h) return;
      points.push({
        at: h.at,
        label: fmt(h.at) + (h.source ? ' ·' + String(h.source).slice(0, 4) : ''),
        source: h.source || 'session',
        phase1: h.phase1 || {},
        score: h.score != null ? h.score : null
      });
    });

    (student && student.aliceSessions || []).forEach(function (a) {
      if (!a) return;
      points.push({
        at: a.date,
        label: fmt(a.date) + ' ·A',
        source: 'alice',
        phase1: null,
        score: a.score != null ? a.score : null
      });
    });

    points.sort(function (a, b) {
      return (Date.parse(a.at) || 0) - (Date.parse(b.at) || 0);
    });

    // Dedupe near-identical times (same second + same source)
    var deduped = [];
    for (var di = 0; di < points.length; di++) {
      var cur = points[di];
      var prev = deduped[deduped.length - 1];
      if (prev && prev.source === cur.source
        && Math.abs((Date.parse(cur.at) || 0) - (Date.parse(prev.at) || 0)) < 1500
        && Number(prev.score) === Number(cur.score)) {
        continue;
      }
      deduped.push(cur);
    }
    points = deduped;

    // Keep last 12
    if (points.length > 12) points = points.slice(-12);

    var labels = points.map(function (p) { return p.label; });
    var hasPhase1 = points.some(function (p) {
      return p.phase1 && keys.some(function (k) { return parseInt(p.phase1[k], 10) > 0; });
    });
    var datasets = [];
    var yMax = 5;

    if (hasPhase1) {
      keys.forEach(function (k, i) {
        datasets.push({
          label: k,
          data: points.map(function (p) {
            return p.phase1 ? (parseInt(p.phase1[k], 10) || 0) : null;
          }),
          borderColor: theme.line[i % theme.line.length],
          spanGaps: true
        });
      });
      var sampleMax = 0;
      points.forEach(function (p) {
        if (!p.phase1) return;
        keys.forEach(function (k) {
          var v = parseInt(p.phase1[k], 10) || 0;
          if (v > sampleMax) sampleMax = v;
        });
      });
      yMax = sampleMax > 25 ? 100 : (sampleMax > 5 ? 10 : 5);
    } else if (points.some(function (p) { return p.score != null; })) {
      datasets.push({
        label: 'Score',
        data: points.map(function (p) { return p.score != null ? p.score : null; }),
        borderColor: theme.accent,
        spanGaps: true
      });
      yMax = 100;
    }

    return {
      labels: labels,
      datasets: datasets,
      yMax: yMax,
      points: points,
      hasSeries: datasets.length > 0 && labels.length >= 1
    };
  }

  function renderPortalDetailHtml(payload, student) {
    if (!payload) {
      return '<span style="opacity:0.7">Tocá un KPI, barra o punto del timeline para ver el detalle.</span>';
    }
    var names = global.KPI_NAMES || {};
    var full = names[payload.label] || payload.label || payload.dataset || '—';
    var phase1 = (student && student.kpis && student.kpis.phase1) || {};
    var cur = payload.value;
    if (payload.kind === 'macro' && phase1[payload.label] != null) {
      cur = parseInt(phase1[payload.label], 10) || cur;
    }
    return '<strong>' + (payload.label || payload.dataset || 'KPI') + '</strong>'
      + (full && full !== payload.label ? ' · ' + full : '')
      + (cur != null ? ' · valor: <b>' + cur + '</b>' : '')
      + (payload.kind === 'timeline' ? ' · sesión del timeline' : '')
      + (payload.kind === 'legend' ? ' · serie ' + (payload.label || '') : '');
  }

  function bindPortalDetail(panelId) {
    return onSelect(function (payload) {
      var el = document.getElementById(panelId);
      if (!el) return;
      el.innerHTML = renderPortalDetailHtml(payload, global.CURRENT_STUDENT || global._currentStudent || global._portalStudent);
      el.classList.add('kpi-detail-flash');
      setTimeout(function () { el.classList.remove('kpi-detail-flash'); }, 500);
    });
  }

  global.LiveKpiCharts = {
    VERSION: '20260804',
    THEMES: THEMES,
    setTheme: setTheme,
    onSelect: onSelect,
    destroy: destroy,
    destroyPrefix: destroyPrefix,
    updateMacro: updateMacro,
    updateAreas: updateAreas,
    updateAreasDark: updateAreasDark,
    updateLine: updateLine,
    readMacroSliders: readMacroSliders,
    computeKTAreaAverages: computeKTAreaAverages,
    liveChartCard: liveChartCard,
    mountWhenReady: mountWhenReady,
    macroKeys: macroKeys,
    collectPortalTimeline: collectPortalTimeline,
    renderPortalDetailHtml: renderPortalDetailHtml,
    bindPortalDetail: bindPortalDetail
  };
})(typeof window !== 'undefined' ? window : this);
