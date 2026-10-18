import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

describe('página do edital', () => {
  const pagina = ler('app/edital/[slug]/page.tsx');
  const bloco = pagina.indexOf('{detalhes ? (');
  it('"Abrir edital oficial" e "Compartilhar" não dependem do limite do dia (ficam antes do bloco liberado)', () => {
    expect(bloco).toBeGreaterThan(-1);
    expect(pagina).not.toMatch(/detalhes\s*\?\s*<BotaoEditalOficial/);
    expect(pagina.indexOf('<BotaoEditalOficial')).toBeGreaterThan(-1);
    expect(pagina.indexOf('<BotaoEditalOficial')).toBeLessThan(bloco);
    expect(pagina.indexOf('variante="barra"')).toBeLessThan(bloco);
    expect(pagina.indexOf('<BotaoCompartilhar')).toBeLessThan(bloco);
  });
  it('situação no cabeçalho; resumo e informações principais no bloco liberado', () => {
    expect(pagina.indexOf('avisoSituacao(e.situacao_id)')).toBeLessThan(bloco);
    expect(pagina.indexOf('<EtiquetaSituacao')).toBeLessThan(bloco);
    expect(pagina.indexOf('<ResumoOportunidade')).toBeGreaterThan(bloco);
    expect(pagina.indexOf('<FichaEdital')).toBeGreaterThan(bloco);
  });
});
