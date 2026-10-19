import { describe, expect, it } from 'vitest';
import { LIMITES_CONTA } from './limitesConta';
import { formatarReais, LINHAS_PLANOS, mostrarOferta, OFERTA, PLANOS, precoDoPlano } from './planos';
import { VISIVEIS_GRATIS } from './radar';

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
  it('Grátis: buscas e editais ilimitados, link oficial, raio/órgão, exportar e parecidos incluídos', () => {
    expect(linha('Buscas e editais')).toMatchObject({ gratis: { valor: 'Ilimitados' }, pro: { valor: 'Ilimitados' } });
    for (const r of [
      'Botão "Abrir edital oficial"',
      'Filtros (UF, município, valor, modalidade, prazo)',
      'Filtros por raio em km e órgão comprador',
      'Exportar a lista para planilha (CSV)',
      'Editais parecidos abertos',
    ]) {
      expect(linha(r)).toMatchObject({ gratis: { valor: true }, pro: { valor: true } });
    }
  });
  it('Pro = receber por e-mail: alertas, resumo semanal, Meu Radar completo e salvos', () => {
    expect(linha('Alertas por e-mail às 7h (busca salva)')).toEqual({
      recurso: 'Alertas por e-mail às 7h (busca salva)', gratis: { valor: false }, pro: { valor: `Até ${LIMITES_CONTA.pro.alertas}` },
    });
    expect(linha('Resumo semanal por e-mail (segunda, 7h)')).toEqual({
      recurso: 'Resumo semanal por e-mail (segunda, 7h)', gratis: { valor: false }, pro: { valor: true },
    });
    expect(linha('Meu Radar')).toEqual({ recurso: 'Meu Radar', gratis: { valor: `Prévia (${VISIVEIS_GRATIS})` }, pro: { valor: 'Completo' } });
    expect(linha('Editais salvos')).toEqual({ recurso: 'Editais salvos', gratis: { valor: false }, pro: { valor: 'Uso justo' } });
    expect(linha('Preço de referência, quem venceu e resumo com IA').pro.emBreve).toBe(true);
  });
  it('a oferta vem primeiro na tabela (alertas e resumo semanal)', () => {
    expect(LINHAS_PLANOS.slice(0, 2).map((l) => l.recurso)).toEqual([
      'Alertas por e-mail às 7h (busca salva)',
      'Resumo semanal por e-mail (segunda, 7h)',
    ]);
  });
  it('nenhuma linha fala de limite por dia', () => {
    for (const l of LINHAS_PLANOS) expect(l.recurso).not.toMatch(/por dia|limite/i);
  });
  it('nenhuma linha fala do Basic', () => {
    for (const l of LINHAS_PLANOS) expect(Object.keys(l).sort()).toEqual(['gratis', 'pro', 'recurso']);
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
