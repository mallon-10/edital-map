import { describe, expect, it } from 'vitest';
import { assunto, emMaiusculas, limparEspacos, lotesDaInfo, nomeProprio, paragrafos, partirItem, semGritos, tituloCurto } from './texto';

describe('limparEspacos', () => {
  it('junta quebras de linha, colapsa espaços e tira espaço antes de pontuação', () => {
    expect(limparEspacos('Câmera\r\nDigital  com\nlente ,  tripé .')).toBe('Câmera Digital com lente, tripé.');
  });
});

describe('semGritos e emMaiusculas', () => {
  it('maiúsculas viram texto normal e preservam siglas, números e romanos', () => {
    expect(
      semGritos('LOTE 08 - ARGAMASSA PARA REJUNTAMENTO DE PLACAS CERAMICAS (REJUNTE), TIPO I. FORNECIDO EM CORES SORTIDAS. PRODUTO EM CONFORMIDADE COM ABNT NBR 14992. REGIAO VIII.'),
    ).toBe(
      'Lote 08 - argamassa para rejuntamento de placas ceramicas (rejunte), tipo I. Fornecido em cores sortidas. Produto em conformidade com ABNT NBR 14992. Regiao VIII.',
    );
  });
  it('unidades ficam em minúsculo', () => {
    expect(semGritos('CAIXA COM 36 UNIDADES DE 500 ML')).toBe('Caixa com 36 unidades de 500 ml');
  });
  it('não mexe em texto que não está em maiúsculas nem em texto curto', () => {
    expect(semGritos('Película Auto-Adesiva material: poliester laminado')).toBe('Película Auto-Adesiva material: poliester laminado');
    expect(semGritos('EPI')).toBe('EPI');
  });
  it('mede a proporção de letras maiúsculas', () => {
    expect(emMaiusculas('AQUISIÇÃO DE MATERIAL')).toBe(true);
    expect(emMaiusculas('Aquisição de material ABNT')).toBe(false);
  });
});

describe('nomeProprio', () => {
  it('nomes em maiúsculas viram nome próprio', () => {
    expect(nomeProprio('MUNICIPIO DE ITA')).toBe('Municipio de Ita');
    expect(nomeProprio('SECRETARIA DE ESTADO DA ADMINISTRACAO - SC')).toBe('Secretaria de Estado da Administracao - SC');
    expect(nomeProprio('Prefeitura Municipal de Itajaí')).toBe('Prefeitura Municipal de Itajaí');
  });
});

