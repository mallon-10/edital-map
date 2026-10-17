// Conferência do controlador depois da 0009: registrar_uso com chamadas simultâneas (cada uma na sua conexão)
// não passa do limite; repetir uma chave do dia não conta; chave nova com o limite cheio é recusada.
// Uso: npx tsx scripts/conferir-limites.ts   (lê SUPABASE_DB_URL do .env; usa um visitante de teste e apaga as linhas dele no fim)
import { randomUUID } from 'node:crypto';
import '../worker/ambiente';
import { conectarBanco } from './banco-direto';

const SIMULTANEAS = 6;
const LIMITE = 3;
const visitante = randomUUID();
const clientes = Array.from({ length: SIMULTANEAS }, () => conectarBanco(process.env));
await Promise.all(clientes.map((c) => c.connect()));
const [primeiro] = clientes;

const registrar = async (i: number, chave: string) =>
  (
    await clientes[i].query<{ permitido: boolean; usados: number }>(
      'select permitido, usados from public.registrar_uso($1, $2, $3, $4)',
      [visitante, 'busca', chave, LIMITE],
    )
  ).rows[0];

let falhou = false;
function conferir(ok: boolean, texto: string) {
  console.log(`${ok ? 'ok   ' : 'FALHA'} ${texto}`);
  if (!ok) falhou = true;
}

try {
  const respostas = await Promise.all(clientes.map((_, i) => registrar(i, `simultanea-${i}`)));
  const permitidas = respostas.flatMap((r, i) => (r.permitido ? [i] : []));
  const { rows } = await primeiro.query<{ n: number }>('select count(*)::int as n from public.uso_diario where visitante = $1', [visitante]);
  conferir(permitidas.length === LIMITE, `${SIMULTANEAS} chamadas simultâneas: ${permitidas.length} permitidas (esperado ${LIMITE})`);
  conferir(rows[0].n === LIMITE, `linhas gravadas: ${rows[0].n} (esperado ${LIMITE})`);
  const repetida = await registrar(0, `simultanea-${permitidas[0]}`);
  conferir(repetida.permitido && repetida.usados === LIMITE, `repetir uma chave do dia: ${repetida.permitido}, ${repetida.usados} (esperado true, ${LIMITE})`);
  const nova = await registrar(0, 'depois-do-limite');
  conferir(!nova.permitido && nova.usados === LIMITE, `chave nova com o limite cheio: ${nova.permitido} (esperado false)`);
} finally {
  await primeiro.query('delete from public.uso_diario where visitante = $1', [visitante]);
  await Promise.all(clientes.map((c) => c.end()));
}
if (falhou) process.exitCode = 1;
