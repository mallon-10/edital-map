import { describe, expect, it } from 'vitest';
import {
  adicionarTermos, argumentosRadar, buscaDoRadar, corpoDoRascunho, desdeDaVisita, ENTRADA_RADAR, erroDaEtapa, filtrosDoRadar, lerBuscaMunicipio,
  lerValorReais, linhaDoRadar, MAX_RELACIONADOS_RADAR, MENSAGENS_RADAR, palavraValida, radarDaLinha, rascunhoDoRadar, sugestoesTermos, validarRadar,
  VISIVEIS_GRATIS, vistaDoRadar, type Radar, type RascunhoRadar,
} from './radar';
import { interpretarBusca, MAX_RELACIONADOS } from './relevancia/termos';

const BASE: Radar = { termos: ['uniforme'], termosExcluir: [], ufs: [], municipios: [], valorMin: null, valorMax: null, modalidades: [], soMeEpp: false };
const ok = (c: unknown) => {
  const r = validarRadar(c);
  if (!r.ok) throw new Error(r.erro);
  return r.valor;
};
const erro = (c: unknown) => {
  const r = validarRadar(c);
  return r.ok ? null : r.erro;
};

describe('validarRadar', () => {
  it('mínimo: um produto; o resto com padrão', () => {
    expect(ok({ termos: ['Uniforme'] })).toEqual({ ...BASE, termos: ['Uniforme'] });
  });
  it('separa alternativas digitadas juntas e tira repetidos pela chave', () => {
    expect(ok({ termos: ['luva, botina', 'Luvas', 'EPI e uniformes'] }).termos).toEqual(['luva', 'botina', 'EPI', 'uniformes']);
  });
  it('produtos: pelo menos 1, até 10, até 60 caracteres, com palavra de 3+ letras', () => {
    expect(erro({ termos: [] })).toBe(MENSAGENS_RADAR.semTermo);
    expect(erro({})).toBe(MENSAGENS_RADAR.semTermo);
    expect(erro({ termos: Array.from({ length: 11 }, (_, i) => `produto${i}`) })).toBe(MENSAGENS_RADAR.muitosTermos);
    expect(erro({ termos: ['a'.repeat(61)] })).toBe(MENSAGENS_RADAR.termoLongo);
    expect(erro({ termos: ['de ti'] })).toBe(MENSAGENS_RADAR.termoCurto);
    expect(erro({ termos: [42] })).toBe(MENSAGENS_RADAR.formulario);
  });
  it('produto vale com palavra de 3+ letras, com número (A4) ou sigla conhecida (EPI, GLP)', () => {
    expect(ok({ termos: ['A4'] }).termos).toEqual(['A4']);
    expect(ok({ termos: ['papel A4'] }).termos).toEqual(['papel A4']);
    expect(ok({ termos: ['EPI'] }).termos).toEqual(['EPI']);
    expect(ok({ termos: ['ARLA 32'] }).termos).toEqual(['ARLA 32']);
    expect(palavraValida('glp')).toBe(true);
    expect(palavraValida('de ti')).toBe(false);
    expect(palavraValida('ar')).toBe(false);
    expect(palavraValida('para com')).toBe(false);
    expect(erro({ termos: ['ti'] })).toBe(MENSAGENS_RADAR.termoCurto);
  });
  it('só número não vale (nem nos produtos nem nos excluídos); letra com número vale', () => {
    expect(erro({ termos: ['12'] })).toBe(MENSAGENS_RADAR.termoCurto);
    expect(erro({ termos: ['2026'] })).toBe(MENSAGENS_RADAR.termoCurto);
    expect(erro({ termos: ['32 50'] })).toBe(MENSAGENS_RADAR.termoCurto);
    expect(palavraValida('A4')).toBe(true);
    expect(palavraValida('ARLA 32')).toBe(true);
    expect(palavraValida('12')).toBe(false);
    expect(erro({ termos: ['luva'], termosExcluir: ['123'] })).toBe(MENSAGENS_RADAR.excluirCurto);
    expect(ok({ termos: ['luva'], termosExcluir: ['a4'] }).termosExcluir).toEqual(['a4']);
  });
  it('entrada grande é cortada antes de validar (formulário) e o excesso para no 11º', () => {
    const t0 = Date.now();
    expect(erro({ termos: Array.from({ length: 100_000 }, (_, i) => `produto${i}`) })).toBe(MENSAGENS_RADAR.formulario);
    expect(erro({ termos: ['luva'], termosExcluir: Array.from({ length: 100_000 }, () => 'latex') })).toBe(MENSAGENS_RADAR.formulario);
    expect(erro({ termos: ['luva'], ufs: Array.from({ length: 100_000 }, () => 'SC') })).toBe(MENSAGENS_RADAR.formulario);
    expect(erro({ termos: ['luva'], municipios: Array.from({ length: 100_000 }, () => '4209102') })).toBe(MENSAGENS_RADAR.formulario);
    expect(erro({ termos: ['luva'], modalidades: Array.from({ length: 100_000 }, () => 6) })).toBe(MENSAGENS_RADAR.formulario);
    expect(erro({ termos: ['luva, '.repeat(200_000)] })).toBe(MENSAGENS_RADAR.formulario);
    const cheio = Array.from({ length: ENTRADA_RADAR.itens }, (_, i) => Array.from({ length: 60 }, (_, j) => `i${i}x${j}`).join(',').slice(0, ENTRADA_RADAR.caracteres));
    expect(erro({ termos: cheio })).toBe(MENSAGENS_RADAR.muitosTermos);
    expect(erro({ termos: ['luva'], termosExcluir: Array.from({ length: ENTRADA_RADAR.itens }, (_, i) => `palavra${i}`) })).toBe(MENSAGENS_RADAR.muitosExcluir);
    expect(Date.now() - t0).toBeLessThan(1000);
  });
  it('excluídos: sem hífen, sem repetidos, até 10, até 40 caracteres, 3+ letras', () => {
    expect(ok({ termos: ['uniforme'], termosExcluir: ['-escolar', 'Escolar', ' militar '] }).termosExcluir).toEqual(['escolar', 'militar']);
    expect(erro({ termos: ['uniforme'], termosExcluir: Array.from({ length: 11 }, (_, i) => `palavra${i}`) })).toBe(MENSAGENS_RADAR.muitosExcluir);
    expect(erro({ termos: ['uniforme'], termosExcluir: ['b'.repeat(41)] })).toBe(MENSAGENS_RADAR.excluirLongo);
    expect(erro({ termos: ['uniforme'], termosExcluir: ['ab'] })).toBe(MENSAGENS_RADAR.excluirCurto);
  });
  it('UFs válidas (maiúsculas, sem repetidas, em ordem) ou municípios IBGE, não os dois', () => {
    expect(ok({ termos: ['luva'], ufs: ['sc', 'PR', 'SC'] }).ufs).toEqual(['PR', 'SC']);
    expect(erro({ termos: ['luva'], ufs: ['XX'] })).toBe(MENSAGENS_RADAR.uf);
    expect(ok({ termos: ['luva'], municipios: ['4209102', '4209102', '4205407'] }).municipios).toEqual(['4209102', '4205407']);
    expect(erro({ termos: ['luva'], municipios: ['42091'] })).toBe(MENSAGENS_RADAR.municipio);
    expect(erro({ termos: ['luva'], municipios: Array.from({ length: 51 }, (_, i) => String(4200000 + i)) })).toBe(MENSAGENS_RADAR.muitosMunicipios);
    expect(erro({ termos: ['luva'], ufs: ['SC'], municipios: ['4209102'] })).toBe(MENSAGENS_RADAR.local);
  });
  it('faixa de valor coerente, em reais inteiros', () => {
    expect(ok({ termos: ['luva'], valorMin: 10000.4, valorMax: 500000 })).toMatchObject({ valorMin: 10000, valorMax: 500000 });
    expect(erro({ termos: ['luva'], valorMin: 500000, valorMax: 10000 })).toBe(MENSAGENS_RADAR.faixa);
    for (const v of [-1, 'mil', Number.NaN, 1e13]) expect(erro({ termos: ['luva'], valorMin: v })).toBe(MENSAGENS_RADAR.valor);
  });
  it('valor 0 é "sem limite": vira nulo (o banco exige valor_max > 0)', () => {
    expect(ok({ termos: ['luva'], valorMin: null, valorMax: 0 })).toMatchObject({ valorMin: null, valorMax: null });
    expect(ok({ termos: ['luva'], valorMin: 0, valorMax: 0.4 })).toMatchObject({ valorMin: null, valorMax: null });
    expect(ok({ termos: ['luva'], valorMin: 0, valorMax: 1000 })).toMatchObject({ valorMin: null, valorMax: 1000 });
  });
  it('modalidades da v1 e ME/EPP', () => {
    expect(ok({ termos: ['luva'], modalidades: [8, 6, 6], soMeEpp: true })).toMatchObject({ modalidades: [6, 8], soMeEpp: true });
    expect(erro({ termos: ['luva'], modalidades: [99] })).toBe(MENSAGENS_RADAR.modalidade);
    expect(ok({ termos: ['luva'], soMeEpp: 'sim' }).soMeEpp).toBe(false);
  });
  it('ignora campos que não são do radar (user_id do navegador não passa)', () => {
    const r = ok({ termos: ['luva'], user_id: 'outra-conta', userId: 'x' });
    expect(r).toEqual({ ...BASE, termos: ['luva'] });
    expect(r).not.toHaveProperty('user_id');
    expect(linhaDoRadar(r)).not.toHaveProperty('user_id');
  });
  it('corpo que não é objeto', () => {
    for (const c of [null, 'x', [1], 3]) expect(erro(c)).toBe(MENSAGENS_RADAR.formulario);
  });
});

