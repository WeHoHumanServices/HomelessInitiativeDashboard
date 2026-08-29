(() => {
'use strict';
const CFG = window.DATA_MANAGER_CONFIG || {};
const state = { session:null, datasetKey:null, mode:'upload', sourceRows:[], sourceHeaders:[], mapping:{}, prepared:[], validation:null, fileName:null };

const DATASETS = {
  pit_observations:{group:'Unsheltered counts',label:'PIT Locations',table:'dashboard_pit_observations',description:'Individual observed locations used by the PIT map. Best for CSV/Excel bulk uploads.',partitionField:'period_label',identity:'id',defaultMode:'replace',fields:[
    F('latitude','Latitude','number',true,['lat']),F('longitude','Longitude','number',true,['lng','lon','long']),F('people_count','People count','integer',true,['people','count','individuals']),F('location_label','Location label','string',false,['location','intersection','place']),F('period_label','Period label','string',true,['period','month','quarter']),F('observation_year','Observation year','integer',true,['year']),F('observation_month','Observation month','integer',true,['month number','month_num']),F('is_public','Public','boolean',false,['published'],true)
  ],example:{latitude:34.09075,longitude:-118.355484,people_count:1,location_label:'Curson and Santa Monica',period_label:'Aug 2026',observation_year:2026,observation_month:8,is_public:true}},
  pit_counts:{group:'Unsheltered counts',label:'PIT Counts',table:'dashboard_pit_counts',description:'Monthly, quarterly, and annual-average PIT count values.',conflict:['period_key'],defaultMode:'upsert',fields:[
    F('period_type','Period type','enum',true,[],null,['month','quarter','year_average']),F('period_key','Period key','string',true,['key']),F('period_label','Period label','string',true,['label']),F('value','Value','number',false,['count','average']),F('metadata','Metadata','json-object',false,[],{}),F('sort_order','Sort order','integer',true,['order']),F('is_public','Public','boolean',false,['published'],true)
  ],example:{period_type:'quarter',period_key:'2026-Q3',period_label:'Q3',value:61,metadata:'{"span":"Jul–Sep 2026","date":"Jul 23, 2026"}',sort_order:203,is_public:true}},
  hcl_monthly:{group:'Homeless Concern Line',label:'HCL Monthly',table:'dashboard_hcl_monthly',description:'Monthly Concern Line totals and chart arrays. Arrays may be JSON or comma-separated numbers.',conflict:['period_label'],defaultMode:'upsert',fields:[
    F('period_label','Period label','string',true,['month']),F('sort_order','Sort order','integer',true,['order']),F('total','Total requests','integer',true,['requests','total requests']),F('days','Days covered','integer',true,['days in period']),F('reasons','Reasons [7]','json-array',true,[],null,null,7),F('outcomes','Outcomes [4]','json-array',true,[],null,null,4),F('time_bins','Time bins [5]','json-array',true,['time bins'],null,null,5),F('day_of_week','Day of week [7]','json-array',true,['day of week','dow'],null,null,7),F('is_public','Public','boolean',false,['published'],true)
  ],example:{period_label:'Aug 2026',sort_order:14,total:250,days:31,reasons:'[120,35,40,30,10,10,5]',outcomes:'[120,45,35,50]',time_bins:'[55,60,70,60,5]',day_of_week:'[30,35,40,35,45,35,30]',is_public:true}},
  hcl_heat_points:{group:'Homeless Concern Line',label:'HCL Map Points',table:'dashboard_hcl_heat_points',description:'Geocoded Concern Line request points used by the heat map. Best for bulk upload.',partitionField:'period_label',identity:'id',defaultMode:'replace',fields:[
    F('latitude','Latitude','number',true,['lat']),F('longitude','Longitude','number',true,['lng','lon','long']),F('period_label','Period label','string',true,['month','period']),F('reason_index','Reason index','integer',true,['reason','reason code']),F('sort_order','Sort order','integer',false,['order']),F('is_public','Public','boolean',false,['published'],true)
  ],example:{latitude:34.0908,longitude:-118.3615,period_label:'Aug 2026',reason_index:0,sort_order:1,is_public:true}},
  hcl_reason_outcomes:{group:'Homeless Concern Line',label:'HCL Reason Outcomes',table:'dashboard_hcl_reason_outcomes',description:'Outcome arrays by month and reason category.',conflict:['period_label','reason_index'],defaultMode:'upsert',fields:[
    F('period_label','Period label','string',true,['month','period']),F('reason_index','Reason index','integer',true,['reason','reason code']),F('outcomes','Outcomes [4]','json-array',true,[],null,null,4),F('sort_order','Sort order','integer',false,['order']),F('is_public','Public','boolean',false,['published'],true)
  ],example:{period_label:'Aug 2026',reason_index:0,outcomes:'[70,20,15,15]',sort_order:1,is_public:true}},
  program_series:{group:'Housing & prevention',label:'Program Series',table:'dashboard_program_series',description:'Annual permanent housing, interim housing, and rental-assistance series.',conflict:['series_key','period_label'],defaultMode:'upsert',fields:[
    F('series_key','Series','enum',true,['series'],null,['permanent_housing','interim_housing','rental_households']),F('period_label','Period','string',true,['year']),F('value','Value','number',true,['count']),F('sort_order','Sort order','integer',true,['order']),F('is_public','Public','boolean',false,['published'],true)
  ],example:{series_key:'permanent_housing',period_label:'2026',value:30,sort_order:6,is_public:true}},
  holloway:{group:'Holloway',label:'Holloway Reporting',table:'dashboard_holloway',description:'Quarter/YTD Holloway summary cards. Manual entry expands the payload into easy fields.',conflict:['period_key'],defaultMode:'upsert',fields:[
    F('period_key','Period key','string',true,['quarter','key']),F('sort_order','Sort order','integer',true,['order']),F('payload','Payload','json-object',true),F('is_public','Public','boolean',false,['published'],true)
  ],payloadFields:['eyebrow','readout','servedLabel','served','servedSub','occ','occSub','occNarr','perm','permSub','part','partSub'],example:{period_key:'q3',sort_order:4,payload:'{"eyebrow":"Q3 · Apr–Jun 2026","readout":"Showing Q3 · Apr 1 – Jun 30, 2026","servedLabel":"Served during quarter","served":"30","servedSub":"Served during Q3 · 10 newly enrolled","occ":"94.5%","occSub":"1,720 of 1,820 bed nights · above target","occNarr":"In Q3, Holloway held occupancy at 94.5% (1,720 of 1,820 bed nights), staying above the 90% target.","perm":"5","permSub":"5 to permanent housing this quarter · 6 YTD","part":"87.0%","partSub":"26 of 30 served · goal 65%"}',is_public:true}},
  metrics:{group:'Headline metrics',label:'Dashboard Metrics',table:'dashboard_metrics',description:'Headline numbers displayed throughout the dashboard.',conflict:['metric_key'],defaultMode:'upsert',fields:[
    F('metric_key','Metric key','enum',true,['metric'],null,['people_housed_total','interim_placements_total','rental_households_total','outreach_people_of_color_pct','outreach_transgender_pct','outreach_age_50_plus_pct','hcl_median_response_time','shelter_bed_nights_year','rental_assistance_disbursed_total','rental_assistance_2026_disbursed','measure_a_households_served','measure_a_total_disbursed','measure_a_average_household']),F('value_text','Displayed value','string',true,['value']),F('is_public','Public','boolean',false,['published'],true)
  ],example:{metric_key:'people_housed_total',value_text:'440',is_public:true}},
  settings:{group:'Dashboard settings',label:'Settings',table:'dashboard_settings',description:'Small dashboard-level settings such as the public last-updated label.',conflict:['setting_key'],defaultMode:'upsert',fields:[
    F('setting_key','Setting key','enum',true,['setting'],null,['last_updated_label']),F('value_text','Value','string',true,['value']),F('is_public','Public','boolean',false,['published'],true)
  ],example:{setting_key:'last_updated_label',value_text:'August 28, 2026',is_public:true}}
};
function F(key,label,type,required=false,aliases=[],def=null,options=null,arrayLength=null){return {key,label,type,required,aliases,default:def,options,arrayLength};}
const CODING_GUIDES = {
  pit_observations:{
    use:'Feeds the dots on the Unsheltered Counts & Locations map. Each row is one observed location during one field-count period.',
    notes:[
      'Use one row per observed location. If three people are observed together at one location, enter one row with people_count = 3.',
      'period_label is the month/filter label shown on the map and should use the exact format “Mon YYYY” (for example, “Apr 2026”).',
      'observation_year and observation_month drive the year filter; period_label drives the month filter. Keep all three consistent.',
      'Set is_public = true for rows that should appear on the public dashboard.'
    ],
    fields:{
      latitude:['Decimal latitude of the observation location.','Positions the dot on the map.','34.09075'],
      longitude:['Decimal longitude. West Hollywood longitudes are negative.','Positions the dot on the map.','-118.355484'],
      people_count:['Whole number of people observed at that location during the count.','Controls dot size and tooltip count.','1'],
      location_label:['Human-readable intersection, block, or place description. Do not include private/client identifying information.','Shown in the map tooltip.','Curson and Santa Monica'],
      period_label:['Exact month label in “Mon YYYY” format.','Creates the map month filter and tooltip period.','Apr 2026'],
      observation_year:['Four-digit calendar year.','Creates the map year filter.','2026'],
      observation_month:['Calendar month as 1–12.','Used with observation_year for chronological filtering.','4'],
      is_public:['true = visible to the public dashboard; false = retained but hidden from public read access.','Controls public visibility through RLS.','true']
    },codes:[]
  },
  pit_counts:{
    use:'Feeds the PIT count bar chart and long-term trend line. The dashboard recognizes three different period types.',
    notes:[
      'Monthly chart rows are currently expected for Jan–Sep 2025 and must sort chronologically.',
      'Quarter rows use keys such as 2026-Q1. For 2026, the chart reads the quarter number from the key and the count month from metadata.date.',
      'year_average is the average number of individuals observed per count event for that year—not a sum.',
      'The public explanatory copy currently describes 2026 as a partial/provisional year. If the reporting cadence or year changes, review the public dashboard text as well as the data.'
    ],
    fields:{
      period_type:['Choose month, quarter, or year_average.','Determines which PIT visualization uses the row.','quarter'],
      period_key:['Unique machine key. Use YYYY-MM for month, YYYY-Q# for quarter, and YYYY for year_average.','Used to identify/update the row and to interpret year/quarter.','2026-Q3'],
      period_label:['Short display label. Months use Jan, Feb, etc.; quarters use Q1, Q2, etc.; annual averages use the year.','Displayed or used as chart labels.','Q3'],
      value:['Observed count or annual average. May be blank/null for a quarter not yet reported.','Chart value.','61'],
      metadata:['JSON object for supplemental display context. For quarters, include span and preferably date.','Quarter label uses metadata.date to show the count month.','{"span":"Jul–Sep 2026","date":"Jul 23, 2026"}'],
      sort_order:['Numeric chronological order. Existing convention: months 1–9, annual averages 101+, quarters 201+.','Controls the order returned to the charts.','203'],
      is_public:['true = visible on public dashboard.','Controls public visibility.','true']
    },
    codes:[{title:'period_type coding',headers:['Code','Meaning','period_key pattern','Example'],rows:[['month','One monthly field count','YYYY-MM','2025-08'],['quarter','One quarterly field count','YYYY-Q#','2026-Q3'],['year_average','Average count per event across the year','YYYY','2026']]}]
  },
  hcl_monthly:{
    use:'Feeds Homeless Concern Line totals, daily average, reasons, outcomes, time-of-day, day-of-week, month filters, and fiscal-year aggregation.',
    notes:[
      'Array order is fixed. Do not alphabetize or rearrange categories.',
      'period_label must match the same month label used in HCL Map Points and HCL Reason Outcomes (for example, “Aug 2026”).',
      'days is the number of reporting days represented. Use actual covered days for a partial month rather than automatically using the calendar month length.',
      'reasons and outcomes should normally each sum to total. The uploader warns when they do not.'
    ],
    fields:{
      period_label:['Month in “Mon YYYY” format.','Month filter and fiscal-year grouping.','Aug 2026'],
      sort_order:['Chronological sequence across all HCL months.','Controls loading/display order.','14'],
      total:['Total HCL requests represented for the month.','Total requests and daily average denominator.','250'],
      days:['Number of days included in the reporting period.','Daily average = total ÷ days.','31'],
      reasons:['Seven numeric counts in the exact reason order shown in the code list below.','Reason chart and reason filters.','[120,35,40,30,10,10,5]'],
      outcomes:['Four numeric counts in the exact outcome order shown below.','Outcome donut and services-accepted calculation.','[120,45,35,50]'],
      time_bins:['Five counts in fixed time-of-day order.','Time-of-day chart.','[55,60,70,60,5]'],
      day_of_week:['Seven counts in Sun→Sat order.','Day-of-week chart.','[30,35,40,35,45,35,30]'],
      is_public:['true = included in public dashboard.','Controls public visibility.','true']
    },
    codes:[
      {title:'reasons array — exact order',headers:['Index','Category'],rows:[[0,'Housing / resource / services request'],[1,'Outreach / engagement request'],[2,'Medical / mental health / substance use'],[3,'Welfare / wellness check'],[4,'Disturbance / safety concern'],[5,'Administrative / non-incident'],[6,'Other / multiple']]},
      {title:'outcomes array — exact order',headers:['Index','Category'],rows:[[0,'Accepted services'],[1,'Declined services'],[2,'Unable to locate'],[3,'Outcome pending / unknown']]},
      {title:'time_bins array — exact order',headers:['Index','Time bin'],rows:[[0,'6–9 AM'],[1,'9 AM–12 PM'],[2,'12–3 PM'],[3,'3–6 PM'],[4,'6 PM+']]},
      {title:'day_of_week array — exact order',headers:['Index','Day'],rows:[[0,'Sunday'],[1,'Monday'],[2,'Tuesday'],[3,'Wednesday'],[4,'Thursday'],[5,'Friday'],[6,'Saturday']]}
    ]
  },
  hcl_heat_points:{
    use:'Feeds the Homeless Concern Line heat map. Each row represents one geocoded request point with a reason code.',
    notes:[
      'Use one row per geocoded request—not one row per address with an aggregated count.',
      'period_label must exactly match HCL Monthly so month filters work across the page.',
      'reason_index uses the same 0–6 reason coding as the HCL reasons array.',
      'The public map automatically excludes points outside the dashboard’s West Hollywood/near-boundary display area.'
    ],
    fields:{
      latitude:['Decimal latitude for the geocoded request.','Heat-map location.','34.0908'],
      longitude:['Decimal longitude; West Hollywood longitudes are negative.','Heat-map location.','-118.3615'],
      period_label:['Month in “Mon YYYY” format and exact match to HCL Monthly.','Month filtering.','Aug 2026'],
      reason_index:['Whole number 0–6 using the reason code list below.','Reason filtering on the heat map.','0'],
      sort_order:['Optional stable row order. Usually sequential within an import.','Used when data loads; does not change map intensity.','1'],
      is_public:['true = available to the public heat map.','Controls public visibility.','true']
    },
    codes:[{title:'reason_index coding',headers:['Index','Dashboard category'],rows:[[0,'Housing / resource / services request'],[1,'Outreach / engagement request'],[2,'Medical / mental health / substance use'],[3,'Welfare / wellness check'],[4,'Disturbance / safety concern'],[5,'Administrative / non-incident'],[6,'Other / multiple']]}]
  },
  hcl_reason_outcomes:{
    use:'Provides the exact outcome mix for each HCL reason when a user filters the public dashboard by reason.',
    notes:[
      'Create one row for each month + reason_index combination for which exact reason-level outcomes are available.',
      'The outcomes array uses the same fixed four-category order as HCL Monthly.',
      'For internal consistency, the sum of outcomes should normally equal that reason’s count in the HCL Monthly reasons array for the same month.'
    ],
    fields:{
      period_label:['Month in “Mon YYYY” format; exact match to HCL Monthly.','Joins reason-level outcomes to the selected month.','Aug 2026'],
      reason_index:['Reason code 0–6.','Identifies which reason category the outcome array belongs to.','0'],
      outcomes:['Four counts ordered Accepted, Declined, Unable to locate, Pending/unknown.','Used when the reason filter is active.','[70,20,15,15]'],
      sort_order:['Stable order, usually chronological month sequence or import order.','Controls load order only.','1'],
      is_public:['true = available to public filtered calculations.','Controls public visibility.','true']
    },
    codes:[
      {title:'reason_index coding',headers:['Index','Reason'],rows:[[0,'Housing / resource / services request'],[1,'Outreach / engagement request'],[2,'Medical / mental health / substance use'],[3,'Welfare / wellness check'],[4,'Disturbance / safety concern'],[5,'Administrative / non-incident'],[6,'Other / multiple']]},
      {title:'outcomes array — exact order',headers:['Index','Outcome'],rows:[[0,'Accepted services'],[1,'Declined services'],[2,'Unable to locate'],[3,'Outcome pending / unknown']]}
    ]
  },
  program_series:{
    use:'Feeds the three annual bar charts: permanent housing placements, interim housing admissions, and City-funded rental-assistance households.',
    notes:[
      'Use the same set of period_label years and the same sort_order sequence across all three series so bars align correctly.',
      'The dashboard currently uses the permanent_housing rows to establish the shared year labels for all three charts.',
      'Current public copy describes 2026 as a partial year. Adding a new year will make a new bar, but the explanatory text/ARIA labels should also be reviewed.'
    ],
    fields:{
      series_key:['Choose one of the three exact series codes below.','Determines which public bar chart receives the value.','permanent_housing'],
      period_label:['Four-digit display year.','Shared x-axis year label.','2026'],
      value:['Numeric annual or year-to-date count for that series.','Bar height and tooltip.','25'],
      sort_order:['Chronological order; use the same number for the same year across all series.','Keeps all three chart arrays aligned.','6'],
      is_public:['true = visible on public chart.','Controls public visibility.','true']
    },
    codes:[{title:'series_key coding',headers:['Code','Public dashboard meaning'],rows:[['permanent_housing','People placed in permanent housing by year'],['interim_housing','Interim housing/shelter admissions by year'],['rental_households','Households served by the ongoing City-funded rental assistance program by year']]}]
  },
  holloway:{
    use:'Controls the four top Holloway metrics and the occupancy narrative when the user changes the quarter filter.',
    notes:[
      'The current public quarter selector supports ytd, q1, q2, and q3 for contract year 2025–26. Do not upload q4 expecting it to appear until the public selector is updated.',
      'This table does NOT control the detailed year-to-date sections farther down the Holloway panel (program flow, exits, length of stay, demographics, etc.); those remain static in index.html.',
      'Percentages and formatted counts are stored as display text inside payload (for example, “94.5%” or “1,720 of 1,820 bed nights”).'
    ],
    fields:{
      period_key:['Exact selector key: ytd, q1, q2, or q3 in the current build.','Links the payload to the public quarter dropdown.','q3'],
      sort_order:['Display/load order; current convention ytd=1, q1=2, q2=3, q3=4.','Keeps records predictable.','4'],
      payload:['JSON object containing all twelve display fields listed in the manual-entry form.','Supplies the dynamic Holloway KPI text and occupancy narrative.','See Data Entry example'],
      is_public:['true = available to the public dashboard.','Controls public visibility.','true']
    },
    codes:[
      {title:'period_key coding — current dashboard',headers:['Key','Displayed selection'],rows:[['ytd','Year to date'],['q1','Q1 · Oct–Dec 2025'],['q2','Q2 · Jan–Mar 2026'],['q3','Q3 · Apr–Jun 2026']]},
      {title:'payload fields',headers:['Field','Meaning'],rows:[['eyebrow','Small period label above the KPI'],['readout','Text beside the quarter filter'],['servedLabel','Label for the served KPI'],['served','Displayed served count'],['servedSub','Supporting served text'],['occ','Displayed occupancy percentage'],['occSub','Supporting occupancy text'],['occNarr','Occupancy narrative below the KPIs'],['perm','Displayed permanent-housing exit count'],['permSub','Supporting permanent-housing text'],['part','Displayed supportive-services participation percentage'],['partSub','Supporting participation text']]}
    ]
  },
  metrics:{
    use:'Feeds specific headline KPI values throughout the public dashboard. The metric_key must exactly match one of the supported keys.',
    notes:[
      'value_text is display-ready text. Include commas, %, $, M, or “min” exactly as you want the public dashboard to show it.',
      'These rows update KPI values only. Many surrounding period badges and explanatory sentences are static in index.html; if the reporting period or definition changes, update that public copy too.'
    ],
    fields:{
      metric_key:['Exact supported metric code from the list below.','Targets one or more public KPI elements.','people_housed_total'],
      value_text:['Display-ready value, including formatting.','Inserted verbatim into the KPI.','436'],
      is_public:['true = visible to public dashboard.','Controls public visibility.','true']
    },
    codes:[{title:'metric_key definitions',headers:['Metric key','What the current dashboard expects','Example format'],rows:[
      ['people_housed_total','Cumulative people permanently housed since 2016; includes current-year YTD.','436'],
      ['interim_placements_total','Cumulative interim shelter placements/admissions since 2017; includes current-year YTD.','872'],
      ['rental_households_total','Cumulative households supported by the ongoing City-funded rental assistance program since 2017; excludes Measure A.','1,912'],
      ['outreach_people_of_color_pct','Share of the 146 Ascencia clients served Oct 2024–Sep 2025 identified in the dashboard as people of color.','71%'],
      ['outreach_transgender_pct','Share of the same outreach cohort identified as transgender.','12%'],
      ['outreach_age_50_plus_pct','Share of the same outreach cohort age 50 or older.','38%'],
      ['hcl_median_response_time','Median Homeless Concern Line response time.','12 min'],
      ['shelter_bed_nights_year','Annual average shelter bed nights per year for 2021–2025.','11,231'],
      ['rental_assistance_disbursed_total','Cumulative City-funded rental assistance disbursed since 2018; excludes Measure A.','$2.79M'],
      ['rental_assistance_2026_disbursed','City-funded rental assistance disbursed in 2026 YTD through the date stated on the public page; excludes Measure A.','$186,857'],
      ['measure_a_households_served','Households served by the separate Measure A emergency rental assistance program for the period stated on the page.','10'],
      ['measure_a_total_disbursed','Total Measure A emergency rental assistance disbursed for the stated period.','$58,598'],
      ['measure_a_average_household','Average Measure A assistance per household for the stated period.','$5,860']
    ]}]
  },
  settings:{
    use:'Stores small dashboard-wide display settings.',
    notes:[
      'The current build supports last_updated_label.',
      'Use a reader-friendly date because value_text is displayed directly on the public dashboard.'
    ],
    fields:{
      setting_key:['Exact supported setting code.','Targets a dashboard-wide setting.','last_updated_label'],
      value_text:['Display-ready text.','Shown as the dashboard’s public last-updated date.','August 28, 2026'],
      is_public:['true = public dashboard can read the setting.','Controls public visibility.','true']
    },
    codes:[{title:'setting_key definitions',headers:['Setting key','Meaning','Example'],rows:[['last_updated_label','Public “last updated” label','August 28, 2026']]}]
  }
};

function guideFor(key){return CODING_GUIDES[key]||{use:'',notes:[],fields:{},codes:[]};}
function guideField(key,field){return guideFor(key).fields?.[field]||['','',''];}

const $=id=>document.getElementById(id);
function msg(id,text,type='info'){const el=$(id);el.textContent=text;el.className='message '+type;el.classList.remove('hidden');}
function hideMsg(id){$(id).classList.add('hidden');}
function busy(text){$('busy-text').textContent=text||'Working…';$('busy').classList.remove('hidden');}
function unbusy(){$('busy').classList.add('hidden');}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function normalize(s){return String(s??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'');}
function configOK(){return /^https:\/\/.+\.supabase\.co$/.test(CFG.supabaseUrl||'') && /^sb_publishable_/.test(CFG.supabasePublishableKey||'');}

async function rawFetch(url,opts={}){const r=await fetch(url,opts);let body=null;const txt=await r.text();if(txt){try{body=JSON.parse(txt)}catch{body=txt}}if(!r.ok){const detail=body?.message||body?.msg||body?.error_description||body?.hint||txt||r.statusText;const e=new Error(`${r.status} ${detail}`);e.status=r.status;e.body=body;throw e}return {body,headers:r.headers,status:r.status};}
async function authFetch(path,options={}){const headers={'apikey':CFG.supabasePublishableKey,'Content-Type':'application/json',...(options.headers||{})};return rawFetch(CFG.supabaseUrl+path,{...options,headers});}
async function refreshSession(){if(!state.session?.refresh_token) return false;try{const {body}=await authFetch('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:state.session.refresh_token})});setSession(body);return true}catch{return false}}
function setSession(s){state.session=s;if(s){s.expires_at_ms=Date.now()+(Number(s.expires_in||3600)*1000);sessionStorage.setItem('weho_dm_session',JSON.stringify(s))}else sessionStorage.removeItem('weho_dm_session')}
async function ensureSession(){if(!state.session) throw new Error('Not signed in.');if(state.session.expires_at_ms-Date.now()<60000){const ok=await refreshSession();if(!ok)throw new Error('Your session expired. Please sign in again.')}return state.session}
async function restFetch(table,query='',options={}){await ensureSession();const q=query?('?'+query):'';const headers={'apikey':CFG.supabasePublishableKey,'Authorization':'Bearer '+state.session.access_token,...(options.headers||{})};if(options.body!==undefined)headers['Content-Type']='application/json';return rawFetch(`${CFG.supabaseUrl}/rest/v1/${table}${q}`,{...options,headers});}

async function signIn(email,password){const {body}=await authFetch('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});setSession(body);return body;}
async function signOut(){try{if(state.session)await authFetch('/auth/v1/logout',{method:'POST',headers:{Authorization:'Bearer '+state.session.access_token}})}catch{}setSession(null);showLogin();}
async function checkAdmin(){await restFetch('dashboard_import_log','select=id&limit=1');return true;}

function showLogin(){$('login-view').classList.remove('hidden');$('app-view').classList.add('hidden');$('user-pill').classList.add('hidden');$('logout-btn').classList.add('hidden');$('dashboard-link').classList.add('hidden');}
function showApp(){hideMsg('login-message');$('login-view').classList.add('hidden');$('app-view').classList.remove('hidden');$('logout-btn').classList.remove('hidden');$('dashboard-link').classList.remove('hidden');$('dashboard-link').href=CFG.dashboardUrl||'../';const email=state.session?.user?.email||'Signed in';$('user-pill').textContent=email;$('user-pill').classList.remove('hidden');$('template-btn').title='Downloads an Excel workbook with Data Entry, Coding Guide, and Code Lists sheets';if(!state.datasetKey)selectDataset(Object.keys(DATASETS)[0]);}

function renderNav(){const nav=$('dataset-nav');nav.innerHTML='';Object.entries(DATASETS).forEach(([key,d])=>{const b=document.createElement('button');b.type='button';b.className='dataset-btn';b.dataset.key=key;b.innerHTML=`<span class="group">${esc(d.group)}</span>${esc(d.label)}`;b.addEventListener('click',()=>selectDataset(key));nav.appendChild(b)});}
function renderCodingGuide(){
  const d=DATASETS[state.datasetKey],g=guideFor(state.datasetKey);
  $('guide-use').textContent=g.use||d.description;
  $('guide-notes').innerHTML=(g.notes||[]).map((n,i)=>`<div class="guide-note ${/do not|current public|static|until/i.test(n)?'warn':''}">${esc(n)}</div>`).join('');
  const rows=d.fields.map(f=>{const x=guideField(state.datasetKey,f.key);const allowed=f.options?.length?f.options.join(' · '):(f.type==='boolean'?'true · false':'');return `<tr><td>${esc(f.key)}</td><td>${f.required?'Yes':'No'}</td><td>${esc(x[0]||fieldHint(f))}</td><td>${esc(x[1]||'')}</td><td>${esc(allowed)}</td><td>${esc(x[2]??d.example[f.key]??'')}</td></tr>`}).join('');
  $('guide-table').className='guide-table';
  $('guide-table').innerHTML='<thead><tr><th>Field</th><th>Required</th><th>What to enter</th><th>How dashboard uses it</th><th>Allowed values</th><th>Example</th></tr></thead><tbody>'+rows+'</tbody>';
  $('guide-codes').innerHTML=(g.codes||[]).map(c=>`<div class="code-card"><h4>${esc(c.title)}</h4><div class="table-wrap" style="margin:0;border:0;border-radius:0;max-height:none"><table><thead><tr>${c.headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${c.rows.map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`).join('');
}
function toggleCodingGuide(force){const el=$('guide-section');const show=force===undefined?el.classList.contains('hidden'):!!force;el.classList.toggle('hidden',!show);if(show)renderCodingGuide();}

function selectDataset(key){state.datasetKey=key;state.sourceRows=[];state.prepared=[];state.validation=null;state.fileName=null;document.querySelectorAll('.dataset-btn').forEach(b=>b.classList.toggle('active',b.dataset.key===key));const d=DATASETS[key];$('dataset-group').textContent=d.group;$('dataset-title').textContent=d.label;$('dataset-desc').textContent=d.description;$('mapping-section').classList.add('hidden');$('file-meta').classList.add('hidden');$('preview-section').classList.add('hidden');$('current-section').classList.add('hidden');$('history-section').classList.add('hidden');$('file-input').value='';renderManualForm();renderWriteModes();if(!$('guide-section').classList.contains('hidden'))renderCodingGuide();}

function setMode(mode){state.mode=mode;document.querySelectorAll('.mode-tab').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));$('upload-panel').classList.toggle('hidden',mode!=='upload');$('manual-panel').classList.toggle('hidden',mode!=='manual');$('preview-section').classList.add('hidden');}

function renderManualForm(){const d=DATASETS[state.datasetKey],form=$('manual-form');form.innerHTML='';if(d.payloadFields){d.fields.filter(f=>f.key!=='payload').forEach(f=>form.appendChild(makeInput(f,d.example[f.key])));d.payloadFields.forEach(k=>form.appendChild(makeInput({key:'payload.'+k,label:friendly(k),type:'string',required:true},safePayloadExample(d.example.payload,k))));return;}d.fields.forEach(f=>form.appendChild(makeInput(f,d.example[f.key])));}
function safePayloadExample(payload,k){try{return JSON.parse(payload)[k]??''}catch{return ''}}
function friendly(k){return k.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase())}
function makeInput(f,example){const wrap=document.createElement('label');wrap.dataset.field=f.key;if(f.type.startsWith('json'))wrap.classList.add('wide');wrap.innerHTML=`${esc(f.label)}${f.required?' <span style="color:#b42318">*</span>':''}<span class="field-help">${esc(fieldHint(f))}</span>`;let el;if(f.type==='enum'){el=document.createElement('select');el.innerHTML='<option value="">Choose…</option>'+f.options.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('');if(example!==undefined&&example!==null)el.value=String(example)}else if(f.type.startsWith('json')){el=document.createElement('textarea');el.value=typeof example==='string'?example:JSON.stringify(example??(f.type==='json-array'?[]:{}))}else if(f.type==='boolean'){el=document.createElement('select');el.innerHTML='<option value="true">true</option><option value="false">false</option>';el.value=String(example??true)}else{el=document.createElement('input');el.type=(f.type==='number'||f.type==='integer')?'number':'text';if(f.type==='number')el.step='any';el.value=example??''}el.name=f.key;wrap.appendChild(el);return wrap;}
function fieldHint(f){const g=guideField(state.datasetKey,f.key);if(g[0])return g[0];if(f.type==='json-array')return f.arrayLength?`JSON or comma-separated · ${f.arrayLength} values`:'JSON or comma-separated';if(f.type==='json-object')return 'JSON object';if(f.default!==null&&f.default!==undefined)return `Default: ${typeof f.default==='object'?JSON.stringify(f.default):f.default}`;return f.type;}

function renderWriteModes(){const d=DATASETS[state.datasetKey],sel=$('write-mode');const opts=[];if(d.conflict)opts.push(['upsert','Update matching rows / add new']);opts.push(['append','Append new rows']);if(d.partitionField)opts.push(['replace','Replace matching '+d.partitionField]);sel.innerHTML=opts.map(([v,l])=>`<option value="${v}">${esc(l)}</option>`).join('');sel.value=d.defaultMode||opts[0][0];updatePublishHelp();}
function updatePublishHelp(){const d=DATASETS[state.datasetKey],m=$('write-mode').value;let t='';if(m==='upsert')t=`Rows matching ${d.conflict.join(' + ')} are updated; new keys are inserted.`;else if(m==='replace')t=`Existing rows for every ${d.partitionField} present in this preview are deleted, then replaced by the preview rows. A best-effort backup is restored if insertion fails.`;else t='Rows are inserted as new records. Use carefully on tables without unique keys.';$('publish-help').textContent=t;}

function parseCSV(text){const rows=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(q){if(c==='"'&&n==='"'){cell+='"';i++}else if(c==='"')q=false;else cell+=c}else{if(c==='"')q=true;else if(c===','){row.push(cell);cell=''}else if(c==='\n'){row.push(cell);rows.push(row);row=[];cell=''}else if(c!=='\r')cell+=c}}row.push(cell);if(row.some(x=>x!==''))rows.push(row);if(!rows.length)return[];const headers=rows[0].map(h=>String(h).trim());return rows.slice(1).filter(r=>r.some(x=>String(x).trim()!=='')).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));}
async function parseFile(file){const ext=(file.name.split('.').pop()||'').toLowerCase();if(ext==='csv'){return parseCSV(await file.text())}if(!window.XLSX)throw new Error('Excel support did not load. Save the file as CSV or check internet access to cdn.sheetjs.com.');const buf=await file.arrayBuffer();const wb=XLSX.read(buf,{type:'array',cellDates:false});const ws=wb.Sheets[wb.SheetNames[0]];return XLSX.utils.sheet_to_json(ws,{defval:'',raw:false});}
function autoMap(headers,fields){const byNorm=new Map(headers.map(h=>[normalize(h),h]));const m={};fields.forEach(f=>{const names=[f.key,f.label,...(f.aliases||[])].map(normalize);m[f.key]=names.map(n=>byNorm.get(n)).find(Boolean)||''});return m;}
function renderMapping(){const d=DATASETS[state.datasetKey];state.sourceHeaders=state.sourceRows.length?Object.keys(state.sourceRows[0]):[];state.mapping=autoMap(state.sourceHeaders,d.fields);const grid=$('mapping-grid');grid.innerHTML='';d.fields.forEach(f=>{const div=document.createElement('div');div.className='mapping-item';const opts=['<option value="">— default / blank —</option>',...state.sourceHeaders.map(h=>`<option value="${esc(h)}" ${state.mapping[f.key]===h?'selected':''}>${esc(h)}</option>`)].join('');div.innerHTML=`<label>${esc(f.label)}${f.required?' <span class="required">*</span>':''}<span class="field-help">${esc(fieldHint(f))}</span><select data-target="${esc(f.key)}">${opts}</select></label>`;div.querySelector('select').addEventListener('change',e=>state.mapping[f.key]=e.target.value);grid.appendChild(div)});$('mapping-status').textContent=`${state.sourceHeaders.length} source columns`;$('mapping-status').className='status-chip neutral';$('mapping-section').classList.remove('hidden');}

function coerce(raw,f,rowIndex){let v=raw;if((v===undefined||v===null||String(v).trim()==='') && f.default!==null&&f.default!==undefined)v=typeof f.default==='object'?structuredClone(f.default):f.default;if(v===undefined||v===null||String(v).trim()===''){if(f.required)throw new Error(`${f.label} is required`);return null}if(f.type==='string')return String(v).trim();if(f.type==='enum'){const x=String(v).trim();if(f.options?.length&&!f.options.includes(x))throw new Error(`${f.label} must be one of: ${f.options.join(', ')}`);return x;}if(f.type==='number'){const n=Number(String(v).replace(/,/g,''));if(!Number.isFinite(n))throw new Error(`${f.label} must be a number`);return n}if(f.type==='integer'){const n=Number(String(v).replace(/,/g,''));if(!Number.isInteger(n))throw new Error(`${f.label} must be a whole number`);return n}if(f.type==='boolean'){if(typeof v==='boolean')return v;const s=String(v).trim().toLowerCase();if(['true','1','yes','y'].includes(s))return true;if(['false','0','no','n'].includes(s))return false;throw new Error(`${f.label} must be true/false`)}if(f.type==='json-array'){let a;if(Array.isArray(v))a=v;else{const s=String(v).trim();try{a=JSON.parse(s)}catch{a=s.split(/[|,;]/).map(x=>x.trim()).filter(Boolean).map(Number)}}if(!Array.isArray(a)||a.some(x=>!Number.isFinite(Number(x))))throw new Error(`${f.label} must be a numeric array`);a=a.map(Number);if(f.arrayLength&&a.length!==f.arrayLength)throw new Error(`${f.label} must contain ${f.arrayLength} values`);return a}if(f.type==='json-object'){if(typeof v==='object'&&!Array.isArray(v))return v;try{const o=JSON.parse(String(v));if(!o||Array.isArray(o)||typeof o!=='object')throw 0;return o}catch{throw new Error(`${f.label} must be valid JSON object`)}}return v;}
function rowChecks(obj,d){const e=[],w=[];if('latitude'in obj&&(obj.latitude<-90||obj.latitude>90))e.push('Latitude outside -90 to 90');if('longitude'in obj&&(obj.longitude<-180||obj.longitude>180))e.push('Longitude outside -180 to 180');if('observation_month'in obj&&(obj.observation_month<1||obj.observation_month>12))e.push('Observation month must be 1–12');if('people_count'in obj&&obj.people_count<0)e.push('People count cannot be negative');if(d===DATASETS.hcl_monthly){for(const k of ['reasons','outcomes'])if(Array.isArray(obj[k])){const s=obj[k].reduce((a,b)=>a+Number(b||0),0);if(Number(obj.total)!==s)w.push(`${k} sum (${s}) does not equal total (${obj.total})`)}}if((d===DATASETS.hcl_heat_points||d===DATASETS.hcl_reason_outcomes)&&(obj.reason_index<0||obj.reason_index>6))e.push('Reason index must be 0–6');if(d===DATASETS.holloway&&!['ytd','q1','q2','q3'].includes(obj.period_key))e.push('Current dashboard period_key must be ytd, q1, q2, or q3');if(d===DATASETS.pit_counts){if(obj.period_type==='month'&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(obj.period_key))e.push('Monthly period_key must use YYYY-MM');if(obj.period_type==='quarter'&&!/^\d{4}-Q[1-4]$/.test(obj.period_key))e.push('Quarter period_key must use YYYY-Q#');if(obj.period_type==='year_average'&&!/^\d{4}$/.test(obj.period_key))e.push('Year-average period_key must be YYYY');}return {e,w};}
function prepareFromUpload(){const d=DATASETS[state.datasetKey],out=[],errors=[],warnings=[];state.sourceRows.forEach((src,i)=>{const o={};let ok=true;d.fields.forEach(f=>{try{o[f.key]=coerce(state.mapping[f.key]?src[state.mapping[f.key]]:undefined,f,i)}catch(err){errors.push(`Row ${i+2}: ${err.message}`);ok=false}});if(o.sort_order==null&&d.fields.some(f=>f.key==='sort_order'))o.sort_order=i+1;const c=rowChecks(o,d);c.e.forEach(x=>{errors.push(`Row ${i+2}: ${x}`);ok=false});c.w.forEach(x=>warnings.push(`Row ${i+2}: ${x}`));out.push({...o,__valid:ok})});return finalizeValidation(out,errors,warnings);}
function prepareManual(){const d=DATASETS[state.datasetKey],o={},errors=[],warnings=[];if(d.payloadFields){const payload={};d.fields.filter(f=>f.key!=='payload').forEach(f=>{const el=document.querySelector(`[name="${CSS.escape(f.key)}"]`);try{o[f.key]=coerce(el?.value,f,1)}catch(err){errors.push(err.message)}});d.payloadFields.forEach(k=>{payload[k]=document.querySelector(`[name="payload.${CSS.escape(k)}"]`)?.value??'';if(!String(payload[k]).trim())errors.push(`${friendly(k)} is required`)});o.payload=payload;}else d.fields.forEach(f=>{const el=document.querySelector(`[name="${CSS.escape(f.key)}"]`);try{o[f.key]=coerce(el?.value,f,1)}catch(err){errors.push(err.message)}});const c=rowChecks(o,d);errors.push(...c.e);warnings.push(...c.w);return finalizeValidation([{...o,__valid:errors.length===0}],errors,warnings);}
function finalizeValidation(rows,errors,warnings){state.prepared=rows;state.validation={errors,warnings,valid:rows.filter(r=>r.__valid).length,total:rows.length};renderPreview();return state.validation;}
function cleanRow(r,d){const o={};d.fields.forEach(f=>{if(r[f.key]!==undefined)o[f.key]=r[f.key]});return o;}

function renderPreview(){const d=DATASETS[state.datasetKey],v=state.validation;$('preview-section').classList.remove('hidden');$('preview-summary').textContent=`${v.total} row${v.total===1?'':'s'} prepared · ${v.valid} valid`;$('validation-badges').innerHTML=`<span class="badge ${v.errors.length?'bad':'good'}">${v.errors.length} errors</span><span class="badge ${v.warnings.length?'warn':'neutral'}">${v.warnings.length} warnings</span>`;const list=$('validation-list');list.innerHTML='';[...v.errors.slice(0,12).map(x=>['error',x]),...v.warnings.slice(0,8).map(x=>['warning',x])].forEach(([c,t])=>{const el=document.createElement('div');el.className='validation-item '+c;el.textContent=t;list.appendChild(el)});if(v.errors.length>12||v.warnings.length>8){const el=document.createElement('div');el.className='validation-item warning';el.textContent='Additional issues are not shown here. Correct the source file and validate again.';list.appendChild(el)};renderTable($('preview-table'),state.prepared.slice(0,50),d.fields.map(f=>f.key),true);$('publish-btn').disabled=v.errors.length>0||v.total===0;updatePublishHelp();}
function renderTable(table,rows,cols,markInvalid=false){if(!rows.length){table.innerHTML='<tbody><tr><td>No rows</td></tr></tbody>';return}table.innerHTML='<thead><tr>'+cols.map(c=>`<th>${esc(c)}</th>`).join('')+'</tr></thead><tbody>'+rows.map(r=>`<tr class="${markInvalid&&r.__valid===false?'invalid':''}">${cols.map(c=>`<td>${esc(typeof r[c]==='object'?JSON.stringify(r[c]):r[c])}</td>`).join('')}</tr>`).join('')+'</tbody>';}

function csvValue(v){if(typeof v==='object')v=JSON.stringify(v);const s=String(v??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function downloadTemplate(){
  const d=DATASETS[state.datasetKey],g=guideFor(state.datasetKey),heads=d.fields.map(f=>f.key),example=heads.map(k=>d.example[k]??'');
  if(!window.XLSX){const row=example.map(csvValue);downloadText(`${state.datasetKey}_template.csv`,heads.join(',')+'\n'+row.join(',')+'\n','text/csv');msg('global-message','Excel template support did not load, so a basic CSV template was downloaded instead.','info');return;}
  const wb=XLSX.utils.book_new();
  const wsData=XLSX.utils.aoa_to_sheet([heads,example]);
  wsData['!cols']=heads.map((h,i)=>({wch:Math.min(34,Math.max(14,String(h).length+3,String(example[i]??'').length+2))}));
  wsData['!autofilter']={ref:`A1:${XLSX.utils.encode_col(heads.length-1)}2`};
  XLSX.utils.book_append_sheet(wb,wsData,'Data Entry');

  const guideRows=[
    ['DATASET',d.label],
    ['TABLE',d.table],
    ['PURPOSE',g.use||d.description],
    ['DEFAULT PUBLISH MODE',d.defaultMode||''],
    [],
    ['IMPORTANT NOTES'],
    ...(g.notes||[]).map(n=>['',n]),
    [],
    ['FIELD','REQUIRED','WHAT TO ENTER','HOW THE DASHBOARD USES IT','ALLOWED VALUES','EXAMPLE'],
    ...d.fields.map(f=>{const x=guideField(state.datasetKey,f.key);const allowed=f.options?.length?f.options.join(' | '):(f.type==='boolean'?'true | false':'');return [f.key,f.required?'Yes':'No',x[0]||fieldHint(f),x[1]||'',allowed,x[2]??d.example[f.key]??'']})
  ];
  const wsGuide=XLSX.utils.aoa_to_sheet(guideRows);
  wsGuide['!cols']=[{wch:25},{wch:14},{wch:48},{wch:48},{wch:34},{wch:40}];
  XLSX.utils.book_append_sheet(wb,wsGuide,'Coding Guide');

  const codeRows=[];
  (g.codes||[]).forEach((c,idx)=>{if(idx)codeRows.push([]);codeRows.push([c.title.toUpperCase()]);codeRows.push(c.headers);c.rows.forEach(r=>codeRows.push(r));});
  if(!codeRows.length)codeRows.push(['No separate code list is required for this dataset.']);
  const wsCodes=XLSX.utils.aoa_to_sheet(codeRows);
  wsCodes['!cols']=[{wch:34},{wch:58},{wch:34},{wch:30}];
  XLSX.utils.book_append_sheet(wb,wsCodes,'Code Lists');

  wb.Props={Title:`${d.label} guided upload template`,Subject:'West Hollywood Homeless Initiative Dashboard Data Manager',Author:'City of West Hollywood'};
  XLSX.writeFile(wb,`${state.datasetKey}_guided_template.xlsx`);
}
function downloadText(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},100);}

async function publish(){const d=DATASETS[state.datasetKey],mode=$('write-mode').value,rows=state.prepared.filter(r=>r.__valid).map(r=>cleanRow(r,d));if(!rows.length)return;if(state.validation?.errors?.length)return;let detail='';if(mode==='replace'){const vals=[...new Set(rows.map(r=>r[d.partitionField]))];detail=` This will replace ${d.partitionField}: ${vals.join(', ')}.`}if(!confirm(`Publish ${rows.length} row(s) to ${d.label}?${detail}`))return;busy('Publishing data…');try{let affected=0;if(mode==='upsert'){affected=await insertChunks(d,rows,true)}else if(mode==='append'){affected=await insertChunks(d,rows,false)}else if(mode==='replace'){affected=await replacePartitions(d,rows)}await logImport(d,mode,affected);msg('global-message',`Published ${affected} row${affected===1?'':'s'} to ${d.label}. Refresh the public dashboard to see the change.`,'success');$('preview-section').classList.add('hidden');if(state.mode==='manual')renderManualForm();else clearFile();}catch(err){msg('global-message','Publish failed: '+err.message,'error')}finally{unbusy();}}
async function insertChunks(d,rows,upsert){let count=0;for(let i=0;i<rows.length;i+=500){const chunk=rows.slice(i,i+500),q=upsert&&d.conflict?'on_conflict='+encodeURIComponent(d.conflict.join(',')):'';const prefer=upsert?'resolution=merge-duplicates,return=representation':'return=representation';const {body}=await restFetch(d.table,q,{method:'POST',headers:{Prefer:prefer},body:JSON.stringify(chunk)});count+=Array.isArray(body)?body.length:chunk.length}return count;}
async function selectPartition(d,val){const q=`select=*&${encodeURIComponent(d.partitionField)}=eq.${encodeURIComponent(val)}`;const {body}=await restFetch(d.table,q);return Array.isArray(body)?body:[];}
async function deletePartition(d,val){const q=`${encodeURIComponent(d.partitionField)}=eq.${encodeURIComponent(val)}`;const {body}=await restFetch(d.table,q,{method:'DELETE',headers:{Prefer:'return=representation'}});return Array.isArray(body)?body.length:0;}
function stripIdentity(rows,d){return rows.map(r=>{const o={...r};if(d.identity)delete o[d.identity];return o});}
async function replacePartitions(d,rows){const vals=[...new Set(rows.map(r=>r[d.partitionField]))],backups=[];for(const v of vals)backups.push(...await selectPartition(d,v));try{for(const v of vals)await deletePartition(d,v);return await insertChunks(d,rows,false)}catch(err){try{for(const v of vals)await deletePartition(d,v);if(backups.length)await insertChunks(d,stripIdentity(backups,d),false)}catch{}throw new Error(err.message+' Previous rows were backed up and a restore was attempted.');}}
async function logImport(d,action,count){try{await restFetch('dashboard_import_log','',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify([{user_email:state.session?.user?.email||null,table_name:d.table,action,row_count:count,file_name:state.fileName,note:$('import-note').value.trim()||null,details:{dataset:state.datasetKey}}])})}catch(e){console.warn('Import log failed',e)}}

