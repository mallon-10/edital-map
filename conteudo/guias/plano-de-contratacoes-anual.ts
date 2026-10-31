import type { Guia } from '../tipos';

export const guia: Guia = {
  slug: 'plano-de-contratacoes-anual',
  titulo: 'Plano de contratações anual: como consultar o PCA no PNCP',
  descricao: 'Plano de contratações anual (PCA): o que é, como consultar no PNCP e como usar o plano anual de contratações para se preparar antes do edital sair.',
  resposta:
    'O plano de contratações anual (PCA) é o documento em que o órgão público reúne o que pretende comprar no ano seguinte. Ele sai no PNCP antes dos editais, com itens, valores estimados e data desejada. Para o fornecedor, é uma prévia para se preparar, mas não obriga o órgão a comprar.',
  revisadoEm: '2026-10-31',
  secoes: [
    {
      titulo: 'O que é o plano de contratações anual?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O [plano de contratações anual](/glossario/plano-de-contratacoes-anual) é o documento que consolida o que o órgão planeja contratar no ano seguinte ao da sua elaboração (Decreto 10.947/2022, art. 2º, V). Ele é previsto no art. 12, VII, da Lei 14.133/2021. O TCU lembra que alguns normativos ainda usam o nome plano anual de contratações (PAC). É o mesmo plano.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O plano precisa ser divulgado em sítio eletrônico oficial (Lei 14.133, art. 12, § 1º), e o [PNCP](/guias/pncp) reúne esses planos (art. 174, § 2º, I). No governo federal, as regras estão no Decreto 10.947/2022, e o plano é feito no sistema PGC.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Um dos objetivos escritos no decreto interessa diretamente a quem vende: "sinalizar intenções ao mercado fornecedor", para aumentar o diálogo com o mercado e a competição (art. 5º, V).',
        },
      ],
    },
    {
      titulo: 'Por que o PCA interessa a quem vende ao governo?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Quando o [edital](/glossario/edital) sai, o tempo é curto. Na compra de bens por menor preço, o prazo mínimo até a proposta é de 8 dias úteis (Lei 14.133, art. 55, I, a). Na dispensa com aviso, são pelo menos 3 dias úteis (art. 75, § 3º). Atestado, certidão, amostra e preço de fornecedor nem sempre ficam prontos nesse prazo.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O PCA dá meses de vantagem. O plano 2026 da Anatel, por exemplo, foi publicado no PNCP em 12 de maio de 2025 e somava, em outubro de 2026, 259 itens e R$ 90.983.495,70 estimados. Na sede do órgão, um dos itens era a classe 7195, de mobiliários diversos, com R$ 100.000,00 e data desejada de 1º de junho de 2026.',
        },
      ],
    },
    {
      titulo: 'O que aparece no PCA?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O plano inclui todas as contratações previstas para o ano, também as diretas por [dispensa](/guias/dispensa-de-licitacao) e [inexigibilidade](/guias/inexigibilidade-de-licitacao) (Decreto 10.947, art. 6º, I). O arquivo que o PNCP oferece para download traz estas informações:',
        },
        {
          tipo: 'lista',
          itens: [
            'Unidade responsável e código [UASG](/glossario/uasg).',
            'Categoria do item, como material ou serviço.',
            'Nome e identificador da futura contratação.',
            'Classe ou grupo do catálogo, com código e descrição do item quando informados ([CATMAT](/glossario/catmat) e [CATSER](/glossario/catser)).',
            'Quantidade, valor unitário e valor total estimados.',
            'Data desejada.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Dois cuidados de leitura. A data desejada é a data pretendida para concluir a contratação (art. 8º, V), então o edital tende a sair antes dela. E o detalhe pode parar na classe do material ou no grupo do serviço (art. 8º, parágrafo único), sem o item exato.',
        },
      ],
    },
    {
      titulo: 'Quando o PCA é publicado?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto: 'No governo federal, o calendário do Decreto 10.947/2022 é este:',
        },
        {
          tipo: 'lista',
          itens: [
            'Até 1º de abril: as áreas registram os pedidos no documento de formalização de demanda (art. 10).',
            'Até 30 de abril: o setor de contratações consolida o plano (art. 11, § 3º).',
            'Até a primeira quinzena de maio: a autoridade aprova, e o plano vai automaticamente para o PNCP (arts. 12 e 14).',
            'De 15 de setembro a 15 de novembro: revisão para ajustar à proposta orçamentária (art. 15, I).',
            'Na quinzena depois da Lei Orçamentária Anual: ajuste ao orçamento aprovado (art. 15, II).',
            'No ano de execução: alterações com justificativa aprovada (art. 16).',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Na prática, vale olhar o plano em maio e de novo no começo do ano da compra. Em 31 de outubro de 2026, o PNCP já mostrava planos de 2027. Estados e prefeituras podem ter datas próprias.',
        },
      ],
    },
    {
      titulo: 'Como consultar o PCA no PNCP?',
      blocos: [
        {
          tipo: 'passos',
          itens: [
            'Abra [Planos de Contratações Anuais](https://pncp.gov.br/app/pca) no PNCP. Em 31 de outubro de 2026, a página listava 11.536 planos.',
            'Use os filtros de ano, órgão, esfera e poder e clique em "Pesquisar".',
            'Abra o plano do órgão. A página mostra o valor total estimado, a quantidade de itens e as unidades.',
            'Em "Detalhar", veja os itens de cada unidade, com classe ou grupo, valor e data desejada.',
            'Clique em "Baixar arquivo" para receber a relação de itens em CSV.',
            'Abra o CSV numa planilha e filtre pela classe e pela descrição do que você vende.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'A palavra-chave da página não serve para varrer os itens. Em teste de 31 de outubro de 2026, "uniforme" trouxe só 3 planos, todos do Comando da Marinha. O caminho seguro é escolher o órgão e olhar o plano dele.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Os órgãos federais também devem colocar no próprio site o endereço do plano no PNCP, em até 15 dias depois de cada aprovação, revisão ou alteração (Decreto 10.947, art. 14, parágrafo único).',
        },
      ],
    },
    {
      titulo: 'Como usar o PCA para se preparar?',
      blocos: [
        {
          tipo: 'passos',
          itens: [
            'Liste os órgãos que compram o que você vende. Comece pelos da sua região e veja quem aparece na [busca](/) com editais do seu ramo.',
            'Baixe os planos desses órgãos e separe os itens do seu ramo, com valor, quantidade e data desejada.',
            'Monte um calendário por mês. Ele mostra quando reforçar estoque, pedir cotação ao seu fornecedor e reservar capacidade.',
            'Veja o tamanho da compra. Valores menores podem virar [dispensa eletrônica](/glossario/dispensa-eletronica), e os limites para [ME e EPP](/guias/me-epp-e-mei) podem reservar a disputa.',
            'Adiante a papelada: [SICAF](/guias/sicaf), [certidões](/glossario/certidao-negativa) e [atestado de capacidade técnica](/guias/atestado-de-capacidade-tecnica).',
            'Estude o preço antes do edital. Compare com compras parecidas no [painel de preços](/guias/painel-de-precos) e monte sua [proposta](/guias/proposta-de-precos) com calma.',
            'Fique atento à fase de planejamento do órgão. Ele pode pedir cotação direta a fornecedores (Lei 14.133, art. 23, § 1º, IV) e fazer audiência ou consulta pública (art. 21).',
          ],
        },
      ],
    },
    {
      titulo: 'Quais são os limites do PCA?',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            'Não é edital. Não dá para mandar proposta com base no plano, e ele não obriga a compra. O TCU registra que, no planejamento, a contratação pode mudar ou até se mostrar inviável.',
            'Os valores são preliminares, feitos por procedimento simplificado (art. 8º, IV). Não use o valor do PCA como preço de proposta.',
            'A compra pode mudar de data ou sair do plano. O que não for feito no ano precisa de justificativa e, se ainda for necessário, passa ao plano seguinte (art. 19, § 3º).',
            'Nem tudo aparece. Ficam fora informações sigilosas, suprimento de fundos, as dispensas do art. 75, VI, VII e VIII, e as pequenas compras de pronto pagamento (art. 7º).',
            'O plano pode ganhar itens: demanda nova e justificada leva à revisão dele (art. 17, parágrafo único).',
            'Nem todo órgão publica. A lei diz que os entes "poderão" elaborar o plano, e o decreto vale para o governo federal, com dispensa aos comandos militares (art. 1º).',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Mesmo contratações pequenas passam por esse filtro: quem publica no [Contrata+Brasil](/guias/contrata-mais-brasil) informa se a compra estava prevista no plano (IN SEGES/MGI nº 52/2025, art. 15, § 1º, III).',
        },
      ],
    },
    {
      titulo: 'Como o Edital Map ajuda?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O Edital Map não mostra os planos. Ele cuida da etapa seguinte: a [busca e o mapa](/), grátis, trazem os editais abertos do PNCP, atualizados a cada 3 horas. Compare o que está no plano com o que já virou compra em páginas como [uniformes](/licitacoes/uniformes) e [EPI](/licitacoes/epi).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Para ser avisado quando o edital sair, os Alertas por e-mail são do plano [Pro](/planos). Para conhecer outros caminhos, leia [onde encontrar licitações](/guias/onde-encontrar-licitacoes).',
        },
      ],
    },
  ],
  editais: ['/licitacoes', '/licitacoes/pregao-eletronico', '/licitacoes/uniformes', '/licitacoes/epi'],
  perguntas: [
    {
      pergunta: 'O que é PCA em licitação?',
      resposta:
        'PCA é o plano de contratações anual: a lista do que o órgão pretende contratar no ano seguinte. Ele é publicado antes dos editais e aparece no PNCP.',
    },
    {
      pergunta: 'Plano anual de contratações e plano de contratações anual são a mesma coisa?',
      resposta:
        'Sim. A Lei 14.133 e o Decreto 10.947/2022 usam plano de contratações anual. Plano anual de contratações é o nome que ainda aparece em alguns normativos, segundo o TCU.',
    },
    {
      pergunta: 'Onde consultar o PCA de um órgão?',
      resposta:
        'Em pncp.gov.br/app/pca. Filtre por ano e órgão, abra o plano e baixe o arquivo CSV com os itens. Órgãos federais também devem indicar o endereço no próprio site.',
    },
    {
      pergunta: 'O órgão é obrigado a comprar o que está no PCA?',
      resposta:
        'Não. O PCA é planejamento. Itens podem ser alterados, e o que não for contratado no ano precisa ser justificado, podendo passar ao plano seguinte (Decreto 10.947, arts. 16 e 19).',
    },
    {
      pergunta: 'Prefeitura precisa ter PCA?',
      resposta:
        'A Lei 14.133 diz que os entes "poderão" elaborar o plano (art. 12, VII). O Decreto 10.947 vale para o governo federal. Veja a regra local e procure o plano no PNCP ou no site da prefeitura.',
    },
    {
      pergunta: 'Quando sai o PCA do ano seguinte?',
      resposta:
        'No governo federal, o plano é aprovado até a primeira quinzena de maio do ano anterior e vai automaticamente ao PNCP. Depois, pode ser revisto de 15 de setembro a 15 de novembro.',
    },
  ],
  fontes: [
    { nome: 'Lei nº 14.133/2021 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14133.htm' },
    { nome: 'Decreto nº 10.947/2022 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/decreto/D10947.htm' },
    { nome: 'Planos de Contratações Anuais (PNCP)', url: 'https://pncp.gov.br/app/pca' },
    { nome: 'PCA 2026 da Anatel (PNCP)', url: 'https://pncp.gov.br/app/pca/02030715000112/2026' },
    {
      nome: 'Plano de contratações anual: manual de Licitações e Contratos (TCU)',
      url: 'https://licitacoesecontratos.tcu.gov.br/2-3-2-3-plano-de-contratacoes-anual-pca/',
    },
    {
      nome: 'PGC: Sistema de Planejamento e Gerenciamento de Contratações (Portal de Compras do Governo Federal)',
      url: 'https://www.gov.br/compras/pt-br/sistemas/conheca-o-compras/sistema-de-planejamento-e-gerenciamento-de-contratacoes',
    },
    {
      nome: 'Instrução Normativa SEGES/MGI nº 52/2025, atualizada (Contrata+Brasil)',
      url: 'https://www.gov.br/contratamaisbrasil/pt-br/central-de-conteudo/editais-e-regulamentacao/instrucoes-normativas/instrucao-normativa-seges-mgi-no-52-de-10-de-fevereiro-de-2025',
    },
  ],
  relacionados: ['pncp', 'onde-encontrar-licitacoes', 'proposta-de-precos', 'contrata-mais-brasil'],
};
