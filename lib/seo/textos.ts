import { NOMES_UF } from '../estados';
import { data, moeda, numero } from '../formato';
import { modalidadeCurta } from '../participacao';
import { assunto, nomeProprio } from '../texto';
import type { Edital } from '../tipos';
import { UFS_BRASIL } from '../eventos';
import { ASSUNTOS, type Assunto, naUf, SEGMENTO_ORGAO } from './assuntos';
import { type Modalidade, MODALIDADES } from './modalidades';
import { url } from './site';

/** Órgão com página própria (lib/seo/orgaos.ts): nome já limpo; cidade com página, quando houver. */
export type OrgaoDaPagina = {
  cnpj: string; nome: string; slug: string; uf: string; ibge: string | null; cidadeNome: string | null; cidadeSlug: string | null;
};

/**
 * Uma página de /licitacoes: Brasil (nada), só UF, assunto ou modalidade (no Brasil ou na UF), cidade (com a UF) ou
 * órgão (com a UF dele). Assunto e modalidade nunca vêm juntos.
 */
export type Pagina = {
  assunto: Assunto | null;
  uf: string | null;
  cidade?: { ibge: string; nome: string; slug: string } | null;
  modalidade?: Modalidade | null;
  orgao?: OrgaoDaPagina | null;
};

export function caminhoDaPagina(p: Pagina): string {
  if (p.orgao) return `/licitacoes/${SEGMENTO_ORGAO}/${p.orgao.slug}`;
  if (p.cidade && p.uf) return `/licitacoes/${p.uf.toLowerCase()}/${p.cidade.slug}`;
  const partes = ['/licitacoes'];
  if (p.assunto) partes.push(p.assunto.slug);
  else if (p.modalidade) partes.push(p.modalidade.slug);
  if (p.uf) partes.push(p.uf.toLowerCase());
  return partes.join('/');
}

const onde = (p: Pagina) => (p.cidade && p.uf ? `em ${p.cidade.nome} (${p.uf})` : p.uf ? naUf(p.uf) : 'no Brasil');
const de = (p: Pagina) => (p.assunto ? ` de ${p.assunto.nome}` : p.modalidade ? ` de ${p.modalidade.nome}` : '');
const maiuscula = (s: string) => s.replace(/^./, (c) => c.toUpperCase());
/** "Universidade de São Paulo (São Paulo/SP)"; sem cidade, "(SP)". */
const orgaoComLocal = (o: OrgaoDaPagina) => `${o.nome} (${o.cidadeNome ? `${o.cidadeNome}/${o.uf}` : o.uf})`;

/** H1 da página. */
export function tituloDaPagina(p: Pagina): string {
  if (p.orgao) return `Licitações abertas: ${p.orgao.nome}`;
  if (p.modalidade) return `${maiuscula(p.modalidade.nome)}: licitações abertas ${onde(p)}`;
  return `Licitações${de(p)} abertas ${onde(p)}`;
}

/** Título da aba e do Google: na cidade cita a prefeitura ("licitações prefeitura de X"); nas outras, o H1. */
export function tituloSeoDaPagina(p: Pagina): string {
  return p.cidade && !p.orgao ? `${tituloDaPagina(p)} · Prefeitura e órgãos` : tituloDaPagina(p);
}

/** "1.234 editais de EPI abertos na Bahia" / "1 edital aberto em São Paulo" / "Nenhum edital de EPI aberto no Brasil agora". */
function contagem(p: Pagina, total: number): string {
  if (p.orgao) {
    const o = orgaoComLocal(p.orgao);
    if (total === 0) return `${o}: nenhum edital aberto agora`;
    return total === 1 ? `${o}: 1 edital aberto` : `${o}: ${numero(total)} editais abertos`;
  }
  if (total === 0) return `Nenhum edital${de(p)} aberto ${onde(p)} agora`;
  return total === 1 ? `1 edital${de(p)} aberto ${onde(p)}` : `${numero(total)} editais${de(p)} abertos ${onde(p)}`;
}

