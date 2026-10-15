# Edital Map · Fase 2 · Mapa — design

Data: 15/10/2026 · Status: aprovada pelo usuário em 15/10/2026. Plano: `docs/superpowers/plans/2026-10-15-fase-2-mapa.md`.

Referências:
- Spec da Fase 1 (dados): `docs/superpowers/specs/2026-10-14-fase-1-dados-design.md`
- Estrutura do MVP (doc, nome antigo BidAtlas): https://claude.ai/code/artifact/33a5e4e7-9f62-4f3f-8312-9da344fe5c7c
- Telas (canvas, cores antigas; vale a disposição, não as cores): https://claude.ai/artifact/UZV5qRLMbphDYeWeWDo4Cn
- Identidade visual (design system Edital Map): https://claude.ai/artifact/RzfDxinaVZa1turp598P4N
- Protótipo validado com o usuário: `visualizar/` (mapa agrupado por zoom e cards com padrão fixo)

## 1. Objetivo e portão

A Fase 2 põe no ar o site do Edital Map para mostrar a PMEs: mapa, busca, lista, página de cada edital e um pedido de alerta, em computador e celular, sobre os dados de SC, PR e RS que a Fase 1 mantém atualizados.

Portão para seguir para a Fase 3: **10 PMEs usaram, 3 pediram alerta**. O site mede isso (seção 6).

## 2. Decisões tomadas (não reabrir)

- Arquitetura: **Next.js (App Router) na Vercel, com o servidor no meio**. O navegador nunca fala com o banco; páginas e rotas `/api` leem o Supabase com a chave secreta, só no servidor.
- Endereço: **domínio próprio** registrado pelo usuário (ex.: `editalmap.com.br`), **fora do Google** (`noindex`) até a Fase 3.
- Alerta: botão **"Criar alerta" que só registra** o pedido (e-mail, o que vende, UFs). Nada é enviado nesta fase.
- Página do edital: **dados reais + vitrine** dos recursos futuros (preço de referência, quem venceu, resumo com IA) com "Em breve · quero ser avisado"; cada clique é registrado.
- Mapa e cards seguem o protótipo aprovado: **agrupamento por zoom** (MapLibre, clusters com a soma de editais) e **cards de altura fixa** com prazo e valor em destaque.
- Vocabulário: "edital", "Alertas". Visual: design system Edital Map.
- Cobertura: SC, PR e RS (Fase 1). Brasil todo é Fase 3.

## 3. Escopo

**Entra:** telas e rotas da seção 4; migration `0003` (seção 5); medição (seção 6); deploy na Vercel com domínio próprio.

**Fica fora:** login, limites do plano grátis, página de planos e cobrança, envio de alertas, páginas para o Google (SEO), Brasil todo, salvos, preço de referência / quem venceu / resumo IA de verdade.

## 4. Telas e rotas

| Rota | Conteúdo |
|---|---|
| `/` | Busca "O que sua empresa vende?", filtro de UF (Todas, SC, PR, RS), filtro "Encerram em 7 dias", mapa agrupado por zoom, lista de editais abertos (prazo mais próximo primeiro, em dois blocos — seção 5.2). Clique no município filtra a lista (chip removível). Faixa fixa: "Hoje cobrimos SC, PR e RS · fonte: PNCP · atualizado há X min" (de `sync_estado.ultima_execucao`). |
| `/edital/[cnpj]-[ano]-[seq]` | Situação + contagem regressiva, objeto, órgão e unidade, valor estimado, modalidade, propostas até (data e hora de Brasília), local (sede do órgão com o aviso "o local de entrega pode ser outro: confira no edital"), tabela de itens (50 primeiros + "Ver todos os N itens"), botão "Abrir edital oficial" (`link_origem` ou `https://pncp.gov.br/app/editais/{cnpj}/{ano}/{seq}`), vitrine "Em breve" (preço de referência, quem venceu, resumo com IA) e botão "Criar alerta para editais parecidos". Edital inexistente → 404; edital encerrado → página mostra "Encerrado em …" sem esconder os dados. |
| `/alertas` | Formulário: o que vende (termos, com sugestões), UFs, e-mail, aceite do uso do e-mail. Confirmação: "Vamos te avisar quando os alertas estiverem prontos." |
| `/sobre` | De onde vêm os dados (PNCP, Lei 14.133), o que o site faz e não faz (não participa da licitação), cobertura atual, como pedir para apagar o e-mail, contato. |
| `/api/busca`, `/api/mapa`, `/api/eventos`, `/api/alertas`, `/api/interno` | Rotas do servidor usadas pelas telas. |

