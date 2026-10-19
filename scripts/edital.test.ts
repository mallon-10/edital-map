import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

describe('página do edital', () => {
  const pagina = ler('app/edital/[slug]/page.tsx');
  it('sem limite do dia nem cadeado: nada de contar o edital, cartão dos planos ou link oficial bloqueado', () => {
    expect(pagina).not.toMatch(/decidirEdital|CartaoLimite|usoDoDia|bloqueado=|maisNoPro|PARECIDOS_GRATIS/);
    expect(pagina).toContain('<BotaoEditalOficial href={linkOficial(e)} slug={e.slug} />');
    expect(pagina).toContain('variante="barra"');
  });
  it('situação no cabeçalho; resumo e informações principais depois dele', () => {
    const resumo = pagina.indexOf('<ResumoOportunidade');
    expect(resumo).toBeGreaterThan(-1);
    expect(pagina.indexOf('avisoSituacao(e.situacao_id)')).toBeLessThan(resumo);
    expect(pagina.indexOf('<EtiquetaSituacao')).toBeLessThan(resumo);
    expect(pagina.indexOf('<BotaoCompartilhar')).toBeLessThan(resumo);
    expect(pagina.indexOf('<FichaEdital')).toBeGreaterThan(resumo);
  });
});
