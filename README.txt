West Hollywood Dashboard — Keyless Map Fix

Replace these two files in the root of the GitHub Pages repository:
1. dashboard.js
2. index.html

Changes:
- Replaced both CARTO basemap tile layers with standard OpenStreetMap raster tiles.
- Removed the CARTO/API-key requirement.
- Preserved existing Leaflet maps, PIT markers, HCL heat layer, and City boundary overlay.
- Updated the OpenStreetMap attribution.
- Bumped the dashboard.js cache version in index.html.

No Supabase files or database changes are required.
