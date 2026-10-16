import './ambiente';
import { mkdir, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { criarBanco, criarSupabase } from './banco';
import { lerModalidades, lerPropostaAte, lerSupabase, lerUfs, UF_BRASIL } from './config';
import { sortearAmostra, ufsDaConferencia, type Candidata } from './conferencia/amostra';
import { compararCompra, type ResultadoCompra } from './conferencia/comparar';
import { montarRelatorio, type Idempotencia, type LinhaAbertas, type VerificacaoBusca } from './conferencia/relatorio';
import { hojeBrasilia } from './datas';
import { totalDeItens } from './itens';
import type { LinhaContratacao } from './mapear';
import { criarCliente } from './pncp/cliente';
import { Resumo } from './resumo';
import { chaveEstado, executarSync, mensagemDe } from './sincronizar';

// Uso: UFS=BR npm run worker:conferir -- --amostra 20 [--ufs-abertas SP,BA,AM] [--proposta-ate aaaa-mm-dd] [--idempotencia]
const { values } = parseArgs({
  options: {
    amostra: { type: 'string', default: '20' },
    'ufs-abertas': { type: 'string' },
    'proposta-ate': { type: 'string' },
    idempotencia: { type: 'boolean', default: false },
  },
});
const tamanho = Number(values.amostra);
const ufs = lerUfs(process.env.UFS);
const modalidades = lerModalidades(process.env.MODALIDADES);
const { url, chave } = lerSupabase();
const sb = criarSupabase(url, chave);
const cliente = criarCliente();
const agora = new Date();
const hoje = hojeBrasilia(agora);
const ufsAbertas = ufsDaConferencia(values['ufs-abertas']);
const propostaAte = lerPropostaAte(values['proposta-ate'], hoje);

function semAcento(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

async function listarCandidatas(): Promise<Candidata[]> {
  const candidatas: Candidata[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb
      .from('contratacoes')
      .select('id, cnpj, ano, sequencial, uf, modalidade_id, valor_estimado, link_origem, itens_resumo')
      .gt('encerramento_em', agora.toISOString())
      .order('id')
      .range(de, de + 999);
    if (error) throw new Error(error.message);
    for (const l of data ?? []) {
      candidatas.push({
        id: l.id,
        cnpj: l.cnpj,
        ano: l.ano,
        sequencial: l.sequencial,
        uf: l.uf,
        modalidade_id: l.modalidade_id,
        valor_estimado: l.valor_estimado === null ? null : Number(l.valor_estimado),
        link_origem: l.link_origem,
        muitos_itens: totalDeItens(l.itens_resumo) > 10,
      });
    }
    if (!data || data.length < 1000) return candidatas;
  }
}

async function conferirAmostra() {
  const amostra = sortearAmostra(await listarCandidatas(), tamanho);
  const estados = await sb.from('sync_estado').select('chave, ultima_execucao');
  if (estados.error) throw new Error(estados.error.message);
  const execucoes = new Map((estados.data ?? []).map((e) => [e.chave as string, e.ultima_execucao as string | null]));
  const resultados = [];
  for (const candidata of amostra) {
    let resultado: ResultadoCompra;
    try {
      const linha = await sb.from('contratacoes').select('*').eq('id', candidata.id).single();
      if (linha.error) throw new Error(linha.error.message);
      // Os itens não ficam mais no banco: compara o total do resumo com a lista do PNCP.
      const [detalhe, itensPncp] = await Promise.all([cliente.detalheCompra(candidata), cliente.listarItens(candidata)]);
      resultado = compararCompra(
        linha.data as LinhaContratacao,
        detalhe,
        totalDeItens(linha.data.itens_resumo),
        itensPncp.length,
        execucoes.get(chaveEstado(ufs[0] === UF_BRASIL ? UF_BRASIL : candidata.uf, candidata.modalidade_id)),
      );
    } catch (erro) {
      resultado = { id: candidata.id, status: 'erro', diferencas: [], observacao: mensagemDe(erro) };
    }
    resultados.push({ candidata, resultado });
  }
  return resultados;
}

/** Abertas no banco por UF × modalidade contra o totalRegistros do /proposta (teto aproximado do PNCP). */
async function contarAbertas(): Promise<LinhaAbertas[]> {
  const linhas: LinhaAbertas[] = [];
  for (const uf of ufsAbertas) {
    for (const modalidade of modalidades) {
      const { count, error } = await sb
        .from('contratacoes')
        .select('id', { count: 'exact', head: true })
        .eq('uf', uf)
        .eq('modalidade_id', modalidade)
        .gt('encerramento_em', agora.toISOString());
      if (error) throw new Error(error.message);
      const pncp = await cliente.totalPropostas({ uf, modalidade, dataFinal: propostaAte });
      linhas.push({ uf, modalidade, banco: count ?? 0, pncp });
    }
  }
  return linhas;
}

async function buscar(termo: string): Promise<Array<{ id: string; objeto: string }>> {
  const { data, error } = await sb.rpc('buscar', { q: termo, p_limite: 1000 });
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{ id: string; objeto: string }>;
}

async function conferirBuscas(): Promise<VerificacaoBusca[]> {
  const resultado: VerificacaoBusca[] = [];
  let achado: { termo: string; id: string } | null = null;
  for (const termo of ['botina', 'luva', 'capacete']) {
    const so = (await buscar(termo)).find((x) => !semAcento(x.objeto).toLowerCase().includes(termo));
    if (so) {
      achado = { termo, id: so.id };
      break;
    }
  }
  resultado.push(
    achado
      ? { verificacao: 'Busca acha pelos itens', status: 'ok', detalhe: `"${achado.termo}" achou ${achado.id}, cujo objeto não tem a palavra.` }
      : { verificacao: 'Busca acha pelos itens', status: 'inconclusivo', detalhe: 'Nenhuma compra aberta com botina, luva ou capacete só nos itens.' },
  );
  const [epi, uniformes, ambos] = await Promise.all([buscar('EPI'), buscar('uniformes'), buscar('EPI e uniformes')]);
  const ids = new Set(ambos.map((x) => x.id));
  const traz = epi.some((x) => ids.has(x.id)) && uniformes.some((x) => ids.has(x.id));
  resultado.push({
    verificacao: 'Busca "EPI e uniformes" traz os dois',
    status: epi.length === 0 || uniformes.length === 0 ? 'inconclusivo' : traz ? 'ok' : 'falhou',
    detalhe: `EPI: ${epi.length}; uniformes: ${uniformes.length}; os dois: ${ambos.length}.`,
  });
  return resultado;
}

async function contarTabelas() {
  const c = await sb.from('contratacoes').select('id', { count: 'exact', head: true });
  const r = await sb.from('contratacoes').select('id', { count: 'exact', head: true }).not('itens_resumo', 'is', null);
  if (c.error || r.error) throw new Error((c.error ?? r.error)?.message);
  return { contratacoes: c.count ?? 0, comItens: r.count ?? 0 };
}

async function conferirIdempotencia(): Promise<Idempotencia> {
  const banco = criarBanco(sb);
  const rodar = async (titulo: string) => {
    const resumo = new Resumo(titulo);
    await executarSync({ cliente, banco, resumo, agora: () => new Date() }, ufs, modalidades);
    await resumo.publicar(cliente.estatisticas(), undefined);
  };
  const t0 = Date.now();
  await rodar('Idempotência · 1ª rodada');
  const t1 = new Date();
  const antes = await contarTabelas();
  await rodar('Idempotência · 2ª rodada');
  const depois = await contarTabelas();
  // sincronizada_em só é preenchida na inserção (o upsert não envia essa coluna).
  const { data, error } = await sb.from('contratacoes').select('id, atualizada_pncp_em').gte('sincronizada_em', t1.toISOString());
  if (error) throw new Error(error.message);
  const folga = 10 * 60 * 1000;
  const inexplicadas = (data ?? [])
    .filter((l) => Date.parse(l.atualizada_pncp_em as string) < t0 - folga)
    .map((l) => l.id as string);
  return { antes, depois, novas: data?.length ?? 0, inexplicadas };
}

const relatorio = montarRelatorio({
  dia: hoje,
  amostra: await conferirAmostra(),
  abertas: await contarAbertas(),
  buscas: await conferirBuscas(),
  idempotencia: values.idempotencia ? await conferirIdempotencia() : null,
});
await mkdir('docs/conferencias', { recursive: true });
const arquivo = `docs/conferencias/${hoje}.md`;
await writeFile(arquivo, relatorio);
console.log(relatorio);
console.log(`Relatório salvo em ${arquivo}`);
