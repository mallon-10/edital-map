import { moeda, numero } from '../formato';
import { url } from '../seo/site';
import { nomeProprio } from '../texto';
import { cabecalhosDescadastro, editalHtml, editalTexto, escapar, linkSair, moldura, umaLinha, type EditalDoEmail, type EmailMontado } from './email';

/**
 * Resumo semanal do Pro (segunda às 7h): números da semana no Meu Radar, os novos (até 10), os que encerram em 7 dias
 * (até 5), o valor estimado somado (só os com valor informado, dizendo de quantos) e os órgãos e cidades com mais
 * editais abertos no radar. Só o que veio do banco (resumo_do_radar, 0016); sem novidade, o job não manda.
 * Puro: o job cria o token de descadastro ('resumo'), monta e envia. Tudo que vem do PNCP é escapado no HTML e sai em
 * uma linha só no texto.
 */

export type EditalDoResumo = EditalDoEmail & { id: string };
export type OrgaoResumo = { nome: string; uf: string; qtd: number; valor: number };
export type CidadeResumo = { nome: string; uf: string; qtd: number };
export type ResumoSemanal = {
  total: number;
  novas: number;
  prazoProximo: number;
  valorTotal: number;
  comValor: number;
  novos: EditalDoResumo[];
  encerrando: EditalDoResumo[];
  orgaos: OrgaoResumo[];
  cidades: CidadeResumo[];
};

// Tetos do resumo_do_radar (limit 10, 5, 5, 5): o e-mail não passa disso mesmo que a resposta venha maior.
const MAX_NOVOS = 10;
const MAX_ENCERRANDO = 5;
const MAX_ORGAOS = 5;
const MAX_CIDADES = 5;

const SLUG = /^[A-Za-z0-9._-]{1,120}$/;
const UF = /^[A-Za-z]{2}$/;

type Obj = Record<string, unknown>;
const ehObjeto = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null);
/** Contagem/valor do banco: número finito e não negativo. Qualquer outra coisa: null. */
const contagem = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);

/** Cada entrada da lista passa por `ler`; as malformadas são puladas (nunca viram "undefined" no e-mail). */
function lista<T>(v: unknown, ler: (o: Obj) => T | null, max: number): T[] {
  if (!Array.isArray(v)) return [];
  const saida: T[] = [];
  for (const o of v) {
    if (saida.length >= max) break;
    if (!ehObjeto(o)) continue;
    const x = ler(o);
    if (x !== null) saida.push(x);
  }
  return saida;
}

function edital(l: Obj): EditalDoResumo | null {
  const id = texto(l.id);
  const slug = texto(l.slug);
  const objeto = texto(l.objeto);
  const orgao = texto(l.orgao_nome);
  const uf = texto(l.uf);
  const fim = texto(l.encerramento_em);
  if (!id || !slug || !SLUG.test(slug) || !objeto || !orgao || !uf || !UF.test(uf) || !fim || Number.isNaN(Date.parse(fim))) return null;
  const valor = l.valor_estimado == null || l.valor_estimado === '' ? null : Number(l.valor_estimado);
  return {
    id,
    slug,
    objeto,
    orgao_nome: orgao,
    municipio_nome: texto(l.municipio_nome),
    uf,
    valor_estimado: valor !== null && Number.isFinite(valor) ? valor : null,
    encerramento_em: fim,
    situacao_id: typeof l.situacao_id === 'number' && Number.isFinite(l.situacao_id) ? l.situacao_id : null,
  };
}

function orgao(o: Obj): OrgaoResumo | null {
  const nome = texto(o.nome);
  const uf = texto(o.uf);
  const qtd = contagem(o.qtd);
  if (!nome || !uf || !UF.test(uf) || qtd === null || qtd < 1) return null;
  return { nome, uf, qtd, valor: contagem(o.valor) ?? 0 };
}

function cidade(c: Obj): CidadeResumo | null {
  const nome = texto(c.nome);
  const uf = texto(c.uf);
  const qtd = contagem(c.qtd);
  if (!nome || !uf || !UF.test(uf) || qtd === null || qtd < 1) return null;
  return { nome, uf, qtd };
}

/**
 * JSON de resumo_do_radar → resumo. Nulo (radar sem termo válido), lixo ou sem as cinco contagens: null. Nunca lança.
 * Listas ausentes ou fora do formato viram vazias; entradas malformadas são puladas.
 */
export function resumoDaResposta(v: unknown): ResumoSemanal | null {
  try {
    if (!ehObjeto(v)) return null;
    const total = contagem(v.total);
    const novas = contagem(v.novas);
    const prazoProximo = contagem(v.prazo_proximo);
    const valorTotal = contagem(v.valor_total);
    const comValor = contagem(v.com_valor);
    if (total === null || novas === null || prazoProximo === null || valorTotal === null || comValor === null) return null;
    return {
      total,
      novas,
      prazoProximo,
      valorTotal,
      comValor,
      novos: lista(v.novos, edital, MAX_NOVOS),
      encerrando: lista(v.encerrando, edital, MAX_ENCERRANDO),
      orgaos: lista(v.orgaos, orgao, MAX_ORGAOS),
      cidades: lista(v.cidades, cidade, MAX_CIDADES),
    };
  } catch {
    return null;
  }
}

export function temNovidade(r: ResumoSemanal): boolean {
  return r.novas > 0 || r.prazoProximo > 0;
}

