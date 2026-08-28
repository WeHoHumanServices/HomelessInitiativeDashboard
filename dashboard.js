(function () {
    const params = new URLSearchParams(window.location.search);
    // Activate embed mode if ?embed=true OR if loaded inside an iframe
    const inIframe = (function() {
      try { return window.self !== window.top; } catch(e) { return true; }
    })();
    if (params.get('embed') === 'true' || inIframe) {
      document.body.classList.add('embed');
    }
  })();

let PIT_PTS = [];
let HCL_HEAT_PTS = [];
let HCL_BY_MONTH = {};
let PIT_MO_2025 = [];
let PIT_YR_AVGS = [];
let PIT_YR_LBLS = [];
const PIT_MONTHS9 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
/* ── 2026 PIT: quarterly observation counts ──
   Starting 2026 the City moved from monthly to quarterly field counts.
   Add a quarter by filling its value below; null = not yet reported. */


let PIT_Q_2026 = {};
let PIT_Q_META = {};
const PIT_QTRS = ["Q1","Q2","Q3","Q4"];


const SRC_ICON = { city: '<svg class="oico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="5" y="4" width="14" height="17" rx="1"/><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01"/><path d="M10 21v-3.5h4V21"/></svg> ', grant: '<svg class="oico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M10 14a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 0 0-5.7-5.7L11 7.3"/><path d="M14 10a4 4 0 0 0-5.7 0L6 12.3a4 4 0 0 0 5.7 5.7L13 16.7"/></svg> ' };
const COLORS = {
  blue:'#003087',
  blue2:'#1c6ccf',
  blue3:'#5B9BD5',
  blue4:'#9ec4e7',
  blue5:'#d7e7f7',
  accent:'#0e8ecf',
  ink:'#18314f',
  muted:'#7a8aa0',
  grid:'#dfe8f4'
};

// HCL aggregates are computed dynamically in hclAggregateSelected() from HCL_BY_MONTH.
// DATA below contains only the static series used by renderVisible().
let DATA = { years:[], permTotal:[], intTotal:[], rentalTotal:[] };
let DASHBOARD_DATA_READY = false;

// ── HOLLOWAY QUARTER / YEAR FILTER ──
// Provider fiscal-year report labels these periods Q2–Q4; the dashboard uses
// contract-year quarters (Q1 = Oct–Dec 2025).
let HOLLOWAY_Q = {};
function renderHolloway() {
  var qSel = document.getElementById('hw-quarter');
  if (!qSel) return;
  var d = HOLLOWAY_Q[qSel.value] || HOLLOWAY_Q.ytd;
  if (!d) return;
  function set(id, val) { var el = document.getElementById(id); if (el) { el.textContent = val; el.setAttribute('data-raw', val); } }
  function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
  set('hw-served', d.served); setText('hw-served-sub', d.servedSub); setText('hw-served-label', d.servedLabel);
  set('hw-occ', d.occ); setText('hw-occ-sub', d.occSub);
  set('hw-perm', d.perm); setText('hw-perm-sub', d.permSub);
  set('hw-part', d.part); setText('hw-part-sub', d.partSub);
  document.querySelectorAll('.hw-eyebrow').forEach(function(e) { e.textContent = d.eyebrow; });
  setText('hw-readout', d.readout);
  // Occupancy subcard: show every quarter for the year-to-date view, or just
  // the selected quarter's bar when a single quarter is chosen.
  var occSel = qSel.value;
  ['q1','q2','q3'].forEach(function(q) {
    var row = document.getElementById('occ-' + q);
    if (row) row.style.display = (occSel === 'ytd' || occSel === q) ? '' : 'none';
  });
  setText('hw-occ-narrative', d.occNarr);
}
(function() {
  var qSel = document.getElementById('hw-quarter');
  var ySel = document.getElementById('hw-year');
  if (qSel) qSel.addEventListener('change', renderHolloway);
  if (ySel) ySel.addEventListener('change', renderHolloway);
})();

const tooltip = document.getElementById('tooltip');
function showTooltip(evt, html) {
  tooltip.innerHTML = html;
  tooltip.classList.add('show');
  tooltip.setAttribute('aria-hidden','false');
  const pad = 14;
  let x = evt.clientX + pad;
  let y = evt.clientY + pad;
  requestAnimationFrame(() => {
    const r = tooltip.getBoundingClientRect();
    if (x + r.width > window.innerWidth - 8) x = evt.clientX - r.width - pad;
    if (y + r.height > window.innerHeight - 8) y = evt.clientY - r.height - pad;
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  });
}
function hideTooltip() {
  tooltip.classList.remove('show');
  tooltip.setAttribute('aria-hidden','true');
}

document.addEventListener('mouseover', (e) => {
  const el = e.target.closest('[data-tip]');
  if (!el) return;
  showTooltip(e, el.getAttribute('data-tip'));
});
document.addEventListener('mousemove', (e) => {
  const el = e.target.closest('[data-tip]');
  if (!el || !tooltip.classList.contains('show')) return;
  showTooltip(e, el.getAttribute('data-tip'));
});
document.addEventListener('mouseout', (e) => {
  if (!e.target.closest('[data-tip]')) return;
  hideTooltip();
});
document.addEventListener('focusin', (e) => {
  const el = e.target.closest('[data-tip]');
  if (!el) return;
  const r = el.getBoundingClientRect();
  showTooltip({ clientX: r.left, clientY: r.bottom }, el.getAttribute('data-tip'));
});
document.addEventListener('focusout', (e) => {
  if (!e.target.closest('[data-tip]')) return;
  hideTooltip();
});


document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => activatePage(btn.dataset.page));
});
function activatePage(page) {
  document.querySelectorAll('.tab').forEach(t => {
    const active = t.dataset.page === page;
    t.classList.toggle('active', active);
    t.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + page));
  renderVisible();
  setTimeout(function() { animatePageNumbers(page); }, 60);
  if (page === 'pit' && !_pitReady) {
    waitForLeaflet(function() {
      if (!_pitMap) {
        _pitMap = L.map('pit-map').setView([34.0887, -118.3671], 14);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19
        }).addTo(_pitMap);
      }
      pitLoadBoundary();
      _pitReady = true;
      populatePitMonths('Apr 2026');
      pitRenderMap();
      pitFilter();
      setTimeout(function() {
        if (_pitMap) { _pitMap.invalidateSize(); pitRenderMap(); }
      }, 200);
    });
  }
  if (page === 'hcl' && !_hclReady) {
    waitForLeaflet(function() {
      if (!_hclMap) {
        _hclMap = L.map('hcl-heatmap', {zoomControl: true, scrollWheelZoom: false})
          .setView([34.0887, -118.3671], 14);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19
        }).addTo(_hclMap);
        // WeHo boundary overlay
        (function() {
          var url = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/4/query' +
            '?where=PLACE%3D%2784410%27+AND+STATE%3D%2706%27' +
            '&outFields=NAME&outSR=4326&returnGeometry=true&f=geojson';
          fetch(url).then(function(r){return r.json();}).then(function(data){
            if(data&&data.features&&data.features.length){
              _hclBoundaryLayer = L.geoJSON(data,{style:{
                color:'#003087',weight:2.5,opacity:0.8,
                fillColor:'#003087',fillOpacity:0.04,dashArray:'6 4'
              }}).addTo(_hclMap);
            }
          }).catch(function(e){console.warn('HCL boundary failed:',e);});
        })();
      }
      hclRenderHeat();
      hclInitMonthDropdown();
      hclInitFiscalYearFilter();
      hclInitReasonFilter();
      hclRenderAll();
      _hclReady = true;
      setTimeout(function() { if (_hclMap) _hclMap.invalidateSize(); }, 200);
    });
  }
  // Fallback: if hcl was marked ready but checklist is empty, re-init
  if (page === 'hcl' && _hclReady) {
    var cl = document.getElementById('hcl-month-checklist');
    if (cl && cl.children.length === 0) {
      hclInitMonthDropdown();
      hclInitFiscalYearFilter();
      hclInitReasonFilter();
      hclRenderAll();
    }
  }
}

