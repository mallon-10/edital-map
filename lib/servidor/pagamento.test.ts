import { beforeEach, describe, expect, it, vi } from 'vitest';
import { criarSupabaseFalso } from './supabaseFalso';

vi.mock('server-only', () => ({}));
const falso = vi.hoisted(() => ({ atual: null as ReturnType<typeof import('./supabaseFalso').criarSupabaseFalso> | null }));
vi.mock('./supabase', () => ({ supabaseServidor: () => falso.atual!.cliente }));

const { aplicarPedido, ativarChave, criarCheckout, estadoDoCheckout } = await import('./pagamento');

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

describe('aplicarPedido (webhook)', () => {
  const CFG = { segredoWebhook: 's', clienteId: 'id', clienteSegredo: 'sec', ofertas: { mensal: 'irpv92e', anual: 'iuy9gzb' } };
  const AGORA = new Date('2026-10-18T12:00:00Z');
  const pedido = (extra: Record<string, unknown> = {}) => ({
    evento: 'purchase_approved', pedido: 'ped-1', status: 'paid', ofertaId: 'irpv92e', assinaturaCakto: 'sub_1',
    email: 'fulano@exemplo.com', valorCentavos: 8990, pagoEm: '2026-10-18T12:00:00.000Z', callback: 'c'.repeat(32), ...extra,
  });
  const inserts = (alvo: string) => f.operacoes.filter((o) => o.alvo === alvo && o.acao === 'insert');
  const updates = (alvo: string) => f.operacoes.filter((o) => o.alvo === alvo && o.acao === 'update');

  it('compra aprovada: cria a assinatura com chave, liga o navegador do checkout e grava assinou', async () => {
    f.responder('assinaturas', { data: null, error: null }, { data: { id: 'a1' }, error: null });
    f.responder('checkouts', { data: { visitante: VISITANTE }, error: null });
    f.responder('rpc:ligar_navegador', { data: 'ok', error: null });
    expect(await aplicarPedido(pedido(), CFG, AGORA)).toBe('aplicado');
    expect(inserts('cakto_eventos')[0].valores).toMatchObject({ pedido: 'ped-1', evento: 'purchase_approved' });
    const nova = inserts('assinaturas')[0].valores as Record<string, unknown>;
    expect(nova).toMatchObject({
      cakto_assinatura: 'sub_1', cakto_pedido: 'ped-1', plano: 'pro', periodo: 'mensal', email: 'fulano@exemplo.com',
      status: 'ativa', valido_ate: '2026-11-21T12:00:00.000Z',
    });
    expect(String(nova.chave)).toMatch(/^EM-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(f.operacoes.find((o) => o.alvo === 'rpc:ligar_navegador')?.valores).toEqual({ p_assinatura: 'a1', p_visitante: VISITANTE });
    expect(inserts('eventos')[0].valores).toMatchObject({ visitante: VISITANTE, tipo: 'assinou', detalhe: { plano: 'pro', periodo: 'mensal', valor: 8990 } });
  });

  it('evento repetido (mesmo pedido e evento): não faz nada', async () => {
    f.responder('cakto_eventos', { data: null, error: { message: 'duplicate key', code: '23505' } });
    expect(await aplicarPedido(pedido(), CFG, AGORA)).toBe('repetido');
    expect(inserts('assinaturas')).toEqual([]);
  });

  it('oferta desconhecida: registra e ignora', async () => {
    expect(await aplicarPedido(pedido({ ofertaId: 'outra' }), CFG, AGORA)).toBe('ignorado');
    expect(inserts('cakto_eventos')).toHaveLength(1);
    expect(f.operacoes.filter((o) => o.alvo === 'assinaturas')).toEqual([]);
  });

  it('renovação: acha pela assinatura da Cakto e estende', async () => {
    f.responder('assinaturas', {
      data: { id: 'a1', plano: 'pro', periodo: 'mensal', status: 'ativa', valido_ate: '2026-10-20T00:00:00.000Z' }, error: null,
    });
    expect(await aplicarPedido(pedido({ evento: 'subscription_renewed', pedido: 'ped-2', callback: null }), CFG, AGORA)).toBe('aplicado');
    expect(f.operacoes.find((o) => o.alvo === 'assinaturas' && o.acao === 'select')?.filtros).toContainEqual(['eq:cakto_assinatura', 'sub_1']);
    expect(updates('assinaturas')[0]).toMatchObject({ valores: { valido_ate: '2026-11-23T00:00:00.000Z', status: 'ativa' }, filtros: [['eq:id', 'a1']] });
  });

  it('sem assinatura da Cakto, procura pelo e-mail e plano', async () => {
    f.responder('assinaturas', {
      data: { id: 'a9', plano: 'pro', periodo: 'mensal', status: 'ativa', valido_ate: '2026-11-01T00:00:00.000Z' }, error: null,
    });
    await aplicarPedido(pedido({ evento: 'subscription_canceled', assinaturaCakto: null, callback: null }), CFG, AGORA);
    const busca = f.operacoes.find((o) => o.alvo === 'assinaturas' && o.acao === 'select')!;
    expect(busca.filtros).toEqual([['eq:email', 'fulano@exemplo.com'], ['eq:plano', 'pro']]);
    expect(updates('assinaturas')[0]).toMatchObject({ valores: { status: 'cancelada' } });
  });

  it('reembolso: estorna na hora', async () => {
    f.responder('assinaturas', {
      data: { id: 'a1', plano: 'pro', periodo: 'mensal', status: 'ativa', valido_ate: '2026-11-21T12:00:00.000Z' }, error: null,
    });
    await aplicarPedido(pedido({ evento: 'refund', callback: null }), CFG, AGORA);
    expect(updates('assinaturas')[0]).toMatchObject({ valores: { status: 'estornada', valido_ate: AGORA.toISOString() } });
  });

  it('guarda só o pedido lido (sem cartão nem documento) no registro do evento', async () => {
    await aplicarPedido(pedido({ ofertaId: 'outra' }), CFG, AGORA);
    const corpo = JSON.stringify(inserts('cakto_eventos')[0].valores);
    expect(corpo).not.toMatch(/docNumber|card|lastDigits/);
  });
});
