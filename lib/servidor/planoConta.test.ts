import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from './registro';
import type { Usuario } from './sessao';

vi.mock('server-only', () => ({}));

type Resposta = { data: unknown; error: null | { message: string } };
const m = vi.hoisted(() => ({
  chamadas: [] as unknown[][],
  respostas: [] as Resposta[],
  navegador: vi.fn(async (..._a: unknown[]): Promise<string> => 'gratis'),
}));
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
vi.mock('./planoNavegador', () => ({ planoDoNavegador: m.navegador }));

const { mudarResumoSemanal, planoDaConta, resumoSemanalLigado } = await import('./conta');

const usuario = { id: 'u-sessao', email: 'dono@empresa.com.br' } as unknown as Usuario;
const CTX = { visitante: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b', interno: false, dono: false, ipHash: null } as Contexto;

beforeEach(() => {
  m.chamadas.length = 0;
  m.respostas.length = 0;
  m.navegador.mockReset();
  m.navegador.mockResolvedValue('gratis');
});

describe('planoDaConta', () => {
  it('manual ou assinatura com o e-mail (plano_da_conta), pelo id da sessão; sem navegador não pergunta a ele', async () => {
    m.respostas.push({ data: 'pro', error: null });
    expect(await planoDaConta(usuario)).toEqual({ plano: 'pro', daConta: 'pro', doNavegador: 'gratis' });
    expect(m.chamadas).toEqual([['rpc.plano_da_conta', { p_user: 'u-sessao' }]]);
    expect(m.navegador).not.toHaveBeenCalled();
  });
  it('com navegador, o maior vence; basic do navegador vale pro', async () => {
    m.respostas.push({ data: 'gratis', error: null });
    m.navegador.mockResolvedValue('basic');
    expect(await planoDaConta(usuario, CTX)).toEqual({ plano: 'pro', daConta: 'gratis', doNavegador: 'pro' });
    expect(m.navegador).toHaveBeenCalledWith(CTX);
  });
  it('banco fora: a conta vale grátis (o navegador ainda vale)', async () => {
    m.respostas.push({ data: null, error: { message: 'fora' } });
    m.navegador.mockResolvedValue('pro');
    expect(await planoDaConta(usuario, CTX)).toEqual({ plano: 'pro', daConta: 'gratis', doNavegador: 'pro' });
  });
  it('valor desconhecido do banco: grátis', async () => {
    m.respostas.push({ data: 'business', error: null });
    expect((await planoDaConta(usuario)).daConta).toBe('gratis');
  });
});

describe('resumo semanal na conta', () => {
  it('lê e grava perfis.resumo_semanal pelo id da sessão (sem perfil: ligado, o padrão)', async () => {
    m.respostas.push({ data: { resumo_semanal: false }, error: null });
    expect(await resumoSemanalLigado(usuario)).toBe(false);
    expect(m.chamadas).toContainEqual(['perfis.eq', 'id', 'u-sessao']);
    expect(await resumoSemanalLigado(usuario)).toBe(true);
    await mudarResumoSemanal(usuario, true);
    expect(m.chamadas).toContainEqual(['perfis.update', { resumo_semanal: true }]);
  });
});
