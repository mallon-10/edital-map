import type { ReactNode } from 'react';
import { IconeCartao, IconeQr } from '@/components/inicio/Icones';
import type { Metodo } from '@/lib/checkout';

const OPCOES: ReadonlyArray<{ id: Metodo; titulo: string; texto: string; icone: ReactNode }> = [
  { id: 'pix', titulo: 'Pix Automático', texto: 'Autorize uma vez no app do banco. Sem cartão.', icone: <IconeQr className="size-[22px] text-pin-strong" /> },
  { id: 'cartao', titulo: 'Cartão de crédito', texto: 'A renovação cai sozinha no cartão.', icone: <IconeCartao className="size-[22px] text-pin-strong" /> },
];

const PASSOS_PIX = [
  { titulo: 'Gere o QR Code', texto: 'No botão abaixo, depois dos seus dados.' },
  { titulo: 'Autorize no banco', texto: 'Leia o QR Code ou cole o código no app.' },
  { titulo: 'Pronto', texto: 'O Pro liga na hora e as renovações caem sozinhas.' },
];

/** Pix Automático ou cartão: dois cartões de rádio nativo (setas trocam), o marcado com contorno azul-marinho de 2 px. */
export function FormaPagamento({ metodo, aoEscolher, idTitulo }: { metodo: Metodo; aoEscolher: (m: Metodo) => void; idTitulo: string }) {
  return (
    <fieldset aria-labelledby={idTitulo} className="grid min-w-0 grid-cols-2 gap-2.5 lg:gap-3">
      {OPCOES.map((o) => {
        const marcado = metodo === o.id;
        return (
          <label
            key={o.id}
            className={`flex cursor-pointer flex-col gap-2 rounded-2xl bg-raised p-3.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-rio sm:flex-row sm:items-start sm:gap-3 lg:rounded-[18px] lg:p-[18px] ${
              marcado ? 'shadow-[inset_0_0_0_2px_#0c2340]' : 'shadow-[inset_0_0_0_1px_#847c6a] hover:bg-surface'
            }`}
          >
            <input type="radio" name="metodo" value={o.id} checked={marcado} onChange={() => aoEscolher(o.id)} className="sr-only" />
            <span className="flex items-center justify-between sm:mt-0.5">
              <span aria-hidden="true" className={`flex size-5 items-center justify-center rounded-full border-2 ${marcado ? 'border-ink' : 'border-line-strong'}`}>
                {marcado ? <span className="size-2.5 rounded-full bg-ink" /> : null}
              </span>
              <span className="sm:hidden">{o.icone}</span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-bold leading-tight lg:text-[16px]">{o.titulo}</span>
                <span className="hidden sm:inline">{o.icone}</span>
              </span>
              <span className="text-[13px] leading-snug text-ink-muted lg:text-[14px]">{o.texto}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

/** O que acontece no Pix, antes de gerar o QR Code. */
export function PassosPix() {
  return (
    <ol className="m-0 grid list-none gap-3.5 rounded-[18px] bg-surface p-4 sm:grid-cols-3 sm:gap-[18px] sm:p-5">
      {PASSOS_PIX.map((p, i) => (
        <li key={p.titulo} className="flex flex-col gap-0.5">
          <span className="font-mono text-[12px] font-medium tracking-[0.08em] text-pin-strong">PASSO {i + 1}</span>
          <span className="text-[15px] font-bold">{p.titulo}</span>
          <span className="text-[14px] text-ink-muted">{p.texto}</span>
        </li>
      ))}
    </ol>
  );
}
