import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALTURA_GAVETA_RECOLHIDA } from '../components/GavetaCelular';

const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

/** Aberturas de `<Link ...>` até o `>` que fecha a tag fora de chaves (o `>` de `() => x` dentro de `{}` não fecha). */
function aberturasDeLink(texto: string): string[] {
  const achadas: string[] = [];
  const inicio = /<Link[\s>]/g;
  for (let m = inicio.exec(texto); m; m = inicio.exec(texto)) {
    let profundidade = 0;
    let fim = m.index + 5;
    for (; fim < texto.length; fim++) {
      const c = texto[fim];
      if (c === '{') profundidade++;
      else if (c === '}') profundidade--;
      else if (c === '>' && profundidade === 0) break;
    }
    achadas.push(texto.slice(m.index, fim + 1));
  }
  return achadas;
}

describe('celular', () => {
  it('a gaveta saiu, mas a constante que o Mapa importa continua (e não reserva espaço)', () => {
    expect(ALTURA_GAVETA_RECOLHIDA).toBe(0);
    expect(ler('components/GavetaCelular.tsx')).not.toContain('export function GavetaCelular');
    expect(ler('components/Explorador.tsx')).not.toContain('GavetaCelular');
    // O Mapa é redesenhado em outra sessão: se ainda usar a constante, ela vem daqui.
    const mapa = ler('components/Mapa.tsx');
    if (mapa.includes('ALTURA_GAVETA_RECOLHIDA')) expect(mapa).toContain("from './GavetaCelular'");
  });

  it('barra de baixo: 60 px + área segura do iPhone, só abaixo de lg', () => {
    const css = ler('app/globals.css');
    expect(css).toContain('--altura-barra: calc(60px + env(safe-area-inset-bottom));');
    expect(css).toContain('@media (min-width: 1024px)');
    expect(css).toContain('--altura-barra: 0px;');
    expect(css).toContain('padding-bottom: var(--altura-barra);');
    const layout = ler('app/layout.tsx');
    expect(layout).toContain("viewportFit: 'cover'");
    expect(layout).toContain('<BarraCelularGlobal />');
  });

  it('barra com Mapa · Lista · Alertas · Planos, nessa ordem, e área de toque de 60 px', () => {
    const barra = ler('components/BarraCelular.tsx');
    const posicoes = ['>Mapa<', '>Lista<', '>Alertas<', '>Planos<'].map((t) => barra.indexOf(t));
    expect(posicoes.every((p) => p > -1)).toBe(true);
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
    expect(barra).toContain('h-[60px]');
    expect(barra).toContain('lg:hidden');
  });

  it('links da barra para uma busca na página inicial não pré-carregam (o pré-carregamento contaria a busca)', () => {
    const barra = ler('components/BarraCelular.tsx');
    const daInicial = aberturasDeLink(barra).filter((a) => !a.includes('href="/alertas"') && !a.includes('href="/planos"'));
    expect(daInicial.length).toBeGreaterThan(0);
    for (const a of daInicial) expect(a).toContain('prefetch={false}');
  });

  it('página inicial no celular: uma página que rola, mapa de altura fixa em cima e a lista no fluxo embaixo', () => {
    // Altura da tela só a partir de lg (três colunas); abaixo a página cresce com a lista.
    const pagina = ler('app/page.tsx');
    expect(pagina).toContain('className="flex flex-col lg:h-dvh"');
    expect(pagina).not.toMatch(/className="[^"]*(?<!lg:)h-dvh/);
    const explorador = ler('components/Explorador.tsx');
    // O mapa vem primeiro no celular, com 58svh; no computador volta à coluna do meio, na altura da grade.
    expect(explorador).toMatch(/aria-label="Mapa" className="[^"]*\border-first\b[^"]*\blg:order-none\b/);
    expect(explorador).toMatch(/aria-label="Mapa" className="[^"]*\bh-\[58svh\][^"]*\blg:h-auto\b/);
    // A lista não cobre o mapa (nada de painel fixo ou absoluto) e é o alvo do botão Lista.
    const lista = explorador.match(/<section\s+aria-label="Lista de editais"[^>]*>/)?.[0] ?? '';
    expect(lista).not.toBe('');
    expect(lista).not.toMatch(/\b(fixed|absolute)\b/);
    expect(explorador).toContain('scrollIntoView');
    // A lista só rola por dentro a partir de lg; no celular quem rola é a página.
    const coluna = ler('components/inicio/ColunaLista.tsx');
    expect(coluna).not.toMatch(/className=\{?[`"][^`"]*(?<!lg:)overflow-y-auto/);
    expect(coluna).not.toContain('recolhida');
  });

  it('celular: a busca vira campo + "Filtros (n)" e os chips vão para a folha', () => {
    const busca = ler('components/inicio/BuscaPrincipal.tsx');
    expect(busca).toContain('Filtros (${filtrosAtivos})');
    expect(ler('components/Explorador.tsx')).toMatch(/<div className="hidden lg:block">\s*<Chips/);
    const folha = ler('components/inicio/FolhaFiltros.tsx');
    expect(folha).toContain('Limpar filtros');
    expect(folha).toContain('/api/contagem?');
    expect(folha).toContain('emFolha');
  });

  it('página do edital no celular: "Abrir edital oficial" fixo acima da barra de navegação', () => {
    const pagina = ler('app/edital/[slug]/page.tsx');
    expect(pagina).toContain('bottom-[var(--altura-barra)]');
    expect(pagina).toContain('variante="barra"');
  });
});
