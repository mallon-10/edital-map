import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

describe('migração 0005 (palavras dos itens)', () => {
  const sql = ler('supabase/migrations/0005_palavras_itens.sql');
  it('usa a mesma configuração de texto de itens.busca (0001)', () => {
    expect(ler('supabase/migrations/0001_init.sql')).toContain("to_tsvector('portuguese', public.sem_acento(descricao))");
    expect(sql).toContain("strip(to_tsvector('portuguese', public.sem_acento(coalesce(p_palavras, ''))))");
  });
  it('a busca nos itens usa itens_palavras e a lista não devolve mais o trecho do item', () => {
    expect(sql).toContain('c.itens_palavras @@ t.tq');
    expect(sql).not.toContain('item_trecho');
  });
  it('só o servidor grava palavras e resumo e busca editais', () => {
    expect(sql).toContain('revoke execute on function public.gravar_resumo_itens(text, text, jsonb) from public, anon, authenticated;');
    expect(sql).toContain(
      'revoke execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int) from public, anon, authenticated;',
    );
    expect(sql).toContain('revoke execute on function public.abertas(text, text[], numeric) from public, anon, authenticated;');
    expect(sql).toContain('grant execute on function public.abertas(text, text[], numeric) to service_role;');
    expect(sql).toContain('revoke execute on function public.resumo_itens(text) from public, anon, authenticated;');
  });
});
