import { describe, expect, it } from 'vitest';
import { contratacaoParaLinha } from './mapear';
import { validarContratacao } from './pncp/esquemas';
import { Resumo } from './resumo';
import {
  executarSync,
  gravarPagina,
  inicioDaJanela,
  mudou,
  processarRegistros,
  sincronizarChave,
  sincronizarItens,
} from './sincronizar';
import { AGORA, BancoFalso, clienteFalso, contratacaoBruta, idDe, itemBruto, montarDeps } from './testes/fakes';

function linha(opcoes: Parameters<typeof contratacaoBruta>[0] = {}) {
  const r = validarContratacao(contratacaoBruta(opcoes));
  if (!r.ok) throw new Error(r.motivo);
  return contratacaoParaLinha(r.valor);
}

describe('processarRegistros', () => {
  it('separa válidos de inválidos e conta', () => {
    const resumo = new Resumo('t');
    const linhas = processarRegistros([contratacaoBruta({ sequencial: 1 }), { lixo: true }], resumo);
    expect(linhas.map((l) => l.id)).toEqual([idDe(1)]);
    expect(resumo.validos).toBe(1);
    expect(resumo.invalidos).toHaveLength(1);
  });
  it('remove repetidos da mesma página, ficando com o último', () => {
    const resumo = new Resumo('t');
    const linhas = processarRegistros(
      [
        contratacaoBruta({ sequencial: 1, atualizacao: '2026-10-13T07:00:00' }),
        contratacaoBruta({ sequencial: 1, atualizacao: '2026-10-13T09:00:00' }),
      ],
      resumo,
    );
    expect(linhas).toHaveLength(1);
    expect(linhas[0].atualizada_pncp_em).toBe('2026-10-13T12:00:00.000Z');
  });
});

describe('mudou', () => {
  const l = linha({ atualizacao: '2026-10-13T07:22:24' });
  it('compra desconhecida conta como mudança', () => {
    expect(mudou(l, new Map())).toBe(true);
  });
  it('mesma data em formatos diferentes não é mudança', () => {
    expect(mudou(l, new Map([[l.id, '2026-10-13T10:22:24+00:00']]))).toBe(false);
  });
  it('data mais nova é mudança', () => {
    expect(mudou(l, new Map([[l.id, '2026-10-13T09:00:00+00:00']]))).toBe(true);
  });
});

describe('gravarPagina', () => {
  it('busca itens só das abertas novas ou alteradas', async () => {
    const banco = new BancoFalso();
    const cliente = clienteFalso();
    const deps = montarDeps(banco, cliente);
    await banco.upsertContratacoes([
      linha({ sequencial: 3, atualizacao: '2026-10-13T07:22:24' }),
      linha({ sequencial: 4, atualizacao: '2026-10-12T07:00:00' }),
    ]);
    await gravarPagina(
      [
        linha({ sequencial: 1 }), // aberta e nova
        linha({ sequencial: 2, encerramento: '2026-10-01T10:00:00' }), // encerrada
        linha({ sequencial: 3, atualizacao: '2026-10-13T07:22:24' }), // aberta, sem mudança
        linha({ sequencial: 4, atualizacao: '2026-10-13T07:22:24' }), // aberta, alterada
      ],
      deps,
    );
    expect(cliente.itensPedidos.sort()).toEqual([idDe(1), idDe(4)].sort());
    expect(banco.contratacoes.size).toBe(4);
    expect(deps.resumo.contratacoesGravadas).toBe(4);
  });
});

