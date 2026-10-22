import { describe, expect, it } from 'vitest';
import { escolherCidades } from './municipios';
import { linksDoEdital } from './linksEdital';
import { escolherOrgaos } from './orgaos';

const cidades = escolherCidades([
  { codigo_ibge: '3550308', nome: 'São Paulo', uf: 'SP', total: 900 },
  { codigo_ibge: '3509502', nome: 'Campinas', uf: 'SP', total: 40 },
]);
const orgaos = escolherOrgaos(
  [
    { cnpj: '63025530000104', nome: 'UNIVERSIDADE DE SAO PAULO', uf: 'SP', codigo_ibge: '3550308', total: 148 },
    { cnpj: '51885242000140', nome: 'MUNICIPIO DE CAMPINAS', uf: 'SP', codigo_ibge: '3509502', total: 30 },
  ],
  cidades,
);
const base = { cnpj: '63025530000104', orgao_nome: 'UNIVERSIDADE DE SAO PAULO', modalidade_nome: 'Pregão - Eletrônico', uf: 'SP', codigo_ibge: '3550308' };

describe('linksDoEdital', () => {
  it('modalidade na UF e página do órgão', () => {
    expect(linksDoEdital(base, orgaos, cidades)).toEqual({
      modalidade: '/licitacoes/pregao-eletronico/sp',
      orgao: '/licitacoes/orgao/universidade-de-sao-paulo-63025530000104',
    });
  });
  it('prefeitura leva à página da cidade', () => {
    const e = { ...base, cnpj: '51885242000140', orgao_nome: 'MUNICIPIO DE CAMPINAS', codigo_ibge: '3509502' };
    expect(linksDoEdital(e, orgaos, cidades).orgao).toBe('/licitacoes/sp/campinas');
  });
  it('sem página e modalidade fora da v1: sem link', () => {
    const e = { ...base, cnpj: '99999999000199', modalidade_nome: 'Leilão - Eletrônico', codigo_ibge: '0000000' };
    expect(linksDoEdital(e, orgaos, cidades)).toEqual({ modalidade: null, orgao: null });
  });
});
