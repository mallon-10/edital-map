import { describe, expect, it } from 'vitest';
import { contratacaoParaLinha } from './mapear';
import { validarContratacao } from './pncp/esquemas';
import { relerItensAbertos } from './reler';
import { BancoFalso, clienteFalso, contratacaoBruta, idDe, itemBruto, montarDeps } from './testes/fakes';

function linha(sequencial: number, encerramento?: string) {
  const v = validarContratacao(contratacaoBruta({ sequencial, encerramento }));
  if (!v.ok) throw new Error(v.motivo);
  return contratacaoParaLinha(v.valor);
}

describe('relerItensAbertos', () => {
  it('relê os itens de todas as compras abertas, em páginas e lotes, e ignora as encerradas', async () => {
    const banco = new BancoFalso();
    await banco.upsertContratacoes([linha(1), linha(2), linha(3), linha(4), linha(5), linha(9, '2026-10-01T10:00:00')]);
    const cliente = clienteFalso({
      itens: () => [itemBruto(1, { tipoBeneficio: 1, tipoBeneficioNome: 'Participação exclusiva para ME/EPP', criterioJulgamentoNome: 'Menor preço' })],
    });
    const r = await relerItensAbertos(montarDeps(banco, cliente), { pagina: 2, lote: 2 });
    expect(r).toEqual({ compras: 5, comItens: 5, falhas: 0 });
    expect([...cliente.itensPedidos].sort()).toEqual([idDe(1), idDe(2), idDe(3), idDe(4), idDe(5)]);
    expect(banco.resumos.get(idDe(3))?.resumo).toMatchObject({ exclusivos: 1, criterios: ['Menor preço'] });
  });

  it('conta como falha a compra cujos itens não vieram', async () => {
    const banco = new BancoFalso();
    await banco.upsertContratacoes([linha(1), linha(2)]);
    const cliente = clienteFalso({
      itens: (compra) => {
        if (compra.id === idDe(2)) throw new Error('HTTP 500');
        return [itemBruto(1)];
      },
    });
    expect(await relerItensAbertos(montarDeps(banco, cliente))).toEqual({ compras: 2, comItens: 1, falhas: 1 });
  });
});
