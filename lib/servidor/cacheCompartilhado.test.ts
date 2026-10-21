import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { compartilhado, dentroDoPrazo } = await import('./cacheCompartilhado');

describe('dentroDoPrazo', () => {
  const agora = () => 1_000_000;
  it('cópia dentro do prazo vale e não consulta de novo', async () => {
    const carregar = vi.fn(async () => 'novo');
    await expect(dentroDoPrazo(async () => ({ em: 1_000_000 - 300_000, valor: 'guardado' }), carregar, 300, agora)).resolves.toBe('guardado');
    expect(carregar).not.toHaveBeenCalled();
  });
  it('cópia vencida (o Data Cache entrega e renova em segundo plano) não vale: consulta de novo', async () => {
    const carregar = vi.fn(async () => 'novo');
    await expect(dentroDoPrazo(async () => ({ em: 1_000_000 - 300_001, valor: 'velho' }), carregar, 300, agora)).resolves.toBe('novo');
    await expect(dentroDoPrazo(async () => ({ em: 1_000_000 - 5_400_000, valor: 'velho' }), carregar, 300, agora)).resolves.toBe('novo');
    expect(carregar).toHaveBeenCalledTimes(2);
  });
});

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
