# Edital Map · Fase 1 · Dados — design

Data: 14/10/2026 · Status: aprovado no brainstorming, aguardando revisão da spec escrita.

Referências (o doc e o canvas usam o nome antigo, BidAtlas):
- Estrutura completa do MVP (doc): https://claude.ai/code/artifact/33a5e4e7-9f62-4f3f-8312-9da344fe5c7c
- Telas (canvas, dados de exemplo): https://claude.ai/artifact/UZV5qRLMbphDYeWeWDo4Cn
- Identidade visual (design system Edital Map): https://claude.ai/artifact/RzfDxinaVZa1turp598P4N

## 1. Objetivo e portão

A Fase 1 põe no Supabase um espelho fiel das contratações do PNCP de SC, PR e RS, atualizado a cada 2 horas, com os itens de cada compra aberta. Ela termina quando o portão **"dados batem com o PNCP"** passa (seção 9). Só então começa a Fase 2 (mapa, lista, busca, página da oportunidade, deploy).

Junto, uma sondagem curta responde se o "preço de referência" do plano Pro é viável com os dados do PNCP (seção 10), antes que a pré-venda da Fase 3 o ofereça.

Este é o primeiro de quatro ciclos spec → plano → implementação:

| Fase | Entrega | Portão para seguir |
|---|---|---|
| **1 · Dados (esta spec)** | Supabase + schema, seed de municípios, worker SC/PR/RS, conferência | Dados batem com o PNCP |
| 2 · Mapa | Mapa, lista, busca, página da oportunidade, deploy na Vercel | 10 PMEs usaram, 3 pediram alerta |
| 3 · Cobrança | Login, limites, Asaas, alertas por e-mail às 7h, Brasil todo, SEO | 5 assinantes pagando |
| 4 · Valor | Preço de referência, quem venceu, resumo com IA, WhatsApp | — |

## 2. Decisões herdadas (não reabrir)

- Nome do produto: **Edital Map** (antes BidAtlas). Pasta, repositório e projeto Supabase usam `edital-map`.
- Identidade visual: o design system Edital Map substitui as cores e fontes do canvas (papel `#f4f1e8`, marinho `#0c2340`, laranja `#ff5a1f`, Instrument Sans + JetBrains Mono, temas Carta e Noturno). Vale a partir da Fase 2; a Fase 1 não tem tela.
- Vocabulário da interface: "edital" (não "oportunidade") e "Alertas" (não "Radar"). Os nomes internos do schema, como a tabela `radares`, ficam como estão; rotas e textos se ajustam nas Fases 2 e 3.
- Stack do produto: Next.js + Supabase (Postgres, sem PostGIS na v1) + MapLibre sem mapa de fundo + worker Node no GitHub Actions a cada 2 h + Resend + Asaas.
- Nicho de largada: EPI e uniformes (confirmado em 14/10/2026; o exemplo de publicidade na identidade visual é só ilustração).
- Modalidades da v1: 6 (Pregão eletrônico), 8 (Dispensa), 4 (Concorrência eletrônica), 7 (Pregão presencial), 12 (Credenciamento).
- "Aberta" = `encerramento_em > now()`. Não confiar no endpoint `/proposta` para isso.
- Datas do PNCP vêm sem fuso: tratar como `America/Sao_Paulo`.
- Schema: `0001_init.sql` do doc (9 tabelas, 6 funções), sem mudanças.
- Abordagem de sincronização escolhida: **espelho por janelas de data** (publicacao na carga inicial, atualizacao a cada 2 h, upsert idempotente). Descartadas: "só o que está aberto" (perde cancelamentos e histórico) e "tudo no Supabase" (limite de 150 s por execução, Deno, sem execução local).

## 3. Fatos da API do PNCP

Verificados em 14/10/2026. Os marcados **novo** foram descobertos durante este brainstorming.

