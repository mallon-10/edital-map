import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validarContratacao, validarItem } from './esquemas';

const ler = (nome: string) =>
  JSON.parse(readFileSync(new URL(`../__fixtures__/${nome}`, import.meta.url), 'utf8')) as Record<string, unknown>;
const CONTRATACAO = ler('contratacao.json');
const ITEM = ler('item.json');

describe('validarContratacao', () => {
  it('aceita um registro real', () => {
    expect(validarContratacao(CONTRATACAO).ok).toBe(true);
  });
  it('marca registro sem número de controle sem lançar erro', () => {
    const { numeroControlePNCP, ...semId } = CONTRATACAO;
    const r = validarContratacao(semId);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.id).toBe('(sem numeroControlePNCP)');
  });
  it('exige alguma data de atualização', () => {
    const r = validarContratacao({ ...CONTRATACAO, dataAtualizacaoGlobal: null, dataAtualizacao: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toContain('sem dataAtualizacaoGlobal');
  });
  it('rejeita data de atualização em branco', () => {
    const r = validarContratacao({ ...CONTRATACAO, dataAtualizacaoGlobal: '   ', dataAtualizacao: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toContain('sem dataAtualizacaoGlobal');
  });
  it('aceita codigoIbge numérico', () => {
    const r = validarContratacao({ ...CONTRATACAO, unidadeOrgao: { ufSigla: 'SC', codigoIbge: 4202404 } });
    expect(r.ok).toBe(true);
  });
});

describe('validarItem', () => {
  it('aceita um item real', () => {
    expect(validarItem(ITEM, 'X').ok).toBe(true);
  });
  it('identifica o item inválido pela compra e pelo número', () => {
    const r = validarItem({ ...ITEM, numeroItem: 3, descricao: undefined }, 'X');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.id).toBe('X#3');
  });
});