function svgWrap(inner, viewBox='0 0 700 260', ariaLabel='') {
  // Note: intentionally NOT emitting an SVG <title> element. The aria-label below
  // carries the accessible name for screen readers; a <title> would additionally
  // trigger a native browser hover tooltip that duplicates the custom data-tip
  // tooltip and clutters the charts.
  const ariaAttr = ariaLabel ? ` role="img" aria-label="${ariaLabel.replace(/"/g,'&quot;')}"` : '';
  return `<svg class="chart-svg" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet"${ariaAttr}>${inner}</svg>`;
}

function renderBarChart(targetId, labels, values, opts={}) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const W = 700, H = opts.height || 260, pad = {t:20,r:18,b:38,l:48};
  const cW = W-pad.l-pad.r, cH = H-pad.t-pad.b;
  const max = opts.max ?? Math.max(...values);
  const colors = opts.colors || labels.map(() => COLORS.blue);
  const fmt = opts.format || (v => v);
  const tickVals = opts.ticks || [0, .25, .5, .75, 1].map(t => Math.round(max*t));
  const n = labels.length, gW = cW / n, bW = Math.min(54, gW*.62);
  let s = '';
  tickVals.forEach(tv => {
    const y = pad.t + cH - (tv/max)*cH;
    s += `<line class="axis-line" x1="${pad.l}" y1="${y}" x2="${pad.l+cW}" y2="${y}"></line>`;
    s += `<text x="${pad.l-6}" y="${y+4}" text-anchor="end" class="axis">${tv}</text>`;
  });
  labels.forEach((lbl, i) => {
    const v = values[i];
    const bh = (v/max)*cH;
    const x = pad.l + i*gW + (gW-bW)/2;
    const y = pad.t + cH - bh;
    const color = colors[i];
    const tip = pyEscape(`<strong>${lbl}</strong>${fmt(v)}`);
    s += `<rect class="bar" data-tip="${tip}" x="${x}" y="${y}" rx="8" ry="8" width="${bW}" height="${Math.max(2,bh)}"
          fill="${color}"></rect>`;
    s += `<text x="${pad.l + i*gW + gW/2}" y="${H-10}" text-anchor="middle" class="axis">${lbl}</text>`;
  });
  // Build a screen-reader summary describing the bars
  const summaryParts = labels.map((lbl, i) => `${lbl}: ${fmt(values[i])}`).join('; ');
  const ariaLabel = (opts.ariaTitle ? opts.ariaTitle + '. ' : 'Bar chart. ') + summaryParts + '.';
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', ariaLabel);
  el.innerHTML = svgWrap(s, `0 0 ${W} ${H}`, ariaLabel);
}

function renderLineChart(targetId, labels, values, opts={}) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const W=700, H=260, pad={t:20,r:20,b:34,l:48};
  const cW=W-pad.l-pad.r, cH=H-pad.t-pad.b;
  const min=opts.min ?? 0, max=opts.max ?? Math.max(...values)+5, range=max-min;
  const toX = i => pad.l + (i/(labels.length-1))*cW;
  const toY = v => pad.t + cH - ((v-min)/range)*cH;
  let s='';
  for(let t=0;t<=5;t++) {
    const v=min + (range/5)*t, y=toY(v);
    s += `<line class="axis-line" x1="${pad.l}" y1="${y}" x2="${pad.l+cW}" y2="${y}"></line>`;
    s += `<text x="${pad.l-6}" y="${y+4}" text-anchor="end" class="axis">${Math.round(v)}</text>`;
  }
  let area = `M ${toX(0)} ${toY(values[0])} `;
  let path = `M ${toX(0)} ${toY(values[0])} `;
  // Index from which the series is partial-year (drawn dashed).
  const prov = (opts.provisionalFrom !== undefined && opts.provisionalFrom !== null)
    ? opts.provisionalFrom : -1;
  const solidEnd = prov >= 0 ? prov - 1 : values.length - 1;
  let dash = '';
  values.forEach((v,i) => {
    if (i > 0) {
      area += `L ${toX(i)} ${toY(v)} `;
      if (prov < 0 || i <= solidEnd) path += `L ${toX(i)} ${toY(v)} `;
    }
  });
  if (prov >= 0) {
    dash = `M ${toX(solidEnd)} ${toY(values[solidEnd])} `;
    for (let i = prov; i < values.length; i++) dash += `L ${toX(i)} ${toY(values[i])} `;
  }
  area += `L ${toX(values.length-1)} ${toY(min)} L ${toX(0)} ${toY(min)} Z`;
  s += `<path d="${area}" fill="rgba(0,48,135,.08)"></path>`;
  s += `<path d="${path}" fill="none" stroke="${COLORS.blue}" stroke-width="3" stroke-linecap="round"></path>`;
  if (dash) s += `<path d="${dash}" fill="none" stroke="${COLORS.blue3}" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 5"></path>`;
  labels.forEach((lbl,i) => {
    const x = toX(i), y = toY(values[i]);
    const isProv = prov >= 0 && i >= prov;
    const tipTxt = isProv && opts.provisionalNote
      ? `<strong>${lbl}</strong>${values[i]} average individuals observed${opts.provisionalNote}`
      : `<strong>${lbl}</strong>${values[i]} average individuals observed`;
    const tip = pyEscape(tipTxt);
    s += `<circle class="point" data-tip="${tip}" cx="${x}" cy="${y}" r="5.5" fill="${COLORS.blue}" stroke="#fff" stroke-width="2"></circle>`;
    if (isProv && opts.partialLabel) {
      // Plain-language flag so a partial-year point reads as incomplete at a glance.
      s += `<text x="${x}" y="${y - 13}" text-anchor="end" class="axis" style="font-weight:700;fill:${COLORS.blue3};">${opts.partialLabel}</text>`;
    }
    s += `<text x="${x}" y="${H-8}" text-anchor="middle" class="axis">${lbl}</text>`;
  });
  const summaryParts = labels.map((lbl, i) => `${lbl}: ${values[i]}`).join('; ');
  const ariaLabel = (opts.ariaTitle ? opts.ariaTitle + '. ' : 'Line chart. ') + summaryParts + '.';
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', ariaLabel);
  el.innerHTML = svgWrap(s, '0 0 700 260', ariaLabel);
}

