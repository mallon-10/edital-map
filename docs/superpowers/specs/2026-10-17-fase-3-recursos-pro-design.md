# Edital Map · Fase 3 · Recursos Pro (design)

Aprovado pelo dono em 17/10/2026. Feito antes do domínio próprio: só recursos sem serviço externo. Ficam abertos para todos, com etiqueta "Pro" discreta; o cadeado entra quando a etapa de Planos (docs/superpowers/specs/2026-10-16-fase-3-planos-design.md) ligar.

## 1. Relacionados (página do edital)

- Bloco "Editais parecidos abertos" na página do edital, abaixo dos itens; até 6 editais.
- Função SQL nova `relacionados(p_id text, p_limite int default 6)`:
  - usa as palavras (lexemas) do `busca` do objeto do edital atual como uma consulta "qualquer uma delas" (OR) sobre os editais abertos (`encerramento_em > now()`), sem o próprio edital e sem duplicadas (mesma regra de `abertas_unicas`);
  - ordena por relevância (`ts_rank` do objeto; as palavras dos itens, `itens_palavras`, contam com peso menor), com bônus para o mesmo UF, e desempate pelo prazo mais próximo;
  - devolve as mesmas colunas do card da lista (id, slug, objeto, orgao_nome, municipio_nome, uf, valor_estimado, encerramento_em, publicada_em, modalidade_nome, srp).
  - Só pelo servidor (revoke de public/anon/authenticated, grant a service_role), como as outras.
- Site: `relacionados(id)` em `lib/servidor/consultas.ts` com o cache de 5 min; falha não derruba a página (bloco some). Cards no estilo do `CardCompacto` (título por `assunto()`, órgão, UF, valor, etiqueta de prazo), cada um com link para `/edital/{slug}`. Sem nenhum parecido, o bloco não aparece.
- Meta de tempo: a função abaixo de 300 ms com os ~35 mil abertos (medir com `explain analyze`).

## 2. Filtros Pro (chips do topo)

O chip "Raio, órgão e recorrência · Pro" vira dois chips: "Órgão" e "Raio". Recorrência fica para a Fase 4 (precisa do histórico de encerrados, que a retenção de 7 dias não guarda); o texto do chip deixa de citá-la.

### 2.1 Órgão comprador
- Chip "Órgão" com campo de busca (Popover, como o de Município). Digitar 3+ letras consulta `/api/orgaos?q=` (só servidor, cache de 5 min), que devolve até 20 órgãos com editais abertos cujo nome bate (sem acento, maiúsculas e minúsculas tanto faz), com nome limpo (`nomeProprio`), UF e quantidade de abertos, ordenados por quantidade.
- Escolher um órgão filtra lista e mapa por `orgao_cnpj`. Parâmetro de URL `orgao` (14 dígitos). Remover pelo próprio chip ("Todos os órgãos").
- As funções `buscar_editais`, `mapa_editais` e `abertas_unicas` ganham `p_orgao text default null` (migração nova; assinaturas antigas derrubadas como na 0004/0005, revokes e grants explícitos).

### 2.2 Raio em km
- Chip "Raio" só habilitado com um município escolhido (senão mostra "Escolha um município"). Opções: só o município (padrão), 50 km, 100 km, 200 km.
- Com raio, a busca inclui todos os municípios cuja sede está a até R km da sede do município escolhido (haversine sobre `municipios.lat/lng`). Parâmetro de URL `raio` (50 | 100 | 200).
- `buscar_editais`, `mapa_editais` (e `abertas_unicas` se for o lugar certo) ganham `p_raio_km int default null`; com `p_ibge` e `p_raio_km`, o filtro de município vira "dentro do raio".
- No mapa, com raio ativo, um círculo fino marca a área (opcional se custar caro; o filtro é o que importa).

## 3. Exportar para planilha

- Botão "Exportar" no topo da lista (ícone de planilha). Baixa `editais-AAAA-MM-DD.csv` com os editais da busca atual (mesmos filtros), até 2.000.
- Rota `/api/exportar` (só servidor), mesmos parâmetros da `/api/busca`. CSV com BOM UTF-8 e separador `;` (o Excel em português abre direto), datas no formato brasileiro.
- Colunas: Título (`assunto`), Objeto completo (`textoLimpo`), Órgão, Município, UF, Modalidade, Valor estimado, Prazo das propostas, Publicado em, Link do edital (`link_origem` ou o link do PNCP).
- Limite de uso igual às outras rotas (ritmo por IP já existente, se houver; senão 20 exportações/hora por IP).

## 4. Medição e etiqueta

- Etiqueta "Pro" discreta (a mesma do chip Pro de hoje) nos chips Órgão/Raio, no botão Exportar e no título do bloco Relacionados.
- Eventos novos em `eventos` (tipos permitidos ampliados): `usou_recurso` com `recurso` em `relacionados_clique`, `filtro_orgao`, `filtro_raio`, `exportou`. Sem edital, salvo `relacionados_clique` (edital de origem).
- O portão (`docs/fase-2-portao.sql`) passa a mostrar `usou_recurso` por recurso.

## 5. Testes e aceite

- vitest: monta a consulta de relacionados (contrato rpc), parâmetros `orgao`/`raio` no ida-e-volta `lerFiltros` ↔ `paraParametros` ↔ rotas ↔ rpc; CSV (BOM, `;`, aspas, quebras de linha no objeto, datas); `/api/orgaos` valida `q` (3+ letras, limite de tamanho); eventos novos validados.
- Banco: `relacionados` de um edital de EPI devolve outros de EPI; `buscar_editais` com `p_orgao` só traz aquele órgão; com raio de 100 km a partir de Joinville traz editais de municípios vizinhos (ex.: Blumenau) e não de Florianópolis se estiver fora; tempo medido.
- Navegador: capturas da página do edital com o bloco, dos chips Órgão e Raio, e o CSV aberto conferido (acentos, colunas).

- [ ] Relacionados na página do edital (até 6, mesmo UF primeiro, < 300 ms).
- [ ] Filtro por órgão (busca de órgãos, lista e mapa filtrados, URL `orgao`).
- [ ] Filtro por raio (50/100/200 km a partir do município, URL `raio`).
- [ ] Exportar CSV da busca atual (até 2.000, abre certo no Excel).
- [ ] Eventos `usou_recurso` gravados; portão mostra o uso.
- [ ] Testes e typecheck passando; publicado.
