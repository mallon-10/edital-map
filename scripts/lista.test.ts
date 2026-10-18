import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

/** Corpo de `function nome(` até o fim dela (a primeira linha que fecha no recuo de dois espaços). */
function funcao(texto: string, nome: string): string {
  const inicio = texto.indexOf(`function ${nome}(`);
  if (inicio < 0) return '';
  const fim = texto.indexOf('\n  }\n', inicio);
  return texto.slice(inicio, fim < 0 ? undefined : fim);
}

describe('lista ligada ao Explorador', () => {
  it('sem "Carregar mais": paginação numerada, ordem e estado vazio na coluna', () => {
    const coluna = ler('components/inicio/ColunaLista.tsx');
    expect(coluna).not.toContain('Carregar mais');
    expect(coluna).not.toContain('aoCarregarMais');
    expect(coluna).toContain('<Paginacao');
    expect(coluna).toContain('<SeletorOrdem');
    expect(coluna).toContain('<EstadoVazio');
    const explorador = ler('components/Explorador.tsx');
    expect(explorador).not.toContain('carregarMais');
    expect(explorador).not.toContain('POR_PAGINA');
  });

  it('mudar de página ou de ordem não grava o evento "busca", não pede o mapa e escreve o endereço', () => {
    const explorador = ler('components/Explorador.tsx');
    for (const nome of ['irParaPagina', 'mudarOrdem']) {
      const corpo = funcao(explorador, nome);
      expect(corpo, nome).not.toBe('');
      expect(corpo, nome).toContain('carregarLista(');
      expect(corpo, nome).toContain('escreverEndereco(');
      expect(corpo, nome).not.toMatch(/registrar\(|carregarMapa\(|aplicar\(|trocarEndereco\(/);
    }
  });

  it('o endereço da página inicial só é escrito por trocarEndereco (nada de router.replace)', () => {
    const explorador = ler('components/Explorador.tsx');
    expect(explorador).not.toMatch(/router\.(replace|push)|useRouter/);
    expect(explorador).toContain('trocarEndereco(urlDaBusca(f, estadoAtual.current))');
  });

  it('card compacto: a pílula de relevância fica fora do link (tocar nela não abre nem seleciona o edital)', () => {
    const card = ler('components/inicio/CardCompacto.tsx');
    expect(card).toContain('<PilulaRelevancia');
    const link = card.slice(card.indexOf('<Link'), card.indexOf('</Link>'));
    expect(link).not.toBe('');
    expect(link).not.toContain('PilulaRelevancia');
    expect(link).not.toContain('<button');
    // O link cobre o card inteiro (::after) e a pílula fica por cima dele.
    expect(card).toMatch(/after:absolute after:inset-0/);
    expect(card).toMatch(/relative z-10[^"]*"[^>]*>\s*<PilulaRelevancia/);
  });
});