- Base de consulta: `https://pncp.gov.br/api/consulta`, pública, sem token. Itens ficam em outra base: `https://pncp.gov.br/api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{seq}/itens`.
- Não há busca por palavra (`palavraChave` é ignorado) → indexar no Postgres.
- `codigoModalidadeContratacao` é obrigatório em `publicacao` e `atualizacao`; `tamanhoPagina` máx. 50 em contratações.
- `dataInicial`/`dataFinal` são dias inteiros (`yyyyMMdd`), sem hora.
- `codigoIbge` é a sede da unidade compradora, não o local de entrega. `linkSistemaOrigem` frequentemente vazio.
- **Novo:** o filtro `uf` funciona em `publicacao` e `atualizacao`.
- **Novo:** volumes de 13/10/2026, Pregão eletrônico: `atualizacao` Brasil = 4.529 registros no dia (91 páginas de 50); `atualizacao` SC = 244; `publicacao` Brasil = 1.516; `publicacao` SC = 97. Dispensa, `publicacao` Brasil = 2.910.
- **Novo, corrige o doc:** o endpoint de itens **pagina, com 10 itens por página por padrão**. Sem parâmetros ele devolve só os 10 primeiros. Aceita `pagina` e `tamanhoPagina` (testado com 2). O máximo de `tamanhoPagina` não foi testado; o cliente usa 50 e para quando vier uma página menor que o tamanho pedido.
- **Novo:** cada item traz, entre outros, `numeroItem`, `descricao`, `quantidade`, `unidadeMedida`, `valorUnitarioEstimado`, `valorTotal`, `materialOuServico`, `orcamentoSigiloso`, `temResultado`, `catalogoCodigoItem` (CATMAT), `ncmNbsCodigo`, `situacaoCompraItem`.

## 4. Escopo

**Entra:**
- Repositório `C:\dev\edital-map` (fora do OneDrive), privado no GitHub como `mallon-10/edital-map`.
- Projeto Supabase novo `edital-map`, plano Free, região São Paulo (`sa-east-1`).
- `supabase/migrations/0001_init.sql`, copiado do doc sem mudanças.
- Worker TypeScript com os comandos `worker:seed`, `worker:backfill`, `worker:sync`, `worker:conferir`.
- `.github/workflows/sync.yml`, só com o cron de 2 h.
- `CLAUDE.md` (do doc, ajustado para a Fase 1, para o nome Edital Map e com a linha de visual apontando para o design system), `.env.example`.
- Sondagem do preço de referência: código descartável em `sondagem/`, relatório em `docs/sondagens/`.

**Fica fora:**
- App Next.js e `public/geo/ufs.json` → Fase 2.
- Alertas das 7h, login, limites de plano, Asaas, Brasil todo → Fase 3.
- Coleta de `contratos` (quem venceu) → Fase 4. A API filtra contratos por data, então o histórico pode ser buscado depois sem perda.

Custo da Fase 1: R$ 0 (Supabase Free, GitHub Actions dentro dos 2.000 min/mês do repositório privado).

## 5. Infraestrutura

| Item | Valor |
|---|---|
| Pasta local | `C:\dev\edital-map` |
| GitHub | `mallon-10/edital-map`, privado (necessário para o agendamento no Actions) |
| Supabase | projeto `edital-map`, Free, `sa-east-1`. A região não muda depois; São Paulo porque usuários e app (Fase 2) ficam no Brasil |
| Runtime | Node 24, TypeScript, `tsx` para rodar, `vitest` para testar |
| Dependências | `@supabase/supabase-js`, `zod`, `date-fns` + `date-fns-tz` |
| Variáveis | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `UFS` (padrão `SC,PR,RS`). Em `.env` local e nos Secrets do GitHub. O PNCP não precisa de chave |

O worker grava pelo `supabase-js` com a chave service role (HTTPS). Não usar conexão Postgres direta: os runners do GitHub Actions só têm IPv4, e a conexão direta do Supabase é IPv6, o que exigiria o pooler e mais um segredo.

O schema é aplicado pelo SQL Editor do Supabase ou pela ferramenta de migração do MCP do Supabase. Não há Docker nem Supabase CLI nesta máquina.

### Estrutura de pastas (Fase 1)

