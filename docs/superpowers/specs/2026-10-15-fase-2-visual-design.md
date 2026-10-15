# Edital Map · Fase 2 · Visual — design

Data: 15/10/2026 · Status: partes 1, 2 e 3 aprovadas pelo usuário em 15/10/2026; aguardando revisão da spec escrita.

Referências:
- Mockup do usuário (alvo visual da página inicial): `docs/superpowers/specs/assets/2026-10-15-mockup-inicio.png`
- Spec da Fase 2: `docs/superpowers/specs/2026-10-15-fase-2-mapa-design.md` (continua valendo no que esta não muda)
- Design system Edital Map: https://claude.ai/artifact/RzfDxinaVZa1turp598P4N
- Site atual: https://edital-map.vercel.app (branch `fase-2-mapa`)

## 1. Objetivo

Refazer a página inicial no desenho do mockup (três colunas: lista, mapa do Brasil, edital selecionado) e organizar a página do edital, que hoje mostra textos longos e bagunçados como vêm do PNCP. Mesmo portão da Fase 2 ("10 PMEs usaram, 3 pediram alerta").

## 2. Decisões tomadas (não reabrir)

- Itens que dependem de login e planos (Fase 3): **Planos**, **Assinar Pro** e o filtro **"Raio, órgão e recorrência · Pro"** aparecem; o clique mostra "em breve" e registra o interesse. **Salvos**, a **estrela de salvar** e o contador **"3 de 5 buscas hoje"** ficam de fora (fingiriam algo que não existe).
- Mapa abre mostrando o **Brasil todo**, igual ao mockup. Continua MapLibre (zoom e agrupamento por zoom), agora com o contorno dos 27 estados.
- Página do edital organizada **por regra** (sem IA) e com um bloco de **principais informações**. Resumo com IA sobre o PDF do edital continua na Fase 4.
- **ME/EPP e critério de julgamento**: o worker passa a guardar `tipoBeneficio` e `criterioJulgamento` de cada item e relê uma vez os itens dos editais abertos.
- "Onde mais compram" mostra os **5 municípios** com mais editais na busca atual (por UF só quando a cobertura for o Brasil todo).

## 3. Página inicial

### 3.1 Computador (1440 px)

De cima para baixo:

1. **Cabeçalho**: logo · abas **Mapa** (ativa) · **Alertas** (`/alertas`) · **Planos** (em breve). À direita, botão laranja **Assinar Pro** (em breve).
2. **Busca**: rótulo "O que sua empresa vende?"; campo com lupa; dentro do campo, à direita, seletor de local com pino **"Todo o Brasil ▾"** (Todo o Brasil, SC, PR, RS ativos; as outras 24 UFs aparecem desativadas com "em breve"); botão laranja **"Buscar no mapa"**.
3. **Chips de filtro**: **UF** (o mesmo estado do seletor da busca), **Município** (lista com busca, dos municípios que têm editais na busca atual, ordenada por quantidade), **Valor** (qualquer, acima de R$ 10 mil, 50 mil, 100 mil, 500 mil, 1 mi; chip ativo em azul-marinho como no mockup), **Modalidade** (Pregão eletrônico, Pregão presencial, Concorrência eletrônica, Dispensa, Credenciamento; várias), **"Raio, órgão e recorrência · Pro"** (cadeado; em breve). À direita da linha, em mono e maiúsculas: "FONTE: PNCP · ATUALIZADO HÁ X MIN".
4. **Três colunas** que ocupam o resto da altura da tela:
   - **Esquerda (~360 px)**: número grande "8.567 editais abertos"; abaixo, "3 UFs · R$ 2,1 bi em valor estimado"; alternador **Todos abertos | Encerram em 7 dias**; lista de **cards compactos** com rolagem própria. Card: título em até 3 linhas (texto limpo, seção 4.2) · valor curto à direita em mono · órgão · UF · etiqueta. Card selecionado com borda escura. "Carregar mais" no fim.
   - **Centro**: cartão branco com o mapa do Brasil sem mapa de fundo (seção 3.3).
   - **Direita (~300 px)**: (a) **cartão escuro do edital selecionado**: "CIDADE · UF" em mono, título, órgão · unidade, "VALOR ESTIMADO" e "PROPOSTAS ATÉ" (dd.mm · HHh) em mono, modalidade · Registro de preços, botão laranja **"Ver edital"**; (b) **"Onde mais compram"**: barras horizontais dos 5 municípios com mais editais na busca atual, com o número à direita e, embaixo, o termo buscado; (c) **"Como ler o mapa"**: escala de cores dos estados ("menos abertos" → "200+ por UF") e "● Tamanho = valor estimado".
