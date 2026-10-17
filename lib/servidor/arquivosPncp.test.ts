import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { arquivosDoPncp } = await import('./arquivosPncp');

const compra = { id: 'C1', cnpj: '00394452000103', ano: 2026, sequencial: 21982 };
const URL_ARQ = (n: number) => `https://pncp.gov.br/pncp-api/v1/orgaos/00394452000103/compras/2026/21982/arquivos/${n}`;
const arquivo = (n: number, tipoId: number, tipoNome: string, titulo: string, extra: Record<string, unknown> = {}) => ({
  uri: URL_ARQ(n),
  url: URL_ARQ(n),
  statusAtivo: true,
  sequencialDocumento: n,
  titulo,
  tipoDocumentoId: tipoId,
  tipoDocumentoNome: tipoNome,
  dataPublicacaoPncp: '2026-10-13T07:00:09',
  ...extra,
});

function fetchFalso(resposta: Response | Error) {
  const urls: string[] = [];
  const f = (async (url: string | URL | Request) => {
    urls.push(String(url));
    if (resposta instanceof Error) throw resposta;
    return resposta;
  }) as typeof fetch;
  return { f, urls };
}
const ok = (corpo: unknown) => new Response(JSON.stringify(corpo), { status: 200 });

describe('arquivosDoPncp', () => {
  it('lista os arquivos da compra: edital primeiro, depois termo de referência, depois a ordem do PNCP', async () => {
    const { f, urls } = fetchFalso(
      ok([
        arquivo(1, 4, 'Termo de Referência', 'TR160440.pdf'),
        arquivo(3, 7, 'Estudo Técnico Preliminar', 'ETP.pdf'),
        arquivo(5, 19, 'Minuta de Ata de Registro de Preços', ' MINUTA DA ATA.pdf '),
        arquivo(12, 2, 'Edital', 'Edital 35-2026.pdf'),
      ]),
    );
    const lista = await arquivosDoPncp(compra, f, 'https://pncp.gov.br/api/pncp');
    expect(urls).toEqual(['https://pncp.gov.br/api/pncp/v1/orgaos/00394452000103/compras/2026/21982/arquivos']);
    expect(lista).toEqual([
      { titulo: 'Edital 35-2026.pdf', tipo: 'Edital', url: URL_ARQ(12) },
      { titulo: 'TR160440.pdf', tipo: 'Termo de Referência', url: URL_ARQ(1) },
      { titulo: 'ETP.pdf', tipo: 'Estudo Técnico Preliminar', url: URL_ARQ(3) },
      { titulo: 'MINUTA DA ATA.pdf', tipo: 'Minuta de Ata de Registro de Preços', url: URL_ARQ(5) },
    ]);
  });

  it('deixa de fora arquivo inativo, sem link do PNCP ou fora do formato; sem título usa o tipo', async () => {
    const { f } = fetchFalso(
      ok([
        arquivo(1, 2, 'Edital', 'velho.pdf', { statusAtivo: false }),
        arquivo(2, 16, 'Outros Documentos', 'x.pdf', { url: 'javascript:alert(1)', uri: 'javascript:alert(1)' }),
        arquivo(3, 16, 'Outros Documentos', 'y.pdf', { url: 'https://outro.site/y.pdf', uri: 'https://outro.site/y.pdf' }),
        'lixo',
        arquivo(4, 16, 'Outros Documentos', '   '),
      ]),
    );
    expect(await arquivosDoPncp(compra, f, 'https://pncp.gov.br/api/pncp')).toEqual([
      { titulo: 'Outros Documentos', tipo: 'Outros Documentos', url: URL_ARQ(4) },
    ]);
  });

  it('204 ou corpo vazio = nenhum arquivo', async () => {
    expect(await arquivosDoPncp(compra, fetchFalso(new Response(null, { status: 204 })).f, 'https://x')).toEqual([]);
    expect(await arquivosDoPncp(compra, fetchFalso(new Response('', { status: 200 })).f, 'https://x')).toEqual([]);
  });

  it('erro HTTP, rede fora ou resposta fora do formato lançam exceção (a página mostra "indisponíveis agora")', async () => {
    await expect(arquivosDoPncp(compra, fetchFalso(new Response('x', { status: 500 })).f, 'https://x')).rejects.toThrow('HTTP 500');
    await expect(arquivosDoPncp(compra, fetchFalso(new Error('rede')).f, 'https://x')).rejects.toThrow('rede');
    await expect(arquivosDoPncp(compra, fetchFalso(ok({ a: 1 })).f, 'https://x')).rejects.toThrow('fora do formato');
  });
});
