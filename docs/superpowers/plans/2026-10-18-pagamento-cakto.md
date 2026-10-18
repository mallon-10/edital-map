# Pagamento pela Cakto (entrega 2 do MVP pago) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cobrar Basic e Pro pela Cakto sem login: checkout com código, webhook que liga o plano ao navegador, chave de acesso para até 3 navegadores, cadeados da tabela de /planos e dono confiável.

**Architecture:** Funções puras em `lib/pagamento/` (assinatura do webhook, eventos → efeitos, chave, planos e limites) testadas no vitest; banco na migração 0015 (tabelas e funções só do servidor); rotas finas em `app/api/checkout`, `app/api/cakto`, `app/api/assinatura/*`; `lib/servidor/plano.ts` (`planoAtual`) usado por limites, rotas e páginas. Interruptor: sem as variáveis da Cakto, tudo continua como hoje.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase Postgres (supabase-js com service role), node:crypto, vitest.

**Spec:** docs/superpowers/specs/2026-10-18-pagamento-cakto-design.md

## Global Constraints

- Interface em português do Brasil.
- Segredos só no servidor: `CAKTO_WEBHOOK_SECRET`, `INTERNO_SEGREDO`, `CAKTO_CLIENT_*` nunca em `NEXT_PUBLIC_`, nunca no git, nunca em log.
- Ofertas: `CAKTO_OFERTA_BASIC_MENSAL=t8o4sst`, `CAKTO_OFERTA_BASIC_ANUAL=m2nvms3`, `CAKTO_OFERTA_PRO_MENSAL=irpv92e`, `CAKTO_OFERTA_PRO_ANUAL=iuy9gzb` (já no .env; falta na Vercel).
- Validade: mensal 31 dias, anual 366 dias, mais 3 dias de folga.
- Limites por dia: grátis 3/3, Basic 15/15, Pro 300/300 (uso justo, sem teto visível).
- Migração `supabase/migrations/0015_pagamento.sql`; `eventos_tipo_check` mantém os 11 tipos atuais e acrescenta `assinou`.
- Rotas POST do navegador checam a origem com `lib/servidor/mesmaOrigem.ts` (`pedidoDoSite(request): boolean`, `recusaForaDoSite(request): Response | null`), arquivo da Fase 3; se não existir na main, criar com exatamente esse caminho, nomes e regra (content-type application/json e Sec-Fetch-Site same-origin/none; sem esse cabeçalho, Origin com o mesmo host). O webhook `/api/cakto` não usa (vem de outro servidor).
- TDD; `npm test` e `npm run typecheck` antes de cada commit. Commits com `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Configuração e mapa de ofertas

**Files:**
- Create: `lib/pagamento/config.ts`
- Test: `lib/pagamento/config.test.ts`

**Interfaces:**
- Produces:
  - `type PlanoPago = 'basic' | 'pro'` (reusar o de `lib/eventos.ts`), `type Periodo` (de `lib/planos.ts`)
  - `type ConfigPagamento = { ofertas: Record<PlanoPago, Record<Periodo, string>>; segredoWebhook: string }`
  - `configPagamento(env = process.env): ConfigPagamento | null` (null = interruptor desligado: falta alguma das 5 variáveis)
  - `ofertaPara(cfg, plano, periodo): string`
  - `planoDaOferta(cfg, ofertaId): { plano: PlanoPago; periodo: Periodo } | null`
  - `linkCheckout(oferta: string, codigo: string | null): string` → `https://pay.cakto.com.br/{oferta}` + `?callback={codigo}`

