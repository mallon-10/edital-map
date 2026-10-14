// DESCARTÁVEL: recaptura os campos dos itens das 40 compras da rodada ampliada, para dar rastro aos números do relatório.
import { readFile, writeFile } from 'node:fs/promises';
import { hojeBrasilia } from '../worker/datas';
import { criarCliente } from '../worker/pncp/cliente';

type ItemBruto = {
  numeroItem: number;
  descricao: string;
  unidadeMedida: string | null;
  valorUnitarioEstimado: number | null;
  quantidade: number | null;
  situacaoCompraItemNome: string | null;
  temResultado: boolean;
  catalogo: unknown;
  categoriaItemCatalogo: unknown;
  catalogoCodigoItem: unknown;
  ncmNbsCodigo: unknown;
};

const hoje = hojeBrasilia(new Date());
const ampliada = JSON.parse(await readFile(`sondagem/saida/${hoje}-ampliada.json`, 'utf8')) as { compras: { compra: string }[] };
const cliente = criarCliente();
const CITADOS = new Set(['92963560000160-1-001159/2026#3', '82892316000108-1-000296/2026#2']);

const situacoes: Record<string, number> = {};
const total = { itens: 0, comCatalogo: 0, comCategoriaItemCatalogo: 0, comCatalogoCodigoItem: 0, comNcmNbs: 0, temResultado: 0 };
const porCompra: { compra: string; itens: number; situacoes: Record<string, number> }[] = [];
const citados: unknown[] = [];

for (const { compra } of ampliada.compras) {
  const [cnpj, , resto] = compra.split('-');
  const [seq, ano] = resto.split('/');
  await new Promise((r) => setTimeout(r, 1000));
  const itens = (await cliente.listarItens({ id: compra, cnpj, ano: Number(ano), sequencial: Number(seq) })) as ItemBruto[];
  const sit: Record<string, number> = {};
  for (const i of itens) {
    total.itens++;
    if (i.catalogo) total.comCatalogo++;
    if (i.categoriaItemCatalogo) total.comCategoriaItemCatalogo++;
    if (i.catalogoCodigoItem) total.comCatalogoCodigoItem++;
    if (i.ncmNbsCodigo) total.comNcmNbs++;
    if (i.temResultado) total.temResultado++;
    const nome = i.situacaoCompraItemNome ?? 'null';
    sit[nome] = (sit[nome] ?? 0) + 1;
    situacoes[nome] = (situacoes[nome] ?? 0) + 1;
    if (CITADOS.has(`${compra}#${i.numeroItem}`)) {
      citados.push({
        compra,
        numeroItem: i.numeroItem,
        descricao: i.descricao.slice(0, 80),
        unidadeMedida: i.unidadeMedida,
        valorUnitarioEstimado: i.valorUnitarioEstimado,
        quantidade: i.quantidade,
        situacaoCompraItemNome: i.situacaoCompraItemNome,
        catalogo: i.catalogo,
        categoriaItemCatalogo: i.categoriaItemCatalogo,
        ncmNbsCodigo: i.ncmNbsCodigo,
      });
    }
  }
  porCompra.push({ compra, itens: itens.length, situacoes: sit });
}

const saida = { geradoEm: new Date().toISOString(), http: cliente.estatisticas(), total, situacoes, citados, porCompra };
await writeFile(`sondagem/saida/${hoje}-itens-recaptura.json`, JSON.stringify(saida, null, 2));
console.log(JSON.stringify({ ...saida, porCompra: `(${porCompra.length} compras, ver arquivo)` }, null, 2));
