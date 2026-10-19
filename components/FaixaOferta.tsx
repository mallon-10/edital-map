import Link from 'next/link';
import { OFERTA } from '@/lib/planos';
import { IconeSino, SetaDireita } from './inicio/Icones';

/**
 * Faixa logo abaixo do cabeçalho com a oferta do Pro (receber as licitações certas por e-mail), para quem não é Pro.
 * Computador: sino, texto e o botão "Criar meu radar grátis" à direita. Celular: a linha inteira é o toque (44 px),
 * com o texto quebrando em até duas linhas. Sem fechar: é curta e não ocupa a barra de baixo.
 * Quem decide se aparece é o Cabecalho (mostrarOferta, lib/planos.ts).
 */
export function FaixaOferta() {
  return (
    <aside aria-label="Alertas por e-mail" className="shrink-0 border-b border-pin/30 bg-pin-soft text-pin-strong">
      {/* Computador */}
      <div className="hidden h-11 items-center gap-3 px-6 text-sm lg:flex">
        <IconeSino className="size-4 shrink-0" />
        <p className="font-semibold">{OFERTA.texto}</p>
        <Link
          href={OFERTA.href}
          prefetch={false}
          className="ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm bg-pin px-3 text-[13px] font-semibold text-on-pin"
        >
          {OFERTA.cta} <SetaDireita className="size-4" />
        </Link>
      </div>

      {/* Celular: a linha inteira leva ao começo do radar. */}
      <Link
        href={OFERTA.href}
        prefetch={false}
        className="flex min-h-11 items-center gap-2.5 py-1.5 pl-[calc(12px+env(safe-area-inset-left))] pr-[calc(4px+env(safe-area-inset-right))] text-[13px] leading-snug lg:hidden"
      >
        <IconeSino className="size-4 shrink-0" />
        <span className="min-w-0 flex-1">
          {OFERTA.texto}. <span className="whitespace-nowrap font-bold underline underline-offset-2">{OFERTA.cta}</span>
        </span>
        <span aria-hidden="true" className="inline-flex size-11 shrink-0 items-center justify-center">
          <SetaDireita className="size-5" />
        </span>
      </Link>
    </aside>
  );
}