function renderDonut(targetId, labels, values, colors, opts={}) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const total = values.reduce((a,b)=>a+b,0);
  if (!total) {
    el.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:13px;padding:40px 0;">No data for selected filters</div>';
    return;
  }
  const W=240, H=240, cx=120, cy=120, r=88, inner=52;
  let start=-Math.PI/2, s='';
  values.forEach((v,i) => {
    if (!v) return;
    const ang = (v/total)*Math.PI*2;
    const end = start + ang;
    const large = ang > Math.PI ? 1 : 0;
    const x1 = cx + r*Math.cos(start), y1 = cy + r*Math.sin(start);
    const x2 = cx + r*Math.cos(end),   y2 = cy + r*Math.sin(end);
    const ix2 = cx + inner*Math.cos(end),   iy2 = cy + inner*Math.sin(end);
    const ix1 = cx + inner*Math.cos(start), iy1 = cy + inner*Math.sin(start);
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${inner} ${inner} 0 ${large} 0 ${ix1} ${iy1} Z`;
    const pct = Math.round(v/total*100);
    const extra = opts.notes && opts.notes[i] ? `<br><span style="color:#9ec4e7;font-size:11px;">${opts.notes[i]}</span>` : '';
    const tip = pyEscape(`<strong>${labels[i]}</strong>${v} requests (${pct}%)${extra}`);
    s += `<path class="slice" data-tip="${tip}" d="${d}" fill="${colors[i]}"></path>`;
    start = end;
  });
  s += `<circle cx="${cx}" cy="${cy}" r="${inner-1}" fill="#fff"></circle>`;
  const summaryParts = labels.map((lbl, i) => `${lbl}: ${values[i]} (${Math.round(values[i]/total*100)}%)`).join('; ');
  const ariaLabel = (opts.ariaTitle ? opts.ariaTitle + '. ' : 'Donut chart. ') + summaryParts + '.';
  const svgHtml = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${ariaLabel.replace(/"/g,'&quot;')}" style="max-width:240px;flex-shrink:0;">${s}</svg>`;
  const legendHtml = labels.map((lbl,i) => {
    const pct = Math.round(values[i]/total*100);
    const extra = opts.notes && opts.notes[i] ? `<div style="font-size:11px;color:var(--muted);margin-top:2px;line-height:1.4;">${opts.notes[i]}</div>` : '';
    return `<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:10px;">
      <span style="width:12px;height:12px;border-radius:3px;background:${colors[i]};flex-shrink:0;margin-top:2px;"></span>
      <div><div style="font-size:13px;color:#324760;font-weight:700;">${lbl} <span style="font-weight:400;color:var(--muted);">${pct}%</span></div>${extra}</div>
    </div>`;
  }).join('');
  el.style.minHeight = '';
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', ariaLabel);
  el.innerHTML = `<div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;">${svgHtml}<div style="flex:1;min-width:160px;padding-top:12px;">${legendHtml}</div></div>`;
  el.querySelectorAll('.slice').forEach(slice => {
    slice.addEventListener('mousemove', e => showTooltip(e, slice.getAttribute('data-tip')));
    slice.addEventListener('mouseout', () => hideTooltip());
  });
}

function renderRows(targetId, rows) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const max = Math.max(...rows.map(r => r.val));
  const summary = rows.map(r => `${r.label}: ${r.val} (${r.pct})`).join('; ');
  el.setAttribute('role', 'list');
  el.setAttribute('aria-label', 'Reason breakdown. ' + summary + '.');
  el.innerHTML = rows.map(r => {
    const width = (r.val/max)*100;
    const tip = pyEscape(`<strong>${r.label}</strong>${r.val} requests (${r.pct})<br><span class="muted">${r.note}</span>`);
    return `
      <div class="row">
        <div class="row-label">${r.label}</div>
        <div class="row-track">
          <div class="row-fill row-bar" data-tip="${tip}" style="width:${width}%; background:${r.color}">${r.pct}</div>
        </div>
        <div class="row-value">${r.val}</div>
      </div>`;
  }).join('');
}

function pyEscape(str) {
  return String(str).replaceAll('&','&amp;').replaceAll('"','&quot;');
}


// ── HCL PANEL FILTER ──


let HCL_REASON_OUTCOMES = {};
let HCL_MONTHS_ORDER = [];
let HCL_FISCAL_YEARS = [];
let HCL_MONTH_SHORT = [];
const HCL_REASON_LABELS = [
  'Housing / resource / services request',
  'Outreach / engagement request',
  'Medical / mental health / substance use',
  'Welfare / wellness check',
  'Disturbance / safety concern',
  'Administrative / non-incident',
  'Other / multiple'
];
const HCL_REASON_COLORS = [COLORS.blue, COLORS.blue2, COLORS.accent, COLORS.blue3, '#7eaed9', '#b7d0ea', '#d7e6f6'];
const HCL_REASON_NOTES  = [
  'Largest share of requests; reflects resource navigation, housing support, and general services requests.',
  'Requests centered on outreach, follow-up, or direct engagement with someone in the field.',
  'Includes physical health, behavioral health, mental health, and substance use-related concerns.',
  'Often initiated by community members or public safety partners requesting a check on someone’s condition.',
  'Smaller share of calls tied to disturbance or perceived safety concerns.',
  'Follow-up coordination, logistics, and non-incident administrative requests.',
  'Requests that do not fit neatly into one category or involve multiple needs.'
];
const HCL_OUTCOME_LABELS = ['Accepted services','Declined services','Unable to locate','Outcome pending / unknown'];
const HCL_OUTCOME_NOTES  = [
  'Accepted an offered service, referral, or concrete assistance.',
  'Direct contact occurred, but the person declined the offered service.',
  'Team responded but could not locate the individual.',
  'Response was documented, but the final outcome was still pending or not recorded.'
];
const HCL_OUTCOME_COLORS = [COLORS.blue, COLORS.blue3, COLORS.accent, COLORS.blue4];

function hclGetSelectedMonths() {
  return _hclSelectedMonths.size ? [..._hclSelectedMonths] : HCL_MONTHS_ORDER;
}

