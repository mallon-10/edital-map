import { PRECO_PRO_MENSAL } from '../../lib/planos';
import type { Guia } from '../tipos';

export const guia: Guia = {
  slug: 'onde-encontrar-licitacoes',
  titulo: 'Onde encontrar editais abertos e licitações abertas?',
  descricao:
    'Editais abertos e licitações abertas: portais oficiais, plataformas de disputa e serviços de alerta. Como escolher um site de licitações e montar a rotina.',
  resposta:
    'Licitações abertas aparecem em três tipos de fonte: portais oficiais gratuitos, como o PNCP, onde os órgãos divulgam os editais; plataformas de disputa, como o Compras.gov.br, onde a sessão acontece; e serviços privados de busca e alerta, que organizam esses dados. O PNCP é o ponto de partida, mas cidades pequenas ainda podem publicar só no diário oficial.',
  revisadoEm: '2026-10-31',
  secoes: [
    {
      titulo: 'Onde são publicados os editais abertos?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A regra geral está no art. 54 da [Lei 14.133/2021](/guias/nova-lei-de-licitacoes): o [edital](/glossario/edital) e os anexos precisam ficar disponíveis, por inteiro, no Portal Nacional de Contratações Públicas (PNCP). O mesmo artigo manda publicar um extrato no diário oficial e em jornal diário de grande circulação (§ 1º) e permite divulgar o texto também no site oficial do ente (§ 2º).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Por isso o PNCP é o primeiro lugar a olhar, mas não o único. Existe uma exceção: municípios com até 20 mil habitantes têm 6 anos, contados da publicação da lei em abril de 2021, para cumprir as regras de divulgação em sítio eletrônico oficial (art. 176). Enquanto não adotam o PNCP, eles publicam no diário oficial.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Na prática, as fontes se dividem em três tipos: portais oficiais gratuitos, plataformas de disputa e serviços privados de busca e alerta. Os portais divulgam, as plataformas conduzem a disputa e os serviços privados ajudam a achar o que interessa.',
        },
      ],
    },
    {
      titulo: 'Quais portais oficiais mostram licitações abertas de graça?',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            'PNCP (pncp.gov.br): reúne editais de União, estados e municípios, e a consulta é pública. Na área de editais, o status "A Receber/Recebendo Proposta" separa o que ainda está aberto. Os filtros incluem modalidade, órgão, UF, município e plataforma, e o portal gera arquivo CSV ou XLSX com os resultados. Veja o guia do [PNCP](/guias/pncp).',
            'Compras.gov.br (gov.br/compras): o portal tem uma consulta de oportunidades de pregão, concorrência, dispensa eletrônica e concurso. O aplicativo filtra por região, estado, município e linha de fornecimento. Veja o guia do [Compras.gov.br](/guias/compras-gov-br).',
            'Diário oficial: o extrato do edital sai no Diário Oficial da União, do estado, do Distrito Federal ou do município (art. 54, § 1º). É a fonte a conferir nas cidades pequenas.',
            'Sites de prefeituras e estados: a divulgação extra é permitida (art. 54, § 2º), e a Lei de Acesso à Informação manda os órgãos publicarem dados de licitações, inclusive editais e resultados (Lei 12.527/2011, art. 8º, § 1º, IV). O guia de [licitação de prefeitura](/guias/licitacao-de-prefeitura) detalha esse caminho.',
            'Portal da Transparência: mostra licitações do Poder Executivo Federal, com foco nas que resultaram em contratos. Serve mais para estudar o que um órgão já comprou e quem venceu do que para achar edital aberto.',
          ],
        },
      ],
    },
    {
      titulo: 'O que são as plataformas de disputa?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Plataforma de disputa é o sistema onde a [sessão pública](/glossario/sessao-publica) acontece: a empresa envia a [proposta](/glossario/proposta), dá [lances](/glossario/lance) e manda documentos. A lei permite que cada ente tenha sítio próprio e que use sistema fornecido por pessoa jurídica de direito público ou privado, desde que integrado ao PNCP (art. 175, § 1º).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Elas são o lugar de participar, não de procurar. Algumas têm lista pública de processos, mas cada uma mostra só o que passa por ela. O guia de [plataformas de licitação](/guias/plataformas-de-licitacao) explica Compras.gov.br, BLL, Licitanet e outras.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O edital diz qual plataforma usar. Ler o edital não depende de cadastro: a lei proíbe exigir registro complementar para dar acesso a ele e aos anexos (art. 87, § 2º).',
        },
      ],
    },
    {
      titulo: 'O que fazem os serviços privados de busca e alerta?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'São sites e sistemas de empresas que leem fontes públicas e organizam os editais. O PNCP adota o formato de dados abertos (art. 174, § 4º), o que permite que outros sistemas leiam as informações. Em geral, esses serviços oferecem busca por palavra, filtros e aviso por e-mail quando sai um edital do seu ramo.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Eles não são canais do governo e não substituem o edital. Servem para reduzir o tempo de busca. O que cada um cobre muda de serviço para serviço, e é isso que você precisa comparar.',
        },
      ],
    },
    {
      titulo: 'O que observar ao escolher um site de licitações?',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            'Cobertura: quais fontes ele lê? Só o PNCP, ou também diários oficiais e sites de prefeituras? Quais modalidades entram?',
            'Frequência de atualização: de quantas em quantas horas os dados são renovados? Isso pesa nas compras de prazo curto.',
            'Filtros: dá para buscar por palavra e sinônimos, estado, cidade, distância, órgão, valor e modalidade?',
            'Alertas: o aviso vem por e-mail ou aplicativo? Com que frequência? Quantas buscas podem ser acompanhadas?',
            'Preço: o que é grátis, o que é pago, como funciona a renovação e como cancelar.',
            'Caminho até a fonte: cada edital tem link para a página oficial? É ela que vale.',
          ],
        },
      ],
    },
    {
      titulo: 'Onde o Edital Map entra nessa lista?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            `O Edital Map é um dos serviços privados. Ele lê os dados abertos do PNCP a cada 3 horas e mostra os editais abertos num [mapa](/). É gratuito buscar, ver no mapa, filtrar por raio em km e por órgão e exportar. No plano grátis, cada pesquisa por palavra mostra 5 editais, e a planilha traz esses 5. O [plano Pro](/planos), de ${PRECO_PRO_MENSAL}, libera todos e inclui os [Alertas](/alertas) por e-mail e o Meu Radar.`,
        },
        {
          tipo: 'paragrafo',
          texto:
            'O limite dele: cobre só o que está publicado no PNCP nas modalidades pregão (eletrônico e presencial), concorrência eletrônica, dispensa e credenciamento. O que saiu apenas no diário oficial ou no site da prefeitura não aparece. E ele não é plataforma de disputa: para participar, siga o edital oficial até o sistema indicado nele.',
        },
      ],
    },
    {
      titulo: 'Como montar uma rotina de busca?',
      blocos: [
        {
          tipo: 'passos',
          itens: [
            'Liste o que você vende com as palavras que os órgãos usam. Quem vende uniforme busca também "fardamento", "vestuário" e "jaleco".',
            'Defina a área em que consegue entregar: cidades, estado ou um raio em quilômetros.',
            'Ligue os avisos que puder. O aplicativo Compras.gov.br notifica o fornecedor quando sai oportunidade compatível com a linha de fornecimento dele. Serviços privados mandam alertas por e-mail.',
            'Olhe o PNCP ou um serviço de busca a cada um ou dois dias úteis. Os prazos mínimos ajudam a medir: 8 dias úteis para bens por menor preço (art. 55, I, a) e 10 para serviços comuns (art. 55, II, a). Na [dispensa eletrônica](/glossario/dispensa-eletronica), o aviso costuma durar pelo menos 3 dias úteis (art. 75, § 3º).',
            'Uma vez por semana, confira o diário oficial e o site das cidades pequenas em que você vende.',
            'Para cada edital que interessar, anote prazo, plataforma e documentos pedidos. Confirme o cadastro antes da sessão. O caminho completo está em [como participar de licitação](/guias/como-participar-de-licitacao).',
          ],
        },
      ],
    },
    {
      titulo: 'Por que olhar só um lugar faz perder editais?',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            'Cidades pequenas: com o prazo do art. 176, municípios com até 20 mil habitantes ainda podem publicar no diário oficial, fora do PNCP.',
            'Publicação depende do órgão: quem envia os dados é cada prefeitura ou secretaria. Pode haver atraso ou falha.',
            'Plataformas mostram só o que passa por elas: olhar apenas o Compras.gov.br deixa de fora compras feitas em outros sistemas.',
            'Palavras diferentes: cada órgão descreve o mesmo produto de um jeito, e uma busca com um termo só deixa editais para trás.',
            'Cobertura de cada ferramenta: nenhum serviço lê tudo. Alguns deixam de fora modalidades ou fontes que interessam a você.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'A saída prática é combinar uma fonte ampla com uma conferência local. Comece pela lista de [licitações abertas](/licitacoes) ou por um ramo, como [uniformes](/licitacoes/uniformes), e complete com o diário oficial das cidades que importam para o seu negócio.',
        },
      ],
    },
  ],
  editais: ['/licitacoes', '/licitacoes/pregao-eletronico', '/licitacoes/dispensa', '/licitacoes/uniformes'],
  perguntas: [
    {
      pergunta: 'Onde vejo licitações abertas de graça?',
      resposta:
        'No PNCP (pncp.gov.br), onde a consulta é pública e o status "A Receber/Recebendo Proposta" mostra o que ainda está aberto. O Compras.gov.br, os diários oficiais e os sites de prefeituras e estados também são gratuitos.',
    },
    {
      pergunta: 'Qual site de licitações devo usar?',
      resposta:
        'Nenhum cobre tudo. Use o PNCP como base e escolha um serviço de busca pela cobertura, frequência de atualização, filtros, alertas e preço. Para participar, o sistema é sempre o indicado no edital.',
    },
    {
      pergunta: 'Existe alerta de licitações gratuito?',
      resposta:
        'Sim, no aplicativo Compras.gov.br: ao escolher linhas de fornecimento e região, o fornecedor recebe notificações de oportunidades compatíveis. Os serviços privados têm regras próprias. No Edital Map, os Alertas por e-mail são do plano Pro.',
    },
    {
      pergunta: 'Preciso de cadastro para ver um edital?',
      resposta:
        'Não para ler. A Lei 14.133 proíbe exigir registro cadastral complementar para dar acesso ao edital e aos anexos (art. 87, § 2º). O cadastro é necessário para disputar, na plataforma indicada no edital.',
    },
    {
      pergunta: 'Plataforma de licitações e portal de editais são a mesma coisa?',
      resposta:
        'Não. O PNCP divulga os editais de todo o país. A plataforma, como Compras.gov.br ou BLL, é onde a empresa envia a proposta e dá lances. Serviços de busca, como o Edital Map, ajudam a encontrar o edital.',
    },
  ],
  fontes: [
    { nome: 'Lei nº 14.133/2021, arts. 54, 55, 75, 87, 174, 175 e 176 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm' },
    { nome: 'Lei nº 12.527/2011, art. 8º (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm' },
    { nome: 'Consulta de editais do Portal Nacional de Contratações Públicas (PNCP)', url: 'https://pncp.gov.br/app/editais' },
    { nome: 'Portal de Compras do Governo Federal (gov.br/compras)', url: 'https://www.gov.br/compras/pt-br' },
    {
      nome: 'Comunicado nº 40/26: processos de contratação no aplicativo do Compras.gov.br (24/9/2026)',
      url: 'https://www.gov.br/compras/pt-br/acesso-a-informacao/comunicados/comunicados_2026/no-40-26-processos-de-contratacao-publicados-tambem-no-aplicativo-do-compras-gov.br',
    },
    {
      nome: 'Como receber notificações de licitações no aplicativo (Portal de Compras do Governo Federal)',
      url: 'https://www.gov.br/compras/pt-br/acesso-a-informacao/perguntas-frequentes/comprasnet-mobile/6-como-faco-para-receber',
    },
    { nome: 'Licitações no Portal da Transparência (CGU)', url: 'https://portaldatransparencia.gov.br/licitacoes' },
  ],
  relacionados: ['pncp', 'plataformas-de-licitacao', 'compras-gov-br', 'como-participar-de-licitacao'],
};
