import { describe, expect, it } from 'vitest';

process.env.NEXT_PUBLIC_GA4_ID ??= 'G-TESTE';
const { PADRAO, tagNaPagina } = await import('../components/TagGoogle');
const { default: config } = await import('../next.config');

/** Roda o script inline da tag com window/location falsos e devolve o que foi para o dataLayer. */
function rodar(href: string): unknown[][] {
  const camada: unknown[] = [];
  const janela: Record<string, unknown> = { dataLayer: camada };
  const armazenamento = { getItem: () => null };
  new Function('window', 'location', 'localStorage', 'dataLayer', PADRAO)(janela, { href }, armazenamento, camada);
  return camada.map((a) => Array.from(a as ArrayLike<unknown>));
}

describe('tag do Google fora do link de descadastro', () => {
  it('sem a tag em /alertas/sair (o token do e-mail não vai ao Google)', () => {
    expect(tagNaPagina('/alertas/sair')).toBe(false);
    expect(tagNaPagina('/alertas/sair/')).toBe(false);
    for (const c of ['/', '/alertas', '/alertas/novo', '/edital/x', null]) expect(tagNaPagina(c)).toBe(true);
  });
  it('com o parâmetro t, todo config leva page_location sem ele (o resto do endereço fica)', () => {
    const configs = rodar('https://www.editalmap.com.br/alertas/sair?t=a.segredo.assinatura&utm_source=x').filter((c) => c[0] === 'config');
    expect(configs.length).toBeGreaterThanOrEqual(2);
    for (const c of configs) {
      expect(c).toHaveLength(3);
      expect(c[2]).toEqual({ page_location: 'https://www.editalmap.com.br/alertas/sair?utm_source=x' });
    }
  });
  it('sem o parâmetro t, config igual ao de antes (sem page_location fixo, que travaria a página nas navegações)', () => {
    for (const href of ['https://www.editalmap.com.br/', 'https://www.editalmap.com.br/?q=luva&utm_source=x', 'https://www.editalmap.com.br/edital/x?tela=lista']) {
      const configs = rodar(href).filter((c) => c[0] === 'config');
      expect(configs.length).toBeGreaterThanOrEqual(2);
      for (const c of configs) expect(c).toHaveLength(2);
    }
  });
  it('Consent Mode continua: padrão negado antes do config', () => {
    const chamadas = rodar('https://www.editalmap.com.br/');
    const padrao = chamadas.findIndex((c) => c[0] === 'consent' && c[1] === 'default');
    expect(padrao).toBe(0);
    expect(chamadas[0][2]).toMatchObject({ ad_storage: 'denied', analytics_storage: 'denied' });
    expect(chamadas.findIndex((c) => c[0] === 'config')).toBeGreaterThan(padrao);
  });
});

describe('cabeçalhos de /alertas/sair', () => {
  it('no-referrer e noindex', async () => {
    const regras = (await config.headers?.()) ?? [];
    const sair = regras.find((r) => r.source === '/alertas/sair');
    expect(sair?.headers).toEqual(
      expect.arrayContaining([
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'X-Robots-Tag', value: 'noindex' },
      ]),
    );
  });
});
