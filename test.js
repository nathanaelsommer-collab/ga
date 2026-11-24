// Node test suite for the GA big ticker screen app (ga-v17).
// Extracts the <script> from index.html, stubs the browser bits, and
// asserts the quote parsing, session handling, and formatting.
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];

// ── DOM stub ──
function makeEl() {
  return {
    _html: '', _text: '', _value: '', checked: false, disabled: false,
    set innerHTML(v){ this._html = v; }, get innerHTML(){ return this._html; },
    set textContent(v){ this._text = String(v); }, get textContent(){ return this._text; },
    set value(v){ this._value = v; }, get value(){ return this._value; },
    addEventListener(){}, appendChild(){}, removeChild(){},
    getAttribute(){ return null; }, setAttribute(){},
  };
}
const els = {};
const document = {
  getElementById: id => (els[id] = els[id] || makeEl()),
  querySelectorAll: () => [],
  createElement: () => makeEl(),
  body: makeEl(),
  addEventListener(){},
  hidden: false,
};
const navigator = {};
const window = { addEventListener(){} };
const localStorage = { _s:{}, getItem(k){ return this._s[k] ?? null; }, setItem(k,v){ this._s[k]=String(v); } };

const sandbox = { document, navigator, window, localStorage, console,
  setInterval(){ return 0; }, setTimeout(fn){ return 0; } };
const vm = require('vm');
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const get = name => vm.runInContext(name, sandbox);
const pickDisplay = get('pickDisplay'), parseYahooQuote = get('parseYahooQuote'),
      parseStooq = get('parseStooq'), fmtPrice = get('fmtPrice'),
      fmtChg = get('fmtChg'), fmtPct = get('fmtPct'), SYMBOLS = get('SYMBOLS');

// ── Assertions ──
let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', label); }
}
function near(a, b, tol) { return Math.abs(a - b) <= tol; }

// 1. Tickers are exactly SOXL, SOXS, VOO, NVDA
ok(JSON.stringify(SYMBOLS) === JSON.stringify(['SOXL', 'SOXS', 'VOO', 'NVDA']),
  `symbols: ${JSON.stringify(SYMBOLS)}`);

// 2. Pre-market session: pre-market price shown, change vs previous close
let d = pickDisplay({ symbol: 'SOXL', marketState: 'PRE', regularMarketPrice: 43.21,
  regularMarketPreviousClose: 43.21, preMarketPrice: 38.02 });
ok(d.price === 38.02 && d.session === 'PRE-MARKET', `pre-market price/session: ${JSON.stringify(d)}`);
ok(near(d.chg, -5.19, 0.01), `pre-market chg -$5.19 (got ${d.chg})`);
ok(near(d.pct, -12.01, 0.05), `pre-market pct -12.01% (got ${d.pct})`);

// 3. Regular session: regular price, change vs previous close
d = pickDisplay({ symbol: 'NVDA', marketState: 'REGULAR', regularMarketPrice: 165.05,
  regularMarketPreviousClose: 125.53 });
ok(d.price === 165.05 && d.session === 'MARKET OPEN', 'regular price/session');
ok(near(d.chg, 39.52, 0.01), `regular chg +$39.52 (got ${d.chg})`);
ok(near(d.pct, 31.48, 0.05), `regular pct +31.48% (got ${d.pct})`);

// 4. After-hours session
d = pickDisplay({ symbol: 'VOO', marketState: 'POST', regularMarketPrice: 663.91,
  regularMarketPreviousClose: 663.91, postMarketPrice: 665.38 });
ok(d.price === 665.38 && d.session === 'AFTER HOURS', 'after-hours price/session');
ok(near(d.chg, 1.47, 0.01), `after-hours chg +$1.47 (got ${d.chg})`);

// 5. Closed: regular price is the last close, change ~0
d = pickDisplay({ symbol: 'TNA', marketState: 'CLOSED', regularMarketPrice: 48.28,
  regularMarketPreviousClose: 48.28 });
ok(d.price === 48.28 && d.session === 'CLOSED' && d.chg === 0, 'closed session');

