import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { esquecerConta } from './conta';
import {
  acaoDoBotao,
  aplicarAcao,
  carregarSalvos,
  esquecerSalvos,
  estadoDaResposta,
  lerSalvos,
  mudarSalvo,
  voltarSalvo,
  type EstadoSalvos,
} from './salvos';

const PRONTO: EstadoSalvos = { fase: 'pronto', plano: 'pro', limite: 500, usados: 1, salvos: { a: { status: 'salvo', nota: false }, d: { status: 'descartado', nota: false } } };

describe('estado dos salvos no navegador', () => {
  it('resposta de GET /api/salvos', () => {
    expect(estadoDaResposta(true, { conta: false })).toEqual({ fase: 'anonimo' });
    expect(estadoDaResposta(true, { conta: true, plano: 'pro', limite: 500, usados: 1, salvos: PRONTO.fase === 'pronto' ? PRONTO.salvos : {} })).toEqual(PRONTO);
    expect(estadoDaResposta(false, { erro: 'x' })).toEqual({ fase: 'erro' });
    expect(estadoDaResposta(true, null)).toEqual({ fase: 'erro' });
  });
  it('ação aceita atualiza o mapa e os usados (descartados não contam)', () => {
    const salvo = aplicarAcao(PRONTO, 'b', { status: 'salvo' });
    expect(salvo).toMatchObject({ usados: 2, salvos: { b: { status: 'salvo', nota: false } } });
    expect(aplicarAcao(salvo, 'a', { remover: true })).toMatchObject({ usados: 1 });
    expect(aplicarAcao(PRONTO, 'a', { status: 'descartado' })).toMatchObject({ usados: 0, salvos: { a: { status: 'descartado' } } });
    expect(aplicarAcao({ fase: 'anonimo' }, 'a', { remover: true })).toEqual({ fase: 'anonimo' });
  });
  it('voltar um edital ao que era (ação recusada pelo servidor)', () => {
    const removido = aplicarAcao(PRONTO, 'a', { remover: true });
    expect(voltarSalvo(removido, 'a', { status: 'salvo', nota: false })).toEqual(PRONTO);
    expect(voltarSalvo(aplicarAcao(PRONTO, 'b', { status: 'salvo' }), 'b', undefined)).toEqual(PRONTO);
    expect(voltarSalvo({ fase: 'erro' }, 'a', undefined)).toEqual({ fase: 'erro' });
  });
  it('o que um toque no "Salvar" faz', () => {
    expect(acaoDoBotao({ fase: 'carregando' }, 'a')).toBe('carregando');
    expect(acaoDoBotao({ fase: 'anonimo' }, 'a')).toBe('entrar');
    expect(acaoDoBotao({ fase: 'erro' }, 'a')).toBe('salvar');
    expect(acaoDoBotao(PRONTO, 'a')).toBe('remover');
    expect(acaoDoBotao(PRONTO, 'd')).toBe('salvar');
    expect(acaoDoBotao(PRONTO, 'novo')).toBe('salvar');
    expect(acaoDoBotao({ ...PRONTO, usados: 500 } as EstadoSalvos, 'novo')).toBe('bloqueado');
    expect(acaoDoBotao({ ...PRONTO, plano: 'gratis', limite: 0, usados: 0 } as EstadoSalvos, 'novo')).toBe('bloqueado');
  });
});

describe('mudarSalvo: mostra na hora e desfaz se o servidor recusar', () => {
  let resposta: { status: number; corpo: unknown };
  const pedidos: Array<{ url: string; metodo: string; corpo: unknown }> = [];

  beforeEach(async () => {
    pedidos.length = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        const metodo = init?.method ?? 'GET';
        pedidos.push({ url, metodo, corpo: init?.body ? JSON.parse(String(init.body)) : undefined });
        if (url === '/api/conta') return Response.json({ email: 'a@b.com' });
        if (metodo === 'GET') return Response.json({ conta: true, plano: 'pro', limite: 500, usados: 1, salvos: { a: { status: 'salvo', nota: true } } });
        return Response.json(resposta.corpo, { status: resposta.status });
      }),
    );
    esquecerConta();
    esquecerSalvos();
    await carregarSalvos();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    esquecerConta();
    esquecerSalvos();
  });

  it('aceito: o edital fica salvo (POST com o id e o status)', async () => {
    resposta = { status: 200, corpo: { ok: true, status: 'salvo' } };
    const promessa = mudarSalvo('b', { status: 'salvo' });
    expect(lerSalvos()).toMatchObject({ usados: 2, salvos: { b: { status: 'salvo' } } });
    expect(await promessa).toMatchObject({ ok: true });
    expect(lerSalvos()).toMatchObject({ usados: 2, salvos: { b: { status: 'salvo' } } });
    expect(pedidos.at(-1)).toEqual({ url: '/api/salvos', metodo: 'POST', corpo: { id: 'b', status: 'salvo' } });
  });
  it('recusado (402, 503, 502): volta ao que era, com a observação', async () => {
    for (const r of [
      { status: 402, corpo: { erro: 'Salvar editais é do plano Pro.', codigo: 'plano' } },
      { status: 503, corpo: { erro: 'Não deu para confirmar seu plano agora. Tente de novo.' } },
      { status: 502, corpo: null },
    ]) {
      resposta = r;
      const promessa = mudarSalvo('a', { remover: true });
      expect(lerSalvos()).toMatchObject({ usados: 0 });
      expect(await promessa).toMatchObject({ ok: false });
      expect(lerSalvos()).toMatchObject({ usados: 1, salvos: { a: { status: 'salvo', nota: true } } });
    }
    expect(pedidos.at(-1)).toEqual({ url: '/api/salvos', metodo: 'DELETE', corpo: { id: 'a' } });
  });
});