async function loadCurrent(){const d=DATASETS[state.datasetKey];busy('Loading current rows…');try{const order=d.fields.some(f=>f.key==='sort_order')?'&order=sort_order.asc':'';const {body}=await restFetch(d.table,`select=*&limit=200${order}`);$('current-summary').textContent=`Showing up to 200 current rows from ${d.table}.`;$('current-section').classList.remove('hidden');$('history-section').classList.add('hidden');const cols=body.length?Object.keys(body[0]).filter(k=>k!=='id'):d.fields.map(f=>f.key);renderTable($('current-table'),body,cols)}catch(err){msg('global-message','Could not load current rows: '+err.message,'error')}finally{unbusy();}}
async function loadHistory(){busy('Loading import history…');try{const {body}=await restFetch('dashboard_import_log','select=created_at,user_email,table_name,action,row_count,file_name,note&order=created_at.desc&limit=100');$('history-section').classList.remove('hidden');$('current-section').classList.add('hidden');renderTable($('history-table'),body,['created_at','user_email','table_name','action','row_count','file_name','note'])}catch(err){msg('global-message','Could not load import history: '+err.message,'error')}finally{unbusy();}}

function clearFile(){state.sourceRows=[];state.prepared=[];state.validation=null;state.fileName=null;$('file-input').value='';$('file-meta').classList.add('hidden');$('mapping-section').classList.add('hidden');$('preview-section').classList.add('hidden');}
async function handleFile(file){if(!file)return;hideMsg('global-message');busy('Reading file…');try{const rows=await parseFile(file);if(!rows.length)throw new Error('No data rows were found in the first worksheet.');state.sourceRows=rows;state.fileName=file.name;$('file-meta').textContent=`${file.name} · ${rows.length} data rows`;$('file-meta').classList.remove('hidden');renderMapping()}catch(err){msg('global-message','Could not read file: '+err.message,'error')}finally{unbusy();}}

