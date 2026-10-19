import { moeda, moedaCurta, numero } from '../formato';
import { url } from '../seo/site';
import { nomeProprio } from '../texto';
import {
  abertura, botao, cabecalhosDescadastro, COR, editalHtml, editalTexto, escapar, FONTE, linkRodape, linkSair, MONO, moldura, tituloSecao, umaLinha,
  type EditalDoEmail, type EmailMontado,
} from './email';

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


/* ---------- HTML do resumo (moldura, card do edital e botão vêm de ./email) ---------- */

/** Bloco de número grande em JetBrains Mono. `valor` e `rotulo` são escapados aqui. */
function blocoNumero(valor: string, rotulo: string, destaque = false): string {
  const curto = valor.length <= 7;
  return `<td class="em-col" width="33%" valign="top" style="padding:0 4px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${destaque ? COR.pinSoft : COR.sunken}" style="background:${destaque ? COR.pinSoft : COR.sunken};border-radius:10px;padding:14px 14px 12px;">
<div style="font-family:${MONO};font-size:${curto ? 28 : 20}px;line-height:32px;font-weight:700;letter-spacing:-0.02em;color:${destaque ? COR.pinStrong : COR.ink};white-space:nowrap;">${escapar(valor)}</div>
<div style="margin-top:6px;font-family:${MONO};font-size:10px;line-height:1.4;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:${COR.inkMuted};">${escapar(rotulo)}</div>
</td></tr></table>
</td>`;
}

const rotuloLista = (t: string) =>
  `<div style="margin:16px 0 2px;font-family:${MONO};font-size:11px;line-height:1.4;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${COR.inkMuted};">${escapar(t)}</div>`;

/** Linha do ranking: posição, nome (e detalhe), contagem à direita e uma barra fina proporcional ao primeiro. */
function linhaRanking(pos: number, nome: string, detalhe: string | null, contagemTexto: string, pct: number, cor: string): string {
  const barra = pct >= 100
    ? `<td width="100%" style="background:${cor};height:6px;line-height:6px;font-size:0;border-radius:3px;">&nbsp;</td>`
    : `<td width="${pct}%" style="background:${cor};height:6px;line-height:6px;font-size:0;border-radius:3px;">&nbsp;</td><td style="height:6px;line-height:6px;font-size:0;">&nbsp;</td>`;
  const det = detalhe ? `<div style="margin-top:2px;font-family:${MONO};font-size:12px;line-height:1.4;color:${COR.inkMuted};">${escapar(detalhe)}</div>` : '';
  return `<tr><td style="padding:10px 0 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td width="24" valign="top" style="font-family:${MONO};font-size:13px;line-height:1.4;font-weight:700;color:${COR.inkMuted};">${pos}</td>
<td valign="top" style="font-family:${FONTE};font-size:14px;line-height:1.4;font-weight:600;color:${COR.ink};">${escapar(nome)}${det}</td>
<td valign="top" align="right" style="padding-left:10px;font-family:${MONO};font-size:12px;line-height:1.4;font-weight:700;color:${COR.ink};white-space:nowrap;">${escapar(contagemTexto)}</td></tr>
<tr><td></td><td colspan="2" style="padding-top:6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COR.sunken}" style="background:${COR.sunken};border-radius:3px;"><tr>${barra}</tr></table></td></tr>
</table>
</td></tr>`;
}

const pct = (q: number, max: number) => (max > 0 ? Math.max(4, Math.min(100, Math.round((q / max) * 100))) : 0);
const linhaHtml = (conteudo: string, estilo = 'padding:18px 28px 6px;') => `<tr><td class="em-px" style="${estilo}">${conteudo}</td></tr>`;
const listaEditais = (lista: readonly EditalDoEmail[], agora: Date) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">${lista.map((e) => editalHtml(e, agora)).join('')}</table>`;
const BORDA = `padding:22px 28px 6px;border-top:1px solid ${COR.line};`;

function preCabecalhoResumo(r: ResumoSemanal): string {
  const partes = [];
  if (r.novas > 0) partes.push(`${plural(r.novas, 'edital novo', 'editais novos')} no seu radar`);
  if (r.prazoProximo > 0) partes.push(`${plural(r.prazoProximo, 'edital encerra', 'editais encerram')} em até 7 dias`);
  return partes.join(' · ');
}

