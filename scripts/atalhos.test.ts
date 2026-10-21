import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

describe('atalhos de assunto da página inicial', () => {
  const atalhos = ler('components/inicio/Atalhos.tsx');
  it('celular: a fila encaixa com a margem da página (sem o primeiro cartão colado na borda)', () => {
    expect(atalhos).toMatch(/snap-x scroll-px-4/);
  });
  it('por último, "Outros" leva a todos os assuntos; no computador, sete colunas', () => {
    expect(atalhos).toContain('>Outros<');
    expect(atalhos).toContain('href="/licitacoes"');
    expect(atalhos).toContain('lg:grid-cols-7');
  });
});