Card de edital (padrão fixo, igual ao protótipo): linha 1 = situação (Aberto / Prazo próximo) + contagem ("Encerra hoje às 17h" e "Encerra amanhã" em laranja; até 7 dias "Encerra em N dias" em amarelo; acima, "N dias" em cinza); linha 2 = objeto em até 2 linhas; linha 3 = valor estimado grande (ou "Valor não informado") + modalidade; linha 4 = órgão · município/UF; linha 5 = "Propostas até dd.mm.aaaa · HHh" + "Ver edital". Resultado achado só nos itens ganha o rótulo "Encontrado nos itens: <descrição do item>".

Celular: mapa em tela cheia e lista numa gaveta que sobe de baixo (tela 2 do canvas); página do edital em coluna única.

## 5. Dados (migration `0003`)

Sem alterar as tabelas e funções que o worker usa.

### 5.1 Duplicadas
Função que agrupa compras abertas que são a mesma publicação repetida no PNCP: mesmo `codigo_ibge`, mesmo `encerramento_em`, mesmo `valor_estimado` e mesmo objeto normalizado (sem prefixos entre colchetes como "[Portal de Compras Públicas] -", sem acentos, minúsculo, espaços colapsados). Fica uma por grupo: a que tem `link_origem`; empate → maior `atualizada_pncp_em`. Busca, lista e mapa usam essa versão sem duplicadas.

### 5.2 Relevância
Nova função de busca que devolve, além dos campos de `buscar()`, `onde` (`'objeto'` ou `'itens'`) e `item_trecho` (descrição do primeiro item que casou, quando `onde = 'itens'`). Ordem: primeiro o bloco `objeto`, depois o bloco `itens`; dentro de cada bloco, `encerramento_em` crescente. Sem termo de busca, só um bloco por prazo. Paginação por `limite`/`deslocamento`.

### 5.3 Mapa
Nova função de mapa sobre a versão sem duplicadas. O servidor lê em páginas de 1.000 linhas até o fim (teto padrão do PostgREST) e devolve tudo ao navegador.

### 5.4 Tabelas novas (RLS ligado, sem políticas: só o servidor grava e lê)
- `pedidos_alerta`: `id`, `email`, `termos text[]`, `ufs text[]`, `visitante`, `interno`, `ip_hash`, `criado_em`.
- `eventos`: `id`, `visitante`, `tipo` (`busca`, `abriu_edital`, `clicou_edital_oficial`, `pediu_alerta`, `quer_recurso`), `detalhe jsonb`, `interno`, `ip_hash`, `criado_em`.
- `ip_hash` = SHA-256 do IP com um sal secreto (`IP_SAL`), só para os limites por hora; o IP em si não é guardado.

### 5.5 Cache
Respostas de busca, mapa e página do edital ficam em cache no servidor por 5 minutos (os dados mudam a cada 2 h).

## 6. Medição do portão

- Cada navegador recebe um identificador anônimo em cookie (`em_visitante`, UUID, 1 ano, sem dado pessoal).
- Eventos gravados pelo servidor: `busca` (termos e UF), `abriu_edital` (id), `clicou_edital_oficial` (id), `pediu_alerta` (id do pedido), `quer_recurso` (nome do recurso e id do edital).
- "10 PMEs usaram" = visitantes distintos com pelo menos uma `busca`, descontando os do dono do produto (o visitante dele é marcado pela página `/sobre?interno=1`, que grava um cookie `em_interno`; eventos e pedidos com esse cookie ficam com a coluna `interno = true`).
- "3 pediram alerta" = e-mails distintos em `pedidos_alerta`, sem os internos.
- A consulta SQL que responde as duas coisas fica em `docs/fase-2-portao.sql`.

## 7. Código

Mesmo repositório. Site Next.js na raiz (`app/`, `components/`, `lib/`); o `worker/` continua e segue rodando no GitHub Actions. A Vercel publica só o site.

