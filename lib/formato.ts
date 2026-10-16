const FUSO = 'America/Sao_Paulo';
const fmtMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNumero = new Intl.NumberFormat('pt-BR');
const fmtQuantidade = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 });
const fmtPartes = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

type Partes = { dia: string; mes: string; ano: string; hora: string; minuto: string };

function partes(d: Date): Partes {
  const p = fmtPartes.formatToParts(d);
  const g = (t: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === t)?.value ?? '';
  return { dia: g('day'), mes: g('month'), ano: g('year'), hora: g('hour'), minuto: g('minute') };
}

export function moeda(v: number | string | null | undefined): string | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? fmtMoeda.format(n) : null;
}

const fmtInteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const fmtUmaCasa = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtDuasCasas = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NBSP = '\u00a0';

/** Valor abreviado para cards e painéis: "R$ 860 mil", "R$ 1,25 mi", "R$ 2,1 bi", com espaço inseparável após R$ e antes da unidade. Faixa escolhida pelo valor já arredondado. */
export function moedaCurta(v: number | string | null | undefined): string | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0.5) return null;
  const mi = Math.round(n / 1e4) / 100;
  if (n >= 1e9 || mi >= 1000) return `R$${NBSP}${fmtUmaCasa.format(n / 1e9)}${NBSP}bi`;
  if (n >= 1e6) return `R$${NBSP}${fmtDuasCasas.format(mi)}${NBSP}mi`;
  if (n >= 1e3) return `R$${NBSP}${fmtInteiro.format(Math.floor(n / 1e3))}${NBSP}mil`;
  const reais = Math.round(n);
  if (reais >= 1000) return `R$${NBSP}1${NBSP}mil`;
  return `R$${NBSP}${fmtInteiro.format(reais)}`;
}

export function numero(n: number): string {
  return fmtNumero.format(n);
}

export function quantidade(n: number | string | null): string {
  if (n === null) return '—';
  const x = Number(n);
  return Number.isFinite(x) ? fmtQuantidade.format(x) : '—';
}

export function data(iso: string): string {
  const p = partes(new Date(iso));
  return `${p.dia}.${p.mes}.${p.ano}`;
}

export function hora(iso: string): string {
  const p = partes(new Date(iso));
  return p.minuto === '00' ? `${p.hora}h` : `${p.hora}h${p.minuto}`;
}

export function dataHora(iso: string): string {
  return `${data(iso)} · ${hora(iso)}`;
}

/** "25.09" (dia e mês de Brasília). */
export function diaMes(iso: string): string {
  const p = partes(new Date(iso));
  return `${p.dia}.${p.mes}`;
}

/** Diferença em dias de calendário de Brasília (hoje = 0). */
export function diasAte(iso: string, agora: Date): number {
  const a = partes(agora);
  const b = partes(new Date(iso));
  return Math.round((Date.UTC(+b.ano, +b.mes - 1, +b.dia) - Date.UTC(+a.ano, +a.mes - 1, +a.dia)) / 86_400_000);
}

export type Tom = 'urgente' | 'proximo' | 'longe' | 'encerrado';
export type Prazo = { situacao: 'Aberto' | 'Prazo próximo' | 'Encerrado' | 'Sem prazo'; tom: Tom; texto: string };

export function prazo(iso: string | null, agora: Date): Prazo {
  if (!iso) return { situacao: 'Sem prazo', tom: 'encerrado', texto: 'Prazo não informado' };
  if (Date.parse(iso) <= agora.getTime()) return { situacao: 'Encerrado', tom: 'encerrado', texto: `Encerrado em ${data(iso)}` };
  const d = diasAte(iso, agora);
  if (d <= 0) return { situacao: 'Prazo próximo', tom: 'urgente', texto: `Encerra hoje às ${hora(iso)}` };
  if (d === 1) return { situacao: 'Prazo próximo', tom: 'urgente', texto: `Encerra amanhã às ${hora(iso)}` };
  if (d <= 7) return { situacao: 'Prazo próximo', tom: 'proximo', texto: `Encerra em ${d} dias` };
  return { situacao: 'Aberto', tom: 'longe', texto: d > 365 ? 'mais de 1 ano' : `${d} dias` };
}

export type TomEtiqueta = 'urgente' | 'proximo' | 'novo' | 'aberto';
export type Etiqueta = { texto: string; tom: TomEtiqueta };

/** Etiqueta do card compacto: prazo curto primeiro; depois "Novo" (publicado nos últimos 3 dias de calendário); senão "Aberto". */
export function etiqueta(e: { encerramento_em: string; publicada_em: string | null }, agora: Date): Etiqueta {
  const d = diasAte(e.encerramento_em, agora);
  if (d <= 0) return { texto: 'Encerra hoje', tom: 'urgente' };
  if (d === 1) return { texto: 'Encerra amanhã', tom: 'urgente' };
  if (d <= 7) return { texto: `Encerra em ${d} dias`, tom: 'proximo' };
  if (e.publicada_em && diasAte(e.publicada_em, agora) >= -2) return { texto: 'Novo', tom: 'novo' };
  return { texto: 'Aberto', tom: 'aberto' };
}

export function haQuanto(iso: string, agora: Date): string {
  const s = Math.max(0, (agora.getTime() - Date.parse(iso)) / 1000);
  if (s < 120) return 'há pouco';
  const min = Math.floor(s / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} dias`;
}

const LINK_HTTP = /^https?:\/\//i;

export function linkOficial(e: { link_origem: string | null; cnpj: string; ano: number; sequencial: number }): string {
  const link = e.link_origem?.trim();
  return link && LINK_HTTP.test(link) ? link : `https://pncp.gov.br/app/editais/${e.cnpj}/${e.ano}/${e.sequencial}`;
}
