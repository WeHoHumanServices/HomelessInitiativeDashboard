# West Hollywood Dashboard Data Manager

A private browser-based admin tool for the Supabase-backed Homeless Initiative Dashboard.

## What it does
- Signs administrators in with Supabase Auth.
- Restricts writes to users explicitly listed in `dashboard_admins`.
- Supports CSV and Excel (`.xlsx` / `.xls`) uploads.
- Auto-maps source columns to the dashboard schema.
- Validates types, required fields, coordinates, months, and fixed-length HCL arrays.
- Previews data before any write.
- Supports append, upsert, and period-replacement workflows where appropriate.
- Includes manual entry for smaller tables such as metrics, settings, program series, and Holloway.
- Generates guided Excel templates with **Data Entry**, **Coding Guide**, and **Code Lists** sheets (CSV fallback if Excel support is unavailable).
- Records successful publishes in `dashboard_import_log`.

## Files
- `index.html` — app page.
- `styles.css` — interface styling.
- `app.js` — authentication, parsing, validation, preview, and Supabase writes.
- `config.js` — public Supabase project URL and publishable key only.
- `admin_setup.sql` — one-time write-security and audit-log setup.
- `templates/` — simple CSV examples retained as fallback/reference; the in-app **Download guided template** button is the preferred template source.

## One-time setup
1. In Supabase, go to **Authentication → Users** and create the administrator user. Use a strong password. Do not enable public signup just for this tool.
2. Open `admin_setup.sql`.
3. Replace `ADMIN_EMAIL_HERE` with the exact email address of that Auth user.
4. Run the entire SQL file in **Supabase → SQL Editor**.
5. Confirm the final verification query returns that user.
6. Upload this folder to a private/admin path on your static site, e.g. `/admin/`.
7. Open `admin/index.html`, sign in, and test with a small metric update first.

## Suggested GitHub layout
```
/index.html                 # public dashboard
/styles.css
/dashboard.js
/data-service.js
/supabase-config.js
/admin/
  index.html
  styles.css
  app.js
  config.js
```
`admin_setup.sql` does not need to be deployed publicly; keep it as a setup/reference file if preferred.

## Security model
The app never contains a Supabase secret/service-role key. It uses the public publishable key plus an authenticated user's access token. Postgres grants allow authenticated writes, while Row Level Security permits those writes only when `private.is_dashboard_admin()` confirms the signed-in user's `auth.uid()` exists in `dashboard_admins`.

The public dashboard's anonymous read policy remains unchanged.

## Write modes
- **Upsert:** safest for tables with unique/primary keys. Existing matching keys update; new keys insert.
- **Append:** always inserts new rows. Best when the source is truly additive.
- **Replace period:** used for PIT locations and HCL map points. Existing rows for the period labels in the uploaded file are backed up in memory, deleted, and replaced. If insertion fails, the app makes a best-effort restore of the backup.

## HCL array order
The Data Manager validates the number of values but does not reinterpret category order. Keep the same category ordering used by the dashboard when preparing `reasons`, `outcomes`, `time_bins`, and `day_of_week` arrays.

## Excel support
The page loads SheetJS 0.20.3 from the official SheetJS CDN for Excel parsing. CSV uploads work through the app's built-in parser. If your environment requires fully self-hosted dependencies, download `xlsx.full.min.js` from the SheetJS CDN and change the script tag in `index.html` to point to the local file.

## Recommended first test
Use **Settings** → Manual entry → `last_updated_label`, preview it, and publish an upsert. Then refresh the public dashboard and confirm the value changed before using bulk datasets.


## Guided templates and coding help

Version 2 adds dataset-specific coding guidance in two places:

1. Click **Coding guide** in the Data Manager to see field definitions, accepted codes, array ordering, examples, and notes about how each field is used by the public dashboard.
2. Click **Download guided template** to download an `.xlsx` workbook with three sheets:
   - **Data Entry** — upload-ready headers plus an example row. This is the first worksheet, so the completed workbook can be uploaded directly back into the Data Manager.
   - **Coding Guide** — field-by-field instructions and dashboard behavior.
   - **Code Lists** — category/index mappings such as HCL reason codes, outcome order, time bins, metric keys, and Holloway period keys.

Important dashboard-specific cautions are called out in the guide, including fields that update only a KPI while surrounding period text remains static in `index.html`.
