// Limpeza dos textos que vêm do PNCP (objeto, itens, informações complementares) para leitura.
// Só reorganiza o que veio: não inventa nem remove informação (a não ser espaços, prefixo de sistema e códigos que viram etiqueta).

const SIGLAS = new Set([
  'ABNT', 'NBR', 'CRAS', 'CREAS', 'CAPS', 'UBS', 'UPA', 'SUS', 'ME', 'EPP', 'MEI', 'CNPJ', 'CPF', 'ART', 'RRT',
  'EPI', 'LED', 'PVC', 'GLP', 'ISO', 'INMETRO', 'ANVISA', 'CATMAT', 'CATSER', 'PCD', 'DML', 'PNCP', 'SRP', 'TI',
  'USB', 'HDMI', 'LCD', 'GPS', 'SAMU', 'UTI', 'APAE', 'CMEI', 'EMEF', 'EMEI', 'ESF', 'IPTU', 'ICMS', 'ISS', 'INSS',
  'FGTS', 'CNH', 'ONG', 'MDF', 'SSD', 'RAM', 'CPU', 'TV', 'DVD', 'NR', 'ABS', 'HD',
  // Órgãos (páginas /licitacoes/orgao)
  'FMS', 'FMAS', 'SAAE', 'DETRAN',
  // EPI e uniformes: Certificado de Aprovação e tamanhos de roupa
  'CA', 'PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG', 'EG', 'EGG', 'XL', 'XXL',
  // UFs, sem SE e PE (em maiúsculas costumam ser "se" e "pé")
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'TO',
]);
const ROMANOS = /^(?:I{1,3}|IV|VI{0,3}|IX|XI{0,3}|XIV|XV|XX)$/;
const UNIDADES: Record<string, string> = {
  KG: 'kg', ML: 'ml', CM: 'cm', MM: 'mm', KM: 'km', 'M²': 'm²', 'M³': 'm³', UN: 'un', UND: 'und', PCT: 'pct', CX: 'cx', LT: 'lt', GR: 'gr',
};
const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos', 'a', 'o', 'para']);
const CHAVES_COMPOSTAS = [
  'características adicionais', 'informações adicionais', 'especificações técnicas', 'especificações mínimas',
  'unidade de fornecimento', 'prazo de validade', 'forma de apresentação', 'prazo de entrega', 'local de entrega',
];
const PALAVRA = /[\p{L}\p{N}²³]+/gu;
const PREFIXO = /^\s*\[[^\]]*\]\s*[-–]?\s*/;
const CODIGO = /\b(CATMAT|CATSER)\s*:?\s*(\d+)\b/gi;
const LOTE = /^(?:lote\s*0*(\d+)\s*[-–:]|\(L0*(\d+)\))\s*/i;
/** Código do catálogo estadual no começo do item ("6601.117295-Botijão"). */
const CODIGO_INICIAL = /^\d{4}\.\d{3,}\s*[-–]\s*/;
const LOTE_TEXTO = /^lote\s*0*\d+\s*[-–:]?\s*/i;

/** Junta quebras de linha, colapsa espaços e tira espaço antes de pontuação. */
export function limparEspacos(t: string): string {
  return t.replace(/\s+/g, ' ').replace(/\s+([,.;:!?)])/g, '$1').replace(/\(\s+/g, '(').trim();
}

/** Tira o prefixo entre colchetes que alguns sistemas põem no objeto ("[Portal de Compras Públicas] -"). */
export function tirarPrefixo(t: string): string {
  return t.replace(PREFIXO, '');
}

/** Texto com pelo menos 8 letras e mais de 70% delas maiúsculas. */
export function emMaiusculas(t: string, minLetras = 8): boolean {
  const maiusculas = (t.match(/\p{Lu}/gu) ?? []).length;
  const minusculas = (t.match(/\p{Ll}/gu) ?? []).length;
  const letras = maiusculas + minusculas;
  return letras >= minLetras && maiusculas / letras > 0.7;
}

function capitalizar(t: string): string {
  return t.replace(/^([^\p{L}]*)(\p{Ll})/u, (_, antes: string, letra: string) => antes + letra.toLocaleUpperCase('pt-BR'));
}

