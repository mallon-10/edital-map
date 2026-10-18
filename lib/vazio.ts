import { interpretarBusca, separarNegativos, termosParecidos } from './relevancia/termos';
import type { FiltrosTela } from './tipos';

/** Outra busca para propor quando a lista vem vazia (o número que ela traria vem de /api/contagem, que não conta). */
export type Sugestao = { rotulo: string; filtros: FiltrosTela; tipo?: 'filtro' | 'termo' };
export const MAX_SUGESTOES = 3;
/** Teto de chamadas a /api/contagem por busca vazia (a rota tem limite por IP). */
export const MAX_CONTAGENS = 4;

/** Uma sugestão por filtro ligado (cada uma tira só aquele), sem os excluídos, e termos parecidos do catálogo. */
export function sugestoesVazio(f: FiltrosTela): Sugestao[] {
  const s: Sugestao[] = [];
  const filtro = (rotulo: string, filtros: FiltrosTela) => s.push({ rotulo, filtros, tipo: 'filtro' });
  const termo = (rotulo: string, filtros: FiltrosTela) => s.push({ rotulo, filtros, tipo: 'termo' });
  if (f.uf || f.cidade) filtro('Ampliar para Todo o Brasil', { ...f, uf: '', cidade: null, raio: null });
  if (f.cidade && f.uf) filtro(`Todo o estado (${f.uf})`, { ...f, cidade: null, raio: null });
  if (f.valorMin) filtro('Tirar o valor mínimo', { ...f, valorMin: null });
  if (f.modalidades.length) filtro('Todas as modalidades', { ...f, modalidades: [] });
  if (f.orgao) filtro('Todos os órgãos', { ...f, orgao: null });
  if (f.seteDias) filtro('Todos os prazos', { ...f, seteDias: false });
  const { positivo, negativos } = separarNegativos(f.q);
  if (negativos.length) termo('Sem os termos excluídos', { ...f, q: positivo });
  for (const t of termosParecidos(interpretarBusca(f.q).digitados)) termo(`Buscar “${t}”`, { ...f, q: t });
  return s;
}

/**
 * No máximo MAX_CONTAGENS candidatas para contar, na mesma ordem: os filtros primeiro (Todo o Brasil à frente),
 * deixando uma vaga para o termo (sem excluídos / parecido) quando houver.
 */
export function limitarContagens(candidatas: Sugestao[]): Sugestao[] {
  const filtros = candidatas.filter((c) => c.tipo !== 'termo');
  const termos = candidatas.filter((c) => c.tipo === 'termo');
  const nFiltros = Math.min(filtros.length, MAX_CONTAGENS - Math.min(termos.length, 1));
  const nTermos = Math.min(termos.length, MAX_CONTAGENS - nFiltros);
  return [...filtros.slice(0, nFiltros), ...termos.slice(0, nTermos)];
}

/** Só as que trazem editais, as que mais trazem primeiro (a primeira é a do filtro mais restritivo), até MAX_SUGESTOES. */
export function escolherSugestoes(candidatas: Sugestao[], totais: ReadonlyArray<number | null>): Array<Sugestao & { total: number }> {
  return candidatas
    .map((s, i) => ({ ...s, total: totais[i] ?? 0 }))
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, MAX_SUGESTOES);
}

/** "Nenhum edital aberto para “luva” em Joinville/SC." */
export function descreverVazio(f: FiltrosTela): string {
  const q = f.q.trim();
  const lugar = f.cidade ? ` em ${f.cidade.nome}/${f.cidade.uf}${f.raio ? ` e até ${f.raio} km` : ''}` : f.uf ? ` em ${f.uf}` : '';
  return q ? `Nenhum edital aberto para “${q}”${lugar}.` : `Nenhum edital aberto com esses filtros${lugar}.`;
}