- [ ] **Step 1: Test** — `configPagamento` com as 5 variáveis devolve o mapa; faltando qualquer uma (ou vazia) devolve null; `planoDaOferta` acha os 4 e devolve null para id desconhecido; `linkCheckout('t8o4sst', 'ab12')` = `https://pay.cakto.com.br/t8o4sst?callback=ab12`; sem código, sem `?callback`; código com caractere fora de `[A-Za-z0-9._~-]` lança erro.
- [ ] **Step 2: Run** `npx vitest run lib/pagamento/config.test.ts` → FAIL.
- [ ] **Step 3: Implement** (funções puras, sem `server-only`, para testar).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(pagamento): configuração da Cakto e mapa de ofertas`.

---

### Task 2: Assinatura do webhook e leitura dos pedidos

**Files:**
- Create: `lib/pagamento/webhook.ts`
- Test: `lib/pagamento/webhook.test.ts`

**Interfaces:**
- Produces:
  - `webhookAutentico(p: { corpoCru: string; corpo: unknown; assinatura: string | null; timestamp: string | null; segredo: string; agora: Date }): boolean` — com os cabeçalhos: `v1=` HMAC-SHA256(`{timestamp}.{corpoCru}`) com tolerância de 5 min, comparação em tempo constante, aceita lista `v2=…, v1=…`; sem os dois cabeçalhos: `corpo.secret` igual ao segredo (tempo constante).
  - `type PedidoCakto = { evento: string; pedido: string; status: string | null; ofertaId: string | null; assinaturaCakto: string | null; email: string | null; valorCentavos: number | null; pagoEm: string | null; callback: string | null }`
  - `lerPedidos(corpo: unknown): PedidoCakto[]` — `data` objeto ou lista (V2); ignora `checkout_abandonment` e itens sem `id`; `assinaturaCakto` = `data.subscription?.id` (string) ou null; e-mail em minúsculas.

- [ ] **Step 1: Test** — assinatura certa passa; corpo adulterado, timestamp de 6 min atrás, cabeçalho sem `v1=` falham; sem cabeçalhos com `secret` certo passa e errado falha; `lerPedidos` com objeto, com lista de 2, com `checkout_abandonment` (vazio), com `amount: 49.9` → 4990, com `subscription: { id: 'sub_1' }` e com `subscription: null`.

  Gerar a assinatura no teste: `'v1=' + createHmac('sha256', SEGREDO).update(`${ts}.`).update(corpoCru).digest('hex')`.
- [ ] **Step 2–4:** FAIL → implementar (porte de `Oferta Kids/src/core/payments/cakto.ts`, sem Prisma) → PASS.
- [ ] **Step 5: Commit** `feat(pagamento): assinatura e leitura do webhook da Cakto`.

---

### Task 3: Efeito de cada evento, validade e chave de acesso

**Files:**
- Create: `lib/pagamento/efeitos.ts`, `lib/pagamento/chave.ts`
- Test: `lib/pagamento/efeitos.test.ts`, `lib/pagamento/chave.test.ts`

**Interfaces:**
- Produces (`efeitos.ts`):
  - `DIAS_PERIODO = { mensal: 31, anual: 366 }`, `FOLGA_DIAS = 3`
  - `type Assinatura = { plano: PlanoPago; periodo: Periodo; status: 'ativa' | 'cancelada' | 'estornada'; validoAte: string }`
  - `type Efeito = { tipo: 'criar'; plano; periodo; validoAte: string } | { tipo: 'estender'; validoAte: string } | { tipo: 'cancelar' } | { tipo: 'estornar'; validoAte: string } | { tipo: 'nada' }`
  - `efeitoDoEvento(p: { evento: string; status: string | null; pagoEm: string | null; plano: PlanoPago; periodo: Periodo; atual: Assinatura | null; agora: Date }): Efeito`
    - `purchase_approved` + `paid`: sem `atual` → `criar` (validoAte = pagoEm ?? agora + dias + folga); com `atual` → `estender`.
    - `subscription_renewed`: `estender` com `max(atual.validoAte, pagoEm ?? agora) + dias + folga`; sem `atual` → `criar`.
    - `subscription_canceled` → `cancelar`; `refund`/`chargeback` → `estornar` com `agora`; resto → `nada`.
- Produces (`chave.ts`):
  - `ALFABETO_CHAVE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'` (sem 0, O, 1, I, L)
  - `gerarChave(aleatorio = randomBytes): string` → `EM-XXXX-XXXX-XXXX`
  - `normalizarChave(t: string): string | null` (maiúsculas, tira espaços, aceita sem hífens; formato inválido → null)

- [ ] **Step 1: Test** — cada linha da tabela da spec §4 (com datas fixas: pago 2026-10-18T12:00Z mensal → validoAte 2026-11-21T12:00Z; anual → 2027-10-22T12:00Z; renovação antes de vencer soma a partir do validoAte atual; depois de vencido, a partir do pagamento); `gerarChave` com bytes fixos dá formato e alfabeto certos; `normalizarChave(' em-abcd efgh-jkmn ')` = `EM-ABCD-EFGH-JKMN`; com `0` ou tamanho errado = null.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5: Commit** `feat(pagamento): efeitos dos eventos da Cakto e chave de acesso`.

---

### Task 4: Planos, limites por plano e dono confiável

**Files:**
- Modify: `lib/limites.ts` (limites por plano, `UsoHoje` com plano), `lib/limites.test.ts`
- Create: `lib/dono.ts`, `lib/dono.test.ts`
- Modify: `lib/visitante.ts` (`COOKIE_DONO = 'em_dono'`)

