import { describe, expect, it } from 'vitest';
import { GUIAS } from '@/conteudo';
import { textoLlms } from './llms';

describe('textoLlms', () => {
  const t = textoLlms();

  it('segue o formato: título, resumo em citação e seções', () => {
    expect(t.startsWith('# Edital Map\n\n> ')).toBe(true);
    expect(t).toContain('\n## Páginas principais\n');
    expect(t).toContain('\n## Guias\n');
  });

  it('lista todos os guias com o endereço canônico', () => {
    for (const g of GUIAS) expect(t).toContain(`https://www.editalmap.com.br/guias/${g.slug}`);
  });

  it('não traz número que envelhece', () => {
    expect(t).not.toMatch(/\d[\d.]* editais/);
  });
});
