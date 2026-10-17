import { describe, expect, it } from 'vitest';
import { lerFiltros, paraParametros } from './filtros';
import type { FiltrosTela } from './tipos';
import { comTela, lerBuscaDaUrl, montarTela, paraUrlSearchParams, urlDaBusca, type Tela } from './urlBusca';

const VAZIO: FiltrosTela = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };
const JOINVILLE = { ibge: '4209102', nome: 'Joinville', uf: 'SC' };
const ORGAO = { cnpj: '83102285000107', nome: 'Prefeitura de Joinville' };
const CHEIO: FiltrosTela = {
  q: 'luva nitrílica', uf: 'SC', cidade: JOINVILLE, valorMin: 50_000, modalidades: [8, 6], seteDias: true, orgao: ORGAO, raio: 100,
};
const ler = (url: string) => lerBuscaDaUrl(new URLSearchParams(url.split('?')[1] ?? ''));

describe('busca no endereço', () => {
  it('sem nada preenchido: só "/"', () => {
    expect(urlDaBusca(VAZIO)).toBe('/');
    expect(urlDaBusca(VAZIO, 'lista')).toBe('/?tela=lista');
  });
  it('escreve os filtros com os nomes da spec, modalidades em ordem', () => {
    expect(urlDaBusca(CHEIO, 'lista')).toBe(
      '/?q=luva+nitr%C3%ADlica&uf=SC&municipio=4209102&valor=50000&modalidades=6%2C8&orgao=83102285000107&raio=100&dias=7&tela=lista',
    );
  });
  it('ida e volta: os mesmos filtros (com os nomes vindos do banco) e a mesma tela', () => {
    const casos: FiltrosTela[] = [VAZIO, CHEIO, { ...VAZIO, q: 'botina' }, { ...VAZIO, uf: 'SC', cidade: JOINVILLE }, { ...VAZIO, orgao: ORGAO }];
    for (const f of casos) {
      for (const tela of ['mapa', 'lista'] as Tela[]) {
        const lido = ler(urlDaBusca(f, tela));
        expect(montarTela(lido.busca, f.cidade, f.orgao)).toEqual({ ...f, modalidades: [...f.modalidades].sort((a, b) => a - b) });
        expect(lido.tela).toBe(tela);
      }
    }
  });
  it('a página faz a mesma busca que a lista faria (com raio a UF não vai para a API)', () => {
    const { busca } = ler(urlDaBusca(CHEIO));
    expect(lerFiltros(paraParametros(montarTela(busca, JOINVILLE, ORGAO)))).toEqual({ ...busca, uf: null });
  });
  it('lê "municipio" como ibge e ignora o que a API recusaria', () => {
    expect(ler('/?municipio=4209102&uf=sc&valor=7&dias=30&deslocamento=100&tela=x').busca).toEqual({
      q: null, uf: 'SC', ibge: '4209102', dias: null, deslocamento: 0, valorMin: null, modalidades: null, orgao: null, raio: null,
    });
    expect(ler('/?ibge=4209102').busca.ibge).toBeNull();
    expect(ler('/?tela=x').tela).toBe('mapa');
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
  it('comTela troca só a tela', () => {
    expect(comTela('/?q=luva', 'lista')).toBe('/?q=luva&tela=lista');
    expect(comTela('/?q=luva&tela=lista', 'mapa')).toBe('/?q=luva');
    expect(comTela('/', 'lista')).toBe('/?tela=lista');
  });
});
