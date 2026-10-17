# Edital Map · Fase 3 · Limites do grátis, página Planos e celular · plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plano grátis com limite bloqueando (3 buscas e 3 editais diferentes por dia, por navegador), selo no cabeçalho, cartão de limite na lista e no edital, página `/planos` com lista de espera, busca guardada no endereço e a navegação do celular refeita (barra de baixo, Mapa e Lista em tela cheia, folha de Filtros, card que abre o edital).

**Architecture:** Uma migração (`0009_limites_lista_espera.sql`) cria `uso_diario`, `registrar_uso` (conta e decide numa chamada só, com trava consultiva por visitante e tipo), `uso_do_dia` (selo), `lista_espera`, o evento `limite_atingido` e a limpeza diária de `uso_diario` dentro de `aplicar_retencao`. O controlador aplica a 0009 logo depois da Task 1 (o site no ar não usa nada dela). No servidor, `lib/servidor/uso.ts` decide antes de entregar dados: `/api/busca`, `/api/mapa` e `/api/exportar` respondem **HTTP 402** `{ erro, codigo: 'limite_diario', limite }` para combinação nova além da 3ª, e a página do edital (componente de servidor) troca tudo abaixo do cabeçalho pelo cartão dos planos. Um `proxy.ts` garante o cookie `em_visitante` antes de páginas e rotas (componente de servidor não grava cookie). As regras puras (combinação da busca, textos do selo, filtros ↔ endereço) ficam em `lib/limites.ts` e `lib/urlBusca.ts`, com testes. A página inicial passa a ler e escrever os filtros na URL (`history.replaceState`) e guarda o estado ao sair (`sessionStorage`) para voltar do edital no mesmo lugar. No celular, a gaveta sai: barra fixa embaixo (Mapa · Lista · Alertas · Planos), Lista cobrindo o mapa, busca compacta com "Filtros (n)" e folha de filtros em tela cheia.

**Tech Stack:** Next.js 16 (App Router, `proxy.ts`) + React 19 + Tailwind 4 + maplibre-gl 6, @supabase/supabase-js 2, Postgres 15 do Supabase (PostgREST, pg_cron), vitest 3, TypeScript 5, Vercel CLI.

**Spec:** `docs/superpowers/specs/2026-10-17-fase-3-limites-planos-celular-design.md` (itens e preços da tabela: `docs/superpowers/specs/2026-10-16-fase-3-planos-design.md` §2).

## Global Constraints

- Trabalho no worktree `C:\Users\jotap\worktrees\edital-map-limites` (Git Bash: `/c/Users/jotap/worktrees/edital-map-limites`), branch `fase-3-limites-planos-celular` (já existe e está ativo). Todos os comandos rodam na raiz do worktree. **Não ler nem mexer no checkout principal** (pasta do OneDrive): outras sessões trabalham lá. Não ler nem imprimir o `.env`.
- TDD com vitest: teste primeiro. `npm test` e `npm run typecheck` passam antes de cada commit; tasks que mexem em `app/`, `components/` ou `proxy.ts` também rodam `npm run build`.
- Schema só muda com migração nova: esta etapa cria só `supabase/migrations/0009_limites_lista_espera.sql`; não editar 0001–0008. **Implementadores não aplicam migração, não rodam SQL, não tocam no banco e não chamam o PNCP**: escrevem o arquivo SQL e as guardas de texto em vitest. Quem aplica e confere é o controlador (Task 2): `npm run db:aplicar -- supabase/migrations/0009_limites_lista_espera.sql` (uma transação, `set local lock_timeout = '10s'`).
- Banco: tabelas novas com RLS ligado, `revoke all ... from public, anon, authenticated` e `grant select, insert, delete ... to service_role`; funções novas ou trocadas com `revoke execute ... from public, anon, authenticated;` e `grant execute ... to service_role;` explícitos por assinatura.
- Dados do site só pelo servidor (`lib/servidor/*`, `import 'server-only'`). `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_DB_URL` nunca vão para o navegador nem para o git.
- Limites: `LIMITE_GRATIS = { busca: 3, edital: 3 }`. Dia = calendário de Brasília (`America/Sao_Paulo`), zera à 0h. Conta por navegador (cookie `em_visitante`); navegador interno (`em_interno=1`) não conta, nunca é bloqueado e não vê selo. Banco fora do ar na contagem → libera (o limite é um lembrete).
- Busca = combinação de termo (sem acento, minúsculo, espaços colapsados) + UF + município + valor + modalidades (em ordem) + órgão + raio. Não entram: prazo (`dias`) e página (`deslocamento`); com raio a UF também não entra (não filtra). Sem nada disso (página inicial vazia, ou só o prazo) não conta. Chave gravada = 32 primeiros caracteres hex do sha256 da combinação. Edital = slug. O mapa usa os mesmos parâmetros da lista (mesma chave: lista + mapa da mesma busca contam uma vez).
- Sinal de limite: **HTTP 402** com corpo `{ erro, codigo: 'limite_diario', limite: { tipo, usados, maximo } }` (`corpoLimite`/`lerLimite` em `lib/limites.ts`). HTTP 429 continua sendo só limite por hora (eventos, alertas, exportações, lista de espera).
- Rotas que dependem do visitante (`/api/busca`, `/api/mapa`, `/api/exportar`, `/api/uso`) respondem `Cache-Control: private, no-store` (`SEM_CACHE` em `lib/http.ts`); `/api/orgaos` e `/api/contagem` continuam com `CACHE_PUBLICO`.
- Todo `<Link>` para `/edital/...` tem `prefetch={false}` (guarda em `scripts/prefetch-edital.test.ts`); não criar `app/edital/[slug]/loading.tsx`; não ligar `cacheComponents`. (Sem `loading.js` e sem Cache Components o Next 16 não pré-carrega página dinâmica, e o `headers()` do Next 16 esconde `next-router-prefetch`: a defesa é não haver pré-carga.)
- Textos exatos: selo "Grátis · restam 2 buscas e 1 edital hoje" (celular "2 buscas · 1 edital"; "nenhuma busca"/"nenhum edital" quando zera; os dois zerados: "Grátis · nenhuma busca e nenhum edital hoje"); cartão "Você usou as 3 buscas grátis de hoje." / "Você abriu os 3 editais grátis de hoje." + "Volta amanhã às 0h, ou conheça os planos." com botões **Basic** e **Pro** (→ `/planos#basic`, `/planos#pro`); formulário "O pagamento abre em breve. Deixe seu e-mail que avisamos assim que puder assinar."; sucesso "Pronto! Avisamos em <e-mail> quando o pagamento abrir."; placeholder da busca "Ex.: EPI, uniformes"; botão "Filtros (n)"; folha com "Limpar filtros" e "Ver N editais".
- Interface em português do Brasil, com as cores e raios do design system que já estão em `app/globals.css` (`bg-pin`, `text-on-pin`, `bg-pin-soft`, `text-pin-strong`, `bg-ouro-soft`, `text-ouro-strong`, `bg-sunken`, `bg-raised`, `bg-surface`, `text-ink`, `text-ink-muted`, `border-line`, `border-line-strong`, `rounded-xs/sm/md/lg`). Nenhuma cor nova.
- Outras sessões estão mexendo, em paralelo, em `components/Mapa.tsx`, `lib/painel.ts`, `components/inicio/LegendaMapa.tsx` (mapa novo), na página do edital (seção "Documentos do edital"), em `lib/eventos.ts` (recurso `baixou_documento`), `lib/tipos.ts` e `lib/servidor/consultas.ts`. Este plano **não toca** `Mapa.tsx`, `painel.ts`, `LegendaMapa.tsx`, `tipos.ts` nem `consultas.ts`; `ALTURA_GAVETA_RECOLHIDA` continua exportada por `components/GavetaCelular.tsx` (o `Mapa.tsx` importa). Em `lib/eventos.ts` as mudanças são pequenas e localizadas.
- Implementadores verificam com `npm test`, `npm run typecheck` e `npm run build`; **não** sobem `npm run dev` contra o banco (a página inicial, o edital e as rotas leem e gravam em produção). Única exceção: a conferência do cookie em `/sobre` da Task 5, que não lê o banco. As conferências no navegador são do controlador (Task 13). Interno não tem limite: para ver limite e selo, o controlador usa um perfil novo do navegador e, ao terminar, abre `/sobre?interno=1` nesse mesmo perfil (o portão exclui por inteiro o visitante que já apareceu como interno).
- Todo commit termina com `Co-Authored-By: <nome do modelo que escreveu o commit> <noreply@anthropic.com>` (nos comandos abaixo, `<modelo>`).

## Estimativa de tempo

| Task | Quem | Tempo estimado | Acumulado |
|---|---|---|---|
| 1 · Migração 0009 e conferências | implementador | 40 min | 0h40 |
| 2 · Aplicar a 0009 e conferir | controlador | 20 min | 1h00 |
| 3 · Regras puras dos limites | implementador | 25 min | 1h25 |
| 4 · Busca no endereço (funções puras) | implementador | 30 min | 1h55 |
| 5 · Visitante, proxy e contexto | implementador | 25 min | 2h20 |
| 6 · Uso do dia no servidor | implementador | 35 min | 2h55 |
| 7 · Rotas com o sinal de limite | implementador | 35 min | 3h30 |
| 8 · Página do edital com bloqueio | implementador | 30 min | 4h00 |
| 9 · Selo e cartão de limite na lista | implementador | 40 min | 4h40 |
| 10 · Página Planos e lista de espera | implementador | 45 min | 5h25 |
| 11 · Busca no endereço na página inicial | implementador | 50 min | 6h15 |
| 12 · Celular | implementador | 75 min | 7h30 |
| 13 · Publicar e conferir | controlador | 45 min | 8h15 |
| 14 · Documentação, aceite e merge | implementador + controlador | 25 min | 8h40 |

Revisões entre tasks somam ~20%: total realista **~10 h**. Do dono: nada obrigatório (opcional: abrir o site no celular dele depois da Task 13). Se o merge da Task 14 encontrar conflito com as outras sessões, avisar com a nova estimativa.

## Ordem de publicação (perigos)

| Momento | Ordem obrigatória | O que quebra se inverter |
|---|---|---|
| 0009 | Task 2: aplicar a 0009 → conferir o site no ar (200 em `/`, `/api/busca`, edital) → conferências [L1]–[L5] e `scripts/conferir-limites.ts`. Só depois, Task 13: `vercel deploy --prod --yes`. | Site novo antes da 0009: `registrar_uso` não existe → a contagem falha e libera tudo (sem limite, sem erro visível); `/api/uso` dá 502 (sem selo); `/api/lista-espera` dá 500; `limite_atingido` bate na restrição antiga de `eventos.tipo`. |
| 0009 aplicada, site antigo no ar | Nada a fazer: o site antigo não usa `uso_diario`, `lista_espera` nem as funções novas; a restrição de `eventos.tipo` só ganhou um tipo; `aplicar_retencao` continua devolvendo o mesmo número. | — |
| Cache | A Task 7 troca `CACHE_PUBLICO` por `SEM_CACHE` em `/api/busca` e `/api/mapa`. | Com cache no CDN, a resposta de um visitante (inclusive o 402) seria servida a outros e a contagem não rodaria. |
| Sempre | `db:aplicar` fora de uma rodada do sync (`gh run list --workflow sync.yml --limit 1`: nenhuma `in_progress`). | `lock_timeout` de 10 s estoura se o sync estiver gravando; a migração inteira volta atrás (nada parcial). |
| Merge | Task 14, depois da publicação conferida. Conflitos esperados: `app/edital/[slug]/page.tsx` (seção Documentos) e `lib/eventos.ts`. | Merge antes da conferência leva para o `main` algo que pode precisar de ajuste. |

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/0009_limites_lista_espera.sql` (novo) | `uso_diario`, `registrar_uso`, `uso_do_dia`, `lista_espera`, `limite_atingido`, limpeza em `aplicar_retencao`, permissões |
| `scripts/migracoes.test.ts` | Guardas de texto da 0009 e do portão |
| `docs/fase-3-limites.sql` (novo), `scripts/conferir-limites.ts` (novo) | Conferências do controlador (permissões, idempotência, 4ª chave, outro dia, limpeza) e teste de concorrência com várias conexões |
| `docs/fase-2-portao.sql` | `limite_atingido_por_tipo` e `lista_espera_por_plano` |
| `lib/eventos.ts` | `TIPOS_EVENTO_SERVIDOR` (`pediu_alerta`, `limite_atingido`), recurso `plano_basic`, `LIMITES.listaEsperaPorHora`, `validarListaEspera` |
| `lib/limites.ts` (novo) | `LIMITE_GRATIS`, `combinacaoBusca`, textos e cor do selo, cartão, sinal 402 (`corpoLimite`, `lerLimite`, `LimiteAtingido`), `RespostaBusca` |
| `lib/urlBusca.ts` (novo) | Filtros ↔ endereço (`urlDaBusca`, `lerBuscaDaUrl`, `montarTela`, `paraUrlSearchParams`, `comTela`) |
| `lib/filtros.ts` | `filtrosAtivos` |
| `lib/cliente/volta.ts` (novo) | Estado da página inicial guardado ao sair (voltar do edital) e última busca (barra do celular) |
| `lib/cliente/uso.ts` (novo) | Loja do uso do dia no navegador (selo) |
| `lib/visitante.ts` (novo), `proxy.ts` (novo) | Cookie `em_visitante` garantido antes de páginas e rotas |
| `lib/servidor/registro.ts` | `contextoDaPagina`, `hashDoIp`, eventos do servidor, `dentroDoLimite('lista_espera')`, `gravarListaEspera` |
| `lib/servidor/uso.ts` (novo) | `decidirBusca`, `decidirEdital`, `usoDoDia`, `avisarLimite`, `chaveDaBusca`, `inicioDoDiaDeBrasilia` |
| `lib/servidor/nomes.ts` (novo) | Nome do município e do órgão para os filtros vindos do endereço |
| `lib/http.ts` | `SEM_CACHE` |
| `app/api/busca`, `app/api/mapa`, `app/api/exportar` | Sinal de limite (402) e `SEM_CACHE` |
| `app/api/uso/route.ts`, `app/api/contagem/route.ts`, `app/api/lista-espera/route.ts` (novos) | Selo; "Ver N editais"; lista de espera |
| `app/api/rotas-limite.test.ts`, `app/api/lista-espera/route.test.ts` (novos), `vitest.config.ts` | Testes das rotas |
| `components/CartaoLimite.tsx` (novo) | Cartão dos planos (lista e edital) |
| `app/edital/[slug]/page.tsx`, `components/BotaoEditalOficial.tsx`, `components/inicio/CartaoSelecionado.tsx`, `components/edital/ListaItens.tsx` | Bloqueio do edital, sem prefetch, botão fixo no celular |
| `scripts/prefetch-edital.test.ts` (novo) | Guarda dos links para `/edital` |
| `components/SeloPlano.tsx` (novo), `components/Cabecalho.tsx`, `components/Logo.tsx`; `components/BotaoEmBreve.tsx` (removido) | Selo; aba Planos e "Assinar Pro" → `/planos` |
| `app/planos/page.tsx`, `components/planos/BotaoQueroPlano.tsx`, `lib/planos.ts` (novos) | Página Planos e lista de espera |
| `app/page.tsx`, `components/Explorador.tsx`, `components/inicio/ColunaLista.tsx`, `components/inicio/BuscaPrincipal.tsx` | Busca no endereço, limite, voltar no lugar, telas do celular |
| `components/BarraCelular.tsx`, `components/inicio/FolhaFiltros.tsx` (novos), `components/inicio/Chips.tsx`, `components/inicio/CardCompacto.tsx`, `components/inicio/Icones.tsx`, `components/GavetaCelular.tsx`, `app/layout.tsx`, `app/globals.css` | Celular |
| `scripts/capturas.mjs` | Captura de `/planos` |
| `CLAUDE.md`, spec §5, `docs/fase-3-metricas.md` | Documentação, aceite e números |

---

### Task 1: Migração `0009` (uso do dia, lista de espera, `limite_atingido`)

**Files:**
- Create: `supabase/migrations/0009_limites_lista_espera.sql`, `docs/fase-3-limites.sql`, `scripts/conferir-limites.ts`
- Modify: `scripts/migracoes.test.ts`, `docs/fase-2-portao.sql`, `lib/eventos.ts`

**Interfaces:**
- Consumes: `public.eventos` e a restrição `eventos_tipo_check` da 0007 (`'busca', 'abriu_edital', 'clicou_edital_oficial', 'pediu_alerta', 'quer_recurso', 'usou_recurso'`); `public.aplicar_retencao()` da 0006 (job `retencao-contratacoes`, `45 4 * * *`); `conectarBanco` de `scripts/banco-direto.ts`; `TIPOS_EVENTO` de `lib/eventos.ts`.
- Produces:
  - SQL (só `service_role`): tabela `uso_diario (visitante uuid, dia date, tipo text, chave text, criado_em)` PK `(visitante, dia, tipo, chave)`; `registrar_uso(p_visitante uuid, p_tipo text, p_chave text, p_limite int) returns table (permitido boolean, usados int)`; `uso_do_dia(p_visitante uuid) returns table (buscas int, editais int)`; tabela `lista_espera (id, email, plano, visitante, interno, ip_hash, criado_em)`; `eventos.tipo` aceita `limite_atingido`; `aplicar_retencao()` apaga também `uso_diario` de dias anteriores.
  - TS: `TIPOS_EVENTO_SERVIDOR = ['pediu_alerta', 'limite_atingido'] as const` e `type TipoEventoServidor` em `lib/eventos.ts`.

- [ ] **Step 1: Escrever os testes (falhando)**

No topo de `scripts/migracoes.test.ts`, troque
```ts
import { TIPOS_EVENTO } from '../lib/eventos';
```
por
```ts
import { TIPOS_EVENTO, TIPOS_EVENTO_SERVIDOR } from '../lib/eventos';
```

No bloco `describe('eventos e portão (recursos Pro)', ...)`, troque
```ts
    expect(portao).toContain('as uso_por_recurso;');
```
por
```ts
    expect(portao).toContain('as uso_por_recurso,');
```

Acrescente ao fim de `scripts/migracoes.test.ts`:
```ts
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run scripts/migracoes.test.ts`
Expected: FAIL (`TIPOS_EVENTO_SERVIDOR` não exportado; `ENOENT ... 0009_limites_lista_espera.sql`).

- [ ] **Step 3: `TIPOS_EVENTO_SERVIDOR` em `lib/eventos.ts`**

Logo depois da linha `export type TipoEvento = (typeof TIPOS_EVENTO)[number];`, acrescente:
```ts
/** Eventos gravados só pelo servidor (o navegador não manda): pedido de alerta e limite do grátis atingido. */
export const TIPOS_EVENTO_SERVIDOR = ['pediu_alerta', 'limite_atingido'] as const;
export type TipoEventoServidor = (typeof TIPOS_EVENTO_SERVIDOR)[number];
```

- [ ] **Step 4: Escrever a migração**

Crie `supabase/migrations/0009_limites_lista_espera.sql`:
```sql
-- Edital Map · Fase 3 · Limites do grátis (3 buscas e 3 editais por dia, por navegador) e lista de espera de /planos.
-- uso_diario + registrar_uso (conta e decide numa chamada só), uso_do_dia (selo), lista_espera, evento limite_atingido
-- e limpeza do uso dos dias anteriores dentro de aplicar_retencao (job retencao-contratacoes, 04h45 UTC, da 0006).
-- O site no ar não usa nada disto (continua funcionando). O site novo depende de tudo: publicar só depois.
-- Ordem: esta migração → conferências (docs/fase-3-limites.sql e npx tsx scripts/conferir-limites.ts) → vercel deploy --prod.
-- Aplicar com npm run db:aplicar (uma transação só), fora de uma rodada do sync.

set local lock_timeout = '10s';

-- Uso do dia por navegador (cookie em_visitante). O dia é o do calendário de Brasília (zera à 0h).
-- chave: hash da combinação da busca (lib/servidor/uso.ts) ou slug do edital.
create table public.uso_diario (
  visitante  uuid not null,
  dia        date not null,
  tipo       text not null check (tipo in ('busca', 'edital')),
  chave      text not null check (length(chave) between 1 and 64),
  criado_em  timestamptz not null default now(),
  primary key (visitante, dia, tipo, chave)
);

-- Registra o uso e diz se pode, numa chamada só (o servidor chama antes de entregar a lista, o mapa ou o edital).
-- Mesma chave no mesmo dia: permitido, sem contar de novo. Chave nova com o limite cheio: recusada e nada é gravado.
-- Concorrência: sem a trava, duas chamadas simultâneas com chaves novas leriam a mesma contagem (2 de 3) e as duas
-- gravariam (4): a chave primária não impede, porque as chaves são diferentes. A trava consultiva da transação
-- (por visitante e tipo) faz a segunda esperar a primeira terminar e contar de novo; cada rpc do PostgREST é uma
-- transação, então a trava some no fim da chamada. Visitantes diferentes não se esperam (salvo colisão rara do hash).
create function public.registrar_uso(p_visitante uuid, p_tipo text, p_chave text, p_limite int)
returns table (permitido boolean, usados int)
language plpgsql as $$
declare
  v_dia    date := (now() at time zone 'America/Sao_Paulo')::date;
  v_usados int;
begin
  if p_tipo is null or p_tipo not in ('busca', 'edital') then
    raise exception 'registrar_uso: tipo inválido (%)', p_tipo;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('uso_diario:' || p_visitante::text || ':' || p_tipo, 0));
  select count(*)::int into v_usados
    from public.uso_diario u
   where u.visitante = p_visitante and u.dia = v_dia and u.tipo = p_tipo;
  if exists (select 1 from public.uso_diario u
              where u.visitante = p_visitante and u.dia = v_dia and u.tipo = p_tipo and u.chave = p_chave) then
    return query select true, v_usados;
    return;
  end if;
  if v_usados >= p_limite then
    return query select false, v_usados;
    return;
  end if;
  insert into public.uso_diario (visitante, dia, tipo, chave) values (p_visitante, v_dia, p_tipo, p_chave);
  return query select true, v_usados + 1;
end
$$;

-- Uso de hoje do navegador, para o selo ("restam 2 buscas e 1 edital hoje").
create function public.uso_do_dia(p_visitante uuid)
returns table (buscas int, editais int)
language sql stable as $$
  select (count(*) filter (where u.tipo = 'busca'))::int,
         (count(*) filter (where u.tipo = 'edital'))::int
  from public.uso_diario u
  where u.visitante = p_visitante and u.dia = (now() at time zone 'America/Sao_Paulo')::date
$$;

-- Lista de espera dos planos pagos ("Quero o Basic" / "Quero o Pro" em /planos).
-- ip_hash: limite de envios por hora, como em pedidos_alerta.
create table public.lista_espera (
  id         uuid primary key default gen_random_uuid(),
  email      text not null check (length(email) <= 254),
  plano      text not null check (plano in ('basic', 'pro')),
  visitante  uuid,
  interno    boolean not null default false,
  ip_hash    text,
  criado_em  timestamptz not null default now()
);
create index lista_espera_ip_idx on public.lista_espera (ip_hash, criado_em);

-- Evento novo: limite_atingido (detalhe.tipo = busca | edital), gravado só pelo servidor, uma vez por dia e tipo.
alter table public.eventos drop constraint eventos_tipo_check;
alter table public.eventos add constraint eventos_tipo_check
  check (tipo in ('busca', 'abriu_edital', 'clicou_edital_oficial', 'pediu_alerta', 'quer_recurso', 'usou_recurso', 'limite_atingido'));

-- A retenção diária (0006, job retencao-contratacoes às 04h45 UTC = 01h45 em Brasília) passa a apagar também o uso
-- dos dias anteriores. Continua devolvendo quantas contratações apagou (o job não muda).
create or replace function public.aplicar_retencao()
returns bigint language sql as $$
  delete from public.uso_diario where dia < (now() at time zone 'America/Sao_Paulo')::date;
  with apagadas as (
    delete from public.contratacoes
    where encerramento_em is null or encerramento_em < now() - interval '7 days'
    returning 1
  )
  select count(*) from apagadas
$$;

-- Só o servidor (service_role) lê, grava e executa.
alter table public.uso_diario enable row level security;
alter table public.lista_espera enable row level security;
revoke all on table public.uso_diario from public, anon, authenticated;
revoke all on table public.lista_espera from public, anon, authenticated;
grant select, insert, delete on table public.uso_diario to service_role;
grant select, insert, delete on table public.lista_espera to service_role;
revoke execute on function public.registrar_uso(uuid, text, text, int) from public, anon, authenticated;
revoke execute on function public.uso_do_dia(uuid) from public, anon, authenticated;
revoke execute on function public.aplicar_retencao() from public, anon, authenticated;
grant execute on function public.registrar_uso(uuid, text, text, int) to service_role;
grant execute on function public.uso_do_dia(uuid) to service_role;
grant execute on function public.aplicar_retencao() to service_role;

-- O PostgREST relê as funções no commit (o Supabase também relê sozinho depois de DDL; aqui fica explícito).
notify pgrst, 'reload schema';
```

- [ ] **Step 5: Portão**

Em `docs/fase-2-portao.sql`:

1. Depois da linha `-- Recursos Pro (desde a 0007): uso_por_recurso = ...`, acrescente:
```sql
-- Limites do grátis (desde a 0009; antes dela este arquivo falha porque lista_espera não existe):
-- limite_atingido_por_tipo = visitantes que bateram no limite do dia (busca, edital);
-- lista_espera_por_plano = e-mails distintos na lista de espera de /planos (basic, pro).
```
2. Troque o `with internos as (...)` por:
```sql
with internos as (
  select visitante from public.eventos where interno
  union
  select visitante from public.pedidos_alerta where interno and visitante is not null
  union
  select visitante from public.lista_espera where interno and visitante is not null
)
```
3. Troque a última linha `     group by 1) u) as uso_por_recurso;` por:
```sql
     group by 1) u) as uso_por_recurso,
  (select coalesce(json_object_agg(limite, visitantes), '{}'::json) from (
     select detalhe ->> 'tipo' as limite, count(distinct visitante) as visitantes
     from public.eventos
     where tipo = 'limite_atingido' and not interno and visitante not in (select visitante from internos)
     group by 1) l) as limite_atingido_por_tipo,
  (select coalesce(json_object_agg(plano, emails), '{}'::json) from (
     select plano, count(distinct lower(email)) as emails
     from public.lista_espera
     where not interno and (visitante is null or visitante not in (select visitante from internos))
     group by 1) e) as lista_espera_por_plano;
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run scripts/migracoes.test.ts`
Expected: PASS (todos, inclusive os da 0005–0008).

- [ ] **Step 7: Conferências do controlador (arquivos)**

Crie `docs/fase-3-limites.sql`:
```sql
-- Edital Map · Fase 3 · Limites do grátis e lista de espera: conferências do controlador (0009).
-- Rodar no SQL Editor do Supabase (projeto edital-map) ou com execute_sql. Uma seção por vez.
-- [L2]–[L6] rodam dentro de begin … rollback: nada fica gravado. [L3] chama aplicar_retencao(): fora das rodadas do sync.
-- Concorrência (várias conexões ao mesmo tempo): npx tsx scripts/conferir-limites.ts.

-- ── [L0] Antes da 0009. Esperado: a restrição da 0007 (6 tipos, sem limite_atingido) e o job de retenção ativo, '45 4 * * *'.
select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.eventos'::regclass and conname = 'eventos_tipo_check';
select jobname, schedule, command, active from cron.job where jobname = 'retencao-contratacoes';

-- ── [L1] Depois da 0009: permissões. Esperado: anon e autenticado false, servico true, nas 3 linhas.
select f,
       has_function_privilege('anon', f, 'execute') as anon,
       has_function_privilege('authenticated', f, 'execute') as autenticado,
       has_function_privilege('service_role', f, 'execute') as servico
from unnest(array['public.registrar_uso(uuid, text, text, int)', 'public.uso_do_dia(uuid)', 'public.aplicar_retencao()']) as f;
-- Esperado: anon_le, anon_grava e autenticado_le false; servico_grava e rls true, nas 2 linhas.
select t,
       has_table_privilege('anon', t, 'select') as anon_le,
       has_table_privilege('anon', t, 'insert') as anon_grava,
       has_table_privilege('authenticated', t, 'select') as autenticado_le,
       has_table_privilege('service_role', t, 'insert') as servico_grava,
       (select relrowsecurity from pg_class where oid = t::regclass) as rls
from unnest(array['public.uso_diario', 'public.lista_espera']) as t;
-- Esperado: os 6 tipos de antes + limite_atingido.
select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.eventos'::regclass and conname = 'eventos_tipo_check';

-- ── [L2] registrar_uso: repetir não conta, 4ª chave recusada, editais à parte, outro dia zera.
-- Esperado: sem erro (uma asserção que falha para tudo com "assertion failed: <passo>").
begin;
do $$
declare
  v uuid := '00000000-0000-4000-8000-000000000009';
  ontem uuid := '00000000-0000-4000-8000-00000000000a';
  r record;
begin
  select * into r from public.registrar_uso(v, 'busca', 'chave-a', 3); assert r.permitido and r.usados = 1, 'a1: primeira busca';
  select * into r from public.registrar_uso(v, 'busca', 'chave-a', 3); assert r.permitido and r.usados = 1, 'a2: repetir não conta';
  select * into r from public.registrar_uso(v, 'busca', 'chave-b', 3); assert r.permitido and r.usados = 2, 'b: segunda';
  select * into r from public.registrar_uso(v, 'busca', 'chave-c', 3); assert r.permitido and r.usados = 3, 'c: terceira';
  select * into r from public.registrar_uso(v, 'busca', 'chave-d', 3); assert not r.permitido and r.usados = 3, 'd: 4ª chave recusada';
  select * into r from public.registrar_uso(v, 'busca', 'chave-a', 3); assert r.permitido and r.usados = 3, 'a3: repetir uma do dia continua valendo';
  select * into r from public.registrar_uso(v, 'edital', '00394452000103-2026-21982', 3); assert r.permitido and r.usados = 1, 'e: editais contam à parte';
  select * into r from public.uso_do_dia(v); assert r.buscas = 3 and r.editais = 1, 'uso_do_dia';
  assert (select count(*) from public.uso_diario where visitante = v) = 4, 'a chave recusada não grava';
  insert into public.uso_diario (visitante, dia, tipo, chave)
  select ontem, (now() at time zone 'America/Sao_Paulo')::date - 1, 'busca', 'ontem-' || g from generate_series(1, 3) g;
  select * into r from public.registrar_uso(ontem, 'busca', 'hoje-1', 3); assert r.permitido and r.usados = 1, 'outro dia zera';
  raise notice 'registrar_uso: tudo certo';
end $$;
rollback;

-- ── [L3] Limpeza diária: aplicar_retencao apaga o uso de ontem e mantém o de hoje. Esperado: 1 linha, chave 'hoje'.
begin;
insert into public.uso_diario (visitante, dia, tipo, chave) values
  ('00000000-0000-4000-8000-00000000000b', (now() at time zone 'America/Sao_Paulo')::date - 1, 'busca', 'ontem'),
  ('00000000-0000-4000-8000-00000000000b', (now() at time zone 'America/Sao_Paulo')::date, 'busca', 'hoje');
select public.aplicar_retencao();
select dia, chave from public.uso_diario where visitante = '00000000-0000-4000-8000-00000000000b';
rollback;

-- ── [L4] lista_espera aceita basic e pro. Esperado: INSERT 0 1 duas vezes.
begin;
insert into public.lista_espera (email, plano, interno) values ('conferencia@exemplo.com', 'basic', true);
insert into public.lista_espera (email, plano, interno) values ('conferencia@exemplo.com', 'pro', true);
rollback;
-- Esperado: erro "violates check constraint lista_espera_plano_check".
begin;
insert into public.lista_espera (email, plano, interno) values ('conferencia@exemplo.com', 'premium', true);
rollback;

