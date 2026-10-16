import { describe, expect, it } from 'vitest';
import { emMaiusculas, limparEspacos, lotesDaInfo, nomeProprio, paragrafos, partirItem, semGritos, tituloCurto } from './texto';

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