```
edital-map/
├─ worker/
│  ├─ pncp/cliente.ts        # GET + paralelismo + espera em 429/5xx + paginar()
│  ├─ pncp/esquemas.ts       # zod: só os campos usados
│  ├─ mapear.ts              # funções puras PNCP → linha do banco
│  ├─ datas.ts               # "2026-09-22T08:00:00" → instante em America/Sao_Paulo
│  ├─ banco.ts               # supabase-js (service role), upserts, sync_estado
│  ├─ config.ts              # UFs, modalidades, paralelismo, tamanhos de página
│  ├─ resumo.ts              # resumo da rodada: console + $GITHUB_STEP_SUMMARY
│  ├─ seed-municipios.ts
│  ├─ backfill.ts
│  ├─ sync.ts
│  ├─ conferir.ts
│  ├─ __fixtures__/          # respostas reais do PNCP gravadas
│  └─ *.test.ts
├─ data/municipios.csv       # kelvins/municipios-brasileiros, fixado num commit
├─ supabase/migrations/0001_init.sql
├─ sondagem/                 # descartável
├─ docs/
│  ├─ superpowers/specs/
│  ├─ conferencias/
│  └─ sondagens/
├─ .github/workflows/sync.yml
├─ .env.example
├─ CLAUDE.md
├─ package.json
└─ tsconfig.json
```

## 6. Componentes

Regra: os comandos não fazem HTTP nem SQL diretamente; só coordenam as unidades abaixo.

| Unidade | Responsabilidade | Depende de |
|---|---|---|
| `pncp/cliente.ts` | `get(url, params)` com no máximo 3 chamadas em paralelo. Em 429 espera 30, 60, 120 s; em 5xx ou timeout (30 s) espera 2, 4, 8 s, com variação aleatória; a consulta tem ritmo de 20 chamadas/min (emenda de 14/10); após a 4ª falha, lança erro. `paginar(endpoint, params)` é um gerador assíncrono: em contratações, vai até `totalPaginas`; em itens, pede `tamanhoPagina=50` e para quando vier uma página com menos de 50 | `fetch` do Node |
| `pncp/esquemas.ts` | Esquemas zod de contratação e item, só com os campos usados. Registro inválido → `{ ok: false, id, motivo }`, sem lançar erro | zod |
| `mapear.ts` | `contratacaoParaLinha(raw)` e `itemParaLinha(raw, contratacaoId)`. Puras, sem rede nem banco. String vazia → `null` | `datas.ts` |
| `datas.ts` | `deBrasilia(s: string \| null): string \| null`, que interpreta a data sem fuso como `America/Sao_Paulo` e devolve ISO em UTC | date-fns-tz |
| `banco.ts` | Cliente Supabase; `upsertContratacoes(linhas)` e `upsertItens(linhas)` em lotes de 500; `atualizacoesConhecidas(ids)` → mapa id → `atualizada_pncp_em`; `removerItensAlem(contratacaoId, numeros)`; `abertasSemItens(limite)`; `lerEstado(chave)` e `gravarEstado(chave, dados)` | supabase-js |
| `config.ts` | `UFS` (env), `MODALIDADES = [6, 8, 4, 7, 12]`, `PARALELISMO = 3`, `PAGINA_CONTRATACOES = 50`, `PAGINA_ITENS = 50`, `LIMITE_CATCH_UP = 300`, `LIMITE_INVALIDOS = 0.05` | — |
| `resumo.ts` | Acumula páginas lidas, registros gravados, pulados, erros por chave e tempo; imprime no fim e escreve em `$GITHUB_STEP_SUMMARY` quando existir | — |

### De-para PNCP → banco

`contratacoes` (do doc):

