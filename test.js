// Node test suite for the GA daily Schwab report app. Extracts the <script>
// from index.html, stubs the browser bits, and asserts the report math.
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
};
const navigator = {};
const window = { addEventListener(){} };
const localStorage = { _s:{}, getItem(k){ return this._s[k] ?? null; }, setItem(k,v){ this._s[k]=String(v); } };

const sandbox = { document, navigator, window, localStorage, console };
const vm = require('vm');
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const get = name => vm.runInContext(name, sandbox);
const requiredValue = get('requiredValue'), flipGain = get('flipGain'),
      flipStatus = get('flipStatus'), statusClass = get('statusClass'),
      distLine = get('distLine'), buildReport = get('buildReport'),
      parseStooq = get('parseStooq'), FLIPS = get('FLIPS'),
      money = get('money'), money0 = get('money0');

// ── Assertions ──
let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', label); }
}
function local(y, m, d) { return new Date(y, m - 1, d, 12); }
function near(a, b, tol) { return Math.abs(a - b) <= tol; }

// 1. Required path: Nov 5 2026 = start, Nov 5 2027 = $106,860, Dec 5 2026 ≈ $77.6k
ok(near(requiredValue(local(2026, 11, 5)), 75413, 0.01),
  `required Nov 5 2026 = $75,413 (got ${requiredValue(local(2026, 11, 5)).toFixed(2)})`);
ok(near(requiredValue(local(2027, 11, 5)), 106860, 5),
  `required Nov 5 2027 ≈ $106,860 (got ${requiredValue(local(2027, 11, 5)).toFixed(2)})`);
const dec5 = requiredValue(local(2026, 12, 5));
ok(dec5 > 77500 && dec5 < 77700,
  `required Dec 5 2026 ≈ $77.6k (got ${dec5.toFixed(2)})`);
ok(near(requiredValue(local(2026, 11, 6)), 75485, 3),
  `required Nov 6 2026 ≈ $75,485 (got ${requiredValue(local(2026, 11, 6)).toFixed(2)})`);
ok(near(requiredValue(local(2026, 11, 4)), 75413, 0.01),
  'required before start clamps to $75,413');

// 2. Flip math: TQQQ entry $52.9999
let g = flipGain(55, FLIPS.TQQQ);
ok(near(g.dollars, 2.0001, 0.001), `TQQQ $55 gain = +$2.00 (got ${g.dollars.toFixed(4)})`);
ok(near(g.pct, 3.7737, 0.01), `TQQQ $55 gain = +3.77% (got ${g.pct.toFixed(2)}%)`);
g = flipGain(47.70, FLIPS.TQQQ);
ok(near(g.pct, -10.0, 0.01), `TQQQ stop $47.70 = -10.00% (got ${g.pct.toFixed(2)}%)`);
g = flipGain(52.60, FLIPS.TNA);
ok(near(g.pct, 0, 0.01), 'TNA at entry = 0%');
g = flipGain(47.34, FLIPS.TNA);
ok(near(g.pct, -10.0, 0.01), `TNA stop $47.34 = -10.00% (got ${g.pct.toFixed(2)}%)`);

// 3. Status thresholds (TQQQ: stop 47.70, half 60.95, rest 66.25)
ok(flipStatus(47.70, FLIPS.TQQQ) === 'BELOW STOP', 'at stop = BELOW STOP');
ok(flipStatus(40.00, FLIPS.TQQQ) === 'BELOW STOP', 'below stop = BELOW STOP');
ok(flipStatus(48.00, FLIPS.TQQQ) === 'NEAR STOP', 'just above stop = NEAR STOP');
ok(flipStatus(53.00, FLIPS.TQQQ) === 'OK', 'at entry = OK');
ok(flipStatus(59.80, FLIPS.TQQQ) === 'NEAR HALF', 'just below half = NEAR HALF');
ok(flipStatus(60.95, FLIPS.TQQQ) === 'HALF HIT', 'at half = HALF HIT');
ok(flipStatus(63.00, FLIPS.TQQQ) === 'HALF HIT', 'between half and rest = HALF HIT');
ok(flipStatus(65.00, FLIPS.TQQQ) === 'NEAR REST', 'just below rest = NEAR REST');
ok(flipStatus(66.25, FLIPS.TQQQ) === 'REST HIT', 'at rest = REST HIT');
ok(flipStatus(70.00, FLIPS.TQQQ) === 'REST HIT', 'above rest = REST HIT');
ok(statusClass('BELOW STOP') === 'bad' && statusClass('NEAR STOP') === 'warn' &&
   statusClass('HALF HIT') === 'good' && statusClass('OK') === 'ok', 'status classes map');