function maiusculaNasFrases(t: string): string {
  return t.replace(/(^|[.!?]\s+)([^\p{L}]*)(\p{Ll})/gu, (_, fim: string, antes: string, letra: string) => fim + antes + letra.toLocaleUpperCase('pt-BR'));
}

/** Texto TODO EM MAIÚSCULAS vira texto normal (frases com inicial maiúscula), preservando siglas, números, romanos e unidades. */
export function semGritos(t: string, minLetras = 8): string {
  if (!emMaiusculas(t, minLetras)) return t;
  const baixo = t.replace(PALAVRA, (p) => {
    if (SIGLAS.has(p) || ROMANOS.test(p)) return p;
    if (Object.hasOwn(UNIDADES, p)) return UNIDADES[p];
    if (/\d/.test(p)) return p;
    return p.toLocaleLowerCase('pt-BR');
  });
  return maiusculaNasFrases(baixo);
}

/** Nome de órgão ou unidade: em maiúsculas vira "Prefeitura Municipal de Itá" (partículas em minúsculo, siglas mantidas). */
export function nomeProprio(t: string): string {
  const limpo = limparEspacos(t);
  if (!emMaiusculas(limpo)) return limpo;
  let primeira = true;
  return limpo.replace(PALAVRA, (p) => {
    const eraPrimeira = primeira;
    primeira = false;
    if (SIGLAS.has(p) || ROMANOS.test(p) || /\d/.test(p)) return p;
    const min = p.toLocaleLowerCase('pt-BR');
    if (!eraPrimeira && PARTICULAS.has(min)) return min;
    return min.charAt(0).toLocaleUpperCase('pt-BR') + min.slice(1);
  });
}

/** Limpeza completa de um trecho: prefixo, espaços, maiúsculas e inicial maiúscula. */
export function textoLimpo(t: string): string {
  return capitalizar(semGritos(limparEspacos(tirarPrefixo(t))));
}

/** Parágrafos separados por linha em branco, cada um limpo. */
export function paragrafos(t: string): string[] {
  return t.split(/\n\s*\n/).map(textoLimpo).filter(Boolean);
}

export type Titulo = { titulo: string; cortado: boolean };

/** Objeto limpo; acima de 160 caracteres, corta na primeira frase ou cláusula (". " ou "; ") entre 40 e 140, ou na palavra. */
export function tituloCurto(objeto: string): Titulo {
  const limpo = textoLimpo(objeto);
  if (limpo.length <= 160) return { titulo: limpo, cortado: false };
  const fins = [limpo.indexOf('. ', 40), limpo.indexOf('; ', 40)].filter((i) => i >= 40 && i <= 140);
  if (fins.length) {
    const fim = Math.min(...fins);
    return { titulo: limpo.slice(0, fim) + (limpo[fim] === '.' ? '.' : '…'), cortado: true };
  }
  const espaco = limpo.lastIndexOf(' ', 140);
  return { titulo: `${limpo.slice(0, espaco > 40 ? espaco : 140).replace(/[\s,;:.-]+$/, '')}…`, cortado: true };
}

export type TipoObjeto = 'Serviço' | 'Compra' | 'Obra' | 'Credenciamento';
export type Assunto = { titulo: string; tipo: TipoObjeto | null };

