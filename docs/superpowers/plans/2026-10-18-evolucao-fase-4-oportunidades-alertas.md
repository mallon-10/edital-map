# Edital Map · Evolução · Fase 4 · Minhas Oportunidades, alertas reais e resumo semanal · plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Salvar, status pessoais, observação e descartar editais (com a página Minhas Oportunidades), alertas por e-mail de verdade (vários por conta, criados na página /alertas, enviados todo dia às 7h pelo Resend, sem repetir edital, com histórico, nova tentativa e descadastro por link) e o resumo semanal do Pro (segunda às 7h), tudo pelo plano da conta (Grátis ou Pro: manual, assinatura com o mesmo e-mail ou plano do navegador).

**Architecture:** A migração `0016_oportunidades_alertas.sql` amplia `salvos` (status, observação, sem chave estrangeira), cria `alertas`, `envios_alerta` e `envios_resumo`, religa `alertas_enviados` a `alertas`, acrescenta `perfis.resumo_semanal` e funções só do servidor: `plano_da_conta` (gratis|pro: perfis.plano + assinatura válida com o e-mail da conta, `security definer` porque lê `auth.users`), `gravar_salvo` (limite por plano numa transação), `salvos_da_conta`, `alertas_para_envio`, `editais_do_alerta` (a mesma busca do radar com janela e sem repetidos), `registrar_envio_alerta`, `contas_para_resumo`, `resumo_do_radar` (números, listas e quem mais compra numa passada) e `parar_resumo_semanal`; `buscar_editais` e `radar_contagens` ganham `p_sem_ids` para os descartados sumirem do Meu Radar. O site fala com elas só por `lib/servidor/{conta,salvos,alertas,descadastro}.ts`, sempre com o `Usuario` da sessão (`usuarioAtual()`), e as rotas que mudam algo passam por `recusaForaDoSite`. As regras puras ficam em `lib/limitesConta.ts`, `lib/salvos.ts` e `lib/alertas/{regras,email,token}.ts` (sem `server-only`, para o job também usar). O envio é um job do GitHub Actions (`worker/enviar-alertas.ts`, `--modo alertas` todo dia e `--modo resumo` na segunda), que lê pelo service role, monta um e-mail por conta, manda pela API HTTP do Resend com `fetch` (sem dependência nova), tenta de novo com 2/4/8 s e só depois do aceite grava `alertas_enviados`/o histórico.

**Tech Stack:** Next.js 16 (App Router) + React 19 + Tailwind 4, @supabase/supabase-js 2 e @supabase/ssr 0.12 (já instalados), Postgres 15 do Supabase (PostgREST, plpgsql), Resend (API HTTP, `fetch` do Node 24), GitHub Actions, vitest 3, TypeScript 5, Vercel CLI. **Nenhuma dependência nova.**

**Spec:** `docs/superpowers/specs/2026-10-18-evolucao-fase-4-oportunidades-alertas-design.md` (vinculante), com duas decisões do dono depois dela: **o Basic acabou** (só Grátis e Pro; salvos e alertas são do Pro) e **entra o resumo semanal do Pro** (segunda às 7h, mesmo remetente, descadastro e histórico próprios). Regras do projeto: `CLAUDE.md`. Formato e convenções: `docs/superpowers/plans/2026-10-18-evolucao-fase-3-conta-radar.md`. Pagamento (sessão paralela, branch `pagamento`): `supabase/migrations/0015_pagamento.sql` e `lib/servidor/plano.ts` (`planoAtual(ctx)`), só leitura.

## Global Constraints

- Trabalho no worktree `C:\Users\jotap\worktrees\evolucao-f4` (Git Bash: `/c/Users/jotap/worktrees/evolucao-f4`), branch `evolucao-fase-4` (já existe; dependências instaladas). Todos os comandos rodam na raiz do worktree. **Não ler nem mexer no checkout principal** (pasta do OneDrive, branch `pagamento` de outra sessão). Não ler nem imprimir o `.env`.
- TDD com vitest: teste primeiro. `npm test` e `npm run typecheck` passam antes de cada commit; tasks que mexem em `app/`, `components/` ou `proxy.ts` também rodam `npm run build`.
- **Nenhuma dependência nova.** O Resend é chamado com `fetch` (`https://api.resend.com/emails`).
- Schema só muda com migração nova: esta fase cria só `supabase/migrations/0016_oportunidades_alertas.sql` (0012/0013 SEO, 0014 conta e radar, 0015 pagamento já aplicadas em produção; a 0015 ainda não está neste branch). **Implementadores não aplicam migração, não rodam SQL, não tocam no banco, não chamam o Resend nem o PNCP**: escrevem o SQL e as guardas de texto em vitest. Quem aplica e confere é o controlador (Task 2): `npm run db:aplicar -- supabase/migrations/0016_oportunidades_alertas.sql` (uma transação, `set local lock_timeout = '10s'`).
- Funções novas ou trocadas com `revoke execute ... from public, anon, authenticated;` e `grant execute ... to service_role;` **por assinatura**. Tabelas da conta (`salvos`, `alertas`, `alertas_enviados`, `envios_alerta`): RLS ligado, **nenhuma** política, `revoke all ... from public, anon, authenticated`, acesso só `service_role`.
- **`user_id` só da sessão**: `Usuario` só nasce em `lib/servidor/sessao.ts`; `salvos`, `alertas` e `envios_alerta` só por `lib/servidor/salvos.ts`, `lib/servidor/alertas.ts` e (descadastro por token) `lib/servidor/descadastro.ts`; toda função exportada de `salvos.ts`/`alertas.ts` começa com `usuario: Usuario`; nenhum arquivo de `app/` fala em `user_id`/`userId`; toda rota POST/PATCH/DELETE de `/api/salvos*` e `/api/alertas*` chama `recusaForaDoSite(request)` e `usuarioAtual()`. Exceção única e documentada: `POST /api/descadastro` (um clique do provedor de e-mail, RFC 8058) não tem sessão nem checagem de origem; autoriza só pelo token HMAC.
- Plano da conta (spec §1): `planoDaConta(usuario, ctx?)` = maior entre `plano_da_conta` (perfis.plano manual + assinatura válida com o e-mail da conta) e, com navegador, o plano do navegador (`planoDoNavegador`, que é o `planoAtual` da 0015). O job usa só `plano_da_conta`. `em_interno` sozinho **não** libera salvos nem alertas.
- Planos: só **Grátis** e **Pro** (`NivelConta`). Linha `basic` antiga (perfis ou assinatura) vale **Pro** até o fim da validade. Limites (`LIMITES_CONTA`): Grátis 0 salvos e 0 alertas, sem resumo semanal (botões mostram o convite ao Pro); **Pro 5 alertas e salvos com uso justo (500, sem teto visível)**. Descartados não contam como salvos (teto próprio de 500, no banco). Alertas pausados contam no limite. A tabela de /planos é da sessão do pagamento: `lib/planos.ts` **não** muda nesta fase.
- Segredos: `process.env.RESEND_API_KEY` só no job (`worker/enviar-alertas.ts`); `process.env.ALERTAS_SEGREDO` só no job, em `app/alertas/sair/page.tsx` e em `app/api/descadastro/route.ts`. Nada disso em `components/` ou `lib/cliente/`. Nenhum e-mail em eventos nem nos logs do job.
- E-mail: remetente `Edital Map <alertas@editalmap.com.br>`; links absolutos em `https://www.editalmap.com.br` (`url()` de `lib/seo/site.ts`); cabeçalhos `List-Unsubscribe: <https://www.editalmap.com.br/api/descadastro?t=…>` e `List-Unsubscribe-Post: List-Unsubscribe=One-Click`; textos do PNCP só por `assunto()`/`nomeProprio()` de `lib/texto.ts` e sempre escapados no HTML; valor nulo ou 0 = "Valor não informado".
- Todo `<Link>` para `/edital/...` tem `prefetch={false}` (guarda `scripts/prefetch-edital.test.ts`). Sem `cacheComponents`.
- Interface em português do Brasil, vocabulário "edital" e "Alertas". Só as cores e raios do design system em `app/globals.css` (`bg-pin`, `text-on-pin`, `bg-pin-soft`, `text-pin-strong`, `border-pin`, `bg-mata-soft`, `text-mata`, `bg-sunken`, `bg-raised`, `bg-surface`, `text-ink`, `text-ink-muted`, `border-line`, `border-line-strong`, `rounded-xs/sm/md/lg`). Nenhuma cor nova, nenhuma sombra nova. Alvos de toque com 44 px (`size-11`/`h-11`).
- Textos exatos: status `Salvo`, `Em análise`, `Vou participar`, `Descartado`; abas `Todos`, `Salvo`, `Em análise`, `Vou participar`, `Descartado`; "Minhas Oportunidades"; "Os status são só seus: não mudam a situação oficial do edital no PNCP."; "Salvo ✓"; "Plano no navegador, não na conta: use o mesmo e-mail da compra."; "Envio indisponível agora. Tentamos de novo amanhã às 7h."; "Parar de receber este alerta"; "Parar todos os alertas"; "Parar o resumo semanal"; "Criar alerta a partir do meu radar"; "Resumo semanal"; "Conhecer o Pro"; mensagens de `MENSAGENS_SALVOS`, `MENSAGENS_ALERTA` e `MENSAGENS_LIMITE_CONTA` (Tasks 3, 4, 7); resumo sem dado inventado (só o que `resumo_do_radar` devolve; sem novidade, não manda).
- Arquivos que o branch `pagamento` também muda (`lib/eventos.ts`, `lib/servidor/registro.ts`, `app/radar/page.tsx`, `app/edital/[slug]/page.tsx`, `scripts/migracoes.test.ts`, `components/inicio/ColunaLista.tsx`, `components/CartaoLimite.tsx`): mudar só as linhas necessárias, sem reformatar; `ColunaLista.tsx` e `CartaoLimite.tsx` **não** mudam nesta fase.
- Implementadores verificam com `npm test`, `npm run typecheck` e `npm run build`; **não** sobem `npm run dev` contra o banco e **não** rodam `npm run worker:alertas` nem `worker:resumo`. Conferências no navegador, os envios reais e os e-mails recebidos são do controlador com o dono (Task 14).
- Todo commit termina com `Co-Authored-By: <nome do modelo que escreveu o commit> <noreply@anthropic.com>` (nos comandos abaixo, `<modelo>`).

## Estimativa de tempo

| Task | Quem | Modelo | Tempo estimado | Acumulado |
|---|---|---|---|---|
| 1 · Migração 0016 (salvos, alertas, resumo), guardas e conferências | implementador | capable | 60 min | 1h00 |
| 2 · Aplicar a 0016, segredos e plano do dono | controlador | — | 35 min | 1h35 |
| 3 · Plano da conta (Grátis/Pro), limites e preferência do resumo | implementador | standard | 35 min | 2h10 |
| 4 · Salvos: regras, servidor e API | implementador | capable | 55 min | 3h05 |
| 5 · Salvar e descartar na interface (cards, edital, radar, menu) | implementador | capable | 70 min | 4h15 |
| 6 · Minhas Oportunidades (/oportunidades) | implementador | capable | 55 min | 5h10 |
| 7 · Alertas: regras, servidor e API | implementador | capable | 50 min | 6h00 |
| 8 · Página /alertas com conta e liga/desliga do resumo | implementador | capable | 75 min | 7h15 |
| 9 · E-mail dos alertas, tokens de descadastro e /alertas/sair | implementador | capable | 55 min | 8h10 |
| 10 · Job dos alertas (seleção, sem repetir, nova tentativa, histórico, evento) | implementador | capable | 70 min | 9h20 |
| 11 · Resumo semanal: o e-mail | implementador | standard | 40 min | 10h00 |
| 12 · Resumo semanal: o envio (modo do job) | implementador | standard | 45 min | 10h45 |
| 13 · Workflow diário e semanal e guardas de isolamento | implementador | standard | 25 min | 11h10 |
| 14 · Publicar e conferir ponta a ponta (e-mails reais) | controlador + dono | — | 75 min | 12h25 |
| 15 · Documentação e aceite | implementador | cheap | 15 min | 12h40 |

Revisões entre tasks somam ~20%: total realista **~15 h** (o resumo semanal acrescentou ~2 h ao plano anterior). Se a Task 2 medir `editais_do_alerta` acima de 1 s ou `resumo_do_radar` acima de 1,5 s com 5 produtos, avisar com a nova estimativa (+30 min, ver "Riscos").

**Do dono (João):**
- Task 14, ~25 min: no site publicado, com a conta dele (já Pro pela marcação manual da Task 2): salvar 2 editais, mudar status e observação, descartar um pelo radar; criar 2 alertas (um "a partir do meu radar"); **abrir a caixa de entrada e confirmar os e-mails reais** do alerta e do resumo semanal (remetente, assunto, editais, links, "Parar de receber…"); clicar em "Parar de receber este alerta" e em "Parar o resumo semanal" e confirmar; olhar no celular; se tiver, entrar com um segundo e-mail (Grátis) para ver o convite ao Pro.
- Task 14, ~1 min: autorizar o merge do `evolucao-fase-4` no `main` e o push (o agendamento e o `workflow_dispatch` só rodam com o workflow no `main`). Sem esse ok, os envios automáticos não começam; o resto fica no ar.

O resto o controlador e os implementadores fazem sozinhos (segredos no GitHub e na Vercel, plano Pro da conta do dono, migração, publicação, disparo manual do job).

## Decisões (onde a spec deixou espaço)

1. **Plano da conta em SQL** (`plano_da_conta`, `security definer`, `search_path = ''`): lê `perfis.plano` e `assinaturas` (0015: `status <> 'estornada'` e `valido_ate > now()`, e-mail em minúsculas) ligada a `auth.users.email`. O site soma o plano do navegador por `planoDoNavegador(ctx)`; o job usa só o SQL (sem navegador).
2. **Adaptador do plano do navegador** (`lib/servidor/planoNavegador.ts`): se `lib/servidor/plano.ts` (pagamento) já estiver neste branch quando a Task 3 começar, o arquivo é uma linha (`export { planoAtual as planoDoNavegador } from './plano';`); senão, reimplementa a mesma regra (dono confiável = Pro; `plano_do_visitante`) e a junção com o pagamento troca para a linha única (Task 3, Step 5, e "Ordem de publicação").
3. **Descartar e salvar exigem plano pago** (Grátis vê o convite aos planos nos dois); descartados não contam no limite de salvos e têm teto próprio de 500.
4. **`gravar_salvo` numa transação com trava por conta** (`pg_advisory_xact_lock`): existência do edital (só ao criar), limite ao entrar em salvo/análise/participar vindo de fora ou de "descartado"; mudar entre salvo/análise/participar não conta de novo.
5. **Identificador do edital nas rotas = `contratacoes.id`** (numeroControlePNCP, `ID_CONTRATACAO`), que os cards e a página do edital já têm; a lista de Minhas Oportunidades traz o `slug` pelo `left join` de `salvos_da_conta`.
6. **Retenção**: contratação com qualquer linha em `salvos` fica; descartada sai junto com a contratação (a linha de `salvos` vai antes); `alertas_enviados` de contratação que já saiu e `envios_alerta` com mais de 180 dias saem. Edital salvo que sumir (ex.: o worker remove uma regravada fora da retenção) aparece como "Edital não disponível".
7. **Descartados fora do Meu Radar no banco** (`p_sem_ids` em `buscar_editais` e `radar_contagens`, corpos iguais aos da 0014 fora isso), para o total e as páginas continuarem certos.
8. **Janela do alerta** = `greatest(sincronizada_em, atualizada_pncp_em) > desde`: `sincronizada_em` (entrada no espelho) cobre o edital publicado antes e sincronizado depois do último envio; `atualizada_pncp_em` cobre o atualizado. `desde` = `ultimo_envio_em` ou, sem envio, agora − 24 h. Sem repetir pela chave `(alerta_id, contratacao_id)`; descartados da conta também não vão.
9. **Até 20 editais por alerta** (`LIMITE_EDITAIS_EMAIL`), por relevância; com sobra, o e-mail diz "Mais N editais novos entram no próximo e-mail" e a janela **não** avança (`p_avancar` falso): os de fora seguem elegíveis no dia seguinte.
10. **Um e-mail por conta** (todos os alertas com novidade); `List-Unsubscribe` (um clique) aponta para "parar todos"; cada seção tem "Parar de receber este alerta". Parar = **pausar** (`ativo = false`), nunca apagar.
11. **Nova tentativa** = até 3 novas tentativas depois da primeira (esperas 2/4/8 s, 4 no total, a mesma regra do PNCP no worker), só para 429, 5xx, rede ou tempo (15 s); 4xx é falha final. `Idempotency-Key` = `alertas/<conta>/<sha256 dos ids>` (repetir o mesmo e-mail em 24 h não duplica no Resend). Pausa de 600 ms entre e-mails (abaixo de 2 por segundo).
12. **Plano no envio**: Grátis → `pulado_plano` em todos; Pro → até 5 pelo mais antigo (os outros `pulado_plano`).
13. **Sem chave ou sem segredo**: cada alerta com novidade vira `falhou` com o motivo (`RESEND_API_KEY ausente` / `ALERTAS_SEGREDO ausente`) e o job sai com código 1; a página /alertas mostra "Envio indisponível agora…" quando o último envio de algum alerta falhou.
14. **Token de descadastro** = `a.<uuid do alerta>.<HMAC>` ou `t.<uuid da conta>.<HMAC>` (HMAC-SHA256 com `ALERTAS_SEGREDO`, base64url, comparação em tempo constante), sem validade (link de descadastro precisa funcionar sempre). `GET /alertas/sair` só mostra; o POST pausa.
15. **Evento `alerta_enviado`** gravado pelo job com o visitante fixo `00000000-0000-4000-8000-000000000001` (o job não tem navegador) e detalhe `{ qtd, alertas }`. `edital_salvo`/`edital_descartado` `{ plano }`; `alerta_criado` `{ termos, ufs, municipios, origem, plano }`. Nenhum com e-mail.
16. **/alertas continua indexável** (sem sessão é a página-convite que o Google vê; canônico `/alertas`); /oportunidades, /alertas/novo, /alertas/[id]/editar e /alertas/sair são `noindex`. O formulário antigo de pedido por e-mail (`components/FormAlerta.tsx`, `validarPedidoAlerta`, `gravarPedido`) sai; `pedidos_alerta` fica no banco.
17. **Basic descontinuado** (decisão do dono depois da spec): `NivelConta = 'gratis' | 'pro'`; `plano_da_conta` e `lerPlano` tratam `basic` como **Pro** (quem pagou antes não perde o que pagou até `valido_ate`); a tabela de /planos fica com a sessão do pagamento.
18. **Resumo semanal do Pro** (escopo novo do dono): mesmo job com `--modo resumo`, cron `0 10 * * 1` (segunda, 7h); contas Pro (só a conta, sem navegador) com Meu Radar e `perfis.resumo_semanal` ligado (padrão), no máximo um resumo a cada 6 dias; conteúdo = números da semana (novas por publicação nos últimos 7 dias, a regra de "Novas" do radar; prazo até hoje + 7; total; valor somado só dos com valor, dizendo de quantos), até 10 novos por relevância, até 5 que encerram primeiro, 5 órgãos e 5 cidades com mais editais abertos no radar; sem novas nem prazo próximo não manda (`sem_novidades`). Histórico em `envios_resumo` (tabela irmã, sem `alerta_id`). Descadastro com token `r` → `parar_resumo_semanal`; liga/desliga em /alertas (`POST /api/conta/resumo`). Evento `resumo_enviado` `{ novas, prazo }`.
18. **Proxy**: renova a sessão também em `/oportunidades`, `/alertas*`, `/api/salvos*` e `/api/alertas*`; a página do edital e a lista não renovam (os botões pedem `/api/salvos`, que renova).

## Ordem de publicação (perigos)

| Momento | Ordem obrigatória | O que quebra se inverter |
|---|---|---|
| 0016 | Task 2: `gh run list --workflow sync.yml --limit 1` sem `in_progress` → aplicar → site no ar 200 → conferências [D1]–[D8] e [D10]. Só depois, Task 14: `vercel deploy --prod --yes`. | Site novo antes da 0016: `gravar_salvo`, `salvos_da_conta`, `plano_da_conta` e `p_sem_ids` não existem → botões dão erro, /oportunidades e /radar quebram. |
| 0016 aplicada, site antigo no ar | Nada a fazer: `buscar_editais`/`radar_contagens` aceitam as chamadas antigas (`p_sem_ids` com padrão nulo); `salvos` e `alertas_enviados` não eram usados; a retenção só ganhou exceções. | — |
| `ALERTAS_SEGREDO` na Vercel (production) | Task 2, antes do deploy da Task 14. | /alertas/sair diz "Este link não vale" para todo e-mail; o um clique responde 400. |
| `RESEND_API_KEY` e `ALERTAS_SEGREDO` no GitHub | Task 2, antes do merge no `main`. | O job registra `falhou` (sem chave) e sai vermelho. |
| `.github/workflows/alertas.yml` no `main` | Só depois da 0016, do deploy e dos segredos; merge com o ok do dono (Task 14). | O agendamento das 10:00 UTC roda contra um banco sem as funções → job vermelho todo dia. |
| Pagamento × esta fase | Quem juntar por último resolve conflitos de poucas linhas em `lib/eventos.ts`, `lib/servidor/registro.ts`, `app/radar/page.tsx`, `app/edital/[slug]/page.tsx`, `scripts/migracoes.test.ts`; `lib/servidor/planoNavegador.ts` passa à linha única; a guarda da 0016 lê a lista de eventos da 0015 se ela existir. | Duas regras de plano do navegador divergentes; `Contexto` sem `dono` no adaptador. |
| Sempre | `db:aplicar` fora de uma rodada do sync. | `lock_timeout` de 10 s estoura; a migração inteira volta atrás. |

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/0016_oportunidades_alertas.sql` (novo), `scripts/migracoes.test.ts`, `docs/evolucao-fase-4.sql` (novo) | Banco, guardas, conferências |
| `lib/eventos.ts` | `TIPOS_EVENTO_OPORTUNIDADES`; sai o pedido de alerta antigo |
| `lib/limitesConta.ts` (novo) | `NivelConta`, `LIMITES_CONTA`, `maiorPlano`, `lerPlano`, `PlanoConta`, `avisoPlanoNavegador`, `bloqueioSalvar`, `bloqueioAlerta`, `MENSAGENS_LIMITE_CONTA` |
| `lib/servidor/planoNavegador.ts` (novo), `lib/servidor/conta.ts` | `planoDoNavegador`; `planoDaConta`, `resumoSemanalLigado`, `mudarResumoSemanal` |
| `lib/salvos.ts` (novo) | Status, validação, linhas, abas, ordem, situação oficial, confirmação |
| `lib/servidor/salvos.ts` (novo), `app/api/salvos/route.ts` (novo) | Salvos da conta; GET/POST/PATCH/DELETE |
| `lib/conta.ts`, `proxy.ts` | `rotaComSessao` e matcher com as páginas e APIs novas |
| `lib/cliente/pedido.ts`, `lib/cliente/salvos.ts` (novos) | `pedirJson`/`respostaDaAcao`; estado dos salvos no navegador |
| `components/oportunidades/{BotaoSalvar,BotaoDescartar,MenuCardRadar,AvisoPlano,LinhaOportunidade}.tsx` (novos), `components/inicio/{Icones,CardLista,CardCompacto}.tsx`, `components/conta/{MenuConta,CartaoRecursoPlano}.tsx`, `components/radar/CartoesRadar.tsx` | Botões, menu do card, linha da lista, cartão "Editais salvos", convite aos planos |
| `lib/servidor/radar.ts`, `app/radar/page.tsx`, `app/edital/[slug]/page.tsx` | Descartados fora do radar; botões no edital |
| `app/oportunidades/page.tsx` (novo) | Minhas Oportunidades |
| `lib/alertas/regras.ts` (novo), `lib/servidor/alertas.ts` (novo), `app/api/alertas/route.ts`, `app/api/alertas/[id]/route.ts` (novo) | Alertas: validação, servidor, rotas |
| `app/alertas/{page,novo/page,[id]/editar/page}.tsx`, `components/alertas/{FormAlerta,ItemAlerta,ResumoSemanal}.tsx` (novos), `components/radar/{CamposOportunidade,FormRadar}.tsx`, `app/api/conta/resumo/route.ts` (novo), `app/sobre/page.tsx` | Página /alertas com conta, formulário e liga/desliga do resumo |
| `lib/alertas/{token,email}.ts` (novos), `lib/servidor/descadastro.ts` (novo), `app/alertas/sair/page.tsx`, `components/alertas/ConfirmarDescadastro.tsx`, `app/api/descadastro/route.ts` (novos) | E-mail, descadastro |
| `lib/alertas/resumo.ts` (novo) | E-mail do resumo semanal |
| `worker/alertas/{banco,resend,executar,resumo,modo}.ts`, `worker/enviar-alertas.ts` (novos), `package.json` | Job de envio (alertas e resumo) |
| `.github/workflows/alertas.yml` (novo), `.env.example`, `scripts/alertas.test.ts` (novo) | Agenda e guardas |
| `CLAUDE.md`, spec §6, `docs/fase-3-metricas.md` | Documentação, aceite e números |

---

### Task 1: Migração `0016` (salvos, alertas, resumo semanal, envios e funções), guardas e conferências

**Files:**
- Create: `supabase/migrations/0016_oportunidades_alertas.sql`, `docs/evolucao-fase-4.sql`
- Modify: `lib/eventos.ts` (`TIPOS_EVENTO_OPORTUNIDADES`), `scripts/migracoes.test.ts`

**Interfaces:**
- Consumes: 0014 (`buscar_editais`, `radar_contagens`, `abertas_unicas`, `exclusivo_me_epp`), 0011 (`termos_da_busca`, `consulta_termos`, `consulta`, `consulta_frase`, `acertos_busca`, `em_aberto`), 0015 em produção (`assinaturas(email, plano, status, valido_ate)`, `checkouts`, `cakto_eventos`, 12 tipos de evento com `assinou`).
- Produces (contrato TS↔SQL usado nas Tasks 3–10):
  - Colunas: `salvos.status text` (`salvo|analise|participar|descartado`, padrão `salvo`), `salvos.observacao text` (≤ 500), `salvos.atualizado_em`; tabelas `alertas(id, user_id, nome, termos, termos_excluir, ufs, municipios, valor_min, valor_max, modalidades, so_me_epp, ativo, criado_em, atualizado_em, ultimo_envio_em)`, `alertas_enviados(alerta_id, contratacao_id, enviado_em)`, `envios_alerta(id, alerta_id, user_id, iniciado_em, status, qtd_editais, tentativas, erro, id_mensagem)`.
  - `public.plano_da_conta(p_user uuid) returns text` (`gratis|pro`; linha `basic` antiga vale `pro`).
  - `public.gravar_salvo(p_user uuid, p_contratacao text, p_status text, p_limite int) returns text` (`ok|limite|sem_edital`).
  - `public.salvos_da_conta(p_user uuid) returns table (contratacao_id, status, observacao, criado_em, atualizado_em, slug, objeto, orgao_nome, municipio_nome, uf, valor_estimado, encerramento_em, situacao_id)`.
  - `public.alertas_para_envio() returns table (alerta_id, user_id, email, plano, nome, termos, termos_excluir, ufs, municipios, valor_min, valor_max, modalidades, so_me_epp, ultimo_envio_em, criado_em)`.
  - `public.editais_do_alerta(p_alerta uuid, p_desde timestamptz, p_termos text[], p_relacionados, p_excluir, p_ufs, p_ibges, p_valor_min, p_valor_max, p_modalidades, p_so_me_epp, p_limite int default 20) returns table (id, slug, objeto, orgao_nome, municipio_nome, uf, valor_estimado, encerramento_em, situacao_id, pontuacao, total)` — os nomes `p_termos`…`p_so_me_epp` são os de `filtrosDoRadar` (lib/radar.ts).
  - `public.registrar_envio_alerta(p_alerta uuid, p_status text, p_qtd int, p_tentativas int, p_erro text, p_id_mensagem text, p_ids text[], p_selecionado_em timestamptz, p_avancar boolean) returns uuid`.
  - `public.buscar_editais(...0014..., p_sem_ids text[] default null)` e `public.radar_contagens(...0014..., p_sem_ids text[] default null)`.
  - Resumo semanal: coluna `perfis.resumo_semanal boolean not null default true`; tabela `envios_resumo(id, user_id, iniciado_em, status 'enviado'|'sem_novidades'|'falhou', qtd_editais, tentativas, erro, id_mensagem)`; `public.contas_para_resumo() returns table (user_id, email, termos, termos_excluir, ufs, municipios, valor_min, valor_max, modalidades, so_me_epp)` (Pro, com radar, resumo ligado, sem resumo enviado em 6 dias); `public.resumo_do_radar(p_user uuid, p_termos text[], p_relacionados, p_excluir, p_ufs, p_ibges, p_valor_min, p_valor_max, p_modalidades, p_so_me_epp) returns jsonb` com as chaves `total`, `novas`, `prazo_proximo`, `valor_total`, `com_valor`, `novos[]`, `encerrando[]` (cada um `{ id, slug, objeto, orgao_nome, municipio_nome, uf, valor_estimado, encerramento_em, situacao_id, pontuacao }`), `orgaos[]` (`{ nome, uf, qtd, valor }`), `cidades[]` (`{ nome, uf, qtd }`); `public.parar_resumo_semanal(p_user uuid) returns boolean`.
  - `lib/eventos.ts`: `TIPOS_EVENTO_OPORTUNIDADES = ['edital_salvo', 'edital_descartado', 'alerta_criado', 'alerta_enviado', 'resumo_enviado'] as const`, `type TipoEventoOportunidades`.

- [ ] **Step 1: Tipos de evento da fase**

Em `lib/eventos.ts`, logo depois de `export type TipoEventoConta = …;`, acrescente:
```ts
/** Minhas Oportunidades, alertas e resumo semanal (Evolução, Fase 4): só servidor e job dos alertas, sem e-mail. */
export const TIPOS_EVENTO_OPORTUNIDADES = ['edital_salvo', 'edital_descartado', 'alerta_criado', 'alerta_enviado', 'resumo_enviado'] as const;
export type TipoEventoOportunidades = (typeof TIPOS_EVENTO_OPORTUNIDADES)[number];
```

- [ ] **Step 2: Escrever as guardas (falhando)**

Em `scripts/migracoes.test.ts`, troque a linha de import de `../lib/eventos` por
`import { TIPOS_EVENTO, TIPOS_EVENTO_CONTA, TIPOS_EVENTO_OPORTUNIDADES, TIPOS_EVENTO_SERVIDOR } from '../lib/eventos';`
e acrescente, antes de `function corpoDe(`:
```ts
describe('migração 0016 (Minhas Oportunidades e alertas)', () => {
  const sql = ler('supabase/migrations/0016_oportunidades_alertas.sql').replace(/\r\n/g, '\n');
  const s14 = ler('supabase/migrations/0014_conta_radar.sql');
  const corpo = (inicio: string) => {
    const c = corpoDe(sql, inicio);
    expect(c, inicio).not.toBe('');
    return c;
  };
  const SEM_IDS = 'where p_sem_ids is null or u.id <> all(p_sem_ids)';

  it('uma transação curta e o PostgREST relê as funções no fim', () => {
    expect(sql).toContain("set local lock_timeout = '10s';");
    expect(sql.trimEnd().endsWith("notify pgrst, 'reload schema';")).toBe(true);
  });
  it('salvos: status, observação até 500, atualizado_em, sem a chave estrangeira e com índices', () => {
    for (const c of [
      'alter table public.salvos drop constraint salvos_contratacao_id_fkey;',
      "add column status text not null default 'salvo'",
      'add column observacao text',
      'add column atualizado_em timestamptz not null default now()',
      "check (status in ('salvo', 'analise', 'participar', 'descartado'))",
      'check (observacao is null or char_length(observacao) <= 500)',
      'create index salvos_user_status_idx on public.salvos (user_id, status);',
      'create index salvos_contratacao_idx on public.salvos (contratacao_id);',
    ]) {
      expect(sql).toContain(c);
    }
  });
  it('alertas_enviados só sai vazia e volta por alerta, com chave dupla', () => {
    expect(sql).toContain("raise exception 'alertas_enviados tem linhas; esperado vazio antes da 0016';");
    expect(sql.indexOf('raise exception')).toBeLessThan(sql.indexOf('drop table public.alertas_enviados;'));
    expect(sql).toContain('alerta_id       uuid not null references public.alertas(id) on delete cascade,');
    expect(sql).toContain('primary key (alerta_id, contratacao_id)');
  });
  it('alertas com as checagens do radar; histórico com os 4 status', () => {
    for (const c of [
      'user_id         uuid not null references auth.users(id) on delete cascade,',
      'check (char_length(nome) between 1 and 60)',
      'check (cardinality(termos) between 1 and 10)',
      'check (cardinality(termos_excluir) <= 10)',
      'check (cardinality(municipios) <= 50)',
      'check (cardinality(ufs) = 0 or cardinality(municipios) = 0)',
      'check (valor_min is null or valor_max is null or valor_min <= valor_max)',
      'ativo           boolean not null default true,',
      'ultimo_envio_em timestamptz,',
      'create index alertas_user_id_idx on public.alertas (user_id);',
      "check (status in ('enviado', 'sem_novidades', 'falhou', 'pulado_plano'))",
      'create index envios_alerta_alerta_idx on public.envios_alerta (alerta_id, iniciado_em desc);',
    ]) {
      expect(sql).toContain(c);
    }
  });
  it('tabelas novas só pelo servidor: RLS ligado, sem políticas, sem anon/authenticated', () => {
    expect(sql).not.toMatch(/create policy/i);
    for (const t of ['alertas', 'alertas_enviados', 'envios_alerta', 'envios_resumo']) {
      expect(sql).toContain(`alter table public.${t} enable row level security;`);
      expect(sql).toContain(`revoke all on table public.${t} from public, anon, authenticated;`);
      expect(sql).toContain(`grant select, insert, update, delete on table public.${t} to service_role;`);
    }
  });
  it('assinaturas antigas de buscar_editais e radar_contagens saem antes das novas', () => {
    for (const d of [
      'drop function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text, text[], numeric, boolean);',
      'drop function public.radar_contagens(text[], text[], text[], text[], text[], numeric, numeric, int[], boolean, timestamptz);',
    ]) {
      expect(sql).toContain(d);
      expect(sql.indexOf(d)).toBeLessThan(sql.indexOf('create function public.buscar_editais('));
      expect(sql.indexOf(d)).toBeLessThan(sql.indexOf('create function public.radar_contagens('));
    }
  });
  it('buscar_editais = corpo da 0014 + p_sem_ids nas duas ordens (antes do total e da página)', () => {
    const c16 = corpo('create function public.buscar_editais(');
    const c14 = corpoDe(s14, 'create function public.buscar_editais(');
    expect(c16).toContain(`      cross join lateral public.acertos_busca(u.busca, u.itens_palavras, v_termos, v_tqs, v_frases, v_digitados, v_relacionados) a\n      ${SEM_IDS}\n      order by a.pontuacao desc`);
    expect(c16).toContain(`p_ibges, p_valor_max, p_so_me_epp) u\n        ${SEM_IDS}\n        order by`);
    const semNovos = c16
      .replace('p_so_me_epp boolean default null,\n  p_sem_ids text[] default null)', 'p_so_me_epp boolean default null)')
      .replace(`      ${SEM_IDS}\n`, '')
      .replace(`        ${SEM_IDS}\n`, '');
    expect(semNovos).toBe(c14);
  });
  it('radar_contagens = corpo da 0014 + p_sem_ids', () => {
    const c16 = corpo('create function public.radar_contagens(');
    const c14 = corpoDe(s14, 'create function public.radar_contagens(');
    const semNovos = c16
      .replace('p_desde timestamptz default null, p_sem_ids text[] default null)', 'p_desde timestamptz default null)')
      .replace(`  ${SEM_IDS}\n`, '');
    expect(semNovos).toBe(c14);
  });
  it('plano da conta: gratis ou pro (perfis.plano ou assinatura válida com o e-mail da conta; basic antigo = pro)', () => {
    const c = corpo('create function public.plano_da_conta(');
    expect(c).toContain("security definer set search_path = ''");
    expect(c).toContain('select p.plano from public.perfis p where p.id = p_user');
    expect(c).toContain('join public.assinaturas a on a.email = lower(u.email)');
    expect(c).toContain("a.status <> 'estornada' and a.valido_ate > now()");
    expect(c).toContain("select case when bool_or(plano in ('pro', 'basic')) then 'pro' else 'gratis' end");
  });
  it('resumo semanal: preferência ligada por padrão, histórico próprio, só Pro com radar e uma vez por semana', () => {
    expect(sql).toContain('alter table public.perfis add column resumo_semanal boolean not null default true;');
    expect(sql).toContain("status       text not null check (status in ('enviado', 'sem_novidades', 'falhou')),");
    const contas = corpo('create function public.contas_para_resumo(');
    expect(contas).toContain("security definer set search_path = ''");
    expect(contas).toContain("where p.resumo_semanal and u.email is not null and public.plano_da_conta(r.user_id) = 'pro'");
    expect(contas).toContain("e.status = 'enviado' and e.iniciado_em > now() - interval '6 days'");
    expect(corpo('create function public.parar_resumo_semanal(')).toContain('update public.perfis set resumo_semanal = false where id = p_user returning true');
  });
  it('resumo do radar: as mesmas abertas do radar sem descartados; novas = publicação em 7 dias; prazo = conta de p_dias 7', () => {
    const c = corpo('create function public.resumo_do_radar(');
    expect(c).toContain('from public.abertas_unicas(v_tq, v_tq_excluir, p_ufs, p_valor_min, p_modalidades, null, null, null, null, p_ibges, p_valor_max, p_so_me_epp) u');
    expect(c).toContain('cross join lateral public.acertos_busca(u.busca, u.itens_palavras, v_termos, v_tqs, v_frases, v_digitados, v_relacionados) a');
    expect(c).toContain("s.status = 'descartado')");
    expect(c).toContain("v_semana timestamptz := now() - interval '7 days';");
    expect(c).toContain("(date_trunc('day', now() at time zone 'America/Sao_Paulo') + make_interval(days => 7 + 1)) at time zone 'America/Sao_Paulo'");
    expect(c).toContain("'valor_total', (select coalesce(sum(nullif(b.valor_estimado, 0)), 0) from base b)");
    for (const k of ['total', 'novas', 'prazo_proximo', 'com_valor', 'novos', 'encerrando', 'orgaos', 'cidades']) expect(c).toContain(`'${k}', `);
  });
  it('gravar_salvo: trava por conta, edital existe ao criar, limite fora dos descartados, descartados até 500', () => {
    const c = corpo('create function public.gravar_salvo(');
    expect(c).toContain("perform pg_advisory_xact_lock(hashtextextended('salvos:' || p_user::text, 0));");
    expect(c).toContain("return 'sem_edital';");
    expect(c).toContain("if p_status <> 'descartado' and (v_atual is null or v_atual = 'descartado') then");
    expect(c).toContain("s.status <> 'descartado';");
    expect(c).toContain('if v_usados >= 500 then');
    expect(c).toContain('on conflict (user_id, contratacao_id) do update set status = excluded.status, atualizado_em = now();');
  });
  it('alertas_para_envio: só ativos, e-mail atual e plano da conta na hora', () => {
    const c = corpo('create function public.alertas_para_envio(');
    expect(c).toContain("security definer set search_path = ''");
    expect(c).toContain('public.plano_da_conta(a.user_id)');
    expect(c).toContain('where a.ativo and u.email is not null');
  });
  it('editais do alerta: a mesma busca do radar, janela, sem repetir e sem descartados', () => {
    const c = corpo('create function public.editais_do_alerta(');
    const lista = corpo('create function public.buscar_editais(');
    const lateral = 'cross join lateral public.acertos_busca(u.busca, u.itens_palavras, v_termos, v_tqs, v_frases, v_digitados, v_relacionados) a';
    expect(c).toContain(lateral);
    expect(lista).toContain(lateral);
    expect(c).toContain('from public.abertas_unicas(v_tq, v_tq_excluir, p_ufs, p_valor_min, p_modalidades, null, null, null, null, p_ibges, p_valor_max, p_so_me_epp) u');
    expect(c).toContain('where greatest(u.sincronizada_em, u.atualizada_pncp_em) > p_desde');
    expect(c).toContain('not exists (select 1 from public.alertas_enviados e where e.alerta_id = p_alerta and e.contratacao_id = u.id)');
    expect(c).toContain("s.status = 'descartado')");
    expect(c).toContain('order by a.pontuacao desc, u.encerramento_em, u.id');
    expect(c).toContain('limit least(greatest(coalesce(p_limite, 20), 1), 50);');
  });
  it('registrar envio: histórico sempre; alertas_enviados e janela só quando enviado', () => {
    const c = corpo('create function public.registrar_envio_alerta(');
    expect(c).toContain('insert into public.envios_alerta');
    expect(c).toContain("if p_status = 'enviado' then");
    expect(c.indexOf("if p_status = 'enviado' then")).toBeLessThan(c.indexOf('insert into public.alertas_enviados'));
    expect(c).toContain('on conflict do nothing;');
    expect(c).toContain('set ultimo_envio_em = case when p_avancar then p_selecionado_em');
  });
  it('retenção: salvos seguram a contratação, descartados saem com ela, mantém o da 0015', () => {
    const c = corpo('create or replace function public.aplicar_retencao(');
    for (const l of [
      "delete from public.uso_diario where dia < (now() at time zone 'America/Sao_Paulo')::date;",
      "delete from public.checkouts where criado_em < now() - interval '30 days';",
      "delete from public.cakto_eventos where recebido_em < now() - interval '180 days';",
      "delete from public.envios_alerta where iniciado_em < now() - interval '180 days';",
      "delete from public.envios_resumo where iniciado_em < now() - interval '180 days';",
      "where s.contratacao_id = c.id and s.status = 'descartado'",
      'and not exists (select 1 from public.salvos s where s.contratacao_id = c.id)',
    ]) {
      expect(c).toContain(l);
    }
    expect(c.indexOf("s.status = 'descartado'")).toBeLessThan(c.indexOf('with apagadas as'));
    expect(c.trimEnd().endsWith('select count(*) from apagadas\n$$;')).toBe(true);
  });
  it('eventos: os 12 de antes (0014 + assinou) e os 5 da fase', () => {
    const tipos = (texto: string) => {
      const trecho = texto.slice(texto.indexOf('add constraint eventos_tipo_check'));
      return [...trecho.slice(0, trecho.indexOf(';')).matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    };
    const depois = tipos(sql);
    for (const t of [...tipos(s14), 'assinou', ...TIPOS_EVENTO, ...TIPOS_EVENTO_SERVIDOR, ...TIPOS_EVENTO_CONTA, ...TIPOS_EVENTO_OPORTUNIDADES]) {
      expect(depois).toContain(t);
    }
    expect(depois).toHaveLength(17);
  });
  it('só o servidor executa (cada assinatura)', () => {
    for (const f of [
      'plano_da_conta(uuid)',
      'gravar_salvo(uuid, text, text, int)',
      'salvos_da_conta(uuid)',
      'alertas_para_envio()',
      'editais_do_alerta(uuid, timestamptz, text[], text[], text[], text[], text[], numeric, numeric, int[], boolean, int)',
      'registrar_envio_alerta(uuid, text, int, int, text, text, text[], timestamptz, boolean)',
      'contas_para_resumo()',
      'resumo_do_radar(uuid, text[], text[], text[], text[], text[], numeric, numeric, int[], boolean)',
      'parar_resumo_semanal(uuid)',
      'buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text, text[], numeric, boolean, text[])',
      'radar_contagens(text[], text[], text[], text[], text[], numeric, numeric, int[], boolean, timestamptz, text[])',
      'aplicar_retencao()',
    ]) {
      expect(sql).toContain(`revoke execute on function public.${f} from public, anon, authenticated;`);
      expect(sql).toContain(`grant execute on function public.${f} to service_role;`);
    }
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run scripts/migracoes.test.ts`
Expected: FAIL (`ENOENT … 0016_oportunidades_alertas.sql`).

- [ ] **Step 4: Escrever a migração**

Crie `supabase/migrations/0016_oportunidades_alertas.sql` com exatamente este conteúdo. Os corpos de `buscar_editais` e `radar_contagens` são os da 0014 (linhas 105–173 e 177–193 de `0014_conta_radar.sql`) com só o parâmetro `p_sem_ids` e as linhas `where p_sem_ids …` a mais; a guarda do Step 2 compara caractere a caractere (se falhar, comparar com a 0014 com um `diff`; corrigir a 0016, nunca a guarda nem a 0014).

```sql
-- Edital Map · Evolução · Fase 4 · Minhas Oportunidades e alertas reais (0016).
-- 1. salvos: status pessoal (salvo | analise | participar | descartado), observação (até 500), atualizado_em; sai a
--    chave estrangeira para contratacoes (a retenção não apaga contratação salva; a lista mostra "indisponível" se faltar).
-- 2. alertas (vários por conta, mesmos filtros do radar), alertas_enviados por alerta (chave dupla: nunca o mesmo
--    edital duas vezes no mesmo alerta) e envios_alerta (histórico de cada tentativa).
-- 3. Funções só do servidor: plano_da_conta (gratis | pro: perfis.plano manual ou assinatura válida com o e-mail da
--    conta; o Basic, descontinuado, vale como Pro), gravar_salvo (limite por plano numa transação), salvos_da_conta,
--    alertas_para_envio, editais_do_alerta, registrar_envio_alerta. buscar_editais e radar_contagens ganham p_sem_ids
--    (descartados somem do Meu Radar); corpos iguais aos da 0014 fora isso (guarda em scripts/migracoes.test.ts).
-- 4. Resumo semanal do Pro (segunda às 7h): perfis.resumo_semanal, envios_resumo, contas_para_resumo, resumo_do_radar
--    e parar_resumo_semanal (link do e-mail).
-- 5. Retenção: não apaga contratação salva (descartada sai junto com ela); limpa alertas_enviados órfãos e históricos
--    com mais de 180 dias. Mantém o que a 0015 (pagamento) acrescentou.
-- 6. Eventos: os 12 de antes (0014 + assinou da 0015) + edital_salvo, edital_descartado, alerta_criado, alerta_enviado,
--    resumo_enviado.
-- Pré-requisito: 0015 aplicada (assinaturas, checkouts, cakto_eventos). Ordem: esta migração → conferências
-- (docs/evolucao-fase-4.sql) → vercel deploy --prod → workflow alertas.yml no main. Aplicar com npm run db:aplicar.

set local lock_timeout = '10s';

-- 1. Salvos (a tabela da 0001 está vazia; sem a chave estrangeira, a retenção decide o que fica)
alter table public.salvos drop constraint salvos_contratacao_id_fkey;
alter table public.salvos
  add column status text not null default 'salvo',
  add column observacao text,
  add column atualizado_em timestamptz not null default now();
alter table public.salvos
  add constraint salvos_status_check check (status in ('salvo', 'analise', 'participar', 'descartado')),
  add constraint salvos_observacao_check check (observacao is null or char_length(observacao) <= 500);
create index salvos_user_status_idx on public.salvos (user_id, status);
create index salvos_contratacao_idx on public.salvos (contratacao_id);

-- 2. Alertas. alertas_enviados (0001) era por radar e nunca foi usada: sai e volta por alerta.
do $$
begin
  if exists (select 1 from public.alertas_enviados) then
    raise exception 'alertas_enviados tem linhas; esperado vazio antes da 0016';
  end if;
end $$;
drop table public.alertas_enviados;

create table public.alertas (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  nome            text not null,
  termos          text[] not null,
  termos_excluir  text[] not null default '{}',
  ufs             text[] not null default '{}',
  municipios      text[] not null default '{}',
  valor_min       numeric(16,2),
  valor_max       numeric(16,2),
  modalidades     int[] not null default '{}',
  so_me_epp       boolean not null default false,
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  ultimo_envio_em timestamptz,
  constraint alertas_nome_check check (char_length(nome) between 1 and 60),
  constraint alertas_termos_check check (cardinality(termos) between 1 and 10),
  constraint alertas_excluir_check check (cardinality(termos_excluir) <= 10),
  constraint alertas_ufs_check check (cardinality(ufs) <= 27),
  constraint alertas_municipios_check check (cardinality(municipios) <= 50),
  constraint alertas_local_check check (cardinality(ufs) = 0 or cardinality(municipios) = 0),
  constraint alertas_valor_check check ((valor_min is null or valor_min >= 0) and (valor_max is null or valor_max > 0)),
  constraint alertas_faixa_check check (valor_min is null or valor_max is null or valor_min <= valor_max)
);
create index alertas_user_id_idx on public.alertas (user_id);

-- A chave primária (alerta_id, contratacao_id) é o índice por alerta e a garantia de não repetir.
create table public.alertas_enviados (
  alerta_id       uuid not null references public.alertas(id) on delete cascade,
  contratacao_id  text not null,
  enviado_em      timestamptz not null default now(),
  primary key (alerta_id, contratacao_id)
);

create table public.envios_alerta (
  id           uuid primary key default gen_random_uuid(),
  alerta_id    uuid not null references public.alertas(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  iniciado_em  timestamptz not null default now(),
  status       text not null check (status in ('enviado', 'sem_novidades', 'falhou', 'pulado_plano')),
  qtd_editais  int not null default 0,
  tentativas   int not null default 0,
  erro         text check (erro is null or char_length(erro) <= 300),
  id_mensagem  text
);
create index envios_alerta_alerta_idx on public.envios_alerta (alerta_id, iniciado_em desc);

-- Só o servidor lê e grava (service_role); nenhuma política para anon/authenticated.
alter table public.alertas enable row level security;
alter table public.alertas_enviados enable row level security;
alter table public.envios_alerta enable row level security;
revoke all on table public.alertas from public, anon, authenticated;
revoke all on table public.alertas_enviados from public, anon, authenticated;
revoke all on table public.envios_alerta from public, anon, authenticated;
grant select, insert, update, delete on table public.alertas to service_role;
grant select, insert, update, delete on table public.alertas_enviados to service_role;
grant select, insert, update, delete on table public.envios_alerta to service_role;

-- 3. Plano da conta (gratis | pro): perfis.plano (marcação manual) ou uma assinatura válida (0015: não estornada e
-- valido_ate no futuro; cancelada vale até valido_ate) cujo e-mail do comprador é o e-mail da conta. 'basic' (plano
-- descontinuado; linhas antigas) vale como Pro até o fim da validade. O plano do navegador (plano_do_visitante) o site
-- soma por fora. security definer: lê auth.users.
create function public.plano_da_conta(p_user uuid)
returns text language sql stable security definer set search_path = '' as $$
  with planos as (
    select p.plano from public.perfis p where p.id = p_user
    union all
    select a.plano
    from auth.users u
    join public.assinaturas a on a.email = lower(u.email)
    where u.id = p_user and a.status <> 'estornada' and a.valido_ate > now()
  )
  select case when bool_or(plano in ('pro', 'basic')) then 'pro' else 'gratis' end
  from planos
$$;

-- Salvar, mudar status ou descartar (uma transação por conta): edital novo nos salvos precisa existir; entrar em
-- salvo/análise/participar vindo de fora ou de "descartado" respeita p_limite; descartados até 500.
-- Devolve 'ok', 'limite' ou 'sem_edital'.
create function public.gravar_salvo(p_user uuid, p_contratacao text, p_status text, p_limite int)
returns text language plpgsql as $$
declare
  v_atual text;
  v_usados int;
begin
  perform pg_advisory_xact_lock(hashtextextended('salvos:' || p_user::text, 0));
  select s.status into v_atual from public.salvos s where s.user_id = p_user and s.contratacao_id = p_contratacao;
  if v_atual is null and not exists (select 1 from public.contratacoes c where c.id = p_contratacao) then
    return 'sem_edital';
  end if;
  if p_status <> 'descartado' and (v_atual is null or v_atual = 'descartado') then
    select count(*) into v_usados from public.salvos s where s.user_id = p_user and s.status <> 'descartado';
    if v_usados >= coalesce(p_limite, 0) then
      return 'limite';
    end if;
  elsif p_status = 'descartado' and v_atual is distinct from 'descartado' then
    select count(*) into v_usados from public.salvos s where s.user_id = p_user and s.status = 'descartado';
    if v_usados >= 500 then
      return 'limite';
    end if;
  end if;
  insert into public.salvos (user_id, contratacao_id, status) values (p_user, p_contratacao, p_status)
  on conflict (user_id, contratacao_id) do update set status = excluded.status, atualizado_em = now();
  return 'ok';
end $$;

-- Minhas Oportunidades: salvos da conta com os dados do edital (nulos se a contratação não existir mais).
create function public.salvos_da_conta(p_user uuid)
returns table (contratacao_id text, status text, observacao text, criado_em timestamptz, atualizado_em timestamptz,
               slug text, objeto text, orgao_nome text, municipio_nome text, uf text, valor_estimado numeric,
               encerramento_em timestamptz, situacao_id int)
language sql stable as $$
  select s.contratacao_id, s.status, s.observacao, s.criado_em, s.atualizado_em,
         c.slug, c.objeto, c.orgao_nome, c.municipio_nome, c.uf, c.valor_estimado, c.encerramento_em, c.situacao_id
  from public.salvos s
  left join public.contratacoes c on c.id = s.contratacao_id
  where s.user_id = p_user
  order by s.criado_em desc
  limit 1000
$$;

-- Envio diário: alertas ativos com o e-mail atual da conta e o plano da conta na hora (perfis.plano + assinatura).
create function public.alertas_para_envio()
returns table (alerta_id uuid, user_id uuid, email text, plano text, nome text, termos text[], termos_excluir text[],
               ufs text[], municipios text[], valor_min numeric, valor_max numeric, modalidades int[], so_me_epp boolean,
               ultimo_envio_em timestamptz, criado_em timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id, a.user_id, lower(u.email), public.plano_da_conta(a.user_id), a.nome, a.termos, a.termos_excluir,
         a.ufs, a.municipios, a.valor_min, a.valor_max, a.modalidades, a.so_me_epp, a.ultimo_envio_em, a.criado_em
  from public.alertas a
  join auth.users u on u.id = a.user_id
  where a.ativo and u.email is not null
  order by a.user_id, a.criado_em, a.id
$$;

-- Editais de um alerta: a mesma busca do radar (abertas_unicas + acertos_busca, ordem por relevância), só os que
-- entraram no espelho (sincronizada_em) ou mudaram no PNCP (atualizada_pncp_em) depois de p_desde, sem os já enviados
-- para este alerta e sem os que a conta descartou. total = quantos casam (antes do limite).
create function public.editais_do_alerta(
  p_alerta uuid, p_desde timestamptz,
  p_termos text[], p_relacionados text[] default null, p_excluir text[] default null,
  p_ufs text[] default null, p_ibges text[] default null, p_valor_min numeric default null,
  p_valor_max numeric default null, p_modalidades int[] default null, p_so_me_epp boolean default null,
  p_limite int default 20)
returns table (id text, slug text, objeto text, orgao_nome text, municipio_nome text, uf text, valor_estimado numeric,
               encerramento_em timestamptz, situacao_id int, pontuacao int, total bigint)
language plpgsql stable set plan_cache_mode = force_custom_plan as $$
#variable_conflict use_column
declare
  v_digitados text[] := public.termos_da_busca(null, p_termos);
  v_relacionados text[] := coalesce(p_relacionados, '{}'::text[]);
  v_termos text[] := v_digitados || v_relacionados;
  v_tq tsquery := public.consulta_termos(v_digitados || v_relacionados);
  v_tq_excluir tsquery := public.consulta_termos(p_excluir);
  v_tqs tsquery[];
  v_frases tsquery[];
  v_user uuid;
begin
  select a.user_id into v_user from public.alertas a where a.id = p_alerta;
  if v_user is null or v_tq is null then
    return;
  end if;
  select array_agg(public.consulta(t.termo) order by t.n),
         array_agg(case when t.n <= cardinality(v_digitados) then public.consulta_frase(t.termo) end order by t.n)
    into v_tqs, v_frases
    from unnest(v_termos) with ordinality as t(termo, n);
  return query
    select u.id, u.slug, u.objeto, u.orgao_nome, u.municipio_nome, u.uf, u.valor_estimado, u.encerramento_em,
           u.situacao_id, a.pontuacao, count(*) over ()
    from public.abertas_unicas(v_tq, v_tq_excluir, p_ufs, p_valor_min, p_modalidades, null, null, null, null, p_ibges, p_valor_max, p_so_me_epp) u
    cross join lateral public.acertos_busca(u.busca, u.itens_palavras, v_termos, v_tqs, v_frases, v_digitados, v_relacionados) a
    where greatest(u.sincronizada_em, u.atualizada_pncp_em) > p_desde
      and not exists (select 1 from public.alertas_enviados e where e.alerta_id = p_alerta and e.contratacao_id = u.id)
      and not exists (select 1 from public.salvos s where s.user_id = v_user and s.contratacao_id = u.id and s.status = 'descartado')
    order by a.pontuacao desc, u.encerramento_em, u.id
    limit least(greatest(coalesce(p_limite, 20), 1), 50);
end $$;

-- Resultado de um alerta numa rodada (uma transação): histórico; se enviado, os editais entram em alertas_enviados
-- (só depois do aceite do Resend) e a janela avança para p_selecionado_em, a não ser que tenham ficado editais de fora
-- (p_avancar falso: ficam para o próximo e-mail). Alerta excluído no meio da rodada: nada a gravar (null).
create function public.registrar_envio_alerta(
  p_alerta uuid, p_status text, p_qtd int, p_tentativas int, p_erro text default null,
  p_id_mensagem text default null, p_ids text[] default null,
  p_selecionado_em timestamptz default now(), p_avancar boolean default true)
returns uuid language plpgsql as $$
declare
  v_user uuid;
  v_id uuid;
begin
  select a.user_id into v_user from public.alertas a where a.id = p_alerta;
  if v_user is null then
    return null;
  end if;
  insert into public.envios_alerta (alerta_id, user_id, iniciado_em, status, qtd_editais, tentativas, erro, id_mensagem)
  values (p_alerta, v_user, p_selecionado_em, p_status, coalesce(p_qtd, 0), coalesce(p_tentativas, 0), left(p_erro, 300), p_id_mensagem)
  returning id into v_id;
  if p_status = 'enviado' then
    insert into public.alertas_enviados (alerta_id, contratacao_id)
    select p_alerta, x.id from unnest(coalesce(p_ids, '{}'::text[])) as x(id)
    on conflict do nothing;
    update public.alertas
       set ultimo_envio_em = case when p_avancar then p_selecionado_em
                                  else coalesce(ultimo_envio_em, p_selecionado_em - interval '24 hours') end
     where id = p_alerta;
  end if;
  return v_id;
end $$;

-- 4. Resumo semanal do Pro: preferência na conta (ligado por padrão; o link do e-mail desliga), histórico por conta.
alter table public.perfis add column resumo_semanal boolean not null default true;

create table public.envios_resumo (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  iniciado_em  timestamptz not null default now(),
  status       text not null check (status in ('enviado', 'sem_novidades', 'falhou')),
  qtd_editais  int not null default 0,
  tentativas   int not null default 0,
  erro         text check (erro is null or char_length(erro) <= 300),
  id_mensagem  text
);
create index envios_resumo_user_idx on public.envios_resumo (user_id, iniciado_em desc);
alter table public.envios_resumo enable row level security;
revoke all on table public.envios_resumo from public, anon, authenticated;
grant select, insert, update, delete on table public.envios_resumo to service_role;

-- Contas que recebem o resumo: plano da conta Pro, com radar, resumo ligado e sem resumo enviado nos últimos 6 dias
-- (rodar de novo na mesma semana não repete).
create function public.contas_para_resumo()
returns table (user_id uuid, email text, termos text[], termos_excluir text[], ufs text[], municipios text[],
               valor_min numeric, valor_max numeric, modalidades int[], so_me_epp boolean)
language sql stable security definer set search_path = '' as $$
  select r.user_id, lower(u.email), r.termos, r.termos_excluir, r.ufs, r.municipios, r.valor_min, r.valor_max,
         r.modalidades, r.so_me_epp
  from public.radares r
  join public.perfis p on p.id = r.user_id
  join auth.users u on u.id = r.user_id
  where p.resumo_semanal and u.email is not null and public.plano_da_conta(r.user_id) = 'pro'
    and not exists (select 1 from public.envios_resumo e
                    where e.user_id = r.user_id and e.status = 'enviado' and e.iniciado_em > now() - interval '6 days')
  order by r.user_id
$$;

-- O resumo de uma conta numa passada, sobre as mesmas abertas do Meu Radar (sem os descartados da conta): novas da
-- semana (publicação nos últimos 7 dias, a regra de "Novas" do radar), as que encerram até o fim do dia de hoje + 7,
-- total aberto, valor somado (só os com valor informado), os 10 novos mais relevantes, os 5 que encerram primeiro e os
-- 5 órgãos e 5 cidades com mais editais abertos no radar. Sem termo válido: null.
create function public.resumo_do_radar(
  p_user uuid, p_termos text[], p_relacionados text[] default null, p_excluir text[] default null,
  p_ufs text[] default null, p_ibges text[] default null, p_valor_min numeric default null,
  p_valor_max numeric default null, p_modalidades int[] default null, p_so_me_epp boolean default null)
returns jsonb language plpgsql stable set plan_cache_mode = force_custom_plan as $$
declare
  v_digitados text[] := public.termos_da_busca(null, p_termos);
  v_relacionados text[] := coalesce(p_relacionados, '{}'::text[]);
  v_termos text[] := v_digitados || v_relacionados;
  v_tq tsquery := public.consulta_termos(v_digitados || v_relacionados);
  v_tq_excluir tsquery := public.consulta_termos(p_excluir);
  v_tqs tsquery[];
  v_frases tsquery[];
  v_semana timestamptz := now() - interval '7 days';
  v_prazo timestamptz := (date_trunc('day', now() at time zone 'America/Sao_Paulo') + make_interval(days => 7 + 1)) at time zone 'America/Sao_Paulo';
  v_resumo jsonb;
begin
  if v_tq is null then
    return null;
  end if;
  select array_agg(public.consulta(t.termo) order by t.n),
         array_agg(case when t.n <= cardinality(v_digitados) then public.consulta_frase(t.termo) end order by t.n)
    into v_tqs, v_frases
    from unnest(v_termos) with ordinality as t(termo, n);
  with base as materialized (
    select u.id, u.slug, u.objeto, u.orgao_nome, u.cnpj, u.municipio_nome, u.uf, u.valor_estimado, u.encerramento_em,
           u.publicada_em, u.situacao_id, a.pontuacao
    from public.abertas_unicas(v_tq, v_tq_excluir, p_ufs, p_valor_min, p_modalidades, null, null, null, null, p_ibges, p_valor_max, p_so_me_epp) u
    cross join lateral public.acertos_busca(u.busca, u.itens_palavras, v_termos, v_tqs, v_frases, v_digitados, v_relacionados) a
    where not exists (select 1 from public.salvos s where s.user_id = p_user and s.contratacao_id = u.id and s.status = 'descartado')
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'novas', (select count(*) from base b where b.publicada_em > v_semana),
    'prazo_proximo', (select count(*) from base b where b.encerramento_em < v_prazo),
    'valor_total', (select coalesce(sum(nullif(b.valor_estimado, 0)), 0) from base b),
    'com_valor', (select count(*) from base b where b.valor_estimado > 0),
    'novos', coalesce((select jsonb_agg(to_jsonb(x) order by x.pontuacao desc, x.encerramento_em, x.id) from (
        select b.id, b.slug, b.objeto, b.orgao_nome, b.municipio_nome, b.uf, b.valor_estimado, b.encerramento_em, b.situacao_id, b.pontuacao
        from base b where b.publicada_em > v_semana order by b.pontuacao desc, b.encerramento_em, b.id limit 10) x), '[]'::jsonb),
    'encerrando', coalesce((select jsonb_agg(to_jsonb(x) order by x.encerramento_em, x.id) from (
        select b.id, b.slug, b.objeto, b.orgao_nome, b.municipio_nome, b.uf, b.valor_estimado, b.encerramento_em, b.situacao_id, b.pontuacao
        from base b where b.encerramento_em < v_prazo order by b.encerramento_em, b.id limit 5) x), '[]'::jsonb),
    'orgaos', coalesce((select jsonb_agg(to_jsonb(x) order by x.qtd desc, x.nome) from (
        select b.orgao_nome as nome, b.uf, count(*) as qtd, coalesce(sum(nullif(b.valor_estimado, 0)), 0) as valor
        from base b group by b.cnpj, b.orgao_nome, b.uf order by count(*) desc, b.orgao_nome limit 5) x), '[]'::jsonb),
    'cidades', coalesce((select jsonb_agg(to_jsonb(x) order by x.qtd desc, x.nome) from (
        select b.municipio_nome as nome, b.uf, count(*) as qtd
        from base b where b.municipio_nome is not null group by b.municipio_nome, b.uf order by count(*) desc, b.municipio_nome limit 5) x), '[]'::jsonb)
  ) into v_resumo;
  return v_resumo;
end $$;

-- Link "Parar o resumo semanal" (sem login; o site só chama com o id de um token assinado). true = havia perfil.
create function public.parar_resumo_semanal(p_user uuid)
returns boolean language sql as $$
  update public.perfis set resumo_semanal = false where id = p_user returning true
$$;

-- Descartados somem do Meu Radar: buscar_editais e radar_contagens ganham p_sem_ids (assinaturas antigas saem antes).
drop function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text, text[], numeric, boolean);
drop function public.radar_contagens(text[], text[], text[], text[], text[], numeric, numeric, int[], boolean, timestamptz);

-- Lista (0014 + p_sem_ids: os descartados da conta ficam de fora antes do total e da página).
create function public.buscar_editais(
  q text default null, p_ufs text[] default null, p_ibge text default null, p_dias int default null,
  p_valor_min numeric default null, p_modalidades int[] default null,
  p_limite int default 50, p_deslocamento int default 0,
  p_orgao text default null, p_raio_km int default null,
  p_termos text[] default null, p_relacionados text[] default null, p_excluir text[] default null,
  p_ordem text default null,
  p_ibges text[] default null, p_valor_max numeric default null, p_so_me_epp boolean default null,
  p_sem_ids text[] default null)
returns table (id text, slug text, objeto text, orgao_nome text, unidade_nome text, municipio_nome text, uf text,
               codigo_ibge text, valor_estimado numeric, encerramento_em timestamptz, publicada_em timestamptz,
               modalidade_nome text, srp boolean, link_origem text, onde text, total bigint,
               situacao_id int, pontuacao int, termos_objeto text[], termos_itens text[], frase boolean)
language plpgsql stable set plan_cache_mode = force_custom_plan as $$
#variable_conflict use_column
declare
  v_digitados text[] := public.termos_da_busca(q, p_termos);
  v_relacionados text[] := coalesce(p_relacionados, '{}'::text[]);
  v_termos text[] := v_digitados || v_relacionados;
  v_tq tsquery := public.consulta_termos(v_digitados || v_relacionados);
  v_tq_excluir tsquery := public.consulta_termos(p_excluir);
  v_tqs tsquery[];
  v_frases tsquery[];
  v_ordem text := case when p_ordem in ('relevancia', 'recentes', 'prazo', 'maior_valor', 'menor_valor') then p_ordem end;
begin
  -- Uma consulta de texto por termo, montada uma vez (a frase só para os digitados).
  select array_agg(public.consulta(t.termo) order by t.n),
         array_agg(case when t.n <= cardinality(v_digitados) then public.consulta_frase(t.termo) end order by t.n)
    into v_tqs, v_frases
    from unnest(v_termos) with ordinality as t(termo, n);
  if v_tq is null then
    v_ordem := case when v_ordem is null or v_ordem = 'relevancia' then 'prazo' else v_ordem end;
  elsif v_ordem is null then
    v_ordem := 'relevancia';
  end if;

  if v_ordem = 'relevancia' then
    return query
      select u.id, u.slug, u.objeto, u.orgao_nome, u.unidade_nome, u.municipio_nome, u.uf, u.codigo_ibge,
             u.valor_estimado, u.encerramento_em, u.publicada_em, u.modalidade_nome, u.srp, u.link_origem,
             case when cardinality(a.termos_objeto) > 0 then 'objeto' else 'itens' end,
             count(*) over (), u.situacao_id, a.pontuacao, a.termos_objeto, a.termos_itens, a.frase
      from public.abertas_unicas(v_tq, v_tq_excluir, p_ufs, p_valor_min, p_modalidades, p_orgao, p_ibge, p_raio_km, p_dias, p_ibges, p_valor_max, p_so_me_epp) u
      cross join lateral public.acertos_busca(u.busca, u.itens_palavras, v_termos, v_tqs, v_frases, v_digitados, v_relacionados) a
      where p_sem_ids is null or u.id <> all(p_sem_ids)
      order by a.pontuacao desc, u.encerramento_em, u.id
      limit p_limite offset p_deslocamento;
  else
    return query
      with pagina as (
        select u.*, count(*) over () as total_da_busca
        from public.abertas_unicas(v_tq, v_tq_excluir, p_ufs, p_valor_min, p_modalidades, p_orgao, p_ibge, p_raio_km, p_dias, p_ibges, p_valor_max, p_so_me_epp) u
        where p_sem_ids is null or u.id <> all(p_sem_ids)
        order by case when v_ordem = 'recentes' then u.publicada_em end desc nulls last,
                 case when v_ordem = 'maior_valor' then nullif(u.valor_estimado, 0) end desc nulls last,
                 case when v_ordem = 'menor_valor' then nullif(u.valor_estimado, 0) end asc nulls last,
                 u.encerramento_em, u.id
        limit p_limite offset p_deslocamento
      )
      select u.id, u.slug, u.objeto, u.orgao_nome, u.unidade_nome, u.municipio_nome, u.uf, u.codigo_ibge,
             u.valor_estimado, u.encerramento_em, u.publicada_em, u.modalidade_nome, u.srp, u.link_origem,
             case when v_tq is null or cardinality(a.termos_objeto) > 0 then 'objeto' else 'itens' end,
             u.total_da_busca, u.situacao_id, case when v_tq is not null then a.pontuacao end,
             a.termos_objeto, a.termos_itens, a.frase
      from pagina u
      cross join lateral public.acertos_busca(u.busca, u.itens_palavras, v_termos, v_tqs, v_frases, v_digitados, v_relacionados) a
      order by case when v_ordem = 'recentes' then u.publicada_em end desc nulls last,
               case when v_ordem = 'maior_valor' then nullif(u.valor_estimado, 0) end desc nulls last,
               case when v_ordem = 'menor_valor' then nullif(u.valor_estimado, 0) end asc nulls last,
               u.encerramento_em, u.id;
  end if;
end $$;

-- Cartões do Meu Radar (0014 + p_sem_ids).
create function public.radar_contagens(
  p_termos text[], p_relacionados text[] default null, p_excluir text[] default null,
  p_ufs text[] default null, p_ibges text[] default null, p_valor_min numeric default null,
  p_valor_max numeric default null, p_modalidades int[] default null, p_so_me_epp boolean default null,
  p_desde timestamptz default null, p_sem_ids text[] default null)
returns table (total bigint, novas bigint, prazo_proximo bigint)
language sql stable as $$
  with t as materialized (
    select public.consulta_termos(coalesce(p_termos, '{}'::text[]) || coalesce(p_relacionados, '{}'::text[])) as tq,
           public.consulta_termos(p_excluir) as tq_excluir
  )
  select count(*),
         count(*) filter (where p_desde is not null and u.publicada_em > p_desde),
         count(*) filter (where u.encerramento_em < (date_trunc('day', now() at time zone 'America/Sao_Paulo') + make_interval(days => 7 + 1)) at time zone 'America/Sao_Paulo')
  from t
  cross join lateral public.abertas_unicas(t.tq, t.tq_excluir, p_ufs, p_valor_min, p_modalidades, null, null, null, null, p_ibges, p_valor_max, p_so_me_epp) u
  where p_sem_ids is null or u.id <> all(p_sem_ids)
$$;

-- 5. Retenção (0006/0009/0015): contratação salva fica (descartada sai junto com ela); alertas_enviados de
-- contratações que já saíram e históricos de envio com mais de 180 dias também saem. Devolve quantas contratações apagou.
create or replace function public.aplicar_retencao()
returns bigint language sql as $$
  delete from public.uso_diario where dia < (now() at time zone 'America/Sao_Paulo')::date;
  delete from public.checkouts where criado_em < now() - interval '30 days';
  delete from public.cakto_eventos where recebido_em < now() - interval '180 days';
  delete from public.envios_alerta where iniciado_em < now() - interval '180 days';
  delete from public.envios_resumo where iniciado_em < now() - interval '180 days';
  delete from public.alertas_enviados e where not exists (select 1 from public.contratacoes c where c.id = e.contratacao_id);
  delete from public.salvos s using public.contratacoes c
   where s.contratacao_id = c.id and s.status = 'descartado'
     and (c.encerramento_em is null or c.encerramento_em < now() - interval '7 days');
  with apagadas as (
    delete from public.contratacoes c
    where (c.encerramento_em is null or c.encerramento_em < now() - interval '7 days')
      and not exists (select 1 from public.salvos s where s.contratacao_id = c.id)
    returning 1
  )
  select count(*) from apagadas
$$;

-- 6. Eventos (sem e-mail no detalhe), gravados só pelo servidor e pelo job dos alertas.
alter table public.eventos drop constraint eventos_tipo_check;
alter table public.eventos add constraint eventos_tipo_check
  check (tipo in ('busca', 'abriu_edital', 'clicou_edital_oficial', 'pediu_alerta', 'quer_recurso', 'usou_recurso',
                  'limite_atingido', 'conta_entrou', 'onboarding_iniciado', 'onboarding_concluido', 'radar_visto', 'assinou',
                  'edital_salvo', 'edital_descartado', 'alerta_criado', 'alerta_enviado', 'resumo_enviado'));

-- Só o servidor (service_role) executa.
revoke execute on function public.plano_da_conta(uuid) from public, anon, authenticated;
revoke execute on function public.gravar_salvo(uuid, text, text, int) from public, anon, authenticated;
revoke execute on function public.salvos_da_conta(uuid) from public, anon, authenticated;
revoke execute on function public.alertas_para_envio() from public, anon, authenticated;
revoke execute on function public.editais_do_alerta(uuid, timestamptz, text[], text[], text[], text[], text[], numeric, numeric, int[], boolean, int) from public, anon, authenticated;
revoke execute on function public.registrar_envio_alerta(uuid, text, int, int, text, text, text[], timestamptz, boolean) from public, anon, authenticated;
revoke execute on function public.contas_para_resumo() from public, anon, authenticated;
revoke execute on function public.resumo_do_radar(uuid, text[], text[], text[], text[], text[], numeric, numeric, int[], boolean) from public, anon, authenticated;
revoke execute on function public.parar_resumo_semanal(uuid) from public, anon, authenticated;
revoke execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text, text[], numeric, boolean, text[]) from public, anon, authenticated;
revoke execute on function public.radar_contagens(text[], text[], text[], text[], text[], numeric, numeric, int[], boolean, timestamptz, text[]) from public, anon, authenticated;
revoke execute on function public.aplicar_retencao() from public, anon, authenticated;
grant execute on function public.plano_da_conta(uuid) to service_role;
grant execute on function public.gravar_salvo(uuid, text, text, int) to service_role;
grant execute on function public.salvos_da_conta(uuid) to service_role;
grant execute on function public.alertas_para_envio() to service_role;
grant execute on function public.editais_do_alerta(uuid, timestamptz, text[], text[], text[], text[], text[], numeric, numeric, int[], boolean, int) to service_role;
grant execute on function public.registrar_envio_alerta(uuid, text, int, int, text, text, text[], timestamptz, boolean) to service_role;
grant execute on function public.contas_para_resumo() to service_role;
grant execute on function public.resumo_do_radar(uuid, text[], text[], text[], text[], text[], numeric, numeric, int[], boolean) to service_role;
grant execute on function public.parar_resumo_semanal(uuid) to service_role;
grant execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text, text[], numeric, boolean, text[]) to service_role;
grant execute on function public.radar_contagens(text[], text[], text[], text[], text[], numeric, numeric, int[], boolean, timestamptz, text[]) to service_role;
grant execute on function public.aplicar_retencao() to service_role;

-- O PostgREST relê as funções no commit.
notify pgrst, 'reload schema';
```

- [ ] **Step 5: Conferências do controlador**

Crie `docs/evolucao-fase-4.sql` (o controlador roda na Task 2 e na Task 14; `<e-mail do dono>` é o e-mail com que o dono entrou na Fase 3, [C10] de `docs/evolucao-fase-3.sql`):
```sql
-- Edital Map · Evolução · Fase 4 · conferências da 0016 (controlador). Rodar uma seção por vez, conferindo o "Esperado".
-- Seções com begin/rollback não deixam nada gravado.

-- ── [D0] Antes de aplicar. Esperado: salvos_contratacao_id_fkey na lista; salvos 0 e alertas_enviados 0; tem_0015 true;
-- a restrição de eventos com os 12 tipos (inclui 'assinou'); anotar o total de "uniforme".
select conname from pg_constraint where conrelid = 'public.salvos'::regclass and contype = 'f';
select (select count(*) from public.salvos) as salvos, (select count(*) from public.alertas_enviados) as alertas_enviados;
select to_regclass('public.assinaturas') is not null as tem_0015;
select pg_get_constraintdef(oid) from pg_constraint where conname = 'eventos_tipo_check';
select max(total) as uniforme from public.buscar_editais(p_termos => array['uniforme'], p_limite => 1);

-- ── [D1] Permissões. Esperado: nas 5 tabelas só service_role; RLS true; uma linha por função (uma assinatura),
-- anon e authenticated false, service_role true; prosecdef true só em plano_da_conta, alertas_para_envio e contas_para_resumo.
select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) as privilegios
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('salvos', 'alertas', 'alertas_enviados', 'envios_alerta', 'envios_resumo')
  and grantee in ('anon', 'authenticated', 'service_role')
group by 1, 2 order by 1, 2;
select relname, relrowsecurity from pg_class
where relnamespace = 'public'::regnamespace and relname in ('salvos', 'alertas', 'alertas_enviados', 'envios_alerta', 'envios_resumo');
select p.proname, pg_get_function_identity_arguments(p.oid) as args,
       has_function_privilege('anon', p.oid, 'execute') as anon,
       has_function_privilege('authenticated', p.oid, 'execute') as autenticado,
       has_function_privilege('service_role', p.oid, 'execute') as servico, p.prosecdef
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('plano_da_conta', 'gravar_salvo', 'salvos_da_conta', 'alertas_para_envio', 'editais_do_alerta',
                    'registrar_envio_alerta', 'buscar_editais', 'radar_contagens', 'aplicar_retencao',
                    'contas_para_resumo', 'resumo_do_radar', 'parar_resumo_semanal')
order by 1;

-- ── [D2] Chamadas antigas seguem valendo (site no ar ainda é o antigo). Esperado: o mesmo total de [D0];
-- radar_contagens sem p_sem_ids responde.
select max(total) as uniforme from public.buscar_editais(p_termos => array['uniforme'], p_limite => 1);
select * from public.radar_contagens(p_termos => array['uniforme'], p_ufs => array['SC'], p_desde => now() - interval '1 day');
with uma as (select id from public.buscar_editais(p_termos => array['uniforme'], p_ufs => array['SC'], p_limite => 1))
select (select max(total) from public.buscar_editais(p_termos => array['uniforme'], p_ufs => array['SC'], p_limite => 1))
     - (select max(total) from public.buscar_editais(p_termos => array['uniforme'], p_ufs => array['SC'], p_limite => 1,
                                                     p_sem_ids => array(select id from uma))) as menos_um;  -- Esperado: 1

-- ── [D3] Retenção não apaga salvo; descartado sai com a contratação (transação desfeita).
-- Esperado na última consulta: a linha 'salvo' com contratacao preenchida; a 'descartado' com tudo nulo.
begin;
create temporary table t_alvo on commit drop as
  select id, row_number() over (order by id) as n from public.contratacoes where encerramento_em > now() order by id limit 2;
update public.contratacoes set encerramento_em = now() - interval '8 days' where id in (select id from t_alvo);
insert into public.salvos (user_id, contratacao_id, status)
select (select id from auth.users where email = '<e-mail do dono>'), id, case when n = 1 then 'salvo' else 'descartado' end from t_alvo;
select public.aplicar_retencao() >= 1 as apagou;
select t.n, c.id as contratacao, s.status from t_alvo t
left join public.contratacoes c on c.id = t.id left join public.salvos s on s.contratacao_id = t.id order by t.n;
rollback;

-- ── [D4] gravar_salvo e salvos_da_conta (transação desfeita). Esperado, na ordem: ok, limite, ok, ok, limite, sem_edital;
-- depois n1 'analise' e n2 'descartado'; salvos_da_conta com 2 linhas e slug/objeto preenchidos.
begin;
create temporary table t_e on commit drop as
  select id, row_number() over (order by id) as n from public.contratacoes where encerramento_em > now() order by id limit 2;
create temporary table t_d on commit drop as select id from auth.users where email = '<e-mail do dono>';
select public.gravar_salvo((select id from t_d), (select id from t_e where n = 1), 'salvo', 1);
select public.gravar_salvo((select id from t_d), (select id from t_e where n = 2), 'salvo', 1);
select public.gravar_salvo((select id from t_d), (select id from t_e where n = 2), 'descartado', 1);
select public.gravar_salvo((select id from t_d), (select id from t_e where n = 1), 'analise', 1);
select public.gravar_salvo((select id from t_d), (select id from t_e where n = 2), 'participar', 1);
select public.gravar_salvo((select id from t_d), '00000000000000-1-000000/2000', 'salvo', 10);
select e.n, s.status from public.salvos s join t_e e on e.id = s.contratacao_id where s.user_id = (select id from t_d) order by e.n;
select contratacao_id, status, slug is not null as tem_slug, objeto is not null as tem_objeto from public.salvos_da_conta((select id from t_d));
rollback;

-- ── [D5] Plano da conta. Esperado: dono = pro (depois do Step 6 da Task 2); ninguem = gratis (só gratis e pro existem);
-- assinaturas com o e-mail de alguma conta (pode ser 0 linhas).
select public.plano_da_conta((select id from auth.users where email = '<e-mail do dono>')) as dono,
       public.plano_da_conta('00000000-0000-0000-0000-000000000000') as ninguem;
select a.plano, a.status, a.valido_ate > now() as valida from public.assinaturas a join auth.users u on a.email = lower(u.email);

-- ── [D6] Alerta de ponta a ponta no banco (transação desfeita). Esperado: N1 > 0 na maioria dos dias (anotar);
-- depois de marcar 3 como enviados, N2 = min(N1_total - 3, 20) e nenhum dos 3 volta; alertas_para_envio com 1 linha
-- (e-mail do dono, plano pro); envios_alerta 'enviado' 2 1; alertas_enviados 5; ultimo_envio_em preenchido.
begin;
insert into public.alertas (id, user_id, nome, termos)
values ('11111111-1111-4111-8111-111111111111', (select id from auth.users where email = '<e-mail do dono>'), 'teste', array['uniforme']);
select count(*) as n1, max(total) as n1_total from public.editais_do_alerta('11111111-1111-4111-8111-111111111111', now() - interval '3 days', array['uniforme'], array['fardamento', 'jaleco']);
create temporary table t_env on commit drop as
  select id from public.editais_do_alerta('11111111-1111-4111-8111-111111111111', now() - interval '3 days', array['uniforme'], array['fardamento', 'jaleco']) limit 3;
insert into public.alertas_enviados (alerta_id, contratacao_id) select '11111111-1111-4111-8111-111111111111', id from t_env;
select count(*) as n2, count(*) filter (where id in (select id from t_env)) as repetidos
from public.editais_do_alerta('11111111-1111-4111-8111-111111111111', now() - interval '3 days', array['uniforme'], array['fardamento', 'jaleco']);
select alerta_id, email, plano, nome from public.alertas_para_envio();
select public.registrar_envio_alerta('11111111-1111-4111-8111-111111111111', 'enviado', 2, 1, null, 'msg-teste',
                                     array['x1', 'x2'], now(), true) is not null as gravou;
select status, qtd_editais, tentativas from public.envios_alerta where alerta_id = '11111111-1111-4111-8111-111111111111';
select count(*) as enviados from public.alertas_enviados where alerta_id = '11111111-1111-4111-8111-111111111111';
select ultimo_envio_em is not null as avancou from public.alertas where id = '11111111-1111-4111-8111-111111111111';
rollback;

-- ── [D7] Tempo do alerta com 5 produtos e 12 relacionados (o teto do radar). Rodar 2 vezes e anotar a 2ª
-- "Execution Time". Meta: < 1 s. (Cria e desfaz um alerta só para existir o id.)
begin;
insert into public.alertas (id, user_id, nome, termos)
values ('22222222-2222-4222-8222-222222222222', (select id from auth.users where email = '<e-mail do dono>'), 'tempo', array['uniforme']);
explain (analyze, buffers) select * from public.editais_do_alerta('22222222-2222-4222-8222-222222222222', now() - interval '1 day',
  array['uniforme', 'luva', 'material de limpeza', 'cimento', 'notebook'],
  array['EPI', 'material de construção', 'informática', 'fardamento', 'equipamento de proteção individual',
        'produto de limpeza', 'computador', 'vestuário profissional', 'saneante', 'areia', 'microcomputador', 'jaleco']);
rollback;

-- ── [D8] Eventos. Esperado: a restrição lista os 17 tipos.
select pg_get_constraintdef(oid) from pg_constraint where conname = 'eventos_tipo_check';

-- ── [D10] Resumo semanal (transação desfeita; depois do Step 6 da Task 2 o dono é Pro e tem radar). Esperado:
-- contas_para_resumo com a conta do dono; o resumo com total = cartão "Oportunidades para o seu perfil" do Meu Radar
-- dele (anotar), até 10 novos, até 5 encerrando, até 5 órgãos e cidades; depois de um 'enviado' a conta sai da lista
-- (0); parar_resumo_semanal = true. Tempo do explain (2ª execução) < 1,5 s.
begin;
select user_id, email, termos, ufs, municipios from public.contas_para_resumo();
select jsonb_pretty(public.resumo_do_radar(r.user_id, r.termos, p_excluir => nullif(r.termos_excluir, '{}'),
       p_ufs => nullif(r.ufs, '{}'), p_ibges => nullif(r.municipios, '{}')))
from public.radares r join auth.users u on u.id = r.user_id where u.email = '<e-mail do dono>';
explain (analyze, buffers) select public.resumo_do_radar((select id from auth.users where email = '<e-mail do dono>'),
  array['uniforme', 'luva', 'material de limpeza', 'cimento', 'notebook'],
  array['EPI', 'material de construção', 'informática', 'fardamento', 'equipamento de proteção individual',
        'produto de limpeza', 'computador', 'vestuário profissional', 'saneante', 'areia', 'microcomputador', 'jaleco']);
insert into public.envios_resumo (user_id, status, qtd_editais, tentativas)
values ((select id from auth.users where email = '<e-mail do dono>'), 'enviado', 3, 1);
select count(*) as ainda_na_lista from public.contas_para_resumo() where email = '<e-mail do dono>';
select public.parar_resumo_semanal((select id from auth.users where email = '<e-mail do dono>')) as desligou;
rollback;

-- ── [D9] Depois do teste ponta a ponta (Task 14). Esperado: salvos do dono com os status escolhidos; alertas do dono
-- (um pausado pelo link); envios_alerta com 'enviado' na 1ª rodada e 'sem_novidades' na 2ª; alertas_enviados sem
-- repetição (duplicados = 0); envios_resumo com 1 'enviado'; resumo_semanal false depois do link (e true depois de
-- religar em /alertas); eventos da fase sem e-mail no detalhe.
select s.status, count(*) from public.salvos s join auth.users u on u.id = s.user_id
where u.email = '<e-mail do dono>' group by 1 order by 1;
select a.nome, a.ativo, a.ultimo_envio_em from public.alertas a join auth.users u on u.id = a.user_id
where u.email = '<e-mail do dono>' order by a.criado_em;
select a.nome, e.iniciado_em, e.status, e.qtd_editais, e.tentativas, e.erro, e.id_mensagem is not null as tem_id
from public.envios_alerta e join public.alertas a on a.id = e.alerta_id order by e.iniciado_em desc limit 20;
select count(*) - count(distinct (alerta_id, contratacao_id)) as duplicados, count(*) as total from public.alertas_enviados;
select status, qtd_editais, tentativas, erro, iniciado_em from public.envios_resumo order by iniciado_em desc limit 10;
select p.resumo_semanal from public.perfis p join auth.users u on u.id = p.id where u.email = '<e-mail do dono>';
select tipo, detalhe, interno, criado_em from public.eventos
where tipo in ('edital_salvo', 'edital_descartado', 'alerta_criado', 'alerta_enviado', 'resumo_enviado') order by criado_em desc limit 20;
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run scripts/migracoes.test.ts`
Expected: PASS (as guardas antigas da 0005–0014 continuam passando).

- [ ] **Step 7: Verificação completa e commit**

Run: `npm test && npm run typecheck`
```bash
git add supabase/migrations/0016_oportunidades_alertas.sql docs/evolucao-fase-4.sql lib/eventos.ts scripts/migracoes.test.ts
git commit -m "feat: migração 0016 (salvos, alertas, resumo semanal e funções do envio)" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 2 (controlador): aplicar a 0016, segredos e plano do dono

**Files:**
- Modify: `docs/fase-3-metricas.md`

**Interfaces:**
- Consumes: os arquivos da Task 1.
- Produces: 0016 aplicada em produção; `perfis.plano = 'pro'` na conta do dono; `ALERTAS_SEGREDO` gerado (≥ 32 caracteres) na Vercel (production), no GitHub e no `.env` local; `RESEND_API_KEY` no GitHub (já está na Vercel e no `.env`). Pré-requisitos da Task 14.

Todos os passos são do controlador (o `.env` do worktree tem `SUPABASE_DB_URL`, `RESEND_API_KEY`; nunca imprimir valores).

- [ ] **Step 1: Pré-condições**

Task 1 commitada. `gh run list --workflow sync.yml --limit 1`: nenhuma rodada `in_progress` (se houver, esperar). Rodar [D0] de `docs/evolucao-fase-4.sql` e anotar. Se `salvos_contratacao_id_fkey` não aparecer com esse nome, ou `alertas_enviados` tiver linhas, ou `tem_0015` for false: parar (corrigir o nome na 0016 pela Task 1, novo commit; ou avisar o dono).

- [ ] **Step 2: Aplicar**

Run: `npm run db:aplicar -- supabase/migrations/0016_oportunidades_alertas.sql`
Expected: `[migração] oportunidades_alertas aplicada`. `lock timeout`: esperar o sync terminar e repetir. Qualquer outro erro: nada ficou aplicado; corrigir na Task 1 e repetir.

- [ ] **Step 3: Site no ar continua de pé**

```bash
B=https://www.editalmap.com.br
H='cookie: em_interno=1'
for u in / "/api/busca?q=luva" "/api/mapa?q=luva" "/api/contagem?q=luva" "/api/exportar?q=luva"; do curl -s -H "$H" -o /dev/null -w "%{http_code} $u\n" "$B$u"; done
S=$(curl -s -H "$H" "$B/api/busca?q=luva" | node -e "const r=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(r.editais[0].slug)")
curl -s -H "$H" -o /dev/null -w "%{http_code} edital\n" "$B/edital/$S"
```
Expected: `200` em todas. Qualquer 502: olhar o log da Vercel; se for a 0016, avisar o dono.

- [ ] **Step 4: Conferências**

Rodar [D1]–[D8] de `docs/evolucao-fase-4.sql`, uma seção por vez, conferindo o "Esperado" ([D10] vai depois do Step 6). Em [D7] (> 1 s) ou [D10] (> 1,5 s): ver "Riscos" e avisar o dono com a nova estimativa antes da Task 14.

- [ ] **Step 5: Segredos (sem imprimir nada)**

```bash
# Sem .vercel/ no worktree: vercel link --yes --project edital-map (time JPM Company)
S=$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64url'))")
printf '%s' "$S" | gh secret set ALERTAS_SEGREDO --repo mallon-10/edital-map
printf '%s' "$S" | vercel env add ALERTAS_SEGREDO production
printf '\nALERTAS_SEGREDO=%s\n' "$S" >> .env
unset S
node --env-file=.env -e "process.stdout.write(process.env.RESEND_API_KEY ?? '')" | gh secret set RESEND_API_KEY --repo mallon-10/edital-map
gh secret list --repo mallon-10/edital-map
vercel env ls production | grep -E 'ALERTAS_SEGREDO|RESEND_API_KEY'
```
Expected: `gh secret list` com `ALERTAS_SEGREDO`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`; a Vercel com `ALERTAS_SEGREDO` e `RESEND_API_KEY` em production. Se `RESEND_API_KEY` não estiver no `.env`: `vercel env pull` para um arquivo na pasta de rascunho da sessão, ler a variável dali com o mesmo `node --env-file=<arquivo> …` e apagar o arquivo.

- [ ] **Step 6: Conta do dono como Pro (marcação manual, spec §1)**

```sql
update public.perfis set plano = 'pro'
where id = (select id from auth.users where email = '<e-mail do dono>')
returning id, plano;
```
Expected: 1 linha `pro`. Depois rodar [D5] (`dono = pro`) e [D10].

- [ ] **Step 7: Registrar e commitar**

Acrescente ao fim de `docs/fase-3-metricas.md`:
```markdown

## Evolução · Fase 4 · Minhas Oportunidades e alertas (0016)

- 0016 aplicada em aaaa-mm-dd hh:mm UTC; site no ar seguiu 200 (busca, mapa, contagem, exportação, edital).
- [D0] salvos 0, alertas_enviados 0, 0015 presente; uniforme N. [D2] chamadas antigas iguais (N); p_sem_ids tira 1.
- [D1] salvos/alertas/alertas_enviados/envios_alerta só service_role, RLS ligado; 9 funções com uma assinatura, só service_role; definer só em plano_da_conta e alertas_para_envio.
- [D3] retenção manteve o salvo e levou o descartado. [D4] gravar_salvo ok/limite/ok/ok/limite/sem_edital.
- [D5] dono pro (marcação manual), outra conta gratis. [D6] alerta: N1 editais, 3 marcados não voltam, histórico e janela ok.
- [D7] editais_do_alerta com 5 produtos e 12 relacionados (2ª execução): N ms. [D10] resumo_do_radar do dono: total N (= cartão do radar), novas N, prazo N; com 5 produtos N ms; uma vez por semana e desligar ok.
- ALERTAS_SEGREDO (Vercel production, GitHub, .env) e RESEND_API_KEY (GitHub) configurados.
```
```bash
git add docs/fase-3-metricas.md
git commit -m "docs: 0016 aplicada e conferida" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 3: Plano da conta e limites por plano (Grátis e Pro)

**Files:**
- Create: `lib/limitesConta.ts`, `lib/servidor/planoNavegador.ts`
- Modify: `lib/servidor/conta.ts` (`planoDaConta`, `resumoSemanalLigado`, `mudarResumoSemanal`)
- Test: `lib/limitesConta.test.ts`, `lib/servidor/planoConta.test.ts`

**Interfaces:**
- Consumes: `Usuario` (`lib/servidor/sessao.ts`); `Contexto` (`lib/servidor/registro.ts`); `plano_da_conta(p_user)` e `perfis.resumo_semanal` (Task 1); `plano_do_visitante(p_visitante)` (0015, em produção); `planoAtual(ctx)` de `lib/servidor/plano.ts` se já existir no branch.
- Produces:
  - `lib/limitesConta.ts`: `type NivelConta = 'gratis' | 'pro'`; `LIMITES_CONTA: Record<NivelConta, { salvos: number; alertas: number }>` (gratis 0/0, pro 500/5); `lerPlano(v: unknown): NivelConta` (`'basic'` → `'pro'`); `maiorPlano(...planos: NivelConta[]): NivelConta`; `type PlanoConta = { plano: NivelConta; daConta: NivelConta; doNavegador: NivelConta }`; `AVISO_PLANO_NAVEGADOR`; `avisoPlanoNavegador(p: PlanoConta): string | null`; `type Bloqueio = { codigo: 'plano' | 'limite'; mensagem: string }`; `MENSAGENS_LIMITE_CONTA` (`salvosPlano`, `alertasPlano`, `resumoPlano`, `salvosConvite`, `alertasConvite`); `bloqueioSalvar(plano: NivelConta, usados: number): Bloqueio | null`; `bloqueioAlerta(plano: NivelConta, qtd: number): Bloqueio | null`.
  - `lib/servidor/planoNavegador.ts`: `planoDoNavegador(ctx: Contexto | null): Promise<string>` (o plano do navegador como vem: `gratis|basic|pro`; quem chama normaliza com `lerPlano`).
  - `lib/servidor/conta.ts`: `planoDaConta(usuario: Usuario, ctx?: Contexto | null): Promise<PlanoConta>`; `resumoSemanalLigado(usuario: Usuario): Promise<boolean>`; `mudarResumoSemanal(usuario: Usuario, ligado: boolean): Promise<void>`.

- [ ] **Step 1: Testes das regras puras (falhando)**

Crie `lib/limitesConta.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  AVISO_PLANO_NAVEGADOR, avisoPlanoNavegador, bloqueioAlerta, bloqueioSalvar, LIMITES_CONTA, lerPlano, maiorPlano, MENSAGENS_LIMITE_CONTA,
} from './limitesConta';

describe('limites da conta', () => {
  it('Grátis nada; Pro 500 salvos (uso justo) e 5 alertas', () => {
    expect(LIMITES_CONTA).toEqual({ gratis: { salvos: 0, alertas: 0 }, pro: { salvos: 500, alertas: 5 } });
  });
  it('o maior plano vence', () => {
    expect(maiorPlano()).toBe('gratis');
    expect(maiorPlano('gratis', 'pro')).toBe('pro');
    expect(maiorPlano('gratis', 'gratis')).toBe('gratis');
  });
  it('lerPlano: pro; basic (descontinuado, linhas antigas) vale pro; o resto é grátis', () => {
    expect(lerPlano('pro')).toBe('pro');
    expect(lerPlano('basic')).toBe('pro');
    for (const v of ['business', '', null, undefined, 3]) expect(lerPlano(v)).toBe('gratis');
  });
  it('aviso quando o plano está só no navegador', () => {
    expect(avisoPlanoNavegador({ plano: 'pro', daConta: 'gratis', doNavegador: 'pro' })).toBe(AVISO_PLANO_NAVEGADOR);
    expect(avisoPlanoNavegador({ plano: 'pro', daConta: 'pro', doNavegador: 'pro' })).toBeNull();
    expect(avisoPlanoNavegador({ plano: 'pro', daConta: 'pro', doNavegador: 'gratis' })).toBeNull();
    expect(AVISO_PLANO_NAVEGADOR).toBe('Plano no navegador, não na conta: use o mesmo e-mail da compra.');
  });
  it('salvar: grátis vê o convite; Pro até 500', () => {
    expect(bloqueioSalvar('gratis', 0)).toEqual({ codigo: 'plano', mensagem: MENSAGENS_LIMITE_CONTA.salvosPlano });
    expect(bloqueioSalvar('pro', 499)).toBeNull();
    expect(bloqueioSalvar('pro', 500)).toEqual({ codigo: 'limite', mensagem: 'Você chegou a 500 editais salvos. Remova um para salvar outro.' });
  });
  it('alertas: grátis vê o convite; Pro até 5', () => {
    expect(bloqueioAlerta('gratis', 0)).toEqual({ codigo: 'plano', mensagem: MENSAGENS_LIMITE_CONTA.alertasPlano });
    expect(bloqueioAlerta('pro', 4)).toBeNull();
    expect(bloqueioAlerta('pro', 5)).toEqual({ codigo: 'limite', mensagem: 'Você já tem 5 alertas, o máximo do plano. Pause ou exclua um para criar outro.' });
  });
  it('textos', () => {
    expect(MENSAGENS_LIMITE_CONTA).toEqual({
      salvosPlano: 'Salvar editais é do plano Pro.',
      alertasPlano: 'Alertas por e-mail são do plano Pro.',
      resumoPlano: 'O resumo semanal é do plano Pro.',
      salvosConvite: 'No Pro, salve os editais que interessam e acompanhe cada um com status e observação.',
      alertasConvite: 'No Pro, até 5 alertas: os editais novos chegam por e-mail às 7h, e toda segunda chega o resumo da semana.',
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/limitesConta.test.ts`
Expected: FAIL (módulo `./limitesConta` não existe).

- [ ] **Step 3: Implementar `lib/limitesConta.ts`**

```ts
/**
 * Plano da conta e limites (Evolução, Fase 4, §1, com a decisão do dono depois da spec: o Basic acabou, só Grátis e
 * Pro). Grátis: nenhum salvo, nenhum alerta, sem resumo semanal (os botões mostram o convite ao Pro). Pro: até 5
 * alertas e salvos com uso justo (500 por trás). Descartados não contam como salvos (teto próprio de 500 no banco,
 * gravar_salvo). Linhas antigas com 'basic' (perfis ou assinatura) valem como Pro até o fim da validade.
 * Puro: o site e o job dos alertas usam.
 */
export type NivelConta = 'gratis' | 'pro';

export const LIMITES_CONTA: Record<NivelConta, { salvos: number; alertas: number }> = {
  gratis: { salvos: 0, alertas: 0 },
  pro: { salvos: 500, alertas: 5 },
};

export function lerPlano(v: unknown): NivelConta {
  return v === 'pro' || v === 'basic' ? 'pro' : 'gratis';
}

/** O maior plano entre as fontes (marcação manual, assinatura com o e-mail da conta, navegador). */
export function maiorPlano(...planos: NivelConta[]): NivelConta {
  return planos.includes('pro') ? 'pro' : 'gratis';
}

/** `daConta`: perfis.plano + assinatura com o e-mail da conta (o que os envios por e-mail veem). `doNavegador`: Cakto por navegador. */
export type PlanoConta = { plano: NivelConta; daConta: NivelConta; doNavegador: NivelConta };

export const AVISO_PLANO_NAVEGADOR = 'Plano no navegador, não na conta: use o mesmo e-mail da compra.';

/** Assinou com outro e-mail: o Pro vale neste navegador, mas os envios por e-mail (sem navegador) não o veem. */
export function avisoPlanoNavegador(p: PlanoConta): string | null {
  return p.doNavegador === 'pro' && p.daConta !== 'pro' ? AVISO_PLANO_NAVEGADOR : null;
}

export type Bloqueio = { codigo: 'plano' | 'limite'; mensagem: string };

export const MENSAGENS_LIMITE_CONTA = {
  salvosPlano: 'Salvar editais é do plano Pro.',
  alertasPlano: 'Alertas por e-mail são do plano Pro.',
  resumoPlano: 'O resumo semanal é do plano Pro.',
  salvosConvite: 'No Pro, salve os editais que interessam e acompanhe cada um com status e observação.',
  alertasConvite: 'No Pro, até 5 alertas: os editais novos chegam por e-mail às 7h, e toda segunda chega o resumo da semana.',
} as const;

/** Pode salvar mais um? `usados` = salvos fora os descartados. */
export function bloqueioSalvar(plano: NivelConta, usados: number): Bloqueio | null {
  const max = LIMITES_CONTA[plano].salvos;
  if (max === 0) return { codigo: 'plano', mensagem: MENSAGENS_LIMITE_CONTA.salvosPlano };
  return usados < max ? null : { codigo: 'limite', mensagem: `Você chegou a ${max} editais salvos. Remova um para salvar outro.` };
}

/** Pode criar mais um alerta? `qtd` = alertas da conta (pausados contam). */
export function bloqueioAlerta(plano: NivelConta, qtd: number): Bloqueio | null {
  const max = LIMITES_CONTA[plano].alertas;
  if (max === 0) return { codigo: 'plano', mensagem: MENSAGENS_LIMITE_CONTA.alertasPlano };
  return qtd < max ? null : { codigo: 'limite', mensagem: `Você já tem ${max} alertas, o máximo do plano. Pause ou exclua um para criar outro.` };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/limitesConta.test.ts`
Expected: PASS.

- [ ] **Step 5: Plano do navegador (adaptador)**

Run: `test -f lib/servidor/plano.ts && echo TEM || echo NAO`

Se `TEM` (o pagamento já está no branch): crie `lib/servidor/planoNavegador.ts` com
```ts
import 'server-only';

/** Plano do navegador (pagamento pela Cakto, 0015): a regra é a de lib/servidor/plano.ts (dono confiável = Pro). */
export { planoAtual as planoDoNavegador } from './plano';
```

Se `NAO`: crie `lib/servidor/planoNavegador.ts` com
```ts
import 'server-only';
import type { Contexto } from './registro';
import { supabaseServidor } from './supabase';

/**
 * Plano do navegador (pagamento pela Cakto, 0015, já em produção): dono confiável = Pro; senão a maior assinatura válida
 * ligada a este navegador (plano_do_visitante). Mesma regra de planoAtual (lib/servidor/plano.ts, branch pagamento):
 * ao juntar com o pagamento, este arquivo vira `export { planoAtual as planoDoNavegador } from './plano';`.
 * Devolve o texto do banco; quem usa normaliza com lerPlano (lib/limitesConta.ts).
 */
export async function planoDoNavegador(ctx: Contexto | null): Promise<string> {
  if (!ctx) return 'gratis';
  if ((ctx as Contexto & { dono?: boolean }).dono === true) return 'pro';
  const { data, error } = await supabaseServidor().rpc('plano_do_visitante', { p_visitante: ctx.visitante });
  if (error) {
    console.error(`plano_do_visitante: ${error.message}`);
    return 'gratis';
  }
  return typeof data === 'string' ? data : 'gratis';
}
```

- [ ] **Step 6: Teste do plano da conta e da preferência do resumo (falhando)**

Crie `lib/servidor/planoConta.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from './registro';
import type { Usuario } from './sessao';

vi.mock('server-only', () => ({}));

type Resposta = { data: unknown; error: null | { message: string } };
const m = vi.hoisted(() => ({
  chamadas: [] as unknown[][],
  respostas: [] as Resposta[],
  navegador: vi.fn(async (..._a: unknown[]): Promise<string> => 'gratis'),
}));
const proxima = () => Promise.resolve(m.respostas.shift() ?? { data: null, error: null });
function consulta(tabela: string) {
  const c: Record<string, unknown> = {};
  for (const metodo of ['select', 'eq', 'update']) {
    c[metodo] = (...a: unknown[]) => {
      m.chamadas.push([`${tabela}.${metodo}`, ...a]);
      return c;
    };
  }
  c.maybeSingle = proxima;
  c.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => proxima().then(ok, ko);
  return c;
}
vi.mock('./supabase', () => ({
  supabaseServidor: () => ({
    from: (t: string) => consulta(t),
    rpc: (nome: string, args: unknown) => {
      m.chamadas.push([`rpc.${nome}`, args]);
      return proxima();
    },
  }),
}));
vi.mock('./planoNavegador', () => ({ planoDoNavegador: m.navegador }));

const { mudarResumoSemanal, planoDaConta, resumoSemanalLigado } = await import('./conta');

const usuario = { id: 'u-sessao', email: 'dono@empresa.com.br' } as unknown as Usuario;
const CTX = { visitante: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b', interno: false, ipHash: null } as Contexto;

beforeEach(() => {
  m.chamadas.length = 0;
  m.respostas.length = 0;
  m.navegador.mockReset();
  m.navegador.mockResolvedValue('gratis');
});

describe('planoDaConta', () => {
  it('manual ou assinatura com o e-mail (plano_da_conta), pelo id da sessão; sem navegador não pergunta a ele', async () => {
    m.respostas.push({ data: 'pro', error: null });
    expect(await planoDaConta(usuario)).toEqual({ plano: 'pro', daConta: 'pro', doNavegador: 'gratis' });
    expect(m.chamadas).toEqual([['rpc.plano_da_conta', { p_user: 'u-sessao' }]]);
    expect(m.navegador).not.toHaveBeenCalled();
  });
  it('com navegador, o maior vence; basic do navegador vale pro', async () => {
    m.respostas.push({ data: 'gratis', error: null });
    m.navegador.mockResolvedValue('basic');
    expect(await planoDaConta(usuario, CTX)).toEqual({ plano: 'pro', daConta: 'gratis', doNavegador: 'pro' });
    expect(m.navegador).toHaveBeenCalledWith(CTX);
  });
  it('banco fora: a conta vale grátis (o navegador ainda vale)', async () => {
    m.respostas.push({ data: null, error: { message: 'fora' } });
    m.navegador.mockResolvedValue('pro');
    expect(await planoDaConta(usuario, CTX)).toEqual({ plano: 'pro', daConta: 'gratis', doNavegador: 'pro' });
  });
  it('valor desconhecido do banco: grátis', async () => {
    m.respostas.push({ data: 'business', error: null });
    expect((await planoDaConta(usuario)).daConta).toBe('gratis');
  });
});

describe('resumo semanal na conta', () => {
  it('lê e grava perfis.resumo_semanal pelo id da sessão (sem perfil: ligado, o padrão)', async () => {
    m.respostas.push({ data: { resumo_semanal: false }, error: null });
    expect(await resumoSemanalLigado(usuario)).toBe(false);
    expect(m.chamadas).toContainEqual(['perfis.eq', 'id', 'u-sessao']);
    expect(await resumoSemanalLigado(usuario)).toBe(true);
    await mudarResumoSemanal(usuario, true);
    expect(m.chamadas).toContainEqual(['perfis.update', { resumo_semanal: true }]);
  });
});
```

- [ ] **Step 7: Rodar e ver falhar**

Run: `npx vitest run lib/servidor/planoConta.test.ts`
Expected: FAIL (`planoDaConta` não existe em `./conta`).

- [ ] **Step 8: Implementar em `lib/servidor/conta.ts`**

Acrescente aos imports:
```ts
import { lerPlano, maiorPlano, type PlanoConta } from '../limitesConta';
import { planoDoNavegador } from './planoNavegador';
import type { Contexto } from './registro';
```
e, depois de `perfilDaConta`, as funções:
```ts
/**
 * Plano da conta (Fase 4, §1): Pro se plano_da_conta (perfis.plano manual ou assinatura válida com o e-mail da conta,
 * 0016) ou, quando há navegador, o plano dele (Cakto por navegador; dono confiável) for Pro. Banco fora: a parte da
 * conta vale grátis. Os envios por e-mail (sem navegador) usam só a parte da conta.
 */
export async function planoDaConta(usuario: Usuario, ctx: Contexto | null = null): Promise<PlanoConta> {
  const [conta, navegador] = await Promise.all([
    supabaseServidor().rpc('plano_da_conta', { p_user: usuario.id }),
    ctx ? planoDoNavegador(ctx) : Promise.resolve('gratis'),
  ]);
  if (conta.error) console.error(`plano_da_conta: ${conta.error.message}`);
  const daConta = conta.error ? 'gratis' : lerPlano(conta.data);
  const doNavegador = lerPlano(navegador);
  return { plano: maiorPlano(daConta, doNavegador), daConta, doNavegador };
}

/** Resumo semanal do Pro ligado nesta conta? Sem perfil: ligado (o padrão da coluna). */
export async function resumoSemanalLigado(usuario: Usuario): Promise<boolean> {
  const { data, error } = await supabaseServidor().from('perfis').select('resumo_semanal').eq('id', usuario.id).maybeSingle();
  if (error) throw new Error(`resumo semanal: ${error.message}`);
  return (data as { resumo_semanal?: unknown } | null)?.resumo_semanal !== false;
}

export async function mudarResumoSemanal(usuario: Usuario, ligado: boolean): Promise<void> {
  const { error } = await supabaseServidor().from('perfis').update({ resumo_semanal: ligado }).eq('id', usuario.id);
  if (error) throw new Error(`mudar resumo semanal: ${error.message}`);
}
```

- [ ] **Step 9: Rodar, verificar e commitar**

Run: `npx vitest run lib/limitesConta.test.ts lib/servidor/planoConta.test.ts lib/servidor/conta.test.ts && npm test && npm run typecheck && npm run build`
Expected: PASS (o `conta.test.ts` existente segue passando; a guarda de `scripts/conta.test.ts` aceita as funções novas, todas com `usuario: Usuario` primeiro). A tabela de /planos (o Basic saindo) é da sessão do pagamento: **não** mexer em `lib/planos.ts` nesta fase.
```bash
git add lib/limitesConta.ts lib/limitesConta.test.ts lib/servidor/planoNavegador.ts lib/servidor/conta.ts lib/servidor/planoConta.test.ts
git commit -m "feat: plano da conta (Grátis ou Pro) e limites de salvos e alertas" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 4: Salvos: regras, servidor e API

**Files:**
- Create: `lib/salvos.ts`, `lib/servidor/salvos.ts`, `app/api/salvos/route.ts`
- Modify: `lib/servidor/registro.ts` (`gravarEvento` aceita `TipoEventoOportunidades`), `lib/conta.ts` (`rotaComSessao`), `proxy.ts` (matcher), `scripts/sessao.test.ts`
- Test: `lib/salvos.test.ts`, `lib/servidor/salvos.test.ts`, `app/api/salvos/route.test.ts`, `lib/conta.test.ts`

**Interfaces:**
- Consumes: `gravar_salvo`, `salvos_da_conta` (Task 1); `planoDaConta`, `LIMITES_CONTA`, `bloqueioSalvar` (Task 3); `usuarioAtual`, `Usuario`; `recusaForaDoSite`; `contexto`, `gravarEvento`; `rotuloSituacao` (`lib/situacao.ts`); `Resultado` (`lib/eventos.ts`).
- Produces:
  - `lib/salvos.ts`: `STATUS_SALVO`, `type StatusSalvo = 'salvo' | 'analise' | 'participar' | 'descartado'`; `ROTULO_STATUS`; `MAX_OBSERVACAO = 500`; `ID_CONTRATACAO`; `MENSAGENS_SALVOS`; `CONFIRMAR_REMOVER`; `TEXTO_STATUS_PESSOAL`; `lerIdContratacao(v: unknown): string | null`; `lerStatus(v: unknown): StatusSalvo | null`; `validarSalvar(corpo: unknown): Resultado<{ id: string; status: StatusSalvo }>`; `type MudancaSalvo = { id: string; status?: StatusSalvo; observacao?: string | null }`; `validarMudanca(corpo: unknown): Resultado<MudancaSalvo>`; `validarRemocao(corpo: unknown): Resultado<{ id: string }>`; `type EstadoSalvo = { status: StatusSalvo; nota: boolean }`; `type MapaSalvos = Record<string, EstadoSalvo>`; `precisaConfirmar(e: EstadoSalvo): boolean`; `type FiltroStatus = 'todos' | StatusSalvo`; `FILTROS_STATUS`; `ROTULO_FILTRO`; `contarPorStatus(status: readonly StatusSalvo[]): Record<FiltroStatus, number>`; `idsDescartados(m: MapaSalvos): string[]`; `type EditalSalvo`; `type SalvoDaConta = { id; status; observacao; salvoEm; atualizadoEm; edital: EditalSalvo | null }`; `salvoDaLinha(l: Record<string, unknown>): SalvoDaConta`; `type OrdemSalvos = 'prazo' | 'salvo'`; `type NavegacaoSalvos = { status: FiltroStatus; ordem: OrdemSalvos }`; `lerNavegacaoSalvos(p: URLSearchParams): NavegacaoSalvos`; `urlDosSalvos(n: NavegacaoSalvos): string`; `salvosDaAba(lista: readonly SalvoDaConta[], n: NavegacaoSalvos): SalvoDaConta[]`; `situacaoOficial(e: EditalSalvo | null, agora: Date): 'Suspensa' | 'Revogada' | 'Anulada' | 'Encerrada' | 'Indisponível' | null`.
  - `lib/servidor/salvos.ts`: `type ResultadoGravar = 'ok' | 'limite' | 'sem_edital'`; `gravarSalvo(usuario: Usuario, id: string, status: StatusSalvo, limite: number): Promise<ResultadoGravar>`; `mudarObservacao(usuario: Usuario, id: string, observacao: string | null, agora?: Date): Promise<boolean>`; `removerSalvo(usuario: Usuario, id: string): Promise<boolean>`; `estadoDosSalvos(usuario: Usuario): Promise<MapaSalvos>`; `salvosDaConta(usuario: Usuario): Promise<SalvoDaConta[]>`.
  - `GET /api/salvos` → `{ conta: false }` ou `{ conta: true, plano, limite, usados, salvos: MapaSalvos }`; `POST { id, status? }` → 200 `{ ok, status }` | 400 | 401 `{ erro, codigo: 'entrar' }` | 402 `{ erro, codigo: 'plano' | 'limite' }` | 404 | 502; `PATCH { id, status?, observacao? }` → 200 `{ ok }` | 400 | 401 | 402 | 404 | 502; `DELETE { id }` → 200 | 400 | 401 | 404 | 502. Todas `private, no-store`.

- [ ] **Step 1: Testes das regras (falhando)**

Crie `lib/salvos.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  contarPorStatus, idsDescartados, lerIdContratacao, lerNavegacaoSalvos, MENSAGENS_SALVOS, precisaConfirmar, ROTULO_FILTRO, ROTULO_STATUS,
  salvoDaLinha, salvosDaAba, situacaoOficial, urlDosSalvos, validarMudanca, validarRemocao, validarSalvar, type SalvoDaConta,
} from './salvos';

const ID = '00394452000103-1-021982/2026';

describe('validação', () => {
  it('id do PNCP', () => {
    expect(lerIdContratacao(ID)).toBe(ID);
    for (const v of ['', 'x', '00394452000103-1-021982', '00394452000103-1-021982/26', `${ID} `, 42, null]) expect(lerIdContratacao(v)).toBeNull();
  });
  it('salvar: status padrão "salvo"; user_id do corpo não passa', () => {
    expect(validarSalvar({ id: ID })).toEqual({ ok: true, valor: { id: ID, status: 'salvo' } });
    expect(validarSalvar({ id: ID, status: 'descartado', user_id: 'outra' })).toEqual({ ok: true, valor: { id: ID, status: 'descartado' } });
    expect(validarSalvar({ id: ID, status: 'arquivado' })).toEqual({ ok: false, erro: MENSAGENS_SALVOS.status });
    expect(validarSalvar({ id: 'x' })).toEqual({ ok: false, erro: MENSAGENS_SALVOS.formulario });
    expect(validarSalvar(null)).toEqual({ ok: false, erro: MENSAGENS_SALVOS.formulario });
  });
  it('mudança: status e/ou observação (aparada; vazia = nula; até 500)', () => {
    expect(validarMudanca({ id: ID, status: 'analise' })).toEqual({ ok: true, valor: { id: ID, status: 'analise' } });
    expect(validarMudanca({ id: ID, observacao: '  ligar na segunda  ' })).toEqual({ ok: true, valor: { id: ID, observacao: 'ligar na segunda' } });
    expect(validarMudanca({ id: ID, observacao: '   ' })).toEqual({ ok: true, valor: { id: ID, observacao: null } });
    expect(validarMudanca({ id: ID, observacao: null })).toEqual({ ok: true, valor: { id: ID, observacao: null } });
    expect(validarMudanca({ id: ID, observacao: 'a'.repeat(501) })).toEqual({ ok: false, erro: MENSAGENS_SALVOS.observacao });
    expect(validarMudanca({ id: ID, observacao: 5 })).toEqual({ ok: false, erro: MENSAGENS_SALVOS.formulario });
    expect(validarMudanca({ id: ID })).toEqual({ ok: false, erro: MENSAGENS_SALVOS.formulario });
    expect(validarMudanca({ id: ID, status: 'x' })).toEqual({ ok: false, erro: MENSAGENS_SALVOS.status });
  });
  it('remoção', () => {
    expect(validarRemocao({ id: ID })).toEqual({ ok: true, valor: { id: ID } });
    expect(validarRemocao({})).toEqual({ ok: false, erro: MENSAGENS_SALVOS.formulario });
  });
});

describe('rótulos e contagens', () => {
  it('textos dos status e das abas', () => {
    expect(ROTULO_STATUS).toEqual({ salvo: 'Salvo', analise: 'Em análise', participar: 'Vou participar', descartado: 'Descartado' });
    expect(ROTULO_FILTRO.todos).toBe('Todos');
  });
  it('"Todos" não conta os descartados', () => {
    expect(contarPorStatus(['salvo', 'analise', 'analise', 'descartado', 'participar'])).toEqual({ todos: 4, salvo: 1, analise: 2, participar: 1, descartado: 1 });
  });
  it('descartados do mapa, em ordem', () => {
    expect(idsDescartados({ b: { status: 'descartado', nota: false }, a: { status: 'descartado', nota: true }, c: { status: 'salvo', nota: false } })).toEqual(['a', 'b']);
  });
  it('remover pede confirmação com status ou observação', () => {
    expect(precisaConfirmar({ status: 'salvo', nota: false })).toBe(false);
    expect(precisaConfirmar({ status: 'salvo', nota: true })).toBe(true);
    expect(precisaConfirmar({ status: 'analise', nota: false })).toBe(true);
  });
});

const LINHA = {
  contratacao_id: ID, status: 'analise', observacao: 'ver amostra', criado_em: '2026-10-18T10:00:00+00:00', atualizado_em: '2026-10-18T11:00:00+00:00',
  slug: '00394452000103-2026-21982', objeto: 'Aquisição de luvas', orgao_nome: 'PREFEITURA DE JOINVILLE', municipio_nome: 'Joinville', uf: 'SC',
  valor_estimado: '1234.50', encerramento_em: '2026-10-25T13:00:00+00:00', situacao_id: 1,
};

describe('linhas e abas', () => {
  it('linha → salvo (numeric como texto vira número)', () => {
    expect(salvoDaLinha(LINHA)).toEqual({
      id: ID, status: 'analise', observacao: 'ver amostra', salvoEm: '2026-10-18T10:00:00+00:00', atualizadoEm: '2026-10-18T11:00:00+00:00',
      edital: { slug: '00394452000103-2026-21982', objeto: 'Aquisição de luvas', orgao_nome: 'PREFEITURA DE JOINVILLE', municipio_nome: 'Joinville', uf: 'SC', valor_estimado: 1234.5, encerramento_em: '2026-10-25T13:00:00+00:00', situacao_id: 1 },
    });
  });
  it('contratação que não existe mais: edital nulo', () => {
    expect(salvoDaLinha({ ...LINHA, slug: null, objeto: null }).edital).toBeNull();
  });
  it('navegação pelo endereço', () => {
    expect(lerNavegacaoSalvos(new URLSearchParams(''))).toEqual({ status: 'todos', ordem: 'prazo' });
    expect(lerNavegacaoSalvos(new URLSearchParams('status=analise&ordem=salvo'))).toEqual({ status: 'analise', ordem: 'salvo' });
    expect(lerNavegacaoSalvos(new URLSearchParams('status=x&ordem=y'))).toEqual({ status: 'todos', ordem: 'prazo' });
    expect(urlDosSalvos({ status: 'todos', ordem: 'prazo' })).toBe('/oportunidades');
    expect(urlDosSalvos({ status: 'descartado', ordem: 'salvo' })).toBe('/oportunidades?status=descartado&ordem=salvo');
  });
  it('aba e ordem: prazo (sem prazo no fim) ou data de salvamento (mais recente primeiro)', () => {
    const s = (id: string, status: SalvoDaConta['status'], salvoEm: string, prazo: string | null): SalvoDaConta => ({
      id, status, observacao: null, salvoEm, atualizadoEm: salvoEm,
      edital: prazo === null ? null : { slug: id, objeto: 'x', orgao_nome: 'o', municipio_nome: null, uf: 'SC', valor_estimado: null, encerramento_em: prazo, situacao_id: 1 },
    });
    const lista = [
      s('a', 'salvo', '2026-10-10T00:00:00Z', '2026-10-30T00:00:00Z'),
      s('b', 'analise', '2026-10-12T00:00:00Z', '2026-10-20T00:00:00Z'),
      s('c', 'descartado', '2026-10-13T00:00:00Z', '2026-10-19T00:00:00Z'),
      s('d', 'salvo', '2026-10-11T00:00:00Z', null),
    ];
    expect(salvosDaAba(lista, { status: 'todos', ordem: 'prazo' }).map((x) => x.id)).toEqual(['b', 'a', 'd']);
    expect(salvosDaAba(lista, { status: 'todos', ordem: 'salvo' }).map((x) => x.id)).toEqual(['b', 'd', 'a']);
    expect(salvosDaAba(lista, { status: 'descartado', ordem: 'prazo' }).map((x) => x.id)).toEqual(['c']);
  });
  it('situação oficial não depende do status pessoal', () => {
    const agora = new Date('2026-10-20T12:00:00Z');
    const e = salvoDaLinha(LINHA).edital!;
    expect(situacaoOficial(e, agora)).toBeNull();
    expect(situacaoOficial({ ...e, situacao_id: 4 }, agora)).toBe('Suspensa');
    expect(situacaoOficial({ ...e, situacao_id: 2 }, agora)).toBe('Revogada');
    expect(situacaoOficial({ ...e, situacao_id: 3 }, agora)).toBe('Anulada');
    expect(situacaoOficial({ ...e, encerramento_em: '2026-10-19T00:00:00Z' }, agora)).toBe('Encerrada');
    expect(situacaoOficial(null, agora)).toBe('Indisponível');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/salvos.test.ts`
Expected: FAIL (módulo `./salvos` não existe).

- [ ] **Step 3: Implementar `lib/salvos.ts`**

```ts
import type { Resultado } from './eventos';
import { rotuloSituacao } from './situacao';

/**
 * Minhas Oportunidades (Evolução, Fase 4, §2): status pessoais, observação, validação das rotas, linhas do banco, abas
 * e ordem. Os status são da pessoa e não mudam a situação oficial do edital. Puro: sem rede e sem dono (o dono vem da
 * sessão em lib/servidor/salvos.ts).
 */

export const STATUS_SALVO = ['salvo', 'analise', 'participar', 'descartado'] as const;
export type StatusSalvo = (typeof STATUS_SALVO)[number];
export const ROTULO_STATUS: Record<StatusSalvo, string> = {
  salvo: 'Salvo',
  analise: 'Em análise',
  participar: 'Vou participar',
  descartado: 'Descartado',
};
export const MAX_OBSERVACAO = 500;
/** numeroControlePNCP (contratacoes.id): CNPJ-esfera-sequencial/ano, ex.: 00394452000103-1-021982/2026. */
export const ID_CONTRATACAO = /^\d{14}-\d{1,2}-\d{1,7}\/\d{4}$/;

export const MENSAGENS_SALVOS = {
  formulario: 'Pedido inválido.',
  status: 'Status inválido.',
  observacao: 'Use até 500 caracteres na observação.',
  entrar: 'Entre para salvar editais.',
  semEdital: 'Edital não encontrado.',
  naoSalvo: 'Este edital não está nos seus salvos.',
  descartadosCheio: 'Você chegou a 500 editais descartados. Remova alguns em Minhas Oportunidades.',
  falha: 'Não foi possível salvar agora. Tente de novo.',
} as const;

export const CONFIRMAR_REMOVER = 'Remover este edital dos salvos? O status e a observação também saem.';
export const TEXTO_STATUS_PESSOAL = 'Os status são só seus: não mudam a situação oficial do edital no PNCP.';

const objeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const falha = (erro: string): Resultado<never> => ({ ok: false, erro });

export function lerIdContratacao(v: unknown): string | null {
  return typeof v === 'string' && v.length <= 40 && ID_CONTRATACAO.test(v) ? v : null;
}

export function lerStatus(v: unknown): StatusSalvo | null {
  return typeof v === 'string' && (STATUS_SALVO as readonly string[]).includes(v) ? (v as StatusSalvo) : null;
}

/** POST /api/salvos: { id, status? } (padrão "salvo"). O dono vem da sessão: o resto do corpo é ignorado. */
export function validarSalvar(corpo: unknown): Resultado<{ id: string; status: StatusSalvo }> {
  if (!objeto(corpo)) return falha(MENSAGENS_SALVOS.formulario);
  const id = lerIdContratacao(corpo.id);
  if (!id) return falha(MENSAGENS_SALVOS.formulario);
  const status = corpo.status === undefined ? 'salvo' : lerStatus(corpo.status);
  if (!status) return falha(MENSAGENS_SALVOS.status);
  return { ok: true, valor: { id, status } };
}

export type MudancaSalvo = { id: string; status?: StatusSalvo; observacao?: string | null };

/** PATCH /api/salvos: { id, status?, observacao? } (pelo menos um). Observação aparada; vazia = null. */
export function validarMudanca(corpo: unknown): Resultado<MudancaSalvo> {
  if (!objeto(corpo)) return falha(MENSAGENS_SALVOS.formulario);
  const id = lerIdContratacao(corpo.id);
  if (!id) return falha(MENSAGENS_SALVOS.formulario);
  const mudanca: MudancaSalvo = { id };
  if (corpo.status !== undefined) {
    const status = lerStatus(corpo.status);
    if (!status) return falha(MENSAGENS_SALVOS.status);
    mudanca.status = status;
  }
  if (corpo.observacao !== undefined) {
    if (corpo.observacao !== null && typeof corpo.observacao !== 'string') return falha(MENSAGENS_SALVOS.formulario);
    const texto = (corpo.observacao ?? '').trim();
    if (texto.length > MAX_OBSERVACAO) return falha(MENSAGENS_SALVOS.observacao);
    mudanca.observacao = texto || null;
  }
  if (mudanca.status === undefined && mudanca.observacao === undefined) return falha(MENSAGENS_SALVOS.formulario);
  return { ok: true, valor: mudanca };
}

export function validarRemocao(corpo: unknown): Resultado<{ id: string }> {
  if (!objeto(corpo)) return falha(MENSAGENS_SALVOS.formulario);
  const id = lerIdContratacao(corpo.id);
  return id ? { ok: true, valor: { id } } : falha(MENSAGENS_SALVOS.formulario);
}

/** O que os botões precisam saber de cada edital da conta: o status e se tem observação. */
export type EstadoSalvo = { status: StatusSalvo; nota: boolean };
export type MapaSalvos = Record<string, EstadoSalvo>;

/** Remover um salvo com status (além de "Salvo") ou observação pede confirmação. */
export function precisaConfirmar(e: EstadoSalvo): boolean {
  return e.status !== 'salvo' || e.nota;
}

export type FiltroStatus = 'todos' | StatusSalvo;
export const FILTROS_STATUS: readonly FiltroStatus[] = ['todos', 'salvo', 'analise', 'participar', 'descartado'];
export const ROTULO_FILTRO: Record<FiltroStatus, string> = { todos: 'Todos', ...ROTULO_STATUS };

/** Contagem por aba. "Todos" = salvos fora os descartados (descartados só na aba deles). */
export function contarPorStatus(status: readonly StatusSalvo[]): Record<FiltroStatus, number> {
  const c: Record<FiltroStatus, number> = { todos: 0, salvo: 0, analise: 0, participar: 0, descartado: 0 };
  for (const s of status) {
    c[s]++;
    if (s !== 'descartado') c.todos++;
  }
  return c;
}

export function idsDescartados(m: MapaSalvos): string[] {
  return Object.entries(m)
    .filter(([, e]) => e.status === 'descartado')
    .map(([id]) => id)
    .sort();
}

export type EditalSalvo = {
  slug: string;
  objeto: string;
  orgao_nome: string;
  municipio_nome: string | null;
  uf: string;
  valor_estimado: number | null;
  encerramento_em: string | null;
  situacao_id: number | null;
};
export type SalvoDaConta = { id: string; status: StatusSalvo; observacao: string | null; salvoEm: string; atualizadoEm: string; edital: EditalSalvo | null };

const textoOuNulo = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
const numeroOuNulo = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

/** Linha de salvos_da_conta (numeric chega como texto) → SalvoDaConta. Contratação que não existe mais: edital null. */
export function salvoDaLinha(l: Record<string, unknown>): SalvoDaConta {
  const edital: EditalSalvo | null =
    typeof l.slug === 'string' && typeof l.objeto === 'string'
      ? {
          slug: l.slug,
          objeto: l.objeto,
          orgao_nome: String(l.orgao_nome ?? ''),
          municipio_nome: textoOuNulo(l.municipio_nome),
          uf: String(l.uf ?? ''),
          valor_estimado: numeroOuNulo(l.valor_estimado),
          encerramento_em: textoOuNulo(l.encerramento_em),
          situacao_id: numeroOuNulo(l.situacao_id),
        }
      : null;
  return {
    id: String(l.contratacao_id),
    status: lerStatus(l.status) ?? 'salvo',
    observacao: typeof l.observacao === 'string' ? l.observacao : null,
    salvoEm: String(l.criado_em),
    atualizadoEm: String(l.atualizado_em),
    edital,
  };
}

export type OrdemSalvos = 'prazo' | 'salvo';
export type NavegacaoSalvos = { status: FiltroStatus; ordem: OrdemSalvos };

export function lerNavegacaoSalvos(p: URLSearchParams): NavegacaoSalvos {
  const s = p.get('status') ?? '';
  return {
    status: (FILTROS_STATUS as readonly string[]).includes(s) ? (s as FiltroStatus) : 'todos',
    ordem: p.get('ordem') === 'salvo' ? 'salvo' : 'prazo',
  };
}

/** Endereço de Minhas Oportunidades; "Todos" e a ordem por prazo (padrões) ficam fora. */
export function urlDosSalvos(n: NavegacaoSalvos): string {
  const p = new URLSearchParams();
  if (n.status !== 'todos') p.set('status', n.status);
  if (n.ordem !== 'prazo') p.set('ordem', n.ordem);
  const s = p.toString();
  return s ? `/oportunidades?${s}` : '/oportunidades';
}

/** A aba (Todos = sem os descartados) na ordem: prazo (mais próximo primeiro; sem prazo no fim) ou data de salvamento. */
export function salvosDaAba(lista: readonly SalvoDaConta[], n: NavegacaoSalvos): SalvoDaConta[] {
  const daAba = lista.filter((s) => (n.status === 'todos' ? s.status !== 'descartado' : s.status === n.status));
  const prazo = (s: SalvoDaConta) => (s.edital?.encerramento_em ? Date.parse(s.edital.encerramento_em) : Number.POSITIVE_INFINITY);
  const recente = (a: SalvoDaConta, b: SalvoDaConta) => Date.parse(b.salvoEm) - Date.parse(a.salvoEm);
  return [...daAba].sort((a, b) => (n.ordem === 'salvo' ? recente(a, b) : prazo(a) - prazo(b) || recente(a, b)));
}

/** Situação oficial: Suspensa/Revogada/Anulada pelo PNCP, Encerrada pelo prazo, Indisponível sem o edital. */
export function situacaoOficial(e: EditalSalvo | null, agora: Date): 'Suspensa' | 'Revogada' | 'Anulada' | 'Encerrada' | 'Indisponível' | null {
  if (!e) return 'Indisponível';
  const r = rotuloSituacao(e.situacao_id);
  if (r === 'Revogada' || r === 'Anulada') return r;
  if (e.encerramento_em && Date.parse(e.encerramento_em) <= agora.getTime()) return 'Encerrada';
  return r;
}
```

Run: `npx vitest run lib/salvos.test.ts` → PASS.

- [ ] **Step 4: Teste do servidor (falhando)**

Crie `lib/servidor/salvos.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Usuario } from './sessao';

vi.mock('server-only', () => ({}));

type Resposta = { data: unknown; error: null | { message: string } };
const m = vi.hoisted(() => ({ chamadas: [] as unknown[][], respostas: [] as Resposta[] }));
const proxima = () => Promise.resolve(m.respostas.shift() ?? { data: null, error: null });

function consulta(tabela: string) {
  const c: Record<string, unknown> = {};
  for (const metodo of ['select', 'eq', 'update', 'delete', 'limit']) {
    c[metodo] = (...a: unknown[]) => {
      m.chamadas.push([`${tabela}.${metodo}`, ...a]);
      return c;
    };
  }
  c.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => proxima().then(ok, ko);
  return c;
}
vi.mock('./supabase', () => ({
  supabaseServidor: () => ({
    from: (t: string) => consulta(t),
    rpc: (nome: string, args: unknown) => {
      m.chamadas.push([`rpc.${nome}`, args]);
      return proxima();
    },
  }),
}));

const { estadoDosSalvos, gravarSalvo, mudarObservacao, removerSalvo, salvosDaConta } = await import('./salvos');
const usuario = { id: 'u-sessao', email: 'dono@empresa.com.br' } as unknown as Usuario;
const ID = '00394452000103-1-021982/2026';

beforeEach(() => {
  m.chamadas.length = 0;
  m.respostas.length = 0;
});

describe('salvos.ts: tudo pelo usuário da sessão', () => {
  it('gravarSalvo chama gravar_salvo com o id da sessão e o limite', async () => {
    m.respostas.push({ data: 'limite', error: null });
    expect(await gravarSalvo(usuario, ID, 'salvo', 10)).toBe('limite');
    expect(m.chamadas).toEqual([['rpc.gravar_salvo', { p_user: 'u-sessao', p_contratacao: ID, p_status: 'salvo', p_limite: 10 }]]);
  });
  it('gravarSalvo: erro ou resposta estranha lança', async () => {
    m.respostas.push({ data: null, error: { message: 'fora' } });
    await expect(gravarSalvo(usuario, ID, 'salvo', 10)).rejects.toThrow('gravar_salvo: fora');
    m.respostas.push({ data: 'talvez', error: null });
    await expect(gravarSalvo(usuario, ID, 'salvo', 10)).rejects.toThrow('resposta inesperada');
  });
  it('observação e remoção filtram por user_id e contratação; nada mudado = false', async () => {
    m.respostas.push({ data: [{ contratacao_id: ID }], error: null });
    expect(await mudarObservacao(usuario, ID, 'ok', new Date('2026-10-18T12:00:00Z'))).toBe(true);
    expect(m.chamadas).toContainEqual(['salvos.update', { observacao: 'ok', atualizado_em: '2026-10-18T12:00:00.000Z' }]);
    expect(m.chamadas).toContainEqual(['salvos.eq', 'user_id', 'u-sessao']);
    expect(m.chamadas).toContainEqual(['salvos.eq', 'contratacao_id', ID]);
    m.respostas.push({ data: [], error: null });
    expect(await removerSalvo(usuario, ID)).toBe(false);
    expect(m.chamadas).toContainEqual(['salvos.delete']);
  });
  it('estado: status e se tem observação, por id', async () => {
    m.respostas.push({ data: [{ contratacao_id: ID, status: 'analise', observacao: 'x' }, { contratacao_id: 'b', status: 'descartado', observacao: null }], error: null });
    expect(await estadoDosSalvos(usuario)).toEqual({ [ID]: { status: 'analise', nota: true }, b: { status: 'descartado', nota: false } });
    expect(m.chamadas).toContainEqual(['salvos.eq', 'user_id', 'u-sessao']);
  });
  it('salvosDaConta pelo id da sessão', async () => {
    m.respostas.push({ data: [{ contratacao_id: ID, status: 'salvo', observacao: null, criado_em: 'a', atualizado_em: 'b', slug: null, objeto: null }], error: null });
    const r = await salvosDaConta(usuario);
    expect(m.chamadas).toEqual([['rpc.salvos_da_conta', { p_user: 'u-sessao' }]]);
    expect(r[0]).toMatchObject({ id: ID, status: 'salvo', edital: null });
  });
});
```

Run: `npx vitest run lib/servidor/salvos.test.ts` → FAIL (módulo não existe).

- [ ] **Step 5: Implementar `lib/servidor/salvos.ts`**

```ts
import 'server-only';
import { lerStatus, salvoDaLinha, type MapaSalvos, type SalvoDaConta, type StatusSalvo } from '../salvos';
import type { Usuario } from './sessao';
import { supabaseServidor } from './supabase';

/**
 * Salvos da conta (Minhas Oportunidades). Única porta para public.salvos no site: toda função recebe o `Usuario` da
 * sessão (auth.getUser()) e filtra ou grava pelo id dele, com a service role. Nunca um id do navegador.
 */

export type ResultadoGravar = 'ok' | 'limite' | 'sem_edital';

/** Salva, muda o status ou descarta (gravar_salvo, 0016: existência e limite numa transação por conta). */
export async function gravarSalvo(usuario: Usuario, id: string, status: StatusSalvo, limite: number): Promise<ResultadoGravar> {
  const { data, error } = await supabaseServidor().rpc('gravar_salvo', { p_user: usuario.id, p_contratacao: id, p_status: status, p_limite: limite });
  if (error) throw new Error(`gravar_salvo: ${error.message}`);
  if (data === 'ok' || data === 'limite' || data === 'sem_edital') return data;
  throw new Error(`gravar_salvo: resposta inesperada ${String(data)}`);
}

export async function mudarObservacao(usuario: Usuario, id: string, observacao: string | null, agora: Date = new Date()): Promise<boolean> {
  const { data, error } = await supabaseServidor()
    .from('salvos')
    .update({ observacao, atualizado_em: agora.toISOString() })
    .eq('user_id', usuario.id)
    .eq('contratacao_id', id)
    .select('contratacao_id');
  if (error) throw new Error(`observação: ${error.message}`);
  return ((data ?? []) as unknown[]).length > 0;
}

export async function removerSalvo(usuario: Usuario, id: string): Promise<boolean> {
  const { data, error } = await supabaseServidor()
    .from('salvos')
    .delete()
    .eq('user_id', usuario.id)
    .eq('contratacao_id', id)
    .select('contratacao_id');
  if (error) throw new Error(`remover salvo: ${error.message}`);
  return ((data ?? []) as unknown[]).length > 0;
}

/** Por edital: status e se tem observação (botões dos cards, cartão do radar, descartados fora do radar). */
export async function estadoDosSalvos(usuario: Usuario): Promise<MapaSalvos> {
  const { data, error } = await supabaseServidor()
    .from('salvos')
    .select('contratacao_id, status, observacao')
    .eq('user_id', usuario.id)
    .limit(1000);
  if (error) throw new Error(`salvos: ${error.message}`);
  const mapa: MapaSalvos = {};
  for (const l of (data ?? []) as Array<Record<string, unknown>>) {
    const status = lerStatus(l.status);
    if (status) mapa[String(l.contratacao_id)] = { status, nota: typeof l.observacao === 'string' && l.observacao.length > 0 };
  }
  return mapa;
}

/** Minhas Oportunidades: salvos com os dados do edital (salvos_da_conta, 0016). */
export async function salvosDaConta(usuario: Usuario): Promise<SalvoDaConta[]> {
  const { data, error } = await supabaseServidor().rpc('salvos_da_conta', { p_user: usuario.id });
  if (error) throw new Error(`salvos_da_conta: ${error.message}`);
  return ((data ?? []) as Array<Record<string, unknown>>).map(salvoDaLinha);
}
```

Run: `npx vitest run lib/servidor/salvos.test.ts` → PASS.

- [ ] **Step 6: Eventos novos no registro**

Em `lib/servidor/registro.ts`, no import de `../eventos`, acrescente `TipoEventoOportunidades`, e troque a assinatura de `gravarEvento` para:
```ts
export async function gravarEvento(
  ctx: Contexto,
  tipo: TipoEvento | TipoEventoServidor | TipoEventoConta | TipoEventoOportunidades,
  detalhe: Detalhe,
): Promise<void> {
```
(corpo igual).

- [ ] **Step 7: Teste da rota (falhando)**

Crie `app/api/salvos/route.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MENSAGENS_LIMITE_CONTA } from '@/lib/limitesConta';
import { MENSAGENS_SALVOS } from '@/lib/salvos';

vi.mock('server-only', () => ({}));

const m = vi.hoisted(() => ({
  usuario: { id: 'u-sessao', email: 'dono@empresa.com.br' } as null | { id: string; email: string },
  plano: 'pro' as 'gratis' | 'pro',
  gravarSalvo: vi.fn(),
  mudarObservacao: vi.fn(),
  removerSalvo: vi.fn(),
  estadoDosSalvos: vi.fn(),
  gravarEvento: vi.fn(async (..._a: unknown[]) => undefined),
}));
vi.mock('@/lib/servidor/sessao', () => ({ usuarioAtual: async () => m.usuario }));
vi.mock('@/lib/servidor/conta', () => ({ planoDaConta: async () => ({ plano: m.plano, daConta: m.plano, doNavegador: 'gratis' }) }));
vi.mock('@/lib/servidor/salvos', () => ({
  gravarSalvo: m.gravarSalvo, mudarObservacao: m.mudarObservacao, removerSalvo: m.removerSalvo, estadoDosSalvos: m.estadoDosSalvos,
}));
vi.mock('@/lib/servidor/registro', () => ({
  contexto: async () => ({ visitante: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b', interno: false, ipHash: null }),
  gravarEvento: m.gravarEvento,
}));

const { DELETE, GET, PATCH, POST } = await import('./route');
const ID = '00394452000103-1-021982/2026';
type Metodo = typeof POST;
const pedir = (f: Metodo, metodo: string, corpo: unknown, cabecalhos: Record<string, string> = {}) =>
  f(new Request('http://localhost/api/salvos', {
    method: metodo,
    headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', ...cabecalhos },
    body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
  }));

beforeEach(() => {
  vi.clearAllMocks();
  m.usuario = { id: 'u-sessao', email: 'dono@empresa.com.br' };
  m.plano = 'pro';
  m.gravarSalvo.mockResolvedValue('ok');
  m.mudarObservacao.mockResolvedValue(true);
  m.removerSalvo.mockResolvedValue(true);
  m.estadoDosSalvos.mockResolvedValue({ [ID]: { status: 'salvo', nota: false }, b: { status: 'descartado', nota: false } });
});

describe('GET /api/salvos', () => {
  it('sem sessão: { conta: false }, sem cache', async () => {
    m.usuario = null;
    const r = await GET();
    expect(await r.json()).toEqual({ conta: false });
    expect(r.headers.get('cache-control')).toBe('private, no-store');
  });
  it('com sessão: plano, limite, usados (sem descartados) e o mapa', async () => {
    const r = await GET();
    expect(await r.json()).toEqual({ conta: true, plano: 'pro', limite: 500, usados: 1, salvos: { [ID]: { status: 'salvo', nota: false }, b: { status: 'descartado', nota: false } } });
  });
});

describe('POST /api/salvos', () => {
  it('outro site ou sem JSON: 403', async () => {
    for (const cab of [{ 'sec-fetch-site': 'cross-site' }, { 'content-type': 'text/plain' }]) expect((await pedir(POST, 'POST', { id: ID }, cab)).status).toBe(403);
    expect(m.gravarSalvo).not.toHaveBeenCalled();
  });
  it('sem sessão: 401 com codigo entrar', async () => {
    m.usuario = null;
    const r = await pedir(POST, 'POST', { id: ID });
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ erro: MENSAGENS_SALVOS.entrar, codigo: 'entrar' });
  });
  it('grátis: 402 com o convite aos planos, sem gravar', async () => {
    m.plano = 'gratis';
    const r = await pedir(POST, 'POST', { id: ID });
    expect(r.status).toBe(402);
    expect(await r.json()).toEqual({ erro: MENSAGENS_LIMITE_CONTA.salvosPlano, codigo: 'plano' });
    expect(m.gravarSalvo).not.toHaveBeenCalled();
  });
  it('Pro: grava no usuário da sessão com o limite 500 e conta edital_salvo; user_id do corpo é ignorado', async () => {
    const r = await pedir(POST, 'POST', { id: ID, user_id: 'outra-conta' });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, status: 'salvo' });
    const [usuario, id, status, limite] = m.gravarSalvo.mock.calls[0] as [{ id: string }, string, string, number];
    expect([usuario.id, id, status, limite]).toEqual(['u-sessao', ID, 'salvo', 500]);
    expect(m.gravarEvento).toHaveBeenCalledWith(expect.anything(), 'edital_salvo', { plano: 'pro' });
  });
  it('descartar: edital_descartado', async () => {
    await pedir(POST, 'POST', { id: ID, status: 'descartado' });
    expect(m.gravarEvento).toHaveBeenCalledWith(expect.anything(), 'edital_descartado', { plano: 'pro' });
  });
  it('no limite: 402 limite; descartados cheios: mensagem própria; edital inexistente: 404', async () => {
    m.gravarSalvo.mockResolvedValue('limite');
    const r = await pedir(POST, 'POST', { id: ID });
    expect(r.status).toBe(402);
    expect(await r.json()).toEqual({ erro: 'Você chegou a 500 editais salvos. Remova um para salvar outro.', codigo: 'limite' });
    expect(await (await pedir(POST, 'POST', { id: ID, status: 'descartado' })).json()).toEqual({ erro: MENSAGENS_SALVOS.descartadosCheio, codigo: 'limite' });
    m.gravarSalvo.mockResolvedValue('sem_edital');
    expect((await pedir(POST, 'POST', { id: ID })).status).toBe(404);
    expect(m.gravarEvento).not.toHaveBeenCalled();
  });
  it('corpo inválido 400; banco fora 502', async () => {
    expect((await pedir(POST, 'POST', { id: 'x' })).status).toBe(400);
    expect((await pedir(POST, 'POST', '{x')).status).toBe(400);
    m.gravarSalvo.mockRejectedValue(new Error('fora'));
    expect((await pedir(POST, 'POST', { id: ID })).status).toBe(502);
  });
});

describe('PATCH /api/salvos', () => {
  it('observação: grava aparada na conta da sessão', async () => {
    const r = await pedir(PATCH, 'PATCH', { id: ID, observacao: '  ligar  ' });
    expect(r.status).toBe(200);
    const [usuario, id, obs] = m.mudarObservacao.mock.calls[0] as [{ id: string }, string, string];
    expect([usuario.id, id, obs]).toEqual(['u-sessao', ID, 'ligar']);
    expect(m.gravarSalvo).not.toHaveBeenCalled();
  });
  it('status: gravar_salvo com o limite; só descartar conta evento', async () => {
    await pedir(PATCH, 'PATCH', { id: ID, status: 'analise' });
    expect(m.gravarSalvo).toHaveBeenCalledWith(expect.anything(), ID, 'analise', 500);
    expect(m.gravarEvento).not.toHaveBeenCalled();
    await pedir(PATCH, 'PATCH', { id: ID, status: 'descartado' });
    expect(m.gravarEvento).toHaveBeenCalledWith(expect.anything(), 'edital_descartado', { plano: 'pro' });
  });
  it('não salvo: 404; sem sessão 401; outro site 403', async () => {
    m.mudarObservacao.mockResolvedValue(false);
    expect((await pedir(PATCH, 'PATCH', { id: ID, observacao: 'x' })).status).toBe(404);
    m.usuario = null;
    expect((await pedir(PATCH, 'PATCH', { id: ID, observacao: 'x' })).status).toBe(401);
    expect((await pedir(PATCH, 'PATCH', { id: ID, observacao: 'x' }, { 'sec-fetch-site': 'cross-site' })).status).toBe(403);
  });
});

describe('DELETE /api/salvos', () => {
  it('remove da conta da sessão; não salvo 404', async () => {
    expect((await pedir(DELETE, 'DELETE', { id: ID })).status).toBe(200);
    expect((m.removerSalvo.mock.calls[0] as [{ id: string }, string])[0].id).toBe('u-sessao');
    m.removerSalvo.mockResolvedValue(false);
    expect((await pedir(DELETE, 'DELETE', { id: ID })).status).toBe(404);
  });
});
```

Run: `npx vitest run app/api/salvos/route.test.ts` → FAIL (rota não existe).

- [ ] **Step 8: Implementar `app/api/salvos/route.ts`**

```ts
import { SEM_CACHE } from '@/lib/http';
import { bloqueioSalvar, LIMITES_CONTA, type NivelConta } from '@/lib/limitesConta';
import { MENSAGENS_SALVOS, validarMudanca, validarRemocao, validarSalvar, type StatusSalvo } from '@/lib/salvos';
import { planoDaConta } from '@/lib/servidor/conta';
import { recusaForaDoSite } from '@/lib/servidor/mesmaOrigem';
import { contexto, gravarEvento, type Contexto } from '@/lib/servidor/registro';
import { estadoDosSalvos, gravarSalvo, mudarObservacao, removerSalvo } from '@/lib/servidor/salvos';
import { usuarioAtual } from '@/lib/servidor/sessao';

/**
 * Salvos da conta da sessão (Minhas Oportunidades). Só JSON do próprio site (CSRF) nas mudanças; o dono vem só de
 * usuarioAtual(); o corpo diz só o edital (contratacoes.id), o status e a observação.
 */

const json = (corpo: unknown, status = 200) => Response.json(corpo, { status, headers: SEM_CACHE });

async function lerCorpo(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** Mensagem do 402 quando gravar_salvo responde "limite". */
function limite(plano: NivelConta, status: StatusSalvo) {
  if (status === 'descartado') return json({ erro: MENSAGENS_SALVOS.descartadosCheio, codigo: 'limite' }, 402);
  const b = bloqueioSalvar(plano, LIMITES_CONTA[plano].salvos);
  return json({ erro: b?.mensagem ?? MENSAGENS_SALVOS.falha, codigo: b?.codigo ?? 'limite' }, 402);
}

async function registrar(ctx: Contexto, tipo: 'edital_salvo' | 'edital_descartado', plano: NivelConta) {
  try {
    await gravarEvento(ctx, tipo, { plano });
  } catch (erro) {
    console.error(`${tipo}:`, erro);
  }
}

/** Estado para os botões: sem sessão, { conta: false }. */
export async function GET() {
  const usuario = await usuarioAtual();
  if (!usuario) return json({ conta: false });
  try {
    const [{ plano }, salvos] = await Promise.all([planoDaConta(usuario, await contexto()), estadoDosSalvos(usuario)]);
    const usados = Object.values(salvos).filter((s) => s.status !== 'descartado').length;
    return json({ conta: true, plano, limite: LIMITES_CONTA[plano].salvos, usados, salvos });
  } catch (erro) {
    console.error(erro);
    return json({ erro: MENSAGENS_SALVOS.falha }, 502);
  }
}

/** Salvar ou descartar (botões). Grátis: 402 com o convite aos planos; no limite: 402. */
export async function POST(request: Request) {
  const recusa = recusaForaDoSite(request);
  if (recusa) return recusa;
  const usuario = await usuarioAtual();
  if (!usuario) return json({ erro: MENSAGENS_SALVOS.entrar, codigo: 'entrar' }, 401);
  const v = validarSalvar(await lerCorpo(request));
  if (!v.ok) return json({ erro: v.erro }, 400);
  try {
    const ctx = await contexto();
    const { plano } = await planoDaConta(usuario, ctx);
    const max = LIMITES_CONTA[plano].salvos;
    if (max === 0) return json({ erro: bloqueioSalvar(plano, 0)?.mensagem, codigo: 'plano' }, 402);
    const r = await gravarSalvo(usuario, v.valor.id, v.valor.status, max);
    if (r === 'sem_edital') return json({ erro: MENSAGENS_SALVOS.semEdital }, 404);
    if (r === 'limite') return limite(plano, v.valor.status);
    await registrar(ctx, v.valor.status === 'descartado' ? 'edital_descartado' : 'edital_salvo', plano);
    return json({ ok: true, status: v.valor.status });
  } catch (erro) {
    console.error(erro);
    return json({ erro: MENSAGENS_SALVOS.falha }, 502);
  }
}

/** Minhas Oportunidades: status e/ou observação. Mudar o status respeita o limite (gravar_salvo). */
export async function PATCH(request: Request) {
  const recusa = recusaForaDoSite(request);
  if (recusa) return recusa;
  const usuario = await usuarioAtual();
  if (!usuario) return json({ erro: MENSAGENS_SALVOS.entrar, codigo: 'entrar' }, 401);
  const v = validarMudanca(await lerCorpo(request));
  if (!v.ok) return json({ erro: v.erro }, 400);
  try {
    if (v.valor.status) {
      const ctx = await contexto();
      const { plano } = await planoDaConta(usuario, ctx);
      const r = await gravarSalvo(usuario, v.valor.id, v.valor.status, LIMITES_CONTA[plano].salvos);
      if (r === 'sem_edital') return json({ erro: MENSAGENS_SALVOS.naoSalvo }, 404);
      if (r === 'limite') return limite(plano, v.valor.status);
      if (v.valor.status === 'descartado') await registrar(ctx, 'edital_descartado', plano);
    }
    if (v.valor.observacao !== undefined && !(await mudarObservacao(usuario, v.valor.id, v.valor.observacao))) {
      return json({ erro: MENSAGENS_SALVOS.naoSalvo }, 404);
    }
    return json({ ok: true });
  } catch (erro) {
    console.error(erro);
    return json({ erro: MENSAGENS_SALVOS.falha }, 502);
  }
}

export async function DELETE(request: Request) {
  const recusa = recusaForaDoSite(request);
  if (recusa) return recusa;
  const usuario = await usuarioAtual();
  if (!usuario) return json({ erro: MENSAGENS_SALVOS.entrar, codigo: 'entrar' }, 401);
  const v = validarRemocao(await lerCorpo(request));
  if (!v.ok) return json({ erro: v.erro }, 400);
  try {
    if (!(await removerSalvo(usuario, v.valor.id))) return json({ erro: MENSAGENS_SALVOS.naoSalvo }, 404);
    return json({ ok: true });
  } catch (erro) {
    console.error(erro);
    return json({ erro: MENSAGENS_SALVOS.falha }, 502);
  }
}
```

Run: `npx vitest run app/api/salvos/route.test.ts` → PASS.

- [ ] **Step 9: Sessão renovada nas páginas e APIs novas**

Em `lib/conta.test.ts`, no `describe('rotaComSessao …')`, troque as duas listas por:
```ts
    for (const p of ['/entrar', '/radar', '/radar/editar', '/api/conta', '/api/conta/codigo', '/api/radar', '/api/radar/x', '/oportunidades',
                     '/alertas', '/alertas/novo', '/alertas/sair', '/api/salvos', '/api/alertas', '/api/alertas/x']) {
```
e
```ts
    for (const p of ['/', '/edital/1', '/planos', '/sobre', '/api/busca', '/api/mapa', '/radarx', '/entrarx', '/api/contabil', '/alertasx',
                     '/oportunidadesx', '/api/salvosx', '/api/descadastro']) {
```
Run: `npx vitest run lib/conta.test.ts` → FAIL. Em `lib/conta.ts`, troque o corpo de `rotaComSessao` por:
```ts
  return [
    /^\/entrar$/, /^\/radar(\/|$)/, /^\/oportunidades(\/|$)/, /^\/alertas(\/|$)/,
    /^\/api\/conta(\/|$)/, /^\/api\/radar(\/|$)/, /^\/api\/salvos(\/|$)/, /^\/api\/alertas(\/|$)/,
  ].some((r) => r.test(caminho));
```
Em `proxy.ts`, troque o `matcher` por:
```ts
  matcher: ['/', '/edital/:path*', '/licitacoes/:path*', '/planos', '/alertas', '/alertas/:path*', '/sobre', '/entrar', '/radar', '/radar/:path*', '/oportunidades', '/api/:path*'],
```
e, no comentário do item 2, troque "só em /entrar, /radar e nas APIs da conta e do radar" por "só em /entrar, /radar, /oportunidades, /alertas e nas APIs da conta, do radar, dos salvos e dos alertas". Em `scripts/sessao.test.ts`, troque a lista do primeiro teste por `["'/entrar'", "'/radar'", "'/radar/:path*'", "'/oportunidades'", "'/alertas/:path*'", "'/api/:path*'"]`.

- [ ] **Step 10: Verificação completa e commit**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS (as guardas de `scripts/conta.test.ts` seguem passando: `app/api/salvos/route.ts` não fala em `user_id`).
```bash
git add lib/salvos.ts lib/salvos.test.ts lib/servidor/salvos.ts lib/servidor/salvos.test.ts lib/servidor/registro.ts app/api/salvos lib/conta.ts lib/conta.test.ts proxy.ts scripts/sessao.test.ts
git commit -m "feat(salvos): status, observação e descarte pela conta (rotas e servidor)" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 5: Salvar e descartar na interface (cards, edital, radar e menu da conta)

**Files:**
- Create: `lib/cliente/pedido.ts`, `lib/cliente/salvos.ts`, `components/oportunidades/{AvisoPlano,BotaoSalvar,BotaoDescartar,MenuCardRadar}.tsx`
- Modify: `components/inicio/Icones.tsx` (`IconeSalvar`), `components/inicio/CardLista.tsx`, `components/inicio/CardCompacto.tsx`, `app/edital/[slug]/page.tsx`, `lib/servidor/radar.ts`, `app/radar/page.tsx`, `components/radar/CartoesRadar.tsx`, `components/conta/MenuConta.tsx`
- Test: `lib/cliente/pedido.test.ts`, `lib/cliente/salvos.test.ts`, `lib/servidor/radar.test.ts`, `scripts/oportunidades-ui.test.ts`

**Interfaces:**
- Consumes: `GET/POST/DELETE /api/salvos` (Task 4); `MapaSalvos`, `StatusSalvo`, `EstadoSalvo`, `precisaConfirmar`, `CONFIRMAR_REMOVER`, `idsDescartados`, `contarPorStatus`, `FiltroStatus` (`lib/salvos.ts`); `bloqueioSalvar`, `LIMITES_CONTA`, `lerPlano` (`lib/limitesConta.ts`); `lerConta` (`lib/cliente/conta.ts`); `estadoDosSalvos` (`lib/servidor/salvos.ts`); `p_sem_ids` (Task 1).
- Produces:
  - `lib/cliente/pedido.ts`: `type RespostaAcao = { ok: true; corpo: Record<string, unknown> } | { ok: false; codigo: 'entrar' | 'plano' | 'limite' | 'falha'; erro: string }`; `FALHA_PEDIDO`; `respostaDaAcao(status: number, corpo: unknown): RespostaAcao`; `pedirJson(url: string, metodo: 'POST' | 'PATCH' | 'DELETE', corpo?: unknown): Promise<RespostaAcao>`; `irParaEntrar(): void`.
  - `lib/cliente/salvos.ts`: `type EstadoSalvos`; `estadoDaResposta(ok: boolean, corpo: unknown): EstadoSalvos`; `type Acao = { status: StatusSalvo } | { remover: true }`; `aplicarAcao(e: EstadoSalvos, id: string, a: Acao): EstadoSalvos`; `type AcaoBotao = 'carregando' | 'entrar' | 'bloqueado' | 'salvar' | 'remover'`; `acaoDoBotao(e: EstadoSalvos, id: string): AcaoBotao`; `carregarSalvos(): Promise<void>`; `esquecerSalvos(): void`; `useSalvos(): EstadoSalvos`; `mudarSalvo(id: string, a: Acao): Promise<RespostaAcao>`; `atualizarSalvo(id: string, m: { status?: StatusSalvo; observacao?: string | null }): Promise<RespostaAcao>`.
  - Componentes: `<BotaoSalvar id variante?="icone"|"botao" />`, `<BotaoDescartar id />`, `<MenuCardRadar id />`, `<AvisoPlano mensagem planos aoFechar />`; `<CardLista edital agora acoes?="salvar"|"radar" />`.
  - `lib/servidor/radar.ts`: `editaisDoRadar(r, o, semIds?: readonly string[])`, `contagensDoRadar(r, desde, semIds?: readonly string[])`.
  - `<CartoesRadar contagens primeiraVisita salvos?: Record<FiltroStatus, number> />`.

- [ ] **Step 1: Testes do navegador, puros (falhando)**

Crie `lib/cliente/pedido.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { FALHA_PEDIDO, respostaDaAcao } from './pedido';

describe('respostaDaAcao', () => {
  it('2xx: ok com o corpo', () => {
    expect(respostaDaAcao(201, { ok: true, id: 'a' })).toEqual({ ok: true, corpo: { ok: true, id: 'a' } });
    expect(respostaDaAcao(200, null)).toEqual({ ok: true, corpo: {} });
  });
  it('401 entrar; 402 plano ou limite; resto falha', () => {
    expect(respostaDaAcao(401, { erro: 'Entre.' })).toEqual({ ok: false, codigo: 'entrar', erro: 'Entre.' });
    expect(respostaDaAcao(402, { erro: 'Planos.', codigo: 'plano' })).toEqual({ ok: false, codigo: 'plano', erro: 'Planos.' });
    expect(respostaDaAcao(402, { erro: 'Cheio.', codigo: 'limite' })).toEqual({ ok: false, codigo: 'limite', erro: 'Cheio.' });
    expect(respostaDaAcao(404, { erro: 'Não achei.' })).toEqual({ ok: false, codigo: 'falha', erro: 'Não achei.' });
    expect(respostaDaAcao(502, null)).toEqual({ ok: false, codigo: 'falha', erro: FALHA_PEDIDO });
  });
});
```
Crie `lib/cliente/salvos.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { acaoDoBotao, aplicarAcao, estadoDaResposta, type EstadoSalvos } from './salvos';

const PRONTO: EstadoSalvos = { fase: 'pronto', plano: 'pro', limite: 500, usados: 1, salvos: { a: { status: 'salvo', nota: false }, d: { status: 'descartado', nota: false } } };

describe('estado dos salvos no navegador', () => {
  it('resposta de GET /api/salvos', () => {
    expect(estadoDaResposta(true, { conta: false })).toEqual({ fase: 'anonimo' });
    expect(estadoDaResposta(true, { conta: true, plano: 'pro', limite: 500, usados: 1, salvos: PRONTO.fase === 'pronto' ? PRONTO.salvos : {} })).toEqual(PRONTO);
    expect(estadoDaResposta(false, { erro: 'x' })).toEqual({ fase: 'erro' });
    expect(estadoDaResposta(true, null)).toEqual({ fase: 'erro' });
  });
  it('ação aceita atualiza o mapa e os usados (descartados não contam)', () => {
    const salvo = aplicarAcao(PRONTO, 'b', { status: 'salvo' });
    expect(salvo).toMatchObject({ usados: 2, salvos: { b: { status: 'salvo', nota: false } } });
    expect(aplicarAcao(salvo, 'a', { remover: true })).toMatchObject({ usados: 1 });
    expect(aplicarAcao(PRONTO, 'a', { status: 'descartado' })).toMatchObject({ usados: 0, salvos: { a: { status: 'descartado' } } });
    expect(aplicarAcao({ fase: 'anonimo' }, 'a', { remover: true })).toEqual({ fase: 'anonimo' });
  });
  it('o que um toque no "Salvar" faz', () => {
    expect(acaoDoBotao({ fase: 'carregando' }, 'a')).toBe('carregando');
    expect(acaoDoBotao({ fase: 'anonimo' }, 'a')).toBe('entrar');
    expect(acaoDoBotao({ fase: 'erro' }, 'a')).toBe('salvar');
    expect(acaoDoBotao(PRONTO, 'a')).toBe('remover');
    expect(acaoDoBotao(PRONTO, 'd')).toBe('salvar');
    expect(acaoDoBotao(PRONTO, 'novo')).toBe('salvar');
    expect(acaoDoBotao({ ...PRONTO, usados: 500 } as EstadoSalvos, 'novo')).toBe('bloqueado');
    expect(acaoDoBotao({ ...PRONTO, plano: 'gratis', limite: 0, usados: 0 } as EstadoSalvos, 'novo')).toBe('bloqueado');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/cliente/pedido.test.ts lib/cliente/salvos.test.ts`
Expected: FAIL (módulos não existem).

- [ ] **Step 3: Implementar `lib/cliente/pedido.ts` e `lib/cliente/salvos.ts`**

`lib/cliente/pedido.ts`:
```ts
/** Pedidos JSON do navegador às rotas da conta (salvos e alertas): só JSON do próprio site (a rota recusa o resto). */

export type RespostaAcao =
  | { ok: true; corpo: Record<string, unknown> }
  | { ok: false; codigo: 'entrar' | 'plano' | 'limite' | 'falha'; erro: string };

export const FALHA_PEDIDO = 'Não foi possível concluir agora. Tente de novo.';

/** Status + corpo da rota → resposta: 401 entrar, 402 plano/limite (convite aos planos), o resto falha com a mensagem. */
export function respostaDaAcao(status: number, corpo: unknown): RespostaAcao {
  const c = (typeof corpo === 'object' && corpo !== null ? corpo : {}) as Record<string, unknown>;
  if (status >= 200 && status < 300) return { ok: true, corpo: c };
  const erro = typeof c.erro === 'string' ? c.erro : FALHA_PEDIDO;
  if (status === 401) return { ok: false, codigo: 'entrar', erro };
  if (status === 402) return { ok: false, codigo: c.codigo === 'limite' ? 'limite' : 'plano', erro };
  return { ok: false, codigo: 'falha', erro };
}

export async function pedirJson(url: string, metodo: 'POST' | 'PATCH' | 'DELETE', corpo: unknown = {}): Promise<RespostaAcao> {
  try {
    const r = await fetch(url, { method: metodo, headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
    return respostaDaAcao(r.status, await r.json().catch(() => null));
  } catch {
    return { ok: false, codigo: 'falha', erro: FALHA_PEDIDO };
  }
}

/** Sem sessão (ou sessão vencida): entra e volta para esta mesma página. */
export function irParaEntrar(): void {
  window.location.assign(`/entrar?voltar=${encodeURIComponent(window.location.pathname + window.location.search)}`);
}
```

`lib/cliente/salvos.ts`:
```ts
import { useEffect, useSyncExternalStore } from 'react';
import { bloqueioSalvar, lerPlano, type NivelConta } from '../limitesConta';
import type { MapaSalvos, StatusSalvo } from '../salvos';
import { lerConta } from './conta';
import { pedirJson, type RespostaAcao } from './pedido';

/**
 * Salvos da conta no navegador: um GET /api/salvos por carga de página (só com conta; sem conta nem pergunta) e um
 * estado único que todos os botões da página leem (useSyncExternalStore). O servidor decide de verdade (limites, dono).
 */

export type EstadoSalvos =
  | { fase: 'carregando' }
  | { fase: 'anonimo' }
  | { fase: 'erro' }
  | { fase: 'pronto'; plano: NivelConta; limite: number; usados: number; salvos: MapaSalvos };

const INICIAL: EstadoSalvos = { fase: 'carregando' };
let estado: EstadoSalvos = INICIAL;
let pedido: Promise<void> | null = null;
const ouvintes = new Set<() => void>();

function publicar(novo: EstadoSalvos): void {
  estado = novo;
  for (const f of ouvintes) f();
}

export function estadoDaResposta(ok: boolean, corpo: unknown): EstadoSalvos {
  const c = (typeof corpo === 'object' && corpo !== null ? corpo : {}) as Record<string, unknown>;
  if (ok && c.conta === false) return { fase: 'anonimo' };
  if (!ok || c.conta !== true || typeof c.salvos !== 'object' || c.salvos === null) return { fase: 'erro' };
  return { fase: 'pronto', plano: lerPlano(c.plano), limite: Number(c.limite ?? 0), usados: Number(c.usados ?? 0), salvos: c.salvos as MapaSalvos };
}

export type Acao = { status: StatusSalvo } | { remover: true };

export function aplicarAcao(e: EstadoSalvos, id: string, a: Acao): EstadoSalvos {
  if (e.fase !== 'pronto') return e;
  const salvos: MapaSalvos = { ...e.salvos };
  if ('remover' in a) delete salvos[id];
  else salvos[id] = { status: a.status, nota: e.salvos[id]?.nota ?? false };
  return { ...e, salvos, usados: Object.values(salvos).filter((s) => s.status !== 'descartado').length };
}

export type AcaoBotao = 'carregando' | 'entrar' | 'bloqueado' | 'salvar' | 'remover';

/** Um toque no "Salvar": entrar, convite aos planos (grátis ou no limite), salvar ou remover. Erro ao carregar: tenta salvar (o servidor responde). */
export function acaoDoBotao(e: EstadoSalvos, id: string): AcaoBotao {
  if (e.fase === 'carregando') return 'carregando';
  if (e.fase === 'anonimo') return 'entrar';
  if (e.fase === 'erro') return 'salvar';
  const atual = e.salvos[id];
  if (atual && atual.status !== 'descartado') return 'remover';
  return bloqueioSalvar(e.plano, e.usados) ? 'bloqueado' : 'salvar';
}

export function carregarSalvos(): Promise<void> {
  pedido ??= lerConta()
    .then(async (email) => {
      if (!email) return publicar({ fase: 'anonimo' });
      const r = await fetch('/api/salvos', { cache: 'no-store' });
      publicar(estadoDaResposta(r.ok, await r.json().catch(() => null)));
    })
    .catch(() => publicar({ fase: 'erro' }));
  return pedido;
}

/** Depois de sair (e nos testes): o próximo uso pergunta de novo. */
export function esquecerSalvos(): void {
  pedido = null;
  publicar(INICIAL);
}

export function useSalvos(): EstadoSalvos {
  useEffect(() => {
    void carregarSalvos();
  }, []);
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => {
        ouvintes.delete(f);
      };
    },
    () => estado,
    () => INICIAL,
  );
}

/** Salvar, descartar (POST) ou remover (DELETE); aceito, atualiza todos os botões da página. */
export async function mudarSalvo(id: string, a: Acao): Promise<RespostaAcao> {
  const r = 'remover' in a ? await pedirJson('/api/salvos', 'DELETE', { id }) : await pedirJson('/api/salvos', 'POST', { id, status: a.status });
  if (r.ok) publicar(aplicarAcao(estado, id, a));
  return r;
}

/** Minhas Oportunidades: status e/ou observação (PATCH). */
export function atualizarSalvo(id: string, mudanca: { status?: StatusSalvo; observacao?: string | null }): Promise<RespostaAcao> {
  return pedirJson('/api/salvos', 'PATCH', { id, ...mudanca });
}
```

Run: `npx vitest run lib/cliente/pedido.test.ts lib/cliente/salvos.test.ts` → PASS.

- [ ] **Step 4: Ícone e componentes**

Em `components/inicio/Icones.tsx`, acrescente ao fim:
```tsx
export function IconeSalvar({ className, cheio = false }: P & { cheio?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={cheio ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M6 3h12v18l-6-4-6 4z" />
    </svg>
  );
}

export function IconeMais({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}
```

Crie `components/oportunidades/AvisoPlano.tsx`:
```tsx
'use client';

import Link from 'next/link';

/** Balão junto ao botão: convite aos planos (grátis ou no limite) ou erro. Fica por cima do card (z-30). */
export function AvisoPlano({ mensagem, planos, aoFechar }: { mensagem: string; planos: boolean; aoFechar: () => void }) {
  return (
    <span role="status" className="absolute right-0 top-full z-30 mt-2 flex w-72 max-w-[calc(100vw-32px)] flex-col gap-2 rounded-md border border-pin bg-pin-soft p-3 text-left text-[13px] font-normal text-ink">
      <span className="font-semibold">{mensagem}</span>
      <span className="flex flex-wrap items-center gap-2">
        {planos ? (
          <Link href="/planos" className="inline-flex h-11 items-center rounded-sm bg-pin px-4 text-[13px] font-semibold text-on-pin">
            Ver planos
          </Link>
        ) : null}
        <button type="button" onClick={aoFechar} className="inline-flex h-11 items-center rounded-sm px-3 text-[13px] font-semibold hover:bg-raised">
          Fechar
        </button>
      </span>
    </span>
  );
}
```

Crie `components/oportunidades/BotaoSalvar.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { IconeSalvar } from '@/components/inicio/Icones';
import { irParaEntrar } from '@/lib/cliente/pedido';
import { acaoDoBotao, mudarSalvo, useSalvos } from '@/lib/cliente/salvos';
import { bloqueioSalvar } from '@/lib/limitesConta';
import { CONFIRMAR_REMOVER, precisaConfirmar } from '@/lib/salvos';
import { AvisoPlano } from './AvisoPlano';

const ICONE = 'inline-flex size-11 items-center justify-center rounded-sm text-ink-muted hover:bg-sunken aria-pressed:text-pin-strong';
const BOTAO =
  'inline-flex h-11 items-center gap-2 rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken aria-pressed:border-pin aria-pressed:bg-pin-soft aria-pressed:text-pin-strong';

/**
 * Salvar um edital (ícone nos cards; botão na página do edital). Salvo vira "Salvo"; tocar de novo remove (confirma se
 * tiver status além de "Salvo" ou observação). Sem conta: /entrar e volta. Grátis ou no limite: convite aos planos.
 */
export function BotaoSalvar({ id, variante = 'icone' }: { id: string; variante?: 'icone' | 'botao' }) {
  const estado = useSalvos();
  const [aviso, setAviso] = useState<{ mensagem: string; planos: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const atual = estado.fase === 'pronto' ? estado.salvos[id] : undefined;
  const salvo = atual !== undefined && atual.status !== 'descartado';

  async function tocar() {
    const acao = acaoDoBotao(estado, id);
    if (acao === 'carregando' || ocupado) return;
    if (acao === 'entrar') return irParaEntrar();
    if (acao === 'bloqueado' && estado.fase === 'pronto') {
      setAviso({ mensagem: bloqueioSalvar(estado.plano, estado.usados)?.mensagem ?? '', planos: true });
      return;
    }
    if (acao === 'remover' && atual && precisaConfirmar(atual) && !window.confirm(CONFIRMAR_REMOVER)) return;
    setOcupado(true);
    const r = await mudarSalvo(id, acao === 'remover' ? { remover: true } : { status: 'salvo' });
    setOcupado(false);
    if (r.ok) return setAviso(null);
    if (r.codigo === 'entrar') return irParaEntrar();
    setAviso({ mensagem: r.erro, planos: r.codigo !== 'falha' });
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => void tocar()}
        aria-pressed={salvo}
        aria-busy={ocupado || undefined}
        aria-label={variante === 'icone' ? (salvo ? 'Salvo. Tocar remove dos salvos' : 'Salvar edital') : undefined}
        title={variante === 'icone' ? (salvo ? 'Salvo' : 'Salvar') : undefined}
        className={variante === 'icone' ? ICONE : BOTAO}
      >
        <IconeSalvar cheio={salvo} className="size-5" />
        {variante === 'botao' ? (salvo ? 'Salvo' : 'Salvar') : null}
      </button>
      {aviso ? <AvisoPlano mensagem={aviso.mensagem} planos={aviso.planos} aoFechar={() => setAviso(null)} /> : null}
    </span>
  );
}
```

Crie `components/oportunidades/BotaoDescartar.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { irParaEntrar } from '@/lib/cliente/pedido';
import { mudarSalvo, useSalvos } from '@/lib/cliente/salvos';
import { bloqueioSalvar, LIMITES_CONTA } from '@/lib/limitesConta';
import { AvisoPlano } from './AvisoPlano';

const CLASSE = 'inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken';

/** Página do edital: "Descartar" (some do Meu Radar; fica na aba Descartados). Descartado: "Descartado · Desfazer". */
export function BotaoDescartar({ id }: { id: string }) {
  const estado = useSalvos();
  const [aviso, setAviso] = useState<{ mensagem: string; planos: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const atual = estado.fase === 'pronto' ? estado.salvos[id] : undefined;
  const descartado = atual?.status === 'descartado';

  async function tocar() {
    if (estado.fase === 'carregando' || ocupado) return;
    if (estado.fase === 'anonimo') return irParaEntrar();
    if (estado.fase === 'pronto' && LIMITES_CONTA[estado.plano].salvos === 0) {
      setAviso({ mensagem: bloqueioSalvar(estado.plano, 0)?.mensagem ?? '', planos: true });
      return;
    }
    if (descartado && atual?.nota && !window.confirm('Desfazer o descarte? A observação deste edital também sai.')) return;
    setOcupado(true);
    const r = await mudarSalvo(id, descartado ? { remover: true } : { status: 'descartado' });
    setOcupado(false);
    if (r.ok) return setAviso(null);
    if (r.codigo === 'entrar') return irParaEntrar();
    setAviso({ mensagem: r.erro, planos: r.codigo !== 'falha' });
  }

  return (
    <span className="relative inline-flex">
      <button type="button" onClick={() => void tocar()} aria-pressed={descartado} aria-busy={ocupado || undefined} className={CLASSE}>
        {descartado ? 'Descartado · Desfazer' : 'Descartar'}
      </button>
      {aviso ? <AvisoPlano mensagem={aviso.mensagem} planos={aviso.planos} aoFechar={() => setAviso(null)} /> : null}
    </span>
  );
}
```

Crie `components/oportunidades/MenuCardRadar.tsx`:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconeMais } from '@/components/inicio/Icones';
import { irParaEntrar } from '@/lib/cliente/pedido';
import { mudarSalvo } from '@/lib/cliente/salvos';
import { AvisoPlano } from './AvisoPlano';

/** Menu do card do Meu Radar: "Descartar" (o card sai do radar; o edital vai para a aba Descartados). */
export function MenuCardRadar({ id }: { id: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [aviso, setAviso] = useState<{ mensagem: string; planos: boolean } | null>(null);

  async function descartar() {
    setAberto(false);
    const r = await mudarSalvo(id, { status: 'descartado' });
    if (r.ok) return router.refresh();
    if (r.codigo === 'entrar') return irParaEntrar();
    setAviso({ mensagem: r.erro, planos: r.codigo !== 'falha' });
  }

  return (
    <span className="relative inline-flex" onKeyDown={(e) => (e.key === 'Escape' ? setAberto(false) : undefined)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label="Mais ações"
        onClick={() => setAberto((a) => !a)}
        className="inline-flex size-11 items-center justify-center rounded-sm text-ink-muted hover:bg-sunken"
      >
        <IconeMais className="size-5" />
      </button>
      {aberto ? (
        <span role="menu" aria-label="Ações do edital" className="absolute right-0 top-full z-30 mt-1 flex w-44 flex-col rounded-md border border-line bg-raised p-1">
          <button role="menuitem" type="button" autoFocus onClick={() => void descartar()} className="flex h-11 items-center rounded-sm px-3 text-left text-sm font-semibold hover:bg-sunken">
            Descartar
          </button>
        </span>
      ) : null}
      {aviso ? <AvisoPlano mensagem={aviso.mensagem} planos={aviso.planos} aoFechar={() => setAviso(null)} /> : null}
    </span>
  );
}
```

- [ ] **Step 5: Botões nos cards e na página do edital**

Em `components/inicio/CardLista.tsx`:
1. Acrescente os imports `import { BotaoSalvar } from '@/components/oportunidades/BotaoSalvar';` e `import { MenuCardRadar } from '@/components/oportunidades/MenuCardRadar';`.
2. Troque a assinatura por `export function CardLista({ edital: e, agora, acoes = 'salvar' }: { edital: EditalResumo; agora: Date; acoes?: 'salvar' | 'radar' }) {`.
3. Dentro da primeira `<div className="flex flex-wrap items-center gap-2">`, depois de `{tipo ? … : null}`, acrescente:
```tsx
        {/* Por cima do link que cobre o card (z-10): salvar e, no Meu Radar, o menu com "Descartar". */}
        <span className="relative z-10 -my-2 ml-auto flex">
          <BotaoSalvar id={e.id} />
          {acoes === 'radar' ? <MenuCardRadar id={e.id} /> : null}
        </span>
```
4. No comentário do componente, acrescente a frase: "Salvar (e, no radar, Descartar) fica por cima do link."

Em `components/inicio/CardCompacto.tsx`, acrescente `import { BotaoSalvar } from '@/components/oportunidades/BotaoSalvar';` e, dentro do último `<span className="flex flex-wrap items-center gap-1.5">`, depois do bloco `{edital.relevancia ? … : null}`, acrescente:
```tsx
        <span className="relative z-10 -my-2 ml-auto inline-flex">
          <BotaoSalvar id={edital.id} />
        </span>
```

Em `app/edital/[slug]/page.tsx`, acrescente os imports `import { BotaoDescartar } from '@/components/oportunidades/BotaoDescartar';` e `import { BotaoSalvar } from '@/components/oportunidades/BotaoSalvar';` e, na `<div className="flex flex-wrap gap-2">` dos botões do cabeçalho, logo depois de `<BotaoCompartilhar … />`, acrescente:
```tsx
            <BotaoSalvar id={e.id} variante="botao" />
            <BotaoDescartar id={e.id} />
```

- [ ] **Step 6: Descartados fora do Meu Radar e cartão "Editais salvos" (teste primeiro)**

Em `lib/servidor/radar.test.ts`, acrescente ao `describe('editaisDoRadar', …)`:
```ts
  it('descartados vão em p_sem_ids (sem descartados: nulo)', async () => {
    m.dados = [];
    await editaisDoRadar({ ...RADAR, termos: ['jaleco'] }, { ordem: null, pagina: 1, limite: 20 }, ['b', 'a']);
    expect(m.chamadas[0].args).toMatchObject({ p_sem_ids: ['b', 'a'] });
    await editaisDoRadar({ ...RADAR, termos: ['botina'] }, { ordem: null, pagina: 1, limite: 20 });
    expect(m.chamadas[1].args).toMatchObject({ p_sem_ids: null });
  });
```
e ao `describe('contagensDoRadar', …)`:
```ts
  it('contagens também sem os descartados', async () => {
    m.dados = { total: 1, novas: 0, prazo_proximo: 0 };
    await contagensDoRadar(RADAR, '2026-10-17T10:00:00.000Z', ['a']);
    expect(m.chamadas[0].args).toMatchObject({ p_sem_ids: ['a'] });
  });
```
Run: `npx vitest run lib/servidor/radar.test.ts` → FAIL. Em `lib/servidor/radar.ts`:
```ts
export function editaisDoRadar(
  r: Radar,
  o: { ordem: Ordem | null; pagina: number; limite: number },
  semIds: readonly string[] = [],
): Promise<ResultadoBusca> {
  return cache(`radar:${JSON.stringify([r, o, semIds])}`, async () => {
    const b = buscaDoRadar(r);
    const { data, error } = await supabaseServidor().rpc('buscar_editais', { ...argumentosRadar(r, o), p_sem_ids: semIds.length ? semIds : null });
```
(o resto igual) e
```ts
/** Os três cartões numa chamada (radar_contagens), sem os descartados da conta. Sem cache: "desde" muda a cada visita. */
export async function contagensDoRadar(r: Radar, desde: string, semIds: readonly string[] = []): Promise<ContagensRadar> {
  const { data, error } = await supabaseServidor()
    .rpc('radar_contagens', { ...filtrosDoRadar(r), p_desde: desde, p_sem_ids: semIds.length ? semIds : null })
    .single();
```
(o resto igual). Run → PASS.

Em `components/radar/CartoesRadar.tsx`, troque o arquivo por:
```tsx
import Link from 'next/link';
import { numero } from '@/lib/formato';
import type { ContagensRadar } from '@/lib/radar';
import type { FiltroStatus } from '@/lib/salvos';

const CARTAO = 'flex flex-col gap-1 rounded-md border border-line bg-raised p-4';

/** Cartões com contagens reais do radar e, com a conta, "Editais salvos" (no máximo 4). */
export function CartoesRadar({ contagens, primeiraVisita, salvos }: { contagens: ContagensRadar; primeiraVisita: boolean; salvos?: Record<FiltroStatus, number> }) {
  const cartoes = [
    { rotulo: 'Oportunidades para o seu perfil', valor: contagens.total, nota: 'Editais abertos que combinam com o seu radar' },
    { rotulo: primeiraVisita ? 'Novas nas últimas 24 horas' : 'Novas desde a sua última visita', valor: contagens.novas, nota: 'Publicadas no PNCP' },
    { rotulo: 'Prazo próximo', valor: contagens.prazoProximo, nota: 'Encerram em até 7 dias' },
  ];
  return (
    <section aria-label="Resumo do radar" className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${salvos ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
      {cartoes.map((c) => (
        <div key={c.rotulo} className={CARTAO}>
          <p className="text-[13px] font-semibold text-ink-muted">{c.rotulo}</p>
          <p className="font-mono text-[28px] font-semibold leading-none">{numero(c.valor)}</p>
          <p className="text-xs text-ink-muted">{c.nota}</p>
        </div>
      ))}
      {salvos ? (
        <Link href="/oportunidades" prefetch={false} className={`${CARTAO} hover:border-line-strong`}>
          <span className="text-[13px] font-semibold text-ink-muted">Editais salvos</span>
          <span className="font-mono text-[28px] font-semibold leading-none">{numero(salvos.todos)}</span>
          <span className="text-xs text-ink-muted">
            {numero(salvos.analise)} em análise · {numero(salvos.participar)} vou participar
          </span>
        </Link>
      ) : null}
    </section>
  );
}
```

Em `app/radar/page.tsx`:
1. Imports: `import { contarPorStatus, idsDescartados } from '@/lib/salvos';` e `import { estadoDosSalvos } from '@/lib/servidor/salvos';`.
2. Troque `const [radar, perfil] = await Promise.all([lerRadar(usuario), perfilDaConta(usuario)]);` por
```tsx
  const [radar, perfil, salvos] = await Promise.all([lerRadar(usuario), perfilDaConta(usuario), estadoDosSalvos(usuario)]);
```
3. Logo depois de `const { desde, primeira } = desdeDaVisita(perfil.ultimaVisitaRadar, agora);`, acrescente
```tsx
  // Descartados somem do radar (lista, total e cartões); ficam na aba Descartados de Minhas Oportunidades.
  const descartados = idsDescartados(salvos);
```
4. Troque `contagensDoRadar(radar, desde),` por `contagensDoRadar(radar, desde, descartados),` e `editaisDoRadar(radar, { ordem: nav.ordem, pagina: vista.pagina, limite: vista.limite }),` por `editaisDoRadar(radar, { ordem: nav.ordem, pagina: vista.pagina, limite: vista.limite }, descartados),`.
5. Troque `<CartoesRadar contagens={contagens} primeiraVisita={primeira} />` por `<CartoesRadar contagens={contagens} primeiraVisita={primeira} salvos={contarPorStatus(Object.values(salvos).map((s) => s.status))} />`.
6. Troque `<CardLista key={e.id} edital={e} agora={agora} />` por `<CardLista key={e.id} edital={e} agora={agora} acoes="radar" />`.

Em `components/conta/MenuConta.tsx`, logo depois do item "Editar meu radar", acrescente:
```tsx
          <Link role="menuitem" href="/oportunidades" prefetch={false} className={ITEM} onClick={() => setAberto(false)}>
            Minhas Oportunidades
          </Link>
          <Link role="menuitem" href="/alertas" prefetch={false} className={ITEM} onClick={() => setAberto(false)}>
            Alertas
          </Link>
```
e, em `sairDaConta`, depois de `esquecerConta();`, acrescente `esquecerSalvos();` (import `import { esquecerSalvos } from '@/lib/cliente/salvos';`). Atualize o comentário do componente: "(e-mail, Meu Radar, Editar meu radar, Minhas Oportunidades, Alertas, Sair)".

- [ ] **Step 7: Guarda da interface**

Crie `scripts/oportunidades-ui.test.ts`:
```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

describe('salvar e descartar na interface', () => {
  it('Salvar nos cards da lista, do radar e na página do edital; Descartar no edital e no menu do card do radar', () => {
    expect(ler('components/inicio/CardLista.tsx')).toContain('<BotaoSalvar id={e.id} />');
    expect(ler('components/inicio/CardLista.tsx')).toContain("{acoes === 'radar' ? <MenuCardRadar id={e.id} /> : null}");
    expect(ler('components/inicio/CardCompacto.tsx')).toContain('<BotaoSalvar id={edital.id} />');
    const edital = ler('app/edital/[slug]/page.tsx');
    expect(edital).toContain('<BotaoSalvar id={e.id} variante="botao" />');
    expect(edital).toContain('<BotaoDescartar id={e.id} />');
    expect(ler('app/radar/page.tsx')).toContain('acoes="radar"');
  });
  it('descartados fora do radar (lista e cartões); cartão "Editais salvos"', () => {
    const radar = ler('app/radar/page.tsx');
    expect(radar).toContain('contagensDoRadar(radar, desde, descartados)');
    expect(radar).toContain('}, descartados),');
    expect(ler('components/radar/CartoesRadar.tsx')).toContain('Editais salvos');
  });
  it('nenhum componente fala com o banco nem lê segredos', () => {
    for (const f of ['components/oportunidades/BotaoSalvar.tsx', 'components/oportunidades/BotaoDescartar.tsx', 'components/oportunidades/MenuCardRadar.tsx', 'lib/cliente/salvos.ts']) {
      const t = ler(f);
      expect(t, f).not.toContain('supabase');
      expect(t, f).not.toContain('process.env');
    }
  });
  it('menu da conta leva a Minhas Oportunidades e Alertas', () => {
    const menu = ler('components/conta/MenuConta.tsx');
    expect(menu).toContain('href="/oportunidades"');
    expect(menu).toContain('href="/alertas"');
  });
});
```

- [ ] **Step 8: Verificação completa e commit**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS (inclui `scripts/prefetch-edital.test.ts`, `scripts/celular.test.ts` e `scripts/lista.test.ts`; se a guarda da lista reclamar do card, ajustar o card, não a guarda).
```bash
git add lib/cliente/pedido.ts lib/cliente/pedido.test.ts lib/cliente/salvos.ts lib/cliente/salvos.test.ts components/oportunidades components/inicio/Icones.tsx components/inicio/CardLista.tsx components/inicio/CardCompacto.tsx "app/edital/[slug]/page.tsx" lib/servidor/radar.ts lib/servidor/radar.test.ts app/radar/page.tsx components/radar/CartoesRadar.tsx components/conta/MenuConta.tsx scripts/oportunidades-ui.test.ts
git commit -m "feat(salvos): salvar e descartar nos cards, no edital e no Meu Radar" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 6: Minhas Oportunidades (/oportunidades)

**Files:**
- Create: `app/oportunidades/page.tsx`, `components/oportunidades/LinhaOportunidade.tsx`, `components/conta/CartaoRecursoPlano.tsx`
- Test: `scripts/oportunidades-ui.test.ts` (acrescentar)

**Interfaces:**
- Consumes: `salvosDaConta` (Task 4); `planoDaConta`, `avisoPlanoNavegador`, `LIMITES_CONTA`, `MENSAGENS_LIMITE_CONTA` (Task 3); `lerNavegacaoSalvos`, `urlDosSalvos`, `salvosDaAba`, `contarPorStatus`, `FILTROS_STATUS`, `ROTULO_FILTRO`, `ROTULO_STATUS`, `STATUS_SALVO`, `situacaoOficial`, `TEXTO_STATUS_PESSOAL`, `CONFIRMAR_REMOVER`, `MAX_OBSERVACAO`, `precisaConfirmar` (`lib/salvos.ts`); `atualizarSalvo`, `mudarSalvo` (Task 5); `usuarioAtual`; `contextoDaPagina`; `paraUrlSearchParams` (`lib/urlBusca.ts`); `prazo`, `moeda`, `dataHora` (`lib/formato.ts`); `TAG_PRAZO` (`components/estilosPrazo.ts`); `assunto`, `nomeProprio` (`lib/texto.ts`).
- Produces: página `/oportunidades` (noindex; sem sessão → `/entrar?voltar=/oportunidades`); `<CartaoRecursoPlano titulo texto />` (usado também na Task 8).

- [ ] **Step 1: Guarda da página (falhando)**

Em `scripts/oportunidades-ui.test.ts`, acrescente:
```ts
describe('Minhas Oportunidades', () => {
  const pagina = ler('app/oportunidades/page.tsx');
  const linha = ler('components/oportunidades/LinhaOportunidade.tsx');
  it('exige conta, fora do Google, texto fixo dos status', () => {
    expect(pagina).toContain('usuarioAtual()');
    expect(pagina).toContain("redirect('/entrar?voltar=/oportunidades')");
    expect(pagina).toContain('robots: { index: false, follow: false }');
    expect(pagina).toContain('{TEXTO_STATUS_PESSOAL}');
  });
  it('abas com contagem, ordem por prazo e por data de salvamento', () => {
    expect(pagina).toContain('FILTROS_STATUS.map(');
    expect(pagina).toContain('contagem[f]');
    expect(pagina).toContain('Prazo');
    expect(pagina).toContain('Data em que salvei');
  });
  it('linha: status, observação que salva ao sair do campo, abrir e remover com confirmação', () => {
    expect(linha).toContain('onBlur={() => void salvarObservacao()}');
    expect(linha).toContain('Salvo ✓');
    expect(linha).toContain('maxLength={MAX_OBSERVACAO}');
    expect(linha).toContain('prefetch={false}');
    expect(linha).toContain('Abrir edital');
    expect(linha).toContain('window.confirm(CONFIRMAR_REMOVER)');
    expect(linha).toContain('situacaoOficial(');
  });
});
```
Run: `npx vitest run scripts/oportunidades-ui.test.ts` → FAIL (`ENOENT … app/oportunidades/page.tsx`).

- [ ] **Step 2: Cartão de convite aos planos**

Crie `components/conta/CartaoRecursoPlano.tsx`:
```tsx
import Link from 'next/link';

/** Convite ao Pro para um recurso da conta (salvos, alertas, resumo semanal): leva à página Planos. */
export function CartaoRecursoPlano({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <section role="status" className="flex flex-col gap-3 rounded-lg border border-pin bg-pin-soft p-5 text-ink">
      <h2 className="text-[17px] font-bold leading-snug">{titulo}</h2>
      <p className="text-[15px] text-ink-muted">{texto}</p>
      <Link href="/planos" className="inline-flex h-11 w-fit items-center rounded-sm bg-pin px-5 text-sm font-semibold text-on-pin">
        Conhecer o Pro
      </Link>
    </section>
  );
}
```

- [ ] **Step 3: Linha de cada edital salvo**

Crie `components/oportunidades/LinhaOportunidade.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { TAG_PRAZO } from '@/components/estilosPrazo';
import { irParaEntrar } from '@/lib/cliente/pedido';
import { atualizarSalvo, mudarSalvo } from '@/lib/cliente/salvos';
import { dataHora, moeda, prazo } from '@/lib/formato';
import { CONFIRMAR_REMOVER, MAX_OBSERVACAO, precisaConfirmar, ROTULO_STATUS, situacaoOficial, STATUS_SALVO, type SalvoDaConta, type StatusSalvo } from '@/lib/salvos';
import { assunto, nomeProprio } from '@/lib/texto';

const ROTULO = 'text-xs text-ink-muted';
const CAMPO = 'w-full rounded-sm border border-line-strong bg-raised px-3 text-[15px] text-ink';

/**
 * Um edital salvo: título, órgão, município/UF, valor, prazo, situação oficial, o status pessoal (seletor), a observação
 * (salva ao sair do campo), "Abrir edital" e "Remover". Mudar o status ou remover recarrega a página (contagens das abas).
 */
export function LinhaOportunidade({ salvo: s, agora }: { salvo: SalvoDaConta; agora: string }) {
  const router = useRouter();
  const idStatus = useId();
  const idObs = useId();
  const [obs, setObs] = useState(s.observacao ?? '');
  const [gravada, setGravada] = useState(s.observacao ?? '');
  const [estadoObs, setEstadoObs] = useState<'quieto' | 'salvando' | 'salvo'>('quieto');
  const [erro, setErro] = useState<string | null>(null);
  const quando = new Date(agora);
  const e = s.edital;
  const sit = situacaoOficial(e, quando);
  const p = e?.encerramento_em && sit !== 'Revogada' && sit !== 'Anulada' ? prazo(e.encerramento_em, quando) : null;

  function falhou(r: { codigo: string; erro: string }) {
    if (r.codigo === 'entrar') return irParaEntrar();
    setErro(r.erro);
  }

  async function mudarStatus(status: StatusSalvo) {
    setErro(null);
    const r = await atualizarSalvo(s.id, { status });
    if (!r.ok) return falhou(r);
    router.refresh();
  }

  async function salvarObservacao() {
    if (obs.trim() === gravada.trim()) return;
    setErro(null);
    setEstadoObs('salvando');
    const r = await atualizarSalvo(s.id, { observacao: obs });
    if (!r.ok) {
      setEstadoObs('quieto');
      return falhou(r);
    }
    setGravada(obs);
    setEstadoObs('salvo');
  }

  async function remover() {
    if (precisaConfirmar({ status: s.status, nota: gravada.trim().length > 0 }) && !window.confirm(CONFIRMAR_REMOVER)) return;
    const r = await mudarSalvo(s.id, { remover: true });
    if (!r.ok) return falhou(r);
    router.refresh();
  }

  return (
    <article className="flex flex-col gap-3 rounded-md border border-line bg-raised p-4">
      <div className="flex flex-wrap items-center gap-2">
        {p ? <span className={`rounded-xs px-2 py-0.5 text-xs font-semibold ${TAG_PRAZO[p.tom]}`}>{p.texto}</span> : null}
        {sit ? <span className="rounded-xs bg-sunken px-2 py-0.5 text-xs font-semibold text-ink-muted">{sit}</span> : null}
        <span className="rounded-xs bg-pin-soft px-2 py-0.5 text-xs font-semibold text-pin-strong">{ROTULO_STATUS[s.status]}</span>
      </div>
      <h2 className="text-[16px] font-bold leading-snug">{e ? assunto(e.objeto).titulo : 'Edital não disponível'}</h2>
      {e ? (
        <>
          <p className="text-[13px] text-ink-muted">
            {nomeProprio(e.orgao_nome)} · {e.municipio_nome ?? 'Município não informado'}/{e.uf}
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
            <div>
              <dt className={ROTULO}>Valor estimado</dt>
              <dd className="font-mono font-medium">{moeda(e.valor_estimado) ?? 'Valor não informado'}</dd>
            </div>
            <div>
              <dt className={ROTULO}>Propostas até</dt>
              <dd className="font-mono">{e.encerramento_em ? dataHora(e.encerramento_em) : 'Não informado'}</dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="text-[13px] text-ink-muted">O edital saiu do PNCP ou da nossa base. Você pode remover da lista.</p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[220px_1fr]">
        <label htmlFor={idStatus} className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Meu status
          <select id={idStatus} value={s.status} onChange={(ev) => void mudarStatus(ev.target.value as StatusSalvo)} className={`${CAMPO} h-11`}>
            {STATUS_SALVO.map((st) => (
              <option key={st} value={st}>
                {ROTULO_STATUS[st]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idObs} className="text-[13px] font-semibold">
            Observação
          </label>
          <textarea
            id={idObs}
            value={obs}
            maxLength={MAX_OBSERVACAO}
            rows={2}
            onChange={(ev) => {
              setObs(ev.target.value);
              setEstadoObs('quieto');
            }}
            onBlur={() => void salvarObservacao()}
            placeholder="Ex.: pedir amostra, conferir atestado"
            className={`${CAMPO} py-2`}
          />
          <span aria-live="polite" className="text-xs text-ink-muted">
            {estadoObs === 'salvando' ? 'Salvando…' : estadoObs === 'salvo' ? 'Salvo ✓' : `${obs.length}/${MAX_OBSERVACAO}`}
          </span>
        </div>
      </div>
      {erro ? (
        <p role="alert" className="text-sm font-semibold text-pin-strong">
          {erro}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {e ? (
          <Link href={`/edital/${e.slug}`} prefetch={false} className="inline-flex h-11 items-center rounded-sm bg-pin px-4 text-sm font-semibold text-on-pin">
            Abrir edital
          </Link>
        ) : null}
        <button type="button" onClick={() => void remover()} className="inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken">
          Remover
        </button>
      </div>
    </article>
  );
}
```
(A confirmação usa `precisaConfirmar`, que traz `window.confirm(CONFIRMAR_REMOVER)` logo depois; a guarda procura esse texto.)

- [ ] **Step 4: A página**

Crie `app/oportunidades/page.tsx`:
```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { CartaoRecursoPlano } from '@/components/conta/CartaoRecursoPlano';
import { LinhaOportunidade } from '@/components/oportunidades/LinhaOportunidade';
import { numero } from '@/lib/formato';
import { avisoPlanoNavegador, LIMITES_CONTA, MENSAGENS_LIMITE_CONTA } from '@/lib/limitesConta';
import { contarPorStatus, FILTROS_STATUS, lerNavegacaoSalvos, ROTULO_FILTRO, salvosDaAba, TEXTO_STATUS_PESSOAL, urlDosSalvos } from '@/lib/salvos';
import { planoDaConta } from '@/lib/servidor/conta';
import { contextoDaPagina } from '@/lib/servidor/registro';
import { salvosDaConta } from '@/lib/servidor/salvos';
import { usuarioAtual } from '@/lib/servidor/sessao';
import { paraUrlSearchParams } from '@/lib/urlBusca';

/** Página da conta: fora do Google. */
export const metadata: Metadata = { title: 'Minhas Oportunidades', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const ABA = 'inline-flex h-11 items-center gap-1.5 rounded-sm px-3 text-sm font-semibold hover:bg-sunken aria-[current=page]:bg-pin-soft aria-[current=page]:text-pin-strong';

/**
 * Minhas Oportunidades: os editais salvos da conta, por aba de status (com contagem) e ordem (prazo ou data em que
 * salvou). "Todos" não mostra os descartados (só a aba deles). Os status são da pessoa, não a situação oficial.
 */
export default async function MinhasOportunidades({ searchParams }: Props) {
  await connection();
  const usuario = await usuarioAtual();
  if (!usuario) redirect('/entrar?voltar=/oportunidades');
  const nav = lerNavegacaoSalvos(paraUrlSearchParams(await searchParams));
  const [lista, plano] = await Promise.all([salvosDaConta(usuario), planoDaConta(usuario, await contextoDaPagina())]);
  const contagem = contarPorStatus(lista.map((s) => s.status));
  const visiveis = salvosDaAba(lista, nav);
  const agora = new Date().toISOString();
  const aviso = avisoPlanoNavegador(plano);
  const max = LIMITES_CONTA[plano.plano].salvos;

  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[1080px] flex-col gap-5 px-4 py-6 lg:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">Minhas Oportunidades</h1>
          <p className="text-sm text-ink-muted">Os editais que você salvou, com o seu status e as suas observações.</p>
          <p className="text-[13px] text-ink-muted">{TEXTO_STATUS_PESSOAL}</p>
        </div>
        {aviso ? (
          <p role="note" className="rounded-sm bg-pin-soft px-3 py-2 text-[14px] text-pin-strong">
            {aviso}
          </p>
        ) : null}
        {max === 0 && lista.length === 0 ? <CartaoRecursoPlano titulo={MENSAGENS_LIMITE_CONTA.salvosPlano} texto={MENSAGENS_LIMITE_CONTA.salvosConvite} /> : null}
        <nav aria-label="Filtrar por status" className="flex flex-wrap gap-1 border-b border-line pb-2">
          {FILTROS_STATUS.map((f) => (
            <Link key={f} href={urlDosSalvos({ ...nav, status: f })} prefetch={false} aria-current={nav.status === f ? 'page' : undefined} className={ABA}>
              {ROTULO_FILTRO[f]}
              <span className="font-mono text-xs">{numero(contagem[f])}</span>
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-muted">Ordenar por</span>
          <Link href={urlDosSalvos({ ...nav, ordem: 'prazo' })} prefetch={false} aria-current={nav.ordem === 'prazo' ? 'page' : undefined} className={ABA}>
            Prazo
          </Link>
          <Link href={urlDosSalvos({ ...nav, ordem: 'salvo' })} prefetch={false} aria-current={nav.ordem === 'salvo' ? 'page' : undefined} className={ABA}>
            Data em que salvei
          </Link>
        </div>
        {visiveis.length === 0 ? (
          <section className="flex flex-col gap-2 rounded-md border border-line bg-raised p-5">
            <h2 className="text-[17px] font-bold">Nenhum edital nesta aba.</h2>
            <p className="text-[15px] text-ink-muted">Toque no ícone de salvar nos cards da busca, do Meu Radar ou na página do edital.</p>
            <Link href="/" prefetch={false} className="inline-flex h-11 w-fit items-center text-sm font-semibold text-pin-strong underline-offset-2 hover:underline">
              Buscar editais
            </Link>
          </section>
        ) : (
          <section aria-label="Editais salvos" className="flex flex-col gap-3">
            {visiveis.map((s) => (
              <LinhaOportunidade key={s.id} salvo={s} agora={agora} />
            ))}
          </section>
        )}
      </main>
    </>
  );
}
```

- [ ] **Step 5: Rodar, verificar e commitar**

Run: `npx vitest run scripts/oportunidades-ui.test.ts && npm test && npm run typecheck && npm run build`
Expected: PASS; o build lista `/oportunidades` como dinâmica (ƒ).
```bash
git add app/oportunidades components/oportunidades/LinhaOportunidade.tsx components/conta/CartaoRecursoPlano.tsx scripts/oportunidades-ui.test.ts
git commit -m "feat(salvos): página Minhas Oportunidades" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 7: Alertas: regras, servidor e API

**Files:**
- Create: `lib/alertas/regras.ts`, `lib/servidor/alertas.ts`, `app/api/alertas/[id]/route.ts`
- Modify: `app/api/alertas/route.ts` (troca o pedido por e-mail pela criação do alerta da conta)
- Test: `lib/alertas/regras.test.ts`, `lib/servidor/alertas.test.ts`, `app/api/alertas/route.test.ts`

**Interfaces:**
- Consumes: `validarRadar`, `radarDaLinha`, `linhaDoRadar`, `Radar`, `MENSAGENS_RADAR` (`lib/radar.ts`); `Resultado` (`lib/eventos.ts`); `data`, `hora`, `numero` (`lib/formato.ts`); `planoDaConta`, `bloqueioAlerta` (Task 3); `usuarioAtual`, `recusaForaDoSite`, `contexto`, `gravarEvento` (Task 4 já aceita `TipoEventoOportunidades`); tabelas `alertas`, `envios_alerta` (Task 1).
- Produces:
  - `lib/alertas/regras.ts`: `type Alerta = Radar & { nome: string }`; `type AlertaDaConta = Alerta & { id: string; ativo: boolean; criadoEm: string; ultimoEnvioEm: string | null }`; `STATUS_ENVIO`, `type StatusEnvio = 'enviado' | 'sem_novidades' | 'falhou' | 'pulado_plano'`; `type UltimoEnvio = { status: StatusEnvio; em: string; qtd: number }`; `MAX_NOME_ALERTA = 60`; `ID_UUID`; `MENSAGENS_ALERTA`; `AVISO_ENVIO_INDISPONIVEL`; `nomePadrao(termos: readonly string[]): string`; `validarAlerta(corpo: unknown): Resultado<Alerta>`; `type MudancaAlerta = { tipo: 'ativo'; ativo: boolean } | { tipo: 'alerta'; alerta: Alerta }`; `validarMudancaAlerta(corpo: unknown): Resultado<MudancaAlerta>`; `lerIdAlerta(v: unknown): string | null`; `alertaDaLinha(l: Record<string, unknown>): AlertaDaConta`; `linhaDoAlerta(a: Alerta): Record<string, unknown>`; `textoUltimoEnvio(u: UltimoEnvio | null): string`; `envioIndisponivel(ultimos: readonly (UltimoEnvio | null)[]): boolean`.
  - `lib/servidor/alertas.ts`: `type AlertaComEnvio = AlertaDaConta & { ultimoEnvio: UltimoEnvio | null }`; `alertasDaConta(usuario: Usuario): Promise<AlertaComEnvio[]>`; `lerAlerta(usuario: Usuario, id: string): Promise<AlertaDaConta | null>`; `contarAlertas(usuario: Usuario): Promise<number>`; `criarAlerta(usuario: Usuario, alerta: Alerta): Promise<string>`; `atualizarAlerta(usuario: Usuario, id: string, alerta: Alerta, agora?: Date): Promise<boolean>`; `mudarAtivoAlerta(usuario: Usuario, id: string, ativo: boolean, agora?: Date): Promise<boolean>`; `excluirAlerta(usuario: Usuario, id: string): Promise<boolean>`.
  - `POST /api/alertas` (corpo do alerta + `origem?: 'radar'`) → 201 `{ ok, id }` | 400 | 401 `{ erro, codigo: 'entrar' }` | 402 `{ erro, codigo: 'plano' | 'limite' }` | 502; `PATCH /api/alertas/{id}` (`{ ativo }` ou o alerta inteiro) → 200 | 400 | 401 | 404 | 502; `DELETE /api/alertas/{id}` → 200 | 401 | 404 | 502.

- [ ] **Step 1: Testes das regras (falhando)**

Crie `lib/alertas/regras.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { data, hora } from '../formato';
import { MENSAGENS_RADAR } from '../radar';
import {
  alertaDaLinha, envioIndisponivel, lerIdAlerta, linhaDoAlerta, MENSAGENS_ALERTA, nomePadrao, textoUltimoEnvio, validarAlerta, validarMudancaAlerta,
} from './regras';

const CORPO = { nome: '  Uniformes   no Sul ', termos: ['uniforme'], ufs: ['SC', 'PR'] };

describe('validação do alerta', () => {
  it('nome aparado + as validações do radar; user_id do corpo não passa', () => {
    const v = validarAlerta({ ...CORPO, user_id: 'outra' });
    expect(v).toEqual({
      ok: true,
      valor: { nome: 'Uniformes no Sul', termos: ['uniforme'], termosExcluir: [], ufs: ['PR', 'SC'], municipios: [], valorMin: null, valorMax: null, modalidades: [], soMeEpp: false },
    });
  });
  it('nome obrigatório, até 60', () => {
    expect(validarAlerta({ ...CORPO, nome: '   ' })).toEqual({ ok: false, erro: MENSAGENS_ALERTA.nome });
    expect(validarAlerta({ ...CORPO, nome: 'a'.repeat(61) })).toEqual({ ok: false, erro: MENSAGENS_ALERTA.nome });
    expect(validarAlerta({ ...CORPO, nome: 5 })).toEqual({ ok: false, erro: MENSAGENS_ALERTA.nome });
  });
  it('erros do radar valem para o alerta', () => {
    expect(validarAlerta({ ...CORPO, termos: [] })).toEqual({ ok: false, erro: MENSAGENS_RADAR.semTermo });
    expect(validarAlerta({ ...CORPO, municipios: ['4209102'] })).toEqual({ ok: false, erro: MENSAGENS_RADAR.local });
    expect(validarAlerta(null)).toEqual({ ok: false, erro: MENSAGENS_ALERTA.formulario });
  });
  it('mudança: { ativo } pausa ou retoma; o resto é edição completa', () => {
    expect(validarMudancaAlerta({ ativo: false })).toEqual({ ok: true, valor: { tipo: 'ativo', ativo: false } });
    expect(validarMudancaAlerta(CORPO)).toMatchObject({ ok: true, valor: { tipo: 'alerta', alerta: { nome: 'Uniformes no Sul' } } });
    expect(validarMudancaAlerta({ ativo: 'sim' })).toEqual({ ok: false, erro: MENSAGENS_ALERTA.nome });
  });
  it('nome sugerido pelos produtos, até 60', () => {
    expect(nomePadrao(['uniforme', 'luva'])).toBe('uniforme, luva');
    expect(nomePadrao(['a'.repeat(40), 'b'.repeat(40)])).toHaveLength(60);
    expect(nomePadrao([])).toBe('');
  });
  it('id do alerta é um uuid', () => {
    expect(lerIdAlerta('11111111-1111-4111-8111-111111111111')).toBe('11111111-1111-4111-8111-111111111111');
    for (const v of ['1', 'x'.repeat(36), null, 7]) expect(lerIdAlerta(v)).toBeNull();
  });
});

describe('linhas', () => {
  it('linha ↔ alerta (sem user_id na linha gravada)', () => {
    const l = {
      id: '11111111-1111-4111-8111-111111111111', nome: 'EPI', termos: ['luva'], termos_excluir: [], ufs: ['SC'], municipios: [], valor_min: '1000.00',
      valor_max: null, modalidades: [6], so_me_epp: true, ativo: false, criado_em: '2026-10-18T10:00:00+00:00', ultimo_envio_em: null,
    };
    const a = alertaDaLinha(l);
    expect(a).toMatchObject({ id: l.id, nome: 'EPI', termos: ['luva'], valorMin: 1000, modalidades: [6], soMeEpp: true, ativo: false, ultimoEnvioEm: null });
    const linha = linhaDoAlerta(a);
    expect(linha).toMatchObject({ nome: 'EPI', termos: ['luva'], valor_min: 1000, so_me_epp: true });
    expect(linha).not.toHaveProperty('user_id');
  });
});

describe('último envio', () => {
  const em = '2026-10-18T10:00:12+00:00';
  const quando = `${data(em)} às ${hora(em)}`;
  it('textos por status', () => {
    expect(textoUltimoEnvio(null)).toBe('Ainda sem envio. O primeiro sai às 7h, se houver editais novos.');
    expect(textoUltimoEnvio({ status: 'enviado', em, qtd: 1 })).toBe(`Último envio ${quando}: 1 edital.`);
    expect(textoUltimoEnvio({ status: 'enviado', em, qtd: 12 })).toBe(`Último envio ${quando}: 12 editais.`);
    expect(textoUltimoEnvio({ status: 'sem_novidades', em, qtd: 0 })).toBe(`Sem editais novos em ${quando}.`);
    expect(textoUltimoEnvio({ status: 'falhou', em, qtd: 3 })).toBe(`O envio de ${quando} falhou. Tentamos de novo às 7h.`);
    expect(textoUltimoEnvio({ status: 'pulado_plano', em, qtd: 0 })).toBe(`Não enviado em ${quando}: alertas por e-mail são do plano Pro.`);
  });
  it('envio indisponível quando o último de algum alerta falhou', () => {
    expect(envioIndisponivel([null, { status: 'enviado', em, qtd: 1 }])).toBe(false);
    expect(envioIndisponivel([{ status: 'falhou', em, qtd: 1 }])).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/alertas/regras.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar `lib/alertas/regras.ts`**

```ts
import type { Resultado } from '../eventos';
import { data, hora, numero } from '../formato';
import { linhaDoRadar, radarDaLinha, validarRadar, type Radar } from '../radar';

/**
 * Alertas da conta (Evolução, Fase 4, §3): os mesmos filtros e validações do radar (lib/radar.ts) + um nome. Puro: o
 * site e o job dos alertas usam; o dono vem só da sessão (lib/servidor/alertas.ts) ou do banco (job).
 */

export type Alerta = Radar & { nome: string };
export type AlertaDaConta = Alerta & { id: string; ativo: boolean; criadoEm: string; ultimoEnvioEm: string | null };

export const STATUS_ENVIO = ['enviado', 'sem_novidades', 'falhou', 'pulado_plano'] as const;
export type StatusEnvio = (typeof STATUS_ENVIO)[number];
export type UltimoEnvio = { status: StatusEnvio; em: string; qtd: number };

export const MAX_NOME_ALERTA = 60;
export const ID_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const MENSAGENS_ALERTA = {
  formulario: 'Formulário inválido.',
  nome: 'Dê um nome ao alerta, com até 60 caracteres.',
  entrar: 'Entre para criar alertas.',
  naoEncontrado: 'Alerta não encontrado.',
  falha: 'Não foi possível salvar o alerta agora. Tente de novo.',
} as const;

export const AVISO_ENVIO_INDISPONIVEL = 'Envio indisponível agora. Tentamos de novo amanhã às 7h.';

const objeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Nome sugerido: os produtos separados por vírgula, até 60 caracteres. */
export function nomePadrao(termos: readonly string[]): string {
  const t = termos.join(', ');
  return t.length <= MAX_NOME_ALERTA ? t : `${t.slice(0, MAX_NOME_ALERTA - 1).trimEnd()}…`.slice(0, MAX_NOME_ALERTA);
}

/** Corpo de criação/edição: nome + os campos do radar (validarRadar). Um user_id no corpo é ignorado. */
export function validarAlerta(corpo: unknown): Resultado<Alerta> {
  if (!objeto(corpo)) return { ok: false, erro: MENSAGENS_ALERTA.formulario };
  const nome = typeof corpo.nome === 'string' ? corpo.nome.trim().replace(/\s+/g, ' ') : '';
  if (!nome || nome.length > MAX_NOME_ALERTA) return { ok: false, erro: MENSAGENS_ALERTA.nome };
  const radar = validarRadar(corpo);
  if (!radar.ok) return radar;
  return { ok: true, valor: { ...radar.valor, nome } };
}

export type MudancaAlerta = { tipo: 'ativo'; ativo: boolean } | { tipo: 'alerta'; alerta: Alerta };

/** PATCH: só { ativo: boolean } pausa ou retoma; qualquer outro corpo é a edição completa. */
export function validarMudancaAlerta(corpo: unknown): Resultado<MudancaAlerta> {
  if (objeto(corpo) && Object.keys(corpo).length === 1 && typeof corpo.ativo === 'boolean') {
    return { ok: true, valor: { tipo: 'ativo', ativo: corpo.ativo } };
  }
  const v = validarAlerta(corpo);
  return v.ok ? { ok: true, valor: { tipo: 'alerta', alerta: v.valor } } : v;
}

export function lerIdAlerta(v: unknown): string | null {
  return typeof v === 'string' && ID_UUID.test(v) ? v : null;
}

/** Linha de public.alertas (numeric chega como texto) → alerta. */
export function alertaDaLinha(l: Record<string, unknown>): AlertaDaConta {
  return {
    ...radarDaLinha(l),
    nome: String(l.nome ?? ''),
    id: String(l.id),
    ativo: l.ativo !== false,
    criadoEm: String(l.criado_em),
    ultimoEnvioEm: l.ultimo_envio_em ? String(l.ultimo_envio_em) : null,
  };
}

/** Alerta → colunas de public.alertas (sem user_id: quem põe é lib/servidor/alertas.ts, da sessão). */
export function linhaDoAlerta(a: Alerta): Record<string, unknown> {
  return { ...linhaDoRadar(a), nome: a.nome };
}

/** "Último envio" na lista de /alertas. */
export function textoUltimoEnvio(u: UltimoEnvio | null): string {
  if (!u) return 'Ainda sem envio. O primeiro sai às 7h, se houver editais novos.';
  const quando = `${data(u.em)} às ${hora(u.em)}`;
  switch (u.status) {
    case 'enviado':
      return `Último envio ${quando}: ${u.qtd === 1 ? '1 edital' : `${numero(u.qtd)} editais`}.`;
    case 'sem_novidades':
      return `Sem editais novos em ${quando}.`;
    case 'falhou':
      return `O envio de ${quando} falhou. Tentamos de novo às 7h.`;
    case 'pulado_plano':
      return `Não enviado em ${quando}: alertas por e-mail são do plano Pro.`;
  }
}

export function envioIndisponivel(ultimos: readonly (UltimoEnvio | null)[]): boolean {
  return ultimos.some((u) => u?.status === 'falhou');
}
```

Run: `npx vitest run lib/alertas/regras.test.ts` → PASS.

- [ ] **Step 4: Teste do servidor (falhando)**

Crie `lib/servidor/alertas.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Alerta } from '../alertas/regras';
import type { Usuario } from './sessao';

vi.mock('server-only', () => ({}));

type Resposta = { data?: unknown; count?: number | null; error: null | { message: string } };
const m = vi.hoisted(() => ({ chamadas: [] as unknown[][], respostas: [] as Resposta[] }));
const proxima = () => Promise.resolve(m.respostas.shift() ?? { data: null, error: null });
function consulta(tabela: string) {
  const c: Record<string, unknown> = {};
  for (const metodo of ['select', 'eq', 'order', 'limit', 'insert', 'update', 'delete']) {
    c[metodo] = (...a: unknown[]) => {
      m.chamadas.push([`${tabela}.${metodo}`, ...a]);
      return c;
    };
  }
  c.maybeSingle = proxima;
  c.single = proxima;
  c.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => proxima().then(ok, ko);
  return c;
}
vi.mock('./supabase', () => ({ supabaseServidor: () => ({ from: (t: string) => consulta(t) }) }));

const { alertasDaConta, atualizarAlerta, contarAlertas, criarAlerta, excluirAlerta, lerAlerta, mudarAtivoAlerta } = await import('./alertas');
const usuario = { id: 'u-sessao', email: 'dono@empresa.com.br' } as unknown as Usuario;
const ID = '11111111-1111-4111-8111-111111111111';
const ALERTA: Alerta = { nome: 'EPI', termos: ['luva'], termosExcluir: [], ufs: ['SC'], municipios: [], valorMin: null, valorMax: null, modalidades: [], soMeEpp: false };
const LINHA = { id: ID, nome: 'EPI', termos: ['luva'], termos_excluir: [], ufs: ['SC'], municipios: [], valor_min: null, valor_max: null, modalidades: [], so_me_epp: false, ativo: true, criado_em: 'c', ultimo_envio_em: null };

beforeEach(() => {
  m.chamadas.length = 0;
  m.respostas.length = 0;
});

describe('alertas.ts: tudo pelo usuário da sessão', () => {
  it('lista os alertas da conta com o último envio de cada um', async () => {
    m.respostas.push({ data: [LINHA], error: null }, {
      data: [
        { alerta_id: ID, status: 'sem_novidades', iniciado_em: '2026-10-19T10:00:00Z', qtd_editais: 0 },
        { alerta_id: ID, status: 'enviado', iniciado_em: '2026-10-18T10:00:00Z', qtd_editais: 4 },
      ],
      error: null,
    });
    const r = await alertasDaConta(usuario);
    expect(r[0]).toMatchObject({ id: ID, nome: 'EPI', ultimoEnvio: { status: 'sem_novidades', em: '2026-10-19T10:00:00Z', qtd: 0 } });
    expect(m.chamadas).toContainEqual(['alertas.eq', 'user_id', 'u-sessao']);
    expect(m.chamadas).toContainEqual(['envios_alerta.eq', 'user_id', 'u-sessao']);
  });
  it('sem alertas: nem consulta os envios', async () => {
    m.respostas.push({ data: [], error: null });
    expect(await alertasDaConta(usuario)).toEqual([]);
    expect(m.chamadas.some((c) => String(c[0]).startsWith('envios_alerta'))).toBe(false);
  });
  it('ler, contar, criar com o user_id da sessão', async () => {
    m.respostas.push({ data: LINHA, error: null });
    expect(await lerAlerta(usuario, ID)).toMatchObject({ id: ID });
    m.respostas.push({ count: 3, error: null });
    expect(await contarAlertas(usuario)).toBe(3);
    m.respostas.push({ data: { id: ID }, error: null });
    expect(await criarAlerta(usuario, { ...ALERTA, user_id: 'outra' } as unknown as Alerta)).toBe(ID);
    const insert = m.chamadas.find((c) => c[0] === 'alertas.insert')!;
    expect(insert[1]).toMatchObject({ nome: 'EPI', termos: ['luva'], user_id: 'u-sessao' });
  });
  it('editar, pausar e excluir só o alerta da conta; nada mudado = false', async () => {
    m.respostas.push({ data: [{ id: ID }], error: null });
    expect(await atualizarAlerta(usuario, ID, ALERTA, new Date('2026-10-18T12:00:00Z'))).toBe(true);
    expect(m.chamadas).toContainEqual(['alertas.update', expect.objectContaining({ nome: 'EPI', atualizado_em: '2026-10-18T12:00:00.000Z' })]);
    m.respostas.push({ data: [], error: null });
    expect(await mudarAtivoAlerta(usuario, ID, false)).toBe(false);
    m.respostas.push({ data: [{ id: ID }], error: null });
    expect(await excluirAlerta(usuario, ID)).toBe(true);
    for (const t of ['alertas.update', 'alertas.delete']) expect(m.chamadas.some((c) => c[0] === t)).toBe(true);
    expect(m.chamadas.filter((c) => c[0] === 'alertas.eq' && c[1] === 'user_id').every((c) => c[2] === 'u-sessao')).toBe(true);
  });
});
```

Run: `npx vitest run lib/servidor/alertas.test.ts` → FAIL.

- [ ] **Step 5: Implementar `lib/servidor/alertas.ts`**

```ts
import 'server-only';
import { alertaDaLinha, linhaDoAlerta, STATUS_ENVIO, type Alerta, type AlertaDaConta, type StatusEnvio, type UltimoEnvio } from '../alertas/regras';
import type { Usuario } from './sessao';
import { supabaseServidor } from './supabase';

/**
 * Alertas da conta. Única porta do site para public.alertas e public.envios_alerta (o descadastro por link, sem
 * sessão, fica em descadastro.ts): toda função recebe o `Usuario` da sessão e filtra ou grava pelo id dele.
 */

const COLUNAS = 'id, nome, termos, termos_excluir, ufs, municipios, valor_min, valor_max, modalidades, so_me_epp, ativo, criado_em, ultimo_envio_em';

export type AlertaComEnvio = AlertaDaConta & { ultimoEnvio: UltimoEnvio | null };

export async function alertasDaConta(usuario: Usuario): Promise<AlertaComEnvio[]> {
  const sb = supabaseServidor();
  const { data, error } = await sb.from('alertas').select(COLUNAS).eq('user_id', usuario.id).order('criado_em');
  if (error) throw new Error(`alertas: ${error.message}`);
  const alertas = ((data ?? []) as Array<Record<string, unknown>>).map(alertaDaLinha);
  if (alertas.length === 0) return [];
  const envios = await sb
    .from('envios_alerta')
    .select('alerta_id, status, iniciado_em, qtd_editais')
    .eq('user_id', usuario.id)
    .order('iniciado_em', { ascending: false })
    .limit(100);
  if (envios.error) throw new Error(`envios dos alertas: ${envios.error.message}`);
  const ultimo = new Map<string, UltimoEnvio>();
  for (const l of (envios.data ?? []) as Array<Record<string, unknown>>) {
    const id = String(l.alerta_id);
    const status = String(l.status);
    if (!ultimo.has(id) && (STATUS_ENVIO as readonly string[]).includes(status)) {
      ultimo.set(id, { status: status as StatusEnvio, em: String(l.iniciado_em), qtd: Number(l.qtd_editais ?? 0) });
    }
  }
  return alertas.map((a) => ({ ...a, ultimoEnvio: ultimo.get(a.id) ?? null }));
}

export async function lerAlerta(usuario: Usuario, id: string): Promise<AlertaDaConta | null> {
  const { data, error } = await supabaseServidor().from('alertas').select(COLUNAS).eq('user_id', usuario.id).eq('id', id).maybeSingle();
  if (error) throw new Error(`alerta: ${error.message}`);
  return data ? alertaDaLinha(data as Record<string, unknown>) : null;
}

/** Alertas da conta, ativos e pausados (os dois contam no limite do plano). */
export async function contarAlertas(usuario: Usuario): Promise<number> {
  const { count, error } = await supabaseServidor().from('alertas').select('id', { count: 'exact', head: true }).eq('user_id', usuario.id);
  if (error) throw new Error(`contar alertas: ${error.message}`);
  return count ?? 0;
}

export async function criarAlerta(usuario: Usuario, alerta: Alerta): Promise<string> {
  const { data, error } = await supabaseServidor()
    .from('alertas')
    .insert({ ...linhaDoAlerta(alerta), user_id: usuario.id })
    .select('id')
    .single();
  if (error) throw new Error(`criar alerta: ${error.message}`);
  return String((data as { id: unknown }).id);
}

export async function atualizarAlerta(usuario: Usuario, id: string, alerta: Alerta, agora: Date = new Date()): Promise<boolean> {
  const { data, error } = await supabaseServidor()
    .from('alertas')
    .update({ ...linhaDoAlerta(alerta), atualizado_em: agora.toISOString() })
    .eq('user_id', usuario.id)
    .eq('id', id)
    .select('id');
  if (error) throw new Error(`editar alerta: ${error.message}`);
  return ((data ?? []) as unknown[]).length > 0;
}

/** Pausar (false) ou retomar (true). Pausar não apaga o alerta nem o que já foi enviado. */
export async function mudarAtivoAlerta(usuario: Usuario, id: string, ativo: boolean, agora: Date = new Date()): Promise<boolean> {
  const { data, error } = await supabaseServidor()
    .from('alertas')
    .update({ ativo, atualizado_em: agora.toISOString() })
    .eq('user_id', usuario.id)
    .eq('id', id)
    .select('id');
  if (error) throw new Error(`pausar alerta: ${error.message}`);
  return ((data ?? []) as unknown[]).length > 0;
}

export async function excluirAlerta(usuario: Usuario, id: string): Promise<boolean> {
  const { data, error } = await supabaseServidor().from('alertas').delete().eq('user_id', usuario.id).eq('id', id).select('id');
  if (error) throw new Error(`excluir alerta: ${error.message}`);
  return ((data ?? []) as unknown[]).length > 0;
}
```

Run: `npx vitest run lib/servidor/alertas.test.ts` → PASS.

- [ ] **Step 6: Teste das rotas (falhando)**

Crie `app/api/alertas/route.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MENSAGENS_ALERTA } from '@/lib/alertas/regras';
import { MENSAGENS_LIMITE_CONTA } from '@/lib/limitesConta';

vi.mock('server-only', () => ({}));

const ID = '11111111-1111-4111-8111-111111111111';
const m = vi.hoisted(() => ({
  usuario: { id: 'u-sessao', email: 'dono@empresa.com.br' } as null | { id: string; email: string },
  plano: 'pro' as 'gratis' | 'pro',
  qtd: 0,
  criarAlerta: vi.fn(),
  atualizarAlerta: vi.fn(),
  mudarAtivoAlerta: vi.fn(),
  excluirAlerta: vi.fn(),
  gravarEvento: vi.fn(async (..._a: unknown[]) => undefined),
}));
vi.mock('@/lib/servidor/sessao', () => ({ usuarioAtual: async () => m.usuario }));
vi.mock('@/lib/servidor/conta', () => ({ planoDaConta: async () => ({ plano: m.plano, daConta: m.plano, doNavegador: 'gratis' }) }));
vi.mock('@/lib/servidor/alertas', () => ({
  contarAlertas: async () => m.qtd,
  criarAlerta: m.criarAlerta, atualizarAlerta: m.atualizarAlerta, mudarAtivoAlerta: m.mudarAtivoAlerta, excluirAlerta: m.excluirAlerta,
}));
vi.mock('@/lib/servidor/registro', () => ({
  contexto: async () => ({ visitante: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b', interno: false, ipHash: null }),
  gravarEvento: m.gravarEvento,
}));

const { POST } = await import('./route');
const porId = await import('./[id]/route');
const cab = { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' };
const req = (url: string, metodo: string, corpo: unknown, extra: Record<string, string> = {}) =>
  new Request(`http://localhost${url}`, { method: metodo, headers: { ...cab, ...extra }, body: JSON.stringify(corpo) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const CORPO = { nome: 'Uniformes', termos: ['uniforme'], ufs: ['SC'] };

beforeEach(() => {
  vi.clearAllMocks();
  m.usuario = { id: 'u-sessao', email: 'dono@empresa.com.br' };
  m.plano = 'pro';
  m.qtd = 0;
  m.criarAlerta.mockResolvedValue(ID);
  m.atualizarAlerta.mockResolvedValue(true);
  m.mudarAtivoAlerta.mockResolvedValue(true);
  m.excluirAlerta.mockResolvedValue(true);
});

describe('POST /api/alertas', () => {
  it('outro site 403; sem sessão 401', async () => {
    expect((await POST(req('/api/alertas', 'POST', CORPO, { 'sec-fetch-site': 'cross-site' }))).status).toBe(403);
    m.usuario = null;
    const r = await POST(req('/api/alertas', 'POST', CORPO));
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ erro: MENSAGENS_ALERTA.entrar, codigo: 'entrar' });
    expect(m.criarAlerta).not.toHaveBeenCalled();
  });
  it('grátis: 402 plano; Pro com 5: 402 limite', async () => {
    m.plano = 'gratis';
    expect(await (await POST(req('/api/alertas', 'POST', CORPO))).json()).toEqual({ erro: MENSAGENS_LIMITE_CONTA.alertasPlano, codigo: 'plano' });
    m.plano = 'pro';
    m.qtd = 5;
    const r = await POST(req('/api/alertas', 'POST', CORPO));
    expect(r.status).toBe(402);
    expect((await r.json()).codigo).toBe('limite');
    expect(m.criarAlerta).not.toHaveBeenCalled();
  });
  it('cria na conta da sessão (user_id do corpo ignorado) e conta alerta_criado sem e-mail', async () => {
    const r = await POST(req('/api/alertas', 'POST', { ...CORPO, user_id: 'outra', origem: 'radar' }));
    expect(r.status).toBe(201);
    expect(await r.json()).toEqual({ ok: true, id: ID });
    const [usuario, alerta] = m.criarAlerta.mock.calls[0] as [{ id: string }, Record<string, unknown>];
    expect(usuario.id).toBe('u-sessao');
    expect(alerta).not.toHaveProperty('user_id');
    expect(m.gravarEvento).toHaveBeenCalledWith(expect.anything(), 'alerta_criado', { termos: 1, ufs: 1, municipios: 0, origem: 'radar', plano: 'pro' });
  });
  it('inválido 400; banco fora 502', async () => {
    expect((await POST(req('/api/alertas', 'POST', { ...CORPO, nome: '' }))).status).toBe(400);
    m.criarAlerta.mockRejectedValue(new Error('fora'));
    expect((await POST(req('/api/alertas', 'POST', CORPO))).status).toBe(502);
  });
});

describe('PATCH e DELETE /api/alertas/{id}', () => {
  it('pausar e retomar', async () => {
    expect((await porId.PATCH(req(`/api/alertas/${ID}`, 'PATCH', { ativo: false }), params(ID))).status).toBe(200);
    expect(m.mudarAtivoAlerta).toHaveBeenCalledWith(expect.objectContaining({ id: 'u-sessao' }), ID, false);
  });
  it('editar o alerta inteiro', async () => {
    expect((await porId.PATCH(req(`/api/alertas/${ID}`, 'PATCH', CORPO), params(ID))).status).toBe(200);
    expect((m.atualizarAlerta.mock.calls[0] as unknown[])[1]).toBe(ID);
  });
  it('id inválido ou de outra conta: 404; outro site 403; sem sessão 401', async () => {
    expect((await porId.PATCH(req('/api/alertas/1', 'PATCH', { ativo: false }), params('1'))).status).toBe(404);
    m.mudarAtivoAlerta.mockResolvedValue(false);
    expect((await porId.PATCH(req(`/api/alertas/${ID}`, 'PATCH', { ativo: false }), params(ID))).status).toBe(404);
    expect((await porId.DELETE(req(`/api/alertas/${ID}`, 'DELETE', {}, { 'sec-fetch-site': 'cross-site' }), params(ID))).status).toBe(403);
    m.usuario = null;
    expect((await porId.DELETE(req(`/api/alertas/${ID}`, 'DELETE', {}), params(ID))).status).toBe(401);
  });
  it('excluir', async () => {
    expect((await porId.DELETE(req(`/api/alertas/${ID}`, 'DELETE', {}), params(ID))).status).toBe(200);
    m.excluirAlerta.mockResolvedValue(false);
    expect((await porId.DELETE(req(`/api/alertas/${ID}`, 'DELETE', {}), params(ID))).status).toBe(404);
  });
});
```

Run: `npx vitest run app/api/alertas/route.test.ts` → FAIL.

- [ ] **Step 7: Implementar as rotas**

Troque `app/api/alertas/route.ts` por:
```ts
import { MENSAGENS_ALERTA, validarAlerta } from '@/lib/alertas/regras';
import { SEM_CACHE } from '@/lib/http';
import { bloqueioAlerta } from '@/lib/limitesConta';
import { contarAlertas, criarAlerta } from '@/lib/servidor/alertas';
import { planoDaConta } from '@/lib/servidor/conta';
import { recusaForaDoSite } from '@/lib/servidor/mesmaOrigem';
import { contexto, gravarEvento } from '@/lib/servidor/registro';
import { usuarioAtual } from '@/lib/servidor/sessao';

const json = (corpo: unknown, status = 200) => Response.json(corpo, { status, headers: SEM_CACHE });

/**
 * Cria um alerta na conta da sessão (Fase 4, §3). Só JSON do próprio site (CSRF); o dono vem só de usuarioAtual().
 * Plano da conta (manual, assinatura com o e-mail da conta ou navegador): Grátis nenhum, Pro até 5 (pausados contam).
 * O antigo pedido de alerta por e-mail (pedidos_alerta) saiu; os pedidos antigos continuam guardados no banco.
 */
export async function POST(request: Request) {
  const recusa = recusaForaDoSite(request);
  if (recusa) return recusa;
  const usuario = await usuarioAtual();
  if (!usuario) return json({ erro: MENSAGENS_ALERTA.entrar, codigo: 'entrar' }, 401);
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return json({ erro: MENSAGENS_ALERTA.formulario }, 400);
  }
  const v = validarAlerta(corpo);
  if (!v.ok) return json({ erro: v.erro }, 400);
  try {
    const ctx = await contexto();
    const [{ plano }, qtd] = await Promise.all([planoDaConta(usuario, ctx), contarAlertas(usuario)]);
    const bloqueio = bloqueioAlerta(plano, qtd);
    if (bloqueio) return json({ erro: bloqueio.mensagem, codigo: bloqueio.codigo }, 402);
    const id = await criarAlerta(usuario, v.valor);
    const origem = (corpo as { origem?: unknown }).origem === 'radar' ? 'radar' : 'manual';
    try {
      await gravarEvento(ctx, 'alerta_criado', { termos: v.valor.termos.length, ufs: v.valor.ufs.length, municipios: v.valor.municipios.length, origem, plano });
    } catch (erro) {
      console.error('alerta_criado:', erro);
    }
    return json({ ok: true, id }, 201);
  } catch (erro) {
    console.error(erro);
    return json({ erro: MENSAGENS_ALERTA.falha }, 502);
  }
}
```

Crie `app/api/alertas/[id]/route.ts`:
```ts
import { lerIdAlerta, MENSAGENS_ALERTA, validarMudancaAlerta } from '@/lib/alertas/regras';
import { SEM_CACHE } from '@/lib/http';
import { atualizarAlerta, excluirAlerta, mudarAtivoAlerta } from '@/lib/servidor/alertas';
import { recusaForaDoSite } from '@/lib/servidor/mesmaOrigem';
import { usuarioAtual } from '@/lib/servidor/sessao';

type Contexto = { params: Promise<{ id: string }> };
const json = (corpo: unknown, status = 200) => Response.json(corpo, { status, headers: SEM_CACHE });

/** Pausar/retomar ({ ativo }) ou editar (o alerta inteiro) um alerta da conta da sessão. Editar não muda o limite. */
export async function PATCH(request: Request, { params }: Contexto) {
  const recusa = recusaForaDoSite(request);
  if (recusa) return recusa;
  const usuario = await usuarioAtual();
  if (!usuario) return json({ erro: MENSAGENS_ALERTA.entrar, codigo: 'entrar' }, 401);
  const id = lerIdAlerta((await params).id);
  if (!id) return json({ erro: MENSAGENS_ALERTA.naoEncontrado }, 404);
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return json({ erro: MENSAGENS_ALERTA.formulario }, 400);
  }
  const v = validarMudancaAlerta(corpo);
  if (!v.ok) return json({ erro: v.erro }, 400);
  try {
    const ok = v.valor.tipo === 'ativo' ? await mudarAtivoAlerta(usuario, id, v.valor.ativo) : await atualizarAlerta(usuario, id, v.valor.alerta);
    return ok ? json({ ok: true }) : json({ erro: MENSAGENS_ALERTA.naoEncontrado }, 404);
  } catch (erro) {
    console.error(erro);
    return json({ erro: MENSAGENS_ALERTA.falha }, 502);
  }
}

export async function DELETE(request: Request, { params }: Contexto) {
  const recusa = recusaForaDoSite(request);
  if (recusa) return recusa;
  const usuario = await usuarioAtual();
  if (!usuario) return json({ erro: MENSAGENS_ALERTA.entrar, codigo: 'entrar' }, 401);
  const id = lerIdAlerta((await params).id);
  if (!id) return json({ erro: MENSAGENS_ALERTA.naoEncontrado }, 404);
  try {
    return (await excluirAlerta(usuario, id)) ? json({ ok: true }) : json({ erro: MENSAGENS_ALERTA.naoEncontrado }, 404);
  } catch (erro) {
    console.error(erro);
    return json({ erro: MENSAGENS_ALERTA.falha }, 502);
  }
}
```
(O teste chama `mudarAtivoAlerta(usuario, id, false)` com 3 argumentos: o `agora` fica no padrão.)

- [ ] **Step 8: Rodar, verificar e commitar**

Run: `npx vitest run lib/alertas app/api/alertas lib/servidor/alertas.test.ts && npm test && npm run typecheck && npm run build`
Expected: PASS. (Se `npm run build` reclamar do tipo do segundo argumento da rota dinâmica no Next 16, usar `RouteContext<'/api/alertas/[id]'>` no lugar de `Contexto`, sem mudar o corpo.)
```bash
git add lib/alertas/regras.ts lib/alertas/regras.test.ts lib/servidor/alertas.ts lib/servidor/alertas.test.ts app/api/alertas
git commit -m "feat(alertas): alertas da conta com os filtros do radar (regras, servidor e rotas)" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 8: Página /alertas com conta (lista, criar, editar, pausar, excluir) e preferência do resumo semanal

**Files:**
- Create: `app/alertas/novo/page.tsx`, `app/alertas/[id]/editar/page.tsx`, `components/alertas/FormAlerta.tsx`, `components/alertas/ItemAlerta.tsx`, `components/alertas/ResumoSemanal.tsx`, `components/radar/CamposOportunidade.tsx`, `app/api/conta/resumo/route.ts`
- Modify: `app/alertas/page.tsx` (troca o formulário antigo), `components/radar/FormRadar.tsx` (usa `CamposOportunidade`), `app/edital/[slug]/page.tsx` (link `/alertas`), `app/sobre/page.tsx` (texto do e-mail), `lib/eventos.ts` e `lib/eventos.test.ts` (sai o pedido antigo), `lib/servidor/registro.ts` (sai `gravarPedido`)
- Delete: `components/FormAlerta.tsx`
- Test: `scripts/alertas-ui.test.ts`, `app/api/conta/resumo/route.test.ts`

**Interfaces:**
- Consumes: `alertasDaConta`, `lerAlerta`, `AlertaComEnvio` (Task 7); `nomePadrao`, `MAX_NOME_ALERTA`, `MENSAGENS_ALERTA`, `textoUltimoEnvio`, `envioIndisponivel`, `AVISO_ENVIO_INDISPONIVEL`, `lerIdAlerta` (Task 7); `planoDaConta`, `resumoSemanalLigado`, `mudarResumoSemanal`, `bloqueioAlerta`, `avisoPlanoNavegador`, `MENSAGENS_LIMITE_CONTA` (Task 3); `pedirJson`, `irParaEntrar` (Task 5); `CartaoRecursoPlano` (Task 6); `lerRadar` (`lib/servidor/conta.ts`); `municipiosPorIbge`; `rascunhoDoRadar`, `corpoDoRascunho`, `erroDaEtapa`, `resumoDoRadar`, `LIMITES_RADAR`, `sugestoesTermos`, `RascunhoRadar` (`lib/radar.ts`); `CampoTermos`, `CampoLocal`.
- Produces: `/alertas` (sem conta: convite; com conta: lista, criar, "Criar alerta a partir do meu radar", resumo semanal), `/alertas/novo[?de=radar]`, `/alertas/{id}/editar` (noindex); `<FormAlerta modo id? nomeInicial inicial origem />`; `<ItemAlerta alerta resumo ultimo />`; `<ResumoSemanal ligado pro temRadar />`; `<CamposOportunidade d mudar />`; `POST /api/conta/resumo { ligado: boolean }` → 200 | 400 | 401 | 403 | 502.

- [ ] **Step 1: Guardas da interface (falhando)**

Crie `scripts/alertas-ui.test.ts`:
```ts
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');
const existe = (caminho: string) => existsSync(new URL(`../${caminho}`, import.meta.url));

describe('/alertas com conta', () => {
  const pagina = ler('app/alertas/page.tsx');
  it('sem conta: convite para entrar (o formulário antigo saiu)', () => {
    expect(pagina).toContain('usuarioAtual()');
    expect(pagina).toContain('/entrar?voltar=/alertas');
    expect(pagina).not.toContain('FormAlerta ufsIniciais');
    expect(existe('components/FormAlerta.tsx')).toBe(false);
    expect(ler('lib/eventos.ts')).not.toContain('validarPedidoAlerta');
    expect(ler('lib/servidor/registro.ts')).not.toContain('gravarPedido');
  });
  it('com conta: criar, criar a partir do radar, aviso do plano no navegador, envio indisponível, resumo semanal', () => {
    for (const t of ['href="/alertas/novo"', 'href="/alertas/novo?de=radar"', 'Criar alerta a partir do meu radar', 'avisoPlanoNavegador(', 'envioIndisponivel(', 'AVISO_ENVIO_INDISPONIVEL', '<ResumoSemanal']) {
      expect(pagina, t).toContain(t);
    }
  });
  it('item: editar, pausar/retomar e excluir com confirmação', () => {
    const item = ler('components/alertas/ItemAlerta.tsx');
    for (const t of ['/editar', "'Pausar'", "'Retomar'", 'window.confirm(', "'DELETE'", '{ ativo: !alerta.ativo }']) expect(item, t).toContain(t);
  });
  it('formulário: nome + as mesmas seções do radar; POST ao criar, PATCH ao editar', () => {
    const form = ler('components/alertas/FormAlerta.tsx');
    for (const t of ['<CampoTermos', '<CampoLocal', '<CamposOportunidade', "pedirJson('/api/alertas', 'POST'", "'PATCH'", 'maxLength={MAX_NOME_ALERTA}']) {
      expect(form, t).toContain(t);
    }
    expect(ler('components/radar/FormRadar.tsx')).toContain('<CamposOportunidade');
  });
  it('páginas novas exigem conta e ficam fora do Google; edital leva a /alertas', () => {
    for (const f of ['app/alertas/novo/page.tsx', 'app/alertas/[id]/editar/page.tsx']) {
      expect(ler(f), f).toContain('usuarioAtual()');
      expect(ler(f), f).toContain('robots: { index: false, follow: false }');
    }
    expect(ler('app/edital/[slug]/page.tsx')).toContain('href="/alertas"');
  });
});
```
Run: `npx vitest run scripts/alertas-ui.test.ts` → FAIL.

- [ ] **Step 2: Rota da preferência do resumo (teste primeiro)**

Crie `app/api/conta/resumo/route.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const m = vi.hoisted(() => ({
  usuario: { id: 'u-sessao', email: 'dono@empresa.com.br' } as null | { id: string; email: string },
  mudarResumoSemanal: vi.fn(async (..._a: unknown[]) => undefined),
}));
vi.mock('@/lib/servidor/sessao', () => ({ usuarioAtual: async () => m.usuario }));
vi.mock('@/lib/servidor/conta', () => ({ mudarResumoSemanal: m.mudarResumoSemanal }));

const { POST } = await import('./route');
const enviar = (corpo: unknown, extra: Record<string, string> = {}) =>
  POST(new Request('http://localhost/api/conta/resumo', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', ...extra },
    body: JSON.stringify(corpo),
  }));

beforeEach(() => {
  vi.clearAllMocks();
  m.usuario = { id: 'u-sessao', email: 'dono@empresa.com.br' };
});

describe('POST /api/conta/resumo', () => {
  it('liga ou desliga na conta da sessão', async () => {
    expect((await enviar({ ligado: false })).status).toBe(200);
    expect(m.mudarResumoSemanal).toHaveBeenCalledWith(expect.objectContaining({ id: 'u-sessao' }), false);
  });
  it('corpo errado 400; sem sessão 401; outro site 403', async () => {
    expect((await enviar({ ligado: 'sim' })).status).toBe(400);
    expect((await enviar({ ligado: true }, { 'sec-fetch-site': 'cross-site' })).status).toBe(403);
    m.usuario = null;
    expect((await enviar({ ligado: true })).status).toBe(401);
    expect(m.mudarResumoSemanal).not.toHaveBeenCalled();
  });
});
```
Run: `npx vitest run app/api/conta/resumo/route.test.ts` → FAIL. Crie `app/api/conta/resumo/route.ts`:
```ts
import { SEM_CACHE } from '@/lib/http';
import { mudarResumoSemanal } from '@/lib/servidor/conta';
import { recusaForaDoSite } from '@/lib/servidor/mesmaOrigem';
import { usuarioAtual } from '@/lib/servidor/sessao';

const json = (corpo: unknown, status = 200) => Response.json(corpo, { status, headers: SEM_CACHE });

/** Liga ou desliga o resumo semanal do Pro na conta da sessão (página /alertas). Só JSON do próprio site. */
export async function POST(request: Request) {
  const recusa = recusaForaDoSite(request);
  if (recusa) return recusa;
  const usuario = await usuarioAtual();
  if (!usuario) return json({ erro: 'Entre para mudar o resumo semanal.', codigo: 'entrar' }, 401);
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    corpo = null;
  }
  const ligado = (corpo as { ligado?: unknown } | null)?.ligado;
  if (typeof ligado !== 'boolean') return json({ erro: 'Pedido inválido.' }, 400);
  try {
    await mudarResumoSemanal(usuario, ligado);
    return json({ ok: true, ligado });
  } catch (erro) {
    console.error(erro);
    return json({ erro: 'Não foi possível salvar agora. Tente de novo.' }, 502);
  }
}
```
Run → PASS.

- [ ] **Step 3: Seções do formulário compartilhadas com o radar**

Crie `components/radar/CamposOportunidade.tsx` com o bloco "Que tipo de oportunidade procura?" que hoje está na constante `oportunidade` de `FormRadar.tsx` (mesmo JSX, mesmas classes):
```tsx
'use client';

import { MODALIDADES } from '@/lib/filtros';
import { LIMITES_RADAR, type RascunhoRadar } from '@/lib/radar';
import { CampoTermos } from './CampoTermos';

const CAMPO = 'h-11 w-full rounded-sm border border-line-strong bg-raised px-3 text-[15px] font-normal text-ink';

/** Valor, modalidades, só ME/EPP e palavras para excluir: a 3ª etapa do radar e a parte final do formulário de alerta. */
export function CamposOportunidade({ d, mudar }: { d: RascunhoRadar; mudar: (parte: Partial<RascunhoRadar>) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">Valor estimado (opcional)</legend>
        <label className="flex flex-col gap-1.5 text-[13px] text-ink-muted">
          Mínimo (R$)
          <input inputMode="decimal" value={d.valorMin} onChange={(e) => mudar({ valorMin: e.target.value })} placeholder="Sem mínimo" className={CAMPO} />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] text-ink-muted">
          Máximo (R$)
          <input inputMode="decimal" value={d.valorMax} onChange={(e) => mudar({ valorMax: e.target.value })} placeholder="Sem máximo" className={CAMPO} />
        </label>
        <p className="text-[13px] text-ink-muted sm:col-span-2">Com valor mínimo ou máximo, editais sem valor informado ficam de fora.</p>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Modalidades (opcional; nenhuma marcada = todas)</legend>
        <div className="flex flex-col gap-1">
          {MODALIDADES.map((mo) => (
            <label key={mo.id} className="flex min-h-11 items-center gap-3 text-[15px]">
              <input
                type="checkbox"
                checked={d.modalidades.includes(mo.id)}
                onChange={(e) => mudar({ modalidades: e.target.checked ? [...d.modalidades, mo.id] : d.modalidades.filter((x) => x !== mo.id) })}
                className="size-5 shrink-0 accent-[var(--color-pin)]"
              />
              {mo.nome}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex min-h-11 items-start gap-3 text-[15px]">
        <input type="checkbox" checked={d.soMeEpp} onChange={(e) => mudar({ soMeEpp: e.target.checked })} className="mt-0.5 size-5 shrink-0 accent-[var(--color-pin)]" />
        <span>
          <span className="font-semibold">Só exclusivas para ME/EPP</span>
          <span className="block text-[13px] text-ink-muted">Quando o órgão informa no PNCP que todos os itens são exclusivos.</span>
        </span>
      </label>
      <CampoTermos
        rotulo="Palavras para excluir (opcional)"
        ajuda="Editais com estas palavras no objeto não aparecem. Ex.: escolar."
        termos={d.termosExcluir}
        max={LIMITES_RADAR.excluir}
        tamanho={LIMITES_RADAR.tamanhoExcluir}
        aoMudar={(termosExcluir) => mudar({ termosExcluir })}
      />
    </div>
  );
}
```
Em `components/radar/FormRadar.tsx`: troque toda a constante `const oportunidade = ( … );` por `const oportunidade = <CamposOportunidade d={d} mudar={mudar} />;`, acrescente `import { CamposOportunidade } from './CamposOportunidade';`, tire `import { MODALIDADES } from '@/lib/filtros';` e a constante `CAMPO` (não são mais usadas). Rodar `npx vitest run scripts/radar.test.ts`: as guardas do onboarding seguem passando (se alguma procurar um texto que mudou de arquivo, apontar a guarda para `CamposOportunidade.tsx`, sem mudar o texto).

- [ ] **Step 4: Formulário do alerta**

Crie `components/alertas/FormAlerta.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { CampoLocal } from '@/components/radar/CampoLocal';
import { CampoTermos } from '@/components/radar/CampoTermos';
import { CamposOportunidade } from '@/components/radar/CamposOportunidade';
import { MAX_NOME_ALERTA, MENSAGENS_ALERTA, nomePadrao } from '@/lib/alertas/regras';
import { irParaEntrar, pedirJson } from '@/lib/cliente/pedido';
import { corpoDoRascunho, erroDaEtapa, LIMITES_RADAR, sugestoesTermos, type RascunhoRadar } from '@/lib/radar';

type Props = { modo: 'novo' | 'editar'; id?: string; nomeInicial: string; inicial: RascunhoRadar; origem: 'manual' | 'radar' };

const SECAO = 'flex flex-col gap-4 rounded-md border border-line bg-raised p-4';
const PRINCIPAL = 'inline-flex h-12 items-center justify-center rounded-sm bg-pin px-6 text-[15px] font-semibold text-on-pin aria-disabled:opacity-60';
const SECUNDARIO = 'inline-flex h-12 items-center justify-center rounded-sm border border-line-strong bg-raised px-5 text-[15px] font-semibold hover:bg-sunken';

/** Criar ou editar um alerta: nome + as mesmas seções do radar. Salvo, volta para /alertas. */
export function FormAlerta({ modo, id, nomeInicial, inicial, origem }: Props) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeInicial);
  const [d, setD] = useState<RascunhoRadar>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [planos, setPlanos] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const mudar = (parte: Partial<RascunhoRadar>) => {
    setD((x) => ({ ...x, ...parte }));
    setErro(null);
  };

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (salvando) return;
    for (const etapa of [1, 2, 3] as const) {
      const msg = erroDaEtapa(d, etapa);
      if (msg) return setErro(msg);
    }
    const nomeFinal = nome.trim() || nomePadrao(d.termos);
    if (!nomeFinal || nomeFinal.length > MAX_NOME_ALERTA) return setErro(MENSAGENS_ALERTA.nome);
    setSalvando(true);
    const corpo = { nome: nomeFinal, origem, ...corpoDoRascunho(d, { pular: false }) };
    const r = modo === 'novo' ? await pedirJson('/api/alertas', 'POST', corpo) : await pedirJson(`/api/alertas/${id}`, 'PATCH', corpo);
    if (r.ok) {
      router.push('/alertas');
      router.refresh();
      return;
    }
    setSalvando(false);
    if (r.codigo === 'entrar') return irParaEntrar();
    setErro(r.erro);
    setPlanos(r.codigo === 'plano' || r.codigo === 'limite');
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-6" noValidate>
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">{modo === 'novo' ? 'Criar alerta' : 'Editar alerta'}</h1>
        <p className="text-sm text-ink-muted">Os editais novos que combinam com este alerta chegam por e-mail às 7h, só nos dias em que houver novidade.</p>
      </div>
      <section className={SECAO}>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Nome do alerta
          <input
            value={nome}
            maxLength={MAX_NOME_ALERTA}
            onChange={(e) => {
              setNome(e.target.value);
              setErro(null);
            }}
            placeholder={nomePadrao(d.termos) || 'Ex.: Uniformes no Sul'}
            className="h-11 w-full rounded-sm border border-line-strong bg-raised px-3 text-[15px] font-normal text-ink"
          />
          <span className="text-[13px] font-normal text-ink-muted">Opcional: sem nome, usamos os produtos.</span>
        </label>
      </section>
      <section className={SECAO}>
        <h2 className="text-lg font-bold">O que sua empresa vende?</h2>
        <CampoTermos
          rotulo="Produtos ou serviços"
          ajuda="Escreva e aperte Enter. Pode separar vários com vírgula. Também buscamos termos parecidos (ex.: uniforme → fardamento)."
          termos={d.termos}
          max={LIMITES_RADAR.termos}
          tamanho={LIMITES_RADAR.tamanhoTermo}
          placeholder="Ex.: uniforme, luva, material de limpeza"
          sugerir={(t) => sugestoesTermos(t, d.termos)}
          aoMudar={(termos) => mudar({ termos })}
        />
      </section>
      <section className={SECAO}>
        <h2 className="text-lg font-bold">Onde sua empresa atende?</h2>
        <CampoLocal valor={d} aoMudar={mudar} />
      </section>
      <section className={SECAO}>
        <h2 className="text-lg font-bold">Que tipo de oportunidade procura?</h2>
        <CamposOportunidade d={d} mudar={mudar} />
      </section>
      <p role="alert" className="text-sm font-semibold text-pin-strong empty:hidden">
        {erro ?? ''}
      </p>
      {planos ? (
        <Link href="/planos" className="w-fit text-sm font-semibold text-pin-strong underline-offset-2 hover:underline">
          Conhecer o Pro
        </Link>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" aria-disabled={salvando || undefined} className={PRINCIPAL}>
          {salvando ? 'Salvando…' : modo === 'novo' ? 'Criar alerta' : 'Salvar alterações'}
        </button>
        <Link href="/alertas" prefetch={false} className={SECUNDARIO}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Item da lista e resumo semanal**

Crie `components/alertas/ItemAlerta.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { irParaEntrar, pedirJson } from '@/lib/cliente/pedido';

type Props = {
  alerta: { id: string; nome: string; ativo: boolean };
  resumo: { produtos: string[]; local: string; extras: string[] };
  ultimo: string;
};
const BOTAO = 'inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken';

/** Um alerta: nome, filtros, ativo/pausado, último envio; Editar, Pausar/Retomar e Excluir (com confirmação). */
export function ItemAlerta({ alerta, resumo, ultimo }: Props) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function pedir(metodo: 'PATCH' | 'DELETE', corpo: unknown) {
    if (ocupado) return;
    setOcupado(true);
    setErro(null);
    const r = await pedirJson(`/api/alertas/${alerta.id}`, metodo, corpo);
    setOcupado(false);
    if (r.ok) return router.refresh();
    if (r.codigo === 'entrar') return irParaEntrar();
    setErro(r.erro);
  }

  function excluir() {
    if (!window.confirm(`Excluir o alerta "${alerta.nome}"? Para só parar os e-mails, use Pausar.`)) return;
    void pedir('DELETE', {});
  }

  return (
    <article className="flex flex-col gap-3 rounded-md border border-line bg-raised p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[17px] font-bold">{alerta.nome}</h2>
        <span className={`rounded-xs px-2 py-0.5 text-xs font-semibold ${alerta.ativo ? 'bg-mata-soft text-mata' : 'bg-sunken text-ink-muted'}`}>
          {alerta.ativo ? 'Ativo' : 'Pausado'}
        </span>
      </div>
      <ul aria-label="Produtos do alerta" className="flex flex-wrap gap-2">
        {resumo.produtos.map((p) => (
          <li key={p} className="rounded-sm bg-pin-soft px-2.5 py-1 text-sm font-semibold text-pin-strong">
            {p}
          </li>
        ))}
      </ul>
      <p className="text-[13px] text-ink-muted">{[resumo.local, ...resumo.extras].join(' · ')}</p>
      <p className="text-[13px]">{ultimo}</p>
      {erro ? (
        <p role="alert" className="text-sm font-semibold text-pin-strong">
          {erro}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Link href={`/alertas/${alerta.id}/editar`} prefetch={false} className={BOTAO}>
          Editar
        </Link>
        <button type="button" aria-busy={ocupado || undefined} onClick={() => void pedir('PATCH', { ativo: !alerta.ativo })} className={BOTAO}>
          {alerta.ativo ? 'Pausar' : 'Retomar'}
        </button>
        <button type="button" onClick={excluir} className={BOTAO}>
          Excluir
        </button>
      </div>
    </article>
  );
}
```

Crie `components/alertas/ResumoSemanal.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { irParaEntrar, pedirJson } from '@/lib/cliente/pedido';
import { MENSAGENS_LIMITE_CONTA } from '@/lib/limitesConta';

/**
 * Resumo semanal do Pro (toda segunda às 7h): os editais novos da semana no Meu Radar, os que encerram em 7 dias, o
 * valor somado e quem mais compra. Liga e desliga aqui; o link do próprio e-mail também desliga.
 */
export function ResumoSemanal({ ligado: inicial, pro, temRadar }: { ligado: boolean; pro: boolean; temRadar: boolean }) {
  const [ligado, setLigado] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function trocar() {
    if (ocupado) return;
    setOcupado(true);
    setErro(null);
    const r = await pedirJson('/api/conta/resumo', 'POST', { ligado: !ligado });
    setOcupado(false);
    if (r.ok) return setLigado(!ligado);
    if (r.codigo === 'entrar') return irParaEntrar();
    setErro(r.erro);
  }

  return (
    <section aria-labelledby="resumo-semanal" className="flex flex-col gap-2 rounded-md border border-line bg-raised p-4">
      <h2 id="resumo-semanal" className="text-[17px] font-bold">
        Resumo semanal
      </h2>
      <p className="text-[14px] text-ink-muted">
        Toda segunda às 7h: os editais novos da semana no seu Meu Radar, os que encerram em até 7 dias, o valor estimado somado e os órgãos e cidades que
        mais compram.
      </p>
      {!pro ? (
        <p className="text-[14px] font-semibold">
          {MENSAGENS_LIMITE_CONTA.resumoPlano}{' '}
          <Link href="/planos" className="text-pin-strong underline-offset-2 hover:underline">
            Conhecer o Pro
          </Link>
        </p>
      ) : !temRadar ? (
        <p className="text-[14px]">
          O resumo usa o seu Meu Radar.{' '}
          <Link href="/radar/comecar" prefetch={false} className="font-semibold text-pin-strong underline-offset-2 hover:underline">
            Criar meu radar
          </Link>
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={ligado}
            aria-busy={ocupado || undefined}
            onClick={() => void trocar()}
            className="inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken aria-checked:bg-mata-soft aria-checked:text-mata"
          >
            {ligado ? 'Ligado' : 'Desligado'}
          </button>
          <span className="text-[13px] text-ink-muted">{ligado ? 'Você recebe toda segunda.' : 'Você não recebe o resumo.'}</span>
        </div>
      )}
      {erro ? (
        <p role="alert" className="text-sm font-semibold text-pin-strong">
          {erro}
        </p>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 6: As páginas**

Troque `app/alertas/page.tsx` por:
```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { ItemAlerta } from '@/components/alertas/ItemAlerta';
import { ResumoSemanal } from '@/components/alertas/ResumoSemanal';
import { CartaoRecursoPlano } from '@/components/conta/CartaoRecursoPlano';
import { AVISO_ENVIO_INDISPONIVEL, envioIndisponivel, textoUltimoEnvio } from '@/lib/alertas/regras';
import { avisoPlanoNavegador, bloqueioAlerta, MENSAGENS_LIMITE_CONTA } from '@/lib/limitesConta';
import { resumoDoRadar } from '@/lib/radar';
import { alertasDaConta } from '@/lib/servidor/alertas';
import { lerRadar, planoDaConta, resumoSemanalLigado } from '@/lib/servidor/conta';
import { municipiosPorIbge } from '@/lib/servidor/municipios';
import { contextoDaPagina } from '@/lib/servidor/registro';
import { usuarioAtual } from '@/lib/servidor/sessao';

export const metadata: Metadata = {
  title: 'Alertas por e-mail',
  description: 'Receba às 7h, por e-mail, os editais novos do que sua empresa vende, na sua região.',
  alternates: { canonical: '/alertas' },
};

const PRINCIPAL = 'inline-flex h-11 items-center rounded-sm bg-pin px-5 text-sm font-semibold text-on-pin';
const SECUNDARIO = 'inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-5 text-sm font-semibold hover:bg-sunken';

/**
 * Alertas da conta (Fase 4, §3): lista com último envio, criar (também a partir do Meu Radar), editar, pausar/retomar,
 * excluir; e o resumo semanal do Pro. Sem conta: convite para entrar (é o que o Google vê). Pedidos antigos por e-mail
 * (pedidos_alerta) ficam guardados no banco para um convite futuro.
 */
export default async function PaginaAlertas() {
  await connection();
  const usuario = await usuarioAtual();
  if (!usuario) {
    return (
      <>
        <Cabecalho />
        <main className="mx-auto flex max-w-[760px] flex-col gap-5 px-4 py-8 md:px-6">
          <h1 className="text-[32px] font-bold leading-tight tracking-[-0.015em]">Alertas por e-mail</h1>
          <p className="text-[15px] text-ink-muted">
            Diga o que sua empresa vende e onde atende: todo dia às 7h mandamos por e-mail os editais novos que combinam, sem repetir. Alertas são do plano
            Pro.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/entrar?voltar=/alertas" prefetch={false} className={PRINCIPAL}>
              Entrar para criar alertas
            </Link>
            <Link href="/planos" className={SECUNDARIO}>
              Conhecer o Pro
            </Link>
          </div>
        </main>
      </>
    );
  }

  const ctx = await contextoDaPagina();
  const [alertas, plano, radar, resumoLigado] = await Promise.all([
    alertasDaConta(usuario),
    planoDaConta(usuario, ctx),
    lerRadar(usuario),
    resumoSemanalLigado(usuario),
  ]);
  const cidades = await municipiosPorIbge([...new Set(alertas.flatMap((a) => a.municipios))]);
  const bloqueio = bloqueioAlerta(plano.plano, alertas.length);
  const aviso = avisoPlanoNavegador(plano);
  const indisponivel = envioIndisponivel(alertas.map((a) => a.ultimoEnvio));

  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[860px] flex-col gap-5 px-4 py-6 lg:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">Alertas por e-mail</h1>
          <p className="text-sm text-ink-muted">Todo dia às 7h, os editais novos de cada alerta chegam em {usuario.email}, só quando houver novidade.</p>
        </div>
        {aviso ? (
          <p role="note" className="rounded-sm bg-pin-soft px-3 py-2 text-[14px] text-pin-strong">
            {aviso}
          </p>
        ) : null}
        {indisponivel ? (
          <p role="status" className="rounded-sm bg-pin-soft px-3 py-2 text-[14px] font-semibold text-pin-strong">
            {AVISO_ENVIO_INDISPONIVEL}
          </p>
        ) : null}
        {bloqueio?.codigo === 'plano' ? (
          <CartaoRecursoPlano titulo={MENSAGENS_LIMITE_CONTA.alertasPlano} texto={MENSAGENS_LIMITE_CONTA.alertasConvite} />
        ) : bloqueio ? (
          <p className="text-[14px] text-ink-muted">{bloqueio.mensagem}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Link href="/alertas/novo" prefetch={false} className={PRINCIPAL}>
              Criar alerta
            </Link>
            {radar ? (
              <Link href="/alertas/novo?de=radar" prefetch={false} className={SECUNDARIO}>
                Criar alerta a partir do meu radar
              </Link>
            ) : null}
          </div>
        )}
        {alertas.length === 0 ? (
          <p className="text-[15px] text-ink-muted">Você ainda não tem alertas.</p>
        ) : (
          <section aria-label="Seus alertas" className="flex flex-col gap-3">
            {alertas.map((a) => (
              <ItemAlerta
                key={a.id}
                alerta={{ id: a.id, nome: a.nome, ativo: a.ativo }}
                resumo={resumoDoRadar(a, cidades.filter((c) => a.municipios.includes(c.ibge)))}
                ultimo={textoUltimoEnvio(a.ultimoEnvio)}
              />
            ))}
          </section>
        )}
        <ResumoSemanal ligado={resumoLigado} pro={plano.plano === 'pro'} temRadar={radar !== null} />
      </main>
    </>
  );
}
```

Crie `app/alertas/novo/page.tsx`:
```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { FormAlerta } from '@/components/alertas/FormAlerta';
import { CartaoRecursoPlano } from '@/components/conta/CartaoRecursoPlano';
import { bloqueioAlerta, MENSAGENS_LIMITE_CONTA } from '@/lib/limitesConta';
import { rascunhoDoRadar } from '@/lib/radar';
import { contarAlertas } from '@/lib/servidor/alertas';
import { lerRadar, planoDaConta } from '@/lib/servidor/conta';
import { municipiosPorIbge } from '@/lib/servidor/municipios';
import { contextoDaPagina } from '@/lib/servidor/registro';
import { usuarioAtual } from '@/lib/servidor/sessao';

/** Página da conta: fora do Google. */
export const metadata: Metadata = { title: 'Criar alerta', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ de?: string | string[] }> };

/** Criar alerta (vazio ou, com ?de=radar, preenchido com o Meu Radar). Sem plano ou no limite: o convite ou o aviso. */
export default async function NovoAlerta({ searchParams }: Props) {
  await connection();
  const doRadar = (await searchParams).de === 'radar';
  const usuario = await usuarioAtual();
  if (!usuario) redirect(doRadar ? '/entrar?voltar=%2Falertas%2Fnovo%3Fde%3Dradar' : '/entrar?voltar=/alertas/novo');
  const [plano, qtd, radar] = await Promise.all([planoDaConta(usuario, await contextoDaPagina()), contarAlertas(usuario), doRadar ? lerRadar(usuario) : Promise.resolve(null)]);
  const bloqueio = bloqueioAlerta(plano.plano, qtd);
  const cidades = radar ? await municipiosPorIbge(radar.municipios) : [];
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-8">
        {bloqueio?.codigo === 'plano' ? (
          <CartaoRecursoPlano titulo={MENSAGENS_LIMITE_CONTA.alertasPlano} texto={MENSAGENS_LIMITE_CONTA.alertasConvite} />
        ) : bloqueio ? (
          <section className="flex flex-col gap-3">
            <p className="text-[15px]">{bloqueio.mensagem}</p>
            <Link href="/alertas" prefetch={false} className="w-fit text-sm font-semibold text-pin-strong underline-offset-2 hover:underline">
              Voltar aos alertas
            </Link>
          </section>
        ) : (
          <FormAlerta modo="novo" nomeInicial={radar ? 'Meu radar' : ''} inicial={rascunhoDoRadar(radar, cidades)} origem={radar ? 'radar' : 'manual'} />
        )}
      </main>
    </>
  );
}
```

Crie `app/alertas/[id]/editar/page.tsx`:
```tsx
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { FormAlerta } from '@/components/alertas/FormAlerta';
import { lerIdAlerta } from '@/lib/alertas/regras';
import { rascunhoDoRadar } from '@/lib/radar';
import { lerAlerta } from '@/lib/servidor/alertas';
import { municipiosPorIbge } from '@/lib/servidor/municipios';
import { usuarioAtual } from '@/lib/servidor/sessao';

/** Página da conta: fora do Google. */
export const metadata: Metadata = { title: 'Editar alerta', robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

/** Editar um alerta da conta (outro id, ou de outra conta: 404). Editar não depende do plano. */
export default async function EditarAlerta({ params }: Props) {
  await connection();
  const id = lerIdAlerta((await params).id);
  const usuario = await usuarioAtual();
  if (!usuario) redirect(id ? `/entrar?voltar=${encodeURIComponent(`/alertas/${id}/editar`)}` : '/entrar?voltar=/alertas');
  const alerta = id ? await lerAlerta(usuario, id) : null;
  if (!alerta) notFound();
  const cidades = await municipiosPorIbge(alerta.municipios);
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-8">
        <FormAlerta modo="editar" id={alerta.id} nomeInicial={alerta.nome} inicial={rascunhoDoRadar(alerta, cidades)} origem="manual" />
      </main>
    </>
  );
}
```

- [ ] **Step 7: O que sai e o que muda de texto**

1. Apague `components/FormAlerta.tsx` (`git rm components/FormAlerta.tsx`).
2. Em `lib/eventos.ts`, apague `ufsIniciaisAlerta`, o tipo `PedidoAlerta` e `validarPedidoAlerta` (com os comentários deles). `TIPOS_EVENTO_SERVIDOR` continua com `'pediu_alerta'` (histórico no banco e guarda da 0009). Em `lib/eventos.test.ts`, tire `ufsIniciaisAlerta` e `validarPedidoAlerta` do import e apague os blocos `describe('validarPedidoAlerta', …)` e `describe('ufsIniciaisAlerta', …)`.
3. Em `lib/servidor/registro.ts`, apague `gravarPedido` e tire `PedidoAlerta` do import de `../eventos` (o resto fica: `dentroDoLimite` continua aceitando `'pedidos_alerta'` para não mexer na assinatura).
4. Em `app/edital/[slug]/page.tsx`, troque ``href={`/alertas?uf=${e.uf}`}`` por `href="/alertas"`.
5. Em `app/sobre/page.tsx`, troque a frase "Se você criar um alerta, guardamos o e-mail, o que você vende e os estados escolhidos só para avisar quando os alertas estiverem prontos." por "Se você criar um alerta, guardamos na sua conta o nome, os produtos e a área escolhida, e mandamos para o e-mail da conta os editais novos às 7h (e, no Pro, o resumo de segunda). Cada e-mail tem um link para parar de receber."

Run: `grep -rn "validarPedidoAlerta\|ufsIniciaisAlerta\|gravarPedido\|components/FormAlerta" app components lib scripts` → nada.

- [ ] **Step 8: Rodar, verificar e commitar**

Run: `npx vitest run scripts/alertas-ui.test.ts app/api/conta && npm test && npm run typecheck && npm run build`
Expected: PASS; o build lista `/alertas`, `/alertas/novo` e `/alertas/[id]/editar` como dinâmicas (ƒ). As guardas de `scripts/conta.test.ts` seguem passando (a rota nova de `/api/conta` chama `recusaForaDoSite(request)`).
```bash
git add -A app/alertas app/api/conta/resumo components/alertas components/radar/CamposOportunidade.tsx components/radar/FormRadar.tsx components/FormAlerta.tsx "app/edital/[slug]/page.tsx" app/sobre/page.tsx lib/eventos.ts lib/eventos.test.ts lib/servidor/registro.ts scripts/alertas-ui.test.ts
git commit -m "feat(alertas): página /alertas com conta, formulário, pausar e resumo semanal" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 9: E-mail dos alertas, tokens de descadastro e /alertas/sair

**Files:**
- Create: `lib/alertas/token.ts`, `lib/alertas/email.ts`, `lib/servidor/descadastro.ts`, `app/alertas/sair/page.tsx`, `components/alertas/ConfirmarDescadastro.tsx`, `app/api/descadastro/route.ts`
- Test: `lib/alertas/token.test.ts`, `lib/alertas/email.test.ts`, `lib/servidor/descadastro.test.ts`, `app/api/descadastro/route.test.ts`

**Interfaces:**
- Consumes: `url` (`lib/seo/site.ts`); `moeda`, `dataHora` (`lib/formato.ts`); `rotuloSituacao`; `assunto`, `nomeProprio` (`lib/texto.ts`); `parar_resumo_semanal` (Task 1); tabela `alertas`.
- Produces:
  - `lib/alertas/token.ts`: `type AlvoDescadastro = { tipo: 'alerta'; id: string } | { tipo: 'todos'; conta: string } | { tipo: 'resumo'; conta: string }`; `TAMANHO_MINIMO_SEGREDO = 32`; `lerSegredo(v: string | undefined): string | null`; `criarTokenDescadastro(alvo: AlvoDescadastro, segredo: string): string`; `lerTokenDescadastro(token: unknown, segredo: string | null): AlvoDescadastro | null`.
  - `lib/alertas/email.ts`: `REMETENTE_ALERTAS = 'Edital Map <alertas@editalmap.com.br>'`; `type EditalDoEmail = { slug; objeto; orgao_nome; municipio_nome: string | null; uf; valor_estimado: number | string | null; encerramento_em: string; situacao_id: number | null }`; `type SecaoEmail = { nome: string; editais: EditalDoEmail[]; total: number; tokenSair: string }`; `type EmailMontado = { assunto: string; html: string; texto: string; cabecalhos: Record<string, string> }`; `escapar(t: string): string`; `linkSair(token)`, `linkUmClique(token)`, `linkEdital(slug)`; `cabecalhosDescadastro(token: string): Record<string, string>`; `type LinhaEdital`; `linhaDoEdital(e: EditalDoEmail): LinhaEdital`; `editalHtml(e: EditalDoEmail): string`; `editalTexto(e: EditalDoEmail): string`; `moldura(conteudo: string, rodape: string): string`; `assuntoDoEmail(secoes: readonly SecaoEmail[]): string`; `montarEmail(e: { secoes: SecaoEmail[]; tokenSairTodos: string }): EmailMontado`.
  - `lib/servidor/descadastro.ts`: `textoDoDescadastro(alvo: AlvoDescadastro): Promise<string | null>`; `aplicarDescadastro(alvo: AlvoDescadastro, agora?: Date): Promise<number>`.
  - `GET /alertas/sair?t=…` (confirmação, noindex) e `POST /api/descadastro?t=…` (um clique e o botão da página) → 200 `{ ok, pausados }` | 400 | 502.

- [ ] **Step 1: Token (teste primeiro)**

Crie `lib/alertas/token.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { criarTokenDescadastro, lerSegredo, lerTokenDescadastro } from './token';

const SEGREDO = 'x'.repeat(40);
const ALERTA = '11111111-1111-4111-8111-111111111111';
const CONTA = '22222222-2222-4222-8222-222222222222';

describe('token de descadastro', () => {
  it('ida e volta para alerta, todos e resumo', () => {
    for (const alvo of [{ tipo: 'alerta', id: ALERTA }, { tipo: 'todos', conta: CONTA }, { tipo: 'resumo', conta: CONTA }] as const) {
      const t = criarTokenDescadastro(alvo, SEGREDO);
      expect(t).toMatch(/^[atr]\.[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/);
      expect(lerTokenDescadastro(t, SEGREDO)).toEqual(alvo);
    }
  });
  it('adulterado, de outro segredo, de outro tipo ou malformado: null', () => {
    const t = criarTokenDescadastro({ tipo: 'alerta', id: ALERTA }, SEGREDO);
    expect(lerTokenDescadastro(t.replace(ALERTA, CONTA), SEGREDO)).toBeNull();
    expect(lerTokenDescadastro(`t${t.slice(1)}`, SEGREDO)).toBeNull();
    expect(lerTokenDescadastro(t, 'y'.repeat(40))).toBeNull();
    expect(lerTokenDescadastro(`${t.slice(0, -1)}A`, SEGREDO)).toBeNull();
    for (const v of ['', 'a.b.c', null, 5, `${t}x`]) expect(lerTokenDescadastro(v, SEGREDO)).toBeNull();
  });
  it('sem segredo (ou curto) nada vale', () => {
    const t = criarTokenDescadastro({ tipo: 'todos', conta: CONTA }, SEGREDO);
    expect(lerTokenDescadastro(t, null)).toBeNull();
    expect(lerSegredo(undefined)).toBeNull();
    expect(lerSegredo('curto')).toBeNull();
    expect(lerSegredo(`  ${SEGREDO}  `)).toBe(SEGREDO);
  });
});
```
Run: `npx vitest run lib/alertas/token.test.ts` → FAIL. Crie `lib/alertas/token.ts`:
```ts
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Links "Parar de receber" dos e-mails (alertas e resumo semanal), sem login: `<tipo>.<uuid>.<HMAC-SHA256 base64url>`
 * com ALERTAS_SEGREDO. a = um alerta, t = todos os alertas da conta, r = resumo semanal da conta. Sem validade (link
 * de descadastro precisa funcionar sempre); uuid, não id sequencial. Só servidor e job (node:crypto).
 */

export type AlvoDescadastro = { tipo: 'alerta'; id: string } | { tipo: 'todos'; conta: string } | { tipo: 'resumo'; conta: string };

export const TAMANHO_MINIMO_SEGREDO = 32;
const FORMATO = /^([atr])\.([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([A-Za-z0-9_-]{43})$/;

export function lerSegredo(v: string | undefined): string | null {
  const s = v?.trim();
  return s && s.length >= TAMANHO_MINIMO_SEGREDO ? s : null;
}

const assinar = (conteudo: string, segredo: string) => createHmac('sha256', segredo).update(`descadastro:${conteudo}`).digest('base64url');

export function criarTokenDescadastro(alvo: AlvoDescadastro, segredo: string): string {
  const conteudo = alvo.tipo === 'alerta' ? `a.${alvo.id}` : `${alvo.tipo === 'todos' ? 't' : 'r'}.${alvo.conta}`;
  return `${conteudo}.${assinar(conteudo, segredo)}`;
}

export function lerTokenDescadastro(token: unknown, segredo: string | null): AlvoDescadastro | null {
  if (!segredo || typeof token !== 'string' || token.length > 120) return null;
  const m = FORMATO.exec(token);
  if (!m) return null;
  const esperado = Buffer.from(assinar(`${m[1]}.${m[2]}`, segredo));
  const recebido = Buffer.from(m[3]);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null;
  if (m[1] === 'a') return { tipo: 'alerta', id: m[2] };
  return m[1] === 't' ? { tipo: 'todos', conta: m[2] } : { tipo: 'resumo', conta: m[2] };
}
```
Run → PASS.

- [ ] **Step 2: E-mail dos alertas (teste primeiro)**

Crie `lib/alertas/email.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { dataHora, moeda } from '../formato';
import { assunto, nomeProprio } from '../texto';
import { assuntoDoEmail, escapar, linkSair, linkUmClique, montarEmail, type EditalDoEmail, type SecaoEmail } from './email';

const ED: EditalDoEmail = {
  slug: '00394452000103-2026-21982', objeto: 'Aquisição de luvas nitrílicas para a Secretaria de Saúde', orgao_nome: 'PREFEITURA MUNICIPAL DE JOINVILLE',
  municipio_nome: 'Joinville', uf: 'SC', valor_estimado: 1234.56, encerramento_em: '2026-10-25T17:00:00+00:00', situacao_id: 1,
};
const secao = (nome: string, editais: EditalDoEmail[], total = editais.length): SecaoEmail => ({ nome, editais, total, tokenSair: `tok-${nome}` });

describe('e-mail dos alertas', () => {
  it('assunto: um alerta ou vários', () => {
    expect(assuntoDoEmail([secao('EPI', [ED])])).toBe('1 edital novo para "EPI"');
    expect(assuntoDoEmail([secao('EPI', [ED, ED])])).toBe('2 editais novos para "EPI"');
    expect(assuntoDoEmail([secao('EPI', [ED]), secao('Uniformes', [ED, ED])])).toBe('3 editais novos nos seus alertas');
  });
  it('cada edital: título limpo, órgão, município/UF, valor, prazo e link do site', () => {
    const e = montarEmail({ secoes: [secao('EPI', [ED])], tokenSairTodos: 'tok-todos' });
    for (const parte of [
      escapar(assunto(ED.objeto).titulo), escapar(nomeProprio(ED.orgao_nome)), 'Joinville/SC', escapar(moeda(1234.56)!),
      `Propostas até ${dataHora(ED.encerramento_em)}`, 'https://www.editalmap.com.br/edital/00394452000103-2026-21982',
    ]) {
      expect(e.html, parte).toContain(parte);
    }
    expect(e.texto).toContain(assunto(ED.objeto).titulo);
    expect(e.texto).toContain('https://www.editalmap.com.br/edital/00394452000103-2026-21982');
  });
  it('sem dado inventado: valor 0/nulo e município ausente', () => {
    const e = montarEmail({ secoes: [secao('EPI', [{ ...ED, valor_estimado: 0, municipio_nome: null }, { ...ED, valor_estimado: null }])], tokenSairTodos: 't' });
    expect(e.html.match(/Valor não informado/g)).toHaveLength(2);
    expect(e.html).toContain('Município não informado/SC');
  });
  it('suspensa aparece; texto do PNCP é escapado', () => {
    const e = montarEmail({ secoes: [secao('EPI', [{ ...ED, situacao_id: 4, objeto: 'Compra de <script>alert(1)</script> luvas' }])], tokenSairTodos: 't' });
    expect(e.html).toContain('Suspensa');
    expect(e.html).not.toContain('<script>');
  });
  it('sobra: diz quantos ficam para o próximo e-mail', () => {
    const e = montarEmail({ secoes: [secao('EPI', [ED, ED], 25)], tokenSairTodos: 't' });
    expect(e.html).toContain('Mais 23 editais novos entram no próximo e-mail.');
  });
  it('descadastro: um por alerta, todos e cabeçalhos de um clique', () => {
    const e = montarEmail({ secoes: [secao('EPI', [ED]), secao('Uniformes', [ED])], tokenSairTodos: 'tok-todos' });
    expect(e.html).toContain(escapar(linkSair('tok-EPI')));
    expect(e.html).toContain(escapar(linkSair('tok-Uniformes')));
    expect(e.html).toContain('Parar de receber este alerta');
    expect(e.html).toContain('Parar todos os alertas');
    expect(e.html).toContain(escapar(linkSair('tok-todos')));
    expect(e.cabecalhos).toEqual({ 'List-Unsubscribe': `<${linkUmClique('tok-todos')}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' });
    expect(linkUmClique('a.b c')).toBe('https://www.editalmap.com.br/api/descadastro?t=a.b%20c');
    expect(e.texto).toContain(linkSair('tok-todos'));
  });
});
```
Run: `npx vitest run lib/alertas/email.test.ts` → FAIL. Crie `lib/alertas/email.ts`:
```ts
import { dataHora, moeda } from '../formato';
import { url } from '../seo/site';
import { rotuloSituacao } from '../situacao';
import { assunto as assuntoDoObjeto, nomeProprio } from '../texto';

/**
 * E-mail dos alertas (Fase 4, §3): um por conta, uma seção por alerta, até 20 editais por alerta. Só o que veio do PNCP,
 * limpo por lib/texto.ts e escapado; valor nulo ou 0 = "Valor não informado". Links absolutos para o site; descadastro
 * por alerta, de todos e de um clique (List-Unsubscribe). Puro: o job monta, o Resend envia.
 */

export const REMETENTE_ALERTAS = 'Edital Map <alertas@editalmap.com.br>';

export type EditalDoEmail = {
  slug: string;
  objeto: string;
  orgao_nome: string;
  municipio_nome: string | null;
  uf: string;
  valor_estimado: number | string | null;
  encerramento_em: string;
  situacao_id: number | null;
};
export type SecaoEmail = { nome: string; editais: EditalDoEmail[]; total: number; tokenSair: string };
export type EmailMontado = { assunto: string; html: string; texto: string; cabecalhos: Record<string, string> };

export function escapar(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export const linkSair = (token: string) => url(`/alertas/sair?t=${encodeURIComponent(token)}`);
export const linkUmClique = (token: string) => url(`/api/descadastro?t=${encodeURIComponent(token)}`);
export const linkEdital = (slug: string) => url(`/edital/${slug}`);

/** Cabeçalhos de descadastro de um clique (RFC 8058). */
export function cabecalhosDescadastro(token: string): Record<string, string> {
  return { 'List-Unsubscribe': `<${linkUmClique(token)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' };
}

const plural = (n: number, um: string, varios: string) => (n === 1 ? `1 ${um}` : `${n} ${varios}`);

export type LinhaEdital = { titulo: string; orgao: string; local: string; valor: string; prazo: string; situacao: string | null; link: string };

export function linhaDoEdital(e: EditalDoEmail): LinhaEdital {
  return {
    titulo: assuntoDoObjeto(e.objeto).titulo,
    orgao: nomeProprio(e.orgao_nome),
    local: `${e.municipio_nome ?? 'Município não informado'}/${e.uf}`,
    valor: moeda(e.valor_estimado) ?? 'Valor não informado',
    prazo: `Propostas até ${dataHora(e.encerramento_em)}`,
    situacao: rotuloSituacao(e.situacao_id) === 'Suspensa' ? 'Suspensa' : null,
    link: linkEdital(e.slug),
  };
}

export function editalHtml(e: EditalDoEmail): string {
  const l = linhaDoEdital(e);
  const situacao = l.situacao ? `<span style="font-size:12px;font-weight:bold;color:#b33a0e;"> · ${l.situacao}</span>` : '';
  return `<tr><td style="padding:14px 0;border-top:1px solid #ddd6c6;">
<a href="${escapar(l.link)}" style="font-size:16px;font-weight:bold;color:#0c2340;text-decoration:underline;">${escapar(l.titulo)}</a>${situacao}
<div style="margin-top:4px;font-size:14px;color:#3e5373;">${escapar(l.orgao)} · ${escapar(l.local)}</div>
<div style="margin-top:4px;font-size:14px;color:#0c2340;">${escapar(l.valor)} · ${escapar(l.prazo)}</div>
</td></tr>`;
}

export function editalTexto(e: EditalDoEmail): string {
  const l = linhaDoEdital(e);
  return [`- ${l.titulo}${l.situacao ? ` (${l.situacao})` : ''}`, `  ${l.orgao} · ${l.local}`, `  ${l.valor} · ${l.prazo}`, `  ${l.link}`].join('\n');
}

/** Moldura comum (alertas e resumo): cabeçalho com a marca, conteúdo, rodapé com os links de descadastro. */
export function moldura(conteudo: string, rodape: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<body style="margin:0;padding:24px 12px;background:#f4f1e8;font-family:Arial,Helvetica,sans-serif;color:#0c2340;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #ddd6c6;border-radius:8px;">
<tr><td style="padding:24px 28px 0;font-size:18px;font-weight:bold;">Edital Map</td></tr>
${conteudo}
<tr><td style="padding:20px 28px 28px;font-size:12px;line-height:1.5;color:#3e5373;border-top:1px solid #ddd6c6;">${rodape}</td></tr>
</table>
</body>
</html>`;
}

const textoSobra = (s: SecaoEmail) => `Mais ${plural(s.total - s.editais.length, 'edital novo entra', 'editais novos entram')} no próximo e-mail.`;

function secaoHtml(s: SecaoEmail): string {
  const sobra = s.total > s.editais.length ? `<tr><td style="padding:10px 0;font-size:13px;color:#3e5373;">${escapar(textoSobra(s))}</td></tr>` : '';
  return `<tr><td style="padding:20px 28px 4px;">
<h2 style="margin:0;font-size:18px;color:#0c2340;">${escapar(s.nome)}</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${s.editais.map(editalHtml).join('')}${sobra}</table>
<p style="margin:8px 0 0;font-size:12px;"><a href="${escapar(linkSair(s.tokenSair))}" style="color:#3e5373;">Parar de receber este alerta</a></p>
</td></tr>`;
}

export function assuntoDoEmail(secoes: readonly SecaoEmail[]): string {
  const n = secoes.reduce((soma, s) => soma + s.editais.length, 0);
  const quantos = plural(n, 'edital novo', 'editais novos');
  return secoes.length === 1 ? `${quantos} para "${secoes[0].nome}"` : `${quantos} nos seus alertas`;
}

export function montarEmail(e: { secoes: SecaoEmail[]; tokenSairTodos: string }): EmailMontado {
  const rodape = `Você recebe este e-mail porque criou alertas no Edital Map. Os editais vêm do PNCP: confira sempre o edital oficial.<br>
<a href="${escapar(url('/alertas'))}" style="color:#3e5373;">Gerenciar alertas</a> · <a href="${escapar(linkSair(e.tokenSairTodos))}" style="color:#3e5373;">Parar todos os alertas</a>`;
  const texto = [
    ...e.secoes.flatMap((s) => [
      `== ${s.nome} ==`,
      ...s.editais.map(editalTexto),
      ...(s.total > s.editais.length ? [textoSobra(s)] : []),
      `Parar de receber este alerta: ${linkSair(s.tokenSair)}`,
      '',
    ]),
    `Gerenciar alertas: ${url('/alertas')}`,
    `Parar todos os alertas: ${linkSair(e.tokenSairTodos)}`,
  ].join('\n');
  return { assunto: assuntoDoEmail(e.secoes), html: moldura(e.secoes.map(secaoHtml).join(''), rodape), texto, cabecalhos: cabecalhosDescadastro(e.tokenSairTodos) };
}
```
Run → PASS.

- [ ] **Step 3: Descadastro no servidor (teste primeiro)**

Crie `lib/servidor/descadastro.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
type Resposta = { data?: unknown; count?: number | null; error: null | { message: string } };
const m = vi.hoisted(() => ({ chamadas: [] as unknown[][], respostas: [] as Resposta[] }));
const proxima = () => Promise.resolve(m.respostas.shift() ?? { data: null, error: null });
function consulta(tabela: string) {
  const c: Record<string, unknown> = {};
  for (const metodo of ['select', 'eq', 'update']) {
    c[metodo] = (...a: unknown[]) => {
      m.chamadas.push([`${tabela}.${metodo}`, ...a]);
      return c;
    };
  }
  c.maybeSingle = proxima;
  c.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => proxima().then(ok, ko);
  return c;
}
vi.mock('./supabase', () => ({
  supabaseServidor: () => ({
    from: (t: string) => consulta(t),
    rpc: (nome: string, args: unknown) => {
      m.chamadas.push([`rpc.${nome}`, args]);
      return proxima();
    },
  }),
}));
const { aplicarDescadastro, textoDoDescadastro } = await import('./descadastro');
const ALERTA = '11111111-1111-4111-8111-111111111111';
const CONTA = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  m.chamadas.length = 0;
  m.respostas.length = 0;
});

describe('descadastro pelo link (sem sessão, só com o alvo do token)', () => {
  it('texto da confirmação', async () => {
    m.respostas.push({ data: { nome: 'EPI' }, error: null });
    expect(await textoDoDescadastro({ tipo: 'alerta', id: ALERTA })).toBe('o alerta "EPI"');
    m.respostas.push({ count: 2, error: null });
    expect(await textoDoDescadastro({ tipo: 'todos', conta: CONTA })).toBe('todos os seus alertas');
    m.respostas.push({ count: 0, error: null });
    expect(await textoDoDescadastro({ tipo: 'todos', conta: CONTA })).toBeNull();
    expect(await textoDoDescadastro({ tipo: 'resumo', conta: CONTA })).toBe('o resumo semanal do Pro');
  });
  it('pausa um alerta, todos da conta, ou desliga o resumo', async () => {
    m.respostas.push({ data: [{ id: ALERTA }], error: null });
    expect(await aplicarDescadastro({ tipo: 'alerta', id: ALERTA }, new Date('2026-10-18T12:00:00Z'))).toBe(1);
    expect(m.chamadas).toContainEqual(['alertas.update', { ativo: false, atualizado_em: '2026-10-18T12:00:00.000Z' }]);
    expect(m.chamadas).toContainEqual(['alertas.eq', 'id', ALERTA]);
    m.respostas.push({ data: [{ id: 'a' }, { id: 'b' }], error: null });
    expect(await aplicarDescadastro({ tipo: 'todos', conta: CONTA })).toBe(2);
    expect(m.chamadas).toContainEqual(['alertas.eq', 'user_id', CONTA]);
    m.respostas.push({ data: true, error: null });
    expect(await aplicarDescadastro({ tipo: 'resumo', conta: CONTA })).toBe(1);
    expect(m.chamadas).toContainEqual(['rpc.parar_resumo_semanal', { p_user: CONTA }]);
  });
});
```
Run → FAIL. Crie `lib/servidor/descadastro.ts`:
```ts
import 'server-only';
import type { AlvoDescadastro } from '../alertas/token';
import { supabaseServidor } from './supabase';

/**
 * Descadastro pelo link do e-mail, sem login: só com o alvo de um token verificado (lerTokenDescadastro, HMAC com
 * ALERTAS_SEGREDO). Pausa (nunca apaga) o alerta ou todos os da conta; o resumo semanal vira desligado
 * (parar_resumo_semanal, 0016: perfis só se grava por lib/servidor/conta.ts ou por função do banco).
 */

export async function textoDoDescadastro(alvo: AlvoDescadastro): Promise<string | null> {
  if (alvo.tipo === 'resumo') return 'o resumo semanal do Pro';
  const sb = supabaseServidor();
  if (alvo.tipo === 'alerta') {
    const { data, error } = await sb.from('alertas').select('nome').eq('id', alvo.id).maybeSingle();
    if (error) throw new Error(`descadastro: ${error.message}`);
    return data ? `o alerta "${String((data as { nome: unknown }).nome)}"` : null;
  }
  const { count, error } = await sb.from('alertas').select('id', { count: 'exact', head: true }).eq('user_id', alvo.conta);
  if (error) throw new Error(`descadastro: ${error.message}`);
  return (count ?? 0) > 0 ? 'todos os seus alertas' : null;
}

/** Quantos alertas pausou (resumo: 1 se havia perfil). */
export async function aplicarDescadastro(alvo: AlvoDescadastro, agora: Date = new Date()): Promise<number> {
  const sb = supabaseServidor();
  if (alvo.tipo === 'resumo') {
    const { data, error } = await sb.rpc('parar_resumo_semanal', { p_user: alvo.conta });
    if (error) throw new Error(`parar resumo: ${error.message}`);
    return data === true ? 1 : 0;
  }
  const pausar = sb.from('alertas').update({ ativo: false, atualizado_em: agora.toISOString() });
  const filtrado = alvo.tipo === 'alerta' ? pausar.eq('id', alvo.id) : pausar.eq('user_id', alvo.conta);
  const { data, error } = await filtrado.select('id');
  if (error) throw new Error(`descadastro: ${error.message}`);
  return ((data ?? []) as unknown[]).length;
}
```
Run → PASS.

- [ ] **Step 4: Rota de um clique e página de confirmação (teste primeiro)**

Crie `app/api/descadastro/route.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { criarTokenDescadastro } from '@/lib/alertas/token';

vi.mock('server-only', () => ({}));
const m = vi.hoisted(() => ({ aplicar: vi.fn(async (..._a: unknown[]) => 1) }));
vi.mock('@/lib/servidor/descadastro', () => ({ aplicarDescadastro: m.aplicar }));

const SEGREDO = 's'.repeat(40);
process.env.ALERTAS_SEGREDO = SEGREDO;
const { POST } = await import('./route');
const ALERTA = '11111111-1111-4111-8111-111111111111';

beforeEach(() => vi.clearAllMocks());

describe('POST /api/descadastro', () => {
  it('um clique do provedor (form, de fora do site): token válido pausa', async () => {
    const t = criarTokenDescadastro({ tipo: 'alerta', id: ALERTA }, SEGREDO);
    const r = await POST(new Request(`http://localhost/api/descadastro?t=${encodeURIComponent(t)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'sec-fetch-site': 'cross-site' },
      body: 'List-Unsubscribe=One-Click',
    }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, pausados: 1 });
    expect(m.aplicar).toHaveBeenCalledWith({ tipo: 'alerta', id: ALERTA });
    expect(r.headers.get('cache-control')).toBe('private, no-store');
  });
  it('token inválido ou ausente: 400 sem mexer em nada', async () => {
    for (const q of ['', '?t=x', `?t=${encodeURIComponent(criarTokenDescadastro({ tipo: 'alerta', id: ALERTA }, 'o'.repeat(40)))}`]) {
      expect((await POST(new Request(`http://localhost/api/descadastro${q}`, { method: 'POST' }))).status).toBe(400);
    }
    expect(m.aplicar).not.toHaveBeenCalled();
  });
  it('banco fora: 502', async () => {
    m.aplicar.mockRejectedValueOnce(new Error('fora'));
    const t = criarTokenDescadastro({ tipo: 'resumo', conta: ALERTA }, SEGREDO);
    expect((await POST(new Request(`http://localhost/api/descadastro?t=${t}`, { method: 'POST' }))).status).toBe(502);
  });
});
```
Run → FAIL. Crie `app/api/descadastro/route.ts`:
```ts
import { lerSegredo, lerTokenDescadastro } from '@/lib/alertas/token';
import { SEM_CACHE } from '@/lib/http';
import { aplicarDescadastro } from '@/lib/servidor/descadastro';

/**
 * Descadastro de um clique (List-Unsubscribe-Post, RFC 8058) e botão de /alertas/sair. Exceção documentada às rotas
 * da conta: sem sessão e sem checagem de origem (o provedor de e-mail manda o POST de fora do site); a autorização é só
 * o token assinado com ALERTAS_SEGREDO, que pausa (não apaga).
 */
export async function POST(request: Request) {
  const alvo = lerTokenDescadastro(new URL(request.url).searchParams.get('t'), lerSegredo(process.env.ALERTAS_SEGREDO));
  if (!alvo) return Response.json({ erro: 'Link inválido.' }, { status: 400, headers: SEM_CACHE });
  try {
    const pausados = await aplicarDescadastro(alvo);
    return Response.json({ ok: true, pausados }, { headers: SEM_CACHE });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Não foi possível concluir agora. Tente de novo.' }, { status: 502, headers: SEM_CACHE });
  }
}
```

Crie `components/alertas/ConfirmarDescadastro.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';

/** Botão de /alertas/sair: o GET só mostra (robôs de e-mail abrem links); o POST para de enviar. */
export function ConfirmarDescadastro({ token, texto }: { token: string; texto: string }) {
  const [fase, setFase] = useState<'pergunta' | 'enviando' | 'pronto' | 'erro'>('pergunta');

  async function confirmar() {
    if (fase === 'enviando') return;
    setFase('enviando');
    try {
      const r = await fetch(`/api/descadastro?t=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      setFase(r.ok ? 'pronto' : 'erro');
    } catch {
      setFase('erro');
    }
  }

  if (fase === 'pronto') {
    return (
      <p role="status" className="text-[15px]">
        Pronto: você não vai mais receber {texto} por e-mail. Nada foi apagado; para voltar a receber, entre na conta e retome em{' '}
        <Link href="/alertas" prefetch={false} className="font-semibold text-pin-strong underline-offset-2 hover:underline">
          Alertas
        </Link>
        .
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px]">Parar de receber {texto} por e-mail? Nada é apagado: o envio só fica pausado.</p>
      <button
        type="button"
        onClick={() => void confirmar()}
        aria-disabled={fase === 'enviando' || undefined}
        className="inline-flex h-11 w-fit items-center rounded-sm bg-pin px-5 text-sm font-semibold text-on-pin aria-disabled:opacity-60"
      >
        {fase === 'enviando' ? 'Parando…' : 'Parar de receber'}
      </button>
      {fase === 'erro' ? (
        <p role="alert" className="text-sm font-semibold text-pin-strong">
          Não foi possível concluir agora. Tente de novo.
        </p>
      ) : null}
    </div>
  );
}
```

Crie `app/alertas/sair/page.tsx`:
```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { ConfirmarDescadastro } from '@/components/alertas/ConfirmarDescadastro';
import { lerSegredo, lerTokenDescadastro } from '@/lib/alertas/token';
import { textoDoDescadastro } from '@/lib/servidor/descadastro';

export const metadata: Metadata = { title: 'Parar de receber', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ t?: string | string[] }> };

/** Link "Parar de receber" dos e-mails, sem login: confere o token (ALERTAS_SEGREDO) e pede a confirmação. */
export default async function SairDosAlertas({ searchParams }: Props) {
  await connection();
  const { t } = await searchParams;
  const token = typeof t === 'string' ? t : null;
  const alvo = lerTokenDescadastro(token, lerSegredo(process.env.ALERTAS_SEGREDO));
  let texto: string | null | 'erro' = null;
  if (alvo) {
    try {
      texto = await textoDoDescadastro(alvo);
    } catch (erro) {
      console.error(erro);
      texto = 'erro';
    }
  }
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 py-10">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">Parar de receber</h1>
        {!alvo || !token ? (
          <p className="text-[15px]">
            Este link não vale. Para parar os e-mails, entre na sua conta e pause em{' '}
            <Link href="/alertas" prefetch={false} className="font-semibold text-pin-strong underline-offset-2 hover:underline">
              Alertas
            </Link>
            .
          </p>
        ) : texto === 'erro' ? (
          <p className="text-[15px]">Não foi possível abrir agora. Tente de novo em instantes.</p>
        ) : texto === null ? (
          <p className="text-[15px]">Este alerta não existe mais. Nada a fazer.</p>
        ) : (
          <ConfirmarDescadastro token={token} texto={texto} />
        )}
      </main>
    </>
  );
}
```

- [ ] **Step 5: Rodar, verificar e commitar**

Run: `npx vitest run lib/alertas lib/servidor/descadastro.test.ts app/api/descadastro && npm test && npm run typecheck && npm run build`
Expected: PASS; `/alertas/sair` dinâmica (ƒ).
```bash
git add lib/alertas/token.ts lib/alertas/token.test.ts lib/alertas/email.ts lib/alertas/email.test.ts lib/servidor/descadastro.ts lib/servidor/descadastro.test.ts app/api/descadastro app/alertas/sair components/alertas/ConfirmarDescadastro.tsx
git commit -m "feat(alertas): e-mail dos alertas, tokens de descadastro e /alertas/sair" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 10: Job de envio dos alertas (seleção, sem repetir, nova tentativa, histórico, evento)

**Files:**
- Create: `worker/alertas/banco.ts`, `worker/alertas/resend.ts`, `worker/alertas/executar.ts`, `worker/enviar-alertas.ts`
- Modify: `package.json` (script `worker:alertas`)
- Test: `worker/alertas/resend.test.ts`, `worker/alertas/executar.test.ts`, `worker/alertas/banco.test.ts`

**Interfaces:**
- Consumes: `alertas_para_envio`, `editais_do_alerta`, `registrar_envio_alerta` (Task 1); `filtrosDoRadar`, `radarDaLinha`, `Radar` (`lib/radar.ts`); `StatusEnvio` (Task 7); `montarEmail`, `REMETENTE_ALERTAS`, `EditalDoEmail`, `EmailMontado` (Task 9); `criarTokenDescadastro`, `lerSegredo` (Task 9); `LIMITES_CONTA`, `lerPlano`, `NivelConta` (Task 3); `criarSupabase` (`worker/banco.ts`); `lerSupabase` (`worker/config.ts`); `./ambiente`.
- Produces:
  - `worker/alertas/banco.ts`: `type AlertaParaEnvio = { id; userId; email; plano: NivelConta; nome; radar: Radar; ultimoEnvioEm: string | null; criadoEm: string }`; `type EditalAlerta = EditalDoEmail & { id: string }`; `type RegistroEnvio = { alertaId; status: StatusEnvio; qtd; tentativas; erro?; idMensagem?; ids?: string[]; selecionadoEm: string; avancar?: boolean }`; `VISITANTE_JOB = '00000000-0000-4000-8000-000000000001'`; `interface BancoAlertas { alertasParaEnvio(); editaisDoAlerta(a, desde, limite); registrarEnvio(r); gravarEventoEnvio(detalhe: { qtd: number; alertas: number }) }`; `alertaDaLinhaEnvio(l)`; `editalDaLinha(l: Record<string, unknown>): EditalAlerta`; `criarBancoAlertas(sb: SupabaseClient): BancoAlertas`.
  - `worker/alertas/resend.ts`: `URL_RESEND`; `ESPERAS_REENVIO_MS = [2000, 4000, 8000]`; `type Mensagem = { para; assunto; html; texto; cabecalhos; idempotencia }`; `type ResultadoEnvio = { ok: true; id: string; tentativas: number } | { ok: false; erro: string; tentativas: number }`; `type Enviar = (m: Mensagem) => Promise<ResultadoEnvio>`; `repetivel(status: number | null): boolean`; `criarEnvioResend(o: { chave: string; remetente?: string; buscar?: typeof fetch; esperar?: (ms: number) => Promise<void>; timeoutMs?: number }): Enviar`.
  - `worker/alertas/executar.ts`: `LIMITE_EDITAIS_EMAIL = 20`; `PAUSA_ENTRE_EMAILS_MS = 600`; `type DepsEnvio = { enviar: Enviar | null; segredo: string | null; agora: () => Date; esperar: (ms: number) => Promise<void>; log: (linha: string) => void }`; `type DepsAlertas = DepsEnvio & { banco: BancoAlertas }`; `type ResumoAlertas = { contas; emails; enviados; semNovidades; falhas; puladosPlano; editais }`; `desdeDoAlerta(ultimoEnvioEm: string | null, agora: Date): string`; `porConta(lista): AlertaParaEnvio[][]`; `separarPorPlano(alertas): { permitidos; pulados }`; `chaveIdempotencia(tipo: 'alertas' | 'resumo', userId: string, ids: readonly string[]): string`; `motivoSemEnvio(d: DepsEnvio): string | null`; `mensagemDeErro(erro: unknown): string`; `executarAlertas(d: DepsAlertas): Promise<ResumoAlertas>`.
  - `npm run worker:alertas` → `tsx worker/enviar-alertas.ts` (sai com código 1 se houve falha).

- [ ] **Step 1: Cliente do Resend (teste primeiro)**

Crie `worker/alertas/resend.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';
import { criarEnvioResend, ESPERAS_REENVIO_MS, repetivel, type Mensagem } from './resend';

const MSG: Mensagem = {
  para: 'dono@empresa.com.br', assunto: '1 edital novo para "EPI"', html: '<p>x</p>', texto: 'x',
  cabecalhos: { 'List-Unsubscribe': '<https://www.editalmap.com.br/api/descadastro?t=t>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  idempotencia: 'alertas/u/abc',
};
const resposta = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } });

describe('envio pelo Resend', () => {
  it('aceito de primeira: id e 1 tentativa; pedido com chave, remetente, cabeçalhos e idempotência', async () => {
    const buscar = vi.fn(async (..._a: unknown[]) => resposta(200, { id: 'msg-1' }));
    const esperar = vi.fn(async (_ms: number) => undefined);
    const r = await criarEnvioResend({ chave: 're_teste', buscar: buscar as unknown as typeof fetch, esperar })(MSG);
    expect(r).toEqual({ ok: true, id: 'msg-1', tentativas: 1 });
    const [url, init] = buscar.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    const h = init.headers as Record<string, string>;
    expect(h.authorization).toBe('Bearer re_teste');
    expect(h['idempotency-key']).toBe('alertas/u/abc');
    expect(JSON.parse(String(init.body))).toEqual({
      from: 'Edital Map <alertas@editalmap.com.br>', to: ['dono@empresa.com.br'], subject: MSG.assunto, html: MSG.html, text: MSG.texto, headers: MSG.cabecalhos,
    });
    expect(esperar).not.toHaveBeenCalled();
  });
  it('429 e 5xx: tenta de novo esperando 2, 4 e 8 s', async () => {
    const buscar = vi.fn().mockResolvedValueOnce(resposta(429, { message: 'limite' })).mockResolvedValueOnce(resposta(503, {})).mockResolvedValueOnce(resposta(200, { id: 'msg-2' }));
    const esperar = vi.fn(async (_ms: number) => undefined);
    expect(await criarEnvioResend({ chave: 'k', buscar: buscar as unknown as typeof fetch, esperar })(MSG)).toEqual({ ok: true, id: 'msg-2', tentativas: 3 });
    expect(esperar.mock.calls.map((c) => c[0])).toEqual([2000, 4000]);
  });
  it('falha final depois de 4 tentativas; o erro não traz a chave', async () => {
    const buscar = vi.fn(async () => resposta(500, { message: 'fora' }));
    const esperar = vi.fn(async (_ms: number) => undefined);
    const r = await criarEnvioResend({ chave: 're_segredo', buscar: buscar as unknown as typeof fetch, esperar })(MSG);
    expect(r).toEqual({ ok: false, erro: 'Resend 500: fora', tentativas: 4 });
    expect(esperar.mock.calls.map((c) => c[0])).toEqual([...ESPERAS_REENVIO_MS]);
    expect(JSON.stringify(r)).not.toContain('re_segredo');
  });
  it('4xx (pedido errado) não repete; rede caída repete', async () => {
    const um = vi.fn(async () => resposta(422, { message: 'inválido' }));
    expect(await criarEnvioResend({ chave: 'k', buscar: um as unknown as typeof fetch, esperar: async () => undefined })(MSG)).toEqual({ ok: false, erro: 'Resend 422: inválido', tentativas: 1 });
    const rede = vi.fn().mockRejectedValueOnce(new Error('ECONNRESET')).mockResolvedValueOnce(resposta(200, { id: 'msg-3' }));
    expect(await criarEnvioResend({ chave: 'k', buscar: rede as unknown as typeof fetch, esperar: async () => undefined })(MSG)).toEqual({ ok: true, id: 'msg-3', tentativas: 2 });
  });
  it('o que repete', () => {
    expect([null, 429, 500, 503].map(repetivel)).toEqual([true, true, true, true]);
    expect([200, 400, 401, 403, 422].map(repetivel)).toEqual([false, false, false, false, false]);
  });
});
```
Run: `npx vitest run worker/alertas/resend.test.ts` → FAIL. Crie `worker/alertas/resend.ts`:
```ts
import { REMETENTE_ALERTAS } from '../../lib/alertas/email';

/**
 * Envio pela API HTTP do Resend (sem dependência: fetch do Node 24). Repete só o que pode dar certo depois: 429, 5xx,
 * rede ou tempo (15 s), com esperas de 2, 4 e 8 s (4 tentativas no total, a regra do PNCP no worker). 4xx é falha
 * final. Idempotency-Key: a mesma mensagem repetida em 24 h não sai duas vezes. O erro nunca leva a chave.
 */

export const URL_RESEND = 'https://api.resend.com/emails';
export const ESPERAS_REENVIO_MS = [2000, 4000, 8000] as const;

export type Mensagem = { para: string; assunto: string; html: string; texto: string; cabecalhos: Record<string, string>; idempotencia: string };
export type ResultadoEnvio = { ok: true; id: string; tentativas: number } | { ok: false; erro: string; tentativas: number };
export type Enviar = (m: Mensagem) => Promise<ResultadoEnvio>;

export function repetivel(status: number | null): boolean {
  return status === null || status === 429 || status >= 500;
}

type Opcoes = { chave: string; remetente?: string; buscar?: typeof fetch; esperar?: (ms: number) => Promise<void>; timeoutMs?: number };

export function criarEnvioResend(o: Opcoes): Enviar {
  const buscar = o.buscar ?? fetch;
  const esperar = o.esperar ?? ((ms: number) => new Promise<void>((pronto) => setTimeout(pronto, ms)));
  return async (m) => {
    const total = ESPERAS_REENVIO_MS.length + 1;
    let erro = '';
    for (let tentativa = 1; tentativa <= total; tentativa++) {
      let status: number | null = null;
      try {
        const r = await buscar(URL_RESEND, {
          method: 'POST',
          headers: { authorization: `Bearer ${o.chave}`, 'content-type': 'application/json', 'idempotency-key': m.idempotencia },
          body: JSON.stringify({ from: o.remetente ?? REMETENTE_ALERTAS, to: [m.para], subject: m.assunto, html: m.html, text: m.texto, headers: m.cabecalhos }),
          signal: AbortSignal.timeout(o.timeoutMs ?? 15_000),
        });
        status = r.status;
        const corpo = (await r.json().catch(() => null)) as { id?: unknown; message?: unknown } | null;
        if (r.ok && typeof corpo?.id === 'string') return { ok: true, id: corpo.id, tentativas: tentativa };
        erro = `Resend ${r.status}: ${typeof corpo?.message === 'string' ? corpo.message : 'sem detalhe'}`;
      } catch (e) {
        erro = `Resend: ${e instanceof Error ? e.message : String(e)}`;
      }
      if (!repetivel(status) || tentativa === total) return { ok: false, erro: erro.slice(0, 300), tentativas: tentativa };
      await esperar(ESPERAS_REENVIO_MS[tentativa - 1]);
    }
    return { ok: false, erro: erro.slice(0, 300), tentativas: total };
  };
}
```
Run → PASS.

- [ ] **Step 2: Acesso ao banco do job (teste primeiro)**

Crie `worker/alertas/banco.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { alertaDaLinhaEnvio, criarBancoAlertas, VISITANTE_JOB } from './banco';

const LINHA = {
  alerta_id: '11111111-1111-4111-8111-111111111111', user_id: '22222222-2222-4222-8222-222222222222', email: 'dono@empresa.com.br', plano: 'basic',
  nome: 'EPI', termos: ['luva'], termos_excluir: [], ufs: ['SC'], municipios: [], valor_min: null, valor_max: '50000.00', modalidades: [], so_me_epp: false,
  ultimo_envio_em: null, criado_em: '2026-10-18T10:00:00+00:00',
};

describe('banco do job dos alertas', () => {
  it('linha → alerta (basic antigo vale pro)', () => {
    expect(alertaDaLinhaEnvio(LINHA)).toEqual({
      id: LINHA.alerta_id, userId: LINHA.user_id, email: 'dono@empresa.com.br', plano: 'pro', nome: 'EPI',
      radar: { termos: ['luva'], termosExcluir: [], ufs: ['SC'], municipios: [], valorMin: null, valorMax: 50000, modalidades: [], soMeEpp: false },
      ultimoEnvioEm: null, criadoEm: '2026-10-18T10:00:00+00:00',
    });
  });
  it('editais_do_alerta com os filtros do radar, a janela e o limite; registrar e evento', async () => {
    const chamadas: unknown[][] = [];
    const sb = {
      rpc: vi.fn(async (nome: string, args: unknown) => {
        chamadas.push([nome, args]);
        if (nome === 'editais_do_alerta') return { data: [{ id: 'e1', slug: 's1', objeto: 'o', orgao_nome: 'g', municipio_nome: null, uf: 'SC', valor_estimado: '10.50', encerramento_em: 'x', situacao_id: 1, pontuacao: 60, total: 7 }], error: null };
        return { data: null, error: null };
      }),
      from: vi.fn(() => ({ insert: async (linha: unknown) => (chamadas.push(['eventos', linha]), { error: null }) })),
    } as unknown as SupabaseClient;
    const banco = criarBancoAlertas(sb);
    const r = await banco.editaisDoAlerta(alertaDaLinhaEnvio(LINHA), '2026-10-18T10:00:00.000Z', 20);
    expect(r).toEqual({ total: 7, editais: [{ id: 'e1', slug: 's1', objeto: 'o', orgao_nome: 'g', municipio_nome: null, uf: 'SC', valor_estimado: 10.5, encerramento_em: 'x', situacao_id: 1 }] });
    expect(chamadas[0][1]).toMatchObject({ p_alerta: LINHA.alerta_id, p_desde: '2026-10-18T10:00:00.000Z', p_termos: ['luva'], p_ufs: ['SC'], p_valor_max: 50000, p_limite: 20 });
    await banco.registrarEnvio({ alertaId: 'a', status: 'enviado', qtd: 1, tentativas: 2, idMensagem: 'm', ids: ['e1'], selecionadoEm: 't', avancar: false });
    expect(chamadas[1]).toEqual(['registrar_envio_alerta', { p_alerta: 'a', p_status: 'enviado', p_qtd: 1, p_tentativas: 2, p_erro: null, p_id_mensagem: 'm', p_ids: ['e1'], p_selecionado_em: 't', p_avancar: false }]);
    await banco.gravarEventoEnvio({ qtd: 3, alertas: 2 });
    expect(chamadas[2]).toEqual(['eventos', { visitante: VISITANTE_JOB, tipo: 'alerta_enviado', detalhe: { qtd: 3, alertas: 2 }, interno: false }]);
  });
});
```
Run → FAIL. Crie `worker/alertas/banco.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EditalDoEmail } from '../../lib/alertas/email';
import type { StatusEnvio } from '../../lib/alertas/regras';
import { lerPlano, type NivelConta } from '../../lib/limitesConta';
import { filtrosDoRadar, radarDaLinha, type Radar } from '../../lib/radar';

/** O que o job dos alertas lê e grava (service role, funções da 0016). Sem e-mail em log nem em evento. */

export type AlertaParaEnvio = {
  id: string;
  userId: string;
  email: string;
  plano: NivelConta;
  nome: string;
  radar: Radar;
  ultimoEnvioEm: string | null;
  criadoEm: string;
};
export type EditalAlerta = EditalDoEmail & { id: string };
export type RegistroEnvio = {
  alertaId: string;
  status: StatusEnvio;
  qtd: number;
  tentativas: number;
  erro?: string | null;
  idMensagem?: string | null;
  ids?: string[];
  selecionadoEm: string;
  avancar?: boolean;
};

/** O job não tem navegador: os eventos dele usam este visitante fixo. */
export const VISITANTE_JOB = '00000000-0000-4000-8000-000000000001';

export interface BancoAlertas {
  alertasParaEnvio(): Promise<AlertaParaEnvio[]>;
  editaisDoAlerta(a: AlertaParaEnvio, desde: string, limite: number): Promise<{ editais: EditalAlerta[]; total: number }>;
  registrarEnvio(r: RegistroEnvio): Promise<void>;
  gravarEventoEnvio(detalhe: { qtd: number; alertas: number }): Promise<void>;
}

export function alertaDaLinhaEnvio(l: Record<string, unknown>): AlertaParaEnvio {
  return {
    id: String(l.alerta_id),
    userId: String(l.user_id),
    email: String(l.email),
    plano: lerPlano(l.plano),
    nome: String(l.nome),
    radar: radarDaLinha(l),
    ultimoEnvioEm: l.ultimo_envio_em ? String(l.ultimo_envio_em) : null,
    criadoEm: String(l.criado_em),
  };
}

/** Linha de editais_do_alerta ou de um item do resumo (numeric pode chegar como texto) → edital do e-mail. */
export function editalDaLinha(l: Record<string, unknown>): EditalAlerta {
  return {
    id: String(l.id),
    slug: String(l.slug),
    objeto: String(l.objeto),
    orgao_nome: String(l.orgao_nome),
    municipio_nome: l.municipio_nome === null || l.municipio_nome === undefined ? null : String(l.municipio_nome),
    uf: String(l.uf),
    valor_estimado: l.valor_estimado === null || l.valor_estimado === undefined ? null : Number(l.valor_estimado),
    encerramento_em: String(l.encerramento_em),
    situacao_id: l.situacao_id === null || l.situacao_id === undefined ? null : Number(l.situacao_id),
  };
}

const falhar = (contexto: string, erro: { message: string } | null) => {
  if (erro) throw new Error(`${contexto}: ${erro.message}`);
};

export function criarBancoAlertas(sb: SupabaseClient): BancoAlertas {
  return {
    async alertasParaEnvio() {
      const { data, error } = await sb.rpc('alertas_para_envio');
      falhar('alertas_para_envio', error);
      return ((data ?? []) as Array<Record<string, unknown>>).map(alertaDaLinhaEnvio);
    },
    async editaisDoAlerta(a, desde, limite) {
      const { data, error } = await sb.rpc('editais_do_alerta', { p_alerta: a.id, p_desde: desde, ...filtrosDoRadar(a.radar), p_limite: limite });
      falhar('editais_do_alerta', error);
      const linhas = (data ?? []) as Array<Record<string, unknown>>;
      return { total: Number(linhas[0]?.total ?? 0), editais: linhas.map(editalDaLinha) };
    },
    async registrarEnvio(r) {
      const { error } = await sb.rpc('registrar_envio_alerta', {
        p_alerta: r.alertaId, p_status: r.status, p_qtd: r.qtd, p_tentativas: r.tentativas, p_erro: r.erro ?? null,
        p_id_mensagem: r.idMensagem ?? null, p_ids: r.ids ?? null, p_selecionado_em: r.selecionadoEm, p_avancar: r.avancar ?? true,
      });
      falhar('registrar_envio_alerta', error);
    },
    async gravarEventoEnvio(detalhe) {
      const { error } = await sb.from('eventos').insert({ visitante: VISITANTE_JOB, tipo: 'alerta_enviado', detalhe, interno: false });
      falhar('evento alerta_enviado', error);
    },
  };
}
```
Run → PASS.

- [ ] **Step 3: A rodada (teste primeiro)**

Crie `worker/alertas/executar.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';
import { lerTokenDescadastro } from '../../lib/alertas/token';
import type { Radar } from '../../lib/radar';
import type { AlertaParaEnvio, BancoAlertas, EditalAlerta, RegistroEnvio } from './banco';
import { chaveIdempotencia, executarAlertas, PAUSA_ENTRE_EMAILS_MS, type DepsAlertas } from './executar';
import type { Mensagem, ResultadoEnvio } from './resend';

const SEGREDO = 'x'.repeat(40);
const AGORA = new Date('2026-10-19T10:00:00Z');
const RADAR: Radar = { termos: ['luva'], termosExcluir: [], ufs: [], municipios: [], valorMin: null, valorMax: null, modalidades: [], soMeEpp: false };
const al = (id: string, userId: string, plano: 'gratis' | 'pro', criadoEm: string, extra: Partial<AlertaParaEnvio> = {}): AlertaParaEnvio => ({
  id, userId, email: `${userId}@empresa.com.br`, plano, nome: `alerta ${id}`, radar: RADAR, ultimoEnvioEm: null, criadoEm, ...extra,
});
const ed = (id: string): EditalAlerta => ({
  id, slug: `00394452000103-2026-${id.length}`, objeto: 'Aquisição de luvas', orgao_nome: 'PREFEITURA', municipio_nome: 'Joinville', uf: 'SC', valor_estimado: 100,
  encerramento_em: '2026-10-30T13:00:00Z', situacao_id: 1,
});

function montar(alertas: AlertaParaEnvio[], editais: Record<string, { editais: EditalAlerta[]; total: number } | Error> = {}, envio?: ResultadoEnvio) {
  const ordem: string[] = [];
  const registros: RegistroEnvio[] = [];
  const eventos: unknown[] = [];
  const consultas: Array<{ id: string; desde: string; limite: number }> = [];
  const banco: BancoAlertas = {
    alertasParaEnvio: async () => alertas,
    editaisDoAlerta: async (a, desde, limite) => {
      consultas.push({ id: a.id, desde, limite });
      const r = editais[a.id] ?? { editais: [], total: 0 };
      if (r instanceof Error) throw r;
      return r;
    },
    registrarEnvio: async (r) => {
      ordem.push(`registrar:${r.status}`);
      registros.push(r);
    },
    gravarEventoEnvio: async (d) => {
      eventos.push(d);
    },
  };
  const enviar = vi.fn(async (m: Mensagem) => {
    ordem.push(`enviar:${m.para}`);
    return envio ?? { ok: true as const, id: 'msg-1', tentativas: 1 };
  });
  const esperar = vi.fn(async (_ms: number) => {
    ordem.push('esperar');
  });
  const deps: DepsAlertas = { banco, enviar, segredo: SEGREDO, agora: () => AGORA, esperar, log: () => undefined };
  return { deps, ordem, registros, eventos, consultas, enviar, esperar };
}

describe('rodada dos alertas', () => {
  it('Grátis: pulado_plano em todos, sem buscar editais nem enviar', async () => {
    const t = montar([al('a', 'u1', 'gratis', '2026-10-01T00:00:00Z'), al('b', 'u1', 'gratis', '2026-10-02T00:00:00Z')]);
    const r = await executarAlertas(t.deps);
    expect(t.registros.map((x) => [x.alertaId, x.status])).toEqual([['a', 'pulado_plano'], ['b', 'pulado_plano']]);
    expect(t.consultas).toEqual([]);
    expect(t.enviar).not.toHaveBeenCalled();
    expect(r).toMatchObject({ contas: 1, emails: 0, puladosPlano: 2 });
  });
  it('Pro: até 5 alertas, pelo mais antigo; o 6º fica pulado_plano', async () => {
    const lista = ['f', 'e', 'd', 'c', 'b', 'a'].map((id, i) => al(id, 'u1', 'pro', `2026-10-0${6 - i}T00:00:00Z`));
    const t = montar(lista);
    await executarAlertas(t.deps);
    expect(t.consultas.map((c) => c.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(t.registros.find((x) => x.status === 'pulado_plano')?.alertaId).toBe('f');
  });
  it('janela: sem envio, últimas 24 h; com envio, desde ele; até 20 editais', async () => {
    const t = montar([al('a', 'u1', 'pro', '2026-10-01T00:00:00Z'), al('b', 'u1', 'pro', '2026-10-02T00:00:00Z', { ultimoEnvioEm: '2026-10-17T10:00:05Z' })]);
    await executarAlertas(t.deps);
    expect(t.consultas).toEqual([
      { id: 'a', desde: '2026-10-18T10:00:00.000Z', limite: 20 },
      { id: 'b', desde: '2026-10-17T10:00:05Z', limite: 20 },
    ]);
  });
  it('sem novidade: sem_novidades e nenhum e-mail', async () => {
    const t = montar([al('a', 'u1', 'pro', '2026-10-01T00:00:00Z')]);
    const r = await executarAlertas(t.deps);
    expect(t.registros.map((x) => x.status)).toEqual(['sem_novidades']);
    expect(t.enviar).not.toHaveBeenCalled();
    expect(r.semNovidades).toBe(1);
  });
  it('um e-mail por conta com as seções dos alertas com novidade; enviado só depois do aceite, com os ids', async () => {
    const t = montar(
      [al('a', 'u1', 'pro', '2026-10-01T00:00:00Z'), al('b', 'u1', 'pro', '2026-10-02T00:00:00Z'), al('c', 'u1', 'pro', '2026-10-03T00:00:00Z')],
      { a: { editais: [ed('e1'), ed('e22')], total: 2 }, b: { editais: [ed('e333')], total: 1 } },
    );
    const r = await executarAlertas(t.deps);
    expect(t.enviar).toHaveBeenCalledTimes(1);
    const m = t.enviar.mock.calls[0][0];
    expect(m.para).toBe('u1@empresa.com.br');
    expect(m.assunto).toBe('3 editais novos nos seus alertas');
    expect(t.ordem).toEqual(['registrar:sem_novidades', 'enviar:u1@empresa.com.br', 'registrar:enviado', 'registrar:enviado']);
    expect(t.registros.filter((x) => x.status === 'enviado')).toEqual([
      { alertaId: 'a', status: 'enviado', qtd: 2, tentativas: 1, idMensagem: 'msg-1', ids: ['e1', 'e22'], selecionadoEm: AGORA.toISOString(), avancar: true },
      { alertaId: 'b', status: 'enviado', qtd: 1, tentativas: 1, idMensagem: 'msg-1', ids: ['e333'], selecionadoEm: AGORA.toISOString(), avancar: true },
    ]);
    expect(t.eventos).toEqual([{ qtd: 3, alertas: 2 }]);
    expect(r).toMatchObject({ contas: 1, emails: 1, enviados: 2, semNovidades: 1, editais: 3, falhas: 0 });
  });
  it('List-Unsubscribe com um token que vale para "todos" da conta', async () => {
    const conta = '22222222-2222-4222-8222-222222222222';
    const t = montar([al('a', conta, 'pro', '2026-10-01T00:00:00Z')], { a: { editais: [ed('e1')], total: 1 } });
    await executarAlertas(t.deps);
    const lista = t.enviar.mock.calls[0][0].cabecalhos['List-Unsubscribe'];
    const token = decodeURIComponent(/t=([^>]+)>/.exec(lista)![1]);
    expect(lerTokenDescadastro(token, SEGREDO)).toEqual({ tipo: 'todos', conta });
  });
  it('sobra (mais de 20): a janela não avança', async () => {
    const t = montar([al('a', 'u1', 'pro', '2026-10-01T00:00:00Z')], { a: { editais: [ed('e1')], total: 25 } });
    await executarAlertas(t.deps);
    expect(t.registros[0]).toMatchObject({ status: 'enviado', avancar: false });
  });
  it('falha do Resend: falhou com o erro e as tentativas, sem evento', async () => {
    const t = montar([al('a', 'u1', 'pro', '2026-10-01T00:00:00Z')], { a: { editais: [ed('e1')], total: 1 } }, { ok: false, erro: 'Resend 500: fora', tentativas: 4 });
    const r = await executarAlertas(t.deps);
    expect(t.registros).toEqual([{ alertaId: 'a', status: 'falhou', qtd: 1, tentativas: 4, erro: 'Resend 500: fora', selecionadoEm: AGORA.toISOString() }]);
    expect(t.eventos).toEqual([]);
    expect(r.falhas).toBe(1);
  });
  it('sem chave ou sem segredo: falhou com o motivo, sem chamar o Resend', async () => {
    for (const [mudanca, motivo] of [[{ enviar: null }, 'RESEND_API_KEY ausente'], [{ segredo: null }, 'ALERTAS_SEGREDO ausente']] as const) {
      const t = montar([al('a', 'u1', 'pro', '2026-10-01T00:00:00Z')], { a: { editais: [ed('e1')], total: 1 } });
      const r = await executarAlertas({ ...t.deps, ...mudanca });
      expect(t.registros).toEqual([{ alertaId: 'a', status: 'falhou', qtd: 1, tentativas: 0, erro: motivo, selecionadoEm: AGORA.toISOString() }]);
      expect(t.enviar).not.toHaveBeenCalled();
      expect(r.falhas).toBe(1);
    }
  });
  it('erro ao buscar um alerta não derruba os outros', async () => {
    const t = montar([al('a', 'u1', 'pro', '2026-10-01T00:00:00Z'), al('b', 'u2', 'pro', '2026-10-01T00:00:00Z')], { a: new Error('timeout'), b: { editais: [ed('e1')], total: 1 } });
    const r = await executarAlertas(t.deps);
    expect(t.registros.map((x) => [x.alertaId, x.status, x.erro ?? null])).toEqual([['a', 'falhou', 'timeout'], ['b', 'enviado', null]]);
    expect(r).toMatchObject({ falhas: 1, enviados: 1 });
  });
  it('pausa de 600 ms entre e-mails, não antes do primeiro', async () => {
    const t = montar([al('a', 'u1', 'pro', '2026-10-01T00:00:00Z'), al('b', 'u2', 'pro', '2026-10-01T00:00:00Z')], { a: { editais: [ed('e1')], total: 1 }, b: { editais: [ed('e2')], total: 1 } });
    await executarAlertas(t.deps);
    expect(t.esperar.mock.calls).toEqual([[PAUSA_ENTRE_EMAILS_MS]]);
    expect(t.ordem.indexOf('esperar')).toBeGreaterThan(t.ordem.indexOf('enviar:u1@empresa.com.br'));
    expect(t.ordem.indexOf('esperar')).toBeLessThan(t.ordem.indexOf('enviar:u2@empresa.com.br'));
  });
  it('chave de idempotência: a mesma para os mesmos editais, em qualquer ordem; muda com o tipo e a conta', () => {
    expect(chaveIdempotencia('alertas', 'u1', ['b', 'a'])).toBe(chaveIdempotencia('alertas', 'u1', ['a', 'b']));
    expect(chaveIdempotencia('alertas', 'u1', ['a'])).not.toBe(chaveIdempotencia('alertas', 'u2', ['a']));
    expect(chaveIdempotencia('resumo', 'u1', ['a'])).not.toBe(chaveIdempotencia('alertas', 'u1', ['a']));
    expect(chaveIdempotencia('alertas', 'u1', ['a'])).toMatch(/^alertas\/u1\/[0-9a-f]{32}$/);
  });
});
```
Run: `npx vitest run worker/alertas/executar.test.ts` → FAIL. Crie `worker/alertas/executar.ts`:
```ts
import { createHash } from 'node:crypto';
import { montarEmail } from '../../lib/alertas/email';
import { criarTokenDescadastro } from '../../lib/alertas/token';
import { LIMITES_CONTA } from '../../lib/limitesConta';
import type { AlertaParaEnvio, BancoAlertas, EditalAlerta } from './banco';
import type { Enviar } from './resend';

/**
 * Uma rodada dos alertas (Fase 4, §3): por conta, o plano no momento do envio (Grátis: nenhum; Pro: até 5, pelo mais
 * antigo), os editais novos de cada alerta desde o último envio (primeiro: 24 h), sem repetir (banco), até 20 por
 * alerta; um e-mail por conta; alertas_enviados só depois do aceite do Resend; histórico de tudo em envios_alerta.
 * Uma conta com erro não derruba as outras. Sem e-mail nos logs.
 */

export const LIMITE_EDITAIS_EMAIL = 20;
export const PAUSA_ENTRE_EMAILS_MS = 600;
const DIA_MS = 24 * 60 * 60 * 1000;

export type DepsEnvio = {
  enviar: Enviar | null;
  segredo: string | null;
  agora: () => Date;
  esperar: (ms: number) => Promise<void>;
  log: (linha: string) => void;
};
export type DepsAlertas = DepsEnvio & { banco: BancoAlertas };
export type ResumoAlertas = { contas: number; emails: number; enviados: number; semNovidades: number; falhas: number; puladosPlano: number; editais: number };

export function desdeDoAlerta(ultimoEnvioEm: string | null, agora: Date): string {
  return ultimoEnvioEm ?? new Date(agora.getTime() - DIA_MS).toISOString();
}

/** Alertas agrupados por conta, cada grupo do mais antigo para o mais novo. */
export function porConta(lista: readonly AlertaParaEnvio[]): AlertaParaEnvio[][] {
  const contas = new Map<string, AlertaParaEnvio[]>();
  for (const a of lista) contas.set(a.userId, [...(contas.get(a.userId) ?? []), a]);
  return [...contas.values()].map((as) => [...as].sort((x, y) => Date.parse(x.criadoEm) - Date.parse(y.criadoEm) || x.id.localeCompare(y.id)));
}

/** O plano no momento do envio decide quantos alertas da conta saem (os mais antigos). */
export function separarPorPlano(alertas: readonly AlertaParaEnvio[]): { permitidos: AlertaParaEnvio[]; pulados: AlertaParaEnvio[] } {
  const max = LIMITES_CONTA[alertas[0]?.plano ?? 'gratis'].alertas;
  return { permitidos: alertas.slice(0, max), pulados: alertas.slice(max) };
}

/** Mesma chave para o mesmo e-mail (tipo + conta + editais, em qualquer ordem): repetir em 24 h não duplica no Resend. */
export function chaveIdempotencia(tipo: 'alertas' | 'resumo', userId: string, ids: readonly string[]): string {
  return `${tipo}/${userId}/${createHash('sha256').update([...ids].sort().join('|')).digest('hex').slice(0, 32)}`;
}

/** Nada é simulado: sem chave ou sem segredo, o envio falha com o motivo. */
export function motivoSemEnvio(d: DepsEnvio): string | null {
  if (!d.enviar) return 'RESEND_API_KEY ausente';
  if (!d.segredo) return 'ALERTAS_SEGREDO ausente';
  return null;
}

export const mensagemDeErro = (erro: unknown) => (erro instanceof Error ? erro.message : String(erro)).slice(0, 300);

type ComNovidade = { alerta: AlertaParaEnvio; editais: EditalAlerta[]; total: number };

export async function executarAlertas(d: DepsAlertas): Promise<ResumoAlertas> {
  const r: ResumoAlertas = { contas: 0, emails: 0, enviados: 0, semNovidades: 0, falhas: 0, puladosPlano: 0, editais: 0 };
  const contas = porConta(await d.banco.alertasParaEnvio());
  r.contas = contas.length;
  const semEnvio = motivoSemEnvio(d);
  for (const alertas of contas) {
    const conta = alertas[0];
    try {
      const selecionadoEm = d.agora().toISOString();
      const { permitidos, pulados } = separarPorPlano(alertas);
      for (const a of pulados) {
        await d.banco.registrarEnvio({ alertaId: a.id, status: 'pulado_plano', qtd: 0, tentativas: 0, selecionadoEm });
        r.puladosPlano++;
      }
      const comNovidade: ComNovidade[] = [];
      for (const a of permitidos) {
        try {
          const achados = await d.banco.editaisDoAlerta(a, desdeDoAlerta(a.ultimoEnvioEm, d.agora()), LIMITE_EDITAIS_EMAIL);
          if (achados.editais.length > 0) {
            comNovidade.push({ alerta: a, ...achados });
            continue;
          }
          await d.banco.registrarEnvio({ alertaId: a.id, status: 'sem_novidades', qtd: 0, tentativas: 0, selecionadoEm });
          r.semNovidades++;
        } catch (erro) {
          d.log(`[alertas] alerta ${a.id}: ${mensagemDeErro(erro)}`);
          await d.banco.registrarEnvio({ alertaId: a.id, status: 'falhou', qtd: 0, tentativas: 0, erro: mensagemDeErro(erro), selecionadoEm });
          r.falhas++;
        }
      }
      if (comNovidade.length === 0) continue;
      if (semEnvio || !d.enviar || !d.segredo) {
        for (const c of comNovidade) {
          await d.banco.registrarEnvio({ alertaId: c.alerta.id, status: 'falhou', qtd: c.editais.length, tentativas: 0, erro: semEnvio, selecionadoEm });
          r.falhas++;
        }
        continue;
      }
      const segredo = d.segredo;
      const email = montarEmail({
        secoes: comNovidade.map((c) => ({ nome: c.alerta.nome, editais: c.editais, total: c.total, tokenSair: criarTokenDescadastro({ tipo: 'alerta', id: c.alerta.id }, segredo) })),
        tokenSairTodos: criarTokenDescadastro({ tipo: 'todos', conta: conta.userId }, segredo),
      });
      const ids = comNovidade.flatMap((c) => c.editais.map((e) => e.id));
      if (r.emails > 0) await d.esperar(PAUSA_ENTRE_EMAILS_MS);
      const envio = await d.enviar({ para: conta.email, ...email, idempotencia: chaveIdempotencia('alertas', conta.userId, ids) });
      r.emails++;
      for (const c of comNovidade) {
        if (envio.ok) {
          await d.banco.registrarEnvio({
            alertaId: c.alerta.id, status: 'enviado', qtd: c.editais.length, tentativas: envio.tentativas, idMensagem: envio.id,
            ids: c.editais.map((e) => e.id), selecionadoEm, avancar: c.total <= c.editais.length,
          });
          r.enviados++;
          r.editais += c.editais.length;
        } else {
          await d.banco.registrarEnvio({ alertaId: c.alerta.id, status: 'falhou', qtd: c.editais.length, tentativas: envio.tentativas, erro: envio.erro, selecionadoEm });
          r.falhas++;
        }
      }
      if (!envio.ok) {
        d.log(`[alertas] conta ${conta.userId}: ${envio.erro}`);
        continue;
      }
      try {
        await d.banco.gravarEventoEnvio({ qtd: ids.length, alertas: comNovidade.length });
      } catch (erro) {
        d.log(`[alertas] evento: ${mensagemDeErro(erro)}`);
      }
    } catch (erro) {
      d.log(`[alertas] conta ${conta.userId}: ${mensagemDeErro(erro)}`);
      r.falhas++;
    }
  }
  return r;
}
```
Notas: `{ para, ...email }` leva `assunto`, `html`, `texto` e `cabecalhos` de `montarEmail`; o `erro` de "sem envio" é o `semEnvio` (string). Run → PASS.

- [ ] **Step 4: Ponto de entrada e script**

Crie `worker/enviar-alertas.ts`:
```ts
import './ambiente';
import { lerSegredo } from '../lib/alertas/token';
import { criarBancoAlertas } from './alertas/banco';
import { executarAlertas } from './alertas/executar';
import { criarEnvioResend } from './alertas/resend';
import { criarSupabase } from './banco';
import { lerSupabase } from './config';

/** Envio diário dos alertas (GitHub Actions, 10:00 UTC = 7h em Brasília). Sai com código 1 se houve falha. */
const { url, chave } = lerSupabase();
const chaveResend = process.env.RESEND_API_KEY?.trim() || null;
const esperar = (ms: number) => new Promise<void>((pronto) => setTimeout(pronto, ms));
const deps = {
  enviar: chaveResend ? criarEnvioResend({ chave: chaveResend, esperar }) : null,
  segredo: lerSegredo(process.env.ALERTAS_SEGREDO),
  agora: () => new Date(),
  esperar,
  log: (linha: string) => console.log(linha),
};

const resumo = await executarAlertas({ ...deps, banco: criarBancoAlertas(criarSupabase(url, chave)) });
console.log(`[alertas] ${JSON.stringify(resumo)}`);
process.exitCode = resumo.falhas > 0 ? 1 : 0;
```
Em `package.json`, depois de `"worker:reler-itens": …,` acrescente `"worker:alertas": "tsx worker/enviar-alertas.ts",`.

- [ ] **Step 5: Rodar, verificar e commitar**

Run: `npx vitest run worker/alertas && npm test && npm run typecheck`
Expected: PASS. (Não rodar `npm run worker:alertas`: o envio real é do controlador, Task 14.)
```bash
git add worker/alertas worker/enviar-alertas.ts package.json
git commit -m "feat(alertas): job de envio diário pelo Resend, sem repetir, com nova tentativa e histórico" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 11: Resumo semanal do Pro: o e-mail

**Files:**
- Create: `lib/alertas/resumo.ts`
- Test: `lib/alertas/resumo.test.ts`

**Interfaces:**
- Consumes: `editalHtml`, `editalTexto`, `escapar`, `moldura`, `linkSair`, `cabecalhosDescadastro`, `EditalDoEmail`, `EmailMontado` (Task 9); `moeda`, `numero` (`lib/formato.ts`); `nomeProprio`; `url`; o JSON de `resumo_do_radar` (Task 1).
- Produces: `type EditalDoResumo = EditalDoEmail & { id: string }`; `type OrgaoResumo = { nome: string; uf: string; qtd: number; valor: number }`; `type CidadeResumo = { nome: string; uf: string; qtd: number }`; `type ResumoSemanal = { total; novas; prazoProximo; valorTotal; comValor; novos: EditalDoResumo[]; encerrando: EditalDoResumo[]; orgaos: OrgaoResumo[]; cidades: CidadeResumo[] }`; `resumoDaResposta(v: unknown): ResumoSemanal | null`; `temNovidade(r: ResumoSemanal): boolean`; `assuntoDoResumo(r: ResumoSemanal): string`; `montarResumo(r: ResumoSemanal, tokenSair: string): EmailMontado`.

- [ ] **Step 1: Teste (falhando)**

Crie `lib/alertas/resumo.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { moeda } from '../formato';
import { nomeProprio } from '../texto';
import { escapar, linkSair, linkUmClique } from './email';
import { assuntoDoResumo, montarResumo, resumoDaResposta, temNovidade, type ResumoSemanal } from './resumo';

const item = (id: string, extra: Record<string, unknown> = {}) => ({
  id, slug: `00394452000103-2026-${id}`, objeto: 'Aquisição de luvas', orgao_nome: 'PREFEITURA MUNICIPAL DE JOINVILLE', municipio_nome: 'Joinville', uf: 'SC',
  valor_estimado: 1000, encerramento_em: '2026-10-25T17:00:00+00:00', situacao_id: 1, pontuacao: 60, ...extra,
});
const JSON_BANCO = {
  total: 40, novas: 12, prazo_proximo: 5, valor_total: 1234567.89, com_valor: 30,
  novos: [item('1'), item('2', { valor_estimado: null })], encerrando: [item('3')],
  orgaos: [{ nome: 'PREFEITURA MUNICIPAL DE JOINVILLE', uf: 'SC', qtd: 6, valor: 50000 }, { nome: 'ESTADO DE SANTA CATARINA', uf: 'SC', qtd: 3, valor: 0 }],
  cidades: [{ nome: 'Joinville', uf: 'SC', qtd: 8 }],
};

describe('resumo semanal', () => {
  it('resposta do banco → resumo (só o que veio)', () => {
    const r = resumoDaResposta(JSON_BANCO)!;
    expect(r).toMatchObject({ total: 40, novas: 12, prazoProximo: 5, valorTotal: 1234567.89, comValor: 30 });
    expect(r.novos.map((e) => e.id)).toEqual(['1', '2']);
    expect(r.novos[1].valor_estimado).toBeNull();
    expect(r.orgaos[1]).toEqual({ nome: 'ESTADO DE SANTA CATARINA', uf: 'SC', qtd: 3, valor: 0 });
    expect(resumoDaResposta(null)).toBeNull();
    expect(resumoDaResposta('x')).toBeNull();
  });
  it('só manda com novidade (novas ou prazo próximo)', () => {
    const r = resumoDaResposta(JSON_BANCO)!;
    expect(temNovidade(r)).toBe(true);
    expect(temNovidade({ ...r, novas: 0, prazoProximo: 0 })).toBe(false);
    expect(temNovidade({ ...r, novas: 0, prazoProximo: 1 })).toBe(true);
  });
  it('assunto', () => {
    const r = resumoDaResposta(JSON_BANCO)!;
    expect(assuntoDoResumo(r)).toBe('Sua semana no Edital Map: 12 editais novos no seu radar');
    expect(assuntoDoResumo({ ...r, novas: 1 })).toBe('Sua semana no Edital Map: 1 edital novo no seu radar');
    expect(assuntoDoResumo({ ...r, novas: 0, prazoProximo: 2 })).toBe('Sua semana no Edital Map: 2 editais encerram em até 7 dias');
  });
  it('corpo: números da semana, valor somado com a base, listas, quem mais compra e o link do radar', () => {
    const r = resumoDaResposta(JSON_BANCO)!;
    const e = montarResumo(r, 'tok-r');
    for (const parte of [
      'Editais novos na semana', '12', 'Encerram em até 7 dias', 'Abertos no seu radar', '40',
      escapar(`${moeda(1234567.89)} (soma de 30 editais com valor informado)`),
      'Editais novos da semana', 'Mais 10 no seu Meu Radar.', 'Encerram nos próximos 7 dias',
      'Quem mais compra no seu radar', escapar(nomeProprio('PREFEITURA MUNICIPAL DE JOINVILLE')), '6 editais abertos', escapar(moeda(50000)!),
      'Joinville/SC · 8 editais abertos', 'https://www.editalmap.com.br/radar', 'https://www.editalmap.com.br/edital/00394452000103-2026-1',
    ]) {
      expect(e.html, parte).toContain(parte);
    }
    expect(e.html).toContain('Valor não informado');
    expect(e.html).not.toContain(`${escapar(nomeProprio('ESTADO DE SANTA CATARINA'))} (SC) · 3 editais abertos ·`);
  });
  it('sem nenhum valor informado: não inventa soma', () => {
    const e = montarResumo({ ...resumoDaResposta(JSON_BANCO)!, valorTotal: 0, comValor: 0 }, 't');
    expect(e.html).toContain('Valor estimado: não informado nos editais abertos');
  });
  it('descadastro do resumo: link e cabeçalhos de um clique', () => {
    const e = montarResumo(resumoDaResposta(JSON_BANCO)!, 'tok-r');
    expect(e.html).toContain('Parar o resumo semanal');
    expect(e.html).toContain(escapar(linkSair('tok-r')));
    expect(e.cabecalhos['List-Unsubscribe']).toBe(`<${linkUmClique('tok-r')}>`);
    expect(e.texto).toContain(`Parar o resumo semanal: ${linkSair('tok-r')}`);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/alertas/resumo.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar `lib/alertas/resumo.ts`**

```ts
import { moeda, numero } from '../formato';
import { url } from '../seo/site';
import { nomeProprio } from '../texto';
import { cabecalhosDescadastro, editalHtml, editalTexto, escapar, linkSair, moldura, type EditalDoEmail, type EmailMontado } from './email';

/**
 * Resumo semanal do Pro (segunda às 7h): números da semana no Meu Radar, os novos (até 10), os que encerram em 7 dias
 * (até 5), o valor estimado somado (só os com valor informado, dizendo de quantos) e os órgãos e cidades com mais
 * editais abertos no radar. Só o que veio do banco (resumo_do_radar, 0016); sem novidade, o job não manda.
 */

export type EditalDoResumo = EditalDoEmail & { id: string };
export type OrgaoResumo = { nome: string; uf: string; qtd: number; valor: number };
export type CidadeResumo = { nome: string; uf: string; qtd: number };
export type ResumoSemanal = {
  total: number;
  novas: number;
  prazoProximo: number;
  valorTotal: number;
  comValor: number;
  novos: EditalDoResumo[];
  encerrando: EditalDoResumo[];
  orgaos: OrgaoResumo[];
  cidades: CidadeResumo[];
};

const lista = (v: unknown): Array<Record<string, unknown>> => (Array.isArray(v) ? (v as Array<Record<string, unknown>>) : []);
const n = (v: unknown) => Number(v ?? 0) || 0;

function edital(l: Record<string, unknown>): EditalDoResumo {
  return {
    id: String(l.id),
    slug: String(l.slug),
    objeto: String(l.objeto),
    orgao_nome: String(l.orgao_nome),
    municipio_nome: l.municipio_nome == null ? null : String(l.municipio_nome),
    uf: String(l.uf),
    valor_estimado: l.valor_estimado == null ? null : Number(l.valor_estimado),
    encerramento_em: String(l.encerramento_em),
    situacao_id: l.situacao_id == null ? null : Number(l.situacao_id),
  };
}

/** JSON de resumo_do_radar → resumo. Nulo (radar sem termo válido) ou outra coisa: null. */
export function resumoDaResposta(v: unknown): ResumoSemanal | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const j = v as Record<string, unknown>;
  return {
    total: n(j.total),
    novas: n(j.novas),
    prazoProximo: n(j.prazo_proximo),
    valorTotal: n(j.valor_total),
    comValor: n(j.com_valor),
    novos: lista(j.novos).map(edital),
    encerrando: lista(j.encerrando).map(edital),
    orgaos: lista(j.orgaos).map((o) => ({ nome: String(o.nome), uf: String(o.uf), qtd: n(o.qtd), valor: n(o.valor) })),
    cidades: lista(j.cidades).map((c) => ({ nome: String(c.nome), uf: String(c.uf), qtd: n(c.qtd) })),
  };
}

export function temNovidade(r: ResumoSemanal): boolean {
  return r.novas > 0 || r.prazoProximo > 0;
}

const plural = (q: number, um: string, varios: string) => (q === 1 ? `1 ${um}` : `${numero(q)} ${varios}`);

export function assuntoDoResumo(r: ResumoSemanal): string {
  return r.novas > 0
    ? `Sua semana no Edital Map: ${plural(r.novas, 'edital novo', 'editais novos')} no seu radar`
    : `Sua semana no Edital Map: ${plural(r.prazoProximo, 'edital encerra', 'editais encerram')} em até 7 dias`;
}

const textoValor = (r: ResumoSemanal) =>
  r.comValor > 0
    ? `Valor estimado somado: ${moeda(r.valorTotal) ?? 'R$ 0,00'} (soma de ${plural(r.comValor, 'edital', 'editais')} com valor informado)`
    : 'Valor estimado: não informado nos editais abertos';
const textoOrgao = (o: OrgaoResumo) => `${nomeProprio(o.nome)} (${o.uf}) · ${plural(o.qtd, 'edital aberto', 'editais abertos')}${o.valor > 0 ? ` · ${moeda(o.valor)}` : ''}`;
const textoCidade = (c: CidadeResumo) => `${c.nome}/${c.uf} · ${plural(c.qtd, 'edital aberto', 'editais abertos')}`;

const H2 = 'margin:20px 0 4px;font-size:17px;color:#0c2340;';
const P = 'margin:4px 0;font-size:14px;color:#0c2340;';

export function montarResumo(r: ResumoSemanal, tokenSair: string): EmailMontado {
  const radar = url('/radar');
  const numeros = [
    `Editais novos na semana: <strong>${numero(r.novas)}</strong>`,
    `Encerram em até 7 dias: <strong>${numero(r.prazoProximo)}</strong>`,
    `Abertos no seu radar: <strong>${numero(r.total)}</strong>`,
    escapar(textoValor(r)),
  ];
  const partes: string[] = [`<h2 style="${H2}">Resumo da semana</h2>`, ...numeros.map((t) => `<p style="${P}">${t}</p>`)];
  if (r.novos.length > 0) {
    partes.push(`<h2 style="${H2}">Editais novos da semana</h2>`, `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${r.novos.map(editalHtml).join('')}</table>`);
    if (r.novas > r.novos.length) partes.push(`<p style="${P}"><a href="${escapar(radar)}" style="color:#b33a0e;">Mais ${numero(r.novas - r.novos.length)} no seu Meu Radar.</a></p>`);
  }
  if (r.encerrando.length > 0) {
    partes.push(`<h2 style="${H2}">Encerram nos próximos 7 dias</h2>`, `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${r.encerrando.map(editalHtml).join('')}</table>`);
  }
  if (r.orgaos.length > 0 || r.cidades.length > 0) {
    partes.push(`<h2 style="${H2}">Quem mais compra no seu radar</h2>`);
    for (const o of r.orgaos) partes.push(`<p style="${P}">${escapar(textoOrgao(o))}</p>`);
    for (const c of r.cidades) partes.push(`<p style="${P}">${escapar(textoCidade(c))}</p>`);
  }
  partes.push(`<p style="margin:20px 0 0;"><a href="${escapar(radar)}" style="display:inline-block;padding:12px 18px;background:#ff5a1f;color:#0c2340;font-weight:bold;text-decoration:none;border-radius:4px;">Abrir o Meu Radar</a></p>`);
  const rodape = `Você recebe este resumo porque tem o plano Pro e o Meu Radar no Edital Map. Os editais vêm do PNCP: confira sempre o edital oficial.<br>
<a href="${escapar(url('/alertas'))}" style="color:#3e5373;">Preferências</a> · <a href="${escapar(linkSair(tokenSair))}" style="color:#3e5373;">Parar o resumo semanal</a>`;
  const texto = [
    'Resumo da semana',
    `Editais novos na semana: ${numero(r.novas)}`,
    `Encerram em até 7 dias: ${numero(r.prazoProximo)}`,
    `Abertos no seu radar: ${numero(r.total)}`,
    textoValor(r),
    ...(r.novos.length ? ['', 'Editais novos da semana', ...r.novos.map(editalTexto)] : []),
    ...(r.encerrando.length ? ['', 'Encerram nos próximos 7 dias', ...r.encerrando.map(editalTexto)] : []),
    ...(r.orgaos.length || r.cidades.length ? ['', 'Quem mais compra no seu radar', ...r.orgaos.map(textoOrgao), ...r.cidades.map(textoCidade)] : []),
    '',
    `Abrir o Meu Radar: ${radar}`,
    `Parar o resumo semanal: ${linkSair(tokenSair)}`,
  ].join('\n');
  return { assunto: assuntoDoResumo(r), html: moldura(`<tr><td style="padding:4px 28px 8px;">${partes.join('\n')}</td></tr>`, rodape), texto, cabecalhos: cabecalhosDescadastro(tokenSair) };
}
```

- [ ] **Step 4: Rodar e commitar**

Run: `npx vitest run lib/alertas/resumo.test.ts && npm test && npm run typecheck`
Expected: PASS.
```bash
git add lib/alertas/resumo.ts lib/alertas/resumo.test.ts
git commit -m "feat(resumo): e-mail do resumo semanal do Pro" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 12: Resumo semanal do Pro: o envio (modo do job)

**Files:**
- Create: `worker/alertas/resumo.ts`, `worker/alertas/modo.ts`
- Modify: `worker/enviar-alertas.ts` (modo), `package.json` (`worker:resumo`)
- Test: `worker/alertas/resumo.test.ts`, `worker/alertas/modo.test.ts`

**Interfaces:**
- Consumes: `contas_para_resumo`, `resumo_do_radar`, tabela `envios_resumo` (Task 1); `resumoDaResposta`, `temNovidade`, `montarResumo`, `ResumoSemanal` (Task 11); `criarTokenDescadastro` (Task 9); `DepsEnvio`, `chaveIdempotencia`, `motivoSemEnvio`, `mensagemDeErro`, `PAUSA_ENTRE_EMAILS_MS` (Task 10); `VISITANTE_JOB` (Task 10); `filtrosDoRadar`, `radarDaLinha` (`lib/radar.ts`).
- Produces: `type ContaResumo = { userId: string; email: string; radar: Radar }`; `type RegistroResumo = { userId; status: 'enviado' | 'sem_novidades' | 'falhou'; qtd; tentativas; erro?; idMensagem?; iniciadoEm: string }`; `interface BancoResumo { contasParaResumo(); resumoDaConta(c); registrarResumo(r); gravarEventoResumo(detalhe: { novas: number; prazo: number }) }`; `criarBancoResumo(sb: SupabaseClient): BancoResumo`; `type ResultadoResumo = { contas; emails; enviados; semNovidades; falhas }`; `executarResumo(d: DepsEnvio & { banco: BancoResumo }): Promise<ResultadoResumo>`; `lerModo(argv: readonly string[]): 'alertas' | 'resumo'`; `npm run worker:resumo`.

- [ ] **Step 1: Modo do job (teste primeiro)**

Crie `worker/alertas/modo.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { lerModo } from './modo';

describe('modo do job', () => {
  it('alertas por padrão; --modo resumo; outro valor é erro', () => {
    expect(lerModo([])).toBe('alertas');
    expect(lerModo(['--modo', 'alertas'])).toBe('alertas');
    expect(lerModo(['--modo', 'resumo'])).toBe('resumo');
    expect(lerModo(['--modo='])).toBe('alertas');
    expect(() => lerModo(['--modo', 'tudo'])).toThrow('Modo inválido: tudo (use alertas ou resumo)');
  });
});
```
Crie `worker/alertas/modo.ts`:
```ts
/** `--modo alertas` (diário, padrão) ou `--modo resumo` (resumo semanal do Pro, segunda). Vazio vale alertas. */
export function lerModo(argv: readonly string[]): 'alertas' | 'resumo' {
  const i = argv.indexOf('--modo');
  const valor = (i >= 0 ? argv[i + 1] : undefined)?.trim() || 'alertas';
  if (valor !== 'alertas' && valor !== 'resumo') throw new Error(`Modo inválido: ${valor} (use alertas ou resumo)`);
  return valor;
}
```
Run: `npx vitest run worker/alertas/modo.test.ts` → PASS.

- [ ] **Step 2: A rodada do resumo (teste primeiro)**

Crie `worker/alertas/resumo.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { lerTokenDescadastro } from '../../lib/alertas/token';
import type { ResumoSemanal } from '../../lib/alertas/resumo';
import type { Radar } from '../../lib/radar';
import { PAUSA_ENTRE_EMAILS_MS } from './executar';
import type { Mensagem } from './resend';
import { criarBancoResumo, executarResumo, type BancoResumo, type ContaResumo, type RegistroResumo } from './resumo';

const SEGREDO = 'x'.repeat(40);
const AGORA = new Date('2026-10-19T10:00:00Z');
const RADAR: Radar = { termos: ['luva'], termosExcluir: [], ufs: ['SC'], municipios: [], valorMin: null, valorMax: null, modalidades: [], soMeEpp: false };
const conta = (userId: string): ContaResumo => ({ userId, email: `${userId}@empresa.com.br`, radar: RADAR });
const resumo = (novas: number, prazo: number): ResumoSemanal => ({
  total: 10, novas, prazoProximo: prazo, valorTotal: 0, comValor: 0, orgaos: [], cidades: [], encerrando: [],
  novos: novas ? [{ id: 'e1', slug: '00394452000103-2026-1', objeto: 'Aquisição de luvas', orgao_nome: 'P', municipio_nome: null, uf: 'SC', valor_estimado: null, encerramento_em: '2026-10-30T13:00:00Z', situacao_id: 1 }] : [],
});

function montar(contas: ContaResumo[], resumos: Record<string, ResumoSemanal | null | Error>, ok = true) {
  const registros: RegistroResumo[] = [];
  const eventos: unknown[] = [];
  const banco: BancoResumo = {
    contasParaResumo: async () => contas,
    resumoDaConta: async (c) => {
      const r = resumos[c.userId];
      if (r instanceof Error) throw r;
      return r ?? null;
    },
    registrarResumo: async (r) => {
      registros.push(r);
    },
    gravarEventoResumo: async (d) => {
      eventos.push(d);
    },
  };
  const enviar = vi.fn(async (_m: Mensagem) => (ok ? { ok: true as const, id: 'msg-r', tentativas: 1 } : { ok: false as const, erro: 'Resend 500: fora', tentativas: 4 }));
  const esperar = vi.fn(async (_ms: number) => undefined);
  return { deps: { banco, enviar, segredo: SEGREDO, agora: () => AGORA, esperar, log: () => undefined }, registros, eventos, enviar, esperar };
}

describe('rodada do resumo semanal', () => {
  it('com novidade: um e-mail por conta, enviado só depois do aceite, evento sem e-mail', async () => {
    const U1 = '22222222-2222-4222-8222-222222222222';
    const t = montar([conta(U1)], { [U1]: resumo(3, 2) });
    const r = await executarResumo(t.deps);
    const m = t.enviar.mock.calls[0][0];
    expect(m.para).toBe(`${U1}@empresa.com.br`);
    expect(m.assunto).toBe('Sua semana no Edital Map: 3 editais novos no seu radar');
    const token = decodeURIComponent(/t=([^>]+)>/.exec(m.cabecalhos['List-Unsubscribe'])![1]);
    expect(lerTokenDescadastro(token, SEGREDO)).toEqual({ tipo: 'resumo', conta: U1 });
    expect(m.idempotencia.startsWith(`resumo/${U1}/`)).toBe(true);
    expect(t.registros).toEqual([{ userId: U1, status: 'enviado', qtd: 3, tentativas: 1, idMensagem: 'msg-r', iniciadoEm: AGORA.toISOString() }]);
    expect(t.eventos).toEqual([{ novas: 3, prazo: 2 }]);
    expect(r).toEqual({ contas: 1, emails: 1, enviados: 1, semNovidades: 0, falhas: 0 });
  });
  it('sem novidade (ou radar sem termo): sem_novidades, nada enviado', async () => {
    const t = montar([conta('u1'), conta('u2')], { u1: resumo(0, 0), u2: null });
    const r = await executarResumo(t.deps);
    expect(t.enviar).not.toHaveBeenCalled();
    expect(t.registros.map((x) => x.status)).toEqual(['sem_novidades', 'sem_novidades']);
    expect(r.semNovidades).toBe(2);
  });
  it('falha do Resend, falta de chave ou erro do banco: falhou, e as outras contas seguem', async () => {
    const t = montar([conta('u1'), conta('u2')], { u1: new Error('timeout'), u2: resumo(1, 0) }, false);
    const r = await executarResumo(t.deps);
    expect(t.registros.map((x) => [x.userId, x.status, x.erro])).toEqual([['u1', 'falhou', 'timeout'], ['u2', 'falhou', 'Resend 500: fora']]);
    expect(t.eventos).toEqual([]);
    expect(r.falhas).toBe(2);
    const s = montar([conta('u1')], { u1: resumo(1, 0) });
    await executarResumo({ ...s.deps, enviar: null });
    expect(s.registros[0]).toMatchObject({ status: 'falhou', erro: 'RESEND_API_KEY ausente', tentativas: 0 });
  });
  it('pausa entre e-mails', async () => {
    const t = montar([conta('u1'), conta('u2')], { u1: resumo(1, 0), u2: resumo(0, 1) });
    await executarResumo(t.deps);
    expect(t.esperar.mock.calls).toEqual([[PAUSA_ENTRE_EMAILS_MS]]);
  });
});

describe('banco do resumo', () => {
  it('contas, resumo com os filtros do radar, histórico e evento', async () => {
    const chamadas: unknown[][] = [];
    const sb = {
      rpc: vi.fn(async (nome: string, args?: unknown) => {
        chamadas.push([nome, args]);
        if (nome === 'contas_para_resumo') {
          return { data: [{ user_id: 'u1', email: 'u1@empresa.com.br', termos: ['luva'], termos_excluir: [], ufs: ['SC'], municipios: [], valor_min: null, valor_max: null, modalidades: [], so_me_epp: false }], error: null };
        }
        return { data: { total: 1, novas: 1, prazo_proximo: 0, valor_total: 0, com_valor: 0, novos: [], encerrando: [], orgaos: [], cidades: [] }, error: null };
      }),
      from: vi.fn((tabela: string) => ({ insert: async (linha: unknown) => (chamadas.push([tabela, linha]), { error: null }) })),
    } as unknown as SupabaseClient;
    const b = criarBancoResumo(sb);
    const [c] = await b.contasParaResumo();
    expect(c).toEqual({ userId: 'u1', email: 'u1@empresa.com.br', radar: RADAR });
    expect((await b.resumoDaConta(c))?.novas).toBe(1);
    expect(chamadas[1]).toEqual(['resumo_do_radar', expect.objectContaining({ p_user: 'u1', p_termos: ['luva'], p_ufs: ['SC'] })]);
    await b.registrarResumo({ userId: 'u1', status: 'enviado', qtd: 1, tentativas: 1, idMensagem: 'm', iniciadoEm: 't' });
    expect(chamadas[2]).toEqual(['envios_resumo', { user_id: 'u1', status: 'enviado', qtd_editais: 1, tentativas: 1, erro: null, id_mensagem: 'm', iniciado_em: 't' }]);
    await b.gravarEventoResumo({ novas: 1, prazo: 0 });
    expect(chamadas[3]).toEqual(['eventos', expect.objectContaining({ tipo: 'resumo_enviado', detalhe: { novas: 1, prazo: 0 }, interno: false })]);
  });
});
```
Run: `npx vitest run worker/alertas/resumo.test.ts` → FAIL.

- [ ] **Step 3: Implementar `worker/alertas/resumo.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { montarResumo, resumoDaResposta, temNovidade, type ResumoSemanal } from '../../lib/alertas/resumo';
import { criarTokenDescadastro } from '../../lib/alertas/token';
import { filtrosDoRadar, radarDaLinha, type Radar } from '../../lib/radar';
import { VISITANTE_JOB } from './banco';
import { chaveIdempotencia, mensagemDeErro, motivoSemEnvio, PAUSA_ENTRE_EMAILS_MS, type DepsEnvio } from './executar';

/**
 * Resumo semanal do Pro (segunda, 10:00 UTC = 7h em Brasília): para cada conta Pro (plano da conta) com Meu Radar e
 * o resumo ligado, que não recebeu resumo nos últimos 6 dias (contas_para_resumo), o resumo da semana; sem novidade
 * não manda. Histórico em envios_resumo; descadastro pelo link (token "r"). Sem e-mail nos logs.
 */

export type ContaResumo = { userId: string; email: string; radar: Radar };
export type RegistroResumo = {
  userId: string;
  status: 'enviado' | 'sem_novidades' | 'falhou';
  qtd: number;
  tentativas: number;
  erro?: string | null;
  idMensagem?: string | null;
  iniciadoEm: string;
};

export interface BancoResumo {
  contasParaResumo(): Promise<ContaResumo[]>;
  resumoDaConta(c: ContaResumo): Promise<ResumoSemanal | null>;
  registrarResumo(r: RegistroResumo): Promise<void>;
  gravarEventoResumo(detalhe: { novas: number; prazo: number }): Promise<void>;
}

const falhar = (contexto: string, erro: { message: string } | null) => {
  if (erro) throw new Error(`${contexto}: ${erro.message}`);
};

export function criarBancoResumo(sb: SupabaseClient): BancoResumo {
  return {
    async contasParaResumo() {
      const { data, error } = await sb.rpc('contas_para_resumo');
      falhar('contas_para_resumo', error);
      return ((data ?? []) as Array<Record<string, unknown>>).map((l) => ({ userId: String(l.user_id), email: String(l.email), radar: radarDaLinha(l) }));
    },
    async resumoDaConta(c) {
      const { p_termos, p_relacionados, p_excluir, p_ufs, p_ibges, p_valor_min, p_valor_max, p_modalidades, p_so_me_epp } = filtrosDoRadar(c.radar);
      const { data, error } = await sb.rpc('resumo_do_radar', {
        p_user: c.userId, p_termos, p_relacionados, p_excluir, p_ufs, p_ibges, p_valor_min, p_valor_max, p_modalidades, p_so_me_epp,
      });
      falhar('resumo_do_radar', error);
      return resumoDaResposta(data);
    },
    async registrarResumo(r) {
      const { error } = await sb.from('envios_resumo').insert({
        user_id: r.userId, status: r.status, qtd_editais: r.qtd, tentativas: r.tentativas, erro: r.erro ?? null, id_mensagem: r.idMensagem ?? null, iniciado_em: r.iniciadoEm,
      });
      falhar('envios_resumo', error);
    },
    async gravarEventoResumo(detalhe) {
      const { error } = await sb.from('eventos').insert({ visitante: VISITANTE_JOB, tipo: 'resumo_enviado', detalhe, interno: false });
      falhar('evento resumo_enviado', error);
    },
  };
}

export type ResultadoResumo = { contas: number; emails: number; enviados: number; semNovidades: number; falhas: number };

export async function executarResumo(d: DepsEnvio & { banco: BancoResumo }): Promise<ResultadoResumo> {
  const r: ResultadoResumo = { contas: 0, emails: 0, enviados: 0, semNovidades: 0, falhas: 0 };
  const contas = await d.banco.contasParaResumo();
  r.contas = contas.length;
  const semEnvio = motivoSemEnvio(d);
  for (const c of contas) {
    const iniciadoEm = d.agora().toISOString();
    try {
      const resumo = await d.banco.resumoDaConta(c);
      if (!resumo || !temNovidade(resumo)) {
        await d.banco.registrarResumo({ userId: c.userId, status: 'sem_novidades', qtd: 0, tentativas: 0, iniciadoEm });
        r.semNovidades++;
        continue;
      }
      if (semEnvio || !d.enviar || !d.segredo) {
        await d.banco.registrarResumo({ userId: c.userId, status: 'falhou', qtd: resumo.novas, tentativas: 0, erro: semEnvio, iniciadoEm });
        r.falhas++;
        continue;
      }
      const email = montarResumo(resumo, criarTokenDescadastro({ tipo: 'resumo', conta: c.userId }, d.segredo));
      const ids = [...resumo.novos, ...resumo.encerrando].map((e) => e.id).concat(iniciadoEm.slice(0, 10));
      if (r.emails > 0) await d.esperar(PAUSA_ENTRE_EMAILS_MS);
      const envio = await d.enviar({ para: c.email, ...email, idempotencia: chaveIdempotencia('resumo', c.userId, ids) });
      r.emails++;
      if (!envio.ok) {
        await d.banco.registrarResumo({ userId: c.userId, status: 'falhou', qtd: resumo.novas, tentativas: envio.tentativas, erro: envio.erro, iniciadoEm });
        r.falhas++;
        d.log(`[resumo] conta ${c.userId}: ${envio.erro}`);
        continue;
      }
      await d.banco.registrarResumo({ userId: c.userId, status: 'enviado', qtd: resumo.novas, tentativas: envio.tentativas, idMensagem: envio.id, iniciadoEm });
      r.enviados++;
      try {
        await d.banco.gravarEventoResumo({ novas: resumo.novas, prazo: resumo.prazoProximo });
      } catch (erro) {
        d.log(`[resumo] evento: ${mensagemDeErro(erro)}`);
      }
    } catch (erro) {
      d.log(`[resumo] conta ${c.userId}: ${mensagemDeErro(erro)}`);
      try {
        await d.banco.registrarResumo({ userId: c.userId, status: 'falhou', qtd: 0, tentativas: 0, erro: mensagemDeErro(erro), iniciadoEm });
      } catch (erroRegistro) {
        d.log(`[resumo] histórico: ${mensagemDeErro(erroRegistro)}`);
      }
      r.falhas++;
    }
  }
  return r;
}
```
Run → PASS.

- [ ] **Step 4: Modo no ponto de entrada**

Troque `worker/enviar-alertas.ts` por:
```ts
import './ambiente';
import { lerSegredo } from '../lib/alertas/token';
import { criarBancoAlertas } from './alertas/banco';
import { executarAlertas } from './alertas/executar';
import { lerModo } from './alertas/modo';
import { criarEnvioResend } from './alertas/resend';
import { criarBancoResumo, executarResumo } from './alertas/resumo';
import { criarSupabase } from './banco';
import { lerSupabase } from './config';

/**
 * Envios por e-mail (GitHub Actions, 10:00 UTC = 7h em Brasília): `--modo alertas` todo dia; `--modo resumo` na
 * segunda (resumo semanal do Pro). Sai com código 1 se houve falha (o Actions fica vermelho).
 */
const modo = lerModo(process.argv.slice(2));
const { url, chave } = lerSupabase();
const sb = criarSupabase(url, chave);
const chaveResend = process.env.RESEND_API_KEY?.trim() || null;
const esperar = (ms: number) => new Promise<void>((pronto) => setTimeout(pronto, ms));
const deps = {
  enviar: chaveResend ? criarEnvioResend({ chave: chaveResend, esperar }) : null,
  segredo: lerSegredo(process.env.ALERTAS_SEGREDO),
  agora: () => new Date(),
  esperar,
  log: (linha: string) => console.log(linha),
};

const resultado = modo === 'resumo' ? await executarResumo({ ...deps, banco: criarBancoResumo(sb) }) : await executarAlertas({ ...deps, banco: criarBancoAlertas(sb) });
console.log(`[${modo}] ${JSON.stringify(resultado)}`);
process.exitCode = resultado.falhas > 0 ? 1 : 0;
```
Em `package.json`, depois de `"worker:alertas": …,` acrescente `"worker:resumo": "tsx worker/enviar-alertas.ts --modo resumo",`.

- [ ] **Step 5: Rodar, verificar e commitar**

Run: `npx vitest run worker/alertas && npm test && npm run typecheck`
Expected: PASS. (Não rodar o job: é do controlador, Task 14.)
```bash
git add worker/alertas/resumo.ts worker/alertas/resumo.test.ts worker/alertas/modo.ts worker/alertas/modo.test.ts worker/enviar-alertas.ts package.json
git commit -m "feat(resumo): envio do resumo semanal do Pro (modo resumo do job)" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 13: Workflow diário e semanal, segredos e guardas de isolamento

**Files:**
- Create: `.github/workflows/alertas.yml`, `scripts/alertas.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `npm run worker:alertas` com `--modo` (Tasks 10 e 12); `TIPOS_EVENTO_OPORTUNIDADES` (Task 1); os módulos das Tasks 3–12.
- Produces: agenda `0 10 * * *` (alertas) e `0 10 * * 1` (resumo) + `workflow_dispatch` com `modo`; guardas de isolamento, segredos e eventos.

- [ ] **Step 1: Guardas (falhando)**

Crie `scripts/alertas.test.ts`:
```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TIPOS_EVENTO_OPORTUNIDADES } from '../lib/eventos';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), 'utf8');
const listar = (pasta: string) =>
  (readdirSync(join(RAIZ, pasta), { recursive: true }) as string[])
    .filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.test.ts'))
    .map((f) => join(pasta, f).replace(/\\/g, '/'));
const site = [...listar('app'), ...listar('components'), ...listar('lib'), 'proxy.ts'];
const codigo = [...site, ...listar('worker')];

describe('workflow dos envios por e-mail', () => {
  const wf = ler('.github/workflows/alertas.yml');
  it('alertas todo dia às 10:00 UTC (7h em Brasília), resumo na segunda, e à mão com o modo', () => {
    expect(wf).toContain("- cron: '0 10 * * *'");
    expect(wf).toContain("- cron: '0 10 * * 1'");
    expect(wf).toContain('workflow_dispatch:');
    expect(wf).toContain("MODO: ${{ github.event.schedule == '0 10 * * 1' && 'resumo' || inputs.modo || 'alertas' }}");
    expect(wf).toContain('npm run worker:alertas -- --modo "$MODO"');
  });
  it('uma rodada por vez, com teto de tempo, só leitura do repositório', () => {
    expect(wf).toMatch(/concurrency:\r?\n\s+group: alertas\r?\n\s+cancel-in-progress: false/);
    expect(wf).toMatch(/timeout-minutes: 15/);
    expect(wf).toMatch(/permissions:\r?\n\s+contents: read/);
  });
  it('os 4 segredos pelo ambiente e nenhum impresso', () => {
    for (const s of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'ALERTAS_SEGREDO']) expect(wf).toContain(`${s}: \${{ secrets.${s} }}`);
    expect(wf).not.toMatch(/\becho\b/);
  });
  it('scripts e .env.example', () => {
    const scripts = JSON.parse(ler('package.json')).scripts as Record<string, string>;
    expect(scripts['worker:alertas']).toBe('tsx worker/enviar-alertas.ts');
    expect(scripts['worker:resumo']).toBe('tsx worker/enviar-alertas.ts --modo resumo');
    const exemplo = ler('.env.example');
    expect(exemplo).toMatch(/^RESEND_API_KEY=$/m);
    expect(exemplo).toMatch(/^ALERTAS_SEGREDO=$/m);
  });
});

describe('isolamento: salvos, alertas e resumo', () => {
  it('no site, só os módulos do servidor tocam salvos, alertas, envios e alertas_enviados', () => {
    const com = site.filter((f) => /from\(['"](salvos|alertas|envios_alerta|envios_resumo|alertas_enviados)['"]\)/.test(ler(f)));
    expect(com.sort()).toEqual(['lib/servidor/alertas.ts', 'lib/servidor/descadastro.ts', 'lib/servidor/salvos.ts']);
  });
  it('toda função exportada de salvos.ts e alertas.ts recebe o Usuario da sessão e filtra por ele', () => {
    for (const f of ['lib/servidor/salvos.ts', 'lib/servidor/alertas.ts']) {
      const fonte = ler(f);
      const funcoes = [...fonte.matchAll(/export async function (\w+)\(([^)]*)\)/g)];
      expect(funcoes.length, f).toBeGreaterThanOrEqual(5);
      for (const [, nome, params] of funcoes) expect(params, `${f} ${nome}`).toMatch(/^usuario: Usuario\b/);
      expect(fonte).toMatch(/\.eq\('user_id', usuario\.id\)|p_user: usuario\.id/);
    }
    expect(ler('lib/servidor/alertas.ts')).toContain('user_id: usuario.id');
  });
  it('rotas que mudam salvos, alertas e a preferência do resumo conferem a sessão e a origem', () => {
    const rotas = [...listar('app/api/salvos'), ...listar('app/api/alertas'), 'app/api/conta/resumo/route.ts'];
    const mudam = rotas.filter((f) => /export async function (POST|PATCH|DELETE)/.test(ler(f)));
    expect(mudam.length).toBeGreaterThanOrEqual(4);
    for (const f of mudam) {
      expect(ler(f), f).toContain('recusaForaDoSite(request)');
      expect(ler(f), f).toContain('usuarioAtual()');
    }
  });
  it('descadastro: só com token assinado, sem sessão (exceção documentada)', () => {
    const f = ler('app/api/descadastro/route.ts');
    expect(f).toContain('lerTokenDescadastro(');
    expect(f).not.toContain('usuarioAtual');
    expect(ler('app/alertas/sair/page.tsx')).toContain('lerTokenDescadastro(');
  });
  it('páginas da conta conferem a sessão', () => {
    for (const f of ['app/oportunidades/page.tsx', 'app/alertas/page.tsx', 'app/alertas/novo/page.tsx', 'app/alertas/[id]/editar/page.tsx']) {
      expect(ler(f), f).toContain('usuarioAtual()');
    }
  });
  it('nenhum arquivo de app/ fala em user_id (o dono vem só da sessão ou do token)', () => {
    expect(listar('app').filter((f) => /user_?id/i.test(ler(f)))).toEqual([]);
  });
});

describe('segredos do e-mail', () => {
  it('RESEND_API_KEY só no job; ALERTAS_SEGREDO só no job, em /alertas/sair e no descadastro', () => {
    expect(codigo.filter((f) => ler(f).includes('process.env.RESEND_API_KEY'))).toEqual(['worker/enviar-alertas.ts']);
    expect(codigo.filter((f) => ler(f).includes('process.env.ALERTAS_SEGREDO')).sort()).toEqual(
      ['app/alertas/sair/page.tsx', 'app/api/descadastro/route.ts', 'worker/enviar-alertas.ts'].sort(),
    );
  });
  it('nada de node:crypto nem segredo do e-mail no navegador', () => {
    const navegador = [...listar('components'), ...listar('lib/cliente')];
    expect(navegador.filter((f) => /node:crypto|alertas\/token|RESEND_API_KEY|ALERTAS_SEGREDO/.test(ler(f)))).toEqual([]);
  });
});

describe('eventos da Fase 4', () => {
  it('cada tipo é gravado em algum lugar (site ou job), fora da lista em lib/eventos.ts', () => {
    const fonte = codigo.filter((f) => f !== 'lib/eventos.ts').map(ler).join('\n');
    for (const t of TIPOS_EVENTO_OPORTUNIDADES) expect(fonte, t).toContain(`'${t}'`);
  });
});
```
Run: `npx vitest run scripts/alertas.test.ts` → FAIL (workflow e `.env.example`).

- [ ] **Step 2: Workflow**

Crie `.github/workflows/alertas.yml`:
```yaml
name: Alertas por e-mail

# Alertas todo dia às 10:00 UTC (7h em Brasília); resumo semanal do Pro na segunda, no mesmo horário (duas rodadas
# na segunda, uma depois da outra pelo concurrency). O GitHub pode atrasar o agendamento em alguns minutos.
on:
  schedule:
    - cron: '0 10 * * *'
    - cron: '0 10 * * 1'
  workflow_dispatch:
    inputs:
      modo:
        description: 'alertas (diário) ou resumo (semanal do Pro)'
        type: choice
        options:
          - alertas
          - resumo
        default: alertas

permissions:
  contents: read

concurrency:
  group: alertas
  cancel-in-progress: false

jobs:
  enviar:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run worker:alertas -- --modo "$MODO"
        env:
          MODO: ${{ github.event.schedule == '0 10 * * 1' && 'resumo' || inputs.modo || 'alertas' }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
          ALERTAS_SEGREDO: ${{ secrets.ALERTAS_SEGREDO }}
```

Em `.env.example`, acrescente ao fim:
```
# Envios por e-mail (alertas às 7h e resumo de segunda; job no GitHub Actions). Resend: chave da API.
RESEND_API_KEY=
# Assina os links "Parar de receber" (texto aleatório de 32+ caracteres; também na Vercel, para /alertas/sair)
ALERTAS_SEGREDO=
```

- [ ] **Step 3: Rodar, verificar e commitar**

Run: `npx vitest run scripts/alertas.test.ts scripts/conta.test.ts && npm test && npm run typecheck && npm run build`
Expected: PASS.
```bash
git add .github/workflows/alertas.yml .env.example scripts/alertas.test.ts
git commit -m "feat(alertas): agenda diária e semanal no GitHub Actions e guardas de isolamento" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 14 (controlador + dono): publicar e conferir ponta a ponta (e-mail real)

**Files:**
- Modify: `docs/fase-3-metricas.md`

**Interfaces:**
- Consumes: Tasks 1–13 no branch; Task 2 concluída (0016, segredos, dono Pro).
- Produces: site publicado; e-mails reais recebidos (alerta e resumo); workflow no `main` (com o ok do dono) e disparo manual conferido; números em `docs/fase-3-metricas.md`.

- [ ] **Step 1: Pré-condições**

`npm test && npm run typecheck && npm run build` passam. `select name from supabase_migrations.schema_migrations order by version;` contém `oportunidades_alertas`. `vercel env ls production | grep ALERTAS_SEGREDO` lista a variável. `gh secret list --repo mallon-10/edital-map` lista `RESEND_API_KEY` e `ALERTAS_SEGREDO`. O `.env` local tem `RESEND_API_KEY` e `ALERTAS_SEGREDO` (conferir só os nomes: `grep -c '^RESEND_API_KEY=\|^ALERTAS_SEGREDO=' .env` → 2). Se o pagamento já entrou no `main` e este branch ainda usa a variante B do `planoNavegador.ts`: `git rebase main`, trocar o arquivo pela variante A, `npm test && npm run typecheck && npm run build`, commit.

- [ ] **Step 2: Publicar**

`vercel deploy --prod --yes`. "Not authorized": repetir uma vez; falhou de novo, parar e avisar o dono.

- [ ] **Step 3: Rotas sem sessão**

```bash
B=https://www.editalmap.com.br
I='cookie: em_interno=1'
J='content-type: application/json'
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "$B/oportunidades"
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "$B/alertas/novo"
curl -s "$B/alertas" | grep -o 'Entrar para criar alertas' | head -1
curl -s "$B/api/salvos"; echo
curl -s -o /dev/null -w "%{http_code} salvar\n" -X POST -H "$J" -d '{"id":"00394452000103-1-021982/2026","user_id":"x"}' "$B/api/salvos"
curl -s -o /dev/null -w "%{http_code} salvar de fora\n" -X POST -H "$J" -H 'sec-fetch-site: cross-site' -d '{"id":"00394452000103-1-021982/2026"}' "$B/api/salvos"
curl -s -o /dev/null -w "%{http_code} alerta\n" -X POST -H "$J" -d '{"nome":"x","termos":["luva"]}' "$B/api/alertas"
curl -s -o /dev/null -w "%{http_code} resumo\n" -X POST -H "$J" -d '{"ligado":false}' "$B/api/conta/resumo"
curl -s "$B/alertas/sair?t=x" | grep -o 'Este link não vale' | head -1
curl -s -o /dev/null -w "%{http_code} descadastro\n" -X POST "$B/api/descadastro?t=x"
for u in / "/api/busca?q=luva" /sobre /planos /licitacoes; do curl -s -H "$I" -o /dev/null -w "%{http_code} $u\n" "$B$u"; done
```
Expected: `307 …/entrar?voltar=%2Foportunidades` e `307 …/entrar?voltar=%2Falertas%2Fnovo`; "Entrar para criar alertas"; `{"conta":false}`; `401 salvar`; `403 salvar de fora`; `401 alerta`; `401 resumo`; "Este link não vale"; `400 descadastro`; `200` nos cinco.

- [ ] **Step 4: Salvos e Minhas Oportunidades (com o dono, navegador 1440 px, conta Pro)**

1. Entrar. Na busca, salvar 2 editais pelo ícone dos cards (o ícone fica cheio, "Salvo"); abrir um terceiro edital: "Salvar" e "Descartar" no cabeçalho; descartar.
2. Meu Radar: cartão "Editais salvos" com o número; menu "⋯" de um card → "Descartar": o card some e o total do cartão "Oportunidades" cai 1.
3. /oportunidades: abas com contagens (Todos 2, Descartado 2); mudar um para "Em análise" (a aba conta), escrever uma observação e sair do campo ("Salvo ✓"); recarregar e conferir que ficou; ordenar por "Data em que salvei"; "Remover" pede confirmação (tem observação).
4. Janela anônima com outra conta (e-mail de teste do dono, Grátis): o ícone de salvar mostra "Salvar editais é do plano Pro." e "Ver planos".

- [ ] **Step 5: Alertas e envio real (o dono confere a caixa de entrada)**

1. /alertas: "Criar alerta a partir do meu radar" → salvar; "Criar alerta" com nome "Uniformes", produto "uniforme", Todo o Brasil → salvar. Lista com os dois, "Ativo", "Ainda sem envio…". Resumo semanal "Ligado".
2. Disparo local (antes do merge): `npm run worker:alertas`. Expected no log: `[alertas] {"contas":1,"emails":1,"enviados":N,…,"falhas":0}` (N = alertas com novidade nas últimas 24 h; se 0, esperar a próxima rodada do sync e repetir, ou criar um alerta mais amplo).
3. Dono: e-mail de `alertas@editalmap.com.br`, assunto "N editais novos …", editais com título, órgão, município/UF, valor, prazo e link que abre `/edital/…`; "Parar de receber este alerta" em cada seção; "Parar todos os alertas" no rodapé; no Gmail, "Cancelar inscrição" ao lado do remetente (List-Unsubscribe). Anotar o tempo até chegar.
4. Rodar de novo `npm run worker:alertas`: `"emails":0` e `sem_novidades` (nenhum edital repetido). [D9]: `duplicados = 0`.
5. Dono clica em "Parar de receber este alerta" → página de confirmação → "Parar de receber" → "Pronto…". /alertas mostra o alerta "Pausado"; "Retomar" volta a "Ativo".
6. Resumo: `npm run worker:resumo`. Expected: `[resumo] {"contas":1,"emails":1,"enviados":1,…}` (se o radar do dono não tiver novas nem prazo próximo: `semNovidades: 1`, nenhum e-mail; anotar). Dono confere: assunto "Sua semana no Edital Map: …", números, novos, encerrando, "Quem mais compra no seu radar", "Abrir o Meu Radar", "Parar o resumo semanal". Rodar de novo: `"contas":0` (já recebeu na semana). Dono clica em "Parar o resumo semanal" → confirma → /alertas mostra "Desligado"; religar.

- [ ] **Step 6: Workflow no main (com o ok do dono)**

Com o ok do dono para o merge: `git checkout main && git merge --no-ff evolucao-fase-4 && npm test && git push && git checkout evolucao-fase-4` (no checkout do `main` que o dono indicar; se o pagamento estiver no meio, combinar com ele a ordem). Depois:
```bash
gh workflow run alertas.yml --repo mallon-10/edital-map -f modo=alertas
gh run list --workflow alertas.yml --repo mallon-10/edital-map --limit 1
gh run watch --repo mallon-10/edital-map <id> --exit-status
```
Expected: verde; no log `[alertas] {… "falhas":0}` (provavelmente `emails: 0`, já enviado no passo 5). [D9]: nova linha `sem_novidades`. Sem o ok do dono: registrar "workflow ainda não está no main; envio diário começa depois do merge" e seguir para a Task 15.

- [ ] **Step 7: Celular, banco e registro**

Celular (390 × 844): /oportunidades, /alertas, /alertas/novo e /alertas/sair cabem sem rolagem lateral; os balões do ícone de salvar ficam dentro da tela. Rodar [D9] de `docs/evolucao-fase-4.sql`. Acrescente à seção "Evolução · Fase 4" de `docs/fase-3-metricas.md`:
```markdown
- Publicado em aaaa-mm-dd hh:mm. curl: páginas da conta → /entrar; rotas 401 sem sessão (user_id do corpo ignorado), 403 de fora; descadastro 400 com token ruim.
- Salvos: ícone nos cards e no edital, descartar pelo radar (total do cartão cai), abas e contagens, status, observação "Salvo ✓", remover com confirmação; Grátis vê o convite ao Pro.
- Alertas: 2 criados (1 do radar). 1ª rodada local: N e-mail, N editais, chegou em N s; 2ª rodada: 0 e-mail (sem repetir, duplicados 0). Descadastro pelo link pausou; retomar ok. List-Unsubscribe visível no Gmail: sim/não.
- Resumo semanal: N novas, N encerrando; e-mail recebido; 2ª rodada sem conta; "Parar o resumo semanal" desligou; religar ok.
- Workflow no main em aaaa-mm-dd (ou: pendente do ok do dono); disparo manual verde em N s.
- Celular 390 px ok. Eventos: edital_salvo N, edital_descartado N, alerta_criado N, alerta_enviado N, resumo_enviado N, sem e-mail.
```
```bash
git add docs/fase-3-metricas.md
git commit -m "docs: evolução fase 4 publicada e conferida (e-mails reais)" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 15: Documentação e aceite

**Files:**
- Modify: `CLAUDE.md`, `docs/superpowers/specs/2026-10-18-evolucao-fase-4-oportunidades-alertas-design.md` (§6)

**Interfaces:**
- Consumes: resultado das Tasks 2 e 14.
- Produces: regras novas no `CLAUDE.md`; aceite marcado na spec.

- [ ] **Step 1: `CLAUDE.md`**

1. Depois da linha que começa com `- Evolução · Fase 3 (conta por código, onboarding e Meu Radar):`, acrescente:
```markdown
- Evolução · Fase 4 (Minhas Oportunidades, alertas reais e resumo semanal do Pro): spec docs/superpowers/specs/2026-10-18-evolucao-fase-4-oportunidades-alertas-design.md, plano docs/superpowers/plans/2026-10-18-evolucao-fase-4-oportunidades-alertas.md, conferências docs/evolucao-fase-4.sql (0016: salvos com status/observação, alertas, alertas_enviados por alerta, envios_alerta, envios_resumo, perfis.resumo_semanal; plano_da_conta, gravar_salvo, salvos_da_conta, alertas_para_envio, editais_do_alerta, registrar_envio_alerta, contas_para_resumo, resumo_do_radar, parar_resumo_semanal; p_sem_ids em buscar_editais/radar_contagens).
```
2. Na seção "Regras", depois da linha que começa com `- Meu Radar:`, acrescente:
```markdown
- Plano da conta (lib/limitesConta.ts, `planoDaConta`): Grátis ou Pro (o Basic acabou; linha 'basic' antiga vale Pro). Pro se perfis.plano manual = pro, ou assinatura válida (0015) com o e-mail da conta, ou (só no site) o plano do navegador; os envios por e-mail usam só a conta. Grátis: nenhum salvo nem alerta (convite ao Pro); Pro: até 5 alertas (pausados contam) e salvos com uso justo (500). Assinou com outro e-mail: aviso "Plano no navegador, não na conta…".
- Minhas Oportunidades (/oportunidades): salvos com status pessoal (Salvo, Em análise, Vou participar, Descartado) e observação (até 500), só por lib/servidor/salvos.ts (`gravar_salvo` com limite numa transação). Descartados somem do Meu Radar (p_sem_ids) e não contam no limite (teto 500). A retenção não apaga contratação salva (descartada sai com ela).
- Alertas (/alertas): vários por conta com os filtros do radar; envio diário às 7h (`.github/workflows/alertas.yml`, `npm run worker:alertas`) pelo Resend (`alertas@editalmap.com.br`, API HTTP com fetch): editais que entraram ou mudaram desde o último envio (1º: 24 h), até 20 por alerta, um e-mail por conta, nunca o mesmo edital duas vezes no mesmo alerta (alertas_enviados gravado só depois do aceite), 3 novas tentativas (2/4/8 s), histórico em envios_alerta. Resumo semanal do Pro na segunda (`--modo resumo`, `npm run worker:resumo`): Meu Radar da semana, uma vez por semana, histórico em envios_resumo, liga/desliga em /alertas. Links "Parar de receber" com token HMAC (`ALERTAS_SEGREDO`, também na Vercel) em /alertas/sair e um clique em /api/descadastro (sem sessão; pausa, não apaga). Segredos do job: RESEND_API_KEY e ALERTAS_SEGREDO no GitHub. Eventos edital_salvo, edital_descartado, alerta_criado, alerta_enviado, resumo_enviado (sem e-mail).
```
3. Em "Comandos", depois de `- npm run worker:reler-itens: …`, acrescente:
```markdown
- npm run worker:alertas: envia os alertas do dia (precisa de RESEND_API_KEY e ALERTAS_SEGREDO); npm run worker:resumo: resumo semanal do Pro
```
4. Na seção "Stack", troque `- Fases seguintes: Stripe (planos), Resend (alertas e login por e-mail).` por `- E-mail: Resend (código de login pelo SMTP do Supabase; alertas e resumo semanal pela API, job no GitHub Actions).`

- [ ] **Step 2: Aceite na spec**

Na seção 6 da spec, marque `[x]` em cada critério cumprido, com o comprovante ao lado (data, `docs/fase-3-metricas.md`); o que faltar fica `[ ]` com uma frase do que falta (ex.: "workflow no main depende do merge"). Acrescente duas linhas: `- Decisão do dono depois da spec: o Basic acabou (só Grátis e Pro); salvos e alertas são do Pro (5 alertas, salvos com uso justo).` e `- Escopo acrescentado: resumo semanal do Pro às segundas (mesmo remetente, descadastro próprio, histórico em envios_resumo).`

- [ ] **Step 3: Verificação final e commit**

Run: `npm test && npm run typecheck && npm run build`
```bash
git add CLAUDE.md docs/superpowers/specs/2026-10-18-evolucao-fase-4-oportunidades-alertas-design.md
git commit -m "docs: evolução fase 4 no ar, regras novas e aceite" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

## Cobertura da spec

| Spec | Onde |
|---|---|
| §1 `planoDaConta`: manual, assinatura com o e-mail da conta, navegador; o maior vence | Tasks 1 (`plano_da_conta`), 3 (`planoDaConta`, `planoDoNavegador`) |
| §1 envio sem navegador usa (a)+(b); aviso "Plano no navegador, não na conta…" | Tasks 1 (`alertas_para_envio`, `contas_para_resumo`), 3 (`avisoPlanoNavegador`), 6 e 8 (aviso nas páginas) |
| §1 limites por plano (atualizado pelo dono: só Grátis e Pro; Pro 5 alertas e salvos com uso justo 500) | Task 3 (`LIMITES_CONTA`, `bloqueioSalvar`, `bloqueioAlerta`), Task 1 (`gravar_salvo`), Tasks 4/7 (402), Task 10 (`separarPorPlano`) |
| §2 0016 em `salvos` (status, observação, atualizado_em, chave dupla, sem FK; retenção não apaga salvo) | Task 1 (+ [D3], [D4]) |
| §2 Salvar nos cards da lista, do radar e no edital; "Salvo"; tocar de novo remove com confirmação | Task 5 (`BotaoSalvar`, `precisaConfirmar`) |
| §2 Descartar no edital e no menu do card do radar; somem do radar; só na aba Descartados | Tasks 1 (`p_sem_ids`), 5 (`BotaoDescartar`, `MenuCardRadar`, radar), 6 (abas) |
| §2 /oportunidades: abas com contagem, ordem por prazo e por data, linha completa, status, observação ao sair ("Salvo ✓"), abrir, remover; texto dos status | Tasks 4 (`salvosDaAba`, `contarPorStatus`, `situacaoOficial`), 6 |
| §2 cartão "Editais salvos" no Meu Radar | Task 5 (`CartoesRadar`) |
| §3 tabela `alertas`, mesmas validações do radar, "a partir do meu radar" | Tasks 1, 7 (`validarAlerta`), 8 (`/alertas/novo?de=radar`) |
| §3 `alertas_enviados` por alerta (chave dupla) e `envios_alerta` (status, qtd, tentativas, erro, id_mensagem) | Task 1 (+ [D6]), Task 10 |
| §3 /alertas com conta (lista, resumo dos filtros, ativo/pausado, último envio, criar, editar, pausar/retomar, excluir); sem conta: convite; formulário antigo sai | Tasks 7, 8 |
| §3 envio às 7h (cron 0 10 * * * UTC) com os segredos | Tasks 10, 13 |
| §3.1 abertos que casam (mesma busca do radar, relevância, até 20), desde o último envio (1º: 24 h), sem os já enviados | Tasks 1 (`editais_do_alerta`), 10 (`desdeDoAlerta`, `LIMITE_EDITAIS_EMAIL`) |
| §3.2 um e-mail por conta, remetente, campos por edital, link do site; sem novidade não manda (`sem_novidades`) | Tasks 9 (`montarEmail`), 10 |
| §3.3 `alertas_enviados` só depois do aceite; até 3 novas tentativas (2/4/8 s); `falhou` e o próximo dia tenta de novo | Tasks 1 (`registrar_envio_alerta`, `p_avancar`), 10 (`criarEnvioResend`, ordem testada) |
| §3.4 limites do Resend (pausa entre e-mails) e plano no envio (`pulado_plano`) | Task 10 (`PAUSA_ENTRE_EMAILS_MS`, `separarPorPlano`) |
| §3 descadastro por alerta e de todos, token HMAC, confirmação em uma tela, List-Unsubscribe + Post; pausar não apaga | Task 9 |
| §3 nada simulado: sem chave/segredo → `falhou` com motivo; página "Envio indisponível agora" | Tasks 7 (`envioIndisponivel`), 8, 10 (`motivoSemEnvio`) |
| §4 eventos novos (+ `resumo_enviado`), sem e-mail | Tasks 1, 4, 7, 10, 12, 13 (guarda) |
| §5 RLS sem políticas, só service_role, índices, `lock_timeout`; tudo pelo servidor com `usuarioAtual()`; CSRF; `no-store` | Tasks 1, 4, 7, 8, 13 |
| §6 testes (plano, limites, validação, seleção, e-mail, token, retry, rotas com conta e CSRF), banco ([D0]–[D10]) e ponta a ponta com o e-mail real | Tasks 1–14 |
| Escopo novo (dono): resumo semanal do Pro às segundas, preferência `perfis.resumo_semanal`, descadastro e List-Unsubscribe próprios, histórico, sem dado inventado, não manda sem novidade | Tasks 1 (`contas_para_resumo`, `resumo_do_radar`, `envios_resumo`), 3 (preferência na conta), 8 (liga/desliga), 9 (token `r`), 11 (e-mail), 12 (job), 13 (agenda de segunda) |

## Riscos conhecidos (para o revisor e o controlador)

- **`editais_do_alerta` e `resumo_do_radar` calculam a relevância em todas as abertas do filtro** (como a lista do radar, 520 ms com 5 produtos e 12 relacionados). São poucas contas e o job é noturno; se [D7] passar de 1 s ou [D10] de 1,5 s, a rodada só fica mais longa (o teto do job é 15 min). Saída se crescer: filtrar a janela antes da relevância (migração nova com a janela dentro de `abertas_unicas`).
- **Edital publicado antes e sincronizado depois do último envio** entra pela `sincronizada_em` (Decisão 8). Edital que só muda campos sem importância também volta à janela, mas a chave dupla impede repetir.
- **Mais de 20 editais num dia**: a janela não avança (`p_avancar` falso) e os outros seguem para o dia seguinte; um alerta muito amplo pode ficar sempre atrasado. O e-mail diz quantos ficaram.
- **Falha ao gravar o histórico depois de o Resend aceitar** (banco fora no meio da rodada): o mesmo e-mail pode sair de novo no dia seguinte (a chave de idempotência do Resend só vale 24 h). A conta é registrada no log do job.
- **Agendamento do GitHub atrasa** (às vezes 10–30 min) e **só roda no `main`**: o envio diário começa depois do merge (ok do dono). Na segunda há duas rodadas (alertas e resumo) em sequência.
- **Assinou com outro e-mail**: o Pro vale no navegador, mas os e-mails não saem (`pulado_plano`; resumo não lista a conta). A página avisa; ligar o plano à conta fica para depois.
- **Salvo removido pelo worker**: contratação regravada já fora da retenção sai pelo `removerContratacoes` do sync, mesmo salva; a linha aparece como "Edital não disponível".
- **Conflitos com o branch `pagamento`** (Ordem de publicação): `lib/eventos.ts` (`assinou` × `TIPOS_EVENTO_OPORTUNIDADES`), `registro.ts` (`Contexto.dono` × tipos do `gravarEvento`), `app/radar/page.tsx` (plano do navegador × descartados), edital (botões), `scripts/migracoes.test.ts` (guardas da 0015 × 0016). Todos de poucas linhas.
- **`List-Unsubscribe` um clique** depende do provedor (Gmail mostra "Cancelar inscrição" só para remetentes com reputação); o link no corpo sempre funciona.

## Auto-revisão (writing-plans)

1. **Cobertura da spec:** cada item de §1–§6 e do escopo novo do dono (Basic fora, resumo semanal) aponta para uma task na tabela acima. Fora do escopo, por decisão registrada: tabela de /planos (sessão do pagamento), ligação automática do plano do navegador à conta, vencimentos por e-mail.
2. **Placeholders:** nenhum "TBD"/"TODO"/"implementar depois"; todo passo de código tem o código. `aaaa-mm-dd`, `N`, `<e-mail do dono>` e `<modelo>` aparecem só nos registros e comandos do controlador, com valores obtidos na hora. A única escolha em tempo de execução é a variante do `planoNavegador.ts` (Task 3, Step 5), com as duas variantes escritas.
3. **Consistência de nomes e tipos:** `NivelConta`/`PlanoConta`/`LIMITES_CONTA`/`lerPlano`/`maiorPlano`/`bloqueioSalvar`/`bloqueioAlerta`/`avisoPlanoNavegador`/`MENSAGENS_LIMITE_CONTA` (Task 3) nas Tasks 4–10; `planoDaConta`/`resumoSemanalLigado`/`mudarResumoSemanal` (Task 3) nas Tasks 4, 6, 7, 8; `StatusSalvo`/`MapaSalvos`/`SalvoDaConta`/`validarSalvar`/`validarMudanca`/`validarRemocao`/`salvosDaAba`/`contarPorStatus`/`idsDescartados`/`precisaConfirmar`/`situacaoOficial` (Task 4) nas Tasks 5–6; `gravarSalvo`/`estadoDosSalvos`/`salvosDaConta`/`mudarObservacao`/`removerSalvo` (Task 4) nas Tasks 5–6; `pedirJson`/`respostaDaAcao`/`irParaEntrar`/`useSalvos`/`mudarSalvo`/`atualizarSalvo`/`acaoDoBotao` (Task 5) nas Tasks 6 e 8; `Alerta`/`AlertaDaConta`/`StatusEnvio`/`validarAlerta`/`validarMudancaAlerta`/`lerIdAlerta`/`textoUltimoEnvio`/`envioIndisponivel` (Task 7) nas Tasks 8 e 10; `AlvoDescadastro`/`criarTokenDescadastro`/`lerTokenDescadastro`/`lerSegredo`/`montarEmail`/`EditalDoEmail`/`EmailMontado`/`editalHtml`/`editalTexto`/`moldura`/`cabecalhosDescadastro`/`linkSair` (Task 9) nas Tasks 10–12; `Enviar`/`DepsEnvio`/`chaveIdempotencia`/`motivoSemEnvio`/`mensagemDeErro`/`PAUSA_ENTRE_EMAILS_MS`/`VISITANTE_JOB` (Task 10) na Task 12; `ResumoSemanal`/`resumoDaResposta`/`temNovidade`/`montarResumo` (Task 11) na Task 12; parâmetros SQL `p_user`/`p_alerta`/`p_desde`/`p_limite`/`p_sem_ids`/`p_selecionado_em`/`p_avancar` e chaves do JSON do resumo (Task 1) em `lib/servidor/*` e `worker/alertas/*`.
