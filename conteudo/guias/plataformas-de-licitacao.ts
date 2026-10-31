import type { Guia } from '../tipos';

export const guia: Guia = {
  slug: 'plataformas-de-licitacao',
  titulo: 'Plataformas de licitação: BLL, Licitanet, Compras.gov.br e outras',
  descricao:
    'Plataformas de licitação: o que são BLL, Licitanet, Compras.gov.br, Licitações-e, BEC/SP e Compras MG e como cadastrar a empresa para participar.',
  resposta:
    'Plataforma de licitação é o sistema pela internet onde a disputa acontece: a empresa envia proposta, dá lances e manda documentos. Cada edital informa qual será usada, como Compras.gov.br, BLL, Licitanet, Portal de Compras Públicas, Licitações-e ou Compras MG. Para participar, a empresa faz o cadastro nessa plataforma antes da sessão.',
  revisadoEm: '2026-10-31',
  secoes: [
    {
      titulo: 'Como saber qual plataforma vale para o edital?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O [edital](/glossario/edital) informa a plataforma, a data e a hora da [sessão pública](/glossario/sessao-publica). No PNCP, a página do edital traz o campo "Fonte/Plataforma", e a busca de editais tem um filtro com esse nome.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Às vezes o campo vem com a razão social, não com o nome conhecido. O Portal de Compras Públicas aparece como "ECustomize Consultoria em Software S.A", e a Licitanet, como "Licitanet Licitações Eletrônicas LTDA". Na dúvida, o texto do edital é a referência.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O Edital Map não é nenhuma dessas plataformas e não fala em nome delas. Se você quer apenas entrar no site de uma, os endereços estão nas seções abaixo.',
        },
      ],
    },
    {
      titulo: 'Por que existem tantas plataformas?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Porque a lei permite. Pelo art. 175 da [Lei 14.133/2021](/guias/nova-lei-de-licitacoes), cada ente pode ter sítio eletrônico oficial para fazer as próprias contratações. O § 1º, na redação da Lei 15.266/2025, admite sistema fornecido por pessoa jurídica de direito público ou privado, desde que mantida a integração com o PNCP, na forma de regulamento do Poder Executivo federal.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O [PNCP](/guias/pncp) divulga a compra. A plataforma conduz a disputa. Por isso uma prefeitura pode publicar o edital no PNCP e fazer a sessão num sistema privado.',
        },
      ],
    },
    {
      titulo: 'Compras.gov.br: quem usa e como é o cadastro',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'É o sistema do governo federal, em [gov.br/compras](https://www.gov.br/compras/pt-br). Órgãos federais fazem nele as compras pela internet, e o portal informa que ele está disponível também para órgãos estaduais e municipais. O cadastro é o [SICAF](/guias/sicaf), gratuito, com a conta gov.br. O passo a passo está no guia do [Compras.gov.br](/guias/compras-gov-br).',
        },
      ],
    },
    {
      titulo: 'BLL Compras: quem usa e como é o cadastro',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A BLL (Bolsa de Licitações e Leilões do Brasil) tem site institucional em bll.org.br, e o sistema fica em bllcompras.com. Segundo a própria BLL, ela atende prefeituras, câmaras, consórcios, autarquias, fundações e empresas públicas, com pregão, concorrência, leilão, dispensa, inexigibilidade e credenciamento.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Pelo regulamento de 2026 (art. 12), o representante legal se cadastra como usuário, cadastra a empresa e envia o contrato social e o termo de adesão assinado. A validação ocorre em até 24 horas úteis. O mesmo regulamento prevê cobrança do licitante, por plano de período ou taxa sobre o lote ganho. Confira as condições e os valores no regulamento atual.',
        },
      ],
    },
    {
      titulo: 'Licitanet: quem usa e como é o cadastro',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A Licitanet é uma plataforma privada, em licitanet.com.br. A página inicial mostra avisos de prefeituras e de serviços de água e esgoto de vários estados. O cadastro de fornecedor é feito no próprio site. A mesma página publica planos pagos de acesso, por processo e por período. Confira etapas, condições e valores lá antes de contratar.',
        },
      ],
    },
    {
      titulo: 'Portal de Compras Públicas: quem usa e como é o cadastro',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Está em portaldecompraspublicas.com.br e é mantido pela empresa Ecustomize Consultoria em Software S/A. Apesar do nome, não é o Portal de Compras do Governo Federal. O site tem perfis para administração pública, estatais e Sistema S.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O perfil de fornecedor aceita pessoa física ou jurídica, inclusive MEI, ME e EPP, e o cadastro é feito on-line. A página de fornecedores explica que o portal cobra pelo uso e lista planos mensal, anual e por processo. Confira os valores nessa página.',
        },
      ],
    },
    {
      titulo: 'Licitações-e: quem usa e como é o cadastro',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'É o sistema do Banco do Brasil. O novo portal fica em licitacoes-e2.bb.com.br, e o antigo, em licitacoes-e.com.br, ficou para os processos da Lei 8.666. O próprio banco compra por ele, e o portal cita estatais, estados e municípios entre os compradores. Hoje o novo site traz dispensa eletrônica, pregão e concorrência pela Lei 14.133. Não confunda com a Licitanet, que é outra empresa.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Dá para procurar oportunidades sem cadastro. Para participar, a empresa faz a adesão digital no Portal Fornecedor do banco, ou numa agência, com os documentos pedidos, o termo de adesão e o termo de nomeação do usuário. O acesso vem com uma chave pessoal, e a adesão é paga por período, com boleto. Confira os valores no site do banco.',
        },
      ],
    },
    {
      titulo: 'BEC/SP: ainda serve para vender ao Estado de São Paulo?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A Bolsa Eletrônica de Compras é o sistema do governo paulista, em [bec.sp.gov.br](https://www.bec.sp.gov.br/). Mas o Comunicado BEC 02/2025, de 15 de setembro de 2025, informa que, desde 1º de janeiro de 2024, as contratações do Estado pela Lei 14.133 são feitas exclusivamente pelo Compras.gov.br. Para participar, o fornecedor deve estar regular no SICAF.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O mesmo comunicado diz que o CAUFESP, o cadastro ligado à BEC, está em descontinuidade, e que e-mail pedindo recadastramento pode ser ignorado. As orientações do CAUFESP informam que esse cadastro não tem custo. Para processos antigos, siga o edital de cada um. Prefeituras paulistas escolhem a própria plataforma, então confira o edital.',
        },
      ],
    },
    {
      titulo: 'Compras MG: quem usa e como é o cadastro',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O Portal de Compras do Estado de Minas Gerais fica em [compras.mg.gov.br](https://compras.mg.gov.br/) e é usado por órgãos e entidades do Poder Executivo estadual. Ele tem integração com o PNCP. Prefeituras mineiras podem usar outras plataformas, então confira o edital.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O cadastro é o CAGEF, gratuito, para pessoa jurídica ou física, e é obrigatório nas disputas eletrônicas do portal (Decreto 47.524/2018, art. 8º). Primeiro se cria o usuário do representante; depois se pede a inscrição do fornecedor. O cadastro pela unidade cadastradora gera o Certificado de Registro Cadastral (CRC), que precisa ficar com os documentos em dia.',
        },
      ],
    },
    {
      titulo: 'Como é o cadastro, passo a passo',
      blocos: [
        {
          tipo: 'paragrafo',
          texto: 'Os detalhes mudam, mas o caminho costuma ser parecido:',
        },
        {
          tipo: 'passos',
          itens: [
            'Confira no edital a plataforma, a data e a hora da sessão. Entre pelo endereço indicado nele, e não por um anúncio de busca.',
            'Reúna CNPJ, contrato social ou documento equivalente e os documentos do representante legal. Se ele não consta no contrato social, pode ser preciso apresentar procuração, como prevê o regulamento da BLL.',
            'Crie o usuário da pessoa que vai representar a empresa. Na BLL e no CAGEF, esse cadastro vem antes do cadastro da empresa.',
            'Cadastre a empresa e aceite as regras da plataforma. BLL e Licitações-e pedem termo de adesão.',
            'Leia o regulamento antes de pagar qualquer valor. Veja quem cobra, quando cobra e o que acontece se a empresa não vencer.',
            'Espere a validação. Faça tudo com folga, porque a análise leva tempo e a sessão não espera.',
            'Treine no sistema, se houver ambiente de testes, e veja como enviar a [proposta](/guias/proposta-de-precos) e dar [lances](/glossario/lance). O guia do [pregão eletrônico](/guias/pregao-eletronico) explica a disputa.',
            'Mantenha o cadastro em dia. Mudou sócio, representante, endereço ou dado da empresa, atualize.',
          ],
        },
      ],
    },
    {
      titulo: 'O que muda de uma plataforma para outra?',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            'Quem administra: governo (Compras.gov.br, Compras MG, BEC/SP), banco (Licitações-e) ou entidade privada (BLL, Licitanet, Portal de Compras Públicas).',
            'Entrada: conta gov.br no Compras.gov.br, chave e senha no Licitações-e e usuário próprio nas demais.',
            'Custo: SICAF, CAGEF e CAUFESP são gratuitos. BLL, Licitanet, Portal de Compras Públicas e Licitações-e informam cobrança do fornecedor, em plano, taxa ou adesão. Os valores mudam e ficam no regulamento ou na página de cada uma.',
            'Cadastro: um não abre a porta do outro. Quem tem SICAF ainda precisa do cadastro próprio para disputar na BLL, por exemplo.',
            'Regras da sessão: prazos e modos de disputa vêm do edital e do regulamento da plataforma. Não presuma que uma repete a outra.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Ler o edital não depende de nada disso: a lei proíbe exigir registro cadastral complementar para dar acesso a ele e aos anexos (art. 87, § 2º). Antes de abrir cadastro em tudo, veja em quais plataformas saem os editais do seu ramo e da sua região. Quem vende para a cidade onde está pode começar pelo guia de [licitação de prefeitura](/guias/licitacao-de-prefeitura).',
        },
      ],
    },
    {
      titulo: 'Como achar editais de várias plataformas num lugar só?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Como as plataformas são integradas ao PNCP, os editais delas tendem a aparecer lá. O Edital Map lê esses dados e mostra os editais abertos num [mapa](/), com páginas como [pregões eletrônicos abertos](/licitacoes/pregao-eletronico) e [licitações em São Paulo](/licitacoes/sp). O edital oficial informa onde será a disputa.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O Edital Map não é plataforma de disputa: lá você encontra o edital, e a proposta vai pelo sistema indicado nele. Os Alertas por e-mail fazem parte do plano [Pro](/planos). Para conhecer as fontes, veja [onde encontrar licitações](/guias/onde-encontrar-licitacoes).',
        },
      ],
    },
  ],
  editais: ['/licitacoes', '/licitacoes/pregao-eletronico', '/licitacoes/dispensa', '/licitacoes/sp', '/licitacoes/mg'],
  perguntas: [
    {
      pergunta: 'BLL e Licitanet são sites do governo?',
      resposta:
        'Não. São plataformas que não pertencem ao governo e são usadas por órgãos públicos, o que a Lei 14.133 admite desde que haja integração com o PNCP (art. 175, § 1º). O edital informa quando a disputa acontece nelas.',
    },
    {
      pergunta: 'Preciso me cadastrar em todas as plataformas?',
      resposta:
        'Não. Cadastre a empresa nas plataformas que aparecem nos editais que interessam a você. Cada uma tem cadastro próprio, e o edital diz qual será usada.',
    },
    {
      pergunta: 'O cadastro nas plataformas é pago?',
      resposta:
        'Depende. SICAF e CAGEF são gratuitos. BLL, Licitanet, Portal de Compras Públicas e Licitações-e informam cobrança do fornecedor, em plano, taxa ou adesão. Confira no regulamento ou na página de cada uma antes de contratar.',
    },
    {
      pergunta: 'Licitações-e e Licitanet são a mesma coisa?',
      resposta:
        'Não. O Licitações-e é o sistema do Banco do Brasil. A Licitanet é outra plataforma, de outra empresa. Cada uma tem endereço, cadastro e regras próprias.',
    },
    {
      pergunta: 'A BEC/SP ainda funciona?',
      resposta:
        'O site continua no ar, mas o Comunicado BEC 02/2025 informa que, desde 1º de janeiro de 2024, as contratações do Estado de São Paulo pela Lei 14.133 são feitas só pelo Compras.gov.br, com cadastro no SICAF.',
    },
    {
      pergunta: 'O SICAF vale para outras plataformas?',
      resposta:
        'O SICAF é o cadastro do Compras.gov.br. As outras plataformas têm cadastro próprio. O edital informa quais documentos e registros valem para aquela disputa.',
    },
  ],
  fontes: [
    { nome: 'Lei nº 14.133/2021, arts. 87, 174 e 175 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm' },
    { nome: 'Portal de Compras do Governo Federal (gov.br/compras)', url: 'https://www.gov.br/compras/pt-br' },
    { nome: 'Consulta de editais do Portal Nacional de Contratações Públicas (PNCP)', url: 'https://pncp.gov.br/app/editais' },
    {
      nome: 'Comunicado BEC 02/2025: descontinuidade do CAUFESP (BEC/SP)',
      url: 'https://www.bec.sp.gov.br/becsp/Noticias/UI_Noticia.aspx?chave=&ID_NOTICIA=1798&ID_Perfil=',
    },
    { nome: 'Orientações para cadastro no CAUFESP (BEC/SP)', url: 'https://www.bec.sp.gov.br/Caufesp/Publico/ComoCadastrar.aspx' },
    { nome: 'Portal de Compras do Estado de São Paulo: fornecedor', url: 'https://compras.sp.gov.br/fornecedor/' },
    {
      nome: 'Cadastro Geral de Fornecedores, CAGEF (Portal de Compras MG)',
      url: 'https://compras.mg.gov.br/fornecedores/cadastro-geral-de-fornecedores-cagef/',
    },
    { nome: 'Dúvidas frequentes sobre a nova lei (Portal de Compras MG)', url: 'https://compras.mg.gov.br/nova-lei-de-licitacoes/duvidas-frequentes/' },
  ],
  relacionados: ['onde-encontrar-licitacoes', 'compras-gov-br', 'sicaf', 'pncp'],
};
