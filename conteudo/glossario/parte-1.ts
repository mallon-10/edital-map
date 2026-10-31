import type { Termo } from '../tipos';

/** Glossário, parte 1: os 30 primeiros termos de SLUGS_TERMOS (de 'adjudicacao' a 'ata-de-registro-de-precos'). */
export const termos: Termo[] = [
  {
    slug: 'adjudicacao',
    nome: 'Adjudicação',
    definicao:
      'Adjudicação é o ato em que a autoridade superior do órgão atribui o objeto da licitação ao licitante vencedor, depois do julgamento, da habilitação e dos recursos. Ela indica oficialmente quem venceu cada item ou lote, mas ainda não é o contrato: a assinatura ou o empenho vêm depois.',
    detalhe:
      'Para a empresa, a adjudicação é o sinal de que a vitória foi reconhecida, e costuma sair junto com a [homologação](/glossario/homologacao). Depois disso, o órgão convoca o vencedor para assinar o [contrato](/glossario/contrato-administrativo) ou retirar a [nota de empenho](/glossario/empenho) dentro do prazo do [edital](/glossario/edital). Quem não atende a convocação perde o direito à contratação e pode sofrer sanções. Se o prazo de validade da [proposta](/glossario/proposta) passar sem convocação, a empresa fica livre do compromisso.',
    artigo: 'Lei 14.133/2021, art. 71, IV',
    relacionados: ['homologacao', 'licitante', 'contrato-administrativo', 'empenho'],
    guia: 'como-participar-de-licitacao',
  },
  {
    slug: 'homologacao',
    nome: 'Homologação',
    definicao:
      'Homologação é o ato da autoridade superior que confirma que a licitação foi feita de forma regular e encerra o processo. É a última fase da licitação: depois dela, o órgão pode convocar o vencedor para assinar o contrato ou receber a nota de empenho e começar a entrega.',
    detalhe:
      'Antes de homologar, a autoridade pode devolver o processo para corrigir falhas, revogar a licitação por motivo de interesse público ou anulá-la por ilegalidade. Por isso, enquanto não sai a homologação, ainda não é hora de comprar estoque nem de fechar compromissos com fornecedores. O resultado homologado fica registrado no portal de compras usado pelo órgão e no [PNCP](/glossario/pncp).',
    artigo: 'Lei 14.133/2021, art. 17, VII, e art. 71, IV',
    relacionados: ['adjudicacao', 'recurso-administrativo', 'contrato-administrativo', 'sessao-publica'],
    guia: 'como-participar-de-licitacao',
  },
  {
    slug: 'menor-preco',
    nome: 'Menor preço',
    definicao:
      'Menor preço é o critério de julgamento em que vence a proposta mais barata entre as que cumprem as exigências mínimas de qualidade do edital. É o critério mais comum no pregão e nas compras de produtos do dia a dia, como uniformes, EPI, material de escritório e alimentos.',
    detalhe:
      'Menor preço não quer dizer qualquer preço. A lei manda considerar o menor gasto para o órgão, e o edital pode levar em conta custos de manutenção, uso e descarte quando forem mensuráveis. Uma proposta barata demais pode ser recusada por [inexequibilidade](/glossario/inexequibilidade), e um produto fora da especificação é desclassificado mesmo sendo o mais barato. Por isso, leia o [termo de referência](/glossario/termo-de-referencia) antes de dar o primeiro [lance](/glossario/lance).',
    artigo: 'Lei 14.133/2021, art. 33, I, e art. 34',
    relacionados: ['maior-desconto', 'tecnica-e-preco', 'pregao', 'inexequibilidade'],
    guia: 'pregao-eletronico',
  },
  {
    slug: 'maior-desconto',
    nome: 'Maior desconto',
    definicao:
      'Maior desconto é o critério de julgamento em que vence quem oferece o maior percentual de desconto sobre um preço de referência fixado no edital, como uma tabela de preços de mercado. Em vez de disputar valores em reais, as empresas disputam porcentagens de desconto sobre essa referência.',
    detalhe:
      'É comum em compras de passagens, peças de reposição, medicamentos e outros itens com tabela de preços conhecida. Pela lei, o desconto vencedor também vale para eventuais [termos aditivos](/glossario/termo-aditivo) do contrato. Antes de oferecer, calcule a margem sobre a tabela indicada no [edital](/glossario/edital): um desconto alto demais pode deixar a entrega sem lucro ou levar à desclassificação por [inexequibilidade](/glossario/inexequibilidade).',
    artigo: 'Lei 14.133/2021, art. 33, II, e art. 34, § 2º',
    relacionados: ['menor-preco', 'pregao', 'ata-de-registro-de-precos'],
    guia: 'pregao-eletronico',
  },
  {
    slug: 'tecnica-e-preco',
    nome: 'Técnica e preço',
    definicao:
      'Técnica e preço é o critério de julgamento em que cada proposta recebe uma nota técnica e uma nota de preço, combinadas por pesos definidos no edital. Vence a maior pontuação final. É usado quando a qualidade técnica pesa muito no resultado, como em serviços intelectuais e de engenharia especializados.',
    detalhe:
      'A lei limita o peso da parte técnica a 70% da nota. A avaliação técnica pode considerar atestados de trabalhos anteriores, notas dadas por uma banca a quesitos como metodologia e equipe, e o desempenho da empresa em contratos públicos anteriores. Para disputar, a empresa precisa reunir [atestados de capacidade técnica](/glossario/atestado-de-capacidade-tecnica) e preparar a proposta técnica com o mesmo cuidado da proposta de preço. Esse critério aparece mais na [concorrência](/glossario/concorrencia) do que no [pregão](/glossario/pregao).',
    artigo: 'Lei 14.133/2021, art. 33, IV, e art. 36',
    relacionados: ['menor-preco', 'concorrencia', 'atestado-de-capacidade-tecnica', 'proposta'],
    guia: 'nova-lei-de-licitacoes',
  },
  {
    slug: 'catmat',
    nome: 'CATMAT',
    definicao:
      'CATMAT é o Catálogo de Materiais do governo federal: uma lista padronizada em que cada produto comprado pela administração recebe um código e uma descrição. Os órgãos usam esse código para descrever os itens das compras, o que facilita comparar preços e encontrar licitações do mesmo produto.',
    detalhe:
      'Na prática, o código CATMAT aparece na lista de itens de muitos editais e no [Compras.gov.br](https://www.gov.br/compras). Ao se cadastrar no [SICAF](/glossario/sicaf), a empresa informa as linhas de fornecimento que atende, ligadas às classes de materiais do catálogo, e pode receber avisos de compras nessas linhas. Conhecer os códigos dos seus produtos ajuda a pesquisar preços praticados e a conferir se o item pedido é mesmo o que você vende. Para serviços, o catálogo equivalente é o [CATSER](/glossario/catser).',
    relacionados: ['catser', 'uasg', 'sicaf', 'termo-de-referencia'],
    guia: 'sicaf',
  },
  {
    slug: 'catser',
    nome: 'CATSER',
    definicao:
      'CATSER é o Catálogo de Serviços do governo federal: uma lista padronizada em que cada tipo de serviço contratado pela administração recebe um código e uma descrição. Ele funciona como o CATMAT, só que para serviços como limpeza, manutenção, vigilância, transporte e consultoria.',
    detalhe:
      'Os órgãos usam o código CATSER para descrever os itens de serviço nas compras, e o código costuma aparecer na lista de itens do [edital](/glossario/edital). Para a empresa, saber em quais códigos o seu serviço se encaixa ajuda a encontrar licitações parecidas, comparar preços pagos por outros órgãos e escolher as linhas de fornecimento no cadastro do [SICAF](/glossario/sicaf). Para produtos, o catálogo equivalente é o [CATMAT](/glossario/catmat).',
    relacionados: ['catmat', 'uasg', 'sicaf', 'termo-de-referencia'],
    guia: 'sicaf',
  },
  {
    slug: 'uasg',
    nome: 'UASG',
    definicao:
      'UASG é a sigla de Unidade Administrativa de Serviços Gerais: o código numérico que identifica cada unidade compradora nos sistemas de compras do governo federal. Um mesmo órgão pode ter várias UASGs, uma para cada unidade que faz compras, e o número aparece no edital e nos avisos de licitação.',
    detalhe:
      'Para quem vende ao governo, o número da UASG é a forma mais rápida de achar uma compra no [Compras.gov.br](https://www.gov.br/compras): com ele e o número do [pregão](/glossario/pregao) ou da dispensa, você localiza o aviso, os documentos e a sala de disputa. Vale anotar as UASGs dos órgãos que mais compram o que você vende, para acompanhar as próximas compras. Estados e municípios que usam sistemas próprios podem identificar suas unidades de outro jeito.',
    relacionados: ['catmat', 'pregao', 'dispensa-eletronica', 'sicaf'],
    guia: 'pregao-eletronico',
  },
  {
    slug: 'pregoeiro',
    nome: 'Pregoeiro',
    definicao:
      'Pregoeiro é o servidor público designado para conduzir uma licitação na modalidade pregão. Ele abre a sessão, acompanha os lances, negocia o preço com o primeiro colocado, analisa a proposta e os documentos de habilitação e responde às mensagens dos licitantes no sistema. É auxiliado por uma equipe de apoio.',
    detalhe:
      'Na Lei 14.133, o pregoeiro é o [agente de contratação](/glossario/agente-de-contratacao) que atua no [pregão](/glossario/pregao). Durante a [sessão pública](/glossario/sessao-publica), ele pode pedir documentos, abrir prazo para ajustes e convocar a empresa pelo chat do sistema. Por isso, quem disputa precisa acompanhar a sessão até o fim: perder um prazo dado pelo pregoeiro pode tirar a empresa da disputa. As decisões dele podem ser questionadas por [recurso administrativo](/glossario/recurso-administrativo).',
    artigo: 'Lei 14.133/2021, art. 8º, § 5º',
    relacionados: ['agente-de-contratacao', 'pregao', 'sessao-publica', 'comissao-de-contratacao'],
    guia: 'pregao-eletronico',
  },
  {
    slug: 'agente-de-contratacao',
    nome: 'Agente de contratação',
    definicao:
      'Agente de contratação é a pessoa designada pela autoridade do órgão, entre servidores efetivos ou empregados públicos permanentes, para conduzir a licitação. Ele toma decisões, acompanha o andamento, dá impulso ao processo e cuida das demais atividades necessárias até a homologação. No pregão, recebe o nome de pregoeiro.',
    detalhe:
      'É a figura criada pela Lei 14.133 para concentrar a condução da licitação em uma pessoa responsável, auxiliada por uma equipe de apoio. Em compras de bens ou serviços especiais, o órgão pode trocar o agente por uma [comissão de contratação](/glossario/comissao-de-contratacao). Para a empresa, é com o agente que se fala durante a disputa: pedidos de esclarecimento, envio de documentos e prazos passam por ele, sempre pelos canais indicados no [edital](/glossario/edital).',
    artigo: 'Lei 14.133/2021, art. 6º, LX, e art. 8º',
    relacionados: ['pregoeiro', 'comissao-de-contratacao', 'licitante', 'edital'],
    guia: 'nova-lei-de-licitacoes',
  },
  {
    slug: 'comissao-de-contratacao',
    nome: 'Comissão de contratação',
    definicao:
      'Comissão de contratação é o grupo de agentes públicos indicado pelo órgão, de forma permanente ou para um caso específico, para receber, examinar e julgar os documentos de licitações e de procedimentos auxiliares. Em licitações de bens ou serviços especiais, ela pode substituir o agente de contratação e tem pelo menos três membros.',
    detalhe:
      'Os membros da comissão respondem juntos pelos atos que praticam, salvo quem registrar em ata uma posição divergente fundamentada. No [diálogo competitivo](/glossario/dialogo-competitivo), a condução por comissão é obrigatória. Para a empresa, a diferença prática é pequena: as regras de envio de documentos, prazos e recursos continuam sendo as do [edital](/glossario/edital), e as decisões da comissão podem ser contestadas por [recurso administrativo](/glossario/recurso-administrativo).',
    artigo: 'Lei 14.133/2021, art. 6º, L, e art. 8º, § 2º',
    relacionados: ['agente-de-contratacao', 'pregoeiro', 'dialogo-competitivo', 'habilitacao'],
    guia: 'nova-lei-de-licitacoes',
  },
  {
    slug: 'licitante',
    nome: 'Licitante',
    definicao:
      'Licitante é a pessoa física ou jurídica, ou o consórcio de empresas, que participa ou mostra interesse em participar de uma licitação. Para a lei, também conta como licitante o fornecedor que envia proposta quando a administração pede, como acontece nas dispensas com aviso público e na dispensa eletrônica.',
    detalhe:
      'Ser licitante traz direitos e deveres. A empresa pode pedir esclarecimentos, apresentar [impugnação](/glossario/impugnacao) ao [edital](/glossario/edital) e [recurso administrativo](/glossario/recurso-administrativo) contra decisões. Em troca, fica presa à [proposta](/glossario/proposta) enquanto ela for válida e pode ser punida se desistir sem motivo aceito, apresentar documento falso ou não assinar o contrato quando convocada. Quando o contrato é assinado, o licitante vencedor passa a ser chamado de contratado.',
    artigo: 'Lei 14.133/2021, art. 6º, IX',
    relacionados: ['proposta', 'habilitacao', 'consorcio', 'me-epp'],
    guia: 'como-participar-de-licitacao',
  },
  {
    slug: 'edital',
    nome: 'Edital',
    definicao:
      'Edital é o documento que anuncia uma licitação e traz todas as suas regras: o que será comprado, como enviar a proposta, como será o julgamento, quais documentos de habilitação são exigidos, os prazos, as penalidades e as condições de entrega e pagamento. Tudo o que a empresa precisa cumprir está nele.',
    detalhe:
      'Os anexos fazem parte do edital: [termo de referência](/glossario/termo-de-referencia) ou [projeto básico](/glossario/projeto-basico), minuta do contrato e modelos de declaração. Pela lei, todos devem ser publicados no mesmo dia, em site oficial, sem exigir cadastro para baixar. Leia tudo antes de decidir participar; se encontrar uma exigência ilegal ou que restringe a disputa sem motivo, você pode pedir esclarecimento ou apresentar [impugnação](/glossario/impugnacao). Os editais abertos estão no [PNCP](/glossario/pncp) e no [mapa do Edital Map](/licitacoes).',
    artigo: 'Lei 14.133/2021, art. 25',
    relacionados: ['termo-de-referencia', 'impugnacao', 'habilitacao', 'proposta'],
    guia: 'como-participar-de-licitacao',
  },
  {
    slug: 'termo-de-referencia',
    nome: 'Termo de referência',
    definicao:
      'Termo de referência é o documento que descreve em detalhe o que o órgão quer comprar ou contratar: o objeto, as quantidades, os requisitos, o prazo, a forma de entrega ou execução, a fiscalização, os critérios de medição e pagamento e a estimativa de valor. É usado em compras de bens e serviços.',
    detalhe:
      'Costuma vir como anexo do [edital](/glossario/edital) e é onde estão as especificações que a sua [proposta](/glossario/proposta) precisa atender: medidas, normas técnicas, certificações, marcas de referência, local e prazo de entrega. Muitas desclassificações acontecem por produto fora dessa descrição, então compare item por item com o que você vende antes de entrar. Em obras e serviços de engenharia, o papel equivalente é do [projeto básico](/glossario/projeto-basico).',
    artigo: 'Lei 14.133/2021, art. 6º, XXIII',
    relacionados: ['estudo-tecnico-preliminar', 'projeto-basico', 'edital', 'catmat'],
    guia: 'documentos-para-licitacao',
  },
  {
    slug: 'estudo-tecnico-preliminar',
    nome: 'Estudo técnico preliminar',
    definicao:
      'Estudo técnico preliminar, ou ETP, é o documento da primeira etapa do planejamento de uma compra pública. Nele o órgão descreve a necessidade, compara as soluções do mercado, estima quantidades e valor e conclui se a contratação é viável. Ele serve de base para o termo de referência ou o projeto básico.',
    detalhe:
      'O ETP é um documento interno do órgão, mas pode ajudar a empresa a entender por que o edital pede certas exigências, quantidades ou especificações. Quando divulgado junto com os documentos da licitação, vale ler as partes sobre levantamento de mercado e estimativa de quantidades: elas mostram o tamanho real da demanda. Se uma exigência do [edital](/glossario/edital) não tiver justificativa no planejamento, isso pode embasar um pedido de esclarecimento ou uma [impugnação](/glossario/impugnacao).',
    artigo: 'Lei 14.133/2021, art. 6º, XX, e art. 18, § 1º',
    relacionados: ['termo-de-referencia', 'projeto-basico', 'plano-de-contratacoes-anual', 'matriz-de-riscos'],
    guia: 'nova-lei-de-licitacoes',
  },
  {
    slug: 'projeto-basico',
    nome: 'Projeto básico',
    definicao:
      'Projeto básico é o conjunto de elementos técnicos que define e dimensiona uma obra ou um serviço de engenharia com precisão suficiente para licitar. Inclui levantamentos, soluções técnicas, materiais e equipamentos, métodos de execução e, conforme o regime de execução, o orçamento detalhado do custo da obra.',
    detalhe:
      'Nas licitações de obras e serviços de engenharia, o projeto básico faz o papel que o [termo de referência](/glossario/termo-de-referencia) tem nas compras de bens e serviços comuns: é a partir dele que a empresa monta o orçamento e a [proposta](/glossario/proposta). Ele é elaborado com base no [estudo técnico preliminar](/glossario/estudo-tecnico-preliminar) e, depois, detalhado no projeto executivo. Falhas no projeto básico podem gerar aditivos e discussões de preço durante o contrato.',
    artigo: 'Lei 14.133/2021, art. 6º, XXV',
    relacionados: ['termo-de-referencia', 'estudo-tecnico-preliminar', 'concorrencia', 'matriz-de-riscos'],
    guia: 'nova-lei-de-licitacoes',
  },
  {
    slug: 'inexequibilidade',
    nome: 'Inexequibilidade',
    definicao:
      'Inexequibilidade é a situação em que o preço de uma proposta é tão baixo que não parece possível cumprir o contrato com ele. A lei manda desclassificar propostas com preços inexequíveis, e o órgão pode pedir que a empresa demonstre, com planilhas e documentos, que consegue entregar pelo valor oferecido.',
    detalhe:
      'Em obras e serviços de engenharia, a lei presume inexequível a proposta abaixo de 75% do valor orçado pela administração, e o TCU admite que a empresa demonstre que o preço é viável. Para bens e outros serviços, os critérios dependem do regulamento e do [edital](/glossario/edital), e muitas vezes o órgão abre prazo para a empresa provar que o preço se sustenta. Na disputa de [lances](/glossario/lance), calcule antes o seu preço mínimo com impostos, frete e margem, e tenha notas e cotações de fornecedores à mão.',
    artigo: 'Lei 14.133/2021, art. 59, III e § 4º',
    relacionados: ['menor-preco', 'sobrepreco', 'lance', 'proposta'],
    guia: 'pregao-eletronico',
  },
  {
    slug: 'sobrepreco',
    nome: 'Sobrepreço',
    definicao:
      'Sobrepreço é o preço orçado para a licitação ou contratado em valor muito acima dos preços de referência do mercado. Pode estar em um único item, quando a contratação é por preço unitário, ou no valor total do objeto, quando a contratação é por preço global, como nas empreitadas.',
    detalhe:
      'O sobrepreço é um problema do preço, enquanto o [superfaturamento](/glossario/superfaturamento) é o dano que aparece na execução do contrato. Para a empresa, a regra prática é cotar perto dos preços praticados em outras compras públicas e no mercado: proposta acima do orçamento estimado é desclassificada, e preços muito acima do mercado chamam a atenção dos órgãos de controle, como o TCU, mesmo depois de assinado o contrato.',
    artigo: 'Lei 14.133/2021, art. 6º, LVI',
    relacionados: ['superfaturamento', 'inexequibilidade', 'proposta'],
    guia: 'nova-lei-de-licitacoes',
  },
  {
    slug: 'superfaturamento',
    nome: 'Superfaturamento',
    definicao:
      'Superfaturamento é o prejuízo causado ao órgão público durante a execução do contrato. Acontece, por exemplo, quando se mede ou cobra quantidade maior do que a entregue, quando a obra perde qualidade ou segurança, ou quando mudanças no orçamento, no cronograma ou nos reajustes favorecem o contratado sem justificativa.',
    detalhe:
      'Diferente do [sobrepreço](/glossario/sobrepreco), que está no preço, o superfaturamento aparece no pagamento e na entrega. Para evitar problemas, guarde comprovantes de tudo o que foi entregue, só fature o que foi recebido e aceito pelo fiscal do contrato e trate qualquer mudança de preço por [reajuste](/glossario/reajuste) ou [termo aditivo](/glossario/termo-aditivo) formal. Valores pagos a mais podem ser cobrados de volta, além das sanções previstas em lei.',
    artigo: 'Lei 14.133/2021, art. 6º, LVII',
    relacionados: ['sobrepreco', 'contrato-administrativo', 'reajuste', 'liquidacao'],
    guia: 'empenho',
  },
  {
    slug: 'dialogo-competitivo',
    nome: 'Diálogo competitivo',
    definicao:
      'Diálogo competitivo é a modalidade de licitação em que o órgão conversa com empresas pré-selecionadas para desenvolver soluções para uma necessidade que ele ainda não sabe especificar com precisão. Depois das conversas, as empresas apresentam propostas finais. É reservado a contratações que envolvem inovação ou soluções técnicas complexas.',
    detalhe:
      'É uma modalidade nova, criada pela Lei 14.133, e ainda pouco usada. O órgão publica as necessidades e dá pelo menos 25 dias úteis para as empresas mostrarem interesse; as reuniões são gravadas e conduzidas por [comissão de contratação](/glossario/comissao-de-contratacao) de pelo menos três servidores. As soluções que uma empresa apresenta não podem ser reveladas às outras sem o consentimento dela. Para pequenas empresas, costuma aparecer mais como chance de parceria ou [consórcio](/glossario/consorcio).',
    artigo: 'Lei 14.133/2021, art. 6º, XLII, e art. 32',
    relacionados: ['concorrencia', 'comissao-de-contratacao', 'consorcio', 'proposta'],
    guia: 'nova-lei-de-licitacoes',
  },
  {
    slug: 'concorrencia',
    nome: 'Concorrência',
    definicao:
      'Concorrência é a modalidade de licitação usada para contratar bens e serviços especiais e obras e serviços de engenharia, comuns ou especiais. O julgamento pode ser por menor preço, melhor técnica ou conteúdo artístico, técnica e preço, maior retorno econômico ou maior desconto, conforme o edital.',
    detalhe:
      'Segue o mesmo rito do [pregão](/glossario/pregao): divulgação do [edital](/glossario/edital), propostas e lances, julgamento, [habilitação](/glossario/habilitacao), recursos e homologação. A diferença está no objeto: a concorrência atende o que não é bem ou serviço comum, como obras e serviços técnicos mais complexos, e por isso pode exigir proposta técnica e mais documentos de qualificação. Veja as [concorrências abertas](/licitacoes/concorrencia) no Edital Map.',
    artigo: 'Lei 14.133/2021, art. 6º, XXXVIII, e art. 28, II',
    relacionados: ['pregao', 'tecnica-e-preco', 'projeto-basico', 'habilitacao'],
    guia: 'o-que-e-licitacao',
  },
  {
    slug: 'pregao',
    nome: 'Pregão',
    definicao:
      'Pregão é a modalidade de licitação obrigatória para comprar bens e serviços comuns, aqueles que podem ser descritos com especificações usuais de mercado. O julgamento é por menor preço ou maior desconto, e as empresas disputam com lances. É a modalidade mais usada e quase sempre acontece pela internet.',
    detalhe:
      'Uniformes, EPI, material de limpeza, alimentos e serviços como manutenção predial costumam ser comprados por pregão. A lei não permite pregão para obras, serviços de engenharia que não sejam comuns e serviços técnicos de natureza intelectual. A disputa é conduzida pelo [pregoeiro](/glossario/pregoeiro) em [sessão pública](/glossario/sessao-publica); depois dos [lances](/glossario/lance), ele analisa a proposta e a [habilitação](/glossario/habilitacao) de quem ficou em primeiro. Veja os [pregões eletrônicos abertos](/licitacoes/pregao-eletronico).',
    artigo: 'Lei 14.133/2021, art. 6º, XLI, e art. 29',
    relacionados: ['pregoeiro', 'lance', 'menor-preco', 'concorrencia'],
    guia: 'pregao-eletronico',
  },
  {
    slug: 'leilao',
    nome: 'Leilão',
    definicao:
      'Leilão é a modalidade de licitação que o poder público usa para vender bens, como imóveis, veículos, máquinas e móveis que não servem mais ou que foram apreendidos. Vence quem oferece o maior lance. Diferente das outras modalidades, nele a empresa ou a pessoa compra do governo, em vez de vender.',
    detalhe:
      'O leilão pode ser feito por leiloeiro oficial ou por servidor designado, e o [edital](/glossario/edital) traz a descrição dos bens, o valor de avaliação, o preço mínimo, as condições de pagamento e onde os bens podem ser vistos. Não há fase de [habilitação](/glossario/habilitacao) nem exigência de cadastro prévio. Pode ser uma fonte de equipamentos e veículos usados para a empresa, mas confira antes o estado do bem e eventuais dívidas ou pendências ligadas a ele.',
    artigo: 'Lei 14.133/2021, art. 6º, XL, e art. 31',
    relacionados: ['lance', 'concurso', 'edital'],
    guia: 'o-que-e-licitacao',
  },
  {
    slug: 'concurso',
    nome: 'Concurso',
    definicao:
      'Concurso, na lei de licitações, é a modalidade usada para escolher um trabalho técnico, científico ou artístico, como um projeto de arquitetura, uma obra de arte ou um estudo. O critério é a melhor técnica ou conteúdo artístico, e o vencedor recebe o prêmio ou a remuneração prevista no edital.',
    detalhe:
      'Não confunda com concurso público para cargos: aqui se escolhe um trabalho, não um servidor. O [edital](/glossario/edital) define a qualificação exigida dos participantes, a forma de apresentar o trabalho e o prêmio. Quando o concurso é para elaborar um projeto, o vencedor cede ao órgão os direitos patrimoniais sobre ele. É uma modalidade rara no dia a dia das pequenas empresas, mais comum para escritórios de arquitetura, design e comunicação.',
    artigo: 'Lei 14.133/2021, art. 6º, XXXIX, e art. 30',
    relacionados: ['leilao', 'concorrencia', 'tecnica-e-preco'],
    guia: 'o-que-e-licitacao',
  },
  {
    slug: 'credenciamento',
    nome: 'Credenciamento',
    definicao:
      'Credenciamento é o chamamento público em que o órgão convoca todas as empresas ou profissionais interessados que cumprem os requisitos para se cadastrar e prestar um serviço ou fornecer um bem quando chamados. Não há disputa de preço entre os credenciados: o valor e as condições costumam vir definidos no edital.',
    detalhe:
      'É um procedimento auxiliar, não uma modalidade de licitação, e a contratação dos credenciados se faz por [inexigibilidade](/glossario/inexigibilidade). Serve quando é vantajoso contratar vários fornecedores ao mesmo tempo, como clínicas e laboratórios, ou quando a escolha fica com o usuário do serviço. O edital de chamamento fica aberto para novos interessados, e a demanda é dividida por critérios objetivos. Veja os [credenciamentos abertos](/licitacoes/credenciamento).',
    artigo: 'Lei 14.133/2021, art. 6º, XLIII, art. 78, I, e art. 79',
    relacionados: ['inexigibilidade', 'habilitacao', 'edital'],
    guia: 'inexigibilidade-de-licitacao',
  },
  {
    slug: 'dispensa-de-licitacao',
    nome: 'Dispensa de licitação',
    definicao:
      'Dispensa de licitação é a contratação direta, sem licitação, nos casos que a lei lista, mesmo quando a competição seria possível. Os casos mais comuns são as compras e serviços de valor baixo e as emergências. O órgão ainda precisa justificar a escolha, pesquisar preços e conferir os documentos do fornecedor.',
    detalhe:
      'Para pequenas empresas, a dispensa por valor é uma das portas de entrada mais acessíveis: os valores são menores, a disputa é mais rápida e a documentação costuma ser mais simples. Os limites estão no art. 75 da lei e são atualizados todo ano por decreto. Muitos órgãos publicam aviso de pelo menos 3 dias úteis pedindo propostas, e no governo federal a regra é a [dispensa eletrônica](/glossario/dispensa-eletronica). Veja as [dispensas abertas](/licitacoes/dispensa).',
    artigo: 'Lei 14.133/2021, art. 75',
    relacionados: ['dispensa-eletronica', 'inexigibilidade', 'cotacao-eletronica', 'licitacao-deserta'],
    guia: 'dispensa-de-licitacao',
  },
  {
    slug: 'inexigibilidade',
    nome: 'Inexigibilidade',
    definicao:
      'Inexigibilidade é a contratação direta, sem licitação, quando a competição é inviável. Acontece, por exemplo, quando só um fornecedor exclusivo pode entregar o produto, na contratação de artista consagrado, em certos serviços técnicos de notória especialização, no credenciamento e na compra ou aluguel de imóvel com características únicas.',
    detalhe:
      'Diferente da [dispensa](/glossario/dispensa-de-licitacao), em que a disputa seria possível mas a lei permite dispensá-la, na inexigibilidade não há como comparar propostas. Para uma pequena empresa, ela aparece mais em dois casos: quando a empresa é representante ou fabricante exclusiva, comprovada por atestado ou contrato de exclusividade, e quando participa de um [credenciamento](/glossario/credenciamento). Mesmo assim, o órgão precisa justificar o preço e conferir a [habilitação](/glossario/habilitacao).',
    artigo: 'Lei 14.133/2021, art. 74',
    relacionados: ['dispensa-de-licitacao', 'credenciamento', 'habilitacao'],
    guia: 'inexigibilidade-de-licitacao',
  },
  {
    slug: 'cotacao-eletronica',
    nome: 'Cotação eletrônica',
    definicao:
      'Cotação eletrônica é o pedido de preços feito pela internet para compras pequenas, em que os fornecedores enviam propostas e lances durante um prazo curto. No governo federal, era uma ferramenta do antigo Comprasnet, usada só para materiais, nas compras de baixo valor dispensadas de licitação pelas regras anteriores.',
    detalhe:
      'Na cotação do Comprasnet, o pedido ficava disponível por algumas horas, no mínimo 4 e no máximo 48, e o vencedor aguardava o contato do órgão. Nas compras feitas pela Lei 14.133, o governo federal usa a [dispensa eletrônica](/glossario/dispensa-eletronica), que segue a mesma lógica de propostas e lances rápidos. Se encontrar o termo em outro portal, leia o aviso com atenção: prazos, documentos e forma de disputa são os daquele procedimento.',
    relacionados: ['dispensa-eletronica', 'dispensa-de-licitacao', 'lance'],
    guia: 'dispensa-de-licitacao',
  },
  {
    slug: 'dispensa-eletronica',
    nome: 'Dispensa eletrônica',
    definicao:
      'Dispensa eletrônica é a contratação direta sem licitação feita por sistema na internet, com aviso público e disputa de lances entre os fornecedores interessados. No governo federal, ela acontece no Compras.gov.br, segue a Instrução Normativa SEGES/ME 67/2021 e é usada principalmente nas compras e serviços de valor baixo.',
    detalhe:
      'O aviso sai no Compras.gov.br e no [PNCP](/glossario/pncp) com pelo menos 3 dias úteis de antecedência, e os fornecedores cadastrados no [SICAF](/glossario/sicaf) na linha de fornecimento recebem uma mensagem. Na data marcada, a disputa de [lances](/glossario/lance) fica aberta de 6 a 10 horas, e a empresa pode programar um valor mínimo para o sistema dar lances automáticos. Depois, o órgão analisa a proposta e os documentos do primeiro colocado. Estados e municípios podem usar o mesmo sistema ou outro integrado.',
    artigo: 'Lei 14.133/2021, art. 75, § 3º; Instrução Normativa SEGES/ME 67/2021',
    relacionados: ['dispensa-de-licitacao', 'cotacao-eletronica', 'sicaf', 'lance'],
    guia: 'dispensa-de-licitacao',
  },
  {
    slug: 'ata-de-registro-de-precos',
    nome: 'Ata de registro de preços',
    definicao:
      'Ata de registro de preços é o documento em que ficam registrados o objeto, os preços, os fornecedores, os órgãos participantes e as condições para compras futuras. Ela funciona como um compromisso: o fornecedor se obriga a entregar pelo preço registrado quando o órgão pedir, durante a validade da ata.',
    detalhe:
      'A ata nasce de uma licitação ou contratação direta pelo [sistema de registro de preços](/glossario/sistema-de-registro-de-precos) e vale por 1 ano, prorrogável por mais 1 se o preço continuar vantajoso. Estar na ata não garante pedido: o órgão compra quando precisa, até a quantidade máxima prevista no [edital](/glossario/edital). Por isso, planeje estoque e capacidade com cuidado. Outros órgãos podem pedir [adesão à ata](/glossario/adesao-a-ata), o que pode aumentar as vendas.',
    artigo: 'Lei 14.133/2021, art. 6º, XLVI, arts. 83 e 84',
    relacionados: ['sistema-de-registro-de-precos', 'orgao-gerenciador', 'adesao-a-ata', 'pregao'],
    guia: 'ata-de-registro-de-precos',
  },
];