| Coluna | Campo do PNCP |
|---|---|
| `id` | `numeroControlePNCP` |
| `cnpj`, `ano`, `sequencial` | `orgaoEntidade.cnpj`, `anoCompra`, `sequencialCompra` |
| `objeto`, `info_complementar` | `objetoCompra`, `informacaoComplementar` |
| `orgao_nome`, `esfera` | `orgaoEntidade.razaoSocial`, `orgaoEntidade.esferaId` |
| `unidade_nome`, `codigo_ibge`, `uf`, `municipio_nome` | `unidadeOrgao.nomeUnidade`, `.codigoIbge`, `.ufSigla`, `.municipioNome` |
| `modalidade_id`, `modalidade_nome` | `modalidadeId`, `modalidadeNome` |
| `situacao_id`, `situacao_nome`, `srp` | `situacaoCompraId`, `situacaoCompraNome`, `srp` |
| `valor_estimado`, `valor_homologado` | `valorTotalEstimado`, `valorTotalHomologado` (gravados como vieram; 0 continua 0) |
| `publicada_em`, `abertura_em`, `encerramento_em` | `dataPublicacaoPncp`, `dataAberturaProposta`, `dataEncerramentoProposta` (via `deBrasilia`) |
| `link_origem`, `atualizada_pncp_em` | `linkSistemaOrigem` (vazio → `null`), `dataAtualizacaoGlobal` (via `deBrasilia`; se nulo, usar `dataAtualizacao`) |

`slug` e `busca` são colunas geradas e não entram no upsert.

`itens`:

| Coluna | Campo do PNCP |
|---|---|
| `numero`, `descricao` | `numeroItem`, `descricao` |
| `quantidade`, `unidade` | `quantidade`, `unidadeMedida` |
| `valor_unitario_estimado`, `valor_total_estimado` | `valorUnitarioEstimado`, `valorTotal` |
| `material_ou_servico`, `sigiloso`, `tem_resultado` | `materialOuServico`, `orcamentoSigiloso`, `temResultado` |

`municipios`: o CSV traz `codigo_uf` numérico; o seed converte para a sigla com uma tabela fixa das 27 UFs.

## 7. Fluxos

### Seed (`npm run worker:seed`, uma vez)
1. Lê `data/municipios.csv`.
2. Valida: 5.571 linhas (inclui Boa Esperança do Norte/MT, criado em 2025) (emenda de 14/10), 27 UFs, lat/lng numéricas. Se falhar, aborta sem gravar.
3. Upsert em `municipios` por `codigo_ibge`.

### Carga inicial (`npm run worker:backfill -- --dias 90 --ufs SC,PR,RS [--modalidades 6,8]`, uma vez, local)
1. Para cada UF × modalidade × janela de 7 dias entre hoje−90 e hoje: `paginar('/v1/contratacoes/publicacao', { uf, codigoModalidadeContratacao, dataInicial, dataFinal, tamanhoPagina: 50 })` → validar → mapear → `upsertContratacoes`.
2. Para todas as compras abertas sem itens: buscar todas as páginas de `/itens` → `upsertItens`.
3. Para cada UF × modalidade: `gravarEstado('atualizacao:{UF}:{mod}', { ultima_data: hoje, status: 'ok' })`.

Estimativa: cerca de 80 mil contratações e 15 mil pedidos de itens; 1 a 2 horas. É idempotente: se cair, rodar de novo.

