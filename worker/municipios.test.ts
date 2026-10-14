import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CABECALHO_MUNICIPIOS, lerMunicipiosCsv, validarMunicipios } from './municipios';

const csv = [
  CABECALHO_MUNICIPIOS,
  '4202404,Blumenau,-26.9155,-49.0709,0,42,8047,47,America/Sao_Paulo',
  '4205407,Florianópolis,-27.5945,-48.5477,1,42,8105,48,America/Sao_Paulo',
].join('\r\n');

describe('lerMunicipiosCsv', () => {
  it('lê linhas com CRLF e converte o código da UF em sigla', () => {
    expect(lerMunicipiosCsv(`\uFEFF${csv}\r\n`)).toEqual([
      { codigo_ibge: '4202404', nome: 'Blumenau', uf: 'SC', lat: -26.9155, lng: -49.0709 },
      { codigo_ibge: '4205407', nome: 'Florianópolis', uf: 'SC', lat: -27.5945, lng: -48.5477 },
    ]);
  });
  it('recusa cabeçalho diferente', () => {
    expect(() => lerMunicipiosCsv('a,b\n1,2')).toThrow('Cabeçalho inesperado');
  });
  it('recusa código de UF desconhecido', () => {
    expect(() => lerMunicipiosCsv(`${CABECALHO_MUNICIPIOS}\n1,X,1,1,0,99,1,1,America/Sao_Paulo`)).toThrow('codigo_uf desconhecido 99');
  });
});

describe('validarMunicipios', () => {
  it('recusa quantidade errada', () => {
    expect(() => validarMunicipios(lerMunicipiosCsv(csv))).toThrow('5571');
  });
  it('aceita o arquivo real do repositório', () => {
    const texto = readFileSync(new URL('../data/municipios.csv', import.meta.url), 'utf8');
    expect(() => validarMunicipios(lerMunicipiosCsv(texto))).not.toThrow();
  });
});