describe('assunto', () => {
  const casos: Array<[string, string, string | null]> = [
    [
      'Contratação de empresa especializada para a prestação de serviços de empresa especializada para a prestação de serviços de segurança privada armada e desarmada',
      'Segurança privada armada e desarmada',
      'Serviço',
    ],
    ['Credenciamento de pessoas jurídicas para prestar serviços de exames diversos na rede municipal de saúde', 'Exames diversos', 'Credenciamento'],
    [
      'Contratacao de empresa especializada para a confeccao e fornecimento de 17 dezessete buquês de flores naturais',
      'Confecção e fornecimento de 17 buquês de flores naturais',
      'Serviço',
    ],
    [
      'Contratação de empresa especializada para locação de figurinos de alta costura para o espetáculo de Natal',
      'Locação de figurinos de alta costura para o espetáculo de Natal',
      'Serviço',
    ],
    [
      'Registro de preços para futura e eventual aquisição de materiais de limpeza para atender as necessidades das secretarias municipais',
      'Materiais de limpeza',
      'Compra',
    ],
    ['A presente licitação tem por objeto a aquisição de uniformes escolares, conforme termo de referência', 'Uniformes escolares', 'Compra'],
    ['Aquisição de impressoras térmicas e insumos APS', 'Impressoras térmicas e insumos APS', 'Compra'],
    [
      'Contratação de empresa especializada para execução de obra de pavimentação asfáltica da Rua XV de Novembro',
      'Pavimentação asfáltica da Rua XV de Novembro',
      'Obra',
    ],
    [
      'Chamamento público para credenciamento de pessoas físicas e jurídicas interessadas na prestação de serviços de transporte escolar',
      'Transporte escolar',
      'Credenciamento',
    ],
    ['Constitui objeto da presente licitação o fornecimento de gêneros alimentícios para a merenda escolar', 'Gêneros alimentícios para a merenda escolar', 'Compra'],
    ['Construção de unidade básica de saúde no bairro Centro', 'Construção de unidade básica de saúde no bairro Centro', 'Obra'],
    ['Fornecimento e instalação de sistema de cercamento eletrônico', 'Fornecimento e instalação de sistema de cercamento eletrônico', null],
    [
      'Credenciamento de pessoas jurídicas para prestação de serviços ambulatoriais de Medicina Laboratorial',
      'Serviços ambulatoriais de Medicina Laboratorial',
      'Credenciamento',
    ],
    [
      'O presente procedimento licitatório tem por objeto a contratação de empresa especializada para execução de obra de pavimentação em blocos de concreto',
      'Pavimentação em blocos de concreto',
      'Obra',
    ],
    [
      'Objeto: Registro de Preços para eventual aquisição de medicamentos. Especificação do Objeto: Medicamentos padronizados',
      'Medicamentos',
      'Compra',
    ],
    [
      'Contratação de pessoa jurídica especializada para a execução da obra de implantação de Campo Society no Bairro Mato Preto, localizado na Rua Adélia',
      'Implantação de Campo Society no Bairro Mato Preto',
      'Obra',
    ],
    [
      'O presente procedimento tem por objeto a futura e eventual contratação para prestação de serviços continuados de locação de banheiros químicos',
      'Locação de banheiros químicos',
      'Serviço',
    ],
    [
      'Credenciamento de pessoas físicas para prestação de serviços técnicos culturais e de monitoria artística, de forma complementar',
      'Serviços técnicos culturais e de monitoria artística',
      'Credenciamento',
    ],
  ];

  it.each([
    ['Registro de preços para futuras e eventuais aquisições de marmitas.', 'Marmitas', 'Compra'],
    ['PE 111 CG 97 Registro de preços para futura aquisição de materiais hospitalares.', 'Materiais hospitalares', 'Compra'],
    ['RP Aquisicao de material eletrico para manutencao de rede de iluminacao publica', 'Material elétrico para manutenção de rede de iluminação pública', 'Compra'],
    [
      'Contratação de empresa especializada para execução de obra para construção de uma quadra de teach tennis e quiosque',
      'Construção de uma quadra de teach tennis e quiosque',
      'Obra',
    ],
    ['REGISTRO DE PREÇOS destinado a aquisição de pregos para construção de pontes', 'Pregos para construção de pontes', 'Compra'],
    [
      'Registro de preços visando a seleção da proposta mais vantajosa para contratação de empresa de engenharia para prestação de serviços de recapeamento asfáltico',
      'Recapeamento asfáltico',
      'Obra',
    ],
    ['Aquisição de 06 (seis) carretas agrícolas e 08 (oito) roçadeiras', '06 carretas agrícolas e 08 roçadeiras', 'Compra'],
    ['Credenciamento de prestadores de serviço de silagem para os produtores rurais', 'Silagem para os produtores rurais', 'Credenciamento'],
    ['Contratação de empresa(s) para prestação de serviços de transporte eventual de passageiros.', 'Transporte eventual de passageiros', 'Serviço'],
    ['Sistema de registro de preços (SRP) para aquisição de materiais hospitalares e farmacológicos', 'Materiais hospitalares e farmacológicos', 'Compra'],
    ['Registro de preços, pelo prazo de 12 meses, para futura e eventual aquisição de intercap e solupan.', 'Intercap e solupan', 'Compra'],
    ['Registro de preços para aquisição parcelada de combustíveis tipo gasolina comum', 'Combustíveis tipo gasolina comum', 'Compra'],
    ['PREG-E 641/2026 - Aquisição de cadeiras giratórias para escritório', 'Cadeiras giratórias para escritório', 'Compra'],
    [
      'Contratação de empresa especializada para a construção de barracão destinado à compostagem de resíduos orgânicos',
      'Construção de barracão destinado à compostagem de resíduos orgânicos',
      'Obra',
    ],
    [
      'Contratação de empresa especializada para a execução da obra de fechamento da quadra esportiva da e.b.M. Cristo redentor',
      'Fechamento da quadra esportiva da e.b.M. Cristo redentor',
      'Obra',
    ],
    [
      'Edital de Chamamento Público destinado ao credenciamento de pessoas jurídicas, especializadas para a prestação de serviços de fisioterapia',
      'Fisioterapia',
      'Credenciamento',
    ],
  ])('padrões vistos nos editais reais: %s', (objeto, titulo, tipo) => {
    expect(assunto(objeto)).toEqual({ titulo, tipo });
  });

  it.each([
    ['Seguros de carros GCM SC 1814/2026 SEI 31539/2026 PC 149/2026 D.E 57/2026', 'Seguros de carros GCM', null],
    [
      'PROC ADM 1078/2026 - CONTRATAÇÃO DE EMPRESA ESPECIALIZADA PARA ADEQUAÇÃO DO SISTEMA DE COMBATE A INCÊNDIO DA UNIDADE DE PRONTO ATENDIMENTO (UPA)',
      'Adequação do sistema de combate a incêndio da unidade de pronto atendimento (UPA)',
      'Serviço',
    ],
    [
      '[Portal de Compras Públicas] - DISPENSA ELETRÔNICA VISANDO A AQUISIÇÃO EMERGENCIAL DE ALUZINCO E CUMEEIRAS PARA DISTRIBUIÇÃO À POPULAÇÃO ATINGIDA PELO TEMPORAL',
      'Aluzinco e cumeeiras para distribuição à população atingida pelo temporal',
      'Compra',
    ],
    [
      'REGISTRO DE PREÇO PARA AQUISIÇÃO DE GÊNEROS ALIMENTÍCIOS NÃO PERECÍVEIS, COMPLEMENTAR AO PREGÃO 038/2026, DESTINADOS A ATENDER AS NECESSIDADES',
      'Gêneros alimentícios não perecíveis',
      'Compra',
    ],
    [
      'Aquisição de equipamentos e materiais permanentes para a Unidade Especializada em Saúde, conforme CONVÊNIO TRANSFEREGOV.BR Nº 961255/2024 – PROPOSTA Nº 01',
      'Equipamentos e materiais permanentes',
      'Compra',
    ],
    [
      'Serviços de conservação rodoviária BR-354/MG km 380,7 ao km 497,2 - Contrato UT06-823/2024',
      'Serviços de conservação rodoviária BR-354/MG km 380,7 ao km 497,2',
      null,
    ],
  ])('sem números de processo: %s', (objeto, titulo, tipo) => {
    expect(assunto(objeto)).toEqual({ titulo, tipo });
  });

  it.each([
    [
      'Ofício n°020/2026 - Solicita abertura de processo licitatório para contratação de empresa especializada para prestação de serviços com lavagem de veículos',
      'Serviços com lavagem de veículos',
      'Serviço',
    ],
    ['RSD-020105/001259/2026-AQUISIÇÃO DE 02 (DOIS) VEÍCULOS TIPO VAN COM ACESSIBILIDADE', '02 veículos tipo van com acessibilidade', 'Compra'],
    [
      'PE DGA 90425/2026- Registro de Preços de Sistemas de Monitorização Hemodinâmica e Intracraniana',
      'Sistemas de Monitorização Hemodinâmica e Intracraniana',
      null,
    ],
    [
      'CONTRATAÇÃO DE EMPRESA ESPECIALIZADA NO RAMO DA CONSTRUÇÃO CIVIL, VISANDO A CONTRATAÇÃO DE EMPRESA ESPECIALIZADA PARA CONSTRUÇÃO DE UM BANHEIRO MASCULINO',
      'Construção de um banheiro masculino',
      'Obra',
    ],
    [
      'CHAMADA PÚBLICA PARA AQUISIÇÃO EXCLUSIVA DE GÊNEROS ALIMENTÍCIOS DA AGRICULTURA FAMILIAR PARA O PROGRAMA DE ALIMENTAÇÃO ESCOLAR',
      'Gêneros alimentícios da agricultura familiar para o programa de alimentação escolar',
      'Compra',
    ],
    [
      'REPUBLICAÇÃO - CREDENCIAMENTO 001/2025-Credenciamento de Companhias/Agências de Viagens e Turismo, objetivando o menor preço',
      'Credenciamento de Companhias/Agências de Viagens e Turismo',
      null,
    ],
    ['Contratação de obras e serviços de engenharia em estradas vicinais, em conformidade com o convênio', 'Obras e serviços de engenharia em estradas vicinais, em conformidade com o convênio', 'Obra'],
  ])('aberturas com número de documento: %s', (objeto, titulo, tipo) => {
    expect(assunto(objeto)).toEqual({ titulo, tipo });
  });

  it.each([
    [
      'Credenciamento de pessoas jurídicas para prestação de serviços médicos, sem vínculo empregatício, em caráter complementar ao Sistema Único de Saúde – SUS',
      'Serviços médicos, sem vínculo empregatício, em caráter complementar ao Sistema Único de Saúde – SUS',
      'Credenciamento',
    ],
    [
      'Republicação - Contratação de empresa especializada para a execução das obras civis de construção da Creche do Copacabana, Tipo 2',
      'Construção da Creche do Copacabana, Tipo 2',
      'Obra',
    ],
    ['DGA N° 90415/2026 - Registro de Preços de Condicionadores de Ar com instalação inclusa', 'Condicionadores de Ar com instalação inclusa', null],
    ['Aquisição de Materiais de TIC para esta SECTI - Sei nº 3100000021.001010/2026-11', 'Materiais de TIC para esta SECTI', 'Compra'],
    ['EDITAL DE CREDENCIAMENTO 004-2026 - MUSICOS PARA EVENTOS DO MUNICÍPIO', 'Musicos para eventos do município', 'Credenciamento'],
  ])('casos da comparação com os títulos reais: %s', (objeto, titulo, tipo) => {
    expect(assunto(objeto)).toEqual({ titulo, tipo });
  });

  it('"nº" não fica solto quando o número sai', () => {
    expect(assunto('Leilão Público de Bens Imóveis nº 09/2026 com sessão híbrida presencial e online').titulo).toBe(
      'Leilão Público de Bens Imóveis com sessão híbrida presencial e online',
    );
  });

  it('rótulo "EDITAL DE CREDENCIAMENTO 014/2026 -" sai do começo', () => {
    expect(
      assunto('EDITAL DE CREDENCIAMENTO 014/2026 - CREDENCIAMENTO DE PESSOA JURÍDICA, PREFERENCIALMENTE MICROEMPREENDEDOR INDIVIDUAL (MEI) PARA PRESTAÇÃO DE SERVIÇO DE TRANSPORTE').titulo,
    ).toMatch(/^Credenciamento de pessoa jurídica/);
  });

  it('datas no título continuam (11/12/2026 não é número de processo)', () => {
    expect(
      assunto('Contratação de empresa para organização do evento "Escolha das Soberanas da Expo Concórdia 2027", em 11/12/2026, compreendendo workshops').titulo,
    ).toContain('11/12/2026');
  });

  it('abertura sem assunto ("Registro de Preços, pelo período…") volta ao título normal', () => {
    const objeto = 'Registro de Preços, pelo período de 1 (um) ano, podendo ser prorrogado por igual período';
    expect(assunto(objeto)).toEqual({ titulo: tituloCurto(objeto).titulo, tipo: null });
  });

  it.each(casos)('%s', (objeto, titulo, tipo) => {
    expect(assunto(objeto)).toEqual({ titulo, tipo });
  });

  it('o que sobra curto demais volta ao título normal', () => {
    expect(assunto('Contratação de empresa especializada para a prestação de serviços de TI').titulo).toBe(
      'Contratação de empresa especializada para a prestação de serviços de TI',
    );
  });

  it('título longo corta na palavra', () => {
    const r = assunto(
      'Aquisição de equipamentos e mobiliário hospitalar para equipar as unidades de pronto atendimento e o centro de especialidades médicas e odontológicas do consórcio intermunicipal',
    );
    expect(r.titulo.length).toBeLessThanOrEqual(121);
    expect(r.titulo.startsWith('Equipamentos e mobiliário hospitalar')).toBe(true);
  });
});