/** Palavras comuns que alguns órgãos mandam sem acento. */
const ACENTOS: Record<string, string> = {
  contratacao: 'contratação', confeccao: 'confecção', aquisicao: 'aquisição', aquisicoes: 'aquisições',
  prestacao: 'prestação', servico: 'serviço', servicos: 'serviços', manutencao: 'manutenção', execucao: 'execução',
  licitacao: 'licitação', preco: 'preço', precos: 'preços', locacao: 'locação', construcao: 'construção',
  educacao: 'educação', saude: 'saúde', municipio: 'município', pecas: 'peças', veiculos: 'veículos',
  alimenticios: 'alimentícios', generos: 'gêneros', informatica: 'informática', eletrica: 'elétrica',
  hidraulica: 'hidráulica', mecanica: 'mecânica', graficos: 'gráficos', medico: 'médico', medicos: 'médicos',
  odontologicos: 'odontológicos', pavimentacao: 'pavimentação', iluminacao: 'iluminação', reforma: 'reforma',
  instalacao: 'instalação', ampliacao: 'ampliação', alimentacao: 'alimentação', reposicao: 'reposição',
  concessao: 'concessão', espacos: 'espaços', publicos: 'públicos', publicas: 'públicas', exploracao: 'exploração',
  realizacao: 'realização', medicas: 'médicas', juridica: 'jurídica', juridicas: 'jurídicas', fisica: 'física',
  fisicas: 'físicas', veterinarios: 'veterinários', alimenticio: 'alimentício', perecivel: 'perecível',
  pereciveis: 'perecíveis', eletronico: 'eletrônico', eletronicos: 'eletrônicos', residuos: 'resíduos',
  solidos: 'sólidos', transito: 'trânsito', farmacia: 'farmácia', instituicoes: 'instituições',
  criancas: 'crianças', publico: 'público', publica: 'pública', eletrico: 'elétrico', eletricos: 'elétricos',
};

function comAcentos(t: string): string {
  return t.replace(/\p{L}+/gu, (p) => {
    const certo = ACENTOS[p.toLocaleLowerCase('pt-BR')];
    if (!certo || certo === p.toLocaleLowerCase('pt-BR')) return p;
    return p[0] === p[0].toLocaleUpperCase('pt-BR') ? certo[0].toLocaleUpperCase('pt-BR') + certo.slice(1) : certo;
  });
}

/** Preposição obrigatória depois do verbo da abertura ("fornecimento de"), para "Fornecimento e instalação" ficar. */
const DE = String.raw`\s+(?:de|do|da|dos|das|em)\s+`;
const AO = String.raw`(?:\s+(?:a|o))?`;
/** "Contratação de empresa especializada para (a)" e variações. */
const EMPRESA = String.raw`^(?:(?:contratação(?:\s+integrada)?\s+de\s+)?(?:uma\s+)?(?:empresas?|empresa\(s\)|pessoas?\s+jurídicas?)(?:\s+especializadas?)?(?:\s+(?:de|em)\s+engenharia)?,?\s+(?:para|na|no|em|visando|objetivando)${AO}\s+)`;
/** Quem pode se credenciar, quando é genérico (pessoas, empresas, interessados). */
const CREDENCIADOS = String.raw`(?:pessoas?|empresas?|interessad[oa]s|prestadores|entidades|instituições)(?:\s+(?:físicas?|jurídicas?)(?:\s+(?:e|ou|e\s*\/\s*ou)\s+(?:físicas?|jurídicas?))?)?(?:,?\s+(?:especializad[oa]s?|interessad[oa]s?))?`;

