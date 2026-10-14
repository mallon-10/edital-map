# Sondagem · preço de referência · 2026-10-14

## Veredito
Dá com ressalva — o PNCP devolve valor unitário homologado e CNPJ do fornecedor por item (146 de 146 itens consultados), mas nenhum item de EPI/uniforme traz CATMAT (0 de 973), então a comparação "mesmo produto" só funciona por descrição, e a cobertura recente é baixa (25% dos itens já têm resultado).

## Preço homologado por item
O endpoint `GET /api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{seq}/itens/{n}/resultados` existe, responde 200 e devolve uma lista por item, com `valorUnitarioHomologado`, `quantidadeHomologada`, `valorTotalHomologado`, `niFornecedor`, `nomeRazaoSocialFornecedor`, `tipoPessoa`, `dataResultado`, `ordemClassificacaoSrp`, `numeroControlePNCPCompra` e, às vezes, `localidadeFornecedor` (UF/município).

Exemplo real (compra `92963560000160-1-001159/2026`, item 3, "Oculos de seguranca policarbonato", unidade "Unidade"): valor unitário homologado R$ 7,50, quantidade 100, fornecedor CAR PAINTS ESTETICA AUTOMOTIVA LTDA, CNPJ 45861125000144, resultado em 2026-09-15. O valor estimado do mesmo item era R$ 20,08.

Cuidados que os dados mostraram:
- Em registro de preços a lista traz também os classificados na reserva, com `valorUnitarioHomologado` = 0 e quantidade 0. Das 274 linhas de resultado lidas, 128 eram assim; as 146 restantes eram as vencedoras, uma por item. Precisa filtrar valor > 0 (e `ordemClassificacaoSrp` = 1).
- Há valores fora do padrão: "Luva de segurança tricotada em algodão" (compra `82892316000108-1-000296/2026`) saiu a R$ 4,68 contra R$ 37,19 estimados. Uma mediana sem filtro de discrepância pode enganar.
- Todos os resultados lidos tinham situação "Informado"; a unidade de medida não vem no resultado, só no item (`unidadeMedida`), então é preciso cruzar com a lista de itens.
- Só 240 de 973 itens (25%) tinham `temResultado = true`; 18 de 40 compras tinham ao menos um resultado. A amostra é das compras mais recentes (cerca de 30 a 60 dias), muitas ainda "Em andamento". Cobertura em compras mais antigas não foi medida.

## Comparar o mesmo produto
0 de 973 itens de EPI/uniforme têm CATMAT (`catalogoCodigoItem` nulo em todos; 0 de 168 na primeira rodada e 0 de 973 na ampliada, e os campos `catalogo` e `categoriaItemCatalogo` também vieram nulos nos 144 itens conferidos à parte; `ncmNbsCodigo` apareceu em 13 desses 144). A descrição serve de reserva só em parte: muitas vêm no formato de catálogo ("Calça material: terbrim, modelo: tática, ..."), o que ajuda a normalizar, mas outras são livres ("KIT CAMISETA, CALÇÃO E MEIÃO ESPORTIVO FUTSAL INFANTIL TAMANHO 12") e misturam tamanho, kit e unidade. Comparar o mesmo produto exigirá normalização de texto (palavras-chave, unidade, tamanho), não uma chave exata.

## Quem venceu
Os resultados por item são a fonte: cada linha traz `niFornecedor` e `nomeRazaoSocialFornecedor` (274 de 274 linhas), com `numeroControlePNCPCompra` para ligar à compra.
- Contratos (`/v1/contratos`): 10 de 10 registros têm fornecedor e `numeroControlePncpCompra`, mas o valor é global do contrato (`valorGlobal`), sem quebra por item.
- Atas (`/v1/atas`): 10 de 10 têm `numeroControlePNCPCompra`, mas nenhum campo de fornecedor nem de valor. Observação: com `dataInicial` e `dataFinal` iguais a ontem a lista devolveu 486.060 atas de 2023 a 2026, ou seja, o filtro parece valer para a vigência, não para a publicação; não serve como feed diário assim.

## Custo para 12 meses
Rodada ampliada: 40 compras, 301 chamadas = 7,5 chamadas por compra (105 de descoberta, 196 de itens e resultados), 543 s no total com pausa de 1 s entre chamadas. Se todos os itens com resultado forem consultados (240, e não os 146 da amostra limitada a 50 por compra), são 50 chamadas de itens + 240 de resultados = cerca de 7,25 chamadas por compra só de detalhe, já que a descoberta de compras o worker faz de qualquer forma.

Quantas compras: a amostra pegou cerca de 13 compras por dia útil em SC, PR e RS (modalidades 6 e 8), só em 3 dias amostrados, com 8 das 18 buscas falhando por limite (HTTP 429). Extrapolando de forma grosseira, 13 × 250 dias úteis ≈ 3.300 compras por ano (inclui falsos positivos do filtro de texto, como armário metálico e nobreak; ordem de grandeza, não número firme).

Total: 3.300 × 7,25 ≈ 24.000 chamadas de detalhe. Na rodada 1, sem pausa, foram 0,7 s por chamada (27 chamadas em 19 s): com paralelismo 3 do cliente, algo como 1,5 a 2 horas; em sequência, cerca de 4,7 horas; no ritmo da rodada ampliada (1,8 s por chamada, com pausa e tentativas), até 12 horas. É uma carga única de histórico; o dia a dia seria em torno de 13 compras novas, ou cerca de 100 chamadas.

O limite de requisições do PNCP aparece: na rodada ampliada 44 das 301 chamadas foram refeitas e 8 buscas falharam após 4 tentativas com HTTP 429 ("Limite de requisições excedido"). A primeira tentativa ampliada, sem pausa, caiu no 429 e abortou.

## O que muda na oferta do Pro
Ajustar o texto antes da pré-venda. Não prometer "preço de referência por produto/CATMAT". Prometer algo como "preços homologados de compras públicas semelhantes (EPI e uniformes), com fornecedor, data e órgão", baseado em busca por descrição e mostrando faixa e amostra, não um preço único. Incluir na entrega a filtragem de valores zero (reserva) e de discrepâncias. Deixar a cobertura inicial como "em formação" (só 25% dos itens recentes têm resultado) e avisar que a carga histórica depende do limite de requisições do PNCP.

---

### Como foi rodado
`npx tsx sondagem/preco-referencia.ts` (roteiro original: SC, modalidade 6, até 180 dias, 10 compras, 3 resultados por compra) → 10 compras, 168 itens, 8 com resultado, 0 com CATMAT, 27 chamadas, 19 s.

Como a amostra era pequena (só 2 de 10 compras com resultado), foi rodada uma versão ampliada, via variáveis de ambiente do mesmo script (`SONDA_UFS=SC,PR,RS`, `SONDA_MODALIDADES=6,8`, `SONDA_MAX_DIAS=365`, `SONDA_MAX_COMPRAS=40`, `SONDA_MAX_RESULTADOS=50`, `SONDA_PAUSA_MS=1000`): 40 compras, 973 itens, 240 com resultado, 0 com CATMAT, 301 chamadas, 543 s. Ajustes ao roteiro: parametrização por ambiente (padrões iguais ao roteiro original), `try/catch` por busca para registrar 429 em vez de abortar, pausa opcional entre chamadas e contagem separada das chamadas de descoberta. A busca parou ao atingir 40 compras (datas amostradas: 14/09, 04/09 e 25/08/2026).