const plural = (q: number, um: string, varios: string) => (q === 1 ? `1 ${um}` : `${numero(q)} ${varios}`);

export function assuntoDoResumo(r: ResumoSemanal): string {
  return umaLinha(
    r.novas > 0
      ? `Sua semana no Edital Map: ${plural(r.novas, 'edital novo', 'editais novos')} no seu radar`
      : `Sua semana no Edital Map: ${plural(r.prazoProximo, 'edital encerra', 'editais encerram')} em até 7 dias`,
  );
}

const textoValor = (r: ResumoSemanal) =>
  r.comValor > 0
    ? `Valor estimado somado: ${moeda(r.valorTotal) ?? 'Valor não informado'} (soma de ${plural(r.comValor, 'edital', 'editais')} com valor informado)`
    : 'Valor estimado: não informado nos editais abertos';
// umaLinha só no nome: aplicada ao valor, tiraria o espaço inseparável do R$.
const textoOrgao = (o: OrgaoResumo) => `${umaLinha(nomeProprio(o.nome))} (${o.uf}) · ${plural(o.qtd, 'edital aberto', 'editais abertos')}${moeda(o.valor) ? ` · ${moeda(o.valor)}` : ''}`;
const textoCidade = (c: CidadeResumo) => `${umaLinha(c.nome)}/${c.uf} · ${plural(c.qtd, 'edital aberto', 'editais abertos')}`;

const H2 = 'margin:20px 0 4px;font-size:17px;color:#0c2340;';
const P = 'margin:4px 0;font-size:14px;color:#0c2340;';

export function montarResumo(r: ResumoSemanal, tokenSair: string): EmailMontado {
  const radar = url('/radar');
  const alertas = url('/alertas');
  const numeros = [
    `Editais novos na semana: <strong>${numero(r.novas)}</strong>`,
    `Encerram em até 7 dias: <strong>${numero(r.prazoProximo)}</strong>`,
    `Abertos no seu radar: <strong>${numero(r.total)}</strong>`,
    escapar(textoValor(r)),
  ];
  const partes: string[] = [`<h2 style="${H2}">Resumo da semana</h2>`, ...numeros.map((t) => `<p style="${P}">${t}</p>`)];
  if (r.novos.length > 0) {
    partes.push(`<h2 style="${H2}">Editais novos da semana</h2>`, `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${r.novos.map(editalHtml).join('')}</table>`);
    if (r.novas > r.novos.length) partes.push(`<p style="${P}"><a href="${escapar(radar)}" style="color:#b33a0e;">Mais ${numero(r.novas - r.novos.length)} no seu Meu Radar.</a></p>`);
  }
  if (r.encerrando.length > 0) {
    partes.push(`<h2 style="${H2}">Encerram nos próximos 7 dias</h2>`, `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${r.encerrando.map(editalHtml).join('')}</table>`);
  }
  if (r.orgaos.length > 0 || r.cidades.length > 0) {
    partes.push(`<h2 style="${H2}">Quem mais compra no seu radar</h2>`);
    for (const o of r.orgaos) partes.push(`<p style="${P}">${escapar(textoOrgao(o))}</p>`);
    for (const c of r.cidades) partes.push(`<p style="${P}">${escapar(textoCidade(c))}</p>`);
  }
  partes.push(`<p style="margin:20px 0 0;"><a href="${escapar(radar)}" style="display:inline-block;padding:12px 18px;background:#ff5a1f;color:#0c2340;font-weight:bold;text-decoration:none;border-radius:4px;">Abrir o Meu Radar</a></p>`);
  const rodape = `Você recebe este resumo porque tem o plano Pro e o Meu Radar no Edital Map. Os editais vêm do PNCP: confira sempre o edital oficial.<br>
<a href="${escapar(linkSair(tokenSair))}" style="color:#3e5373;">Parar o resumo semanal</a> · Para voltar a receber, ligue o resumo em <a href="${escapar(alertas)}" style="color:#3e5373;">Alertas</a>.`;
  const corpo = [
    'Resumo da semana',
    `Editais novos na semana: ${numero(r.novas)}`,
    `Encerram em até 7 dias: ${numero(r.prazoProximo)}`,
    `Abertos no seu radar: ${numero(r.total)}`,
    textoValor(r),
    ...(r.novos.length ? ['', 'Editais novos da semana', ...r.novos.map(editalTexto), ...(r.novas > r.novos.length ? [`Mais ${numero(r.novas - r.novos.length)} no seu Meu Radar: ${radar}`] : [])] : []),
    ...(r.encerrando.length ? ['', 'Encerram nos próximos 7 dias', ...r.encerrando.map(editalTexto)] : []),
    ...(r.orgaos.length || r.cidades.length ? ['', 'Quem mais compra no seu radar', ...r.orgaos.map(textoOrgao), ...r.cidades.map(textoCidade)] : []),
    '',
    `Abrir o Meu Radar: ${radar}`,
    `Parar o resumo semanal: ${linkSair(tokenSair)}`,
    `Para voltar a receber, ligue o resumo em Alertas: ${alertas}`,
  ].join('\n');
  return { assunto: assuntoDoResumo(r), html: moldura(`<tr><td style="padding:4px 28px 8px;">${partes.join('\n')}</td></tr>`, rodape), texto: corpo, cabecalhos: cabecalhosDescadastro(tokenSair) };
}