### Sincronização (`npm run worker:sync`, a cada 2 h no Actions)
Para cada UF × modalidade, de forma independente:
1. `janela = [inicio, hoje]`, com `inicio = min(estado.ultima_data ?? ontem, hojeBrasilia(agora − 3 h))` (emenda de 14/10). Justificativa do 11d: a consulta filtra pela data da atualização, então desde a última rodada boa nada datado antes dela ficou por ler; reler o dia inteiro a cada rodada (cerca de 12 vezes) só gastava as 20 chamadas/min. A margem de 3 h faz as rodadas até as 03h de Brasília ainda reler ontem, para pegar o que o índice do PNCP demora a mostrar depois da meia-noite. Sem estado, começa ontem; data no futuro fica limitada pelo segundo termo.
2. `paginar('/v1/contratacoes/atualizacao', …)` → validar → mapear.
3. `atualizacoesConhecidas(ids)`: uma compra é **nova** se não está no banco e **mudou** se o `atualizada_pncp_em` dela no PNCP é maior que o do banco.
4. `upsertContratacoes` com todas as linhas válidas. **Ordem de gravação (emenda de 14/10):** as compras abertas que são novas ou mudaram entram primeiro com o `atualizada_pncp_em` anterior (ou `1970-01-01T00:00:00Z`, se novas); o timestamp real só é gravado depois que os itens gravaram. Se o processo cair entre as duas gravações, a próxima rodada ainda vê a compra como alterada e busca os itens de novo.
5. Para as compras abertas que são novas ou mudaram: buscar todas as páginas de `/itens` (teto de 200 páginas) → `upsertItens` → `removerItensAlem` (só se a leitura dos itens terminou sem erro e a lista não veio vazia; lista vazia mantém os itens antigos e gera aviso) (emenda de 14/10). Depois, regravar com o timestamp real só as compras cujos itens gravaram.
6. Se tudo deu certo: `gravarEstado(chave, { ultima_data: hoje, ultima_execucao: now, status: 'ok', erro: null })`. Se falhou: `status: 'erro'`, `erro: mensagem`, e `ultima_data` não avança.

Depois de todas as chaves:
7. Busca itens de até 300 compras de `abertasSemItens`, ordenadas pelo prazo mais próximo.
8. Escreve o resumo. Sai com código 1 se alguma chave falhou ou se a taxa de inválidos passou de 5%.

O passo 3 é obrigatório. Como cada rodada relê o dia inteiro, buscar itens de todas as compras do dia a cada rodada daria cerca de 18 mil pedidos por dia só para 3 UFs.

### Workflow (`.github/workflows/sync.yml`)
- Gatilhos: `schedule: cron '0 */2 * * *'` e `workflow_dispatch`.
- `concurrency: { group: sync, cancel-in-progress: false }`: nunca duas rodadas ao mesmo tempo.
- `permissions: contents: read`, `timeout-minutes: 30` (o worker para de iniciar chaves aos 25 min e publica o resumo), Node 24, `npm ci`, `npm run worker:sync` (emenda de 14/10).
- Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Env: `UFS=SC,PR,RS`, `PNCP_CONSULTA_POR_MINUTO=20`.

## 8. Tratamento de erros

| Situação | Comportamento |
|---|---|
| HTTP 429 | Espera 30, 60 e 120 s (o bloqueio dura cerca de 25 s). A API de consulta é limitada a 20 chamadas por minuto por IP (ritmo de 20/min com rajada de 10; medido em 14/10: 30/min já dá 429); a base de itens não tem esse limite (emenda de 14/10) |
| HTTP 5xx ou timeout | Espera 2, 4 e 8 s e tenta de novo. Na 4ª falha a página falha, a chave UF × modalidade fica com `status = 'erro'`, a data não avança e a próxima rodada repete a janela. As outras chaves continuam |
| Registro fora do formato (zod) | Pula, conta e registra o `numeroControlePNCP` no resumo. Mais de 5% de inválidos na rodada → código de saída 1 (provável mudança na API) |
| Supabase indisponível | O job falha. A próxima rodada relê a mesma janela; o upsert não deixa nada pela metade |
| Registros mudam de página durante a leitura | Duplicados são inofensivos (upsert). Os que escaparem entram na próxima rodada, que relê o dia |
| Compra sem `dataEncerramentoProposta` | `encerramento_em` nulo; nunca aparece como aberta |
| Leitura de itens incompleta | Não remove itens antigos; a compra volta a ser tentada pelo catch-up se estiver sem itens |
| Lista de itens vazia (204 ou resposta transitória) | Não apaga os itens que já existem; registra o aviso `lista de itens vazia; itens antigos mantidos` (emenda de 14/10) |
| Rodada passa de 25 min | Não começa chave nova nem o catch-up; registra o aviso `prazo da rodada` com as chaves não iniciadas. Elas não gravam estado e a próxima rodada as pega (emenda de 14/10) |
| Rodada agendada falha | O GitHub envia e-mail ao dono do repositório. É o aviso de falha da Fase 1 |

