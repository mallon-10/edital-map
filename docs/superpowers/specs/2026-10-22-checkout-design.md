# Checkout do Pro no visual novo (22/10/2026)

Prévia aprovada pelo dono: https://claude.ai/artifact/4MiSFcpcYd8pMRUQcDNeDY (checkout no computador e no celular, tela do
Pix nos dois, /obrigado). Visual igual ao da inicial nova e do /planos: creme, cartões brancos de 26 px sem borda,
pílulas, linha mono. Só muda o que a pessoa vê: Cakto, 3D Secure, antifraude, /api/assinar, a espera do Pix e o webhook
continuam iguais (spec do pagamento, revisão 2).

## /assinar

- **Cabeçalho enxuto** (`CabecalhoCheckout`): logo e "Pagamento seguro" (cadeado, `mata`). Sem abas, sem "Assinar Pro",
  sem a faixa da oferta. A barra de baixo do celular some em `/assinar` (`ehCheckout`).
- Topo: "Voltar aos planos" (/planos), h1 "Assinar o Pro", "Leva menos de um minuto. Você cancela quando quiser."
- **Duas colunas no computador** (`lg`): formulário à esquerda; à direita o **resumo do pedido**, preso na tela
  (`sticky`), com o contorno azul-marinho de 2 px do cartão Pro do /planos. No celular o resumo vem antes do formulário,
  compacto, com "O que vem no Pro" num `<details>`.
- Resumo: linha mono "Resumo do pedido"; "Edital Map Pro" com o quadradinho do e-mail; Mensal | Anual (rádios nativos,
  "−23%" no anual); preço grande (anual: "Equivale a R$ 29,16/mês"); os quatro itens de `ITENS_PRO`; "Total hoje" e
  "Depois, R$ X por mês|ano, até você cancelar."; caixa com "Pagamento seguro, processado pela Cakto", "Cancele quando
  quiser: o Pro vale até o fim do período pago" e "O Pro liga assim que o pagamento é confirmado"; "Já assinou? Entre com
  o e-mail da compra" (/entrar?voltar=/assinatura).
- **Formulário em dois passos numerados**: "1 Seus dados" (nome, e-mail com a dica "É com ele que você entra e recebe os
  alertas.", celular, CPF ou CNPJ) e "2 Forma de pagamento".
- Campos brancos, 50 px, borda `line-strong`, raio 12, **letra de 16 px** (o iPhone não dá zoom), exemplo no placeholder
  e **máscara** (`lib/checkout.ts`): CPF/CNPJ, celular, cartão (grupos de 4), validade MM/AA, CVV, CEP. Erro no próprio
  campo (borda `pin-strong` de 2 px, ícone e texto), mais "Confira os campos marcados." acima do botão.
- **Pix ou cartão**: dois cartões de rádio nativo (Pix marcado), ícone e uma linha cada. Pix: três passos (gere o QR
  Code, autorize no banco, pronto). Cartão: número, nome impresso, validade e CVV ("3 ou 4 dígitos no verso");
  "Endereço de cobrança" com CEP, número e complemento; rua, cidade e UF chegam pelo CEP (ViaCEP) numa linha
  "Rua · Cidade/UF" com "Alterar"; os campos abrem sozinhos se o CEP não achar o endereço. Aviso do cartão que vai direto
  para a Cakto.
- Validação do cartão no navegador por campo (`validarCartao`, mensagens curtas que cabem na coluna do celular): número com
  13 a 19 dígitos e dígito verificador (Luhn),
  nome, validade de 01 a 12 e não vencida, CVV de 3 ou 4, CEP de 8, número, rua, cidade e UF.
- **Botão**: pílula laranja de 60 px com cadeado, "Assinar com Pix · R$ 37,90" ou "Assinar com cartão · R$ 37,90" (anual:
  R$ 349,90); "Processando…" enquanto envia. Embaixo: Pix "Na próxima tela aparece o QR Code para autorizar no app do
  banco."; cartão "Cobrado agora e renovado a cada mês|ano. Você cancela quando quiser."

## Tela do Pix (mesma página, no lugar do formulário)

- h1 vira "Autorize o Pix no app do banco"; "Voltar e trocar os dados" volta ao formulário.
- Computador: QR grande à esquerda (com "O código vale até 14h32" quando a Cakto manda a validade) e três passos à
  direita; embaixo, o Pix Copia e Cola (campo só de leitura que seleciona tudo ao focar) e "Copiar código".
- Celular: o código e "Copiar código Pix" (pílula laranja) primeiro, passos de copiar e colar, e o QR num
  `<details>` "Ler o QR Code em outro aparelho".
- "Código copiado" (verde) por 3 s depois de copiar. Faixa `rio-soft` com o giro: "Esperando a confirmação do banco. Esta
  página avança sozinha." (role status). "Prefere cartão? Pagar com cartão de crédito" volta ao formulário no cartão.
- O resumo continua ao lado (sem trocar o período).

## /obrigado

- Cabeçalho normal. Cartão central: círculo verde com o check, linha mono "Pagamento confirmado", "Pronto, o Pro está
  ativo", "Obrigado por assinar. O Pro já vale neste navegador e renova sozinho."; quadro com Plano, Valor e Válido até.
- "Agora, três passos para os editais chegarem": 1 Ative sua conta (destacado; "Na próxima tela, mandamos um código de 6
  dígitos para {e-mail}…"), 2 Conte o que sua empresa vende, 3 Receba no seu e-mail. Botão "Ativar minha conta" (mesmo
  destino de hoje) e "Ou buscar editais agora".
- Esperando: mesmo cartão com o giro e o texto de `EsperaPagamento`. Não encontrado: o texto de hoje no cartão.

## Testes

- `lib/checkout.test.ts`: máscaras, `validarCartao`, textos do botão e do resumo, `linhaEndereco`, `ehCheckout`.
- `lib/checkoutTela.test.ts`: o checkout renderizado (um h1, rádios, Pix marcado, 16 px, link de voltar, resumo).
