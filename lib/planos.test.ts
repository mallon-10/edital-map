import { describe, expect, it } from 'vitest';
import { LIMITE_GRATIS } from './limites';
import { formatarReais, LINHAS_PLANOS, PLANOS, precoDoPlano } from './planos';

const linha = (recurso: string) => {
  const l = LINHAS_PLANOS.find((x) => x.recurso === recurso);
  if (!l) throw new Error(`linha ausente: ${recurso}`);
  return l;
};

describe('tabela de planos', () => {
  it('preços mensais da spec de Planos', () => {
    expect(PLANOS.map((p) => [p.id, p.nome, precoDoPlano(p.centavosMes, 'mensal').principal])).toEqual([
      ['gratis', 'Grátis', 'R$ 0'],
      ['basic', 'Basic', 'R$ 49,90/mês'],
      ['pro', 'Pro', 'R$ 89,90/mês'],
    ]);
  });
  it('anual = 10 mensalidades, com o equivalente por mês arredondado', () => {
    expect(precoDoPlano(4990, 'anual')).toEqual({ principal: 'R$ 499,00/ano', equivalente: 'R$ 41,58/mês · 2 meses grátis' });
    expect(precoDoPlano(8990, 'anual')).toEqual({ principal: 'R$ 899,00/ano', equivalente: 'R$ 74,92/mês · 2 meses grátis' });
    expect(precoDoPlano(0, 'anual')).toEqual({ principal: 'R$ 0', equivalente: null });
  });
  it('formata reais em pt-BR', () => {
    expect(formatarReais(5)).toBe('R$ 0,05');
    expect(formatarReais(123456)).toBe('R$ 1.234,56');
  });
  it('no Pro nada tem teto numérico (tudo ilimitado ou incluído)', () => {
    for (const l of LINHAS_PLANOS) {
      const v = l.pro.valor;
      if (typeof v === 'string') expect(v).toMatch(/^Ilimitad/);
    }
    expect(linha('Alertas por e-mail às 7h (busca salva)').pro).toEqual({ valor: 'Ilimitados', emBreve: true });
  });
  it('limites do Grátis iguais aos que bloqueiam; Basic 15; Pro ilimitado', () => {
    expect(linha('Buscas por dia').gratis.valor).toBe(String(LIMITE_GRATIS.busca));
    expect(linha('Editais abertos por dia').gratis.valor).toBe(String(LIMITE_GRATIS.edital));
    expect(linha('Buscas por dia').basic.valor).toBe('15');
    expect(linha('Editais abertos por dia').pro.valor).toBe('Ilimitados');
  });
  it('o que ainda não existe está marcado "em breve"', () => {
    for (const r of ['Editais salvos', 'Alertas por e-mail às 7h (busca salva)', 'Vencimentos por e-mail (3 dias e 1 dia antes do prazo de um salvo)']) {
      expect(linha(r).basic.emBreve && linha(r).pro.emBreve).toBe(true);
    }
    expect(linha('Preço de referência, quem venceu e resumo com IA').pro.emBreve).toBe(true);
  });
});
