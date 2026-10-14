import { LIMITE_CATCH_UP } from './config';
import { hojeBrasilia, somarDias } from './datas';
import { chaveEstado, medirChave, mensagemDe, processarJanela, sincronizarItens, type Dependencias } from './sincronizar';

export function janelas(inicio: string, fim: string, dias: number): Array<[string, string]> {
  const resultado: Array<[string, string]> = [];
  for (let ini = inicio; ini <= fim; ini = somarDias(ini, dias)) {
    const ultimo = somarDias(ini, dias - 1);
    resultado.push([ini, ultimo < fim ? ultimo : fim]);
  }
  return resultado;
}

export async function executarBackfill(
  deps: Dependencias,
  opcoes: { dias: number; ufs: string[]; modalidades: readonly number[] },
): Promise<void> {
  const hoje = hojeBrasilia(deps.agora());
  const inicio = somarDias(hoje, -opcoes.dias);
  for (const uf of opcoes.ufs) {
    for (const modalidade of opcoes.modalidades) {
      const chave = chaveEstado(uf, modalidade);
      const concluir = medirChave('carga', chave, deps);
      try {
        for (const [dataInicial, dataFinal] of janelas(inicio, hoje, 7)) {
          await processarJanela('publicacao', { uf, modalidade, dataInicial, dataFinal }, deps);
        }
        await deps.banco.gravarEstado({
          chave,
          ultima_data: hoje,
          ultima_execucao: deps.agora().toISOString(),
          status: 'ok',
          erro: null,
        });
        concluir();
      } catch (erro) {
        const mensagem = mensagemDe(erro);
        deps.resumo.registrarErro(chave, mensagem);
        concluir(mensagem);
      }
    }
  }
  try {
    await sincronizarItens(await deps.banco.abertasSemItens(LIMITE_CATCH_UP), deps);
  } catch (erro) {
    deps.resumo.registrarAviso('catch-up de itens', mensagemDe(erro));
  }
}
