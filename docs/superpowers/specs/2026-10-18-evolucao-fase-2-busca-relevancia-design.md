# Edital Map · Evolução · Fase 2 · Busca, relevância, lista e edital (design)

Origem: prompt "Evolução do SaaS Edital Map" do dono (17/10/2026), §3, §4, §5 e §10. Plano geral apresentado e aceito no mesmo dia (fases 2→5; decisões: login por e-mail com código, domínio próprio já existe, Pro com uso justo + 5 alertas, anual mantido). Esta fase **não depende de conta de usuário**: salvar, descartar e status pessoais ficam para a Fase 4 (Minhas Oportunidades); o botão "Salvar" só aparece quando funcionar.

## 1. Qualidade dos dados (§10)

- **Aberta** passa a ser `encerramento_em > now()` **e** `situacao_id not in (2, 3)` (Revogada, Anulada). Hoje 221 revogadas e 156 anuladas aparecem como abertas. Vale em todas as funções que contam ou listam abertas (`abertas_unicas`, `buscar_editais`, `mapa_editais`, `orgaos_abertos`, `relacionados`, contagens), para lista, mapa, painel e exportação baterem.
- **Suspensa** (situacao_id 4, 346 hoje) continua listada, com etiqueta "Suspensa" no card e no edital ("O órgão suspendeu esta licitação; confira o edital oficial antes de se preparar").
- Página do edital mostra separados: data de publicação, prazo para propostas e "Atualizado no Edital Map em …" (`atualizado_em`/sincronização), mais a situação oficial e o identificador da contratação (número de controle do PNCP).
- Cobertura honesta: onde o site fala de alcance (rodapé da lista, /sobre), dizer "Fonte: PNCP · Pregão, Concorrência, Dispensa e Credenciamento" (modalidades 6, 8, 4, 7, 12), sem prometer todas as licitações do Brasil.

## 2. Relevância (§3)

- **Termos relacionados** em código versionado (`lib/relevancia/termos.ts`): grupos de sinônimos e expressões por assunto (começo: EPI, uniformes/fardamento/vestuário profissional, limpeza, materiais de construção, móveis, alimentos/merenda, informática, material de escritório, medicamentos/material hospitalar, veículos/peças, combustível, obras/reformas, manutenção predial, serviços de saúde). Tudo normalizado (sem acento, minúsculas). Testado: cada grupo expande para os outros termos do grupo; termos fora de grupo expandem só para si.
- A busca usa o termo digitado **e** os relacionados (OR) sobre a busca de texto que já existe (`busca` do objeto e `itens_palavras` dos itens), com o índice atual. Termos negativos (`-palavra` no campo de busca, e lista `excluir` no perfil da Fase 3) removem resultados.
- **Pontuação 0–100, determinística** (mesmos dados → mesmo número), calculada no banco por edital da página:
  - termo digitado no objeto: até 60; só nos itens: até 35;
  - termo relacionado no objeto: até 45; só nos itens: até 25;
  - expressão inteira (frase) presente: +15; vários termos distintos: +5 cada (até +15);
  - teto 100; sem termo (busca só por filtros) → sem pontuação (o card não mostra indicador).
- **Explicação** no card: frase gerada a partir do que bateu, por exemplo "Menciona fardamento, relacionado a uniformes profissionais, no objeto." ou "Menciona luva nitrílica nos itens.". Nunca citar termo que não bateu. Indicador simples: Alta (≥ 70), Média (40–69), Baixa (< 40).
- Texto fixo perto do indicador (tooltip): "Relevância mede o quanto o edital combina com a sua busca. Não indica chance de vencer nem garante que sua empresa pode participar."
- Estrutura preparada para busca semântica futura: a pontuação sai de uma função (`pontuar`) com entradas e saída definidas; trocar a origem dos termos (sinônimos → embeddings) não muda lista, card nem rota.

## 3. Lista e mapa (§4)

