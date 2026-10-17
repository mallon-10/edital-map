import 'server-only';
import { criarCache } from '../cache';
import { nomeProprio } from '../texto';
import type { Cidade, Orgao } from '../tipos';
import { supabaseServidor } from './supabase';

const cache = criarCache(5 * 60 * 1000);

/** Município do endereço (?municipio=) → nome e UF para o chip. null = código que não existe. */
export function municipioPorIbge(ibge: string): Promise<Cidade | null> {
  return cache(`municipio:${ibge}`, async () => {
    const { data, error } = await supabaseServidor().from('municipios').select('codigo_ibge, nome, uf').eq('codigo_ibge', ibge).maybeSingle();
    if (error) throw new Error(`municipio: ${error.message}`);
    return data ? { ibge: String(data.codigo_ibge), nome: String(data.nome), uf: String(data.uf) } : null;
  });
}

/** Órgão do endereço (?orgao=) → nome para o chip, de qualquer contratação dele no espelho. Sem nenhuma, o nome é o CNPJ. */
export function orgaoPorCnpj(cnpj: string): Promise<Orgao> {
  return cache(`orgao:${cnpj}`, async () => {
    const { data, error } = await supabaseServidor().from('contratacoes').select('orgao_nome').eq('cnpj', cnpj).limit(1).maybeSingle();
    if (error) throw new Error(`orgao: ${error.message}`);
    return { cnpj, nome: data ? nomeProprio(String(data.orgao_nome)) : cnpj };
  });
}
