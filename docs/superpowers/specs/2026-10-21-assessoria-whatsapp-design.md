# Assessoria pelo WhatsApp na página do edital

Data: 21/10/2026. Origem: proposta de "Assessoria EditalMap" (cartão no edital, Minhas participações, créditos). Decisão: começar só com o cartão no edital levando ao WhatsApp, para medir se alguém pede antes de construir fila, cobrança ou área de acompanhamento.

## Decisões

- Quem entrega: o João, com IA e revisão. Capacidade pequena; ele aceita ou recusa cada pedido.
- Cobrança: pedido primeiro, preço combinado depois (sem preço no site). O cartão diz que o serviço é pago e combinado antes.
- Sem conta e sem formulário: o botão abre o WhatsApp com a mensagem pronta. Nada de dado pessoal no site.
- Fora desta versão: formulário, fila no /admin, checkout avulso, créditos, "Minhas participações", bloco na página inicial e em /planos.

## O que muda

1. **Cartão "Quer participar desta licitação?"** (components/edital/CartaoAssessoria.tsx): etiqueta "Assessoria Edital Map", título, texto curto, três itens (resumo em linguagem simples, documentos exigidos, passo a passo para participar), botão "Receber orientação para este edital" (abre `wa.me` em outra aba) e a nota "Serviço pago, com valor combinado antes. Atendimento pelo WhatsApp, conforme prazo e escopo." Visual do design system: fundo `mata-soft`, etiqueta e ícones `mata`.
2. **Onde aparece**: só com o edital aberto e pelo menos 48 h até o fim das propostas (`mostrarAssessoria`; menos que isso não dá tempo de atender), e com o número configurado. Celular e telas até `lg`: logo depois de "Principais informações", antes de documentos e itens. Computador (`lg`): no topo da coluna da direita, acima da Ficha.
3. **Mensagem** (lib/assessoria.ts, `linkAssessoria`): "Olá! Vi este edital no Edital Map e quero orientação para participar:" + título (até 120 caracteres), órgão, cidade/UF, "Propostas até dd/mm/aaaa" (quando houver) e o link canônico `https://www.editalmap.com.br/edital/{slug}`.
4. **Número**: variável `WHATSAPP_ASSESSORIA` (só servidor, lida na página). `numeroWhatsapp` aceita com ou sem 55, com máscara; guarda só dígitos (55 + DDD + 8 ou 9 dígitos). Vazia ou inválida = cartão não aparece.
5. **Medição**: clique grava `quer_recurso` com `recurso: 'assessoria'` e o edital (sem migração; o tipo já existe). No /admin aparece como "Pediu orientação (WhatsApp)".
6. **Vitrine "Em breve"**: sai o item "Resumo do edital com IA" (passa a ser parte da orientação). O valor `resumo_ia` continua aceito nos eventos (histórico).

## Testes

- lib/assessoria.test.ts: normalização do número (com/sem 55, máscara, inválidos), texto da mensagem (com e sem prazo, título longo cortado), URL `wa.me` codificada.
- lib/eventos.test.ts: `quer_recurso` `assessoria` exige edital.
- npm test e npm run typecheck; conferência visual em 360 px e no computador.