- Alternador **Lista | Mapa** no topo dos resultados, em computador e celular; a escolha vai no endereço (`vista=lista|mapa`), não conta busca e não perde filtros. Padrão: **Lista**.
  - **Lista**: coluna larga com cards mais informativos — título descritivo (assunto, até 2–3 linhas), órgão, município/UF, valor estimado, modalidade, prazo (etiqueta de prazo: encerra hoje / em N dias / data) e data de publicação, relevância com explicação (quando há termo), "Suspensa" quando for o caso. Destaque (negrito/marca) dos termos buscados e relacionados no título. Ordenação: Maior relevância (padrão quando há termo), Mais recentes, Menor prazo (padrão sem termo), Maior valor, Menor valor (valor não informado vai para o fim). **Paginação numerada** (20 por página, `pagina=` no endereço; mudar de página não conta busca). À direita, no computador, o resumo "Onde mais compram" continua.
  - **Mapa**: a tela de hoje (três colunas no computador; mapa em cima e lista no celular), com clusters, pílulas, zoom no município e filtros como estão.
- Estado vazio útil: "Nenhum edital aberto para … " + sugestões reais: tirar o filtro mais restritivo (com o número que apareceria, por /api/contagem), buscar um termo relacionado do grupo, ampliar para Todo o Brasil.
- Contagens iguais em lista, mapa, painel e exportação (mesma função de abertas).

## 4. Página do edital (§5)

- Informações principais em bloco único: título, objeto completo, órgão, município/UF, modalidade, identificador, valor estimado, publicação, prazo, situação oficial, fonte (PNCP) e última atualização.
- **Resumo da oportunidade** em linguagem simples, montado só com campos existentes (sem IA, sem inventar): "Este edital trata de {assunto}, do {órgão} ({município}/{UF}). Modalidade: {modalidade}. Valor estimado: {valor | não informado pelo órgão}. As propostas podem ser enviadas até {data, hora}." Frases com dado ausente são omitidas ou dizem "não informado".
- Informações complementares já existentes (itens, documentos, critério, ME/EPP) continuam; o que não existir aparece como "não informado pelo órgão" em vez de sumir sem explicação.
- Ações: **Abrir edital oficial** (sempre acessível, **inclusive com o limite de editais do dia atingido**: o cartão dos planos esconde o detalhe, não o link oficial), **Compartilhar** (Web Share no celular; copiar link no computador, com "Link copiado"). Salvar e descartar entram na Fase 4.

## 5. Fora do escopo desta fase

Conta, onboarding, Meu Radar, salvos, status pessoais, alertas, mudanças de plano/limite (Fases 3–5). Nenhuma mudança de cobrança.

## 6. Testes e aceite

- vitest: expansão de termos (grupos, normalização, negativos), pontuação (casos fixos → número esperado; teto; sem termo), explicação (só termos que bateram), ordenações (incl. valor nulo por último), destaque no título, resumo do edital (com e sem valor/prazo), vista e página no endereço sem contar busca.
- Banco (controlador): revogadas/anuladas fora de abertas em todas as funções (contagens antes/depois); `buscar_editais` com relacionados e negativos; tempos (meta: lista < 500 ms com termo amplo, como hoje).
- Navegador 1440 e 390 px: alternador, lista com ordenação e paginação, destaque, relevância e explicação, estado vazio, edital com resumo, compartilhar, link oficial com limite atingido.

- [ ] Revogadas e anuladas fora de abertas (lista, mapa, painel, exportação); suspensas com etiqueta.
- [ ] Busca com termos relacionados e negativos; pontuação 0–100 com explicação e aviso.
- [ ] Alternador Lista | Mapa no endereço, sem contar busca; lista com ordenações, paginação, destaque e estado vazio.
- [ ] Edital com resumo simples, datas separadas, identificador, situação, compartilhar; link oficial sempre acessível.
- [ ] Testes e typecheck passando; publicado e conferido.
