// Limpeza dos textos que vêm do PNCP (objeto, itens, informações complementares) para leitura.
// Só reorganiza o que veio: não inventa nem remove informação (a não ser espaços, prefixo de sistema e códigos que viram etiqueta).

const SIGLAS = new Set([
  'ABNT', 'NBR', 'CRAS', 'CREAS', 'CAPS', 'UBS', 'UPA', 'SUS', 'ME', 'EPP', 'MEI', 'CNPJ', 'CPF', 'ART', 'RRT',
  'EPI', 'LED', 'PVC', 'GLP', 'ISO', 'INMETRO', 'ANVISA', 'CATMAT', 'CATSER', 'PCD', 'DML', 'PNCP', 'SRP', 'TI',
  'USB', 'HDMI', 'LCD', 'GPS', 'SAMU', 'UTI', 'APAE', 'CMEI', 'EMEF', 'EMEI', 'ESF', 'IPTU', 'ICMS', 'ISS', 'INSS',
  'FGTS', 'CNH', 'ONG', 'MDF', 'SSD', 'RAM', 'CPU', 'TV', 'DVD', 'NR', 'ABS', 'HD',
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
      chaves.push({ inicio: i - composta.length, fim: i + m[0].length, chave: antes.slice(i - composta.length) });
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
