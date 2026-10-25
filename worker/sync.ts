import './ambiente';
import { criarBanco, criarSupabase } from './banco';
import { LIMITE_INVALIDOS, lerModalidades, lerSupabase, lerUfs } from './config';
import { avisarIndexNow } from './indexnow';
import type { LinhaContratacao } from './mapear';
import { criarCliente } from './pncp/cliente';
import { Resumo } from './resumo';
import { executarSync } from './sincronizar';

const { url, chave } = lerSupabase();
const cliente = criarCliente();
/** Depois de 25 min não começa chave nova (o job do Actions é morto aos 30). */
const prazo = Date.now() + 25 * 60 * 1000;
const resumo = new Resumo('Sincronização PNCP');
const novidades: LinhaContratacao[] = [];

await executarSync(
  {
    cliente,
    banco: criarBanco(criarSupabase(url, chave)),
    resumo,
    agora: () => new Date(),
    log: (linha) => console.log(linha),
    novidades: (linhas) => novidades.push(...linhas),
  },
  lerUfs(process.env.UFS),
  lerModalidades(process.env.MODALIDADES),
  prazo,
);
// INDEXNOW=0 desliga (rodada de teste local).
if (process.env.INDEXNOW !== '0') {
  const { enviados, erro } = await avisarIndexNow(novidades);
  console.log(`[sync] IndexNow · ${enviados} editais avisados`);
  if (erro) resumo.registrarAviso('IndexNow', erro);
}
await resumo.publicar(cliente.estatisticas());
process.exitCode = resumo.falhou(LIMITE_INVALIDOS) ? 1 : 0;
