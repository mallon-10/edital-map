import { NOMES_UF } from '../estados';
import { data, moeda, numero } from '../formato';
import { modalidadeCurta } from '../participacao';
import { nomeProprio } from '../texto';
import type { Edital } from '../tipos';
import { UFS_BRASIL } from '../eventos';
import { ASSUNTOS, type Assunto, naUf } from './assuntos';
import { url } from './site';

/** Uma página de /licitacoes: Brasil (nada), só UF, só assunto ou assunto na UF. */
export type Pagina = { assunto: Assunto | null; uf: string | null };

export function caminhoDaPagina(p: Pagina): string {
  const partes = ['/licitacoes'];
  if (p.assunto) partes.push(p.assunto.slug);
  if (p.uf) partes.push(p.uf.toLowerCase());
  return partes.join('/');
}

const onde = (p: Pagina) => (p.uf ? naUf(p.uf) : 'no Brasil');
const de = (p: Pagina) => (p.assunto ? ` de ${p.assunto.nome}` : '');
const maiuscula = (s: string) => s.replace(/^./, (c) => c.toUpperCase());

export function tituloDaPagina(p: Pagina): string {
  return `Licitações${de(p)} abertas ${onde(p)}`;
}

/** "1.234 editais de EPI abertos na Bahia" / "1 edital aberto em São Paulo" / "Nenhum edital de EPI aberto no Brasil agora". */
function contagem(p: Pagina, total: number): string {
  if (total === 0) return `Nenhum edital${de(p)} aberto ${onde(p)} agora`;
  return total === 1 ? `1 edital${de(p)} aberto ${onde(p)}` : `${numero(total)} editais${de(p)} abertos ${onde(p)}`;
}

export function descricaoDaPagina(p: Pagina, total: number): string {
  if (total === 0) return `${contagem(p, 0)}. O Edital Map mostra as licitações do PNCP no mapa, atualizadas a cada 3 horas.`;
  return `${contagem(p, total)}, direto do PNCP e atualizados a cada 3 horas. Veja prazos, valores e órgãos no mapa.`;
}

export function introDaPagina(p: Pagina, total: number): string {
  const busca = p.assunto ? ` A busca inclui termos parecidos com "${p.assunto.termo}", no objeto e nos itens do edital.` : '';
  if (total === 0) return `${contagem(p, 0)}. Os editais chegam do PNCP (Portal Nacional de Contratações Públicas) a cada 3 horas.${busca}`;
  const ordem = p.assunto ? `os que mais falam de ${p.assunto.nome}` : 'os que encerram antes';
  return `${contagem(p, total)} no PNCP (Portal Nacional de Contratações Públicas), com prazo para enviar proposta. A lista é atualizada a cada 3 horas e mostra primeiro ${ordem}.${busca}`;
}

/** Link "Ver todos no mapa": a mesma busca na página inicial (conta como busca quando a pessoa chega lá). */
export function buscaDaPagina(p: Pagina): string {
  const q = new URLSearchParams();
  if (p.assunto) q.set('q', p.assunto.termo);
  if (p.uf) q.set('uf', p.uf);
  const t = q.toString();
  return t ? `/?${t}` : '/';
}

export function migalhas(p: Pagina): Array<{ nome: string; caminho: string }> {
  const itens = [{ nome: 'Início', caminho: '/' }, { nome: 'Licitações', caminho: '/licitacoes' }];
  if (p.assunto) itens.push({ nome: maiuscula(p.assunto.nome), caminho: caminhoDaPagina({ assunto: p.assunto, uf: null }) });
  if (p.uf) itens.push({ nome: NOMES_UF[p.uf], caminho: caminhoDaPagina(p) });
  return itens;
}

export function jsonLdMigalhas(itens: Array<{ nome: string; caminho: string }>): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: itens.map((i, n) => ({ '@type': 'ListItem', position: n + 1, name: i.nome, item: url(i.caminho) })),
  };
}

const ufsPorNome = () => [...UFS_BRASIL].sort((a, b) => NOMES_UF[a].localeCompare(NOMES_UF[b], 'pt-BR'));

/** Links da página para as vizinhas. `porUf` (contagem do assunto por UF) esconde as UFs vazias; null = mostra todas. */
export function vizinhos(p: Pagina, porUf: Record<string, number> | null): Array<{ nome: string; caminho: string; total: number | null }> {
  const assuntos = (uf: string | null) =>
    ASSUNTOS.map((a) => ({ nome: maiuscula(a.nome), caminho: caminhoDaPagina({ assunto: a, uf }), total: null }));
  const ufs = (assunto: Pagina['assunto']) =>
    ufsPorNome()
      .filter((uf) => !porUf || (porUf[uf] ?? 0) > 0)
      .map((uf) => ({ nome: NOMES_UF[uf], caminho: caminhoDaPagina({ assunto, uf }), total: porUf ? (porUf[uf] ?? 0) : null }));
  if (p.assunto && p.uf) {
    return [
      { nome: `${maiuscula(p.assunto.nome)} no Brasil`, caminho: caminhoDaPagina({ assunto: p.assunto, uf: null }), total: null },
      { nome: `Tudo ${naUf(p.uf)}`, caminho: caminhoDaPagina({ assunto: null, uf: p.uf }), total: null },
    ];
  }
  if (p.assunto) return ufs(p.assunto);
  if (p.uf) return assuntos(p.uf);
  return [...assuntos(null), ...ufs(null)];
}

/** Mesma regra de public.em_aberto (0011): prazo no futuro e situação diferente de Revogada (2) e Anulada (3). */
export function editalAberto(e: { encerramento_em: string | null; situacao_id: number | null }, agora: Date): boolean {
  if (!e.encerramento_em || Date.parse(e.encerramento_em) <= agora.getTime()) return false;
  return e.situacao_id !== 2 && e.situacao_id !== 3;
}

const MAX_DESCRICAO = 160;

export function descricaoDoEdital(e: Edital): string {
  const partes = [
    nomeProprio(e.orgao_nome),
    `${e.municipio_nome ?? '—'}/${e.uf}`,
    modalidadeCurta(e.modalidade_nome),
    e.encerramento_em ? `propostas até ${data(e.encerramento_em)}` : null,
    moeda(e.valor_estimado) ?? 'Valor não informado',
  ].filter(Boolean);
  const t = partes.join(' · ');
  return t.length <= MAX_DESCRICAO ? t : `${t.slice(0, MAX_DESCRICAO - 1)}…`;
}

/** Parâmetros que formam uma busca na página inicial (lib/urlBusca.ts); utm_*, gclid e afins não contam. */
const PARAMETROS_BUSCA = ['q', 'uf', 'municipio', 'valor', 'modalidades', 'orgao', 'raio', 'dias', 'ordem', 'pagina', 'vista', 'tela'];

export function temBusca(params: Record<string, string | string[] | undefined>): boolean {
  return PARAMETROS_BUSCA.some((k) => params[k] !== undefined);
}
