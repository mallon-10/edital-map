import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const m = vi.hoisted(() => ({ entrarComLink: vi.fn() }));
vi.mock('@/lib/servidor/sessao', () => ({ entrarComLink: m.entrarComLink }));

const { GET } = await import('./route');

const pedir = (q: string) => new Request(`https://www.editalmap.com.br/entrar/confirmar${q}`);

describe('GET /entrar/confirmar (link do e-mail)', () => {
  beforeEach(() => m.entrarComLink.mockReset());

  it('código do link certo: troca pela sessão e segue para o Meu Radar', async () => {
    m.entrarComLink.mockResolvedValue({ ok: true });
    const r = await GET(pedir('?code=0b6f8a52-3c1d-4e2f-9a7b-1c2d3e4f5a6b'));
    expect(m.entrarComLink).toHaveBeenCalledWith('0b6f8a52-3c1d-4e2f-9a7b-1c2d3e4f5a6b');
    expect(r.status).toBe(303);
    expect(r.headers.get('location')).toBe('https://www.editalmap.com.br/radar');
    expect(r.headers.get('cache-control')).toContain('no-store');
  });

  it('link vencido ou aberto em outro navegador: volta a /entrar com o aviso', async () => {
    m.entrarComLink.mockResolvedValue({ ok: false });
    const r = await GET(pedir('?code=0b6f8a52-3c1d-4e2f-9a7b-1c2d3e4f5a6b'));
    expect(r.headers.get('location')).toBe('https://www.editalmap.com.br/entrar?erro=link');
  });

  it('sem código ou com lixo: não chama o Auth', async () => {
    for (const q of ['', '?code=', '?code=%3Cscript%3E', `?code=${'a'.repeat(300)}`]) {
      const r = await GET(pedir(q));
      expect(r.headers.get('location')).toBe('https://www.editalmap.com.br/entrar?erro=link');
    }
    expect(m.entrarComLink).not.toHaveBeenCalled();
  });
});
