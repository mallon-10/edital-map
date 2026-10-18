# Edital Map · Evolução · Fase 3 · Conta, onboarding e Meu Radar · plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Login por e-mail com código de 6 dígitos (Supabase Auth + `@supabase/ssr`, sessão em cookie httpOnly validada no servidor), onboarding em 3 etapas que grava um radar por conta, página Meu Radar com cartões de contagem reais, lista personalizada (mesmos cards, ordenação e paginação da Fase 2, explicação pelo perfil), prévia de 5 no grátis, edição do radar, menu da conta e eventos novos.

**Architecture:** Toda a autenticação passa por `lib/servidor/sessao.ts` (único lugar que cria o tipo `Usuario`, a partir de `auth.getUser()`, com a chave publicável `SUPABASE_ANON_KEY` só no servidor); `proxy.ts` renova a sessão quando há cookie `sb-…-auth-token`. Os dados da conta (perfil e radar) passam só por `lib/servidor/conta.ts`, cujas funções recebem `usuario: Usuario` e filtram pelo `usuario.id`, com a service role (nenhuma política RLS para anon/authenticated). A migração `0014_conta_radar.sql` amplia `perfis`/`radares`, tira as políticas antigas, acrescenta `p_ibges`, `p_valor_max` e `p_so_me_epp` a `abertas_unicas` e `buscar_editais` (superconjunto: chamadas atuais seguem valendo) e cria `radar_contagens` (os três cartões numa passada), `exclusivo_me_epp` (mesma regra da etiqueta "Exclusivo ME/EPP" do edital) e `buscar_municipios` (onboarding). Tudo o que decide é puro e testado: `lib/conta.ts` (e-mail, código, destino, mensagens de erro, reenvio, cookie de sessão) e `lib/radar.ts` (validação, montagem da busca do radar, prévia, navegação, rascunho do formulário, resumo). O radar reaproveita `expandir` (termos relacionados), `relevancia` (com explicação "um dos produtos que você monitora") e os componentes da lista da Fase 2.

**Tech Stack:** Next.js 16 (App Router, `proxy.ts`, `after`, `connection`) + React 19 + Tailwind 4, @supabase/supabase-js 2, **@supabase/ssr 0.12** (única dependência nova), Postgres 15 do Supabase (PostgREST, plpgsql), vitest 3, TypeScript 5, Vercel CLI.

**Spec:** `docs/superpowers/specs/2026-10-18-evolucao-fase-3-conta-radar-design.md` (vinculante). Regras do projeto: `CLAUDE.md`. Formato e convenções: `docs/superpowers/plans/2026-10-18-evolucao-fase-2-busca-relevancia.md`.

## Global Constraints

- Trabalho no worktree `C:\Users\jotap\worktrees\evolucao-f3` (Git Bash: `/c/Users/jotap/worktrees/evolucao-f3`), branch `evolucao-fase-3` (já existe e está ativo; dependências instaladas). Todos os comandos rodam na raiz do worktree. **Não ler nem mexer no checkout principal** (pasta do OneDrive). Não ler nem imprimir o `.env`.
- TDD com vitest: teste primeiro. `npm test` e `npm run typecheck` passam antes de cada commit; tasks que mexem em `app/`, `components/` ou `proxy.ts` também rodam `npm run build`.
- Única dependência nova: `@supabase/ssr` (Task 1). Nenhuma outra.
- Schema só muda com migração nova: esta fase cria só `supabase/migrations/0014_conta_radar.sql`; não editar 0001–0013 (0012 e 0013 são do SEO). **Implementadores não aplicam migração, não rodam SQL, não tocam no banco, não chamam o Supabase Auth nem o PNCP**: escrevem o SQL e as guardas de texto em vitest. Quem aplica e confere é o controlador (Task 4): `npm run db:aplicar -- supabase/migrations/0014_conta_radar.sql` (uma transação, `set local lock_timeout = '10s'`).
- Funções novas ou trocadas com `revoke execute on function ... from public, anon, authenticated;` e `grant execute on function ... to service_role;` explícitos **por assinatura**. Tabelas da conta (`perfis`, `radares`, `salvos`, `alertas_enviados`): RLS ligado, **nenhuma** política, `revoke all ... from public, anon, authenticated`, acesso só `service_role`.
- **`user_id` só de `auth.getUser()`**: o tipo `Usuario` só é criado em `lib/servidor/sessao.ts`; toda leitura/gravação de `perfis`/`radares` passa por `lib/servidor/conta.ts` com `usuario: Usuario`; nenhum arquivo de `app/` fala em `user_id`/`userId`; nenhuma rota lê dono de radar do corpo, da query ou de cookie próprio. Guardas em `scripts/conta.test.ts` (Task 9).
- Chaves: `SUPABASE_SERVICE_ROLE_KEY` (dados) e `SUPABASE_ANON_KEY` (Auth, publicável) só no servidor; nenhum arquivo de `components/` ou `lib/cliente/` lê `process.env.SUPABASE_*`; `@supabase/ssr` só em `lib/servidor/sessao.ts` e `lib/sessaoProxy.ts`. Sem cliente Supabase no navegador.
- Cookies da sessão: `httpOnly: true`, `sameSite: 'lax'`, `secure` em produção, `path: '/'` (`OPCOES_COOKIE_SESSAO`), forçados por cima das opções do `@supabase/ssr`.
- Limite do grátis: **continua por navegador** (`lib/limites.ts` e `lib/servidor/uso.ts` não mudam). Abrir e ordenar o radar **não** chama `decidirBusca`; abrir um edital pelo radar continua contando (o card é o `CardLista`, link `/edital/...` com `prefetch={false}`). Grátis (e não interno) vê os **5** primeiros (`VISIVEIS_GRATIS`) e as contagens; o resto fica atrás de "Prévia do Radar". Navegador interno (`em_interno=1`) vê tudo, como já não conta limites.
- Todo `<Link>` para `/edital/...` tem `prefetch={false}` (guarda `scripts/prefetch-edital.test.ts`). Sem `cacheComponents`.
- Interface em português do Brasil, vocabulário "edital" e "Alertas". Só as cores e raios do design system em `app/globals.css` (`bg-pin`, `text-on-pin`, `bg-pin-soft`, `text-pin-strong`, `border-pin`, `bg-ouro-soft`, `text-ouro-strong`, `bg-mata-soft`, `text-mata`, `bg-sunken`, `bg-raised`, `bg-surface`, `text-ink`, `text-ink-muted`, `border-line`, `border-line-strong`, `rounded-xs/sm/md/lg`). Nenhuma cor nova, nenhuma sombra nova.
- Textos exatos: página "/entrar" ("Entrar no Edital Map", "Enviar código", "Digite o código", "Reenviar código", "Reenviar código em N s", "Trocar e-mail"); erros `MENSAGENS_CONTA` (Task 1) e `MENSAGENS_RADAR` (Task 5); etapas "O que sua empresa vende?", "Onde sua empresa atende?", "Que tipo de oportunidade procura?", "Todo o Brasil", "Só exclusivas para ME/EPP", "Pular"; cartões "Oportunidades para o seu perfil", "Novas desde a sua última visita" (ou "Novas nas últimas 24 horas" na primeira visita), "Prazo próximo"; "Prévia do Radar"; menu "Meu Radar", "Editar meu radar", "Sair"; atalho "Ver meu radar"; explicação "Menciona fardamento, relacionado a uniformes profissionais, um dos produtos que você monitora.".
- "Tipo de contratação" (compra/serviço/obra), "Editais salvos" e "Excluir minha conta" **não** entram (spec §2, §3, §5).
- Implementadores verificam com `npm test`, `npm run typecheck` e `npm run build`; **não** sobem `npm run dev` contra o banco. Conferências no navegador e o login real são do controlador com o dono (Task 10).
- Todo commit termina com `Co-Authored-By: <nome do modelo que escreveu o commit> <noreply@anthropic.com>` (nos comandos abaixo, `<modelo>`).

## Estimativa de tempo

| Task | Quem | Modelo | Tempo estimado | Acumulado |
|---|---|---|---|---|
| 1 · Sessão: `@supabase/ssr`, helpers do servidor e proxy | implementador | standard | 40 min | 0h40 |
| 2 · /entrar (código por e-mail) e menu da conta | implementador | capable | 60 min | 1h40 |
| 3 · Migração 0014, guardas e conferências | implementador | capable | 50 min | 2h30 |
| 4 · Aplicar a 0014, chave publicável e modelo do e-mail | controlador (+ dono 5 min) | — | 30 min | 3h00 |
| 5 · Dados do radar (validação, busca, conta.ts, radar.ts) | implementador | capable | 60 min | 4h00 |
| 6 · Onboarding em 3 etapas (/radar/comecar, /api/radar, /api/municipios) | implementador | capable | 75 min | 5h15 |
| 7 · Página Meu Radar (cartões, lista, ordem, páginas, prévia, visita) | implementador | capable | 60 min | 6h15 |
| 8 · Editar radar (/radar/editar) | implementador | standard | 25 min | 6h40 |
| 9 · Eventos, navegação e guardas de isolamento | implementador | standard | 40 min | 7h20 |
| 10 · Publicar e conferir ponta a ponta (login real) | controlador + dono | — | 45 min | 8h05 |
| 11 · Documentação e aceite | implementador | cheap | 15 min | 8h20 |

Revisões entre tasks somam ~20%: total realista **~10 h**.

**Do dono (João):**
- Task 4, ~5 min: colar o modelo do e-mail (assunto "Seu código do Edital Map" e o HTML de `supabase/templates/codigo.html`) em **Authentication → Emails → Templates**, nos modelos **Magic Link** e **Confirm signup**, e conferir em **Authentication → Sign In / Providers → Email** "Email OTP Length" = 6 e "Email OTP Expiration" = 3600. Só se o controlador não tiver `SUPABASE_ACCESS_TOKEN` (com o token, ele faz pela API de gerenciamento).
- Task 10, ~10 min: entrar com o próprio e-mail no site publicado (receber o código, digitar), fazer o onboarding, ver o radar, editar, sair; repetir numa janela anônima para ver a "Prévia do Radar" (o navegador dele é interno e vê tudo).
- Opcional: abrir /entrar e /radar no celular.

O resto o controlador e os implementadores fazem sozinhos. Se a Task 4 medir o radar de 5 produtos acima de 500 ms, avisar com a nova estimativa (+30–60 min, ver "Riscos").

## Decisões (onde a spec deixou espaço)

1. **Rotas, não Server Actions**, para o login (`/api/conta/codigo`, `/api/conta/entrar`, `/api/conta/sair`, `/api/conta`) e para o radar (`/api/radar`, `/api/radar/visita`): mesma forma das rotas existentes, testáveis com `Request`.
2. **Menu da conta pergunta a `/api/conta`** no navegador (`useConta`, um pedido por carga de página): o cabeçalho é componente de cliente e /sobre e /planos não ficam dinâmicas por causa do cookie.
3. **Dois modelos de e-mail iguais**: o Supabase usa "Confirm signup" no primeiro `signInWithOtp` de um e-mail novo e "Magic Link" depois; os dois mostram `{{ .Token }}`. O texto fica versionado em `supabase/templates/codigo.html`. `verifyOtp` com `type: 'email'` vale para os dois.
4. **Código de 6 dígitos exatos** (`lerCodigo`); o controlador garante "Email OTP Length" = 6. Código errado e expirado têm a mesma mensagem (o Supabase devolve `otp_expired` nos dois casos).
5. **Só ME/EPP** = todos os itens exclusivos para ME/EPP (`exclusivos = total > 0` em `itens_resumo`), a mesma regra da etiqueta "Exclusivo ME/EPP" do edital (`app/edital/[slug]/page.tsx`). Edital sem resumo dos itens não entra com o filtro ligado.
6. **Faixa de valor**: com mínimo ou máximo, edital com "Valor não informado" (nulo ou 0) fica de fora (o mínimo já fazia isso; o máximo usa `nullif(valor_estimado, 0) <= p_valor_max`).
7. **Estados ou municípios, não os dois** (spec "UFs **ou** municípios"): checagem no banco e na validação. Até 50 municípios, 10 produtos, 10 palavras excluídas.
8. **Produtos do radar = `p_termos`** (cada um uma alternativa, OR) e os relacionados de todos via `expandir` (teto `MAX_RELACIONADOS` = 20 no total); excluídos = `p_excluir`. Um produto digitado com vírgula ("luva, bota") vira dois produtos (`gruposDigitados`). Cada produto precisa de uma palavra com 3+ letras fora das de ligação.
9. **Contagens numa função só** (`radar_contagens`): total, novas (`publicada_em > p_desde`) e prazo próximo (encerra até o fim do dia de hoje + 7, a mesma conta de `p_dias = 7`). Primeira visita (sem `ultima_visita_radar`): "Novas nas últimas 24 horas".
10. **Visita registrada ao sair da página** (`pagehide` ou desmontagem do componente, `navigator.sendBeacon('/api/radar/visita')`): trocar ordem ou página não zera "Novas"; voltar ao radar depois de abrir um edital mostra as novas desde então.
11. **Prévia de 5 sem páginas**: grátis vê os 5 primeiros na ordem escolhida (ordenar continua permitido e não conta); a paginação só aparece para Basic/Pro/interno.
12. **Eventos sem e-mail**: `conta_entrou` `{ radar: 'sim' | 'nao' }`; `onboarding_iniciado` `{}`; `onboarding_concluido` `{ termos, ufs, municipios }` (contagens); `radar_visto` `{ total, novas, plano }`. Todos com o `visitante` do cookie, como os demais. Tipos em `TIPOS_EVENTO_CONTA` (lista nova, para não mudar a guarda da 0009).
13. **Políticas antigas saem** ("perfil próprio", "radares próprios", "salvos próprios" da 0001): a spec pede nenhuma política para anon/authenticated. O gatilho `ao_criar_usuario` (`novo_perfil`, `security definer`) continua criando o perfil grátis.
14. **Busca de município do onboarding** por `buscar_municipios` (todos os 5.570, sem acento, prefixo primeiro), não pelos pontos do mapa (o filtro da página inicial só lista municípios com editais abertos).
15. **Depois do login**: `destino` = `voltar` seguro (começa com "/", não "//", não /entrar nem /api) ou `/radar`; `/radar` sem radar manda para `/radar/comecar`.

## Ordem de publicação (perigos)

| Momento | Ordem obrigatória | O que quebra se inverter |
|---|---|---|
| 0014 | Task 4: `gh run list --workflow sync.yml --limit 1` sem `in_progress` → aplicar → site no ar 200 → conferências [C1]–[C9]. Só depois, Task 10: `vercel deploy --prod --yes`. | Site novo antes da 0014: `buscar_editais` não conhece `p_ibges`/`p_valor_max`/`p_so_me_epp` e `radar_contagens` não existe → /radar dá erro; `eventos_tipo_check` recusa os eventos novos (o log mostra, a tela segue). |
| 0014 aplicada, site antigo no ar | Nada a fazer: as funções novas aceitam as chamadas antigas (parâmetros novos com padrão nulo); `mapa_editais` chama `abertas_unicas` com os 9 primeiros argumentos. As políticas antigas não eram usadas (o site só usa a service role). | — |
| `SUPABASE_ANON_KEY` | Task 4: na Vercel (production) e no `.env` local **antes** do deploy da Task 10. | Sem a chave: `usuarioAtual()` devolve null (ninguém entra), `/api/conta/codigo` responde "Não foi possível concluir agora…", o proxy só não renova. Nada quebra fora do login. |
| Modelo do e-mail e OTP de 6 | Task 4, antes do teste da Task 10. | E-mail em inglês com link (sem código) ou código de 8 dígitos (`lerCodigo` recusa). |
| Sempre | `db:aplicar` fora de uma rodada do sync. | `lock_timeout` de 10 s estoura; a migração inteira volta atrás. |

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `package.json`, `package-lock.json` | `@supabase/ssr` |
| `.env.example` | `SUPABASE_ANON_KEY=` |
| `lib/eventos.ts` | `EMAIL` exportado; `TIPOS_EVENTO_CONTA`, `TipoEventoConta` |
| `lib/conta.ts` (novo) | `lerEmail`, `lerCodigo`, `destinoSeguro`, `MENSAGENS_CONTA`, `mensagemErroAuth`, `statusErroAuth`, `REENVIO_SEGUNDOS`, `segundosParaReenvio`, `temCookieDeSessao`, `OPCOES_COOKIE_SESSAO` |
| `lib/servidor/sessao.ts` (novo) | `Usuario`, `usuarioAtual`, `enviarCodigo`, `entrarComCodigo`, `sair` |
| `lib/sessaoProxy.ts` (novo), `proxy.ts` | Renovação da sessão; matcher com /radar e /entrar |
| `app/api/conta/{route,codigo/route,entrar/route,sair/route}.ts` (novos) | Conta pelo servidor |
| `lib/cliente/conta.ts` (novo) | `lerConta`, `esquecerConta`, `useConta` |
| `app/entrar/page.tsx`, `components/conta/{FormEntrar,MenuConta}.tsx` (novos), `components/Cabecalho.tsx` | Login e menu |
| `supabase/migrations/0014_conta_radar.sql` (novo), `scripts/migracoes.test.ts`, `docs/evolucao-fase-3.sql` (novo) | Banco, guardas, conferências |
| `supabase/templates/codigo.html` (novo), `scripts/sessao.test.ts` (novo) | Modelo do e-mail; guardas de sessão e do modelo |
| `lib/relevancia/pontuacao.ts` | `explicarPerfil`; `relevancia(a, b, { perfil })` |
| `lib/radar.ts` (novo) | `Radar`, validação, busca, prévia, navegação, rascunho, resumo |
| `lib/servidor/conta.ts` (novo) | `perfilDaConta`, `lerRadar`, `salvarRadar`, `marcarVisitaRadar` |
| `lib/servidor/radar.ts` (novo), `lib/servidor/consultas.ts` | `editaisDoRadar`, `contagensDoRadar`; `paraResumo` exportado |
| `lib/servidor/municipios.ts` (novo), `app/api/municipios/route.ts` (novo) | Busca de município |
| `app/api/radar/route.ts`, `app/api/radar/visita/route.ts` (novos) | Salvar radar; registrar visita |
| `app/radar/{page,comecar/page,editar/page}.tsx` (novos) | Meu Radar, onboarding, edição |
| `components/radar/{FormRadar,CampoTermos,CampoLocal,CartoesRadar,ResumoRadar,NavegacaoRadar,CartaoPreviaRadar,RegistrarVisitaRadar}.tsx` (novos), `components/AtalhoRadar.tsx` (novo), `app/page.tsx` | Peças do radar e navegação |
| `lib/servidor/registro.ts` | `gravarEvento` aceita `TipoEventoConta` |
| `scripts/conta.test.ts` (novo) | Guardas de isolamento |
| `CLAUDE.md`, spec §6, `docs/fase-3-metricas.md` | Documentação, aceite e números |

---

### Task 1: Sessão: `@supabase/ssr`, helpers do servidor e proxy

**Files:**
- Modify: `package.json`, `package-lock.json` (via npm), `.env.example`, `lib/eventos.ts` (exportar `EMAIL`), `proxy.ts`
- Create: `lib/conta.ts`, `lib/servidor/sessao.ts`, `lib/sessaoProxy.ts`
- Test: `lib/conta.test.ts`, `lib/servidor/sessao.test.ts`, `lib/sessaoProxy.test.ts`, `scripts/sessao.test.ts`

**Interfaces:**
- Consumes: `EMAIL`, `Resultado` (`lib/eventos.ts`); `COOKIE_VISITANTE`, `OPCOES_COOKIE`, `visitanteDoCookie` (`lib/visitante.ts`).
- Produces:
  - `lib/conta.ts`: `DIGITOS_CODIGO = 6`; `REENVIO_SEGUNDOS = 60`; `DESTINO_PADRAO = '/radar'`; `lerEmail(v: unknown): string | null`; `lerCodigo(v: unknown): string | null`; `destinoSeguro(v: string | null | undefined): string`; `type ErroAuth = { code: string | null; status: number | null }`; `MENSAGENS_CONTA` (`email`, `codigo`, `codigoErrado`, `muitas`, `falha`, `entrar`); `mensagemErroAuth(e: ErroAuth): string`; `statusErroAuth(e: ErroAuth): 400 | 429 | 502`; `segundosParaReenvio(enviadoEm: number, agora: number): number`; `temCookieDeSessao(nomes: readonly string[]): boolean`; `OPCOES_COOKIE_SESSAO`.
  - `lib/servidor/sessao.ts`: `type Usuario = { readonly id: string; readonly email: string; readonly [MARCA_SESSAO]: true }`; `usuarioAtual(): Promise<Usuario | null>`; `enviarCodigo(email: string): Promise<{ ok: true } | { ok: false; erro: ErroAuth }>`; `entrarComCodigo(email: string, codigo: string): Promise<{ ok: true; usuario: Usuario } | { ok: false; erro: ErroAuth }>`; `sair(): Promise<void>`.
  - `lib/sessaoProxy.ts`: `renovarSessao(request: NextRequest): Promise<NextResponse>`.

- [ ] **Step 1: Instalar a dependência**

Run: `npm install @supabase/ssr@^0.12.7`
Expected: `package.json` com `"@supabase/ssr": "^0.12.7"` em `dependencies`; nenhuma outra dependência nova.

- [ ] **Step 2: Escrever os testes puros (falhando)**

Em `lib/eventos.ts`, troque `const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;` por `export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;` (sem outra mudança).

Crie `lib/conta.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  destinoSeguro, lerCodigo, lerEmail, MENSAGENS_CONTA, mensagemErroAuth, OPCOES_COOKIE_SESSAO, REENVIO_SEGUNDOS,
  segundosParaReenvio, statusErroAuth, temCookieDeSessao,
} from './conta';

describe('lerEmail', () => {
  it('apara e põe em minúsculas', () => {
    expect(lerEmail('  Joao@Empresa.COM.br ')).toBe('joao@empresa.com.br');
  });
  it('recusa o que não é e-mail', () => {
    for (const v of ['', 'joao', 'joao@', '@empresa.com', 'a b@c.com', 'a@b.c', 42, null, undefined]) expect(lerEmail(v)).toBeNull();
    expect(lerEmail(`${'a'.repeat(250)}@b.com`)).toBeNull();
  });
});

describe('lerCodigo', () => {
  it('6 números, espaços ignorados', () => {
    expect(lerCodigo('123456')).toBe('123456');
    expect(lerCodigo(' 123 456 ')).toBe('123456');
  });
  it('recusa outro tamanho ou letras', () => {
    for (const v of ['12345', '1234567', '12345a', '', 123456, null]) expect(lerCodigo(v)).toBeNull();
  });
});

describe('destinoSeguro', () => {
  it('caminho interno passa', () => {
    expect(destinoSeguro('/radar')).toBe('/radar');
    expect(destinoSeguro('/radar/editar')).toBe('/radar/editar');
    expect(destinoSeguro('/edital/123?x=1')).toBe('/edital/123?x=1');
  });
  it('fora do site, /entrar, /api ou vazio → /radar', () => {
    for (const v of [null, undefined, '', 'https://mal.com', '//mal.com', '/\\mal.com', 'radar', '/entrar', '/entrar?voltar=/x', '/api/conta', '/radar\nSet-Cookie: x']) {
      expect(destinoSeguro(v)).toBe('/radar');
    }
  });
});

describe('mensagens de erro do Supabase Auth', () => {
  it('código errado ou expirado', () => {
    expect(mensagemErroAuth({ code: 'otp_expired', status: 403 })).toBe(MENSAGENS_CONTA.codigoErrado);
    expect(statusErroAuth({ code: 'otp_expired', status: 403 })).toBe(400);
  });
  it('muitas tentativas (limite do Supabase)', () => {
    for (const e of [{ code: 'over_email_send_rate_limit', status: 429 }, { code: 'over_request_rate_limit', status: 429 }, { code: null, status: 429 }]) {
      expect(mensagemErroAuth(e)).toBe(MENSAGENS_CONTA.muitas);
      expect(statusErroAuth(e)).toBe(429);
    }
  });
  it('e-mail inválido', () => {
    expect(mensagemErroAuth({ code: 'email_address_invalid', status: 400 })).toBe(MENSAGENS_CONTA.email);
    expect(mensagemErroAuth({ code: 'validation_failed', status: 400 })).toBe(MENSAGENS_CONTA.email);
    expect(statusErroAuth({ code: 'validation_failed', status: 400 })).toBe(400);
  });
  it('o resto: falha genérica 502', () => {
    expect(mensagemErroAuth({ code: 'sem_chave', status: null })).toBe(MENSAGENS_CONTA.falha);
    expect(statusErroAuth({ code: 'unexpected_failure', status: 500 })).toBe(502);
  });
  it('textos em português', () => {
    expect(MENSAGENS_CONTA).toEqual({
      email: 'Confira o e-mail.',
      codigo: 'Digite os 6 números do código.',
      codigoErrado: 'Código incorreto ou expirado. Confira os 6 números ou peça um novo código.',
      muitas: 'Muitas tentativas. Espere alguns minutos e tente de novo.',
      falha: 'Não foi possível concluir agora. Tente de novo em instantes.',
      entrar: 'Entre para continuar.',
    });
  });
});

describe('reenvio', () => {
  it('60 s depois do envio, arredondando para cima', () => {
    expect(REENVIO_SEGUNDOS).toBe(60);
    expect(segundosParaReenvio(1_000, 1_000)).toBe(60);
    expect(segundosParaReenvio(1_000, 1_500)).toBe(60);
    expect(segundosParaReenvio(1_000, 60_000)).toBe(2);
    expect(segundosParaReenvio(1_000, 61_000)).toBe(0);
    expect(segundosParaReenvio(1_000, 999_000)).toBe(0);
  });
});

describe('cookie de sessão do Supabase', () => {
  it('reconhece sb-<ref>-auth-token, inteiro ou em pedaços', () => {
    expect(temCookieDeSessao(['em_visitante', 'sb-omtwaflypzlebjoeubvp-auth-token'])).toBe(true);
    expect(temCookieDeSessao(['sb-omtwaflypzlebjoeubvp-auth-token.0', 'sb-omtwaflypzlebjoeubvp-auth-token.1'])).toBe(true);
  });
  it('outros cookies não', () => {
    expect(temCookieDeSessao([])).toBe(false);
    expect(temCookieDeSessao(['em_visitante', 'em_interno', 'sb-x-auth-token-code-verifier'])).toBe(false);
  });
  it('opções forçadas: httpOnly, lax, raiz', () => {
    expect(OPCOES_COOKIE_SESSAO).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' });
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run lib/conta.test.ts`
Expected: FAIL (módulo `./conta` não existe).

- [ ] **Step 4: Implementar `lib/conta.ts`**

```ts
import { EMAIL } from './eventos';

/**
 * Regras puras da conta (login por código do Supabase Auth): o que o formulário e as rotas aceitam, para onde voltar
 * depois de entrar e as mensagens de erro em português. Sem rede e sem segredo: o servidor fala com o Supabase em
 * lib/servidor/sessao.ts.
 */

export const DIGITOS_CODIGO = 6;
export const REENVIO_SEGUNDOS = 60;
export const DESTINO_PADRAO = '/radar';

export const MENSAGENS_CONTA = {
  email: 'Confira o e-mail.',
  codigo: 'Digite os 6 números do código.',
  codigoErrado: 'Código incorreto ou expirado. Confira os 6 números ou peça um novo código.',
  muitas: 'Muitas tentativas. Espere alguns minutos e tente de novo.',
  falha: 'Não foi possível concluir agora. Tente de novo em instantes.',
  entrar: 'Entre para continuar.',
} as const;

/** Erro do Supabase Auth reduzido ao que importa (AuthError.code e .status). */
export type ErroAuth = { code: string | null; status: number | null };

/** Cookies da sessão: só o servidor lê (httpOnly), nunca saem para outro site (lax). */
export const OPCOES_COOKIE_SESSAO = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export function lerEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const e = v.trim().toLowerCase();
  return e.length <= 254 && EMAIL.test(e) ? e : null;
}

export function lerCodigo(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const c = v.replace(/\s+/g, '');
  return new RegExp(`^\\d{${DIGITOS_CODIGO}}$`).test(c) ? c : null;
}

/** Para onde ir depois de entrar: só caminho deste site, fora de /entrar e /api; o resto vira /radar. */
export function destinoSeguro(v: string | null | undefined): string {
  if (!v || !v.startsWith('/') || v.startsWith('//') || v.startsWith('/\\') || /[\r\n]/.test(v)) return DESTINO_PADRAO;
  if (v === '/entrar' || v.startsWith('/entrar?') || v.startsWith('/entrar/') || v.startsWith('/api/')) return DESTINO_PADRAO;
  return v.slice(0, 200);
}

const limiteAtingido = (e: ErroAuth) => e.status === 429 || (e.code ?? '').startsWith('over_');

export function mensagemErroAuth(e: ErroAuth): string {
  if (e.code === 'otp_expired') return MENSAGENS_CONTA.codigoErrado;
  if (limiteAtingido(e)) return MENSAGENS_CONTA.muitas;
  if (e.code === 'email_address_invalid' || e.code === 'validation_failed') return MENSAGENS_CONTA.email;
  return MENSAGENS_CONTA.falha;
}

export function statusErroAuth(e: ErroAuth): 400 | 429 | 502 {
  if (limiteAtingido(e)) return 429;
  if (e.code === 'otp_expired' || e.code === 'email_address_invalid' || e.code === 'validation_failed') return 400;
  return 502;
}

/** Segundos até poder pedir outro código (0 = já pode). */
export function segundosParaReenvio(enviadoEm: number, agora: number): number {
  return Math.max(0, Math.ceil((enviadoEm + REENVIO_SEGUNDOS * 1000 - agora) / 1000));
}

/** Cookie da sessão do @supabase/ssr: sb-<ref>-auth-token, às vezes em pedaços (.0, .1). */
const COOKIE_SESSAO = /^sb-[a-z0-9]+-auth-token(\.\d+)?$/;

export function temCookieDeSessao(nomes: readonly string[]): boolean {
  return nomes.some((n) => COOKIE_SESSAO.test(n));
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run lib/conta.test.ts`
Expected: PASS.

