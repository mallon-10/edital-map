import { describe, expect, it, vi } from 'vitest';
import { criarCache } from './cache';

describe('criarCache', () => {
  it('reaproveita o valor dentro da validade e recarrega depois', async () => {
    let t = 0;
    const cache = criarCache(1000, () => t);
    const carregar = vi.fn(async () => 'x');
    expect(await cache('a', carregar)).toBe('x');
    t = 999;
    expect(await cache('a', carregar)).toBe('x');
    expect(carregar).toHaveBeenCalledTimes(1);
    t = 1000;
    await cache('a', carregar);
    expect(carregar).toHaveBeenCalledTimes(2);
  });
  it('chamadas simultâneas compartilham a mesma carga', async () => {
    const cache = criarCache(1000, () => 0);
    const carregar = vi.fn(async () => 1);
    await Promise.all([cache('a', carregar), cache('a', carregar)]);
    expect(carregar).toHaveBeenCalledTimes(1);
  });
  it('falha não fica guardada', async () => {
    const cache = criarCache(1000, () => 0);
    await expect(cache('a', async () => { throw new Error('caiu'); })).rejects.toThrow('caiu');
    expect(await cache('a', async () => 'ok')).toBe('ok');
  });
  it('descarta a entrada mais antiga quando passa do máximo', async () => {
    const cache = criarCache(1000, () => 0, 2);
    const carregarA = vi.fn(async () => 'a');
    await cache('a', carregarA);
    await cache('b', async () => 'b');
    await cache('c', async () => 'c');
    await cache('a', carregarA);
    expect(carregarA).toHaveBeenCalledTimes(2);
  });
});