-- ── [L5] eventos aceita limite_atingido. Esperado: INSERT 0 1, sem erro.
begin;
insert into public.eventos (visitante, tipo, detalhe, interno) values (gen_random_uuid(), 'limite_atingido', '{"tipo": "busca"}', true);
rollback;

-- ── [L6] Tempo de registrar_uso (anotar "Execution Time"; meta < 20 ms).
begin;
explain (analyze) select * from public.registrar_uso('00000000-0000-4000-8000-00000000000c', 'busca', 'tempo', 3);
rollback;

-- ── [L7] Depois da publicação: uso de hoje, limite atingido, interesse nos planos e lista de espera.
select tipo, count(distinct visitante) as visitantes, count(*) as linhas
from public.uso_diario where dia = (now() at time zone 'America/Sao_Paulo')::date group by 1;
select detalhe ->> 'tipo' as tipo, interno, count(*) from public.eventos where tipo = 'limite_atingido' group by 1, 2;
select detalhe ->> 'recurso' as recurso, interno, count(*) from public.eventos
where tipo = 'quer_recurso' and detalhe ->> 'recurso' in ('plano_basic', 'plano_pro') and criado_em > now() - interval '1 day'
group by 1, 2;
select plano, interno, count(*) from public.lista_espera group by 1, 2;
```

Crie `scripts/conferir-limites.ts`:
```ts
// Conferência do controlador depois da 0009: registrar_uso com chamadas simultâneas (cada uma na sua conexão)
// não passa do limite; repetir uma chave do dia não conta; chave nova com o limite cheio é recusada.
// Uso: npx tsx scripts/conferir-limites.ts   (lê SUPABASE_DB_URL do .env; usa um visitante de teste e apaga as linhas dele no fim)
import { randomUUID } from 'node:crypto';
import '../worker/ambiente';
import { conectarBanco } from './banco-direto';

const SIMULTANEAS = 6;
const LIMITE = 3;
const visitante = randomUUID();
const clientes = Array.from({ length: SIMULTANEAS }, () => conectarBanco(process.env));
await Promise.all(clientes.map((c) => c.connect()));
const [primeiro] = clientes;

const registrar = async (i: number, chave: string) =>
  (
    await clientes[i].query<{ permitido: boolean; usados: number }>(
      'select permitido, usados from public.registrar_uso($1, $2, $3, $4)',
      [visitante, 'busca', chave, LIMITE],
    )
  ).rows[0];

let falhou = false;
function conferir(ok: boolean, texto: string) {
  console.log(`${ok ? 'ok   ' : 'FALHA'} ${texto}`);
  if (!ok) falhou = true;
}

try {
  const respostas = await Promise.all(clientes.map((_, i) => registrar(i, `simultanea-${i}`)));
  const permitidas = respostas.flatMap((r, i) => (r.permitido ? [i] : []));
  const { rows } = await primeiro.query<{ n: number }>('select count(*)::int as n from public.uso_diario where visitante = $1', [visitante]);
  conferir(permitidas.length === LIMITE, `${SIMULTANEAS} chamadas simultâneas: ${permitidas.length} permitidas (esperado ${LIMITE})`);
  conferir(rows[0].n === LIMITE, `linhas gravadas: ${rows[0].n} (esperado ${LIMITE})`);
  const repetida = await registrar(0, `simultanea-${permitidas[0]}`);
  conferir(repetida.permitido && repetida.usados === LIMITE, `repetir uma chave do dia: ${repetida.permitido}, ${repetida.usados} (esperado true, ${LIMITE})`);
  const nova = await registrar(0, 'depois-do-limite');
  conferir(!nova.permitido && nova.usados === LIMITE, `chave nova com o limite cheio: ${nova.permitido} (esperado false)`);
} finally {
  await primeiro.query('delete from public.uso_diario where visitante = $1', [visitante]);
  await Promise.all(clientes.map((c) => c.end()));
}
if (falhou) process.exitCode = 1;
```

- [ ] **Step 8: Suíte e tipos**

Run: `npm test && npm run typecheck`
Expected: tudo passa. Não rodar `scripts/conferir-limites.ts` (grava no banco; é do controlador).

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/0009_limites_lista_espera.sql scripts/migracoes.test.ts docs/fase-2-portao.sql docs/fase-3-limites.sql scripts/conferir-limites.ts lib/eventos.ts
git commit -m "feat: migração 0009 com uso do dia, lista de espera e limite_atingido" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 2 (controlador): aplicar a 0009 e conferir no banco

**Files:**
- Modify: `docs/fase-3-metricas.md`

**Interfaces:**
- Consumes: os arquivos da Task 1.
- Produces: 0009 aplicada em produção (pré-requisito da Task 13).

Todos os passos são do controlador (o `.env` do worktree tem `SUPABASE_DB_URL`; nunca imprimir).

- [ ] **Step 1: Pré-condições**

Task 1 commitada. `gh run list --workflow sync.yml --limit 1`: nenhuma rodada `in_progress` (se houver, esperar terminar). Rodar [L0] de `docs/fase-3-limites.sql` e anotar.

- [ ] **Step 2: Aplicar**

Run: `npm run db:aplicar -- supabase/migrations/0009_limites_lista_espera.sql`
Expected: `[migração] limites_lista_espera aplicada`. Se der `lock timeout`, esperar a rodada do sync terminar e repetir (nada ficou aplicado).

- [ ] **Step 3: Site no ar continua de pé**

```bash
B=https://edital-map.vercel.app
for u in / "/api/busca?q=luva" "/api/mapa?q=luva"; do curl -s -o /dev/null -w "%{http_code} $u\n" "$B$u"; done
```
Expected: `200` nas três.

- [ ] **Step 4: Conferências**

Rodar [L1]–[L6] de `docs/fase-3-limites.sql` (uma seção por vez), conferindo o "Esperado" de cada uma. Depois:

Run: `npx tsx scripts/conferir-limites.ts`
Expected: quatro linhas `ok` (`6 chamadas simultâneas: 3 permitidas`, `linhas gravadas: 3`, repetir `true, 3`, chave nova `false`) e saída 0. Qualquer `FALHA`: parar e avisar o dono (não publicar).

- [ ] **Step 5: Registrar e commitar**

Acrescente ao fim de `docs/fase-3-metricas.md`:
```markdown

## Limites do grátis (0009)

- 0009 aplicada em aaaa-mm-dd hh:mm UTC; site no ar seguiu 200.
- Permissões [L1] certas; [L2] sem erro; limpeza [L3] apagou ontem e manteve hoje; lista_espera [L4] e limite_atingido [L5] certos.
- registrar_uso: N ms ([L6]). Concorrência (scripts/conferir-limites.ts): 6 simultâneas → 3 permitidas, 3 gravadas.
```
```bash
git add docs/fase-3-metricas.md
git commit -m "docs: 0009 aplicada e conferida" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 3: Regras puras dos limites (`lib/limites.ts`)

**Files:**
- Create: `lib/limites.ts`, `lib/limites.test.ts`

**Interfaces:**
- Consumes: `FiltrosBusca`, `ResultadoBusca` de `lib/tipos.ts`; `lerFiltros` de `lib/filtros.ts` (só nos testes).
- Produces (`lib/limites.ts`, sem dependência de servidor; o navegador também importa):
  - `LIMITE_GRATIS = { busca: 3, edital: 3 } as const`; `type TipoUso = 'busca' | 'edital'`
  - `type UsoHoje = { interno: boolean; buscas: number; editais: number }`
  - `type Limite = { tipo: TipoUso; usados: number; maximo: number }`
  - `STATUS_LIMITE = 402`, `CODIGO_LIMITE = 'limite_diario'`, `type CorpoLimite = { erro: string; codigo: 'limite_diario'; limite: Limite }`
  - `type RespostaBusca = ResultadoBusca & { buscasUsadas: number | null }`
  - `combinacaoBusca(f: FiltrosBusca): string | null`
  - `textoSelo(uso: { buscas: number; editais: number }): string`, `textoSeloCompacto(uso): string`, `type TomSelo = 'normal' | 'atencao' | 'esgotado'`, `tomSelo(uso): TomSelo` (o `uso` aqui são as quantidades **usadas**)
  - `mensagemLimite(tipo: TipoUso): string`, `CONVITE_PLANOS: string`
  - `corpoLimite(tipo: TipoUso, usados: number): CorpoLimite`, `lerLimite(status: number, corpo: unknown): Limite | null`
  - `class LimiteAtingido extends Error { readonly limite: Limite }`

- [ ] **Step 1: Escrever o teste (falhando)**

Crie `lib/limites.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { lerFiltros } from './filtros';
import {
  combinacaoBusca, CONVITE_PLANOS, corpoLimite, LIMITE_GRATIS, LimiteAtingido, lerLimite, mensagemLimite, STATUS_LIMITE,
  textoSelo, textoSeloCompacto, tomSelo,
} from './limites';

const busca = (qs: string) => lerFiltros(new URLSearchParams(qs));

describe('combinacaoBusca (o que conta como uma busca no dia)', () => {
  it('página inicial sem nada preenchido não conta', () => {
    expect(combinacaoBusca(busca(''))).toBeNull();
  });
  it('prazo e "Carregar mais" não mudam a busca (e o prazo sozinho não conta)', () => {
    expect(combinacaoBusca(busca('q=luva&dias=7&deslocamento=50'))).toBe(combinacaoBusca(busca('q=luva')));
    expect(combinacaoBusca(busca('dias=7'))).toBeNull();
  });
  it('termo: maiúsculas, acentos e espaços não fazem outra busca', () => {
    expect(combinacaoBusca(busca('q=  Luva   Nitrílica '))).toBe(combinacaoBusca(busca('q=luva nitrilica')));
  });
  it('modalidades em qualquer ordem são a mesma busca', () => {
    expect(combinacaoBusca(busca('modalidades=8,6'))).toBe(combinacaoBusca(busca('modalidades=6,8')));
  });
  it('cada filtro muda a combinação', () => {
    const base = combinacaoBusca(busca('q=luva'));
    for (const extra of ['uf=SC', 'ibge=4209102', 'valor=50000', 'modalidades=6', 'orgao=83102285000107', 'ibge=4209102&raio=100']) {
      expect(combinacaoBusca(busca(`q=luva&${extra}`))).not.toBe(base);
    }
    expect(combinacaoBusca(busca('ibge=4209102&raio=100'))).not.toBe(combinacaoBusca(busca('ibge=4209102')));
  });
  it('com raio a UF não filtra, então não muda a busca', () => {
    expect(combinacaoBusca(busca('uf=SC&ibge=4209102&raio=100'))).toBe(combinacaoBusca(busca('ibge=4209102&raio=100')));
  });
  it('filtros inválidos (que a API ignora) não contam', () => {
    expect(combinacaoBusca(busca('uf=XX&valor=7&modalidades=99'))).toBeNull();
  });
});

describe('selo do plano grátis (recebe o que já foi usado hoje)', () => {
  it('sobrando: plural e singular', () => {
    expect(textoSelo({ buscas: 1, editais: 2 })).toBe('Grátis · restam 2 buscas e 1 edital hoje');
    expect(textoSeloCompacto({ buscas: 1, editais: 2 })).toBe('2 buscas · 1 edital');
    expect(textoSelo({ buscas: 0, editais: 0 })).toBe('Grátis · restam 3 buscas e 3 editais hoje');
    expect(textoSelo({ buscas: 2, editais: 3 })).toBe('Grátis · restam 1 busca e nenhum edital hoje');
  });
  it('zerado: "nenhuma busca" e "nenhum edital", sem número negativo', () => {
    expect(textoSelo({ buscas: 3, editais: 1 })).toBe('Grátis · restam nenhuma busca e 2 editais hoje');
    expect(textoSelo({ buscas: 3, editais: 3 })).toBe('Grátis · nenhuma busca e nenhum edital hoje');
    expect(textoSeloCompacto({ buscas: 3, editais: 3 })).toBe('nenhuma busca · nenhum edital');
    expect(textoSelo({ buscas: 5, editais: 0 })).toBe('Grátis · restam nenhuma busca e 3 editais hoje');
  });
  it('cor: amarelo quando falta 1 de qualquer um; laranja quando um zerou', () => {
    expect(tomSelo({ buscas: 0, editais: 1 })).toBe('normal');
    expect(tomSelo({ buscas: 2, editais: 0 })).toBe('atencao');
    expect(tomSelo({ buscas: 0, editais: 2 })).toBe('atencao');
    expect(tomSelo({ buscas: 3, editais: 2 })).toBe('esgotado');
    expect(tomSelo({ buscas: 2, editais: 3 })).toBe('esgotado');
  });
});

describe('sinal de limite (HTTP 402)', () => {
  it('textos do cartão', () => {
    expect(`${mensagemLimite('busca')} ${CONVITE_PLANOS}`).toBe('Você usou as 3 buscas grátis de hoje. Volta amanhã às 0h, ou conheça os planos.');
    expect(`${mensagemLimite('edital')} ${CONVITE_PLANOS}`).toBe('Você abriu os 3 editais grátis de hoje. Volta amanhã às 0h, ou conheça os planos.');
  });
  it('ida e volta: a rota monta, o navegador lê', () => {
    expect(STATUS_LIMITE).toBe(402);
    const corpo: unknown = JSON.parse(JSON.stringify(corpoLimite('busca', 3)));
    expect((corpo as { erro: string }).erro).toBe('Você usou as 3 buscas grátis de hoje. Volta amanhã às 0h, ou conheça os planos.');
    expect(lerLimite(402, corpo)).toEqual({ tipo: 'busca', usados: 3, maximo: LIMITE_GRATIS.busca });
  });
  it('limite por hora (429) e corpos estranhos não são o limite do dia', () => {
    expect(lerLimite(429, corpoLimite('busca', 3))).toBeNull();
    expect(lerLimite(402, { erro: 'x' })).toBeNull();
    expect(lerLimite(402, null)).toBeNull();
    expect(lerLimite(402, { codigo: 'limite_diario', limite: { tipo: 'outro', usados: 3, maximo: 3 } })).toBeNull();
  });
  it('LimiteAtingido carrega o limite e a mensagem', () => {
    const e = new LimiteAtingido({ tipo: 'edital', usados: 3, maximo: 3 });
    expect(e).toBeInstanceOf(Error);
    expect(e.limite.tipo).toBe('edital');
    expect(e.message).toBe('Você abriu os 3 editais grátis de hoje.');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/limites.test.ts`
Expected: FAIL com "Failed to resolve import './limites'".

- [ ] **Step 3: Implementar**

Crie `lib/limites.ts`:
```ts
import type { FiltrosBusca, ResultadoBusca } from './tipos';

/** Limites do plano grátis por dia (calendário de Brasília), por navegador. */
export const LIMITE_GRATIS = { busca: 3, edital: 3 } as const;
export type TipoUso = keyof typeof LIMITE_GRATIS;

/** Uso do dia que o selo mostra. `interno`: navegador do dono, sem limite e sem selo. */
export type UsoHoje = { interno: boolean; buscas: number; editais: number };
/** Quantidades já usadas hoje. */
type Usados = Pick<UsoHoje, 'buscas' | 'editais'>;

/** Limite atingido: tipo, quantos já foram usados hoje e o máximo do grátis. */
export type Limite = { tipo: TipoUso; usados: number; maximo: number };

/** Sinal de limite das rotas. 402 ("pagamento necessário") porque o 429 do site é só o limite por hora. */
export const STATUS_LIMITE = 402;
export const CODIGO_LIMITE = 'limite_diario';
export type CorpoLimite = { erro: string; codigo: typeof CODIGO_LIMITE; limite: Limite };

/** Resposta de /api/busca: a lista e as buscas usadas hoje (null = não contou: busca vazia, interno ou banco fora). */
export type RespostaBusca = ResultadoBusca & { buscasUsadas: number | null };

const semAcento = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '');

/**
 * Combinação que conta como "uma busca" no dia: termo (sem acento, minúsculo, espaços colapsados), UF, município,
 * valor, modalidades (em ordem), órgão e raio. Prazo (`dias`) e página (`deslocamento`) não entram; com raio a UF não
 * filtra (o raio atravessa a divisa), então também não entra. `null` = busca vazia (página inicial sem nada), que não conta.
 */
export function combinacaoBusca(f: FiltrosBusca): string | null {
  const q = f.q ? semAcento(f.q).toLowerCase().replace(/\s+/g, ' ').trim() || null : null;
  const uf = f.raio ? null : f.uf;
  const modalidades = f.modalidades?.length ? [...f.modalidades].sort((a, b) => a - b) : null;
  const partes = [q, uf, f.ibge, f.valorMin, modalidades, f.orgao, f.raio];
  return partes.every((p) => p === null) ? null : JSON.stringify(partes);
}

const PALAVRAS: Record<TipoUso, { um: string; varios: string; nenhum: string }> = {
  busca: { um: 'busca', varios: 'buscas', nenhum: 'nenhuma busca' },
  edital: { um: 'edital', varios: 'editais', nenhum: 'nenhum edital' },
};

function quantos(tipo: TipoUso, n: number): string {
  const p = PALAVRAS[tipo];
  return n <= 0 ? p.nenhum : `${n} ${n === 1 ? p.um : p.varios}`;
}

function restantes(uso: Usados): { buscas: number; editais: number } {
  return { buscas: Math.max(0, LIMITE_GRATIS.busca - uso.buscas), editais: Math.max(0, LIMITE_GRATIS.edital - uso.editais) };
}

/** "Grátis · restam 2 buscas e 1 edital hoje"; com os dois zerados, "Grátis · nenhuma busca e nenhum edital hoje". */
export function textoSelo(uso: Usados): string {
  const r = restantes(uso);
  if (r.buscas === 0 && r.editais === 0) return 'Grátis · nenhuma busca e nenhum edital hoje';
  return `Grátis · restam ${quantos('busca', r.buscas)} e ${quantos('edital', r.editais)} hoje`;
}

/** Selo do celular: "2 buscas · 1 edital". */
export function textoSeloCompacto(uso: Usados): string {
  const r = restantes(uso);
  return `${quantos('busca', r.buscas)} · ${quantos('edital', r.editais)}`;
}

export type TomSelo = 'normal' | 'atencao' | 'esgotado';

/** Laranja quando um dos dois zerou; amarelo quando falta 1 de qualquer um. */
export function tomSelo(uso: Usados): TomSelo {
  const r = restantes(uso);
  if (r.buscas === 0 || r.editais === 0) return 'esgotado';
  if (r.buscas === 1 || r.editais === 1) return 'atencao';
  return 'normal';
}

export function mensagemLimite(tipo: TipoUso): string {
  return tipo === 'busca'
    ? `Você usou as ${LIMITE_GRATIS.busca} buscas grátis de hoje.`
    : `Você abriu os ${LIMITE_GRATIS.edital} editais grátis de hoje.`;
}

export const CONVITE_PLANOS = 'Volta amanhã às 0h, ou conheça os planos.';

/** Corpo da resposta 402 (o `erro` em português aparece também onde a tela só mostra erros, como o botão Exportar). */
export function corpoLimite(tipo: TipoUso, usados: number): CorpoLimite {
  return {
    erro: `${mensagemLimite(tipo)} ${CONVITE_PLANOS}`,
    codigo: CODIGO_LIMITE,
    limite: { tipo, usados, maximo: LIMITE_GRATIS[tipo] },
  };
}

/** Lê o sinal de limite de uma resposta; qualquer outra coisa (inclusive o 429 por hora) é null. */
export function lerLimite(status: number, corpo: unknown): Limite | null {
  if (status !== STATUS_LIMITE || typeof corpo !== 'object' || corpo === null) return null;
  const c = corpo as { codigo?: unknown; limite?: unknown };
  if (c.codigo !== CODIGO_LIMITE || typeof c.limite !== 'object' || c.limite === null) return null;
  const l = c.limite as { tipo?: unknown; usados?: unknown; maximo?: unknown };
  if ((l.tipo !== 'busca' && l.tipo !== 'edital') || typeof l.usados !== 'number' || typeof l.maximo !== 'number') return null;
  return { tipo: l.tipo, usados: l.usados, maximo: l.maximo };
}

/** Erro lançado no navegador quando a rota responde 402: a tela mostra o cartão dos planos, não um erro. */
export class LimiteAtingido extends Error {
  readonly limite: Limite;
  constructor(limite: Limite) {
    super(mensagemLimite(limite.tipo));
    this.name = 'LimiteAtingido';
    this.limite = limite;
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/limites.test.ts`
Expected: PASS.

- [ ] **Step 5: Suíte, tipos e commit**

Run: `npm test && npm run typecheck`
Expected: tudo passa.
```bash
git add lib/limites.ts lib/limites.test.ts
git commit -m "feat: regras do limite do grátis (combinação da busca, selo e sinal 402)" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 4: Busca no endereço e volta do edital (funções puras)

**Files:**
- Create: `lib/urlBusca.ts`, `lib/urlBusca.test.ts`, `lib/cliente/volta.ts`, `lib/cliente/volta.test.ts`
- Modify: `lib/filtros.ts`, `lib/filtros.test.ts`

**Interfaces:**
- Consumes: `lerFiltros`, `normalizarTela`, `paraParametros` (`lib/filtros.ts`); `Cidade`, `FiltrosBusca`, `FiltrosTela`, `Orgao`, `ResultadoBusca` (`lib/tipos.ts`); `Limite` (Task 3).
- Produces:
  - `lib/urlBusca.ts`: `type Tela = 'mapa' | 'lista'`; `urlDaBusca(f: FiltrosTela, tela?: Tela): string` (`'/'` ou `'/?q=…&uf=…&municipio=…&valor=…&modalidades=…&orgao=…&raio=…&dias=7&tela=lista'`); `lerBuscaDaUrl(p: URLSearchParams): { busca: FiltrosBusca; tela: Tela }` (`municipio` do endereço = `ibge` da API; `deslocamento` sempre 0); `montarTela(busca: FiltrosBusca, cidade: Cidade | null, orgao: Orgao | null): FiltrosTela`; `paraUrlSearchParams(sp: Record<string, string | string[] | undefined>): URLSearchParams`; `comTela(endereco: string, tela: Tela): string`.
  - `lib/filtros.ts`: `filtrosAtivos(f: FiltrosTela): number`.
  - `lib/cliente/volta.ts`: `type Volta = { endereco: string; filtros: FiltrosTela; filtrosMapa: FiltrosTela; resultado: ResultadoBusca; limite: Limite | null; tela: Tela; selecionadoId: string | null; rolagem: number }`; `type Armazem = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>`; `guardarVolta(v: Volta, a?: Armazem | null): void`; `tomarVolta(endereco: string, a?: Armazem | null): Volta | null` (lê e apaga); `guardarUltimaBusca(endereco: string, a?: Armazem | null): void`; `lerUltimaBusca(a?: Armazem | null): string` (padrão `'/'`). Sem `a`, usam o `sessionStorage` da aba (null no servidor ou se bloqueado).

- [ ] **Step 1: Escrever os testes (falhando)**

Crie `lib/urlBusca.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { lerFiltros, paraParametros } from './filtros';
import type { FiltrosTela } from './tipos';
import { comTela, lerBuscaDaUrl, montarTela, paraUrlSearchParams, urlDaBusca, type Tela } from './urlBusca';

const VAZIO: FiltrosTela = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };
const JOINVILLE = { ibge: '4209102', nome: 'Joinville', uf: 'SC' };
const ORGAO = { cnpj: '83102285000107', nome: 'Prefeitura de Joinville' };
const CHEIO: FiltrosTela = {
  q: 'luva nitrílica', uf: 'SC', cidade: JOINVILLE, valorMin: 50_000, modalidades: [8, 6], seteDias: true, orgao: ORGAO, raio: 100,
};
const ler = (url: string) => lerBuscaDaUrl(new URLSearchParams(url.split('?')[1] ?? ''));

describe('busca no endereço', () => {
  it('sem nada preenchido: só "/"', () => {
    expect(urlDaBusca(VAZIO)).toBe('/');
    expect(urlDaBusca(VAZIO, 'lista')).toBe('/?tela=lista');
  });
  it('escreve os filtros com os nomes da spec, modalidades em ordem', () => {
    expect(urlDaBusca(CHEIO, 'lista')).toBe(
      '/?q=luva+nitr%C3%ADlica&uf=SC&municipio=4209102&valor=50000&modalidades=6%2C8&orgao=83102285000107&raio=100&dias=7&tela=lista',
    );
  });
  it('ida e volta: os mesmos filtros (com os nomes vindos do banco) e a mesma tela', () => {
    const casos: FiltrosTela[] = [VAZIO, CHEIO, { ...VAZIO, q: 'botina' }, { ...VAZIO, uf: 'SC', cidade: JOINVILLE }, { ...VAZIO, orgao: ORGAO }];
    for (const f of casos) {
      for (const tela of ['mapa', 'lista'] as Tela[]) {
        const lido = ler(urlDaBusca(f, tela));
        expect(montarTela(lido.busca, f.cidade, f.orgao)).toEqual({ ...f, modalidades: [...f.modalidades].sort((a, b) => a - b) });
        expect(lido.tela).toBe(tela);
      }
    }
  });
  it('a página faz a mesma busca que a lista faria (com raio a UF não vai para a API)', () => {
    const { busca } = ler(urlDaBusca(CHEIO));
    expect(lerFiltros(paraParametros(montarTela(busca, JOINVILLE, ORGAO)))).toEqual({ ...busca, uf: null });
  });
  it('lê "municipio" como ibge e ignora o que a API recusaria', () => {
    expect(ler('/?municipio=4209102&uf=sc&valor=7&dias=30&deslocamento=100&tela=x').busca).toEqual({
      q: null, uf: 'SC', ibge: '4209102', dias: null, deslocamento: 0, valorMin: null, modalidades: null, orgao: null, raio: null,
    });
    expect(ler('/?ibge=4209102').busca.ibge).toBeNull();
    expect(ler('/?tela=x').tela).toBe('mapa');
  });
  it('município que não existe no banco sai, e o raio com ele', () => {
    const { busca } = ler('/?municipio=9999999&raio=100');
    expect(montarTela(busca, null, null)).toEqual(VAZIO);
  });
  it('município de outra UF: a UF passa a ser a dele (como na tela)', () => {
    const { busca } = ler('/?uf=SC&municipio=4106902');
    expect(montarTela(busca, { ibge: '4106902', nome: 'Curitiba', uf: 'PR' }, null).uf).toBe('PR');
  });
  it('searchParams da página: o primeiro de cada nome', () => {
    expect(paraUrlSearchParams({ q: ['luva', 'botina'], uf: 'SC', vazio: undefined }).toString()).toBe('q=luva&uf=SC');
  });
  it('comTela troca só a tela', () => {
    expect(comTela('/?q=luva', 'lista')).toBe('/?q=luva&tela=lista');
    expect(comTela('/?q=luva&tela=lista', 'mapa')).toBe('/?q=luva');
    expect(comTela('/', 'lista')).toBe('/?tela=lista');
  });
});
```

Acrescente ao fim de `lib/filtros.test.ts` (e `filtrosAtivos` ao import de `./filtros` no topo do arquivo):
```ts
describe('filtrosAtivos (botão "Filtros (n)" do celular)', () => {
  const nada: FiltrosTela = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };
  const cidade = { ibge: '4209102', nome: 'Joinville', uf: 'SC' };
  it('conta UF, município, raio, valor, modalidades (uma vez), órgão e prazo; o termo não conta', () => {
    expect(filtrosAtivos(nada)).toBe(0);
    expect(filtrosAtivos({ ...nada, q: 'luva' })).toBe(0);
    expect(
      filtrosAtivos({ q: 'luva', uf: 'SC', cidade, valorMin: 50_000, modalidades: [6, 8], seteDias: true, orgao: { cnpj: '83102285000107', nome: 'X' }, raio: 100 }),
    ).toBe(7);
  });
  it('raio sem município não vale', () => {
    expect(filtrosAtivos({ ...nada, raio: 100 })).toBe(0);
  });
});
```
(`FiltrosTela` já está importado em `lib/filtros.test.ts`.)

Crie `lib/cliente/volta.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { FiltrosTela } from '../tipos';
import { guardarUltimaBusca, guardarVolta, lerUltimaBusca, tomarVolta, type Volta } from './volta';

function armazem() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}
const quebrado = {
  getItem: (): string | null => {
    throw new Error('bloqueado');
  },
  setItem: () => {
    throw new Error('bloqueado');
  },
  removeItem: () => {
    throw new Error('bloqueado');
  },
};
const F: FiltrosTela = { q: 'luva', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };
const V: Volta = {
  endereco: '/?q=luva&tela=lista', filtros: F, filtrosMapa: F, resultado: { total: 0, editais: [] }, limite: null, tela: 'lista', selecionadoId: null, rolagem: 420,
};

describe('volta do edital', () => {
  it('devolve o estado guardado do mesmo endereço, uma vez só', () => {
    const a = armazem();
    guardarVolta(V, a);
    expect(tomarVolta('/?q=luva&tela=lista', a)).toEqual(V);
    expect(tomarVolta('/?q=luva&tela=lista', a)).toBeNull();
  });
  it('endereço diferente: não restaura (e descarta)', () => {
    const a = armazem();
    guardarVolta(V, a);
    expect(tomarVolta('/?q=botina', a)).toBeNull();
    expect(tomarVolta('/?q=luva&tela=lista', a)).toBeNull();
  });
  it('sem armazenamento, bloqueado ou com lixo: nada quebra', () => {
    expect(tomarVolta('/', null)).toBeNull();
    expect(() => guardarVolta(V, null)).not.toThrow();
    expect(() => guardarVolta(V, quebrado)).not.toThrow();
    expect(tomarVolta('/', quebrado)).toBeNull();
    const a = armazem();
    a.setItem('em_volta', '{lixo');
    expect(tomarVolta('/', a)).toBeNull();
  });
  it('sem argumento (fora do navegador) usa nada e não quebra', () => {
    expect(tomarVolta('/')).toBeNull();
    expect(lerUltimaBusca()).toBe('/');
  });
});

