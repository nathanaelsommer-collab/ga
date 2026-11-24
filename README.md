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

- **Big ticker screen + synced info** (ga-v18, Nov 24 2026 — adds the data.json sync feed to the ga-v17 ticker screen; backup at `~/workspace/ga-backups/tickers-index-2026-11-24.html`).
  Tickers: SOXL, SOXS, VOO, NVDA in large font, auto-refresh every 60 seconds, session-aware. Below them, a "Latest from you" section fed by `data.json` — the latest information he has shared in chat (account total, cash, checkpoint, holdings with marks, flip limit orders with exits, VOO plan, notes), refreshed on the same 60-second loop. `data.json` lives in the repo and is updated by Beauzo whenever he shares new info (screenshot, trade report, decision); the app fetches it same-origin and the service worker never caches it, so opening the app always shows the latest sync. Last-good sync is kept on-device in localStorage (`ga_data_v18`). Prices are delayed — Schwab is the live mark. No brokerage login.
- Previous function: **Big ticker screen** (ga-v17, Nov 24 2026 — replaces the Allianz refund decision app; backup at `~/workspace/ga-backups/tickers-index-2026-11-24.html`).
  One row each for SOXL, SOXS, VOO, NVDA in large font: symbol, big price, day change ($ and %). Session-aware — shows the pre-market price before the open, the regular price during the session, after-hours after the close. Auto-refreshes every 60 seconds (plus on reopen and a tap-to-refresh button). Prices come from free sources, tried in order — Yahoo direct, Yahoo via AllOrigins proxy, Stooq — and the last good values stay on screen with a plain "couldn't refresh" note when all of them fail; cache is kept on-device in localStorage (`ga_tickers_v17`). Prices are delayed — Schwab is the live mark. No brokerage login.
- Previous function: **Allianz refund decision** (ga-v16, Nov 19 2026 — replaces the Daily Schwab report; backup at `~/workspace/ga-backups/allianz-index-2026-11-24.html`).
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
