import { describe, expect, it } from 'vitest';
import { chaveFiltros, lerFiltros } from './filtros';

const ler = (s: string) => lerFiltros(new URLSearchParams(s));

describe('lerFiltros', () => {
  it('sem parâmetros', () => {
    expect(ler('')).toEqual({ q: null, uf: null, ibge: null, dias: null, deslocamento: 0 });
  });
  it('aceita os valores válidos', () => {
    expect(ler('q=%20EPI%20e%20uniformes%20&uf=sc&ibge=4205407&dias=7&deslocamento=50')).toEqual({
      q: 'EPI e uniformes', uf: 'SC', ibge: '4205407', dias: 7, deslocamento: 50,
    });
  });
  it('descarta UF fora da cobertura, IBGE malformado e dias diferentes de 7', () => {
    expect(ler('uf=SP&ibge=123&dias=30')).toEqual({ q: null, uf: null, ibge: null, dias: null, deslocamento: 0 });
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
  });
});
