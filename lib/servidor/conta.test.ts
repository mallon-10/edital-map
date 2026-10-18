import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Radar } from '../radar';
import type { Usuario } from './sessao';

vi.mock('server-only', () => ({}));

type Resposta = { data: unknown; error: null | { message: string } };
const m = vi.hoisted(() => ({ chamadas: [] as unknown[][], respostas: [] as Resposta[] }));

function consulta(tabela: string) {
  const proxima = () => Promise.resolve(m.respostas.shift() ?? { data: null, error: null });
  const c: Record<string, unknown> = {};
  for (const metodo of ['select', 'eq', 'upsert']) {
    c[metodo] = (...a: unknown[]) => {
      m.chamadas.push([`${tabela}.${metodo}`, ...a]);
      return c;
    };
  }
  c.maybeSingle = proxima;
  c.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => proxima().then(ok, ko);
  return c;
}
vi.mock('./supabase', () => ({ supabaseServidor: () => ({ from: (t: string) => consulta(t) }) }));

const { lerRadar, marcarVisitaRadar, perfilDaConta, salvarRadar } = await import('./conta');

const usuario = { id: 'u-sessao', email: 'dono@empresa.com.br' } as unknown as Usuario;
const RADAR: Radar = { termos: ['luva'], termosExcluir: [], ufs: ['SC'], municipios: [], valorMin: null, valorMax: null, modalidades: [], soMeEpp: false };
const LINHA = { termos: ['luva'], termos_excluir: [], ufs: ['SC'], municipios: [], valor_min: null, valor_max: null, modalidades: [], so_me_epp: false };

beforeEach(() => {
  m.chamadas.length = 0;
  m.respostas.length = 0;
});

describe('conta.ts: tudo pelo usuário da sessão', () => {
  it('lerRadar filtra pelo id da sessão e devolve o radar', async () => {
    m.respostas.push({ data: LINHA, error: null });
    expect(await lerRadar(usuario)).toEqual(RADAR);
    expect(m.chamadas).toContainEqual(['radares.eq', 'user_id', 'u-sessao']);
  });
  it('lerRadar sem radar: null', async () => {
    expect(await lerRadar(usuario)).toBeNull();
  });
  it('salvarRadar grava com o user_id da sessão (o radar não traz dono) e diz se criou', async () => {
    m.respostas.push({ data: null, error: null }, { data: null, error: null });
    const intruso = { ...RADAR, user_id: 'outra-conta' } as unknown as Radar;
    expect(await salvarRadar(usuario, intruso, new Date('2026-10-18T12:00:00Z'))).toBe('criado');
    const upsert = m.chamadas.find((c) => c[0] === 'radares.upsert')!;
    expect(upsert[1]).toEqual({ ...LINHA, user_id: 'u-sessao', atualizado_em: '2026-10-18T12:00:00.000Z' });
    expect(upsert[2]).toEqual({ onConflict: 'user_id' });
  });
  it('salvarRadar com radar existente: atualizado (e atualizado_em de novo)', async () => {
    m.respostas.push({ data: LINHA, error: null }, { data: null, error: null });
    expect(await salvarRadar(usuario, RADAR, new Date('2026-10-19T08:30:00Z'))).toBe('atualizado');
    const upsert = m.chamadas.find((c) => c[0] === 'radares.upsert')!;
    expect(upsert[1]).toMatchObject({ user_id: 'u-sessao', atualizado_em: '2026-10-19T08:30:00.000Z' });
  });
  it('salvarRadar com valor 0: grava nulo (o banco exige valor_max > 0)', async () => {
    m.respostas.push({ data: null, error: null }, { data: null, error: null });
    await salvarRadar(usuario, { ...RADAR, valorMin: 0, valorMax: 0 });
    const upsert = m.chamadas.find((c) => c[0] === 'radares.upsert')!;
    expect(upsert[1]).toMatchObject({ valor_min: null, valor_max: null });
  });
  it('salvarRadar com erro do banco: lança', async () => {
    m.respostas.push({ data: null, error: null }, { data: null, error: { message: 'violates check' } });
    await expect(salvarRadar(usuario, RADAR)).rejects.toThrow('salvar radar: violates check');
  });
  it('perfil: plano conhecido ou grátis; última visita', async () => {
    m.respostas.push({ data: { plano: 'pro', ultima_visita_radar: '2026-10-17T10:00:00+00:00' }, error: null });
    expect(await perfilDaConta(usuario)).toEqual({ plano: 'pro', ultimaVisitaRadar: '2026-10-17T10:00:00+00:00' });
    expect(m.chamadas).toContainEqual(['perfis.eq', 'id', 'u-sessao']);
    m.respostas.push({ data: { plano: 'business', ultima_visita_radar: null }, error: null });
    expect(await perfilDaConta(usuario)).toEqual({ plano: 'gratis', ultimaVisitaRadar: null });
    expect(await perfilDaConta(usuario)).toEqual({ plano: 'gratis', ultimaVisitaRadar: null });
  });
  it('marcarVisitaRadar grava no perfil da sessão', async () => {
    await marcarVisitaRadar(usuario, new Date('2026-10-18T12:00:00Z'));
    expect(m.chamadas).toContainEqual(['perfis.upsert', { id: 'u-sessao', ultima_visita_radar: '2026-10-18T12:00:00.000Z' }, { onConflict: 'id' }]);
  });
});
