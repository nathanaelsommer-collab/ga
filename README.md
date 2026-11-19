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

- **Allianz refund decision** (ga-v16, Nov 19 2026 — replaces the Daily Schwab report; backup at `~/workspace/ga-backups/daily-schwab-index-2026-11-19.html`).
  Plan EUSP2608942799, "Dom Airline w RTW 3", bought Nov 5, 2026 for the Nov 21 Anchorage trip (cancelled Nov 17, never started, no claim filed). 15-day free-look window: Nov 5 + 15 days = Nov 20, but inclusive counting could close it Nov 19 — today is the safe day to act, tomorrow the outside date. Two options: cancel for a full refund (1-866-889-4569, customerservice@allianzassistance.com, or Allyz app / My Plan) or ask Allianz to move the policy to the January trip. Records the decision + any confirmed refund figure and builds a message to copy/share to Beauzo. History is kept on-device in localStorage (`ga_allianz_v16`, last 30). The premium amount was not in Allianz's email — the app never states a dollar refund figure.
- Previous function: **Daily Schwab report** (ga-v15, Nov 7 2026 — added the Rule 8 win-cooldown tile; backup at `~/workspace/ga-backups/daily-schwab-index-2026-11-19.html`).
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
