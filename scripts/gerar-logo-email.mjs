// Logo dos e-mails (public/marca/logo-email.png): o mesmo pino e o "edital map" do components/Logo.tsx, em PNG
// transparente 2x (360×80 para mostrar em 180×40), porque cliente de e-mail não mostra SVG direito.
// Precisa do Edge invisível na porta 9333 (veja scripts/capturas.mjs). Uso: node scripts/gerar-logo-email.mjs
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const html = `<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@700&display=block" rel="stylesheet">
<style>html,body{margin:0;background:transparent}
#logo{width:180px;height:40px;display:flex;align-items:center;gap:8px;font:700 26px/1 'Instrument Sans',Arial,sans-serif;letter-spacing:-0.02em;color:#0c2340}
svg{width:24px;height:31px;flex:none}</style></head><body>
<div id="logo"><svg viewBox="0 0 22 28"><path d="M11 0C4.9 0 0 4.9 0 11c0 8.3 11 17 11 17s11-8.7 11-17C22 4.9 17.1 0 11 0z" fill="#ff5a1f"/><path d="M15 0v6h6" fill="#b33a0e"/><circle cx="11" cy="11" r="3.5" fill="#f4f1e8"/></svg><span>edital map</span></div>
</body></html>`;

const navegador = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9333', defaultViewport: null });
const p = await navegador.newPage();
await p.setViewport({ width: 400, height: 100, deviceScaleFactor: 2 });
await p.setContent(html, { waitUntil: 'networkidle0' });
await p.evaluate(() => document.fonts.ready);
const familia = await p.evaluate(() => document.fonts.check("700 26px 'Instrument Sans'"));
if (!familia) throw new Error('Instrument Sans não carregou');
await mkdir('public/marca', { recursive: true });
const el = await p.$('#logo');
await el.screenshot({ path: 'public/marca/logo-email.png', omitBackground: true });
await p.close();
navegador.disconnect();
console.log('public/marca/logo-email.png');