**Interfaces:**
- Produces (`lib/limites.ts`):
  - `type Plano = 'gratis' | 'basic' | 'pro'`
  - `LIMITES_PLANO: Record<Plano, { busca: number; edital: number }>` = gratis 3/3, basic 15/15, pro 300/300
  - `UsoHoje` passa a `{ interno: boolean; plano: Plano; buscas: number; editais: number }` (o dono vem como `interno: true, plano: 'pro'`)
  - `corpoLimite(tipo, usados, plano = 'gratis')` com o máximo do plano; no Pro a mensagem é "Você chegou ao uso justo de hoje do plano Pro (300 …). Volta amanhã às 0h."
  - `textoFaixa`, `leituraFaixa`, `bolinhas`, `tomSelo` recebem o máximo do plano (assinaturas com `maximo` opcional, padrão grátis, para não quebrar chamadas atuais).
- Produces (`lib/dono.ts`):
  - `valorCookieDono(segredo: string): string` = HMAC-SHA256 hex de `'dono'` com o segredo
  - `ehDono(cookie: string | undefined, segredo: string | undefined): boolean` (sem segredo → false; comparação em tempo constante)
  - `segredoDoEndereco(valor: string | undefined, segredo: string | undefined): boolean` (o `?interno=` é o próprio segredo; `'1'` → false)

- [ ] **Step 1: Test** — limites por plano; `corpoLimite('busca', 15, 'basic').limite.maximo === 15`; texto da faixa "12 de 15"; `ehDono` com valor certo, adulterado, sem segredo; `segredoDoEndereco('1', 's')` false.
- [ ] **Step 2–4:** FAIL → implementar (ajustar os testes antigos de limites só onde o tipo `UsoHoje` mudou) → PASS. `npm run typecheck` e corrigir os usos de `UsoHoje` (`lib/servidor/uso.ts`, `lib/cliente/uso.ts`, `FaixaPlano`).
- [ ] **Step 5: Commit** `feat(pagamento): limites por plano e cookie do dono`.

---

### Task 5: Banco (migração 0015)