/** Aberturas burocráticas; o tipo diz o que a abertura informava. Aplicadas em sequência até nada mudar. */
const ABERTURAS: Array<[RegExp, TipoObjeto | null]> = [
  [/^republicação\s*[-–:]\s*/iu, null],
  [/^edital\s+de\s+credenciamento\s*(?:n[º°o]?\.?\s*)?\d[\d./-]*\s*[-–:]\s*/iu, 'Credenciamento'],
  // Rótulo do documento com número no começo ("PROC ADM 1078/2026 -", "EDITAL DE CREDENCIAMENTO Nº 007/2026 -", "Ofício n°020/2026 -").
  [/^(?:edital(?:\s+de\s+(?:credenciamento|chamamento\s+público|pregão(?:\s+eletrônico)?|licitação))?|proc(?:esso)?\.?(?:\s+adm(?:inistrativo)?\.?)?|pregão(?:\s+eletrônico)?|dispensa(?:\s+eletrônica)?|concorrência(?:\s+eletrônica)?|credenciamento|chamamento\s+público|inexigibilidade|ofício|memorando)(?:\s+\p{L}+){0,2}?\s*(?:n[º°o]?\.?\s*)?\d[\d./-]*\s*[-–:]\s*/iu, null],
  // Código com ano no começo ("RSD-020105/001259/2026-", "PE DGA 90425/2026-").
  [/^(?:\p{L}{2,6}[\s-]+){1,2}(?:n[º°o]?\.?\s*)?[\d./-]*\/20\d\d\s*[-–:]\s*/iu, null],
  [/^visando\s+credenciar\s+/iu, 'Credenciamento'],
  [/^solicita(?:ção\s+de)?\s+abertura\s+de\s+processo\s+licitatório\s+(?:para|visando)(?:\s+a)?\s+/iu, null],
  [/^abertura\s+de\s+processo\s+licitatório\s+(?:através\s+de|por\s+meio\s+de|para)\s+/iu, null],
  // "…especializada no ramo da construção civil, visando a contratação de empresa…": o ramo não é o assunto.
  [/^ramo\s+d[aeo]\s+[^,]{3,60},\s*(?:visando|objetivando|para)(?:\s+a)?\s+/iu, null],
  [/^chamad[ao]\s+pública\s+(?:para|de)\s+(?=aquisi|compra|contrata|credenciamento)/iu, null],
  [/^registro\s+de\s+preços?\s+(?:de|dos|das|do)\s+(?!aquisi|compra|contrata|fornecimento|prestação|execução)/iu, null],
  [/^(?:a\s+)?contratação\s+de\s+(?=obras?\s)/iu, 'Obra'],
  // Códigos de processo no começo ("RP", "PE 111 CG 97").
  [/^(?:(?:RP|SRP|PE|PP|CC|CP|DL|TP|CG|IN)\b\.?\s*(?:n?º?\s*[\d/.-]+\s*)?)+(?=\p{Lu})/u, null],
  [/^[A-Z]{2,6}(?:-[A-Z]{1,3})?\s*n?º?\s*\d[\d/.-]*\s*[-–:]?\s*(?=\p{L})/u, null],
  [/^(?:valor\s+)?referente\s+(?:a\s+|à\s+)?/iu, null],
  [/^(?:processo\s+licitatório|pregão\s+eletrônico(?:\s+tradicional)?|concorrência\s+eletrônica|dispensa\s+eletrônica)(?:\s+de\s+(?:concorrência|pregão)\s+eletrônic[oa])?\s+(?:para|visando)\s+/iu, null],
  [/^(?:registro\s+de\s+preços?\s+)?(?:visando|objetivando|para)\s+a\s+seleção\s+da\s+proposta\s+mais\s+vantajosa\s+(?:para|visando)(?:\s+a)?\s+/iu, null],
  // "A presente licitação / O presente procedimento licitatório / O presente chamamento público tem por objeto (a)"
  [/^(?:a|o)\s+(?:presente|referida)(?:\s+[\p{L}]+){1,3}?\s+(?:tem|têm)\s+(?:por|como)\s+(?:objeto|objetivo|finalidade)(?:\s+(?:a|o))?\s*:?\s*/iu, null],
  [/^(?:o\s+)?objeto\s+(?:da|do)\s+(?:presente\s+)?(?:[\p{L}]+\s+){1,3}?(?:é|consiste)(?:\s+(?:a|o|na|no|em))?\s*:?\s*/iu, null],
  [/^constitui\s+(?:o\s+)?objeto\s+(?:da|do|deste|desta)(?:\s+presente)?(?:\s+[\p{L}]+){1,3}?\s+(?:a|o)\s+/iu, null],
  [/^objeto\s*:\s*/iu, null],
  [/^(?:futuras?\s+e\s+eventua(?:l|is)|eventua(?:l|is)\s+e\s+futuras?|eventua(?:l|is))\s+(?=aquisi|compra|contrata|fornecimento)/iu, null],
  [/^(?:sistema\s+de\s+)?registro\s+de\s+preços?(?:\s*\(SRP\))?(?:,\s*pelo\s+(?:prazo|período)\s+de\s+[^,]{1,40},)?(?:\s*[-–:]\s*|\s+(?:para|visando|objetivando|destinad[oa]\s+(?:a|à))(?:\s+(?:a|o))?(?:\s+(?:futuras?|eventua(?:l|is)|parceladas?|e))*\s+)(?=aquisi|compra|contrata|fornecimento|prestação|execução)/iu, null],
  [new RegExp(String.raw`^(?:(?:a|o)\s+)?(?:(?:edital\s+de\s+)?(?:chamamento|chamada)\s+pública?o?\s+(?:para\s+fins\s+de|destinad[oa]\s+ao|para|de)\s+)?(?:o\s+)?credenciamento(?:\s+e\s+contratação)?\s+(?:de|das|dos)\s+${CREDENCIADOS},?\s+(?:para|na|no|em)${AO}\s+(?:(?:prestar|prestarem|prestação\s+d[eoa]s?)\s+)?(?:serviços?${DE})?`, 'iu'), 'Credenciamento'],
  [/^credenciamento\s+de\s+prestadores\s+de\s+serviços?\s+(?:de|em)\s+/iu, 'Credenciamento'],
  [new RegExp(EMPRESA, 'iu'), 'Serviço'],
  [new RegExp(String.raw`^(?:a\s+)?(?:contratação\s+de\s+)?execução\s+(?:de|da|das)\s+obras?(?:\s+civis)?(?:\s+(?:de|do|da|dos|das|em|para)\s+|\s+)`, 'iu'), 'Obra'],
  [new RegExp(String.raw`^(?:a\s+)?(?:contratação\s+(?:de|para)${AO}\s+)?(?:prestação|execução|realização)(?:\s+continuada)?\s+(?:de|do|dos)\s+serviços?(?:\s+continuados?)?${DE}`, 'iu'), 'Serviço'],
  [new RegExp(String.raw`^(?:a\s+)?(?:contratação\s+(?:de|para)${AO}\s+)?(?:prestação|execução)(?:\s+continuada)?\s+de\s+(?=serviços?\s)`, 'iu'), 'Serviço'],
  [new RegExp(String.raw`^(?:(?:a|o)\s+)?(?:contratação\s+de\s+)?(?:aquisição|aquisições|compra|fornecimento)(?:\s+(?:parcelad[oa]s?|emergencia(?:l|is)|futuras?|eventua(?:l|is)|exclusivas?))*${DE}`, 'iu'), 'Compra'],
  [new RegExp(String.raw`^(?:a\s+)?contratação\s+de\s+(?=serviços?${DE})`, 'iu'), 'Serviço'],
  [/^(?:a\s+)?contratação\s+de\s+(?=seguros?\s)/iu, 'Serviço'],
];

