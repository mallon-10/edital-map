// Uso: npm run db:medir            → tamanho do banco e das tabelas
//      npm run db:medir -- --vacuum → mede, roda VACUUM FULL em contratacoes (fora de transação) e mede de novo
// Lê SUPABASE_DB_URL do .env (URI do Session pooler). Nunca imprime a URI.
// O VACUUM FULL trava a tabela contratacoes enquanto roda: não usar durante uma rodada do sync.
import { parseArgs } from 'node:util';
import '../worker/ambiente';
import { conectarBanco } from './banco-direto';
import { formatarTamanhos, SQL_TAMANHOS, type Tamanho } from './tamanhos';

const { values } = parseArgs({ options: { vacuum: { type: 'boolean', default: false } } });
const cliente = conectarBanco(process.env);

async function medir(titulo: string): Promise<void> {
  const { rows } = await cliente.query(SQL_TAMANHOS);
  const linhas: Tamanho[] = (rows as Array<{ nome: string; bytes: string | number }>).map((r) => ({
    nome: r.nome,
    bytes: Number(r.bytes),
  }));
  console.log(`[medir] ${titulo}\n${formatarTamanhos(linhas)}`);
}

await cliente.connect();
try {
  await medir(values.vacuum ? 'antes do VACUUM FULL' : 'agora');
  if (values.vacuum) {
    await cliente.query('set statement_timeout = 0');
    const inicio = Date.now();
    await cliente.query('vacuum (full, analyze) public.contratacoes');
    console.log(`[medir] VACUUM FULL em contratacoes: ${Math.round((Date.now() - inicio) / 1000)} s`);
    await medir('depois do VACUUM FULL');
  }
} finally {
  await cliente.end();
}