function hclAggregateSelected() {
  var months = hclGetSelectedMonths();
  var agg = { total:0, days:0, reasons:[0,0,0,0,0,0,0], outcomes:[0,0,0,0], time:[0,0,0,0,0], dow:[0,0,0,0,0,0,0] };
  months.forEach(function(mo) {
    var d = HCL_BY_MONTH[mo];
    if (!d) return;
    agg.days += d.days;
    for (var i=0;i<7;i++) agg.reasons[i] += d.reasons[i];

    if (_hclSelectedReasons.size > 0) {
      // Use exact per-reason outcome data
      var ro = HCL_REASON_OUTCOMES[mo];
      if (ro) {
        _hclSelectedReasons.forEach(function(ri) {
          if (ro[ri]) {
            for (var oi=0;oi<4;oi++) agg.outcomes[oi] += ro[ri][oi];
          }
        });
      }
      // Total = sum of selected reason counts
      _hclSelectedReasons.forEach(function(ri) { agg.total += d.reasons[ri] || 0; });
      // Scale time/dow proportionally (no per-reason breakdown available)
      var monthTotal = d.total || 1;
      var selectedTotal = 0;
      _hclSelectedReasons.forEach(function(ri) { selectedTotal += d.reasons[ri] || 0; });
      var reasonScale = selectedTotal / monthTotal;
      for (var i=0;i<5;i++) agg.time[i] += Math.round(d.time[i] * reasonScale);
      for (var i=0;i<7;i++) agg.dow[i]  += Math.round(d.dow[i]  * reasonScale);
    } else {
      agg.total += d.total;
      for (var i=0;i<4;i++) agg.outcomes[i] += d.outcomes[i];
      for (var i=0;i<5;i++) agg.time[i]     += d.time[i];
      for (var i=0;i<7;i++) agg.dow[i]      += d.dow[i];
    }
  });

  // When the reason filter is active, keep the reason summary arrays aligned
  // with the filtered view. Without this, the reason summary cards continue
  // to calculate from the full, unfiltered reason mix even though the KPIs,
  // monthly chart, outcomes, time, and day-of-week charts are filtered.
  if (_hclSelectedReasons.size > 0) {
    agg.reasons = agg.reasons.map(function(v, i) {
      return _hclSelectedReasons.has(i) ? v : 0;
    });
  }

  return agg;
}
function hclRenderAll() {
  var months = hclGetSelectedMonths();
  var agg = hclAggregateSelected();

  // KPIs
  var totalEl = document.getElementById('hcl-kpi-total');
  var avgEl   = document.getElementById('hcl-kpi-avg');
  var periodEl= document.getElementById('hcl-kpi-period');
  if (totalEl) totalEl.textContent = agg.total.toLocaleString();
  if (avgEl)   avgEl.textContent   = agg.days > 0 ? (agg.total/agg.days).toFixed(1) : '—';
  if (periodEl) {
    var activeFy = hclActiveFiscalYear();
    var fyMatch = (activeFy && activeFy !== 'all')
      ? HCL_FISCAL_YEARS.filter(function(f) { return f.id === activeFy; })[0] : null;
    if (fyMatch) periodEl.textContent = fyMatch.label + ' · ' + fyMatch.range;
    else if (_hclSelectedMonths.size === 0) periodEl.textContent = 'Jul 2025–Jul 2026 · all periods';
    else if (_hclSelectedMonths.size === 1) periodEl.textContent = months[0];
    else periodEl.textContent = months[0] + ' – ' + months[months.length-1];
  }
  hclSyncFyControl();
  var countEl = document.getElementById('hcl-filter-count');
  if (countEl) {
    var txt = agg.total.toLocaleString() + ' total requests';
    if (_hclSelectedMonths.size) txt += ' · ' + _hclSelectedMonths.size + ' month' + (_hclSelectedMonths.size>1?'s':'') + ' selected';
    if (_hclSelectedReasons.size) txt += ' · ' + _hclSelectedReasons.size + ' reason' + (_hclSelectedReasons.size>1?'s':'') + ' selected';
    countEl.textContent = txt;
  }

  // Monthly bar chart — show selected months, grey out others
  // When reason filter is active, use scaled values per month
  var moLabels = HCL_MONTH_SHORT;
  var moVals = HCL_MONTHS_ORDER.map(function(mo) {
    if (months.indexOf(mo) < 0 || !HCL_BY_MONTH[mo]) return 0;
    var d = HCL_BY_MONTH[mo];
    if (_hclSelectedReasons.size > 0) {
      var selectedTotal = 0;
      _hclSelectedReasons.forEach(function(ri) { selectedTotal += d.reasons[ri] || 0; });
      return d.days > 0 ? selectedTotal / d.days : 0;
    }
    return d.total / d.days;
  });
  var moMax    = Math.max.apply(null, moVals.map(function(v){return v;}));
  var moColors = HCL_MONTHS_ORDER.map(function(mo,i) {
    if (months.indexOf(mo) < 0) return COLORS.blue5;
    return moVals[i] === moMax ? COLORS.blue : COLORS.blue3;
  });
  renderBarChart('hcl-monthly', moLabels, moVals, {
    ariaTitle: 'Homeless Concern Line — average daily requests by month',
    max: Math.max(8, moMax + 1),
    ticks:[0,2,4,6,8].filter(function(v){return v<=Math.max(8,moMax+1);}),
    colors: moColors,
    format: function(v){ return v.toFixed(1)+' requests/day'; }
  });

  // Reasons bar chart — dim unselected if filter active
  var reasonTotal = agg.total || 1;
  var reasonRows  = HCL_REASON_LABELS.map(function(lbl,i) {
    var v = agg.reasons[i];
    var dimmed = _hclSelectedReasons.size > 0 && !_hclSelectedReasons.has(i);
    return {label:lbl, val:dimmed ? 0 : v, pct:dimmed ? '—' : Math.round(v/reasonTotal*100)+'%', color:dimmed ? '#d0d8e4' : HCL_REASON_COLORS[i], note:HCL_REASON_NOTES[i]};
  }).filter(function(r){ return r.val > 0 || (_hclSelectedReasons.size > 0 && HCL_REASON_LABELS.indexOf(r.label) >= 0); });
  // Only show selected reasons when filter is active, otherwise all with val > 0
  var reasonRowsFiltered = _hclSelectedReasons.size > 0
    ? HCL_REASON_LABELS.map(function(lbl,i) {
        if (!_hclSelectedReasons.has(i)) return null;
        var v = agg.reasons[i];
        return {label:lbl, val:v, pct:Math.round(v/(agg.total||1)*100)+'%', color:HCL_REASON_COLORS[i], note:HCL_REASON_NOTES[i]};
      }).filter(Boolean)
    : HCL_REASON_LABELS.map(function(lbl,i) {
        var v = agg.reasons[i];
        return {label:lbl, val:v, pct:Math.round(v/reasonTotal*100)+'%', color:HCL_REASON_COLORS[i], note:HCL_REASON_NOTES[i]};
      }).filter(function(r){ return r.val > 0; });
  renderRows('hcl-reasons', reasonRowsFiltered);

  // Render grouped reason summary above detail bars
  (function() {
    var groupedEl = document.getElementById('hcl-reasons-grouped');
    if (!groupedEl) return;
    var groups = [
      {label:'Housing & Resource Requests', color:'#003087', indices:[0,1]},
      {label:'Behavioral Health & Wellness', color:'#1c6ccf', indices:[2,3]},
      {label:'Safety & Other', color:'#5B9BD5', indices:[4,5,6]}
    ];
    var total = agg.reasons.reduce(function(a,b){return a+b;},0) || 1;
    var html = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px;">';
    groups.forEach(function(g) {
      var count = g.indices.reduce(function(a,i){ return a + (agg.reasons[i]||0); }, 0);
      var pct = Math.round(count/total*100);
      html += '<div style="background:#f3f7fc;border-radius:8px;padding:10px 12px;border-left:3px solid '+g.color+';">';
      html += '<div style="font-size:11px;font-weight:800;color:'+g.color+';text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">'+g.label+'</div>';
      html += '<div style="font-size:20px;font-weight:800;color:#18314f;">'+pct+'%</div>';
      html += '<div style="font-size:11px;color:var(--muted);margin-top:2px;">'+count.toLocaleString()+' requests</div>';
      html += '</div>';
    });
    html += '</div><div style="font-size:11px;color:var(--muted);margin-bottom:8px;border-bottom:1px solid var(--line);padding-bottom:8px;">Breakdown by specific reason below</div>';
    groupedEl.innerHTML = html;
  })();

  // Outcomes donut
  renderDonut('hcl-outcomes', HCL_OUTCOME_LABELS, agg.outcomes, HCL_OUTCOME_COLORS, {notes:HCL_OUTCOME_NOTES, ariaTitle: 'Homeless Concern Line — outcomes of requests'});

  // Time of day bar chart
  var timeMax = Math.max.apply(null, agg.time);
  renderBarChart('hcl-time', ['6–9 AM','9 AM–12','12–3 PM','3–6 PM','6 PM+'], agg.time, {
    ariaTitle: 'Homeless Concern Line — request volume by time of day',
    max: Math.ceil(timeMax / 50) * 50 || 50,
    colors: agg.time.map(function(v){ return v===timeMax?COLORS.blue:COLORS.blue3; }),
    format: function(v){ return v+' calls'; }
  });

  // Day of week bar chart
  var dowMax = Math.max.apply(null, agg.dow);
  renderBarChart('hcl-dow', ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], agg.dow, {
    ariaTitle: 'Homeless Concern Line — request volume by day of week',
    max: Math.ceil(dowMax / 50) * 50 || 50,
    colors: agg.dow.map(function(v){ return v===dowMax?COLORS.blue:COLORS.blue3; }),
    format: function(v){ return v+' calls'; }
  });

  // Update chart notes when reason filter is active
  var reasonFilterActive = _hclSelectedReasons.size > 0;
  var reasonLabel = reasonFilterActive
    ? Array.from(_hclSelectedReasons).map(function(i){ return HCL_REASON_SHORT[i]; }).join(', ')
    : '';
  var scalingNote = reasonFilterActive
    ? ' Outcomes, time, and day-of-week data are proportionally scaled to the selected reason' + (_hclSelectedReasons.size > 1 ? 's' : '') + '.'
    : '';

  var monthlyNoteEl = document.getElementById('hcl-monthly-note');
  if (monthlyNoteEl) monthlyNoteEl.textContent = reasonFilterActive
    ? 'Requests per day — filtered to: ' + reasonLabel + '. July is a partial month.'
    : 'Requests per day; July is a partial month.';

  var reasonsNoteEl = document.getElementById('hcl-reasons-note');
  if (reasonsNoteEl) {
    var careOrientedTotal = (agg.reasons[0] || 0) + (agg.reasons[1] || 0) + (agg.reasons[2] || 0) + (agg.reasons[3] || 0);
    var careOrientedPct = agg.total > 0 ? Math.round(careOrientedTotal / agg.total * 100) : 0;
    reasonsNoteEl.textContent = reasonFilterActive
      ? 'Approximately ' + careOrientedPct + '% of filtered requests are care-oriented. Showing selected reason' + (_hclSelectedReasons.size > 1 ? 's' : '') + ': ' + reasonLabel + '.'
      : 'Approximately ' + careOrientedPct + '% of requests are care-oriented.';
  }

  var outcomesNoteEl = document.getElementById('hcl-outcomes-note');
  var acceptedEl = document.getElementById('hcl-kpi-accepted');
  if (acceptedEl) {
    var oc2 = agg.outcomes;
    var reached2 = oc2[0] + oc2[1];
    acceptedEl.textContent = (reached2 > 0 ? Math.round(oc2[0] / reached2 * 100) : 0) + '%';
  }
  if (outcomesNoteEl) {
    var oc = agg.outcomes;
    var reached = oc[0] + oc[1];
    var acceptedOfReached = reached > 0 ? Math.round(oc[0] / reached * 100) : 0;
    var acceptedOfAll = agg.total > 0 ? Math.round(oc[0] / agg.total * 100) : 0;
    var scalingNote = reasonFilterActive ? ' Outcomes proportionally scaled to selected reason' + (_hclSelectedReasons.size > 1 ? 's' : '') + '.' : '';
    outcomesNoteEl.textContent = acceptedOfAll + '% of requests resulted in accepted services; ' + acceptedOfReached + '% of direct contacts accepted services. \u201cDeclined services\u201d reflects direct contact where the offer was refused.' + scalingNote;
  }

  var timeNoteEl = document.getElementById('hcl-time-note');
  if (timeNoteEl) timeNoteEl.textContent = reasonFilterActive
    ? 'Time of day data scaled to selected reason' + (_hclSelectedReasons.size > 1 ? 's' : '') + ': ' + reasonLabel + '.'
    : 'Nearly all recorded activity occurs between 6 AM and 6 PM.';

  var dowNoteEl = document.getElementById('hcl-dow-note');
  if (dowNoteEl) dowNoteEl.textContent = reasonFilterActive
    ? 'Day-of-week data scaled to selected reason' + (_hclSelectedReasons.size > 1 ? 's' : '') + ': ' + reasonLabel + '.'
    : 'Fridays are the busiest day in the current dataset.';

  // Heatmap
  hclRenderHeat();
}