/** Começos que indicam obra mesmo quando a abertura dizia "contratação de empresa". */
const OBRA = /^(?:construção|pavimentação|recapeamento|reforma|ampliação|implantação|drenagem|execução\s+da\s+obra)\b/iu;

/** Resultados genéricos demais: voltam ao título normal. */
const GENERICO = /^(?:registro\s+de\s+preços?|registrar\s+preços|contratação|aquisição|serviços?|credenciamento)\b.{0,12}$/iu;

/** Finais que só dizem para quem é, onde fica ou remetem a outro documento. */
const CAUDA = new RegExp(
  String.raw`(?:(?<=[\p{Ll}\d)]{2})\.\s+(?=\p{Lu})|;\s+|,\s*complementar\s+(?:ao|à|a)(?!\p{L})|(?:,\s*|\s+)(?:para\s+(?:atender|suprir|uso|utilização|atendimento)|(?:tudo\s+)?conforme|de\s+acordo\s+com|visando|objetivando|a\s+fim\s+de|com\s+a\s+finalidade|que\s+serão|em\s+atendimento|atendendo|pelo\s+(?:período|prazo)|durante\s+o|no\s+âmbito|junto\s+(?:a|ao|à)|compreendendo|contemplando|incluindo|bem\s+como|mediante|localizad[oa]s?|situad[oa]s?|no\s+município|de\s+forma\s+(?:complementar|integral)|a\s+serem\s|que\s+ser|decorrente\s|\(origem:|destinad[oa]s?\s+(?:a|à|ao|aos|às)\s|aos\s+(?:beneficiários|usuários|servidores|alunos|munícipes|pacientes)|(?:na|no|nas|nos|para\s+(?:a|o|as|os))\s+(?:rede|secretarias?|prefeitura|município|fundo|câmara|departamento|unidades?|escolas?)\b))`,
  'iu',
);

