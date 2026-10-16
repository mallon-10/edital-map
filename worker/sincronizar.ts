import type { Banco, EstadoSync } from './banco';
import { LIMITE_CATCH_UP, UF_BRASIL } from './config';
import { hojeBrasilia, somarDias } from './datas';
import { palavrasDosItens, resumirItens } from './itens';
import {
  chaveDaLinha,
  contratacaoParaLinha,
  estaAberta,
  foraDaRetencao,
  itemParaLinha,
  type ChaveCompra,
  type LinhaContratacao,
  type LinhaItem,
} from './mapear';
import type { ClientePncp, FiltroContratacoes, PaginaContratacoes } from './pncp/cliente';
import { validarContratacao, validarItem } from './pncp/esquemas';
import type { Resumo } from './resumo';

export type Dependencias = {
  cliente: Pick<ClientePncp, 'paginarContratacoes' | 'paginarPropostas' | 'listarItens'>;
  banco: Banco;
  resumo: Resumo;
  agora: () => Date;
  /** Linhas de progresso (uma por chave) para o log da rodada. */
  log?: (linha: string) => void;
};

/** Mede uma chave UF × modalidade e emite a linha de progresso ao terminar. */
export function medirChave(prefixo: 'sync' | 'carga', chave: string, deps: Dependencias) {
  const inicio = Date.now();
  const paginasAntes = deps.resumo.paginas;
  return (erro?: string): void => {
    const paginas = deps.resumo.paginas - paginasAntes;
    const segundos = Math.round((Date.now() - inicio) / 1000);
    const base = `[${prefixo}] ${chave} ${erro === undefined ? 'ok' : 'erro'} · ${paginas} páginas · ${segundos} s`;
    deps.log?.(erro === undefined ? base : `${base} · ${erro}`);
  };
}

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

/**
 * Lê os itens de cada compra no PNCP e grava, numa chamada só, as palavras de todas as descrições e o resumo
 * (o texto dos itens não fica no banco). Devolve os ids das compras concluídas.
 */
export async function sincronizarItens(compras: ChaveCompra[], deps: Dependencias): Promise<Set<string>> {
  const gravadas = new Set<string>();
  await Promise.all(
    compras.map(async (compra) => {
      try {
        const brutos = await deps.cliente.listarItens(compra);
        const porNumero = new Map<number, LinhaItem>();
        for (const bruto of brutos) {
          const v = validarItem(bruto, compra.id);
          if (v.ok) porNumero.set(v.valor.numeroItem, itemParaLinha(v.valor, compra.id));
          else deps.resumo.registrarAviso(`item:${v.id}`, v.motivo);
        }
        const itens = [...porNumero.values()];
        if (itens.length === 0) {
          // Lista vazia pode ser resposta transitória do PNCP: não apagar o que já temos.
          deps.resumo.registrarAviso(`itens:${compra.id}`, 'lista de itens vazia; palavras e resumo antigos mantidos');
        } else {
          await deps.banco.gravarResumoItens(compra.id, palavrasDosItens(itens.map((i) => i.descricao)), resumirItens(itens));
        }
        deps.resumo.contarItens(1, itens.length);
        gravadas.add(compra.id);
      } catch (erro) {
        deps.resumo.registrarAviso(`itens:${compra.id}`, mensagemDe(erro));
      }
    }),
  );
  return gravadas;
}

const EPOCA = '1970-01-01T00:00:00.000Z';

export async function gravarPagina(recebidas: LinhaContratacao[], deps: Dependencias): Promise<void> {
  if (recebidas.length === 0) return;
  const agora = deps.agora();
  const conhecidas = await deps.banco.atualizacoesConhecidas(recebidas.map((l) => l.id));
  const fora = recebidas.filter((l) => foraDaRetencao(l, agora));
  if (fora.length > 0) {
    deps.resumo.contarForaDaRetencao(fora.length);
    // Já gravada e agora fora da retenção (prazo passou de 7 dias ou sumiu): sai do banco em vez de ficar velha.
    const remover = fora.filter((l) => conhecidas.has(l.id)).map((l) => l.id);
    if (remover.length > 0) await deps.banco.removerContratacoes(remover);
  }
  const linhas = recebidas.filter((l) => !foraDaRetencao(l, agora));
  if (linhas.length === 0) return;
  const precisamItens = new Set(linhas.filter((l) => estaAberta(l, agora) && mudou(l, conhecidas)).map((l) => l.id));
  // Ordem de gravação: quem precisa de itens entra primeiro com o timestamp anterior (ou 1970, se for nova).
  // Se o processo cair antes de os itens gravarem, a próxima rodada ainda vê a compra como alterada
  // e busca os itens de novo; o timestamp real só vale depois que os itens entram.
  await deps.banco.upsertContratacoes(
    linhas.map((l) => (precisamItens.has(l.id) ? { ...l, atualizada_pncp_em: conhecidas.get(l.id) ?? EPOCA } : l)),
  );
  deps.resumo.contarContratacoes(linhas.length);
  if (precisamItens.size === 0) return;
  const comItens = await sincronizarItens(linhas.filter((l) => precisamItens.has(l.id)).map(chaveDaLinha), deps);
  const definitivas = linhas.filter((l) => comItens.has(l.id));
  if (definitivas.length > 0) await deps.banco.upsertContratacoes(definitivas);
}

