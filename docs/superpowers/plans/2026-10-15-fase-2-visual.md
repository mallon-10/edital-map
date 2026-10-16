# Edital Map · Fase 2 · Visual — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refazer a página inicial no desenho do mockup do usuário (três colunas: lista, mapa do Brasil com estados coloridos, edital selecionado) e organizar a página do edital (principais informações, itens e textos limpos, ME/EPP).

**Architecture:** Mesmo site Next.js 16 da Fase 2. Uma migration nova (`0004`) acrescenta filtros (valor mínimo, modalidade), devolve mais campos na busca e cria `resumo_itens`; o worker passa a guardar benefício ME/EPP e critério de julgamento dos itens e ganha um comando de releitura. Toda a limpeza de texto, abreviação de valores, etiquetas, painel e "onde a disputa acontece" são funções puras testadas em `lib/`. A página inicial é reescrita em componentes pequenos em `components/inicio/`; a do edital ganha `components/edital/`.

**Tech Stack:** Next.js 16.4, React 19.3, Tailwind CSS 4.3, maplibre-gl 6.14, @supabase/supabase-js 2, vitest 3, TypeScript 5, Node 24. Publicação: Vercel (CLI, projeto `edital-map`).

**Spec:** `docs/superpowers/specs/2026-10-15-fase-2-visual-design.md` · Mockup: `docs/superpowers/specs/assets/2026-10-15-mockup-inicio.png`

## Global Constraints

- Repositório na pasta atual (OneDrive), branch `fase-2-mapa`. Git Bash, caminhos entre aspas (têm espaço e acento). `npm test` e `npm run typecheck` passam ao fim de cada task; tasks com componentes também rodam `npm run build`.
- Next.js 16 App Router: `params`, `searchParams`, `cookies()` e `headers()` são assíncronos. Não ligar `cacheComponents`.
- maplibre-gl 6 só ESM: `await import('maplibre-gl')` (namespace, sem `.default`); manter `setWorkerUrl(new URL('../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).href)`.
- Dados de licitação só no servidor (`lib/servidor/*` com `import 'server-only'`); `SUPABASE_SERVICE_ROLE_KEY` nunca com `NEXT_PUBLIC_`.
- Schema só muda com migration nova: esta fase cria `supabase/migrations/0004_visual.sql`; não editar 0001–0003.
- Interface em português do Brasil. Tokens do design system (`bg-surface`, `bg-raised`, `bg-sunken`, `border-line`, `border-line-strong`, `text-ink`, `text-ink-muted`, `bg-pin`, `text-pin-strong`, `bg-pin-soft`, `text-on-pin`, `bg-mata-soft`, `text-mata`, `bg-ouro-soft`, `text-ouro-strong`, `bg-rio-soft`, `text-rio`, `font-mono`, `rounded-xs|sm|md|lg`).
- Datas no padrão da marca (`17.10.2026 · 09h`, minutos só quando não forem `00`), fuso `America/Sao_Paulo`.
- `valor_estimado` nulo ou 0 = "Valor não informado".
- Prazo: `Encerra hoje`/`Encerra amanhã` em laranja; até 7 dias `Encerra em N dias` em amarelo; publicado nos últimos 3 dias (calendário de Brasília) `Novo`; senão `Aberto` em verde.
- Página inicial em três colunas a partir de `lg` (1024 px); abaixo disso, mapa em tela cheia e lista na gaveta (celular).
- Siglas que não viram minúsculas (lista fixa em `lib/texto.ts`): ABNT, NBR, CRAS, CREAS, CAPS, UBS, UPA, SUS, ME, EPP, MEI, CNPJ, CPF, ART, RRT, EPI, LED, PVC, GLP, ISO, INMETRO, ANVISA, CATMAT, CATSER, PCD, DML, PNCP, SRP, TI, USB, HDMI, LCD, GPS, SAMU, UTI, APAE, CMEI, EMEF, EMEI, ESF, IPTU, ICMS, ISS, INSS, FGTS, CNH, ONG, MDF, SSD, RAM, CPU, TV, DVD, NR, ABS, HD e as UFs exceto SE e PE (em maiúsculas costumam ser "se" e "pé").
- Medição: `quer_recurso` com `plano_pro` (Planos, Assinar Pro) e `filtros_pro` (chip Pro), sem edital.
- Não rodar `worker:*` nem chamar o PNCP, exceto o controlador na Task 2 (releitura). Escritas de teste no banco só com o cookie `em_interno=1`.
- Todo commit termina com `Co-Authored-By: <nome do modelo que escreveu o commit> <noreply@anthropic.com>`.

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/0004_visual.sql` | Colunas de benefício/critério nos itens; filtros de valor e modalidade; `publicada_em`, `unidade_nome`, `srp` na busca; `resumo_itens` |
| `worker/pncp/esquemas.ts`, `worker/mapear.ts`, `worker/banco.ts`, `worker/testes/fakes.ts` | Benefício e critério do item; listar compras abertas por página |
| `worker/reler.ts`, `worker/reler-itens.ts` | Releitura única dos itens das compras abertas |
| `lib/texto.ts` | Limpeza de texto: espaços, prefixo, maiúsculas, título curto, item organizado, lotes, parágrafos |
| `lib/participacao.ts` | Sistema da disputa pelo link, esfera, modalidade curta, textos de itens e ME/EPP |
| `lib/formato.ts` | + `moedaCurta`, `diaMes`, `etiqueta` |
| `lib/painel.ts` | Somas dos pontos do mapa, faixas e cores dos estados |
| `lib/filtros.ts`, `lib/tipos.ts`, `lib/eventos.ts`, `lib/servidor/consultas.ts` | Filtros novos, tipos, recursos Pro, consultas |
| `scripts/gerar-estados-geojson.ts`, `public/geo/estados.json` | Contorno das 27 UFs |
| `components/BotaoEmBreve.tsx`, `components/Cabecalho.tsx` | Cabeçalho novo e aviso "em breve" medido |
| `components/Mapa.tsx` | Estados coloridos, círculos laranja por valor, pino |
| `components/inicio/*` | Busca, chips, lista compacta, cartão escuro, onde mais compram, legenda |
| `components/Explorador.tsx`, `components/GavetaCelular.tsx`, `app/page.tsx` | Página inicial em três colunas |
| `components/edital/*`, `app/edital/[slug]/page.tsx` | Página do edital organizada |

---

### Task 1: Migration `0004` (filtros, campos novos e resumo dos itens)

**Files:**
- Create: `supabase/migrations/0004_visual.sql`

**Interfaces:**
- Produces (SQL, só o servidor executa):
  - `itens.beneficio_id int`, `itens.beneficio_nome text`, `itens.criterio_julgamento text`
  - `abertas_unicas(q text, p_ufs text[] default null, p_valor_min numeric default null, p_modalidades int[] default null) returns setof contratacoes`
  - `buscar_editais(q, p_ufs, p_ibge, p_dias, p_valor_min numeric, p_modalidades int[], p_limite, p_deslocamento) returns table (id, slug, objeto, orgao_nome, unidade_nome, municipio_nome, uf, codigo_ibge, valor_estimado, encerramento_em, publicada_em, modalidade_nome, srp, onde, item_trecho, total)`
  - `mapa_editais(q, p_ufs, p_dias, p_valor_min numeric, p_modalidades int[])` (mesmas colunas da 0003)
  - `resumo_itens(p_contratacao text) returns table (total, materiais, servicos, com_beneficio, exclusivos, cota bigint, criterios text[])`
- As assinaturas antigas são removidas (sem sobrecarga, que deixaria o PostgREST ambíguo). O site já publicado continua funcionando: ele chama com um subconjunto dos parâmetros nomeados e os novos têm padrão.

- [ ] **Step 1: Escrever a migration**

`supabase/migrations/0004_visual.sql`:
```sql
-- Edital Map · Fase 2 · Visual: filtros de valor e modalidade, mais campos na busca,
-- benefício ME/EPP e critério de julgamento nos itens, resumo dos itens do edital.

alter table public.itens
  add column beneficio_id int,
  add column beneficio_nome text,
  add column criterio_julgamento text;

-- Assinaturas antigas saem antes (parâmetros novos mudam a identidade da função).
drop function if exists public.buscar_editais(text, text[], text, int, int, int);
drop function if exists public.mapa_editais(text, text[], int);
drop function if exists public.abertas_unicas(text, text[]);

-- Abertas sem duplicadas, agora com valor mínimo e modalidades.
-- Fica a que tem link de origem; empate → atualizada por último; empate → menor id.
create function public.abertas_unicas(q text, p_ufs text[] default null, p_valor_min numeric default null,
                                      p_modalidades int[] default null)
returns setof public.contratacoes language sql stable as $$
  select distinct on (a.codigo_ibge, a.encerramento_em, a.valor_estimado, public.objeto_normalizado(a.objeto)) a.*
  from public.abertas(q, p_ufs, p_valor_min) a
  where (p_modalidades is null or cardinality(p_modalidades) = 0 or a.modalidade_id = any(p_modalidades))
  order by a.codigo_ibge, a.encerramento_em, a.valor_estimado, public.objeto_normalizado(a.objeto),
           (a.link_origem is null), a.atualizada_pncp_em desc, a.id
$$;

-- Lista: bloco objeto, depois bloco itens; dentro de cada bloco, prazo mais próximo.
create function public.buscar_editais(
  q text default null, p_ufs text[] default null, p_ibge text default null, p_dias int default null,
  p_valor_min numeric default null, p_modalidades int[] default null,
  p_limite int default 50, p_deslocamento int default 0)
returns table (id text, slug text, objeto text, orgao_nome text, unidade_nome text, municipio_nome text, uf text,
               codigo_ibge text, valor_estimado numeric, encerramento_em timestamptz, publicada_em timestamptz,
               modalidade_nome text, srp boolean, onde text, item_trecho text, total bigint)
language sql stable as $$
  with t as (select public.consulta(q) as tq),
  base as (
    select u.id, u.slug, u.objeto, u.orgao_nome, u.unidade_nome, u.municipio_nome, u.uf, u.codigo_ibge,
           u.valor_estimado, u.encerramento_em, u.publicada_em, u.modalidade_nome, u.srp,
           case when t.tq is null or u.busca @@ t.tq then 'objeto' else 'itens' end as onde_,
           t.tq
    from public.abertas_unicas(q, p_ufs, p_valor_min, p_modalidades) u, t
    where (p_ibge is null or u.codigo_ibge = p_ibge)
      -- p_dias conta dias de calendário de Brasília (até o fim do dia hoje + p_dias), como o prazo do card.
      and (p_dias is null or u.encerramento_em < (date_trunc('day', now() at time zone 'America/Sao_Paulo') + make_interval(days => p_dias + 1)) at time zone 'America/Sao_Paulo')
  ),
  -- Corta a página antes de procurar o trecho do item (só para as linhas que vão sair).
  pagina as (
    select b.*, count(*) over () as total_
    from base b
    order by (b.onde_ = 'itens'), b.encerramento_em, b.id
    limit p_limite offset p_deslocamento
  )
  select p.id, p.slug, p.objeto, p.orgao_nome, p.unidade_nome, p.municipio_nome, p.uf, p.codigo_ibge,
         p.valor_estimado, p.encerramento_em, p.publicada_em, p.modalidade_nome, p.srp, p.onde_,
         case when p.onde_ = 'itens' then (
           select i.descricao from public.itens i
           where i.contratacao_id = p.id and i.busca @@ p.tq order by i.numero limit 1) end,
         p.total_
  from pagina p
  order by (p.onde_ = 'itens'), p.encerramento_em, p.id
$$;

-- Mapa: um ponto por município sobre as abertas sem duplicadas (ordenado para paginar de forma estável).
create function public.mapa_editais(q text default null, p_ufs text[] default null, p_dias int default null,
                                    p_valor_min numeric default null, p_modalidades int[] default null)
returns table (codigo_ibge text, nome text, uf text, lat double precision, lng double precision,
               qtd bigint, valor_total numeric, prazo_mais_proximo timestamptz)
language sql stable as $$
  select m.codigo_ibge, m.nome, m.uf, m.lat, m.lng,
         count(*), sum(nullif(u.valor_estimado, 0)), min(u.encerramento_em)
  from public.abertas_unicas(q, p_ufs, p_valor_min, p_modalidades) u
  join public.municipios m on m.codigo_ibge = u.codigo_ibge
  where (p_dias is null or u.encerramento_em < (date_trunc('day', now() at time zone 'America/Sao_Paulo') + make_interval(days => p_dias + 1)) at time zone 'America/Sao_Paulo')
  group by m.codigo_ibge, m.nome, m.uf, m.lat, m.lng
  order by m.codigo_ibge
$$;

-- Resumo dos itens de um edital: tipos, ME/EPP (1 = exclusiva, 3 = cota reservada) e critérios.
create function public.resumo_itens(p_contratacao text)
returns table (total bigint, materiais bigint, servicos bigint, com_beneficio bigint, exclusivos bigint, cota bigint,
               criterios text[])
language sql stable as $$
  select count(*),
         count(*) filter (where material_ou_servico = 'M'),
         count(*) filter (where material_ou_servico = 'S'),
         count(*) filter (where beneficio_id is not null),
         count(*) filter (where beneficio_id = 1),
         count(*) filter (where beneficio_id = 3),
         coalesce(array_agg(distinct criterio_julgamento) filter (where criterio_julgamento is not null), '{}')
  from public.itens
  where contratacao_id = p_contratacao
$$;

revoke execute on function public.abertas_unicas(text, text[], numeric, int[]) from public, anon, authenticated;
revoke execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int) from public, anon, authenticated;
revoke execute on function public.mapa_editais(text, text[], int, numeric, int[]) from public, anon, authenticated;
revoke execute on function public.resumo_itens(text) from public, anon, authenticated;
```

- [ ] **Step 2: Commit do arquivo**

```bash
git add supabase/migrations/0004_visual.sql
git commit -m "feat: filtros de valor e modalidade, campos novos na busca e resumo dos itens" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

- [ ] **Step 3 (controlador): aplicar e verificar**

Aplicar com `apply_migration` (projeto `omtwaflypzlebjoeubvp`, nome `visual`). Depois, com `execute_sql`:

```sql
select
  (select max(total) from public.buscar_editais(null, null, null, null, 50000)) as total_valor_50k,
  (select count(*) from public.abertas_unicas(null, null, 50000)) as direto_valor_50k,
  (select max(total) from public.buscar_editais(null, null, null, null, null, array[6])) as total_pregao,
  (select count(*) from public.abertas_unicas(null, null, null, array[6])) as direto_pregao,
  (select bool_and(modalidade_nome = 'Pregão - Eletrônico') from public.buscar_editais(null, null, null, null, null, array[6], 1000)) as so_pregao,
  (select count(*) filter (where publicada_em is not null) from public.buscar_editais(null, null, null, null, null, null, 1000)) as com_publicacao,
  (select count(*) from public.mapa_editais(null, null, null, 50000)) as municipios_50k,
  has_function_privilege('anon', 'public.buscar_editais(text, text[], text, int, numeric, int[], int, int)', 'execute') as anon_executa;
```
Expected: `total_valor_50k = direto_valor_50k`; `total_pregao = direto_pregao`; `so_pregao = true`; `com_publicacao` perto de 1000; `municipios_50k` > 0; `anon_executa = false`.

```sql
select r.* from public.contratacoes c, public.resumo_itens(c.id) r where c.slug = '83024240000153-2026-142';
```
Expected: `total = 25`; `com_beneficio = 0` (antes da releitura); `criterios = {}`.

Conferir que o site publicado continua respondendo: `curl -s -o /dev/null -w "%{http_code}\n" "https://edital-map.vercel.app/api/busca?q=epi"` → `200`.

---

### Task 2: Worker guarda ME/EPP e critério; comando de releitura

**Files:**
- Modify: `worker/pncp/esquemas.ts`, `worker/mapear.ts`, `worker/banco.ts`, `worker/testes/fakes.ts`, `worker/mapear.test.ts`, `worker/sincronizar.test.ts` (só a linha do objeto de item esperado, se comparar o objeto inteiro), `package.json`
- Create: `worker/reler.ts`, `worker/reler.test.ts`, `worker/reler-itens.ts`

**Interfaces:**
- Consumes: colunas novas de `itens` (Task 1); `sincronizarItens(compras, deps)` e `Dependencias` de `worker/sincronizar.ts`.
- Produces: `LinhaItem` com `beneficio_id: number | null`, `beneficio_nome: string | null`, `criterio_julgamento: string | null`; `Banco.abertas(depoisDe: string | null, limite: number): Promise<ChaveCompra[]>`; `relerItensAbertos(deps: Dependencias, opcoes?: { pagina?: number; lote?: number }): Promise<{ compras: number; comItens: number; falhas: number }>`; script `npm run worker:reler-itens`.

- [ ] **Step 1: Testes do mapeamento (falhando)**

Em `worker/mapear.test.ts`, no `describe('itemParaLinha')`:
1. No teste `'mapeia o item real'`, acrescente ao objeto esperado (o fixture não traz esses campos):
```ts
      beneficio_id: null,
      beneficio_nome: null,
      criterio_julgamento: null,
```
2. Acrescente o teste:
```ts
  it('guarda benefício ME/EPP e critério de julgamento', () => {
    const linha = itemParaLinha(
      item({ tipoBeneficio: 1, tipoBeneficioNome: 'Participação exclusiva para ME/EPP', criterioJulgamentoNome: ' Menor preço ' }),
      'C1',
    );
    expect(linha.beneficio_id).toBe(1);
    expect(linha.beneficio_nome).toBe('Participação exclusiva para ME/EPP');
    expect(linha.criterio_julgamento).toBe('Menor preço');
  });
```
Se `worker/sincronizar.test.ts` comparar um objeto de item inteiro (perto da linha 180, com `material_ou_servico: 'M'`), acrescente os mesmos três campos com `null` ali.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run worker/mapear.test.ts`
Expected: FAIL — campos `beneficio_id`… ausentes.

- [ ] **Step 3: Implementar o mapeamento**

`worker/pncp/esquemas.ts`, em `esquemaItem`, depois de `temResultado`:
```ts
  tipoBeneficio: z.number().int().nullish(),
  tipoBeneficioNome: z.string().nullish(),
  criterioJulgamentoNome: z.string().nullish(),
```

`worker/mapear.ts`: em `LinhaItem`, depois de `tem_resultado: boolean;`:
```ts
  beneficio_id: number | null;
  beneficio_nome: string | null;
  criterio_julgamento: string | null;
```
e em `itemParaLinha`, depois de `tem_resultado: i.temResultado ?? false,`:
```ts
    beneficio_id: i.tipoBeneficio ?? null,
    beneficio_nome: texto(i.tipoBeneficioNome),
    criterio_julgamento: texto(i.criterioJulgamentoNome),
```

Run: `npx vitest run worker/mapear.test.ts worker/sincronizar.test.ts`
Expected: PASS.

- [ ] **Step 4: Teste da releitura (falhando)**

`worker/reler.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { contratacaoParaLinha } from './mapear';
import { validarContratacao } from './pncp/esquemas';
import { relerItensAbertos } from './reler';
import { BancoFalso, clienteFalso, contratacaoBruta, idDe, itemBruto, montarDeps } from './testes/fakes';

function linha(sequencial: number, encerramento?: string) {
  const v = validarContratacao(contratacaoBruta({ sequencial, encerramento }));
  if (!v.ok) throw new Error(v.motivo);
  return contratacaoParaLinha(v.valor);
}

describe('relerItensAbertos', () => {
  it('relê os itens de todas as compras abertas, em páginas e lotes, e ignora as encerradas', async () => {
    const banco = new BancoFalso();
    await banco.upsertContratacoes([linha(1), linha(2), linha(3), linha(4), linha(5), linha(9, '2026-10-01T10:00:00')]);
    const cliente = clienteFalso({
      itens: () => [itemBruto(1, { tipoBeneficio: 1, tipoBeneficioNome: 'Participação exclusiva para ME/EPP', criterioJulgamentoNome: 'Menor preço' })],
    });
    const r = await relerItensAbertos(montarDeps(banco, cliente), { pagina: 2, lote: 2 });
    expect(r).toEqual({ compras: 5, comItens: 5, falhas: 0 });
    expect([...cliente.itensPedidos].sort()).toEqual([idDe(1), idDe(2), idDe(3), idDe(4), idDe(5)]);
    expect(banco.itensDe(idDe(3))[0]).toMatchObject({ beneficio_id: 1, criterio_julgamento: 'Menor preço' });
  });

  it('conta como falha a compra cujos itens não vieram', async () => {
    const banco = new BancoFalso();
    await banco.upsertContratacoes([linha(1), linha(2)]);
    const cliente = clienteFalso({
      itens: (compra) => {
        if (compra.id === idDe(2)) throw new Error('HTTP 500');
        return [itemBruto(1)];
      },
    });
    expect(await relerItensAbertos(montarDeps(banco, cliente))).toEqual({ compras: 2, comItens: 1, falhas: 1 });
  });
});
```

Run: `npx vitest run worker/reler.test.ts`
Expected: FAIL — módulo `./reler` não existe.

- [ ] **Step 5: Implementar `abertas` no banco e no falso, e a releitura**

`worker/banco.ts`: na interface `Banco`, depois de `abertasSemItens`:
```ts
  /** Compras abertas em ordem de id, a partir de `depoisDe` (exclusivo), até `limite`. */
  abertas(depoisDe: string | null, limite: number): Promise<ChaveCompra[]>;