describe('gravarPagina · ordem de gravação', () => {
  const ANTIGA = '2026-10-12T07:00:00';
  it('itens falham numa compra alterada: fica com o timestamp antigo e a próxima rodada pede os itens de novo', async () => {
    const banco = new BancoFalso();
    const antiga = linha({ sequencial: 4, atualizacao: ANTIGA });
    await banco.upsertContratacoes([antiga]);
    let falhar = true;
    const cliente = clienteFalso({
      itens: () => {
        if (falhar) throw new Error('HTTP 503');
        return [itemBruto(1)];
      },
    });
    const deps = montarDeps(banco, cliente);
    const nova = linha({ sequencial: 4, atualizacao: '2026-10-13T07:22:24' });
    await gravarPagina([nova], deps);
    expect(banco.contratacoes.get(idDe(4))?.atualizada_pncp_em).toBe(antiga.atualizada_pncp_em);
    expect(deps.resumo.contratacoesGravadas).toBe(1);
    falhar = false;
    await gravarPagina([nova], deps);
    expect(cliente.itensPedidos).toEqual([idDe(4), idDe(4)]);
    expect(banco.contratacoes.get(idDe(4))?.atualizada_pncp_em).toBe(nova.atualizada_pncp_em);
    expect(banco.itensDe(idDe(4))).toHaveLength(1);
    expect(deps.resumo.contratacoesGravadas).toBe(2);
  });
  it('compra nova cujos itens falham fica com o timestamp provisório de 1970', async () => {
    const banco = new BancoFalso();
    const cliente = clienteFalso({
      itens: () => {
        throw new Error('HTTP 503');
      },
    });
    await gravarPagina([linha({ sequencial: 1 })], montarDeps(banco, cliente));
    expect(banco.contratacoes.get(idDe(1))?.atualizada_pncp_em).toBe('1970-01-01T00:00:00.000Z');
  });
  it('caminho feliz: grava o timestamp real e os itens', async () => {
    const banco = new BancoFalso();
    const l = linha({ sequencial: 1 });
    const deps = montarDeps(banco, clienteFalso());
    await gravarPagina([l], deps);
    expect(banco.contratacoes.get(idDe(1))?.atualizada_pncp_em).toBe(l.atualizada_pncp_em);
    expect(banco.itensDe(idDe(1))).toHaveLength(1);
    expect(deps.resumo.contratacoesGravadas).toBe(1);
  });
});

describe('sincronizarItens', () => {
  it('grava itens e remove os que sumiram', async () => {
    const banco = new BancoFalso();
    const deps = montarDeps(banco, clienteFalso({ itens: () => [itemBruto(1), itemBruto(2)] }));
    await banco.upsertItens([{ ...(await itemLinha(9)) }]);
    await sincronizarItens([{ id: 'C1', cnpj: '1', ano: 2026, sequencial: 1 }], deps);
    expect(banco.itensDe('C1').map((i) => i.numero).sort()).toEqual([1, 2]);
    expect(banco.remocoes).toEqual([{ contratacaoId: 'C1', numeros: [1, 2] }]);
    expect(deps.resumo.itensGravados).toBe(2);
  });
  it('com item inválido, grava os válidos e não remove nada', async () => {
    const banco = new BancoFalso();
    const deps = montarDeps(banco, clienteFalso({ itens: () => [itemBruto(1), { numeroItem: 2 }] }));
    await sincronizarItens([{ id: 'C1', cnpj: '1', ano: 2026, sequencial: 1 }], deps);
    expect(banco.itensDe('C1')).toHaveLength(1);
    expect(banco.remocoes).toEqual([]);
    expect(deps.resumo.avisos[0].chave).toBe('item:C1#2');
  });
  it('lista vazia não remove os itens antigos, gera aviso e conta como sucesso', async () => {
    const banco = new BancoFalso();
    const deps = montarDeps(banco, clienteFalso({ itens: () => [] }));
    await banco.upsertItens([{ ...(await itemLinha(9)) }]);
    const gravadas = await sincronizarItens([{ id: 'C1', cnpj: '1', ano: 2026, sequencial: 1 }], deps);
    expect(banco.itensDe('C1').map((i) => i.numero)).toEqual([9]);
    expect(banco.remocoes).toEqual([]);
    expect(deps.resumo.avisos).toEqual([{ chave: 'itens:C1', mensagem: 'lista de itens vazia; itens antigos mantidos' }]);
    expect(gravadas.has('C1')).toBe(true);
  });
  it('falha ao listar itens vira aviso, sem derrubar a rodada', async () => {
    const banco = new BancoFalso();
    const deps = montarDeps(
      banco,
      clienteFalso({
        itens: () => {
          throw new Error('HTTP 503');
        },
      }),
    );
    await sincronizarItens([{ id: 'C1', cnpj: '1', ano: 2026, sequencial: 1 }], deps);
    expect(deps.resumo.avisos).toEqual([{ chave: 'itens:C1', mensagem: 'HTTP 503' }]);
    expect(deps.resumo.erros).toEqual([]);
  });
});

