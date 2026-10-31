import { RECURSOS_COMERCIAIS, semDadoPessoal, type RecursoComercial } from './eventos';
import { separarNegativos } from './relevancia/termos';

/**
 * Funil comercial (GA4 e, quando ainda não existe no banco, o painel do dono). `purchase_completed` não está aqui: só o
 * servidor sabe que o pagamento entrou (lib/pagamento/ga4.ts, a partir do webhook). Quem chama é `rastrear`
 * (lib/cliente/rastrear.ts). Nada de e-mail, CPF ou CNPJ nos parâmetros.
 */
export const EVENTOS_COMERCIAIS = [
  'search_performed', 'search_results_viewed', 'edital_detail_viewed', 'pro_offer_viewed', 'pro_cta_clicked', 'checkout_started',
  'assessoria_offer_viewed', 'assessoria_qualification_started', 'assessoria_qualification_completed', 'assessoria_whatsapp_clicked',
] as const;
export type EventoComercial = (typeof EVENTOS_COMERCIAIS)[number];

/** Eventos que o banco já grava com outro nome (busca, abriu_edital, tentou_assinar, quer_recurso): não duplicam no painel do dono. */
export const vaiAoBanco = (e: EventoComercial): e is RecursoComercial => (RECURSOS_COMERCIAIS as readonly string[]).includes(e);

export type ParametrosComerciais = {
  /** De onde veio: oferta_busca, bloqueio_busca, radar, alertas, alerta_previa, edital, planos, inicio, assessoria. */
  origem?: string | null;
  pagina?: string | null;
  segmento?: string | null;
  resultados?: number | null;
  plano?: string | null;
  uf?: string | null;
  /** Resultado da triagem. */
  resultado?: string | null;
  edital?: string | null;
};

const NOMES_GA: Record<keyof ParametrosComerciais, string> = {
  origem: 'origem_cta',
  pagina: 'pagina_origem',
  segmento: 'segmento',
  resultados: 'quantidade_resultados',
  plano: 'plano',
  uf: 'uf',
  resultado: 'resultado_triagem',
  edital: 'edital',
};

/** Parâmetros no nome que vai ao GA4, só os preenchidos e só os da lista. */
export function parametrosGa(p: ParametrosComerciais): Record<string, string | number> {
  const saida: Record<string, string | number> = {};
  for (const [nome, ga] of Object.entries(NOMES_GA)) {
    const v = p[nome as keyof ParametrosComerciais];
    if (v !== null && v !== undefined && v !== '') saida[ga] = v;
  }
  return saida;
}

/** O que a pessoa procurou, para o parâmetro `segmento`: sem as exclusões, até 60 caracteres, sem dado pessoal. */
export function segmentoDaBusca(q: string | null | undefined): string | null {
  const termo = separarNegativos(q ?? '').positivo.replace(/\s+/g, ' ').trim();
  return termo && semDadoPessoal(termo) ? termo.slice(0, 60) : null;
}