```
e em `criarBanco`, depois de `abertasSemItens`:
```ts
    async abertas(depoisDe, limite) {
      let consulta = sb
        .from('contratacoes')
        .select('id, cnpj, ano, sequencial')
        .gt('encerramento_em', agora().toISOString())
        .order('id', { ascending: true })
        .limit(limite);
      if (depoisDe) consulta = consulta.gt('id', depoisDe);
      const { data, error } = await consulta;
      falhar('listar abertas', error);
      return (data ?? []).map((l) => ({
        id: l.id as string,
        cnpj: l.cnpj as string,
        ano: l.ano as number,
        sequencial: l.sequencial as number,
      }));
    },
```

`worker/testes/fakes.ts`, em `BancoFalso`, depois de `abertasSemItens`:
```ts
  async abertas(depoisDe: string | null, limite: number): Promise<ChaveCompra[]> {
    return [...this.contratacoes.values()]
      .filter((c) => c.encerramento_em !== null && Date.parse(c.encerramento_em) > AGORA.getTime())
      .filter((c) => depoisDe === null || c.id > depoisDe)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .slice(0, limite)
      .map((c) => ({ id: c.id, cnpj: c.cnpj, ano: c.ano, sequencial: c.sequencial }));
  }
```

`worker/reler.ts`:
```ts
import { sincronizarItens, type Dependencias } from './sincronizar';

export type ResultadoReleitura = { compras: number; comItens: number; falhas: number };

/**
 * Relê os itens de todas as compras abertas (uso único, depois de mudar o que se guarda de cada item).
 * Páginas de compras por id; cada lote vai para `sincronizarItens`, que respeita o paralelismo do cliente.
 */
export async function relerItensAbertos(
  deps: Dependencias,
  opcoes: { pagina?: number; lote?: number } = {},
): Promise<ResultadoReleitura> {
  const tamanhoPagina = opcoes.pagina ?? 500;
  const tamanhoLote = opcoes.lote ?? 20;
  const r: ResultadoReleitura = { compras: 0, comItens: 0, falhas: 0 };
  let depoisDe: string | null = null;
  for (;;) {
    const compras = await deps.banco.abertas(depoisDe, tamanhoPagina);
    if (compras.length === 0) return r;
    for (let i = 0; i < compras.length; i += tamanhoLote) {
      const lote = compras.slice(i, i + tamanhoLote);
      const gravadas = await sincronizarItens(lote, deps);
      r.compras += lote.length;
      r.comItens += gravadas.size;
      r.falhas += lote.length - gravadas.size;
      deps.log?.(`[reler] ${r.compras} compras · ${r.falhas} falhas`);
    }
    depoisDe = compras[compras.length - 1].id;
    if (compras.length < tamanhoPagina) return r;
  }
}
```

`worker/reler-itens.ts`:
```ts
import './ambiente';
import { criarBanco, criarSupabase } from './banco';
import { lerSupabase } from './config';
import { criarCliente } from './pncp/cliente';
import { relerItensAbertos } from './reler';
import { Resumo } from './resumo';

const { url, chave } = lerSupabase();
const cliente = criarCliente();
const resumo = new Resumo('Releitura dos itens das compras abertas');
const inicio = Date.now();
const r = await relerItensAbertos({
  cliente,
  banco: criarBanco(criarSupabase(url, chave)),
  resumo,
  agora: () => new Date(),
  log: (linha) => console.log(linha),
});
console.log(
  `[reler] fim · ${r.compras} compras · ${r.comItens} com itens · ${r.falhas} falhas · ${Math.round((Date.now() - inicio) / 60000)} min`,
);
await resumo.publicar(cliente.estatisticas());
```

`package.json`, em `"scripts"`, depois de `"worker:conferir"`:
```json
    "worker:reler-itens": "tsx worker/reler-itens.ts",
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run worker && npm run typecheck`
Expected: todos os testes do worker passam (incluindo os 2 novos de `reler`); typecheck limpo.

- [ ] **Step 7: Commit**

```bash
git add worker package.json
git commit -m "feat: worker guarda benefício ME/EPP e critério dos itens e relê os itens das compras abertas" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

- [ ] **Step 8 (controlador): rodar a releitura uma vez**

Depois da Task 1 aplicada: `npm run worker:reler-itens` (em segundo plano, com log em arquivo; a API de itens não tem o limite de 20/min da consulta; esperado 20–60 min). Depois:
```sql
select count(*) as itens_abertos,
       round(100.0 * avg((i.beneficio_id is not null)::int), 1) as pct_com_beneficio,
       count(*) filter (where i.beneficio_id = 1) as exclusivos
from public.itens i join public.contratacoes c on c.id = i.contratacao_id
where c.encerramento_em > now();
```
Expected: `pct_com_beneficio` > 95.

---

### Task 3: Limpeza de texto (`lib/texto.ts`)

**Files:**
- Create: `lib/texto.ts`
- Test: `lib/texto.test.ts`

**Interfaces:**
- Produces: `limparEspacos(t: string): string`; `tirarPrefixo(t: string): string`; `emMaiusculas(t: string): boolean`; `semGritos(t: string): string`; `nomeProprio(t: string): string`; `textoLimpo(t: string): string`; `paragrafos(t: string): string[]`; `type Titulo = { titulo: string; cortado: boolean }`; `tituloCurto(objeto: string): Titulo`; `type Atributo = { chave: string; valor: string }`; `type ItemPartido = { nome: string; atributos: Atributo[]; obs: string | null; etiquetas: string[] }`; `partirItem(descricao: string): ItemPartido`; `type Lote = { numero: number; texto: string }`; `lotesDaInfo(info: string): Lote[] | null`.

- [ ] **Step 1: Escrever o teste**

`lib/texto.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { emMaiusculas, limparEspacos, lotesDaInfo, nomeProprio, paragrafos, partirItem, semGritos, tituloCurto } from './texto';

describe('limparEspacos', () => {
  it('junta quebras de linha, colapsa espaços e tira espaço antes de pontuação', () => {
    expect(limparEspacos('Câmera\r\nDigital  com\nlente ,  tripé .')).toBe('Câmera Digital com lente, tripé.');
  });
});

describe('semGritos e emMaiusculas', () => {
  it('maiúsculas viram texto normal e preservam siglas, números e romanos', () => {
    expect(
      semGritos('LOTE 08 - ARGAMASSA PARA REJUNTAMENTO DE PLACAS CERAMICAS (REJUNTE), TIPO I. FORNECIDO EM CORES SORTIDAS. PRODUTO EM CONFORMIDADE COM ABNT NBR 14992. REGIAO VIII.'),
    ).toBe(
      'Lote 08 - argamassa para rejuntamento de placas ceramicas (rejunte), tipo I. Fornecido em cores sortidas. Produto em conformidade com ABNT NBR 14992. Regiao VIII.',
    );
  });
  it('unidades ficam em minúsculo', () => {
    expect(semGritos('CAIXA COM 36 UNIDADES DE 500 ML')).toBe('Caixa com 36 unidades de 500 ml');
  });
  it('não mexe em texto que não está em maiúsculas nem em texto curto', () => {
    expect(semGritos('Película Auto-Adesiva material: poliester laminado')).toBe('Película Auto-Adesiva material: poliester laminado');
    expect(semGritos('EPI')).toBe('EPI');
  });
  it('mede a proporção de letras maiúsculas', () => {
    expect(emMaiusculas('AQUISIÇÃO DE MATERIAL')).toBe(true);
    expect(emMaiusculas('Aquisição de material ABNT')).toBe(false);
  });
});

describe('nomeProprio', () => {
  it('nomes em maiúsculas viram nome próprio', () => {
    expect(nomeProprio('MUNICIPIO DE ITA')).toBe('Municipio de Ita');
    expect(nomeProprio('SECRETARIA DE ESTADO DA ADMINISTRACAO - SC')).toBe('Secretaria de Estado da Administracao - SC');
    expect(nomeProprio('Prefeitura Municipal de Itajaí')).toBe('Prefeitura Municipal de Itajaí');
  });
});

describe('tituloCurto', () => {
  const CRAS =
    'Construção de um Centro de Referência de Assistência Social (CRAS), composto por: 02 salas de atendimento familiar; 01 sala de administração/coordenação; recepção; sala de atendimentos; instalação sanitária; instalação sanitária PCD feminino; instalação sanitária PCD masculino; almoxarifado; copa/cozinha; circulação; DML; área de serviço; e sala de múltiplo uso.';

  it('objeto curto fica inteiro, sem prefixo entre colchetes', () => {
    expect(tituloCurto('[Portal de Compras Públicas] - Aquisição de uniformes escolares')).toEqual({
      titulo: 'Aquisição de uniformes escolares',
      cortado: false,
    });
  });
  it('objeto longo corta no fim da primeira cláusula', () => {
    expect(tituloCurto(CRAS)).toEqual({
      titulo: 'Construção de um Centro de Referência de Assistência Social (CRAS), composto por: 02 salas de atendimento familiar…',
      cortado: true,
    });
  });
  it('sem frase curta, corta na palavra', () => {
    const longo =
      'Contratação de empresa especializada para conclusão dos serviços remanescentes do Pavilhão Agropecuário do Parque de Exposições Rovilho Bortoluzzi com área construída total de 1.600m² implantado no Parque de Exposições';
    const r = tituloCurto(longo);
    expect(r.cortado).toBe(true);
    expect(r.titulo.endsWith('…')).toBe(true);
    expect(r.titulo.length).toBeLessThanOrEqual(141);
    expect(longo.startsWith(r.titulo.slice(0, -1))).toBe(true);
  });
  it('objeto em maiúsculas vira texto normal', () => {
    expect(tituloCurto('AQUISIÇÃO DE UNIFORMES E EPI PARA A SECRETARIA DE SAÚDE').titulo).toBe(
      'Aquisição de uniformes e EPI para a secretaria de saúde',
    );
  });
});

describe('partirItem', () => {
  it('item no padrão de catálogo vira nome + atributos + observação', () => {
    expect(
      partirItem(
        'Película Auto-Adesiva material: poliester laminado, aplicação: controle e proteção solar, visibilidade: 4, cor: preta, características adicionais: energia solar bloqueada 43%, espessura: 1,00 Conforme especificações do título 1 do Termo de Referência Anexo I do Edital',
      ),
    ).toEqual({
      nome: 'Película Auto-Adesiva',
      atributos: [
        { chave: 'material', valor: 'poliester laminado' },
        { chave: 'aplicação', valor: 'controle e proteção solar' },
        { chave: 'visibilidade', valor: '4' },
        { chave: 'cor', valor: 'preta' },
        { chave: 'características adicionais', valor: 'energia solar bloqueada 43%' },
        { chave: 'espessura', valor: '1,00' },
      ],
      obs: 'Conforme especificações do título 1 do Termo de Referência Anexo I do Edital',
      etiquetas: [],
    });
  });
  it('valor com vírgulas internas e texto livre do órgão no fim', () => {
    expect(
      partirItem(
        'Doce Confeitado características adicionais: pronta para consumo, ingredientes: leite condensado, gemas de ovos, manteiga, açúcar, peso: 20, tipo: ouriço de coco queimado Bolacha caseira com cobertura de glacê',
      ),
    ).toEqual({
      nome: 'Doce Confeitado',
      atributos: [
        { chave: 'características adicionais', valor: 'pronta para consumo' },
        { chave: 'ingredientes', valor: 'leite condensado, gemas de ovos, manteiga, açúcar' },
        { chave: 'peso', valor: '20' },
        { chave: 'tipo', valor: 'ouriço de coco queimado' },
      ],
      obs: 'Bolacha caseira com cobertura de glacê',
      etiquetas: [],
    });
  });
  it('lote e texto em maiúsculas', () => {
    expect(
      partirItem('LOTE 08 - ARGAMASSA PARA REJUNTAMENTO DE PLACAS CERAMICAS (REJUNTE), TIPO I. FORNECIDO EM CORES SORTIDAS. PRODUTO EM CONFORMIDADE COM ABNT NBR 14992. REGIAO VIII.'),
    ).toEqual({
      nome: 'Argamassa para rejuntamento de placas ceramicas (rejunte), tipo I',
      atributos: [],
      obs: 'Fornecido em cores sortidas. Produto em conformidade com ABNT NBR 14992. Regiao VIII.',
      etiquetas: ['Lote 8'],
    });
  });
  it('primeira linha curta vira o nome e o código do catálogo vira etiqueta', () => {
    expect(
      partirItem(
        'Confecção de Botom / Medalha\r\nMedalha personalizada (Ouro, Prata e Bronze) em metal fundido, com diâmetro de 8 cm.\r\nPersonalização conforme modelo enviado pelo contratante.\r\nCATSER 17760',
      ),
    ).toEqual({
      nome: 'Confecção de Botom / Medalha',
      atributos: [],
      obs: 'Medalha personalizada (Ouro, Prata e Bronze) em metal fundido, com diâmetro de 8 cm. Personalização conforme modelo enviado pelo contratante.',
      etiquetas: ['CATSER 17760'],
    });
  });
  it('texto longo sem padrão: nome cortado e texto inteiro como observação', () => {
    const t =
      'Bombom sabor morango com cobertura de chocolate, contendo açúcar, xarope de glicose, gordura vegetal fracionada, leite em pó desnatado, cacau em pó, soro de leite em pó e ácido láctico';
    const r = partirItem(t);
    expect(r.nome.endsWith('…')).toBe(true);
    expect(r.nome.length).toBeLessThanOrEqual(91);
    expect(r.atributos).toEqual([]);
    expect(r.obs).toBe(t);
  });
  it('item curto sem padrão vira só o nome', () => {
    expect(partirItem('Corda de sisal 10 mm')).toEqual({ nome: 'Corda de sisal 10 mm', atributos: [], obs: null, etiquetas: [] });
  });
});

describe('lotesDaInfo e paragrafos', () => {
  it('lista de lotes do PNCP vira lista', () => {
    expect(
      lotesDaInfo('(L1):LOTE 01 Câmera\nDigital com\nlente\nintercambiável,(L2):LOTE 02 Lente\r\nobjetiva APS-C,(L3):LOTE 03 Tripé\r\npara\r\ncâmera'),
    ).toEqual([
      { numero: 1, texto: 'Câmera Digital com lente intercambiável' },
      { numero: 2, texto: 'Lente objetiva APS-C' },
      { numero: 3, texto: 'Tripé para câmera' },
    ]);
  });
  it('um lote só ou texto comum não é lista', () => {
    expect(lotesDaInfo('(L1):Contratação de empresa para manutenção de ar condicionado')).toBeNull();
    expect(lotesDaInfo('Para todos os itens será assegurada a preferência para ME/EPP.')).toBeNull();
  });
  it('parágrafos separados por linha em branco, cada um limpo', () => {
    expect(paragrafos('Primeiro parágrafo\ncom quebra.\n\n  SEGUNDO PARÁGRAFO EM MAIÚSCULAS.  ')).toEqual([
      'Primeiro parágrafo com quebra.',
      'Segundo parágrafo em maiúsculas.',
    ]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/texto.test.ts`
Expected: FAIL — módulo `./texto` não existe.

- [ ] **Step 3: Implementar**

