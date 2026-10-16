# Edital Map · Fase 3 · Etapa 3: Brasil todo (design)

Aprovado pelo dono em 16/10/2026. Vem antes das etapas de Planos e Alertas (que esperam o domínio próprio). SEO fica para depois, junto com o domínio.

## 1. Objetivo

Cobrir as 27 UFs sem sair do plano grátis do Supabase (500 MB), mantendo a busca dentro dos itens.

## 2. Números medidos (16/10/2026)

- Banco: 321 MB. `itens` 175 MB (só itens de compras abertas ou encerradas há ≤ 7 dias); `contratacoes` 134 MB (89.049 linhas: 9.102 abertas, 2.550 encerradas há ≤ 7 dias, 77.397 antigas ou sem prazo, das quais 40.274 sem `encerramento_em`).
- Volume: em 15/10/2026 o PNCP publicou 5.245 contratações nas modalidades 6, 8, 4, 7, 12; SC+PR+RS = 1.370 (26%). Brasil ≈ 3,8× o volume atual.
- Abertas publicadas há mais de 30/45/60/90 dias: 2.671 / 2.329 / 2.090 / 1.821 de 9.102 (credenciamentos e registros de preço longos).
- Sync atual (3 UFs): 2–5 min por rodada no GitHub Actions; as rodadas saem a cada 4–6 h porque o disparo pelo pg_cron depende do segredo `github_disparo` no Vault (pendência da Fase 1, do dono).

## 3. Decisões

1. **Plano grátis do Supabase.** Sem Supabase Pro por enquanto.
2. **Itens não são mais guardados linha a linha.** Cada contratação guarda:
   - `itens_palavras tsvector`: as palavras de todas as descrições dos itens, sem posições (`strip`) e sem repetição, na mesma configuração de texto usada hoje em `itens.busca`.
   - `itens_resumo jsonb`: `{ total, materiais, servicos, com_beneficio, exclusivos, cota, criterios[] }` (mesmas regras de `resumo_itens`: 1 = exclusiva, 3 = cota).
   A busca "achou nos itens" (`onde = 'itens'`) passa a usar `itens_palavras`. O trecho do item que bateu (`item_trecho`) deixa de existir: o card mostra só que achou nos itens.
3. **Lista de itens do edital vem do PNCP na hora** (base de itens, sem limite de chamadas), no servidor, com o cache de 5 min já existente. Falha → "Itens indisponíveis agora" na seção de itens; o resto da página funciona. Os cartões "O que compram" e "ME/EPP" leem `itens_resumo`.
4. **Retenção:** apagar diariamente contratações com `encerramento_em` há mais de 7 dias e as sem `encerramento_em`. O worker não grava contratações que já chegam nesse estado. Encerrada há ≤ 7 dias continua abrindo pelo link, com a etiqueta "Encerrado". O histórico de resultados da Fase 4 será buscado de outra forma.
5. **Sync do país inteiro de uma vez**, sem `uf` na consulta ao PNCP (o parâmetro é opcional; conferido), uma chave de estado por modalidade. Ritmo de 20 chamadas/min mantido.
6. **Sync a cada 3 h** (GitHub Actions e pg_cron), para caber nos 2.000 min/mês do GitHub em repositório privado. Medir as primeiras rodadas e ajustar.
7. **Carga inicial dos 24 estados novos** por duas fontes somadas: publicações dos últimos 30 dias + endpoint de propostas em aberto (`/v1/contratacoes/proposta`) para achar os de prazo longo. O endpoint de propostas serve só para **encontrar**; "aberta" continua sendo `encerramento_em > now()`. Roda na máquina do dono, em segundo plano (estimativa 4–6 h).
8. **Em etapas, medindo:** primeiro a troca de itens por palavras em SC/PR/RS (medir banco); só depois a carga dos outros estados, conferindo o tamanho no meio.

## 4. Banco

- Migração 0005: colunas `itens_palavras` (+ índice GIN) e `itens_resumo` em `contratacoes`; função para o worker gravar palavras + resumo a partir do texto das descrições sem guardar o texto; `buscar_editais`/`abertas` usando `itens_palavras` e sem `item_trecho`; `resumo_itens` lendo `itens_resumo` (ou removida, com o site lendo a coluna); job diário de retenção no pg_cron; agenda do disparo do sync a cada 3 h. Aplicada com `npm run db:aplicar`.
- Preenchimento das colunas novas para o que já existe: a partir da tabela `itens` atual, em SQL, antes de apagá-la.
- Migração 0006 (depois da conferência em SC/PR/RS): remove a tabela `itens` e o que dependia dela.
- `VACUUM FULL` (ou equivalente) depois das remoções grandes, para o espaço voltar de fato; medir com `pg_database_size`.

## 5. Worker

- `sincronizarItens` continua paginando os itens no PNCP, mas grava só palavras + resumo (uma chamada por contratação), e não grava mais linhas em `itens`.
- `UFS` vazio ou `BR` = país inteiro (sem `uf` na consulta). Chaves de estado novas por modalidade, começando da data mais antiga entre as chaves por UF atuais (sem perder janela).
- Backfill com as duas fontes da decisão 7; contratações já fora da retenção não são gravadas.
- `worker:reler-itens` passa a regravar palavras + resumo (útil se a regra mudar).
- `worker:conferir` adaptado (itens vêm do PNCP; compara contagem e campos da contratação).

## 6. Site

- Mapa: todos os estados pintados pela quantidade; sai a cor "sem cobertura" e o contorno de UF coberta vazia passa a valer para qualquer UF sem resultado.
- Textos: "Hoje cobrimos SC, PR e RS" → "Editais abertos de todo o Brasil" (cabeçalho do edital, linha do celular, `/sobre`).
- Página do edital: itens do PNCP na hora (seção 3, decisão 3); mapeamento e limpeza iguais aos de hoje (`lib/texto.ts`, `partirItem`).
- Lista: `onde = 'itens'` sem trecho; o card diz "Encontrado nos itens".

## 7. Testes

- vitest: cálculo das palavras e do resumo a partir de itens de exemplo (inclui benefício 1/3 e critérios); worker não grava linhas de itens e chama a gravação de palavras + resumo; filtro de retenção no worker; consulta sem `uf`; migração de chaves de estado; itens do edital vindos do PNCP com falha tratada; contrato TS↔SQL atualizado.
- Banco: busca por termo que só aparece em itens (ex.: "nitrílica") devolve as mesmas contratações antes e depois da troca em SC/PR/RS; contagens de abertas iguais; tamanho medido.
- Navegador: capturas da inicial e de 3 editais (com e sem itens) depois da carga do Brasil todo.

## 8. Critérios de aceite

- [ ] Banco abaixo de 300 MB depois da carga do Brasil todo (meta; teto do plano 500 MB).
- [ ] As 27 UFs com editais abertos no mapa; contagem de abertas por UF coerente com o PNCP numa amostra de 3 UFs.
- [ ] Busca por termo só presente em itens continua encontrando editais.
- [ ] Página do edital mostra os itens vindos do PNCP; falha simulada mostra "Itens indisponíveis agora".
- [ ] Sync a cada 3 h, cada rodada abaixo de 12 min nas primeiras 8 rodadas medidas.
- [ ] Retenção diária rodando (nenhuma contratação encerrada há mais de 7 dias ou sem prazo).
- [ ] Testes e typecheck passando; publicado.