**Files:**
- Create: `supabase/migrations/0015_pagamento.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Pagamento pela Cakto (docs/superpowers/specs/2026-10-18-pagamento-cakto-design.md §7). Só o servidor lê e grava.
set local lock_timeout = '10s';

create table public.checkouts (
  codigo     text primary key check (codigo ~ '^[0-9a-f]{32}$'),
  visitante  uuid not null,
  plano      text not null check (plano in ('basic', 'pro')),
  periodo    text not null check (periodo in ('mensal', 'anual')),
  criado_em  timestamptz not null default now()
);

create table public.assinaturas (
  id               uuid primary key default gen_random_uuid(),
  cakto_assinatura text unique,
  cakto_pedido     text not null,
  plano            text not null check (plano in ('basic', 'pro')),
  periodo          text not null check (periodo in ('mensal', 'anual')),
  email            text,
  status           text not null default 'ativa' check (status in ('ativa', 'cancelada', 'estornada')),
  valido_ate       timestamptz not null,
  chave            text not null unique check (chave ~ '^EM-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$'),
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);
create index assinaturas_email_idx on public.assinaturas (email, plano);

create table public.assinatura_navegadores (
  assinatura uuid not null references public.assinaturas (id) on delete cascade,
  visitante  uuid not null,
  criado_em  timestamptz not null default now(),
  primary key (assinatura, visitante)
);
create index assinatura_navegadores_visitante_idx on public.assinatura_navegadores (visitante);

create table public.cakto_eventos (
  pedido      text not null,
  evento      text not null,
  recebido_em timestamptz not null default now(),
  corpo       jsonb not null,
  primary key (pedido, evento)
);

-- Plano do navegador: a maior assinatura válida ligada a ele (Pro > Basic), ou 'gratis'.
create function public.plano_do_visitante(p_visitante uuid)
returns text language sql stable as $$
  select coalesce(
    (select a.plano from public.assinatura_navegadores n
       join public.assinaturas a on a.id = n.assinatura
      where n.visitante = p_visitante and a.status <> 'estornada' and a.valido_ate > now()
      order by (a.plano = 'pro') desc limit 1),
    'gratis')
$$;

-- Liga um navegador a uma assinatura, até 3 (o mesmo navegador de novo não conta). Devolve 'ok', 'cheia' ou 'sem_assinatura'.
create function public.ligar_navegador(p_assinatura uuid, p_visitante uuid)
returns text language plpgsql as $$
declare v_n int;
begin
  perform pg_advisory_xact_lock(hashtextextended('assinatura:' || p_assinatura::text, 0));
  if not exists (select 1 from public.assinaturas where id = p_assinatura) then return 'sem_assinatura'; end if;
  if exists (select 1 from public.assinatura_navegadores where assinatura = p_assinatura and visitante = p_visitante) then return 'ok'; end if;
  select count(*) into v_n from public.assinatura_navegadores where assinatura = p_assinatura;
  if v_n >= 3 then return 'cheia'; end if;
  insert into public.assinatura_navegadores (assinatura, visitante) values (p_assinatura, p_visitante);
  return 'ok';
end $$;

alter table public.eventos drop constraint eventos_tipo_check;
alter table public.eventos add constraint eventos_tipo_check
  check (tipo in ('busca', 'abriu_edital', 'clicou_edital_oficial', 'pediu_alerta', 'quer_recurso', 'usou_recurso',
                  'limite_atingido', 'conta_entrou', 'onboarding_iniciado', 'onboarding_concluido', 'radar_visto', 'assinou'));

-- Retenção diária (0006/0009): também checkouts com mais de 30 dias e eventos da Cakto com mais de 180.
create or replace function public.aplicar_retencao()
returns bigint language sql as $$
  delete from public.uso_diario where dia < (now() at time zone 'America/Sao_Paulo')::date;
  delete from public.checkouts where criado_em < now() - interval '30 days';
  delete from public.cakto_eventos where recebido_em < now() - interval '180 days';
  with apagadas as (
    delete from public.contratacoes
    where encerramento_em is null or encerramento_em < now() - interval '7 days'
    returning 1
  )
  select count(*) from apagadas
$$;

alter table public.checkouts enable row level security;
alter table public.assinaturas enable row level security;
alter table public.assinatura_navegadores enable row level security;
alter table public.cakto_eventos enable row level security;
revoke all on table public.checkouts, public.assinaturas, public.assinatura_navegadores, public.cakto_eventos from public, anon, authenticated;
grant select, insert, update, delete on table public.checkouts, public.assinaturas, public.assinatura_navegadores, public.cakto_eventos to service_role;
revoke execute on function public.plano_do_visitante(uuid) from public, anon, authenticated;
revoke execute on function public.ligar_navegador(uuid, uuid) from public, anon, authenticated;
grant execute on function public.plano_do_visitante(uuid) to service_role;
grant execute on function public.ligar_navegador(uuid, uuid) to service_role;

notify pgrst, 'reload schema';
```

- [ ] **Step 2: Apply** `npm run db:aplicar -- supabase/migrations/0015_pagamento.sql`.
- [ ] **Step 3: Check** pelo MCP do Supabase: `select public.plano_do_visitante(gen_random_uuid());` = `gratis`; inserir uma assinatura de teste e um navegador numa transação com `rollback`, conferir `pro`/`basic` e `ligar_navegador` devolvendo `cheia` no 4º.
- [ ] **Step 4: Commit** `feat(pagamento): tabelas e funções do pagamento (0015)`.

---

### Task 6: Servidor · contexto do dono, `planoAtual` e limites por plano

**Files:**
- Modify: `lib/servidor/registro.ts` (Contexto ganha `dono`), `app/api/interno/route.ts` e `components/MarcarInterno.tsx` (mandam o valor de `?interno=`), `app/sobre/page.tsx`
- Create: `lib/servidor/plano.ts`, `lib/servidor/plano.test.ts`
- Modify: `lib/servidor/uso.ts`, `lib/servidor/uso.test.ts`

**Interfaces:**
- Consumes: `ehDono`, `segredoDoEndereco`, `COOKIE_DONO`, `valorCookieDono` (Task 4); `plano_do_visitante` (Task 5).
- Produces:
  - `Contexto = { visitante: string; interno: boolean; dono: boolean; ipHash: string | null }` (`interno` = cookie em_interno ou dono; métricas continuam usando `interno`)
  - `marcarInterno(valor: string | undefined)`: sempre grava `em_interno=1`; se `segredoDoEndereco(valor, INTERNO_SEGREDO)`, grava também `em_dono = valorCookieDono(segredo)`. `/api/interno` lê `{ valor }` do corpo JSON (POST com `recusaForaDoSite`).
  - `planoAtual(ctx: Contexto | null): Promise<Plano>` — dono → `pro`; sem ctx → `gratis`; senão rpc `plano_do_visitante` (erro → `gratis` e log). Memoiza por visitante dentro do mesmo pedido com `React.cache`.
  - `decidir` passa a: dono → LIBERADO; senão limite = `LIMITES_PLANO[plano][tipo]` (o `ctx.interno` sozinho não libera mais).
  - `usoDoDia(ctx)` devolve `plano`; dono → `{ interno: true, plano: 'pro', buscas: 0, editais: 0 }`.

