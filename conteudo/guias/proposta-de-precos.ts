import type { Guia } from '../tipos';

export const guia: Guia = {
  slug: 'proposta-de-precos',
  titulo: 'Proposta de preços para licitação: como montar sem errar',
  descricao:
    'Como montar a proposta de preços para licitação: o que ela contém, como formar o preço, validade, proposta ajustada no pregão e erros que desclassificam.',
  resposta:
    'A proposta de preços é a oferta da empresa na licitação. Traz o item descrito como pede o termo de referência, marca e modelo quando exigidos, preço unitário e total, validade, prazo de entrega e as declarações do edital. O preço precisa cobrir custo, frete, impostos, prazo de pagamento e margem, sem ser inexequível nem passar do orçamento.',
  revisadoEm: '2026-10-31',
  secoes: [
    {
      titulo: 'O que vai na proposta de preços',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A [proposta](/glossario/proposta) diz o que a empresa vai entregar e por quanto. No [pregão eletrônico](/guias/pregao-eletronico), ela é cadastrada antes da [sessão pública](/glossario/sessao-publica) e, depois dos [lances](/glossario/lance), o vencedor envia a versão final. Quem define o conteúdo é o [edital](/glossario/edital). Em geral, a proposta traz:',
        },
        {
          tipo: 'lista',
          itens: [
            'Identificação da empresa: razão social, CNPJ, endereço, contato e quem assina.',
            'Número do edital e do item ou lote cotado.',
            'Descrição do item igual à do [termo de referência](/glossario/termo-de-referencia): material, tamanho, cor, norma técnica e certificado, quando houver.',
            'Marca, modelo e fabricante, quando o edital pedir. O órgão só indica marca em casos excepcionais e justificados (Lei 14.133/2021, art. 41, I). Se a marca for só referência, um similar pode ser aceito com prova de qualidade, como laudo ou certificado (art. 42).',
            'Unidade de medida, quantidade, preço unitário e preço total.',
            'Validade da proposta e prazo e local de entrega.',
            'As declarações do edital. Uma é obrigatória por lei: a de que o preço cobre todos os custos trabalhistas, sob pena de desclassificação (art. 63, § 1º). Outras comuns: reserva de cargos para pessoa com deficiência e reabilitado (art. 63, IV) e, para os benefícios de [ME e EPP](/glossario/me-epp), a de que a empresa não passou o limite de contratos públicos no ano (art. 4º, § 2º).',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'O modelo de proposta costuma vir como anexo do edital. Use esse modelo: ele traz os campos que o órgão vai conferir. Se o edital não trouxer, siga a lista acima e confira cada linha contra o termo de referência.',
        },
      ],
    },
    {
      titulo: 'Como formar o preço',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O preço da proposta não é o preço de balcão. Ele precisa cobrir tudo o que a empresa vai gastar até receber. O edital é obrigado a trazer as regras de entrega e as condições de pagamento (art. 25), e as duas mudam o custo. Monte a conta item por item:',
        },
        {
          tipo: 'passos',
          itens: [
            'Custo do produto: o que você paga ao fornecedor, ou o seu custo de produção. Use cotação atual e por escrito.',
            'Frete até o local de entrega: o edital diz onde entregar, e pode ser mais de um endereço. Inclua embalagem e seguro da carga.',
            'Impostos do seu regime tributário: Simples Nacional, lucro presumido e lucro real calculam de jeitos diferentes. Peça ao seu contador o percentual dessa venda e se a entrega em outro estado muda a conta.',
            'Encargos e custos fixos: a parte de salários, aluguel e administração que cabe nesse fornecimento.',
            'Custo financeiro do prazo de pagamento: o governo paga depois da entrega e da conferência. Se você paga o fornecedor antes, esse dinheiro parado tem custo.',
            'Garantia: troca de produto com defeito e a [garantia contratual](/glossario/garantia-contratual), se o edital exigir.',
            'Margem: o lucro que sobra depois de tudo. É dela que sai a folga para os lances.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Um exemplo. Uma distribuidora de EPI vai cotar luvas nitrílicas e botinas de segurança para um hospital estadual. O edital pede a luva por caixa e a botina por par, entrega em três unidades do interior em 15 dias e pagamento em até 30 dias depois do recebimento. A distribuidora soma o custo do fornecedor, o frete para os três endereços, os impostos, o custo de ficar mais de 40 dias sem receber e a margem. Só então define o preço mínimo por caixa e por par que aceita levar para a disputa.',
        },
      ],
    },
    {
      titulo: 'Preço inexequível, orçamento e negociação',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A lei manda desclassificar a proposta com preço inexequível ou que fica acima do orçamento estimado (art. 59, III). Também cai a proposta que não tiver a exequibilidade demonstrada quando o órgão pedir (art. 59, IV). Para conferir, o órgão pode fazer diligências ou exigir que a empresa demonstre o preço (art. 59, § 2º).',
        },
        {
          tipo: 'lista',
          itens: [
            'Obras e serviços de engenharia: a lei presume [inexequível](/guias/preco-inexequivel) a proposta abaixo de 75% do valor orçado pela administração (art. 59, § 4º). Para o TCU, a presunção é relativa: a empresa pode demonstrar que o preço é viável. Quem vence abaixo de 85% do orçado presta uma garantia adicional (art. 59, § 5º).',
            'Bens e serviços em geral: a lei não fixa percentual. Nas compras federais, a IN SEGES/ME nº 73/2022 trata o preço abaixo de 50% do orçado como indício, e só depois de diligência que mostre custo maior que o preço a proposta é considerada inexequível (art. 34). Outros órgãos podem ter regra própria: confira o edital.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Se o [pregoeiro](/glossario/pregoeiro) pedir que você demonstre o preço, responda no prazo com notas de compra, cotações de fornecedores e a sua memória de cálculo. Quando o preço fica acima do máximo aceito, o órgão pode negociar com o primeiro colocado e, se não der certo, com os seguintes, na ordem (art. 61).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O orçamento estimado pode ser sigiloso, desde que justificado, mas o órgão continua obrigado a divulgar os quantitativos e as demais informações necessárias para a proposta (art. 24). No maior desconto, o preço estimado ou o máximo aceitável vem no edital (art. 24, parágrafo único). Nas compras federais, o orçamento sigiloso só se torna público depois do julgamento das propostas (IN 73, art. 12, § 1º). Sem ver o teto, monte o preço pelo seu custo e compare com atas e contratos de compras parecidas publicados no [PNCP](/guias/pncp).',
        },
      ],
    },
    {
      titulo: 'Validade, convocação e proposta ajustada no pregão',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Enquanto a validade da proposta corre, a empresa fica presa ao preço que ofereceu. Se o prazo de validade indicado no edital passar sem convocação para o contrato, os licitantes ficam liberados dos compromissos (art. 90, § 3º).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O vencedor é convocado para assinar o contrato, ou aceitar ou retirar o documento equivalente, no prazo e nas condições do edital, sob pena de perder o direito à contratação (art. 90). Esse prazo pode ser prorrogado uma vez, por igual período, com pedido justificado e aceito (art. 90, § 1º). Não manter a proposta e não assinar o contrato dentro da validade são infrações sujeitas a sanções (art. 155, V e VI).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'No pregão, depois dos lances e da negociação, o vencedor envia a proposta ajustada ao último lance, no prazo que o edital der. Nas compras federais, esse prazo é de no mínimo 2 horas, prorrogável por igual período (IN 73, art. 29, § 2º). Deixe o arquivo pronto antes da sessão. Ao ajustar, baixe os preços unitários de modo que o total bata com o lance, sem item abaixo do custo nem acima do limite por item, se o edital tiver.',
        },
      ],
    },
    {
      titulo: 'Planilha de custos em serviços com mão de obra',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Em serviços contínuos com dedicação exclusiva de mão de obra, como limpeza e vigilância, os empregados da empresa ficam à disposição nas dependências do órgão (art. 6º, XVI). Nesses casos, o edital costuma pedir a planilha de custos e formação de preços. Ela mostra, por posto de trabalho, salário, encargos, benefícios, insumos como uniformes e materiais, custos indiretos, tributos e lucro.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Nas contratações federais, o modelo está no Anexo VII-D da IN SEGES/MPDG nº 5/2017, que a IN SEGES/ME nº 98/2022 autoriza aplicar, no que couber, às contratações da Lei 14.133. Os custos de mão de obra seguem a convenção coletiva da categoria, e é com a planilha que a empresa pede a repactuação depois (art. 135, II e § 6º). Pela IN 5, erro de preenchimento sozinho não desclassifica quando a planilha pode ser ajustada sem aumentar o preço e o preço cobre todos os custos (Anexo VII-A, item 7.9).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Em obras e serviços de engenharia, o vencedor reapresenta as planilhas com custos unitários, BDI e encargos sociais ajustados ao valor final (art. 56, § 5º).',
        },
      ],
    },
    {
      titulo: 'Erros comuns que derrubam a proposta',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            'Descrição diferente do edital: trocar material, tamanho ou norma técnica. A lei desclassifica a proposta que não obedece às especificações do edital (art. 59, II).',
            'Esquecer o frete, ou cotar um endereço só quando o edital pede entrega em vários.',
            'Arredondamento: preço unitário com mais casas decimais do que o sistema aceita, ou total que não fecha com unitário vezes quantidade.',
            'Unidade de medida errada: cotar a unidade quando o edital pede a caixa com 100, ou o par quando pede a unidade.',
            'Não ler o anexo de modelo de proposta e deixar de fora um campo, uma declaração ou a marca.',
            'Validade menor ou prazo de entrega maior que os do edital.',
            'Reaproveitar a proposta de outra licitação sem trocar edital, órgão e item.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'A lei desclassifica por vício insanável (art. 59, I e V), então falha que não muda a substância pode ser corrigida. Mas não conte com isso: revise antes de enviar. Se o edital tiver uma exigência que você considere irregular, o caminho é a [impugnação](/guias/impugnacao-e-recurso), antes da sessão. A habilitação está no guia de [documentos para licitação](/guias/documentos-para-licitacao).',
        },
      ],
    },
    {
      titulo: 'Como o Edital Map ajuda',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Achar o edital cedo dá mais tempo para cotar fornecedores e frete. No [mapa](/) do Edital Map você encontra os editais abertos do PNCP por assunto, estado e cidade e abre o edital oficial. Para receber os editais novos do seu ramo por e-mail, há os Alertas do plano [Pro](/planos). As regras de cada compra estão sempre no edital oficial.',
        },
      ],
    },
  ],
  editais: ['/licitacoes/epi', '/licitacoes/uniformes', '/licitacoes/hospitalar', '/licitacoes/pregao-eletronico'],
  perguntas: [
    {
      pergunta: 'Existe modelo de proposta de preços para licitação?',
      resposta:
        'Na maioria das licitações, sim: o modelo vem como anexo do edital, com os campos que o órgão vai conferir. Use esse modelo. Se o edital não trouxer, monte a proposta com identificação, descrição do item, marca quando pedida, preços, validade, prazo de entrega e as declarações exigidas.',
    },
    {
      pergunta: 'Qual é a validade da proposta em licitação?',
      resposta:
        'É a que o edital fixar. Durante esse prazo a empresa fica presa ao preço oferecido. Se a validade passar sem convocação para o contrato, os licitantes ficam liberados dos compromissos (Lei 14.133/2021, art. 90, § 3º).',
    },
    {
      pergunta: 'Posso mudar o preço depois de enviar a proposta?',
      resposta:
        'Na disputa você pode baixar o preço com lances, e o vencedor envia a proposta ajustada ao último lance. Fora disso, a proposta compromete a empresa: não mantê-la, salvo fato superveniente justificado, é infração sujeita a sanções (art. 155, V). Calcule o seu preço mínimo antes da sessão.',
    },
    {
      pergunta: 'O que é preço inexequível?',
      resposta:
        'É o preço que não cobre os custos de cumprir o contrato. A proposta com preço inexequível é desclassificada (art. 59, III). Em obras e serviços de engenharia, a lei presume inexequível o valor abaixo de 75% do orçado (art. 59, § 4º), e o TCU admite que a empresa demonstre que ele é viável. Em bens e outros serviços, o critério vem do regulamento e do edital.',
    },
    {
      pergunta: 'Preciso informar a marca do produto?',
      resposta:
        'Quando o edital pedir, sim, o que é comum na compra de bens como EPI e uniformes. Informe marca, modelo e fabricante do que vai entregar. Se o edital indicar uma marca só como referência, um similar pode ser aceito com prova de qualidade, como norma técnica, laudo ou certificado (art. 42).',
    },
    {
      pergunta: 'Com orçamento sigiloso, como sei se o meu preço está alto?',
      resposta:
        'Você só vê o teto depois do julgamento. Monte o preço pelo seu custo e compare com atas e contratos de compras parecidas publicados no PNCP. Se o preço ficar acima do máximo aceito, o órgão pode negociar com você antes de passar ao próximo colocado (art. 61).',
    },
  ],
  fontes: [
    { nome: 'Lei nº 14.133/2021 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm' },
    {
      nome: 'Instrução Normativa SEGES/ME nº 73/2022 (Portal de Compras do Governo Federal)',
      url: 'https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-me-no-73-de-30-de-setembro-de-2022',
    },
    {
      nome: 'Instrução Normativa nº 5/2017, atualizada, com o modelo de planilha de custos (Portal de Compras do Governo Federal)',
      url: 'https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-no-5-de-26-de-maio-de-2017-atualizada',
    },
    {
      nome: 'Instrução Normativa SEGES/ME nº 98/2022 (Portal de Compras do Governo Federal)',
      url: 'https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-me-no-98-de-26-de-dezembro-de-2022',
    },
  ],
  relacionados: ['pregao-eletronico', 'como-participar-de-licitacao', 'impugnacao-e-recurso', 'me-epp-e-mei', 'painel-de-precos', 'preco-inexequivel'],
};
