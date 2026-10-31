import { readFileSync } from 'node:fs';
import { createElement, createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BloqueioBusca } from '@/components/inicio/BloqueioBusca';
import { ColunaLista } from '@/components/inicio/ColunaLista';
import { temMais } from './inicio';
import type { EditalResumo, FiltrosTela } from './tipos';

const VAZIO: FiltrosTela = { q: 'uniforme', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };
const limpo = (h: string) => h.replace(/<!-- -->/g, '');
const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');
const nada = () => undefined;

describe('cadeado da busca', () => {
  const html = limpo(renderToStaticMarkup(createElement(BloqueioBusca, { bloqueados: 281, termo: 'uniformes escolares', voltar: '/?q=uniformes+escolares' })));
  it('diz quantos faltam, com o total real e o assunto', () => {
    expect(html).toContain('Mais 281 editais de uniformes escolares');
  });
  it('um cadeado e a compra do Pro, com o preço', () => {
    expect(html).toContain('Liberar todos os editais — R$ 37,90/mês');
    expect(html).toContain('href="/assinar?periodo=mensal"');
  });
  it('os cartões desfocados são exemplos, fora do leitor de tela e do toque', () => {
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('inert');
    expect(html).toContain('blur-');
  });
  it('quem já assina entra e volta para a mesma busca', () => {
    expect(html).toContain(`/entrar?voltar=${encodeURIComponent('/?q=uniformes+escolares')}`);
    expect(html).toContain('Já sou Pro: entrar');
  });
  it('singular', () => {
    const um = limpo(renderToStaticMarkup(createElement(BloqueioBusca, { bloqueados: 1, termo: 'luva', voltar: '/?q=luva' })));
    expect(um).toContain('Mais 1 edital de luva');
  });
  it('nenhum dado real no código desfocado: o componente nem recebe editais', () => {
    expect(ler('components/inicio/BloqueioBusca.tsx')).not.toContain('EditalResumo');
  });
});

describe('lista limitada', () => {
  function lista(extra: object) {
    const props = {
      agora: new Date('2026-10-31T12:00:00Z'), filtros: VAZIO, carregandoLista: false, erro: null, erroExportar: null, carregandoMais: false, erroMais: null,
      ordem: 'relevancia', temTermo: true, listaRef: createRef<HTMLDivElement>(), aoRolar: nada, aoTirarCidade: nada, aoSelecionar: nada, aoMudarPrazo: nada, aoMudarOrdem: nada,
      aoCarregarMais: nada, aoRecomecar: nada, aoAplicar: nada, ...extra,
    };
    return limpo(renderToStaticMarkup(createElement(ColunaLista, props as never)));
  }
  it('com bloqueados: mostra o cadeado e não oferece carregar mais', () => {
    const html = lista({ resultado: { total: 286, editais: [], bloqueados: 281 } });
    expect(html).toContain('Mais 281 editais de uniforme');
    expect(html).not.toContain('Carregar mais');
  });
  it('sem bloqueados: nada de cadeado', () => {
    expect(lista({ resultado: { total: 3, editais: [] } })).not.toContain('Liberar todos os editais');
  });
  it('a rolagem infinita para nos 5', () => {
    expect(temMais({ total: 286, editais: [{} as EditalResumo], bloqueados: 281 })).toBe(false);
    expect(temMais({ total: 286, editais: [{} as EditalResumo] })).toBe(true);
  });
  it('no celular a assessoria vem depois do cadeado', () => {
    const c = ler('components/inicio/ColunaLista.tsx');
    expect(c).toContain('!bloqueados');
  });
});

describe('o que ficaria falso', () => {
  it('nenhuma promessa de busca sem limite na tela', () => {
    for (const f of ['lib/paginaPlanos.ts', 'lib/planos.ts', 'lib/seo/marca.ts', 'components/planos/SecaoPrecos.tsx', 'app/planos/page.tsx', 'app/assessoria/page.tsx']) {
      const semComentarios = ler(f).replace(/\/\*[\s\S]*?\*\//g, '');
      expect(semComentarios, f).not.toMatch(/sem limite|[Ii]limitados/);
    }
  });
  it('a home e a página do edital seguem abertas ao Google', () => {
    expect(ler('app/edital/[slug]/page.tsx')).not.toContain('buscarNoPlano');
    expect(ler('lib/servidor/licitacoes.ts')).not.toContain('buscarNoPlano');
  });
  it('a home usa o mesmo limite da API', () => {
    expect(ler('app/page.tsx')).toContain('buscarNoPlano(');
    expect(ler('app/api/busca/route.ts')).toContain('buscarNoPlano(');
  });
  it('o CSV respeita o limite e a tela avisa', () => {
    expect(ler('app/api/exportar/route.ts')).toContain('limiteDaExportacao(');
    expect(ler('components/inicio/BotaoExportar.tsx')).toContain('AVISO_EXPORTAR_GRATIS');
  });
  it('o login é renovado na busca', () => {
    expect(ler('proxy.ts')).toContain('buscaPedeSessao(');
  });
});
