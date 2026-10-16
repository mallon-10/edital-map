import { UFS_BRASIL } from './eventos';
import type { FiltrosBusca, FiltrosTela } from './tipos';

/** As 27 UFs em ordem alfabética, para os seletores de UF. */
export const UFS_ORDENADAS: readonly string[] = [...UFS_BRASIL].sort();
export const VALORES_MINIMOS = [10_000, 50_000, 100_000, 500_000, 1_000_000] as const;
export const MODALIDADES: ReadonlyArray<{ id: number; nome: string }> = [
  { id: 6, nome: 'Pregão eletrônico' },
  { id: 7, nome: 'Pregão presencial' },
  { id: 4, nome: 'Concorrência eletrônica' },
  { id: 8, nome: 'Dispensa' },
  { id: 12, nome: 'Credenciamento' },
];
const IDS_MODALIDADE = MODALIDADES.map((m) => m.id);

export function lerFiltros(p: URLSearchParams): FiltrosBusca {
  const q = (p.get('q') ?? '').trim().slice(0, 100) || null;
  const ufBruta = (p.get('uf') ?? '').toUpperCase();
  const uf = UFS_BRASIL.includes(ufBruta) ? ufBruta : null;
  const ibgeBruto = p.get('ibge') ?? '';
  const ibge = /^\d{7}$/.test(ibgeBruto) ? ibgeBruto : null;
  const dias = p.get('dias') === '7' ? 7 : null;
  const d = Number(p.get('deslocamento') ?? 0);
  const deslocamento = Number.isInteger(d) && d >= 0 && d <= 20000 ? d : 0;
  const v = Number(p.get('valor'));
  const valorMin = (VALORES_MINIMOS as readonly number[]).includes(v) ? v : null;
  const ids = [...new Set((p.get('modalidades') ?? '').split(',').map((s) => Number(s.trim())))]
    .filter((id) => IDS_MODALIDADE.includes(id))
    .sort((a, b) => a - b);
  return { q, uf, ibge, dias, deslocamento, valorMin, modalidades: ids.length ? ids : null };
}

export function chaveFiltros(f: FiltrosBusca): string {
  return JSON.stringify([f.q?.toLowerCase() ?? null, f.uf, f.ibge, f.dias, f.deslocamento, f.valorMin, f.modalidades]);
}

/** Filtros da tela → parâmetros de `/api/busca` e `/api/mapa` (o mapa não leva a cidade). */
export function paraParametros(f: FiltrosTela, opcoes: { comCidade?: boolean; deslocamento?: number } = {}): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.uf) p.set('uf', f.uf);
  if (f.seteDias) p.set('dias', '7');
  if (f.valorMin) p.set('valor', String(f.valorMin));
  if (f.modalidades.length) p.set('modalidades', [...f.modalidades].sort((a, b) => a - b).join(','));
  if (opcoes.comCidade !== false && f.cidade) p.set('ibge', f.cidade.ibge);
  if (opcoes.deslocamento) p.set('deslocamento', String(opcoes.deslocamento));
  return p;
}
