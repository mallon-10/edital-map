import { afterEach, describe, expect, it, vi } from 'vitest';
import { esquecerConta, lerConta } from './conta';

afterEach(() => {
  vi.unstubAllGlobals();
  esquecerConta();
});

describe('lerConta', () => {
  it('um pedido só por carga, sem cache do navegador', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ email: 'dono@empresa.com.br' })));
    vi.stubGlobal('fetch', f);
    expect(await lerConta()).toBe('dono@empresa.com.br');
    expect(await lerConta()).toBe('dono@empresa.com.br');
    expect(f).toHaveBeenCalledTimes(1);
    expect(f).toHaveBeenCalledWith('/api/conta', { cache: 'no-store' });
  });
  it('sem sessão, erro ou rede fora: null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ email: null }))));
    expect(await lerConta()).toBeNull();
    esquecerConta();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 502 })));
    expect(await lerConta()).toBeNull();
    esquecerConta();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('rede'); }));
    expect(await lerConta()).toBeNull();
  });
});