A Fase 2 mostra "atualizado há X min" a partir de `sync_estado.ultima_execucao`.

## 9. Conferência e critério do portão

`npm run worker:conferir -- --amostra 20 --dias-contagem 3` gera `docs/conferencias/AAAA-MM-DD.md`:

1. **Amostra de 20 compras abertas**, sorteadas e estratificadas: pelo menos uma de cada UF e de cada modalidade presente; obrigatoriamente uma com mais de 10 itens, uma com `valor_estimado = 0` (se houver) e uma com `link_origem` nulo (se houver).
2. **Comparação campo a campo** com o detalhe `GET /api/consulta/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}`: objeto, valor estimado, prazo (após conversão de fuso), modalidade, situação, `codigo_ibge`/UF, `srp` e quantidade de itens (contada percorrendo todas as páginas de `/itens`). Se o `dataAtualizacaoGlobal` do PNCP for mais novo que o do banco, a compra sai como "desatualizada", não como divergente, **somente se a mudança no PNCP é posterior à última rodada boa da chave (`sync_estado.ultima_execucao` menos 30 min); mais antiga que isso, é "divergente: o sync perdeu esta atualização"** (emenda de 14/10).
3. **Contagem por dia:** em 3 dias sorteados da janela, para cada UF × modalidade, o número de compras no banco cujo `publicada_em`, convertido para horário de Brasília, cai naquele dia é comparado com o `totalRegistros` de `/publicacao` com `dataInicial = dataFinal =` aquele dia.
4. **Busca:** `buscar('botina')` retorna pelo menos uma compra cujo objeto não contém "botina" (achada pelos itens); `buscar('EPI e uniformes')` retorna resultados das duas palavras.
5. **Idempotência:** roda `worker:sync` duas vezes seguidas. A segunda rodada não cria nenhuma contratação nem item novo além das compras que o PNCP publicou ou alterou entre as duas (as que têm `atualizada_pncp_em` posterior ao início da primeira rodada), e não há duplicatas.

O relatório tem uma tabela por compra (link do portal, campo, banco, PNCP, ok/divergente) e um resumo com o veredito.

**Critério para seguir para a Fase 2** (todos):
- 20 de 20 compras sem divergência que fique sem explicação;
- contagens iguais nos 3 dias, em todas as UF × modalidade;
- as duas verificações de busca passam;
- a idempotência passa;
- o dono do produto abre 5 compras da amostra no portal do PNCP e confirma prazo e valor.

## 10. Sondagem do preço de referência

Tempo: meio dia. Código descartável em `sondagem/`, que nunca é importado pelo worker. Resultado em `docs/sondagens/AAAA-MM-DD-preco-de-referencia.md` (data do dia em que a sondagem rodar).

| Pergunta | Como responder |
|---|---|
| Existe preço homologado por item? | Endpoint `/api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{seq}/itens/{numero}/resultados` em 10 compras de EPI em SC com `temResultado = true` |
| Dá para comparar o mesmo produto entre compras? | Em amostras de itens de botina, luva e uniforme, a porcentagem com `catalogoCodigoItem` (CATMAT) preenchido; se a descrição normalizada serve de reserva |
| De onde sai "quem venceu"? | Comparar resultado por item, `/v1/contratos` e `/v1/atas`: qual traz fornecedor (CNPJ) por item |
| Quanto custa montar 12 meses? | Número de chamadas e tempo estimado para cobrir EPI em SC, PR e RS |

O relatório termina com um veredito ("dá" / "não dá" / "dá com ressalva") e com o que muda na oferta do Pro antes da pré-venda.

## 11. Testes

Vitest, escrito antes do código de produção (TDD).

