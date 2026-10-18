import { describe, expect, it } from 'vitest';
import {
  contarPorStatus, idsDescartados, lerIdContratacao, lerNavegacaoSalvos, MENSAGENS_SALVOS, precisaConfirmar, ROTULO_FILTRO, ROTULO_STATUS,
  salvoDaLinha, salvosDaAba, situacaoOficial, urlDosSalvos, validarMudanca, validarRemocao, validarSalvar, type SalvoDaConta,
} from './salvos';

const ID = '00394452000103-1-021982/2026';

describe('validação', () => {
  it('id do PNCP', () => {
    expect(lerIdContratacao(ID)).toBe(ID);
    for (const v of ['', 'x', '00394452000103-1-021982', '00394452000103-1-021982/26', `${ID} `, 42, null]) expect(lerIdContratacao(v)).toBeNull();
  });
  it('id com CNPJ alfanumérico (12 primeiros podem ser letras maiúsculas; dígitos verificadores numéricos)', () => {
    expect(lerIdContratacao('12ABC34501DE35-1-000123/2026')).toBe('12ABC34501DE35-1-000123/2026');
    for (const v of ['12abc34501de35-1-000123/2026', '12ABC34501DEAB-1-000123/2026', '12ABC34501DE3-1-000123/2026']) expect(lerIdContratacao(v)).toBeNull();
  });
  it('salvar: status padrão "salvo"; user_id do corpo não passa', () => {
    expect(validarSalvar({ id: ID })).toEqual({ ok: true, valor: { id: ID, status: 'salvo' } });
    expect(validarSalvar({ id: ID, status: 'descartado', user_id: 'outra' })).toEqual({ ok: true, valor: { id: ID, status: 'descartado' } });
    expect(validarSalvar({ id: ID, status: 'arquivado' })).toEqual({ ok: false, erro: MENSAGENS_SALVOS.status });
    expect(validarSalvar({ id: 'x' })).toEqual({ ok: false, erro: MENSAGENS_SALVOS.formulario });
    expect(validarSalvar(null)).toEqual({ ok: false, erro: MENSAGENS_SALVOS.formulario });
  });
  it('mudança: status e/ou observação (aparada; vazia = nula; até 500)', () => {
    expect(validarMudanca({ id: ID, status: 'analise' })).toEqual({ ok: true, valor: { id: ID, status: 'analise' } });
    expect(validarMudanca({ id: ID, observacao: '  ligar na segunda  ' })).toEqual({ ok: true, valor: { id: ID, observacao: 'ligar na segunda' } });
    expect(validarMudanca({ id: ID, observacao: '   ' })).toEqual({ ok: true, valor: { id: ID, observacao: null } });
    expect(validarMudanca({ id: ID, observacao: null })).toEqual({ ok: true, valor: { id: ID, observacao: null } });
    expect(validarMudanca({ id: ID, observacao: 'a'.repeat(501) })).toEqual({ ok: false, erro: MENSAGENS_SALVOS.observacao });
    expect(validarMudanca({ id: ID, observacao: 5 })).toEqual({ ok: false, erro: MENSAGENS_SALVOS.formulario });
    expect(validarMudanca({ id: ID })).toEqual({ ok: false, erro: MENSAGENS_SALVOS.formulario });
    expect(validarMudanca({ id: ID, status: 'x' })).toEqual({ ok: false, erro: MENSAGENS_SALVOS.status });
  });
  it('remoção', () => {
    expect(validarRemocao({ id: ID })).toEqual({ ok: true, valor: { id: ID } });
    expect(validarRemocao({})).toEqual({ ok: false, erro: MENSAGENS_SALVOS.formulario });
  });
});

describe('rótulos e contagens', () => {
  it('textos dos status e das abas', () => {
    expect(ROTULO_STATUS).toEqual({ salvo: 'Salvo', analise: 'Em análise', participar: 'Vou participar', descartado: 'Descartado' });
    expect(ROTULO_FILTRO.todos).toBe('Todos');
  });
  it('"Todos" não conta os descartados', () => {
    expect(contarPorStatus(['salvo', 'analise', 'analise', 'descartado', 'participar'])).toEqual({ todos: 4, salvo: 1, analise: 2, participar: 1, descartado: 1 });
  });
  it('descartados do mapa, em ordem', () => {
    expect(idsDescartados({ b: { status: 'descartado', nota: false }, a: { status: 'descartado', nota: true }, c: { status: 'salvo', nota: false } })).toEqual(['a', 'b']);
  });
  it('remover pede confirmação com status ou observação', () => {
    expect(precisaConfirmar({ status: 'salvo', nota: false })).toBe(false);
    expect(precisaConfirmar({ status: 'salvo', nota: true })).toBe(true);
    expect(precisaConfirmar({ status: 'analise', nota: false })).toBe(true);
  });
});

