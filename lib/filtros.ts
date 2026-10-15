import type { FiltrosBusca } from './tipos';

export const UFS_COBERTAS = ['SC', 'PR', 'RS'] as const;

export function lerFiltros(p: URLSearchParams): FiltrosBusca {
  const q = (p.get('q') ?? '').trim().slice(0, 100) || null;
  const ufBruta = (p.get('uf') ?? '').toUpperCase();
  const uf = (UFS_COBERTAS as readonly string[]).includes(ufBruta) ? ufBruta : null;
  const ibgeBruto = p.get('ibge') ?? '';
  const ibge = /^\d{7}$/.test(ibgeBruto) ? ibgeBruto : null;
  const dias = p.get('dias') === '7' ? 7 : null;
  const d = Number(p.get('deslocamento') ?? 0);
  const deslocamento = Number.isInteger(d) && d >= 0 && d <= 20000 ? d : 0;
  return { q, uf, ibge, dias, deslocamento };
}

export function chaveFiltros(f: FiltrosBusca): string {
  return JSON.stringify([f.q?.toLowerCase() ?? null, f.uf, f.ibge, f.dias, f.deslocamento]);
}