5. Ao carregar, o primeiro card da lista vem selecionado.

### 3.2 Regras dos cards

- **Valor curto**: menor que R$ 1 mil → "R$ 850"; até R$ 999 mil → "R$ 860 mil" (milhares inteiros); de R$ 1 mi → "R$ 1,25 mi" (duas casas); de R$ 1 bi → "R$ 2,1 bi" (uma casa). Nulo ou zero → "Valor não informado" (no card, em texto menor e cinza no lugar do valor).
- **Etiqueta** (primeira regra que valer): encerra hoje ou amanhã → laranja "Encerra hoje" / "Encerra amanhã"; até 7 dias → amarelo "Encerra em N dias"; publicado nos últimos 3 dias (calendário de Brasília) → "Novo"; senão → verde "Aberto".

### 3.3 Mapa

- Abre enquadrando o Brasil inteiro.
- **Estados**: os 27 desenhados. SC, PR e RS pintados pela quantidade de editais abertos da busca atual, em 4 tons de azul: 1–19, 20–49, 50–199, 200+ (o mais escuro é o azul-marinho da marca). Estado coberto sem resultado: tom mais claro da escala com contorno. Estados sem cobertura: cinza areia (`sunken`) e, ao passar o mouse, "Em breve".
- **Cidades**: círculos laranja, tamanho pela raiz do valor estimado (cidade sem valor: tamanho mínimo). Ao afastar, círculos próximos se juntam (soma de valor e de editais); ao aproximar, se separam. Sem números dentro dos círculos.
- Passar o mouse numa cidade: "Cidade/UF · N editais abertos · R$ X".
- Clicar numa cidade: aplica o filtro Município. Clicar num grupo: aproxima.
- **Pino**: a cidade do edital selecionado ganha o pino da marca.
- Controles + e − em português, sem rotação.

### 3.4 Celular (390 px)

Cabeçalho compacto (logo, Alertas, Assinar Pro); busca com o seletor de local; chips numa linha que rola de lado; mapa em tela cheia; gaveta embaixo como hoje (recolhida mostra a contagem e o alternador; aberta mostra a lista). Tocar num card mostra o cartão escuro no topo da gaveta, com "Ver edital" e um botão para fechar. Sem rolagem da página nem rolagem lateral.

### 3.5 "Em breve" medido

Planos, Assinar Pro e o chip Pro abrem um aviso pequeno: "Os planos chegam em breve. Enquanto isso, crie um alerta grátis para ser avisado." com botão "Criar alerta" e "Fechar". Cada abertura registra `quer_recurso` com `recurso = plano_pro` (Planos e Assinar Pro) ou `filtros_pro` (chip), sem edital.

## 4. Página do edital

### 4.1 Estrutura

1. **Topo**: caminho (Mapa / Cidade/UF); etiquetas (prazo, modalidade, Registro de preços, "Exclusivo ME/EPP" quando todos os itens forem exclusivos); **título curto** grande; órgão · unidade · município/UF; botões "Abrir edital oficial" e "Criar alerta para editais parecidos".
2. **Principais informações** (seis cartões, 3 × 2 no computador, 1 coluna no celular):
   1. **O que compram**: "N itens · materiais" / "serviços" / "materiais e serviços".
   2. **Quanto**: valor estimado (ou "Valor não informado").
   3. **Prazo**: "Propostas de dd.mm até dd.mm · HHh" (início omitido se não houver) + contagem regressiva no padrão da Fase 2.
   4. **Como participar**: modalidade limpa · "Registro de preços" · critério de julgamento (quando todos os itens tiverem o mesmo; senão "critérios variados") · "Onde: <sistema>" (seção 4.3).
   5. **Quem compra**: órgão, unidade, esfera (Federal, Estadual, Municipal, Distrital; omitida se "N").
   6. **ME/EPP**: "Exclusivo para ME/EPP em X de N itens"; "Cota reservada em Y itens" se houver; "Sem benefício para ME/EPP" quando nenhum item tiver. Cartão omitido se nenhum item tiver a informação (itens ainda não relidos).
