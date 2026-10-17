import { UFS_BRASIL, type RecursoUsado } from './eventos';
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
/** Raios do filtro Pro, em km a partir da sede do município escolhido. */
export const RAIOS_KM = [50, 100, 200] as const;
/** CNPJ do órgão comprador: 14 caracteres, os 12 primeiros podem ser letras (CNPJ alfanumérico), como em SLUG_EDITAL. */
const CNPJ = /^[0-9A-Z]{12}\d{2}$/;

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
  const orgaoBruto = (p.get('orgao') ?? '').trim().toUpperCase();
  const orgao = CNPJ.test(orgaoBruto) ? orgaoBruto : null;
  // O raio só vale com município: é contado a partir da sede dele.
  const r = Number(p.get('raio'));
  const raio = ibge && (RAIOS_KM as readonly number[]).includes(r) ? r : null;
  return { q, uf, ibge, dias, deslocamento, valorMin, modalidades: ids.length ? ids : null, orgao, raio };
}

export function chaveFiltros(f: FiltrosBusca): string {
  return JSON.stringify([f.q?.toLowerCase() ?? null, f.uf, f.ibge, f.dias, f.deslocamento, f.valorMin, f.modalidades, f.orgao, f.raio]);
}

/**
 * Filtros da tela → parâmetros de `/api/busca`, `/api/mapa` e `/api/exportar`.
 * O mapa (`comCidade: false`) não leva a cidade sozinha (mostra todas, para o usuário escolher outra);
 * com raio, leva a cidade e o raio.
 */
export function paraParametros(f: FiltrosTela, opcoes: { comCidade?: boolean; deslocamento?: number } = {}): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set('q', f.q.trim());
  // Com raio a UF não vai: o raio atravessa a divisa de estado.
  if (f.uf && !ufIgnoradaPeloRaio(f)) p.set('uf', f.uf);
  if (f.seteDias) p.set('dias', '7');
  if (f.valorMin) p.set('valor', String(f.valorMin));
  if (f.modalidades.length) p.set('modalidades', [...f.modalidades].sort((a, b) => a - b).join(','));
  if (f.orgao) p.set('orgao', f.orgao.cnpj);
  const raio = f.cidade && f.raio ? f.raio : null;
  if (f.cidade && (opcoes.comCidade !== false || raio)) p.set('ibge', f.cidade.ibge);
  if (raio) p.set('raio', String(raio));
  if (opcoes.deslocamento) p.set('deslocamento', String(opcoes.deslocamento));
  return p;
}

/** UF escolhida que não vale agora porque há raio (o raio atravessa a divisa); o chip de UF avisa. */
export function ufIgnoradaPeloRaio(f: FiltrosTela): boolean {
  return Boolean(f.uf && f.cidade && f.raio);
}

/**
 * Sem município não há raio: tirar a cidade (ou trocar a UF, que tira a cidade) tira o raio.
 * Município de outra UF (com raio o mapa cruza a divisa e deixa escolher um vizinho de outro estado): a UF passa a ser a dele,
 * para a tela não ficar com "UF: SC" e "Rio Negro/PR" (lista vazia quando o raio sai).
 */
export function normalizarTela(f: FiltrosTela): FiltrosTela {
  if (!f.cidade) return f.raio === null ? f : { ...f, raio: null };
  return f.uf && f.uf !== f.cidade.uf ? { ...f, uf: f.cidade.uf } : f;
}

/** Recursos Pro de filtro que o evento usou_recurso registra. */
export type RecursoFiltro = Extract<RecursoUsado, 'filtro_orgao' | 'filtro_raio'>;

/** Filtros Pro que passaram a valer nesta mudança (evento usou_recurso); manter ou tirar um filtro não conta. */
export function recursosUsados(antes: FiltrosTela, depois: FiltrosTela): RecursoFiltro[] {
  const usados: RecursoFiltro[] = [];
  if (depois.orgao && depois.orgao.cnpj !== antes.orgao?.cnpj) usados.push('filtro_orgao');
  if (depois.cidade && depois.raio && (depois.raio !== antes.raio || depois.cidade.ibge !== antes.cidade?.ibge)) usados.push('filtro_raio');
  return usados;
}

/** Termo da busca de órgão: sem os curingas do ilike (% _ \), espaços colapsados, até 60 caracteres; null com menos de 3 letras. */
export function lerTermoOrgao(q: string | null): string | null {
  const t = (q ?? '').replace(/[%_\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60).trim();
  return (t.match(/\p{L}/gu) ?? []).length >= 3 ? t : null;
}

/** Quantos filtros estão valendo (botão "Filtros (n)" do celular): UF, município, raio, valor, modalidade, órgão e prazo. O termo não conta. */
export function filtrosAtivos(f: FiltrosTela): number {
  return [f.uf, f.cidade, f.cidade && f.raio, f.valorMin, f.modalidades.length > 0, f.orgao, f.seteDias].filter(Boolean).length;
}