- [ ] **Step 6: Testes do servidor de sessão (falhando)**

Crie `lib/servidor/sessao.test.ts`:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

type Opcoes = { cookies: { getAll: () => unknown; setAll: (l: Array<{ name: string; value: string; options: Record<string, unknown> }>) => void } };
const m = vi.hoisted(() => ({
  criados: [] as Array<{ url: string; chave: string; opcoes: Opcoes }>,
  jarro: new Map<string, { value: string; options?: Record<string, unknown> }>(),
  getUser: vi.fn(),
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => [...m.jarro].map(([name, c]) => ({ name, value: c.value })),
    set: (name: string, value: string, options?: Record<string, unknown>) => m.jarro.set(name, { value, options }),
  }),
}));
vi.mock('@supabase/ssr', () => ({
  createServerClient: (url: string, chave: string, opcoes: Opcoes) => {
    m.criados.push({ url, chave, opcoes });
    return { auth: { getUser: m.getUser, signInWithOtp: m.signInWithOtp, verifyOtp: m.verifyOtp, signOut: m.signOut } };
  },
}));

const { entrarComCodigo, enviarCodigo, sair, usuarioAtual } = await import('./sessao');

beforeEach(() => {
  vi.clearAllMocks();
  m.criados.length = 0;
  m.jarro.clear();
  vi.stubEnv('SUPABASE_URL', 'https://omtwaflypzlebjoeubvp.supabase.co');
  vi.stubEnv('SUPABASE_ANON_KEY', 'sb_publishable_teste');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'segredo-que-nao-pode-ir');
  m.getUser.mockResolvedValue({ data: { user: { id: 'u-1', email: 'Dono@Empresa.com.br' } }, error: null });
  m.signInWithOtp.mockResolvedValue({ data: {}, error: null });
  m.verifyOtp.mockResolvedValue({ data: { user: { id: 'u-1', email: 'dono@empresa.com.br' } }, error: null });
  m.signOut.mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe('usuarioAtual', () => {
  it('sem SUPABASE_ANON_KEY: null, sem criar cliente', async () => {
    vi.stubEnv('SUPABASE_ANON_KEY', '');
    expect(await usuarioAtual()).toBeNull();
    expect(m.criados).toHaveLength(0);
  });
  it('usa a chave publicável (nunca a service role) e devolve o usuário do auth.getUser()', async () => {
    const u = await usuarioAtual();
    expect(u).toEqual({ id: 'u-1', email: 'dono@empresa.com.br' });
    expect(m.criados[0].url).toBe('https://omtwaflypzlebjoeubvp.supabase.co');
    expect(m.criados[0].chave).toBe('sb_publishable_teste');
    expect(m.getUser).toHaveBeenCalledTimes(1);
  });
  it('sessão inválida, erro de rede ou usuário sem e-mail: null', async () => {
    m.getUser.mockResolvedValueOnce({ data: { user: null }, error: { code: 'session_not_found', status: 403 } });
    expect(await usuarioAtual()).toBeNull();
    m.getUser.mockRejectedValueOnce(new Error('rede'));
    expect(await usuarioAtual()).toBeNull();
    m.getUser.mockResolvedValueOnce({ data: { user: { id: 'u-2', email: null } }, error: null });
    expect(await usuarioAtual()).toBeNull();
  });
  it('cookies gravados pelo @supabase/ssr saem httpOnly, mantendo o prazo', async () => {
    await usuarioAtual();
    m.criados[0].opcoes.cookies.setAll([{ name: 'sb-omtwaflypzlebjoeubvp-auth-token', value: 'v', options: { maxAge: 100, httpOnly: false } }]);
    expect(m.jarro.get('sb-omtwaflypzlebjoeubvp-auth-token')).toEqual({
      value: 'v',
      options: expect.objectContaining({ maxAge: 100, httpOnly: true, sameSite: 'lax', path: '/' }),
    });
  });
});

describe('código por e-mail', () => {
  it('enviarCodigo pede o código e cria a conta no primeiro acesso', async () => {
    expect(await enviarCodigo('dono@empresa.com.br')).toEqual({ ok: true });
    expect(m.signInWithOtp).toHaveBeenCalledWith({ email: 'dono@empresa.com.br', options: { shouldCreateUser: true } });
  });
  it('enviarCodigo devolve o código e o status do erro do Supabase', async () => {
    m.signInWithOtp.mockResolvedValueOnce({ data: {}, error: { code: 'over_email_send_rate_limit', status: 429, message: 'x' } });
    expect(await enviarCodigo('a@b.co')).toEqual({ ok: false, erro: { code: 'over_email_send_rate_limit', status: 429 } });
  });
  it('enviarCodigo sem chave: falha sem chamar o Supabase', async () => {
    vi.stubEnv('SUPABASE_ANON_KEY', '');
    expect(await enviarCodigo('a@b.co')).toEqual({ ok: false, erro: { code: 'sem_chave', status: null } });
    expect(m.signInWithOtp).not.toHaveBeenCalled();
  });
  it('entrarComCodigo confere o código do tipo e-mail e devolve o usuário', async () => {
    expect(await entrarComCodigo('dono@empresa.com.br', '123456')).toEqual({ ok: true, usuario: { id: 'u-1', email: 'dono@empresa.com.br' } });
    expect(m.verifyOtp).toHaveBeenCalledWith({ email: 'dono@empresa.com.br', token: '123456', type: 'email' });
  });
  it('entrarComCodigo com código errado: erro otp_expired', async () => {
    m.verifyOtp.mockResolvedValueOnce({ data: { user: null }, error: { code: 'otp_expired', status: 403, message: 'x' } });
    expect(await entrarComCodigo('a@b.co', '000000')).toEqual({ ok: false, erro: { code: 'otp_expired', status: 403 } });
  });
  it('sair encerra a sessão', async () => {
    await sair();
    expect(m.signOut).toHaveBeenCalledTimes(1);
  });
});
```

Crie `lib/sessaoProxy.test.ts`:
```ts
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type SetAll = (l: Array<{ name: string; value: string; options: Record<string, unknown> }>, h?: Record<string, string>) => void;
const m = vi.hoisted(() => ({ criados: 0, setAll: null as SetAll | null, getUser: vi.fn() }));
vi.mock('@supabase/ssr', () => ({
  createServerClient: (_u: string, _c: string, o: { cookies: { setAll: SetAll } }) => {
    m.criados++;
    m.setAll = o.cookies.setAll;
    return { auth: { getUser: m.getUser } };
  },
}));

const { renovarSessao } = await import('./sessaoProxy');
const pedido = () => new NextRequest('http://localhost/radar', { headers: { cookie: 'sb-omtwaflypzlebjoeubvp-auth-token=velho' } });

beforeEach(() => {
  m.criados = 0;
  m.getUser.mockReset();
  vi.stubEnv('SUPABASE_URL', 'https://omtwaflypzlebjoeubvp.supabase.co');
  vi.stubEnv('SUPABASE_ANON_KEY', 'sb_publishable_teste');
});
afterEach(() => vi.unstubAllEnvs());

describe('renovarSessao', () => {
  it('sem chave: segue sem falar com o Supabase', async () => {
    vi.stubEnv('SUPABASE_ANON_KEY', '');
    const r = await renovarSessao(pedido());
    expect(r.status).toBe(200);
    expect(m.criados).toBe(0);
  });
  it('confere a sessão e grava os cookies renovados httpOnly na resposta', async () => {
    m.getUser.mockImplementation(async () => {
      m.setAll!([{ name: 'sb-omtwaflypzlebjoeubvp-auth-token', value: 'novo', options: { maxAge: 400, httpOnly: false } }], { 'Cache-Control': 'private, no-store' });
      return { data: { user: { id: 'u-1' } }, error: null };
    });
    const r = await renovarSessao(pedido());
    expect(m.getUser).toHaveBeenCalledTimes(1);
    const c = r.cookies.get('sb-omtwaflypzlebjoeubvp-auth-token');
    expect(c?.value).toBe('novo');
    expect(c?.httpOnly).toBe(true);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
  });
  it('falha do Supabase não derruba a página', async () => {
    m.getUser.mockRejectedValue(new Error('rede'));
    const r = await renovarSessao(pedido());
    expect(r.status).toBe(200);
  });
});
```

Crie `scripts/sessao.test.ts`:
```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

describe('proxy e sessão', () => {
  const proxy = ler('proxy.ts');
  it('o proxy roda nas páginas da conta e do radar', () => {
    for (const rota of ["'/entrar'", "'/radar'", "'/radar/:path*'", "'/api/:path*'"]) expect(proxy).toContain(rota);
  });
  it('só renova a sessão quando há cookie de sessão', () => {
    expect(proxy).toContain('temCookieDeSessao(');
    expect(proxy).toContain('renovarSessao(request)');
  });
  it('a chave publicável está documentada no .env.example', () => {
    expect(ler('.env.example')).toMatch(/^SUPABASE_ANON_KEY=$/m);
  });
});
```

- [ ] **Step 7: Rodar e ver falhar**

Run: `npx vitest run lib/servidor/sessao.test.ts lib/sessaoProxy.test.ts scripts/sessao.test.ts`
Expected: FAIL (módulos `./sessao` e `./sessaoProxy` não existem; proxy sem as rotas novas).

- [ ] **Step 8: Implementar `lib/servidor/sessao.ts`**

```ts
import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { OPCOES_COOKIE_SESSAO, type ErroAuth } from '../conta';

declare const MARCA_SESSAO: unique symbol;
/**
 * Usuário da sessão validada no servidor por auth.getUser() (nunca só o cookie). Só este arquivo cria um `Usuario`:
 * o id que lib/servidor/conta.ts usa para filtrar perfil e radar nunca vem do navegador.
 */
export type Usuario = { readonly id: string; readonly email: string; readonly [MARCA_SESSAO]: true };

type Env = { url: string; chave: string };

/** Auth com a chave publicável (SUPABASE_ANON_KEY), só no servidor. A service role continua só para os dados. */
function envAuth(): Env | null {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_ANON_KEY;
  return url && chave ? { url, chave } : null;
}

async function clienteAuth(env: Env) {
  const jarro = await cookies();
  return createServerClient(env.url, env.chave, {
    cookies: {
      getAll: () => jarro.getAll(),
      setAll: (lista) => {
        try {
          for (const { name, value, options } of lista) jarro.set(name, value, { ...options, ...OPCOES_COOKIE_SESSAO });
        } catch {
          // Componente de servidor não grava cookie; o proxy (lib/sessaoProxy.ts) renova a sessão antes da página.
        }
      },
    },
  });
}

function paraUsuario(u: { id?: string | null; email?: string | null } | null | undefined): Usuario | null {
  return u?.id && u.email ? ({ id: u.id, email: u.email.toLowerCase() } as Usuario) : null;
}

const erroDe = (e: { code?: string | null; status?: number | null } | null | undefined): ErroAuth => ({
  code: e?.code ?? null,
  status: e?.status ?? null,
});
const SEM_CHAVE: ErroAuth = { code: 'sem_chave', status: null };

/** Usuário da sessão, conferido no Supabase Auth a cada chamada. null = sem sessão (ou Auth fora do ar). */
export async function usuarioAtual(): Promise<Usuario | null> {
  const env = envAuth();
  if (!env) return null;
  try {
    const { data, error } = await (await clienteAuth(env)).auth.getUser();
    if (error) return null;
    return paraUsuario(data.user);
  } catch (erro) {
    console.error('sessão:', erro);
    return null;
  }
}

/** Manda o código de 6 dígitos por e-mail (modelo "Magic Link"/"Confirm signup" com {{ .Token }}); cria a conta se for nova. */
export async function enviarCodigo(email: string): Promise<{ ok: true } | { ok: false; erro: ErroAuth }> {
  const env = envAuth();
  if (!env) {
    console.error('SUPABASE_ANON_KEY ausente: login desligado');
    return { ok: false, erro: SEM_CHAVE };
  }
  const { error } = await (await clienteAuth(env)).auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  return error ? { ok: false, erro: erroDe(error) } : { ok: true };
}

/** Confere o código; certo, o @supabase/ssr grava a sessão nos cookies (httpOnly) desta resposta. */
export async function entrarComCodigo(
  email: string,
  codigo: string,
): Promise<{ ok: true; usuario: Usuario } | { ok: false; erro: ErroAuth }> {
  const env = envAuth();
  if (!env) return { ok: false, erro: SEM_CHAVE };
  const { data, error } = await (await clienteAuth(env)).auth.verifyOtp({ email, token: codigo, type: 'email' });
  const usuario = paraUsuario(data?.user);
  if (error || !usuario) return { ok: false, erro: erroDe(error) };
  return { ok: true, usuario };
}

export async function sair(): Promise<void> {
  const env = envAuth();
  if (!env) return;
  await (await clienteAuth(env)).auth.signOut();
}
```

- [ ] **Step 9: Implementar `lib/sessaoProxy.ts` e o `proxy.ts`**

Crie `lib/sessaoProxy.ts`:
```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { OPCOES_COOKIE_SESSAO } from './conta';

/**
 * Renova a sessão do Supabase Auth antes da página ou rota (padrão do @supabase/ssr): auth.getUser() troca o token
 * vencido e os cookies novos vão na requisição (a página já lê) e na resposta (o navegador guarda), sempre httpOnly.
 * Sem SUPABASE_ANON_KEY ou com o Auth fora do ar, segue sem renovar.
 */
export async function renovarSessao(request: NextRequest): Promise<NextResponse> {
  let resposta = NextResponse.next({ request: { headers: request.headers } });
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_ANON_KEY;
  if (!url || !chave) return resposta;
  const sb = createServerClient(url, chave, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista, cabecalhos?: Record<string, string>) => {
        for (const { name, value } of lista) request.cookies.set(name, value);
        resposta = NextResponse.next({ request: { headers: request.headers } });
        for (const { name, value, options } of lista) resposta.cookies.set(name, value, { ...options, ...OPCOES_COOKIE_SESSAO });
        for (const [nome, valor] of Object.entries(cabecalhos ?? {})) resposta.headers.set(nome, valor);
      },
    },
  });
  try {
    await sb.auth.getUser();
  } catch (erro) {
    console.error('renovar sessão:', erro);
  }
  return resposta;
}
```

Troque `proxy.ts` inteiro por:
```ts
import { NextResponse, type NextRequest } from 'next/server';
import { temCookieDeSessao } from '@/lib/conta';
import { renovarSessao } from '@/lib/sessaoProxy';
import { COOKIE_VISITANTE, OPCOES_COOKIE, visitanteDoCookie } from '@/lib/visitante';

/**
 * 1. Garante o cookie em_visitante antes das páginas e rotas que contam o uso do dia. A página inicial e a do edital são
 *    componentes de servidor (não gravam cookie), e na primeira visita /api/busca e /api/mapa chegam juntas (sem isto,
 *    cada uma criaria um visitante). O cookie novo vai na resposta e na própria requisição (o cookies() da página já o lê).
 * 2. Com cookie de sessão do Supabase (sb-…-auth-token), renova a sessão (lib/sessaoProxy.ts). Sem ele, nada de rede.
 */
export async function proxy(request: NextRequest) {
  const { visitante, novo } = visitanteDoCookie(request.cookies.get(COOKIE_VISITANTE)?.value, () => crypto.randomUUID());
  if (novo) request.cookies.set(COOKIE_VISITANTE, visitante);
  const comSessao = temCookieDeSessao(request.cookies.getAll().map((c) => c.name));
  if (!novo && !comSessao) return NextResponse.next();
  const resposta = comSessao ? await renovarSessao(request) : NextResponse.next({ request: { headers: request.headers } });
  if (novo) resposta.cookies.set(COOKIE_VISITANTE, visitante, OPCOES_COOKIE);
  return resposta;
}

export const config = {
  matcher: ['/', '/edital/:path*', '/planos', '/alertas', '/sobre', '/entrar', '/radar', '/radar/:path*', '/api/:path*'],
};
```

Em `.env.example`, logo depois da linha `SUPABASE_SERVICE_ROLE_KEY=`, acrescente:
```
# Chave publicável (anon) do projeto: só o servidor usa, para o login por código (Supabase Auth).
SUPABASE_ANON_KEY=
```

- [ ] **Step 10: Rodar e ver passar**

Run: `npx vitest run lib/conta.test.ts lib/servidor/sessao.test.ts lib/sessaoProxy.test.ts scripts/sessao.test.ts`
Expected: PASS.

- [ ] **Step 11: Verificação completa e commit**

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa (o build lista `ƒ Proxy (Middleware)`).
```bash
git add package.json package-lock.json .env.example lib/eventos.ts lib/conta.ts lib/conta.test.ts lib/servidor/sessao.ts lib/servidor/sessao.test.ts lib/sessaoProxy.ts lib/sessaoProxy.test.ts proxy.ts scripts/sessao.test.ts
git commit -m "feat: sessão do Supabase Auth no servidor e no proxy" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 2: /entrar (código por e-mail) e menu da conta

**Files:**
- Create: `app/api/conta/route.ts`, `app/api/conta/codigo/route.ts`, `app/api/conta/entrar/route.ts`, `app/api/conta/sair/route.ts`, `lib/cliente/conta.ts`, `app/entrar/page.tsx`, `components/conta/FormEntrar.tsx`, `components/conta/MenuConta.tsx`
- Modify: `components/Cabecalho.tsx`
- Test: `app/api/conta/rotas.test.ts`, `lib/cliente/conta.test.ts`

**Interfaces:**
- Consumes: Task 1 (`usuarioAtual`, `enviarCodigo`, `entrarComCodigo`, `sair`, `lerEmail`, `lerCodigo`, `destinoSeguro`, `MENSAGENS_CONTA`, `mensagemErroAuth`, `statusErroAuth`, `segundosParaReenvio`, `DIGITOS_CODIGO`); `SEM_CACHE` (`lib/http.ts`).
- Produces:
  - `GET /api/conta` → `200 { email: string | null }` (sem cache).
  - `POST /api/conta/codigo` `{ email }` → `200 { ok: true }` | `400/429/502 { erro }`.
  - `POST /api/conta/entrar` `{ email, codigo, destino? }` → `200 { destino }` | `400/429/502 { erro }`.
  - `POST /api/conta/sair` → `204`.
  - `lib/cliente/conta.ts`: `lerConta(): Promise<string | null>`, `esquecerConta(): void`, `type EstadoConta = { carregando: true; email: null } | { carregando: false; email: string | null }`, `useConta(): EstadoConta`.
  - `<FormEntrar destino={string} />`, `<MenuConta />`.

- [ ] **Step 1: Escrever os testes (falhando)**

Crie `app/api/conta/rotas.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MENSAGENS_CONTA } from '@/lib/conta';

const m = vi.hoisted(() => ({
  usuario: null as null | { id: string; email: string },
  enviarCodigo: vi.fn(),
  entrarComCodigo: vi.fn(),
  sair: vi.fn(),
}));
vi.mock('@/lib/servidor/sessao', () => ({
  usuarioAtual: async () => m.usuario,
  enviarCodigo: m.enviarCodigo,
  entrarComCodigo: m.entrarComCodigo,
  sair: m.sair,
}));

const conta = await import('./route');
const codigo = await import('./codigo/route');
const entrar = await import('./entrar/route');
const sairRota = await import('./sair/route');

const post = (corpo: unknown) =>
  new Request('http://localhost/api/conta/x', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
  });

beforeEach(() => {
  vi.clearAllMocks();
  m.usuario = null;
  m.enviarCodigo.mockResolvedValue({ ok: true });
  m.entrarComCodigo.mockResolvedValue({ ok: true, usuario: { id: 'u-1', email: 'dono@empresa.com.br' } });
  m.sair.mockResolvedValue(undefined);
});

describe('GET /api/conta', () => {
  it('sem sessão: email nulo, sem cache', async () => {
    const r = await conta.GET();
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
    expect(await r.json()).toEqual({ email: null });
  });
  it('com sessão: só o e-mail (nunca o id)', async () => {
    m.usuario = { id: 'u-1', email: 'dono@empresa.com.br' };
    expect(await (await conta.GET()).json()).toEqual({ email: 'dono@empresa.com.br' });
  });
});

describe('POST /api/conta/codigo', () => {
  it('e-mail válido: pede o código ao Supabase', async () => {
    const r = await codigo.POST(post({ email: ' Dono@Empresa.com.br ' }));
    expect(r.status).toBe(200);
    expect(m.enviarCodigo).toHaveBeenCalledWith('dono@empresa.com.br');
  });
  it('e-mail ruim ou JSON inválido: 400 sem chamar o Supabase', async () => {
    const r = await codigo.POST(post({ email: 'x' }));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ erro: MENSAGENS_CONTA.email });
    expect((await codigo.POST(post('{nao-json'))).status).toBe(400);
    expect(m.enviarCodigo).not.toHaveBeenCalled();
  });
  it('limite do Supabase: 429 com a mensagem em português', async () => {
    m.enviarCodigo.mockResolvedValue({ ok: false, erro: { code: 'over_email_send_rate_limit', status: 429 } });
    const r = await codigo.POST(post({ email: 'a@b.co' }));
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ erro: MENSAGENS_CONTA.muitas });
  });
});

describe('POST /api/conta/entrar', () => {
  it('código certo: devolve o destino seguro', async () => {
    const r = await entrar.POST(post({ email: 'dono@empresa.com.br', codigo: '123456', destino: '/radar/editar' }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ destino: '/radar/editar' });
    expect(m.entrarComCodigo).toHaveBeenCalledWith('dono@empresa.com.br', '123456');
  });
  it('destino de fora do site vira /radar', async () => {
    const r = await entrar.POST(post({ email: 'a@b.co', codigo: '123456', destino: 'https://mal.com' }));
    expect(await r.json()).toEqual({ destino: '/radar' });
  });
  it('código mal digitado: 400 sem chamar o Supabase', async () => {
    const r = await entrar.POST(post({ email: 'a@b.co', codigo: '12a' }));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ erro: MENSAGENS_CONTA.codigo });
    expect(m.entrarComCodigo).not.toHaveBeenCalled();
  });
  it('código errado ou expirado: 400 com a mensagem', async () => {
    m.entrarComCodigo.mockResolvedValue({ ok: false, erro: { code: 'otp_expired', status: 403 } });
    const r = await entrar.POST(post({ email: 'a@b.co', codigo: '000000' }));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ erro: MENSAGENS_CONTA.codigoErrado });
  });
});

describe('POST /api/conta/sair', () => {
  it('encerra a sessão: 204', async () => {
    const r = await sairRota.POST();
    expect(r.status).toBe(204);
    expect(m.sair).toHaveBeenCalledTimes(1);
  });
});
```

Crie `lib/cliente/conta.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { esquecerConta, lerConta } from './conta';

afterEach(() => {
  vi.unstubAllGlobals();
  esquecerConta();
});

describe('lerConta', () => {
  it('um pedido só por carga, sem cache do navegador', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ email: 'dono@empresa.com.br' })));
    vi.stubGlobal('fetch', f);
    expect(await lerConta()).toBe('dono@empresa.com.br');
    expect(await lerConta()).toBe('dono@empresa.com.br');
    expect(f).toHaveBeenCalledTimes(1);
    expect(f).toHaveBeenCalledWith('/api/conta', { cache: 'no-store' });
  });
  it('sem sessão, erro ou rede fora: null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ email: null }))));
    expect(await lerConta()).toBeNull();
    esquecerConta();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 502 })));
    expect(await lerConta()).toBeNull();
    esquecerConta();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('rede'); }));
    expect(await lerConta()).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run app/api/conta/rotas.test.ts lib/cliente/conta.test.ts`
Expected: FAIL (rotas e `lib/cliente/conta.ts` não existem).

- [ ] **Step 3: Implementar as rotas**

`app/api/conta/route.ts`:
```ts
import { SEM_CACHE } from '@/lib/http';
import { usuarioAtual } from '@/lib/servidor/sessao';

/** Quem está entrado neste navegador (menu da conta). Só o e-mail; o id fica no servidor. */
export async function GET() {
  const usuario = await usuarioAtual();
  return Response.json({ email: usuario?.email ?? null }, { headers: SEM_CACHE });
}
```

`app/api/conta/codigo/route.ts`:
```ts
import { lerEmail, MENSAGENS_CONTA, mensagemErroAuth, statusErroAuth } from '@/lib/conta';
import { SEM_CACHE } from '@/lib/http';
import { enviarCodigo } from '@/lib/servidor/sessao';

/** Pede ao Supabase Auth o código de 6 dígitos (e-mail pelo Resend). Primeiro acesso cria a conta. */
export async function POST(request: Request) {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: MENSAGENS_CONTA.email }, { status: 400, headers: SEM_CACHE });
  }
  const email = lerEmail((corpo as { email?: unknown } | null)?.email);
  if (!email) return Response.json({ erro: MENSAGENS_CONTA.email }, { status: 400, headers: SEM_CACHE });
  try {
    const r = await enviarCodigo(email);
    if (!r.ok) {
      if (statusErroAuth(r.erro) === 502) console.error('enviar código:', r.erro);
      return Response.json({ erro: mensagemErroAuth(r.erro) }, { status: statusErroAuth(r.erro), headers: SEM_CACHE });
    }
    return Response.json({ ok: true }, { headers: SEM_CACHE });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: MENSAGENS_CONTA.falha }, { status: 502, headers: SEM_CACHE });
  }
}
```

`app/api/conta/entrar/route.ts`:
```ts
import { destinoSeguro, lerCodigo, lerEmail, MENSAGENS_CONTA, mensagemErroAuth, statusErroAuth } from '@/lib/conta';
import { SEM_CACHE } from '@/lib/http';
import { entrarComCodigo } from '@/lib/servidor/sessao';

/** Confere o código; certo, a sessão vai nos cookies httpOnly desta resposta e o navegador segue para o destino. */
export async function POST(request: Request) {
  let corpo: Record<string, unknown>;
  try {
    corpo = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ erro: MENSAGENS_CONTA.codigo }, { status: 400, headers: SEM_CACHE });
  }
  const email = lerEmail(corpo?.email);
  if (!email) return Response.json({ erro: MENSAGENS_CONTA.email }, { status: 400, headers: SEM_CACHE });
  const codigo = lerCodigo(corpo.codigo);
  if (!codigo) return Response.json({ erro: MENSAGENS_CONTA.codigo }, { status: 400, headers: SEM_CACHE });
  try {
    const r = await entrarComCodigo(email, codigo);
    if (!r.ok) {
      if (statusErroAuth(r.erro) === 502) console.error('entrar:', r.erro);
      return Response.json({ erro: mensagemErroAuth(r.erro) }, { status: statusErroAuth(r.erro), headers: SEM_CACHE });
    }
    return Response.json({ destino: destinoSeguro(typeof corpo.destino === 'string' ? corpo.destino : null) }, { headers: SEM_CACHE });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: MENSAGENS_CONTA.falha }, { status: 502, headers: SEM_CACHE });
  }
}
```

`app/api/conta/sair/route.ts`:
```ts
import { SEM_CACHE } from '@/lib/http';
import { sair } from '@/lib/servidor/sessao';

/** Sai da conta (apaga os cookies da sessão). Falha do Auth não impede: os cookies saem do mesmo jeito. */
export async function POST() {
  try {
    await sair();
  } catch (erro) {
    console.error('sair:', erro);
  }
  return new Response(null, { status: 204, headers: SEM_CACHE });
}
```

`lib/cliente/conta.ts`:
```ts
import { useEffect, useState } from 'react';

/** E-mail da conta deste navegador (ou null), perguntado ao servidor uma vez por carga de página. */
let pedido: Promise<string | null> | null = null;

export function lerConta(): Promise<string | null> {
  pedido ??= fetch('/api/conta', { cache: 'no-store' })
    .then((r) => (r.ok ? (r.json() as Promise<{ email?: unknown }>) : { email: null }))
    .then((c) => (typeof c.email === 'string' ? c.email : null))
    .catch(() => null);
  return pedido;
}

/** Depois de sair (e nos testes): o próximo lerConta pergunta de novo. */
export function esquecerConta(): void {
  pedido = null;
}

export type EstadoConta = { carregando: true; email: null } | { carregando: false; email: string | null };

export function useConta(): EstadoConta {
  const [estado, setEstado] = useState<EstadoConta>({ carregando: true, email: null });
  useEffect(() => {
    let ativo = true;
    void lerConta().then((email) => {
      if (ativo) setEstado({ carregando: false, email });
    });
    return () => {
      ativo = false;
    };
  }, []);
  return estado;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run app/api/conta/rotas.test.ts lib/cliente/conta.test.ts`
Expected: PASS.

- [ ] **Step 5: Página /entrar e formulário**

