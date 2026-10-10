// Builds the household finance tool into one HTML file that opens offline in any browser.
// Usage: node household/build.js [output, default dist/household.html] [--artifact]
// --artifact leaves out <html>/<head>/<body>, for hosts that wrap the page in their own skeleton.
const fs = require('fs');
const path = require('path');
const here = __dirname;
const args = process.argv.slice(2);
const artifact = args.includes('--artifact');
const out = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(here, '..', 'dist', 'household.html'));
const rd = (f) => fs.readFileSync(path.join(here, 'src', f), 'utf8');
const scripts = ['core.js', 'i18n.js', 'store.js', 'files.js', 'app.js'].map(rd).join('\n').replace(/<\/script/gi, '<\\/script');

const body = `<div class="app">
  <header class="top"><div><h1 id="app-name">I nostri conti</h1><p id="app-tag"></p></div><div id="status" role="status"></div></header>
  <div id="banner"></div>
  <nav class="tabs" id="tabs" role="tablist"></nav>
  <main id="main"></main>
</div>
<div id="modal" hidden></div>
<input type="file" id="file-pick" hidden accept=".json,.csv,.xlsx,.pdf">
<noscript>Serve JavaScript attivo. / JavaScript is required.</noscript>`;

const style = `<style>\n${rd('style.css')}\n</style>`;
const script = `<script>\n${scripts}\n</script>`;
const html = artifact
  ? `<title>I nostri conti</title>\n${style}\n${body}\n${script}\n`
  : `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>I nostri conti</title>
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
