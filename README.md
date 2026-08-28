# West Hollywood Homeless Initiative Dashboard — Final Supabase Build

This is the final cleaned dashboard file set.

## Runtime files
Upload these five files to the ROOT of the GitHub Pages repository:

- `index.html`
- `styles.css`
- `dashboard.js`
- `data-service.js`
- `supabase-config.js`

`index.html` must remain at the repository root.

## Supabase files
The `supabase/` folder is for setup/reference and does not need to be served by GitHub Pages.

- `supabase/schema.sql` — creates the dashboard tables, grants, and public read policies.
- `supabase/seed.sql` — loads the baseline dashboard data.

Do not rerun `schema.sql` or `seed.sql` for routine data updates. Update the existing Supabase tables instead.

## Architecture
- GitHub Pages serves the static HTML/CSS/JavaScript.
- Supabase stores the dashboard data.
- `data-service.js` queries Supabase's REST API directly using the public publishable key.
- No Supabase JavaScript CDN/library is required.
- Leaflet remains the map library.
- Basemap tiles use OpenStreetMap and do not require a CARTO API key.

## Routine updates
Most future data changes should happen only in Supabase.

Key tables:
- `dashboard_pit_observations`
- `dashboard_pit_counts`
- `dashboard_hcl_monthly`
- `dashboard_hcl_heat_points`
- `dashboard_hcl_reason_outcomes`
- `dashboard_program_series`
- `dashboard_holloway`
- `dashboard_metrics`
- `dashboard_settings`

After editing rows in Supabase, refresh the public dashboard. GitHub files generally do not need to change for routine data updates.

## Security
`supabase-config.js` contains only the public Supabase project URL and publishable browser key.
Never place a Supabase secret key or service-role key in frontend code.

Public database access should remain read-only through the grants/RLS policies created by `schema.sql`.

## Maps
Both dashboard map views use CARTO raster basemaps with the project basemap API key.

Tile endpoint:
`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=...`

CARTO and OpenStreetMap attribution remain visible on the maps.

The CARTO basemap key is a browser-facing basemap key and is therefore present in `dashboard.js`. Do not place Supabase secret/service-role keys or other private credentials in frontend code.


## Deployment
1. Upload/replace the five runtime files in the GitHub repository root.
2. Commit changes.
3. GitHub Pages should deploy from the `main` branch and `/ (root)`.
4. Hard-refresh the live site after deployment if the browser has cached an older script.

## Final fixes included
- Supabase data moved out of the HTML file.
- Direct Supabase REST loading.
- Public navigation no longer depends on data-load completion.
- Holloway startup race condition guarded.
- Holloway rerenders after live data arrives.
- 2025 PIT monthly series indexing corrected.
- Partial-data loading supported if one dataset fails.
- CARTO Voyager basemap restored with API-key authentication.
- Cache-busting asset versions included.