`components/conta/FormEntrar.tsx`:
```tsx
'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { DIGITOS_CODIGO, lerCodigo, lerEmail, MENSAGENS_CONTA, segundosParaReenvio } from '@/lib/conta';

const CAMPO = 'h-12 w-full rounded-sm border border-line-strong bg-raised px-3 text-[16px]';
const PRINCIPAL = 'inline-flex h-12 w-full items-center justify-center rounded-sm bg-pin px-5 text-[15px] font-semibold text-on-pin aria-disabled:opacity-60';
const LINK = 'text-sm font-semibold text-pin-strong underline-offset-2 hover:underline aria-disabled:cursor-default aria-disabled:text-ink-muted aria-disabled:no-underline';

async function postar(caminho: string, corpo: unknown): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const r = await fetch(caminho, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
    return { ok: r.ok, dados: (await r.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, dados: { erro: MENSAGENS_CONTA.falha } };
  }
}

const erroDe = (d: Record<string, unknown>) => (typeof d.erro === 'string' ? d.erro : MENSAGENS_CONTA.falha);

/** Login por código: e-mail → "Enviar código" → código de 6 números → entra. Reenvio liberado depois de 60 s. */
export function FormEntrar({ destino }: { destino: string }) {
  const [etapa, setEtapa] = useState<'email' | 'codigo'>('email');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [enviadoEm, setEnviadoEm] = useState<number | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const campoCodigo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (enviadoEm === null) return;
    const t = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [enviadoEm]);
  useEffect(() => {
    if (etapa === 'codigo') campoCodigo.current?.focus();
  }, [etapa]);

  const espera = enviadoEm === null ? 0 : segundosParaReenvio(enviadoEm, agora);

  async function enviar(e?: FormEvent) {
    e?.preventDefault();
    if (ocupado) return;
    const valido = lerEmail(email);
    if (!valido) {
      setErro(MENSAGENS_CONTA.email);
      return;
    }
    setOcupado(true);
    setErro(null);
    const r = await postar('/api/conta/codigo', { email: valido });
    setOcupado(false);
    if (!r.ok) {
      setErro(erroDe(r.dados));
      return;
    }
    const t = Date.now();
    setEnviadoEm(t);
    setAgora(t);
    setCodigo('');
    setEtapa('codigo');
  }

  async function entrar(e: FormEvent) {
    e.preventDefault();
    if (ocupado) return;
    const c = lerCodigo(codigo);
    if (!c) {
      setErro(MENSAGENS_CONTA.codigo);
      return;
    }
    setOcupado(true);
    setErro(null);
    const r = await postar('/api/conta/entrar', { email: lerEmail(email), codigo: c, destino });
    if (!r.ok) {
      setOcupado(false);
      setErro(erroDe(r.dados));
      return;
    }
    // Carga completa: o cabeçalho e as páginas leem a sessão nova.
    window.location.assign(typeof r.dados.destino === 'string' ? r.dados.destino : destino);
  }

  const aviso = erro ? (
    <p role="alert" className="text-sm font-semibold text-pin-strong">
      {erro}
    </p>
  ) : null;

  if (etapa === 'email') {
    return (
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">Entrar no Edital Map</h1>
        <p className="text-[15px] text-ink-muted">
          Digite seu e-mail. Enviamos um código de {DIGITOS_CODIGO} números para você entrar, sem senha. Se for a primeira vez, a conta é criada na hora.
        </p>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          E-mail
          <input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={CAMPO} />
        </label>
        {aviso}
        <button type="submit" aria-disabled={ocupado || undefined} className={PRINCIPAL}>
          {ocupado ? 'Enviando…' : 'Enviar código'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={entrar} className="flex flex-col gap-4" noValidate>
      <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">Digite o código</h1>
      <p className="text-[15px] text-ink-muted">
        Enviamos um código de {DIGITOS_CODIGO} números para <strong className="text-ink">{lerEmail(email)}</strong>. Confira também a caixa de spam.
      </p>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Código
        <input
          ref={campoCodigo}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={DIGITOS_CODIGO + 2}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/[^\d ]/g, ''))}
          className={`${CAMPO} font-mono text-[22px] tracking-[0.3em]`}
        />
      </label>
      {aviso}
      <button type="submit" aria-disabled={ocupado || undefined} className={PRINCIPAL}>
        {ocupado ? 'Entrando…' : 'Entrar'}
      </button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => (espera === 0 ? void enviar() : undefined)} aria-disabled={espera > 0 || ocupado || undefined} className={LINK}>
          {espera > 0 ? `Reenviar código em ${espera} s` : 'Reenviar código'}
        </button>
        <button
          type="button"
          onClick={() => {
            setEtapa('email');
            setErro(null);
          }}
          className={LINK}
        >
          Trocar e-mail
        </button>
      </div>
    </form>
  );
}
```

`app/entrar/page.tsx`:
```tsx
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { FormEntrar } from '@/components/conta/FormEntrar';
import { destinoSeguro } from '@/lib/conta';
import { usuarioAtual } from '@/lib/servidor/sessao';

export const metadata: Metadata = { title: 'Entrar' };

type Props = { searchParams: Promise<{ voltar?: string | string[] }> };

/** Login por código. Já entrado: segue direto para o destino (?voltar=, ou /radar). */
export default async function Entrar({ searchParams }: Props) {
  await connection();
  const { voltar } = await searchParams;
  const destino = destinoSeguro(typeof voltar === 'string' ? voltar : null);
  if (await usuarioAtual()) redirect(destino);
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[440px] flex-col gap-6 px-4 py-10">
        <FormEntrar destino={destino} />
      </main>
    </>
  );
}
```

- [ ] **Step 6: Menu da conta no cabeçalho**

`components/conta/MenuConta.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { esquecerConta, useConta } from '@/lib/cliente/conta';

const ITEM = 'flex h-11 w-full items-center rounded-sm px-3 text-left text-sm font-semibold hover:bg-sunken';

/** "Entrar" sem sessão; com sessão, o menu da conta (e-mail, Meu Radar, Editar meu radar, Sair). */
export function MenuConta() {
  const conta = useConta();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const clique = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false);
    };
    document.addEventListener('mousedown', clique);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', clique);
      document.removeEventListener('keydown', tecla);
    };
  }, [aberto]);

  async function sairDaConta() {
    await fetch('/api/conta/sair', { method: 'POST' }).catch(() => undefined);
    esquecerConta();
    window.location.assign('/');
  }

  if (conta.carregando) return <span className="inline-block h-9 w-16" aria-hidden="true" />;
  if (!conta.email) {
    return (
      <Link href="/entrar" className="inline-flex h-9 shrink-0 items-center rounded-sm px-2.5 text-[13px] font-semibold text-ink hover:bg-sunken lg:h-10 lg:px-3 lg:text-sm">
        Entrar
      </Link>
    );
  }
  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        aria-label={`Conta ${conta.email}`}
        className="inline-flex h-9 items-center gap-2 rounded-sm px-1.5 text-sm font-semibold hover:bg-sunken lg:h-10 lg:px-2"
      >
        <span aria-hidden="true" className="inline-flex size-7 items-center justify-center rounded-full bg-pin-soft font-mono text-[13px] text-pin-strong">
          {conta.email.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-[12rem] truncate lg:inline">{conta.email}</span>
      </button>
      {aberto ? (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 flex w-64 flex-col rounded-md border border-line bg-raised p-1">
          <p className="truncate px-3 py-2 text-xs text-ink-muted">{conta.email}</p>
          <Link role="menuitem" href="/radar" className={ITEM} onClick={() => setAberto(false)}>
            Meu Radar
          </Link>
          <Link role="menuitem" href="/radar/editar" className={ITEM} onClick={() => setAberto(false)}>
            Editar meu radar
          </Link>
          <button role="menuitem" type="button" onClick={() => void sairDaConta()} className={ITEM}>
            Sair
          </button>
        </div>
      ) : null}
    </div>
  );
}
```

Em `components/Cabecalho.tsx`:
1. Acrescente `import { MenuConta } from './conta/MenuConta';` depois de `import { FaixaPlano } from './FaixaPlano';`.
2. Dentro de `<div className="ml-auto flex min-w-0 items-center gap-2 lg:gap-3">`, logo depois do `<Link href="/sobre" …>Sobre</Link>`, acrescente `<MenuConta />` (antes do botão "Assinar").
3. No comentário do componente, troque `Computador: logo, abas (Mapa, Alertas, Planos), Sobre e "Assinar Pro". Celular: logo e "Assinar"` por `Computador: logo, abas (Mapa, Alertas, Planos), Sobre, conta e "Assinar Pro". Celular: logo, conta e "Assinar"`.

- [ ] **Step 7: Verificação completa e commit**

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa; o build lista `ƒ /entrar`, `ƒ /api/conta`, `ƒ /api/conta/codigo`, `ƒ /api/conta/entrar`, `ƒ /api/conta/sair`.
```bash
git add app/api/conta lib/cliente/conta.ts lib/cliente/conta.test.ts app/entrar components/conta components/Cabecalho.tsx
git commit -m "feat: entrar com código por e-mail e menu da conta" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 3: Migração `0014` (conta e radar), guardas e conferências

**Files:**
- Create: `supabase/migrations/0014_conta_radar.sql`, `docs/evolucao-fase-3.sql`, `supabase/templates/codigo.html`
- Modify: `lib/eventos.ts` (`TIPOS_EVENTO_CONTA`), `scripts/migracoes.test.ts`, `scripts/sessao.test.ts` (guarda do modelo)

**Interfaces:**
- Consumes: 0011 (`em_aberto`, `consulta_termos`, `termos_da_busca`, `consulta_frase`, `acertos_busca`, corpo de `abertas_unicas` e `buscar_editais`); `TIPOS_EVENTO`, `TIPOS_EVENTO_SERVIDOR`.
- Produces (contrato TS↔SQL usado nas Tasks 5–7):
  - `public.abertas_unicas(p_tq tsquery, p_tq_excluir tsquery, p_ufs text[], p_valor_min numeric, p_modalidades int[], p_orgao text, p_ibge text, p_raio_km int, p_dias int, p_ibges text[], p_valor_max numeric, p_so_me_epp boolean)` (os 3 últimos com padrão nulo).
  - `public.buscar_editais(...0011..., p_ibges text[] default null, p_valor_max numeric default null, p_so_me_epp boolean default null)`, mesmas colunas da 0011.
  - `public.radar_contagens(p_termos text[], p_relacionados text[], p_excluir text[], p_ufs text[], p_ibges text[], p_valor_min numeric, p_valor_max numeric, p_modalidades int[], p_so_me_epp boolean, p_desde timestamptz) returns table (total bigint, novas bigint, prazo_proximo bigint)`.
  - `public.exclusivo_me_epp(jsonb) returns boolean`; `public.buscar_municipios(q text, p_limite int default 10) returns table (codigo_ibge text, nome text, uf text)`.
  - Colunas: `perfis.ultima_visita_radar`, `perfis.plano in ('gratis','basic','pro')`; `radares.municipios text[]`, `radares.valor_max numeric(16,2)`, `radares.so_me_epp boolean`, `radares.atualizado_em timestamptz`; índice único `radares_user_id_key`.
  - `lib/eventos.ts`: `TIPOS_EVENTO_CONTA = ['conta_entrou', 'onboarding_iniciado', 'onboarding_concluido', 'radar_visto'] as const`, `type TipoEventoConta`.

- [ ] **Step 1: Tipos de evento da conta**

Em `lib/eventos.ts`, logo depois de `export type TipoEventoServidor = …;`, acrescente:
```ts
/** Eventos da conta (Evolução, Fase 3), gravados só pelo servidor, sem e-mail no detalhe. */
export const TIPOS_EVENTO_CONTA = ['conta_entrou', 'onboarding_iniciado', 'onboarding_concluido', 'radar_visto'] as const;
export type TipoEventoConta = (typeof TIPOS_EVENTO_CONTA)[number];
```

- [ ] **Step 2: Escrever as guardas (falhando)**

Em `scripts/migracoes.test.ts`, troque a primeira linha de imports de `../lib/eventos` por `import { TIPOS_EVENTO, TIPOS_EVENTO_CONTA, TIPOS_EVENTO_SERVIDOR } from '../lib/eventos';` e acrescente, antes de `function corpoDe(`:
```ts
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
    for (const t of [...antes, ...TIPOS_EVENTO, ...TIPOS_EVENTO_SERVIDOR, ...TIPOS_EVENTO_CONTA]) expect(depois).toContain(t);
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
```

Em `scripts/sessao.test.ts`, acrescente no fim:
```ts
describe('modelo do e-mail do código', () => {
  const html = ler('supabase/templates/codigo.html');
  it('mostra o código, em português, sem link de login', () => {
    expect(html).toContain('{{ .Token }}');
    expect(html).toContain('lang="pt-BR"');
    expect(html).toContain('Use este código para entrar no Edital Map');
    expect(html).not.toContain('ConfirmationURL');
    expect(html).not.toContain('TokenHash');
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run scripts/migracoes.test.ts scripts/sessao.test.ts`
Expected: FAIL (arquivos 0014 e `codigo.html` não existem).

- [ ] **Step 4: Escrever a migração**

Crie `supabase/migrations/0014_conta_radar.sql`. Os corpos de `abertas_unicas` e `buscar_editais` são **cópia literal** dos da 0011 (mesmas linhas, mesmo recuo), mudando só o que está marcado; a guarda compara os dois.
```sql
-- Edital Map · Evolução · Fase 3 · Conta, onboarding e Meu Radar (0014).
-- 1. perfis: plano gratis | basic | pro (sem dados existentes) e a última visita ao Meu Radar.
-- 2. radares (um por conta): municípios (IBGE), valor máximo, só ME/EPP, atualizado_em, checagens e índice único por user_id.
-- 3. Dados da conta só pelo servidor (service_role, sempre filtrando pelo user_id da sessão validada em
--    lib/servidor/sessao.ts): as políticas da 0001 saem e anon/authenticated perdem o acesso às tabelas.
-- 4. abertas_unicas e buscar_editais ganham p_ibges, p_valor_max e p_so_me_epp (padrão nulo: as chamadas de hoje e
--    mapa_editais, que passa os 9 primeiros argumentos, seguem valendo). Corpos iguais aos da 0011 fora isso
--    (guarda em scripts/migracoes.test.ts).
-- 5. radar_contagens (os cartões do Meu Radar numa passada), exclusivo_me_epp (regra da etiqueta "Exclusivo ME/EPP"
--    do edital) e buscar_municipios (onboarding).
-- 6. Eventos da conta em eventos_tipo_check (lib/eventos.ts, TIPOS_EVENTO_CONTA).
-- Ordem: esta migração → conferências (docs/evolucao-fase-3.sql) → vercel deploy --prod. Aplicar com npm run db:aplicar.

set local lock_timeout = '10s';

-- 1. Perfil
alter table public.perfis drop constraint perfis_plano_check;
alter table public.perfis add constraint perfis_plano_check check (plano in ('gratis', 'basic', 'pro'));
alter table public.perfis add column ultima_visita_radar timestamptz;

-- 2. Radar
alter table public.radares
  add column municipios text[] not null default '{}',
  add column valor_max numeric(16,2),
  add column so_me_epp boolean not null default false,
  add column atualizado_em timestamptz not null default now();
alter table public.radares
  add constraint radares_termos_check check (cardinality(termos) between 1 and 10),
  add constraint radares_excluir_check check (cardinality(termos_excluir) <= 10),
  add constraint radares_ufs_check check (cardinality(ufs) <= 27),
  add constraint radares_municipios_check check (cardinality(municipios) <= 50),
  add constraint radares_local_check check (cardinality(ufs) = 0 or cardinality(municipios) = 0),
  add constraint radares_valor_check check ((valor_min is null or valor_min >= 0) and (valor_max is null or valor_max >= 0)),
  add constraint radares_faixa_check check (valor_min is null or valor_max is null or valor_min <= valor_max);
create unique index radares_user_id_key on public.radares (user_id);

-- 3. Só o servidor lê e grava os dados da conta.
drop policy "perfil próprio" on public.perfis;
drop policy "radares próprios" on public.radares;
drop policy "salvos próprios" on public.salvos;
alter table public.perfis enable row level security;
alter table public.radares enable row level security;
alter table public.salvos enable row level security;
alter table public.alertas_enviados enable row level security;
revoke all on table public.perfis from public, anon, authenticated;
revoke all on table public.radares from public, anon, authenticated;
revoke all on table public.salvos from public, anon, authenticated;
revoke all on table public.alertas_enviados from public, anon, authenticated;
grant select, insert, update, delete on table public.perfis to service_role;
grant select, insert, update, delete on table public.radares to service_role;
grant select, insert, update, delete on table public.salvos to service_role;
grant select, insert, update, delete on table public.alertas_enviados to service_role;

-- 4. Assinaturas antigas saem antes (parâmetros novos mudam a identidade da função).
drop function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text);
drop function public.abertas_unicas(tsquery, tsquery, text[], numeric, int[], text, text, int, int);

-- Exclusivo para ME/EPP: todos os itens com benefício 1 (a mesma regra da etiqueta do edital). Sem resumo: false.
create function public.exclusivo_me_epp(p_resumo jsonb)
returns boolean language sql immutable parallel safe as $$
  select coalesce((p_resumo ->> 'total')::int, 0) > 0
     and coalesce((p_resumo ->> 'exclusivos')::int, 0) = (p_resumo ->> 'total')::int
$$;

-- Abertas sem duplicadas, com todos os filtros da busca: lista, mapa, contagem e exportação passam por aqui.
-- p_tq: termos digitados e relacionados ("qualquer um"), no objeto ou nas palavras dos itens; p_tq_excluir: sai quem
-- tem um termo excluído no objeto. Município: só ele; com p_raio_km, todos cuja sede está dentro do raio.
-- p_dias conta dias de calendário de Brasília (até o fim do dia hoje + p_dias), como o prazo do card.
-- Duplicada (mesmo município, prazo, valor e objeto normalizado): fica a que tem link de origem; empate → atualizada
-- por último; empate → menor id. Os filtros vêm antes de tirar as duplicadas (os que dependem de município e prazo
-- usam as mesmas colunas da regra, então dá no mesmo; o do órgão faz a cópia que fica ser a do órgão escolhido).
create function public.abertas_unicas(p_tq tsquery, p_tq_excluir tsquery, p_ufs text[] default null,
                                      p_valor_min numeric default null, p_modalidades int[] default null,
                                      p_orgao text default null, p_ibge text default null, p_raio_km int default null,
                                      p_dias int default null,
                                      p_ibges text[] default null, p_valor_max numeric default null, p_so_me_epp boolean default null)
returns setof public.contratacoes language sql stable as $$
  select distinct on (c.codigo_ibge, c.encerramento_em, c.valor_estimado, public.objeto_normalizado(c.objeto)) c.*
  from public.contratacoes c
  where public.em_aberto(c.encerramento_em, c.situacao_id)
    and (p_tq is null or c.busca @@ p_tq or c.itens_palavras @@ p_tq)
    and (p_tq_excluir is null or not c.busca @@ p_tq_excluir)
    and (p_ufs is null or cardinality(p_ufs) = 0 or c.uf = any(p_ufs))
    and (p_ibges is null or cardinality(p_ibges) = 0 or c.codigo_ibge = any(p_ibges))
    and (p_valor_min is null or c.valor_estimado >= p_valor_min)
    and (p_valor_max is null or nullif(c.valor_estimado, 0) <= p_valor_max)
    and (p_modalidades is null or cardinality(p_modalidades) = 0 or c.modalidade_id = any(p_modalidades))
    and (p_so_me_epp is not true or public.exclusivo_me_epp(c.itens_resumo))
    and (p_orgao is null or c.cnpj = p_orgao)
    and (p_ibge is null
         or (p_raio_km is null and c.codigo_ibge = p_ibge)
         or (p_raio_km is not null and c.codigo_ibge in (select public.municipios_no_raio(p_ibge, p_raio_km))))
    and (p_dias is null or c.encerramento_em < (date_trunc('day', now() at time zone 'America/Sao_Paulo') + make_interval(days => p_dias + 1)) at time zone 'America/Sao_Paulo')
  order by c.codigo_ibge, c.encerramento_em, c.valor_estimado, public.objeto_normalizado(c.objeto),
           (c.link_origem is null), c.atualizada_pncp_em desc, c.id
$$;
```
(Atenção: a linha `p_dias int default null,` termina com vírgula e a linha seguinte tem **38 espaços** de recuo, igual às de cima, seguidos de `p_ibges text[] default null, p_valor_max numeric default null, p_so_me_epp boolean default null)`. Os três filtros novos ficam cada um numa linha com 4 espaços de recuo, nas posições mostradas. A guarda tira exatamente esses trechos e compara com o corpo da 0011.)

Continue o arquivo com `buscar_editais`: copie da 0011 o bloco que começa em `-- Lista. Ordens: relevancia` até o `end $$;` de `buscar_editais`, e mude **só**:
1. A linha `  p_ordem text default null)` vira duas linhas:
```sql
  p_ordem text default null,
  p_ibges text[] default null, p_valor_max numeric default null, p_so_me_epp boolean default null)
```
2. As duas chamadas `public.abertas_unicas(v_tq, v_tq_excluir, p_ufs, p_valor_min, p_modalidades, p_orgao, p_ibge, p_raio_km, p_dias)` viram `public.abertas_unicas(v_tq, v_tq_excluir, p_ufs, p_valor_min, p_modalidades, p_orgao, p_ibge, p_raio_km, p_dias, p_ibges, p_valor_max, p_so_me_epp)`.
3. Acrescente ao comentário de cima uma linha: `-- 0014: p_ibges (lista de municípios), p_valor_max e p_so_me_epp, repassados a abertas_unicas.` (o comentário fica fora do corpo comparado).

Depois, ainda no mesmo arquivo:
```sql
-- 5. Cartões do Meu Radar numa passada, sobre as mesmas abertas da lista: total, novas desde p_desde (publicação) e
-- prazo próximo (encerram até o fim do dia de hoje + 7, a mesma conta de p_dias = 7).
create function public.radar_contagens(
  p_termos text[], p_relacionados text[] default null, p_excluir text[] default null,
  p_ufs text[] default null, p_ibges text[] default null, p_valor_min numeric default null,
  p_valor_max numeric default null, p_modalidades int[] default null, p_so_me_epp boolean default null,
  p_desde timestamptz default null)
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
$$;

-- Municípios pelo nome, sem acento (onboarding): começo do nome primeiro, depois começo de outra palavra.
-- O site manda q já limpo (letras, espaço, hífen e apóstrofo; lib/radar.ts, lerBuscaMunicipio).
create function public.buscar_municipios(q text, p_limite int default 10)
returns table (codigo_ibge text, nome text, uf text)
language sql stable as $$
  select m.codigo_ibge, m.nome, m.uf
  from public.municipios m
  where public.sem_acento(m.nome) ilike public.sem_acento(q) || '%'
     or public.sem_acento(m.nome) ilike '% ' || public.sem_acento(q) || '%'
  order by (public.sem_acento(m.nome) ilike public.sem_acento(q) || '%') desc, m.nome, m.uf
  limit least(greatest(coalesce(p_limite, 10), 1), 20)
$$;

-- 6. Eventos da conta (sem e-mail no detalhe), gravados só pelo servidor.
alter table public.eventos drop constraint eventos_tipo_check;
alter table public.eventos add constraint eventos_tipo_check
  check (tipo in ('busca', 'abriu_edital', 'clicou_edital_oficial', 'pediu_alerta', 'quer_recurso', 'usou_recurso', 'limite_atingido',
                  'conta_entrou', 'onboarding_iniciado', 'onboarding_concluido', 'radar_visto'));

-- Só o servidor (service_role) executa.
revoke execute on function public.exclusivo_me_epp(jsonb) from public, anon, authenticated;
revoke execute on function public.abertas_unicas(tsquery, tsquery, text[], numeric, int[], text, text, int, int, text[], numeric, boolean) from public, anon, authenticated;
revoke execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text, text[], numeric, boolean) from public, anon, authenticated;
revoke execute on function public.radar_contagens(text[], text[], text[], text[], text[], numeric, numeric, int[], boolean, timestamptz) from public, anon, authenticated;
revoke execute on function public.buscar_municipios(text, int) from public, anon, authenticated;
grant execute on function public.exclusivo_me_epp(jsonb) to service_role;
grant execute on function public.abertas_unicas(tsquery, tsquery, text[], numeric, int[], text, text, int, int, text[], numeric, boolean) to service_role;
grant execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text, text[], numeric, boolean) to service_role;
grant execute on function public.radar_contagens(text[], text[], text[], text[], text[], numeric, numeric, int[], boolean, timestamptz) to service_role;
grant execute on function public.buscar_municipios(text, int) to service_role;

-- O PostgREST relê as funções no commit.
notify pgrst, 'reload schema';
```

- [ ] **Step 5: Modelo do e-mail**

Crie `supabase/templates/codigo.html` (assunto: **Seu código do Edital Map**; colar nos modelos "Magic Link" e "Confirm signup"):
```html
<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px 12px;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#1c1a16;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e2ddd1;border-radius:8px;">
      <tr>
        <td style="padding:28px 28px 4px;font-size:18px;font-weight:bold;">Edital Map</td>
      </tr>
      <tr>
        <td style="padding:12px 28px 4px;font-size:15px;line-height:1.5;">Use este código para entrar no Edital Map:</td>
      </tr>
      <tr>
        <td style="padding:8px 28px 16px;">
          <div style="font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:bold;letter-spacing:8px;">{{ .Token }}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 28px;font-size:13px;line-height:1.5;color:#6b665b;">
          O código vale por 1 hora e só funciona uma vez. Se você não pediu para entrar, ignore este e-mail: ninguém entra na sua conta sem o código.
        </td>
      </tr>
    </table>
    <p style="max-width:480px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#6b665b;text-align:center;">
      Edital Map · licitações abertas no mapa · www.editalmap.com.br
    </p>
  </body>
</html>
```

- [ ] **Step 6: Conferências do controlador**

Crie `docs/evolucao-fase-3.sql`:
```sql
-- Edital Map · Evolução · Fase 3 · Conta, onboarding e Meu Radar: conferências do controlador (0014).
-- Rodar no SQL Editor do Supabase (projeto edital-map) ou com execute_sql. Uma seção por vez; anotar em docs/fase-3-metricas.md.

-- ── [C0] ANTES da 0014. Esperado: perfis_plano_check existe; 0 linhas em auth.users, perfis, radares, salvos;
-- 3 políticas (perfil próprio, radares próprios, salvos próprios). Anotar os totais de hoje.
select conname from pg_constraint where conrelid = 'public.perfis'::regclass and contype = 'c';
select (select count(*) from auth.users) as usuarios, (select count(*) from public.perfis) as perfis,
       (select count(*) from public.radares) as radares, (select count(*) from public.salvos) as salvos;
select tablename, policyname from pg_policies where schemaname = 'public' and tablename in ('perfis', 'radares', 'salvos');
select (select max(total) from public.buscar_editais(p_limite => 1)) as lista,
       (select sum(qtd) from public.mapa_editais()) as mapa,
       (select max(total) from public.buscar_editais(p_termos => array['uniforme'], p_limite => 1)) as lista_uniforme;

-- ── [C1] Permissões das funções. Esperado: anon e autenticado false, servico true, nas 6 linhas.
select f,
       has_function_privilege('anon', f, 'execute') as anon,
       has_function_privilege('authenticated', f, 'execute') as autenticado,
       has_function_privilege('service_role', f, 'execute') as servico
from unnest(array[
  'public.exclusivo_me_epp(jsonb)',
  'public.abertas_unicas(tsquery, tsquery, text[], numeric, int[], text, text, int, int, text[], numeric, boolean)',
  'public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text, text[], numeric, boolean)',
  'public.radar_contagens(text[], text[], text[], text[], text[], numeric, numeric, int[], boolean, timestamptz)',
  'public.buscar_municipios(text, int)',
  'public.mapa_editais(text, text[], int, numeric, int[], text, text, int, text[], text[], text[])']) as f;

-- ── [C2] Uma assinatura por função. Esperado: 3 linhas; abertas_unicas e buscar_editais terminam em p_so_me_epp.
select p.proname, pg_get_function_identity_arguments(p.oid) as argumentos
from pg_proc p
where p.pronamespace = 'public'::regnamespace and p.proname in ('abertas_unicas', 'buscar_editais', 'mapa_editais')
order by 1;

-- ── [C3] Tabelas da conta. Esperado: 0 políticas; anon/autenticado false em tudo; service_role true; RLS ligado.
select tablename, policyname from pg_policies where schemaname = 'public' and tablename in ('perfis', 'radares', 'salvos', 'alertas_enviados');
select t,
       has_table_privilege('anon', t, 'select') as anon_le, has_table_privilege('authenticated', t, 'select') as aut_le,
       has_table_privilege('authenticated', t, 'insert') as aut_grava, has_table_privilege('service_role', t, 'update') as servico,
       (select relrowsecurity from pg_class where oid = t::regclass) as rls
from unnest(array['public.perfis', 'public.radares', 'public.salvos', 'public.alertas_enviados']) as t;
select column_name, data_type from information_schema.columns
where table_schema = 'public' and ((table_name = 'radares' and column_name in ('municipios', 'valor_max', 'so_me_epp', 'atualizado_em'))
   or (table_name = 'perfis' and column_name = 'ultima_visita_radar'));

-- ── [C4] Chamadas de hoje seguem iguais. Esperado: os mesmos três números de [C0] (ou muito perto, se o sync rodou).
select (select max(total) from public.buscar_editais(p_limite => 1)) as lista,
       (select sum(qtd) from public.mapa_editais()) as mapa,
       (select max(total) from public.buscar_editais(p_termos => array['uniforme'], p_limite => 1)) as lista_uniforme;

-- ── [C5] Filtros novos. Esperado: so_municipios true; dentro_da_faixa true; todos_me_epp true (e linhas > 0 em cada).
select count(*) as linhas, bool_and(codigo_ibge in ('4209102', '4205407')) as so_municipios
from public.buscar_editais(p_ibges => array['4209102', '4205407'], p_limite => 500);
select count(*) as linhas, max(valor_estimado) as maior, bool_and(valor_estimado > 0 and valor_estimado <= 50000) as dentro_da_faixa
from public.buscar_editais(p_valor_min => 10000, p_valor_max => 50000, p_limite => 500);
select count(*) as linhas, bool_and(public.exclusivo_me_epp(c.itens_resumo)) as todos_me_epp
from public.buscar_editais(p_so_me_epp => true, p_limite => 500) b join public.contratacoes c on c.id = b.id;

