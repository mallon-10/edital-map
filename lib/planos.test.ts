import { describe, expect, it } from 'vitest';
import { formatarReais, mostrarOferta, OFERTA, PLANOS, precoDoPlano } from './planos';

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
});

describe('faixa da oferta', () => {
  it('texto e destino', () => {
    expect(OFERTA).toEqual({
      texto: 'Receba no seu e-mail, toda semana, as licitações que combinam com o seu negócio',
      cta: 'Conhecer o Pro',
      href: '/planos',
    });
  });
  it('aparece para o grátis; some para o Pro, o Basic antigo, o dono e com o plano desconhecido', () => {
    expect(mostrarOferta({ plano: 'gratis', dono: false }, '/')).toBe(true);
    expect(mostrarOferta({ plano: 'gratis', dono: false }, '/edital/x')).toBe(true);
    expect(mostrarOferta({ plano: 'pro', dono: false }, '/')).toBe(false);
    expect(mostrarOferta({ plano: 'basic', dono: false }, '/')).toBe(false);
    expect(mostrarOferta({ plano: 'pro', dono: true }, '/')).toBe(false);
    expect(mostrarOferta({ plano: 'gratis', dono: true }, '/')).toBe(false);
    expect(mostrarOferta(null, '/')).toBe(false);
  });
  it('some no radar, na conta, no checkout e nos planos (o destino do botão)', () => {
    const g = { plano: 'gratis', dono: false } as const;
    for (const c of ['/radar', '/radar/comecar', '/entrar', '/assinar', '/assinatura', '/obrigado/abc', '/alertas', '/oportunidades', '/planos']) {
      expect(mostrarOferta(g, c)).toBe(false);
    }
    expect(mostrarOferta(g, '/radares-antigos')).toBe(true);
  });
});
