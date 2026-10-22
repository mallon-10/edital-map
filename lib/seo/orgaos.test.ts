import { describe, expect, it } from 'vitest';
import { escolherCidades } from './municipios';
import { cnpjDoSlug, ehPrefeitura, escolherOrgaos, MINIMO_ORGAO, nomeDoOrgao, orgaoPorCnpj, slugOrgao } from './orgaos';

describe('ehPrefeitura', () => {
  it('município e prefeitura, com ou sem acento e caixa', () => {
    expect(ehPrefeitura('MUNICIPIO DE CAMPINAS')).toBe(true);
    expect(ehPrefeitura('Município de Itajaí')).toBe(true);
    expect(ehPrefeitura('PREFEITURA MUNICIPAL DE SOBRAL')).toBe(true);
    expect(ehPrefeitura('Prefeitura de Belo Horizonte')).toBe(true);
    expect(ehPrefeitura('FUNDO MUNICIPAL DE SAUDE DE MORRINHOS')).toBe(false);
    expect(ehPrefeitura('UNIVERSIDADE DE SAO PAULO')).toBe(false);
  });
});

describe('slug do órgão', () => {
  it('nome em slug e o CNPJ no fim (minúsculo)', () => {
    expect(slugOrgao('Universidade de São Paulo', '63025530000104')).toBe('universidade-de-sao-paulo-63025530000104');
    expect(slugOrgao('Órgão Novo', '12ABC34501DE35')).toBe('orgao-novo-12abc34501de35');
  });
  it('CNPJ de volta do slug (maiúsculo); sem CNPJ válido = null', () => {
    expect(cnpjDoSlug('universidade-de-sao-paulo-63025530000104')).toBe('63025530000104');
    expect(cnpjDoSlug('orgao-novo-12abc34501de35')).toBe('12ABC34501DE35');
    expect(cnpjDoSlug('63025530000104')).toBe('63025530000104');
    expect(cnpjDoSlug('universidade-de-sao-paulo')).toBeNull();
    expect(cnpjDoSlug('x-6302553000010')).toBeNull();
  });
});

describe('nomeDoOrgao', () => {
  it('nome próprio; genérico ganha a cidade', () => {
    expect(nomeDoOrgao('UNIVERSIDADE DE SAO PAULO', 'São Paulo', 'SP')).toBe('Universidade de Sao Paulo');
    expect(nomeDoOrgao('FUNDO MUNICIPAL DE SAUDE - FMS', 'Morrinhos', 'GO')).toBe('Fundo Municipal de Saude - FMS (Morrinhos/GO)');
    expect(nomeDoOrgao('SECRETARIA MUNICIPAL DE EDUCACAO', 'Natal', 'RN')).toMatch(/\(Natal\/RN\)$/);
    expect(nomeDoOrgao('CAMARA MUNICIPAL DE X', null, 'RN')).toBe('Camara Municipal de X');
  });
});

describe('escolherOrgaos', () => {
  const cidades = escolherCidades([
    { codigo_ibge: '3550308', nome: 'São Paulo', uf: 'SP', total: 900 },
    { codigo_ibge: '5214002', nome: 'Morrinhos', uf: 'GO', total: 3 },
  ]);
  const lista = [
    { cnpj: '63025530000104', nome: 'UNIVERSIDADE DE SAO PAULO', uf: 'SP', codigo_ibge: '3550308', total: 148 },
    { cnpj: '46395000000139', nome: 'MUNICIPIO DE SAO PAULO', uf: 'SP', codigo_ibge: '3550308', total: 300 },
    { cnpj: '11111111000111', nome: 'FUNDO MUNICIPAL DE SAUDE', uf: 'GO', codigo_ibge: '5214002', total: MINIMO_ORGAO - 1 },
    { cnpj: '22222222000122', nome: '   ', uf: 'GO', codigo_ibge: null, total: 50 },
    { cnpj: '33333333000133', nome: 'COMANDO DA MARINHA', uf: 'RJ', codigo_ibge: '9999999', total: MINIMO_ORGAO },
  ];
  it('sem prefeitura e sem nome vazio; sitemap a partir de 10', () => {
    const o = escolherOrgaos(lista, cidades);
    expect(o.map((x) => x.cnpj)).toEqual(['63025530000104', '33333333000133', '11111111000111']);
    expect(o.filter((x) => x.noSitemap).map((x) => x.cnpj)).toEqual(['63025530000104', '33333333000133']);
  });
  it('cidade do órgão quando a cidade tem página; nome genérico ganha a cidade', () => {
    const o = escolherOrgaos(lista, cidades);
    expect(orgaoPorCnpj(o, '63025530000104')).toMatchObject({
      slug: 'universidade-de-sao-paulo-63025530000104', cidadeNome: 'São Paulo', cidadeSlug: 'sao-paulo', ibge: '3550308',
    });
    expect(orgaoPorCnpj(o, '11111111000111')?.nome).toBe('Fundo Municipal de Saude (Morrinhos/GO)');
    expect(orgaoPorCnpj(o, '33333333000133')).toMatchObject({ cidadeNome: null, cidadeSlug: null });
    expect(orgaoPorCnpj(o, '46395000000139')).toBeNull();
  });
  it('mais editais primeiro', () => {
    expect(MINIMO_ORGAO).toBe(10);
  });
});
