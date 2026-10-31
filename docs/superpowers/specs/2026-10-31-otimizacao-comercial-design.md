# Otimização comercial (31/10/2026)

Pedido do João depois de duas semanas de Google Ads: contatos para a assessoria e nenhuma assinatura. Não é reconstrução: dois públicos, duas ofertas e um funil medido.

- **Público A (já vende ao governo):** Edital Map Pro, R$ 37,90/mês. Mensagem: "Pare de perder oportunidades de vender para o governo."
- **Público B (está começando):** Assessoria Edital Map, a partir de R$ 197. Serviço à parte, não um plano.

## Decisões

**Oferta depois da busca** (`lib/ofertaBusca.ts`, `components/inicio/OfertaBusca.tsx`). A primeira versão ficava abaixo do mapa, fora da primeira tela, e foi revertida no mesmo dia: visual fraco e oferta escondida. Agora é um cartão azul-escuro no topo dos resultados, entre a confirmação da busca e os editais, só para o grátis, com termo, lugar e total reais. Sem termo fica a faixa geral; sem resultado, nada; nunca as duas. Aparece em toda busca até a pessoa fechar, e fechar vale para a sessão (`sessionStorage`, `em_oferta_busca`): a regra antiga de uma vez por busca, com teto de três, ajudava a escondê-la. O título fala do próximo passo, e o total vai na frase de apoio, porque a confirmação logo acima já diz quantos editais foram achados. A oferta só muda com a resposta da busca (`buscaPronta`), para nunca mostrar total velho nem sumir ao trocar a ordem.

**Pesquisa com 5 editais.** Pedido do João para aumentar a conversão, trocando a decisão de 19/10/2026 ("grátis sem limite") e o item "não bloquear a pesquisa gratuita" deste pedido. Com termo, no grátis, só 5 editais; o resto fica atrás de um cadeado com o total real. O corte é no servidor (página, /api/busca e /api/exportar), porque um desfoque só na tela deixaria os editais no código da página; os cartões desfocados são exemplos. Sem termo a home fica livre, e /licitacoes/* e o edital continuam abertos, para não perder o Google. Quem já assina entra pelo próprio cadeado, e o proxy renova o login na pesquisa.

**Resposta da busca.** Quem busca é levado aos resultados nas duas larguras, com "Buscando editais…" e cartões animados enquanto espera, e depois a confirmação com quantos editais achou. A rolagem sai depois do desenho: a faixa geral some do topo junto com a busca, e rolar antes passaria do ponto.

**Continuidade** (`lib/alertaDaBusca.ts`). `/alertas/novo?q=&uf=&municipio=&valor=&modalidades=`: o grátis vê a prévia, que diz que o alerta ainda não foi criado; o Pro vê o formulário preenchido. Raio, órgão e prazo não entram: o alerta não guarda esses filtros, e por isso a oferta com raio promete o município, não o círculo. A prévia guarda o rascunho em `localStorage` (`em_rascunho_alerta`) e o onboarding pós-compra abre preenchido; o `POST /api/radar` cria o alerta real.

**Ofertas no edital.** Assessoria e Pro ficam lado a lado, logo abaixo do cartão principal. No celular, o botão verde do cartão do topo continua, porque as ofertas ficam fora da primeira tela. Para quem já é Pro, o cartão de monitorar não fala em preço.

**Monitorar parecidos no edital.** `segmentoDoEdital` usa o termo do catálogo que bateu no objeto, não o nome do ramo ("luvas de procedimento" não vira "medicamento"). Sem termo conhecido, vai só a UF: nenhum segmento é inventado.

**Assessoria** (`/assessoria`, `lib/assessoria.ts`, `lib/triagem.ts`). Página própria em vez de pop-up: funciona no celular e com o Voltar, serve de destino de anúncio e mostra o que entrega e o que não entrega. Preço em `NEXT_PUBLIC_ASSESSORIA_PRECO_CENTAVOS` (padrão 19700; mudar exige novo build). Regra da triagem: a assessoria trabalha em cima de um edital, então só quem já encontrou um vai ao WhatsApp; "executar todo o processo" recebe o limite do serviço e pode esclarecer; o resto vai à busca, aos guias e ao Pro. Vindo de um edital, a pergunta "já encontrou?" não aparece. A mensagem leva serviço, respostas e edital; nenhum dado pessoal.

**Vitrines** (`components/conta/VitrineRadar.tsx`, `VitrineAlertas.tsx`). Meu Radar e Alertas deixam de ser cadeado; Minhas Oportunidades continua como era. Radar: editais reais da última busca da aba (a legenda diz isso) ou exemplos ilustrativos; os status são sempre exemplo. Acesso continua em `acessoAoPro`, sem mudança.

**Medição** (`lib/rastreio.ts`, `lib/cliente/rastrear.ts`). Sem migração nem tag nova. GA4 só com `NEXT_PUBLIC_GA4_ID`, com `send_to` explícito para não virar evento do Google Ads; o site não usa GTM. O funil que ainda não existia vai ao banco como `usou_recurso`, e o painel do dono mostra sem mudar `painel_admin`.

| Evento | GA4 | Banco |
|---|---|---|
| `search_performed`, `search_results_viewed` | sim | já é `busca` |
| `edital_detail_viewed` | sim | já é `abriu_edital` |
| `pro_offer_viewed`, `pro_cta_clicked` | sim | `usou_recurso` (a faixa geral e /planos só no GA4: têm evento próprio ou apareceriam em toda página) |
| `checkout_started` | sim, ao abrir o checkout | `tentou_assinar` continua no envio |
| `purchase_completed` | servidor, junto do `purchase`, só com o aceite de cookies | `assinou` |
| `assessoria_offer_viewed`, `_qualification_started`, `_qualification_completed` | sim | `usou_recurso` |
| `assessoria_whatsapp_clicked` | sim | já é `quer_recurso` |

`segmento` passa por `semDadoPessoal`: e-mail ou 8+ dígitos não viram parâmetro.

## Alerta grátis por 7 dias: parecer

Viável, mas não entrou: mexe em assinatura e envio, e o pedido era não fazer isso agora.

O que exigiria:
1. **Migração:** registro do teste por conta e por e-mail (uma vez só), com validade.
2. **`plano_da_conta` (0016):** é o ponto único do plano, mas devolver `pro` no teste liberaria Radar, salvos e 5 alertas. O certo é um estado próprio, respeitado em `alertas_para_envio`, no teto `alertas_teto` (0018) e em `bloqueioAlerta`.
3. **Rotas e telas:** `POST /api/alertas`, `acessoAoPro` em /alertas, e o aviso de fim do teste.
4. **Encerramento:** o job das 7h pararia sozinho pela validade, sem cron novo.

Login por código já garante o e-mail verificado e não pede cartão.

**Risco principal: cota do Resend.** O plano grátis tem 100 e-mails/dia somados aos códigos de login, e o teto dos alertas é 60/dia. Com o tráfego dos anúncios, testes grátis podem atrasar os e-mails de quem paga. Trocar o plano do Resend vem antes.

**Recomendação:** esperar duas semanas de funil. Se muita gente clicar na oferta e abandonar o checkout, o teste faz sentido; se pouca gente clicar, o problema é outro e o teste não resolve.
