# Edital Map · Evolução · Fase 4 · Minhas Oportunidades e alertas reais (design)

Origem: prompt "Evolução do SaaS Edital Map" (17/10/2026) §5 (ações salvar/descartar), §6, §7, §8 (limites por plano), §12. Base no ar: Fase 3 (conta por código, Meu Radar, 0014) e pagamento pela Cakto (0015, sessão paralela; plano por navegador + chave). Domínio editalmap.com.br com Resend verificado; `RESEND_API_KEY` na Vercel.

## 1. Plano da conta (necessário para salvos e alertas)

- `planoDaConta(usuario, ctx?)` (servidor): o maior entre (a) `perfis.plano` (marcação manual, ex.: a conta do dono = `pro`), (b) assinatura ativa (tabela da 0015: `valido_ate > now()`, não estornada) cujo **e-mail do comprador = e-mail da conta**, (c) quando houver navegador, `planoAtual(ctx)` da 0015 (dono pelo cookie assinado = `pro`).
- O envio de alertas (sem navegador) usa (a) + (b). Assinou com outro e-mail: a página da conta mostra "Plano no navegador, não na conta: use o mesmo e-mail da compra" (sem ligação automática por navegador nesta fase).
- Limites (decisão do dono de 18/10, repassada pela sessão do pagamento: o Basic sai de linha, só Grátis e Pro): Grátis — nenhum salvo, nenhum descarte, nenhum alerta (botões mostram o cartão dos planos); **Pro — uso justo: até 5 alertas, salvos sem teto visível (500 por trás)**. Linhas antigas com `basic` contam como Pro até vencer. O pagamento já está na main (`planoAtual(ctx)` em lib/servidor/plano.ts, que também olha a conta logada).

## 1b. Cota do Resend

O Resend (plano grátis: 100 e-mails por dia) é o mesmo dos códigos de login. Cada rodada de alertas/resumo manda no máximo **60 e-mails**; o que passar fica para o dia seguinte (a janela não avança). Erro de cota (429) encerra a rodada sem novas tentativas. Quando o Pro crescer, o dono troca o plano do Resend.

## 2. Minhas Oportunidades (§6)

- Tabela `salvos` (existente, vazia) ampliada (migração **0016**): `status` (`salvo` | `analise` | `participar` | `descartado`, padrão `salvo`), `observacao` (até 500 caracteres), `atualizado_em`. Chave (user_id, contratacao_id) impede duplicar. A chave estrangeira com `on delete cascade` para `contratacoes` sai: a retenção de 7 dias **não apaga** contratação salva por alguém (exceção em `aplicar_retencao`), para o edital continuar abrindo.
- Ações:
  - **Salvar** (ícone) nos cards da lista, do radar e na página do edital; salvo vira "Salvo" (toque de novo remove, com confirmação se houver observação/status).
  - **Descartar** na página do edital e no menu do card do radar: grava status `descartado`; descartados somem do Meu Radar e aparecem só no filtro "Descartados".
- Página **/oportunidades** ("Minhas Oportunidades", exige conta, noindex): abas/filtro por status (Todos, Salvo, Em análise, Vou participar, Descartado) com contagem; ordenação por **prazo** (padrão) e por data de salvamento; cada linha mostra título, órgão, município/UF, valor, prazo (etiqueta), situação oficial (Suspensa/Revogada/Anulada/Encerrada quando for o caso), seletor de status, observação editável (salva ao sair do campo, "Salvo ✓"), "Abrir edital" e "Remover" (confirmação).
- Os status são da pessoa e **não** mudam a situação oficial (texto fixo na página).
- Card "Editais salvos" entra no Meu Radar (total por status relevante).

## 3. Alertas (§7)

- Tabela nova `alertas` (0016): `id`, `user_id`, `nome`, `termos`, `termos_excluir`, `ufs`, `municipios`, `valor_min`, `valor_max`, `modalidades`, `so_me_epp`, `ativo` (bool), `criado_em`, `atualizado_em`, `ultimo_envio_em`. Mesmas validações do radar (lib/radar.ts). "Criar alerta a partir do meu radar" copia o perfil.
- `alertas_enviados` (existente, ligada a `radares`): passa a referir `alertas(id)`: (alerta_id, contratacao_id, enviado_em) com chave dupla → **nunca o mesmo edital duas vezes para o mesmo alerta**.
- `envios_alerta` (histórico): id, alerta_id, user_id, iniciado_em, status (`enviado` | `sem_novidades` | `falhou` | `pulado_plano`), qtd_editais, tentativas, erro (texto curto), id_mensagem do Resend.
- Página **/alertas** (existe; hoje só pede e-mail): com conta, lista os alertas (nome, resumo dos filtros, ativo/pausado, último envio e quantos editais), criar, editar, **pausar/retomar**, excluir (confirmação). Sem conta: convite para entrar (o formulário antigo de pedido por e-mail sai; os pedidos antigos em `pedidos_alerta` ficam guardados para um convite futuro).
- **Envio diário às 7h (Brasília)**, num job agendado do GitHub Actions (`npm run worker:alertas`, cron `7 10 * * *` UTC; o GitHub atrasa ou pula horas cheias), com os mesmos segredos do sync + `RESEND_API_KEY` e `ALERTAS_SEGREDO`:
  1. Para cada alerta ativo de conta com plano que permite alertas (§1), busca editais **abertos** que casam com o alerta (mesma função do radar, ordem por relevância, até 20), **publicados ou atualizados** desde o último envio (primeiro envio: últimas 24 h), excluindo os já enviados para aquele alerta.
  2. Um e-mail por conta (junta os alertas dela), pelo Resend (remetente `Edital Map <alertas@editalmap.com.br>`), com, por edital: título, órgão, município/UF, valor estimado, prazo final, link para `/edital/{slug}` no site. Sem novidade → não manda e-mail (registra `sem_novidades`).
  3. Grava `alertas_enviados` só depois do aceite do Resend; erro → até 3 tentativas com espera (2/4/8 s); falha final registrada (`falhou`) e o próximo dia tenta de novo (os editais não enviados continuam elegíveis).
  4. Respeita os limites do Resend (envio em lotes pequenos, pausa entre lotes) e o plano no momento do envio (`pulado_plano` se a conta perdeu o plano).
