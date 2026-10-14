// DESCARTÁVEL: sondagem do preço de referência. Não importar no worker.
import { mkdir, writeFile } from 'node:fs/promises';
import { BASE_CONSULTA, BASE_PNCP } from '../worker/config';
import { hojeBrasilia, paraPncp, somarDias } from '../worker/datas';
import { criarCliente } from '../worker/pncp/cliente';

type Compra = {
  numeroControlePNCP: string;
  objetoCompra: string;
  orgaoEntidade: { cnpj: string };
  anoCompra: number;
  sequencialCompra: number;
};
type Item = { numeroItem: number; descricao: string; temResultado: boolean; catalogoCodigoItem: string | null };

const EPI = /(\bEPIs?\b|equipamentos? de prote[cç][aã]o|luvas?\b|botinas?|cal[cç]ados? de seguran|capacetes?|uniformes?|fardamentos?)/i;
// Ajustes opcionais por variável de ambiente (padrão = roteiro original: SC, modalidade 6, 180 dias, 10 compras, 3 resultados/compra).
const UFS = (process.env.SONDA_UFS ?? 'SC').split(',');
const MODALIDADES = (process.env.SONDA_MODALIDADES ?? '6').split(',').map(Number);
const MAX_DIAS = Number(process.env.SONDA_MAX_DIAS ?? 180);
const MAX_COMPRAS = Number(process.env.SONDA_MAX_COMPRAS ?? 10);
const MAX_RESULTADOS = Number(process.env.SONDA_MAX_RESULTADOS ?? 3);
const PAUSA_MS = Number(process.env.SONDA_PAUSA_MS ?? 0);
const SUFIXO = process.env.SONDA_SUFIXO ?? '';
const cliente = criarCliente();
const hoje = hojeBrasilia(new Date());
const inicio = Date.now();

const compras: Compra[] = [];
const errosDescoberta: string[] = [];
for (let atras = 30; atras <= MAX_DIAS && compras.length < MAX_COMPRAS; atras += 10) {
  const dia = somarDias(hoje, -atras);
  for (const uf of UFS) {
    for (const modalidade of MODALIDADES) {
      try {
        for await (const p of cliente.paginarContratacoes('publicacao', { uf, modalidade, dataInicial: dia, dataFinal: dia })) {
          for (const c of p.registros as Compra[]) if (EPI.test(c.objetoCompra) && compras.length < MAX_COMPRAS) compras.push(c);
          if (PAUSA_MS) await new Promise((r) => setTimeout(r, PAUSA_MS));
        }
      } catch (e) {
        errosDescoberta.push(`${dia} ${uf} m${modalidade}: ${String(e).slice(0, 120)}`);
      }
    }
  }
}
const httpDescoberta = cliente.estatisticas();

const porCompra = [];
for (const c of compras) {
  const chave = { id: c.numeroControlePNCP, cnpj: c.orgaoEntidade.cnpj, ano: c.anoCompra, sequencial: c.sequencialCompra };
  if (PAUSA_MS) await new Promise((r) => setTimeout(r, PAUSA_MS));
  const itens = (await cliente.listarItens(chave)) as Item[];
  const comResultado = itens.filter((i) => i.temResultado);
  const resultados = [];
  for (const i of comResultado.slice(0, MAX_RESULTADOS)) {
    if (PAUSA_MS) await new Promise((r) => setTimeout(r, PAUSA_MS));
    resultados.push({
      item: i.numeroItem,
      descricao: i.descricao.slice(0, 80),
      catmat: i.catalogoCodigoItem,
      resposta: await cliente.getJson(
        `${BASE_PNCP}/v1/orgaos/${chave.cnpj}/compras/${chave.ano}/${chave.sequencial}/itens/${i.numeroItem}/resultados`,
      ),
    });
  }
  porCompra.push({
    compra: c.numeroControlePNCP,
    objeto: c.objetoCompra.slice(0, 120),
    itens: itens.length,
    comResultado: comResultado.length,
    comCatmat: itens.filter((i) => i.catalogoCodigoItem).length,
    resultados,
  });
}

const ontem = paraPncp(somarDias(hoje, -1));
const contratos = await cliente.getJson(`${BASE_CONSULTA}/v1/contratos?dataInicial=${ontem}&dataFinal=${ontem}&pagina=1&tamanhoPagina=10`);
const atas = await cliente.getJson(`${BASE_CONSULTA}/v1/atas?dataInicial=${ontem}&dataFinal=${ontem}&pagina=1&tamanhoPagina=10`);

const saida = {
  geradoEm: new Date().toISOString(),
  segundos: Math.round((Date.now() - inicio) / 1000),
  parametros: { UFS, MODALIDADES, MAX_DIAS, MAX_COMPRAS, MAX_RESULTADOS },
  httpDescoberta,
  errosDescoberta,
  http: cliente.estatisticas(),
  compras: porCompra,
  exemploContratos: contratos,
  exemploAtas: atas,
};
await mkdir('sondagem/saida', { recursive: true });
await writeFile(`sondagem/saida/${hoje}${SUFIXO}.json`, JSON.stringify(saida, null, 2));
console.log(JSON.stringify({ ...saida, exemploContratos: '(ver arquivo)', exemploAtas: '(ver arquivo)' }, null, 2));
