import type { Guia } from '../tipos';
import { DECRETO_VALORES, VALORES } from '../valores';

export const guia: Guia = {
  slug: 'modalidades-de-licitacao',
  titulo: 'Modalidades de licitação: quais são as 5 da Lei 14.133',
  descricao:
    'Modalidades de licitação da Lei 14.133: pregão, concorrência, concurso, leilão e diálogo competitivo. Compare cada uma e veja o que muda para a pequena empresa.',
  resposta:
    'As modalidades de licitação da Lei 14.133/2021 são cinco: pregão, concorrência, concurso, leilão e diálogo competitivo (art. 28). Tomada de preços e convite acabaram. Para bens e serviços comuns, o pregão é obrigatório. Dispensa, inexigibilidade e credenciamento não são modalidades, e o critério de julgamento é outra escolha do edital.',
  revisadoEm: '2026-10-31',
  secoes: [
    {
      titulo: 'Quais são as modalidades de licitação?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Modalidade é o procedimento que o órgão segue para escolher com quem vai contratar. A Lei 14.133/2021 lista cinco: [pregão](/glossario/pregao), [concorrência](/glossario/concorrencia), [concurso](/glossario/concurso), [leilão](/glossario/leilao) e [diálogo competitivo](/glossario/dialogo-competitivo) (art. 28). A mesma lei proíbe criar outras ou combinar as existentes (art. 28, § 2º).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Na lei, cada modalidade é definida pelo que se contrata, não pelo valor. Uma licitação de luvas de R$ 200 mil ou de R$ 2 milhões continua sendo pregão, porque luva é bem comum. A visão geral está no guia [o que é licitação](/guias/o-que-e-licitacao).',
        },
      ],
    },
    {
      titulo: 'Comparativo das cinco modalidades',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A lei não traz um quadro pronto. Este resumo reúne os arts. 6º e 28 a 32 e mostra o impacto para a pequena empresa.',
        },
        {
          tipo: 'lista',
          itens: [
            'Pregão. Para que serve: comprar bens e serviços comuns, descritos com especificações usuais de mercado (art. 6º, XIII e XLI). Quem usa: todo órgão que compra esse tipo de item, porque nesses casos ele é obrigatório. Critério: menor preço ou maior desconto. Impacto: prazo mínimo curto, de 8 dias úteis para bens e 10 para serviços comuns (art. 55). A disputa é por preço, então o custo precisa estar calculado antes dos lances. [ME e EPP](/guias/me-epp-e-mei) têm tratamento favorecido (art. 4º).',
            'Concorrência. Para que serve: bens e serviços especiais e obras e serviços de engenharia, comuns ou especiais (art. 6º, XXXVIII). Quem usa: órgãos que contratam obras, engenharia ou itens complexos demais para especificações usuais (art. 6º, XIV). Critério: menor preço, maior desconto, melhor técnica ou conteúdo artístico, técnica e preço ou maior retorno econômico. Impacto: pede mais preparo. Com técnica e preço, o prazo mínimo é de 35 dias úteis (art. 55, IV) e a proposta técnica pode valer até 70% da nota (art. 36, § 2º).',
            'Concurso. Para que serve: escolher um trabalho técnico, científico ou artístico, com prêmio ou remuneração ao vencedor (art. 6º, XXXIX). Quem usa: órgãos que buscam um projeto ou uma criação. Critério: melhor técnica ou conteúdo artístico. Impacto: interessa a escritórios e profissionais, não a quem vende produto. Em concursos de projeto, o vencedor cede ao órgão os direitos patrimoniais (art. 30, parágrafo único).',
            'Leilão. Para que serve: o governo vender imóveis e bens móveis inservíveis ou legalmente apreendidos (art. 6º, XL). Quem usa: órgãos que vendem esses bens, com leiloeiro oficial ou servidor designado (art. 31). Critério: maior lance. Impacto: aqui a empresa compra em vez de vender. Não há registro cadastral prévio nem fase de habilitação (art. 31, § 4º), e o prazo mínimo é de 15 dias úteis (art. 55, III).',
            'Diálogo competitivo. Para que serve: contratações inovadoras, em que o órgão não consegue definir a solução sozinho (art. 6º, XLII, e art. 32). Quem usa: órgãos com projetos complexos. Critério: fixado no início da fase competitiva (art. 32, § 1º, X). Impacto: pede tempo e equipe, porque o processo tem três fases e prazos longos.',
          ],
        },
      ],
    },
    {
      titulo: 'O que é diálogo competitivo e como funciona?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'É a modalidade em que o órgão conversa com empresas pré-selecionadas antes de pedir as propostas finais. Ela é restrita a dois casos (art. 32). O primeiro é o objeto com inovação tecnológica ou técnica, que exige adaptar soluções do mercado e não pode ser especificado com precisão. O segundo é a necessidade de definir os meios e alternativas, como a solução técnica ou a estrutura jurídica ou financeira do contrato.',
        },
        {
          tipo: 'passos',
          itens: [
            'Pré-seleção: o edital apresenta a necessidade e dá no mínimo 25 dias úteis para manifestar interesse. Entram todos que cumprem os critérios objetivos (art. 32, § 1º, I e II).',
            'Diálogo: as reuniões são registradas em ata e gravadas em áudio e vídeo. O órgão não pode revelar a outros a solução de um licitante sem o consentimento dele (art. 32, § 1º, IV e VI).',
            'Fase competitiva: sai um novo edital com a solução escolhida, e os pré-selecionados têm no mínimo 60 dias úteis para a proposta final (art. 32, § 1º, VIII).',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Quem conduz é uma [comissão de contratação](/glossario/comissao-de-contratacao) com pelo menos 3 servidores efetivos ou empregados públicos (art. 32, § 1º, XI). No governo federal, o detalhe está na Instrução Normativa Seges/MGI 512/2025, e o Portal de Compras previu a condução pelo Compras.gov.br a partir de abril de 2026. As normas federais admitem, na fase competitiva, menor preço ou maior desconto (IN 73/2022, art. 4º), técnica e preço (IN 2/2023, art. 4º) e maior retorno econômico (IN 96/2022, art. 4º).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Para uma empresa pequena com solução inovadora, uma saída é entrar em [consórcio](/glossario/consorcio), salvo vedação justificada (art. 15).',
        },
      ],
    },
    {
      titulo: 'Qual a diferença entre pregão e concorrência?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'As duas seguem o mesmo rito do art. 17 (art. 29). Por isso, a rotina de quem disputa é parecida: proposta, lances, julgamento, [habilitação](/glossario/habilitacao) e recursos. As diferenças são estas:',
        },
        {
          tipo: 'lista',
          itens: [
            'Objeto: o pregão é para bens e serviços comuns. A concorrência é para bens e serviços especiais e para obras e serviços de engenharia.',
            'Engenharia: o pregão não se aplica a obras nem a serviços de engenharia, exceto o serviço comum de engenharia. Também não vale para serviços técnicos especializados de natureza predominantemente intelectual (art. 29, parágrafo único).',
            'Critério: no pregão, só menor preço ou maior desconto. Na concorrência, há cinco opções (art. 6º, XXXVIII).',
            'Prazo mínimo: no pregão, 8 ou 10 dias úteis. Na concorrência, depende do objeto, do critério e do regime de execução, e pode chegar a 60 dias úteis (art. 55).',
            'Quem conduz: no pregão, o [pregoeiro](/glossario/pregoeiro) (art. 8º, § 5º). Na concorrência, o [agente de contratação](/glossario/agente-de-contratacao) ou, em bens e serviços especiais, uma comissão (art. 8º, § 2º).',
            'Lances: com técnica e preço, o modo aberto é proibido (art. 56, § 2º).',
          ],
        },
      ],
    },
    {
      titulo: 'Modalidade, tipo e critério de julgamento são a mesma coisa?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Não. O que muita gente chama de "tipos de licitação" são os critérios de julgamento, a regra que define o vencedor. A lei prevê seis (art. 33): [menor preço](/glossario/menor-preco), [maior desconto](/glossario/maior-desconto), melhor técnica ou conteúdo artístico, [técnica e preço](/glossario/tecnica-e-preco), maior lance e maior retorno econômico.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Um edital combina quatro escolhas:',
        },
        {
          tipo: 'lista',
          itens: [
            'Modalidade: o procedimento (art. 28). Exemplo: pregão.',
            'Forma: eletrônica ou, se motivada, presencial (art. 17, § 2º).',
            'Critério de julgamento: a regra do vencedor (art. 33). Exemplo: menor preço.',
            'Modo de disputa: aberto, fechado ou os dois juntos (art. 56). Com menor preço ou maior desconto, o modo fechado sozinho é proibido (art. 56, § 1º).',
          ],
        },
      ],
    },
    {
      titulo: 'O que aconteceu com tomada de preços e convite?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Acabaram. Eram modalidades da Lei 8.666/1993, revogada em 30 de dezembro de 2023 (art. 193, II, com a redação da Lei Complementar 198/2023). A [Nova Lei de Licitações](/guias/nova-lei-de-licitacoes) não as repetiu. Contratos assinados antes de a nova lei entrar em vigor seguem a legislação revogada (art. 190).',
        },
      ],
    },
    {
      titulo: 'Dispensa, inexigibilidade e credenciamento são modalidades?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Não. Elas aparecem no mesmo campo de modalidade do [PNCP](/guias/pncp), o que confunde. Na lei, porém, o art. 28 só lista as cinco.',
        },
        {
          tipo: 'lista',
          itens: [
            `[Dispensa de licitação](/guias/dispensa-de-licitacao): contratação direta nos casos do art. 75. Em 2026, pelo valor, abaixo de ${VALORES.dispensaCompras} para compras e serviços e de ${VALORES.dispensaObras} para obras, engenharia e manutenção de veículos (${DECRETO_VALORES.nome}).`,
            '[Inexigibilidade](/guias/inexigibilidade-de-licitacao): contratação direta quando a competição é inviável (art. 74).',
            '[Credenciamento](/glossario/credenciamento): procedimento auxiliar (art. 78, I). A lei o usa em contratações simultâneas, seleção por terceiros, mercados fluidos e, desde a Lei 15.266/2025, comércio eletrônico (art. 79). Ele também aparece entre os casos de inexigibilidade (art. 74, IV). Nas contratações simultâneas e na seleção por terceiros, o edital define o valor (art. 79, § 1º, III).',
          ],
        },
      ],
    },
    {
      titulo: 'Em quais modalidades a pequena empresa deve focar?',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            'Vende produtos ou serviços comuns: pregão e dispensa. Veja o guia do [pregão eletrônico](/guias/pregao-eletronico).',
            'Faz obras ou engenharia: concorrência e dispensa.',
            'Tem fornecimento exclusivo: inexigibilidade, com prova da exclusividade.',
            'Presta serviço em condições padronizadas, ao lado de outros fornecedores: credenciamento.',
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
            'O [Edital Map](/) mostra de graça, em busca e mapa, os editais abertos do PNCP, atualizados a cada 3 horas. O site cobre pregão, concorrência, dispensa e credenciamento: veja [pregões eletrônicos](/licitacoes/pregao-eletronico), [concorrências](/licitacoes/concorrencia), [dispensas](/licitacoes/dispensa) e [credenciamentos](/licitacoes/credenciamento). Concurso, leilão e diálogo competitivo não estão no site.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Os Alertas por e-mail são do plano Pro ([/planos](/planos)). Cada edital tem regras próprias: leia sempre o documento oficial.',
        },
      ],
    },
  ],
  editais: ['/licitacoes/pregao-eletronico', '/licitacoes/concorrencia', '/licitacoes/dispensa', '/licitacoes/credenciamento'],
  perguntas: [
    {
      pergunta: 'Quais são as modalidades de licitação na Lei 14.133?',
      resposta: 'São cinco: pregão, concorrência, concurso, leilão e diálogo competitivo (art. 28). A lei proíbe criar outras ou combiná-las (art. 28, § 2º).',
    },
    {
      pergunta: 'Quais são os tipos de licitação?',
      resposta:
        'O que se chama de tipo é o critério de julgamento. São seis: menor preço, maior desconto, melhor técnica ou conteúdo artístico, técnica e preço, maior lance e maior retorno econômico (art. 33).',
    },
    {
      pergunta: 'O que é diálogo competitivo?',
      resposta:
        'É a modalidade para contratações inovadoras. O órgão conversa com empresas pré-selecionadas para desenvolver a solução e só depois pede as propostas finais (art. 6º, XLII, e art. 32).',
    },
    {
      pergunta: 'Qual a diferença entre pregão e concorrência?',
      resposta:
        'O rito é o mesmo (art. 29). O pregão é para bens e serviços comuns, por menor preço ou maior desconto. A concorrência é para itens especiais, obras e engenharia, e aceita cinco critérios.',
    },
    {
      pergunta: 'Tomada de preços ainda existe?',
      resposta:
        'Não. Tomada de preços e convite eram da Lei 8.666/1993, revogada em 30 de dezembro de 2023. A Lei 14.133 não tem essas modalidades.',
    },
    {
      pergunta: 'Dispensa de licitação é uma modalidade?',
      resposta:
        'Não. Dispensa e inexigibilidade são contratação direta, e o credenciamento é procedimento auxiliar. Só as cinco do art. 28 são modalidades.',
    },
  ],
  fontes: [
    { nome: 'Lei nº 14.133/2021 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm' },
    DECRETO_VALORES.fonte,
    { nome: 'Diálogo competitivo (Manual de Licitações e Contratos do TCU)', url: 'https://licitacoesecontratos.tcu.gov.br/3-6-5-dialogo-competitivo-2/' },
    {
      nome: 'Instrução Normativa Seges/MGI nº 512/2025 (Portal de Compras do Governo Federal)',
      url: 'https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-mgi-no-512-de-3-de-dezembro-de-2025',
    },
    {
      nome: 'Ministério da Gestão regulamenta licitação por diálogo competitivo (Portal de Compras do Governo Federal)',
      url: 'https://www.gov.br/compras/pt-br/acesso-a-informacao/noticias/ministerio-da-gestao-regulamenta-licitacao-por-dialogo-competitivo-e-amplia-ferramentas-que-estimulam-a-inovacao-em-contratacoes-publicas',
    },
    {
      nome: 'Instrução Normativa SEGES/ME nº 73/2022 (Portal de Compras do Governo Federal)',
      url: 'https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-me-no-73-de-30-de-setembro-de-2022',
    },
  ],
  relacionados: ['o-que-e-licitacao', 'pregao-eletronico', 'dispensa-de-licitacao', 'nova-lei-de-licitacoes'],
};
