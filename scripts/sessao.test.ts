import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

describe('proxy e sessão', () => {
  const proxy = ler('proxy.ts');
  it('o proxy roda nas páginas da conta e do radar', () => {
    for (const rota of ["'/entrar'", "'/radar'", "'/radar/:path*'", "'/api/:path*'"]) expect(proxy).toContain(rota);
  });
  it('só renova a sessão nas rotas da conta e quando há cookie de sessão', () => {
    expect(proxy).toContain('rotaComSessao(');
    expect(proxy).toContain('temCookieDeSessao(');
    expect(proxy).toContain('renovarSessao(request)');
  });
  it('a chave publicável está documentada no .env.example', () => {
    expect(ler('.env.example')).toMatch(/^SUPABASE_ANON_KEY=$/m);
  });
});

describe('modelo do e-mail do código', () => {
  const html = ler('supabase/templates/codigo.html');
  it('mostra o código, em português, sem link de login', () => {
    expect(html).toContain('{{ .Token }}');
    expect(html).toContain('lang="pt-BR"');
    expect(html).toContain('Use este código para entrar no Edital Map');
    expect(html).not.toContain('ConfirmationURL');
    expect(html).not.toContain('TokenHash');
  });
});
