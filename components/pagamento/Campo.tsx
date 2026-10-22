import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { IconeAlerta } from '@/components/inicio/Icones';
import { ENTRADA, ENTRADA_ERRO, ENTRADA_OK } from './estilos';

type Props = { rotulo: ReactNode; erro?: string; dica?: string; className?: string; depois?: ReactNode } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className'
>;

/** Rótulo, campo e, embaixo, o erro (laranja escuro, com ícone) ou a dica. `depois`: algo dentro do campo, à direita. */
export function Campo({ rotulo, erro, dica, className = '', depois, ...campo }: Props) {
  const id = useId();
  const ajuda = erro || dica ? `${id}-ajuda` : undefined;
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[14px] font-semibold">
        {rotulo}
      </label>
      <span className="relative block">
        <input
          id={id}
          aria-invalid={erro ? true : undefined}
          aria-describedby={ajuda}
          className={`${ENTRADA} ${erro ? ENTRADA_ERRO : ENTRADA_OK} ${depois ? 'pr-12' : 'pr-3.5'}`}
          {...campo}
        />
        {depois ? <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted">{depois}</span> : null}
      </span>
      {erro ? (
        <p id={ajuda} className="flex items-center gap-1.5 text-[13.5px] font-semibold text-pin-strong">
          <IconeAlerta className="size-4 shrink-0" />
          {erro}
        </p>
      ) : dica ? (
        <p id={ajuda} className="text-[13px] text-ink-muted">
          {dica}
        </p>
      ) : null}
    </div>
  );
}
