# Fase 1 · métricas

## Carga inicial (2026-10-14)

`npm run worker:backfill -- --dias 90 --ufs SC,PR,RS`, rodada na máquina local, com o ritmo de 20 chamadas/min na API de consulta (emenda 11b).

| Métrica | Valor |
|---|---|
| Tempo | 14.924 s (4 h 09) |
| Páginas lidas | 1.700 |
| Contratações válidas e gravadas | 79.897 |
| Compras com itens buscados | 5.891 |
| Itens gravados | 110.713 |
| Registros inválidos | 0 (0,0%) |
| Chamadas HTTP | 8.973 |
| Novas tentativas | 118 |
| Erros | 0 |
| Avisos | 0 |

Estado do banco depois da carga e das primeiras rodadas de sync: 80.523 compras, 7.121 abertas, 139.319 itens, 0 compras abertas sem itens, 15 de 15 chaves com `status = ok`, **221 MB** (limite do plano Free: 500 MB).

Volume por UF × modalidade, compras publicadas nos 90 dias:

| UF | Pregão eletrônico | Dispensa | Concorrência | Pregão presencial | Credenciamento |
|---|---|---|---|---|---|
| SC | 6.255 | 9.103 | 1.402 | 163 | 680 |
| PR | 10.851 | 9.528 | 1.431 | 123 | 657 |
| RS | 9.717 | 27.248 | 1.938 | 342 | 126 (parcial na medição) |

## Primeira tentativa (interrompida)

A primeira carga, sem ritmo, recebeu HTTP 429 ("Limite de requisições excedido") e teve o IP bloqueado. Medições do limite em 14/10/2026:

| Teste | Resultado |
|---|---|
| Consulta, rajada sem pausa | 12–13 respostas 200, depois 429; volta em ~23–26 s |
| Consulta, 30/min por 2 min | 12 de 60 com 429 |
| Consulta, 20/min por 3 min | 0 de 60 com 429 |
| Itens (`/api/pncp`), 200 chamadas seguidas | 0 com 429 |

## Sincronização no GitHub Actions

| Rodada | Resultado | Tempo | Páginas | 429 | Observação |
|---|---|---|---|---|---|
| 38595075622 (14/10, manual) | cancelada | 30 min (timeout) | — | — | sem ritmo por chave visível; motivou o log por chave (11c) |
| 38600256732 (14/10, manual) | sucesso | 767 s | 87 | 3 | 1ª rodada após a carga de SC; RS ainda sem carga (176 compras precisaram de itens) |

Projeção que motivou a emenda 11d (janela a partir da última data boa): 12 rodadas/dia × ~6 min ≈ 2.100 min/mês, acima dos 2.000 grátis do Actions. As 12 rodadas agendadas da Task 16 vão medir o regime real.

## Completude das abertas (sonda contra `/proposta`, 14/10)

Compras abertas no banco contra o `totalRegistros` de `/v1/contratacoes/proposta` (que inclui algumas encerradas, então é um teto): 95–100% em Pregão, Dispensa, Concorrência e Pregão presencial. Credenciamento ficou muito abaixo (SC 237/766, PR 204/557, RS 292/725), porque credenciamentos ficam abertos por meses e foram publicados antes da janela de 90 dias. Correção: carga extra de 365 dias só de Credenciamento (resultado abaixo).

### Carga extra de Credenciamento (2026-10-14)

`npm run worker:backfill -- --dias 365 --modalidades 12 --ufs SC,PR,RS`: 1.577 s, 209 páginas, 7.027 compras, 1.770 compras com itens, 29.151 itens, 6 respostas 429, 0 erros, 1 aviso (remoção de itens antigos recusada com "Bad Request" numa compra com muitos itens: a lista `not in` na URL ficou longa demais; os itens novos foram gravados).

Credenciamentos abertos depois da carga: SC 915, PR 630, RS 957 — acima do `totalRegistros` da `/proposta` (766, 557, 725), que aparentemente deixa de fora credenciamentos com prazo muito longo. O mais antigo ainda aberto foi publicado em 20/05/2024.
