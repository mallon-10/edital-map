import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Usuario } from './sessao';

vi.mock('server-only', () => ({}));

type Resposta = { data: unknown; error: null | { message: string } };
const m = vi.hoisted(() => ({ chamadas: [] as unknown[][], respostas: [] as Resposta[] }));
const proxima = () => Promise.resolve(m.respostas.shift() ?? { data: null, error: null });

function consulta(tabela: string) {
  const c: Record<string, unknown> = {};
  for (const metodo of ['select', 'eq', 'update', 'delete', 'limit']) {
    c[metodo] = (...a: unknown[]) => {
      m.chamadas.push([`${tabela}.${metodo}`, ...a]);
      return c;
    };
  }
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

const { estadoDosSalvos, gravarSalvo, mudarObservacao, removerSalvo, salvosDaConta } = await import('./salvos');
const usuario = { id: 'u-sessao', email: 'dono@empresa.com.br' } as unknown as Usuario;
const ID = '00394452000103-1-021982/2026';

beforeEach(() => {
  m.chamadas.length = 0;
  m.respostas.length = 0;
});

describe('salvos.ts: tudo pelo usuário da sessão', () => {
  it('gravarSalvo chama gravar_salvo com o id da sessão e o limite', async () => {
    m.respostas.push({ data: 'limite', error: null });
    expect(await gravarSalvo(usuario, ID, 'salvo', 10)).toBe('limite');
    expect(m.chamadas).toEqual([['rpc.gravar_salvo', { p_user: 'u-sessao', p_contratacao: ID, p_status: 'salvo', p_limite: 10 }]]);
  });
  it('gravarSalvo: erro ou resposta estranha lança', async () => {
    m.respostas.push({ data: null, error: { message: 'fora' } });
    await expect(gravarSalvo(usuario, ID, 'salvo', 10)).rejects.toThrow('gravar_salvo: fora');
    m.respostas.push({ data: 'talvez', error: null });
    await expect(gravarSalvo(usuario, ID, 'salvo', 10)).rejects.toThrow('resposta inesperada');
  });
  it('observação e remoção filtram por user_id e contratação; nada mudado = false', async () => {
    m.respostas.push({ data: [{ contratacao_id: ID }], error: null });
    expect(await mudarObservacao(usuario, ID, 'ok', new Date('2026-10-18T12:00:00Z'))).toBe(true);
    expect(m.chamadas).toContainEqual(['salvos.update', { observacao: 'ok', atualizado_em: '2026-10-18T12:00:00.000Z' }]);
    expect(m.chamadas).toContainEqual(['salvos.eq', 'user_id', 'u-sessao']);
    expect(m.chamadas).toContainEqual(['salvos.eq', 'contratacao_id', ID]);
    m.respostas.push({ data: [], error: null });
    expect(await removerSalvo(usuario, ID)).toBe(false);
    expect(m.chamadas).toContainEqual(['salvos.delete']);
  });
  it('estado: status e se tem observação, por id', async () => {
    m.respostas.push({ data: [{ contratacao_id: ID, status: 'analise', observacao: 'x' }, { contratacao_id: 'b', status: 'descartado', observacao: null }], error: null });
    expect(await estadoDosSalvos(usuario)).toEqual({ [ID]: { status: 'analise', nota: true }, b: { status: 'descartado', nota: false } });
    expect(m.chamadas).toContainEqual(['salvos.eq', 'user_id', 'u-sessao']);
  });
  it('salvosDaConta pelo id da sessão', async () => {
    m.respostas.push({ data: [{ contratacao_id: ID, status: 'salvo', observacao: null, criado_em: 'a', atualizado_em: 'b', slug: null, objeto: null }], error: null });
    const r = await salvosDaConta(usuario);
    expect(m.chamadas).toEqual([['rpc.salvos_da_conta', { p_user: 'u-sessao' }]]);
    expect(r[0]).toMatchObject({ id: ID, status: 'salvo', edital: null });
  });
});
