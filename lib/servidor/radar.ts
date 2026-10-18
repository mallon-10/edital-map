import 'server-only';
import { criarCache } from '../cache';
import { argumentosRadar, buscaDoRadar, filtrosDoRadar, type ContagensRadar, type Radar } from '../radar';
import type { Ordem, ResultadoBusca } from '../tipos';
import { paraResumo, type Linha } from './consultas';
import { supabaseServidor } from './supabase';

/** Lista e contagens do Meu Radar: a mesma busca da Fase 2 (buscar_editais) com os filtros do radar (0014). */
const cache = criarCache(5 * 60 * 1000);

export function editaisDoRadar(r: Radar, o: { ordem: Ordem | null; pagina: number; limite: number }): Promise<ResultadoBusca> {
  return cache(`radar:${JSON.stringify([r, o])}`, async () => {
    const b = buscaDoRadar(r);
    const { data, error } = await supabaseServidor().rpc('buscar_editais', argumentosRadar(r, o));
    if (error) throw new Error(`buscar_editais (radar): ${error.message}`);
    const linhas = (data ?? []) as Linha[];
    const divergentes: string[] = [];
    const editais = linhas.map((l) => paraResumo(l, b, divergentes, { perfil: true }));
    if (divergentes.length > 0) {
      console.warn(`relevância diferente entre banco e site em ${divergentes.length} edital(is) do radar; primeiros: ${divergentes.slice(0, 3).join(', ')}`);
    }
    return { total: Number(linhas[0]?.total ?? 0), editais };
  });
}

/** Os três cartões numa chamada (radar_contagens). Sem cache: "desde" muda a cada visita. */
export async function contagensDoRadar(r: Radar, desde: string): Promise<ContagensRadar> {
  const { data, error } = await supabaseServidor().rpc('radar_contagens', { ...filtrosDoRadar(r), p_desde: desde }).single();
  if (error) throw new Error(`radar_contagens: ${error.message}`);
  const l = (data ?? {}) as { total?: unknown; novas?: unknown; prazo_proximo?: unknown };
  return { total: Number(l.total ?? 0), novas: Number(l.novas ?? 0), prazoProximo: Number(l.prazo_proximo ?? 0) };
}