describe('tituloCurto', () => {
  const CRAS =
    'Construção de um Centro de Referência de Assistência Social (CRAS), composto por: 02 salas de atendimento familiar; 01 sala de administração/coordenação; recepção; sala de atendimentos; instalação sanitária; instalação sanitária PCD feminino; instalação sanitária PCD masculino; almoxarifado; copa/cozinha; circulação; DML; área de serviço; e sala de múltiplo uso.';

  it('objeto curto fica inteiro, sem prefixo entre colchetes', () => {
    expect(tituloCurto('[Portal de Compras Públicas] - Aquisição de uniformes escolares')).toEqual({
      titulo: 'Aquisição de uniformes escolares',
      cortado: false,
    });
  });
  it('objeto longo corta no fim da primeira cláusula', () => {
    expect(tituloCurto(CRAS)).toEqual({
      titulo: 'Construção de um Centro de Referência de Assistência Social (CRAS), composto por: 02 salas de atendimento familiar…',
      cortado: true,
    });
  });
  it('sem frase curta, corta na palavra', () => {
    const longo =
      'Contratação de empresa especializada para conclusão dos serviços remanescentes do Pavilhão Agropecuário do Parque de Exposições Rovilho Bortoluzzi com área construída total de 1.600m² implantado no Parque de Exposições';
    const r = tituloCurto(longo);
    expect(r.cortado).toBe(true);
    expect(r.titulo.endsWith('…')).toBe(true);
    expect(r.titulo.length).toBeLessThanOrEqual(141);
    expect(longo.startsWith(r.titulo.slice(0, -1))).toBe(true);
  });
  it('objeto em maiúsculas vira texto normal', () => {
    expect(tituloCurto('AQUISIÇÃO DE UNIFORMES E EPI PARA A SECRETARIA DE SAÚDE').titulo).toBe(
      'Aquisição de uniformes e EPI para a secretaria de saúde',
    );
  });
});