`lib/texto.ts`:
```ts
// Limpeza dos textos que vêm do PNCP (objeto, itens, informações complementares) para leitura.
// Só reorganiza o que veio: não inventa nem remove informação (a não ser espaços, prefixo de sistema e códigos que viram etiqueta).

const SIGLAS = new Set([
  'ABNT', 'NBR', 'CRAS', 'CREAS', 'CAPS', 'UBS', 'UPA', 'SUS', 'ME', 'EPP', 'MEI', 'CNPJ', 'CPF', 'ART', 'RRT',
  'EPI', 'LED', 'PVC', 'GLP', 'ISO', 'INMETRO', 'ANVISA', 'CATMAT', 'CATSER', 'PCD', 'DML', 'PNCP', 'SRP', 'TI',
  'USB', 'HDMI', 'LCD', 'GPS', 'SAMU', 'UTI', 'APAE', 'CMEI', 'EMEF', 'EMEI', 'ESF', 'IPTU', 'ICMS', 'ISS', 'INSS',
  'FGTS', 'CNH', 'ONG', 'MDF', 'SSD', 'RAM', 'CPU', 'TV', 'DVD', 'NR', 'ABS', 'HD',
  // UFs, sem SE e PE (em maiúsculas costumam ser "se" e "pé")
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'TO',
]);
const ROMANOS = /^(?:I{1,3}|IV|VI{0,3}|IX|XI{0,3}|XIV|XV|XX)$/;
const UNIDADES: Record<string, string> = {
  KG: 'kg', ML: 'ml', CM: 'cm', MM: 'mm', KM: 'km', 'M²': 'm²', 'M³': 'm³', UN: 'un', UND: 'und', PCT: 'pct', CX: 'cx', LT: 'lt', GR: 'gr',
};
const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos', 'a', 'o', 'para']);
const CHAVES_COMPOSTAS = [
  'características adicionais', 'informações adicionais', 'especificações técnicas', 'especificações mínimas',
  'unidade de fornecimento', 'prazo de validade', 'forma de apresentação',
];
const PALAVRA = /[\p{L}\p{N}²³]+/gu;
const PREFIXO = /^\s*\[[^\]]*\]\s*[-–]?\s*/;
const CODIGO = /\b(CATMAT|CATSER)\s*:?\s*(\d+)\b/gi;
const LOTE = /^lote\s*0*(\d+)\s*[-–:]\s*/i;
const LOTE_TEXTO = /^lote\s*0*\d+\s*[-–:]?\s*/i;

/** Junta quebras de linha, colapsa espaços e tira espaço antes de pontuação. */
export function limparEspacos(t: string): string {
  return t.replace(/\s+/g, ' ').replace(/\s+([,.;:!?)])/g, '$1').replace(/\(\s+/g, '(').trim();
}

/** Tira o prefixo entre colchetes que alguns sistemas põem no objeto ("[Portal de Compras Públicas] -"). */
export function tirarPrefixo(t: string): string {
  return t.replace(PREFIXO, '');
}

/** Texto com pelo menos 8 letras e mais de 70% delas maiúsculas. */
export function emMaiusculas(t: string): boolean {
  const maiusculas = (t.match(/\p{Lu}/gu) ?? []).length;
  const minusculas = (t.match(/\p{Ll}/gu) ?? []).length;
  const letras = maiusculas + minusculas;
  return letras >= 8 && maiusculas / letras > 0.7;
}

function capitalizar(t: string): string {
  return t.replace(/^([^\p{L}]*)(\p{Ll})/u, (_, antes: string, letra: string) => antes + letra.toLocaleUpperCase('pt-BR'));
}

function maiusculaNasFrases(t: string): string {
  return t.replace(/(^|[.!?]\s+)([^\p{L}]*)(\p{Ll})/gu, (_, fim: string, antes: string, letra: string) => fim + antes + letra.toLocaleUpperCase('pt-BR'));
}

/** Texto TODO EM MAIÚSCULAS vira texto normal (frases com inicial maiúscula), preservando siglas, números, romanos e unidades. */
export function semGritos(t: string): string {
  if (!emMaiusculas(t)) return t;
  const baixo = t.replace(PALAVRA, (p) => {
    if (SIGLAS.has(p) || ROMANOS.test(p)) return p;
    if (UNIDADES[p]) return UNIDADES[p];
    if (/\d/.test(p)) return p;
    return p.toLocaleLowerCase('pt-BR');
  });
  return maiusculaNasFrases(baixo);
}

/** Nome de órgão ou unidade: em maiúsculas vira "Prefeitura Municipal de Itá" (partículas em minúsculo, siglas mantidas). */
export function nomeProprio(t: string): string {
  const limpo = limparEspacos(t);
  if (!emMaiusculas(limpo)) return limpo;
  let primeira = true;
  return limpo.replace(PALAVRA, (p) => {
    const eraPrimeira = primeira;
    primeira = false;
    if (SIGLAS.has(p) || ROMANOS.test(p) || /\d/.test(p)) return p;
    const min = p.toLocaleLowerCase('pt-BR');
    if (!eraPrimeira && PARTICULAS.has(min)) return min;
    return min.charAt(0).toLocaleUpperCase('pt-BR') + min.slice(1);
  });
}

/** Limpeza completa de um trecho: prefixo, espaços, maiúsculas e inicial maiúscula. */
export function textoLimpo(t: string): string {
  return capitalizar(semGritos(limparEspacos(tirarPrefixo(t))));
}

/** Parágrafos separados por linha em branco, cada um limpo. */
export function paragrafos(t: string): string[] {
  return t.split(/\n\s*\n/).map(textoLimpo).filter(Boolean);
}

export type Titulo = { titulo: string; cortado: boolean };

/** Objeto limpo; acima de 160 caracteres, corta na primeira frase ou cláusula (". " ou "; ") entre 40 e 140, ou na palavra. */
export function tituloCurto(objeto: string): Titulo {
  const limpo = textoLimpo(objeto);
  if (limpo.length <= 160) return { titulo: limpo, cortado: false };
  const fins = [limpo.indexOf('. ', 40), limpo.indexOf('; ', 40)].filter((i) => i >= 40 && i <= 140);
  if (fins.length) {
    const fim = Math.min(...fins);
    return { titulo: limpo.slice(0, fim) + (limpo[fim] === '.' ? '.' : '…'), cortado: true };
  }
  const espaco = limpo.lastIndexOf(' ', 140);
  return { titulo: `${limpo.slice(0, espaco > 40 ? espaco : 140).replace(/[\s,;:.-]+$/, '')}…`, cortado: true };
}

export type Atributo = { chave: string; valor: string };
export type ItemPartido = { nome: string; atributos: Atributo[]; obs: string | null; etiquetas: string[] };

/** Posições dos "atributo: " no padrão de catálogo (chave em minúsculas; algumas chaves compostas conhecidas). */
function acharChaves(t: string): Array<{ inicio: number; fim: number; chave: string }> {
  const chaves: Array<{ inicio: number; fim: number; chave: string }> = [];
  for (const m of t.matchAll(/:\s/g)) {
    const i = m.index ?? 0;
    const antes = t.slice(0, i);
    const baixo = antes.toLocaleLowerCase('pt-BR');
    const composta = CHAVES_COMPOSTAS.find((c) => baixo.endsWith(c) && /(^|[\s,;])$/.test(baixo.slice(0, baixo.length - c.length)));
    if (composta) {
      chaves.push({ inicio: i - composta.length, fim: i + m[0].length, chave: antes.slice(i - composta.length) });
      continue;
    }
    const simples = /(?:^|[\s,;])(\p{Ll}[\p{L}]*)$/u.exec(antes);
    if (simples) chaves.push({ inicio: i - simples[1].length, fim: i + m[0].length, chave: simples[1] });
  }
  return chaves;
}

/** Organiza a descrição de um item: nome em destaque, atributos "chave: valor", observação e etiquetas (lote, código do catálogo). */
export function partirItem(descricao: string): ItemPartido {
  const etiquetas: string[] = [];
  const linhas = descricao.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let t = limparEspacos(descricao).replace(CODIGO, (_, tipo: string, n: string) => {
    etiquetas.push(`${tipo.toUpperCase()} ${n}`);
    return '';
  });
  t = semGritos(limparEspacos(t));
  const lote = LOTE.exec(t);
  if (lote) {
    etiquetas.unshift(`Lote ${Number(lote[1])}`);
    t = t.slice(lote[0].length);
  }
  t = capitalizar(t.trim());

  const chaves = acharChaves(t);
  if (chaves.length >= 2) {
    const nome = t.slice(0, chaves[0].inicio).trim().replace(/[\s,;:–-]+$/, '');
    if (nome) {
      const atributos: Atributo[] = [];
      let obs: string | null = null;
      chaves.forEach((c, k) => {
        let valor = t.slice(c.fim, k + 1 < chaves.length ? chaves[k + 1].inicio : undefined).trim().replace(/[\s,;]+$/, '');
        if (k === chaves.length - 1) {
          // No fim costuma vir o texto livre do órgão, começando com maiúscula.
          const corte = /\s(?=\p{Lu})/u.exec(valor);
          if (corte && corte.index > 0) {
            obs = valor.slice(corte.index + 1).trim();
            valor = valor.slice(0, corte.index).trim();
          }
        }
        atributos.push({ chave: c.chave, valor });
      });
      return { nome, atributos, obs, etiquetas };
    }
  }

  // O órgão costuma pôr o título do item na primeira linha.
  if (linhas.length > 1 && !lote) {
    const primeira = capitalizar(semGritos(limparEspacos(linhas[0].replace(CODIGO, ''))));
    if (primeira.length >= 3 && primeira.length <= 80 && t.startsWith(primeira)) {
      const resto = capitalizar(t.slice(primeira.length).trim());
      return { nome: primeira, atributos: [], obs: resto || null, etiquetas };
    }
  }

  const ponto = t.indexOf('. ');
  if (ponto >= 10 && ponto <= 100) {
    return { nome: t.slice(0, ponto), atributos: [], obs: capitalizar(t.slice(ponto + 2).trim()) || null, etiquetas };
  }
  if (t.length <= 100) return { nome: t.replace(/\.$/, ''), atributos: [], obs: null, etiquetas };
  const espaco = t.lastIndexOf(' ', 90);
  return { nome: `${t.slice(0, espaco > 20 ? espaco : 90).replace(/[\s,;:.-]+$/, '')}…`, atributos: [], obs: t, etiquetas };
}

export type Lote = { numero: number; texto: string };

/** "(L1):texto,(L2):texto" (padrão do PNCP para lotes) vira lista; um lote só ou texto comum devolve null. */
export function lotesDaInfo(info: string): Lote[] | null {
  const t = limparEspacos(info);
  if (!/^\(L\d+\):/.test(t)) return null;
  const lotes: Lote[] = [];
  for (const m of t.matchAll(/\(L(\d+)\):\s*([\s\S]*?)(?=,?\s*\(L\d+\):|$)/g)) {
    const texto = textoLimpo(m[2].replace(LOTE_TEXTO, '').replace(/,\s*$/, ''));
    if (texto) lotes.push({ numero: Number(m[1]), texto });
  }
  return lotes.length >= 2 ? lotes : null;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/texto.test.ts && npm run typecheck`
Expected: 19 testes PASS; typecheck limpo. Se algum valor esperado divergir, não altere o teste: confira a regra da spec (seção 4.2) e reporte a diferença exata.

- [ ] **Step 5: Commit**

```bash
git add lib/texto.ts lib/texto.test.ts
git commit -m "feat: limpeza dos textos do PNCP (maiúsculas, título curto, itens, lotes)" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 4: Participação, valores curtos, etiquetas e painel

**Files:**
- Create: `lib/participacao.ts`, `lib/painel.ts`
- Modify: `lib/formato.ts`, `lib/tipos.ts`
- Test: `lib/participacao.test.ts`, `lib/painel.test.ts`, `lib/formato.test.ts`

**Interfaces:**
- Produces (`lib/tipos.ts`): `type ResumoItens = { total: number; materiais: number; servicos: number; comBeneficio: number; exclusivos: number; cota: number; criterios: string[] }`.
- Produces (`lib/participacao.ts`): `sistemaDaDisputa(link: string | null): string`; `esferaNome(codigo: string | null): string | null`; `modalidadeCurta(nome: string | null): string | null`; `oQueCompram(r: ResumoItens): string`; `textoMeEpp(r: ResumoItens): string | null`; `criterioTexto(criterios: string[]): string | null`.
- Produces (`lib/formato.ts`): `moedaCurta(v: number | string | null | undefined): string | null`; `diaMes(iso: string): string`; `type TomEtiqueta = 'urgente' | 'proximo' | 'novo' | 'aberto'`; `type Etiqueta = { texto: string; tom: TomEtiqueta }`; `etiqueta(e: { encerramento_em: string; publicada_em: string | null }, agora: Date): Etiqueta`.
- Produces (`lib/painel.ts`): `type MunicipioPainel = { nome: string; uf: string; ibge: string; qtd: number }`; `type Painel = { porUf: Record<string, number>; topMunicipios: MunicipioPainel[]; valorTotal: number; ufs: number; total: number }`; `resumirPontos(pontos: PontoMapa[], top?: number): Painel`; `faixaDaUf(qtd: number): 0 | 1 | 2 | 3 | 4`; `CORES_FAIXA: readonly string[]` (índice 0–4); `COR_SEM_COBERTURA: string`; `coresDosEstados(porUf: Record<string, number>, cobertas: readonly string[]): unknown[]`.

- [ ] **Step 1: Tipo `ResumoItens`**

Acrescente ao fim de `lib/tipos.ts`:
```ts
export type ResumoItens = {
  total: number;
  materiais: number;
  servicos: number;
  /** Itens que têm a informação de benefício (preenchida pela releitura do worker). */
  comBeneficio: number;
  /** Participação exclusiva para ME/EPP (tipoBeneficio 1). */
  exclusivos: number;
  /** Cota reservada para ME/EPP (tipoBeneficio 3). */
  cota: number;
  criterios: string[];
};
```

- [ ] **Step 2: Escrever os testes**

`lib/participacao.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { criterioTexto, esferaNome, modalidadeCurta, oQueCompram, sistemaDaDisputa, textoMeEpp } from './participacao';
import type { ResumoItens } from './tipos';

const resumo = (r: Partial<ResumoItens>): ResumoItens => ({
  total: 0, materiais: 0, servicos: 0, comBeneficio: 0, exclusivos: 0, cota: 0, criterios: [], ...r,
});

describe('sistemaDaDisputa', () => {
  it.each([
    ['https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/public/compras/acompanhamento-compra?compra=1', 'Compras.gov.br'],
    ['https://www.gov.br/compras/pt-br', 'Compras.gov.br'],
    ['https://www.portaldecompraspublicas.com.br/processos/sc/123', 'Portal de Compras Públicas'],
    ['https://bllcompras.com/Process/ProcessView?param1=x', 'BLL Compras'],
    ['https://bnccompras.com/Process/ProcessView', 'BNC Compras'],
    ['https://pregaobanrisul.com.br/x', 'Pregão Banrisul'],
    ['https://licitacoes-e2.bb.com.br/aop-inter-estatico/', 'Licitações-e (Banco do Brasil)'],
    ['https://comprasbr.com.br/pregao', 'ComprasBR'],
    ['https://compras.rs.gov.br/x', 'Compras RS'],
    ['https://portal.tce.rs.gov.br/x', 'Portal do TCE-RS'],
    ['https://portal.licitanet.com.br/x', 'Licitanet'],
    ['https://app2.licitardigital.com.br/x', 'Licitar Digital'],
    ['https://licitamaisbrasil.com.br/x', 'Licita Mais Brasil'],
    ['https://www.antonioprado.rs.gov.br/licitacoes', 'antonioprado.rs.gov.br'],
  ])('%s → %s', (link, nome) => {
    expect(sistemaDaDisputa(link)).toBe(nome);
  });
  it('sem link ou link que não é http(s)', () => {
    expect(sistemaDaDisputa(null)).toBe('Sistema indicado no edital');
    expect(sistemaDaDisputa('javascript:alert(1)')).toBe('Sistema indicado no edital');
  });
});

describe('esfera e modalidade', () => {
  it('esfera por código', () => {
    expect(esferaNome('F')).toBe('Federal');
    expect(esferaNome('E')).toBe('Estadual');
    expect(esferaNome('M')).toBe('Municipal');
    expect(esferaNome('D')).toBe('Distrital');
    expect(esferaNome('N')).toBeNull();
    expect(esferaNome(null)).toBeNull();
  });
  it('modalidade sem o hífen do PNCP', () => {
    expect(modalidadeCurta('Pregão - Eletrônico')).toBe('Pregão eletrônico');
    expect(modalidadeCurta('Concorrência - Eletrônica')).toBe('Concorrência eletrônica');
    expect(modalidadeCurta('Dispensa')).toBe('Dispensa');
    expect(modalidadeCurta(null)).toBeNull();
  });
});

describe('textos dos itens', () => {
  it('o que compram', () => {
    expect(oQueCompram(resumo({ total: 25, materiais: 25 }))).toBe('25 itens · materiais');
    expect(oQueCompram(resumo({ total: 1, servicos: 1 }))).toBe('1 item · serviços');
    expect(oQueCompram(resumo({ total: 3, materiais: 2, servicos: 1 }))).toBe('3 itens · materiais e serviços');
    expect(oQueCompram(resumo({ total: 2 }))).toBe('2 itens');
  });
  it('ME/EPP', () => {
    expect(textoMeEpp(resumo({ total: 25, comBeneficio: 0 }))).toBeNull();
    expect(textoMeEpp(resumo({ total: 25, comBeneficio: 25, exclusivos: 25 }))).toBe('Exclusivo para ME/EPP em todos os 25 itens');
    expect(textoMeEpp(resumo({ total: 1, comBeneficio: 1, exclusivos: 1 }))).toBe('Exclusivo para ME/EPP');
    expect(textoMeEpp(resumo({ total: 25, comBeneficio: 25, exclusivos: 18, cota: 2 }))).toBe(
      'Exclusivo para ME/EPP em 18 de 25 itens · Cota reservada em 2 itens',
    );
    expect(textoMeEpp(resumo({ total: 4, comBeneficio: 4 }))).toBe('Sem benefício para ME/EPP');
  });
  it('critério de julgamento', () => {
    expect(criterioTexto([])).toBeNull();
    expect(criterioTexto(['Menor preço'])).toBe('menor preço');
    expect(criterioTexto(['Menor preço', 'Maior desconto'])).toBe('critérios variados');
  });
});
```

`lib/painel.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { COR_SEM_COBERTURA, CORES_FAIXA, coresDosEstados, faixaDaUf, resumirPontos } from './painel';
import type { PontoMapa } from './tipos';

const P = (codigo_ibge: string, nome: string, uf: string, qtd: number, valor_total: number | null): PontoMapa => ({
  codigo_ibge, nome, uf, lat: 0, lng: 0, qtd, valor_total, prazo_mais_proximo: '2026-10-20T13:00:00Z',
});

describe('resumirPontos', () => {
  it('soma por UF, total, valor e os municípios com mais editais', () => {
    const r = resumirPontos(
      [P('4106902', 'Curitiba', 'PR', 312, 1e8), P('4205407', 'Florianópolis', 'SC', 120, 5e7), P('4314902', 'Porto Alegre', 'RS', 152, null), P('4113700', 'Londrina', 'PR', 40, 2e6)],
      3,
    );
    expect(r.porUf).toEqual({ PR: 352, SC: 120, RS: 152 });
    expect(r.ufs).toBe(3);
    expect(r.total).toBe(624);
    expect(r.valorTotal).toBe(152_000_000);
    expect(r.topMunicipios).toEqual([
      { nome: 'Curitiba', uf: 'PR', ibge: '4106902', qtd: 312 },
      { nome: 'Porto Alegre', uf: 'RS', ibge: '4314902', qtd: 152 },
      { nome: 'Florianópolis', uf: 'SC', ibge: '4205407', qtd: 120 },
    ]);
  });
  it('sem pontos', () => {
    expect(resumirPontos([])).toEqual({ porUf: {}, topMunicipios: [], valorTotal: 0, ufs: 0, total: 0 });
  });
});

describe('cores dos estados', () => {
  it('faixas 1–19, 20–49, 50–199, 200+', () => {
    expect([0, 1, 19, 20, 49, 50, 199, 200].map(faixaDaUf)).toEqual([0, 1, 1, 2, 2, 3, 3, 4]);
  });
  it('expressão de cor: estados cobertos pela faixa, os outros em cinza', () => {
    expect(coresDosEstados({ PR: 352, SC: 5 }, ['SC', 'PR', 'RS'])).toEqual([
      'match', ['get', 'uf'], 'SC', CORES_FAIXA[1], 'PR', CORES_FAIXA[4], 'RS', CORES_FAIXA[0], COR_SEM_COBERTURA,
    ]);
  });
});
```

Acrescente ao fim de `lib/formato.test.ts` (e inclua `diaMes`, `etiqueta`, `moedaCurta` no import do topo):
```ts
describe('moedaCurta e diaMes', () => {
  it('abrevia', () => {
    expect(moedaCurta(850)).toBe('R$ 850');
    expect(moedaCurta(860_000)).toBe('R$ 860 mil');
    expect(moedaCurta(999_600)).toBe('R$ 999 mil');
    expect(moedaCurta(1_250_000)).toBe('R$ 1,25 mi');
    expect(moedaCurta(1_284_000)).toBe('R$ 1,28 mi');
    expect(moedaCurta(2_105_000_000)).toBe('R$ 2,1 bi');
    expect(moedaCurta('50000')).toBe('R$ 50 mil');
  });
  it('zero e vazio viram null', () => {
    expect(moedaCurta(0)).toBeNull();
    expect(moedaCurta(null)).toBeNull();
  });
  it('dia e mês no padrão da marca', () => {
    expect(diaMes('2026-09-25T13:00:00Z')).toBe('25.09');
  });
});

describe('etiqueta', () => {
  const longe = '2026-11-14T13:00:00Z';
  it('prazo manda primeiro', () => {
    expect(etiqueta({ encerramento_em: '2026-10-15T20:00:00Z', publicada_em: null }, AGORA)).toEqual({ texto: 'Encerra hoje', tom: 'urgente' });
    expect(etiqueta({ encerramento_em: '2026-10-16T12:30:00Z', publicada_em: null }, AGORA)).toEqual({ texto: 'Encerra amanhã', tom: 'urgente' });
    expect(etiqueta({ encerramento_em: '2026-10-20T13:00:00Z', publicada_em: '2026-10-15T12:00:00Z' }, AGORA)).toEqual({
      texto: 'Encerra em 5 dias',
      tom: 'proximo',
    });
  });
  it('novo: publicado nos últimos 3 dias de calendário', () => {
    expect(etiqueta({ encerramento_em: longe, publicada_em: '2026-10-13T12:00:00Z' }, AGORA)).toEqual({ texto: 'Novo', tom: 'novo' });
    expect(etiqueta({ encerramento_em: longe, publicada_em: '2026-10-12T12:00:00Z' }, AGORA)).toEqual({ texto: 'Aberto', tom: 'aberto' });
    expect(etiqueta({ encerramento_em: longe, publicada_em: null }, AGORA)).toEqual({ texto: 'Aberto', tom: 'aberto' });
  });
});
```
(`AGORA` já existe no topo de `lib/formato.test.ts`: 15/10/2026 12h em Brasília.)

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run lib/participacao.test.ts lib/painel.test.ts lib/formato.test.ts`
Expected: FAIL — módulos e funções novos não existem.

- [ ] **Step 4: Implementar**

