/**
 * IndexNow: avisa Bing, Yandex e outros buscadores dos editais novos ou alterados em cada rodada do sync
 * (o Bing alimenta a busca do ChatGPT, o Copilot e o DuckDuckGo). A chave é pública por desenho do protocolo:
 * o arquivo public/<chave>.txt prova que o site é nosso.
 */
export const CHAVE_INDEXNOW = '37a46bf614ffee301b2e3042a8b1fcfa';
const HOST = 'www.editalmap.com.br';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
/** Máximo de endereços por pedido no protocolo. */
const LOTE = 10_000;

type ChaveEdital = { cnpj: string; ano: number; sequencial: number };

/** Mesmo slug da coluna gerada no banco (0001): cnpj-ano-sequencial. */
export function urlDoEdital(c: ChaveEdital): string {
  return `https://${HOST}/edital/${c.cnpj}-${c.ano}-${c.sequencial}`;
}

/** Nunca lança: o erro volta como texto para virar aviso no resumo da rodada. */
export async function avisarIndexNow(
  editais: ChaveEdital[],
  buscar: typeof fetch = fetch,
): Promise<{ enviados: number; erro: string | null }> {
  const urls = [...new Set(editais.map(urlDoEdital))];
  let enviados = 0;
  try {
    for (let i = 0; i < urls.length; i += LOTE) {
      const urlList = urls.slice(i, i + LOTE);
      const resp = await buscar(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host: HOST, key: CHAVE_INDEXNOW, keyLocation: `https://${HOST}/${CHAVE_INDEXNOW}.txt`, urlList }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!resp.ok) return { enviados, erro: `IndexNow: HTTP ${resp.status}` };
      enviados += urlList.length;
    }
    return { enviados, erro: null };
  } catch (erro) {
    return { enviados, erro: `IndexNow: ${erro instanceof Error ? erro.message : String(erro)}` };
  }
}
