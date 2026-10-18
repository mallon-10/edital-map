import { describe, expect, it } from 'vitest';
import {
  chave, expandir, GRUPOS, gruposDigitados, interpretarBusca, LIGACOES, MAX_RELACIONADOS, normalizar, separarNegativos,
  SIGLAS_TERMOS, temTermo, termosParecidos,
} from './termos';

describe('normalizar e chave', () => {
  it('sem acento, minúsculo, pontuação vira espaço, espaços colapsados', () => {
    expect(normalizar('  Luva   Nitrílica ')).toBe('luva nitrilica');
    expect(normalizar('Médico-Hospitalar')).toBe('medico hospitalar');
  });
  it('chave tira o "s" final das palavras de 4+ letras (plural simples)', () => {
    expect(chave('Uniformes')).toBe(chave('uniforme'));
    expect(chave('EPIs')).toBe('epi');
    expect(chave('gás')).toBe('gas');
  });
});

describe('grupos de termos', () => {
  const todos = GRUPOS.flatMap((g) => g.termos);
  it('nenhum termo tem separador de alternativas (public.consulta separaria)', () => {
    for (const t of todos) expect(t).not.toMatch(/[,;|]|\s(e|ou)\s/i);
  });
  it('cada palavra tem 4+ caracteres, é número, sigla conhecida ou palavra de ligação (a busca é por prefixo)', () => {
    const curtas = todos.filter((t) =>
      normalizar(t).split(' ').some((p) => p.length < 4 && !/^\d+$/.test(p) && !SIGLAS_TERMOS.has(p) && !LIGACOES.has(p)),
    );
    expect(curtas).toEqual([]);
  });
  it('nenhum termo repetido (pela chave), nem dentro do grupo nem entre grupos', () => {
    const chaves = todos.map(chave);
    expect(new Set(chaves).size).toBe(chaves.length);
  });
  it('cada grupo cabe no limite de relacionados', () => {
    for (const g of GRUPOS) expect(g.termos.length - 1).toBeLessThanOrEqual(MAX_RELACIONADOS);
  });
  it('cada termo expande para todos os outros termos do seu grupo', () => {
    for (const g of GRUPOS) {
      for (const t of g.termos) {
        expect(expandir([t]).map((r) => r.termo).sort()).toEqual(g.termos.filter((x) => x !== t).sort());
      }
    }
  });
});

describe('expandir', () => {
  it('sem diferença de acento, maiúsculas ou plural', () => {
    expect(expandir(['UNIFORMES']).map((r) => r.termo)).toContain('fardamento');
    expect(expandir(['fardamentos']).map((r) => r.termo)).toContain('uniforme');
    expect(expandir(['Luva Nitrilica']).map((r) => r.termo)).toContain('botina');
  });
  it('termo fora de grupo expande só para si (nenhum relacionado)', () => {
    expect(expandir(['caneca'])).toEqual([]);
    expect(expandir(['luvas de couro de cabra'])).toEqual([]);
  });
  it('cada relacionado diz o assunto e o termo digitado que o trouxe', () => {
    expect(expandir(['uniforme'])[0]).toEqual({ termo: 'fardamento', assunto: 'uniformes profissionais', de: 'uniforme' });
  });
  it('dois digitados do mesmo grupo: sem repetidos e sem devolver o que foi digitado', () => {
    const r = expandir(['uniforme', 'jaleco']).map((x) => x.termo);
    expect(r).not.toContain('jaleco');
    expect(r).not.toContain('uniforme');
    expect(new Set(r).size).toBe(r.length);
  });
  it('no máximo MAX_RELACIONADOS', () => {
    expect(expandir(['EPI', 'uniforme', 'merenda'])).toHaveLength(MAX_RELACIONADOS);
  });
});

describe('separarNegativos', () => {
  it('tira "-palavra" e guarda a palavra', () => {
    expect(separarNegativos('uniforme -escolar')).toEqual({ positivo: 'uniforme', negativos: ['escolar'] });
  });
  it('mantém o separador que vinha colado no negativo', () => {
    expect(separarNegativos('luva -latex, botina')).toEqual({ positivo: 'luva, botina', negativos: ['latex'] });
  });
  it('hífen solto ou no meio da palavra não é negativo', () => {
    expect(separarNegativos('EPI - luva')).toEqual({ positivo: 'EPI - luva', negativos: [] });
    expect(separarNegativos('pré-moldado')).toEqual({ positivo: 'pré-moldado', negativos: [] });
  });
  it('negativo repetido entra uma vez; só negativos deixam o positivo vazio', () => {
    expect(separarNegativos('-escolar -Escolar')).toEqual({ positivo: '', negativos: ['escolar'] });
  });
});

describe('gruposDigitados (mesmos separadores de public.consulta)', () => {
  it('vírgula, ponto e vírgula, barra vertical, " e " e " ou " separam alternativas', () => {
    expect(gruposDigitados('EPI e uniformes, luva; bota | capacete ou óculos')).toEqual(['EPI', 'uniformes', 'luva', 'bota', 'capacete', 'óculos']);
  });
  it('palavras juntas ficam no mesmo grupo; repetido e grupo sem palavra de 2+ caracteres saem', () => {
    expect(gruposDigitados('luva  nitrílica, Luva Nitrilica, a')).toEqual(['luva nitrílica']);
  });
  it('vazio', () => {
    expect(gruposDigitados('   ')).toEqual([]);
  });
});

describe('interpretarBusca', () => {
  it('digitados, relacionados e excluídos', () => {
    const b = interpretarBusca('uniformes -escolar');
    expect(b.positivo).toBe('uniformes');
    expect(b.digitados).toEqual(['uniformes']);
    expect(b.excluidos).toEqual(['escolar']);
    expect(b.relacionados.map((r) => r.termo)).toContain('fardamento');
  });
  it('sem nada', () => {
    expect(interpretarBusca(null)).toEqual({ positivo: null, digitados: [], relacionados: [], excluidos: [] });
    expect(interpretarBusca('  ')).toEqual({ positivo: null, digitados: [], relacionados: [], excluidos: [] });
  });
  it('temTermo: só negativos não são termo', () => {
    expect(temTermo('luva')).toBe(true);
    expect(temTermo('-escolar')).toBe(false);
    expect(temTermo('')).toBe(false);
    expect(temTermo(null)).toBe(false);
  });
});

describe('termosParecidos (sugestões do estado vazio)', () => {
  it('termo do catálogo que começa como o digitado', () => {
    expect(termosParecidos(['farda'])).toEqual(['fardamento']);
  });
  it('nada parecido, sigla curta não vale, e digitado que já é de um grupo não sugere (os do grupo já estão na busca)', () => {
    expect(termosParecidos(['xyzw'])).toEqual([]);
    expect(termosParecidos(['epidemiologia'])).toEqual([]);
    expect(termosParecidos(['uniforme'])).toEqual([]);
    expect(termosParecidos(['luva'])).toEqual([]);
  });
});
