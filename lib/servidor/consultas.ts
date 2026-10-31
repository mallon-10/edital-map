import 'server-only';
import { criarCache } from '../cache';
import { MAX_EXPORTACAO } from '../csv';
import { chaveFiltros, limiteDeValor, ordemEfetiva, POR_PAGINA } from '../filtros';
import { relevancia, type Acertos } from '../relevancia/pontuacao';
import { interpretarBusca, type Busca } from '../relevancia/termos';
import { nomeProprio } from '../texto';
import type {
  Edital, EditalExportado, EditalRelacionado, EditalResumo, FiltrosBusca, OrgaoAberto, PontoMapa, ResultadoBusca, ResumoItens,
} from '../tipos';
import { compartilhado } from './cacheCompartilhado';
import { supabaseServidor } from './supabase';

const memoria = criarCache(5 * 60 * 1000);
/** Cache de 5 min: em memória na instância e, atrás dele, o compartilhado entre instâncias (lib/servidor/cacheCompartilhado.ts). */
const cache = <T>(chave: string, carregar: () => Promise<T>): Promise<T> => memoria(chave, () => compartilhado(chave, 5 * 60, carregar));
export const LIMITE_RELACIONADOS = 6;
export const LIMITE_ORGAOS = 20;
export type Linha = Record<string, unknown>;

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const texto = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));

/** Argumentos de buscar_editais (0011), sem a página: os termos vão separados (digitados, relacionados, excluídos). */
function argumentosBusca(f: FiltrosBusca, b: Busca) {
  return {
    // Texto sem os excluídos. Com p_termos o banco usa os termos; q fica para a chamada antiga.
    q: b.positivo,
    // Com raio a UF não filtra: o raio atravessa a divisa de estado.
    p_ufs: f.uf && !f.raio ? [f.uf] : null,
    p_ibge: f.ibge,
    p_dias: f.dias,
    // Valor 0 = sem limite (null), também no mapa e na exportação.
    p_valor_min: limiteDeValor(f.valorMin),
    p_modalidades: f.modalidades,
    p_orgao: f.orgao,
    p_raio_km: f.raio,
    p_termos: b.digitados,
    p_relacionados: b.relacionados.map((r) => r.termo),
    p_excluir: b.excluidos,
    p_ordem: ordemEfetiva(f.ordem, b.digitados.length > 0),
  };
}

const lista = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

/** Uma linha de buscar_editais → card da lista, com a relevância (número e explicação calculados aqui, pela busca). */
export function paraResumo(l: Linha, b: Busca, divergentes: string[], opcoes: { perfil?: boolean } = {}): EditalResumo {
  const acertos: Acertos = { termosObjeto: lista(l.termos_objeto), termosItens: lista(l.termos_itens), frase: l.frase === true };
  const rel = relevancia(acertos, b, opcoes);
  // A ordem vem do banco (pontuacao_busca) e o número do card vem daqui (pontuar), com os mesmos pesos.
  const doBanco = num(l.pontuacao);
  if (rel && doBanco !== null && doBanco !== rel.pontos) {
    divergentes.push(String(l.id));
  }
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
    situacao_id: num(l.situacao_id),
    relevancia: rel,
    destaques: acertos.termosObjeto,
  };
}

export function buscarEditais(f: FiltrosBusca): Promise<ResultadoBusca> {
  return cache(`busca:${chaveFiltros(f)}`, async () => {
    const b = interpretarBusca(f.q);
    const { data, error } = await supabaseServidor().rpc('buscar_editais', {
      ...argumentosBusca(f, b),
      p_limite: POR_PAGINA,
      p_deslocamento: (f.pagina - 1) * POR_PAGINA,
    });
    if (error) throw new Error(`buscar_editais: ${error.message}`);
    const linhas = (data ?? []) as Linha[];
    const divergentes: string[] = [];
    const editais = linhas.map((l) => paraResumo(l, b, divergentes));
    // Um aviso por pedido (não um por linha): quantidade e os 3 primeiros ids.
    if (divergentes.length > 0) {
      console.warn(`relevância diferente entre banco e site em ${divergentes.length} edital(is); primeiros: ${divergentes.slice(0, 3).join(', ')}`);
    }
    return { total: Number(linhas[0]?.total ?? 0), editais };
  });
}

/**
 * O PostgREST devolve no máximo 1.000 linhas por resposta: lê em páginas até o fim.
 * O mapa não filtra pela cidade sozinha (mostra todas, para escolher outra); com raio, só os municípios dentro dele.
 */
