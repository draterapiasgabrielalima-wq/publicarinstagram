#!/usr/bin/env node
// Exporta os materiais HTML da skill para PDF e/ou PNG.
// Uso:
//   node exportar.js arquivo.html --pdf        -> PDF A4 (plano de tratamento, manual)
//   node exportar.js arquivo.html --png        -> um PNG 1080x1350 por .wa-card (WhatsApp)
//   node exportar.js arquivo.html --pdf --png  -> ambos
// Saída: mesma pasta do HTML.
const path = require('path');
const { pathToFileURL } = require('url');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.error('Playwright não encontrado. Abra o HTML no navegador e use Imprimir > Salvar como PDF.'); process.exit(1); }

(async () => {
  const args = process.argv.slice(2);
  const file = args.find(a => !a.startsWith('--'));
  if (!file) { console.error('Informe o arquivo .html'); process.exit(1); }
  let pdf = args.includes('--pdf'); const png = args.includes('--png');
  if (!pdf && !png) pdf = true;
  const src = path.resolve(file);
  const base = src.replace(/\.html?$/i, '');
  // Garante que a pasta da marca (logos) esteja ao lado do HTML, pois os modelos usam src="marca/..."
  const fs = require('fs');
  const marcaSkill = path.join(__dirname, '..', 'assets', 'marca');
  const marcaLocal = path.join(path.dirname(src), 'marca');
  if (!fs.existsSync(marcaLocal) && fs.existsSync(marcaSkill)) fs.cpSync(marcaSkill, marcaLocal, { recursive: true });
  const fotosSkill = path.join(__dirname, '..', 'assets', 'fotos');
  const fotosLocal = path.join(path.dirname(src), 'fotos');
  if (!fs.existsSync(fotosLocal) && fs.existsSync(fotosSkill)) fs.cpSync(fotosSkill, fotosLocal, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2 });
  await page.goto(pathToFileURL(src).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const out = [];
  if (png) {
    const cards = await page.$$('.wa-card');
    if (!cards.length) { await page.screenshot({ path: base + '.png', fullPage: true }); out.push(base + '.png'); }
    for (let i = 0; i < cards.length; i++) {
      const f = `${base}-${String(i + 1).padStart(2, '0')}.png`;
      await cards[i].screenshot({ path: f }); out.push(f);
    }
  }
  if (pdf) {
    await page.emulateMedia({ media: 'print' });
    await page.pdf({ path: base + '.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true });
    out.push(base + '.pdf');
  }
  await browser.close();
  out.forEach(f => console.log(f));
})();
