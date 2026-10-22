import Link from 'next/link';
import { IconeCalendario, IconeCheck, IconeEmail, IconeEscudo, IconeRaio, Seta } from '@/components/inicio/Icones';
import { MONO } from '@/components/planos/estilos';
import type { TextosCheckout } from '@/lib/checkout';
import { economiaAnual, ITENS_PRO, precoNaPagina } from '@/lib/paginaPlanos';
import { PERIODOS, PLANOS, type Periodo } from '@/lib/planos';

const PRO = PLANOS.find((p) => p.id === 'pro')!;
const ECONOMIA = economiaAnual(PRO);
const ROTULO: Record<Periodo, string> = { mensal: 'Mensal', anual: 'Anual' };

function Itens({ className }: { className: string }) {
  return (
    <ul className={`m-0 list-none flex-col gap-2.5 p-0 text-[14.5px] lg:text-[15px] ${className}`}>
      {ITENS_PRO.map((i) => (
        <li key={i} className="grid grid-cols-[20px_1fr] items-start gap-2.5">
          <IconeCheck className="mt-0.5 size-[18px] text-pin-strong lg:size-5" />
          <span>{i}</span>
        </li>
      ))}
    </ul>
  );
}

/** Pagamento seguro, cancelamento e quando o Pro liga; "Já assinou?" só antes do Pix. No computador fica no resumo; no celular, embaixo do formulário. */
export function Garantias({ className = '', comEntrar = true }: { className?: string; comEntrar?: boolean }) {
  return (
    <div className={`flex-col gap-3.5 ${className}`}>
      <ul className="m-0 flex list-none flex-col gap-3 rounded-[18px] bg-surface p-4 text-[14px]">
        <li className="grid grid-cols-[20px_1fr] items-start gap-2.5">
          <IconeEscudo className="size-5 text-mata" />
          <span>Pagamento seguro, processado pela Cakto</span>
        </li>
        <li className="grid grid-cols-[20px_1fr] items-start gap-2.5">
          <IconeCalendario className="size-5 text-mata" />
          <span>Cancele quando quiser: o Pro vale até o fim do período pago</span>
        </li>
        <li className="grid grid-cols-[20px_1fr] items-start gap-2.5">
          <IconeRaio className="size-5 text-mata" />
          <span>O Pro liga assim que o pagamento é confirmado</span>
        </li>
      </ul>
      {comEntrar ? (
        <p className="text-center text-[13.5px] text-ink-muted">
          Já assinou?{' '}
          <Link href="/entrar?voltar=/assinatura" prefetch={false} className="font-semibold text-pin-strong hover:underline">
            Entre com o e-mail da compra
          </Link>
        </p>
      ) : null}
    </div>
  );
}

type Props = {
  periodo: Periodo;
  aoEscolher: (p: Periodo) => void;
  textos: TextosCheckout;
  /** Na tela do Pix a cobrança já foi criada: o período não troca mais. */
  travado: boolean;
  className?: string;
};

/**
 * Resumo do pedido, com o contorno azul-marinho do cartão Pro do /planos. Computador: coluna da direita, preso na tela,
 * com preço grande, itens e garantias. Celular: compacto, antes do formulário, com "O que vem no Pro" num details.
 */
export function ResumoPedido({ periodo, aoEscolher, textos, travado, className = '' }: Props) {
  const equivale = periodo === 'anual' ? precoNaPagina(PRO, 'anual').equivale : null;
  return (
    <aside
      aria-labelledby="titulo-resumo"
      className={`flex flex-col gap-4 rounded-[22px] bg-raised p-[18px] shadow-[inset_0_0_0_2px_#0c2340,0_12px_30px_rgba(12,35,64,.08)] lg:gap-5 lg:rounded-[26px] lg:p-7 lg:shadow-[inset_0_0_0_2px_#0c2340,0_18px_44px_rgba(12,35,64,.10)] ${className}`}
    >
      <h2 id="titulo-resumo" className={`${MONO} sr-only lg:not-sr-only`}>
        Resumo do pedido
      </h2>
      <div className="flex items-center gap-3 lg:gap-3.5">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-pin-soft text-pin-strong lg:size-12 lg:rounded-[15px]">
          <IconeEmail className="size-5 lg:size-[22px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-bold leading-tight lg:text-[20px] lg:tracking-[-0.01em]">Edital Map Pro</p>
          <p className="hidden text-[14px] text-ink-muted lg:block">
            {travado ? `Plano ${periodo} · Pix Automático` : 'Licitações certas no seu e-mail'}
          </p>
        </div>
        <p className="shrink-0 text-right lg:hidden">
          <span className="text-[20px] font-bold tracking-[-0.01em] tabular-nums">{textos.valor}</span>
          <span className="text-[14px] text-ink-muted">{textos.sufixo}</span>
        </p>
      </div>

      {travado ? null : (
        <fieldset className="grid min-w-0 grid-cols-2 gap-1 rounded-full bg-surface p-1">
          <legend className="sr-only">Período de cobrança</legend>
          {PERIODOS.map((p) => (
            <label
              key={p}
              className={`flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full text-[15px] font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-rio ${
                periodo === p ? 'bg-raised shadow-[0_1px_2px_rgba(12,35,64,.12),0_2px_8px_rgba(12,35,64,.08)]' : 'hover:bg-sunken'
              }`}
            >
              <input type="radio" name="periodo" value={p} checked={periodo === p} onChange={() => aoEscolher(p)} className="sr-only" />
              {ROTULO[p]}
              {p === 'anual' ? <span className="rounded-full bg-mata-soft px-[7px] py-px text-[12px] font-bold text-mata">−{ECONOMIA}%</span> : null}
            </label>
          ))}
        </fieldset>
      )}

      <div aria-live="polite" className="flex flex-col gap-2">
        <p className="hidden items-baseline gap-1.5 lg:flex">
          <span className="text-[40px] font-bold leading-none tracking-[-0.03em] tabular-nums">{textos.valor}</span>
          <span className="text-[16px] font-medium text-ink-muted">{textos.sufixo}</span>
        </p>
        {equivale ? <p className="text-[14px] font-semibold text-mata lg:text-[15px]">{equivale}</p> : null}
      </div>

      <Itens className="hidden border-t border-line pt-[18px] lg:flex" />
      <details className="group border-t border-line pt-3 lg:hidden">
        <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
          O que vem no Pro
          <Seta className="size-[18px] transition-transform group-open:rotate-180" />
        </summary>
        <Itens className="mt-2.5 flex" />
      </details>

      <div className="flex flex-col gap-1 border-t border-line pt-3 lg:pt-[18px]">
        <p className="flex items-baseline justify-between gap-3">
          <span className="text-[15px] font-bold lg:text-[16px]">Total hoje</span>
          <span className="text-[19px] font-bold tracking-[-0.01em] tabular-nums lg:text-[22px]">{textos.valor}</span>
        </p>
        <p className="text-[13.5px] text-ink-muted lg:text-[14px]">{textos.depois}</p>
      </div>

      <Garantias className="hidden lg:flex" comEntrar={!travado} />
    </aside>
  );
}
