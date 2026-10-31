import type { Plano } from './planos';
import { temTermo } from './relevancia/termos';
import type { ResultadoBusca } from './tipos';

/**
 * Pesquisa por assunto no grátis (decisão de 31/10/2026, no lugar do "grátis sem limite" de 19/10): os 5 primeiros editais
 * ficam visíveis e o resto, com o total real, atrás do cadeado do Pro (components/inicio/BloqueioBusca.tsx). O corte é no
 * servidor: os outros nunca chegam ao navegador. Sem termo a home fica livre, e as páginas do Google (/licitacoes, edital)
 * ficam fora disso.
 */
export const EDITAIS_GRATIS_POR_BUSCA = 5;

export const AVISO_EXPORTAR_GRATIS = `A planilha traz os ${EDITAIS_GRATIS_POR_BUSCA} editais liberados. No Pro, ela vem com todos os desta pesquisa.`;

/** Com o pagamento desligado não há como liberar: nada de cadeado. */
export function buscaLimitada(q: string | null, o: { plano: Plano; pagamento: boolean }): boolean {
  return o.pagamento && o.plano === 'gratis' && temTermo(q);
}

export function limitarResultado(r: ResultadoBusca): ResultadoBusca {
  return { total: r.total, editais: r.editais.slice(0, EDITAIS_GRATIS_POR_BUSCA), bloqueados: Math.max(0, r.total - EDITAIS_GRATIS_POR_BUSCA) };
}

const COM_LIMITE = ['/', '/api/busca', '/api/exportar'];

/**
 * A pesquisa depende de saber quem assina, e fora das páginas da conta o login não é renovado: com o token vencido, um
 * assinante em outro aparelho veria o cadeado. Quem usa é o proxy.ts, só com cookie de sessão.
 */
export function buscaPedeSessao(url: URL): boolean {
  return COM_LIMITE.includes(url.pathname) && temTermo(url.searchParams.get('q'));
}
