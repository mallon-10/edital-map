import type { Bloco, Guia, Termo } from '../../conteudo/tipos';
import { resolverSegmento, ufPorSlug } from '../seo/assuntos';
import { ehOficial, linksDoTexto, palavras } from './texto';

/**
 * Regras do conteúdo editorial (spec 2026-10-23-guias-glossario, seção 7). Cada função devolve a lista de problemas
 * em português; o teste em lib/guias/conteudo.test.ts exige lista vazia para todo guia e todo termo.
 */
export type Contexto = { guias: ReadonlySet<string>; termos: ReadonlySet<string>; hoje: string };

const FIXAS = new Set(['/', '/licitacoes', '/planos', '/alertas', '/cnpj', '/sobre', '/guias', '/glossario']);
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
/** Palavras de promessa que o conteúdo não usa (spec, seção 3). */
const PROMESSAS = /\b(garanta|garantimos|ganhe|ganhar com certeza|sucesso garantido)\b/i;

/** Páginas fixas, /licitacoes/{assunto|modalidade|uf} e /licitacoes/{assunto|modalidade}/{uf}. Cidade e órgão não. */
export function caminhoFixoExiste(caminho: string): boolean {
  if (FIXAS.has(caminho)) return true;
  const partes = caminho.split('/').filter(Boolean);
  if (partes[0] !== 'licitacoes' || partes.length < 2 || partes.length > 3) return false;
  const s = resolverSegmento(partes[1]);
  if (!s) return false;
  if (partes.length === 2) return true;
  return s.tipo !== 'uf' && ufPorSlug(partes[2]) !== null;
}

function caminhoExiste(c: string, ctx: Contexto): boolean {
  const guia = /^\/guias\/([^/]+)$/.exec(c);
  if (guia) return ctx.guias.has(guia[1]);
  const termo = /^\/glossario\/([^/]+)$/.exec(c);
  if (termo) return ctx.termos.has(termo[1]);
  return caminhoFixoExiste(c);
}

const textosDoBloco = (b: Bloco) => (b.tipo === 'paragrafo' ? [b.texto] : b.itens);

function problemasDeTextos(textos: string[], ctx: Contexto): string[] {
  const p: string[] = [];
  for (const t of textos) {
    for (const href of linksDoTexto(t)) if (!caminhoExiste(href, ctx)) p.push(`link interno inexistente: ${href}`);
    if (PROMESSAS.test(t)) p.push(`promessa no texto: "${t.slice(0, 60)}…"`);
  }
  return p;
}

export function problemasDoGuia(g: Guia, ctx: Contexto): string[] {
  const p: string[] = [];
  if (!SLUG.test(g.slug)) p.push(`slug fora do padrão: ${g.slug}`);
  if (g.descricao.length > 160) p.push(`descrição com ${g.descricao.length} caracteres (máx. 160)`);
  const n = palavras(g.resposta);
  if (n < 40 || n > 60) p.push(`resposta com ${n} palavras (40 a 60)`);
  if (!DATA.test(g.revisadoEm) || g.revisadoEm > ctx.hoje) p.push(`revisadoEm inválido ou no futuro: ${g.revisadoEm}`);
  if (g.secoes.length === 0) p.push('sem seções');
  for (const e of g.editais) if (!caminhoFixoExiste(e) || !e.startsWith('/licitacoes')) p.push(`editais com caminho inexistente: ${e}`);
  if (g.perguntas.length < 3 || g.perguntas.length > 6) p.push(`perguntas: ${g.perguntas.length} (3 a 6)`);
  if (g.fontes.length < 2) p.push(`fontes: ${g.fontes.length} (mínimo 2)`);
  for (const f of g.fontes) if (!ehOficial(f.url)) p.push(`fonte não oficial: ${f.url}`);
  for (const r of g.relacionados) if (!ctx.guias.has(r) || r === g.slug) p.push(`guia relacionado inexistente: ${r}`);
  const textos = [
    g.resposta,
    ...g.secoes.flatMap((s) => s.blocos.flatMap(textosDoBloco)),
    ...g.perguntas.flatMap((q) => [q.pergunta, q.resposta]),
  ];
  return [...p, ...problemasDeTextos(textos, ctx)];
}

export function problemasDoTermo(t: Termo, ctx: Contexto): string[] {
  const p: string[] = [];
  if (!SLUG.test(t.slug)) p.push(`slug fora do padrão: ${t.slug}`);
  const n = palavras(t.definicao);
  if (n < 40 || n > 60) p.push(`definição com ${n} palavras (40 a 60)`);
  for (const r of t.relacionados) if (!ctx.termos.has(r) || r === t.slug) p.push(`termo relacionado inexistente: ${r}`);
  if (t.guia && !ctx.guias.has(t.guia)) p.push(`guia inexistente: ${t.guia}`);
  return [...p, ...problemasDeTextos([t.definicao, ...(t.detalhe ? [t.detalhe] : [])], ctx)];
}
