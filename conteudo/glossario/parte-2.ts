import type { Termo } from '../tipos';

/** Glossário, segunda metade (spec 2026-10-23-guias-glossario, seção 4). Artigos conferidos no Planalto em 23/10/2026. */
export const termos: Termo[] = [
  {
    slug: 'sistema-de-registro-de-precos',
    nome: 'Sistema de registro de preços (SRP)',
    definicao:
      'Sistema de registro de preços é o conjunto de regras que permite ao governo fazer uma licitação, ou contratação direta, só para registrar preços de produtos ou serviços e comprar depois, aos poucos, conforme a necessidade. A empresa vencedora fica com o preço registrado, mas o órgão não é obrigado a comprar tudo.',
    detalhe:
      'Para quem vende, o SRP muda o jeito de planejar: o resultado da disputa vira uma [ata de registro de preços](/glossario/ata-de-registro-de-precos) que vale por 1 ano, prorrogável por igual período se o preço continuar vantajoso, e os pedidos chegam em partes ao longo desse prazo. Quem conduz tudo é o [órgão gerenciador](/glossario/orgao-gerenciador), e outros órgãos podem pedir para usar a ata pela [adesão](/glossario/adesao-a-ata). O guia [Ata de registro de preços](/guias/ata-de-registro-de-precos) explica como se preparar para entregas parceladas.',
    artigo: 'Lei 14.133/2021, art. 6º, XLV, e arts. 82 a 86',
    relacionados: ['ata-de-registro-de-precos', 'orgao-gerenciador', 'adesao-a-ata', 'pregao'],
    guia: 'ata-de-registro-de-precos',
  },
  {
    slug: 'orgao-gerenciador',
    nome: 'Órgão gerenciador',
    definicao:
      'Órgão gerenciador é o órgão ou a entidade pública que conduz a licitação feita pelo sistema de registro de preços e depois administra a ata que resulta dela. É quem organiza a compra conjunta, junta as quantidades dos participantes, controla os preços registrados e decide sobre os pedidos de adesão de outros órgãos.',
    detalhe:
      'Antes da licitação, o gerenciador costuma abrir a intenção de registro de preços (IRP), um prazo mínimo de 8 dias úteis para outros órgãos entrarem como participantes e somarem suas quantidades. Depois, quem não participou só usa a ata como não participante, pela [adesão à ata](/glossario/adesao-a-ata), e precisa da concordância do gerenciador e do fornecedor. Na prática, é com o gerenciador que a empresa trata prazos, entregas e mudanças de preço da [ata de registro de preços](/glossario/ata-de-registro-de-precos).',
    artigo: 'Lei 14.133/2021, art. 6º, XLVII, e art. 86',
    relacionados: ['sistema-de-registro-de-precos', 'ata-de-registro-de-precos', 'adesao-a-ata', 'uasg'],
    guia: 'ata-de-registro-de-precos',
  },
  {
    slug: 'adesao-a-ata',
    nome: 'Adesão à ata (carona)',
    definicao:
      'Adesão à ata, conhecida como carona, é quando um órgão público que não participou de uma licitação de registro de preços pede para comprar usando a ata de outro órgão. Ele aproveita o preço já registrado, sem fazer uma licitação própria, desde que o órgão gerenciador e o fornecedor concordem.',
    detalhe:
      'A lei põe limites: cada órgão que adere pode comprar até 50% das quantidades registradas na ata, e todas as adesões somadas não podem passar do dobro do que foi registrado para o gerenciador e os participantes. O órgão também precisa justificar a vantagem e mostrar que o preço está de acordo com o mercado. Para o fornecedor, a carona pode trazer pedidos extras sem nova disputa, mas aceitar é uma escolha dele. Veja o guia [Ata de registro de preços](/guias/ata-de-registro-de-precos).',
    artigo: 'Lei 14.133/2021, art. 86, §§ 2º a 5º',
    relacionados: ['ata-de-registro-de-precos', 'orgao-gerenciador', 'sistema-de-registro-de-precos'],
    guia: 'ata-de-registro-de-precos',
  },
  {
    slug: 'subcontratacao',
    nome: 'Subcontratação',
    definicao:
      'Subcontratação é quando a empresa que assinou o contrato com o governo passa parte da obra, do serviço ou do fornecimento para outra empresa executar. Ela só é possível até o limite autorizado pela Administração, e a contratada continua respondendo pelo contrato inteiro, inclusive pela parte feita pela subcontratada.',
    detalhe:
      'O edital ou o regulamento podem proibir, restringir ou pôr condições para subcontratar, por isso vale ler essa cláusula antes de montar a [proposta](/glossario/proposta). A contratada precisa apresentar documentos que comprovem a capacidade técnica da subcontratada, e a lei proíbe subcontratar quem tem vínculo com dirigentes do órgão ou com agentes que atuam na licitação ou no contrato. Em alguns casos, o edital pode exigir subcontratação de [ME e EPP](/glossario/me-epp).',
    artigo: 'Lei 14.133/2021, art. 122',
    relacionados: ['contrato-administrativo', 'consorcio', 'me-epp'],
  },
  {
    slug: 'consorcio',
    nome: 'Consórcio',
    definicao:
      'Consórcio é a união de duas ou mais empresas para disputar juntas uma licitação e executar o contrato, somando experiência e capacidade financeira. Cada empresa continua existindo, mas todas respondem juntas, de forma solidária, pelo que o consórcio fizer na licitação e na execução do contrato.',
    detalhe:
      'Para participar, as empresas apresentam o compromisso de formar o consórcio e indicam a empresa líder, que representa o grupo. Na [habilitação](/glossario/habilitacao), os atestados técnicos e os valores financeiros de cada consorciada podem ser somados. O edital pode pedir de 10% a 30% a mais na exigência financeira, salvo justificativa, mas esse acréscimo não vale para consórcios formados só por [ME e EPP](/glossario/me-epp). Uma empresa não pode estar em dois consórcios, ou sozinha e em consórcio, na mesma licitação.',
    artigo: 'Lei 14.133/2021, art. 15',
    relacionados: ['habilitacao', 'licitante', 'subcontratacao'],
  },
  {
    slug: 'habilitacao',
    nome: 'Habilitação',
    definicao:
      'Habilitação é a fase da licitação em que o governo confere os documentos da empresa para saber se ela tem condições de cumprir o contrato. A análise cobre quatro áreas: situação jurídica, capacidade técnica, regularidade fiscal, social e trabalhista e saúde econômico-financeira. Quem não comprova o que o edital pede é inabilitado.',
    detalhe:
      'Pela regra geral da lei, a habilitação vem depois do julgamento das propostas, e os documentos são pedidos só de quem ficou em primeiro lugar; o edital pode inverter essa ordem com justificativa. Depois de entregues, os documentos só podem ser completados por diligência. O cadastro no [SICAF](/glossario/sicaf) pode substituir parte dos papéis quando o edital permitir. A lista completa está no guia [Documentos para licitação](/guias/documentos-para-licitacao).',
    artigo: 'Lei 14.133/2021, arts. 62 a 70',
    relacionados: ['certidao-negativa', 'atestado-de-capacidade-tecnica', 'sicaf', 'proposta'],
    guia: 'documentos-para-licitacao',
  },
  {
    slug: 'proposta',
    nome: 'Proposta',
    definicao:
      'Proposta é a oferta formal que a empresa apresenta na licitação, com o preço e a descrição do que vai entregar, seguindo as regras do edital. Ao enviá-la, a empresa se compromete a cumprir o que ofereceu durante o prazo de validade, e o governo usa a proposta para julgar e classificar os participantes.',
    detalhe:
      'A proposta é desclassificada quando tem erro que não pode ser corrigido, não segue as especificações do edital, traz preço acima do orçamento estimado ou com sinais de [inexequibilidade](/glossario/inexequibilidade). Por isso, antes de enviar, confira o [termo de referência](/glossario/termo-de-referencia) item por item e faça a conta dos custos. No [pregão eletrônico](/licitacoes/pregao-eletronico), o valor inicial da proposta ainda pode cair durante a fase de [lances](/glossario/lance).',
    artigo: 'Lei 14.133/2021, art. 59',
    relacionados: ['lance', 'inexequibilidade', 'habilitacao', 'edital'],
    guia: 'proposta-de-precos',
  },
  {
    slug: 'lance',
    nome: 'Lance',
    definicao:
      'Lance é cada nova oferta de preço que a empresa faz durante a disputa aberta de uma licitação, depois de enviar a proposta inicial. No pregão eletrônico, os participantes dão lances sucessivos, em geral cada vez menores, até que a disputa termine e a melhor oferta fique em primeiro lugar.',
    detalhe:
      'A disputa pode ser aberta, com lances públicos e sucessivos, fechada, com propostas em sigilo até a hora marcada, ou uma combinação das duas, conforme o edital. Quando o critério é [menor preço](/glossario/menor-preco) ou [maior desconto](/glossario/maior-desconto), a lei não permite usar só o modo fechado. Antes da [sessão pública](/glossario/sessao-publica), defina o menor preço que a empresa aguenta praticar, para não dar um lance que vire prejuízo. Veja o guia [Pregão eletrônico](/guias/pregao-eletronico).',
    artigo: 'Lei 14.133/2021, art. 56',
    relacionados: ['proposta', 'sessao-publica', 'pregao', 'menor-preco'],
    guia: 'pregao-eletronico',
  },
  {
    slug: 'sessao-publica',
    nome: 'Sessão pública',
    definicao:
      'Sessão pública é o momento da licitação em que as propostas são abertas, os lances acontecem e o resultado vai sendo anunciado, com acesso de qualquer interessado. Hoje ela é feita quase sempre pela internet, em plataformas de compras, e fica registrada para quem quiser conferir depois.',
    detalhe:
      'A lei manda fazer as licitações preferencialmente na forma eletrônica; a forma presencial precisa de motivo, e a sessão deve ser registrada em ata e gravada em áudio e vídeo. A data e a hora estão no [edital](/glossario/edital), e é preciso entrar na plataforma indicada já cadastrado. Durante a sessão, o [pregoeiro](/glossario/pregoeiro) ou o [agente de contratação](/glossario/agente-de-contratacao) conduz os trabalhos e é nesse momento que se manifesta a intenção de recorrer.',
    artigo: 'Lei 14.133/2021, art. 17, § 2º',
    relacionados: ['lance', 'pregoeiro', 'recurso-administrativo', 'edital'],
    guia: 'pregao-eletronico',
  },
  {
    slug: 'impugnacao',
    nome: 'Impugnação',
    definicao:
      'Impugnação é o pedido formal para que o órgão corrija uma regra do edital que a pessoa considera ilegal ou que limita a disputa sem motivo. Qualquer pessoa pode impugnar, e o pedido deve ser feito até 3 dias úteis antes da abertura da licitação, pelo canal indicado no edital.',
    detalhe:
      'O mesmo prazo vale para o pedido de esclarecimento, usado quando a dúvida é só de entendimento. O órgão tem até 3 dias úteis para responder, limitado ao último dia útil antes da abertura, e publica a resposta no site oficial. Se o edital for alterado de um jeito que mude as propostas, o prazo de divulgação costuma ser reaberto. Impugnar é diferente de [recorrer](/glossario/recurso-administrativo): a impugnação questiona o [edital](/glossario/edital) antes da disputa; o recurso questiona decisões tomadas depois.',
    artigo: 'Lei 14.133/2021, art. 164',
    relacionados: ['edital', 'recurso-administrativo', 'licitante'],
    guia: 'impugnacao-e-recurso',
  },
  {
    slug: 'recurso-administrativo',
    nome: 'Recurso administrativo',
    definicao:
      'Recurso administrativo é o pedido para que uma decisão tomada na licitação seja revista, como o julgamento das propostas, a habilitação ou inabilitação de um participante, a anulação ou a revogação. O prazo para apresentar as razões é de 3 dias úteis, contado da intimação ou da lavratura da ata.',
    detalhe:
      'No julgamento das propostas e na [habilitação](/glossario/habilitacao), a empresa precisa manifestar a intenção de recorrer logo, na própria [sessão pública](/glossario/sessao-publica), senão perde o direito. Os demais participantes podem apresentar contrarrazões no mesmo prazo. O recurso vai a quem tomou a decisão, que pode reconsiderar em 3 dias úteis; se não reconsiderar, a autoridade superior decide em até 10 dias úteis. Enquanto isso, a decisão recorrida fica suspensa.',
    artigo: 'Lei 14.133/2021, arts. 165 e 168',
    relacionados: ['impugnacao', 'habilitacao', 'sessao-publica', 'homologacao'],
    guia: 'impugnacao-e-recurso',
  },
  {
    slug: 'licitacao-deserta',
    nome: 'Licitação deserta',
    definicao:
      'Licitação deserta é aquela em que nenhuma empresa se interessa em participar: chega o dia da abertura e ninguém apresenta proposta. O nome não aparece na lei, mas é usado por órgãos e fornecedores para diferenciar essa situação da licitação fracassada, em que há participantes, mas nenhum é aceito.',
    detalhe:
      'Quando a licitação fica deserta, o órgão pode repetir a disputa ou, se a anterior aconteceu há menos de 1 ano e todas as condições do edital forem mantidas, contratar por [dispensa de licitação](/glossario/dispensa-de-licitacao). Para quem vende, editais desertos podem indicar compras que pouca gente acompanha. Vale observar se o motivo foi preço baixo demais, prazo curto ou exigência difícil antes de entrar numa nova rodada. Veja o guia [Dispensa de licitação](/guias/dispensa-de-licitacao).',
    artigo: 'Lei 14.133/2021, art. 75, III, a',
    relacionados: ['licitacao-fracassada', 'dispensa-de-licitacao', 'edital'],
    guia: 'dispensa-de-licitacao',
  },
  {
    slug: 'licitacao-fracassada',
    nome: 'Licitação fracassada',
    definicao:
      'Licitação fracassada é aquela em que houve participantes, mas nenhum chegou ao fim: todas as propostas foram desclassificadas ou todas as empresas foram inabilitadas. É diferente da licitação deserta, em que ninguém aparece. A lei não usa esse nome, mas trata da situação ao permitir uma nova contratação.',
    detalhe:
      'Se não houve propostas válidas, ou se os preços ficaram muito acima do mercado, o órgão pode repetir a licitação ou contratar por [dispensa de licitação](/glossario/dispensa-de-licitacao), desde que a anterior tenha ocorrido há menos de 1 ano e as condições do edital sejam mantidas. Para o fornecedor, entender por que as propostas caíram, como erros de [habilitação](/glossario/habilitacao) ou preço fora do orçamento, ajuda a não repetir o problema na próxima disputa.',
    artigo: 'Lei 14.133/2021, art. 75, III',
    relacionados: ['licitacao-deserta', 'habilitacao', 'proposta', 'dispensa-de-licitacao'],
    guia: 'dispensa-de-licitacao',
  },
  {
    slug: 'contrato-administrativo',
    nome: 'Contrato administrativo',
    definicao:
      'Contrato administrativo é o acordo assinado entre o governo e a empresa vencedora para a entrega de produtos, a prestação de serviços ou a execução de obras. Ele segue as regras do direito público, o que dá ao órgão poderes especiais, como mudar parte do contrato, fiscalizar a execução e aplicar sanções.',
    detalhe:
      'O contrato precisa estar de acordo com o [edital](/glossario/edital) e a [proposta](/glossario/proposta) vencedora e trazer cláusulas obrigatórias, como objeto, preço, condições de pagamento, índice de [reajuste](/glossario/reajuste), prazos, garantias e penalidades. O governo pode alterá-lo sozinho em alguns casos, mas as cláusulas de preço só mudam com a concordância da empresa e o [equilíbrio econômico-financeiro](/glossario/reequilibrio-economico-financeiro) deve ser mantido. Durante todo o contrato, a empresa precisa continuar com a documentação de habilitação em dia.',
    artigo: 'Lei 14.133/2021, arts. 89 a 92 e 104',
    relacionados: ['termo-aditivo', 'garantia-contratual', 'reequilibrio-economico-financeiro', 'empenho'],
  },
  {
    slug: 'empenho',
    nome: 'Empenho',
    definicao:
      'Empenho é o ato pelo qual o órgão público reserva, no orçamento, o dinheiro para pagar uma despesa, criando a obrigação de pagar quando a condição combinada for cumprida. Ele vem registrado na nota de empenho, que traz o nome do credor, o que está sendo comprado e o valor reservado.',
    detalhe:
      'A lei proíbe fazer despesa pública sem empenho prévio, por isso muitas empresas só começam a produzir ou entregar depois de receber a nota de empenho, que em compras simples pode até substituir o contrato. O empenho não é o pagamento: depois da entrega vem a [liquidação](/glossario/liquidacao), em que o órgão confere o que foi entregue, e só então a ordem de pagamento. O guia [Empenho](/guias/empenho) mostra cada etapa até o dinheiro cair na conta.',
    artigo: 'Lei 4.320/1964, arts. 58 a 61',
    relacionados: ['liquidacao', 'contrato-administrativo', 'homologacao'],
    guia: 'empenho',
  },
  {
    slug: 'liquidacao',
    nome: 'Liquidação',
    definicao:
      'Liquidação é a etapa em que o órgão público confere se a empresa realmente entregou o produto ou prestou o serviço, e quanto deve pagar, antes de autorizar o pagamento. A verificação se baseia no contrato, na nota de empenho e nos comprovantes de entrega, como a nota fiscal atestada pelo fiscal.',
    detalhe:
      'Pela lei de finanças públicas, o pagamento só pode ser ordenado depois da liquidação. Por isso, para receber em dia, a empresa precisa entregar exatamente o que está no [empenho](/glossario/empenho), emitir a nota fiscal certa e manter as certidões válidas, já que o órgão costuma conferir a regularidade fiscal antes de pagar. O contrato deve trazer o prazo para liquidação e pagamento. O guia [Empenho](/guias/empenho) explica o caminho da entrega até o pagamento.',
    artigo: 'Lei 4.320/1964, arts. 62 e 63',
    relacionados: ['empenho', 'contrato-administrativo', 'certidao-negativa'],
    guia: 'empenho',
  },
  {
    slug: 'garantia-contratual',
    nome: 'Garantia contratual',
    definicao:
      'Garantia contratual é um valor que a empresa vencedora deixa à disposição do governo para cobrir prejuízos caso não cumpra o contrato. Ela só é exigida quando o edital prevê, e a empresa escolhe a forma: caução em dinheiro ou títulos públicos, seguro-garantia, fiança bancária ou título de capitalização.',
    detalhe:
      'Em regra, a garantia vai até 5% do valor inicial do contrato e pode chegar a 10% quando a complexidade e os riscos justificarem; em obras e serviços de engenharia de grande vulto, com [seguro-garantia](/glossario/seguro-garantia) e cláusula de retomada, o limite pode ir a 30%. O valor é devolvido depois que o contrato é cumprido, corrigido quando foi depositado em dinheiro. Inclua o custo da garantia no preço da [proposta](/glossario/proposta) quando o edital exigir.',
    artigo: 'Lei 14.133/2021, arts. 96 a 100',
    relacionados: ['seguro-garantia', 'contrato-administrativo', 'proposta'],
  },
  {
    slug: 'seguro-garantia',
    nome: 'Seguro-garantia',
    definicao:
      'Seguro-garantia é uma apólice contratada pela empresa junto a uma seguradora para assegurar ao governo que as obrigações do contrato serão cumpridas, incluindo multas e indenizações em caso de falha. É uma das formas de garantia contratual e evita que a empresa precise deixar dinheiro parado como caução.',
    detalhe:
      'A apólice deve durar pelo menos o mesmo tempo que o contrato e acompanhar suas prorrogações, e continua valendo mesmo se a empresa atrasar o pagamento do prêmio. Quando a empresa escolhe o seguro-garantia, o edital deve dar pelo menos 1 mês, contado da homologação, para apresentá-lo. Em obras e serviços de engenharia, o edital pode exigir que a seguradora assuma e termine a obra se a contratada falhar. Veja também [garantia contratual](/glossario/garantia-contratual).',
    artigo: 'Lei 14.133/2021, art. 6º, LIV, e arts. 96, 97 e 102',
    relacionados: ['garantia-contratual', 'contrato-administrativo', 'homologacao'],
  },
  {
    slug: 'reequilibrio-economico-financeiro',
    nome: 'Reequilíbrio econômico-financeiro',
    definicao:
      'Reequilíbrio econômico-financeiro é a revisão do preço de um contrato público para restaurar a relação entre custos e pagamento que existia na proposta, quando um fato fora do controle da empresa torna a execução muito mais cara ou inviável, como força maior, caso fortuito ou uma decisão do próprio governo.',
    detalhe:
      'É diferente do [reajuste](/glossario/reajuste), que é automático e segue um índice combinado. No reequilíbrio, a empresa precisa pedir e comprovar o impacto, e o pedido deve ser feito durante a vigência do contrato, antes de eventual prorrogação. A análise respeita a divisão de riscos prevista no contrato, como a [matriz de riscos](/glossario/matriz-de-riscos). Também cabe revisão quando surge ou muda um tributo que afete o preço. A mudança é formalizada por [termo aditivo](/glossario/termo-aditivo).',
    artigo: 'Lei 14.133/2021, art. 124, II, d, e arts. 130, 131 e 134',
    relacionados: ['reajuste', 'matriz-de-riscos', 'termo-aditivo', 'contrato-administrativo'],
  },
  {
    slug: 'reajuste',
    nome: 'Reajuste',
    definicao:
      'Reajuste é a atualização periódica do preço de um contrato público pela aplicação de um índice de correção previsto no edital e no contrato, para acompanhar a variação dos custos ao longo do tempo. Todo edital precisa indicar o índice, com data-base ligada à data do orçamento estimado, mesmo em contratos curtos.',
    detalhe:
      'Em serviços contínuos, o reajuste só vale depois de 1 ano. Quando o serviço depende principalmente de mão de obra, a lei usa a repactuação, que analisa a variação dos custos em planilha em vez de aplicar um índice. Como está previsto no próprio contrato, o reajuste é registrado por simples apostila, sem [termo aditivo](/glossario/termo-aditivo). Não confunda com [reequilíbrio econômico-financeiro](/glossario/reequilibrio-economico-financeiro), que trata de fatos imprevistos.',
    artigo: 'Lei 14.133/2021, art. 6º, LVIII, art. 25, §§ 7º e 8º, e art. 136, I',
    relacionados: ['reequilibrio-economico-financeiro', 'termo-aditivo', 'contrato-administrativo'],
  },
  {
    slug: 'termo-aditivo',
    nome: 'Termo aditivo',
    definicao:
      'Termo aditivo é o documento que formaliza uma mudança em um contrato público já assinado, como aumento ou redução de quantidades, alteração de prazo, troca da forma de pagamento ou revisão de preço. Ele é assinado pelas partes e passa a fazer parte do contrato original, que continua valendo no restante.',
    detalhe:
      'Nas alterações feitas pelo governo, a empresa é obrigada a aceitar acréscimos ou supressões de até 25% do valor inicial atualizado do contrato, ou até 50% de acréscimo em reforma de edifício ou equipamento. A regra é assinar o aditivo antes de executar a mudança; se houver urgência justificada, ele deve ser formalizado em até 1 mês. Mudanças já previstas no contrato, como o [reajuste](/glossario/reajuste), são registradas por apostila, sem aditivo. Os aditivos são publicados no [PNCP](/glossario/pncp).',
    artigo: 'Lei 14.133/2021, arts. 124, 125, 132 e 136',
    relacionados: ['contrato-administrativo', 'reajuste', 'reequilibrio-economico-financeiro'],
  },
  {
    slug: 'me-epp',
    nome: 'ME e EPP',
    definicao:
      'ME e EPP são as microempresas e empresas de pequeno porte, que têm tratamento favorecido nas licitações. Microempresa fatura até R$ 360 mil por ano; empresa de pequeno porte, acima disso e até R$ 4,8 milhões. Entre as vantagens estão o desempate a seu favor, prazo extra para regularizar certidões e disputas exclusivas.',
    detalhe:
      'Se a proposta da ME ou EPP ficar até 10% acima da melhor, ou até 5% no [pregão](/glossario/pregao), ela pode cobrir a oferta e ficar com o contrato. Com certidão fiscal ou trabalhista vencida, tem 5 dias úteis, prorrogáveis, para regularizar depois de vencer. Há ainda itens só para ME e EPP e a [cota reservada](/glossario/cota-reservada). Os benefícios não valem para itens acima do limite de faturamento de EPP. A Lei Complementar 238/2026 muda o valor das disputas exclusivas a partir de 2027.',
    artigo: 'Lei Complementar 123/2006, art. 3º e arts. 42 a 49; Lei 14.133/2021, art. 4º',
    relacionados: ['cota-reservada', 'margem-de-preferencia', 'certidao-negativa', 'licitante'],
    guia: 'me-epp-e-mei',
  },
  {
    slug: 'margem-de-preferencia',
    nome: 'Margem de preferência',
    definicao:
      'Margem de preferência é uma vantagem de preço que o edital pode dar a produtos manufaturados e serviços nacionais que sigam normas técnicas brasileiras, ou a bens reciclados, recicláveis ou biodegradáveis. Com ela, esses produtos podem vencer mesmo custando um pouco mais que os concorrentes, até o percentual definido.',
    detalhe:
      'A margem pode ser de até 10% sobre o preço dos produtos que não se enquadram, e de até 20% para bens e serviços nacionais resultantes de desenvolvimento e inovação tecnológica no país. No caso dos produtos nacionais, ela depende de decisão fundamentada do Poder Executivo federal, e não se aplica se a produção no Brasil não der conta da quantidade comprada. É diferente das vantagens de [ME e EPP](/glossario/me-epp), que dependem do porte da empresa e não da origem do produto.',
    artigo: 'Lei 14.133/2021, art. 26',
    relacionados: ['me-epp', 'menor-preco', 'edital'],
  },
  {
    slug: 'cota-reservada',
    nome: 'Cota reservada',
    definicao:
      'Cota reservada é a parte de uma compra, de até 25% do total, que o governo separa para disputa só entre microempresas e empresas de pequeno porte. Ela é usada na compra de bens divisíveis, como uniformes ou material de escritório, em que dá para dividir a quantidade sem prejudicar o objeto.',
    detalhe:
      'No edital, a cota costuma aparecer como um item separado, com a mesma descrição do item principal e uma quantidade menor, que só [ME e EPP](/glossario/me-epp) podem disputar. A regra pode deixar de ser aplicada, por exemplo, quando não houver pelo menos 3 fornecedores competitivos desse porte na região ou quando o tratamento diferenciado não for vantajoso para a Administração. Confira no [edital](/glossario/edital) quais itens têm cota.',
    artigo: 'Lei Complementar 123/2006, art. 48, III, e art. 49',
    relacionados: ['me-epp', 'edital', 'licitante'],
    guia: 'me-epp-e-mei',
  },
  {
    slug: 'plano-de-contratacoes-anual',
    nome: 'Plano de contratações anual (PCA)',
    definicao:
      'Plano de contratações anual é a lista, preparada por cada órgão público, das compras e contratações que ele pretende fazer no ano seguinte. Ele serve para organizar as compras e alinhar com o orçamento, e deve ser publicado em site oficial, o que permite às empresas saber com antecedência o que o governo planeja comprar.',
    detalhe:
      'Os planos são publicados no [PNCP](/glossario/pncp), onde é possível pesquisar por órgão e por tipo de item. Para quem vende, o PCA é um bom ponto de partida para prospecção: mostra quais órgãos devem comprar o que a empresa oferece e em que época, antes mesmo de o [edital](/glossario/edital) sair. Ele é um planejamento, não uma promessa de compra, e pode mudar ao longo do ano. Veja o guia [PNCP](/guias/pncp).',
    artigo: 'Lei 14.133/2021, art. 12, VII, e § 1º',
    relacionados: ['pncp', 'edital', 'estudo-tecnico-preliminar'],
    guia: 'pncp',
  },
  {
    slug: 'pncp',
    nome: 'PNCP',
    definicao:
      'PNCP é o Portal Nacional de Contratações Públicas, site oficial criado pela Lei 14.133/2021 para reunir as informações de compras da União, dos estados e dos municípios. Nele são publicados planos de contratação, editais, avisos de contratação direta, atas de registro de preços, contratos e termos aditivos, com acesso livre a qualquer pessoa.',
    detalhe:
      'O portal é gerido pelo Comitê Gestor da Rede Nacional de Contratações Públicas, com representantes da União, dos estados e dos municípios, e cada órgão é responsável pelo que publica. Os dados ficam em formato aberto, o que permite a sites como o Edital Map reunir os [editais abertos](/licitacoes) em um mapa. A disputa em si continua acontecendo na plataforma de compras indicada no [edital](/glossario/edital). O guia [PNCP](/guias/pncp) mostra como pesquisar no portal.',
    artigo: 'Lei 14.133/2021, art. 174',
    relacionados: ['edital', 'plano-de-contratacoes-anual', 'ata-de-registro-de-precos', 'sicaf'],
    guia: 'pncp',
  },
  {
    slug: 'sicaf',
    nome: 'SICAF',
    definicao:
      'SICAF é o Sistema de Cadastramento Unificado de Fornecedores, o cadastro de empresas que querem vender ao governo federal. Nele a empresa registra uma vez seus documentos jurídicos, fiscais e econômico-financeiros, e os órgãos consultam o sistema na hora da habilitação em vez de pedir os mesmos papéis em cada licitação.',
    detalhe:
      'O cadastro é feito pela internet, no Compras.gov.br, e é o caminho para disputar as compras federais; estados e municípios que aderem ao sistema também podem usá-lo. A qualificação técnica, como [atestados](/glossario/atestado-de-capacidade-tecnica), continua sendo pedida em cada edital quando necessária. Mantenha as [certidões](/glossario/certidao-negativa) atualizadas no cadastro, porque o órgão confere a situação antes de contratar e de pagar. O passo a passo está no guia [SICAF](/guias/sicaf).',
    artigo: 'Decreto 3.722/2001, art. 1º',
    relacionados: ['habilitacao', 'certidao-negativa', 'cndt', 'pncp'],
    guia: 'sicaf',
  },
  {
    slug: 'certidao-negativa',
    nome: 'Certidão negativa',
    definicao:
      'Certidão negativa é o documento oficial que comprova que a empresa não tem dívidas pendentes com determinado órgão, como a Receita Federal, o estado, o município, o FGTS ou a Justiça do Trabalho. Nas licitações, essas certidões servem para provar a regularidade fiscal, social e trabalhista exigida na habilitação.',
    detalhe:
      'Quando há dívidas parceladas ou suspensas, o órgão emissor pode fornecer uma certidão positiva com efeito de negativa, que tem o mesmo valor para licitar. Cada certidão tem prazo de validade, por isso vale conferir todas antes de cada disputa e mantê-las em dia no [SICAF](/glossario/sicaf). Se a empresa for [ME ou EPP](/glossario/me-epp), há prazo extra para regularizar uma certidão vencida depois de ganhar. Veja também a [CNDT](/glossario/cndt) e o guia [Documentos para licitação](/guias/documentos-para-licitacao).',
    artigo: 'Lei 14.133/2021, art. 68',
    relacionados: ['cndt', 'habilitacao', 'sicaf', 'me-epp'],
    guia: 'documentos-para-licitacao',
  },
  {
    slug: 'cndt',
    nome: 'CNDT',
    definicao:
      'CNDT é a Certidão Negativa de Débitos Trabalhistas, emitida de graça pela internet no site do Tribunal Superior do Trabalho. Ela comprova que a empresa não tem dívidas trabalhistas reconhecidas pela Justiça do Trabalho e não pagas, e é exigida nas licitações para demonstrar a regularidade trabalhista na habilitação.',
    detalhe:
      'A certidão vale por 180 dias a partir da emissão e cobre todos os estabelecimentos e filiais da empresa. Se houver dívida garantida por penhora suficiente ou com cobrança suspensa, sai uma certidão positiva com os mesmos efeitos da negativa. Condenações não pagas ou acordos trabalhistas descumpridos impedem a emissão. Como é rápida de tirar, convém emitir uma nova antes de cada licitação. Veja também [certidão negativa](/glossario/certidao-negativa).',
    artigo: 'CLT, art. 642-A (incluído pela Lei 12.440/2011); Lei 14.133/2021, art. 68, V',
    relacionados: ['certidao-negativa', 'habilitacao', 'sicaf'],
    guia: 'documentos-para-licitacao',
  },
  {
    slug: 'atestado-de-capacidade-tecnica',
    nome: 'Atestado de capacidade técnica',
    definicao:
      'Atestado de capacidade técnica é um documento emitido por um cliente, público ou privado, declarando que a empresa já forneceu produtos ou prestou serviços parecidos com os da licitação, em quantidade e qualidade adequadas. Ele é usado na habilitação para provar que a empresa tem experiência para cumprir o contrato.',
    detalhe:
      'A lei limita o que o edital pode pedir: atestados só para as parcelas de maior relevância, as que valem pelo menos 4% do total estimado, e com quantidade mínima de até 50% dessas parcelas, sem limitar época ou local. Em serviços contínuos, o edital pode exigir experiência de até 3 anos. Peça atestados a cada fornecimento bem feito, com descrição, quantidades e datas. O guia [Atestado de capacidade técnica](/guias/atestado-de-capacidade-tecnica) traz um modelo.',
    artigo: 'Lei 14.133/2021, art. 67',
    relacionados: ['habilitacao', 'consorcio', 'subcontratacao'],
    guia: 'atestado-de-capacidade-tecnica',
  },
  {
    slug: 'matriz-de-riscos',
    nome: 'Matriz de riscos',
    definicao:
      'Matriz de riscos é a cláusula do contrato que lista os eventos que podem acontecer depois da assinatura e afetar os custos, e define quem arca com cada um: o governo ou a empresa. Ela registra o equilíbrio econômico-financeiro inicial e serve de base para decidir pedidos de revisão do preço.',
    detalhe:
      'A matriz é opcional na maioria das contratações, mas obrigatória em obras e serviços de grande vulto e nos regimes de contratação integrada e semi-integrada. Quando há matriz, o orçamento pode incluir uma taxa de risco compatível com os riscos atribuídos à empresa. Leia essa cláusula antes de fazer a [proposta](/glossario/proposta): um risco que fica com a empresa normalmente não dá direito a [reequilíbrio econômico-financeiro](/glossario/reequilibrio-economico-financeiro) depois.',
    artigo: 'Lei 14.133/2021, art. 6º, XXVII, e art. 22',
    relacionados: ['reequilibrio-economico-financeiro', 'contrato-administrativo', 'proposta'],
  },
];