-- ── [C6] Contagens do radar = lista. Esperado: total = lista_total; prazo_proximo = lista_7_dias; novas = lista_novas.
with r as (select * from public.radar_contagens(p_termos => array['uniforme', 'luva'], p_ufs => array['SC', 'PR'],
                                               p_desde => now() - interval '2 days'))
select r.total, (select max(total) from public.buscar_editais(p_termos => array['uniforme', 'luva'], p_ufs => array['SC', 'PR'], p_limite => 1)) as lista_total,
       r.prazo_proximo, (select max(total) from public.buscar_editais(p_termos => array['uniforme', 'luva'], p_ufs => array['SC', 'PR'], p_dias => 7, p_limite => 1)) as lista_7_dias,
       r.novas, (select count(*) from public.buscar_editais(p_termos => array['uniforme', 'luva'], p_ufs => array['SC', 'PR'], p_limite => 5000)
                 where publicada_em > now() - interval '2 days') as lista_novas
from r;

-- ── [C7] Tempo do radar com 5 produtos e os relacionados (expandir no site). Rodar cada um 2 vezes e anotar a 2ª
-- "Execution Time". Meta: < 500 ms em cada.
explain (analyze, buffers) select * from public.buscar_editais(
  p_termos => array['uniforme', 'luva', 'material de limpeza', 'cimento', 'notebook'],
  p_relacionados => array['EPI', 'material de construção', 'informática', 'fardamento', 'equipamento de proteção individual',
    'produto de limpeza', 'computador', 'vestuário profissional', 'saneante', 'areia', 'microcomputador', 'roupa profissional',
    'luva nitrílica', 'desinfetante', 'brita', 'jaleco', 'luva de vaqueta', 'detergente', 'tijolo', 'impressora'],
  p_ordem => 'relevancia', p_limite => 20);
explain (analyze, buffers) select * from public.radar_contagens(
  p_termos => array['uniforme', 'luva', 'material de limpeza', 'cimento', 'notebook'],
  p_relacionados => array['EPI', 'material de construção', 'informática', 'fardamento', 'equipamento de proteção individual',
    'produto de limpeza', 'computador', 'vestuário profissional', 'saneante', 'areia', 'microcomputador', 'roupa profissional',
    'luva nitrílica', 'desinfetante', 'brita', 'jaleco', 'luva de vaqueta', 'detergente', 'tijolo', 'impressora'],
  p_desde => now() - interval '1 day');

-- ── [C8] Municípios. Esperado: São José (SC) e outros "São José…" primeiro; Joinville/SC; nada com 'x%'.
select * from public.buscar_municipios('sao jose');
select * from public.buscar_municipios('joinv');
select count(*) from public.buscar_municipios('xq', 50);

-- ── [C9] Eventos. Esperado: a restrição lista os 11 tipos.
select pg_get_constraintdef(oid) from pg_constraint where conname = 'eventos_tipo_check';

-- ── [C10] Depois do teste ponta a ponta (Task 10). Esperado: 1 perfil por usuário (gatilho); radar do dono com os
-- produtos escolhidos; eventos da conta sem e-mail no detalhe.
select u.email, p.plano, p.ultima_visita_radar, r.termos, r.ufs, r.municipios, r.valor_min, r.valor_max, r.so_me_epp, r.atualizado_em
from auth.users u left join public.perfis p on p.id = u.id left join public.radares r on r.user_id = u.id;
select tipo, detalhe, interno, criado_em from public.eventos
where tipo in ('conta_entrou', 'onboarding_iniciado', 'onboarding_concluido', 'radar_visto') order by criado_em desc limit 20;
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npx vitest run scripts/migracoes.test.ts scripts/sessao.test.ts`
Expected: PASS. Se a comparação com a 0011 falhar, o recuo ou alguma linha copiada difere: corrigir a 0014 (nunca a guarda nem a 0011).

- [ ] **Step 8: Verificação completa e commit**

Run: `npm test && npm run typecheck`
```bash
git add supabase/migrations/0014_conta_radar.sql supabase/templates/codigo.html docs/evolucao-fase-3.sql lib/eventos.ts scripts/migracoes.test.ts scripts/sessao.test.ts
git commit -m "feat: migração 0014 (conta, radar, filtros novos e contagens)" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 4 (controlador): aplicar a 0014, chave publicável e modelo do e-mail

**Files:**
- Modify: `docs/fase-3-metricas.md`

**Interfaces:**
- Consumes: os arquivos da Task 3.
- Produces: 0014 aplicada em produção; `SUPABASE_ANON_KEY` na Vercel (production) e no `.env` local; modelos "Magic Link" e "Confirm signup" em português com `{{ .Token }}`; OTP de 6 dígitos. Pré-requisitos da Task 10.

Todos os passos são do controlador (o `.env` do worktree tem `SUPABASE_DB_URL`; nunca imprimir).

- [ ] **Step 1: Pré-condições**

Task 3 commitada. `gh run list --workflow sync.yml --limit 1`: nenhuma rodada `in_progress` (se houver, esperar). Rodar [C0] de `docs/evolucao-fase-3.sql` e anotar (se `perfis_plano_check` não aparecer com esse nome, parar: trocar o nome na 0014, Task 3, novo commit).

- [ ] **Step 2: Aplicar**

Run: `npm run db:aplicar -- supabase/migrations/0014_conta_radar.sql`
Expected: `[migração] conta_radar aplicada`. `lock timeout`: esperar o sync terminar e repetir. Qualquer outro erro: nada ficou aplicado; corrigir na Task 3 e repetir.

- [ ] **Step 3: Site no ar continua de pé**

```bash
B=https://www.editalmap.com.br
H='cookie: em_interno=1'
for u in / "/api/busca?q=luva" "/api/mapa?q=luva" "/api/contagem?q=luva" "/api/exportar?q=luva"; do curl -s -H "$H" -o /dev/null -w "%{http_code} $u\n" "$B$u"; done
S=$(curl -s -H "$H" "$B/api/busca?q=luva" | node -e "const r=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(r.editais[0].slug)")
curl -s -H "$H" -o /dev/null -w "%{http_code} edital\n" "$B/edital/$S"
```
Expected: `200` em todas. Qualquer 502: olhar o log da Vercel; se for a 0014, avisar o dono.

- [ ] **Step 4: Conferências**

Rodar [C1]–[C9] de `docs/evolucao-fase-3.sql`, uma seção por vez, conferindo o "Esperado". Em [C7], se alguma passar de 500 ms: ver "Riscos" e avisar o dono com a nova estimativa antes da Task 10.

- [ ] **Step 5: Chave publicável**

Pegar a chave com a ferramenta MCP `get_publishable_keys` do Supabase (projeto `omtwaflypzlebjoeubvp`; é pública). Usar a `sb_publishable_…` se existir; senão, a `anon` (JWT legado). Depois:
```bash
printf '%s' '<chave>' | vercel env add SUPABASE_ANON_KEY production
printf '\nSUPABASE_ANON_KEY=%s\n' '<chave>' >> .env
vercel env ls production | grep SUPABASE_ANON_KEY
```
Expected: a variável listada em production. (Sem `.vercel/` no worktree: `vercel link --yes --project edital-map` antes, time JPM Company.)

- [ ] **Step 6: Modelo do e-mail e código de 6 dígitos**

Com `SUPABASE_ACCESS_TOKEN` (token pessoal do Supabase) disponível no ambiente do controlador:
```bash
node -e "
const fs=require('fs');const html=fs.readFileSync('supabase/templates/codigo.html','utf8');
fs.writeFileSync(process.argv[1], JSON.stringify({
  mailer_subjects_magic_link:'Seu código do Edital Map', mailer_templates_magic_link_content:html,
  mailer_subjects_confirmation:'Seu código do Edital Map', mailer_templates_confirmation_content:html,
  mailer_otp_length:6, mailer_otp_exp:3600}));" "$SCRATCH/auth-config.json"
curl -s -X PATCH "https://api.supabase.com/v1/projects/omtwaflypzlebjoeubvp/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "content-type: application/json" -d @"$SCRATCH/auth-config.json" \
  | node -e "const r=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(r.mailer_subjects_magic_link, r.mailer_otp_length, r.mailer_otp_exp, r.mailer_templates_magic_link_content?.includes('{{ .Token }}'))"
```
(`$SCRATCH` = pasta de rascunho da sessão.) Expected: `Seu código do Edital Map 6 3600 true`.

Sem o token: pedir ao dono (~5 min) — em **Authentication → Emails → Templates**, nos modelos **Magic Link** e **Confirm signup**: assunto `Seu código do Edital Map` e o corpo = conteúdo de `supabase/templates/codigo.html` (mandar o arquivo para ele); em **Authentication → Sign In / Providers → Email**: "Email OTP Length" = 6 e "Email OTP Expiration" = 3600. Conferir também em **Authentication → Rate Limits** que o envio de e-mails está em pelo menos 30 por hora (SMTP próprio).

- [ ] **Step 7: Registrar e commitar**

Acrescente ao fim de `docs/fase-3-metricas.md`:
```markdown

## Evolução · Fase 3 · Conta e Meu Radar (0014)

- 0014 aplicada em aaaa-mm-dd hh:mm UTC; site no ar seguiu 200 (busca, mapa, contagem, exportação, edital).
- Antes [C0]: lista N, mapa N, uniforme N; usuários 0. Depois [C4]: lista N, mapa N, uniforme N.
- [C3] perfis/radares/salvos/alertas_enviados sem políticas, sem acesso de anon/authenticated, RLS ligado.
- [C5] municípios N linhas (só os 2), faixa 10–50 mil N linhas, ME/EPP N linhas (todas exclusivas).
- [C6] contagens = lista (total N, 7 dias N, novas N).
- [C7] radar com 5 produtos (2ª execução): lista N ms, contagens N ms.
- SUPABASE_ANON_KEY na Vercel (production) e no .env; modelo do e-mail (Magic Link e Confirm signup) e OTP de 6 dígitos (API | dono no painel).
```
```bash
git add docs/fase-3-metricas.md
git commit -m "docs: 0014 aplicada e conferida" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 5: Dados do radar (validação, busca, conta e contagens)

**Files:**
- Create: `lib/radar.ts`, `lib/servidor/conta.ts`, `lib/servidor/radar.ts`
- Modify: `lib/relevancia/pontuacao.ts`, `lib/servidor/consultas.ts` (exportar `paraResumo`, opção de perfil)
- Test: `lib/radar.test.ts`, `lib/relevancia/pontuacao.test.ts` (acrescentar), `lib/servidor/conta.test.ts`, `lib/servidor/radar.test.ts`

**Interfaces:**
- Consumes: `expandir`, `chave`, `normalizar`, `gruposDigitados`, `LIGACOES`, `type Busca` (`lib/relevancia/termos.ts`); `relevancia`, `explicar` (`lib/relevancia/pontuacao.ts`); `UFS_BRASIL`, `Resultado` (`lib/eventos.ts`); `MODALIDADES`, `POR_PAGINA`, `ordemEfetiva` (`lib/filtros.ts`); `IdPlano` (`lib/planos.ts`); `Usuario` (Task 1); contrato SQL da Task 3.
- Produces:
  - `lib/relevancia/pontuacao.ts`: `explicarPerfil(a: Acertos, b: Busca): string | null`; `relevancia(a, b, opcoes?: { perfil?: boolean })`.
  - `lib/radar.ts`: `type Radar = { termos: string[]; termosExcluir: string[]; ufs: string[]; municipios: string[]; valorMin: number | null; valorMax: number | null; modalidades: number[]; soMeEpp: boolean }`; `LIMITES_RADAR`; `MENSAGENS_RADAR`; `validarRadar(corpo: unknown): Resultado<Radar>`; `radarDaLinha(l: Record<string, unknown>): Radar`; `linhaDoRadar(r: Radar): Record<string, unknown>`; `buscaDoRadar(r: Radar): Busca`; `filtrosDoRadar(r: Radar)`; `argumentosRadar(r: Radar, o: { ordem: Ordem | null; pagina: number; limite: number })`; `VISIVEIS_GRATIS = 5`; `vistaDoRadar(plano: IdPlano, interno: boolean, pagina: number): { previa: boolean; pagina: number; limite: number }`; `desdeDaVisita(ultima: string | null, agora: Date): { desde: string; primeira: boolean }`; `type ContagensRadar = { total: number; novas: number; prazoProximo: number }`.
  - `lib/servidor/conta.ts`: `type Perfil = { plano: IdPlano; ultimaVisitaRadar: string | null }`; `perfilDaConta(usuario: Usuario): Promise<Perfil>`; `lerRadar(usuario: Usuario): Promise<Radar | null>`; `salvarRadar(usuario: Usuario, radar: Radar, agora?: Date): Promise<'criado' | 'atualizado'>`; `marcarVisitaRadar(usuario: Usuario, agora?: Date): Promise<void>`.
  - `lib/servidor/radar.ts`: `editaisDoRadar(r: Radar, o: { ordem: Ordem | null; pagina: number; limite: number }): Promise<ResultadoBusca>`; `contagensDoRadar(r: Radar, desde: string): Promise<ContagensRadar>`.
  - `lib/servidor/consultas.ts`: `export function paraResumo(l, b, divergentes, opcoes?: { perfil?: boolean }): EditalResumo`.

- [ ] **Step 1: Explicação pelo perfil (teste falhando)**

Acrescente ao fim de `lib/relevancia/pontuacao.test.ts` (ajuste o import do topo para incluir `explicarPerfil` e `relevancia`, e `interpretarBusca` de `./termos`, se ainda não estiverem):
```ts
describe('explicarPerfil (Meu Radar)', () => {
  const b = interpretarBusca('uniforme, luva');
  it('relacionado no objeto: cita o assunto e o perfil (texto da spec)', () => {
    expect(explicarPerfil({ termosObjeto: ['fardamento'], termosItens: [], frase: false }, b)).toBe(
      'Menciona fardamento, relacionado a uniformes profissionais, um dos produtos que você monitora.',
    );
  });
  it('produto do perfil no objeto ou nos itens', () => {
    expect(explicarPerfil({ termosObjeto: ['uniforme'], termosItens: [], frase: true }, b)).toBe('Menciona uniforme no objeto, um dos produtos que você monitora.');
    expect(explicarPerfil({ termosObjeto: ['uniforme', 'luva'], termosItens: [], frase: false }, b)).toBe('Menciona uniforme e luva no objeto, produtos que você monitora.');
    expect(explicarPerfil({ termosObjeto: [], termosItens: ['luva'], frase: false }, b)).toBe('Menciona luva nos itens, um dos produtos que você monitora.');
  });
  it('relacionado só nos itens', () => {
    expect(explicarPerfil({ termosObjeto: [], termosItens: ['fardamento'], frase: false }, b)).toBe(
      'Menciona fardamento, relacionado a uniformes profissionais, nos itens, um dos produtos que você monitora.',
    );
  });
  it('nada da busca: null; a busca avulsa continua com o texto de antes', () => {
    expect(explicarPerfil({ termosObjeto: [], termosItens: [], frase: false }, b)).toBeNull();
    expect(relevancia({ termosObjeto: ['fardamento'], termosItens: [], frase: false }, b)?.explicacao).toBe(
      'Menciona fardamento, relacionado a uniformes profissionais, no objeto.',
    );
    expect(relevancia({ termosObjeto: ['fardamento'], termosItens: [], frase: false }, b, { perfil: true })?.explicacao).toBe(
      'Menciona fardamento, relacionado a uniformes profissionais, um dos produtos que você monitora.',
    );
  });
});
```

Run: `npx vitest run lib/relevancia/pontuacao.test.ts`
Expected: FAIL (`explicarPerfil` não existe).

- [ ] **Step 2: Implementar a explicação pelo perfil**

Em `lib/relevancia/pontuacao.ts`, troque a função `explicar` inteira e a `relevancia` por:
```ts
type Melhor = { termos: string; tipo: 'digitado' | 'relacionado'; onde: 'objeto' | 'itens'; quantos: number };

/** O melhor acerto, nesta ordem: digitado no objeto, relacionado no objeto, digitado nos itens, relacionado nos itens. */
function melhorAcerto(a: Acertos, b: Busca): Melhor | null {
  const { digitados, objeto, itens } = daBusca(a, b);
  const porTermo = new Map(b.relacionados.map((r) => [r.termo, r]));
  const relacionados = (lista: string[]) => {
    const rel = lista.filter((t) => porTermo.has(t));
    if (rel.length === 0) return null;
    // Só os do mesmo assunto do primeiro: a frase cita um assunto só.
    const assunto = porTermo.get(rel[0])!.assunto;
    const mesmos = rel.filter((t) => porTermo.get(t)!.assunto === assunto).slice(0, 2);
    return `${emLista(mesmos)}, ${mesmos.length === 1 ? 'relacionado' : 'relacionados'} a ${assunto}`;
  };
  const digObjeto = objeto.filter((t) => digitados.has(t)).slice(0, 3);
  if (digObjeto.length) return { termos: emLista(digObjeto), tipo: 'digitado', onde: 'objeto', quantos: digObjeto.length };
  const relObjeto = relacionados(objeto);
  if (relObjeto) return { termos: relObjeto, tipo: 'relacionado', onde: 'objeto', quantos: 1 };
  const digItens = itens.filter((t) => digitados.has(t)).slice(0, 3);
  if (digItens.length) return { termos: emLista(digItens), tipo: 'digitado', onde: 'itens', quantos: digItens.length };
  const relItens = relacionados(itens);
  return relItens ? { termos: relItens, tipo: 'relacionado', onde: 'itens', quantos: 1 } : null;
}

const lugar = (m: Melhor) => (m.onde === 'objeto' ? 'no objeto' : 'nos itens');

/** Uma frase com o melhor acerto (busca avulsa). */
export function explicar(a: Acertos, b: Busca): string | null {
  const m = melhorAcerto(a, b);
  if (!m) return null;
  return m.tipo === 'digitado' ? `Menciona ${m.termos} ${lugar(m)}.` : `Menciona ${m.termos}, ${lugar(m)}.`;
}

/** A mesma frase no Meu Radar, citando os produtos do perfil ("um dos produtos que você monitora"). */
export function explicarPerfil(a: Acertos, b: Busca): string | null {
  const m = melhorAcerto(a, b);
  if (!m) return null;
  const produtos = m.quantos > 1 ? 'produtos que você monitora' : 'um dos produtos que você monitora';
  if (m.tipo === 'digitado') return `Menciona ${m.termos} ${lugar(m)}, ${produtos}.`;
  return m.onde === 'objeto' ? `Menciona ${m.termos}, ${produtos}.` : `Menciona ${m.termos}, nos itens, ${produtos}.`;
}

export function relevancia(a: Acertos, b: Busca, opcoes: { perfil?: boolean } = {}): Relevancia | null {
  const pontos = pontuar(a, b);
  if (pontos === null) return null;
  return { pontos, nivel: nivel(pontos), explicacao: (opcoes.perfil ? explicarPerfil(a, b) : explicar(a, b)) ?? '' };
}
```

Run: `npx vitest run lib/relevancia/pontuacao.test.ts`
Expected: PASS (os testes antigos de `explicar` continuam passando: mesmas frases).

- [ ] **Step 3: Regras puras do radar (testes falhando)**

Crie `lib/radar.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  argumentosRadar, buscaDoRadar, desdeDaVisita, filtrosDoRadar, linhaDoRadar, MENSAGENS_RADAR, radarDaLinha, validarRadar,
  VISIVEIS_GRATIS, vistaDoRadar, type Radar,
} from './radar';

const BASE: Radar = { termos: ['uniforme'], termosExcluir: [], ufs: [], municipios: [], valorMin: null, valorMax: null, modalidades: [], soMeEpp: false };
const ok = (c: unknown) => {
  const r = validarRadar(c);
  if (!r.ok) throw new Error(r.erro);
  return r.valor;
};
const erro = (c: unknown) => {
  const r = validarRadar(c);
  return r.ok ? null : r.erro;
};

describe('validarRadar', () => {
  it('mínimo: um produto; o resto com padrão', () => {
    expect(ok({ termos: ['Uniforme'] })).toEqual({ ...BASE, termos: ['Uniforme'] });
  });
  it('separa alternativas digitadas juntas e tira repetidos pela chave', () => {
    expect(ok({ termos: ['luva, botina', 'Luvas', 'EPI e uniformes'] }).termos).toEqual(['luva', 'botina', 'EPI', 'uniformes']);
  });
  it('produtos: pelo menos 1, até 10, até 60 caracteres, com palavra de 3+ letras', () => {
    expect(erro({ termos: [] })).toBe(MENSAGENS_RADAR.semTermo);
    expect(erro({})).toBe(MENSAGENS_RADAR.semTermo);
    expect(erro({ termos: Array.from({ length: 11 }, (_, i) => `produto${i}`) })).toBe(MENSAGENS_RADAR.muitosTermos);
    expect(erro({ termos: ['a'.repeat(61)] })).toBe(MENSAGENS_RADAR.termoLongo);
    expect(erro({ termos: ['de ti'] })).toBe(MENSAGENS_RADAR.termoCurto);
    expect(erro({ termos: [42] })).toBe(MENSAGENS_RADAR.formulario);
  });
  it('excluídos: sem hífen, sem repetidos, até 10, até 40 caracteres, 3+ letras', () => {
    expect(ok({ termos: ['uniforme'], termosExcluir: ['-escolar', 'Escolar', ' militar '] }).termosExcluir).toEqual(['escolar', 'militar']);
    expect(erro({ termos: ['uniforme'], termosExcluir: Array.from({ length: 11 }, (_, i) => `palavra${i}`) })).toBe(MENSAGENS_RADAR.muitosExcluir);
    expect(erro({ termos: ['uniforme'], termosExcluir: ['b'.repeat(41)] })).toBe(MENSAGENS_RADAR.excluirLongo);
    expect(erro({ termos: ['uniforme'], termosExcluir: ['ab'] })).toBe(MENSAGENS_RADAR.excluirCurto);
  });
  it('UFs válidas (maiúsculas, sem repetidas, em ordem) ou municípios IBGE, não os dois', () => {
    expect(ok({ termos: ['luva'], ufs: ['sc', 'PR', 'SC'] }).ufs).toEqual(['PR', 'SC']);
    expect(erro({ termos: ['luva'], ufs: ['XX'] })).toBe(MENSAGENS_RADAR.uf);
    expect(ok({ termos: ['luva'], municipios: ['4209102', '4209102', '4205407'] }).municipios).toEqual(['4209102', '4205407']);
    expect(erro({ termos: ['luva'], municipios: ['42091'] })).toBe(MENSAGENS_RADAR.municipio);
    expect(erro({ termos: ['luva'], municipios: Array.from({ length: 51 }, (_, i) => String(4200000 + i)) })).toBe(MENSAGENS_RADAR.muitosMunicipios);
    expect(erro({ termos: ['luva'], ufs: ['SC'], municipios: ['4209102'] })).toBe(MENSAGENS_RADAR.local);
  });
  it('faixa de valor coerente, em reais inteiros', () => {
    expect(ok({ termos: ['luva'], valorMin: 10000.4, valorMax: 500000 })).toMatchObject({ valorMin: 10000, valorMax: 500000 });
    expect(ok({ termos: ['luva'], valorMin: null, valorMax: 0 })).toMatchObject({ valorMin: null, valorMax: 0 });
    expect(erro({ termos: ['luva'], valorMin: 500000, valorMax: 10000 })).toBe(MENSAGENS_RADAR.faixa);
    for (const v of [-1, 'mil', Number.NaN, 1e13]) expect(erro({ termos: ['luva'], valorMin: v })).toBe(MENSAGENS_RADAR.valor);
  });
  it('modalidades da v1 e ME/EPP', () => {
    expect(ok({ termos: ['luva'], modalidades: [8, 6, 6], soMeEpp: true })).toMatchObject({ modalidades: [6, 8], soMeEpp: true });
    expect(erro({ termos: ['luva'], modalidades: [99] })).toBe(MENSAGENS_RADAR.modalidade);
    expect(ok({ termos: ['luva'], soMeEpp: 'sim' }).soMeEpp).toBe(false);
  });
  it('ignora campos que não são do radar (user_id do navegador não passa)', () => {
    expect(ok({ termos: ['luva'], user_id: 'outra-conta', userId: 'x' })).toEqual({ ...BASE, termos: ['luva'] });
  });
  it('corpo que não é objeto', () => {
    for (const c of [null, 'x', [1], 3]) expect(erro(c)).toBe(MENSAGENS_RADAR.formulario);
  });
});

describe('linha do banco ↔ radar', () => {
  it('ida e volta', () => {
    const r: Radar = { termos: ['luva'], termosExcluir: ['latex'], ufs: ['SC'], municipios: [], valorMin: 1000, valorMax: 9000, modalidades: [6], soMeEpp: true };
    expect(linhaDoRadar(r)).toEqual({
      termos: ['luva'], termos_excluir: ['latex'], ufs: ['SC'], municipios: [], valor_min: 1000, valor_max: 9000, modalidades: [6], so_me_epp: true,
    });
    expect(radarDaLinha({ ...linhaDoRadar(r), valor_min: '1000.00', valor_max: '9000.00' })).toEqual(r);
  });
  it('colunas nulas viram padrão', () => {
    expect(radarDaLinha({ termos: ['luva'], termos_excluir: null, ufs: null, municipios: null, valor_min: null, valor_max: null, modalidades: null, so_me_epp: null })).toEqual({
      ...BASE,
      termos: ['luva'],
    });
  });
});

describe('busca do radar', () => {
  const r: Radar = { termos: ['uniforme', 'luva'], termosExcluir: ['escolar'], ufs: ['SC'], municipios: [], valorMin: 10000, valorMax: null, modalidades: [6], soMeEpp: true };
  it('produtos = digitados (OR), cada um com seus relacionados, e os excluídos', () => {
    const b = buscaDoRadar(r);
    expect(b.digitados).toEqual(['uniforme', 'luva']);
    expect(b.excluidos).toEqual(['escolar']);
    expect(b.relacionados.map((x) => x.termo)).toEqual(expect.arrayContaining(['fardamento', 'botina']));
    expect(b.relacionados.find((x) => x.termo === 'fardamento')?.de).toBe('uniforme');
  });
  it('filtros para buscar_editais e radar_contagens (vazios viram nulo)', () => {
    const f = filtrosDoRadar(r);
    expect(f).toMatchObject({
      p_termos: ['uniforme', 'luva'], p_excluir: ['escolar'], p_ufs: ['SC'], p_ibges: null, p_valor_min: 10000, p_valor_max: null,
      p_modalidades: [6], p_so_me_epp: true,
    });
    expect((f.p_relacionados as string[]).length).toBeGreaterThan(0);
    expect(filtrosDoRadar({ ...r, termosExcluir: [], ufs: [], municipios: ['4209102'], modalidades: [], soMeEpp: false })).toMatchObject({
      p_excluir: null, p_ufs: null, p_ibges: ['4209102'], p_modalidades: null, p_so_me_epp: null,
    });
  });
  it('argumentos da lista: ordem (relevância por padrão), página e limite', () => {
    expect(argumentosRadar(r, { ordem: null, pagina: 1, limite: 20 })).toMatchObject({ p_ordem: 'relevancia', p_limite: 20, p_deslocamento: 0 });
    expect(argumentosRadar(r, { ordem: 'maior_valor', pagina: 3, limite: 20 })).toMatchObject({ p_ordem: 'maior_valor', p_deslocamento: 40 });
    expect(Object.keys(argumentosRadar(r, { ordem: null, pagina: 1, limite: 5 }))).not.toContain('user_id');
  });
});

describe('plano e visita', () => {
  it('grátis vê a prévia de 5, sempre na página 1', () => {
    expect(VISIVEIS_GRATIS).toBe(5);
    expect(vistaDoRadar('gratis', false, 3)).toEqual({ previa: true, pagina: 1, limite: 5 });
  });
  it('Basic, Pro e o navegador interno veem tudo, 20 por página', () => {
    expect(vistaDoRadar('basic', false, 3)).toEqual({ previa: false, pagina: 3, limite: 20 });
    expect(vistaDoRadar('pro', false, 1)).toEqual({ previa: false, pagina: 1, limite: 20 });
    expect(vistaDoRadar('gratis', true, 2)).toEqual({ previa: false, pagina: 2, limite: 20 });
  });
  it('novas desde a última visita; na primeira, últimas 24 horas', () => {
    const agora = new Date('2026-10-18T15:00:00Z');
    expect(desdeDaVisita('2026-10-17T10:00:00.000Z', agora)).toEqual({ desde: '2026-10-17T10:00:00.000Z', primeira: false });
    expect(desdeDaVisita(null, agora)).toEqual({ desde: '2026-10-17T15:00:00.000Z', primeira: true });
  });
});
```

Run: `npx vitest run lib/radar.test.ts`
Expected: FAIL (módulo `./radar` não existe).

- [ ] **Step 4: Implementar `lib/radar.ts`**

```ts
import { UFS_BRASIL, type Resultado } from './eventos';
import { MODALIDADES, ordemEfetiva, POR_PAGINA } from './filtros';
import type { IdPlano } from './planos';
import { chave, expandir, gruposDigitados, LIGACOES, normalizar, type Busca } from './relevancia/termos';
import type { Ordem } from './tipos';