describe('última busca (links da barra do celular)', () => {
  it('guarda e lê; padrão "/"; só aceita endereço da página inicial', () => {
    const a = armazem();
    expect(lerUltimaBusca(a)).toBe('/');
    guardarUltimaBusca('/?q=luva', a);
    expect(lerUltimaBusca(a)).toBe('/?q=luva');
    a.setItem('em_ultima_busca', 'https://outro.site');
    expect(lerUltimaBusca(a)).toBe('/');
    expect(lerUltimaBusca(null)).toBe('/');
    expect(lerUltimaBusca(quebrado)).toBe('/');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/urlBusca.test.ts lib/filtros.test.ts lib/cliente/volta.test.ts`
Expected: FAIL (módulos `./urlBusca` e `./volta` não existem; `filtrosAtivos` não exportado).

- [ ] **Step 3: Implementar**

Acrescente ao fim de `lib/filtros.ts`:
```ts
/** Quantos filtros estão valendo (botão "Filtros (n)" do celular): UF, município, raio, valor, modalidade, órgão e prazo. O termo não conta. */
export function filtrosAtivos(f: FiltrosTela): number {
  return [f.uf, f.cidade, f.cidade && f.raio, f.valorMin, f.modalidades.length > 0, f.orgao, f.seteDias].filter(Boolean).length;
}
```

Crie `lib/urlBusca.ts`:
```ts
import { lerFiltros, normalizarTela } from './filtros';
import type { Cidade, FiltrosBusca, FiltrosTela, Orgao } from './tipos';

/** Tela do celular (abaixo de lg): Mapa ou Lista. No computador as duas aparecem juntas e a tela não muda nada. */
export type Tela = 'mapa' | 'lista';

/**
 * Endereço da página inicial com a busca, para voltar do edital e compartilhar:
 * /?q=luva&uf=SC&municipio=4209102&valor=50000&modalidades=6,8&orgao=…&raio=100&dias=7[&tela=lista].
 * `municipio` é o código IBGE (na API o mesmo valor se chama `ibge`).
 */
export function urlDaBusca(f: FiltrosTela, tela: Tela = 'mapa'): string {
  const p = new URLSearchParams();
  const q = f.q.trim();
  if (q) p.set('q', q);
  if (f.uf) p.set('uf', f.uf);
  if (f.cidade) p.set('municipio', f.cidade.ibge);
  if (f.valorMin) p.set('valor', String(f.valorMin));
  if (f.modalidades.length) p.set('modalidades', [...f.modalidades].sort((a, b) => a - b).join(','));
  if (f.orgao) p.set('orgao', f.orgao.cnpj);
  if (f.cidade && f.raio) p.set('raio', String(f.raio));
  if (f.seteDias) p.set('dias', '7');
  if (tela === 'lista') p.set('tela', 'lista');
  const texto = p.toString();
  return texto ? `/?${texto}` : '/';
}

/** Lê a busca do endereço com as mesmas validações da API (`lerFiltros`); a página sempre começa do primeiro edital. */
export function lerBuscaDaUrl(p: URLSearchParams): { busca: FiltrosBusca; tela: Tela } {
  const api = new URLSearchParams(p);
  api.delete('ibge');
  api.delete('municipio');
  const municipio = p.get('municipio');
  if (municipio) api.set('ibge', municipio);
  return { busca: { ...lerFiltros(api), deslocamento: 0 }, tela: p.get('tela') === 'lista' ? 'lista' : 'mapa' };
}

/**
 * Busca do endereço + nomes lidos do banco (município e órgão) → filtros da tela.
 * Município ou órgão que o banco não conhece saem (e o raio sai com o município); município de outra UF leva a UF dele.
 */
export function montarTela(busca: FiltrosBusca, cidade: Cidade | null, orgao: Orgao | null): FiltrosTela {
  return normalizarTela({
    q: busca.q ?? '',
    uf: busca.uf ?? '',
    cidade: busca.ibge && cidade?.ibge === busca.ibge ? cidade : null,
    valorMin: busca.valorMin,
    modalidades: busca.modalidades ?? [],
    seteDias: busca.dias === 7,
    orgao: busca.orgao && orgao?.cnpj === busca.orgao ? orgao : null,
    raio: busca.raio,
  });
}

/** `searchParams` de uma página do Next → URLSearchParams (nome repetido: vale o primeiro). */
export function paraUrlSearchParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const p = new URLSearchParams();
  for (const [nome, valor] of Object.entries(sp)) {
    const v = Array.isArray(valor) ? valor[0] : valor;
    if (v !== undefined) p.set(nome, v);
  }
  return p;
}

/** Mesmo endereço de busca, em outra tela (links Mapa e Lista da barra do celular). */
export function comTela(endereco: string, tela: Tela): string {
  const p = new URLSearchParams(endereco.split('?')[1] ?? '');
  if (tela === 'lista') p.set('tela', 'lista');
  else p.delete('tela');
  const texto = p.toString();
  return texto ? `/?${texto}` : '/';
}
```

Crie `lib/cliente/volta.ts`:
```ts
import type { Limite } from '../limites';
import type { FiltrosTela, ResultadoBusca } from '../tipos';
import type { Tela } from '../urlBusca';

/** Estado da página inicial guardado ao sair dela, para voltar do edital com a mesma busca, lista, tela e posição. */
export type Volta = {
  /** Endereço (urlDaBusca) em que o estado vale. */
  endereco: string;
  filtros: FiltrosTela;
  /** Última busca que o mapa mostrou (com o limite do dia, o mapa fica com a última permitida). */
  filtrosMapa: FiltrosTela;
  resultado: ResultadoBusca;
  limite: Limite | null;
  tela: Tela;
  selecionadoId: string | null;
  /** Posição da lista (scrollTop). */
  rolagem: number;
};

export type Armazem = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const CHAVE_VOLTA = 'em_volta';
const CHAVE_ULTIMA = 'em_ultima_busca';

/** sessionStorage da aba; null no servidor ou quando o navegador bloqueia. */
function daAba(): Armazem | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function guardarVolta(v: Volta, a: Armazem | null = daAba()): void {
  try {
    a?.setItem(CHAVE_VOLTA, JSON.stringify(v));
  } catch {
    // cheio ou bloqueado: a volta só não restaura
  }
}

/** Lê e apaga (vale uma vez). Só devolve o estado do mesmo endereço. */
export function tomarVolta(endereco: string, a: Armazem | null = daAba()): Volta | null {
  try {
    const bruto = a?.getItem(CHAVE_VOLTA) ?? null;
    a?.removeItem(CHAVE_VOLTA);
    if (!bruto) return null;
    const v = JSON.parse(bruto) as Partial<Volta> | null;
    return v && v.endereco === endereco && v.filtros && v.filtrosMapa && v.resultado ? (v as Volta) : null;
  } catch {
    return null;
  }
}

export function guardarUltimaBusca(endereco: string, a: Armazem | null = daAba()): void {
  try {
    a?.setItem(CHAVE_ULTIMA, endereco);
  } catch {
    // sem armazenamento: a barra leva à página inicial vazia
  }
}

/** Última busca da página inicial ('/' quando não há, ou quando o valor guardado não é um endereço da página inicial). */
export function lerUltimaBusca(a: Armazem | null = daAba()): string {
  try {
    const v = a?.getItem(CHAVE_ULTIMA) ?? null;
    return v && (v === '/' || v.startsWith('/?')) ? v : '/';
  } catch {
    return '/';
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/urlBusca.test.ts lib/filtros.test.ts lib/cliente/volta.test.ts`
Expected: PASS.

- [ ] **Step 5: Suíte, tipos e commit**

Run: `npm test && npm run typecheck`
Expected: tudo passa.
```bash
git add lib/urlBusca.ts lib/urlBusca.test.ts lib/cliente/volta.ts lib/cliente/volta.test.ts lib/filtros.ts lib/filtros.test.ts
git commit -m "feat: filtros no endereço, volta do edital e contagem de filtros ativos" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 5: Visitante garantido (`proxy.ts`) e contexto das páginas

**Files:**
- Create: `lib/visitante.ts`, `lib/visitante.test.ts`, `proxy.ts`
- Modify: `lib/servidor/registro.ts`

**Interfaces:**
- Consumes: `TipoEvento`, `TipoEventoServidor` (Task 1) de `lib/eventos.ts`.
- Produces:
  - `lib/visitante.ts`: `COOKIE_VISITANTE = 'em_visitante'`, `COOKIE_INTERNO = 'em_interno'`, `OPCOES_COOKIE`, `visitanteValido(v: string | null | undefined): v is string`, `visitanteDoCookie(valor: string | undefined, gerar: () => string): { visitante: string; novo: boolean }`.
  - `proxy.ts` (raiz): grava `em_visitante` quando falta ou é inválido, em `/`, `/edital/:path*`, `/planos`, `/alertas`, `/sobre` e `/api/:path*`.
  - `lib/servidor/registro.ts`: `contextoDaPagina(): Promise<Contexto | null>` (para componentes de servidor; null = sem visitante válido); `gravarEvento(ctx, tipo: TipoEvento | TipoEventoServidor, detalhe)`; `COOKIE_VISITANTE`/`COOKIE_INTERNO` continuam exportados daqui. `contexto()` (rotas) segue igual por fora.

- [ ] **Step 1: Escrever o teste (falhando)**

Crie `lib/visitante.test.ts`:
```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COOKIE_INTERNO, COOKIE_VISITANTE, OPCOES_COOKIE, visitanteDoCookie, visitanteValido } from './visitante';

const UUID = '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b';

describe('cookie do visitante', () => {
  it('nomes de sempre, um ano, só para o servidor, o site todo', () => {
    expect(COOKIE_VISITANTE).toBe('em_visitante');
    expect(COOKIE_INTERNO).toBe('em_interno');
    expect(OPCOES_COOKIE).toMatchObject({ maxAge: 60 * 60 * 24 * 365, httpOnly: true, sameSite: 'lax', path: '/' });
  });
  it('aceita só UUID minúsculo', () => {
    expect(visitanteValido(UUID)).toBe(true);
    expect(visitanteValido(UUID.toUpperCase())).toBe(false);
    expect(visitanteValido('')).toBe(false);
    expect(visitanteValido(undefined)).toBe(false);
    expect(visitanteValido('abc')).toBe(false);
  });
  it('mantém o válido e gera um novo quando falta ou é inválido', () => {
    expect(visitanteDoCookie(UUID, () => 'nunca')).toEqual({ visitante: UUID, novo: false });
    expect(visitanteDoCookie(undefined, () => UUID)).toEqual({ visitante: UUID, novo: true });
    expect(visitanteDoCookie('lixo', () => UUID)).toEqual({ visitante: UUID, novo: true });
  });
  it('o proxy roda nas páginas que contam e nas rotas da API', () => {
    const proxy = readFileSync(new URL('../proxy.ts', import.meta.url), 'utf8');
    expect(proxy).toContain('export function proxy(');
    for (const caminho of ["'/'", "'/edital/:path*'", "'/planos'", "'/api/:path*'"]) expect(proxy).toContain(caminho);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/visitante.test.ts`
Expected: FAIL com "Failed to resolve import './visitante'".

- [ ] **Step 3: Implementar**

Crie `lib/visitante.ts`:
```ts
/** Cookie do navegador anônimo (conta o uso do dia e agrupa os eventos) e marca do navegador interno (o dono). */
export const COOKIE_VISITANTE = 'em_visitante';
export const COOKIE_INTERNO = 'em_interno';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const OPCOES_COOKIE = {
  maxAge: 60 * 60 * 24 * 365,
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export function visitanteValido(v: string | null | undefined): v is string {
  return typeof v === 'string' && UUID.test(v);
}

/** Visitante do cookie, ou um novo (`gerar`) quando falta ou é inválido. */
export function visitanteDoCookie(valor: string | undefined, gerar: () => string): { visitante: string; novo: boolean } {
  return visitanteValido(valor) ? { visitante: valor, novo: false } : { visitante: gerar(), novo: true };
}
```

Crie `proxy.ts` (na raiz do projeto, ao lado de `next.config.ts`):
```ts
import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_VISITANTE, OPCOES_COOKIE, visitanteDoCookie } from '@/lib/visitante';

/**
 * Garante o cookie em_visitante antes das páginas e rotas que contam o uso do dia. A página inicial e a do edital são
 * componentes de servidor (não gravam cookie), e na primeira visita /api/busca e /api/mapa chegam juntas (sem isto,
 * cada uma criaria um visitante). O cookie novo vai na resposta e na própria requisição (o cookies() da página já o lê).
 */
export function proxy(request: NextRequest) {
  const { visitante, novo } = visitanteDoCookie(request.cookies.get(COOKIE_VISITANTE)?.value, () => crypto.randomUUID());
  if (!novo) return NextResponse.next();
  request.cookies.set(COOKIE_VISITANTE, visitante);
  const resposta = NextResponse.next({ request: { headers: request.headers } });
  resposta.cookies.set(COOKIE_VISITANTE, visitante, OPCOES_COOKIE);
  return resposta;
}

export const config = {
  matcher: ['/', '/edital/:path*', '/planos', '/alertas', '/sobre', '/api/:path*'],
};
```

Em `lib/servidor/registro.ts`, troque tudo do começo do arquivo até o fim da função `contexto()` (inclusive) por:
```ts
import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import type { Detalhe, PedidoAlerta, TipoEvento, TipoEventoServidor } from '../eventos';
import { COOKIE_INTERNO, COOKIE_VISITANTE, OPCOES_COOKIE, visitanteDoCookie, visitanteValido } from '../visitante';
import { supabaseServidor } from './supabase';

export { COOKIE_INTERNO, COOKIE_VISITANTE };

export type Contexto = { visitante: string; interno: boolean; ipHash: string | null };

/** Hash do IP com o sal do servidor (IP_SAL). Sem sal ou sem IP: null (os limites por IP não valem). */
function hashDoIp(h: { get(nome: string): string | null }): string | null {
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || h.get('x-real-ip') || null;
  const sal = process.env.IP_SAL;
  return ip && sal ? createHash('sha256').update(`${sal}:${ip}`).digest('hex') : null;
}

/** Lê (ou cria) o visitante anônimo, a marca de interno e o hash do IP. Só em rotas (pode gravar cookie). */
export async function contexto(): Promise<Contexto> {
  const c = await cookies();
  const { visitante, novo } = visitanteDoCookie(c.get(COOKIE_VISITANTE)?.value, randomUUID);
  if (novo) c.set(COOKIE_VISITANTE, visitante, OPCOES_COOKIE);
  return { visitante, interno: c.get(COOKIE_INTERNO)?.value === '1', ipHash: hashDoIp(await headers()) };
}

/**
 * Contexto para páginas (componente de servidor não grava cookie; o proxy.ts já garantiu em_visitante).
 * null = sem visitante válido: a página não conta uso.
 */
export async function contextoDaPagina(): Promise<Contexto | null> {
  const c = await cookies();
  const visitante = c.get(COOKIE_VISITANTE)?.value;
  if (!visitanteValido(visitante)) return null;
  return { visitante, interno: c.get(COOKIE_INTERNO)?.value === '1', ipHash: hashDoIp(await headers()) };
}
```
e, mais abaixo no mesmo arquivo, troque
```ts
export async function gravarEvento(ctx: Contexto, tipo: TipoEvento | 'pediu_alerta', detalhe: Detalhe): Promise<void> {
```
por
```ts
export async function gravarEvento(ctx: Contexto, tipo: TipoEvento | TipoEventoServidor, detalhe: Detalhe): Promise<void> {
```
(`marcarInterno`, `dentroDoLimite`, `exportacaoDentroDoLimite` e `gravarPedido` ficam como estão; `marcarInterno` usa `OPCOES_COOKIE`, agora importado de `../visitante`.)

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/visitante.test.ts`
Expected: PASS.

- [ ] **Step 5: Suíte, tipos e build**

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa; a saída do build lista o `Proxy`.

- [ ] **Step 6: Conferir o cookie no servidor local**

`/sobre` não lê o banco. Em um terminal, `npm run dev`; em outro:
```bash
curl -s -D - -o /dev/null http://localhost:3000/sobre | grep -i "set-cookie: em_visitante"
curl -s -D - -o /dev/null -H "cookie: em_visitante=6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b" http://localhost:3000/sobre | grep -ci "set-cookie: em_visitante"
```
Expected: a primeira mostra `set-cookie: em_visitante=<uuid>; Path=/; ... HttpOnly; SameSite=lax`; a segunda imprime `0` (cookie válido não é trocado). Parar o `npm run dev`.

- [ ] **Step 7: Commit**

```bash
git add lib/visitante.ts lib/visitante.test.ts proxy.ts lib/servidor/registro.ts
git commit -m "feat: proxy garante o visitante e contexto das páginas de servidor" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 6: Uso do dia no servidor (`lib/servidor/uso.ts`)

**Files:**
- Create: `lib/servidor/uso.ts`, `lib/servidor/uso.test.ts`

**Interfaces:**
- Consumes: `registrar_uso`, `uso_do_dia` (0009); `combinacaoBusca`, `LIMITE_GRATIS`, `Limite`, `TipoUso`, `UsoHoje` (Task 3); `Contexto`, `gravarEvento` (Task 5); `hojeBrasilia`, `inicioDoDia` de `worker/datas.ts`; `supabaseServidor`.
- Produces (`lib/servidor/uso.ts`, `server-only`):
  - `type Decisao = { permitido: true; usados: number | null } | { permitido: false; limite: Limite }` (`usados` null = não contou: busca vazia, interno, sem visitante ou banco fora)
  - `decidirBusca(ctx: Contexto | null, f: FiltrosBusca, opcoes: { avisar: boolean }): Promise<Decisao>`
  - `decidirEdital(ctx: Contexto | null, slug: string): Promise<Decisao>` (sempre avisa)
  - `usoDoDia(ctx: Contexto | null): Promise<UsoHoje | null>`
  - `avisarLimite(ctx: Contexto, tipo: TipoUso, agora?: Date): Promise<void>` (grava `limite_atingido` uma vez por dia e tipo)
  - `chaveDaBusca(combinacao: string): string` (32 hex), `inicioDoDiaDeBrasilia(agora: Date): string` (ISO UTC)

- [ ] **Step 1: Escrever o teste (falhando)**

Crie `lib/servidor/uso.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lerFiltros } from '../filtros';
import { combinacaoBusca } from '../limites';

vi.mock('server-only', () => ({}));

type Resposta = { data: unknown; error: { message: string } | null };
type Consulta = {
  select: (...a: unknown[]) => Consulta;
  eq: (coluna: string, valor: unknown) => Consulta;
  gte: (coluna: string, valor: unknown) => Promise<{ count: number; error: null }>;
};

const m = vi.hoisted(() => ({
  rpcs: [] as Array<{ nome: string; args: Record<string, unknown> }>,
  resposta: { data: null, error: null } as { data: unknown; error: { message: string } | null },
  filtrosEventos: [] as Array<[string, unknown]>,
  eventosHoje: 0,
  gravarEvento: vi.fn(async (..._a: unknown[]) => undefined),
}));

vi.mock('./supabase', () => ({
  supabaseServidor: () => ({
    rpc: (nome: string, args: Record<string, unknown>) => {
      m.rpcs.push({ nome, args });
      return { single: (): Promise<Resposta> => Promise.resolve(m.resposta) };
    },
    from: (tabela: string) => {
      const consulta: Consulta = {
        select: () => consulta,
        eq: (coluna, valor) => {
          m.filtrosEventos.push([`${tabela}.${coluna}`, valor]);
          return consulta;
        },
        gte: (coluna, valor) => {
          m.filtrosEventos.push([`${tabela}.${coluna} >=`, valor]);
          return Promise.resolve({ count: m.eventosHoje, error: null });
        },
      };
      return consulta;
    },
  }),
}));
vi.mock('./registro', () => ({ gravarEvento: m.gravarEvento }));

const { avisarLimite, chaveDaBusca, decidirBusca, decidirEdital, inicioDoDiaDeBrasilia, usoDoDia } = await import('./uso');

const CTX = { visitante: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b', interno: false, ipHash: null };
const SLUG = '00394452000103-2026-21982';
const busca = (qs: string) => lerFiltros(new URLSearchParams(qs));
const chave = (qs: string) => chaveDaBusca(combinacaoBusca(busca(qs)) as string);

beforeEach(() => {
  m.rpcs.length = 0;
  m.filtrosEventos.length = 0;
  m.eventosHoje = 0;
  m.gravarEvento.mockClear();
  m.resposta = { data: { permitido: true, usados: 1 }, error: null };
});

describe('chaveDaBusca', () => {
  it('32 caracteres hex; a mesma para a mesma combinação', () => {
    expect(chave('q=luva')).toMatch(/^[0-9a-f]{32}$/);
    expect(chave('q=luva')).toBe(chave('q=LUVA&dias=7'));
    expect(chave('q=luva')).not.toBe(chave('q=luva&uf=SC'));
  });
});

describe('decidirBusca', () => {
  it('busca nova: registra a combinação com o limite do grátis', async () => {
    m.resposta = { data: { permitido: true, usados: 2 }, error: null };
    expect(await decidirBusca(CTX, busca('q=luva&uf=SC'), { avisar: true })).toEqual({ permitido: true, usados: 2 });
    expect(m.rpcs).toEqual([
      { nome: 'registrar_uso', args: { p_visitante: CTX.visitante, p_tipo: 'busca', p_chave: chave('q=luva&uf=SC'), p_limite: 3 } },
    ]);
  });
  it('lista, mapa, prazo e "Carregar mais" da mesma busca usam a mesma chave', async () => {
    await decidirBusca(CTX, busca('q=luva&ibge=4209102'), { avisar: true });
    await decidirBusca(CTX, busca('q=luva&ibge=4209102&dias=7&deslocamento=50'), { avisar: false });
    expect(m.rpcs[0].args.p_chave).toBe(m.rpcs[1].args.p_chave);
  });
  it('não conta: página inicial vazia, navegador interno, sem visitante', async () => {
    expect(await decidirBusca(CTX, busca(''), { avisar: true })).toEqual({ permitido: true, usados: null });
    expect(await decidirBusca({ ...CTX, interno: true }, busca('q=luva'), { avisar: true })).toEqual({ permitido: true, usados: null });
    expect(await decidirBusca(null, busca('q=luva'), { avisar: true })).toEqual({ permitido: true, usados: null });
    expect(m.rpcs).toEqual([]);
  });
  it('4ª busca nova: recusada com o limite; limite_atingido só na primeira vez do dia', async () => {
    m.resposta = { data: { permitido: false, usados: 3 }, error: null };
    expect(await decidirBusca(CTX, busca('q=botina'), { avisar: true })).toEqual({
      permitido: false, limite: { tipo: 'busca', usados: 3, maximo: 3 },
    });
    expect(m.filtrosEventos).toContainEqual(['eventos.visitante', CTX.visitante]);
    expect(m.filtrosEventos).toContainEqual(['eventos.tipo', 'limite_atingido']);
    expect(m.filtrosEventos).toContainEqual(['eventos.detalhe->>tipo', 'busca']);
    expect(m.gravarEvento).toHaveBeenCalledWith(CTX, 'limite_atingido', { tipo: 'busca' });
    m.gravarEvento.mockClear();
    m.eventosHoje = 1;
    await decidirBusca(CTX, busca('q=capacete'), { avisar: true });
    expect(m.gravarEvento).not.toHaveBeenCalled();
  });
  it('o mapa e a exportação não avisam', async () => {
    m.resposta = { data: { permitido: false, usados: 3 }, error: null };
    await decidirBusca(CTX, busca('q=botina'), { avisar: false });
    expect(m.filtrosEventos).toEqual([]);
    expect(m.gravarEvento).not.toHaveBeenCalled();
  });
  it('banco fora: libera (o limite é um lembrete)', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    m.resposta = { data: null, error: { message: 'timeout' } };
    expect(await decidirBusca(CTX, busca('q=luva'), { avisar: true })).toEqual({ permitido: true, usados: null });
    erro.mockRestore();
  });
});

describe('decidirEdital', () => {
  it('a chave é o slug e o tipo é edital', async () => {
    await decidirEdital(CTX, SLUG);
    expect(m.rpcs).toEqual([{ nome: 'registrar_uso', args: { p_visitante: CTX.visitante, p_tipo: 'edital', p_chave: SLUG, p_limite: 3 } }]);
  });
  it('4º edital: recusado e avisa', async () => {
    m.resposta = { data: { permitido: false, usados: 3 }, error: null };
    expect(await decidirEdital(CTX, SLUG)).toEqual({ permitido: false, limite: { tipo: 'edital', usados: 3, maximo: 3 } });
    expect(m.gravarEvento).toHaveBeenCalledWith(CTX, 'limite_atingido', { tipo: 'edital' });
  });
  it('interno abre sem limite e sem consulta', async () => {
    expect(await decidirEdital({ ...CTX, interno: true }, SLUG)).toEqual({ permitido: true, usados: null });
    expect(m.rpcs).toEqual([]);
  });
});

describe('usoDoDia', () => {
  it('lê buscas e editais de hoje', async () => {
    m.resposta = { data: { buscas: 2, editais: 1 }, error: null };
    expect(await usoDoDia(CTX)).toEqual({ interno: false, buscas: 2, editais: 1 });
    expect(m.rpcs).toEqual([{ nome: 'uso_do_dia', args: { p_visitante: CTX.visitante } }]);
  });
  it('interno: sem consulta; sem visitante: null; banco fora: null', async () => {
    expect(await usoDoDia({ ...CTX, interno: true })).toEqual({ interno: true, buscas: 0, editais: 0 });
    expect(await usoDoDia(null)).toBeNull();
    expect(m.rpcs).toEqual([]);
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    m.resposta = { data: null, error: { message: 'timeout' } };
    expect(await usoDoDia(CTX)).toBeNull();
    erro.mockRestore();
  });
});

describe('virada do dia em Brasília', () => {
  it('o dia começa às 03h UTC', () => {
    expect(inicioDoDiaDeBrasilia(new Date('2026-10-18T02:59:59Z'))).toBe('2026-10-17T03:00:00.000Z');
    expect(inicioDoDiaDeBrasilia(new Date('2026-10-18T03:00:00Z'))).toBe('2026-10-18T03:00:00.000Z');
  });
  it('avisarLimite procura o evento desde o começo do dia de Brasília', async () => {
    await avisarLimite(CTX, 'busca', new Date('2026-10-18T02:00:00Z'));
    expect(m.filtrosEventos).toContainEqual(['eventos.criado_em >=', '2026-10-17T03:00:00.000Z']);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/servidor/uso.test.ts`
Expected: FAIL com "Failed to resolve import './uso'" (ou "Cannot find module").

- [ ] **Step 3: Implementar**

Crie `lib/servidor/uso.ts`:
```ts
import 'server-only';
import { createHash } from 'node:crypto';
import { hojeBrasilia, inicioDoDia } from '@/worker/datas';
import { combinacaoBusca, LIMITE_GRATIS, type Limite, type TipoUso, type UsoHoje } from '../limites';
import type { FiltrosBusca } from '../tipos';
import { gravarEvento, type Contexto } from './registro';
import { supabaseServidor } from './supabase';

/** Decisão do uso. `usados` = quantos deste tipo hoje; null quando não contou (busca vazia, interno, sem visitante, banco fora). */
export type Decisao = { permitido: true; usados: number | null } | { permitido: false; limite: Limite };

const LIBERADO: Decisao = { permitido: true, usados: null };

/** Chave gravada em uso_diario para uma combinação de busca (sha256, 32 caracteres hex). */
export function chaveDaBusca(combinacao: string): string {
  return createHash('sha256').update(combinacao).digest('hex').slice(0, 32);
}

/** Início do dia de Brasília (ISO UTC): a virada do limite do grátis. */
export function inicioDoDiaDeBrasilia(agora: Date): string {
  return inicioDoDia(hojeBrasilia(agora));
}

async function registrar(ctx: Contexto, tipo: TipoUso, chave: string): Promise<Decisao> {
  const { data, error } = await supabaseServidor()
    .rpc('registrar_uso', { p_visitante: ctx.visitante, p_tipo: tipo, p_chave: chave, p_limite: LIMITE_GRATIS[tipo] })
    .single();
  if (error) throw new Error(`registrar_uso: ${error.message}`);
  const linha = (data ?? {}) as { permitido?: unknown; usados?: unknown };
  const usados = Number(linha.usados ?? 0);
  return linha.permitido === false
    ? { permitido: false, limite: { tipo, usados, maximo: LIMITE_GRATIS[tipo] } }
    : { permitido: true, usados };
}

/** Grava limite_atingido na primeira vez do dia (por tipo) em que o limite bloqueia. Falha só vai para o log. */
export async function avisarLimite(ctx: Contexto, tipo: TipoUso, agora: Date = new Date()): Promise<void> {
  try {
    const { count, error } = await supabaseServidor()
      .from('eventos')
      .select('id', { count: 'exact', head: true })
      .eq('visitante', ctx.visitante)
      .eq('tipo', 'limite_atingido')
      .eq('detalhe->>tipo', tipo)
      .gte('criado_em', inicioDoDiaDeBrasilia(agora));
    if (error) throw new Error(error.message);
    if ((count ?? 0) === 0) await gravarEvento(ctx, 'limite_atingido', { tipo });
  } catch (erro) {
    console.error('limite_atingido:', erro);
  }
}

async function decidir(ctx: Contexto | null, tipo: TipoUso, chave: string | null, avisar: boolean): Promise<Decisao> {
  if (!ctx || ctx.interno || chave === null) return LIBERADO;
  let decisao: Decisao;
  try {
    decisao = await registrar(ctx, tipo, chave);
  } catch (erro) {
    // O limite é um lembrete: com o banco fora, libera (e a consulta da própria busca provavelmente falha logo depois).
    console.error(erro);
    return LIBERADO;
  }
  if (!decisao.permitido && avisar) await avisarLimite(ctx, tipo);
  return decisao;
}

/**
 * Busca: conta cada combinação nova do dia (lib/limites.ts). `avisar` grava limite_atingido
 * (a lista e a página inicial avisam; o mapa e a exportação, que acompanham a mesma busca, não).
 */
export function decidirBusca(ctx: Contexto | null, f: FiltrosBusca, opcoes: { avisar: boolean }): Promise<Decisao> {
  const combinacao = combinacaoBusca(f);
  return decidir(ctx, 'busca', combinacao === null ? null : chaveDaBusca(combinacao), opcoes.avisar);
}

/** Edital: conta cada slug novo do dia (reabrir não conta). */
export function decidirEdital(ctx: Contexto | null, slug: string): Promise<Decisao> {
  return decidir(ctx, 'edital', slug, true);
}

/** Uso de hoje para o selo. Interno: sem consulta. Sem visitante ou banco fora: null (o selo não aparece). */
export async function usoDoDia(ctx: Contexto | null): Promise<UsoHoje | null> {
  if (!ctx) return null;
  if (ctx.interno) return { interno: true, buscas: 0, editais: 0 };
  const { data, error } = await supabaseServidor().rpc('uso_do_dia', { p_visitante: ctx.visitante }).single();
  if (error) {
    console.error(`uso_do_dia: ${error.message}`);
    return null;
  }
  const linha = (data ?? {}) as { buscas?: unknown; editais?: unknown };
  return { interno: false, buscas: Number(linha.buscas ?? 0), editais: Number(linha.editais ?? 0) };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/servidor/uso.test.ts`
Expected: PASS.

- [ ] **Step 5: Suíte, tipos e commit**

Run: `npm test && npm run typecheck`
Expected: tudo passa.
```bash
git add lib/servidor/uso.ts lib/servidor/uso.test.ts
git commit -m "feat: decisão do uso do dia no servidor (busca, edital e selo)" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 7: Rotas com o sinal de limite

**Files:**
- Create: `app/api/uso/route.ts`, `app/api/contagem/route.ts`, `app/api/rotas-limite.test.ts`
- Modify: `app/api/busca/route.ts`, `app/api/mapa/route.ts`, `app/api/exportar/route.ts`, `lib/http.ts`, `vitest.config.ts`

**Interfaces:**
- Consumes: `decidirBusca`, `usoDoDia` (Task 6); `contexto` (Task 5); `corpoLimite`, `STATUS_LIMITE`, `RespostaBusca` (Task 3); `buscarEditais`, `pontosDoMapa`, `exportarEditais` (`lib/servidor/consultas.ts`, sem mudança).
- Produces:
  - `lib/http.ts`: `SEM_CACHE: HeadersInit = { 'Cache-Control': 'private, no-store' }`.
  - `GET /api/busca` → 200 `RespostaBusca` (`{ total, editais, buscasUsadas }`) ou 402 `CorpoLimite`; `SEM_CACHE`.
  - `GET /api/mapa` → 200 `PontoMapa[]` ou 402 `CorpoLimite` (sem `limite_atingido`); `SEM_CACHE`. O navegador passa a mandar os mesmos parâmetros da lista (Task 9); o servidor continua ignorando a cidade sem raio no mapa.
  - `GET /api/exportar` → 402 `CorpoLimite` antes do limite por hora quando a busca é nova além da 3ª.
  - `GET /api/uso` → 200 `UsoHoje` ou 502; `SEM_CACHE`.
  - `GET /api/contagem` → 200 `{ total: number }` (não conta como busca), `CACHE_PUBLICO`.

- [ ] **Step 1: Incluir testes de `app/` no vitest**

Em `vitest.config.ts`, troque
```ts
    include: ['worker/**/*.test.ts', 'lib/**/*.test.ts', 'scripts/**/*.test.ts'],
```
por
```ts
    include: ['worker/**/*.test.ts', 'lib/**/*.test.ts', 'scripts/**/*.test.ts', 'app/**/*.test.ts'],
```

- [ ] **Step 2: Escrever o teste (falhando)**

Crie `app/api/rotas-limite.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lerLimite } from '@/lib/limites';

const m = vi.hoisted(() => ({
  decidirBusca: vi.fn(),
  usoDoDia: vi.fn(),
  buscarEditais: vi.fn(),
  pontosDoMapa: vi.fn(),
  exportarEditais: vi.fn(),
}));

vi.mock('@/lib/servidor/registro', () => ({
  contexto: async () => ({ visitante: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b', interno: false, ipHash: null }),
  exportacaoDentroDoLimite: async () => true,
  gravarEvento: async () => undefined,
}));
vi.mock('@/lib/servidor/uso', () => ({ decidirBusca: m.decidirBusca, usoDoDia: m.usoDoDia }));
vi.mock('@/lib/servidor/consultas', () => ({
  buscarEditais: m.buscarEditais,
  pontosDoMapa: m.pontosDoMapa,
  exportarEditais: m.exportarEditais,
}));

const busca = await import('./busca/route');
const mapa = await import('./mapa/route');
const exportar = await import('./exportar/route');
const uso = await import('./uso/route');
const contagem = await import('./contagem/route');

const BLOQUEADA = { permitido: false, limite: { tipo: 'busca', usados: 3, maximo: 3 } };
const pedido = (caminho: string) => new Request(`http://localhost${caminho}`);

beforeEach(() => {
  vi.clearAllMocks();
  m.decidirBusca.mockResolvedValue({ permitido: true, usados: 2 });
  m.buscarEditais.mockResolvedValue({ total: 1, editais: [] });
  m.pontosDoMapa.mockResolvedValue([]);
  m.exportarEditais.mockResolvedValue({ editais: [], total: 0 });
});

describe('/api/busca', () => {
  it('permitida: lista + buscas usadas hoje, sem cache compartilhado', async () => {
    const r = await busca.GET(pedido('/api/busca?q=luva&uf=SC'));
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
    expect(await r.json()).toEqual({ total: 1, editais: [], buscasUsadas: 2 });
    expect(m.decidirBusca).toHaveBeenCalledWith(
      expect.objectContaining({ interno: false }),
      expect.objectContaining({ q: 'luva', uf: 'SC' }),
      { avisar: true },
    );
  });
  it('4ª busca nova: 402 com o sinal de limite, sem consultar os editais', async () => {
    m.decidirBusca.mockResolvedValue(BLOQUEADA);
    const r = await busca.GET(pedido('/api/busca?q=botina'));
    expect(r.status).toBe(402);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
    expect(lerLimite(r.status, await r.json())).toEqual({ tipo: 'busca', usados: 3, maximo: 3 });
    expect(m.buscarEditais).not.toHaveBeenCalled();
  });
});

describe('/api/mapa', () => {
  it('permitido: pontos, sem cache compartilhado e sem avisar', async () => {
    const r = await mapa.GET(pedido('/api/mapa?q=luva&ibge=4209102'));
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
    expect(await r.json()).toEqual([]);
    expect(m.decidirBusca).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ q: 'luva', ibge: '4209102' }), { avisar: false });
  });
  it('busca além do limite: 402 e o mapa não consulta', async () => {
    m.decidirBusca.mockResolvedValue(BLOQUEADA);
    const r = await mapa.GET(pedido('/api/mapa?q=botina'));
    expect(r.status).toBe(402);
    expect(m.pontosDoMapa).not.toHaveBeenCalled();
  });
});

describe('/api/exportar', () => {
  it('busca além do limite: 402 com a mensagem do cartão, sem exportar', async () => {
    m.decidirBusca.mockResolvedValue(BLOQUEADA);
    const r = await exportar.GET(pedido('/api/exportar?q=botina'));
    expect(r.status).toBe(402);
    expect(((await r.json()) as { erro: string }).erro).toBe('Você usou as 3 buscas grátis de hoje. Volta amanhã às 0h, ou conheça os planos.');
    expect(m.exportarEditais).not.toHaveBeenCalled();
  });
  it('busca já contada: planilha normal', async () => {
    const r = await exportar.GET(pedido('/api/exportar?q=luva'));
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(m.decidirBusca).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ q: 'luva' }), { avisar: false });
  });
});

