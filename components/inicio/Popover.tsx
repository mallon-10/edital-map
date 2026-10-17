'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Seta } from './Icones';
import { chip } from './estilos';

type Props = {
  /** Nome acessível do painel (`aria-label` do diálogo). */
  nome: string;
  rotulo: ReactNode;
  ativo: boolean;
  /** Chip de 44 px (folha de Filtros do celular). */
  grande?: boolean;
  /** Pode ser uma função que recebe `fechar`, para o painel se fechar ao escolher um item (o foco volta ao chip). */
  children: ReactNode | ((fechar: () => void) => ReactNode);
};

/** Chip que abre um painel. O painel é `fixed` para não ser cortado pela linha de chips que rola de lado no celular. */
export function Popover({ nome, rotulo, ativo, grande = false, children }: Props) {
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState({ top: 0, left: 0 });
  const botao = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const id = useId();

  // Ao abrir, o foco vai para o primeiro campo ou botão do painel.
  useEffect(() => {
    if (!aberto) return;
    painel.current?.querySelector<HTMLElement>('input, button, [href], [tabindex]:not([tabindex="-1"])')?.focus({ preventScroll: true });
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const largura = window.innerWidth;
    const clique = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (!painel.current?.contains(alvo) && !botao.current?.contains(alvo)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setAberto(false);
      botao.current?.focus();
    };
    // Painel `fixed` não acompanha a rolagem: fecha quando rola a página ou quem contém o botão (ele sai do lugar).
    // Rolagem da própria lista do painel ou de outra área (a lista de editais volta ao topo a cada busca) não fecha.
    const rolar = (e: Event) => {
      if (e.target === document || (e.target instanceof Node && e.target.contains(botao.current))) setAberto(false);
    };
    // Só a mudança de largura fecha; o teclado do celular ao focar a busca altera só a altura.
    const redimensionar = () => {
      if (window.innerWidth !== largura) setAberto(false);
    };
    document.addEventListener('mousedown', clique);
    document.addEventListener('keydown', tecla);
    window.addEventListener('scroll', rolar, { capture: true, passive: true });
    window.addEventListener('resize', redimensionar);
    return () => {
      document.removeEventListener('mousedown', clique);
      document.removeEventListener('keydown', tecla);
      window.removeEventListener('scroll', rolar, { capture: true });
      window.removeEventListener('resize', redimensionar);
    };
  }, [aberto]);

  function alternar() {
    const r = botao.current?.getBoundingClientRect();
    if (r) setPosicao({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - 272)) });
    setAberto((a) => !a);
  }

  function fechar() {
    setAberto(false);
    botao.current?.focus();
  }

  return (
    <>
      <button ref={botao} type="button" aria-expanded={aberto} aria-controls={id} onClick={alternar} className={chip(ativo, grande)}>
        {rotulo}
        <Seta className="size-3.5" />
      </button>
      {aberto ? (
        <div
          ref={painel}
          id={id}
          role="dialog"
          aria-label={nome}
          style={{ position: 'fixed', top: posicao.top, left: posicao.left }}
          className="z-40 w-64 rounded-md border border-line bg-raised p-3 shadow-[0_8px_24px_rgba(12,35,64,.14)]"
        >
          {typeof children === 'function' ? children(fechar) : children}
        </div>
      ) : null}
    </>
  );
}
