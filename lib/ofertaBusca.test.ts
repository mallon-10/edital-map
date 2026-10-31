import { describe, expect, it } from 'vitest';
import { lerSessaoOferta, marcarOfertaVista, MAX_OFERTAS_SESSAO, ofertaDaBusca, ofertaPodeAparecer } from './ofertaBusca';
import type { FiltrosTela } from './tipos';

const VAZIO: FiltrosTela = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };
const JOINVILLE = { ibge: '4209102', nome: 'Joinville', uf: 'SC' };

describe('ofertaDaBusca', () => {
  it('usa o termo e a quantidade real, e mostra o preço do plano', () => {
    const o = ofertaDaBusca({ ...VAZIO, q: 'uniformes escolares' }, 281);
    expect(o?.titulo).toBe('Encontramos 281 licitações de uniformes escolares.');
    expect(o?.texto).toBe('Novas oportunidades podem aparecer todos os dias. Receba automaticamente os novos editais desse segmento e acompanhe tudo em um único lugar.');
    expect(o?.preco).toBe('R$ 37,90/mês');
  });
  it('singular e milhar', () => {
    expect(ofertaDaBusca({ ...VAZIO, q: 'luva' }, 1)?.titulo).toBe('Encontramos 1 licitação de luva.');
    expect(ofertaDaBusca({ ...VAZIO, q: 'luva' }, 12345)?.titulo).toBe('Encontramos 12.345 licitações de luva.');
  });
  it('adapta ao estado, ao município e ao raio', () => {
    expect(ofertaDaBusca({ ...VAZIO, q: 'luva', uf: 'SC' }, 9)?.titulo).toBe('Encontramos 9 licitações de luva em Santa Catarina.');
    expect(ofertaDaBusca({ ...VAZIO, q: 'luva', uf: 'SC' }, 9)?.texto).toContain('desse segmento em Santa Catarina');
    expect(ofertaDaBusca({ ...VAZIO, q: 'luva', uf: 'SC', cidade: JOINVILLE }, 9)?.titulo).toBe('Encontramos 9 licitações de luva em Joinville/SC.');
    const raio = ofertaDaBusca({ ...VAZIO, q: 'luva', uf: 'SC', cidade: JOINVILLE, raio: 50 }, 9);
    expect(raio?.titulo).toBe('Encontramos 9 licitações de luva a 50 km de Joinville/SC.');
    // O alerta não guarda raio: a promessa é sobre o município, não sobre a região do círculo.
    expect(raio?.texto).toContain('desse segmento em Joinville/SC');
  });
  it('as exclusões não entram no título', () => {
    expect(ofertaDaBusca({ ...VAZIO, q: 'uniforme -camisa' }, 3)?.titulo).toBe('Encontramos 3 licitações de uniforme.');
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
  it('a mesma oferta não volta na sessão; outra busca, sim', () => {
    const s = marcarOfertaVista({ fechada: false, vistas: [] }, 'luva|SC');
    expect(ofertaPodeAparecer(s, 'luva|SC')).toBe(false);
    expect(ofertaPodeAparecer(s, 'bota|SC')).toBe(true);
  });
  it('fechar vale para a sessão inteira', () => {
    expect(ofertaPodeAparecer({ fechada: true, vistas: [] }, 'bota|SC')).toBe(false);
  });
  it('no máximo três ofertas por sessão', () => {
    expect(MAX_OFERTAS_SESSAO).toBe(3);
    expect(ofertaPodeAparecer({ fechada: false, vistas: ['a', 'b', 'c'] }, 'd')).toBe(false);
  });
});
