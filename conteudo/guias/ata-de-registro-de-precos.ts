import type { Guia } from '../tipos';

export const guia: Guia = {
  slug: 'ata-de-registro-de-precos',
  titulo: 'Ata de registro de preços: como funciona para o fornecedor',
  descricao:
    'Como funciona a ata de registro de preços na Lei 14.133: validade, órgão gerenciador, adesão (carona), cadastro de reserva e o que o fornecedor assume.',
  resposta:
    'A ata de registro de preços é o documento em que o órgão público registra o preço vencedor de uma licitação para comprar aos poucos, quando precisar. Pela Lei 14.133/2021, ela vale 1 ano, prorrogável por igual período. O fornecedor se compromete a entregar nas condições registradas, mas o órgão não é obrigado a comprar.',
  revisadoEm: '2026-10-23',
  secoes: [
    {
      titulo: 'O que é o sistema de registro de preços',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O [sistema de registro de preços](/glossario/sistema-de-registro-de-precos), ou SRP, é um jeito de comprar sem saber exatamente quanto e quando. Em vez de fechar um contrato de uma vez, o órgão faz uma licitação, registra o preço vencedor e compra conforme a necessidade aparece. A Lei 14.133/2021 define o SRP no art. 6º, inciso XLV, como o conjunto de procedimentos para registrar preços de serviços, obras e compras "para contratações futuras".',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O registro pode vir de licitação nas modalidades [pregão](/glossario/pregao) ou [concorrência](/glossario/concorrencia), ou de contratação direta. Pelo art. 82, inciso V, o critério de julgamento é o [menor preço](/glossario/menor-preco) ou o [maior desconto](/glossario/maior-desconto) sobre tabela de preços praticada no mercado.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Exemplo: uma prefeitura sabe que vai precisar de uniformes escolares ao longo do ano, mas não sabe quantos alunos vão se matricular. Ela faz um pregão para registro de preços com uma quantidade máxima, registra o preço da empresa vencedora e faz pedidos em lotes durante a validade da ata.',
        },
      ],
    },
    {
      titulo: 'A ata: o que fica registrado e quanto tempo vale',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A [ata de registro de preços](/glossario/ata-de-registro-de-precos) é, pelo art. 6º, inciso XLVI, um "documento vinculativo e obrigacional, com característica de compromisso para futura contratação". Nela ficam o objeto, os preços, os fornecedores, os órgãos participantes e as condições de fornecimento.',
        },
        {
          tipo: 'lista',
          itens: [
            'Validade: 1 ano, que pode ser prorrogado por igual período desde que fique comprovado que o preço continua vantajoso (art. 84).',
            'Contratos que nascem da ata têm a vigência definida nas regras da própria ata (art. 84, parágrafo único).',
            'O edital diz a quantidade máxima de cada item que pode ser comprada e a quantidade mínima que o licitante precisa cotar (art. 82, incisos I e II).',
            'O edital também diz se a empresa pode oferecer quantidade menor que a máxima, ficando obrigada só até o que ofereceu (art. 82, inciso IV).',
            'As condições para mudar os preços registrados e os casos de cancelamento da ata vêm no edital (art. 82, incisos VI e IX).',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Por isso a leitura do [edital](/glossario/edital) é decisiva. Quantidades, prazos de entrega, locais e regras de reajuste mudam de uma ata para outra.',
        },
      ],
    },
    {
      titulo: 'Órgão gerenciador, participantes e não participantes',
      blocos: [
        {
          tipo: 'paragrafo',
          texto: 'Uma mesma ata pode atender vários órgãos. A lei separa três papéis (art. 6º, incisos XLVII a XLIX):',
        },
        {
          tipo: 'lista',
          itens: [
            '[Órgão gerenciador](/glossario/orgao-gerenciador): conduz a licitação e administra a ata.',
            'Órgão participante: entra desde o começo, informa as quantidades que quer e integra a ata.',
            'Órgão não participante: não entrou no começo, mas pede para usar a ata depois. É a famosa "carona".',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Para formar o grupo, o gerenciador abre na fase preparatória a intenção de registro de preços (IRP), com prazo mínimo de 8 dias úteis para outros órgãos entrarem (art. 86). Esse procedimento pode ser dispensado quando o gerenciador é o único contratante (art. 86, § 1º).',
        },
      ],
    },
    {
      titulo: 'Adesão à ata (carona) e seus limites',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A [adesão à ata](/glossario/adesao-a-ata) permite que um órgão não participante compre pelo preço já registrado, sem fazer nova licitação. Para isso, o art. 86, § 2º, exige três coisas: justificativa da vantagem da adesão, demonstração de que os preços estão compatíveis com o mercado e consulta prévia e aceitação do órgão gerenciador e do fornecedor.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Ou seja: o fornecedor pode aceitar ou recusar a carona. Antes de aceitar, vale ver se consegue entregar no novo local, no prazo e sem prejudicar quem já está na ata.',
        },
        {
          tipo: 'lista',
          itens: [
            'Cada órgão não participante pode comprar no máximo 50% das quantidades registradas na ata para o gerenciador e os participantes (art. 86, § 4º).',
            'Somando todas as adesões, o total não pode passar do dobro da quantidade de cada item registrada para gerenciador e participantes (art. 86, § 5º). Há exceções, como certas compras emergenciais de medicamentos em atas do Ministério da Saúde (§ 7º).',
            'Órgãos federais, estaduais e municipais podem aderir a atas de gerenciadores federais, estaduais ou distritais. Atas de gerenciador municipal só recebem adesão de órgãos municipais, e desde que o registro tenha sido feito por licitação (art. 86, § 3º).',
            'Órgãos federais não podem aderir a atas estaduais, distritais ou municipais (art. 86, § 8º).',
          ],
        },
      ],
    },
    {
      titulo: 'O que o fornecedor assume (e o que o órgão não assume)',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Este é o ponto que mais pesa no caixa de uma PME. O art. 83 diz que a existência de preços registrados "implicará compromisso de fornecimento nas condições estabelecidas, mas não obrigará a Administração a contratar". Na prática:',
        },
        {
          tipo: 'lista',
          itens: [
            'Quando o órgão chamar dentro da validade, a empresa precisa entregar pelo preço e nas condições da ata.',
            'O órgão pode comprar menos do que o máximo, ou nada. Pode até fazer outra licitação para o mesmo item, desde que motivada (art. 83).',
            'Deixar de assinar o contrato quando convocado, ou atrasar a entrega sem motivo justificado, são infrações que podem gerar sanções (art. 155, incisos VI e VII).',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Por isso, não monte estoque contando com a quantidade máxima. A empresa de uniformes do exemplo deve calcular o preço para conseguir entregar lotes pequenos e espaçados e conferir no edital os prazos de entrega de cada pedido. Cada pedido costuma vir com uma [nota de empenho](/guias/empenho) ou contrato próprio.',
        },
      ],
    },
    {
      titulo: 'Cadastro de reserva: a chance de quem não ficou em 1º',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A lei permite registrar na ata mais de um fornecedor. Quem aceitar cotar o mesmo preço do vencedor entra na ata, respeitando a ordem de classificação (art. 82, inciso VII, e § 5º, inciso VI). Também entram os licitantes que mantiverem a proposta original.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'No âmbito federal, o Decreto 11.462/2023 chama essa lista de cadastro de reserva (art. 18). Ela é usada se o vencedor não assinar a ata ou tiver o registro cancelado. Estados e municípios podem ter regulamentos próprios, então confira o que o edital diz sobre isso.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Para uma PME, aceitar igualar o preço do vencedor pode ser um caminho para entrar no fornecimento sem ter dado o menor lance. Só faça isso se o preço fechar a conta.',
        },
      ],
    },
    {
      titulo: 'Como achar pregões para registro de preços',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A maioria das atas nasce de [pregão eletrônico](/guias/pregao-eletronico). No Edital Map, procure editais abertos do seu ramo no [mapa](/) ou nas páginas de [pregão eletrônico](/licitacoes/pregao-eletronico). Com os Alertas do [Pro](/planos), os novos editais chegam por e-mail.',
        },
      ],
    },
  ],
  editais: ['/licitacoes/pregao-eletronico', '/licitacoes/uniformes', '/licitacoes/epi', '/licitacoes/escritorio'],
  perguntas: [
    {
      pergunta: 'Quanto tempo vale uma ata de registro de preços?',
      resposta:
        'Pelo art. 84 da Lei 14.133, a ata vale 1 ano e pode ser prorrogada por igual período, desde que se comprove que o preço continua vantajoso. Os contratos que nascem dela seguem a vigência prevista na própria ata.',
    },
    {
      pergunta: 'O órgão é obrigado a comprar tudo o que está na ata?',
      resposta:
        'Não. O art. 83 diz que os preços registrados não obrigam a Administração a contratar. O órgão pode comprar menos, nada, ou fazer outra licitação, desde que motivada.',
    },
    {
      pergunta: 'O fornecedor pode recusar um pedido de adesão (carona)?',
      resposta:
        'Sim. A adesão de órgão não participante exige consulta e aceitação prévias do órgão gerenciador e do fornecedor (art. 86, § 2º, inciso III). Já os pedidos do gerenciador e dos participantes, dentro da validade e das quantidades registradas, precisam ser atendidos (art. 83).',
    },
    {
      pergunta: 'Qual o limite da adesão à ata?',
      resposta:
        'Cada órgão que adere pode comprar até 50% das quantidades registradas para o gerenciador e os participantes (art. 86, § 4º). Somadas, as adesões não podem passar do dobro de cada item (§ 5º), com algumas exceções previstas na lei.',
    },
    {
      pergunta: 'O que é cadastro de reserva?',
      resposta:
        'É a lista de licitantes registrados na ata além do vencedor, que aceitaram cotar o mesmo preço ou mantiveram a proposta original. No âmbito federal, o Decreto 11.462/2023 trata dele no art. 18. Ele é chamado se o vencedor não assinar ou tiver o registro cancelado.',
    },
  ],
  fontes: [
    { nome: 'Lei nº 14.133/2021, arts. 6º e 82 a 86 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm' },
    { nome: 'Decreto nº 11.462/2023, registro de preços federal (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/decreto/D11462.htm' },
    { nome: 'Portal Nacional de Contratações Públicas (PNCP)', url: 'https://pncp.gov.br' },
  ],
  relacionados: ['pregao-eletronico', 'como-participar-de-licitacao', 'empenho', 'documentos-para-licitacao'],
};
