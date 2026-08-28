# West Hollywood Homeless Initiative Dashboard — Supabase refactor

This is the current dashboard refactored from one large HTML file into a small static web app backed by Supabase.

## What changed

- `index.html` — page structure/content only.
- `styles.css` — all dashboard styling.
- `dashboard.js` — chart, map, filter, tooltip, accessibility, and UI behavior.
- `data-service.js` — the only place that knows how to read dashboard data from Supabase.
- `supabase-config.js` — your Supabase project URL + **publishable** browser key.
- `supabase/schema.sql` — tables + read-only Row Level Security policies.
- `supabase/seed.sql` — the current embedded dashboard data converted into rows.

The largest embedded datasets (PIT observations and HCL geocoded requests), the PIT count series, HCL monthly/outcome data, Holloway quarter data, annual housing/prevention series, and headline KPI values are no longer stored in `index.html`/`dashboard.js`.

## Setup — about 5 steps

1. Create a Supabase project.
2. In Supabase, open **SQL Editor** and run `supabase/schema.sql`.
3. Run `supabase/seed.sql` once to load the dashboard's current data.
4. In Supabase, open the project's **Connect / API Keys** area and copy the Project URL and **Publishable key**.
5. Open `supabase-config.js` and replace the two placeholders.

Then host these files together (GitHub Pages works fine).

## Security model

This dashboard is public, so the browser uses a Supabase **publishable** key. The SQL in `schema.sql` enables RLS, revokes browser writes, and gives anonymous/authenticated web visitors SELECT access only to rows where `is_public = true`.

Never put a Supabase secret key or service-role key in this repo or in browser JavaScript.

Important: PIT/HCL coordinate rows are already exposed to anyone who can view the current public dashboard source. This refactor preserves that exposure. If those rows should no longer be directly accessible, publish aggregated locations instead of raw points before launch.

## Updating data later

You no longer edit JavaScript arrays.

Examples:

- New HCL month: add one row to `dashboard_hcl_monthly`, its heat-point rows to `dashboard_hcl_heat_points`, and reason/outcome rows to `dashboard_hcl_reason_outcomes`.
- New PIT count: add the observation rows and the corresponding count row.
- Holloway quarter: add/update one row in `dashboard_holloway`.
- Annual housing/prevention chart: add/update rows in `dashboard_program_series`.
- A headline number such as total people housed: edit `dashboard_metrics`.
- Footer date: edit `dashboard_settings.last_updated_label`.

The HCL fiscal-year selector is now generated automatically from the months present in Supabase, so adding future months does not require editing a hard-coded FY list.

## GitHub structure

Upload the contents of this folder to the root of the repository:

```
index.html
styles.css
dashboard.js
data-service.js
supabase-config.js
supabase/
  schema.sql
  seed.sql
```

For GitHub Pages: **Settings → Pages → Deploy from a branch → main / root**.

## Supabase docs used for this implementation

- Browser install: https://supabase.com/docs/reference/javascript/installing
- Publishable keys: https://supabase.com/docs/guides/getting-started/api-keys
- RLS / grants: https://supabase.com/docs/guides/database/postgres/row-level-security

## What intentionally remains static

Explanatory copy, methodology language, labels, definitions, and most narrative notes remain in HTML/JS. That is intentional: they are presentation/content rather than record-level data. A later pass can move editorial copy into a CMS-style table if desired, but it is not necessary for routine data updates.