- **Cancelar recebimento**: todo e-mail tem link "Parar de receber este alerta" e "Parar todos os alertas" (`/alertas/sair?t=…`, token HMAC com `ALERTAS_SEGREDO`, sem login, confirma em uma tela) e o cabeçalho `List-Unsubscribe` (+ `List-Unsubscribe-Post` one-click). Pausar não apaga o alerta.
- Nada é simulado: se o envio estiver sem chave/segredo, o job registra `falhou` com o motivo e a página mostra "Envio indisponível agora".

## 3b. Resumo semanal do Pro (decisão do dono de 18/10)

- Toda segunda às 7h (Brasília; mesmo job dos alertas, logo depois deles, para o teto do Resend sair certo), para cada conta Pro com radar e com o resumo ligado (`perfis.resumo_semanal`, padrão sim): editais novos da semana que casam com o radar (publicados nos últimos 7 dias), os que vencem nos próximos 7 dias, o valor total aberto do radar e os órgãos e cidades que mais compraram (entre os do radar). Sem novidade, não manda. No máximo um resumo a cada 6 dias por conta; histórico em `envios_resumo`; evento `resumo_enviado`.
- Link "Parar o resumo semanal" (token assinado) e `List-Unsubscribe`, como nos alertas; religar em /alertas.

## 4. Medição (§12)

Eventos (tipos novos em `eventos_tipo_check`, mantendo os existentes): `edital_salvo`, `edital_descartado`, `alerta_criado`, `alerta_enviado` (servidor, por envio, com qtd), `resumo_enviado`. Logs do job (repositório público): sem e-mail e sem ids completos. Sem e-mail em eventos.

## 5. Dados e segurança

- 0016: colunas novas em `salvos`, tabelas `alertas` e `envios_alerta`, `alertas_enviados` religada a `alertas`, exceção de retenção para salvos, tipos de evento, índices (`salvos(user_id, status)`, `alertas(user_id)`, `alertas_enviados(alerta_id)`), RLS ligado sem políticas, revoke/grant só service_role, `lock_timeout`.
- Tudo pelo servidor com `user_id` de `usuarioAtual()`; POSTs com `recusaForaDoSite`; respostas `private, no-store`; tokens de descadastro assinados (sem expor ids sequenciais).

## 6. Testes e aceite

- vitest: plano da conta (manual, assinatura por e-mail, navegador, maior vence), limites por plano (salvos/alertas), validação de salvos/observação/status, seleção de editais do alerta (dedupe, janela desde o último envio), montagem do e-mail (campos, links, descadastro, texto sem dado inventado), token de descadastro (válido, adulterado), retry, rotas exigindo conta e CSRF.
- Banco (controlador): 0016 aplicada; retenção não apaga salvo; dedupe por chave; tempos.
- Ponta a ponta (com o dono): salvar/mudar status/observação/descartar; criar alerta; rodar o job manualmente (workflow_dispatch) e receber o e-mail real; segundo disparo não repete editais; descadastrar pelo link.

- [ ] Salvar, status pessoais, observação, descartar e Minhas Oportunidades funcionando, sem duplicar, com limites por plano.
- [ ] Alertas: criar/editar/pausar/excluir; envio diário real pelo Resend, sem repetir, com histórico e nova tentativa; descadastro pelo link.
- [ ] Plano da conta (manual, e-mail da compra, navegador) aplicado em salvos e alertas.
- [ ] Testes e typecheck passando; publicado e conferido (e-mail recebido pelo dono). — 1406 testes, typecheck e build; na main e publicado em 18/10 (rotas sem sessão conferidas em produção). Falta o ponta a ponta com o dono (conta dele + perfis.plano = pro).
- Decisão do dono depois da spec: o Basic acabou (só Grátis e Pro); salvos e alertas são do Pro (5 alertas, salvos com uso justo).
- Escopo acrescentado: resumo semanal do Pro às segundas (mesmo remetente, descadastro próprio, histórico em envios_resumo).
- Revisões: teto de 5 alertas também no banco (0018); orçamento diário de 60 e-mails somando alertas e resumo; tag do Google fora de /alertas/sair.