async function itemLinha(numero: number) {
  return {
    contratacao_id: 'C1',
    numero,
    descricao: 'antigo',
    quantidade: 1,
    unidade: 'un',
    valor_unitario_estimado: 1,
    valor_total_estimado: 1,
    material_ou_servico: 'M',
    sigiloso: false,
    tem_resultado: false,
    beneficio_id: null,
    beneficio_nome: null,
    criterio_julgamento: null,
  };
}

describe('janela e chave', () => {
  const MEIO_DIA = new Date('2026-10-14T15:00:00Z'); // 12h em Brasília
  const MADRUGADA = new Date('2026-10-14T04:30:00Z'); // 01h30 em Brasília
  it('sem estado (chave nunca sincronizada), começa ontem', () => {
    expect(inicioDaJanela(null, MEIO_DIA)).toBe('2026-10-13');
  });
  it('com última data boa de hoje, começa hoje', () => {
    expect(inicioDaJanela('2026-10-14', MEIO_DIA)).toBe('2026-10-14');
  });
  it('com última data boa anterior a ontem (falha antiga), começa nela', () => {
    expect(inicioDaJanela('2026-10-09', MEIO_DIA)).toBe('2026-10-09');
  });
  it('com última data no futuro (relógio adiantado), começa hoje', () => {
    expect(inicioDaJanela('2026-10-15', MEIO_DIA)).toBe('2026-10-14');
  });
  it('até as 3h de Brasília ainda relê ontem', () => {
    expect(inicioDaJanela('2026-10-14', MADRUGADA)).toBe('2026-10-13');
  });
});

describe('sincronizarChave', () => {
  it('lê de ontem até hoje e marca o estado como ok', async () => {
    const banco = new BancoFalso();
    const cliente = clienteFalso({ paginas: () => [[contratacaoBruta({ sequencial: 1 })]] });
    const deps = montarDeps(banco, cliente);
    expect(await sincronizarChave('SC', 6, deps)).toBe(true);
    expect(cliente.chamadas).toEqual([
      { endpoint: 'atualizacao', filtro: { uf: 'SC', modalidade: 6, dataInicial: '2026-10-13', dataFinal: '2026-10-14' } },
    ]);
    expect(banco.estados.get('atualizacao:SC:6')).toEqual({
      chave: 'atualizacao:SC:6',
      ultima_data: '2026-10-14',
      ultima_execucao: AGORA.toISOString(),
      status: 'ok',
      erro: null,
    });
    expect(banco.contratacoes.has(idDe(1))).toBe(true);
  });
  it('loga uma linha de progresso ao terminar a chave com sucesso', async () => {
    const linhas: string[] = [];
    const cliente = clienteFalso({ paginas: () => [[contratacaoBruta({ sequencial: 1 })]] });
    const deps = { ...montarDeps(new BancoFalso(), cliente), log: (l: string) => linhas.push(l) };
    await sincronizarChave('SC', 6, deps);
    expect(linhas).toHaveLength(1);
    expect(linhas[0].startsWith('[sync] atualizacao:SC:6 ok · 1 páginas · ')).toBe(true);
  });
  it('loga a linha de erro com a mensagem', async () => {
    const linhas: string[] = [];
    const cliente = clienteFalso({
      paginas: () => {
        throw new Error('Falhou 4 vezes');
      },
    });
    const deps = { ...montarDeps(new BancoFalso(), cliente), log: (l: string) => linhas.push(l) };
    await sincronizarChave('SC', 6, deps);
    expect(linhas).toHaveLength(1);
    expect(linhas[0].startsWith('[sync] atualizacao:SC:6 erro · 0 páginas · ')).toBe(true);
    expect(linhas[0].endsWith('Falhou 4 vezes')).toBe(true);
  });
  it('com última data boa de hoje, lê a partir de hoje', async () => {
    const banco = new BancoFalso();
    await banco.gravarEstado({ chave: 'atualizacao:SC:6', ultima_data: '2026-10-14', ultima_execucao: null, status: 'ok', erro: null });
    const cliente = clienteFalso();
    await sincronizarChave('SC', 6, montarDeps(banco, cliente));
    expect(cliente.chamadas[0].filtro.dataInicial).toBe('2026-10-14');
  });
  it('depois de falha, retoma da última data boa', async () => {
    const banco = new BancoFalso();
    await banco.gravarEstado({ chave: 'atualizacao:SC:6', ultima_data: '2026-10-09', ultima_execucao: null, status: 'erro', erro: 'x' });
    const cliente = clienteFalso();
    await sincronizarChave('SC', 6, montarDeps(banco, cliente));
    expect(cliente.chamadas[0].filtro.dataInicial).toBe('2026-10-09');
  });
  it('erro não avança a data e entra no resumo', async () => {
    const banco = new BancoFalso();
    await banco.gravarEstado({ chave: 'atualizacao:SC:6', ultima_data: '2026-10-09', ultima_execucao: null, status: 'ok', erro: null });
    const deps = montarDeps(
      banco,
      clienteFalso({
        paginas: () => {
          throw new Error('Falhou 4 vezes');
        },
      }),
    );
    expect(await sincronizarChave('SC', 6, deps)).toBe(false);
    expect(deps.resumo.erros).toEqual([{ chave: 'atualizacao:SC:6', mensagem: 'Falhou 4 vezes' }]);
    expect(banco.estados.get('atualizacao:SC:6')).toMatchObject({ ultima_data: '2026-10-09', status: 'erro', erro: 'Falhou 4 vezes' });
  });
});

