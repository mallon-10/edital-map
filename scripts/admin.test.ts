import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

describe('painel do dono (/admin)', () => {
  const pagina = ler('app/admin/page.tsx');
  it('confere o dono antes de ler qualquer número; quem não é dono recebe 404', () => {
    const trava = pagina.indexOf('if (!(await donoNaPagina())) notFound();');
    expect(trava).toBeGreaterThan(-1);
    expect(trava).toBeLessThan(pagina.indexOf('lerPainel('));
  });
  it('fora do Google e sem prefetch', () => {
    expect(pagina).toContain('robots: { index: false, follow: false }');
    expect(pagina).not.toMatch(/<Link(?![^>]*prefetch=\{false\})[^>]*href/);
  });
  it('o dono vem só do cookie assinado (em_dono), nunca do em_interno', () => {
    const servidor = ler('lib/servidor/admin.ts');
    expect(servidor).toContain("import 'server-only';");
    expect(servidor).toContain('ehDono((await cookies()).get(COOKIE_DONO)?.value, process.env.INTERNO_SEGREDO)');
    expect(servidor).not.toContain('COOKIE_INTERNO');
  });
  it('o painel não grava página vista; o layout grava as outras', () => {
    expect(ler('app/layout.tsx')).toContain('<RegistrarVisita />');
  });
});