`lib/participacao.ts`:
```ts
import { numero } from './formato';
import type { ResumoItens } from './tipos';

const SEM_SISTEMA = 'Sistema indicado no edital';

/** Domínio do link oficial → nome do sistema onde a disputa acontece (os mais comuns na cobertura atual). */
const SISTEMAS: ReadonlyArray<readonly [RegExp, string]> = [
  [/(^|\.)cnetmobile\.estaleiro\.serpro\.gov\.br$/, 'Compras.gov.br'],
  [/(^|\.)portaldecompraspublicas\.com\.br$/, 'Portal de Compras Públicas'],
  [/(^|\.)bllcompras\.com$/, 'BLL Compras'],
  [/(^|\.)bnccompras\.com$/, 'BNC Compras'],
  [/(^|\.)pregaobanrisul\.com\.br$/, 'Pregão Banrisul'],
  [/(^|\.)licitacoes-e2?\.bb\.com\.br$/, 'Licitações-e (Banco do Brasil)'],
  [/(^|\.)comprasbr\.com\.br$/, 'ComprasBR'],
  [/(^|\.)compras\.rs\.gov\.br$/, 'Compras RS'],
  [/(^|\.)portal\.tce\.rs\.gov\.br$/, 'Portal do TCE-RS'],
  [/(^|\.)licitanet\.com\.br$/, 'Licitanet'],
  [/(^|\.)licitardigital\.com\.br$/, 'Licitar Digital'],
  [/(^|\.)licitamaisbrasil\.com\.br$/, 'Licita Mais Brasil'],
];

export function sistemaDaDisputa(link: string | null): string {
  const texto = link?.trim();
  if (!texto || !/^https?:\/\//i.test(texto)) return SEM_SISTEMA;
  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    return SEM_SISTEMA;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'gov.br' && url.pathname.startsWith('/compras')) return 'Compras.gov.br';
  for (const [padrao, nome] of SISTEMAS) if (padrao.test(host)) return nome;
  return host;
}

const ESFERAS: Record<string, string> = { F: 'Federal', E: 'Estadual', M: 'Municipal', D: 'Distrital' };

export function esferaNome(codigo: string | null): string | null {
  return (codigo && ESFERAS[codigo]) || null;
}

/** "Pregão - Eletrônico" → "Pregão eletrônico". */
export function modalidadeCurta(nome: string | null): string | null {
  return nome ? nome.replace(/\s*-\s*(\p{Lu})/u, (_, letra: string) => ` ${letra.toLocaleLowerCase('pt-BR')}`) : null;
}

export function oQueCompram(r: ResumoItens): string {
  const n = `${numero(r.total)} ${r.total === 1 ? 'item' : 'itens'}`;
  if (r.materiais > 0 && r.servicos > 0) return `${n} · materiais e serviços`;
  if (r.materiais > 0) return `${n} · materiais`;
  if (r.servicos > 0) return `${n} · serviços`;
  return n;
}

export function textoMeEpp(r: ResumoItens): string | null {
  if (r.comBeneficio === 0) return null;
  const partes: string[] = [];
  if (r.exclusivos > 0) {
    if (r.exclusivos === r.total) partes.push(r.total === 1 ? 'Exclusivo para ME/EPP' : `Exclusivo para ME/EPP em todos os ${numero(r.total)} itens`);
    else partes.push(`Exclusivo para ME/EPP em ${numero(r.exclusivos)} de ${numero(r.total)} itens`);
  }
  if (r.cota > 0) partes.push(`Cota reservada em ${numero(r.cota)} ${r.cota === 1 ? 'item' : 'itens'}`);
  return partes.length ? partes.join(' · ') : 'Sem benefício para ME/EPP';
}

export function criterioTexto(criterios: string[]): string | null {
  if (criterios.length === 0) return null;
  if (criterios.length > 1) return 'critérios variados';
  return criterios[0].toLocaleLowerCase('pt-BR');
}
```

`lib/painel.ts`:
```ts
import type { PontoMapa } from './tipos';

export type MunicipioPainel = { nome: string; uf: string; ibge: string; qtd: number };
export type Painel = { porUf: Record<string, number>; topMunicipios: MunicipioPainel[]; valorTotal: number; ufs: number; total: number };

/** Números do painel a partir dos pontos do mapa que o navegador já tem. */
export function resumirPontos(pontos: PontoMapa[], top = 5): Painel {
  const porUf: Record<string, number> = {};
  let valorTotal = 0;
  let total = 0;
  for (const p of pontos) {
    porUf[p.uf] = (porUf[p.uf] ?? 0) + p.qtd;
    valorTotal += p.valor_total ?? 0;
    total += p.qtd;
  }
  const topMunicipios = [...pontos]
    .sort((a, b) => b.qtd - a.qtd || a.nome.localeCompare(b.nome, 'pt-BR'))
    .slice(0, top)
    .map((p) => ({ nome: p.nome, uf: p.uf, ibge: p.codigo_ibge, qtd: p.qtd }));
  return { porUf, topMunicipios, valorTotal, ufs: Object.keys(porUf).length, total };
}

/** Faixas da legenda: 0 = sem editais, 1 = 1–19, 2 = 20–49, 3 = 50–199, 4 = 200+. */
export function faixaDaUf(qtd: number): 0 | 1 | 2 | 3 | 4 {
  if (qtd >= 200) return 4;
  if (qtd >= 50) return 3;
  if (qtd >= 20) return 2;
  if (qtd >= 1) return 1;
  return 0;
}

/** Tons de azul da escala (o último é o azul-marinho da marca); índice = faixa. */
export const CORES_FAIXA: readonly string[] = ['#eef2f8', '#d5deeb', '#9db0cc', '#5b7aa6', '#0c2340'];
export const COR_SEM_COBERTURA = '#ebe6d9';

/** Expressão `match` do MapLibre que pinta cada estado coberto pela faixa e os outros em cinza. */
export function coresDosEstados(porUf: Record<string, number>, cobertas: readonly string[]): unknown[] {
  const pares = cobertas.flatMap((uf) => [uf, CORES_FAIXA[faixaDaUf(porUf[uf] ?? 0)]]);
  return ['match', ['get', 'uf'], ...pares, COR_SEM_COBERTURA];
}
```

Em `lib/formato.ts`, depois de `moeda`:
```ts
const fmtInteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const fmtUmaCasa = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtDuasCasas = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Valor abreviado para cards e painéis: "R$ 860 mil", "R$ 1,25 mi", "R$ 2,1 bi" (espaços inseparáveis). */
export function moedaCurta(v: number | string | null | undefined): string | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 1e9) return `R$ ${fmtUmaCasa.format(n / 1e9)} bi`;
  if (n >= 1e6) return `R$ ${fmtDuasCasas.format(n / 1e6)} mi`;
  if (n >= 1e3) return `R$ ${fmtInteiro.format(Math.floor(n / 1e3))} mil`;
  return `R$ ${fmtInteiro.format(Math.round(n))}`;
}
```
depois de `dataHora`:
```ts
/** "25.09" (dia e mês de Brasília). */
export function diaMes(iso: string): string {
  const p = partes(new Date(iso));
  return `${p.dia}.${p.mes}`;
}
```
e depois de `prazo`:
```ts
export type TomEtiqueta = 'urgente' | 'proximo' | 'novo' | 'aberto';
export type Etiqueta = { texto: string; tom: TomEtiqueta };

/** Etiqueta do card compacto: prazo curto primeiro; depois "Novo" (publicado nos últimos 3 dias de calendário); senão "Aberto". */
export function etiqueta(e: { encerramento_em: string; publicada_em: string | null }, agora: Date): Etiqueta {
  const d = diasAte(e.encerramento_em, agora);
  if (d <= 0) return { texto: 'Encerra hoje', tom: 'urgente' };
  if (d === 1) return { texto: 'Encerra amanhã', tom: 'urgente' };
  if (d <= 7) return { texto: `Encerra em ${d} dias`, tom: 'proximo' };
  if (e.publicada_em && diasAte(e.publicada_em, agora) >= -2) return { texto: 'Novo', tom: 'novo' };
  return { texto: 'Aberto', tom: 'aberto' };
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run lib && npm run typecheck`
Expected: todos os testes de `lib/` passam; typecheck limpo.

- [ ] **Step 6: Commit**

```bash
git add lib/participacao.ts lib/participacao.test.ts lib/painel.ts lib/painel.test.ts lib/formato.ts lib/formato.test.ts lib/tipos.ts
git commit -m "feat: onde a disputa acontece, valores curtos, etiquetas e números do painel" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 5: Filtros novos, recursos Pro e consultas do servidor

**Files:**
- Modify: `lib/tipos.ts`, `lib/filtros.ts`, `lib/filtros.test.ts`, `lib/eventos.ts`, `lib/eventos.test.ts`, `lib/servidor/consultas.ts`

**Interfaces:**
- Consumes: funções SQL da Task 1; `ResumoItens` (Task 4).
- Produces:
  - `FiltrosBusca` + `valorMin: number | null; modalidades: number[] | null`
  - `type FiltrosTela = { q: string; uf: string; cidade: Cidade | null; valorMin: number | null; modalidades: number[]; seteDias: boolean }`
  - `EditalResumo` + `unidade_nome: string | null; publicada_em: string | null; srp: boolean`
  - `Edital` + `abertura_em: string | null; esfera: string | null`
  - `ItemEdital` + `material_ou_servico: string | null; beneficio_id: number | null; beneficio_nome: string | null; criterio_julgamento: string | null`
  - `VALORES_MINIMOS = [10000, 50000, 100000, 500000, 1000000] as const`; `MODALIDADES: ReadonlyArray<{ id: number; nome: string }>` (6 Pregão eletrônico, 7 Pregão presencial, 4 Concorrência eletrônica, 8 Dispensa, 12 Credenciamento); `paraParametros(f: FiltrosTela, opcoes?: { comCidade?: boolean; deslocamento?: number }): URLSearchParams`
  - `RECURSOS` + `'plano_pro'`, `'filtros_pro'` (sem edital)
  - `resumoItens(id: string): Promise<ResumoItens>`; `buscarEditais`/`pontosDoMapa` com os filtros novos; `edital()` com `abertura_em` e `esfera`; `itensDoEdital()` com os campos novos.
  - API: `/api/busca` e `/api/mapa` aceitam `valor` (um dos `VALORES_MINIMOS`) e `modalidades` (ids separados por vírgula).

- [ ] **Step 1: Tipos**

Em `lib/tipos.ts`:
1. `FiltrosBusca` passa a ser:
```ts
export type FiltrosBusca = {
  q: string | null;
  uf: string | null;
  ibge: string | null;
  dias: number | null;
  deslocamento: number;
  valorMin: number | null;
  modalidades: number[] | null;
};

/** Estado dos filtros na tela inicial (o navegador monta a URL da API com `paraParametros`). */
export type FiltrosTela = {
  q: string;
  uf: string;
  cidade: Cidade | null;
  valorMin: number | null;
  modalidades: number[];
  seteDias: boolean;
};
```
2. Em `EditalResumo`, depois de `orgao_nome: string;`: `unidade_nome: string | null;`; depois de `encerramento_em: string;`: `publicada_em: string | null;`; depois de `modalidade_nome: string | null;`: `srp: boolean;`.
3. Em `Edital`, depois de `publicada_em: string | null;`: `abertura_em: string | null;`; depois de `situacao_nome: string | null;`: `esfera: string | null;`.
4. Em `ItemEdital`, depois de `sigiloso: boolean;`:
```ts
  material_ou_servico: string | null;
  beneficio_id: number | null;
  beneficio_nome: string | null;
  criterio_julgamento: string | null;
```

- [ ] **Step 2: Testes de filtros e eventos (falhando)**

`lib/filtros.test.ts` (substitui o atual):
```ts
import { describe, expect, it } from 'vitest';
import { chaveFiltros, lerFiltros, paraParametros } from './filtros';
import type { FiltrosTela } from './tipos';

const ler = (s: string) => lerFiltros(new URLSearchParams(s));
const BASE = { q: null, uf: null, ibge: null, dias: null, deslocamento: 0, valorMin: null, modalidades: null };

