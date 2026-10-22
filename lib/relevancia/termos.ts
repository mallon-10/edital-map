/**
 * Termos relacionados da busca (sinônimos e expressões por assunto), a separação do que foi digitado e os termos
 * excluídos ("-palavra"). Puro: o servidor manda o resultado ao banco (buscar_editais e mapa_editais, 0011) e a
 * explicação da relevância usa os mesmos termos. Trocar a origem dos termos (sinônimos → busca semântica) muda só
 * `expandir`: lista, card e rotas continuam iguais.
 *
 * Regras de cada termo (testadas): sem vírgula, ponto e vírgula, barra vertical, " e " nem " ou " (public.consulta
 * separaria em alternativas); cada palavra com 4+ caracteres, número, sigla de SIGLAS_TERMOS ou palavra de ligação.
 * A busca do banco é por prefixo do radical só em sigla e pedaço de palavra ("rodo" acha "rodovia"); palavra completa
 * casa pelo radical exato, e as de radical ambíguo ("publicidade" = "pública") viram expressões (0020).
 */

/**
 * `categoria`: termos que valem pelo ramo inteiro (o primeiro termo e o termo do assunto entre eles). `sinonimos`: grupos
 * pequenos de sinônimos diretos. A busca avulsa expande qualquer termo para o grupo todo (`expandir`); o Meu Radar, os
 * alertas e o resumo só expandem a categoria para o grupo e o produto para os sinônimos dele (`expandirPerfil`).
 */
export type Grupo = {
  assunto: string;
  termos: readonly string[];
  categoria: readonly string[];
  sinonimos?: readonly (readonly string[])[];
};

