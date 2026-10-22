import { dataHora } from '@/lib/formato';
import { url } from '@/lib/seo/site';

/** Edital resumido para a mensagem do WhatsApp (título já limpo por assunto()). */
export type EditalAssessoria = { slug: string; titulo: string; orgao: string; local: string; encerramento_em: string | null };

const MAX_TITULO = 120;

/** Cartão em todo edital aberto (não revogado nem anulado); prazo curto o João recusa na conversa. */
export function mostrarAssessoria(e: { encerramento_em: string | null; situacao_id: number | null }, agora: Date): boolean {
  if (!e.encerramento_em || e.situacao_id === 2 || e.situacao_id === 3) return false;
  return Date.parse(e.encerramento_em) > agora.getTime();
}

/** Número da variável WHATSAPP_ASSESSORIA só com dígitos e 55 na frente; vazio ou fora do formato = sem cartão. */
export function numeroWhatsapp(bruto: string | undefined): string | null {
  const d = (bruto ?? '').replace(/\D/g, '');
  const nacional = d.length >= 12 && d.startsWith('55') ? d.slice(2) : d;
  // DDD (11 a 99) + 8 dígitos (fixo) ou 9 (celular).
  return /^[1-9][1-9]\d{8,9}$/.test(nacional) ? `55${nacional}` : null;
}

/** Texto pronto que o cliente manda ao pedir orientação para o edital. */
export function mensagemAssessoria(e: EditalAssessoria): string {
  const titulo = e.titulo.length > MAX_TITULO ? `${e.titulo.slice(0, MAX_TITULO - 1)}…` : e.titulo;
  return [
    'Olá! Vi este edital no Edital Map e quero orientação para participar:',
    '',
    titulo,
    `${e.orgao} · ${e.local}`,
    e.encerramento_em ? `Propostas até ${dataHora(e.encerramento_em)}` : null,
    url(`/edital/${e.slug}`),
  ]
    .filter((linha) => linha !== null)
    .join('\n');
}

export function linkAssessoria(numero: string, e: EditalAssessoria): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagemAssessoria(e))}`;
}

/** Texto do cartão da página inicial, sem edital escolhido (o João pergunta qual na conversa). */
export const MENSAGEM_ASSESSORIA_INICIO = 'Olá! Vim pelo Edital Map e quero orientação para participar de uma licitação.';

export function linkAssessoriaInicio(numero: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(MENSAGEM_ASSESSORIA_INICIO)}`;
}