describe('partirItem', () => {
  it('nome repetido pelo catálogo sai uma vez só e sem gritos', () => {
    expect(partirItem('CABO HDMI CABO HDMI - Versão: 2.1 Comprimento: 5 metros').nome).toBe('Cabo HDMI');
    expect(partirItem('MOUSE MOUSE - Tipo: vertical Conector: USB').nome).toBe('Mouse');
    expect(
      partirItem(
        'COMPONENTES E MATERIAIS DE TELECOMUNICACAO COMPONENTES E MATERIAIS DE TELECOMUNICACAO - Descrição: Carregador USB Tipo: parede',
      ).nome,
    ).toBe('Componentes e materiais de telecomunicacao');
  });

  it('nome longo em maiúsculas vira texto normal mesmo com atributos em minúsculas', () => {
    const r = partirItem(
      'CABO ELETRICO ELETRONICO CABO ELETRICO ELETRONICO - CABO UTP CAT5 EXTERNO CABO CARREGADOR TIPO LIGHTNING PARA DISPOSITIVOS MOVEIS COM COMPRIMENTO DE UM METRO E MEIO, cor preta, embalagem individual lacrada com garantia de fabrica de doze meses e nota fiscal',
    );
    expect(r.nome).toBe('Cabo eletrico eletronico');
    expect(r.obs?.startsWith('CABO UTP CAT5')).toBe(true);
  });

  it('"(L1) 6601.117295-Nome, TIPO: …" vira etiqueta de lote, sem o código e com chaves em maiúsculas', () => {
    expect(
      partirItem('(L1) 6601.117295-Botijão, TIPO: Criogênico, USO: Armazenamento de amostras biológicas, DIMENSÃO: Diâmetro da boca 70mm'),
    ).toEqual({
      nome: 'Botijão',
      atributos: [
        { chave: 'tipo', valor: 'Criogênico' },
        { chave: 'uso', valor: 'Armazenamento de amostras biológicas' },
        { chave: 'dimensão', valor: 'Diâmetro da boca 70mm' },
      ],
      obs: null,
      etiquetas: ['Lote 1'],
    });
  });

  it('palavra repetida de verdade fica (só a repetição no começo do nome sai)', () => {
    expect(partirItem('Papel A4 papel reciclado - cor: branca, gramatura: 75 g').nome).toBe('Papel A4 papel reciclado');
  });

  it('item no padrão de catálogo vira nome + atributos + observação', () => {
    expect(
      partirItem(
        'Película Auto-Adesiva material: poliester laminado, aplicação: controle e proteção solar, visibilidade: 4, cor: preta, características adicionais: energia solar bloqueada 43%, espessura: 1,00 Conforme especificações do título 1 do Termo de Referência Anexo I do Edital',
      ),
    ).toEqual({
      nome: 'Película Auto-Adesiva',
      atributos: [
        { chave: 'material', valor: 'poliester laminado' },
        { chave: 'aplicação', valor: 'controle e proteção solar' },
        { chave: 'visibilidade', valor: '4' },
        { chave: 'cor', valor: 'preta' },
        { chave: 'características adicionais', valor: 'energia solar bloqueada 43%' },
        { chave: 'espessura', valor: '1,00' },
      ],
      obs: 'Conforme especificações do título 1 do Termo de Referência Anexo I do Edital',
      etiquetas: [],
    });
  });
  it('valor com vírgulas internas e texto livre do órgão no fim', () => {
    expect(
      partirItem(
        'Doce Confeitado características adicionais: pronta para consumo, ingredientes: leite condensado, gemas de ovos, manteiga, açúcar, peso: 20, tipo: ouriço de coco queimado Bolacha caseira com cobertura de glacê',
      ),
    ).toEqual({
      nome: 'Doce Confeitado',
      atributos: [
        { chave: 'características adicionais', valor: 'pronta para consumo' },
        { chave: 'ingredientes', valor: 'leite condensado, gemas de ovos, manteiga, açúcar' },
        { chave: 'peso', valor: '20' },
        { chave: 'tipo', valor: 'ouriço de coco queimado' },
      ],
      obs: 'Bolacha caseira com cobertura de glacê',
      etiquetas: [],
    });
  });
  it('lote e texto em maiúsculas', () => {
    expect(
      partirItem('LOTE 08 - ARGAMASSA PARA REJUNTAMENTO DE PLACAS CERAMICAS (REJUNTE), TIPO I. FORNECIDO EM CORES SORTIDAS. PRODUTO EM CONFORMIDADE COM ABNT NBR 14992. REGIAO VIII.'),
    ).toEqual({
      nome: 'Argamassa para rejuntamento de placas ceramicas (rejunte), tipo I',
      atributos: [],
      obs: 'Fornecido em cores sortidas. Produto em conformidade com ABNT NBR 14992. Regiao VIII.',
      etiquetas: ['Lote 8'],
    });
  });
  it('primeira linha curta vira o nome e o código do catálogo vira etiqueta', () => {
    expect(
      partirItem(
        'Confecção de Botom / Medalha\r\nMedalha personalizada (Ouro, Prata e Bronze) em metal fundido, com diâmetro de 8 cm.\r\nPersonalização conforme modelo enviado pelo contratante.\r\nCATSER 17760',
      ),
    ).toEqual({
      nome: 'Confecção de Botom / Medalha',
      atributos: [],
      obs: 'Medalha personalizada (Ouro, Prata e Bronze) em metal fundido, com diâmetro de 8 cm. Personalização conforme modelo enviado pelo contratante.',
      etiquetas: ['CATSER 17760'],
    });
  });
  it('texto longo sem padrão: nome cortado e texto inteiro como observação', () => {
    const t =
      'Bombom sabor morango com cobertura de chocolate, contendo açúcar, xarope de glicose, gordura vegetal fracionada, leite em pó desnatado, cacau em pó, soro de leite em pó e ácido láctico';
    const r = partirItem(t);
    expect(r.nome.endsWith('…')).toBe(true);
    expect(r.nome.length).toBeLessThanOrEqual(91);
    expect(r.atributos).toEqual([]);
    expect(r.obs).toBe(t);
  });
  it('item curto sem padrão vira só o nome', () => {
    expect(partirItem('Corda de sisal 10 mm')).toEqual({ nome: 'Corda de sisal 10 mm', atributos: [], obs: null, etiquetas: [] });
  });
});