- [ ] **Step 1: Test** (`plano.test.ts` com o mock de supabase no estilo de `consultas.test.ts`): dono → pro sem chamar o banco; rpc devolve 'basic' → basic; erro → gratis. (`uso.test.ts`): interno sem dono é contado; Basic usa limite 15 (`p_limite: 15` na rpc); dono não chama `registrar_uso`.
- [ ] **Step 2–4:** FAIL → implementar → PASS; `npm run typecheck`.
- [ ] **Step 5: Commit** `feat(pagamento): plano do navegador, limites por plano e dono confiável`.

---

### Task 7: Checkout, estado e /obrigado

**Files:**
- Create: `app/api/checkout/route.ts`, `app/api/checkout/estado/route.ts`, `lib/servidor/pagamento.ts`, `app/obrigado/[codigo]/page.tsx`, `components/pagamento/EsperaPagamento.tsx`, `components/pagamento/ChaveAcesso.tsx`
- Test: `lib/servidor/pagamento.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 3, 5, 6.
- Produces (`lib/servidor/pagamento.ts`, `server-only`):
  - `criarCheckout(ctx: Contexto | null, plano, periodo): Promise<string | null>` (código 32 hex de `randomBytes(16)`; sem ctx → null)
  - `estadoDoCheckout(codigo: string, visitante: string | null): Promise<{ estado: 'pago'; plano; periodo; validoAte; status; chave: string | null } | { estado: 'esperando' } | { estado: 'desconhecido' }>` — `chave` só quando `visitante` é o do checkout.
  - `assinaturaDoVisitante(visitante: string): Promise<{ id; plano; periodo; status; validoAte; chave } | null>` (a maior válida)
  - `ativarChave(chave: string, visitante: string): Promise<'ok' | 'cheia' | 'invalida'>`
- `GET /api/checkout?plano=&periodo=`: valida; interruptor desligado ou parâmetro inválido → 303 `/planos`; grava `quer_recurso`; 303 para `linkCheckout`. `Cache-Control: private, no-store`.
- `GET /api/checkout/estado?codigo=` → JSON de `estadoDoCheckout` (sem a chave na resposta: a página do servidor é quem mostra), `private, no-store`.
- `/obrigado/[codigo]` (servidor, `noindex`): `pago` e navegador certo → "Plano {Nome} ativo", validade, `ChaveAcesso` (chave + Copiar + "Use em até 3 navegadores em /assinatura"); `esperando` → `EsperaPagamento` (cliente: consulta a cada 3 s por 2 min e dá `router.refresh()` quando virar `pago`; depois, o texto do Pix); `desconhecido` ou outro navegador → texto da spec §3.4 com link para /assinatura.

- [ ] **Step 1: Test** `pagamento.test.ts` (mock do supabase): `criarCheckout` grava código hex de 32; `estadoDoCheckout` esconde a chave para outro visitante; `ativarChave` com chave inexistente → `invalida`, com `ligar_navegador` 'cheia' → `cheia`.
- [ ] **Step 2–4:** FAIL → implementar rotas, página e componentes → PASS; `npm run typecheck`.
- [ ] **Step 5: Commit** `feat(pagamento): checkout pela Cakto e página de obrigado`.

---

### Task 8: Webhook `/api/cakto`

**Files:**
- Create: `app/api/cakto/route.ts`
- Modify: `lib/servidor/pagamento.ts` (`aplicarPedido`), `lib/servidor/pagamento.test.ts`, `lib/eventos.ts` (`'assinou'` em `TIPOS_EVENTO_SERVIDOR`)

**Interfaces:**
- Produces: `aplicarPedido(p: PedidoCakto, cfg: ConfigPagamento, agora: Date): Promise<'aplicado' | 'repetido' | 'ignorado'>`:
  1. Insere em `cakto_eventos` (pedido, evento, corpo do pedido sem `card`, `customer.docNumber`, `customer.phone`, `address`); conflito de chave → `repetido`.
  2. `planoDaOferta` null → `ignorado`.
  3. Acha a atual: por `cakto_assinatura`; senão por e-mail + plano (a mais recente).
  4. `efeitoDoEvento` → `criar` (insere com `gerarChave`, tenta de novo se a chave colidir), `estender`, `cancelar`, `estornar`.
  5. Se `callback` e houver checkout com esse código: `ligar_navegador(assinatura, checkout.visitante)`.
  6. `criar` grava evento `assinou` com `{ plano, periodo, valor }` (visitante do checkout ou um uuid zero, `interno: false`).
- Rota: lê o corpo cru (`await request.text()`), `webhookAutentico` (401 se falso), `lerPedidos`, aplica cada um; 200 `{ ok: true }`; erro de banco → 500 (log sem o corpo). Interruptor desligado → 503.

- [ ] **Step 1: Test** (mock): compra aprovada cria assinatura com chave e liga o navegador do checkout; mesmo pedido de novo → `repetido` sem segundo insert; renovação acha pela `cakto_assinatura` e estende; reembolso estorna; oferta desconhecida → `ignorado`; corpo guardado sem `card`/`docNumber`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5: Commit** `feat(pagamento): webhook da Cakto liga e desliga o plano`.

---

### Task 9: /assinatura e ativar chave

**Files:**
- Create: `app/assinatura/page.tsx`, `app/api/assinatura/ativar/route.ts`, `components/pagamento/FormChave.tsx`
- Modify: `lib/eventos.ts` (`LIMITES.ativacoesPorHora = 10`)

- `/assinatura` (servidor, `noindex`): com plano → nome, período, "válido até {data}", status (cancelada: "não renova; vale até…"), `ChaveAcesso`, "Para cancelar, use o link do e-mail de compra da Cakto". Sem plano → `FormChave` ("Tenho uma chave de acesso") e link para /planos.
- `POST /api/assinatura/ativar` `{ chave }`: `recusaForaDoSite`; até 10 tentativas por hora por IP, contadas como evento `usou_recurso` `{ recurso: 'ativou_chave' }` (acrescentar a `RECURSOS_USADOS`, gravado só pela rota) com uma função `recursoDentroDoLimite(ipHash, recurso, limite)` em `lib/servidor/registro.ts` (generaliza `exportacaoDentroDoLimite`, que passa a chamá-la); `normalizarChave` null → 400 "Chave inválida"; `ativarChave` → 200 / 409 "Esta chave já está em 3 navegadores. Escreva para mallon@escalav.com.br para liberar." / 404 "Chave não encontrada".
- `FormChave` (cliente): campo, botão "Usar chave", erros em `role="alert"`, sucesso → `router.refresh()`.

- [ ] **Step 1: Test** a validação de entrada da rota (função pura `lerPedidoChave(corpo)` em `lib/pagamento/chave.ts`).
- [ ] **Step 2–4:** FAIL → implementar → PASS; `npm run typecheck`.
- [ ] **Step 5: Commit** `feat(pagamento): página da assinatura e chave de acesso em outro navegador`.

---

### Task 10: Cadeados e /planos com pagamento

**Files:**
- Modify: `app/edital/[slug]/page.tsx` (link oficial e relacionados por plano), `components/BotaoEditalOficial.tsx` (variante bloqueada), `app/api/busca/route.ts`, `app/api/mapa/route.ts`, `app/api/exportar/route.ts` (raio/órgão/exportar só Pro), `lib/limites.ts` (`CODIGO_RECURSO_PRO`, `lerRecursoPro`), `components/Explorador.tsx` (402 de recurso Pro → cartão), `components/inicio/Chips.tsx` e `components/inicio/BotaoExportar.tsx` (cadeado fora do Pro), `components/EtiquetaPro.tsx` (texto do título), `components/CartaoLimite.tsx` (variante Pro), `app/planos/page.tsx`, `components/planos/PlanosVista.tsx`, `components/planos/CartoesPlanos.tsx`, `components/planos/BotaoQueroPlano.tsx` (Assinar = link para /api/checkout quando ligado), `lib/planos.ts` (Pro "Ilimitadas*" e nota de uso justo; `AVISO_PLANOS` só com interruptor desligado), `components/Cabecalho.tsx` ("Minha assinatura" para quem tem plano), `components/FaixaPlano.tsx` (Basic: texto "12 de 15", sem bolinhas; Pro: sem faixa)

Regras (todas só com o interruptor ligado; desligado, nada muda):
- Link oficial: grátis → `BotaoEditalOficial` bloqueado ("Abrir edital oficial · Basic", leva a `/planos#basic`, grava `quer_recurso` plano_basic); Basic/Pro e dono → link normal.
- Relacionados: grátis → só os 3 primeiros + linha "Veja todos os parecidos no Basic".
- `/api/busca`, `/api/mapa`: `filtros.raio || filtros.orgao` e plano ≠ pro → 402 `{ erro, codigo: 'recurso_pro', recurso: 'filtros_pro' }` antes de contar a busca. `/api/exportar`: plano ≠ pro → 402 `recurso_pro`.
- Chips de órgão e raio e botão Exportar: plano ≠ pro (lido de `useUso()`) → no lugar do controle, link com cadeado "Órgão · Pro" / "Raio · Pro" / "Exportar · Pro" para `/planos#pro` (grava `quer_recurso` filtros_pro).
- Página inicial no servidor: busca do endereço com raio/órgão sem Pro → não consulta, mostra o cartão Pro (mesmo caminho do limite).

