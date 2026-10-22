// Editais abertos de cada assunto das páginas /licitacoes, pela mesma contagem do site (abertos_por_uf com os termos
// relacionados de lib/relevancia/termos.ts). Assunto abaixo do mínimo não deveria ter página (spec do SEO pelos dados).
// Uso: node --env-file=.env --import tsx scripts/conferir-assuntos.ts
import { interpretarBusca } from '../lib/relevancia/termos';
import { ASSUNTOS } from '../lib/seo/assuntos';
import { conectarBanco } from './banco-direto';

const MINIMO = 100;
const cliente = conectarBanco(process.env);
await cliente.connect();
let abaixo = 0;
try {
  for (const a of ASSUNTOS) {
    const b = interpretarBusca(a.termo);
    const { rows } = await cliente.query<{ n: number }>('select coalesce(sum(total), 0)::int n from public.abertos_por_uf($1, $2, $3)', [
      b.digitados, b.relacionados.map((r) => r.termo), b.excluidos,
    ]);
    const n = rows[0].n;
    if (n < MINIMO) abaixo++;
    console.log(`${n < MINIMO ? '!!' : '  '} ${a.slug.padEnd(26)} ${String(n).padStart(6)}`);
  }
} finally {
  await cliente.end();
}
console.log(abaixo === 0 ? `Todos com ${MINIMO}+ editais abertos.` : `${abaixo} assunto(s) abaixo de ${MINIMO}.`);
