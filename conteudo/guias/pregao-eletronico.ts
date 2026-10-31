import type { Guia } from '../tipos';

export const guia: Guia = {
  slug: 'pregao-eletronico',
  titulo: 'Pregão eletrônico: como funciona e como dar lances',
  descricao: 'Como funciona o pregão eletrônico na Lei 14.133: fases, prazos, modos de disputa, lances, negociação, habilitação e recurso, explicado para empresas.',
  resposta:
    'Pregão eletrônico é a modalidade de licitação usada para comprar bens e serviços comuns pela internet. As empresas enviam propostas e depois disputam com lances públicos, e vence o menor preço ou o maior desconto. Em regra, só depois do julgamento o pregoeiro confere os documentos de habilitação de quem ficou em primeiro lugar (Lei 14.133/2021, arts. 6º e 17).',
  revisadoEm: '2026-10-31',
  secoes: [
    {
      titulo: 'O que é o pregão',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O [pregão](/glossario/pregao) é a modalidade de licitação obrigatória para comprar bens e serviços comuns. O critério de julgamento pode ser o [menor preço](/glossario/menor-preco) ou o [maior desconto](/glossario/maior-desconto) (Lei 14.133/2021, art. 6º, XLI).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Bem ou serviço comum é aquele cuja qualidade pode ser descrita no [edital](/glossario/edital) com especificações usuais de mercado (art. 6º, XIII). Uniformes, EPI, material de limpeza, alimentos e material de escritório costumam entrar aqui. O pregão não serve para serviços técnicos especializados de natureza intelectual nem para obras e serviços de engenharia, salvo os serviços comuns de engenharia (art. 29, parágrafo único).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'A lei manda fazer as licitações preferencialmente na forma eletrônica. A forma presencial é exceção e precisa de motivação, com a sessão gravada em áudio e vídeo (art. 17, § 2º). No governo federal, a Instrução Normativa SEGES/ME nº 73/2022 trata a forma eletrônica como regra para o menor preço e o maior desconto.',
        },
      ],
    },
    {
      titulo: 'Quem conduz: o pregoeiro',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A licitação é conduzida por um [agente de contratação](/glossario/agente-de-contratacao), servidor designado pela autoridade competente para tomar decisões e levar o processo até a [homologação](/glossario/homologacao) (art. 6º, LX, e art. 8º). No pregão, esse agente se chama [pregoeiro](/glossario/pregoeiro) (art. 8º, § 5º). Ele é auxiliado por uma equipe de apoio.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Na prática, o pregoeiro abre a sessão, analisa as propostas, acompanha os lances, negocia com o primeiro colocado, confere a habilitação e responde às mensagens no chat do sistema. Toda a conversa fica registrada.',
        },
      ],
    },
    {
      titulo: 'As fases do pregão',
      blocos: [
        {
          tipo: 'paragrafo',
          texto: 'O pregão segue o rito comum da lei (art. 29), com estas fases em sequência (art. 17):',
        },
        {
          tipo: 'passos',
          itens: [
            'Preparatória: o órgão define o que vai comprar, pesquisa preços e escreve o [termo de referência](/glossario/termo-de-referencia). A empresa ainda não participa.',
            'Divulgação do edital: o edital é publicado, inclusive no [PNCP](/glossario/pncp). A partir daí a empresa pode ler, tirar dúvidas e pedir [impugnação](/glossario/impugnacao) até 3 dias úteis antes da abertura (art. 164).',
            'Apresentação de propostas e lances: a empresa cadastra a [proposta](/glossario/proposta) no sistema antes da sessão e, na [sessão pública](/glossario/sessao-publica), disputa com [lances](/glossario/lance).',
            'Julgamento: o pregoeiro confere se a proposta mais bem classificada atende ao edital e se o preço é aceitável.',
            'Habilitação: só então são conferidos os documentos de [habilitação](/glossario/habilitacao) do primeiro colocado.',
            'Recursal: quem discordar do resultado pode recorrer.',
            'Homologação: a autoridade superior confirma o resultado, faz a [adjudicação](/glossario/adjudicacao) do objeto e homologa a licitação (art. 71, IV).',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'A habilitação pode vir antes do julgamento, mas só se o edital previr e com ato motivado (art. 17, § 1º). Por isso é importante ler o edital: a ordem pode mudar.',
        },
      ],
    },
    {
      titulo: 'Prazos mínimos de divulgação',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Entre a divulgação do edital e a sessão, a lei fixa prazos mínimos para a empresa preparar a proposta (art. 55):',
        },
        {
          tipo: 'lista',
          itens: [
            'Compra de bens pelo menor preço ou maior desconto: 8 dias úteis (art. 55, I, a).',
            'Serviços comuns e obras e serviços comuns de engenharia pelo menor preço ou maior desconto: 10 dias úteis (art. 55, II, a).',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'São prazos mínimos: o órgão pode dar mais tempo. Se o edital mudar de um jeito que afete as propostas, ele deve ser divulgado de novo, com prazo novo (art. 55, § 1º). Com 8 dias úteis, uma empresa de EPI que só descobre o pregão na véspera tem pouco tempo para conferir amostras, preços e certidões. Achar o edital cedo faz diferença.',
        },
      ],
    },
    {
      titulo: 'Modos de disputa e como dar lances',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A lei prevê dois modos de disputa, que podem ser usados isolados ou juntos (art. 56). No modo aberto, as empresas dão lances públicos e sucessivos. No modo fechado, as propostas ficam em sigilo até a hora marcada. Com menor preço ou maior desconto, o modo fechado sozinho é proibido (art. 56, § 1º). Por isso o pregão usa o modo aberto ou a combinação de aberto e fechado.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Nas compras federais, a IN SEGES/ME nº 73/2022 detalha como cada modo funciona. Outros órgãos podem ter regras próprias, então confira o edital:',
        },
        {
          tipo: 'lista',
          itens: [
            'Aberto: a etapa de lances dura 10 minutos e é prorrogada por mais 2 minutos sempre que houver lance nos 2 minutos finais (IN 73, art. 23).',
            'Aberto e fechado: a etapa aberta dura 15 minutos; depois de um aviso, ela fecha num tempo aleatório de até 10 minutos. Aí quem tem a melhor oferta e quem está até 10% dela pode mandar um último lance fechado, em até 5 minutos (IN 73, art. 24).',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Alguns pontos valem para quase toda disputa. O edital pode fixar um intervalo mínimo entre lances (art. 57). A empresa pode dar lances intermediários, que não cobrem o melhor preço mas melhoram a sua posição, o que ajuda a ficar em segundo ou terceiro lugar (art. 56, § 3º). Se a diferença entre o primeiro e o segundo for de pelo menos 5%, a disputa aberta pode ser reiniciada para definir as demais colocações (art. 56, § 4º).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Microempresas e empresas de pequeno porte têm uma vantagem. No pregão, se o lance de uma [ME ou EPP](/glossario/me-epp) ficar até 5% acima do melhor preço de uma empresa maior, conta como empate, e a ME ou EPP pode cobrir a oferta em até 5 minutos depois do fim dos lances (Lei Complementar 123/2006, arts. 44, § 2º, e 45, § 3º).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Antes de entrar na sala, calcule o seu preço mínimo: custo do produto, frete, impostos, prazo de pagamento e margem. Um lance abaixo do que a empresa consegue entregar vira problema depois. Proposta com preço [inexequível](/glossario/inexequibilidade) pode ser desclassificada (art. 59, III).',
        },
      ],
    },
    {
      titulo: 'Depois dos lances: negociação, habilitação e recurso',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Definido o resultado, o pregoeiro pode negociar condições mais vantajosas com o primeiro colocado (art. 61). Se o primeiro for desclassificado porque o preço continuou acima do máximo aceito, a negociação pode seguir com os próximos, na ordem (art. 61, § 1º). Nas compras federais, o vencedor recebe prazo mínimo de 2 horas, prorrogável, para enviar a proposta ajustada ao último lance (IN 73, art. 29, § 2º).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Na habilitação, os documentos são pedidos apenas do vencedor, salvo quando a habilitação vem antes do julgamento (art. 63, II). A regularidade fiscal é sempre conferida depois do julgamento e só do mais bem classificado (art. 63, III). Se ele não for habilitado, o próximo é chamado. No governo federal, boa parte disso é conferida pelo [SICAF](/guias/sicaf).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Quem quiser recorrer do julgamento ou da habilitação precisa manifestar a intenção imediatamente, na sessão, sob pena de perder o direito (art. 165, § 1º, I). As razões do [recurso](/glossario/recurso-administrativo) vêm depois, no prazo de 3 dias úteis (art. 165, I). As demais empresas têm o mesmo prazo para contrarrazões (art. 165, § 4º).',
        },
      ],
    },
    {
      titulo: 'Onde encontrar pregões abertos',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O Edital Map reúne os editais abertos do PNCP num mapa. Em [/licitacoes/pregao-eletronico](/licitacoes/pregao-eletronico) estão os pregões eletrônicos abertos, e na [página inicial](/) você busca pelo que vende e filtra por estado ou cidade. Cada edital tem regras próprias: o mapa ajuda a achar, a leitura do edital continua sendo sua.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Se quiser receber os pregões novos do seu ramo por e-mail, os Alertas do plano Pro fazem isso. Veja em [/planos](/planos). Para começar do zero, leia o guia [como participar de licitação](/guias/como-participar-de-licitacao).',
        },
      ],
    },
  ],
  editais: ['/licitacoes/pregao-eletronico', '/licitacoes/epi', '/licitacoes/uniformes', '/licitacoes/limpeza'],
  perguntas: [
    {
      pergunta: 'Qual a diferença entre pregão e concorrência?',
      resposta:
        'O pregão é para bens e serviços comuns, julgados por menor preço ou maior desconto. A [concorrência](/glossario/concorrencia) serve para bens e serviços especiais e para obras e serviços de engenharia, e admite outros critérios, como técnica e preço (art. 6º, XXXVIII e XLI).',
    },
    {
      pergunta: 'Quanto tempo dura a disputa de lances?',
      resposta:
        'Depende das regras do órgão. Nas compras federais, o modo aberto tem 10 minutos com prorrogações de 2 minutos, e o modo aberto e fechado tem 15 minutos mais um encerramento aleatório de até 10 minutos. O edital informa o modo usado.',
    },
    {
      pergunta: 'Preciso enviar todos os documentos antes da sessão?',
      resposta:
        'Em regra, os documentos de habilitação são pedidos só do vencedor, depois do julgamento (art. 63, II). Mas o edital pode prever outra ordem ou pedir documentos junto com a proposta, então leia o edital antes.',
    },
    {
      pergunta: 'Posso desistir de um lance dado?',
      resposta:
        'O lance é um compromisso com a oferta. Não manter a proposta, salvo por fato superveniente justificado, é infração prevista na lei e pode gerar sanções como multa e impedimento de licitar (arts. 155, V, e 156). Por isso calcule o preço mínimo antes da sessão.',
    },
    {
      pergunta: 'ME e EPP têm alguma vantagem no pregão?',
      resposta:
        'Sim. No pregão, a proposta de ME ou EPP até 5% acima da melhor oferta de empresa maior conta como empate, e ela pode cobrir o preço em até 5 minutos (Lei Complementar 123/2006, arts. 44 e 45). O edital também pode reservar itens para ME e EPP.',
    },
  ],
  fontes: [
    { nome: 'Lei nº 14.133/2021 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm' },
    {
      nome: 'Instrução Normativa SEGES/ME nº 73/2022 (Portal de Compras do Governo Federal)',
      url: 'https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-me-no-73-de-30-de-setembro-de-2022',
    },
    { nome: 'Lei Complementar nº 123/2006 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm' },
  ],
  relacionados: ['sicaf', 'como-participar-de-licitacao', 'documentos-para-licitacao', 'dispensa-de-licitacao', 'modalidades-de-licitacao'],
};
