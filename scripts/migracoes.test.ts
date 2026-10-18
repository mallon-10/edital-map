import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TIPOS_EVENTO, TIPOS_EVENTO_CONTA, TIPOS_EVENTO_SERVIDOR } from '../lib/eventos';
import { ORDENS } from '../lib/filtros';
import { PESOS } from '../lib/relevancia/pontuacao';
import { SITUACOES_FORA_DAS_ABERTAS } from '../lib/situacao';

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
    // 'assinou' nasce na 0015 (pagamento).
    for (const t of [...antes, ...TIPOS_EVENTO, ...TIPOS_EVENTO_SERVIDOR.filter((x) => x !== 'assinou')]) expect(depois).toContain(t);
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

describe('migração 0010 (período da lista de espera)', () => {
  const sql = ler('supabase/migrations/0010_lista_espera_periodo.sql');
  it('uma transação curta, só a coluna periodo (mensal por padrão, mensal ou anual)', () => {
    expect(sql).toContain("set local lock_timeout = '10s';");
    expect(sql).toContain('alter table public.lista_espera');
    expect(sql).toContain("add column periodo text not null default 'mensal'");
    expect(sql).toContain("constraint lista_espera_periodo_check check (periodo in ('mensal', 'anual'))");
    expect(sql).not.toMatch(/create |drop |grant |policy/i);
  });
});