function bind(){renderNav();$('login-form').addEventListener('submit',async e=>{e.preventDefault();hideMsg('login-message');busy('Signing in…');try{await signIn($('email').value.trim(),$('password').value);await checkAdmin();showApp()}catch(err){if(state.session&&err.status===403){msg('login-message','Sign-in succeeded, but this account is not authorized as a dashboard administrator. Run admin_setup.sql and add this email to dashboard_admins.','error')}else msg('login-message','Sign-in failed: '+err.message,'error')}finally{unbusy()}});$('logout-btn').addEventListener('click',signOut);document.querySelectorAll('.mode-tab').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));const dz=$('drop-zone'),fi=$('file-input');dz.addEventListener('click',()=>fi.click());dz.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fi.click()}});['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag')}));['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('drag')}));dz.addEventListener('drop',e=>handleFile(e.dataTransfer.files?.[0]));fi.addEventListener('change',()=>handleFile(fi.files?.[0]));$('validate-btn').addEventListener('click',prepareFromUpload);$('clear-file-btn').addEventListener('click',clearFile);$('manual-preview-btn').addEventListener('click',prepareManual);$('manual-reset-btn').addEventListener('click',renderManualForm);$('guide-btn').addEventListener('click',()=>toggleCodingGuide());$('close-guide').addEventListener('click',()=>toggleCodingGuide(false));$('template-btn').addEventListener('click',downloadTemplate);$('write-mode').addEventListener('change',updatePublishHelp);$('publish-btn').addEventListener('click',publish);$('current-btn').addEventListener('click',loadCurrent);$('close-current').addEventListener('click',()=>$('current-section').classList.add('hidden'));$('history-btn').addEventListener('click',loadHistory);$('close-history').addEventListener('click',()=>$('history-section').classList.add('hidden'));}

async function init(){if(!configOK()){showLogin();msg('login-message','Configuration is missing or invalid. Check config.js.','error');return}bind();try{const saved=sessionStorage.getItem('weho_dm_session');if(saved){state.session=JSON.parse(saved);await ensureSession();await checkAdmin();showApp()}else showLogin()}catch{setSession(null);showLogin()}}
init();
})();