export function pontosDoMapa(f: FiltrosBusca): Promise<PontoMapa[]> {
  const ibge = f.raio ? f.ibge : null;
  return cache(`mapa:${chaveFiltros({ ...f, ibge, pagina: 1, ordem: null })}`, async () => {
    const b = interpretarBusca(f.q);
    const pontos: PontoMapa[] = [];
    for (let de = 0; ; de += 1000) {
      const { data, error } = await supabaseServidor()
        .rpc('mapa_editais', {
          q: b.positivo,
          p_termos: b.digitados,
          p_relacionados: b.relacionados.map((r) => r.termo),
          p_excluir: b.excluidos,
          // Com raio a UF não filtra: o raio atravessa a divisa de estado.
          p_ufs: f.uf && !f.raio ? [f.uf] : null,
          p_dias: f.dias,
          p_valor_min: limiteDeValor(f.valorMin),
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
        'id, slug, cnpj, ano, sequencial, objeto, info_complementar, orgao_nome, unidade_nome, esfera, municipio_nome, uf, codigo_ibge, modalidade_nome, situacao_id, situacao_nome, srp, valor_estimado, publicada_em, abertura_em, encerramento_em, link_origem, atualizada_pncp_em',
      )
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw new Error(`edital: ${error.message}`);
    return data ? ({ ...data, valor_estimado: num(data.valor_estimado), situacao_id: num(data.situacao_id) } as Edital) : null;
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

/** Editais parecidos abertos (função SQL `relacionados`), até 6, mais parecidos primeiro. */
export function relacionados(id: string): Promise<EditalRelacionado[]> {
  return cache(`relacionados:${id}`, async () => {
    const { data, error } = await supabaseServidor().rpc('relacionados', { p_id: id, p_limite: LIMITE_RELACIONADOS });
    if (error) throw new Error(`relacionados: ${error.message}`);
    return ((data ?? []) as Linha[]).map(
      (l): EditalRelacionado => ({
        id: String(l.id),
        slug: String(l.slug),
        objeto: String(l.objeto),
        orgao_nome: String(l.orgao_nome),
        municipio_nome: texto(l.municipio_nome),
        uf: String(l.uf),
        valor_estimado: num(l.valor_estimado),
        encerramento_em: String(l.encerramento_em),
        publicada_em: texto(l.publicada_em),
        modalidade_nome: texto(l.modalidade_nome),
        srp: Boolean(l.srp),
      }),
    );
  });
}

/** Órgãos com editais abertos cujo nome contém o termo (já limpo por `lerTermoOrgao`), mais editais primeiro. */
export function orgaosAbertos(q: string): Promise<OrgaoAberto[]> {
  const chave = q.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  return cache(`orgaos:${chave}`, async () => {
    const { data, error } = await supabaseServidor().rpc('orgaos_abertos', { q, p_limite: LIMITE_ORGAOS });
    if (error) throw new Error(`orgaos_abertos: ${error.message}`);
    return ((data ?? []) as Linha[]).map(
      (l): OrgaoAberto => ({ cnpj: String(l.cnpj), nome: nomeProprio(String(l.nome)), uf: String(l.uf), qtd: Number(l.qtd) }),
    );
  });
}

/**
 * Linhas da planilha: a mesma busca da lista, desde o começo, até MAX_EXPORTACAO.
 * Páginas de 1.000 (o teto do PostgREST por resposta). Sem cache: cada exportação conta no limite por IP.
 */
export async function exportarEditais(f: FiltrosBusca, maximo: number = MAX_EXPORTACAO): Promise<{ editais: EditalExportado[]; total: number }> {
  const b = interpretarBusca(f.q);
  const editais: EditalExportado[] = [];
  let total = 0;
  const divergentes: string[] = [];
  for (let de = 0; de < maximo; de += 1000) {
    const { data, error } = await supabaseServidor().rpc('buscar_editais', {
      ...argumentosBusca(f, b),
      p_limite: Math.min(1000, maximo - de),
      p_deslocamento: de,
    });
    if (error) throw new Error(`exportar: ${error.message}`);
    const linhas = (data ?? []) as Linha[];
    if (de === 0) total = Number(linhas[0]?.total ?? 0);
    for (const l of linhas) editais.push({ ...paraResumo(l, b, divergentes), link_origem: texto(l.link_origem) });
    if (linhas.length < 1000) break;
  }
  if (divergentes.length > 0) {
    console.warn(`relevância diferente entre banco e site em ${divergentes.length} edital(is); primeiros: ${divergentes.slice(0, 3).join(', ')}`);
  }
  return { editais, total };
}

/** Editais abertos por UF para um termo de assunto (com os relacionados, como a busca); sem termo, todos. */
export function abertosPorUf(q: string | null): Promise<Record<string, number>> {
  return cache(`uf:${q ?? ''}`, async () => {
    const b = interpretarBusca(q);
    const { data, error } = await supabaseServidor().rpc('abertos_por_uf', {
      p_termos: b.digitados,
      p_relacionados: b.relacionados.map((r) => r.termo),
      p_excluir: b.excluidos,
    });
    if (error) throw new Error(`abertos_por_uf: ${error.message}`);
    return Object.fromEntries(((data ?? []) as Linha[]).map((l) => [String(l.uf), Number(l.total)]));
  });
}

export function totalEditaisAbertos(): Promise<number> {
  return cache('total-abertos', async () => {
    const { data, error } = await supabaseServidor().rpc('total_editais_abertos', {});
    if (error) throw new Error(`total_editais_abertos: ${error.message}`);
    return Number(data ?? 0);
  });
}

/** Slugs abertos do sitemap, de `deslocamento` até `limite` linhas, em páginas de 1.000 (o teto do PostgREST por resposta). */
export function editaisAbertosSitemap(limite: number, deslocamento: number): Promise<Array<{ slug: string; atualizada_pncp_em: string }>> {
  // Só em memória: 40 mil linhas passam do limite de 2 MB por item do cache compartilhado.
  return memoria(`sitemap:${limite}:${deslocamento}`, async () => {
    const editais: Array<{ slug: string; atualizada_pncp_em: string }> = [];
    for (let de = 0; de < limite; de += 1000) {
      const { data, error } = await supabaseServidor().rpc('editais_abertos_sitemap', {
        p_limite: Math.min(1000, limite - de),
        p_deslocamento: deslocamento + de,
      });
      if (error) throw new Error(`editais_abertos_sitemap: ${error.message}`);
      const linhas = (data ?? []) as Linha[];
      for (const l of linhas) editais.push({ slug: String(l.slug), atualizada_pncp_em: String(l.atualizada_pncp_em) });
      if (linhas.length < 1000) break;
    }
    return editais;
  });
}

const memoriaHora = criarCache(60 * 60 * 1000);
export const cacheHora = <T>(chave: string, carregar: () => Promise<T>): Promise<T> => memoriaHora(chave, () => compartilhado(chave, 60 * 60, carregar));

/** Editais abertos por município (0019), para escolher as páginas /licitacoes/{uf}/{cidade}. Cache de 1 h. */
export function municipiosAbertos(): Promise<Array<{ codigo_ibge: string; nome: string; uf: string; total: number }>> {
  return cacheHora('municipios-abertos', async () => {
    const lista: Array<{ codigo_ibge: string; nome: string; uf: string; total: number }> = [];
    for (let de = 0; ; de += 1000) {
      const { data, error } = await supabaseServidor().rpc('municipios_abertos', {}).range(de, de + 999);
      if (error) throw new Error(`municipios_abertos: ${error.message}`);
      const linhas = (data ?? []) as Linha[];
      for (const l of linhas) lista.push({ codigo_ibge: String(l.codigo_ibge), nome: String(l.nome), uf: String(l.uf), total: Number(l.total) });
      if (linhas.length < 1000) return lista;
    }
  });
}

/** Editais abertos por modalidade e UF (0023): `{ 6: { SP: 120, … }, … }`. Cache de 1 h. */
export function abertosPorModalidade(): Promise<Record<number, Record<string, number>>> {
  return cacheHora('abertos-por-modalidade', async () => {
    const { data, error } = await supabaseServidor().rpc('abertos_por_modalidade', {});
    if (error) throw new Error(`abertos_por_modalidade: ${error.message}`);
    const saida: Record<number, Record<string, number>> = {};
    for (const l of (data ?? []) as Linha[]) {
      const id = Number(l.modalidade_id);
      (saida[id] ??= {})[String(l.uf)] = Number(l.total);
    }
    return saida;
  });
}

export type OrgaoLinha = { cnpj: string; nome: string; uf: string; codigo_ibge: string | null; total: number };

/** Órgãos com editais abertos (0023), para as páginas /licitacoes/orgao/{slug}. Cache de 1 h. */
export function orgaosAbertosLista(): Promise<OrgaoLinha[]> {
  return cacheHora('orgaos-abertos-lista', async () => {
    const lista: OrgaoLinha[] = [];
    for (let de = 0; ; de += 1000) {
      const { data, error } = await supabaseServidor().rpc('orgaos_abertos_lista', {}).range(de, de + 999);
      if (error) throw new Error(`orgaos_abertos_lista: ${error.message}`);
      const linhas = (data ?? []) as Linha[];
      for (const l of linhas) {
        lista.push({ cnpj: String(l.cnpj), nome: String(l.nome), uf: String(l.uf), codigo_ibge: texto(l.codigo_ibge), total: Number(l.total) });
      }
      if (linhas.length < 1000) return lista;
    }
  });
}
