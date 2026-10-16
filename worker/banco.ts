import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { LOTE_BANCO } from './config';
import type { ResumoItensBanco } from './itens';
import type { ChaveCompra, LinhaContratacao } from './mapear';

export type EstadoSync = {
  chave: string;
  ultima_data: string;
  ultima_execucao: string | null;
  status: string | null;
  erro: string | null;
};

export type LinhaMunicipio = { codigo_ibge: string; nome: string; uf: string; lat: number; lng: number };

export interface Banco {
  upsertContratacoes(linhas: LinhaContratacao[]): Promise<void>;
  /** Apaga contratações (as que saíram da retenção depois de gravadas). */
  removerContratacoes(ids: string[]): Promise<void>;
  /** Palavras de todas as descrições + resumo dos itens de uma compra (função SQL gravar_resumo_itens; o texto não é guardado). */
  gravarResumoItens(contratacaoId: string, palavras: string, resumo: ResumoItensBanco): Promise<void>;
  atualizacoesConhecidas(ids: string[]): Promise<Map<string, string>>;
  /** Abertas ainda sem resumo dos itens, prazo mais próximo primeiro (catch-up). */
  abertasSemItens(limite: number): Promise<ChaveCompra[]>;
  /** Compras abertas em ordem de id, a partir de `depoisDe` (exclusivo), até `limite`. */
  abertas(depoisDe: string | null, limite: number): Promise<ChaveCompra[]>;
  lerEstado(chave: string): Promise<EstadoSync | null>;
  /** Estados das chaves de atualização de uma modalidade (por UF e BR), para a chave nacional herdar a data. */
  estadosDaModalidade(modalidade: number): Promise<EstadoSync[]>;
  gravarEstado(estado: EstadoSync): Promise<void>;
}

export type BancoSupabase = Banco & { upsertMunicipios(linhas: LinhaMunicipio[]): Promise<void> };

export function emLotes<T>(itens: T[], tamanho: number): T[][] {
  if (!Number.isInteger(tamanho) || tamanho < 1) throw new Error(`Tamanho de lote inválido: ${tamanho}`);
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
  return lotes;
}

function falhar(contexto: string, erro: { message: string } | null): void {
  if (erro) throw new Error(`${contexto}: ${erro.message}`);
}

export function criarSupabase(url: string, chave: string): SupabaseClient {
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function criarBanco(sb: SupabaseClient, agora: () => Date = () => new Date()): BancoSupabase {
  return {
    async upsertContratacoes(linhas) {
      for (const lote of emLotes(linhas, LOTE_BANCO)) {
        const { error } = await sb.from('contratacoes').upsert(lote, { onConflict: 'id' });
        falhar('gravar contratacoes', error);
      }
    },

    async removerContratacoes(ids) {
      for (const lote of emLotes(ids, 200)) {
        const { error } = await sb.from('contratacoes').delete().in('id', lote);
        falhar('remover contratacoes', error);
      }
    },

    async gravarResumoItens(contratacaoId, palavras, resumo) {
      const { error } = await sb.rpc('gravar_resumo_itens', { p_id: contratacaoId, p_palavras: palavras, p_resumo: resumo });
      falhar('gravar resumo dos itens', error);
    },

    async atualizacoesConhecidas(ids) {
      const mapa = new Map<string, string>();
      for (const lote of emLotes([...new Set(ids)], 200)) {
        const { data, error } = await sb.from('contratacoes').select('id, atualizada_pncp_em').in('id', lote);
        falhar('ler atualizações conhecidas', error);
        for (const linha of data ?? []) mapa.set(linha.id as string, linha.atualizada_pncp_em as string);
      }
      return mapa;
    },

    async abertasSemItens(limite) {
      const { data, error } = await sb
        .from('contratacoes')
        .select('id, cnpj, ano, sequencial')
        .gt('encerramento_em', agora().toISOString())
        .is('itens_resumo', null)
        .order('encerramento_em', { ascending: true })
        .limit(limite);
      falhar('listar abertas sem itens', error);
      return (data ?? []).map((l) => ({
        id: l.id as string,
        cnpj: l.cnpj as string,
        ano: l.ano as number,
        sequencial: l.sequencial as number,
      }));
    },

    async abertas(depoisDe, limite) {
      let consulta = sb
        .from('contratacoes')
        .select('id, cnpj, ano, sequencial')
        .gt('encerramento_em', agora().toISOString())
        .order('id', { ascending: true })
        .limit(limite);
      if (depoisDe) consulta = consulta.gt('id', depoisDe);
      const { data, error } = await consulta;
      falhar('listar abertas', error);
      return (data ?? []).map((l) => ({
        id: l.id as string,
        cnpj: l.cnpj as string,
        ano: l.ano as number,
        sequencial: l.sequencial as number,
      }));
    },

    async lerEstado(chave) {
      const { data, error } = await sb
        .from('sync_estado')
        .select('chave, ultima_data, ultima_execucao, status, erro')
        .eq('chave', chave)
        .maybeSingle();
      falhar('ler sync_estado', error);
      return (data as EstadoSync | null) ?? null;
    },

    async estadosDaModalidade(modalidade) {
      const { data, error } = await sb
        .from('sync_estado')
        .select('chave, ultima_data, ultima_execucao, status, erro')
        .like('chave', `atualizacao:%:${modalidade}`);
      falhar('ler sync_estado da modalidade', error);
      return (data ?? []) as EstadoSync[];
    },

    async gravarEstado(estado) {
      const { error } = await sb.from('sync_estado').upsert(estado, { onConflict: 'chave' });
      falhar('gravar sync_estado', error);
    },

    async upsertMunicipios(linhas) {
      for (const lote of emLotes(linhas, LOTE_BANCO)) {
        const { error } = await sb.from('municipios').upsert(lote, { onConflict: 'codigo_ibge' });
        falhar('gravar municipios', error);
      }
    },
  };
}
