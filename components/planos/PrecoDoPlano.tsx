import { precoDoPlano, type Periodo } from '@/lib/planos';

/** Preço do plano no período escolhido; no anual, uma linha menor com o equivalente por mês. */
export function PrecoDoPlano({ centavosMes, periodo }: { centavosMes: number; periodo: Periodo }) {
  const p = precoDoPlano(centavosMes, periodo);
  return (
    <>
      <span className="block font-mono text-[13px] font-medium text-ink-muted">{p.principal}</span>
      {p.equivalente ? <span className="block text-[12px] text-ink-muted">{p.equivalente}</span> : null}
    </>
  );
}
