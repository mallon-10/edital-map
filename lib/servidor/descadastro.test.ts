import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
type Resposta = { data?: unknown; count?: number | null; error: null | { message: string } };
const m = vi.hoisted(() => ({ chamadas: [] as unknown[][], respostas: [] as Resposta[] }));
const proxima = () => Promise.resolve(m.respostas.shift() ?? { data: null, error: null });
function consulta(tabela: string) {
  const c: Record<string, unknown> = {};
  for (const metodo of ['select', 'eq', 'update']) {
    c[metodo] = (...a: unknown[]) => {
      m.chamadas.push([`${tabela}.${metodo}`, ...a]);
      return c;
    };
  }
  c.maybeSingle = proxima;
  c.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => proxima().then(ok, ko);
  return c;
}
vi.mock('./supabase', () => ({
  supabaseServidor: () => ({
    from: (t: string) => consulta(t),
    rpc: (nome: string, args: unknown) => {
      m.chamadas.push([`rpc.${nome}`, args]);
      return proxima();
    },
  }),
}));
const { aplicarDescadastro, textoDoDescadastro } = await import('./descadastro');
const ALERTA = '11111111-1111-4111-8111-111111111111';
const CONTA = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  m.chamadas.length = 0;
  m.respostas.length = 0;
});

describe('descadastro pelo link (sem sessão, só com o alvo do token)', () => {
  it('texto da confirmação', async () => {
    m.respostas.push({ data: { nome: 'EPI' }, error: null });
    expect(await textoDoDescadastro({ tipo: 'alerta', id: ALERTA })).toBe('o alerta "EPI"');
    m.respostas.push({ data: null, error: null });
    expect(await textoDoDescadastro({ tipo: 'alerta', id: ALERTA })).toBeNull();
    m.respostas.push({ count: 2, error: null });
    expect(await textoDoDescadastro({ tipo: 'todos', conta: CONTA })).toBe('todos os seus alertas');
    m.respostas.push({ count: 0, error: null });
    expect(await textoDoDescadastro({ tipo: 'todos', conta: CONTA })).toBeNull();
    expect(await textoDoDescadastro({ tipo: 'resumo', conta: CONTA })).toBe('o resumo semanal do Pro');
  });
  it('pausa um alerta, todos da conta, ou desliga o resumo', async () => {
    m.respostas.push({ data: [{ id: ALERTA }], error: null });
    expect(await aplicarDescadastro({ tipo: 'alerta', id: ALERTA }, new Date('2026-10-18T12:00:00Z'))).toBe(1);
    expect(m.chamadas).toContainEqual(['alertas.update', { ativo: false, atualizado_em: '2026-10-18T12:00:00.000Z' }]);
    expect(m.chamadas).toContainEqual(['alertas.eq', 'id', ALERTA]);
    m.respostas.push({ data: [{ id: 'a' }, { id: 'b' }], error: null });
    expect(await aplicarDescadastro({ tipo: 'todos', conta: CONTA })).toBe(2);
    expect(m.chamadas).toContainEqual(['alertas.eq', 'user_id', CONTA]);
    expect(m.chamadas).toContainEqual(['alertas.eq', 'ativo', true]);
    m.respostas.push({ data: true, error: null });
    expect(await aplicarDescadastro({ tipo: 'resumo', conta: CONTA })).toBe(1);
    expect(m.chamadas).toContainEqual(['rpc.parar_resumo_semanal', { p_user: CONTA }]);
    m.respostas.push({ data: null, error: null });
    expect(await aplicarDescadastro({ tipo: 'resumo', conta: CONTA })).toBe(0);
  });
  it('nunca apaga: só update (e a função do resumo)', async () => {
    await aplicarDescadastro({ tipo: 'todos', conta: CONTA });
    expect(m.chamadas.some((c) => String(c[0]).endsWith('.delete'))).toBe(false);
  });
  it('erro do banco sobe sem o id na mensagem', async () => {
    m.respostas.push({ data: null, error: { message: 'fora do ar' } });
    const erro = await aplicarDescadastro({ tipo: 'alerta', id: ALERTA }).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(Error);
    expect(String((erro as Error).message)).not.toContain(ALERTA);
  });
});
