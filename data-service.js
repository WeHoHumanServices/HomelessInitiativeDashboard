(function () {
  'use strict';

  const PAGE_SIZE = 1000;
  const REQUEST_TIMEOUT_MS = 20000;

  function getConfig() {
    const cfg = window.DASHBOARD_CONFIG || {};
    if (!cfg.supabaseUrl || cfg.supabaseUrl.includes('YOUR-PROJECT')) {
      throw new Error('Supabase URL has not been configured.');
    }
    if (!cfg.supabasePublishableKey || cfg.supabasePublishableKey.includes('REPLACE_ME')) {
      throw new Error('Supabase publishable key has not been configured.');
    }
    return {
      url: String(cfg.supabaseUrl).replace(/\/$/, ''),
      key: String(cfg.supabasePublishableKey)
    };
  }

  async function fetchPage(cfg, table, select, orderColumns, offset) {
    const params = new URLSearchParams();
    params.set('select', select || '*');
    if (orderColumns && orderColumns.length) {
      params.set('order', orderColumns.map(function (item) {
        return item.column + '.' + (item.ascending === false ? 'desc' : 'asc');
      }).join(','));
    }
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(offset));

    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(cfg.url + '/rest/v1/' + table + '?' + params.toString(), {
        method: 'GET',
        mode: 'cors',
        headers: {
          apikey: cfg.key,
          Accept: 'application/json'
        },
        signal: controller.signal
      });

      if (!response.ok) {
        let detail = '';
        try {
          const body = await response.json();
          detail = body.message || body.error_description || body.hint || JSON.stringify(body);
        } catch (_) {
          try { detail = await response.text(); } catch (_) {}
        }
        throw new Error(table + ': HTTP ' + response.status + (detail ? ' — ' + detail : ''));
      }
      return await response.json();
    } catch (error) {
      if (error && error.name === 'AbortError') {
        throw new Error(table + ': request timed out');
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchAll(cfg, table, select, orderColumns) {
    let rows = [];
    let offset = 0;
    while (true) {
      const page = await fetchPage(cfg, table, select, orderColumns, offset);
      rows = rows.concat(page || []);
      if (!page || page.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
    return rows;
  }

  function rowsToMap(rows, keyField, valueField) {
    const out = {};
    (rows || []).forEach(function (r) {
      out[r[keyField]] = valueField ? r[valueField] : r;
    });
    return out;
  }

  async function loadTable(cfg, table, orderColumns) {
    try {
      return { rows: await fetchAll(cfg, table, '*', orderColumns), error: null };
    } catch (error) {
      console.error('Dashboard table load failed:', table, error);
      return { rows: [], error: error };
    }
  }

  window.loadDashboardData = async function () {
    const cfg = getConfig();
    const results = await Promise.all([
      loadTable(cfg, 'dashboard_pit_observations', [{column:'observation_year'},{column:'observation_month'},{column:'id'}]),
      loadTable(cfg, 'dashboard_pit_counts', [{column:'sort_order'}]),
      loadTable(cfg, 'dashboard_hcl_monthly', [{column:'sort_order'}]),
      loadTable(cfg, 'dashboard_hcl_heat_points', [{column:'sort_order'},{column:'id'}]),
      loadTable(cfg, 'dashboard_hcl_reason_outcomes', [{column:'sort_order'},{column:'reason_index'}]),
      loadTable(cfg, 'dashboard_program_series', [{column:'sort_order'}]),
      loadTable(cfg, 'dashboard_holloway', [{column:'sort_order'}]),
      loadTable(cfg, 'dashboard_metrics', [{column:'metric_key'}]),
      loadTable(cfg, 'dashboard_settings', [{column:'setting_key'}])
    ]);

    const errors = results.filter(function (r) { return r.error; }).map(function (r) { return r.error.message; });
    if (errors.length === results.length) {
      throw new Error('All Supabase requests failed. ' + errors[0]);
    }

    const pitObs = results[0].rows;
    const pitCounts = results[1].rows;
    const hclMonthly = results[2].rows;
    const hclHeat = results[3].rows;
    const hclReason = results[4].rows;
    const seriesRows = results[5].rows;
    const hollowayRows = results[6].rows;
    const metricRows = results[7].rows;
    const settingRows = results[8].rows;

    const pitPoints = pitObs.map(function (r) {
      return [Number(r.latitude), Number(r.longitude), Number(r.people_count), r.location_label, r.period_label, Number(r.observation_year), Number(r.observation_month)];
    });

    const monthly2025Rows = pitCounts.filter(function (r) {
      return r.period_type === 'month' && String(r.period_key).indexOf('2025-') === 0;
    });
    const monthly2025 = monthly2025Rows.map(function (r) { return Number(r.value); });
    const yearly = pitCounts.filter(function (r) { return r.period_type === 'year_average'; });
    const quarterRows = pitCounts.filter(function (r) {
      return r.period_type === 'quarter' && String(r.period_key).indexOf('2026-Q') === 0;
    });
    const pitQuarter2026 = {};
    const pitQuarterMeta = {};
    quarterRows.forEach(function (r) {
      const q = String(r.period_key).split('-')[1];
      pitQuarter2026[q] = r.value === null ? null : Number(r.value);
      pitQuarterMeta[q] = r.metadata || {};
    });

    const hclByMonth = {};
    hclMonthly.forEach(function (r) {
      hclByMonth[r.period_label] = {
        total: Number(r.total),
        days: Number(r.days),
        reasons: r.reasons || [],
        outcomes: r.outcomes || [],
        time: r.time_bins || [],
        dow: r.day_of_week || []
      };
    });

    const hclHeatPoints = hclHeat.map(function (r) {
      return [Number(r.latitude), Number(r.longitude), r.period_label, Number(r.reason_index)];
    });

    const hclReasonOutcomes = {};
    hclReason.forEach(function (r) {
      if (!hclReasonOutcomes[r.period_label]) hclReasonOutcomes[r.period_label] = {};
      hclReasonOutcomes[r.period_label][r.reason_index] = r.outcomes || [];
    });

    const seriesByKey = {};
    seriesRows.forEach(function (r) {
      if (!seriesByKey[r.series_key]) seriesByKey[r.series_key] = [];
      seriesByKey[r.series_key].push(r);
    });
    const years = (seriesByKey.permanent_housing || []).map(function (r) { return r.period_label; });
    const series = {
      years: years,
      permTotal: (seriesByKey.permanent_housing || []).map(function (r) { return Number(r.value); }),
      intTotal: (seriesByKey.interim_housing || []).map(function (r) { return Number(r.value); }),
      rentalTotal: (seriesByKey.rental_households || []).map(function (r) { return Number(r.value); })
    };

    const holloway = {};
    hollowayRows.forEach(function (r) { holloway[r.period_key] = r.payload || {}; });

    return {
      pitPoints: pitPoints,
      pitMonthly2025: monthly2025,
      pitYearLabels: yearly.map(function (r) { return r.period_label; }),
      pitYearAverages: yearly.map(function (r) { return Number(r.value); }),
      pitQuarter2026: pitQuarter2026,
      pitQuarterMeta: pitQuarterMeta,
      hclByMonth: hclByMonth,
      hclHeatPoints: hclHeatPoints,
      hclReasonOutcomes: hclReasonOutcomes,
      series: series,
      holloway: holloway,
      metrics: rowsToMap(metricRows, 'metric_key', 'value_text'),
      settings: rowsToMap(settingRows, 'setting_key', 'value_text'),
      errors: errors
    };
  };
})();