3. **Itens** (50 primeiros + "Ver todos", como hoje): por item, número · **nome** · quantidade e unidade · unitário · total; etiquetas pequenas (Lote, código CATMAT/CATSER, ME/EPP); abaixo do nome, a especificação em lista "atributo · valor" quando houver; texto restante como "Obs.". Especificação com mais de 3 linhas fica recolhida em "Ver especificação". No celular, cada item vira um bloco (sem tabela larga).
4. **Objeto completo** (só quando o título curto cortou texto), recolhível.
5. **Informações complementares**: limpas; lotes "(L1):…" viram lista "Lote 1 · …"; acima de 400 caracteres, recolhível.
6. **Coluna lateral**: vitrine "Em breve" e "Local e dados", como hoje.

### 4.2 Limpeza de texto (por regra, funções puras)

- Espaços: `\r\n` e quebras de linha no meio de frase viram espaço; espaços repetidos colapsam; espaço antes de pontuação some.
- Prefixo entre colchetes no início ("[Portal de Compras Públicas] -") sai.
- **Maiúsculas**: se o texto tem mais de 70% das letras em maiúsculas, vira texto normal (primeira letra de cada frase maiúscula), preservando as siglas de uma lista fixa no código (no mínimo: ABNT, NBR, CRAS, CAPS, UBS, SUS, ME, EPP, CNPJ, CPF, ART, RRT, EPI, LED, PVC, GLP, ISO, INMETRO, ANVISA, CATMAT, CATSER, PCD, DML e as 27 siglas de UF), números com letras (NBR14992, 1/4, 50x70) e unidades em minúsculo (kg, ml, cm, mm, m²).
- **Título curto**: objeto limpo; se tiver até 160 caracteres, é ele inteiro; senão, corta no fim da primeira frase ou cláusula (". ", "; ", ": ") até 140 caracteres; sem frase curta, corta na palavra e põe "…".
- **Item**: nome = trecho antes do primeiro "atributo:" (padrão CATMAT, ex.: "Película Auto-Adesiva material: …") ou a primeira frase; atributos = pares "chave: valor" separados por ", " ou "; " quando a chave tem de 1 a 4 palavras; "LOTE 08 -" no início vira etiqueta "Lote 8"; "CATMAT 123"/"CATSER 17760" vira etiqueta; resto vira "Obs.".
- **Lotes da informação complementar**: "(L1):texto,(L2):texto" → lista; sem esse padrão, parágrafos limpos.

### 4.3 Onde a disputa acontece

Pelo domínio do link oficial (`link_origem`):

| Domínio | Nome |
|---|---|
| cnetmobile.estaleiro.serpro.gov.br, gov.br/compras | Compras.gov.br |
| portaldecompraspublicas.com.br | Portal de Compras Públicas |
| bllcompras.com | BLL Compras |
| bnccompras.com | BNC Compras |
| pregaobanrisul.com.br | Pregão Banrisul |
| licitacoes-e2.bb.com.br | Licitações-e (Banco do Brasil) |
| comprasbr.com.br | ComprasBR |
| compras.rs.gov.br | Compras RS |
| portal.tce.rs.gov.br | Portal do TCE-RS |
| licitanet.com.br (e subdomínios) | Licitanet |
| licitardigital.com.br (e subdomínios) | Licitar Digital |
| licitamaisbrasil.com.br | Licita Mais Brasil |

Outro domínio: o próprio domínio sem "www.". Sem link: "Sistema indicado no edital".

## 5. Dados

### 5.1 Migration `0004`

- `itens`: novas colunas `beneficio_id int`, `beneficio_nome text`, `criterio_julgamento text` (nulas até a releitura).
- `abertas_unicas`, `buscar_editais`, `mapa_editais` recriadas com os filtros `p_valor_min numeric` (valor estimado ≥) e `p_modalidades int[]` (vazio/nulo = todas); `buscar_editais` passa a devolver também `publicada_em`. Assinaturas antigas removidas; permissões como na `0003` (só o servidor executa).
- Nova `resumo_itens(p_contratacao text)`: total, materiais, serviços, exclusivos ME/EPP (`beneficio_id = 1`), cota reservada (`beneficio_id = 3`), itens com benefício informado, critérios distintos.
- O `edital(slug)` do servidor passa a ler também `abertura_em` e `esfera`.

### 5.2 Contorno dos estados

