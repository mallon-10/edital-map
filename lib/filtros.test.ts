import { describe, expect, it } from 'vitest';
import { chaveFiltros, lerFiltros, paraParametros, UFS_ORDENADAS } from './filtros';
import type { FiltrosTela } from './tipos';

const ler = (s: string) => lerFiltros(new URLSearchParams(s));
const BASE = { q: null, uf: null, ibge: null, dias: null, deslocamento: 0, valorMin: null, modalidades: null };

describe('lerFiltros', () => {
  it('sem parâmetros', () => {
    expect(ler('')).toEqual(BASE);
  });
  it('aceita os valores válidos', () => {
    expect(ler('q=%20EPI%20e%20uniformes%20&uf=sc&ibge=4205407&dias=7&deslocamento=50&valor=50000&modalidades=8,6,6')).toEqual({
      q: 'EPI e uniformes', uf: 'SC', ibge: '4205407', dias: 7, deslocamento: 50, valorMin: 50000, modalidades: [6, 8],
    });
  });
  it('descarta UF que não existe, IBGE malformado e dias diferentes de 7', () => {
    expect(ler('uf=XX&ibge=123&dias=30')).toEqual(BASE);
  });
  it('aceita qualquer UF do Brasil', () => {
    expect(ler('uf=sp').uf).toBe('SP');
    expect(ler('uf=AM').uf).toBe('AM');
  });
  it('ignora valor fora da lista e modalidades desconhecidas', () => {
    expect(ler('valor=12345&modalidades=1,99,abc')).toEqual(BASE);
  });
  it('limita o termo a 100 caracteres e o deslocamento a 0..20000', () => {
    expect(ler(`q=${'a'.repeat(150)}`).q).toHaveLength(100);
    expect(ler('deslocamento=-1').deslocamento).toBe(0);
    expect(ler('deslocamento=20050').deslocamento).toBe(0);
    expect(ler('deslocamento=1.5').deslocamento).toBe(0);
  });
});

describe('chaveFiltros', () => {
  it('ignora maiúsculas no termo', () => {
    expect(chaveFiltros(ler('q=EPI'))).toBe(chaveFiltros(ler('q=epi')));
  });
  it('muda quando o filtro muda', () => {
    expect(chaveFiltros(ler('q=epi'))).not.toBe(chaveFiltros(ler('q=epi&uf=PR')));
    expect(chaveFiltros(ler('q=epi'))).not.toBe(chaveFiltros(ler('q=epi&valor=50000')));
    expect(chaveFiltros(ler('q=epi'))).not.toBe(chaveFiltros(ler('q=epi&modalidades=6')));
  });
});

describe('paraParametros', () => {
  const TELA: FiltrosTela = {
    q: ' EPI ', uf: 'SC', cidade: { ibge: '4205407', nome: 'Florianópolis', uf: 'SC' }, valorMin: 50000, modalidades: [8, 6], seteDias: true,
  };
  it('monta os parâmetros que a API entende', () => {
    expect(paraParametros(TELA, { deslocamento: 50 }).toString()).toBe(
      'q=EPI&uf=SC&dias=7&valor=50000&modalidades=6%2C8&ibge=4205407&deslocamento=50',
    );
  });
  it('sem cidade para o mapa e vazio quando não há filtro', () => {
    expect(paraParametros(TELA, { comCidade: false }).has('ibge')).toBe(false);
    expect(paraParametros({ q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false }).toString()).toBe('');
  });
  it('ida e volta com lerFiltros', () => {
    expect(lerFiltros(paraParametros(TELA))).toEqual({
      q: 'EPI', uf: 'SC', ibge: '4205407', dias: 7, deslocamento: 0, valorMin: 50000, modalidades: [6, 8],
    });
  });
});

describe('UFS_ORDENADAS', () => {
  it('as 27 UFs em ordem alfabética', () => {
    expect(UFS_ORDENADAS).toHaveLength(27);
    expect(UFS_ORDENADAS[0]).toBe('AC');
    expect(UFS_ORDENADAS[26]).toBe('TO');
    expect([...UFS_ORDENADAS].sort()).toEqual(UFS_ORDENADAS);
  });
});
