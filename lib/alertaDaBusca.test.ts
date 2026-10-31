import { describe, expect, it } from 'vitest';
import { hrefAlertaDaBusca, hrefMonitorarEdital, lerRascunhoGuardado, previaTemFiltro, rascunhoDaBusca, segmentoDoEdital } from './alertaDaBusca';
import type { FiltrosTela } from './tipos';

const VAZIO: FiltrosTela = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };
const JOINVILLE = { ibge: '4209102', nome: 'Joinville', uf: 'SC' };

describe('hrefAlertaDaBusca', () => {
  it('sem filtro, o formulário de sempre', () => {
    expect(hrefAlertaDaBusca(VAZIO)).toBe('/alertas/novo');
  });
  it('leva só o que o alerta guarda: termo, UF, município, valor e modalidades', () => {
    const busca: FiltrosTela = { ...VAZIO, q: 'luva', uf: 'SC', cidade: JOINVILLE, valorMin: 1000, modalidades: [8, 6], raio: 50, seteDias: true, orgao: { cnpj: '1', nome: 'x' } as never };
    expect(hrefAlertaDaBusca(busca)).toBe(
      '/alertas/novo?q=luva&uf=SC&municipio=4209102&valor=1000&modalidades=6%2C8',
    );
  });
});

describe('rascunhoDaBusca', () => {
  it('termo vira produto e as exclusões vão para "palavras para excluir"', () => {
    const r = rascunhoDaBusca({ ...VAZIO, q: 'uniforme, luva -camisa' });
    expect(r.termos).toEqual(['uniforme', 'luva']);
    expect(r.termosExcluir).toEqual(['camisa']);
    expect(r.abrangencia).toBe('brasil');
  });
  it('estado, município, valor e modalidades', () => {
    expect(rascunhoDaBusca({ ...VAZIO, q: 'luva', uf: 'SC' })).toMatchObject({ abrangencia: 'estados', ufs: ['SC'], municipios: [] });
    expect(rascunhoDaBusca({ ...VAZIO, q: 'luva', uf: 'SC', cidade: JOINVILLE })).toMatchObject({ abrangencia: 'municipios', ufs: [], municipios: [JOINVILLE] });
    expect(rascunhoDaBusca({ ...VAZIO, q: 'luva', valorMin: 50000, modalidades: [6] })).toMatchObject({ valorMin: '50.000', modalidades: [6] });
  });
  it('sem termo, o alerta fica para escolher', () => {
    expect(rascunhoDaBusca({ ...VAZIO, uf: 'SC' }).termos).toEqual([]);
  });
});

describe('previaTemFiltro', () => {
  it('só com algo vindo da busca', () => {
    expect(previaTemFiltro(new URLSearchParams(''))).toBe(false);
    expect(previaTemFiltro(new URLSearchParams('de=radar'))).toBe(false);
    expect(previaTemFiltro(new URLSearchParams('q=luva'))).toBe(true);
    expect(previaTemFiltro(new URLSearchParams('uf=SC'))).toBe(true);
  });
});

describe('segmentoDoEdital', () => {
  it('acha o assunto pelo objeto, sem depender de acento, caixa ou plural', () => {
    expect(segmentoDoEdital('AQUISIÇÃO DE UNIFORMES ESCOLARES PARA A REDE MUNICIPAL')?.termo).toMatch(/uniforme/i);
  });
  it('fica no termo que bateu, não cai no nome genérico do ramo', () => {
    expect(segmentoDoEdital('Registro de preços de luvas de procedimento')?.termo).toMatch(/luva/i);
    expect(segmentoDoEdital('Registro de preços de luvas de procedimento')?.termo).not.toMatch(/medicamento/i);
  });
  it('objeto sem assunto conhecido: nenhum segmento inventado', () => {
    expect(segmentoDoEdital('Contratação de xyzabc')).toBeNull();
  });
});

describe('hrefMonitorarEdital', () => {
  it('leva o assunto e a UF do edital', () => {
    expect(hrefMonitorarEdital('Aquisição de uniformes', 'SC')).toMatch(/^\/alertas\/novo\?q=uniforme[^&]*&uf=SC$/i);
  });
  it('sem assunto conhecido, só a UF', () => {
    expect(hrefMonitorarEdital('Contratação de xyzabc', 'SC')).toBe('/alertas/novo?uf=SC');
  });
});

describe('lerRascunhoGuardado (compra no meio do caminho)', () => {
  const r = rascunhoDaBusca({ ...VAZIO, q: 'luva', uf: 'SC' });
  it('devolve o rascunho guardado', () => {
    expect(lerRascunhoGuardado(JSON.stringify(r))).toEqual(r);
  });
  it('valor quebrado ou sem produto não preenche nada', () => {
    expect(lerRascunhoGuardado(null)).toBeNull();
    expect(lerRascunhoGuardado('{quebrado')).toBeNull();
    expect(lerRascunhoGuardado('{"termos":"luva"}')).toBeNull();
    expect(lerRascunhoGuardado(JSON.stringify({ ...r, termos: [] }))).toBeNull();
    expect(lerRascunhoGuardado(JSON.stringify({ ...r, ufs: 'SC' }))).toBeNull();
  });
});
