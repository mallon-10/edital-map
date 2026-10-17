# Edital Map · Fase 3 · Recursos Pro · plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quatro recursos Pro sem serviço externo, abertos a todos com a etiqueta "Pro": editais parecidos na página do edital, filtro por órgão comprador, filtro por raio em km a partir do município e exportação da busca para planilha (CSV), com o uso medido no evento `usou_recurso`.

**Architecture:** Uma migração só (`0007_recursos_pro.sql`) cria `relacionados`, `orgaos_abertos` e `municipios_no_raio`, troca `abertas_unicas`, `buscar_editais` e `mapa_editais` por versões com `p_orgao`/`p_raio_km` (padrão nulo, assinaturas antigas derrubadas na mesma transação, `buscar_editais` passa a devolver também `link_origem`) e amplia a restrição de `eventos.tipo`. O controlador aplica a 0007 logo depois da Task 1 (o site no ar continua funcionando) e mede `relacionados` no banco real antes de qualquer tela. No site, os filtros `orgao` e `raio` entram no ida-e-volta `FiltrosTela → paraParametros → lerFiltros → rpc`; as funções novas são lidas só pelo servidor (`lib/servidor/consultas.ts`, cache de 5 min); `/api/orgaos` e `/api/exportar` são rotas novas; o CSV é montado por funções puras em `lib/csv.ts`; os chips "Órgão" e "Raio", o círculo no mapa, o bloco "Editais parecidos abertos" e o botão "Exportar" vêm por último. Publicação só depois da 0007 aplicada.

**Tech Stack:** Next.js 16 (App Router) + React 19 + Tailwind 4 + maplibre-gl 6, @supabase/supabase-js 2, Postgres 15 do Supabase (PostgREST), vitest 3, TypeScript 5, Vercel CLI.

**Spec:** `docs/superpowers/specs/2026-10-17-fase-3-recursos-pro-design.md`

## Global Constraints

