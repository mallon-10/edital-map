/**
 * Links dentro dos textos dos guias e do glossário: `[texto](/caminho)` (interno) ou `[texto](https://…)` de um
 * domínio oficial. Qualquer outro endereço vira texto puro (o conteúdo nunca aponta para sites de terceiros).
 */
export type Pedaco = { tipo: 'texto'; texto: string } | { tipo: 'link'; texto: string; href: string; externo: boolean };

export const DOMINIOS_OFICIAIS: readonly string[] = [
  'planalto.gov.br', 'gov.br', 'pncp.gov.br', 'tcu.gov.br', 'in.gov.br', 'caixa.gov.br', 'tst.jus.br', 'receita.fazenda.gov.br',
];

export function ehOficial(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false;
  return DOMINIOS_OFICIAIS.some((d) => u.hostname === d || u.hostname.endsWith(`.${d}`));
}

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

export function pedacos(texto: string): Pedaco[] {
  const saida: Pedaco[] = [];
  const empurrarTexto = (t: string) => {
    if (!t) return;
    const ultimo = saida[saida.length - 1];
    if (ultimo?.tipo === 'texto') ultimo.texto += t;
    else saida.push({ tipo: 'texto', texto: t });
  };
  let desde = 0;
  for (const m of texto.matchAll(LINK)) {
    empurrarTexto(texto.slice(desde, m.index));
    const [, rotulo, href] = m;
    if (href.startsWith('/') && !href.startsWith('//')) saida.push({ tipo: 'link', texto: rotulo, href, externo: false });
    else if (ehOficial(href)) saida.push({ tipo: 'link', texto: rotulo, href, externo: true });
    else empurrarTexto(rotulo);
    desde = m.index + m[0].length;
  }
  empurrarTexto(texto.slice(desde));
  return saida;
}

export function linksDoTexto(texto: string): string[] {
  return pedacos(texto).flatMap((p) => (p.tipo === 'link' && !p.externo ? [p.href] : []));
}

/** Palavras do texto visível (rótulos dos links contam; os endereços não). */
export function palavras(texto: string): number {
  const visivel = pedacos(texto).map((p) => p.texto).join('');
  return visivel.split(/\s+/).filter(Boolean).length;
}
