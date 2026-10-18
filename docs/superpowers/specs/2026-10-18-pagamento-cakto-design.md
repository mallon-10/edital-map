# Edital Map · Pagamento pela Cakto (entrega 2 de 3 do MVP pago)

Status: desenho aprovado em 18/10/2026 (conversa com o dono). Entregas do MVP pago: 1 · SEO (no ar), **2 · pagamento Cakto e cadeados** (esta spec), 3 · medição do Google Ads e aviso de cookies. Substitui o Stripe da spec de Planos (docs/superpowers/specs/2026-10-16-fase-3-planos-design.md): os planos, preços e a tabela continuam os de lá (lib/planos.ts); muda quem cobra e como o plano chega ao usuário.

## 1. Objetivo

Cobrar de verdade para testar o MVP: Basic e Pro, mensal e anual, pagos na Cakto, sem login. Quem paga recebe o plano no navegador onde clicou em "Assinar" e uma chave de acesso para usar em até 3 navegadores. Os cadeados da tabela de /planos passam a valer.

Sucesso: uma compra real (cartão ou Pix) liga o plano em segundos; renovar, cancelar, reembolsar e estornar mudam o plano sozinhos; o grátis vê os cadeados.

## 2. Na Cakto (criado pela API, com conferência do dono no painel)

- Produto **Edital Map Basic** (assinatura): oferta padrão mensal R$ 49,90 (`intervalType: month`) e segunda oferta anual R$ 499,00 (`year`).
- Produto **Edital Map Pro** (assinatura): mensal R$ 89,90 e anual R$ 899,00.
- Webhook `https://www.editalmap.com.br/api/cakto` nos dois produtos, eventos `purchase_approved`, `purchase_refused`, `refund`, `chargeback`, `subscription_created`, `subscription_renewed`, `subscription_renewal_refused`, `subscription_late`, `subscription_canceled`.
- Dono, no painel (a API não tem o campo): em cada produto, Configurações → Checkout → "Redirecionar após o pagamento" = `https://www.editalmap.com.br/obrigado/{{callback}}`. Cadastro de vendedor completo (Financeiro), senão o checkout recusa a venda.
- Variáveis (Vercel e .env; nada no git): `CAKTO_CLIENT_ID`, `CAKTO_CLIENT_SECRET` (só para os scripts de criação), `CAKTO_WEBHOOK_SECRET`, `CAKTO_OFERTA_BASIC_MENSAL`, `CAKTO_OFERTA_BASIC_ANUAL`, `CAKTO_OFERTA_PRO_MENSAL`, `CAKTO_OFERTA_PRO_ANUAL` (ids curtos das ofertas, os do link `pay.cakto.com.br/{id}`), `INTERNO_SEGREDO` (seção 5).
- **Interruptor**: sem as quatro ofertas e o segredo do webhook, o site continua como hoje (lista de espera, recursos abertos). Assim dá para publicar antes de a Cakto estar pronta.

## 3. Fluxo da compra

1. /planos: "Assinar Basic/Pro" (mensal ou anual pelo alternador) é um link para `/api/checkout?plano=basic&periodo=mensal`.
2. `/api/checkout` (GET, conta como clique): gera um código aleatório de 32 caracteres hex, grava `checkouts` (código, visitante do cookie `em_visitante`, plano, período), grava o evento `quer_recurso` (plano_basic/plano_pro, como hoje) e redireciona (303) para `https://pay.cakto.com.br/{oferta}?callback={código}`. Sem cookie válido (robô, bloqueio de cookies): redireciona sem callback, e o plano só liga pela chave de acesso. Interruptor desligado: volta para /planos.
3. A pessoa paga na Cakto. A Cakto avisa `/api/cakto` (webhook) e manda a pessoa para `/obrigado/{código}` (5 s depois da aprovação; com Pix pago em outro aparelho ou aba fechada, não volta, e tudo bem: o webhook já ligou o plano naquele navegador).
4. `/obrigado/[codigo]`: se a assinatura daquele código já está ativa e o navegador é o do checkout, mostra "Plano Pro ativo", a validade e a **chave de acesso**. Se ainda não chegou o aviso, "Confirmando seu pagamento…" e pergunta a `/api/checkout/estado?codigo=` a cada 3 s por até 2 min; depois, "Assim que a Cakto aprovar o pagamento, o plano liga neste navegador. Pix pode levar alguns minutos." Código desconhecido ou de outro navegador: não mostra a chave, só "Abra esta página no navegador onde você clicou em Assinar, ou use a chave de acesso em /assinatura".

## 4. Webhook `/api/cakto`

