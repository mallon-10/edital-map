import { describe, expect, it } from 'vitest';
import type { Edital } from '../tipos';
import { ASSUNTOS, assuntoPorSlug } from './assuntos';
import { MODALIDADES, modalidadePorSlug } from './modalidades';
import {
  buscaDaPagina, caminhoDaPagina, descricaoDaPagina, descricaoDoEdital, editalAberto, introDaPagina, jsonLdMigalhas, migalhas,
  temBusca, tituloDaPagina, tituloSeoDaPagina, vizinhos,
} from './textos';

const epi = assuntoPorSlug('epi')!;
const BR = { assunto: null, uf: null };
const SP = { assunto: null, uf: 'SP' };
const EPI = { assunto: epi, uf: null };
const EPI_BA = { assunto: epi, uf: 'BA' };

describe('páginas /licitacoes', () => {
  it('caminho', () => {
    expect(caminhoDaPagina(BR)).toBe('/licitacoes');
    expect(caminhoDaPagina(SP)).toBe('/licitacoes/sp');
    expect(caminhoDaPagina(EPI)).toBe('/licitacoes/epi');
    expect(caminhoDaPagina(EPI_BA)).toBe('/licitacoes/epi/ba');
  });
  it('título', () => {
    expect(tituloDaPagina(BR)).toBe('Licitações abertas no Brasil');
    expect(tituloDaPagina(SP)).toBe('Licitações abertas em São Paulo');
    expect(tituloDaPagina(EPI)).toBe('Licitações de EPI abertas no Brasil');
    expect(tituloDaPagina(EPI_BA)).toBe('Licitações de EPI abertas na Bahia');
  });
  it('descrição com total, singular e zero', () => {
    expect(descricaoDaPagina(EPI_BA, 1234)).toBe(
      '1.234 editais de EPI abertos na Bahia, direto do PNCP e atualizados a cada 3 horas. Veja prazos, valores e órgãos no mapa.',
    );
    expect(descricaoDaPagina(SP, 1)).toMatch(/^1 edital aberto em São Paulo,/);
    expect(descricaoDaPagina(EPI, 0)).toMatch(/^Nenhum edital de EPI aberto no Brasil agora\./);
  });
  it('introdução cita o total e a fonte', () => {
    expect(introDaPagina(EPI_BA, 12)).toContain('12 editais de EPI abertos na Bahia');
    expect(introDaPagina(EPI_BA, 12)).toContain('PNCP');
    expect(introDaPagina(BR, 0)).toContain('Nenhum edital aberto no Brasil agora');
    // Com assunto a lista vem por relevância; sem assunto, pelo prazo.
    expect(introDaPagina(EPI_BA, 12)).toContain('mostra primeiro os que mais falam de EPI');
    expect(introDaPagina(SP, 12)).toContain('mostra primeiro os que encerram antes');
  });
  it('link para a busca no mapa', () => {
    expect(buscaDaPagina(EPI_BA)).toBe('/?q=EPI&uf=BA');
    expect(buscaDaPagina(SP)).toBe('/?uf=SP');
    expect(buscaDaPagina(BR)).toBe('/');
  });
  it('migalhas e JSON-LD', () => {
    expect(migalhas(EPI_BA)).toEqual([
      { nome: 'Início', caminho: '/' },
      { nome: 'Licitações', caminho: '/licitacoes' },
      { nome: 'EPI', caminho: '/licitacoes/epi' },
      { nome: 'Bahia', caminho: '/licitacoes/epi/ba' },
    ]);
    const ld = jsonLdMigalhas(migalhas(SP)) as { itemListElement: Array<{ position: number; item: string }> };
    expect(ld.itemListElement[2]).toMatchObject({ position: 3, item: 'https://www.editalmap.com.br/licitacoes/sp' });
  });
});

const AGORA = new Date('2026-10-18T12:00:00Z');

