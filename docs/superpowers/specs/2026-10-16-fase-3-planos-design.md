# Edital Map · Fase 3 · Etapa 1: Planos (design)

Status: **desenho aprovado em 16/10/2026, implementação adiada** até a plataforma estar completa e o domínio próprio comprado (decisão do dono). Antes de implementar: conferir Pix/boleto em assinatura no Stripe Brasil e reler esta spec contra o código da época.

## 1. Objetivo

Cobrar pelo uso: plano Grátis com limite diário, Basic e Pro pagos no Stripe. A Fase 3 foi dividida em etapas, cada uma com spec e plano próprios:

1. **Planos** (esta spec): limites, aviso de plano, conta, Stripe, editais salvos.
2. **Alertas**: e-mail diário às 7h por busca salva, vencimentos de editais salvos (Resend).
3. **Brasil todo e Google**: todas as UFs, SEO.

Fica para o futuro (fora da Fase 3): ver participantes e lances. Durante a disputa a lei mantém os lances sem identificação; depois da sessão, as atas das plataformas costumam listar participantes e lances, e o PNCP publica o vencedor após a homologação. Pede um teste de viabilidade próprio.

## 2. Planos

| | Grátis | Basic · R$ 49,90/mês | Pro · R$ 89,90/mês |
|---|---|---|---|
| Buscas por dia | 3 | 15 | ilimitadas |
| Editais abertos por dia | 3 | 15 | ilimitados |
| Botão "Abrir edital oficial" | — (cadeado, "Disponível no Basic") | ✓ | ✓ |
| Filtros atuais (UF, município, valor, modalidade, prazo) | ✓ | ✓ | ✓ |
| Editais salvos | — | até 10 | ilimitados |
| Vencimentos (e-mail 3 dias e 1 dia antes do prazo de um salvo) — etapa 2 | — | ✓ | ✓ |
| Alertas (e-mail às 7h, busca salva) — etapa 2 | — | 1 busca | até 10 buscas |
| Relacionados (editais parecidos abertos) — depois | 3 primeiros | ✓ | ✓ |
| Filtros Pro (raio, órgão, recorrência) — depois | — | — | ✓ |
| Exportar lista para planilha — depois | — | — | ✓ |
| Futuro (preço de referência, quem venceu, resumo com IA, lances) | — | — | ✓ |

- Só mensal no início. Anual com desconto pode entrar depois.
- O que não estiver pronto aparece como "em breve" na página de Planos.

## 3. Limites e avisos

- **Dia** = calendário de Brasília (`America/Sao_Paulo`); zera à 0h.
- **Busca** = cada combinação diferente de texto + UF + município + valor + modalidade no dia. Não conta: página inicial sem nada preenchido, repetir uma combinação do dia, alternador de prazo, "Carregar mais". Clique em cidade no mapa conta (muda o município).
- **Edital aberto** = cada edital diferente aberto no dia (lista, cartão, link direto). Reabrir não conta.
- **Selo** no cabeçalho, ao lado de "Assinar Pro": "Grátis · 2 de 3 buscas · 1 de 3 editais hoje" (Basic: "de 15"; Pro: sem selo). Amarelo quando falta 1. Celular: "2/3 buscas · 1/3 editais".
- **Busca esgotada**: no lugar da lista, cartão "Você usou as 3 buscas grátis de hoje. Volta amanhã às 0h, ou assine para continuar" com botões Basic e Pro; o mapa fica com a última busca permitida.
- **Edital esgotado**: mostra título, órgão, cidade e prazo; principais informações, itens e "Abrir edital oficial" ficam atrás do mesmo cartão de planos.
- **Sem conta**: a contagem é por navegador (cookie `em_visitante`, já existente). Burlar com outro navegador é aceito (o limite é um lembrete). Não limitar por IP (4G compartilha endereço).
- **Com conta**: a contagem é por conta. Ao entrar, o uso do dia do navegador passa para a conta (ninguém ganha buscas extras ao fazer login).
- A contagem fica numa tabela no banco; o servidor decide antes de entregar dados (rotas `/api/busca`, `/api/mapa` e página do edital). O robô do Google não será limitado (detalhe da etapa 3).
- **Medição**: eventos `limite_atingido` (busca/edital), `clique_plano` (basic/pro) e `assinou`, nos eventos que já existem; dono interno fora da contagem como hoje.