/** Número de processo com rótulo, em qualquer ponto ("SEI 31539/2026", "Contrato UT06-823/2024", "Pregão 038/2026"). */
const CODIGO_PROCESSO =
  /\s*[-–,]?\s*\b(?:SEI|PC|D\.?E|PE|PP|DL|CC|SC|PA|RP|PROC(?:ESSO)?(?:\s+ADM)?|CONTRATO|PREG[ÃA]O|EDITAL|CONV[ÊE]NIO|EMENDA(?:\s+IMPOSITIVA|\s+PARLAMENTAR)?|PORTARIA|PROPOSTA|OF[ÍI]CIO|MEMORANDO)\b\.?\s*(?:N[º°O]?\.?\s*)?[A-Z]{0,4}[-\d][\w./-]*\/\d{2,4}\b(?:-\d{1,3}\b)?/giu;
/** Número/ano solto ("1814/2026"); datas ("11/12/2026"), "14.133/2021" e "2022/2023" ficam. */
const NUMERO_ANO = /(?:\s*\bn[º°]\.?)?\s*(?<![\d/.])(?!20\d\d\/)\d{1,7}\/20\d\d(?![\d/])/giu;

const NUMEROS = 'um|uma|dois|duas|três|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem|cento|duzent[oa]s|trezent[oa]s|quatrocent[oa]s|quinhent[oa]s|seiscent[oa]s|setecent[oa]s|oitocent[oa]s|novecent[oa]s|mil|e';
/** "17 dezessete" / "17 (dezessete)" → "17". */
const EXTENSO = new RegExp(`(\\d+)\\s*\\(?\\s*(?:(?:${NUMEROS})(?:\\s+|(?=\\)))){1,6}\\)?`, 'giu');

/** Assunto do edital em poucas palavras ("Segurança privada"), com o tipo que a abertura burocrática informava. */
export function assunto(objeto: string): Assunto {
  const original = tituloCurto(objeto).titulo;
  let t = comAcentos(textoLimpo(objeto));
  let tipo: TipoObjeto | null = null;
  for (let mudou = true, voltas = 0; mudou && voltas < 8; voltas++) {
    mudou = false;
    for (const [re, tipoDaAbertura] of ABERTURAS) {
      const m = re.exec(t);
      if (m && m[0].length > 0 && m[0].length < t.length) {
        t = t.slice(m[0].length);
        // Credenciamento e obra dizem mais que "serviço"; compra vinda depois de "contratação de empresa" vale.
        if (tipoDaAbertura && tipo !== 'Credenciamento' && tipo !== 'Obra') tipo = tipoDaAbertura;
        mudou = true;
      }
    }
    const semRepetir = semRepeticaoInicial(t);
    if (semRepetir !== t) {
      t = semRepetir;
      mudou = true;
    }
  }
  t = t
    .replace(EXTENSO, '$1 ')
    .replace(CODIGO_PROCESSO, '')
    .replace(NUMERO_ANO, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,;.])/g, '$1')
    .replace(/^[\s\-–:;,.]+/, '');
  const cauda = CAUDA.exec(t);
  // "destinado a…" às vezes é o que diz o assunto ("barracão destinado à compostagem"): só corta se sobrar bastante.
  const minimo = cauda && /destinad/i.test(cauda[0]) ? 30 : 12;
  if (cauda && cauda.index >= minimo) t = t.slice(0, cauda.index);
  // Maiúscula só se o título começa por letra ("06 carretas" fica como está).
  t = t.replace(/[\s,;:.–-]+$/, '').trim().replace(/^\p{Ll}/u, (l) => l.toLocaleUpperCase('pt-BR'));
  if ((t.match(/\p{L}/gu) ?? []).length < 6 || GENERICO.test(t)) return { titulo: original, tipo: null };
  if (OBRA.test(t) && tipo !== 'Credenciamento') tipo = 'Obra';
  return { titulo: tituloCurto(t).titulo.length > 121 ? cortarNaPalavra(t, 120) : t, tipo };
}

function cortarNaPalavra(t: string, max: number): string {
  const espaco = t.lastIndexOf(' ', max);
  return `${t.slice(0, espaco > 40 ? espaco : max).replace(/[\s,;:.–-]+$/, '')}…`;
}