export const GRUPOS: readonly Grupo[] = [
  {
    assunto: 'equipamentos de proteção individual',
    termos: [
      'EPI', 'equipamento de proteção individual', 'luva', 'luva nitrílica', 'luva de vaqueta', 'botina', 'bota de segurança',
      'calçado de segurança', 'capacete', 'protetor auricular', 'óculos de proteção', 'máscara PFF2', 'respirador',
      'cinto de segurança', 'colete refletivo', 'perneira',
    ],
    categoria: ['EPI', 'equipamento de proteção individual'],
    sinonimos: [['luva', 'luva nitrílica', 'luva de vaqueta'], ['botina', 'bota de segurança', 'calçado de segurança'], ['máscara PFF2', 'respirador']],
  },
  {
    assunto: 'uniformes profissionais',
    termos: [
      'uniforme', 'fardamento', 'vestuário profissional', 'roupa profissional', 'jaleco', 'camiseta', 'camisa polo', 'jaqueta',
      'agasalho', 'avental', 'bermuda',
    ],
    categoria: ['uniforme', 'fardamento', 'vestuário profissional', 'roupa profissional'],
    sinonimos: [['camiseta', 'camisa polo'], ['jaqueta', 'agasalho']],
  },
  {
    assunto: 'materiais de limpeza',
    termos: [
      'material de limpeza', 'produto de limpeza', 'saneante', 'desinfetante', 'detergente', 'água sanitária', 'sabonete',
      'álcool 70', 'papel higiênico', 'papel toalha', 'saco de lixo', 'vassoura', 'higienização',
    ],
    categoria: ['material de limpeza', 'produto de limpeza', 'saneante'],
    sinonimos: [['desinfetante', 'água sanitária'], ['papel higiênico', 'papel toalha']],
  },
  {
    assunto: 'materiais de construção',
    termos: [
      'material de construção', 'cimento', 'areia', 'brita', 'tijolo', 'bloco de concreto', 'argamassa', 'vergalhão', 'telha',
      'madeira', 'tinta', 'material hidráulico', 'material elétrico',
    ],
    categoria: ['material de construção'],
    sinonimos: [['cimento', 'argamassa'], ['areia', 'brita'], ['tijolo', 'bloco de concreto']],
  },
  {
    assunto: 'móveis',
    termos: ['mobiliário', 'móveis', 'móvel', 'cadeira', 'armário', 'estante', 'sofá', 'longarina', 'mesa de escritório', 'mesa de reunião'],
    categoria: ['mobiliário', 'móveis', 'móvel'],
    sinonimos: [['cadeira', 'longarina'], ['armário', 'estante'], ['mesa de escritório', 'mesa de reunião']],
  },
  {
    assunto: 'alimentos e merenda',
    termos: [
      'merenda', 'merenda escolar', 'alimentação escolar', 'gênero alimentício', 'hortifrutigranjeiro', 'carne bovina', 'frango',
      'leite', 'arroz', 'feijão', 'frutas', 'verduras',
    ],
    categoria: ['merenda', 'merenda escolar', 'alimentação escolar', 'gênero alimentício'],
    sinonimos: [['hortifrutigranjeiro', 'frutas', 'verduras']],
  },
  {
    assunto: 'informática',
    termos: [
      'informática', 'computador', 'microcomputador', 'notebook', 'impressora', 'toner', 'cartucho de tinta', 'teclado', 'mouse',
      'nobreak', 'tablet', 'switch', 'software', 'licença de software',
    ],
    categoria: ['informática'],
    sinonimos: [['computador', 'microcomputador', 'notebook'], ['impressora', 'toner', 'cartucho de tinta'], ['teclado', 'mouse'], ['software', 'licença de software']],
  },
  {
    assunto: 'material de escritório',
    termos: ['material de escritório', 'material de expediente', 'papel A4', 'caneta', 'grampeador', 'envelope', 'clipe', 'lápis'],
    categoria: ['material de escritório', 'material de expediente'],
    sinonimos: [['caneta', 'lápis']],
  },
  {
    assunto: 'medicamentos e material hospitalar',
    termos: [
      'medicamento', 'fármaco', 'material hospitalar', 'material médico-hospitalar', 'insumo hospitalar', 'seringa', 'agulha',
      'gaze', 'luva de procedimento', 'soro fisiológico', 'curativo', 'cateter',
    ],
    categoria: ['medicamento', 'material hospitalar', 'material médico-hospitalar', 'insumo hospitalar'],
    sinonimos: [['medicamento', 'fármaco'], ['seringa', 'agulha'], ['gaze', 'curativo']],
  },
  {
    assunto: 'veículos e peças',
    termos: [
      'veículo', 'automóvel', 'caminhão', 'ônibus', 'motocicleta', 'ambulância', 'peça automotiva', 'autopeças', 'pneu',
      'bateria automotiva', 'óleo lubrificante',
    ],
    categoria: ['veículo'],
    sinonimos: [['veículo', 'automóvel'], ['peça automotiva', 'autopeças']],
  },
  {
    assunto: 'combustíveis',
    termos: ['combustível', 'gasolina', 'óleo diesel', 'etanol', 'GLP', 'ARLA 32', 'abastecimento de veículos'],
    categoria: ['combustível', 'abastecimento de veículos'],
    sinonimos: [['gasolina', 'etanol', 'óleo diesel']],
  },
  {
    assunto: 'obras e reformas',
    termos: ['reforma', 'construção civil', 'pavimentação', 'recapeamento', 'edificação', 'ampliação de prédio', 'drenagem pluvial'],
    categoria: ['reforma', 'construção civil', 'edificação'],
    sinonimos: [['pavimentação', 'recapeamento']],
  },
  {
    assunto: 'manutenção predial',
    termos: [
      'manutenção predial', 'manutenção preventiva', 'manutenção corretiva', 'conservação predial', 'pintura predial',
      'instalação elétrica', 'instalação hidráulica', 'climatização', 'refrigeração',
    ],
    categoria: ['manutenção predial', 'conservação predial'],
    sinonimos: [['manutenção preventiva', 'manutenção corretiva'], ['climatização', 'refrigeração']],
  },
  {
    assunto: 'serviços de saúde',
    termos: [
      'serviço de saúde', 'consulta médica', 'exame laboratorial', 'exame de imagem', 'plantão médico', 'atendimento médico',
      'fisioterapia', 'hemodiálise',
    ],
    categoria: ['serviço de saúde'],
    sinonimos: [['consulta médica', 'atendimento médico', 'plantão médico'], ['exame laboratorial', 'exame de imagem']],
  },
  {
    assunto: 'publicidade e eventos',
    termos: [
      'publicidade', 'propaganda', 'marketing', 'comunicação visual', 'material gráfico', 'serviço gráfico', 'impressão gráfica',
      'organização de eventos', 'produção de eventos', 'material promocional', 'brindes', 'promoção de vendas', 'banner',
    ],
    // "Publicidade" é o assunto (caminho do CNPJ): vale pelo ramo. Marketing é agência: não puxa gráfica, brinde nem evento.
    categoria: ['publicidade'],
    sinonimos: [
      ['marketing', 'publicidade', 'propaganda'], ['comunicação visual', 'banner'], ['material gráfico', 'serviço gráfico', 'impressão gráfica'],
      ['organização de eventos', 'produção de eventos'], ['material promocional', 'brindes'],
    ],
  },
];