describe('lerFiltros', () => {
  it('sem parâmetros', () => {
    expect(ler('')).toEqual(BASE);
  });
  it('aceita os valores válidos', () => {
    expect(ler('q=%20EPI%20e%20uniformes%20&uf=sc&ibge=4205407&dias=7&deslocamento=50&valor=50000&modalidades=8,6,6')).toEqual({
      q: 'EPI e uniformes', uf: 'SC', ibge: '4205407', dias: 7, deslocamento: 50, valorMin: 50000, modalidades: [6, 8],
    });
  });
  it('descarta UF fora da cobertura, IBGE malformado e dias diferentes de 7', () => {
    expect(ler('uf=SP&ibge=123&dias=30')).toEqual(BASE);
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
});

describe('chaveFiltros', () => {
  it('ignora maiúsculas no termo', () => {
    expect(chaveFiltros(ler('q=EPI'))).toBe(chaveFiltros(ler('q=epi')));
  });
  it('muda quando o filtro muda', () => {
    expect(chaveFiltros(ler('q=epi'))).not.toBe(chaveFiltros(ler('q=epi&uf=PR')));
    expect(chaveFiltros(ler('q=epi'))).not.toBe(chaveFiltros(ler('q=epi&valor=50000')));
    expect(chaveFiltros(ler('q=epi'))).not.toBe(chaveFiltros(ler('q=epi&modalidades=6')));
  });
});

describe('paraParametros', () => {
  const TELA: FiltrosTela = {
    q: ' EPI ', uf: 'SC', cidade: { ibge: '4205407', nome: 'Florianópolis', uf: 'SC' }, valorMin: 50000, modalidades: [8, 6], seteDias: true,
  };
  it('monta os parâmetros que a API entende', () => {
    expect(paraParametros(TELA, { deslocamento: 50 }).toString()).toBe(
      'q=EPI&uf=SC&dias=7&valor=50000&modalidades=6%2C8&ibge=4205407&deslocamento=50',
    );
  });
  it('sem cidade para o mapa e vazio quando não há filtro', () => {
    expect(paraParametros(TELA, { comCidade: false }).has('ibge')).toBe(false);
    expect(paraParametros({ q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false }).toString()).toBe('');
  });
  it('ida e volta com lerFiltros', () => {
    expect(lerFiltros(paraParametros(TELA))).toEqual({
      q: 'EPI', uf: 'SC', ibge: '4205407', dias: 7, deslocamento: 0, valorMin: 50000, modalidades: [6, 8],
    });
  });
});
```

Em `lib/eventos.test.ts`, no `describe('validarEvento')`, acrescente:
```ts
  it('quer_recurso de plano e filtros Pro não exige edital', () => {
    expect(validarEvento({ tipo: 'quer_recurso', detalhe: { recurso: 'plano_pro' } })).toEqual({
      ok: true, valor: { tipo: 'quer_recurso', detalhe: { recurso: 'plano_pro' } },
    });
    expect(validarEvento({ tipo: 'quer_recurso', detalhe: { recurso: 'filtros_pro' } }).ok).toBe(true);
    expect(validarEvento({ tipo: 'quer_recurso', detalhe: { recurso: 'resumo_ia' } }).ok).toBe(false);
  });
```

Run: `npx vitest run lib/filtros.test.ts lib/eventos.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar filtros e eventos**

`lib/filtros.ts` (substitui o atual):
```ts
import type { FiltrosBusca, FiltrosTela } from './tipos';

export const UFS_COBERTAS = ['SC', 'PR', 'RS'] as const;
export const VALORES_MINIMOS = [10_000, 50_000, 100_000, 500_000, 1_000_000] as const;
export const MODALIDADES: ReadonlyArray<{ id: number; nome: string }> = [
  { id: 6, nome: 'Pregão eletrônico' },
  { id: 7, nome: 'Pregão presencial' },
  { id: 4, nome: 'Concorrência eletrônica' },
  { id: 8, nome: 'Dispensa' },
  { id: 12, nome: 'Credenciamento' },
];
const IDS_MODALIDADE = MODALIDADES.map((m) => m.id);

export function lerFiltros(p: URLSearchParams): FiltrosBusca {
  const q = (p.get('q') ?? '').trim().slice(0, 100) || null;
  const ufBruta = (p.get('uf') ?? '').toUpperCase();
  const uf = (UFS_COBERTAS as readonly string[]).includes(ufBruta) ? ufBruta : null;
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
  return { q, uf, ibge, dias, deslocamento, valorMin, modalidades: ids.length ? ids : null };
}

export function chaveFiltros(f: FiltrosBusca): string {
  return JSON.stringify([f.q?.toLowerCase() ?? null, f.uf, f.ibge, f.dias, f.deslocamento, f.valorMin, f.modalidades]);
}

/** Filtros da tela → parâmetros de `/api/busca` e `/api/mapa` (o mapa não leva a cidade). */
export function paraParametros(f: FiltrosTela, opcoes: { comCidade?: boolean; deslocamento?: number } = {}): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.uf) p.set('uf', f.uf);
  if (f.seteDias) p.set('dias', '7');
  if (f.valorMin) p.set('valor', String(f.valorMin));
  if (f.modalidades.length) p.set('modalidades', [...f.modalidades].sort((a, b) => a - b).join(','));
  if (opcoes.comCidade !== false && f.cidade) p.set('ibge', f.cidade.ibge);
  if (opcoes.deslocamento) p.set('deslocamento', String(opcoes.deslocamento));
  return p;
}
```

`lib/eventos.ts`: troque a linha de `RECURSOS` por:
```ts
export const RECURSOS = ['preco_referencia', 'quem_venceu', 'resumo_ia', 'plano_pro', 'filtros_pro'] as const;
export type Recurso = (typeof RECURSOS)[number];
/** Interesse em planos e filtros Pro: vem do cabeçalho e dos chips, sem edital. */
const RECURSOS_SEM_EDITAL: readonly string[] = ['plano_pro', 'filtros_pro'];
```
(remova a linha antiga `export type Recurso` duplicada) e, em `validarEvento`, no bloco `if (tipo === 'quer_recurso')`, logo depois da checagem de recurso inválido:
```ts
    if (RECURSOS_SEM_EDITAL.includes(d.recurso)) return { ok: true, valor: { tipo, detalhe: { recurso: d.recurso } } };
```

- [ ] **Step 4: Consultas do servidor**

`lib/servidor/consultas.ts` (substitui o atual):
```ts
import 'server-only';
import { criarCache } from '../cache';
import { chaveFiltros } from '../filtros';
import type { Edital, EditalResumo, FiltrosBusca, ItemEdital, PontoMapa, ResultadoBusca, ResumoItens } from '../tipos';
import { supabaseServidor } from './supabase';

const cache = criarCache(5 * 60 * 1000);
export const POR_PAGINA = 50;
type Linha = Record<string, unknown>;

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const texto = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));

export function buscarEditais(f: FiltrosBusca): Promise<ResultadoBusca> {
  return cache(`busca:${chaveFiltros(f)}`, async () => {
    const { data, error } = await supabaseServidor().rpc('buscar_editais', {
      q: f.q,
      p_ufs: f.uf ? [f.uf] : null,
      p_ibge: f.ibge,
      p_dias: f.dias,
      p_valor_min: f.valorMin,
      p_modalidades: f.modalidades,
      p_limite: POR_PAGINA,
      p_deslocamento: f.deslocamento,
    });
    if (error) throw new Error(`buscar_editais: ${error.message}`);
    const linhas = (data ?? []) as Linha[];
    return {
      total: Number(linhas[0]?.total ?? 0),
      editais: linhas.map((l): EditalResumo => ({
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
        item_trecho: texto(l.item_trecho),
      })),
    };
  });
}

/** O PostgREST devolve no máximo 1.000 linhas por resposta: lê em páginas até o fim. */
export function pontosDoMapa(f: FiltrosBusca): Promise<PontoMapa[]> {
  return cache(`mapa:${chaveFiltros({ ...f, ibge: null, deslocamento: 0 })}`, async () => {
    const pontos: PontoMapa[] = [];
    for (let de = 0; ; de += 1000) {
      const { data, error } = await supabaseServidor()
        .rpc('mapa_editais', {
          q: f.q,
          p_ufs: f.uf ? [f.uf] : null,
          p_dias: f.dias,
          p_valor_min: f.valorMin,
          p_modalidades: f.modalidades,
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

export function edital(slug: string): Promise<Edital | null> {
  return cache(`edital:${slug}`, async () => {
    const { data, error } = await supabaseServidor()
      .from('contratacoes')
      .select(
        'id, slug, cnpj, ano, sequencial, objeto, info_complementar, orgao_nome, unidade_nome, esfera, municipio_nome, uf, codigo_ibge, modalidade_nome, situacao_nome, srp, valor_estimado, publicada_em, abertura_em, encerramento_em, link_origem',
      )
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw new Error(`edital: ${error.message}`);
    return data ? ({ ...data, valor_estimado: num(data.valor_estimado) } as Edital) : null;
  });
}

/** Até `limite` itens, em páginas de 1.000 (teto do PostgREST), e o total do edital. */
export function itensDoEdital(id: string, limite: number): Promise<{ total: number; itens: ItemEdital[] }> {
  return cache(`itens:${id}:${limite}`, async () => {
    const itens: ItemEdital[] = [];
    let total = 0;
    for (let de = 0; de < limite; de += 1000) {
      const ate = Math.min(de + 1000, limite) - 1;
      const { data, error, count } = await supabaseServidor()
        .from('itens')
        .select(
          'numero, descricao, quantidade, unidade, valor_unitario_estimado, valor_total_estimado, sigiloso, material_ou_servico, beneficio_id, beneficio_nome, criterio_julgamento',
          { count: 'exact' },
        )
        .eq('contratacao_id', id)
        .order('numero')
        .range(de, ate);
      if (error) throw new Error(`itens: ${error.message}`);
      total = count ?? 0;
      const linhas = (data ?? []) as Linha[];
      for (const l of linhas) {
        itens.push({
          numero: Number(l.numero),
          descricao: String(l.descricao),
          quantidade: num(l.quantidade),
          unidade: texto(l.unidade),
          valor_unitario_estimado: num(l.valor_unitario_estimado),
          valor_total_estimado: num(l.valor_total_estimado),
          sigiloso: Boolean(l.sigiloso),
          material_ou_servico: texto(l.material_ou_servico),
          beneficio_id: num(l.beneficio_id),
          beneficio_nome: texto(l.beneficio_nome),
          criterio_julgamento: texto(l.criterio_julgamento),
        });
      }
      if (linhas.length < ate - de + 1) break;
      if (itens.length >= total) break;
    }
    return { total, itens };
  });
}

/** Tipos, ME/EPP e critérios de todos os itens do edital (função SQL `resumo_itens`). */
export function resumoItens(id: string): Promise<ResumoItens> {
  return cache(`resumo-itens:${id}`, async () => {
    const { data, error } = await supabaseServidor().rpc('resumo_itens', { p_contratacao: id }).single();
    if (error) throw new Error(`resumo_itens: ${error.message}`);
    const l = (data ?? {}) as Linha;
    return {
      total: Number(l.total ?? 0),
      materiais: Number(l.materiais ?? 0),
      servicos: Number(l.servicos ?? 0),
      comBeneficio: Number(l.com_beneficio ?? 0),
      exclusivos: Number(l.exclusivos ?? 0),
      cota: Number(l.cota ?? 0),
      criterios: Array.isArray(l.criterios) ? (l.criterios as unknown[]).map(String) : [],
    };
  });
}

export function atualizadoEm(): Promise<string | null> {
  return cache('atualizado', async () => {
    const { data, error } = await supabaseServidor()
      .from('sync_estado')
      .select('ultima_execucao')
      .eq('status', 'ok')
      .order('ultima_execucao', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`sync_estado: ${error.message}`);
    return texto(data?.ultima_execucao);
  });
}
```

- [ ] **Step 5: Verificar**

Run: `npx vitest run lib && npm run typecheck && npm run build`
Expected: testes passam (os de `lib/servidor/consultas.test.ts` continuam passando: o falso ignora as colunas pedidas); typecheck e build limpos.

Com o servidor local (`npx next dev -p 3000 > "$TEMP/next-dev.log" 2>&1 &`; aquecer com `curl -s -o /dev/null --max-time 180 http://localhost:3000/api/busca`):
```bash
curl -s "http://localhost:3000/api/busca?valor=1000000" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('total',j.total,'menor valor',Math.min(...j.editais.map(e=>e.valor_estimado)),'publicada',j.editais[0].publicada_em,'srp',j.editais[0].srp)})"
curl -s "http://localhost:3000/api/busca?modalidades=12" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('total',j.total,[...new Set(j.editais.map(e=>e.modalidade_nome))].join('|'))})"
curl -s "http://localhost:3000/api/mapa?valor=1000000" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log('municipios',JSON.parse(s).length))"
```
Expected: menor valor ≥ 1000000; só "Credenciamento"; municípios > 0 e bem menos que 1.007. Pare o servidor (PowerShell: `Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`).

- [ ] **Step 6: Commit**

```bash
git add lib
git commit -m "feat: filtros de valor e modalidade, recursos Pro e consultas com os campos novos" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 6: Contorno dos estados (`public/geo/estados.json`)

**Files:**
- Create: `scripts/gerar-estados-geojson.ts`, `public/geo/estados.json` (gerado)
- Modify: `package.json`

**Interfaces:**
- Consumes: `UF_POR_CODIGO` de `worker/municipios.ts`.
- Produces: `/geo/estados.json` — `FeatureCollection` com 27 features `{ properties: { uf: 'SC' }, geometry: Polygon | MultiPolygon }`.

- [ ] **Step 1: Script**

`scripts/gerar-estados-geojson.ts`:
```ts
// Gera public/geo/estados.json (contorno das 27 UFs) a partir da malha do IBGE (qualidade mínima).
import { mkdir, writeFile } from 'node:fs/promises';
import { UF_POR_CODIGO } from '../worker/municipios';

const URL_MALHA =
  'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF';
const CASAS = Number(process.env.CASAS ?? 3);

const resposta = await fetch(URL_MALHA);
if (!resposta.ok) throw new Error(`IBGE respondeu ${resposta.status}`);
const malha = (await resposta.json()) as { features: Array<{ geometry: { type: string; coordinates: unknown }; properties: { codarea: string } }> };

const fator = 10 ** CASAS;
const arredondar = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(arredondar) : typeof v === 'number' ? Math.round(v * fator) / fator : v;

const features = malha.features.map((f) => {
  const uf = UF_POR_CODIGO[f.properties.codarea];
  if (!uf) throw new Error(`Código de UF desconhecido: ${f.properties.codarea}`);
  return { type: 'Feature', properties: { uf }, geometry: { type: f.geometry.type, coordinates: arredondar(f.geometry.coordinates) } };
});
if (features.length !== 27) throw new Error(`Esperava 27 UFs, veio ${features.length}`);

const json = JSON.stringify({ type: 'FeatureCollection', features });
await mkdir('public/geo', { recursive: true });
await writeFile('public/geo/estados.json', json);
console.log(`public/geo/estados.json: ${features.length} UFs, ${Math.round(json.length / 1024)} KB`);
```

`package.json`, em `"scripts"`: `"gerar:estados": "tsx scripts/gerar-estados-geojson.ts",`

- [ ] **Step 2: Gerar**

Run: `npm run gerar:estados`
Expected: `public/geo/estados.json: 27 UFs, N KB`. Se N > 200, rode `CASAS=2 npm run gerar:estados` e reporte o tamanho final.

- [ ] **Step 3: Verificar e commit**

Run: `node -e "const g=require('./public/geo/estados.json');console.log(g.features.length,[...new Set(g.features.map(f=>f.properties.uf))].sort().join(','))"`
Expected: `27 AC,AL,AM,AP,BA,CE,DF,ES,GO,MA,MG,MS,MT,PA,PB,PE,PI,PR,RJ,RN,RO,RR,RS,SC,SE,SP,TO`

Run: `npm run typecheck`

```bash
git add scripts/gerar-estados-geojson.ts public/geo/estados.json package.json
git commit -m "feat: contorno das 27 UFs para o mapa (malha do IBGE)" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 7: Cabeçalho novo e aviso "em breve" medido

**Files:**
- Create: `components/BotaoEmBreve.tsx`
- Modify: `components/Cabecalho.tsx`

**Interfaces:**
- Consumes: `registrar` (`lib/cliente/registrar.ts`); recursos `plano_pro`, `filtros_pro` (Task 5).
- Produces: `<BotaoEmBreve recurso="plano_pro" | "filtros_pro" className? rotulo?>{children}</BotaoEmBreve>`; `<Cabecalho />` (componente de cliente; mesma importação usada pelas páginas).

- [ ] **Step 1: Botão "em breve"**

`components/BotaoEmBreve.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { useId, useRef, type ReactNode } from 'react';
import { registrar } from '@/lib/cliente/registrar';

type Props = { recurso: 'plano_pro' | 'filtros_pro'; className?: string; rotulo?: string; children: ReactNode };

/** Botão de recurso da Fase 3: registra o interesse e abre um aviso "em breve" com atalho para criar alerta. */
export function BotaoEmBreve({ recurso, className, rotulo, children }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const titulo = useId();
  return (
    <>
      <button
        type="button"
        aria-label={rotulo}
        className={className}
        onClick={() => {
          registrar('quer_recurso', { recurso });
          dialogo.current?.showModal();
        }}
      >
        {children}
      </button>
      <dialog
        ref={dialogo}
        aria-labelledby={titulo}
        className="m-auto w-[min(92vw,420px)] rounded-lg border border-line bg-raised p-6 text-ink shadow-[0_8px_32px_rgba(12,35,64,.18)] backdrop:bg-ink/40"
      >
        <h2 id={titulo} className="text-lg font-bold">Em breve</h2>
        <p className="mt-2 text-[15px] text-ink-muted">
          Os planos chegam em breve. Enquanto isso, crie um alerta grátis para ser avisado.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/alertas" className="inline-flex h-10 items-center rounded-sm bg-pin px-4 text-sm font-semibold text-on-pin">
            Criar alerta
          </Link>
          <button
            type="button"
            onClick={() => dialogo.current?.close()}
            className="h-10 rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken"
          >
            Fechar
          </button>
        </div>
      </dialog>
    </>
  );
}
```

- [ ] **Step 2: Cabeçalho**

`components/Cabecalho.tsx` (substitui o atual):
```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BotaoEmBreve } from './BotaoEmBreve';
import { Logo } from './Logo';

const ABA = 'rounded-sm px-3 py-1.5 text-sm font-semibold';

/** Logo, abas (Mapa, Alertas, Planos) e "Assinar Pro". No celular: logo, Alertas e Assinar Pro. */
export function Cabecalho() {
  const caminho = usePathname() ?? '/';
  const ativa = (href: string) => (href === '/' ? caminho === '/' : caminho.startsWith(href));
  const estilo = (href: string) => `${ABA} ${ativa(href) ? 'bg-pin-soft text-pin-strong' : 'text-ink hover:bg-sunken'}`;
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-line bg-raised px-4 py-3 lg:gap-8 lg:px-6">
      <Link href="/" aria-label="Edital Map, página inicial" className="shrink-0">
        <Logo />
      </Link>
      <nav aria-label="Principal" className="flex items-center gap-1">
        <Link href="/" aria-current={ativa('/') ? 'page' : undefined} className={`${estilo('/')} hidden lg:inline-block`}>
          Mapa
        </Link>
        <Link href="/alertas" aria-current={ativa('/alertas') ? 'page' : undefined} className={estilo('/alertas')}>
          Alertas
        </Link>
        <BotaoEmBreve recurso="plano_pro" className={`${ABA} hidden text-ink hover:bg-sunken lg:inline-block`}>
          Planos
        </BotaoEmBreve>
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <Link href="/sobre" className="hidden text-sm font-semibold text-ink-muted hover:text-ink lg:inline">
          Sobre
        </Link>
        <BotaoEmBreve
          recurso="plano_pro"
          className="h-9 shrink-0 rounded-sm bg-pin px-3 text-[13px] font-semibold text-on-pin lg:h-10 lg:px-4 lg:text-sm"
        >
          Assinar Pro
        </BotaoEmBreve>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Verificar**

Run: `npm run typecheck && npm test && npm run build`
Expected: limpos.

Com `npx next dev -p 3000`, conferir: `curl -s http://localhost:3000/alertas | grep -o 'Assinar Pro' | head -1` → `Assinar Pro`. Pare o servidor.

- [ ] **Step 4: Commit**

```bash
git add components/BotaoEmBreve.tsx components/Cabecalho.tsx
git commit -m "feat: cabeçalho com abas e Assinar Pro em breve, com interesse medido" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 8: Mapa do Brasil com estados coloridos e círculos por valor

**Files:**
- Modify: `components/Mapa.tsx`, `components/Explorador.tsx` (só a chamada do `<Mapa>`), `package.json`
- Delete: `public/geo/municipios.json`, `scripts/gerar-municipios-geojson.ts`

**Interfaces:**
- Consumes: `/geo/estados.json` (Task 6); `coresDosEstados`, `resumirPontos` (Task 4); `moedaCurta`, `numero`; `UFS_COBERTAS`; `paraGeoJSON`, `PropsPonto`; `ALTURA_GAVETA_RECOLHIDA`.
- Produces: `<Mapa pontos={PontoMapa[]} porUf={Record<string, number>} destaque={string | null} aoEscolherCidade={(c: Cidade) => void} />`.

- [ ] **Step 1: Mapa**

`components/Mapa.tsx` (substitui o atual):
```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import type { Point } from 'geojson';
import type { ExpressionSpecification, GeoJSONSource, Map as MapaLibre, Marker } from 'maplibre-gl';
import { UFS_COBERTAS } from '@/lib/filtros';
import { moedaCurta, numero } from '@/lib/formato';
import { paraGeoJSON, type PropsPonto } from '@/lib/geo';
import { coresDosEstados } from '@/lib/painel';
import type { Cidade, PontoMapa } from '@/lib/tipos';
import { ALTURA_GAVETA_RECOLHIDA } from './GavetaCelular';

// Abre mostrando o Brasil inteiro.
const BRASIL: [[number, number], [number, number]] = [[-74.2, -33.9], [-34.6, 5.4]];
// Raio pela raiz do valor estimado (R$ 1 mi ≈ 7 px; R$ 100 mi ≈ 12 px; R$ 2,5 bi ≈ 22 px).
const RAIO: ExpressionSpecification = ['interpolate', ['linear'], ['sqrt', ['get', 'valor']], 0, 5, 1000, 7, 10000, 12, 50000, 22];
const PINO =
  '<svg viewBox="0 0 22 28" width="26" height="33" aria-hidden="true"><path d="M11 0C4.9 0 0 4.9 0 11c0 8.3 11 17 11 17s11-8.7 11-17C22 4.9 17.1 0 11 0z" fill="#ff5a1f" stroke="#0c2340" stroke-width="1.5"/><circle cx="11" cy="11" r="3.5" fill="#f4f1e8"/></svg>';

type Props = {
  pontos: PontoMapa[];
  porUf: Record<string, number>;
  /** Código IBGE da cidade do edital selecionado: ganha o pino. */
  destaque: string | null;
  aoEscolherCidade: (c: Cidade) => void;
};

function conteudo(linhas: string[]): HTMLElement {
  const div = document.createElement('div');
  linhas.forEach((texto, i) => {
    const linha = document.createElement('div');
    if (i === 0) linha.style.fontWeight = '700';
    linha.textContent = texto;
    div.append(linha);
  });
  return div;
}

const editais = (n: number) => `${numero(n)} ${n === 1 ? 'edital aberto' : 'editais abertos'}`;

export function Mapa({ pontos, porUf, destaque, aoEscolherCidade }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLibre | null>(null);
  const biblioteca = useRef<typeof import('maplibre-gl') | null>(null);
  const pino = useRef<Marker | null>(null);
  const [pronto, setPronto] = useState(false);
  const pontosAtuais = useRef(pontos);
  const porUfAtual = useRef(porUf);
  const escolher = useRef(aoEscolherCidade);

  useEffect(() => {
    escolher.current = aoEscolherCidade;
  }, [aoEscolherCidade]);

  useEffect(() => {
    pontosAtuais.current = pontos;
    if (pronto) (mapa.current?.getSource('editais') as GeoJSONSource | undefined)?.setData(paraGeoJSON(pontos));
  }, [pontos, pronto]);

  useEffect(() => {
    porUfAtual.current = porUf;
    if (pronto) mapa.current?.setPaintProperty('estados', 'fill-color', coresDosEstados(porUf, UFS_COBERTAS) as unknown as ExpressionSpecification);
  }, [porUf, pronto]);

  useEffect(() => {
    const m = mapa.current;
    const lib = biblioteca.current;
    if (!pronto || !m || !lib) return;
    const ponto = destaque ? pontos.find((p) => p.codigo_ibge === destaque) : undefined;
    if (!ponto) {
      pino.current?.remove();
      pino.current = null;
      return;
    }
    if (!pino.current) {
      const el = document.createElement('div');
      el.innerHTML = PINO; // SVG fixo, sem dado de usuário
      pino.current = new lib.Marker({ element: el, anchor: 'bottom' });
    }
    pino.current.setLngLat([ponto.lng, ponto.lat]).addTo(m);
  }, [pronto, destaque, pontos]);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      // maplibre-gl 6 é só ESM: sem export default.
      const maplibregl = await import('maplibre-gl');
      if (cancelado || !caixa.current) return;
      biblioteca.current = maplibregl;
      // O Turbopack reescreve import.meta.url do maplibre-gl e o worker padrão some (URL vazia):
      // aponta o worker para o arquivo do pacote, que o bundler publica como asset estático.
      maplibregl.setWorkerUrl(new URL('../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).href);
      // No celular a gaveta recolhida cobre a base do mapa: reserva esse espaço no enquadramento inicial.
      const celular = window.matchMedia('(max-width: 1023px)').matches;
      const m = new maplibregl.Map({
        container: caixa.current,
        style: {
          version: 8,
          sources: {},
          layers: [{ id: 'fundo', type: 'background', paint: { 'background-color': '#ffffff' } }],
        },
        bounds: BRASIL,
        fitBoundsOptions: { padding: celular ? { top: 16, right: 16, left: 16, bottom: ALTURA_GAVETA_RECOLHIDA + 16 } : 16 },
        attributionControl: false,
        // Textos nativos do MapLibre em português do Brasil.
        locale: { 'Map.Title': 'Mapa de editais', 'NavigationControl.ZoomIn': 'Aproximar', 'NavigationControl.ZoomOut': 'Afastar' },
        // Sem bússola, o usuário não consegue voltar ao norte: nada de rotação nem inclinação.
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });
      m.touchZoomRotate.disableRotation();
      m.keyboard.disableRotation();
      mapa.current = m;
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });

      m.on('load', () => {
        m.addSource('estados', { type: 'geojson', data: '/geo/estados.json' });
        m.addLayer({
          id: 'estados', type: 'fill', source: 'estados',
          paint: { 'fill-color': coresDosEstados(porUfAtual.current, UFS_COBERTAS) as unknown as ExpressionSpecification },
        });
        m.addLayer({ id: 'estados-contorno', type: 'line', source: 'estados', paint: { 'line-color': '#ffffff', 'line-width': 1 } });
        m.addSource('editais', {
          type: 'geojson', data: paraGeoJSON(pontosAtuais.current),
          cluster: true, clusterRadius: 40, clusterMaxZoom: 8,
          clusterProperties: { qtd: ['+', ['get', 'qtd']], valor: ['+', ['get', 'valor']] },
        });
        m.addLayer({
          id: 'grupos', type: 'circle', source: 'editais', filter: ['has', 'point_count'],
          paint: { 'circle-color': '#ff5a1f', 'circle-opacity': 0.9, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5, 'circle-radius': RAIO },
        });
        m.addLayer({
          id: 'cidades', type: 'circle', source: 'editais', filter: ['!', ['has', 'point_count']],
          paint: { 'circle-color': '#ff5a1f', 'circle-opacity': 0.9, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5, 'circle-radius': RAIO },
        });
        setPronto(true);
      });

      m.on('click', 'grupos', async (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const zoom = await (m.getSource('editais') as GeoJSONSource).getClusterExpansionZoom(Number(f.properties?.cluster_id));
        m.easeTo({ center: (f.geometry as Point).coordinates as [number, number], zoom });
      });
      m.on('click', 'cidades', (e) => {
        const p = e.features?.[0]?.properties as PropsPonto | undefined;
        if (p) escolher.current({ ibge: String(p.ibge), nome: p.nome, uf: p.uf });
      });
      // Uma dica só, para o que estiver por cima: cidade, grupo ou estado.
      m.on('mousemove', (e) => {
        const [f] = m.queryRenderedFeatures(e.point, { layers: ['cidades', 'grupos', 'estados'] });
        if (!f) {
          popup.remove();
          m.getCanvas().style.cursor = '';
          return;
        }
        const p = (f.properties ?? {}) as Record<string, unknown>;
        const valor = moedaCurta(Number(p.valor ?? 0));
        let linhas: string[];
        if (f.layer.id === 'cidades') linhas = [`${p.nome}/${p.uf}`, editais(Number(p.qtd)), ...(valor ? [valor] : [])];
        else if (f.layer.id === 'grupos') linhas = [editais(Number(p.qtd)), ...(valor ? [valor] : []), 'Aproxime para ver as cidades'];
        else {
          const uf = String(p.uf);
          linhas = (UFS_COBERTAS as readonly string[]).includes(uf) ? [uf, editais(porUfAtual.current[uf] ?? 0)] : [uf, 'Em breve'];
        }
        m.getCanvas().style.cursor = f.layer.id === 'estados' ? '' : 'pointer';
        popup.setLngLat(e.lngLat).setDOMContent(conteudo(linhas)).addTo(m);
      });
      m.on('mouseout', () => popup.remove());
    })();
    return () => {
      cancelado = true;
      pino.current?.remove();
      pino.current = null;
      setPronto(false);
      mapa.current?.remove();
      mapa.current = null;
    };
  }, []);

  // O MapLibre põe `position: relative` (CSS sem camada) no contêiner do mapa e vencia o `absolute` do Tailwind:
  // o mapa fica num filho que só preenche o pai.
  return (
    <div className="absolute inset-0" role="region" aria-label="Mapa de editais abertos por município">
      <div ref={caixa} className="h-full w-full" />
    </div>
  );
}
```

- [ ] **Step 2: Ajustar a chamada no Explorador atual**

Em `components/Explorador.tsx` (o atual; a Task 10 o reescreve), acrescente o import `import { resumirPontos } from '@/lib/painel';`, inclua `useMemo` no import do React, crie logo depois do `useState` de `pontos`:
```tsx
  const painel = useMemo(() => resumirPontos(pontos), [pontos]);