export type Atributo = { chave: string; valor: string };
export type ItemPartido = { nome: string; atributos: Atributo[]; obs: string | null; etiquetas: string[] };

/** Posições dos "atributo: " no padrão de catálogo (chave em minúsculas; algumas chaves compostas conhecidas). */
function acharChaves(t: string): Array<{ inicio: number; fim: number; chave: string }> {
  const chaves: Array<{ inicio: number; fim: number; chave: string }> = [];
  for (const m of t.matchAll(/:\s/g)) {
    const i = m.index ?? 0;
    const antes = t.slice(0, i);
    const baixo = antes.toLocaleLowerCase('pt-BR');
    const composta = CHAVES_COMPOSTAS.find((c) => baixo.endsWith(c) && /(^|[\s,;])$/.test(baixo.slice(0, baixo.length - c.length)));
    if (composta) {
      chaves.push({ inicio: i - composta.length, fim: i + m[0].length, chave: antes.slice(i - composta.length).toLocaleLowerCase('pt-BR') });
      continue;
    }
    // Chave em maiúsculas ("TIPO: ") só vale no começo ou logo depois de vírgula/ponto e vírgula.
    const maiuscula = /(?:^|[,;]\s*)(\p{Lu}{2,})$/u.exec(antes);
    if (maiuscula && !SIGLAS.has(maiuscula[1])) {
      chaves.push({ inicio: i - maiuscula[1].length, fim: i + m[0].length, chave: maiuscula[1].toLocaleLowerCase('pt-BR') });
      continue;
    }
    const simples = /(?:^|[\s,;])(\p{Ll}[\p{L}]*)$/u.exec(antes);
    if (simples) {
      // "Luva de segurança: ..." não é atributo: a palavra logo antes (separada por um espaço) é uma partícula.
      const anterior = /(\p{L}+) $/u.exec(antes.slice(0, antes.length - simples[1].length));
      if (anterior && PARTICULAS.has(anterior[1].toLocaleLowerCase('pt-BR'))) continue;
      chaves.push({ inicio: i - simples[1].length, fim: i + m[0].length, chave: simples[1] });
    }
  }
  return chaves;
}

/** Tira "CATMAT 123" / "CATSER 123" (guardando em `codigos`, se vier) e os parênteses que ficam vazios. */
function semCodigos(t: string, codigos?: string[]): string {
  return t
    .replace(CODIGO, (_, tipo: string, n: string) => {
      codigos?.push(`${tipo.toUpperCase()} ${n}`);
      return '';
    })
    .replace(/\(\s*\)/g, '');
}

/** Organiza a descrição de um item: nome em destaque, atributos "chave: valor", observação e etiquetas (lote, código do catálogo). */
/** "CABO HDMI CABO HDMI - …" (classe do catálogo + nome repetidos): a repetição no começo sai. */
function semRepeticaoInicial(t: string): string {
  const palavras = [...t.matchAll(/\S+/g)];
  const chave = (i: number) => palavras[i][0].toLocaleLowerCase('pt-BR');
  for (let k = Math.min(8, Math.floor(palavras.length / 2)); k >= 1; k--) {
    let igual = true;
    for (let i = 0; i < k && igual; i++) igual = chave(i) === chave(k + i);
    if (igual) return (t.slice(0, palavras[k].index) + t.slice(palavras[2 * k - 1].index + palavras[2 * k - 1][0].length).trimStart()).trim();
  }
  return t;
}

/** Nome do item: maiúsculas viram texto normal já a partir de 4 letras ("MOUSE" → "Mouse"). */
function nomeDoItem(n: string): string {
  return capitalizar(semGritos(n, 4));
}

