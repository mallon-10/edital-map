import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Alerta } from '../alertas/regras';
import type { Usuario } from './sessao';

vi.mock('server-only', () => ({}));

type Resposta = { data?: unknown; count?: number | null; error: null | { message: string } };
const m = vi.hoisted(() => ({ chamadas: [] as unknown[][], respostas: [] as Resposta[] }));
const proxima = () => Promise.resolve(m.respostas.shift() ?? { data: null, error: null });
function consulta(tabela: string) {
  const c: Record<string, unknown> = {};
  for (const metodo of ['select', 'eq', 'order', 'limit', 'insert', 'update', 'delete']) {
    c[metodo] = (...a: unknown[]) => {
      m.chamadas.push([`${tabela}.${metodo}`, ...a]);
      return c;
    };
  }
  c.maybeSingle = proxima;
  c.single = proxima;
  c.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => proxima().then(ok, ko);
  return c;
}
vi.mock('./supabase', () => ({ supabaseServidor: () => ({ from: (t: string) => consulta(t) }) }));

const { alertasDaConta, atualizarAlerta, contarAlertas, criarAlerta, excluirAlerta, lerAlerta, mudarAtivoAlerta } = await import('./alertas');
const usuario = { id: 'u-sessao', email: 'dono@empresa.com.br' } as unknown as Usuario;
const ID = '11111111-1111-4111-8111-111111111111';
const ALERTA: Alerta = { nome: 'EPI', termos: ['luva'], termosExcluir: [], ufs: ['SC'], municipios: [], valorMin: null, valorMax: null, modalidades: [], soMeEpp: false };
const LINHA = { id: ID, nome: 'EPI', termos: ['luva'], termos_excluir: [], ufs: ['SC'], municipios: [], valor_min: null, valor_max: null, modalidades: [], so_me_epp: false, ativo: true, criado_em: 'c', ultimo_envio_em: null };

beforeEach(() => {
  m.chamadas.length = 0;
  m.respostas.length = 0;
});

describe('alertas.ts: tudo pelo usuário da sessão', () => {
  it('lista os alertas da conta com o último envio de cada um', async () => {
    m.respostas.push({ data: [LINHA], error: null }, {
      data: [
        { alerta_id: ID, status: 'sem_novidades', iniciado_em: '2026-10-19T10:00:00Z', qtd_editais: 0 },
        { alerta_id: ID, status: 'enviado', iniciado_em: '2026-10-18T10:00:00Z', qtd_editais: 4 },
      ],
      error: null,
    });
    const r = await alertasDaConta(usuario);
    expect(r[0]).toMatchObject({ id: ID, nome: 'EPI', ultimoEnvio: { status: 'sem_novidades', em: '2026-10-19T10:00:00Z', qtd: 0 } });
    expect(m.chamadas).toContainEqual(['alertas.eq', 'user_id', 'u-sessao']);
    expect(m.chamadas).toContainEqual(['envios_alerta.eq', 'user_id', 'u-sessao']);
  });
  it('sem alertas: nem consulta os envios', async () => {
    m.respostas.push({ data: [], error: null });
    expect(await alertasDaConta(usuario)).toEqual([]);
    expect(m.chamadas.some((c) => String(c[0]).startsWith('envios_alerta'))).toBe(false);
  });
  it('ler, contar, criar com o user_id da sessão', async () => {
    m.respostas.push({ data: LINHA, error: null });
    expect(await lerAlerta(usuario, ID)).toMatchObject({ id: ID });
    m.respostas.push({ count: 3, error: null });
    expect(await contarAlertas(usuario)).toBe(3);
    m.respostas.push({ data: { id: ID }, error: null });
    expect(await criarAlerta(usuario, { ...ALERTA, user_id: 'outra' } as unknown as Alerta)).toBe(ID);
    const insert = m.chamadas.find((c) => c[0] === 'alertas.insert')!;
    expect(insert[1]).toMatchObject({ nome: 'EPI', termos: ['luva'], user_id: 'u-sessao' });
  });
  it('editar, pausar e excluir só o alerta da conta; nada mudado = false', async () => {
    m.respostas.push({ data: [{ id: ID }], error: null });
    expect(await atualizarAlerta(usuario, ID, ALERTA, new Date('2026-10-18T12:00:00Z'))).toBe(true);
    expect(m.chamadas).toContainEqual(['alertas.update', expect.objectContaining({ nome: 'EPI', atualizado_em: '2026-10-18T12:00:00.000Z' })]);
    m.respostas.push({ data: [], error: null });
    expect(await mudarAtivoAlerta(usuario, ID, false)).toBe(false);
    m.respostas.push({ data: [{ id: ID }], error: null });
    expect(await excluirAlerta(usuario, ID)).toBe(true);
    for (const t of ['alertas.update', 'alertas.delete']) expect(m.chamadas.some((c) => c[0] === t)).toBe(true);
    expect(m.chamadas.filter((c) => c[0] === 'alertas.eq' && c[1] === 'user_id').every((c) => c[2] === 'u-sessao')).toBe(true);
  });
  it('banco fora: erro (a rota responde 502)', async () => {
    m.respostas.push({ data: null, error: { message: 'fora' } });
    await expect(lerAlerta(usuario, ID)).rejects.toThrow('fora');
  });
});