## 4. Conta e Stripe

- **Login**: Supabase Auth com link por e-mail (sem senha); conta criada no primeiro acesso. "Entrar" no cabeçalho.
- **E-mail**: SMTP do Supabase apontando para o Resend (o envio nativo do Supabase tem limite baixo por hora). Sem domínio próprio, só o remetente de teste do Resend (chega apenas no e-mail do dono).
- **`/planos`**: tabela da seção 2. Basic/Pro: sem conta → pede e-mail, entra e segue ao pagamento; com conta → Stripe Checkout (assinatura mensal). Volta com "Assinatura ativa".
- **`/conta`**: plano atual, próxima cobrança, "Gerenciar assinatura" → Customer Portal do Stripe (trocar cartão, mudar Basic↔Pro, cancelar).
- **Webhook** do Stripe (`/api/stripe/webhook`): confere a assinatura do aviso; trata pagamento concluído, renovação, mudança de plano, cancelamento e falha. Grava plano e validade da conta; os limites leem só esse registro.
- Falha de pagamento ou cancelamento: plano vale até o fim do período pago; depois volta ao Grátis.
- **Formas de pagamento**: cartão; Pix/boleto em assinatura a confirmar no Stripe Brasil antes de implementar.
- **Instalação**: Stripe pelo Marketplace da Vercel (`vercel integration add stripe`), começando em modo de teste. Cobrança real depende da conta Stripe do dono (CNPJ, conta bancária) — decisão dele.
- **Segredos**: chave secreta e segredo do webhook só no servidor (sem `NEXT_PUBLIC_`), como a service role.

## 5. Editais salvos

- Botão "Salvar" (marcador) na página do edital e no cartão da lista, para Basic e Pro; no Grátis abre os planos.
- Aba "Salvos" no cabeçalho: lista com prazo; Basic até 10 (no 11º, convite para o Pro); encerrado fica marcado "Encerrado" até a pessoa tirar.

## 6. Banco (migração 0005)

Tabelas `contas` (ligada a `auth.users`), `assinaturas` (plano, validade, ids do Stripe), `uso_diario` (visitante ou conta, dia, tipo busca/edital, chave; único por esse conjunto) e `salvos` (conta, contratação). Acesso só pelo servidor (RLS ligado, sem políticas para `anon`), como hoje. Aplicar com `npm run db:aplicar`.

## 7. Testes

- Automáticos (vitest): o que conta como busca e como edital; virada do dia em Brasília; passagem do uso do navegador para a conta; limites por plano; cada evento do webhook (pagou, renovou, mudou, cancelou, falhou) com assinatura conferida e assinatura inválida recusada; limite de salvos do Basic.
- Navegador (modo de teste do Stripe): Grátis até o limite → assinar Basic → selo muda → salvar edital → abrir edital oficial → cancelar no portal.

## 8. Critérios de aceite

- [ ] Grátis: 4ª busca diferente do dia e 4º edital diferente mostram o cartão de planos; o botão "Abrir edital oficial" mostra o cadeado.
- [ ] Selo correto em Grátis e Basic; ausente no Pro; amarelo quando falta 1.
- [ ] Login por e-mail funciona e leva o uso do dia para a conta.
- [ ] Assinatura de teste no Stripe libera o plano em segundos (webhook); cancelar no portal mantém até o fim do período.
- [ ] Salvos com limite de 10 no Basic.
- [ ] Nenhuma chave secreta no navegador; webhook recusa aviso sem assinatura válida.
- [ ] Eventos `limite_atingido`, `clique_plano` e `assinou` gravados.
