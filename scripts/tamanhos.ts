export type Tamanho = { nome: string; bytes: number };

/** Tamanho do banco inteiro (linha 'banco') e de cada tabela de public, com índices e TOAST. */
export const SQL_TAMANHOS = `
select 'banco' as nome, pg_database_size(current_database()) as bytes
union all
select c.relname, pg_total_relation_size(c.oid)
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'`;

export function mb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export function formatarTamanhos(linhas: Tamanho[], metaMb = 300): string {
  const banco = linhas.find((l) => l.nome === 'banco');
  const tabelas = linhas.filter((l) => l.nome !== 'banco').sort((a, b) => b.bytes - a.bytes);
  const aviso = banco && banco.bytes > metaMb * 1024 * 1024 ? ` (acima da meta de ${metaMb} MB)` : '';
  return [`Banco: ${banco ? mb(banco.bytes) : '?'}${aviso}`, ...tabelas.map((t) => `  ${t.nome}: ${mb(t.bytes)}`)].join('\n');
}
