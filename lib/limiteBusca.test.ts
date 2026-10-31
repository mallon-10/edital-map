import { describe, expect, it } from 'vitest';
import { EDITAIS_GRATIS_POR_BUSCA, buscaLimitada, buscaPedeSessao, limitarResultado } from './limiteBusca';
import type { EditalResumo } from './tipos';

const editais = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `e${i}` }) as EditalResumo);

describe('buscaLimitada', () => {
  const G = { plano: 'gratis' as const, pagamento: true };
  it('grátis pesquisando um assunto: limitado', () => {
    expect(EDITAIS_GRATIS_POR_BUSCA).toBe(5);
    expect(buscaLimitada('uniforme', G)).toBe(true);
  });
  it('sem pesquisa, a página inicial fica livre', () => {
    expect(buscaLimitada(null, G)).toBe(false);
    expect(buscaLimitada('   ', G)).toBe(false);
    expect(buscaLimitada('-camisa', G)).toBe(false);
  });
  it('quem assina vê tudo, inclusive o plano antigo', () => {
    expect(buscaLimitada('uniforme', { plano: 'pro', pagamento: true })).toBe(false);
    expect(buscaLimitada('uniforme', { plano: 'basic', pagamento: true })).toBe(false);
  });
  it('sem pagamento ligado não há como liberar: nada de cadeado', () => {
    expect(buscaLimitada('uniforme', { plano: 'gratis', pagamento: false })).toBe(false);
  });
});

describe('limitarResultado', () => {
  it('mantém os 5 primeiros e conta os bloqueados pelo total real', () => {
    const r = limitarResultado({ total: 286, editais: editais(20) });
    expect(r.editais.map((e) => e.id)).toEqual(['e0', 'e1', 'e2', 'e3', 'e4']);
    expect(r.total).toBe(286);
    expect(r.bloqueados).toBe(281);
  });
  it('com até 5 resultados, não há o que bloquear', () => {
    expect(limitarResultado({ total: 5, editais: editais(5) })).toMatchObject({ total: 5, bloqueados: 0 });
    expect(limitarResultado({ total: 2, editais: editais(2) }).editais).toHaveLength(2);
  });
});

describe('buscaPedeSessao', () => {
  const url = (c: string) => new URL(`https://x${c}`);
  it('a pesquisa precisa saber se a pessoa assina: renova o login', () => {
    expect(buscaPedeSessao(url('/?q=uniforme'))).toBe(true);
    expect(buscaPedeSessao(url('/api/busca?q=uniforme'))).toBe(true);
    expect(buscaPedeSessao(url('/api/exportar?q=uniforme'))).toBe(true);
  });
  it('sem pesquisa, ou em outra página, nada de rede', () => {
    expect(buscaPedeSessao(url('/'))).toBe(false);
    expect(buscaPedeSessao(url('/?q=%20'))).toBe(false);
    expect(buscaPedeSessao(url('/api/busca?uf=SC'))).toBe(false);
    expect(buscaPedeSessao(url('/planos?q=uniforme'))).toBe(false);
  });
});
