import type { Guia } from '../tipos';

export const guia: Guia = {
  slug: 'empenho',
  titulo: 'Empenho e nota de empenho: como a empresa recebe do governo',
  descricao:
    'O que é empenho e nota de empenho, as etapas empenho, liquidação e pagamento e os cuidados para a empresa receber do governo em dia.',
  resposta:
    'Empenho é o ato do órgão público que reserva o dinheiro do orçamento para pagar uma compra e cria a obrigação de pagamento (Lei 4.320/1964, art. 58). A nota de empenho é o documento que registra esse ato, com o nome do credor e o valor. Depois do empenho vêm a liquidação e o pagamento.',
  revisadoEm: '2026-10-23',
  secoes: [
    {
      titulo: 'O que é empenho',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Ganhar a licitação não coloca dinheiro no caixa na mesma hora. O pagamento de um órgão público segue as regras de despesa pública da Lei 4.320/1964, e a primeira etapa é o [empenho](/glossario/empenho).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Segundo o art. 58 da Lei 4.320, empenho é o ato da autoridade competente que cria para o Estado a obrigação de pagamento, pendente ou não de implemento de condição. Em linguagem simples: o órgão separa, no orçamento, o dinheiro daquela compra e se compromete a pagar quando a entrega for feita. O empenho não pode passar do limite dos créditos do orçamento (art. 59), e nenhuma despesa pode ser feita sem empenho prévio (art. 60).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'A lei prevê formas diferentes de empenho. Quando o valor exato não pode ser definido antes, o empenho é feito por estimativa (art. 60, § 2º). Para despesas de contrato pagas em parcelas, é permitido o empenho global (art. 60, § 3º). Fora desses casos, o empenho tem valor certo e serve a uma despesa paga de uma vez (na contabilidade pública, é chamado de empenho ordinário).',
        },
      ],
    },
    {
      titulo: 'A nota de empenho',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Para cada empenho é emitido um documento chamado nota de empenho. Ela indica o nome do credor (a sua empresa), a especificação e o valor da despesa e o abatimento desse valor do saldo do orçamento (Lei 4.320, art. 61).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Em alguns casos, a nota de empenho substitui o contrato. A Lei 14.133/2021 diz que o contrato é obrigatório, mas permite trocá-lo por outro instrumento, como carta-contrato, nota de empenho, autorização de compra ou ordem de execução de serviço, em duas situações (art. 95): dispensa de licitação em razão do valor, e compras com entrega imediata e integral, das quais não resultem obrigações futuras, inclusive de assistência técnica. Mesmo assim, as cláusulas do art. 92 se aplicam no que couber (art. 95, § 1º).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Exemplo: uma empresa de EPI vende 300 pares de luvas numa [dispensa de licitação](/guias/dispensa-de-licitacao) de uma prefeitura. Em vez de assinar um [contrato administrativo](/glossario/contrato-administrativo), ela recebe a nota de empenho com o item, a quantidade e o valor. Esse documento funciona como a ordem de compra.',
        },
      ],
    },
    {
      titulo: 'As três etapas: empenho, liquidação e pagamento',
      blocos: [
        {
          tipo: 'passos',
          itens: [
            'Empenho: o órgão reserva o recurso e emite a nota de empenho em nome da empresa (Lei 4.320, arts. 58 a 61).',
            'Entrega e recebimento: a empresa entrega o produto ou presta o serviço. O órgão recebe primeiro de forma provisória e depois definitiva, conforme o contrato ou o regulamento (Lei 14.133, art. 140).',
            '[Liquidação](/glossario/liquidacao): o órgão confere se a empresa tem direito de receber, com base no contrato, na nota de empenho e nos comprovantes da entrega. Apura o que se deve pagar, o valor exato e a quem pagar (Lei 4.320, art. 63).',
            'Ordem de pagamento: a autoridade competente determina que a despesa seja paga (Lei 4.320, art. 64).',
            'Pagamento: o dinheiro é depositado. O pagamento só acontece depois da liquidação regular (Lei 4.320, art. 62).',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Na prática, a nota fiscal costuma entrar na etapa de liquidação, junto com o termo ou o atesto de recebimento. Por isso, nota fiscal com erro ou entrega diferente do empenhado atrasa tudo.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Como regra, o governo não paga antes da entrega. A Lei 14.133 proíbe o pagamento antecipado (art. 145). A exceção exige economia relevante ou que a antecipação seja indispensável para obter o bem ou o serviço, com justificativa prévia e previsão expressa no edital (art. 145, § 1º).',
        },
      ],
    },
    {
      titulo: 'Prazo de pagamento e ordem cronológica',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A Lei 14.133 não fixa um número único de dias para o pagamento. Ela manda que todo contrato traga o preço, as condições de pagamento, os critérios de atualização monetária entre a entrega e o efetivo pagamento e o prazo para liquidação e para pagamento (art. 92, V e VI). Então o prazo que vale é o do seu edital e do seu contrato. Leia essa cláusula antes de dar o preço.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Os pagamentos seguem uma ordem cronológica, separada por fonte de recursos e por categoria de contrato: fornecimento de bens, locações, prestação de serviços e obras (art. 141). O órgão só pode alterar essa ordem em casos listados na lei, com justificativa prévia e comunicação ao controle interno e ao tribunal de contas (art. 141, § 1º). Um desses casos é o pagamento a microempresa, empresa de pequeno porte e microempreendedor individual, quando há risco de a empresa não conseguir continuar entregando (art. 141, § 1º, II).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O órgão deve publicar todo mês, no seu site, a ordem cronológica dos pagamentos e as justificativas de qualquer alteração (art. 141, § 3º). É uma forma de a empresa acompanhar a fila.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'E se o atraso for longo? Se a Administração atrasar mais de 2 meses, contados da emissão da nota fiscal, o contratado tem direito à extinção do contrato (art. 137, § 2º, IV). Em vez disso, ele pode optar por suspender o cumprimento das obrigações até a situação se normalizar (art. 137, § 3º, II). Essas hipóteses não valem em calamidade pública, grave perturbação da ordem interna ou guerra (art. 137, § 3º, I). Antes de suspender entregas, busque orientação jurídica: é uma decisão com consequências.',
        },
      ],
    },
    {
      titulo: 'Cuidados para receber em dia',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            'Só entregue com a nota de empenho (ou o contrato) em mãos. A lei proíbe despesa sem empenho prévio (Lei 4.320, art. 60), e entregar antes deixa a empresa sem documento que comprove a obrigação de pagamento.',
            'Confira a nota de empenho assim que receber: razão social, CNPJ, itens, quantidades, preço unitário e valor total devem bater com a sua proposta.',
            'Emita a nota fiscal exatamente como está no empenho: mesma descrição, quantidade e valor. Divergência costuma devolver a nota e reiniciar a conferência.',
            'Guarde o comprovante de entrega assinado pelo órgão, com data, nome e cargo de quem recebeu.',
            'Mantenha as certidões em dia durante todo o contrato. A lei exige que o contratado mantenha as condições de [habilitação](/glossario/habilitacao) durante a execução (Lei 14.133, art. 92, XVI). Veja quais são em [documentos para licitação](/guias/documentos-para-licitacao).',
            'Em entregas parceladas, acompanhe o saldo do empenho. Se o pedido passar do saldo, peça reforço do empenho antes de entregar.',
            'Anote o contato do fiscal ou do gestor do contrato. É com ele que se resolvem dúvidas de recebimento.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Na [ata de registro de preços](/guias/ata-de-registro-de-precos), a lógica é parecida: a ata não gera pagamento sozinha. Cada pedido do órgão vem com o seu empenho ou contrato, e só então a entrega deve ser feita.',
        },
      ],
    },
    {
      titulo: 'Encontre editais para vender ao governo',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Conhecer o caminho do pagamento ajuda a escolher bem onde entrar e a calcular o capital de giro. No [mapa do Edital Map](/) você vê os editais abertos do seu ramo, como [EPI](/licitacoes/epi) e [uniformes](/licitacoes/uniformes), por cidade e por valor. Com os [Alertas do Pro](/planos), os editais novos chegam ao seu e-mail.',
        },
      ],
    },
  ],
  editais: ['/licitacoes/dispensa', '/licitacoes/pregao-eletronico', '/licitacoes/epi', '/licitacoes/uniformes'],
  perguntas: [
    {
      pergunta: 'Qual a diferença entre empenho e nota de empenho?',
      resposta:
        'Empenho é o ato do órgão que reserva o recurso e cria a obrigação de pagar (Lei 4.320, art. 58). Nota de empenho é o documento emitido para cada empenho, com o nome do credor, a especificação e o valor da despesa (art. 61).',
    },
    {
      pergunta: 'A nota de empenho substitui o contrato?',
      resposta:
        'Pode substituir em dois casos previstos no art. 95 da Lei 14.133: dispensa de licitação em razão do valor e compras com entrega imediata e integral, sem obrigações futuras. Nos demais casos, o contrato é obrigatório. O edital informa qual instrumento será usado.',
    },
    {
      pergunta: 'Ter a nota de empenho garante o pagamento?',
      resposta:
        'O empenho cria a obrigação de pagamento e reserva o recurso, mas o pagamento só sai depois da liquidação, quando o órgão confere a entrega e os documentos (Lei 4.320, arts. 62 e 63). Por isso a entrega correta e a nota fiscal igual ao empenho são essenciais.',
    },
    {
      pergunta: 'Em quantos dias o governo paga?',
      resposta:
        'Não há um prazo único na Lei 14.133. O prazo para liquidação e pagamento deve constar do contrato (art. 92, VI), então vale o que o edital e o contrato dizem. Se o atraso passar de 2 meses da emissão da nota fiscal, o contratado pode pedir a extinção do contrato ou optar por suspender as obrigações (art. 137).',
    },
    {
      pergunta: 'O que é ordem cronológica de pagamentos?',
      resposta:
        'É a regra do art. 141 da Lei 14.133: o órgão paga seguindo uma ordem cronológica, separada por fonte de recursos e por tipo de contrato. A ordem só muda em casos previstos na lei, com justificativa, e deve ser publicada todo mês no site do órgão.',
    },
  ],
  fontes: [
    { nome: 'Lei nº 4.320/1964, arts. 58 a 64 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/leis/l4320.htm' },
    { nome: 'Lei nº 14.133/2021, arts. 92, 95, 137, 140, 141 e 145 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm' },
  ],
  relacionados: ['dispensa-de-licitacao', 'ata-de-registro-de-precos', 'documentos-para-licitacao', 'como-participar-de-licitacao'],
};
