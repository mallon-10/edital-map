import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function preparar(idGa4: string) {
  vi.stubEnv('NEXT_PUBLIC_GA4_ID', idGa4);
  const gtag = vi.fn();
  const fetchFalso = vi.fn(async () => new Response('{}'));
  vi.stubGlobal('window', { gtag, location: { pathname: '/edital/x' }, setTimeout });
  vi.stubGlobal('fetch', fetchFalso);
  const { rastrear } = await import('./rastrear');
  const corpos = () => fetchFalso.mock.calls.map((c) => JSON.parse(String((c as unknown as [string, { body: string }])[1].body)));
  return { rastrear, gtag, corpos };
}

describe('rastrear', () => {
  it('vai ao GA4 com os parâmetros e a página de origem', async () => {
    const { rastrear, gtag } = await preparar('G-TESTE');
    rastrear('pro_cta_clicked', { origem: 'oferta_busca', segmento: 'luva', resultados: 3 });
    expect(gtag).toHaveBeenCalledWith('event', 'pro_cta_clicked', {
      origem_cta: 'oferta_busca', pagina_origem: '/edital/x', segmento: 'luva', quantidade_resultados: 3, send_to: 'G-TESTE',
    });
  });
  it('sem GA4 configurado não toca no gtag (não vira evento do Google Ads)', async () => {
    const { rastrear, gtag } = await preparar('');
    rastrear('pro_cta_clicked', { origem: 'radar' });
    expect(gtag).not.toHaveBeenCalled();
  });
  it('o painel do dono recebe o funil, mesmo sem GA4', async () => {
    const { rastrear, corpos } = await preparar('');
    rastrear('pro_offer_viewed', { origem: 'radar' });
    expect(corpos()).toEqual([{ tipo: 'usou_recurso', detalhe: { recurso: 'pro_offer_viewed', origem: 'radar', pagina: '/edital/x' } }]);
  });
  it('o que o banco já grava com outro nome não é gravado de novo', async () => {
    const { rastrear, corpos } = await preparar('G-TESTE');
    rastrear('search_performed', { segmento: 'luva' });
    expect(corpos()).toEqual([]);
  });
  it('soGa: conta no GA4 e não escreve no banco', async () => {
    const { rastrear, gtag, corpos } = await preparar('G-TESTE');
    rastrear('pro_offer_viewed', { origem: 'faixa' }, { soGa: true });
    expect(gtag).toHaveBeenCalledOnce();
    expect(corpos()).toEqual([]);
  });
});
