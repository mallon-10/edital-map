# Edital Map

Mapa de licitações públicas abertas no Brasil (dados do PNCP) para PMEs que vendem ao governo. Nicho de largada: EPI e uniformes.

Fase atual: **3 · Brasil todo** (etapa da Fase 3 antes de Planos e Alertas). Site Next.js na Vercel em https://edital-map.vercel.app (domínio próprio pendente) sobre o espelho do PNCP (27 UFs) atualizado a cada 3 h.
- Spec: docs/superpowers/specs/2026-10-15-fase-2-mapa-design.md
- Plano: docs/superpowers/plans/2026-10-15-fase-2-mapa.md
- Portão: docs/fase-2-portao.sql
- Iteração visual: spec docs/superpowers/specs/2026-10-15-fase-2-visual-design.md, plano docs/superpowers/plans/2026-10-15-fase-2-visual.md (mockup em docs/superpowers/specs/assets/).
- Brasil todo: spec docs/superpowers/specs/2026-10-16-fase-3-brasil-todo-design.md, plano docs/superpowers/plans/2026-10-16-fase-3-brasil-todo.md, conferências docs/fase-3-conferencia.sql, métricas docs/fase-3-metricas.md.
- Planos (desenhado, implementação adiada até o domínio): docs/superpowers/specs/2026-10-16-fase-3-planos-design.md.

Referências:
- Estrutura do MVP (doc, nome antigo BidAtlas): https://claude.ai/code/artifact/33a5e4e7-9f62-4f3f-8312-9da344fe5c7c
- Telas (canvas, cores antigas): https://claude.ai/artifact/UZV5qRLMbphDYeWeWDo4Cn
- Identidade visual (design system Edital Map): https://claude.ai/artifact/RzfDxinaVZa1turp598P4N

## Stack
- Worker Node 24 + TypeScript (tsx) em worker/, agendado no GitHub Actions (.github/workflows/sync.yml, a cada 3 h, UFS=BR) e disparado também pelo pg_cron (sync-pncp).
- Supabase (Postgres), projeto edital-map em sa-east-1, plano grátis (teto 500 MB). Schema em supabase/migrations/; mudança só com nova migration.
- Supabase: ref omtwaflypzlebjoeubvp, região sa-east-1.
- Site: Next.js 16 (App Router) + React 19 + Tailwind 4 + maplibre-gl 6 (sem mapa de fundo), na Vercel (região gru1).
- Fases seguintes: Stripe (planos), Resend (alertas e login por e-mail).

## Regras
- O worker grava pelo supabase-js com SUPABASE_SERVICE_ROLE_KEY. Essa chave nunca vai para o navegador nem para o git. O mesmo vale para SUPABASE_DB_URL (só no .env local).
- "Aberta" = encerramento_em > now(). Não confiar no endpoint /proposta para isso; ele só serve para encontrar contratações na carga.
- Datas do PNCP vêm sem fuso: converter com deBrasilia() (America/Sao_Paulo) antes de gravar.
- Link do edital: link_origem; se vazio, https://pncp.gov.br/app/editais/{cnpj}/{ano}/{sequencial}.
- valor_estimado nulo ou 0 = "Valor não informado".
- Em contratos (Fase 4), guardar só fornecedor PJ (LGPD).
- PNCP: tamanhoPagina máx. 50 (51 → 400); modalidade obrigatória; vazio = 204; itens paginam (pedir 50, teto 200 páginas); **consulta limitada a 20 chamadas/min por IP (ritmo em `criarRitmo`, rajada 10); 429 espera 30/60/120 s; 5xx/timeout 2/4/8 s; a base de itens não tem esse limite**; janela do sync = última data boa (com releitura de ontem até 03h); timestamp da compra só avança depois dos itens.
- Modalidades da v1: 6, 8, 4, 7, 12.
- UFS vazio ou BR = país inteiro numa consulta só (sem uf no PNCP); chaves de estado atualizacao:BR:<modalidade>.
- Itens não ficam no banco: cada contratação guarda itens_palavras (tsvector sem posições, mesma configuração de texto) e itens_resumo (jsonb); a lista de itens do edital vem do PNCP na hora (lib/servidor/itensPncp.ts), com "Itens indisponíveis agora" se falhar.
- Retenção: contratação encerrada há mais de 7 dias ou sem encerramento_em é apagada todo dia (pg_cron retencao-contratacoes, 04:45 UTC) e o worker não a grava.
- Medir o banco com npm run db:medir; VACUUM FULL só com npm run db:medir -- --vacuum, fora das rodadas do sync.
- Interface em português do Brasil, com o vocabulário "edital" e "Alertas". Visual: design system Edital Map (não as cores do canvas).
- TDD: teste primeiro (vitest). npm test e npm run typecheck passam antes de cada commit.
- Vercel: projeto edital-map no time JPM Company, região gru1, publicado pela CLI (`vercel deploy --prod`), sem Git ligado; `.vercelignore` impede o envio do `.env`.
- maplibre-gl 6 (só ESM): o worker vem do pacote via `setWorkerUrl` em components/Mapa.tsx (o Turbopack zera o import.meta.url).
- Site: dados só pelo servidor (lib/servidor/*, `server-only`); cache de 5 min; `noindex` até a etapa de SEO; eventos e pedidos de alerta só pelas rotas /api.
- Textos do PNCP só passam pela limpeza de lib/texto.ts (sem IA); siglas novas entram na lista SIGLAS. Título do edital = assunto() (sem a abertura burocrática).
- Página inicial em três colunas a partir de lg (1024 px); abaixo, mapa em tela cheia e lista na gaveta.
- Medição: ao trocar de domínio, remarcar /sobre?interno=1 em cada navegador do dono e fazer uma busca (o cookie em_interno é por domínio).
- GitHub Actions em repositório privado: 2.000 min/mês; 8 rodadas/dia precisam ficar em média abaixo de ~8 min (≤ 66 min/dia).

## Comandos
- npm test / npm run typecheck
- npm run worker:seed: municípios
- npm run worker:backfill -- --dias 30 --ufs BR --proposta [--proposta-ate aaaa-mm-dd]
- npm run worker:sync: sincronização incremental (UFS=BR para o país inteiro)
- UFS=BR npm run worker:conferir -- --amostra 20 [--ufs-abertas SP,BA,AM] [--proposta-ate aaaa-mm-dd] [--idempotencia]
- npm run worker:reler-itens: regrava palavras e resumo dos itens das compras abertas (depois de mudar a regra do resumo)
- npm run db:aplicar -- supabase/migrations/NNNN_nome.sql: aplica uma migração (uma transação)
- npm run db:medir [-- --vacuum]: tamanho do banco e das tabelas
- npm run dev / npm run build: site
- npm run gerar:estados: contorno das UFs do mapa (public/geo/estados.json)
- npm run capturas -- <url> [slug1 slug2 …]: capturas de tela (precisa do Edge invisível na porta 9333)