describe('lotesDaInfo e paragrafos', () => {
  it('lista de lotes do PNCP vira lista', () => {
    expect(
      lotesDaInfo('(L1):LOTE 01 Câmera\nDigital com\nlente\nintercambiável,(L2):LOTE 02 Lente\r\nobjetiva APS-C,(L3):LOTE 03 Tripé\r\npara\r\ncâmera'),
    ).toEqual([
      { numero: 1, texto: 'Câmera Digital com lente intercambiável' },
      { numero: 2, texto: 'Lente objetiva APS-C' },
      { numero: 3, texto: 'Tripé para câmera' },
    ]);
  });
  it('um lote só ou texto comum não é lista', () => {
    expect(lotesDaInfo('(L1):Contratação de empresa para manutenção de ar condicionado')).toBeNull();
    expect(lotesDaInfo('Para todos os itens será assegurada a preferência para ME/EPP.')).toBeNull();
  });
  it('parágrafos separados por linha em branco, cada um limpo', () => {
    expect(paragrafos('Primeiro parágrafo\ncom quebra.\n\n  SEGUNDO PARÁGRAFO EM MAIÚSCULAS.  ')).toEqual([
      'Primeiro parágrafo com quebra.',
      'Segundo parágrafo em maiúsculas.',
    ]);
  });
});

