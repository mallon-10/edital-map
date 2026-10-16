import './ambiente';
import { criarBanco, criarSupabase } from './banco';
import { lerSupabase } from './config';
import { criarCliente } from './pncp/cliente';
import { relerItensAbertos } from './reler';
import { Resumo } from './resumo';

const { url, chave } = lerSupabase();
const cliente = criarCliente();
const resumo = new Resumo('Releitura dos itens das compras abertas (palavras e resumo)');
const inicio = Date.now();
const r = await relerItensAbertos({
  cliente,
  banco: criarBanco(criarSupabase(url, chave)),
  resumo,
  agora: () => new Date(),
  log: (linha) => console.log(linha),
});
console.log(
  `[reler] fim · ${r.compras} compras · ${r.comItens} com itens · ${r.falhas} falhas · ${Math.round((Date.now() - inicio) / 60000)} min`,
);
await resumo.publicar(cliente.estatisticas());
