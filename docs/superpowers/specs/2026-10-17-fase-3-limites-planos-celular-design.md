# Edital Map · Fase 3 · Limites do grátis, página Planos e celular (design)

Aprovado pelo dono em 17/10/2026. Antecipa partes da spec de Planos (docs/superpowers/specs/2026-10-16-fase-3-planos-design.md) sem login nem pagamento: limites bloqueando, selo, cartão de limite, página `/planos` com lista de espera, e a navegação do celular refeita. Stripe, login, editais salvos e alertas continuam na etapa do domínio.

## 1. Limites do plano grátis (bloqueando já)

- **Dia** = calendário de Brasília (`America/Sao_Paulo`); zera à 0h.
- **Quem conta:** por navegador (cookie `em_visitante`, já existente), no servidor. Navegador marcado como interno (`em_interno=1`) não tem limite. Burlar com outro navegador é aceito (o limite é um lembrete até existir conta).
- **3 buscas por dia.** Busca = cada combinação diferente de termo + UF + município + valor + modalidade + órgão + raio no dia. Não conta: página inicial sem nada preenchido, repetir uma combinação do dia, alternador de prazo, "Carregar mais", o mapa (acompanha a busca).
- **3 editais por dia.** Edital = cada edital diferente aberto no dia (lista, cartão, relacionados, link direto). Reabrir não conta.
- **Exportar** usa a busca atual (que já foi contada) e continua com o próprio limite de 20/hora.
- **Busca esgotada:** `/api/busca` (e `/api/mapa`, `/api/exportar`) respondem com o sinal de limite para combinação nova além da 3ª; a lista mostra o cartão "Você usou as 3 buscas grátis de hoje. Volta amanhã às 0h, ou conheça os planos." com botões **Basic** e **Pro** (levam a `/planos`); o mapa fica com a última busca permitida.
- **Edital esgotado:** a página mostra título, órgão, cidade e prazo; principais informações, itens, relacionados e "Abrir edital oficial" ficam atrás do mesmo cartão ("Você abriu os 3 editais grátis de hoje…").
- **"Abrir edital oficial":** dentro dos 3 editais grátis funciona normalmente (o cadeado do Basic só entra com o pagamento).
- **Selo** no cabeçalho, ao lado de "Assinar Pro": "Grátis · restam 2 buscas e 1 edital hoje" (singular/plural certos; "nenhuma busca"/"nenhum edital" quando zera). Amarelo quando falta 1 de qualquer um; laranja quando zerou. No celular, compacto ("2 buscas · 1 edital"). Interno: sem selo.
- **Contagem no banco:** tabela `uso_diario (visitante uuid, dia date, tipo text check in ('busca','edital'), chave text, criado_em)` com chave primária `(visitante, dia, tipo, chave)`; `chave` da busca = hash da combinação normalizada; do edital = slug. Gravação e checagem numa função SQL só (`registrar_uso(p_visitante, p_tipo, p_chave, p_limite)` → `{permitido bool, usados int}`), atômica, idempotente para a mesma chave, só pelo servidor. Limpeza: linhas de dias anteriores apagadas no job diário de retenção.
- **Medição:** evento `limite_atingido` (`tipo`: busca|edital) na primeira vez que o limite bloqueia no dia; o portão mostra quantos visitantes bateram no limite.

## 2. Página Planos (`/planos`)

- Aba "Planos" no cabeçalho (computador) e na barra do celular passa a abrir `/planos` (hoje abre o aviso "em breve").
- Tabela Grátis · Basic R$ 49,90/mês · Pro R$ 89,90/mês com os itens da spec de Planos (buscas e editais por dia; abrir edital oficial; editais salvos; alertas; vencimentos; relacionados; filtros Pro; exportar; futuros), marcando "em breve" no que ainda não existe.
- Botões "Quero o Basic" / "Quero o Pro": abrem um formulário "O pagamento abre em breve. Deixe seu e-mail que avisamos assim que puder assinar." → grava em `lista_espera (id, email, plano check in ('basic','pro'), visitante, interno, criado_em)`, com validação de e-mail e limite de envios por IP como o pedido de alerta. Mensagem de sucesso: "Pronto! Avisamos em <e-mail> quando o pagamento abrir."
- Evento `quer_recurso` com `plano_basic`/`plano_pro` no clique (o `plano_pro` atual continua valendo).
- "Assinar Pro" do cabeçalho leva a `/planos`.