export function descricaoDaPagina(p: Pagina, total: number): string {
  if (total === 0) return `${contagem(p, 0)}. O Edital Map mostra as licitações do PNCP no mapa, atualizadas a cada 3 horas.`;
  const prefeitura = p.cidade && !p.orgao ? `, da Prefeitura de ${p.cidade.nome} e de outros órgãos da cidade` : '';
  return `${contagem(p, total)}${prefeitura}, direto do PNCP e atualizados a cada 3 horas. Veja prazos, valores e órgãos no mapa.`;
}

export function introDaPagina(p: Pagina, total: number): string {
  const busca = p.assunto ? ` A busca inclui termos parecidos com "${p.assunto.termo}", no objeto e nos itens do edital.` : '';
  if (total === 0) return `${contagem(p, 0)}. Os editais chegam do PNCP (Portal Nacional de Contratações Públicas) a cada 3 horas.${busca}`;
  const ordem = p.assunto ? `os que mais falam de ${p.assunto.nome}` : 'os que encerram antes';
  return `${contagem(p, total)} no PNCP (Portal Nacional de Contratações Públicas), com prazo para enviar proposta. A lista é atualizada a cada 3 horas e mostra primeiro ${ordem}.${busca}`;
}

/** Link "Ver todos no mapa": a mesma busca na página inicial . */
export function buscaDaPagina(p: Pagina): string {
  const q = new URLSearchParams();
  if (p.orgao) {
    q.set('orgao', p.orgao.cnpj);
    return `/?${q.toString()}`;
  }
  if (p.assunto) q.set('q', p.assunto.termo);
  if (p.uf) q.set('uf', p.uf);
  if (p.cidade) q.set('municipio', p.cidade.ibge);
  if (p.modalidade) q.set('modalidades', String(p.modalidade.id));
  const t = q.toString();
  return t ? `/?${t}` : '/';
}

