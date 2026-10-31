import { formatarReais } from './planos';

/** Edital resumido para a mensagem do WhatsApp (título já limpo por assunto()). */
export type EditalAssessoria = { slug: string; titulo: string; orgao: string; local: string; encerramento_em: string | null };

/** Assessoria Edital Map: serviço avulso, separado do Pro. Escopo e preço final são confirmados na conversa. */
export const NOME_ASSESSORIA = 'Assessoria Edital Map';

const PRECO_PADRAO_CENTAVOS = 19_700;

/** Preço inicial em centavos: NEXT_PUBLIC_ASSESSORIA_PRECO_CENTAVOS (inteiro positivo) ou o padrão. */
export function precoAssessoria(bruto: string | undefined): number {
  return /^[1-9]\d*$/.test(bruto ?? '') ? Number(bruto) : PRECO_PADRAO_CENTAVOS;
}

export function rotuloPrecoAssessoria(centavos: number): string {
  return formatarReais(centavos).replace(/,00$/, '');
}

/** "R$ 197" (preço inicial de hoje; a variável precisa estar na Vercel antes do build). */
export const PRECO_ASSESSORIA = rotuloPrecoAssessoria(precoAssessoria(process.env.NEXT_PUBLIC_ASSESSORIA_PRECO_CENTAVOS));

export const ENTREGAVEIS_ASSESSORIA = [
  'Análise orientativa do edital',
  'Resumo em linguagem simples',
  'Identificação dos documentos exigidos',
  'Checklist para preparação',
  'Orientações sobre as etapas para participar',
  'Indicação dos canais e procedimentos oficiais',
] as const;

/** O que o serviço não faz. Aparece escrito para ninguém contratar achando que está incluído. */
export const LIMITES_ASSESSORIA = [
  'Garantia de habilitação ou de vitória',
  'Envio de proposta pela nossa equipe',
  'Representação em sessões públicas',
  'Assessoria jurídica especializada',
  'Execução integral da licitação',
] as const;

export const hrefAssessoria = (slug?: string) => (slug ? `/assessoria?edital=${slug}` : '/assessoria');

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
