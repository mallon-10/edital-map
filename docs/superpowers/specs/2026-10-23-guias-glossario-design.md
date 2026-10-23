# Edital Map · Central de guias e glossário (SEO, frente 2)

Status: desenho aprovado em 23/10/2026. Frentes de SEO: 1 · páginas pelos dados (no ar em 22/10, spec 2026-10-22-seo-dados-design.md), **2 · guias e glossário** (esta spec), 3 · fora do site (Search Console, perfis, links), com o João.

## 1. Objetivo

Aparecer para quem está aprendendo a vender ao governo ("o que é licitação", "sicaf", "pregão eletrônico", "dispensa de licitação", "atestado de capacidade técnica") e levar essa pessoa às páginas de editais abertos e ao Pro. As páginas de dados (frente 1) pegam quem já sabe o que procura; os guias pegam o topo do funil e dão autoridade de assunto ao domínio.

Sucesso: guias e termos indexados, impressões no Search Console nas buscas da tabela da seção 2 e cliques dos guias para /licitacoes e /planos (evento `pagina_vista` com origem, já existente). Medição 4 a 12 semanas depois.

Revisão (decisão do João, 23/10): **publicar direto, com fontes**. Cada guia cita a lei e as páginas oficiais e mostra "Revisado em"; o João lê depois, já no ar.

## 2. Pesquisa (volume médio mensal no Brasil, Planejador de Palavras-chave do Google Ads, 23/10/2026)

| Grupo | Buscas (volume) |
|---|---|
| Portais | pncp 165 mil · comprasnet 165 mil · portal nacional de contratações públicas 14,8 mil · compras gov br 12,1 mil |
| SICAF | sicaf 90,5 mil · cadastro sicaf 3,6 mil · o que é sicaf 1,3 mil · como se cadastrar no sicaf 260 |
| Lei | 14133 74 mil · nova lei de licitações 8,1 mil |
| Básico | licitação 40,5 mil · pregão 12,1 mil · o que é licitação 8,1 mil · modalidades de licitação 3,6 mil · o que é edital 3,6 mil · tipos de licitação 1,3 mil |
| Documentos | certidão fgts 246 mil · certidão negativa de débitos 33,1 mil · cndt 33,1 mil · atestado de capacidade técnica 5,4 mil |
| Contratação direta | dispensa de licitação 6,6 mil · inexigibilidade 4,4 mil · dispensa eletrônica 1 mil |
| Depois de ganhar | empenho 6,6 mil · nota de empenho 1,9 mil |
| Começar | como participar de licitação 880 · vender para o governo 880 · como vender para o governo 590 · como participar de licitações de prefeituras 390 |
| Glossário | menor preço 18,1 mil · adjudicação 14,8 mil · catmat 12,1 mil · pregoeiro 2,4 mil · licitante 2,4 mil · inexequibilidade 1,6 mil · diálogo competitivo 1,3 mil · uasg 1 mil · estudo técnico preliminar 1 mil · subcontratação 880 · cotação eletrônica 880 · termo de referência 720 · agente de contratação 590 · sobrepreço 590 · seguro garantia 590 |

Concorrência: blogs de ferramentas do setor (ConLicitação, Effecti) nas buscas de "como", portais do governo nas buscas de navegação. Nas de navegação (pncp, sicaf, certidão fgts) quem busca quer o portal oficial: o guia mira as variações "o que é" e "como" e manda para o portal com link, sem fingir ser ele.

## 3. Primeiro lote: 12 guias (`/guias/{slug}`)

| slug | título (H1) | busca principal |
|---|---|---|
| `como-participar-de-licitacao` | Como participar de licitação: passo a passo para empresas | como participar de licitação, vender para o governo (guia pilar: liga para todos) |
| `o-que-e-licitacao` | O que é licitação e quais são as modalidades | o que é licitação, modalidades de licitação |
| `nova-lei-de-licitacoes` | Nova Lei de Licitações (14.133/2021): o que muda para a empresa | nova lei de licitações, 14133 |
| `sicaf` | SICAF: o que é e como cadastrar a empresa | sicaf, cadastro sicaf |
| `pregao-eletronico` | Pregão eletrônico: como funciona e como dar lances | pregão eletrônico, pregão |
| `dispensa-de-licitacao` | Dispensa de licitação: quando cabe, valores de 2026 e dispensa eletrônica | dispensa de licitação |
| `inexigibilidade-de-licitacao` | Inexigibilidade de licitação: o que é e quando acontece | inexigibilidade de licitação |
| `ata-de-registro-de-precos` | Ata de registro de preços: como funciona para o fornecedor | ata de registro de preços |
| `documentos-para-licitacao` | Documentos e certidões para licitação | certidão negativa, cndt, certidão fgts, documentos para licitação |
| `atestado-de-capacidade-tecnica` | Atestado de capacidade técnica: o que é e como conseguir | atestado de capacidade técnica |
| `pncp` | PNCP: o que é e como encontrar editais abertos | pncp, portal nacional de contratações públicas |
| `empenho` | Empenho e nota de empenho: como a empresa recebe do governo | empenho, nota de empenho |

Estrutura de cada guia (nessa ordem):
1. H1 e **resposta direta** em 40 a 60 palavras (o que o Google e as IAs extraem).
2. "Revisado em {data}" e "Fontes" (âncora para a lista no fim).
3. Seções H2 com parágrafos, listas e passo a passo; termos do glossário viram link para `/glossario/{termo}`.
4. Bloco "Editais abertos agora" com 2 a 4 links para páginas /licitacoes ligadas ao tema (modalidade, assunto ou `/licitacoes`).
5. Perguntas frequentes (3 a 6).
6. Fontes oficiais (Planalto, gov.br, PNCP, TCU), com o nome e o endereço.
7. Chamada: "Veja os editais abertos no mapa" (`/`) e "Receba os editais do seu ramo por e-mail" (`/planos`).

