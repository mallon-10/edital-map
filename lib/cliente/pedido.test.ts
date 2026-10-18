import { describe, expect, it } from 'vitest';
import { FALHA_PEDIDO, respostaDaAcao } from './pedido';

describe('respostaDaAcao', () => {
  it('2xx: ok com o corpo', () => {
    expect(respostaDaAcao(201, { ok: true, id: 'a' })).toEqual({ ok: true, corpo: { ok: true, id: 'a' } });
    expect(respostaDaAcao(200, null)).toEqual({ ok: true, corpo: {} });
  });
  it('401 entrar; 402 plano ou limite; resto falha', () => {
    expect(respostaDaAcao(401, { erro: 'Entre.' })).toEqual({ ok: false, codigo: 'entrar', erro: 'Entre.' });
    expect(respostaDaAcao(402, { erro: 'Planos.', codigo: 'plano' })).toEqual({ ok: false, codigo: 'plano', erro: 'Planos.' });
    expect(respostaDaAcao(402, { erro: 'Cheio.', codigo: 'limite' })).toEqual({ ok: false, codigo: 'limite', erro: 'Cheio.' });
    expect(respostaDaAcao(404, { erro: 'Não achei.' })).toEqual({ ok: false, codigo: 'falha', erro: 'Não achei.' });
    expect(respostaDaAcao(502, null)).toEqual({ ok: false, codigo: 'falha', erro: FALHA_PEDIDO });
  });
  it('503 (plano não confirmado) e 429 passam a mensagem da rota como falha', () => {
    expect(respostaDaAcao(503, { erro: 'Não deu para confirmar seu plano agora. Tente de novo.' })).toEqual({
      ok: false,
      codigo: 'falha',
      erro: 'Não deu para confirmar seu plano agora. Tente de novo.',
    });
    expect(respostaDaAcao(429, 'texto')).toEqual({ ok: false, codigo: 'falha', erro: FALHA_PEDIDO });
  });
});
