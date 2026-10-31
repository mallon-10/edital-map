import type { Guia } from '../tipos';
import { VALORES } from '../valores';

export const guia: Guia = {
  slug: 'como-participar-de-licitacao',
  titulo: 'Como participar de licitação: passo a passo para empresas',
  descricao:
    'Passo a passo para a empresa vender ao governo: documentos, cadastro, onde achar editais, proposta, disputa, habilitação, contrato e pagamento.',
  resposta:
    'Para participar de licitação, a empresa precisa estar regular (CNPJ e certidões em dia), se cadastrar na plataforma onde o órgão faz a disputa, encontrar editais do seu ramo, ler o edital inteiro, enviar a proposta no prazo, disputar os lances e, se vencer, apresentar os documentos de habilitação e assinar o contrato.',
  revisadoEm: '2026-10-31',
  secoes: [
    {
      titulo: 'Quem pode vender para o governo',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Qualquer empresa regular pode ser [licitante](/glossario/licitante), inclusive microempresa, MEI e empresa de pequeno porte. Prefeituras, estados, a União, hospitais, universidades e autarquias compram todo dia: material de limpeza, merenda, uniformes, EPI, informática, obras e serviços. Se você ainda não sabe o que é uma [licitação](/guias/o-que-e-licitacao), comece por esse guia.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'As regras gerais estão na [Lei 14.133/2021](/guias/nova-lei-de-licitacoes), que vale para todos os órgãos do país. Mas cada [edital](/glossario/edital) traz as regras próprias daquela compra: o que pedir, como disputar e quais documentos entregar. Por isso o edital é sempre o documento que manda.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Pequenas empresas têm tratamento favorecido. A Lei 14.133 aplica os arts. 42 a 49 da Lei Complementar 123/2006 (art. 4º). Na prática, a [ME e a EPP](/glossario/me-epp) podem ter preferência no desempate, itens exclusivos ou [cota reservada](/glossario/cota-reservada) e prazo extra para acertar certidões. Cada edital diz quais desses benefícios valem naquela compra; o guia [ME, EPP e MEI em licitações](/guias/me-epp-e-mei) explica cada um.',
        },
      ],
    },
    {
      titulo: 'Passo a passo para participar',
      blocos: [
        {
          tipo: 'passos',
          itens: [
            'Deixe a empresa regular. Confira se o CNAE do CNPJ combina com o que você quer vender e tire as certidões: Receita Federal, FGTS, Justiça do Trabalho ([CNDT](/glossario/cndt)), estado e município. O guia de [documentos para licitação](/guias/documentos-para-licitacao) mostra a lista completa.',
            'Cadastre a empresa nas plataformas. O governo federal usa o [Compras.gov.br](/guias/compras-gov-br) e o [SICAF](/guias/sicaf). Estados e prefeituras podem usar sistemas próprios ou privados, desde que ligados ao PNCP (art. 175, § 1º). O edital informa em qual plataforma será a disputa.',
            'Encontre editais do seu ramo. Os órgãos publicam o edital e os anexos no [PNCP](/guias/pncp), o portal nacional (art. 54). No [Edital Map](/) você vê no mapa os editais abertos perto de você, filtrados por assunto, cidade ou valor.',
            'Leia o edital inteiro. Veja o objeto, o [termo de referência](/glossario/termo-de-referencia), o prazo de entrega, o local, a forma de pagamento e os documentos de [habilitação](/glossario/habilitacao). Se achar uma exigência irregular, o prazo para [impugnação](/glossario/impugnacao) vai até 3 dias úteis antes da abertura (art. 164).',
            'Monte a [proposta](/glossario/proposta). Calcule custo, impostos, frete e margem (veja [como montar a proposta de preços](/guias/proposta-de-precos)). Proposta com preço inexequível ou acima do orçamento estimado pode ser desclassificada (art. 59, III).',
            'Participe da [sessão pública](/glossario/sessao-publica). Na maioria das compras de bens comuns a disputa é um [pregão eletrônico](/guias/pregao-eletronico), com [lances](/glossario/lance) em tempo real conduzidos pelo [pregoeiro](/glossario/pregoeiro).',
            'Entregue a habilitação, se for chamado. Em regra, só o vencedor apresenta os documentos de habilitação (art. 63, II), e a regularidade fiscal é conferida depois do julgamento das propostas (art. 63, III).',
            'Acompanhe o resultado. Quem discorda do julgamento pode apresentar [recurso](/glossario/recurso-administrativo) em 3 dias úteis (art. 165, I); o guia de [impugnação e recurso](/guias/impugnacao-e-recurso) mostra os prazos e como escrever. Depois vêm a [adjudicação](/glossario/adjudicacao) e a [homologação](/glossario/homologacao).',
            'Assine o contrato ou a ata e entregue. O órgão emite o [empenho](/guias/empenho), você entrega o produto ou presta o serviço, emite a nota fiscal e recebe depois da liquidação.',
          ],
        },
      ],
    },
    {
      titulo: 'Exemplo: uma confecção vendendo uniformes para a prefeitura',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Imagine uma confecção pequena em Minas Gerais. Ela abre a página de [editais de uniformes em MG](/licitacoes/uniformes/mg) e acha um pregão eletrônico de uma prefeitura para camisetas e calças da guarda municipal. O edital pede amostra, prazo de entrega de 30 dias e atestado de que a empresa já forneceu algo parecido.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Antes da sessão, a confecção confere se o cadastro na plataforma está ativo, calcula o preço por peça e separa o [atestado de capacidade técnica](/guias/atestado-de-capacidade-tecnica) de um cliente anterior. Na disputa, ela dá lances até o limite do seu custo. Se ficar em primeiro, envia os documentos e a amostra no prazo do edital. Se for ME ou EPP e ficar até 5% acima do melhor preço no pregão, pode ter a chance de cobrir a oferta (LC 123, art. 44, § 2º, e art. 45).',
        },
      ],
    },
    {
      titulo: 'Licitações de prefeituras: o que observar',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            'A lei prefere a forma eletrônica (art. 17, § 2º), mas municípios com até 20 mil habitantes tiveram 6 anos, contados de abril de 2021, para adotar o eletrônico e a divulgação em sítio oficial (art. 176). Por isso ainda existe [pregão presencial](/licitacoes/pregao-presencial) em cidades pequenas.',
            'Cada prefeitura escolhe sua plataforma. Guarde login e senha de cada uma e confira o horário da sessão no edital. O guia [como vender para prefeitura](/guias/licitacao-de-prefeitura) traz o passo a passo das compras municipais.',
            'Compras pequenas podem sair sem licitação. A [dispensa de licitação](/guias/dispensa-de-licitacao) por valor vale para compras e serviços abaixo de ' +
              `${VALORES.dispensaCompras} e para obras e serviços de engenharia abaixo de ${VALORES.dispensaObras} em 2026 (art. 75, I e II).`,
            'Algumas contratações não têm disputa porque só há um fornecedor possível. Esse é o caso da [inexigibilidade de licitação](/guias/inexigibilidade-de-licitacao) (art. 74).',
            'Muitas prefeituras compram por [ata de registro de preços](/guias/ata-de-registro-de-precos): você registra o preço e entrega aos poucos, quando o órgão pedir, sem garantia de que toda a quantidade será comprada.',
          ],
        },
      ],
    },
    {
      titulo: 'Erros comuns de quem está começando',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            'Deixar certidão vencer. Ela precisa estar válida na data em que for conferida.',
            'Ler só o resumo. Uma exigência escondida no termo de referência, como amostra ou marca mínima, pode desclassificar a proposta.',
            'Dar lance abaixo do custo para vencer. Se você vencer e não entregar, pode sofrer sanções como multa e impedimento de licitar e contratar (art. 156).',
            'Perder prazos. Envio de documentos, recurso e amostra têm prazos curtos, contados em horas ou em dias úteis.',
            'Esquecer o fluxo de caixa. O governo paga depois da entrega e da liquidação, seguindo a ordem cronológica de pagamentos (art. 141).',
          ],
        },
      ],
    },
    {
      titulo: 'Quais guias ler em cada etapa?',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            'Sou MEI: veja o [Contrata Mais Brasil](/guias/contrata-mais-brasil), o programa federal de pequenas contratações.',
            'Quero achar compras: comece por [onde encontrar licitações](/guias/onde-encontrar-licitacoes) e, para saber o que vem pela frente, pelo [plano de contratações anual](/guias/plano-de-contratacoes-anual). O [panorama](/panorama) mostra quantos editais estão abertos por estado e modalidade.',
            'Não sei que tipo de compra é: leia [modalidades de licitação](/guias/modalidades-de-licitacao).',
            'O edital cita um sistema que não conheço: veja [plataformas de licitação](/guias/plataformas-de-licitacao).',
            'Preciso formar o preço: consulte [quanto o governo pagou](/guias/painel-de-precos) e entenda o [preço inexequível](/guias/preco-inexequivel).',
            'Vou subcontratar ou formar consórcio: consulte o [CEIS e o CNEP](/guias/ceis-e-cnep) antes.',
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
            'O Edital Map reúne os editais abertos publicados no PNCP. No [mapa](/) você filtra por assunto, estado, cidade e valor e abre o edital oficial. Se preferir receber os editais novos do seu ramo por e-mail, os Alertas fazem parte do plano [Pro](/planos). As regras de cada compra estão sempre no edital oficial.',
        },
      ],
    },
  ],
  editais: ['/licitacoes', '/licitacoes/pregao-eletronico', '/licitacoes/uniformes', '/licitacoes/epi'],
  perguntas: [
    {
      pergunta: 'MEI pode participar de licitação?',
      resposta:
        'Pode. O MEI tem CNPJ e é uma modalidade de microempresa (Lei Complementar 123, art. 18-E, § 3º), com os mesmos benefícios das compras públicas. Ele precisa cumprir as exigências do edital, como certidões e, quando pedido, atestado de capacidade técnica.',
    },
    {
      pergunta: 'Preciso de SICAF para vender para prefeitura?',
      resposta:
        'Nem sempre. O SICAF é o cadastro do governo federal, e muitas prefeituras usam outras plataformas e cadastros. O edital informa onde a disputa acontece e quais cadastros são aceitos.',
    },
    {
      pergunta: 'Quanto custa participar de uma licitação?',
      resposta:
        'Ler o edital no PNCP e se cadastrar no Compras.gov.br não tem custo. Algumas plataformas privadas usadas por prefeituras cobram do fornecedor. Também pode haver custo com certidões, amostras, garantia contratual e certificado digital, conforme o edital.',
    },
    {
      pergunta: 'Onde encontro licitações abertas?',
      resposta:
        'Todos os órgãos devem divulgar seus editais no PNCP (art. 54 da Lei 14.133). No Edital Map você vê esses editais abertos num mapa, com filtros por assunto, cidade e valor.',
    },
    {
      pergunta: 'Ganhei a licitação. Quando recebo?',
      resposta:
        'Depois de entregar, o órgão confere a entrega e liquida a despesa, e então paga. O prazo de pagamento vem no edital e no contrato. O guia de empenho explica cada etapa.',
    },
  ],
  fontes: [
    { nome: 'Lei nº 14.133/2021 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm' },
    { nome: 'Lei Complementar nº 123/2006 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm' },
    { nome: 'Portal Nacional de Contratações Públicas (gov.br)', url: 'https://www.gov.br/pncp/pt-br' },
    { nome: 'Portal de Compras do Governo Federal (gov.br)', url: 'https://www.gov.br/compras/pt-br' },
  ],
  relacionados: ['o-que-e-licitacao', 'documentos-para-licitacao', 'pregao-eletronico', 'sicaf', 'onde-encontrar-licitacoes', 'contrata-mais-brasil'],
};
