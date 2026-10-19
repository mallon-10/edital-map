import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

describe('proxy e sessão', () => {
  const proxy = ler('proxy.ts');
  it('o proxy roda nas páginas da conta e do radar', () => {
    for (const rota of ["'/entrar'", "'/radar'", "'/radar/:path*'", "'/oportunidades'", "'/alertas/:path*'", "'/api/:path*'"]) expect(proxy).toContain(rota);
  });
  it('o matcher mantém as páginas do pagamento e as do SEO', () => {
    for (const rota of ["'/assinar'", "'/assinatura'", "'/obrigado/:path*'", "'/licitacoes/:path*'", "'/planos'", "'/alertas'"]) expect(proxy).toContain(rota);
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
  it('visual da marca: logo absoluto, código em JetBrains Mono, validade e aviso; só a variável do código', () => {
    expect(html).toContain('src="https://www.editalmap.com.br/marca/logo-email.png"');
    expect(html).toContain('alt="Edital Map"');
    expect(html).toMatch(/font-family:'JetBrains Mono','Courier New'[^"]*"[^>]*>\{\{ \.Token \}\}</);
    expect(html).toContain('1 hora');
    expect(html).toContain('ignore este e-mail');
    expect(html).toMatch(/<div style="display:none;/);
    expect(html.match(/\{\{/g)).toHaveLength(html.match(/\{\{ \.Token \}\}/g)!.length);
    expect([...html.matchAll(/src="([^"]+)"/g)].map((m) => m[1])).toEqual(['https://www.editalmap.com.br/marca/logo-email.png']);
  });
});
