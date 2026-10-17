import { lerFiltros, normalizarTela } from './filtros';
import type { Cidade, FiltrosBusca, FiltrosTela, Orgao } from './tipos';

/**
 * Parte da página inicial em que o celular (abaixo de lg) está: o mapa, em cima, ou a lista, embaixo. No endereço,
 * `tela=lista` faz a página abrir rolada até a lista. No computador as duas aparecem juntas e a tela não muda nada.
 */
export type Tela = 'mapa' | 'lista';

/**
 * Endereço da página inicial com a busca, para voltar do edital e compartilhar:
 * /?q=luva&uf=SC&municipio=4209102&valor=50000&modalidades=6,8&orgao=…&raio=100&dias=7[&tela=lista].
 * `municipio` é o código IBGE (na API o mesmo valor se chama `ibge`).
 */
export function urlDaBusca(f: FiltrosTela, tela: Tela = 'mapa'): string {
  const p = new URLSearchParams();
  const q = f.q.trim();
  if (q) p.set('q', q);
  if (f.uf) p.set('uf', f.uf);
  if (f.cidade) p.set('municipio', f.cidade.ibge);
  if (f.valorMin) p.set('valor', String(f.valorMin));
  if (f.modalidades.length) p.set('modalidades', [...f.modalidades].sort((a, b) => a - b).join(','));
  if (f.orgao) p.set('orgao', f.orgao.cnpj);
  if (f.cidade && f.raio) p.set('raio', String(f.raio));
  if (f.seteDias) p.set('dias', '7');
  if (tela === 'lista') p.set('tela', 'lista');
  const texto = p.toString();
  return texto ? `/?${texto}` : '/';
}

/** Lê a busca do endereço com as mesmas validações da API (`lerFiltros`); a página sempre começa do primeiro edital. */
export function lerBuscaDaUrl(p: URLSearchParams): { busca: FiltrosBusca; tela: Tela } {
  const api = new URLSearchParams(p);
  api.delete('ibge');
  api.delete('municipio');
  const municipio = p.get('municipio');
  if (municipio) api.set('ibge', municipio);
  return { busca: { ...lerFiltros(api), deslocamento: 0 }, tela: p.get('tela') === 'lista' ? 'lista' : 'mapa' };
}

/**
 * Busca do endereço + nomes lidos do banco (município e órgão) → filtros da tela.
 * Município ou órgão que o banco não conhece saem (e o raio sai com o município); município de outra UF leva a UF dele.
 */
export function montarTela(busca: FiltrosBusca, cidade: Cidade | null, orgao: Orgao | null): FiltrosTela {
  return normalizarTela({
    q: busca.q ?? '',
    uf: busca.uf ?? '',
    cidade: busca.ibge && cidade?.ibge === busca.ibge ? cidade : null,
    valorMin: busca.valorMin,
    modalidades: busca.modalidades ?? [],
    seteDias: busca.dias === 7,
    orgao: busca.orgao && orgao?.cnpj === busca.orgao ? orgao : null,
    raio: busca.raio,
  });
}

/** `searchParams` de uma página do Next → URLSearchParams (nome repetido: vale o primeiro). */
export function paraUrlSearchParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const p = new URLSearchParams();
  for (const [nome, valor] of Object.entries(sp)) {
    const v = Array.isArray(valor) ? valor[0] : valor;
    if (v !== undefined) p.set(nome, v);
  }
  return p;
}

/** Mesmo endereço de busca, em outra tela (links Mapa e Lista da barra do celular). */
export function comTela(endereco: string, tela: Tela): string {
  const p = new URLSearchParams(endereco.split('?')[1] ?? '');
  if (tela === 'lista') p.set('tela', 'lista');
  else p.delete('tela');
  const texto = p.toString();
  return texto ? `/?${texto}` : '/';
}

/** Mesma combinação de filtros (o que a página escreveria no endereço): aplicar a folha sem mudança não refaz a busca. */
export function mesmaBusca(a: FiltrosTela, b: FiltrosTela): boolean {
  return urlDaBusca(normalizarTela(a)) === urlDaBusca(normalizarTela(b));
}

/**
 * Item ativo da barra do celular na página inicial (mapa em cima, lista embaixo): Lista quando o início da lista
 * passou da metade da tela, ou quando a página chegou ao fim (lista curta que não sobe até lá).
 */
export function telaPelaRolagem({ topoLista, alturaJanela, noFim }: { topoLista: number; alturaJanela: number; noFim: boolean }): Tela {
  return noFim || topoLista < alturaJanela / 2 ? 'lista' : 'mapa';
}