function hclInitMonthDropdown() {
  var checklist = document.getElementById('hcl-month-checklist');
  if (!checklist) return;
  checklist.innerHTML = '';

  // Group months by year
  var yearGroups = {};
  var yearOrder = [];
  HCL_MONTHS_ORDER.forEach(function(mo, idx) {
    var yr = mo.split(' ')[1];
    if (!yearGroups[yr]) { yearGroups[yr] = []; yearOrder.push(yr); }
    yearGroups[yr].push({ mo: mo, idx: idx });
  });

  yearOrder.forEach(function(yr) {
    var group = document.createElement('div');
    group.className = 'hcl-year-group';

    // Year header button
    var header = document.createElement('button');
    header.type = 'button';
    header.className = 'hcl-year-header';
    header.innerHTML = yr + ' <span class="hcl-year-chevron">▾</span>';
    header.addEventListener('click', function() {
      var months = group.querySelector('.hcl-year-months');
      var isOpen = months.classList.toggle('open');
      header.classList.toggle('open', isOpen);
    });

    // Month chips container (collapsed by default)
    var monthsDiv = document.createElement('div');
    monthsDiv.className = 'hcl-year-months';

    yearGroups[yr].forEach(function(item) {
      var label = document.createElement('label');
      label.className = 'hcl-month-option';
      label.setAttribute('for', 'hcl-month-' + item.idx);

      var input = document.createElement('input');
      input.type = 'checkbox';
      input.id = 'hcl-month-' + item.idx;
      input.value = item.mo;
      input.addEventListener('change', hclOnMonthSelect);

      var span = document.createElement('span');
      span.textContent = item.mo.split(' ')[0]; // just month name, year shown in header
      label.appendChild(input);
      label.appendChild(span);
      monthsDiv.appendChild(label);
    });

    group.appendChild(header);
    group.appendChild(monthsDiv);
    checklist.appendChild(group);
  });
}


function hclPointNearWeho(lat, lon) {
  // Inline WeHo boundary coords (same as pitLoadBoundary source)
  // Use bounding box + 0.5 mi buffer as fast pre-check
  // WeHo approx bbox: lat 34.074–34.099, lon -118.394 to -118.343
  var LAT_BUFFER = 0.00725, LON_BUFFER = 0.00860;
  if (lat < 34.074 - LAT_BUFFER || lat > 34.099 + LAT_BUFFER ||
      lon < -118.394 - LON_BUFFER || lon > -118.343 + LON_BUFFER) return false;
  // Inside bounding box — accept (conservative: keeps all near-boundary points)
  return true;
}

function hclGetFilteredPts() {
  return HCL_HEAT_PTS.filter(function(p) {
    if (_hclSelectedMonths.size && !_hclSelectedMonths.has(p[2])) return false;
    if (_hclSelectedReasons.size && !_hclSelectedReasons.has(p[3])) return false;
    return hclPointNearWeho(p[0], p[1]);
  });
}

function hclRenderHeat() {
  if (!_hclMap) return;
  if (_hclHeat) { _hclMap.removeLayer(_hclHeat); _hclHeat = null; }
  var pts = hclGetFilteredPts().map(function(p) { return [p[0], p[1], 1]; });
  // Scale max dynamically so density reflects the selected period, not absolute saturation.
  // Aim: the single busiest cell shouldn't blow out until it genuinely dominates.
  // Rule of thumb: max ≈ sqrt(n) / 3, clamped 1–15.
  var dynamicMax = Math.min(8, Math.max(2, Math.round(Math.sqrt(pts.length) / 5)));
  _hclHeat = L.heatLayer(pts, {
    radius: 20,
    blur: 16,
    maxZoom: 17,
    max: dynamicMax,
    minOpacity: 0.0,
    gradient: {
      0.00: 'rgba(0,0,0,0)',
      0.20: 'rgba(0,180,70,0.45)',
      0.42: 'rgba(160,230,0,0.65)',
      0.60: 'rgba(240,210,0,0.78)',
      0.78: 'rgba(255,120,0,0.88)',
      1.00: 'rgba(185,0,0,1)'
    }
  }).addTo(_hclMap);
  var el = document.getElementById('hcl-heat-count');
  if (el) el.textContent = pts.length.toLocaleString() + ' geocoded requests' + (_hclSelectedMonths.size ? ' · ' + _hclSelectedMonths.size + ' month' + (_hclSelectedMonths.size > 1 ? 's' : '') + ' selected' : '');
}

function hclOnMonthSelect() {
  var checklist = document.getElementById('hcl-month-checklist');
  _hclSelectedMonths.clear();
  if (checklist) {
    Array.from(checklist.querySelectorAll('input[type="checkbox"]:checked')).forEach(function(box) {
      if (box.value) _hclSelectedMonths.add(box.value);
    });
  }
  hclRenderAll();
}

function hclInitFiscalYearFilter() {
  var sel = document.getElementById('hcl-fy-select');
  if (!sel) return;
  sel.innerHTML = '';
  var add = function(value, text) {
    var o = document.createElement('option');
    o.value = value; o.textContent = text;
    sel.appendChild(o);
  };
  add('all', 'All periods');
  HCL_FISCAL_YEARS.forEach(function(fy, i) {
    add(fy.id, fy.label + (i === HCL_FISCAL_YEARS.length - 1 ? ' (current)' : ''));
  });
  // Shown only when the month checklist holds a selection that is not a whole FY
  var custom = document.createElement('option');
  custom.value = 'custom'; custom.textContent = 'Custom month selection'; custom.hidden = true;
  sel.appendChild(custom);
  sel.onchange = function() { if (this.value !== 'custom') hclSelectFiscalYear(this.value); };
  hclSyncFyControl();
}

// Returns the fiscal-year id whose month set exactly matches the current
// selection, 'all' when nothing is filtered, or null for a custom selection.
function hclActiveFiscalYear() {
  if (_hclSelectedMonths.size === 0) return 'all';
  for (var i = 0; i < HCL_FISCAL_YEARS.length; i++) {
    var fy = HCL_FISCAL_YEARS[i];
    if (fy.months.length !== _hclSelectedMonths.size) continue;
    var all = fy.months.every(function(mo) { return _hclSelectedMonths.has(mo); });
    if (all) return fy.id;
  }
  return null;
}

