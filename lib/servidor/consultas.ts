import 'server-only';
import type { ChaveCompra } from '@/worker/mapear';
import { criarCache } from '../cache';
import { chaveFiltros } from '../filtros';
import type { Edital, EditalResumo, FiltrosBusca, ItemEdital, PontoMapa, ResultadoBusca, ResumoItens } from '../tipos';
import { itensDoPncp } from './itensPncp';
import { supabaseServidor } from './supabase';

const cache = criarCache(5 * 60 * 1000);
export const POR_PAGINA = 50;
type Linha = Record<string, unknown>;

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const texto = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));

/** Argumentos de buscar_editais (0007), sem a página. */
function argumentosBusca(f: FiltrosBusca) {
  return {
    q: f.q,
    // Com raio a UF não filtra: o raio atravessa a divisa de estado.
    p_ufs: f.uf && !f.raio ? [f.uf] : null,
    p_ibge: f.ibge,
    p_dias: f.dias,
    p_valor_min: f.valorMin,
    p_modalidades: f.modalidades,
    p_orgao: f.orgao,
    p_raio_km: f.raio,
  };
}

/** Uma linha de buscar_editais → card da lista. */
function paraResumo(l: Linha): EditalResumo {
  return {
    id: String(l.id),
    slug: String(l.slug),
    objeto: String(l.objeto),
    orgao_nome: String(l.orgao_nome),
    unidade_nome: texto(l.unidade_nome),
    municipio_nome: texto(l.municipio_nome),
    uf: String(l.uf),
    codigo_ibge: texto(l.codigo_ibge),
    valor_estimado: num(l.valor_estimado),
    encerramento_em: String(l.encerramento_em),
    publicada_em: texto(l.publicada_em),
    modalidade_nome: texto(l.modalidade_nome),
    srp: Boolean(l.srp),
    onde: l.onde === 'itens' ? 'itens' : 'objeto',
  };
}

export function buscarEditais(f: FiltrosBusca): Promise<ResultadoBusca> {
  return cache(`busca:${chaveFiltros(f)}`, async () => {
    const { data, error } = await supabaseServidor().rpc('buscar_editais', {
      ...argumentosBusca(f),
      p_limite: POR_PAGINA,
      p_deslocamento: f.deslocamento,
    });
    if (error) throw new Error(`buscar_editais: ${error.message}`);
    const linhas = (data ?? []) as Linha[];
    return { total: Number(linhas[0]?.total ?? 0), editais: linhas.map(paraResumo) };
  });
}

/**
 * O PostgREST devolve no máximo 1.000 linhas por resposta: lê em páginas até o fim.
 * O mapa não filtra pela cidade sozinha (mostra todas, para escolher outra); com raio, só os municípios dentro dele.
 */
export function pontosDoMapa(f: FiltrosBusca): Promise<PontoMapa[]> {
  const ibge = f.raio ? f.ibge : null;
  return cache(`mapa:${chaveFiltros({ ...f, ibge, deslocamento: 0 })}`, async () => {
    const pontos: PontoMapa[] = [];
    for (let de = 0; ; de += 1000) {
      const { data, error } = await supabaseServidor()
        .rpc('mapa_editais', {
          q: f.q,
          // Com raio a UF não filtra: o raio atravessa a divisa de estado.
    p_ufs: f.uf && !f.raio ? [f.uf] : null,
          p_dias: f.dias,
          p_valor_min: f.valorMin,
          p_modalidades: f.modalidades,
          p_orgao: f.orgao,
          p_ibge: ibge,
          p_raio_km: f.raio,
        })
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
      .select(
        'id, slug, cnpj, ano, sequencial, objeto, info_complementar, orgao_nome, unidade_nome, esfera, municipio_nome, uf, codigo_ibge, modalidade_nome, situacao_nome, srp, valor_estimado, publicada_em, abertura_em, encerramento_em, link_origem',
      )
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw new Error(`edital: ${error.message}`);
    return data ? ({ ...data, valor_estimado: num(data.valor_estimado) } as Edital) : null;
  });
}

/** Itens do edital vindos do PNCP na hora (cache de 5 min; falha não fica no cache). `null` = PNCP indisponível agora. */
export function itensDoEdital(compra: ChaveCompra, limite: number): Promise<ItemEdital[] | null> {
  return cache(`itens:${compra.id}:${limite}`, () => itensDoPncp(compra, limite)).catch((erro: unknown) => {
    console.error(`itens do edital ${compra.id}:`, erro);
    return null;
  });
}

/** Tipos, ME/EPP e critérios dos itens do edital (função SQL `resumo_itens`, que lê `itens_resumo`). */
export function resumoItens(id: string): Promise<ResumoItens> {
  return cache(`resumo-itens:${id}`, async () => {
    const { data, error } = await supabaseServidor().rpc('resumo_itens', { p_contratacao: id }).single();
    if (error) throw new Error(`resumo_itens: ${error.message}`);
    const l = (data ?? {}) as Linha;
    return {
      total: Number(l.total ?? 0),
      materiais: Number(l.materiais ?? 0),
      servicos: Number(l.servicos ?? 0),
      comBeneficio: Number(l.com_beneficio ?? 0),
      exclusivos: Number(l.exclusivos ?? 0),
      cota: Number(l.cota ?? 0),
      criterios: Array.isArray(l.criterios) ? (l.criterios as unknown[]).map(String) : [],
    };
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
