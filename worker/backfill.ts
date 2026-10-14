import './ambiente';
import { parseArgs } from 'node:util';
import { criarBanco, criarSupabase } from './banco';
import { executarBackfill } from './carga';
import { LIMITE_INVALIDOS, lerModalidades, lerSupabase, lerUfs } from './config';
import { criarCliente } from './pncp/cliente';
import { Resumo } from './resumo';

const { values } = parseArgs({
  options: {
    dias: { type: 'string', default: '90' },
    ufs: { type: 'string' },
    modalidades: { type: 'string' },
  },
});
const dias = Number(values.dias);
if (!Number.isInteger(dias) || dias < 1 || dias > 365) throw new Error('--dias precisa ser um inteiro entre 1 e 365');

const { url, chave } = lerSupabase();
const cliente = criarCliente();
const resumo = new Resumo(`Carga inicial (${dias} dias)`);

await executarBackfill(
  { cliente, banco: criarBanco(criarSupabase(url, chave)), resumo, agora: () => new Date(), log: (linha) => console.log(linha) },
  {
    dias,
    ufs: lerUfs(values.ufs ?? process.env.UFS),
    modalidades: lerModalidades(values.modalidades ?? process.env.MODALIDADES),
  },
);
await resumo.publicar(cliente.estatisticas());
process.exitCode = resumo.falhou(LIMITE_INVALIDOS) ? 1 : 0;