## 3. Celular (abaixo de `lg`, 1024 px)

- **Barra fixa embaixo** em todas as páginas: Mapa · Lista · Alertas · Planos (ícone + texto, item ativo destacado, área de toque ≥ 44 px, respeita a área segura do iPhone). Na página inicial, "Lista" rola até o início da lista e "Mapa" volta ao topo; nas outras páginas, levam à página inicial (na lista ou no topo).
- **Página inicial (revisto pelo dono em 17/10):** uma página só, que rola, com o mapa em cima e a lista embaixo; a gaveta sai. Pedido dele: "a pessoa consegue dar zoom no mapa e se ela arrastar ela consegue ir descendo e vendo os editais do filtro."
  - Em cima, o mapa com altura fixa de ~55–60svh; zoom com pinça e arrastar com um dedo continuam funcionando dentro do mapa.
  - Logo embaixo, no fluxo normal da página, a Lista: contagem, resumo, alternador de prazo, botão Exportar e os cards. Arrastar para cima fora do mapa rola a página e mostra os editais, sem tocar em nada.
  - Conferir na captura de 390 px o enquadramento inicial do Brasil com o mapa mais baixo.
- **Busca compacta:** só o campo (exemplo curto que caiba: "Ex.: EPI, uniformes") e um botão **"Filtros (n)"** (n = filtros ativos). O botão abre uma folha em tela cheia com UF, Município, Valor, Modalidade, Órgão, Raio e Prazo, os mesmos controles do computador, e o botão "Ver N editais" que aplica e fecha. "Limpar filtros" no topo da folha.
- **Card:** tocar abre o edital (`/edital/{slug}`); voltar retorna à página inicial na mesma posição de rolagem.
- **Busca no endereço:** a página inicial passa a ler e escrever os filtros na URL (`/?q=luva&uf=SC&municipio=…&valor=…&modalidades=…&orgao=…&raio=…&dias=7`), em computador e celular; voltar do edital restaura a busca; a URL pode ser compartilhada. (A busca contada é a mesma de §1.)
- **Selo** compacto no topo; o cabeçalho do celular mostra logo, selo e "Assinar".
- **Página do edital no celular:** barra inferior com "Abrir edital oficial" fixa acima da barra de navegação quando a página está liberada.
- Computador: layout de três colunas igual; ganha o selo, a aba Planos e a busca na URL.

## 4. Banco

- Migração nova (`0009`): `uso_diario`, `registrar_uso`, `lista_espera`, tipos de evento `limite_atingido` (e o que mais precisar no `eventos_tipo_check`), limpeza de `uso_diario` no job de retenção. Tudo só pelo servidor (revoke de public/anon/authenticated, grant a service_role), `set local lock_timeout = '10s'`. Aplicada pelo controlador com `npm run db:aplicar`.

## 5. Testes e aceite

- vitest: chave da busca (normalização: ordem de modalidades, maiúsculas/espaços no termo, filtros vazios), regras do que conta e do que não conta, virada do dia em Brasília, textos do selo (singular/plural/zerado), filtros ↔ URL (ida e volta), validação da lista de espera, rotas respondendo com o sinal de limite, interno sem limite.
- Banco: `registrar_uso` idempotente (mesma chave não conta duas vezes), 4ª chave diferente recusada, outro dia zera, concorrência (duas chamadas simultâneas não passam do limite).
- Navegador (celular 390 px e computador 1440 px): barra inferior, Filtros (n), Lista em tela cheia, card abrindo o edital e voltar mantendo a busca, selo mudando, 4ª busca e 4º edital bloqueados com o cartão, `/planos` e a lista de espera.

- [ ] 4ª busca diferente do dia e 4º edital diferente mostram o cartão dos planos; repetir não conta; interno sem limite.
- [ ] Selo certo nos três estados (sobrando, falta 1, zerado).
- [ ] `/planos` com a tabela e a lista de espera gravando.
- [ ] Celular: barra inferior, Filtros (n), Lista em tela cheia, card abre o edital, voltar mantém a busca.
- [ ] Busca na URL (ida e volta, compartilhável).
- [ ] Eventos `limite_atingido` e `quer_recurso` (plano_basic/plano_pro) gravados.
- [ ] Testes e typecheck passando; publicado.
