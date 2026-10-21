# Página /planos para vender o Pro (21/10/2026)

Prévia aprovada pelo dono: https://claude.ai/artifact/3KQcMcHzY9fQrJnbfD6jkd (versão "Visual da home": computador, tablet,
celular; estados Grátis, Já é Pro e Pagamento desligado). Visual igual ao da página inicial nova
(2026-10-21-visual-novo-inicio-design.md): creme, cartões brancos sem borda e bem arredondados, pílulas, linha mono no topo,
ícones em quadradinho colorido. Sem faixas escuras, sem depoimentos, logotipos ou números inventados.

## Seções (nesta ordem)

1. **Cartão do topo**: linha mono "Monitoramento automático de licitações"; título "As oportunidades certas chegam até
   você. Todos os dias." ("Todos os dias." em `mata`); subtítulo; três pílulas (Alertas diários às 7h, Meu Radar, Resumo
   semanal); "Assinar o Pro" + "Ver preços" (#precos); linha mono com os dois preços. À direita (embaixo no celular), o
   e-mail de alerta desenhado com o selo e a legenda "Exemplo ilustrativo".
2. **Como funciona**: três cartões (filtros → alerta → e-mail às 7h).
3. **Preços** (`#precos`): alternador Mensal | Anual (radiogroup com setas; "−23%" no anual; Mensal já marcado). Grátis
   discreto (contorno, "Continuar grátis" → `/`); Pro com contorno azul-marinho de 2 px e "Recomendado" (âncora `#pro`).
   Anual: "R$ 349,90/ano", "Equivale a R$ 29,16/mês" e "Cobrado uma vez por ano: cerca de 23% a menos que 12
   mensalidades (R$ 454,80)". Sai o "2 meses grátis".
4. **Benefícios do Pro**: alertas, resumo semanal, Meu Radar, salvos (todos "Disponível"); caixa "Em preparação" para
   preço de referência, quem venceu e resumo com IA ("ainda não fazem parte do Pro").
5. **Comparação**: só o que muda + "Buscas e editais: Ilimitados"; o que os dois têm num `<details>`.
6. **Perguntas**: dados, horário, filtros, mudar/pausar, cobrança, cancelamento, aparelhos, grátis. Só fatos do código.
7. **Chamada final**: "Dedique seu tempo às propostas. Deixe o monitoramento com o Edital Map." + "Assinar o Pro".

## Estados (iguais aos de hoje)

- Pagamento ligado: "Assinar o Pro" → `/assinar?periodo=mensal|anual` (período do alternador, compartilhado pela página).
- Pagamento desligado: "Quero o Pro" (`BotaoQueroPlano`: lista de espera e `quer_recurso` plano_pro) + `AVISO_PLANOS`.
- Já é Pro (ou Basic antigo): cartão Pro "Seu plano hoje"; topo e final "Ir para os meus alertas" (/alertas) e "Minha
  assinatura"; sem "Continuar grátis" nem "Já assinou?".
- "Já assinou? Entre com o e-mail da compra" → `/entrar?voltar=/assinatura`.

## Medição

`usou_recurso` (sem migração; o painel mostra pelo nome): `viu_precos` (a seção de preços entra na tela, uma vez por
visita à página), `escolheu_periodo` (`periodo`), `clicou_assinar` (`periodo`, `origem`: topo | precos | final). O
`tentou_assinar` do checkout continua.

## Aviso de cookies

No celular, uma linha compacta (texto + Recusar/Aceitar em pílula lado a lado), cartão branco raio 22, acima da barra
de baixo. Vale para o site todo.

## Ordem de trabalho

1. lib/planos.ts (dados da página, nota do anual) e lib/eventos.ts (recursos novos) com testes; rótulos em lib/admin.ts.
2. Componentes em components/planos/ e app/planos/page.tsx; saem PlanosVista, CartoesPlanos, PrecoDoPlano e AcaoDoPlano.
3. Aviso de cookies.
4. Testes de renderização por estado; npm test, typecheck; capturas 390, 820 e 1440.