- [ ] **Step 1: Test** `lerRecursoPro` e uma função pura `recursoProBloqueado(filtros, plano): boolean` em `lib/limites.ts`; relacionados cortados (`relacionadosDoPlano(lista, plano)` em `lib/planos.ts`).
- [ ] **Step 2–4:** FAIL → implementar telas e rotas → PASS; `npm run typecheck`; `npm run build`.
- [ ] **Step 5: Check** no `next start` local com o interruptor ligado (as variáveis do .env): grátis vê os cadeados; navegador marcado com `/sobre?interno=<segredo>` vê tudo; `/sobre?interno=1` continua com limites. Capturas computador e celular de `/planos`, edital e página inicial.
- [ ] **Step 6: Commit** `feat(pagamento): cadeados por plano e /planos com pagamento`.

---

### Task 11: Publicar e conferir com a Cakto

- [ ] **Step 1:** Gerar `INTERNO_SEGREDO` (`node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"` direto para o .env, sem imprimir) e subir para a Vercel (production) junto com `CAKTO_WEBHOOK_SECRET` e as 4 ofertas, lendo do .env sem imprimir (`vercel env add NOME production < arquivo-temporário` e apagar o temporário).
- [ ] **Step 2:** Avisar a sessão da Fase 3 antes de publicar; `npm test && npm run typecheck && npm run build`; juntar na main; `vercel deploy --prod` (pedir o ok do dono).
- [ ] **Step 3:** `POST /public_api/webhook/event_test/75009/?event_id=purchase_approved` (comando novo `testar-webhook` em scripts/cakto.ts) → a entrega aparece como 200 no histórico (o payload de teste traz oferta desconhecida: resposta `ignorado`, nada muda) — confere endereço e assinatura.
- [ ] **Step 4:** Dono: URL de volta nos 2 produtos no painel; abrir `/sobre?interno=<segredo>` nos navegadores dele (passar o endereço por mensagem, não em arquivo); compra real de R$ 49,90 com Pix num navegador comum → plano liga, `/obrigado` mostra a chave → chave em outro navegador → reembolso pelo painel → plano cai.
- [ ] **Step 5:** CLAUDE.md (regras de pagamento, interruptor, dono, comandos `npx tsx scripts/cakto.ts …`), commit, push, avisar a Fase 3.

