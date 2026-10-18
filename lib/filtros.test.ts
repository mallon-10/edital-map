import { describe, expect, it } from 'vitest';
import { buscaDoCampo, chaveFiltros, lerFiltros, filtrosAtivos, lerTermoOrgao, limparFiltros, normalizarTela, ordemEfetiva, ORDENS, paraParametros, recursosUsados, ufIgnoradaPeloRaio, UFS_ORDENADAS } from './filtros';
import type { FiltrosTela } from './tipos';

const ler = (s: string) => lerFiltros(new URLSearchParams(s));
const BASE = { q: null, uf: null, ibge: null, dias: null, pagina: 1, ordem: null, valorMin: null, modalidades: null, orgao: null, raio: null };
const JOINVILLE = { ibge: '4209102', nome: 'Joinville', uf: 'SC' };
const ORGAO = { cnpj: '83102244000102', nome: 'Município de Joinville' };
const TELA_VAZIA: FiltrosTela = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };

describe('lerFiltros', () => {
  it('sem parâmetros', () => {
    expect(ler('')).toEqual(BASE);
  });
  it('aceita os valores válidos', () => {
    expect(ler('q=%20EPI%20e%20uniformes%20&uf=sc&ibge=4205407&dias=7&pagina=3&ordem=recentes&valor=50000&modalidades=8,6,6')).toEqual({
      q: 'EPI e uniformes', uf: 'SC', ibge: '4205407', dias: 7, pagina: 3, ordem: 'recentes', valorMin: 50000, modalidades: [6, 8], orgao: null, raio: null,
    });
  });
  it('descarta UF que não existe, IBGE malformado e dias diferentes de 7', () => {
    expect(ler('uf=XX&ibge=123&dias=30')).toEqual(BASE);
  });
  it('aceita qualquer UF do Brasil', () => {
    expect(ler('uf=sp').uf).toBe('SP');
    expect(ler('uf=AM').uf).toBe('AM');
  });
  it('ignora valor fora da lista e modalidades desconhecidas', () => {
    expect(ler('valor=12345&modalidades=1,99,abc')).toEqual(BASE);
  });
  it('limita o termo a 100 caracteres, a página a 1..1000 e a ordem às conhecidas; o deslocamento antigo não vale mais', () => {
    expect(ler(`q=${'a'.repeat(150)}`).q).toHaveLength(100);
    expect(ler('pagina=0').pagina).toBe(1);
    expect(ler('pagina=1001').pagina).toBe(1);
    expect(ler('pagina=1.5').pagina).toBe(1);
    expect(ler('pagina=1000').pagina).toBe(1000);
    expect(ler('ordem=maior_valor').ordem).toBe('maior_valor');
    expect(ler('ordem=aleatoria').ordem).toBeNull();
    expect(ler('deslocamento=50')).toEqual(BASE);
  });
  it('órgão: CNPJ de 14 caracteres (numérico ou alfanumérico), em maiúsculas', () => {
    expect(ler('orgao=83102244000102').orgao).toBe('83102244000102');
    expect(ler('orgao=12abc34501de35').orgao).toBe('12ABC34501DE35');
    expect(ler('orgao=8310224400010').orgao).toBeNull();
    expect(ler('orgao=83.102.244/0001-02').orgao).toBeNull();
  });
  it('raio: só 50, 100 ou 200 e só com município', () => {
    expect(ler('ibge=4209102&raio=100').raio).toBe(100);
    expect(ler('ibge=4209102&raio=75').raio).toBeNull();
    expect(ler('raio=100').raio).toBeNull();
  });
});

describe('chaveFiltros', () => {
  it('ignora maiúsculas no termo', () => {
    expect(chaveFiltros(ler('q=EPI'))).toBe(chaveFiltros(ler('q=epi')));
  });
  it('muda quando o filtro muda', () => {
    expect(chaveFiltros(ler('q=epi'))).not.toBe(chaveFiltros(ler('q=epi&uf=PR')));
    expect(chaveFiltros(ler('q=epi'))).not.toBe(chaveFiltros(ler('q=epi&valor=50000')));
    expect(chaveFiltros(ler('q=epi'))).not.toBe(chaveFiltros(ler('q=epi&modalidades=6')));
    expect(chaveFiltros(ler('q=epi'))).not.toBe(chaveFiltros(ler('q=epi&orgao=83102244000102')));
    expect(chaveFiltros(ler('ibge=4209102'))).not.toBe(chaveFiltros(ler('ibge=4209102&raio=50')));
    expect(chaveFiltros(ler('q=epi'))).not.toBe(chaveFiltros(ler('q=epi&pagina=2')));
    expect(chaveFiltros(ler('q=epi'))).not.toBe(chaveFiltros(ler('q=epi&ordem=recentes')));
  });
});

