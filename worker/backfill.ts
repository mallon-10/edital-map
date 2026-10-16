import './ambiente';
import { parseArgs } from 'node:util';
import { criarBanco, criarSupabase } from './banco';
import { executarBackfill } from './carga';
import { LIMITE_INVALIDOS, lerModalidades, lerPropostaAte, lerSupabase, lerUfs } from './config';
import { hojeBrasilia } from './datas';
import { criarCliente } from './pncp/cliente';
import { Resumo } from './resumo';

// Uso: npm run worker:backfill -- --dias 30 --ufs BR --proposta [--proposta-ate aaaa-mm-dd]
const { values } = parseArgs({
  options: {
    dias: { type: 'string', default: '90' },
    ufs: { type: 'string' },
    modalidades: { type: 'string' },
    proposta: { type: 'boolean', default: false },
    'proposta-ate': { type: 'string' },
  },
});
const dias = Number(values.dias);
if (!Number.isInteger(dias) || dias < 1 || dias > 365) throw new Error('--dias precisa ser um inteiro entre 1 e 365');
const propostaAte =
  values.proposta || values['proposta-ate'] ? lerPropostaAte(values['proposta-ate'], hojeBrasilia(new Date())) : null;

const { url, chave } = lerSupabase();
const cliente = criarCliente();
const resumo = new Resumo(`Carga inicial (${dias} dias${propostaAte ? ` + propostas até ${propostaAte}` : ''})`);

await executarBackfill(
  { cliente, banco: criarBanco(criarSupabase(url, chave)), resumo, agora: () => new Date(), log: (linha) => console.log(linha) },
  {
    dias,
    ufs: lerUfs(values.ufs ?? process.env.UFS),
    modalidades: lerModalidades(values.modalidades ?? process.env.MODALIDADES),
    propostaAte,
  },
);
await resumo.publicar(cliente.estatisticas());
process.exitCode = resumo.falhou(LIMITE_INVALIDOS) ? 1 : 0;
