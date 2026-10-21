import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { extensoesDePagina } from '../lib/paginasLocais';

const caminho = (arquivo: string) => new URL(`../${arquivo}`, import.meta.url);
const ler = (arquivo: string) => readFileSync(caminho(arquivo), 'utf8');

describe('painel do dono (/admin, só local)', () => {
  const pagina = ler('app/admin/page.local.tsx');
  it('a rota só existe no next dev: page.local.tsx e a extensão .local.tsx só em desenvolvimento', () => {
    expect(existsSync(caminho('app/admin/page.tsx'))).toBe(false);
    expect(extensoesDePagina('development')).toContain('local.tsx');
    expect(extensoesDePagina('production')).not.toContain('local.tsx');
    expect(extensoesDePagina(undefined)).not.toContain('local.tsx');
    expect(extensoesDePagina('production')).toEqual(['tsx', 'ts', 'jsx', 'js']);
    expect(ler('next.config.ts')).toContain('pageExtensions: extensoesDePagina(process.env.NODE_ENV)');
  });
  it('segunda trava: fora do desenvolvimento a página responde 404 antes de ler qualquer número', () => {
    const trava = pagina.indexOf("if (process.env.NODE_ENV !== 'development') notFound();");
    expect(trava).toBeGreaterThan(-1);
    expect(trava).toBeLessThan(pagina.indexOf('lerPainel('));
  });
  it('npm run admin sobe só no 127.0.0.1 (fora da rede local)', () => {
    const pacote = JSON.parse(ler('package.json')) as { scripts: Record<string, string> };
    expect(pacote.scripts.admin).toBe('next dev --hostname 127.0.0.1 --port 3100');
  });
  it('sem cookie de dono e fora do proxy: o painel não depende de nada do navegador', () => {
    const servidor = ler('lib/servidor/admin.ts');
    expect(servidor).toContain("import 'server-only';");
    expect(servidor).not.toContain('cookies');
    expect(ler('proxy.ts')).not.toContain("'/admin'");
  });
  it('fora do Google, sem prefetch e links para o site publicado (navegar no local não suja as métricas)', () => {
    expect(pagina).toContain('robots: { index: false, follow: false }');
    expect(pagina).not.toMatch(/<Link(?![^>]*prefetch=\{false\})[^>]*href/);
    expect(pagina).toContain('urlDoSite(');
    expect(pagina).not.toContain('<Cabecalho');
  });
  it('o painel não grava página vista; o layout grava as outras', () => {
    expect(ler('app/layout.tsx')).toContain('<RegistrarVisita />');
  });
});
