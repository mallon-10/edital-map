import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TIPOS_EVENTO, TIPOS_EVENTO_SERVIDOR } from '../lib/eventos';

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
  it('o workflow sincroniza o país inteiro (UFS: BR)', () => {
    expect(ler('.github/workflows/sync.yml')).toMatch(/UFS: BR\r?\n/);
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

describe('migração 0007 (recursos Pro)', () => {
  const sql = ler('supabase/migrations/0007_recursos_pro.sql');
  const NOVAS = [
    'abertas_unicas(text, text[], numeric, int[], text)',
    'municipios_no_raio(text, int)',
    'buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int)',
    'mapa_editais(text, text[], int, numeric, int[], text, text, int)',
    'orgaos_abertos(text, int)',
    'relacionados(text, int)',
  ];

  it('troca as assinaturas na mesma transação, com os parâmetros novos de padrão nulo', () => {
    expect(sql).toContain("set local lock_timeout = '10s';");
    for (const [antiga, nome] of [
      ['drop function public.buscar_editais(text, text[], text, int, numeric, int[], int, int);', 'buscar_editais'],
      ['drop function public.mapa_editais(text, text[], int, numeric, int[]);', 'mapa_editais'],
      ['drop function public.abertas_unicas(text, text[], numeric, int[]);', 'abertas_unicas'],
    ]) {
      expect(sql).toContain(antiga);
      expect(sql.indexOf(antiga)).toBeLessThan(sql.indexOf(`create function public.${nome}(`));
    }
    expect(sql).toContain('p_modalidades int[] default null, p_orgao text default null)');
    expect(sql).toContain('p_orgao text default null, p_raio_km int default null)');
    expect(sql).toContain('p_orgao text default null, p_ibge text default null, p_raio_km int default null)');
    expect(sql).toContain("notify pgrst, 'reload schema';");
  });
  it('o órgão filtra antes de tirar as duplicadas e a lista devolve o link de origem', () => {
    expect(sql).toContain('and (p_orgao is null or a.cnpj = p_orgao)');
    expect(sql).toContain('modalidade_nome text, srp boolean, link_origem text, onde text, total bigint)');
  });
  it('órgãos: o CNPJ abre o distinct on e o order by, como a lista filtrada por órgão', () => {
    expect(sql).toContain('select distinct on (c.cnpj, c.codigo_ibge, c.encerramento_em, c.valor_estimado, public.objeto_normalizado(c.objeto))');
    expect(sql).toContain('order by c.cnpj, c.codigo_ibge, c.encerramento_em, c.valor_estimado, public.objeto_normalizado(c.objeto),');
    expect(sql).toContain('abertas_unicas, orgaos_abertos, relacionados');
  });
  it('raio: haversine sobre municipios.lat/lng, a mesma regra na lista e no mapa', () => {
    expect(sql).toContain('2 * 6371 * asin(least(1, sqrt(');
    expect(sql.match(/u\.codigo_ibge in \(select public\.municipios_no_raio\(p_ibge, p_raio_km\)\)/g)?.length).toBe(2);
  });
  it('relacionados: palavras do objeto, só abertas, sem o próprio edital e sem duplicadas', () => {
    expect(sql).toContain("unnest(ts_filter(c.busca, '{a}')) u");
    expect(sql).toContain('limit 16) p) as tq');
    expect(sql).toContain('on a.encerramento_em > now()');
    expect(sql).toContain('and (a.busca @@ o.tq or a.itens_palavras @@ o.tq)');
    expect(sql).toContain('and a.id <> o.id');
    expect(sql).toContain('select distinct on (k.codigo_ibge, k.encerramento_em, k.valor_estimado, public.objeto_normalizado(k.objeto)) k.*');
    expect(sql).toContain('* (case when a.uf = o.uf then 2 else 1 end) as relevancia');
    expect(sql).toContain('order by x.relevancia desc, x.encerramento_em, x.id');
  });
  it('eventos aceitam usou_recurso', () => {
    expect(sql).toContain('alter table public.eventos drop constraint eventos_tipo_check;');
    expect(sql).toContain(
      "check (tipo in ('busca', 'abriu_edital', 'clicou_edital_oficial', 'pediu_alerta', 'quer_recurso', 'usou_recurso'));",
    );
  });
  it('só o servidor executa as funções novas e as trocadas', () => {
    for (const f of NOVAS) {
      expect(sql).toContain(`revoke execute on function public.${f} from public, anon, authenticated;`);
      expect(sql).toContain(`grant execute on function public.${f} to service_role;`);
    }
  });
});

describe('migração 0008 (relacionados mais leve)', () => {
  const sql = ler('supabase/migrations/0008_relacionados_leve.sql');
  it('a busca da origem é montada uma vez só, com até 8 palavras do objeto', () => {
    expect(sql).toContain("set local lock_timeout = '10s';");
    expect(sql).toContain('as materialized');
    expect(sql).toContain('limit 8');
    expect(sql).toContain("'^[a-z0-9]{3,}$'");
  });
  it('candidatas só pelo objeto; os itens só pesam na relevância', () => {
    expect(sql).toContain('a.busca @@ o.tq');
    expect(sql).not.toContain('a.itens_palavras @@ o.tq');
    expect(sql).toContain('ts_rank(coalesce(a.itens_palavras');
  });
  it('ordena primeiro e só então tira cópias e duplicadas (60 no máximo)', () => {
    expect(sql).toContain('limit 60');
    expect(sql.indexOf('limit 60')).toBeLessThan(sql.indexOf('select distinct on'));
  });
  it('mais palavras genéricas na lista', () => {
    for (const p of ['outros', 'outras', 'demais', 'kit', 'kits', 'conjunto', 'utilizacao', 'utilizar', 'aquisicao', 'contratacao', 'servicos']) {
      expect(sql).toMatch(new RegExp(`[' ]${p}[' ]`));
    }
  });
  it('só o servidor executa', () => {
    expect(sql).toContain('revoke execute on function public.relacionados(text, int) from public, anon, authenticated;');
    expect(sql).toContain('grant execute on function public.relacionados(text, int) to service_role;');
  });
});

describe('eventos e portão (recursos Pro)', () => {
  it('a restrição de eventos.tipo da 0007 aceita todos os tipos que o site grava', () => {
    const sql = ler('supabase/migrations/0007_recursos_pro.sql');
    const restricao = sql.slice(sql.indexOf('add constraint eventos_tipo_check'));
    for (const tipo of [...TIPOS_EVENTO, 'pediu_alerta']) expect(restricao).toContain(`'${tipo}'`);
  });
  it('o portão mostra usou_recurso por recurso, sem internos', () => {
    const portao = ler('docs/fase-2-portao.sql');
    expect(portao).toContain("where tipo = 'usou_recurso' and not interno and visitante not in (select visitante from internos)");
    expect(portao).toContain('as uso_por_recurso,');
  });
});

describe('migração 0009 (limites do grátis e lista de espera)', () => {
  const sql = ler('supabase/migrations/0009_limites_lista_espera.sql');
  const DIA_BRASILIA = "(now() at time zone 'America/Sao_Paulo')::date";

  it('uma transação curta e o PostgREST relê as funções no fim', () => {
    expect(sql).toContain("set local lock_timeout = '10s';");
    expect(sql.trimEnd().endsWith("notify pgrst, 'reload schema';")).toBe(true);
  });
  it('uso_diario: uma linha por visitante, dia, tipo e chave', () => {
    expect(sql).toContain('create table public.uso_diario (');
    expect(sql).toContain("tipo       text not null check (tipo in ('busca', 'edital')),");
    expect(sql).toContain('primary key (visitante, dia, tipo, chave)');
  });
  it('registrar_uso: trava por visitante e tipo antes de contar; repetir não conta; além do limite não grava', () => {
    expect(sql).toContain('create function public.registrar_uso(p_visitante uuid, p_tipo text, p_chave text, p_limite int)');
    expect(sql).toContain('returns table (permitido boolean, usados int)');
    const trava = sql.indexOf("perform pg_advisory_xact_lock(hashtextextended('uso_diario:' || p_visitante::text || ':' || p_tipo, 0));");
    const conta = sql.indexOf('select count(*)::int into v_usados');
    const repetida = sql.indexOf('return query select true, v_usados;');
    const recusada = sql.indexOf('return query select false, v_usados;');
    const grava = sql.indexOf('insert into public.uso_diario (visitante, dia, tipo, chave)');
    expect(trava).toBeGreaterThan(-1);
    expect(trava).toBeLessThan(conta);
    expect(conta).toBeLessThan(repetida);
    expect(repetida).toBeLessThan(recusada);
    expect(recusada).toBeLessThan(grava);
    expect(sql).toContain('return query select true, v_usados + 1;');
  });
  it('dia de Brasília no registro, no selo e na limpeza (e só nesses três lugares)', () => {
    expect(sql.split(DIA_BRASILIA).length - 1).toBe(3);
  });
  it('uso_do_dia devolve buscas e editais de hoje', () => {
    expect(sql).toContain('create function public.uso_do_dia(p_visitante uuid)');
    expect(sql).toContain('returns table (buscas int, editais int)');
  });
  it('lista_espera: plano basic ou pro, com o hash do IP para o limite de envios', () => {
    expect(sql).toContain("plano      text not null check (plano in ('basic', 'pro')),");
    expect(sql).toContain('create index lista_espera_ip_idx on public.lista_espera (ip_hash, criado_em);');
  });
  it('eventos.tipo ganha limite_atingido sem perder nenhum tipo da 0007', () => {
    const tipos = (texto: string) => {
      const trecho = texto.slice(texto.indexOf('add constraint eventos_tipo_check'));
      return [...trecho.slice(0, trecho.indexOf(';')).matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    };
    const antes = tipos(ler('supabase/migrations/0007_recursos_pro.sql'));
    const depois = tipos(sql);
    expect(antes).toHaveLength(6);
    for (const t of [...antes, ...TIPOS_EVENTO, ...TIPOS_EVENTO_SERVIDOR]) expect(depois).toContain(t);
    expect(depois).toContain('limite_atingido');
  });
  it('a retenção diária apaga o uso dos dias anteriores e continua apagando as contratações', () => {
    expect(sql).toContain('create or replace function public.aplicar_retencao()');
    expect(sql).toContain(`delete from public.uso_diario where dia < ${DIA_BRASILIA};`);
    expect(sql).toContain("where encerramento_em is null or encerramento_em < now() - interval '7 days'");
    expect(sql).not.toContain('cron.schedule');
  });
  it('só o servidor lê e grava', () => {
    for (const t of ['uso_diario', 'lista_espera']) {
      expect(sql).toContain(`alter table public.${t} enable row level security;`);
      expect(sql).toContain(`revoke all on table public.${t} from public, anon, authenticated;`);
      expect(sql).toContain(`grant select, insert, delete on table public.${t} to service_role;`);
    }
    for (const f of ['registrar_uso(uuid, text, text, int)', 'uso_do_dia(uuid)', 'aplicar_retencao()']) {
      expect(sql).toContain(`revoke execute on function public.${f} from public, anon, authenticated;`);
      expect(sql).toContain(`grant execute on function public.${f} to service_role;`);
    }
  });
});

describe('portão (limites do grátis)', () => {
  const portao = ler('docs/fase-2-portao.sql');
  it('mostra quem bateu no limite e a lista de espera, sem internos', () => {
    expect(portao).toContain("where tipo = 'limite_atingido' and not interno and visitante not in (select visitante from internos)");
    expect(portao).toContain('as limite_atingido_por_tipo,');
    expect(portao).toContain('select visitante from public.lista_espera where interno and visitante is not null');
    expect(portao).toContain('as lista_espera_por_plano;');
  });
});
