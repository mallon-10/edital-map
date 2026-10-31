import type { Guia } from '../tipos';

export const guia: Guia = {
  slug: 'compras-gov-br',
  titulo: 'Compras.gov.br (antigo Comprasnet): como a empresa participa',
  descricao:
    'O que é o Compras.gov.br, o antigo Comprasnet: como entrar com a conta gov.br, o SICAF, onde ver editais, a sessão, os lances e o chat do pregoeiro.',
  resposta:
    'O Compras.gov.br, chamado de Comprasnet até outubro de 2021, é o sistema do governo federal onde órgãos públicos fazem pregões, dispensas eletrônicas e outras compras pela internet. Fica em gov.br/compras. Para participar, a empresa entra com a conta gov.br, faz o credenciamento gratuito no SICAF e envia proposta e lances pelo próprio sistema.',
  revisadoEm: '2026-10-31',
  secoes: [
    {
      titulo: 'Onde fica o Compras.gov.br (antigo Comprasnet)',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O endereço oficial é o [Portal de Compras do Governo Federal](https://www.gov.br/compras/pt-br), em gov.br/compras. Lá ficam o botão "Acesso ao Sistema", a área do fornecedor, os manuais e a entrada do SICAF. O Edital Map não é o Compras.gov.br e não fala em nome do governo: aqui você encontra editais abertos e segue para o sistema oficial para participar.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O nome mudou em 2021. Segundo o anúncio oficial, a partir de 1º de outubro de 2021 o Comprasnet 4.0 passou a se chamar Compras.gov.br. Por isso muita gente ainda procura por "Comprasnet", e alguns endereços oficiais ainda trazem esse nome.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'É no Compras.gov.br que os órgãos federais fazem as compras pela internet. Nas licitações federais julgadas pelo [menor preço](/glossario/menor-preco) ou pelo [maior desconto](/glossario/maior-desconto), a sessão pública acontece nesse sistema (Instrução Normativa SEGES/ME nº 73/2022, art. 7º). A [dispensa eletrônica](/glossario/dispensa-eletronica) federal também roda nele (Instrução Normativa SEGES/ME nº 67/2021, art. 3º).',
        },
      ],
    },
    {
      titulo: 'Compras.gov.br, SICAF e PNCP: quem faz o quê',
      blocos: [
        {
          tipo: 'paragrafo',
          texto: 'Três nomes aparecem juntos e confundem quem está começando. Cada um tem um papel:',
        },
        {
          tipo: 'lista',
          itens: [
            'Compras.gov.br: o sistema onde a disputa acontece. A empresa envia a [proposta](/glossario/proposta), dá [lances](/glossario/lance), conversa com o [pregoeiro](/glossario/pregoeiro) e manda documentos.',
            '[SICAF](/guias/sicaf): o cadastro de fornecedores do governo federal. Nas licitações federais, a empresa precisa estar credenciada nele antes de participar (IN 73, art. 13, I), e a [habilitação](/glossario/habilitacao) é conferida pelo SICAF nos documentos que ele abrange (IN 73, art. 39).',
            'PNCP: o [Portal Nacional de Contratações Públicas](/guias/pncp), onde os órgãos de todo o país divulgam o [edital](/glossario/edital) e os anexos (Lei 14.133/2021, art. 54). A fase externa da licitação federal começa com essa publicação (IN 73, art. 14).',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Resumindo: no PNCP você acha e lê o edital; no SICAF você se cadastra; no Compras.gov.br você disputa. Ler o edital não depende de cadastro: a lei proíbe exigir registro cadastral complementar para dar acesso ao edital e aos anexos (art. 87, § 2º).',
        },
      ],
    },
    {
      titulo: 'Como entrar no sistema, passo a passo',
      blocos: [
        {
          tipo: 'passos',
          itens: [
            'Crie a conta gov.br do representante da empresa. Segundo o guia oficial do fornecedor, é com ela que se entra no Compras.gov.br.',
            'Faça o credenciamento no SICAF, informando o CNPJ. Ele é gratuito e pode ser feito pelo aplicativo Compras.gov.br ou direto no SICAF. A página oficial do serviço indica conta gov.br com selo de confiabilidade prata ou superior, ou certificado digital, para entrar no ambiente do SICAF. Essas regras de acesso mudam, então confira a página antes de começar.',
            'No Portal de Compras, clique em "Acesso ao Sistema", escolha "Fornecedor" e entre com o login e a senha da conta gov.br.',
            'Você chega à Área de Trabalho. Ali ficam as modalidades de compra; ao clicar em uma, aparecem os processos abertos para participar ou acompanhar.',
            'Informe as linhas de fornecimento, que são os grupos de produtos e serviços do seu ramo. O portal usa essas linhas para avisar a empresa das compras que combinam com ela.',
            'Se quiser, instale o aplicativo Compras.gov.br. Segundo as perguntas frequentes do portal, ele reúne mensagens, avisos, esclarecimentos e impugnações dos processos que você acompanha e manda notificações por linha de fornecimento.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'O cadastro no SICAF é gratuito, e o portal alerta para isso. Ninguém precisa pagar taxa ao governo para participar. Se uma assessoria cobrar para fazer o cadastro por você, ela está cobrando pelo serviço dela, não pelo acesso ao sistema.',
        },
      ],
    },
    {
      titulo: 'Onde ver os editais',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            'No próprio Compras.gov.br, na Área de Trabalho, separados por modalidade. Cada unidade compradora aparece com um código, a [UASG](/glossario/uasg), que também vem no edital.',
            'No aplicativo, com filtros por linha de fornecimento e região. Há uma opção para mostrar só compras com itens exclusivos ou preferenciais para [ME e EPP](/glossario/me-epp).',
            'No PNCP, onde os órgãos publicam os editais, inclusive os que usam outras plataformas para a disputa.',
            'No Edital Map, que mostra os editais abertos do PNCP num mapa, com filtros por assunto, estado, cidade e valor. Os [pregões eletrônicos abertos](/licitacoes/pregao-eletronico) e as [dispensas abertas](/licitacoes/dispensa) têm páginas próprias.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Em qualquer caso, o edital informa a plataforma, a data e a hora da sessão. Nas licitações federais, vale o horário de Brasília, inclusive para a contagem de tempo no sistema (IN 73, art. 48).',
        },
      ],
    },
    {
      titulo: 'Como funciona a sessão: proposta, lances e chat',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'As regras abaixo são as da IN 73, que vale para as licitações federais por menor preço ou maior desconto. Estados e municípios podem ter regras próprias, então confira sempre o edital.',
        },
        {
          tipo: 'passos',
          itens: [
            'Antes da sessão: dúvidas e pedidos de [impugnação](/glossario/impugnacao) vão até 3 dias úteis antes da abertura, pelo meio que o edital indicar (art. 16). A proposta é enviada só pelo sistema, até a data e a hora de abertura (art. 18), com a declaração de que a empresa cumpre os requisitos de habilitação e de que a proposta atende ao edital (art. 18, § 2º). Até a abertura, dá para retirar ou trocar a proposta (art. 18, § 4º).',
            'Lance automático: ao cadastrar a proposta, a empresa pode informar o seu valor final mínimo. O sistema envia os lances sozinho até esse limite, que fica em sigilo para os concorrentes e para o órgão (art. 19).',
            'Abertura: no horário do edital, a [sessão pública](/glossario/sessao-publica) abre automaticamente (art. 20).',
            'Lances: só pelo sistema. Você vê em tempo real o melhor lance, sem saber de quem é (art. 21, § 6º). Se errar o valor, pode excluir o último lance uma única vez, em até 15 segundos, quando ele for inconsistente ou inexequível (art. 21, § 3º). Os modos de disputa e o tempo de cada etapa estão no guia do [pregão eletrônico](/guias/pregao-eletronico).',
            'Depois dos lances: o pregoeiro pode negociar pelo sistema, e os demais participantes podem acompanhar (art. 30, § 1º). O primeiro colocado recebe prazo de no mínimo 2 horas, prorrogável, para enviar a proposta ajustada ao último lance (art. 29, § 2º).',
            'Recurso: quem discorda manifesta a intenção de recorrer em campo próprio, no prazo aberto na sessão, de no mínimo 10 minutos (art. 40). As razões do [recurso](/glossario/recurso-administrativo) vêm em até 3 dias úteis (art. 40, § 1º).',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'O chat do pregoeiro: o sistema tem um campo próprio para troca de mensagens entre o pregoeiro e os licitantes, e outra forma de comunicação é proibida (art. 20, § 2º). É pelo sistema que o pregoeiro pede documentos, convoca o próximo colocado e dá avisos. A empresa responde pela perda de negócio se não acompanhar as mensagens ou se ficar desconectada (art. 13, IV). Na prática, mantenha a sessão aberta e alguém de olho enquanto o item estiver em disputa ou em análise.',
        },
      ],
    },
    {
      titulo: 'Estados, municípios e outras plataformas',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O Compras.gov.br não é só do governo federal. Órgãos de estados e municípios podem assinar um termo de acesso para usar o sistema (IN 73, art. 7º, § 4º), e o Portal de Compras publica o passo a passo dessa adesão. Quando gastam recursos da União vindos de transferências voluntárias, estados e municípios, em regra, também seguem as regras da IN 73 (art. 2º).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Mas muitos estados e prefeituras usam outras plataformas. A Lei 14.133 permite que cada ente tenha o próprio sítio oficial para fazer as contratações (art. 175) e que use sistemas eletrônicos de entidades públicas ou de empresas privadas, desde que integrados ao PNCP (art. 175, § 1º). Antes de se cadastrar numa plataforma, confira as condições de uso e se há algum custo.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Na prática, uma empresa que vende para órgãos federais e para a prefeitura da sua cidade pode precisar de cadastro em duas ou mais plataformas. O edital sempre diz onde será a disputa. O guia [como vender para prefeitura](/guias/licitacao-de-prefeitura) explica as compras municipais.',
        },
      ],
    },
    {
      titulo: 'Como o Edital Map ajuda',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O Edital Map reúne os editais abertos publicados no PNCP, venham eles do Compras.gov.br ou de outra plataforma. No [mapa](/) você filtra por assunto, estado, cidade e valor e abre o edital oficial, que informa onde será a disputa. Se preferir receber os editais novos do seu ramo por e-mail, os Alertas fazem parte do plano [Pro](/planos). Para participar, o caminho continua sendo o sistema indicado no edital.',
        },
      ],
    },
  ],
  editais: ['/licitacoes/pregao-eletronico', '/licitacoes/dispensa', '/licitacoes', '/licitacoes/uniformes'],
  perguntas: [
    {
      pergunta: 'Comprasnet e Compras.gov.br são a mesma coisa?',
      resposta:
        'Sim. Segundo o anúncio oficial do governo, em 1º de outubro de 2021 o Comprasnet 4.0 passou a se chamar Compras.gov.br. O endereço do portal é gov.br/compras, e alguns links oficiais ainda usam o nome antigo.',
    },
    {
      pergunta: 'É preciso pagar para usar o Compras.gov.br?',
      resposta:
        'O portal oficial informa que o SICAF é gratuito e que o aplicativo Compras.gov.br tem acesso livre e gratuito. Desconfie de sites que cobram taxa dizendo ser o cadastro oficial.',
    },
    {
      pergunta: 'Preciso de certificado digital para entrar?',
      resposta:
        'O guia oficial do fornecedor indica a entrada com a conta gov.br. Para o SICAF, a página do serviço fala em selo de confiabilidade prata ou superior, ou certificado digital. Como as regras de acesso mudam, confira a página oficial antes de começar.',
    },
    {
      pergunta: 'Como falo com o pregoeiro durante a sessão?',
      resposta:
        'Pelo campo de mensagens do sistema, o chat. Nas licitações federais, a IN SEGES/ME nº 73/2022 manda usar esse campo e proíbe outra forma de comunicação (art. 20, § 2º). Acompanhe as mensagens: a empresa responde pela perda de negócio se não as acompanhar (art. 13, IV).',
    },
    {
      pergunta: 'Prefeituras usam o Compras.gov.br?',
      resposta:
        'Algumas, sim: órgãos de estados e municípios podem assinar um termo de acesso para usar o sistema (IN 73, art. 7º, § 4º). Muitos usam outras plataformas, públicas ou privadas, integradas ao PNCP (Lei 14.133, art. 175, § 1º). O edital informa onde será a disputa.',
    },
  ],
  fontes: [
    { nome: 'Portal de Compras do Governo Federal (gov.br/compras)', url: 'https://www.gov.br/compras/pt-br' },
    {
      nome: 'Comprasnet agora é Compras.gov.br (anúncio oficial, 4/10/2021)',
      url: 'https://www.comprasnet.gov.br/seguro/detalhaNoticia.asp?ctdCod=838',
    },
    {
      nome: 'Instrução Normativa SEGES/ME nº 73/2022 (Portal de Compras do Governo Federal)',
      url: 'https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-me-no-73-de-30-de-setembro-de-2022',
    },
    {
      nome: 'Cadastrar-se como fornecedor da Administração Pública (gov.br)',
      url: 'https://www.gov.br/pt-br/servicos/cadastrar-se-como-fornecedor-da-administracao-publica',
    },
    { nome: 'Lei nº 14.133/2021 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm' },
  ],
  relacionados: ['sicaf', 'pregao-eletronico', 'pncp', 'licitacao-de-prefeitura', 'plataformas-de-licitacao'],
};
