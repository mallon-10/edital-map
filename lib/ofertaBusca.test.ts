import { describe, expect, it } from 'vitest';
import { lerSessaoOferta, marcarOfertaVista, ofertaDaBusca, ofertaPodeAparecer } from './ofertaBusca';
import type { FiltrosTela } from './tipos';

const VAZIO: FiltrosTela = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };
const JOINVILLE = { ibge: '4209102', nome: 'Joinville', uf: 'SC' };

describe('ofertaDaBusca', () => {
  it('usa o termo e a quantidade real, e mostra o preço do plano', () => {
    const o = ofertaDaBusca({ ...VAZIO, q: 'uniformes escolares' }, 281);
    expect(o?.titulo).toBe('Não perca os próximos editais de uniformes escolares.');
    expect(o?.texto).toBe('São 281 abertos agora, e novas oportunidades podem aparecer todos os dias. Receba por e-mail, sem precisar pesquisar.');
    expect(o?.preco).toBe('R$ 37,90/mês');
  });
  it('singular e milhar', () => {
    expect(ofertaDaBusca({ ...VAZIO, q: 'luva' }, 1)?.texto).toContain('É 1 aberto agora,');
    expect(ofertaDaBusca({ ...VAZIO, q: 'luva' }, 12345)?.texto).toContain('São 12.345 abertos agora,');
  });
  it('adapta ao estado e ao município', () => {
    expect(ofertaDaBusca({ ...VAZIO, q: 'luva', uf: 'SC' }, 9)?.titulo).toBe('Não perca os próximos editais de luva em Santa Catarina.');
    expect(ofertaDaBusca({ ...VAZIO, q: 'luva', uf: 'SC', cidade: JOINVILLE }, 9)?.titulo).toBe('Não perca os próximos editais de luva em Joinville/SC.');
  });
  it('com raio promete o município: o alerta não guarda o círculo', () => {
    expect(ofertaDaBusca({ ...VAZIO, q: 'luva', uf: 'SC', cidade: JOINVILLE, raio: 50 }, 9)?.titulo).toBe('Não perca os próximos editais de luva em Joinville/SC.');
  });
  it('as exclusões não entram no título', () => {
    expect(ofertaDaBusca({ ...VAZIO, q: 'uniforme -camisa' }, 3)?.titulo).toBe('Não perca os próximos editais de uniforme.');
  });
  it('termo longo é cortado na tela, não no alerta', () => {
    const q = `uniforme ${'escolar '.repeat(12)}`.trim();
    const o = ofertaDaBusca({ ...VAZIO, q }, 2);
    expect(o?.titulo.length).toBeLessThan(80);
    expect(o?.titulo).toContain('…');
    expect(o?.href).toContain(encodeURIComponent('escolar escolar escolar').replace(/%20/g, '+'));
  });
  it('sem resultado, ou sem termo, não há oferta', () => {
    expect(ofertaDaBusca({ ...VAZIO, q: 'luva' }, 0)).toBeNull();
    expect(ofertaDaBusca({ ...VAZIO, uf: 'SC' }, 900)).toBeNull();
    expect(ofertaDaBusca({ ...VAZIO, q: '   ' }, 900)).toBeNull();
    expect(ofertaDaBusca({ ...VAZIO, q: '-camisa' }, 900)).toBeNull();
  });
  it('leva os filtros da busca para a prévia do alerta', () => {
    const o = ofertaDaBusca({ ...VAZIO, q: 'luva', uf: 'SC', valorMin: 50000, modalidades: [8, 6] }, 4);
    expect(o?.href).toBe('/alertas/novo?q=luva&uf=SC&valor=50000&modalidades=6%2C8');
  });
  it('a mesma busca tem a mesma chave; outro termo ou lugar, outra', () => {
    const a = ofertaDaBusca({ ...VAZIO, q: 'Luvas', uf: 'SC' }, 4)!.chave;
    expect(ofertaDaBusca({ ...VAZIO, q: 'luva', uf: 'SC' }, 9)!.chave).toBe(a);
    expect(ofertaDaBusca({ ...VAZIO, q: 'luva', uf: 'PR' }, 9)!.chave).not.toBe(a);
    expect(ofertaDaBusca({ ...VAZIO, q: 'bota', uf: 'SC' }, 9)!.chave).not.toBe(a);
  });
});

describe('oferta na sessão', () => {
  it('valor guardado estranho conta como sessão nova', () => {
    expect(lerSessaoOferta(null)).toEqual({ fechada: false, vistas: [] });
    expect(lerSessaoOferta('{quebrado')).toEqual({ fechada: false, vistas: [] });
    expect(lerSessaoOferta('{"fechada":"sim","vistas":3}')).toEqual({ fechada: false, vistas: [] });
  });
  it('aparece em toda busca, inclusive repetida, até a pessoa fechar', () => {
    const s = marcarOfertaVista({ fechada: false, vistas: [] }, 'luva|SC');
    expect(ofertaPodeAparecer(s)).toBe(true);
    expect(ofertaPodeAparecer({ fechada: false, vistas: ['a', 'b', 'c', 'd', 'e'] })).toBe(true);
  });
  it('fechar vale para a sessão inteira', () => {
    expect(ofertaPodeAparecer({ fechada: true, vistas: [] })).toBe(false);
  });
});
