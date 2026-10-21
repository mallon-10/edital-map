# Visual novo · página inicial (21/10/2026)

Prévia aprovada pelo dono: https://claude.ai/artifact/C5ZQL9SgB4Lbh9Dp6jRMWH (computador e celular). Referência: app de
VPN com fundo claro, cartões brancos bem arredondados, um destaque grande no topo, atalhos em linha e listas com respiro.
Cores, fontes e o laranja do pin continuam os do design system Edital Map.

## O que muda

1. **Cabeçalho** mais leve: sem borda, sobre o `surface`; abas e botões em pílula (`rounded-full`).
2. **Busca em pílula** (`rounded-full`, 56 px, branca) com o estado dentro e "Buscar" laranja em pílula. Celular: campo em
   pílula + "Filtros (n)" em pílula. Os chips de filtro continuam no computador, embaixo da busca (decisão: filtros
   à vista valem mais que a pureza da prévia); no celular continuam na folha de Filtros.
3. **Cartão do topo** (`components/inicio/CartaoTopo.tsx`), branco, raio 28 px:
   - linha mono "FONTE PNCP · ATUALIZADO HÁ …";
   - título da busca (`tituloDaBusca`, lib/inicio.ts): "Uniforme em Santa Catarina", "Licitações abertas no Brasil";
   - "N editais abertos" em `mata` (aria-live) e "R$ … em valor estimado" em mono (dos pontos do mapa);
   - "Ver os N editais" (pílula laranja, rola até a lista), "Criar alerta" (/alertas/novo) e "Exportar" em botões redondos;
   - o mapa: à direita no computador (460 px de altura), em cima no celular (46svh); botão de tela cheia (Esc fecha).
   - `vista=lista` no endereço continua valendo: o cartão fica sem mapa (com "Mostrar o mapa"). O alternador Lista | Mapa
     sai da tela; na barra do celular, Mapa leva ao topo (e liga o mapa se estava em Lista) e Lista rola até a lista.
4. **Oferta do Pro** vira cartão branco com X (`FaixaOferta`): fechar some por 7 dias (localStorage `em_oferta_fechada`).
   Na inicial ela aparece embaixo do cartão do topo (o cabeçalho recebe `semOferta`); nas outras páginas, embaixo do
   cabeçalho, como antes. Quem decide continua sendo `mostrarOferta`.
5. **Atalhos de assunto** (`components/inicio/Atalhos.tsx`): Uniformes, EPI, Limpeza, Informática, Alimentos e
   Hospitalar, com o total aberto no Brasil (`abertosPorUf(termo)`, somado; falhou: sem número). O atalho da busca atual
   fica marcado. Link para `/?q=termo` (+ UF atual), sem prefetch.
6. **Lista**: cartões brancos sem borda, raio 22 px, mais respiro; etiquetas em pílula; valor e data à direita. Clicar no
   cartão abre o edital também no computador; passar o mouse acende o ponto no mapa. O cartão escuro do edital
   selecionado sai. Ao lado (computador): "Valor em jogo" e "Onde mais compram" em cartões brancos.
7. Página do edital: segunda etapa, depois desta.

## O que fica igual

Busca no endereço e `trocarEndereco`, volta do edital no mesmo lugar, eventos (`busca` com total), barra do celular,
folha de Filtros, CNPJ no campo, paginação, ordem, prazo, exportar, salvar, relevância, `SobreInicio` embaixo.

## Ordem de trabalho

1. lib/inicio.ts (título, atalhos, oferta fechada) com testes.
2. Contagem dos atalhos no servidor.
3. FaixaOferta em cartão; Cabecalho leve com `semOferta`.
4. BuscaPrincipal em pílula.
5. CartaoTopo + mapa + Atalhos no Explorador; ColunaLista e CardCompacto no estilo novo; aside.
6. Testes de estrutura atualizados para as decisões novas; capturas 1440 e 390; publicar.
