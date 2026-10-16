import { describe, expect, it } from 'vitest';
import { criterioTexto, esferaNome, modalidadeCurta, oQueCompram, sistemaDaDisputa, textoMeEpp } from './participacao';
import type { ResumoItens } from './tipos';

const resumo = (r: Partial<ResumoItens>): ResumoItens => ({
  total: 0, materiais: 0, servicos: 0, comBeneficio: 0, exclusivos: 0, cota: 0, criterios: [], ...r,
});

describe('sistemaDaDisputa', () => {
  it.each([
    ['https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/public/compras/acompanhamento-compra?compra=1', 'Compras.gov.br'],
    ['https://www.gov.br/compras/pt-br', 'Compras.gov.br'],
    ['https://www.portaldecompraspublicas.com.br/processos/sc/123', 'Portal de Compras Públicas'],
    ['https://bllcompras.com/Process/ProcessView?param1=x', 'BLL Compras'],
    ['https://bnccompras.com/Process/ProcessView', 'BNC Compras'],
    ['https://pregaobanrisul.com.br/x', 'Pregão Banrisul'],
    ['https://licitacoes-e2.bb.com.br/aop-inter-estatico/', 'Licitações-e (Banco do Brasil)'],
    ['https://comprasbr.com.br/pregao', 'ComprasBR'],
    ['https://compras.rs.gov.br/x', 'Compras RS'],
    ['https://portal.tce.rs.gov.br/x', 'Portal do TCE-RS'],
    ['https://portal.licitanet.com.br/x', 'Licitanet'],
    ['https://app2.licitardigital.com.br/x', 'Licitar Digital'],
    ['https://licitamaisbrasil.com.br/x', 'Licita Mais Brasil'],
    ['https://www.antonioprado.rs.gov.br/licitacoes', 'antonioprado.rs.gov.br'],
  ])('%s → %s', (link, nome) => {
    expect(sistemaDaDisputa(link)).toBe(nome);
  });
  it('sem link ou link que não é http(s)', () => {
    expect(sistemaDaDisputa(null)).toBe('Sistema indicado no edital');
    expect(sistemaDaDisputa('javascript:alert(1)')).toBe('Sistema indicado no edital');
  });
});

describe('esfera e modalidade', () => {
  it('esfera por código', () => {
    expect(esferaNome('F')).toBe('Federal');
    expect(esferaNome('E')).toBe('Estadual');
    expect(esferaNome('M')).toBe('Municipal');
    expect(esferaNome('D')).toBe('Distrital');
    expect(esferaNome('N')).toBeNull();
    expect(esferaNome(null)).toBeNull();
  });
  it('modalidade sem o hífen do PNCP', () => {
    expect(modalidadeCurta('Pregão - Eletrônico')).toBe('Pregão eletrônico');
    expect(modalidadeCurta('Concorrência - Eletrônica')).toBe('Concorrência eletrônica');
    expect(modalidadeCurta('Dispensa')).toBe('Dispensa');
    expect(modalidadeCurta(null)).toBeNull();
  });
});

describe('textos dos itens', () => {
  it('o que compram', () => {
    expect(oQueCompram(resumo({ total: 25, materiais: 25 }))).toBe('25 itens · materiais');
    expect(oQueCompram(resumo({ total: 1, servicos: 1 }))).toBe('1 item · serviços');
    expect(oQueCompram(resumo({ total: 3, materiais: 2, servicos: 1 }))).toBe('3 itens · materiais e serviços');
    expect(oQueCompram(resumo({ total: 2 }))).toBe('2 itens');
  });
  it('o que compram, sem itens no PNCP', () => {
    expect(oQueCompram(resumo({ total: 0 }))).toBe('Itens não informados');
  });
  it('ME/EPP', () => {
    expect(textoMeEpp(resumo({ total: 25, comBeneficio: 0 }))).toBeNull();
    expect(textoMeEpp(resumo({ total: 25, comBeneficio: 25, exclusivos: 25 }))).toBe('Exclusivo para ME/EPP em todos os 25 itens');
    expect(textoMeEpp(resumo({ total: 1, comBeneficio: 1, exclusivos: 1 }))).toBe('Exclusivo para ME/EPP');
    expect(textoMeEpp(resumo({ total: 25, comBeneficio: 25, exclusivos: 18, cota: 2 }))).toBe(
      'Exclusivo para ME/EPP em 18 de 25 itens · Cota reservada em 2 itens',
    );
    expect(textoMeEpp(resumo({ total: 4, comBeneficio: 4 }))).toBe('Sem exclusividade nem cota para ME/EPP');
  });
  it('critério de julgamento', () => {
    expect(criterioTexto([])).toBeNull();
    expect(criterioTexto(['Menor preço'])).toBe('menor preço');
    expect(criterioTexto(['Menor preço', 'Maior desconto'])).toBe('critérios variados');
  });
});
