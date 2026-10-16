import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { criarBanco, emLotes } from './banco';
import type { ResumoItensBanco } from './itens';

describe('emLotes', () => {
  it('divide em lotes do tamanho pedido', () => {
    expect(emLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it('lista vazia não gera lote', () => {
    expect(emLotes([], 500)).toEqual([]);
  });
  it('recusa tamanho inválido', () => {
    expect(() => emLotes([1], 0)).toThrow();
  });
});

/** Cliente do Supabase falso: registra cada método chamado (o contrato TS↔SQL) e responde sem erro. */
function sbFalso(erro: { message: string } | null = null) {
  const chamadas: unknown[][] = [];
  const consulta: Record<string, unknown> = {};
  for (const metodo of ['from', 'select', 'delete', 'in', 'like', 'gt', 'is', 'order', 'limit']) {
    consulta[metodo] = (...args: unknown[]) => {
      chamadas.push([metodo, ...args]);
      return consulta;
    };
  }
  consulta.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: [], error: erro }).then(ok);
  consulta.rpc = (...args: unknown[]) => {
    chamadas.push(['rpc', ...args]);
    return Promise.resolve({ data: null, error: erro });
  };
  return { sb: consulta as unknown as SupabaseClient, chamadas };
}

const RESUMO: ResumoItensBanco = { total: 2, materiais: 2, servicos: 0, com_beneficio: 1, exclusivos: 1, cota: 0, criterios: ['Menor preço'] };

describe('gravarResumoItens', () => {
  it('chama gravar_resumo_itens com p_id, p_palavras e p_resumo', async () => {
    const { sb, chamadas } = sbFalso();
    await criarBanco(sb).gravarResumoItens('C1', 'Luva nitrílica', RESUMO);
    expect(chamadas).toEqual([['rpc', 'gravar_resumo_itens', { p_id: 'C1', p_palavras: 'Luva nitrílica', p_resumo: RESUMO }]]);
  });
  it('erro do banco vira exceção com contexto', async () => {
    const { sb } = sbFalso({ message: 'função não existe' });
    await expect(criarBanco(sb).gravarResumoItens('C1', 'x', RESUMO)).rejects.toThrow('gravar resumo dos itens: função não existe');
  });
});

describe('abertasSemItens', () => {
  it('filtra abertas com itens_resumo nulo, prazo mais próximo primeiro', async () => {
    const { sb, chamadas } = sbFalso();
    const agora = new Date('2026-10-14T15:00:00Z');
    await criarBanco(sb, () => agora).abertasSemItens(30);
    expect(chamadas).toEqual([
      ['from', 'contratacoes'],
      ['select', 'id, cnpj, ano, sequencial'],
      ['gt', 'encerramento_em', agora.toISOString()],
      ['is', 'itens_resumo', null],
      ['order', 'encerramento_em', { ascending: true }],
      ['limit', 30],
    ]);
  });
});

describe('removerContratacoes e estadosDaModalidade', () => {
  it('apaga as contratações pelo id', async () => {
    const { sb, chamadas } = sbFalso();
    await criarBanco(sb).removerContratacoes(['A', 'B']);
    expect(chamadas).toEqual([['from', 'contratacoes'], ['delete'], ['in', 'id', ['A', 'B']]]);
  });
  it('sem ids não chama o banco', async () => {
    const { sb, chamadas } = sbFalso();
    await criarBanco(sb).removerContratacoes([]);
    expect(chamadas).toEqual([]);
  });
  it('lê as chaves de atualização da modalidade', async () => {
    const { sb, chamadas } = sbFalso();
    await criarBanco(sb).estadosDaModalidade(6);
    expect(chamadas).toEqual([
      ['from', 'sync_estado'],
      ['select', 'chave, ultima_data, ultima_execucao, status, erro'],
      ['like', 'chave', 'atualizacao:%:6'],
    ]);
  });
});
