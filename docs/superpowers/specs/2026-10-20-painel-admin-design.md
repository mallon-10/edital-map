# Painel do dono (/admin) · 20/10/2026

Objetivo: o dono ver, numa página só, o que as pessoas fazem no site: visitas e de onde vêm, páginas mais vistas, termos
mais buscados (e os que não acham nada), editais mais abertos, recursos usados e o funil até a assinatura.

## Dados

Tudo sai da tabela `eventos` (sem `interno`), mais contagens de `perfis`, `checkouts`, `assinaturas` e `alertas`.
Nada pessoal: sem e-mail, sem IP (só o hash que já existia), referência só pelo domínio do site de origem.

Novos dados gravados:

1. **`pagina_vista`** (navegador, `components/RegistrarVisita.tsx` no layout): a cada troca de página (pathname).
   `detalhe`: `pagina` (caminho sem parâmetros; `/edital/{slug}` vira `/edital` + `edital`; `/alertas/{id}/editar` e
   `/obrigado/{codigo}` sem o id), e só na **entrada** (primeira página do carregamento, vinda de fora do site): `origem`,
   `site` (domínio de quem mandou) e `campanha` (`utm_campaign`). Fora: `/admin` e robôs (a rota não grava robô).
   Origem (`lib/origem.ts`): `anuncio` (gclid/gbraid/wbraid ou utm_medium pago), `email`, `ia` (ChatGPT, Gemini,
   Perplexity, Copilot, Claude), `google`, `outro_buscador`, `redes`, `outro_site`, `direto`.
2. **`busca` com `total`**: a busca passa a ser gravada depois da resposta, com o total achado (null se falhou); a busca
   trocada por outra antes de responder não conta. A busca que chega pronta no endereço (`/?q=…`, links do CNPJ, anúncio)
   também conta, com o total que veio do servidor; voltar do edital não conta.
3. Limite de eventos por IP: 120 → 240 por hora (páginas vistas somam).
4. Retenção: `pagina_vista` com mais de 400 dias sai todo dia (pg_cron `retencao-eventos`, 04:50 UTC). Os outros tipos ficam.

## Banco (0021)

- `eventos_tipo_check` ganha `pagina_vista`.
- `painel_admin(p_desde, p_ate)` → jsonb com resumo, por dia (America/Sao_Paulo), origens, sites, campanhas, páginas,
  entradas, termos (vezes, pessoas, média achada, vezes sem nada), sem resultado, UFs, editais (com objeto/UF quando ainda
  no banco), recursos (`usou_recurso` e `quer_recurso`) e funil (visitantes distintos: visitou → buscou → abriu edital →
  viu /planos → tentou assinar → assinou). Só `service_role` executa.

## Página

- `/admin?periodo=hoje|7|30|90` (padrão 7), componente de servidor, `noindex`, sem prefetch.
- ~~Só com o cookie `em_dono` válido~~ **Revisão de 21/10/2026: só local.** O painel não existe no site publicado:
  `app/admin/page.local.tsx`, extensão `.local.tsx` reconhecida só no `next dev` (`lib/paginasLocais.ts`), 404 fora do
  desenvolvimento, `npm run admin` preso ao 127.0.0.1:3100. Sem cookie; links abrem o site publicado sem Referer.
- Dados por `lib/servidor/admin.ts` (`server-only`); formatação e montagem em `lib/admin.ts` (testada).
- Visual do design system: cartões de números, barras horizontais nas listas (largura pelo maior), série por dia em barras.
- Os dados antigos (15/10 em diante) aparecem; páginas vistas, origem e total da busca valem a partir da publicação.
