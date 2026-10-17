# Edital Map · Mapa legível — design

Data: 17/10/2026 · Status: design aprovado pelo usuário em 17/10/2026 ("bem melhor"); aguardando revisão da spec escrita.

Referências:
- Inspiração: mapa do Hotelist (https://hotelist.com): fundo cinza com cidades e fronteiras, marcadores que já dizem o número, nada mais sobre o mapa.
- Protótipo descartável (fora do repositório) que validou a direção: fundo OpenFreeMap positron + divisas e nomes dos estados + pílulas com número.
- Spec visual anterior: `docs/superpowers/specs/2026-10-15-fase-2-visual-design.md` (continua valendo no que esta não muda; a seção 3.3 e o item (c) "Como ler o mapa" da 3.1 são substituídos por esta).
- Design system Edital Map: https://claude.ai/artifact/RzfDxinaVZa1turp598P4N

## 1. Objetivo

Hoje o mapa é bonito, mas não é usável: estados pintados em 4 tons de azul e círculos laranja do tamanho do valor estimado disputam o mesmo espaço, se sobrepõem no Sul e no Sudeste e não dizem nada sem clique. O objetivo é que a pessoa **encontre editais pelo mapa**: saiba onde está (estados com nome, cidades, países vizinhos) e veja quantos editais há em cada lugar sem clicar.

## 2. Decisões tomadas (não reabrir)

- **Só o mapa muda.** As três colunas da página inicial (lista · mapa · edital selecionado e "Onde mais compram") ficam como estão. Nada de lista que acompanha a área do mapa nesta etapa.
- **Mapa de fundo de verdade**: OpenFreeMap, estilo `positron` (`https://tiles.openfreemap.org/styles/positron`), gratuito, sem chave. Revoga a regra "sem mapa de fundo".
- **Divisas estaduais bem marcadas e nome de cada estado** por cima do fundo.
- **Marcador = pílula com a quantidade de editais** (não o valor). Tamanho fixo. O valor continua na dica, na lista e no cartão.
- **Sem pintura dos estados** e **sem a caixa "Como ler o mapa"**.

## 3. O mapa

### 3.1 Fundo

- Estilo `positron` do OpenFreeMap, carregado pela URL acima.
- **Nomes em português**: nos rótulos de lugar do estilo (países, cidades, estados), o texto passa a ser `coalesce(name:pt, name)`. Assim "Brazil" vira "Brasil".
- Os **nomes de estado do próprio estilo** (camada `label_state`) ficam escondidos; os nossos entram por cima (3.2).
- **Crédito** "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" no canto inferior direito, em modo compacto (botão ⓘ que abre o texto), como o MapLibre faz por padrão. É obrigatório pela licença.
- Rotação e inclinação continuam desligadas; o enquadramento inicial continua o Brasil inteiro (e o ajuste da gaveta no celular continua igual).

### 3.2 Estados

- **Divisas**: vêm dos limites administrativos do próprio fundo (camada `boundary` dos tiles, `admin_level` 4, sem as marítimas), porque o nosso `public/geo/estados.json` é simplificado e não bate com o litoral do fundo (no protótipo a linha passava pelo mar). Linha `ink` (#0c2340) com opacidade ~0,55, espessura de ~0,8 px no Brasil inteiro a ~1,6 px com zoom de estado. Fica com o mesmo peso nos países vizinhos (províncias da Argentina etc.); é aceitável.
- **Nomes**: uma camada nossa de texto com o nome de cada UF em maiúsculas ("SÃO PAULO", "MINAS GERAIS"), cor `ink-muted` (#3e5373), com contorno branco e espaçamento entre letras. Fonte "Noto Sans Bold", que vem do servidor de fontes do OpenFreeMap (`glyphs` do estilo).
- **Posição dos nomes**: um ponto por estado, gerado uma vez pelo `npm run gerar:estados` num arquivo novo `public/geo/estados-rotulos.json` (centro por área do maior polígono do estado; ajuste manual para estados em que esse centro fique ruim, se aparecer). Os nomes das 27 UFs ficam numa lista em `lib/` (com teste).
- **Colisão**: os nomes somem sozinhos quando batem uns nos outros ou nas pílulas (Nordeste no Brasil inteiro) e voltam ao aproximar. As pílulas têm prioridade: nunca somem por causa de um nome.

### 3.3 Pílulas

- **Uma pílula por cidade ou por grupo de cidades**, com o número de editais abertos daquela busca. Agrupamento como hoje (agrupa até o zoom 8), com o raio de agrupamento maior (40 → 60 px) para as pílulas não se encostarem.
- **Texto**: número em formato curto. Até 9.999 com ponto de milhar ("1.443"); de 10 mil em diante, "12 mil" (sem casa decimal); de 1 milhão, "1,2 mi" (não deve acontecer, mas não quebra).
- **Visual**: fundo `pin` (#ff5a1f), número em `ink` (#0c2340) em negrito na fonte mono do site, borda branca de 1,5 px, sombra leve, cantos totalmente arredondados. A pílula fica **acima** do ponto, com uma pontinha embaixo apontando para a sede do órgão (como no Hotelist).
- **Cidade do edital selecionado**: a pílula daquela cidade fica azul-escura (`ink`) com número branco e vai para a frente das outras. Substitui o pino separado de hoje. Se a cidade estiver dentro de um grupo naquele zoom, o grupo é que fica azul-escuro.
- **Como são feitas**: elementos HTML (`<button>`) postos pelo MapLibre (`Marker`) sobre os grupos e cidades visíveis, recalculados quando o mapa se move ou os dados mudam, reaproveitando os elementos que continuam na tela. Isso deixa a pílula com a fonte e as cores do site e acessível pelo teclado.
- **Acessibilidade**: cada pílula é um botão com rótulo: cidade → "São Paulo/SP: 1.443 editais abertos"; grupo → "1.443 editais abertos nesta região. Aproximar". Foco visível (contorno `rio`, como o resto do site).

### 3.4 Interação

- **Clique (ou Enter) num grupo**: aproxima até o grupo se abrir, como hoje.
- **Clique numa cidade**: escolhe a cidade, como hoje (`aoEscolherCidade`).
- **Dica ao passar o mouse** sobre a pílula, com as mesmas linhas de hoje: cidade → "São Paulo/SP" · "1.443 editais abertos" · valor curto; grupo → "1.443 editais abertos" · valor · "Aproxime para ver as cidades". No toque não há dica (o clique já resolve).
- Os **estados não têm mais dica**: o número já está no mapa.
- O **círculo do raio** (filtro Pro) continua igual, por cima do fundo.

### 3.5 Se o fundo não carregar

Se o estilo do OpenFreeMap não responder (erro ou ~8 s sem carregar), o mapa monta o estilo de reserva: fundo branco e contornos de `public/geo/estados.json` em linha `ink`, sem os nomes dos estados (as fontes também vêm do OpenFreeMap). As pílulas funcionam igual nos dois casos, porque são HTML. Nada de mensagem de erro para o usuário: o mapa só fica mais simples.

### 3.6 Coluna da direita e rodapé do mapa

- Sai a caixa **"Como ler o mapa"** (`components/inicio/LegendaMapa.tsx`).
- A observação **"O ponto é a sede do órgão, não o local de entrega."** vira uma linha pequena (`text-xs`, `ink-muted`, fundo branco translúcido) no canto inferior esquerdo do mapa, no computador. No celular fica de fora (a gaveta cobre esse canto).

### 3.7 Celular

Mesmo mapa, mesmas pílulas e mesmos nomes; a gaveta continua como está. As pílulas têm área de toque de pelo menos 32 px de altura (o número continua pequeno).

## 4. Limpeza

- Saem de `lib/painel.ts` as funções e constantes que só serviam à pintura dos estados e à legenda: `faixasRelativas`, `CORES_FAIXA`, `coresDosEstados`, `CONTORNO_VAZIO_COR`, `contornosDosEstados`, e os testes delas em `lib/painel.test.ts`. O resto do painel (como `resumirPontos`) fica.
- O `Mapa` deixa de receber `porUf` (só servia para as cores e a dica do estado). `painel.porUf` continua onde mais for usado.
- Sai a constante `RAIO` (tamanho pelo valor) e o SVG do pino.
- `CLAUDE.md`: a linha da stack passa de "maplibre-gl 6 (sem mapa de fundo)" para "maplibre-gl 6 com fundo OpenFreeMap positron (reserva sem fundo)".

## 5. Testes e verificação

- **Teste primeiro (vitest)** para as partes puras, num módulo novo `lib/mapaRotulos.ts` (ou nome equivalente):
  - número curto da pílula (1 → "1"; 1443 → "1.443"; 9999 → "9.999"; 12 345 → "12 mil"; 1 200 000 → "1,2 mi");
  - rótulo acessível de cidade e de grupo (singular "1 edital aberto" e plural);
  - nomes das 27 UFs (todas presentes, em português);
  - expressão de nome em português para os rótulos do fundo;
  - escolha do estilo: com fundo ou reserva.
- `npm test` e `npm run typecheck` passam.
- **Capturas** (`npm run capturas`) no computador e no celular, antes e depois: Brasil inteiro, uma busca com poucos resultados, zoom num estado, cidade selecionada, filtro de raio ligado. Conferir que as pílulas não se sobrepõem no Sudeste e que os nomes de estado aparecem.
- **Reserva**: captura com o domínio do OpenFreeMap bloqueado no navegador da captura, mostrando o fundo branco com estados e pílulas.
- **Peso**: anotar o tempo até o mapa aparecer, antes e depois (as capturas já medem o carregamento da página).

## 6. Fora desta etapa

- Lista que acompanha a área visível do mapa e layout em duas colunas.
- Cor da pílula por prazo ou valor.
- Servir os tiles e as fontes por conta própria (só se o OpenFreeMap der problema).