```
e troque `<Mapa pontos={pontos} aoEscolherCidade={escolherCidade} />` por:
```tsx
          <Mapa pontos={pontos} porUf={painel.porUf} destaque={null} aoEscolherCidade={escolherCidade} />
```

- [ ] **Step 3: Tirar os pontos cinza dos municípios (não usados no desenho novo)**

```bash
git rm public/geo/municipios.json scripts/gerar-municipios-geojson.ts
```
e remova a linha `"gerar:municipios": …` de `package.json`.

- [ ] **Step 4: Verificar**

Run: `npm run typecheck && npm test && npm run build`
Expected: limpos.

Verificação visual rápida (Edge invisível como nas tasks anteriores: PowerShell `Start-Process "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe" -ArgumentList '--headless=new','--remote-debugging-port=9333',"--user-data-dir=$env:TEMP\edge-capturas-v8",'--use-angle=swiftshader','--enable-unsafe-swiftshader','--window-size=1440,1000','about:blank' -WindowStyle Hidden`; produção local `npm run build && npx next start -p 3000`; `node scripts/capturas.mjs http://localhost:3000`). Olhe `.capturas/inicio-computador.png`: Brasil inteiro, SC/PR/RS em azul, outros estados em cinza areia, círculos laranja no Sul. Encerre o Edge desse perfil e o servidor.

- [ ] **Step 5: Commit**

```bash
git add components/Mapa.tsx components/Explorador.tsx package.json
git commit -m "feat: mapa do Brasil com estados coloridos pela busca, círculos por valor e pino" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 9: Peças da página inicial (`components/inicio/*`)

**Files:**
- Create: `components/inicio/estilos.ts`, `components/inicio/Icones.tsx`, `components/inicio/Popover.tsx`, `components/inicio/BuscaPrincipal.tsx`, `components/inicio/Chips.tsx`, `components/inicio/CardCompacto.tsx`, `components/inicio/ColunaLista.tsx`, `components/inicio/CartaoSelecionado.tsx`, `components/inicio/OndeMaisCompram.tsx`, `components/inicio/LegendaMapa.tsx`

**Interfaces:**
- Consumes: Tasks 3, 4, 5, 7.
- Produces (usados pela Task 10):
  - `<BuscaPrincipal q uf carregando aoBuscar={(q: string, uf: string) => void} />`
  - `<Chips filtros={FiltrosTela} pontos={PontoMapa[]} atualizadoEm={string | null} agora={Date} aoMudar={(f: FiltrosTela) => void} />`
  - `<ColunaLista resultado agora painel seteDias selecionadoId carregandoLista carregandoMais erro recolhida aoSelecionar={(e: EditalResumo) => void} aoMudarPrazo={(seteDias: boolean) => void} aoCarregarMais={() => void} />`
  - `<CartaoSelecionado edital={EditalResumo} agora={Date} aoFechar?={() => void} />`
  - `<OndeMaisCompram municipios={MunicipioPainel[]} termo={string} aoEscolher={(c: Cidade) => void} />`
  - `<LegendaMapa />`

- [ ] **Step 1: Estilos e ícones**

`components/inicio/estilos.ts`:
```ts
import type { TomEtiqueta } from '@/lib/formato';

/** Chip de filtro; ativo em azul-marinho como no mockup. */
export function chip(ativo: boolean): string {
  return `inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-semibold ${
    ativo ? 'border-ink bg-ink text-surface' : 'border-line-strong bg-raised text-ink hover:bg-sunken'
  }`;
}

export const ESTILO_ETIQUETA: Record<TomEtiqueta, string> = {
  urgente: 'bg-pin-soft text-pin-strong',
  proximo: 'bg-ouro-soft text-ouro-strong',
  novo: 'bg-rio-soft text-rio',
  aberto: 'bg-mata-soft text-mata',
};

export const PONTO_ETIQUETA: Record<TomEtiqueta, string> = {
  urgente: 'bg-pin',
  proximo: 'bg-ouro',
  novo: 'bg-rio',
  aberto: 'bg-mata',
};
```

`components/inicio/Icones.tsx`:
```tsx
type P = { className?: string };

