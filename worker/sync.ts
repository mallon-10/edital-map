import './ambiente';
import { criarBanco, criarSupabase } from './banco';
import { LIMITE_INVALIDOS, lerModalidades, lerSupabase, lerUfs } from './config';
import { criarCliente } from './pncp/cliente';
import { Resumo } from './resumo';
import { executarSync } from './sincronizar';

const { url, chave } = lerSupabase();
const cliente = criarCliente();
/** Depois de 25 min não começa chave nova (o job do Actions é morto aos 30). */
const prazo = Date.now() + 25 * 60 * 1000;
const resumo = new Resumo('Sincronização PNCP');

await executarSync(
  { cliente, banco: criarBanco(criarSupabase(url, chave)), resumo, agora: () => new Date(), log: (linha) => console.log(linha) },
  lerUfs(process.env.UFS),
  lerModalidades(process.env.MODALIDADES),
  prazo,
);
await resumo.publicar(cliente.estatisticas());
process.exitCode = resumo.falhou(LIMITE_INVALIDOS) ? 1 : 0;
