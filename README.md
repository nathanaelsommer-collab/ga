# GA — generic app shell

A minimal, installable web app: a search bar and a quick-email composer.
Built as a **model** — the entire function lives in the marked `APP BODY`
block in `index.html`. Delete that block and drop in new markup + script;
the shell (PWA wiring, styles) stays as-is.

## Files

- `index.html` — the app (search + email)
- `manifest.json` — PWA manifest
- `service-worker.js` — offline support (cache `ga-v1`)
- `favicon.svg` — icon (SVG; no PNG — iOS falls back to the page-preview thumbnail)

## Current function

- **Daily Schwab report** (ga-v15, Nov 7 2026 — added the Rule 8 win-cooldown tile; backup at `~/workspace/ga-backups/daily-schwab-index-2026-11-07-rule8.html`).
  Enter the Schwab account total + TQQQ/TNA/VOO prices from the Schwab app;
  the app checks flip levels (TQQQ half $60.95 / rest $66.25 / stop $47.70;
  TNA half $60.49 / rest $65.75 / stop $47.34; VOO is HOLD, no stop), checks
  the $1M path (required $77,640 by Dec 5, 2026), shows the Rule 8 win
  cooldown (no new buy for 7 days after a win — enter the last winning-exit
  date and it shows the earliest re-buy date), and builds a plain-text
  report to copy/share to Beauzo. History is kept on-device in localStorage
  (`ga_reports`, last 30). Live prices are best-effort (Stooq, then Yahoo);
  manual entry always works. No brokerage login — GA cannot log into Schwab.

## Deploy

Hosted on GitHub Pages from the `main` branch (`/` root).
After pushing changes, bump `CACHE_VERSION` in `service-worker.js` to force
clients onto the fresh cache.
