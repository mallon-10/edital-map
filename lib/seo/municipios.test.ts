import { describe, expect, it } from 'vitest';
import { CAPITAIS, cidadePorSlug, escolherCidades, MINIMO_CIDADE, slugCidade } from './municipios';

describe('slugCidade', () => {
  it('sem acento, minúsculo, hífens', () => {
    expect(slugCidade('São Bento do Sul')).toBe('sao-bento-do-sul');
    expect(slugCidade("Santa Bárbara d'Oeste")).toBe('santa-barbara-d-oeste');
    expect(slugCidade('  Mogi-Guaçu ')).toBe('mogi-guacu');
  });
});

describe('escolherCidades', () => {
  const lista = [
    { codigo_ibge: '4215802', nome: 'São Bento do Sul', uf: 'SC', total: MINIMO_CIDADE },
    { codigo_ibge: '4205407', nome: 'Florianópolis', uf: 'SC', total: 3 },
    { codigo_ibge: '4200051', nome: 'Abdon Batista', uf: 'SC', total: MINIMO_CIDADE - 1 },
    { codigo_ibge: '1100015', nome: 'Alta Floresta', uf: 'RO', total: 40 },
    { codigo_ibge: '5100250', nome: 'Alta Floresta', uf: 'MT', total: 40 },
  ];
  it('entra quem tem o mínimo de editais e toda capital com edital aberto', () => {
    const c = escolherCidades(lista).map((x) => `${x.uf}/${x.slug}`);
    expect(c).toEqual(['MT/alta-floresta', 'RO/alta-floresta', 'SC/florianopolis', 'SC/sao-bento-do-sul']);
  });
  it('mesmo nome na mesma UF ganha o código do IBGE no endereço', () => {
    const c = escolherCidades([
      { codigo_ibge: '1', nome: 'Bom Jesus', uf: 'PI', total: 30 },
      { codigo_ibge: '2', nome: 'Bom Jesus', uf: 'PI', total: 25 },
    ]);
    expect(c.map((x) => x.slug)).toEqual(['bom-jesus', 'bom-jesus-2']);
  });
  it('acha a cidade pela UF e pelo endereço', () => {
    const c = escolherCidades(lista);
    expect(cidadePorSlug(c, 'SC', 'sao-bento-do-sul')?.ibge).toBe('4215802');
    expect(cidadePorSlug(c, 'SP', 'sao-bento-do-sul')).toBeNull();
  });
  it('27 capitais', () => {
    expect(CAPITAIS.size).toBe(27);
  });
});
