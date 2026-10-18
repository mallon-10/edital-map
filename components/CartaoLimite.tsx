import Link from 'next/link';
import { Medir } from '@/components/Medir';
import { CONVITE_PLANOS, mensagemLimite, type Plano, type TipoUso } from '@/lib/limites';

/**
 * Cartão do limite do dia: na lista (buscas) e na página do edital (editais). Leva ao checkout do Pro e à tabela.
 * No Pro (uso justo) não há plano acima: só a mensagem.
 */
export function CartaoLimite({ tipo, plano = 'gratis' }: { tipo: TipoUso; plano?: Plano }) {
  if (plano === 'pro') {
    return (
      <section role="status" className="flex flex-col gap-3 rounded-lg border border-pin bg-pin-soft p-5 text-ink">
        <h2 className="text-[17px] font-bold leading-snug">{mensagemLimite(tipo, plano)}</h2>
      </section>
    );
  }
  return (
    <section role="status" className="flex flex-col gap-3 rounded-lg border border-pin bg-pin-soft p-5 text-ink">
      <Medir conversao="limite" chave="dia" />
      <h2 className="text-[17px] font-bold leading-snug">{mensagemLimite(tipo, plano)}</h2>
      <p className="text-[15px] text-ink-muted">{CONVITE_PLANOS}</p>
      <div className="flex flex-wrap gap-2">
        <Link href="/assinar" prefetch={false} className="inline-flex h-11 items-center rounded-sm bg-pin px-5 text-sm font-semibold text-on-pin">
          Assinar o Pro
        </Link>
        <Link
          href="/planos"
          prefetch={false}
          className="inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-5 text-sm font-semibold hover:bg-sunken"
        >
          Comparar planos
        </Link>
      </div>
    </section>
  );
}

/** Cartão dos recursos Pro (raio em km, órgão comprador, exportação) no lugar da lista, para o grátis. */
export function CartaoPro({ aoTirarFiltros }: { aoTirarFiltros?: () => void }) {
  return (
    <section role="status" className="flex flex-col gap-3 rounded-lg border border-pin bg-pin-soft p-5 text-ink">
      <h2 className="text-[17px] font-bold leading-snug">Raio em km e órgão comprador são do plano Pro.</h2>
      <p className="text-[15px] text-ink-muted">Assine o Pro para buscar ao redor de uma cidade ou só os editais de um órgão.</p>
      <div className="flex flex-wrap gap-2">
        <Link href="/assinar" prefetch={false} className="inline-flex h-11 items-center rounded-sm bg-pin px-5 text-sm font-semibold text-on-pin">
          Assinar o Pro
        </Link>
        {aoTirarFiltros ? (
          <button
            type="button"
            onClick={aoTirarFiltros}
            className="inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-5 text-sm font-semibold hover:bg-sunken"
          >
            Tirar raio e órgão
          </button>
        ) : null}
      </div>
    </section>
  );
}
