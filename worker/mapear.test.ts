import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chaveDaLinha, contratacaoParaLinha, estaAberta, itemParaLinha, linkDoPortal } from './mapear';
import { validarContratacao, validarItem, type ContratacaoPncp, type ItemPncp } from './pncp/esquemas';

const ler = (nome: string) =>
  JSON.parse(readFileSync(new URL(`./__fixtures__/${nome}`, import.meta.url), 'utf8')) as Record<string, unknown>;
const CONTRATACAO = ler('contratacao.json');
const ITEM = ler('item.json');

function contratacao(extra: Record<string, unknown> = {}): ContratacaoPncp {
  const r = validarContratacao({ ...CONTRATACAO, ...extra });
  if (!r.ok) throw new Error(r.motivo);
  return r.valor;
}
function item(extra: Record<string, unknown> = {}): ItemPncp {
  const r = validarItem({ ...ITEM, ...extra }, 'X');
  if (!r.ok) throw new Error(r.motivo);
  return r.valor;
}

describe('contratacaoParaLinha', () => {
  it('mapeia o registro real', () => {
    expect(contratacaoParaLinha(contratacao())).toEqual({
      id: '00394452000103-1-021982/2026',
      cnpj: '00394452000103',
      ano: 2026,
      sequencial: 21982,
      objeto: 'Aquisição de materiais de escalada e para reestruturação da Pista de Cordas do 23º Batalhão de Infantaria',
      info_complementar: null,
      orgao_nome: 'COMANDO DO EXERCITO',
      unidade_nome: '23 BATALHAO DE INFANTARIA - SC',
      esfera: 'F',
      codigo_ibge: '4202404',
      uf: 'SC',
      municipio_nome: 'Blumenau',
      modalidade_id: 6,
      modalidade_nome: 'Pregão - Eletrônico',
      situacao_id: 1,
      situacao_nome: 'Divulgada no PNCP',
      srp: true,
      valor_estimado: 419537.29,
      valor_homologado: null,
      publicada_em: '2026-10-13T10:00:09.000Z',
      abertura_em: '2026-10-13T12:45:00.000Z',
      encerramento_em: '2026-10-26T11:59:00.000Z',
      link_origem:
        'https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/public/compras/acompanhamento-compra?compra=16044005000542026',
      atualizada_pncp_em: '2026-10-13T10:22:24.000Z',
    });
  });
  it('link vazio vira null', () => {
    expect(contratacaoParaLinha(contratacao({ linkSistemaOrigem: '' })).link_origem).toBeNull();
  });
  it('valor 0 continua 0', () => {
    expect(contratacaoParaLinha(contratacao({ valorTotalEstimado: 0 })).valor_estimado).toBe(0);
  });
  it('sem dataAtualizacaoGlobal usa dataAtualizacao', () => {
    expect(contratacaoParaLinha(contratacao({ dataAtualizacaoGlobal: null })).atualizada_pncp_em).toBe(
      '2026-10-13T10:00:09.000Z',
    );
  });
  it('data de atualização em branco cai para dataAtualizacao', () => {
    expect(contratacaoParaLinha(contratacao({ dataAtualizacaoGlobal: '  ' })).atualizada_pncp_em).toBe(
      '2026-10-13T10:00:09.000Z',
    );
  });
  it('codigoIbge numérico vira texto', () => {
    const linha = contratacaoParaLinha(contratacao({ unidadeOrgao: { ufSigla: 'sc', codigoIbge: 4202404 } }));
    expect(linha.codigo_ibge).toBe('4202404');
    expect(linha.uf).toBe('SC');
  });
});

describe('itemParaLinha', () => {
  it('mapeia o item real', () => {
    expect(itemParaLinha(item(), 'C1')).toEqual({
      contratacao_id: 'C1',
      numero: 1,
      descricao: 'Corda material: polietileno, tipo: trançada, diâmetro: 40, aplicação: uso geral',
      quantidade: 200,
      unidade: 'Metro',
      valor_unitario_estimado: 44.08,
      valor_total_estimado: 8816,
      material_ou_servico: 'M',
      sigiloso: false,
      tem_resultado: false,
    });
  });
  it('item com orçamento sigiloso', () => {
    const linha = itemParaLinha(item({ orcamentoSigiloso: true, valorUnitarioEstimado: null }), 'C1');
    expect(linha.sigiloso).toBe(true);
    expect(linha.valor_unitario_estimado).toBeNull();
  });
});

describe('auxiliares', () => {
  const linha = contratacaoParaLinha(contratacao());
  it('estaAberta compara o prazo com agora', () => {
    expect(estaAberta(linha, new Date('2026-10-26T11:58:00Z'))).toBe(true);
    expect(estaAberta(linha, new Date('2026-10-26T11:59:00Z'))).toBe(false);
    expect(estaAberta({ encerramento_em: null }, new Date())).toBe(false);
  });
  it('chaveDaLinha e linkDoPortal', () => {
    const chave = chaveDaLinha(linha);
    expect(chave).toEqual({ id: linha.id, cnpj: '00394452000103', ano: 2026, sequencial: 21982 });
    expect(linkDoPortal(chave)).toBe('https://pncp.gov.br/app/editais/00394452000103/2026/21982');
  });
});
