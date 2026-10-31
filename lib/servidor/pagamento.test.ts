import { beforeEach, describe, expect, it, vi } from 'vitest';
import { criarSupabaseFalso } from './supabaseFalso';

vi.mock('server-only', () => ({}));
const falso = vi.hoisted(() => ({ atual: null as ReturnType<typeof import('./supabaseFalso').criarSupabaseFalso> | null }));
vi.mock('./supabase', () => ({ supabaseServidor: () => falso.atual!.cliente }));
const ga = vi.hoisted(() => ({ enviar: vi.fn(async (_c: unknown) => true) }));
vi.mock('./ga4', () => ({ enviarGa4: ga.enviar }));
const boasVindas = vi.hoisted(() => ({ enviar: vi.fn(async (..._a: unknown[]) => true) }));
vi.mock('./emailBoasVindas', () => ({ enviarBoasVindas: boasVindas.enviar }));

const { aplicarPedido, criarCheckout, estadoDoCheckout } = await import('./pagamento');

const VISITANTE = '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b';
const OUTRO = '11111111-2222-4333-8444-555555555555';
const CTX = { visitante: VISITANTE, interno: false, dono: false, ipHash: null };
const FUTURO = '2099-01-01T00:00:00.000Z';
const assinatura = (extra: Record<string, unknown> = {}) => ({
  id: 'a1', plano: 'pro', periodo: 'mensal', status: 'ativa', valido_ate: FUTURO, email: 'maria@exemplo.com', ...extra,
});

