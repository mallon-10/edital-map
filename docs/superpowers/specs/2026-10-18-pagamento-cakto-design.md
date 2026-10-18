# Edital Map · Pagamento pela Cakto (entrega 2 de 3 do MVP pago)

Status: **revisão 2, aprovada em 18/10/2026** (conversa com o dono). Revisão 1 (checkout hospedado da Cakto, Basic e Pro, chave de acesso) foi implementada no branch `pagamento` e não chegou a ser publicada; esta revisão troca o checkout, tira o Basic e tira a chave de acesso. Entregas do MVP pago: 1 · SEO (no ar), **2 · pagamento** (esta spec), 3 · medição do Google Ads e aviso de cookies.

## 1. Objetivo

Cobrar o plano Pro dentro do próprio site (sem mandar a pessoa para a página da Cakto), com Pix Automático e cartão, sem exigir login antes de pagar. Só dois planos: Grátis e Pro.

Sucesso: uma assinatura real (Pix Automático e cartão) liga o Pro em segundos no navegador da compra e na conta do mesmo e-mail; renovar, cancelar, reembolsar e estornar mudam o plano sozinhos; o grátis vê os cadeados.

## 2. Planos

| | Grátis | Pro · R$ 37,90/mês ou R$ 349,90/ano |
|---|---|---|
| Buscas e editais por dia | 3 e 3 | uso justo (300/dia por trás, sem teto na tela) |
| "Abrir edital oficial" | cadeado | ✓ |
| Editais parecidos | 3 primeiros | ✓ |
| Raio em km, órgão comprador, exportar planilha | cadeado | ✓ |
| Resumo semanal por e-mail (segunda, 7h) | — | ✓ (Fase 4) |
| Alertas e editais salvos | — | ✓ (Fase 4: 5 alertas, salvos com uso justo) |

O Basic sai de linha (tabela, limites, Cakto). O valor `'basic'` fica só como valor antigo aceito no banco; nada novo o usa.

## 3. Na Cakto

- Produto **Edital Map Pro** (assinatura): oferta mensal `irpv92e` (R$ 37,90, `month`) e anual `iuy9gzb` (R$ 349,90, `year`). Ofertas do Basic desativadas em 18/10/2026.
- Webhook 75009 (`https://www.editalmap.com.br/api/cakto`), eventos de compra, reembolso, chargeback e assinatura.
- Cobrança direta pela API (`POST /public_api/payments/`, cabeçalho `X-Idempotency-Key` obrigatório): `pix_auto` (QR Code que autoriza os débitos futuros no app do banco) e `threeDs` (cartão tokenizado no navegador pelo SDK da Cakto, com 3D Secure e antifraude). Boleto não existe mais na Cakto.
- SDK no navegador: `https://cakto-sdk.pages.dev/cakto-sdk.min.js`, iniciado com o `client_id` (público; o `client_secret` fica só no servidor).
- Variáveis: `CAKTO_CLIENT_ID` e `CAKTO_CLIENT_SECRET` (servidor; o id também vai para o SDK como `NEXT_PUBLIC_CAKTO_CLIENT_ID`), `CAKTO_WEBHOOK_SECRET`, `CAKTO_OFERTA_PRO_MENSAL`, `CAKTO_OFERTA_PRO_ANUAL`, `INTERNO_SEGREDO`. **Interruptor**: sem as ofertas, o segredo do webhook e o par de chaves, o site continua como hoje (lista de espera, recursos abertos).
- A conferir na primeira compra real (a documentação não diz): se a assinatura nasce sozinha a partir do pedido da oferta de assinatura ou precisa de `POST /public_api/subscriptions/ { parent_order_id }`; se a renovação no cartão cobra sozinha; se a cobrança direta pede liberação do Compliance da Cakto. O webhook trata os dois casos (com ou sem `subscription` no pedido).

## 4. Checkout próprio (`/assinar`)

- Página do site (`noindex`), aberta pelos botões "Assinar o Pro" de /planos, do cartão do limite e dos cadeados.
- Alternador Mensal R$ 37,90 | Anual R$ 349,90 (R$ 29,16/mês).
- Dados (os dois métodos): nome, e-mail, celular, CPF ou CNPJ. Validação no navegador e no servidor (CPF/CNPJ com dígito verificador, celular com DDD).
- **Aba Pix Automático** (padrão): "Gerar QR Code" → o servidor cria a cobrança `pix_auto` → a página mostra o QR Code e o copia-e-cola → pergunta a cada 3 s (até o QR expirar, 10 min) se o pagamento entrou → ao entrar, vai para `/obrigado/{código}`.
- **Aba Cartão**: número, validade, CVV, nome impresso e endereço (CEP preenche rua, cidade e UF pelo ViaCEP; número e complemento à mão), exigido pelo 3D Secure. No navegador: `createToken` → `authenticate3DS` (desafio do banco quando houver) → `completeAntifraudProfile` → envia ao servidor só o `cardToken`, os dados do 3DS e a referência antifraude (número e CVV nunca saem do navegador). O servidor cria a cobrança `threeDs`. Aprovada: `/obrigado/{código}`; recusada: mensagem da Cakto e o formulário de volta.
- Servidor (`POST /api/assinar`, origem conferida, 10 tentativas por hora por IP): grava o `checkout` (código, visitante, período), obtém o token da API (guardado em memória até perto de expirar, 10 h), cria a cobrança com `metadata: { codigo }` e `X-Idempotency-Key` único por tentativa, e devolve só o que a tela precisa (QR Code, ou o estado do cartão). Dados do comprador vão à Cakto e não são gravados (fora o e-mail, que chega pelo webhook).
- O webhook liga o plano pelo `metadata.codigo` (no lugar do `callback` do checkout hospedado; o `callback` continua aceito).