function hclSyncFyControl() {
  var active = hclActiveFiscalYear();
  var sel = document.getElementById('hcl-fy-select');
  var readout = document.getElementById('hcl-fy-readout');
  if (sel) sel.value = active || 'custom';
  if (!readout) return;
  if (active === 'all') {
    readout.textContent = 'Showing all periods \u00b7 Jul 2025 \u2013 Jul 2026';
  } else if (active) {
    var fy = HCL_FISCAL_YEARS.filter(function(f) { return f.id === active; })[0];
    readout.textContent = 'Showing ' + fy.label + ' \u00b7 ' + fy.range;
  } else {
    readout.textContent = 'Showing custom selection \u00b7 ' + _hclSelectedMonths.size +
      ' month' + (_hclSelectedMonths.size > 1 ? 's' : '');
  }
}

function hclSelectFiscalYear(id) {
  _hclSelectedMonths.clear();
  if (id !== 'all') {
    var fy = HCL_FISCAL_YEARS.filter(function(f) { return f.id === id; })[0];
    if (fy) fy.months.forEach(function(mo) { _hclSelectedMonths.add(mo); });
  }
  // Mirror the selection onto the month checklist so both controls agree
  var checklist = document.getElementById('hcl-month-checklist');
  if (checklist) {
    Array.from(checklist.querySelectorAll('input[type="checkbox"]')).forEach(function(box) {
      box.checked = _hclSelectedMonths.has(box.value);
    });
    checklist.querySelectorAll('.hcl-year-group').forEach(function(g) {
      var anyChecked = Array.from(g.querySelectorAll('input[type="checkbox"]')).some(function(b) { return b.checked; });
      var months = g.querySelector('.hcl-year-months');
      var header = g.querySelector('.hcl-year-header');
      if (months) months.classList.toggle('open', anyChecked);
      if (header) header.classList.toggle('open', anyChecked);
    });
  }
  hclRenderAll();
}

function hclResetMonths() {
  _hclSelectedMonths.clear();
  var checklist = document.getElementById('hcl-month-checklist');
  if (checklist) {
    Array.from(checklist.querySelectorAll('input[type="checkbox"]')).forEach(function(box) { box.checked = false; });
    // Collapse all year groups
    checklist.querySelectorAll('.hcl-year-months').forEach(function(m) { m.classList.remove('open'); });
    checklist.querySelectorAll('.hcl-year-header').forEach(function(h) { h.classList.remove('open'); });
  }
  hclRenderAll();
}

// Short display labels for reason pills
const HCL_REASON_SHORT = [
  'Housing / Resource',
  'Outreach',
  'Medical / MH / SU',
  'Welfare Check',
  'Disturbance',
  'Administrative',
  'Other / Multiple'
];

function hclInitReasonFilter() {
  var checklist = document.getElementById('hcl-reason-checklist');
  if (!checklist) return;
  checklist.innerHTML = '';
  HCL_REASON_SHORT.forEach(function(lbl, i) {
    var label = document.createElement('label');
    label.className = 'hcl-reason-option';
    label.setAttribute('for', 'hcl-reason-' + i);
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.id = 'hcl-reason-' + i;
    input.value = i;
    input.addEventListener('change', hclOnReasonSelect);
    var span = document.createElement('span');
    span.textContent = lbl;
    label.appendChild(input);
    label.appendChild(span);
    checklist.appendChild(label);
  });
}

function hclOnReasonSelect() {
  _hclSelectedReasons.clear();
  var checklist = document.getElementById('hcl-reason-checklist');
  if (checklist) {
    Array.from(checklist.querySelectorAll('input[type="checkbox"]:checked')).forEach(function(box) {
      _hclSelectedReasons.add(parseInt(box.value));
    });
  }
  hclRenderAll();
}

function hclResetReasons() {
  _hclSelectedReasons.clear();
  var checklist = document.getElementById('hcl-reason-checklist');
  if (checklist) {
    Array.from(checklist.querySelectorAll('input[type="checkbox"]')).forEach(function(box) { box.checked = false; });
  }
  hclRenderAll();
}


// Wait for Leaflet to be available before initializing the map
function waitForLeaflet(callback) {
  if (typeof L !== 'undefined') {
    callback();
    return;
  }
  var attempts = 0;
  var interval = setInterval(function() {
    attempts++;
    if (typeof L !== 'undefined') {
      clearInterval(interval);
      callback();
    } else if (attempts > 50) {
      clearInterval(interval);
      var el = document.getElementById('pit-map');
      if (el) el.innerHTML = '<div style="padding:24px;color:#5f7088;font-size:13px;">Map could not load — please check your internet connection and refresh.</div>';
    }
  }, 100);
}

let _pitMap = null, _pitDots = null, _pitBoundary = null, _pitReady = false;
let _hclMap = null, _hclHeat = null, _hclReady = false, _hclBoundaryLayer = null, _hclSelectedMonths = new Set(), _hclSelectedReasons = new Set();

function populatePitMonths(target) {
  const yr = document.getElementById('pit-year').value;
  const sel = document.getElementById('pit-month');
  const cur = target !== undefined ? target : sel.value;
  sel.onchange = null;
  sel.innerHTML = '<option value="all">All months</option>';
  let data = yr === 'all' ? PIT_PTS : PIT_PTS.filter(p => String(p[5]) === yr);
  const seen = {}; data.forEach(p => seen[p[4]] = 1);
  Object.keys(seen).sort((a,b) => new Date('01 '+a) - new Date('01 '+b)).forEach(m => {
    const o = document.createElement('option');
    o.value = m; o.textContent = m;
    sel.appendChild(o);
  });
  if (cur) sel.value = cur;
  sel.onchange = pitFilter;
}

function pitFilter() {
  populatePitMonths();
  const yr = document.getElementById('pit-year').value;
  const mo = document.getElementById('pit-month').value;
  let data = PIT_PTS;
  if (yr !== 'all') data = data.filter(p => String(p[5]) === yr);
  if (mo !== 'all') data = data.filter(p => p[4] === mo);
  document.getElementById('pit-summary').textContent = data.length + ' mapped observations' + (yr !== 'all' ? ' · ' + yr : '') + (mo !== 'all' ? ' · ' + mo : '');
  if (_pitReady && _pitMap) pitRenderMap();
}

function pitRenderMap() {
  if (!_pitReady || typeof L === 'undefined' || !_pitMap) return;
  const yr = document.getElementById('pit-year').value;
  const mo = document.getElementById('pit-month').value;
  let data = PIT_PTS;
  if (yr !== 'all') data = data.filter(p => String(p[5]) === yr);
  if (mo !== 'all') data = data.filter(p => p[4] === mo);
  if (_pitDots) { _pitMap.removeLayer(_pitDots); _pitDots = null; }
  _pitDots = L.layerGroup();
  data.forEach(p => {
    const r = Math.max(5, Math.min(15, p[2] * 2.5));
    const m = L.circleMarker([p[0], p[1]], {
      radius: r, fillColor: '#003087', color: '#fff',
      weight: 1.5, opacity: 1, fillOpacity: 0.75, interactive: true, bubblingMouseEvents: false
    });
    m.bindTooltip('<strong>' + p[3] + '</strong><br>' + p[4] + ': ' + p[2] + ' individual' + (p[2] !== 1 ? 's' : ''),
      {direction: 'top', offset: [0, -4], sticky: false, opacity: 0.98});
    m.on('mouseover', function() { this.openTooltip(this.getLatLng()); this.setStyle({weight: 2.5}); });
    m.on('mouseout',  function() { this.closeTooltip(); this.setStyle({weight: 1.5}); });
    m.addTo(_pitDots);
  });
  _pitDots.addTo(_pitMap);
}

