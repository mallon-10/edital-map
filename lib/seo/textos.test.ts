import { describe, expect, it } from 'vitest';
import type { Edital } from '../tipos';
import { assuntoPorSlug } from './assuntos';
import {
  buscaDaPagina, caminhoDaPagina, descricaoDaPagina, descricaoDoEdital, editalAberto, introDaPagina, jsonLdMigalhas, migalhas,
  temBusca, tituloDaPagina, vizinhos,
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
  it('UF: os 15 assuntos naquela UF', () => {
    const v = vizinhos(SP, null);
    expect(v).toHaveLength(15);
    expect(v[0].caminho).toBe('/licitacoes/epi/sp');
  });
  it('assunto na UF: o assunto no Brasil e a UF com tudo', () => {
    expect(vizinhos(EPI_BA, null).map((x) => x.caminho)).toEqual(['/licitacoes/epi', '/licitacoes/ba']);
  });
  it('Brasil: os 15 assuntos e as 27 UFs', () => {
    expect(vizinhos(BR, null)).toHaveLength(42);
  });
});
