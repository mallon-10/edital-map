import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ buscarEditais: vi.fn(), planoAtual: vi.fn(), pagamentoLigado: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/servidor/registro', () => ({ contexto: async () => ({ visitante: 'v', interno: false, dono: false, ipHash: 'ip' }) }));
vi.mock('@/lib/servidor/plano', () => ({ pagamentoLigado: m.pagamentoLigado, planoAtual: m.planoAtual }));
vi.mock('@/lib/servidor/consultas', () => ({ buscarEditais: m.buscarEditais }));

const { GET } = await import('./route');
const pedir = async (c: string) => (await GET(new Request(`http://localhost/api/busca${c}`))).json();
const vinte = Array.from({ length: 20 }, (_, i) => ({ id: `e${i}`, objeto: `segredo ${i}` }));

beforeEach(() => {
  vi.clearAllMocks();
  m.buscarEditais.mockResolvedValue({ total: 286, editais: vinte });
  m.planoAtual.mockResolvedValue('gratis');
  m.pagamentoLigado.mockReturnValue(true);
});

describe('/api/busca', () => {
  it('grátis com termo: a resposta só leva os 5 liberados, nada dos outros', async () => {
    const r = await pedir('?q=uniforme');
    expect(r.editais).toHaveLength(5);
    expect(r.total).toBe(286);
    expect(r.bloqueados).toBe(281);
    expect(JSON.stringify(r)).not.toContain('segredo 5');
  });
  it('pedir a página 2 não abre o resto', async () => {
    const r = await pedir('?q=uniforme&pagina=2');
    expect(m.buscarEditais.mock.calls[0][0].pagina).toBe(1);
    expect(r.editais.map((e: { id: string }) => e.id)).toEqual(['e0', 'e1', 'e2', 'e3', 'e4']);
  });
  it('quem assina recebe a página inteira', async () => {
    m.planoAtual.mockResolvedValue('pro');
    const r = await pedir('?q=uniforme&pagina=2');
    expect(r.editais).toHaveLength(20);
    expect(r.bloqueados).toBeUndefined();
    expect(m.buscarEditais.mock.calls[0][0].pagina).toBe(2);
  });
  it('sem termo fica livre e nem consulta o plano', async () => {
    const r = await pedir('?uf=SC');
    expect(r.editais).toHaveLength(20);
    expect(m.planoAtual).not.toHaveBeenCalled();
  });
  it('com o pagamento desligado não limita', async () => {
    m.pagamentoLigado.mockReturnValue(false);
    expect((await pedir('?q=uniforme')).editais).toHaveLength(20);
  });
  it('a resposta nunca fica em cache: depende do plano de quem pediu', async () => {
    const r = await GET(new Request('http://localhost/api/busca?q=uniforme'));
    expect(r.headers.get('Cache-Control')).toContain('no-store');
  });
});
