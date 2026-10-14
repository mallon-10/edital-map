import { describe, expect, it } from 'vitest';
import { executarBackfill, janelas } from './carga';
import { AGORA, BancoFalso, clienteFalso, contratacaoBruta, montarDeps } from './testes/fakes';

describe('janelas', () => {
  it('corta o período em blocos de 7 dias, com o último menor', () => {
    expect(janelas('2026-10-01', '2026-10-15', 7)).toEqual([
      ['2026-10-01', '2026-10-07'],
      ['2026-10-08', '2026-10-14'],
      ['2026-10-15', '2026-10-15'],
    ]);
  });
  it('período de um dia vira uma janela', () => {
    expect(janelas('2026-10-14', '2026-10-14', 7)).toEqual([['2026-10-14', '2026-10-14']]);
  });
});

describe('executarBackfill', () => {
  it('lê a publicação em janelas e deixa o estado pronto para o sync', async () => {
    const banco = new BancoFalso();
    const cliente = clienteFalso({
      paginas: (_endpoint, filtro) => (filtro.dataInicial === '2026-10-11' ? [[contratacaoBruta({ sequencial: 1 })]] : []),
    });
    await executarBackfill(montarDeps(banco, cliente), { dias: 10, ufs: ['SC'], modalidades: [6] });
    expect(cliente.chamadas).toEqual([
      { endpoint: 'publicacao', filtro: { uf: 'SC', modalidade: 6, dataInicial: '2026-10-04', dataFinal: '2026-10-10' } },
      { endpoint: 'publicacao', filtro: { uf: 'SC', modalidade: 6, dataInicial: '2026-10-11', dataFinal: '2026-10-14' } },
    ]);
    expect(banco.contratacoes.size).toBe(1);
    expect(banco.estados.get('atualizacao:SC:6')).toEqual({
      chave: 'atualizacao:SC:6',
      ultima_data: '2026-10-14',
      ultima_execucao: AGORA.toISOString(),
      status: 'ok',
      erro: null,
    });
  });
  it('erro numa chave não impede as outras', async () => {
    const banco = new BancoFalso();
    const cliente = clienteFalso({
      paginas: (_endpoint, filtro) => {
        if (filtro.modalidade === 6) throw new Error('HTTP 500');
        return [];
      },
    });
    const deps = montarDeps(banco, cliente);
    await executarBackfill(deps, { dias: 3, ufs: ['SC'], modalidades: [6, 8] });
    expect(deps.resumo.erros.map((e) => e.chave)).toEqual(['atualizacao:SC:6']);
    expect(banco.estados.has('atualizacao:SC:6')).toBe(false);
    expect(banco.estados.get('atualizacao:SC:8')?.status).toBe('ok');
  });
});