describe('linha do banco ↔ radar', () => {
  it('ida e volta', () => {
    const r: Radar = { termos: ['luva'], termosExcluir: ['latex'], ufs: ['SC'], municipios: [], valorMin: 1000, valorMax: 9000, modalidades: [6], soMeEpp: true };
    expect(linhaDoRadar(r)).toEqual({
      termos: ['luva'], termos_excluir: ['latex'], ufs: ['SC'], municipios: [], valor_min: 1000, valor_max: 9000, modalidades: [6], so_me_epp: true,
    });
    expect(radarDaLinha({ ...linhaDoRadar(r), valor_min: '1000.00', valor_max: '9000.00' })).toEqual(r);
  });
  it('colunas nulas viram padrão', () => {
    expect(radarDaLinha({ termos: ['luva'], termos_excluir: null, ufs: null, municipios: null, valor_min: null, valor_max: null, modalidades: null, so_me_epp: null })).toEqual({
      ...BASE,
      termos: ['luva'],
    });
  });
  it('valor 0 na gravação vira nulo', () => {
    expect(linhaDoRadar({ ...BASE, valorMin: 0, valorMax: 0 })).toMatchObject({ valor_min: null, valor_max: null });
  });
});

describe('busca do radar', () => {
  const r: Radar = { termos: ['uniforme', 'luva'], termosExcluir: ['escolar'], ufs: ['SC'], municipios: [], valorMin: 10000, valorMax: null, modalidades: [6], soMeEpp: true };
  it('produtos = digitados (OR), cada um com seus relacionados, e os excluídos', () => {
    const b = buscaDoRadar(r);
    expect(b.digitados).toEqual(['uniforme', 'luva']);
    expect(b.excluidos).toEqual(['escolar']);
    expect(b.relacionados.map((x) => x.termo)).toEqual(expect.arrayContaining(['fardamento', 'botina']));
    expect(b.relacionados.find((x) => x.termo === 'fardamento')?.de).toBe('uniforme');
  });
  it('até 12 relacionados no total, intercalados entre os produtos (a busca avulsa segue com 20)', () => {
    expect(MAX_RELACIONADOS_RADAR).toBe(12);
    const termos = ['uniforme', 'luva', 'cimento', 'computador', 'medicamento'];
    const b = buscaDoRadar({ ...BASE, termos });
    expect(b.relacionados).toHaveLength(12);
    // Intercalado: todos os produtos têm relacionados entre os 12 (sem intercalar, o primeiro tomaria todas as vagas).
    expect(new Set(b.relacionados.map((x) => x.de))).toEqual(new Set(termos));
    expect(filtrosDoRadar({ ...BASE, termos }).p_relacionados).toHaveLength(12);
    expect(interpretarBusca(termos.join(', ')).relacionados).toHaveLength(MAX_RELACIONADOS);
  });
  it('filtros para buscar_editais e radar_contagens (vazios viram nulo)', () => {
    const f = filtrosDoRadar(r);
    expect(f).toMatchObject({
      p_termos: ['uniforme', 'luva'], p_excluir: ['escolar'], p_ufs: ['SC'], p_ibges: null, p_valor_min: 10000, p_valor_max: null,
      p_modalidades: [6], p_so_me_epp: true,
    });
    expect((f.p_relacionados as string[]).length).toBeGreaterThan(0);
    expect(filtrosDoRadar({ ...r, termosExcluir: [], ufs: [], municipios: ['4209102'], modalidades: [], soMeEpp: false })).toMatchObject({
      p_excluir: null, p_ufs: null, p_ibges: ['4209102'], p_modalidades: null, p_so_me_epp: null,
    });
  });
  it('valor 0 nunca chega ao banco como limite (lista e contagens)', () => {
    const zero = { ...r, valorMin: 0, valorMax: 0 };
    expect(filtrosDoRadar(zero)).toMatchObject({ p_valor_min: null, p_valor_max: null });
    expect(argumentosRadar(zero, { ordem: null, pagina: 1, limite: 20 })).toMatchObject({ p_valor_min: null, p_valor_max: null });
  });
  it('argumentos da lista: ordem (relevância por padrão), página e limite', () => {
    expect(argumentosRadar(r, { ordem: null, pagina: 1, limite: 20 })).toMatchObject({ p_ordem: 'relevancia', p_limite: 20, p_deslocamento: 0 });
    expect(argumentosRadar(r, { ordem: 'maior_valor', pagina: 3, limite: 20 })).toMatchObject({ p_ordem: 'maior_valor', p_deslocamento: 40 });
    expect(Object.keys(argumentosRadar(r, { ordem: null, pagina: 1, limite: 5 }))).not.toContain('user_id');
  });
  it('página fora da faixa: entre 1 e MAX_PAGINA (1000)', () => {
    expect(argumentosRadar(r, { ordem: null, pagina: 5000, limite: 20 })).toMatchObject({ p_deslocamento: 999 * 20 });
    expect(argumentosRadar(r, { ordem: null, pagina: 0, limite: 20 })).toMatchObject({ p_deslocamento: 0 });
    expect(argumentosRadar(r, { ordem: null, pagina: Number.NaN, limite: 20 })).toMatchObject({ p_deslocamento: 0 });
  });
});