/**
 * Radar (perfil de interesse) de uma conta: regras puras de validação e da busca que alimenta o Meu Radar.
 * A busca é a mesma da Fase 2 (buscar_editais, 0011/0014): os produtos vão como termos digitados (OR), cada um com
 * seus relacionados (expandir), os excluídos tiram pelo objeto e os filtros novos (municípios, valor máximo, ME/EPP)
 * são da 0014. O dono do radar nunca está aqui: vem da sessão (lib/servidor/sessao.ts → lib/servidor/conta.ts).
 */

export type Radar = {
  termos: string[];
  termosExcluir: string[];
  ufs: string[];
  /** Códigos IBGE (7 dígitos). Estados ou municípios, não os dois. */
  municipios: string[];
  valorMin: number | null;
  valorMax: number | null;
  modalidades: number[];
  soMeEpp: boolean;
};

export type ContagensRadar = { total: number; novas: number; prazoProximo: number };

export const LIMITES_RADAR = { termos: 10, excluir: 10, municipios: 50, tamanhoTermo: 60, tamanhoExcluir: 40, valorMaximo: 1e12 } as const;
export const VISIVEIS_GRATIS = 5;

export const MENSAGENS_RADAR = {
  formulario: 'Formulário inválido.',
  semTermo: 'Informe pelo menos um produto ou serviço.',
  muitosTermos: 'Use até 10 produtos ou serviços.',
  termoLongo: 'Use até 60 caracteres em cada produto ou serviço.',
  termoCurto: 'Cada produto ou serviço precisa de uma palavra com 3 letras ou mais.',
  muitosExcluir: 'Use até 10 palavras para excluir.',
  excluirLongo: 'Use até 40 caracteres em cada palavra para excluir.',
  excluirCurto: 'Cada palavra para excluir precisa ter 3 letras ou mais.',
  uf: 'Estado inválido.',
  municipio: 'Município inválido.',
  muitosMunicipios: 'Escolha até 50 municípios.',
  local: 'Escolha estados ou municípios, não os dois.',
  valor: 'Confira os valores.',
  faixa: 'O valor mínimo não pode ser maior que o máximo.',
  modalidade: 'Modalidade inválida.',
  semEstado: 'Escolha pelo menos um estado.',
  semMunicipio: 'Escolha pelo menos um município.',
} as const;

const IDS_MODALIDADE: readonly number[] = MODALIDADES.map((m) => m.id);
const IBGE = /^\d{7}$/;
const falha = (erro: string): Resultado<never> => ({ ok: false, erro });

/** Uma palavra de 3+ letras que não é de ligação (o banco busca por prefixo: "ti" acharia de tudo). */
export function palavraValida(t: string): boolean {
  return normalizar(t).split(' ').some((p) => p.length >= 3 && !LIGACOES.has(p));
}

function textos(v: unknown): string[] | null {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) && v.every((x) => typeof x === 'string') ? (v as string[]) : null;
}

function valor(v: unknown): number | null | 'invalido' {
  if (v === undefined || v === null) return null;
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= LIMITES_RADAR.valorMaximo ? Math.round(v) : 'invalido';
}

export function validarRadar(corpo: unknown): Resultado<Radar> {
  if (typeof corpo !== 'object' || corpo === null || Array.isArray(corpo)) return falha(MENSAGENS_RADAR.formulario);
  const c = corpo as Record<string, unknown>;

  const brutos = textos(c.termos);
  if (!brutos) return falha(MENSAGENS_RADAR.formulario);
  const termos: string[] = [];
  for (const bruto of brutos) {
    for (const g of gruposDigitados(bruto)) {
      if (g.length > LIMITES_RADAR.tamanhoTermo) return falha(MENSAGENS_RADAR.termoLongo);
      if (!palavraValida(g)) return falha(MENSAGENS_RADAR.termoCurto);
      if (!termos.some((t) => chave(t) === chave(g))) termos.push(g);
    }
  }
  if (termos.length === 0) return falha(MENSAGENS_RADAR.semTermo);
  if (termos.length > LIMITES_RADAR.termos) return falha(MENSAGENS_RADAR.muitosTermos);

  const excluirBrutos = textos(c.termosExcluir);
  if (!excluirBrutos) return falha(MENSAGENS_RADAR.formulario);
  const termosExcluir: string[] = [];
  for (const bruto of excluirBrutos) {
    const e = bruto.trim().replace(/^-+/, '').replace(/\s+/g, ' ').toLowerCase();
    if (!e) continue;
    if (e.length > LIMITES_RADAR.tamanhoExcluir) return falha(MENSAGENS_RADAR.excluirLongo);
    if (!palavraValida(e)) return falha(MENSAGENS_RADAR.excluirCurto);
    if (!termosExcluir.some((t) => chave(t) === chave(e))) termosExcluir.push(e);
  }
  if (termosExcluir.length > LIMITES_RADAR.excluir) return falha(MENSAGENS_RADAR.muitosExcluir);

  const ufsBrutas = textos(c.ufs);
  if (!ufsBrutas) return falha(MENSAGENS_RADAR.formulario);
  const ufs = [...new Set(ufsBrutas.map((u) => u.trim().toUpperCase()))];
  if (ufs.some((u) => !UFS_BRASIL.includes(u))) return falha(MENSAGENS_RADAR.uf);
  ufs.sort();

  const municipiosBrutos = textos(c.municipios);
  if (!municipiosBrutos) return falha(MENSAGENS_RADAR.formulario);
  const municipios = [...new Set(municipiosBrutos.map((m) => m.trim()))];
  if (municipios.some((m) => !IBGE.test(m))) return falha(MENSAGENS_RADAR.municipio);
  if (municipios.length > LIMITES_RADAR.municipios) return falha(MENSAGENS_RADAR.muitosMunicipios);
  if (ufs.length > 0 && municipios.length > 0) return falha(MENSAGENS_RADAR.local);

  const valorMin = valor(c.valorMin);
  const valorMax = valor(c.valorMax);
  if (valorMin === 'invalido' || valorMax === 'invalido') return falha(MENSAGENS_RADAR.valor);
  if (valorMin !== null && valorMax !== null && valorMin > valorMax) return falha(MENSAGENS_RADAR.faixa);

  const modalidadesBrutas = c.modalidades ?? [];
  if (!Array.isArray(modalidadesBrutas)) return falha(MENSAGENS_RADAR.formulario);
  const modalidades = [...new Set(modalidadesBrutas as unknown[])];
  if (modalidades.some((m) => typeof m !== 'number' || !IDS_MODALIDADE.includes(m))) return falha(MENSAGENS_RADAR.modalidade);

  return {
    ok: true,
    valor: {
      termos, termosExcluir, ufs, municipios, valorMin, valorMax,
      modalidades: (modalidades as number[]).sort((a, b) => a - b),
      soMeEpp: c.soMeEpp === true,
    },
  };
}

const lista = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
const numero = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

/** Linha de public.radares (numeric chega como texto) → Radar. */
export function radarDaLinha(l: Record<string, unknown>): Radar {
  return {
    termos: lista(l.termos),
    termosExcluir: lista(l.termos_excluir),
    ufs: lista(l.ufs),
    municipios: lista(l.municipios),
    valorMin: numero(l.valor_min),
    valorMax: numero(l.valor_max),
    modalidades: Array.isArray(l.modalidades) ? l.modalidades.map(Number) : [],
    soMeEpp: l.so_me_epp === true,
  };
}

/** Radar → colunas de public.radares (sem user_id: quem põe é lib/servidor/conta.ts, da sessão). */
export function linhaDoRadar(r: Radar): Record<string, unknown> {
  return {
    termos: r.termos, termos_excluir: r.termosExcluir, ufs: r.ufs, municipios: r.municipios,
    valor_min: r.valorMin, valor_max: r.valorMax, modalidades: r.modalidades, so_me_epp: r.soMeEpp,
  };
}

/** A busca do radar no formato da Fase 2: produtos = digitados, relacionados de todos, excluídos. */
export function buscaDoRadar(r: Radar): Busca {
  return { positivo: r.termos.join(', '), digitados: r.termos, relacionados: expandir(r.termos), excluidos: r.termosExcluir };
}

/** Filtros comuns a buscar_editais e radar_contagens (0014). Listas vazias e "não" viram nulo (sem filtro). */
export function filtrosDoRadar(r: Radar) {
  const b = buscaDoRadar(r);
  return {
    p_termos: b.digitados,
    p_relacionados: b.relacionados.map((t) => t.termo),
    p_excluir: b.excluidos.length ? b.excluidos : null,
    p_ufs: r.ufs.length ? r.ufs : null,
    p_ibges: r.municipios.length ? r.municipios : null,
    p_valor_min: r.valorMin,
    p_valor_max: r.valorMax,
    p_modalidades: r.modalidades.length ? r.modalidades : null,
    p_so_me_epp: r.soMeEpp ? true : null,
  };
}

/** Argumentos de buscar_editais para uma página do radar. */
export function argumentosRadar(r: Radar, o: { ordem: Ordem | null; pagina: number; limite: number }) {
  return {
    ...filtrosDoRadar(r),
    p_ordem: ordemEfetiva(o.ordem, true),
    p_limite: o.limite,
    p_deslocamento: (o.pagina - 1) * POR_PAGINA,
  };
}

/** Grátis (e não interno): prévia dos 5 primeiros, sem páginas. Basic, Pro e interno: tudo, 20 por página. */
export function vistaDoRadar(plano: IdPlano, interno: boolean, pagina: number): { previa: boolean; pagina: number; limite: number } {
  if (plano === 'gratis' && !interno) return { previa: true, pagina: 1, limite: VISIVEIS_GRATIS };
  return { previa: false, pagina, limite: POR_PAGINA };
}

/** Desde quando contar "novas": a última visita; sem visita, as últimas 24 horas. */
export function desdeDaVisita(ultima: string | null, agora: Date): { desde: string; primeira: boolean } {
  if (ultima) return { desde: ultima, primeira: false };
  return { desde: new Date(agora.getTime() - 24 * 60 * 60 * 1000).toISOString(), primeira: true };
}
```

Run: `npx vitest run lib/radar.test.ts`
Expected: PASS.

- [ ] **Step 5: Conta no servidor (testes falhando)**

Crie `lib/servidor/conta.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Radar } from '../radar';
import type { Usuario } from './sessao';

vi.mock('server-only', () => ({}));

type Resposta = { data: unknown; error: null | { message: string } };
const m = vi.hoisted(() => ({ chamadas: [] as unknown[][], respostas: [] as Resposta[] }));

function consulta(tabela: string) {
  const proxima = () => Promise.resolve(m.respostas.shift() ?? { data: null, error: null });
  const c: Record<string, unknown> = {};
  for (const metodo of ['select', 'eq', 'upsert']) {
    c[metodo] = (...a: unknown[]) => {
      m.chamadas.push([`${tabela}.${metodo}`, ...a]);
      return c;
    };
  }
  c.maybeSingle = proxima;
  c.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => proxima().then(ok, ko);
  return c;
}
vi.mock('./supabase', () => ({ supabaseServidor: () => ({ from: (t: string) => consulta(t) }) }));

const { lerRadar, marcarVisitaRadar, perfilDaConta, salvarRadar } = await import('./conta');

const usuario = { id: 'u-sessao', email: 'dono@empresa.com.br' } as unknown as Usuario;
const RADAR: Radar = { termos: ['luva'], termosExcluir: [], ufs: ['SC'], municipios: [], valorMin: null, valorMax: null, modalidades: [], soMeEpp: false };
const LINHA = { termos: ['luva'], termos_excluir: [], ufs: ['SC'], municipios: [], valor_min: null, valor_max: null, modalidades: [], so_me_epp: false };

beforeEach(() => {
  m.chamadas.length = 0;
  m.respostas.length = 0;
});

describe('conta.ts: tudo pelo usuário da sessão', () => {
  it('lerRadar filtra pelo id da sessão e devolve o radar', async () => {
    m.respostas.push({ data: LINHA, error: null });
    expect(await lerRadar(usuario)).toEqual(RADAR);
    expect(m.chamadas).toContainEqual(['radares.eq', 'user_id', 'u-sessao']);
  });
  it('lerRadar sem radar: null', async () => {
    expect(await lerRadar(usuario)).toBeNull();
  });
  it('salvarRadar grava com o user_id da sessão (o radar não traz dono) e diz se criou', async () => {
    m.respostas.push({ data: null, error: null }, { data: null, error: null });
    const intruso = { ...RADAR, user_id: 'outra-conta' } as unknown as Radar;
    expect(await salvarRadar(usuario, intruso, new Date('2026-10-18T12:00:00Z'))).toBe('criado');
    const upsert = m.chamadas.find((c) => c[0] === 'radares.upsert')!;
    expect(upsert[1]).toMatchObject({ ...LINHA, user_id: 'u-sessao', atualizado_em: '2026-10-18T12:00:00.000Z' });
    expect(upsert[2]).toEqual({ onConflict: 'user_id' });
  });
  it('salvarRadar com radar existente: atualizado', async () => {
    m.respostas.push({ data: LINHA, error: null }, { data: null, error: null });
    expect(await salvarRadar(usuario, RADAR)).toBe('atualizado');
  });
  it('salvarRadar com erro do banco: lança', async () => {
    m.respostas.push({ data: null, error: null }, { data: null, error: { message: 'violates check' } });
    await expect(salvarRadar(usuario, RADAR)).rejects.toThrow('salvar radar: violates check');
  });
  it('perfil: plano conhecido ou grátis; última visita', async () => {
    m.respostas.push({ data: { plano: 'pro', ultima_visita_radar: '2026-10-17T10:00:00+00:00' }, error: null });
    expect(await perfilDaConta(usuario)).toEqual({ plano: 'pro', ultimaVisitaRadar: '2026-10-17T10:00:00+00:00' });
    expect(m.chamadas).toContainEqual(['perfis.eq', 'id', 'u-sessao']);
    m.respostas.push({ data: { plano: 'business', ultima_visita_radar: null }, error: null });
    expect(await perfilDaConta(usuario)).toEqual({ plano: 'gratis', ultimaVisitaRadar: null });
    expect(await perfilDaConta(usuario)).toEqual({ plano: 'gratis', ultimaVisitaRadar: null });
  });
  it('marcarVisitaRadar grava no perfil da sessão', async () => {
    await marcarVisitaRadar(usuario, new Date('2026-10-18T12:00:00Z'));
    expect(m.chamadas).toContainEqual(['perfis.upsert', { id: 'u-sessao', ultima_visita_radar: '2026-10-18T12:00:00.000Z' }, { onConflict: 'id' }]);
  });
});
```

Crie `lib/servidor/radar.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Radar } from '../radar';

vi.mock('server-only', () => ({}));

const m = vi.hoisted(() => ({ chamadas: [] as Array<{ nome: string; args: Record<string, unknown> }>, dados: [] as unknown }));
vi.mock('./supabase', () => ({
  supabaseServidor: () => ({
    rpc: (nome: string, args: Record<string, unknown>) => {
      m.chamadas.push({ nome, args });
      const resposta = Promise.resolve({ data: m.dados, error: null });
      return { single: () => resposta, then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => resposta.then(ok, ko) };
    },
  }),
}));

const { contagensDoRadar, editaisDoRadar } = await import('./radar');

const RADAR: Radar = { termos: ['uniforme'], termosExcluir: ['escolar'], ufs: [], municipios: ['4209102'], valorMin: null, valorMax: 50000, modalidades: [], soMeEpp: true };
const linha = {
  id: 'x', slug: 's', objeto: 'Aquisição de fardamento', orgao_nome: 'PREFEITURA', unidade_nome: null, municipio_nome: 'Joinville', uf: 'SC',
  codigo_ibge: '4209102', valor_estimado: 1000, encerramento_em: '2026-10-30T13:00:00Z', publicada_em: '2026-10-17T10:00:00Z',
  modalidade_nome: 'Pregão - Eletrônico', srp: false, link_origem: null, onde: 'objeto', total: 7, situacao_id: 1,
  pontuacao: 45, termos_objeto: ['fardamento'], termos_itens: [], frase: false,
};

beforeEach(() => {
  m.chamadas.length = 0;
});

describe('editaisDoRadar', () => {
  it('chama buscar_editais com os filtros do radar e explica pelo perfil', async () => {
    m.dados = [linha];
    const r = await editaisDoRadar(RADAR, { ordem: null, pagina: 1, limite: 5 });
    expect(m.chamadas[0].nome).toBe('buscar_editais');
    expect(m.chamadas[0].args).toMatchObject({
      p_termos: ['uniforme'], p_excluir: ['escolar'], p_ibges: ['4209102'], p_valor_max: 50000, p_so_me_epp: true,
      p_ordem: 'relevancia', p_limite: 5, p_deslocamento: 0,
    });
    expect(r.total).toBe(7);
    expect(r.editais[0].relevancia?.explicacao).toBe('Menciona fardamento, relacionado a uniformes profissionais, um dos produtos que você monitora.');
  });
});

