import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contratacaoParaLinha, type LinhaContratacao } from '../mapear';
import { validarContratacao } from '../pncp/esquemas';
import { compararCompra } from './comparar';

const DETALHE = JSON.parse(
  readFileSync(new URL('../__fixtures__/contratacao.json', import.meta.url), 'utf8'),
) as Record<string, unknown>;

function linhaDoBanco(extra: Partial<LinhaContratacao> = {}): LinhaContratacao {
  const r = validarContratacao(DETALHE);
  if (!r.ok) throw new Error(r.motivo);
  // Como o PostgREST devolve timestamptz.
  return {
    ...contratacaoParaLinha(r.valor),
    encerramento_em: '2026-10-26T11:59:00+00:00',
    atualizada_pncp_em: '2026-10-13T10:22:24+00:00',
    ...extra,
  };
}

describe('compararCompra', () => {
  it('igual ao PNCP é ok, mesmo com formato de data diferente', () => {
    expect(compararCompra(linhaDoBanco(), DETALHE, 31, 31)).toEqual({
      id: '00394452000103-1-021982/2026',
      status: 'ok',
      diferencas: [],
    });
  });
  it('valor diferente é divergência', () => {
    const r = compararCompra(linhaDoBanco({ valor_estimado: 1 }), DETALHE, 31, 31);
    expect(r.status).toBe('divergente');
    expect(r.diferencas).toEqual([{ campo: 'valor_estimado', banco: '1', pncp: '419537.29' }]);
  });
  it('quantidade de itens diferente é divergência', () => {
    const r = compararCompra(linhaDoBanco(), DETALHE, 10, 31);
    expect(r.diferencas).toEqual([{ campo: 'qtd_itens', banco: '10', pncp: '31' }]);
  });
  it('PNCP mais novo que o banco, com mudança posterior à última rodada, é desatualizada', () => {
    const r = compararCompra(
      linhaDoBanco({ valor_estimado: 1, atualizada_pncp_em: '2026-10-13T09:00:00+00:00' }),
      DETALHE,
      31,
      31,
      '2026-10-13T08:00:00Z',
    );
    expect(r.status).toBe('desatualizada');
  });
  it('PNCP mais novo que o banco, com mudança anterior à última rodada, é divergente (sync perdeu)', () => {
    const r = compararCompra(
      linhaDoBanco({ atualizada_pncp_em: '2026-10-13T09:00:00+00:00' }),
      DETALHE,
      31,
      31,
      '2026-10-13T12:30:00Z',
    );
    expect(r.status).toBe('divergente');
    expect(r.observacao).toBe('O sync perdeu esta atualização do PNCP');
    expect(r.diferencas).toContainEqual({
      campo: 'atualizada_pncp_em',
      banco: '2026-10-13T09:00:00.000Z',
      pncp: '2026-10-13T10:22:24.000Z',
    });
  });
  it('PNCP mais novo que o banco, sem última execução, é divergente', () => {
    const r = compararCompra(linhaDoBanco({ atualizada_pncp_em: '2026-10-13T09:00:00+00:00' }), DETALHE, 31, 31);
    expect(r.status).toBe('divergente');
  });
  it('detalhe inválido é erro', () => {
    expect(compararCompra(linhaDoBanco(), { lixo: true }, 1, 1).status).toBe('erro');
  });
});
