// Prévia dos e-mails (alertas, resumo semanal do Pro e código de acesso) com dados de exemplo inventados, para ver o
// visual sem mandar nada. Nada aqui vai para o banco nem para o Resend.
//   npx tsx scripts/previa-emails.ts <pasta> [--capturas]
// Grava alerta.html, resumo.html e codigo.html (com {{ .Token }} trocado por 482913) e os textos puros (.txt).
// O logo aponta para o site; até ele estar publicado, a prévia usa a cópia local (logo-email.png na mesma pasta).
// Com --capturas, tira PNGs em 600 e 375 px pelo Edge invisível na porta 9333 (veja scripts/capturas.mjs).
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { LOGO_EMAIL, montarEmail } from '../lib/alertas/email';
import { montarResumo, type EditalDoResumo, type ResumoSemanal } from '../lib/alertas/resumo';

const [pasta, ...opcoes] = process.argv.slice(2);
if (!pasta) {
  console.error('Uso: npx tsx scripts/previa-emails.ts <pasta> [--capturas]');
  process.exit(1);
}
const destino = resolve(pasta);
const AGORA = new Date('2026-10-19T10:00:00Z'); // segunda, 7h em Brasília
const emDias = (d: number, hora = 17) => new Date(Date.UTC(2026, 9, 19 + d, hora, 0)).toISOString();

const ed = (slug: string, objeto: string, orgao: string, municipio: string | null, uf: string, valor: number | null, dias: number, situacao = 1): EditalDoResumo => ({
  id: slug, slug, objeto, orgao_nome: orgao, municipio_nome: municipio, uf, valor_estimado: valor, encerramento_em: emDias(dias), situacao_id: situacao,
});

const EDITAIS: EditalDoResumo[] = [
  ed('00394452000103-2026-21982', 'Registro de preços para aquisição de luvas nitrílicas descartáveis para a Secretaria Municipal de Saúde', 'PREFEITURA MUNICIPAL DE JOINVILLE', 'Joinville', 'SC', 184_560.4, 1),
  ed('46395000000139-2026-1043', 'Aquisição de equipamentos de proteção individual (EPI) para os servidores da limpeza urbana', 'MUNICIPIO DE CAMPINAS', 'Campinas', 'SP', null, 6),
  ed('13937073000156-2026-388', 'Contratação de empresa para fornecimento de botinas de segurança com biqueira de composite', 'SECRETARIA DE ESTADO DA SAÚDE DA BAHIA', 'Salvador', 'BA', 92_300, 3, 4),
];
const UNIFORMES: EditalDoResumo[] = [
  ed('18715383000140-2026-77', 'Aquisição de uniformes escolares (camisetas, bermudas e agasalhos) para a rede municipal de ensino', 'PREFEITURA MUNICIPAL DE BELO HORIZONTE', 'Belo Horizonte', 'MG', 2_450_000, 12),
];

const alerta = montarEmail({
  secoes: [
    { nome: 'EPI <script>alert("x")</script> & luvas', editais: EDITAIS, total: 23, tokenSair: 'exemplo-alerta-1' },
    { nome: 'Uniformes escolares', editais: UNIFORMES, total: 1, tokenSair: 'exemplo-alerta-2' },
  ],
  tokenSairTodos: 'exemplo-todos',
  agora: AGORA,
});

const resumoDados: ResumoSemanal = {
  total: 48, novas: 14, prazoProximo: 6, valorTotal: 7_812_430.55, comValor: 37,
  novos: [EDITAIS[0], EDITAIS[1], UNIFORMES[0]],
  encerrando: [EDITAIS[2], ed('04034583000122-2026-512', 'Aquisição de óculos de proteção e protetores auriculares tipo plug', 'MUNICIPIO DE UBERLANDIA', 'Uberlândia', 'MG', 38_900, 5)],
  orgaos: [
    { nome: 'PREFEITURA MUNICIPAL DE JOINVILLE', uf: 'SC', qtd: 7, valor: 612_000 },
    { nome: 'SECRETARIA DE ESTADO DA SAÚDE DA BAHIA', uf: 'BA', qtd: 5, valor: 1_180_500 },
    { nome: 'MUNICIPIO DE CAMPINAS', uf: 'SP', qtd: 3, valor: 0 },
  ],
  cidades: [
    { nome: 'Joinville', uf: 'SC', qtd: 9 },
    { nome: 'Salvador', uf: 'BA', qtd: 6 },
    { nome: 'Campinas', uf: 'SP', qtd: 4 },
    { nome: 'Uberlândia', uf: 'MG', qtd: 2 },
  ],
};
const resumo = montarResumo(resumoDados, 'exemplo-resumo', AGORA);
const codigo = (await readFile('supabase/templates/codigo.html', 'utf8')).replaceAll('{{ .Token }}', '482913');

const local = (html: string) => html.replaceAll(LOGO_EMAIL, 'logo-email.png');
await mkdir(destino, { recursive: true });
await copyFile('public/marca/logo-email.png', join(destino, 'logo-email.png'));
const arquivos: [string, string][] = [['alerta', local(alerta.html)], ['resumo', local(resumo.html)], ['codigo', local(codigo)]];
for (const [nome, html] of arquivos) await writeFile(join(destino, `${nome}.html`), html);
await writeFile(join(destino, 'alerta.txt'), `Assunto: ${alerta.assunto}\n\n${alerta.texto}\n`);
await writeFile(join(destino, 'resumo.txt'), `Assunto: ${resumo.assunto}\n\n${resumo.texto}\n`);
console.log(`Prévias em ${destino}`);

if (opcoes.includes('--capturas')) {
  const { default: puppeteer } = await import('puppeteer-core');
  const navegador = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9333', defaultViewport: null });
  for (const [nome] of arquivos) {
    for (const largura of [600, 375]) {
      const p = await navegador.newPage();
      await p.setViewport({ width: largura, height: 800, deviceScaleFactor: 1 });
      await p.goto(pathToFileURL(join(destino, `${nome}.html`)).href, { waitUntil: 'networkidle0', timeout: 30000 });
      await p.evaluate(() => document.fonts.ready);
      await p.screenshot({ path: join(destino, `${nome}-${largura}.png`) as `${string}.png`, fullPage: true });
      await p.close();
      console.log(`${nome}-${largura}.png`);
    }
  }
  navegador.disconnect();
}
