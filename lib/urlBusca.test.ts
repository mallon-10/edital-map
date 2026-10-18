import { describe, expect, it } from 'vitest';
import { lerFiltros, paraParametros } from './filtros';
import type { FiltrosTela } from './tipos';
import {
  comTela, ESTADO_PADRAO, lerBuscaDaUrl, mesmaBusca, montarTela, paraUrlSearchParams, telaPelaRolagem, urlDaBusca, type EstadoTela,
} from './urlBusca';

const VAZIO: FiltrosTela = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };
const JOINVILLE = { ibge: '4209102', nome: 'Joinville', uf: 'SC' };
const ORGAO = { cnpj: '83102285000107', nome: 'Prefeitura de Joinville' };
const CHEIO: FiltrosTela = {
  q: 'luva nitrílica', uf: 'SC', cidade: JOINVILLE, valorMin: 50_000, modalidades: [8, 6], seteDias: true, orgao: ORGAO, raio: 100,
};
const ler = (url: string) => lerBuscaDaUrl(new URLSearchParams(url.split('?')[1] ?? ''));

describe('busca no endereço', () => {
  it('sem nada preenchido: só "/" (vista Mapa, página 1 e ordem padrão ficam fora; tela só no Mapa)', () => {
    expect(ESTADO_PADRAO.vista).toBe('mapa');
    expect(urlDaBusca(VAZIO)).toBe('/');
    expect(urlDaBusca(VAZIO, ESTADO_PADRAO)).toBe('/');
    expect(urlDaBusca(VAZIO, { vista: 'mapa' })).toBe('/');
    expect(urlDaBusca(VAZIO, { tela: 'lista' })).toBe('/?tela=lista');
    expect(urlDaBusca(VAZIO, { vista: 'lista' })).toBe('/?vista=lista');
    expect(urlDaBusca(VAZIO, { vista: 'lista', tela: 'lista' })).toBe('/?vista=lista');
  });
  it('escreve os filtros com os nomes da spec, modalidades em ordem, depois ordem, página e vista', () => {
    expect(urlDaBusca(CHEIO, { vista: 'mapa', tela: 'lista', pagina: 3, ordem: 'maior_valor' })).toBe(
      '/?q=luva+nitr%C3%ADlica&uf=SC&municipio=4209102&valor=50000&modalidades=6%2C8&orgao=83102285000107&raio=100&dias=7&ordem=maior_valor&pagina=3&tela=lista',
    );
    expect(urlDaBusca(CHEIO, { vista: 'lista', pagina: 3 })).toBe(
      '/?q=luva+nitr%C3%ADlica&uf=SC&municipio=4209102&valor=50000&modalidades=6%2C8&orgao=83102285000107&raio=100&dias=7&pagina=3&vista=lista',
    );
  });
  it('ida e volta: os mesmos filtros (com os nomes vindos do banco) e o mesmo estado', () => {
    const casos: FiltrosTela[] = [VAZIO, CHEIO, { ...VAZIO, q: 'botina' }, { ...VAZIO, uf: 'SC', cidade: JOINVILLE }, { ...VAZIO, orgao: ORGAO }];
    const estados: EstadoTela[] = [
      ESTADO_PADRAO,
      { vista: 'mapa', tela: 'mapa', pagina: 1, ordem: null },
      { vista: 'mapa', tela: 'lista', pagina: 2, ordem: 'prazo' },
      { vista: 'lista', tela: 'mapa', pagina: 4, ordem: 'recentes' },
    ];
    for (const f of casos) {
      for (const estado of estados) {
        const lido = ler(urlDaBusca(f, estado));
        expect(montarTela(lido.busca, f.cidade, f.orgao)).toEqual({ ...f, modalidades: [...f.modalidades].sort((a, b) => a - b) });
        expect(lido.estado).toEqual(estado);
      }
    }
  });
  it('a página faz a mesma busca que a lista faria (com raio a UF não vai para a API)', () => {
    const { busca, estado } = ler(urlDaBusca(CHEIO, { pagina: 2, ordem: 'recentes' }));
    expect(lerFiltros(paraParametros(montarTela(busca, JOINVILLE, ORGAO), { pagina: estado.pagina, ordem: estado.ordem }))).toEqual({
      ...busca,
      uf: null,
    });
  });
  it('lê "municipio" como ibge e ignora o que a API recusaria', () => {
    expect(ler('/?municipio=4209102&uf=sc&valor=7&dias=30&deslocamento=100&tela=x').busca).toEqual({
      q: null, uf: 'SC', ibge: '4209102', dias: null, pagina: 1, ordem: null, valorMin: null, modalidades: null, orgao: null, raio: null,
    });
    expect(ler('/?ibge=4209102').busca.ibge).toBeNull();
    expect(ler('/?vista=x').estado).toEqual(ESTADO_PADRAO);
    expect(ler('/?tela=lista').estado).toEqual({ ...ESTADO_PADRAO, tela: 'lista' });
    expect(ler('/?vista=lista&tela=lista').estado.tela).toBe('mapa');
    expect(ler('/?vista=mapa').estado).toEqual(ESTADO_PADRAO);
    expect(ler('/?pagina=0&ordem=x').estado).toEqual(ESTADO_PADRAO);
  });
  it('município que não existe no banco sai, e o raio com ele', () => {
    const { busca } = ler('/?municipio=9999999&raio=100');
    expect(montarTela(busca, null, null)).toEqual(VAZIO);
  });
  it('município de outra UF: a UF passa a ser a dele (como na tela)', () => {
    const { busca } = ler('/?uf=SC&municipio=4106902');
    expect(montarTela(busca, { ibge: '4106902', nome: 'Curitiba', uf: 'PR' }, null).uf).toBe('PR');
  });
  it('searchParams da página: o primeiro de cada nome', () => {
    expect(paraUrlSearchParams({ q: ['luva', 'botina'], uf: 'SC', vazio: undefined }).toString()).toBe('q=luva&uf=SC');
  });
  it('comTela: Mapa leva à vista Mapa (padrão); Lista, à vista Lista (a tela do celular sai)', () => {
    expect(comTela('/?q=luva', 'lista')).toBe('/?q=luva&vista=lista');
    expect(comTela('/?q=luva', 'mapa')).toBe('/?q=luva');
    expect(comTela('/?q=luva&tela=lista', 'lista')).toBe('/?q=luva&vista=lista');
    expect(comTela('/?q=luva&tela=lista', 'mapa')).toBe('/?q=luva');
    expect(comTela('/?q=luva&vista=lista', 'mapa')).toBe('/?q=luva');
    expect(comTela('/', 'mapa')).toBe('/');
    expect(comTela('/', 'lista')).toBe('/?vista=lista');
  });
});

