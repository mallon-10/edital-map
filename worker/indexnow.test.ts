import { describe, expect, it } from 'vitest';
import { avisarIndexNow, CHAVE_INDEXNOW, urlDoEdital } from './indexnow';

const linha = (sequencial: number) => ({ cnpj: '00394452000103', ano: 2026, sequencial });

function fetchFalso(status = 200) {
  const pedidos: Array<{ url: string; corpo: { host: string; key: string; keyLocation: string; urlList: string[] } }> = [];
  const f = (async (url: string | URL | Request, init?: RequestInit) => {
    pedidos.push({ url: String(url), corpo: JSON.parse(String(init?.body)) });
    return new Response(null, { status });
  }) as typeof fetch;
  return { f, pedidos };
}

describe('IndexNow', () => {
  it('endereço do edital igual ao slug do banco (cnpj-ano-sequencial)', () => {
    expect(urlDoEdital(linha(12))).toBe('https://www.editalmap.com.br/edital/00394452000103-2026-12');
  });

  it('manda a lista com a chave publicada no site', async () => {
    const { f, pedidos } = fetchFalso(202);
    expect(await avisarIndexNow([linha(1), linha(2)], f)).toEqual({ enviados: 2, erro: null });
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0].url).toBe('https://api.indexnow.org/indexnow');
    expect(pedidos[0].corpo).toEqual({
      host: 'www.editalmap.com.br',
      key: CHAVE_INDEXNOW,
      keyLocation: `https://www.editalmap.com.br/${CHAVE_INDEXNOW}.txt`,
      urlList: ['https://www.editalmap.com.br/edital/00394452000103-2026-1', 'https://www.editalmap.com.br/edital/00394452000103-2026-2'],
    });
  });

  it('sem novidades não chama ninguém; repetidos vão uma vez só', async () => {
    const { f, pedidos } = fetchFalso();
    expect(await avisarIndexNow([], f)).toEqual({ enviados: 0, erro: null });
    expect(pedidos).toHaveLength(0);
    await avisarIndexNow([linha(1), linha(1)], f);
    expect(pedidos[0].corpo.urlList).toHaveLength(1);
  });

  it('mais de 10.000 endereços vão em lotes (limite do protocolo)', async () => {
    const { f, pedidos } = fetchFalso();
    const linhas = Array.from({ length: 10_001 }, (_, i) => linha(i + 1));
    expect((await avisarIndexNow(linhas, f)).enviados).toBe(10_001);
    expect(pedidos.map((p) => p.corpo.urlList.length)).toEqual([10_000, 1]);
  });

  it('erro do IndexNow volta como texto, nunca como exceção (o sync não cai por isso)', async () => {
    expect(await avisarIndexNow([linha(1)], fetchFalso(403).f)).toEqual({ enviados: 0, erro: 'IndexNow: HTTP 403' });
    const quebrado = (async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch;
    expect(await avisarIndexNow([linha(1)], quebrado)).toEqual({ enviados: 0, erro: 'IndexNow: fetch failed' });
  });
});