// 4. Distance line
ok(distLine(52.61, 60.95).indexOf('+$8.34') === 0, `dist to half: ${distLine(52.61, 60.95)}`);
ok(distLine(52.61, 47.70).indexOf('−$4.91') === 0, `dist to stop: ${distLine(52.61, 47.70)}`);

// 5. Report format — full example (Nov 6 2026, prices from that morning)
const rep = buildReport({
  date: local(2026, 11, 6), total: 75824.41, cash: 10099.37,
  prices: { TQQQ: 52.61, TNA: 52.78, VOO: 678.78 }, trades: [], notes: '',
});
const lines = rep.split('\n');
ok(lines[0] === 'Daily Schwab report — Fri, Nov 6, 2026', `report header: ${lines[0]}`);
ok(lines[1].indexOf('Total: $75,824.41') === 0, `total line: ${lines[1]}`);
ok(lines[1].indexOf('vs required $75,485') >= 0, `total line has required: ${lines[1]}`);
ok(lines[1].indexOf('ahead $339') >= 0, `total line ahead: ${lines[1]}`);
ok(lines[2] === 'Cash: $10,099.37', `cash line: ${lines[2]}`);
ok(lines[3].indexOf('TQQQ 239 @ $52.61') === 0, `TQQQ line: ${lines[3]}`);
ok(lines[3].indexOf('half $60.95 / rest $66.25 / stop $47.70') >= 0, 'TQQQ line has levels');
ok(lines[3].indexOf('— OK') >= 0, `TQQQ status OK: ${lines[3]}`);
ok(lines[4].indexOf('TNA 475 @ $52.78') === 0, `TNA line: ${lines[4]}`);
ok(lines[4].indexOf('half $60.49 / rest $65.75 / stop $47.34') >= 0, 'TNA line has levels');
ok(lines[5].indexOf('VOO 37 @ $678.78') === 0 && lines[5].indexOf('(HOLD)') >= 0, `VOO line: ${lines[5]}`);
ok(lines[6] === 'Trades today: None', `trades line: ${lines[6]}`);
ok(lines[7] === 'Notes: —', `notes line: ${lines[7]}`);
ok(lines.length === 8, `report has exactly 8 lines (got ${lines.length})`);

// 6. Report with trades + notes + behind-path
const rep2 = buildReport({
  date: local(2026, 11, 6), total: 70000, cash: 10099.37,
  prices: { TQQQ: 47.00, TNA: 52.78, VOO: 678.78 },
  trades: ['Sold TQQQ half', 'Robinhood sold'], notes: 'Bounce fading.',
});
ok(rep2.indexOf('behind $5,485') >= 0, 'behind-path line');
ok(rep2.indexOf('TQQQ 239 @ $47.00') >= 0 && rep2.indexOf('BELOW STOP') >= 0, 'below-stop in report');
ok(rep2.indexOf('Trades today: Sold TQQQ half; Robinhood sold') >= 0, 'trades joined with ;');
ok(rep2.indexOf('Notes: Bounce fading.') >= 0, 'notes carried through');

// 7. Report with no prices entered
const rep3 = buildReport({
  date: local(2026, 11, 6), total: 75000, cash: null,
  prices: { TQQQ: null, TNA: null, VOO: null }, trades: ['No trades'], notes: '',
});
ok(rep3.indexOf('TQQQ 239 @ — (no price entered)') >= 0, 'TQQQ no-price line');
ok(rep3.indexOf('VOO 37 @ — (HOLD)') >= 0, 'VOO no-price line');
ok(rep3.indexOf('Cash: $10,099.37') >= 0, 'cash defaults to $10,099.37');
ok(rep3.indexOf('Trades today: None') >= 0, '"No trades" renders as None');