describe('mesmaBusca (folha de Filtros: aplicar sem mudança não refaz a busca)', () => {
  it('mesma combinação, inclusive com modalidades em outra ordem', () => {
    expect(mesmaBusca(CHEIO, { ...CHEIO, modalidades: [6, 8] })).toBe(true);
    expect(mesmaBusca(VAZIO, { ...VAZIO })).toBe(true);
  });
  it('qualquer filtro ou o prazo diferente: outra busca', () => {
    expect(mesmaBusca(CHEIO, { ...CHEIO, seteDias: false })).toBe(false);
    expect(mesmaBusca(CHEIO, { ...CHEIO, valorMin: null })).toBe(false);
    expect(mesmaBusca(VAZIO, { ...VAZIO, uf: 'SC' })).toBe(false);
  });
  it('raio sem município não muda a busca (sai na normalização)', () => {
    expect(mesmaBusca(VAZIO, { ...VAZIO, raio: 100 })).toBe(true);
  });
});

describe('telaPelaRolagem (item ativo da barra do celular na página inicial)', () => {
  it('lista abaixo da metade da tela: Mapa', () => {
    expect(telaPelaRolagem({ topoLista: 560, alturaJanela: 750, noFim: false })).toBe('mapa');
  });
  it('início da lista acima da metade da tela: Lista', () => {
    expect(telaPelaRolagem({ topoLista: 374, alturaJanela: 750, noFim: false })).toBe('lista');
    expect(telaPelaRolagem({ topoLista: -2000, alturaJanela: 750, noFim: false })).toBe('lista');
  });
  it('página rolada até o fim (lista curta que não sobe até a metade): Lista', () => {
    expect(telaPelaRolagem({ topoLista: 500, alturaJanela: 750, noFim: true })).toBe('lista');
  });
});
