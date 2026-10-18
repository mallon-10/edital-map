import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TetoDeAlertas, type Alerta } from '../alertas/regras';
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
  it('lista os alertas da conta com o último envio de cada um (uma consulta por alerta, pelo índice alerta_id)', async () => {
    const ID2 = '22222222-2222-4222-8222-222222222222';
    m.respostas.push(
      { data: [LINHA, { ...LINHA, id: ID2, nome: 'Uniformes' }], error: null },
      { data: { alerta_id: ID, status: 'sem_novidades', iniciado_em: '2026-10-19T10:00:00Z', qtd_editais: 0 }, error: null },
      { data: null, error: null },
    );
    const r = await alertasDaConta(usuario);
    expect(r[0]).toMatchObject({ id: ID, nome: 'EPI', ultimoEnvio: { status: 'sem_novidades', em: '2026-10-19T10:00:00Z', qtd: 0 } });
    expect(r[1]).toMatchObject({ id: ID2, ultimoEnvio: null });
    expect(m.chamadas).toContainEqual(['alertas.eq', 'user_id', 'u-sessao']);
    const envios = m.chamadas.filter((c) => String(c[0]).startsWith('envios_alerta'));
    const porDono = envios.filter((c) => c[0] === 'envios_alerta.eq' && c[1] === 'user_id');
    expect(porDono).toHaveLength(2);
    expect(porDono.every((c) => c[2] === 'u-sessao')).toBe(true);
    expect(envios).toContainEqual(['envios_alerta.eq', 'alerta_id', ID]);
    expect(envios).toContainEqual(['envios_alerta.eq', 'alerta_id', ID2]);
    expect(envios).toContainEqual(['envios_alerta.order', 'iniciado_em', { ascending: false }]);
    const limites = envios.filter((c) => c[0] === 'envios_alerta.limit');
    expect(limites).toHaveLength(2);
    expect(limites.every((c) => c[1] === 1)).toBe(true);
  });
  it('status desconhecido no histórico: sem último envio', async () => {
    m.respostas.push({ data: [LINHA], error: null }, { data: { alerta_id: ID, status: 'outro', iniciado_em: 'x', qtd_editais: 1 }, error: null });
    expect((await alertasDaConta(usuario))[0].ultimoEnvio).toBeNull();
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
  it('sem atribuição em massa: insert e update só levam as colunas do alerta (+ user_id da sessão / atualizado_em)', async () => {
    const sujo = { ...ALERTA, id: 'x', criado_em: 'c', ultimo_envio_em: 'u', ativo: false, user_id: 'outra' } as unknown as Alerta;
    const colunas = ['modalidades', 'municipios', 'nome', 'so_me_epp', 'termos', 'termos_excluir', 'ufs', 'valor_max', 'valor_min'];
    m.respostas.push({ data: { id: ID }, error: null });
    await criarAlerta(usuario, sujo);
    const insert = m.chamadas.find((c) => c[0] === 'alertas.insert')![1] as Record<string, unknown>;
    expect(Object.keys(insert).sort()).toEqual([...colunas, 'user_id'].sort());
    expect(insert.user_id).toBe('u-sessao');
    m.respostas.push({ data: [{ id: ID }], error: null });
    await atualizarAlerta(usuario, ID, sujo);
    const update = m.chamadas.find((c) => c[0] === 'alertas.update')![1] as Record<string, unknown>;
    expect(Object.keys(update).sort()).toEqual([...colunas, 'atualizado_em'].sort());
  });
  it('teto do banco (gatilho da 0018) vira TetoDeAlertas; outro erro, Error comum', async () => {
    m.respostas.push({ data: null, error: { message: 'alertas_teto' } });
    await expect(criarAlerta(usuario, ALERTA)).rejects.toBeInstanceOf(TetoDeAlertas);
    m.respostas.push({ data: null, error: { message: 'fora' } });
    const erro = await criarAlerta(usuario, ALERTA).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(Error);
    expect(erro).not.toBeInstanceOf(TetoDeAlertas);
  });
  it('banco fora: erro (a rota responde 502)', async () => {
    m.respostas.push({ data: null, error: { message: 'fora' } });
    await expect(lerAlerta(usuario, ID)).rejects.toThrow('fora');
  });
});
