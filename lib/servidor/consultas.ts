import 'server-only';
import { criarCache } from '../cache';
import { chaveFiltros } from '../filtros';
import type { Edital, EditalResumo, FiltrosBusca, ItemEdital, PontoMapa, ResultadoBusca } from '../tipos';
import { supabaseServidor } from './supabase';

const cache = criarCache(5 * 60 * 1000);
export const POR_PAGINA = 50;
type Linha = Record<string, unknown>;

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const texto = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));

export function buscarEditais(f: FiltrosBusca): Promise<ResultadoBusca> {
  return cache(`busca:${chaveFiltros(f)}`, async () => {
    const { data, error } = await supabaseServidor().rpc('buscar_editais', {
      q: f.q, p_ufs: f.uf ? [f.uf] : null, p_ibge: f.ibge, p_dias: f.dias, p_limite: POR_PAGINA, p_deslocamento: f.deslocamento,
    });
    if (error) throw new Error(`buscar_editais: ${error.message}`);
    const linhas = (data ?? []) as Linha[];
    return {
      total: Number(linhas[0]?.total ?? 0),
      editais: linhas.map((l): EditalResumo => ({
        id: String(l.id),
        slug: String(l.slug),
        objeto: String(l.objeto),
        orgao_nome: String(l.orgao_nome),
        municipio_nome: texto(l.municipio_nome),
        uf: String(l.uf),
        codigo_ibge: texto(l.codigo_ibge),
        valor_estimado: num(l.valor_estimado),
        encerramento_em: String(l.encerramento_em),
        modalidade_nome: texto(l.modalidade_nome),
        onde: l.onde === 'itens' ? 'itens' : 'objeto',
        item_trecho: texto(l.item_trecho),
      })),
    };
  });
}

/** O PostgREST devolve no máximo 1.000 linhas por resposta: lê em páginas até o fim. */
export function pontosDoMapa(f: FiltrosBusca): Promise<PontoMapa[]> {
  return cache(`mapa:${chaveFiltros({ ...f, ibge: null, deslocamento: 0 })}`, async () => {
    const pontos: PontoMapa[] = [];
    for (let de = 0; ; de += 1000) {
      const { data, error } = await supabaseServidor()
        .rpc('mapa_editais', { q: f.q, p_ufs: f.uf ? [f.uf] : null, p_dias: f.dias })
        .range(de, de + 999);
      if (error) throw new Error(`mapa_editais: ${error.message}`);
      const linhas = (data ?? []) as Linha[];
      for (const l of linhas) {
        pontos.push({
          codigo_ibge: String(l.codigo_ibge),
          nome: String(l.nome),
          uf: String(l.uf),
          lat: Number(l.lat),
          lng: Number(l.lng),
          qtd: Number(l.qtd),
          valor_total: num(l.valor_total),
          prazo_mais_proximo: String(l.prazo_mais_proximo),
        });
      }
      if (linhas.length < 1000) return pontos;
    }
  });
}

export function edital(slug: string): Promise<Edital | null> {
  return cache(`edital:${slug}`, async () => {
    const { data, error } = await supabaseServidor()
      .from('contratacoes')
      .select('id, slug, cnpj, ano, sequencial, objeto, info_complementar, orgao_nome, unidade_nome, municipio_nome, uf, codigo_ibge, modalidade_nome, situacao_nome, srp, valor_estimado, publicada_em, encerramento_em, link_origem')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw new Error(`edital: ${error.message}`);
    return data ? ({ ...data, valor_estimado: num(data.valor_estimado) } as Edital) : null;
  });
}

/** Até `limite` itens, em páginas de 1.000 (teto do PostgREST), e o total do edital. */
export function itensDoEdital(id: string, limite: number): Promise<{ total: number; itens: ItemEdital[] }> {
  return cache(`itens:${id}:${limite}`, async () => {
    const itens: ItemEdital[] = [];
    let total = 0;
    for (let de = 0; de < limite; de += 1000) {
      const ate = Math.min(de + 1000, limite) - 1;
      const { data, error, count } = await supabaseServidor()
        .from('itens')
        .select('numero, descricao, quantidade, unidade, valor_unitario_estimado, valor_total_estimado, sigiloso', { count: 'exact' })
        .eq('contratacao_id', id)
        .order('numero')
        .range(de, ate);
      if (error) throw new Error(`itens: ${error.message}`);
      total = count ?? 0;
      const linhas = (data ?? []) as Linha[];
      for (const l of linhas) {
        itens.push({
          numero: Number(l.numero),
          descricao: String(l.descricao),
          quantidade: num(l.quantidade),
          unidade: texto(l.unidade),
          valor_unitario_estimado: num(l.valor_unitario_estimado),
          valor_total_estimado: num(l.valor_total_estimado),
          sigiloso: Boolean(l.sigiloso),
        });
      }
      if (linhas.length < ate - de + 1) break;
    }
    return { total, itens };
  });
}

export function atualizadoEm(): Promise<string | null> {
  return cache('atualizado', async () => {
    const { data, error } = await supabaseServidor()
      .from('sync_estado')
      .select('ultima_execucao')
      .eq('status', 'ok')
      .order('ultima_execucao', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`sync_estado: ${error.message}`);
    return texto(data?.ultima_execucao);
  });
}
