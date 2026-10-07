// Gera pagina/index.html (arquivo único, sem dependências) a partir de src/.
// Uso: node src/build.js            -> página completa (com <!doctype>, para hospedar)
//      node src/build.js --fragment -> também gera o fragmento usado na prévia do Artifact
const fs = require('fs'), path = require('path');
const dir = __dirname, out = path.join(dir, '..');
const rows = require('./demo-catalog').rows();
const body = fs.readFileSync(path.join(dir, 'index.template.html'), 'utf8')
  .replace('/*STYLES*/', () => fs.readFileSync(path.join(dir, 'styles.css'), 'utf8')
    .replace('/*BANNER*/', 'data:image/jpeg;base64,' + fs.readFileSync(path.join(dir, 'assets', 'banner-combo-vitalicio.jpeg')).toString('base64')))
  .replace('/*DEMO_ROWS*/', () => JSON.stringify(rows).replace(/</g, '\\u003c'))
  .replace('/*ENGINE*/', () => fs.readFileSync(path.join(dir, 'engine.js'), 'utf8'))
  .replace('/*APP*/', () => fs.readFileSync(path.join(dir, 'app.js'), 'utf8'));
const full = `<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${body.replace('<div class="wrap">', '</head>\n<body>\n<div class="wrap">')}\n</body>\n</html>\n`;
fs.writeFileSync(path.join(out, 'index.html'), full);
if (process.argv.includes('--fragment')) fs.writeFileSync(process.argv[process.argv.indexOf('--fragment') + 1] || path.join(dir, 'fragment.html'), body);
console.log('ok', full.length, 'bytes');
