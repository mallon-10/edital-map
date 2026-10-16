// Aplica um arquivo de supabase/migrations/ direto no Postgres, numa transação só, e registra no
// histórico do Supabase (supabase_migrations.schema_migrations), como o apply_migration faz.

export type ClienteSql = {
  query(texto: string, valores?: unknown[]): Promise<{ rows: unknown[] }>;
};

export type Migracao = { nome: string; sql: string; versao: string };

/** "supabase/migrations/0004_visual.sql" → "visual" (o histórico guarda o nome sem número). */
export function nomeDaMigracao(caminho: string): string {
  const arquivo = caminho.split(/[\\/]/).pop() ?? '';
  const m = arquivo.match(/^\d{4}_([a-z0-9_]+)\.sql$/);
  if (!m) throw new Error(`Arquivo de migração fora do padrão NNNN_nome.sql: ${arquivo}`);
  return m[1];
}

/** Versão no formato do histórico do Supabase: AAAAMMDDHHMMSS em UTC. */
export function versaoDe(data: Date): string {
  return data.toISOString().replace(/\D/g, '').slice(0, 14);
}

/** URI do banco (Session pooler) vinda do .env. As mensagens de erro nunca mostram o valor. */
export function lerUrlBanco(env: Record<string, string | undefined>): string {
  const valor = env.SUPABASE_DB_URL?.trim();
  if (!valor) {
    throw new Error(
      'Falta SUPABASE_DB_URL no .env: a URI do Session pooler (Supabase → Connect → Session pooler), com a senha do banco no lugar de [YOUR-PASSWORD].',
    );
  }
  let url: URL;
  try {
    url = new URL(valor);
  } catch {
    throw new Error('SUPABASE_DB_URL não é uma URI: deve começar com postgresql:// (Supabase → Connect → Session pooler).');
  }
  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    throw new Error('SUPABASE_DB_URL deve começar com postgresql:// (Supabase → Connect → Session pooler).');
  }
  if (!url.password || decodeURIComponent(url.password) === '[YOUR-PASSWORD]') {
    throw new Error('SUPABASE_DB_URL está sem a senha do banco: troque [YOUR-PASSWORD] pela senha.');
  }
  return valor;
}

/** Roda a migração e grava o histórico; já registrada → não roda de novo; erro → desfaz tudo. */
export async function aplicarMigracao(cliente: ClienteSql, m: Migracao): Promise<'aplicada' | 'ja-aplicada'> {
  await cliente.query('begin');
  try {
    const { rows } = await cliente.query(
      'select version from supabase_migrations.schema_migrations where name = $1',
      [m.nome],
    );
    if (rows.length > 0) {
      await cliente.query('rollback');
      return 'ja-aplicada';
    }
    await cliente.query(m.sql);
    await cliente.query(
      'insert into supabase_migrations.schema_migrations (version, name, statements) values ($1, $2, $3)',
      [m.versao, m.nome, [m.sql]],
    );
    await cliente.query('commit');
    return 'aplicada';
  } catch (erro) {
    await cliente.query('rollback').catch(() => undefined);
    throw erro;
  }
}
