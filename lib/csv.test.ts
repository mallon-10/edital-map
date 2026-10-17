import { describe, expect, it } from 'vitest';
import { celula, COLUNAS, dataHoraPlanilha, dataPlanilha, gerarCsv, MAX_EXPORTACAO, nomeArquivo, valorPlanilha } from './csv';
import { assunto } from './texto';
import type { EditalExportado } from './tipos';

const EDITAL: EditalExportado = {
  id: '83102244000102-1-000077/2026', slug: '83102244000102-2026-77',
  objeto: 'Aquisição de luvas de vaqueta; tamanho "G"\npara a Defesa Civil',
  orgao_nome: 'MUNICIPIO DE JOINVILLE', unidade_nome: null, municipio_nome: 'Joinville', uf: 'SC', codigo_ibge: '4209102',
  valor_estimado: 1234.5, encerramento_em: '2026-10-20T13:00:00Z', publicada_em: '2026-10-15T02:30:00Z',
  modalidade_nome: 'Pregão - Eletrônico', srp: false, onde: 'objeto', link_origem: null,
};

describe('celula', () => {
  it('texto simples fica como está', () => {
    expect(celula('Joinville')).toBe('Joinville');
  });
  it('com ;, aspas ou quebra de linha vai entre aspas, com as aspas dobradas', () => {
    expect(celula('a;b')).toBe('"a;b"');
    expect(celula('tamanho "G"')).toBe('"tamanho ""G"""');
    expect(celula('linha 1\nlinha 2')).toBe('"linha 1\nlinha 2"');
    expect(celula('linha 1\r\nlinha 2')).toBe('"linha 1\r\nlinha 2"');
  });
  it('começo que o Excel leria como fórmula ganha apóstrofo', () => {
    expect(celula('=SOMA(A1)')).toBe("'=SOMA(A1)");
    expect(celula('-5 unidades')).toBe("'-5 unidades");
    expect(celula('@x;y')).toBe(`"'@x;y"`);
  });
});

describe('datas e valores no formato brasileiro', () => {
  it('prazo com a hora de Brasília', () => {
    expect(dataHoraPlanilha('2026-10-20T13:00:00Z')).toBe('20/10/2026 10:00');
  });
  it('publicação no dia de Brasília (02h30 UTC ainda é o dia anterior)', () => {
    expect(dataPlanilha('2026-10-15T02:30:00Z')).toBe('14/10/2026');
    expect(dataPlanilha(null)).toBe('');
  });
  it('valor com vírgula e sem separador de milhar; nulo ou 0 = Valor não informado', () => {
    expect(valorPlanilha(1234.5)).toBe('1234,50');
    expect(valorPlanilha(2500000)).toBe('2500000,00');
    expect(valorPlanilha(null)).toBe('Valor não informado');
    expect(valorPlanilha(0)).toBe('Valor não informado');
  });
  it('nome do arquivo com a data de Brasília', () => {
    expect(nomeArquivo(new Date('2026-10-17T15:00:00Z'))).toBe('editais-2026-10-17.csv');
    expect(nomeArquivo(new Date('2026-10-17T02:00:00Z'))).toBe('editais-2026-10-16.csv');
  });
});

describe('gerarCsv', () => {
  const csv = gerarCsv([
    EDITAL,
    {
      ...EDITAL, id: 'B', slug: '00394452000103-2026-21982', link_origem: 'https://compras.joinville.sc.gov.br/edital/77',
      valor_estimado: null, publicada_em: null, modalidade_nome: null,
    },
  ]);
  const linhas = csv.slice(1).split('\r\n');

  it('começa com o BOM UTF-8 e termina com CRLF', () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(linhas).toHaveLength(4); // cabeçalho, 2 editais e o vazio depois do último CRLF
  });
  it('cabeçalho com as 10 colunas, separadas por ;', () => {
    expect(linhas[0]).toBe(
      'Título;Objeto completo;Órgão;Município;UF;Modalidade;Valor estimado;Prazo das propostas;Publicado em;Link do edital',
    );
    expect(COLUNAS).toHaveLength(10);
    expect(MAX_EXPORTACAO).toBe(2000);
  });
  it('linha do edital: título, objeto limpo entre aspas (sem quebra de linha), órgão limpo, datas e link do PNCP', () => {
    expect(linhas[1]).toBe(
      [
        celula(assunto(EDITAL.objeto).titulo),
        '"Aquisição de luvas de vaqueta; tamanho ""G"" para a Defesa Civil"',
        'Municipio de Joinville',
        'Joinville',
        'SC',
        'Pregão eletrônico',
        '1234,50',
        '20/10/2026 10:00',
        '14/10/2026',
        'https://pncp.gov.br/app/editais/83102244000102/2026/77',
      ].join(';'),
    );
  });
  it('link de origem quando existe; modalidade, valor e publicação ausentes', () => {
    expect(linhas[2].endsWith(';SC;;Valor não informado;20/10/2026 10:00;;https://compras.joinville.sc.gov.br/edital/77')).toBe(true);
  });
});
