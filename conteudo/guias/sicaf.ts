import type { Guia } from '../tipos';

export const guia: Guia = {
  slug: 'sicaf',
  titulo: 'SICAF: o que é e como cadastrar a empresa',
  descricao: 'O que é o SICAF, quem precisa dele, os seis níveis do cadastro e o passo a passo para cadastrar a empresa pelo Compras.gov.br, de graça.',
  resposta:
    'O SICAF (Sistema de Cadastramento Unificado de Fornecedores) é o cadastro gratuito de empresas que querem vender ao governo federal pelo Compras.gov.br. O cadastro é feito pela internet, com a conta gov.br, e tem seis níveis. Só o primeiro, o credenciamento, é preciso para participar das disputas eletrônicas; os documentos dos outros níveis são cobrados de quem vence.',
  revisadoEm: '2026-10-23',
  secoes: [
    {
      titulo: 'O que é o SICAF',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O [SICAF](/glossario/sicaf) é o cadastro de fornecedores do governo federal. Ele fica dentro do Compras.gov.br, o sistema onde os órgãos federais publicam e conduzem as suas compras. Lá a empresa guarda os dados da firma, os sócios e os documentos que costumam ser pedidos na [habilitação](/glossario/habilitacao), como certidões de regularidade fiscal e trabalhista.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'A ideia é simples: em vez de mandar a mesma pilha de papéis a cada [edital](/glossario/edital), a empresa mantém o cadastro em dia e o órgão consulta o sistema. A Lei 14.133/2021 permite isso: os documentos de habilitação podem ser substituídos por registro cadastral emitido por órgão público, desde que o edital preveja (art. 70, II).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'A lei também prevê um sistema de registro cadastral unificado no [PNCP](/glossario/pncp), na forma de regulamento (art. 87). Nas compras feitas pelo Compras.gov.br, o cadastro usado hoje é o SICAF. Vale acompanhar as páginas oficiais, porque essa parte ainda pode mudar.',
        },
      ],
    },
    {
      titulo: 'Quem precisa se cadastrar',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Precisa do SICAF a empresa que quer vender para órgãos federais (ministérios, universidades e institutos federais, autarquias, Forças Armadas) e para órgãos de estados e municípios que fazem as compras pelo Compras.gov.br. Estados e municípios que usam recursos federais de transferências voluntárias também seguem algumas regras federais, como a da dispensa eletrônica.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Muitos estados e prefeituras usam plataformas e cadastros próprios. Uma empresa de uniformes que quer vender para a prefeitura da sua cidade, por exemplo, pode precisar se cadastrar na plataforma que essa prefeitura usa, e não só no SICAF. O edital sempre diz onde a disputa acontece e quais cadastros valem.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Um ponto que protege a empresa: o órgão não pode exigir cadastro complementar só para dar acesso ao edital e aos anexos (art. 87, § 2º). Ler o edital é livre.',
        },
      ],
    },
    {
      titulo: 'Os seis níveis do cadastro',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O SICAF é dividido em níveis. Cada nível reúne um tipo de informação ou documento. Segundo o Portal de Compras do Governo Federal, são estes:',
        },
        {
          tipo: 'lista',
          itens: [
            'Nível I · Credenciamento: dados básicos da empresa e de quem a representa. É o que deixa a empresa cadastrada no sistema.',
            'Nível II · Habilitação jurídica: contrato social ou documento equivalente e dados dos sócios.',
            'Nível III · Regularidade fiscal federal e trabalhista: situação com a Receita Federal, o FGTS e a Justiça do Trabalho (a [CNDT](/glossario/cndt)).',
            'Nível IV · Regularidade fiscal estadual, distrital e municipal: certidões do estado e do município da empresa.',
            'Nível V · Qualificação técnica: registros e documentos que mostram que a empresa sabe fazer o que vende, como o [atestado de capacidade técnica](/glossario/atestado-de-capacidade-tecnica).',
            'Nível VI · Qualificação econômico-financeira: balanço e certidões ligadas à saúde financeira da empresa.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Com o credenciamento (nível I), a empresa já pode participar das compras eletrônicas. O portal explica que os documentos dos outros níveis não são obrigatórios para entrar na disputa, mas passam a ser exigidos se a empresa vencer. Por isso vale preencher tudo com calma, antes de precisar. Se o vencedor não estiver em dia, ele pode ser inabilitado e a vaga passa para o próximo colocado.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Não confunda o credenciamento do SICAF com o [credenciamento](/glossario/credenciamento) da Lei 14.133, que é outro procedimento de contratação, usado quando o órgão quer contratar vários fornecedores ao mesmo tempo.',
        },
      ],
    },
    {
      titulo: 'Como cadastrar a empresa, passo a passo',
      blocos: [
        {
          tipo: 'passos',
          itens: [
            'Tenha uma conta gov.br do representante da empresa. A página oficial do serviço indica que, para entrar no ambiente do SICAF, a conta precisa do selo de confiabilidade prata ou ouro, ou de certificado digital. As regras de acesso mudam de tempos em tempos, então confira a página antes de começar.',
            'Entre no Portal de Compras do Governo Federal (gov.br/compras), escolha a área do Fornecedor e siga para o cadastro.',
            'No SICAF, abra o credenciamento, informe o CNPJ, preencha os dados pedidos e conclua. A empresa passa a constar como cadastrada.',
            'Preencha os demais níveis: dados dos sócios, certidões federais, estaduais e municipais, qualificação técnica e dados financeiros. O sistema indica o que precisa ser enviado em cada nível.',
            'Informe as linhas de fornecimento, isto é, o que a empresa vende. Nas dispensas eletrônicas federais, o aviso é enviado automaticamente a quem está registrado no SICAF na linha correspondente.',
            'Volte ao cadastro com frequência. Certidões vencem, e um documento vencido no dia da habilitação pode tirar a empresa da disputa.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'O portal tem um manual do fornecedor com as telas do sistema. Em caso de dúvida sobre um campo, ele é a referência, e não sites de terceiros.',
        },
      ],
    },
    {
      titulo: 'É de graça: cuidados comuns',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O cadastro no SICAF é gratuito. O próprio Portal de Compras alerta para sites que cobram pelo cadastro fingindo ser oficiais. Ninguém precisa pagar taxa ao governo para se cadastrar. Empresas de assessoria podem cobrar pelo serviço de ajudar, o que é outra coisa: se contratar uma, saiba que está pagando pela ajuda, não pelo cadastro.',
        },
        {
          tipo: 'lista',
          itens: [
            'O SICAF não substitui a leitura do edital. Cada edital tem regras próprias e pode pedir documentos que não estão no cadastro, como amostras, atestados específicos ou declarações.',
            'Cadastro em dia não é garantia de habilitação. O [agente de contratação](/glossario/agente-de-contratacao) ou o [pregoeiro](/glossario/pregoeiro) confere o que o edital exige.',
            'Microempresa e empresa de pequeno porte devem conferir se o porte está correto no cadastro, porque ele dá direito ao tratamento favorecido da Lei Complementar 123 (veja [ME e EPP](/glossario/me-epp)).',
            'Dados de contato desatualizados fazem a empresa perder avisos e convocações. Revise o e-mail e o telefone.',
          ],
        },
      ],
    },
    {
      titulo: 'Depois do cadastro: encontrar editais',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Com o cadastro pronto, o próximo passo é achar compras do seu ramo. Os órgãos federais e boa parte dos estados e municípios publicam as compras no Portal Nacional de Contratações Públicas, e o Edital Map mostra os editais abertos de todo o país num mapa. Na [página inicial](/) você busca pelo que vende e vê onde estão as compras; em [/licitacoes/pregao-eletronico](/licitacoes/pregao-eletronico) estão os pregões eletrônicos abertos.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Para não precisar procurar todo dia, os Alertas do plano Pro mandam por e-mail os editais novos que combinam com a sua busca. Veja em [/planos](/planos). Para entender a disputa em si, leia o guia do [pregão eletrônico](/guias/pregao-eletronico) e o de [documentos para licitação](/guias/documentos-para-licitacao).',
        },
      ],
    },
  ],
  editais: ['/licitacoes', '/licitacoes/pregao-eletronico', '/licitacoes/dispensa', '/licitacoes/uniformes'],
  perguntas: [
    {
      pergunta: 'O cadastro no SICAF é pago?',
      resposta:
        'Não. O cadastro é gratuito e feito pela internet, no Portal de Compras do Governo Federal. Desconfie de sites que cobram taxa dizendo ser o cadastro oficial.',
    },
    {
      pergunta: 'Preciso preencher todos os níveis do SICAF para participar?',
      resposta:
        'Para entrar nas disputas eletrônicas, o credenciamento (nível I) basta, segundo o portal oficial. Os documentos dos outros níveis passam a ser exigidos se a empresa vencer, então é melhor deixar tudo em dia antes.',
    },
    {
      pergunta: 'Que tipo de conta gov.br preciso para acessar o SICAF?',
      resposta:
        'A página oficial do serviço indica conta gov.br com selo de confiabilidade prata ou ouro, ou certificado digital, para entrar no ambiente do SICAF. Como essas regras mudam, confira a página antes de começar.',
    },
    {
      pergunta: 'Com o SICAF posso vender para qualquer prefeitura?',
      resposta:
        'Não necessariamente. O SICAF vale para as compras feitas pelo Compras.gov.br. Muitos estados e prefeituras usam plataformas e cadastros próprios, e o edital informa onde a disputa acontece.',
    },
    {
      pergunta: 'MEI pode se cadastrar no SICAF?',
      resposta:
        'O cadastro é feito pelo CNPJ, e o MEI tem CNPJ. Antes de disputar, confira no edital se a atividade e o valor da compra são compatíveis com o que o MEI pode faturar e executar.',
    },
  ],
  fontes: [
    { nome: 'Lei nº 14.133/2021 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm' },
    {
      nome: 'Cadastrar-se como fornecedor da Administração Pública (gov.br)',
      url: 'https://www.gov.br/pt-br/servicos/cadastrar-se-como-fornecedor-da-administracao-publica',
    },
    {
      nome: 'SICAF: perguntas frequentes (Portal de Compras do Governo Federal)',
      url: 'https://www.gov.br/compras/pt-br/acesso-a-informacao/perguntas-frequentes/sicaf-sistema/sicaf-sistema',
    },
    {
      nome: 'Contas com nível prata ou ouro (gov.br)',
      url: 'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/contas-com-nivel-prata-ou-ouro/contas-com-nivel-prata-ou-ouro',
    },
  ],
  relacionados: ['documentos-para-licitacao', 'pregao-eletronico', 'como-participar-de-licitacao', 'pncp'],
};