## 5. Quem tem o Pro

- `planoAtual(ctx)` = Pro se: dono confiável; ou uma assinatura válida ligada ao navegador (o da compra); ou, com sessão da conta (Fase 3), uma assinatura válida com o e-mail da conta. Assinatura válida = status diferente de `estornada` e `valido_ate` no futuro (cancelada vale até o fim do período).
- Em outro aparelho: entrar com o e-mail da compra (código de 6 dígitos da Fase 3). A chave de acesso, `/api/assinatura/ativar` e o limite de 3 navegadores saem.
- `/obrigado/{código}`: "Pro ativo" + validade + botão "Ativar minha conta" → `/entrar?email=<e-mail da compra>&voltar=/radar/comecar` (o formulário de /entrar vem com o e-mail preenchido; a pessoa pede o código e configura o Radar, que alimenta o resumo semanal). Sem pagamento ainda: "Confirmando seu pagamento…" com a mesma espera da revisão 1.
- `/assinatura`: plano, período, validade, status, o e-mail da compra e "Para usar em outro aparelho, entre com este e-mail". Sem plano: link para /planos e para /entrar.
- Dono confiável: `em_interno=1` só tira as métricas; o cookie `em_dono` (HMAC de 'dono' com `INTERNO_SEGREDO`), gravado por `/sobre#dono=<segredo>`, dá o Pro e tira os limites.

## 6. Webhook (igual à revisão 1, com estes ajustes)

- Plano e período pelo `offer.id` (só as duas ofertas do Pro; outra oferta = `ignorado`).
- Liga o navegador por `metadata.codigo` ou `callback` (o que vier).
- Efeitos: compra aprovada cria (ou estende), renovação estende, cancelamento mantém até o fim, reembolso e chargeback cortam na hora; mensal 31 dias, anual 366, +3 de folga.

## 7. Banco

- 0015 (já aplicada) continua: `checkouts`, `assinaturas`, `assinatura_navegadores`, `cakto_eventos`, `plano_do_visitante`, `ligar_navegador`, `assinou` nos eventos.
- Sem migração nova: o e-mail da compra já está em `assinaturas.email`. A coluna `chave` fica (valor gerado, não mostrado).

## 8. Resumo semanal

Feito pela sessão da Fase 4, no mesmo envio dos alertas (Resend): toda segunda às 7h, para cada conta Pro com Radar, editais novos da semana, os que vencem nos próximos 7 dias, valor total aberto e órgãos e cidades que mais compraram. Esta entrega só garante como saber se a conta é Pro (assinatura válida pelo e-mail da conta).

## 9. Testes

Vitest: validação do formulário (CPF, CNPJ, celular, e-mail), montagem das cobranças `pix_auto` e `threeDs` (campos, idempotência, metadata), leitura da resposta (QR Code, aprovado, recusado), token da API em cache, `metadata.codigo` no webhook, `planoAtual` pela conta, só Pro na configuração e nas ofertas, tabela de planos com duas colunas, cadeados.

Conferência real: Pix Automático de R$ 37,90 → QR no site → autorizar no app → Pro em segundos → /obrigado → entrar com o e-mail em outro navegador → Pro → reembolso → cai. Depois, cartão.

## 10. Critérios de aceite

- [ ] /planos com duas colunas (Grátis e Pro, R$ 37,90 ou R$ 349,90/ano); "Assinar o Pro" abre /assinar.
- [ ] Pix Automático e cartão pagos dentro do site; nada do cartão passa pelo servidor.
- [ ] Pro liga no navegador da compra e na conta do mesmo e-mail.
- [ ] Renovação, cancelamento, reembolso e chargeback mudam o plano.
- [ ] Cadeados do grátis; Pro sem faixa; dono sem limites; `?interno=1` não tira limites.
- [ ] Interruptor desligado: site igual ao de hoje.
- [ ] `npm test`, `npm run typecheck` e `npm run build` passam.
