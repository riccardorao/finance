// Monthly total-return proxies for the asset classes the app backtests and marks to market, in euro.
// Source: Yahoo Finance adjusted month-end closes (dividends reinvested), converted at the month-end EUR/USD rate.
// Output: app/market.json { from, months: [YYYY-MM], series: { key: [EUR index] }, meta: { key: {sym, name} } }
const fs = require('fs');
const path = require('path');
const UA = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };
const P = {
  usEq: ['SPY', 'US equities (S&P 500)'], intlEq: ['EFA', 'Developed ex-US equities'], emEq: ['EEM', 'Emerging-market equities'],
  bonds: ['AGG', 'Investment-grade bonds'], gold: ['GLD', 'Gold'], reits: ['VNQ', 'Listed real estate'],
  listedPE: ['PSP', 'Listed private equity'], cash: ['SHV', 'Short-term treasuries (cash)'], btc: ['BTC-USD', 'Bitcoin'],
};
const FROM = '2007-02';
async function monthly(sym) {
  const p1 = Math.floor(Date.UTC(2006, 11, 1) / 1000), p2 = Math.floor(Date.now() / 1000);
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?period1=${p1}&period2=${p2}&interval=1mo&events=div,split`, { headers: UA }).catch(() => null);
    if (r && r.ok) {
      const x = (await r.json()).chart.result[0];
      const a = (x.indicators.adjclose && x.indicators.adjclose[0].adjclose) || x.indicators.quote[0].close;
      const m = new Map(); x.timestamp.forEach((t, k) => { if (a[k] != null) m.set(new Date(t * 1000).toISOString().slice(0, 7), a[k]); });
      return m;
    }
    await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
  }
  throw new Error('no data ' + sym);
}
(async () => {
  const fx = await monthly('EURUSD=X');
  const raw = {}; for (const [k, [sym]] of Object.entries(P)) raw[k] = await monthly(sym);
  const last = [...raw.usEq.keys()].sort().pop();
  const months = []; for (let d = new Date(FROM + '-01T00:00:00Z'); d.toISOString().slice(0, 7) <= last; d.setUTCMonth(d.getUTCMonth() + 1)) months.push(d.toISOString().slice(0, 7));
  const fxAt = (m) => { let v = null; for (const [k, x] of fx) if (k <= m) v = x; return v; };
  const series = {};
  for (const k of Object.keys(P)) {
    let prev = null;
    series[k] = months.map((m) => { const v = raw[k].get(m); if (v == null) return prev && prev.started ? prev.v : null; const e = v / fxAt(m); prev = { v: +e.toFixed(4), started: true }; return prev.v; });
  }
  const meta = Object.fromEntries(Object.entries(P).map(([k, [sym, name]]) => [k, { sym, name }]));
  fs.writeFileSync(path.join(__dirname, 'market.json'), JSON.stringify({ from: FROM, to: last, months, series, meta, basis: 'Yahoo Finance adjusted month-end closes (dividends reinvested), in euro at month-end EUR/USD' }));
  console.log('months', months.length, months[0], '→', last, Object.entries(series).map(([k, v]) => `${k}:${v.filter((x) => x != null).length}`).join(' '));
})();
