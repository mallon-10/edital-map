# Edital Map

Mapa de licitações públicas abertas no Brasil (dados do PNCP) para PMEs que vendem ao governo. Nicho de largada: EPI e uniformes.

Fase atual: **1 · Dados**. Espelho do PNCP (SC, PR, RS) no Supabase, atualizado a cada 2 h.
- Spec: docs/superpowers/specs/2026-10-14-fase-1-dados-design.md
- Plano: docs/superpowers/plans/2026-10-14-fase-1-dados.md

Referências:
- Estrutura do MVP (doc, nome antigo BidAtlas): https://claude.ai/code/artifact/33a5e4e7-9f62-4f3f-8312-9da344fe5c7c
- Telas (canvas, cores antigas): https://claude.ai/artifact/UZV5qRLMbphDYeWeWDo4Cn
- Identidade visual (design system Edital Map): https://claude.ai/artifact/RzfDxinaVZa1turp598P4N

## Stack
- Worker Node 24 + TypeScript (tsx) em worker/, agendado no GitHub Actions (.github/workflows/sync.yml, a cada 2 h).
- Supabase (Postgres), projeto edital-map em sa-east-1. Schema em supabase/migrations/; mudança só com nova migration.
- Fases seguintes: Next.js (App Router) + MapLibre sem mapa de fundo, Resend, Asaas.

## Regras
- O worker grava pelo supabase-js com SUPABASE_SERVICE_ROLE_KEY. Essa chave nunca vai para o navegador nem para o git.
- "Aberta" = encerramento_em > now(). Não confiar no endpoint /proposta para isso.
- Datas do PNCP vêm sem fuso: converter com deBrasilia() (America/Sao_Paulo) antes de gravar.
- Link do edital: link_origem; se vazio, https://pncp.gov.br/app/editais/{cnpj}/{ano}/{sequencial}.
- valor_estimado nulo ou 0 = "Valor não informado".
- Em contratos (Fase 4), guardar só fornecedor PJ (LGPD).
- PNCP: tamanhoPagina máx. 50 (51 dá HTTP 400); codigoModalidadeContratacao obrigatório; resposta vazia = HTTP 204 sem corpo; itens paginam (padrão 10, pedir 50); em 429/5xx esperar 2, 4, 8 s.
- Modalidades da v1: 6, 8, 4, 7, 12.
- Interface em português do Brasil, com o vocabulário "edital" e "Alertas". Visual: design system Edital Map (não as cores do canvas).
- TDD: teste primeiro (vitest). npm test e npm run typecheck passam antes de cada commit.

## Comandos
- npm test / npm run typecheck
- npm run worker:seed: municípios
- npm run worker:backfill -- --dias 90 --ufs SC,PR,RS
- npm run worker:sync: sincronização incremental
- npm run worker:conferir -- --amostra 20 --dias-contagem 3 --idempotencia
