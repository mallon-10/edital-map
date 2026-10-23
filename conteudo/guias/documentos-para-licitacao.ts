import type { Guia } from '../tipos';

export const guia: Guia = {
  slug: 'documentos-para-licitacao',
  titulo: 'Documentos e certidões para licitação',
  descricao:
    'Quais documentos e certidões a empresa precisa para licitar: CND federal, FGTS, CNDT, certidões estaduais e municipais, onde emitir e como organizar.',
  resposta:
    'Para licitar, a empresa comprova a habilitação jurídica, técnica, fiscal, social e trabalhista e econômico-financeira (arts. 62 a 70 da Lei 14.133/2021). Na prática, isso inclui contrato social, CNPJ, certidão federal conjunta, certificado do FGTS, CNDT, certidões estaduais e municipais, balanço e atestados. Cada edital diz exatamente o que pede.',
  revisadoEm: '2026-10-23',
  secoes: [
    {
      titulo: 'O que é habilitação e quando os documentos são pedidos',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            '[Habilitação](/glossario/habilitacao) é a fase em que o órgão confere se a empresa tem condições de cumprir o contrato. O art. 62 da Lei 14.133/2021 divide essa conferência em quatro partes: jurídica, técnica, fiscal, social e trabalhista e econômico-financeira.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Pela ordem do art. 17, a habilitação vem depois do julgamento das propostas. O art. 63 completa: os documentos são pedidos apenas do licitante vencedor, salvo quando o edital inverte as fases, e a regularidade fiscal é exigida só depois do julgamento e apenas do mais bem classificado. Mesmo assim, não deixe para a última hora: o prazo para enviar costuma ser curto.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O ponto mais importante: as condições de habilitação são definidas no [edital](/glossario/edital) (art. 65). A lista abaixo é o que a lei permite pedir. O edital da sua licitação diz o que vale para ela.',
        },
      ],
    },
    {
      titulo: 'Os quatro grupos de documentos da lei',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            'Habilitação jurídica (art. 66): prova de que a empresa existe e pode atuar, como contrato social ou requerimento de empresário, com as alterações, e autorização para a atividade quando ela exigir.',
            'Habilitação técnica (art. 67): [atestado de capacidade técnica](/glossario/atestado-de-capacidade-tecnica) de serviços parecidos, registro no conselho profissional quando for o caso, indicação de equipe e estrutura. Os atestados só podem ser pedidos para as parcelas de maior relevância, de valor igual ou superior a 4% do total estimado (§ 1º).',
            'Habilitação fiscal, social e trabalhista (art. 68): CNPJ, inscrição estadual e/ou municipal, regularidade com as Fazendas federal, estadual e municipal, com a Seguridade Social e o FGTS, com a Justiça do Trabalho, e o cumprimento da proibição de trabalho de menores prevista na Constituição (art. 7º, XXXIII).',
            'Habilitação econômico-financeira (art. 69): balanço patrimonial e demonstrações contábeis dos 2 últimos exercícios e certidão negativa de falência do distribuidor da sede. Empresas com menos de 2 anos apresentam só o último exercício (§ 6º).',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'A lei também proíbe exigir faturamento mínimo anterior e índices de rentabilidade ou lucratividade (art. 69, § 2º). Se o edital pedir algo assim, cabe [impugnação](/glossario/impugnacao).',
        },
      ],
    },
    {
      titulo: 'As certidões e onde emitir cada uma',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A [certidão negativa](/glossario/certidao-negativa) mostra que a empresa não tem dívidas em aberto com aquele órgão. Uma certidão positiva com efeitos de negativa, quando a dívida está parcelada ou suspensa, em geral também serve. Estas são as mais pedidas:',
        },
        {
          tipo: 'lista',
          itens: [
            'Certidão federal conjunta (Receita Federal e PGFN): comprova a situação com tributos federais e a Dívida Ativa da União, inclusive contribuições previdenciárias. Emissão gratuita na página [Emitir certidão de regularidade fiscal](https://www.gov.br/pt-br/servicos/emitir-certidao-de-regularidade-fiscal) do gov.br.',
            'Certificado de Regularidade do FGTS (CRF): emitido pela Caixa na [consulta de regularidade do empregador](https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf).',
            '[CNDT](/glossario/cndt), a Certidão Negativa de Débitos Trabalhistas: emitida pela Justiça do Trabalho no [site da CNDT do TST](https://cndt-certidao.tst.jus.br/inicio.faces).',
            'Certidão estadual: emitida pela Secretaria da Fazenda do seu estado, normalmente no site dela.',
            'Certidão municipal: emitida pela prefeitura da cidade da sede da empresa.',
            'Certidão de falência: pedida ao distribuidor judicial da comarca da sede, em geral pelo site do Tribunal de Justiça do estado.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Validade: cada certidão traz no próprio documento a data até quando vale, e os prazos mudam de um órgão para outro. Não conte de cabeça. Olhe a data impressa e, na dúvida, emita de novo antes de enviar.',
        },
      ],
    },
    {
      titulo: 'Regras que ajudam a pequena empresa',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            'Prazo extra para regularizar: [microempresas e empresas de pequeno porte](/glossario/me-epp) apresentam as certidões fiscais e trabalhistas mesmo com restrição. Se vencerem, têm 5 dias úteis, prorrogáveis por igual período, para regularizar (Lei Complementar 123, art. 43, § 1º, aplicado pelo art. 4º da Lei 14.133).',
            'Compras pequenas: a documentação pode ser dispensada, no todo ou em parte, em contratações para entrega imediata e nas de valor inferior a um quarto do limite de dispensa para compras (art. 70, inciso III).',
            'Empresa nova: quem foi criada no ano da licitação pode trocar os demonstrativos contábeis pelo balanço de abertura (art. 65, § 1º).',
            'Correção de falhas: o órgão pode sanar erros que não mudem a substância dos documentos, e documentos vencidos depois da entrega das propostas podem ser atualizados em diligência (art. 64).',
          ],
        },
      ],
    },
    {
      titulo: 'SICAF e cadastros: menos papel a cada licitação',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A lei permite que o edital aceite um registro cadastral emitido por órgão público no lugar dos documentos (art. 70, inciso II). O mais conhecido é o [SICAF](/glossario/sicaf), cadastro de fornecedores do governo federal. Nele a empresa guarda os dados e as certidões, e muitos órgãos consultam a situação direto no sistema.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Estados e algumas prefeituras têm cadastros próprios. Veja no guia do [SICAF](/guias/sicaf) como fazer o cadastro e confira no edital qual cadastro é aceito.',
        },
      ],
    },
    {
      titulo: 'Como organizar a pasta de documentos',
      blocos: [
        {
          tipo: 'passos',
          itens: [
            'Crie uma pasta digital da empresa com subpastas: jurídico, fiscal, técnico, contábil e declarações.',
            'Salve cada certidão em PDF com a data de vencimento no nome do arquivo (ex.: "CNDT - vence 2026-12-10").',
            'Monte uma planilha com documento, onde emitir, data de emissão e data de vencimento.',
            'Marque na agenda um lembrete alguns dias antes de cada vencimento.',
            'Peça atestados de capacidade técnica aos clientes logo que terminar cada entrega. Veja como no guia de [atestado de capacidade técnica](/guias/atestado-de-capacidade-tecnica).',
            'Mantenha o balanço do último exercício pronto com o contador.',
            'Antes de cada disputa, compare a lista do edital com a pasta e emita de novo o que estiver perto de vencer.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Exemplo: uma confecção de uniformes que disputa pregões de prefeituras todo mês ganha tempo com a pasta em dia. Quando é chamada a enviar a habilitação, só confere o edital e anexa os arquivos.',
        },
      ],
    },
    {
      titulo: 'Próximo passo',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Com os documentos em ordem, falta achar o edital certo. No Edital Map você vê os editais abertos do seu ramo no [mapa](/) e, com os Alertas do [Pro](/planos), recebe os novos por e-mail. Para o passo a passo completo, veja [como participar de licitação](/guias/como-participar-de-licitacao).',
        },
      ],
    },
  ],
  editais: ['/licitacoes', '/licitacoes/pregao-eletronico', '/licitacoes/dispensa', '/licitacoes/uniformes'],
  perguntas: [
    {
      pergunta: 'Quais certidões são pedidas em licitação?',
      resposta:
        'As mais comuns são a certidão federal conjunta (Receita e PGFN), o certificado do FGTS, a CNDT, as certidões estadual e municipal e a certidão de falência. A lista exata está no edital, conforme o art. 65 da Lei 14.133.',
    },
    {
      pergunta: 'Qual a validade das certidões negativas?',
      resposta:
        'Cada certidão traz no próprio documento a data até quando vale, e os prazos variam de um órgão para outro. Confira a data impressa e emita de novo se estiver perto de vencer.',
    },
    {
      pergunta: 'Preciso enviar todos os documentos junto com a proposta?',
      resposta:
        'Em regra, não. Pelo art. 63 da Lei 14.133, os documentos de habilitação são pedidos só do vencedor, e a regularidade fiscal só depois do julgamento. O edital pode inverter as fases, então confira o que ele pede e quando.',
    },
    {
      pergunta: 'Empresa com dívida pode participar de licitação?',
      resposta:
        'ME e EPP podem participar com restrição nas certidões fiscais e trabalhistas e, se vencerem, têm 5 dias úteis, prorrogáveis, para regularizar (LC 123, art. 43). Uma certidão positiva com efeitos de negativa, por dívida parcelada, em geral também é aceita.',
    },
    {
      pergunta: 'O SICAF substitui os documentos?',
      resposta:
        'Pode substituir, se o edital prever (art. 70, inciso II). O cadastro precisa estar com as certidões em dia, e o edital pode pedir documentos que não estão no sistema.',
    },
  ],
  fontes: [
    { nome: 'Lei nº 14.133/2021, arts. 62 a 70 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm' },
    { nome: 'Emitir certidão de regularidade fiscal (gov.br)', url: 'https://www.gov.br/pt-br/servicos/emitir-certidao-de-regularidade-fiscal' },
    { nome: 'Consulta de regularidade do empregador, CRF do FGTS (Caixa)', url: 'https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf' },
    { nome: 'Certidão Negativa de Débitos Trabalhistas (TST)', url: 'https://cndt-certidao.tst.jus.br/inicio.faces' },
    { nome: 'Lei Complementar nº 123/2006, art. 43 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm' },
  ],
  relacionados: ['sicaf', 'atestado-de-capacidade-tecnica', 'como-participar-de-licitacao', 'pregao-eletronico'],
};
