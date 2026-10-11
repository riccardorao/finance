// A stand-in for the claude.ai connector bridge, answering the way the Scalable Capital connector does,
// from data/sample/feed.json. Source text is injected into the page before it loads (see tests/viewer.js).
// mode: 'ok' | 'denied' (consent refused) | 'partial' (charts and news fail) | 'multi' (two portfolios)
module.exports = function mockSource(feed, mode) {
  return `(() => {
  const F = ${JSON.stringify(feed)}; const MODE = ${JSON.stringify(mode)};
  const err = (code, message) => Promise.reject({ code, message: message || code });
  let calls = 0;
  const mcp = {
    callTool: async (server, tool, input) => {
      calls++; input = input || {};
      if (server !== 'Scalable Capital') return err('server_not_connected');
      if (MODE === 'denied') return err('not_in_manifest');
      const ok = (payload) => ({ content: [], payload });
      switch (tool) {
        case 'list_accessible_portfolios': return ok(MODE === 'multi' && !input.portfolioId ? { portfolios: [{ portfolioId: 'A' }, { portfolioId: 'B' }], resolution: { status: 'selection_required' } } : { portfolios: [{ portfolioId: F.portfolioId }], resolution: { status: 'auto_resolved' } });
        case 'get_portfolio_holdings': return ok(F.holdings);
        case 'get_portfolio_overview': return ok(F.overview);
        case 'get_portfolio_cash_breakdown': return ok(F.cash);
        case 'get_security_quote': return F.quotes[input.isin] ? ok(F.quotes[input.isin]) : err('tool_error', 'unknown security');
        case 'get_security_news': return MODE === 'partial' ? err('tool_error', 'news down') : ok({ summary: { short: 'Test summary <b>x</b>', long: 'Long', lastUpdatedAt: '2026-10-01' }, sources: [] });
        case 'list_portfolio_transactions': {
          const size = input.pageSize || 20, from = input.cursor ? +input.cursor : 0;
          const page = F.transactions.slice(from, from + size), next = from + size < F.transactions.length ? String(from + size) : null;
          return ok({ portfolioId: F.portfolioId, page: { nextCursor: next, totalCount: F.transactions.length, returnedCount: page.length }, transactions: page, crypto: { page: { nextCursor: null }, transactions: [] } });
        }
        case 'get_security_chart': {
          const c = F.charts[input.isin]; if (!c || (MODE === 'partial' && input.isin.startsWith('US59'))) return err('tool_error', 'no chart');
          const six = Date.parse(F.overview.timestamps.valuationTimestampUtc) - 183 * 864e5;
          const pts = input.timeframe === 'max' ? c.max : input.timeframe === 'six_months' ? c.one_year.filter((x) => Date.parse(x.timestampUtc) > six) : c.one_year;
          return ok({ isin: input.isin, timeframe: input.timeframe, currency: 'EUR', closingReferencePoint: pts.length ? { midPrice: pts[0].midPrice, timestampUtc: pts[0].timestampUtc } : null, dataPoints: pts.slice(1) });
        }
        default: return err('bad_request', 'unknown tool ' + tool);
      }
    },
  };
  window.__calls = () => calls;
  window.claude = { use: async (n) => (n === 'mcp' && MODE !== 'none' ? mcp : null) };
})();`;
};