const LINHA = {
  contratacao_id: ID, status: 'analise', observacao: 'ver amostra', criado_em: '2026-10-18T10:00:00+00:00', atualizado_em: '2026-10-18T11:00:00+00:00',
  slug: '00394452000103-2026-21982', objeto: 'Aquisição de luvas', orgao_nome: 'PREFEITURA DE JOINVILLE', municipio_nome: 'Joinville', uf: 'SC',
  valor_estimado: '1234.50', encerramento_em: '2026-10-25T13:00:00+00:00', situacao_id: 1,
};

describe('linhas e abas', () => {
  it('linha → salvo (numeric como texto vira número)', () => {
    expect(salvoDaLinha(LINHA)).toEqual({
      id: ID, status: 'analise', observacao: 'ver amostra', salvoEm: '2026-10-18T10:00:00+00:00', atualizadoEm: '2026-10-18T11:00:00+00:00',
      edital: { slug: '00394452000103-2026-21982', objeto: 'Aquisição de luvas', orgao_nome: 'PREFEITURA DE JOINVILLE', municipio_nome: 'Joinville', uf: 'SC', valor_estimado: 1234.5, encerramento_em: '2026-10-25T13:00:00+00:00', situacao_id: 1 },
    });
  });
  it('contratação que não existe mais: edital nulo', () => {
    expect(salvoDaLinha({ ...LINHA, slug: null, objeto: null }).edital).toBeNull();
  });
  it('navegação pelo endereço', () => {
    expect(lerNavegacaoSalvos(new URLSearchParams(''))).toEqual({ status: 'todos', ordem: 'prazo' });
    expect(lerNavegacaoSalvos(new URLSearchParams('status=analise&ordem=salvo'))).toEqual({ status: 'analise', ordem: 'salvo' });
    expect(lerNavegacaoSalvos(new URLSearchParams('status=x&ordem=y'))).toEqual({ status: 'todos', ordem: 'prazo' });
    expect(urlDosSalvos({ status: 'todos', ordem: 'prazo' })).toBe('/oportunidades');
    expect(urlDosSalvos({ status: 'descartado', ordem: 'salvo' })).toBe('/oportunidades?status=descartado&ordem=salvo');
  });
  it('aba e ordem: prazo (sem prazo no fim) ou data de salvamento (mais recente primeiro)', () => {
    const s = (id: string, status: SalvoDaConta['status'], salvoEm: string, prazo: string | null): SalvoDaConta => ({
      id, status, observacao: null, salvoEm, atualizadoEm: salvoEm,
      edital: prazo === null ? null : { slug: id, objeto: 'x', orgao_nome: 'o', municipio_nome: null, uf: 'SC', valor_estimado: null, encerramento_em: prazo, situacao_id: 1 },
    });
    const lista = [
      s('a', 'salvo', '2026-10-10T00:00:00Z', '2026-10-30T00:00:00Z'),
      s('b', 'analise', '2026-10-12T00:00:00Z', '2026-10-20T00:00:00Z'),
      s('c', 'descartado', '2026-10-13T00:00:00Z', '2026-10-19T00:00:00Z'),
      s('d', 'salvo', '2026-10-11T00:00:00Z', null),
    ];
    expect(salvosDaAba(lista, { status: 'todos', ordem: 'prazo' }).map((x) => x.id)).toEqual(['b', 'a', 'd']);
    expect(salvosDaAba(lista, { status: 'todos', ordem: 'salvo' }).map((x) => x.id)).toEqual(['b', 'd', 'a']);
    expect(salvosDaAba(lista, { status: 'descartado', ordem: 'prazo' }).map((x) => x.id)).toEqual(['c']);
  });
  it('situação oficial não depende do status pessoal', () => {
    const agora = new Date('2026-10-20T12:00:00Z');
    const e = salvoDaLinha(LINHA).edital!;
    expect(situacaoOficial(e, agora)).toBeNull();
    expect(situacaoOficial({ ...e, situacao_id: 4 }, agora)).toBe('Suspensa');
    expect(situacaoOficial({ ...e, situacao_id: 2 }, agora)).toBe('Revogada');
    expect(situacaoOficial({ ...e, situacao_id: 3 }, agora)).toBe('Anulada');
    expect(situacaoOficial({ ...e, encerramento_em: '2026-10-19T00:00:00Z' }, agora)).toBe('Encerrada');
    expect(situacaoOficial(null, agora)).toBe('Indisponível');
  });
});
