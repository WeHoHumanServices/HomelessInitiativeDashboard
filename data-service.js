(function () {
  const PAGE_SIZE = 1000;

  function getConfig() {
    const cfg = window.DASHBOARD_CONFIG || {};
    if (!cfg.supabaseUrl || cfg.supabaseUrl.includes('YOUR-PROJECT')) {
      throw new Error('Supabase URL has not been configured.');
    }
    if (!cfg.supabasePublishableKey || cfg.supabasePublishableKey.includes('REPLACE_ME')) {
      throw new Error('Supabase publishable key has not been configured.');
    }
    return {
      url: cfg.supabaseUrl.replace(/\/$/, ''),
      key: cfg.supabasePublishableKey
    };
  }

  async function fetchAll(cfg, table, select, orderColumns) {
    let rows = [];
    let offset = 0;
    while (true) {
      const params = new URLSearchParams();
      params.set('select', select || '*');
      if (orderColumns && orderColumns.length) {
        params.set('order', orderColumns.map(function(item) {
          return item.column + '.' + (item.ascending === false ? 'desc' : 'asc');
        }).join(','));
      }
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(offset));

      const response = await fetch(cfg.url + '/rest/v1/' + encodeURIComponent(table) + '?' + params.toString(), {
        method: 'GET',
        headers: {
          'apikey': cfg.key,
          'Accept': 'application/json'
        }
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

      const page = await response.json();
      rows = rows.concat(page || []);
      if (!page || page.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
    return rows;
  }

  function rowsToMap(rows, keyField, valueField) {
    const out = {};
    rows.forEach(function (r) { out[r[keyField]] = valueField ? r[valueField] : r; });
    return out;
  }

  window.loadDashboardData = async function () {
    const client = getConfig();
    const [pitObs, pitCounts, hclMonthly, hclHeat, hclReason, seriesRows, hollowayRows, metricRows, settingRows] = await Promise.all([
      fetchAll(client, 'dashboard_pit_observations', '*', [{column:'observation_year'},{column:'observation_month'},{column:'id'}]),
      fetchAll(client, 'dashboard_pit_counts', '*', [{column:'sort_order'}]),
      fetchAll(client, 'dashboard_hcl_monthly', '*', [{column:'sort_order'}]),
      fetchAll(client, 'dashboard_hcl_heat_points', '*', [{column:'sort_order'},{column:'id'}]),
      fetchAll(client, 'dashboard_hcl_reason_outcomes', '*', [{column:'sort_order'},{column:'reason_index'}]),
      fetchAll(client, 'dashboard_program_series', '*', [{column:'sort_order'}]),
      fetchAll(client, 'dashboard_holloway', '*', [{column:'sort_order'}]),
      fetchAll(client, 'dashboard_metrics', '*', [{column:'metric_key'}]),
      fetchAll(client, 'dashboard_settings', '*', [{column:'setting_key'}])
    ]);

    const pitPoints = pitObs.map(function(r) {
      return [Number(r.latitude), Number(r.longitude), Number(r.people_count), r.location_label, r.period_label, Number(r.observation_year), Number(r.observation_month)];
    });

    const monthly2025 = pitCounts.filter(r => r.period_type === 'month' && r.period_key.startsWith('2025-')).map(r => Number(r.value));
    const yearly = pitCounts.filter(r => r.period_type === 'year_average');
    const quarterRows = pitCounts.filter(r => r.period_type === 'quarter' && r.period_key.startsWith('2026-Q'));
    const pitQuarter2026 = {};
    const pitQuarterMeta = {};
    quarterRows.forEach(function(r) {
      const q = r.period_key.split('-')[1];
      pitQuarter2026[q] = r.value === null ? null : Number(r.value);
      pitQuarterMeta[q] = r.metadata || {};
    });

    const hclByMonth = {};
    hclMonthly.forEach(function(r) {
      hclByMonth[r.period_label] = {
        total:Number(r.total), days:Number(r.days), reasons:r.reasons || [], outcomes:r.outcomes || [], time:r.time_bins || [], dow:r.day_of_week || []
      };
    });
    const hclHeatPoints = hclHeat.map(function(r) { return [Number(r.latitude), Number(r.longitude), r.period_label, Number(r.reason_index)]; });
    const hclReasonOutcomes = {};
    hclReason.forEach(function(r) {
      if (!hclReasonOutcomes[r.period_label]) hclReasonOutcomes[r.period_label] = {};
      hclReasonOutcomes[r.period_label][r.reason_index] = r.outcomes || [];
    });

    const seriesByKey = {};
    seriesRows.forEach(function(r) {
      if (!seriesByKey[r.series_key]) seriesByKey[r.series_key] = [];
      seriesByKey[r.series_key].push(r);
    });
    const years = (seriesByKey.permanent_housing || []).map(r => r.period_label);
    const series = {
      years: years,
      permTotal: (seriesByKey.permanent_housing || []).map(r => Number(r.value)),
      intTotal: (seriesByKey.interim_housing || []).map(r => Number(r.value)),
      rentalTotal: (seriesByKey.rental_households || []).map(r => Number(r.value))
    };

    const holloway = {};
    hollowayRows.forEach(function(r) { holloway[r.period_key] = r.payload || {}; });

    return {
      pitPoints: pitPoints,
      pitMonthly2025: monthly2025,
      pitYearLabels: yearly.map(r => r.period_label),
      pitYearAverages: yearly.map(r => Number(r.value)),
      pitQuarter2026: pitQuarter2026,
      pitQuarterMeta: pitQuarterMeta,
      hclByMonth: hclByMonth,
      hclHeatPoints: hclHeatPoints,
      hclReasonOutcomes: hclReasonOutcomes,
      series: series,
      holloway: holloway,
      metrics: rowsToMap(metricRows, 'metric_key', 'value_text'),
      settings: rowsToMap(settingRows, 'setting_key', 'value_text')
    };
  };
})();
