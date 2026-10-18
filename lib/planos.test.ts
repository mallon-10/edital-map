import { describe, expect, it } from 'vitest';
import { LIMITE_GRATIS } from './limites';
import { LIMITES_CONTA } from './limitesConta';
import { formatarReais, LINHAS_PLANOS, PLANOS, precoDoPlano } from './planos';

const linha = (recurso: string) => {
  const l = LINHAS_PLANOS.find((x) => x.recurso === recurso);
  if (!l) throw new Error(`linha ausente: ${recurso}`);
  return l;
};
const pro = PLANOS.find((p) => p.id === 'pro')!;

describe('tabela de planos', () => {
  it('só Grátis e Pro; Pro a R$ 37,90/mês', () => {
    expect(PLANOS.map((p) => [p.id, p.nome, precoDoPlano(p, 'mensal').principal])).toEqual([
      ['gratis', 'Grátis', 'R$ 0'],
      ['pro', 'Pro', 'R$ 37,90/mês'],
    ]);
  });
  it('anual R$ 349,90, com o equivalente por mês e a economia', () => {
    expect(precoDoPlano(pro, 'anual')).toEqual({ principal: 'R$ 349,90/ano', equivalente: 'R$ 29,16/mês · economize 23%' });
    expect(precoDoPlano(PLANOS[0], 'anual')).toEqual({ principal: 'R$ 0', equivalente: null });
  });
  it('formata reais em pt-BR', () => {
    expect(formatarReais(5)).toBe('R$ 0,05');
    expect(formatarReais(123456)).toBe('R$ 1.234,56');
  });
  it('no Pro só os alertas têm teto numérico (o resto é ilimitado, uso justo ou incluído)', () => {
    for (const l of LINHAS_PLANOS) {
      const v = l.pro.valor;
      if (typeof v !== 'string' || l.recurso.startsWith('Alertas por e-mail')) continue;
      expect(v).toMatch(/^(Ilimitad|Uso justo$)/);
    }
  });
  it('limites do Grátis iguais aos que bloqueiam; Pro ilimitado; link oficial só no Pro', () => {
    expect(linha('Buscas por dia').gratis.valor).toBe(String(LIMITE_GRATIS.busca));
    expect(linha('Editais abertos por dia').gratis.valor).toBe(String(LIMITE_GRATIS.edital));
    expect(linha('Editais abertos por dia').pro.valor).toBe('Ilimitados');
    expect(linha('Botão "Abrir edital oficial"')).toMatchObject({ gratis: { valor: false }, pro: { valor: true } });
  });
  it('resumo semanal, alertas e salvos já existem no Pro (sem "em breve"); a IA continua em breve', () => {
    expect(linha('Resumo semanal por e-mail (segunda, 7h)')).toEqual({
      recurso: 'Resumo semanal por e-mail (segunda, 7h)', gratis: { valor: false }, pro: { valor: true },
    });
    expect(linha('Alertas por e-mail às 7h (busca salva)')).toEqual({
      recurso: 'Alertas por e-mail às 7h (busca salva)', gratis: { valor: false }, pro: { valor: `Até ${LIMITES_CONTA.pro.alertas}` },
    });
    expect(linha('Editais salvos')).toEqual({ recurso: 'Editais salvos', gratis: { valor: false }, pro: { valor: 'Uso justo' } });
    expect(linha('Preço de referência, quem venceu e resumo com IA').pro.emBreve).toBe(true);
  });
  it('nenhuma linha fala do Basic', () => {
    for (const l of LINHAS_PLANOS) expect(Object.keys(l).sort()).toEqual(['gratis', 'pro', 'recurso']);
  });
});