function pitLoadBoundary() {
  if (typeof L === 'undefined' || !_pitMap || _pitBoundary) return;
  const url = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/4/query' +
    '?where=PLACE%3D%2784410%27+AND+STATE%3D%2706%27' +
    '&outFields=NAME&outSR=4326&returnGeometry=true&f=geojson';
  fetch(url).then(r => r.json()).then(data => {
    if (data && data.features && data.features.length) {
      _pitBoundary = L.geoJSON(data, {style: {
        color: '#003087', weight: 2.5, opacity: 0.8,
        fillColor: '#003087', fillOpacity: 0.04, dashArray: '6 4'
      }}).addTo(_pitMap);
    }
  }).catch(e => console.warn('WeHo boundary load failed:', e));
}


function renderPitCounts() {
  var sel = document.getElementById('pit-count-year');
  // Default the counts view to 2026 on first render, regardless of any
  // browser-restored form state, then honor the user's selection thereafter.
  if (sel && !sel.dataset.userSet) { sel.value = '2026'; }
  var yr = sel ? sel.value : '2026';
  var title = document.getElementById('pit-count-title');
  var note  = document.getElementById('pit-count-note');
  var foot  = document.getElementById('pit-count-foot');
  var obsTip = '<span class="glossary-term" data-tip="&lt;strong&gt;Observed unsheltered individuals&lt;/strong&gt;People seen by outreach teams during field counts; this may not capture every person experiencing homelessness in the City." tabindex="0">Observed unsheltered individuals</span>';

  if (yr === '2026') {
    // Quarterly counts. Only quarters that have been reported are charted.
    var have = PIT_QTRS.filter(function(q) { return PIT_Q_2026[q] !== null && PIT_Q_2026[q] !== undefined; });
    var vals = have.map(function(q) { return PIT_Q_2026[q]; });
    var labels = have.map(function(q) {
      var m = PIT_Q_META[q] || {};
      // Append the month the count actually took place, e.g. "Q1 · Jan".
      var mo = m.date ? m.date.split(' ')[0] : '';
      return mo ? (q + ' \u00b7 ' + mo) : q;
    });
    if (title) title.textContent = 'Quarterly counts — 2026';
    if (note) note.innerHTML = obsTip + ', by quarter. Starting in 2026 the City conducts one field count per quarter instead of monthly counts.';
    renderBarChart('pit-monthly', labels, vals, {
      max: 80,
      colors: labels.map(function() { return COLORS.blue3; }),
      format: function(v) { return v + ' individuals observed'; },
      ariaTitle: 'Observed unsheltered individuals by quarter, 2026'
    });
    if (foot) foot.textContent = '';
  } else {
    if (title) title.textContent = 'Monthly counts — 2025';
    if (note) note.innerHTML = obsTip + ', Jan–Sep 2025';
    renderBarChart('pit-monthly', PIT_MONTHS9, PIT_MONTHS9.map(function(_m, i) { return PIT_MO_2025[i] || 0; }), {
      max: 80,
      colors: PIT_MONTHS9.map(function() { return COLORS.blue3; }),
      format: function(v) { return v + ' individuals observed'; },
      ariaTitle: 'Observed unsheltered individuals by month, January to September 2025'
    });
    if (foot) foot.textContent = 'Monthly counts were collected through September 2025, when the Ascencia outreach and engagement contract ended.';
  }
}


function buildHclTimeMetadata() {
  const parseMonth = function(label) {
    const d = new Date(label + ' 1');
    return isNaN(d) ? new Date(0) : d;
  };
  HCL_MONTHS_ORDER = Object.keys(HCL_BY_MONTH).sort(function(a,b){ return parseMonth(a) - parseMonth(b); });
  HCL_MONTH_SHORT = HCL_MONTHS_ORDER.map(function(label, i) {
    const d = parseMonth(label);
    const mon = d.toLocaleString('en-US', {month:'short'});
    const yr = String(d.getFullYear()).slice(-2);
    if (i === 0 || d.getMonth() === 6) return mon + ' ’' + yr;
    return mon;
  });

  const groups = {};
  HCL_MONTHS_ORDER.forEach(function(label) {
    const d = parseMonth(label);
    const y = d.getFullYear();
    const start = d.getMonth() >= 6 ? y : y - 1;
    const end = start + 1;
    const id = 'fy' + String(start).slice(-2) + String(end).slice(-2);
    if (!groups[id]) groups[id] = { id:id, label:'FY ' + start + '–' + String(end).slice(-2), range:'', months:[] };
    groups[id].months.push(label);
  });
  HCL_FISCAL_YEARS = Object.values(groups);
  HCL_FISCAL_YEARS.forEach(function(fy) {
    if (fy.months.length) fy.range = fy.months[0] + ' – ' + fy.months[fy.months.length - 1];
  });
}

function applyLiveMetrics(metrics) {
  document.querySelectorAll('[data-metric]').forEach(function(el) {
    const key = el.getAttribute('data-metric');
    if (Object.prototype.hasOwnProperty.call(metrics, key)) {
      el.textContent = metrics[key];
      el.setAttribute('data-raw', metrics[key]);
    }
  });
  if (HCL_BY_MONTH && Object.keys(HCL_BY_MONTH).length) {
    const total = Object.values(HCL_BY_MONTH).reduce(function(sum, d){ return sum + (Number(d.total) || 0); }, 0);
    document.querySelectorAll('[data-derived="hcl-total"]').forEach(function(el) {
      const value = total.toLocaleString();
      el.textContent = value;
      el.setAttribute('data-raw', value);
    });
  }
}

function showDashboardDataError(error) {
  console.error('Dashboard data load failed:', error);
  const host = document.querySelector('.main');
  if (!host) return;
  const notice = document.createElement('div');
  notice.className = 'banner';
  notice.style.marginBottom = '14px';
  notice.style.borderLeftColor = '#b45a1c';
  var detail = error && error.message ? error.message : String(error || 'Unknown error');
  notice.innerHTML = '<h3>Dashboard data unavailable</h3><p>The page itself is working, but live data could not be retrieved.</p><p style="margin-top:8px;font-size:12px;"><strong>Technical detail:</strong> ' + pyEscape(detail) + '</p>';
  host.insertBefore(notice, host.firstChild);
}

async function bootstrapDashboard() {
  try {
    const live = await window.loadDashboardData();
    PIT_PTS = live.pitPoints;
    PIT_MO_2025 = live.pitMonthly2025;
    PIT_YR_LBLS = live.pitYearLabels;
    PIT_YR_AVGS = live.pitYearAverages;
    PIT_Q_2026 = live.pitQuarter2026;
    PIT_Q_META = live.pitQuarterMeta;
    HCL_HEAT_PTS = live.hclHeatPoints;
    HCL_BY_MONTH = live.hclByMonth;
    HCL_REASON_OUTCOMES = live.hclReasonOutcomes;
    HOLLOWAY_Q = live.holloway;
    DATA = live.series;
    DASHBOARD_DATA_READY = true;
    buildHclTimeMetadata();
    applyLiveMetrics(live.metrics || {});
    renderHolloway();
    if (live.errors && live.errors.length) {
      console.warn('Dashboard loaded with partial data:', live.errors);
    }

    const updated = document.getElementById('dashboard-last-updated');
    if (updated && live.settings && live.settings.last_updated_label) {
      updated.textContent = live.settings.last_updated_label;
    }

    populatePitMonths('Apr 2026');
    pitFilter();
    renderVisible();
    setTimeout(function() { animatePageNumbers('intro'); }, 120);
  } catch (error) {
    showDashboardDataError(error);
  }
}

