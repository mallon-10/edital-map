# Edital Map · SEO (entrega 1 de 3 do MVP pago)

Status: desenho aprovado em 18/10/2026. Entregas do MVP pago, nesta ordem: **1 · SEO** (esta spec), 2 · pagamento Cakto e cadeados, 3 · medição do Google Ads e aviso de cookies. Cada uma tem spec, plano e deploy próprios.

## 1. Objetivo

Aparecer no Google para quem procura licitações ("licitação EPI SP", "licitações abertas Bahia", "pregão uniformes"). Hoje o site inteiro está fechado: `robots: { index: false }` em app/layout.tsx, `disallow: '/'` em app/robots.ts e `X-Robots-Tag: noindex, nofollow` em next.config.ts. O SEO leva de 2 a 4 meses para trazer tráfego, por isso vem antes do pagamento.

Sucesso: o Search Console lê o sitemap sem erro, as páginas fixas são indexadas e as impressões começam a subir. Medição no próprio Search Console (sem tag do Google nesta entrega).

## 2. Abrir o site

- Sai o `noindex` do layout e o `X-Robots-Tag` do next.config.ts.
- `robots.ts`: permite tudo, menos `/api/`, e aponta o sitemap.
- `metadataBase` = `https://www.editalmap.com.br` (constante `SITE_URL` em lib/seo/site.ts). Canônico em cada página indexável; o edital-map.vercel.app passa a apontar o canônico para o www.
- Open Graph básico (título, descrição, `locale: pt_BR`, `siteName`) no layout. Sem imagem gerada nesta entrega.
- `verification.google` vindo de `GOOGLE_SITE_VERIFICATION` (meta tag do Search Console). Vazio = sem tag.

O que fica fora do Google:

| Página | Regra |
|---|---|
| `/` sem parâmetros | indexa |
| `/` com qualquer parâmetro de busca | `noindex, follow`, canônico `/` (busca infinita não entra) |
| `/edital/[slug]` aberto (`em_aberto`) | indexa |
| `/edital/[slug]` encerrado, revogado ou anulado | `noindex, follow`; apagado pela retenção = 404 como hoje |
| `/planos`, `/sobre`, `/alertas` | indexam |
| `/licitacoes/...` com zero editais abertos | `noindex, follow` |
| `/api/*` | bloqueado no robots |

## 3. Páginas fixas `/licitacoes`

Rotas novas (App Router, componentes de servidor, sem contar uso):

- `/licitacoes`: índice com os 14 assuntos e as 27 UFs.
- `/licitacoes/[x]`: `x` é um assunto (`epi`) ou uma UF em minúsculas (`sp`). UF tem 2 letras e nenhum slug de assunto tem 2 letras (teste garante); qualquer outro valor = 404.
- `/licitacoes/[assunto]/[uf]`: assunto numa UF (`/licitacoes/epi/sp`).

Ao todo: 1 + 14 + 27 + 378 = 420 páginas.

**Assuntos** em lib/seo/assuntos.ts, um por grupo de `GRUPOS` (lib/relevancia/termos.ts), ligados pelo campo `assunto`:

| slug | nome na página | termo da busca |
|---|---|---|
| epi | EPI (equipamentos de proteção individual) | EPI |
| uniformes | uniformes profissionais | uniforme |
| limpeza | materiais de limpeza | material de limpeza |
| construcao | materiais de construção | material de construção |
| moveis | móveis | mobiliário |
| alimentos | alimentos e merenda escolar | merenda |
| informatica | informática | informática |
| escritorio | material de escritório | material de escritório |
| hospitalar | medicamentos e material hospitalar | medicamento |
| veiculos | veículos e peças | veículo |
| combustiveis | combustíveis | combustível |
| obras | obras e reformas | reforma |
| manutencao-predial | manutenção predial | manutenção predial |
| servicos-de-saude | serviços de saúde | serviço de saúde |

O termo da busca é um termo do próprio grupo: a busca expande para os relacionados como na página inicial. Testes: cada grupo de `GRUPOS` tem um assunto; o termo pertence ao grupo; slugs únicos, sem 2 letras.

**Conteúdo de cada página** (o mesmo molde nas três rotas):

- `<title>` e `<h1>`: "Licitações de EPI abertas em São Paulo" / "Licitações de EPI abertas no Brasil" / "Licitações abertas em São Paulo". Descrição com o total: "128 editais de EPI abertos em São Paulo, do PNCP, atualizados a cada 3 horas…".
- Faixa de cobertura que já existe (fonte PNCP, modalidades, atualizado em).
- Texto curto fixo por molde (2 a 3 frases, sem IA), com o total e a UF.
- Os 20 primeiros editais abertos (`buscarEditais`, `pagina` 1): por relevância nas páginas com assunto, por prazo nas de UF e Brasil, no mesmo cartão da lista, com link para o edital (`prefetch={false}`).
- Botão "Ver todos no mapa" → `/?q=<termo>&uf=<UF>` (urlDaBusca), que conta como busca normal quando o visitante chega lá.
- Links vizinhos: nas páginas de assunto, as 27 UFs daquele assunto; nas de UF, os 14 assuntos naquela UF; nas de assunto × UF, o mesmo assunto no Brasil e a UF com todos os assuntos.
- Caminho (Início / Licitações / EPI / SP) com `BreadcrumbList` em JSON-LD.
- Zero editais: "Nenhum edital de EPI aberto em Roraima agora" + links vizinhos, com `noindex, follow`.