- Repositório na pasta atual (OneDrive, caminho com espaço e acento: sempre entre aspas). Git Bash. Trabalho no branch `recursos-pro`, criado do `main` no primeiro passo da Task 1.
- TDD com vitest: teste primeiro. `npm test` e `npm run typecheck` passam antes de cada commit; tasks que mexem em `app/` ou `components/` também rodam `npm run build`.
- Schema só muda com migração nova: esta etapa cria `supabase/migrations/0007_recursos_pro.sql` (e só se a medição pedir, `0008_relacionados_leve.sql`); não editar 0001–0006. Quem aplica é o controlador: `npm run db:aplicar -- supabase/migrations/0007_recursos_pro.sql` (uma transação só, `set local lock_timeout = '10s'`).
- Funções SQL novas ou trocadas: `revoke execute ... from public, anon, authenticated;` e `grant execute ... to service_role;` explícitos para cada assinatura. Parâmetros novos sempre com `default null`; a assinatura antiga sai (`drop function`) na mesma transação.
- "Aberta" = `encerramento_em > now()`. Duplicadas = mesma regra de `abertas_unicas` (mesmo `codigo_ibge`, `encerramento_em`, `valor_estimado` e `objeto_normalizado(objeto)`; fica a com link de origem, depois a atualizada por último, depois o menor id).
- Relacionados: até 6 (`p_limite int default 6`); palavras = lexemas do objeto (peso A de `busca`), as 16 primeiras na ordem do texto, com 3+ caracteres, sem número puro e sem as palavras de abertura burocrática; relevância = `ts_rank(busca)` + 0,3 × `ts_rank(itens_palavras)`, × 2 no mesmo UF; empate → prazo mais próximo; meta < 300 ms (`explain analyze`) com os ~34,5 mil abertos.
- Órgão: filtro por `contratacoes.cnpj` (CNPJ do órgão comprador; a spec chama de `orgao_cnpj`). Parâmetro `orgao` = 14 caracteres `^[0-9A-Z]{12}\d{2}$` (CNPJ numérico ou alfanumérico, como `SLUG_EDITAL`). Busca de órgãos: termo com 3+ letras, sem `%`, `_`, `\`, até 60 caracteres; até 20 órgãos, nome por `nomeProprio`, ordenados pela quantidade de abertos.
- Raio: `RAIOS_KM = [50, 100, 200]`; parâmetro `raio` só vale com `ibge`; haversine com raio da Terra 6.371 km sobre `municipios.lat/lng`. O mapa recebe a cidade só junto com o raio (a cidade sozinha continua não filtrando o mapa).
- Exportar: `/api/exportar` com os parâmetros de `/api/busca`, desde o começo, até `MAX_EXPORTACAO = 2000` (páginas de 1.000, o teto do PostgREST); CSV com BOM UTF-8, separador `;`, fim de linha CRLF, arquivo `editais-AAAA-MM-DD.csv` (data de Brasília); colunas Título (`assunto`), Objeto completo (`textoLimpo`), Órgão (`nomeProprio`), Município, UF, Modalidade (`modalidadeCurta`), Valor estimado (`1234,50`; nulo ou 0 = "Valor não informado"), Prazo das propostas (`dd/mm/aaaa hh:mm`, Brasília), Publicado em (`dd/mm/aaaa`), Link do edital (`linkOficial`). Limite: 20 exportações por hora por IP (`LIMITES.exportacoesPorHora`), contando os eventos `exportou`.
- Eventos: tipo novo `usou_recurso` com `recurso` em `relacionados_clique` (com `edital` = slug de origem), `filtro_orgao`, `filtro_raio` (sem edital) e `exportou` (gravado só pela rota `/api/exportar`, com `total`). O portão (`docs/fase-2-portao.sql`) mostra `usou_recurso` por recurso.
- Etiqueta "Pro" = o mesmo "· Pro" do chip de hoje (`components/EtiquetaPro.tsx`), nos chips Órgão e Raio, no botão Exportar e no título do bloco de parecidos. Sem cadeado (entra na etapa de Planos).
- Recorrência fica fora (Fase 4); o texto do chip deixa de citá-la.
- `SUPABASE_SERVICE_ROLE_KEY` nunca vai para o navegador nem para o git. Dados do site só pelo servidor (`lib/servidor/*`, `import 'server-only'`), cache de 5 min (`criarCache`).
- Interface em português do Brasil. Textos do PNCP só passam por `lib/texto.ts` (`assunto`, `textoLimpo`, `nomeProprio`).
- Não rodar `worker:*`, não chamar o PNCP e não tocar no banco, exceto nos passos marcados **(controlador)**. Conferências manuais com `npm run dev` leem o banco de produção e gravam eventos nele: antes de clicar, abrir `http://localhost:3000/sobre?interno=1` no navegador usado (e mandar `cookie: em_interno=1` nos `curl` que gravam eventos).
- Todo commit termina com `Co-Authored-By: <nome do modelo que escreveu o commit> <noreply@anthropic.com>` (nos comandos abaixo, `<modelo>`).

## Ordem de publicação (perigos)

| Momento | Ordem obrigatória | O que quebra se inverter |
|---|---|---|
| 0007 | Task 2: `npm run db:aplicar -- supabase/migrations/0007_recursos_pro.sql` → conferir o site no ar (`/api/busca`, `/api/mapa`, página de edital com 200) → conferências do banco. Só depois, Task 13: `vercel deploy --prod --yes`. | Site novo antes da 0007: `/api/busca`, `/api/mapa` e `/api/exportar` mandam `p_orgao`/`p_raio_km`, o PostgREST não acha a função e lista e mapa quebram (502); `/api/orgaos` dá 502; o bloco de parecidos some; eventos `usou_recurso` batem na restrição antiga de `eventos.tipo` (500 silencioso). |
| 0007 aplicada, site antigo no ar | Nada a fazer: o site antigo chama `buscar_editais`/`mapa_editais` sem os parâmetros novos (padrão nulo) e ignora a coluna `link_origem` a mais. | Se a assinatura antiga ficasse (sem o `drop` na mesma transação), o PostgREST veria duas candidatas para a mesma chamada ("Could not choose the best candidate function") e a busca do site no ar quebraria. |
| Medição | Task 2, Step 6: `relacionados` acima de 300 ms → `0008_relacionados_leve.sql` (Task 2, Step 7) antes de seguir para a Task 5. | Tela feita sobre uma função lenta: a página do edital espera os parecidos a cada visita fora do cache. |
| Sempre | `db:aplicar` fora de uma rodada do sync (`gh run list --workflow sync.yml --limit 1`: nenhuma `in_progress`). | `lock_timeout` de 10 s estoura se o sync estiver gravando em `eventos`/`contratacoes` na mesma hora; a migração inteira volta atrás (nada parcial). |
| Merge | Task 14, depois da publicação. O worker não usa nenhuma das funções trocadas. | Nada quebra; o merge só precisa vir depois de a publicação ser conferida. |

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/0007_recursos_pro.sql` (novo) | `abertas_unicas`/`buscar_editais`/`mapa_editais` com `p_orgao`/`p_raio_km`, `municipios_no_raio`, `orgaos_abertos`, `relacionados`, restrição de `eventos.tipo` com `usou_recurso` |
| `scripts/migracoes.test.ts` | Guardas de texto da 0007 (assinaturas, padrões, permissões, haversine, eventos) e do portão |
| `docs/fase-3-recursos-pro.sql` (novo) | Conferências do controlador (permissões, raio de Joinville, órgão, relacionados, tempo) |
| `docs/fase-3-metricas.md` | Seção "Recursos Pro" com os tempos medidos (controlador) |
| `lib/tipos.ts` | `FiltrosBusca`/`FiltrosTela` com `orgao` e `raio`; `Orgao`, `OrgaoAberto`, `EditalRelacionado`, `EditalExportado` |
| `lib/filtros.ts` | `RAIOS_KM`, `orgao`/`raio` em `lerFiltros`/`chaveFiltros`/`paraParametros`, `normalizarTela`, `recursosUsados`, `lerTermoOrgao` |
| `lib/eventos.ts` | `usou_recurso`, `RECURSOS_USADOS`, `LIMITES.exportacoesPorHora` |
| `lib/csv.ts` (novo) | `MAX_EXPORTACAO`, `COLUNAS`, `celula`, datas e valor no formato brasileiro, `gerarCsv`, `nomeArquivo` |
| `lib/geo.ts` | `Raio`, `distanciaKm`, `circulo`, `limitesDoCirculo`, `areaDoRaio` |
| `lib/servidor/consultas.ts` | Argumentos novos da busca e do mapa; `relacionados`, `orgaosAbertos`, `exportarEditais` |
| `lib/servidor/registro.ts` | `exportacaoDentroDoLimite` |
| `app/api/orgaos/route.ts`, `app/api/exportar/route.ts` (novos) | Busca de órgãos; download do CSV |
| `app/edital/[slug]/page.tsx`, `components/edital/Relacionados.tsx`, `components/edital/LinkRelacionado.tsx` (novos) | Bloco "Editais parecidos abertos" |
| `components/EtiquetaPro.tsx` (novo) | Etiqueta "· Pro" |
| `components/inicio/Chips.tsx`, `components/inicio/PainelOrgao.tsx` (novo) | Chips "Órgão" e "Raio" |
| `components/inicio/BotaoExportar.tsx` (novo), `components/inicio/Icones.tsx`, `components/inicio/ColunaLista.tsx` | Botão "Exportar"; pílula da cidade com o raio |
| `components/Explorador.tsx`, `components/Mapa.tsx` | Filtros novos, eventos, círculo do raio |
| `docs/fase-2-portao.sql` | `uso_por_recurso` |
| `CLAUDE.md`, spec §5 | Documentação e aceite |

---

### Task 1: Migração `0007` (relacionados, órgão, raio, `usou_recurso`)

**Files:**
- Create: `supabase/migrations/0007_recursos_pro.sql`, `docs/fase-3-recursos-pro.sql`
- Modify: `scripts/migracoes.test.ts`

**Interfaces:**
- Consumes: `public.abertas(q, p_ufs, p_valor_min)` (0005), `public.objeto_normalizado(text)` (0003), `public.consulta(text)` e `public.sem_acento(text)` (0001), `contratacoes.busca`/`itens_palavras`/`cnpj`, `municipios(codigo_ibge, lat, lng)`, restrição `eventos_tipo_check` (0003).
- Produces (SQL, só o `service_role` executa):
  - `abertas_unicas(q text, p_ufs text[] default null, p_valor_min numeric default null, p_modalidades int[] default null, p_orgao text default null) returns setof contratacoes`
  - `municipios_no_raio(p_ibge text, p_raio_km int) returns setof text`
  - `buscar_editais(q, p_ufs, p_ibge, p_dias, p_valor_min, p_modalidades, p_limite default 50, p_deslocamento default 0, p_orgao text default null, p_raio_km int default null) returns table (id, slug, objeto, orgao_nome, unidade_nome, municipio_nome, uf, codigo_ibge, valor_estimado, encerramento_em, publicada_em, modalidade_nome, srp, link_origem, onde, total)`
  - `mapa_editais(q, p_ufs, p_dias, p_valor_min, p_modalidades, p_orgao text default null, p_ibge text default null, p_raio_km int default null)` com as mesmas colunas da 0004.
  - `orgaos_abertos(q text, p_limite int default 20) returns table (cnpj text, nome text, uf text, qtd bigint)`
  - `relacionados(p_id text, p_limite int default 6) returns table (id, slug, objeto, orgao_nome, municipio_nome, uf, valor_estimado, encerramento_em, publicada_em, modalidade_nome, srp)`
  - `eventos.tipo` aceita `usou_recurso`.

- [ ] **Step 1: Criar o branch**

```bash
git checkout main
git pull --ff-only
git checkout -b recursos-pro
```

- [ ] **Step 2: Escrever o teste (falhando)**

Acrescente ao fim de `scripts/migracoes.test.ts`:
```ts
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
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run scripts/migracoes.test.ts`
Expected: FAIL — `ENOENT: no such file or directory` em `0007_recursos_pro.sql` (os testes da 0005 e 0006 continuam passando).

- [ ] **Step 4: Escrever a migração**

`supabase/migrations/0007_recursos_pro.sql`:
```sql
-- Edital Map · Fase 3 · Recursos Pro: editais parecidos (relacionados), filtro por órgão (orgaos_abertos e p_orgao),
-- filtro por raio em km (municipios_no_raio e p_raio_km) e o evento usou_recurso.
-- Os parâmetros novos têm padrão nulo e as assinaturas antigas saem nesta mesma transação: o site no ar, que chama
-- buscar_editais e mapa_editais sem eles, continua funcionando logo depois (e o PostgREST não fica com duas candidatas).
-- Ordem: esta migração → conferências (docs/fase-3-recursos-pro.sql) → vercel deploy --prod.
-- Aplicar com npm run db:aplicar (uma transação só).

set local lock_timeout = '10s';

-- Assinaturas antigas saem antes (parâmetros novos mudam a identidade da função).
drop function public.buscar_editais(text, text[], text, int, numeric, int[], int, int);
drop function public.mapa_editais(text, text[], int, numeric, int[]);
drop function public.abertas_unicas(text, text[], numeric, int[]);

-- Abertas sem duplicadas, agora também por órgão (contratacoes.cnpj, o CNPJ do órgão comprador).
-- O órgão filtra antes de tirar as duplicadas: a cópia que fica é sempre a do órgão escolhido.
-- Fica a que tem link de origem; empate → atualizada por último; empate → menor id.
create function public.abertas_unicas(q text, p_ufs text[] default null, p_valor_min numeric default null,
                                      p_modalidades int[] default null, p_orgao text default null)
returns setof public.contratacoes language sql stable as $$
  select distinct on (a.codigo_ibge, a.encerramento_em, a.valor_estimado, public.objeto_normalizado(a.objeto)) a.*
  from public.abertas(q, p_ufs, p_valor_min) a
  where (p_modalidades is null or cardinality(p_modalidades) = 0 or a.modalidade_id = any(p_modalidades))
    and (p_orgao is null or a.cnpj = p_orgao)
  order by a.codigo_ibge, a.encerramento_em, a.valor_estimado, public.objeto_normalizado(a.objeto),
           (a.link_origem is null), a.atualizada_pncp_em desc, a.id
$$;

-- Municípios cuja sede está a até p_raio_km km da sede de p_ibge, inclusive ele mesmo
-- (haversine sobre municipios.lat/lng, raio da Terra 6.371 km; a mesma conta de lib/geo.ts).
create function public.municipios_no_raio(p_ibge text, p_raio_km int)
returns setof text language sql stable as $$
  select m.codigo_ibge
  from public.municipios c
  cross join public.municipios m
  where c.codigo_ibge = p_ibge
    and 2 * 6371 * asin(least(1, sqrt(
          power(sin(radians(m.lat - c.lat) / 2), 2)
          + cos(radians(c.lat)) * cos(radians(m.lat)) * power(sin(radians(m.lng - c.lng) / 2), 2)))) <= p_raio_km
$$;

-- Lista: bloco objeto, depois bloco itens; dentro de cada bloco, prazo mais próximo.
-- Município: só ele; com p_raio_km, todos cuja sede está dentro do raio. Devolve também link_origem (planilha).
create function public.buscar_editais(
  q text default null, p_ufs text[] default null, p_ibge text default null, p_dias int default null,
  p_valor_min numeric default null, p_modalidades int[] default null,
  p_limite int default 50, p_deslocamento int default 0,
  p_orgao text default null, p_raio_km int default null)
returns table (id text, slug text, objeto text, orgao_nome text, unidade_nome text, municipio_nome text, uf text,
               codigo_ibge text, valor_estimado numeric, encerramento_em timestamptz, publicada_em timestamptz,
               modalidade_nome text, srp boolean, link_origem text, onde text, total bigint)
language sql stable as $$
  with t as (select public.consulta(q) as tq),
  base as (
    select u.id, u.slug, u.objeto, u.orgao_nome, u.unidade_nome, u.municipio_nome, u.uf, u.codigo_ibge,
           u.valor_estimado, u.encerramento_em, u.publicada_em, u.modalidade_nome, u.srp, u.link_origem,
           case when t.tq is null or u.busca @@ t.tq then 'objeto' else 'itens' end as onde_
    from public.abertas_unicas(q, p_ufs, p_valor_min, p_modalidades, p_orgao) u, t
    where (p_ibge is null
           or (p_raio_km is null and u.codigo_ibge = p_ibge)
           or (p_raio_km is not null and u.codigo_ibge in (select public.municipios_no_raio(p_ibge, p_raio_km))))
      -- p_dias conta dias de calendário de Brasília (até o fim do dia hoje + p_dias), como o prazo do card.
      and (p_dias is null or u.encerramento_em < (date_trunc('day', now() at time zone 'America/Sao_Paulo') + make_interval(days => p_dias + 1)) at time zone 'America/Sao_Paulo')
  )
  select b.id, b.slug, b.objeto, b.orgao_nome, b.unidade_nome, b.municipio_nome, b.uf, b.codigo_ibge,
         b.valor_estimado, b.encerramento_em, b.publicada_em, b.modalidade_nome, b.srp, b.link_origem, b.onde_,
         count(*) over ()
  from base b
  order by (b.onde_ = 'itens'), b.encerramento_em, b.id
  limit p_limite offset p_deslocamento
$$;

-- Mapa: um ponto por município sobre as abertas sem duplicadas. Mesma regra de município da lista
-- (o site só manda p_ibge ao mapa junto com o raio: a cidade sozinha não filtra o mapa).
create function public.mapa_editais(q text default null, p_ufs text[] default null, p_dias int default null,
                                    p_valor_min numeric default null, p_modalidades int[] default null,
                                    p_orgao text default null, p_ibge text default null, p_raio_km int default null)
returns table (codigo_ibge text, nome text, uf text, lat double precision, lng double precision,
               qtd bigint, valor_total numeric, prazo_mais_proximo timestamptz)
language sql stable as $$
  select m.codigo_ibge, m.nome, m.uf, m.lat, m.lng,
         count(*), sum(nullif(u.valor_estimado, 0)), min(u.encerramento_em)
  from public.abertas_unicas(q, p_ufs, p_valor_min, p_modalidades, p_orgao) u
  join public.municipios m on m.codigo_ibge = u.codigo_ibge
  where (p_dias is null or u.encerramento_em < (date_trunc('day', now() at time zone 'America/Sao_Paulo') + make_interval(days => p_dias + 1)) at time zone 'America/Sao_Paulo')
    and (p_ibge is null
         or (p_raio_km is null and u.codigo_ibge = p_ibge)
         or (p_raio_km is not null and u.codigo_ibge in (select public.municipios_no_raio(p_ibge, p_raio_km))))
  group by m.codigo_ibge, m.nome, m.uf, m.lat, m.lng
  order by m.codigo_ibge
$$;

-- Órgãos com editais abertos (sem duplicadas) cujo nome contém o termo, sem acento e sem diferença de maiúsculas.
-- O site limpa o termo antes (3+ letras, sem % _ \, até 60 caracteres). Mais editais primeiro.
create function public.orgaos_abertos(q text, p_limite int default 20)
returns table (cnpj text, nome text, uf text, qtd bigint)
language sql stable as $$
  with achadas as (
    select distinct on (c.codigo_ibge, c.encerramento_em, c.valor_estimado, public.objeto_normalizado(c.objeto))
           c.cnpj, c.orgao_nome, c.uf
    from public.contratacoes c
    where c.encerramento_em > now()
      and public.sem_acento(c.orgao_nome) ilike '%' || public.sem_acento(q) || '%'
    order by c.codigo_ibge, c.encerramento_em, c.valor_estimado, public.objeto_normalizado(c.objeto),
             (c.link_origem is null), c.atualizada_pncp_em desc, c.id
  )
  select a.cnpj, max(a.orgao_nome), mode() within group (order by a.uf), count(*)
  from achadas a
  group by a.cnpj
  order by count(*) desc, max(a.orgao_nome), a.cnpj
  limit p_limite
$$;

-- Editais parecidos abertos. As palavras do objeto do edital (peso A de busca; as 16 primeiras na ordem do texto,
-- com 3+ caracteres, sem número puro e sem as palavras de abertura burocrática) viram uma busca "qualquer uma delas".
-- Relevância = ts_rank no objeto + 0,3 × ts_rank nas palavras dos itens, em dobro no mesmo UF; empate → prazo mais
-- próximo. Sem o próprio edital, sem as cópias dele e sem duplicadas (mesma regra de abertas_unicas).
create function public.relacionados(p_id text, p_limite int default 6)
returns table (id text, slug text, objeto text, orgao_nome text, municipio_nome text, uf text, valor_estimado numeric,
               encerramento_em timestamptz, publicada_em timestamptz, modalidade_nome text, srp boolean)
language sql stable as $$
  with genericas as (
    select tsvector_to_array(to_tsvector('portuguese',
      'contratacao contratar empresa empresas especializada especializado aquisicao aquisicoes registro precos preco '
      || 'futura futuras eventual eventuais fornecimento fornecer servico servicos prestacao objeto municipio municipal '
      || 'secretaria atender atendimento necessidade necessidades conforme termo referencia edital anexo lote lotes '
      || 'item itens quantidade quantidades demanda destinado destinada destinados destinadas visando material '
      || 'materiais diversos diversas geral gerais unidade unidades publica publico estadual federal especificacoes '
      || 'condicoes estabelecidas constantes parcelada parcelado entrega tipo')) as lexemas
  ),
  origem as (
    select c.id, c.uf, c.codigo_ibge, c.encerramento_em, c.valor_estimado,
           public.objeto_normalizado(c.objeto) as objeto_norm,
           (select string_agg(p.lexeme, ' | ')::tsquery
              from (select u.lexeme
                      from unnest(ts_filter(c.busca, '{a}')) u, genericas g
                     where u.lexeme ~ '^[a-z0-9]{3,}$'
                       and u.lexeme !~ '^[0-9]+$'
                       and u.lexeme <> all (g.lexemas)
                     order by u.positions[1]
                     limit 16) p) as tq
    from public.contratacoes c
    where c.id = p_id
  ),
  candidatas as (
    select a.*,
           (ts_rank(a.busca, o.tq) + 0.3 * ts_rank(coalesce(a.itens_palavras, ''::tsvector), o.tq))
             * (case when a.uf = o.uf then 2 else 1 end) as relevancia
    from origem o
    join public.contratacoes a
      on a.encerramento_em > now()
     and (a.busca @@ o.tq or a.itens_palavras @@ o.tq)
    where o.tq is not null
      and a.id <> o.id
      -- Cópia do próprio edital (mesma regra de duplicada de abertas_unicas) também não conta.
      and not (a.codigo_ibge is not distinct from o.codigo_ibge
               and a.encerramento_em = o.encerramento_em
               and a.valor_estimado is not distinct from o.valor_estimado
               and public.objeto_normalizado(a.objeto) = o.objeto_norm)
  ),
  unicas as (
    select distinct on (k.codigo_ibge, k.encerramento_em, k.valor_estimado, public.objeto_normalizado(k.objeto)) k.*
    from candidatas k
    order by k.codigo_ibge, k.encerramento_em, k.valor_estimado, public.objeto_normalizado(k.objeto),
             (k.link_origem is null), k.atualizada_pncp_em desc, k.id
  )
  select x.id, x.slug, x.objeto, x.orgao_nome, x.municipio_nome, x.uf, x.valor_estimado, x.encerramento_em,
         x.publicada_em, x.modalidade_nome, x.srp
  from unicas x
  order by x.relevancia desc, x.encerramento_em, x.id
  limit p_limite
$$;

-- Evento novo: usou_recurso (relacionados_clique, filtro_orgao, filtro_raio, exportou).
alter table public.eventos drop constraint eventos_tipo_check;
alter table public.eventos add constraint eventos_tipo_check
  check (tipo in ('busca', 'abriu_edital', 'clicou_edital_oficial', 'pediu_alerta', 'quer_recurso', 'usou_recurso'));

-- Só o servidor (service_role) executa.
revoke execute on function public.abertas_unicas(text, text[], numeric, int[], text) from public, anon, authenticated;
revoke execute on function public.municipios_no_raio(text, int) from public, anon, authenticated;
revoke execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int) from public, anon, authenticated;
revoke execute on function public.mapa_editais(text, text[], int, numeric, int[], text, text, int) from public, anon, authenticated;
revoke execute on function public.orgaos_abertos(text, int) from public, anon, authenticated;
revoke execute on function public.relacionados(text, int) from public, anon, authenticated;
grant execute on function public.abertas_unicas(text, text[], numeric, int[], text) to service_role;
grant execute on function public.municipios_no_raio(text, int) to service_role;
grant execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int) to service_role;
grant execute on function public.mapa_editais(text, text[], int, numeric, int[], text, text, int) to service_role;
grant execute on function public.orgaos_abertos(text, int) to service_role;
grant execute on function public.relacionados(text, int) to service_role;

-- O PostgREST relê as funções no commit (o Supabase também relê sozinho depois de DDL; aqui fica explícito).
notify pgrst, 'reload schema';
```

- [ ] **Step 5: Escrever as conferências do controlador**

`docs/fase-3-recursos-pro.sql`:
```sql
-- Edital Map · Fase 3 · Recursos Pro: conferências do controlador (0007).
-- Rodar no SQL Editor do Supabase (projeto edital-map) ou com execute_sql. Uma seção por vez.

-- ── [P0] Antes da 0007: nome da restrição de tipo de eventos. Esperado: eventos_tipo_check.
select conname from pg_constraint where conrelid = 'public.eventos'::regclass and contype = 'c';

-- ── [P1] Depois da 0007: permissões. Esperado: anon e autenticado false, servico true, nas 6 linhas.
select f,
       has_function_privilege('anon', f, 'execute') as anon,
       has_function_privilege('authenticated', f, 'execute') as autenticado,
       has_function_privilege('service_role', f, 'execute') as servico
from unnest(array[
  'public.abertas_unicas(text, text[], numeric, int[], text)',
  'public.municipios_no_raio(text, int)',
  'public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int)',
  'public.mapa_editais(text, text[], int, numeric, int[], text, text, int)',
  'public.orgaos_abertos(text, int)',
  'public.relacionados(text, int)']) as f;

-- ── [P2] Uma assinatura só por função (as antigas saíram). Esperado: 3 linhas, com p_orgao nas três.
select p.proname, pg_get_function_identity_arguments(p.oid) as argumentos
from pg_proc p
where p.pronamespace = 'public'::regnamespace and p.proname in ('abertas_unicas', 'buscar_editais', 'mapa_editais')
order by 1;

-- ── [P3] Raio de 100 km a partir de Joinville (4209102).
-- Esperado: blumenau true, florianopolis false, joinville true.
select '4202404' in (select public.municipios_no_raio('4209102', 100)) as blumenau,
       '4205407' in (select public.municipios_no_raio('4209102', 100)) as florianopolis,
       '4209102' in (select public.municipios_no_raio('4209102', 100)) as joinville,
       (select count(*) from public.municipios_no_raio('4209102', 100)) as municipios_no_raio;
-- Lista com raio: editais de vários municípios vizinhos, nenhum de Florianópolis. Anotar os 5 primeiros.
select municipio_nome, count(*) as editais
from public.buscar_editais(p_ibge => '4209102', p_raio_km => 100, p_limite => 2000)
group by 1 order by 2 desc;
-- Tempo da lista e do mapa com raio (anotar "Execution Time").
explain (analyze, buffers) select * from public.buscar_editais(p_ibge => '4209102', p_raio_km => 100);
explain (analyze, buffers) select * from public.mapa_editais(p_ibge => '4209102', p_raio_km => 100);

-- ── [P4] Órgão. Esperado: a lista traz órgãos com "joinville" no nome, o de mais editais primeiro.
explain (analyze) select * from public.orgaos_abertos('joinville');
select * from public.orgaos_abertos('joinville');
-- Trocar <cnpj> pelo primeiro da lista acima. Esperado: orgaos = 1; total = qtd da lista; soma do mapa = total.
select count(distinct split_part(slug, '-', 1)) as orgaos, max(total) as total
from public.buscar_editais(p_orgao => '<cnpj>', p_limite => 2000);
select sum(qtd) as soma_mapa from public.mapa_editais(p_orgao => '<cnpj>');
-- Termo amplo (o pior caso da busca de órgãos). Anotar o tempo.
explain (analyze) select * from public.orgaos_abertos('prefeitura');

-- ── [P5] Relacionados. Três editais abertos: um de EPI, um de objeto longo, um qualquer.
select id, slug, left(objeto, 120) as objeto
from public.contratacoes
where encerramento_em > now() and busca @@ public.consulta('luva nitrilica, EPI, botina')
order by encerramento_em limit 5;
select id, slug, length(objeto) as tamanho from public.contratacoes
where encerramento_em > now() order by length(objeto) desc limit 3;
-- Trocar <id> por cada um. Esperado: até 6 linhas, nenhuma com o próprio id, objetos parecidos
-- (no de EPI: luvas, botinas, uniformes, EPI); os do mesmo UF tendem a vir primeiro.
select * from public.relacionados('<id>');
-- Tempo: meta abaixo de 300 ms em "Execution Time" nos três. Rodar cada um duas vezes e anotar a segunda.
explain (analyze, buffers) select * from public.relacionados('<id>');

-- ── [P6] eventos aceita usou_recurso (desfeito no fim: nada fica gravado). Esperado: INSERT 0 1, sem erro.
begin;
insert into public.eventos (visitante, tipo, detalhe, interno)
values (gen_random_uuid(), 'usou_recurso', '{"recurso": "filtro_raio"}', true);
rollback;

-- ── [P7] Depois da publicação: eventos usou_recurso por recurso (inclusive os internos do controlador).
select detalhe ->> 'recurso' as recurso, interno, count(*) from public.eventos
where tipo = 'usou_recurso' group by 1, 2 order by 1, 2;
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run scripts/migracoes.test.ts`
Expected: PASS (os testes da 0005 e 0006 + 6 testes da 0007).

- [ ] **Step 7: Commit**

```bash
npm test && npm run typecheck
git add supabase/migrations/0007_recursos_pro.sql scripts/migracoes.test.ts docs/fase-3-recursos-pro.sql
git commit -m "feat: migração 0007 com relacionados, filtros por órgão e raio e evento usou_recurso" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

Não aplicar agora: quem aplica é o controlador, na Task 2.

---

### Task 2 (controlador): aplicar a 0007 e medir no banco

**Files:**
- Modify: `docs/fase-3-metricas.md`
- Create (só se o Step 6 pedir): `supabase/migrations/0008_relacionados_leve.sql`; Modify: `scripts/migracoes.test.ts`

Todos os passos são do controlador (banco e site em produção).

- [ ] **Step 1: Pré-condições**

`git status` limpo no `recursos-pro`; `npm test && npm run typecheck` passam. No SQL Editor: `select name from supabase_migrations.schema_migrations order by version;` contém `retencao` e não contém `recursos_pro`. Seção [P0] de `docs/fase-3-recursos-pro.sql` → `eventos_tipo_check` (se o nome for outro, trocar o nome no `drop constraint` da 0007 e no teste correspondente da Task 1, commitar e só então seguir; o `add constraint` continua com `eventos_tipo_check`). `gh run list --workflow sync.yml --limit 1` sem rodada `in_progress`.

- [ ] **Step 2: Medir antes**

```bash
for u in "api/busca?q=luva" "api/mapa" "api/mapa?q=luva"; do curl -s -o /dev/null -w "$u %{http_code} %{time_total}\n" "https://edital-map.vercel.app/$u"; done
```
No SQL Editor: `explain (analyze) select * from public.mapa_editais(null);` (anotar "Execution Time").

- [ ] **Step 3: Aplicar a 0007**

`npm run db:aplicar -- supabase/migrations/0007_recursos_pro.sql`
Expected: `[migração] recursos_pro aplicada`.

- [ ] **Step 4: O site no ar continua de pé**

```bash
for u in "api/busca?q=luva" "api/busca?q=luva&ibge=4209102" "api/mapa" "api/mapa?q=luva"; do curl -s -o /dev/null -w "$u %{http_code}\n" "https://edital-map.vercel.app/$u"; done
curl -s "https://edital-map.vercel.app/api/busca?q=luva" | node -e "const r=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(r.total, r.editais.length)"
```
Expected: todos `200`; `total > 0` e 50 editais (ou o total, se menor). Uma página de edital aberto (slug de [P5]) → `200`. Se algo der 502: `select pg_notify('pgrst', 'reload schema');` no SQL Editor e repetir; se continuar, voltar o banco com as definições da 0005/0004 (copiar `abertas_unicas` da 0004, `buscar_editais` da 0005 e `mapa_editais` da 0004 numa migração `0008_volta.sql` com os mesmos revokes/grants) e parar.

- [ ] **Step 5: Conferências**

Seções [P1] a [P6] de `docs/fase-3-recursos-pro.sql`. Expected: [P1] false/false/true nas 6 linhas; [P2] 3 linhas com `p_orgao`; [P3] `true, false, true` e a lista com mais de um município, sem Florianópolis; [P4] `orgaos = 1`, `total = qtd`, `soma_mapa = total`; [P5] parecidos coerentes e sem o próprio id; [P6] sem erro. Anotar todos os tempos e `explain (analyze) select * from public.mapa_editais(null);` de novo (comparar com o Step 2: a diferença deve ficar abaixo de 10%).

- [ ] **Step 6: Decidir pela meta de 300 ms dos relacionados**

Se os três `relacionados` ficaram abaixo de 300 ms: pular o Step 7. Se algum passou: Step 7.

- [ ] **Step 7 (só se o Step 6 pedir): `0008_relacionados_leve.sql`**

Acrescente ao fim de `scripts/migracoes.test.ts`:
```ts
describe('migração 0008 (relacionados mais leve)', () => {
  const sql = ler('supabase/migrations/0008_relacionados_leve.sql');
  it('8 palavras, só pelo objeto, e só o servidor executa', () => {
    expect(sql).toContain('limit 8) p) as tq');
    expect(sql).toContain('and a.busca @@ o.tq');
    expect(sql).not.toContain('a.itens_palavras @@ o.tq');
    expect(sql).toContain('revoke execute on function public.relacionados(text, int) from public, anon, authenticated;');
    expect(sql).toContain('grant execute on function public.relacionados(text, int) to service_role;');
  });
});
```
`npx vitest run scripts/migracoes.test.ts` → FAIL (`ENOENT`). Crie `supabase/migrations/0008_relacionados_leve.sql`:
```sql
-- Edital Map · Recursos Pro: relacionados mais leve (a 0007 passou de 300 ms no explain analyze).
-- No máximo 8 palavras e só editais com alguma delas no objeto; as palavras dos itens continuam na relevância.
set local lock_timeout = '10s';

create or replace function public.relacionados(p_id text, p_limite int default 6)
returns table (id text, slug text, objeto text, orgao_nome text, municipio_nome text, uf text, valor_estimado numeric,
               encerramento_em timestamptz, publicada_em timestamptz, modalidade_nome text, srp boolean)
language sql stable as $$
  with genericas as (
    select tsvector_to_array(to_tsvector('portuguese',
      'contratacao contratar empresa empresas especializada especializado aquisicao aquisicoes registro precos preco '
      || 'futura futuras eventual eventuais fornecimento fornecer servico servicos prestacao objeto municipio municipal '
      || 'secretaria atender atendimento necessidade necessidades conforme termo referencia edital anexo lote lotes '
      || 'item itens quantidade quantidades demanda destinado destinada destinados destinadas visando material '
      || 'materiais diversos diversas geral gerais unidade unidades publica publico estadual federal especificacoes '
      || 'condicoes estabelecidas constantes parcelada parcelado entrega tipo')) as lexemas
  ),
  origem as (
    select c.id, c.uf, c.codigo_ibge, c.encerramento_em, c.valor_estimado,
           public.objeto_normalizado(c.objeto) as objeto_norm,
           (select string_agg(p.lexeme, ' | ')::tsquery
              from (select u.lexeme
                      from unnest(ts_filter(c.busca, '{a}')) u, genericas g
                     where u.lexeme ~ '^[a-z0-9]{3,}$'
                       and u.lexeme !~ '^[0-9]+$'
                       and u.lexeme <> all (g.lexemas)
                     order by u.positions[1]
                     limit 8) p) as tq
    from public.contratacoes c
    where c.id = p_id
  ),
  candidatas as (
    select a.*,
           (ts_rank(a.busca, o.tq) + 0.3 * ts_rank(coalesce(a.itens_palavras, ''::tsvector), o.tq))
             * (case when a.uf = o.uf then 2 else 1 end) as relevancia
    from origem o
    join public.contratacoes a
      on a.encerramento_em > now()
     and a.busca @@ o.tq
    where o.tq is not null
      and a.id <> o.id
      and not (a.codigo_ibge is not distinct from o.codigo_ibge
               and a.encerramento_em = o.encerramento_em
               and a.valor_estimado is not distinct from o.valor_estimado
               and public.objeto_normalizado(a.objeto) = o.objeto_norm)
  ),
  unicas as (
    select distinct on (k.codigo_ibge, k.encerramento_em, k.valor_estimado, public.objeto_normalizado(k.objeto)) k.*
    from candidatas k
    order by k.codigo_ibge, k.encerramento_em, k.valor_estimado, public.objeto_normalizado(k.objeto),
             (k.link_origem is null), k.atualizada_pncp_em desc, k.id
  )
  select x.id, x.slug, x.objeto, x.orgao_nome, x.municipio_nome, x.uf, x.valor_estimado, x.encerramento_em,
         x.publicada_em, x.modalidade_nome, x.srp
  from unicas x
  order by x.relevancia desc, x.encerramento_em, x.id
  limit p_limite
$$;

revoke execute on function public.relacionados(text, int) from public, anon, authenticated;
grant execute on function public.relacionados(text, int) to service_role;
```
`npx vitest run scripts/migracoes.test.ts` → PASS. `npm test && npm run typecheck`, commit (`git add supabase/migrations/0008_relacionados_leve.sql scripts/migracoes.test.ts` e `git commit -m "feat: relacionados mais leve (8 palavras, só pelo objeto)" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"`), `npm run db:aplicar -- supabase/migrations/0008_relacionados_leve.sql`, repetir [P5]. Se ainda passar de 300 ms: parar e levar os três planos (`explain (analyze, buffers)`) ao dono antes da Task 5.

- [ ] **Step 8: Registrar**

Acrescente ao fim de `docs/fase-3-metricas.md` (preencher com os números medidos; nada de valor inventado):
```markdown
## Recursos Pro (0007)

- 0007 aplicada em aaaa-mm-dd hh:mm UTC (T s). Site no ar de pé logo depois (busca, mapa e edital com 200).
- [P1] permissões certas; [P2] uma assinatura por função; [P3] raio de 100 km de Joinville: N municípios, Blumenau dentro, Florianópolis fora.

| Medida | Execution Time |
|---|---|
| mapa_editais(null), antes / depois da 0007 | … / … ms |
| buscar_editais com raio de 100 km (Joinville) | … ms |
| mapa_editais com raio de 100 km (Joinville) | … ms |
| orgaos_abertos('joinville') / ('prefeitura') | … / … ms |
| relacionados (EPI, id) | … ms |
| relacionados (objeto longo, id) | … ms |
| relacionados (outro, id) | … ms |
```
```bash
git add docs/fase-3-metricas.md
git commit -m "docs: métricas da 0007 (recursos Pro)" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 3: Filtros `orgao` e `raio` da tela até a rpc

**Files:**
- Modify: `lib/tipos.ts`, `lib/filtros.ts`, `lib/servidor/consultas.ts`, `components/Explorador.tsx`
- Test: `lib/filtros.test.ts`, `lib/servidor/consultas.test.ts`

**Interfaces:**
- Consumes: `buscar_editais`/`mapa_editais` da 0007 (Task 1).
- Produces:
  - `FiltrosBusca` + `orgao: string | null; raio: number | null`; `type Orgao = { cnpj: string; nome: string }`; `FiltrosTela` + `orgao: Orgao | null; raio: number | null`.
  - `RAIOS_KM: readonly [50, 100, 200]`; `lerFiltros(p: URLSearchParams): FiltrosBusca` (lê `orgao` e `raio`); `chaveFiltros(f: FiltrosBusca): string` (com `orgao` e `raio`); `paraParametros(f: FiltrosTela, opcoes?: { comCidade?: boolean; deslocamento?: number }): URLSearchParams` (`orgao`; `ibge` + `raio` também no mapa quando há raio).
  - `normalizarTela(f: FiltrosTela): FiltrosTela`; `type RecursoFiltro = 'filtro_orgao' | 'filtro_raio'`; `recursosUsados(antes: FiltrosTela, depois: FiltrosTela): RecursoFiltro[]`.
  - Em `consultas.ts` (internas): `argumentosBusca(f)` e `paraResumo(l)`; `buscarEditais` manda `p_orgao`/`p_raio_km`; `pontosDoMapa` manda `p_orgao`/`p_ibge`/`p_raio_km` (`p_ibge` só com raio).

- [ ] **Step 1: Escrever os testes (falhando)**

Substitua `lib/filtros.test.ts` inteiro por:
```ts
import { describe, expect, it } from 'vitest';
import { chaveFiltros, lerFiltros, normalizarTela, paraParametros, recursosUsados, UFS_ORDENADAS } from './filtros';
import type { FiltrosTela } from './tipos';

const ler = (s: string) => lerFiltros(new URLSearchParams(s));
const BASE = { q: null, uf: null, ibge: null, dias: null, deslocamento: 0, valorMin: null, modalidades: null, orgao: null, raio: null };
const JOINVILLE = { ibge: '4209102', nome: 'Joinville', uf: 'SC' };
const ORGAO = { cnpj: '83102244000102', nome: 'Município de Joinville' };
const TELA_VAZIA: FiltrosTela = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };

describe('lerFiltros', () => {
  it('sem parâmetros', () => {
    expect(ler('')).toEqual(BASE);
  });
  it('aceita os valores válidos', () => {
    expect(ler('q=%20EPI%20e%20uniformes%20&uf=sc&ibge=4205407&dias=7&deslocamento=50&valor=50000&modalidades=8,6,6')).toEqual({
      q: 'EPI e uniformes', uf: 'SC', ibge: '4205407', dias: 7, deslocamento: 50, valorMin: 50000, modalidades: [6, 8], orgao: null, raio: null,
    });
  });
  it('descarta UF que não existe, IBGE malformado e dias diferentes de 7', () => {
    expect(ler('uf=XX&ibge=123&dias=30')).toEqual(BASE);
  });
  it('aceita qualquer UF do Brasil', () => {
    expect(ler('uf=sp').uf).toBe('SP');
    expect(ler('uf=AM').uf).toBe('AM');
  });
  it('ignora valor fora da lista e modalidades desconhecidas', () => {
    expect(ler('valor=12345&modalidades=1,99,abc')).toEqual(BASE);
  });
  it('limita o termo a 100 caracteres e o deslocamento a 0..20000', () => {
    expect(ler(`q=${'a'.repeat(150)}`).q).toHaveLength(100);
    expect(ler('deslocamento=-1').deslocamento).toBe(0);
    expect(ler('deslocamento=20050').deslocamento).toBe(0);
    expect(ler('deslocamento=1.5').deslocamento).toBe(0);
  });
  it('órgão: CNPJ de 14 caracteres (numérico ou alfanumérico), em maiúsculas', () => {
    expect(ler('orgao=83102244000102').orgao).toBe('83102244000102');
    expect(ler('orgao=12abc34501de35').orgao).toBe('12ABC34501DE35');
    expect(ler('orgao=8310224400010').orgao).toBeNull();
    expect(ler('orgao=83.102.244/0001-02').orgao).toBeNull();
  });
  it('raio: só 50, 100 ou 200 e só com município', () => {
    expect(ler('ibge=4209102&raio=100').raio).toBe(100);
    expect(ler('ibge=4209102&raio=75').raio).toBeNull();
    expect(ler('raio=100').raio).toBeNull();
  });
});

describe('chaveFiltros', () => {
  it('ignora maiúsculas no termo', () => {
    expect(chaveFiltros(ler('q=EPI'))).toBe(chaveFiltros(ler('q=epi')));
  });
  it('muda quando o filtro muda', () => {
    expect(chaveFiltros(ler('q=epi'))).not.toBe(chaveFiltros(ler('q=epi&uf=PR')));
    expect(chaveFiltros(ler('q=epi'))).not.toBe(chaveFiltros(ler('q=epi&valor=50000')));
    expect(chaveFiltros(ler('q=epi'))).not.toBe(chaveFiltros(ler('q=epi&modalidades=6')));
    expect(chaveFiltros(ler('q=epi'))).not.toBe(chaveFiltros(ler('q=epi&orgao=83102244000102')));
    expect(chaveFiltros(ler('ibge=4209102'))).not.toBe(chaveFiltros(ler('ibge=4209102&raio=50')));
  });
});

describe('paraParametros', () => {
  const TELA: FiltrosTela = {
    q: ' EPI ', uf: 'SC', cidade: { ibge: '4205407', nome: 'Florianópolis', uf: 'SC' }, valorMin: 50000, modalidades: [8, 6], seteDias: true,
    orgao: null, raio: null,
  };
  it('monta os parâmetros que a API entende', () => {
    expect(paraParametros(TELA, { deslocamento: 50 }).toString()).toBe(
      'q=EPI&uf=SC&dias=7&valor=50000&modalidades=6%2C8&ibge=4205407&deslocamento=50',
    );
  });
  it('sem cidade para o mapa e vazio quando não há filtro', () => {
    expect(paraParametros(TELA, { comCidade: false }).has('ibge')).toBe(false);
    expect(paraParametros(TELA_VAZIA).toString()).toBe('');
  });
  it('ida e volta com lerFiltros', () => {
    expect(lerFiltros(paraParametros(TELA))).toEqual({
      q: 'EPI', uf: 'SC', ibge: '4205407', dias: 7, deslocamento: 0, valorMin: 50000, modalidades: [6, 8], orgao: null, raio: null,
    });
  });
  it('órgão e raio: a lista leva os dois; o mapa leva a cidade só junto com o raio', () => {
    const tela: FiltrosTela = { ...TELA_VAZIA, cidade: JOINVILLE, orgao: ORGAO, raio: 100 };
    expect(paraParametros(tela).toString()).toBe('orgao=83102244000102&ibge=4209102&raio=100');
    expect(paraParametros(tela, { comCidade: false }).toString()).toBe('orgao=83102244000102&ibge=4209102&raio=100');
    expect(paraParametros({ ...tela, raio: null }, { comCidade: false }).toString()).toBe('orgao=83102244000102');
    expect(paraParametros({ ...tela, cidade: null }).has('raio')).toBe(false);
  });
  it('ida e volta com órgão e raio', () => {
    expect(lerFiltros(paraParametros({ ...TELA_VAZIA, cidade: JOINVILLE, orgao: ORGAO, raio: 200 }))).toEqual({
      ...BASE, ibge: '4209102', orgao: '83102244000102', raio: 200,
    });
  });
});

describe('normalizarTela', () => {
  it('sem município o raio sai', () => {
    expect(normalizarTela({ ...TELA_VAZIA, raio: 100 })).toEqual(TELA_VAZIA);
  });
  it('com município o raio fica (e o objeto é o mesmo)', () => {
    const tela = { ...TELA_VAZIA, cidade: JOINVILLE, raio: 100 };
    expect(normalizarTela(tela)).toBe(tela);
  });
});

describe('recursosUsados', () => {
  it('órgão escolhido ou trocado conta; manter ou tirar não conta', () => {
    expect(recursosUsados(TELA_VAZIA, { ...TELA_VAZIA, orgao: ORGAO })).toEqual(['filtro_orgao']);
    expect(recursosUsados({ ...TELA_VAZIA, orgao: ORGAO }, { ...TELA_VAZIA, orgao: ORGAO, q: 'luva' })).toEqual([]);
    expect(recursosUsados({ ...TELA_VAZIA, orgao: ORGAO }, TELA_VAZIA)).toEqual([]);
  });
  it('raio ligado, trocado ou com outra cidade conta', () => {
    const com = { ...TELA_VAZIA, cidade: JOINVILLE, raio: 50 };
    expect(recursosUsados({ ...TELA_VAZIA, cidade: JOINVILLE }, com)).toEqual(['filtro_raio']);
    expect(recursosUsados(com, { ...com, raio: 100 })).toEqual(['filtro_raio']);
    expect(recursosUsados(com, { ...com, cidade: { ibge: '4202404', nome: 'Blumenau', uf: 'SC' } })).toEqual(['filtro_raio']);
    expect(recursosUsados(com, { ...com, seteDias: true })).toEqual([]);
  });
});

describe('UFS_ORDENADAS', () => {
  it('as 27 UFs em ordem alfabética', () => {
    expect(UFS_ORDENADAS).toHaveLength(27);
    expect(UFS_ORDENADAS[0]).toBe('AC');
    expect(UFS_ORDENADAS[26]).toBe('TO');
    expect([...UFS_ORDENADAS].sort()).toEqual(UFS_ORDENADAS);
  });
});
```

Substitua `lib/servidor/consultas.test.ts` inteiro por:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lerFiltros, paraParametros } from '../filtros';
import type { FiltrosBusca, FiltrosTela } from '../tipos';

vi.mock('server-only', () => ({}));

// Chamadas de rpc registradas: o contrato TS↔SQL é o nome da função e as chaves dos argumentos.
const chamadas: Array<{ nome: string; args: Record<string, unknown> }> = [];
/** Dados devolvidos pela rpc; uma função recebe os argumentos (páginas da exportação). */
let respostaRpc: unknown = [];