function renderVisible() {
  if (!DASHBOARD_DATA_READY) return;
  renderPitCounts();
  renderLineChart('pit-trend', PIT_YR_LBLS, PIT_YR_AVGS, {
    max:70,
    provisionalFrom: PIT_YR_LBLS.indexOf('2026'),
    partialLabel: 'Q1–Q2 only',
    provisionalNote: ' — average of the quarterly counts reported so far (Q1 and Q2), not a full year',
    ariaTitle: 'Average number of individuals observed per count event by year, 2017 to 2026; 2026 covers Q1 and Q2 only'
  });

  // HCL charts rendered by hclRenderAll() when HCL tab activates
  if (_hclReady) hclRenderAll();

  const _permYrs = DATA.years;
  const _permVals = DATA.permTotal;
  renderBarChart('housing-perm', _permYrs, _permVals, {
    max:80,
    colors:_permVals.map((v,i) => i === _permVals.length-1 ? COLORS.blue4 : (v === Math.max(...DATA.permTotal) ? COLORS.blue : COLORS.blue3)),
    format:v => `${v} permanent housing placements`,
    ariaTitle: 'Permanent housing placements by year, 2021 to 2026 (2026 is contract year to date, partial)'
  });
  const _intYrs = DATA.years;
  const _intVals = DATA.intTotal;
  renderBarChart('housing-interim', _intYrs, _intVals, {
    max:180,
    colors:_intVals.map((v,i) => i === _intVals.length-1 ? COLORS.blue4 : (v === Math.max(...DATA.intTotal) ? COLORS.blue : COLORS.blue3)),
    format:v => `${v} interim housing admissions`,
    ariaTitle: 'Interim housing admissions by year, 2021 to 2026 (2026 is contract year to date, partial)'
  });
  renderBarChart('prevention-rental', DATA.years, DATA.rentalTotal, {
    max:500,
    colors:DATA.rentalTotal.map((v,i) => i === DATA.rentalTotal.length-1 ? COLORS.blue4 : (v === Math.max(...DATA.rentalTotal) ? COLORS.blue : COLORS.blue3)),
    format:v => `${v} households assisted`,
    ariaTitle: 'Rental assistance households served by year, 2021 to 2026 (2026 is year to date through March, partial)'
  });
}

var pitYearSelect = document.getElementById('pit-year');
if (pitYearSelect) pitYearSelect.addEventListener('change', function() {
  populatePitMonths();
  pitFilter();
});
var pitMonthSelect = document.getElementById('pit-month');
if (pitMonthSelect) pitMonthSelect.addEventListener('change', pitFilter);
(function() {
  var cy = document.getElementById('pit-count-year');
  if (cy) {
    cy.value = '2026';           // default view, resilient to browser value restoration
    cy.addEventListener('change', function() { cy.dataset.userSet = '1'; renderPitCounts(); });
  }
})();

window.addEventListener('resize', () => {
  clearTimeout(window.__dashResize);
  window.__dashResize = setTimeout(() => { if (DASHBOARD_DATA_READY) renderVisible(); if (_pitMap) _pitMap.invalidateSize(); }, 120);
});



// Startup is handled by bootstrapDashboard() after live data is loaded.

// ── EXPANDABLE KPI CARDS ──

// ── COUNT-UP ANIMATION ──
function countUp(el, duration) {
  var raw = el.getAttribute('data-raw') || el.textContent.trim();
  el.setAttribute('data-raw', raw);

  // Parse prefix / suffix / numeric core
  var prefix = '', suffix = '', numStr = raw;

  // Handle special non-numeric cases — just flash them in
  if (raw === '~4' || raw.indexOf('min') !== -1 || raw === '') {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.4s ease';
    setTimeout(function() {
      el.textContent = raw;
      el.style.opacity = '1';
    }, 80);
    return;
  }

  if (numStr.charAt(0) === '$') { prefix = '$'; numStr = numStr.slice(1); }
  if (numStr.charAt(0) === '~') { prefix = '~'; numStr = numStr.slice(1); }
  if (numStr.slice(-1) === '+') { suffix = '+'; numStr = numStr.slice(0,-1); }
  if (numStr.slice(-1) === 'M') { suffix = 'M' + suffix; numStr = numStr.slice(0,-1); }
  if (numStr.slice(-1) === '%') { suffix = '%'; numStr = numStr.slice(0,-1); }

  var isDecimal = numStr.indexOf('.') !== -1;
  var target = parseFloat(numStr.replace(/,/g,''));
  if (isNaN(target)) {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.4s ease';
    setTimeout(function() { el.textContent = raw; el.style.opacity = '1'; }, 80);
    return;
  }

  var startTime = null;
  var eased = function(t) { return 1 - Math.pow(1-t, 3); }; // ease-out cubic

  function fmt(v) {
    var s = isDecimal ? v.toFixed(1) : Math.round(v).toLocaleString();
    return prefix + s + suffix;
  }

  el.textContent = prefix + '0' + suffix;

  function step(ts) {
    if (!startTime) startTime = ts;
    var progress = Math.min((ts - startTime) / duration, 1);
    el.textContent = fmt(target * eased(progress));
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = raw; // ensure exact final value
  }
  requestAnimationFrame(step);
}

function animatePageNumbers(pageId) {
  var page = document.getElementById('page-' + pageId);
  if (!page) return;
  // Stagger each card slightly. Skip filter-managed KPI values (Holloway
  // quarter filter) — those are set live by their own render function, and
  // animating them would clobber a value the user just filtered to.
  var els = page.querySelectorAll('.k-value');
  els.forEach(function(el, i) {
    // Skip filter-managed KPIs (Holloway quarter filter) —
    // those are set live by their own render functions, and animating them
    // would clobber a value the user just selected.
    if (el.id && el.id.indexOf('hw-') === 0) return;
    setTimeout(function() { countUp(el, 900); }, i * 80);
  });
}

function initExpandableKPIs() {
  document.querySelectorAll('.kpi[data-expand]').forEach(function(card) {
    var detail = card.querySelector('.k-detail');
    if (!detail) return;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-expanded', 'false');

    function toggleCard() {
      var isOpen = card.classList.contains('kpi-expanded');
      // Close all others first
      document.querySelectorAll('.kpi.kpi-expanded').forEach(function(c) {
        if (c !== card) {
          c.classList.remove('kpi-expanded');
          c.setAttribute('aria-expanded', 'false');
          var d = c.querySelector('.k-detail');
          if (d) { d.style.maxHeight = '0px'; d.style.paddingTop = '0'; d.style.marginTop = '0'; d.style.opacity = '0'; }
        }
      });
      card.classList.toggle('kpi-expanded', !isOpen);
      card.setAttribute('aria-expanded', String(!isOpen));
      detail.style.maxHeight = isOpen ? '0px' : (detail.scrollHeight + 24) + 'px';
      detail.style.paddingTop = isOpen ? '0' : '10px';
      detail.style.marginTop = isOpen ? '0' : '10px';
      detail.style.opacity = isOpen ? '0' : '1';
    }

    card.addEventListener('click', toggleCard);
    card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCard(); }
    });
  });
}

// Run on load
(function() {
  function onReady() {
    setTimeout(initExpandableKPIs, 200);
    bootstrapDashboard();
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') onReady();
  else document.addEventListener('DOMContentLoaded', onReady);
})();


// ── IFRAME HEIGHT REPORTING ──
// Posts document height to parent so the embedding iframe can auto-size
(function() {
  function reportHeight() {
    var h = document.documentElement.scrollHeight;
    try {
      window.parent.postMessage({ type: 'weho-dashboard-height', height: h }, '*');
    } catch(e) {}
  }
  // Report on load, tab switch, and resize
  window.addEventListener('load', function() { setTimeout(reportHeight, 300); });
  window.addEventListener('resize', function() { setTimeout(reportHeight, 150); });
  // Observe DOM changes (chart renders, expand/collapse)
  if (typeof ResizeObserver !== 'undefined') {
    var ro = new ResizeObserver(function() { setTimeout(reportHeight, 100); });
    ro.observe(document.body);
  }
  // Hook into activatePage
  var _origReport = window._dashHeightHooked;
  if (!_origReport) {
    window._dashHeightHooked = true;
    document.addEventListener('click', function(e) {
      if (e.target.closest && e.target.closest('.tab')) {
        setTimeout(reportHeight, 400);
      }
    });
  }
})();