- `mapear.test.ts`, com fixtures reais em `worker/__fixtures__/`: valor 0, link vazio, `dataAtualizacaoGlobal` nulo, item sigiloso, campos opcionais ausentes.
- `datas.test.ts`: `"2026-09-22T08:00:00"` → `"2026-09-22T11:00:00.000Z"`; horário perto da meia-noite muda o dia em UTC; `null` → `null`.
- `cliente.test.ts`, com `fetch` simulado: 429 seguido de 200 tenta de novo e devolve; 4 falhas lançam erro; contratações param em `totalPaginas`; itens com página de exatamente 50 pedem a seguinte e param na menor.
- `esquemas.test.ts`: registro sem `numeroControlePNCP` é marcado inválido sem lançar erro.
- Integração: a conferência (seção 9) contra o projeto Supabase real. Aceitável na Fase 1 porque ainda não existem usuários. **A partir da Fase 2, testes de integração passam a usar um projeto Supabase separado.**

Checagem de tipos: `tsc --noEmit` passa.

## 12. Riscos e pontos de atenção

| Risco | Efeito | O que fazer |
|---|---|---|
| Sincronizar o Brasil todo (Fase 3) | Com 5 modalidades no país, cada rodada deve passar de 10 min. 12 rodadas por dia estouram os 2.000 min/mês do Actions grátis | Decidir antes da Fase 3 com os números reais do resumo das rodadas: sync menos frequente para modalidades de baixo valor, Actions pago, ou um servidor próprio |
| Agendamento do Actions atrasa | Rodadas podem atrasar de minutos a cerca de 1 hora | Aceitável para sync de 2 h; reavaliar para os alertas das 7h na Fase 3 |
| Supabase Free pausa projetos inativos após 7 dias | Banco fica fora do ar | O sync a cada 2 h mantém o projeto ativo; conferir no painel após a primeira semana |
| Supabase Free tem 500 MB | Banco cheio | Estimativa para 3 UFs × 90 dias com itens só das abertas: bem abaixo do limite. Conferir o tamanho no painel após a carga inicial |
| Limite de chamadas do PNCP não documentado | 429 em rajadas | Ritmo de 20 chamadas/min na consulta e esperas de 30/60/120 s em 429 (medido em 14/10) (emenda de 14/10) |
| Limite de 20/min por IP e IPs compartilhados do Actions (emenda de 14/10) | Os runners do GitHub compartilham IPs; outros usuários podem consumir a cota e gerar 429 (já aparecem cerca de 3 por rodada) | Acompanhar a contagem de 429 no resumo; se crescer, rodar o sync em máquina com IP próprio |
| "Brasil todo" na Fase 3 (emenda de 14/10) | Por UF × modalidade são pelo menos 135 páginas por rodada, quase vazias; a 20/min são cerca de 7 min só nisso | Consultar por modalidade, sem filtro de UF (o filtro é opcional): `ceil(total/50)` páginas. Avaliar VPS própria (IP próprio e sem o limite de minutos do Actions) |
| Compras abertas publicadas antes da janela de 90 dias (emenda de 14/10) | Credenciamento (modalidade 12) e concorrências longas ficam abertas por meses; só entram no banco se mudarem depois da carga, e a conferência não detecta | Sonda de completude contra `/v1/contratacoes/proposta` (só como sonda, não para definir "aberta"); se o buraco for relevante, carga única mais longa, por exemplo `--dias 365 --modalidades 12` |
| Máximo de `tamanhoPagina` em itens desconhecido | Se 50 for recusado, a busca de itens falha | Primeira tarefa do plano: testar 50; se falhar, usar 10 em `config.ts` |

## 13. Critérios de aceite da Fase 1

- [ ] Projeto Supabase `edital-map` em `sa-east-1` com `0001_init.sql` aplicado.
- [ ] `municipios` com 5.571 linhas (emenda de 14/10: inclui Boa Esperança do Norte/MT, criado em 2025).
- [ ] Carga inicial de 90 dias para SC, PR e RS concluída, com o resumo salvo.
- [ ] `sync.yml` rodando no Actions a cada 2 h, com pelo menos 12 rodadas seguidas sem falha.
- [ ] Testes unitários e `tsc --noEmit` passando.
- [ ] Relatório de conferência com o veredito "passou" (seção 9).
- [ ] Relatório da sondagem do preço de referência com veredito.
- [ ] Tempo médio por rodada e páginas por rodada anotados (insumo da decisão "Brasil todo").
