import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { LOTE_BANCO } from './config';
import type { ChaveCompra, LinhaContratacao, LinhaItem } from './mapear';

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
  upsertItens(linhas: LinhaItem[]): Promise<void>;
  removerItensAlem(contratacaoId: string, numeros: number[]): Promise<void>;
  atualizacoesConhecidas(ids: string[]): Promise<Map<string, string>>;
  abertasSemItens(limite: number): Promise<ChaveCompra[]>;
  lerEstado(chave: string): Promise<EstadoSync | null>;
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

    async upsertItens(linhas) {
      for (const lote of emLotes(linhas, LOTE_BANCO)) {
        const { error } = await sb.from('itens').upsert(lote, { onConflict: 'contratacao_id,numero' });
        falhar('gravar itens', error);
      }
    },

    async removerItensAlem(contratacaoId, numeros) {
      let consulta = sb.from('itens').delete().eq('contratacao_id', contratacaoId);
      if (numeros.length > 0) consulta = consulta.not('numero', 'in', `(${numeros.join(',')})`);
      const { error } = await consulta;
      falhar('remover itens', error);
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
      // Anti-join do PostgREST: embute itens e filtra quem não tem nenhum.
      const { data, error } = await sb
        .from('contratacoes')
        .select('id, cnpj, ano, sequencial, itens(contratacao_id)')
        .gt('encerramento_em', agora().toISOString())
        .is('itens', null)
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

    async lerEstado(chave) {
      const { data, error } = await sb
        .from('sync_estado')
        .select('chave, ultima_data, ultima_execucao, status, erro')
        .eq('chave', chave)
        .maybeSingle();
      falhar('ler sync_estado', error);
      return (data as EstadoSync | null) ?? null;
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