describe('plano e visita', () => {
  it('grátis vê a prévia de 5, sempre na página 1', () => {
    expect(VISIVEIS_GRATIS).toBe(5);
    expect(vistaDoRadar('gratis', false, 3)).toEqual({ previa: true, pagina: 1, limite: 5 });
  });
  it('Basic, Pro e o navegador interno veem tudo, 20 por página', () => {
    expect(vistaDoRadar('basic', false, 3)).toEqual({ previa: false, pagina: 3, limite: 20 });
    expect(vistaDoRadar('pro', false, 1)).toEqual({ previa: false, pagina: 1, limite: 20 });
    expect(vistaDoRadar('gratis', true, 2)).toEqual({ previa: false, pagina: 2, limite: 20 });
  });
  it('novas desde a última visita; na primeira, últimas 24 horas', () => {
    const agora = new Date('2026-10-18T15:00:00Z');
    expect(desdeDaVisita('2026-10-17T10:00:00.000Z', agora)).toEqual({ desde: '2026-10-17T10:00:00.000Z', primeira: false });
    expect(desdeDaVisita(null, agora)).toEqual({ desde: '2026-10-17T15:00:00.000Z', primeira: true });
  });
});

describe('lerValorReais (só no formato brasileiro)', () => {
  it('aceita milhar com ponto, centavos com vírgula e "R$"', () => {
    expect(lerValorReais('R$ 1.500.000,00')).toBe(1500000);
    expect(lerValorReais('1.000,50')).toBe(1001);
    expect(lerValorReais('1.000,40')).toBe(1000);
    expect(lerValorReais('1000')).toBe(1000);
    expect(lerValorReais('1000,5')).toBe(1001);
    expect(lerValorReais('50000')).toBe(50000);
    expect(lerValorReais('1.000')).toBe(1000);
  });
  it('vazio ou zero: sem limite', () => {
    expect(lerValorReais('  ')).toBeNull();
    expect(lerValorReais('')).toBeNull();
    expect(lerValorReais('0')).toBeNull();
    expect(lerValorReais('R$ 0,00')).toBeNull();
  });
  it('ponto decimal (formato americano) e o resto: inválido', () => {
    expect(lerValorReais('1000.50')).toBe('invalido');
    expect(lerValorReais('1.00')).toBe('invalido');
    expect(lerValorReais('1,000.50')).toBe('invalido');
    expect(lerValorReais('10.00.000')).toBe('invalido');
    expect(lerValorReais('1.0000')).toBe('invalido');
    expect(lerValorReais('1,505')).toBe('invalido');
    expect(lerValorReais('mil')).toBe('invalido');
    expect(lerValorReais('-5')).toBe('invalido');
    expect(lerValorReais('1e6')).toBe('invalido');
    expect(lerValorReais('9'.repeat(14))).toBe('invalido');
  });
});