export function partirItem(descricao: string): ItemPartido {
  const codigos: string[] = [];
  const linhas = descricao.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let t = semCodigos(limparEspacos(descricao), codigos);
  const etiquetas = [...new Set(codigos)];
  t = semGritos(limparEspacos(t));
  const lote = LOTE.exec(t);
  if (lote) {
    etiquetas.unshift(`Lote ${Number(lote[1] ?? lote[2])}`);
    t = t.slice(lote[0].length);
  }
  t = t.replace(CODIGO_INICIAL, '');
  t = capitalizar(semRepeticaoInicial(t.trim()));

  const chaves = acharChaves(t);
  if (chaves.length >= 2) {
    const nome = nomeDoItem(t.slice(0, chaves[0].inicio).trim().replace(/[\s,;:–-]+$/, ''));
    if (nome) {
      const atributos: Atributo[] = [];
      let obs: string | null = null;
      chaves.forEach((c, k) => {
        let valor = t.slice(c.fim, k + 1 < chaves.length ? chaves[k + 1].inicio : undefined).trim().replace(/[\s,;]+$/, '');
        if (k === chaves.length - 1) {
          // No fim costuma vir o texto livre do órgão, começando com maiúscula.
          const corte = /\s(?=\p{Lu}\p{Ll})/u.exec(valor);
          if (corte && corte.index > 0) {
            obs = valor.slice(corte.index + 1).trim();
            valor = valor.slice(0, corte.index).trim();
          }
        }
        atributos.push({ chave: c.chave, valor });
      });
      return { nome, atributos, obs, etiquetas };
    }
  }

  // Padrão do catálogo: "CLASSE EM MAIÚSCULAS - Descrição: … Tipo: …" → a classe é o nome, o resto é a especificação.
  const classe = /^(.{3,80}?)\s[-–]\s(.+)$/su.exec(t);
  if (!lote && classe && emMaiusculas(classe[1], 4) && !emMaiusculas(classe[2])) {
    return { nome: nomeDoItem(classe[1]), atributos: [], obs: capitalizar(classe[2].trim()), etiquetas };
  }

  // O órgão costuma pôr o título do item na primeira linha.
  // Só vale se a linha não termina em pontuação de continuação e a seguinte começa uma frase (maiúscula ou número).
  if (linhas.length > 1 && !lote && !/[,;:\-–]$/.test(linhas[0]) && /^[\p{Lu}\p{N}]/u.test(linhas[1])) {
    const primeira = capitalizar(semGritos(limparEspacos(semCodigos(linhas[0]))));
    if (primeira.length >= 3 && primeira.length <= 80 && t.startsWith(primeira)) {
      const resto = capitalizar(t.slice(primeira.length).trim());
      return { nome: primeira, atributos: [], obs: resto || null, etiquetas };
    }
  }

  const ponto = t.indexOf('. ');
  if (ponto >= 10 && ponto <= 100) {
    return { nome: nomeDoItem(t.slice(0, ponto)), atributos: [], obs: capitalizar(t.slice(ponto + 2).trim()) || null, etiquetas };
  }
  if (t.length <= 100) {
    // Item que é só código ou só "LOTE 08 - ": o nome vazio não serve, usa a descrição original limpa.
    const nome = nomeDoItem(t.replace(/\.$/, '')) || capitalizar(semGritos(limparEspacos(descricao)));
    return { nome, atributos: [], obs: null, etiquetas };
  }
  const espaco = t.lastIndexOf(' ', 90);
  return { nome: `${nomeDoItem(t.slice(0, espaco > 20 ? espaco : 90)).replace(/[\s,;:.-]+$/, '')}…`, atributos: [], obs: t, etiquetas };
}

export type Lote = { numero: number; texto: string };

/** "(L1):texto,(L2):texto" (padrão do PNCP para lotes) vira lista; um lote só ou texto comum devolve null. */
export function lotesDaInfo(info: string): Lote[] | null {
  const t = limparEspacos(info);
  if (!/^\(L\d+\):/.test(t)) return null;
  const lotes: Lote[] = [];
  for (const m of t.matchAll(/\(L(\d+)\):\s*([\s\S]*?)(?=,?\s*\(L\d+\):|$)/g)) {
    // O rótulo "LOTE nn" só sai quando é o mesmo número de (Ln); "Lote 20 unidades..." ou outro número fica no texto.
    const rotulo = Number(/^lote\s*0*(\d+)\b/i.exec(m[2])?.[1]) === Number(m[1]);
    const texto = textoLimpo((rotulo ? m[2].replace(LOTE_TEXTO, '') : m[2]).replace(/,\s*$/, ''));
    if (texto) lotes.push({ numero: Number(m[1]), texto });
  }
  return lotes.length >= 2 ? lotes : null;
}
