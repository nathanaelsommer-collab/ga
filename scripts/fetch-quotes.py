#!/usr/bin/env python3
"""Fetch quotes for the GA ticker screen and write prices.json.

Runs on GitHub Actions every 5 minutes during market hours. The app reads
prices.json from its own repo (same-origin, always works) instead of asking
free quote sites from the browser, where Yahoo rate-limits (429), the
AllOrigins proxy is blocked, and Stooq is dead (404).

Sources tried in order: CNBC quote API (works server-side, carries
pre/post-market quotes), then Yahoo v8 chart (one request per symbol).
Only writes prices.json when all 4 symbols parse; otherwise leaves the
last-good file untouched so the app keeps showing the previous values.
"""
import datetime
import json
import sys
import urllib.request
from zoneinfo import ZoneInfo

SYMBOLS = ["SOXL", "SOXS", "VOO", "NVDA"]

CNBC_URL = (
    "https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol"
    "?symbols=SOXL%7CSOXS%7CVOO%7CNVDA&requestMethod=itv&noform=1"
    "&partnerId=2&fund=1&exthrs=1&output=json"
)
UA = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
}


def fnum(s):
    try:
        return float(str(s).replace("%", "").replace("+", "").replace(",", ""))
    except (TypeError, ValueError):
        return None


def parse_cnbc(payload):
    out = {}
    for item in payload["FormattedQuoteResult"]["FormattedQuote"]:
        sym = item.get("symbol")
        if sym not in SYMBOLS:
            continue
        price = fnum(item.get("last"))
        change = fnum(item.get("change"))
        pct = fnum(item.get("change_pct"))
        if price is None or change is None:
            continue
        status = (item.get("curmktstatus") or "").upper()
        ext = item.get("ExtendedMktQuote") or {}
        q = {
            "symbol": sym,
            "price": price,
            "prevClose": round(price - change, 2),
            "change": change,
            "changePercent": pct,
            "state": "REGULAR",
            "preMarketPrice": None,
            "preMarketChange": None,
            "preMarketChangePercent": None,
            "postMarketPrice": None,
            "postMarketChange": None,
            "postMarketChangePercent": None,
        }
        if "PRE" in status and ext.get("last"):
            q["state"] = "PRE"
            q["preMarketPrice"] = fnum(ext.get("last"))
            q["preMarketChange"] = fnum(ext.get("change"))
            q["preMarketChangePercent"] = fnum(ext.get("change_pct"))
        elif "POST" in status and ext.get("last"):
            q["state"] = "POST"
            q["postMarketPrice"] = fnum(ext.get("last"))
            q["postMarketChange"] = fnum(ext.get("change"))
            q["postMarketChangePercent"] = fnum(ext.get("change_pct"))
        out[sym] = q
    return out


def fetch_yahoo_all():
    out = {}
    for sym in SYMBOLS:
        url = (
            "https://query1.finance.yahoo.com/v8/finance/chart/%s"
            "?range=1d&interval=1m" % sym
        )
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=20) as r:
            meta = json.load(r)["chart"]["result"][0]["meta"]
        price = meta.get("regularMarketPrice")
        prev = meta.get("chartPreviousClose")
        if price is None or prev is None:
            continue
        state = (meta.get("marketState") or "REGULAR").upper()
        q = {
            "symbol": sym,
            "price": price,
            "prevClose": prev,
            "change": round(price - prev, 2),
            "changePercent": round((price - prev) / prev * 100, 2) if prev else None,
            "state": "REGULAR",
            "preMarketPrice": None,
            "preMarketChange": None,
            "preMarketChangePercent": None,
            "postMarketPrice": None,
            "postMarketChange": None,
            "postMarketChangePercent": None,
        }
        pre = meta.get("preMarketPrice")
        if state == "PRE" and pre:
            q["state"] = "PRE"
            q["preMarketPrice"] = pre
            q["preMarketChange"] = round(pre - price, 2)
            q["preMarketChangePercent"] = round((pre - price) / price * 100, 2)
        post = meta.get("postMarketPrice")
        if state == "POST" and post:
            q["state"] = "POST"
            q["postMarketPrice"] = post
            q["postMarketChange"] = round(post - price, 2)
            q["postMarketChangePercent"] = round((post - price) / price * 100, 2)
        out[sym] = q
    return out


def main():
    quotes = None
    try:
        req = urllib.request.Request(CNBC_URL, headers=UA)
        with urllib.request.urlopen(req, timeout=20) as r:
            quotes = parse_cnbc(json.load(r))
        print("CNBC returned %d symbols" % len(quotes or {}))
    except Exception as e:  # noqa: BLE001 - fall through to Yahoo
        print("CNBC failed: %s" % e)
    if not quotes or len(quotes) < 4:
        try:
            quotes = fetch_yahoo_all()
            print("Yahoo returned %d symbols" % len(quotes or {}))
        except Exception as e:  # noqa: BLE001 - nothing left to try
            print("Yahoo failed: %s" % e)
    if not quotes or len(quotes) < 4:
        print("No complete quote set; leaving prices.json untouched.")
        return 0
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    now_ct = now_utc.astimezone(ZoneInfo("America/Chicago"))
    doc = {
        "updated": now_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "updatedLabel": now_ct.strftime("%a %b %-d, %-I:%M %p CT"),
        "quotes": quotes,
    }
    with open("prices.json", "w") as f:
        json.dump(doc, f, indent=1, sort_keys=True)
    print("Wrote prices.json: %s" % doc["updatedLabel"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
