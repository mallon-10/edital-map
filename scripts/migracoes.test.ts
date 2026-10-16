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
    expect(sql).toContain('revoke execute on function public.resumo_itens(text) from public, anon, authenticated;');
    for (const funcao of [
      'gravar_resumo_itens(text, text, jsonb)',
      'buscar_editais(text, text[], text, int, numeric, int[], int, int)',
      'abertas(text, text[], numeric)',
      'resumo_itens(text)',
    ]) {
      expect(sql).toContain(`grant execute on function public.${funcao} to service_role;`);
    }
  });
  it('preenche só a janela de retenção, calculando antes de travar contratacoes', () => {
    expect(sql).toContain("set local lock_timeout = '10s';");
    expect(sql.match(/c\.encerramento_em > now\(\) - interval '7 days'/g)?.length).toBe(3);
    const travaContratacoes = sql.indexOf('alter table public.contratacoes');
    expect(sql.indexOf('create temp table palavras_0005 on commit drop')).toBeGreaterThan(-1);
    expect(sql.indexOf('create temp table palavras_0005 on commit drop')).toBeLessThan(travaContratacoes);
    expect(sql.indexOf('create temp table resumos_0005 on commit drop')).toBeGreaterThan(-1);
    expect(sql.indexOf('create temp table resumos_0005 on commit drop')).toBeLessThan(travaContratacoes);
    expect(sql).toContain("itens_palavras = coalesce(p.v, ''::tsvector)");
  });
  it('resumo_itens não quebra com criterios fora de formato', () => {
    expect(sql).toContain("case when jsonb_typeof(x.r -> 'criterios') = 'array'");
  });
});

describe('migração 0006 (retenção e agenda)', () => {
  const sql = ler('supabase/migrations/0006_retencao.sql');
  it('apaga todo dia as encerradas há mais de 7 dias e as sem prazo', () => {
    expect(sql).toContain("where encerramento_em is null or encerramento_em < now() - interval '7 days'");
    expect(sql).toContain("cron.schedule('retencao-contratacoes', '45 4 * * *', $$select public.aplicar_retencao()$$)");
  });
  it('remove a tabela itens sem cascade (algo inesperado dependendo dela faz a migração falhar)', () => {
    expect(sql).toContain('drop table public.itens;');
    expect(sql).not.toContain('cascade');
  });
  it('sync a cada 3 h no pg_cron (só altera se diferente) e no GitHub Actions', () => {
    expect(sql).toContain("schedule := '17 */3 * * *'");
    expect(sql).toContain("schedule is distinct from '17 */3 * * *'");
    expect(ler('.github/workflows/sync.yml')).toContain("- cron: '17 */3 * * *'");
  });
  it('só o servidor executa aplicar_retencao', () => {
    expect(sql).toContain('revoke execute on function public.aplicar_retencao() from public, anon, authenticated;');
    expect(sql).toContain('grant execute on function public.aplicar_retencao() to service_role;');
  });
  it('o site diz que atualiza a cada 3 horas', () => {
    expect(ler('app/sobre/page.tsx')).toContain('a cada 3 horas');
  });
});