- Confere `X-Cakto-Signature` (`v1=` HMAC-SHA256 de `{timestamp}.{corpo cru}` com `CAKTO_WEBHOOK_SECRET`, tolerância de 5 min); sem os cabeçalhos, compara o `secret` do corpo (tempo constante). Inválido: 401. Porte do adaptador do projeto Oferta Kids (`src/core/payments/cakto.ts`).
- `data` pode ser lista (webhook V2): trata cada pedido. `checkout_abandonment` é ignorado.
- Idempotência: `cakto_eventos` com chave (`pedido`, `evento`); repetido = 200 sem efeito.
- Plano e período saem do **`offer.id` da Cakto** (mapa reverso das quatro variáveis), não do que o checkout gravou. Oferta desconhecida: grava o evento, 200, nada muda.
- Responde 2xx em até 8 s (a Cakto considera timeout e reenvia). Erro de banco: 500 e log (a Cakto não reenvia resposta recebida; reenviar pelo painel ou pela API).

Efeito de cada evento na tabela `assinaturas`:

| Evento | Efeito |
|---|---|
| `purchase_approved` (status `paid`) | Cria a assinatura (ou acha pela `subscription.id`): plano, período, e-mail do comprador, `valido_ate = paidAt + duração + 3 dias`, gera a chave de acesso. Liga o navegador do checkout (`callback` → `checkouts.visitante`). Evento `assinou` (plano, período, valor). |
| `subscription_renewed` | Acha pela `subscription.id` (sem ela: pelo e-mail + plano); `valido_ate = max(valido_ate, paidAt) + duração + 3 dias`. |
| `subscription_canceled` | `status = cancelada`; a validade fica (vale até o fim do período pago). |
| `refund`, `chargeback` | `status = estornada`, `valido_ate = agora`. |
| `subscription_late`, `subscription_renewal_refused`, `purchase_refused`, `subscription_created` | Só registram (a validade acaba sozinha; os 3 dias cobrem as retentativas). |

Duração: mensal 31 dias, anual 366 dias.

## 5. Plano do navegador e chave de acesso

- `lib/servidor/plano.ts`: `planoAtual(ctx): Promise<'gratis' | 'basic' | 'pro'>` — a assinatura ligada ao visitante com `valido_ate > now()` e status diferente de `estornada`; mais de uma: a maior (Pro > Basic). Dono (cookie assinado, abaixo): `pro`. Sem visitante ou banco fora: `gratis`. Cache por pedido. É a função que a Fase 3 (Prévia do Radar) vai usar; quando houver conta, ela também lê `perfis.plano` (Fase 5).
- **Interno confiável**: hoje `em_interno=1` (ligado por qualquer um em `/sobre?interno=1`) tira todos os limites; com cobrança, isso vira um jeito de não pagar. Passa a ser assim: `em_interno=1` serve **só às métricas** (eventos e portão, como hoje) e não libera nada. Quem libera é o cookie `em_dono`, com valor = HMAC-SHA256 de `'dono'` com `INTERNO_SEGREDO` (variável do servidor), gravado por `/sobre?interno=<INTERNO_SEGREDO>` (que também grava `em_interno=1`); `?interno=1` continua marcando só as métricas. Sem `INTERNO_SEGREDO` configurado, ninguém é dono. Dono = Pro, sem faixa e sem contar uso (o que o "interno" fazia). Remarcar cada navegador do dono uma vez depois do deploy.
- **Chave de acesso**: `EM-XXXX-XXXX-XXXX` (12 caracteres de um alfabeto sem 0/O/1/I/L, ~60 bits), gerada na primeira aprovação. Fica na tabela (só o servidor lê) para aparecer de novo em /assinatura.
- `/assinatura`: no navegador com plano, mostra plano, período, "válido até", status ("cancelada: vale até…") e a chave com botão Copiar. Em qualquer navegador, campo "Tenho uma chave de acesso" → `POST /api/assinatura/ativar` liga aquele navegador (até 3 por assinatura; o 4º recebe "Esta chave já está em 3 navegadores. Escreva para o contato para liberar."). 10 tentativas por hora por IP. Rotas POST checam a origem (`lib/servidor/mesmaOrigem.ts` da Fase 3; se ela ainda não estiver na main, a mesma checagem do cabeçalho `Origin` contra o host).
- Link "Minha assinatura" no cabeçalho para quem tem plano (no lugar de "Assinar Pro"); no rodapé de /planos, "Já assinou? Use sua chave de acesso".

## 6. Cadeados (a tabela de /planos inteira)

| | Grátis | Basic | Pro |
|---|---|---|---|
| Buscas por dia | 3 | 15 | uso justo (sem teto visível; 300/dia por trás, aviso "uso justo" se passar) |
| Editais abertos por dia | 3 | 15 | uso justo (300/dia) |
| "Abrir edital oficial" | cadeado → cartão dos planos | ✓ | ✓ |
| Editais parecidos | 3 primeiros | ✓ | ✓ |
| Filtros Pro (raio, órgão) | cadeado | cadeado | ✓ |
| Exportar planilha | cadeado | cadeado | ✓ |

