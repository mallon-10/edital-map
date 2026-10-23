// Confere guias e termos de conteudo/ pelas regras de lib/guias/validar.ts.
// Uso: npx tsx scripts/conferir-conteudo.ts [arquivo.ts ...]   (sem arquivo: todos os de conteudo/guias e conteudo/glossario)
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SLUGS_GUIAS, SLUGS_TERMOS } from '../conteudo/slugs';
import type { Guia, Termo } from '../conteudo/tipos';
import { problemasDoGuia, problemasDoTermo } from '../lib/guias/validar';

const raiz = resolve(import.meta.dirname, '..');
const lista = (pasta: string) =>
  readdirSync(resolve(raiz, pasta)).filter((a) => a.endsWith('.ts') && !a.endsWith('.test.ts') && a !== 'index.ts').map((a) => resolve(raiz, pasta, a));
const arquivos = process.argv.length > 2 ? process.argv.slice(2).map((a) => resolve(a)) : [...lista('conteudo/guias'), ...lista('conteudo/glossario')];

const hoje = new Date().toISOString().slice(0, 10);
const ctx = { guias: new Set<string>(SLUGS_GUIAS), termos: new Set<string>(SLUGS_TERMOS), hoje };
let total = 0;
for (const arquivo of arquivos) {
  const m = (await import(pathToFileURL(arquivo).href)) as { guia?: Guia; termos?: Termo[] };
  const itens: Array<[string, string[]]> = [];
  if (m.guia) {
    if (!ctx.guias.has(m.guia.slug)) itens.push([m.guia.slug, ['slug fora de conteudo/slugs.ts']]);
    itens.push([`guia ${m.guia.slug}`, problemasDoGuia(m.guia, ctx)]);
  }
  for (const t of m.termos ?? []) {
    if (!ctx.termos.has(t.slug)) itens.push([t.slug, ['slug fora de conteudo/slugs.ts']]);
    itens.push([`termo ${t.slug}`, problemasDoTermo(t, ctx)]);
  }
  if (!m.guia && !m.termos) itens.push([arquivo, ['o arquivo não exporta `guia` nem `termos`']]);
  for (const [nome, problemas] of itens) {
    for (const p of problemas) console.log(`✗ ${nome}: ${p}`);
    total += problemas.length;
  }
}
console.log(total === 0 ? `OK: ${arquivos.length} arquivo(s) sem problema.` : `${total} problema(s).`);
process.exitCode = total === 0 ? 0 : 1;
