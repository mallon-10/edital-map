import type { Guia } from '../tipos';
import { DECRETO_VALORES, VALORES } from '../valores';

export const guia: Guia = {
  slug: 'contrata-mais-brasil',
  titulo: 'Contrata Mais Brasil: como funciona e como o MEI se cadastra',
  descricao: 'Contrata Mais Brasil: o que é, quem pode participar, como cadastrar o MEI, limite por serviço, escolha da proposta, pagamento e avisos por WhatsApp.',
  resposta: `Contrata Mais Brasil (Contrata+Brasil) é a plataforma do governo federal em que órgãos públicos publicam demandas e fornecedores mandam proposta, sem o rito da licitação tradicional. Nas linhas de serviços, só MEI participa, com limite de ${VALORES.contratoVerbal} por demanda. Em alimentos, entram agricultores, cooperativas e empresas de qualquer porte. O cadastro é gratuito, pela conta gov.br.`,
  revisadoEm: '2026-10-31',
  secoes: [
    {
      titulo: 'O que é o Contrata Mais Brasil?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O Contrata+Brasil, também buscado como Contrata Mais Brasil ou Contrata Brasil, é a plataforma de negócios públicos do governo federal. Ele foi criado pela Instrução Normativa SEGES/MGI nº 52, de 10 de fevereiro de 2025 (art. 1º), alterada pela IN SEGES/MGI nº 460/2025. É um módulo do Siasg, o sistema de compras federal, em formato de comércio eletrônico.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'A lógica é simples: o órgão publica uma oportunidade, os fornecedores inscritos mandam preço e o órgão escolhe. O MEI não precisa ler um [edital](/glossario/edital) por compra, porque a Central de Compras do MGI já fez um edital geral para cada linha de fornecimento.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'A base legal é o [credenciamento](/glossario/credenciamento) em mercados fluidos (Lei 14.133/2021, art. 79, III, e Decreto 11.878/2024, art. 3º, III), com contratação por [inexigibilidade](/glossario/inexigibilidade) (art. 74, IV). Nos alimentos da agricultura familiar, são chamadas públicas do PAA e do PNAE. O credenciamento não obriga o órgão a contratar (Decreto 11.878/2024, art. 4º).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Em junho de 2026, o Ministério da Gestão informou 12,9 mil MEIs, 3,3 mil agricultores familiares, mais de 1.840 órgãos aderidos e mais de R$ 26,4 milhões movimentados. Em 31 de outubro de 2026, a plataforma listava 482 oportunidades.',
        },
      ],
    },
    {
      titulo: 'Quem pode participar? MEI entra?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto: 'Sim. O MEI é o público principal, mas a resposta depende da linha de fornecimento:',
        },
        {
          tipo: 'lista',
          itens: [
            'Manutenção e pequenos reparos: só MEI (Edital de Credenciamento 03/2025).',
            'Eventos e ações institucionais: só MEI (Edital de Credenciamento 03/2026).',
            'Alimentos por credenciamento: qualquer fornecedor, inclusive agricultor familiar, produtor rural pessoa física, MEI e cooperativa (Edital de Credenciamento 06/2025).',
            'Alimentos por chamada pública: compra institucional do PAA e alimentação escolar do PNAE, voltadas à agricultura familiar.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Microempresa ou empresa de pequeno porte de serviços não completa a inscrição nas duas linhas de MEI. Para ela, os caminhos são a [dispensa de licitação](/guias/dispensa-de-licitacao) e o [pregão eletrônico](/guias/pregao-eletronico). Veja as diferenças em [ME, EPP e MEI](/guias/me-epp-e-mei).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Do lado de quem compra estão órgãos federais e, por adesão, estados, municípios, outros Poderes, empresas públicas e entidades sem fins lucrativos que recebem recursos públicos (IN 52, art. 1º, parágrafo único). Escolas do Programa Dinheiro Direto na Escola também contratam pequenos reparos pela plataforma.',
        },
      ],
    },
    {
      titulo: 'O que dá para vender pelo Contrata+Brasil?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A plataforma começou com 47 tipos de serviço, passou a 107 em abril de 2026 e a 141 em junho, segundo o Ministério da Gestão. O portal Empresas & Negócios fala em mais de 300 ocupações do MEI aptas. Confira a sua na [lista oficial de ocupações](https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/contrata-brasil/consultar-ocupacoes).',
        },
        {
          tipo: 'lista',
          itens: [
            'Manutenção: eletricista, encanador, pedreiro, pintor, jardineiro, reparo de ar-condicionado e de móveis.',
            'Serviços incluídos em 2026: mecânico, borracheiro, costureiro e instalador de rede de computadores.',
            'Eventos: cozinheiro, confeiteiro, fotógrafo, DJ, maquiador e animador de festas.',
            'Alimentos: gêneros alimentícios para órgãos, escolas e programas públicos.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Os editais de serviços tratam de trabalho pontual, sem dedicação exclusiva de mão de obra. Entre os mais procurados, o ministério cita pequenas obras civis, manutenção de ar-condicionado e serviços de pedreiro e azulejista.',
        },
      ],
    },
    {
      titulo: 'Como fazer o cadastro no Contrata+Brasil?',
      blocos: [
        {
          tipo: 'passos',
          itens: [
            'Tenha uma conta gov.br. A carta de serviço aceita os níveis bronze, prata e ouro.',
            'Abra a [plataforma](https://contratamaisbrasil.sistema.gov.br/). Olhar as oportunidades não exige inscrição (IN 52, art. 30).',
            'Clique em "Entrar com gov.br". No menu, vá em "Minhas Empresas" e "Cadastrar empresa".',
            'Digite o CNPJ. Se a empresa ainda não tem [SICAF](/guias/sicaf), a própria plataforma faz esse cadastro (IN 52, art. 32, § 1º).',
            'Selecione os serviços que você faz, confira o endereço e informe o WhatsApp.',
            'Autorize os avisos por WhatsApp, aceite os termos e clique em "Inscrever empresa".',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'A inscrição é gratuita (Edital 03/2025, item 2.1) e só precisa ser feita uma vez. Se o sistema disser que você não presta o serviço de uma oportunidade, acrescente esse serviço em "Minhas Empresas". Desconfie de quem cobra taxa em nome do governo.',
        },
      ],
    },
    {
      titulo: 'Como funciona a escolha do fornecedor?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto: 'Nas linhas de serviços, o caminho é este:',
        },
        {
          tipo: 'passos',
          itens: [
            'O órgão publica a oportunidade com serviço, local, quantidade, prazo de execução, forma e prazo de pagamento. Esse formulário também informa se a compra estava no [plano de contratações anual](/guias/plano-de-contratacoes-anual).',
            'Você tira dúvidas na própria oportunidade e pode pedir vistoria do local (Edital 03/2025, item 3.13).',
            'Você envia o preço total, com materiais, equipamentos, EPI e fardamento (item 3.9). Erro de cálculo fica por sua conta (item 3.10).',
            'Até o fim do prazo, dá para mudar o valor. Não há fase de lances, e o órgão não vê quem propôs (IN 52, art. 20).',
            'A plataforma ordena as propostas do menor para o maior preço (item 3.15). Quem é local ou regional tem prioridade se estiver até 10% acima (IN 52, art. 18).',
            'O órgão escolhe a proposta mais vantajosa e pode considerar preço, prazo e qualificação, com justificativa (item 3.17). Em caso de empate, há sorteio (item 3.19).',
            'Só então vem a [habilitação](/glossario/habilitacao), feita pelo SICAF: CCMEI, CNPJ, Fazenda Nacional, FGTS, [CNDT](/glossario/cndt) e, quando exigível, fazendas estadual e municipal (item 4.1).',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'O órgão tem até 5 dias úteis para analisar os documentos e não pode pedir nada além do edital. Se pedir ajustes, o prazo é de até 2 dias úteis, ou 5 dias úteis quando o problema é regularidade fiscal de MEI (IN 52, arts. 21 e 22).',
        },
      ],
    },
    {
      titulo: 'Quais são os limites de valor e de faturamento?',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            `Por demanda de serviço: ${VALORES.contratoVerbal} em 2026, o valor do art. 95, § 2º, da Lei 14.133, atualizado pelo ${DECRETO_VALORES.nome}. Páginas oficiais mais antigas ainda citam R$ 12.545,11.`,
            'Por demanda de alimentos no credenciamento: o Edital 06/2025 não fixa limite prévio.',
            'Por ano: o MEI pode atender várias demandas, mas respeita o limite de receita do MEI, de R$ 81.000,00 em 2026.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'A [Lei Complementar 238/2026](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp238.htm) eleva esse limite para R$ 110.000,00 em 2027 e R$ 140.000,00 a partir de 2028 (arts. 1º, 2º e 10), com a condição de a renúncia de receita constar da lei orçamentária (art. 3º). Quem passar do limite precisa comunicar o desenquadramento à Receita Federal.',
        },
        {
          tipo: 'paragrafo',
          texto: `A mesma lei permite, a partir de 2027, licitação exclusiva para MEI em itens de até metade do valor do art. 75, II, da Lei 14.133, que em 2026 é de ${VALORES.dispensaCompras} (art. 8º). Isso é outro caminho, fora do Contrata+Brasil.`,
        },
      ],
    },
    {
      titulo: 'Como e quando o MEI recebe?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O serviço pode ser contratado de forma verbal ou por termo (Edital 03/2025, item 5.2). O [empenho](/glossario/empenho) vem antes da contratação. Depois do serviço, você emite a nota fiscal para o órgão.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O prazo está em cada oportunidade. Os editais de serviços falam em até 30 dias contados da execução (item 5.3.2). Os Termos de Uso e a orientação aos órgãos falam em até 10 dias úteis depois da liquidação da despesa. Como os textos oficiais divergem, leia o prazo da oportunidade antes de propor.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O pagamento deve ser feito preferencialmente por Pix ou cartão (IN 52, art. 24), e o órgão pode usar ordem bancária (item 5.5). Pode haver retenção de tributos (item 5.6). O órgão registra o pagamento na plataforma, e você tem 5 dias úteis para discordar (IN 52, art. 28).',
        },
      ],
    },
    {
      titulo: 'Tem aplicativo? Como funcionam os avisos?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'As páginas oficiais indicam o acesso pelo site, no celular ou no computador, e não citam aplicativo próprio. Os avisos chegam pelo WhatsApp, para quem autoriza no cadastro.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O alerta automático cobre as oportunidades da cidade do CNPJ. Pelo sistema, você também pode ver e disputar demandas de outros municípios. Mantenha o telefone certo: não responder ao órgão pode levar à inativação temporária da inscrição (IN 52, art. 38, II).',
        },
      ],
    },
    {
      titulo: 'Como o Edital Map ajuda?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'As oportunidades do Contrata+Brasil só vão ao [PNCP](/glossario/pncp) no fim do processo, depois da escolha do fornecedor. Por isso, as abertas devem ser vistas na plataforma oficial, não no Edital Map.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O Edital Map mostra, de graça, na [busca e no mapa](/), os editais abertos do PNCP, atualizados a cada 3 horas: pregão, concorrência eletrônica, dispensa e credenciamento. Quem quer ir além das pequenas demandas pode começar pelas [dispensas abertas](/licitacoes/dispensa). Os Alertas por e-mail são do plano [Pro](/planos).',
        },
      ],
    },
  ],
  editais: ['/licitacoes/dispensa', '/licitacoes/credenciamento', '/licitacoes/manutencao-predial', '/licitacoes'],
  perguntas: [
    {
      pergunta: 'Contrata Mais Brasil e Contrata Brasil são a mesma coisa?',
      resposta:
        'Sim. O nome oficial é Contrata+Brasil, a plataforma criada pela IN SEGES/MGI nº 52/2025. Contrata Mais Brasil e Contrata Brasil são as formas usadas na busca.',
    },
    {
      pergunta: 'MEI pode participar do Contrata Mais Brasil?',
      resposta:
        'Pode. As linhas de manutenção e pequenos reparos e de eventos são exclusivas para MEI. É preciso ter conta gov.br, CNPJ ativo e prestar um serviço da lista.',
    },
    {
      pergunta: 'Como fazer o cadastro no Contrata Mais Brasil?',
      resposta:
        'Entre na plataforma com a conta gov.br, abra "Minhas Empresas", digite o CNPJ, selecione os serviços e clique em "Inscrever empresa". É gratuito, e a plataforma faz o SICAF se você ainda não tiver.',
    },
    {
      pergunta: 'Empresa que não é MEI pode vender pelo Contrata+Brasil?',
      resposta:
        'Nas linhas de serviços, não. No credenciamento de alimentos, sim: o Edital 06/2025 aceita quaisquer fornecedores interessados, de qualquer porte, com cadastro no SICAF.',
    },
    {
      pergunta: 'Qual o valor máximo por serviço no Contrata+Brasil?',
      resposta: `Em 2026, ${VALORES.contratoVerbal} por demanda. O valor segue o art. 95, § 2º, da Lei 14.133 e é atualizado automaticamente quando o decreto anual muda.`,
    },
    {
      pergunta: 'Preciso ter certidões em dia para mandar proposta?',
      resposta:
        'A regularidade fiscal e trabalhista é exigida para a contratação, não para o credenciamento (Edital 03/2025, item 4.3). Se for selecionado, ela será conferida, então mantenha tudo em dia.',
    },
  ],
  fontes: [
    {
      nome: 'Instrução Normativa SEGES/MGI nº 52/2025, atualizada (Contrata+Brasil)',
      url: 'https://www.gov.br/contratamaisbrasil/pt-br/central-de-conteudo/editais-e-regulamentacao/instrucoes-normativas/instrucao-normativa-seges-mgi-no-52-de-10-de-fevereiro-de-2025',
    },
    {
      nome: 'Editais e regulamentação (Contrata+Brasil)',
      url: 'https://www.gov.br/contratamaisbrasil/pt-br/central-de-conteudo/editais-e-regulamentacao',
    },
    {
      nome: 'Edital de Credenciamento nº 03/2025: manutenção e pequenos reparos',
      url: 'https://www.gov.br/contratamaisbrasil/pt-br/central-de-conteudo/editais-e-regulamentacao/edital-de-credenciamento-03-2025-servicos/0-edital.pdf/@@display-file/file',
    },
    {
      nome: 'Edital de Credenciamento nº 03/2026: eventos e ações institucionais',
      url: 'https://www.gov.br/contratamaisbrasil/pt-br/central-de-conteudo/editais-e-regulamentacao/edital-credenciamento-03-2026-eventos/1-0-edital-de-credenciamento-ndeg-3_2026.pdf/@@display-file/file',
    },
    {
      nome: 'Edital de Credenciamento nº 06/2025: alimentos',
      url: 'https://www.gov.br/contratamaisbrasil/pt-br/central-de-conteudo/editais-e-regulamentacao/edital-de-credenciamento-06-2025-alimentos/edital-de-credenciamento-n-062025-55321827.pdf/@@display-file/file',
    },
    { nome: 'Termos e condições de uso (Contrata+Brasil)', url: 'https://contratamaisbrasil.sistema.gov.br/base/termos_de_uso/' },
    {
      nome: 'Tutorial: como se inscrever na plataforma, versão de setembro de 2026',
      url: 'https://www.gov.br/contratamaisbrasil/pt-br/area-do-fornecedor/aprenda_usar/ComoseinscrevernoContratamaisBrasil.pdf/@@display-file/file',
    },
    {
      nome: 'Perguntas e respostas para fornecedores (Contrata+Brasil)',
      url: 'https://www.gov.br/contratamaisbrasil/pt-br/area-do-fornecedor/perguntas-e-respostas',
    },
    {
      nome: 'Perguntas e respostas para agentes públicos (Contrata+Brasil)',
      url: 'https://www.gov.br/contratamaisbrasil/pt-br/area-do-agente-publico/perguntas-e-respostas',
    },
    {
      nome: 'MGI amplia para 141 os serviços do Contrata+Brasil (junho de 2026)',
      url: 'https://www.gov.br/contratamaisbrasil/pt-br/central-de-conteudo/noticias/mgi-amplia-servicos-disponiveis-no-contrata-brasil-para-contemplar-mais-oportunidades-para-o-empreendedorismo-feminino',
    },
    {
      nome: 'MGI amplia para 107 os serviços do Contrata+Brasil (abril de 2026)',
      url: 'https://www.gov.br/contratamaisbrasil/pt-br/central-de-conteudo/noticias/mgi-ampliou-para-mais-de-100-as-opcoes-de-servicos-no-contrata-brasil-reforcando-oportunidades-de-trabalho-e-renda-para-meis',
    },
    {
      nome: 'Contrata+Brasil simplifica cadastro e amplia alcance (setembro de 2025)',
      url: 'https://www.gov.br/contratamaisbrasil/pt-br/central-de-conteudo/noticias/contrata-brasil-simplifica-cadastro-e-amplia-alcance-para-fornecedores-de-todo-o-pais',
    },
    { nome: 'Contrata+Brasil para o MEI (Empresas & Negócios)', url: 'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/contrata-brasil' },
    { nome: 'Lei nº 14.133/2021 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14133.htm' },
    { nome: 'Decreto nº 11.878/2024 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_Ato2023-2026/2024/Decreto/D11878.htm' },
    { nome: 'Lei Complementar nº 238/2026 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp238.htm' },
    DECRETO_VALORES.fonte,
  ],
  relacionados: ['me-epp-e-mei', 'sicaf', 'dispensa-de-licitacao', 'plano-de-contratacoes-anual'],
};