export async function processarPaginas(paginas: AsyncIterable<PaginaContratacoes>, deps: Dependencias): Promise<void> {
  for await (const pagina of paginas) {
    deps.resumo.contarPagina();
    await gravarPagina(processarRegistros(pagina.registros, deps.resumo), deps);
  }
}

export function processarJanela(
  endpoint: 'publicacao' | 'atualizacao',
  filtro: FiltroContratacoes,
  deps: Dependencias,
): Promise<void> {
  return processarPaginas(deps.cliente.paginarContratacoes(endpoint, filtro), deps);
}

export function chaveEstado(uf: string, modalidade: number): string {
  return `atualizacao:${uf}:${modalidade}`;
}

/**
 * Data de partida de uma chave nacional nova: a mais antiga entre as chaves por UF da mesma modalidade
 * (a última data boa de cada UF), para nenhuma janela se perder na troca para o país inteiro.
 */
export function dataHerdada(estados: EstadoSync[], modalidade: number): string | null {
  const padrao = new RegExp(`^atualizacao:([A-Z]{2}):${modalidade}$`);
  const datas = estados
    .filter((e) => {
      const m = padrao.exec(e.chave);
      return m !== null && m[1] !== UF_BRASIL;
    })
    .map((e) => e.ultima_data)
    .sort();
  return datas[0] ?? null;
}

/**
 * Início da janela de atualização: a última data boa (sem estado, ontem), limitada a
 * 3 h antes de agora. Assim, até as 03h de Brasília a rodada ainda relê ontem (mudanças
 * que o índice do PNCP demora a mostrar); depois disso lê a partir da última data boa.
 * Data no futuro (relógio adiantado) fica limitada pelo segundo termo.
 */
export function inicioDaJanela(ultimaData: string | null | undefined, agora: Date): string {
  const base = ultimaData || somarDias(hojeBrasilia(agora), -1);
  const limite = hojeBrasilia(new Date(agora.getTime() - 3 * 3600 * 1000));
  return base < limite ? base : limite;
}

export async function sincronizarChave(uf: string, modalidade: number, deps: Dependencias): Promise<boolean> {
  const chave = chaveEstado(uf, modalidade);
  const concluir = medirChave('sync', chave, deps);
  const hoje = hojeBrasilia(deps.agora());
  let inicio = somarDias(hoje, -1);
  let estadoLido = false;
  try {
    const estado = await deps.banco.lerEstado(chave);
    const ultima = estado
      ? estado.ultima_data
      : uf === UF_BRASIL
        ? dataHerdada(await deps.banco.estadosDaModalidade(modalidade), modalidade)
        : null;
    estadoLido = true;
    inicio = inicioDaJanela(ultima, deps.agora());
    await processarJanela('atualizacao', { uf, modalidade, dataInicial: inicio, dataFinal: hoje }, deps);
    await deps.banco.gravarEstado({
      chave,
      ultima_data: hoje,
      ultima_execucao: deps.agora().toISOString(),
      status: 'ok',
      erro: null,
    });
    concluir();
    return true;
  } catch (erro) {
    const mensagem = mensagemDe(erro);
    deps.resumo.registrarErro(chave, mensagem);
    concluir(mensagem);
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

/**
 * Roda todas as chaves e o catch-up de itens. `prazo` é um instante (ms): depois dele não começa
 * chave nova nem catch-up; as chaves puladas não gravam estado e a próxima rodada as pega.
 */
export async function executarSync(
  deps: Dependencias,
  ufs: string[],
  modalidades: readonly number[],
  prazo?: number,
): Promise<void> {
  const passouDoPrazo = () => prazo !== undefined && deps.agora().getTime() >= prazo;
  const puladas: string[] = [];
  for (const uf of ufs) {
    for (const modalidade of modalidades) {
      if (passouDoPrazo()) puladas.push(chaveEstado(uf, modalidade));
      else await sincronizarChave(uf, modalidade, deps);
    }
  }
  if (puladas.length > 0) deps.resumo.registrarAviso('prazo da rodada', `chaves não iniciadas: ${puladas.join(', ')}`);
  if (passouDoPrazo()) return;
  try {
    const pendentes = await deps.banco.abertasSemItens(LIMITE_CATCH_UP);
    await sincronizarItens(pendentes, deps);
    deps.log?.(`[sync] catch-up de itens · ${pendentes.length} compras`);
  } catch (erro) {
    deps.resumo.registrarAviso('catch-up de itens', mensagemDe(erro));
  }
}
