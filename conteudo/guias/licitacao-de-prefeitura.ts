import type { Guia } from '../tipos';
import { DECRETO_VALORES, VALORES } from '../valores';

export const guia: Guia = {
  slug: 'licitacao-de-prefeitura',
  titulo: 'Como vender para prefeitura: licitações municipais passo a passo',
  descricao:
    'Como participar de licitação de prefeitura: onde os editais saem, plataformas, cadastro, pregão presencial, preferência local para ME e EPP e dispensa.',
  resposta:
    'Para vender para prefeitura, a empresa precisa estar regular, achar os editais do município no PNCP ou no diário oficial, se cadastrar na plataforma que a prefeitura usa e disputar no dia marcado. As regras gerais são as da Lei 14.133/2021, mas cada edital traz as exigências daquela compra: leia o edital inteiro antes de participar.',
  revisadoEm: '2026-10-31',
  secoes: [
    {
      titulo: 'As regras que valem para a prefeitura',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A Lei 14.133/2021 traz as normas gerais de licitação para a União, os estados, o Distrito Federal e os municípios (art. 1º). Isso vale para a prefeitura e suas secretarias, as autarquias e fundações do município, os fundos municipais e a câmara de vereadores nas compras administrativas (art. 1º, I e II). As modalidades, os prazos mínimos e os direitos da empresa são os mesmos em qualquer cidade. O guia [como participar de licitação](/guias/como-participar-de-licitacao) mostra o caminho geral.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O município pode ter regulamentos próprios ou aplicar os regulamentos da União (art. 187). Por isso, detalhes como o cadastro de fornecedores, o prazo para enviar documentos e o funcionamento da sessão podem mudar de uma cidade para outra. O [edital](/glossario/edital) diz quais regras valem naquela compra.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Pequenas empresas têm tratamento favorecido também nas compras municipais: a Lei 14.133 aplica os arts. 42 a 49 da Lei Complementar 123/2006 (art. 4º). O guia [ME, EPP e MEI em licitações](/guias/me-epp-e-mei) detalha esses direitos.',
        },
      ],
    },
    {
      titulo: 'Onde a prefeitura publica e onde a disputa acontece',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A regra é publicar o edital inteiro, com os anexos, no [PNCP](/guias/pncp) (art. 54). O extrato do edital também sai no diário oficial do município e em jornal diário de grande circulação (art. 54, § 1º), e a prefeitura pode divulgar o edital no próprio site (art. 54, § 2º).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Há uma exceção importante. Municípios com até 20 mil habitantes receberam prazo de 6 anos, contado da publicação da lei, em 1º de abril de 2021, para cumprir três regras: a licitação na forma eletrônica, a divulgação em sítio eletrônico oficial e requisitos dos agentes públicos que atuam nas licitações (art. 176). Enquanto não adotam o PNCP, eles devem publicar no diário oficial e deixar os documentos em papel na prefeitura, sem cobrar nada além do custo da cópia (art. 176, parágrafo único). Em cidades pequenas, olhe também o diário oficial e o site da prefeitura.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O PNCP serve para divulgar. A disputa acontece numa plataforma escolhida pelo município. A lei permite que o ente tenha o próprio sítio oficial para as contratações (art. 175) ou use sistemas eletrônicos de entidades públicas ou de empresas privadas, desde que integrados ao PNCP (art. 175, § 1º). Algumas prefeituras usam o [Compras.gov.br](/guias/compras-gov-br), do governo federal, depois de assinar um termo de acesso (Instrução Normativa SEGES/ME nº 73/2022, art. 7º, § 4º).',
        },
        {
          tipo: 'lista',
          itens: [
            'Leia no edital o nome da plataforma, o endereço, a data e a hora da sessão.',
            'Faça o cadastro na plataforma com antecedência e confira as condições de uso e se há algum custo.',
            'Guarde login e senha de cada plataforma e anote as sessões numa agenda única.',
          ],
        },
      ],
    },
    {
      titulo: 'Pregão presencial nas cidades pequenas',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A lei manda fazer as licitações preferencialmente na forma eletrônica. A forma presencial só é admitida com motivação, e a sessão pública precisa ser registrada em ata e gravada em áudio e vídeo (art. 17, § 2º). Como os municípios com até 20 mil habitantes têm o prazo do art. 176 para adotar o eletrônico, ainda aparecem [pregões presenciais](/licitacoes/pregao-presencial) em cidades pequenas.',
        },
        {
          tipo: 'lista',
          itens: [
            'Leia no edital como entregar a proposta e os documentos, e chegue antes do horário marcado.',
            'Se quem vai à sessão não for sócio, confira no edital qual documento prova que essa pessoa pode dar lances e assinar pela empresa, como uma procuração.',
            'Leve o preço mínimo já calculado. Na sessão, os lances são dados na hora, na frente dos concorrentes, e não dá tempo de refazer a conta.',
            'Se a empresa for ME ou EPP, veja no edital como comprovar o porte para ter direito aos benefícios.',
          ],
        },
      ],
    },
    {
      titulo: 'Cadastro de fornecedores da prefeitura',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Algumas prefeituras mantêm um cadastro de fornecedores e entregam um certificado de registro cadastral, muitas vezes chamado de CRC. A lei prevê esse registro: quem se inscreve informa os dados de [habilitação](/glossario/habilitacao) e recebe um certificado, renovável sempre que atualizar o cadastro (art. 88, caput e § 2º). O que importa:',
        },
        {
          tipo: 'lista',
          itens: [
            'O edital pode aceitar o registro cadastral no lugar de documentos de habilitação (art. 70, II). Assim você não manda a mesma papelada toda vez.',
            'A prefeitura não pode exigir cadastro complementar só para dar acesso ao edital e aos anexos (art. 87, § 2º).',
            'Se a licitação for restrita a fornecedores cadastrados, a empresa que fizer o cadastro dentro do prazo de propostas do edital pode participar (art. 87, §§ 3º e 4º).',
            'Quem pediu o cadastro pode participar até a decisão da prefeitura, mas só assina o contrato depois de receber o certificado (art. 88, § 6º).',
            'A lei também prevê um cadastro unificado no PNCP, na forma de regulamento federal (art. 87). Enquanto isso, siga o que o edital pede.',
          ],
        },
      ],
    },
    {
      titulo: 'Preferência para pequenas empresas da região',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A Lei Complementar 123 manda dar tratamento diferenciado às [ME e EPP](/glossario/me-epp) nas compras públicas, com o objetivo de promover o desenvolvimento econômico e social no âmbito municipal e regional (art. 47). Os instrumentos são itens exclusivos para ME e EPP, [cota reservada](/glossario/cota-reservada) em bens divisíveis e, em obras e serviços, a possibilidade de exigir a subcontratação de pequenas empresas (art. 48).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Nesses benefícios, o edital pode, com justificativa, dar prioridade de contratação à ME e à EPP sediadas no local ou na região, até o limite de 10% do melhor preço válido (LC 123, art. 48, § 3º). Só vale se o edital previr, e ele explica como a prioridade é aplicada. Fora dos casos previstos em lei, o agente público não pode criar preferência pela sede ou pelo domicílio da empresa (Lei 14.133, art. 9º, I, b).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Os benefícios deixam de valer, por exemplo, quando não há pelo menos 3 fornecedores competitivos ME ou EPP sediados no local ou na região e capazes de cumprir o edital (LC 123, art. 49, II). Se o município tiver lei ou regulamento mais favorável à ME e à EPP, ele vale; se não tiver, aplica-se a legislação federal (art. 47, parágrafo único).',
        },
      ],
    },
    {
      titulo: 'Compras pequenas e dicas práticas',
      blocos: [
        {
          tipo: 'paragrafo',
          texto: `Muitas compras de prefeitura são pequenas e saem por [dispensa de licitação](/guias/dispensa-de-licitacao). Em 2026, pelo ${DECRETO_VALORES.nome}, a dispensa por valor vale para compras e serviços abaixo de ${VALORES.dispensaCompras} e para obras, serviços de engenharia e manutenção de veículos abaixo de ${VALORES.dispensaObras} (art. 75, I e II). Os valores são somados no ano, por unidade e por ramo de atividade (art. 75, § 1º). Essas compras devem ser precedidas, de preferência, de aviso em sítio oficial por no mínimo 3 dias úteis, aberto a propostas (art. 75, § 3º). Com prazo tão curto, ter preço e certidões prontos faz diferença.`,
        },
        {
          tipo: 'lista',
          itens: [
            'Veja a agenda de compras. Quando a prefeitura elabora o [plano de contratações anual](/glossario/plano-de-contratacoes-anual), ele deve ser divulgado em sítio oficial (art. 12, VII e § 1º), e o PNCP também reúne esses planos (art. 174, § 2º, I). É uma prévia do que a cidade pretende comprar.',
            'Comece pela sua cidade e pelas vizinhas. Entregar perto custa menos, e você já conhece as estradas e os prazos. No Edital Map, a página de cada estado, como a de [Minas Gerais](/licitacoes/mg), mostra os editais abertos e leva às cidades com mais compras.',
            'Calcule a logística. Algumas compras pedem entrega em vários pontos, como escolas e postos de saúde, e em parcelas. Leia o [termo de referência](/glossario/termo-de-referencia) para saber locais, prazos e quantidades antes de dar preço.',
            'Entenda a ata. Muitas prefeituras compram por [ata de registro de preços](/guias/ata-de-registro-de-precos): você registra o preço e entrega aos poucos, quando a prefeitura pedir, sem garantia de que toda a quantidade será comprada.',
            'Planeje o caixa. A prefeitura paga depois da entrega e da liquidação, seguindo a ordem cronológica de pagamentos (art. 141). O prazo de pagamento vem no edital e no contrato.',
            'Mantenha as certidões em dia, inclusive a do seu município. O guia de [documentos para licitação](/guias/documentos-para-licitacao) mostra a lista.',
          ],
        },
      ],
    },
    {
      titulo: 'Como o Edital Map ajuda',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O Edital Map reúne os editais abertos publicados no PNCP, inclusive os das prefeituras. No [mapa](/) você filtra por cidade, assunto e valor e abre o edital oficial. Há páginas por assunto, como [alimentos](/licitacoes/alimentos), [material didático](/licitacoes/material-didatico) e [transporte escolar](/licitacoes/transporte-escolar). Se preferir receber os editais novos do seu ramo por e-mail, os Alertas fazem parte do plano [Pro](/planos). As regras de cada compra estão sempre no edital oficial.',
        },
      ],
    },
  ],
  editais: ['/licitacoes', '/licitacoes/pregao-presencial', '/licitacoes/dispensa', '/licitacoes/mg'],
  perguntas: [
    {
      pergunta: 'Preciso de SICAF para vender para prefeitura?',
      resposta:
        'Depende. O SICAF é o cadastro do Compras.gov.br, do governo federal. Se a prefeitura usa outra plataforma, o cadastro é feito nela, e o edital diz se aceita algum registro cadastral, como o SICAF ou o da própria prefeitura, no lugar de documentos.',
    },
    {
      pergunta: 'MEI pode vender para prefeitura?',
      resposta:
        'Pode. O MEI é uma modalidade de microempresa (Lei Complementar 123, art. 18-E, § 3º), e a lei proíbe restringir a participação dele em licitações por causa da sua natureza jurídica (art. 18-E, § 4º). Ele precisa cumprir as exigências do edital, como qualquer licitante.',
    },
    {
      pergunta: 'A prefeitura pode dar preferência para empresas da cidade?',
      resposta:
        'Só nos casos da lei. A Lei Complementar 123 permite que o edital, com justificativa, dê prioridade a ME e EPP sediadas no local ou na região, até 10% do melhor preço válido (art. 48, § 3º). Fora disso, preferência pela sede da empresa é proibida (Lei 14.133, art. 9º, I, b).',
    },
    {
      pergunta: 'Onde acho as licitações da minha cidade?',
      resposta:
        'No PNCP, onde os municípios devem publicar os editais (art. 54 da Lei 14.133), e no diário oficial do município. Cidades com até 20 mil habitantes têm prazo maior para adotar o PNCP (art. 176). No Edital Map, os editais abertos do PNCP aparecem num mapa, com filtro por cidade.',
    },
    {
      pergunta: 'Prefeitura ainda pode fazer pregão presencial?',
      resposta:
        'Pode, com motivação e com a sessão gravada em áudio e vídeo (art. 17, § 2º). Municípios com até 20 mil habitantes têm prazo de 6 anos, contado da publicação da lei em abril de 2021, para adotar a licitação eletrônica (art. 176).',
    },
  ],
  fontes: [
    { nome: 'Lei nº 14.133/2021 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm' },
    { nome: 'Lei Complementar nº 123/2006 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm' },
    { nome: 'Portal Nacional de Contratações Públicas (gov.br)', url: 'https://www.gov.br/pncp/pt-br' },
    {
      nome: 'Instrução Normativa SEGES/ME nº 73/2022 (Portal de Compras do Governo Federal)',
      url: 'https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-me-no-73-de-30-de-setembro-de-2022',
    },
    DECRETO_VALORES.fonte,
  ],
  relacionados: ['como-participar-de-licitacao', 'compras-gov-br', 'me-epp-e-mei', 'dispensa-de-licitacao', 'plataformas-de-licitacao'],
};
