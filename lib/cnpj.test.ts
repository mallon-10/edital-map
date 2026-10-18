import { describe, expect, it } from 'vitest';
import { assuntosDaEmpresa, assuntosDosCnaes, buscaDoCnpj, lerBrasilApi, normalizarCnpj } from './cnpj';

const slugs = (cnaes: number[]) => assuntosDosCnaes(cnaes).map((a) => a.slug);

describe('normalizarCnpj', () => {
  it('aceita com ou sem pontuação e confere o dígito', () => {
    expect(normalizarCnpj('11.222.333/0001-81')).toBe('11222333000181');
    expect(normalizarCnpj('11222333000181')).toBe('11222333000181');
    expect(normalizarCnpj('11.222.333/0001-80')).toBeNull();
    expect(normalizarCnpj('123')).toBeNull();
  });
});

describe('assuntosDosCnaes', () => {
  it('EPI e uniformes', () => {
    expect(slugs([3292202])).toEqual(['epi']);
    expect(slugs([4642702])).toEqual(['epi', 'uniformes']);
    expect(slugs([1413401])).toEqual(['uniformes']);
  });
  it('vários segmentos, sem repetir, na ordem dos assuntos', () => {
    expect(slugs([4649408, 4744099, 4649408])).toEqual(['limpeza', 'construcao']);
    expect(slugs([6201501, 4751201])).toEqual(['informatica']);
    expect(slugs([4644301, 8630503])).toEqual(['hospitalar', 'servicos-de-saude']);
    expect(slugs([4120400, 4321500])).toEqual(['obras', 'manutencao-predial']);
    expect(slugs([4731800])).toEqual(['combustiveis']);
    expect(slugs([5620101])).toEqual(['alimentos']);
    expect(slugs([3101200])).toEqual(['moveis']);
    expect(slugs([4761003])).toEqual(['escritorio']);
    expect(slugs([4530703])).toEqual(['veiculos']);
  });
  it('publicidade, promoção de vendas, eventos e gráfica', () => {
    expect(slugs([7319002])).toEqual(['publicidade']);
    expect(slugs([7311400, 8230001, 1813001])).toEqual(['publicidade']);
  });
  it('atividade sem assunto: vazio', () => {
    expect(slugs([6920601])).toEqual([]);
    expect(slugs([])).toEqual([]);
  });
});

describe('lerBrasilApi', () => {
  it('empresa com CNAE principal e secundários', () => {
    expect(
      lerBrasilApi({
        razao_social: 'FULANO UNIFORMES LTDA', nome_fantasia: 'Fulano', uf: 'SP', municipio: 'CAMPINAS',
        cnae_fiscal: 1413401, cnae_fiscal_descricao: 'Confecção de roupas profissionais', descricao_situacao_cadastral: 'ATIVA',
        cnaes_secundarios: [{ codigo: 4642702, descricao: 'x' }, { codigo: 0, descricao: '' }],
      }),
    ).toEqual({
      razao: 'FULANO UNIFORMES LTDA', fantasia: 'Fulano', uf: 'SP', municipio: 'CAMPINAS', ativa: true,
      atividade: 'Confecção de roupas profissionais', cnaes: [1413401, 4642702],
    });
  });
  it('resposta estranha: null', () => {
    expect(lerBrasilApi(null)).toBeNull();
    expect(lerBrasilApi({ message: 'CNPJ não encontrado' })).toBeNull();
  });
});

describe('buscaDoCnpj', () => {
  it('termos dos assuntos separados por vírgula e a UF', () => {
    expect(buscaDoCnpj(assuntosDosCnaes([4642702]), 'SP')).toBe('/?q=EPI%2C+uniforme&uf=SP');
  });
  it('sem assunto: só a UF', () => {
    expect(buscaDoCnpj([], 'BA')).toBe('/?uf=BA');
  });
});

describe('assuntosDaEmpresa', () => {
  it('a atividade principal vem marcada e primeiro; as secundárias, desmarcadas', () => {
    expect(assuntosDaEmpresa([4711302, 4751201, 4771701]).map((a) => [a.slug, a.principal])).toEqual([
      ['alimentos', true], ['informatica', false], ['hospitalar', false],
    ]);
  });
  it('principal fora do mapa: só as secundárias, desmarcadas', () => {
    expect(assuntosDaEmpresa([600001, 8630503]).map((a) => [a.slug, a.principal])).toEqual([['servicos-de-saude', false]]);
  });
});