// 6. Yahoo quote JSON parsing (mixed sessions)
const y = parseYahooQuote({ quoteResponse: { result: [
  { symbol: 'SOXL', marketState: 'PRE', regularMarketPrice: 43.21, regularMarketPreviousClose: 43.21, preMarketPrice: 38.02 },
  { symbol: 'SOXS', marketState: 'PRE', regularMarketPrice: 49.11, regularMarketPreviousClose: 49.11, preMarketPrice: 55.09 },
  { symbol: 'VOO', marketState: 'REGULAR', regularMarketPrice: 658.59, regularMarketPreviousClose: 663.91 },
  { symbol: 'NVDA', marketState: 'REGULAR', regularMarketPrice: 155.57, regularMarketPreviousClose: 165.05 },
  { symbol: 'SPY', marketState: 'REGULAR', regularMarketPrice: 734.01, regularMarketPreviousClose: 730.00 },
] } });
ok(y.SOXL && y.SOXL.price === 38.02, `Yahoo SOXL pre-market: ${JSON.stringify(y.SOXL)}`);
ok(y.SOXS && y.SOXS.price === 55.09, 'Yahoo SOXS pre-market');
ok(y.VOO && near(y.VOO.chg, -5.32, 0.01), `Yahoo VOO chg -$5.32 (got ${y.VOO && y.VOO.chg})`);
ok(y.NVDA && near(y.NVDA.pct, -5.74, 0.05), `Yahoo NVDA pct -5.74% (got ${y.NVDA && y.NVDA.pct})`);
ok(Object.keys(parseYahooQuote({})).length === 0, 'empty Yahoo JSON parses to empty object');
ok(Object.keys(parseYahooQuote({ quoteResponse: { result: null } })).length === 0,
  'null Yahoo result parses to empty object');

// 7. Stooq CSV parsing (close only, no change)
const csv = 'Symbol,Date,Time,Open,High,Low,Close,Volume\n' +
  'SOXL.US,2026-11-24,12:00,46.00,47.00,45.50,46.60,123456\n' +
  'VOO.US,2026-11-24,12:00,657.00,660.00,656.00,658.59,3456\n';
const p = parseStooq(csv);
ok(p.SOXL && p.SOXL.price === 46.60 && p.SOXL.chg === null, `Stooq SOXL: ${JSON.stringify(p.SOXL)}`);
ok(p.VOO && p.VOO.price === 658.59, 'Stooq VOO');
ok(Object.keys(parseStooq('')).length === 0, 'empty CSV parses to empty object');
ok(Object.keys(parseStooq('<meta charset=utf-8><title>Stooq</title>')).length === 0,
  'Stooq error page parses to empty object (graceful fallback)');

// 8. Formatting
ok(fmtPrice(658.59) === '658.59', 'price format');
ok(fmtChg(-5.19) === '−$5.19', `chg negative: ${fmtChg(-5.19)}`);
ok(fmtChg(12.33) === '+$12.33', `chg positive: ${fmtChg(12.33)}`);
ok(fmtPct(-12.01) === '−12.01%', `pct negative: ${fmtPct(-12.01)}`);
ok(fmtPct(39.93) === '+39.93%', `pct positive: ${fmtPct(39.93)}`);

// 9. Rendering smoke test (init ran render with no cache: dashes + Loading)
ok(els.tickList && els.tickList.innerHTML.indexOf('SOXL') >= 0, 'ticker list renders SOXL');
ok(els.tickList.innerHTML.indexOf('SOXS') >= 0, 'ticker list renders SOXS');
ok(els.tickList.innerHTML.indexOf('VOO') >= 0, 'ticker list renders VOO');
ok(els.tickList.innerHTML.indexOf('NVDA') >= 0, 'ticker list renders NVDA');
ok(els.statusLine && els.statusLine.textContent.length > 0, 'status line populated');

// 10. Shell invariants
ok(!html.includes('rel="apple-touch-icon"'), 'no apple-touch-icon link (icon stays untouched)');
ok(!html.includes('type="password"') && !html.toLowerCase().includes('brokerage login'),
  'no password field / brokerage login in app');
ok(!html.includes('EUSP2608942799') && !html.includes('Allianz'),
  'Allianz body fully replaced');
ok(html.includes('ga_tickers_v17') && html.includes('localStorage'), 'cache uses localStorage ga_tickers_v17');
ok(html.includes('setInterval') && html.includes('60000'), '60-second refresh interval present');
ok(fs.readFileSync(__dirname + '/service-worker.js', 'utf8').includes('ga-v17'), 'SW bumped to ga-v17');
ok(!fs.readFileSync(__dirname + '/service-worker.js', 'utf8').includes('ga-v16'), 'no ga-v16 left in SW');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