describe('correções da revisão (rodada 1)', () => {
  describe('I1: primeira linha só vira nome quando é um título de verdade', () => {
    it('frase quebrada em duas linhas depois de vírgula continua inteira', () => {
      expect(partirItem('Caneta esferográfica azul, corpo transparente,\nponta fina 1,0 mm, caixa com 50 unidades')).toEqual({
        nome: 'Caneta esferográfica azul, corpo transparente, ponta fina 1,0 mm, caixa com 50 unidades',
        atributos: [],
        obs: null,
        etiquetas: [],
      });
    });
    it('segunda linha em minúscula é continuação da frase', () => {
      const r = partirItem('Uniforme escolar para os alunos da rede\nmunicipal de ensino');
      expect(r.nome).toBe('Uniforme escolar para os alunos da rede municipal de ensino');
      expect(r.obs).toBeNull();
    });
  });

  describe('I2: o último valor só é cortado onde começa uma palavra capitalizada', () => {
    it('unidade com maiúscula no fim do valor fica no valor', () => {
      const r = partirItem('Lâmpada LED potência: 9 W, tensão: 220 V');
      expect(r.atributos).toEqual([
        { chave: 'potência', valor: '9 W' },
        { chave: 'tensão', valor: '220 V' },
      ]);
      expect(r.obs).toBeNull();
    });
    it('sigla com várias maiúsculas fica no valor', () => {
      const r = partirItem('Placa cerâmica material: porcelanato, norma: ABNT NBR 5');
      expect(r.atributos[r.atributos.length - 1]).toEqual({ chave: 'norma', valor: 'ABNT NBR 5' });
      expect(r.obs).toBeNull();
    });
  });

  describe('I3: o rótulo "LOTE nn" só sai quando é o mesmo número de (Ln)', () => {
    it('rótulo diferente de (Ln) fica no texto', () => {
      const r = lotesDaInfo('(L1):LOTE 05 Botina de segurança,(L2):LOTE 06 Luva nitrílica');
      expect(r).toEqual([
        { numero: 1, texto: 'LOTE 05 Botina de segurança' },
        { numero: 2, texto: 'LOTE 06 Luva nitrílica' },
      ]);
      expect(r?.[0].texto).toContain('05');
      expect(r?.[1].texto).toContain('06');
    });
    it('"Lote 20 unidades" não é rótulo; "Lote 2" no (L2) é', () => {
      const r = lotesDaInfo('(L1):Lote 20 unidades de camisa,(L2):Lote 2 calças');
      expect(r).not.toBeNull();
      expect(r?.[0].texto).toContain('20 unidades de camisa');
      expect(r?.[1].texto).toBe('Calças');
    });
  });

  describe('chave simples logo depois de partícula não conta', () => {
    it('"Luva de segurança: ..." não vira nome "Luva de"', () => {
      const r = partirItem('Luva de segurança: tamanho M, cor: azul');
      expect(r.nome).not.toBe('Luva de');
      expect(r.atributos.map((a) => a.chave)).not.toContain('segurança');
    });
    it('"prazo de entrega" é chave composta', () => {
      const r = partirItem('Bota material: couro, cor: preta, prazo de entrega: 10 dias');
      expect(r.atributos).toContainEqual({ chave: 'prazo de entrega', valor: '10 dias' });
      expect(r.atributos).toContainEqual({ chave: 'cor', valor: 'preta' });
    });
  });

  describe('siglas do nicho (EPI e uniformes)', () => {
    it('CA e tamanhos de roupa ficam em maiúsculas', () => {
      expect(semGritos('BOTINA DE SEGURANÇA CA 12345 TAMANHO GG')).toBe('Botina de segurança CA 12345 tamanho GG');
    });
  });

  describe('robustez', () => {
    it('palavra do protótipo de objeto (constructor) não vira "function"', () => {
      // Pedido original: texto todo em maiúsculas (não chegava a falhar, pois as chaves de UNIDADES são maiúsculas).
      expect(semGritos('ITEM CONSTRUCTOR E VALOR PARA TODOS OS LOTES')).not.toContain('function');
      // Caso que realmente reproduz: palavra em minúsculo dentro de texto majoritariamente em maiúsculas.
      const r = semGritos('ITEM PARA TODOS OS LOTES DO PROJETO ESCOLAR constructor');
      expect(r).not.toContain('function');
      expect(r).toBe('Item para todos os lotes do projeto escolar constructor');
    });
    it('código entre parênteses não deixa "()" e etiqueta repetida some', () => {
      expect(partirItem('Caneta azul (CATMAT 123) CATMAT 123')).toEqual({
        nome: 'Caneta azul',
        atributos: [],
        obs: null,
        etiquetas: ['CATMAT 123'],
      });
    });
    it('item que é só código ou só rótulo de lote não fica com nome vazio', () => {
      const a = partirItem('CATMAT 123');
      const b = partirItem('LOTE 08 - ');
      expect(a.nome).not.toBe('');
      expect(b.nome).not.toBe('');
    });
  });
});
