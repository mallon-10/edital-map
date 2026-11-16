'use client';

import { useId, useState } from 'react';
import { IconeCheck } from '@/components/inicio/Icones';
import { conferirCupom, type Cupom } from '@/lib/pagamento/cupons';
import type { Periodo } from '@/lib/planos';
import { Campo } from './Campo';

type Props = {
  periodo: Periodo;
  cupom: Cupom | null;
  aoAplicar: (c: Cupom | null) => void;
  /** Veio pelo link (?cupom=): abre já aplicado. */
  travado?: boolean;
};

/**
 * "Tenho um cupom": fechado por padrão (não distrai quem não tem). Só aceita cupom de lib/pagamento/cupons; aplicado,
 * vira uma linha verde com "Remover". Cupom de outro período fica guardado, mas avisa que não vale para este.
 */
export function CampoCupom({ periodo, cupom, aoAplicar, travado = false }: Props) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | undefined>();
  const idAviso = useId();

  if (cupom) {
    const vale = cupom.periodos.includes(periodo);
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3 rounded-[14px] bg-mata-soft px-3.5 py-3 text-[14px]">
          <span className="flex min-w-0 items-center gap-2 font-semibold text-mata">
            <IconeCheck className="size-[18px] shrink-0" />
            <span className="min-w-0">
              Cupom {cupom.codigo} aplicado{vale ? `: ${cupom.percentual}% no 1º mês` : ''}
            </span>
          </span>
          {travado ? null : (
            <button type="button" onClick={() => aoAplicar(null)} className="shrink-0 font-semibold text-ink-muted underline-offset-2 hover:text-ink hover:underline">
              Remover
            </button>
          )}
        </div>
        {vale ? null : (
          <p id={idAviso} className="text-[13.5px] font-semibold text-pin-strong">
            Este cupom vale só no plano mensal. No anual, o preço fica o de sempre.
          </p>
        )}
      </div>
    );
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="self-start text-[14px] font-semibold text-ink-muted underline underline-offset-2 hover:text-ink"
      >
        Tenho um cupom de desconto
      </button>
    );
  }

  function aplicar() {
    const r = conferirCupom(texto, periodo);
    if (!r.ok) return setErro(r.erro);
    setErro(undefined);
    aoAplicar(r.cupom);
  }

  return (
    <div className="flex items-start gap-2">
      <Campo
        rotulo="Cupom de desconto"
        className="flex-1"
        autoComplete="off"
        autoCapitalize="characters"
        placeholder="Ex.: ALUNO50"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value.toUpperCase());
          setErro(undefined);
        }}
        onKeyDown={(e) => {
          // Enter aplica o cupom em vez de enviar o pagamento.
          if (e.key === 'Enter') {
            e.preventDefault();
            aplicar();
          }
        }}
        erro={erro}
        autoFocus
      />
      <button
        type="button"
        onClick={aplicar}
        className="mt-[27px] h-[50px] shrink-0 rounded-md bg-ink px-4 text-[15px] font-semibold text-surface hover:bg-ink/90"
      >
        Aplicar
      </button>
    </div>
  );
}
