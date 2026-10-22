# Edital Map · SEO pelos dados (modalidades, cidades, órgãos e assuntos)

Status: desenho aprovado em 22/10/2026. Primeira de três frentes de SEO: **1 · páginas a partir dos dados** (esta spec), 2 · central de guias e glossário (/guias, /glossario), 3 · fora do site (Search Console, perfis da marca, links), com o João.

## 1. Objetivo

Aparecer nas buscas de quem quer vender ao governo agora: "pregão eletrônico aberto SP", "dispensa de licitação aberta", "licitações prefeitura de Campinas", "licitações Universidade de São Paulo", "licitação vigilância Bahia". Hoje o site tem cerca de 700 páginas fixas (15 assuntos × 27 UFs e 244 cidades). Esta entrega leva a cerca de 3.300, todas com editais abertos de verdade e texto próprio.

Sucesso: sitemap lido sem erro no Search Console, páginas novas indexadas e impressões subindo nas consultas de modalidade, cidade e órgão (medido no Search Console, 4 a 8 semanas depois).

Números de 22/10/2026 (base para os mínimos): 32.458 editais abertos; 4.126 cidades com algum (1.756 com 5+, 244 com 20+); 7.005 órgãos (1.941 com 5+, 716 com 10+); modalidades: pregão eletrônico 16.580, credenciamento 9.153, concorrência 3.998, dispensa 3.046, pregão presencial 247.

## 2. Modalidades

Cinco modalidades da v1, em lib/seo/modalidades.ts:

| slug | id PNCP | nome na página |
|---|---|---|
| `pregao-eletronico` | 6 | pregão eletrônico |
| `pregao-presencial` | 7 | pregão presencial |
| `concorrencia` | 4 | concorrência |
| `dispensa` | 8 | dispensa de licitação |
| `credenciamento` | 12 | credenciamento |

- Rotas: `/licitacoes/{modalidade}` e `/licitacoes/{modalidade}/{uf}`, nas mesmas rotas `[x]` e `[x]/[uf]`. `resolverSegmento` passa a reconhecer assunto, modalidade ou UF; teste garante que nenhum slug de assunto e de modalidade se repete nem tem 2 letras.
- `Pagina` ganha `modalidade: Modalidade | null`. Uma página tem assunto **ou** modalidade, nunca os dois (sem `/licitacoes/epi/pregao-eletronico`).
- Lista: `buscarEditais` com `modalidades: [id]`, ordem por prazo.
- Título: "Pregão eletrônico: licitações abertas em São Paulo"; Brasil: "Pregão eletrônico: licitações abertas no Brasil". Descrição no padrão das outras ("1.234 editais de pregão eletrônico abertos em São Paulo, direto do PNCP…").
- Texto próprio por modalidade (`explicacao`, 2 a 4 frases, escrito à mão, pela Lei 14.133/2021: para que serve, como funciona a disputa, quem pode participar). Aparece abaixo da introdução, em todas as páginas da modalidade. Sem promessa jurídica; fecha com "Confira sempre as regras no edital".
- Vizinhos: na página da modalidade no Brasil, as UFs com editais (contagem por UF); na UF, "Pregão eletrônico no Brasil", "Tudo em São Paulo" e as outras modalidades na mesma UF.
- Contagem por UF: função nova `abertos_por_modalidade()` (seção 6), cache de 1 h.

## 3. Cidades

- Duas regras em lib/seo/municipios.ts:
  - **rota**: qualquer cidade com pelo menos 1 edital aberto responde (sem 404 para a cidade que oscila em torno do mínimo);
  - **sitemap e links da UF**: `MINIMO_CIDADE` passa de 20 para **5**, mais as capitais com algum edital.
- O slug continua `slugCidade(nome)`; nomes repetidos na mesma UF ganham "-2" pela ordem do código IBGE (estável, não pela contagem).
- Título da cidade: "Licitações abertas em Campinas (SP) · Prefeitura e órgãos"; descrição cita "Prefeitura de Campinas e outros órgãos da cidade". H1 continua "Licitações abertas em Campinas (SP)".
- Seção nova "Órgãos que mais compram em Campinas": até 10 órgãos da cidade (função `orgaos_abertos_lista()`, seção 6), em ordem de editais; com página própria (seção 4), o link vai para ela; sem, para a busca `/?orgao={cnpj}` (`prefetch={false}`).
- Página da UF: lista das cidades com 5+ (pode passar de 200 em SP): as 30 com mais editais aparecem, o resto num `<details>` "Todas as cidades".

## 4. Órgãos

- Rota nova: `/licitacoes/orgao/{slug}`, com slug = `slugCidade(nome)` + `-` + CNPJ (14 dígitos). Ex.: `/licitacoes/orgao/universidade-de-sao-paulo-63025530000104`.
  - A rota lê o CNPJ dos 14 dígitos finais; nome diferente do atual = redirect permanente (308) para o slug atual. CNPJ sem edital aberto = 404.
  - `orgao` fica livre como segmento: nenhum assunto, modalidade nem UF pode ter esse slug (teste).
