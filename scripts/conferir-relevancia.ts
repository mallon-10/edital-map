// Conferência do controlador depois da 0011: a pontuação do banco (buscar_editais/pontuacao_busca) é a mesma de
// `pontuar` (site), a ordem por relevância não sobe, só aparecem termos da busca e os excluídos somem.
// Uso: npx tsx scripts/conferir-relevancia.ts            (confere; lê SUPABASE_DB_URL do .env; só leitura)
//      npx tsx scripts/conferir-relevancia.ts --mostrar  (imprime os arrays para colar em docs/evolucao-fase-2.sql)
import '../worker/ambiente';
import { pontuar } from '../lib/relevancia/pontuacao';
import { GRUPOS, interpretarBusca } from '../lib/relevancia/termos';
import { conectarBanco } from './banco-direto';

const BUSCAS = ['uniformes', 'EPI', 'luva nitrílica', 'material de limpeza -escolar', 'merenda, leite', 'computador'];
const literal = (a: readonly string[]) => `'{${a.map((t) => `"${t.replace(/["\\]/g, '\\$&')}"`).join(',')}}'`;

if (process.argv.includes('--mostrar')) {
  for (const q of BUSCAS) {
    const b = interpretarBusca(q);
    console.log(`-- ${q}`);
    console.log(`  p_termos => ${literal(b.digitados)}, p_relacionados => ${literal(b.relacionados.map((r) => r.termo))}, p_excluir => ${literal(b.excluidos)}`);
  }
  for (const g of GRUPOS) console.log(`-- [E6] ${g.assunto}\n${literal(g.termos)}`);
  process.exit(0);
}

type Linha = { id: string; pontuacao: number | null; termos_objeto: string[]; termos_itens: string[]; frase: boolean; total: string };

const cliente = conectarBanco(process.env);
await cliente.connect();
let falhou = false;
function conferir(ok: boolean, texto: string) {
  console.log(`${ok ? 'ok   ' : 'FALHA'} ${texto}`);
  if (!ok) falhou = true;
}

try {
  for (const q of BUSCAS) {
    const b = interpretarBusca(q);
    const args = [b.positivo, b.digitados, b.relacionados.map((r) => r.termo), b.excluidos];
    const inicio = performance.now();
    const { rows } = await cliente.query<Linha>(
      `select id, pontuacao, termos_objeto, termos_itens, frase, total
         from public.buscar_editais(q => $1, p_termos => $2, p_relacionados => $3, p_excluir => $4,
                                    p_ordem => 'relevancia', p_limite => 50)`,
      args,
    );
    const ms = Math.round(performance.now() - inicio);
    const pontos = rows.map((l) => pontuar({ termosObjeto: l.termos_objeto, termosItens: l.termos_itens, frase: l.frase }, b));
    conferir(rows.every((l, i) => l.pontuacao === pontos[i]), `${q}: pontuação do banco = pontuar (${rows.length} de ${rows[0]?.total ?? 0}, ${ms} ms)`);
    conferir(rows.every((l, i) => i === 0 || (rows[i - 1].pontuacao ?? 0) >= (l.pontuacao ?? 0)), `${q}: ordem por relevância não sobe`);
    const daBusca = new Set([...b.digitados, ...b.relacionados.map((r) => r.termo)]);
    conferir(rows.every((l) => [...l.termos_objeto, ...l.termos_itens].every((t) => daBusca.has(t))), `${q}: só termos da busca`);
    conferir(rows.every((l) => l.termos_objeto.length + l.termos_itens.length > 0), `${q}: todo edital tem um termo que bateu`);
    if (b.excluidos.length) {
      const { rows: r2 } = await cliente.query<{ n: number }>(
        `select count(*)::int as n
           from public.buscar_editais(q => $1, p_termos => $2, p_relacionados => $3, p_excluir => $4,
                                      p_ordem => 'prazo', p_limite => 100000) x
           join public.contratacoes c on c.id = x.id
          where c.busca @@ public.consulta_termos($4)`,
        args,
      );
      conferir(r2[0].n === 0, `${q}: nenhum edital com termo excluído no objeto`);
    }
  }
} finally {
  await cliente.end();
}
process.exit(falhou ? 1 : 0);
