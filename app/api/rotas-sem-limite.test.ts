import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  buscarEditais: vi.fn(),
  pontosDoMapa: vi.fn(),
  exportarEditais: vi.fn(),
  exportacaoDentroDoLimite: vi.fn(),
  planoDaPagina: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/servidor/registro', () => ({
  contexto: async () => ({ visitante: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b', interno: false, dono: false, ipHash: 'ip' }),
  exportacaoDentroDoLimite: m.exportacaoDentroDoLimite,
  gravarEvento: async () => undefined,
}));
// Grátis com o pagamento ligado: antes, o caso dos 402 (limite_diario e recurso_pro).
vi.mock('@/lib/servidor/plano', () => ({
  pagamentoLigado: () => true,
  planoAtual: async () => 'gratis',
  planoDaPagina: m.planoDaPagina,
}));
vi.mock('@/lib/servidor/consultas', () => ({
  buscarEditais: m.buscarEditais,
  pontosDoMapa: m.pontosDoMapa,
  exportarEditais: m.exportarEditais,
}));

const busca = await import('./busca/route');
const mapa = await import('./mapa/route');
const exportar = await import('./exportar/route');
const plano = await import('./plano/route');
const contagem = await import('./contagem/route');

const pedido = (caminho: string) => new Request(`http://localhost${caminho}`);
const PRO = /limite_diario|recurso_pro/;

beforeEach(() => {
  vi.clearAllMocks();
  m.buscarEditais.mockResolvedValue({ total: 1, editais: [] });
  m.pontosDoMapa.mockResolvedValue([]);
  m.exportarEditais.mockResolvedValue({ editais: [], total: 0 });
  m.exportacaoDentroDoLimite.mockResolvedValue(true);
  m.planoDaPagina.mockResolvedValue({ plano: 'gratis', dono: false });
});

describe('/api/busca (grátis: nada de 402)', () => {
  it('quantas buscas forem: sempre a lista, nunca 402', async () => {
    for (const q of ['luva', 'botina', 'capacete', 'uniforme', 'jaleco']) {
      const r = await busca.GET(pedido(`/api/busca?q=${q}&uf=SC`));
      expect(r.status).toBe(200);
      expect(r.headers.get('cache-control')).toBe('private, no-store');
      expect(await r.json()).toMatchObject({ total: 1, editais: [] });
    }
    expect(m.buscarEditais).toHaveBeenCalledTimes(5);
  });
  it('raio e órgão sem o Pro: lista normal, sem recurso_pro', async () => {
    const r = await busca.GET(pedido('/api/busca?q=luva&ibge=4209102&raio=50&orgao=00394452000103'));
    expect(r.status).toBe(200);
    expect(JSON.stringify(await r.json())).not.toMatch(PRO);
    expect(m.buscarEditais).toHaveBeenCalledWith(expect.objectContaining({ raio: 50, orgao: '00394452000103' }));
  });
  it('banco fora: 502 com a mensagem', async () => {
    m.buscarEditais.mockRejectedValue(new Error('fora'));
    expect((await busca.GET(pedido('/api/busca?q=luva'))).status).toBe(502);
  });
});

describe('/api/mapa (grátis e sem limite)', () => {
  it('pontos com raio e órgão, nunca 402', async () => {
    for (const q of ['luva', 'botina', 'capacete', 'uniforme']) {
      const r = await mapa.GET(pedido(`/api/mapa?q=${q}&ibge=4209102&raio=50&orgao=00394452000103`));
      expect(r.status).toBe(200);
      expect(await r.json()).toEqual([]);
    }
  });
});

describe('/api/exportar (grátis, com as travas contra abuso)', () => {
  it('sem o Pro: planilha normal, sem recurso_pro', async () => {
    const r = await exportar.GET(pedido('/api/exportar?q=luva&ibge=4209102&raio=50'));
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(r.headers.get('cache-control')).toBe('private, no-store');
    expect(m.exportacaoDentroDoLimite).toHaveBeenCalledWith('ip', 20);
  });
  it('acima de 20 por hora por IP: 429, sem exportar', async () => {
    m.exportacaoDentroDoLimite.mockResolvedValue(false);
    const r = await exportar.GET(pedido('/api/exportar?q=luva'));
    expect(r.status).toBe(429);
    expect(((await r.json()) as { erro: string }).erro).toMatch(/20 exportações por hora/);
    expect(m.exportarEditais).not.toHaveBeenCalled();
  });
});

describe('/api/plano', () => {
  it('plano e dono para o cabeçalho, sem cache', async () => {
    m.planoDaPagina.mockResolvedValue({ plano: 'pro', dono: false });
    const r = await plano.GET();
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
    expect(await r.json()).toEqual({ plano: 'pro', dono: false });
  });
});

describe('/api/contagem', () => {
  it('só o total, com cache público', async () => {
    m.buscarEditais.mockResolvedValue({ total: 42, editais: [{ id: 'x' }] });
    const r = await contagem.GET(pedido('/api/contagem?q=luva&pagina=3'));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ total: 42 });
    expect(r.headers.get('cache-control')).toContain('s-maxage=300');
    expect(m.buscarEditais).toHaveBeenCalledWith(expect.objectContaining({ q: 'luva', pagina: 1, ordem: 'prazo' }));
  });
});

describe('/api/exportar no plano', () => {
  it('grátis com termo: só os editais liberados, sem a nota do teto de 2.000', async () => {
    m.exportarEditais.mockResolvedValue({ editais: [], total: 286 });
    const r = await exportar.GET(pedido('/api/exportar?q=uniforme'));
    expect(m.exportarEditais.mock.calls[0][1]).toBe(5);
    expect(await r.text()).not.toContain('limite de');
  });
  it('sem termo: o teto normal', async () => {
    await exportar.GET(pedido('/api/exportar?uf=SC'));
    expect(m.exportarEditais.mock.calls[0][1]).toBeUndefined();
  });
});
