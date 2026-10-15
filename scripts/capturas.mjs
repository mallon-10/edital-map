// Capturas de tela para verificação visual.
// 1. Suba o site (npm run dev, ou use a URL publicada).
// 2. Abra um Edge invisível com porta de depuração (PowerShell):
//    Start-Process "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe" -ArgumentList '--headless=new','--remote-debugging-port=9333',"--user-data-dir=$env:TEMP\edge-capturas",'--use-angle=swiftshader','--enable-unsafe-swiftshader','about:blank' -WindowStyle Hidden
// 3. node scripts/capturas.mjs http://localhost:3000 <slug-de-um-edital>
// As imagens ficam em .capturas/ (fora do git). Feche o Edge depois.
// Com CAPTURAS_INTERNO=1 as visitas saem marcadas como internas (não entram nas métricas do portão).
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const [base = 'http://localhost:3000', slug] = process.argv.slice(2);
const paginas = [['inicio', '/'], ['alertas', '/alertas'], ['sobre', '/sobre']];
if (slug) paginas.push(['edital', `/edital/${slug}`]);

const navegador = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9333', defaultViewport: null });
await mkdir('.capturas', { recursive: true });
for (const [largura, altura, tela] of [[1440, 1000, 'computador'], [390, 844, 'celular']]) {
  for (const [nome, caminho] of paginas) {
    const p = await navegador.newPage();
    await p.setViewport({ width: largura, height: altura });
    const erros = [];
    p.on('pageerror', (e) => erros.push(e.message));
    p.on('console', async (m) => {
      if (m.type() !== 'error') return;
      // console.error(new Error(...)) chega como "JSHandle@error": lê a mensagem do objeto.
      const partes = await Promise.all(m.args().map((a) => a.evaluate((x) => (x instanceof Error ? x.message : String(x))).catch(() => '')));
      erros.push(partes.filter(Boolean).join(' ') || m.text());
    });
    // CAPTURAS_INTERNO=1: marca o visitante como interno (cookie em_interno), para as visitas e cliques
    // da captura não entrarem nas métricas do portão.
    if (process.env.CAPTURAS_INTERNO === '1') await p.setCookie({ name: 'em_interno', value: '1', url: base });
    const inicio = Date.now();
    await p.goto(base + caminho, { waitUntil: 'load', timeout: 90000 });
    const ms = Date.now() - inicio;
    // Revalidação de cache em segundo plano e prefetch de links podem manter a rede "ocupada" por 30 s ou mais
    // (networkidle0 chegava a estourar o tempo no site em produção): espera ociosidade por até 8 s, sem travar.
    await p.waitForNetworkIdle({ idleTime: 1000, timeout: 8000 }).catch(() => undefined);
    if (nome === 'inicio') {
      await p.waitForSelector('.maplibregl-canvas', { timeout: 30000 }).catch(() => erros.push('mapa não apareceu'));
    }
    await new Promise((r) => setTimeout(r, 2500));
    await p.screenshot({ path: `.capturas/${nome}-${tela}.png`, fullPage: nome !== 'inicio' });
    console.log(`${nome} ${tela}: ${ms} ms${erros.length ? ` · erros: ${erros.join(' | ')}` : ''}`);
    await p.close();
  }
}
navegador.disconnect();