- Quem tem página: órgão com pelo menos 1 edital aberto **e que não seja a prefeitura** (nome começando por "MUNICIPIO DE", "PREFEITURA" ou "PREFEITURA MUNICIPAL", sem acento e sem diferença de caixa); a prefeitura é coberta pela página da cidade. Sitemap: só os com **10+** editais abertos.
- Nome exibido: `nomeProprio(nome)`; nomes genéricos (começam por "FUNDO MUNICIPAL", "SECRETARIA MUNICIPAL", "CAMARA MUNICIPAL") ganham a cidade: "Fundo Municipal de Saúde (Morrinhos/GO)".
- Título: "Licitações abertas: Universidade de São Paulo"; descrição: "148 editais abertos da Universidade de São Paulo (São Paulo/SP), direto do PNCP…".
- Lista: `buscarEditais` com `orgao: cnpj`, ordem por prazo.
- Migalhas: Início › Licitações › {UF} › {órgão}. Vizinhos: a cidade do órgão (se tiver página), a UF e até 12 outros órgãos da mesma UF com página no sitemap.

## 5. Assuntos novos (15 → 51)

Medição de 22/10/2026: 36 candidatos passaram de 100 editais abertos (de 147 em dedetização a cerca de 4.800 em vigilância); ficaram fora locação de imóveis (57) e funerária (115, nicho pequeno). Termos com ruído foram tirados ("portaria", "poste", "vidraria", "bola", "vigilância" sozinha, que pega vigilância sanitária).

- Novos grupos em lib/relevancia/termos.ts e assuntos em lib/seo/assuntos.ts, seguindo as regras de termo já testadas.
- Candidatos: vigilância e segurança patrimonial; limpeza e conservação (serviço); transporte escolar; locação de veículos; pavimentação; iluminação pública; energia solar; climatização (ar-condicionado); câmeras e monitoramento; gás de cozinha e água mineral; cestas básicas; material didático e pedagógico; material esportivo; equipamentos médicos; odontologia; laboratório; extintores e combate a incêndio; dedetização e controle de pragas; gráfica e impressos; ferramentas; jardinagem e paisagismo; sinalização viária; coleta de resíduos; telefonia e internet; cursos e capacitação; manutenção de veículos; eletrodomésticos.
- Entram só os que tiverem **100+ editais abertos no Brasil** pela própria busca (conferido no banco antes de entrar; script em scripts/). O que não atingir fica fora da lista e da spec atualizada.
- Termos não podem roubar resultados de assuntos antigos (ex.: "limpeza" de serviço ≠ "material de limpeza"): teste de que os grupos não repetem termo.
- Fora desta entrega: mapear os assuntos novos no CNAE de lib/cnpj.ts e nos atalhos da página inicial.

## 6. Dados (migração 0023)

Duas funções, só para `service_role`, com a mesma regra de aberta e de duplicatas de `abertas_unicas`:

- `abertos_por_modalidade()` → `(modalidade_id int, uf text, total bigint)`.
- `orgaos_abertos_lista()` → `(cnpj text, nome text, uf text, codigo_ibge text, total bigint)`: nome mais recente, UF e cidade mais frequentes do órgão.

No site (lib/servidor/consultas.ts e lib/servidor/licitacoes.ts): cache de 1 h em memória e no compartilhado, como `municipiosAbertos`. Lista de órgãos tem cerca de 7.000 linhas: só os campos acima (abaixo de 1 MB).

## 7. Links internos

- Edital (components/edital/FichaEdital.tsx): a modalidade vira link para `/licitacoes/{modalidade}/{uf}`; o órgão, para a página do órgão quando ele tiver página (ou para a cidade, quando for a prefeitura). Sem página: texto como hoje. Links com `prefetch={false}`.
- `/licitacoes`: seções "Por modalidade" (5), "Por assunto" (todos), "Por estado" (27) e "Órgãos com mais licitações abertas" (os 30 maiores com página), além das perguntas frequentes.

## 8. Sitemap e índice

- `paginas.xml` passa a incluir: modalidades (Brasil + UFs com editais), cidades com 5+ e capitais, órgãos com 10+, assuntos novos × UFs com editais. Estimativa: cerca de 3.300 endereços (abaixo do limite de 50.000 por arquivo).
- Zero editais = `noindex, follow` (regra atual) em todas as páginas novas.
- Canônico sempre no endereço sem parâmetros, em https://www.editalmap.com.br.

## 9. Erros

- Banco fora: lista "indisponível agora" (como hoje), sem `noindex` (uma queda não tira a página do índice); funções de lista (cidades, órgãos) falhando = só a rota exata ainda não resolvida vira 404 naquele momento, como já acontece com as cidades.
- Órgão com nome vazio: não ganha página.

## 10. Testes

- vitest primeiro: slugs e colisões (assunto × modalidade × UF × "orgao"), `resolverSegmento`, títulos/descrições/migalhas/vizinhos das páginas novas, escolha de cidades (rota ≥ 1, sitemap ≥ 5 + capitais), escolha de órgãos (prefeitura fora, 10+ no sitemap, slug com CNPJ, nome genérico com cidade), regras dos termos novos, `paginasFixas` com modalidades, órgãos e cidades.
- Migração: teste no padrão de scripts/migracoes.test.ts; conferência no banco em docs/seo-dados.sql.
- Depois de publicar: `curl` em amostras de cada tipo (200, título, canônico, robots) e contagem do sitemap.

## 11. Fora desta entrega

Guias e glossário (frente 2); páginas modalidade × assunto; páginas de prefeitura separadas da cidade; CNAE e atalhos dos assuntos novos.
