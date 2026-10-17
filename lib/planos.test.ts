import { describe, expect, it } from 'vitest';
import { LIMITE_GRATIS } from './limites';
import { LINHAS_PLANOS, PLANOS } from './planos';

const linha = (recurso: string) => {
  const l = LINHAS_PLANOS.find((x) => x.recurso === recurso);
  if (!l) throw new Error(`linha ausente: ${recurso}`);
  return l;
};

describe('tabela de planos', () => {
  it('preços da spec de Planos', () => {
    expect(PLANOS.map((p) => [p.id, p.nome, p.preco])).toEqual([
      ['gratis', 'Grátis', 'R$ 0'],
      ['basic', 'Basic', 'R$ 49,90/mês'],
      ['pro', 'Pro', 'R$ 89,90/mês'],
    ]);
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
