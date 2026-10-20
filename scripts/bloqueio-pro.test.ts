import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BLOQUEIO_PRO, BOTAO_LIBERAR_PRO } from '../lib/bloqueioPro';

const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

describe('áreas do Pro bloqueadas para o grátis', () => {
  const paginas = [
    ['app/radar/page.tsx', 'radar'],
    ['app/radar/comecar/page.tsx', 'radar'],
    ['app/radar/editar/page.tsx', 'radar'],
    ['app/oportunidades/page.tsx', 'oportunidades'],
    ['app/alertas/page.tsx', 'alertas'],
    ['app/alertas/novo/page.tsx', 'alertas'],
    ['app/alertas/[id]/editar/page.tsx', 'alertas'],
  ] as const;
  for (const [arquivo, recurso] of paginas) {
    it(arquivo, () => {
      const p = ler(arquivo);
      expect(p, arquivo).toContain('await acessoAoPro(usuario, ctx)');
      expect(p, arquivo).toContain(`<PaginaBloqueada recurso="${recurso}"`);
      const bloqueio = p.indexOf("if (acesso !== 'liberado')");
      expect(bloqueio, arquivo).toBeGreaterThan(-1);
      // Antes do bloqueio nada da conta é lido: o grátis não gasta consulta nem recebe dado escondido no HTML.
      for (const leitura of ['lerRadar(', 'salvosDaConta(', 'alertasDaConta(', 'lerAlerta(', 'contarAlertas(']) {
        const i = p.indexOf(leitura);
        if (i > -1) expect(i, `${arquivo} ${leitura}`).toBeGreaterThan(bloqueio);
      }
    });
  }
  it('acesso: dono confiável, Pro pela conta ou, sem conta, pelo navegador', () => {
    const f = ler('lib/servidor/acessoPro.ts');
    expect(f).toContain("import 'server-only'");
    expect(f).toContain('acessoDeDono(ctx)');
    expect(f).toContain('planoDaConta(usuario, ctx)');
    expect(f).toContain('acessoDoPlano(');
    expect(f).toContain('planoAtual(ctx)');
  });
  it('tela: exemplo apagado (fora do leitor de tela e do toque), cadeado e "Liberar o Pro" para /planos', () => {
    const c = ler('components/conta/PaginaBloqueada.tsx');
    expect(c).toContain('aria-hidden="true"');
    expect(c).toContain('inert');
    expect(c).toMatch(/opacity-\d+/);
    expect(c).toContain('<IconeCadeado');
    expect(c).toContain('href="/planos"');
    expect(c).toContain('{BOTAO_LIBERAR_PRO}');
    // Sem conta: quem já assinou entra e volta para a mesma área.
    expect(c).toContain('/entrar?voltar=');
    expect(BOTAO_LIBERAR_PRO).toBe('Liberar o Pro');
  });
  it('textos de cada área', () => {
    expect(Object.keys(BLOQUEIO_PRO).sort()).toEqual(['alertas', 'oportunidades', 'radar']);
    for (const t of Object.values(BLOQUEIO_PRO)) {
      expect(t.titulo).toMatch(/plano Pro\.?$/);
      expect(t.texto.length).toBeGreaterThan(40);
      expect(t.caminho).toMatch(/^\/(radar|oportunidades|alertas)$/);
    }
  });
});
