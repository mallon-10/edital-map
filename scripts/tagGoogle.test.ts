import { describe, expect, it } from 'vitest';

process.env.NEXT_PUBLIC_GA4_ID ??= 'G-TESTE';
const { COMANDOS_META, PADRAO, tagNaPagina } = await import('../components/TagGoogle');
const { default: config } = await import('../next.config');

/** Roda o script inline da tag com window/location falsos e devolve o que foi para o dataLayer. */
function rodar(href: string, escolha: string | null = null): unknown[][] {
  const camada: unknown[] = [];
  const janela: Record<string, unknown> = { dataLayer: camada };
  const armazenamento = { getItem: () => escolha };
  new Function('window', 'location', 'localStorage', 'dataLayer', PADRAO)(janela, { href, pathname: new URL(href).pathname }, armazenamento, camada);
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

/** Roda os comandos do Pixel da Meta com um fbq falso e devolve as chamadas. */
function rodarMeta(escolha: string | null, pathname = '/'): unknown[][] {
  const chamadas: unknown[][] = [];
  const fbq = (...a: unknown[]) => void chamadas.push(a);
  new Function('fbq', 'localStorage', 'location', COMANDOS_META)(fbq, { getItem: () => escolha }, { pathname });
  return chamadas;
}

describe('Pixel da Meta', () => {
  it('sem escolha ou recusado: consentimento revogado antes do init (nada sai até o Aceitar)', () => {
    for (const escolha of [null, 'recusado']) {
      const c = rodarMeta(escolha);
      expect(c[0]).toEqual(['consent', 'revoke']);
      expect(c.findIndex((x) => x[0] === 'init')).toBeGreaterThan(0);
    }
  });
  it('aceito: consentimento liberado, init com o pixel 1437127088392129 e PageView', () => {
    const c = rodarMeta('aceito');
    expect(c[0]).toEqual(['consent', 'grant']);
    expect(c).toContainEqual(['init', '1437127088392129']);
    expect(c).toContainEqual(['track', 'PageView']);
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

describe('VSL do curso (/cursolicitacao): mede sem o aviso, mas respeita quem recusou', () => {
  it('Google: sem escolha, o consentimento é liberado logo depois do padrão negado', () => {
    const c = rodar('https://www.editalmap.com.br/cursolicitacao?utm_source=meta');
    expect(c[0]).toMatchObject(['consent', 'default', { ad_storage: 'denied' }]);
    expect(c[1]).toMatchObject(['consent', 'update', { ad_storage: 'granted', analytics_storage: 'granted' }]);
    expect(rodar('https://www.editalmap.com.br/cursolicitacao', 'recusado').some((x) => x[1] === 'update')).toBe(false);
    expect(rodar('https://www.editalmap.com.br/').some((x) => x[1] === 'update')).toBe(false);
  });
  it('Meta: sem escolha na VSL, grant; recusado ou fora da VSL, revoke', () => {
    expect(rodarMeta(null, '/cursolicitacao')[0]).toEqual(['consent', 'grant']);
    expect(rodarMeta('recusado', '/cursolicitacao')[0]).toEqual(['consent', 'revoke']);
    expect(rodarMeta(null, '/cursolicitacaox')[0]).toEqual(['consent', 'revoke']);
  });
});