describe('paraParametros', () => {
  const TELA: FiltrosTela = {
    q: ' EPI ', uf: 'SC', cidade: { ibge: '4205407', nome: 'Florianópolis', uf: 'SC' }, valorMin: 50000, modalidades: [8, 6], seteDias: true,
    orgao: null, raio: null,
  };
  it('monta os parâmetros que a API entende (página 1 e ordem padrão ficam fora)', () => {
    expect(paraParametros(TELA, { pagina: 3, ordem: 'maior_valor' }).toString()).toBe(
      'q=EPI&uf=SC&dias=7&valor=50000&modalidades=6%2C8&ibge=4205407&ordem=maior_valor&pagina=3',
    );
    expect(paraParametros(TELA, { pagina: 1, ordem: null }).toString()).toBe('q=EPI&uf=SC&dias=7&valor=50000&modalidades=6%2C8&ibge=4205407');
  });
  it('sem cidade para o mapa e vazio quando não há filtro', () => {
    expect(paraParametros(TELA, { comCidade: false }).has('ibge')).toBe(false);
    expect(paraParametros(TELA_VAZIA).toString()).toBe('');
  });
  it('ida e volta com lerFiltros', () => {
    expect(lerFiltros(paraParametros(TELA))).toEqual({
      q: 'EPI', uf: 'SC', ibge: '4205407', dias: 7, pagina: 1, ordem: null, valorMin: 50000, modalidades: [6, 8], orgao: null, raio: null,
    });
  });
  it('órgão e raio: a lista leva os dois; o mapa leva a cidade só junto com o raio', () => {
    const tela: FiltrosTela = { ...TELA_VAZIA, cidade: JOINVILLE, orgao: ORGAO, raio: 100 };
    expect(paraParametros(tela).toString()).toBe('orgao=83102244000102&ibge=4209102&raio=100');
    expect(paraParametros(tela, { comCidade: false }).toString()).toBe('orgao=83102244000102&ibge=4209102&raio=100');
    expect(paraParametros({ ...tela, raio: null }, { comCidade: false }).toString()).toBe('orgao=83102244000102');
    expect(paraParametros({ ...tela, cidade: null }).has('raio')).toBe(false);
  });
  it('com raio a UF não vai: o raio atravessa a divisa de estado', () => {
    const tela: FiltrosTela = { ...TELA_VAZIA, uf: 'SC', cidade: JOINVILLE, raio: 100 };
    expect(paraParametros(tela).has('uf')).toBe(false);
    expect(paraParametros(tela, { comCidade: false }).has('uf')).toBe(false);
    expect(paraParametros({ ...tela, raio: null }).get('uf')).toBe('SC');
  });
  it('ufIgnoradaPeloRaio acompanha o que paraParametros faz com a UF', () => {
    const tela: FiltrosTela = { ...TELA_VAZIA, uf: 'SC', cidade: JOINVILLE, raio: 100 };
    expect(ufIgnoradaPeloRaio(tela)).toBe(true);
    expect(ufIgnoradaPeloRaio({ ...tela, raio: null })).toBe(false);
    expect(ufIgnoradaPeloRaio({ ...tela, uf: '' })).toBe(false);
    expect(ufIgnoradaPeloRaio({ ...tela, cidade: null })).toBe(false);
  });
  it('ida e volta com órgão e raio', () => {
    expect(lerFiltros(paraParametros({ ...TELA_VAZIA, cidade: JOINVILLE, orgao: ORGAO, raio: 200 }))).toEqual({
      ...BASE, ibge: '4209102', orgao: '83102244000102', raio: 200,
    });
  });
});

describe('normalizarTela', () => {
  it('sem município o raio sai', () => {
    expect(normalizarTela({ ...TELA_VAZIA, raio: 100 })).toEqual(TELA_VAZIA);
  });
  it('com município o raio fica (e o objeto é o mesmo)', () => {
    const tela = { ...TELA_VAZIA, cidade: JOINVILLE, raio: 100 };
    expect(normalizarTela(tela)).toBe(tela);
  });
  it('município de outra UF (escolhido no mapa com raio, que cruza a divisa): a UF passa a ser a dele', () => {
    const rioNegro = { ibge: '4122305', nome: 'Rio Negro', uf: 'PR' };
    const tela = { ...TELA_VAZIA, uf: 'SC', cidade: rioNegro, raio: 100 };
    expect(normalizarTela(tela)).toEqual({ ...tela, uf: 'PR' });
    // Sem UF escolhida, nada muda.
    const semUf = { ...TELA_VAZIA, cidade: rioNegro };
    expect(normalizarTela(semUf)).toBe(semUf);
  });
});

describe('recursosUsados', () => {
  it('órgão escolhido ou trocado conta; manter ou tirar não conta', () => {
    expect(recursosUsados(TELA_VAZIA, { ...TELA_VAZIA, orgao: ORGAO })).toEqual(['filtro_orgao']);
    expect(recursosUsados({ ...TELA_VAZIA, orgao: ORGAO }, { ...TELA_VAZIA, orgao: ORGAO, q: 'luva' })).toEqual([]);
    expect(recursosUsados({ ...TELA_VAZIA, orgao: ORGAO }, TELA_VAZIA)).toEqual([]);
  });
  it('raio ligado, trocado ou com outra cidade conta', () => {
    const com = { ...TELA_VAZIA, cidade: JOINVILLE, raio: 50 };
    expect(recursosUsados({ ...TELA_VAZIA, cidade: JOINVILLE }, com)).toEqual(['filtro_raio']);
    expect(recursosUsados(com, { ...com, raio: 100 })).toEqual(['filtro_raio']);
    expect(recursosUsados(com, { ...com, cidade: { ibge: '4202404', nome: 'Blumenau', uf: 'SC' } })).toEqual(['filtro_raio']);
    expect(recursosUsados(com, { ...com, seteDias: true })).toEqual([]);
  });
});