describe('lerBuscaMunicipio (texto que vai ao ilike de buscar_municipios)', () => {
  it('letras, espaço, hífen e apóstrofo; espaços colapsados', () => {
    expect(lerBuscaMunicipio('  São   José ')).toBe('São José');
    expect(lerBuscaMunicipio("Pau-d'Arco")).toBe("Pau-d'Arco");
    expect(lerBuscaMunicipio('Jo')).toBe('Jo');
  });
  it('curingas do ilike, barra, números, curto ou longo: nada vai ao banco', () => {
    for (const q of [null, '', 'a', ' a ', 'x%', '%', 'abc_', 'jo\\', 'são%paulo', 'a'.repeat(61), '12', 'joinville;']) {
      expect(lerBuscaMunicipio(q)).toBeNull();
    }
  });
});

describe('formulário do radar', () => {
  const VAZIO: RascunhoRadar = rascunhoDoRadar(null, []);
  it('rascunho vazio: Todo o Brasil, sem nada escolhido', () => {
    expect(VAZIO).toEqual({ termos: [], termosExcluir: [], abrangencia: 'brasil', ufs: [], municipios: [], valorMin: '', valorMax: '', modalidades: [], soMeEpp: false });
  });
  it('rascunho de um radar salvo (municípios na ordem do radar, valores formatados)', () => {
    const cidades = [{ ibge: '4205407', nome: 'Florianópolis', uf: 'SC' }, { ibge: '4209102', nome: 'Joinville', uf: 'SC' }];
    const r: Radar = { ...BASE, municipios: ['4209102', '4205407'], valorMin: 1500000, valorMax: null, soMeEpp: true };
    expect(rascunhoDoRadar(r, cidades)).toMatchObject({
      abrangencia: 'municipios', municipios: [cidades[1], cidades[0]], valorMin: '1.500.000', valorMax: '', soMeEpp: true,
    });
    expect(rascunhoDoRadar({ ...BASE, ufs: ['SC'] }, []).abrangencia).toBe('estados');
  });
  it('valor formatado no rascunho volta ao mesmo número', () => {
    const d = rascunhoDoRadar({ ...BASE, valorMin: 1500000, valorMax: 25000000 }, []);
    expect(lerValorReais(d.valorMin)).toBe(1500000);
    expect(lerValorReais(d.valorMax)).toBe(25000000);
  });
  it('lerValorReais aceita "R$ 1.500.000,00", vazio é sem limite', () => {
    expect(lerValorReais('R$ 1.500.000,00')).toBe(1500000);
    expect(lerValorReais('50000')).toBe(50000);
    expect(lerValorReais('  ')).toBeNull();
    expect(lerValorReais('mil')).toBe('invalido');
    expect(lerValorReais('-5')).toBe('invalido');
  });
  it('erros por etapa', () => {
    expect(erroDaEtapa(VAZIO, 1)).toBe(MENSAGENS_RADAR.semTermo);
    const d = { ...VAZIO, termos: ['luva'] };
    expect(erroDaEtapa(d, 1)).toBeNull();
    expect(erroDaEtapa({ ...d, abrangencia: 'estados' }, 2)).toBe(MENSAGENS_RADAR.semEstado);
    expect(erroDaEtapa({ ...d, abrangencia: 'municipios' }, 2)).toBe(MENSAGENS_RADAR.semMunicipio);
    expect(erroDaEtapa(d, 2)).toBeNull();
    expect(erroDaEtapa({ ...d, valorMin: 'mil' }, 3)).toBe(MENSAGENS_RADAR.valor);
    expect(erroDaEtapa({ ...d, valorMin: '500000', valorMax: '1000' }, 3)).toBe(MENSAGENS_RADAR.faixa);
    expect(erroDaEtapa({ ...d, valorMin: '1000', valorMax: '500000' }, 3)).toBeNull();
  });
  it('corpo enviado: só a área escolhida; "Pular" limpa a etapa 3', () => {
    const d: RascunhoRadar = {
      ...VAZIO, termos: ['luva'], termosExcluir: ['latex'], abrangencia: 'brasil', ufs: ['SC'],
      municipios: [{ ibge: '4209102', nome: 'Joinville', uf: 'SC' }], valorMin: '1000', valorMax: '', modalidades: [6], soMeEpp: true,
    };
    expect(corpoDoRascunho(d, { pular: false })).toEqual({
      termos: ['luva'], termosExcluir: ['latex'], ufs: [], municipios: [], valorMin: 1000, valorMax: null, modalidades: [6], soMeEpp: true,
    });
    expect(corpoDoRascunho({ ...d, abrangencia: 'municipios' }, { pular: true })).toEqual({
      termos: ['luva'], termosExcluir: [], ufs: [], municipios: ['4209102'], valorMin: null, valorMax: null, modalidades: [], soMeEpp: false,
    });
    expect(corpoDoRascunho({ ...d, abrangencia: 'estados' }, { pular: true }).ufs).toEqual(['SC']);
  });
  it('corpo do rascunho passa na validação do servidor', () => {
    const d: RascunhoRadar = { ...VAZIO, termos: ['luva', 'EPI'], abrangencia: 'estados', ufs: ['SC', 'PR'], valorMin: 'R$ 1.000,00', modalidades: [8, 6] };
    expect(validarRadar(corpoDoRascunho(d, { pular: false })).ok).toBe(true);
  });
  it('adicionarTermos separa por vírgula, tira repetidos e inválidos e respeita o teto', () => {
    expect(adicionarTermos(['luva'], 'Luvas, botina, ti, -capacete', 10)).toEqual(['luva', 'botina', 'capacete']);
    expect(adicionarTermos(['a1x', 'b2x'], 'cimento, areia', 3)).toEqual(['a1x', 'b2x', 'cimento']);
    expect(adicionarTermos([], 'x'.repeat(41), 10, 40)).toEqual([]);
  });
  it('sugestões do catálogo de termos: começo primeiro, sem os já escolhidos', () => {
    const s = sugestoesTermos('unif', []);
    expect(s[0]).toBe('uniforme');
    expect(sugestoesTermos('unif', ['Uniforme'])).not.toContain('uniforme');
    expect(sugestoesTermos('luva', []).slice(0, 3)).toEqual(['luva', 'luva nitrílica', 'luva de vaqueta']);
    expect(sugestoesTermos('l', [])).toEqual([]);
    expect(sugestoesTermos('xyzw', [])).toEqual([]);
    expect(sugestoesTermos('a', [], 3).length).toBe(0);
  });
  it('busca de município: letras, espaço, hífen e apóstrofo; 2 a 60 caracteres', () => {
    expect(lerBuscaMunicipio('  São   José ')).toBe('São José');
    expect(lerBuscaMunicipio("Pau-d'Arco")).toBe("Pau-d'Arco");
    for (const q of [null, '', 'a', 'x%', 'abc_', 'a'.repeat(61), '12']) expect(lerBuscaMunicipio(q)).toBeNull();
  });
});