---

## Revisão 2 (18/10/2026): checkout próprio, só Pro, Pro pela conta

Spec revisada em docs/superpowers/specs/2026-10-18-pagamento-cakto-design.md (revisão 2). As Tasks 1–10 acima estão feitas no branch `pagamento`; estas substituem a Task 11 e ajustam o que mudou. Mesmas regras globais (TDD, commits, segredos).

### Task R1: Só Pro (configuração, preços, tabela, limites)
- `lib/pagamento/config.ts`: só `CAKTO_OFERTA_PRO_MENSAL`, `CAKTO_OFERTA_PRO_ANUAL`, `CAKTO_WEBHOOK_SECRET`, `CAKTO_CLIENT_ID`, `CAKTO_CLIENT_SECRET`; `ofertas: Record<Periodo, string>`; `planoDaOferta` devolve `{ plano: 'pro', periodo }`.
- `lib/planos.ts`: Pro `centavosMes: 3790`, `centavosAno: 34990` (anual deixa de ser 10× o mensal; `precoDoPlano` usa o preço anual explícito e mostra o equivalente mensal); `PLANOS` só Grátis e Pro; `LINHAS_PLANOS` sem a coluna Basic, com a linha "Resumo semanal por e-mail" (Pro, em breve) e o "Abrir edital oficial" só no Pro.
- `lib/limites.ts`: `LIMITES_PLANO` sem Basic na tela (o tipo `Plano` continua aceitando `'basic'` como valor antigo, tratado como Pro? não: como grátis não; tratado como Pro nunca acontece porque nada novo o cria); mensagens e cartões só com Pro.
- Testes de config, planos e limites ajustados primeiro.

