# Dashboard Data Coding Reference

The Data Manager now contains the authoritative coding guide in `app.js` (`CODING_GUIDES`). Use the in-app **Coding guide** or **Download guided template** features for the easiest field-by-field reference.

Key rules:
- HCL reason indexes are fixed 0–6 and must not be reordered.
- HCL outcome arrays are `[Accepted services, Declined services, Unable to locate, Outcome pending / unknown]`.
- HCL time arrays are `[6–9 AM, 9 AM–12 PM, 12–3 PM, 3–6 PM, 6 PM+]`.
- HCL day arrays are Sunday through Saturday.
- Related HCL tables must use identical `period_label` values.
- Program series must use matching years/sort order across all three series.
- Current Holloway filter keys are `ytd`, `q1`, `q2`, and `q3`.
- `value_text` in dashboard metrics is display-ready text; include `%`, `$`, commas, or units as needed.
- Some public period labels and explanatory text remain static in `index.html`, so changing a reporting period may require a public-site copy update in addition to changing Supabase data.
