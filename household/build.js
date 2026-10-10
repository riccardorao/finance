// Builds Conti di Casa, the household finance tool, into one HTML file that opens offline in any browser.
// Usage: node household/build.js [output, default dist/household.html] [--artifact]
// --artifact leaves out <html>/<head>/<body>, for hosts that wrap the page in their own skeleton.
const fs = require('fs');
const path = require('path');
const here = __dirname;
const args = process.argv.slice(2);
const artifact = args.includes('--artifact');
const out = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(here, '..', 'dist', 'household.html'));
const rd = (f) => fs.readFileSync(path.join(here, 'src', f), 'utf8');
const scripts = ['core.js', 'plan.js', 'i18n.js', 'store.js', 'files.js', 'charts.js', 'app.js'].map(rd).join('\n').replace(/<\/script/gi, '<\\/script');

const body = `<div class="layout">
  <aside class="nav" id="nav">
    <div class="brand"><span class="brand-mark" aria-hidden="true"></span><div><b id="brand-name">Conti di Casa</b><small id="brand-sub"></small></div></div>
    <nav id="nav-list" aria-label="Sezioni"></nav>
    <p class="status" id="status" role="status"></p>
  </aside>
  <div class="content">
    <div id="banner"></div>
    <main id="main"></main>
  </div>
</div>
<div id="modal" hidden></div>
<div id="tip" role="tooltip" hidden></div>
<input type="file" id="file-pick" hidden accept=".json,.csv,.xlsx,.pdf">
<noscript>Serve JavaScript attivo. / JavaScript is required.</noscript>`;

const style = `<style>\n${rd('style.css')}\n</style>`;
const script = `<script>\n${scripts}\n</script>`;
const html = artifact
  ? `<title>Conti di Casa</title>\n${style}\n${body}\n${script}\n`
  : `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>Conti di Casa</title>
${style}
</head>
<body>
${body}
${script}
</body>
</html>
`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('wrote', path.relative(process.cwd(), out), (html.length / 1024).toFixed(1) + ' KB');
