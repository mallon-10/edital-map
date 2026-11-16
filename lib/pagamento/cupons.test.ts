import { describe, expect, it } from 'vitest';
import { textosCheckout } from '../checkout';
import { centavosComCupom, conferirCupom, CUPONS, normalizarCupom } from './cupons';

const ALUNO50 = CUPONS.find((c) => c.codigo === 'ALUNO50')!;

describe('cupons do checkout', () => {
  it('aceita ALUNO50 no mensal, com maiúsculas, minúsculas e espaços', () => {
    expect(normalizarCupom('  aluno 50 ')).toBe('ALUNO50');
    expect(conferirCupom('aluno50', 'mensal')).toEqual({ ok: true, cupom: ALUNO50 });
  });

  it('recusa cupom vazio, desconhecido ou fora do período', () => {
    expect(conferirCupom('', 'mensal')).toEqual({ ok: false, erro: 'Digite o código do cupom.' });
    expect(conferirCupom('NATAL10', 'mensal')).toEqual({ ok: false, erro: 'Cupom não encontrado. Confira o código.' });
    expect(conferirCupom('ALUNO50', 'anual')).toEqual({ ok: false, erro: 'Este cupom vale só no plano mensal.' });
    expect(conferirCupom(123, 'mensal').ok).toBe(false);
  });

  it('50% de R$ 37,90 é R$ 18,95 na 1ª cobrança', () => {
    expect(centavosComCupom(3790, ALUNO50)).toBe(1895);
  });

  it('textos com cupom: 1º mês com desconto e renovação pelo preço cheio', () => {
    expect(textosCheckout('mensal', 'pix', ALUNO50)).toMatchObject({
      valor: 'R$ 18,95',
      sufixo: ' no 1º mês',
      depois: 'Depois, R$ 37,90 por mês, até você cancelar.',
      botao: 'Assinar com Pix · R$ 18,95',
    });
    expect(textosCheckout('mensal', 'cartao', ALUNO50).letraMiuda).toBe('Cobrado agora R$ 18,95; a cada mês depois, R$ 37,90. Você cancela quando quiser.');
  });

  it('cupom do mensal não mexe no anual', () => {
    expect(textosCheckout('anual', 'pix', ALUNO50)).toEqual(textosCheckout('anual', 'pix'));
  });
});