// 8. Stooq CSV parsing
const csv = 'Symbol,Date,Time,Open,High,Low,Close,Volume\n' +
  'TQQQ.US,2026-11-06,22:00,52.72,54.17,52.00,52.61,123456\n' +
  'TNA.US,2026-11-06,22:00,52.79,53.73,51.78,52.78,23456\n' +
  'VOO.US,2026-11-06,22:00,675.44,682.25,675.30,678.78,3456\n';
const p = parseStooq(csv);
ok(p.TQQQ === 52.61 && p.TNA === 52.78 && p.VOO === 678.78,
  `Stooq parse: ${JSON.stringify(p)}`);
ok(Object.keys(parseStooq('')).length === 0, 'empty CSV parses to empty object');
ok(Object.keys(parseStooq('<meta charset=utf-8><title>Stooq</title>')).length === 0,
  'Stooq error page parses to empty object (graceful fallback)');

// 8b. Yahoo quote JSON parsing (second live-price attempt)
const parseYahooQuote = get('parseYahooQuote');
const y = parseYahooQuote({ quoteResponse: { result: [
  { symbol: 'TQQQ', regularMarketPrice: 52.61 },
  { symbol: 'TNA', regularMarketPrice: 52.78 },
  { symbol: 'VOO', regularMarketPrice: 678.78 },
  { symbol: 'SPY', regularMarketPrice: 734.01 },
] } });
ok(y.TQQQ === 52.61 && y.TNA === 52.78 && y.VOO === 678.78,
  `Yahoo parse: ${JSON.stringify(y)}`);
ok(Object.keys(parseYahooQuote({})).length === 0, 'empty Yahoo JSON parses to empty object');

// 9. Rendering smoke test (init already ran renderAll + renderHistory in the sandbox)
ok(els.todayLine && els.todayLine.textContent.length > 0, 'today line populated');
ok(els.flipList.innerHTML.indexOf('TQQQ') >= 0 && els.flipList.innerHTML.indexOf('TNA') >= 0 &&
   els.flipList.innerHTML.indexOf('VOO') >= 0, 'flip list renders all three');
ok(els.pathLine.textContent.length > 0, 'path line populated');
ok(els.historyList.innerHTML.indexOf('No saved reports') >= 0, 'empty history message');

// 10. doBuild end-to-end through the DOM stubs
els.totalInput.value = '75824.41';
els.cashInput.value = '10099.37';
els.tqqqPrice.value = '52.61';
els.tnaPrice.value = '52.78';
els.vooPrice.value = '678.78';
els.notesInput.value = '';
const doBuild = get('doBuild');
const renderAll = get('renderAll');
renderAll();
const built = doBuild();
ok(built && built.indexOf('Daily Schwab report') === 0, 'doBuild produces report');
ok(els.reportOut.textContent.indexOf('Total: $75,824.41') >= 0, 'doBuild writes report to page');
ok(els.pathLine.textContent.indexOf('Ahead') === 0, `path line after build: ${els.pathLine.textContent}`);

// 11. Shell invariants
ok(!html.includes('rel="apple-touch-icon"'), 'no apple-touch-icon link (icon stays untouched)');
ok(!html.includes('type="password"') && !html.toLowerCase().includes('brokerage login'),
  'no password field / brokerage login in app');
ok(!html.includes('ga_hunts') && !html.includes('Moon &amp; movement'),
  'Moon planner body fully replaced');
ok(fs.readFileSync(__dirname + '/service-worker.js', 'utf8').includes('ga-v14'), 'SW bumped to ga-v14');
ok(!fs.readFileSync(__dirname + '/service-worker.js', 'utf8').includes('ga-v13'), 'no ga-v13 left in SW');
ok(html.includes('ga_reports') && html.includes('localStorage'), 'history uses localStorage ga_reports');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