/** Do `inicio` (ex.: "create function public.x(") até o `$$;` que fecha o corpo, com fim de linha \n. */
describe('migração 0014 (conta e Meu Radar)', () => {
  const sql = ler('supabase/migrations/0014_conta_radar.sql').replace(/\r\n/g, '\n');
  const corpo = (inicio: string) => {
    const c = corpoDe(sql, inicio);
    expect(c, inicio).not.toBe('');
    return c;
  };
  const NOVOS_ABERTAS = 'p_ibges text[] default null, p_valor_max numeric default null, p_so_me_epp boolean default null';

  it('uma transação curta e o PostgREST relê as funções no fim', () => {
    expect(sql).toContain("set local lock_timeout = '10s';");
    expect(sql.trimEnd().endsWith("notify pgrst, 'reload schema';")).toBe(true);
  });
  it('perfil: planos gratis, basic e pro e a última visita ao radar', () => {
    expect(sql).toContain('alter table public.perfis drop constraint perfis_plano_check;');
    expect(sql).toContain("add constraint perfis_plano_check check (plano in ('gratis', 'basic', 'pro'))");
    expect(sql).toContain('add column ultima_visita_radar timestamptz');
  });
  it('radar: colunas novas, checagens e um radar por conta', () => {
    for (const c of [
      "add column municipios text[] not null default '{}'",
      'add column valor_max numeric(16,2)',
      'add column so_me_epp boolean not null default false',
      'add column atualizado_em timestamptz not null default now()',
      'check (cardinality(termos) between 1 and 10)',
      'check (cardinality(termos_excluir) <= 10)',
      'check (cardinality(municipios) <= 50)',
      'check (cardinality(ufs) = 0 or cardinality(municipios) = 0)',
      'check (valor_min is null or valor_max is null or valor_min <= valor_max)',
      'create unique index radares_user_id_key on public.radares (user_id);',
    ]) {
      expect(sql).toContain(c);
    }
  });
  it('dados da conta só pelo servidor: sem políticas, RLS ligado, sem acesso de anon/authenticated', () => {
    for (const p of ['"perfil próprio" on public.perfis', '"radares próprios" on public.radares', '"salvos próprios" on public.salvos']) {
      expect(sql).toContain(`drop policy ${p};`);
    }
    expect(sql).not.toMatch(/create policy/i);
    for (const t of ['perfis', 'radares', 'salvos', 'alertas_enviados']) {
      expect(sql).toContain(`alter table public.${t} enable row level security;`);
      expect(sql).toContain(`revoke all on table public.${t} from public, anon, authenticated;`);
      expect(sql).toContain(`grant select, insert, update, delete on table public.${t} to service_role;`);
    }
  });
  it('as assinaturas antigas saem antes das novas', () => {
    const antigas = [
      'drop function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text);',
      'drop function public.abertas_unicas(tsquery, tsquery, text[], numeric, int[], text, text, int, int);',
    ];
    for (const d of antigas) {
      expect(sql).toContain(d);
      expect(sql.indexOf(d)).toBeLessThan(sql.indexOf('create function public.abertas_unicas('));
    }
  });
  it('abertas_unicas = corpo da 0011 + municípios, valor máximo e ME/EPP', () => {
    const c12 = corpo('create function public.abertas_unicas(');
    const c11 = corpoDe(ler('supabase/migrations/0011_busca_relevancia.sql'), 'create function public.abertas_unicas(');
    const filtros = [
      '    and (p_ibges is null or cardinality(p_ibges) = 0 or c.codigo_ibge = any(p_ibges))\n',
      '    and (p_valor_max is null or nullif(c.valor_estimado, 0) <= p_valor_max)\n',
      '    and (p_so_me_epp is not true or public.exclusivo_me_epp(c.itens_resumo))\n',
    ];
    for (const f of filtros) expect(c12).toContain(f);
    let semNovos = c12.replace(`p_dias int default null,\n                                      ${NOVOS_ABERTAS})`, 'p_dias int default null)');
    for (const f of filtros) semNovos = semNovos.replace(f, '');
    expect(semNovos).toBe(c11);
  });
  it('buscar_editais = corpo da 0011 com os filtros novos nas duas chamadas', () => {
    const c12 = corpo('create function public.buscar_editais(');
    const c11 = corpoDe(ler('supabase/migrations/0011_busca_relevancia.sql'), 'create function public.buscar_editais(');
    expect(c12.split('p_raio_km, p_dias, p_ibges, p_valor_max, p_so_me_epp)').length - 1).toBe(2);
    const semNovos = c12
      .replace(`p_ordem text default null,\n  ${NOVOS_ABERTAS})`, 'p_ordem text default null)')
      .replaceAll('p_raio_km, p_dias, p_ibges, p_valor_max, p_so_me_epp)', 'p_raio_km, p_dias)');
    expect(semNovos).toBe(c11);
  });
  it('ME/EPP com a regra da etiqueta do edital: todos os itens exclusivos', () => {
    const c = corpo('create function public.exclusivo_me_epp(');
    expect(c).toContain("coalesce((p_resumo ->> 'total')::int, 0) > 0");
    expect(c).toContain("coalesce((p_resumo ->> 'exclusivos')::int, 0) = (p_resumo ->> 'total')::int");
  });
  it('contagens do radar sobre a mesma abertas_unicas; prazo próximo = mesma conta de p_dias 7', () => {
    const c = corpo('create function public.radar_contagens(');
    expect(c).toContain('public.abertas_unicas(t.tq, t.tq_excluir, p_ufs, p_valor_min, p_modalidades, null, null, null, null, p_ibges, p_valor_max, p_so_me_epp)');
    expect(c).toContain('count(*) filter (where p_desde is not null and u.publicada_em > p_desde)');
    expect(c).toContain("(date_trunc('day', now() at time zone 'America/Sao_Paulo') + make_interval(days => 7 + 1)) at time zone 'America/Sao_Paulo'");
    expect(corpoDe(ler('supabase/migrations/0011_busca_relevancia.sql'), 'create function public.abertas_unicas(')).toContain(
      "(date_trunc('day', now() at time zone 'America/Sao_Paulo') + make_interval(days => p_dias + 1)) at time zone 'America/Sao_Paulo'",
    );
  });
  it('busca de município sem acento, por prefixo primeiro, até 20', () => {
    const c = corpo('create function public.buscar_municipios(');
    expect(c).toContain("public.sem_acento(m.nome) ilike public.sem_acento(q) || '%'");
    expect(c).toContain('limit least(greatest(coalesce(p_limite, 10), 1), 20)');
  });
  it('eventos: a restrição aceita os de antes e os da conta', () => {
    const tipos = (texto: string) => {
      const trecho = texto.slice(texto.indexOf('add constraint eventos_tipo_check'));
      return [...trecho.slice(0, trecho.indexOf(';')).matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    };
    const antes = tipos(ler('supabase/migrations/0009_limites_lista_espera.sql'));
    const depois = tipos(sql);
    // 'assinou' nasce na 0015 (pagamento).
    for (const t of [...antes, ...TIPOS_EVENTO, ...TIPOS_EVENTO_SERVIDOR.filter((x) => x !== 'assinou'), ...TIPOS_EVENTO_CONTA]) expect(depois).toContain(t);
  });
  it('só o servidor executa (cada assinatura)', () => {
    for (const f of [
      'exclusivo_me_epp(jsonb)',
      'abertas_unicas(tsquery, tsquery, text[], numeric, int[], text, text, int, int, text[], numeric, boolean)',
      'buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text, text[], numeric, boolean)',
      'radar_contagens(text[], text[], text[], text[], text[], numeric, numeric, int[], boolean, timestamptz)',
      'buscar_municipios(text, int)',
    ]) {
      expect(sql).toContain(`revoke execute on function public.${f} from public, anon, authenticated;`);
      expect(sql).toContain(`grant execute on function public.${f} to service_role;`);
    }
  });
});

function corpoDe(texto: string, inicio: string): string {
  const t = texto.replace(/\r\n/g, '\n');
  const i = t.indexOf(inicio);
  if (i < 0) return '';
  const abre = t.indexOf('$$', i);
  return t.slice(i, t.indexOf('$$;', abre + 2) + 3);
}

describe('migração 0011 (busca, relevância e situação)', () => {
  const sql = ler('supabase/migrations/0011_busca_relevancia.sql');
  const corpo = (inicio: string) => {
    const c = corpoDe(sql, inicio);
    expect(c, inicio).not.toBe('');
    return c;
  };

  it('uma transação curta e o PostgREST relê as funções no fim', () => {
    expect(sql).toContain("set local lock_timeout = '10s';");
    expect(sql.trimEnd().endsWith("notify pgrst, 'reload schema';")).toBe(true);
  });
  it('as assinaturas antigas saem antes das novas (o site no ar segue chamando sem os parâmetros novos)', () => {
    const antigas = [
      'drop function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int);',
      'drop function public.mapa_editais(text, text[], int, numeric, int[], text, text, int);',
      'drop function public.abertas_unicas(text, text[], numeric, int[], text);',
    ];
    for (const d of antigas) {
      expect(sql).toContain(d);
      expect(sql.indexOf(d)).toBeLessThan(sql.indexOf('create function public.buscar_editais('));
    }
    const busca = corpo('create function public.buscar_editais(');
    for (const p of ["p_termos text[] default null", "p_relacionados text[] default null", "p_excluir text[] default null", "p_ordem text default null"]) {
      expect(busca).toContain(p);
    }
    expect(busca).toContain('situacao_id int, pontuacao int, termos_objeto text[], termos_itens text[], frase boolean)');
    const mapa = corpo('create function public.mapa_editais(');
    for (const p of ["p_termos text[] default null", "p_relacionados text[] default null", "p_excluir text[] default null"]) {
      expect(mapa).toContain(p);
    }
  });
  it('aberta num lugar só: prazo no futuro e situação fora de revogada e anulada', () => {
    expect(corpo('create function public.em_aberto(')).toContain(
      `select p_encerramento > now() and coalesce(p_situacao, 0) not in (${SITUACOES_FORA_DAS_ABERTAS.join(', ')})`,
    );
    expect(sql.split('> now()').length - 1).toBe(1);
  });
  it('todas as funções que listam ou contam abertas usam em_aberto', () => {
    for (const f of [
      'create or replace function public.abertas(',
      'create function public.abertas_unicas(',
      'create or replace function public.orgaos_abertos(',
      'create or replace function public.relacionados(',
    ]) {
      expect(corpo(f)).toContain('public.em_aberto(');
    }
    for (const f of ['create function public.buscar_editais(', 'create function public.mapa_editais(']) {
      expect(corpo(f)).toContain('public.abertas_unicas(');
      expect(corpo(f)).toContain('public.termos_da_busca(q, p_termos)');
    }
  });
  it('abertas, orgaos_abertos e relacionados: o corpo de antes, só com em_aberto no lugar do prazo', () => {
    const igual = (novo: string, antigo: string, aberta: string, prazo: string) =>
      expect(novo.replace('create or replace function', 'create function').replace(aberta, prazo)).toBe(
        antigo.replace('create or replace function', 'create function'),
      );
    igual(
      corpo('create or replace function public.abertas('),
      corpoDe(ler('supabase/migrations/0005_palavras_itens.sql'), 'create or replace function public.abertas('),
      'public.em_aberto(c.encerramento_em, c.situacao_id)',
      'c.encerramento_em > now()',
    );
    igual(
      corpo('create or replace function public.orgaos_abertos('),
      corpoDe(ler('supabase/migrations/0007_recursos_pro.sql'), 'create function public.orgaos_abertos('),
      'public.em_aberto(c.encerramento_em, c.situacao_id)',
      'c.encerramento_em > now()',
    );
    igual(
      corpo('create or replace function public.relacionados('),
      corpoDe(ler('supabase/migrations/0008_relacionados_leve.sql'), 'create or replace function public.relacionados('),
      'public.em_aberto(a.encerramento_em, a.situacao_id)',
      'a.encerramento_em > now()',
    );
  });
  it('excluídos tiram pelo objeto; termos acham no objeto ou nas palavras dos itens', () => {
    const unicas = corpo('create function public.abertas_unicas(');
    expect(unicas).toContain('(p_tq is null or c.busca @@ p_tq or c.itens_palavras @@ p_tq)');
    expect(unicas).toContain('(p_tq_excluir is null or not c.busca @@ p_tq_excluir)');
    expect(unicas).toContain('(c.link_origem is null), c.atualizada_pncp_em desc, c.id');
  });
  it('pesos da pontuação iguais aos do site (PESOS)', () => {
    const p = corpo('create function public.pontuacao_busca(');
    expect(p).toContain(`select least(${PESOS.teto},`);
    expect(p).toContain(`case when p_digitado_objeto then ${PESOS.digitadoObjeto} else 0 end`);
    expect(p).toContain(`case when p_digitado_itens then ${PESOS.digitadoItens} else 0 end`);
    expect(p).toContain(`case when p_relacionado_objeto then ${PESOS.relacionadoObjeto} else 0 end`);
    expect(p).toContain(`case when p_relacionado_itens then ${PESOS.relacionadoItens} else 0 end`);
    expect(p).toContain(`+ case when p_frase then ${PESOS.frase} else 0 end`);
    expect(p).toContain(`+ ${PESOS.porTermo} * least(${PESOS.termosExtras}, greatest(0, coalesce(p_distintos, 0) - 1)))`);
  });
  it('acertos: termos dos itens são os que não estão no objeto; frase só dos digitados', () => {
    const a = corpo('create function public.acertos_busca(');
    expect(a).toContain('filter (where not coalesce(p_busca @@ u.tq, false) and p_itens @@ u.tq)');
    expect(a).toContain('coalesce(bool_or(p_busca @@ u.fr), false) as frase');
    expect(corpo('create function public.buscar_editais(')).toContain(
      'case when t.n <= cardinality(v_digitados) then public.consulta_frase(t.termo) end',
    );
  });
  it('ordens iguais às do site; relevância ordena todas, as outras só a página', () => {
    const b = corpo('create function public.buscar_editais(');
    expect(b).toContain(`p_ordem in (${ORDENS.map((o) => `'${o.id}'`).join(', ')})`);
    expect(b).toContain('order by a.pontuacao desc, u.encerramento_em, u.id');
    expect(b).toContain("case when v_ordem = 'recentes' then u.publicada_em end desc nulls last");
    expect(b).toContain("case when v_ordem = 'maior_valor' then nullif(u.valor_estimado, 0) end desc nulls last");
    expect(b).toContain("case when v_ordem = 'menor_valor' then nullif(u.valor_estimado, 0) end asc nulls last");
    expect(b).toContain('set plan_cache_mode = force_custom_plan');
  });
  it('só o servidor executa (cada assinatura)', () => {
    for (const f of [
      'em_aberto(timestamptz, int)',
      'termos_da_busca(text, text[])',
      'consulta_termos(text[])',
      'consulta_frase(text)',
      'pontuacao_busca(boolean, boolean, boolean, boolean, boolean, int)',
      'acertos_busca(tsvector, tsvector, text[], tsquery[], tsquery[], text[], text[])',
      'abertas(text, text[], numeric)',
      'abertas_unicas(tsquery, tsquery, text[], numeric, int[], text, text, int, int)',
      'buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text)',
      'mapa_editais(text, text[], int, numeric, int[], text, text, int, text[], text[], text[])',
      'orgaos_abertos(text, int)',
      'relacionados(text, int)',
    ]) {
      expect(sql).toContain(`revoke execute on function public.${f} from public, anon, authenticated;`);
      expect(sql).toContain(`grant execute on function public.${f} to service_role;`);
    }
  });
});

describe('migração 0015 (pagamento pela Cakto)', () => {
  const sql = ler('supabase/migrations/0015_pagamento.sql');
  const tipos = (texto: string) => {
    const trecho = texto.slice(texto.indexOf('add constraint eventos_tipo_check'));
    return [...trecho.slice(0, trecho.indexOf(';')).matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  };
  it('eventos.tipo ganha assinou sem perder nenhum tipo (inclusive os da Fase 3, 0014)', () => {
    const depois = tipos(sql);
    for (const t of [...TIPOS_EVENTO_CONTA, ...TIPOS_EVENTO, ...TIPOS_EVENTO_SERVIDOR]) {
      expect(depois).toContain(t);
    }
    expect(depois).toHaveLength(12);
  });
  it('tabelas só do servidor e retenção mantida', () => {
    for (const t of ['checkouts', 'assinaturas', 'assinatura_navegadores', 'cakto_eventos']) {
      expect(sql).toContain(`alter table public.${t} enable row level security;`);
    }
    expect(sql).toContain("where encerramento_em is null or encerramento_em < now() - interval '7 days'");
    expect(sql).toContain("delete from public.checkouts where criado_em < now() - interval '30 days';");
  });
});
