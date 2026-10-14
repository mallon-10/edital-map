import type { Banco } from './banco';
import { LIMITE_CATCH_UP } from './config';
import { hojeBrasilia, somarDias } from './datas';
import {
  chaveDaLinha,
  contratacaoParaLinha,
  estaAberta,
  itemParaLinha,
  type ChaveCompra,
  type LinhaContratacao,
  type LinhaItem,
} from './mapear';
import type { ClientePncp, FiltroContratacoes } from './pncp/cliente';
import { validarContratacao, validarItem } from './pncp/esquemas';
import type { Resumo } from './resumo';

export type Dependencias = {
  cliente: Pick<ClientePncp, 'paginarContratacoes' | 'listarItens'>;
  banco: Banco;
  resumo: Resumo;
  agora: () => Date;
};

export function mensagemDe(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}

export function processarRegistros(registros: unknown[], resumo: Resumo): LinhaContratacao[] {
  const porId = new Map<string, LinhaContratacao>();
  for (const bruto of registros) {
    const v = validarContratacao(bruto);
    if (!v.ok) {
      resumo.contarInvalido(v.id, v.motivo);
      continue;
    }
    try {
      const linha = contratacaoParaLinha(v.valor);
      porId.set(linha.id, linha);
    } catch (erro) {
      resumo.contarInvalido(v.valor.numeroControlePNCP, mensagemDe(erro));
    }
  }
  const linhas = [...porId.values()];
  resumo.contarValidos(linhas.length);
  return linhas;
}

export function mudou(linha: LinhaContratacao, conhecidas: Map<string, string>): boolean {
  const anterior = conhecidas.get(linha.id);
  return anterior === undefined || Date.parse(linha.atualizada_pncp_em) > Date.parse(anterior);
}

export async function sincronizarItens(compras: ChaveCompra[], deps: Dependencias): Promise<void> {
  await Promise.all(
    compras.map(async (compra) => {
      try {
        const brutos = await deps.cliente.listarItens(compra);
        const porNumero = new Map<number, LinhaItem>();
        let invalidos = 0;
        for (const bruto of brutos) {
          const v = validarItem(bruto, compra.id);
          if (v.ok) porNumero.set(v.valor.numeroItem, itemParaLinha(v.valor, compra.id));
          else {
            invalidos++;
            deps.resumo.registrarAviso(`item:${v.id}`, v.motivo);
          }
        }
        const linhas = [...porNumero.values()];
        await deps.banco.upsertItens(linhas);
        // Só remove itens antigos quando a lista veio inteira e válida.
        if (invalidos === 0) await deps.banco.removerItensAlem(compra.id, linhas.map((l) => l.numero));
        deps.resumo.contarItens(1, linhas.length);
      } catch (erro) {
        deps.resumo.registrarAviso(`itens:${compra.id}`, mensagemDe(erro));
      }
    }),
  );
}

export async function gravarPagina(linhas: LinhaContratacao[], deps: Dependencias): Promise<void> {
  if (linhas.length === 0) return;
  const conhecidas = await deps.banco.atualizacoesConhecidas(linhas.map((l) => l.id));
  await deps.banco.upsertContratacoes(linhas);
  deps.resumo.contarContratacoes(linhas.length);
  const agora = deps.agora();
  const precisamItens = linhas.filter((l) => estaAberta(l, agora) && mudou(l, conhecidas)).map(chaveDaLinha);
  await sincronizarItens(precisamItens, deps);
}

export async function processarJanela(
  endpoint: 'publicacao' | 'atualizacao',
  filtro: FiltroContratacoes,
  deps: Dependencias,
): Promise<void> {
  for await (const pagina of deps.cliente.paginarContratacoes(endpoint, filtro)) {
    deps.resumo.contarPagina();
    await gravarPagina(processarRegistros(pagina.registros, deps.resumo), deps);
  }
}

export function chaveEstado(uf: string, modalidade: number): string {
  return `atualizacao:${uf}:${modalidade}`;
}

export function inicioDaJanela(ultimaData: string | null | undefined, hoje: string): string {
  const ontem = somarDias(hoje, -1);
  return ultimaData && ultimaData < ontem ? ultimaData : ontem;
}

export async function sincronizarChave(uf: string, modalidade: number, deps: Dependencias): Promise<boolean> {
  const chave = chaveEstado(uf, modalidade);
  const hoje = hojeBrasilia(deps.agora());
  let inicio = somarDias(hoje, -1);
  let estadoLido = false;
  try {
    const estado = await deps.banco.lerEstado(chave);
    estadoLido = true;
    inicio = inicioDaJanela(estado?.ultima_data, hoje);
    await processarJanela('atualizacao', { uf, modalidade, dataInicial: inicio, dataFinal: hoje }, deps);
    await deps.banco.gravarEstado({
      chave,
      ultima_data: hoje,
      ultima_execucao: deps.agora().toISOString(),
      status: 'ok',
      erro: null,
    });
    return true;
  } catch (erro) {
    const mensagem = mensagemDe(erro);
    deps.resumo.registrarErro(chave, mensagem);
    // Sem ter lido o estado, não sabemos a última data boa: não sobrescrever.
    if (estadoLido) {
      await deps.banco
        .gravarEstado({
          chave,
          ultima_data: inicio,
          ultima_execucao: deps.agora().toISOString(),
          status: 'erro',
          erro: mensagem.slice(0, 1000),
        })
        .catch(() => undefined);
    }
    return false;
  }
}

export async function executarSync(deps: Dependencias, ufs: string[], modalidades: readonly number[]): Promise<void> {
  for (const uf of ufs) {
    for (const modalidade of modalidades) await sincronizarChave(uf, modalidade, deps);
  }
  try {
    await sincronizarItens(await deps.banco.abertasSemItens(LIMITE_CATCH_UP), deps);
  } catch (erro) {
    deps.resumo.registrarAviso('catch-up de itens', mensagemDe(erro));
  }
}
