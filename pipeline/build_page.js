// Assembles the single-file page: title, fonts, styles, skeleton, the data object and the scripts.
// Usage: node pipeline/build_page.js [data dir, default data/private] [output file, default dist/portfolio.html]
// The output is written without <html>/<head>/<body>: the Artifact host wraps it in its own skeleton.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const dataDir = path.resolve(process.argv[2] || path.join(root, 'data', 'private'));
const out = path.resolve(process.argv[3] || path.join(root, 'dist', 'portfolio.html'));
const rd = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const data = fs.readFileSync(path.join(dataDir, 'data.json'), 'utf8');
const scripts = ['src/core.js', 'src/page/model.js', 'src/page/views.js', 'src/page/live.js'].map(rd).join('\n');

const body = `
<div class="app">
  <header class="top">
    <div class="brand"><h1 id="mh-name">Equity Portfolio Dashboard</h1><p><span id="mh-strategy"></span> · <span id="mh-tag"></span></p></div>
    <div class="status" id="status" data-mode="snapshot" role="status"><span class="dot"></span><span id="status-text"></span><button class="btn" id="btn-refresh" hidden>Refresh</button></div>
  </header>
  <div class="bar"><nav class="tabs" id="tabs" role="tablist" aria-label="Sections"></nav><span class="muted" id="mh-aum" style="margin-left:auto;font-size:13px"></span></div>
  <section class="tabpage" id="t-record" role="tabpanel" aria-labelledby="tab-record"></section>
  <section class="tabpage" id="t-philosophy" role="tabpanel" aria-labelledby="tab-philosophy" hidden></section>
  <section class="tabpage" id="t-book" role="tabpanel" aria-labelledby="tab-book" hidden></section>
  <section class="tabpage" id="t-risk" role="tabpanel" aria-labelledby="tab-risk" hidden></section>
  <div id="notes"></div>
</div>
<div id="tip" role="tooltip"></div>`;

const json = data.replace(/<\//g, '<\\/').replace(/<!--/g, '<\\!--');
const html = `<title>Equity Portfolio Dashboard</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
${rd('src/page/style.css')}
</style>
${body}
<script>
const DATA = ${json};
${scripts}
</script>
`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('wrote', path.relative(process.cwd(), out), (html.length / 1024).toFixed(1) + ' KB');