let f: ReturnType<typeof criarSupabaseFalso>;
beforeEach(() => {
  f = criarSupabaseFalso();
  falso.atual = f;
  boasVindas.enviar.mockClear();
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
  it('pago, no navegador do checkout: mostra o e-mail da compra', async () => {
    f.responder('checkouts', { data: { visitante: VISITANTE, plano: 'pro', periodo: 'mensal' }, error: null });
    f.responder('assinatura_navegadores', { data: [{ assinaturas: assinatura() }], error: null });
    expect(await estadoDoCheckout(CODIGO, VISITANTE)).toEqual({
      estado: 'pago', plano: 'pro', periodo: 'mensal', validoAte: FUTURO, status: 'ativa', email: 'maria@exemplo.com',
    });
  });
  it('pago, em outro navegador: sem o e-mail', async () => {
    f.responder('checkouts', { data: { visitante: VISITANTE, plano: 'pro', periodo: 'mensal' }, error: null });
    f.responder('assinatura_navegadores', { data: [{ assinaturas: assinatura() }], error: null });
    expect(await estadoDoCheckout(CODIGO, OUTRO)).toMatchObject({ estado: 'pago', email: null });
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

describe('aplicarPedido (webhook)', () => {
  const CFG = { segredoWebhook: 's', clienteId: 'id', clienteSegredo: 'sec', ofertas: { mensal: 'irpv92e', anual: 'iuy9gzb' } };
  const AGORA = new Date('2026-10-18T12:00:00Z');
  const pedido = (extra: Record<string, unknown> = {}) => ({
    evento: 'purchase_approved', pedido: 'ped-1', status: 'paid', ofertaId: 'irpv92e', assinaturaCakto: 'sub_1',
    email: 'fulano@exemplo.com', valorCentavos: 8990, pagoEm: '2026-10-18T12:00:00.000Z', callback: 'c'.repeat(32), ...extra,
  });
  const inserts = (alvo: string) => f.operacoes.filter((o) => o.alvo === alvo && o.acao === 'insert');
  const updates = (alvo: string) => f.operacoes.filter((o) => o.alvo === alvo && o.acao === 'update');
  const EFEITO = 'rpc:aplicar_efeito_cakto';
  const feito = (assinatura: string | null, efeito: string) => ({ data: { assinatura, efeito }, error: null });
  const efeitos = () => f.operacoes.filter((o) => o.alvo === EFEITO).map((o) => o.valores as Record<string, unknown>);
  const marcasDeAplicado = () => updates('cakto_eventos').filter((o) => 'aplicado_em' in (o.valores as object));
  const semAssinatura = { data: null, error: null };
  const recebidoSemAplicar = () => {
    f.responder('cakto_eventos', { data: null, error: { message: 'duplicate key', code: '23505' } }, { data: { aplicado_em: null }, error: null });
  };

  it('compra aprovada: cria a assinatura com chave, liga o navegador do checkout e grava assinou', async () => {
    f.responder('assinaturas', semAssinatura);
    f.responder(EFEITO, feito('a1', 'criar'));
    f.responder('checkouts', { data: { visitante: VISITANTE }, error: null });
    f.responder('rpc:ligar_navegador', { data: 'ok', error: null });
    expect(await aplicarPedido(pedido(), CFG, AGORA)).toBe('aplicado');
    expect(inserts('cakto_eventos')[0].valores).toMatchObject({ pedido: 'ped-1', evento: 'purchase_approved' });
    const nova = efeitos()[0];
    expect(nova).toMatchObject({
      p_pedido: 'ped-1', p_evento: 'purchase_approved', p_efeito: 'criar', p_assinatura: null, p_cakto_assinatura: 'sub_1', p_plano: 'pro',
      p_periodo: 'mensal', p_email: 'fulano@exemplo.com', p_valido_ate: '2026-11-21T12:00:00.000Z',
    });
    expect(String(nova.p_chave)).toMatch(/^EM-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(f.operacoes.find((o) => o.alvo === 'rpc:ligar_navegador')?.valores).toEqual({ p_assinatura: 'a1', p_visitante: VISITANTE });
    expect(inserts('eventos')[0].valores).toMatchObject({ visitante: VISITANTE, tipo: 'assinou', detalhe: { plano: 'pro', periodo: 'mensal', valor: 8990 } });
  });

  it('compra aprovada: manda o e-mail de boas-vindas (ativar a conta) para o e-mail da compra', async () => {
    f.responder('assinaturas', semAssinatura);
    f.responder(EFEITO, feito('a1', 'criar'));
    f.responder('checkouts', { data: { visitante: VISITANTE }, error: null });
    await aplicarPedido(pedido({ ofertaId: 'iuy9gzb' }), CFG, AGORA);
    expect(boasVindas.enviar).toHaveBeenCalledTimes(1);
    expect(boasVindas.enviar).toHaveBeenCalledWith('fulano@exemplo.com', 'anual', 'ped-1');
  });

  it('boas-vindas só na assinatura nova: renovação, cancelamento, reembolso e compra sem e-mail não mandam', async () => {
    const existente = { data: { id: 'a1', plano: 'pro', periodo: 'mensal', status: 'ativa', valido_ate: '2026-10-20T00:00:00.000Z' }, error: null };
    for (const [evento, efeito] of [['subscription_renewed', 'estender'], ['subscription_canceled', 'cancelar'], ['refund', 'estornar']]) {
      f.responder('assinaturas', existente);
      f.responder(EFEITO, feito('a1', efeito));
      await aplicarPedido(pedido({ evento, pedido: `ped-${evento}`, callback: null }), CFG, AGORA);
    }
    f.responder('assinaturas', semAssinatura);
    f.responder(EFEITO, feito('a2', 'criar'));
    await aplicarPedido(pedido({ pedido: 'ped-sem', email: null, assinaturaCakto: 'sub_9', callback: null }), CFG, AGORA);
    expect(boasVindas.enviar).not.toHaveBeenCalled();
  });

  it('falha no e-mail de boas-vindas não derruba o webhook', async () => {
    boasVindas.enviar.mockRejectedValueOnce(new Error('fora'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    f.responder('assinaturas', semAssinatura);
    f.responder(EFEITO, feito('a1', 'criar'));
    expect(await aplicarPedido(pedido(), CFG, AGORA)).toBe('aplicado');
  });

  it('com o aceite dos cookies, a compra vai ao GA4 pelo servidor (sem aceite, não)', async () => {
    ga.enviar.mockClear();
    f.responder('assinaturas', semAssinatura);
    f.responder(EFEITO, feito('a1', 'criar'));
    f.responder('checkouts', { data: { visitante: VISITANTE, ga_cliente: '123.456', ga_sessao: '99', consentimento: true }, error: null });
    await aplicarPedido(pedido(), CFG, AGORA);
    expect(ga.enviar).toHaveBeenCalledWith({
      client_id: '123.456',
      events: [
        expect.objectContaining({ name: 'purchase', params: expect.objectContaining({ transaction_id: 'c'.repeat(32), value: 37.9, session_id: '99' }) }),
        expect.objectContaining({ name: 'purchase_completed', params: expect.objectContaining({ plano: 'mensal', session_id: '99' }) }),
      ],
    });
    ga.enviar.mockClear();
    f.responder('assinaturas', semAssinatura);
    f.responder(EFEITO, feito('a2', 'criar'));
    f.responder('checkouts', { data: { visitante: VISITANTE, ga_cliente: '123.456', ga_sessao: null, consentimento: false }, error: null });
    await aplicarPedido(pedido({ pedido: 'ped-9' }), CFG, AGORA);
    expect(ga.enviar).not.toHaveBeenCalled();
  });

  it('evento já aplicado (mesmo pedido e evento): não faz nada', async () => {
    f.responder('cakto_eventos', { data: null, error: { message: 'duplicate key', code: '23505' } }, { data: { aplicado_em: '2026-10-18T11:00:00.000Z' }, error: null });
    expect(await aplicarPedido(pedido(), CFG, AGORA)).toBe('repetido');
    expect(efeitos()).toEqual([]);
    expect(boasVindas.enviar).not.toHaveBeenCalled();
  });

  it('terminou: marca o evento como aplicado, por último', async () => {
    f.responder('assinaturas', semAssinatura);
    f.responder(EFEITO, feito('a1', 'criar'));
    f.responder('checkouts', { data: { visitante: VISITANTE }, error: null });
    f.responder('rpc:ligar_navegador', { data: 'ok', error: null });
    await aplicarPedido(pedido(), CFG, AGORA);
    expect(marcasDeAplicado()).toHaveLength(1);
    expect(marcasDeAplicado()[0]).toMatchObject({
      valores: { aplicado_em: AGORA.toISOString() }, filtros: [['eq:pedido', 'ped-1'], ['eq:evento', 'purchase_approved']],
    });
    expect(f.operacoes.at(-1)).toBe(marcasDeAplicado()[0]);
  });

  it('reenvio de evento que falhou antes do efeito: aplica de verdade', async () => {
    recebidoSemAplicar();
    f.responder('assinaturas', semAssinatura);
    f.responder(EFEITO, feito('a1', 'criar'));
    f.responder('checkouts', { data: { visitante: VISITANTE }, error: null });
    f.responder('rpc:ligar_navegador', { data: 'ok', error: null });
    expect(await aplicarPedido(pedido(), CFG, AGORA)).toBe('aplicado');
    expect(efeitos()).toHaveLength(1);
    expect(boasVindas.enviar).toHaveBeenCalledWith('fulano@exemplo.com', 'mensal', 'ped-1');
    expect(inserts('eventos')).toHaveLength(1);
    expect(marcasDeAplicado()).toHaveLength(1);
  });

  it('falha depois de criar a assinatura: 500 sem marcar aplicado; o reenvio termina e mede uma vez só', async () => {
    ga.enviar.mockClear();
    const checkout = { data: { visitante: VISITANTE, ga_cliente: '123.456', ga_sessao: '99', consentimento: true }, error: null };
    f.responder('assinaturas', semAssinatura);
    f.responder(EFEITO, feito('a1', 'criar'));
    f.responder('checkouts', checkout);
    f.responder('rpc:ligar_navegador', { data: null, error: { message: 'fora do ar' } });
    await expect(aplicarPedido(pedido(), CFG, AGORA)).rejects.toThrow('ligar navegador');
    expect(marcasDeAplicado()).toEqual([]);
    expect(boasVindas.enviar).not.toHaveBeenCalled();
    expect(inserts('eventos')).toEqual([]);
    expect(ga.enviar).not.toHaveBeenCalled();

    // Na volta a assinatura já existe: o cálculo daria "estender", mas vale o efeito gravado no evento.
    recebidoSemAplicar();
    f.responder('assinaturas', { data: { id: 'a1', plano: 'pro', periodo: 'mensal', status: 'ativa', valido_ate: '2026-11-21T12:00:00.000Z' }, error: null });
    f.responder(EFEITO, feito('a1', 'criar'));
    f.responder('checkouts', checkout);
    f.responder('rpc:ligar_navegador', { data: 'ok', error: null });
    expect(await aplicarPedido(pedido(), CFG, AGORA)).toBe('aplicado');
    expect(f.operacoes.filter((o) => o.alvo === 'rpc:ligar_navegador')).toHaveLength(2);
    expect(boasVindas.enviar).toHaveBeenCalledTimes(1);
    expect(boasVindas.enviar).toHaveBeenCalledWith('fulano@exemplo.com', 'mensal', 'ped-1');
    expect(marcasDeAplicado()).toHaveLength(1);
    expect(inserts('eventos')).toHaveLength(1);
    expect(ga.enviar).toHaveBeenCalledTimes(1);
  });

  it('reembolso que falhou ao gravar: o reenvio estorna', async () => {
    const existente = { data: { id: 'a1', plano: 'pro', periodo: 'mensal', status: 'ativa', valido_ate: '2026-11-21T12:00:00.000Z' }, error: null };
    f.responder('assinaturas', existente);
    f.responder(EFEITO, { data: null, error: { message: 'fora do ar' } });
    await expect(aplicarPedido(pedido({ evento: 'refund', callback: null }), CFG, AGORA)).rejects.toThrow('efeito da Cakto');
    expect(marcasDeAplicado()).toEqual([]);

    recebidoSemAplicar();
    f.responder('assinaturas', existente);
    f.responder(EFEITO, feito('a1', 'estornar'));
    expect(await aplicarPedido(pedido({ evento: 'refund', callback: null }), CFG, AGORA)).toBe('aplicado');
    expect(efeitos()[1]).toMatchObject({ p_efeito: 'estornar', p_assinatura: 'a1', p_valido_ate: AGORA.toISOString() });
  });

  it('chave da assinatura repetida: tenta de novo com outra chave', async () => {
    f.responder('assinaturas', semAssinatura);
    f.responder(EFEITO, { data: null, error: { message: 'duplicate key value violates unique constraint "assinaturas_chave_key"', code: '23505' } }, feito('a1', 'criar'));
    expect(await aplicarPedido(pedido({ callback: null }), CFG, AGORA)).toBe('aplicado');
    expect(efeitos()).toHaveLength(2);
    expect(efeitos()[0].p_chave).not.toBe(efeitos()[1].p_chave);
  });

  it('assinatura da Cakto repetida não vira nova tentativa: falha', async () => {
    f.responder('assinaturas', semAssinatura);
    f.responder(EFEITO, { data: null, error: { message: 'duplicate key value violates unique constraint "assinaturas_cakto_assinatura_key"', code: '23505' } });
    await expect(aplicarPedido(pedido(), CFG, AGORA)).rejects.toThrow('efeito da Cakto');
    expect(efeitos()).toHaveLength(1);
  });

  it('oferta desconhecida: registra e ignora, sem marcar aplicado (pode reenviar depois de configurar)', async () => {
    expect(await aplicarPedido(pedido({ ofertaId: 'outra' }), CFG, AGORA)).toBe('ignorado');
    expect(inserts('cakto_eventos')).toHaveLength(1);
    expect(f.operacoes.filter((o) => o.alvo === 'assinaturas')).toEqual([]);
    expect(efeitos()).toEqual([]);
    expect(marcasDeAplicado()).toEqual([]);
  });

  it('evento sem efeito (renovação recusada): marca aplicado e ignora', async () => {
    f.responder('assinaturas', { data: { id: 'a1', plano: 'pro', periodo: 'mensal', status: 'ativa', valido_ate: FUTURO }, error: null });
    f.responder(EFEITO, feito('a1', 'nada'));
    expect(await aplicarPedido(pedido({ evento: 'subscription_renewal_refused', callback: null }), CFG, AGORA)).toBe('ignorado');
    expect(efeitos()[0]).toMatchObject({ p_efeito: 'nada', p_assinatura: 'a1' });
    expect(marcasDeAplicado()).toHaveLength(1);
  });

  it('renovação: acha pela assinatura da Cakto e estende', async () => {
    f.responder('assinaturas', {
      data: { id: 'a1', plano: 'pro', periodo: 'mensal', status: 'ativa', valido_ate: '2026-10-20T00:00:00.000Z' }, error: null,
    });
    f.responder(EFEITO, feito('a1', 'estender'));
    expect(await aplicarPedido(pedido({ evento: 'subscription_renewed', pedido: 'ped-2', callback: null }), CFG, AGORA)).toBe('aplicado');
    expect(f.operacoes.find((o) => o.alvo === 'assinaturas' && o.acao === 'select')?.filtros).toContainEqual(['eq:cakto_assinatura', 'sub_1']);
    expect(efeitos()[0]).toMatchObject({ p_efeito: 'estender', p_assinatura: 'a1', p_valido_ate: '2026-11-23T00:00:00.000Z' });
  });

  it('sem assinatura da Cakto, procura pelo e-mail e plano', async () => {
    f.responder('assinaturas', {
      data: { id: 'a9', plano: 'pro', periodo: 'mensal', status: 'ativa', valido_ate: '2026-11-01T00:00:00.000Z' }, error: null,
    });
    f.responder(EFEITO, feito('a9', 'cancelar'));
    await aplicarPedido(pedido({ evento: 'subscription_canceled', assinaturaCakto: null, callback: null }), CFG, AGORA);
    const busca = f.operacoes.find((o) => o.alvo === 'assinaturas' && o.acao === 'select')!;
    expect(busca.filtros).toEqual([['eq:email', 'fulano@exemplo.com'], ['eq:plano', 'pro']]);
    expect(efeitos()[0]).toMatchObject({ p_efeito: 'cancelar', p_assinatura: 'a9' });
  });

  it('reembolso: estorna na hora', async () => {
    f.responder('assinaturas', {
      data: { id: 'a1', plano: 'pro', periodo: 'mensal', status: 'ativa', valido_ate: '2026-11-21T12:00:00.000Z' }, error: null,
    });
    f.responder(EFEITO, feito('a1', 'estornar'));
    await aplicarPedido(pedido({ evento: 'refund', callback: null }), CFG, AGORA);
    expect(efeitos()[0]).toMatchObject({ p_efeito: 'estornar', p_assinatura: 'a1', p_valido_ate: AGORA.toISOString() });
  });

  it('guarda só o pedido lido (sem cartão nem documento) no registro do evento', async () => {
    await aplicarPedido(pedido({ ofertaId: 'outra' }), CFG, AGORA);
    const corpo = JSON.stringify(inserts('cakto_eventos')[0].valores);
    expect(corpo).not.toMatch(/docNumber|card|lastDigits/);
  });
});