vi.mock('./supabase', () => ({
  supabaseServidor: () => ({
    // Serve os três jeitos de consumir uma rpc: direto (await), `.range()` (mapa) e `.single()` (resumo).
    rpc: (nome: string, args: Record<string, unknown>) => {
      chamadas.push({ nome, args });
      const dados = typeof respostaRpc === 'function' ? (respostaRpc as (a: Record<string, unknown>) => unknown)(args) : respostaRpc;
      const resposta = Promise.resolve({ data: dados, error: null });
      return {
        range: () => resposta,
        single: () => resposta,
        then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => resposta.then(ok, ko),
      };
    },
  }),
}));

const { buscarEditais, itensDoEdital, pontosDoMapa, resumoItens } = await import('./consultas');

const compra = (id: string) => ({ id, cnpj: '00394452000103', ano: 2026, sequencial: 21982 });
const SEM_FILTRO: FiltrosBusca = {
  q: null, uf: null, ibge: null, dias: null, deslocamento: 0, valorMin: null, modalidades: null, orgao: null, raio: null,
};
const chaves = (args: Record<string, unknown>) => Object.keys(args).sort();

describe('itensDoEdital (PNCP na hora)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('devolve os itens do PNCP mapeados para a lista do edital', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify([{ numeroItem: 1, descricao: 'Luva nitrílica', materialOuServico: 'M' }]), { status: 200 })),
    );
    expect(await itensDoEdital(compra('ok-1'), 50)).toEqual([
      expect.objectContaining({ numero: 1, descricao: 'Luva nitrílica', material_ou_servico: 'M' }),
    ]);
  });

  it('PNCP fora do ar vira null (a página mostra "Itens indisponíveis agora")', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fetch failed'))));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await itensDoEdital(compra('falha-1'), 50)).toBeNull();
  });

  it('falha não fica no cache: a próxima visita tenta de novo', async () => {
    const f = vi.fn(async () => Promise.reject(new TypeError('fetch failed')));
    vi.stubGlobal('fetch', f);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await itensDoEdital(compra('falha-2'), 50);
    await itensDoEdital(compra('falha-2'), 50);
    expect(f).toHaveBeenCalledTimes(2);
  });
});