export function Lupa({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function PinoMini({ className }: P) {
  return (
    <svg viewBox="0 0 22 28" className={className} aria-hidden="true">
      <path d="M11 0C4.9 0 0 4.9 0 11c0 8.3 11 17 11 17s11-8.7 11-17C22 4.9 17.1 0 11 0z" fill="#ff5a1f" />
      <circle cx="11" cy="11" r="3.5" fill="#f4f1e8" />
    </svg>
  );
}

export function Seta({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function Cadeado({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
```

- [ ] **Step 2: Popover (para o chip de modalidade)**

`components/inicio/Popover.tsx`:
```tsx
'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Seta } from './Icones';
import { chip } from './estilos';

/** Chip que abre um painel. O painel é `fixed` para não ser cortado pela linha de chips que rola de lado no celular. */
export function Popover({ rotulo, ativo, children }: { rotulo: ReactNode; ativo: boolean; children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState({ top: 0, left: 0 });
  const botao = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!aberto) return;
    const clique = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (!painel.current?.contains(alvo) && !botao.current?.contains(alvo)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false);
    };
    const fechar = () => setAberto(false);
    document.addEventListener('mousedown', clique);
    document.addEventListener('keydown', tecla);
    window.addEventListener('resize', fechar);
    return () => {
      document.removeEventListener('mousedown', clique);
      document.removeEventListener('keydown', tecla);
      window.removeEventListener('resize', fechar);
    };
  }, [aberto]);

  function alternar() {
    const r = botao.current?.getBoundingClientRect();
    if (r) setPosicao({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - 272)) });
    setAberto((a) => !a);
  }

  return (
    <>
      <button ref={botao} type="button" aria-expanded={aberto} aria-controls={id} onClick={alternar} className={chip(ativo)}>
        {rotulo}
        <Seta className="size-3.5" />
      </button>
      {aberto ? (
        <div
          ref={painel}
          id={id}
          role="dialog"
          style={{ position: 'fixed', top: posicao.top, left: posicao.left }}
          className="z-40 w-64 rounded-md border border-line bg-raised p-3 shadow-[0_8px_24px_rgba(12,35,64,.14)]"
        >
          {children}
        </div>
      ) : null}
    </>
  );
}
```

- [ ] **Step 3: Busca**

`components/inicio/BuscaPrincipal.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { UFS_BRASIL } from '@/lib/eventos';
import { UFS_COBERTAS } from '@/lib/filtros';
import { Lupa, PinoMini, Seta } from './Icones';

type Props = { q: string; uf: string; carregando: boolean; aoBuscar: (q: string, uf: string) => void };

const EM_BREVE = UFS_BRASIL.filter((u) => !(UFS_COBERTAS as readonly string[]).includes(u)).sort();

/** "O que sua empresa vende?" + local ("Todo o Brasil" ou UF) + "Buscar no mapa". No computador é uma barra só. */
export function BuscaPrincipal({ q, uf, carregando, aoBuscar }: Props) {
  const [texto, setTexto] = useState(q);
  const [local, setLocal] = useState(uf);
  useEffect(() => setLocal(uf), [uf]);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        aoBuscar(texto, local);
      }}
      className="flex flex-col gap-2"
    >
      <label htmlFor="q" className="sr-only text-[13px] font-semibold lg:not-sr-only">
        O que sua empresa vende?
      </label>
      <div className="flex flex-wrap gap-2 lg:flex-nowrap lg:items-center lg:gap-0 lg:rounded-md lg:border lg:border-line-strong lg:bg-raised lg:p-1.5">
        <div className="relative flex min-w-0 basis-full items-center lg:basis-auto lg:flex-1">
          <Lupa className="pointer-events-none absolute left-3 size-[18px] text-ink-muted" />
          <input
            id="q"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="O que sua empresa vende? Ex.: EPI e uniformes"
            autoComplete="off"
            maxLength={100}
            className="h-11 w-full rounded-sm border border-line-strong bg-raised pl-10 pr-3 lg:border-0 lg:bg-transparent"
          />
        </div>
        <label className="relative flex h-11 min-w-0 flex-1 items-center rounded-sm border border-line-strong bg-raised lg:flex-none lg:rounded-none lg:border-0 lg:border-l lg:border-line">
          <span className="sr-only">Onde</span>
          <PinoMini className="pointer-events-none absolute left-3 h-4 w-3" />
          <select
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="h-full w-full appearance-none bg-transparent pl-9 pr-8 text-sm font-semibold lg:w-auto"
          >
            <option value="">Todo o Brasil</option>
            {UFS_COBERTAS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
            <optgroup label="Em breve">
              {EM_BREVE.map((u) => (
                <option key={u} value={u} disabled>
                  {u} · em breve
                </option>
              ))}
            </optgroup>
          </select>
          <Seta className="pointer-events-none absolute right-2.5 size-4 text-ink-muted" />
        </label>
        <button
          type="submit"
          disabled={carregando}
          className="h-11 shrink-0 rounded-sm bg-pin px-5 text-sm font-semibold text-on-pin disabled:opacity-60 lg:ml-1.5"
        >
          {carregando ? 'Buscando…' : 'Buscar no mapa'}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Chips**

`components/inicio/Chips.tsx`:
```tsx
'use client';

import { BotaoEmBreve } from '@/components/BotaoEmBreve';
import { MODALIDADES, UFS_COBERTAS, VALORES_MINIMOS } from '@/lib/filtros';
import { haQuanto, moedaCurta, numero } from '@/lib/formato';
import type { FiltrosTela, PontoMapa } from '@/lib/tipos';
import { Cadeado, Seta } from './Icones';
import { Popover } from './Popover';
import { chip } from './estilos';

type Props = { filtros: FiltrosTela; pontos: PontoMapa[]; atualizadoEm: string | null; agora: Date; aoMudar: (f: FiltrosTela) => void };

/** Chip com um select nativo por baixo (acessível e leve até com mil municípios). */
function ChipSelect({ rotulo, ativo, valor, aoMudar, children }: { rotulo: string; ativo: boolean; valor: string; aoMudar: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className={`${chip(ativo)} relative pr-8`}>
      <span>{rotulo}:</span>
      <select value={valor} onChange={(e) => aoMudar(e.target.value)} className="max-w-[11rem] appearance-none truncate bg-transparent font-semibold">
        {children}
      </select>
      <Seta className="pointer-events-none absolute right-3 size-3.5" />
    </label>
  );
}

export function Chips({ filtros, pontos, atualizadoEm, agora, aoMudar }: Props) {
  const municipios = [...pontos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const qtdModalidades = filtros.modalidades.length;
  return (
    <div className="flex items-center gap-3">
      <div className="-mx-4 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
        <ChipSelect rotulo="UF" ativo={Boolean(filtros.uf)} valor={filtros.uf} aoMudar={(uf) => aoMudar({ ...filtros, uf, cidade: null })}>
          <option value="">todas</option>
          {UFS_COBERTAS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </ChipSelect>
        <ChipSelect
          rotulo="Município"
          ativo={Boolean(filtros.cidade)}
          valor={filtros.cidade?.ibge ?? ''}
          aoMudar={(ibge) => {
            const p = pontos.find((x) => x.codigo_ibge === ibge);
            aoMudar({ ...filtros, cidade: p ? { ibge: p.codigo_ibge, nome: p.nome, uf: p.uf } : null });
          }}
        >
          <option value="">todos</option>
          {filtros.cidade && !pontos.some((p) => p.codigo_ibge === filtros.cidade?.ibge) ? (
            <option value={filtros.cidade.ibge}>
              {filtros.cidade.nome}/{filtros.cidade.uf}
            </option>
          ) : null}
          {municipios.map((p) => (
            <option key={p.codigo_ibge} value={p.codigo_ibge}>
              {p.nome}/{p.uf} ({numero(p.qtd)})
            </option>
          ))}
        </ChipSelect>
        <ChipSelect
          rotulo="Valor"
          ativo={filtros.valorMin !== null}
          valor={filtros.valorMin ? String(filtros.valorMin) : ''}
          aoMudar={(v) => aoMudar({ ...filtros, valorMin: v ? Number(v) : null })}
        >
          <option value="">qualquer</option>
          {VALORES_MINIMOS.map((v) => (
            <option key={v} value={v}>
              acima de {moedaCurta(v)}
            </option>
          ))}
        </ChipSelect>
        <Popover ativo={qtdModalidades > 0} rotulo={qtdModalidades ? `Modalidade · ${qtdModalidades}` : 'Modalidade'}>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-semibold text-ink-muted">Modalidade</legend>
            {MODALIDADES.map((m) => {
              const marcada = filtros.modalidades.includes(m.id);
              return (
                <label key={m.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={marcada}
                    onChange={() =>
                      aoMudar({
                        ...filtros,
                        modalidades: marcada ? filtros.modalidades.filter((id) => id !== m.id) : [...filtros.modalidades, m.id],
                      })
                    }
                    className="size-4 accent-mata"
                  />
                  {m.nome}
                </label>
              );
            })}
          </fieldset>
        </Popover>
        <BotaoEmBreve recurso="filtros_pro" className={`${chip(false)} text-ink-muted`}>
          <Cadeado className="size-3.5" />
          Raio, órgão e recorrência · Pro
        </BotaoEmBreve>
      </div>
      <p className="hidden shrink-0 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted xl:block">
        Fonte: PNCP{atualizadoEm ? ` · atualizado ${haQuanto(atualizadoEm, agora)}` : ''}
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Card compacto e coluna da lista**

`components/inicio/CardCompacto.tsx`:
```tsx
import { etiqueta, moedaCurta } from '@/lib/formato';
import { limparEspacos, nomeProprio, semGritos, tituloCurto } from '@/lib/texto';
import type { EditalResumo } from '@/lib/tipos';
import { ESTILO_ETIQUETA, PONTO_ETIQUETA } from './estilos';

type Props = { edital: EditalResumo; agora: Date; selecionado: boolean; aoSelecionar: () => void };

/** Card da lista: título limpo, valor curto à direita, órgão · UF e etiqueta de prazo. Clicar seleciona. */
export function CardCompacto({ edital, agora, selecionado, aoSelecionar }: Props) {
  const et = etiqueta(edital, agora);
  const valor = moedaCurta(edital.valor_estimado);
  return (
    <button
      type="button"
      onClick={aoSelecionar}
      aria-pressed={selecionado}
      className={`flex w-full shrink-0 flex-col gap-2 rounded-md border bg-raised p-3.5 text-left transition-colors ${
        selecionado ? 'border-ink shadow-[0_0_0_1px_#0c2340]' : 'border-line hover:border-line-strong'
      }`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="line-clamp-3 text-[14px] font-semibold leading-5">{tituloCurto(edital.objeto).titulo}</span>
        {valor ? (
          <span className="shrink-0 whitespace-nowrap font-mono text-[13px] font-medium">{valor}</span>
        ) : (
          <span className="w-16 shrink-0 text-right text-[11px] leading-4 text-ink-muted">Valor não informado</span>
        )}
      </span>
      <span className="truncate text-xs text-ink-muted">
        {nomeProprio(edital.orgao_nome)} · {edital.uf}
      </span>
      {edital.onde === 'itens' && edital.item_trecho ? (
        <span className="truncate text-xs text-rio">Encontrado nos itens: {semGritos(limparEspacos(edital.item_trecho))}</span>
      ) : null}
      <span className={`inline-flex w-fit items-center gap-1.5 rounded-xs px-2 py-0.5 text-xs font-semibold ${ESTILO_ETIQUETA[et.tom]}`}>
        <span className={`size-[7px] rounded-full ${PONTO_ETIQUETA[et.tom]}`} aria-hidden="true" />
        {et.texto}
      </span>
    </button>
  );
}
```

`components/inicio/ColunaLista.tsx`:
```tsx
'use client';

import { useEffect, useRef } from 'react';
import { moedaCurta, numero } from '@/lib/formato';
import type { Painel } from '@/lib/painel';
import type { EditalResumo, ResultadoBusca } from '@/lib/tipos';
import { CardCompacto } from './CardCompacto';

type Props = {
  resultado: ResultadoBusca;
  agora: Date;
  painel: Painel;
  seteDias: boolean;
  selecionadoId: string | null;
  carregandoLista: boolean;
  carregandoMais: boolean;
  erro: string | null;
  /** No celular, com a gaveta recolhida só a contagem e o alternador aparecem. */
  recolhida: boolean;
  aoSelecionar: (e: EditalResumo) => void;
  aoMudarPrazo: (seteDias: boolean) => void;
  aoCarregarMais: () => void;
};

const ALTERNADOR = 'h-8 flex-1 rounded-sm text-[13px] font-semibold transition-colors';

export function ColunaLista(p: Props) {
  const { total, editais } = p.resultado;
  const lista = useRef<HTMLDivElement>(null);
  const primeiro = editais[0]?.id;
  // Resultado novo (não "carregar mais"): volta ao topo da lista.
  useEffect(() => {
    lista.current?.scrollTo({ top: 0 });
  }, [primeiro]);

  const valor = moedaCurta(p.painel.valorTotal);
  return (
    <>
      <div className="shrink-0">
        <p aria-live="polite" className="flex items-baseline gap-2">
          <span className="font-mono text-[26px] font-semibold leading-none tracking-[-0.02em] lg:text-[34px]">
            {p.carregandoLista && editais.length === 0 ? '…' : numero(total)}
          </span>
          <span className="text-[15px] font-bold">{total === 1 ? 'edital aberto' : 'editais abertos'}</span>
        </p>
        <p className="mt-1 font-mono text-xs text-ink-muted">
          {p.painel.ufs} {p.painel.ufs === 1 ? 'UF' : 'UFs'} · {valor ?? 'R$ 0'} em valor estimado
        </p>
        <div className="mt-3 flex gap-1 rounded-md bg-sunken p-1" role="group" aria-label="Prazo">
          <button
            type="button"
            aria-pressed={!p.seteDias}
            onClick={() => p.aoMudarPrazo(false)}
            className={`${ALTERNADOR} ${!p.seteDias ? 'bg-raised shadow-sm' : 'text-ink-muted'}`}
          >
            Todos abertos
          </button>
          <button
            type="button"
            aria-pressed={p.seteDias}
            onClick={() => p.aoMudarPrazo(true)}
            className={`${ALTERNADOR} ${p.seteDias ? 'bg-raised shadow-sm' : 'text-ink-muted'}`}
          >
            Encerram em 7 dias
          </button>
        </div>
      </div>
      <div className={`mt-3 flex min-h-0 flex-1 flex-col ${p.recolhida ? 'max-lg:hidden' : ''}`}>
        {p.erro ? <p role="alert" className="mb-3 shrink-0 rounded-sm bg-pin-soft px-3 py-2 text-sm text-pin-strong">{p.erro}</p> : null}
        <div
          ref={lista}
          aria-busy={p.carregandoLista}
          className={`flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1 transition-opacity ${p.carregandoLista ? 'opacity-60' : ''}`}
        >
          {editais.length === 0 && !p.carregandoLista && !p.erro ? (
            <p className="px-2 py-6 text-ink-muted">Nenhum edital aberto para essa busca. Tente outro termo ou tire um filtro.</p>
          ) : null}
          {editais.map((e) => (
            <CardCompacto key={e.id} edital={e} agora={p.agora} selecionado={e.id === p.selecionadoId} aoSelecionar={() => p.aoSelecionar(e)} />
          ))}
          {editais.length < total ? (
            <button
              type="button"
              onClick={p.aoCarregarMais}
              disabled={p.carregandoMais || p.carregandoLista}
              className="h-11 shrink-0 rounded-sm border border-line-strong bg-raised text-sm font-semibold disabled:opacity-60"
            >
              {p.carregandoMais ? 'Carregando…' : 'Carregar mais'}
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 6: Cartão escuro, onde mais compram e legenda**

`components/inicio/CartaoSelecionado.tsx`:
```tsx
import Link from 'next/link';
import { diaMes, hora, moeda, prazo } from '@/lib/formato';
import { modalidadeCurta } from '@/lib/participacao';
import { nomeProprio, tituloCurto } from '@/lib/texto';
import type { EditalResumo } from '@/lib/tipos';
import { PinoMini } from './Icones';

const ROTULO = 'font-mono text-[10px] uppercase tracking-[0.08em] text-[#a9c9c4]';

/** Resumo escuro do edital selecionado, com "Ver edital". */
export function CartaoSelecionado({ edital: e, agora, aoFechar }: { edital: EditalResumo; agora: Date; aoFechar?: () => void }) {
  const p = prazo(e.encerramento_em, agora);
  const orgao = [nomeProprio(e.orgao_nome), e.unidade_nome ? nomeProprio(e.unidade_nome) : null].filter(Boolean).join(' · ');
  const forma = [modalidadeCurta(e.modalidade_nome), e.srp ? 'Registro de preços' : null].filter(Boolean).join(' · ');
  return (
    <article className="relative flex flex-col gap-3 rounded-lg bg-ink p-5 text-surface">
      {aoFechar ? (
        <button type="button" onClick={aoFechar} aria-label="Fechar resumo" className="absolute right-3 top-3 size-8 rounded-sm text-lg hover:bg-white/10">
          ×
        </button>
      ) : null}
      <p className={`flex items-center gap-2 ${ROTULO}`}>
        <PinoMini className="h-3.5 w-2.5" />
        {e.municipio_nome ?? '—'} · {e.uf}
      </p>
      <h2 className="pr-6 text-[17px] font-bold leading-snug">{tituloCurto(e.objeto).titulo}</h2>
      <p className="text-[13px] text-[#c7d6d3]">{orgao}</p>
      <div className="grid grid-cols-2 gap-3 border-t border-white/15 pt-3">
        <div>
          <p className={ROTULO}>Valor estimado</p>
          <p className="font-mono text-[14px] font-medium">{moeda(e.valor_estimado) ?? 'Valor não informado'}</p>
        </div>
        <div>
          <p className={ROTULO}>Propostas até</p>
          <p className="font-mono text-[14px] font-medium">
            {diaMes(e.encerramento_em)} · {hora(e.encerramento_em)}
          </p>
          <p className="text-[11px] text-[#c7d6d3]">{p.texto}</p>
        </div>
      </div>
      {forma ? <p className="text-[13px] text-[#c7d6d3]">{forma}</p> : null}
      <Link href={`/edital/${e.slug}`} className="mt-1 inline-flex h-11 items-center justify-center rounded-sm bg-pin text-sm font-semibold text-on-pin">
        Ver edital
      </Link>
    </article>
  );
}
```

`components/inicio/OndeMaisCompram.tsx`:
```tsx
import { numero } from '@/lib/formato';
import type { MunicipioPainel } from '@/lib/painel';
import type { Cidade } from '@/lib/tipos';

/** Barras dos municípios com mais editais na busca atual; clicar filtra a lista. */
export function OndeMaisCompram({ municipios, termo, aoEscolher }: { municipios: MunicipioPainel[]; termo: string; aoEscolher: (c: Cidade) => void }) {
  const maximo = Math.max(1, ...municipios.map((m) => m.qtd));
  return (
    <section className="rounded-lg border border-line bg-raised p-4">
      <h2 className="text-[15px] font-bold">Onde mais compram</h2>
      {municipios.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">Sem editais para essa busca.</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-2">
          {municipios.map((m) => (
            <li key={m.ibge}>
              <button
                type="button"
                onClick={() => aoEscolher({ ibge: m.ibge, nome: m.nome, uf: m.uf })}
                className="grid w-full grid-cols-[6.5rem_1fr_auto] items-center gap-2 text-left text-xs hover:opacity-80"
              >
                <span className="truncate font-semibold">
                  {m.nome}/{m.uf}
                </span>
                <span className="h-2 rounded-full bg-sunken">
                  <span className="block h-2 rounded-full bg-ink" style={{ width: `${Math.round((m.qtd / maximo) * 100)}%` }} />
                </span>
                <span className="font-mono">{numero(m.qtd)}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-xs text-ink-muted">{termo.trim() ? `${termo.trim()} · abertos agora` : 'Todos os editais · abertos agora'}</p>
    </section>
  );
}
```

`components/inicio/LegendaMapa.tsx`:
```tsx
import { COR_SEM_COBERTURA, CORES_FAIXA } from '@/lib/painel';

export function LegendaMapa() {
  return (
    <section className="rounded-lg border border-line bg-raised p-4">
      <h2 className="text-[15px] font-bold">Como ler o mapa</h2>
      <div className="mt-3 flex gap-1" aria-hidden="true">
        {CORES_FAIXA.slice(1).map((cor) => (
          <span key={cor} className="h-2.5 flex-1 rounded-xs" style={{ background: cor }} />
        ))}
      </div>
      <p className="mt-1 flex justify-between font-mono text-[11px] text-ink-muted">
        <span>menos abertos</span>
        <span>200+ por UF</span>
      </p>
      <p className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
        <span className="size-2.5 rounded-full bg-pin" aria-hidden="true" />
        Tamanho = valor estimado
      </p>
      <p className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
        <span className="size-2.5 rounded-xs" style={{ background: COR_SEM_COBERTURA }} aria-hidden="true" />
        Estados em cinza: em breve
      </p>
      <p className="mt-2 text-xs text-ink-muted">O ponto é a sede do órgão, não o local de entrega.</p>
    </section>
  );
}
```

- [ ] **Step 7: Verificar e commit**

Run: `npm run typecheck && npm test && npm run build`
Expected: limpos (as peças ainda não são usadas; a Task 10 as liga).

```bash
git add components/inicio
git commit -m "feat: peças da nova página inicial (busca, chips, lista compacta, cartão escuro, painéis)" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 10: Página inicial em três colunas

**Files:**
- Modify: `components/Explorador.tsx` (reescrito), `components/GavetaCelular.tsx`, `app/page.tsx`
- Delete: `components/Busca.tsx`, `components/Lista.tsx`, `components/CardEdital.tsx`

**Interfaces:**
- Consumes: Tasks 4, 5, 8, 9.
- Produces: `<Explorador inicial={ResultadoBusca} agoraInicial={string} atualizadoEm={string | null} />`; `ALTURA_GAVETA_RECOLHIDA` (valor medido).

- [ ] **Step 1: Gaveta no breakpoint `lg`**

`components/GavetaCelular.tsx` (substitui o atual):
```tsx
'use client';

import type { CSSProperties, ReactNode } from 'react';

/** Altura da gaveta recolhida no celular: a alça ("Ver lista"), a contagem e o alternador de prazo. */
export const ALTURA_GAVETA_RECOLHIDA = 168;

type Props = { aberta: boolean; aoAlternar: () => void; children: ReactNode };

/** Celular: painel fixo embaixo que abre e fecha. A partir de `lg`: coluna normal da grade. */
export function GavetaCelular({ aberta, aoAlternar, children }: Props) {
  return (
    <section
      aria-label="Lista de editais"
      style={{ '--altura-recolhida': `${ALTURA_GAVETA_RECOLHIDA}px` } as CSSProperties}
      className={`fixed inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-[20px] bg-raised shadow-[0_-6px_24px_rgba(12,35,64,.12)] transition-[height] lg:static lg:z-auto lg:h-auto lg:min-h-0 lg:rounded-none lg:bg-transparent lg:shadow-none ${
        aberta ? 'h-[85dvh]' : 'h-[var(--altura-recolhida)]'
      }`}
    >
      <button type="button" onClick={aoAlternar} aria-expanded={aberta} className="flex shrink-0 flex-col items-center gap-2 px-4 pb-2 pt-2 lg:hidden">
        <span className="h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
        <span className="text-sm font-semibold">{aberta ? 'Ver mapa' : 'Ver lista'}</span>
      </button>
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 lg:px-0 lg:pb-0">{children}</div>
    </section>
  );
}
```

- [ ] **Step 2: Explorador**

`components/Explorador.tsx` (substitui o atual):
```tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { registrar } from '@/lib/cliente/registrar';
import { paraParametros } from '@/lib/filtros';
import { resumirPontos } from '@/lib/painel';
import type { Cidade, EditalResumo, FiltrosTela, PontoMapa, ResultadoBusca } from '@/lib/tipos';
import { GavetaCelular } from './GavetaCelular';
import { Mapa } from './Mapa';
import { BuscaPrincipal } from './inicio/BuscaPrincipal';
import { CartaoSelecionado } from './inicio/CartaoSelecionado';
import { Chips } from './inicio/Chips';
import { ColunaLista } from './inicio/ColunaLista';
import { LegendaMapa } from './inicio/LegendaMapa';
import { OndeMaisCompram } from './inicio/OndeMaisCompram';

const VAZIO: FiltrosTela = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false };
const ERRO_LISTA = 'Não foi possível buscar agora. Confira a conexão e tente de novo.';
const ERRO_MAPA = 'Não foi possível carregar o mapa agora.';
const TEMPO_LIMITE_MS = 20_000;

/** Busca JSON da API. O erro lançado sempre traz texto em português: o da API, quando houver, ou o `padrao`. */
async function obter<T>(url: string, padrao: string): Promise<T> {
  let resposta: Response;
  try {
    // Sem prazo, uma busca travada deixaria o botão "Buscando…" desabilitado para sempre.
    const signal = typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(TEMPO_LIMITE_MS) : undefined;
    resposta = await fetch(url, { signal });
  } catch {
    throw new Error(padrao);
  }
  let corpo: unknown = null;
  try {
    corpo = await resposta.json();
  } catch {
    // página de erro que não é JSON (502 do servidor, por exemplo)
  }
  if (!resposta.ok) {
    const erro = typeof corpo === 'object' && corpo !== null ? (corpo as { erro?: unknown }).erro : null;
    throw new Error(typeof erro === 'string' && erro.trim() ? erro : padrao);
  }
  if (corpo === null) throw new Error(padrao);
  return corpo as T;
}

const mensagem = (e: unknown, padrao: string) => (e instanceof Error && e.message ? e.message : padrao);

type Props = { inicial: ResultadoBusca; agoraInicial: string; atualizadoEm: string | null };

export function Explorador({ inicial, agoraInicial, atualizadoEm }: Props) {
  const [filtros, setFiltros] = useState<FiltrosTela>(VAZIO);
  const [resultado, setResultado] = useState<ResultadoBusca>(inicial);
  const [agora, setAgora] = useState(() => new Date(agoraInicial));
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [erroMapa, setErroMapa] = useState<string | null>(null);
  const [pontos, setPontos] = useState<PontoMapa[]>([]);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(inicial.editais[0]?.id ?? null);
  const [resumoNoCelular, setResumoNoCelular] = useState(false);
  const [gavetaAberta, setGavetaAberta] = useState(false);
  // Numeração dos pedidos: só a resposta do pedido mais recente pode mudar a tela.
  const pedidoLista = useRef(0);
  const pedidoMapa = useRef(0);

  const painel = useMemo(() => resumirPontos(pontos), [pontos]);
  const selecionado = resultado.editais.find((e) => e.id === selecionadoId) ?? resultado.editais[0] ?? null;

  const carregarLista = useCallback(async (f: FiltrosTela) => {
    const id = ++pedidoLista.current;
    setCarregandoLista(true);
    setCarregandoMais(false);
    try {
      const novo = await obter<ResultadoBusca>(`/api/busca?${paraParametros(f)}`, ERRO_LISTA);
      if (id !== pedidoLista.current) return;
      setResultado(novo);
      setSelecionadoId(novo.editais[0]?.id ?? null);
      setAgora(new Date());
      setErroLista(null);
    } catch (e) {
      if (id !== pedidoLista.current) return;
      setErroLista(mensagem(e, ERRO_LISTA));
      // No celular a gaveta recolhida não tem lugar para o aviso: abre para ele aparecer.
      setGavetaAberta(true);
    } finally {
      if (id === pedidoLista.current) setCarregandoLista(false);
    }
  }, []);

  const carregarMapa = useCallback(async (f: FiltrosTela) => {
    const id = ++pedidoMapa.current;
    try {
      const novos = await obter<PontoMapa[]>(`/api/mapa?${paraParametros(f, { comCidade: false })}`, ERRO_MAPA);
      if (id !== pedidoMapa.current) return;
      setPontos(novos);
      setErroMapa(null);
    } catch (e) {
      if (id !== pedidoMapa.current) return;
      setErroMapa(mensagem(e, ERRO_MAPA));
    }
  }, []);

  useEffect(() => {
    void carregarMapa(VAZIO);
  }, [carregarMapa]);

  /** Aplica filtros novos: a lista sempre; o mapa só quando muda algo além da cidade. Toda mudança conta como busca. */
  function aplicar(novo: FiltrosTela) {
    const mudouMapa =
      novo.q !== filtros.q ||
      novo.uf !== filtros.uf ||
      novo.valorMin !== filtros.valorMin ||
      novo.seteDias !== filtros.seteDias ||
      [...novo.modalidades].sort().join() !== [...filtros.modalidades].sort().join();
    setFiltros(novo);
    registrar('busca', { q: novo.q.trim() || null, uf: novo.uf || null, dias: novo.seteDias ? 7 : null });
    void carregarLista(novo);
    if (mudouMapa) void carregarMapa(novo);
  }

  // O Mapa guarda o callback numa ref atualizada a cada render: uma função comum basta.
  function escolherCidade(c: Cidade) {
    setGavetaAberta(true);
    aplicar({ ...filtros, cidade: c });
  }

  function selecionar(e: EditalResumo) {
    setSelecionadoId(e.id);
    setResumoNoCelular(true);
  }

  async function carregarMais() {
    if (carregandoMais || carregandoLista) return;
    const id = pedidoLista.current;
    setCarregandoMais(true);
    try {
      const mais = await obter<ResultadoBusca>(`/api/busca?${paraParametros(filtros, { deslocamento: resultado.editais.length })}`, ERRO_LISTA);
      // Busca ou filtro mudou enquanto esperava: essa página não pertence mais à lista na tela.
      if (id !== pedidoLista.current) return;
      setResultado((anterior) => {
        const ids = new Set(anterior.editais.map((e) => e.id));
        return { total: mais.total, editais: [...anterior.editais, ...mais.editais.filter((e) => !ids.has(e.id))] };
      });
      setErroLista(null);
    } catch (e) {
      if (id !== pedidoLista.current) return;
      setErroLista(mensagem(e, ERRO_LISTA));
    } finally {
      if (id === pedidoLista.current) setCarregandoMais(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-3 px-4 pt-3 lg:px-6 lg:pt-5">
        <BuscaPrincipal q={filtros.q} uf={filtros.uf} carregando={carregandoLista} aoBuscar={(q, uf) => aplicar({ ...filtros, q, uf, cidade: null })} />
        <Chips filtros={filtros} pontos={pontos} atualizadoEm={atualizadoEm} agora={agora} aoMudar={aplicar} />
      </div>
      <main className="flex min-h-0 flex-1 flex-col pt-3 lg:grid lg:grid-cols-[360px_minmax(0,1fr)_300px] lg:grid-rows-[minmax(0,1fr)] lg:gap-5 lg:px-6 lg:pb-6 lg:pt-4">
        <h1 className="sr-only">Editais abertos no mapa</h1>
        <GavetaCelular aberta={gavetaAberta} aoAlternar={() => setGavetaAberta((a) => !a)}>
          {resumoNoCelular && selecionado ? (
            <div className="mb-3 shrink-0 lg:hidden">
              <CartaoSelecionado edital={selecionado} agora={agora} aoFechar={() => setResumoNoCelular(false)} />
            </div>
          ) : null}
          <ColunaLista
            resultado={resultado}
            agora={agora}
            painel={painel}
            seteDias={filtros.seteDias}
            selecionadoId={selecionado?.id ?? null}
            carregandoLista={carregandoLista}
            carregandoMais={carregandoMais}
            erro={erroLista}
            recolhida={!gavetaAberta}
            aoSelecionar={selecionar}
            aoMudarPrazo={(seteDias) => aplicar({ ...filtros, seteDias })}
            aoCarregarMais={carregarMais}
          />
        </GavetaCelular>
        <section aria-label="Mapa" className="relative min-h-0 flex-1 overflow-hidden bg-raised lg:rounded-lg lg:border lg:border-line">
          <Mapa pontos={pontos} porUf={painel.porUf} destaque={selecionado?.codigo_ibge ?? null} aoEscolherCidade={escolherCidade} />
          {erroMapa ? (
            <p role="alert" className="absolute left-3 top-3 z-10 max-w-[calc(100%-4.5rem)] rounded-sm bg-pin-soft px-3 py-2 text-xs text-pin-strong">
              {erroMapa}
            </p>
          ) : null}
        </section>
        <aside className="hidden min-h-0 flex-col gap-4 overflow-y-auto lg:flex">
          {selecionado ? <CartaoSelecionado edital={selecionado} agora={agora} /> : null}
          <OndeMaisCompram municipios={painel.topMunicipios} termo={filtros.q} aoEscolher={escolherCidade} />
          <LegendaMapa />
        </aside>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Página e limpeza**

`app/page.tsx` (substitui o atual):
```tsx
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { Explorador } from '@/components/Explorador';
import { lerFiltros } from '@/lib/filtros';
import { atualizadoEm, buscarEditais } from '@/lib/servidor/consultas';

export default async function Inicio() {
  await connection();
  const [inicial, atualizado] = await Promise.all([buscarEditais(lerFiltros(new URLSearchParams())), atualizadoEm()]);
  // Uma tela só: as colunas ocupam a altura que sobra e cada uma rola por dentro.
  return (
    <div className="flex h-dvh flex-col">
      <Cabecalho />
      <Explorador inicial={inicial} agoraInicial={new Date().toISOString()} atualizadoEm={atualizado} />
    </div>
  );
}
```

```bash
git rm components/Busca.tsx components/Lista.tsx components/CardEdital.tsx
```

- [ ] **Step 4: Verificar no navegador e medir a gaveta**

Run: `npm run typecheck && npm test && npm run build`

Produção local (`npx next start -p 3000` em segundo plano) e Edge invisível (perfil `edge-capturas-v10`, como na Task 8). Rode `node scripts/capturas.mjs http://localhost:3000` e olhe `.capturas/inicio-computador.png` e `.capturas/inicio-celular.png` contra o mockup `docs/superpowers/specs/assets/2026-10-15-mockup-inicio.png`:
- computador: cabeçalho com abas e Assinar Pro; rótulo e barra de busca com "Todo o Brasil" e "Buscar no mapa"; chips UF/Município/Valor/Modalidade/Pro e "FONTE: PNCP"; contagem grande + "3 UFs · R$ … em valor estimado"; alternador; cards compactos; mapa do Brasil com Sul em azul; cartão escuro; "Onde mais compram"; "Como ler o mapa".
- celular (390×844): sem rolagem da página (`document.documentElement.scrollHeight <= innerHeight`) nem lateral (`scrollWidth <= innerWidth`); gaveta recolhida mostra alça, contagem e alternador inteiros. Meça a altura real desse bloco e ajuste `ALTURA_GAVETA_RECOLHIDA` para o valor medido (o mapa usa o mesmo número no enquadramento).

Com um script avulso de puppeteer-core (em `$TEMP`, com o cookie `em_interno=1` para `http://localhost:3000`), confira em 1440 px: clicar no segundo card troca o cartão escuro; escolher "Valor: acima de R$ 1 mi" muda a contagem; abrir "Modalidade" e marcar "Credenciamento" muda a contagem; clicar em "Assinar Pro" abre o aviso "Em breve". Encerre o Edge do perfil e o servidor.

- [ ] **Step 5: Commit**

```bash
git add components/Explorador.tsx components/GavetaCelular.tsx app/page.tsx
git commit -m "feat: página inicial em três colunas no desenho do mockup" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 11: Página do edital organizada

**Files:**
- Create: `components/edital/PrincipaisInformacoes.tsx`, `components/edital/ItemOrganizado.tsx`, `components/edital/ListaItens.tsx`, `components/edital/TextoRecolhivel.tsx`
- Modify: `app/edital/[slug]/page.tsx`
- Delete: `components/TabelaItens.tsx`

**Interfaces:**
- Consumes: `tituloCurto`, `textoLimpo`, `nomeProprio`, `partirItem`, `lotesDaInfo`, `paragrafos` (Task 3); participação e formato (Task 4); `resumoItens`, `edital`, `itensDoEdital`, tipos (Task 5).
- Produces: rota `/edital/[slug]` reorganizada.

- [ ] **Step 1: Componentes do edital**

`components/edital/PrincipaisInformacoes.tsx`:
```tsx
import type { ReactNode } from 'react';
import { TEXTO_PRAZO } from '@/components/estilosPrazo';
import { diaMes, hora, moeda, prazo } from '@/lib/formato';
import { criterioTexto, esferaNome, modalidadeCurta, oQueCompram, sistemaDaDisputa, textoMeEpp } from '@/lib/participacao';
import { nomeProprio } from '@/lib/texto';
import type { Edital, ResumoItens } from '@/lib/tipos';

function Cartao({ rotulo, destaque, children }: { rotulo: string; destaque?: boolean; children: ReactNode }) {
  return (
    <div className={`flex flex-col gap-1 rounded-md border p-4 ${destaque ? 'border-mata bg-mata-soft' : 'border-line bg-raised'}`}>
      <span className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">{rotulo}</span>
      {children}
    </div>
  );
}

export function PrincipaisInformacoes({ edital: e, resumo, agora }: { edital: Edital; resumo: ResumoItens; agora: Date }) {
  const p = prazo(e.encerramento_em, agora);
  const valor = moeda(e.valor_estimado);
  const forma = [modalidadeCurta(e.modalidade_nome), e.srp ? 'Registro de preços' : null, criterioTexto(resumo.criterios)].filter(Boolean).join(' · ');
  const meEpp = textoMeEpp(resumo);
  const esfera = esferaNome(e.esfera);
  const propostas = e.encerramento_em
    ? `${e.abertura_em ? `Propostas de ${diaMes(e.abertura_em)} até` : 'Propostas até'} ${diaMes(e.encerramento_em)} · ${hora(e.encerramento_em)}`
    : 'Prazo não informado';
  return (
    <section aria-labelledby="principais" className="flex flex-col gap-3">
      <h2 id="principais" className="text-[17px] font-bold">Principais informações</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Cartao rotulo="O que compram">
          <span className="text-[15px] font-semibold">{oQueCompram(resumo)}</span>
        </Cartao>
        <Cartao rotulo="Quanto">
          {valor ? <span className="font-mono text-[20px] font-medium">{valor}</span> : <span className="text-ink-muted">Valor não informado</span>}
        </Cartao>
        <Cartao rotulo="Prazo">
          <span className="font-mono text-[15px] font-medium">{propostas}</span>
          <span className={`text-[13px] ${TEXTO_PRAZO[p.tom]}`}>{p.texto}</span>
        </Cartao>
        <Cartao rotulo="Como participar">
          {forma ? <span className="text-[15px] font-semibold">{forma}</span> : null}
          <span className="text-[13px] text-ink-muted">Onde: {sistemaDaDisputa(e.link_origem)}</span>
        </Cartao>
        <Cartao rotulo="Quem compra">
          <span className="text-[15px] font-semibold">{nomeProprio(e.orgao_nome)}</span>
          {e.unidade_nome ? <span className="text-[13px] text-ink-muted">{nomeProprio(e.unidade_nome)}</span> : null}
          {esfera ? <span className="text-[13px] text-ink-muted">Esfera {esfera.toLocaleLowerCase('pt-BR')}</span> : null}
        </Cartao>
        {meEpp ? (
          <Cartao rotulo="ME/EPP" destaque={resumo.exclusivos > 0 || resumo.cota > 0}>
            <span className="text-[15px] font-semibold">{meEpp}</span>
          </Cartao>
        ) : null}
      </div>
    </section>
  );
}
```

`components/edital/ItemOrganizado.tsx`:
```tsx
import { moeda, quantidade } from '@/lib/formato';
import { partirItem } from '@/lib/texto';
import type { ItemEdital } from '@/lib/tipos';

const ETIQUETA = 'rounded-xs bg-sunken px-1.5 py-0.5 text-[11px] font-semibold text-ink-muted';
const ETIQUETA_MEEPP = 'rounded-xs bg-mata-soft px-1.5 py-0.5 text-[11px] font-semibold text-mata';

/** Um item: nome em destaque, etiquetas, especificação em lista (recolhida quando é longa) e valores. */
export function ItemOrganizado({ item }: { item: ItemEdital }) {
  const { nome, atributos, obs, etiquetas } = partirItem(item.descricao);
  const exclusivo = item.beneficio_id === 1;
  const cota = item.beneficio_id === 3;
  const longa = atributos.length > 3 || (obs?.length ?? 0) > 180;
  const unitario = item.sigiloso ? 'Sigiloso' : (moeda(item.valor_unitario_estimado) ?? '—');
  const total = item.sigiloso ? 'Sigiloso' : (moeda(item.valor_total_estimado) ?? '—');

  const especificacao =
    atributos.length || obs ? (
      <div className="mt-1.5 text-[13px] text-ink-muted">
        {atributos.length ? (
          <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5">
            {atributos.map((a, i) => (
              <div key={i} className="contents">
                <dt>{a.chave}</dt>
                <dd className="text-ink">{a.valor}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {obs ? (
          <p className={`break-words ${atributos.length ? 'mt-1.5' : ''}`}>
            {atributos.length ? <span className="font-semibold">Obs.: </span> : null}
            {obs}
          </p>
        ) : null}
      </div>
    ) : null;

  return (
    <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2 border-b border-line py-3 lg:grid-cols-[2.5rem_minmax(0,1fr)_7rem_8rem_8rem]">
      <span className="font-mono text-[13px] text-ink-muted">{item.numero}</span>
      <div className="min-w-0">
        <p className="break-words text-[14.5px] font-semibold">{nome}</p>
        {etiquetas.length || exclusivo || cota ? (
          <p className="mt-1 flex flex-wrap gap-1.5">
            {exclusivo ? <span className={ETIQUETA_MEEPP}>ME/EPP</span> : null}
            {cota ? <span className={ETIQUETA_MEEPP}>Cota ME/EPP</span> : null}
            {etiquetas.map((t) => (
              <span key={t} className={ETIQUETA}>
                {t}
              </span>
            ))}
          </p>
        ) : null}
        {especificacao ? (
          longa ? (
            <details className="group mt-1">
              <summary className="cursor-pointer text-[13px] font-semibold text-pin-strong">
                <span className="group-open:hidden">Ver especificação</span>
                <span className="hidden group-open:inline">Ocultar especificação</span>
              </summary>
              {especificacao}
            </details>
          ) : (
            especificacao
          )
        ) : null}
        <p className="mt-1.5 text-[13px] text-ink-muted lg:hidden">
          {quantidade(item.quantidade)} {item.unidade ?? ''} · {unitario} un. · {total}
        </p>
      </div>
      <span className="hidden text-right font-mono text-[13px] lg:block">
        {quantidade(item.quantidade)} <span className="font-sans text-ink-muted">{item.unidade ?? ''}</span>
      </span>
      <span className="hidden text-right font-mono text-[13px] lg:block">{unitario}</span>
      <span className="hidden text-right font-mono text-[13px] font-medium lg:block">{total}</span>
    </li>
  );
}
```

`components/edital/ListaItens.tsx`:
```tsx
import Link from 'next/link';
import { numero } from '@/lib/formato';
import type { ItemEdital } from '@/lib/tipos';
import { ItemOrganizado } from './ItemOrganizado';

export function ListaItens({ itens, total, slug, todos }: { itens: ItemEdital[]; total: number; slug: string; todos: boolean }) {
  if (total === 0) return <p className="text-ink-muted">O PNCP ainda não trouxe os itens deste edital. Veja no edital oficial.</p>;
  return (
    <>
      <div className="hidden grid-cols-[2.5rem_minmax(0,1fr)_7rem_8rem_8rem] gap-x-2 border-b border-line pb-2 text-xs font-semibold text-ink-muted lg:grid" aria-hidden="true">
        <span>#</span>
        <span>Item</span>
        <span className="text-right">Qtd.</span>
        <span className="text-right">Unit. estimado</span>
        <span className="text-right">Total</span>
      </div>
      <ol className="flex flex-col">
        {itens.map((i) => (
          <ItemOrganizado key={i.numero} item={i} />
        ))}
      </ol>
      {!todos && total > itens.length ? (
        <Link href={`/edital/${slug}?itens=todos`} className="mt-3 inline-block text-sm font-semibold text-pin-strong hover:underline">
          Ver todos os {numero(total)} itens
        </Link>
      ) : null}
      {todos && total > itens.length ? (
        <p className="mt-3 text-sm text-ink-muted">
          Mostrando os {numero(itens.length)} primeiros de {numero(total)} itens. Os demais estão no edital oficial.
        </p>
      ) : null}
    </>
  );
}
```

`components/edital/TextoRecolhivel.tsx`:
```tsx
/** Texto em parágrafos; acima do limite, mostra uma prévia e "Ler tudo" (só HTML: funciona sem JavaScript). */
export function TextoRecolhivel({ paragrafos, limite = 400 }: { paragrafos: string[]; limite?: number }) {
  const inteiro = paragrafos.join(' ');
  const conteudo = paragrafos.map((p, i) => (
    <p key={i} className="break-words">
      {p}
    </p>
  ));
  if (inteiro.length <= limite) return <div className="flex flex-col gap-2 text-[15px]">{conteudo}</div>;
  const corte = inteiro.lastIndexOf(' ', limite);
  const previa = inteiro.slice(0, corte > 0 ? corte : limite);
  return (
    <details className="group text-[15px]">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <p className="break-words group-open:hidden">{previa}…</p>
        <span className="mt-2 inline-block text-sm font-semibold text-pin-strong">
          <span className="group-open:hidden">Ler tudo</span>
          <span className="hidden group-open:inline">Mostrar menos</span>
        </span>
      </summary>
      <div className="mt-2 flex flex-col gap-2">{conteudo}</div>
    </details>
  );
}
```

- [ ] **Step 2: Página**

`app/edital/[slug]/page.tsx` (substitui o atual):
```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { BotaoEditalOficial } from '@/components/BotaoEditalOficial';
import { Cabecalho } from '@/components/Cabecalho';
import { ListaItens } from '@/components/edital/ListaItens';
import { PrincipaisInformacoes } from '@/components/edital/PrincipaisInformacoes';
import { TextoRecolhivel } from '@/components/edital/TextoRecolhivel';
import { TAG_PRAZO, TEXTO_PRAZO } from '@/components/estilosPrazo';
import { FaixaCobertura } from '@/components/FaixaCobertura';
import { RegistrarAbertura } from '@/components/RegistrarAbertura';
import { VitrineEmBreve } from '@/components/VitrineEmBreve';
import { SLUG_EDITAL } from '@/lib/eventos';
import { data, haQuanto, linkOficial, prazo } from '@/lib/formato';
import { modalidadeCurta } from '@/lib/participacao';
import { atualizadoEm, edital, itensDoEdital, resumoItens } from '@/lib/servidor/consultas';
import { lotesDaInfo, nomeProprio, paragrafos, textoLimpo, tituloCurto } from '@/lib/texto';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ itens?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!SLUG_EDITAL.test(slug)) return { title: 'Edital' };
  const e = await edital(slug);
  if (!e) return { title: 'Edital não encontrado' };
  const t = tituloCurto(e.objeto).titulo;
  return { title: t.length > 70 ? `${t.slice(0, 69)}…` : t };
}

const ETIQUETA = 'rounded-xs bg-sunken px-2 py-0.5 text-xs font-semibold text-ink-muted';

export default async function PaginaEdital({ params, searchParams }: Props) {
  await connection();
  const { slug } = await params;
  const { itens: modoItens } = await searchParams;
  if (!SLUG_EDITAL.test(slug)) notFound();
  const e = await edital(slug);
  if (!e) notFound();

  const todos = modoItens === 'todos';
  const [itens, resumo, atualizado] = await Promise.all([itensDoEdital(e.id, todos ? 2000 : 50), resumoItens(e.id), atualizadoEm()]);
  const agora = new Date();
  const p = prazo(e.encerramento_em, agora);
  const titulo = tituloCurto(e.objeto);
  const local = `${e.municipio_nome ?? '—'}/${e.uf}`;
  const lotes = e.info_complementar ? lotesDaInfo(e.info_complementar) : null;
  const exclusivoTotal = resumo.total > 0 && resumo.exclusivos === resumo.total;

  return (
    <>
      <Cabecalho />
      <FaixaCobertura atualizadoEm={atualizado} />
      <RegistrarAbertura slug={e.slug} />
      <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-6 md:px-6">
        <nav aria-label="Caminho" className="flex flex-wrap gap-2 text-[13px] text-ink-muted">
          <Link href="/" className="hover:underline">Mapa</Link>
          <span aria-hidden="true">/</span>
          <span>{local}</span>
        </nav>

        <section className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-xs px-2 py-0.5 text-xs font-semibold ${TAG_PRAZO[p.tom]}`}>{p.situacao}</span>
              <span className={`text-[13px] ${TEXTO_PRAZO[p.tom]}`}>{p.texto}</span>
              {e.modalidade_nome ? <span className={ETIQUETA}>{modalidadeCurta(e.modalidade_nome)}</span> : null}
              {e.srp ? <span className={ETIQUETA}>Registro de preços</span> : null}
              {exclusivoTotal ? <span className="rounded-xs bg-mata-soft px-2 py-0.5 text-xs font-semibold text-mata">Exclusivo ME/EPP</span> : null}
            </div>
            <h1 className="break-words text-[26px] font-bold leading-tight tracking-[-0.015em] md:text-[32px]">{titulo.titulo}</h1>
            <p className="text-[15px] text-ink-muted">
              {[nomeProprio(e.orgao_nome), e.unidade_nome ? nomeProprio(e.unidade_nome) : null, local].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <BotaoEditalOficial href={linkOficial(e)} slug={e.slug} />
            <Link
              href={`/alertas?uf=${e.uf}`}
              className="inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken"
            >
              Criar alerta para editais parecidos
            </Link>
          </div>
        </section>

        <PrincipaisInformacoes edital={e} resumo={resumo} agora={agora} />

        <div className="flex flex-wrap items-start gap-5">
          <div className="flex min-w-0 flex-[999_1_620px] flex-col gap-5">
            <section className="rounded-lg border border-line bg-raised p-5">
              <h2 className="mb-3 text-[17px] font-bold">Itens da licitação</h2>
              <ListaItens itens={itens.itens} total={itens.total} slug={e.slug} todos={todos} />
            </section>
            {titulo.cortado ? (
              <section className="rounded-lg border border-line bg-raised p-5">
                <details>
                  <summary className="cursor-pointer text-[17px] font-bold">Objeto completo</summary>
                  <p className="mt-2 break-words text-[15px]">{textoLimpo(e.objeto)}</p>
                </details>
              </section>
            ) : null}
            {e.info_complementar ? (
              <section className="rounded-lg border border-line bg-raised p-5">
                <h2 className="mb-2 text-[17px] font-bold">Informações complementares</h2>
                {lotes ? (
                  <ol className="flex flex-col gap-1.5 text-[15px]">
                    {lotes.map((l) => (
                      <li key={l.numero} className="break-words">
                        <span className="font-semibold">Lote {l.numero}</span> · {l.texto}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <TextoRecolhivel paragrafos={paragrafos(e.info_complementar)} />
                )}
              </section>
            ) : null}
          </div>
          <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-5">
            <VitrineEmBreve slug={e.slug} />
            <section className="flex flex-col gap-3 rounded-lg border border-line bg-raised p-5 text-[15px]">
              <h2 className="text-base font-bold">Local e dados</h2>
              <p>
                <span className="block text-xs text-ink-muted">Sede do órgão comprador</span>
                {local}
              </p>
              <p className="text-[13px] text-ink-muted">O local de entrega pode ser outro: confira no edital.</p>
              {e.situacao_nome ? (
                <p>
                  <span className="block text-xs text-ink-muted">Situação no PNCP</span>
                  {e.situacao_nome}
                </p>
              ) : null}
              {e.publicada_em ? (
                <p>
                  <span className="block text-xs text-ink-muted">Publicado no PNCP</span>
                  <span className="font-mono">{data(e.publicada_em)}</span>
                </p>
              ) : null}
              <p className="text-[13px] text-ink-muted">Fonte: PNCP{atualizado ? ` · atualizado ${haQuanto(atualizado, agora)}` : ''}</p>
            </section>
            <p className="rounded-md bg-sunken p-4 text-[13px] text-ink-muted">
              O Edital Map ajuda a encontrar editais. Não participa da licitação: as regras valem conforme o edital oficial.
            </p>
          </aside>
        </div>
      </main>
    </>
  );
}
```

```bash
git rm components/TabelaItens.tsx
```

- [ ] **Step 3: Verificar**

Run: `npm run typecheck && npm test && npm run build`

O controlador passa três slugs (encontrados com SQL): um com itens no padrão "características adicionais:", um com itens em maiúsculas começando por "LOTE", um com informação complementar no padrão "(L1):". Produção local + Edge invisível (perfil `edge-capturas-v11`) com `CAPTURAS_INTERNO=1 node scripts/capturas.mjs http://localhost:3000 <slug1> <slug2> <slug3>` (a Task 12 deixa o script aceitar vários slugs; até lá, rode uma vez por slug e renomeie as imagens). Confira nas imagens: bloco "Principais informações" com seis cartões (ME/EPP só depois da releitura da Task 2), itens com nome em destaque e especificação em lista, maiúsculas convertidas, lotes em lista. Encerre o Edge do perfil e o servidor.

- [ ] **Step 4: Commit**

```bash
git add components/edital app/edital
git commit -m "feat: página do edital com principais informações e itens organizados" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 12: Aceite, capturas, publicação e documentação

**Files:**
- Modify: `scripts/capturas.mjs`, `CLAUDE.md`, `docs/superpowers/specs/2026-10-15-fase-2-visual-design.md` (seção 10)

- [ ] **Step 1: Capturas com vários editais**

Em `scripts/capturas.mjs`, troque a leitura de argumentos e a lista de páginas por:
```js
const [base = 'http://localhost:3000', ...slugs] = process.argv.slice(2);
const paginas = [['inicio', '/'], ['alertas', '/alertas'], ['sobre', '/sobre']];
slugs.forEach((slug, i) => paginas.push([`edital-${i + 1}`, `/edital/${slug}`]));
```
e atualize o comentário de uso no topo para `node scripts/capturas.mjs <url> [slug1 slug2 …]`.

- [ ] **Step 2 (controlador): conferência visual final**

Produção local, Edge invisível, `CAPTURAS_INTERNO=1 node scripts/capturas.mjs http://localhost:3000 <slug1> <slug2> <slug3>`. O controlador olha as capturas em 1440 e 390 px contra o mockup e a spec (seções 3 e 4).

- [ ] **Step 3 (controlador): publicar**

`vercel deploy --prod --yes`. Conferir em https://edital-map.vercel.app: `/` 200 com "Buscar no mapa" no HTML; `/geo/estados.json` 200; `/api/busca?valor=1000000&modalidades=6` 200; `X-Robots-Tag: noindex, nofollow`; capturas da URL publicada.

- [ ] **Step 4: Documentação**

`CLAUDE.md`:
- Em "Comandos", troque a linha `npm run gerar:municipios …` por `- npm run gerar:estados: contorno das UFs do mapa (public/geo/estados.json)` e acrescente `- npm run worker:reler-itens: relê os itens das compras abertas (uso único, depois de mudar o que se guarda de cada item)`.
- Em "Regras", acrescente: `- Textos do PNCP só passam pela limpeza de lib/texto.ts (sem IA); siglas novas entram na lista SIGLAS.` e `- Página inicial em três colunas a partir de lg (1024 px); abaixo, mapa em tela cheia e lista na gaveta.`

Na seção 10 da spec da iteração visual, marque `[x]` em cada critério cumprido, com o comprovante ao lado; o que faltar fica `[ ]` com uma frase.

- [ ] **Step 5: Commit**

```bash
git add scripts/capturas.mjs CLAUDE.md docs/superpowers/specs/2026-10-15-fase-2-visual-design.md
git commit -m "docs: fechamento da iteração visual da Fase 2" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```
