import type { Guia } from '../tipos';

export const guia: Guia = {
  slug: 'painel-de-precos',
  titulo: 'Painel de Preços: onde consultar preços do governo hoje',
  descricao:
    'O Painel de Preços parou em 2025. Veja como consultar quanto o governo pagou no Pesquisa de Preços Lite, o banco de preços da saúde e a IN 65/2021.',
  resposta:
    'O Painel de Preços era a ferramenta federal para consultar quanto o governo pagou por um item. Ele deixou de ser atualizado em julho de 2025 e foi substituído pelo Pesquisa de Preços Lite, em pesquisaprecos.compras.gov.br, gratuito e sem login, que mostra preços homologados no Compras.gov.br nos últimos 12 meses, com média, mediana e menor preço.',
  revisadoEm: '2026-10-31',
  secoes: [
    {
      titulo: 'O Painel de Preços ainda existe?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Como fonte atual, não. O Comunicado nº 30/25 do Portal de Compras, de 26 de agosto de 2025, avisou que o Painel de Preços e o Painel de Compras não são mais atualizados desde julho de 2025. Os últimos dados são de 4 de julho daquele ano.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Em junho de 2026, o governo anunciou o [Pesquisa de Preços Lite](https://pesquisaprecos.compras.gov.br/). A notícia oficial diz que a ferramenta "substitui o antigo Painel de Preços". Em 31/10/2026, o endereço antigo (paineldeprecos.planejamento.gov.br) não abriu nos nossos testes. Se você tem esse link salvo, troque pelo novo.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O nome antigo continua nas normas, e isso gera confusão. A Lei 14.133/2021 fala em "painel para consulta de preços" (art. 23, § 1º, I), e a IN SEGES/ME nº 65/2021 cita o Painel de Preços (art. 5º, I). A ferramenta mudou, mas a regra da pesquisa de preços continua.',
        },
      ],
    },
    {
      titulo: 'Onde consultar quanto o governo pagou?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto: 'A [página oficial de Pesquisa de Preços](https://www.gov.br/compras/pt-br/sistemas/conheca-o-compras/pesquisa-de-precos) lista três caminhos:',
        },
        {
          tipo: 'lista',
          itens: [
            'Pesquisa de Preços Lite: qualquer pessoa consulta compras homologadas no [Compras.gov.br](/guias/compras-gov-br), sem login nem cadastro. É o caminho do fornecedor.',
            'Pesquisa de Preços da área logada: feita para gestores e compradores públicos que estimam o custo das contratações.',
            'Dados abertos: uma busca que extrai os dados do portal federal, com filtro pelo código [CATMAT](/glossario/catmat) (materiais) ou [CATSER](/glossario/catser) (serviços), para baixar o histórico.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Um limite importante: o Lite reúne contratações feitas pelo sistema Compras.gov.br. A compra de uma prefeitura que usa [outra plataforma](/guias/plataformas-de-licitacao) pode ficar de fora. Nesse caso, procure [atas](/guias/ata-de-registro-de-precos) e contratos parecidos no [PNCP](/guias/pncp).',
        },
      ],
    },
    {
      titulo: 'Como consultar, passo a passo',
      blocos: [
        {
          tipo: 'passos',
          itens: [
            'Abra o Pesquisa de Preços Lite e clique em Nova Pesquisa. Para salvar a consulta, entre com a conta gov.br. O login não é obrigatório, mas sem ele os dados se perdem ao sair da tela.',
            'Preencha o título e as observações e siga para Itens.',
            'Clique em Adicionar Item, descreva o produto em poucas palavras e escolha Material ou Serviço. O sistema mostra o catálogo oficial: M antes do nome indica material, e S indica serviço.',
            'Selecione o item, informe quantidade, unidade de fornecimento e características. Clique em + para incluir.',
            'Escolha o método de cálculo: menor preço, média ou mediana. Ao lado aparecem coeficiente de variação, desvio padrão e maior preço.',
            'Abra as compras listadas. Cada uma traz número do processo, modalidade, fornecedor, marca e critério de julgamento. Na coluna Compor, você tira do cálculo uma compra que não serve de comparação.',
            'Na aba Resumo, gere o relatório resumido ou o detalhado em PDF, ou exporte os dados em CSV.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'A tela inicial da ferramenta também cita filtros por local da contratação, valores homologados e intervalos de quantidade. As telas podem mudar: o manual do usuário está na página de [Manuais do Portal de Compras](https://www.gov.br/compras/pt-br/acesso-a-informacao/manuais).',
        },
      ],
    },
    {
      titulo: 'Quais cuidados tomar ao ler os preços?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Um preço pago por outro órgão só serve de comparação se a compra for parecida com a sua. A própria IN 65 manda observar as condições comerciais: prazo e local de entrega, quantidade, forma de pagamento, frete, garantias e marca e modelo, quando for o caso (art. 4º). Confira:',
        },
        {
          tipo: 'lista',
          itens: [
            'Quantidade: a lei considera as quantidades e a economia de escala (art. 23). Quem compra um lote grande costuma ter outra condição de preço. Compare faixas de quantidade próximas.',
            'Região: a lei também considera as peculiaridades do local (art. 23). Entrega longe muda o frete, então filtre pelo local da compra.',
            'Data: o histórico do Lite cobre 12 meses. Em compras similares, a IN 65 fala em contratações do último ano, com o índice de atualização de preços (art. 5º, II).',
            'Marca e especificação: abra a compra e veja a marca. Duas luvas no mesmo código podem ter marcas e condições diferentes.',
            'Unidade de fornecimento: o manual dá o exemplo da caixa com 50 unidades. Antes de comparar, converta para a mesma unidade.',
            'Preços muito diferentes: a IN 65 pede análise crítica quando há grande variação (art. 6º, § 4º). Um coeficiente de variação alto é sinal para abrir as compras uma a uma.',
          ],
        },
      ],
    },
    {
      titulo: 'O que dizem o art. 23 e a IN 65/2021?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O art. 23 da Lei 14.133/2021 manda que o valor estimado da contratação seja compatível com os preços de mercado. Para bens e serviços em geral, o § 1º traz cinco parâmetros, usados juntos ou separados:',
        },
        {
          tipo: 'lista',
          itens: [
            'Custos menores ou iguais à mediana do item no painel para consulta de preços ou no banco de preços em saúde.',
            'Contratações similares da Administração, em execução ou concluídas no último ano, inclusive por [registro de preços](/glossario/sistema-de-registro-de-precos).',
            'Mídia especializada, tabela de referência aprovada pelo Poder Executivo federal e sites especializados ou de domínio amplo, com data e hora de acesso.',
            'Pesquisa direta com pelo menos 3 fornecedores, com orçamentos de até 6 meses antes da divulgação do edital.',
            'Base nacional de notas fiscais eletrônicas.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'A IN SEGES/ME nº 65/2021 detalha isso para a administração federal direta, autárquica e fundacional. Ela vale também para estados e municípios que usam recursos da União vindos de transferências voluntárias (art. 1º, § 2º), e não se aplica a obras e serviços de engenharia (art. 1º, § 1º).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Pela IN, os dois primeiros parâmetros têm prioridade (art. 5º, § 1º). O preço estimado sai da média, da mediana ou do menor valor de três ou mais preços, sem os inexequíveis, os inconsistentes e os excessivamente elevados (art. 6º). Se o preço vier só dos sistemas oficiais, não pode passar da mediana do item (art. 6º, § 6º).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Em obras e serviços de engenharia, a ordem é outra e começa pelo Sicro, para infraestrutura de transportes, ou pelo Sinapi, para as demais (art. 23, § 2º). Estados e municípios podem usar sistemas de custos próprios quando não há recursos da União (art. 23, § 3º).',
        },
      ],
    },
    {
      titulo: 'Como o fornecedor usa esses dados?',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            'Decidir se vale disputar: compare a mediana com o seu custo. A proposta acima do orçamento estimado é desclassificada (art. 59, III).',
            'Lidar com orçamento sigiloso: o órgão pode manter o valor em sigilo, com justificativa (art. 24). A consulta não revela esse número, mas mostra a faixa de preços de compras parecidas.',
            'Evitar preço baixo demais: o preço inexequível também desclassifica. Veja o guia de [preço inexequível](/guias/preco-inexequivel).',
            'Conhecer a concorrência: cada compra mostra fornecedor e marca, então você vê quem vendeu e com qual produto.',
            'Responder a pedidos de cotação: o órgão pode pedir o seu orçamento (art. 23, § 1º, IV). Mande descrição, valor unitário e total, CNPJ, endereço, telefone, data e responsável (IN 65, art. 5º, § 2º, II).',
            'Provar preço em contratação direta: quando o órgão não consegue estimar o valor, o contratado comprova o preço com notas fiscais emitidas a outros contratantes no último ano, ou outro meio idôneo (art. 23, § 4º). Veja o guia de [dispensa de licitação](/guias/dispensa-de-licitacao).',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'O preço do governo é referência, não é o seu custo. A conta de frete, impostos e margem está no guia de [proposta de preços](/guias/proposta-de-precos). Veja também [sobrepreço](/glossario/sobrepreco) e [inexequibilidade](/glossario/inexequibilidade).',
        },
      ],
    },
    {
      titulo: 'Banco de preços é a mesma coisa?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto: 'Não. "Banco de preços" pode significar coisas diferentes:',
        },
        {
          tipo: 'lista',
          itens: [
            'Banco de Preços em Saúde (BPS): plataforma do Ministério da Saúde com compras públicas e privadas de medicamentos e dispositivos médicos. É o banco citado no art. 23. O acesso é gratuito, pelo [Painel de Preços da Saúde](https://www.gov.br/saude/pt-br/acesso-a-informacao/banco-de-precos/painel) ou por bases anuais em CSV.',
            'Ferramentas privadas: empresas vendem serviços de pesquisa de preços com esse nome ou nome parecido. São produtos comerciais, não sistemas do governo. A consulta oficial é gratuita.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Atenção ao nome: o Painel de Preços da Saúde segue no site do Ministério da Saúde e não é o painel federal que parou em 2025.',
        },
      ],
    },
    {
      titulo: 'Como o Edital Map ajuda',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O Edital Map não mostra preços pagos: para isso, use as ferramentas oficiais acima. Ele resolve a etapa anterior, que é achar a compra. Na [busca e no mapa](/), grátis, você vê os editais abertos do PNCP, atualizados a cada 3 horas. Em [/licitacoes](/licitacoes) estão as páginas por assunto, modalidade e estado.',
        },
        {
          tipo: 'paragrafo',
          texto: 'Para receber por e-mail os editais novos do seu ramo, há os Alertas do plano [Pro](/planos). As regras de cada compra estão sempre no edital oficial.',
        },
      ],
    },
  ],
  editais: ['/licitacoes', '/licitacoes/pregao-eletronico', '/licitacoes/dispensa', '/licitacoes/epi', '/licitacoes/hospitalar'],
  perguntas: [
    {
      pergunta: 'O Painel de Preços saiu do ar?',
      resposta:
        'Ele não é atualizado desde julho de 2025, segundo o Comunicado nº 30/25 do Portal de Compras, e o governo informa que o Pesquisa de Preços Lite o substitui. Em 31/10/2026, o endereço antigo não abriu nos nossos testes.',
    },
    {
      pergunta: 'Qual é o site do Pesquisa de Preços?',
      resposta:
        'O Pesquisa de Preços Lite fica em pesquisaprecos.compras.gov.br. É gratuito e não exige login. Com a conta gov.br, você pode salvar as pesquisas.',
    },
    {
      pergunta: 'Fornecedor pode usar o Pesquisa de Preços Lite?',
      resposta:
        'Pode. O manual do usuário cita cidadãos, fornecedores, pesquisadores e gestores públicos como público da ferramenta. Ela mostra, em cada compra, fornecedor, marca e modalidade.',
    },
    {
      pergunta: 'O Pesquisa de Preços Lite mostra compras de prefeituras?',
      resposta:
        'Mostra as contratações feitas pelo sistema Compras.gov.br. A prefeitura que compra em outra plataforma pode não aparecer. Nesse caso, procure atas e contratos parecidos no PNCP.',
    },
    {
      pergunta: 'Banco de preços é a mesma coisa que Painel de Preços?',
      resposta:
        'Não. O Banco de Preços em Saúde (BPS) é do Ministério da Saúde e trata de medicamentos e dispositivos médicos. Também existem ferramentas privadas e pagas com nome parecido, que não são sistemas do governo.',
    },
    {
      pergunta: 'Qual a diferença entre média, mediana e menor preço?',
      resposta:
        'São os três métodos da IN 65/2021 (art. 6º), sempre sobre três ou mais preços. A média é a soma dividida pelo número de preços, a mediana é o valor do meio da lista, e o menor preço é o mais baixo dela.',
    },
  ],
  fontes: [
    { nome: 'Lei nº 14.133/2021 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm' },
    {
      nome: 'Instrução Normativa SEGES/ME nº 65/2021 (Portal de Compras do Governo Federal)',
      url: 'https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-me-no-65-de-7-de-julho-de-2021',
    },
    {
      nome: 'Comunicado nº 30/25: dados do Painel de Preços deixam de ser atualizados (Portal de Compras)',
      url: 'https://www.gov.br/compras/pt-br/acesso-a-informacao/comunicados/2025/no-30-25-dados-do-painel-de-precos-e-do-painel-de-compras-deixam-de-ser-atualizados',
    },
    {
      nome: 'Sistema Compras.gov.br ganha novas ferramentas (Portal de Compras, 25/06/2026)',
      url: 'https://www.gov.br/compras/pt-br/acesso-a-informacao/noticias/sistema-compras-gov-br-ganha-novas-ferramentas-para-ampliar-transparencia-e-modernizar-licitacoes',
    },
    {
      nome: 'Comunicado nº 43/26: Pesquisa de Preços Lite com login gov.br (Portal de Compras)',
      url: 'https://www.gov.br/compras/pt-br/acesso-a-informacao/comunicados/2026/no-43-26-2013-pesquisa-de-precos-lite-acesso-com-login-gov-br-para-salvar-as-pesquisas',
    },
    {
      nome: 'Pesquisa de Preços (Portal de Compras do Governo Federal)',
      url: 'https://www.gov.br/compras/pt-br/sistemas/conheca-o-compras/pesquisa-de-precos',
    },
    { nome: 'Pesquisa de Preços Lite (Compras.gov.br)', url: 'https://pesquisaprecos.compras.gov.br/' },
    { nome: 'Manuais (Portal de Compras do Governo Federal)', url: 'https://www.gov.br/compras/pt-br/acesso-a-informacao/manuais' },
    { nome: 'Banco de Preços em Saúde (Ministério da Saúde)', url: 'https://www.gov.br/saude/pt-br/acesso-a-informacao/banco-de-precos' },
  ],
  relacionados: ['proposta-de-precos', 'preco-inexequivel', 'ata-de-registro-de-precos', 'compras-gov-br'],
};
