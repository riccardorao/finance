// Builds the viewer edition: a page with NO personal data. Whoever opens it sees their own Scalable Capital
// account, read through the connector when the page loads (see src/page/viewer.js and src/client/feed.js).
// What is built in is public: the research notes, the S&P 500's long-run growth, and the reference prices the
// analyst targets were converted at.
// Usage: node pipeline/build_viewer.js [data dir, default data/private] [output file, default dist/viewer.html]
//        (the data dir is read only for index_history.json and the reference prices in snapshot.json)
const fs = require('fs');
const path = require('path');
const { assemble, writePage } = require('./build_page.js');
const root = path.join(__dirname, '..');
const dir = path.resolve(process.argv[2] || path.join(root, 'data', 'private'));
const out = path.resolve(process.argv[3] || path.join(root, 'dist', 'viewer.html'));
const rd = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const STOCKS = require('../research/stocks.js');
const COMMENTS = require('../research/comments.js');

const SPX = 'IE00B5BMR087';
const hist = rd('index_history.json')[SPX];
const idxDaily = rd('index_daily.json')[SPX];
const ref = Object.fromEntries(rd('snapshot.json').holdings.map((h) => [h.isin, h.quoteMid || h.price]));
const research = {};
for (const [isin, r] of Object.entries(STOCKS)) if (ref[isin]) research[isin] = { ...r, refEur: ref[isin] };
const asOfDay = (rd('snapshot.json').meta.asOf || '').slice(0, 10);

const DATA = {
  static: {
    indexDaily: { d: idxDaily.d, p: idxDaily.p },
    indices: [{ id: 'SPX', name: 'S&P 500', isin: SPX, etf: 'iShares Core S&P 500', cagr: hist.cagr, cagrFrom: hist.from, cagrTo: hist.to, cagrBasis: hist.basis }],
    research,
    comments: COMMENTS,
    profile: {
      fund: 'My portfolio',
      manager: '',
      exclusionNote: '',
      valueNote: 'The value of the portfolio is rebuilt from every trade in your Scalable Capital account and closing prices from Scalable: every day for the last six months, every second day back to one year, and month ends before that, with your own trade prices filling in between. Days without a price are interpolated, so the older part of the portfolio line is an estimate and is drawn dashed. The S&P 500 is daily throughout, from its own price history built into the page. Share splits are found by comparing your trade prices with the market.',
    },
  },
  profile: { fund: 'My portfolio', manager: '', exclusionNote: '', valueNote: '' },
  researchAt: asOfDay,
};
DATA.profile.valueNote = DATA.static.profile.valueNote;
writePage(assemble(JSON.stringify(DATA), ['src/core.js', 'src/client/feed.js', 'src/page/model.js', 'src/page/views.js', 'src/page/viewer.js']), out);