describe('contrato com as funções SQL (0007)', () => {
  beforeEach(() => {
    chamadas.length = 0;
    respostaRpc = [];
  });

  const ARGS_BUSCA = ['q', 'p_ufs', 'p_ibge', 'p_dias', 'p_valor_min', 'p_modalidades', 'p_limite', 'p_deslocamento', 'p_orgao', 'p_raio_km'].sort();
  const ARGS_MAPA = ['q', 'p_ufs', 'p_dias', 'p_valor_min', 'p_modalidades', 'p_orgao', 'p_ibge', 'p_raio_km'].sort();

  it('buscarEditais chama buscar_editais com os argumentos da 0007', async () => {
    await buscarEditais({
      q: 'luva', uf: 'SC', ibge: '4209102', dias: 7, deslocamento: 50, valorMin: 1000, modalidades: [6, 8], orgao: '83102244000102', raio: 100,
    });
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].nome).toBe('buscar_editais');
    expect(chaves(chamadas[0].args)).toEqual(ARGS_BUSCA);
    expect(chamadas[0].args).toMatchObject({
      q: 'luva', p_ufs: ['SC'], p_ibge: '4209102', p_valor_min: 1000, p_modalidades: [6, 8], p_limite: 50, p_deslocamento: 50,
      p_orgao: '83102244000102', p_raio_km: 100,
    });
  });

  it('buscarEditais manda todas as chaves também sem filtros', async () => {
    await buscarEditais(SEM_FILTRO);
    expect(chamadas[0].nome).toBe('buscar_editais');
    expect(chaves(chamadas[0].args)).toEqual(ARGS_BUSCA);
    expect(chamadas[0].args).toMatchObject({ q: null, p_ufs: null, p_valor_min: null, p_modalidades: null, p_orgao: null, p_raio_km: null });
  });

  it('pontosDoMapa chama mapa_editais com os argumentos da 0007; a cidade sozinha não vai ao mapa', async () => {
    await pontosDoMapa({ ...SEM_FILTRO, q: 'bota', uf: 'PR', ibge: '4106902', dias: 7, valorMin: 5000, modalidades: [4], orgao: '76417005000186' });
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].nome).toBe('mapa_editais');
    expect(chaves(chamadas[0].args)).toEqual(ARGS_MAPA);
    expect(chamadas[0].args).toMatchObject({
      q: 'bota', p_ufs: ['PR'], p_valor_min: 5000, p_modalidades: [4], p_orgao: '76417005000186', p_ibge: null, p_raio_km: null,
    });
  });

  it('pontosDoMapa com raio manda a cidade e o raio', async () => {
    await pontosDoMapa({ ...SEM_FILTRO, ibge: '4209102', raio: 100 });
    expect(chamadas[0].args).toMatchObject({ p_ibge: '4209102', p_raio_km: 100 });
  });

  it('ida e volta: tela → parâmetros da URL → lerFiltros → rpc', async () => {
    const tela: FiltrosTela = {
      q: 'luva', uf: '', cidade: { ibge: '4209102', nome: 'Joinville', uf: 'SC' }, valorMin: null, modalidades: [], seteDias: false,
      orgao: { cnpj: '83102244000102', nome: 'Município de Joinville' }, raio: 100,
    };
    await buscarEditais(lerFiltros(paraParametros(tela)));
    await pontosDoMapa(lerFiltros(paraParametros(tela, { comCidade: false })));
    expect(chamadas.map((c) => c.nome)).toEqual(['buscar_editais', 'mapa_editais']);
    for (const c of chamadas) {
      expect(c.args).toMatchObject({ q: 'luva', p_ibge: '4209102', p_orgao: '83102244000102', p_raio_km: 100 });
    }
  });

  it('resumoItens chama resumo_itens e mapeia as colunas para ResumoItens', async () => {
    respostaRpc = { total: 12, materiais: 10, servicos: 2, com_beneficio: 9, exclusivos: 6, cota: 3, criterios: ['Menor preço'] };
    const r = await resumoItens('contratacao-1');
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].nome).toBe('resumo_itens');
    expect(chaves(chamadas[0].args)).toEqual(['p_contratacao']);
    expect(chamadas[0].args.p_contratacao).toBe('contratacao-1');
    expect(r).toEqual({ total: 12, materiais: 10, servicos: 2, comBeneficio: 9, exclusivos: 6, cota: 3, criterios: ['Menor preço'] });
  });

  it('buscarEditais mapeia as colunas da 0007 (link_origem fica de fora do card)', async () => {
    respostaRpc = [
      {
        id: 'C1', slug: '00394452000103-2026-1', objeto: 'Luvas', orgao_nome: 'Município de Joinville', unidade_nome: null,
        municipio_nome: 'Joinville', uf: 'SC', codigo_ibge: '4209102', valor_estimado: '1000.50',
        encerramento_em: '2026-10-20T13:00:00+00:00', publicada_em: null, modalidade_nome: 'Pregão - Eletrônico', srp: false,
        link_origem: 'https://compras.joinville.sc.gov.br/1', onde: 'itens', total: 1,
      },
    ];
    const r = await buscarEditais({ ...SEM_FILTRO, q: 'nitrilica' });
    expect(r).toEqual({
      total: 1,
      editais: [
        {
          id: 'C1', slug: '00394452000103-2026-1', objeto: 'Luvas', orgao_nome: 'Município de Joinville', unidade_nome: null,
          municipio_nome: 'Joinville', uf: 'SC', codigo_ibge: '4209102', valor_estimado: 1000.5,
          encerramento_em: '2026-10-20T13:00:00+00:00', publicada_em: null, modalidade_nome: 'Pregão - Eletrônico', srp: false,
          onde: 'itens',
        },
      ],
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/filtros.test.ts lib/servidor/consultas.test.ts`
Expected: FAIL — `normalizarTela`/`recursosUsados` não existem (`is not a function`), `lerFiltros` ainda não devolve `orgao`/`raio` e as rpc não mandam `p_orgao`/`p_raio_km`/`p_ibge` no mapa.

- [ ] **Step 3: Implementar**

`lib/tipos.ts`: troque o trecho de `export type FiltrosBusca = {` até o `};` que fecha `FiltrosTela` (inclusive o comentário `/** Estado dos filtros na tela inicial … */` entre os dois) por:
```ts
export type FiltrosBusca = {
  q: string | null;
  uf: string | null;
  ibge: string | null;
  dias: number | null;
  deslocamento: number;
  valorMin: number | null;
  modalidades: number[] | null;
  /** CNPJ do órgão comprador (contratacoes.cnpj). */
  orgao: string | null;
  /** Raio em km a partir da sede do município `ibge` (50, 100 ou 200); só existe com `ibge`. */
  raio: number | null;
};

/** Órgão escolhido no filtro (o nome é só para o chip). */
export type Orgao = { cnpj: string; nome: string };

/** Estado dos filtros na tela inicial (o navegador monta a URL da API com `paraParametros`). */
export type FiltrosTela = {
  q: string;
  uf: string;
  cidade: Cidade | null;
  valorMin: number | null;
  modalidades: number[];
  seteDias: boolean;
  orgao: Orgao | null;
  /** Raio em km a partir da cidade; sem cidade é sempre null (`normalizarTela`). */
  raio: number | null;
};
```

`lib/filtros.ts`: substitua o arquivo inteiro por:
```ts
import { UFS_BRASIL } from './eventos';
import type { FiltrosBusca, FiltrosTela } from './tipos';

/** As 27 UFs em ordem alfabética, para os seletores de UF. */
export const UFS_ORDENADAS: readonly string[] = [...UFS_BRASIL].sort();
export const VALORES_MINIMOS = [10_000, 50_000, 100_000, 500_000, 1_000_000] as const;
export const MODALIDADES: ReadonlyArray<{ id: number; nome: string }> = [
  { id: 6, nome: 'Pregão eletrônico' },
  { id: 7, nome: 'Pregão presencial' },
  { id: 4, nome: 'Concorrência eletrônica' },
  { id: 8, nome: 'Dispensa' },
  { id: 12, nome: 'Credenciamento' },
];
const IDS_MODALIDADE = MODALIDADES.map((m) => m.id);
/** Raios do filtro Pro, em km a partir da sede do município escolhido. */
export const RAIOS_KM = [50, 100, 200] as const;
/** CNPJ do órgão comprador: 14 caracteres, os 12 primeiros podem ser letras (CNPJ alfanumérico), como em SLUG_EDITAL. */
const CNPJ = /^[0-9A-Z]{12}\d{2}$/;

export function lerFiltros(p: URLSearchParams): FiltrosBusca {
  const q = (p.get('q') ?? '').trim().slice(0, 100) || null;
  const ufBruta = (p.get('uf') ?? '').toUpperCase();
  const uf = UFS_BRASIL.includes(ufBruta) ? ufBruta : null;
  const ibgeBruto = p.get('ibge') ?? '';
  const ibge = /^\d{7}$/.test(ibgeBruto) ? ibgeBruto : null;
  const dias = p.get('dias') === '7' ? 7 : null;
  const d = Number(p.get('deslocamento') ?? 0);
  const deslocamento = Number.isInteger(d) && d >= 0 && d <= 20000 ? d : 0;
  const v = Number(p.get('valor'));
  const valorMin = (VALORES_MINIMOS as readonly number[]).includes(v) ? v : null;
  const ids = [...new Set((p.get('modalidades') ?? '').split(',').map((s) => Number(s.trim())))]
    .filter((id) => IDS_MODALIDADE.includes(id))
    .sort((a, b) => a - b);
  const orgaoBruto = (p.get('orgao') ?? '').trim().toUpperCase();
  const orgao = CNPJ.test(orgaoBruto) ? orgaoBruto : null;
  // O raio só vale com município: é contado a partir da sede dele.
  const r = Number(p.get('raio'));
  const raio = ibge && (RAIOS_KM as readonly number[]).includes(r) ? r : null;
  return { q, uf, ibge, dias, deslocamento, valorMin, modalidades: ids.length ? ids : null, orgao, raio };
}

export function chaveFiltros(f: FiltrosBusca): string {
  return JSON.stringify([f.q?.toLowerCase() ?? null, f.uf, f.ibge, f.dias, f.deslocamento, f.valorMin, f.modalidades, f.orgao, f.raio]);
}

/**
 * Filtros da tela → parâmetros de `/api/busca`, `/api/mapa` e `/api/exportar`.
 * O mapa (`comCidade: false`) não leva a cidade sozinha (mostra todas, para o usuário escolher outra);
 * com raio, leva a cidade e o raio.
 */
export function paraParametros(f: FiltrosTela, opcoes: { comCidade?: boolean; deslocamento?: number } = {}): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.uf) p.set('uf', f.uf);
  if (f.seteDias) p.set('dias', '7');
  if (f.valorMin) p.set('valor', String(f.valorMin));
  if (f.modalidades.length) p.set('modalidades', [...f.modalidades].sort((a, b) => a - b).join(','));
  if (f.orgao) p.set('orgao', f.orgao.cnpj);
  const raio = f.cidade && f.raio ? f.raio : null;
  if (f.cidade && (opcoes.comCidade !== false || raio)) p.set('ibge', f.cidade.ibge);
  if (raio) p.set('raio', String(raio));
  if (opcoes.deslocamento) p.set('deslocamento', String(opcoes.deslocamento));
  return p;
}

/** Sem município não há raio: tirar a cidade (ou trocar a UF, que tira a cidade) tira o raio. */
export function normalizarTela(f: FiltrosTela): FiltrosTela {
  return f.cidade || f.raio === null ? f : { ...f, raio: null };
}

export type RecursoFiltro = 'filtro_orgao' | 'filtro_raio';

/** Filtros Pro que passaram a valer nesta mudança (evento usou_recurso); manter ou tirar um filtro não conta. */
export function recursosUsados(antes: FiltrosTela, depois: FiltrosTela): RecursoFiltro[] {
  const usados: RecursoFiltro[] = [];
  if (depois.orgao && depois.orgao.cnpj !== antes.orgao?.cnpj) usados.push('filtro_orgao');
  if (depois.cidade && depois.raio && (depois.raio !== antes.raio || depois.cidade.ibge !== antes.cidade?.ibge)) usados.push('filtro_raio');
  return usados;
}
```

`lib/servidor/consultas.ts`: troque o trecho do `export function buscarEditais` até o `}` que fecha `pontosDoMapa` (inclusive o comentário `/** O PostgREST devolve no máximo 1.000 linhas… */` entre as duas, que volta reescrito abaixo) por:
```ts
/** Argumentos de buscar_editais (0007), sem a página. */
function argumentosBusca(f: FiltrosBusca) {
  return {
    q: f.q,
    p_ufs: f.uf ? [f.uf] : null,
    p_ibge: f.ibge,
    p_dias: f.dias,
    p_valor_min: f.valorMin,
    p_modalidades: f.modalidades,
    p_orgao: f.orgao,
    p_raio_km: f.raio,
  };
}

/** Uma linha de buscar_editais → card da lista. */
function paraResumo(l: Linha): EditalResumo {
  return {
    id: String(l.id),
    slug: String(l.slug),
    objeto: String(l.objeto),
    orgao_nome: String(l.orgao_nome),
    unidade_nome: texto(l.unidade_nome),
    municipio_nome: texto(l.municipio_nome),
    uf: String(l.uf),
    codigo_ibge: texto(l.codigo_ibge),
    valor_estimado: num(l.valor_estimado),
    encerramento_em: String(l.encerramento_em),
    publicada_em: texto(l.publicada_em),
    modalidade_nome: texto(l.modalidade_nome),
    srp: Boolean(l.srp),
    onde: l.onde === 'itens' ? 'itens' : 'objeto',
  };
}

export function buscarEditais(f: FiltrosBusca): Promise<ResultadoBusca> {
  return cache(`busca:${chaveFiltros(f)}`, async () => {
    const { data, error } = await supabaseServidor().rpc('buscar_editais', {
      ...argumentosBusca(f),
      p_limite: POR_PAGINA,
      p_deslocamento: f.deslocamento,
    });
    if (error) throw new Error(`buscar_editais: ${error.message}`);
    const linhas = (data ?? []) as Linha[];
    return { total: Number(linhas[0]?.total ?? 0), editais: linhas.map(paraResumo) };
  });
}

/**
 * O PostgREST devolve no máximo 1.000 linhas por resposta: lê em páginas até o fim.
 * O mapa não filtra pela cidade sozinha (mostra todas, para escolher outra); com raio, só os municípios dentro dele.
 */
export function pontosDoMapa(f: FiltrosBusca): Promise<PontoMapa[]> {
  const ibge = f.raio ? f.ibge : null;
  return cache(`mapa:${chaveFiltros({ ...f, ibge, deslocamento: 0 })}`, async () => {
    const pontos: PontoMapa[] = [];
    for (let de = 0; ; de += 1000) {
      const { data, error } = await supabaseServidor()
        .rpc('mapa_editais', {
          q: f.q,
          p_ufs: f.uf ? [f.uf] : null,
          p_dias: f.dias,
          p_valor_min: f.valorMin,
          p_modalidades: f.modalidades,
          p_orgao: f.orgao,
          p_ibge: ibge,
          p_raio_km: f.raio,
        })
        .range(de, de + 999);
      if (error) throw new Error(`mapa_editais: ${error.message}`);
      const linhas = (data ?? []) as Linha[];
      for (const l of linhas) {
        pontos.push({
          codigo_ibge: String(l.codigo_ibge),
          nome: String(l.nome),
          uf: String(l.uf),
          lat: Number(l.lat),
          lng: Number(l.lng),
          qtd: Number(l.qtd),
          valor_total: num(l.valor_total),
          prazo_mais_proximo: String(l.prazo_mais_proximo),
        });
      }
      if (linhas.length < 1000) return pontos;
    }
  });
}
```

`components/Explorador.tsx`: troque
```tsx
const VAZIO: FiltrosTela = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false };
```
por:
```tsx
const VAZIO: FiltrosTela = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/filtros.test.ts lib/servidor/consultas.test.ts && npm run typecheck && npm run build`
Expected: PASS (filtros: 20 testes; consultas: 10 testes); typecheck e build sem erro.

- [ ] **Step 5: Commit**

```bash
npm test && npm run typecheck
git add lib/tipos.ts lib/filtros.ts lib/filtros.test.ts lib/servidor/consultas.ts lib/servidor/consultas.test.ts components/Explorador.tsx
git commit -m "feat: filtros orgao e raio da tela até buscar_editais e mapa_editais" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 4: Evento `usou_recurso` e portão

**Files:**
- Modify: `lib/eventos.ts`, `docs/fase-2-portao.sql`
- Test: `lib/eventos.test.ts`, `scripts/migracoes.test.ts`

**Interfaces:**
- Consumes: restrição `eventos_tipo_check` da 0007.
- Produces:
  - `TIPOS_EVENTO` com `'usou_recurso'`; `RECURSOS_USADOS = ['relacionados_clique', 'filtro_orgao', 'filtro_raio', 'exportou'] as const`; `type RecursoUsado`.
  - `validarEvento` aceita `usou_recurso` do navegador com `relacionados_clique` (exige `edital`), `filtro_orgao`, `filtro_raio` (sem edital); recusa `exportou` (só a rota grava).
  - `LIMITES.exportacoesPorHora = 20`.
  - `registrar('usou_recurso', …)` (cliente) e `gravarEvento(ctx, 'usou_recurso', …)` (servidor) passam a tipar sem mudança nesses arquivos.
  - Portão: coluna `uso_por_recurso` (`{ recurso: { visitantes, vezes } }`).

- [ ] **Step 1: Escrever os testes (falhando)**

`lib/eventos.test.ts`: troque a linha de import por
```ts
import { LIMITES, RECURSOS_USADOS, TIPOS_EVENTO, UFS_BRASIL, ufsIniciaisAlerta, validarEvento, validarPedidoAlerta } from './eventos';
```
e, dentro do `describe('validarEvento')`, logo antes do `it('recusa tipo desconhecido, pediu_alerta e corpo inválido'`, acrescente:
```ts
  it('usou_recurso: filtros Pro sem edital; clique em parecido com o edital de origem', () => {
    expect(validarEvento({ tipo: 'usou_recurso', detalhe: { recurso: 'filtro_orgao' } })).toEqual({
      ok: true, valor: { tipo: 'usou_recurso', detalhe: { recurso: 'filtro_orgao' } },
    });
    expect(validarEvento({ tipo: 'usou_recurso', detalhe: { recurso: 'filtro_raio', edital: SLUG } })).toEqual({
      ok: true, valor: { tipo: 'usou_recurso', detalhe: { recurso: 'filtro_raio' } },
    });
    expect(validarEvento({ tipo: 'usou_recurso', detalhe: { recurso: 'relacionados_clique', edital: SLUG } })).toEqual({
      ok: true, valor: { tipo: 'usou_recurso', detalhe: { recurso: 'relacionados_clique', edital: SLUG } },
    });
    expect(validarEvento({ tipo: 'usou_recurso', detalhe: { recurso: 'relacionados_clique' } })).toEqual({ ok: false, erro: 'edital inválido' });
  });
  it('usou_recurso: exportou só pela rota /api/exportar; recurso desconhecido é recusado', () => {
    expect(validarEvento({ tipo: 'usou_recurso', detalhe: { recurso: 'exportou' } })).toEqual({ ok: false, erro: 'recurso inválido' });
    expect(validarEvento({ tipo: 'usou_recurso', detalhe: { recurso: 'resumo_ia', edital: SLUG } }).ok).toBe(false);
    expect(validarEvento({ tipo: 'usou_recurso', detalhe: {} }).ok).toBe(false);
  });
  it('os quatro usos medidos e o limite de exportações por hora', () => {
    expect(RECURSOS_USADOS).toEqual(['relacionados_clique', 'filtro_orgao', 'filtro_raio', 'exportou']);
    expect(TIPOS_EVENTO).toContain('usou_recurso');
    expect(LIMITES.exportacoesPorHora).toBe(20);
  });
```

`scripts/migracoes.test.ts`: acrescente no topo, depois de `import { describe, expect, it } from 'vitest';`:
```ts
import { TIPOS_EVENTO } from '../lib/eventos';
```
e ao fim do arquivo:
```ts
describe('eventos e portão (recursos Pro)', () => {
  it('a restrição de eventos.tipo da 0007 aceita todos os tipos que o site grava', () => {
    const sql = ler('supabase/migrations/0007_recursos_pro.sql');
    const restricao = sql.slice(sql.indexOf('add constraint eventos_tipo_check'));
    for (const tipo of [...TIPOS_EVENTO, 'pediu_alerta']) expect(restricao).toContain(`'${tipo}'`);
  });
  it('o portão mostra usou_recurso por recurso, sem internos', () => {
    const portao = ler('docs/fase-2-portao.sql');
    expect(portao).toContain("where tipo = 'usou_recurso' and not interno and visitante not in (select visitante from internos)");
    expect(portao).toContain('as uso_por_recurso;');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/eventos.test.ts scripts/migracoes.test.ts`
Expected: FAIL — `usou_recurso` dá `tipo inválido`, `RECURSOS_USADOS` é `undefined`, `LIMITES.exportacoesPorHora` é `undefined` e o portão não tem `uso_por_recurso`. (O teste da restrição já passa: ele é a guarda para tipos futuros, conferindo `TIPOS_EVENTO` contra a 0007.)

- [ ] **Step 3: Implementar**

`lib/eventos.ts`:
1. Troque a linha
```ts
export const TIPOS_EVENTO = ['busca', 'abriu_edital', 'clicou_edital_oficial', 'quer_recurso'] as const;
```
por:
```ts
export const TIPOS_EVENTO = ['busca', 'abriu_edital', 'clicou_edital_oficial', 'quer_recurso', 'usou_recurso'] as const;
```
2. Logo depois da linha `const RECURSOS_SEM_EDITAL: readonly string[] = ['plano_pro', 'filtros_pro'];`, acrescente:
```ts

/** Uso dos recursos Pro (evento usou_recurso). */
export const RECURSOS_USADOS = ['relacionados_clique', 'filtro_orgao', 'filtro_raio', 'exportou'] as const;
export type RecursoUsado = (typeof RECURSOS_USADOS)[number];
/** O navegador manda estes; `exportou` é gravado pela própria rota /api/exportar (que conta o limite por IP). */
const USOS_DO_NAVEGADOR: readonly string[] = ['relacionados_clique', 'filtro_orgao', 'filtro_raio'];
```
3. Troque
```ts
export const LIMITES = { eventosPorHora: 120, alertasPorHora: 5 } as const;
```
por:
```ts
export const LIMITES = { eventosPorHora: 120, alertasPorHora: 5, exportacoesPorHora: 20 } as const;
```
4. Em `validarEvento`, logo antes da última linha `  if (!edital) return { ok: false, erro: 'edital inválido' };` da função (a de dois espaços, fora do bloco `if (tipo === 'quer_recurso') { … }`), acrescente:
```ts
  if (tipo === 'usou_recurso') {
    if (typeof d.recurso !== 'string' || !USOS_DO_NAVEGADOR.includes(d.recurso)) return { ok: false, erro: 'recurso inválido' };
    if (d.recurso !== 'relacionados_clique') return { ok: true, valor: { tipo, detalhe: { recurso: d.recurso } } };
    if (!edital) return { ok: false, erro: 'edital inválido' };
    return { ok: true, valor: { tipo, detalhe: { recurso: d.recurso, edital } } };
  }
```