export function migalhas(p: Pagina): Array<{ nome: string; caminho: string }> {
  const itens = [{ nome: 'Início', caminho: '/' }, { nome: 'Licitações', caminho: '/licitacoes' }];
  if (p.orgao) {
    itens.push({ nome: NOMES_UF[p.orgao.uf], caminho: caminhoDaPagina({ assunto: null, uf: p.orgao.uf }) });
    itens.push({ nome: p.orgao.nome, caminho: caminhoDaPagina(p) });
    return itens;
  }
  if (p.assunto) itens.push({ nome: maiuscula(p.assunto.nome), caminho: caminhoDaPagina({ assunto: p.assunto, uf: null }) });
  if (p.modalidade) {
    itens.push({ nome: maiuscula(p.modalidade.nome), caminho: caminhoDaPagina({ assunto: null, modalidade: p.modalidade, uf: null }) });
  }
  if (p.uf) itens.push({ nome: NOMES_UF[p.uf], caminho: caminhoDaPagina({ assunto: p.assunto, modalidade: p.modalidade, uf: p.uf }) });
  if (p.cidade && p.uf) itens.push({ nome: p.cidade.nome, caminho: caminhoDaPagina(p) });
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

export type Vizinho = { nome: string; caminho: string; total: number | null };

/**
 * Links da página para as vizinhas. `porUf` (contagem do assunto ou da modalidade por UF) esconde as UFs vazias;
 * null = mostra todas. `extras` (órgão): os outros órgãos da UF, no fim. O índice /licitacoes monta as próprias seções.
 */
export function vizinhos(p: Pagina, porUf: Record<string, number> | null, extras: Vizinho[] = []): Vizinho[] {
  const assuntos = (uf: string | null) =>
    ASSUNTOS.map((a) => ({ nome: maiuscula(a.nome), caminho: caminhoDaPagina({ assunto: a, uf }), total: null }));
  const modalidades = (uf: string | null, menos: Modalidade | null = null) =>
    MODALIDADES.filter((m) => m !== menos).map((m) => ({
      nome: maiuscula(m.nome), caminho: caminhoDaPagina({ assunto: null, modalidade: m, uf }), total: null,
    }));
  const ufs = (base: Pick<Pagina, 'assunto' | 'modalidade'>) =>
    ufsPorNome()
      .filter((uf) => !porUf || (porUf[uf] ?? 0) > 0)
      .map((uf) => ({ nome: NOMES_UF[uf], caminho: caminhoDaPagina({ ...base, uf }), total: porUf ? (porUf[uf] ?? 0) : null }));
  const tudoNaUf = (uf: string) => ({ nome: `Tudo ${naUf(uf)}`, caminho: caminhoDaPagina({ assunto: null, uf }), total: null });
  if (p.orgao) {
    const o = p.orgao;
    const cidade = o.cidadeSlug && o.cidadeNome
      ? [{ nome: `Licitações em ${o.cidadeNome}`, caminho: `/licitacoes/${o.uf.toLowerCase()}/${o.cidadeSlug}`, total: null }]
      : [];
    return [...cidade, tudoNaUf(o.uf), ...extras];
  }
  if (p.cidade && p.uf) return [tudoNaUf(p.uf), ...assuntos(p.uf)];
  if (p.modalidade && p.uf) {
    return [
      { nome: `${maiuscula(p.modalidade.nome)} no Brasil`, caminho: caminhoDaPagina({ assunto: null, modalidade: p.modalidade, uf: null }), total: null },
      tudoNaUf(p.uf),
      ...modalidades(p.uf, p.modalidade),
    ];
  }
  if (p.assunto && p.uf) {
    return [
      { nome: `${maiuscula(p.assunto.nome)} no Brasil`, caminho: caminhoDaPagina({ assunto: p.assunto, uf: null }), total: null },
      tudoNaUf(p.uf),
    ];
  }
  if (p.modalidade) return ufs({ assunto: null, modalidade: p.modalidade });
  if (p.assunto) return ufs({ assunto: p.assunto });
  if (p.uf) return [...assuntos(p.uf), ...modalidades(p.uf)];
  return [];
}

/** Mesma regra de public.em_aberto (0011): prazo no futuro e situação diferente de Revogada (2) e Anulada (3). */
export function editalAberto(e: { encerramento_em: string | null; situacao_id: number | null }, agora: Date): boolean {
  if (!e.encerramento_em || Date.parse(e.encerramento_em) <= agora.getTime()) return false;
  return e.situacao_id !== 2 && e.situacao_id !== 3;
}

const MAX_DESCRICAO = 160;
/** O assunto no título do edital; a modalidade e a cidade vêm sempre depois, mesmo cortando o assunto. */
const MAX_ASSUNTO_TITULO = 60;

/**
 * Título do edital para o Google: "Luvas nitrílicas · Pregão em Salvador/BA". A busca típica é
 * "pregão/licitação de X em cidade"; o h1 da página continua só com o assunto.
 */
export function tituloDoEdital(e: Pick<Edital, 'objeto' | 'modalidade_nome' | 'municipio_nome' | 'uf'>): string {
  let t = assunto(e.objeto).titulo;
  if (t.length > MAX_ASSUNTO_TITULO) {
    const espaco = t.lastIndexOf(' ', MAX_ASSUNTO_TITULO);
    t = `${t.slice(0, espaco > 20 ? espaco : MAX_ASSUNTO_TITULO).replace(/[s,;:.–-]+$/, '')}…`;
  }
  const modalidade = e.modalidade_nome?.split(' - ')[0].trim() || 'Licitação';
  const onde = e.municipio_nome ? `em ${e.municipio_nome}/${e.uf}` : `em ${e.uf}`;
  return `${t} · ${modalidade} ${onde}`;
}

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
