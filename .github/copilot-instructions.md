## Repository overview (big picture)

- This is a small static frontend app that visualizes two CSV data sources as a D3-based node graph.
- Key files:
  - `index.html` — page shell; loads `main.css`, D3 via CDN, and `main.js`.
  - `main.js` — application logic: CSV fetching/parsing, caching, layout (phyllotaxis), and D3 drawing.
  - `main.css` — styling for UI chrome and the node info card (`#node-card`).
  - `assets/` — SVG and image assets referenced by node data (e.g. `black ant large-01.svg`, `noise.png`).

Why this structure: there is no build system found in the repo (no `package.json`), so the app is meant to run as a static site served from the project root and relies on CDN-hosted D3 and Google-spreadsheet CSV exports.

## What an AI agent should know first

- The main data flow lives in `main.js`:
  - `fetchData()` → uses `CURATED_CSV_URL` and `USER_CSV_URL` (Google Sheets CSV) and caches results in `localStorage` under `CACHE_KEY` for `CACHE_TTL` (5 minutes by default).
  - `parseCSV()` / `parseCSVLine()` — project has its own lightweight CSV parser. Avoid replacing it unless you update usages everywhere.
  - `buildGraphData(curated, userContributions, viewW, viewH)` — converts rows into `nodes` and `links` using a phyllotaxis layout for curated nodes and fan layout for user nodes.
  - `drawGraph({nodes, links})` — draws SVG with D3, creates two groups: `.curated-node` and `.user-node`, appends `image`, `text`, and wires up interactions.

Example symbols to reference in edits: `CURATED_CSV_URL`, `USER_CSV_URL`, `CACHE_KEY`, `CATEGORY_SVGS`, `USER_NODE_SVGS`, `CATEGORY_COLORS`, `createCard()`, `showCard()`, `buildGraphData()`, `drawGraph()`.

## Project-specific conventions & patterns

- No JS bundler: keep edits compatible with direct browser `<script src="main.js">` usage. Use ES modules only if you also update `index.html` and the serving approach.
- Assets are referenced with relative paths (e.g. `assets/black ant large-01.svg` and `noise.png` in `main.css`) — changes to filenames must match both `assets/` and code references.
- UI IDs/classes used by JS:
  - `#graph` — container for the SVG (size driven by CSS `#graph`).
  - `#node-card` and children `#card-title`, `#card-subheader`, `#card-contribution`, `#card-category` — populated by `showCard()`.
  - `.about-btn`, `.about-sidebar`, `.close-btn` — sidebar open/close logic.

## Debugging and local dev workflow (concrete)

- There is no build step. To run locally, serve the project root (so relative asset fetches and CSV fetches behave correctly). Example approaches (run in project folder):

```bash
# Python 3 simple server
python -m http.server 8000

# or with node (if you prefer):
npx serve .
```

- Requirements/implications:
  - The page loads D3 from CDN (`https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js`) and fetches Google Sheets CSVs — an internet connection is required for full functionality.
  - If debugging data fetch issues, check the console for the message `Error loading data:` and verify the CSV URLs in `main.js`.

## Safe edit rules for agents

- Don't introduce module bundling or transpilation without updating `index.html` and adding a `package.json` and instructions — this repo intentionally remains a simple static site.
- When updating asset filenames, update both `main.js` (CATEGORY_SVGS / USER_NODE_SVGS) and `main.css` (images referenced there).
- Preserve the existing CSV parsing and caching logic unless you provide complete, tested replacements (must preserve `localStorage` cache TTL semantics and fallback behavior when localStorage write/read fails).

## Small examples & pointers

- To change data sources: edit `CURATED_CSV_URL` and/or `USER_CSV_URL` in `main.js` then reload. The app caches results; clear localStorage (`localStorage.removeItem('femme_data_cache')`) or wait `CACHE_TTL`.
- Node card is created by `createCard()` and toggled with `#node-card.visible` (see `main.css` for animation). If you add or rename card elements, update `createCard()` and `showCard()` accordingly.
- Hover effects: curated node hover reveals dashed links and applies CSS filter to images (handled in `drawGraph()` event handlers). If you change the hover color behavior, update both `CATEGORY_COLORS` and the hover handler in `drawGraph()`.

## When merging with an existing `.github/copilot-instructions.md`

- Preserve any human-authored sections; only append or update the technical snippets above when the repo has changed.
- If an existing file contains project-specific rules, merge them and avoid removing explicit developer notes.

## Follow-up / questions for the repo owner

1. Are the Google Sheets (CSV URLs) expected to remain public? If not, document how to provide an alternative local fixture for offline testing.
2. Would you like a small `package.json` + `serve` script added for convenience, or keep the repo intentionally buildless?

---
If anything above is unclear or you'd like me to add examples (e.g., a local test fixture CSV and a tiny `README.md` with run steps), tell me which you prefer and I'll update the instructions.
