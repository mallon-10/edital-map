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

export function haQuanto(iso: string, agora: Date): string {
  const s = Math.max(0, (agora.getTime() - Date.parse(iso)) / 1000);
  if (s < 120) return 'agora há pouco';
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
