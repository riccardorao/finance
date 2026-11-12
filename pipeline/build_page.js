// Assembles the single-file page: title, fonts, styles, skeleton, the data object and the scripts.
// Usage: node pipeline/build_page.js [data dir, default data/private] [output file, default dist/portfolio.html]
// The output is written without <html>/<head>/<body>: the Artifact host wraps it in its own skeleton.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const rd = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const body = `
<div class="shell">
  <aside class="side">
    <div class="brand"><span class="mark" aria-hidden="true">FF</span><div><h1 id="mh-name">Equity Portfolio Dashboard</h1><p id="mh-strategy"></p></div></div>
    <nav class="nav" id="tabs" role="tablist" aria-label="Sections"></nav>
    <div class="status" id="status" data-mode="snapshot" role="status"><span class="dot"></span><span id="status-text"></span><button class="btn" id="btn-refresh" hidden>Refresh</button></div>
  </aside>
  <main class="main">
    <header class="top"><div class="worth"><span class="lbl">Portfolio value</span><div class="aum" id="mh-value"></div></div><div class="pills" id="mh-sub"></div></header>
    <section class="tabpage" id="t-record" role="tabpanel" aria-labelledby="tab-record" hidden></section>
    <section class="tabpage" id="t-book" role="tabpanel" aria-labelledby="tab-book" hidden></section>
    <section class="tabpage" id="t-risk" role="tabpanel" aria-labelledby="tab-risk" hidden></section>
    <section class="tabpage" id="t-ideas" role="tabpanel" aria-labelledby="tab-ideas" hidden></section>
    <div id="notes"></div>
  </main>
</div>
<div id="tip" role="tooltip"></div>`;

/** Assembles the page: title, fonts, styles, skeleton, the data object (JSON text) and the scripts (file names). */
function assemble(data, scriptFiles) {
  const scripts = scriptFiles.map(rd).join('\n');
  const json = data.replace(/<\//g, '<\\/').replace(/<!--/g, '<\\!--');
  return `<title>Equity Portfolio Dashboard</title>
<meta name="claude:viewport-fit-sides" content="cover">
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
}
const writePage = (html, out) => { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, html); console.log('wrote', path.relative(process.cwd(), out), (html.length / 1024).toFixed(1) + ' KB'); };
module.exports = { assemble, writePage };

if (require.main === module) {
  const dataDir = path.resolve(process.argv[2] || path.join(root, 'data', 'private'));
  const out = path.resolve(process.argv[3] || path.join(root, 'dist', 'portfolio.html'));
  writePage(assemble(fs.readFileSync(path.join(dataDir, 'data.json'), 'utf8'), ['src/core.js', 'src/client/feed.js', 'src/page/model.js', 'src/page/views.js', 'src/page/trade.js', 'src/page/live.js']), out);
}
