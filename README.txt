# West Hollywood Dashboard — Stable Supabase Fix

Upload these files to the ROOT of the GitHub Pages repository.

Required replacements:
- index.html
- dashboard.js
- data-service.js
- supabase-config.js

Also included:
- styles.css (unchanged; included so the package is self-contained)

Important:
- This version queries Supabase REST directly. It does NOT require the Supabase JavaScript CDN.
- supabase-config.js already contains the public project URL and publishable key previously provided.
- Holloway rendering is guarded so it cannot crash the page before data loads.
- Tab navigation works independently of the data load.
- If one Supabase table fails, the remaining datasets can still load.
- The 2025 PIT monthly chart array indexing bug is fixed.
- Asset URLs use a new cache-busting version.

After uploading/overwriting all five files, commit the changes and hard-refresh the GitHub Pages site.
