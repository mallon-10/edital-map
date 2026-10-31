import type { Guia } from '../tipos';
import { DECRETO_VALORES, VALORES } from '../valores';

export const guia: Guia = {
  slug: 'o-que-e-licitacao',
  titulo: 'O que é licitação e quais são as modalidades',
  descricao:
    'O que é licitação, as cinco modalidades da Lei 14.133 (pregão, concorrência, concurso, leilão e diálogo competitivo), os critérios de julgamento e a dispensa.',
  resposta:
    'Licitação é o processo público que o governo usa para escolher quem vai vender um produto, prestar um serviço ou fazer uma obra, comparando propostas com regras iguais para todos. A Lei 14.133/2021 tem cinco modalidades: pregão, concorrência, concurso, leilão e diálogo competitivo. Em casos previstos na lei, a contratação pode ser direta.',
  revisadoEm: '2026-10-31',
  secoes: [
    {
      titulo: 'O que é licitação',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Uma empresa privada compra de quem quiser. O governo não: ele usa dinheiro público e, por isso, precisa abrir a disputa para qualquer interessado que cumpra as regras. Essa disputa é a licitação. Ela começa com um [edital](/glossario/edital), que descreve o que será comprado, como as propostas serão julgadas e quais documentos o vencedor deve entregar.',
        },
        {
          tipo: 'paragrafo',
          texto: 'A Lei 14.133/2021 diz que a licitação tem quatro objetivos (art. 11):',
        },
        {
          tipo: 'lista',
          itens: [
            'escolher a proposta com o resultado mais vantajoso para a Administração, considerando inclusive o ciclo de vida do objeto;',
            'tratar todos os [licitantes](/glossario/licitante) de forma igual, com competição justa;',
            'evitar [sobrepreço](/glossario/sobrepreco), preços inexequíveis e [superfaturamento](/glossario/superfaturamento);',
            'incentivar a inovação e o desenvolvimento nacional sustentável.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Essa lei, chamada de [Nova Lei de Licitações](/guias/nova-lei-de-licitacoes), substituiu a antiga Lei 8.666/1993. Ela vale para União, estados, Distrito Federal e municípios.',
        },
      ],
    },
    {
      titulo: 'As cinco modalidades de licitação',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Modalidade é o tipo de procedimento. A lei lista cinco (art. 28) e proíbe criar outras ou combiná-las (art. 28, § 2º). Convite e tomada de preços, que existiam na lei antiga, não fazem parte da Lei 14.133.',
        },
        {
          tipo: 'lista',
          itens: [
            '[Pregão](/glossario/pregao): obrigatório para comprar bens e serviços comuns, aqueles que o edital consegue descrever com especificações usuais de mercado (art. 6º, XIII e XLI). O julgamento é por menor preço ou maior desconto. É a modalidade mais comum para quem vende produtos, como EPI, uniformes ou material de limpeza. Veja o guia do [pregão eletrônico](/guias/pregao-eletronico).',
            '[Concorrência](/glossario/concorrencia): para bens e serviços especiais e para obras e serviços de engenharia, comuns ou especiais (art. 6º, XXXVIII). Aceita mais critérios de julgamento, como técnica e preço.',
            '[Concurso](/glossario/concurso): para escolher um trabalho técnico, científico ou artístico, com prêmio ou remuneração ao vencedor (art. 6º, XXXIX).',
            '[Leilão](/glossario/leilao): para o governo vender imóveis ou bens móveis inservíveis ou apreendidos a quem oferecer o maior lance (art. 6º, XL).',
            '[Diálogo competitivo](/glossario/dialogo-competitivo): para contratações inovadoras, quando o órgão não consegue definir sozinho a solução. Ele conversa com licitantes pré-selecionados e depois pede a proposta final (art. 6º, XLII, e art. 32).',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Pregão e concorrência seguem o mesmo rito (art. 29). As fases, em ordem, são: preparatória, divulgação do edital, propostas e lances, julgamento, [habilitação](/glossario/habilitacao), recursos e [homologação](/glossario/homologacao) (art. 17). A licitação é feita preferencialmente na forma eletrônica (art. 17, § 2º).',
        },
      ],
    },
    {
      titulo: 'Critérios de julgamento (os "tipos" de licitação)',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Muita gente chama de "tipo de licitação" o critério usado para escolher o vencedor. A lei prevê seis (art. 33):',
        },
        {
          tipo: 'lista',
          itens: [
            '[Menor preço](/glossario/menor-preco): vence a proposta mais barata que atende ao edital. É o mais usado.',
            '[Maior desconto](/glossario/maior-desconto): vence quem dá o maior desconto sobre um preço de referência do edital (art. 34, § 2º).',
            'Melhor técnica ou conteúdo artístico: conta só a qualidade técnica ou artística, com prêmio definido no edital (art. 35).',
            '[Técnica e preço](/glossario/tecnica-e-preco): soma notas de técnica e de preço, com pesos definidos no edital (art. 36).',
            'Maior lance: usado no leilão.',
            'Maior retorno econômico: usado em contratos de eficiência, em que a empresa é paga conforme a economia que gera (art. 39).',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Mesmo no menor preço, a qualidade importa. A proposta precisa cumprir as especificações e os parâmetros mínimos de qualidade do edital (art. 34). Proposta fora das especificações ou com preço inexequível é desclassificada (art. 59).',
        },
      ],
    },
    {
      titulo: 'Contratação direta: dispensa e inexigibilidade',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Em alguns casos o governo pode contratar sem licitação. Isso se chama contratação direta e precisa de um processo com justificativa de preço e razão da escolha do fornecedor (art. 72).',
        },
        {
          tipo: 'lista',
          itens: [
            `[Dispensa de licitação](/guias/dispensa-de-licitacao): a disputa seria possível, mas a lei permite dispensar. O caso mais comum é o de valor baixo: em 2026, compras e serviços abaixo de ${VALORES.dispensaCompras} e obras e serviços de engenharia abaixo de ${VALORES.dispensaObras} (art. 75, I e II; ${DECRETO_VALORES.nome}). Há ainda casos como emergência e licitação sem interessados.`,
            'Na [dispensa eletrônica](/glossario/dispensa-eletronica), o órgão publica um aviso por pelo menos 3 dias úteis e recebe propostas de qualquer interessado (art. 75, § 3º). É uma boa porta de entrada para empresas pequenas.',
            '[Inexigibilidade](/guias/inexigibilidade-de-licitacao): a competição é inviável, por exemplo quando só um fornecedor exclusivo pode atender ou quando se contrata um artista consagrado (art. 74).',
          ],
        },
      ],
    },
    {
      titulo: 'Procedimentos auxiliares',
      blocos: [
        {
          tipo: 'paragrafo',
          texto: 'Além das modalidades, a lei prevê cinco procedimentos auxiliares (art. 78):',
        },
        {
          tipo: 'lista',
          itens: [
            '[Credenciamento](/glossario/credenciamento): o órgão chama todos os interessados que cumprirem os requisitos, e vários podem ser contratados em condições padronizadas (art. 6º, XLIII, e art. 79).',
            'Pré-qualificação: análise prévia da habilitação dos interessados ou do produto, antes da licitação (art. 6º, XLIV).',
            'Procedimento de manifestação de interesse: o órgão pede à iniciativa privada estudos e projetos para uma futura contratação (art. 81).',
            '[Sistema de registro de preços](/glossario/sistema-de-registro-de-precos): o órgão registra preços numa [ata de registro de preços](/guias/ata-de-registro-de-precos) e compra aos poucos, conforme a necessidade (art. 6º, XLV).',
            'Registro cadastral: cadastro de fornecedores, como o [SICAF](/guias/sicaf) no governo federal.',
          ],
        },
      ],
    },
    {
      titulo: 'Onde ver licitações abertas',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Todo edital deve ser publicado no [PNCP](/guias/pncp), o Portal Nacional de Contratações Públicas (art. 54). No [Edital Map](/) você vê esses editais abertos no mapa, por modalidade, assunto e cidade. Para começar a disputar, siga o guia de [como participar de licitação](/guias/como-participar-de-licitacao). E, se quiser receber por e-mail os editais novos do seu ramo, os Alertas estão no plano [Pro](/planos). Cada edital tem regras próprias: leia sempre o documento oficial.',
        },
      ],
    },
  ],
  editais: ['/licitacoes/pregao-eletronico', '/licitacoes/concorrencia', '/licitacoes/dispensa', '/licitacoes/credenciamento'],
  perguntas: [
    {
      pergunta: 'Qual é a modalidade de licitação mais comum?',
      resposta:
        'O pregão, porque é obrigatório para bens e serviços comuns, que são a maior parte das compras públicas. Quase sempre ele é feito na forma eletrônica, pela internet.',
    },
    {
      pergunta: 'Tomada de preços e convite ainda existem?',
      resposta:
        'Não na Lei 14.133. Elas eram modalidades da Lei 8.666/1993, revogada em 30 de dezembro de 2023. Hoje as modalidades são pregão, concorrência, concurso, leilão e diálogo competitivo.',
    },
    {
      pergunta: 'Qual a diferença entre modalidade e critério de julgamento?',
      resposta:
        'A modalidade é o procedimento da disputa, como pregão ou concorrência. O critério de julgamento é a regra que define o vencedor, como menor preço ou técnica e preço. O edital informa os dois.',
    },
    {
      pergunta: 'Dispensa de licitação é uma modalidade?',
      resposta:
        'Não. A dispensa é uma forma de contratação direta, sem licitação, permitida em casos listados no art. 75 da Lei 14.133. Mesmo assim, o órgão precisa justificar o preço e a escolha do fornecedor.',
    },
  ],
  fontes: [
    { nome: 'Lei nº 14.133/2021 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm' },
    DECRETO_VALORES.fonte,
    { nome: 'Nova Lei de Licitações (Portal de Compras do Governo Federal)', url: 'https://www.gov.br/compras/pt-br/nllc' },
    { nome: 'Portal Nacional de Contratações Públicas (gov.br)', url: 'https://www.gov.br/pncp/pt-br' },
  ],
  relacionados: ['como-participar-de-licitacao', 'pregao-eletronico', 'dispensa-de-licitacao', 'nova-lei-de-licitacoes', 'modalidades-de-licitacao'],
};
