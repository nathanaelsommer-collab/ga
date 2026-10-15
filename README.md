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

- **Search**: type a query, hit Search → Google results.
- **Email**: To defaults to `nathanael.sommer@gmail.com` (changeable; the last-used
  address is remembered on-device). Subject + message → opens the mail app
  compose window via `mailto:`.

## Deploy

Hosted on GitHub Pages from the `main` branch (`/` root).
After pushing changes, bump `CACHE_VERSION` in `service-worker.js` to force
clients onto the fresh cache.