/** Teto de relacionados por busca (cada um vira uma checagem por edital no banco). */
export const MAX_RELACIONADOS = 20;
/** Palavras curtas aceitas nos termos: só siglas (a busca é por prefixo: "ar" acharia arroz, areia, armário). */
export const SIGLAS_TERMOS: ReadonlySet<string> = new Set(['epi', 'pff2', 'glp', 'a4']);
/** Palavras de ligação (o banco ignora como palavra vazia do português). */
export const LIGACOES: ReadonlySet<string> = new Set(['de', 'da', 'do', 'das', 'dos', 'para', 'com', 'em']);

/** Sem acento, minúsculo, o que não é letra ou número vira espaço, espaços colapsados. */
export function normalizar(t: string): string {
  return t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/['’]s(?![a-z0-9])/g, 's').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Chave de comparação: normalizado e sem o "s" final das palavras de 4+ letras ("uniformes" = "uniforme"). */
export function chave(t: string): string {
  return normalizar(t)
    .split(' ')
    .map((p) => (p.length >= 4 && p.endsWith('s') ? p.slice(0, -1) : p))
    .join(' ');
}

/**
 * Tira do texto os termos excluídos ("-palavra": hífen colado numa letra ou número no começo da palavra).
 * Um separador colado no negativo ("-latex,") fica no positivo, para as alternativas não se juntarem.
 */
export function separarNegativos(q: string): { positivo: string; negativos: string[] } {
  const positivos: string[] = [];
  const negativos: string[] = [];
  for (const parte of q.trim().split(/\s+/)) {
    const m = /^-([\p{L}\p{N}][^,;|]*)([,;|]*)$/u.exec(parte);
    if (!m) {
      if (parte) positivos.push(parte);
      continue;
    }
    if (!negativos.some((n) => chave(n) === chave(m[1]))) negativos.push(m[1]);
    if (m[2]) positivos.push(m[2]);
  }
  return { positivo: positivos.join(' ').replace(/\s+([,;|])/g, '$1').trim(), negativos };
}

/** Mesmos separadores de public.consulta (0001): vírgula, ponto e vírgula, barra vertical, " e " e " ou ". */
const SEPARADORES = /\s*[,;|]\s*|\s+(?:e|é|ou)\s+/iu;

/** Alternativas digitadas, como o banco separa; sem repetidas (pela chave) e só com palavra de 2+ caracteres. */
export function gruposDigitados(texto: string): string[] {
  const vistos = new Set<string>();
  const grupos: string[] = [];
  for (const bruto of texto.split(SEPARADORES)) {
    const g = bruto.replace(/\s+/g, ' ').trim();
    const k = chave(g);
    if (!k.split(' ').some((p) => p.length >= 2) || vistos.has(k)) continue;
    vistos.add(k);
    grupos.push(g);
  }
  return grupos;
}

export type TermoRelacionado = { termo: string; assunto: string; de: string };

/**
 * Para cada digitado que é termo de um grupo, os outros termos do grupo (sem repetir nem devolver um digitado).
 * Com vários digitados, intercala os relacionados de cada um antes de cortar em `max` (MAX_RELACIONADOS na busca avulsa;
 * o Meu Radar usa um teto menor, MAX_RELACIONADOS_RADAR em lib/radar.ts).
 */
export function expandir(digitados: readonly string[], max: number = MAX_RELACIONADOS): TermoRelacionado[] {
  const listas = digitados.map((d) => {
    const k = chave(d);
    return GRUPOS.filter((g) => g.termos.some((t) => chave(t) === k)).flatMap((g) =>
      g.termos.map((termo) => ({ termo, assunto: g.assunto, de: d })),
    );
  });
  return intercalar(digitados, listas, max);
}

/**
 * Expansão do perfil (Meu Radar, alertas e resumo): termo de categoria → o grupo todo; produto → só os sinônimos do
 * grupinho dele; fora disso, nada. "Marketing" não puxa gráfica nem brinde, e "luva" não puxa capacete.
 */
export function expandirPerfil(digitados: readonly string[], max: number = MAX_RELACIONADOS): TermoRelacionado[] {
  const listas = digitados.map((d) => {
    const k = chave(d);
    return GRUPOS.flatMap((g) => {
      const termos = g.categoria.some((t) => chave(t) === k)
        ? g.termos
        : (g.sinonimos ?? []).filter((s) => s.some((t) => chave(t) === k)).flat();
      return termos.map((termo) => ({ termo, assunto: g.assunto, de: d }));
    });
  });
  return intercalar(digitados, listas, max);
}

/** Intercala os relacionados de cada digitado antes de cortar em `max`, sem repetir nem devolver um digitado. */
function intercalar(digitados: readonly string[], listas: TermoRelacionado[][], max: number): TermoRelacionado[] {
  const vistos = new Set(digitados.map(chave));
  const saida: TermoRelacionado[] = [];
  const maior = Math.max(0, ...listas.map((l) => l.length));
  for (let i = 0; i < maior; i++) {
    for (const lista of listas) {
      const r = lista[i];
      if (!r || vistos.has(chave(r.termo))) continue;
      vistos.add(chave(r.termo));
      saida.push(r);
      if (saida.length >= max) return saida;
    }
  }
  return saida;
}

export type Busca = { positivo: string | null; digitados: string[]; relacionados: TermoRelacionado[]; excluidos: string[] };

/** O campo de busca inteiro → o que o banco recebe e o que a explicação usa. */
export function interpretarBusca(q: string | null): Busca {
  const { positivo, negativos } = separarNegativos(q ?? '');
  const digitados = gruposDigitados(positivo);
  return { positivo: positivo || null, digitados, relacionados: expandir(digitados), excluidos: negativos };
}

/** Há termo de busca (só "-palavra" não é termo: sem termo não há relevância). */
export function temTermo(q: string | null): boolean {
  return gruposDigitados(separarNegativos(q ?? '').positivo).length > 0;
}

/**
 * Termos do catálogo que começam como o digitado, ou o contrário (4+ caracteres): "farda" → "fardamento".
 * Só para digitados fora de grupo: os do grupo já estão na busca (expandir), sugerir um deles não traria nada novo.
 */
export function termosParecidos(digitados: readonly string[], limite = 2): string[] {
  const saida: string[] = [];
  for (const d of digitados) {
    const k = chave(d);
    if (k.length < 4 || GRUPOS.some((g) => g.termos.some((t) => chave(t) === k))) continue;
    for (const g of GRUPOS) {
      for (const t of g.termos) {
        const kt = chave(t);
        if (kt === k || kt.length < 4 || saida.includes(t)) continue;
        if (kt.startsWith(k) || k.startsWith(kt)) saida.push(t);
        if (saida.length === limite) return saida;
      }
    }
  }
  return saida;
}