describe('contagensDoRadar', () => {
  it('uma chamada a radar_contagens com os mesmos filtros e o "desde"', async () => {
    m.dados = { total: 12, novas: 3, prazo_proximo: 4 };
    expect(await contagensDoRadar(RADAR, '2026-10-17T10:00:00.000Z')).toEqual({ total: 12, novas: 3, prazoProximo: 4 });
    expect(m.chamadas[0].nome).toBe('radar_contagens');
    expect(m.chamadas[0].args).toMatchObject({ p_termos: ['uniforme'], p_ibges: ['4209102'], p_desde: '2026-10-17T10:00:00.000Z' });
    expect(Object.keys(m.chamadas[0].args)).not.toContain('p_ordem');
  });
});
```

Run: `npx vitest run lib/servidor/conta.test.ts lib/servidor/radar.test.ts`
Expected: FAIL (módulos não existem).

- [ ] **Step 6: Implementar `conta.ts`, `radar.ts` e exportar `paraResumo`**

Em `lib/servidor/consultas.ts`, troque a assinatura e a linha da relevância de `paraResumo`:
```ts
/** Uma linha de buscar_editais → card da lista, com a relevância (número e explicação calculados aqui, pela busca). */
export function paraResumo(l: Linha, b: Busca, divergentes: string[], opcoes: { perfil?: boolean } = {}): EditalResumo {
  const acertos: Acertos = { termosObjeto: lista(l.termos_objeto), termosItens: lista(l.termos_itens), frase: l.frase === true };
  const rel = relevancia(acertos, b, opcoes);
```
(o resto da função não muda; `type Linha` passa a `export type Linha = Record<string, unknown>;`).

Crie `lib/servidor/conta.ts`:
```ts
import 'server-only';
import type { IdPlano } from '../planos';
import { linhaDoRadar, radarDaLinha, type Radar } from '../radar';
import type { Usuario } from './sessao';
import { supabaseServidor } from './supabase';

/**
 * Perfil e radar da conta. Única porta para public.perfis e public.radares: toda função recebe o `Usuario` da sessão
 * (lib/servidor/sessao.ts, auth.getUser()) e filtra ou grava pelo id dele, com a service role. Nunca um id do navegador.
 */

export type Perfil = { plano: IdPlano; ultimaVisitaRadar: string | null };

const COLUNAS_RADAR = 'termos, termos_excluir, ufs, municipios, valor_min, valor_max, modalidades, so_me_epp';

export async function perfilDaConta(usuario: Usuario): Promise<Perfil> {
  const { data, error } = await supabaseServidor().from('perfis').select('plano, ultima_visita_radar').eq('id', usuario.id).maybeSingle();
  if (error) throw new Error(`perfil: ${error.message}`);
  const linha = (data ?? {}) as { plano?: unknown; ultima_visita_radar?: unknown };
  const plano: IdPlano = linha.plano === 'basic' || linha.plano === 'pro' ? linha.plano : 'gratis';
  return { plano, ultimaVisitaRadar: linha.ultima_visita_radar ? String(linha.ultima_visita_radar) : null };
}

export async function lerRadar(usuario: Usuario): Promise<Radar | null> {
  const { data, error } = await supabaseServidor().from('radares').select(COLUNAS_RADAR).eq('user_id', usuario.id).maybeSingle();
  if (error) throw new Error(`radar: ${error.message}`);
  return data ? radarDaLinha(data as Record<string, unknown>) : null;
}

/** Cria ou troca o radar da conta (um por conta, índice único em user_id). */
export async function salvarRadar(usuario: Usuario, radar: Radar, agora: Date = new Date()): Promise<'criado' | 'atualizado'> {
  const existente = await lerRadar(usuario);
  const { error } = await supabaseServidor()
    .from('radares')
    .upsert({ ...linhaDoRadar(radar), user_id: usuario.id, atualizado_em: agora.toISOString() }, { onConflict: 'user_id' });
  if (error) throw new Error(`salvar radar: ${error.message}`);
  return existente ? 'atualizado' : 'criado';
}

/** "Novas desde a sua última visita" conta a partir daqui (gravado ao sair do Meu Radar). */
export async function marcarVisitaRadar(usuario: Usuario, agora: Date = new Date()): Promise<void> {
  const { error } = await supabaseServidor()
    .from('perfis')
    .upsert({ id: usuario.id, ultima_visita_radar: agora.toISOString() }, { onConflict: 'id' });
  if (error) throw new Error(`visita do radar: ${error.message}`);
}
```

Crie `lib/servidor/radar.ts`:
```ts
import 'server-only';
import { criarCache } from '../cache';
import { argumentosRadar, buscaDoRadar, filtrosDoRadar, type ContagensRadar, type Radar } from '../radar';
import type { Ordem, ResultadoBusca } from '../tipos';
import { paraResumo, type Linha } from './consultas';
import { supabaseServidor } from './supabase';

/** Lista e contagens do Meu Radar: a mesma busca da Fase 2 (buscar_editais) com os filtros do radar (0014). */
const cache = criarCache(5 * 60 * 1000);

export function editaisDoRadar(r: Radar, o: { ordem: Ordem | null; pagina: number; limite: number }): Promise<ResultadoBusca> {
  return cache(`radar:${JSON.stringify([r, o])}`, async () => {
    const b = buscaDoRadar(r);
    const { data, error } = await supabaseServidor().rpc('buscar_editais', argumentosRadar(r, o));
    if (error) throw new Error(`buscar_editais (radar): ${error.message}`);
    const linhas = (data ?? []) as Linha[];
    const divergentes: string[] = [];
    const editais = linhas.map((l) => paraResumo(l, b, divergentes, { perfil: true }));
    if (divergentes.length > 0) {
      console.warn(`relevância diferente entre banco e site em ${divergentes.length} edital(is) do radar; primeiros: ${divergentes.slice(0, 3).join(', ')}`);
    }
    return { total: Number(linhas[0]?.total ?? 0), editais };
  });
}

/** Os três cartões numa chamada (radar_contagens). Sem cache: "desde" muda a cada visita. */
export async function contagensDoRadar(r: Radar, desde: string): Promise<ContagensRadar> {
  const { data, error } = await supabaseServidor().rpc('radar_contagens', { ...filtrosDoRadar(r), p_desde: desde }).single();
  if (error) throw new Error(`radar_contagens: ${error.message}`);
  const l = (data ?? {}) as { total?: unknown; novas?: unknown; prazo_proximo?: unknown };
  return { total: Number(l.total ?? 0), novas: Number(l.novas ?? 0), prazoProximo: Number(l.prazo_proximo ?? 0) };
}
```

Run: `npx vitest run lib/servidor/conta.test.ts lib/servidor/radar.test.ts lib/servidor/consultas.test.ts`
Expected: PASS.

- [ ] **Step 7: Verificação completa e commit**

Run: `npm test && npm run typecheck`
```bash
git add lib/radar.ts lib/radar.test.ts lib/relevancia/pontuacao.ts lib/relevancia/pontuacao.test.ts lib/servidor/conta.ts lib/servidor/conta.test.ts lib/servidor/radar.ts lib/servidor/radar.test.ts lib/servidor/consultas.ts
git commit -m "feat: dados do radar (validação, busca pelo perfil, conta e contagens)" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 6: Onboarding em 3 etapas (/radar/comecar, /api/radar, /api/municipios)

**Files:**
- Create: `lib/servidor/municipios.ts`, `app/api/municipios/route.ts`, `app/api/radar/route.ts`, `components/radar/CampoTermos.tsx`, `components/radar/CampoLocal.tsx`, `components/radar/FormRadar.tsx`, `app/radar/comecar/page.tsx`
- Modify: `lib/radar.ts` (rascunho do formulário, sugestões, busca de município)
- Test: `lib/radar.test.ts` (acrescentar), `lib/servidor/municipios.test.ts`, `app/api/municipios/route.test.ts`, `app/api/radar/route.test.ts`

**Interfaces:**
- Consumes: Task 1 (`usuarioAtual`), Task 5 (`Radar`, `validarRadar`, `MENSAGENS_RADAR`, `LIMITES_RADAR`, `palavraValida`, `lerRadar`, `salvarRadar`), `GRUPOS`, `chave`, `gruposDigitados` (termos), `MODALIDADES`, `UFS_ORDENADAS` (filtros), `NOMES_UF` (estados), `Cidade`, `CACHE_PUBLICO`/`SEM_CACHE`.
- Produces:
  - `lib/radar.ts`: `type Abrangencia = 'brasil' | 'estados' | 'municipios'`; `type RascunhoRadar = { termos: string[]; termosExcluir: string[]; abrangencia: Abrangencia; ufs: string[]; municipios: Cidade[]; valorMin: string; valorMax: string; modalidades: number[]; soMeEpp: boolean }`; `rascunhoDoRadar(r: Radar | null, cidades: Cidade[]): RascunhoRadar`; `lerValorReais(t: string): number | null | 'invalido'`; `erroDaEtapa(d: RascunhoRadar, etapa: 1 | 2 | 3): string | null`; `corpoDoRascunho(d: RascunhoRadar, o: { pular: boolean }): Radar`; `adicionarTermos(atuais: readonly string[], texto: string, max: number, tamanho?: number): string[]`; `sugestoesTermos(digitado: string, escolhidos: readonly string[], limite?: number): string[]`; `lerBuscaMunicipio(q: string | null): string | null`.
  - `lib/servidor/municipios.ts`: `buscarMunicipios(q: string): Promise<Cidade[]>`; `municipiosPorIbge(ibges: readonly string[]): Promise<Cidade[]>`.
  - `GET /api/municipios?q=` → `200 Cidade[]` (cache público; q inválido → `[]`).
  - `POST /api/radar` (corpo `Radar`) → `200 { ok: true }` | `401 { erro }` | `400 { erro }` | `502 { erro }`.
  - `<FormRadar modo="comecar" | "editar" inicial={RascunhoRadar} />`.

- [ ] **Step 1: Regras do formulário (testes falhando)**

Acrescente ao fim de `lib/radar.test.ts` (e inclua no import do topo: `adicionarTermos, corpoDoRascunho, erroDaEtapa, lerBuscaMunicipio, lerValorReais, rascunhoDoRadar, sugestoesTermos, type RascunhoRadar`):
```ts
describe('formulário do radar', () => {
  const VAZIO: RascunhoRadar = rascunhoDoRadar(null, []);
  it('rascunho vazio: Todo o Brasil, sem nada escolhido', () => {
    expect(VAZIO).toEqual({ termos: [], termosExcluir: [], abrangencia: 'brasil', ufs: [], municipios: [], valorMin: '', valorMax: '', modalidades: [], soMeEpp: false });
  });
  it('rascunho de um radar salvo (municípios na ordem do radar, valores formatados)', () => {
    const cidades = [{ ibge: '4205407', nome: 'Florianópolis', uf: 'SC' }, { ibge: '4209102', nome: 'Joinville', uf: 'SC' }];
    const r: Radar = { ...BASE, municipios: ['4209102', '4205407'], valorMin: 1500000, valorMax: null, soMeEpp: true };
    expect(rascunhoDoRadar(r, cidades)).toMatchObject({
      abrangencia: 'municipios', municipios: [cidades[1], cidades[0]], valorMin: '1.500.000', valorMax: '', soMeEpp: true,
    });
    expect(rascunhoDoRadar({ ...BASE, ufs: ['SC'] }, []).abrangencia).toBe('estados');
  });
  it('lerValorReais aceita "R$ 1.500.000,00", vazio é sem limite', () => {
    expect(lerValorReais('R$ 1.500.000,00')).toBe(1500000);
    expect(lerValorReais('50000')).toBe(50000);
    expect(lerValorReais('  ')).toBeNull();
    expect(lerValorReais('mil')).toBe('invalido');
    expect(lerValorReais('-5')).toBe('invalido');
  });
  it('erros por etapa', () => {
    expect(erroDaEtapa(VAZIO, 1)).toBe(MENSAGENS_RADAR.semTermo);
    const d = { ...VAZIO, termos: ['luva'] };
    expect(erroDaEtapa(d, 1)).toBeNull();
    expect(erroDaEtapa({ ...d, abrangencia: 'estados' }, 2)).toBe(MENSAGENS_RADAR.semEstado);
    expect(erroDaEtapa({ ...d, abrangencia: 'municipios' }, 2)).toBe(MENSAGENS_RADAR.semMunicipio);
    expect(erroDaEtapa(d, 2)).toBeNull();
    expect(erroDaEtapa({ ...d, valorMin: 'mil' }, 3)).toBe(MENSAGENS_RADAR.valor);
    expect(erroDaEtapa({ ...d, valorMin: '500000', valorMax: '1000' }, 3)).toBe(MENSAGENS_RADAR.faixa);
    expect(erroDaEtapa({ ...d, valorMin: '1000', valorMax: '500000' }, 3)).toBeNull();
  });
  it('corpo enviado: só a área escolhida; "Pular" limpa a etapa 3', () => {
    const d: RascunhoRadar = {
      ...VAZIO, termos: ['luva'], termosExcluir: ['latex'], abrangencia: 'brasil', ufs: ['SC'],
      municipios: [{ ibge: '4209102', nome: 'Joinville', uf: 'SC' }], valorMin: '1000', valorMax: '', modalidades: [6], soMeEpp: true,
    };
    expect(corpoDoRascunho(d, { pular: false })).toEqual({
      termos: ['luva'], termosExcluir: ['latex'], ufs: [], municipios: [], valorMin: 1000, valorMax: null, modalidades: [6], soMeEpp: true,
    });
    expect(corpoDoRascunho({ ...d, abrangencia: 'municipios' }, { pular: true })).toEqual({
      termos: ['luva'], termosExcluir: [], ufs: [], municipios: ['4209102'], valorMin: null, valorMax: null, modalidades: [], soMeEpp: false,
    });
    expect(corpoDoRascunho({ ...d, abrangencia: 'estados' }, { pular: true }).ufs).toEqual(['SC']);
  });
  it('adicionarTermos separa por vírgula, tira repetidos e inválidos e respeita o teto', () => {
    expect(adicionarTermos(['luva'], 'Luvas, botina, ti, -capacete', 10)).toEqual(['luva', 'botina', 'capacete']);
    expect(adicionarTermos(['a1x', 'b2x'], 'cimento, areia', 3)).toEqual(['a1x', 'b2x', 'cimento']);
  });
  it('sugestões do catálogo de termos: começo primeiro, sem os já escolhidos', () => {
    const s = sugestoesTermos('unif', []);
    expect(s[0]).toBe('uniforme');
    expect(sugestoesTermos('unif', ['Uniforme'])).not.toContain('uniforme');
    expect(sugestoesTermos('luva', []).slice(0, 3)).toEqual(['luva', 'luva nitrílica', 'luva de vaqueta']);
    expect(sugestoesTermos('l', [])).toEqual([]);
    expect(sugestoesTermos('xyzw', [])).toEqual([]);
    expect(sugestoesTermos('a', [], 3).length).toBe(0);
  });
  it('busca de município: letras, espaço, hífen e apóstrofo; 2 a 60 caracteres', () => {
    expect(lerBuscaMunicipio('  São   José ')).toBe('São José');
    expect(lerBuscaMunicipio("Pau-d'Arco")).toBe("Pau-d'Arco");
    for (const q of [null, '', 'a', 'x%', 'abc_', 'a'.repeat(61), '12']) expect(lerBuscaMunicipio(q)).toBeNull();
  });
});
```

Run: `npx vitest run lib/radar.test.ts`
Expected: FAIL (funções novas não existem).

- [ ] **Step 2: Implementar as regras do formulário**

Em `lib/radar.ts`, acrescente aos imports `import { GRUPOS } from './relevancia/termos';` (junto dos demais de `./relevancia/termos`) e `import type { Cidade } from './tipos';` (junto de `Ordem`), e ao fim do arquivo:
```ts
// ── Formulário (onboarding e edição) ────────────────────────────────────────────────────────────────────────────

export type Abrangencia = 'brasil' | 'estados' | 'municipios';

/** O que a tela edita: valores como digitados (texto) e municípios com nome, para os chips. */
export type RascunhoRadar = {
  termos: string[];
  termosExcluir: string[];
  abrangencia: Abrangencia;
  ufs: string[];
  municipios: Cidade[];
  valorMin: string;
  valorMax: string;
  modalidades: number[];
  soMeEpp: boolean;
};

const formatoReais = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

export function rascunhoDoRadar(r: Radar | null, cidades: Cidade[]): RascunhoRadar {
  if (!r) {
    return { termos: [], termosExcluir: [], abrangencia: 'brasil', ufs: [], municipios: [], valorMin: '', valorMax: '', modalidades: [], soMeEpp: false };
  }
  const porIbge = new Map(cidades.map((c) => [c.ibge, c]));
  return {
    termos: r.termos,
    termosExcluir: r.termosExcluir,
    abrangencia: r.municipios.length ? 'municipios' : r.ufs.length ? 'estados' : 'brasil',
    ufs: r.ufs,
    municipios: r.municipios.map((i) => porIbge.get(i)).filter((c): c is Cidade => Boolean(c)),
    valorMin: r.valorMin === null ? '' : formatoReais.format(r.valorMin),
    valorMax: r.valorMax === null ? '' : formatoReais.format(r.valorMax),
    modalidades: r.modalidades,
    soMeEpp: r.soMeEpp,
  };
}

/** "R$ 1.500.000,00" → 1500000; vazio → null (sem limite); o resto → 'invalido'. */
export function lerValorReais(t: string): number | null | 'invalido' {
  const limpo = t.replace(/R\$|\s|\./g, '').replace(',', '.');
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) && n >= 0 && n <= LIMITES_RADAR.valorMaximo ? Math.round(n) : 'invalido';
}

export function erroDaEtapa(d: RascunhoRadar, etapa: 1 | 2 | 3): string | null {
  if (etapa === 1) return d.termos.length === 0 ? MENSAGENS_RADAR.semTermo : null;
  if (etapa === 2) {
    if (d.abrangencia === 'estados' && d.ufs.length === 0) return MENSAGENS_RADAR.semEstado;
    if (d.abrangencia === 'municipios' && d.municipios.length === 0) return MENSAGENS_RADAR.semMunicipio;
    return null;
  }
  const min = lerValorReais(d.valorMin);
  const max = lerValorReais(d.valorMax);
  if (min === 'invalido' || max === 'invalido') return MENSAGENS_RADAR.valor;
  if (min !== null && max !== null && min > max) return MENSAGENS_RADAR.faixa;
  return null;
}

const comoNumero = (v: number | null | 'invalido') => (v === 'invalido' ? null : v);

/** Rascunho → corpo de POST /api/radar (o servidor valida de novo). "Pular" deixa a etapa 3 em branco. */
export function corpoDoRascunho(d: RascunhoRadar, o: { pular: boolean }): Radar {
  return {
    termos: d.termos,
    termosExcluir: o.pular ? [] : d.termosExcluir,
    ufs: d.abrangencia === 'estados' ? d.ufs : [],
    municipios: d.abrangencia === 'municipios' ? d.municipios.map((c) => c.ibge) : [],
    valorMin: o.pular ? null : comoNumero(lerValorReais(d.valorMin)),
    valorMax: o.pular ? null : comoNumero(lerValorReais(d.valorMax)),
    modalidades: o.pular ? [] : d.modalidades,
    soMeEpp: o.pular ? false : d.soMeEpp,
  };
}

/** Acrescenta o digitado aos chips: separa por vírgula, tira hífen, repetidos (pela chave) e o que não vale. */
export function adicionarTermos(atuais: readonly string[], texto: string, max: number, tamanho: number = LIMITES_RADAR.tamanhoTermo): string[] {
  const saida = [...atuais];
  const vistos = new Set(atuais.map(chave));
  for (const g of gruposDigitados(texto)) {
    const t = g.replace(/^-+/, '').trim();
    if (saida.length >= max) break;
    if (!t || t.length > tamanho || !palavraValida(t) || vistos.has(chave(t))) continue;
    vistos.add(chave(t));
    saida.push(t);
  }
  return saida;
}

const CATALOGO: readonly string[] = [...new Set(GRUPOS.flatMap((g) => g.termos))];

/** Termos do catálogo (lib/relevancia/termos.ts) que começam como o digitado; depois, os que têm uma palavra assim. */
export function sugestoesTermos(digitado: string, escolhidos: readonly string[], limite = 6): string[] {
  const k = chave(digitado);
  if (k.length < 2) return [];
  const ja = new Set(escolhidos.map(chave));
  const livres = CATALOGO.filter((t) => !ja.has(chave(t)));
  const comeca = livres.filter((t) => chave(t).startsWith(k));
  const palavra = livres.filter((t) => !chave(t).startsWith(k) && chave(t).includes(` ${k}`));
  return [...comeca, ...palavra].slice(0, limite);
}

/** Texto da busca de município (vai para buscar_municipios por ilike: nada de % ou _). */
export function lerBuscaMunicipio(q: string | null): string | null {
  const t = (q ?? '').trim().replace(/\s+/g, ' ');
  return t.length >= 2 && t.length <= 60 && /^[\p{L}' -]+$/u.test(t) ? t : null;
}
```

Run: `npx vitest run lib/radar.test.ts`
Expected: PASS (as sugestões seguem a ordem de `GRUPOS`: "luva", "luva nitrílica", "luva de vaqueta", depois "luva de procedimento").

- [ ] **Step 3: Rotas (testes falhando)**

Crie `lib/servidor/municipios.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const m = vi.hoisted(() => ({ chamadas: [] as unknown[][], dados: [] as unknown }));
vi.mock('./supabase', () => ({
  supabaseServidor: () => ({
    rpc: (nome: string, args: unknown) => {
      m.chamadas.push(['rpc', nome, args]);
      return Promise.resolve({ data: m.dados, error: null });
    },
    from: (t: string) => ({
      select: () => ({
        in: (coluna: string, valores: unknown) => {
          m.chamadas.push(['in', t, coluna, valores]);
          return Promise.resolve({ data: m.dados, error: null });
        },
      }),
    }),
  }),
}));

const { buscarMunicipios, municipiosPorIbge } = await import('./municipios');

beforeEach(() => {
  m.chamadas.length = 0;
});

describe('municípios', () => {
  it('buscarMunicipios chama buscar_municipios com até 10', async () => {
    m.dados = [{ codigo_ibge: '4209102', nome: 'Joinville', uf: 'SC' }];
    expect(await buscarMunicipios('Joinv')).toEqual([{ ibge: '4209102', nome: 'Joinville', uf: 'SC' }]);
    expect(m.chamadas[0]).toEqual(['rpc', 'buscar_municipios', { q: 'Joinv', p_limite: 10 }]);
  });
  it('municipiosPorIbge: na ordem pedida; lista vazia não consulta', async () => {
    m.dados = [{ codigo_ibge: '4205407', nome: 'Florianópolis', uf: 'SC' }, { codigo_ibge: '4209102', nome: 'Joinville', uf: 'SC' }];
    expect((await municipiosPorIbge(['4209102', '4205407'])).map((c) => c.nome)).toEqual(['Joinville', 'Florianópolis']);
    m.chamadas.length = 0;
    expect(await municipiosPorIbge([])).toEqual([]);
    expect(m.chamadas).toHaveLength(0);
  });
});
```

Crie `app/api/municipios/route.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ buscarMunicipios: vi.fn() }));
vi.mock('@/lib/servidor/municipios', () => ({ buscarMunicipios: m.buscarMunicipios }));
const { GET } = await import('./route');

beforeEach(() => {
  m.buscarMunicipios.mockReset();
  m.buscarMunicipios.mockResolvedValue([{ ibge: '4209102', nome: 'Joinville', uf: 'SC' }]);
});

describe('/api/municipios', () => {
  it('busca com o texto limpo e cache público', async () => {
    const r = await GET(new Request('http://localhost/api/municipios?q=%20Joinv%20'));
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toContain('s-maxage=300');
    expect(await r.json()).toEqual([{ ibge: '4209102', nome: 'Joinville', uf: 'SC' }]);
    expect(m.buscarMunicipios).toHaveBeenCalledWith('Joinv');
  });
  it('texto curto ou estranho: lista vazia sem consultar', async () => {
    const r = await GET(new Request('http://localhost/api/municipios?q=a%25'));
    expect(await r.json()).toEqual([]);
    expect(m.buscarMunicipios).not.toHaveBeenCalled();
  });
  it('banco fora: 502', async () => {
    m.buscarMunicipios.mockRejectedValue(new Error('fora'));
    expect((await GET(new Request('http://localhost/api/municipios?q=joinv'))).status).toBe(502);
  });
});
```

Crie `app/api/radar/route.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MENSAGENS_RADAR } from '@/lib/radar';

const m = vi.hoisted(() => ({
  usuario: { id: 'u-sessao', email: 'dono@empresa.com.br' } as null | { id: string; email: string },
  salvarRadar: vi.fn(),
}));
vi.mock('@/lib/servidor/sessao', () => ({ usuarioAtual: async () => m.usuario }));
vi.mock('@/lib/servidor/conta', () => ({ salvarRadar: m.salvarRadar }));

const { POST } = await import('./route');
const enviar = (corpo: unknown) =>
  POST(new Request('http://localhost/api/radar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo) }));

beforeEach(() => {
  vi.clearAllMocks();
  m.usuario = { id: 'u-sessao', email: 'dono@empresa.com.br' };
  m.salvarRadar.mockResolvedValue('criado');
});

describe('POST /api/radar', () => {
  it('sem sessão: 401 sem gravar', async () => {
    m.usuario = null;
    const r = await enviar({ termos: ['luva'] });
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ erro: 'Entre para salvar seu radar.' });
    expect(m.salvarRadar).not.toHaveBeenCalled();
  });
  it('grava no usuário da sessão; user_id do corpo é ignorado', async () => {
    const r = await enviar({ termos: ['luva'], ufs: ['SC'], user_id: 'outra-conta' });
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
    const [usuario, radar] = m.salvarRadar.mock.calls[0] as [{ id: string }, Record<string, unknown>];
    expect(usuario.id).toBe('u-sessao');
    expect(radar).not.toHaveProperty('user_id');
    expect(radar).toMatchObject({ termos: ['luva'], ufs: ['SC'] });
  });
  it('radar inválido ou JSON quebrado: 400 com a mensagem', async () => {
    const r = await enviar({ termos: [] });
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ erro: MENSAGENS_RADAR.semTermo });
    expect((await enviar('{x')).status).toBe(400);
    expect(m.salvarRadar).not.toHaveBeenCalled();
  });
  it('banco fora: 502', async () => {
    m.salvarRadar.mockRejectedValue(new Error('fora'));
    expect((await enviar({ termos: ['luva'] })).status).toBe(502);
  });
});
```

Run: `npx vitest run lib/servidor/municipios.test.ts app/api/municipios/route.test.ts app/api/radar/route.test.ts`
Expected: FAIL (módulos não existem).

- [ ] **Step 4: Implementar as rotas e o servidor de municípios**

`lib/servidor/municipios.ts`:
```ts
import 'server-only';
import { criarCache } from '../cache';
import type { Cidade } from '../tipos';
import { supabaseServidor } from './supabase';

const cache = criarCache(60 * 60 * 1000);
type Linha = { codigo_ibge: unknown; nome: unknown; uf: unknown };
const paraCidade = (l: Linha): Cidade => ({ ibge: String(l.codigo_ibge), nome: String(l.nome), uf: String(l.uf) });

/** Municípios pelo nome, sem acento (buscar_municipios, 0014). `q` já limpo por lerBuscaMunicipio. */
export function buscarMunicipios(q: string): Promise<Cidade[]> {
  const k = q.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  return cache(`municipios:${k}`, async () => {
    const { data, error } = await supabaseServidor().rpc('buscar_municipios', { q, p_limite: 10 });
    if (error) throw new Error(`buscar_municipios: ${error.message}`);
    return ((data ?? []) as Linha[]).map(paraCidade);
  });
}

/** Nome e UF dos municípios do radar, na ordem do radar. */
export async function municipiosPorIbge(ibges: readonly string[]): Promise<Cidade[]> {
  if (ibges.length === 0) return [];
  const { data, error } = await supabaseServidor().from('municipios').select('codigo_ibge, nome, uf').in('codigo_ibge', [...ibges]);
  if (error) throw new Error(`municípios: ${error.message}`);
  const porIbge = new Map(((data ?? []) as Linha[]).map((l) => [String(l.codigo_ibge), paraCidade(l)]));
  return ibges.map((i) => porIbge.get(i)).filter((c): c is Cidade => Boolean(c));
}
```

`app/api/municipios/route.ts`:
```ts
import { CACHE_PUBLICO, SEM_CACHE } from '@/lib/http';
import { lerBuscaMunicipio } from '@/lib/radar';
import { buscarMunicipios } from '@/lib/servidor/municipios';

/** Busca de município do onboarding (dado público, sem conta). */
export async function GET(request: Request) {
  const q = lerBuscaMunicipio(new URL(request.url).searchParams.get('q'));
  if (!q) return Response.json([], { headers: CACHE_PUBLICO });
  try {
    return Response.json(await buscarMunicipios(q), { headers: CACHE_PUBLICO });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Não foi possível buscar municípios agora.' }, { status: 502, headers: SEM_CACHE });
  }
}
```

`app/api/radar/route.ts`:
```ts
import { SEM_CACHE } from '@/lib/http';
import { MENSAGENS_RADAR, validarRadar } from '@/lib/radar';
import { salvarRadar } from '@/lib/servidor/conta';
import { usuarioAtual } from '@/lib/servidor/sessao';

/** Salva o radar da conta da sessão. O dono vem só de auth.getUser() (usuarioAtual); o corpo nunca diz de quem é. */
export async function POST(request: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return Response.json({ erro: 'Entre para salvar seu radar.' }, { status: 401, headers: SEM_CACHE });
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: MENSAGENS_RADAR.formulario }, { status: 400, headers: SEM_CACHE });
  }
  const v = validarRadar(corpo);
  if (!v.ok) return Response.json({ erro: v.erro }, { status: 400, headers: SEM_CACHE });
  try {
    await salvarRadar(usuario, v.valor);
    return Response.json({ ok: true }, { headers: SEM_CACHE });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Não foi possível salvar agora. Tente de novo.' }, { status: 502, headers: SEM_CACHE });
  }
}
```

Run: `npx vitest run lib/servidor/municipios.test.ts app/api/municipios/route.test.ts app/api/radar/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Campos do formulário**

`components/radar/CampoTermos.tsx`:
```tsx
'use client';

import { useId, useState, type KeyboardEvent } from 'react';
import { adicionarTermos } from '@/lib/radar';

type Props = {
  rotulo: string;
  ajuda: string;
  termos: string[];
  max: number;
  /** Tamanho máximo de cada termo (produtos 60, palavras excluídas 40). */
  tamanho: number;
  placeholder?: string;
  /** Sugestões do catálogo (só para produtos). */
  sugerir?: (texto: string) => string[];
  aoMudar: (termos: string[]) => void;
};

/** Chips removíveis com campo de texto: Enter ou vírgula acrescenta; Backspace com o campo vazio tira o último. */
export function CampoTermos({ rotulo, ajuda, termos, max, tamanho, placeholder, sugerir, aoMudar }: Props) {
  const id = useId();
  const [texto, setTexto] = useState('');
  const sugestoes = sugerir && texto.trim().length >= 2 ? sugerir(texto) : [];
  const cheio = termos.length >= max;

  function incluir(t: string) {
    aoMudar(adicionarTermos(termos, t, max, tamanho));
    setTexto('');
  }
  function tecla(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (texto.trim()) incluir(texto);
    } else if (e.key === 'Backspace' && !texto && termos.length) {
      aoMudar(termos.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {rotulo}
      </label>
      <p id={`${id}-ajuda`} className="text-[13px] text-ink-muted">
        {ajuda}
      </p>
      {termos.length ? (
        <ul className="flex flex-wrap gap-2">
          {termos.map((t) => (
            <li key={t} className="inline-flex items-center gap-1 rounded-sm bg-pin-soft py-1 pl-3 pr-1 text-sm font-semibold text-pin-strong">
              {t}
              <button
                type="button"
                onClick={() => aoMudar(termos.filter((x) => x !== t))}
                aria-label={`Remover ${t}`}
                className="inline-flex size-8 items-center justify-center rounded-xs hover:bg-raised"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <input
          id={id}
          aria-describedby={`${id}-ajuda`}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={tecla}
          disabled={cheio}
          placeholder={cheio ? `Limite de ${max} atingido` : placeholder}
          autoComplete="off"
          className="h-11 min-w-0 flex-1 rounded-sm border border-line-strong bg-raised px-3 text-[15px] disabled:bg-sunken"
        />
        <button
          type="button"
          onClick={() => texto.trim() && incluir(texto)}
          disabled={cheio}
          className="inline-flex h-11 shrink-0 items-center rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken disabled:opacity-50"
        >
          Adicionar
        </button>
      </div>
      {sugestoes.length ? (
        <div className="flex flex-wrap gap-2" aria-label="Sugestões">
          {sugestoes.map((s) => (
            <button key={s} type="button" onClick={() => incluir(s)} className="rounded-sm border border-line-strong bg-raised px-3 py-1.5 text-sm hover:bg-sunken">
              + {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
```

`components/radar/CampoLocal.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { NOMES_UF } from '@/lib/estados';
import { UFS_ORDENADAS } from '@/lib/filtros';
import { LIMITES_RADAR, type Abrangencia, type RascunhoRadar } from '@/lib/radar';
import type { Cidade } from '@/lib/tipos';

type Props = { valor: Pick<RascunhoRadar, 'abrangencia' | 'ufs' | 'municipios'>; aoMudar: (p: Partial<RascunhoRadar>) => void };

const OPCOES: ReadonlyArray<{ id: Abrangencia; rotulo: string }> = [
  { id: 'brasil', rotulo: 'Todo o Brasil' },
  { id: 'estados', rotulo: 'Estados' },
  { id: 'municipios', rotulo: 'Municípios' },
];
const ESCOLHA = 'inline-flex h-11 cursor-pointer items-center rounded-sm border px-4 text-sm font-semibold';

/** Onde a empresa atende: Todo o Brasil (padrão), estados ou municípios (busca pelo nome em /api/municipios). */
export function CampoLocal({ valor, aoMudar }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Área de atendimento</legend>
        <div className="flex flex-wrap gap-2">
          {OPCOES.map((o) => (
            <label key={o.id} className={`${ESCOLHA} ${valor.abrangencia === o.id ? 'border-pin bg-pin-soft text-pin-strong' : 'border-line-strong bg-raised'}`}>
              <input type="radio" name="abrangencia" value={o.id} checked={valor.abrangencia === o.id} onChange={() => aoMudar({ abrangencia: o.id })} className="sr-only" />
              {o.rotulo}
            </label>
          ))}
        </div>
      </fieldset>
      {valor.abrangencia === 'estados' ? (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Estados</legend>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-9">
            {UFS_ORDENADAS.map((uf) => {
              const marcado = valor.ufs.includes(uf);
              return (
                <button
                  key={uf}
                  type="button"
                  aria-pressed={marcado}
                  title={NOMES_UF[uf]}
                  onClick={() => aoMudar({ ufs: marcado ? valor.ufs.filter((u) => u !== uf) : [...valor.ufs, uf].sort() })}
                  className={`h-11 rounded-sm border font-mono text-sm font-semibold ${marcado ? 'border-pin bg-pin-soft text-pin-strong' : 'border-line-strong bg-raised hover:bg-sunken'}`}
                >
                  {uf}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}
      {valor.abrangencia === 'municipios' ? <BuscaMunicipios escolhidos={valor.municipios} aoMudar={(municipios) => aoMudar({ municipios })} /> : null}
    </div>
  );
}

function BuscaMunicipios({ escolhidos, aoMudar }: { escolhidos: Cidade[]; aoMudar: (c: Cidade[]) => void }) {
  const [texto, setTexto] = useState('');
  const [achados, setAchados] = useState<Cidade[]>([]);
  const [estado, setEstado] = useState<'parado' | 'buscando' | 'erro'>('parado');
  const cheio = escolhidos.length >= LIMITES_RADAR.municipios;

  useEffect(() => {
    const q = texto.trim();
    if (q.length < 2) {
      setAchados([]);
      setEstado('parado');
      return;
    }
    const controle = new AbortController();
    const espera = window.setTimeout(async () => {
      setEstado('buscando');
      try {
        const r = await fetch(`/api/municipios?q=${encodeURIComponent(q)}`, { signal: controle.signal });
        if (!r.ok) throw new Error(String(r.status));
        setAchados((await r.json()) as Cidade[]);
        setEstado('parado');
      } catch {
        if (!controle.signal.aborted) setEstado('erro');
      }
    }, 250);
    return () => {
      controle.abort();
      window.clearTimeout(espera);
    };
  }, [texto]);

  const livres = achados.filter((c) => !escolhidos.some((e) => e.ibge === c.ibge));
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Municípios
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={cheio}
          placeholder={cheio ? `Limite de ${LIMITES_RADAR.municipios} atingido` : 'Digite o nome do município'}
          autoComplete="off"
          className="h-11 rounded-sm border border-line-strong bg-raised px-3 text-[15px] font-normal disabled:bg-sunken"
        />
      </label>
      {estado === 'buscando' ? <p className="text-[13px] text-ink-muted">Buscando…</p> : null}
      {estado === 'erro' ? <p className="text-[13px] text-ink-muted">Não foi possível buscar agora. Tente de novo.</p> : null}
      {livres.length ? (
        <ul className="flex flex-col rounded-sm border border-line bg-raised">
          {livres.map((c) => (
            <li key={c.ibge}>
              <button
                type="button"
                onClick={() => {
                  aoMudar([...escolhidos, c]);
                  setTexto('');
                }}
                className="flex h-11 w-full items-center px-3 text-left text-sm hover:bg-sunken"
              >
                {c.nome}/{c.uf}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {escolhidos.length ? (
        <ul className="flex flex-wrap gap-2">
          {escolhidos.map((c) => (
            <li key={c.ibge} className="inline-flex items-center gap-1 rounded-sm bg-pin-soft py-1 pl-3 pr-1 text-sm font-semibold text-pin-strong">
              {c.nome}/{c.uf}
              <button
                type="button"
                onClick={() => aoMudar(escolhidos.filter((e) => e.ibge !== c.ibge))}
                aria-label={`Remover ${c.nome}/${c.uf}`}
                className="inline-flex size-8 items-center justify-center rounded-xs hover:bg-raised"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 6: Formulário em etapas e página do onboarding**

`components/radar/FormRadar.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { MODALIDADES } from '@/lib/filtros';
import { corpoDoRascunho, erroDaEtapa, LIMITES_RADAR, sugestoesTermos, type RascunhoRadar } from '@/lib/radar';
import { CampoLocal } from './CampoLocal';
import { CampoTermos } from './CampoTermos';

type Etapa = 1 | 2 | 3;
type Props = { modo: 'comecar' | 'editar'; inicial: RascunhoRadar };

const TITULOS: Record<Etapa, string> = { 1: 'O que sua empresa vende?', 2: 'Onde sua empresa atende?', 3: 'Que tipo de oportunidade procura?' };
const PRINCIPAL = 'inline-flex h-12 items-center justify-center rounded-sm bg-pin px-6 text-[15px] font-semibold text-on-pin aria-disabled:opacity-60';
const SECUNDARIO = 'inline-flex h-12 items-center justify-center rounded-sm border border-line-strong bg-raised px-5 text-[15px] font-semibold hover:bg-sunken';
const CAMPO = 'h-11 w-full rounded-sm border border-line-strong bg-raised px-3 text-[15px] font-normal';
const FALHA = 'Não foi possível salvar agora. Tente de novo.';

/**
 * Radar da conta. "comecar": 3 etapas (produtos → onde atende → tipo de oportunidade, com "Pular" na 3ª).
 * "editar": as mesmas seções numa página só. Salvar leva ao Meu Radar.
 */
export function FormRadar({ modo, inicial }: Props) {
  const router = useRouter();
  const [d, setD] = useState<RascunhoRadar>(inicial);
  const [etapa, setEtapa] = useState<Etapa>(1);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const mudar = (parte: Partial<RascunhoRadar>) => {
    setD((x) => ({ ...x, ...parte }));
    setErro(null);
  };

  async function salvar(pular: boolean) {
    if (salvando) return;
    const etapas: Etapa[] = pular ? [1, 2] : [1, 2, 3];
    for (const e of etapas) {
      const msg = erroDaEtapa(d, e);
      if (msg) {
        setErro(msg);
        if (modo === 'comecar') setEtapa(e);
        return;
      }
    }
    setSalvando(true);
    try {
      const r = await fetch('/api/radar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpoDoRascunho(d, { pular })) });
      if (r.status === 401) {
        window.location.assign(`/entrar?voltar=${encodeURIComponent(modo === 'editar' ? '/radar/editar' : '/radar/comecar')}`);
        return;
      }
      const dados = (await r.json().catch(() => ({}))) as { erro?: unknown };
      if (!r.ok) {
        setErro(typeof dados.erro === 'string' ? dados.erro : FALHA);
        setSalvando(false);
        return;
      }
      router.push('/radar');
    } catch {
      setErro(FALHA);
      setSalvando(false);
    }
  }

  function avancar() {
    const msg = erroDaEtapa(d, etapa);
    if (msg) {
      setErro(msg);
      return;
    }
    setEtapa((e) => (e + 1) as Etapa);
  }

  const produtos = (
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
  );
  const local = <CampoLocal valor={d} aoMudar={mudar} />;
  const oportunidade = (
    <div className="flex flex-col gap-5">
      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">Valor estimado (opcional)</legend>
        <label className="flex flex-col gap-1.5 text-[13px] text-ink-muted">
          Mínimo
          <input inputMode="numeric" value={d.valorMin} onChange={(e) => mudar({ valorMin: e.target.value })} placeholder="Sem mínimo" className={CAMPO} />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] text-ink-muted">
          Máximo
          <input inputMode="numeric" value={d.valorMax} onChange={(e) => mudar({ valorMax: e.target.value })} placeholder="Sem máximo" className={CAMPO} />
        </label>
        <p className="text-[13px] text-ink-muted sm:col-span-2">Com valor mínimo ou máximo, editais sem valor informado ficam de fora.</p>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Modalidades (opcional; nenhuma marcada = todas)</legend>
        <div className="flex flex-col gap-1">
          {MODALIDADES.map((mo) => (
            <label key={mo.id} className="flex h-11 items-center gap-3 text-[15px]">
              <input
                type="checkbox"
                checked={d.modalidades.includes(mo.id)}
                onChange={(e) => mudar({ modalidades: e.target.checked ? [...d.modalidades, mo.id] : d.modalidades.filter((x) => x !== mo.id) })}
                className="size-5 accent-[var(--color-pin)]"
              />
              {mo.nome}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-start gap-3 text-[15px]">
        <input type="checkbox" checked={d.soMeEpp} onChange={(e) => mudar({ soMeEpp: e.target.checked })} className="mt-0.5 size-5 accent-[var(--color-pin)]" />
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
  const aviso = erro ? (
    <p role="alert" className="text-sm font-semibold text-pin-strong">
      {erro}
    </p>
  ) : null;

  if (modo === 'editar') {
    return (
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void salvar(false);
        }}
        className="flex flex-col gap-8"
      >
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">Editar meu radar</h1>
        {([1, 2, 3] as const).map((n) => (
          <section key={n} className="flex flex-col gap-4 rounded-md border border-line bg-raised p-4">
            <h2 className="text-lg font-bold">{TITULOS[n]}</h2>
            {n === 1 ? produtos : n === 2 ? local : oportunidade}
          </section>
        ))}
        {aviso}
        <div className="flex flex-wrap gap-2">
          <button type="submit" aria-disabled={salvando || undefined} className={PRINCIPAL}>
            {salvando ? 'Salvando…' : 'Salvar alterações'}
          </button>
          <Link href="/radar" className={SECUNDARIO}>
            Cancelar
          </Link>
        </div>
      </form>
    );
  }

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (etapa < 3) avancar();
        else void salvar(false);
      }}
      className="flex flex-col gap-6"
    >
      <p className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-muted">Etapa {etapa} de 3</p>
      <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">{TITULOS[etapa]}</h1>
      {etapa === 1 ? produtos : etapa === 2 ? local : oportunidade}
      {aviso}
      <div className="flex flex-wrap gap-2">
        {etapa > 1 ? (
          <button
            type="button"
            onClick={() => {
              setErro(null);
              setEtapa((e) => (e - 1) as Etapa);
            }}
            className={SECUNDARIO}
          >
            Voltar
          </button>
        ) : null}
        <button type="submit" aria-disabled={salvando || undefined} className={PRINCIPAL}>
          {etapa < 3 ? 'Continuar' : salvando ? 'Salvando…' : 'Salvar meu radar'}
        </button>
        {etapa === 3 ? (
          <button type="button" onClick={() => void salvar(true)} className={SECUNDARIO}>
            Pular
          </button>
        ) : null}
      </div>
    </form>
  );
}
```
(`--color-pin` é a variável da cor `pin` em `app/globals.css`; nenhuma cor nova.)

`app/radar/comecar/page.tsx`:
```tsx
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { FormRadar } from '@/components/radar/FormRadar';
import { rascunhoDoRadar } from '@/lib/radar';
import { lerRadar } from '@/lib/servidor/conta';
import { usuarioAtual } from '@/lib/servidor/sessao';

export const metadata: Metadata = { title: 'Montar meu radar' };

/** Onboarding (primeiro acesso de uma conta sem radar). Sem sessão → /entrar; com radar → Meu Radar. */
export default async function ComecarRadar() {
  await connection();
  const usuario = await usuarioAtual();
  if (!usuario) redirect('/entrar?voltar=/radar/comecar');
  if (await lerRadar(usuario)) redirect('/radar');
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-4 py-8">
        <FormRadar modo="comecar" inicial={rascunhoDoRadar(null, [])} />
      </main>
    </>
  );
}
```

- [ ] **Step 7: Verificação completa e commit**

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa; o build lista `ƒ /radar/comecar`, `ƒ /api/radar`, `ƒ /api/municipios`.
```bash
git add lib/radar.ts lib/radar.test.ts lib/servidor/municipios.ts lib/servidor/municipios.test.ts app/api/municipios app/api/radar components/radar/CampoTermos.tsx components/radar/CampoLocal.tsx components/radar/FormRadar.tsx app/radar/comecar
git commit -m "feat: onboarding do radar em 3 etapas" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 7: Página Meu Radar (cartões, lista, ordem, páginas, prévia e visita)

**Files:**
- Create: `app/radar/page.tsx`, `app/api/radar/visita/route.ts`, `components/radar/CartoesRadar.tsx`, `components/radar/ResumoRadar.tsx`, `components/radar/NavegacaoRadar.tsx`, `components/radar/CartaoPreviaRadar.tsx`, `components/radar/RegistrarVisitaRadar.tsx`
- Modify: `lib/radar.ts` (navegação, prévia, resumo)
- Test: `lib/radar.test.ts` (acrescentar), `app/api/radar/visita/route.test.ts`, `scripts/radar.test.ts` (guardas da página)

**Interfaces:**
- Consumes: Tasks 1, 5, 6 (`usuarioAtual`, `perfilDaConta`, `lerRadar`, `marcarVisitaRadar`, `editaisDoRadar`, `contagensDoRadar`, `vistaDoRadar`, `desdeDaVisita`, `VISIVEIS_GRATIS`, `municipiosPorIbge`); `CardLista`, `Paginacao`, `SeletorOrdem`; `contextoDaPagina` (registro); `usoDoDia` (uso); `paraUrlSearchParams` (urlBusca); `lerOrdem`, `MAX_PAGINA`, `MODALIDADES`, `ordemEfetiva` (filtros); `moeda`, `numero` (formato).
- Produces:
  - `lib/radar.ts`: `type NavegacaoRadar = { ordem: Ordem | null; pagina: number }`; `lerNavegacaoRadar(p: URLSearchParams): NavegacaoRadar`; `urlDoRadar(n: NavegacaoRadar): string`; `textoPrevia(total: number): string`; `resumoDoRadar(r: Radar, cidades: Cidade[]): { produtos: string[]; local: string; extras: string[] }`.
  - `POST /api/radar/visita` → `204` | `401`.
  - Página `/radar`.

- [ ] **Step 1: Testes (falhando)**

Acrescente ao fim de `lib/radar.test.ts` (e ao import: `lerNavegacaoRadar, resumoDoRadar, textoPrevia, urlDoRadar`; e `import { moeda } from './formato';`):
```ts
describe('navegação, prévia e resumo do radar', () => {
  it('ordem e página do endereço; relevância e página 1 ficam fora do endereço', () => {
    expect(lerNavegacaoRadar(new URLSearchParams('ordem=recentes&pagina=3'))).toEqual({ ordem: 'recentes', pagina: 3 });
    expect(lerNavegacaoRadar(new URLSearchParams('ordem=xx&pagina=-1'))).toEqual({ ordem: null, pagina: 1 });
    expect(urlDoRadar({ ordem: 'relevancia', pagina: 1 })).toBe('/radar');
    expect(urlDoRadar({ ordem: null, pagina: 2 })).toBe('/radar?pagina=2');
    expect(urlDoRadar({ ordem: 'menor_valor', pagina: 4 })).toBe('/radar?ordem=menor_valor&pagina=4');
  });
  it('texto da prévia', () => {
    expect(textoPrevia(1234)).toBe('Você está vendo 5 de 1.234 oportunidades do seu perfil.');
  });
  it('resumo: produtos, área e extras', () => {
    const cidades = [{ ibge: '4209102', nome: 'Joinville', uf: 'SC' }, { ibge: '4205407', nome: 'Florianópolis', uf: 'SC' },
      { ibge: '4202404', nome: 'Blumenau', uf: 'SC' }, { ibge: '4204202', nome: 'Chapecó', uf: 'SC' }];
    expect(resumoDoRadar(BASE, [])).toEqual({ produtos: ['uniforme'], local: 'Todo o Brasil', extras: [] });
    expect(resumoDoRadar({ ...BASE, ufs: ['PR', 'SC'] }, []).local).toBe('Estados: PR, SC');
    expect(resumoDoRadar({ ...BASE, municipios: cidades.map((c) => c.ibge) }, cidades).local).toBe('Municípios: Joinville/SC, Florianópolis/SC, Blumenau/SC e mais 1');
    const r = resumoDoRadar({ ...BASE, valorMin: 10000, valorMax: 500000, modalidades: [6, 8], soMeEpp: true, termosExcluir: ['escolar'] }, []);
    expect(r.extras).toEqual([`De ${moeda(10000)} a ${moeda(500000)}`, 'Pregão eletrônico, Dispensa', 'Só exclusivas para ME/EPP', 'Sem: escolar']);
    expect(resumoDoRadar({ ...BASE, valorMin: 10000 }, []).extras).toEqual([`A partir de ${moeda(10000)}`]);
    expect(resumoDoRadar({ ...BASE, valorMax: 9000 }, []).extras).toEqual([`Até ${moeda(9000)}`]);
  });
});
```

Crie `app/api/radar/visita/route.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ usuario: null as null | { id: string; email: string }, marcarVisitaRadar: vi.fn() }));
vi.mock('@/lib/servidor/sessao', () => ({ usuarioAtual: async () => m.usuario }));
vi.mock('@/lib/servidor/conta', () => ({ marcarVisitaRadar: m.marcarVisitaRadar }));
const { POST } = await import('./route');

beforeEach(() => {
  vi.clearAllMocks();
  m.usuario = null;
  m.marcarVisitaRadar.mockResolvedValue(undefined);
});

describe('POST /api/radar/visita', () => {
  it('sem sessão: 401', async () => {
    expect((await POST()).status).toBe(401);
    expect(m.marcarVisitaRadar).not.toHaveBeenCalled();
  });
  it('com sessão: grava a visita do usuário da sessão', async () => {
    m.usuario = { id: 'u-sessao', email: 'a@b.co' };
    expect((await POST()).status).toBe(204);
    expect(m.marcarVisitaRadar).toHaveBeenCalledWith(m.usuario);
  });
  it('banco fora: 502', async () => {
    m.usuario = { id: 'u-sessao', email: 'a@b.co' };
    m.marcarVisitaRadar.mockRejectedValue(new Error('fora'));
    expect((await POST()).status).toBe(502);
  });
});
```

Crie `scripts/radar.test.ts`:
```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

describe('página Meu Radar', () => {
  const pagina = ler('app/radar/page.tsx');
  it('exige conta e manda quem não tem radar para o onboarding', () => {
    expect(pagina).toContain('await usuarioAtual()');
    expect(pagina).toContain("redirect('/entrar?voltar=/radar')");
    expect(pagina).toContain("redirect('/radar/comecar')");
  });
  it('não conta busca do grátis (o radar é o perfil, não uma busca avulsa)', () => {
    expect(pagina).not.toContain('decidirBusca');
    expect(pagina).not.toContain('registrar_uso');
  });
  it('prévia de 5 no grátis com o cartão dos planos; páginas só fora da prévia', () => {
    expect(pagina).toContain('vistaDoRadar(');
    expect(pagina).toContain('<CartaoPreviaRadar');
    expect(pagina).toMatch(/!vista\.previa \? \(\s*<PaginacaoRadar/);
  });
  it('lista com os cards da Fase 2 e a visita registrada ao sair', () => {
    expect(pagina).toContain('<CardLista');
    expect(pagina).toContain('<RegistrarVisitaRadar />');
    expect(ler('components/radar/RegistrarVisitaRadar.tsx')).toContain("navigator.sendBeacon('/api/radar/visita')");
  });
});
```

Run: `npx vitest run lib/radar.test.ts app/api/radar/visita/route.test.ts scripts/radar.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implementar as regras puras**

Em `lib/radar.ts`, acrescente aos imports `lerOrdem, MAX_PAGINA` (de `./filtros`) e `import { moeda, numero } from './formato';`, e ao fim do arquivo:
```ts
// ── Página Meu Radar ────────────────────────────────────────────────────────────────────────────────────────────

export type NavegacaoRadar = { ordem: Ordem | null; pagina: number };

export function lerNavegacaoRadar(p: URLSearchParams): NavegacaoRadar {
  const pg = Number(p.get('pagina') ?? 1);
  return { ordem: lerOrdem(p.get('ordem')), pagina: Number.isInteger(pg) && pg >= 1 && pg <= MAX_PAGINA ? pg : 1 };
}

/** Endereço do radar; a ordem padrão (relevância) e a página 1 ficam fora. */
export function urlDoRadar(n: NavegacaoRadar): string {
  const p = new URLSearchParams();
  if (n.ordem && n.ordem !== 'relevancia') p.set('ordem', n.ordem);
  if (n.pagina > 1) p.set('pagina', String(n.pagina));
  const s = p.toString();
  return s ? `/radar?${s}` : '/radar';
}

export function textoPrevia(total: number): string {
  return `Você está vendo ${VISIVEIS_GRATIS} de ${numero(total)} oportunidades do seu perfil.`;
}

const listaCurta = (itens: string[], n: number) => (itens.length <= n ? itens.join(', ') : `${itens.slice(0, n).join(', ')} e mais ${itens.length - n}`);

/** O que o radar monitora, em texto curto, para o topo do Meu Radar. */
export function resumoDoRadar(r: Radar, cidades: Cidade[]): { produtos: string[]; local: string; extras: string[] } {
  const local = r.municipios.length
    ? `Municípios: ${listaCurta(cidades.map((c) => `${c.nome}/${c.uf}`), 3)}`
    : r.ufs.length
      ? `Estados: ${r.ufs.join(', ')}`
      : 'Todo o Brasil';
  const extras: string[] = [];
  if (r.valorMin !== null && r.valorMax !== null) extras.push(`De ${moeda(r.valorMin)} a ${moeda(r.valorMax)}`);
  else if (r.valorMin !== null) extras.push(`A partir de ${moeda(r.valorMin)}`);
  else if (r.valorMax !== null) extras.push(`Até ${moeda(r.valorMax)}`);
  if (r.modalidades.length) extras.push(MODALIDADES.filter((m) => r.modalidades.includes(m.id)).map((m) => m.nome).join(', '));
  if (r.soMeEpp) extras.push('Só exclusivas para ME/EPP');
  if (r.termosExcluir.length) extras.push(`Sem: ${r.termosExcluir.join(', ')}`);
  return { produtos: r.termos, local, extras };
}
```

`app/api/radar/visita/route.ts`:
```ts
import { SEM_CACHE } from '@/lib/http';
import { marcarVisitaRadar } from '@/lib/servidor/conta';
import { usuarioAtual } from '@/lib/servidor/sessao';

/** Grava a visita ao Meu Radar (navigator.sendBeacon ao sair da página): "Novas" passa a contar daqui. */
export async function POST() {
  const usuario = await usuarioAtual();
  if (!usuario) return new Response(null, { status: 401, headers: SEM_CACHE });
  try {
    await marcarVisitaRadar(usuario);
    return new Response(null, { status: 204, headers: SEM_CACHE });
  } catch (erro) {
    console.error(erro);
    return new Response(null, { status: 502, headers: SEM_CACHE });
  }
}
```

- [ ] **Step 3: Componentes da página**

`components/radar/CartoesRadar.tsx`:
```tsx
import { numero } from '@/lib/formato';
import type { ContagensRadar } from '@/lib/radar';

/** Três cartões com contagens reais do radar (no máximo 4; "Editais salvos" entra na Fase 4). */
export function CartoesRadar({ contagens, primeiraVisita }: { contagens: ContagensRadar; primeiraVisita: boolean }) {
  const cartoes = [
    { rotulo: 'Oportunidades para o seu perfil', valor: contagens.total, nota: 'Editais abertos que combinam com o seu radar' },
    { rotulo: primeiraVisita ? 'Novas nas últimas 24 horas' : 'Novas desde a sua última visita', valor: contagens.novas, nota: 'Publicadas no PNCP' },
    { rotulo: 'Prazo próximo', valor: contagens.prazoProximo, nota: 'Encerram em até 7 dias' },
  ];
  return (
    <section aria-label="Resumo do radar" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cartoes.map((c) => (
        <div key={c.rotulo} className="flex flex-col gap-1 rounded-md border border-line bg-raised p-4">
          <p className="text-[13px] font-semibold text-ink-muted">{c.rotulo}</p>
          <p className="font-mono text-[28px] font-semibold leading-none">{numero(c.valor)}</p>
          <p className="text-xs text-ink-muted">{c.nota}</p>
        </div>
      ))}
    </section>
  );
}
```

`components/radar/ResumoRadar.tsx`:
```tsx
import Link from 'next/link';
import { resumoDoRadar, type Radar } from '@/lib/radar';
import type { Cidade } from '@/lib/tipos';

/** O que o radar monitora (produtos, área e filtros), com o atalho para editar. */
export function ResumoRadar({ radar, cidades }: { radar: Radar; cidades: Cidade[] }) {
  const r = resumoDoRadar(radar, cidades);
  return (
    <section aria-label="Seu radar" className="flex flex-col gap-2 rounded-md border border-line bg-raised p-4">
      <div className="flex flex-wrap items-center gap-2">
        {r.produtos.map((p) => (
          <span key={p} className="rounded-sm bg-pin-soft px-2.5 py-1 text-sm font-semibold text-pin-strong">
            {p}
          </span>
        ))}
      </div>
      <p className="text-[13px] text-ink-muted">{[r.local, ...r.extras].join(' · ')}</p>
      <Link href="/radar/editar" className="w-fit text-sm font-semibold text-pin-strong underline-offset-2 hover:underline">
        Editar meu radar
      </Link>
    </section>
  );
}
```

`components/radar/NavegacaoRadar.tsx`:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Paginacao } from '@/components/inicio/Paginacao';
import { SeletorOrdem } from '@/components/inicio/SeletorOrdem';
import { urlDoRadar } from '@/lib/radar';
import type { Ordem } from '@/lib/tipos';

/** Ordenar o radar não conta busca (o radar é o perfil). Volta para a página 1. */
export function OrdemRadar({ ordem }: { ordem: Ordem }) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  return <SeletorOrdem ordem={ordem} temTermo aoMudar={(o) => iniciar(() => router.push(urlDoRadar({ ordem: o, pagina: 1 })))} />;
}

/** Páginas de 20 (Basic, Pro e interno). */
export function PaginacaoRadar({ ordem, pagina, total }: { ordem: Ordem; pagina: number; total: number }) {
  const router = useRouter();
  const [carregando, iniciar] = useTransition();
  return (
    <Paginacao
      pagina={pagina}
      total={total}
      carregando={carregando}
      aoIr={(p) =>
        iniciar(() => {
          router.push(urlDoRadar({ ordem, pagina: p }));
          window.scrollTo({ top: 0 });
        })
      }
    />
  );
}
```

`components/radar/CartaoPreviaRadar.tsx`:
```tsx
import Link from 'next/link';
import { textoPrevia } from '@/lib/radar';

/** Grátis: depois dos 5 primeiros, o convite aos planos (o resto do radar fica para Basic e Pro). */
export function CartaoPreviaRadar({ total }: { total: number }) {
  return (
    <section role="status" className="flex flex-col gap-3 rounded-lg border border-pin bg-pin-soft p-5 text-ink">
      <p className="font-mono text-xs font-semibold uppercase tracking-wider text-pin-strong">Prévia do Radar</p>
      <h2 className="text-[17px] font-bold leading-snug">{textoPrevia(total)}</h2>
      <p className="text-[15px] text-ink-muted">Nos planos Basic e Pro o radar mostra todas, em páginas de 20.</p>
      <div className="flex flex-wrap gap-2">
        <Link href="/planos#basic" className="inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-5 text-sm font-semibold hover:bg-sunken">
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

`components/radar/RegistrarVisitaRadar.tsx`:
```tsx
'use client';

import { useEffect } from 'react';

/**
 * Registra a visita ao sair do Meu Radar (fechar a aba, ir a outra página do site): "Novas desde a sua última visita"
 * passa a contar daqui. Trocar ordem ou página não desmonta o componente e não registra.
 */
export function RegistrarVisitaRadar() {
  useEffect(() => {
    let feito = false;
    const registrar = () => {
      if (feito) return;
      feito = true;
      try {
        navigator.sendBeacon('/api/radar/visita');
      } catch {
        // medição secundária
      }
    };
    window.addEventListener('pagehide', registrar);
    return () => {
      window.removeEventListener('pagehide', registrar);
      registrar();
    };
  }, []);
  return null;
}
```

- [ ] **Step 4: A página**

`app/radar/page.tsx`:
```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { CardLista } from '@/components/inicio/CardLista';
import { CartaoPreviaRadar } from '@/components/radar/CartaoPreviaRadar';
import { CartoesRadar } from '@/components/radar/CartoesRadar';
import { OrdemRadar, PaginacaoRadar } from '@/components/radar/NavegacaoRadar';
import { RegistrarVisitaRadar } from '@/components/radar/RegistrarVisitaRadar';
import { ResumoRadar } from '@/components/radar/ResumoRadar';
import { ordemEfetiva } from '@/lib/filtros';
import { desdeDaVisita, lerNavegacaoRadar, VISIVEIS_GRATIS, vistaDoRadar } from '@/lib/radar';
import { lerRadar, perfilDaConta } from '@/lib/servidor/conta';
import { municipiosPorIbge } from '@/lib/servidor/municipios';
import { contagensDoRadar, editaisDoRadar } from '@/lib/servidor/radar';
import { contextoDaPagina } from '@/lib/servidor/registro';
import { usuarioAtual } from '@/lib/servidor/sessao';
import { usoDoDia } from '@/lib/servidor/uso';
import { paraUrlSearchParams } from '@/lib/urlBusca';

export const metadata: Metadata = { title: 'Meu Radar' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * Meu Radar: cartões com contagens reais, o perfil e a lista personalizada (mesmos cards, ordens e páginas da busca).
 * Exige conta; sem radar, onboarding. Abrir e ordenar não contam busca do grátis; abrir um edital conta (CardLista).
 * Grátis vê os 5 primeiros e as contagens; o resto fica atrás da "Prévia do Radar".
 */
export default async function MeuRadar({ searchParams }: Props) {
  await connection();
  const usuario = await usuarioAtual();
  if (!usuario) redirect('/entrar?voltar=/radar');
  const [radar, perfil] = await Promise.all([lerRadar(usuario), perfilDaConta(usuario)]);
  if (!radar) redirect('/radar/comecar');

  const nav = lerNavegacaoRadar(paraUrlSearchParams(await searchParams));
  const ctx = await contextoDaPagina();
  const vista = vistaDoRadar(perfil.plano, ctx?.interno ?? false, nav.pagina);
  const agora = new Date();
  const { desde, primeira } = desdeDaVisita(perfil.ultimaVisitaRadar, agora);
  const [contagens, lista, uso, cidades] = await Promise.all([
    contagensDoRadar(radar, desde),
    editaisDoRadar(radar, { ordem: nav.ordem, pagina: vista.pagina, limite: vista.limite }),
    usoDoDia(ctx),
    municipiosPorIbge(radar.municipios),
  ]);
  const ordem = ordemEfetiva(nav.ordem, true);

  return (
    <>
      <Cabecalho uso={uso} />
      <main className="mx-auto flex w-full max-w-[1080px] flex-col gap-5 px-4 py-6 lg:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">Meu Radar</h1>
            <p className="text-sm text-ink-muted">Editais abertos para o que sua empresa vende, atualizados a cada 3 horas.</p>
          </div>
          <Link href="/radar/editar" className="inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken">
            Editar meu radar
          </Link>
        </div>
        <ResumoRadar radar={radar} cidades={cidades} />
        <CartoesRadar contagens={contagens} primeiraVisita={primeira} />
        {lista.total === 0 ? (
          <section className="flex flex-col gap-2 rounded-md border border-line bg-raised p-5">
            <h2 className="text-[17px] font-bold">Nenhum edital aberto para o seu radar agora.</h2>
            <p className="text-[15px] text-ink-muted">Novos editais entram a cada 3 horas. Você também pode ampliar o radar com mais produtos ou outra área.</p>
            <Link href="/radar/editar" className="w-fit text-sm font-semibold text-pin-strong underline-offset-2 hover:underline">
              Editar meu radar
            </Link>
          </section>
        ) : (
          <section aria-label="Oportunidades do seu radar" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[17px] font-bold">Oportunidades para o seu perfil</h2>
              <OrdemRadar ordem={ordem} />
            </div>
            {lista.editais.map((e) => (
              <CardLista key={e.id} edital={e} agora={agora} />
            ))}
            {vista.previa && lista.total > VISIVEIS_GRATIS ? <CartaoPreviaRadar total={lista.total} /> : null}
            {!vista.previa ? (
              <PaginacaoRadar ordem={ordem} pagina={vista.pagina} total={lista.total} />
            ) : null}
          </section>
        )}
        <RegistrarVisitaRadar />
      </main>
    </>
  );
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run lib/radar.test.ts app/api/radar/visita/route.test.ts scripts/radar.test.ts scripts/prefetch-edital.test.ts`
Expected: PASS.

- [ ] **Step 6: Verificação completa e commit**

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa; o build lista `ƒ /radar` e `ƒ /api/radar/visita`.
```bash
git add lib/radar.ts lib/radar.test.ts app/radar/page.tsx app/api/radar/visita components/radar/CartoesRadar.tsx components/radar/ResumoRadar.tsx components/radar/NavegacaoRadar.tsx components/radar/CartaoPreviaRadar.tsx components/radar/RegistrarVisitaRadar.tsx scripts/radar.test.ts
git commit -m "feat: página Meu Radar com cartões, lista pelo perfil e prévia do grátis" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 8: Editar radar (/radar/editar)

**Files:**
- Create: `app/radar/editar/page.tsx`
- Modify: `scripts/radar.test.ts`

**Interfaces:**
- Consumes: `FormRadar` (modo `editar`), `rascunhoDoRadar`, `lerRadar`, `municipiosPorIbge`, `usuarioAtual`.
- Produces: página `/radar/editar` (mesmas etapas numa página só; salvar leva ao Meu Radar).

- [ ] **Step 1: Guarda (falhando)**

Acrescente ao fim de `scripts/radar.test.ts`:
```ts
describe('editar radar', () => {
  const pagina = ler('app/radar/editar/page.tsx');
  it('exige conta; sem radar vai ao onboarding; formulário no modo editar com os municípios pelo nome', () => {
    expect(pagina).toContain('await usuarioAtual()');
    expect(pagina).toContain("redirect('/entrar?voltar=/radar/editar')");
    expect(pagina).toContain("redirect('/radar/comecar')");
    expect(pagina).toContain('<FormRadar modo="editar"');
    expect(pagina).toContain('municipiosPorIbge(radar.municipios)');
  });
});
```

Run: `npx vitest run scripts/radar.test.ts`
Expected: FAIL (arquivo não existe).

- [ ] **Step 2: Implementar**

`app/radar/editar/page.tsx`:
```tsx
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { FormRadar } from '@/components/radar/FormRadar';
import { rascunhoDoRadar } from '@/lib/radar';
import { lerRadar } from '@/lib/servidor/conta';
import { municipiosPorIbge } from '@/lib/servidor/municipios';
import { usuarioAtual } from '@/lib/servidor/sessao';

export const metadata: Metadata = { title: 'Editar meu radar' };

/** As três etapas do onboarding numa página só, preenchidas com o radar salvo. */
export default async function EditarRadar() {
  await connection();
  const usuario = await usuarioAtual();
  if (!usuario) redirect('/entrar?voltar=/radar/editar');
  const radar = await lerRadar(usuario);
  if (!radar) redirect('/radar/comecar');
  const cidades = await municipiosPorIbge(radar.municipios);
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-8">
        <FormRadar modo="editar" inicial={rascunhoDoRadar(radar, cidades)} />
      </main>
    </>
  );
}
```

- [ ] **Step 3: Verificação completa e commit**

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa; o build lista `ƒ /radar/editar`.
```bash
git add app/radar/editar scripts/radar.test.ts
git commit -m "feat: editar o radar" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 9: Eventos, navegação e guardas de isolamento

**Files:**
- Create: `components/AtalhoRadar.tsx`, `scripts/conta.test.ts`
- Modify: `lib/servidor/registro.ts`, `app/api/conta/entrar/route.ts`, `app/api/conta/rotas.test.ts`, `app/api/radar/route.ts`, `app/api/radar/route.test.ts`, `app/radar/page.tsx`, `app/radar/comecar/page.tsx`, `components/Cabecalho.tsx`, `app/page.tsx`

**Interfaces:**
- Consumes: `TIPOS_EVENTO_CONTA`/`TipoEventoConta` (Task 3); `gravarEvento`, `contexto`, `contextoDaPagina` (registro); `lerRadar`, `salvarRadar` (conta); `useConta` (Task 2); `after` de `next/server`.
- Produces: eventos `conta_entrou` `{ radar: 'sim' | 'nao' }`, `onboarding_iniciado` `{}`, `onboarding_concluido` `{ termos, ufs, municipios }`, `radar_visto` `{ total, novas, plano }`; aba "Meu Radar" no cabeçalho do computador; atalho "Ver meu radar" no topo da página inicial do celular; guardas `scripts/conta.test.ts`.

- [ ] **Step 1: Testes (falhando)**

Em `app/api/conta/rotas.test.ts`:
1. Dentro do `vi.hoisted`, acrescente `gravarEvento: vi.fn(async (..._a: unknown[]) => undefined), lerRadar: vi.fn(),`.
2. Logo depois do `vi.mock('@/lib/servidor/sessao', …)`, acrescente:
```ts
vi.mock('@/lib/servidor/registro', () => ({
  contexto: async () => ({ visitante: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b', interno: false, ipHash: null }),
  gravarEvento: m.gravarEvento,
}));
vi.mock('@/lib/servidor/conta', () => ({ lerRadar: m.lerRadar }));
```
3. No `beforeEach`, acrescente `m.lerRadar.mockResolvedValue(null);`.
4. Dentro de `describe('POST /api/conta/entrar', …)`, acrescente:
```ts
  it('grava conta_entrou sem e-mail, dizendo se a conta já tem radar', async () => {
    m.lerRadar.mockResolvedValue({ termos: ['luva'] });
    await entrar.POST(post({ email: 'dono@empresa.com.br', codigo: '123456' }));
    expect(m.gravarEvento).toHaveBeenCalledWith(expect.objectContaining({ interno: false }), 'conta_entrou', { radar: 'sim' });
    expect(JSON.stringify(m.gravarEvento.mock.calls)).not.toContain('@');
  });
  it('falha ao gravar o evento não impede de entrar', async () => {
    m.gravarEvento.mockRejectedValue(new Error('fora'));
    expect((await entrar.POST(post({ email: 'a@b.co', codigo: '123456' }))).status).toBe(200);
  });
  it('código errado não grava evento', async () => {
    m.entrarComCodigo.mockResolvedValue({ ok: false, erro: { code: 'otp_expired', status: 403 } });
    await entrar.POST(post({ email: 'a@b.co', codigo: '000000' }));
    expect(m.gravarEvento).not.toHaveBeenCalled();
  });
```

Em `app/api/radar/route.test.ts`:
1. Dentro do `vi.hoisted`, acrescente `gravarEvento: vi.fn(async (..._a: unknown[]) => undefined),`.
2. Logo depois dos `vi.mock` existentes, acrescente:
```ts
vi.mock('@/lib/servidor/registro', () => ({
  contexto: async () => ({ visitante: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b', interno: false, ipHash: null }),
  gravarEvento: m.gravarEvento,
}));
```
3. Dentro de `describe('POST /api/radar', …)`, acrescente:
```ts
  it('radar novo: onboarding_concluido com as contagens (sem e-mail nem termos)', async () => {
    await enviar({ termos: ['luva', 'botina'], municipios: ['4209102'] });
    expect(m.gravarEvento).toHaveBeenCalledWith(expect.anything(), 'onboarding_concluido', { termos: 2, ufs: 0, municipios: 1 });
  });
  it('edição (radar já existia): sem onboarding_concluido', async () => {
    m.salvarRadar.mockResolvedValue('atualizado');
    await enviar({ termos: ['luva'] });
    expect(m.gravarEvento).not.toHaveBeenCalled();
  });
```

Crie `scripts/conta.test.ts`:
```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TIPOS_EVENTO_CONTA } from '../lib/eventos';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), 'utf8');
const listar = (pasta: string) =>
  (readdirSync(join(RAIZ, pasta), { recursive: true }) as string[])
    .filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.test.ts'))
    .map((f) => join(pasta, f).replace(/\\/g, '/'));
const codigo = [...listar('app'), ...listar('components'), ...listar('lib'), 'proxy.ts'];

describe('isolamento entre contas', () => {
  it('nenhum arquivo de app/ fala em user_id (o dono vem só da sessão)', () => {
    const com = listar('app').filter((f) => /user_?id/i.test(ler(f)));
    expect(com).toEqual([]);
  });
  it('só lib/servidor/conta.ts lê ou grava perfis e radares', () => {
    const com = codigo.filter((f) => /from\(['"](perfis|radares)['"]\)/.test(ler(f)));
    expect(com).toEqual(['lib/servidor/conta.ts']);
  });
  it('toda função exportada de conta.ts recebe o Usuario da sessão', () => {
    const fonte = ler('lib/servidor/conta.ts');
    const funcoes = [...fonte.matchAll(/export async function (\w+)\(([^)]*)\)/g)];
    expect(funcoes.length).toBeGreaterThanOrEqual(4);
    for (const [, nome, params] of funcoes) expect(params, nome).toMatch(/^usuario: Usuario\b/);
    expect(fonte).toContain(".eq('user_id', usuario.id)");
    expect(fonte).toContain('user_id: usuario.id');
  });
  it('só sessao.ts cria um Usuario', () => {
    const com = codigo.filter((f) => /as Usuario\b/.test(ler(f)));
    expect(com).toEqual(['lib/servidor/sessao.ts']);
  });
  it('rotas e páginas da conta conferem a sessão no servidor', () => {
    for (const f of ['app/api/radar/route.ts', 'app/api/radar/visita/route.ts', 'app/radar/page.tsx', 'app/radar/comecar/page.tsx', 'app/radar/editar/page.tsx', 'app/api/conta/route.ts']) {
      expect(ler(f), f).toContain('usuarioAtual()');
    }
  });
});

describe('chaves e bibliotecas só no servidor', () => {
  it('@supabase/ssr só em sessao.ts e sessaoProxy.ts', () => {
    const com = codigo.filter((f) => ler(f).includes('@supabase/ssr'));
    expect(com.sort()).toEqual(['lib/servidor/sessao.ts', 'lib/sessaoProxy.ts']);
  });
  it('nenhum componente ou código do navegador lê variável SUPABASE_', () => {
    const navegador = [...listar('components'), ...listar('lib/cliente')].filter((f) => ler(f).includes('process.env.SUPABASE_'));
    expect(navegador).toEqual([]);
    const cliente = codigo.filter((f) => ler(f).startsWith("'use client'") && ler(f).includes('SUPABASE_'));
    expect(cliente).toEqual([]);
  });
});

describe('eventos da conta', () => {
  it('cada tipo é gravado em algum lugar do servidor (fora da lista em lib/eventos.ts)', () => {
    const fonte = codigo.filter((f) => f !== 'lib/eventos.ts').map(ler).join('\n');
    for (const t of TIPOS_EVENTO_CONTA) expect(fonte).toContain(`'${t}'`);
  });
});
```

Run: `npx vitest run app/api/conta/rotas.test.ts app/api/radar/route.test.ts scripts/conta.test.ts`
Expected: FAIL (eventos não gravados; tipos de evento da conta não usados).

- [ ] **Step 2: `gravarEvento` aceita os eventos da conta**

Em `lib/servidor/registro.ts`, troque o import de `../eventos` para incluir `TipoEventoConta`, e a assinatura:
```ts
export async function gravarEvento(ctx: Contexto, tipo: TipoEvento | TipoEventoServidor | TipoEventoConta, detalhe: Detalhe): Promise<void> {
```

- [ ] **Step 3: Eventos nas rotas e páginas**

Em `app/api/conta/entrar/route.ts`, acrescente os imports:
```ts
import { lerRadar } from '@/lib/servidor/conta';
import { contexto, gravarEvento } from '@/lib/servidor/registro';
```
e, logo antes do `return Response.json({ destino: … })` do caminho de sucesso, acrescente:
```ts
    // Medição: login (sem e-mail). Falha só vai para o log.
    try {
      const temRadar = (await lerRadar(r.usuario)) !== null;
      await gravarEvento(await contexto(), 'conta_entrou', { radar: temRadar ? 'sim' : 'nao' });
    } catch (erro) {
      console.error('conta_entrou:', erro);
    }
```

Em `app/api/radar/route.ts`, acrescente `import { contexto, gravarEvento } from '@/lib/servidor/registro';` e troque o bloco do `try` de gravação por:
```ts
  try {
    const resultado = await salvarRadar(usuario, v.valor);
    if (resultado === 'criado') {
      try {
        await gravarEvento(await contexto(), 'onboarding_concluido', {
          termos: v.valor.termos.length,
          ufs: v.valor.ufs.length,
          municipios: v.valor.municipios.length,
        });
      } catch (erro) {
        console.error('onboarding_concluido:', erro);
      }
    }
    return Response.json({ ok: true }, { headers: SEM_CACHE });
  } catch (erro) {
```

Em `app/radar/comecar/page.tsx`: troque `import { connection } from 'next/server';` por `import { after, connection } from 'next/server';`, acrescente `import { contextoDaPagina, gravarEvento } from '@/lib/servidor/registro';`, e logo depois de `if (await lerRadar(usuario)) redirect('/radar');` acrescente:
```ts
  const ctx = await contextoDaPagina();
  if (ctx) after(() => gravarEvento(ctx, 'onboarding_iniciado', {}).catch((erro) => console.error('onboarding_iniciado:', erro)));
```

Em `app/radar/page.tsx`: troque `import { connection } from 'next/server';` por `import { after, connection } from 'next/server';`, acrescente `gravarEvento` ao import de `@/lib/servidor/registro`, e logo depois de `const ordem = ordemEfetiva(nav.ordem, true);` acrescente:
```ts
  // Uma vez por chegada ao radar (não a cada troca de ordem ou página).
  if (ctx && nav.pagina === 1 && nav.ordem === null) {
    after(() =>
      gravarEvento(ctx, 'radar_visto', { total: contagens.total, novas: contagens.novas, plano: perfil.plano }).catch((erro) =>
        console.error('radar_visto:', erro),
      ),
    );
  }
```

- [ ] **Step 4: Navegação**

`components/AtalhoRadar.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { useConta } from '@/lib/cliente/conta';

/** Celular: card no topo da página inicial para quem tem conta (no computador, a aba "Meu Radar" do cabeçalho). */
export function AtalhoRadar() {
  const conta = useConta();
  if (conta.carregando || !conta.email) return null;
  return (
    <Link href="/radar" className="mx-3 mt-3 flex h-12 items-center justify-between rounded-md border border-line bg-raised px-4 text-sm font-semibold lg:hidden">
      Ver meu radar
      <span aria-hidden="true">→</span>
    </Link>
  );
}
```

Em `app/page.tsx`: acrescente `import { AtalhoRadar } from '@/components/AtalhoRadar';` e, logo depois de `<Cabecalho uso={uso} />`, `<AtalhoRadar />`.

Em `components/Cabecalho.tsx`, dentro do `<nav aria-label="Principal" …>`, logo depois do `<Link href="/" …>Mapa</Link>`, acrescente:
```tsx
          <Link href="/radar" aria-current={ativa('/radar') ? 'page' : undefined} className={estilo('/radar')}>
            Meu Radar
          </Link>
```
e no comentário do componente troque `abas (Mapa, Alertas, Planos)` por `abas (Mapa, Meu Radar, Alertas, Planos)`.

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run app/api/conta/rotas.test.ts app/api/radar/route.test.ts scripts/conta.test.ts scripts/celular.test.ts scripts/prefetch-edital.test.ts`
Expected: PASS (`scripts/celular.test.ts` só exige o `className="flex flex-col lg:h-dvh"` do contêiner da página inicial, que não muda; o atalho é `lg:hidden`).

- [ ] **Step 6: Verificação completa e commit**

Run: `npm test && npm run typecheck && npm run build`
```bash
git add lib/servidor/registro.ts app/api/conta/entrar/route.ts app/api/conta/rotas.test.ts app/api/radar/route.ts app/api/radar/route.test.ts app/radar/page.tsx app/radar/comecar/page.tsx components/AtalhoRadar.tsx components/Cabecalho.tsx app/page.tsx scripts/conta.test.ts
git commit -m "feat: eventos da conta, Meu Radar na navegação e guardas de isolamento" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 10 (controlador + dono): publicar e conferir ponta a ponta

**Files:**
- Modify: `docs/fase-3-metricas.md`

**Interfaces:**
- Consumes: Tasks 1–9 no branch; Task 4 concluída (0014, `SUPABASE_ANON_KEY`, modelo do e-mail, OTP 6).
- Produces: site publicado e conferido; números em `docs/fase-3-metricas.md`.

- [ ] **Step 1: Pré-condições**

`npm test && npm run typecheck && npm run build` passam. `select name from supabase_migrations.schema_migrations order by version;` contém `conta_radar`. `vercel env ls production | grep SUPABASE_ANON_KEY` lista a variável. Sem `.vercel/`: `vercel link --yes --project edital-map`.

- [ ] **Step 2: Publicar**

`vercel deploy --prod --yes`. "Not authorized": repetir uma vez; falhou de novo, parar e avisar o dono.

- [ ] **Step 3: Rotas sem sessão**

```bash
B=https://www.editalmap.com.br
I='cookie: em_interno=1'
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "$B/radar"
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "$B/radar/editar"
curl -s "$B/api/conta"; echo
curl -s -o /dev/null -w "%{http_code} radar\n" -X POST -H 'content-type: application/json' -d '{"termos":["luva"],"user_id":"x"}' "$B/api/radar"
curl -s -o /dev/null -w "%{http_code} visita\n" -X POST "$B/api/radar/visita"
curl -s -X POST -H 'content-type: application/json' -d '{"email":"x"}' "$B/api/conta/codigo"; echo
curl -s -X POST -H 'content-type: application/json' -d '{"email":"a@b.co","codigo":"12"}' "$B/api/conta/entrar"; echo
curl -s "$B/api/municipios?q=joinv"; echo
for u in / "/api/busca?q=luva" "/entrar" "/sobre" "/planos"; do curl -s -H "$I" -o /dev/null -w "%{http_code} $u\n" "$B$u"; done
```
Expected: `307 …/entrar?voltar=%2Fradar` e `307 …/entrar?voltar=%2Fradar%2Feditar`; `{"email":null}`; `401 radar`; `401 visita`; `{"erro":"Confira o e-mail."}`; `{"erro":"Digite os 6 números do código."}`; lista com `Joinville`; `200` nas cinco.

- [ ] **Step 4: Login real e radar (com o dono, navegador 1440 px)**

1. Dono abre `$B/entrar`, digita o e-mail dele, "Enviar código". Conferir: e-mail chega de `nao-responda@editalmap.com.br`, assunto "Seu código do Edital Map", em português, com 6 números (sem link). Tempo até chegar: anotar.
2. Digita um código errado: "Código incorreto ou expirado…". Digita o certo: vai para `/radar/comecar` (conta nova, sem radar). "Reenviar código" só depois de 60 s.
3. Onboarding: etapa 1 com "uniforme" (sugestões do catálogo aparecem) e "luva"; etapa 2 "Estados" SC e PR; etapa 3 "Pular". Cai em `/radar`.
4. Meu Radar: três cartões com números; conferir o total com [C6] de `docs/evolucao-fase-3.sql` trocando os arrays pelos do radar dele (`p_termos => array['uniforme','luva'], p_ufs => array['PR','SC']`, mesmos relacionados de `expandir`, que a lista usa) — o total do cartão deve bater com `buscar_editais(...)` com `p_relacionados`; lista com explicação "…um dos produtos que você monitora."; ordenar por "Maior valor" (endereço `?ordem=maior_valor`) e ir à página 2 (navegador interno vê tudo). Abrir um edital e voltar: "Novas desde a sua última visita".
5. "Editar meu radar": acrescentar "jaleco", trocar para "Municípios" (buscar "joinv", escolher Joinville/SC), marcar "Só exclusivas para ME/EPP", salvar → Meu Radar com o resumo novo.
6. Menu da conta: e-mail, "Meu Radar", "Editar meu radar", "Sair". Sair → cabeçalho mostra "Entrar"; `$B/radar` manda para /entrar.
7. Janela anônima (não interna): entrar de novo com o mesmo e-mail (novo código): `/radar` mostra só 5 cards e o cartão "Prévia do Radar" com o total, sem paginação; a faixa do plano grátis não mudou o número de buscas (abrir e ordenar o radar não contam). Abrir 1 edital: a faixa conta 1 edital.
8. Celular (390 × 844, ferramentas do navegador): /entrar, onboarding, Meu Radar e menu da conta cabem sem rolagem lateral; na página inicial, card "Ver meu radar" no topo.

- [ ] **Step 5: Banco e eventos**

Rodar [C10] de `docs/evolucao-fase-3.sql`. Expected: uma linha para o dono, `plano = gratis`, `ultima_visita_radar` preenchida, radar com os valores do passo 5; eventos `conta_entrou` (2), `onboarding_iniciado`, `onboarding_concluido` `{"termos":2,"ufs":2,"municipios":0}`, `radar_visto`, nenhum com e-mail no detalhe.

- [ ] **Step 6: Registrar e commitar**

Acrescente à seção "Evolução · Fase 3 · Conta e Meu Radar (0014)" de `docs/fase-3-metricas.md`:
```markdown
- Publicado em aaaa-mm-dd hh:mm. curl: /radar e /radar/editar → /entrar; /api/radar e /api/radar/visita 401 sem sessão (user_id do corpo ignorado); erros do código em português; municípios ok.
- Login real (dono): e-mail em N s, em português, 6 dígitos; código errado com mensagem; onboarding 3 etapas; radar com N oportunidades (= buscar_editais), N novas, N prazo próximo; ordenação e páginas; edição; sair.
- Grátis (janela anônima): 5 cards + "Prévia do Radar"; buscas do dia sem mudança; edital conta.
- Celular 390 px: /entrar, onboarding, radar, menu e "Ver meu radar" ok.
- Eventos: conta_entrou N, onboarding_iniciado N, onboarding_concluido N, radar_visto N, sem e-mail.
- Tempos de produção: /radar N s (1ª carga), /radar?pagina=2 N s.
```
```bash
git add docs/fase-3-metricas.md
git commit -m "docs: evolução fase 3 publicada e conferida" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 11: Documentação e aceite

**Files:**
- Modify: `CLAUDE.md`, `docs/superpowers/specs/2026-10-18-evolucao-fase-3-conta-radar-design.md` (§6)

**Interfaces:**
- Consumes: resultado das Tasks 4 e 10.
- Produces: regras novas no `CLAUDE.md`; aceite marcado na spec.

- [ ] **Step 1: `CLAUDE.md`**

1. Depois da linha que começa com `- Evolução · Fase 2 (busca, relevância, lista e edital):`, acrescente:
```markdown
- Evolução · Fase 3 (conta, onboarding e Meu Radar): spec docs/superpowers/specs/2026-10-18-evolucao-fase-3-conta-radar-design.md, plano docs/superpowers/plans/2026-10-18-evolucao-fase-3-conta-radar.md, conferências docs/evolucao-fase-3.sql (0014: perfis/radares ampliados, sem políticas; `abertas_unicas`/`buscar_editais` com `p_ibges`/`p_valor_max`/`p_so_me_epp`; `radar_contagens`, `exclusivo_me_epp`, `buscar_municipios`). "Editais salvos" na Fase 4; "Excluir minha conta" e limite por conta na Fase 5.
```
2. Na seção "Regras", depois da linha que começa com `- O worker grava pelo supabase-js com SUPABASE_SERVICE_ROLE_KEY.`, acrescente:
```markdown
- Conta: login por código de 6 dígitos do Supabase Auth (`@supabase/ssr`, só no servidor, com `SUPABASE_ANON_KEY` publicável; nunca no navegador). Sessão em cookies httpOnly (`OPCOES_COOKIE_SESSAO`), renovada no proxy.ts quando há `sb-…-auth-token` e validada com `auth.getUser()` em cada página/rota que precisa de usuário (`usuarioAtual()`, lib/servidor/sessao.ts). O tipo `Usuario` só nasce em sessao.ts; perfil e radar só por lib/servidor/conta.ts, sempre com `usuario.id` (nenhum `user_id` vindo do navegador; guardas em scripts/conta.test.ts). Tabelas da conta sem políticas RLS: só service_role.
- E-mail do código: modelos "Magic Link" e "Confirm signup" do Supabase iguais a supabase/templates/codigo.html (assunto "Seu código do Edital Map"), OTP de 6 dígitos e 3600 s; remetente nao-responda@editalmap.com.br pelo SMTP do Resend.
- Meu Radar (/radar): um radar por conta (produtos = termos digitados com relacionados, excluídos, estados **ou** municípios, faixa de valor, modalidades, só ME/EPP = todos os itens exclusivos). Abrir e ordenar o radar não contam busca do grátis; grátis vê os 5 primeiros (`VISIVEIS_GRATIS`) e as contagens, o resto atrás da "Prévia do Radar"; Basic/Pro/interno veem tudo. "Novas" contam desde `ultima_visita_radar` (gravada ao sair da página, `sendBeacon`). Eventos `conta_entrou`, `onboarding_iniciado`, `onboarding_concluido`, `radar_visto` (sem e-mail).
```
3. Na linha `- Supabase: ref omtwaflypzlebjoeubvp, região sa-east-1.`, acrescente ao fim: ` Auth: provedor Email com código (Site URL https://www.editalmap.com.br).`

- [ ] **Step 2: Aceite na spec**

Na seção 6 da spec, marque `[x]` em cada critério cumprido, com o comprovante ao lado (data da publicação, `docs/fase-3-metricas.md`); o que faltar fica `[ ]` com uma frase do que falta. Acrescente uma linha: `- LGPD: guardamos só o e-mail (Supabase Auth) e as preferências do radar; "Excluir minha conta" fica para a Fase 5.`

- [ ] **Step 3: Verificação final e commit**

Run: `npm test && npm run typecheck && npm run build`
```bash
git add CLAUDE.md docs/superpowers/specs/2026-10-18-evolucao-fase-3-conta-radar-design.md
git commit -m "docs: evolução fase 3 no ar, regras novas e aceite" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```
Merge no `main` e push: só com o ok do dono (fora deste plano).

---

## Cobertura da spec

| Spec | Onde |
|---|---|
| §1 /entrar: e-mail → código de 6 dígitos → entra; primeiro acesso cria a conta | Tasks 1 (`enviarCodigo` com `shouldCreateUser`, `entrarComCodigo`), 2 (rotas, `FormEntrar`) |
| §1 sessão httpOnly com `@supabase/ssr`, `auth.getUser()` no servidor, chave publicável só no servidor | Task 1 (`sessao.ts`, `sessaoProxy.ts`, `OPCOES_COOKIE_SESSAO`), Task 9 (guardas) |
| §1 cabeçalho "Entrar" / menu da conta (e-mail, Meu Radar, Editar meu radar, Sair) | Task 2 (`MenuConta`) |
| §1 erros em pt-BR (código errado/expirado, muitas tentativas, e-mail inválido); reenvio após 60 s | Task 1 (`MENSAGENS_CONTA`, `mensagemErroAuth`, `segundosParaReenvio`), Task 2 |
| §1 modelo "Magic Link" com `{{ .Token }}` em português | Task 3 (`supabase/templates/codigo.html` + guarda), Task 4 (API ou dono) |
| §1 limite do grátis segue por navegador | Global Constraints; Task 7 (sem `decidirBusca`, guarda) |
| §2 0014: colunas novas em radares e perfis, plano gratis/basic/pro | Task 3 |
| §2 onboarding em 3 etapas (sugestões do catálogo, chips, Todo o Brasil/estados/municípios, valor, modalidades, ME/EPP, excluir, "Pular") | Tasks 5 (validação), 6 (`FormRadar`, `CampoTermos`, `CampoLocal`, `/api/municipios`) |
| §2 sem "tipo de contratação" | Global Constraints |
| §2 /radar/editar com as mesmas etapas numa página | Task 8 |
| §3 /radar exige conta; sem radar → onboarding | Task 7 (página + guarda) |
| §3 cartões reais (total, novas desde a última visita, prazo próximo), no máximo 4 | Tasks 3 (`radar_contagens`), 5 (`contagensDoRadar`, `desdeDaVisita`), 7 (`CartoesRadar`, `RegistrarVisitaRadar`) |
| §3 lista com os cards da Fase 2, ordenação, paginação, explicação pelo perfil | Tasks 5 (`explicarPerfil`, `editaisDoRadar`), 7 (`CardLista`, `OrdemRadar`, `PaginacaoRadar`) |
| §3 busca do radar = produtos (OR) + relacionados + excluídos + UFs ou municípios + valor + modalidades + ME/EPP; mesmo banco e pontuação | Tasks 3 (`p_ibges`, `p_valor_max`, `p_so_me_epp`), 5 (`filtrosDoRadar`, `argumentosRadar`) |
| §3 plano: radar não consome buscas; grátis 5 + contagens + cartão; edital conta | Tasks 5 (`vistaDoRadar`), 7 (`CartaoPreviaRadar`, guarda sem `decidirBusca`) |
| §4 "Meu Radar" no cabeçalho (computador); celular pelo menu e card "Ver meu radar" | Tasks 2 (menu), 9 (aba, `AtalhoRadar`) |
| §5 RLS ligado sem políticas; funções só service_role; índice por user_id | Task 3 (guardas), Task 4 ([C1], [C3]) |
| §5 isolamento: tudo por conta.ts com user_id de `auth.getUser()`; teste de que nenhuma rota aceita user_id | Tasks 5 (`conta.ts` + testes), 6 (rota ignora `user_id`), 9 (`scripts/conta.test.ts`) |
| §5 eventos novos sem e-mail | Tasks 3 (restrição), 9 (gravação + testes) |
| §5 LGPD (só e-mail e preferências; exclusão na Fase 5) | Task 11 |
| §6 vitest (onboarding, busca do radar, explicação, prévia de 5, rotas com sessão, user_id) | Tasks 1, 2, 5, 6, 7, 9 |
| §6 banco (0014, funções antigas, filtros novos, < 500 ms com 5 produtos) | Task 4 ([C0]–[C9]) |
| §6 ponta a ponta e navegador 1440/390 | Task 10 |

## Riscos conhecidos (para o revisor e o controlador)

- **Radar com 5 produtos e 20 relacionados ordenado por relevância.** A relevância é calculada em todas as abertas que casam (como na Fase 2). Se [C7] passar de 500 ms: (1) cortar os relacionados do radar para 12 (`expandir(...).slice(0, 12)` em `buscaDoRadar`, só TS); (2) se não bastar, migração 0013 calculando a relevância só nas 2.000 de prazo mais próximo. Avisar o dono antes.
- **Primeiro e-mail de conta nova usa o modelo "Confirm signup"**, não "Magic Link". Os dois recebem o mesmo texto (Task 4). Se o dono receber um e-mail em inglês ou com link, conferir os dois modelos.
- **Tamanho do código**: projetos novos do Supabase podem vir com OTP de 8 dígitos; `lerCodigo` aceita só 6. Task 4 fixa 6.
- **Limites de envio do Supabase Auth** (por hora, por e-mail e por IP): no teste, pedir códigos demais dá "Muitas tentativas…". Conferir em Authentication → Rate Limits.
- **`auth.getUser()` custa uma ida ao Auth** em cada página/rota com sessão (só quando há cookie `sb-…`); visitantes sem conta não pagam nada. Se pesar, trocar por `getClaims()` (JWT verificado localmente) num ajuste à parte.
- **Visita registrada ao sair** depende de `sendBeacon`; se o navegador não mandar (aba morta à força), "Novas" só fica maior na próxima visita (sem dano).
- **Navegador interno vê tudo** no radar: a prévia só aparece numa janela anônima ou em outro navegador.
- **Gatilho `novo_perfil`** continua `security definer` (dono postgres): grava o perfil mesmo sem permissões de anon/authenticated nas tabelas. [C10] confere 1 perfil por usuário.
- **Corpos copiados da 0011**: a guarda compara `abertas_unicas` e `buscar_editais` da 0014 com os da 0011 tirando só os trechos novos; um espaço a mais falha o teste (é o objetivo).

## Auto-revisão (writing-plans)

1. **Cobertura da spec:** cada item de §1–§6 aponta para uma task na tabela acima; "tipo de contratação", "Editais salvos" e "Excluir minha conta" estão nas Global Constraints como fora do escopo.
2. **Placeholders:** nenhum "TBD"/"TODO"/"implementar depois"; todo passo de código tem o código. Os `aaaa-mm-dd`, `N` e `<chave>`/`<modelo>` aparecem só nos registros do controlador e nos comandos com valores obtidos na hora. Única instrução de cópia: o corpo de `buscar_editais` (Task 3, Step 4), descrita linha a linha e travada pela guarda que compara com a 0011.
3. **Consistência de nomes e tipos:** `Usuario`/`usuarioAtual`/`enviarCodigo`/`entrarComCodigo`/`sair` (Task 1) nas Tasks 2, 5–9; `ErroAuth`/`MENSAGENS_CONTA`/`mensagemErroAuth`/`statusErroAuth`/`destinoSeguro`/`lerEmail`/`lerCodigo`/`segundosParaReenvio`/`DIGITOS_CODIGO`/`temCookieDeSessao`/`OPCOES_COOKIE_SESSAO` (Task 1) nas Tasks 1–2; `TIPOS_EVENTO_CONTA`/`TipoEventoConta` (Task 3) nas Tasks 9 e na guarda; `Radar`/`validarRadar`/`MENSAGENS_RADAR`/`LIMITES_RADAR`/`palavraValida`/`buscaDoRadar`/`filtrosDoRadar`/`argumentosRadar`/`vistaDoRadar`/`desdeDaVisita`/`VISIVEIS_GRATIS`/`ContagensRadar`/`radarDaLinha`/`linhaDoRadar` (Task 5) nas Tasks 6–8; `RascunhoRadar`/`Abrangencia`/`rascunhoDoRadar`/`corpoDoRascunho`/`erroDaEtapa`/`lerValorReais`/`adicionarTermos`/`sugestoesTermos`/`lerBuscaMunicipio` (Task 6) em `FormRadar`, `CampoTermos`, `CampoLocal` e na Task 8; `lerNavegacaoRadar`/`urlDoRadar`/`textoPrevia`/`resumoDoRadar` (Task 7) nos componentes da Task 7; `perfilDaConta`/`lerRadar`/`salvarRadar`/`marcarVisitaRadar` (Task 5) nas rotas e páginas das Tasks 6–9; `editaisDoRadar`/`contagensDoRadar` (Task 5) na Task 7; `buscarMunicipios`/`municipiosPorIbge` (Task 6) nas Tasks 6–8; `paraResumo(l, b, divergentes, { perfil })` e `type Linha` exportados (Task 5) em `lib/servidor/radar.ts`; parâmetros SQL `p_ibges`/`p_valor_max`/`p_so_me_epp`/`p_desde` e colunas `total`/`novas`/`prazo_proximo` (Task 3) em `filtrosDoRadar` e `contagensDoRadar` (Task 5) e em [C5]–[C7].