- `lib/servidor/uso.ts`: o limite vem do plano (`limitesDoPlano(plano)` em lib/limites.ts); `registrar_uso` já recebe o limite. `UsoHoje` ganha `plano` e os máximos; a faixa mostra "de 15" no Basic e some no Pro (como no interno). Mensagens do 402 com o máximo do plano.
- Servidor decide: `/api/busca` e `/api/mapa` recusam raio e órgão fora do Pro (402 com `codigo: 'recurso_pro'`); `/api/exportar` só Pro; a página do edital só entrega o link oficial com Basic/Pro (no grátis, o botão vira "Abrir edital oficial · Basic" e leva a /planos); relacionados cortam em 3 no grátis.
- Na tela: a etiqueta "Pro" que já existe vira cadeado para quem não tem o plano, e clicar abre o cartão dos planos (CartaoLimite).
- `AVISO_PLANOS` e a lista de espera saem de /planos quando o interruptor está ligado (a rota e a tabela ficam, para o interruptor desligado).
- Robôs (lib/robos.ts) continuam vendo a página do edital inteira, sem o link oficial (é conteúdo para pessoa).

## 7. Banco (migração 0015, `npm run db:aplicar`)

- `checkouts` (codigo text pk, visitante uuid, plano, periodo, criado_em). Apagados depois de 30 dias pelo job de retenção.
- `assinaturas` (id uuid pk, cakto_assinatura text unique null, cakto_pedido text, plano `basic|pro`, periodo `mensal|anual`, email text, status `ativa|cancelada|estornada`, valido_ate timestamptz, chave text unique, criado_em, atualizado_em).
- `assinatura_navegadores` (assinatura uuid, visitante uuid, criado_em, pk (assinatura, visitante)).
- `cakto_eventos` (pedido text, evento text, recebido_em, corpo jsonb sem o `secret` e sem `card`/`customer.docNumber`; pk (pedido, evento)). Apagados depois de 180 dias.
- `plano_do_visitante(p_visitante uuid) returns text`.
- `eventos_tipo_check` ganha `assinou` (mantendo os 11 tipos atuais, com os 4 da 0014).
- RLS ligado em todas, sem políticas para `anon`/`authenticated`; funções só para `service_role`.
- LGPD: guardar só o e-mail do comprador (para suporte); CPF, telefone, endereço e cartão não são gravados.

## 8. Testes

Vitest, teste primeiro: assinatura HMAC (válida, adulterada, antiga, sem cabeçalho com `secret`), `data` em lista, idempotência, cada evento da tabela da seção 4 (validade, status, renovação com e sem `subscription.id`, oferta desconhecida), mapa oferta → plano, chave (formato, alfabeto), limite de 3 navegadores, `planoAtual` (sem assinatura, vencida, estornada, Pro > Basic, dono), cookie do dono (assinatura certa, adulterada, sem segredo configurado; `em_interno=1` sozinho não libera), limites por plano e faixa, cadeados nas rotas (raio/órgão/exportar 402 fora do Pro), link oficial só com plano, interruptor desligado = comportamento de hoje, `/api/checkout` (código, redirecionamento, sem cookie).

Conferência real: evento de teste da Cakto (`event_test`) chega e é aceito; compra real de R$ 49,90 com Pix → plano liga em segundos → /obrigado mostra a chave → chave em outro navegador → reembolso pelo painel → plano cai.

## 9. Fora desta entrega

Login e plano preso à conta (Fase 5, junto com `perfis.plano`); troca de plano e cancelamento pelo site (a pessoa cancela pela Cakto, pelo e-mail de compra); alertas; nota fiscal; cupom; conversões do Google Ads (entrega 3).

## 10. Critérios de aceite

- [ ] Compra real liga o plano no navegador do checkout em até 1 min (cartão) e /obrigado mostra a chave.
- [ ] Chave liga até 3 navegadores; o 4º é recusado.
- [ ] Renovação estende; cancelamento mantém até o fim; reembolso e chargeback cortam na hora.
- [ ] Grátis: cadeado no link oficial, nos filtros Pro e na exportação; 3 parecidos; 3/3 por dia. Basic: 15/15, sem filtros Pro. Pro: sem faixa.
- [ ] Webhook com assinatura inválida = 401; evento repetido não duplica.
- [ ] Interruptor desligado: site igual ao de hoje.
- [ ] `/sobre?interno=1` não tira limites; `/sobre?interno=<segredo>` sim.
- [ ] `npm test` e `npm run typecheck` passam.