export function montarResumo(r: ResumoSemanal, tokenSair: string, agora: Date = new Date()): EmailMontado {
  const radar = url('/radar');
  const alertas = url('/alertas');
  const valorBloco = r.comValor > 0 ? (moedaCurta(r.valorTotal) ?? 'não informado') : 'não informado';
  const linhas: string[] = [
    abertura('Resumo semanal · Pro', 'Sua semana no Meu Radar', `Abertos no seu radar: ${plural(r.total, 'edital', 'editais')}.`),
    linhaHtml(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
${blocoNumero(numero(r.novas), 'Editais novos na semana')}
${blocoNumero(numero(r.prazoProximo), 'Encerram em até 7 dias', r.prazoProximo > 0)}
${blocoNumero(valorBloco, 'Valor estimado aberto')}
</tr></table>
<p style="margin:10px 0 0;font-family:${FONTE};font-size:12px;line-height:1.5;color:${COR.inkMuted};">${escapar(textoValor(r))}</p>`,
      'padding:14px 24px 10px;',
    ),
  ];
  if (r.novos.length > 0) {
    const mais = r.novas > r.novos.length
      ? `<p style="margin:0 0 14px;font-family:${FONTE};font-size:13px;line-height:1.5;"><a href="${escapar(radar)}" style="color:${COR.pinStrong};font-weight:700;">Mais ${numero(r.novas - r.novos.length)} no seu Meu Radar.</a></p>`
      : '';
    linhas.push(linhaHtml(`${tituloSecao('Editais novos da semana', plural(r.novas, 'edital novo', 'editais novos'))}${listaEditais(r.novos, agora)}${mais}`, BORDA));
  }
  if (r.encerrando.length > 0) {
    linhas.push(linhaHtml(`${tituloSecao('Encerram nos próximos 7 dias', plural(r.prazoProximo, 'edital', 'editais'))}${listaEditais(r.encerrando, agora)}`, BORDA));
  }
  if (r.orgaos.length > 0 || r.cidades.length > 0) {
    const partes = [tituloSecao('Quem mais compra no seu radar')];
    if (r.orgaos.length > 0) {
      const max = Math.max(...r.orgaos.map((o) => o.qtd));
      partes.push(
        rotuloLista('Órgãos'),
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${r.orgaos
          .map((o, i) => linhaRanking(i + 1, `${nomeProprio(o.nome)} (${o.uf})`, moeda(o.valor), plural(o.qtd, 'edital aberto', 'editais abertos'), pct(o.qtd, max), COR.pin))
          .join('')}</table>`,
      );
    }
    if (r.cidades.length > 0) {
      const max = Math.max(...r.cidades.map((c) => c.qtd));
      partes.push(
        rotuloLista('Cidades'),
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${r.cidades
          .map((c, i) => linhaRanking(i + 1, `${c.nome}/${c.uf}`, null, plural(c.qtd, 'edital aberto', 'editais abertos'), pct(c.qtd, max), COR.mata))
          .join('')}</table>`,
      );
    }
    linhas.push(linhaHtml(`${partes.join('\n')}<div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>`, BORDA));
  }
  linhas.push(
    `<tr><td class="em-px" align="center" style="padding:22px 28px 28px;border-top:1px solid ${COR.line};">${botao(radar, 'Abrir meu radar', 'grande')}</td></tr>`,
  );
  const rodape = `Você recebe este resumo porque tem o plano Pro e o Meu Radar no Edital Map. Os editais vêm do PNCP: confira sempre o edital oficial.<br>
${linkRodape(linkSair(tokenSair), 'Parar o resumo semanal')} · Para voltar a receber, ligue o resumo em ${linkRodape(alertas, 'Alertas')}.`;
  const corpo = [
    'Resumo da semana',
    `Editais novos na semana: ${numero(r.novas)}`,
    `Encerram em até 7 dias: ${numero(r.prazoProximo)}`,
    `Abertos no seu radar: ${numero(r.total)}`,
    textoValor(r),
    ...(r.novos.length
      ? ['', 'Editais novos da semana', ...r.novos.map((e) => editalTexto(e, agora)), ...(r.novas > r.novos.length ? [`Mais ${numero(r.novas - r.novos.length)} no seu Meu Radar: ${radar}`] : [])]
      : []),
    ...(r.encerrando.length ? ['', 'Encerram nos próximos 7 dias', ...r.encerrando.map((e) => editalTexto(e, agora))] : []),
    ...(r.orgaos.length || r.cidades.length ? ['', 'Quem mais compra no seu radar', ...r.orgaos.map(textoOrgao), ...r.cidades.map(textoCidade)] : []),
    '',
    `Abrir meu radar: ${radar}`,
    '',
    'Você recebe este resumo porque tem o plano Pro e o Meu Radar no Edital Map. Os editais vêm do PNCP: confira sempre o edital oficial.',
    `Parar o resumo semanal: ${linkSair(tokenSair)}`,
    `Para voltar a receber, ligue o resumo em Alertas: ${alertas}`,
  ].join('\n');
  return { assunto: assuntoDoResumo(r), html: moldura(linhas.join('\n'), rodape, preCabecalhoResumo(r)), texto: corpo, cabecalhos: cabecalhosDescadastro(tokenSair) };
}