describe('executarSync', () => {
  it('passa por todas as UFs e modalidades e faz o catch-up de itens', async () => {
    const banco = new BancoFalso();
    await banco.upsertContratacoes([linha({ sequencial: 7 })]); // aberta, sem itens
    const cliente = clienteFalso();
    await executarSync(montarDeps(banco, cliente), ['SC', 'PR'], [6, 8]);
    expect(cliente.chamadas.map((c) => `${c.filtro.uf}:${c.filtro.modalidade}`)).toEqual(['SC:6', 'SC:8', 'PR:6', 'PR:8']);
    expect(cliente.itensPedidos).toEqual([idDe(7)]);
  });
  it('depois do prazo não começa novas chaves nem faz o catch-up, e avisa quais ficaram', async () => {
    const banco = new BancoFalso();
    await banco.upsertContratacoes([linha({ sequencial: 7 })]); // aberta, sem itens
    let agora = AGORA.getTime();
    const cliente = clienteFalso({
      paginas: () => {
        agora += 15 * 60 * 1000; // cada chave leva 15 min
        return [[]];
      },
    });
    const deps = { ...montarDeps(banco, cliente), agora: () => new Date(agora) };
    await executarSync(deps, ['SC', 'PR'], [6, 8], AGORA.getTime() + 20 * 60 * 1000);
    expect(cliente.chamadas.map((c) => `${c.filtro.uf}:${c.filtro.modalidade}`)).toEqual(['SC:6', 'SC:8']);
    expect(deps.resumo.avisos).toEqual([
      { chave: 'prazo da rodada', mensagem: 'chaves não iniciadas: atualizacao:PR:6, atualizacao:PR:8' },
    ]);
    expect(cliente.itensPedidos).toEqual([]);
    expect(banco.estados.has('atualizacao:PR:6')).toBe(false);
  });
  it('sem prazo, não limita nada', async () => {
    const cliente = clienteFalso();
    const deps = montarDeps(new BancoFalso(), cliente);
    await executarSync(deps, ['SC'], [6, 8]);
    expect(cliente.chamadas).toHaveLength(2);
    expect(deps.resumo.avisos).toEqual([]);
  });
  it('loga o catch-up de itens com o número de compras', async () => {
    const banco = new BancoFalso();
    await banco.upsertContratacoes([linha({ sequencial: 7 }), linha({ sequencial: 8 })]);
    const linhas: string[] = [];
    const deps = { ...montarDeps(banco, clienteFalso()), log: (l: string) => linhas.push(l) };
    await executarSync(deps, ['SC'], [6]);
    expect(linhas).toContain('[sync] catch-up de itens · 2 compras');
  });
});
