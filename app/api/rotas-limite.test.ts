import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lerLimite, lerRecursoPro } from '@/lib/limites';

const m = vi.hoisted(() => ({
  decidirBusca: vi.fn(),
  usoDoDia: vi.fn(),
  buscarEditais: vi.fn(),
  pontosDoMapa: vi.fn(),
  exportarEditais: vi.fn(),
  semRecursoPro: vi.fn(),
}));

vi.mock('@/lib/servidor/registro', () => ({
  contexto: async () => ({ visitante: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b', interno: false, dono: false, ipHash: null }),
  exportacaoDentroDoLimite: async () => true,
  gravarEvento: async () => undefined,
}));
vi.mock('@/lib/servidor/uso', () => ({ decidirBusca: m.decidirBusca, usoDoDia: m.usoDoDia, semRecursoPro: m.semRecursoPro }));
vi.mock('@/lib/servidor/consultas', () => ({
  buscarEditais: m.buscarEditais,
  pontosDoMapa: m.pontosDoMapa,
  exportarEditais: m.exportarEditais,
}));

const busca = await import('./busca/route');
const mapa = await import('./mapa/route');
const exportar = await import('./exportar/route');
const uso = await import('./uso/route');
const contagem = await import('./contagem/route');

const BLOQUEADA = { permitido: false, limite: { tipo: 'busca', usados: 3, maximo: 3 } };
const pedido = (caminho: string) => new Request(`http://localhost${caminho}`);

beforeEach(() => {
  vi.clearAllMocks();
  m.decidirBusca.mockResolvedValue({ permitido: true, usados: 2 });
  m.buscarEditais.mockResolvedValue({ total: 1, editais: [] });
  m.pontosDoMapa.mockResolvedValue([]);
  m.exportarEditais.mockResolvedValue({ editais: [], total: 0 });
  m.semRecursoPro.mockResolvedValue(false);
});

describe('/api/busca', () => {
  it('permitida: lista + buscas usadas hoje, sem cache compartilhado', async () => {
    const r = await busca.GET(pedido('/api/busca?q=luva&uf=SC'));
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
    expect(await r.json()).toEqual({ total: 1, editais: [], buscasUsadas: 2 });
    expect(m.decidirBusca).toHaveBeenCalledWith(
      expect.objectContaining({ interno: false }),
      expect.objectContaining({ q: 'luva', uf: 'SC' }),
      { avisar: true },
    );
  });
  it('4ª busca nova: 402 com o sinal de limite, sem consultar os editais', async () => {
    m.decidirBusca.mockResolvedValue(BLOQUEADA);
    const r = await busca.GET(pedido('/api/busca?q=botina'));
    expect(r.status).toBe(402);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
    expect(lerLimite(r.status, await r.json())).toEqual({ tipo: 'busca', usados: 3, maximo: 3 });
    expect(m.buscarEditais).not.toHaveBeenCalled();
  });
});

describe('/api/mapa', () => {
  it('permitido: pontos, sem cache compartilhado e sem avisar', async () => {
    const r = await mapa.GET(pedido('/api/mapa?q=luva&ibge=4209102'));
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
    expect(await r.json()).toEqual([]);
    expect(m.decidirBusca).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ q: 'luva', ibge: '4209102' }), { avisar: false });
  });
  it('busca além do limite: 402 e o mapa não consulta', async () => {
    m.decidirBusca.mockResolvedValue(BLOQUEADA);
    const r = await mapa.GET(pedido('/api/mapa?q=botina'));
    expect(r.status).toBe(402);
    expect(m.pontosDoMapa).not.toHaveBeenCalled();
  });
});

describe('/api/exportar', () => {
  it('busca além do limite: 402 com a mensagem do cartão, sem exportar', async () => {
    m.decidirBusca.mockResolvedValue(BLOQUEADA);
    const r = await exportar.GET(pedido('/api/exportar?q=botina'));
    expect(r.status).toBe(402);
    expect(((await r.json()) as { erro: string }).erro).toBe('Você usou as 3 buscas grátis de hoje. Volta amanhã às 0h, ou conheça os planos.');
    expect(m.exportarEditais).not.toHaveBeenCalled();
  });
  it('busca já contada: planilha normal', async () => {
    const r = await exportar.GET(pedido('/api/exportar?q=luva'));
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(m.decidirBusca).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ q: 'luva' }), { avisar: false });
  });
});

describe('/api/uso', () => {
  it('uso de hoje, sem cache', async () => {
    m.usoDoDia.mockResolvedValue({ interno: false, buscas: 1, editais: 2 });
    const r = await uso.GET();
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
    expect(await r.json()).toEqual({ interno: false, buscas: 1, editais: 2 });
  });
  it('sem como ler: 502 (o selo não aparece)', async () => {
    m.usoDoDia.mockResolvedValue(null);
    expect((await uso.GET()).status).toBe(502);
  });
});

describe('/api/contagem', () => {
  it('só o total, com cache público, sem contar como busca', async () => {
    m.buscarEditais.mockResolvedValue({ total: 42, editais: [{ id: 'x' }] });
    const r = await contagem.GET(pedido('/api/contagem?q=luva&pagina=3'));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ total: 42 });
    expect(r.headers.get('cache-control')).toContain('s-maxage=300');
    expect(m.buscarEditais).toHaveBeenCalledWith(expect.objectContaining({ q: 'luva', pagina: 1, ordem: 'prazo' }));
    expect(m.decidirBusca).not.toHaveBeenCalled();
  });
});

describe('recursos Pro (pagamento ligado, fora do Pro)', () => {
  it('busca com raio: 402 recurso_pro antes de contar a busca', async () => {
    m.semRecursoPro.mockResolvedValue(true);
    const r = await busca.GET(pedido('/api/busca?q=luva&ibge=4209102&raio=50'));
    expect(r.status).toBe(402);
    expect(lerRecursoPro(r.status, await r.json())).toBe(true);
    expect(m.decidirBusca).not.toHaveBeenCalled();
  });
  it('busca sem raio nem órgão nem pergunta o plano', async () => {
    m.semRecursoPro.mockResolvedValue(true);
    expect((await busca.GET(pedido('/api/busca?q=luva'))).status).toBe(200);
    expect(m.semRecursoPro).not.toHaveBeenCalled();
  });
  it('mapa com órgão: 402 recurso_pro', async () => {
    m.semRecursoPro.mockResolvedValue(true);
    const r = await mapa.GET(pedido('/api/mapa?q=luva&orgao=00394452000103'));
    expect(lerRecursoPro(r.status, await r.json())).toBe(true);
  });
  it('exportar fora do Pro: 402 recurso_pro, sem exportar', async () => {
    m.semRecursoPro.mockResolvedValue(true);
    const r = await exportar.GET(pedido('/api/exportar?q=luva'));
    expect(lerRecursoPro(r.status, await r.json())).toBe(true);
    expect(m.exportarEditais).not.toHaveBeenCalled();
  });
});