describe('UFS_ORDENADAS', () => {
  it('as 27 UFs em ordem alfabética', () => {
    expect(UFS_ORDENADAS).toHaveLength(27);
    expect(UFS_ORDENADAS[0]).toBe('AC');
    expect(UFS_ORDENADAS[26]).toBe('TO');
    expect([...UFS_ORDENADAS].sort()).toEqual(UFS_ORDENADAS);
  });
});

describe('lerTermoOrgao', () => {
  it('3 letras ou mais, com espaços colapsados', () => {
    expect(lerTermoOrgao('  prefeitura   de  ')).toBe('prefeitura de');
    expect(lerTermoOrgao('itá')).toBe('itá');
  });
  it('menos de 3 letras ou vazio é recusado (números não contam)', () => {
    expect(lerTermoOrgao('ab')).toBeNull();
    expect(lerTermoOrgao('a 1 2 3')).toBeNull();
    expect(lerTermoOrgao('')).toBeNull();
    expect(lerTermoOrgao(null)).toBeNull();
  });
  it('tira os curingas do ilike e corta em 60 caracteres', () => {
    expect(lerTermoOrgao('saúde%_\\')).toBe('saúde');
    expect(lerTermoOrgao('%%%')).toBeNull();
    expect(lerTermoOrgao('x'.repeat(100))).toHaveLength(60);
  });
});

describe('filtrosAtivos (botão "Filtros (n)" do celular)', () => {
  const nada: FiltrosTela = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };
  const cidade = { ibge: '4209102', nome: 'Joinville', uf: 'SC' };
  it('conta UF, município, raio, valor, modalidades (uma vez), órgão e prazo; o termo não conta', () => {
    expect(filtrosAtivos(nada)).toBe(0);
    expect(filtrosAtivos({ ...nada, q: 'luva' })).toBe(0);
    expect(
      filtrosAtivos({ q: 'luva', uf: 'SC', cidade, valorMin: 50_000, modalidades: [6, 8], seteDias: true, orgao: { cnpj: '83102285000107', nome: 'X' }, raio: 100 }),
    ).toBe(7);
  });
  it('raio sem município não vale', () => {
    expect(filtrosAtivos({ ...nada, raio: 100 })).toBe(0);
  });
});

describe('buscaDoCampo (campo de busca da página inicial)', () => {
  const comCidade: FiltrosTela = { ...TELA_VAZIA, q: 'luva', uf: 'SC', cidade: JOINVILLE, raio: 100, valorMin: 50_000 };
  it('computador: buscar tira o município (e o raio com ele), mesmo com a mesma UF', () => {
    expect(buscaDoCampo(comCidade, 'botina', 'SC', { manterCidade: false })).toEqual({ ...comCidade, q: 'botina', cidade: null, raio: null });
  });
  it('celular: com a mesma UF, município e raio continuam valendo', () => {
    expect(buscaDoCampo(comCidade, 'botina', 'SC', { manterCidade: true })).toEqual({ ...comCidade, q: 'botina' });
  });
  it('celular: UF trocada tira o município e o raio', () => {
    expect(buscaDoCampo(comCidade, 'botina', 'PR', { manterCidade: true })).toEqual({ ...comCidade, q: 'botina', uf: 'PR', cidade: null, raio: null });
  });
});

describe('limparFiltros (folha de Filtros do celular)', () => {
  it('tira todos os filtros e mantém o termo', () => {
    const cheio: FiltrosTela = {
      q: 'luva', uf: 'SC', cidade: JOINVILLE, valorMin: 50_000, modalidades: [6], seteDias: true, orgao: ORGAO, raio: 100,
    };
    expect(limparFiltros(cheio)).toEqual({ ...TELA_VAZIA, q: 'luva' });
    expect(filtrosAtivos(limparFiltros(cheio))).toBe(0);
  });
});

describe('ordemEfetiva', () => {
  it('com termo: a pedida, ou relevância', () => {
    expect(ordemEfetiva(null, true)).toBe('relevancia');
    expect(ordemEfetiva('maior_valor', true)).toBe('maior_valor');
  });
  it('sem termo: relevância (ou nada) vira menor prazo; as outras ficam', () => {
    expect(ordemEfetiva(null, false)).toBe('prazo');
    expect(ordemEfetiva('relevancia', false)).toBe('prazo');
    expect(ordemEfetiva('recentes', false)).toBe('recentes');
  });
  it('ORDENS: os rótulos da spec, na ordem do seletor', () => {
    expect(ORDENS.map((o) => o.rotulo)).toEqual(['Maior relevância', 'Mais recentes', 'Menor prazo', 'Maior valor', 'Menor valor']);
  });
});
