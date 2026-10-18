import 'server-only';
import { criarCache } from '../cache';
import { lerBuscaMunicipio } from '../radar';
import type { Cidade } from '../tipos';
import { supabaseServidor } from './supabase';

const cache = criarCache(60 * 60 * 1000);
type LinhaMunicipio = { codigo_ibge: unknown; nome: unknown; uf: unknown };
const paraCidade = (l: LinhaMunicipio): Cidade => ({ ibge: String(l.codigo_ibge), nome: String(l.nome), uf: String(l.uf) });

/**
 * Municípios pelo nome, sem acento (buscar_municipios, 0014, para o onboarding). O texto vai a um ilike: passa de novo
 * por lerBuscaMunicipio aqui (só letras, espaço, hífen e apóstrofo; 2 a 60 caracteres) e, se não servir, nada vai ao banco.
 */
export async function buscarMunicipios(bruto: string): Promise<Cidade[]> {
  const q = lerBuscaMunicipio(bruto);
  if (!q) return [];
  const k = q.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  return cache(`municipios:${k}`, async () => {
    const { data, error } = await supabaseServidor().rpc('buscar_municipios', { q, p_limite: 10 });
    if (error) throw new Error(`buscar_municipios: ${error.message}`);
    return ((data ?? []) as LinhaMunicipio[]).map(paraCidade);
  });
}