Dados: `buscarEditais` com o cache de 5 min de lib/cache.ts. Banco fora: a página responde com a lista vazia e a mensagem "Lista indisponível agora" (sem `noindex`, para não tirar a página do índice por uma queda), em vez de erro 500.

## 4. Página do edital

- `generateMetadata` ganha descrição (órgão, cidade/UF, modalidade, prazo, valor ou "Valor não informado"; até 160 caracteres) e canônico.
- `robots` conforme a tabela da seção 2 (lida com a mesma regra de `em_aberto`; o site já recebe a situação e o encerramento).
- JSON-LD `BreadcrumbList` (Início / Licitações / UF / edital). Sem um tipo schema.org de licitação nesta entrega.

## 5. Robôs fora da contagem

O Googlebot não devolve cookie: cada visita dele já chega como visitante novo e nunca bate no limite, mas grava uma linha em `uso_diario` (teto de 500 MB) e conta como abertura.

- lib/robos.ts: `ehRobo(userAgent)` reconhece Googlebot, Google-InspectionTool, Bingbot, DuckDuckBot, YandexBot, Applebot, facebookexternalhit e um padrão geral `bot|crawler|spider` (testes com user-agents reais).
- proxy.ts: com robô, não cria `em_visitante` (segue sem cookie). Sem cookie, `contextoDaPagina` devolve null e nada é contado, como já acontece hoje.
- Quem imitar um robô ganha o mesmo que ganha apagando os cookies (a spec de Planos aceita isso: o limite do grátis é um lembrete). Sem checagem de DNS reverso.

## 6. Sitemap

`app/sitemap.ts` com `generateSitemaps`:

- `id 0`: páginas fixas (`/`, `/planos`, `/sobre`, `/alertas`) e as `/licitacoes` com pelo menos um edital aberto.
- `id 1..n`: editais abertos, 40.000 por arquivo (o teto do formato é 50.000), `lastModified` = `atualizada_pncp_em`.

Banco (migração 0012, `npm run db:aplicar`):

- `editais_abertos_sitemap(p_limite int, p_deslocamento int)` → `slug, atualizada_pncp_em`, só de `public.em_aberto`, ordem estável por `id`. `total_editais_abertos()` para calcular `n`.
- `abertos_por_uf(...)`: mesmos argumentos de busca de `buscar_editais`, devolve `uf, total` (uma chamada por assunto, 14 ao todo, para o sitemap e para esconder UFs vazias nos links). Sem assunto = total por UF.

Sitemap com cache de 1 h (`revalidate = 3600`).

## 7. Testes

Vitest, teste primeiro:

- lib/seo/assuntos.ts: cobertura de `GRUPOS`, slugs, termo dentro do grupo, separação UF × assunto em `/licitacoes/[x]`.
- Montagem de título, descrição e texto de cada molde (com e sem UF, singular "1 edital", zero).
- Descrição do edital (com e sem valor, corte em 160).
- `robots` por situação do edital e da página inicial com parâmetros.
- `ehRobo` com user-agents reais (robôs e navegadores comuns, inclusive celular).
- proxy: robô sem cookie novo; navegador continua recebendo cookie.
- Sitemap: divisão em arquivos e só páginas com editais.

Conferência manual depois do deploy: `curl -A Googlebot` numa página de edital não grava em `uso_diario`; `/robots.txt` e `/sitemap/0.xml` respondem; Teste de URL do Search Console numa página de assunto × UF.

## 8. O que depende do João

- Criar a propriedade `https://www.editalmap.com.br` no Search Console e passar o código da meta tag (ou verificar por DNS no Registro.br).
- Enviar `https://www.editalmap.com.br/sitemap.xml` no Search Console depois do deploy.

## 9. Fora desta entrega

Páginas por município e por órgão; imagem de Open Graph; blog e artigos (skill blog-geo); tag do Google e conversões (entrega 3); CNPJ → segmento.

## 10. Critérios de aceite

- [ ] `/robots.txt` libera o site (menos `/api/`) e aponta o sitemap; nenhuma resposta leva `X-Robots-Tag: noindex`.
- [ ] As 420 páginas `/licitacoes` respondem; as vazias com `noindex, follow`.
- [ ] Edital aberto indexável com descrição e canônico; encerrado com `noindex`.
- [ ] `/?q=...` com `noindex, follow` e canônico `/`.
- [ ] Visita com user-agent de robô não cria cookie nem grava uso.
- [ ] Sitemap lido sem erro no Search Console.
- [ ] `npm test` e `npm run typecheck` passam.
