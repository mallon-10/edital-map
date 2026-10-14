import './ambiente';
import { criarBanco, criarSupabase } from './banco';
import { LIMITE_INVALIDOS, lerModalidades, lerSupabase, lerUfs } from './config';
import { criarCliente } from './pncp/cliente';
import { Resumo } from './resumo';
import { executarSync } from './sincronizar';

const { url, chave } = lerSupabase();
const cliente = criarCliente();
const resumo = new Resumo('Sincronização PNCP');

await executarSync(
  { cliente, banco: criarBanco(criarSupabase(url, chave)), resumo, agora: () => new Date(), log: (linha) => console.log(linha) },
  lerUfs(process.env.UFS),
  lerModalidades(process.env.MODALIDADES),
);
await resumo.publicar(cliente.estatisticas());
process.exitCode = resumo.falhou(LIMITE_INVALIDOS) ? 1 : 0;