| Unidade | Responsabilidade |
|---|---|
| `lib/servidor/supabase.ts` | Cliente com `SUPABASE_SERVICE_ROLE_KEY`, marcado `server-only` |
| `lib/servidor/consultas.ts` | `buscarEditais`, `pontosDoMapa`, `edital`, `itensDoEdital`, `atualizadoEm` — chamam as funções SQL da seção 5 |
| `lib/formato.ts` | Moeda, datas no padrão da marca, regra do prazo (funções puras) |
| `lib/eventos.ts` | Validação de eventos e pedidos de alerta (funções puras) |
| `lib/servidor/registro.ts` | Identificador anônimo, marca de interno, limites por IP, gravação de eventos e pedidos |
| `components/Mapa.tsx` | MapLibre agrupado por zoom (componente de cliente) |
| `components/CardEdital.tsx`, `Lista.tsx`, `Busca.tsx`, `GavetaCelular.tsx`, `VitrineEmBreve.tsx`, `FormAlerta.tsx` | Telas |

Visual: tokens do design system Edital Map como variáveis CSS (cores dos temas Carta; Noturno fora desta fase), Tailwind; fontes Instrument Sans e JetBrains Mono via `next/font`.

Proteção dos formulários: validação no servidor (e-mail válido, até 10 termos de até 60 caracteres, UFs da lista), campo-isca para robôs, limite de 5 pedidos de alerta e 120 eventos por IP por hora.

## 8. Testes

- Unitários (vitest), escritos antes do código: `formato`, `eventos` (validação, limite), montagem das consultas.
- SQL de verificação no banco real: duplicadas conhecidas (Balneário Piçarras, Itá) aparecem uma vez; ordem dos dois blocos; mapa sem teto de 1.000.
- Captura de tela automatizada (Edge invisível com porta de depuração, como na validação do protótipo) da página inicial, de uma página de edital e de `/alertas`, em 1440 px e 390 px, conferidas antes de publicar.
- O `npm test` e o `npm run typecheck` do worker continuam passando.

## 9. Publicação

- Vercel, plano gratuito (adequado à fase de validação, sem cobrança). Conta do usuário conectada ao Claude Code (conector da Vercel via `/mcp` ou CLI `vercel`).
- Variáveis: `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` só no servidor (nunca `NEXT_PUBLIC_`).
- Domínio registrado pelo usuário e apontado para a Vercel; `noindex` (cabeçalho `X-Robots-Tag` e `robots.txt`).

## 10. Riscos

| Risco | O que fazer |
|---|---|
| Agendamento do GitHub atrasa o sync | Disparo pelo Supabase (pg_cron, migration `0002`) depende do segredo `github_disparo` no Vault; até lá, o schedule do GitHub fica como reserva. O site mostra "atualizado há X min" para deixar o atraso visível. |
| Vercel Hobby é para uso não comercial | Nesta fase não há cobrança; na Fase 3 migrar para Pro (US$ 20/mês) antes de cobrar. |
| Supabase Free (500 MB; hoje ~230 MB) | Tabelas novas são pequenas; acompanhar o tamanho. |
| E-mail é dado pessoal (LGPD) | Finalidade dita no formulário; `/sobre` explica como pedir exclusão; e-mails só no servidor. |
| Busca traz ruído | Blocos objeto/itens e rótulo "Encontrado nos itens"; avaliar com as PMEs antes de ir além. |

## 11. Critérios de aceite

- [ ] Site no ar no domínio do usuário, com `noindex` — no ar em https://edital-map.vercel.app com `X-Robots-Tag: noindex, nofollow` e `robots.txt` com `Disallow: /`; falta o domínio próprio (registro pelo usuário).
- [x] Busca, filtros, mapa agrupado, lista, página do edital e `/alertas` funcionando em 1440 px e 390 px. — capturas de tela em 1440 e 390 px (local e produção) das 4 páginas; formulário de alerta testado ponta a ponta.
- [x] Duplicadas conhecidas aparecem uma vez. — `abertas_unicas`: 8.916 abertas → 8.575 únicas, 0 grupos duplicados restantes; Balneário Piçarras 21 → 16, Itá 21 → 19.
- [x] Eventos e pedidos de alerta chegando ao banco; consulta do portão em `docs/fase-2-portao.sql` respondendo. — eventos `busca`, `abriu_edital`, `pediu_alerta` e pedidos gravados (todos de teste, `interno = true`); a consulta responde 0 / 0 / 0 / {}.
- [x] Primeira carga da página inicial em menos de 2 s (medida com o cache quente). — produção (gru1): 0,15–0,29 s com cache quente; 0,87 s a frio.
- [x] Testes unitários e typecheck passando. — `npm test` 19 arquivos / 156 testes; `npm run typecheck` limpo.
