import { describe, expect, it } from 'vitest';
import { data, hora, moeda } from './formato';
import { comPreposicao, minusculaInicial, NAO_INFORMADO, resumoOportunidade } from './resumoEdital';
import { assunto } from './texto';
import type { Edital } from './tipos';

const E: Edital = {
  id: '83102244000102-1-000077/2026', slug: '83102244000102-2026-77', cnpj: '83102244000102', ano: 2026, sequencial: 77,
  objeto: 'Aquisição de luvas nitrílicas para a Secretaria de Saúde', info_complementar: null, orgao_nome: 'MUNICIPIO DE JOINVILLE',
  unidade_nome: null, municipio_nome: 'Joinville', uf: 'SC', codigo_ibge: '4209102', modalidade_nome: 'Pregão - Eletrônico',
  situacao_id: 1, situacao_nome: 'Divulgada no PNCP', esfera: 'M', srp: false, valor_estimado: 12500,
  publicada_em: '2026-10-10T12:00:00Z', abertura_em: null, encerramento_em: '2026-10-25T13:00:00Z', link_origem: null,
  atualizada_pncp_em: '2026-10-11T12:00:00Z',
};

describe('resumoOportunidade (só com os campos que existem)', () => {
  it('com todos os dados: as quatro frases da spec', () => {
    expect(resumoOportunidade(E)).toEqual([
      `Este edital trata de ${minusculaInicial(assunto(E.objeto).titulo)}, do Municipio de Joinville (Joinville/SC).`,
      'Modalidade: Pregão eletrônico.',
      `Valor estimado: ${moeda(12500)}.`,
      `As propostas podem ser enviadas até ${data(E.encerramento_em!)}, às ${hora(E.encerramento_em!)}.`,
    ]);
  });
  it('sem valor (nulo ou zero) e sem prazo: "não informado pelo órgão"', () => {
    for (const valor_estimado of [null, 0]) {
      const f = resumoOportunidade({ ...E, valor_estimado, encerramento_em: null });
      expect(f).toContain(`Valor estimado: ${NAO_INFORMADO}.`);
      expect(f).toContain(`Prazo para as propostas: ${NAO_INFORMADO}.`);
    }
  });
  it('sem modalidade a frase sai; sem município fica só a UF', () => {
    const f = resumoOportunidade({ ...E, modalidade_nome: null, municipio_nome: null });
    expect(f).toHaveLength(3);
    expect(f[0]).toMatch(/\(SC\)\.$/);
  });
  it('nunca escreve null nem undefined', () => {
    const f = resumoOportunidade({ ...E, modalidade_nome: null, municipio_nome: null, valor_estimado: null, encerramento_em: null, unidade_nome: null });
    expect(f.join(' ')).not.toMatch(/null|undefined/);
  });
});

describe('comPreposicao', () => {
  it('do ou da conforme o começo do nome do órgão', () => {
    expect(comPreposicao('Município de Joinville')).toBe('do Município de Joinville');
    expect(comPreposicao('Prefeitura Municipal de Itajai')).toBe('da Prefeitura Municipal de Itajai');
    expect(comPreposicao('Secretaria de Estado da Saúde')).toBe('da Secretaria de Estado da Saúde');
    expect(comPreposicao('Fundacao Hospitalar')).toBe('da Fundacao Hospitalar');
    expect(comPreposicao('Fundo Municipal de Saúde')).toBe('do Fundo Municipal de Saúde');
    expect(comPreposicao('Associação Beneficente X')).toBe('da Associação Beneficente X');
    expect(comPreposicao('Administração Regional')).toBe('da Administração Regional');
    expect(comPreposicao('Cooperativa Agrícola')).toBe('da Cooperativa Agrícola');
    expect(comPreposicao('Delegacia de Polícia')).toBe('da Delegacia de Polícia');
    expect(comPreposicao('Santa Casa de Misericórdia')).toBe('da Santa Casa de Misericórdia');
    expect(comPreposicao('Comunidade Terapêutica')).toBe('da Comunidade Terapêutica');
  });
  it('nome desconhecido: forma neutra "de"', () => {
    expect(comPreposicao('Xyz Abc')).toBe('de Xyz Abc');
  });
});

describe('minusculaInicial', () => {
  it('minúscula no começo, menos em sigla', () => {
    expect(minusculaInicial('Luvas nitrílicas')).toBe('luvas nitrílicas');
    expect(minusculaInicial('EPIs diversos')).toBe('EPIs diversos');
    expect(minusculaInicial('06 carretas')).toBe('06 carretas');
  });
});