`docs/fase-2-portao.sql`:
1. Troque a linha de comentário
```sql
-- Depois de marcar o navegador (/sobre?interno=1), o dono deve fazer uma busca, para o id de visitante dele ficar gravado como interno.
```
por:
```sql
-- Depois de marcar o navegador (/sobre?interno=1), o dono deve fazer uma busca, para o id de visitante dele ficar gravado como interno.
-- Recursos Pro (desde a 0007): uso_por_recurso = visitantes e vezes por recurso (relacionados_clique, filtro_orgao, filtro_raio, exportou).
```
2. Troque o fim do arquivo
```sql
     where tipo = 'quer_recurso' and not interno and visitante not in (select visitante from internos)
     group by 1) r) as interesse_por_recurso;
```
por:
```sql
     where tipo = 'quer_recurso' and not interno and visitante not in (select visitante from internos)
     group by 1) r) as interesse_por_recurso,
  (select coalesce(json_object_agg(recurso, json_build_object('visitantes', visitantes, 'vezes', vezes)), '{}'::json) from (
     select detalhe ->> 'recurso' as recurso, count(distinct visitante) as visitantes, count(*) as vezes
     from public.eventos
     where tipo = 'usou_recurso' and not interno and visitante not in (select visitante from internos)
     group by 1) u) as uso_por_recurso;
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/eventos.test.ts scripts/migracoes.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm test && npm run typecheck
git add lib/eventos.ts lib/eventos.test.ts scripts/migracoes.test.ts docs/fase-2-portao.sql
git commit -m "feat: evento usou_recurso (parecidos, órgão, raio, exportação) e portão por recurso" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 5: Relacionados no servidor

**Files:**
- Modify: `lib/tipos.ts`, `lib/servidor/consultas.ts`
- Test: `lib/servidor/consultas.test.ts`

**Interfaces:**
- Consumes: `relacionados(p_id, p_limite)` da 0007 (ou da 0008).
- Produces:
  - `type EditalRelacionado = Pick<EditalResumo, 'id' | 'slug' | 'objeto' | 'orgao_nome' | 'municipio_nome' | 'uf' | 'valor_estimado' | 'encerramento_em' | 'publicada_em' | 'modalidade_nome' | 'srp'>`
  - `LIMITE_RELACIONADOS = 6`; `relacionados(id: string): Promise<EditalRelacionado[]>` (cache de 5 min; falha não fica no cache e é lançada para a página tratar).

- [ ] **Step 1: Escrever o teste (falhando)**

`lib/servidor/consultas.test.ts`: troque
```ts
const { buscarEditais, itensDoEdital, pontosDoMapa, resumoItens } = await import('./consultas');
```
por:
```ts
const { buscarEditais, itensDoEdital, pontosDoMapa, relacionados, resumoItens } = await import('./consultas');
```
e acrescente ao fim do arquivo:
```ts
describe('relacionados (0007)', () => {
  beforeEach(() => {
    chamadas.length = 0;
    respostaRpc = [];
  });

  it('chama relacionados com o id e o limite de 6 e mapeia as colunas do card', async () => {
    respostaRpc = [
      {
        id: 'R1', slug: '83102244000102-2026-77', objeto: 'Luvas de vaqueta', orgao_nome: 'MUNICIPIO DE JOINVILLE',
        municipio_nome: 'Joinville', uf: 'SC', valor_estimado: '2500.00', encerramento_em: '2026-10-30T13:00:00+00:00',
        publicada_em: null, modalidade_nome: 'Pregão - Eletrônico', srp: true,
      },
    ];
    expect(await relacionados('origem-1')).toEqual([
      {
        id: 'R1', slug: '83102244000102-2026-77', objeto: 'Luvas de vaqueta', orgao_nome: 'MUNICIPIO DE JOINVILLE',
        municipio_nome: 'Joinville', uf: 'SC', valor_estimado: 2500, encerramento_em: '2026-10-30T13:00:00+00:00',
        publicada_em: null, modalidade_nome: 'Pregão - Eletrônico', srp: true,
      },
    ]);
    expect(chamadas).toEqual([{ nome: 'relacionados', args: { p_id: 'origem-1', p_limite: 6 } }]);
  });

  it('guarda no cache por 5 min: a segunda visita não consulta de novo', async () => {
    await relacionados('origem-2');
    await relacionados('origem-2');
    expect(chamadas).toHaveLength(1);
  });

  it('sem parecidos, lista vazia', async () => {
    expect(await relacionados('origem-3')).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/servidor/consultas.test.ts`
Expected: FAIL — `relacionados is not a function`.

- [ ] **Step 3: Implementar**

`lib/tipos.ts`: acrescente ao fim do arquivo:
```ts

/** Card de "Editais parecidos abertos" (colunas da função relacionados). */
export type EditalRelacionado = Pick<
  EditalResumo,
  'id' | 'slug' | 'objeto' | 'orgao_nome' | 'municipio_nome' | 'uf' | 'valor_estimado' | 'encerramento_em' | 'publicada_em' | 'modalidade_nome' | 'srp'
>;
```

`lib/servidor/consultas.ts`:
1. Troque a linha
```ts
import type { Edital, EditalResumo, FiltrosBusca, ItemEdital, PontoMapa, ResultadoBusca, ResumoItens } from '../tipos';
```
por:
```ts
import type { Edital, EditalRelacionado, EditalResumo, FiltrosBusca, ItemEdital, PontoMapa, ResultadoBusca, ResumoItens } from '../tipos';
```
2. Logo depois de `export const POR_PAGINA = 50;`, acrescente:
```ts
export const LIMITE_RELACIONADOS = 6;
```
3. Acrescente ao fim do arquivo:
```ts

/** Editais parecidos abertos (função SQL `relacionados`), até 6, mais parecidos primeiro. */
export function relacionados(id: string): Promise<EditalRelacionado[]> {
  return cache(`relacionados:${id}`, async () => {
    const { data, error } = await supabaseServidor().rpc('relacionados', { p_id: id, p_limite: LIMITE_RELACIONADOS });
    if (error) throw new Error(`relacionados: ${error.message}`);
    return ((data ?? []) as Linha[]).map(
      (l): EditalRelacionado => ({
        id: String(l.id),
        slug: String(l.slug),
        objeto: String(l.objeto),
        orgao_nome: String(l.orgao_nome),
        municipio_nome: texto(l.municipio_nome),
        uf: String(l.uf),
        valor_estimado: num(l.valor_estimado),
        encerramento_em: String(l.encerramento_em),
        publicada_em: texto(l.publicada_em),
        modalidade_nome: texto(l.modalidade_nome),
        srp: Boolean(l.srp),
      }),
    );
  });
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/servidor/consultas.test.ts && npm run typecheck`
Expected: PASS (13 testes).

- [ ] **Step 5: Commit**

```bash
npm test && npm run typecheck
git add lib/tipos.ts lib/servidor/consultas.ts lib/servidor/consultas.test.ts
git commit -m "feat: editais parecidos lidos pelo servidor (relacionados, cache de 5 min)" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 6: Bloco "Editais parecidos abertos" e etiqueta Pro

**Files:**
- Create: `components/EtiquetaPro.tsx`, `components/edital/Relacionados.tsx`, `components/edital/LinkRelacionado.tsx`
- Modify: `app/edital/[slug]/page.tsx`

**Interfaces:**
- Consumes: `relacionados(id)` (Task 5), `registrar('usou_recurso', { recurso: 'relacionados_clique', edital })` (Task 4), `etiqueta`/`moedaCurta` (`lib/formato.ts`), `assunto`/`nomeProprio` (`lib/texto.ts`), `ESTILO_ETIQUETA`/`PONTO_ETIQUETA` (`components/inicio/estilos.ts`).
- Produces:
  - `EtiquetaPro({ className?: string })` — "· Pro" discreto (usado também nas Tasks 10 e 12).
  - `Relacionados({ editais: EditalRelacionado[]; origem: string; agora: Date })` — `null` sem parecidos.
  - `LinkRelacionado({ href: string; origem: string; className?: string; children: ReactNode })` — `next/link` que registra o clique.

- [ ] **Step 1: Etiqueta Pro**

`components/EtiquetaPro.tsx`:
```tsx
/** Etiqueta discreta dos recursos Pro, o mesmo "· Pro" do chip antigo (abertos a todos até a etapa de Planos ligar o cadeado). */
export function EtiquetaPro({ className = '' }: { className?: string }) {
  return (
    <span className={`shrink-0 font-semibold opacity-70 ${className}`} title="Recurso Pro, aberto a todos por enquanto">
      · Pro
    </span>
  );
}
```

- [ ] **Step 2: Link que registra o clique**

`components/edital/LinkRelacionado.tsx`:
```tsx
'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { registrar } from '@/lib/cliente/registrar';

type Props = { href: string; origem: string; className?: string; children: ReactNode };

/** Card de edital parecido: abre a página dele e registra o uso (com o edital de origem). Sem prefetch, para não consultar 6 editais a cada visita. */
export function LinkRelacionado({ href, origem, className, children }: Props) {
  const marcar = () => registrar('usou_recurso', { recurso: 'relacionados_clique', edital: origem });
  return (
    <Link
      href={href}
      prefetch={false}
      className={className}
      onClick={marcar}
      onAuxClick={(e) => {
        if (e.button === 1) marcar();
      }}
    >
      {children}
    </Link>
  );
}
```

- [ ] **Step 3: Bloco de parecidos**

`components/edital/Relacionados.tsx`:
```tsx
import { EtiquetaPro } from '@/components/EtiquetaPro';
import { ESTILO_ETIQUETA, PONTO_ETIQUETA } from '@/components/inicio/estilos';
import { etiqueta, moedaCurta } from '@/lib/formato';
import { assunto, nomeProprio } from '@/lib/texto';
import type { EditalRelacionado } from '@/lib/tipos';
import { LinkRelacionado } from './LinkRelacionado';

type Props = { editais: EditalRelacionado[]; origem: string; agora: Date };

/** "Editais parecidos abertos": cards no estilo do CardCompacto, cada um levando à página do edital. Sem nenhum, o bloco não aparece. */
export function Relacionados({ editais, origem, agora }: Props) {
  if (editais.length === 0) return null;
  return (
    <section aria-labelledby="parecidos-titulo" className="rounded-lg border border-line bg-raised p-5">
      <h2 id="parecidos-titulo" className="mb-3 flex items-baseline gap-1.5 text-[17px] font-bold">
        Editais parecidos abertos
        <EtiquetaPro className="text-[13px]" />
      </h2>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {editais.map((e) => {
          const et = etiqueta(e, agora);
          const valor = moedaCurta(e.valor_estimado);
          const { titulo, tipo } = assunto(e.objeto);
          return (
            <li key={e.id} className="flex">
              <LinkRelacionado
                href={`/edital/${e.slug}`}
                origem={origem}
                className="flex w-full flex-col gap-2 rounded-md border border-line bg-raised p-3.5 transition-colors hover:border-line-strong"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="line-clamp-3 text-[14px] font-semibold leading-5">{titulo}</span>
                  {valor ? (
                    <span className="shrink-0 whitespace-nowrap font-mono text-[13px] font-medium">{valor}</span>
                  ) : (
                    <span className="w-16 shrink-0 text-right text-[11px] leading-4 text-ink-muted">Valor não informado</span>
                  )}
                </span>
                <span className="truncate text-xs text-ink-muted">{[tipo, nomeProprio(e.orgao_nome), e.uf].filter(Boolean).join(' · ')}</span>
                <span className={`mt-auto inline-flex w-fit items-center gap-1.5 rounded-xs px-2 py-0.5 text-xs font-semibold ${ESTILO_ETIQUETA[et.tom]}`}>
                  <span className={`size-[7px] rounded-full ${PONTO_ETIQUETA[et.tom]}`} aria-hidden="true" />
                  {et.texto}
                </span>
              </LinkRelacionado>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Página do edital**

`app/edital/[slug]/page.tsx`:
1. Depois da linha `import { PrincipaisInformacoes } from '@/components/edital/PrincipaisInformacoes';`, acrescente:
```tsx
import { Relacionados } from '@/components/edital/Relacionados';
```
2. Troque `import { atualizadoEm, edital, itensDoEdital, resumoItens } from '@/lib/servidor/consultas';` por:
```tsx
import { atualizadoEm, edital, itensDoEdital, relacionados, resumoItens } from '@/lib/servidor/consultas';
```
3. Troque `import type { ResumoItens } from '@/lib/tipos';` por:
```tsx
import type { EditalRelacionado, ResumoItens } from '@/lib/tipos';
```
4. Troque
```tsx
  const [itens, resumo, atualizado] = await Promise.all([
    itensDoEdital(e, todos ? 2000 : 50),
    resumoItens(e.id).catch(() => RESUMO_VAZIO),
    atualizadoEm(),
  ]);
```
por:
```tsx
  const [itens, resumo, atualizado, parecidos] = await Promise.all([
    itensDoEdital(e, todos ? 2000 : 50),
    resumoItens(e.id).catch(() => RESUMO_VAZIO),
    atualizadoEm(),
    // Falha nos parecidos não derruba a página: o bloco só não aparece.
    relacionados(e.id).catch((erro: unknown): EditalRelacionado[] => {
      console.error(`relacionados ${e.id}:`, erro);
      return [];
    }),
  ]);
```
5. Troque
```tsx
              <ListaItens itens={itens} total={totalItens} slug={e.slug} todos={todos} />
            </section>
```
por:
```tsx
              <ListaItens itens={itens} total={totalItens} slug={e.slug} todos={todos} />
            </section>
            <Relacionados editais={parecidos} origem={e.slug} agora={agora} />
```

- [ ] **Step 5: Verificar**

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa. Com o `.env` local (a 0007 já está aplicada na Task 2): `npm run dev` e, num edital aberto de EPI (slug da seção [P5]), `curl -s http://localhost:3000/edital/<slug> | grep -c "Editais parecidos abertos"` → `1`. Encerrar o servidor.

- [ ] **Step 6: Commit**

```bash
git add components/EtiquetaPro.tsx components/edital/Relacionados.tsx components/edital/LinkRelacionado.tsx "app/edital/[slug]/page.tsx"
git commit -m "feat: bloco Editais parecidos abertos na página do edital, com etiqueta Pro" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 7: Busca de órgãos (`/api/orgaos`)

**Files:**
- Create: `app/api/orgaos/route.ts`
- Modify: `lib/tipos.ts`, `lib/filtros.ts`, `lib/servidor/consultas.ts`
- Test: `lib/filtros.test.ts`, `lib/servidor/consultas.test.ts`

**Interfaces:**
- Consumes: `orgaos_abertos(q, p_limite)` da 0007; `nomeProprio` (`lib/texto.ts`).
- Produces:
  - `type OrgaoAberto = Orgao & { uf: string; qtd: number }`.
  - `lerTermoOrgao(q: string | null): string | null` (3+ letras; tira `%`, `_`, `\`; colapsa espaços; até 60 caracteres).
  - `LIMITE_ORGAOS = 20`; `orgaosAbertos(q: string): Promise<OrgaoAberto[]>` (cache de 5 min, chave sem acento e em minúsculas).
  - `GET /api/orgaos?q=` → `200 OrgaoAberto[]` (cabeçalho `CACHE_PUBLICO`), `400 { erro }` com termo inválido, `502 { erro }` em falha.

- [ ] **Step 1: Escrever os testes (falhando)**

`lib/filtros.test.ts`: troque a linha de import de `./filtros` por
```ts
import { chaveFiltros, lerFiltros, lerTermoOrgao, normalizarTela, paraParametros, recursosUsados, UFS_ORDENADAS } from './filtros';
```
e acrescente ao fim do arquivo:
```ts
describe('lerTermoOrgao', () => {
  it('3 letras ou mais, com espaços colapsados', () => {
    expect(lerTermoOrgao('  prefeitura   de  ')).toBe('prefeitura de');
    expect(lerTermoOrgao('itá')).toBe('itá');
  });
  it('menos de 3 letras ou vazio é recusado (números não contam)', () => {
    expect(lerTermoOrgao('ab')).toBeNull();
    expect(lerTermoOrgao('a 1 2 3')).toBeNull();
    expect(lerTermoOrgao('')).toBeNull();
    expect(lerTermoOrgao(null)).toBeNull();
  });
  it('tira os curingas do ilike e corta em 60 caracteres', () => {
    expect(lerTermoOrgao('saúde%_\\')).toBe('saúde');
    expect(lerTermoOrgao('%%%')).toBeNull();
    expect(lerTermoOrgao('x'.repeat(100))).toHaveLength(60);
  });
});
```

`lib/servidor/consultas.test.ts`: troque
```ts
const { buscarEditais, itensDoEdital, pontosDoMapa, relacionados, resumoItens } = await import('./consultas');
```
por:
```ts
const { buscarEditais, itensDoEdital, orgaosAbertos, pontosDoMapa, relacionados, resumoItens } = await import('./consultas');
```
e acrescente ao fim do arquivo:
```ts
describe('orgaosAbertos (0007)', () => {
  beforeEach(() => {
    chamadas.length = 0;
    respostaRpc = [];
  });

  it('chama orgaos_abertos com o termo e até 20, com nome limpo e quantidade numérica', async () => {
    respostaRpc = [{ cnpj: '83102244000102', nome: 'MUNICIPIO DE JOINVILLE', uf: 'SC', qtd: '42' }];
    expect(await orgaosAbertos('Joinville')).toEqual([{ cnpj: '83102244000102', nome: 'Municipio de Joinville', uf: 'SC', qtd: 42 }]);
    expect(chamadas).toEqual([{ nome: 'orgaos_abertos', args: { q: 'Joinville', p_limite: 20 } }]);
  });

  it('o cache ignora acento e maiúsculas do termo', async () => {
    await orgaosAbertos('São José');
    await orgaosAbertos('sao jose');
    expect(chamadas).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/filtros.test.ts lib/servidor/consultas.test.ts`
Expected: FAIL — `lerTermoOrgao is not a function` e `orgaosAbertos is not a function`.

- [ ] **Step 3: Implementar**

`lib/tipos.ts`: acrescente ao fim do arquivo:
```ts

/** Órgão com editais abertos, na busca do chip Órgão. */
export type OrgaoAberto = Orgao & { uf: string; qtd: number };
```

`lib/filtros.ts`: acrescente ao fim do arquivo:
```ts

/** Termo da busca de órgão: sem os curingas do ilike (% _ \), espaços colapsados, até 60 caracteres; null com menos de 3 letras. */
export function lerTermoOrgao(q: string | null): string | null {
  const t = (q ?? '').replace(/[%_\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60).trim();
  return (t.match(/\p{L}/gu) ?? []).length >= 3 ? t : null;
}
```

`lib/servidor/consultas.ts`:
1. Troque
```ts
import type { Edital, EditalRelacionado, EditalResumo, FiltrosBusca, ItemEdital, PontoMapa, ResultadoBusca, ResumoItens } from '../tipos';
```
por:
```ts
import type { Edital, EditalRelacionado, EditalResumo, FiltrosBusca, ItemEdital, OrgaoAberto, PontoMapa, ResultadoBusca, ResumoItens } from '../tipos';
```
2. Depois da linha `import { chaveFiltros } from '../filtros';`, acrescente:
```ts
import { nomeProprio } from '../texto';
```
3. Depois de `export const LIMITE_RELACIONADOS = 6;`, acrescente:
```ts
export const LIMITE_ORGAOS = 20;
```
4. Acrescente ao fim do arquivo:
```ts

/** Órgãos com editais abertos cujo nome contém o termo (já limpo por `lerTermoOrgao`), mais editais primeiro. */
export function orgaosAbertos(q: string): Promise<OrgaoAberto[]> {
  const chave = q.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  return cache(`orgaos:${chave}`, async () => {
    const { data, error } = await supabaseServidor().rpc('orgaos_abertos', { q, p_limite: LIMITE_ORGAOS });
    if (error) throw new Error(`orgaos_abertos: ${error.message}`);
    return ((data ?? []) as Linha[]).map(
      (l): OrgaoAberto => ({ cnpj: String(l.cnpj), nome: nomeProprio(String(l.nome)), uf: String(l.uf), qtd: Number(l.qtd) }),
    );
  });
}
```

`app/api/orgaos/route.ts`:
```ts
import { lerTermoOrgao } from '@/lib/filtros';
import { CACHE_PUBLICO } from '@/lib/http';
import { orgaosAbertos } from '@/lib/servidor/consultas';

export async function GET(request: Request) {
  const q = lerTermoOrgao(new URL(request.url).searchParams.get('q'));
  if (!q) return Response.json({ erro: 'Digite pelo menos 3 letras do nome do órgão.' }, { status: 400 });
  try {
    return Response.json(await orgaosAbertos(q), { headers: CACHE_PUBLICO });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Não foi possível buscar os órgãos agora.' }, { status: 502 });
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/filtros.test.ts lib/servidor/consultas.test.ts && npm run typecheck && npm run build`
Expected: PASS; o build lista a rota `ƒ /api/orgaos`. Com o `.env` local: `npm run dev`, `curl -s "http://localhost:3000/api/orgaos?q=joinville"` → lista com `qtd`; `curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/orgaos?q=ab"` → `400`. Encerrar o servidor.

- [ ] **Step 5: Commit**

```bash
npm test && npm run typecheck
git add lib/tipos.ts lib/filtros.ts lib/filtros.test.ts lib/servidor/consultas.ts lib/servidor/consultas.test.ts app/api/orgaos/route.ts
git commit -m "feat: busca de órgãos com editais abertos (/api/orgaos)" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 8: Planilha CSV (`lib/csv.ts`)

**Files:**
- Create: `lib/csv.ts`, `lib/csv.test.ts`
- Modify: `lib/tipos.ts`

**Interfaces:**
- Consumes: `assunto`, `textoLimpo`, `nomeProprio` (`lib/texto.ts`); `linkOficial` (`lib/formato.ts`); `modalidadeCurta` (`lib/participacao.ts`).
- Produces:
  - `type EditalExportado = EditalResumo & { link_origem: string | null }`.
  - `MAX_EXPORTACAO = 2000`; `COLUNAS` (10 nomes, na ordem da spec).
  - `celula(valor: string): string`; `dataHoraPlanilha(iso: string): string` (`dd/mm/aaaa hh:mm`); `dataPlanilha(iso: string | null): string` (`dd/mm/aaaa` ou vazio); `valorPlanilha(v: number | null): string`.
  - `gerarCsv(editais: EditalExportado[]): string` (BOM, `;`, CRLF); `nomeArquivo(agora: Date): string` (`editais-AAAA-MM-DD.csv`).

- [ ] **Step 1: Escrever o teste (falhando)**

`lib/csv.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { celula, COLUNAS, dataHoraPlanilha, dataPlanilha, gerarCsv, MAX_EXPORTACAO, nomeArquivo, valorPlanilha } from './csv';
import { assunto } from './texto';
import type { EditalExportado } from './tipos';

const EDITAL: EditalExportado = {
  id: '83102244000102-1-000077/2026', slug: '83102244000102-2026-77',
  objeto: 'Aquisição de luvas de vaqueta; tamanho "G"\npara a Defesa Civil',
  orgao_nome: 'MUNICIPIO DE JOINVILLE', unidade_nome: null, municipio_nome: 'Joinville', uf: 'SC', codigo_ibge: '4209102',
  valor_estimado: 1234.5, encerramento_em: '2026-10-20T13:00:00Z', publicada_em: '2026-10-15T02:30:00Z',
  modalidade_nome: 'Pregão - Eletrônico', srp: false, onde: 'objeto', link_origem: null,
};

describe('celula', () => {
  it('texto simples fica como está', () => {
    expect(celula('Joinville')).toBe('Joinville');
  });
  it('com ;, aspas ou quebra de linha vai entre aspas, com as aspas dobradas', () => {
    expect(celula('a;b')).toBe('"a;b"');
    expect(celula('tamanho "G"')).toBe('"tamanho ""G"""');
    expect(celula('linha 1\nlinha 2')).toBe('"linha 1\nlinha 2"');
    expect(celula('linha 1\r\nlinha 2')).toBe('"linha 1\r\nlinha 2"');
  });
  it('começo que o Excel leria como fórmula ganha apóstrofo', () => {
    expect(celula('=SOMA(A1)')).toBe("'=SOMA(A1)");
    expect(celula('-5 unidades')).toBe("'-5 unidades");
    expect(celula('@x;y')).toBe(`"'@x;y"`);
  });
});

describe('datas e valores no formato brasileiro', () => {
  it('prazo com a hora de Brasília', () => {
    expect(dataHoraPlanilha('2026-10-20T13:00:00Z')).toBe('20/10/2026 10:00');
  });
  it('publicação no dia de Brasília (02h30 UTC ainda é o dia anterior)', () => {
    expect(dataPlanilha('2026-10-15T02:30:00Z')).toBe('14/10/2026');
    expect(dataPlanilha(null)).toBe('');
  });
  it('valor com vírgula e sem separador de milhar; nulo ou 0 = Valor não informado', () => {
    expect(valorPlanilha(1234.5)).toBe('1234,50');
    expect(valorPlanilha(2500000)).toBe('2500000,00');
    expect(valorPlanilha(null)).toBe('Valor não informado');
    expect(valorPlanilha(0)).toBe('Valor não informado');
  });
  it('nome do arquivo com a data de Brasília', () => {
    expect(nomeArquivo(new Date('2026-10-17T15:00:00Z'))).toBe('editais-2026-10-17.csv');
    expect(nomeArquivo(new Date('2026-10-17T02:00:00Z'))).toBe('editais-2026-10-16.csv');
  });
});

describe('gerarCsv', () => {
  const csv = gerarCsv([
    EDITAL,
    {
      ...EDITAL, id: 'B', slug: '00394452000103-2026-21982', link_origem: 'https://compras.joinville.sc.gov.br/edital/77',
      valor_estimado: null, publicada_em: null, modalidade_nome: null,
    },
  ]);
  const linhas = csv.slice(1).split('\r\n');

  it('começa com o BOM UTF-8 e termina com CRLF', () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(linhas).toHaveLength(4); // cabeçalho, 2 editais e o vazio depois do último CRLF
  });
  it('cabeçalho com as 10 colunas, separadas por ;', () => {
    expect(linhas[0]).toBe(
      'Título;Objeto completo;Órgão;Município;UF;Modalidade;Valor estimado;Prazo das propostas;Publicado em;Link do edital',
    );
    expect(COLUNAS).toHaveLength(10);
    expect(MAX_EXPORTACAO).toBe(2000);
  });
  it('linha do edital: título, objeto limpo entre aspas (sem quebra de linha), órgão limpo, datas e link do PNCP', () => {
    expect(linhas[1]).toBe(
      [
        celula(assunto(EDITAL.objeto).titulo),
        '"Aquisição de luvas de vaqueta; tamanho ""G"" para a Defesa Civil"',
        'Municipio de Joinville',
        'Joinville',
        'SC',
        'Pregão eletrônico',
        '1234,50',
        '20/10/2026 10:00',
        '14/10/2026',
        'https://pncp.gov.br/app/editais/83102244000102/2026/77',
      ].join(';'),
    );
  });
  it('link de origem quando existe; modalidade, valor e publicação ausentes', () => {
    expect(linhas[2].endsWith(';SC;;Valor não informado;20/10/2026 10:00;;https://compras.joinville.sc.gov.br/edital/77')).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/csv.test.ts`
Expected: FAIL — `Failed to resolve import "./csv"`.

- [ ] **Step 3: Implementar**

`lib/tipos.ts`: acrescente ao fim do arquivo:
```ts

/** Linha da planilha: o card da lista + o link de origem (para o link do edital). */
export type EditalExportado = EditalResumo & { link_origem: string | null };
```

`lib/csv.ts`:
```ts
import { linkOficial } from './formato';
import { modalidadeCurta } from './participacao';
import { assunto, nomeProprio, textoLimpo } from './texto';
import type { EditalExportado } from './tipos';

/** Teto de linhas da planilha (a mesma busca da lista, desde o começo). */
export const MAX_EXPORTACAO = 2000;
export const COLUNAS = [
  'Título', 'Objeto completo', 'Órgão', 'Município', 'UF', 'Modalidade', 'Valor estimado', 'Prazo das propostas', 'Publicado em', 'Link do edital',
] as const;

const BOM = '﻿';
const SEPARADOR = ';';
const FIM_DE_LINHA = '\r\n';
const fmtPartes = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

function partes(d: Date) {
  const p = fmtPartes.formatToParts(d);
  const g = (t: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === t)?.value ?? '';
  return { dia: g('day'), mes: g('month'), ano: g('year'), hora: g('hour'), minuto: g('minute') };
}

/** "20/10/2026 10:00" (Brasília), como o Excel em português lê data e hora. */
export function dataHoraPlanilha(iso: string): string {
  const p = partes(new Date(iso));
  return `${p.dia}/${p.mes}/${p.ano} ${p.hora}:${p.minuto}`;
}

/** "15/10/2026" (Brasília); vazio sem data. */
export function dataPlanilha(iso: string | null): string {
  if (!iso) return '';
  const p = partes(new Date(iso));
  return `${p.dia}/${p.mes}/${p.ano}`;
}

/** "1234,50": vírgula decimal e sem separador de milhar (o Excel em português lê como número); nulo ou 0 = "Valor não informado". */
export function valorPlanilha(v: number | null): string {
  return v !== null && Number.isFinite(v) && v > 0 ? v.toFixed(2).replace('.', ',') : 'Valor não informado';
}

/**
 * Uma célula do CSV. Começo com = + - @ (ou tabulação/retorno) ganha um apóstrofo, para o Excel não executar como fórmula;
 * com ; aspas ou quebra de linha, vai entre aspas, com as aspas dobradas.
 */
export function celula(valor: string): string {
  const seguro = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
  return /[;"\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

function linha(e: EditalExportado): string[] {
  // slug = cnpj-ano-sequencial (o CNPJ não tem hífen).
  const [cnpj, ano, sequencial] = e.slug.split('-');
  return [
    assunto(e.objeto).titulo,
    textoLimpo(e.objeto),
    nomeProprio(e.orgao_nome),
    e.municipio_nome ?? '',
    e.uf,
    modalidadeCurta(e.modalidade_nome) ?? '',
    valorPlanilha(e.valor_estimado),
    dataHoraPlanilha(e.encerramento_em),
    dataPlanilha(e.publicada_em),
    linkOficial({ link_origem: e.link_origem, cnpj, ano: Number(ano), sequencial: Number(sequencial) }),
  ];
}

/** CSV para o Excel em português: BOM UTF-8, separador ";", fim de linha CRLF e cabeçalho na primeira linha. */
export function gerarCsv(editais: EditalExportado[]): string {
  const linhas: ReadonlyArray<readonly string[]> = [COLUNAS, ...editais.map(linha)];
  return BOM + linhas.map((l) => l.map(celula).join(SEPARADOR)).join(FIM_DE_LINHA) + FIM_DE_LINHA;
}

/** "editais-2026-10-17.csv" (data de Brasília). */
export function nomeArquivo(agora: Date): string {
  const p = partes(agora);
  return `editais-${p.ano}-${p.mes}-${p.dia}.csv`;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/csv.test.ts && npm run typecheck`
Expected: PASS (11 testes).

- [ ] **Step 5: Commit**

```bash
npm test && npm run typecheck
git add lib/csv.ts lib/csv.test.ts lib/tipos.ts
git commit -m "feat: planilha CSV dos editais (BOM, ponto e vírgula, datas e valores no formato brasileiro)" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 9: Rota `/api/exportar`

**Files:**
- Create: `app/api/exportar/route.ts`
- Modify: `lib/servidor/consultas.ts`, `lib/servidor/registro.ts`
- Test: `lib/servidor/consultas.test.ts`

**Interfaces:**
- Consumes: `buscar_editais` da 0007 (com `link_origem`); `argumentosBusca`/`paraResumo` (Task 3); `gerarCsv`, `nomeArquivo`, `MAX_EXPORTACAO` (Task 8); `LIMITES.exportacoesPorHora`, `gravarEvento(ctx, 'usou_recurso', …)` (Task 4); `contexto()` (`lib/servidor/registro.ts`).
- Produces:
  - `exportarEditais(f: FiltrosBusca): Promise<EditalExportado[]>` — desde o começo, páginas de 1.000, até 2.000; sem cache.
  - `exportacaoDentroDoLimite(ipHash: string | null, limite: number): Promise<boolean>` — conta `eventos` `usou_recurso`/`exportou` do IP na última hora.
  - `GET /api/exportar?<parâmetros de /api/busca>` → `200 text/csv; charset=utf-8` com `Content-Disposition: attachment; filename="editais-AAAA-MM-DD.csv"`; `429 { erro }` acima de 20 por hora; `502 { erro }` em falha. Grava `usou_recurso` `{ recurso: 'exportou', total }`.

- [ ] **Step 1: Escrever o teste (falhando)**

`lib/servidor/consultas.test.ts`: troque
```ts
const { buscarEditais, itensDoEdital, orgaosAbertos, pontosDoMapa, relacionados, resumoItens } = await import('./consultas');
```
por:
```ts
const { buscarEditais, exportarEditais, itensDoEdital, orgaosAbertos, pontosDoMapa, relacionados, resumoItens } = await import('./consultas');
```
e acrescente ao fim do arquivo:
```ts
describe('exportarEditais (0007)', () => {
  beforeEach(() => {
    chamadas.length = 0;
    respostaRpc = [];
  });

  const linha = (i: number) => ({
    id: `E${i}`, slug: `83102244000102-2026-${i}`, objeto: 'Luvas', orgao_nome: 'X', unidade_nome: null, municipio_nome: 'Joinville',
    uf: 'SC', codigo_ibge: '4209102', valor_estimado: null, encerramento_em: '2026-10-30T13:00:00+00:00', publicada_em: null,
    modalidade_nome: null, srp: false, link_origem: i === 0 ? 'https://compras.joinville.sc.gov.br/1' : null, onde: 'objeto', total: 2500,
  });

  it('lê em páginas de 1.000 até 2.000, desde o começo, com os mesmos filtros da busca', async () => {
    respostaRpc = (args: Record<string, unknown>) => Array.from({ length: 1000 }, (_, i) => linha(Number(args.p_deslocamento) + i));
    const r = await exportarEditais({ ...SEM_FILTRO, q: 'luva', deslocamento: 50, orgao: '83102244000102' });
    expect(r).toHaveLength(2000);
    expect(chamadas.map((c) => [c.nome, c.args.p_limite, c.args.p_deslocamento])).toEqual([
      ['buscar_editais', 1000, 0],
      ['buscar_editais', 1000, 1000],
    ]);
    expect(chamadas[0].args).toMatchObject({ q: 'luva', p_orgao: '83102244000102', p_raio_km: null });
    expect(r[0]).toMatchObject({ id: 'E0', slug: '83102244000102-2026-0', link_origem: 'https://compras.joinville.sc.gov.br/1' });
    expect(r[1].link_origem).toBeNull();
  });

  it('para na primeira página incompleta', async () => {
    respostaRpc = [linha(0)];
    expect(await exportarEditais(SEM_FILTRO)).toHaveLength(1);
    expect(chamadas).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/servidor/consultas.test.ts`
Expected: FAIL — `exportarEditais is not a function`.

- [ ] **Step 3: Implementar**

`lib/servidor/consultas.ts`:
1. Troque
```ts
import type { Edital, EditalRelacionado, EditalResumo, FiltrosBusca, ItemEdital, OrgaoAberto, PontoMapa, ResultadoBusca, ResumoItens } from '../tipos';
```
por:
```ts
import type {
  Edital, EditalExportado, EditalRelacionado, EditalResumo, FiltrosBusca, ItemEdital, OrgaoAberto, PontoMapa, ResultadoBusca, ResumoItens,
} from '../tipos';
```
2. Depois da linha `import { criarCache } from '../cache';`, acrescente:
```ts
import { MAX_EXPORTACAO } from '../csv';
```
3. Acrescente ao fim do arquivo:
```ts

/**
 * Linhas da planilha: a mesma busca da lista, desde o começo, até MAX_EXPORTACAO.
 * Páginas de 1.000 (o teto do PostgREST por resposta). Sem cache: cada exportação conta no limite por IP.
 */
export async function exportarEditais(f: FiltrosBusca): Promise<EditalExportado[]> {
  const editais: EditalExportado[] = [];
  for (let de = 0; de < MAX_EXPORTACAO; de += 1000) {
    const { data, error } = await supabaseServidor().rpc('buscar_editais', {
      ...argumentosBusca(f),
      p_limite: Math.min(1000, MAX_EXPORTACAO - de),
      p_deslocamento: de,
    });
    if (error) throw new Error(`exportar: ${error.message}`);
    const linhas = (data ?? []) as Linha[];
    for (const l of linhas) editais.push({ ...paraResumo(l), link_origem: texto(l.link_origem) });
    if (linhas.length < 1000) break;
  }
  return editais;
}
```

`lib/servidor/registro.ts`: depois da função `dentroDoLimite`, acrescente:
```ts

/** Exportações deste IP na última hora (eventos usou_recurso/exportou gravados por /api/exportar) abaixo do limite. */
export async function exportacaoDentroDoLimite(ipHash: string | null, limite: number): Promise<boolean> {
  if (!ipHash) return true;
  const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabaseServidor()
    .from('eventos')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .eq('tipo', 'usou_recurso')
    .eq('detalhe->>recurso', 'exportou')
    .gte('criado_em', desde);
  if (error) throw new Error(`limite de exportações: ${error.message}`);
  return (count ?? 0) < limite;
}
```

`app/api/exportar/route.ts`:
```ts
import { gerarCsv, nomeArquivo } from '@/lib/csv';
import { LIMITES } from '@/lib/eventos';
import { lerFiltros } from '@/lib/filtros';
import { exportarEditais } from '@/lib/servidor/consultas';
import { contexto, exportacaoDentroDoLimite, gravarEvento } from '@/lib/servidor/registro';

/** Planilha (CSV) com os editais da busca atual: os mesmos parâmetros de /api/busca, desde o começo, até 2.000. */
export async function GET(request: Request) {
  const filtros = lerFiltros(new URL(request.url).searchParams);
  try {
    const ctx = await contexto();
    if (!(await exportacaoDentroDoLimite(ctx.ipHash, LIMITES.exportacoesPorHora))) {
      return Response.json(
        { erro: `Limite de ${LIMITES.exportacoesPorHora} exportações por hora atingido. Tente de novo mais tarde.` },
        { status: 429 },
      );
    }
    const editais = await exportarEditais(filtros);
    const agora = new Date();
    // A medição (que também conta o limite) não pode impedir o download.
    await gravarEvento(ctx, 'usou_recurso', { recurso: 'exportou', total: editais.length }).catch((erro: unknown) => console.error(erro));
    return new Response(gerarCsv(editais), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${nomeArquivo(agora)}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Não foi possível exportar agora. Tente de novo.' }, { status: 502 });
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/servidor/consultas.test.ts && npm run typecheck && npm run build`
Expected: PASS (17 testes em consultas); o build lista `ƒ /api/exportar`. Com o `.env` local: `npm run dev` e
```bash
curl -s -H "cookie: em_interno=1" -D "<scratchpad>/cabecalhos.txt" -o "<scratchpad>/editais.csv" "http://localhost:3000/api/exportar?q=luva&uf=SC"
grep -i "content-disposition\|content-type" "<scratchpad>/cabecalhos.txt"
head -c 3 "<scratchpad>/editais.csv" | od -An -tx1
head -1 "<scratchpad>/editais.csv"
```
Expected: `text/csv; charset=utf-8`, `attachment; filename="editais-AAAA-MM-DD.csv"`, ` ef bb bf`, cabeçalho com as 10 colunas. Encerrar o servidor.

- [ ] **Step 5: Commit**

```bash
npm test && npm run typecheck
git add lib/servidor/consultas.ts lib/servidor/consultas.test.ts lib/servidor/registro.ts app/api/exportar/route.ts
git commit -m "feat: rota /api/exportar (CSV da busca atual, até 2.000, 20 por hora por IP)" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 10: Chips "Órgão" e "Raio"

**Files:**
- Create: `components/inicio/PainelOrgao.tsx`
- Modify: `components/inicio/Chips.tsx`, `components/Explorador.tsx`, `components/inicio/ColunaLista.tsx`

**Interfaces:**
- Consumes: `/api/orgaos` e `lerTermoOrgao` (Task 7); `RAIOS_KM`, `normalizarTela`, `recursosUsados`, `paraParametros` (Task 3); `registrar('usou_recurso', { recurso })` (Task 4); `EtiquetaPro` (Task 6); `Popover` (`components/inicio/Popover.tsx`).
- Produces:
  - `PainelOrgao({ orgao: Orgao | null; aoEscolher: (o: Orgao | null) => void })`.
  - `ChipSelect` com `desabilitado?: boolean` e `pro?: boolean`.
  - Chip "Órgão · Pro" (popover de busca, "Todos os órgãos") e chip "Raio · Pro" (só o município, 50, 100, 200 km; "escolha um município" sem cidade), no lugar do "Raio, órgão e recorrência · Pro".
  - `Explorador.aplicar` normaliza a tela, registra `filtro_orgao`/`filtro_raio` e recarrega o mapa quando mudam os parâmetros dele.
  - `ColunaLista` com a prop `raio: number | null` (pílula "Joinville/SC + 100 km" no celular).

- [ ] **Step 1: Painel de busca de órgão**

`components/inicio/PainelOrgao.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { lerTermoOrgao } from '@/lib/filtros';
import { numero } from '@/lib/formato';
import type { Orgao, OrgaoAberto } from '@/lib/tipos';

const ITEM = 'flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-sunken';
const ESPERA_MS = 300;

type Estado = { tipo: 'carregando' } | { tipo: 'pronto'; orgaos: OrgaoAberto[] } | { tipo: 'erro' };

/** Busca de órgão comprador: com 3 letras ou mais consulta /api/orgaos (órgãos com editais abertos, mais editais primeiro). */
export function PainelOrgao({ orgao, aoEscolher }: { orgao: Orgao | null; aoEscolher: (o: Orgao | null) => void }) {
  const [busca, setBusca] = useState('');
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  const termo = lerTermoOrgao(busca);

  useEffect(() => {
    if (!termo) return;
    const controle = new AbortController();
    setEstado({ tipo: 'carregando' });
    // Espera a pessoa parar de digitar; a resposta de um termo antigo é descartada (abort).
    const espera = setTimeout(async () => {
      try {
        const r = await fetch(`/api/orgaos?q=${encodeURIComponent(termo)}`, { signal: controle.signal });
        if (!r.ok) throw new Error(String(r.status));
        const orgaos = (await r.json()) as OrgaoAberto[];
        if (!controle.signal.aborted) setEstado({ tipo: 'pronto', orgaos });
      } catch {
        if (!controle.signal.aborted) setEstado({ tipo: 'erro' });
      }
    }, ESPERA_MS);
    return () => {
      clearTimeout(espera);
      controle.abort();
    };
  }, [termo]);

  const aviso = 'px-2 py-2 text-sm text-ink-muted';
  return (
    <div className="flex flex-col gap-2">
      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Nome do órgão"
        aria-label="Buscar órgão"
        autoComplete="off"
        maxLength={60}
        className="h-9 w-full rounded-sm border border-line-strong bg-raised px-2.5 text-sm"
      />
      <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto" aria-live="polite">
        <button type="button" onClick={() => aoEscolher(null)} aria-current={orgao ? undefined : 'true'} className={`${ITEM} font-semibold`}>
          Todos os órgãos
        </button>
        {orgao ? <p className="truncate px-2 py-1 text-xs text-ink-muted">Escolhido: {orgao.nome}</p> : null}
        {!termo ? <p className={aviso}>Digite 3 letras ou mais do nome.</p> : null}
        {termo && estado.tipo === 'carregando' ? <p className={aviso}>Buscando…</p> : null}
        {termo && estado.tipo === 'erro' ? <p className={aviso}>Não foi possível buscar agora.</p> : null}
        {termo && estado.tipo === 'pronto' && estado.orgaos.length === 0 ? (
          <p className={aviso}>Nenhum órgão com editais abertos com esse nome.</p>
        ) : null}
        {termo && estado.tipo === 'pronto'
          ? estado.orgaos.map((o) => (
              <button
                key={o.cnpj}
                type="button"
                onClick={() => aoEscolher({ cnpj: o.cnpj, nome: o.nome })}
                aria-current={orgao?.cnpj === o.cnpj ? 'true' : undefined}
                className={`${ITEM} ${orgao?.cnpj === o.cnpj ? 'bg-sunken font-semibold' : ''}`}
              >
                <span className="min-w-0">
                  <span className="block truncate">{o.nome}</span>
                  <span className="block text-xs text-ink-muted">{o.uf}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-ink-muted">{numero(o.qtd)}</span>
              </button>
            ))
          : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Chips**

`components/inicio/Chips.tsx`:
1. Troque o bloco de imports
```tsx
import { useMemo, useState, type ReactNode } from 'react';
import { BotaoEmBreve } from '@/components/BotaoEmBreve';
import { MODALIDADES, UFS_ORDENADAS, VALORES_MINIMOS } from '@/lib/filtros';
import { haQuanto, numero } from '@/lib/formato';
import type { Cidade, FiltrosTela, PontoMapa } from '@/lib/tipos';
import { Cadeado, Seta } from './Icones';
import { Popover } from './Popover';
import { chip } from './estilos';
```
por:
```tsx
import { useMemo, useState, type ReactNode } from 'react';
import { EtiquetaPro } from '@/components/EtiquetaPro';
import { MODALIDADES, RAIOS_KM, UFS_ORDENADAS, VALORES_MINIMOS } from '@/lib/filtros';
import { haQuanto, numero } from '@/lib/formato';
import type { Cidade, FiltrosTela, PontoMapa } from '@/lib/tipos';
import { Seta } from './Icones';
import { PainelOrgao } from './PainelOrgao';
import { Popover } from './Popover';
import { chip } from './estilos';
```
2. Substitua a função `ChipSelect` inteira (do comentário `/**\n * Chip que é uma pílula inteira clicável` até o `}` que fecha a função) por:
```tsx
/**
 * Chip que é uma pílula inteira clicável: o texto é só visual e o select nativo (transparente) cobre a pílula toda.
 * O foco aparece no contorno da pílula; a lista de opções é a do sistema. `desabilitado` apaga a pílula e trava o select;
 * `pro` acrescenta a etiqueta "· Pro".
 */
function ChipSelect({
  rotulo,
  textoValor,
  ativo,
  valor,
  aoMudar,
  desabilitado = false,
  pro = false,
  children,
}: {
  rotulo: string;
  textoValor: string;
  ativo: boolean;
  valor: string;
  aoMudar: (v: string) => void;
  desabilitado?: boolean;
  pro?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      className={`${chip(ativo)} relative pr-8 focus-within:outline focus-within:outline-2 focus-within:outline-rio ${desabilitado ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <span className="pointer-events-none max-w-[14rem] truncate">
        {rotulo}: {textoValor}
      </span>
      {pro ? <EtiquetaPro className="pointer-events-none" /> : null}
      <Seta className="pointer-events-none absolute right-3 size-3.5" />
      <select
        aria-label={rotulo}
        value={valor}
        disabled={desabilitado}
        onChange={(e) => aoMudar(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed [&>option]:bg-raised [&>option]:text-ink"
      >
        {children}
      </select>
    </label>
  );
}
```
3. Troque
```tsx
        <BotaoEmBreve recurso="filtros_pro" className={chip(false, 'pro')}>
          <Cadeado className="size-3.5" />
          Raio, órgão e recorrência · Pro
        </BotaoEmBreve>
```
por:
```tsx
        <Popover
          nome="Órgão"
          ativo={Boolean(filtros.orgao)}
          rotulo={
            <>
              <span className="max-w-[14rem] truncate">{filtros.orgao ? `Órgão: ${filtros.orgao.nome}` : 'Órgão'}</span>
              <EtiquetaPro />
            </>
          }
        >
          {(fechar) => (
            <PainelOrgao
              orgao={filtros.orgao}
              aoEscolher={(o) => {
                aoMudar({ ...filtros, orgao: o });
                fechar();
              }}
            />
          )}
        </Popover>
        <ChipSelect
          rotulo="Raio"
          textoValor={!cidade ? 'escolha um município' : filtros.raio ? `${filtros.raio} km` : 'só o município'}
          ativo={Boolean(cidade && filtros.raio)}
          valor={cidade && filtros.raio ? String(filtros.raio) : ''}
          desabilitado={!cidade}
          pro
          aoMudar={(v) => aoMudar({ ...filtros, raio: v ? Number(v) : null })}
        >
          <option value="">só o município</option>
          {RAIOS_KM.map((km) => (
            <option key={km} value={km}>
              {km} km
            </option>
          ))}
        </ChipSelect>
```

- [ ] **Step 3: Explorador e pílula da cidade**

`components/Explorador.tsx`:
1. Troque `import { paraParametros } from '@/lib/filtros';` por:
```tsx
import { normalizarTela, paraParametros, recursosUsados } from '@/lib/filtros';
```
2. Troque a função `aplicar` inteira
```tsx
  /** Aplica filtros novos: a lista sempre; o mapa só quando muda algo além da cidade. Toda mudança conta como busca. */
  function aplicar(novo: FiltrosTela) {
    const mudouMapa =
      novo.q !== filtros.q ||
      novo.uf !== filtros.uf ||
      novo.valorMin !== filtros.valorMin ||
      novo.seteDias !== filtros.seteDias ||
      [...novo.modalidades].sort().join() !== [...filtros.modalidades].sort().join();
    setFiltros(novo);
    // Cidade nova (pelo mapa, pelo chip ou pelo painel): no celular a gaveta abre para mostrar a lista dela.
    if (novo.cidade && novo.cidade.ibge !== filtros.cidade?.ibge) setGavetaAberta(true);
    registrar('busca', { q: novo.q.trim() || null, uf: novo.uf || null, dias: novo.seteDias ? 7 : null });
    void carregarLista(novo);
    // Repetir a busca depois de um erro do mapa tenta o mapa de novo.
    if (mudouMapa || erroMapa !== null) void carregarMapa(novo);
  }
```
por:
```tsx
  /** Aplica filtros novos: a lista sempre; o mapa só quando muda o que ele recebe. Toda mudança conta como busca. */
  function aplicar(pedido: FiltrosTela) {
    // Sem município não há raio (trocar a UF ou tirar a cidade tira o raio também).
    const novo = normalizarTela(pedido);
    // O mapa recebe tudo menos a cidade sozinha; com raio, recebe a cidade e o raio.
    const mudouMapa = paraParametros(novo, { comCidade: false }).toString() !== paraParametros(filtros, { comCidade: false }).toString();
    setFiltros(novo);
    // Cidade nova (pelo mapa, pelo chip ou pelo painel): no celular a gaveta abre para mostrar a lista dela.
    if (novo.cidade && novo.cidade.ibge !== filtros.cidade?.ibge) setGavetaAberta(true);
    registrar('busca', { q: novo.q.trim() || null, uf: novo.uf || null, dias: novo.seteDias ? 7 : null });
    for (const recurso of recursosUsados(filtros, novo)) registrar('usou_recurso', { recurso });
    void carregarLista(novo);
    // Repetir a busca depois de um erro do mapa tenta o mapa de novo.
    if (mudouMapa || erroMapa !== null) void carregarMapa(novo);
  }
```
3. Troque
```tsx
            cidade={filtros.cidade}
            aoTirarCidade={() => aplicar({ ...filtros, cidade: null })}
```
por:
```tsx
            cidade={filtros.cidade}
            raio={filtros.raio}
            aoTirarCidade={() => aplicar({ ...filtros, cidade: null })}
```

`components/inicio/ColunaLista.tsx`:
1. Troque
```tsx
  cidade: Cidade | null;
  aoTirarCidade: () => void;
```
por:
```tsx
  cidade: Cidade | null;
  /** Raio em km a partir da cidade (aparece na pílula do celular). */
  raio: number | null;
  aoTirarCidade: () => void;
```
2. Troque
```tsx
              <span className="truncate">
                {p.cidade.nome}/{p.cidade.uf}
              </span>
```
por:
```tsx
              <span className="truncate">
                {p.cidade.nome}/{p.cidade.uf}
                {p.raio ? ` + ${p.raio} km` : ''}
              </span>
```

- [ ] **Step 4: Verificar**

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa; `grep -rn "recorrência" components` → nada. Com o `.env` local, `npm run dev` e, no navegador (1440 px): chip "Raio" apagado com "Raio: escolha um município"; escolher Joinville no chip Município → "Raio" habilita; 100 km → a lista e o mapa passam a mostrar municípios vizinhos; "Todos os municípios" → o raio volta para "escolha um município". Chip "Órgão": "jo" mostra "Digite 3 letras…"; "joinville" lista órgãos com quantidade; escolher um → lista e mapa só dele; "Todos os órgãos" tira. Encerrar o servidor.

- [ ] **Step 5: Commit**

```bash
git add components/inicio/PainelOrgao.tsx components/inicio/Chips.tsx components/Explorador.tsx components/inicio/ColunaLista.tsx
git commit -m "feat: chips Órgão e Raio no lugar do chip Pro em breve" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 11: Círculo do raio no mapa

**Files:**
- Modify: `lib/geo.ts`, `components/Mapa.tsx`, `components/Explorador.tsx`
- Test: `lib/geo.test.ts`

**Interfaces:**
- Consumes: `FiltrosTela.cidade`/`raio` (Task 3); pontos do mapa (`PontoMapa.lat/lng`).
- Produces:
  - `type Raio = { lng: number; lat: number; km: number }`
  - `distanciaKm(a: [number, number], b: [number, number]): number` (haversine, [lng, lat])
  - `circulo(lng: number, lat: number, km: number, passos?: number): Feature<Polygon>` (anel fechado de `passos + 1` pontos)
  - `limitesDoCirculo(c: Feature<Polygon>): [[number, number], [number, number]]`
  - `areaDoRaio(r: Raio | null): FeatureCollection<Polygon>`
  - `Mapa` com a prop `raio: Raio | null` (linha tracejada fina e enquadramento na área).

- [ ] **Step 1: Escrever o teste (falhando)**

`lib/geo.test.ts`: troque `import { paraGeoJSON } from './geo';` por
```ts
import { areaDoRaio, circulo, distanciaKm, limitesDoCirculo, paraGeoJSON } from './geo';
```
e acrescente ao fim do arquivo:
```ts
// Sedes (lng, lat) de Joinville, Blumenau e Florianópolis.
const JOINVILLE: [number, number] = [-48.8487, -26.3045];
const BLUMENAU: [number, number] = [-49.0661, -26.9194];
const FLORIANOPOLIS: [number, number] = [-48.548, -27.5954];

describe('distanciaKm (haversine, a mesma conta de municipios_no_raio)', () => {
  it('Joinville–Blumenau dentro de 100 km; Joinville–Florianópolis fora', () => {
    const blumenau = distanciaKm(JOINVILLE, BLUMENAU);
    const florianopolis = distanciaKm(JOINVILLE, FLORIANOPOLIS);
    expect(blumenau).toBeGreaterThan(65);
    expect(blumenau).toBeLessThan(80);
    expect(florianopolis).toBeGreaterThan(140);
    expect(florianopolis).toBeLessThan(155);
  });
});

describe('circulo', () => {
  it('anel fechado de 65 pontos, todos a R km do centro', () => {
    const anel = circulo(JOINVILLE[0], JOINVILLE[1], 100).geometry.coordinates[0];
    expect(anel).toHaveLength(65);
    expect(anel[64]).toEqual(anel[0]);
    for (const p of anel) expect(distanciaKm(JOINVILLE, p as [number, number])).toBeCloseTo(100, 6);
  });
  it('a caixa do círculo tem 2R de altura (1° de latitude ≈ 111,195 km)', () => {
    const [[oeste, sul], [leste, norte]] = limitesDoCirculo(circulo(JOINVILLE[0], JOINVILLE[1], 100));
    expect(norte - sul).toBeCloseTo(200 / 111.195, 3);
    expect(oeste).toBeLessThan(JOINVILLE[0]);
    expect(leste).toBeGreaterThan(JOINVILLE[0]);
  });
});

describe('areaDoRaio', () => {
  it('vazia sem raio; um polígono com raio', () => {
    expect(areaDoRaio(null)).toEqual({ type: 'FeatureCollection', features: [] });
    expect(areaDoRaio({ lng: JOINVILLE[0], lat: JOINVILLE[1], km: 50 }).features).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/geo.test.ts`
Expected: FAIL — `distanciaKm is not a function`.

- [ ] **Step 3: Implementar**

`lib/geo.ts`: troque `import type { FeatureCollection, Point } from 'geojson';` por
```ts
import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';
```
e acrescente ao fim do arquivo:
```ts

/** Área do filtro de raio no mapa: centro (sede do município, [lng, lat]) e raio em km. */
export type Raio = { lng: number; lat: number; km: number };

const RAIO_TERRA_KM = 6371;
const rad = (g: number) => (g * Math.PI) / 180;
const graus = (r: number) => (r * 180) / Math.PI;

/** Distância em km entre dois pontos [lng, lat] (haversine, a mesma conta de municipios_no_raio na 0007). */
export function distanciaKm(a: [number, number], b: [number, number]): number {
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Círculo de `km` em volta de [lng, lat] como polígono de `passos` lados (anel fechado: o último ponto repete o primeiro). */
export function circulo(lng: number, lat: number, km: number, passos = 64): Feature<Polygon> {
  const d = km / RAIO_TERRA_KM;
  const f1 = rad(lat);
  const l1 = rad(lng);
  const anel: [number, number][] = [];
  for (let i = 0; i <= passos; i++) {
    const rumo = (2 * Math.PI * (i % passos)) / passos;
    const f2 = Math.asin(Math.sin(f1) * Math.cos(d) + Math.cos(f1) * Math.sin(d) * Math.cos(rumo));
    const l2 = l1 + Math.atan2(Math.sin(rumo) * Math.sin(d) * Math.cos(f1), Math.cos(d) - Math.sin(f1) * Math.sin(f2));
    anel.push([graus(l2), graus(f2)]);
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [anel] }, properties: {} };
}

/** Caixa [[oeste, sul], [leste, norte]] do círculo, para enquadrar o mapa. */
export function limitesDoCirculo(c: Feature<Polygon>): [[number, number], [number, number]] {
  const anel = c.geometry.coordinates[0];
  const lngs = anel.map((p) => p[0]);
  const lats = anel.map((p) => p[1]);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

/** GeoJSON da área do raio: vazio sem raio. */
export function areaDoRaio(r: Raio | null): FeatureCollection<Polygon> {
  return { type: 'FeatureCollection', features: r ? [circulo(r.lng, r.lat, r.km)] : [] };
}
```

`components/Mapa.tsx`:
1. Troque `import { paraGeoJSON, type PropsPonto } from '@/lib/geo';` por:
```tsx
import { areaDoRaio, circulo, limitesDoCirculo, paraGeoJSON, type PropsPonto, type Raio } from '@/lib/geo';
```
2. Troque
```tsx
  aoEscolherCidade: (c: Cidade) => void;
};
```
por:
```tsx
  aoEscolherCidade: (c: Cidade) => void;
  /** Área do filtro de raio (centro na sede do município): círculo fino e enquadramento nela. */
  raio: Raio | null;
};
```
3. Troque `export function Mapa({ pontos, porUf, destaque, aoEscolherCidade }: Props) {` por:
```tsx
export function Mapa({ pontos, porUf, destaque, aoEscolherCidade, raio }: Props) {
```
4. Troque `  const escolher = useRef(aoEscolherCidade);` por:
```tsx
  const escolher = useRef(aoEscolherCidade);
  const raioAtual = useRef(raio);
```
5. Logo antes do `useEffect` que começa com `    const m = mapa.current;\n    const lib = biblioteca.current;` (o do pino), acrescente:
```tsx
  // Raio: círculo fino na área e o mapa enquadra nela. Depende só dos números: um objeto novo com os mesmos valores não reenquadra.
  useEffect(() => {
    raioAtual.current = raio;
    const m = mapa.current;
    if (!pronto || !m) return;
    (m.getSource('raio') as GeoJSONSource | undefined)?.setData(areaDoRaio(raio));
    if (!raio) return;
    // No celular a gaveta recolhida cobre a base do mapa (no máximo metade da altura, senão o fitBounds desiste).
    const celular = window.matchMedia('(max-width: 1023px)').matches;
    const baixo = celular ? Math.min(ALTURA_GAVETA_RECOLHIDA + 24, Math.floor(m.getContainer().clientHeight / 2)) : 40;
    m.fitBounds(limitesDoCirculo(circulo(raio.lng, raio.lat, raio.km)), { padding: { top: 40, right: 40, left: 40, bottom: baixo }, duration: 600 });
  }, [pronto, raio?.lng, raio?.lat, raio?.km]);

```
6. Troque
```tsx
        m.addLayer({
          id: 'estados-contorno', type: 'line', source: 'estados',
          paint: { 'line-color': contorno.cor as ExpressionSpecification | string, 'line-width': contorno.largura as ExpressionSpecification | number },
        });
```
por:
```tsx
        m.addLayer({
          id: 'estados-contorno', type: 'line', source: 'estados',
          paint: { 'line-color': contorno.cor as ExpressionSpecification | string, 'line-width': contorno.largura as ExpressionSpecification | number },
        });
        m.addSource('raio', { type: 'geojson', data: areaDoRaio(raioAtual.current) });
        m.addLayer({
          id: 'raio', type: 'line', source: 'raio',
          paint: { 'line-color': '#0c2340', 'line-width': 1.5, 'line-dasharray': [2, 2] },
        });
```

`components/Explorador.tsx`:
1. Depois da linha `import { registrar } from '@/lib/cliente/registrar';`, acrescente:
```tsx
import type { Raio } from '@/lib/geo';
```
2. Troque `  const [gavetaAberta, setGavetaAberta] = useState(false);` por:
```tsx
  const [gavetaAberta, setGavetaAberta] = useState(false);
  // Sede de cada município já visto no mapa: centro do círculo do raio (a cidade escolhida sempre veio de um ponto do mapa).
  const [centros, setCentros] = useState<Record<string, [number, number]>>({});
```
3. Troque
```tsx
      if (id !== pedidoMapa.current) return;
      setPontos(novos);
```
por:
```tsx
      if (id !== pedidoMapa.current) return;
      setPontos(novos);
      setCentros((anteriores) => {
        const todos = { ...anteriores };
        for (const p of novos) todos[p.codigo_ibge] = [p.lng, p.lat];
        return todos;
      });
```
4. Troque
```tsx
  const selecionado = resultado.editais.find((e) => e.id === selecionadoId) ?? resultado.editais[0] ?? null;
```
por:
```tsx
  const selecionado = resultado.editais.find((e) => e.id === selecionadoId) ?? resultado.editais[0] ?? null;
  const centro = filtros.cidade && filtros.raio ? centros[filtros.cidade.ibge] : undefined;
  const raioMapa = useMemo<Raio | null>(
    () => (centro && filtros.raio ? { lng: centro[0], lat: centro[1], km: filtros.raio } : null),
    [centro, filtros.raio],
  );
```
5. Troque
```tsx
          <Mapa pontos={pontos} porUf={painel.porUf} destaque={selecionado?.codigo_ibge ?? null} aoEscolherCidade={escolherCidade} />
```
por:
```tsx
          <Mapa pontos={pontos} porUf={painel.porUf} destaque={selecionado?.codigo_ibge ?? null} aoEscolherCidade={escolherCidade} raio={raioMapa} />
```

- [ ] **Step 4: Rodar e verificar**

Run: `npx vitest run lib/geo.test.ts && npm test && npm run typecheck && npm run build`
Expected: PASS (geo: 5 testes). Com o `.env` local, `npm run dev`: Joinville + 100 km → círculo tracejado fino em volta de Joinville, o mapa enquadra nele, Blumenau dentro e Florianópolis fora; trocar para 200 km reenquadra; "Todos os municípios" apaga o círculo. Em 390 px o círculo fica acima da gaveta recolhida. Encerrar o servidor.

- [ ] **Step 5: Commit**

```bash
git add lib/geo.ts lib/geo.test.ts components/Mapa.tsx components/Explorador.tsx
git commit -m "feat: círculo do raio no mapa, com enquadramento na área" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 12: Botão "Exportar"

**Files:**
- Create: `components/inicio/BotaoExportar.tsx`
- Modify: `components/inicio/Icones.tsx`, `components/inicio/ColunaLista.tsx`, `components/Explorador.tsx`

**Interfaces:**
- Consumes: `GET /api/exportar` (Task 9); `MAX_EXPORTACAO` (Task 8); `EtiquetaPro` (Task 6); `paraParametros` (Task 3).
- Produces:
  - `Planilha({ className?: string })` (ícone).
  - `BotaoExportar({ parametros: string; total: number })` — baixa o CSV por `fetch` + `blob` (mostra o erro da API, ex.: limite por hora).
  - `ColunaLista` com a prop `parametrosBusca: string`.

- [ ] **Step 1: Ícone**

Acrescente ao fim de `components/inicio/Icones.tsx`:
```tsx

export function Planilha({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M4 9h16M4 15h16M10 3v18" />
    </svg>
  );
}
```

- [ ] **Step 2: Botão**

`components/inicio/BotaoExportar.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { EtiquetaPro } from '@/components/EtiquetaPro';
import { MAX_EXPORTACAO } from '@/lib/csv';
import { numero } from '@/lib/formato';
import { Planilha } from './Icones';

const ERRO = 'Não foi possível exportar agora. Tente de novo.';

type Props = {
  /** Parâmetros da busca atual (os mesmos de /api/busca). */
  parametros: string;
  total: number;
};

/** Baixa a planilha (CSV) da busca atual. Por fetch, para mostrar o erro da API (como o limite por hora) em vez de um download quebrado. */
export function BotaoExportar({ parametros, total }: Props) {
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function exportar() {
    setBaixando(true);
    setErro(null);
    try {
      const r = await fetch(`/api/exportar?${parametros}`);
      if (!r.ok) {
        const corpo = (await r.json().catch(() => null)) as { erro?: unknown } | null;
        throw new Error(typeof corpo?.erro === 'string' && corpo.erro ? corpo.erro : ERRO);
      }
      const nome = /filename="([^"]+)"/.exec(r.headers.get('content-disposition') ?? '')?.[1] ?? 'editais.csv';
      const url = URL.createObjectURL(await r.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = nome;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      setErro(e instanceof Error && e.message ? e.message : ERRO);
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div className="ml-auto flex shrink-0 flex-col items-end">
      <button
        type="button"
        onClick={exportar}
        disabled={total === 0 || baixando}
        title={`Baixa uma planilha (CSV) com até ${numero(MAX_EXPORTACAO)} editais desta busca`}
        className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-line-strong bg-raised px-2.5 text-[13px] font-semibold hover:bg-sunken disabled:opacity-50"
      >
        <Planilha className="size-4" />
        {baixando ? 'Exportando…' : 'Exportar'}
        <EtiquetaPro />
      </button>
      {erro ? (
        <p role="alert" className="mt-1 max-w-[16rem] text-right text-xs text-pin-strong">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Topo da lista**

`components/inicio/ColunaLista.tsx`:
1. Depois de `import { CardCompacto } from './CardCompacto';`, acrescente:
```tsx
import { BotaoExportar } from './BotaoExportar';
```
2. Troque
```tsx
  /** Raio em km a partir da cidade (aparece na pílula do celular). */
  raio: number | null;
```
por:
```tsx
  /** Raio em km a partir da cidade (aparece na pílula do celular). */
  raio: number | null;
  /** Parâmetros da busca atual (os mesmos de /api/busca), para o botão Exportar. */
  parametrosBusca: string;
```
3. Troque
```tsx
              <button type="button" onClick={p.aoTirarCidade} aria-label="Tirar filtro de cidade" className="size-6 shrink-0 text-base leading-none">
                ×
              </button>
            </span>
          ) : null}
        </div>
```
por:
```tsx
              <button type="button" onClick={p.aoTirarCidade} aria-label="Tirar filtro de cidade" className="size-6 shrink-0 text-base leading-none">
                ×
              </button>
            </span>
          ) : null}
          <BotaoExportar parametros={p.parametrosBusca} total={total} />
        </div>
```

`components/Explorador.tsx`: troque
```tsx
            raio={filtros.raio}
```
por:
```tsx
            raio={filtros.raio}
            parametrosBusca={paraParametros(filtros).toString()}
```

- [ ] **Step 4: Verificar**

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa. Com o `.env` local, `npm run dev`: buscar "luva" e clicar "Exportar" → baixa `editais-AAAA-MM-DD.csv` com o total da busca (até 2.000) e as mesmas linhas da lista; com 0 resultados o botão fica apagado; em 390 px o botão cabe na linha da contagem sem aumentar a gaveta recolhida. Encerrar o servidor.

- [ ] **Step 5: Commit**

```bash
git add components/inicio/Icones.tsx components/inicio/BotaoExportar.tsx components/inicio/ColunaLista.tsx components/Explorador.tsx
git commit -m "feat: botão Exportar no topo da lista (planilha da busca atual)" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 13 (controlador): publicar, conferir e capturar

**Files:**
- Modify: `docs/fase-3-metricas.md`

Todos os passos são do controlador.

- [ ] **Step 1: Pré-condições**

Branch `recursos-pro` com as Tasks 1–12; `npm test && npm run typecheck && npm run build` passam. 0007 (e 0008, se houve) aplicada: `select name from supabase_migrations.schema_migrations order by version;` contém `recursos_pro`.

- [ ] **Step 2: Publicar**

`vercel deploy --prod --yes`. Se responder "Not authorized", repetir uma vez; se falhar de novo, parar e avisar o dono.

- [ ] **Step 3: Conferir as rotas**

```bash
B=https://edital-map.vercel.app
curl -s "$B/api/orgaos?q=joinville" | node -e "const r=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(r.length, r[0])"
curl -s -o /dev/null -w "%{http_code}\n" "$B/api/orgaos?q=ab"
curl -s "$B/api/busca?ibge=4209102" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).total)"
curl -s "$B/api/busca?ibge=4209102&raio=100" | node -e "const r=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(r.total, [...new Set(r.editais.map(e=>e.municipio_nome))].join(', '))"
curl -s "$B/api/busca?orgao=<cnpj de [P4]>" | node -e "const r=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(r.total, new Set(r.editais.map(e=>e.slug.split('-')[0])).size)"
curl -s "$B/api/mapa?ibge=4209102&raio=100" | node -e "const p=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(p.length, p.some(x=>x.codigo_ibge==='4205407'))"
curl -s -H "cookie: em_interno=1" -D "<scratchpad>/cab.txt" -o "<scratchpad>/editais.csv" "$B/api/exportar?q=luva"
grep -i "content-type\|content-disposition" "<scratchpad>/cab.txt"; head -c 3 "<scratchpad>/editais.csv" | od -An -tx1; wc -l "<scratchpad>/editais.csv"
curl -s "$B/edital/<slug de EPI de [P5]>" | grep -c "Editais parecidos abertos"
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "content-type: application/json" -H "cookie: em_interno=1" -d '{"tipo":"usou_recurso","detalhe":{"recurso":"filtro_raio"}}' "$B/api/eventos"
```
Expected: órgãos > 0 com `qtd`; `400`; total com raio > total só de Joinville e mais de um município na lista; órgão → `1` CNPJ distinto; mapa com raio sem Florianópolis (`false`); CSV `text/csv; charset=utf-8`, `attachment; filename="editais-…csv"`, ` ef bb bf`, linhas ≤ 2001; `1` na página do edital; `204` no evento.

- [ ] **Step 4: Eventos e portão**

Marcar o navegador do controlador como interno (`$B/sobre?interno=1`) e, no site: escolher um órgão, ligar um raio, clicar num edital parecido, exportar. Seção [P7] de `docs/fase-3-recursos-pro.sql`: os quatro recursos aparecem com `interno = true`. Rodar `docs/fase-2-portao.sql`: a coluna `uso_por_recurso` aparece (sem os internos).

- [ ] **Step 5: Capturas**

Edge invisível na porta 9333 (instruções no topo de `scripts/capturas.mjs`) e `CAPTURAS_INTERNO=1 npm run capturas -- https://edital-map.vercel.app <slug de EPI> <slug de objeto longo>`. Olhar nas imagens: bloco "Editais parecidos abertos · Pro" abaixo dos itens (até 6 cards, 2 colunas no computador, 1 no celular); chips "Órgão · Pro" e "Raio: escolha um município · Pro" na tela inicial; botão "Exportar · Pro" na linha da contagem. Para os chips abertos (a tela inicial não lê filtros da URL), usar o navegador (1440 px e 390 px): Município Joinville → Raio 100 km (círculo no mapa) e o chip Órgão aberto com "joinville" digitado; capturar as duas telas.

- [ ] **Step 6: CSV no Excel**

Abrir `<scratchpad>/editais.csv` no Excel (ou pedir ao dono, se a máquina não tiver Excel): colunas separadas certo (10), acentos certos ("Órgão", "Pregão eletrônico"), datas como data, "Valor estimado" somável, links clicáveis.

- [ ] **Step 7: Registrar**

Acrescentar à seção "Recursos Pro (0007)" de `docs/fase-3-metricas.md`:
```markdown
- Publicado em aaaa-mm-dd hh:mm. Rotas: /api/orgaos?q=joinville N órgãos; raio de 100 km de Joinville: N editais em M municípios (só Joinville: K); CSV de "luva": N linhas, BOM e cabeçalho certos; aberto no Excel por <quem> (colunas e acentos certos).
- Eventos usou_recurso gravados: relacionados_clique, filtro_orgao, filtro_raio, exportou ([P7]); portão com uso_por_recurso.
- Capturas: edital com parecidos, chips Órgão e Raio (1440 e 390 px).
```
```bash
git add docs/fase-3-metricas.md
git commit -m "docs: recursos Pro publicados e conferidos" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 14: Documentação, aceite e merge

**Files:**
- Modify: `CLAUDE.md`, `docs/superpowers/specs/2026-10-17-fase-3-recursos-pro-design.md` (§5)

- [ ] **Step 1: `CLAUDE.md`**

1. Troque
```markdown
Fase atual: **3 · Brasil todo** (etapa da Fase 3 antes de Planos e Alertas). Site Next.js na Vercel em https://edital-map.vercel.app (domínio próprio pendente) sobre o espelho do PNCP (27 UFs) atualizado a cada 3 h.
```
por:
```markdown
Fase atual: **3 · Brasil todo + recursos Pro** (etapa da Fase 3 antes de Planos e Alertas). Site Next.js na Vercel em https://edital-map.vercel.app (domínio próprio pendente) sobre o espelho do PNCP (27 UFs) atualizado a cada 3 h.
```
2. Depois da linha `- Planos (desenhado, implementação adiada até o domínio): docs/superpowers/specs/2026-10-16-fase-3-planos-design.md.`, acrescente:
```markdown
- Recursos Pro (parecidos, órgão, raio, exportar): spec docs/superpowers/specs/2026-10-17-fase-3-recursos-pro-design.md, plano docs/superpowers/plans/2026-10-17-fase-3-recursos-pro.md, conferências docs/fase-3-recursos-pro.sql.
```
3. Depois da linha `- Página inicial em três colunas a partir de lg (1024 px); abaixo, mapa em tela cheia e lista na gaveta.`, acrescente:
```markdown
- Recursos Pro (editais parecidos, chips Órgão e Raio, Exportar) ficam abertos a todos com a etiqueta "· Pro" (components/EtiquetaPro.tsx) até a etapa de Planos ligar o cadeado; o uso é medido no evento usou_recurso (relacionados_clique, filtro_orgao, filtro_raio; exportou só pela rota /api/exportar).
- Órgão = contratacoes.cnpj (parâmetro orgao, 14 caracteres). Raio = haversine sobre municipios.lat/lng a partir da sede do município (municipios_no_raio; 50/100/200 km; parâmetro raio só com ibge); o mapa só recebe a cidade junto com o raio.
- Exportar: /api/exportar com os parâmetros de /api/busca, até 2.000 editais, CSV com BOM UTF-8 e ";" (lib/csv.ts), 20 por hora por IP (conta os eventos exportou).
```

- [ ] **Step 2: Aceite na spec**

Na seção 5 da spec, marque `[x]` em cada critério cumprido, com o comprovante ao lado (tempo medido de `relacionados`, números do raio de Joinville, data da publicação, arquivo de métricas, capturas); o que faltar fica `[ ]` com uma frase do que falta.

- [ ] **Step 3: Verificação final**

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-10-17-fase-3-recursos-pro-design.md
git commit -m "docs: recursos Pro no ar, regras novas e aceite" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

- [ ] **Step 5 (controlador): Merge**

```bash
git checkout main
git pull --ff-only
git merge --ff-only recursos-pro
git push origin main
git checkout recursos-pro
git push -u origin recursos-pro
```
Se o `--ff-only` falhar (o `main` andou), `git rebase main` no `recursos-pro`, `npm test && npm run typecheck && npm run build` e repetir.

---

## Cobertura da spec

| Spec | Onde |
|---|---|
| §1 função `relacionados(p_id, p_limite default 6)`, OR das palavras do objeto, abertas, sem o próprio e sem duplicadas, `ts_rank` + itens com peso menor, bônus de UF, desempate por prazo, colunas do card, só servidor | Task 1 (SQL e guardas), Task 2 (conferência [P5]) |
| §1 site: `relacionados(id)` com cache de 5 min, falha some o bloco, cards no estilo do `CardCompacto` com link, sem parecidos sem bloco | Tasks 5 e 6 |
| §1 meta < 300 ms com `explain analyze` | Task 2, Steps 5–7 (0008 se precisar) |
| §2 chip Pro vira "Órgão" e "Raio"; recorrência sai do texto | Task 10 |
| §2.1 busca de órgão (3+ letras, `/api/orgaos`, até 20, sem acento, `nomeProprio`, UF, quantidade, ordem por quantidade, cache de 5 min) | Tasks 1 (`orgaos_abertos`), 7 e 10 |
| §2.1 filtro por órgão na lista e no mapa, parâmetro `orgao`, "Todos os órgãos", `p_orgao default null` com assinaturas antigas derrubadas e revokes/grants | Tasks 1, 3 e 10 |
| §2.2 chip Raio só com município ("escolha um município"), 50/100/200 km, haversine, parâmetro `raio`, `p_raio_km` na lista e no mapa, círculo | Tasks 1, 3, 10 e 11 |
| §3 botão Exportar com ícone, `editais-AAAA-MM-DD.csv`, mesmos filtros, até 2.000, `/api/exportar`, BOM, `;`, datas brasileiras, as 10 colunas, 20/hora por IP | Tasks 8, 9 e 12 |
| §4 etiqueta Pro nos chips, no botão e no título do bloco | Tasks 6, 10 e 12 |
| §4 eventos `usou_recurso` (4 recursos; só `relacionados_clique` com edital) e portão por recurso | Tasks 1 (restrição), 4, 6, 9 e 10 |
| §5 testes vitest (contrato da rpc de relacionados, ida-e-volta `orgao`/`raio`, CSV, validação de `q`, eventos) | Tasks 3, 4, 5, 7, 8, 9 |
| §5 banco (EPI → EPI, `p_orgao` só aquele órgão, 100 km de Joinville com Blumenau e sem Florianópolis, tempo) | Task 2 ([P3]–[P5]) |
| §5 navegador (capturas do edital, dos chips e o CSV no Excel) | Task 13, Steps 5–6 |
| §5 testes e typecheck passando; publicado | Tasks 13 e 14 |

## Riscos conhecidos (para o revisor e o controlador)

- **Relevância dos parecidos.** `ts_rank` não pesa raridade: uma palavra comum que escapou da lista de palavras de abertura pode puxar editais pouco parecidos. A lista de genéricas fica na 0007 (e na 0008, se houver); trocar exige migração nova. A conferência [P5] olha os resultados de três editais antes da tela.
- **Tempo dos parecidos.** A busca "qualquer uma de até 16 palavras" pode casar com milhares de abertas, e todas passam pelo `ts_rank`. O Step 7 da Task 2 tem a versão leve (8 palavras, só pelo objeto); se ainda passar de 300 ms, o dono decide antes da tela.
- **Mapa com raio.** Com raio, o mapa, a legenda e "Onde mais compram" mostram só a área; a lista de municípios do chip também (para escolher uma cidade fora, tirar a cidade ou trocar a UF). A cidade sozinha continua sem filtrar o mapa, como hoje.
- **Órgão com outra UF.** O chip Órgão não mexe na UF escolhida: um órgão de PR com UF = SC dá lista vazia (a pessoa tira um dos dois).
- **Limite de exportação.** Conta os eventos `exportou` do IP; sem `IP_SAL` no servidor (hash nulo) não há limite, como nas outras rotas. Se gravar o evento falhar, aquele download não conta.
- **Planilha.** Valor sai como "1234,50" (número no Excel em português); "Valor não informado" fica como texto na mesma coluna (regra do projeto) e a soma do Excel ignora. Células que começariam com `=`, `+`, `-` ou `@` ganham um apóstrofo na frente.