describe('/api/uso', () => {
  it('uso de hoje, sem cache', async () => {
    m.usoDoDia.mockResolvedValue({ interno: false, buscas: 1, editais: 2 });
    const r = await uso.GET();
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
    expect(await r.json()).toEqual({ interno: false, buscas: 1, editais: 2 });
  });
  it('sem como ler: 502 (o selo não aparece)', async () => {
    m.usoDoDia.mockResolvedValue(null);
    expect((await uso.GET()).status).toBe(502);
  });
});

describe('/api/contagem', () => {
  it('só o total, com cache público, sem contar como busca', async () => {
    m.buscarEditais.mockResolvedValue({ total: 42, editais: [{ id: 'x' }] });
    const r = await contagem.GET(pedido('/api/contagem?q=luva&deslocamento=50'));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ total: 42 });
    expect(r.headers.get('cache-control')).toContain('s-maxage=300');
    expect(m.buscarEditais).toHaveBeenCalledWith(expect.objectContaining({ q: 'luva', deslocamento: 0 }));
    expect(m.decidirBusca).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run app/api/rotas-limite.test.ts`
Expected: FAIL (`./uso/route` e `./contagem/route` não existem; `/api/busca` responde sem `buscasUsadas`).

- [ ] **Step 4: Implementar**

Acrescente ao fim de `lib/http.ts`:
```ts
/** Respostas que dependem do visitante (uso do dia, sinal de limite): nada de cache no CDN nem no navegador. */
export const SEM_CACHE: HeadersInit = { 'Cache-Control': 'private, no-store' };
```

Troque o conteúdo de `app/api/busca/route.ts` por:
```ts
import { lerFiltros } from '@/lib/filtros';
import { SEM_CACHE } from '@/lib/http';
import { corpoLimite, STATUS_LIMITE, type RespostaBusca } from '@/lib/limites';
import { buscarEditais } from '@/lib/servidor/consultas';
import { contexto } from '@/lib/servidor/registro';
import { decidirBusca } from '@/lib/servidor/uso';

/** Lista de editais. Conta a busca no limite do grátis antes de consultar; além do limite, 402 com o sinal. */
export async function GET(request: Request) {
  const filtros = lerFiltros(new URL(request.url).searchParams);
  try {
    const decisao = await decidirBusca(await contexto(), filtros, { avisar: true });
    if (!decisao.permitido) {
      return Response.json(corpoLimite('busca', decisao.limite.usados), { status: STATUS_LIMITE, headers: SEM_CACHE });
    }
    const resposta: RespostaBusca = { ...(await buscarEditais(filtros)), buscasUsadas: decisao.usados };
    return Response.json(resposta, { headers: SEM_CACHE });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Não foi possível buscar agora. Tente de novo.' }, { status: 502, headers: SEM_CACHE });
  }
}
```

Troque o conteúdo de `app/api/mapa/route.ts` por:
```ts
import { lerFiltros } from '@/lib/filtros';
import { SEM_CACHE } from '@/lib/http';
import { corpoLimite, STATUS_LIMITE } from '@/lib/limites';
import { pontosDoMapa } from '@/lib/servidor/consultas';
import { contexto } from '@/lib/servidor/registro';
import { decidirBusca } from '@/lib/servidor/uso';

/**
 * Pontos do mapa. Recebe os mesmos parâmetros da lista (mesma chave no limite do dia: lista + mapa contam uma vez);
 * a cidade sem raio não filtra o mapa (pontosDoMapa). Além do limite, 402 (o navegador mantém o último mapa permitido).
 */
export async function GET(request: Request) {
  const filtros = lerFiltros(new URL(request.url).searchParams);
  try {
    const decisao = await decidirBusca(await contexto(), filtros, { avisar: false });
    if (!decisao.permitido) {
      return Response.json(corpoLimite('busca', decisao.limite.usados), { status: STATUS_LIMITE, headers: SEM_CACHE });
    }
    return Response.json(await pontosDoMapa(filtros), { headers: SEM_CACHE });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Não foi possível carregar o mapa agora.' }, { status: 502, headers: SEM_CACHE });
  }
}
```

Em `app/api/exportar/route.ts`:
1. Acrescente aos imports:
```ts
import { SEM_CACHE } from '@/lib/http';
import { corpoLimite, STATUS_LIMITE } from '@/lib/limites';
import { decidirBusca } from '@/lib/servidor/uso';
```
2. Troque
```ts
    const ctx = await contexto();
    if (!(await exportacaoDentroDoLimite(ctx.ipHash, LIMITES.exportacoesPorHora))) {
```
por
```ts
    const ctx = await contexto();
    // A exportação usa a busca da tela (já contada); combinação nova além do limite do dia não exporta.
    const decisao = await decidirBusca(ctx, filtros, { avisar: false });
    if (!decisao.permitido) {
      return Response.json(corpoLimite('busca', decisao.limite.usados), { status: STATUS_LIMITE, headers: SEM_CACHE });
    }
    if (!(await exportacaoDentroDoLimite(ctx.ipHash, LIMITES.exportacoesPorHora))) {
```

Crie `app/api/uso/route.ts`:
```ts
import { SEM_CACHE } from '@/lib/http';
import { contexto } from '@/lib/servidor/registro';
import { usoDoDia } from '@/lib/servidor/uso';

/** Uso de hoje deste navegador (selo do cabeçalho nas páginas que não calculam no servidor). */
export async function GET() {
  const uso = await usoDoDia(await contexto());
  if (!uso) return Response.json({ erro: 'Não foi possível ler o uso de hoje.' }, { status: 502, headers: SEM_CACHE });
  return Response.json(uso, { headers: SEM_CACHE });
}
```

Crie `app/api/contagem/route.ts`:
```ts
import { lerFiltros } from '@/lib/filtros';
import { CACHE_PUBLICO } from '@/lib/http';
import { buscarEditais } from '@/lib/servidor/consultas';

/** Só o total de uma busca (botão "Ver N editais" da folha de Filtros). Não devolve editais, então não conta como busca. */
export async function GET(request: Request) {
  const filtros = lerFiltros(new URL(request.url).searchParams);
  try {
    const { total } = await buscarEditais({ ...filtros, deslocamento: 0 });
    return Response.json({ total }, { headers: CACHE_PUBLICO });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Não foi possível contar agora.' }, { status: 502 });
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run app/api/rotas-limite.test.ts`
Expected: PASS.

- [ ] **Step 6: Suíte, tipos, build e commit**

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa; o build lista `/api/uso` e `/api/contagem`.
```bash
git add vitest.config.ts lib/http.ts app/api/busca/route.ts app/api/mapa/route.ts app/api/exportar/route.ts app/api/uso/route.ts app/api/contagem/route.ts app/api/rotas-limite.test.ts
git commit -m "feat: rotas respondem 402 no limite do dia, /api/uso e /api/contagem" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 8: Página do edital com bloqueio

**Files:**
- Create: `components/CartaoLimite.tsx`, `scripts/prefetch-edital.test.ts`
- Modify: `app/edital/[slug]/page.tsx`, `components/inicio/CartaoSelecionado.tsx`, `components/edital/ListaItens.tsx`

**Interfaces:**
- Consumes: `decidirEdital` (Task 6); `contextoDaPagina` (Task 5); `CONVITE_PLANOS`, `mensagemLimite`, `TipoUso` (Task 3).
- Produces:
  - `CartaoLimite({ tipo }: { tipo: TipoUso })` em `components/CartaoLimite.tsx` (componente sem estado; serve no servidor e no navegador): título `mensagemLimite(tipo)`, texto `CONVITE_PLANOS`, botões **Basic** (`/planos#basic`) e **Pro** (`/planos#pro`).
  - Página do edital: conta o edital (`decidirEdital`) antes de consultar itens, resumo e parecidos; bloqueada, mostra só o cabeçalho (prazo, tipo, modalidade, título, órgão, unidade, cidade, "Criar alerta…") e o cartão no lugar de **tudo** que vem abaixo do cabeçalho; liberada, igual a hoje. `RegistrarAbertura` (evento `abriu_edital`) e "Abrir edital oficial" só quando liberada.
  - Guarda: todo `<Link>` com `/edital/` em `app/` e `components/` tem `prefetch={false}`.

> **Outra sessão** está acrescentando a seção "Documentos do edital" nesta página. Se, ao implementar ou no merge, a página já tiver essa seção (ou outra nova abaixo do cabeçalho), ela vai **para dentro** do bloco `detalhes ? (<>…</>) : <CartaoLimite …/>`, e a consulta dela para dentro de `detalhesDoEdital` (no bloqueio, nada abaixo do cabeçalho aparece nem é consultado).

- [ ] **Step 1: Escrever a guarda (falhando)**

Crie `scripts/prefetch-edital.test.ts`:
```ts
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));

function arquivosTsx(pasta: string): string[] {
  return (readdirSync(join(RAIZ, pasta), { recursive: true }) as string[]).filter((f) => f.endsWith('.tsx')).map((f) => join(pasta, f));
}

/** Aberturas de `<Link ...>` até o `>` que fecha a tag fora de chaves (o `>` de `() => x` dentro de `{}` não fecha). */
function aberturasDeLink(texto: string): string[] {
  const achadas: string[] = [];
  const inicio = /<Link[\s>]/g;
  for (let m = inicio.exec(texto); m; m = inicio.exec(texto)) {
    let profundidade = 0;
    let fim = m.index + 5;
    for (; fim < texto.length; fim++) {
      const c = texto[fim];
      if (c === '{') profundidade++;
      else if (c === '}') profundidade--;
      else if (c === '>' && profundidade === 0) break;
    }
    achadas.push(texto.slice(m.index, fim + 1));
  }
  return achadas;
}

describe('links para /edital sem prefetch (cada edital aberto conta no limite do dia)', () => {
  it('o achador enxerga a tag inteira, mesmo com setas dentro de chaves, e ignora outros componentes', () => {
    expect(aberturasDeLink('<Link href={`/edital/${x}`} onClick={() => f()} prefetch={false}>t</Link>')).toEqual([
      '<Link href={`/edital/${x}`} onClick={() => f()} prefetch={false}>',
    ]);
    expect(aberturasDeLink('<LinkRelacionado href="/edital/x">')).toEqual([]);
  });
  it('todo <Link> com href para /edital/ tem prefetch={false}', () => {
    const faltando: string[] = [];
    for (const arquivo of [...arquivosTsx('app'), ...arquivosTsx('components')]) {
      for (const a of aberturasDeLink(readFileSync(join(RAIZ, arquivo), 'utf8'))) {
        if (a.includes('/edital/') && !a.includes('prefetch={false}')) faltando.push(`${arquivo}: ${a.replace(/\s+/g, ' ').slice(0, 100)}`);
      }
    }
    expect(faltando).toEqual([]);
  });
  it('a página do edital não ganha loading.tsx nem Cache Components (o Next passaria a pré-carregar e contar)', () => {
    expect(existsSync(join(RAIZ, 'app', 'edital', '[slug]', 'loading.tsx'))).toBe(false);
    expect(readFileSync(join(RAIZ, 'next.config.ts'), 'utf8')).not.toContain('cacheComponents');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run scripts/prefetch-edital.test.ts`
Expected: FAIL em "todo <Link> com href para /edital/ tem prefetch={false}", listando `components/edital/ListaItens.tsx` e `components/inicio/CartaoSelecionado.tsx`.

- [ ] **Step 3: Links sem prefetch**

Em `components/inicio/CartaoSelecionado.tsx`, troque
```tsx
      <Link href={`/edital/${e.slug}`} className="mt-1 inline-flex h-11 items-center justify-center rounded-sm bg-pin text-sm font-semibold text-on-pin">
```
por
```tsx
      <Link href={`/edital/${e.slug}`} prefetch={false} className="mt-1 inline-flex h-11 items-center justify-center rounded-sm bg-pin text-sm font-semibold text-on-pin">
```

Em `components/edital/ListaItens.tsx`, troque
```tsx
        <Link href={`/edital/${slug}?itens=todos`} className="mt-3 inline-block text-sm font-semibold text-pin-strong hover:underline">
```
por
```tsx
        <Link href={`/edital/${slug}?itens=todos`} prefetch={false} className="mt-3 inline-block text-sm font-semibold text-pin-strong hover:underline">
```

Run: `npx vitest run scripts/prefetch-edital.test.ts`
Expected: PASS.

- [ ] **Step 4: Cartão do limite**

Crie `components/CartaoLimite.tsx`:
```tsx
import Link from 'next/link';
import { CONVITE_PLANOS, mensagemLimite, type TipoUso } from '@/lib/limites';

/** Cartão do limite do grátis: na lista (buscas) e na página do edital (editais). Basic e Pro levam à tabela em /planos. */
export function CartaoLimite({ tipo }: { tipo: TipoUso }) {
  return (
    <section role="status" className="flex flex-col gap-3 rounded-lg border border-pin bg-pin-soft p-5 text-ink">
      <h2 className="text-[17px] font-bold leading-snug">{mensagemLimite(tipo)}</h2>
      <p className="text-[15px] text-ink-muted">{CONVITE_PLANOS}</p>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/planos#basic"
          className="inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-5 text-sm font-semibold hover:bg-sunken"
        >
          Basic
        </Link>
        <Link href="/planos#pro" className="inline-flex h-11 items-center rounded-sm bg-pin px-5 text-sm font-semibold text-on-pin">
          Pro
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Página do edital**

Troque o conteúdo de `app/edital/[slug]/page.tsx` por:
```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { BotaoEditalOficial } from '@/components/BotaoEditalOficial';
import { Cabecalho } from '@/components/Cabecalho';
import { CartaoLimite } from '@/components/CartaoLimite';
import { ListaItens } from '@/components/edital/ListaItens';
import { PrincipaisInformacoes } from '@/components/edital/PrincipaisInformacoes';
import { Relacionados } from '@/components/edital/Relacionados';
import { TextoRecolhivel } from '@/components/edital/TextoRecolhivel';
import { TAG_PRAZO, TEXTO_PRAZO } from '@/components/estilosPrazo';
import { FaixaCobertura } from '@/components/FaixaCobertura';
import { RegistrarAbertura } from '@/components/RegistrarAbertura';
import { VitrineEmBreve } from '@/components/VitrineEmBreve';
import { SLUG_EDITAL } from '@/lib/eventos';
import { data, haQuanto, linkOficial, prazo } from '@/lib/formato';
import { modalidadeCurta } from '@/lib/participacao';
import { atualizadoEm, edital, itensDoEdital, relacionados, resumoItens } from '@/lib/servidor/consultas';
import { contextoDaPagina } from '@/lib/servidor/registro';
import { decidirEdital } from '@/lib/servidor/uso';
import { assunto, lotesDaInfo, nomeProprio, paragrafos, textoLimpo } from '@/lib/texto';
import type { Edital, EditalRelacionado, ResumoItens } from '@/lib/tipos';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ itens?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!SLUG_EDITAL.test(slug)) return { title: 'Edital' };
  const e = await edital(slug);
  if (!e) return { title: 'Edital não encontrado' };
  const t = assunto(e.objeto).titulo;
  return { title: t.length > 70 ? `${t.slice(0, 69)}…` : t };
}

const ETIQUETA = 'rounded-xs bg-sunken px-2 py-0.5 text-xs font-semibold text-ink-muted';

/** Resumo de reserva: se a consulta do resumo falhar, a página do edital continua de pé. */
const RESUMO_VAZIO: ResumoItens = { total: 0, materiais: 0, servicos: 0, comBeneficio: 0, exclusivos: 0, cota: 0, criterios: [] };

/** Itens, resumo e parecidos: só consultados quando o edital está liberado para este navegador hoje. */
async function detalhesDoEdital(e: Edital, todos: boolean) {
  const [itens, resumo, parecidos] = await Promise.all([
    itensDoEdital(e, todos ? 2000 : 50),
    resumoItens(e.id).catch(() => RESUMO_VAZIO),
    // Falha nos parecidos não derruba a página: o bloco só não aparece.
    relacionados(e.id).catch((erro: unknown): EditalRelacionado[] => {
      console.error(`relacionados ${e.id}:`, erro);
      return [];
    }),
  ]);
  // O total vem do resumo gravado pelo worker; sem resumo ainda, do que o PNCP devolveu agora.
  return { itens, resumo, parecidos, totalItens: Math.max(resumo.total, itens?.length ?? 0) };
}

export default async function PaginaEdital({ params, searchParams }: Props) {
  await connection();
  const { slug } = await params;
  const { itens: modoItens } = await searchParams;
  if (!SLUG_EDITAL.test(slug)) notFound();
  const e = await edital(slug);
  if (!e) notFound();

  // Cada edital diferente aberto no dia conta no grátis (reabrir não conta). Interno e visitante sem cookie: liberado.
  const ctx = await contextoDaPagina();
  const decisao = await decidirEdital(ctx, e.slug);
  const todos = modoItens === 'todos';
  const [atualizado, detalhes] = await Promise.all([
    atualizadoEm(),
    decisao.permitido ? detalhesDoEdital(e, todos) : Promise.resolve(null),
  ]);
  const agora = new Date();
  const p = prazo(e.encerramento_em, agora);
  const titulo = assunto(e.objeto);
  const objetoCompleto = textoLimpo(e.objeto);
  const local = `${e.municipio_nome ?? '—'}/${e.uf}`;
  const lotes = e.info_complementar ? lotesDaInfo(e.info_complementar) : null;
  const textoInfo = e.info_complementar && !lotes ? paragrafos(e.info_complementar) : [];
  const exclusivoTotal = detalhes !== null && detalhes.resumo.total > 0 && detalhes.resumo.exclusivos === detalhes.resumo.total;

  return (
    <>
      <Cabecalho />
      <FaixaCobertura atualizadoEm={atualizado} />
      {detalhes ? <RegistrarAbertura slug={e.slug} /> : null}
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
              {titulo.tipo ? <span className={ETIQUETA}>{titulo.tipo}</span> : null}
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
            {detalhes ? <BotaoEditalOficial href={linkOficial(e)} slug={e.slug} /> : null}
            <Link
              href={`/alertas?uf=${e.uf}`}
              className="inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken"
            >
              Criar alerta para editais parecidos
            </Link>
          </div>
        </section>

        {/* Tudo abaixo do cabeçalho fica atrás do cartão quando os editais grátis do dia acabaram.
            Seção nova da página entra dentro deste bloco (e a consulta dela, em detalhesDoEdital). */}
        {detalhes ? (
          <>
            <PrincipaisInformacoes edital={e} resumo={{ ...detalhes.resumo, total: detalhes.totalItens }} agora={agora} />

            <div className="flex flex-wrap items-start gap-5">
              <div className="flex min-w-0 flex-[999_1_620px] flex-col gap-5">
                <section className="rounded-lg border border-line bg-raised p-5">
                  <h2 className="mb-3 text-[17px] font-bold">Itens da licitação</h2>
                  <ListaItens itens={detalhes.itens} total={detalhes.totalItens} slug={e.slug} todos={todos} />
                </section>
                <Relacionados editais={detalhes.parecidos} origem={e.slug} agora={agora} />
                {titulo.titulo !== objetoCompleto ? (
                  <section className="rounded-lg border border-line bg-raised p-5">
                    <details>
                      <summary className="cursor-pointer text-[17px] font-bold">Objeto completo</summary>
                      <p className="mt-2 break-words text-[15px]">{objetoCompleto}</p>
                    </details>
                  </section>
                ) : null}
                {lotes || textoInfo.length > 0 ? (
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
                      <TextoRecolhivel paragrafos={textoInfo} />
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
          </>
        ) : (
          <CartaoLimite tipo="edital" />
        )}
      </main>
    </>
  );
}
```
(A página já é dinâmica por `connection()` e `cookies()`: o Next responde `Cache-Control: private, no-cache, no-store`, então o estado bloqueado/liberado nunca é compartilhado entre visitantes. A Task 13 confere o cabeçalho.)

- [ ] **Step 6: Suíte, tipos, build e commit**

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa.
```bash
git add components/CartaoLimite.tsx scripts/prefetch-edital.test.ts "app/edital/[slug]/page.tsx" components/inicio/CartaoSelecionado.tsx components/edital/ListaItens.tsx
git commit -m "feat: edital além do limite do dia mostra o cartão dos planos" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 9: Selo no cabeçalho e cartão de limite na lista

**Files:**
- Create: `lib/cliente/uso.ts`, `lib/cliente/uso.test.ts`, `components/SeloPlano.tsx`
- Modify: `components/Cabecalho.tsx`, `components/Logo.tsx`, `components/Explorador.tsx`, `components/inicio/ColunaLista.tsx`, `app/page.tsx`, `app/edital/[slug]/page.tsx`
- Delete: `components/BotaoEmBreve.tsx`

**Interfaces:**
- Consumes: `UsoHoje`, `textoSelo`, `textoSeloCompacto`, `tomSelo`, `TomSelo`, `LimiteAtingido`, `lerLimite`, `Limite`, `RespostaBusca` (Task 3); `usoDoDia` (Task 6); `contextoDaPagina` (Task 5); `CartaoLimite` (Task 8); `/api/uso` (Task 7).
- Produces:
  - `lib/cliente/uso.ts`: `type AtualizacaoUso = UsoHoje | { buscas?: number; editais?: number }`; `mesclarUso(base: UsoHoje | null, novo: AtualizacaoUso): UsoHoje | null`; `publicarUso(novo: AtualizacaoUso): void`; `usoAtual(): UsoHoje | null`; `useUso(): UsoHoje | null`.
  - `SeloPlano({ inicial }: { inicial?: UsoHoje | null })`; `Cabecalho({ uso }: { uso?: UsoHoje | null })` (aba Planos e "Assinar Pro" → `/planos`; no celular: logo, selo compacto e "Assinar").
  - `ColunaLista` ganha a prop `limite: Limite | null`.
  - O navegador manda a `/api/mapa` os mesmos parâmetros da lista.

- [ ] **Step 1: Escrever o teste da loja (falhando)**

Crie `lib/cliente/uso.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { mesclarUso, publicarUso, usoAtual } from './uso';

describe('uso do dia no navegador (selo)', () => {
  it('uso completo substitui; parcial só vale sobre um uso já conhecido', () => {
    expect(mesclarUso(null, { buscas: 2 })).toBeNull();
    expect(mesclarUso(null, { interno: false, buscas: 1, editais: 0 })).toEqual({ interno: false, buscas: 1, editais: 0 });
    expect(mesclarUso({ interno: false, buscas: 1, editais: 0 }, { buscas: 2 })).toEqual({ interno: false, buscas: 2, editais: 0 });
    expect(mesclarUso({ interno: false, buscas: 3, editais: 2 }, { interno: true, buscas: 0, editais: 0 })).toEqual({ interno: true, buscas: 0, editais: 0 });
  });
  it('publicarUso guarda para quem lê depois', () => {
    expect(usoAtual()).toBeNull();
    publicarUso({ editais: 1 });
    expect(usoAtual()).toBeNull();
    publicarUso({ interno: false, buscas: 0, editais: 1 });
    publicarUso({ buscas: 2 });
    expect(usoAtual()).toEqual({ interno: false, buscas: 2, editais: 1 });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/cliente/uso.test.ts`
Expected: FAIL com "Failed to resolve import './uso'".

- [ ] **Step 3: Implementar a loja**

Crie `lib/cliente/uso.ts`:
```ts
import { useSyncExternalStore } from 'react';
import type { UsoHoje } from '../limites';

/** Uso completo (vindo do servidor) ou só o que mudou (as buscas usadas devolvidas por /api/busca). */
export type AtualizacaoUso = UsoHoje | { buscas?: number; editais?: number };

/** Junta uma atualização ao uso conhecido. Completa substitui; parcial sem uso conhecido é ignorada (o selo busca /api/uso). */
export function mesclarUso(base: UsoHoje | null, novo: AtualizacaoUso): UsoHoje | null {
  if ('interno' in novo) return novo;
  return base ? { ...base, ...novo } : null;
}

let atual: UsoHoje | null = null;
const ouvintes = new Set<() => void>();

export function publicarUso(novo: AtualizacaoUso): void {
  const proximo = mesclarUso(atual, novo);
  if (proximo === null) return;
  atual = proximo;
  for (const ouvir of ouvintes) ouvir();
}

export function usoAtual(): UsoHoje | null {
  return atual;
}

function assinar(ouvir: () => void): () => void {
  ouvintes.add(ouvir);
  return () => {
    ouvintes.delete(ouvir);
  };
}

/** Uso do dia para o selo; no servidor (e na hidratação) é sempre null. */
export function useUso(): UsoHoje | null {
  return useSyncExternalStore(assinar, usoAtual, () => null);
}
```

Run: `npx vitest run lib/cliente/uso.test.ts`
Expected: PASS.

- [ ] **Step 4: Selo e cabeçalho**

Crie `components/SeloPlano.tsx`:
```tsx
'use client';

import { useEffect } from 'react';
import { publicarUso, usoAtual, useUso } from '@/lib/cliente/uso';
import { textoSelo, textoSeloCompacto, tomSelo, type TomSelo, type UsoHoje } from '@/lib/limites';

const ESTILO: Record<TomSelo, string> = {
  normal: 'bg-sunken text-ink-muted',
  atencao: 'bg-ouro-soft text-ouro-strong',
  esgotado: 'bg-pin-soft text-pin-strong',
};

/**
 * "Grátis · restam 2 buscas e 1 edital hoje" (celular: "2 buscas · 1 edital"). Amarelo quando falta 1, laranja quando zerou.
 * `inicial` vem do servidor (página inicial e edital); sem ele, pergunta a /api/uso. Navegador interno: sem selo.
 */
export function SeloPlano({ inicial }: { inicial?: UsoHoje | null }) {
  const daLoja = useUso();
  useEffect(() => {
    if (inicial) {
      publicarUso(inicial);
      return;
    }
    if (usoAtual()) return;
    let cancelado = false;
    fetch('/api/uso', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<UsoHoje>) : null))
      .then((u) => {
        if (u && !cancelado) publicarUso(u);
      })
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [inicial]);
  const uso = daLoja ?? inicial ?? null;
  if (!uso || uso.interno) return null;
  return (
    <span
      aria-live="polite"
      title="Limites do plano grátis por dia (zeram à 0h, horário de Brasília)"
      className={`inline-flex h-8 min-w-0 items-center whitespace-nowrap rounded-full px-2.5 text-[11px] font-semibold lg:px-3 lg:text-[13px] ${ESTILO[tomSelo(uso)]}`}
    >
      <span className="truncate lg:hidden">{textoSeloCompacto(uso)}</span>
      <span className="hidden lg:inline">{textoSelo(uso)}</span>
    </span>
  );
}
```

Troque o conteúdo de `components/Cabecalho.tsx` por:
```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UsoHoje } from '@/lib/limites';
import { Logo } from './Logo';
import { SeloPlano } from './SeloPlano';

const ABA = 'rounded-sm px-3 py-1.5 text-sm font-semibold';

type Props = {
  /** Uso do dia calculado no servidor (página inicial e edital). Sem ele, o selo pergunta a /api/uso. */
  uso?: UsoHoje | null;
};

/**
 * Computador: logo, abas (Mapa, Alertas, Planos), Sobre, selo do grátis e "Assinar Pro".
 * Celular: logo, selo compacto e "Assinar" (Mapa, Lista, Alertas e Planos ficam na barra de baixo).
 */
export function Cabecalho({ uso }: Props) {
  const caminho = usePathname() ?? '/';
  const ativa = (href: string) => (href === '/' ? caminho === '/' : caminho === href || caminho.startsWith(href + '/'));
  const estilo = (href: string) => `${ABA} ${ativa(href) ? 'bg-pin-soft text-pin-strong' : 'text-ink hover:bg-sunken'}`;
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-line bg-raised px-3 py-3 lg:gap-8 lg:px-6">
      <Link href="/" aria-label="Edital Map, página inicial" className="shrink-0">
        <Logo />
      </Link>
      <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
        <Link href="/" aria-current={ativa('/') ? 'page' : undefined} className={estilo('/')}>
          Mapa
        </Link>
        <Link href="/alertas" aria-current={ativa('/alertas') ? 'page' : undefined} className={estilo('/alertas')}>
          Alertas
        </Link>
        <Link href="/planos" aria-current={ativa('/planos') ? 'page' : undefined} className={estilo('/planos')}>
          Planos
        </Link>
      </nav>
      <div className="ml-auto flex min-w-0 items-center gap-2 lg:gap-3">
        <Link href="/sobre" className="hidden text-sm font-semibold text-ink-muted hover:text-ink lg:inline">
          Sobre
        </Link>
        <SeloPlano inicial={uso} />
        <Link
          href="/planos"
          className="inline-flex h-9 shrink-0 items-center rounded-sm bg-pin px-2.5 text-[13px] font-semibold text-on-pin lg:h-10 lg:px-4 lg:text-sm"
        >
          <span className="lg:hidden">Assinar</span>
          <span className="hidden lg:inline">Assinar Pro</span>
        </Link>
      </div>
    </header>
  );
}
```
(No celular, a aba Alertas sai do cabeçalho: até a Task 12 ela só é alcançável pelo endereço; a barra de baixo da Task 12 a devolve.)

Em `components/Logo.tsx`, para caber logo + selo + "Assinar" em 390 px, troque
```tsx
    <span className="flex items-center gap-2 text-[22px] font-bold tracking-[-0.02em] text-ink">
      <svg viewBox="0 0 22 28" className="h-7 w-[22px]" aria-hidden="true">
```
por
```tsx
    <span className="flex items-center gap-1.5 text-[18px] font-bold tracking-[-0.02em] text-ink lg:gap-2 lg:text-[22px]">
      <svg viewBox="0 0 22 28" className="h-6 w-[19px] lg:h-7 lg:w-[22px]" aria-hidden="true">
```

Apague o aviso "em breve" (a aba e o botão agora levam a `/planos`):
```bash
git rm components/BotaoEmBreve.tsx
```

- [ ] **Step 5: Uso do servidor no selo (página inicial e edital)**

Em `app/page.tsx`, troque o conteúdo por:
```tsx
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { Explorador } from '@/components/Explorador';
import { lerFiltros } from '@/lib/filtros';
import { atualizadoEm, buscarEditais } from '@/lib/servidor/consultas';
import { contextoDaPagina } from '@/lib/servidor/registro';
import { usoDoDia } from '@/lib/servidor/uso';

export default async function Inicio() {
  await connection();
  const [inicial, atualizado, uso] = await Promise.all([
    buscarEditais(lerFiltros(new URLSearchParams())),
    atualizadoEm(),
    contextoDaPagina().then(usoDoDia),
  ]);
  // Uma tela só: as colunas ocupam a altura que sobra e cada uma rola por dentro.
  return (
    <div className="flex h-dvh flex-col">
      <Cabecalho uso={uso} />
      <Explorador inicial={inicial} agoraInicial={new Date().toISOString()} atualizadoEm={atualizado} />
    </div>
  );
}
```

Em `app/edital/[slug]/page.tsx`:
1. Acrescente `usoDoDia` ao import de `@/lib/servidor/uso`:
```tsx
import { decidirEdital, usoDoDia } from '@/lib/servidor/uso';
```
2. Troque
```tsx
  const [atualizado, detalhes] = await Promise.all([
    atualizadoEm(),
    decisao.permitido ? detalhesDoEdital(e, todos) : Promise.resolve(null),
  ]);
```
por
```tsx
  // O selo lê o uso depois de contar este edital.
  const [atualizado, detalhes, uso] = await Promise.all([
    atualizadoEm(),
    decisao.permitido ? detalhesDoEdital(e, todos) : Promise.resolve(null),
    usoDoDia(ctx),
  ]);
```
3. Troque `      <Cabecalho />` por `      <Cabecalho uso={uso} />`.

- [ ] **Step 6: Cartão de limite na lista**

Em `components/inicio/ColunaLista.tsx`:
1. Acrescente aos imports:
```tsx
import { CartaoLimite } from '@/components/CartaoLimite';
import type { Limite } from '@/lib/limites';
```
2. Em `type Props`, logo depois de `  erro: string | null;`, acrescente:
```tsx
  /** Busca nova além das 3 do dia: no lugar da lista, o cartão dos planos. */
  limite: Limite | null;
```
3. Troque
```tsx
  const valor = moedaCurta(p.painel.valorTotal);
```
por
```tsx
  if (p.limite) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-1">
        <CartaoLimite tipo={p.limite.tipo} />
      </div>
    );
  }

  const valor = moedaCurta(p.painel.valorTotal);
```

Em `components/Explorador.tsx`:
1. Acrescente aos imports:
```tsx
import { publicarUso } from '@/lib/cliente/uso';
import { LimiteAtingido, lerLimite, type Limite, type RespostaBusca } from '@/lib/limites';
```
2. Em `obter`, troque
```tsx
  if (!resposta.ok) {
    const erro = typeof corpo === 'object' && corpo !== null ? (corpo as { erro?: unknown }).erro : null;
```
por
```tsx
  if (!resposta.ok) {
    // Limite do grátis (402): a tela mostra o cartão dos planos, não um erro.
    const limite = lerLimite(resposta.status, corpo);
    if (limite) throw new LimiteAtingido(limite);
    const erro = typeof corpo === 'object' && corpo !== null ? (corpo as { erro?: unknown }).erro : null;
```
3. Depois de `  const [erroMapa, setErroMapa] = useState<string | null>(null);`, acrescente:
```tsx
  const [limite, setLimite] = useState<Limite | null>(null);
```
4. Em `carregarLista`, troque
```tsx
      const novo = await obter<ResultadoBusca>(`/api/busca?${paraParametros(f)}`, ERRO_LISTA);
      if (id !== pedidoLista.current) return;
      setResultado(novo);
```
por
```tsx
      const novo = await obter<RespostaBusca>(`/api/busca?${paraParametros(f)}`, ERRO_LISTA);
      if (id !== pedidoLista.current) return;
      setResultado({ total: novo.total, editais: novo.editais });
      setLimite(null);
      if (novo.buscasUsadas !== null) publicarUso({ buscas: novo.buscasUsadas });
```
e troque
```tsx
      if (id !== pedidoLista.current) return;
      setErroLista(mensagem(e, ERRO_LISTA));
      // No celular a gaveta recolhida não tem lugar para o aviso: abre para ele aparecer.
      setGavetaAberta(true);
```
por
```tsx
      if (id !== pedidoLista.current) return;
      if (e instanceof LimiteAtingido) {
        // Busca nova além do limite do dia: o cartão dos planos no lugar da lista (o mapa fica com a última permitida).
        setLimite(e.limite);
        publicarUso({ buscas: e.limite.usados });
        setErroLista(null);
      } else {
        setErroLista(mensagem(e, ERRO_LISTA));
      }
      // No celular a gaveta recolhida não tem lugar para o aviso nem para o cartão: abre para eles aparecerem.
      setGavetaAberta(true);
```
5. Em `carregarMapa`, troque
```tsx
      const novos = await obter<PontoMapa[]>(`/api/mapa?${paraParametros(f, { comCidade: false })}`, ERRO_MAPA);
```
por
```tsx
      // Os mesmos parâmetros da lista: a mesma busca no limite do dia (o servidor ignora a cidade sem raio no mapa).
      const novos = await obter<PontoMapa[]>(`/api/mapa?${paraParametros(f)}`, ERRO_MAPA);
```
e troque
```tsx
      if (id !== pedidoMapa.current) return;
      setErroMapa(mensagem(e, ERRO_MAPA));
```
por
```tsx
      if (id !== pedidoMapa.current) return;
      // Limite do dia: o mapa fica com a última busca permitida, sem aviso (o cartão aparece na lista).
      if (e instanceof LimiteAtingido) return;
      setErroMapa(mensagem(e, ERRO_MAPA));
```
6. Em `carregarMais`, troque
```tsx
      const mais = await obter<ResultadoBusca>(`/api/busca?${paraParametros(filtros, { deslocamento: resultado.editais.length })}`, ERRO_LISTA);
```
por
```tsx
      const mais = await obter<RespostaBusca>(`/api/busca?${paraParametros(filtros, { deslocamento: resultado.editais.length })}`, ERRO_LISTA);
```
e, no `catch` de `carregarMais`, troque
```tsx
      if (id !== pedidoLista.current) return;
      setErroLista(mensagem(e, ERRO_LISTA));
    } finally {
      if (id === pedidoLista.current) setCarregandoMais(false);
```
por
```tsx
      if (id !== pedidoLista.current) return;
      if (e instanceof LimiteAtingido) setLimite(e.limite);
      else setErroLista(mensagem(e, ERRO_LISTA));
    } finally {
      if (id === pedidoLista.current) setCarregandoMais(false);
```
7. No `<ColunaLista`, logo depois de `            erro={erroLista}`, acrescente:
```tsx
            limite={limite}
```

- [ ] **Step 7: Suíte, tipos, build e commit**

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa (nenhuma referência a `BotaoEmBreve` sobrou: `grep -rn BotaoEmBreve app components` não acha nada).
```bash
git add lib/cliente/uso.ts lib/cliente/uso.test.ts components/SeloPlano.tsx components/Cabecalho.tsx components/Logo.tsx components/Explorador.tsx components/inicio/ColunaLista.tsx app/page.tsx "app/edital/[slug]/page.tsx"
git commit -m "feat: selo do grátis no cabeçalho e cartão de limite na lista" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 10: Página Planos e lista de espera

**Files:**
- Create: `lib/planos.ts`, `lib/planos.test.ts`, `app/api/lista-espera/route.ts`, `app/api/lista-espera/route.test.ts`, `app/planos/page.tsx`, `components/planos/BotaoQueroPlano.tsx`
- Modify: `lib/eventos.ts`, `lib/eventos.test.ts`, `lib/servidor/registro.ts`, `scripts/capturas.mjs`

**Interfaces:**
- Consumes: `lista_espera` (0009); `contexto`, `Contexto` (Task 5); `LIMITE_GRATIS` (Task 3); `Cabecalho` (Task 9); `registrar` (`lib/cliente/registrar.ts`).
- Produces:
  - `lib/eventos.ts`: `RECURSOS` com `'plano_basic'` (sem edital, como `plano_pro`); `LIMITES.listaEsperaPorHora = 5`; `PLANOS_PAGOS = ['basic', 'pro'] as const`; `type PlanoPago`; `type PedidoListaEspera = { email: string; plano: PlanoPago }`; `validarListaEspera(corpo: unknown): Resultado<PedidoListaEspera>`.
  - `lib/servidor/registro.ts`: `dentroDoLimite(tabela: 'eventos' | 'pedidos_alerta' | 'lista_espera', …)`; `gravarListaEspera(ctx: Contexto, pedido: PedidoListaEspera): Promise<void>`.
  - `POST /api/lista-espera` `{ email, plano, site }` → 201 `{ ok: true }` | 400 `{ erro }` | 429 | 500 (robô: 200 sem gravar).
  - `lib/planos.ts`: `type IdPlano = 'gratis' | PlanoPago`; `PLANOS: ReadonlyArray<{ id: IdPlano; nome: string; preco: string }>`; `type Celula = { valor: string | boolean; emBreve?: boolean }`; `type LinhaPlanos = { recurso: string; gratis: Celula; basic: Celula; pro: Celula }`; `LINHAS_PLANOS: readonly LinhaPlanos[]`; `AVISO_PLANOS: string`.
  - Página `/planos` (âncoras `#basic` e `#pro`); `BotaoQueroPlano({ plano, destaque }: { plano: PlanoPago; destaque?: boolean })` registra `quer_recurso` (`plano_basic`/`plano_pro`) e abre o formulário da lista de espera.

- [ ] **Step 1: Escrever os testes (falhando)**

Em `lib/eventos.test.ts`, acrescente `validarListaEspera` ao import de `./eventos` e, ao fim do arquivo:
```ts
describe('lista de espera dos planos', () => {
  it('aceita basic e pro com e-mail válido (minúsculo, sem espaços)', () => {
    expect(validarListaEspera({ email: '  Joao@Empresa.com.br ', plano: 'basic' })).toEqual({
      ok: true, valor: { email: 'joao@empresa.com.br', plano: 'basic' },
    });
    expect(validarListaEspera({ email: 'a@b.co', plano: 'pro' }).ok).toBe(true);
  });
  it('recusa plano desconhecido, e-mail ruim e corpo estranho', () => {
    expect(validarListaEspera({ email: 'a@b.co', plano: 'premium' })).toEqual({ ok: false, erro: 'Escolha o plano.' });
    expect(validarListaEspera({ email: 'sem-arroba', plano: 'pro' })).toEqual({ ok: false, erro: 'Confira o e-mail.' });
    expect(validarListaEspera(null)).toEqual({ ok: false, erro: 'Formulário inválido.' });
  });
  it('robô (campo escondido preenchido) é recusado em silêncio', () => {
    expect(validarListaEspera({ email: 'a@b.co', plano: 'pro', site: 'http://spam' })).toEqual({ ok: false, erro: 'robô', silencioso: true });
  });
  it('limite de envios por hora, como o pedido de alerta', () => {
    expect(LIMITES.listaEsperaPorHora).toBe(5);
  });
  it('interesse no Basic vem sem edital, como o do Pro', () => {
    expect(validarEvento({ tipo: 'quer_recurso', detalhe: { recurso: 'plano_basic' } })).toEqual({
      ok: true, valor: { tipo: 'quer_recurso', detalhe: { recurso: 'plano_basic' } },
    });
  });
});
```

Crie `lib/planos.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { LIMITE_GRATIS } from './limites';
import { LINHAS_PLANOS, PLANOS } from './planos';

const linha = (recurso: string) => {
  const l = LINHAS_PLANOS.find((x) => x.recurso === recurso);
  if (!l) throw new Error(`linha ausente: ${recurso}`);
  return l;
};

describe('tabela de planos', () => {
  it('preços da spec de Planos', () => {
    expect(PLANOS.map((p) => [p.id, p.nome, p.preco])).toEqual([
      ['gratis', 'Grátis', 'R$ 0'],
      ['basic', 'Basic', 'R$ 49,90/mês'],
      ['pro', 'Pro', 'R$ 89,90/mês'],
    ]);
  });
  it('limites do Grátis iguais aos que bloqueiam; Basic 15; Pro ilimitado', () => {
    expect(linha('Buscas por dia').gratis.valor).toBe(String(LIMITE_GRATIS.busca));
    expect(linha('Editais abertos por dia').gratis.valor).toBe(String(LIMITE_GRATIS.edital));
    expect(linha('Buscas por dia').basic.valor).toBe('15');
    expect(linha('Editais abertos por dia').pro.valor).toBe('Ilimitados');
  });
  it('o que ainda não existe está marcado "em breve"', () => {
    for (const r of ['Editais salvos', 'Alertas por e-mail às 7h (busca salva)', 'Vencimentos por e-mail (3 dias e 1 dia antes do prazo de um salvo)']) {
      expect(linha(r).basic.emBreve && linha(r).pro.emBreve).toBe(true);
    }
    expect(linha('Preço de referência, quem venceu e resumo com IA').pro.emBreve).toBe(true);
  });
});
```

Crie `app/api/lista-espera/route.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LIMITES } from '@/lib/eventos';

const m = vi.hoisted(() => ({
  ctx: { visitante: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b', interno: false, ipHash: 'hash-do-ip' },
  dentroDoLimite: vi.fn(async (..._a: unknown[]) => true),
  gravarListaEspera: vi.fn(async (..._a: unknown[]) => undefined),
}));

vi.mock('@/lib/servidor/registro', () => ({
  contexto: async () => m.ctx,
  dentroDoLimite: m.dentroDoLimite,
  gravarListaEspera: m.gravarListaEspera,
}));

const { POST } = await import('./route');

const enviar = (corpo: unknown) =>
  POST(
    new Request('http://localhost/api/lista-espera', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  m.dentroDoLimite.mockResolvedValue(true);
  m.gravarListaEspera.mockResolvedValue(undefined);
});

describe('/api/lista-espera', () => {
  it('grava e responde 201', async () => {
    const r = await enviar({ email: 'Joao@Empresa.com.br', plano: 'pro' });
    expect(r.status).toBe(201);
    expect(m.dentroDoLimite).toHaveBeenCalledWith('lista_espera', 'hash-do-ip', LIMITES.listaEsperaPorHora);
    expect(m.gravarListaEspera).toHaveBeenCalledWith(m.ctx, { email: 'joao@empresa.com.br', plano: 'pro' });
  });
  it('e-mail ruim: 400 com a mensagem, sem gravar', async () => {
    const r = await enviar({ email: 'x', plano: 'basic' });
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ erro: 'Confira o e-mail.' });
    expect(m.gravarListaEspera).not.toHaveBeenCalled();
  });
  it('JSON inválido: 400', async () => {
    expect((await enviar('{nao-e-json')).status).toBe(400);
  });
  it('robô: 200 sem gravar', async () => {
    const r = await enviar({ email: 'a@b.co', plano: 'pro', site: 'spam' });
    expect(r.status).toBe(200);
    expect(m.gravarListaEspera).not.toHaveBeenCalled();
  });
  it('muitos envios do mesmo IP: 429', async () => {
    m.dentroDoLimite.mockResolvedValue(false);
    const r = await enviar({ email: 'a@b.co', plano: 'pro' });
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ erro: 'Muitos pedidos deste endereço. Tente de novo mais tarde.' });
  });
  it('falha ao gravar: 500 em português', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    m.gravarListaEspera.mockRejectedValue(new Error('banco fora'));
    const r = await enviar({ email: 'a@b.co', plano: 'pro' });
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ erro: 'Não deu para registrar agora. Tente de novo.' });
    erro.mockRestore();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/eventos.test.ts lib/planos.test.ts app/api/lista-espera/route.test.ts`
Expected: FAIL (`validarListaEspera` não exportado; `./planos` e `./route` não existem).

- [ ] **Step 3: Eventos e validação**

Em `lib/eventos.ts`:
1. Troque
```ts
export const RECURSOS = ['preco_referencia', 'quem_venceu', 'resumo_ia', 'plano_pro', 'filtros_pro'] as const;
export type Recurso = (typeof RECURSOS)[number];
/** Interesse em planos e filtros Pro: vem do cabeçalho e dos chips, sem edital. */
const RECURSOS_SEM_EDITAL: readonly string[] = ['plano_pro', 'filtros_pro'];
```
por
```ts
export const RECURSOS = ['preco_referencia', 'quem_venceu', 'resumo_ia', 'plano_pro', 'filtros_pro', 'plano_basic'] as const;
export type Recurso = (typeof RECURSOS)[number];
/** Interesse em planos ("Quero o Basic" / "Quero o Pro" em /planos) e filtros Pro: sem edital. */
const RECURSOS_SEM_EDITAL: readonly string[] = ['plano_pro', 'filtros_pro', 'plano_basic'];
```
2. Troque
```ts
export const LIMITES = { eventosPorHora: 120, alertasPorHora: 5, exportacoesPorHora: 20 } as const;
```
por
```ts
export const LIMITES = { eventosPorHora: 120, alertasPorHora: 5, exportacoesPorHora: 20, listaEsperaPorHora: 5 } as const;
```
3. Acrescente ao fim do arquivo:
```ts
/** Planos pagos da lista de espera de /planos. */
export const PLANOS_PAGOS = ['basic', 'pro'] as const;
export type PlanoPago = (typeof PLANOS_PAGOS)[number];
export type PedidoListaEspera = { email: string; plano: PlanoPago };

export function validarListaEspera(corpo: unknown): Resultado<PedidoListaEspera> {
  if (!objeto(corpo)) return { ok: false, erro: 'Formulário inválido.' };
  if (typeof corpo.site === 'string' && corpo.site.trim() !== '') return { ok: false, erro: 'robô', silencioso: true };
  const plano = corpo.plano;
  if (typeof plano !== 'string' || !(PLANOS_PAGOS as readonly string[]).includes(plano)) return { ok: false, erro: 'Escolha o plano.' };
  const email = typeof corpo.email === 'string' ? corpo.email.trim().toLowerCase() : '';
  if (email.length > 254 || !EMAIL.test(email)) return { ok: false, erro: 'Confira o e-mail.' };
  return { ok: true, valor: { email, plano: plano as PlanoPago } };
}
```

Em `lib/servidor/registro.ts`:
1. No import de `../eventos`, acrescente `PedidoListaEspera`:
```ts
import type { Detalhe, PedidoAlerta, PedidoListaEspera, TipoEvento, TipoEventoServidor } from '../eventos';
```
2. Troque
```ts
export async function dentroDoLimite(tabela: 'eventos' | 'pedidos_alerta', ipHash: string | null, limite: number): Promise<boolean> {
```
por
```ts
export async function dentroDoLimite(tabela: 'eventos' | 'pedidos_alerta' | 'lista_espera', ipHash: string | null, limite: number): Promise<boolean> {
```
3. Acrescente ao fim do arquivo:
```ts
export async function gravarListaEspera(ctx: Contexto, pedido: PedidoListaEspera): Promise<void> {
  const { error } = await supabaseServidor()
    .from('lista_espera')
    .insert({ email: pedido.email, plano: pedido.plano, visitante: ctx.visitante, interno: ctx.interno, ip_hash: ctx.ipHash });
  if (error) throw new Error(`gravar lista de espera: ${error.message}`);
}
```

- [ ] **Step 4: Rota da lista de espera**

Crie `app/api/lista-espera/route.ts`:
```ts
import { LIMITES, validarListaEspera } from '@/lib/eventos';
import { contexto, dentroDoLimite, gravarListaEspera } from '@/lib/servidor/registro';

/** "Quero o Basic" / "Quero o Pro": guarda o e-mail para avisar quando o pagamento abrir. */
export async function POST(request: Request) {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: 'Formulário inválido.' }, { status: 400 });
  }
  const v = validarListaEspera(corpo);
  if (!v.ok) return v.silencioso ? Response.json({ ok: true }) : Response.json({ erro: v.erro }, { status: 400 });
  try {
    const ctx = await contexto();
    if (!(await dentroDoLimite('lista_espera', ctx.ipHash, LIMITES.listaEsperaPorHora))) {
      return Response.json({ erro: 'Muitos pedidos deste endereço. Tente de novo mais tarde.' }, { status: 429 });
    }
    await gravarListaEspera(ctx, v.valor);
    return Response.json({ ok: true }, { status: 201 });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Não deu para registrar agora. Tente de novo.' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Dados da tabela**

Crie `lib/planos.ts`:
```ts
import type { PlanoPago } from './eventos';
import { LIMITE_GRATIS } from './limites';

/** Planos da spec de Planos (docs/superpowers/specs/2026-10-16-fase-3-planos-design.md §2). Só mensal por enquanto. */
export type IdPlano = 'gratis' | PlanoPago;
export const PLANOS: ReadonlyArray<{ id: IdPlano; nome: string; preco: string }> = [
  { id: 'gratis', nome: 'Grátis', preco: 'R$ 0' },
  { id: 'basic', nome: 'Basic', preco: 'R$ 49,90/mês' },
  { id: 'pro', nome: 'Pro', preco: 'R$ 89,90/mês' },
];

/** Célula da tabela: texto, ✓ (true) ou — (false); `emBreve` marca o que ainda não existe. */
export type Celula = { valor: string | boolean; emBreve?: boolean };
export type LinhaPlanos = { recurso: string; gratis: Celula; basic: Celula; pro: Celula };

export const LINHAS_PLANOS: readonly LinhaPlanos[] = [
  { recurso: 'Buscas por dia', gratis: { valor: String(LIMITE_GRATIS.busca) }, basic: { valor: '15' }, pro: { valor: 'Ilimitadas' } },
  { recurso: 'Editais abertos por dia', gratis: { valor: String(LIMITE_GRATIS.edital) }, basic: { valor: '15' }, pro: { valor: 'Ilimitados' } },
  { recurso: 'Botão "Abrir edital oficial"', gratis: { valor: false }, basic: { valor: true }, pro: { valor: true } },
  { recurso: 'Filtros (UF, município, valor, modalidade, prazo)', gratis: { valor: true }, basic: { valor: true }, pro: { valor: true } },
  { recurso: 'Editais salvos', gratis: { valor: false }, basic: { valor: 'Até 10', emBreve: true }, pro: { valor: 'Ilimitados', emBreve: true } },
  {
    recurso: 'Alertas por e-mail às 7h (busca salva)',
    gratis: { valor: false },
    basic: { valor: '1 busca', emBreve: true },
    pro: { valor: 'Até 10 buscas', emBreve: true },
  },
  {
    recurso: 'Vencimentos por e-mail (3 dias e 1 dia antes do prazo de um salvo)',
    gratis: { valor: false },
    basic: { valor: true, emBreve: true },
    pro: { valor: true, emBreve: true },
  },
  { recurso: 'Editais parecidos abertos', gratis: { valor: '3 primeiros' }, basic: { valor: true }, pro: { valor: true } },
  { recurso: 'Filtros Pro (raio em km e órgão comprador)', gratis: { valor: false }, basic: { valor: false }, pro: { valor: true } },
  { recurso: 'Exportar a lista para planilha', gratis: { valor: false }, basic: { valor: false }, pro: { valor: true } },
  {
    recurso: 'Preço de referência, quem venceu e resumo com IA',
    gratis: { valor: false },
    basic: { valor: false },
    pro: { valor: true, emBreve: true },
  },
];

/** A tabela descreve os planos de quando o pagamento abrir; até lá, o que já existe está aberto a todos. */
export const AVISO_PLANOS =
  'Enquanto o pagamento não abre, o botão "Abrir edital oficial", os editais parecidos, os filtros Pro e a exportação ficam liberados para todos, dentro dos limites do Grátis.';
```

- [ ] **Step 6: Botão e formulário**

Crie `components/planos/BotaoQueroPlano.tsx`:
```tsx
'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import { registrar } from '@/lib/cliente/registrar';
import type { PlanoPago } from '@/lib/eventos';

type Estado = { tipo: 'editando' } | { tipo: 'enviando' } | { tipo: 'erro'; mensagem: string } | { tipo: 'pronto'; email: string };

const NOME: Record<PlanoPago, string> = { basic: 'Basic', pro: 'Pro' };

/** "Quero o Basic" / "Quero o Pro": registra o interesse (quer_recurso) e abre o formulário da lista de espera. */
export function BotaoQueroPlano({ plano, destaque = false }: { plano: PlanoPago; destaque?: boolean }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const titulo = useId();
  const campo = useId();
  const [email, setEmail] = useState('');
  const [site, setSite] = useState('');
  const [estado, setEstado] = useState<Estado>({ tipo: 'editando' });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEstado({ tipo: 'enviando' });
    try {
      const r = await fetch('/api/lista-espera', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, plano, site }),
      });
      const j = (await r.json().catch(() => ({}))) as { erro?: string };
      if (!r.ok) {
        setEstado({ tipo: 'erro', mensagem: j.erro ?? 'Não deu para registrar agora. Tente de novo.' });
        return;
      }
      setEstado({ tipo: 'pronto', email: email.trim().toLowerCase() });
    } catch {
      setEstado({ tipo: 'erro', mensagem: 'Sem conexão. Tente de novo.' });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          registrar('quer_recurso', { recurso: plano === 'basic' ? 'plano_basic' : 'plano_pro' });
          dialogo.current?.showModal();
        }}
        className={`inline-flex h-10 items-center justify-center rounded-sm px-4 text-sm font-semibold ${
          destaque ? 'bg-pin text-on-pin' : 'border border-line-strong bg-raised text-ink hover:bg-sunken'
        }`}
      >
        Quero o {NOME[plano]}
      </button>
      <dialog
        ref={dialogo}
        aria-labelledby={titulo}
        className="m-auto w-[min(92vw,440px)] rounded-lg border border-line bg-raised p-6 text-left text-ink shadow-[0_8px_32px_rgba(12,35,64,.18)] backdrop:bg-ink/40"
      >
        <h2 id={titulo} className="text-lg font-bold">Plano {NOME[plano]}</h2>
        {estado.tipo === 'pronto' ? (
          <div role="status" className="mt-2 flex flex-col gap-4">
            <p className="text-[15px]">
              Pronto! Avisamos em <strong className="break-all">{estado.email}</strong> quando o pagamento abrir.
            </p>
            <button
              type="button"
              onClick={() => dialogo.current?.close()}
              className="h-10 self-start rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={enviar} noValidate className="mt-2 flex flex-col gap-3">
            <p className="text-[15px] text-ink-muted">O pagamento abre em breve. Deixe seu e-mail que avisamos assim que puder assinar.</p>
            <label htmlFor={campo} className="text-[13px] font-semibold">E-mail</label>
            <input
              id={campo}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-sm border border-line-strong bg-raised px-3"
            />
            <div aria-hidden="true" className="hidden">
              <label htmlFor={`${campo}-site`}>Não preencha</label>
              <input id={`${campo}-site`} tabIndex={-1} autoComplete="off" value={site} onChange={(e) => setSite(e.target.value)} />
            </div>
            {estado.tipo === 'erro' ? (
              <p role="alert" className="rounded-sm bg-pin-soft px-3 py-2 text-sm text-pin-strong">{estado.mensagem}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={estado.tipo === 'enviando'}
                className="h-10 rounded-sm bg-pin px-4 text-sm font-semibold text-on-pin disabled:opacity-60"
              >
                {estado.tipo === 'enviando' ? 'Enviando…' : 'Avisar quando abrir'}
              </button>
              <button
                type="button"
                onClick={() => dialogo.current?.close()}
                className="h-10 rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken"
              >
                Fechar
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
```

- [ ] **Step 7: Página `/planos`**

Crie `app/planos/page.tsx`:
```tsx
import type { Metadata } from 'next';
import { Cabecalho } from '@/components/Cabecalho';
import { BotaoQueroPlano } from '@/components/planos/BotaoQueroPlano';
import { AVISO_PLANOS, LINHAS_PLANOS, PLANOS, type Celula } from '@/lib/planos';

export const metadata: Metadata = { title: 'Planos' };

const EM_BREVE = 'whitespace-nowrap rounded-xs bg-ouro-soft px-1.5 py-0.5 text-[11px] font-semibold text-ouro-strong';
const CELULA = 'border-b border-line p-4 text-center align-middle';

function Valor({ c }: { c: Celula }) {
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
      {c.valor === true ? (
        <>
          <span aria-hidden="true" className="text-base font-bold text-mata">✓</span>
          <span className="sr-only">Incluído</span>
        </>
      ) : c.valor === false ? (
        <>
          <span aria-hidden="true" className="text-ink-muted">—</span>
          <span className="sr-only">Não incluído</span>
        </>
      ) : (
        <span>{c.valor}</span>
      )}
      {c.emBreve ? <span className={EM_BREVE}>em breve</span> : null}
    </span>
  );
}

export default function PaginaPlanos() {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex max-w-[1080px] flex-col gap-6 px-4 py-8 md:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[32px] font-bold leading-tight tracking-[-0.015em]">Planos</h1>
          <p className="text-[15px] text-ink-muted">
            Comece grátis. Quando precisar de mais buscas e editais por dia, de alertas e de editais salvos, escolha o Basic ou o Pro.
          </p>
        </div>
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 overflow-hidden rounded-lg border border-line bg-raised text-[14px]">
            <caption className="sr-only">Comparação dos planos Grátis, Basic e Pro</caption>
            <thead>
              <tr>
                <th scope="col" className="w-[38%] border-b border-line p-4 text-left align-bottom text-[13px] font-semibold text-ink-muted">
                  Recurso
                </th>
                {PLANOS.map((p) => (
                  <th key={p.id} id={p.id} scope="col" className={`scroll-mt-24 border-b border-line p-4 text-center align-bottom ${p.id === 'pro' ? 'bg-pin-soft' : ''}`}>
                    <span className="block text-[17px] font-bold">{p.nome}</span>
                    <span className="mt-1 block font-mono text-[13px] font-medium text-ink-muted">{p.preco}</span>
                    <span className="mt-3 block">
                      {p.id === 'gratis' ? (
                        <span className="text-[12px] font-normal text-ink-muted">Seu plano hoje</span>
                      ) : (
                        <BotaoQueroPlano plano={p.id} destaque={p.id === 'pro'} />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LINHAS_PLANOS.map((l) => (
                <tr key={l.recurso}>
                  <th scope="row" className="border-b border-line p-4 text-left font-semibold">{l.recurso}</th>
                  <td className={CELULA}><Valor c={l.gratis} /></td>
                  <td className={CELULA}><Valor c={l.basic} /></td>
                  <td className={`${CELULA} bg-pin-soft/40`}><Valor c={l.pro} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="rounded-md bg-sunken p-4 text-[13px] text-ink-muted">{AVISO_PLANOS}</p>
      </main>
    </>
  );
}
```

Em `scripts/capturas.mjs`, troque
```js
const paginas = [['inicio', '/'], ['alertas', '/alertas'], ['sobre', '/sobre']];
```
por
```js
const paginas = [['inicio', '/'], ['alertas', '/alertas'], ['planos', '/planos'], ['sobre', '/sobre']];
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx vitest run lib/eventos.test.ts lib/planos.test.ts app/api/lista-espera/route.test.ts`
Expected: PASS.

- [ ] **Step 9: Suíte, tipos, build e commit**

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa; o build lista `/planos` e `/api/lista-espera`.
```bash
git add lib/eventos.ts lib/eventos.test.ts lib/planos.ts lib/planos.test.ts lib/servidor/registro.ts app/api/lista-espera app/planos components/planos scripts/capturas.mjs
git commit -m "feat: página Planos com a tabela e a lista de espera" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 11: Busca no endereço na página inicial (e voltar do edital no lugar)

**Files:**
- Create: `lib/servidor/nomes.ts`, `lib/servidor/nomes.test.ts`
- Modify: `app/page.tsx`, `components/Explorador.tsx`, `components/inicio/ColunaLista.tsx`, `components/inicio/BuscaPrincipal.tsx`

**Interfaces:**
- Consumes: `lerBuscaDaUrl`, `montarTela`, `paraUrlSearchParams`, `urlDaBusca`, `Tela` (Task 4); `guardarVolta`, `tomarVolta`, `guardarUltimaBusca`, `Volta` (Task 4); `decidirBusca`, `usoDoDia` (Task 6); `contextoDaPagina` (Task 5); `LimiteAtingido`, `lerLimite`, `Limite`, `RespostaBusca` (Task 3); `publicarUso` (Task 9).
- Produces:
  - `lib/servidor/nomes.ts`: `municipioPorIbge(ibge: string): Promise<Cidade | null>`; `orgaoPorCnpj(cnpj: string): Promise<Orgao>` (sem contratação no espelho, `nome` = o próprio CNPJ). Cache de 5 min.
  - Página inicial: lê os filtros do endereço, conta a busca como `/api/busca` (`avisar: true`), entrega `Explorador` com `filtrosIniciais`, `telaInicial`, `inicial` (null quando bloqueada), `limiteInicial`, e `key` = `urlDaBusca(filtros, tela)`.
  - `Explorador` props: `{ filtrosIniciais: FiltrosTela; telaInicial: Tela; inicial: ResultadoBusca | null; limiteInicial: Limite | null; agoraInicial: string; atualizadoEm: string | null }`. Escreve o endereço a cada mudança (`history.replaceState(urlDaBusca(filtros, tela))`), guarda o estado ao sair (`guardarVolta`) e restaura na volta (`tomarVolta`). No celular, `tela === 'lista'` é a gaveta aberta (a Task 12 troca a gaveta por telas cheias).
  - `ColunaLista` ganha `listaRef: RefObject<HTMLDivElement | null>` e `aoRolar: (topo: number) => void`.

- [ ] **Step 1: Escrever o teste dos nomes (falhando)**

Crie `lib/servidor/nomes.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nomeProprio } from '../texto';

vi.mock('server-only', () => ({}));

type Resposta = { data: unknown; error: { message: string } | null };
type Consulta = {
  select: (colunas: string) => Consulta;
  eq: (coluna: string, valor: unknown) => Consulta;
  limit: (n: number) => Consulta;
  maybeSingle: () => Promise<Resposta>;
};

const m = vi.hoisted(() => ({
  consultas: [] as Array<{ tabela: string; colunas: string; filtro: [string, unknown] | null }>,
  resposta: { data: null, error: null } as { data: unknown; error: { message: string } | null },
}));

vi.mock('./supabase', () => ({
  supabaseServidor: () => ({
    from: (tabela: string) => {
      const registro = { tabela, colunas: '', filtro: null as [string, unknown] | null };
      m.consultas.push(registro);
      const c: Consulta = {
        select: (colunas) => {
          registro.colunas = colunas;
          return c;
        },
        eq: (coluna, valor) => {
          registro.filtro = [coluna, valor];
          return c;
        },
        limit: () => c,
        maybeSingle: () => Promise.resolve(m.resposta),
      };
      return c;
    },
  }),
}));

const { municipioPorIbge, orgaoPorCnpj } = await import('./nomes');

beforeEach(() => {
  m.consultas.length = 0;
  m.resposta = { data: null, error: null };
});

describe('nomes dos filtros vindos do endereço', () => {
  it('município pelo código IBGE', async () => {
    m.resposta = { data: { codigo_ibge: '4209102', nome: 'Joinville', uf: 'SC' }, error: null };
    expect(await municipioPorIbge('4209102')).toEqual({ ibge: '4209102', nome: 'Joinville', uf: 'SC' });
    expect(m.consultas).toEqual([{ tabela: 'municipios', colunas: 'codigo_ibge, nome, uf', filtro: ['codigo_ibge', '4209102'] }]);
  });
  it('município que não existe: null', async () => {
    expect(await municipioPorIbge('9999999')).toBeNull();
  });
  it('órgão pelo CNPJ, com o nome limpo', async () => {
    m.resposta = { data: { orgao_nome: 'MUNICIPIO DE JOINVILLE' }, error: null };
    expect(await orgaoPorCnpj('83102285000107')).toEqual({ cnpj: '83102285000107', nome: nomeProprio('MUNICIPIO DE JOINVILLE') });
    expect(m.consultas[0]).toEqual({ tabela: 'contratacoes', colunas: 'orgao_nome', filtro: ['cnpj', '83102285000107'] });
  });
  it('órgão sem contratação no espelho: o nome é o CNPJ', async () => {
    expect(await orgaoPorCnpj('11222333000181')).toEqual({ cnpj: '11222333000181', nome: '11222333000181' });
  });
  it('erro do banco sobe (a página tira o filtro)', async () => {
    m.resposta = { data: null, error: { message: 'timeout' } };
    await expect(municipioPorIbge('4205407')).rejects.toThrow('municipio: timeout');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/servidor/nomes.test.ts`
Expected: FAIL com "Failed to resolve import './nomes'".

- [ ] **Step 3: Implementar os nomes**

Crie `lib/servidor/nomes.ts`:
```ts
import 'server-only';
import { criarCache } from '../cache';
import { nomeProprio } from '../texto';
import type { Cidade, Orgao } from '../tipos';
import { supabaseServidor } from './supabase';

const cache = criarCache(5 * 60 * 1000);

/** Município do endereço (?municipio=) → nome e UF para o chip. null = código que não existe. */
export function municipioPorIbge(ibge: string): Promise<Cidade | null> {
  return cache(`municipio:${ibge}`, async () => {
    const { data, error } = await supabaseServidor().from('municipios').select('codigo_ibge, nome, uf').eq('codigo_ibge', ibge).maybeSingle();
    if (error) throw new Error(`municipio: ${error.message}`);
    return data ? { ibge: String(data.codigo_ibge), nome: String(data.nome), uf: String(data.uf) } : null;
  });
}

/** Órgão do endereço (?orgao=) → nome para o chip, de qualquer contratação dele no espelho. Sem nenhuma, o nome é o CNPJ. */
export function orgaoPorCnpj(cnpj: string): Promise<Orgao> {
  return cache(`orgao:${cnpj}`, async () => {
    const { data, error } = await supabaseServidor().from('contratacoes').select('orgao_nome').eq('cnpj', cnpj).limit(1).maybeSingle();
    if (error) throw new Error(`orgao: ${error.message}`);
    return { cnpj, nome: data ? nomeProprio(String(data.orgao_nome)) : cnpj };
  });
}
```

Run: `npx vitest run lib/servidor/nomes.test.ts`
Expected: PASS.

- [ ] **Step 4: Página inicial lê o endereço**

Troque o conteúdo de `app/page.tsx` por:
```tsx
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { Explorador } from '@/components/Explorador';
import { lerFiltros, paraParametros } from '@/lib/filtros';
import { atualizadoEm, buscarEditais } from '@/lib/servidor/consultas';
import { municipioPorIbge, orgaoPorCnpj } from '@/lib/servidor/nomes';
import { contextoDaPagina } from '@/lib/servidor/registro';
import { decidirBusca, usoDoDia } from '@/lib/servidor/uso';
import { lerBuscaDaUrl, montarTela, paraUrlSearchParams, urlDaBusca } from '@/lib/urlBusca';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Página inicial. A busca vem do endereço (/?q=luva&uf=SC&…) e conta no limite do dia como a de /api/busca. */
export default async function Inicio({ searchParams }: Props) {
  await connection();
  const { busca, tela } = lerBuscaDaUrl(paraUrlSearchParams(await searchParams));
  const cnpj = busca.orgao;
  // Nomes para os chips; se a consulta falhar, o filtro só sai da tela.
  const [cidade, orgao] = await Promise.all([
    busca.ibge ? municipioPorIbge(busca.ibge).catch(() => null) : Promise.resolve(null),
    cnpj ? orgaoPorCnpj(cnpj).catch(() => null) : Promise.resolve(null),
  ]);
  const filtros = montarTela(busca, cidade, orgao);
  // A mesma busca que a lista pede a /api/busca (mesma chave no limite do dia).
  const daLista = lerFiltros(paraParametros(filtros));
  const ctx = await contextoDaPagina();
  const decisao = await decidirBusca(ctx, daLista, { avisar: true });
  const [inicial, atualizado, uso] = await Promise.all([
    decisao.permitido ? buscarEditais(daLista) : Promise.resolve(null),
    atualizadoEm(),
    usoDoDia(ctx),
  ]);
  // Uma tela só: as colunas ocupam a altura que sobra e cada uma rola por dentro.
  return (
    <div className="flex h-dvh flex-col">
      <Cabecalho uso={uso} />
      <Explorador
        key={urlDaBusca(filtros, tela)}
        filtrosIniciais={filtros}
        telaInicial={tela}
        inicial={inicial}
        limiteInicial={decisao.permitido ? null : decisao.limite}
        agoraInicial={new Date().toISOString()}
        atualizadoEm={atualizado}
      />
    </div>
  );
}
```

- [ ] **Step 5: Lista com posição e campo que acompanha a busca**

Em `components/inicio/ColunaLista.tsx`:
1. Troque `import { useEffect, useRef, useState } from 'react';` por `import { useEffect, useState, type RefObject } from 'react';`.
2. Em `type Props`, logo depois de `  parametrosBusca: string;`, acrescente:
```tsx
  /** Área que rola (a página guarda a posição para voltar do edital no mesmo lugar). */
  listaRef: RefObject<HTMLDivElement | null>;
  aoRolar: (topo: number) => void;
```
3. Apague a linha `  const lista = useRef<HTMLDivElement>(null);`.
4. Troque
```tsx
    if (p.carregandoLista) lista.current?.scrollTo({ top: 0 });
  }, [p.carregandoLista]);
```
por
```tsx
    if (p.carregandoLista) p.listaRef.current?.scrollTo({ top: 0 });
  }, [p.carregandoLista, p.listaRef]);
```
5. Troque `          ref={lista}` por:
```tsx
          ref={p.listaRef}
          onScroll={(e) => p.aoRolar(e.currentTarget.scrollTop)}
```

Em `components/inicio/BuscaPrincipal.tsx`, logo depois de `  useEffect(() => setLocal(uf), [uf]);`, acrescente:
```tsx
  // A busca pode mudar fora do campo (voltar do edital restaura o termo): o campo acompanha.
  useEffect(() => setTexto(q), [q]);
```

- [ ] **Step 6: `Explorador` com endereço, volta e limite inicial**

Troque o conteúdo de `components/Explorador.tsx` por:
```tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { registrar } from '@/lib/cliente/registrar';
import { publicarUso } from '@/lib/cliente/uso';
import { guardarUltimaBusca, guardarVolta, tomarVolta, type Volta } from '@/lib/cliente/volta';
import { normalizarTela, paraParametros, recursosUsados } from '@/lib/filtros';
import type { Raio } from '@/lib/geo';
import { LimiteAtingido, lerLimite, type Limite, type RespostaBusca } from '@/lib/limites';
import { resumirPontos } from '@/lib/painel';
import type { Cidade, EditalResumo, FiltrosTela, PontoMapa, ResultadoBusca } from '@/lib/tipos';
import { urlDaBusca, type Tela } from '@/lib/urlBusca';
import { GavetaCelular } from './GavetaCelular';
import { Mapa } from './Mapa';
import { BuscaPrincipal } from './inicio/BuscaPrincipal';
import { CartaoSelecionado } from './inicio/CartaoSelecionado';
import { Chips } from './inicio/Chips';
import { ColunaLista } from './inicio/ColunaLista';
import { LegendaMapa } from './inicio/LegendaMapa';
import { OndeMaisCompram } from './inicio/OndeMaisCompram';

const VAZIO: FiltrosTela = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };
const SEM_RESULTADO: ResultadoBusca = { total: 0, editais: [] };
const ERRO_LISTA = 'Não foi possível buscar agora. Confira a conexão e tente de novo.';
const ERRO_MAPA = 'Não foi possível carregar o mapa agora.';
const TEMPO_LIMITE_MS = 20_000;

/** Abaixo de lg (1024 px): a tela do celular (Mapa ou Lista) entra no endereço. */
const ehCelular = () => window.matchMedia('(max-width: 1023px)').matches;

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
    // Limite do grátis (402): a tela mostra o cartão dos planos, não um erro.
    const limite = lerLimite(resposta.status, corpo);
    if (limite) throw new LimiteAtingido(limite);
    const erro = typeof corpo === 'object' && corpo !== null ? (corpo as { erro?: unknown }).erro : null;
    throw new Error(typeof erro === 'string' && erro.trim() ? erro : padrao);
  }
  if (corpo === null) throw new Error(padrao);
  return corpo as T;
}

const mensagem = (e: unknown, padrao: string) => (e instanceof Error && e.message ? e.message : padrao);

type Props = {
  filtrosIniciais: FiltrosTela;
  telaInicial: Tela;
  /** null quando a busca do endereço já bateu no limite do dia. */
  inicial: ResultadoBusca | null;
  limiteInicial: Limite | null;
  agoraInicial: string;
  atualizadoEm: string | null;
};

/** Parte do estado guardada ao sair da página (o resto da Volta é calculado na hora de guardar). */
type Guardavel = Pick<Volta, 'filtros' | 'resultado' | 'limite' | 'tela' | 'selecionadoId'>;

export function Explorador({ filtrosIniciais, telaInicial, inicial, limiteInicial, agoraInicial, atualizadoEm }: Props) {
  const [filtros, setFiltros] = useState<FiltrosTela>(filtrosIniciais);
  // Celular: Mapa ou Lista (aqui, a gaveta aberta), guardada no endereço para voltar do edital na mesma tela.
  const [tela, setTela] = useState<Tela>(telaInicial);
  const [resultado, setResultado] = useState<ResultadoBusca>(inicial ?? SEM_RESULTADO);
  const [limite, setLimite] = useState<Limite | null>(limiteInicial);
  const [agora, setAgora] = useState(() => new Date(agoraInicial));
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [erroMapa, setErroMapa] = useState<string | null>(null);
  const [pontos, setPontos] = useState<PontoMapa[]>([]);
  // Falso até o primeiro mapa chegar: antes disso o resumo (UFs, valor, municípios) ainda não existe.
  const [pontosProntos, setPontosProntos] = useState(false);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(inicial?.editais[0]?.id ?? null);
  const [resumoNoCelular, setResumoNoCelular] = useState(false);
  // Sede de cada município já visto no mapa: centro do círculo do raio (a cidade escolhida sempre veio de um ponto do mapa).
  const [centros, setCentros] = useState<Record<string, [number, number]>>({});
  // Numeração dos pedidos: só a resposta do pedido mais recente pode mudar a tela.
  const pedidoLista = useRef(0);
  const pedidoMapa = useRef(0);
  // Para voltar do edital no mesmo lugar: a área da lista e a posição dela, a busca do mapa e o estado da tela.
  const listaRef = useRef<HTMLDivElement>(null);
  const rolagem = useRef(0);
  const rolagemPendente = useRef<number | null>(null);
  const filtrosDoMapa = useRef<FiltrosTela>(VAZIO);
  const paraGuardar = useRef<Guardavel | null>(null);

  const painel = useMemo(() => resumirPontos(pontos), [pontos]);
  const selecionado = resultado.editais.find((e) => e.id === selecionadoId) ?? resultado.editais[0] ?? null;
  const centro = filtros.cidade && filtros.raio ? centros[filtros.cidade.ibge] : undefined;
  const raioMapa = useMemo<Raio | null>(
    () => (centro && filtros.raio ? { lng: centro[0], lat: centro[1], km: filtros.raio } : null),
    [centro, filtros.raio],
  );

  /** Troca a tela do celular e escreve a busca no endereço (sem recarregar a página). */
  const trocarTela = useCallback((nova: Tela, f: FiltrosTela) => {
    setTela(nova);
    window.history.replaceState(null, '', urlDaBusca(f, nova));
  }, []);

  const carregarLista = useCallback(
    async (f: FiltrosTela) => {
      const id = ++pedidoLista.current;
      setCarregandoLista(true);
      setCarregandoMais(false);
      try {
        const novo = await obter<RespostaBusca>(`/api/busca?${paraParametros(f)}`, ERRO_LISTA);
        if (id !== pedidoLista.current) return;
        setResultado({ total: novo.total, editais: novo.editais });
        setLimite(null);
        if (novo.buscasUsadas !== null) publicarUso({ buscas: novo.buscasUsadas });
        setSelecionadoId(novo.editais[0]?.id ?? null);
        setAgora(new Date());
        setErroLista(null);
        // O cartão escuro do celular só vale para o toque que o abriu, não para as buscas seguintes.
        setResumoNoCelular(false);
      } catch (e) {
        if (id !== pedidoLista.current) return;
        if (e instanceof LimiteAtingido) {
          // Busca nova além do limite do dia: o cartão dos planos no lugar da lista (o mapa fica com a última permitida).
          setLimite(e.limite);
          publicarUso({ buscas: e.limite.usados });
          setErroLista(null);
        } else {
          setErroLista(mensagem(e, ERRO_LISTA));
        }
        // No celular, o aviso e o cartão aparecem na lista: ela abre.
        if (ehCelular()) trocarTela('lista', f);
      } finally {
        if (id === pedidoLista.current) setCarregandoLista(false);
      }
    },
    [trocarTela],
  );

  const carregarMapa = useCallback(async (f: FiltrosTela) => {
    const id = ++pedidoMapa.current;
    const anterior = filtrosDoMapa.current;
    filtrosDoMapa.current = f;
    try {
      // Os mesmos parâmetros da lista: a mesma busca no limite do dia (o servidor ignora a cidade sem raio no mapa).
      const novos = await obter<PontoMapa[]>(`/api/mapa?${paraParametros(f)}`, ERRO_MAPA);
      if (id !== pedidoMapa.current) return;
      setPontos(novos);
      setCentros((anteriores) => {
        const todos = { ...anteriores };
        for (const p of novos) todos[p.codigo_ibge] = [p.lng, p.lat];
        return todos;
      });
      setPontosProntos(true);
      setErroMapa(null);
    } catch (e) {
      if (id !== pedidoMapa.current) return;
      // Limite do dia: o mapa fica com a última busca permitida, sem aviso (o cartão aparece na lista).
      if (e instanceof LimiteAtingido) {
        filtrosDoMapa.current = anterior;
        return;
      }
      setErroMapa(mensagem(e, ERRO_MAPA));
    }
  }, []);

  // Estado que a página guarda ao sair (a limpeza do efeito de montagem não enxerga o estado novo).
  useEffect(() => {
    paraGuardar.current = { filtros, resultado, limite, tela, selecionadoId };
  }, [filtros, resultado, limite, tela, selecionadoId]);

  // Última busca, para os links Mapa e Lista da barra do celular nas outras páginas.
  useEffect(() => guardarUltimaBusca(urlDaBusca(filtros)), [filtros]);

  // Volta do edital: devolve a lista à posição em que estava, quando ela estiver visível.
  useEffect(() => {
    const lista = listaRef.current;
    if (rolagemPendente.current === null || !lista || lista.clientHeight === 0) return;
    lista.scrollTop = rolagemPendente.current;
    rolagemPendente.current = null;
  }, [resultado, tela]);

  // Montagem: voltando do edital (mesmo endereço), restaura busca, lista, tela e posição; senão, vale o que o servidor
  // desenhou. Ao sair da página (ir ao edital, a outra aba), guarda o estado para a volta.
  useEffect(() => {
    const volta = tomarVolta(window.location.pathname + window.location.search);
    if (volta) {
      setFiltros(volta.filtros);
      setTela(volta.tela);
      setResultado(volta.resultado);
      setLimite(volta.limite);
      setSelecionadoId(volta.selecionadoId);
      rolagemPendente.current = volta.rolagem;
      void carregarMapa(volta.filtrosMapa);
    } else {
      // Endereço canônico (ordem dos parâmetros, valores inválidos fora): a volta compara por ele.
      window.history.replaceState(null, '', urlDaBusca(filtrosIniciais, telaInicial));
      void carregarMapa(limiteInicial ? VAZIO : filtrosIniciais);
    }
    return () => {
      const atual = paraGuardar.current;
      if (!atual) return;
      guardarVolta({ ...atual, endereco: urlDaBusca(atual.filtros, atual.tela), filtrosMapa: filtrosDoMapa.current, rolagem: rolagem.current });
    };
  }, [carregarMapa, filtrosIniciais, telaInicial, limiteInicial]);

  /** Aplica filtros novos: a lista sempre; o mapa só quando muda o que ele recebe. Toda mudança conta como busca. */
  function aplicar(pedido: FiltrosTela, opcoes: { abrirLista?: boolean } = {}) {
    // Sem município não há raio (trocar a UF ou tirar a cidade tira o raio também).
    const novo = normalizarTela(pedido);
    // O mapa recebe tudo menos a cidade sozinha; com raio, recebe a cidade e o raio.
    const mudouMapa = paraParametros(novo, { comCidade: false }).toString() !== paraParametros(filtros, { comCidade: false }).toString();
    // Cidade nova (pelo mapa, pelo chip ou pelo painel): no celular a lista abre para mostrar os editais dela.
    const cidadeNova = Boolean(novo.cidade && novo.cidade.ibge !== filtros.cidade?.ibge);
    setFiltros(novo);
    trocarTela((opcoes.abrirLista || cidadeNova) && ehCelular() ? 'lista' : tela, novo);
    registrar('busca', { q: novo.q.trim() || null, uf: novo.uf || null, dias: novo.seteDias ? 7 : null });
    for (const recurso of recursosUsados(filtros, novo)) registrar('usou_recurso', { recurso });
    void carregarLista(novo);
    // Repetir a busca depois de um erro do mapa tenta o mapa de novo.
    if (mudouMapa || erroMapa !== null) void carregarMapa(novo);
  }

  // O Mapa guarda o callback numa ref atualizada a cada render: uma função comum basta.
  function escolherCidade(c: Cidade) {
    // Também abre a lista quando a cidade já era a escolhida (a lista pode ter sido fechada).
    aplicar({ ...filtros, cidade: c }, { abrirLista: true });
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
      const mais = await obter<RespostaBusca>(`/api/busca?${paraParametros(filtros, { deslocamento: resultado.editais.length })}`, ERRO_LISTA);
      // Busca ou filtro mudou enquanto esperava: essa página não pertence mais à lista na tela.
      if (id !== pedidoLista.current) return;
      setResultado((anterior) => {
        const ids = new Set(anterior.editais.map((e) => e.id));
        return { total: mais.total, editais: [...anterior.editais, ...mais.editais.filter((e) => !ids.has(e.id))] };
      });
      setErroLista(null);
    } catch (e) {
      if (id !== pedidoLista.current) return;
      if (e instanceof LimiteAtingido) setLimite(e.limite);
      else setErroLista(mensagem(e, ERRO_LISTA));
    } finally {
      if (id === pedidoLista.current) setCarregandoMais(false);
    }
  }

  const listaAberta = tela === 'lista';
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-3 px-4 pt-3 lg:px-6 lg:pt-5">
        <BuscaPrincipal q={filtros.q} uf={filtros.uf} carregando={carregandoLista} aoBuscar={(q, uf) => aplicar({ ...filtros, q, uf, cidade: null })} />
        <Chips filtros={filtros} pontos={pontos} atualizadoEm={atualizadoEm} agora={agora} aoMudar={aplicar} />
      </div>
      <main className="flex min-h-0 flex-1 flex-col pt-3 lg:grid lg:grid-cols-[360px_minmax(0,1fr)_300px] lg:grid-rows-[minmax(0,1fr)] lg:gap-5 lg:px-6 lg:pb-6 lg:pt-4">
        <h1 className="sr-only">Editais abertos no mapa</h1>
        <GavetaCelular aberta={listaAberta} aoAlternar={() => trocarTela(listaAberta ? 'mapa' : 'lista', filtros)}>
          {listaAberta && resumoNoCelular && selecionado ? (
            <div className="mb-3 shrink-0 lg:hidden">
              <CartaoSelecionado edital={selecionado} agora={agora} aoFechar={() => setResumoNoCelular(false)} />
            </div>
          ) : null}
          <ColunaLista
            resultado={resultado}
            agora={agora}
            painel={painel}
            painelPronto={pontosProntos}
            seteDias={filtros.seteDias}
            selecionadoId={selecionado?.id ?? null}
            carregandoLista={carregandoLista}
            carregandoMais={carregandoMais}
            erro={erroLista}
            limite={limite}
            recolhida={!listaAberta}
            cidade={filtros.cidade}
            raio={filtros.raio}
            parametrosBusca={paraParametros(filtros).toString()}
            listaRef={listaRef}
            aoRolar={(topo) => {
              rolagem.current = topo;
            }}
            aoTirarCidade={() => aplicar({ ...filtros, cidade: null })}
            aoSelecionar={selecionar}
            aoMudarPrazo={(seteDias) => aplicar({ ...filtros, seteDias })}
            aoCarregarMais={carregarMais}
          />
        </GavetaCelular>
        <section aria-label="Mapa" className="relative min-h-0 flex-1 overflow-hidden bg-raised lg:rounded-lg lg:border lg:border-line">
          <Mapa pontos={pontos} porUf={painel.porUf} destaque={selecionado?.codigo_ibge ?? null} aoEscolherCidade={escolherCidade} raio={raioMapa} />
          {erroMapa ? (
            <p role="alert" className="absolute left-3 top-3 z-10 max-w-[calc(100%-4.5rem)] rounded-sm bg-pin-soft px-3 py-2 text-xs text-pin-strong">
              {erroMapa}
            </p>
          ) : null}
        </section>
        <aside className="hidden min-h-0 flex-col gap-4 overflow-y-auto lg:flex">
          {selecionado ? <CartaoSelecionado edital={selecionado} agora={agora} /> : null}
          <OndeMaisCompram municipios={painel.topMunicipios} carregando={!pontosProntos} termo={filtros.q} aoEscolher={escolherCidade} />
          <LegendaMapa porUf={painel.porUf} />
        </aside>
      </main>
    </div>
  );
}
```
> Se, quando esta task for feita, a outra sessão já tiver mudado as props de `Mapa` ou `LegendaMapa` no `Explorador` (redesenho do mapa), manter as props novas dela nessas duas linhas: este arquivo só muda a busca, o limite, a tela e a volta.

- [ ] **Step 7: Suíte, tipos, build e commit**

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa.
```bash
git add lib/servidor/nomes.ts lib/servidor/nomes.test.ts app/page.tsx components/Explorador.tsx components/inicio/ColunaLista.tsx components/inicio/BuscaPrincipal.tsx
git commit -m "feat: busca no endereço da página inicial e volta do edital no mesmo lugar" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 12: Celular (barra de baixo, Mapa e Lista em tela cheia, folha de Filtros, card que abre o edital)

**Files:**
- Create: `components/BarraCelular.tsx`, `components/inicio/FolhaFiltros.tsx`, `scripts/celular.test.ts`
- Modify: `components/Explorador.tsx`, `components/inicio/ColunaLista.tsx`, `components/inicio/BuscaPrincipal.tsx`, `components/inicio/CardCompacto.tsx`, `components/inicio/Chips.tsx`, `components/inicio/Icones.tsx`, `components/GavetaCelular.tsx`, `components/BotaoEditalOficial.tsx`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `app/edital/[slug]/page.tsx`

**Interfaces:**
- Consumes: `filtrosAtivos`, `normalizarTela`, `paraParametros` (`lib/filtros.ts`); `comTela`, `urlDaBusca`, `Tela` (Task 4); `lerUltimaBusca` (Task 4); `/api/contagem` (Task 7); tudo o que o `Explorador` da Task 11 consome.
- Produces:
  - `BarraCelular({ ativo, aoTrocarTela }: { ativo: ItemBarra | null; aoTrocarTela?: (t: Tela) => void })` e `BarraCelularGlobal()` em `components/BarraCelular.tsx` (`type ItemBarra = 'mapa' | 'lista' | 'alertas' | 'planos'`). A global aparece em todas as páginas menos `/` (a inicial desenha a dela, que troca Mapa/Lista sem sair da página).
  - `FolhaFiltros({ aberta, filtros, pontos, atualizadoEm, agora, aoAplicar, aoFechar })`.
  - `BuscaPrincipal` ganha `filtrosAtivos: number` e `aoAbrirFiltros: () => void`; `Chips` ganha `emFolha?: boolean`; `BotaoEditalOficial` ganha `variante?: 'cabecalho' | 'barra'` (padrão `'cabecalho'`, escondido no celular).
  - CSS: `--altura-barra` = `calc(60px + env(safe-area-inset-bottom))` abaixo de lg, `0px` a partir de lg; `body` com `padding-bottom: var(--altura-barra)`; `viewport-fit=cover`.
  - `ALTURA_GAVETA_RECOLHIDA` continua exportada por `components/GavetaCelular.tsx` (vale 0: nada mais cobre a base do mapa). `components/Mapa.tsx` não muda.

- [ ] **Step 1: Escrever as guardas (falhando)**

Crie `scripts/celular.test.ts`:
```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALTURA_GAVETA_RECOLHIDA } from '../components/GavetaCelular';

const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

describe('celular', () => {
  it('a gaveta saiu, mas a constante que o Mapa importa continua (e não reserva espaço)', () => {
    expect(ALTURA_GAVETA_RECOLHIDA).toBe(0);
    // O Mapa é redesenhado em outra sessão: se ainda usar a constante, ela vem daqui.
    const mapa = ler('components/Mapa.tsx');
    if (mapa.includes('ALTURA_GAVETA_RECOLHIDA')) expect(mapa).toContain("from './GavetaCelular'");
  });
  it('barra de baixo: 60 px + área segura do iPhone, só abaixo de lg', () => {
    const css = ler('app/globals.css');
    expect(css).toContain('--altura-barra: calc(60px + env(safe-area-inset-bottom));');
    expect(css).toContain('@media (min-width: 1024px)');
    expect(css).toContain('--altura-barra: 0px;');
    expect(css).toContain('padding-bottom: var(--altura-barra);');
    const layout = ler('app/layout.tsx');
    expect(layout).toContain("viewportFit: 'cover'");
    expect(layout).toContain('<BarraCelularGlobal />');
  });
  it('barra com Mapa · Lista · Alertas · Planos, nessa ordem, e área de toque de 60 px', () => {
    const barra = ler('components/BarraCelular.tsx');
    const posicoes = ['>Mapa<', '>Lista<', '>Alertas<', '>Planos<'].map((t) => barra.indexOf(t));
    expect(posicoes.every((p) => p > -1)).toBe(true);
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
    expect(barra).toContain('h-[60px]');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run scripts/celular.test.ts`
Expected: FAIL (`ALTURA_GAVETA_RECOLHIDA` é 168; `--altura-barra` não existe; `components/BarraCelular.tsx` não existe).

- [ ] **Step 3: Gaveta, CSS e layout**

Troque o conteúdo de `components/GavetaCelular.tsx` por:
```tsx
/**
 * A gaveta do celular saiu: abaixo de lg, Mapa e Lista são telas cheias trocadas pela barra de baixo (BarraCelular).
 * A constante continua exportada porque components/Mapa.tsx a usa no enquadramento; vale 0 porque nada mais cobre a base do mapa.
 */
export const ALTURA_GAVETA_RECOLHIDA = 0;
```

Em `app/globals.css`, troque
```css
body {
  background: var(--color-surface);
  color: var(--color-ink);
}
```
por
```css
/* Barra de navegação do celular (components/BarraCelular.tsx): 60 px + área segura do iPhone; a partir de lg não existe. */
:root {
  --altura-barra: calc(60px + env(safe-area-inset-bottom));
}
@media (min-width: 1024px) {
  :root {
    --altura-barra: 0px;
  }
}

body {
  background: var(--color-surface);
  color: var(--color-ink);
  padding-bottom: var(--altura-barra);
}
```

Troque o conteúdo de `app/layout.tsx` por:
```tsx
import type { Metadata, Viewport } from 'next';
import { Instrument_Sans, JetBrains_Mono } from 'next/font/google';
import 'maplibre-gl/dist/maplibre-gl.css';
import { BarraCelularGlobal } from '@/components/BarraCelular';
import './globals.css';

const sans = Instrument_Sans({ subsets: ['latin'], variable: '--fonte-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--fonte-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Edital Map', template: '%s · Edital Map' },
  description: 'Licitações abertas no mapa: encontre editais do que sua empresa vende.',
  robots: { index: false, follow: false },
};

/** viewport-fit=cover: a barra de baixo do celular usa a área segura do iPhone (env(safe-area-inset-bottom)). */
export const viewport: Viewport = { viewportFit: 'cover' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        {children}
        <BarraCelularGlobal />
      </body>
    </html>
  );
}
```

Em `app/page.tsx`, troque `    <div className="flex h-dvh flex-col">` por:
```tsx
    <div className="flex h-[calc(100dvh-var(--altura-barra))] flex-col">
```

- [ ] **Step 4: Ícones e barra de baixo**

Acrescente ao fim de `components/inicio/Icones.tsx`:
```tsx
export function IconeMapa({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}

export function IconeLista({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  );
}

export function IconeSino({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

export function IconeEstrela({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z" />
    </svg>
  );
}
```

Crie `components/BarraCelular.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { lerUltimaBusca } from '@/lib/cliente/volta';
import { comTela, type Tela } from '@/lib/urlBusca';
import { IconeEstrela, IconeLista, IconeMapa, IconeSino } from './inicio/Icones';

export type ItemBarra = 'mapa' | 'lista' | 'alertas' | 'planos';

const ITEM = 'flex h-[60px] min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold';
const ICONE = 'size-[22px]';

type Props = {
  ativo: ItemBarra | null;
  /** Só na página inicial: Mapa e Lista trocam a tela sem sair da página. */
  aoTrocarTela?: (t: Tela) => void;
};

/** Barra fixa do celular (abaixo de lg): Mapa · Lista · Alertas · Planos, com área de toque de 60 px e a área segura do iPhone. */
export function BarraCelular({ ativo, aoTrocarTela }: Props) {
  // Fora da página inicial, Mapa e Lista voltam para a última busca feita (guardada pela página inicial).
  const [busca, setBusca] = useState('/');
  useEffect(() => setBusca(lerUltimaBusca()), []);
  const estilo = (i: ItemBarra) => `${ITEM} ${ativo === i ? 'text-pin-strong' : 'text-ink-muted'}`;
  const atual = (i: ItemBarra) => (ativo === i ? 'page' : undefined);

  function telaDaInicial(t: Tela, icone: ReactNode, rotulo: ReactNode) {
    return aoTrocarTela ? (
      <button type="button" onClick={() => aoTrocarTela(t)} aria-current={atual(t)} className={estilo(t)}>
        {icone}
        <span>{rotulo}</span>
      </button>
    ) : (
      <Link href={comTela(busca, t)} aria-current={atual(t)} className={estilo(t)}>
        {icone}
        <span>{rotulo}</span>
      </Link>
    );
  }

  return (
    <nav aria-label="Navegação" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-raised pb-[env(safe-area-inset-bottom)] lg:hidden">
      {telaDaInicial('mapa', <IconeMapa className={ICONE} />, <>Mapa</>)}
      {telaDaInicial('lista', <IconeLista className={ICONE} />, <>Lista</>)}
      <Link href="/alertas" aria-current={atual('alertas')} className={estilo('alertas')}>
        <IconeSino className={ICONE} />
        <span>Alertas</span>
      </Link>
      <Link href="/planos" aria-current={atual('planos')} className={estilo('planos')}>
        <IconeEstrela className={ICONE} />
        <span>Planos</span>
      </Link>
    </nav>
  );
}

/** Barra das páginas que não são a inicial (a inicial desenha a dela, com a tela atual). */
export function BarraCelularGlobal() {
  const caminho = usePathname() ?? '/';
  if (caminho === '/') return null;
  const ativo: ItemBarra | null = caminho.startsWith('/alertas') ? 'alertas' : caminho.startsWith('/planos') ? 'planos' : null;
  return <BarraCelular ativo={ativo} />;
}
```
(Os rótulos ficam como texto JSX — `<>Mapa</>`, `<span>Alertas</span>` — e a guarda da Step 1 os procura na ordem.)

- [ ] **Step 5: Botão do edital oficial fixo no celular**

Troque o conteúdo de `components/BotaoEditalOficial.tsx` por:
```tsx
'use client';

import { registrar } from '@/lib/cliente/registrar';

const VARIANTE = {
  /** Cabeçalho da página do edital: no celular some (o botão fica fixo embaixo). */
  cabecalho: 'hidden lg:inline-flex',
  /** Barra fixa do celular, na largura toda. */
  barra: 'flex w-full justify-center',
} as const;

type Props = { href: string; slug: string; variante?: keyof typeof VARIANTE };

export function BotaoEditalOficial({ href, slug, variante = 'cabecalho' }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => registrar('clicou_edital_oficial', { edital: slug })}
      onAuxClick={(e) => {
        if (e.button === 1) registrar('clicou_edital_oficial', { edital: slug });
      }}
      className={`${VARIANTE[variante]} h-11 items-center gap-2 rounded-sm bg-ink px-4 text-sm font-semibold text-surface hover:bg-[#1b3a63]`}
    >
      Abrir edital oficial
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
      </svg>
    </a>
  );
}
```

Em `app/edital/[slug]/page.tsx`:
1. Troque `      <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-6 md:px-6">` por:
```tsx
      <main className={`mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pt-6 md:px-6 lg:pb-6 ${detalhes ? 'pb-28' : 'pb-6'}`}>
```
2. Logo depois de `            <PrincipaisInformacoes edital={e} resumo={{ ...detalhes.resumo, total: detalhes.totalItens }} agora={agora} />`, acrescente:
```tsx
            {/* Celular: "Abrir edital oficial" fixo acima da barra de navegação (só com o edital liberado). */}
            <div className="fixed inset-x-0 bottom-[var(--altura-barra)] z-30 border-t border-line bg-raised px-4 py-3 lg:hidden">
              <BotaoEditalOficial href={linkOficial(e)} slug={e.slug} variante="barra" />
            </div>
```

- [ ] **Step 6: Chips na folha e card que abre o edital**

Em `components/inicio/Chips.tsx`:
1. Troque
```tsx
type Props = { filtros: FiltrosTela; pontos: PontoMapa[]; atualizadoEm: string | null; agora: Date; aoMudar: (f: FiltrosTela) => void };
```
por
```tsx
type Props = {
  filtros: FiltrosTela;
  pontos: PontoMapa[];
  atualizadoEm: string | null;
  agora: Date;
  aoMudar: (f: FiltrosTela) => void;
  /** Na folha de Filtros do celular: os chips quebram linha e a linha da fonte some. */
  emFolha?: boolean;
};
```
2. Troque `export function Chips({ filtros, pontos, atualizadoEm, agora, aoMudar }: Props) {` por:
```tsx
export function Chips({ filtros, pontos, atualizadoEm, agora, aoMudar, emFolha = false }: Props) {
```
3. Troque
```tsx
      <div className="-mx-4 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-4 py-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:py-0">
```
por
```tsx
      <div
        className={
          emFolha
            ? 'flex min-w-0 flex-1 flex-wrap items-center gap-2'
            : '-mx-4 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-4 py-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:py-0'
        }
      >
```
4. Troque
```tsx
      <p className="hidden shrink-0 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted xl:block">
        Fonte: PNCP{atualizadoEm ? ` · atualizado ${haQuanto(atualizadoEm, agora)}` : ''}
      </p>
```
por
```tsx
      {emFolha ? null : (
        <p className="hidden shrink-0 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted xl:block">
          Fonte: PNCP{atualizadoEm ? ` · atualizado ${haQuanto(atualizadoEm, agora)}` : ''}
        </p>
      )}
```

Troque o conteúdo de `components/inicio/CardCompacto.tsx` por:
```tsx
'use client';

import Link from 'next/link';
import type { MouseEvent } from 'react';
import { etiqueta, moedaCurta } from '@/lib/formato';
import { assunto, nomeProprio } from '@/lib/texto';
import type { EditalResumo } from '@/lib/tipos';
import { ESTILO_ETIQUETA, PONTO_ETIQUETA } from './estilos';

type Props = { edital: EditalResumo; agora: Date; selecionado: boolean; aoSelecionar: () => void };

/**
 * Card da lista: título limpo, valor curto à direita, órgão · UF e etiqueta de prazo.
 * Computador (lg+): clicar seleciona (o resumo aparece na coluna da direita). Celular: tocar abre o edital.
 * Ctrl/⌘/Shift/Alt/botão do meio abrem em outra aba. Sem prefetch: cada edital aberto conta no limite do dia.
 */
export function CardCompacto({ edital, agora, selecionado, aoSelecionar }: Props) {
  const et = etiqueta(edital, agora);
  const valor = moedaCurta(edital.valor_estimado);
  const { titulo, tipo } = assunto(edital.objeto);

  function clicar(e: MouseEvent<HTMLAnchorElement>) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (window.matchMedia('(min-width: 1024px)').matches) {
      e.preventDefault();
      aoSelecionar();
    }
  }

  return (
    <Link
      href={`/edital/${edital.slug}`}
      prefetch={false}
      onClick={clicar}
      aria-current={selecionado ? 'true' : undefined}
      className={`flex w-full shrink-0 flex-col gap-2 rounded-md border bg-raised p-3.5 text-left transition-colors ${
        selecionado ? 'border-line lg:border-ink lg:shadow-[0_0_0_1px_#0c2340]' : 'border-line hover:border-line-strong'
      }`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="line-clamp-3 text-[14px] font-semibold leading-5">{titulo}</span>
        {valor ? (
          <span className="shrink-0 whitespace-nowrap font-mono text-[13px] font-medium">{valor}</span>
        ) : (
          <span className="w-16 shrink-0 text-right text-[11px] leading-4 text-ink-muted">Valor não informado</span>
        )}
      </span>
      <span className="truncate text-xs text-ink-muted">
        {[tipo, nomeProprio(edital.orgao_nome), edital.uf].filter(Boolean).join(' · ')}
      </span>
      {edital.onde === 'itens' ? <span className="text-xs text-rio">Encontrado nos itens</span> : null}
      <span className={`inline-flex w-fit items-center gap-1.5 rounded-xs px-2 py-0.5 text-xs font-semibold ${ESTILO_ETIQUETA[et.tom]}`}>
        <span className={`size-[7px] rounded-full ${PONTO_ETIQUETA[et.tom]}`} aria-hidden="true" />
        {et.texto}
      </span>
    </Link>
  );
}
```

- [ ] **Step 7: Busca compacta e folha de Filtros**

Troque o conteúdo de `components/inicio/BuscaPrincipal.tsx` por:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { UFS_ORDENADAS } from '@/lib/filtros';
import { Lupa, PinoMini, Seta } from './Icones';

type Props = {
  q: string;
  uf: string;
  carregando: boolean;
  /** Filtros valendo (botão "Filtros (n)" do celular). */
  filtrosAtivos: number;
  aoBuscar: (q: string, uf: string) => void;
  aoAbrirFiltros: () => void;
};

/**
 * Computador: "O que sua empresa vende?" + local ("Todo o Brasil" ou UF) + "Buscar no mapa", numa barra só.
 * Celular: só o campo e o botão "Filtros (n)" (a UF e os outros filtros ficam na folha de Filtros).
 */
export function BuscaPrincipal({ q, uf, carregando, filtrosAtivos, aoBuscar, aoAbrirFiltros }: Props) {
  const [texto, setTexto] = useState(q);
  const [local, setLocal] = useState(uf);
  useEffect(() => setLocal(uf), [uf]);
  // A busca pode mudar fora do campo (voltar do edital restaura o termo): o campo acompanha.
  useEffect(() => setTexto(q), [q]);

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
      <div className="flex gap-2 lg:items-center lg:gap-0 lg:rounded-md lg:border lg:border-line-strong lg:bg-raised lg:p-1.5">
        <div className="relative flex min-w-0 flex-1 items-center">
          {/* A lupa também envia (no celular é o único botão de busca; Enter também envia). */}
          <button
            type="submit"
            aria-label="Buscar"
            disabled={carregando}
            className="absolute left-1 flex size-9 items-center justify-center rounded-sm text-ink-muted disabled:opacity-60"
          >
            <Lupa className="size-[18px]" />
          </button>
          <input
            id="q"
            type="search"
            enterKeyHint="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ex.: EPI, uniformes"
            autoComplete="off"
            maxLength={100}
            className="h-11 w-full rounded-sm border border-line-strong bg-raised pl-10 pr-3 lg:border-0 lg:bg-transparent"
          />
        </div>
        <button
          type="button"
          onClick={aoAbrirFiltros}
          className="h-11 shrink-0 rounded-sm border border-line-strong bg-raised px-3.5 text-sm font-semibold lg:hidden"
        >
          {filtrosAtivos > 0 ? `Filtros (${filtrosAtivos})` : 'Filtros'}
        </button>
        <label className="relative hidden h-11 min-w-0 items-center border-l border-line lg:flex lg:flex-none">
          <span className="sr-only">Onde</span>
          <PinoMini className="pointer-events-none absolute left-3 h-4 w-3" />
          <select
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="h-full w-auto appearance-none bg-transparent pl-9 pr-8 text-sm font-semibold [&>option]:bg-raised [&>option]:text-ink"
          >
            <option value="">Todo o Brasil</option>
            {UFS_ORDENADAS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <Seta className="pointer-events-none absolute right-2.5 size-4 text-ink-muted" />
        </label>
        <button
          type="submit"
          disabled={carregando}
          className="hidden h-11 shrink-0 rounded-sm bg-pin px-5 text-sm font-semibold text-on-pin disabled:opacity-60 lg:ml-1.5 lg:block"
        >
          {carregando ? 'Buscando…' : 'Buscar no mapa'}
        </button>
      </div>
    </form>
  );
}
```

Crie `components/inicio/FolhaFiltros.tsx`:
```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { filtrosAtivos, normalizarTela, paraParametros } from '@/lib/filtros';
import { numero } from '@/lib/formato';
import type { FiltrosTela, PontoMapa } from '@/lib/tipos';
import { Chips } from './Chips';

type Props = {
  aberta: boolean;
  filtros: FiltrosTela;
  pontos: PontoMapa[];
  atualizadoEm: string | null;
  agora: Date;
  aoAplicar: (f: FiltrosTela) => void;
  aoFechar: () => void;
};

const ALTERNADOR = 'h-10 flex-1 rounded-sm text-sm font-semibold transition-colors';

/**
 * Celular: folha em tela cheia com os mesmos controles do computador (UF, Município, Valor, Modalidade, Órgão, Raio) e o prazo.
 * As escolhas ficam num rascunho e só valem no "Ver N editais" (uma busca só, no limite do dia). N vem de /api/contagem,
 * que não conta como busca.
 */
export function FolhaFiltros({ aberta, filtros, pontos, atualizadoEm, agora, aoAplicar, aoFechar }: Props) {
  const [rascunho, setRascunho] = useState<FiltrosTela>(filtros);
  const [total, setTotal] = useState<number | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const parametros = paraParametros(rascunho).toString();

  // Ao abrir, começa dos filtros que valem agora e leva o foco para o título.
  useEffect(() => {
    if (!aberta) return;
    setRascunho(filtros);
    titulo.current?.focus();
  }, [aberta, filtros]);

  // Quantos editais o rascunho traria (espera o toque parar por 300 ms).
  useEffect(() => {
    if (!aberta) return;
    setTotal(null);
    const controle = new AbortController();
    const espera = setTimeout(() => {
      fetch(`/api/contagem?${parametros}`, { signal: controle.signal })
        .then((r) => (r.ok ? (r.json() as Promise<{ total?: unknown }>) : null))
        .then((c) => setTotal(typeof c?.total === 'number' ? c.total : null))
        .catch(() => undefined);
    }, 300);
    return () => {
      clearTimeout(espera);
      controle.abort();
    };
  }, [aberta, parametros]);

  useEffect(() => {
    if (!aberta) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [aberta, aoFechar]);

  if (!aberta) return null;
  const limpo: FiltrosTela = { ...rascunho, uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="folha-filtros-titulo" className="fixed inset-0 z-50 flex flex-col bg-surface lg:hidden">
      <div className="flex shrink-0 items-center gap-2 border-b border-line bg-raised px-2 py-1.5">
        <button type="button" onClick={aoFechar} aria-label="Fechar filtros" className="size-11 rounded-sm text-2xl leading-none">
          ×
        </button>
        <h2 id="folha-filtros-titulo" ref={titulo} tabIndex={-1} className="text-lg font-bold outline-none">
          Filtros
        </h2>
        <button
          type="button"
          onClick={() => setRascunho(limpo)}
          disabled={filtrosAtivos(rascunho) === 0}
          className="ml-auto h-11 px-3 text-sm font-semibold text-pin-strong disabled:opacity-50"
        >
          Limpar filtros
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
        <Chips filtros={rascunho} pontos={pontos} atualizadoEm={atualizadoEm} agora={agora} aoMudar={(f) => setRascunho(normalizarTela(f))} emFolha />
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-ink-muted">Prazo</p>
          <div className="flex gap-1 rounded-md bg-sunken p-1" role="group" aria-label="Prazo">
            <button
              type="button"
              aria-pressed={!rascunho.seteDias}
              onClick={() => setRascunho({ ...rascunho, seteDias: false })}
              className={`${ALTERNADOR} ${!rascunho.seteDias ? 'bg-raised shadow-sm' : 'text-ink-muted'}`}
            >
              Todos abertos
            </button>
            <button
              type="button"
              aria-pressed={rascunho.seteDias}
              onClick={() => setRascunho({ ...rascunho, seteDias: true })}
              className={`${ALTERNADOR} ${rascunho.seteDias ? 'bg-raised shadow-sm' : 'text-ink-muted'}`}
            >
              Encerram em 7 dias
            </button>
          </div>
        </div>
      </div>
      <div className="shrink-0 border-t border-line bg-raised px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          onClick={() => {
            aoAplicar(rascunho);
            aoFechar();
          }}
          className="h-12 w-full rounded-md bg-pin text-[15px] font-bold text-on-pin"
        >
          {total === null ? 'Ver editais' : `Ver ${numero(total)} ${total === 1 ? 'edital' : 'editais'}`}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Lista em tela cheia**

Troque o conteúdo de `components/inicio/ColunaLista.tsx` por:
```tsx
'use client';

import { useEffect, useState, type RefObject } from 'react';
import { CartaoLimite } from '@/components/CartaoLimite';
import { moedaCurta, numero } from '@/lib/formato';
import type { Limite } from '@/lib/limites';
import type { Painel } from '@/lib/painel';
import type { Cidade, EditalResumo, ResultadoBusca } from '@/lib/tipos';
import { BotaoExportar } from './BotaoExportar';
import { CardCompacto } from './CardCompacto';

type Props = {
  resultado: ResultadoBusca;
  agora: Date;
  painel: Painel;
  /** Falso enquanto os pontos do mapa não chegaram: o resumo (UFs, valor) ainda não é verdadeiro. */
  painelPronto?: boolean;
  seteDias: boolean;
  selecionadoId: string | null;
  carregandoLista: boolean;
  carregandoMais: boolean;
  erro: string | null;
  /** Busca nova além das 3 do dia: no lugar da lista, o cartão dos planos. */
  limite: Limite | null;
  /** Município escolhido: no celular os chips ficam na folha de Filtros, então o filtro aparece e sai daqui. */
  cidade: Cidade | null;
  /** Raio em km a partir da cidade (aparece na pílula do celular). */
  raio: number | null;
  /** Parâmetros da busca atual (os mesmos de /api/busca), para o botão Exportar. */
  parametrosBusca: string;
  /** Área que rola (a página guarda a posição para voltar do edital no mesmo lugar). */
  listaRef: RefObject<HTMLDivElement | null>;
  aoRolar: (topo: number) => void;
  aoTirarCidade: () => void;
  aoSelecionar: (e: EditalResumo) => void;
  aoMudarPrazo: (seteDias: boolean) => void;
  aoCarregarMais: () => void;
};

const ALTERNADOR = 'h-8 flex-1 rounded-sm text-[13px] font-semibold transition-colors';

/** Contagem, resumo, prazo, Exportar e os cards. No celular é a tela Lista; a partir de lg, a coluna da esquerda. */
export function ColunaLista(p: Props) {
  const { total, editais } = p.resultado;
  const painelPronto = p.painelPronto ?? true;
  const [erroExportar, setErroExportar] = useState<string | null>(null);
  // O erro da exportação é da busca em que ocorreu: some quando a busca muda.
  useEffect(() => setErroExportar(null), [p.parametrosBusca]);
  // Toda busca nova (inclusive a que traz o mesmo primeiro edital) volta ao topo; "carregar mais" não mexe em `carregandoLista`.
  useEffect(() => {
    if (p.carregandoLista) p.listaRef.current?.scrollTo({ top: 0 });
  }, [p.carregandoLista, p.listaRef]);

  if (p.limite) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-1">
        <CartaoLimite tipo={p.limite.tipo} />
      </div>
    );
  }

  const valor = moedaCurta(p.painel.valorTotal);
  return (
    <>
      <div className="shrink-0">
        <div className="flex items-center gap-2">
          <p aria-live="polite" className="flex shrink-0 items-baseline gap-2">
            <span className="font-mono text-[26px] font-semibold leading-none tracking-[-0.02em] lg:text-[34px]">
              {p.carregandoLista && editais.length === 0 ? '…' : numero(total)}
            </span>
            <span className="text-[15px] font-bold">{total === 1 ? 'edital aberto' : 'editais abertos'}</span>
          </p>
          {p.cidade ? (
            <span className="inline-flex min-w-0 items-center gap-1 rounded-sm bg-ink pl-2 text-xs font-semibold text-surface lg:hidden">
              <span className="truncate">
                {p.cidade.nome}/{p.cidade.uf}
                {p.raio ? ` + ${p.raio} km` : ''}
              </span>
              <button type="button" onClick={p.aoTirarCidade} aria-label="Tirar filtro de cidade" className="size-6 shrink-0 text-base leading-none">
                ×
              </button>
            </span>
          ) : null}
          <span className="ml-auto">
            <BotaoExportar parametros={p.parametrosBusca} total={total} aoErro={setErroExportar} />
          </span>
        </div>
        <p className="mt-1 font-mono text-xs text-ink-muted">
          {painelPronto
            ? `${p.painel.ufs} ${p.painel.ufs === 1 ? 'UF' : 'UFs'} · ${valor ? `${valor} em valor estimado` : 'valor não informado'}`
            : 'Carregando o resumo…'}
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
      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        <p className="mb-3 shrink-0 font-mono text-[11px] text-ink-muted lg:hidden">
          Editais abertos de todo o Brasil · o ponto é a sede do órgão, não o local de entrega
        </p>
        {p.erro ? <p role="alert" className="mb-3 shrink-0 rounded-sm bg-pin-soft px-3 py-2 text-sm text-pin-strong">{p.erro}</p> : null}
        {erroExportar ? <p role="alert" className="mb-3 shrink-0 rounded-sm bg-pin-soft px-3 py-2 text-sm text-pin-strong">{erroExportar}</p> : null}
        <div
          ref={p.listaRef}
          onScroll={(e) => p.aoRolar(e.currentTarget.scrollTop)}
          aria-busy={p.carregandoLista}
          className={`flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-1 transition-opacity ${p.carregandoLista ? 'opacity-60' : ''}`}
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

- [ ] **Step 9: `Explorador` com as telas do celular**

Troque o conteúdo de `components/Explorador.tsx` por (mesma lógica da Task 11; muda a tela do celular, a folha de Filtros e a barra; sai a gaveta e o cartão escuro do celular, porque tocar no card abre o edital):
```tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { registrar } from '@/lib/cliente/registrar';
import { publicarUso } from '@/lib/cliente/uso';
import { guardarUltimaBusca, guardarVolta, tomarVolta, type Volta } from '@/lib/cliente/volta';
import { filtrosAtivos, normalizarTela, paraParametros, recursosUsados } from '@/lib/filtros';
import type { Raio } from '@/lib/geo';
import { LimiteAtingido, lerLimite, type Limite, type RespostaBusca } from '@/lib/limites';
import { resumirPontos } from '@/lib/painel';
import type { Cidade, EditalResumo, FiltrosTela, PontoMapa, ResultadoBusca } from '@/lib/tipos';
import { urlDaBusca, type Tela } from '@/lib/urlBusca';
import { BarraCelular } from './BarraCelular';
import { Mapa } from './Mapa';
import { BuscaPrincipal } from './inicio/BuscaPrincipal';
import { CartaoSelecionado } from './inicio/CartaoSelecionado';
import { Chips } from './inicio/Chips';
import { ColunaLista } from './inicio/ColunaLista';
import { FolhaFiltros } from './inicio/FolhaFiltros';
import { LegendaMapa } from './inicio/LegendaMapa';
import { OndeMaisCompram } from './inicio/OndeMaisCompram';

const VAZIO: FiltrosTela = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };
const SEM_RESULTADO: ResultadoBusca = { total: 0, editais: [] };
const ERRO_LISTA = 'Não foi possível buscar agora. Confira a conexão e tente de novo.';
const ERRO_MAPA = 'Não foi possível carregar o mapa agora.';
const TEMPO_LIMITE_MS = 20_000;

/** Abaixo de lg (1024 px): Mapa e Lista são telas cheias trocadas pela barra de baixo. */
const ehCelular = () => window.matchMedia('(max-width: 1023px)').matches;

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
    // Limite do grátis (402): a tela mostra o cartão dos planos, não um erro.
    const limite = lerLimite(resposta.status, corpo);
    if (limite) throw new LimiteAtingido(limite);
    const erro = typeof corpo === 'object' && corpo !== null ? (corpo as { erro?: unknown }).erro : null;
    throw new Error(typeof erro === 'string' && erro.trim() ? erro : padrao);
  }
  if (corpo === null) throw new Error(padrao);
  return corpo as T;
}

const mensagem = (e: unknown, padrao: string) => (e instanceof Error && e.message ? e.message : padrao);

type Props = {
  filtrosIniciais: FiltrosTela;
  telaInicial: Tela;
  /** null quando a busca do endereço já bateu no limite do dia. */
  inicial: ResultadoBusca | null;
  limiteInicial: Limite | null;
  agoraInicial: string;
  atualizadoEm: string | null;
};

/** Parte do estado guardada ao sair da página (o resto da Volta é calculado na hora de guardar). */
type Guardavel = Pick<Volta, 'filtros' | 'resultado' | 'limite' | 'tela' | 'selecionadoId'>;

export function Explorador({ filtrosIniciais, telaInicial, inicial, limiteInicial, agoraInicial, atualizadoEm }: Props) {
  const [filtros, setFiltros] = useState<FiltrosTela>(filtrosIniciais);
  // Celular: Mapa ou Lista, guardada no endereço para voltar do edital na mesma tela.
  const [tela, setTela] = useState<Tela>(telaInicial);
  const [resultado, setResultado] = useState<ResultadoBusca>(inicial ?? SEM_RESULTADO);
  const [limite, setLimite] = useState<Limite | null>(limiteInicial);
  const [agora, setAgora] = useState(() => new Date(agoraInicial));
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [erroMapa, setErroMapa] = useState<string | null>(null);
  const [pontos, setPontos] = useState<PontoMapa[]>([]);
  // Falso até o primeiro mapa chegar: antes disso o resumo (UFs, valor, municípios) ainda não existe.
  const [pontosProntos, setPontosProntos] = useState(false);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(inicial?.editais[0]?.id ?? null);
  const [folhaAberta, setFolhaAberta] = useState(false);
  // Sede de cada município já visto no mapa: centro do círculo do raio (a cidade escolhida sempre veio de um ponto do mapa).
  const [centros, setCentros] = useState<Record<string, [number, number]>>({});
  // Numeração dos pedidos: só a resposta do pedido mais recente pode mudar a tela.
  const pedidoLista = useRef(0);
  const pedidoMapa = useRef(0);
  // Para voltar do edital no mesmo lugar: a área da lista e a posição dela, a busca do mapa e o estado da tela.
  const listaRef = useRef<HTMLDivElement>(null);
  const rolagem = useRef(0);
  const rolagemPendente = useRef<number | null>(null);
  const filtrosDoMapa = useRef<FiltrosTela>(VAZIO);
  const paraGuardar = useRef<Guardavel | null>(null);

  const painel = useMemo(() => resumirPontos(pontos), [pontos]);
  const selecionado = resultado.editais.find((e) => e.id === selecionadoId) ?? resultado.editais[0] ?? null;
  const centro = filtros.cidade && filtros.raio ? centros[filtros.cidade.ibge] : undefined;
  const raioMapa = useMemo<Raio | null>(
    () => (centro && filtros.raio ? { lng: centro[0], lat: centro[1], km: filtros.raio } : null),
    [centro, filtros.raio],
  );

  /** Troca a tela do celular e escreve a busca no endereço (sem recarregar a página). */
  const trocarTela = useCallback((nova: Tela, f: FiltrosTela) => {
    setTela(nova);
    window.history.replaceState(null, '', urlDaBusca(f, nova));
  }, []);

  const carregarLista = useCallback(
    async (f: FiltrosTela) => {
      const id = ++pedidoLista.current;
      setCarregandoLista(true);
      setCarregandoMais(false);
      try {
        const novo = await obter<RespostaBusca>(`/api/busca?${paraParametros(f)}`, ERRO_LISTA);
        if (id !== pedidoLista.current) return;
        setResultado({ total: novo.total, editais: novo.editais });
        setLimite(null);
        if (novo.buscasUsadas !== null) publicarUso({ buscas: novo.buscasUsadas });
        setSelecionadoId(novo.editais[0]?.id ?? null);
        setAgora(new Date());
        setErroLista(null);
      } catch (e) {
        if (id !== pedidoLista.current) return;
        if (e instanceof LimiteAtingido) {
          // Busca nova além do limite do dia: o cartão dos planos no lugar da lista (o mapa fica com a última permitida).
          setLimite(e.limite);
          publicarUso({ buscas: e.limite.usados });
          setErroLista(null);
        } else {
          setErroLista(mensagem(e, ERRO_LISTA));
        }
        // No celular, o aviso e o cartão aparecem na Lista: ela abre.
        if (ehCelular()) trocarTela('lista', f);
      } finally {
        if (id === pedidoLista.current) setCarregandoLista(false);
      }
    },
    [trocarTela],
  );

  const carregarMapa = useCallback(async (f: FiltrosTela) => {
    const id = ++pedidoMapa.current;
    const anterior = filtrosDoMapa.current;
    filtrosDoMapa.current = f;
    try {
      // Os mesmos parâmetros da lista: a mesma busca no limite do dia (o servidor ignora a cidade sem raio no mapa).
      const novos = await obter<PontoMapa[]>(`/api/mapa?${paraParametros(f)}`, ERRO_MAPA);
      if (id !== pedidoMapa.current) return;
      setPontos(novos);
      setCentros((anteriores) => {
        const todos = { ...anteriores };
        for (const p of novos) todos[p.codigo_ibge] = [p.lng, p.lat];
        return todos;
      });
      setPontosProntos(true);
      setErroMapa(null);
    } catch (e) {
      if (id !== pedidoMapa.current) return;
      // Limite do dia: o mapa fica com a última busca permitida, sem aviso (o cartão aparece na lista).
      if (e instanceof LimiteAtingido) {
        filtrosDoMapa.current = anterior;
        return;
      }
      setErroMapa(mensagem(e, ERRO_MAPA));
    }
  }, []);

  // Estado que a página guarda ao sair (a limpeza do efeito de montagem não enxerga o estado novo).
  useEffect(() => {
    paraGuardar.current = { filtros, resultado, limite, tela, selecionadoId };
  }, [filtros, resultado, limite, tela, selecionadoId]);

  // Última busca, para os links Mapa e Lista da barra do celular nas outras páginas.
  useEffect(() => guardarUltimaBusca(urlDaBusca(filtros)), [filtros]);

  // Volta do edital: devolve a lista à posição em que estava, quando ela estiver visível.
  useEffect(() => {
    const lista = listaRef.current;
    if (rolagemPendente.current === null || !lista || lista.clientHeight === 0) return;
    lista.scrollTop = rolagemPendente.current;
    rolagemPendente.current = null;
  }, [resultado, tela]);

  // Montagem: voltando do edital (mesmo endereço), restaura busca, lista, tela e posição; senão, vale o que o servidor
  // desenhou. Ao sair da página (ir ao edital, a outra aba), guarda o estado para a volta.
  useEffect(() => {
    const volta = tomarVolta(window.location.pathname + window.location.search);
    if (volta) {
      setFiltros(volta.filtros);
      setTela(volta.tela);
      setResultado(volta.resultado);
      setLimite(volta.limite);
      setSelecionadoId(volta.selecionadoId);
      rolagemPendente.current = volta.rolagem;
      void carregarMapa(volta.filtrosMapa);
    } else {
      // Endereço canônico (ordem dos parâmetros, valores inválidos fora): a volta compara por ele.
      window.history.replaceState(null, '', urlDaBusca(filtrosIniciais, telaInicial));
      void carregarMapa(limiteInicial ? VAZIO : filtrosIniciais);
    }
    return () => {
      const atual = paraGuardar.current;
      if (!atual) return;
      guardarVolta({ ...atual, endereco: urlDaBusca(atual.filtros, atual.tela), filtrosMapa: filtrosDoMapa.current, rolagem: rolagem.current });
    };
  }, [carregarMapa, filtrosIniciais, telaInicial, limiteInicial]);

  /** Aplica filtros novos: a lista sempre; o mapa só quando muda o que ele recebe. Toda mudança conta como busca. */
  function aplicar(pedido: FiltrosTela, opcoes: { abrirLista?: boolean } = {}) {
    // Sem município não há raio (trocar a UF ou tirar a cidade tira o raio também).
    const novo = normalizarTela(pedido);
    // O mapa recebe tudo menos a cidade sozinha; com raio, recebe a cidade e o raio.
    const mudouMapa = paraParametros(novo, { comCidade: false }).toString() !== paraParametros(filtros, { comCidade: false }).toString();
    // Cidade nova (pelo mapa, pelo chip ou pelo painel): no celular a Lista abre para mostrar os editais dela.
    const cidadeNova = Boolean(novo.cidade && novo.cidade.ibge !== filtros.cidade?.ibge);
    setFiltros(novo);
    trocarTela((opcoes.abrirLista || cidadeNova) && ehCelular() ? 'lista' : tela, novo);
    registrar('busca', { q: novo.q.trim() || null, uf: novo.uf || null, dias: novo.seteDias ? 7 : null });
    for (const recurso of recursosUsados(filtros, novo)) registrar('usou_recurso', { recurso });
    void carregarLista(novo);
    // Repetir a busca depois de um erro do mapa tenta o mapa de novo.
    if (mudouMapa || erroMapa !== null) void carregarMapa(novo);
  }

  // O Mapa guarda o callback numa ref atualizada a cada render: uma função comum basta.
  function escolherCidade(c: Cidade) {
    // Também abre a Lista quando a cidade já era a escolhida.
    aplicar({ ...filtros, cidade: c }, { abrirLista: true });
  }

  /** Computador: o card selecionado aparece no resumo da direita (no celular, tocar no card abre o edital). */
  function selecionar(e: EditalResumo) {
    setSelecionadoId(e.id);
  }

  async function carregarMais() {
    if (carregandoMais || carregandoLista) return;
    const id = pedidoLista.current;
    setCarregandoMais(true);
    try {
      const mais = await obter<RespostaBusca>(`/api/busca?${paraParametros(filtros, { deslocamento: resultado.editais.length })}`, ERRO_LISTA);
      // Busca ou filtro mudou enquanto esperava: essa página não pertence mais à lista na tela.
      if (id !== pedidoLista.current) return;
      setResultado((anterior) => {
        const ids = new Set(anterior.editais.map((e) => e.id));
        return { total: mais.total, editais: [...anterior.editais, ...mais.editais.filter((e) => !ids.has(e.id))] };
      });
      setErroLista(null);
    } catch (e) {
      if (id !== pedidoLista.current) return;
      if (e instanceof LimiteAtingido) setLimite(e.limite);
      else setErroLista(mensagem(e, ERRO_LISTA));
    } finally {
      if (id === pedidoLista.current) setCarregandoMais(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-3 px-4 pt-3 lg:px-6 lg:pt-5">
        <BuscaPrincipal
          q={filtros.q}
          uf={filtros.uf}
          carregando={carregandoLista}
          filtrosAtivos={filtrosAtivos(filtros)}
          aoBuscar={(q, uf) => aplicar({ ...filtros, q, uf, cidade: null })}
          aoAbrirFiltros={() => setFolhaAberta(true)}
        />
        <div className="hidden lg:block">
          <Chips filtros={filtros} pontos={pontos} atualizadoEm={atualizadoEm} agora={agora} aoMudar={aplicar} />
        </div>
      </div>
      <main className="relative flex min-h-0 flex-1 flex-col pt-3 lg:grid lg:grid-cols-[360px_minmax(0,1fr)_300px] lg:grid-rows-[minmax(0,1fr)] lg:gap-5 lg:px-6 lg:pb-6 lg:pt-4">
        <h1 className="sr-only">Editais abertos no mapa</h1>
        {/* Celular: a Lista cobre o mapa (que continua montado) quando é a tela ativa. Computador: a coluna da esquerda. */}
        <section
          aria-label="Lista de editais"
          className={`${tela === 'lista' ? 'flex' : 'hidden'} absolute inset-0 z-20 flex-col bg-surface px-4 pb-3 pt-3 lg:static lg:z-auto lg:flex lg:min-h-0 lg:bg-transparent lg:p-0`}
        >
          <ColunaLista
            resultado={resultado}
            agora={agora}
            painel={painel}
            painelPronto={pontosProntos}
            seteDias={filtros.seteDias}
            selecionadoId={selecionado?.id ?? null}
            carregandoLista={carregandoLista}
            carregandoMais={carregandoMais}
            erro={erroLista}
            limite={limite}
            cidade={filtros.cidade}
            raio={filtros.raio}
            parametrosBusca={paraParametros(filtros).toString()}
            listaRef={listaRef}
            aoRolar={(topo) => {
              rolagem.current = topo;
            }}
            aoTirarCidade={() => aplicar({ ...filtros, cidade: null })}
            aoSelecionar={selecionar}
            aoMudarPrazo={(seteDias) => aplicar({ ...filtros, seteDias })}
            aoCarregarMais={carregarMais}
          />
        </section>
        <section aria-label="Mapa" className="relative min-h-0 flex-1 overflow-hidden bg-raised lg:rounded-lg lg:border lg:border-line">
          <Mapa pontos={pontos} porUf={painel.porUf} destaque={selecionado?.codigo_ibge ?? null} aoEscolherCidade={escolherCidade} raio={raioMapa} />
          {erroMapa ? (
            <p role="alert" className="absolute left-3 top-3 z-10 max-w-[calc(100%-4.5rem)] rounded-sm bg-pin-soft px-3 py-2 text-xs text-pin-strong">
              {erroMapa}
            </p>
          ) : null}
        </section>
        <aside className="hidden min-h-0 flex-col gap-4 overflow-y-auto lg:flex">
          {selecionado ? <CartaoSelecionado edital={selecionado} agora={agora} /> : null}
          <OndeMaisCompram municipios={painel.topMunicipios} carregando={!pontosProntos} termo={filtros.q} aoEscolher={escolherCidade} />
          <LegendaMapa porUf={painel.porUf} />
        </aside>
      </main>
      <FolhaFiltros
        aberta={folhaAberta}
        filtros={filtros}
        pontos={pontos}
        atualizadoEm={atualizadoEm}
        agora={agora}
        aoAplicar={(f) => aplicar(f)}
        aoFechar={() => setFolhaAberta(false)}
      />
      <BarraCelular ativo={tela} aoTrocarTela={(t) => trocarTela(t, filtros)} />
    </div>
  );
}
```
> Como na Task 11: se a outra sessão já tiver mudado as props de `Mapa` ou `LegendaMapa` aqui, manter as dela nessas duas linhas.

- [ ] **Step 10: Rodar as guardas e a suíte**

Run: `npx vitest run scripts/celular.test.ts scripts/prefetch-edital.test.ts`
Expected: PASS (o card novo tem `prefetch={false}`).

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa. `grep -rn "GavetaCelular" components app` só acha o import da constante em `components/Mapa.tsx`.

- [ ] **Step 11: Commit**

```bash
git add components/BarraCelular.tsx components/inicio/FolhaFiltros.tsx scripts/celular.test.ts components/Explorador.tsx components/inicio/ColunaLista.tsx components/inicio/BuscaPrincipal.tsx components/inicio/CardCompacto.tsx components/inicio/Chips.tsx components/inicio/Icones.tsx components/GavetaCelular.tsx components/BotaoEditalOficial.tsx app/layout.tsx app/globals.css app/page.tsx "app/edital/[slug]/page.tsx"
git commit -m "feat: celular com barra de baixo, Mapa e Lista em tela cheia e folha de Filtros" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 13 (controlador): publicar, conferir e capturar

**Files:**
- Modify: `docs/fase-3-metricas.md`

**Interfaces:**
- Consumes: Tasks 1–12 no branch; 0009 aplicada (Task 2).
- Produces: site publicado e conferido; números em `docs/fase-3-metricas.md`.

Todos os passos são do controlador. As conferências com `curl` usam um visitante **não interno** (é o único jeito de ver o limite); no fim do Step 4 esse visitante é marcado como interno, para o portão excluí-lo.

- [ ] **Step 1: Pré-condições**

Branch `fase-3-limites-planos-celular` com as Tasks 1–12; `npm test && npm run typecheck && npm run build` passam. `select name from supabase_migrations.schema_migrations order by version;` contém `limites_lista_espera`. O worktree não tem `.vercel/`: rodar `vercel link --yes --project edital-map` e escolher o time JPM Company (não commitar a pasta: `.gitignore` já cobre).

- [ ] **Step 2: Publicar**

`vercel deploy --prod --yes`. Se responder "Not authorized", repetir uma vez; se falhar de novo, parar e avisar o dono.

- [ ] **Step 3: Cookie, cache e limite das buscas**

```bash
B=https://edital-map.vercel.app
J="<scratchpad>/cookies-limite.txt"; rm -f "$J"
curl -s -D - -o /dev/null -c "$J" "$B/sobre" | grep -i "set-cookie: em_visitante"
for q in luva botina capacete; do curl -s -b "$J" -o /dev/null -w "%{http_code} $q\n" "$B/api/busca?q=$q"; done
curl -s -b "$J" -w "\n%{http_code} uniforme (4a)\n" "$B/api/busca?q=uniforme"
curl -s -b "$J" -o /dev/null -w "%{http_code} luva de novo, prazo e pagina\n" "$B/api/busca?q=luva&dias=7&deslocamento=50"
curl -s -b "$J" -o /dev/null -w "%{http_code} mapa da 4a\n" "$B/api/mapa?q=uniforme"
curl -s -b "$J" -o /dev/null -w "%{http_code} mapa da 1a\n" "$B/api/mapa?q=luva"
curl -s -b "$J" -o /dev/null -w "%{http_code} exportar da 4a\n" "$B/api/exportar?q=uniforme"
curl -s -D - -o /dev/null -b "$J" "$B/api/busca?q=luva" | grep -i "cache-control"
curl -s -b "$J" "$B/api/uso"; echo
curl -s "$B/api/contagem?q=luva"; echo
```
Expected: `set-cookie: em_visitante=…`; `200` nas três primeiras; a 4ª `402` com `{"erro":"Você usou as 3 buscas grátis de hoje. Volta amanhã às 0h, ou conheça os planos.","codigo":"limite_diario","limite":{"tipo":"busca","usados":3,"maximo":3}}`; `200` para luva com prazo e página; mapa da 4ª `402`, da 1ª `200`; exportar da 4ª `402`; `cache-control: private, no-store`; `/api/uso` `{"interno":false,"buscas":3,"editais":0}`; `/api/contagem` `{"total":N}`.

- [ ] **Step 4: Limite dos editais, interno e lista de espera**

```bash
S=$(curl -s -H "cookie: em_interno=1" "$B/api/busca?q=luva" | node -e "const r=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(r.editais.slice(0,4).map(e=>e.slug).join(' '))")
set -- $S
for s in "$1" "$2" "$3"; do curl -s -b "$J" "$B/edital/$s" | grep -c "Você abriu os 3 editais grátis de hoje"; done
curl -s -b "$J" "$B/edital/$4" | grep -c "Você abriu os 3 editais grátis de hoje"
curl -s -b "$J" "$B/edital/$1" | grep -c "Abrir edital oficial"
curl -s -D - -o /dev/null -b "$J" "$B/edital/$4" | grep -i "cache-control"
V=$(grep em_visitante "$J" | awk '{print $7}')
curl -s -o /dev/null -w "%{http_code} interno sem limite\n" -H "cookie: em_visitante=$V; em_interno=1" "$B/api/busca?q=outra-qualquer"
curl -s -o /dev/null -w "%{http_code} lista de espera\n" -X POST -H "content-type: application/json" -H "cookie: em_visitante=$V; em_interno=1" -d '{"email":"controlador@exemplo.com","plano":"basic"}' "$B/api/lista-espera"
curl -s -w " %{http_code}\n" -X POST -H "content-type: application/json" -H "cookie: em_interno=1" -d '{"email":"x","plano":"pro"}' "$B/api/lista-espera"
curl -s -o /dev/null -w "%{http_code} marca o visitante de teste como interno\n" -X POST -H "content-type: application/json" -H "cookie: em_visitante=$V; em_interno=1" -d '{"tipo":"busca","detalhe":{"q":"teste"}}' "$B/api/eventos"
```
Expected: `0 0 0` (três editais abertos), depois `1` (4º bloqueado); reabrir o 1º mostra "Abrir edital oficial" (≥ 1); `cache-control` com `private` e `no-store`; interno `200`; lista de espera `201`; e-mail ruim `{"erro":"Confira o e-mail."} 400`; evento `204`. [L7] de `docs/fase-3-limites.sql`: `limite_atingido` com `busca` e `edital` (1 cada, `interno = false`, o visitante de teste), `lista_espera` com `basic` interno. `docs/fase-2-portao.sql` roda e **não** conta o visitante de teste (ele virou interno).

- [ ] **Step 5: Navegador (perfil novo, 390 px e 1440 px)**

Perfil novo do Edge/Chrome (não interno), no site publicado:
1. Celular (390 × 844, modo dispositivo): barra de baixo com Mapa · Lista · Alertas · Planos, ativo destacado, sem cobrir conteúdo; cabeçalho com logo, selo "3 buscas · 3 editais" e "Assinar" numa linha só; busca compacta ("Ex.: EPI, uniformes") e "Filtros".
2. "Filtros": folha em tela cheia, escolher UF SC e Valor → botão vira "Ver N editais" → aplicar: Lista em tela cheia com contagem, resumo, prazo, Exportar e cards; botão mostra "Filtros (2)"; endereço com `?uf=SC&valor=…&tela=lista`; selo "2 buscas · 3 editais".
3. Rolar a lista, tocar num card: abre o edital (botão "Abrir edital oficial" fixo acima da barra); voltar: mesma busca, mesma tela Lista e mesma posição.
4. Fazer mais 2 buscas diferentes (selo amarelo com "1 busca", depois laranja com "nenhuma busca") e uma 4ª: a Lista mostra o cartão "Você usou as 3 buscas grátis de hoje…" com Basic e Pro; o mapa continua com a busca anterior.
5. Abrir 3 editais diferentes e um 4º: cartão "Você abriu os 3 editais grátis de hoje…" no lugar de tudo abaixo do cabeçalho; reabrir um dos 3 funciona.
6. "Pro" do cartão → `/planos#pro`; tabela com Grátis/Basic/Pro, "em breve" nos itens que faltam; "Quero o Pro" → formulário → e-mail → "Pronto! Avisamos em … quando o pagamento abrir."
7. Computador (1440): três colunas como antes; aba Planos e "Assinar Pro" levam a `/planos`; selo "Grátis · restam … hoje"; endereço muda a cada busca; colar o endereço numa aba nova restaura a mesma busca (e conta como a mesma, sem gastar outra).
8. No fim, abrir `$B/sobre?interno=1` nesse perfil (o portão exclui esse visitante) e conferir que o selo some.

Capturas: Edge invisível na porta 9333 (instruções no topo de `scripts/capturas.mjs`) e `npm run capturas -- $B <slug1> <slug2>` **sem** `CAPTURAS_INTERNO` (para o selo aparecer; conta como uso de um visitante novo). Olhar `inicio`, `planos` e `edital-*` em 1440 e 390 px.

- [ ] **Step 6: Registrar**

Acrescente à seção "Limites do grátis (0009)" de `docs/fase-3-metricas.md`:
```markdown
- Publicado em aaaa-mm-dd hh:mm. curl: 3 buscas 200, 4ª 402 (busca, mapa e exportar); repetir/prazo/página 200; 3 editais abertos, 4º com o cartão; interno 200; lista de espera 201; cache-control private, no-store.
- Navegador 390 e 1440 px: barra, Filtros (n), Lista em tela cheia, card abre o edital, voltar no lugar, selo nos três estados, cartões, /planos e lista de espera. Capturas em .capturas/.
- Tempos de produção: /api/busca?q=luva N s (sem cache do CDN agora), /api/mapa N s, página do edital N s.
```
```bash
git add docs/fase-3-metricas.md
git commit -m "docs: limites, Planos e celular publicados e conferidos" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 14: Documentação, aceite e merge

**Files:**
- Modify: `CLAUDE.md`, `docs/superpowers/specs/2026-10-17-fase-3-limites-planos-celular-design.md` (§5)

**Interfaces:**
- Consumes: resultado da Task 13.
- Produces: regras novas no `CLAUDE.md`, aceite marcado, branch no `main`.

- [ ] **Step 1: `CLAUDE.md`**

1. Troque
```markdown
Fase atual: **3 · Brasil todo** (etapa da Fase 3 antes de Planos e Alertas). Site Next.js na Vercel em https://edital-map.vercel.app (domínio próprio pendente) sobre o espelho do PNCP (27 UFs) atualizado a cada 3 h.
```
por
```markdown
Fase atual: **3 · Brasil todo + limites do grátis** (etapa da Fase 3 antes de pagamento e Alertas). Site Next.js na Vercel em https://edital-map.vercel.app (domínio próprio pendente) sobre o espelho do PNCP (27 UFs) atualizado a cada 3 h.
```
2. Depois da linha que começa com `- Recursos Pro (abertos por enquanto, cadeado quando os Planos ligarem):`, acrescente:
```markdown
- Limites do grátis, página Planos e celular: spec docs/superpowers/specs/2026-10-17-fase-3-limites-planos-celular-design.md, plano docs/superpowers/plans/2026-10-17-fase-3-limites-planos-celular.md, conferências docs/fase-3-limites.sql e `npx tsx scripts/conferir-limites.ts` (0009: `uso_diario`, `registrar_uso`, `uso_do_dia`, `lista_espera`, `limite_atingido`).
```
3. Troque
```markdown
- Página inicial em três colunas a partir de lg (1024 px); abaixo, mapa em tela cheia e lista na gaveta.
```
por
```markdown
- Página inicial em três colunas a partir de lg (1024 px); abaixo, barra fixa embaixo (Mapa · Lista · Alertas · Planos, components/BarraCelular.tsx, `--altura-barra`), Mapa e Lista em telas cheias, busca compacta com "Filtros (n)" e folha de filtros (rascunho; "Ver N editais" por /api/contagem, que não conta). Tocar no card abre o edital. `ALTURA_GAVETA_RECOLHIDA` (0) continua exportada para o Mapa.
- Limite do grátis: 3 buscas e 3 editais diferentes por dia (Brasília) por navegador (`em_visitante`, garantido pelo proxy.ts); interno sem limite e sem selo. Busca = termo (sem acento/maiúsculas/espaços) + UF + município + valor + modalidades + órgão + raio (prazo e página não contam; com raio a UF não entra; vazia não conta); chave = sha256 (lib/limites.ts, lib/servidor/uso.ts). Lista e mapa mandam os mesmos parâmetros (contam uma vez). Banco fora na contagem: libera.
- Sinal de limite: HTTP 402 `{ erro, codigo: 'limite_diario', limite }` em /api/busca, /api/mapa e /api/exportar (429 é só limite por hora). Essas rotas e /api/uso respondem `private, no-store` (sem cache no CDN). A página do edital conta no servidor e, bloqueada, troca tudo abaixo do cabeçalho pelo cartão dos planos (seção nova entra dentro desse bloco). Links para /edital sempre com `prefetch={false}`; sem loading.tsx no edital nem Cache Components.
- Busca no endereço: a página inicial lê e escreve `/?q=&uf=&municipio=&valor=&modalidades=&orgao=&raio=&dias=7&tela=lista` (lib/urlBusca.ts, `history.replaceState`) e guarda o estado ao sair (lib/cliente/volta.ts) para voltar do edital no mesmo lugar.
- /planos: tabela Grátis · Basic R$ 49,90 · Pro R$ 89,90 (lib/planos.ts), lista de espera (`lista_espera`, /api/lista-espera, 5 por hora por IP) e evento `quer_recurso` plano_basic/plano_pro. Pagamento e cadeado do "Abrir edital oficial" só com o Stripe.
```

- [ ] **Step 2: Aceite na spec**

Na seção 5 da spec, marque `[x]` em cada critério cumprido, com o comprovante ao lado (data da publicação, `docs/fase-3-metricas.md`, capturas); o que faltar fica `[ ]` com uma frase do que falta.

- [ ] **Step 3: Verificação final**

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-10-17-fase-3-limites-planos-celular-design.md
git commit -m "docs: limites do grátis, Planos e celular no ar, regras novas e aceite" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

- [ ] **Step 5 (controlador): Merge**

Do worktree:
```bash
git fetch origin
git rebase origin/main
npm test && npm run typecheck && npm run build
```
Conflitos esperados (outras sessões): `app/edital/[slug]/page.tsx` (seção "Documentos do edital": vai para dentro do bloco `detalhes ? (<>…</>)`, e a consulta dela para dentro de `detalhesDoEdital`), `lib/eventos.ts` (recurso `baixou_documento` em `RECURSOS_USADOS` convive com `plano_basic` em `RECURSOS`), e, se o mapa novo já estiver no `main`, as props de `Mapa`/`LegendaMapa` em `components/Explorador.tsx` (ficam as do `main`). Resolver, rodar a verificação de novo e só então (com o ok do dono para empurrar ao `main`):
```bash
git push origin fase-3-limites-planos-celular
git push origin HEAD:main
```
Se o `main` andar no meio (push recusado), repetir o rebase e a verificação. Se o rebase mudou algo que já estava publicado, publicar de novo (`vercel deploy --prod --yes`) e repetir o Step 3 da Task 13.

---

## Cobertura da spec

| Spec | Onde |
|---|---|
| §1 dia de Brasília, zera à 0h | Task 1 (`(now() at time zone 'America/Sao_Paulo')::date`), Task 6 (`inicioDoDiaDeBrasilia`, teste da virada) |
| §1 por navegador (`em_visitante`), interno sem limite, burlar com outro navegador aceito | Tasks 5 (proxy), 6 (`decidir` com interno/sem visitante) |
| §1 3 buscas/dia; o que conta e o que não conta (vazia, repetir, prazo, "Carregar mais", mapa) | Tasks 3 (`combinacaoBusca`), 6 (mesma chave), 7 (mapa com os mesmos parâmetros), 9/11 (navegador manda os mesmos parâmetros ao mapa) |
| §1 3 editais/dia (lista, cartão, relacionados, link direto); reabrir não conta | Tasks 6 (`decidirEdital`), 8 (página conta no servidor; sem prefetch) |
| §1 exportar usa a busca atual; 20/hora continua | Task 7 |
| §1 busca esgotada: 402 nas três rotas; cartão na lista com Basic/Pro → /planos; mapa com a última permitida | Tasks 3, 7, 8 (`CartaoLimite`), 9, 11 (`filtrosDoMapa`) |
| §1 edital esgotado: só título, órgão, cidade e prazo; resto atrás do cartão; "Abrir edital oficial" liberado dentro dos 3 | Task 8 |
| §1 selo (textos, singular/plural, nenhuma/nenhum, amarelo/laranja, compacto no celular, sem selo interno) | Tasks 3 (textos), 9 (`SeloPlano`) |
| §1 `uso_diario` + `registrar_uso` atômica, idempotente, só servidor; limpeza diária | Tasks 1, 2 |
| §1 evento `limite_atingido` na primeira vez do dia; portão | Tasks 1 (restrição e portão), 6 (`avisarLimite`) |
| §2 aba Planos e "Assinar Pro" → /planos; tabela com "em breve"; Quero o Basic/Pro; lista_espera com validação e limite por IP; mensagem de sucesso; `quer_recurso` plano_basic/plano_pro | Tasks 9 (cabeçalho), 10 |
| §3 barra fixa embaixo (ícone + texto, ativo, ≥ 44 px, área segura) | Task 12 |
| §3 Mapa e Lista em telas cheias; Lista com contagem, resumo, prazo, Exportar e cards | Task 12 |
| §3 busca compacta, "Filtros (n)", folha com UF/Município/Valor/Modalidade/Órgão/Raio/Prazo, "Ver N editais", "Limpar filtros" | Tasks 4 (`filtrosAtivos`), 7 (`/api/contagem`), 12 |
| §3 card abre o edital; voltar à Lista na mesma posição | Tasks 4 (`volta.ts`), 11, 12 |
| §3 busca no endereço (ida e volta, compartilhável; mesma busca contada) | Tasks 4, 11 |
| §3 selo compacto; cabeçalho do celular com logo, selo e "Assinar" | Task 9 |
| §3 página do edital no celular com "Abrir edital oficial" fixo acima da barra (liberada) | Task 12 |
| §3 computador igual, com selo, aba Planos e busca na URL | Tasks 9, 11 |
| §4 migração 0009, revoke/grant, `lock_timeout`, aplicada pelo controlador | Tasks 1, 2 |
| §5 vitest (chave, regras, virada, selo, filtros ↔ URL, lista de espera, rotas 402, interno) | Tasks 3, 4, 6, 7, 10 |
| §5 banco (idempotente, 4ª recusada, outro dia zera, concorrência) | Task 2 ([L2], `scripts/conferir-limites.ts`) |
| §5 navegador 390/1440 px e aceite | Tasks 13, 14 |

## Riscos conhecidos (para o revisor e o controlador)

- **Sem cache no CDN em /api/busca e /api/mapa.** A contagem precisa rodar a cada pedido e a resposta depende do visitante; o cache de 5 min por instância do servidor continua. Primeira busca sem cache local pode voltar a 1–2 s (medido na Fase 3: busca 1,5 s, mapa 1,8 s). A Task 13 mede.
- **Prefetch.** O `headers()` do Next 16 esconde `next-router-prefetch`, então a página não sabe se é pré-carga. A defesa é não haver pré-carga: Next 16 sem Cache Components não pré-carrega página dinâmica sem `loading.js`, e todo link para `/edital` tem `prefetch={false}` (guarda em teste). Se um dia o projeto ligar Cache Components ou criar `loading.tsx` no edital, a guarda falha de propósito.
- **Banco fora na contagem libera.** Escolha deliberada (o limite é lembrete); a falha vai para o log da Vercel.
- **Uso de navegador sem cookies.** Sem `em_visitante` válido a página não conta (o proxy grava o cookie, mas navegador que recusa cookies nunca terá limite). Aceito pela spec ("burlar com outro navegador é aceito").
- **Busca contada antes da consulta.** Se o banco falhar logo depois de contar, a busca gastou uma das 3. Raro; o contrário (consultar antes) entregaria resultados além do limite.
- **Selo por um instante desatualizado** ao navegar entre páginas (a loja do navegador guarda o último valor até o servidor mandar o novo). Só cosmético.
- **Folha de Filtros e o Esc.** Esc dentro de um painel de chip (Município, Modalidade, Órgão) fecha o painel e a folha juntos.
- **Merge com as outras sessões** (página do edital, `lib/eventos.ts`, props do `Mapa`): instruções na Task 14.

## Auto-revisão (writing-plans)

1. **Cobertura da spec:** cada item de §1–§5 aponta para uma task na tabela acima; nenhum item sem task.
2. **Placeholders:** nenhum "TBD"/"TODO"/"implementar depois"; todo passo de código tem o código; os `aaaa-mm-dd` e `N` aparecem só nos registros de medição do controlador (Tasks 2 e 13), que são números a anotar.
3. **Consistência de tipos e nomes:** `LIMITE_GRATIS`, `combinacaoBusca`, `corpoLimite`/`lerLimite`/`LimiteAtingido`, `RespostaBusca.buscasUsadas` (Task 3) são os usados nas Tasks 6, 7, 9, 11, 12; `Decisao` (`permitido`/`usados`/`limite`) da Task 6 é o das rotas (Task 7) e das páginas (Tasks 8, 11); `contextoDaPagina` (Task 5) nas Tasks 8, 9, 11; `Volta`, `tomarVolta`, `guardarVolta`, `guardarUltimaBusca`, `lerUltimaBusca` (Task 4) nas Tasks 11 e 12; `urlDaBusca`, `lerBuscaDaUrl`, `montarTela`, `paraUrlSearchParams`, `comTela`, `Tela` (Task 4) nas Tasks 11 e 12; `filtrosAtivos` (Task 4) na Task 12; `registrar_uso(p_visitante, p_tipo, p_chave, p_limite)` e `uso_do_dia(p_visitante)` (Task 1) com os mesmos nomes de argumentos na Task 6; `TIPOS_EVENTO_SERVIDOR`/`TipoEventoServidor` (Task 1) na Task 5; `PlanoPago`/`PedidoListaEspera`/`validarListaEspera` (Task 10) em `registro.ts`, na rota e no `BotaoQueroPlano`.