Regras de conteúdo:
- Só o que a lei e as fontes oficiais dizem; nada de promessa ("garanta", "ganhe"). Sempre "confira o edital".
- Valores que mudam por decreto (limites de dispensa, grande vulto) ficam num único arquivo (`conteudo/valores.ts`) com valor, decreto, vigência e fonte; os guias usam esse arquivo. Antes de publicar, conferir o decreto no Planalto (Decreto 12.807/2025, valores de 2026).
- Texto em português do Brasil, frases curtas, sem jargão sem explicação, vocabulário do site ("edital", "Alertas").
- Nada copiado de outros sites.

## 4. Glossário (`/glossario` e `/glossario/{termo}`)

- Cerca de 60 termos. Cada termo: nome, definição de 40 a 60 palavras (primeiro parágrafo), um parágrafo opcional de detalhe, artigo da lei quando houver, termos relacionados e o guia mais próximo.
- Lista inicial: adjudicação, homologação, menor preço, maior desconto, técnica e preço, CATMAT, CATSER, UASG, pregoeiro, agente de contratação, comissão de contratação, licitante, edital, termo de referência, estudo técnico preliminar, projeto básico, inexequibilidade, sobrepreço, superfaturamento, diálogo competitivo, concorrência, pregão, leilão, concurso, credenciamento, dispensa, inexigibilidade, cotação eletrônica, dispensa eletrônica, ata de registro de preços, sistema de registro de preços, órgão gerenciador, adesão à ata (carona), subcontratação, consórcio, habilitação, proposta, lance, sessão pública, impugnação, recurso administrativo, licitação deserta, licitação fracassada, contrato administrativo, empenho, liquidação, garantia contratual, seguro-garantia, reequilíbrio econômico-financeiro, reajuste, aditivo, ME e EPP (tratamento favorecido), margem de preferência, cota reservada, plano de contratações anual, PNCP, SICAF, certidão negativa, CNDT, atestado de capacidade técnica, matriz de riscos.
- `/glossario`: termos de A a Z com âncoras por letra.
- Cada termo tem página própria (indexável) e a lista mostra a definição curta.

## 5. Onde fica o código

- `conteudo/guias/{slug}.ts`: cada guia é um objeto tipado (`Guia`): `slug`, `titulo`, `descricao` (até 160), `resposta` (40–60 palavras), `revisadoEm` (aaaa-mm-dd), `secoes` (`{ titulo, blocos }`, com blocos `paragrafo`, `lista`, `passos`), `editais` (caminhos de /licitacoes), `perguntas`, `fontes` (`{ nome, url }`), `relacionados` (slugs de guias).
- `conteudo/glossario.ts`: lista de `Termo`.
- `conteudo/valores.ts`: valores por decreto.
- Texto com link: marcação curta `[texto](/caminho)` dentro dos parágrafos, convertida em `<Link>` por uma função pura (só caminhos internos começando por `/` e `https://` de domínios oficiais; o resto vira texto).
- Rotas: `app/guias/page.tsx`, `app/guias/[slug]/page.tsx`, `app/glossario/page.tsx`, `app/glossario/[termo]/page.tsx` (estáticas, `generateStaticParams`), componentes em `components/guias/`.
- Visual: o da página inicial nova e do edital (cartões arredondados, tokens do design system), coluna de texto de até 72 caracteres, sumário ao lado no computador.

## 6. SEO técnico

- Metadados: title "{título} · Edital Map", descrição própria, canônico, Open Graph (artigo).
- JSON-LD: `Article` (headline, dateModified = revisadoEm, author e publisher = Edital Map, organização da 0012), `FAQPage` das perguntas, `BreadcrumbList`; no termo, `DefinedTerm` dentro de `DefinedTermSet` (o glossário).
- Sitemap: /guias, os 12 guias, /glossario e os termos em `paginas.xml` (com `lastmod` = revisadoEm).
- Links que chegam aos guias: rodapé ("Guias" e "Glossário"), índice /licitacoes (seção "Aprenda a licitar"), páginas de modalidade (pregão eletrônico/presencial → guia do pregão; dispensa → guia da dispensa; credenciamento → termo credenciamento), perguntas frequentes de /licitacoes (links para os guias), página inicial (link discreto no texto sobre o site).

## 7. Testes

- Cada guia: slug único e igual ao nome do arquivo; descrição até 160; resposta com 40 a 60 palavras; `revisadoEm` válido e não no futuro; pelo menos 2 fontes, todas `https://` de domínios oficiais (planalto.gov.br, gov.br, pncp.gov.br, tcu.gov.br, in.gov.br, caixa.gov.br, tst.jus.br, receita.fazenda.gov.br); 3 a 6 perguntas; `editais` só com caminhos que o site resolve (assunto, modalidade, UF); `relacionados` só com guias existentes; links internos dos textos só para caminhos existentes (guias, termos, /licitacoes…).
- Glossário: termos únicos, slug único, definição de 40 a 60 palavras, relacionados existentes.
- `valores.ts`: cada valor com decreto, vigência e fonte oficial.
- Conversão de links: interno vira link, externo oficial vira link com `rel="noopener"`, qualquer outro vira texto.
- JSON-LD e sitemap com os novos endereços.

## 8. Fora desta entrega

Mais guias (Comprasnet/Compras.gov.br, ME/EPP e MEI, impugnação e recurso, proposta, garantia, como vender para prefeitura); vídeos; comentários; autor pessoa (E-E-A-T com nome do João); páginas em inglês.