describe('edital', () => {
  it('aberto: prazo no futuro e não revogado/anulado; suspensa continua aberta', () => {
    expect(editalAberto({ encerramento_em: '2026-10-20T12:00:00Z', situacao_id: 1 }, AGORA)).toBe(true);
    expect(editalAberto({ encerramento_em: '2026-10-20T12:00:00Z', situacao_id: 4 }, AGORA)).toBe(true);
    expect(editalAberto({ encerramento_em: '2026-10-20T12:00:00Z', situacao_id: 2 }, AGORA)).toBe(false);
    expect(editalAberto({ encerramento_em: '2026-10-20T12:00:00Z', situacao_id: 3 }, AGORA)).toBe(false);
    expect(editalAberto({ encerramento_em: '2026-10-17T12:00:00Z', situacao_id: 1 }, AGORA)).toBe(false);
    expect(editalAberto({ encerramento_em: null, situacao_id: 1 }, AGORA)).toBe(false);
  });

  const base = {
    orgao_nome: 'MUNICIPIO DE SALVADOR', municipio_nome: 'Salvador', uf: 'BA', modalidade_nome: 'Pregão - Eletrônico',
    encerramento_em: '2026-10-25T13:00:00Z', valor_estimado: 152300, objeto: 'Aquisição de luvas nitrílicas',
  } as unknown as Edital;

  it('descrição com órgão, cidade, modalidade, prazo e valor', () => {
    const d = descricaoDoEdital(base);
    expect(d).toContain('Salvador/BA');
    expect(d).toContain('25.10.2026');
    expect(d).toContain('R$');
    expect(d.length).toBeLessThanOrEqual(160);
  });
  it('sem valor: "Valor não informado"', () => {
    expect(descricaoDoEdital({ ...base, valor_estimado: 0 })).toContain('Valor não informado');
    expect(descricaoDoEdital({ ...base, valor_estimado: null })).toContain('Valor não informado');
  });
  it('corta em 160 com reticências', () => {
    const longo = { ...base, orgao_nome: 'SECRETARIA '.repeat(30) };
    const d = descricaoDoEdital(longo);
    expect(d.length).toBe(160);
    expect(d.endsWith('…')).toBe(true);
  });
});

it('temBusca: qualquer parâmetro conhecido da busca', () => {
  expect(temBusca({})).toBe(false);
  expect(temBusca({ q: 'luva' })).toBe(true);
  expect(temBusca({ uf: 'SP' })).toBe(true);
  expect(temBusca({ vista: 'mapa' })).toBe(true);
  expect(temBusca({ utm_source: 'google', gclid: 'x' })).toBe(false);
});

describe('vizinhos', () => {
  it('assunto no Brasil: as UFs com editais, em ordem alfabética do nome', () => {
    const v = vizinhos(EPI, { SP: 10, BA: 2 });
    expect(v.map((x) => x.caminho)).toEqual(['/licitacoes/epi/ba', '/licitacoes/epi/sp']);
    expect(v[0]).toMatchObject({ nome: 'Bahia', total: 2 });
  });
  it('assunto sem contagem (banco fora): as 27 UFs, sem total', () => {
    const v = vizinhos(EPI, null);
    expect(v).toHaveLength(27);
    expect(v[0].total).toBeNull();
  });
  it('UF: os assuntos e as modalidades naquela UF', () => {
    const v = vizinhos(SP, null);
    expect(v).toHaveLength(ASSUNTOS.length + MODALIDADES.length);
    expect(v[0].caminho).toBe('/licitacoes/epi/sp');
    expect(v.map((x) => x.caminho)).toContain('/licitacoes/pregao-eletronico/sp');
  });
  it('assunto na UF: o assunto no Brasil e a UF com tudo', () => {
    expect(vizinhos(EPI_BA, null).map((x) => x.caminho)).toEqual(['/licitacoes/epi', '/licitacoes/ba']);
  });
  it('Brasil: nenhum (o índice tem as próprias seções)', () => {
    expect(vizinhos(BR, null)).toEqual([]);
  });
});

describe('página de cidade', () => {
  const SBS = { assunto: null, uf: 'SC', cidade: { ibge: '4215802', nome: 'São Bento do Sul', slug: 'sao-bento-do-sul' } };
  it('caminho, título e descrição', () => {
    expect(caminhoDaPagina(SBS)).toBe('/licitacoes/sc/sao-bento-do-sul');
    expect(tituloDaPagina(SBS)).toBe('Licitações abertas em São Bento do Sul (SC)');
    expect(descricaoDaPagina(SBS, 25)).toMatch(/^25 editais abertos em São Bento do Sul \(SC\),/);
  });
  it('busca no mapa pelo município', () => {
    expect(buscaDaPagina(SBS)).toBe('/?uf=SC&municipio=4215802');
  });
  it('migalhas passam pela UF', () => {
    expect(migalhas(SBS)).toEqual([
      { nome: 'Início', caminho: '/' },
      { nome: 'Licitações', caminho: '/licitacoes' },
      { nome: 'Santa Catarina', caminho: '/licitacoes/sc' },
      { nome: 'São Bento do Sul', caminho: '/licitacoes/sc/sao-bento-do-sul' },
    ]);
  });
  it('vizinhos: tudo na UF e os assuntos na UF', () => {
    const v = vizinhos(SBS, null);
    expect(v[0]).toMatchObject({ caminho: '/licitacoes/sc' });
    expect(v).toHaveLength(ASSUNTOS.length + 1);
  });
});

