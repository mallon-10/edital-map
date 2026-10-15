# Edital Map

Mapa de licitações públicas abertas no Brasil (dados do PNCP) para PMEs que vendem ao governo. Nicho de largada: EPI e uniformes.

Fase atual: **2 · Mapa**. Site Next.js na Vercel em https://edital-map.vercel.app (domínio próprio pendente) sobre o espelho do PNCP (SC, PR, RS) atualizado a cada 2 h.
- Spec: docs/superpowers/specs/2026-10-15-fase-2-mapa-design.md
- Plano: docs/superpowers/plans/2026-10-15-fase-2-mapa.md
- Portão: docs/fase-2-portao.sql

Referências:
- Estrutura do MVP (doc, nome antigo BidAtlas): https://claude.ai/code/artifact/33a5e4e7-9f62-4f3f-8312-9da344fe5c7c
- Telas (canvas, cores antigas): https://claude.ai/artifact/UZV5qRLMbphDYeWeWDo4Cn
- Identidade visual (design system Edital Map): https://claude.ai/artifact/RzfDxinaVZa1turp598P4N

## Stack
- Worker Node 24 + TypeScript (tsx) em worker/, agendado no GitHub Actions (.github/workflows/sync.yml, a cada 2 h).
- Supabase (Postgres), projeto edital-map em sa-east-1. Schema em supabase/migrations/; mudança só com nova migration.
- Supabase: ref omtwaflypzlebjoeubvp, região sa-east-1.
- Site: Next.js 16 (App Router) + React 19 + Tailwind 4 + maplibre-gl 6 (sem mapa de fundo), na Vercel (região gru1).
- Fases seguintes: Resend, Asaas.

## Regras
- O worker grava pelo supabase-js com SUPABASE_SERVICE_ROLE_KEY. Essa chave nunca vai para o navegador nem para o git.
- "Aberta" = encerramento_em > now(). Não confiar no endpoint /proposta para isso.
- Datas do PNCP vêm sem fuso: converter com deBrasilia() (America/Sao_Paulo) antes de gravar.
- Link do edital: link_origem; se vazio, https://pncp.gov.br/app/editais/{cnpj}/{ano}/{sequencial}.
- valor_estimado nulo ou 0 = "Valor não informado".
- Em contratos (Fase 4), guardar só fornecedor PJ (LGPD).
- PNCP: tamanhoPagina máx. 50 (51 → 400); modalidade obrigatória; vazio = 204; itens paginam (pedir 50, teto 200 páginas); **consulta limitada a 20 chamadas/min por IP (ritmo em `criarRitmo`, rajada 10); 429 espera 30/60/120 s; 5xx/timeout 2/4/8 s; a base de itens não tem esse limite**; janela do sync = última data boa (com releitura de ontem até 03h); timestamp da compra só avança depois dos itens.
- Modalidades da v1: 6, 8, 4, 7, 12.
- Interface em português do Brasil, com o vocabulário "edital" e "Alertas". Visual: design system Edital Map (não as cores do canvas).
- TDD: teste primeiro (vitest). npm test e npm run typecheck passam antes de cada commit.
- Vercel: projeto edital-map no time JPM Company, região gru1, publicado pela CLI (`vercel deploy --prod`), sem Git ligado; `.vercelignore` impede o envio do `.env`.
- maplibre-gl 6 (só ESM): o worker vem do pacote via `setWorkerUrl` em components/Mapa.tsx (o Turbopack zera o import.meta.url).
- Site: dados só pelo servidor (lib/servidor/*, `server-only`); cache de 5 min; `noindex` até a Fase 3; eventos e pedidos de alerta só pelas rotas /api.
- Medição: ao trocar de domínio, remarcar /sobre?interno=1 em cada navegador do dono e fazer uma busca (o cookie em_interno é por domínio).

## Comandos
- npm test / npm run typecheck
- npm run worker:seed: municípios
- npm run worker:backfill -- --dias 90 --ufs SC,PR,RS
- npm run worker:sync: sincronização incremental
- npm run worker:conferir -- --amostra 20 --dias-contagem 3 --idempotencia
- npm run dev / npm run build: site
- npm run gerar:municipios: pontos cinza do mapa (public/geo/municipios.json)
- npm run capturas -- <url> <slug>: capturas de tela (precisa do Edge invisível na porta 9333)