### Task R2: Cobrança direta (puro + cliente da API)
- `lib/pagamento/comprador.ts`: `validarComprador({ nome, email, celular, documento })` → `{ ok, comprador }` ou erros por campo (CPF/CNPJ com dígito verificador, celular brasileiro com DDD, e-mail).
- `lib/pagamento/cobranca.ts`: `corpoPix(oferta, comprador, codigo)` e `corpoCartao(oferta, comprador, codigo, cartao)` (campos da Cakto: `paymentMethod`, `customer {name,email,phone,docType,docNumber,fingerprint}`, `items:[{offerId}]` / `offerId`, `cardToken`, `threeDSecure`, `antifraud_profiling_attempt_reference`, `metadata:{codigo}`, `pixExpiresIn: 600`); `lerCobranca(json)` → `{ pedido, status, qrCode? , erro? }`.
- `lib/servidor/caktoApi.ts`: `tokenDaApi()` com cache em memória até 5 min antes de expirar; `criarCobranca(corpo, idempotencia)` → `POST /public_api/payments/` com `X-Idempotency-Key`; erro 400 da Cakto devolvido com a mensagem por campo (para logar e mostrar texto genérico).
- Testes com `fetch` simulado.

### Task R3: `POST /api/assinar` e espera
- Rota: `recusaForaDoSite`; 10 por hora por IP (`recursoDentroDoLimite` com `'assinou_tentativa'`); `validarComprador`; `criarCheckout(ctx, 'pro', periodo)`; Pix → `{ codigo, qrCode, expiraEm }`; cartão → `{ codigo, status: 'aprovado' | 'recusado' | 'processando', erro? }`.
- A espera reaproveita `/api/checkout/estado`. `/api/checkout` (redirecionamento) passa a mandar para `/assinar`.

### Task R4: Página `/assinar`
- Servidor: interruptor desligado → redireciona a /planos; já Pro → /assinatura.
- Cliente: alternador de período, campos do comprador, abas Pix Automático | Cartão. Pix: QR desenhado no navegador (pacote `qrcode`) + copia-e-cola + espera. Cartão: carrega o SDK (`https://cakto-sdk.pages.dev/cakto-sdk.min.js`, `NEXT_PUBLIC_CAKTO_CLIENT_ID`), CEP pelo ViaCEP, `createToken` → `authenticate3DS` → `completeAntifraudProfile` → `/api/assinar`.
- Capturas computador e celular.

### Task R5: Webhook por `metadata.codigo`
- `lerPedidos`: `callback` = `data.metadata.codigo` ou `data.callback`. Teste.

### Task R6: Pro pela conta; sai a chave de acesso
- `planoAtual(ctx)`: com cookie de sessão, `usuarioAtual()` e assinatura válida pelo e-mail (`assinaturaDoEmail`). Teste com o supabase falso.
- Sai: `/api/assinatura/ativar`, `FormChave`, `ChaveAcesso`, `ativarChave`, `lerPedidoChave`, evento `ativou_chave` (fica no enum de eventos: valor antigo inofensivo? retirar, ainda não publicado).
- `/obrigado`: "Pro ativo" + "Ativar minha conta" (`/entrar?email=…&voltar=/radar/comecar`). `/assinatura`: plano, validade, e-mail da compra, instrução de entrar com ele. `/entrar` aceita `?email=` para preencher o campo.

### Task R7: Telas só com Pro
- `AcaoDoPlano`, `CartaoLimite` (só "Ver o Pro"), `BotaoEditalOficial` ("Abrir edital oficial · Pro", leva a /assinar), `Relacionados` ("no Pro"), `FaixaPlano` (sai a faixa do Basic), `planoDoLimite`, `EsperaPagamento`. Conferência local ponta a ponta (script e2e adaptado) e capturas.

### Task R8: Publicar e conferir
- Variáveis na Vercel (lidas do .env, sem imprimir): `CAKTO_CLIENT_ID`, `CAKTO_CLIENT_SECRET`, `NEXT_PUBLIC_CAKTO_CLIENT_ID`, `CAKTO_WEBHOOK_SECRET`, `CAKTO_OFERTA_PRO_MENSAL`, `CAKTO_OFERTA_PRO_ANUAL`, `INTERNO_SEGREDO`; tirar `CAKTO_OFERTA_BASIC_*` do .env.
- Avisar a Fase 3/4, juntar na main, `vercel deploy --prod` (ok do dono), evento de teste do webhook, compra real com Pix Automático, CLAUDE.md.