Script `scripts/gerar-estados-geojson.ts` baixa a malha do IBGE (API de malhas v3, país BR, intrarregião UF, qualidade mínima), troca o código IBGE pela sigla e grava `public/geo/estados.json` (meta: até 200 KB). Arquivo versionado.

### 5.3 Números do painel

Contagem por UF (cores do mapa), "Onde mais compram", "R$ X em valor estimado" e "N UFs" saem dos pontos de `/api/mapa` que o navegador já carrega (somas no cliente, funções puras testadas). A contagem grande vem de `/api/busca` (`total`).

### 5.4 Worker (Fase 1)

- `worker/pncp/esquemas.ts` aceita `tipoBeneficio`, `tipoBeneficioNome`, `criterioJulgamentoNome` (opcionais) no item; `worker/mapear.ts` grava `beneficio_id`, `beneficio_nome`, `criterio_julgamento`.
- Comando `npm run worker:reler-itens`: relê os itens de todas as compras abertas (`encerramento_em > now()`) pela API de itens, com até 4 requisições ao mesmo tempo, mesmas regras de paginação e erro da Fase 1, registrando o progresso. Rodado uma vez pelo controlador depois da `0004`.
- O sync normal (a cada 2 h) mantém os campos atualizados daí para frente.

## 6. Medição

- `RECURSOS` ganha `plano_pro` e `filtros_pro`; para esses dois, `quer_recurso` não exige edital.
- A consulta do portão (`docs/fase-2-portao.sql`) já agrupa `quer_recurso` por recurso; nada muda nela.

## 7. Código

| Unidade | Responsabilidade |
|---|---|
| `lib/texto.ts` | Limpeza: espaços, prefixo, maiúsculas com siglas, título curto, partir item, lotes |
| `lib/participacao.ts` | Sistema da disputa pelo domínio, esfera, modalidade limpa |
| `lib/formato.ts` | + `moedaCurta`, + etiqueta do card (`etiqueta(edital, agora)`) |
| `lib/painel.ts` | Somas a partir dos pontos do mapa: por UF, top municípios, valor total, UFs |
| `lib/filtros.ts` | + `valor` (presets) e `modalidades` (ids 4, 6, 7, 8, 12) |
| `lib/eventos.ts` | + `plano_pro`, `filtros_pro` |
| `components/inicio/*` | Cabeçalho novo, busca com local, chips, lista compacta, cartão escuro, onde mais compram, legenda, aviso "em breve" |
| `components/Mapa.tsx` | + camada de estados (coroplético), círculos laranja por valor, pino do selecionado |
| `components/edital/*` | Principais informações, item organizado, texto recolhível, lotes |

## 8. Testes

- Unitários (vitest, escritos antes): `texto` com os exemplos reais da seção 4 (película auto-adesiva, rejunte em maiúsculas com NBR, medalha com CATSER, info "(L1):…", objeto com colchetes, objeto longo do CRAS); `participacao` (cada domínio da tabela + desconhecido + sem link); `moedaCurta`; `etiqueta`; `painel`; `filtros`; `eventos`; worker `mapear` com benefício e critério.
- SQL no banco depois da `0004`: filtros de valor e modalidade batem com contagens diretas; `resumo_itens` de um edital conhecido; nenhuma duplicada nova.
- Releitura: contagem de itens com `beneficio_id` preenchido nos editais abertos (meta: > 95%).
- Capturas 1440 e 390 px da inicial (comparadas com o mockup) e de uma página de edital com itens CATMAT, maiúsculas e lotes.
- `npm test` e `npm run typecheck` passando; worker sem regressão.

## 9. Fora do escopo

Contador de buscas, Salvos, estrela de salvar, login, planos de verdade, Brasil todo nos dados, IA sobre o PDF, filtros Pro de verdade.

## 10. Critérios de aceite

- [ ] Página inicial no desenho do mockup em 1440 px e utilizável em 390 px sem rolagem lateral.
- [ ] Filtros de UF, município, valor, modalidade e 7 dias funcionando juntos na lista e no mapa.
- [ ] Mapa abre no Brasil, estados cobertos coloridos pela busca, círculos por valor, pino no selecionado.
- [ ] Página do edital com principais informações, itens organizados e textos limpos nos exemplos da seção 8.
- [ ] ME/EPP e critério aparecendo nos editais abertos depois da releitura.
- [ ] Cliques em Planos, Assinar Pro e chip Pro registrados como `quer_recurso`.
- [ ] Publicado em https://edital-map.vercel.app; testes e typecheck passando.
