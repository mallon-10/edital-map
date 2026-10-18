import { beforeEach, describe, expect, it, vi } from 'vitest';
import { criarSupabaseFalso } from './supabaseFalso';

vi.mock('server-only', () => ({}));
const falso = vi.hoisted(() => ({ atual: null as ReturnType<typeof import('./supabaseFalso').criarSupabaseFalso> | null }));
vi.mock('./supabase', () => ({ supabaseServidor: () => falso.atual!.cliente }));

const { ativarChave, criarCheckout, estadoDoCheckout } = await import('./pagamento');

const VISITANTE = '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b';
const OUTRO = '11111111-2222-4333-8444-555555555555';
const CTX = { visitante: VISITANTE, interno: false, dono: false, ipHash: null };
const FUTURO = '2099-01-01T00:00:00.000Z';
const assinatura = (extra: Record<string, unknown> = {}) => ({
  id: 'a1', plano: 'pro', periodo: 'mensal', status: 'ativa', valido_ate: FUTURO, chave: 'EM-AAAA-BBBB-CCCC', ...extra,
});

let f: ReturnType<typeof criarSupabaseFalso>;
beforeEach(() => {
  f = criarSupabaseFalso();
  falso.atual = f;
});

describe('criarCheckout', () => {
  it('grava código hex de 32 com visitante, plano e período', async () => {
    const codigo = await criarCheckout(CTX, 'pro', 'anual');
    expect(codigo).toMatch(/^[0-9a-f]{32}$/);
    expect(f.operacoes[0]).toMatchObject({ alvo: 'checkouts', acao: 'insert', valores: { codigo, visitante: VISITANTE, plano: 'pro', periodo: 'anual' } });
  });
  it('sem visitante não cria', async () => {
    expect(await criarCheckout(null, 'pro', 'anual')).toBeNull();
    expect(f.operacoes).toEqual([]);
  });
});

describe('estadoDoCheckout', () => {
  const CODIGO = 'a'.repeat(32);
  it('código desconhecido', async () => {
    f.responder('checkouts', { data: null, error: null });
    expect(await estadoDoCheckout(CODIGO, VISITANTE)).toEqual({ estado: 'desconhecido' });
  });
  it('pago, no navegador do checkout: mostra a chave', async () => {
    f.responder('checkouts', { data: { visitante: VISITANTE, plano: 'pro', periodo: 'mensal' }, error: null });
    f.responder('assinatura_navegadores', { data: [{ assinaturas: assinatura() }], error: null });
    expect(await estadoDoCheckout(CODIGO, VISITANTE)).toEqual({
      estado: 'pago', plano: 'pro', periodo: 'mensal', validoAte: FUTURO, status: 'ativa', chave: 'EM-AAAA-BBBB-CCCC',
    });
  });
  it('pago, em outro navegador: sem a chave', async () => {
    f.responder('checkouts', { data: { visitante: VISITANTE, plano: 'pro', periodo: 'mensal' }, error: null });
    f.responder('assinatura_navegadores', { data: [{ assinaturas: assinatura() }], error: null });
    expect(await estadoDoCheckout(CODIGO, OUTRO)).toMatchObject({ estado: 'pago', chave: null });
  });
  it('esperando: nenhuma assinatura válida do plano comprado ainda', async () => {
    f.responder('checkouts', { data: { visitante: VISITANTE, plano: 'pro', periodo: 'mensal' }, error: null });
    f.responder('assinatura_navegadores', { data: [{ assinaturas: assinatura({ plano: 'basic' }) }], error: null });
    expect(await estadoDoCheckout(CODIGO, VISITANTE)).toEqual({ estado: 'esperando' });
  });
  it('código mal formado nem consulta', async () => {
    expect(await estadoDoCheckout('xyz', VISITANTE)).toEqual({ estado: 'desconhecido' });
    expect(f.operacoes).toEqual([]);
  });
});

describe('ativarChave', () => {
  it('chave que não existe', async () => {
    f.responder('assinaturas', { data: null, error: null });
    expect(await ativarChave('EM-AAAA-BBBB-CCCC', VISITANTE)).toBe('invalida');
  });
  it('liga o navegador; cheia quando já está em 3', async () => {
    f.responder('assinaturas', { data: { id: 'a1' }, error: null }, { data: { id: 'a1' }, error: null });
    f.responder('rpc:ligar_navegador', { data: 'ok', error: null }, { data: 'cheia', error: null });
    expect(await ativarChave('EM-AAAA-BBBB-CCCC', VISITANTE)).toBe('ok');
    expect(await ativarChave('EM-AAAA-BBBB-CCCC', OUTRO)).toBe('cheia');
    expect(f.operacoes.find((o) => o.alvo === 'rpc:ligar_navegador')?.valores).toEqual({ p_assinatura: 'a1', p_visitante: VISITANTE });
  });
});