describe('página de modalidade', () => {
  const pe = modalidadePorSlug('pregao-eletronico')!;
  const PE = { assunto: null, uf: null, modalidade: pe };
  const PE_SP = { assunto: null, uf: 'SP', modalidade: pe };
  it('caminho, título, descrição e busca no mapa', () => {
    expect(caminhoDaPagina(PE)).toBe('/licitacoes/pregao-eletronico');
    expect(caminhoDaPagina(PE_SP)).toBe('/licitacoes/pregao-eletronico/sp');
    expect(tituloDaPagina(PE_SP)).toBe('Pregão eletrônico: licitações abertas em São Paulo');
    expect(tituloDaPagina(PE)).toBe('Pregão eletrônico: licitações abertas no Brasil');
    expect(tituloSeoDaPagina(PE_SP)).toBe(tituloDaPagina(PE_SP));
    expect(descricaoDaPagina(PE_SP, 1234)).toMatch(/^1\.234 editais de pregão eletrônico abertos em São Paulo, direto do PNCP/);
    expect(introDaPagina(PE_SP, 3)).toContain('mostra primeiro os que encerram antes');
    expect(buscaDaPagina(PE_SP)).toBe('/?uf=SP&modalidades=6');
  });
  it('migalhas', () => {
    expect(migalhas(PE_SP).map((m) => m.nome)).toEqual(['Início', 'Licitações', 'Pregão eletrônico', 'São Paulo']);
    expect(migalhas(PE_SP)[2].caminho).toBe('/licitacoes/pregao-eletronico');
  });
  it('vizinhos: UFs com editais no Brasil; na UF, a modalidade no Brasil, tudo na UF e as outras modalidades', () => {
    expect(vizinhos(PE, { SP: 5, AC: 0 }).map((x) => x.caminho)).toEqual(['/licitacoes/pregao-eletronico/sp']);
    const v = vizinhos(PE_SP, null).map((x) => x.caminho);
    expect(v.slice(0, 2)).toEqual(['/licitacoes/pregao-eletronico', '/licitacoes/sp']);
    expect(v).toContain('/licitacoes/dispensa/sp');
    expect(v).not.toContain('/licitacoes/pregao-eletronico/sp');
    expect(v).toHaveLength(2 + MODALIDADES.length - 1);
  });
});

describe('página de órgão', () => {
  const USP = {
    assunto: null, uf: 'SP',
    orgao: { cnpj: '63025530000104', nome: 'Universidade de São Paulo', slug: 'universidade-de-sao-paulo-63025530000104', uf: 'SP', ibge: '3550308', cidadeNome: 'São Paulo', cidadeSlug: 'sao-paulo' },
  };
  it('caminho, título, descrição e busca no mapa', () => {
    expect(caminhoDaPagina(USP)).toBe('/licitacoes/orgao/universidade-de-sao-paulo-63025530000104');
    expect(tituloDaPagina(USP)).toBe('Licitações abertas: Universidade de São Paulo');
    expect(descricaoDaPagina(USP, 148)).toMatch(/^Universidade de São Paulo \(São Paulo\/SP\): 148 editais abertos, direto do PNCP/);
    expect(descricaoDaPagina(USP, 0)).toMatch(/^Universidade de São Paulo \(São Paulo\/SP\): nenhum edital aberto agora\./);
    expect(buscaDaPagina(USP)).toBe('/?orgao=63025530000104');
  });
  it('migalhas passam pela UF', () => {
    expect(migalhas(USP).map((m) => m.caminho)).toEqual(['/', '/licitacoes', '/licitacoes/sp', '/licitacoes/orgao/universidade-de-sao-paulo-63025530000104']);
  });
  it('vizinhos: a cidade, a UF e os outros órgãos', () => {
    const outros = [{ nome: 'Unesp', caminho: '/licitacoes/orgao/unesp-1', total: 9 }];
    expect(vizinhos(USP, null, outros).map((x) => x.caminho)).toEqual(['/licitacoes/sp/sao-paulo', '/licitacoes/sp', '/licitacoes/orgao/unesp-1']);
  });
});

describe('título da cidade na aba', () => {
  it('cita a prefeitura e os órgãos; a descrição também', () => {
    const C = { assunto: null, uf: 'SP', cidade: { ibge: '3509502', nome: 'Campinas', slug: 'campinas' } };
    expect(tituloSeoDaPagina(C)).toBe('Licitações abertas em Campinas (SP) · Prefeitura e órgãos');
    expect(descricaoDaPagina(C, 40)).toContain('da Prefeitura de Campinas e de outros órgãos da cidade');
  });
});
