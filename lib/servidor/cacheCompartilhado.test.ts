import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { compartilhado } = await import('./cacheCompartilhado');

describe('compartilhado', () => {
  it('fora de uma requisição do Next (testes, worker) carrega direto', async () => {
    const carregar = vi.fn(async () => 42);
    await expect(compartilhado('x', 60, carregar)).resolves.toBe(42);
    expect(carregar).toHaveBeenCalledTimes(1);
  });
  it('erro da consulta passa adiante', async () => {
    await expect(compartilhado('y', 60, async () => { throw new Error('banco fora'); })).rejects.toThrow('banco fora');
  });
});
