'use client';

import type { Plano } from '@/lib/limites';
import type { Periodo } from '@/lib/planos';
import { BotaoQueroPlano } from './BotaoQueroPlano';

const ORDEM: Record<Plano, number> = { gratis: 0, basic: 1, pro: 2 };
const NOME: Record<Plano, string> = { gratis: 'Grátis', basic: 'Basic', pro: 'Pro' };

/**
 * Ação de cada plano na tabela e nos cartões: "Seu plano hoje" no plano atual; com o pagamento ligado, "Assinar"
 * (vai a /api/checkout e dali para a Cakto); desligado, a lista de espera de antes. Planos abaixo do atual: nada.
 */
export function AcaoDoPlano({ plano, periodo, pagamento, atual }: { plano: Plano; periodo: Periodo; pagamento: boolean; atual: Plano }) {
  if (plano === atual) return <span className="text-[12px] font-normal text-ink-muted">Seu plano hoje</span>;
  if (plano === 'gratis' || ORDEM[plano] < ORDEM[atual]) return null;
  if (!pagamento) return <BotaoQueroPlano plano={plano} periodo={periodo} destaque={plano === 'pro'} />;
  return (
    // Link comum (não o <Link> do Next): a rota redireciona para fora do site, na Cakto.
    <a
      href={`/api/checkout?plano=${plano}&periodo=${periodo}`}
      className={`inline-flex h-11 items-center justify-center rounded-sm px-4 text-sm font-semibold ${
        plano === 'pro' ? 'bg-pin text-on-pin' : 'border border-line-strong bg-raised text-ink hover:bg-sunken'
      }`}
    >
      Assinar o {NOME[plano]}
    </a>
  );
}
